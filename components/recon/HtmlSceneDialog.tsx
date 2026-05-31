'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { RemoveScroll } from 'react-remove-scroll';
import { HexAlphaColorPicker } from 'react-colorful';
import {
  AmbientLight,
  BoxGeometry,
  CanvasTexture,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useCubeColors, type CubeColors } from '../../composables/useSettings';
import LineConfigItem, { type LineEntry, MIN_LINE_PCT } from './LineConfigItem';
import type { LineIconDatum } from './IconStack';
import type { SvgShape } from '@/composables/recon/stepIconDescriptors';
import { getAutoHighlight } from '@/composables/recon/autoHighlight';
import { ALL_PIECE_NAMES, allHighlightSet } from './UnfoldedCube';
import { compileCubeScene } from '../../app/devActions';
import type { CompiledLine } from '../../app/devActionTypes';
import { SimpleCube } from '../../composables/recon/SimpleCube';

const CHECKERBOARD_STYLE = {
  backgroundColor: '#d4d4d4',
  backgroundImage: 'repeating-conic-gradient(#f5f5f5 0% 25%, transparent 25% 50%)',
  backgroundPosition: '0 0',
  backgroundSize: '16px 16px',
} as const;

const BACKGROUND_PRESETS = [
  { label: 'Black', value: '#000000ff' },
  { label: 'Clear', value: '#00000000' },
  { label: 'Purplish', value: '#433149ff' },
  { label: 'Grey', value: '#73737380' },
];

const MIN_TOTAL_DURATION = 0.5;
const MAX_TOTAL_DURATION = 60;
const CAMERA_RADIUS = 3.5;

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

function contrastText(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5 ? '#000' : '#fff';
}

// BoxGeometry material order: +X (right), -X (left), +Y (up), -Y (down), +Z (front), -Z (back)
function buildFaceDefs(c: CubeColors) {
  return [
    { label: 'R', bg: c.right, text: contrastText(c.right) },
    { label: 'L', bg: c.left,  text: contrastText(c.left)  },
    { label: 'U', bg: c.up,    text: contrastText(c.up)    },
    { label: 'D', bg: c.down,  text: contrastText(c.down)  },
    { label: 'F', bg: c.front, text: contrastText(c.front) },
    { label: 'B', bg: c.back,  text: contrastText(c.back)  },
  ];
}

