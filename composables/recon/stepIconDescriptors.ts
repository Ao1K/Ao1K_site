import { type StepInfo, type BlockPattern, type LSEPattern, type F2LDirection } from './SimpleCubeInterpreter';

export type Grid = number[][];

// renderer-agnostic shape descriptors
export type SvgRect = { type: 'rect'; x: number; y: number; width: number; height: number; fill: string };
export type SvgPolygon = { type: 'polygon'; points: string; fill: string };
export type SvgCircle = { type: 'circle'; cx: number; cy: number; r: number; fill: string };
export type SvgShape = SvgRect | SvgPolygon | SvgCircle;

export interface IconDescriptor {
  viewBox: string;
  shapes: SvgShape[];
  eoBorderColor?: string;
  name?: string;
  nameColor?: string;
}

// parameterized color palette - 6 face colors + utility colors
export interface ColorConfig {
  up: string;
  down: string;
  front: string;
  back: string;
  right: string;
  left: string;
  gray: string;
  darkBg: string;
}

export interface IconOptions {
  // for cross icon: compute background from the cross color (e.g. luminance-based contrast)
  // if not provided, darkBg is used
  getCrossBg?: (crossColor: string) => string;
  eoColor?: string;
}

// hardcoded colors for OG/Satori backend rendering
export const OG_COLOR_CONFIG: ColorConfig = {
  up: '#FFFFFF',
  down: '#EEFF00',
  front: '#0CEC00',
  back: '#0085FF',
  right: '#FF0000',
  left: '#FF7F00',
  gray: '#888888',
  darkBg: '#161018',
};

const owlIcon: IconDescriptor = {
  viewBox: '0 0 24 24',
  shapes: [
    // body
    { type: 'circle', cx: 12, cy: 16, r: 7, fill: '#8B6914' },
    // head
    { type: 'circle', cx: 12, cy: 9, r: 6, fill: '#8B6914' },
    // ear tufts
    { type: 'polygon', points: '6.5,5 8.5,1 10.5,5', fill: '#6B4F12' },
    { type: 'polygon', points: '13.5,5 15.5,1 17.5,5', fill: '#6B4F12' },
    // belly patch
    { type: 'circle', cx: 12, cy: 17, r: 4, fill: '#D4A843' },
    // eyes
    { type: 'circle', cx: 9.5, cy: 8.5, r: 2.8, fill: '#FFFFFF' },
    { type: 'circle', cx: 14.5, cy: 8.5, r: 2.8, fill: '#FFFFFF' },
    // pupils
    { type: 'circle', cx: 10, cy: 8.5, r: 1.3, fill: '#1A1A1A' },
    { type: 'circle', cx: 14, cy: 8.5, r: 1.3, fill: '#1A1A1A' },
    // beak
    { type: 'polygon', points: '11,11 13,11 12,13', fill: '#FF8C00' },
    // feet
    { type: 'polygon', points: '9,22 8,24 11,24', fill: '#FF8C00' },
    { type: 'polygon', points: '15,22 13,24 16,24', fill: '#FF8C00' },
  ],
};

// map color names (from StepInfo.colors) to hex values using a color config
function resolveColors(names: string[], config: ColorConfig): string[] {
  const map: Record<string, string> = {
    'white': config.up,
    'yellow': config.down,
    'green': config.front,
    'blue': config.back,
    'red': config.right,
    'orange': config.left,
  };
  return names.map(name => map[name.toLowerCase()] || config.gray);
}

// build opposite-color lookup from config
function getOpposites(config: ColorConfig): Record<string, string> {
  return {
    [config.up]: config.down,
    [config.down]: config.up,
    [config.front]: config.back,
    [config.back]: config.front,
    [config.right]: config.left,
    [config.left]: config.right,
  };
}

// determine if a hex color is dark based on relative luminance
function isColorDark(hex: string): boolean {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5;
}

// map grid numbers (1-6) to face colors
function gridColorMap(config: ColorConfig): Record<number, string> {
  return {
    1: config.up,
    2: config.down,
    3: config.front,
    4: config.back,
    5: config.right,
    6: config.left,
  };
}

// --- individual icon builders ---

