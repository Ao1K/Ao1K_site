import AlgSuggester from './ExactAlgSuggester';
import type { Doc, Constraint, Query } from './ExactAlgSuggester';
import AlgSpeedEstimator from './AlgSpeedEstimator';
import type { Grid } from './LLinterpreter';
import LLinterpreter from './LLinterpreter';
import LLsuggester from './LLsuggester';

// SimpleCube types
type Color = 'W' | 'Y' | 'R' | 'O' | 'G' | 'B';
type Line = [Color, Color, Color];
type Face = [Line, Line, Line];
type SimpleCubeState = [Face, Face, Face, Face, Face, Face]; // [up, down, front, right, back, left]

export interface Suggestion {
  alg: string;
  time: number;
  step: string;
  name?: string;
}

// maps single-char color codes to full color names
const colorCharToName: { [key in Color]: string } = {
  'W': 'white',
  'Y': 'yellow',
  'R': 'red',
  'O': 'orange',
  'G': 'green',
  'B': 'blue'
};

const colorNameToChar: { [key: string]: Color } = {
  'white': 'W',
  'yellow': 'Y',
  'red': 'R',
  'orange': 'O',
  'green': 'G',
  'blue': 'B'
};

interface StickerState {
  faceIdx: number;
  colorName: string;
  direction: string; // U, D, L, R, F, B
}

interface PieceState {
  type: 'corner' | 'edge' | 'center';
  origin: string; // e.g. 'UFR', 'FR', 'U'
  stickers: StickerState[];
}

interface CubeState {
  hash: string;
}

export interface StepInfo {
  step: string;
  type: 'cross' | 'f2l' | 'last layer' | 'solved' | 'none';
  colors: string[];
  caseIndex: number | null;
  name?: string; // Optional name for LL cases (OLL/PLL names)
  pattern?: Grid;
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
   * Finally, we get the location of each piece that has those mapped (effective) colors.
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
  private LLsuggester: LLsuggester;

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

