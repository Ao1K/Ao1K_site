import type { CubeState as SimpleCubeState, Color } from './SimpleCube';
import { faceOfSticker, FACELET_COUNT } from './faceletCube';
import type { Facelets } from './faceletCube';

export type ColorName = 'white' | 'yellow' | 'red' | 'orange' | 'green' | 'blue';
export type DirectionChar = 'U' | 'D' | 'L' | 'R' | 'F' | 'B';

export interface StickerState {
  faceIdx: number;
  colorName: ColorName;
  direction: DirectionChar;
}

export interface PieceState {
  type: 'corner' | 'edge' | 'center';
  origin: string; // e.g. 'UFR', 'FR', 'U'
  stickers: StickerState[];
}

export interface TopInfo {
  actualColor: string;
  effectiveColor: string;
  direction: string;
}

export type PieceColorMapping = Map<number, { effectivePieceIndex: number, stickerOrder: string[] }>;

export interface HashState {
  hash: string;
  rotation: string;
  eoValue: number;
}

export interface CubeReading {
  state: HashState;
  pieces: PieceState[];
  pieceColorMapping: PieceColorMapping;
  topInfo: TopInfo;
}

/**
 * Fixed string representing the state of a solved 3x3 cube.
 * The index of each character in the string corresponds to a piece of
 * a specific set of colors. Colors are then mapped based on cube rotation.
 * Finally, we get the position of each piece that has those mapped (effective) colors.
 *
 * Example:
 *  We have a solved cube where an x rotation was applied, and we want to find the 0th
 *  character in the hash. With no rotation this corresponds white-green edge.
 *  With rotation, we map the colors, so the effective colors are green-yellow.
 *  Direction green-yellow is U-F. U-F corresponds to character 'a'.
 */
export const SOLVED_HASH = 'abcdefghijklehkbnqtwabcdef';

// maps single-char color codes to full color names
export const colorCharToName: { [key in Color]: ColorName } = {
  'W': 'white',
  'Y': 'yellow',
  'R': 'red',
  'O': 'orange',
  'G': 'green',
  'B': 'blue'
};

const colorCharToFaceIdx: { [key in Color]: number } = { W: 0, Y: 1, G: 2, R: 3, B: 4, O: 5 };
const faceIdxToColorChar: Color[] = ['W', 'Y', 'G', 'R', 'B', 'O'];

// standard facelets mapping (face index to color name for solved cube)
export const FACE_COLOR_NAMES: readonly ColorName[] = ['white', 'yellow', 'green', 'red', 'blue', 'orange'];

const FACE_DIRECTIONS: readonly DirectionChar[] = ['U', 'D', 'F', 'R', 'B', 'L'];

/**
 * Maps edge piece positions to their sticker locations in SimpleCubeState.
 * Each entry: [face1, row1, col1, dir1, face2, row2, col2, dir2]
 * face indices: 0=U, 1=D, 2=F, 3=R, 4=B, 5=L
 */
export const EDGE_POSITIONS: readonly [number, number, number, DirectionChar, number, number, number, DirectionChar][] = [
  [0, 2, 1, 'U', 2, 0, 1, 'F'], // 0: UF
  [0, 1, 2, 'U', 3, 0, 1, 'R'], // 1: UR
  [0, 0, 1, 'U', 4, 0, 1, 'B'], // 2: UB
  [0, 1, 0, 'U', 5, 0, 1, 'L'], // 3: UL
  [1, 0, 1, 'D', 2, 2, 1, 'F'], // 4: DF
  [1, 1, 2, 'D', 3, 2, 1, 'R'], // 5: DR
  [1, 2, 1, 'D', 4, 2, 1, 'B'], // 6: DB
  [1, 1, 0, 'D', 5, 2, 1, 'L'], // 7: DL
  [2, 1, 2, 'F', 3, 1, 0, 'R'], // 8: FR
  [2, 1, 0, 'F', 5, 1, 2, 'L'], // 9: FL
  [4, 1, 0, 'B', 3, 1, 2, 'R'], // 10: BR
  [4, 1, 2, 'B', 5, 1, 0, 'L'], // 11: BL
];

/**
 * Maps corner piece positions to their sticker locations in SimpleCubeState.
 * Each entry: [face1, row1, col1, dir1, face2, row2, col2, dir2, face3, row3, col3, dir3]
 * Order matches original piece indices 12-19: UFR, UBR, UBL, UFL, DFR, DFL, DBL, DBR
 */
