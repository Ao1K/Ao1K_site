import type { ReactNode } from 'react';
import { type StepInfo } from './SimpleCubeInterpreter';
import { getStepIconDescriptor, OG_COLOR_CONFIG, type IconDescriptor, type SvgShape } from './stepIconDescriptors';

// re-export Grid so existing imports keep working
export type { Grid } from './stepIconDescriptors';

type CreateElement = (type: string, props: Record<string, unknown> | null, ...children: ReactNode[]) => ReactNode;

function shapeToElement(shape: SvgShape, h: CreateElement): ReactNode {
  if (shape.type === 'rect') return h('rect', { x: shape.x, y: shape.y, width: shape.width, height: shape.height, fill: shape.fill });
  if (shape.type === 'polygon') return h('polygon', { points: shape.points, fill: shape.fill });
  return h('circle', { cx: shape.cx, cy: shape.cy, r: shape.r, fill: shape.fill });
}

function descriptorToElements(desc: IconDescriptor, size: number, h: CreateElement): ReactNode {
  const children = desc.shapes.map(shape => shapeToElement(shape, h));
  // outer border rect for Satori rendering, sized to match viewBox
  const [vx, vy, vw, vh] = desc.viewBox.split(' ').map(Number);
  const borderColor = desc.eoBorderColor || '#52525b';
  const borderWidth = desc.eoBorderColor ? 2 : 1;
  children.push(h('rect', { x: vx, y: vy, width: vw, height: vh, fill: 'none', stroke: borderColor, 'stroke-width': borderWidth }));
  const svg = h('svg', { viewBox: desc.viewBox, width: size, height: size, stroke: '#52525b', 'stroke-width': 1, fill: 'none' }, ...children);
  // satori doesn't support SVG <text>, so overlay a positioned HTML div instead
  if (desc.label) {
    return h('div', { style: { position: 'relative', width: size, height: size, flexShrink: 0, display: 'flex' } },
      svg,
      h('div', {
        style: {
          position: 'absolute',
          top: 0,
          left: 0,
          width: size,
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: desc.label.color,
          fontSize: desc.label.fontSize * size / vw,
          fontWeight: desc.label.fontWeight,
          fontFamily: 'Rubik, system-ui, sans-serif',
        },
      }, desc.label.text)
    );
  }
  return svg;
}

// generates step icon as JSX element tree for use with Satori/ImageResponse
export function createStepIcon(
  data: StepInfo,
  size: number,
  createElement: CreateElement,
  hasEO?: boolean
): ReactNode {
  const eoColor = hasEO ? '#FF00FF' : undefined;
  const descriptor = getStepIconDescriptor(OG_COLOR_CONFIG, data, { eoColor });
  // empty icon (no shapes, no EO border) — render blank, like IconStack does
  if (descriptor.shapes.length === 0 && !descriptor.eoBorderColor) return null;
  return descriptorToElements(descriptor, size, createElement);
}