function crossIcon(crossColor: string, bg: string): IconDescriptor {
  return {
    viewBox: '0 0 24 24',
    shapes: [
      { type: 'rect', x: 0, y: 0, width: 8, height: 8, fill: bg },
      { type: 'rect', x: 8, y: 0, width: 8, height: 8, fill: crossColor },
      { type: 'rect', x: 16, y: 0, width: 8, height: 8, fill: bg },
      { type: 'rect', x: 0, y: 8, width: 8, height: 8, fill: crossColor },
      { type: 'rect', x: 8, y: 8, width: 8, height: 8, fill: crossColor },
      { type: 'rect', x: 16, y: 8, width: 8, height: 8, fill: crossColor },
      { type: 'rect', x: 0, y: 16, width: 8, height: 8, fill: bg },
      { type: 'rect', x: 8, y: 16, width: 8, height: 8, fill: crossColor },
      { type: 'rect', x: 16, y: 16, width: 8, height: 8, fill: bg },
    ],
  };
}

function eoLineIcon(step: string, lineColors: string[], bg: string): IconDescriptor {
  const lineColor = lineColors[0];
  const isVertical = step === 'v-eoLine';
  if (isVertical) {
    // vertical line - middle column colored
    return {
      viewBox: '0 0 24 24',
      shapes: [
        { type: 'rect', x: 0,  y: 0,  width: 8, height: 8, fill: bg },
        { type: 'rect', x: 8,  y: 0,  width: 8, height: 8, fill: lineColor },
        { type: 'rect', x: 16, y: 0,  width: 8, height: 8, fill: bg },
        { type: 'rect', x: 0,  y: 8,  width: 8, height: 8, fill: bg },
        { type: 'rect', x: 8,  y: 8,  width: 8, height: 8, fill: lineColor },
        { type: 'rect', x: 16, y: 8,  width: 8, height: 8, fill: bg },
        { type: 'rect', x: 0,  y: 16, width: 8, height: 8, fill: bg },
        { type: 'rect', x: 8,  y: 16, width: 8, height: 8, fill: lineColor },
        { type: 'rect', x: 16, y: 16, width: 8, height: 8, fill: bg },
      ],
    };
  } else {
    // horizontal line - middle row colored
    return {
      viewBox: '0 0 24 24',
      shapes: [
        { type: 'rect', x: 0,  y: 0,  width: 8, height: 8, fill: bg },
        { type: 'rect', x: 8,  y: 0,  width: 8, height: 8, fill: bg },
        { type: 'rect', x: 16, y: 0,  width: 8, height: 8, fill: bg },
        { type: 'rect', x: 0,  y: 8,  width: 8, height: 8, fill: lineColor },
        { type: 'rect', x: 8,  y: 8,  width: 8, height: 8, fill: lineColor },
        { type: 'rect', x: 16, y: 8,  width: 8, height: 8, fill: lineColor },
        { type: 'rect', x: 0,  y: 16, width: 8, height: 8, fill: bg },
        { type: 'rect', x: 8,  y: 16, width: 8, height: 8, fill: bg },
        { type: 'rect', x: 16, y: 16, width: 8, height: 8, fill: bg },
      ],
    };
  }
}

