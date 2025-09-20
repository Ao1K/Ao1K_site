// import { Object3D } from 'three';
import { Object3D, Object3DEventMap, Matrix4 } from 'three';
import  AlgSuggester from './AlgSuggester';
import type { Doc, Constraint, Query } from './AlgSuggester';

interface PieceState {
  matrix: number[]; // 16-element transformation matrix
  start: string; // e.g., 'U' for center, 'UF' for edge, 'UFR' for corner, etc.
  index: number;
}

interface CubeState {
  hash: string;
}

interface GetPositionValidation {
  success: boolean;
  data?: {
    piece: Object3D;
    inverseMatrix: Matrix4;
    effectiveIndex: number;
  };
  error?: string;
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
  private unmatchedNormalizedMatrices: Set<string> = new Set();
  public currentCubeRotation: string | number = -1;
  private algSuggester: AlgSuggester | null = null;

  // 1. set up cube_Null white top green front
  // 2. set up cube_Rotation with rotation applied
  // 3. look at piece of index 0 (between U and F) on cube_R
  // 4. find piece with same colors on Cube_N
  // 5. enter position of that piece for Cube_N in table below.
  // 6. repeat in order as seen in getPieceStart indices
  //adefpqjrgiwbadefqprjascmvj
  //fdefqqjrdrwbxdeigvrjascmvj
  private readonly effectivePieceIndexKey = { // defines the location of a piece on the solved cube given some rotation value
    "no_rotation": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25], // verified
    "y": [1, 2, 3, 0, 5, 6, 7, 4, 10, 8, 11, 9, 13, 14, 15, 12, 19, 16, 17, 18, 20, 22, 23, 24, 21, 25], // verified
    "y2": [2, 3, 0, 1, 6, 7, 4, 5, 11, 10, 9, 8, 14, 15, 12, 13, 18, 19, 16, 17, 20, 23, 24, 21, 22, 25], // verified
    "y'": [3, 0, 1, 2, 7, 4, 5, 6, 9, 11, 8, 10, 15, 12, 13, 14, 17, 18, 19, 16, 20, 24, 21, 22, 23, 25], // verified
    "x": [4, 8, 0, 9, 6, 10, 2, 11, 5, 7, 1, 3, 16, 12, 15, 17, 19, 18, 14, 13, 22, 21, 25, 23, 20, 24], // verified
    "x y": [8, 0, 9, 4, 10, 2, 11, 6, 1, 5, 3, 7, 12, 15, 17, 16, 13, 19, 18, 14, 22, 25, 23, 20, 21, 24],
    "x y2": [0, 9, 4, 8, 2, 11, 6, 10, 3, 1, 7, 5, 15, 17, 16, 12, 14, 13, 19, 18, 22, 23, 20, 21, 25, 24],
    "x y'": [9, 4, 8, 0, 11, 6, 10, 2, 7, 3, 5, 1, 17, 16, 12, 15, 18, 14, 13, 19, 22, 20, 21, 25, 23, 24],
    "x2": [6, 5, 4, 7, 2, 1, 0, 3, 10, 11, 8, 9, 19, 16, 17, 18, 13, 14, 15, 12, 25, 21, 24, 23, 22, 20], // edges good
    "x2 y": [5, 4, 7, 6, 1, 0, 3, 2, 8, 10, 9, 11, 16, 17, 18, 19, 12, 13, 14, 15, 25, 24, 23, 22, 21, 20],
    "z2": [4, 7, 6, 5, 0, 3, 2, 1, 9, 8, 11, 10, 17, 18, 19, 16, 15, 12, 13, 14, 25, 23, 22, 21, 24, 20],
    "x2 y'": [7, 6, 5, 4, 3, 2, 1, 0, 11, 9, 10, 8, 18, 19, 16, 17, 14, 15, 12, 13, 25, 22, 21, 24, 23, 20],
    "x'": [2, 10, 6, 11, 0, 8, 4, 9, 1, 3, 5, 7, 13, 19, 18, 14, 12, 15, 17, 16, 24, 21, 20, 23, 25, 22], // first 4 edges and 4 corners correct
    "x' y": [10, 6, 11, 2, 8, 4, 9, 0, 5, 1, 7, 3, 19, 18, 14, 13, 16, 12, 15, 17, 24, 20, 23, 25, 21, 22],
    "x' y2": [6, 11, 2, 10, 4, 9, 0, 8, 7, 5, 3, 1, 18, 14, 13, 19, 17, 16, 12, 15, 24, 23, 25, 21, 20, 22],
    "x' y'": [11, 2, 10, 6, 9, 0, 8, 4, 3, 7, 1, 5, 14, 13, 19, 18, 15, 17, 16, 12, 24, 25, 21, 20, 23, 22],
    "z": [9, 3, 11, 7, 8, 1, 10, 5, 0, 4, 2, 6, 15, 14, 18, 17, 12, 16, 19, 13, 21, 25, 22, 20, 24, 23], // verified
    "z y": [3, 11, 7, 9, 1, 10, 5, 8, 2, 0, 6, 4, 14, 18, 17, 15, 13, 12, 16, 19, 21, 22, 20, 24, 25, 23],
    "z y2": [11, 7, 9, 3, 10, 5, 8, 1, 6, 2, 4, 0, 18, 17, 15, 14, 19, 13, 12, 16, 21, 20, 24, 25, 22, 23],
    "z y'": [7, 9, 3, 11, 5, 8, 1, 10, 4, 6, 0, 2, 17, 15, 14, 18, 16, 19, 13, 12, 21, 24, 25, 22, 20, 23],
    "z'": [8, 5, 10, 1, 9, 7, 11, 3, 4, 0, 6, 2, 16, 19, 13, 12, 17, 15, 14, 18, 23, 20, 22, 25, 24, 21],
    "z' y": [5, 10, 1, 8, 7, 11, 3, 9, 6, 4, 2, 0, 19, 13, 12, 16, 18, 17, 15, 14, 23, 22, 25, 24, 20, 21],
    "z' y2": [10, 1, 8, 5, 11, 3, 9, 7, 2, 6, 0, 4, 13, 12, 16, 19, 14, 18, 17, 15, 23, 25, 24, 20, 22, 21],
    "z' y'": [1, 8, 5, 10, 3, 9, 7, 11, 0, 2, 4, 6, 12, 16, 19, 13, 15, 14, 18, 17, 23, 24, 20, 22, 25, 21] 
  }

  /**
   * In a property similar but not the same as EO, some rotations change the orientation of edges
   * These values give an index to the rotationMatrices to correct for that change 
   * (corrected rotation = rotationMatrix * originalMatrix)
   */
  private effectiveOrientationKey: { [key: string]: number[] } = {
    "no_rotation": [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    "y": [0,0,0,0,0,0,0,0,16,17,17,16,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    "y2": [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    "y'": [0,0,0,0,0,0,0,0,16,17,17,16,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    "x": [7,0,21,0,21,0,7,0,0,0,0,0,14,12,18,20,18,12,14,20,0,0,0,0,0,0],
    "x y": [0,13,0,19,0,19,0,13,16,17,17,16,6,1,22,8,22,1,6,8,0,0,0,0,0,0],
    "x y2": [7,0,21,0,21,0,7,0,0,0,0,0,14,12,18,20,18,12,14,20,0,0,0,0,0,0],
    "x y'": [0,13,0,19,0,19,0,13,16,17,17,16,6,1,22,8,22,1,6,8,0,0,0,0,0,0], 
    "x2": [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    "x2 y": [0,0,0,0,0,0,0,0,16,17,17,16,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    "z2": [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    "x2 y'": [0,0,0,0,0,0,0,0,16,17,17,16,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    "x'": [7,0,21,0,21,0,7,0,0,0,0,0,14,12,18,20,18,12,14,20,0,0,0,0,0,0],
    "x' y": [0,13,0,19,0,19,0,13,16,17,17,16,6,1,22,8,22,1,6,8,0,0,0,0,0,0],
    "x' y2": [7,0,21,0,21,0,7,0,0,0,0,0,14,12,18,20,18,12,14,20,0,0,0,0,0,0],
    "x' y'": [0,13,0,19,0,19,0,13,16,17,17,16,6,1,22,8,22,1,6,8,0,0,0,0,0,0],
    "z": [7,13,21,19,21,19,7,13,16,17,17,16,6,1,22,8,22,1,6,8,0,0,0,0,0,0],
    "z y": [7,13,21,19,21,19,7,13,0,0,0,0,14,12,18,20,18,12,14,20,0,0,0,0,0,0],
    "z y2": [7,13,21,19,21,19,7,13,16,17,17,16,6,1,22,8,22,1,6,8,0,0,0,0,0,0],
    "z y'": [7,13,21,19,21,19,7,13,0,0,0,0,14,12,18,20,18,12,14,20,0,0,0,0,0,0],
    "z'": [7,13,21,19,21,19,7,13,16,17,17,16,6,1,22,8,22,1,6,8,0,0,0,0,0,0],
    "z' y": [7,13,21,19,21,19,7,13,0,0,0,0,14,12,18,20,18,12,14,20,0,0,0,0,0,0],
    "z' y2": [7,13,21,19,21,19,7,13,16,17,17,16,6,1,22,8,22,1,6,8,0,0,0,0,0,0],
    "z' y'": [7,13,21,19,21,19,7,13,0,0,0,0,14,12,18,20,18,12,14,20,0,0,0,0,0,0] 
  }

  public crossColorsSolved: string[] = [];
  
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

  private readonly cornerEdgePositions: { [key: string]: string } = {
    "100010001": "a",
    "00-11000-10": "b",
    "10000-1010": "c",
    "001010-100": "d",
    "-10001000-1": "e",
    "00-1010100": "f",
    "001100010": "g",
    "-100001010": "h",
    "00-1-100010": "i",
    "1000-1000-1": "j",
    "0-10100001": "k",
    "010-100001": "l",
    "01000-1-100": "m",
    "01010000-1": "n",
    "010001100": "o",
    "-1000-10001": "p",
    "0010-10100": "q",
    "00-10-10-100": "r",
    "0-1000-1100": "s",
    "0-10-10000-1": "t",
    "0-10001-100": "u",
    "-10000-10-10": "v",
    "001-1000-10": "w",
    "1000010-10": "x"
  }

  // arrays match cornerEdgePositions keys
  private readonly rotationMatrices: { [key: number]: number[] } = {
    0: [1,0,0,0,1,0,0,0,1], // identity, no rotation
    1: [0,0,-1,1,0,0,0,-1,0],
    2: [1,0,0,0,0,-1,0,1,0],
    3: [0,0,1,0,1,0,-1,0,0],
    4: [-1,0,0,0,1,0,0,0,-1],
    5: [0,0,-1,0,1,0,1,0,0],
    6: [0,0,1,1,0,0,0,1,0],
    7: [-1,0,0,0,0,1,0,1,0],
    8: [0,0,-1,-1,0,0,0,1,0],
    9: [1,0,0,0,-1,0,0,0,-1],
    10: [0,-1,0,1,0,0,0,0,1],
    11: [0,1,0,-1,0,0,0,0,1],
    12: [0,1,0,0,0,-1,-1,0,0],
    13: [0,1,0,1,0,0,0,0,-1],
    14: [0,1,0,0,0,1,1,0,0],
    15: [-1,0,0,0,-1,0,0,0,1],
    16: [0,0,1,0,-1,0,1,0,0],
    17: [0,0,-1,0,-1,0,-1,0,0],
    18: [0,-1,0,0,0,-1,1,0,0],
    19: [0,-1,0,-1,0,0,0,0,-1],
    20: [0,-1,0,0,0,1,-1,0,0],
    21: [-1,0,0,0,0,-1,0,-1,0],
    22: [0,0,1,-1,0,0,0,-1,0],
    23: [1,0,0,0,0,1,0,-1,0]
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

  /**
   * Validates all preconditions for getPosition method
   */
  private validateGetPosition(pieceIndex: number): GetPositionValidation {
    if (!this.cube || !this.cube.children) {
      return { success: false, error: 'Cube reference is not available for corner analysis' };
    }

    if (typeof this.currentCubeRotation !== 'string') {
      return { success: false, error: 'Current cube rotation is not a string as expected' };
    }

    const effectiveLookup = this.effectivePieceIndexKey[this.currentCubeRotation as keyof typeof this.effectivePieceIndexKey];
    const effectiveIndex = effectiveLookup ? effectiveLookup[pieceIndex] : -1;
    if (effectiveIndex === -1) {
      return { success: false, error: 'Could not determine effective piece index' };
    }
    // const effectiveIndex = pieceIndex;

    const piece = this.cube.children[effectiveIndex];
    if (!piece) {
      return { success: false, error: 'Piece not found' };
    }

    const rotationData = this.cubeRotations[this.currentCubeRotation as keyof typeof this.cubeRotations];
    if (!rotationData) {
      return { success: false, error: 'Invalid cube rotation data' };
    }

    const inverseMatrix = this.getRotationMatrix(rotationData.inverse);
    if (!inverseMatrix) {
      return { success: false, error: `Could not get rotation matrix for inverse: ${rotationData.inverse}` };
    }

    return {
      success: true,
      data: { piece, inverseMatrix, effectiveIndex }
    };
  }

  constructor(cube: Object3D | null, algs: Doc[] = []) {
    this.cube = cube;
    this.currentCubeRotation = this.trackUniqueRotation();
    this.solvedState = { hash: this.solved3x3Hash };
    this.updateCurrentState();


    if (algs.length > 0) { // may be []
      this.algSuggester = new AlgSuggester(algs);
    }
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
  private captureCurrentState(): CubeState | null {
    if (!this.cube || !this.cube.children) {
      console.warn('Cube reference is not available');
      return null;
    }

    if (!this.currentCubeRotation || this.currentCubeRotation === -1) {
      console.warn('Current cube rotation is not determined');
      return null;
    }

    const children = this.cube.children;
    let hash = '';
    let key: number[] = [];

    // Process only the known piece indices: 0-11 (edges), 12-19 (corners), 20-25 (centers)
    children.forEach((child: Object3D, index: number) => {
      // Skip label pieces (indices 26-31)
      if (index >= 26 && index <= 31) {
        return;
      }

      // if (index === 8) {
      //   const matrixElements = this.cube!.children[index].matrix.elements;
      //   console.log(`Matrix elements for piece at index ${index}:`);
      //   console.log(this.cube!.children[index]);
      //   const upper3x3 = [
      //     Math.round(matrixElements[0] * 100) / 100 || 0, Math.round(matrixElements[1] * 100) / 100 || 0, Math.round(matrixElements[2] * 100) / 100 || 0,
      //     Math.round(matrixElements[4] * 100) / 100 || 0, Math.round(matrixElements[5] * 100) / 100 || 0, Math.round(matrixElements[6] * 100) / 100 || 0,
      //     Math.round(matrixElements[8] * 100) / 100 || 0, Math.round(matrixElements[9] * 100) / 100 || 0, Math.round(matrixElements[10] * 100) / 100 || 0
      //   ];
      //   console.log('Pos:', upper3x3);
      //   const world3x3 = this.cube!.children[index].matrixWorld.elements;
      //   const worldUpper3x3 = [
      //     Math.round(world3x3[0] * 100) / 100 || 0, Math.round(world3x3[1] * 100) / 100 || 0, Math.round(world3x3[2] * 100) / 100 || 0,
      //     Math.round(world3x3[4] * 100) / 100 || 0, Math.round(world3x3[5] * 100) / 100 || 0, Math.round(world3x3[6] * 100) / 100 || 0,
      //     Math.round(world3x3[8] * 100) / 100 || 0, Math.round(world3x3[9] * 100) / 100 || 0, Math.round(world3x3[10] * 100) / 100 || 0
      //   ];
      //   console.log('World:', worldUpper3x3);

      // }

      const char = this.getPosition(index);
      const rotationKey = this.getRotationKey(index);
      key.push(rotationKey);
      if (char === -1) {
        console.warn(`Could not determine position for piece at index ${index}`);
      }
      hash += char;

      // if (index === 0) {
      //   console.log(char);
      // }
    });

    console.log(this.currentCubeRotation, key.toString());

    return { hash };
  }

  /**
   * Analyzes the cube structure to identify piece types
   * This helps determine which children are centers, corners, and edges
   */
  public analyzeCubeStructure(): void {
    if (!this.cube || !this.cube.children) {
      console.warn('Cube reference is not available for analysis');
      return;
    }
    const children = this.cube.children;
    console.log('=== CUBE STRUCTURE ANALYSIS ===');
    console.log(`Total children: ${children.length}`);
    let stateHash: string = '';
    
    children.forEach((child: Object3D, index: number) => {
      if (index >= 26 && index <= 31) {
        // Skip label pieces (indices 26-31)
        return;
      }
      if (index >= 20) {
        // Skip center pieces (indices 20-25) for now
        return;
      }
      const hashLetter = this.getPosition(index);
      stateHash += hashLetter;
    });
    console.log(`Cube state hash: ${stateHash}`);
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
      case 20: return 'U';
      case 21: return 'L';
      case 22: return 'F';
      case 23: return 'R';
      case 24: return 'B';
      case 25: return 'D';
      default: return 'Unknown';
    }
  }

  /**
   * Updates the current state by capturing the cube's current position
   */
  public updateCurrentState(current?: Object3D<Object3DEventMap> | null): void {
    if (current) {
      this.cube = current;
    }
    this.currentCubeRotation = this.trackUniqueRotation();
    this.currentState = this.captureCurrentState();
    console.log('current hash:', this.currentState?.hash);
    console.log('finished updating current state');
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
  public trackUniqueRotation(): string | number {
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
        console.log(`Current cube orientation matches rotation ${rotationName}`);
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

  /**
   * Gets the raw position of a piece without applying any rotation mapping
   * This is used for computing the effectivePieceIndexKey mappings
   */
  private getRawPosition(pieceIndex: number): string | number {
    if (!this.cube || !this.cube.children) {
      console.warn('Cube reference is not available for raw position analysis');
      return -1;
    }

    const piece = this.cube.children[pieceIndex];
    if (!piece) {
      console.warn('Piece not found');
      return -1;
    }

    // Extract the rotation part (upper-left 3x3) and round
    const elements = piece.matrix.elements;
    const normalizedMatrix = [
      Math.round(elements[0]), Math.round(elements[1]), Math.round(elements[2]),
      Math.round(elements[4]), Math.round(elements[5]), Math.round(elements[6]),
      Math.round(elements[8]), Math.round(elements[9]), Math.round(elements[10])
    ];

    // Find matching position in cornerEdgePositions
    const positionKey = normalizedMatrix.join('');
    const positionChar = this.cornerEdgePositions[positionKey];
    
    if (positionChar == undefined) {
      console.warn(`Raw position matrix does not match any known rotation for piece ${pieceIndex}`);
      this.unmatchedNormalizedMatrices.add(normalizedMatrix.join(', '));
      return -1;
    }

    return positionChar;
  }

  /**
   * @param pieceIndex Index of a piece (0-11 for edges, 12-19 for corners)
   * 
   * Position value for a corner or edge piece. 
   * Position means a unique combination of orientation and location.
   * 
   * @Returns "a" through "x" for corners or edges. Returns -1 if not found or error.
   */
  public getPosition(pieceIndex: number): number | string {

    const validation = this.validateGetPosition(pieceIndex);
    
    if (!validation.success) {
      console.warn(validation.error);
      return -1;
    }

    const { piece, inverseMatrix, effectiveIndex } = validation.data!;

    // apply inverse rotation to piece matrix
    // TODO: consider pre-computing. Only 12 things result could be
    const pieceMatrix = piece.matrix.clone();
  

    // pieceMatrix.premultiply(inverseMatrix);

    // Extract the rotation part (upper-left 3x3) and round
    const elements = pieceMatrix.elements;
    let normalizedMatrix = [
      Math.round(elements[0]), Math.round(elements[4]), Math.round(elements[8],),
      Math.round(elements[1]), Math.round(elements[5]), Math.round(elements[9]),
      Math.round(elements[2]), Math.round(elements[6]), Math.round(elements[10])
    ];

    const orientation = this.effectiveOrientationKey[this.currentCubeRotation as keyof typeof this.effectiveOrientationKey];
    if (!orientation) {
      console.warn('No rotation matrix found for current cube rotation:', this.currentCubeRotation);
      return -1;
    }
    const rotationKey = orientation[pieceIndex];
    const rotationMatrix = this.rotationMatrices[rotationKey];
    
    // Apply 3x3 matrix multiplication: rotationMatrix × normalizedMatrix
    const result = [
      rotationMatrix[0] * normalizedMatrix[0] + rotationMatrix[1] * normalizedMatrix[3] + rotationMatrix[2] * normalizedMatrix[6],
      rotationMatrix[0] * normalizedMatrix[1] + rotationMatrix[1] * normalizedMatrix[4] + rotationMatrix[2] * normalizedMatrix[7],
      rotationMatrix[0] * normalizedMatrix[2] + rotationMatrix[1] * normalizedMatrix[5] + rotationMatrix[2] * normalizedMatrix[8],
      rotationMatrix[3] * normalizedMatrix[0] + rotationMatrix[4] * normalizedMatrix[3] + rotationMatrix[5] * normalizedMatrix[6],
      rotationMatrix[3] * normalizedMatrix[1] + rotationMatrix[4] * normalizedMatrix[4] + rotationMatrix[5] * normalizedMatrix[7],
      rotationMatrix[3] * normalizedMatrix[2] + rotationMatrix[4] * normalizedMatrix[5] + rotationMatrix[5] * normalizedMatrix[8],
      rotationMatrix[6] * normalizedMatrix[0] + rotationMatrix[7] * normalizedMatrix[3] + rotationMatrix[8] * normalizedMatrix[6],
      rotationMatrix[6] * normalizedMatrix[1] + rotationMatrix[7] * normalizedMatrix[4] + rotationMatrix[8] * normalizedMatrix[7],
      rotationMatrix[6] * normalizedMatrix[2] + rotationMatrix[7] * normalizedMatrix[5] + rotationMatrix[8] * normalizedMatrix[8]
    ];
    
    const rotatedMatrix = result.map(Math.round);
    
    const positionKey = rotatedMatrix.join('');
    const positionChar = this.cornerEdgePositions[positionKey];
    
    if (positionChar == undefined) {
      console.warn('Normalized corner matrix does not match any known rotation');
      this.unmatchedNormalizedMatrices.add(rotatedMatrix.join(', '));
      // console.log('Stored unmatched normalized matrices:', this.unmatchedNormalizedMatrices);
      return -1;
    }

    return positionChar;

  }
  public getRotationKey(pieceIndex: number): number {

    const validation = this.validateGetPosition(pieceIndex);
    
    if (!validation.success) {
      console.warn(validation.error);
      return -1;
    }

    const { piece, inverseMatrix, effectiveIndex } = validation.data!;

    // apply inverse rotation to piece matrix
    // TODO: consider pre-computing. Only 12 things result could be
    const pieceMatrix = piece.matrix.clone();
  

    // pieceMatrix.premultiply(inverseMatrix);

    // Extract the rotation part (upper-left 3x3) and round
    const elements = pieceMatrix.elements;
    // extract 3x3 in column-major order: [m11,m12,m13,m21,...,m33]
    let normalizedMatrix = [
      Math.round(elements[0]), Math.round(elements[4]), Math.round(elements[8]),
      Math.round(elements[1]), Math.round(elements[5]), Math.round(elements[9]),
      Math.round(elements[2]), Math.round(elements[6]), Math.round(elements[10])
    ];

    // account for changes to world matrix
    // flip sign if it's different in world matrix
    // const worldElements = this.cube!.children[pieceIndex].matrixWorld.elements;
    // const worldElementsArray = [
    //   Math.round(worldElements[0] * 100) / 100 || 0,
    //   Math.round(worldElements[1] * 100) / 100 || 0,
    //   Math.round(worldElements[2] * 100) / 100 || 0,
    //   Math.round(worldElements[4] * 100) / 100 || 0,
    //   Math.round(worldElements[5] * 100) / 100 || 0,
    //   Math.round(worldElements[6] * 100) / 100 || 0,
    //   Math.round(worldElements[8] * 100) / 100 || 0,
    //   Math.round(worldElements[9] * 100) / 100 || 0,
    //   Math.round(worldElements[10] * 100) / 100 || 0
    // ];

    // // Check for sign mismatches and apply rotation correction if needed
    // let isSignMismatch = false;
    // const mismatchPattern: number[] = [];
    // for (let i = 0; i < 9; i++) {
    //   if (normalizedMatrix[i] !== 0 && worldElementsArray[i] !== 0 && 
    //       Math.sign(normalizedMatrix[i]) !== Math.sign(worldElementsArray[i])) {
    //     isSignMismatch = true;
    //     mismatchPattern.push(i);
    //   }
    // }
    
    // If we have sign mismatches, try all rotations until we find one that produces the correct solved hash character
    // if (isSignMismatch) {
      // console.log('Sign mismatch for piece:', pieceIndex, 'at positions:', mismatchPattern);
      // console.log('Current cube rotation:', this.currentCubeRotation);
      // console.log('Piece matrix:', normalizedMatrix);
      // console.log('World matrix:', worldElementsArray);
      
      // Get the expected character from solved hash for this piece
    const expectedChar = this.solved3x3Hash[pieceIndex];
    // console.log('Expected char from solved hash:', expectedChar);

    // Try each rotation until we find one that produces the expected character
    for (const [rotationKey, rotationMatrix] of Object.entries(this.rotationMatrices)) {
      // Create Matrix4 from normalized matrix (3x3 -> 4x4)
      const pieceMatrix4 = new Matrix4();
      pieceMatrix4.set(
        // row-major set: m11,m12,m13,m14; m21...; m31...; m41...
        normalizedMatrix[0], normalizedMatrix[1], normalizedMatrix[2], 0,
        normalizedMatrix[3], normalizedMatrix[4], normalizedMatrix[5], 0,
        normalizedMatrix[6], normalizedMatrix[7], normalizedMatrix[8], 0,
        0, 0, 0, 1
      );
      
      // Create rotation Matrix4 (3x3 -> 4x4)
      const rotationMatrix4 = new Matrix4();
      rotationMatrix4.set(
        rotationMatrix[0], rotationMatrix[1], rotationMatrix[2], 0,
        rotationMatrix[3], rotationMatrix[4], rotationMatrix[5], 0,
        rotationMatrix[6], rotationMatrix[7], rotationMatrix[8], 0,
        0, 0, 0, 1
      );
      
      // Apply rotation: rotationMatrix × pieceMatrix
      // console.log('multiplying:', rotationMatrix4, '×', pieceMatrix4);
      pieceMatrix4.premultiply(rotationMatrix4);
      
      
      // Extract 3x3 rotation part and round (column-major extraction)
      const elements = pieceMatrix4.elements;
      const rotatedMatrix = [
        Math.round(elements[0]), Math.round(elements[4]), Math.round(elements[8]),
        Math.round(elements[1]), Math.round(elements[5]), Math.round(elements[9]),
        Math.round(elements[2]), Math.round(elements[6]), Math.round(elements[10])
      ];
      
      const positionKey = rotatedMatrix.join('');
      const resultChar = this.cornerEdgePositions[positionKey];
      
      // Check if this rotation produces the expected character
      if (resultChar === expectedChar) {
        normalizedMatrix = rotatedMatrix;
        // console.log('Index:', pieceIndex, 'Found correct rotation:', rotationKey, 'produces expected char:', expectedChar);
        return parseInt(rotationKey, 10);
      }
    }
    return -1;
  }

  /**
   * Helper method to get a Three.js rotation matrix for a given rotation name
   */
  private getRotationMatrix(rotationName: string): Matrix4 | null {
    const matrix = new Matrix4();
    
    // Parse rotation string and apply rotations
    const rotations = rotationName.split(' ');
    
    for (const rotation of rotations) {
      switch (rotation) {
        case 'no_rotation':
          // Identity matrix, no change
          break;
        case 'x':
          matrix.premultiply(new Matrix4().makeRotationX(-Math.PI / 2));
          break;
        case "x'":
          matrix.premultiply(new Matrix4().makeRotationX(Math.PI / 2));
          break;
        case 'x2':
          matrix.premultiply(new Matrix4().makeRotationX(Math.PI));
          break;
        case 'y':
          matrix.premultiply(new Matrix4().makeRotationY(-Math.PI / 2));
          break;
        case "y'":
          matrix.premultiply(new Matrix4().makeRotationY(Math.PI / 2));
          break;
        case 'y2':
          matrix.premultiply(new Matrix4().makeRotationY(Math.PI));
          break;
        case 'z':
          matrix.premultiply(new Matrix4().makeRotationZ(-Math.PI / 2));
          break;
        case "z'":
          matrix.premultiply(new Matrix4().makeRotationZ(Math.PI / 2));
          break;
        case 'z2':
          matrix.premultiply(new Matrix4().makeRotationZ(Math.PI));
          break;
        default:
          console.warn(`Unknown rotation: ${rotation}`);
          return null;
      }
    }
    
    return matrix;
  }

  /**
   * Debug method to log current state
   */
  public getCurrentState(): CubeState | null {
    this.updateCurrentState();
    console.log('Current cube state:', this.currentState);
    // console.log('Current step:', this.getCurrentStep());
    return this.currentState;
  }

  /**
   * Debug method to analyze matrix data for a specific piece
   * Useful for understanding the transformation matrix structure
   */
  public analyzePieceMatrix(index: number): void {
    if (!this.cube || !this.cube.children) {
      console.warn('Cube reference is not available');
      return;
    }

    const child = this.cube.children[index];
    if (!child) {
      console.warn(`No child at index ${index}`);
      return;
    }

    const matrix = child.matrix.elements;
    console.log(`=== PIECE ${index} ===`);
    for (let i = 0; i < 4; i++) {
      const row = matrix.slice(i * 4, (i + 1) * 4).map(n => n.toFixed(3));
      console.log(`  [${row.join(', ')}]`);
    }
    const xVector = matrix.slice(0, 3);
    console.log('X Vector:', xVector.map(n => n.toFixed(3)).join(', '));
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
        const position = this.getPosition(index);

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
          const cornerPosition = this.getPosition(cornerIndex);
          if (typeof cornerPosition !== 'string') return;

          const edgeIndex = pair.pairIndices[1];
          const edgePosition = this.getPosition(edgeIndex);
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
          const cornerPosition = this.getPosition(cornerIndex);
          if (typeof cornerPosition !== 'string') return;

          const edgeIndex = pair.pairIndices[1];
          const edgePosition = this.getPosition(edgeIndex);
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
    console.log('current hash:', this.currentState.hash);
    const suggestions = this.algSuggester.searchByPosition(query);
    // console.log('Algorithm suggestions:', suggestions);
    return suggestions.map(result => result.id);
  }

  /**
   * Applies a rotation mapping to get the new position of each piece
   * @param mapping The rotation mapping array (26 elements)
   * @param times Number of times to apply the rotation (1, 2, or 3)
   * @returns The composed mapping after applying the rotation 'times' times
   */
  private applyRotationTimes(mapping: number[], times: number): number[] {
    if (times === 1) {
      return [...mapping];
    }

    let result = [...mapping];
    for (let i = 1; i < times; i++) {
      const newResult = new Array(26);
      for (let pieceIndex = 0; pieceIndex < 26; pieceIndex++) {
        // Apply the mapping again: where does piece at pieceIndex go after another rotation?
        newResult[pieceIndex] = result[mapping[pieceIndex]];
      }
      result = newResult;
    }
    return result;
  }

  /**
   * Composes two rotation mappings in sequence
   * @param first First rotation to apply
   * @param second Second rotation to apply
   * @returns Combined mapping representing first followed by second
   */
  private composeRotations(first: number[], second: number[]): number[] {
    const result = new Array(26);
    
    // The arrays represent "which piece from solved cube is at position i"
    // For composition first→second: position i gets piece from first[second[i]]
    // But we need to trace where each piece goes, not where each position gets its piece from
    
    // Create inverse mappings: inverseFirst[i] = position where piece i goes under first transformation
    const inverseFirst = new Array(26);
    const inverseSecond = new Array(26);
    
    for (let i = 0; i < 26; i++) {
      if (first[i] !== undefined) inverseFirst[first[i]] = i;
      if (second[i] !== undefined) inverseSecond[second[i]] = i;
    }
     
    // Compose the inverse mappings: piece i goes to inverseSecond[inverseFirst[i]]
    const composedInverse = new Array(26);
    for (let piece = 0; piece < 26; piece++) {
      if (inverseFirst[piece] !== undefined && inverseSecond[inverseFirst[piece]] !== undefined) {
        composedInverse[piece] = inverseSecond[inverseFirst[piece]];
      }
    }
    
    // Convert back to the original format: result[i] = piece at position i
    for (let pos = 0; pos < 26; pos++) {
      for (let piece = 0; piece < 26; piece++) {
        if (composedInverse[piece] === pos) {
          result[pos] = piece;
          break;
        }
      }
    }
    
    return result;
  }

  /**
   * Parses a rotation string and returns the composed mapping
   * @param rotationString String like "x' y2" or "z y'"
   * @returns The effective piece index mapping for this rotation
   */
  private parseAndComposeRotation(rotationString: string): number[] {
    const parts = rotationString.trim().split(/\s+/);
    let result = this.effectivePieceIndexKey["no_rotation"]; // Start with identity

    // parts.reverse(); // try apply in reverse order
    
    for (const part of parts) {
      let baseRotation: string;
      let times: number;
      
      // Parse the rotation part
      if (part.endsWith("'")) {
        baseRotation = part.slice(0, -1);
        times = 3; // Prime = 3 times
      } else if (part.endsWith("2")) {
        baseRotation = part.slice(0, -1);
        times = 2; // 2 = 2 times
      } else {
        baseRotation = part;
        times = 1; // Normal = 1 time
      }
      
      // Get the base mapping
      const baseMapping = this.effectivePieceIndexKey[baseRotation as keyof typeof this.effectivePieceIndexKey];
      if (!baseMapping || baseMapping.length === 0) {
        console.warn(`No mapping found for base rotation: ${baseRotation}`);
        continue;
      }
      
      // Apply it the specified number of times
      const appliedMapping = this.applyRotationTimes(baseMapping, times);
      
      // Compose with the current result
      result = this.composeRotations(result, appliedMapping);
    }
    
    return result;
  }

  /**
   * Computes and fills in all missing effectivePieceIndexKey mappings
   * by composing the base rotations (x, y, z and their variants)
   */
  public computeAllRotationMappings(): void {
    console.log('=== COMPUTING ALL ROTATION MAPPINGS ===');
    
    const rotationsToCompute = [
      "x y", "x y2", "x y'", "x2", "x2 y", "x2 y'", "x'", "x' y", "x' y2", "x' y'",
      "z2", "z y", "z y2", "z y'", "z'", "z' y", "z' y2", "z' y'"
    ];
    
    const computedMappings: { [key: string]: number[] } = {};
    
    for (const rotationName of rotationsToCompute) {
      console.log(`Computing mapping for: ${rotationName}`);
      const mapping = this.parseAndComposeRotation(rotationName);
      computedMappings[rotationName] = mapping;
      console.log(`"${rotationName}": [${mapping.join(', ')}],`);
    }
    
    console.log('\n=== ALL COMPUTED MAPPINGS ===');
    Object.entries(computedMappings).forEach(([rotationName, mapping]) => {
      console.log(`"${rotationName}": [${mapping.join(', ')}],`);
    });
    
    return;
  }
}