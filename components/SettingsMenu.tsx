'use client';

import { useState, useEffect, useRef } from 'react';
import { HexColorPicker } from 'react-colorful';
import PhGear, { PhGearFill } from './icons/settings';
import { useCubeColors, useShowControls, useShowSplits, useHintFaceletsElevation, useAlgsets, useHandedness, ALGSET_OPTIONS, DEFAULT_HINT_FACELETS_ELEVATION, DEFAULT_CUBE_COLORS, type CubeColors, type AlgsetDict } from '../composables/useSettings';

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
  const [showSplits, setShowSplits] = useShowSplits();
  const [elevation, setElevation] = useHintFaceletsElevation();
  const [algsets, setAlgsets] = useAlgsets();
  const [handedness, setHandedness] = useHandedness();
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

  const handleToggleAlgset = <K extends keyof AlgsetDict>(category: K, option: AlgsetDict[K][number]) => {
    const current = algsets[category];
    const next = current.includes(option)
      ? current.filter((o) => o !== option)
      : [...current, option];
    setAlgsets({ ...algsets, [category]: next });
  };

  const handleToggleCategory = <K extends keyof AlgsetDict>(category: K) => {
    const options = ALGSET_OPTIONS[category];
    const allSelected = options.every((o) => (algsets[category] as readonly string[]).includes(o));
    setAlgsets({ ...algsets, [category]: allSelected ? [] : [...options] });
  };

  return (
    <div ref={menuRef} id="settings-menu-container" className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center p-1 group gear w-12 h-12 relative"
        title="Settings"
      >
        <PhGear className="text-light_accent w-8 h-8 absolute z-10" />
        <PhGearFill className={`group-hover:text-primary-100 w-8 h-8  ${isOpen ? "text-primary-100" : "text-primary-200"} absolute z-0  transition-colors`}/>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-14 bg-primary-100 border border-primary-300 rounded-sm shadow-lg z-50 min-w-62.5">
          {/* recon-only settings; the algs page omits player controls and splits */}
          {page === 'recon' && (
          <>
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

          {/* Show Splits Toggle */}
          <div className="px-3 py-2 border-b border-primary-200">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-sm font-semibold text-light_accent">Show Splits</span>
              <input
                type="checkbox"
                checked={showSplits}
                onChange={() => setShowSplits(!showSplits)}
                className="ml-2 w-4 h-4 cursor-pointer"
              />
            </label>
          </div>

          {/* Handedness Switch */}
          <div className="px-3 py-2 border-b border-primary-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-light_accent">Handedness</span>
              <div className="flex rounded-sm overflow-hidden border border-primary-300">
                <button
                  onClick={() => setHandedness('left')}
                  className={`px-3 py-1 text-xs font-semibold transition-colors ${
                    handedness === 'left'
                      ? 'bg-neutral-700 text-primary-100'
                      : 'bg-primary-100 text-dark hover:bg-neutral-300'
                  }`}
                >
                  Lefty
                </button>
                <button
                  onClick={() => setHandedness('right')}
                  className={`px-3 py-1 text-xs font-semibold transition-colors ${
                    handedness === 'right'
                      ? 'bg-neutral-700 text-primary-100'
                      : 'bg-primary-100 text-dark hover:bg-neutral-300'
                  }`}
                >
                  Righty
                </button>
              </div>
            </div>
          </div>

          <div className="px-3 py-2 border-b border-primary-200">
            <span className="text-sm font-semibold text-light_accent">Algsets</span>
            <div className="grid grid-cols-[auto_1fr] gap-x-0 gap-y-2 mt-2">
              {(Object.keys(ALGSET_OPTIONS) as (keyof AlgsetDict)[]).map((category) => {
                const options = ALGSET_OPTIONS[category];
                const selected = algsets[category] as readonly string[];
                const allSelected = options.every((o) => selected.includes(o));
                const someSelected = !allSelected && options.some((o) => selected.includes(o));
                return (
                  <div key={category} className="contents">
                    <label className="flex items-center gap-2 cursor-pointer select-none rounded-l-sm border border-primary-300 bg-primary-200/40 px-3 py-2">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={(el) => { if (el) el.indeterminate = someSelected; }}
                        onChange={() => handleToggleCategory(category)}
                        className="w-4 h-4 cursor-pointer"
                      />
                      <span className="text-xs font-semibold text-primary-600">{category}</span>
                    </label>
                    <div className="flex flex-row flex-wrap items-center gap-3 rounded-r-sm border border-l-0 border-primary-300 bg-primary-200/40 px-3 py-2">
                      {options.map((option) => (
                        <label key={option} className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selected.includes(option)}
                            onChange={() => handleToggleAlgset(category, option)}
                            className="w-3.5 h-3.5 cursor-pointer"
                          />
                          <span className="text-xs text-primary-600">{option.toUpperCase()}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          </>
          )}

          {/* Hint Facelets Elevation Slider — shown on both the recon and algs cubes */}
          <div className="px-3 py-2 border-b border-primary-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-light_accent">Hint Facelet Distance</span>
              <button
                onClick={() => setElevation(DEFAULT_HINT_FACELETS_ELEVATION)}
                disabled={elevation === DEFAULT_HINT_FACELETS_ELEVATION}
                className={`text-sm px-2 py-1 rounded-sm w-auto transition-colors ${
                  elevation === DEFAULT_HINT_FACELETS_ELEVATION
                    ? 'bg-primary-100 text-neutral-400'
                    : 'bg-primary-200 text-neutral-700 hover:bg-primary-300'
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

          <div className="flex flex-row items-center justify-between mb-2">
            <div className="text-sm font-semibold text-light_accent p-3 w-auto">Cube Colors</div>
            {/* Reset button */}
            <button
              onClick={handleResetColors}
              disabled={isDefault}
              className={`py-1 px-2 mr-3 text-sm rounded-sm w-auto transition-colors ${
                isDefault
                  ? 'bg-primary-100 text-neutral-400'
                  : 'bg-primary-200 text-neutral-700 hover:bg-primary-300'
              }`}
            >
              Reset
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
