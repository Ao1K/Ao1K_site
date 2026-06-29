'use client';

import { useEffect, useRef, useState } from 'react';
import { useCubeColors } from '../../composables/useSettings';
import {
  crossIcon,
  simplePairIcon,
  type IconDescriptor,
  type SvgShape,
} from '../../composables/recon/stepIconDescriptors';
import {
  CROSS_OPTIONS,
  FACE_COLOR_NAME,
  pairsForCross,
  type FaceKey,
} from '../../composables/algs/cubePaint';
import CaretDownIcon from '../icons/dropdown';

// relative luminance test, matching IconStack's cross background logic
function isColorDark(hex: string): boolean {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5;
}

function renderShape(shape: SvgShape, i: number) {
  if (shape.type === 'rect')
    return <rect key={i} x={shape.x} y={shape.y} width={shape.width} height={shape.height} fill={shape.fill} />;
  if (shape.type === 'polygon') return <polygon key={i} points={shape.points} fill={shape.fill} />;
  return <circle key={i} cx={shape.cx} cy={shape.cy} r={shape.r} fill={shape.fill} />;
}

function IconSvg({ descriptor, className = '' }: { descriptor: IconDescriptor; className?: string }) {
  return (
    <svg
      viewBox={descriptor.viewBox}
      className={`w-9 h-9 border border-neutral-600 shrink-0 ${className}`}
      stroke="#52525b"
      strokeWidth="1"
      fill="none"
    >
      {descriptor.shapes.map(renderShape)}
    </svg>
  );
}

interface DropdownProps {
  open: boolean;
  onToggle: () => void;
  triggerIcon: React.ReactNode;
  children: React.ReactNode;
}

function Dropdown({ open, onToggle, triggerIcon, children }: DropdownProps) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-1 px-1.5 py-1 rounded-sm border border-neutral-600 bg-dark hover:border-neutral-500"
      >
        {triggerIcon}
        <CaretDownIcon className={`text-primary-100 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-50 left-0 top-full flex flex-col rounded-sm border border-neutral-600 bg-dark shadow-lg">
          {children}
        </div>
      )}
    </div>
  );
}

interface F2lDefaultsProps {
  cross: FaceKey;
  pair: [FaceKey, FaceKey];
  onCrossChange: (face: FaceKey) => void;
  onPairChange: (pair: [FaceKey, FaceKey]) => void;
}

const F2lDefaults = ({ cross, pair, onCrossChange, onPairChange }: F2lDefaultsProps) => {
  const [cubeColors] = useCubeColors();
  const [openMenu, setOpenMenu] = useState<'cross' | 'pair' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // close any open dropdown when clicking outside the selectors
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const crossBg = (color: string) => (isColorDark(color) ? '#ECE6EF' : '#161018');
  const crossDescriptor = (face: FaceKey) => crossIcon(cubeColors[face], crossBg(cubeColors[face]));
  const pairDescriptor = (a: FaceKey, b: FaceKey) => simplePairIcon(cubeColors[a], cubeColors[b]);

  const pairOptions = pairsForCross(cross);

  const handleSelectCross = (face: FaceKey) => {
    onCrossChange(face);
    setOpenMenu(null);
  };

  const handleSelectPair = (p: [FaceKey, FaceKey]) => {
    onPairChange(p);
    setOpenMenu(null);
  };

  const pairLabel = (a: FaceKey, b: FaceKey) => `${FACE_COLOR_NAME[a]}-${FACE_COLOR_NAME[b]}`;

  return (
    <div ref={containerRef} className="flex flex-row items-center gap-2">
      <div className="flex flex-row justify-start gap-2">
        <Dropdown
          open={openMenu === 'cross'}
          onToggle={() => setOpenMenu(openMenu === 'cross' ? null : 'cross')}
          triggerIcon={<IconSvg descriptor={crossDescriptor(cross)} />}
        >
          {CROSS_OPTIONS.map((face) => (
            <button
              key={face}
              type="button"
              title={FACE_COLOR_NAME[face]}
              onClick={() => handleSelectCross(face)}
              className="py-2 px-3 hover:bg-neutral-700"
            >
              <IconSvg descriptor={crossDescriptor(face)} className="" />
            </button>
          ))}
        </Dropdown>

        <Dropdown
          open={openMenu === 'pair'}
          onToggle={() => setOpenMenu(openMenu === 'pair' ? null : 'pair')}
          triggerIcon={<IconSvg descriptor={pairDescriptor(pair[0], pair[1])} />}
        >
          {pairOptions.map(([a, b]) => (
            <button
              key={`${a}-${b}`}
              type="button"
              title={pairLabel(a, b)}
              onClick={() => handleSelectPair([a, b])}
              className="py-2 px-3 hover:bg-neutral-700"
            >
              <IconSvg descriptor={pairDescriptor(a, b)} className="" />
            </button>
          ))}
        </Dropdown>
      </div>
    </div>
  );
};

export default F2lDefaults;