function xcrossIcon(primaryColors: string[], step: string, config: ColorConfig): IconDescriptor {
  const crossColor = primaryColors[0];
  const frontColor = primaryColors[1];
  const rightColor = primaryColors[2];
  const gray = config.gray;

  const opposites = getOpposites(config);
  const backColorHex = Object.entries(opposites).find(([, opp]) => opp === frontColor)?.[0] ?? null;
  const leftColorHex = Object.entries(opposites).find(([, opp]) => opp === rightColor)?.[0] ?? null;

  const backColorCount = backColorHex ? primaryColors.filter(c => c === backColorHex).length : 0;
  const leftColorCount = leftColorHex ? primaryColors.filter(c => c === leftColorHex).length : 0;
  const frontColorCount = primaryColors.filter(c => c === frontColor).length;
  const rightColorCount = primaryColors.filter(c => c === rightColor).length;

  const numberXs = step.length - 'cross'.length;
  const isBackXCrossSolved = (() => {
    if (numberXs === 2) return backColorCount > 0 && leftColorCount > 0;
    if (numberXs === 3) {
      const sorted = [backColorCount, leftColorCount].sort((a, b) => a - b);
      return sorted[0] === 1 && sorted[1] === 2;
    }
    return numberXs >= 4;
  })();
  const isRightXCrossSolved = (() => {
    if (numberXs === 2 || numberXs === 3) return rightColorCount === 2;
    return numberXs >= 4;
  })();
  const isLeftXCrossSolved = (() => {
    if (numberXs === 2 || numberXs === 3) return frontColorCount === 2;
    return numberXs >= 4;
  })();

  return {
    viewBox: '-15 -19 30 30',
    shapes: [
      // background
      { type: 'rect', x: -15, y: -19, width: 30, height: 30, fill: config.darkBg },
      // top face cross
      { type: 'polygon', points: '0,0 5,-3 0,-6 -5,-3', fill: crossColor },
      { type: 'polygon', points: '5,-3 0,-6 5,-9 10,-6', fill: crossColor },
      { type: 'polygon', points: '-5,-3 0,-6 -5,-9 -10,-6', fill: crossColor },
      { type: 'polygon', points: '0,-6 5,-9 0,-12 -5,-9', fill: crossColor },
      { type: 'polygon', points: '-5,-9 0,-12 -5,-15 -10,-12', fill: crossColor },
      { type: 'polygon', points: '5,-9 10,-12 5,-15 0,-12', fill: crossColor },
      // top face corners
      { type: 'polygon', points: '0,-12 5,-15 0,-18 -5,-15', fill: isBackXCrossSolved ? crossColor : gray },
      { type: 'polygon', points: '10,-6 15,-9 10,-12 5,-9', fill: isRightXCrossSolved ? crossColor : gray },
      { type: 'polygon', points: '-10,-6 -5,-9 -10,-12 -15,-9', fill: isLeftXCrossSolved ? crossColor : gray },
      // front face
      { type: 'polygon', points: '0,0 -5,-3 -5,2 0,5', fill: frontColor },
      { type: 'polygon', points: '0,5 -5,2 -5,7 0,10', fill: frontColor },
      { type: 'polygon', points: '-5,-3 -10,-6 -10,-1 -5,2', fill: frontColor },
      { type: 'polygon', points: '-5,2 -10,-1 -10,4 -5,7', fill: frontColor },
      { type: 'polygon', points: '-10,-1 -15,-4 -15,1 -10,4', fill: isLeftXCrossSolved ? frontColor : gray },
      { type: 'polygon', points: '-10,-6 -15,-9 -15,-4 -10,-1', fill: isLeftXCrossSolved ? frontColor : gray },
      { type: 'polygon', points: '-10,4 -15,1 -15,6 -10,9', fill: gray },
      { type: 'polygon', points: '-5,7 -10,4 -10,9 -5,12', fill: gray },
      { type: 'polygon', points: '0,10 -5,7 -5,12 0,15', fill: gray },
      // right face
      { type: 'polygon', points: '0,0 5,-3 5,2 0,5', fill: rightColor },
      { type: 'polygon', points: '0,5 5,2 5,7 0,10', fill: rightColor },
      { type: 'polygon', points: '5,-3 10,-6 10,-1 5,2', fill: rightColor },
      { type: 'polygon', points: '5,2 10,-1 10,4 5,7', fill: rightColor },
      { type: 'polygon', points: '10,-1 15,-4 15,1 10,4', fill: isRightXCrossSolved ? rightColor : gray },
      { type: 'polygon', points: '10,-6 15,-9 15,-4 10,-1', fill: isRightXCrossSolved ? rightColor : gray },
      { type: 'polygon', points: '10,4 15,1 15,6 10,9', fill: gray },
      { type: 'polygon', points: '5,7 10,4 10,9 5,12', fill: gray },
      { type: 'polygon', points: '0,10 5,7 5,12 0,15', fill: gray },
    ],
  };
}

// maps direction pairs to triangle layout and knockout corner
type PairLayout = {
  // points for the two triangles [topLeft, bottomRight]
  triangles: [string, string];
  // position of the knockout rect (opposite corner from the slot)
  knockout: { x: number; y: number };
};