export const CORNER_POSITIONS: readonly [number, number, number, DirectionChar, number, number, number, DirectionChar, number, number, number, DirectionChar][] = [
  [0, 2, 2, 'U', 2, 0, 2, 'F', 3, 0, 0, 'R'], // 12: UFR
  [0, 0, 2, 'U', 4, 0, 0, 'B', 3, 0, 2, 'R'], // 13: UBR
  [0, 0, 0, 'U', 4, 0, 2, 'B', 5, 0, 0, 'L'], // 14: UBL
  [0, 2, 0, 'U', 2, 0, 0, 'F', 5, 0, 2, 'L'], // 15: UFL
  [1, 0, 2, 'D', 2, 2, 2, 'F', 3, 2, 0, 'R'], // 16: DFR
  [1, 0, 0, 'D', 2, 2, 0, 'F', 5, 2, 2, 'L'], // 17: DFL
  [1, 2, 0, 'D', 4, 2, 2, 'B', 5, 2, 0, 'L'], // 18: DBL
  [1, 2, 2, 'D', 4, 2, 0, 'B', 3, 2, 2, 'R'], // 19: DBR
];

/**
 * Maps center piece positions to their sticker locations.
 * Each entry: [face, row, col, direction]
 * Order: U, L, F, R, B, D (indices 20-25)
 */
export const CENTER_POSITIONS: readonly [number, number, number, DirectionChar][] = [
  [0, 1, 1, 'U'], // 20: U center
  [5, 1, 1, 'L'], // 21: L center
  [2, 1, 1, 'F'], // 22: F center
  [3, 1, 1, 'R'], // 23: R center
  [4, 1, 1, 'B'], // 24: B center
  [1, 1, 1, 'D'], // 25: D center
];

// color sets that define each piece index, primary color first
const EDGE_COLORS: readonly [number, number][] = [
  [0, 2], // 0: UF → white, green
  [0, 3], // 1: UR → white, red
  [0, 4], // 2: UB → white, blue
  [0, 5], // 3: UL → white, orange
  [1, 2], // 4: DF → yellow, green
  [1, 3], // 5: DR → yellow, red
  [1, 4], // 6: DB → yellow, blue
  [1, 5], // 7: DL → yellow, orange
  [2, 3], // 8: FR → green, red
  [2, 5], // 9: FL → green, orange
  [4, 3], // 10: BR → blue, red
  [4, 5], // 11: BL → blue, orange
];

const CORNER_COLORS: readonly [number, number, number][] = [
  [0, 2, 3], // 12: UFR → white, green, red
  [0, 4, 3], // 13: UBR → white, blue, red
  [0, 4, 5], // 14: UBL → white, blue, orange
  [0, 2, 5], // 15: UFL → white, green, orange
  [1, 2, 3], // 16: DFR → yellow, green, red
  [1, 2, 5], // 17: DFL → yellow, green, orange
  [1, 4, 5], // 18: DBL → yellow, blue, orange
  [1, 4, 3], // 19: DBR → yellow, blue, red
];

// center colors 20-25: U, L, F, R, B, D
const CENTER_COLORS: readonly number[] = [0, 5, 2, 3, 4, 1];

// maps faceIdx to effective faceIdx after rotation
// indices: 0=U(white), 1=D(yellow), 2=F(green), 3=R(red), 4=B(blue), 5=L(orange)
export const ROTATION_COLOR_MAP = new Map<string, number[]>([
  ["no_rotation", [0, 1, 2, 3, 4, 5]],
  ["y", [0, 1, 3, 4, 5, 2]],
  ["y2", [0, 1, 4, 5, 2, 3]],
  ["y'", [0, 1, 5, 2, 3, 4]],
  ["x", [2, 4, 1, 3, 0, 5]],
  ["x y", [2, 4, 3, 0, 5, 1]],
  ["x y2", [2, 4, 0, 5, 1, 3]],
  ["x y'", [2, 4, 5, 1, 3, 0]],
  ["x2", [1, 0, 4, 3, 2, 5]],
  ["x2 y", [1, 0, 3, 2, 5, 4]],
  ["z2", [1, 0, 2, 5, 4, 3]],
  ["x2 y'", [1, 0, 5, 4, 3, 2]],
  ["x'", [4, 2, 0, 3, 1, 5]],
  ["x' y", [4, 2, 3, 1, 5, 0]],
  ["x' y2", [4, 2, 1, 5, 0, 3]],
  ["x' y'", [4, 2, 5, 0, 3, 1]],
  ["z", [5, 3, 2, 0, 4, 1]],
  ["z y", [5, 3, 0, 4, 1, 2]],
  ["z y2", [5, 3, 4, 1, 2, 0]],
  ["z y'", [5, 3, 1, 2, 0, 4]],
  ["z'", [3, 5, 2, 1, 4, 0]],
  ["z' y", [3, 5, 1, 4, 0, 2]],
  ["z' y2", [3, 5, 4, 0, 2, 1]],
  ["z' y'", [3, 5, 0, 2, 1, 4]],
]);

