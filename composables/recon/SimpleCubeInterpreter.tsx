import AlgSuggester from './ExactAlgSuggester';
import type { Doc, Constraint } from './ExactAlgSuggester';
import AlgSpeedEstimator from './AlgSpeedEstimator';
import type { Grid, CompilableLLStep, SuggestableLLStep, LLCaseInfo } from './LLinterpreter';
import LLinterpreter from './LLinterpreter';
import LLsuggester from './LLsuggester';
import type { CompiledLLAlg } from './LLsuggester';
import type { CubeState as SimpleCubeState, Color } from './SimpleCube';
import type { Handedness } from '../useSettings';
import { splitLeadingAuf } from '../../utils/collapseAufVariants';
import { algsetPriority, dedupeByAlgsetPriority, rankSuggestions, suggestionRank } from './suggestionRanking';
import type { SavedAlgKeys } from './suggestionRanking';
import {
  SOLVED_HASH,
  colorCharToName,
  EDGE_PIECE_DIRECTIONS,
  CENTER_PIECE_DIRECTIONS,
  CORNER_PIECE_DIRECTIONS,
  F2L_SLOTS,
  getOppositeColor,
  effectiveToActualColor,
  actualToEffectiveColor,
  readCube,
  readCubeRotation,
  findSolvedPieces,
  calcCrossColorsSolved,
} from './cubeHashState';
import type { DirectionChar, PieceState, PieceColorMapping, HashState, TopInfo } from './cubeHashState';
import { F2LScoreIndex, buildF2LPairQueries, reconstructF2LAlg, toHashAlgset, wantsEORanking } from './f2lPairLookup';
import type { AlgsetFilter, F2LPairQuery, HashAlgset } from './f2lPairLookup';
import type { CrossSuggestionDetails } from './crossAutocomplete';

export type { AlgsetFilter, HashAlgset };
export type Algset = HashAlgset | SuggestableLLStep | 'f2leo';

export interface Suggestion {
  alg: string;
  time: number;
  steps: string[];
  name?: string;
  hasEOsolved?: boolean;
  frequency?: number;
  algset?: Algset;
  cross?: CrossSuggestionDetails;
}

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
  type: 'cross' | 'f2l' | 'last layer' | 'solved' | 'none' | 'genericEO' | 'block' | 'genericBlock' | 'lse' | 'cmll' | 'eoLine' | 'apbBlock';
  colors: string[];
  caseIndex?: number;
  name?: string; // Optional name for cases (OLL/PLL/ZBLL names)
  nameType?: CompilableLLStep;
  blockPattern?: BlockPattern;
  blockVolume?: number;
  blockMaxElevation?: number;
  lsePattern?: LSEPattern;
  gridPattern?: Grid;
  f2lSlotList?: Partial<Record<F2LDirection, string>>[];
}

/**
 * Interprets SimpleCube state to determine solve progress and suggest algorithms.
 */
export class SimpleCubeInterpreter {
  private cubeState: SimpleCubeState | null = null;
  private readonly solvedState = { hash: SOLVED_HASH };
  private currentState: HashState | null = { hash: SOLVED_HASH, rotation: 'no_rotation', eoValue: 0 };
  public currentCubeRotation: string | number = -1;
  private algSuggester: AlgSuggester | null = null;
  private LLsuggester: LLsuggester | null = null;
  private enabledAlgsets: AlgsetFilter = 'all';
  private handedness: Handedness = 'right';
  private savedAlgs: SavedAlgKeys | undefined = undefined;
  private loadedAlgsets: Map<string, string | undefined> = new Map();
  private f2lScoreIndexes: Map<Handedness, F2LScoreIndex> = new Map();

  // algsets whose compiled algs are hash-searched via the position suggester
  private static readonly hashAlgsets: ReadonlySet<HashAlgset> = new Set<HashAlgset>(['f2l', 'zbls']);

  private static isHashAlgset(name: string): name is HashAlgset {
    return (SimpleCubeInterpreter.hashAlgsets as ReadonlySet<string>).has(name);
  }

  private currentPieces: PieceState[] = [];
  private pieceColorMapping: PieceColorMapping = new Map();

  private LLinterpreter = new LLinterpreter();

  private crossColorsSolved: string[] = [];
  private blocksSolved: Block[] = [];
  private topInfo: TopInfo = { actualColor: '', effectiveColor: '', direction: '' };
  private eoValue: number = -1;

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

