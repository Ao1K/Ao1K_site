'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { RemoveScroll } from 'react-remove-scroll';
import { HexColorPicker } from 'react-colorful';
import SettingsCubePreview from './SettingsCubePreview';
import {
  useCubeColors,
  useHintFaceletsElevation,
  useStickerScale,
  useCameraFov,
  DEFAULT_HINT_FACELETS_ELEVATION,
  DEFAULT_STICKER_SCALE,
  MIN_STICKER_SCALE,
  DEFAULT_CAMERA_FOV,
  MIN_CAMERA_FOV,
  MAX_CAMERA_FOV,
  DEFAULT_CUBE_COLORS,
  type CubeColors,
} from '../composables/useSettings';

const STICKER_SLIDER_CURVE_BASE = 115;
const MAX_STICKER_GAP = 1 - MIN_STICKER_SCALE;

function stickerScaleFromSlider(position: number): number {
  const gap = MAX_STICKER_GAP * (STICKER_SLIDER_CURVE_BASE ** (1 - position) - 1) / (STICKER_SLIDER_CURVE_BASE - 1);
  return 1 - gap;
}

function sliderFromStickerScale(scale: number): number {
  const gap = 1 - scale;
  const curvedGap = 1 + gap * (STICKER_SLIDER_CURVE_BASE - 1) / MAX_STICKER_GAP;
  return 1 - Math.log(curvedGap) / Math.log(STICKER_SLIDER_CURVE_BASE);
}

const FACE_LABELS: { key: keyof CubeColors; label: string }[] = [
  { key: 'up', label: 'Up' },
  { key: 'down', label: 'Down' },
  { key: 'front', label: 'Front' },
  { key: 'back', label: 'Back' },
  { key: 'left', label: 'Left' },
  { key: 'right', label: 'Right' },
  { key: 'eo', label: 'EO' },
];

const RESET_BUTTON_CLASS = 'rounded-sm border border-neutral-600 px-2 py-1 text-xs text-neutral-200 transition-colors hover:border-primary-100 hover:text-primary-100 disabled:cursor-default disabled:border-neutral-700 disabled:text-neutral-600';

interface CubeAppearanceDialogProps {
  showStickerScaleAndFov: boolean;
  onClose: () => void;
}