// maps U center color + F center color to rotation name
const CUBE_ROTATION_MAP = new Map<string, string>([
  ["W,G", "no_rotation"],
  ["W,R", "y"],
  ["W,B", "y2"],
  ["W,O", "y'"],
  ["G,Y", "x"],
  ["G,R", "x y"],
  ["G,W", "x y2"],
  ["G,O", "x y'"],
  ["Y,B", "x2"],
  ["Y,R", "x2 y"],
  ["Y,G", "z2"],
  ["Y,O", "x2 y'"],
  ["B,W", "x'"],
  ["B,R", "x' y"],
  ["B,Y", "x' y2"],
  ["B,O", "x' y'"],
  ["O,G", "z"],
  ["O,W", "z y"],
  ["O,B", "z y2"],
  ["O,Y", "z y'"],
  ["R,G", "z'"],
  ["R,Y", "z' y"],
  ["R,B", "z' y2"],
  ["R,W", "z' y'"],
]);

export const EDGE_PIECE_DIRECTIONS: { readonly [key: string]: number } = {
  'UF': 0, 'UR': 1, 'UB': 2, 'UL': 3,
  'DF': 4, 'DR': 5, 'DB': 6, 'DL': 7,
  'FR': 8, 'FL': 9, 'BR': 10, 'BL': 11,
  'FU': 12, 'RU': 13, 'BU': 14, 'LU': 15,
  'FD': 16, 'RD': 17, 'BD': 18, 'LD': 19,
  'RF': 20, 'LF': 21, 'RB': 22, 'LB': 23
};

export const CENTER_PIECE_DIRECTIONS: { readonly [key: string]: number } = {
  'U': 0,
  'L': 1,
  'F': 2,
  'R': 3,
  'B': 4,
  'D': 5
};

/**
 * characters in each key sorted alphabetically
 *  */
export const CORNER_PIECE_DIRECTIONS: { readonly [key: string]: number } = {
  'FLU': 0, // 'UFL': 0,
  'FRU': 1, // 'URF': 1,
  'BRU': 2, // 'UBR': 2,
  'BLU': 3, // 'ULB': 3,
  'DFR': 4, // 'DFR': 4,
  'DFL': 5, // 'DLF': 5,
  'BDL': 6, // 'DBL': 6,
  'BDR': 7, // 'DRB': 7,
};

/**
 * In practice, since cross is mostly on down face, effective color for cross
 * is mostly yellow.
 */
export const CROSS_PIECE_INDICES: { readonly [key: string]: string } = {
  // colors returned are the effective colors after cube rotation
  '0,1,2,3': 'white', // up
  '4,5,6,7': 'yellow', // down
  '0,4,8,9': 'green', // front
  '1,5,8,10': 'red', // right
  '2,6,10,11': 'blue', // back
  '3,7,9,11': 'orange' // left
};

export interface F2LSlot {
  corner: number;
  edge: number;
  slotColors: [string, string];
}

/**
 * F2L slots organized by corner-edge pairs
 * Each slot contains a corner and edge that solve together
 * In the current form, only yellow should be used because we assume cross on bottom.
 */