  private readonly eoLinePieceIndices: { [key: string]: string } = {
    // only down face edges are valid, because who would possibly do
    // EOLine on side? No, we're not going to support that behavior.
    '4,6': 'yellow,vertical', // down front, down back
    '5,7': 'yellow,horizontal', // down right, down left
  };

  constructor(algs: Doc[] = []) {
    // build reverse mappings for hash decoding
    this.edgeIdxToDir = [];
    for (const [dir, idx] of Object.entries(EDGE_PIECE_DIRECTIONS)) {
      this.edgeIdxToDir[idx] = dir;
    }

    this.centerIdxToDir = [];
    for (const [dir, idx] of Object.entries(CENTER_PIECE_DIRECTIONS)) {
      this.centerIdxToDir[idx] = dir;
    }

    this.cornerLocToDir = [];
    for (const [dir, slot] of Object.entries(CORNER_PIECE_DIRECTIONS)) {
      this.cornerLocToDir[slot] = dir;
    }

    if (algs.length > 0) {
      this.algSuggester = new AlgSuggester(algs);
    }
  }

  /**
   * Registers a compiled algset so its suggestions become available. Hash-based algsets
   * (f2l, zbls) extend the position suggester; case-based algsets (oll, pll) extend the LL
   * suggester. Loaded algsets stay in memory even when later disabled in settings, so
   * re-enabling one is instant. Enabling/disabling is handled separately by getAlgSuggestions.
   * A variant (such as handedness) replaces the previously loaded algs of the same name.
   */
  public addAlgset(name: string, algs: Doc[] | CompiledLLAlg[], variant?: string): void {
    if (this.isAlgsetLoaded(name, variant)) {
      return;
    }

    if (SimpleCubeInterpreter.isHashAlgset(name)) {
      if (!this.algSuggester) {
        this.algSuggester = new AlgSuggester();
      }
      const taggedAlgs = (algs as Doc[]).map(alg => ({ ...alg, step: name }));
      this.algSuggester.addDocs(taggedAlgs);
    } else if (name === 'oll' || name === 'pll' || name === 'zbll') {
      if (!this.LLsuggester) {
        this.LLsuggester = new LLsuggester();
      }
      this.LLsuggester.addAlgs(name, algs as CompiledLLAlg[]);
    } else {
      console.warn(`Unknown algset: ${name}`);
      return;
    }

    this.loadedAlgsets.set(name, variant);
  }

  public isAlgsetLoaded(name: string, variant?: string): boolean {
    return this.loadedAlgsets.has(name) && this.loadedAlgsets.get(name) === variant;
  }

