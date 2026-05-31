'use client';
import { useEffect, useRef, useState } from 'react';
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
import { compileStaticCubeImage } from '../../app/devActions';
import type { CubeState } from '../../composables/recon/SimpleCube';
import UnfoldedCube, { allHighlightSet } from './UnfoldedCube';

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

const CAMERA_RADIUS = 3.5;

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

interface HtmlImageDialogProps {
  onClose: () => void;
  cubeState: CubeState;
  setupMovesForFilename: string;
}

export default function HtmlImageDialog({
  onClose,
  cubeState,
  setupMovesForFilename,
}: HtmlImageDialogProps) {
  const [cubeColors] = useCubeColors();

  const previewDivRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<WebGLRenderer | null>(null);
  const cameraRef = useRef<PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cubeMeshRef = useRef<Mesh | null>(null);
  const animFrameRef = useRef<number>(0);
  const suppressSyncRef = useRef(false);

  const [angles, setAngles] = useState({ x: 30, y: 30 });
  const [backgroundColor, setBackgroundColor] = useState('#00000000');
  const [backgroundInput, setBackgroundInput] = useState('#00000000');
  const [includeFacelets, setIncludeFacelets] = useState(true);
  const [includeFaceLabels, setIncludeFaceLabels] = useState(true);
  const [standalone, setStandalone] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewLoaded, setPreviewLoaded] = useState(false);
  const [highlightSelection, setHighlightSelection] = useState<Set<string>>(allHighlightSet);

  const toggleHighlightPiece = (piece: string) => {
    setHighlightSelection(prev => {
      const next = new Set(prev);
      if (next.has(piece)) next.delete(piece);
      else next.add(piece);
      return next;
    });
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

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
    const materials = buildFaceDefs(cubeColors).map(({ label, bg, text }) =>
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

  useEffect(() => {
    const cube = cubeMeshRef.current;
    if (!cube) return;
    const newMaterials = buildFaceDefs(cubeColors).map(({ label, bg, text }) =>
      new MeshBasicMaterial({ map: makeFaceTexture(label, bg, text) }),
    );
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

  const handleDownload = async () => {
    if (isCompiling) return;
    setError(null);
    setIsCompiling(true);
    try {
      const highlight =
        highlightSelection.size > 0
          ? Array.from(highlightSelection)
          : null;
      const html = await compileStaticCubeImage({
        initialState: cubeState,
        angles,
        cubeColors,
        showFacelets: includeFacelets,
        showFaceLabels: includeFaceLabels,
        backgroundColor,
        standalone,
        highlight,
      });
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const sanitizedSetupMoves = setupMovesForFilename
        .trim()
        .replace(/\s+/g, '_')
        .replace(/[']/g, 'pr')
        .replace(/[^A-Za-z0-9_]/g, '');
      const suffix = sanitizedSetupMoves ? `-${sanitizedSetupMoves}` : '';
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
      a.download = standalone
        ? `ao1k-cube${suffix}-${timestamp}.html`
        : `ao1k-cube${suffix}-${timestamp}-component.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'Failed to compile cube image.');
    } finally {
      setIsCompiling(false);
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <RemoveScroll>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-dark/75 p-3 sm:p-6"
        onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Compile cube image"
          className="max-h-[92vh] w-full max-w-4xl overflow-auto rounded-sm border border-neutral-700 bg-dark text-primary-100 shadow-2xl"
        >
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-700 bg-primary-400 px-4 py-3 sm:px-6">
            <h2 className="text-lg font-semibold text-dark">Compile Cube Image</h2>
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
                  Drag the cube to set the viewing angle for the compiled image.
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
                    A developer-only tool to create a lightweight html file with the current cube state rendered in 3D.
                  </p>
                </div>
              </div>
            </section>

            <section className="flex-1 min-w-72 space-y-4">
              <div className="rounded-sm border border-neutral-700 bg-primary-800 p-4">
                <span className="mb-3 block text-sm font-semibold text-primary-100">Highlight pieces</span>
                <span className="mb-3 block text-xs text-neutral-400">
                  Click stickers to highlight their piece. Unselected pieces are dimmed in the output.
                </span>
                <UnfoldedCube
                  selected={highlightSelection}
                  onToggle={toggleHighlightPiece}
                  onSetSelection={setHighlightSelection}
                  cubeColors={cubeColors}
                />
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
                  disabled={isCompiling}
                  className={`rounded border px-4 py-2 text-sm transition-colors ${
                    isCompiling
                      ? 'cursor-not-allowed border-neutral-700 bg-neutral-800 text-neutral-500'
                      : 'border-primary-100 bg-primary-200 text-black hover:brightness-110'
                  }`}
                >
                  {isCompiling ? 'Compiling…' : 'Download HTML'}
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </RemoveScroll>,
    document.body,
  );
}
