'use client';

// Renders the step icon for a saved alg of any algset. F2L shows a greyscale pair, OLL a greyscale
// case grid, PLL the real-color grid with its case name centered, and anything we can't draw (yet)
// a small text box showing the algset label. Used by both YourAlgCard and the manual add row.

import { type AlgClassification } from '../../composables/algs/classifyAlg';
import { buildAlgIcon } from '../../composables/algs/algIcon';
import { type CubeColors } from '../../composables/useSettings';
import { type IconDescriptor, type SvgShape } from '../../composables/recon/stepIconDescriptors';

function renderShape(shape: SvgShape, i: number) {
  if (shape.type === 'rect')
    return <rect key={i} x={shape.x} y={shape.y} width={shape.width} height={shape.height} fill={shape.fill} />;
  if (shape.type === 'polygon') return <polygon key={i} points={shape.points} fill={shape.fill} />;
  return <circle key={i} cx={shape.cx} cy={shape.cy} r={shape.r} fill={shape.fill} />;
}

function IconSvg({ descriptor, title }: { descriptor: IconDescriptor; title: string }) {
  const [, , vw, vh] = descriptor.viewBox.split(' ').map(Number);
  return (
    <svg
      viewBox={descriptor.viewBox}
      className={`${descriptor.enlarge ? 'h-14 -m-0.5 md:group-hover/icon:h-20' : 'h-11 m-1 md:group-hover/icon:h-16'}
      w-fit shrink-0 transition-[height] duration-200 ease-out ${descriptor.transparentBg ? '' : 'bg-dark'}`}
      stroke="#52525b"
      strokeWidth={descriptor.strokeWidth ?? 1}
      fill="none"
    >
      {descriptor.shapes.map(renderShape)}
      {descriptor.label && (
        <text
          x={vw / 2}
          y={vh / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fill={descriptor.label.color}
          stroke="none"
          fontSize={descriptor.label.fontSize}
          fontWeight={descriptor.label.fontWeight}
          fontFamily="var(--font-Rubik), system-ui, sans-serif"
        >
          {descriptor.label.text}
        </text>
      )}
      <title>{title}</title>
    </svg>
  );
}

// text box shown for algsets without a graphic (unknown, multislot for now)
function TextIcon({ label }: { label: string }) {
  return (
    <div className="flex w-11 items-center justify-center m-1">
      <div
        title={label === '?' ? 'Unrecognized step' : label}
        className="flex h-6 w-fit px-2 py-2 items-center justify-center border border-neutral-400 bg-dark text-[10px] font-medium leading-none text-neutral-300"
      >
        <span>{label.slice(0, 6) || '?'}</span>
      </div>
    </div>
  );
}

interface AlgIconProps {
  classification: AlgClassification;
  alg: string;
  cubeColors: CubeColors;
}

export function AlgIcon({ classification, alg, cubeColors }: AlgIconProps) {
  const text = classification.label;
  const { descriptor, title } = buildAlgIcon(classification, alg, cubeColors);
  if (!descriptor) return <TextIcon label={text} />;
  return <IconSvg descriptor={descriptor} title={title} />;
}

export default AlgIcon;
