import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { RemoveScroll } from 'react-remove-scroll';
import { HexColorPicker } from 'react-colorful';
import { useCubeColors, useHintFaceletsElevation, useStickerScale, useCameraFov } from '../../composables/useSettings';
import { ALL_PIECE_NAMES, allHighlightSet } from './UnfoldedCube';
import LineConfigItem, { type LineEntry, MIN_LINE_PCT } from './LineConfigItem';
import type { LineIconDatum } from './IconStack';
import type { SvgShape } from '@/composables/recon/stepIconDescriptors';
import { getAutoHighlight } from '@/composables/recon/autoHighlight';
import { createGifEncoderPool, type GifEncoderPool } from '@/composables/recon/gifEncoderPool';
import { cameraView, INITIAL_ANGLES, smootherStep, timelineMoveMs, turnRotation } from '@/composables/recon/reconCube';
import { SimpleCube } from '@/composables/recon/SimpleCube';
import type { GifSettings } from '@/utils/gifEncoding';
import { listFlatSceneColors, type Rgb, type SceneColors, type TranslucentLayer } from '@/utils/gifPalette';
import { cubiesAtTime, cubieWorld, createOrbit, type Angles, type Orbit } from '@/utils/cubeSceneRuntime.client';
import {
  COLOR_ORDER,
  cubeLooks,
  SCENE_PX,
  sceneDrawables,
  sceneGeometry,
  type CubeLooks,
  type Look,
  type SceneView,
} from '@/utils/cubeSvgRender';
import { drawSceneToCanvas } from '@/utils/cubeCanvasRender';
import { faceletsFromState, type RotationInfo } from '@/utils/cubeMoves';
import { buildColorHex, DEFAULT_SCENE_LOOK } from '@/utils/cubeSceneAuthoring';

const CHECKERBOARD_STYLE = {
  backgroundColor: '#d4d4d4',
  backgroundImage: 'repeating-conic-gradient(#f5f5f5 0% 25%, transparent 25% 50%)',
  backgroundPosition: '0 0',
  backgroundSize: '16px 16px',
} as const;

const TRANSPARENT_BACKGROUND = 'transparent';

const BACKGROUND_PRESETS = [
  { label: 'Purplish', value: '#433149' },
  { label: 'Black', value: '#000000' },
  { label: 'Grey', value: '#737373' },
  { label: 'Transparent', value: TRANSPARENT_BACKGROUND },
];

const DEFAULT_BACKGROUND = BACKGROUND_PRESETS.find((preset) => (preset.label === 'Purplish'))!.value

const FRAME_DELAY_MS = 40; // must be multiple of 10
const FPS = 1000 / FRAME_DELAY_MS; // 25 fps
const END_HOLD_MS = 500;
const MIN_TOTAL_DURATION = 0.5;
const MAX_TOTAL_DURATION = 60;

// turns per second per step type; duration = moveCount / tps
const STEP_TYPE_TPS: Record<string, number> = {
  'cross': 2,
  'f2l': 3,
  'last layer': 5,
  'solved': 4,
  'block': 3,
  'genericBlock': 3,
  'lse': 4,
  'cmll': 5,
  'eoLine': 1.5,
  'apbBlock': 3,
  'genericEO': 4,
  'none': 4,
};

const ORBIT_DAMPING = 0.15;
const DEFAULT_PREVIEW_PX = 360;

const PALETTE_SAMPLE_FRAMES = 16;
const PALETTE_PROGRESS_SHARE = 8;

const FACE_LABEL_COLORS: Rgb[] = [[0xec, 0xe6, 0xef], [0x16, 0x10, 0x18]];

function lookLayers(look: Look): TranslucentLayer[] {
  return [look.frame, look.fill].map(color => ({
    color: [color.r, color.g, color.b],
    opacity: color.a * look.opacity,
  }));
}

type SceneColorOptions = {
  background: Rgb;
  hasDimmedPieces: boolean;
  showFacelets: boolean;
  showFaceLabels: boolean;
};

function collectSceneColors(looks: CubeLooks, options: SceneColorOptions): SceneColors {
  const isCubeColor = (_: unknown, colorIdx: number) => COLOR_ORDER[colorIdx] !== 'X';
  const shownPairs = options.showFacelets
    ? [...looks.face.filter(isCubeColor), ...looks.hint.filter(isCubeColor)]
    : looks.face.filter(isCubeColor);
  const layers = shownPairs
    .flatMap(pair => (options.hasDimmedPieces ? [pair.bright, pair.dim] : [pair.bright]))
    .flatMap(lookLayers);
  return {
    background: options.background,
    opaque: [
      ...layers.filter(layer => layer.opacity >= 1).map(layer => layer.color),
      ...(options.showFaceLabels ? FACE_LABEL_COLORS : []),
    ],
    translucent: layers.filter(layer => layer.opacity < 1),
  };
}

type CaptureFrame = (tSec: number) => Promise<Uint8ClampedArray>;
type CubeCamera = { angles: Angles; view: SceneView };

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;
const FALLBACK_CAPTURE_BACKGROUND: Rgb = [0x16, 0x10, 0x18];

function captureBackground(backgroundColor: string, transparent: boolean): Rgb {
  if (transparent) return [0, 0, 0];
  if (!HEX_COLOR_PATTERN.test(backgroundColor)) return FALLBACK_CAPTURE_BACKGROUND;
  const color = parseInt(backgroundColor.slice(1), 16);
  return [(color >> 16) & 0xff, (color >> 8) & 0xff, color & 0xff];
}

const BROWSER_YIELD_INTERVAL_MS = 100;

