'use client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { RemoveScroll } from 'react-remove-scroll';
import { HexAlphaColorPicker } from 'react-colorful';
import { useCubeColors } from '../../composables/useSettings';
import CubeAnglePreview from './CubeAnglePreview';
import { compileStaticCubeImage } from '../../app/devActions';
import { formatCubeImageJsx } from '../../utils/cubeSceneJsx';
import { buildColorHex } from '../../utils/cubeSceneAuthoring';
import { faceletsFromState } from '../../utils/cubeMoves';
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

const SHADE_PRESETS = [
  { label: 'Dark', value: '#000000b3' },
  { label: 'Grey', value: '#73737399' },
  { label: 'Faint', value: '#0000002e' },
  { label: 'None', value: '#00000000' },
];

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

  const [angles, setAngles] = useState({ x: 30, y: 30 });
  const [backgroundColor, setBackgroundColor] = useState('#00000000');
  const [backgroundInput, setBackgroundInput] = useState('#00000000');
  const [shadeColor, setShadeColor] = useState('#000000b3');
  const [shadeInput, setShadeInput] = useState('#000000b3');
  const [dimOpacityPercent, setDimOpacityPercent] = useState(60);
  const [includeFacelets, setIncludeFacelets] = useState(true);
  const [includeFaceLabels, setIncludeFaceLabels] = useState(true);
  const [standalone, setStandalone] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highlightSelection, setHighlightSelection] = useState<Set<string>>(allHighlightSet);
  const facelets = faceletsFromState(cubeState);
  const highlight = highlightSelection.size > 0 ? Array.from(highlightSelection) : null;

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

  const handleAngleChange = (axis: 'x' | 'y', raw: string) => {
    const num = parseFloat(raw);
    setAngles({ ...angles, [axis]: isNaN(num) ? 0 : num });
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

  const handleShadeInputChange = (value: string) => {
    if (!/^#[0-9A-Fa-f]{0,8}$/.test(value)) return;
    setShadeInput(value);
    if (/^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/.test(value)) {
      setShadeColor(value);
    }
  };

  const handleShadePresetClick = (value: string) => {
    setShadeColor(value);
    setShadeInput(value);
  };

  const handleCopyJsx = async () => {
    setError(null);
    try {
      const jsx = formatCubeImageJsx({
        facelets,
        angles,
        colors: buildColorHex(cubeColors),
        shade: shadeColor,
        dim: dimOpacityPercent / 100,
        hints: includeFacelets,
        labels: includeFaceLabels,
        highlight,
      });
      await navigator.clipboard.writeText(jsx);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'Failed to copy JSX.');
    }
  };

  const handleDownload = async () => {
    if (isCompiling) return;
    setError(null);
    setIsCompiling(true);
    try {
      const html = await compileStaticCubeImage({
        initialState: cubeState,
        angles,
        cubeColors,
        showFacelets: includeFacelets,
        showFaceLabels: includeFaceLabels,
        backgroundColor,
        shadeColor,
        dimOpacity: dimOpacityPercent / 100,
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
              className="rounded border border-neutral-600 px-3 py-2 text-sm text-primary-100 bg-primary-800 hover:bg-primary-700 transition-colors"
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
                  <CubeAnglePreview
                    facelets={facelets}
                    angles={angles}
                    onAnglesChange={setAngles}
                    cubeColors={cubeColors}
                    shade={shadeColor}
                    dim={dimOpacityPercent / 100}
                    hints={includeFacelets}
                    labels={includeFaceLabels}
                    highlight={highlight}
                  />
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

                <div className="mt-4 border-t border-neutral-600 pt-4">
                  <div className="mb-3 text-sm font-semibold text-primary-100">Unhighlighted piece shade</div>
                  <span className="mb-3 block text-xs text-neutral-400">
                    Unselected pieces are muted toward this color. Adjust the alpha to control how heavily.
                  </span>
                  <div className="mb-3 flex flex-wrap gap-2">
                    {SHADE_PRESETS.map(preset => (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => handleShadePresetClick(preset.value)}
                        className={`flex items-center gap-2 rounded border px-3 py-2 text-sm transition-colors ${
                          shadeColor.toLowerCase() === preset.value.toLowerCase()
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
                    color={shadeColor}
                    onChange={n => handleShadePresetClick(n)}
                    style={{ width: '100%', maxWidth: '300px', height: '140px' }}
                  />
                  <div className="mt-2 max-w-75 flex items-center gap-2">
                    <input
                      type="text"
                      value={shadeInput}
                      onChange={e => handleShadeInputChange(e.target.value)}
                      className="w-full rounded-sm border border-neutral-600 bg-dark/40 px-3 py-2 font-mono text-sm text-primary-100 outline-none focus:border-primary-100"
                      placeholder="#000000b3"
                    />
                  </div>

                  <div className="mt-4 border-t border-neutral-600 pt-4">
                    <div className="mb-3 text-sm font-semibold text-primary-100">Unhighlighted piece opacity</div>
                    <span className="mb-3 block text-xs text-neutral-400">
                      Unselected pieces are also made see-through, so highlighted pieces on the far side of the cube stay readable.
                    </span>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={1}
                        value={dimOpacityPercent}
                        onChange={e => setDimOpacityPercent(Number(e.target.value))}
                        className="max-w-75 flex-1 cursor-pointer"
                      />
                      <span className="w-12 text-right font-mono text-sm text-primary-100">{dimOpacityPercent}%</span>
                    </div>
                  </div>
                </div>
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
                  onClick={handleCopyJsx}
                  className="rounded border border-primary-100 px-4 py-2 text-sm text-primary-100 transition-colors hover:bg-primary-800"
                >
                  {copied ? 'Copied' : 'Copy JSX'}
                </button>
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
