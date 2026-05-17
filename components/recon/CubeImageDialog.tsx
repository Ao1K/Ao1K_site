import { useEffect, useRef, useState } from 'react';
import CropIcon from '../icons/crop';
import { createPortal } from 'react-dom';
import { HexAlphaColorPicker } from 'react-colorful';
import { RemoveScroll } from 'react-remove-scroll';
import type { CubeScreenshotOptions, ScreenshotSetupStatus } from '../../composables/recon/CubeScreenshotGenerator';
import { useHintFaceletsElevation } from '../../composables/useSettings';

// note: this cube image dialog is separate from composables/recon/ScreenshotManager,
// which renders solve reconstructions and is unrelated

type CopyAlert = {
  id: string;
  message: string;
  messageType: 'info' | 'warn';
};

interface CubeImageDialogProps {
  onClose: () => void;
  onGeneratePreview: (options: CubeScreenshotOptions) => string;
  setupStatus: ScreenshotSetupStatus;
  viewerAspectRatio: number;
  setupMovesForFilename: string;
}

const DEFAULT_OPTIONS: CubeScreenshotOptions = {
  backgroundColor: '#161018ff',
  includeFaceLabels: true,
  includeSetupMoves: false,
  hintFacelets: true,
  size: 1200,
};

const BACKGROUND_PRESETS = [
  { label: 'Dark', value: '#161018ff' },
  { label: 'Transparent', value: '#00000000' },
  { label: 'Purplish', value: '#433149ff' },
  { label: 'Grey', value: '#73737380' },
];

const CHECKERBOARD_STYLE = {
  backgroundColor: '#d4d4d4',
  backgroundImage: 'repeating-conic-gradient(#f5f5f5 0% 25%, transparent 25% 50%)',
  backgroundPosition: '0 0',
  backgroundSize: '16px 16px',
} as const;

const EMPTY_ALERT: CopyAlert = { id: '', message: '', messageType: 'info' };

type CropRect = { x: number; y: number; w: number; h: number };
type CropHandle = 'tl' | 'tr' | 'bl' | 'br' | 'move';

const cropDataUrl = (dataUrl: string, rect: CropRect): Promise<string> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const { naturalWidth: iw, naturalHeight: ih } = img;
      const sx = Math.round(rect.x * iw);
      const sy = Math.round(rect.y * ih);
      const sw = Math.max(1, Math.round(rect.w * iw));
      const sh = Math.max(1, Math.round(rect.h * ih));
      const canvas = document.createElement('canvas');
      canvas.width = sw;
      canvas.height = sh;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas not available')); return; }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Failed to load image for cropping'));
    img.src = dataUrl;
  });