  /**
   * Maps edge piece positions to their sticker locations in SimpleCubeState.
   * Each entry: [face1, row1, col1, dir1, face2, row2, col2, dir2]
   * face indices: 0=U, 1=D, 2=F, 3=R, 4=B, 5=L
   */
  private readonly edgePositions: [number, number, number, string, number, number, number, string][] = [
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
  private readonly cornerPositions: [number, number, number, string, number, number, number, string, number, number, number, string][] = [
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
  private readonly centerPositions: [number, number, number, string][] = [
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

  private readonly edgePieceDirections: { [key: string]: number} = {
    'UF': 0, 'UR': 1, 'UB': 2, 'UL': 3, 
    'DF': 4, 'DR': 5, 'DB': 6, 'DL': 7, 
    'FR': 8, 'FL': 9, 'BR': 10, 'BL': 11,
    'FU': 12, 'RU': 13, 'BU': 14, 'LU': 15,
    'FD': 16, 'RD': 17, 'BD': 18, 'LD': 19,
    'RF': 20, 'LF': 21, 'RB': 22, 'LB': 23
  };

  private readonly centerPieceDirections: { [key: string]: number} = {
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
  private readonly cornerPieceDirections: { [key: string]: number} = {
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
   * Used for determining if last layer corners and edges are correctly permuted.
   */
  private readonly effectiveColorOrder: string[] = ['green', 'red', 'blue', 'orange'];
  private readonly lastLayerEdgeOrder: string[] = ['UF', 'UR', 'UB', 'UL'];
  private readonly lastLayerCornerOrder: string[] = ['UFR', 'UBR', 'UBL', 'UFL'];

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

    if (algs.length > 0) {
      this.algSuggester = new AlgSuggester(algs);
    }

    this.LLsuggester = new LLsuggester();
  }

  /**
   * Maps cube face colors to their corresponding starting directions
   * Based on standard cube color scheme: white top, green front
   */
  private mapColorToDirection(colorName: string): string {
    const normalizedColor = colorName.toLowerCase();

    switch (normalizedColor) {
      case 'white':
        return 'U';
      case 'yellow':
        return 'D';
      case 'orange':
        return 'L';
      case 'red':
        return 'R';
      case 'green':
        return 'F';
      case 'blue':
        return 'B';
      default:
        console.warn(`Unknown color for direction mapping: ${colorName}`);
        return 'unknown';
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
    // edges 0-11: derived from getPieceStart (UF=white+green, UR=white+red, etc.)
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

    // corners 12-19: derived from getPieceStart (UFR=white+green+red, etc.)
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
        origin: this.getPieceStart(i),
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
        origin: this.getPieceStart(12 + i),
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
        origin: this.getPieceStart(20 + i),
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
  private getFaceletDirection(pieceIndex: number, stickerIndex: number): string | null {
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

  /**
   * Determines the start position string for a piece based on its index
   */
  private getPieceStart(index: number): string {
    switch (index) {
      // Edges (0-11)
      case 0: return 'UF';
      case 1: return 'UR';
      case 2: return 'UB';
      case 3: return 'UL';
      case 4: return 'DF';
      case 5: return 'DR';
      case 6: return 'DB';
      case 7: return 'DL';
      case 8: return 'FR';
      case 9: return 'FL';
      case 10: return 'BR';
      case 11: return 'BL';
      // Corners (12-19)
      case 12: return 'UFR';
      case 13: return 'UBR';
      case 14: return 'UBL';
      case 15: return 'UFL';
      case 16: return 'DFR';
      case 17: return 'DFL';
      case 18: return 'DBL';
      case 19: return 'DBR';
      // Centers (20-25)
      case 20: return 'U'; // white
      case 21: return 'L'; // orange
      case 22: return 'F'; // green
      case 23: return 'R'; // red
      case 24: return 'B'; // blue
      case 25: return 'D'; // yellow
      default: return 'Unknown';
    }
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
   * Method for passing in SimpleCubeState to update and interpret the current state.
   */
  public getStepsCompleted(cubeState?: SimpleCubeState | null): StepInfo[] {
    if (cubeState) {
      this.cubeState = cubeState;
    }

    if (!this.cubeState) {
      console.warn('No cube state available');
      return [];
    }

    this.currentCubeRotation = this.getCubeRotation();
    this.currentState = this.calcCurrentState();
    this.crossColorsSolved = this.calcCrossColorsSolved();

    const steps = this.calcStepsCompleted();
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

    const pieceColorMapping = this.mapPiecesByColor();

    if (pieceColorMapping.size !== this.currentPieces.length) {
      console.warn('Piece mapping size does not match current pieces length');
      return null;
    }

    const hash = this.hashRecoloredPieces(pieceColorMapping);
    
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

  private getOppositeColor(color: string): string {
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

  /**
   * Check which f2l pairs are solved
   * Assumes cross on bottom
   */
  public getPairsSolved(): string[] {
    const topInfo = this.getTopCenterInfo();
    const crossColors = this.crossColorsSolved;

    if (!topInfo || crossColors.length === 0) {
      return [];
    }

    const topColor = topInfo.actualColor;
    const bottomColor = this.getOppositeColor(topColor);

    if (crossColors.find(c => c.toLowerCase() === bottomColor) === undefined) {
      // cross not on bottom
      return [];
    }
    const crossColor = bottomColor;

    const pairsSolved: string[] = [];

    // Map actual color to effective color (yellow cross-based mapping)
    const effectiveColor = this.mapActualColorToEffective(crossColor);
    const slots = this.f2lSlots[effectiveColor.toLowerCase()];
    if (!slots) {
      console.warn(`No F2L slots defined for effective color: ${effectiveColor} (from actual cross color: ${crossColor})`);
      return [];
    }

    slots.forEach((slot) => {
      // get the starting location of each piece
      const cornerIndex = slot.corner;
      const edgeIndex = slot.edge;

      // compare their resulting locations to their solved locations
      const cornerSolvedChar = this.solvedState!.hash[cornerIndex];
      const edgeSolvedChar = this.solvedState!.hash[edgeIndex];

      const cornerCurrentChar = this.currentState!.hash[cornerIndex];
      const edgeCurrentChar = this.currentState!.hash[edgeIndex];

      if (cornerSolvedChar === cornerCurrentChar && edgeSolvedChar === edgeCurrentChar) {
        // get the slot colors and map from effective colors to actual colors
        const actualSlotColors = slot.slotColors.map(effectiveColor => 
          this.mapEffectiveColorToActual(effectiveColor)[0].toUpperCase()
        );

        pairsSolved.push(actualSlotColors.join('') + ' pair');
      }
    });

    return pairsSolved;
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
   * This is the foundation for hash-based solve detection
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
      if (direction && direction.toUpperCase() === 'U') {
        const actualColor = centerPiece.stickers[0].colorName;
        const effectiveColor = this.mapActualColorToEffective(actualColor);
        return { actualColor, effectiveColor, direction: direction.toUpperCase() };
      }
    }

    console.warn('Unable to determine top center orientation');
    return null;
  }

  public isEOsolved(): boolean {
    if (!this.ensureState() || !this.currentState) {
      return false;
    }

    const topInfo = this.getTopCenterInfo();
    if (!topInfo) {
      return false;
    }

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

  public isCOsolved(): boolean {
    if (!this.ensureState() || !this.currentState) {
      return false;
    }

    const topInfo = this.getTopCenterInfo();
    if (!topInfo) {
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

    if (cornerPairs.length !== this.effectiveColorOrder.length) {
      return { matched: false, cornerInfos };
    }

    const adjacentPairsForOffset = (offset: number): string[] => (
      this.effectiveColorOrder.map((_, index) => {
        const current = this.effectiveColorOrder[(offset + index) % this.effectiveColorOrder.length];
        const next = this.effectiveColorOrder[(offset + index + 1) % this.effectiveColorOrder.length];
        return pairKey(current, next);
      })
    );

    for (let offset = 0; offset < this.effectiveColorOrder.length; offset++) {
      const pattern = adjacentPairsForOffset(offset);
      const matches = pattern.every((pair, index) => cornerPairs[index] === pair);
      if (matches) {
        return { matched: true, cornerInfos };
      }
    }

    return { matched: false, cornerInfos };
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

    const topInfo = this.getTopCenterInfo();
    if (!topInfo) {
      return false;
    }

    const { edgesSolved } = this.calcLLPermutationStatus(topInfo);
    return edgesSolved;
  }

  public isCPsolved(): boolean {
    if (!this.ensureState() || !this.currentState || !this.solvedState) {
      return false;
    }

    const topInfo = this.getTopCenterInfo();
    if (!topInfo) {
      return false;
    }

    const { cornersSolved } = this.calcLLPermutationStatus(topInfo);
    return cornersSolved;
  }

  /**
   * It may be case where both edges and corner are permuted, but not with respect to each other, like in H perm
   * In this case, return only that corners are solved (prefer first look of 2look PLL)
   * @returns 
   */
  public getLLPermutationStatus(): { edgesSolved: boolean; cornersSolved: boolean } {
    if (!this.ensureState() || !this.currentState || !this.solvedState) {
      return { edgesSolved: false, cornersSolved: false };
    }

    const topInfo = this.getTopCenterInfo();
    if (!topInfo) {
      return { edgesSolved: false, cornersSolved: false };
    }

    return this.calcLLPermutationStatus(topInfo);
  }
  
  public calcStepsCompleted(): StepInfo[] {
    // TODO: in parallel, return results for different methods, mainly Roux and ZZ.

    const steps: StepInfo[] = [];
    if (this.isCubeSolved()) {
    
      steps.push({
        step: 'solved',
        type: 'solved',
        colors: [],
        caseIndex: null
      });
    
      return steps;
    
    }
      
    if (this.isCrossSolved()) {
      // presume cross color on bottom, if multiple
      if (this.crossColorsSolved.length > 1) {
        this.crossColorsSolved.forEach(color => {
          const topColor = this.getTopCenterInfo()!.actualColor;
          const bottomColor = this.getOppositeColor(topColor);
          if (color.toLowerCase() === bottomColor) {
            steps.push({
              step: `cross`,
              type: 'cross',
              colors: [bottomColor],
              caseIndex: null
            });
          }
        });
      } else {
        steps.push({
          step: `cross`,
          type: 'cross',
          colors: [this.crossColorsSolved[0]],
          caseIndex: null
        });
      }
    }

    // we do allow pairs to be solved without cross, because humans make mistakes
    const pairsSolved = this.getPairsSolved();

    let postPairPattern = undefined;
    if (pairsSolved.length === 4 && steps.filter(s => s.type === 'last layer').length === 0) {
      // on last pair, get LL pattern for later steps
      postPairPattern = this.getLLcoloring('exact');
    }

    pairsSolved.forEach((pairString, i) => {
      // Extract colors from pair string (e.g., "WR pair" -> ["white", "red"])
      const colors = pairString.replace(' pair', '').match(/[A-Z]/g) || [];
      const colorNames = colors.map(c => {
        const colorMap: Record<string, string> = {
          'W': 'white', 'Y': 'yellow', 'R': 'red', 
          'O': 'orange', 'B': 'blue', 'G': 'green'
        };
        return colorMap[c] || c.toLowerCase();
      });

      
      steps.push({
        step: 'pair',
        type: 'f2l',
        colors: colorNames,
        caseIndex: null,
        pattern: postPairPattern
      });
    });

    if (pairsSolved.length !== 4) {
      return steps; // no need to check further
    }

    // check last layer base steps
    const LLpattern = this.getLLcoloring('exact');
  
    const topColor = this.getTopCenterInfo()?.actualColor || '';
    if (this.isEOsolved()) {
      steps.push({
        step: 'eo',
        type: 'last layer',
        colors: [topColor],
        caseIndex: null,
        pattern: LLpattern
      });
    }
    if (this.isCOsolved()) {
      steps.push({
        step: 'co',
        type: 'last layer',
        colors: [topColor],
        caseIndex: null,
        pattern: LLpattern
      });
    }

    const { edgesSolved, cornersSolved } = this.getLLPermutationStatus();
    if (edgesSolved) {
      steps.push({
        step: 'ep',
        type: 'last layer',
        colors: [topColor],
        caseIndex: null,
        pattern: LLpattern
      });
    }
    if (cornersSolved) {
      steps.push({
        step: 'cp',
        type: 'last layer',
        colors: [topColor],
        caseIndex: null,
        pattern: LLpattern
      });
    }

    // check if all edges are oriented
    // if (this.isPureEOsolved()) steps.push('pure_eo');

    if (steps.length === 0) {
      steps.push({
        step: 'none',
        type: 'none',
        colors: [],
        caseIndex: null
      });
    }

    return steps;
  }

  /**
   * Debug method to log current state
   */
  public getCurrentState(): CubeState | null {
    return this.currentState;
  }

  /**
   * Thought out only for f2l where multiple crosses are solved.
   * Unverified AI-generated code.
   * 
   * For each position, for each condition:
   *   if query A and B match, then just preserve 
   * 
   *   must A + must B => may A or B;
   *   must A + may B => may A or B;
   *   may A + must B => may A or B;
   *   must A + not B => may A, not B;
   *   may A + not B => may A, not B;
   *   not A + not B => not A or B;
   *  
   */
  private accumulateQueries(queries: Query[]): Query {
    if (queries.length === 0) {
      return { positions: {} };
    }
    
    if (queries.length === 1) {
      return queries[0];
    }

    const result: Query = { positions: {} };
    const allPositions = new Set<string | number>();

    // Collect all positions from all queries
    queries.forEach(query => {
      Object.keys(query.positions).forEach(pos => {
        allPositions.add(isNaN(Number(pos)) ? pos : Number(pos));
      });
    });

    // For each position, accumulate constraints
    allPositions.forEach(position => {
      const constraints: Constraint[] = [];
      
      // Collect constraints for this position from all queries
      queries.forEach(query => {
        const constraint = query.positions[position];
        if (constraint) {
          constraints.push(constraint);
        }
      });

      if (constraints.length === 0) {
        return; // No constraints for this position
      }

      const accumulated: Constraint = {};

      // Helper functions to normalize constraint values to arrays
      const normalizeToArray = (value: string | string[] | undefined): string[] => {
        if (!value) return [];
        return Array.isArray(value) ? value : [value];
      };

      const combineArrays = (...arrays: string[][]): string[] => {
        const combined = new Set<string>();
        arrays.forEach(arr => arr.forEach(item => combined.add(item)));
        return Array.from(combined);
      };

      // Process each constraint type
      for (let i = 0; i < constraints.length; i++) {
        const constraint = constraints[i];
        const mustValues = normalizeToArray(constraint.must);
        const mayValues = normalizeToArray(constraint.may);
        const notValues = normalizeToArray(constraint.not);

        if (i === 0) {
          // First constraint, just copy
          if (mustValues.length > 0) accumulated.must = mustValues;
          if (mayValues.length > 0) accumulated.may = mayValues;
          if (notValues.length > 0) accumulated.not = notValues;
        } else {
          // Accumulate with previous constraints according to the rules
          const currentMust = normalizeToArray(accumulated.must);
          const currentMay = normalizeToArray(accumulated.may);
          const currentNot = normalizeToArray(accumulated.not);

          // New accumulated values
          let newMust: string[] = [];
          let newMay: string[] = [];
          let newNot: string[] = [];

          // Handle must constraints
          if (mustValues.length > 0) {
            if (currentMust.length > 0) {
              // must A + must B: may A or B
              newMay = combineArrays(newMay, currentMust, mustValues);
            } else if (currentMay.length > 0) {
              // may A + must B: may A or B  
              newMay = combineArrays(newMay, currentMay, mustValues);
            } else if (currentNot.length > 0) {
              // not A + must B: may B, not A
              newMay = combineArrays(newMay, mustValues);
              newNot = combineArrays(newNot, currentNot);
            } else {
              // No previous constraint, preserve must
              newMust = combineArrays(newMust, mustValues);
            }
          }

          // Handle may constraints
          if (mayValues.length > 0) {
            if (currentMust.length > 0) {
              // must A + may B: may A or B
              newMay = combineArrays(newMay, currentMust, mayValues);
            } else if (currentMay.length > 0) {
              // may A + may B: may A or B
              newMay = combineArrays(newMay, currentMay, mayValues);
            } else if (currentNot.length > 0) {
              // not A + may B: may B, not A
              newMay = combineArrays(newMay, mayValues);
              newNot = combineArrays(newNot, currentNot);
            } else {
              // No previous constraint, preserve may
              newMay = combineArrays(newMay, mayValues);
            }
          }

          // Handle not constraints  
          if (notValues.length > 0) {
            if (currentMust.length > 0) {
              // must A + not B: may A, not B
              newMay = combineArrays(newMay, currentMust);
              newNot = combineArrays(newNot, notValues);
            } else if (currentMay.length > 0) {
              // may A + not B: may A, not B
              newMay = combineArrays(newMay, currentMay);
              newNot = combineArrays(newNot, notValues);
            } else if (currentNot.length > 0) {
              // not A + not B: not A or B
              newNot = combineArrays(newNot, currentNot, notValues);
            } else {
              // No previous constraint, preserve not
              newNot = combineArrays(newNot, notValues);
            }
          }

          // If no new constraints from this iteration, preserve existing
          if (mustValues.length === 0 && mayValues.length === 0 && notValues.length === 0) {
            newMust = currentMust;
            newMay = currentMay;
            newNot = currentNot;
          }

          // Update accumulated
          accumulated.must = newMust.length > 0 ? newMust : undefined;
          accumulated.may = newMay.length > 0 ? newMay : undefined;
          accumulated.not = newNot.length > 0 ? newNot : undefined;
        }
      }

      // Only add to result if there are actual constraints
      if (accumulated.must || accumulated.may || accumulated.not) {
        result.positions[position] = accumulated;
      }
    });

    return result;
  }

  /**
   * Get the indices of pieces where their f2l pair is not solved.
   * @param color The actual color of the cross
   * @returns Dictionary for each pair, containing colors, indices, and solve status
   */
  private getF2LPairStatus(color: string): { pairColors: [string, string], pairIndices: [number, number], isSolved: boolean}[] | [] {
    
    const effectiveColor = this.mapActualColorToEffective(color);
  
    const slots = this.f2lSlots[effectiveColor];
    if (!slots) {
      console.warn(`No F2L slots found for color: ${color}`);
      return [{ pairColors: ['',''], pairIndices: [-1,-1], isSolved: false }];
    }


    const status: {pairColors: [string, string], pairIndices: [number, number], isSolved: boolean}[]  = [];
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
        status.push({pairColors, pairIndices: [cornerIndex, edgeIndex], isSolved: true})
      } else {
        status.push({pairColors, pairIndices: [cornerIndex, edgeIndex], isSolved: false })        
      }
    });

    return status

  }

  /**
   * Debug function for logging the colors of a piece by its index
   */
  private logPieceColors(pieceIndex: number): void {
    if (pieceIndex < 0 || pieceIndex >= this.currentPieces.length) {
      console.warn(`Invalid piece index: ${pieceIndex}. Valid range: 0-${this.currentPieces.length - 1}`);
      return;
    }

    const piece = this.currentPieces[pieceIndex];
    const colors = piece.stickers.map(sticker => `${sticker.colorName}`).join(', ');
    
    console.log(`Piece ${pieceIndex} (${piece.type} - ${piece.origin}): ${colors}`);
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
    const topInfo = this.getTopCenterInfo();
    if (!topInfo) {
      console.warn('Top center info not available for pattern generation');
      return [];
    }

    const colorOrdering: Record<string, number> = {};
    let nextColorIndex: number;
    if (colorOrder === 'pattern') {
      // pattern-based color ordering - index 0 reserved, index 1 is top color
      colorOrdering[topInfo.actualColor] = 1;
      nextColorIndex = 2;

    } else if (colorOrder === 'exact') {
      colorOrdering['white'] = 1;
      colorOrdering['yellow'] = 2;
      colorOrdering['green'] = 3;
      colorOrdering['blue'] = 4;
      colorOrdering['red'] = 5;
      colorOrdering['orange'] = 6;
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
        if (!piece || !piece.stickers.some(s => s.colorName === topInfo.actualColor)) {
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
      return null;
    };

    const getColorOnFace = (pieceIndex: number, face: string): string | null => {
      const piece = this.currentPieces[pieceIndex];
      if (!piece) return null;

      for (let stickerIndex = 0; stickerIndex < piece.stickers.length; stickerIndex++) {
        const direction = this.getFaceletDirection(pieceIndex, stickerIndex);
        if (direction && direction.toUpperCase() === face.toUpperCase()) {
          return piece.stickers[stickerIndex].colorName;
        }
      }
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

  private getAUFindex(): {step: string, index: number, minMovements: number[], name: string} {
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

    let indices: {step: string, index: number, minMovements: number[], name: string}[] = [];
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
  public identifyLLcase(step: string, alg: string): { index: number, refPieceMovement: number, minMovements: number[]} {

    // verify f2l solved
    if (this.getPairsSolved().length !== 4) {
      throw new Error('F2L not fully solved. Cannot identify LL case. Alg: ' + alg);
    }

    const refPieceMovement = this.getReferencePieceLocation('green', 'white', alg);

    const LLpattern: Grid = this.getLLcoloring('pattern');
    let stepData: {step: string, index: number, minMovements: number[]} = {step: '', index: -1, minMovements: [-1]};
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

  public getAlgSuggestions(steps?: StepInfo[]): {alg: string, time: number, step: string, name?: string}[] {
    if (!this.algSuggester || !this.currentState) {
      return [];
    }
    if (!steps) {
      steps = this.calcStepsCompleted();
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

  private getF2LSuggestions(steps: StepInfo[]): {alg: string, time: number, step: string, name?: string}[] {
    const queries = this.getQueriesForF2L();

    if (!queries || queries.length === 0) {
      console.warn(`No F2L queries found for steps: ${steps.map(s => s.step).join(', ')}`);
      return [];
    }

    const speedEstimator = new AlgSpeedEstimator();
    let suggestions: Suggestion[] = [];
    const algSet = new Set<string>();
    
    // iterate and collect suggestions
    queries.forEach(({ query, pairColors }) => {
      query.limit = 20;
      query.scoreBy = 'exact'; // use 'exact' context for F2L searches
      
      const algs = this.algSuggester!.searchByPosition(query);
      
      algs.forEach(alg => {
        if (!algSet.has(alg.id)) {
          algSet.add(alg.id);
          
          const [firstColor, secondColor] = pairColors;
          const firstLetter = firstColor ? firstColor.charAt(0).toUpperCase() : '';
          const secondLetter = secondColor ? secondColor.charAt(0).toUpperCase() : '';
          const pairLabel = firstLetter && secondLetter ? `${firstLetter}${secondLetter} pair` : 'pair';
          
          suggestions.push({
            alg: alg.id,
            time: speedEstimator.calcScore(alg.id),
            step: pairLabel
          });
        }
      });
    });

    // sort suggestions by score (low is better)
    suggestions = suggestions.sort((a, b) => a.time - b.time);

    return suggestions;
  }

  private getLLSuggestions(steps: StepInfo[], stepTypes: Set<StepInfo['type']>): {alg: string, time: number, name?: string, step: string}[] {

    // Calculate all 4 reference piece origins for different AUF positions
    // preAUFidx 0: green-white, preAUFidx 1: white-red, preAUFidx 2: white-blue, preAUFidx 3: white-orange
    const refPieceOrigins = [
      this.getReferencePieceLocation('green', 'white'),  // preAUFidx 0
      this.getReferencePieceLocation('white', 'red'),    // preAUFidx 1
      this.getReferencePieceLocation('white', 'blue'),   // preAUFidx 2
      this.getReferencePieceLocation('white', 'orange'),  // preAUFidx 3
    ];
    
    const llIndices = this.getLLindices(steps, stepTypes);
    const algs: {alg: string, name: string, step: string}[] = [];

    llIndices.forEach(index => {
      if (index.step !== 'oll' && index.step !== 'pll' && index.step !== 'auf') {
        console.warn(`LL suggestion for step ${index.step} not yet implemented.`);
        return;
      }
      const stepAlgs: string[] = this.LLsuggester!.getAlgsForStep(index.step, index.index, index.minMovements, refPieceOrigins);
      stepAlgs.forEach(alg => {
        algs.push({alg, name: index.name, step: index.step});
      });
    });

    const speedEstimator = new AlgSpeedEstimator();
    const suggestions: Suggestion[] = algs.map(alg => ({
      alg: alg.alg,
      time: speedEstimator.calcScore(alg.alg),
      step: alg.step,
      name: alg.name
    }));

    return suggestions.sort((a, b) => a.time - b.time); // sort by time (low is better)
  }
}