export const F2L_SLOTS: { readonly [key: string]: readonly F2LSlot[] } = {
  'white': [ // unused
    { corner: 12, edge: 8, slotColors: ['green', 'red'] },  // UFR corner + FR edge
    { corner: 15, edge: 9, slotColors: ['orange', 'green'] },  // UFL corner + FL edge
    { corner: 14, edge: 11, slotColors: ['blue', 'orange'] }, // UBL corner + BL edge
    { corner: 13, edge: 10, slotColors: ['red', 'blue'] }  // UBR corner + BR edge
  ],
  'yellow': [ // cross on bottom
    { corner: 16, edge: 8, slotColors: ['red', 'green'] },  // DFR corner + FR edge
    { corner: 17, edge: 9, slotColors: ['green', 'orange'] },  // DFL corner + FL edge
    { corner: 18, edge: 11, slotColors: ['orange', 'blue'] }, // DBL corner + BL edge
    { corner: 19, edge: 10, slotColors: ['blue', 'red'] }  // DBR corner + BR edge
  ],
  'green': [ // rest of colors unused
    { corner: 12, edge: 1, slotColors: ['red', 'white'] },  // UFR corner + UR edge
    { corner: 15, edge: 3, slotColors: ['white', 'orange'] },  // UFL corner + UL edge
    { corner: 16, edge: 5, slotColors: ['yellow', 'red'] },  // DFR corner + DR edge
    { corner: 17, edge: 7, slotColors: ['orange', 'yellow'] }   // DFL corner + DL edge
  ],
  'red': [
    { corner: 12, edge: 0, slotColors: ['white', 'green'] },  // UFR corner + UF edge
    { corner: 13, edge: 2, slotColors: ['blue', 'white'] },  // UBR corner + UB edge
    { corner: 16, edge: 4, slotColors: ['green', 'yellow'] },  // DFR corner + DF edge
    { corner: 19, edge: 6, slotColors: ['yellow', 'blue'] }   // DBR corner + DB edge
  ],
  'blue': [
    { corner: 13, edge: 1, slotColors: ['white', 'red'] },  // UBR corner + UR edge
    { corner: 14, edge: 3, slotColors: ['orange', 'white'] },  // UBL corner + UL edge
    { corner: 19, edge: 5, slotColors: ['red', 'yellow'] },  // DBR corner + DR edge
    { corner: 18, edge: 7, slotColors: ['yellow', 'orange'] }   // DBL corner + DL edge
  ],
  'orange': [
    { corner: 15, edge: 0, slotColors: ['green', 'white'] },  // UFL corner + UF edge
    { corner: 14, edge: 2, slotColors: ['white', 'blue'] },  // UBL corner + UB edge
    { corner: 17, edge: 4, slotColors: ['yellow', 'green'] },  // DFL corner + DF edge
    { corner: 18, edge: 6, slotColors: ['blue', 'yellow'] }   // DBL corner + DL edge
  ]
};

export function getOppositeColor(color: ColorName | string): ColorName {
  switch (color.toLowerCase()) {
    case 'white':
      return 'yellow';
    case 'yellow':
      return 'white';
    case 'green':
      return 'blue';
    case 'blue':
      return 'green';
    case 'red':
      return 'orange';
    case 'orange':
      return 'red';
    default:
      throw new Error(`Unknown top color: ${color}`);
  }
}

export function effectiveToActualColor(rotation: string, effectiveColor: string): string {
  const colorMapping = ROTATION_COLOR_MAP.get(rotation);
  const effectiveColorIdx = FACE_COLOR_NAMES.indexOf(effectiveColor as ColorName);
  if (!colorMapping || effectiveColorIdx === -1) {
    console.warn(`Cannot map effective color ${effectiveColor} for rotation ${rotation}`);
    return effectiveColor;
  }
  return FACE_COLOR_NAMES[colorMapping[effectiveColorIdx]];
}

export function actualToEffectiveColor(rotation: string, actualColor: string): string {
  const colorMapping = ROTATION_COLOR_MAP.get(rotation);
  const actualColorIdx = FACE_COLOR_NAMES.indexOf(actualColor as ColorName);
  const effectiveColorIdx = colorMapping && actualColorIdx !== -1 ? colorMapping.indexOf(actualColorIdx) : -1;
  if (effectiveColorIdx === -1) {
    console.warn(`Cannot map actual color ${actualColor} for rotation ${rotation}`);
    return actualColor;
  }
  return FACE_COLOR_NAMES[effectiveColorIdx];
}

/**
 * Determines the cube rotation by reading U and F center colors.
 */
export function readCubeRotation(cubeState: SimpleCubeState): string | null {
  const uCenter = cubeState[0][1][1];
  const fCenter = cubeState[2][1][1];
  const rotation = CUBE_ROTATION_MAP.get(`${uCenter},${fCenter}`);
  if (!rotation) {
    console.warn(`Unknown rotation for U=${uCenter}, F=${fCenter}`);
    return null;
  }
  return rotation;
}

const sortedKey = (values: number[]) => [...values].sort().join(',');

/**
 * Extracts pieces from the SimpleCubeState using position mappings.
 * Pieces are indexed by their colors (not location), matching the hash paradigm.
 */
