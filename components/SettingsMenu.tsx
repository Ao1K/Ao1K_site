'use client';

import { useState, useEffect, useRef } from 'react';
import { HexColorPicker } from 'react-colorful';
import PhGear from './icons/settings';
import { useCubeColors, useShowControls, useHintFaceletsElevation, DEFAULT_HINT_FACELETS_ELEVATION, DEFAULT_CUBE_COLORS, type CubeColors } from '../composables/useSettings';

function GridIcon({ size }: { size: number }) {
  const edgeSize = 3;
  const cellSize = 6;
  const getPos = (i: number) => i === 0 ? 0 : i === 4 ? 21 : edgeSize + (i - 1) * cellSize;
  const getSize = (i: number) => (i === 0 || i === 4) ? edgeSize : cellSize;
  const gray = '#888';
  const bg = '#fff';
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      {Array.from({ length: 25 }, (_, k) => {
        const row = Math.floor(k / 5), col = k % 5;
        const isCorner = (row === 0 || row === 4) && (col === 0 || col === 4);
        return (
          <rect key={k} x={getPos(col)} y={getPos(row)} width={getSize(col)} height={getSize(row)}
            fill={isCorner ? 'transparent' : gray} />
        );
      })}
    </svg>
  );
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

interface SettingsMenuProps {
  page?: string; // Page identifier for namespacing settings (e.g., 'recon')
}

export default function SettingsMenu({ page = 'global' }: SettingsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activePicker, setActivePicker] = useState<keyof CubeColors | null>(null);
  const [cubeColors, setCubeColors, resetColors] = useCubeColors();
  const [showControls, setShowControls] = useShowControls();
  const [elevation, setElevation] = useHintFaceletsElevation();
  const menuRef = useRef<HTMLDivElement>(null);

  const handleClickOutside = (event: MouseEvent | TouchEvent) => {
    if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
      setIsOpen(false);
      setActivePicker(null);
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleColorChange = (face: keyof CubeColors, color: string) => {
    setCubeColors({ [face]: color });
  };

  const handleSwatchClick = (face: keyof CubeColors) => {
    setActivePicker(activePicker === face ? null : face);
  };

  const handleResetColors = () => {
    resetColors();
    setActivePicker(null);
  };

  const isDefault = Object.entries(cubeColors).every(
    ([key, value]) => value === DEFAULT_CUBE_COLORS[key as keyof CubeColors]
  );

  const handleToggleControls = () => {
    setShowControls(!showControls);
  };

  return (
    <div ref={menuRef} className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center p-1 rounded group w-12 h-12 transition-colors"
        title="Settings"
      >
        <PhGear className="text-light_accent w-8 h-8 group-hover:bg-primary-100" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-14 bg-white border border-primary-300 rounded-sm shadow-lg z-50 min-w-[250px]">
          {/* Show Controls Toggle */}
          <div className="px-3 py-2 border-b border-primary-200">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm font-semibold text-light_accent">Show Player Controls</span>
              <input
                type="checkbox"
                checked={showControls}
                onChange={handleToggleControls}
                className="ml-2 w-4 h-4 cursor-pointer"
              />
            </label>
          </div>

          {/* Hint Facelets Elevation Slider */}
          <div className="px-3 py-2 border-b border-primary-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-light_accent">Hint Facelet Distance</span>
              <button
                onClick={() => setElevation(DEFAULT_HINT_FACELETS_ELEVATION)}
                disabled={elevation === DEFAULT_HINT_FACELETS_ELEVATION}
                className={`text-xs px-2 py-0.5 rounded-sm transition-colors ${
                  elevation === DEFAULT_HINT_FACELETS_ELEVATION
                    ? 'text-gray-400'
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                Reset
              </button>
            </div>
            <input
              type="range"
              min={0}
              max={6}
              step={0.1}
              value={elevation}
              onChange={(e) => setElevation(parseFloat(e.target.value))}
              className="w-full h-2 mt-1 accent-primary-500 cursor-pointer"
            />
          </div>

          <div className="flex flex-row items-center mb-2">
            <div className="text-sm font-semibold text-light_accent p-3 w-auto">Cube Colors</div>
            {/* Restore Defaults button */}
            <button
              onClick={handleResetColors}
              disabled={isDefault}
              className={`py-2 px-3 text-sm rounded-sm w-auto transition-colors ${
                isDefault
                  ? 'bg-gray-100 text-gray-400'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Restore Defaults
            </button>
          </div>
          {/* 2x3 grid of color swatches - opposite colors next to each other */}
          <div className="grid grid-cols-2 gap-3 mb-4 mx-10">
            {FACE_LABELS.map(({ key, label }) => (
              <div key={key} className="flex flex-col items-center">
                <button
                  onClick={() => handleSwatchClick(key)}
                  className={`w-10 h-10 rounded-sm border-2 transition-all ${
                    activePicker === key 
                      ? 'border-primary-500 ring-2 ring-primary-200' 
                      : 'border-primary-300 hover:border-primary-400'
                  }`}
                  style={{ backgroundColor: cubeColors[key] }}
                  title={`${label} face color`}
                />
                <span className="text-xs text-primary-600 mt-1">{label}</span>
              </div>
            ))}
          </div>

          {/* Color picker popover */}
          {activePicker && (
            <div className="mb-4 mx-4">
              <div className="text-xs text-primary-500 mb-2">
                {FACE_LABELS.find(f => f.key === activePicker)?.label} Color
              </div>
              <HexColorPicker
                color={cubeColors[activePicker]}
                onChange={(color) => handleColorChange(activePicker, color)}
                style={{ width: '100%', height: '150px'}}
              />
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="text"
                  value={cubeColors[activePicker]}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
                      handleColorChange(activePicker, val);
                    }
                  }}
                  className="flex-1 px-2 py-1 text-sm border border-primary-300 rounded-sm font-mono"
                  placeholder="#FFFFFF"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