function makeFaceTexture(label: string, bg: string, text: string): CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 12;
  ctx.strokeRect(6, 6, size - 12, size - 12);
  ctx.fillStyle = text;
  ctx.font = `bold ${size * 0.55}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, size / 2, size / 2);
  return new CanvasTexture(canvas);
}

function elevAzimToPosition(elevDeg: number, azimDeg: number) {
  const elev = MathUtils.degToRad(elevDeg);
  const azim = MathUtils.degToRad(azimDeg);
  return {
    x: CAMERA_RADIUS * Math.cos(elev) * Math.sin(azim),
    y: CAMERA_RADIUS * Math.sin(elev),
    z: CAMERA_RADIUS * Math.cos(elev) * Math.cos(azim),
  };
}

function positionToElevAzim(x: number, y: number, z: number) {
  const elev = MathUtils.radToDeg(Math.asin(Math.max(-1, Math.min(1, y / CAMERA_RADIUS))));
  const azim = MathUtils.radToDeg(Math.atan2(x, z));
  return { elev, azim };
}

export interface SceneSolveLine {
  moves: string[];
  isWhitespace: boolean;
}

interface HtmlSceneDialogProps {
  onClose: () => void;
  scramble: string;
  solutionLines: SceneSolveLine[];
  lineIconData: LineIconDatum[];
  splits: string[];
  committedSplits: string[];
  onSplitsChange: (splits: string[]) => void;
  onSplitsCommit: (splits: string[]) => void;
}

export default function HtmlSceneDialog({
  onClose,
  scramble,
  solutionLines,
  lineIconData,
  splits,
  committedSplits,
  onSplitsChange,
  onSplitsCommit,
}: HtmlSceneDialogProps) {
  const [cubeColors] = useCubeColors();
  const cubeColorsRef = useRef(cubeColors);
  cubeColorsRef.current = cubeColors;

  // preview refs (simple Three.js box for view-finding)
  const previewDivRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<WebGLRenderer | null>(null);
  const cameraRef = useRef<PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cubeMeshRef = useRef<Mesh | null>(null);
  const animFrameRef = useRef<number>(0);
  const suppressSyncRef = useRef(false);

  // camera angle
  const [angles, setAngles] = useState({ x: 30, y: 30 });

  // settings mirrored from CubeGifDialog
  const [backgroundColor, setBackgroundColor] = useState('#00000000');
  const [backgroundInput, setBackgroundInput] = useState('#00000000');
  const [includeFacelets, setIncludeFacelets] = useState(true);
  const [includeFaceLabels, setIncludeFaceLabels] = useState(false);
  const [showProgressBar, setShowProgressBar] = useState(true);
  const [standalone, setStandalone] = useState(true);
  const [loopPlayback, setLoopPlayback] = useState(true);
  const [isCompiling, setIsCompiling] = useState(false);
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

  const parseSplitValues = (entries: LineEntry[]) => entries.map(entry => {
    const v = parseFloat(committedSplits[entry.splitIdx] ?? '');
    return Number.isFinite(v) && v > 0 ? v : 0;
  });

  const calcPercentages = () => {
    const splitValues = parseSplitValues(lineEntries);
    const allHaveSplits = lineEntries.length > 0 && splitValues.every(v => v > 0);
    if (lineEntries.length === 0) return [];
    if (allHaveSplits) {
      const total = splitValues.reduce((a, b) => a + b, 0);
      return splitValues.map(v => (v / total) * 100);
    }
    const weights = lineEntries.map(entry => {
      const type = lineIconData[entry.index]?.compiledStepInfo?.type;
      const moveCount = entry.moves.length;
      const tps = (type && STEP_TYPE_TPS[type]) ?? 3;
      return moveCount / tps;
    });
    const total = weights.reduce((a, b) => a + b, 0);
    return weights.map(w => (w / total) * 100);
  };
  const [percentages, setPercentages] = useState<number[]>(calcPercentages());

  const DEFAULT_DELAY_PCT = 20;
  const [delayPct, setDelayPct] = useState(DEFAULT_DELAY_PCT);
  const [delayPctInput, setDelayPctInput] = useState(DEFAULT_DELAY_PCT.toString());
  const [individualDelays, setIndividualDelays] = useState(false);
  const [lineDelays, setLineDelays] = useState<number[]>([]);

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

  const [totalDuration, setTotalDuration] = useState(() => {
    const splitValues = parseSplitValues(lineEntries);
    const allHaveSplits = lineEntries.length > 0 && splitValues.every(v => v > 0);
    const sum = allHaveSplits ? splitValues.reduce((a, b) => a + b, 0) : 0;
    if (sum > 0) return sum;
    const tpsSum = lineEntries.reduce((acc, entry) => {
      const type = lineIconData[entry.index]?.compiledStepInfo?.type;
      const tps = (type && STEP_TYPE_TPS[type]) ?? 3;
      return acc + entry.moves.length / tps;
    }, 0);
    return tpsSum > 0 ? tpsSum : Math.max(10, lineEntries.length * 3);
  });
  const [totalDurationInput, setTotalDurationInput] = useState(() => totalDuration.toFixed(2));

  const adjustPercentage = (entryIdx: number, newPct: number) => {
    if (percentages.length === 0) return;
    const clamped = Math.max(MIN_LINE_PCT, Math.min(99, newPct));
    const oldPct = percentages[entryIdx] ?? 0;
    const delta = clamped - oldPct;
    const adjustableIdxs: number[] = [];
    for (let i = 0; i < percentages.length; i++) {
      if (i === entryIdx) continue;
      if (lockedLines[i]) continue;
      adjustableIdxs.push(i);
    }
    if (adjustableIdxs.length === 0) return;
    const adjustableTotal = adjustableIdxs.reduce((sum, i) => sum + (percentages[i] ?? 0), 0);
    const next = [...percentages];
    next[entryIdx] = clamped;
    if (adjustableTotal <= 0) {
      const each = -delta / adjustableIdxs.length;
      adjustableIdxs.forEach(i => {
        next[i] = Math.max(MIN_LINE_PCT, (next[i] ?? 0) + each);
      });
    } else {
      adjustableIdxs.forEach(i => {
        const current = next[i] ?? 0;
        const share = current / adjustableTotal;
        next[i] = Math.max(MIN_LINE_PCT, current - delta * share);
      });
    }
    const sum = next.reduce((a, b) => a + b, 0);
    if (sum > 0) {
      for (let i = 0; i < next.length; i++) next[i] = (next[i] / sum) * 100;
    }
    setPercentages(next);
  };

  const setSplitSeconds = (entryIdx: number, seconds: number) => {
    if (percentages.length === 0) return;
    const clamped = Math.max(0.05, Math.min(MAX_TOTAL_DURATION, seconds));
    const currentSeconds = percentages.map(p => (p / 100) * totalDuration);
    currentSeconds[entryIdx] = clamped;
    const newTotal = currentSeconds.reduce((a, b) => a + b, 0);
    if (newTotal <= 0) return;
    setTotalDuration(newTotal);
    setTotalDurationInput(newTotal.toFixed(2));
    setPercentages(currentSeconds.map(s => (s / newTotal) * 100));
    const newSplits = [...splits];
    lineEntries.forEach((entry, i) => {
      while (newSplits.length <= entry.splitIdx) newSplits.push('');
      newSplits[entry.splitIdx] = currentSeconds[i].toFixed(3).replace(/\.?0+$/, '');
    });
    onSplitsChange(newSplits);
    onSplitsCommit(newSplits);
  };

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

  const handleIndividualDelaysToggle = (enabled: boolean) => {
    if (enabled) setLineDelays(effectiveDelays.slice());
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

  const setLineDelay = (idx: number, seconds: number) => {
    const lineTime = ((percentages[idx] ?? 0) / 100) * totalDuration;
    const clamped = Math.max(0, Math.min(lineTime, seconds));
    setLineDelays(prev => {
      const next = [...prev];
      while (next.length <= idx) next.push(0);
      next[idx] = clamped;
      return next;
    });
  };

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

  const adjustPercentageRef = useRef(adjustPercentage);
  adjustPercentageRef.current = adjustPercentage;
  const setSplitSecondsRef = useRef(setSplitSeconds);
  setSplitSecondsRef.current = setSplitSeconds;
  const setLineDelayRef = useRef(setLineDelay);
  setLineDelayRef.current = setLineDelay;
  const stableAdjustPercentage = useCallback((idx: number, pct: number) => adjustPercentageRef.current(idx, pct), []);
  const stableSetSplitSeconds = useCallback((idx: number, sec: number) => setSplitSecondsRef.current(idx, sec), []);
  const stableSetLineDelay = useCallback((idx: number, sec: number) => setLineDelayRef.current(idx, sec), []);

  // Escape closes
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Three.js preview setup
  useEffect(() => {
    const container = previewDivRef.current;
    if (!container) return;

    const scene = new Scene();
    scene.background = null;

    const camera = new PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 100);
    const initPos = elevAzimToPosition(angles.x, angles.y);
    camera.position.set(initPos.x, initPos.y, initPos.z);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = false;
    controls.enableZoom = false;
    controls.enablePan = false;
    controlsRef.current = controls;

    const geometry = new BoxGeometry(1.5, 1.5, 1.5);
    const materials = buildFaceDefs(cubeColorsRef.current).map(({ label, bg, text }) =>
      new MeshBasicMaterial({ map: makeFaceTexture(label, bg, text) }),
    );
    const cube = new Mesh(geometry, materials);
    cubeMeshRef.current = cube;
    scene.add(cube);
    scene.add(new AmbientLight(0xffffff, 1));

    controls.addEventListener('change', () => {
      if (suppressSyncRef.current) return;
      const { elev, azim } = positionToElevAzim(camera.position.x, camera.position.y, camera.position.z);
      setAngles({ x: Math.round(elev * 100) / 100, y: Math.round(azim * 100) / 100 });
    });

    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();
    setPreviewLoaded(true);

    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      cameraRef.current.aspect = container.clientWidth / container.clientHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
      window.removeEventListener('resize', handleResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // refresh textures when cube colors change
  useEffect(() => {
    const cube = cubeMeshRef.current;
    if (!cube) return;
    const newMaterials = buildFaceDefs(cubeColors).map(({ label, bg, text }) =>
      new MeshBasicMaterial({ map: makeFaceTexture(label, bg, text) }),
    );
    // dispose old
    const old = Array.isArray(cube.material) ? cube.material : [cube.material];
    old.forEach(m => {
      if (m instanceof MeshBasicMaterial) {
        if (m.map) m.map.dispose();
        m.dispose();
      }
    });
    cube.material = newMaterials;
  }, [cubeColors]);

  const applyAnglesToCamera = (next: { x: number; y: number }) => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;
    suppressSyncRef.current = true;
    const pos = elevAzimToPosition(next.x, next.y);
    camera.position.set(pos.x, pos.y, pos.z);
    camera.lookAt(0, 0, 0);
    controls.update();
    suppressSyncRef.current = false;
  };

  const handleAngleChange = (axis: 'x' | 'y', raw: string) => {
    const num = parseFloat(raw);
    const next = { ...angles, [axis]: isNaN(num) ? 0 : num };
    setAngles(next);
    applyAnglesToCamera(next);
  };

  // build the CompiledLine[] payload for the server action
  const buildCompiledLines = (): CompiledLine[] => {
    return lineEntries.map((entry, i) => {
      const lineRealSec = ((percentages[i] ?? 0) / 100) * totalDuration;
      const delaySec = Math.min(effectiveDelays[i] ?? 0, lineRealSec);
      const playSec = Math.max(0, lineRealSec - delaySec);
      const naturalSum = entry.moveDurations.reduce((a, b) => a + b, 0);
      const moveDurationsMs = entry.moves.map((_, j) => {
        if (naturalSum <= 0 || entry.moves.length === 0) return 0;
        return Math.max(50, Math.round((entry.moveDurations[j] / naturalSum) * playSec * 1000));
      });
      // a set covering every piece means "no filtering" — emit null so the compiled scene renders normally.
      const set = lineHighlights[i];
      const highlight: string[] | null =
        set && set.size < ALL_PIECE_NAMES.length ? Array.from(set) : null;
      return {
        moves: entry.moves,
        moveDurationsMs,
        delayMs: Math.round(delaySec * 1000),
        highlight,
      };
    });
  };

  const handleDownload = async () => {
    if (isCompiling) return;
    setError(null);
    setIsCompiling(true);
    try {
      const scrambleMoves = scramble.trim().split(/\s+/).filter(Boolean);
      const cube = new SimpleCube();
      const initialState = cube.getCubeState(scrambleMoves);
      const html = await compileCubeScene({
        initialState,
        lines: buildCompiledLines(),
        angles,
        cubeColors,
        showProgressBar,
        showFacelets: includeFacelets,
        showFaceLabels: includeFaceLabels,
        loopPlayback,
        backgroundColor,
        standalone,
      });
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const sanitizedScramble = scramble
        .trim()
        .replace(/\s+/g, '_')
        .replace(/[']/g, 'pr')
        .replace(/[^A-Za-z0-9_]/g, '');
      const scrambleSuffix = sanitizedScramble ? `-${sanitizedScramble}` : '';
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
      a.download = standalone
        ? `ao1k-solve${scrambleSuffix}-${timestamp}.html`
        : `ao1k-solve${scrambleSuffix}-${timestamp}-component.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'Failed to compile scene.');
    } finally {
      setIsCompiling(false);
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
      onAdjustPercentage={stableAdjustPercentage}
      onSetSplitSeconds={stableSetSplitSeconds}
      onToggleLock={toggleLock}
      onSetLineDelay={stableSetLineDelay}
      onToggleHighlightPiece={toggleLineHighlightPiece}
      onSetLineHighlight={setLineHighlightSet}
    />
  ));

  return createPortal(
    <RemoveScroll>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-dark/75 p-3 sm:p-6"
        onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Compile cube scene"
          className="max-h-[92vh] w-full max-w-4xl overflow-auto rounded-sm border border-neutral-700 bg-dark text-primary-100 shadow-2xl"
        >
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-700 bg-primary-400 px-4 py-3 sm:px-6">
            <h2 className="text-lg font-semibold text-dark">Compile Cube Scene</h2>
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
                <div className="mb-3 text-sm font-semibold text-primary-100">Viewing angle</div>
                <span className="text-xs text-neutral-400 mb-3 block">
                  Drag the cube to set the viewing angle for the compiled scene.
                </span>
                <div
                  className="relative aspect-square w-full max-w-96 overflow-hidden border border-neutral-700 cursor-grab active:cursor-grabbing"
                  style={CHECKERBOARD_STYLE}
                >
                  <div className="absolute inset-0" style={{ backgroundColor }} />
                  <div ref={previewDivRef} className="absolute inset-0" style={{ touchAction: 'none' }} />
                  {!previewLoaded ? (
                    <div className="absolute inset-0 flex items-center justify-center text-sm text-neutral-300">
                      Loading preview...
                    </div>
                  ) : null}
                </div>
                <div className="mt-3 flex gap-3">
                  {(['x', 'y'] as const).map(axis => (
                    <label key={axis} className="flex flex-col gap-1">
                      <span className="text-neutral-400 uppercase text-xs">{axis === 'x' ? 'Elev' : 'Azim'}</span>
                      <input
                        className="bg-dark/40 border border-neutral-600 rounded-sm px-2 py-1 text-primary-100 font-mono text-xs focus:outline-none focus:border-primary-100 w-24"
                        type="number"
                        step="0.01"
                        value={angles[axis]}
                        onChange={e => handleAngleChange(axis, e.target.value)}
                      />
                    </label>
                  ))}
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
                      <span className="relative h-4 w-4 overflow-hidden rounded-sm border border-black/20" style={CHECKERBOARD_STYLE}>
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
                    type="text"
                    value={backgroundInput}
                    onChange={e => handleBackgroundInputChange(e.target.value)}
                    className="w-full rounded-sm border border-neutral-600 bg-dark/40 px-3 py-2 font-mono text-sm text-primary-100 outline-none focus:border-primary-100"
                    placeholder="#1a1a2eff"
                  />
                </div>
              </div>

              <div className="rounded-sm border border-neutral-700 bg-primary-800 p-4">
                <div className="mb-3 text-sm font-semibold text-primary-100">Help</div>
                <div className="space-y-3 text-sm text-neutral-400">
                  <p>
                    This tool compiles your scramble + solution into a standalone HTML file that plays the
                    solve animation. Click the cube in the output to play/pause.
                  </p>
                  <p>
                    &quot;Standalone&quot; produces a full HTML page; uncheck it to get a stylesheet + element fragment
                    you can drop into an existing page.
                  </p>
                </div>
              </div>
            </section>

            <section className="flex-1 min-w-72 space-y-4">
              <div className="rounded-sm border border-neutral-700 bg-primary-800 p-4">
                <div className="mb-3 text-sm font-semibold text-primary-100">Pause before each step</div>
                <span className="text-xs text-neutral-400 mb-3 block">
                  Percentage of total time spent pausing between steps. Check &quot;Custom&quot; to set each line individually.
                </span>
                <div className="mb-4 flex items-center">
                  <input
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
                  <label className="flex cursor-pointer items-center gap-1 whitespace-nowrap text-xs text-neutral-400">
                    <input
                      type="checkbox"
                      checked={individualDelays}
                      onChange={e => handleIndividualDelaysToggle(e.target.checked)}
                      className="cursor-pointer accent-primary-100"
                    />
                    Custom
                  </label>
                </div>

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
                  <label className="flex cursor-pointer items-center gap-1 whitespace-nowrap text-xs text-neutral-400 mt-2">
                    <input
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
                    <span className="text-xs text-neutral-400 pb-4">Total cycle time for one play-through.</span>
                  </div>
                ) : null}

                <div className="mb-3 text-sm font-semibold text-primary-100 border-t border-neutral-600 pt-3">Line-by-line configuration</div>

                {lineEntries.length === 0 ? (
                  <p className="text-sm text-neutral-400">No solution moves to animate.</p>
                ) : (
                  <ul className="space-y-2">{lineListJSX}</ul>
                )}
              </div>

              <div className="rounded-sm border border-neutral-700 bg-primary-800 p-4">
                <label className="flex items-center justify-between gap-3 text-sm text-neutral-100">
                  <span>Include face direction labels</span>
                  <input
                    type="checkbox"
                    checked={includeFaceLabels}
                    onChange={e => setIncludeFaceLabels(e.target.checked)}
                    className="h-4 w-4 cursor-pointer"
                  />
                </label>
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-neutral-100">Include floating facelets</span>
                  <input
                    type="checkbox"
                    checked={includeFacelets}
                    onChange={e => setIncludeFacelets(e.target.checked)}
                    className="h-4 w-4 cursor-pointer"
                  />
                </div>
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-neutral-100">Show progress bar</span>
                  <input
                    type="checkbox"
                    checked={showProgressBar}
                    onChange={e => setShowProgressBar(e.target.checked)}
                    className="h-4 w-4 cursor-pointer"
                  />
                </div>
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-neutral-100">Loop playback</span>
                  <input
                    type="checkbox"
                    checked={loopPlayback}
                    onChange={e => setLoopPlayback(e.target.checked)}
                    className="h-4 w-4 cursor-pointer"
                  />
                </div>
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-neutral-100">Standalone HTML file</span>
                  <input
                    type="checkbox"
                    checked={standalone}
                    onChange={e => setStandalone(e.target.checked)}
                    className="h-4 w-4 cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={isCompiling || lineEntries.length === 0}
                  className={`rounded border px-4 py-2 text-sm transition-colors ${
                    isCompiling || lineEntries.length === 0
                      ? 'cursor-not-allowed border-neutral-700 bg-neutral-800 text-neutral-500'
                      : 'border-primary-100 bg-primary-200 text-black hover:brightness-110'
                  }`}
                >
                  {isCompiling ? 'Compiling…' : 'Download HTML'}
                </button>
              </div>
              {lineEntries.length === 0 && (
                <p className="text-right text-sm text-orange-400">No solution to compile.</p>
              )}
            </section>
          </div>
        </div>
      </div>
    </RemoveScroll>,
    document.body,
  );
}