export function readPieces(cubeState: SimpleCubeState): PieceState[] {
  const sticker = (face: number, row: number, col: number, direction: DirectionChar): StickerState => {
    const color = cubeState[face][row][col];
    return { faceIdx: colorCharToFaceIdx[color], colorName: colorCharToName[color], direction };
  };

  const edgesByLocation: PieceState[] = EDGE_POSITIONS.map(([f1, r1, c1, d1, f2, r2, c2, d2]) => ({
    type: 'edge',
    origin: d1 + d2,
    stickers: [sticker(f1, r1, c1, d1), sticker(f2, r2, c2, d2)],
  }));

  const cornersByLocation: PieceState[] = CORNER_POSITIONS.map(([f1, r1, c1, d1, f2, r2, c2, d2, f3, r3, c3, d3]) => ({
    type: 'corner',
    origin: d1 + d2 + d3,
    stickers: [sticker(f1, r1, c1, d1), sticker(f2, r2, c2, d2), sticker(f3, r3, c3, d3)],
  }));

  const centersByLocation: PieceState[] = CENTER_POSITIONS.map(([f, r, c, d]) => ({
    type: 'center',
    origin: d,
    stickers: [sticker(f, r, c, d)],
  }));

  const pieces: PieceState[] = new Array(26);

  EDGE_COLORS.forEach((colors, targetIdx) => {
    const edge = edgesByLocation.find(e => sortedKey(e.stickers.map(s => s.faceIdx)) === sortedKey(colors));
    if (!edge) return;
    const stickers = edge.stickers[0].faceIdx === colors[0] ? [...edge.stickers] : [edge.stickers[1], edge.stickers[0]];
    pieces[targetIdx] = { ...edge, stickers };
  });

  CORNER_COLORS.forEach((colors, targetIdx) => {
    const corner = cornersByLocation.find(c => sortedKey(c.stickers.map(s => s.faceIdx)) === sortedKey(colors));
    if (!corner) return;
    const primaryIdx = corner.stickers.findIndex(s => s.faceIdx === colors[0]);
    const stickers = [corner.stickers[primaryIdx], ...corner.stickers.filter((_, i) => i !== primaryIdx)];
    pieces[12 + targetIdx] = { ...corner, stickers };
  });

  CENTER_COLORS.forEach((color, targetIdx) => {
    const center = centersByLocation.find(c => c.stickers[0].faceIdx === color);
    if (center) pieces[20 + targetIdx] = center;
  });

  return pieces;
}

/**
 * Uses current rotation to map colors to their effective colors.
 * Then maps each piece to its corresponding piece of effective colors.
 */
export function mapPiecesByColor(pieces: PieceState[], rotation: string): PieceColorMapping {
  const pieceMapping: PieceColorMapping = new Map();
  const colorMapping = ROTATION_COLOR_MAP.get(rotation);

  if (!colorMapping) {
    console.error('No color mapping found for current rotation:', rotation);
    return pieceMapping;
  }

  pieces.forEach((currentPiece, currentIndex) => {
    const stickerOrder = currentPiece.stickers.map(sticker => colorMapping[sticker.faceIdx].toString());
    const sortedStickers = [...stickerOrder].sort().join(',');

    const effectivePieceIndex = pieces.findIndex(piece =>
      piece.type === currentPiece.type && piece.stickers.map(s => s.faceIdx).sort().join(',') === sortedStickers
    );
    if (effectivePieceIndex === -1) {
      console.warn('No matching original piece found for current piece:', currentPiece);
      return;
    }
    pieceMapping.set(currentIndex, { effectivePieceIndex, stickerOrder });
  });

  return pieceMapping;
}

const AXIS_OF_DIRECTION: Record<DirectionChar, number> = { L: 0, R: 0, U: 1, D: 1, F: 2, B: 2 };

const hashChar = (index: number) => String.fromCharCode(97 + index);

/**
 * Generates hash from piece colors and orientations.
 */
export function hashRecoloredPieces(pieces: PieceState[], pieceColorMapping: PieceColorMapping): string | null {
  let hash = '';

  for (const [currentIndex, { effectivePieceIndex, stickerOrder }] of pieceColorMapping) {
    const piece = pieces[effectivePieceIndex];
    const leadStickerIndex = piece.stickers.findIndex(s => s.faceIdx.toString() === stickerOrder[0]);
    if (leadStickerIndex === -1) {
      console.warn(`Lead sticker with color index ${stickerOrder[0]} not found on piece at current index ${currentIndex}`);
      return null;
    }
    const leadDirection = piece.stickers[leadStickerIndex].direction;

    switch (piece.type) {
      case 'corner': {
        const locationKey = piece.stickers.map(s => s.direction).sort().join('');
        hash += hashChar(CORNER_PIECE_DIRECTIONS[locationKey] * 3 + AXIS_OF_DIRECTION[leadDirection]);
        break;
      }
      case 'edge': {
        const secondDirection = piece.stickers[leadStickerIndex === 0 ? 1 : 0].direction;
        const dirIndex = EDGE_PIECE_DIRECTIONS[leadDirection + secondDirection];
        if (dirIndex === undefined) {
          console.warn(`Direction key ${leadDirection + secondDirection} not found for edge piece at current index ${currentIndex}`);
          return null;
        }
        hash += hashChar(dirIndex);
        break;
      }
      case 'center':
        hash += hashChar(CENTER_PIECE_DIRECTIONS[leadDirection]);
        break;
    }
  }

  return hash;
}

