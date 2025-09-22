// import { Object3D } from 'three';
import { Object3D, Object3DEventMap, Matrix4 } from 'three';
import  AlgSuggester from './AlgSuggester';
import type { Doc, Constraint, Query } from './AlgSuggester';

interface StickerState {
  faceIdx: number;
  colorName: string;
  matrix: Matrix4;
  matrixWorld: Matrix4;
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
 * (Ab)uses the cubingjs model object to interpret the cube state.
 */
export class CubeInterpreter {
  private cube: Object3D | null;
  private solvedState: CubeState | null = null;
  // private readonly solved3x3Hash = 'afedpqjrousmafedqprjawxbvj'
  private readonly solved3x3Hash = 'adefpqjrgiwbadefqprjascmvj';
  private currentState: CubeState | null = null;
  public currentCubeRotation: string | number = -1;
  private algSuggester: AlgSuggester | null = null;

  // represents the different stickers that exist and their properties, mainly color
  private facelets: { faceIdx: number; color: string; colorName: string }[] = [];
  private solvedMatrixMaps: Map<string, { pieceIndex: number, type: string, colorName: string, direction: string }> = new Map();
  private solvedPieces: PieceState[] = [];
  private currentPieces: PieceState[] = [];

  private readonly colorRotationMap = new Map<string, number[]>([
    ["no_rotation", [0, 1, 2, 3, 4, 5]] ,
    ["y", [0, 2, 3, 4, 1, 5]],
    ["y2", [0, 3, 4, 1, 2, 5]],
    ["y'", [0, 4, 1, 2, 3, 5]], 
    ["x", [2, 1, 5, 3, 0, 4]], 
    ["x y", [2, 5, 3, 0, 1, 4]],
    ["x y2", [2, 3, 0, 1, 5, 4]],
    ["x y'", [2, 0, 1, 5, 3, 4]],
    ["x2", [5, 1, 4, 3, 2, 0]], 
    ["x2 y", [5, 4, 3, 2, 1, 0]],
    ["z2", [5, 3, 2, 1, 4, 0]],
    ["x2 y'", [5, 2, 1, 4, 3, 0]],
    ["x'", [4, 1, 0, 3, 5, 2]], 
    ["x' y", [4, 0, 3, 5, 1, 2]],
    ["x' y2", [4, 3, 5, 1, 0, 2]],
    ["x' y'", [4, 5, 1, 0, 3, 2]],
    ["z", [1, 5, 2, 0, 4, 3]], 
    ["z y", [1, 2, 0, 4, 5, 3]],
    ["z y2", [1, 0, 4, 5, 2, 3]],
    ["z y'", [1, 4, 5, 2, 0, 3]],
    ["z'", [3, 0, 2, 5, 4, 1]],
    ["z' y", [3, 2, 5, 4, 0, 1]],
    ["z' y2", [3, 5, 4, 0, 2, 1]],
    ["z' y'", [3, 4, 0, 2, 5, 1]] 
  ]);

  public crossColorsSolved: string[] = [];

  private readonly colorMap: { [key: string]: string } = {
    'FFFFFF': 'white',
    'FF0000': 'red',
    '000000': 'black',
    '3DF600': 'green',
    'F7FF00': 'yellow',
    '0085FF': 'blue',
    'FFBB00': 'orange',
  }