function yieldToEventLoop(): Promise<void> {
  return new Promise(resolve => {
    const channel = new MessageChannel();
    channel.port1.onmessage = () => {
      channel.port1.close();
      resolve();
    };
    channel.port2.postMessage(null);
  });
}

function createPeriodicBrowserYield(): () => Promise<void> {
  let lastYield = performance.now();
  return async () => {
    if (performance.now() - lastYield < BROWSER_YIELD_INTERVAL_MS) return;
    await yieldToEventLoop();
    lastYield = performance.now();
  };
}

async function captureSampleFrames(
  captureFrame: CaptureFrame,
  totalFrames: number,
  onProgress: (percent: number) => void,
): Promise<Map<number, Uint8ClampedArray>> {
  const sampleCount = Math.min(PALETTE_SAMPLE_FRAMES, totalFrames);
  const samplesByFrameIdx = new Map<number, Uint8ClampedArray>();
  for (let i = 0; i < sampleCount; i++) {
    const frameIdx = sampleCount === 1 ? 0 : Math.round((i / (sampleCount - 1)) * (totalFrames - 1));
    samplesByFrameIdx.set(frameIdx, await captureFrame(frameIdx / FPS));
    onProgress(Math.round(((i + 1) / sampleCount) * PALETTE_PROGRESS_SHARE));
  }
  return samplesByFrameIdx;
}

async function encodeFrames(
  pool: GifEncoderPool,
  pendingSettings: Promise<GifSettings>,
  captureFrame: CaptureFrame,
  totalFrames: number,
  totalDuration: number,
  samplesByFrameIdx: Map<number, Uint8ClampedArray>,
  onProgress: (percent: number) => void,
): Promise<Uint8Array<ArrayBuffer>> {
  const capturedFrameCount = totalFrames + 1;
  const encoder = pool.encodeFrames(pendingSettings, encodedFrameCount => onProgress(
    PALETTE_PROGRESS_SHARE +
    Math.round((encodedFrameCount / capturedFrameCount) * (100 - PALETTE_PROGRESS_SHARE))
  ));

  for (let i = 0; i < totalFrames; i++) {
    await encoder.addFrame(samplesByFrameIdx.get(i) ?? await captureFrame(i / FPS));
  }

  // the loop's last time step can fall just before the end. Capturing the exact end makes
  // the last frame show the final state.
  await encoder.addFrame(await captureFrame(totalDuration));

  // END_HOLD_MS holds the final frame; outside of duration/UI calculations
  return encoder.finish(FRAME_DELAY_MS, END_HOLD_MS);
}

