import type { ReactNode } from 'react';

// grid is a 5x5 number array for last layer pattern visualization
export type Grid = number[][];

export interface StepIconData {
  step: string;
  type: 'cross' | 'f2l' | 'last layer' | 'solved' | 'none';
  colors: string[];
  pattern?: Grid;
}

export const CUBE_COLORS = {
  red: '#FF0000',
  green: '#0CEC00',
  blue: '#003CFF',
  yellow: '#EEFF00',
  orange: '#FF7F00',
  white: '#FFFFFF',
} as const;

const BLUE_DISPLAY = '#0085FF';
const DARK_BG = '#161018';
const GRAY = '#888888';

function getStepColors(colors: string[]): string[] {
  const colorMap: Record<string, string> = {
    'white': CUBE_COLORS.white,
    'yellow': CUBE_COLORS.yellow,
    'green': CUBE_COLORS.green,
    'blue': BLUE_DISPLAY,
    'red': CUBE_COLORS.red,
    'orange': CUBE_COLORS.orange
  };
  return colors.map(color => colorMap[color.toLowerCase()] || GRAY);
}

const oppositeColors: Record<string, string> = {
  [CUBE_COLORS.white]: CUBE_COLORS.yellow,
  [CUBE_COLORS.yellow]: CUBE_COLORS.white,
  [CUBE_COLORS.green]: BLUE_DISPLAY,
  [BLUE_DISPLAY]: CUBE_COLORS.green,
  [CUBE_COLORS.red]: CUBE_COLORS.orange,
  [CUBE_COLORS.orange]: CUBE_COLORS.red
};

type CreateElement = (type: string, props: Record<string, unknown> | null, ...children: ReactNode[]) => ReactNode;

