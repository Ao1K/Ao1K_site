import AlgSuggester from './ExactAlgSuggester';
import type { Doc, Constraint, Query } from './ExactAlgSuggester';
import AlgSpeedEstimator from './AlgSpeedEstimator';
import type { Grid } from './LLinterpreter';
import LLinterpreter from './LLinterpreter';
import LLsuggester from './LLsuggester';
import type { CubeState as SimpleCubeState, Color } from './SimpleCube';

export interface Suggestion {
  alg: string;
  time: number;
  steps: string[];
  name?: string;
  hasEOsolved?: boolean;
}

type ColorName = 'white' | 'yellow' | 'red' | 'orange' | 'green' | 'blue';
type DirectionChar = 'U' | 'D' | 'L' | 'R' | 'F' | 'B';

// Block pattern types for Roux-style blocks
type BlockOrigin = 'UFL' | 'UFR' | 'DFR' | 'DFL';
type Face = [string, string, string, string, string, string, string, string, string]; // 9 stickers, reading top-left to bottom-right when facing the face
export type BlockPattern = {
  origin: BlockOrigin;
  U?: Face;
  D?: Face;
  F?: Face;
  B?: Face;
  L?: Face;
  R?: Face;
};

// maps single-char color codes to full color names
const colorCharToName: { [key in Color]: ColorName } = {
  'W': 'white',
  'Y': 'yellow',
  'R': 'red',
  'O': 'orange',
  'G': 'green',
  'B': 'blue'
};

interface StickerState {
  faceIdx: number;
  colorName: ColorName;
  direction: DirectionChar;
}

interface PieceState {
  type: 'corner' | 'edge' | 'center';
  origin: string; // e.g. 'UFR', 'FR', 'U'
  stickers: StickerState[];
}

interface CubeState {
  hash: string;
}

/**
 * Represents a connected block on the cube.
 * A block is "solid" when adjacent pieces have matching colors on their shared faces.
 * origin: [x, y, z] position of the piece in the block closest to (0,0,0)
 * where 0,0,0 = UFL corner (x: 0=L, y: 0=U, z: 0=F)
 * dimensions: maps each face direction to a string containing the color and dimension size
 *   e.g., { L: "B3", U: "W2", F: "R1" } means the block spans:
 *   3 pieces on the L (left) face with blue color
 *   2 pieces on the U (up) face with white color
 *   1 piece on the F (front) face with red color
 * blockPattern: the 3 faces that compose the block, each with 9 stickers (empty string if not part of block)
 */
export interface Block {
  origin: [number, number, number]; // position of piece closest to (0,0,0)
  dimensions: Partial<Record<DirectionChar, [Color, number]>>; // Maps face directions to "Color+Size" strings (e.g., "B3")
  blockPattern?: BlockPattern; // The 3 faces of the block with color patterns
}

// 6 rows × 5 cols grid. Middle 3 cols = U face (rows 0-2) then F face (rows 3-5).
// Col 0 = L stickers adjacent to U/F, col 4 = R stickers adjacent to U/F.
// Cells [3][0] and [3][4] are 0 (blank) — the wrap-around gap between U and F on the sides.
export type LSEPattern = number[][];

export type F2LDirection = 'front' | 'back' | 'left' | 'right';

export interface StepInfo {
  step: string;
  type: 'cross' | 'f2l' | 'last layer' | 'solved' | 'none' | 'genericEO' | 'block' | 'genericBlock' | 'lse' | 'cmll' | 'eoLine';
  colors: string[];
  caseIndex?: number;
  name?: string; // Optional name for cases (OLL/PLL names)
  nameType?: 'oll' | 'pll';
  blockPattern?: BlockPattern;
  lsePattern?: LSEPattern;
  gridPattern?: Grid;
  f2lSlotList?: Partial<Record<F2LDirection, string>>[];
}

/**
 * Interprets SimpleCube state to determine solve progress and suggest algorithms.
 */
export class SimpleCubeInterpreter {
  private cubeState: SimpleCubeState | null = null;
  private solvedState: CubeState = { hash: '' };

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
  private readonly solved3x3Hash = 'abcdefghijklehkbnqtwabcdef';
  private currentState: CubeState | null = { hash: this.solved3x3Hash };
  public currentCubeRotation: string | number = -1;
  private algSuggester: AlgSuggester | null = null;
  private LLsuggester: LLsuggester | null = null;

  // standard facelets mapping (face index to color name for solved cube)
  private readonly facelets: { faceIdx: number; colorName: string }[] = [
    { faceIdx: 0, colorName: 'white' },   // U
    { faceIdx: 1, colorName: 'yellow' },  // D
    { faceIdx: 2, colorName: 'green' },   // F
    { faceIdx: 3, colorName: 'red' },     // R
    { faceIdx: 4, colorName: 'blue' },    // B
    { faceIdx: 5, colorName: 'orange' },  // L
  ];
  private currentPieces: PieceState[] = [];
  private pieceColorMapping: Map<number, { effectivePieceIndex: number, stickerOrder: string[] }> = new Map();