const pairLayouts: Record<string, PairLayout> = {
  // diagonal from bottom-left to top-right (default)
  // triangle 0 = top-left, triangle 1 = bottom-right
  'front,left': { triangles: ['0,0 24,0 0,24', '24,0 24,24 0,24'], knockout: { x: 16, y: 0 } },   // FL slot → knockout BR
  'back,right': { triangles: ['0,0 24,0 0,24', '24,0 24,24 0,24'], knockout: { x: 0, y: 16 } },   // BR slot → knockout FL
  // diagonal from bottom-right to top-left
  // triangle 0 = top-right, triangle 1 = bottom-left
  'front,right': { triangles: ['0,0 24,0 24,24', '0,0 24,24 0,24'], knockout: { x: 0, y: 0 } },   // FR slot → knockout BL
  'back,left': { triangles: ['0,0 24,0 24,24', '0,0 24,24 0,24'], knockout: { x: 16, y: 16 } },   // BL slot → knockout FR
};

// maps a sorted direction key to the quadrant offset in the multislot 2x2 grid
const slotQuadrant: Record<string, { x: number; y: number }> = {
  'front,left':  { x: 0,  y: 12 },  // FL → bottom-left
  'front,right': { x: 12, y: 12 },  // FR → bottom-right
  'back,left':   { x: 0,  y: 0  },  // BL → top-left
  'back,right':  { x: 12, y: 0  },  // BR → top-right
};

// generates pair shapes (two triangles + knockout) at a given offset and size
function pairShapes(
  f2lDirections: Partial<Record<F2LDirection, string>> | undefined,
  config: ColorConfig,
  size: number,
  ox: number,
  oy: number,
): SvgShape[] {
  const dirs = f2lDirections ? (Object.keys(f2lDirections) as F2LDirection[]).sort().join(',') : 'front,left';
  const layout = pairLayouts[dirs] || pairLayouts['front,left'];

  const nameToHex = (name: string) => {
    const map: Record<string, string> = {
      'white': config.up, 'yellow': config.down,
      'green': config.front, 'blue': config.back,
      'red': config.right, 'orange': config.left,
    };
    return map[name.toLowerCase()] || config.gray;
  };

  let color0: string, color1: string;
  if (f2lDirections) {
    switch (dirs) {
      case 'front,left':
        color0 = nameToHex(f2lDirections['left']!);
        color1 = nameToHex(f2lDirections['front']!);
        break;
      case 'back,right':
        color0 = nameToHex(f2lDirections['back']!);
        color1 = nameToHex(f2lDirections['right']!);
        break;
      case 'front,right':
        color0 = nameToHex(f2lDirections['right']!);
        color1 = nameToHex(f2lDirections['front']!);
        break;
      case 'back,left':
        color0 = nameToHex(f2lDirections['back']!);
        color1 = nameToHex(f2lDirections['left']!);
        break;
      default:
        color0 = config.gray;
        color1 = config.gray;
        break;
    }
  } else {
    color0 = config.gray;
    color1 = config.gray;
  }

  // scale triangle points from 0-24 space to offset+size space
  const scalePoints = (pts: string) =>
    pts.split(' ').map(p => {
      const [x, y] = p.split(',').map(Number);
      return `${ox + (x / 24) * size},${oy + (y / 24) * size}`;
    }).join(' ');

  const koScale = (8 / 24) * size;
  const ko = layout.knockout;

  return [
    { type: 'polygon', points: scalePoints(layout.triangles[0]), fill: color0 },
    { type: 'polygon', points: scalePoints(layout.triangles[1]), fill: color1 },
    { type: 'rect', x: ox + (ko.x / 24) * size, y: oy + (ko.y / 24) * size, width: koScale, height: koScale, fill: config.darkBg },
  ];
}

function pairIcon(
  f2lSlotList: Partial<Record<F2LDirection, string>>[] | undefined,
  config: ColorConfig,
): IconDescriptor {
  return {
    viewBox: '0 0 24 24',
    shapes: pairShapes(f2lSlotList?.[0], config, 24, 0, 0),
  };
}

