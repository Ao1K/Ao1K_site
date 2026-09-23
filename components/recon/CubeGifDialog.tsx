import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { RemoveScroll } from 'react-remove-scroll';
import { HexAlphaColorPicker } from 'react-colorful';
import {
  AmbientLight,
  BackSide,
  LinearFilter,
  LinearMipmapLinearFilter,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  TextureLoader,
  WebGLRenderer,
  type Material,
  type Object3D,
  type Vector3,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TwistyPlayer } from 'cubing/twisty';
import {
  useCubeColors,
  useHintFaceletsElevation,
  type CubeColors,
} from '../../composables/useSettings';
import { ALL_PIECE_NAMES, allHighlightSet } from './UnfoldedCube';
import LineConfigItem, { type LineEntry, MIN_LINE_PCT } from './LineConfigItem';
import type { LineIconDatum } from './IconStack';
import type { SvgShape } from '@/composables/recon/stepIconDescriptors';
import { getAutoHighlight } from '@/composables/recon/autoHighlight';
import { createGifEncoderPool, type GifEncoderPool } from '@/composables/recon/gifEncoderPool';
import type { GifSettings } from '@/utils/gifEncoding';
import { listFlatSceneColors, type Rgb, type SceneColors, type TranslucentLayer } from '@/utils/gifPalette';

const CHECKERBOARD_STYLE = {
  backgroundColor: '#d4d4d4',
  backgroundImage: 'repeating-conic-gradient(#f5f5f5 0% 25%, transparent 25% 50%)',
  backgroundPosition: '0 0',
  backgroundSize: '16px 16px',
} as const;

const BACKGROUND_PRESETS = [
  { label: 'Purplish', value: '#433149' },
  { label: 'Black', value: '#000000' },
  { label: 'Grey', value: '#73737380' },
  { label: 'Transparent', value: '#00000000' },
];

const DEFAULT_BACKGROUND = BACKGROUND_PRESETS.find((preset) => (preset.label === 'Purplish'))!.value

const isFullyTransparent = (color: string) => color.toLowerCase().endsWith('00') && color.length === 9;

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

// piece name count per orbit (CORNERS=3 facelets, EDGES=2, CENTERS=1)
const ORBIT_FACELET_COUNT: Record<string, number> = { CORNERS: 3, EDGES: 2, CENTERS: 1 };

// build a cubing.js StickeringMask object:
// highlighted pieces → 'regular', everything else → 'ignored' (overridden with translucent tint below).
// pass null to clear (all regular).
function buildStickeringMask(highlighted: Set<string> | null, orbitNames: Record<string, string[]>): object {
  const orbits: Record<string, object> = {};
  for (const [orbit, names] of Object.entries(orbitNames)) {
    const faceletCount = ORBIT_FACELET_COUNT[orbit] ?? 1;
    orbits[orbit] = {
      pieces: names.map(name => ({
        facelets: Array.from(
          { length: faceletCount },
          () => (highlighted === null || highlighted.has(name)) ? 'regular' : 'ignored',
        ),
      })),
    };
  }
  return { orbits };
}

const FACE_COLOR_KEYS: (keyof CubeColors)[] = ['up', 'left', 'front', 'right', 'back', 'down'];

type FaceMaterials = {
  regular: MeshBasicMaterial;
  regularHint: MeshBasicMaterial;
  translucent: MeshBasicMaterial;
  translucentHint: MeshBasicMaterial;
};

function createFaceMaterials(cube: any): FaceMaterials[] {
  const faceMaterials: FaceMaterials[] = [];
  for (const centerInfos of cube.kpuzzleFaceletInfo.CENTERS as any[][]) {
    const center = centerInfos[0];
    faceMaterials[center.faceIdx] = {
      regular: center.facelet.material,
      regularHint: center.hintFacelet.material,
      translucent: new MeshBasicMaterial({ transparent: true, opacity: 0.3 }),
      translucentHint: new MeshBasicMaterial({ transparent: true, opacity: 0.3, side: BackSide }),
    };
  }
  return faceMaterials;
}

const HIDDEN_MATERIAL = new MeshBasicMaterial({ visible: false });

