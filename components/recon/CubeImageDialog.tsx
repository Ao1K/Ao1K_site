import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { HexAlphaColorPicker } from 'react-colorful';
import { RemoveScroll } from 'react-remove-scroll';
import type { CubeScreenshotOptions, ScreenshotSetupStatus } from '../../composables/recon/CubeScreenshotGenerator';

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
  const [includeSetupMovesPreference, setIncludeSetupMovesPreference] = useState(DEFAULT_OPTIONS.includeSetupMoves);
  const [size, setSize] = useState(DEFAULT_OPTIONS.size);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [copyAlert, setCopyAlert] = useState(EMPTY_ALERT);
  const [error, setError] = useState<string | null>(null);

  const isSetupMovesUnavailable = setupStatus.status !== 'available';
  const includeSetupMoves = includeSetupMovesPreference && !isSetupMovesUnavailable;

  const canCopyToClipboard = typeof navigator !== 'undefined'
    && typeof navigator.clipboard?.write === 'function'
    && typeof ClipboardItem !== 'undefined';

  const options = { backgroundColor, includeFaceLabels, includeSetupMoves, size };

  const safeSize = Math.max(1, Math.round(size));
  const safeAspect = Number.isFinite(viewerAspectRatio) && viewerAspectRatio > 0 ? viewerAspectRatio : 1;

  const outputDimensions = safeAspect >= 1
    ? {
      width: safeSize,
      height: Math.max(1, Math.round(safeSize / safeAspect)),
    }
    : {
      width: Math.max(1, Math.round(safeSize * safeAspect)),
      height: safeSize,
    };

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
    if (event.key === 'Escape') {
      onClose();
    }
  };

  useEffect(() => {

    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
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

  const handlePresetClick = (value: string) => {
    setBackgroundColor(value);
    setBackgroundInput(value);
  };

  const handleDownload = () => {
    setIsDownloading(true);
    setError(null);

    try {
      const imageUrl = previewUrl || onGeneratePreview(options);

      const anchor = document.createElement('a');
      anchor.href = imageUrl;

      const sanitizedSetupMoves = setupMovesForFilename
        .trim()
        .replace(/\s+/g, '_')
        .replace(/[']/g, 'pr')
        .replace(/[^A-Za-z0-9_]/g, '');
      const setupMovesSuffix = includeSetupMoves && sanitizedSetupMoves
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

      const response = await fetch(imageUrl);
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
        <div className="flex items-center justify-between border-b border-neutral-700 px-4 py-3 sm:px-6">
          <div>
            <h2 className="text-lg font-semibold text-primary-100">Create Cube Image</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-neutral-600 px-3 py-2 text-sm text-neutral-200 transition-colors hover:border-primary-100 hover:text-primary-100"
          >
            Close
          </button>
        </div>

        <div className="grid gap-4 p-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="space-y-4">
            <div className="rounded-sm border h-fit border-neutral-700 bg-primary-800 p-4">
              <div className="mb-3 flex items-center justify-between text-sm">
                <span className="font-semibold text-primary-100">Image Preview</span>
                {/* <span className="text-neutral-300">{outputDimensions.width} x {outputDimensions.height}px</span> */}
              </div>

              <div
                className="relative mx-auto w-full max-w-140 overflow-hidden border border-neutral-700"
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
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm text-neutral-300">
                    Preview unavailable.
                  </div>
                )}
              </div>

              {displayedError ? (
                <p className="mt-3 text-sm text-red-300">{displayedError}</p>
              ) : null}
            </div>

            <div className="rounded-sm border border-neutral-700 bg-primary-800 p-4">
              <div className="mb-3 text-sm font-semibold text-primary-100">Help</div>
              <div className="space-y-3 text-sm text-neutral-400">
                <p>
                  Close this preview to adjust the cube&apos;s colors or the camera angle.
                </p>

                <div className="flex items-start gap-3">
                  <span>The camera angle is best when you can see three faces clearly:</span>
                  <svg
                    viewBox="0 0 30 30"
                    className="h-10 w-10 shrink-0"
                    style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}
                  >
                    {/* top face */}
                    <polygon points="12,12 2,6 12,0 22,6" fill="#cccccc" stroke="#888888" strokeWidth="0.5" />
                    {/* left face */}
                    <polygon points="12,12 2,6 2,16 12,22" fill="#aaaaaa" stroke="#888888" strokeWidth="0.5" />
                    {/* right face */}
                    <polygon points="12,12 22,6 22,16 12,22" fill="#666666" stroke="#555555" strokeWidth="0.5" />
                  </svg>
                </div>
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
                onChange={(nextColor) => handlePresetClick(nextColor)}
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
                  <span>Image size</span>
                  <span className="font-mono text-neutral-300">{outputDimensions.width}x{outputDimensions.height}px</span>
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