  /**
   * Maps edge piece positions to their sticker locations in SimpleCubeState.
   * Each entry: [face1, row1, col1, dir1, face2, row2, col2, dir2]
   * face indices: 0=U, 1=D, 2=F, 3=R, 4=B, 5=L
   */
  private readonly edgePositions: [number, number, number, DirectionChar, number, number, number, DirectionChar][] = [
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
  private readonly cornerPositions: [number, number, number, DirectionChar, number, number, number, DirectionChar, number, number, number, DirectionChar][] = [
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
  private readonly centerPositions: [number, number, number, DirectionChar][] = [
    [0, 1, 1, 'U'], // 20: U center
    [5, 1, 1, 'L'], // 21: L center
    [2, 1, 1, 'F'], // 22: F center
    [3, 1, 1, 'R'], // 23: R center
    [4, 1, 1, 'B'], // 24: B center
    [1, 1, 1, 'D'], // 25: D center
  ];

  private LLinterpreter = new LLinterpreter();

  // maps faceIdx to effective faceIdx after rotation
  // indices: 0=U(white), 1=D(yellow), 2=F(green), 3=R(red), 4=B(blue), 5=L(orange)
  private readonly rotationColorMap = new Map<string, number[]>([
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
  private readonly cubeRotationMap = new Map<string, string>([
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

  private crossColorsSolved: string[] = [];
  private blocksSolved: Block[] = [];
  private topInfo: { actualColor: string; effectiveColor: string; direction: string } = { actualColor: '', effectiveColor: '', direction: '' };
  private eoValue: number = -1;

  private readonly edgePieceDirections: { [key: string]: number } = {
    'UF': 0, 'UR': 1, 'UB': 2, 'UL': 3,
    'DF': 4, 'DR': 5, 'DB': 6, 'DL': 7,
    'FR': 8, 'FL': 9, 'BR': 10, 'BL': 11,
    'FU': 12, 'RU': 13, 'BU': 14, 'LU': 15,
    'FD': 16, 'RD': 17, 'BD': 18, 'LD': 19,
    'RF': 20, 'LF': 21, 'RB': 22, 'LB': 23
  };

  private readonly centerPieceDirections: { [key: string]: number } = {
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
  private readonly cornerPieceDirections: { [key: string]: number } = {
    'FLU': 0, // 'UFL': 0,
    'FRU': 1, // 'URF': 1,
    'BRU': 2, // 'UBR': 2,
    'BLU': 3, // 'ULB': 3,
    'DFR': 4, // 'DFR': 4,
    'DFL': 5, // 'DLF': 5,
    'BDL': 6, // 'DBL': 6,
    'BDR': 7, // 'DRB': 7,
  };

  // reverse mappings for hash decoding (initialized in constructor)
  private readonly edgeIdxToDir: string[];
  private readonly centerIdxToDir: string[];
  private readonly cornerLocToDir: string[];

  // 3D position lookups for block detection
  // coordinate system: x: 0=L, 1=center, 2=R | y: 0=U, 1=center, 2=D | z: 0=F, 1=center, 2=B
  private readonly centerDirToCoord: Record<string, [number, number, number]> = {
    'U': [1, 0, 1], 'D': [1, 2, 1], 'F': [1, 1, 0],
    'B': [1, 1, 2], 'L': [0, 1, 1], 'R': [2, 1, 1],
  };

  // edge slot (0-11) → position
  private readonly edgeLocToCoord: [number, number, number][] = [
    [1, 0, 0], [2, 0, 1], [1, 0, 2], [0, 0, 1], // UF, UR, UB, UL
    [1, 2, 0], [2, 2, 1], [1, 2, 2], [0, 2, 1], // DF, DR, DB, DL
    [2, 1, 0], [0, 1, 0], [2, 1, 2], [0, 1, 2], // FR, FL, BR, BL
  ];

  // corner slot (0-7) → position
  private readonly cornerLocToCoord: [number, number, number][] = [
    [0, 0, 0], [2, 0, 0], [2, 0, 2], [0, 0, 2], // UFL, UFR, UBR, UBL
    [2, 2, 0], [0, 2, 0], [0, 2, 2], [2, 2, 2], // DFR, DFL, DBL, DBR
  ];

  /**
   * Used for determining if last layer corners and edges are correctly permuted.
   */
  private readonly effectiveColorOrder: string[] = ['green', 'red', 'blue', 'orange'];
  private readonly lastLayerEdgeOrder: string[] = ['UF', 'UR', 'UB', 'UL'];
  private readonly lastLayerCornerOrder: string[] = ['UFR', 'UBR', 'UBL', 'UFL'];

  // grid color indices used for icon rendering (gridColorMap in stepIconDescriptors)
  private readonly gridColorIndex: Record<string, number> = {
    'white': 1, 'yellow': 2, 'green': 3, 'blue': 4, 'red': 5, 'orange': 6
  };

  // clockwise side color order (F, R, B, L) for each top color.
  // any rotation that gives the same top produces a cyclic shift, handled by offset loop.
  private readonly sideColorOrderByTop: Record<string, string[]> = {
    'white': ['green', 'red', 'blue', 'orange'],
    'yellow': ['blue', 'red', 'green', 'orange'],
    'green': ['yellow', 'red', 'white', 'orange'],
    'blue': ['white', 'red', 'yellow', 'orange'],
    'red': ['green', 'yellow', 'blue', 'white'],
    'orange': ['green', 'white', 'blue', 'yellow'],
  };

  /**
   * In practice, since cross is mostly on down face, effective color for cross
   * is mostly yellow.
   */
  private readonly crossPieceIndices: { [key: string]: string } = {
    // colors returned are the effective colors after cube rotation
    '0,1,2,3': 'white', // up
    '4,5,6,7': 'yellow', // down
    '0,4,8,9': 'green', // front
    '1,5,8,10': 'red', // right
    '2,6,10,11': 'blue', // back
    '3,7,9,11': 'orange' // left
  };

  private readonly eoLinePieceIndices: { [key: string]: string } = {
    // only down face edges are valid, because who would possibly do
    // EOLine on side? No, we're not going to support that behavior.
    '4,6': 'yellow,vertical', // down front, down back
    '5,7': 'yellow,horizontal', // down right, down left
  };

  /**
   * F2L slots organized by corner-edge pairs
   * Each slot contains a corner and edge that solve together
   * In the current form, only yellow should be used because we assume cross on bottom.
   */
  private readonly f2lSlots: { [key: string]: { corner: number, edge: number, slotColors: [string, string] }[] } = {
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

  constructor(algs: Doc[] = []) {
    this.solvedState = { hash: this.solved3x3Hash };

    // build reverse mappings for hash decoding
    this.edgeIdxToDir = [];
    for (const [dir, idx] of Object.entries(this.edgePieceDirections)) {
      this.edgeIdxToDir[idx] = dir;
    }

    this.centerIdxToDir = [];
    for (const [dir, idx] of Object.entries(this.centerPieceDirections)) {
      this.centerIdxToDir[idx] = dir;
    }

    this.cornerLocToDir = [];
    for (const [dir, slot] of Object.entries(this.cornerPieceDirections)) {
      this.cornerLocToDir[slot] = dir;
    }

    if (algs.length > 0) {
      this.algSuggester = new AlgSuggester(algs);
    }
  }

  /**
   * Extracts pieces from the SimpleCubeState using position mappings.
   * Pieces are indexed by their colors (not location), matching the hash paradigm.
   */
  private getPieces(): PieceState[] {
    if (!this.cubeState) {
      console.warn('No cube state available');
      return [];
    }

    // color sets that define each piece index (sorted for matching)
    // edges 0-11
    const edgeColors: [number, number][] = [
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

    // corners 12-19
    const cornerColors: [number, number, number][] = [
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
    const centerColors: number[] = [0, 5, 2, 3, 4, 1];

    // extract all edges by location first
    const edgesByLocation: PieceState[] = [];
    for (let i = 0; i < this.edgePositions.length; i++) {
      const [f1, r1, c1, d1, f2, r2, c2, d2] = this.edgePositions[i];
      const color1 = this.cubeState[f1][r1][c1];
      const color2 = this.cubeState[f2][r2][c2];

      edgesByLocation.push({
        type: 'edge',
        origin: d1 + d2,
        stickers: [
          { faceIdx: this.colorCharToFaceIdx(color1), colorName: colorCharToName[color1], direction: d1 },
          { faceIdx: this.colorCharToFaceIdx(color2), colorName: colorCharToName[color2], direction: d2 },
        ]
      });
    }

    // extract all corners by location
    const cornersByLocation: PieceState[] = [];
    for (let i = 0; i < this.cornerPositions.length; i++) {
      const [f1, r1, c1, d1, f2, r2, c2, d2, f3, r3, c3, d3] = this.cornerPositions[i];
      const color1 = this.cubeState[f1][r1][c1];
      const color2 = this.cubeState[f2][r2][c2];
      const color3 = this.cubeState[f3][r3][c3];

      cornersByLocation.push({
        type: 'corner',
        origin: d1 + d2 + d3,
        stickers: [
          { faceIdx: this.colorCharToFaceIdx(color1), colorName: colorCharToName[color1], direction: d1 },
          { faceIdx: this.colorCharToFaceIdx(color2), colorName: colorCharToName[color2], direction: d2 },
          { faceIdx: this.colorCharToFaceIdx(color3), colorName: colorCharToName[color3], direction: d3 },
        ]
      });
    }

    // extract all centers by location
    const centersByLocation: PieceState[] = [];
    for (let i = 0; i < this.centerPositions.length; i++) {
      const [f, r, c, d] = this.centerPositions[i];
      const color = this.cubeState[f][r][c];

      centersByLocation.push({
        type: 'center',
        origin: d,
        stickers: [
          { faceIdx: this.colorCharToFaceIdx(color), colorName: colorCharToName[color], direction: d },
        ]
      });
    }

    // now assign pieces to correct indices based on their colors
    const pieces: PieceState[] = new Array(26);

    // assign edges by color, reordering stickers so primary color is first
    for (let targetIdx = 0; targetIdx < 12; targetIdx++) {
      const [primaryColor, secondaryColor] = edgeColors[targetIdx];
      const targetSet = [primaryColor, secondaryColor].sort().join(',');

      for (const edge of edgesByLocation) {
        const edgeSet = edge.stickers.map(s => s.faceIdx).sort().join(',');
        if (edgeSet === targetSet) {
          // reorder stickers so primary color sticker is first
          const reorderedStickers = edge.stickers[0].faceIdx === primaryColor
            ? [...edge.stickers]
            : [edge.stickers[1], edge.stickers[0]];

          pieces[targetIdx] = {
            ...edge,
            stickers: reorderedStickers
          };
          break;
        }
      }
    }

    // assign corners by color, reordering stickers so primary color is first
    for (let targetIdx = 0; targetIdx < 8; targetIdx++) {
      const [primaryColor, secondaryColor, tertiaryColor] = cornerColors[targetIdx];
      const targetSet = [primaryColor, secondaryColor, tertiaryColor].sort().join(',');

      for (const corner of cornersByLocation) {
        const cornerSet = corner.stickers.map(s => s.faceIdx).sort().join(',');
        if (cornerSet === targetSet) {
          // reorder stickers so primary color sticker is first
          const primaryIdx = corner.stickers.findIndex(s => s.faceIdx === primaryColor);
          const reorderedStickers = [
            corner.stickers[primaryIdx],
            ...corner.stickers.filter((_, i) => i !== primaryIdx)
          ];

          pieces[12 + targetIdx] = {
            ...corner,
            stickers: reorderedStickers
          };
          break;
        }
      }
    }

    // assign centers by color
    for (let targetIdx = 0; targetIdx < 6; targetIdx++) {
      const targetColor = centerColors[targetIdx];

      for (const center of centersByLocation) {
        if (center.stickers[0].faceIdx === targetColor) {
          pieces[20 + targetIdx] = center;
          break;
        }
      }
    }

    return pieces;
  }

  /**
   * Maps color character to face index (the face that color belongs to when solved).
   */
  private colorCharToFaceIdx(color: Color): number {
    switch (color) {
      case 'W': return 0; // U
      case 'Y': return 1; // D
      case 'G': return 2; // F
      case 'R': return 3; // R
      case 'B': return 4; // B
      case 'O': return 5; // L
    }
  }

  /**
   * Gets the direction a sticker is facing based on piece index and sticker index.
   */
  private getFaceletDirection(pieceIndex: number, stickerIndex: number): DirectionChar | null {
    const piece = this.currentPieces[pieceIndex];
    if (!piece || !piece.stickers || stickerIndex >= piece.stickers.length) {
      console.warn(`Invalid piece or sticker index: piece ${pieceIndex}, sticker ${stickerIndex}`);
      return null;
    }
    return piece.stickers[stickerIndex].direction;
  }

  /**
   * Uses current rotation to map colors to their effective colors.
   * Then maps each piece in currentPieces to its corresponding piece of effective colors.
   */
  private mapPiecesByColor = (): Map<number, { effectivePieceIndex: number, stickerOrder: string[] }> => {

    const pieceMapping = new Map<number, { effectivePieceIndex: number, stickerOrder: string[] }>();
    const colorMapping = this.rotationColorMap.get(this.currentCubeRotation as string);

    if (!colorMapping) {
      console.error('No color mapping found for current rotation:', this.currentCubeRotation);
      return pieceMapping;
    }

    this.currentPieces.forEach((currentPiece, currentIndex) => {

      // save order of colors on each piece for later
      const stickerOrder: string[] = [];
      currentPiece.stickers.forEach((sticker) => {
        const effectiveColorIdx = colorMapping[sticker.faceIdx].toString();
        stickerOrder.push(effectiveColorIdx);
      });

      // find which piece these colors match
      const sortedStickers = [...stickerOrder].sort().join(',');

      for (let i = 0; i < this.currentPieces.length; i++) {
        const pieceToCheck = this.currentPieces[i];
        if (pieceToCheck.type !== currentPiece.type) {
          continue; // types must match
        }
        const stickersToCheck = pieceToCheck.stickers.map(s => s.faceIdx).sort().join(',');
        if (stickersToCheck === sortedStickers) {
          pieceMapping.set(currentIndex, { effectivePieceIndex: i, stickerOrder });
          break;
        }
        if (i === this.currentPieces.length - 1) {
          console.warn('No matching original piece found for current piece:', currentPiece);
        }
      }
    });

    return pieceMapping;
  }

  private calcCrossColorsSolved(): string[] {
    const solvedPieces = this.getSolvedPieces();

    const effectiveColorsSolved: string[] = [];

    Object.keys(this.crossPieceIndices).forEach((key) => {
      let piecesSolved = 0;
      key.split(',').forEach((indexStr) => {
        const index = parseInt(indexStr, 10);
        if (solvedPieces.includes(index)) {
          piecesSolved++;
        }
      });

      if (piecesSolved === key.split(',').length) {
        // entire cross is solved
        effectiveColorsSolved.push(this.crossPieceIndices[key]);
      }
    });

    // Map effective colors to actual colors based on cube rotation
    const actualColorsSolved = effectiveColorsSolved.map(effectiveColor =>
      this.mapEffectiveColorToActual(effectiveColor)
    );

    return actualColorsSolved;
  }

  /**
   * Calculates all the blocks (1x2x2 or larger) solved on the cube.
   * Decodes piece positions from the hash instead of iterating through stickers.
   * Uses flood-fill to find connected pieces with matching colors on shared faces.
   */
  private calcBlocksSolved(): Block[] {
    if (!this.currentState?.hash) {
      return [];
    }

    const hash = this.currentState.hash;

    type PieceInfo = {
      type: 'center' | 'edge' | 'corner';
      pieceIdx: number;
      coord: [number, number, number];
      coordKey: string;
      blockIds: Set<number>;
    };

    const pieces = new Map<string, PieceInfo>();

    // decode edges from hash (indices 0-11)
    for (let i = 0; i < 12; i++) {
      const charCode = hash.charCodeAt(i) - 'a'.charCodeAt(0);
      const loc = charCode % 12;
      const coord = this.edgeLocToCoord[loc];
      const dir = this.edgeIdxToDir[charCode];
      const effectiveIdx = this.pieceColorMapping.get(i)!.effectivePieceIndex;
      if (coord && dir) {
        const sortedDir = dir.split('').sort().join('');
        pieces.set(`edge:${sortedDir}`, { type: 'edge', pieceIdx: effectiveIdx, coord, coordKey: coord.join(','), blockIds: new Set() });
      }
    }

    // decode corners from hash (indices 12-19)
    for (let i = 12; i < 20; i++) {
      const charCode = hash.charCodeAt(i) - 'a'.charCodeAt(0);
      const loc = Math.floor(charCode / 3);
      const coord = this.cornerLocToCoord[loc];
      const dir = this.cornerLocToDir[loc];
      const effectiveIdx = this.pieceColorMapping.get(i)!.effectivePieceIndex;
      if (coord && dir) {
        pieces.set(`corner:${dir}`, { type: 'corner', pieceIdx: effectiveIdx, coord, coordKey: coord.join(','), blockIds: new Set() });
      }
    }

    // decode centers from hash (indices 20-25)
    for (let i = 20; i < 26; i++) {
      const charCode = hash.charCodeAt(i) - 'a'.charCodeAt(0);
      const dir = this.centerIdxToDir[charCode] as DirectionChar;
      const coord = this.centerDirToCoord[dir];
      const effectiveIdx = this.pieceColorMapping.get(i)!.effectivePieceIndex;
      if (coord && dir) {
        pieces.set(`center:${dir}`, { type: 'center', pieceIdx: effectiveIdx, coord, coordKey: coord.join(','), blockIds: new Set() });
      }
    }

    // Helper: Get color of a piece's sticker facing a specific direction
    const getPieceStickerColor = (pieceIdx: number, dir: DirectionChar): Color | null => {
      const piece = this.currentPieces[pieceIdx];
      if (!piece) return null;
      for (const sticker of piece.stickers) {
        if (sticker.direction === dir) {
          return Object.keys(colorCharToName).find(
            key => colorCharToName[key as Color] === sticker.colorName
          ) as Color;
        }
      }
      return null;
    };

    // Helper: Get the shared face directions between two adjacent positions
    const getSharedDirections = (pos1: [number, number, number], pos2: [number, number, number]): DirectionChar[] => {
      const sharedDirs: DirectionChar[] = [];

      // x axis: if same x, they share either L or R face
      if (pos1[0] === pos2[0]) {
        if (pos1[0] === 0) sharedDirs.push('L');
        else if (pos1[0] === 2) sharedDirs.push('R');
      }

      // y axis: if same y, they share either U or D face
      if (pos1[1] === pos2[1]) {
        if (pos1[1] === 0) sharedDirs.push('U');
        else if (pos1[1] === 2) sharedDirs.push('D');
      }

      // z axis: if same z, they share either F or B face
      if (pos1[2] === pos2[2]) {
        if (pos1[2] === 0) sharedDirs.push('F');
        else if (pos1[2] === 2) sharedDirs.push('B');
      }

      return sharedDirs;
    };

    // Helper: Check if two pieces connect (matching colors on shared faces)
    const piecesConnect = (info1: PieceInfo, info2: PieceInfo): boolean => {
      const sharedDirs = getSharedDirections(info1.coord, info2.coord);
      if (sharedDirs.length === 0) return false;

      for (const dir of sharedDirs) {
        const color1 = getPieceStickerColor(info1.pieceIdx, dir);
        const color2 = getPieceStickerColor(info2.pieceIdx, dir);

        if (color1 !== color2) {
          return false;
        }
      }

      return true;
    };

    // Helper: Check if two positions are adjacent (Manhattan distance of 1)
    const areAdjacent = (pos1: [number, number, number], pos2: [number, number, number]): boolean => {
      const dist = Math.abs(pos1[0] - pos2[0]) + Math.abs(pos1[1] - pos2[1]) + Math.abs(pos1[2] - pos2[2]);
      return dist === 1;
    };

    // Helper: Find all pieces adjacent to a given position
    const getAdjacentPieces = (pos: [number, number, number]): PieceInfo[] => {
      const adjacent: PieceInfo[] = [];
      for (const info of pieces.values()) {
        if (areAdjacent(pos, info.coord)) {
          adjacent.push(info);
        }
      }
      return adjacent;
    };

    // BFS flood-fill to assign block IDs to connected pieces
    let nextBlockId = 0;

    const floodFill = (startInfo: PieceInfo, blockId: number): void => {
      const inThisBlock = new Set<string>();

      startInfo.blockIds.add(blockId);
      inThisBlock.add(startInfo.coordKey);

      const queue: PieceInfo[] = [startInfo];

      while (queue.length > 0) {
        const current = queue.shift()!;

        // don't find adjacent via center pieces due to 
        // possible incorrect color order of connected edges
        const isCenter = current.type === 'center';
        const adjacentPieces = isCenter ? [] : getAdjacentPieces(current.coord);

        for (const adj of adjacentPieces) {
          if (inThisBlock.has(adj.coordKey)) continue;
          // centers can belong to multiple blocks since they sit between groups,
          // but non-center pieces should only belong to one block
          if (adj.blockIds.size > 0 && adj.type !== 'center') continue;

          if (piecesConnect(current, adj)) {
            adj.blockIds.add(blockId);
            inThisBlock.add(adj.coordKey);
            queue.push(adj);
          }
        }
      }
    };

    // Helper: Get piece at a specific position
    const getPieceAtPos = (pos: [number, number, number]): PieceInfo | undefined => {
      for (const info of pieces.values()) {
        if (info.coord[0] === pos[0] && info.coord[1] === pos[1] && info.coord[2] === pos[2]) {
          return info;
        }
      }
      return undefined;
    };

    // Helper: Get any unassigned corner piece
    const getUnassignedCornerPiece = (): PieceInfo | undefined => {
      for (const info of pieces.values()) {
        if (info.type === 'corner' && info.blockIds.size === 0) {
          return info;
        }
      }
      return undefined;
    };

    // TODO: Delete this
    // Start from the piece at origin (0,0,0) - this is the UFL corner
    const originPiece = getPieceAtPos([0, 0, 0]);
    if (originPiece) {
      const blockId = nextBlockId++;
      floodFill(originPiece, blockId);
    }

    // Continue assigning blocks until all corner pieces are assigned
    let unassignedPiece = getUnassignedCornerPiece();
    while (unassignedPiece) {
      const blockId = nextBlockId++;
      floodFill(unassignedPiece, blockId);
      unassignedPiece = getUnassignedCornerPiece();
    }

    // log flood fill pattern as 3D cube representation
    // build position -> blockId map
    // const coordToBlock = new Map<string, string>();
    // for (const info of pieces.values()) {
    //   const coordKey = info.coord.join(',');
    //   const blockStr = info.blockIds.size > 0 ? Array.from(info.blockIds).sort().join('') : '.';
    //   coordToBlock.set(coordKey, blockStr);
    // }
    // console.log('Flood fill (layers F→B, rows U→D, cols L→R):');
    // for (let z = 0; z < 3; z++) {
    //   const layerName = z === 0 ? 'Front' : z === 1 ? 'Middle' : 'Back';
    //   let layer = `  ${layerName}:\n`;
    //   for (let y = 0; y < 3; y++) {
    //     let row = '    ';
    //     for (let x = 0; x < 3; x++) {
    //       const val = coordToBlock.get(`${x},${y},${z}`) ?? '-';
    //       row += val.padStart(3) + ' ';
    //     }
    //     layer += row + '\n';
    //   }
    //   console.log(layer);
    // }

    // Collect pieces by block ID
    const blockPieces = new Map<number, PieceInfo[]>();
    for (const info of pieces.values()) {
      for (const blockId of info.blockIds) {
        if (!blockPieces.has(blockId)) {
          blockPieces.set(blockId, []);
        }
        blockPieces.get(blockId)!.push(info);
      }
    }

    // Find valid rectangular sub-regions within each connected group
    const validBlocks: Block[] = [];
    for (const [, blockPieceList] of blockPieces) {
      validBlocks.push(...this.findBlockRects(blockPieceList, getPieceStickerColor));
    }

    return validBlocks;
  }

  /**
   * Given a connected group of pieces, finds all valid solid rectangular
   * sub-regions and computes their dimensions and face colors.
   */
  private findBlockRects(
    blockPieceList: { pieceIdx: number; coord: [number, number, number]; coordKey: string }[],
    getPieceStickerColor: (pieceIdx: number, dir: DirectionChar) => Color | null,
  ): Block[] {
    const positionsInBlock = new Set<string>();
    for (const piece of blockPieceList) {
      positionsInBlock.add(piece.coordKey);
    }

    const isSubRectSolid = (
      x1: number, x2: number,
      y1: number, y2: number,
      z1: number, z2: number
    ): boolean => {
      for (let x = x1; x <= x2; x++) {
        for (let y = y1; y <= y2; y++) {
          for (let z = z1; z <= z2; z++) {
            // skip internal center position (1,1,1) - no piece exists there
            if (x === 1 && y === 1 && z === 1) continue;
            if (!positionsInBlock.has(`${x},${y},${z}`)) {
              return false;
            }
          }
        }
      }
      return true;
    };

    const getBlockFaceColor = (pieces: typeof blockPieceList, dir: DirectionChar): Color | null => {
      for (const piece of pieces) {
        const color = getPieceStickerColor(piece.pieceIdx, dir);
        if (color !== null) return color;
      }
      return null;
    };

    // calculate bounding box
    const xs = blockPieceList.map(p => p.coord[0]);
    const ys = blockPieceList.map(p => p.coord[1]);
    const zs = blockPieceList.map(p => p.coord[2]);

    const boundMinX = Math.min(...xs);
    const boundMaxX = Math.max(...xs);
    const boundMinY = Math.min(...ys);
    const boundMaxY = Math.max(...ys);
    const boundMinZ = Math.min(...zs);
    const boundMaxZ = Math.max(...zs);

    // find all valid solid sub-rectangles
    type Rect = { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number; volume: number };
    const candidateRects: Rect[] = [];

    for (let minX = boundMinX; minX <= boundMaxX; minX++) {
      for (let maxX = minX; maxX <= boundMaxX; maxX++) {
        for (let minY = boundMinY; minY <= boundMaxY; minY++) {
          for (let maxY = minY; maxY <= boundMaxY; maxY++) {
            for (let minZ = boundMinZ; minZ <= boundMaxZ; minZ++) {
              for (let maxZ = minZ; maxZ <= boundMaxZ; maxZ++) {
                const dx = maxX - minX + 1;
                const dy = maxY - minY + 1;
                const dz = maxZ - minZ + 1;
                const volume = dx * dy * dz;

                const sortedDims = [dx, dy, dz].sort((a, b) => a - b);

                // minimum 1x2x2 = 4, maximum 2x2x3 = 12
                if (volume < 4 || volume > 12) continue;
                if (sortedDims[1] >= 3 && sortedDims[2] >= 3) continue;

                // skip blocks that only live in a slice layer
                const floatingInX = dx === 1 && minX === 1;
                const floatingInY = dy === 1 && minY === 1;
                const floatingInZ = dz === 1 && minZ === 1;
                if (floatingInX || floatingInY || floatingInZ) continue;

                if (!isSubRectSolid(minX, maxX, minY, maxY, minZ, maxZ)) continue;

                candidateRects.push({ minX, maxX, minY, maxY, minZ, maxZ, volume });
              }
            }
          }
        }
      }
    }

    // sort by volume descending, then greedily select non-overlapping rects
    candidateRects.sort((a, b) => b.volume - a.volume);
    const selectedRects: Rect[] = [];
    for (const rect of candidateRects) {
      const overlaps = selectedRects.some(sel =>
        sel.minX <= rect.maxX && sel.maxX >= rect.minX &&
        sel.minY <= rect.maxY && sel.maxY >= rect.minY &&
        sel.minZ <= rect.maxZ && sel.maxZ >= rect.minZ
      );
      if (!overlaps) selectedRects.push(rect);
    }

    const results: Block[] = [];

    for (const rect of selectedRects) {
      const { minX, maxX, minY, maxY, minZ, maxZ } = rect;
      const dx = maxX - minX + 1;
      const dy = maxY - minY + 1;
      const dz = maxZ - minZ + 1;

      const piecesInRect = blockPieceList.filter(p =>
        p.coord[0] >= minX && p.coord[0] <= maxX &&
        p.coord[1] >= minY && p.coord[1] <= maxY &&
        p.coord[2] >= minZ && p.coord[2] <= maxZ
      );

      const blockDimensions: Partial<Record<DirectionChar, [Color, number]>> = {};

      if (minX === 0) {
        const lColor = getBlockFaceColor(piecesInRect, 'L');
        if (lColor) blockDimensions['L'] = [lColor, dx];
      } else if (maxX === 2) {
        const rColor = getBlockFaceColor(piecesInRect, 'R');
        if (rColor) blockDimensions['R'] = [rColor, dx];
      }

      if (minY === 0) {
        const uColor = getBlockFaceColor(piecesInRect, 'U');
        if (uColor) blockDimensions['U'] = [uColor, dy];
      } else if (maxY === 2) {
        const dColor = getBlockFaceColor(piecesInRect, 'D');
        if (dColor) blockDimensions['D'] = [dColor, dy];
      }

      if (minZ === 0) {
        const fColor = getBlockFaceColor(piecesInRect, 'F');
        if (fColor) blockDimensions['F'] = [fColor, dz];
      } else if (maxZ === 2) {
        const bColor = getBlockFaceColor(piecesInRect, 'B');
        if (bColor) blockDimensions['B'] = [bColor, dz];
      }

      const blockPattern = this.generateBlockPattern(minX, maxX, minY, maxY, minZ, maxZ);

      results.push({
        origin: [minX, minY, minZ],
        dimensions: blockDimensions,
        blockPattern,
      });
    }

    return results;
  }

  /**
   * Generates a BlockPattern for a block given its bounding box.
   * Only includes sticker colors for positions that are part of the block.
   */
  private generateBlockPattern(
    minX: number,
    maxX: number,
    minY: number,
    maxY: number,
    minZ: number,
    maxZ: number
  ): BlockPattern | undefined {
    if (!this.cubeState) return undefined;

    // count how many block stickers are visible on each face
    const dx = maxX - minX + 1;
    const dy = maxY - minY + 1;
    const dz = maxZ - minZ + 1;
    const stickersU = minY === 0 ? dx * dz : 0;
    const stickersD = maxY === 2 ? dx * dz : 0;
    const stickersF = minZ === 0 ? dx * dy : 0;
    const stickersL = minX === 0 ? dy * dz : 0;
    const stickersR = maxX === 2 ? dy * dz : 0;

    // pick the viewpoint that shows the most block stickers (tie-break order: UFL, UFR, DFL, DFR)
    const viewScores: [BlockOrigin, number][] = [
      ['UFL', stickersU + stickersF + stickersL],
      ['UFR', stickersU + stickersF + stickersR],
      ['DFL', stickersD + stickersF + stickersL],
      ['DFR', stickersD + stickersF + stickersR],
    ];

    let blockOriginType: BlockOrigin = viewScores[0][0];
    let bestScore = viewScores[0][1];
    for (let i = 1; i < viewScores.length; i++) {
      if (viewScores[i][1] > bestScore) {
        bestScore = viewScores[i][1];
        blockOriginType = viewScores[i][0];
      }
    }

    if (bestScore === 0) return undefined;

    // Helper to get sticker color at a specific position and face
    const getStickerAt = (faceIdx: 0 | 1 | 2 | 3 | 4 | 5, row: number, col: number): string => {
      if (!this.cubeState) return '';
      return this.cubeState[faceIdx][row][col] || '';
    };

    // Helper to check if a position is in the block
    const isInBlock = (x: number, y: number, z: number): boolean => {
      return x >= minX && x <= maxX && y >= minY && y <= maxY && z >= minZ && z <= maxZ;
    };

    // Helper to generate a face pattern (9 stickers, top-left to bottom-right when facing the face)
    const generateFace = (faceIdx: 0 | 1 | 2 | 3 | 4 | 5, faceDir: DirectionChar): Face => {
      const stickers: [string, string, string, string, string, string, string, string, string] = ['', '', '', '', '', '', '', '', ''];
      let idx = 0;

      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          // Map face grid position to 3D cube coordinates
          let x: number, y: number, z: number;

          switch (faceDir) {
            case 'U': // face index 0, looking down at U face
              x = col;
              y = 0;
              z = 2 - row;
              break;
            case 'D': // face index 1, looking up at D face (mirrored horizontally)
              x = col;
              y = 2;
              z = row;
              break;
            case 'F': // face index 2, looking at F face from front
              x = col;
              y = row;
              z = 0;
              break;
            case 'B': // face index 4, looking at B face from behind (mirrored)
              x = 2 - col;
              y = row;
              z = 2;
              break;
            case 'L': // face index 5, looking at L face from left
              x = 0;
              y = row;
              z = 2 - col;
              break;
            case 'R': // face index 3, looking at R face from right
              x = 2;
              y = row;
              z = col;
              break;
            default:
              x = y = z = -1;
          }

          // Only include color if position is in the block
          if (isInBlock(x, y, z)) {
            stickers[idx] = getStickerAt(faceIdx, row, col);
          } else {
            stickers[idx] = '';
          }
          idx++;
        }
      }

      return stickers;
    };

    // Generate the 3 faces based on block origin type
    const pattern: Partial<BlockPattern> = { origin: blockOriginType };

    // face indices: U=0, D=1, F=2, R=3, B=4, L=5
    switch (blockOriginType) {
      case 'UFL':
        pattern.U = generateFace(0, 'U');
        pattern.F = generateFace(2, 'F');
        pattern.L = generateFace(5, 'L');
        break;
      case 'UFR':
        pattern.U = generateFace(0, 'U');
        pattern.F = generateFace(2, 'F');
        pattern.R = generateFace(3, 'R');
        break;
      case 'DFR':
        pattern.D = generateFace(1, 'D');
        pattern.F = generateFace(2, 'F');
        pattern.R = generateFace(3, 'R');
        break;
      case 'DFL':
        pattern.D = generateFace(1, 'D');
        pattern.F = generateFace(2, 'F');
        pattern.L = generateFace(5, 'L');
        break;
    }

    return pattern as BlockPattern;
  }

  private calcBlockStepsCompleted(): StepInfo[] {
    const blocks = this.blocksSolved;
    const steps: StepInfo[] = [];
    for (const block of blocks) {
      const blockStepName = `${block.dimensions['L'] ? 'L' : ''}${block.dimensions['R'] ? 'R' : ''}${block.dimensions['U'] ? 'U' : ''}${block.dimensions['D'] ? 'D' : ''}${block.dimensions['F'] ? 'F' : ''}${block.dimensions['B'] ? 'B' : ''}-Block`;
      steps.push({ step: blockStepName, type: 'genericBlock', colors: [], blockPattern: block.blockPattern! });
    }
    return steps;
  }

  /**
   * Only creates a stepInfo entry if blocks are properly placed.
   * @returns 
   */
  private calcRouxBlockSteps(): StepInfo[] {
    const steps: StepInfo[] = [];

    for (const block of this.blocksSolved) {
      const dim = block.dimensions;

      const height = dim['D']?.[1] ?? dim['U']?.[1] ?? 0;
      // true when the block fills the middle and bottom layers
      const isFillHeight = (block.origin[1] === 1 && height === 2)
        || (block.origin[1] === 2 && height === 3);
      // true when the block fills any two adjacent vertical layers
      const isTwoHigh = height >= 2;

      // get the dimension orthogonal to the F face
      const width = dim['F']?.[1] ?? dim['B']?.[1] ?? 0;

      const isLAndR = (dim['L']?.[1] ?? dim['R']?.[1] ?? 0) === 3;

      for (const prefix of ['L', 'R'] as const) {
        if (dim[prefix] === undefined && !isLAndR) continue;
        if (width === 3 && isFillHeight) {
          steps.push({ step: `${prefix}-Block`, type: 'block', caseIndex: 0, colors: [], blockPattern: block.blockPattern! });
        } else if (width === 2 && isTwoHigh) {
          steps.push({ step: `${prefix}-Square`, type: 'block', caseIndex: 0, colors: [], blockPattern: block.blockPattern! });
        }
      }
    }

    return steps;
  }

  private calcZZEOLine(): StepInfo | null {
    if (this.eoValue !== 0) {
      return null;
    }

    const topColor = this.topInfo.actualColor;
    const lineColor = this.getOppositeColor(topColor);

    if (this.crossColorsSolved.includes(lineColor)) {
      // handled by CFOP
      return null;
    }

    const linesSolved: [string, string][] = [];

    const solvedPieces = this.getSolvedPieces();
    Object.keys(this.eoLinePieceIndices).forEach((key) => {
      let piecesSolved = 0;
      key.split(',').forEach((indexStr) => {
        const index = parseInt(indexStr, 10);
        if (solvedPieces.includes(index)) {
          piecesSolved++;
        }
      });

      if (piecesSolved === key.split(',').length) {
        // line is solved
        const direction = this.eoLinePieceIndices[key].split(',')[1];
        linesSolved.push([lineColor, direction]);
      }
    });

    if (linesSolved.length > 1) {
      throw new Error('Multiple EO lines solved, which should be impossible');
    } else if (linesSolved.length === 1) {
      return {
        step: linesSolved[0][1] === 'vertical' ? 'v-eoLine' : 'h-eoLine',
        type: 'eoLine',
        colors: [linesSolved[0][0]],
      };
    }

    return null;
  }


  private calcZZStepsCompleted(): StepInfo[] {
    const steps: StepInfo[] = [];

    const eoLineStep = this.calcZZEOLine();
    if (eoLineStep) {
      steps.push(eoLineStep);
    }

    // TODO: ZZ-CT support
    // Because ZZ users don't deserve the owl icon

    // other steps are handled by CFOP
    return steps;
  }

  private calcRouxStepsCompleted(): StepInfo[] {
    const steps: StepInfo[] = [];

    const blockSteps = this.calcRouxBlockSteps();
    steps.push(...blockSteps);

    if (blockSteps.length !== 2) return steps;

    // both blocks solved — attach grid pattern to both block steps,
    // since getNewSteps filters by name/colors and we don't know which block is "new"
    const gridAfterBlocks = this.getLLcoloring('exact');
    for (const step of steps) {
      if (step.type === 'block') step.gridPattern = gridAfterBlocks;
    }

    // Derive top info from block corners instead of the top center,
    // since the M-layer center is unreliable during roux.
    // Find any corner with a sticker facing Down to determine the bottom color.
    const topInfo = this.getTopInfoFromCorners();

    if (!topInfo) return steps;

    const topColor = topInfo.actualColor;
    const LLpattern = this.getLLcoloring('exact');
    const LSEpattern = this.getLSEPattern();
    const isTopCOsolved = this.isTopCOsolved(topInfo);
    if (isTopCOsolved) {
      steps.push({
        step: 'co',
        type: 'cmll',
        colors: [topColor],
        gridPattern: LLpattern
      });
    }

    const cornerResult = this.calcCornerPermutation(topInfo);
    const isCornersSolved = !!cornerResult?.matched
    if (isCornersSolved) {
      steps.push({
        step: 'cp',
        type: 'cmll',
        colors: [],
        ...(isTopCOsolved // if CMLL is solved, add LSE pattern for next step instead
          ? { lsePattern: LSEpattern }
          : { gridPattern: LLpattern }),
      });
    } else {
      return steps
    }

    // 4a, aka eo
    // TODO: think about if this in the context of variants like EOLRb
    const isCMLLSolved = steps.some(s => s.step === 'co') && steps.some(s => s.step === 'cp');
    if (this.eoValue === 0) {
      steps.push({ 
        step: 'eo', 
        type: 'lse', 
        caseIndex: this.eoValue, 
        colors: [], 
        ...(isCMLLSolved ? { lsePattern: this.getLSEPattern() } : {})
      });
    }

    const LREdgesSolved = this.calcLREdgePermutation(topInfo);
    if (LREdgesSolved) {
      steps.push({
        step: '4b',
        type: 'lse',
        colors: [],
        lsePattern: LSEpattern
      });
    }

    // 4c already checked as solved step

    return steps;
  }

  /**
   * Updates all internally cached state values derived from the current cube state.
   * Must be called after cubeState is set and before any step calculation.
   */
  private updateCachedState(): void {
    this.currentCubeRotation = this.getCubeRotation();
    this.currentState = this.calcCurrentState();
    const topInfo = this.getTopCenterInfo();
    if (!topInfo) throw new Error('Failed to determine top center info');
    this.topInfo = topInfo;
    this.eoValue = this.getEOvalue();
  }

  /**
   * Method for passing in SimpleCubeState to update and interpret the current state.
   */
  public getStepsCompleted(cubeState?: SimpleCubeState | null, method: 'Roux' | 'ZZ' |'CFOP' | 'Petrus' | 'All' = 'All'): StepInfo[] {
    if (cubeState) {
      this.cubeState = cubeState;
    }

    if (!this.cubeState) {
      console.warn('No cube state available');
      return [];
    }

    this.updateCachedState();

    const steps: StepInfo[] = [];

    // always add eo step
    steps.push({ step: this.eoValue.toString(), type: 'genericEO', colors: [] });

    if (method === 'CFOP' || method === 'ZZ'|| method === 'All') {
      this.crossColorsSolved = this.calcCrossColorsSolved();
      steps.push(...this.calcCFOPstepsCompleted());
    }

    if (['Roux', 'Petrus', 'All'].includes(method)) {
      this.blocksSolved = this.calcBlocksSolved();
    }
    if (method === 'Roux' || method === 'All') {
      steps.push(...this.calcRouxStepsCompleted());
    }
    if (['Petrus', 'All'].includes(method)) {
      steps.push(...this.calcBlockStepsCompleted());
    }

    if (method === 'ZZ' || method === 'All') {
      // make the additional check of EOLine
      steps.push(...this.calcZZStepsCompleted());
    }

    return steps;
  }

  /**
   * Determines the cube rotation by reading U and F center colors.
   */
  public getCubeRotation(): string | number {
    if (!this.cubeState) {
      console.warn('No cube state available for rotation detection');
      return -1;
    }

    const uCenter = this.cubeState[0][1][1]; // U center
    const fCenter = this.cubeState[2][1][1]; // F center
    const key = `${uCenter},${fCenter}`;

    const rotation = this.cubeRotationMap.get(key);
    if (!rotation) {
      console.warn(`Unknown rotation for U=${uCenter}, F=${fCenter}`);
      return -1;
    }

    return rotation;
  }

  /**
   * Captures the current state of all cube pieces and generates a hash.
   */
  private calcCurrentState(): CubeState | null {
    if (typeof this.currentCubeRotation !== 'string') {
      console.warn('Current cube rotation is not determined');
      return null;
    }

    this.currentPieces = this.getPieces();

    this.pieceColorMapping = this.mapPiecesByColor();

    if (this.pieceColorMapping.size !== this.currentPieces.length) {
      console.warn('Piece mapping size does not match current pieces length');
      return null;
    }

    const hash = this.hashRecoloredPieces(this.pieceColorMapping);

    if (!hash) {
      console.warn('Failed to generate hash from recolored pieces');
      return null;
    }

    return { hash };
  }

  /**
   * Generates hash from piece colors and orientations.
   */
  private hashRecoloredPieces(pieceColorMapping: Map<number, { effectivePieceIndex: number, stickerOrder: string[] }>): string | null {
    let hash = '';

    pieceColorMapping.forEach(({ effectivePieceIndex, stickerOrder }, currentIndex) => {

      const leadColorIdx = stickerOrder[0]; // effective color
      const piece = this.currentPieces[effectivePieceIndex];

      const leadStickerIndex = this.currentPieces[effectivePieceIndex].stickers.findIndex(s => s.faceIdx.toString() === leadColorIdx);
      const leadSticker = leadStickerIndex !== -1 ? this.currentPieces[effectivePieceIndex].stickers[leadStickerIndex] : null;

      if (!leadSticker) {
        console.warn(`Lead sticker with color index ${leadColorIdx} not found on piece at current index ${currentIndex}`);
        return null;
      }

      switch (this.currentPieces[effectivePieceIndex].type) {
        case 'corner': {
          const leadStickerDirection = this.getFaceletDirection(effectivePieceIndex, leadStickerIndex);
          const axis = leadStickerDirection ? this.mapDirectionToAxis(leadStickerDirection) : null;
          const axisIndex = axis === 'x' ? 0 : axis === 'y' ? 1 : axis === 'z' ? 2 : null;

          if (axisIndex === null) {
            console.warn(`Invalid axis for lead sticker direction ${leadStickerDirection} on corner piece at current index ${currentIndex}`);
            return null;
          }

          const directions: string[] = [];
          const stickers = this.currentPieces[effectivePieceIndex].stickers;
          stickers.forEach((sticker) => {
            const dir = this.getFaceletDirection(effectivePieceIndex, stickers.indexOf(sticker));
            if (dir) {
              directions.push(dir);
            } else {
              console.warn(`Direction not found for sticker on corner piece at current index ${currentIndex}`);
              return null;
            }
          });
          directions.sort();
          const locationKey = directions.join('');
          const locationIndex = this.cornerPieceDirections[locationKey];

          const charIndex = (locationIndex * 3 + axisIndex);
          const hashChar = String.fromCharCode('a'.charCodeAt(0) + charIndex);
          hash += hashChar;
          break;
        }

        case 'edge': {
          const leadStickerDirection = this.getFaceletDirection(effectivePieceIndex, leadStickerIndex);
          const secondStickerDirection = this.getFaceletDirection(effectivePieceIndex, leadStickerIndex === 0 ? 1 : 0);

          if (!leadStickerDirection || !secondStickerDirection) {
            console.warn(`Invalid sticker directions on edge piece at current index ${currentIndex}`);
            return null;
          }
          const dirKey = leadStickerDirection + secondStickerDirection;
          const dirIndex = this.edgePieceDirections[dirKey];

          if (dirIndex === undefined) {
            console.warn(`Direction key ${dirKey} not found in edgePieceDirections for edge piece at current index ${currentIndex}`);
            return null;
          }

          const hashChar = String.fromCharCode('a'.charCodeAt(0) + dirIndex);
          hash += hashChar;
          break;
        }

        case 'center': {
          const leadStickerDirection = this.getFaceletDirection(effectivePieceIndex, leadStickerIndex);
          const dirIndex = leadStickerDirection ? this.centerPieceDirections[leadStickerDirection] : null;

          if (dirIndex === null || dirIndex === undefined) {
            console.warn(`Invalid direction for lead sticker on center piece at current index ${currentIndex}`);
            return null;
          }
          const hashChar = String.fromCharCode('a'.charCodeAt(0) + dirIndex);
          hash += hashChar;
          break;
        }
      }
    });

    return hash;
  }

  private mapDirectionToAxis(direction: string): string {
    const normalDirection = direction.toUpperCase();
    switch (normalDirection) {
      case 'U':
      case 'D':
        return 'y';
      case 'L':
      case 'R':
        return 'x';
      case 'F':
      case 'B':
        return 'z';
      default:
        console.warn(`Unknown direction: ${direction}`);
        return '';
    }
  }

  private mapEffectiveColorToActual(effectiveColor: string): string {
    if (typeof this.currentCubeRotation !== 'string') {
      console.warn('Current cube rotation not determined');
      return effectiveColor;
    }

    const colorMapping = this.rotationColorMap.get(this.currentCubeRotation);
    if (!colorMapping) {
      console.warn('No color mapping found for current rotation:', this.currentCubeRotation);
      return effectiveColor;
    }

    const effectiveColorIdx = this.facelets.findIndex(f => f.colorName === effectiveColor);
    if (effectiveColorIdx === -1) {
      console.warn('Effective color not found in facelets:', effectiveColor);
      return effectiveColor;
    }

    const actualColorIdx = colorMapping[effectiveColorIdx];

    return this.facelets[actualColorIdx].colorName;
  }

  private mapActualColorToEffective(actualColor: string): string {
    if (typeof this.currentCubeRotation !== 'string') {
      console.warn('Current cube rotation not determined');
      return actualColor;
    }

    const colorMapping = this.rotationColorMap.get(this.currentCubeRotation);
    if (!colorMapping) {
      console.warn('No color mapping found for current rotation:', this.currentCubeRotation);
      return actualColor;
    }

    const actualColorIdx = this.facelets.findIndex(f => f.colorName === actualColor);
    if (actualColorIdx === -1) {
      console.warn('Actual color not found in facelets:', actualColor);
      return actualColor;
    }

    // Find the effective color index by looking for which position in colorMapping maps to actualColorIdx
    const effectiveColorIdx = colorMapping.findIndex(mappedIdx => mappedIdx === actualColorIdx);
    if (effectiveColorIdx === -1) {
      console.warn('No effective color mapping found for actual color:', actualColor);
      return actualColor;
    }

    return this.facelets[effectiveColorIdx].colorName;
  }

  private getPieceEffectiveColors(pieceIndex: number): string[] | null {
    const piece = this.currentPieces[pieceIndex];
    if (!piece) {
      console.warn(`Piece at index ${pieceIndex} not found when gathering effective colors.`);
      return null;
    }

    const colors: string[] = [];
    for (const sticker of piece.stickers) {
      colors.push(this.mapActualColorToEffective(sticker.colorName));
    }

    return colors;
  }

  private findPieceIndexByDirections(type: 'edge' | 'corner', targetDirections: string[]): number | null {
    const normalizedTarget = targetDirections.map(direction => direction.toUpperCase()).sort();
    const expectedCount = normalizedTarget.length;
    const startIndex = type === 'edge' ? 0 : 12;
    const endIndex = type === 'edge' ? 12 : 20;

    for (let index = startIndex; index < endIndex; index++) {
      const piece = this.currentPieces[index];
      if (!piece || piece.type !== type) {
        continue;
      }

      const pieceDirectionsSet = new Set<string>();
      let hasUnknownDirection = false;

      for (let stickerIndex = 0; stickerIndex < piece.stickers.length; stickerIndex++) {
        const direction = this.getFaceletDirection(index, stickerIndex);
        if (!direction) {
          hasUnknownDirection = true;
          break;
        }
        pieceDirectionsSet.add(direction.toUpperCase());
      }

      if (hasUnknownDirection) {
        continue;
      }

      if (pieceDirectionsSet.size !== expectedCount) {
        continue;
      }

      const pieceDirections = Array.from(pieceDirectionsSet).sort();
      let matches = true;
      for (let i = 0; i < expectedCount; i++) {
        if (pieceDirections[i] !== normalizedTarget[i]) {
          matches = false;
          break;
        }
      }

      if (matches) {
        return index;
      }
    }

    return null;
  }

  private getEdgeIndexByDirections(targetDirections: string[]): number | null {
    return this.findPieceIndexByDirections('edge', targetDirections);
  }

  private getCornerIndexByDirections(targetDirections: string[]): number | null {
    return this.findPieceIndexByDirections('corner', targetDirections);
  }

  private getEdgeEffectiveColorsForDirections(targetDirections: string[], topInfo: { actualColor: string; effectiveColor: string; direction: string }): { pieceIndex: number; colors: string[] } | null {
    const pieceIndex = this.getEdgeIndexByDirections(targetDirections);
    if (pieceIndex === null) {
      console.warn(`Unable to locate edge with directions ${targetDirections.join(', ')}.`);
      return null;
    }

    const piece = this.currentPieces[pieceIndex];
    if (!piece || piece.type !== 'edge') {
      console.warn('Located piece for edge lookup is not a valid edge.');
      return null;
    }

    const effectiveColors = this.getPieceEffectiveColors(pieceIndex);
    if (!effectiveColors) {
      return null;
    }

    let topStickerFound = false;
    for (let stickerIndex = 0; stickerIndex < piece.stickers.length; stickerIndex++) {
      const direction = this.getFaceletDirection(pieceIndex, stickerIndex);
      if (!direction) {
        return null;
      }

      if (direction.toUpperCase() === 'U') {
        topStickerFound = true;
        if (effectiveColors[stickerIndex] !== topInfo.effectiveColor) {
          return null;
        }
      }
    }

    if (!topStickerFound) {
      return null;
    }

    return { pieceIndex, colors: effectiveColors };
  }

  private getCornerEffectiveColorsForDirections(targetDirections: string[], topInfo: { actualColor: string; effectiveColor: string; direction: string }): { pieceIndex: number; colors: string[] } | null {
    const pieceIndex = this.getCornerIndexByDirections(targetDirections);
    if (pieceIndex === null) {
      console.warn(`Unable to locate corner with directions ${targetDirections.join(', ')}.`);
      return null;
    }

    const piece = this.currentPieces[pieceIndex];
    if (!piece || piece.type !== 'corner') {
      console.warn('Located piece for corner lookup is not a valid corner.');
      return null;
    }

    const effectiveColors = this.getPieceEffectiveColors(pieceIndex);
    if (!effectiveColors) {
      return null;
    }

    let topStickerFound = false;
    for (let stickerIndex = 0; stickerIndex < piece.stickers.length; stickerIndex++) {
      const direction = this.getFaceletDirection(pieceIndex, stickerIndex);
      if (!direction) {
        return null;
      }

      if (direction.toUpperCase() === 'U') {
        topStickerFound = true;
        if (effectiveColors[stickerIndex] !== topInfo.effectiveColor) {
          return null;
        }
      }
    }

    if (!topStickerFound) {
      return null;
    }

    return { pieceIndex, colors: effectiveColors };
  }

  /**
   * Checks if the cross is solved, also returns color(s) of cross.
   */
  public isCrossSolved(): boolean {

    // crossColorsSolved is updated in setCurrentState
    return this.crossColorsSolved.length > 0;
  }

  private getOppositeColor(color: ColorName | string): ColorName {
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

  private effectiveColorToDirection(effectiveColor: string): F2LDirection | null {
    switch (effectiveColor.toLowerCase()) {
      case 'green': return 'front';
      case 'red': return 'right';
      case 'blue': return 'back';
      case 'orange': return 'left';
      default: return null;
    }
  }

  /**
   * Returns solved F2L pairs with direction-to-color mappings.
   * Each entry has the actual colors and which physical direction each color faces.
   */
  private getF2LPairDirections(): { colors: string[], f2lDirections: Partial<Record<F2LDirection, string>> }[] {
    const crossColors = this.crossColorsSolved;

    if (crossColors.length === 0) {
      return [];
    }

    const topInfo = this.topInfo;

    const topColor = topInfo.actualColor;
    const bottomColor = this.getOppositeColor(topColor);

    if (crossColors.find(c => c.toLowerCase() === bottomColor) === undefined) {
      return [];
    }
    const crossColor = bottomColor;

    const result: { colors: string[], f2lDirections: Partial<Record<F2LDirection, string>> }[] = [];

    const effectiveColor = this.mapActualColorToEffective(crossColor);
    const slots = this.f2lSlots[effectiveColor.toLowerCase()];
    if (!slots) {
      return [];
    }

    slots.forEach((slot) => {
      const cornerIndex = slot.corner;
      const edgeIndex = slot.edge;

      const cornerSolvedChar = this.solvedState!.hash[cornerIndex];
      const edgeSolvedChar = this.solvedState!.hash[edgeIndex];

      const cornerCurrentChar = this.currentState!.hash[cornerIndex];
      const edgeCurrentChar = this.currentState!.hash[edgeIndex];

      if (cornerSolvedChar === cornerCurrentChar && edgeSolvedChar === edgeCurrentChar) {
        const f2lDirections: Partial<Record<F2LDirection, string>> = {};
        const actualColors: string[] = [];

        for (const effColor of slot.slotColors) {
          const dir = this.effectiveColorToDirection(effColor);
          const actualColor = this.mapEffectiveColorToActual(effColor);
          if (dir) {
            f2lDirections[dir] = actualColor;
          }
          actualColors.push(actualColor);
        }

        result.push({ colors: actualColors, f2lDirections });
      }
    });

    return result;
  }

  /**
   * Check which f2l pairs are solved
   * Assumes cross on bottom
   */
  public getPairsSolved(): string[] {
    return this.getF2LPairDirections().map(pair =>
      pair.colors.map(c => c[0].toUpperCase()).join('') + ' pair'
    );
  }
  /**
   * Checks if the entire cube is solved
   * Uses hash-based comparison
   */
  public isCubeSolved(): boolean {
    if (!this.solvedState || !this.currentState) {
      return false;
    }

    return this.currentState.hash === this.solvedState.hash;
  }

  /**
   * Gets all currently solved pieces by comparing current state to solved state.
   * This is the foundation for hash-based solve detectionabstract
   * @returns Array of piece indices that are solved. Index is hash position.
   */
  public getSolvedPieces(): number[] {
    if (!this.solvedState || !this.currentState) {
      return [];
    }

    const solvedPieces: number[] = [];

    this.currentState.hash.split('').forEach((currentChar, idx) => {
      const solvedChar = this.solvedState ? this.solvedState.hash[idx] : null;
      if (currentChar === solvedChar) {
        // position matches
        solvedPieces.push(idx);
      }
    });

    return solvedPieces;
  }

  private ensureState(): boolean {
    if (!this.currentState) {
      // update state
      this.getStepsCompleted();
    }

    return !!this.currentState && this.currentPieces.length > 0;
  }

  private getTopCenterInfo(): { actualColor: string; effectiveColor: string; direction: string } | null {
    for (let i = 20; i <= 25; i++) {
      const centerPiece = this.currentPieces[i];
      if (!centerPiece || centerPiece.type !== 'center' || centerPiece.stickers.length === 0) {
        continue;
      }

      const direction = this.getFaceletDirection(i, 0);
      if (direction && direction === 'U') {
        const actualColor = centerPiece.stickers[0].colorName;
        const effectiveColor = this.mapActualColorToEffective(actualColor);
        return { actualColor, effectiveColor, direction: direction };
      }
    }

    console.warn('Unable to determine top center orientation');
    return null;
  }

  // derives top info from any corner with a sticker facing Down.
  // useful during roux where the M-layer center position is unreliable.
  private getTopInfoFromCorners(): { actualColor: string; effectiveColor: string; direction: string } | null {
    for (let i = 12; i < 20; i++) {
      const piece = this.currentPieces[i];
      if (!piece || piece.type !== 'corner') continue;

      for (let stickerIndex = 0; stickerIndex < piece.stickers.length; stickerIndex++) {
        const direction = this.getFaceletDirection(i, stickerIndex);
        if (direction === 'D') {
          const bottomActualColor = piece.stickers[stickerIndex].colorName;
          const topActualColor = this.getOppositeColor(bottomActualColor);
          const topEffectiveColor = this.mapActualColorToEffective(topActualColor);
          return { actualColor: topActualColor, effectiveColor: topEffectiveColor, direction: 'U' };
        }
      }
    }

    return null;
  }

  /**
   * Performs bitwise calculation to determine EO value.
   * EO value is a 12-bit number. The location of the bit is determined by (edgePieceDirections Mod 12)
   * Edge Oriented = 0, Not Oriented = 1.
   */
  public getEOvalue(): number {
    if (!this.ensureState() || !this.currentState) {
      console.warn('Current state not available for EO calculation');
      return -1;
    }

    const topInfo = this.getTopCenterInfo();
    if (!topInfo) {
      console.warn('Top center info not available for EO calculation');
      return -1;
    }

    const verticalColors: ColorName[] = [topInfo.actualColor as ColorName, this.getOppositeColor(topInfo.actualColor) as ColorName];

    const xDirections: DirectionChar[] = ['R', 'L'];
    const xColors: ColorName[] = [];

    for (let i = 20; i <= 25; i++) {
      const centerPiece = this.currentPieces[i];
      if (!centerPiece || centerPiece.type !== 'center' || centerPiece.stickers.length === 0) {
        console.warn(`Center piece at index ${i} is not standard`);
        continue;
      }
      const direction = this.getFaceletDirection(i, 0);
      if (direction && xDirections.includes(direction)) {
        const actualColor: ColorName = centerPiece.stickers[0].colorName;
        xColors.push(actualColor);
      }
    }

    if (xColors.length !== 2) {
      console.warn('Unable to determine x-direction colors for EO calculation');
      return -1;
    }

    let eoValue = 0;

    for (let i = 0; i < 12; i++) {
      const piece = this.currentPieces[i];
      if (!piece || piece.type !== 'edge') {
        console.warn(`Piece at index ${i} is not a valid edge for EO calculation`);
        return -1;
      }

      const directions: DirectionChar[] = piece.stickers.map((_, stickerIndex) => {
        const direction = this.getFaceletDirection(i, stickerIndex);
        if (!direction) {
          throw new Error(`Missing direction for edge piece ${i}, sticker ${stickerIndex}`);
        }
        return direction;
      });

      const directionKey = directions.join('');
      const edgeIndex = this.edgePieceDirections[directionKey] % 12; // Normalize to 0-11

      const isEdgeOriginVertical = piece.stickers.some(sticker => {
        const color: ColorName = sticker.colorName;
        return verticalColors.includes(color);
      });

      let isOriented: boolean;
      const isEdgeInVertical = directions.includes('U') || directions.includes('D');

      if (isEdgeOriginVertical) {
        // must be a top/bottom edge

        if (isEdgeInVertical) {
          // vertical edge in vertical position: good if vertical sticker faces top or bottom only
          const isVerticalStickerUD = piece.stickers.some((sticker, stickerIndex) => {
            const color: ColorName = sticker.colorName;
            const direction = this.getFaceletDirection(i, stickerIndex);
            return verticalColors.includes(color) && (direction === 'U' || direction === 'D');
          });
          isOriented = isVerticalStickerUD;
        } else {
          // vertical edge not in vertical position: good if vertical sticker faces up-down or front-back
          const isVerticalStickerYZ = piece.stickers.some((sticker, stickerIndex) => {
            const color: ColorName = sticker.colorName;
            const direction = this.getFaceletDirection(i, stickerIndex);
            return verticalColors.includes(color) &&
              (direction === 'U' || direction === 'D'
                || direction === 'F' || direction === 'B');
          });
          isOriented = isVerticalStickerYZ;
        }
      } else {
        // must be f2l edge, must have x-color

        // f2l edge good if x-color faces x-direction in 2nd layer or x-color faces side direction in top/bottom layer
        // we can tell it is in 2nd layer if neither sticker is vertical
        const xColorSticker = piece.stickers.find((sticker) => {
          const color: ColorName = sticker.colorName;
          return xColors.includes(color);
        });
        if (!xColorSticker) throw new Error('X color sticker not found on edge piece during EO calculation');

        if (isEdgeInVertical) {
          // top/bottom layer
          const xStickerDirection = this.getFaceletDirection(i, piece.stickers.indexOf(xColorSticker));
          const isXStickerFacingSide = xStickerDirection ? ['L', 'R', 'F', 'B'].includes(xStickerDirection) : false;
          isOriented = isXStickerFacingSide;
        } else {
          const xStickerDirection = this.getFaceletDirection(i, piece.stickers.indexOf(xColorSticker));
          const isXStickerFacingX = xStickerDirection ? xDirections.includes(xStickerDirection as DirectionChar) : false;
          isOriented = isXStickerFacingX;
        }
      }
      if (!isOriented) {
        eoValue ^= (1 << edgeIndex);
      }
    }
    return eoValue;
  }

  public isTopEOsolved(): boolean {
    if (!this.ensureState() || !this.currentState) {
      return false;
    }

    const topInfo = this.topInfo;

    let edgesOriented = 0;

    for (let i = 0; i < 12; i++) {
      const piece = this.currentPieces[i];
      if (!piece || piece.type !== 'edge') {
        continue;
      }

      const stickerIndex = piece.stickers.findIndex(sticker => sticker.colorName === topInfo.actualColor);
      if (stickerIndex === -1) {
        continue;
      }

      const direction = this.getFaceletDirection(i, stickerIndex);
      if (direction && direction.toUpperCase() === topInfo.direction) {
        edgesOriented++;
      }
    }

    return edgesOriented === 4;
  }

  public isTopCOsolved(topInfo: { actualColor: string; effectiveColor: string; direction: string }): boolean {
    if (!this.ensureState() || !this.currentState) {
      return false;
    }

    let cornersOriented = 0;

    for (let i = 12; i < 20; i++) {
      const piece = this.currentPieces[i];
      if (!piece || piece.type !== 'corner') {
        continue;
      }

      const stickerIndex = piece.stickers.findIndex(sticker => sticker.colorName === topInfo.actualColor);
      if (stickerIndex === -1) {
        continue;
      }


      const direction = this.getFaceletDirection(i, stickerIndex);
      if (direction && direction.toUpperCase() === topInfo.direction) {
        cornersOriented++;
      }
    }

    return cornersOriented === 4;
  }

  private calcEdgePermutation(topInfo: { actualColor: string; effectiveColor: string; direction: string }): { matched: boolean; edgeInfos: { pieceIndex: number; colors: string[] }[] } | null {
    const edgeInfos: { pieceIndex: number; colors: string[] }[] = [];

    for (const edge of this.lastLayerEdgeOrder) {
      const directions = edge.split('');
      const edgeInfo = this.getEdgeEffectiveColorsForDirections(directions, topInfo);
      if (!edgeInfo) {
        return null;
      }

      edgeInfos.push(edgeInfo);
    }

    const edgeColors: string[] = [];

    for (const edgeInfo of edgeInfos) {
      const nonTopColors = edgeInfo.colors.filter(color => color !== topInfo.effectiveColor);
      if (nonTopColors.length !== 1) {
        return { matched: false, edgeInfos };
      }

      edgeColors.push(nonTopColors[0]);
    }

    if (edgeColors.length !== this.effectiveColorOrder.length) {
      return { matched: false, edgeInfos };
    }

    for (let offset = 0; offset < this.effectiveColorOrder.length; offset++) {
      const expectedSequence = this.effectiveColorOrder.map((_, index) =>
        this.effectiveColorOrder[(offset + index) % this.effectiveColorOrder.length]
      );

      const matches = expectedSequence.every((color, index) => edgeColors[index] === color);
      if (matches) {
        return { matched: true, edgeInfos };
      }
    }

    return { matched: false, edgeInfos };
  }

  private calcCornerPermutation(topInfo: { actualColor: string; effectiveColor: string; direction: string }): { matched: boolean; cornerInfos: { pieceIndex: number; colors: string[] }[] } | null {
    const cornerInfos: { pieceIndex: number; colors: string[] }[] = [];

    for (const corner of this.lastLayerCornerOrder) {
      const directions = corner.split('');
      const cornerInfo = this.getCornerEffectiveColorsForDirections(directions, topInfo);
      if (!cornerInfo) {
        return null;
      }

      if (!cornerInfo.colors.includes(topInfo.effectiveColor)) {
        return { matched: false, cornerInfos };
      }

      cornerInfos.push(cornerInfo);
    }

    const pairKey = (colorA: string, colorB: string): string => {
      const sorted = [colorA, colorB].sort();
      return `${sorted[0]}|${sorted[1]}`;
    };

    const cornerPairs: string[] = [];

    for (const cornerInfo of cornerInfos) {
      const nonTopColors = cornerInfo.colors.filter(color => color !== topInfo.effectiveColor);
      if (nonTopColors.length !== 2) {
        return { matched: false, cornerInfos };
      }

      cornerPairs.push(pairKey(nonTopColors[0], nonTopColors[1]));
    }

    // derive the side color order from the effective top color so that
    // the check works even when the effective mapping is wrong (e.g. Roux M-layer)
    const sideOrder = this.sideColorOrderByTop[topInfo.effectiveColor];
    if (!sideOrder) {
      throw new Error(`No side color order defined for effective top color: ${topInfo.effectiveColor}`);
    }

    if (cornerPairs.length !== sideOrder.length) {
      throw new Error('Corner pairs length does not match side order length');
    }

    const adjacentPairsForOffset = (offset: number): string[] => (
      sideOrder.map((_, index) => {
        const current = sideOrder[(offset + index) % sideOrder.length];
        const next = sideOrder[(offset + index + 1) % sideOrder.length];
        return pairKey(current, next);
      })
    );

    for (let offset = 0; offset < sideOrder.length; offset++) {
      const pattern = adjacentPairsForOffset(offset);
      const matches = pattern.every((pair, index) => cornerPairs[index] === pair);
      if (matches) {
        return { matched: true, cornerInfos };
      }
    }

    return { matched: false, cornerInfos };
  }

  private getCenterColorAtDirection(direction: DirectionChar): string | null {
    for (let i = 20; i <= 25; i++) {
      const piece = this.currentPieces[i];
      if (!piece || piece.type !== 'center') continue;
      if (this.getFaceletDirection(i, 0) === direction) {
        return piece.stickers[0].colorName;
      }
    }
    return null;
  }

  private getActualColorAtDirection(pieceIndex: number, direction: DirectionChar): string | null {
    const piece = this.currentPieces[pieceIndex];
    if (!piece) return null;
    for (let s = 0; s < piece.stickers.length; s++) {
      if (this.getFaceletDirection(pieceIndex, s) === direction) {
        return piece.stickers[s].colorName;
      }
    }
    return null;
  }

  // checks whether the LR edges are solved relative to the corners.
  // identifies LR edges by actual colors (top + L/R center), then for each one
  // checks that an adjacent corner's sticker on the shared face has the same color.
  private calcLREdgePermutation(
    topInfo: { actualColor: string; effectiveColor: string; direction: string },
  ): boolean {
    const topColor = topInfo.actualColor;

    for (const side of ['L', 'R'] as DirectionChar[]) {
      const centerColor = this.getCenterColorAtDirection(side);
      if (!centerColor) return false;
      if (!this.isEdgeSolvedRelativeToCorners(topColor, centerColor)) return false;
    }

    return true;
  }

  private isEdgeSolvedRelativeToCorners(topColor: string, sideColor: string): boolean {
    const targetColors = [topColor, sideColor].sort();

    for (let i = 0; i < this.currentPieces.length; i++) {
      const piece = this.currentPieces[i];
      if (piece.type !== 'edge') continue;

      const actualColors = piece.stickers.map(s => s.colorName).sort();
      if (actualColors[0] !== targetColors[0] || actualColors[1] !== targetColors[1]) continue;

      // edge must be on U layer with top color facing U
      if (this.getActualColorAtDirection(i, 'U') !== topColor) return false;

      // get the non-U direction this edge faces
      const dir0 = this.getFaceletDirection(i, 0);
      const dir1 = this.getFaceletDirection(i, 1);
      const sideDir = (dir0 === 'U' ? dir1 : dir0) as DirectionChar;

      // check that an adjacent corner's sticker on the same face matches
      const adjacentCornerDirs = this.lastLayerCornerOrder.find(c => c.includes(sideDir));
      if (!adjacentCornerDirs) return false;

      const cornerIdx = this.getCornerIndexByDirections(adjacentCornerDirs.split(''));
      if (cornerIdx === null) return false;

      const cornerFaceColor = this.getActualColorAtDirection(cornerIdx, sideDir);

      return sideColor === cornerFaceColor;
    }

    return false;
  }

  private getHighestIndexColor(colors: string[]): string | null {
    if (colors.length === 0) {
      return null;
    }

    if (colors.length === 1) {
      return colors[0];
    }

    const firstIndex = this.effectiveColorOrder.indexOf(colors[0]);
    const secondIndex = this.effectiveColorOrder.indexOf(colors[1]);

    if (firstIndex === -1 || secondIndex === -1) {
      return null;
    }

    const diff = Math.abs(firstIndex - secondIndex);
    if (diff === this.effectiveColorOrder.length - 1) {
      return firstIndex < secondIndex ? colors[0] : colors[1];
    }

    return firstIndex > secondIndex ? colors[0] : colors[1];
  }

  private calcLLPermutationStatus(topInfo: { actualColor: string; effectiveColor: string; direction: string }): { edgesSolved: boolean; cornersSolved: boolean } {
    const edgeResult = this.calcEdgePermutation(topInfo);
    const cornerResult = this.calcCornerPermutation(topInfo);

    const cornersSolved = !!cornerResult?.matched;
    let edgesSolved = !!edgeResult?.matched;

    if (edgesSolved && cornersSolved && edgeResult && cornerResult) {
      const firstCorner = cornerResult.cornerInfos[0];
      const followingEdge = edgeResult.edgeInfos[1];

      if (!firstCorner || !followingEdge) {
        edgesSolved = false;
      } else {
        const nonTopCornerColors = firstCorner.colors.filter(color => color !== topInfo.effectiveColor);
        const highestIndexColor = this.getHighestIndexColor(nonTopCornerColors);

        if (!highestIndexColor || !followingEdge.colors.includes(highestIndexColor)) {
          edgesSolved = false;
        }
      }
    }

    return { edgesSolved, cornersSolved };
  }

  public isEPsolved(): boolean {
    if (!this.ensureState() || !this.currentState || !this.solvedState) {
      return false;
    }

    const { edgesSolved } = this.calcLLPermutationStatus(this.topInfo);
    return edgesSolved;
  }

  public isCPsolved(): boolean {
    if (!this.ensureState() || !this.currentState || !this.solvedState) {
      return false;
    }

    const { cornersSolved } = this.calcLLPermutationStatus(this.topInfo);
    return cornersSolved;
  }

  /**
   * It may be case where both edges and corner are permuted, but not with respect to each other, like in H perm
   * In this case, return only that corners are solved (prefer first look of 2look PLL)
   * @returns 
   */
  public getLLPermutationStatus(): { edgesSolved: boolean; cornersSolved: boolean } {
    if (!this.ensureState() || !this.currentState || !this.solvedState.hash) {
      return { edgesSolved: false, cornersSolved: false };
    }

    return this.calcLLPermutationStatus(this.topInfo);
  }

  private getCrossSteps(): StepInfo[] {
    if (!this.isCrossSolved()) return [];

    const steps: StepInfo[] = [];
    // presume cross color on bottom, if multiple
    if (this.crossColorsSolved.length > 1) {
      const topColor = this.topInfo.actualColor;
      const bottomColor = this.getOppositeColor(topColor);
      this.crossColorsSolved.forEach(color => {
        if (color.toLowerCase() === bottomColor) {
          steps.push({ step: 'cross', type: 'cross', colors: [bottomColor] });
        }
      });
    } else {
      steps.push({ step: 'cross', type: 'cross', colors: [this.crossColorsSolved[0]] });
    }
    return steps;
  }

  private getF2LSteps(): StepInfo[] {
    const pairsInfo = this.getF2LPairDirections();

    let postPairGridPattern: Grid | undefined = undefined;
    if (pairsInfo.length === 4) {
      postPairGridPattern = this.getLLcoloring('exact') || undefined;
    }

    return pairsInfo.map(pair => ({
      step: 'pair' as const,
      type: 'f2l' as const,
      colors: pair.colors,
      f2lSlotList: [pair.f2lDirections],
      gridPattern: postPairGridPattern,
    }));
  }

  private getLLSteps(): StepInfo[] {
    const steps: StepInfo[] = [];
    const LLpattern = this.getLLcoloring('exact');
    const topColor = this.topInfo.actualColor;

    if (this.isTopEOsolved()) {
      steps.push({ step: 'eo', type: 'last layer', colors: [topColor], gridPattern: LLpattern });
    }
    if (this.isTopCOsolved(this.topInfo)) {
      steps.push({ step: 'co', type: 'last layer', colors: [topColor], gridPattern: LLpattern });
    }

    const { edgesSolved, cornersSolved } = this.getLLPermutationStatus();
    if (edgesSolved) {
      steps.push({ step: 'ep', type: 'last layer', colors: [topColor], gridPattern: LLpattern });
    }
    if (cornersSolved) {
      steps.push({ step: 'cp', type: 'last layer', colors: [topColor], gridPattern: LLpattern });
    }

    return steps;
  }

  // annotate steps with LL case names (OLL/PLL) using pattern matching
  private annotateLLCaseNames(steps: StepInfo[]): void {
    const llSteps = steps.filter(s => s.type === 'last layer');
    const llStepNames = new Set(llSteps.map(s => s.step));
    const patternGrid = this.getLLcoloring('pattern');

    // OLL name: F2L complete, but EO and CO are not yet both solved
    if (!(llStepNames.has('eo') && llStepNames.has('co'))) {
      try {
        const ollInfo = this.LLinterpreter.getStepInfo(patternGrid, 'oll');
        let lastPair: StepInfo | null = null;
        for (let i = steps.length - 1; i >= 0; i--) {
          if (steps[i].type === 'f2l' && steps[i].step === 'pair') {
            lastPair = steps[i];
            break;
          }
        }
        if (lastPair && ollInfo.name) { lastPair.name = ollInfo.name; lastPair.nameType = 'oll'; }
      } catch { /* pattern not recognized */ }
    }

    // PLL name: OLL solved (eo+co) but PLL not yet → PLL case is visible
    if (llStepNames.has('eo') && llStepNames.has('co') && !(llStepNames.has('ep') && llStepNames.has('cp'))) {
      try {
        const pllInfo = this.LLinterpreter.getStepInfo(patternGrid, 'pll');
        const target = llSteps.find(s => s.step === 'co') || llSteps[llSteps.length - 1];
        if (target && pllInfo.name) { target.name = pllInfo.name; target.nameType = 'pll'; }
      } catch { /* pattern not recognized */ }
    }
  }

  public calcCFOPstepsCompleted(): StepInfo[] {

    if (this.isCubeSolved()) {
      return [{ step: 'solved', type: 'solved', colors: [] }];
    }

    const steps: StepInfo[] = [];

    steps.push(...this.getCrossSteps());

    // we do allow pairs to be solved without cross, because humans make mistakes
    const f2lSteps = this.getF2LSteps();
    steps.push(...f2lSteps);

    if (f2lSteps.length !== 4) {
      return steps.length > 0 ? steps : [{ step: 'none', type: 'none', colors: [] }];
    }

    steps.push(...this.getLLSteps());
    this.annotateLLCaseNames(steps);

    return steps.length > 0 ? steps : [{ step: 'none', type: 'none', colors: [] }];
  }

  /**
   * Debug method to log current state
   */
  public getCurrentState(): CubeState | null {
    return this.currentState;
  }

  /**
   * Get the indices of pieces where their f2l pair is not solved.
   * @param color The actual color of the cross
   * @returns Dictionary for each pair, containing colors, indices, and solve status
   */
  private getF2LPairStatus(color: string): { pairColors: [string, string], pairIndices: [number, number], isSolved: boolean }[] | [] {

    const effectiveColor = this.mapActualColorToEffective(color);

    const slots = this.f2lSlots[effectiveColor];
    if (!slots) {
      console.warn(`No F2L slots found for color: ${color}`);
      return [{ pairColors: ['', ''], pairIndices: [-1, -1], isSolved: false }];
    }


    const status: { pairColors: [string, string], pairIndices: [number, number], isSolved: boolean }[] = [];
    const solvedIndices = this.getSolvedPieces();

    slots.forEach(slot => {
      const cornerIndex = slot.corner;
      const edgeIndex = slot.edge;
      const pairColors: [string, string] = [
        this.mapEffectiveColorToActual(slot.slotColors[0]),
        this.mapEffectiveColorToActual(slot.slotColors[1])
      ];

      const isCornerSolved: boolean = !!solvedIndices.find((index) => index === cornerIndex) // undefined is false
      const isEdgeSolved: boolean = !!solvedIndices.find((index) => index === edgeIndex)
      if (isCornerSolved && isEdgeSolved) {
        status.push({ pairColors, pairIndices: [cornerIndex, edgeIndex], isSolved: true })
      } else {
        status.push({ pairColors, pairIndices: [cornerIndex, edgeIndex], isSolved: false })
      }
    });

    return status

  }

  /**
   * Generates separate queries for each unsolved F2L slot.
   * Each query requires only that specific slot to be solved.
   * @returns Array of query objects with the related pair colors (max 4)
   */
  private getQueriesForF2L(): { query: Query; pairColors: [string, string] }[] {
    if (!this.currentState) {
      console.warn('Current state not available for query generation');
      return [];
    }
    if (typeof this.currentCubeRotation !== 'string') {
      console.warn('Current cube rotation not determined');
      return [];
    }

    const queries: { query: Query; pairColors: [string, string] }[] = [];

    // assume cross must be on bottom
    const effectiveDownColor = 'yellow';
    const downColor = this.mapEffectiveColorToActual(effectiveDownColor);

    let isDownCrossSolved = false;
    let color = '';
    if (this.crossColorsSolved.length === 0) {
      // just proceed as though effective yellow cross is solved
      isDownCrossSolved = true;
      color = this.mapEffectiveColorToActual('yellow');
    } else {
      this.crossColorsSolved.forEach(crossColor => {
        if (crossColor === downColor) {
          isDownCrossSolved = true;
          color = crossColor;
        }
      });
    }

    if (!isDownCrossSolved) {
      console.warn('No cross solved on bottom. Cannot generate F2L queries.');
      return [];
    }


    const crossIndices: string = Object
      .keys(this.crossPieceIndices)
      .find(key => this.crossPieceIndices[key] === effectiveDownColor)!;

    const pairStatus = this.getF2LPairStatus(color);
    const crossArray = crossIndices.split(',').map(Number);

    // Create a query for each unsolved slot
    pairStatus.forEach((pair) => {
      if (pair.isSolved) {
        return;
      }

      const query: Query = {
        positions: {}
      };

      // Cross pieces must stay solved
      crossArray.forEach((index) => {
        const position = this.currentState!.hash[index];
        if (typeof position !== 'string') {
          console.warn(`Position for index ${index} is not a string: ${position}`);
          return;
        }
        query.positions[index] = {
          must: [position],
        };
      });

      // Already solved F2L pairs must stay solved
      pairStatus.forEach((otherPair) => {
        if (otherPair.isSolved) {
          const cornerIndex = otherPair.pairIndices[0];
          const cornerPosition = this.currentState!.hash[cornerIndex];
          if (typeof cornerPosition !== 'string') return;

          const edgeIndex = otherPair.pairIndices[1];
          const edgePosition = this.currentState!.hash[edgeIndex];
          if (typeof edgePosition !== 'string') return;

          query.positions[edgeIndex] = {
            must: [edgePosition]
          };
          query.positions[cornerIndex] = {
            must: [cornerPosition]
          };
        }
      });

      // query must look for pieces in this unsolved position
      const cornerIndex = pair.pairIndices[0];
      const cornerPosition = this.currentState!.hash[cornerIndex];
      if (typeof cornerPosition !== 'string') return;

      const edgeIndex = pair.pairIndices[1];
      const edgePosition = this.currentState!.hash[edgeIndex];
      if (typeof edgePosition !== 'string') return;

      query.positions[edgeIndex] = {
        must: [edgePosition]
      };
      query.positions[cornerIndex] = {
        must: [cornerPosition]
      };

      queries.push({ query, pairColors: [pair.pairColors[0], pair.pairColors[1]] });
    });

    return queries;
  }

  /**
   * Returns a 5x5 grid representing the last layer pattern.
   * Each cell contains a number indicating the sticker color.
    * @param colorOrder 'pattern' for pattern-based indexing, 'exact' for exact color indexing.
    * 'Pattern': 1 = top color, 2-6 = other colors based on position.
    * 'Exact': 1-6 correspond to specific colors (1=white, 2=green, 3=red, 4=blue, 5=orange, 6=yellow).
    * @returns 5x5 grid of color indices.
   */
  public getLLcoloring(colorOrder: 'pattern' | 'exact'): Grid {
    if (!this.currentState) {
      console.warn('Current state not available for pattern generation');
      return [];
    }
    const topInfo = this.topInfo;

    const colorOrdering: Record<string, number> = {};
    let nextColorIndex: number;
    if (colorOrder === 'pattern') {
      // pattern-based color ordering - index 0 reserved, index 1 is top color
      colorOrdering[topInfo.actualColor] = 1;
      nextColorIndex = 2;

    } else if (colorOrder === 'exact') {
      Object.assign(colorOrdering, this.gridColorIndex);
      nextColorIndex = 7; // all colors assigned
    }

    const getColorIndex = (colorName: string): number => {
      if (colorOrder === 'exact') {
        return colorOrdering[colorName];
      } else {
        return getPatternColorIndex(colorName);
      }
    };

    const getPatternColorIndex = (colorName: string): number => {
      if (colorOrdering[colorName] !== undefined) {
        return colorOrdering[colorName];
      }

      if (nextColorIndex >= 4) {
        throw new Error('All colors should have been assigned by now. Colors: ' + JSON.stringify(colorOrdering));
      }

      // Assign the next available index
      colorOrdering[colorName] = nextColorIndex++;
      const assignedIndex = colorOrdering[colorName];

      // If we've assigned indices 1, 2, 3, now assign their opposites to 6, 4, 5
      if (assignedIndex === 3) {
        const color1 = Object.keys(colorOrdering).find(k => colorOrdering[k] === 1)!;
        const color2 = Object.keys(colorOrdering).find(k => colorOrdering[k] === 2)!;
        const color3 = Object.keys(colorOrdering).find(k => colorOrdering[k] === 3)!;

        const opposite1 = this.getOppositeColor(color1);
        const opposite2 = this.getOppositeColor(color2);
        const opposite3 = this.getOppositeColor(color3);

        colorOrdering[opposite1] = 6; // should never be used
        colorOrdering[opposite2] = 4;
        colorOrdering[opposite3] = 5;

        nextColorIndex = 7;
      }

      return assignedIndex;
    };

    const findPieceByDirections = (targetDirections: string[]): { index: number, piece: PieceState } | null => {
      const normalizedTarget = targetDirections.map(d => d.toUpperCase()).sort();

      for (let index = 0; index < this.currentPieces.length; index++) {
        const piece = this.currentPieces[index];
        if (!piece || piece.stickers.length === 0) {
          continue;
        }

        const pieceDirections: string[] = [];
        for (let stickerIndex = 0; stickerIndex < piece.stickers.length; stickerIndex++) {
          const direction = this.getFaceletDirection(index, stickerIndex);
          if (direction) {
            pieceDirections.push(direction.toUpperCase());
          }
        }

        const sortedPieceDirections = pieceDirections.sort();
        if (JSON.stringify(sortedPieceDirections) === JSON.stringify(normalizedTarget)) {
          return { index, piece };
        }
      }
      console.warn(`Piece with directions ${targetDirections.join(',')} not found`);
      return null;
    };

    const getColorOnFace = (pieceIndex: number, face: string): string | null => {
      const piece = this.currentPieces[pieceIndex];
      if (!piece) {
        console.warn(`Piece at index ${pieceIndex} not found when getting color for face ${face}`);
        return null;
      }

      for (let stickerIndex = 0; stickerIndex < piece.stickers.length; stickerIndex++) {
        const direction = this.getFaceletDirection(pieceIndex, stickerIndex);
        if (direction && direction.toUpperCase() === face.toUpperCase()) {
          return piece.stickers[stickerIndex].colorName;
        }
      }

      console.warn(`${face} face not found on piece index ${pieceIndex}`);
      return null;
    };

    const grid: Grid = Array(5).fill(null).map(() => Array(5).fill(0));

    // Process pieces in specific order to build color indices dynamically
    // Order: UBL, UB, UBR, UL, center (U), UR, UFL, UF, UFR

    // 1. UBL corner
    const ublPiece = findPieceByDirections(['U', 'B', 'L']);
    if (ublPiece) {
      const lColor = getColorOnFace(ublPiece.index, 'L');
      const bColor = getColorOnFace(ublPiece.index, 'B');
      const uColor = getColorOnFace(ublPiece.index, 'U');

      if (lColor) grid[1][0] = getColorIndex(lColor);
      if (bColor) grid[0][1] = getColorIndex(bColor);
      if (uColor) grid[1][1] = getColorIndex(uColor);
    }

    // 2. UB edge
    const ubPiece = findPieceByDirections(['U', 'B']);
    if (ubPiece) {
      const bColor = getColorOnFace(ubPiece.index, 'B');
      const uColor = getColorOnFace(ubPiece.index, 'U');

      if (bColor) grid[0][2] = getColorIndex(bColor);
      if (uColor) grid[1][2] = getColorIndex(uColor);
    }

    // 3. UBR corner
    const ubrPiece = findPieceByDirections(['U', 'B', 'R']);
    if (ubrPiece) {
      const bColor = getColorOnFace(ubrPiece.index, 'B');
      const rColor = getColorOnFace(ubrPiece.index, 'R');
      const uColor = getColorOnFace(ubrPiece.index, 'U');

      if (bColor) grid[0][3] = getColorIndex(bColor);
      if (rColor) grid[1][4] = getColorIndex(rColor);
      if (uColor) grid[1][3] = getColorIndex(uColor);
    }

    // 4. UL edge
    const ulPiece = findPieceByDirections(['U', 'L']);
    if (ulPiece) {
      const lColor = getColorOnFace(ulPiece.index, 'L');
      const uColor = getColorOnFace(ulPiece.index, 'U');

      if (lColor) grid[2][0] = getColorIndex(lColor);
      if (uColor) grid[2][1] = getColorIndex(uColor);
    }

    // 5. U center - indexed as 1 for pattern mode
    if (colorOrder === 'pattern') {
      grid[2][2] = 1;
    } else if (colorOrder === 'exact') {
      grid[2][2] = getColorIndex(topInfo.actualColor);
    }

    // 6. UR edge
    const urPiece = findPieceByDirections(['U', 'R']);
    if (urPiece) {
      const rColor = getColorOnFace(urPiece.index, 'R');
      const uColor = getColorOnFace(urPiece.index, 'U');

      if (rColor) grid[2][4] = getColorIndex(rColor);
      if (uColor) grid[2][3] = getColorIndex(uColor);
    }

    // 7. UFL corner
    const uflPiece = findPieceByDirections(['U', 'F', 'L']);
    if (uflPiece) {
      const fColor = getColorOnFace(uflPiece.index, 'F');
      const lColor = getColorOnFace(uflPiece.index, 'L');
      const uColor = getColorOnFace(uflPiece.index, 'U');

      if (fColor) grid[4][1] = getColorIndex(fColor);
      if (lColor) grid[3][0] = getColorIndex(lColor);
      if (uColor) grid[3][1] = getColorIndex(uColor);
    }

    // 8. UF edge
    const ufPiece = findPieceByDirections(['U', 'F']);
    if (ufPiece) {
      const fColor = getColorOnFace(ufPiece.index, 'F');
      const uColor = getColorOnFace(ufPiece.index, 'U');

      if (fColor) grid[4][2] = getColorIndex(fColor);
      if (uColor) grid[3][2] = getColorIndex(uColor);
    }

    // 9. UFR corner
    const ufrPiece = findPieceByDirections(['U', 'F', 'R']);
    if (ufrPiece) {
      const fColor = getColorOnFace(ufrPiece.index, 'F');
      const rColor = getColorOnFace(ufrPiece.index, 'R');
      const uColor = getColorOnFace(ufrPiece.index, 'U');

      if (fColor) grid[4][3] = getColorIndex(fColor);
      if (rColor) grid[3][4] = getColorIndex(rColor);
      if (uColor) grid[3][3] = getColorIndex(uColor);
    }

    return grid;
  }

  public getLSEPattern(): LSEPattern {
    if (!this.cubeState) {
      return Array.from({ length: 6 }, () => Array(5).fill(0));
    }

    const cs = this.cubeState;
    const g = (face: number, row: number, col: number) => this.gridColorIndex[colorCharToName[cs[face][row][col]]];

    // 6×5 grid: middle 3 cols = U (rows 0-2) then F (rows 3-5)
    // col 0 = L stickers adjacent to U/F, col 4 = R stickers adjacent to U/F
    // L face (5): row 0 adjacent to U, col 0=B side, col 2=F side
    // R face (3): row 0 adjacent to U, col 0=F side, col 2=B side
    const grid: number[][] = [];

    // rows 0-2: U face with L/R side stickers adjacent to U
    for (let row = 0; row < 3; row++) {
      grid.push([
        g(5, 0, row),           // L face top row, running back-to-front
        g(0, row, 0),           // U face left col
        g(0, row, 1),           // U face middle col
        g(0, row, 2),           // U face right col
        g(3, 0, 2 - row),      // R face top row, running back-to-front
      ]);
    }

    // row 3: F top row, side cells blank (wrap-around gap)
    grid.push([
      0,                        // blank
      g(2, 0, 0),              // F face top-left
      g(2, 0, 1),              // F face top-center
      g(2, 0, 2),              // F face top-right
      0,                        // blank
    ]);

    // rows 4-5: F face middle/bottom rows with L/R side stickers adjacent to F
    for (let row = 1; row < 3; row++) {
      grid.push([
        g(5, row, 2),           // L face right col (adjacent to F), running top-to-bottom
        g(2, row, 0),           // F face left col
        g(2, row, 1),           // F face middle col
        g(2, row, 2),           // F face right col
        g(3, row, 0),           // R face left col (adjacent to F), running top-to-bottom
      ]);
    }

    return grid;
  }

  private getAUFindex(): { step: string, index: number, minMovements: number[], name: string } {
    const index = this.getReferencePieceLocation('green', 'white');
    const name = ['', "U'", "U2", "U"][index];
    return { step: 'auf', index, minMovements: [-1], name }
  }

  private getLLindices(steps: StepInfo[], types: Set<StepInfo['type']>) {
    if (typeof this.currentCubeRotation !== 'string') {
      console.warn('Current cube rotation not determined');
      return [];
    }
    if (types.has('solved')) {
      return [];
    }

    let indices: { step: string, index: number, minMovements: number[], name: string }[] = [];
    // co is covered by oll
    // ep covered by pll


    const LLpattern: Grid = this.getLLcoloring('pattern');

    if (!types.has('last layer')) {
      // OLL, CLL, ELL, 1LLL possible
      indices.push(this.LLinterpreter.getStepInfo(LLpattern, 'oll'));
      // eoIndex = this.LLinterpreter.getStepInfo(LLpattern, 'eo');
      // onelllIndex = this.get1LLLindex();
      // ellIndex = this.getELLindex();
      // cllIndex = this.getCLLindex();
    } else {
      if ((!steps.find(s => s.step === 'eo') || !steps.find(s => s.step === 'co')) && (!steps.find(s => s.step === 'ep') || !steps.find(s => s.step === 'cp'))) {
        indices.push(this.LLinterpreter.getStepInfo(LLpattern, 'oll'));
      }
      if (steps.find(s => s.step === 'eo') && !steps.find(s => s.step === 'co') && !steps.find(s => s.step === 'ep') && !steps.find(s => s.step === 'cp')) {
        // zbllIndex = this.LLinterpreter.getStepInfo(LLpattern, 'zbll');
        // onelllIndex = this.LLinterpreter.getStepInfo(LLpattern, 'onelll');
      }
      if (steps.find(s => s.step === 'eo') && steps.find(s => s.step === 'co') && (!steps.find(s => s.step === 'cp') || !steps.find(s => s.step === 'ep'))) {
        indices.push(this.LLinterpreter.getStepInfo(LLpattern, 'pll'));
      }
      if (steps.find(s => s.step === 'eo') && steps.find(s => s.step === 'co') && steps.find(s => s.step === 'ep') && steps.find(s => s.step === 'cp')) {
        indices.push(this.getAUFindex());
      }
    }

    return indices;
  }

  /**
   * Get current location of an edge piece with specified effective colors.
   * Useful for generating AUF information.
   * 
   * @param effectiveColor1 First effective color of the edge piece
   * @param effectiveColor2 Second effective color of the edge piece
   * @param alg optionally provide the algorithm used to generate state. For debugging.
   * @returns location index. 0=F, 1=L, 2=B, 3=R
   */
  private getReferencePieceLocation(effectiveColor1: string, effectiveColor2: string, alg?: string): number {
    let refPieceIndex = this.currentPieces.findIndex(piece => {
      const colors = piece.stickers.map(sticker => sticker.colorName);
      const effectiveColors = colors.map(color => this.mapActualColorToEffective(color));
      return effectiveColors.includes(effectiveColor1) && effectiveColors.includes(effectiveColor2) && piece.type === 'edge';
    });

    if (refPieceIndex === -1) {
      throw new Error(`Reference piece for LL case identification not found (${effectiveColor1}-${effectiveColor2}). Alg: ` + alg);
    }

    const refPiece = this.currentPieces[refPieceIndex];
    const refDirections = refPiece.stickers.map(sticker => this.getFaceletDirection(refPieceIndex, refPiece.stickers.indexOf(sticker))).filter(dir => dir !== 'U')
    if (refDirections.length !== 1) {
      throw new Error(`Reference piece for LL case identification not found. Directions: ${refDirections}. Alg: ` + alg);
    }
    const refDirection = refDirections[0];
    let location = -1;
    switch (refDirection) {
      case 'F':
        location = 0
        break;
      case 'L':
        location = 1
        break;
      case 'B':
        location = 2
        break;
      case 'R':
        location = 3
        break;
    }
    if (location === -1) {
      throw new Error(`Direction of reference piece appears incorrect. Directions: ${refDirections}. Alg: ` + alg);
    }
    return location;
  }

  /**
   * Get state information of a last layer case. Used for building llAlgs.json
   */
  public identifyLLcase(step: string, alg: string): { index: number, refPieceMovement: number, minMovements: number[] } {

    // verify f2l solved
    if (this.getPairsSolved().length !== 4) {
      throw new Error('F2L not fully solved. Cannot identify LL case. Alg: ' + alg);
    }

    const refPieceMovement = this.getReferencePieceLocation('green', 'white', alg);

    const LLpattern: Grid = this.getLLcoloring('pattern');
    let stepData: { step: string, index: number, minMovements: number[] } = { step: '', index: -1, minMovements: [-1] };
    switch (step) {
      case 'oll':
        stepData = this.LLinterpreter.getStepInfo(LLpattern, 'oll');
        break;
      case 'pll':
        stepData = this.LLinterpreter.getStepInfo(LLpattern, 'pll');
        break;
    }

    return { index: stepData.index, refPieceMovement, minMovements: stepData.minMovements };
  }

  public getAlgSuggestions(steps?: StepInfo[]): { alg: string, time: number, steps: string[], name?: string }[] {
    if (!this.algSuggester || !this.currentState) {
      return [];
    }
    if (!steps) {
      steps = this.calcCFOPstepsCompleted();
    }

    if (steps.filter(s => s.type === 'solved').length === 1) {
      return [];
    }

    const stepTypes = new Set(steps.map(s => s.type));
    const f2lSteps = steps.filter(s => s.type === 'f2l');
    const isF2LComplete = f2lSteps.length === 4;

    if (isF2LComplete) {
      // load LLsuggestor
      if (!this.LLsuggester) {
        this.LLsuggester = new LLsuggester();
      }
      return this.getLLSuggestions(steps, stepTypes);
    } else {
      return this.getF2LSuggestions(steps);
    }
  }

  /**
   * Filters out redundant algorithms that are extensions of shorter ones without unique steps.
   * Handles edge case where L' doesn't match L L (but should when L2 is spread).
   */
  private filterRedundantAlgorithms(suggestions: Suggestion[]): Suggestion[] {
    // Helper function to spread double and triple moves
    const spreadAlg = (alg: string): string => {
      return alg.replace(/([A-Za-z])([23])('?)/g, (_, letter, num, prime) => {
        if (num === '2') return `${letter} ${letter}`;
        return prime ? letter : `${letter}'`; // 3' → letter, 3 → letter'
      });
    };

    // Check if longAlg starts with shortAlg (with special handling for last move)
    const isPrefix = (shortAlg: string, longAlg: string): boolean => {
      const shortMoves = shortAlg.split(/\s+/);
      const longMoves = longAlg.split(/\s+/);

      if (shortMoves.length > longMoves.length) return false;
      if (shortMoves.length === 0) return false;

      // Compare all moves except the last one
      for (let i = 0; i < shortMoves.length - 1; i++) {
        if (shortMoves[i] !== longMoves[i]) return false;
      }

      // Handle last move specially
      const lastShortMove = shortMoves[shortMoves.length - 1];
      const lastShortIndex = shortMoves.length - 1;
      const correspondingLongMove = longMoves[lastShortIndex];

      // If last move has prime and the corresponding position has repeated move
      if (lastShortMove.endsWith("'")) {
        const letter = lastShortMove.slice(0, -1);
        // Check if long alg has "L L" at this position (meaning L2 was spread)
        if (correspondingLongMove === letter && longMoves[lastShortIndex + 1] === letter) {
          // L' matches the start of "L L", so it's a prefix
          return true;
        }
      }

      // Otherwise, just check if the moves match
      return lastShortMove === correspondingLongMove;
    };

    const spreadSuggestions = suggestions.map(suggestion => spreadAlg(suggestion.alg));
    const filteredSuggestions: Suggestion[] = [];
    const filteredSpreadAlgs: string[] = [];

    for (let i = 0; i < suggestions.length; i++) {
      const suggestion = suggestions[i];
      const spreadCurrent = spreadSuggestions[i];
      let isRedundant = false;

      for (let j = 0; j < filteredSuggestions.length; j++) {
        const spreadFiltered = filteredSpreadAlgs[j];

        // Check if current spread alg starts with an existing spread alg
        if (isPrefix(spreadFiltered, spreadCurrent)) {
          // Check if current alg has any unique steps compared to existing
          const hasUniqueSteps = suggestion.steps.some(step => !filteredSuggestions[j].steps.includes(step));

          if (!hasUniqueSteps) {
            isRedundant = true;
            break;
          }
        }
      }

      if (!isRedundant) {
        filteredSuggestions.push(suggestion);
        filteredSpreadAlgs.push(spreadCurrent);
      }
    }

    return filteredSuggestions;
  }

  private getF2LSuggestions(steps: StepInfo[]): { alg: string, time: number, steps: string[], name?: string }[] {
    const queries = this.getQueriesForF2L();

    if (!queries || queries.length === 0) {
      console.warn(`No F2L queries found for steps: ${steps.map(s => s.step).join(', ')}`);
      return [];
    }

    const speedEstimator = new AlgSpeedEstimator();
    let suggestions: Suggestion[] = [];
    const algSet = new Set<string>();
    const currentEO = this.eoValue;

    // iterate and collect suggestions
    queries.forEach(({ query, pairColors }) => {

      // some f2l cases will return a lot of algs, and the good ones may be later in the list
      // however, the list is now sorted to help avoid this
      query.limit = 40;

      query.scoreBy = 'exact'; // use 'exact' context for F2L searches.

      const algs = this.algSuggester!.searchByPosition(query);

      algs.forEach(alg => {
        const [firstColor, secondColor] = pairColors;
        const firstLetter = firstColor ? firstColor.charAt(0).toUpperCase() : '';
        const secondLetter = secondColor ? secondColor.charAt(0).toUpperCase() : '';
        const pairLabel = firstLetter && secondLetter ? `${firstLetter}${secondLetter} pair` : 'pair';

        if (!algSet.has(alg.id)) {
          algSet.add(alg.id);

          suggestions.push({
            alg: alg.id,
            time: speedEstimator.calcScore(alg.id),
            steps: [pairLabel],
            hasEOsolved: alg.eoValue !== undefined && currentEO >= 0 && alg.eoValue === currentEO,
          });
        } else {
          // Algorithm already exists - add this step to the existing suggestion
          const existingSuggestion = suggestions.find(s => s.alg === alg.id);
          if (existingSuggestion && !existingSuggestion.steps.includes(pairLabel)) {
            existingSuggestion.steps.push(pairLabel);
          }
        }
      });
    });

    // Helper function to count moves (excluding rotations and modifiers)
    const countMoves = (alg: string): number => {
      return alg.split(/\s+/).filter(move => move.match(/[^xyz2']/g)).length;
    };

    // Sort suggestions by number of moves first
    suggestions = suggestions.sort((a, b) => {
      return countMoves(a.alg) - countMoves(b.alg);
    });

    // Filter out redundant algorithms that are extensions of shorter ones without unique steps
    const filteredSuggestions = this.filterRedundantAlgorithms(suggestions);

    // Calculate cutoff time for each pair
    const cutoffTimes = new Map<string, number>();
    filteredSuggestions.forEach(suggestion => {
      suggestion.steps.forEach(pairLabel => {
        const currentBest = cutoffTimes.get(pairLabel);
        if (currentBest === undefined || suggestion.time < currentBest) {
          cutoffTimes.set(pairLabel, suggestion.time * 1.5);
        }
      });
    });

    // Filter suggestions based on their pair's cutoff time
    const fastSuggestions = filteredSuggestions.filter(suggestion =>
      suggestion.steps.some(pairLabel => suggestion.time <= (cutoffTimes.get(pairLabel) || Infinity))
    );

    // Sort by time at the end (low is better)
    return fastSuggestions.sort((a, b) => a.time - b.time).splice(0, 20); // limit to top 20
  }

  private getLLSuggestions(steps: StepInfo[], stepTypes: Set<StepInfo['type']>): { alg: string, time: number, name?: string, steps: string[] }[] {

    // Calculate all 4 reference piece origins for different AUF positions
    // preAUFidx 0: green-white, preAUFidx 1: white-red, preAUFidx 2: white-blue, preAUFidx 3: white-orange
    const refPieceOrigins = [
      this.getReferencePieceLocation('green', 'white'),  // preAUFidx 0
      this.getReferencePieceLocation('white', 'red'),    // preAUFidx 1
      this.getReferencePieceLocation('white', 'blue'),   // preAUFidx 2
      this.getReferencePieceLocation('white', 'orange'),  // preAUFidx 3
    ];

    const llIndices = this.getLLindices(steps, stepTypes);
    const algs: { alg: string, name: string, steps: string[] }[] = [];

    llIndices.forEach(index => {
      if (index.step !== 'oll' && index.step !== 'pll' && index.step !== 'auf') {
        console.warn(`LL suggestion for step ${index.step} not yet implemented.`);
        return;
      }
      const stepAlgs: string[] = this.LLsuggester!.getAlgsForStep(index.step, index.index, index.minMovements, refPieceOrigins);
      stepAlgs.forEach(alg => {
        algs.push({ alg, name: index.name, steps: [index.step] });
      });
    });

    const speedEstimator = new AlgSpeedEstimator();
    const suggestions: Suggestion[] = algs.map(alg => ({
      alg: alg.alg,
      time: speedEstimator.calcScore(alg.alg),
      steps: alg.steps,
      name: alg.name
    }));

    return suggestions.sort((a, b) => a.time - b.time); // sort by time (low is better)
  }
}