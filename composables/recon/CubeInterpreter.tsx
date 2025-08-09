// import { Object3D } from 'three';
import { Object3D, Object3DEventMap, Matrix4 } from 'three';
import  AlgSuggester from './AlgSuggester';
import type { Doc, Constraint, Query } from './AlgSuggester';
import { get } from 'http';

interface PieceState {
  matrix: number[]; // 16-element transformation matrix
  type: 'center' | 'corner' | 'edge';
  start: string; // e.g., 'U' for center, 'UF' for edge, 'UFR' for corner, etc.
  index: number;
}

interface CubeState {
  centers: PieceState[];
  corners: PieceState[];
  edges: PieceState[];
  hash: string;
}

/**
 * (Ab)uses the cubingjs model object to interpret the cube state.
 */
export class CubeInterpreter {
  private cube: Object3D | null;
  private solvedState: CubeState | null = null;
  private readonly solvedHash = 'afedpqjrousmafedqprjawxbvj' // for 3x3 only
  private currentState: CubeState | null = null;
  private uniqueRotations: Set<string> = new Set();
  private unmatchedNormalizedMatrices: Set<string> = new Set();
  private currentCubeRotation: string | number = -1;
  private algSuggester: AlgSuggester | null = null;
  public crossColorsSolved: string[] = [];
  