function multislotIcon(
  f2lSlotList: Partial<Record<F2LDirection, string>>[] | undefined,
  config: ColorConfig,
): IconDescriptor {
  const shapes: SvgShape[] = [];
  const subSize = 12;

  if (f2lSlotList && f2lSlotList.length > 0) {
    for (const slot of f2lSlotList) {
      const dirs = (Object.keys(slot) as F2LDirection[]).sort().join(',');
      const quad = slotQuadrant[dirs] || { x: 0, y: 0 };
      shapes.push(...pairShapes(slot, config, subSize, quad.x, quad.y));
    }
  } else {
    // fallback: fill all four quadrants with gray
    shapes.push({ type: 'rect', x: 0, y: 0, width: 24, height: 24, fill: config.gray });
  }

  return {
    viewBox: '0 0 24 24',
    shapes,
  };
}

function lastLayerIcon(pattern: Grid, config: ColorConfig, name?: string, nameType?: 'oll' | 'pll'): IconDescriptor {
  const colorMap = gridColorMap(config);
  const getCellColor = (row: number, col: number): string => {
    if (!pattern[row] || pattern[row][col] === undefined) return config.darkBg;
    return colorMap[pattern[row][col]] || config.darkBg;
  };

  // 5x5 grid: thin edges (3px) and thick center cells (6px)
  // total: 3 + 6 + 6 + 6 + 3 = 24
  const edgeSize = 3;
  const cellSize = 6;
  const getPos = (i: number) => i === 0 ? 0 : i === 4 ? 21 : edgeSize + (i - 1) * cellSize;
  const getSize = (i: number) => (i === 0 || i === 4) ? edgeSize : cellSize;

  const shapes: SvgShape[] = [];
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      shapes.push({
        type: 'rect',
        x: getPos(col),
        y: getPos(row),
        width: getSize(col),
        height: getSize(row),
        fill: getCellColor(row, col),
      });
    }
  }
  if (name && nameType === 'pll') {
    const centerColor = getCellColor(2, 2);
    // cover the inner 3x3 grid (rows/cols 1-3, from 3px to 21px)
    shapes.push({
      type: 'rect',
      x: 3,
      y: 3,
      width: 18,
      height: 18,
      fill: centerColor,
    });
    return { viewBox: '0 0 24 24', shapes, name, nameColor: isColorDark(centerColor) ? '#FFFFFF' : '#000000' };
  }

  return { viewBox: '0 0 24 24', shapes, name };
}

// cmll icon - 5x5 LL grid but only corners are colored, edges/center greyed out
function cmllIcon(pattern: Grid, config: ColorConfig): IconDescriptor {
  const colorMap = gridColorMap(config);
  // corner positions in the 5x5 grid (all 3 stickers per corner)
  const cornerCells = new Set([
    '1,1', '0,1', '1,0', // BL corner: top, back, left
    '1,3', '0,3', '1,4', // BR corner: top, back, right
    '3,1', '4,1', '3,0', // FL corner: top, front, left
    '3,3', '4,3', '3,4', // FR corner: top, front, right
  ]);
  const getCellColor = (row: number, col: number): string => {
    if (!pattern[row] || pattern[row][col] === undefined) return config.darkBg;
    if (!cornerCells.has(`${row},${col}`)) return config.darkBg;
    return colorMap[pattern[row][col]] || config.darkBg;
  };

  const sizes = [3, 6, 3, 6, 3];
  const getPos = (i: number) => sizes.slice(0, i).reduce((a, b) => a + b, 0);
  const getSize = (i: number) => sizes[i];

  const shapes: SvgShape[] = [];
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      shapes.push({
        type: 'rect',
        x: getPos(col),
        y: getPos(row),
        width: getSize(col),
        height: getSize(row),
        fill: getCellColor(row, col),
      });
    }
  }
  return { viewBox: '0 0 21 21', shapes };
}