function buildGifFilename(scramble: string, now: Date): string {
  const sanitizedScramble = scramble
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[']/g, 'pr')
    .replace(/[^A-Za-z0-9_]/g, '');
  const scrambleSuffix = sanitizedScramble ? `-${sanitizedScramble}` : '';

  const pad = (n: number) => String(n).padStart(2, '0');
  const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;

  return `ao1k-solve${scrambleSuffix}-${timestamp}.gif`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export interface GifSolveLine {
  moves: string[];
  isWhitespace: boolean;
}

interface CubeGifDialogProps {
  onClose: () => void;
  scramble: string;
  solutionLines: GifSolveLine[];
  lineIconData: LineIconDatum[];
  splits: string[];
  committedSplits: string[];
  onSplitsChange: (splits: string[]) => void;
  onSplitsCommit: (splits: string[]) => void;
}

const renderShape = (shape: SvgShape, i: number) => {
  if (shape.type === 'rect') return <rect key={i} x={shape.x} y={shape.y} width={shape.width} height={shape.height} fill={shape.fill} />;
  if (shape.type === 'polygon') return <polygon key={i} points={shape.points} fill={shape.fill} />;
  return <circle key={i} cx={shape.cx} cy={shape.cy} r={shape.r} fill={shape.fill} />;
};

export default function CubeGifDialog({
  onClose,
  scramble,
  solutionLines,
  lineIconData,
  splits,
  committedSplits,
  onSplitsChange,
  onSplitsCommit,
}: CubeGifDialogProps) {
  const [cubeColors] = useCubeColors();
  const [elevation] = useHintFaceletsElevation();
  const [stickerScale] = useStickerScale();
  const [cameraFov] = useCameraFov();
  const previewDivRef = useRef<HTMLDivElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const orbitRef = useRef<Orbit | null>(null);
  const previewStartRef = useRef<number>(0);
  const isCapturingRef = useRef(false);
  const zoomFactorRef = useRef(1);

  const [backgroundColor, setBackgroundColor] = useState(DEFAULT_BACKGROUND);
  const [backgroundInput, setBackgroundInput] = useState(DEFAULT_BACKGROUND);
  const transparentBackground = backgroundColor === TRANSPARENT_BACKGROUND;
  const [includeFacelets, setIncludeFacelets] = useState(true);
  const [includeFaceLabels, setIncludeFaceLabels] = useState(true);
  const [resolution, setResolution] = useState(360);
  const [isGenerating, setIsGenerating] = useState(false);
  const progressLabelRef = useRef<HTMLSpanElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [lockedLines, setLockedLines] = useState<Record<number, boolean>>({});

  // build line entries (non-whitespace, has moves)
  const lineEntries = useMemo<LineEntry[]>(() => {
    const entries: LineEntry[] = [];
    let splitCounter = 0;
    for (let i = 0; i < solutionLines.length; i++) {
      const line = solutionLines[i];
      if (line.isWhitespace) continue;
      const isContentful = line.moves.length > 0;
      if (!isContentful) {
        splitCounter++;
        continue;
      }
      const moveDurations = line.moves.map(timelineMoveMs);
      entries.push({
        index: i,
        moves: line.moves,
        moveDurations,
        totalCubeDuration: moveDurations.reduce((a, b) => a + b, 0),
        splitIdx: splitCounter,
      });
      splitCounter++;
    }
    return entries;
  }, [solutionLines]);

  const timeline = useMemo(() => {
    const scrambleMoves = scramble.split(' ').filter(move => move !== '');
    const groups: RotationInfo[][] = lineEntries.flatMap(entry => entry.moves.map(move => {
      const turn = turnRotation(move);
      return turn ? [turn] : [];
    }));
    return {
      facelets: faceletsFromState(new SimpleCube().getCubeState(scrambleMoves)),
      groups,
      durations: lineEntries.flatMap(entry => entry.moveDurations),
    };
  }, [scramble, lineEntries]);

  const looks = useMemo(
    () => cubeLooks(
      buildColorHex(cubeColors),
      DEFAULT_SCENE_LOOK.shade,
      DEFAULT_SCENE_LOOK.dim,
      new Map(),
      transparentBackground ? 1 : undefined,
    ),
    [cubeColors, transparentBackground],
  );

  // piece highlighting — each line carries the set of currently-selected pieces.
  // "None" mode means every piece is selected (no filtering); "Auto" derives from solve steps.
  const [highlightBase, setHighlightBase] = useState<'none' | 'auto'>('none');
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [lineHighlights, setLineHighlights] = useState<Array<Set<string>>>(
    () => lineEntries.map(() => allHighlightSet()),
  );

  const parseSplitValues = (entries: LineEntry[]) => {
    return entries.map(entry => {
      const v = parseFloat(committedSplits[entry.splitIdx] ?? '');
      return Number.isFinite(v) && v > 0 ? v : 0;
    });
  };

  // percentages keyed by playable line idx (0..N-1 across non-whitespace meaningful lines)
  const calcPercentages = () => {
    const splitValues = parseSplitValues(lineEntries);
    const allHaveSplits = lineEntries.length > 0 && splitValues.every(v => v > 0);
    if (lineEntries.length === 0) {
      return [];

    } else if (allHaveSplits) {
      const total = splitValues.reduce((a, b) => a + b, 0);
      return splitValues.map(v => (v / total) * 100);

    } else {
      const weights = lineEntries.map(entry => {
        const type = lineIconData[entry.index]?.compiledStepInfo?.type;
        const moveCount = entry.moves.length;
        const tps = (type && STEP_TYPE_TPS[type]) ?? 3;
        return moveCount / tps;
      });
      const total = weights.reduce((a, b) => a + b, 0);
      return weights.map(w => (w / total) * 100);
    }
  };
  const [percentages, setPercentages] = useState<number[]>(calcPercentages());

  // delay controls
  const DELAY = 20;
  const [delayPct, setDelayPct] = useState(DELAY);
  const [delayPctInput, setDelayPctInput] = useState(DELAY.toString());
  const [individualDelays, setIndividualDelays] = useState(false);
  const [lineDelays, setLineDelays] = useState<number[]>([]);


  // memoize icon elements — only rebuilt when the solution or icon data changes, not on slider drags
  const lineIcons = useMemo(() =>
    lineEntries.map(entry => {
      const datum = lineIconData[entry.index];
      const desc = datum?.descriptor;
      if (!desc || datum.isEmptyIcon) return null;
      return (
        <svg
          key={entry.index}
          viewBox={desc.viewBox}
          className="flex-none w-7.5 h-7.5 border"
          style={desc.eoBorderColor
            ? { borderColor: desc.eoBorderColor, borderWidth: '2px' }
            : { borderColor: '#52525b', borderWidth: '1px' }}
          stroke="#52525b"
          strokeWidth="1"
          fill="none"
        >
          {desc.shapes.map(renderShape)}
        </svg>
      );
    }),
    [lineEntries, lineIconData]
  );

  // total duration: lazy initializer so committedSplits changes don't overwrite user edits later.
  const [totalDuration, setTotalDuration] = useState(() => {
    const splitValues = parseSplitValues(lineEntries);
    const allHaveSplits = lineEntries.length > 0 && splitValues.every(v => v > 0);
    const sum = allHaveSplits ? splitValues.reduce((a, b) => a + b, 0) : 0;
    if (sum > 0) return sum;
    // derive from TPS so that percentage * totalDuration = moveCount / tps exactly
    const tpsSum = lineEntries.reduce((acc, entry) => {
      const type = lineIconData[entry.index]?.compiledStepInfo?.type;
      const tps = (type && STEP_TYPE_TPS[type]) ?? 3;
      return acc + entry.moves.length / tps;
    }, 0);
    return tpsSum > 0 ? tpsSum : Math.max(10, lineEntries.length * 3);
  });
  const [totalDurationInput, setTotalDurationInput] = useState(() => totalDuration.toFixed(2));

  // adjust a single line's percentage; redistribute among unlocked lines proportionally
  const adjustPercentage = useCallback((entryIdx: number, newPct: number) => {
    const { percentages: pcts, lockedLines: locked } = latestStateRef.current;
    if (pcts.length === 0) return;
    const clamped = Math.max(MIN_LINE_PCT, Math.min(99, newPct));
    const oldPct = pcts[entryIdx] ?? 0;
    const delta = clamped - oldPct;

    // gather indices that are unlocked and not the one being changed
    const adjustableIdxs: number[] = [];
    for (let i = 0; i < pcts.length; i++) {
      if (i === entryIdx) continue;
      if (locked[i]) continue;
      adjustableIdxs.push(i);
    }
    // nothing to redistribute to; refuse change
    if (adjustableIdxs.length === 0) return;

    const adjustableTotal = adjustableIdxs.reduce((sum, i) => sum + (pcts[i] ?? 0), 0);
    const next = [...pcts];
    next[entryIdx] = clamped;

    if (adjustableTotal <= 0) {
      // distribute evenly
      const each = -delta / adjustableIdxs.length;
      adjustableIdxs.forEach(i => {
        next[i] = Math.max(MIN_LINE_PCT, (next[i] ?? 0) + each);
      });
    } else {
      // distribute proportionally to current values
      adjustableIdxs.forEach(i => {
        const current = next[i] ?? 0;
        const share = current / adjustableTotal;
        next[i] = Math.max(MIN_LINE_PCT, current - delta * share);
      });
    }

    // normalize so sum is 100
    const sum = next.reduce((a, b) => a + b, 0);
    if (sum > 0) {
      for (let i = 0; i < next.length; i++) next[i] = (next[i] / sum) * 100;
    }
    setPercentages(next);
  }, []);

  // set absolute split (in seconds); recompute percentages and total duration
  const setSplitSeconds = useCallback((entryIdx: number, seconds: number) => {
    const s = latestStateRef.current;
    if (s.percentages.length === 0) return;
    const clamped = Math.max(0.05, Math.min(MAX_TOTAL_DURATION, seconds));
    const currentSeconds = s.percentages.map(p => (p / 100) * s.totalDuration);
    currentSeconds[entryIdx] = clamped;
    const newTotal = currentSeconds.reduce((a, b) => a + b, 0);
    if (newTotal <= 0) return;
    setTotalDuration(newTotal);
    setTotalDurationInput(newTotal.toFixed(2));
    setPercentages(currentSeconds.map(sec => (sec / newTotal) * 100));

    // commit all line durations so re-opening the dialog can recover the full total
    const newSplits = [...s.splits];
    s.lineEntries.forEach((entry, i) => {
      while (newSplits.length <= entry.splitIdx) newSplits.push('');
      newSplits[entry.splitIdx] = currentSeconds[i].toFixed(3).replace(/\.?0+$/, '');
    });
    s.onSplitsChange(newSplits);
    s.onSplitsCommit(newSplits);
  }, []);

  const toggleLock = useCallback((entryIdx: number) => {
    setLockedLines(prev => ({ ...prev, [entryIdx]: !prev[entryIdx] }));
  }, []);

  const toggleLineHighlightPiece = useCallback((lineIdx: number, piece: string) => {
    setLineHighlights(prev => {
      const next = prev.map(s => new Set(s));
      const lineSet = next[lineIdx];
      if (!lineSet) return prev;
      if (lineSet.has(piece)) lineSet.delete(piece);
      else lineSet.add(piece);
      return next;
    });
  }, []);

  const setLineHighlightSet = useCallback((lineIdx: number, set: Set<string>) => {
    setLineHighlights(prev => {
      if (lineIdx < 0 || lineIdx >= prev.length) return prev;
      const next = prev.map(s => new Set(s));
      next[lineIdx] = new Set(set);
      return next;
    });
  }, []);

  const handleDelayPctChange = (value: string) => {
    setDelayPctInput(value);
    const parsed = parseFloat(value);
    if (Number.isFinite(parsed) && parsed >= 0) {
      setDelayPct(Math.min(99, Math.max(0, parsed)));
    }
  };

  const handleIndividualDelaysToggle = (enabled: boolean) => {
    if (enabled) {
      // seed per-line delays from the current computed values
      setLineDelays(effectiveDelays.slice());
    }
    setIndividualDelays(enabled);
  };

  const computeAutoHighlightsForAllLines = (): Array<Set<string>> =>
    lineEntries.map((_, idx) => {
      const relevantStepInfos = lineEntries
        .slice(0, idx + 1)
        .map(e => lineIconData[e.index]?.compiledStepInfo ?? null);
      return getAutoHighlight(relevantStepInfos);
    });

  const handleHighlightBaseChange = (mode: 'none' | 'auto') => {
    setHighlightBase(mode);
    setLineHighlights(
      mode === 'none'
        ? lineEntries.map(() => allHighlightSet())
        : computeAutoHighlightsForAllLines(),
    );
  };

  const handleCustomizeToggle = (enabled: boolean) => {
    setIsCustomizing(enabled);
  };

  const setLineDelay = useCallback((idx: number, seconds: number) => {
    const { percentages: pcts, totalDuration: tot } = latestStateRef.current;
    const lineTime = ((pcts[idx] ?? 0) / 100) * tot;
    const clamped = Math.max(0, Math.min(lineTime, seconds));
    setLineDelays(prev => {
      const next = [...prev];
      while (next.length <= idx) next.push(0);
      next[idx] = clamped;
      return next;
    });
  }, []);

  const handleTotalDurationChange = (value: string) => {
    setTotalDurationInput(value);
    const parsed = parseFloat(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      const clamped = Math.max(MIN_TOTAL_DURATION, Math.min(MAX_TOTAL_DURATION, parsed));
      setTotalDuration(clamped);
    }
  };

  const handleBackgroundInputChange = (value: string) => {
    if (!/^#[0-9A-Fa-f]{0,6}$/.test(value)) return;
    setBackgroundInput(value);
    if (HEX_COLOR_PATTERN.test(value)) {
      setBackgroundColor(value);
    }
  };

  const handlePresetClick = (value: string) => {
    setBackgroundColor(value);
    setBackgroundInput(value === TRANSPARENT_BACKGROUND ? '' : value);
  };

  // total cube duration (sum of move durations across all entries)
  const totalCubeDuration = useMemo(
    () => lineEntries.reduce((sum, e) => sum + e.totalCubeDuration, 0),
    [lineEntries]
  );

  // effective delay per line in seconds; when individual mode is off, computed from global delayPct
  const effectiveDelays = (() => {
    if (lineEntries.length === 0) return [];
    const N = lineEntries.length;
    if (individualDelays) {
      return lineEntries.map((_, i) => {
        const lineTime = ((percentages[i] ?? 0) / 100) * totalDuration;
        return Math.min(lineDelays[i] ?? 0, lineTime);
      });
    }
    return lineEntries.map((_, i) => {
      const lineTime = ((percentages[i] ?? 0) / 100) * totalDuration;
      const rawDelay = (delayPct / 100) * totalDuration / N;
      return Math.min(rawDelay, lineTime);
    });
  })();

  // single ref-bag holding the latest values the rAF, capture, and line-config callbacks need.
  // updated each render via useEffect so consumers always see fresh state
  // without needing to be torn down on every change.
  interface LatestRef {
    lineEntries: LineEntry[];
    percentages: number[];
    totalDuration: number;
    totalCubeDuration: number;
    effectiveDelays: number[];
    lineHighlights: Array<Set<string>>;
    lockedLines: Record<number, boolean>;
    timeline: typeof timeline;
    looks: CubeLooks;
    showFacelets: boolean;
    includeFaceLabels: boolean;
    elevation: number;
    stickerScale: number;
    cameraFov: number;
    splits: string[];
    onSplitsChange: (splits: string[]) => void;
    onSplitsCommit: (splits: string[]) => void;
  }
  const showFacelets = includeFacelets && elevation !== 0;
  const latestStateRef = useRef<LatestRef>({
    lineEntries,
    percentages,
    totalDuration,
    totalCubeDuration,
    effectiveDelays,
    lineHighlights,
    lockedLines,
    timeline,
    looks,
    showFacelets,
    includeFaceLabels,
    elevation,
    stickerScale,
    cameraFov,
    splits,
    onSplitsChange,
    onSplitsCommit,
  });
  useEffect(() => {
    // canonical "sync latest values into a ref" pattern; the lint rule for ref immutability
    // doesn't recognize that useRef.current is meant to be mutated.
    // eslint-disable-next-line react-hooks/immutability
    latestStateRef.current = {
      lineEntries,
      percentages,
      totalDuration,
      totalCubeDuration,
      effectiveDelays,
      lineHighlights,
      lockedLines,
      timeline,
      looks,
      showFacelets,
      includeFaceLabels,
      elevation,
      stickerScale,
      cameraFov,
      splits,
      onSplitsChange,
      onSplitsCommit,
    };
  });

  // map real time t (seconds in [0..totalDuration]) to cube timestamp (ms).
  // each line has a leading delay (frozen) period; moves play faster to fill the remainder.
  const realTimeToCubeTimestamp = (tSec: number): number => {
    const { lineEntries: entries, percentages: pcts, totalDuration: tot, totalCubeDuration: totCube, effectiveDelays: delays } = latestStateRef.current;
    if (entries.length === 0) return 0;
    if (tSec <= 0) return 0;
    if (tSec >= tot) return totCube;
    let cumulativeReal = 0;
    let cumulativeCube = 0;
    for (let i = 0; i < entries.length; i++) {
      const lineRealDuration = ((pcts[i] ?? 0) / 100) * tot;
      const lineCubeDuration = entries[i].totalCubeDuration;
      const lineDelay = Math.min(delays[i] ?? 0, lineRealDuration);
      const playDuration = lineRealDuration - lineDelay;
      if (tSec <= cumulativeReal + lineRealDuration) {
        const withinLine = tSec - cumulativeReal;
        if (withinLine <= lineDelay) return cumulativeCube;
        const playFrac = playDuration > 0 ? (withinLine - lineDelay) / playDuration : 1;
        return cumulativeCube + Math.min(1, playFrac) * lineCubeDuration;
      }
      cumulativeReal += lineRealDuration;
      cumulativeCube += lineCubeDuration;
    }
    return totCube;
  };

  // returns the 0-based index of the line being shown at real time tSec
  const realTimeToLineIndex = (tSec: number): number => {
    const { lineEntries: entries, percentages: pcts, totalDuration: tot } = latestStateRef.current;
    if (entries.length === 0) return -1;
    let cumulative = 0;
    for (let i = 0; i < entries.length; i++) {
      const lineRealDuration = ((pcts[i] ?? 0) / 100) * tot;
      if (tSec <= cumulative + lineRealDuration) return i;
      cumulative += lineRealDuration;
    }
    return entries.length - 1;
  };

  const currentCamera = (): CubeCamera => ({
    angles: orbitRef.current?.angles() ?? INITIAL_ANGLES,
    view: cameraView(
      previewDivRef.current?.clientHeight || DEFAULT_PREVIEW_PX,
      latestStateRef.current.elevation,
      1 / zoomFactorRef.current,
      latestStateRef.current.stickerScale,
      latestStateRef.current.cameraFov,
    ),
  });

  const drawFrame = (
    ctx: CanvasRenderingContext2D,
    sizePx: number,
    tSec: number,
    camera: CubeCamera,
    background: Rgb | null,
  ) => {
    const state = latestStateRef.current;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (background) {
      ctx.fillStyle = `rgb(${background.join(',')})`;
      ctx.fillRect(0, 0, sizePx, sizePx);
    } else {
      ctx.clearRect(0, 0, sizePx, sizePx);
    }
    const pxPerSceneUnit = sizePx / SCENE_PX;
    ctx.setTransform(pxPerSceneUnit, 0, 0, pxPerSceneUnit, 0, 0);

    const lineHighlight = state.lineHighlights[realTimeToLineIndex(tSec)];
    const highlighted = lineHighlight && lineHighlight.size < ALL_PIECE_NAMES.length ? lineHighlight : null;
    const geometry = sceneGeometry(camera.angles, camera.view);
    const { facelets, groups, durations } = state.timeline;
    const cubies = cubiesAtTime(facelets, groups, durations, realTimeToCubeTimestamp(tSec), smootherStep);
    drawSceneToCanvas(ctx, sceneDrawables({
      geometry,
      looks: state.looks,
      showFacelets: state.showFacelets,
      showFaceLabels: state.includeFaceLabels,
      cubies: cubies.map(cubie => ({
        stickers: cubie.stickers,
        world: cubieWorld(geometry, cubie),
        dim: highlighted && !highlighted.has(cubie.piece) ? 1 : 0,
      })),
    }));
  };

  // Escape closes the dialog
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  useEffect(() => {
    const div = previewDivRef.current;
    const canvas = previewCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!div || !canvas || !ctx) return;

    const orbit = createOrbit(div, INITIAL_ANGLES, ORBIT_DAMPING);
    orbitRef.current = orbit;
    previewStartRef.current = performance.now();
    let rafId = 0;

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      if (isCapturingRef.current) return;
      orbit.step();

      const sizePx = Math.round(div.clientWidth * (window.devicePixelRatio || 1)) || DEFAULT_PREVIEW_PX;
      if (canvas.width !== sizePx) {
        canvas.width = sizePx;
        canvas.height = sizePx;
      }
      const { totalDuration: tot } = latestStateRef.current;
      const elapsedSec = ((performance.now() - previewStartRef.current) / 1000) % (tot + 0.5);
      drawFrame(ctx, sizePx, Math.min(elapsedSec, tot), currentCamera(), null);
    };
    animate();

    return () => {
      cancelAnimationFrame(rafId);
      orbit.destroy();
      orbitRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showGenerationProgress = (percent: number) => {
    if (progressLabelRef.current) progressLabelRef.current.textContent = `Generating... ${percent}%`;
  };

  const handleDownload = async () => {
    if (isGenerating) return;
    const captureCanvas = document.createElement('canvas');
    captureCanvas.width = resolution;
    captureCanvas.height = resolution;
    const captureContext = captureCanvas.getContext('2d', { willReadFrequently: true });
    if (!captureContext) {
      setError('Failed to create GIF canvas.');
      return;
    }

    setError(null);
    setIsGenerating(true);
    isCapturingRef.current = true;

    const pool = createGifEncoderPool();

    try {
      const background = captureBackground(backgroundColor, transparentBackground);
      const camera = currentCamera();

      const yieldToBrowserPeriodically = createPeriodicBrowserYield();
      const captureFrame: CaptureFrame = async (tSec) => {
        await yieldToBrowserPeriodically();
        drawFrame(captureContext, resolution, tSec, camera, transparentBackground ? null : background);
        return captureContext.getImageData(0, 0, resolution, resolution).data;
      };

      const totalFrames = Math.max(1, Math.round(totalDuration * FPS)) + 1;

      const sceneColors = collectSceneColors(looks, {
        background,
        hasDimmedPieces: lineHighlights.some(set => set.size < ALL_PIECE_NAMES.length),
        showFacelets,
        showFaceLabels: includeFaceLabels,
      });
      const samplesByFrameIdx = await captureSampleFrames(captureFrame, totalFrames, showGenerationProgress);
      const sampleCopies = [...samplesByFrameIdx.values()].map(frame => frame.slice());
      const pendingSettings = pool.buildPalette(sampleCopies, listFlatSceneColors(sceneColors)).then(
        ({ palette, spareIndex }): GifSettings => ({
          width: resolution,
          height: resolution,
          palette,
          spareIndex,
          transparentBackground,
        }),
      );
      const gifBytes = await encodeFrames(
        pool,
        pendingSettings,
        captureFrame,
        totalFrames,
        totalDuration,
        samplesByFrameIdx,
        showGenerationProgress,
      );

      const blob = new Blob([gifBytes], { type: 'image/gif' });
      downloadBlob(blob, buildGifFilename(scramble, new Date()));
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'Failed to generate GIF.');
    } finally {
      pool.dispose();
      isCapturingRef.current = false;
      previewStartRef.current = performance.now();
      setIsGenerating(false);
    }
  };

  if (typeof document === 'undefined') return null;

  const lineListJSX = lineEntries.map((entry, idx) => (
    <LineConfigItem
      key={idx}
      entry={entry}
      idx={idx}
      pct={percentages[idx] ?? 0}
      totalDuration={totalDuration}
      locked={!!lockedLines[idx]}
      effectiveDelay={effectiveDelays[idx] ?? 0}
      individualDelays={individualDelays}
      isCustomizing={isCustomizing}
      lineHighlight={lineHighlights[idx]}
      cubeColors={cubeColors}
      icon={lineIcons[idx]}
      onAdjustPercentage={adjustPercentage}
      onSetSplitSeconds={setSplitSeconds}
      onToggleLock={toggleLock}
      onSetLineDelay={setLineDelay}
      onToggleHighlightPiece={toggleLineHighlightPiece}
      onSetLineHighlight={setLineHighlightSet}
    />
  ));

  return createPortal(
    <RemoveScroll>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-dark/75 p-3 sm:p-6"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Cube GIF preview"
          className="max-h-[80vh] w-full max-w-4xl overflow-auto rounded-sm border border-neutral-700 bg-dark text-primary-100 shadow-2xl"
        >
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-700 bg-primary-400 px-4 py-3 sm:px-6">
            <h2 className="text-lg font-semibold text-dark">Create Cube GIF</h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-neutral-600 px-3 py-2 text-sm text-primary-100 bg-primary-800 hover:bg-primary-700 transition-colors"
            >
              Close
            </button>
          </div>

          <div className="flex flex-wrap gap-4 p-4 sm:px-6">
            <section className="flex-1 min-w-72 space-y-4">
              <div className="rounded-sm border h-fit border-neutral-700 bg-primary-800 p-4">
                <div className="mb-3 text-sm font-semibold text-primary-100">Preview</div>
                <div
                  className="relative aspect-square w-full max-w-96 overflow-hidden border border-neutral-700"
                  style={CHECKERBOARD_STYLE}
                >
                  <div
                    className="absolute inset-0"
                    style={{ backgroundColor }}
                  />
                  <div
                    ref={previewDivRef}
                    className="absolute inset-0"
                    style={{ touchAction: 'none' }}
                  >
                    <canvas ref={previewCanvasRef} className="absolute inset-0 h-full w-full" />
                  </div>
                  <div className="absolute right-2 top-2 flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        zoomFactorRef.current = Math.min(2.2, zoomFactorRef.current * 1.1);
                      }}
                      className="flex h-7 w-7 items-center justify-center rounded-sm border border-neutral-600 bg-dark/70 text-base font-bold text-primary-100 transition-colors hover:border-primary-100"
                      aria-label="Zoom out"
                      title="Zoom out"
                    >
                      −
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        zoomFactorRef.current = Math.max(0.65, zoomFactorRef.current * 0.9);
                      }}
                      className="flex h-7 w-7 items-center justify-center rounded-sm border border-neutral-600 bg-dark/70 text-base font-bold text-primary-100 transition-colors hover:border-primary-100"
                      aria-label="Zoom in"
                      title="Zoom in"
                    >
                      +
                    </button>
                  </div>
                </div>
                {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
              </div>

              <div className="rounded-sm border border-neutral-700 bg-primary-800 p-4">
                <div className="mb-3 text-sm font-semibold text-primary-100">Background</div>
                <div className="mb-3 flex flex-wrap gap-2">
                  {BACKGROUND_PRESETS.map(preset => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => handlePresetClick(preset.value)}
                      className={`flex items-center gap-2 rounded border px-3 py-2 text-sm transition-colors ${
                        backgroundColor.toLowerCase() === preset.value.toLowerCase()
                          ? 'border-primary-100 text-primary-100'
                          : 'border-neutral-600 text-neutral-200 hover:border-primary-100 hover:text-primary-100'
                      }`}
                    >
                      <span
                        className="relative h-4 w-4 overflow-hidden rounded-sm border border-black/20"
                        style={CHECKERBOARD_STYLE}
                      >
                        <span className="absolute inset-0" style={{ backgroundColor: preset.value }} />
                      </span>
                      {preset.label}
                    </button>
                  ))}
                </div>
                <HexColorPicker
                  color={transparentBackground ? '#000000' : backgroundColor}
                  onChange={n => handlePresetClick(n)}
                  style={{ width: '100%', maxWidth: '300px', height: '140px' }}
                />
                <div className="mt-2 max-w-75 flex items-center gap-2">
                  <input
                    id="gif-background-color"
                    type="text"
                    value={backgroundInput}
                    onChange={e => handleBackgroundInputChange(e.target.value)}
                    className="w-full rounded-sm border border-neutral-600 bg-dark/40 px-3 py-2 font-mono text-sm text-primary-100 outline-none focus:border-primary-100"
                    placeholder="#161018"
                  />
                </div>
              </div>

              <div className="rounded-sm border border-neutral-700 bg-primary-800 p-4">
                <div className="mb-3 text-sm font-semibold text-primary-100">Help</div>
                <div className="space-y-3 text-sm text-neutral-400">
                  <p>
                    This is an advanced tool for making GIFs of solves or algs. 
                    You can configure how long each step takes, the pieces shown on a step, and the delay before each step.
                    If you want to add more delay elsewhere, break the solve into more lines back on the main page.
                  </p>
                  <p>
                    Just to put to rest the whole GIF vs JIF thing, GIF stands for Jraphics Interchange Format. 
                    Have a good day. 🦜
                  </p>
                </div>
              </div>
            </section>

            <section className="flex-1 min-w-72 space-y-4">
              <div className="rounded-sm border border-neutral-700 bg-primary-800 p-4">
                <div className="mb-3 text-sm font-semibold text-primary-100">Pause before each step</div>
                <span className="text-xs text-neutral-400 mb-3 block">{`This represents the percentage of total solve time spent pausing. Configure more precisely by checking "Custom".`}</span>
                <div className="mb-4 flex items-center">
                  <input
                    id="gif-delay-range"
                    type="range"
                    min={0}
                    max={50}
                    step={1}
                    value={delayPct}
                    disabled={individualDelays}
                    onChange={e => {
                      const v = parseFloat(e.target.value);
                      setDelayPct(v);
                      setDelayPctInput(v.toFixed(0));
                    }}
                    className="flex-1 cursor-pointer accent-primary-100 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <input
                    id="gif-delay-number"
                    type="number"
                    min={0}
                    max={50}
                    step={1}
                    value={delayPctInput}
                    disabled={individualDelays}
                    onChange={e => handleDelayPctChange(e.target.value)}
                    onBlur={() => setDelayPctInput(delayPct.toFixed(0))}
                    className="w-10 no-spinner ml-2 rounded-sm border border-neutral-600 bg-dark/40 px-1 py-1 text-right font-mono text-xs text-primary-100 outline-none focus:border-primary-100 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <span className="text-xs text-neutral-400 mr-2 ml-1">%</span>
                  <label htmlFor="gif-individual-delays" className="flex cursor-pointer items-center gap-1 whitespace-nowrap text-xs text-neutral-400">
                    <input
                      id="gif-individual-delays"
                      type="checkbox"
                      checked={individualDelays}
                      onChange={e => handleIndividualDelaysToggle(e.target.checked)}
                      className="cursor-pointer accent-primary-100"
                    />
                    Custom
                  </label>
                </div>

                {/* piece highlighting options — below pause config */}
                <div className="mb-1 border-t pt-3 border-neutral-600 flex flex-col items-start text-xs text-neutral-400">
                  <div className="mb-3 text-sm font-semibold text-primary-100">Piece highlighting</div>
                  <div className="flex items-center gap-2">
                    {(['none', 'auto'] as const).map(mode => {
                      const active = highlightBase === mode;
                      return (
                        <button
                          key={mode}
                          type="button"
                          disabled={isCustomizing}
                          onClick={() => handleHighlightBaseChange(mode)}
                          className={`px-2 py-0.5 rounded-sm border text-xs ${
                            isCustomizing
                              ? 'border-neutral-700 text-neutral-600 cursor-not-allowed opacity-50'
                              : active
                              ? 'border-primary-100 text-primary-100 bg-primary-100/10 cursor-pointer'
                              : 'border-neutral-600 text-neutral-400 hover:border-neutral-400 cursor-pointer'
                          }`}
                        >
                          {mode === 'none' ? 'None' : 'Auto (CFOP)'}
                        </button>
                      );
                    })}
                  </div>
                  <label htmlFor="gif-customize-highlight" className="flex cursor-pointer items-center gap-1 whitespace-nowrap text-xs text-neutral-400 mt-2">
                    <input
                      id="gif-customize-highlight"
                      type="checkbox"
                      checked={isCustomizing}
                      onChange={e => handleCustomizeToggle(e.target.checked)}
                      className="cursor-pointer accent-primary-100"
                    />
                    {`Customize ${highlightBase === 'auto' ? 'Auto' : 'None'}`}
                  </label>
                </div>

                                {lineEntries.length > 0 ? (
                  <div className="mt-4 flex flex-col justify-end gap-1">
                    <div className="flex items-center justify-between gap-2 border-t border-neutral-600 pt-3 text-sm">
                      <span className="font-semibold text-primary-100">Total duration</span>
                      <div className="flex items-center">
                        <input
                          id="gif-total-duration"
                          type="number"
                          min={MIN_TOTAL_DURATION}
                          max={MAX_TOTAL_DURATION}
                          value={totalDurationInput}
                          step={0.001}
                          onChange={e => handleTotalDurationChange(e.target.value)}
                          onBlur={() => setTotalDurationInput(totalDuration.toFixed(2))}
                          className="w-20 no-spinner rounded-sm border border-neutral-600 bg-dark/40 px-2 py-1 text-right font-mono text-xs text-primary-100 outline-none focus:border-primary-100"
                        />
                        <span className="text-neutral-300 text-xs pl-1">s</span>
                      </div>
                    </div>
                    <span className="text-xs text-neutral-400 pb-4">This doesn&apos;t have to be the solve time. 
                      It can be whatever will get the point across to those watching it.
                      Probably pretty slow!  
                    </span>
                  </div>
                ) : null}

                <div className="mb-3 text-sm font-semibold text-primary-100 border-t border-neutral-600 pt-3">Line-by-line configuration</div>

                {lineEntries.length === 0 ? (
                  <p className="text-sm text-neutral-400">No solution moves to animate.</p>
                ) : (
                  <ul className="space-y-2">
                    {lineListJSX}
                  </ul>
                )}
              </div>

              <div className="rounded-sm border border-neutral-700 bg-primary-800 p-4">
                <label className="flex items-center justify-between gap-3 text-sm text-neutral-100">
                  <span>Include face directions</span>
                  <input
                    type="checkbox"
                    checked={includeFaceLabels}
                    onChange={e => setIncludeFaceLabels(e.target.checked)}
                    className="h-4 w-4 cursor-pointer"
                  />
                </label>
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-neutral-100">Include facelets</span>
                  <input
                    type="checkbox"
                    checked={includeFacelets}
                    onChange={e => setIncludeFacelets(e.target.checked)}
                    className="h-4 w-4 cursor-pointer"
                  />
                </div>
                <div className="mt-5">
                  <div className="mb-1 flex items-center justify-between text-sm text-neutral-100">
                    <span>Output size</span>
                    <span className="font-mono text-neutral-300">{resolution}×{resolution}px</span>
                  </div>
                  <input
                    type="range"
                    min={120}
                    max={720}
                    step={20}
                    value={resolution}
                    onChange={e => setResolution(parseInt(e.target.value, 10))}
                    className="w-full cursor-pointer accent-primary-100"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={isGenerating || lineEntries.length === 0}
                  className={`rounded border px-4 py-2 text-sm transition-colors ${
                    isGenerating || lineEntries.length === 0
                      ? 'cursor-not-allowed border-neutral-700 bg-neutral-800 text-neutral-500'
                      : 'border-primary-100 bg-primary-200 text-black hover:brightness-110'
                  }`}
                >
                  {isGenerating ? <span ref={progressLabelRef}>Generating... 0%</span> : 'Download GIF'}
                </button>
              </div>
              {lineEntries.length === 0 && (
                <p className="text-right text-sm text-cube-orange">No solution to turn into a gif.</p>
              )}
            </section>
          </div>
        </div>
      </div>
    </RemoveScroll>,
    document.body,
  );
}