export function readTopCenterInfo(pieces: PieceState[], rotation: string): TopInfo | null {
  for (let i = 20; i <= 25; i++) {
    const centerPiece = pieces[i];
    if (!centerPiece || centerPiece.type !== 'center' || centerPiece.stickers.length === 0) {
      continue;
    }

    if (centerPiece.stickers[0].direction === 'U') {
      const actualColor = centerPiece.stickers[0].colorName;
      const effectiveColor = actualToEffectiveColor(rotation, actualColor);
      return { actualColor, effectiveColor, direction: 'U' };
    }
  }

  console.warn('Unable to determine top center orientation');
  return null;
}

/**
 * Performs bitwise calculation to determine EO value.
 * EO value is a 12-bit number. The location of the bit is determined by (edgePieceDirections Mod 12)
 * Edge Oriented = 0, Not Oriented = 1.
 */
export function calcEOvalue(pieces: PieceState[], topInfo: TopInfo): number {
  const verticalColors: ColorName[] = [topInfo.actualColor as ColorName, getOppositeColor(topInfo.actualColor)];

  const xDirections: DirectionChar[] = ['R', 'L'];
  const xColors: ColorName[] = [];

  for (let i = 20; i <= 25; i++) {
    const centerPiece = pieces[i];
    if (!centerPiece || centerPiece.type !== 'center' || centerPiece.stickers.length === 0) {
      console.warn(`Center piece at index ${i} is not standard`);
      continue;
    }
    if (xDirections.includes(centerPiece.stickers[0].direction)) {
      xColors.push(centerPiece.stickers[0].colorName);
    }
  }

  if (xColors.length !== 2) {
    console.warn('Unable to determine x-direction colors for EO calculation');
    return -1;
  }

  let eoValue = 0;

  for (let i = 0; i < 12; i++) {
    const piece = pieces[i];
    if (!piece || piece.type !== 'edge') {
      console.warn(`Piece at index ${i} is not a valid edge for EO calculation`);
      return -1;
    }

    const directions = piece.stickers.map(sticker => sticker.direction);
    const edgeIndex = EDGE_PIECE_DIRECTIONS[directions.join('')] % 12;

    const isEdgeOriginVertical = piece.stickers.some(sticker => verticalColors.includes(sticker.colorName));
    const isEdgeInVertical = directions.includes('U') || directions.includes('D');

    let isOriented: boolean;
    if (isEdgeOriginVertical) {
      // must be a top/bottom edge
      const goodDirections: DirectionChar[] = isEdgeInVertical ? ['U', 'D'] : ['U', 'D', 'F', 'B'];
      isOriented = piece.stickers.some(sticker =>
        verticalColors.includes(sticker.colorName) && goodDirections.includes(sticker.direction)
      );
    } else {
      // must be f2l edge, must have x-color
      // f2l edge good if x-color faces x-direction in 2nd layer or x-color faces side direction in top/bottom layer
      const xColorSticker = piece.stickers.find(sticker => xColors.includes(sticker.colorName));
      if (!xColorSticker) throw new Error('X color sticker not found on edge piece during EO calculation');

      const goodDirections: DirectionChar[] = isEdgeInVertical ? ['L', 'R', 'F', 'B'] : xDirections;
      isOriented = goodDirections.includes(xColorSticker.direction);
    }

    if (!isOriented) {
      eoValue ^= (1 << edgeIndex);
    }
  }
  return eoValue;
}

export function readCube(cubeState: SimpleCubeState): CubeReading | null {
  const rotation = readCubeRotation(cubeState);
  if (!rotation) return null;

  const pieces = readPieces(cubeState);
  const pieceColorMapping = mapPiecesByColor(pieces, rotation);
  if (pieceColorMapping.size !== pieces.length) {
    console.warn('Piece mapping size does not match current pieces length');
    return null;
  }

  const hash = hashRecoloredPieces(pieces, pieceColorMapping);
  const topInfo = readTopCenterInfo(pieces, rotation);
  if (!hash || !topInfo) return null;

  return {
    state: { hash, rotation, eoValue: calcEOvalue(pieces, topInfo) },
    pieces,
    pieceColorMapping,
    topInfo,
  };
}