  // Cube rotations from the JSON file
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
    "100010001": 'a', // spaces and commas removed from keys
    "00-11000-10": 'b',
    "10000-1010": 'c',
    "001010-100": 'd',
    "-10001000-1": 'e',
    "00-1010100": 'f',
    "001100010": 'g',
    "-100001010": 'h',
    "00-1-100010": 'i',
    "1000-1000-1": 'j',
    "0-10100001": 'k',
    "010-100001": 'l',
    "01000-1-100": 'm',
    "01010000-1": 'n',
    "010001100": 'o',
    "-1000-10001": 'p',
    "0010-10100": 'q',
    "00-10-10-100": 'r',
    "0-1000-1100": 's',
    "0-10-10000-1": 't',
    "0-10001-100": 'u',
    "-10000-10-10": 'v',
    "001-1000-10": 'w',
    "1000010-10": 'x',
  }

  /**
   * The piece index (from getPieceStart) for each cross, concat'd into a single string
   */
  private readonly crossPieceIndices: { [key: string]: string } = {
    '0,1,2,3': 'white',
    '4,5,6,7': 'yellow',
    '0,4,8,9': 'green',
    '1,5,8,10': 'red',
    '2,6,10,11': 'blue',
    '3,7,9,11': 'orange'
  };

  constructor(cube: Object3D | null, algs: Doc[] = []) {
    this.cube = cube;
    this.currentCubeRotation = this.trackUniqueRotation();
    this.solvedState = this.captureCurrentState();
    this.currentState = this.solvedState;

    if (this.solvedState && this.solvedState.hash !== this.solvedHash) {
      console.warn('Solved state hash does not match expected solved hash. Please check the cube state.');
    }

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
    const centers: PieceState[] = [];
    const corners: PieceState[] = [];
    const edges: PieceState[] = [];
    let hash = '';

    // Process only the known piece indices: 0-11 (edges), 12-19 (corners), 20-25 (centers)
    children.forEach((child: Object3D, index: number) => {
      // Skip label pieces (indices 26-31)
      if (index >= 26 && index <= 31) {
        return;
      }

      const char = this.getPosition(index);
      if (char === -1) {
        console.warn(`Could not determine position for piece at index ${index}`);
      }
      hash += char;

      const piece: PieceState = {
        matrix: [...child.matrix.elements], // Copy the 16-element transformation matrix
        type: this.getPieceType(index),
        start: this.getPieceStart(index),
        index: index
      };

      switch (piece.type) {
        case 'center':
          centers.push(piece);
          break;
        case 'corner':
          corners.push(piece);
          break;
        case 'edge':
          edges.push(piece);
          break;
      }
    });

    return { centers, corners, edges, hash };
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
   * Determines the type of piece based on its index
   * Updated based on actual cube structure analysis:
   * - Indices 0-11: edges (12 total)
   * - Indices 12-19: corners (8 total) 
   * - Indices 20-25: centers (6 total)
   * - Indices 26-31: labels
   */
  private getPieceType(index: number): 'center' | 'corner' | 'edge' {
    if (index >= 0 && index <= 11) {
      return 'edge';
    } else if (index >= 12 && index <= 19) {
      return 'corner';
    } else if (index >= 20 && index <= 25) {
      return 'center';
    } else {
      // Indices 26-31 are labels, skip them for now
      return 'edge'; // fallback, but these shouldn't be processed
    }
  }

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
   * Sets the solved state by capturing the current cube state
   * Call this when the cube is in solved position
   */
  // should be handled by constructor
  // public setSolvedState(): void {
  //   this.currentCubeRotation = this.trackUniqueRotation();
  //   this.solvedState = this.captureCurrentState();
  //   if (this.solvedState) {
  //     this.solvedState.hash = this.solvedHash; // use predetermined solved hash
  //     console.log('Solved state captured:', this.solvedState);
  //     console.log('Centers:', this.solvedState.centers);
  //     console.log('Corners:', this.solvedState.corners);
  //     console.log('Edges:', this.solvedState.edges);
  //   } else {
  //     console.warn('Could not capture solved state. Ensure the cube is loaded and in solved position.');
  //   }
  // }

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
   * Template method - will be replaced with hash-based approach
   */
  public isCubeSolved(): boolean {
    if (!this.solvedState || !this.currentState) {
      return false;
    }

    const allCurrentPieces = [...this.currentState.centers, ...this.currentState.corners, ...this.currentState.edges];
    const solvedPieces = this.getSolvedPieces();
    
    return solvedPieces.length === allCurrentPieces.length;
  }

  /**
   * Helper method to find a piece by index
   */
  private findPieceByIndex(state: CubeState, index: number): PieceState | undefined {
    return [...state.centers, ...state.corners, ...state.edges].find(p => p.index === index);
  }

  /**
   * Gets all currently solved pieces by comparing current state to solved state
   * This will be the foundation for hash-based solve detection
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
      const piece20Matches = this.arraysEqual(currentMatrix20, rotation.piece20Matrix);
      const piece21Matches = this.arraysEqual(currentMatrix21, rotation.piece21Matrix);
      
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
   * Helper method to compare two arrays for equality
   */
  private arraysEqual(a: number[], b: number[]): boolean {
    if (a.length !== b.length) return false;
    
    for (let i = 0; i < a.length; i++) {
      if (Math.abs(a[i] - b[i]) > 0.1) { // Allow small tolerance for floating point comparison
        return false;
      }
    }
    
    return true;
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
    if (!this.cube || !this.cube.children) {
      console.warn('Cube reference is not available for corner analysis');
      return -1;
    }

    const piece = this.cube.children[pieceIndex]; // Corner piece
    if (!piece) {
      console.warn('Corner piece not found');
      return -1;
    }

    // Step 1: Get current cube rotation
    const currentCubeRotation = this.currentCubeRotation;
    if (currentCubeRotation === -1) {
      console.warn('Could not determine current cube rotation');
      return -1;
    }

    // Step 2: Get the inverse rotation to apply
    const rotationData = this.cubeRotations[currentCubeRotation as keyof typeof this.cubeRotations];
    if (!rotationData) {
      console.warn('Invalid cube rotation data');
      return -1;
    }

    const inverseRotationName = rotationData.inverse;

    const inverseMatrix = this.getRotationMatrix(inverseRotationName);
    
    if (!inverseMatrix) {
      console.warn(`Could not get rotation matrix for inverse: ${inverseRotationName}`);
      return -1;
    }

    // Step 3: Apply inverse rotation to corner piece matrix
    // TODO: consider pre-computing. Only 12 things result could be
    const cornerMatrix = piece.matrix.clone();
    
    // testing
    // const elements2 = cornerMatrix.elements;
    // const upperLeft3x3 = [
    //   Math.round(elements2[0]), Math.round(elements2[1]), Math.round(elements2[2]),
    //   Math.round(elements2[4]), Math.round(elements2[5]), Math.round(elements2[6]),
    //   Math.round(elements2[8]), Math.round(elements2[9]), Math.round(elements2[10])
    // ];
    // console.log('Original corner matrix (3x3):', upperLeft3x3);

    cornerMatrix.premultiply(inverseMatrix);

    // Extract the rotation part (upper-left 3x3) and round
    const elements = cornerMatrix.elements;
    const normalizedMatrix = [
      Math.round(elements[0]), Math.round(elements[1]), Math.round(elements[2]),
      Math.round(elements[4]), Math.round(elements[5]), Math.round(elements[6]),
      Math.round(elements[8]), Math.round(elements[9]), Math.round(elements[10])
    ];
    // console.log('Normalized corner matrix:', normalizedMatrix);

    // Step 4: Find matching position in cornerEdgePositions
    const positionKey = normalizedMatrix.join('');
    const positionIndex = this.cornerEdgePositions[positionKey];
    if (positionIndex !== undefined) {
      // console.log(`Corner piece ${pieceIndex} matches position index: ${positionIndex}`);
      return positionIndex;
    }

    console.warn('Normalized corner matrix does not match any known rotation');
    this.unmatchedNormalizedMatrices.add(normalizedMatrix.join(', '));
    console.log('Stored unmatched normalized matrices:', this.unmatchedNormalizedMatrices);
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
   * Gets the current count of unique rotations seen
   */
  public getUniqueRotationCount(): number {
    return this.uniqueRotations.size;
  }

  /**
   * Clears the stored unique rotations
   */
  public clearUniqueRotations(): void {
    this.uniqueRotations.clear();
    console.log('Cleared unique rotations tracker');
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
   *   must A + must B: may A or B
   *   must A + may B: may A or B
   *   may A + must B: may A or B
   *   must A + not B: may A, not B
   *   may A + not B: may A, not B
   *   not A + not B: not A or B
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
  private getF2LPairStatus(color: string): { pairColors: string, pairIndices: number[], isSolved: boolean }[] {
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
      const crossArray = crossIndices.split(',').map(Number);
      const query: Query = {
        positions: {
        }
      };
      crossArray.forEach((index) => {
        const position = this.getPosition(index);
        if (position === -1) {
          console.warn(`Could not determine position for piece at index ${index}`);
          return;
        }

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
      unsolvedPairIndices.forEach((index) => {
        const position = this.getPosition(index);
        if (position === -1) {
          console.warn(`Could not determine position for piece at index ${index}`);
          return;
        }

        // assert type of position is string
        if (typeof position !== 'string') {
          console.warn(`Position for index ${index} is not a string: ${position}`);
          return;
        }

        if (!query.positions[index]) {
          query.positions[index] = {
            may: [position],
          };
        }
        // unsolved f2l piece may be solved
        if (!query.positions[index].may) {
          query.positions[index].may = [];
        }
      });

      queries.push(query);
    });

    const accQuery = this.accumulateQueries(queries);
    return accQuery;
  }


  private getQueryForStep(step: string): Query | null {
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
    const query = this.getQueryForStep(currentStep);

    if (!query) {
      console.warn(`No query found for step: ${currentStep}`);
      return [];
    }

    query.limit = 20;
    query.scoreBy = 'may';

    const suggestions = this.algSuggester.searchByPosition(query);
    console.log('Algorithm suggestions:', suggestions);
    return suggestions.map(result => result.id);
  }
}