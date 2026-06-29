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

function IconSvg({ descriptor, showName, title }: { descriptor: IconDescriptor; showName: boolean; title: string }) {
  const [, , vw, vh] = descriptor.viewBox.split(' ').map(Number);
  return (
    <svg
      viewBox={descriptor.viewBox}
      className={`h-11 m-1 w-fit shrink-0 border border-neutral-400 bg-dark`}
      stroke="#52525b"
      strokeWidth="1"
      fill="none"
    >
      {descriptor.shapes.map(renderShape)}
      {showName && descriptor.name && (
        <text
          x={vw / 2}
          y={vh / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fill={descriptor.nameColor || '#ECE6EF'}
          stroke="none"
          fontSize={descriptor.name.length <= 2 ? 10 : 8}
          fontWeight="bold"
          fontFamily="var(--font-Rubik), system-ui, sans-serif"
        >
          {descriptor.name}
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
        className="flex h-6 w-fit px-2 py-2 items-center shrink-0  border border-neutral-400 bg-dark text-[10px] font-medium leading-none text-neutral-300"
      >
        {label.slice(0, 6) || '?'}
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
  const { descriptor, showName } = buildAlgIcon(classification, alg, cubeColors);
  if (!descriptor) return <TextIcon label={text} />;
  return (
  <div className={``}>
    <IconSvg descriptor={descriptor} showName={showName} title={text} />
  </div>
  )
}

export default AlgIcon;