export default function CubeImageDialog({
  onClose,
  onGeneratePreview,
  setupStatus,
  viewerAspectRatio,
  setupMovesForFilename,
}: CubeImageDialogProps) {
  const [backgroundColor, setBackgroundColor] = useState(DEFAULT_OPTIONS.backgroundColor);
  const [backgroundInput, setBackgroundInput] = useState(DEFAULT_OPTIONS.backgroundColor);
  const [includeFaceLabels, setIncludeFaceLabels] = useState(DEFAULT_OPTIONS.includeFaceLabels);
  const [includeFacelets, setIncludeFacelets] = useState(DEFAULT_OPTIONS.hintFacelets ?? true);
  const [includeSetupMovesPreference, setIncludeSetupMovesPreference] = useState(DEFAULT_OPTIONS.includeSetupMoves);
  const [elevation] = useHintFaceletsElevation();
  const faceletsDisabledGlobally = elevation === 0;
  const [size, setSize] = useState(DEFAULT_OPTIONS.size);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [copyAlert, setCopyAlert] = useState(EMPTY_ALERT);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1.0);
  const [cropEnabled, setCropEnabled] = useState(false);
  const [cropRect, setCropRect] = useState<CropRect>({ x: 0, y: 0, w: 1, h: 1 });
  const cropDragRef = useRef<{
    target: CropHandle;
    startPointer: { x: number; y: number };
    startRect: CropRect;
  } | null>(null);
  const savedCropRectRef = useRef<CropRect | null>(null);
  const previewContainerRef = useRef<HTMLDivElement | null>(null);

  const isSetupMovesUnavailable = setupStatus.status !== 'available';
  const includeSetupMoves = includeSetupMovesPreference && !isSetupMovesUnavailable;

  const canCopyToClipboard = typeof navigator !== 'undefined'
    && typeof navigator.clipboard?.write === 'function'
    && typeof ClipboardItem !== 'undefined';

  const safeSize = Math.max(1, Math.round(size));
  const safeAspect = Number.isFinite(viewerAspectRatio) && viewerAspectRatio > 0 ? viewerAspectRatio : 1;

  const outputDimensions = safeAspect >= 1
    ? { width: safeSize, height: Math.max(1, Math.round(safeSize / safeAspect)) }
    : { width: Math.max(1, Math.round(safeSize * safeAspect)), height: safeSize };

  const cropOutputWidth = Math.max(1, Math.round(outputDimensions.width * cropRect.w));
  const cropOutputHeight = Math.max(1, Math.round(outputDimensions.height * cropRect.h));

  const options = { backgroundColor, includeFaceLabels, includeSetupMoves, hintFacelets: includeFacelets, size: safeSize, zoom };

  let previewUrl = '';
  let previewError: string | null = null;

  try {
    previewUrl = onGeneratePreview(options);
  } catch (previewGenerationError) {
    previewError = previewGenerationError instanceof Error ? previewGenerationError.message : 'Failed to generate preview.';
  }

  const displayedError = error ?? previewError;

  useEffect(() => {
    if (copyAlert.id !== 'copy-cube-image' || !copyAlert.message) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setCopyAlert(EMPTY_ALERT);
    }, 2000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [copyAlert]);
  const handleEscape = (event: KeyboardEvent) => {
    if (event.key === 'Escape') onClose();
  };
  
  useEffect(() => {
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  const handleBackgroundInputChange = (value: string) => {
    if (!/^#[0-9A-Fa-f]{0,8}$/.test(value)) {
      return;
    }

    setBackgroundInput(value);

    if (/^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/.test(value)) {
      setBackgroundColor(value);
    }
  };

  const applyBackground = (value: string) => {
    setBackgroundColor(value);
    setBackgroundInput(value);
  };

  const toggleCrop = () => {
    if (!cropEnabled) {
      if (savedCropRectRef.current) {
        setCropRect(savedCropRectRef.current);
      } else {
        const squareW = Math.min(1, outputDimensions.height / outputDimensions.width);
        // make slightly unsquare. Wider than it is tall.
        const unsquareW = squareW * 1.2;
        setCropRect({ x: (1 - unsquareW) / 2, y: 0, w: unsquareW, h: 1 });
      }
    } else {
      savedCropRectRef.current = cropRect;
    }
    setCropEnabled(prev => !prev);
  };

  const shouldApplyCrop = cropEnabled && !(cropRect.x === 0 && cropRect.y === 0 && cropRect.w === 1 && cropRect.h === 1);

  const handleDownload = async () => {
    setIsDownloading(true);
    setError(null);

    try {
      const imageUrl = previewUrl || onGeneratePreview(options);
      const finalUrl = shouldApplyCrop ? await cropDataUrl(imageUrl, cropRect) : imageUrl;

      const anchor = document.createElement('a');
      anchor.href = finalUrl;

      const sanitizedSetupMoves = setupMovesForFilename
        .trim()
        .replace(/\s+/g, '_')
        .replace(/[']/g, 'pr')
        .replace(/[^A-Za-z0-9_]/g, '');
      const setupMovesSuffix = sanitizedSetupMoves
        ? `-${sanitizedSetupMoves}`
        : '';

      anchor.download = `ao1k-cube${setupMovesSuffix}.png`;
      anchor.click();
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : 'Failed to download cube image.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopy = async () => {
    if (!canCopyToClipboard) {
      setError('Clipboard image copy is not available in this browser.');
      return;
    }

    setIsCopying(true);
    setError(null);
    setCopyAlert(EMPTY_ALERT);

    try {
      const imageUrl = previewUrl || onGeneratePreview(options);
      const finalUrl = shouldApplyCrop ? await cropDataUrl(imageUrl, cropRect) : imageUrl;

      const response = await fetch(finalUrl);
      const blob = await response.blob();

      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type || 'image/png']: blob })
      ]);

      setCopyAlert({ id: 'copy-cube-image', message: 'Copied!', messageType: 'info' });
    } catch (copyError) {
      setError(copyError instanceof Error ? copyError.message : 'Failed to copy cube image.');
    } finally {
      setIsCopying(false);
    }
  };

  const startCropDrag = (e: React.PointerEvent, target: CropHandle) => {
    e.preventDefault();
    e.stopPropagation();
    if (!previewContainerRef.current) return;
    const r = previewContainerRef.current.getBoundingClientRect();
    cropDragRef.current = {
      target,
      startPointer: { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height },
      startRect: { ...cropRect },
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onCropDragMove = (e: React.PointerEvent) => {
    if (!cropDragRef.current || !previewContainerRef.current) return;
    const r = previewContainerRef.current.getBoundingClientRect();
    const cx = (e.clientX - r.left) / r.width;
    const cy = (e.clientY - r.top) / r.height;
    const dx = cx - cropDragRef.current.startPointer.x;
    const dy = cy - cropDragRef.current.startPointer.y;
    const sr = cropDragRef.current.startRect;
    const MIN = 0.05;
    let nx = sr.x, ny = sr.y, nw = sr.w, nh = sr.h;
    switch (cropDragRef.current.target) {
      case 'move':
        nx = Math.max(0, Math.min(1 - sr.w, sr.x + dx));
        ny = Math.max(0, Math.min(1 - sr.h, sr.y + dy));
        break;
      case 'tl':
        nx = Math.max(0, Math.min(sr.x + sr.w - MIN, sr.x + dx));
        ny = Math.max(0, Math.min(sr.y + sr.h - MIN, sr.y + dy));
        nw = sr.x + sr.w - nx; nh = sr.y + sr.h - ny;
        break;
      case 'tr':
        ny = Math.max(0, Math.min(sr.y + sr.h - MIN, sr.y + dy));
        nw = Math.max(MIN, Math.min(1 - sr.x, sr.w + dx));
        nh = sr.y + sr.h - ny;
        break;
      case 'bl':
        nx = Math.max(0, Math.min(sr.x + sr.w - MIN, sr.x + dx));
        nw = sr.x + sr.w - nx;
        nh = Math.max(MIN, Math.min(1 - sr.y, sr.h + dy));
        break;
      case 'br':
        nw = Math.max(MIN, Math.min(1 - sr.x, sr.w + dx));
        nh = Math.max(MIN, Math.min(1 - sr.y, sr.h + dy));
        break;
    }
    setCropRect({ x: nx, y: ny, w: nw, h: nh });
  };

  const onCropDragEnd = () => { cropDragRef.current = null; };

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <RemoveScroll>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-dark/75 p-3 sm:p-6"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            onClose();
          }
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Cube image preview"
          className="max-h-[92vh] w-full max-w-5xl overflow-auto rounded-sm border border-neutral-700 bg-dark text-primary-100 shadow-2xl"
        >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-700 bg-primary-400 px-4 py-3 sm:px-6">
          <h2 className="text-lg font-semibold text-dark">Create Cube Image</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-neutral-600 px-3 py-2 text-sm text-neutral-300 bg-primary-900 hover:bg-primary-800 transition-colors hover:text-primary-100"
          >
            Close
          </button>
        </div>

        <div className="grid gap-4 p-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <section className="space-y-4">
            <div className="rounded-sm border h-fit border-neutral-700 bg-primary-800 p-4">
              <div className="mb-3 flex items-center justify-between text-sm">
                <span className="font-semibold text-primary-100">Image Preview</span>
                <button
                  type="button"
                  onClick={toggleCrop}
                  title={cropEnabled ? 'Disable crop' : 'Enable crop'}
                  aria-label={cropEnabled ? 'Disable crop' : 'Enable crop'}
                  className={`flex items-center gap-1.5 rounded border px-2 py-1 text-xs transition-colors ${
                    cropEnabled
                      ? 'border-primary-100 text-primary-100'
                      : 'border-neutral-600 text-neutral-400 hover:border-primary-100 hover:text-primary-100'
                  }`}
                >
                  <CropIcon />
                  Crop
                </button>
              </div>

              <div
                ref={previewContainerRef}
                className="relative mx-auto w-full overflow-hidden border border-neutral-700 select-none"
                style={{
                  ...CHECKERBOARD_STYLE,
                  aspectRatio: `${outputDimensions.width} / ${outputDimensions.height}`,
                }}
              >
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Cube image preview"
                    className="absolute inset-0 block h-full w-full object-fill"
                    draggable={false}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm text-neutral-300">
                    Preview unavailable.
                  </div>
                )}

                {cropEnabled && previewUrl && (
                  <>
                    {cropRect.y > 0.001 && (
                      <div className="pointer-events-none absolute bg-black/50" style={{ left: 0, top: 0, right: 0, height: `${cropRect.y * 100}%` }} />
                    )}
                    {(cropRect.y + cropRect.h) < 0.999 && (
                      <div className="pointer-events-none absolute bg-black/50" style={{ left: 0, bottom: 0, right: 0, height: `${(1 - cropRect.y - cropRect.h) * 100}%` }} />
                    )}
                    {cropRect.x > 0.001 && (
                      <div className="pointer-events-none absolute bg-black/50" style={{ left: 0, top: `${cropRect.y * 100}%`, width: `${cropRect.x * 100}%`, height: `${cropRect.h * 100}%` }} />
                    )}
                    {(cropRect.x + cropRect.w) < 0.999 && (
                      <div className="pointer-events-none absolute bg-black/50" style={{ right: 0, top: `${cropRect.y * 100}%`, width: `${(1 - cropRect.x - cropRect.w) * 100}%`, height: `${cropRect.h * 100}%` }} />
                    )}
                    <div
                      className="absolute touch-none"
                      style={{ left: `${cropRect.x * 100}%`, top: `${cropRect.y * 100}%`, width: `${cropRect.w * 100}%`, height: `${cropRect.h * 100}%`, cursor: 'move' }}
                      onPointerDown={(e) => startCropDrag(e, 'move')}
                      onPointerMove={onCropDragMove}
                      onPointerUp={onCropDragEnd}
                    >
                      <div className="absolute" style={{ top: -2, left: -2, width: 16, height: 16, borderTop: '3px solid white', borderLeft: '3px solid white', cursor: 'nw-resize', filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.85))' }} onPointerDown={(e) => startCropDrag(e, 'tl')} onPointerMove={onCropDragMove} onPointerUp={onCropDragEnd} />
                      <div className="absolute" style={{ top: -2, right: -2, width: 16, height: 16, borderTop: '3px solid white', borderRight: '3px solid white', cursor: 'ne-resize', filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.85))' }} onPointerDown={(e) => startCropDrag(e, 'tr')} onPointerMove={onCropDragMove} onPointerUp={onCropDragEnd} />
                      <div className="absolute" style={{ bottom: -2, left: -2, width: 16, height: 16, borderBottom: '3px solid white', borderLeft: '3px solid white', cursor: 'sw-resize', filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.85))' }} onPointerDown={(e) => startCropDrag(e, 'bl')} onPointerMove={onCropDragMove} onPointerUp={onCropDragEnd} />
                      <div className="absolute" style={{ bottom: -2, right: -2, width: 16, height: 16, borderBottom: '3px solid white', borderRight: '3px solid white', cursor: 'se-resize', filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.85))' }} onPointerDown={(e) => startCropDrag(e, 'br')} onPointerMove={onCropDragMove} onPointerUp={onCropDragEnd} />
                    </div>
                  </>
                )}

                <div
                  className="absolute right-2 top-2 flex flex-col gap-1"
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => setZoom(prev => Math.max(0.4, prev * 0.9))}
                    className="flex h-7 w-7 items-center justify-center rounded-sm border border-neutral-600 bg-dark/70 text-base font-bold text-primary-100 transition-colors hover:border-primary-100"
                    aria-label="Zoom out"
                    title="Zoom out"
                  >
                    −
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoom(prev => Math.min(2.5, prev * 1.1))}
                    className="flex h-7 w-7 items-center justify-center rounded-sm border border-neutral-600 bg-dark/70 text-base font-bold text-primary-100 transition-colors hover:border-primary-100"
                    aria-label="Zoom in"
                    title="Zoom in"
                  >
                    +
                  </button>
                </div>
              </div>

              {displayedError ? (
                <p className="mt-3 text-sm text-red-300">{displayedError}</p>
              ) : null}
            </div>

            <div className="rounded-sm border border-neutral-700 bg-primary-800 p-4">
              <div className="mb-3 text-sm font-semibold text-primary-100">Help</div>
              <div className="space-y-3 text-sm text-neutral-400">
                <p>
                  Use this tool to create a PNG image of the cube in its current position.
                </p>
                <p>
                  <span className="underline">Close this window</span>{' '}to adjust the cube&apos;s colors or the camera angle.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="rounded-sm border border-neutral-700 bg-primary-800 p-4">
              <div className="mb-3 text-sm font-semibold text-primary-100">Background</div>
              <div className="mb-3 flex flex-wrap gap-2">
                {BACKGROUND_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => applyBackground(preset.value)}
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
                      <span
                        className="absolute inset-0"
                        style={{ backgroundColor: preset.value }}
                      />
                    </span>
                    {preset.label}
                  </button>
                ))}
              </div>

              <HexAlphaColorPicker
                color={backgroundColor}
                onChange={(nextColor) => applyBackground(nextColor)}
                style={{ width: '100%', height: '180px' }}
              />

              <div className="mt-3 flex items-center gap-2">
                <input
                  type="text"
                  value={backgroundInput}
                  onChange={(event) => handleBackgroundInputChange(event.target.value)}
                  className="w-full rounded-sm border border-neutral-600 bg-dark/40 px-3 py-2 font-mono text-sm text-primary-100 outline-none transition-colors focus:border-primary-100"
                  placeholder="#161018ff"
                />
              </div>
            </div>

            <div className="rounded-sm border border-neutral-700 bg-primary-800 p-4">
              <label className="flex items-center justify-between gap-3 text-sm text-neutral-100">
                <span>Include face directions</span>
                <input
                  type="checkbox"
                  checked={includeFaceLabels}
                  onChange={(event) => setIncludeFaceLabels(event.target.checked)}
                  className="h-4 w-4 cursor-pointer"
                />
              </label>

              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-neutral-100">Include facelets</span>
                <div className="flex items-center gap-3">
                  {faceletsDisabledGlobally ? (
                    <span className="text-xs text-neutral-500">Disabled in settings</span>
                  ) : null}
                  <input
                    type="checkbox"
                    checked={faceletsDisabledGlobally ? false : includeFacelets}
                    onChange={(event) => {
                      if (faceletsDisabledGlobally) return;
                      setIncludeFacelets(event.target.checked);
                    }}
                    disabled={faceletsDisabledGlobally}
                    className="h-4 w-4 cursor-pointer disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3 text-sm text-neutral-100">
                <span>Include setup moves</span>
                <div className="flex items-center gap-3">
                  {isSetupMovesUnavailable ? (
                    <span className="text-xs text-amber-300">{setupStatus.message}</span>
                  ) : null}
                  <input
                    type="checkbox"
                    checked={includeSetupMoves}
                    onChange={(event) => {
                      if (isSetupMovesUnavailable) {
                        return;
                      }
                      setIncludeSetupMovesPreference(event.target.checked);
                    }}
                    disabled={isSetupMovesUnavailable}
                    className="h-4 w-4 cursor-pointer disabled:cursor-not-allowed"
                  />
                </div>
              </div>
              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between text-sm text-neutral-100">
                  <span>Output size</span>
                  <span className="font-mono text-neutral-300">{cropEnabled ? `${cropOutputWidth}×${cropOutputHeight}` : `${outputDimensions.width}×${outputDimensions.height}`}px</span>
                </div>
                <input
                  type="range"
                  min={512}
                  max={2048}
                  step={64}
                  value={size}
                  onChange={(event) => setSize(parseInt(event.target.value, 10))}
                  className="w-full cursor-pointer accent-primary-100"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <div className="relative">
                {copyAlert.id === 'copy-cube-image' ? (
                  <div className={`pointer-events-none absolute left-1/2 top-0 z-10 mb-2 -translate-x-1/2 translate-y-[-120%] whitespace-nowrap rounded-sm px-2 py-1 text-sm font-semibold text-dark ${
                    copyAlert.messageType === 'warn' ? 'bg-orange-500' : 'bg-primary-100'
                  }`}>
                    {copyAlert.message}
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={handleCopy}
                  disabled={isCopying || !canCopyToClipboard}
                  className={`rounded border px-4 py-2 text-sm transition-colors ${
                    isCopying || !canCopyToClipboard
                      ? 'cursor-not-allowed border-neutral-700 bg-neutral-800 text-neutral-500'
                      : 'border-neutral-300 text-neutral-100 hover:border-primary-100 hover:text-primary-100'
                  }`}
                >
                  Copy to clipboard
                </button>
              </div>
              <button
                type="button"
                onClick={handleDownload}
                disabled={isDownloading}
                className={`rounded border px-4 py-2 text-sm transition-colors ${
                  isDownloading
                    ? 'cursor-not-allowed border-neutral-700 bg-neutral-800 text-neutral-500'
                    : 'border-primary-100 bg-primary-200 text-black hover:brightness-110'
                }`}
              >
                {isDownloading ? 'Downloading...' : 'Download'}
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