export function readHashState(cubeState: SimpleCubeState): HashState | null {
  return readCube(cubeState)?.state ?? null;
}

/**
 * Gets all currently solved pieces by comparing the hash to the solved hash.
 * @returns Array of piece indices that are solved. Index is hash position.
 */
export function findSolvedPieces(state: Pick<HashState, 'hash'>): number[] {
  const solvedPieces: number[] = [];
  for (let idx = 0; idx < state.hash.length; idx++) {
    if (state.hash[idx] === SOLVED_HASH[idx]) solvedPieces.push(idx);
  }
  return solvedPieces;
}

export function calcCrossColorsSolved(state: Pick<HashState, 'hash' | 'rotation'>): string[] {
  const solvedPieces = findSolvedPieces(state);

  return Object.keys(CROSS_PIECE_INDICES)
    .filter(key => key.split(',').every(indexStr => solvedPieces.includes(Number(indexStr))))
    .map(key => effectiveToActualColor(state.rotation, CROSS_PIECE_INDICES[key]));
}

export interface F2LPairStatus {
  pairColors: [string, string];
  pairIndices: [number, number];
  isSolved: boolean;
}

/**
 * Get the indices of pieces where their f2l pair is not solved.
 * @param crossColor The actual color of the cross
 * @returns Dictionary for each pair, containing colors, indices, and solve status
 */
export function getF2LPairStatus(state: Pick<HashState, 'hash' | 'rotation'>, crossColor: string): F2LPairStatus[] {
  const slots = F2L_SLOTS[actualToEffectiveColor(state.rotation, crossColor)];
  if (!slots) {
    console.warn(`No F2L slots found for color: ${crossColor}`);
    return [{ pairColors: ['', ''], pairIndices: [-1, -1], isSolved: false }];
  }

  const solvedIndices = findSolvedPieces(state);

  return slots.map(slot => ({
    pairColors: [
      effectiveToActualColor(state.rotation, slot.slotColors[0]),
      effectiveToActualColor(state.rotation, slot.slotColors[1]),
    ],
    pairIndices: [slot.corner, slot.edge],
    isSolved: solvedIndices.includes(slot.corner) && solvedIndices.includes(slot.edge),
  }));
}

const faceletOf = (face: number, row: number, col: number) => face * 9 + row * 3 + col;

interface FaceletHashTables {
  charAtFacelet: Uint8Array;
  leadStickerByRotation: Map<string, Uint8Array>;
  rotationByCenters: (string | undefined)[];
}

// each hash character is read from one lead sticker: the sticker of the matching effective piece that has the effective primary color. The lead sticker differs per rotation, and its current position gives the character.
function buildFaceletHashTables(): FaceletHashTables {
  const charAtFacelet = new Uint8Array(FACELET_COUNT);
  const edgeFaceletOn = new Map<string, number>();
  const cornerFaceletOn = new Map<string, number>();

  EDGE_POSITIONS.forEach(([f1, r1, c1, d1, f2, r2, c2, d2]) => {
    const p1 = faceletOf(f1, r1, c1);
    const p2 = faceletOf(f2, r2, c2);
    charAtFacelet[p1] = EDGE_PIECE_DIRECTIONS[d1 + d2];
    charAtFacelet[p2] = EDGE_PIECE_DIRECTIONS[d2 + d1];
    edgeFaceletOn.set(`${f1},${f2}`, p1);
    edgeFaceletOn.set(`${f2},${f1}`, p2);
  });

  CORNER_POSITIONS.forEach(([f1, r1, c1, d1, f2, r2, c2, d2, f3, r3, c3, d3]) => {
    const location = CORNER_PIECE_DIRECTIONS[[d1, d2, d3].sort().join('')];
    const faces = sortedKey([f1, f2, f3]);
    ([[f1, r1, c1, d1], [f2, r2, c2, d2], [f3, r3, c3, d3]] as const).forEach(([f, r, c, d]) => {
      const p = faceletOf(f, r, c);
      charAtFacelet[p] = location * 3 + AXIS_OF_DIRECTION[d];
      cornerFaceletOn.set(`${faces}|${f}`, p);
    });
  });

  CENTER_POSITIONS.forEach(([f, r, c, d]) => {
    charAtFacelet[faceletOf(f, r, c)] = CENTER_PIECE_DIRECTIONS[d];
  });

  const leadStickerByRotation = new Map<string, Uint8Array>();
  ROTATION_COLOR_MAP.forEach((map, rotation) => {
    const lead = new Uint8Array(SOLVED_HASH.length);
    EDGE_COLORS.forEach(([p1, p2], i) => {
      lead[i] = edgeFaceletOn.get(`${map[p1]},${map[p2]}`)!;
    });
    CORNER_COLORS.forEach(([p1, p2, p3], i) => {
      lead[12 + i] = cornerFaceletOn.get(`${sortedKey([map[p1], map[p2], map[p3]])}|${map[p1]}`)!;
    });
    CENTER_COLORS.forEach((color, i) => {
      lead[20 + i] = faceletOf(map[color], 1, 1);
    });
    leadStickerByRotation.set(rotation, lead);
  });

  const rotationByCenters: (string | undefined)[] = [];
  for (let u = 0; u < 6; u++) {
    for (let f = 0; f < 6; f++) {
      rotationByCenters[u * 6 + f] = CUBE_ROTATION_MAP.get(`${faceIdxToColorChar[u]},${faceIdxToColorChar[f]}`);
    }
  }

  return { charAtFacelet, leadStickerByRotation, rotationByCenters };
}