function boxFaceIndexFacing(position: Vector3): number {
  const components = position.toArray();
  const axis = components.reduce(
    (best, value, i) => (Math.abs(value) > Math.abs(components[best]) ? i : best),
    0,
  );
  return axis * 2 + (components[axis] > 0 ? 0 : 1);
}

const readFoundationMaterial = (cube: any) => (cube.experimentalFoundationMeshes as Mesh[])[0].material as MeshBasicMaterial;

function hideInnerFoundationFaces(cube: any) {
  for (const foundation of cube.experimentalFoundationMeshes as Mesh[]) {
    const shellMaterial = foundation.material as Material;
    const stickers = foundation.parent!.children.filter(child => child !== foundation);
    const outerFaces = new Set(stickers.map(sticker => boxFaceIndexFacing(sticker.position)));
    foundation.material = Array.from({ length: 6 }, (_, faceIdx) =>
      outerFaces.has(faceIdx) ? shellMaterial : HIDDEN_MATERIAL,
    );
  }
}

function applyCubeColors(faceMaterials: FaceMaterials[], colors: CubeColors) {
  faceMaterials.forEach((materials, faceIdx) => {
    const color = colors[FACE_COLOR_KEYS[faceIdx]];
    materials.regular.color.set(color);
    materials.translucent.color.set(color);
    materials.translucentHint.color.set(color);
  });
}

const PALETTE_SAMPLE_FRAMES = 16;
const PALETTE_PROGRESS_SHARE = 8;

const FACE_LABEL_COLORS: Rgb[] = [[0xec, 0xe6, 0xef], [0x16, 0x10, 0x18]];

function compositeOverBlack(color: number, alpha: number): Rgb {
  return [
    Math.round(((color >> 16) & 0xff) * alpha),
    Math.round(((color >> 8) & 0xff) * alpha),
    Math.round((color & 0xff) * alpha),
  ];
}

function materialRgb(material: MeshBasicMaterial): Rgb {
  const hex = material.color.getHex();
  return [(hex >> 16) & 0xff, (hex >> 8) & 0xff, hex & 0xff];
}

function materialLayer(material: MeshBasicMaterial): TranslucentLayer {
  return { color: materialRgb(material), opacity: material.transparent ? material.opacity : 1 };
}

type SceneColorOptions = {
  background: Rgb;
  hasTranslucentPieces: boolean;
  includeFacelets: boolean;
  includeFaceLabels: boolean;
};

function collectSceneColors(
  faceMaterials: FaceMaterials[],
  foundation: MeshBasicMaterial,
  options: SceneColorOptions,
): SceneColors {
  const { hasTranslucentPieces } = options;
  const regularHints = faceMaterials.map(materials => materialLayer(materials.regularHint));
  const translucentHints = hasTranslucentPieces
    ? faceMaterials.map(materials => materialLayer(materials.translucentHint))
    : [];
  return {
    background: options.background,
    opaqueStickers: faceMaterials.map(materials => materialRgb(materials.regular)),
    foundation: materialLayer(foundation),
    hints: options.includeFacelets ? [...regularHints, ...translucentHints] : [],
    labels: options.includeFaceLabels ? FACE_LABEL_COLORS : [],
  };
}

type CaptureFrame = (tSec: number) => Promise<Uint8ClampedArray>;
type CaptureBackground = { color: number; alpha: number };

const HEX_COLOR_PATTERN = /^#([0-9a-fA-F]{6})([0-9a-fA-F]{2})?$/;
const FALLBACK_CAPTURE_COLOR = 0x161018;

function parseCaptureBackground(backgroundColor: string, transparent: boolean): CaptureBackground {
  if (transparent) return { color: FALLBACK_CAPTURE_COLOR, alpha: 0 };
  const match = backgroundColor.match(HEX_COLOR_PATTERN);
  if (!match) return { color: FALLBACK_CAPTURE_COLOR, alpha: 1 };
  return {
    color: parseInt(match[1], 16),
    alpha: match[2] ? parseInt(match[2], 16) / 255 : 1,
  };
}