  public getF2LScoreIndex(handedness: Handedness): F2LScoreIndex | null {
    if (!this.algSuggester || !this.isAlgsetLoaded('f2l')) return null;

    let index = this.f2lScoreIndexes.get(handedness);
    if (!index) {
      index = new F2LScoreIndex(this.algSuggester, handedness);
      this.f2lScoreIndexes.set(handedness, index);
    }
    return index;
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

    // keep all rects that are not fully contained by another candidate rect
    const selectedRects: Rect[] = candidateRects.filter((rect, i) =>
      !candidateRects.some((other, j) =>
        i !== j &&
        other.minX <= rect.minX && other.maxX >= rect.maxX &&
        other.minY <= rect.minY && other.maxY >= rect.maxY &&
        other.minZ <= rect.minZ && other.maxZ >= rect.maxZ
      )
    );

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
      const dx = block.dimensions['L']?.[1] ?? block.dimensions['R']?.[1] ?? 1;
      const dy = block.dimensions['U']?.[1] ?? block.dimensions['D']?.[1] ?? 1;
      const dz = block.dimensions['F']?.[1] ?? block.dimensions['B']?.[1] ?? 1;
      const blockVolume = dx * dy * dz;
      const blockMaxElevation = 2 - block.origin[1];
      steps.push({ step: blockStepName, type: 'genericBlock', colors: [], blockPattern: block.blockPattern!, blockVolume, blockMaxElevation });
    }
    return steps;
  }

  // F2L pair physical positions: corner [x,y,z] and edge [x,y,z]
  private readonly apbF2LPairPositions: Record<string, { corner: [number, number, number], edge: [number, number, number] }> = {
    'front,right': { corner: [2, 2, 0], edge: [2, 1, 0] },  // DFR + FR
    'back,right': { corner: [2, 2, 2], edge: [2, 1, 2] },   // DBR + BR
    'front,left': { corner: [0, 2, 0], edge: [0, 1, 0] },   // DFL + FL
    'back,left': { corner: [0, 2, 2], edge: [0, 1, 2] },    // DBL + BL
  };

  /**
   * Detects APB steps: a 2x2x3 block on L or R (not in top layer)
   * plus exactly one solved F2L pair on the opposite side.
   */
  private calcAPBStepsCompleted(): StepInfo[] {
    const steps: StepInfo[] = [];
    if (!this.currentState?.hash) return steps;

    const hash = this.currentState.hash;
    const solvedHash = this.solvedState.hash;

    // F2L pair hash indices (for bottom/yellow cross in effective frame)
    const rightPairs = [
      { corner: 16, edge: 8, key: 'front,right', slotColors: ['red', 'green'] as [string, string] },
      { corner: 19, edge: 10, key: 'back,right', slotColors: ['blue', 'red'] as [string, string] },
    ];
    const leftPairs = [
      { corner: 17, edge: 9, key: 'front,left', slotColors: ['green', 'orange'] as [string, string] },
      { corner: 18, edge: 11, key: 'back,left', slotColors: ['orange', 'blue'] as [string, string] },
    ];

    for (const block of this.blocksSolved) {
      const dim = block.dimensions;

      // must be a 2x2x3 (volume 12)
      const dx = dim['L']?.[1] ?? dim['R']?.[1] ?? 1;
      const dy = dim['U']?.[1] ?? dim['D']?.[1] ?? 1;
      const dz = dim['F']?.[1] ?? dim['B']?.[1] ?? 1;
      if (dx * dy * dz !== 12) continue;

      const isLeft = !!dim['L'] && dx !== 3;
      // const isRight = !!dim['R'] && dx !== 3;
      // if (!isLeft && !isRight) continue; // originally added so 223 had to be L or R,
      // but it's nice to see blocks F or B too.

      // must include D, must not include U
      if (dim['U'] || !dim['D']) continue;

      // max elevation must be ≤ 1 (no top layer)
      const blockMaxElevation = 2 - block.origin[1];
      if (blockMaxElevation > 1) continue;

      // check opposite-side F2L pairs
      const oppositePairs = isLeft ? rightPairs : leftPairs;
      const solvedOppPairs: { key: string, slotColors: [string, string] }[] = [];

      for (const pair of oppositePairs) {
        const cornerSolved = hash[pair.corner] === solvedHash[pair.corner];
        const edgeSolved = hash[pair.edge] === solvedHash[pair.edge];
        if (cornerSolved && edgeSolved) {
          solvedOppPairs.push({ key: pair.key, slotColors: pair.slotColors });
        }
      }

      if (solvedOppPairs.length === 0) continue;

      // use the first solved pair
      const pair = solvedOppPairs[0];
      const positions = this.apbF2LPairPositions[pair.key];

      // build f2l direction info
      const f2lDirections: Partial<Record<F2LDirection, string>> = {};
      for (const effColor of pair.slotColors) {
        const dir = this.effectiveColorToDirection(effColor);
        const actualColor = this.mapEffectiveColorToActual(effColor);
        if (dir) f2lDirections[dir] = actualColor;
      }

      const apbPattern = this.generateAPBBlockPattern(block, positions, isLeft);
      if (!apbPattern) continue;

      steps.push({
        step: 'APB',
        type: 'apbBlock',
        colors: [],
        blockPattern: apbPattern,
        blockVolume: 12,
        blockMaxElevation,
        f2lSlotList: [f2lDirections],
      });
    }

    return steps;
  }

  /**
   * Generates a BlockPattern for the APB step showing the opposite perspective
   * from the block, so the F2L pair is visible on the side face.
   */
  private generateAPBBlockPattern(
    block: Block,
    f2lPairPositions: { corner: [number, number, number], edge: [number, number, number] },
    isBlockOnLeft: boolean,
  ): BlockPattern | undefined {
    if (!this.cubeState) return undefined;

    const dim = block.dimensions;
    const [minX, minY, minZ] = block.origin;
    const dx = dim['L']?.[1] ?? dim['R']?.[1] ?? 1;
    const dy = dim['U']?.[1] ?? dim['D']?.[1] ?? 1;
    const dz = dim['F']?.[1] ?? dim['B']?.[1] ?? 1;
    const maxX = minX + dx - 1;
    const maxY = minY + dy - 1;
    const maxZ = minZ + dz - 1;

    const isInBlock = (x: number, y: number, z: number): boolean => {
      return x >= minX && x <= maxX && y >= minY && y <= maxY && z >= minZ && z <= maxZ;
    };

    const [cx, cy, cz] = f2lPairPositions.corner;
    const [ex, ey, ez] = f2lPairPositions.edge;
    const isF2LPairPos = (x: number, y: number, z: number): boolean => {
      return (x === cx && y === cy && z === cz) || (x === ex && y === ey && z === ez);
    };

    const getStickerAt = (faceIdx: number, row: number, col: number): string => {
      return this.cubeState![faceIdx][row][col] || '';
    };

    const generateFace = (faceIdx: 0 | 1 | 2 | 3 | 4 | 5, faceDir: DirectionChar): Face => {
      const stickers: Face = ['', '', '', '', '', '', '', '', ''];
      let idx = 0;

      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          let x: number, y: number, z: number;
          switch (faceDir) {
            case 'U': x = col; y = 0; z = 2 - row; break;
            case 'D': x = col; y = 2; z = row; break;
            case 'F': x = col; y = row; z = 0; break;
            case 'B': x = 2 - col; y = row; z = 2; break;
            case 'L': x = 0; y = row; z = 2 - col; break;
            case 'R': x = 2; y = row; z = col; break;
            default: x = y = z = -1;
          }

          if (isInBlock(x, y, z) || isF2LPairPos(x, y, z)) {
            stickers[idx] = getStickerAt(faceIdx, row, col);
          }
          idx++;
        }
      }
      return stickers;
    };

    const apbOrigin: BlockOrigin = isBlockOnLeft ? 'DFR' : 'DFL';
    const pattern: BlockPattern = { origin: apbOrigin };

    pattern.D = generateFace(1, 'D');
    pattern.F = generateFace(2, 'F');
    if (isBlockOnLeft) {
      pattern.R = generateFace(3, 'R');
    } else {
      pattern.L = generateFace(5, 'L');
    }

    return pattern;
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
    const lineColor = getOppositeColor(topColor);

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
    let steps: StepInfo[] = [];

    const blockSteps = this.calcRouxBlockSteps();
    steps.push(...blockSteps);

    // filter out redundant square steps
    const completeBlockSteps = blockSteps.filter(s => s.step === 'L-Block' || s.step === 'R-Block');
    for (const completeStep of completeBlockSteps) {
      const direction = completeStep.step[0]; // 'L' or 'R'
      steps = steps.filter(s => s.step !== `${direction}-Square`)
    }


    if (completeBlockSteps.length !== 2) return steps;

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
  private updateCachedState(cubeState: SimpleCubeState): HashState {
    const reading = readCube(cubeState);
    if (!reading) throw new Error('Failed to read cube state');
    this.currentCubeRotation = reading.state.rotation;
    this.currentState = reading.state;
    this.currentPieces = reading.pieces;
    this.pieceColorMapping = reading.pieceColorMapping;
    this.topInfo = reading.topInfo;
    this.eoValue = reading.state.eoValue;
    return reading.state;
  }

  /**
   * Method for passing in SimpleCubeState to update and interpret the current state.
   */
  public getStepsCompleted(cubeState?: SimpleCubeState | null, method: 'Roux' | 'ZZ' | 'CFOP' | 'Petrus' | 'All' = 'All', breakdownSolved = false): StepInfo[] {
    if (cubeState) {
      this.cubeState = cubeState;
    }

    if (!this.cubeState) {
      console.warn('No cube state available');
      return [];
    }

    const state = this.updateCachedState(this.cubeState);

    const steps: StepInfo[] = [];

    // always add eo step
    steps.push({ step: this.eoValue.toString(), type: 'genericEO', colors: [] });

    if (method === 'CFOP' || method === 'ZZ' || method === 'All') {
      this.crossColorsSolved = calcCrossColorsSolved(state);
      steps.push(...this.calcCFOPstepsCompleted(breakdownSolved));
    }

    if (['Roux', 'Petrus', 'All'].includes(method)) {
      this.blocksSolved = this.calcBlocksSolved();
    }
    if (method === 'All') {
      steps.push(...this.calcAPBStepsCompleted());
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
    return readCubeRotation(this.cubeState) ?? -1;
  }

  private mapEffectiveColorToActual(effectiveColor: string): string {
    if (typeof this.currentCubeRotation !== 'string') {
      console.warn('Current cube rotation not determined');
      return effectiveColor;
    }
    return effectiveToActualColor(this.currentCubeRotation, effectiveColor);
  }

  private mapActualColorToEffective(actualColor: string): string {
    if (typeof this.currentCubeRotation !== 'string') {
      console.warn('Current cube rotation not determined');
      return actualColor;
    }
    return actualToEffectiveColor(this.currentCubeRotation, actualColor);
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

  // maps an actual cross color to the face direction it occupies
  private getCrossFaceDir(actualColor: string): DirectionChar {
    const effectiveColor = this.mapActualColorToEffective(actualColor);
    const faceDirMap: Record<string, DirectionChar> = {
      'white': 'U', 'yellow': 'D', 'green': 'F',
      'red': 'R', 'blue': 'B', 'orange': 'L'
    };
    return faceDirMap[effectiveColor] || 'D';
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
    const bottomColor = getOppositeColor(topColor);

    if (crossColors.find(c => c.toLowerCase() === bottomColor) === undefined) {
      return [];
    }
    const crossColor = bottomColor;

    const result: { colors: string[], f2lDirections: Partial<Record<F2LDirection, string>> }[] = [];

    const effectiveColor = this.mapActualColorToEffective(crossColor);
    const slots = F2L_SLOTS[effectiveColor.toLowerCase()];
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
    return this.currentState ? findSolvedPieces(this.currentState) : [];
  }

  private ensureState(): boolean {
    if (!this.currentState) {
      // update state
      this.getStepsCompleted();
    }

    return !!this.currentState && this.currentPieces.length > 0;
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
          const topActualColor = getOppositeColor(bottomActualColor);
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
    return this.currentState.eoValue;
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
      const bottomColor = getOppositeColor(topColor);
      const bottomCross = this.crossColorsSolved.find(c => c.toLowerCase() === bottomColor);
      const color = bottomCross ?? this.crossColorsSolved[0];
      const faceDir = this.getCrossFaceDir(color);
      steps.push({ step: `${faceDir}-Cross`, type: 'cross', colors: [color] });
    } else {
      const color = this.crossColorsSolved[0];
      const faceDir = this.getCrossFaceDir(color);
      steps.push({ step: `${faceDir}-Cross`, type: 'cross', colors: [color] });
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

  // annotate steps with LL case names (OLL/PLL/ZBLL) using pattern matching
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

    // ZBLL name: EO solved but CO not → ZBLL case is visible. It goes on the eo step because the
    // OLL branch above also fires in this state and claims the last pair's single name slot.
    if (llStepNames.has('eo') && !llStepNames.has('co')) {
      try {
        const zbllInfo = this.LLinterpreter.getStepInfo(patternGrid, 'zbll');
        const target = llSteps.find(s => s.step === 'eo');
        if (target && zbllInfo.name) { target.name = zbllInfo.name; target.nameType = 'zbll'; }
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

  public calcCFOPstepsCompleted(breakdownSolved = false): StepInfo[] {

    // breakdownSolved keeps the granular cross/f2l/ll steps for a solved cube instead of
    // collapsing to a single 'solved' step, so it can serve as a diff reference (see classifyAlg).
    if (this.isCubeSolved() && !breakdownSolved) {
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
  public getCurrentState(): HashState | null {
    return this.currentState;
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

        const opposite1 = getOppositeColor(color1);
        const opposite2 = getOppositeColor(color2);
        const opposite3 = getOppositeColor(color3);

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

  public getLLcaseName(step: CompilableLLStep): string | undefined {
    try {
      return this.LLinterpreter.getStepInfo(this.getLLcoloring('pattern'), step).name;
    } catch {
      return undefined;
    }
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

  private getAUFindex(): LLCaseInfo<'auf'> {
    const index = this.getReferencePieceLocation('green', 'white');
    const name = ['', "U'", "U2", "U"][index];
    return { step: 'auf', index, minMovements: [-1], name }
  }

  private getLLindices(steps: StepInfo[], types: Set<StepInfo['type']>): LLCaseInfo<SuggestableLLStep>[] {
    if (typeof this.currentCubeRotation !== 'string') {
      console.warn('Current cube rotation not determined');
      return [];
    }
    if (types.has('solved')) {
      return [];
    }

    let indices: LLCaseInfo<SuggestableLLStep>[] = [];
    // co is covered by oll
    // ep covered by pll


    const LLpattern: Grid = this.getLLcoloring('pattern');

    if (!types.has('last layer')) {
      // OLL, CLL, ELL, 1LLL possible
      if (this.enabledAlgsets === 'all' || this.enabledAlgsets.has('oll')) {
        indices.push(this.LLinterpreter.getStepInfo(LLpattern, 'oll'));
      }
      // eoIndex = this.LLinterpreter.getStepInfo(LLpattern, 'eo');
      // onelllIndex = this.get1LLLindex();
      // ellIndex = this.getELLindex();
      // cllIndex = this.getCLLindex();
    } else {
      const hasEO = steps.some(s => s.step === 'eo');
      const hasCO = steps.some(s => s.step === 'co');
      const hasEP = steps.some(s => s.step === 'ep');
      const hasCP = steps.some(s => s.step === 'cp');

      if ((!hasEO || !hasCO) && (!hasEP || !hasCP)) {
        if (this.enabledAlgsets === 'all' || this.enabledAlgsets.has('oll')) {
          indices.push(this.LLinterpreter.getStepInfo(LLpattern, 'oll'));
        }
      }
      if (hasEO && !hasCO) {
        if (this.enabledAlgsets === 'all' || this.enabledAlgsets.has('zbll')) {
          indices.push(this.LLinterpreter.getStepInfo(LLpattern, 'zbll'));
          // onelllIndex = this.LLinterpreter.getStepInfo(LLpattern, 'onelll');
        }
      }
      if (hasEO && hasCO && (!hasCP || !hasEP)) {
        if (this.enabledAlgsets === 'all' || this.enabledAlgsets.has('pll')) {
          indices.push(this.LLinterpreter.getStepInfo(LLpattern, 'pll'));
        }
      }
      if (hasEO && hasCO && hasEP && hasCP) {
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
  public identifyLLcase(step: CompilableLLStep, alg: string): { index: number, refPieceMovement: number, minMovements: number[] } {

    // verify f2l solved
    if (this.getPairsSolved().length !== 4) {
      throw new Error('F2L not fully solved. Cannot identify LL case. Alg: ' + alg);
    }

    const refPieceMovement = this.getReferencePieceLocation('green', 'white', alg);

    const LLpattern: Grid = this.getLLcoloring('pattern');
    const stepData = this.LLinterpreter.getStepInfo(LLpattern, step);

    return { index: stepData.index, refPieceMovement, minMovements: stepData.minMovements };
  }

  public getAlgSuggestions(
    steps?: StepInfo[],
    options?: { f2lPair?: [string, string], enabledAlgsets?: AlgsetFilter, handedness?: Handedness, savedAlgs?: SavedAlgKeys },
  ): Suggestion[] {
    if (!this.currentState) {
      return [];
    }
    if (!steps) {
      steps = this.calcCFOPstepsCompleted();
    }

    if (steps.filter(s => s.type === 'solved').length === 1) {
      return [];
    }

    this.enabledAlgsets = options?.enabledAlgsets ?? 'all';
    this.handedness = options?.handedness ?? 'right';
    this.savedAlgs = options?.savedAlgs;

    const stepTypes = new Set(steps.map(s => s.type));
    const f2lSteps = steps.filter(s => s.type === 'f2l');
    const isF2LComplete = f2lSteps.length === 4;

    if (isF2LComplete) {
      // AUF suggestions still work with an empty suggester, so create one on demand
      if (!this.LLsuggester) {
        this.LLsuggester = new LLsuggester();
      }
      return this.getLLSuggestions(steps, stepTypes);
    } else {
      // f2l covers every pair; zbls only adds EO-solving options on the final pair
      const hashAlgsetEnabled = this.enabledAlgsets === 'all' || this.enabledAlgsets.has('f2l') || this.enabledAlgsets.has('zbls');
      if (!hashAlgsetEnabled || !this.algSuggester) {
        return [];
      }
      return this.getF2LSuggestions(steps, options?.f2lPair);
    }
  }

  /**
   * Filters out redundant algorithms that are extensions of shorter ones. The steps each solves is also considered.
   */
  private filterOverlongAlgorithms(suggestions: Suggestion[]): Suggestion[] {

    const countMoves = (alg: string): number => {
      return alg.split(/\s+/).filter(move => move.match(/[^xyz2']/g)).length;
    };

    suggestions = suggestions.sort((a, b) => {
      return countMoves(a.alg) - countMoves(b.alg);
    });

    const toMoves = (alg: string): string[] =>
      alg.trim().split(/\s+/).map(move => move.replace(/2'$/, '2'));

    const movesPerSuggestion = suggestions.map(suggestion => toMoves(suggestion.alg));

    const sharesAnyStep = (a: Suggestion, b: Suggestion): boolean =>
      a.steps.some(step => b.steps.includes(step));

    const addsNoNewStep = (longer: Suggestion, shorter: Suggestion): boolean =>
      longer.steps.every(step => shorter.steps.includes(step));

    const isRedundantExtension = (longer: number, shorter: number): boolean => {
      const shortMoves = movesPerSuggestion[shorter];
      const longMoves = movesPerSuggestion[longer];
      const lastIndex = shortMoves.length - 1;
      if (!shortMoves.slice(0, lastIndex).every((move, i) => move === longMoves[i])) return false;

      const lastShortMove = shortMoves[lastIndex];
      const matchingLongMove = longMoves[lastIndex];
      if (lastShortMove === matchingLongMove) {
        // if R U R' and R U R' L U L' match on last common move R', 
        // longer alg redundant if they have any step in common
        return sharesAnyStep(suggestions[longer], suggestions[shorter]);
      }

      // if we have L' U' L and L' U' L2 U L', 
      // longer alg redundant if shorter alg has all of the longer alg's steps
      const isHalfOfDouble = matchingLongMove === `${lastShortMove.replace(/'$/, '')}2`;
      return isHalfOfDouble && addsNoNewStep(suggestions[longer], suggestions[shorter]);
    };

    const keptIndexes: number[] = [];

    suggestions.forEach((_, i) => {
      const isRedundant = keptIndexes.some(k => isRedundantExtension(i, k));
      if (!isRedundant) keptIndexes.push(i);
    });

    return keptIndexes.map(k => suggestions[k]);
  }

  private runF2LQueries(queries: F2LPairQuery[]): Suggestion[] {

    let suggestions: Suggestion[] = [];

    const speedEstimator = new AlgSpeedEstimator(this.handedness);
    const algSet = new Set<string>();
    const currentEO = this.eoValue;
    const labelsByAufFreeCore = new Map<string, Set<string>>();

    // iterate and collect suggestions
    queries.forEach(({ query, pairColors, q, isTopLayer, isZBLSrelevant }) => {

      // some f2l cases will return a lot of algs, and the good ones may be later in the list
      // however, the list is now sorted to help avoid this
      query.limit = 40;

      query.scoreBy = 'exact';

      const wantsEO = wantsEORanking(this.enabledAlgsets);

      // if E layer EO is all good, or good except relevant pairs, then ZBLS algs are relevant even if not final pair
      // zbls never relevant if a piece is misslotted
      const algs = this.algSuggester!.searchByPosition(query)
      .map(alg => ({ ...alg, step: toHashAlgset(alg.step) }))
      .filter(alg => this.enabledAlgsets === 'all' || this.enabledAlgsets.has(alg.step))
      .filter(alg => isZBLSrelevant || alg.step !== 'zbls');

      algs.forEach(alg => {
        const [firstColor, secondColor] = pairColors;
        const firstLetter = firstColor ? firstColor.charAt(0).toUpperCase() : '';
        const secondLetter = secondColor ? secondColor.charAt(0).toUpperCase() : '';
        const pairLabel = firstLetter && secondLetter ? `${firstLetter}${secondLetter} pair` : 'pair';

        const { alg: finalAlg, hasEOsolved } = reconstructF2LAlg(
          alg.id, alg.eoValue, q, isTopLayer, wantsEO, currentEO
        );

        // zbls algs are only valid suggestions when they actually solve EO
        if (alg.step === 'zbls' && !hasEOsolved) {
          return;
        }

        if (!isTopLayer) {
          const core = splitLeadingAuf(finalAlg).coreKey;
          const labels = labelsByAufFreeCore.get(core) ?? new Set<string>();
          labels.add(pairLabel);
          labelsByAufFreeCore.set(core, labels);
        }

        if (!algSet.has(finalAlg)) {
          algSet.add(finalAlg);

          suggestions.push({
            alg: finalAlg,
            time: speedEstimator.calcScore(finalAlg),
            steps: [pairLabel],
            hasEOsolved,
            algset: alg.step,
          });
        } else {
          // Algorithm already exists - add this step to the existing suggestion
          const existingSuggestion = suggestions.find(s => s.alg === finalAlg);
          if (existingSuggestion && !existingSuggestion.steps.includes(pairLabel)) {
            existingSuggestion.steps.push(pairLabel);
          }
        }
      });
    });

    suggestions.forEach(suggestion => {
      const labels = labelsByAufFreeCore.get(splitLeadingAuf(suggestion.alg).coreKey);
      labels?.forEach(label => {
        if (!suggestion.steps.includes(label)) {
          suggestion.steps.push(label);
        }
      });
    });

    return suggestions
  }

  private filterF2LSuggestions(suggestions: Suggestion[]): Suggestion[] {
    // filter redundant algorithms that are extensions of shorter ones without unique steps
    return this.filterOverlongAlgorithms(suggestions);
  }

  private getF2LSuggestions(steps: StepInfo[], targetPair?: [string, string]): Suggestion[] {
    let queries = this.currentState ? buildF2LPairQueries(this.currentState) : [];

    if (targetPair) {
      const want = new Set(targetPair.map(c => c.toLowerCase()));
      queries = queries.filter(({ pairColors }) => pairColors.every(c => want.has(c.toLowerCase())));
    }

    if (!queries || queries.length === 0) {
      console.warn(`No F2L queries found for steps: ${steps.map(s => s.step).join(', ')}`);
      return [];
    }

    const suggestions = this.runF2LQueries(queries);

    const filteredSuggestions = this.filterF2LSuggestions(suggestions);

    const bestTimes = new Map<string, number>();
    filteredSuggestions.forEach(suggestion => {
      suggestion.steps.forEach(pairLabel => {
        const currentBest = bestTimes.get(pairLabel) ?? Infinity;
        bestTimes.set(pairLabel, Math.min(currentBest, suggestion.time));
      });
    });

    const cutoffMultiplier = 1.5;
    const isWithinCutoff = (suggestion: Suggestion, pairLabel: string) =>
      suggestion.time <= (bestTimes.get(pairLabel) ?? Infinity) * cutoffMultiplier;

    const fastSuggestions = filteredSuggestions.filter(suggestion =>
      suggestion.hasEOsolved ||
      suggestionRank(suggestion, this.savedAlgs) > 0 ||
      suggestion.steps.some(pairLabel => isWithinCutoff(suggestion, pairLabel))
    );

    const unsolvedPairCount = 4 - steps.filter(s => s.type === 'f2l').length;
    const eoBonusByPairsLeft = [100, 1, 0.5, 0.25];

    const rankingTime = (suggestion: Suggestion): number => {
      if (!suggestion.hasEOsolved) return suggestion.time;
      const pairsLeft = unsolvedPairCount - suggestion.steps.length;
      return suggestion.time - (eoBonusByPairsLeft[pairsLeft] ?? 0);
    };

    return rankSuggestions(
      fastSuggestions,
      (a, b) => rankingTime(a) - rankingTime(b),
      this.savedAlgs,
    );
  }

  private applyHandednessModifier(alg: string, frequency: number): number {
    const hasRighty = /[Rr]/.test(alg);
    const hasLefty = /[Ll]/.test(alg);

    if (this.handedness === 'right' && hasLefty && !hasRighty) {
      return frequency * 0.01;
    }
    if (this.handedness === 'left' && hasRighty && !hasLefty) {
      return frequency * 0.01;
    }
    return frequency;
  }

  private getLLSuggestions(steps: StepInfo[], stepTypes: Set<StepInfo['type']>): Suggestion[] {

    // Calculate all 4 reference piece origins for different AUF positions
    const refPieceOrigins = [
      this.getReferencePieceLocation('green', 'white'),  // preAUFidx 0
      this.getReferencePieceLocation('white', 'red'),    // preAUFidx 1
      this.getReferencePieceLocation('white', 'blue'),   // preAUFidx 2
      this.getReferencePieceLocation('white', 'orange'),  // preAUFidx 3
    ];

    const llIndices = this.getLLindices(steps, stepTypes);
    const algs: { alg: string, name: string, steps: string[], frequency: number, algset: SuggestableLLStep }[] = [];

    llIndices.forEach(index => {
      const stepAlgs = this.LLsuggester!.getAlgsForStep(index.step, index.index, index.minMovements, refPieceOrigins);
      stepAlgs.forEach(({ alg, frequency }) => {
        algs.push({ alg, name: index.name, steps: [index.step], frequency, algset: index.step });
      });
    });

    const speedEstimator = new AlgSpeedEstimator(this.handedness);
    const suggestions: Suggestion[] = algs.map(alg => ({
      alg: alg.alg,
      time: speedEstimator.calcScore(alg.alg),
      steps: alg.steps,
      name: alg.name,
      frequency: this.applyHandednessModifier(alg.alg, alg.frequency),
      algset: alg.algset
    }));

    // sort by frequency (high is better), then by speed estimation as tiebreaker (low is better)
    return rankSuggestions(
      dedupeByAlgsetPriority(suggestions),
      (a, b) =>
        algsetPriority(b.algset) - algsetPriority(a.algset) ||
        (b.frequency ?? 0) - (a.frequency ?? 0) ||
        a.time - b.time,
      this.savedAlgs,
    );
  }
}