export default function CubeAppearanceDialog({ showStickerScaleAndFov, onClose }: CubeAppearanceDialogProps) {
  const [activePicker, setActivePicker] = useState<keyof CubeColors | null>(null);
  const [cubeColors, setCubeColors, resetColors] = useCubeColors();
  const [elevation, setElevation] = useHintFaceletsElevation();
  const [stickerScale, setStickerScale] = useStickerScale();
  const [cameraFov, setCameraFov] = useCameraFov();

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const isColorsDefault = Object.entries(cubeColors).every(
    ([key, value]) => value === DEFAULT_CUBE_COLORS[key as keyof CubeColors]
  );

  const handleResetColors = () => {
    resetColors();
    setActivePicker(null);
  };

  return createPortal(
    <RemoveScroll>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-dark/75 p-3"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Cube appearance"
          className="flex max-h-full w-full max-w-md flex-col overflow-hidden rounded-sm border border-neutral-700 bg-dark text-primary-100 shadow-2xl landscape:max-w-3xl"
        >
          <div className="flex shrink-0 items-center justify-between border-b border-neutral-700 bg-primary-400 px-4 py-3 landscape:py-1.5">
            <h2 className="text-lg font-semibold text-dark">Cube Appearance</h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-neutral-600 px-3 py-2 text-sm text-primary-100 bg-primary-800 hover:bg-primary-700 transition-colors landscape:py-1"
            >
              Close
            </button>
          </div>

          <div className="flex min-h-0 flex-1 flex-col landscape:flex-row">
            <div className="shrink-0 border-b border-neutral-700 p-4 landscape:w-2/5 landscape:self-start landscape:border-b-0">
              <div className="overflow-hidden rounded-sm border border-neutral-600">
                <SettingsCubePreview
                  cubeColors={cubeColors}
                  elevation={elevation}
                  stickerScale={showStickerScaleAndFov ? stickerScale : 1}
                  cameraFov={showStickerScaleAndFov ? cameraFov : DEFAULT_CAMERA_FOV}
                />
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 landscape:border-l landscape:border-neutral-700">
              <div className="space-y-4">

                <div className="rounded-sm border border-neutral-700 bg-primary-800 p-4">
                  <div className="flex items-center justify-between">
                    <label htmlFor="appearance-hint-distance" className="text-sm font-semibold text-primary-100">Hint Facelet Distance</label>
                    <button
                      type="button"
                      onClick={() => setElevation(DEFAULT_HINT_FACELETS_ELEVATION)}
                      disabled={elevation === DEFAULT_HINT_FACELETS_ELEVATION}
                      className={RESET_BUTTON_CLASS}
                    >
                      Reset
                    </button>
                  </div>
                  <input
                    id="appearance-hint-distance"
                    type="range"
                    min={0}
                    max={6}
                    step={0.1}
                    value={elevation}
                    onChange={(e) => setElevation(parseFloat(e.target.value))}
                    className="mt-2 w-full cursor-pointer accent-primary-100"
                  />
                </div>

                {showStickerScaleAndFov && (
                  <>
                    <div className="rounded-sm border border-neutral-700 bg-primary-800 p-4">
                      <div className="flex items-center justify-between">
                        <label htmlFor="appearance-sticker-scale" className="text-sm font-semibold text-primary-100">Sticker Scale</label>
                        <button
                          type="button"
                          onClick={() => setStickerScale(DEFAULT_STICKER_SCALE)}
                          disabled={stickerScale === DEFAULT_STICKER_SCALE}
                          className={RESET_BUTTON_CLASS}
                        >
                          Reset
                        </button>
                      </div>
                      <input
                        id="appearance-sticker-scale"
                        type="range"
                        min={0}
                        max={1}
                        step={0.001}
                        value={sliderFromStickerScale(stickerScale)}
                        onChange={(e) => setStickerScale(stickerScaleFromSlider(parseFloat(e.target.value)))}
                        className="mt-2 w-full cursor-pointer accent-primary-100"
                      />
                    </div>

                    <div className="rounded-sm border border-neutral-700 bg-primary-800 p-4">
                      <div className="flex items-center justify-between">
                        <label htmlFor="appearance-camera-fov" className="text-sm font-semibold text-primary-100">Field of View</label>
                        <button
                          type="button"
                          onClick={() => setCameraFov(DEFAULT_CAMERA_FOV)}
                          disabled={cameraFov === DEFAULT_CAMERA_FOV}
                          className={RESET_BUTTON_CLASS}
                        >
                          Reset
                        </button>
                      </div>
                      <input
                        id="appearance-camera-fov"
                        type="range"
                        min={MIN_CAMERA_FOV}
                        max={MAX_CAMERA_FOV}
                        step={1}
                        value={cameraFov}
                        onChange={(e) => setCameraFov(parseFloat(e.target.value))}
                        className="mt-2 w-full cursor-pointer accent-primary-100"
                      />
                    </div>
                  </>
                )}

                <div className="rounded-sm border border-neutral-700 bg-primary-800 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-primary-100">Cube Colors</span>
                    <button type="button" onClick={handleResetColors} disabled={isColorsDefault} className={RESET_BUTTON_CLASS}>
                      Reset
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {FACE_LABELS.map(({ key, label }) => (
                      <div key={key} className="flex flex-col items-center">
                        <button
                          type="button"
                          onClick={() => setActivePicker(activePicker === key ? null : key)}
                          className={`h-9 w-9 rounded-sm border-2 transition-colors ${
                            activePicker === key
                              ? 'border-primary-100'
                              : 'border-neutral-600 hover:border-neutral-400'
                          }`}
                          style={{ backgroundColor: cubeColors[key] }}
                          title={`${label} face color`}
                        />
                        <span className="mt-1 text-xs text-neutral-400">{label}</span>
                      </div>
                    ))}
                  </div>
                  {activePicker && (
                    <div className="mt-3 max-w-75">
                      <div className="mb-2 text-xs text-neutral-400">
                        {FACE_LABELS.find(f => f.key === activePicker)?.label} Color
                      </div>
                      <HexColorPicker
                        color={cubeColors[activePicker]}
                        onChange={(color) => setCubeColors({ [activePicker]: color })}
                        style={{ width: '100%', height: '140px' }}
                      />
                      <input
                        type="text"
                        value={cubeColors[activePicker]}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
                            setCubeColors({ [activePicker]: val });
                          }
                        }}
                        className="mt-2 w-full rounded-sm border border-neutral-600 bg-dark/40 px-3 py-2 font-mono text-sm text-primary-100 outline-none focus:border-primary-100"
                        placeholder="#FFFFFF"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </RemoveScroll>,
    document.body,
  );
}