function createCaptureRenderer(resolution: number, background: CaptureBackground): WebGLRenderer {
  const renderer = new WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(resolution, resolution, false);
  renderer.setClearColor(background.color, background.alpha);
  return renderer;
}

function createSquareCamera(camera: PerspectiveCamera): PerspectiveCamera {
  const square = camera.clone();
  square.aspect = 1;
  square.updateProjectionMatrix();
  square.updateMatrixWorld(true);
  return square;
}

function flipRowsAndMakeOpaque(bottomUpPixels: Uint8Array, resolution: number): Uint8ClampedArray {
  const rowBytes = resolution * 4;
  const frame = new Uint8ClampedArray(bottomUpPixels.length);
  for (let row = 0; row < resolution; row++) {
    const sourceStart = (resolution - 1 - row) * rowBytes;
    frame.set(bottomUpPixels.subarray(sourceStart, sourceStart + rowBytes), row * rowBytes);
  }
  for (let alpha = 3; alpha < frame.length; alpha += 4) frame[alpha] = 255;
  return frame;
}

function createFrameGrabber(
  renderer: WebGLRenderer,
  scene: Scene,
  camera: PerspectiveCamera,
  resolution: number,
): () => Uint8ClampedArray {
  const gl = renderer.getContext();
  const bottomUpPixels = new Uint8Array(resolution * resolution * 4);

  return () => {
    renderer.render(scene, camera);
    gl.readPixels(0, 0, resolution, resolution, gl.RGBA, gl.UNSIGNED_BYTE, bottomUpPixels);
    return flipRowsAndMakeOpaque(bottomUpPixels, resolution);
  };
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

async function applyPlayerPositionToCube(player: TwistyPlayer, cube: Object3D) {
  const position = await player.experimentalModel.legacyPosition.get();
  (cube as any).onPositionChange(position);
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

// cube animation durations match _PageContent.findAnimationLengths
const moveDurationMs = (move: string) => {
  if (move.includes('3')) return 2000;
  if (move.includes('2')) return 1500;
  return 1000;
};

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
  const previewDivRef = useRef<HTMLDivElement | null>(null);
  const playerElRef = useRef<TwistyPlayer | null>(null);
  const cubeObjectRef = useRef<Object3D | null>(null);
  const hintStickerMeshesRef = useRef<any[]>([]);
  const faceLabelMeshesRef = useRef<Mesh[]>([]);
  const faceMaterialsRef = useRef<FaceMaterials[]>([]);
  const foundationMaterialRef = useRef<MeshBasicMaterial | null>(null);
  const colorBasedOrbitNamesRef = useRef<Record<string, string[]>>({});
  const sceneRef = useRef<Scene | null>(null);
  const cameraRef = useRef<PerspectiveCamera | null>(null);
  const rendererRef = useRef<WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const previewStartRef = useRef<number>(0);
  const isCapturingRef = useRef(false);
  const zoomFactorRef = useRef(1);

  const [backgroundColor, setBackgroundColor] = useState(DEFAULT_BACKGROUND);
  const [backgroundInput, setBackgroundInput] = useState(DEFAULT_BACKGROUND);
  const transparentBackground = isFullyTransparent(backgroundColor);
  const [includeFacelets, setIncludeFacelets] = useState(true);
  const [includeFaceLabels, setIncludeFaceLabels] = useState(true);
  const [resolution, setResolution] = useState(360);
  const [isGenerating, setIsGenerating] = useState(false);
  const progressLabelRef = useRef<HTMLSpanElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewLoaded, setPreviewLoaded] = useState(false);

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
      const moveDurations = line.moves.map(moveDurationMs);
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
    if (!/^#[0-9A-Fa-f]{0,8}$/.test(value)) return;
    setBackgroundInput(value);
    if (/^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/.test(value)) {
      setBackgroundColor(value);
    }
  };

  const handlePresetClick = (value: string) => {
    setBackgroundColor(value);
    setBackgroundInput(value);
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
    cubeColors: CubeColors;
    splits: string[];
    onSplitsChange: (splits: string[]) => void;
    onSplitsCommit: (splits: string[]) => void;
  }
  const latestStateRef = useRef<LatestRef>({
    lineEntries,
    percentages,
    totalDuration,
    totalCubeDuration,
    effectiveDelays,
    lineHighlights,
    lockedLines,
    cubeColors,
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
      cubeColors,
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

  // applies or clears the cubing.js stickering mask based on highlight config for a given line.
  // lineIdx < 0 clears all highlighting (used after capture). a set that covers every piece is
  // treated as "no mask" so the cube renders normally.
  const applyHighlightForLine = (lineIdx: number) => {
    const cube = cubeObjectRef.current as any;
    if (!cube?.setStickeringMask) return;

    let highlighted: Set<string> | null = null;
    if (lineIdx >= 0) {
      const set = latestStateRef.current.lineHighlights[lineIdx];
      if (set && set.size < ALL_PIECE_NAMES.length) highlighted = set;
    }

    cube.setStickeringMask(buildStickeringMask(highlighted, colorBasedOrbitNamesRef.current));

    if (highlighted !== null) {
      const info = cube.kpuzzleFaceletInfo;
      if (info) {
        for (const [orbit, names] of Object.entries(colorBasedOrbitNamesRef.current)) {
          names.forEach((name, pieceIdx) => {
            if (highlighted!.has(name)) return;
            const pieceInfos: any[] = info[orbit]?.[pieceIdx];
            if (!pieceInfos) return;
            pieceInfos.forEach((fi: any) => {
              const materials = faceMaterialsRef.current[fi.faceIdx];
              if (!materials) return;
              if (fi.facelet) fi.facelet.material = materials.translucent;
              if (fi.hintFacelet) fi.hintFacelet.material = materials.translucentHint;
            });
          });
        }
      }
    }
  };

  // place camera using current zoom factor
  const updateCameraPosition = () => {
    const cam = cameraRef.current;
    const div = previewDivRef.current;
    if (!cam || !div) return;
    const containerHeight = div.clientHeight || 360;
    const total = ((containerHeight * 0.0024) + 0.92) * zoomFactorRef.current;
    cam.position.z = (Math.sqrt(3) / 2) * total;
    cam.position.y = (1 / 2) * total;
  };

  // creates and mounts a TwistyPlayer in div, storing it in playerElRef
  const createAndMountPlayer = (div: HTMLElement) => {
    const fullAlg = lineEntries.map(e => e.moves.join(' ')).join(' ');
    const player = new TwistyPlayer({
      viewerLink: 'none',
      puzzle: '3x3x3',
      hintFacelets: 'floating',
      experimentalInitialHintFaceletsAnimation: 'always',
      experimentalHintFaceletsElevation: elevation,
      backView: 'none',
      background: 'none',
      controlPanel: 'none',
      experimentalSetupAlg: scramble,
      alg: fullAlg,
      tempoScale: 1,
    });
    // size the player to match the preview area so cubing's intersection observer
    // sees it on-screen and initializes its 3D objects. we hide it after extracting the cube.
    player.style.position = 'absolute';
    player.style.inset = '0';
    player.style.width = '100%';
    player.style.height = '100%';
    player.style.opacity = '0';
    player.style.pointerEvents = 'none';
    player.experimentalFaceletScale = 0.95;
    div.appendChild(player);
    playerElRef.current = player;
    return player;
  };

  // waits up to 10s for the cube 3D object to become available
  const waitForCube = async (player: TwistyPlayer): Promise<Object3D | null> => {
    let cube: Object3D | null = null;
    const start = Date.now();
    while (!cube && Date.now() - start < 10000) {
      try {
        cube = (await player.experimentalCurrentThreeJSPuzzleObject()) as unknown as Object3D | null;
      } catch {
        // keep trying
      }
      if (!cube) await new Promise(r => setTimeout(r, 100));
    }
    return cube;
  };

  // adds URFDLB face direction label meshes to the cube
  const addFaceLabels = (cube: Object3D) => {
    const loader = new TextureLoader();
    const faceConfigs = [
      { file: '/U.svg', position: { x: 0, y: 2, z: 0 }, rotation: { x: -Math.PI / 2, y: 0, z: 0 } },
      { file: '/D.svg', position: { x: 0, y: -2, z: 0 }, rotation: { x: Math.PI / 2, y: 0, z: 0 } },
      { file: '/R.svg', position: { x: 2, y: 0, z: 0 }, rotation: { x: 0, y: Math.PI / 2, z: 0 } },
      { file: '/L.svg', position: { x: -2, y: 0, z: 0 }, rotation: { x: 0, y: -Math.PI / 2, z: 0 } },
      { file: '/B.svg', position: { x: 0, y: 0, z: -2 }, rotation: { x: 0, y: Math.PI, z: 0 } },
      { file: '/F.svg', position: { x: 0, y: 0, z: 2 }, rotation: { x: 0, y: 0, z: 0 } },
    ];
    faceConfigs.forEach(cfg => {
      const texture = loader.load(cfg.file, () => {
        texture.generateMipmaps = true;
        texture.minFilter = LinearMipmapLinearFilter;
        texture.magFilter = LinearFilter;
        texture.anisotropy = 32;
        const material = new MeshBasicMaterial({ map: texture, transparent: true });
        const mesh = new Mesh(new PlaneGeometry(1.1, 1.6), material);
        mesh.position.set(cfg.position.x, cfg.position.y, cfg.position.z);
        mesh.rotation.set(cfg.rotation.x, cfg.rotation.y, cfg.rotation.z);
        cube.add(mesh);
        faceLabelMeshesRef.current.push(mesh);
      });
    });
  };

  // derives color-based piece names (e.g. 'WGR') from actual facelet hex colors and stores in ref.
  // must be called after applyCubeColors so center hex values reflect the user's color settings.
  const buildColorPieceNames = (cube: any) => {
    const faceletInfo = cube.kpuzzleFaceletInfo;
    if (!faceletInfo) return;
    // map hex → color letter from center facelets (cubing.js order: U=W, L=O, F=G, R=R, B=B, D=Y)
    const hexToLetter = new Map<number, string>();
    ['W', 'O', 'G', 'R', 'B', 'Y'].forEach((letter, i) => {
      const hex = faceletInfo.CENTERS?.[i]?.[0]?.facelet?.material?.color?.getHex?.();
      if (hex !== undefined) hexToLetter.set(hex, letter);
    });
    // canonical name: W/Y (U/D-face color) first, remaining letters sorted alphabetically
    const orbitNames: Record<string, string[]> = {};
    for (const orbit of ['CORNERS', 'EDGES', 'CENTERS']) {
      orbitNames[orbit] = (faceletInfo[orbit] as any[][] ?? []).map((pieceInfos: any[]) => {
        const letters = pieceInfos.map((fi: any) => {
          const hex = fi?.facelet?.material?.color?.getHex?.();
          return hex !== undefined ? (hexToLetter.get(hex) ?? '?') : '?';
        });
        const primary = letters.find(l => l === 'W' || l === 'Y') ?? '';
        const rest = letters.filter(l => l !== 'W' && l !== 'Y').sort();
        return primary + rest.join('');
      });
    }
    colorBasedOrbitNamesRef.current = orbitNames;
  };

  // creates the Three.js scene, camera, and renderer; appends the canvas to div
  const createSceneCameraRenderer = (cube: Object3D, div: HTMLElement) => {
    const scene = new Scene();
    scene.add(cube);
    sceneRef.current = scene;

    const aspect = (div.clientWidth || 360) / (div.clientHeight || 360);
    const camera = new PerspectiveCamera(75, aspect, 0.1, 5);
    cameraRef.current = camera;
    // initial position; updated via updateCameraPosition below
    camera.position.set(0, 0.5, 0.9);
    camera.lookAt(0, 0, 0);

    const renderer = new WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setSize(div.clientWidth || 360, div.clientHeight || 360, false);
    renderer.setClearColor(0x000000, 0);
    const canvas = renderer.domElement;
    canvas.style.position = 'absolute';
    canvas.style.inset = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    div.appendChild(canvas);
    rendererRef.current = renderer;

    return { scene, camera, renderer };
  };

  // adds ambient light and sets up OrbitControls for the scene
  const setupLightsAndControls = (scene: Scene, camera: PerspectiveCamera, renderer: WebGLRenderer) => {
    const light = new AmbientLight(0xffffff, 1);
    scene.add(light);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.15;
    controls.enableZoom = false;
    controls.enablePan = false;
    controlsRef.current = controls;
  };

  // Escape closes the dialog
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  // setup the preview Three.js scene (mount once; rAF lives in its own effect below)
  useEffect(() => {
    let disposed = false;

    const setup = async () => {
      const div = previewDivRef.current;
      if (!div) return;

      const player = createAndMountPlayer(div);
      const cube = await waitForCube(player);
      if (!cube || disposed) return;
      cubeObjectRef.current = cube;
      hintStickerMeshesRef.current = (cube as any).experimentalHintStickerMeshes || [];

      addFaceLabels(cube);

      // detach the player's own canvas (we own the cube via our own scene now)
      const twistyEl = player.querySelector('canvas');
      if (twistyEl?.parentNode) twistyEl.parentNode.removeChild(twistyEl);

      foundationMaterialRef.current = readFoundationMaterial(cube);
      hideInnerFoundationFaces(cube);
      faceMaterialsRef.current = createFaceMaterials(cube);
      applyCubeColors(faceMaterialsRef.current, latestStateRef.current.cubeColors);
      buildColorPieceNames(cube);

      const { scene, camera, renderer } = createSceneCameraRenderer(cube, div);
      setupLightsAndControls(scene, camera, renderer);

      updateCameraPosition();
      previewStartRef.current = performance.now();
      setPreviewLoaded(true);
    };

    setup().catch(e => {
      console.error('Failed to setup gif preview:', e);
      setError(e instanceof Error ? e.message : 'Failed to load preview.');
    });

    return () => {
      disposed = true;
      controlsRef.current?.dispose();
      controlsRef.current = null;
      rendererRef.current?.dispose();
      if (rendererRef.current?.domElement.parentNode) {
        rendererRef.current.domElement.parentNode.removeChild(rendererRef.current.domElement);
      }
      rendererRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
      cubeObjectRef.current = null;
      faceMaterialsRef.current.forEach(materials => {
        materials.translucent.dispose();
        materials.translucentHint.dispose();
      });
      faceMaterialsRef.current = [];
      if (playerElRef.current?.parentNode) {
        playerElRef.current.parentNode.removeChild(playerElRef.current);
      }
      playerElRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // dedicated rAF loop: kicks off once the scene is ready and tears down on unmount.
  // reads latest state via latestStateRef so it never needs to restart on state changes.
  useEffect(() => {
    if (!previewLoaded) return;
    const player = playerElRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const renderer = rendererRef.current;
    const controls = controlsRef.current;
    if (!player || !scene || !camera || !renderer || !controls) return;

    let rafId = 0;
    let lastLineIdx = -2;
    let lastSet: Set<string> | undefined;

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      if (isCapturingRef.current) {
        // -2 matches no line index, and not -1 (no line) either, so the mask is re-applied after capture.
        lastLineIdx = -2;
        return;
      }

      const { totalDuration: tot, lineHighlights } = latestStateRef.current;
      const elapsedSec = ((performance.now() - previewStartRef.current) / 1000) % (tot + 0.5);
      const tClamped = Math.min(elapsedSec, tot);
      try {
        // @ts-ignore - timestamp is a number-like setter
        player.timestamp = realTimeToCubeTimestamp(tClamped);
      } catch {
        // ignore
      }

      // re-apply mask when the active line OR its highlight set identity changes
      const lineIdx = realTimeToLineIndex(tClamped);
      const currentSet = lineIdx >= 0 ? lineHighlights[lineIdx] : undefined;
      if (lineIdx !== lastLineIdx || currentSet !== lastSet) {
        applyHighlightForLine(lineIdx);
        lastLineIdx = lineIdx;
        lastSet = currentSet;
      }

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => cancelAnimationFrame(rafId);
  }, [previewLoaded]);

  // update sticker colors live if the user changes them on another ao1k browser tab
  useEffect(() => {
    applyCubeColors(faceMaterialsRef.current, cubeColors);
  }, [cubeColors]);

  const handleIncludeFacelets = (include: boolean) => {
    hintStickerMeshesRef.current.forEach((mesh: any) => {
      mesh.visible = include;
    });
    setIncludeFacelets(include);
  };

  const handleIncludeFaceLabels = (include: boolean) => {
    faceLabelMeshesRef.current.forEach(mesh => {
      mesh.visible = include;
    });
    setIncludeFaceLabels(include);
  };

  const seekCaptureTo = (tSec: number) => {
    try {
      // @ts-ignore - timestamp setter exists on the TwistyPlayer element
      playerElRef.current.timestamp = realTimeToCubeTimestamp(tSec);
    } catch {
      // ignore
    }
    applyHighlightForLine(realTimeToLineIndex(tSec));
  };

  const showGenerationProgress = (percent: number) => {
    if (progressLabelRef.current) progressLabelRef.current.textContent = `Generating... ${percent}%`;
  };

  const handleDownload = async () => {
    if (isGenerating) return;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const player = playerElRef.current;
    const cube = cubeObjectRef.current;
    const foundationMaterial = foundationMaterialRef.current;
    if (!scene || !camera || !player || !cube || !foundationMaterial) {
      setError('Preview is not ready yet.');
      return;
    }

    setError(null);
    setIsGenerating(true);
    isCapturingRef.current = true;

    let captureRenderer: WebGLRenderer | null = null;
    const pool = createGifEncoderPool();

    try {
      const background = parseCaptureBackground(backgroundColor, transparentBackground);
      captureRenderer = createCaptureRenderer(resolution, background);
      const grabFrame = createFrameGrabber(captureRenderer, scene, createSquareCamera(camera), resolution);

      const yieldToBrowserPeriodically = createPeriodicBrowserYield();
      const captureFrame: CaptureFrame = async (tSec) => {
        await yieldToBrowserPeriodically();
        seekCaptureTo(tSec);
        await applyPlayerPositionToCube(player, cube);
        return grabFrame();
      };

      const totalFrames = Math.max(1, Math.round(totalDuration * FPS)) + 1;

      const sceneColors = collectSceneColors(faceMaterialsRef.current, foundationMaterial, {
        background: compositeOverBlack(background.color, background.alpha),
        hasTranslucentPieces: lineHighlights.some(set => set.size < ALL_PIECE_NAMES.length),
        includeFacelets,
        includeFaceLabels,
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
      captureRenderer?.dispose();
      // clear highlighting after capture so preview returns to normal
      applyHighlightForLine(-1);
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
              className="rounded border border-neutral-600 px-3 py-2 text-sm text-neutral-300 bg-primary-900 hover:bg-primary-800 transition-colors hover:text-primary-100"
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
                    style={{ backgroundColor: transparentBackground ? 'transparent' : backgroundColor }}
                  />
                  <div
                    ref={previewDivRef}
                    className="absolute inset-0"
                    style={{ touchAction: 'none' }}
                  />
                  {!previewLoaded ? (
                    <div className="absolute inset-0 flex items-center justify-center text-sm text-neutral-300">
                      Loading preview...
                    </div>
                  ) : null}
                  <div className="absolute right-2 top-2 flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        const next = Math.min(2.2, zoomFactorRef.current * 1.1);
                        zoomFactorRef.current = next;
                        updateCameraPosition();
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
                        const next = Math.max(0.65, zoomFactorRef.current * 0.9);
                        zoomFactorRef.current = next;
                        updateCameraPosition();
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
                <HexAlphaColorPicker
                  color={backgroundColor}
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
                    placeholder="#161018ff"
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
                    onChange={e => handleIncludeFaceLabels(e.target.checked)}
                    className="h-4 w-4 cursor-pointer"
                  />
                </label>
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-neutral-100">Include facelets</span>
                  <input
                    type="checkbox"
                    checked={includeFacelets}
                    onChange={e => handleIncludeFacelets(e.target.checked)}
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
                <p className="text-right text-sm text-orange-400">No solution to turn into a gif.</p>
              )}
            </section>
          </div>
        </div>
      </div>
    </RemoveScroll>,
    document.body,
  );
}