// lse icon - 6×5 grid: U face (rows 0-2) and F face (rows 3-5) in middle 3 cols,
// L/R adjacent stickers in cols 0/4. Cells [3][0] and [3][4] are blank.
function lseIcon(lsePattern: LSEPattern, config: ColorConfig): IconDescriptor {
  const colorMap = gridColorMap(config);
  const getColor = (idx: number): string => colorMap[idx] || config.darkBg;

  const cellW = 5;   // width of each cell
  const cellH = 4;   // height of each cell
  const totalW = 5 * cellW;
  const totalH = 6 * cellH;

  const shapes: SvgShape[] = [];

  // background
  shapes.push({ type: 'rect', x: 0, y: 0, width: totalW, height: totalH, fill: config.darkBg });

  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 5; col++) {
      // skip blank cells at the wrap-around gap
      if (row === 3 && (col === 0 || col === 4)) continue;

      const val = lsePattern[row]?.[col] ?? 0;
      if (val === 0) continue;

      shapes.push({
        type: 'rect',
        x: col * cellW,
        y: row * cellH,
        width: cellW,
        height: cellH,
        fill: getColor(val),
      });
    }
  }

  return { viewBox: `0 0 ${totalW} ${totalH}`, shapes };
}

// block icon - isometric 3-face view of a block, usually for roux
// shows top, front, and side (L or R) faces
function blockIcon(blockPattern: BlockPattern, config: ColorConfig): IconDescriptor {
  const colorMap = gridColorMap(config);
  const gray = config.gray;

  // determine which faces we have
  const horizFace = blockPattern?.U || blockPattern?.D;
  const frontFace = blockPattern?.F || blockPattern?.B;
  const sideFace = blockPattern?.L || blockPattern?.R;
  const isLeft = !!blockPattern?.L;
  const isTop = !!blockPattern?.U; // U above front, D below front

  const getColor = (face: string[] | undefined, idx: number): string => {
    if (!face || !face[idx] || face[idx] === '') return gray;
    // face stickers are color chars like 'W','Y','G','R','B','O'
    const charMap: Record<string, number> = { 'W': 1, 'Y': 2, 'G': 3, 'R': 5, 'B': 4, 'O': 6 };
    const faceIdx = charMap[face[idx]];
    return faceIdx ? (colorMap[faceIdx] || gray) : gray;
  };

  // isometric projection params
  // viewBox centered, cube facing front, turned ~30deg toward the side face
  // top face: parallelogram, front face: tall rect-ish, side face: narrow rect-ish
  // using integer coords for crisp rendering
  //
  // front face is wider (facing us), side face is narrower (angled away)
  // top face connects them as a parallelogram
  //
  // coordinate system: viewBox "0 0 24 24"
  // front face: 3x3 grid, each cell ~5x5, total 15x15, positioned left-center
  // side face: 3x3 grid, each cell ~3x5, total 9x15, angled
  // top face: 3x3 parallelogram grid above

  const fw = 5; // front cell width
  const fh = 5; // front/side cell height
  const sw = 3; // side cell width
  const th = 3; // top cell height (projected)

  // anchor points
  // for left block: side (L) is on the left, front is on the right
  // for right block: side (R) is on the right, front is on the left
  const fx = isLeft ? 24 - 3 * fw : 0; // front face x start
  const fy = isTop ? 24 - 3 * fh : 0;  // front face y start (bottom for U, top for D)
  const sx = isLeft ? fx - 3 * sw : 3 * fw; // side face x start
  const horizFaceY = isTop ? fy - 3 * th : fy + 3 * fh; // U above front, D below front
  const shearSign = isTop ? -1 : 1; // side face shears up toward U, down toward D

  const shapes: SvgShape[] = [];
  // background
  shapes.push({ type: 'rect', x: 0, y: 0, width: 24, height: 24, fill: config.darkBg });

  // horizontal face (U or D) - parallelogram cells
  // for left block: skews left toward L; for right block: skews right toward R
  // rows farther from front face have more skew
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const idx = row * 3 + col;
      const skewPerRow = sw;
      const dir = isLeft ? -1 : 1;
      const dirShift = isTop ? 2 * dir : -1 * dir;
      const rowSkew = isTop ? (2 - row) : row;
      const baseX = fx + col * fw + rowSkew * skewPerRow * dir + dirShift;
      const baseY = horizFaceY + row * th;
      const x0 = baseX;
      const x1 = baseX + fw;
      const cellSkew = isTop ? -skewPerRow * dir : skewPerRow * dir;
      const x2 = baseX + fw + cellSkew;
      const x3 = baseX + cellSkew;
      const y0 = baseY;
      const y1 = baseY + th;
      shapes.push({
        type: 'polygon',
        points: `${x0},${y0} ${x1},${y0} ${x2},${y1} ${x3},${y1}`,
        fill: getColor(horizFace, idx),
      });
    }
  }

  // front face - rectangular grid
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const idx = row * 3 + col;
      shapes.push({
        type: 'rect',
        x: fx + col * fw,
        y: fy + row * fh,
        width: fw,
        height: fh,
        fill: getColor(frontFace, idx),
      });
    }
  }

  // side face - parallelogram cells (vertical shear)
  // columns further from front face shear toward the horizontal face (up for U, down for D)
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const idx = row * 3 + col;
      const colFromFront = isLeft ? 2 - col : col;
      const shearY = colFromFront * th;
      const x0 = sx + col * sw;
      const y0 = fy + row * fh + shearY * shearSign;
      const x1 = x0 + sw;
      const y2 = y0 + fh;
      const y3 = y0 + fh;
      // next column shear
      const nextShearY = (colFromFront + 1) * th;
      const dy = nextShearY - shearY;
      shapes.push({
        type: 'polygon',
        points: isLeft
          ? `${x0},${y0 + shearSign * dy} ${x1},${y0} ${x1},${y2} ${x0},${y3 + shearSign * dy}`
          : `${x0},${y0} ${x1},${y0 + shearSign * dy} ${x1},${y2 + shearSign * dy} ${x0},${y3}`,
        fill: getColor(sideFace, idx),
      });
    }
  }

  return { viewBox: '0 0 24 24', shapes };
}