  /**
   * Maps cube face colors to their corresponding starting directions
   * Based on standard cube color scheme: white top, green front
   */
  private mapColorToDirection(colorName: string): string {
    const normalizedColor = colorName.toLowerCase();
    
    // Handle variations of color names
    switch (normalizedColor) {
      case 'white':
        return 'U'; // up
      case 'yellow':
        return 'D'; // down, etc
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
  
  // Cube rotations cubingjs cube object
  private readonly cubeRotations = {
    "no_rotation": { // 0
      index: 0,
      piece20Matrix: [1, 0, 0, 0, 1, 0, 0, 0, 1],
      piece21Matrix: [0, 0, 1, -1, 0, 0, 0, -1, 0],
      inverse: "no_rotation"
    },
    "y": { // 1
      index: 1,
      piece20Matrix: [1, 0, 0, 0, 1, 0, 0, 0, 1],
      piece21Matrix: [-1, 0, 0, 0, 0, -1, 0, -1, 0],
      inverse: "y'"
    },
    "y2": { // 2
      index: 2,
      piece20Matrix: [1, 0, 0, 0, 1, 0, 0, 0, 1],
      piece21Matrix: [0, 0, -1, 1, 0, 0, 0, -1, 0],
      inverse: "y2"
    },
    "y'": { // 3
      index: 3,
      piece20Matrix: [1, 0, 0, 0, 1, 0, 0, 0, 1],
      piece21Matrix: [1, 0, 0, 0, 0, 1, 0, -1, 0],
      inverse: "y"
    },
    "x": { // 4
      index: 4,
      piece20Matrix: [-1, 0, 0, 0, 0, -1, 0, -1, 0],
      piece21Matrix: [0, 0, 1, -1, 0, 0, 0, -1, 0],
      inverse: "x'"
    },
    "x y": { // 5
      index: 5,
      piece20Matrix: [0, 0, -1, 1, 0, 0, 0, -1, 0],
      piece21Matrix: [-1, 0, 0, 0, 0, -1, 0, -1, 0],
      inverse: "y' x'"
    },
    "x y2": { // 6
      index: 6,
      piece20Matrix: [1, 0, 0, 0, 0, 1, 0, -1, 0],
      piece21Matrix: [0, 0, -1, 1, 0, 0, 0, -1, 0],
      inverse: "y2 x'"
    },
    "x y'": { // 7
      index: 7,
      piece20Matrix: [0, 0, 1, -1, 0, 0, 0, -1, 0],
      piece21Matrix: [1, 0, 0, 0, 0, 1, 0, -1, 0],
      inverse: "y x'"
    },
    "x2": { // 8
      index: 8,
      piece20Matrix: [1, 0, 0, 0, -1, 0, 0, 0, -1],
      piece21Matrix: [0, 0, 1, -1, 0, 0, 0, -1, 0],
      inverse: "x2"
    },
    "x2 y": { // 9
      index: 9,
      piece20Matrix: [1, 0, 0, 0, -1, 0, 0, 0, -1],
      piece21Matrix: [-1, 0, 0, 0, 0, -1, 0, -1, 0],
      inverse: "y' x2"
    },
    "z2": { // 10
      index: 10,
      piece20Matrix: [1, 0, 0, 0, -1, 0, 0, 0, -1],
      piece21Matrix: [0, 0, -1, 1, 0, 0, 0, -1, 0],
      inverse: "z2"
    },
    "x2 y'": { // 11
      index: 11,
      piece20Matrix: [1, 0, 0, 0, -1, 0, 0, 0, -1],
      piece21Matrix: [1, 0, 0, 0, 0, 1, 0, -1, 0],
      inverse: "y x2"
    },
    "x'": { // 12
      index: 12,
      piece20Matrix: [1, 0, 0, 0, 0, 1, 0, -1, 0],
      piece21Matrix: [0, 0, 1, -1, 0, 0, 0, -1, 0],
      inverse: "x"
    },
    "x' y": { // 13
      index: 13,
      piece20Matrix: [0, 0, 1, -1, 0, 0, 0, -1, 0],
      piece21Matrix: [-1, 0, 0, 0, 0, -1, 0, -1, 0],
      inverse: "y' x"
    },
    "x' y2": { // 14
      index: 14,
      piece20Matrix: [-1, 0, 0, 0, 0, -1, 0, -1, 0],
      piece21Matrix: [0, 0, -1, 1, 0, 0, 0, -1, 0],
      inverse: "y2 x"
    },
    "x' y'": { // 15   
      index: 15,
      piece20Matrix: [0, 0, -1, 1, 0, 0, 0, -1, 0],
      piece21Matrix: [1, 0, 0, 0, 0, 1, 0, -1, 0],
      inverse: "y x"
    },
    "z": { // 16
      index: 16,
      piece20Matrix: [0, 0, -1, 1, 0, 0, 0, -1, 0],
      piece21Matrix: [1, 0, 0, 0, 1, 0, 0, 0, 1],
      inverse: "z'"
    },
    "z y": { // 17
      index: 17,
      piece20Matrix: [1, 0, 0, 0, 0, 1, 0, -1, 0],
      piece21Matrix: [1, 0, 0, 0, 1, 0, 0, 0, 1],
      inverse: "y' z'"
    },
    "z y2": { // 18
      index: 18,
      piece20Matrix: [0, 0, 1, -1, 0, 0, 0, -1, 0],
      piece21Matrix: [1, 0, 0, 0, 1, 0, 0, 0, 1],
      inverse: "y2 z'"
    },
    "z y'": { // 19
      index: 19,
      piece20Matrix: [-1, 0, 0, 0, 0, -1, 0, -1, 0],
      piece21Matrix: [1, 0, 0, 0, 1, 0, 0, 0, 1],
      inverse: "y z'"
    },
    "z'": { // 20
      index: 20,
      piece20Matrix: [0, 0, 1, -1, 0, 0, 0, -1, 0],
      piece21Matrix: [1, 0, 0, 0, -1, 0, 0, 0, -1],
      inverse: "z"
    },
    "z' y": { // 21
      index: 21,
      piece20Matrix: [-1, 0, 0, 0, 0, -1, 0, -1, 0],
      piece21Matrix: [1, 0, 0, 0, -1, 0, 0, 0, -1],
      inverse: "y' z"
    },
    "z' y2": { // 22
      index: 22,
      piece20Matrix: [0, 0, -1, 1, 0, 0, 0, -1, 0],
      piece21Matrix: [1, 0, 0, 0, -1, 0, 0, 0, -1],
      inverse: "y2 z"
    },
    "z' y'": { // 23
      index: 23,
      piece20Matrix: [1, 0, 0, 0, 0, 1, 0, -1, 0],
      piece21Matrix: [1, 0, 0, 0, -1, 0, 0, 0, -1],
      inverse: "y z"
    },
  };

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
   * The piece index (from getPieceStart) for each cross, concat'd into a single string
   */
  private readonly crossPieceIndices: { [key: string]: string } = {
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
   */
  private readonly f2lSlots: { [key: string]: { corner: number, edge: number, slotColors: [string, string] }[] } = {
    'white': [ // Down cross F2L (top layer pairs)
      { corner: 12, edge: 8, slotColors: ['green', 'red'] },  // UFR corner + FR edge
      { corner: 15, edge: 9, slotColors: ['orange', 'green'] },  // UFL corner + FL edge
      { corner: 14, edge: 11, slotColors: ['blue', 'orange'] }, // UBL corner + BL edge
      { corner: 13, edge: 10, slotColors: ['red', 'blue'] }  // UBR corner + BR edge
    ],
    'yellow': [ // Up cross F2L (bottom layer pairs)
      { corner: 16, edge: 8, slotColors: ['red', 'green'] },  // DFR corner + FR edge
      { corner: 17, edge: 9, slotColors: ['green', 'orange'] },  // DFL corner + FL edge  
      { corner: 18, edge: 11, slotColors: ['orange', 'blue'] }, // DBL corner + BL edge
      { corner: 19, edge: 10, slotColors: ['blue', 'red'] }  // DBR corner + BR edge
    ],
    'green': [ // Front cross F2L
      { corner: 12, edge: 1, slotColors: ['red', 'white'] },  // UFR corner + UR edge
      { corner: 15, edge: 3, slotColors: ['white', 'orange'] },  // UFL corner + UL edge
      { corner: 16, edge: 5, slotColors: ['yellow', 'red'] },  // DFR corner + DR edge
      { corner: 17, edge: 7, slotColors: ['orange', 'yellow'] }   // DFL corner + DL edge
    ],
    'red': [ // Right cross F2L
      { corner: 12, edge: 0, slotColors: ['white', 'green'] },  // UFR corner + UF edge
      { corner: 13, edge: 2, slotColors: ['blue', 'white'] },  // UBR corner + UB edge
      { corner: 16, edge: 4, slotColors: ['green', 'yellow'] },  // DFR corner + DF edge
      { corner: 19, edge: 6, slotColors: ['yellow', 'blue'] }   // DBR corner + DB edge
    ],
    'blue': [ // Back cross F2L
      { corner: 13, edge: 1, slotColors: ['white', 'red'] },  // UBR corner + UR edge
      { corner: 14, edge: 3, slotColors: ['orange', 'white'] },  // UBL corner + UL edge
      { corner: 19, edge: 5, slotColors: ['red', 'yellow'] },  // DBR corner + DR edge
      { corner: 18, edge: 7, slotColors: ['yellow', 'orange'] }   // DBL corner + DL edge
    ],
    'orange': [ // Left cross F2L
      { corner: 15, edge: 0, slotColors: ['green', 'white'] },  // UFL corner + UF edge
      { corner: 14, edge: 2, slotColors: ['white', 'blue'] },  // UBL corner + UB edge
      { corner: 17, edge: 4, slotColors: ['yellow', 'green'] },  // DFL corner + DF edge
      { corner: 18, edge: 6, slotColors: ['blue', 'yellow'] }   // DBL corner + DL edge
    ]
  };

  constructor(cube: Object3D | null, algs: Doc[] = []) {
    this.cube = cube;
    this.currentCubeRotation = this.getCubeRotation();
    this.solvedState = { hash: this.solved3x3Hash };
    this.facelets = this.getColors() || [];
    this.setCurrentState();
    
    // todo: predefine this
    this.solvedPieces = this.getPieces();

    // todo: predefine this
    this.solvedMatrixMaps = this.getMatrixMaps();
    
    // console.log('cube:', this.cube);

    if (algs.length > 0) { // may be []
      this.algSuggester = new AlgSuggester(algs);
    }
    
  }

  private getMatrixMaps(): Map<string, { pieceIndex: number, type: string, colorName: string, direction: string } > {
    const matrixMap = new Map<string, { pieceIndex: number, type: string, colorName: string, direction: string } >();
    this.solvedPieces.forEach((piece, pieceIndex) => {
      piece.stickers.forEach(sticker => {
        const matrixKey = this.matrixToOrientationString(sticker.matrixWorld);
        const direction = this.mapColorToDirection(sticker.colorName);
        matrixMap.set(matrixKey, { pieceIndex, type: piece.type, colorName: sticker.colorName, direction });
      });
    });
    // console.log('Matrix to piece mapping created with', matrixMap.size, 'entries');
    return matrixMap;
  }

  private matrixToOrientationString(matrix: Matrix4, sigFigs: number = 2): string {
    const factor = 10 ** sigFigs; // default 100
    const elements = matrix.elements.map(e => Math.round(e * factor) / factor); // round to 2 decimal places
    // Only use first 12 elements (rotation/scale), ignore translation (elements 12-15)
    return elements.slice(0, 12).join(',');
  }

  private getPieces(): PieceState[] {

    if (!this.cube || !('kpuzzleFaceletInfo' in this.cube) || !this.cube.kpuzzleFaceletInfo) {
      console.warn('Cube reference is not available for piece extraction');
      return [];
    }

    const centers = (this.cube.kpuzzleFaceletInfo as any).CENTERS;
    const corners = (this.cube.kpuzzleFaceletInfo as any).CORNERS;
    const edges = (this.cube.kpuzzleFaceletInfo as any).EDGES;
    const pieces: PieceState[] = [];

    if (!centers || !corners || !edges) {
      console.warn('CENTERS, CORNERS, or EDGES not found in kpuzzleFaceletInfo');
      console.log('centers:', centers);
      console.log('corners:', corners);
      console.log('edges:', edges);
      return pieces;
    }

    const edgePieces = this.getPieceByType(edges, 'edge');
    const cornerPieces = this.getPieceByType(corners, 'corner');
    const centerPieces = this.getPieceByType(centers, 'center');

    pieces.push(...edgePieces, ...cornerPieces, ...centerPieces);
    return pieces;
  }

  private getPieceByType(rawPieces: any[], type: 'center' | 'corner' | 'edge'): PieceState[] {
    const pieces: PieceState[] = [];
    
    const startOffset = type === 'edge' ? 0 : type === 'corner' ? 12 : 20;
    const pieceCount = type === 'edge' ? 12 : type === 'corner' ? 8 : 6;

    rawPieces.forEach((rawPiece, index) => {
      if (index >= pieceCount) {
        console.warn(`Skipping extra ${type} piece at index ${index}`);
        return
      }
      
      if (!rawPiece || !Array.isArray(rawPiece) || rawPiece.length === 0) {
        console.warn(`Invalid data for ${type} piece at index ${index}`);
        return;
      }

      const origin = this.getPieceStart(startOffset + index);
      const stickers: StickerState[] = [];

      // get stickers
      rawPiece.forEach((face, index) => {
        if (!face || !face.facelet) {
          console.warn(`${type} piece face #${index} missing facelet data`);
          return;
        }
        const faceIdx = face.faceIdx
        const facelet = face.facelet;

        stickers.push({
          faceIdx: faceIdx,
          colorName: this.facelets[faceIdx].colorName,
          matrix: facelet.matrix,
          matrixWorld: facelet.matrixWorld
        });
      });

      pieces.push({
        type,
        origin,
        stickers
      });
    });
    return pieces;
  }

  private getColors(): typeof this.facelets | undefined {
    if (!this.cube) {
      console.warn('Cube reference is not available for color extraction');
      return;
    }

    if (!('kpuzzleFaceletInfo' in this.cube) || !this.cube.kpuzzleFaceletInfo) {
      console.warn('kpuzzleFaceletInfo not found on cube object');
      return;
    }

    const faceletInfo = this.cube.kpuzzleFaceletInfo as any;
    if (!faceletInfo.CENTERS) {
      console.warn('CENTERS not found in kpuzzleFaceletInfo');
      return;
    }

    const colors: { faceIdx: number, color: string, colorName: string }[] = [];

    faceletInfo.CENTERS.forEach((center: any, faceIdx: number) => {
      if (!center[0] || !center[0].facelet) {
        console.warn(`Center ${faceIdx} missing facelet data`);
        return;
      }

      const facelet = center[0].facelet;
      if (!facelet.material || !('color' in facelet.material)) {
        console.warn(`Center ${faceIdx} missing material color`);
        return;
      }

      const color = facelet.material.color.getHex();
      const hexString = color.toString(16).toUpperCase().padStart(6, '0');
      const colorName = this.colorMap[hexString] || 'UNKNOWN';
      colors.push({ faceIdx, color: hexString, colorName });
    });

    return colors;
  } 

  /**
   * Updates the cube reference
   */
  public setCube(cube: Object3D | null): void {
    this.cube = cube;
  }

  /**
   * Captures the current state of all cube pieces
   */
  private calcCurrentState(): CubeState | null {
    if (!this.cube || !this.cube.children) {
      console.warn('Cube reference is not available');
      return null;
    }

    if (!this.currentCubeRotation || !(typeof this.currentCubeRotation === 'string')) {
      console.warn('Current cube rotation is not determined');
      return null;
    } 

    if (!this.solvedMatrixMaps || this.solvedMatrixMaps.size === 0) {
      console.warn('Solved matrix maps are not available');
      return null;
    }
    this.currentPieces = this.getPieces();

    const pieceColorMapping = this.mapPiecesByColor();

    if (pieceColorMapping.size !== this.currentPieces.length) {
      console.warn('Piece mapping size does not match current pieces length');
      console.log('Piece mapping:', pieceColorMapping);
      console.log('Current pieces:', this.currentPieces);
      return null;
    }

    let hash = this.hashRecoloredPieces(pieceColorMapping);
    if (!hash) {
      console.warn('Failed to generate hash from recolored pieces');
      return null;
    }

    console.log('Generated hash:', hash);

    return { hash };
  }

  private hashRecoloredPieces(pieceColorMapping: Map<number, { effectivePieceIndex: number, stickerOrder: string[] }>): string | null {
    let hash = '';

    pieceColorMapping.forEach(({ effectivePieceIndex, stickerOrder }, currentIndex) => {
      const leadColorIdx = stickerOrder[0]; // effective color
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
          // 0 = a, 1 = b, ...
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

  /**
   * Get the direction (U, D, L, R, F, B) of a facelet
   */
  private getFaceletDirection(pieceIndex: number, stickerIndex: number): string | null {
    const piece = this.currentPieces[pieceIndex];
    if (!piece || !piece.stickers || stickerIndex >= piece.stickers.length) {
      console.warn(`Invalid piece or sticker index: piece ${pieceIndex}, sticker ${stickerIndex}`);
      return null;
    }
    const sticker = piece.stickers[stickerIndex];
    const matrixKey = this.matrixToOrientationString(sticker.matrixWorld);
    const mapping = this.solvedMatrixMaps.get(matrixKey);
    const direction = mapping ? mapping.direction : null;
    if (!direction) {
      console.warn('Direction not found for sticker matrix:', matrixKey);
      console.log('Matrixes:', this.solvedMatrixMaps);
    }
    return direction;
  }

  /**
   * Uses current rotation to map colors to their effective colors
   * Then maps each piece in currentPieces to its corresponding piece of effective colors
   */
  private mapPiecesByColor = (): Map<number, { effectivePieceIndex: number, stickerOrder: string[] }> => {

    // create dict mapping original piece index to piece index of currentPiece of effective colors
    // make it also contain the original order of the stickers
    const pieceMapping = new Map<number, { effectivePieceIndex: number, stickerOrder: string[] }>();
    const colorMapping = this.colorRotationMap.get(this.currentCubeRotation as string) || [0,1,2,3,4,5];
    
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

          // original for current, or other way around?
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
      case 16: return 'DFR'; // these last four break the pattern. Todo: Confirm.
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

  /**
   * Debugging method for viewing the hash used to search for algorithms
   */
  public setCurrentState(current?: Object3D<Object3DEventMap> | null): void {
    if (current) {
      this.cube = current;
    }
    this.currentCubeRotation = this.getCubeRotation();

    this.currentState = this.calcCurrentState();
  }

  /**
   * Checks if the cross is solved, also returns color(s) of cross.
   */
  public isCrossSolved(): boolean {
    const solvedPieces = this.getSolvedPieces();

    const colorsSolved: string[] = [];
    
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
        colorsSolved.push(this.crossPieceIndices[key]);
      }
    });

    this.crossColorsSolved = colorsSolved;

    return colorsSolved.length > 0;
  }
  

  /**
   * Checks if F2L (First Two Layers) is solved
   * Template method - will be replaced with hash-based approach
   */
  public isF2LSolved(): boolean {
    return false;
  }

  /**
   * Checks if OLL (Orientation of Last Layer) is solved
   * Template method - will be replaced with hash-based approach
   */
  public isOLLSolved(): boolean {
    return false
  }

  /**
   * Checks if PLL (Permutation of Last Layer) is solved
   * Template method - will be replaced with hash-based approach
   */
  public isPLLSolved(): boolean {
    return this.isCubeSolved();
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

  /**
   * Get current solve step.
   */
  public getCompletedStep(): string {
    // TODO: in parallel, return results for different methods, mainly Roux and ZZ.
    if (this.isCubeSolved()) return 'solved';
    if (this.isPLLSolved()) return 'pll';
    if (this.isOLLSolved()) return 'oll';
    if (this.isF2LSolved()) return 'f2l';
    if (this.isCrossSolved()) return 'cross';
    return 'none';
  }

  /**
   * Finds which rotation the current cube is in.
   * Returns the index (0-23) of the matching rotation, or -1 if no match found
   */
  public getCubeRotation(): string | number {
    if (!this.cube || !this.cube.children) {
      console.warn('Cube reference is not available for rotation tracking');
      return -1;
    }

    const piece20 = this.cube.children[20];
    const piece21 = this.cube.children[21];
    
    if (!piece20 || !piece21) {
      console.warn('Piece 20 or 21 not found');
      return -1;
    }

    // Extract the rotation part of the matrix (upper-left 3x3) for both pieces
    // Round to 1 decimal place to handle floating point precision issues
    const matrix20 = piece20.matrix.elements;
    const currentMatrix20 = [
      Math.round(matrix20[0]), Math.round(matrix20[1]), Math.round(matrix20[2]),
      Math.round(matrix20[4]), Math.round(matrix20[5]), Math.round(matrix20[6]),
      Math.round(matrix20[8]), Math.round(matrix20[9]), Math.round(matrix20[10])
    ];

    const matrix21 = piece21.matrix.elements;
    const currentMatrix21 = [
      Math.round(matrix21[0]), Math.round(matrix21[1]), Math.round(matrix21[2]),
      Math.round(matrix21[4]), Math.round(matrix21[5]), Math.round(matrix21[6]),
      Math.round(matrix21[8]), Math.round(matrix21[9]), Math.round(matrix21[10])
    ];
    
    // Find matching rotation in the cube rotations array
    for (const [rotationName, rotation] of Object.entries(this.cubeRotations)) {
      // Check if both piece20 and piece21 matrices match
      const piece20Matches = this.arraysEqualWithin(currentMatrix20, rotation.piece20Matrix);
      const piece21Matches = this.arraysEqualWithin(currentMatrix21, rotation.piece21Matrix);
      
      if (piece20Matches && piece21Matches) {
        // console.log(`Current cube orientation matches rotation ${rotationName}`);
        return rotationName;
      }
    }
    
    console.log('Current cube orientation does not match any known rotation');
    console.log('Current piece20 matrix:', currentMatrix20);
    console.log('Current piece21 matrix:', currentMatrix21);
    return -1;
  }

  /**
   * Checks if two 2D arrays are equal within a small tolerance
   * 
   * @param a First array
   * @param b Second array
   * @param within Default tolerance = 0.1
   * 
   * @Returns boolean
   */
  private arraysEqualWithin(a: number[], b: number[], within: number = 0.1): boolean {
    if (a.length !== b.length) return false;
    
    for (let i = 0; i < a.length; i++) {
      if (Math.abs(a[i] - b[i]) > within) { // Allow small tolerance for floating point comparison
        return false;
      }
    }
    
    return true;
  }


  /**   * Gets the full position string for all pieces in the cube
   * Concatenates positions of all pieces into a single string
   */
  public getFullPosition(): string {
    if (!this.cube || !this.cube.children) {
      console.warn('Cube reference is not available for full position analysis');
      return '';
    }

    return '';

  }

  /**
   * Debug method to log current state
   */
  public getCurrentState(): CubeState | null {

    // ensure up-to-date
    this.setCurrentState();

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
   * @param color 
   * @returns Dictionary for each pair, containing colors, indices, and solve status
   */
  private getF2LPairStatus(color: string): { pairColors: [string, string], pairIndices: [number, number], isSolved: boolean}[] | [] {
    
    const slots = this.f2lSlots[color];
    if (!slots) {
      console.warn(`No F2L slots found for color: ${color}`);
      return [{ pairColors: ['',''], pairIndices: [-1,-1], isSolved: false }];
    }

    const status: {pairColors: [string, string], pairIndices: [number, number], isSolved: boolean}[]  = [];
    const solvedIndices = this.getSolvedPieces();
    
    slots.forEach(slot => {
      const cornerIndex = slot.corner;
      const edgeIndex = slot.edge;
      const isCornerSolved: boolean = !!solvedIndices.find((index) => index === cornerIndex) // undefined is false
      const isEdgeSolved: boolean = !!solvedIndices.find((index) => index === edgeIndex)
      if (isCornerSolved && isEdgeSolved) {
        status.push({pairColors: slot.slotColors, pairIndices: [cornerIndex, edgeIndex], isSolved: true})
      } else {
        status.push({pairColors: slot.slotColors, pairIndices: [cornerIndex, edgeIndex], isSolved: false })        
      }
    });

    return status

  }


  /**
   * Generates a query that does not allow cross become unsolved, 
   * unless there are multiple crosses.
   * @returns Query to find any solved pieces, not just for f2l
   */
  private getQueryForF2L(): Query {
    if (!this.crossColorsSolved || this.crossColorsSolved.length === 0) {
      console.warn('Cross colors not solved or not available');
      return { positions: {} };
    }
    if (!this.currentState) {
      console.warn('Current state not available for query generation');
      return { positions: {} };
    }
    const queries: Query[] = [];
    this.crossColorsSolved.forEach((color) => {
      const crossIndices = Object
        .entries(this.crossPieceIndices)
        .find(([_, value]) => value === color)?.[0];
      if (!crossIndices) {
        console.warn(`No piece indices found for color: ${color}`);
        return;
      }
      const pairStatus = this.getF2LPairStatus(color);
      // console.log(`F2L pairs for color ${color}:`, pairStatus);
      const crossArray = crossIndices.split(',').map(Number);
      const query: Query = {
        positions: {
        }
      };
      crossArray.forEach((index) => {

        // untested
        const position = this.currentState!.hash[index];

        // assert type of position is string
        if (typeof position !== 'string') {
          console.warn(`Position for index ${index} is not a string: ${position}`);
          return;
        }

        query.positions[index] = {
          // cross piece must stay solved
          must: [position],
        }
      });
      pairStatus.forEach((pair) => {
        if (pair.isSolved) {
          // pair must stay solved

          const cornerIndex = pair.pairIndices[0];
          const cornerPosition = this.currentState!.hash[cornerIndex];
          if (typeof cornerPosition !== 'string') return;

          const edgeIndex = pair.pairIndices[1];
          const edgePosition = this.currentState!.hash[edgeIndex];
          if (typeof edgePosition !== 'string') return;

          query.positions[edgeIndex] = {
            must: [edgePosition]
          }
          query.positions[cornerIndex] = {
            must: [cornerPosition]
          }
        } else {
          // pair may be solved from its current position

          const cornerIndex = pair.pairIndices[0];
          const cornerPosition = this.currentState!.hash[cornerIndex];
          if (typeof cornerPosition !== 'string') return;

          const edgeIndex = pair.pairIndices[1];
          const edgePosition = this.currentState!.hash[edgeIndex];
          if (typeof edgePosition !== 'string') return;

          query.positions[edgeIndex] = {
            may: [edgePosition]
          }
          query.positions[cornerIndex] = {
            may: [cornerPosition]
          }
        }

      });

      queries.push(query);
    });

    const accQuery = this.accumulateQueries(queries);
    return accQuery;
  }


  private getQuery(step: string): Query | null {
    switch (step) {
      case 'cross':
        return this.getQueryForF2L();
      default:
        // return nothing
        return null;
    }
  }

  public getAutocompleteSuggestions(): string[] {
    if (!this.algSuggester || !this.currentState) {
      return [];
    }

    const currentStep = this.getCompletedStep();
    const query = this.getQuery(currentStep);

    if (!query) {
      console.warn(`No query found for step: ${currentStep}`);
      return [];
    }

    query.limit = 20;
    query.scoreBy = 'may';
    console.log('Query:', query);
    const suggestions = this.algSuggester.searchByPosition(query);
    return suggestions.map(result => result.id);
  }
}