// generates step icon as JSX element tree for use with Satori/ImageResponse
export function createStepIcon(
  data: StepIconData,
  size: number,
  createElement: CreateElement
): ReactNode {
  const h = createElement;
  const primaryColors = getStepColors(data.colors);
  const step = data.step;
  const pattern = data.pattern;

  // cross icon - 3x3 grid with cross pattern
  if (step === 'cross') {
    return h('svg', { viewBox: '0 0 24 24', width: size, height: size },
      h('rect', { x: 0, y: 0, width: 8, height: 8, fill: DARK_BG }),
      h('rect', { x: 8, y: 0, width: 8, height: 8, fill: primaryColors[0] }),
      h('rect', { x: 16, y: 0, width: 8, height: 8, fill: DARK_BG }),
      h('rect', { x: 0, y: 8, width: 8, height: 8, fill: primaryColors[0] }),
      h('rect', { x: 8, y: 8, width: 8, height: 8, fill: primaryColors[0] }),
      h('rect', { x: 16, y: 8, width: 8, height: 8, fill: primaryColors[0] }),
      h('rect', { x: 0, y: 16, width: 8, height: 8, fill: DARK_BG }),
      h('rect', { x: 8, y: 16, width: 8, height: 8, fill: primaryColors[0] }),
      h('rect', { x: 16, y: 16, width: 8, height: 8, fill: DARK_BG })
    );
  }

  // xcross variants - isometric 3D view
  if (step === 'xcross' || step === 'xxcross' || step === 'xxxcross' || step === 'xxxxcross') {
    const crossColor = primaryColors[0];
    const frontColor = primaryColors[1];
    const rightColor = primaryColors[2];

    const backColorHex = Object.entries(oppositeColors).find(([, opposite]) => opposite === frontColor)?.[0] ?? null;
    const leftColorHex = Object.entries(oppositeColors).find(([, opposite]) => opposite === rightColor)?.[0] ?? null;

    const backColorCount = backColorHex ? primaryColors.filter(color => color === backColorHex).length : 0;
    const leftColorCount = leftColorHex ? primaryColors.filter(color => color === leftColorHex).length : 0;
    const frontColorCount = primaryColors.filter(color => color === frontColor).length;
    const rightColorCount = primaryColors.filter(color => color === rightColor).length;

    const numberXs = step.length - 'cross'.length;
    const isBackXCrossSolved = (() => {
      if (numberXs === 2) return backColorCount > 0 && leftColorCount > 0;
      if (numberXs === 3) {
        const sortedCounts = [backColorCount, leftColorCount].sort((a, b) => a - b);
        return sortedCounts[0] === 1 && sortedCounts[1] === 2;
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

    return h('svg', { viewBox: '-15 -19 30 30', width: size, height: size },
      h('rect', { x: -15, y: -19, width: 30, height: 30, fill: DARK_BG }),
      // top face cross
      h('polygon', { points: '0,0 5,-3 0,-6 -5,-3', fill: crossColor }),
      h('polygon', { points: '5,-3 0,-6 5,-9 10,-6', fill: crossColor }),
      h('polygon', { points: '-5,-3 0,-6 -5,-9 -10,-6', fill: crossColor }),
      h('polygon', { points: '0,-6 5,-9 0,-12 -5,-9', fill: crossColor }),
      h('polygon', { points: '-5,-9 0,-12 -5,-15 -10,-12', fill: crossColor }),
      h('polygon', { points: '5,-9 10,-12 5,-15 0,-12', fill: crossColor }),
      // top face corners
      h('polygon', { points: '0,-12 5,-15 0,-18 -5,-15', fill: isBackXCrossSolved ? crossColor : GRAY }),
      h('polygon', { points: '10,-6 15,-9 10,-12 5,-9', fill: isRightXCrossSolved ? crossColor : GRAY }),
      h('polygon', { points: '-10,-6 -5,-9 -10,-12 -15,-9', fill: isLeftXCrossSolved ? crossColor : GRAY }),
      // front face
      h('polygon', { points: '0,0 -5,-3 -5,2 0,5', fill: frontColor }),
      h('polygon', { points: '0,5 -5,2 -5,7 0,10', fill: frontColor }),
      h('polygon', { points: '-5,-3 -10,-6 -10,-1 -5,2', fill: frontColor }),
      h('polygon', { points: '-5,2 -10,-1 -10,4 -5,7', fill: frontColor }),
      h('polygon', { points: '-10,-1 -15,-4 -15,1 -10,4', fill: isLeftXCrossSolved ? frontColor : GRAY }),
      h('polygon', { points: '-10,-6 -15,-9 -15,-4 -10,-1', fill: isLeftXCrossSolved ? frontColor : GRAY }),
      h('polygon', { points: '-10,4 -15,1 -15,6 -10,9', fill: GRAY }),
      h('polygon', { points: '-5,7 -10,4 -10,9 -5,12', fill: GRAY }),
      h('polygon', { points: '0,10 -5,7 -5,12 0,15', fill: GRAY }),
      // right face
      h('polygon', { points: '0,0 5,-3 5,2 0,5', fill: rightColor }),
      h('polygon', { points: '0,5 5,2 5,7 0,10', fill: rightColor }),
      h('polygon', { points: '5,-3 10,-6 10,-1 5,2', fill: rightColor }),
      h('polygon', { points: '5,2 10,-1 10,4 5,7', fill: rightColor }),
      h('polygon', { points: '10,-1 15,-4 15,1 10,4', fill: isRightXCrossSolved ? rightColor : GRAY }),
      h('polygon', { points: '10,-6 15,-9 15,-4 10,-1', fill: isRightXCrossSolved ? rightColor : GRAY }),
      h('polygon', { points: '10,4 15,1 15,6 10,9', fill: GRAY }),
      h('polygon', { points: '5,7 10,4 10,9 5,12', fill: GRAY }),
      h('polygon', { points: '0,10 5,7 5,12 0,15', fill: GRAY })
    );
  }

  // pair - diagonal split
  if (step === 'pair') {
    return h('svg', { viewBox: '0 0 24 24', width: size, height: size },
      h('polygon', { points: '0,0 24,0 0,24', fill: primaryColors[0] }),
      h('polygon', { points: '24,0 24,24 0,24', fill: primaryColors[1] || primaryColors[0] })
    );
  }

  // multislot - vertical stripes
  if (step === 'multislot') {
    const numColors = primaryColors.length;
    if (numColors <= 3) {
      const w = 24 / 3;
      return h('svg', { viewBox: '0 0 24 24', width: size, height: size },
        h('rect', { x: 0, y: 0, width: w, height: 24, fill: primaryColors[0] }),
        h('rect', { x: w, y: 0, width: w, height: 24, fill: primaryColors[1] || primaryColors[0] }),
        h('rect', { x: w * 2, y: 0, width: w, height: 24, fill: primaryColors[2] || primaryColors[0] })
      );
    } else {
      const w = 6;
      return h('svg', { viewBox: '0 0 24 24', width: size, height: size },
        h('rect', { x: 0, y: 0, width: w, height: 24, fill: primaryColors[0] }),
        h('rect', { x: w, y: 0, width: w, height: 24, fill: primaryColors[1] }),
        h('rect', { x: w * 2, y: 0, width: w, height: 24, fill: primaryColors[2] }),
        h('rect', { x: w * 3, y: 0, width: w, height: 24, fill: primaryColors[3] })
      );
    }
  }

  // last layer / solved - 5x5 grid with pattern
  if ((data.type === 'last layer' || data.type === 'solved') && pattern && pattern.length > 0) {
    const gridColorMap: Record<number, string> = {
      1: CUBE_COLORS.white,
      2: CUBE_COLORS.yellow,
      3: CUBE_COLORS.green,
      4: BLUE_DISPLAY,
      5: CUBE_COLORS.red,
      6: CUBE_COLORS.orange
    };

    const getCellColor = (row: number, col: number): string => {
      if (!pattern[row] || pattern[row][col] === undefined) return DARK_BG;
      const colorNum = pattern[row][col];
      return gridColorMap[colorNum] || DARK_BG;
    };

    // 5x5 grid layout with thin edges (3px) and thick center cells (6px)
    // total: 3 + 6 + 6 + 6 + 3 = 24
    const edgeSize = 3;
    const cellSize = 6;
    const getPos = (i: number) => i === 0 ? 0 : i === 4 ? 21 : edgeSize + (i - 1) * cellSize;
    const getSize = (i: number) => (i === 0 || i === 4) ? edgeSize : cellSize;

    const rects: ReactNode[] = [];
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        rects.push(h('rect', {
          key: `${row}-${col}`,
          x: getPos(col),
          y: getPos(row),
          width: getSize(col),
          height: getSize(row),
          fill: getCellColor(row, col)
        }));
      }
    }

    return h('svg', { viewBox: '0 0 24 24', width: size, height: size }, ...rects);
  }

  // fallback - circle
  return h('svg', { viewBox: '0 0 24 24', width: size, height: size },
    h('circle', { cx: 12, cy: 12, r: 6, fill: primaryColors[0] || GRAY })
  );
}

// serializes StepIconData for URL transport
export function serializeStepIconData(data: StepIconData): string {
  return JSON.stringify(data);
}

// deserializes StepIconData from URL transport
export function deserializeStepIconData(str: string): StepIconData | null {
  try {
    return JSON.parse(str) as StepIconData;
  } catch {
    return null;
  }
}

// serializes an array of step icons for URL transport (one per solution line)
export function serializeLineIcons(icons: (StepIconData | null)[]): string {
  return JSON.stringify(icons);
}

// deserializes an array of step icons
export function deserializeLineIcons(str: string): (StepIconData | null)[] {
  try {
    return JSON.parse(str) as (StepIconData | null)[];
  } catch {
    return [];
  }
}