const faceletHashTables = buildFaceletHashTables();

const U_CENTER = faceletOf(0, 1, 1);
const F_CENTER = faceletOf(2, 1, 1);
const R_CENTER = faceletOf(3, 1, 1);
const L_CENTER = faceletOf(5, 1, 1);
const OPPOSITE_FACE = [1, 0, 4, 5, 2, 3];
const VERTICAL_DIRECTIONS = new Set<DirectionChar>(['U', 'D']);
const SIDE_DIRECTIONS = new Set<DirectionChar>(['L', 'R', 'F', 'B']);
const X_DIRECTIONS = new Set<DirectionChar>(['L', 'R']);
const UD_OR_FB_DIRECTIONS = new Set<DirectionChar>(['U', 'D', 'F', 'B']);

const EDGE_FACELETS = EDGE_POSITIONS.map(([f1, r1, c1, d1, f2, r2, c2, d2]) => ({
  first: faceletOf(f1, r1, c1),
  second: faceletOf(f2, r2, c2),
  firstDirection: d1,
  secondDirection: d2,
  isVertical: VERTICAL_DIRECTIONS.has(d1) || VERTICAL_DIRECTIONS.has(d2),
}));

function eoValueFromFacelets(facelets: Facelets): number {
  const topFace = faceOfSticker(facelets[U_CENTER]);
  const bottomFace = OPPOSITE_FACE[topFace];
  const xFaceA = faceOfSticker(facelets[R_CENTER]);
  const xFaceB = faceOfSticker(facelets[L_CENTER]);
  const isVerticalFace = (face: number) => face === topFace || face === bottomFace;
  const isXFace = (face: number) => face === xFaceA || face === xFaceB;

  let eoValue = 0;
  EDGE_FACELETS.forEach(({ first, second, firstDirection, secondDirection, isVertical }, location) => {
    const firstFace = faceOfSticker(facelets[first]);
    const secondFace = faceOfSticker(facelets[second]);

    let isOriented: boolean;
    if (isVerticalFace(firstFace) || isVerticalFace(secondFace)) {
      const goodDirections = isVertical ? VERTICAL_DIRECTIONS : UD_OR_FB_DIRECTIONS;
      isOriented = (isVerticalFace(firstFace) && goodDirections.has(firstDirection))
        || (isVerticalFace(secondFace) && goodDirections.has(secondDirection));
    } else {
      const xDirection = isXFace(firstFace) ? firstDirection : secondDirection;
      isOriented = (isVertical ? SIDE_DIRECTIONS : X_DIRECTIONS).has(xDirection);
    }

    if (!isOriented) eoValue |= 1 << location;
  });
  return eoValue;
}

export function readHashStateFromFacelets(facelets: Facelets): HashState | null {
  const { charAtFacelet, leadStickerByRotation, rotationByCenters } = faceletHashTables;
  const rotation = rotationByCenters[faceOfSticker(facelets[U_CENTER]) * 6 + faceOfSticker(facelets[F_CENTER])];
  if (!rotation) return null;

  const positionOfSticker = new Uint8Array(FACELET_COUNT);
  for (let position = 0; position < FACELET_COUNT; position++) {
    positionOfSticker[facelets[position]] = position;
  }

  const lead = leadStickerByRotation.get(rotation)!;
  const charCodes = new Array<number>(lead.length);
  for (let i = 0; i < lead.length; i++) {
    charCodes[i] = 97 + charAtFacelet[positionOfSticker[lead[i]]];
  }

  return { hash: String.fromCharCode(...charCodes), rotation, eoValue: eoValueFromFacelets(facelets) };
}