function fallbackIcon(color: string): IconDescriptor {
  return {
    viewBox: '0 0 24 24',
    shapes: [
      // { type: 'circle', cx: 12, cy: 12, r: 6, fill: color },
    ],
  };
}

/**
 * A unified entry point for generating the basic icon data
 * Can be turned into SVG elements for 
 * @param config
 * @param data 
 * @param options 
 * @returns 
 */
export function getStepIconDescriptor(
  config: ColorConfig,
  data: StepInfo,
  options?: IconOptions,
): IconDescriptor {
  const primaryColors = resolveColors(data.colors, config);
  const step = data.step;
  const eoColor = options?.eoColor;

  // steps where EO border is not meaningful
  const noEO = data.type === 'last layer' || data.type === 'solved';

  const withEO = (desc: IconDescriptor): IconDescriptor => {
    if (eoColor && !noEO) desc.eoBorderColor = eoColor;
    return desc;
  };

  if (step === 'owl') {
    return owlIcon;
  }

  if (step === 'v-eoLine' || step === 'h-eoLine') {
    const bg = options?.getCrossBg?.(primaryColors[0]) ?? config.darkBg;
    return withEO(eoLineIcon(step, primaryColors, bg));
  }

  if (step === 'cross') {
    const bg = options?.getCrossBg?.(primaryColors[0]) ?? config.darkBg;
    return withEO(crossIcon(primaryColors[0], bg));
  }

  if (step === 'xcross' || step === 'xxcross' || step === 'xxxcross' || step === 'xxxxcross') {
    return withEO(xcrossIcon(primaryColors, step, config));
  }

  if (step === 'pair') {
    return withEO(pairIcon(data.f2lSlotList, config));
  }

  if (step === 'multislot') {
    return withEO(multislotIcon(data.f2lSlotList, config));
  }

  if ((data.type === 'last layer' || data.type === 'solved') && data.gridPattern && data.gridPattern.length > 0) {
    return lastLayerIcon(data.gridPattern, config, data.name, data.nameType);
  }

  // cmll - corners-only LL grid
  const cmllTypes = ['cmll', 'cmll co', 'cmll cp'];
  if (cmllTypes.includes(data.type) && data.gridPattern) {
    return withEO(cmllIcon(data.gridPattern, config));
  }

  // lse - top 3x3 grid with side stickers
  if (data.type === 'lse' && data.lsePattern) {
    return withEO(lseIcon(data.lsePattern, config));
  }

  // block - isometric 3-face view
  if (data.type === 'block' && data.blockPattern) {
    return withEO(blockIcon(data.blockPattern, config));
  }

  return withEO(fallbackIcon(primaryColors[0] || config.gray));
}
