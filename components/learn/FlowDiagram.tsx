export type FlowNode = {
  label: string;
  x: number;
  y: number;
};

export type FlowArrow<K extends string> = readonly [from: K, to: K];

type FlowAlign = "center" | "left";

type FlowBox = {
  left: number;
  right: number;
  anchorX: number;
};

const LABEL_CHAR_WIDTH = 7.2;
const LABEL_PADDING_X = 14;
const BOX_HALF_HEIGHT = 17;
const BOX_CORNER_RADIUS = 9;
const ARROW_HEAD_GAP = 9;
const LEFT_ALIGNED_ARROW_INSET = 40;

function boxWidth(label: string) {
  return label.length * LABEL_CHAR_WIDTH + LABEL_PADDING_X * 2;
}

function flowBox(node: FlowNode, align: FlowAlign): FlowBox {
  const width = boxWidth(node.label);
  if (align === "left") {
    return { left: node.x, right: node.x + width, anchorX: node.x + LEFT_ALIGNED_ARROW_INSET };
  }
  return { left: node.x - width / 2, right: node.x + width / 2, anchorX: node.x };
}

function distanceToBoxEdge(box: FlowBox, unitX: number, unitY: number) {
  const roomToSide = unitX > 0 ? box.right - box.anchorX : box.anchorX - box.left;
  const horizontal = unitX === 0 ? Infinity : roomToSide / Math.abs(unitX);
  const vertical = unitY === 0 ? Infinity : BOX_HALF_HEIGHT / Math.abs(unitY);
  return Math.min(horizontal, vertical);
}

function arrowLine(from: FlowNode, to: FlowNode, align: FlowAlign) {
  const fromBox = flowBox(from, align);
  const toBox = flowBox(to, align);
  const length = Math.hypot(toBox.anchorX - fromBox.anchorX, to.y - from.y);
  const unitX = (toBox.anchorX - fromBox.anchorX) / length;
  const unitY = (to.y - from.y) / length;
  const startOffset = distanceToBoxEdge(fromBox, unitX, unitY) + ARROW_HEAD_GAP;
  const endOffset = distanceToBoxEdge(toBox, -unitX, -unitY) + ARROW_HEAD_GAP;
  return {
    x1: fromBox.anchorX + unitX * startOffset,
    y1: from.y + unitY * startOffset,
    x2: toBox.anchorX - unitX * endOffset,
    y2: to.y - unitY * endOffset,
  };
}

export default function FlowDiagram<K extends string>({
  id,
  width,
  height,
  nodes,
  arrows,
  ariaLabel,
  align = "center",
}: {
  id: string;
  width: number;
  height: number;
  nodes: Record<K, FlowNode>;
  arrows: readonly FlowArrow<K>[];
  ariaLabel: string;
  align?: FlowAlign;
}) {
  const markerId = `${id}-arrow`;
  const nodeList: FlowNode[] = Object.values(nodes);

  return (
    <figure className="mb-4 flex justify-start">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-sm" role="img" aria-label={ariaLabel}>
        <defs>
          <marker
            id={markerId}
            viewBox="0 0 6 6"
            refX={5}
            refY={3}
            markerWidth={5}
            markerHeight={5}
            orient="auto"
          >
            <path d="M0,0 L6,3 L0,6 z" className="fill-dark_accent" />
          </marker>
        </defs>
        {arrows.map(([from, to]) => (
          <line
            key={`${from}-${to}`}
            {...arrowLine(nodes[from], nodes[to], align)}
            className="stroke-dark_accent"
            strokeWidth={2}
            strokeLinecap="round"
            markerEnd={`url(#${markerId})`}
          />
        ))}
        {nodeList.map((node) => {
          const box = flowBox(node, align);
          return (
            <g key={node.label}>
              <rect
                x={box.left}
                y={node.y - BOX_HALF_HEIGHT}
                width={box.right - box.left}
                height={BOX_HALF_HEIGHT * 2}
                rx={BOX_CORNER_RADIUS}
                className="fill-primary-700 stroke-primary-500"
                strokeWidth={1.5}
              />
              <text
                x={(box.left + box.right) / 2}
                y={node.y + 5}
                textAnchor="middle"
                className="fill-primary-100 text-md"
              >
                {node.label}
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}
