export type Grid = number[][]; // each cell is 0..4
export type Step = 'oll' | 'pll' | 'zbll' | 'eo' | 'cp' | 'onelll';
import ollPatterns from '../../utils/oll-patterns.json';
import pllPatterns from '../../utils/pll-patterns.json';

export default class LLinterpreter {

  private ollMaps: Record<number, { caseIndex: number; name: string }> = {};
  private pllMaps: Record<number, { caseIndex: number; name: string }> = {};
  private zbllMaps: Record<number, { caseIndex: number; name: string }> = {};
  private eoMaps: Record<number, { caseIndex: number; name: string }> = {};
  private cpMaps: Record<number, { caseIndex: number; name: string }> = {};
  private onelllMaps: Record<number, { caseIndex: number; name: string }> = {};

  constructor() {
    const ollP = ollPatterns.patterns;
    for (const entry of ollP) {
      this.ollMaps[entry.pattern] = { caseIndex: entry.caseIndex, name: entry.name };
    }

    const pllP = pllPatterns.patterns;
    for (const entry of pllP) {
      this.pllMaps[entry.pattern] = { caseIndex: entry.caseIndex, name: entry.name };
    }

    //TODO: add index maps from a future user database
  }

  private readonly ollMask = [
    [0, 1, 1, 1, 0],
    [1, 1, 1, 1, 1],
    [1, 1, 0, 1, 1],
    [1, 1, 1, 1, 1],
    [0, 1, 1, 1, 0]
  ] 
  // for each grid mask item m and each pattern item p: if p > m || m === 0, then return 0, else p.

  private readonly pllMask = [
    // starting top left, get array of matching (0), adjacent (1), or opposite (2) colors:
    // ex: colors are [G, B, G, R, R, B] -> [2,2,1,0,1]
    [0, 5, 5, 5, 0],
    [5, 0, 0, 0, 5],
    [5, 0, 0, 0, 5],
    [5, 0, 0, 0, 5],
    [0, 5, 5, 5, 0]
  ] 
  
  private readonly cpMask = [
    // if adjacent: 1 side opposite colors or solved, 1 side adjacent
    // if diagonal: 2 opposite colors
    // if solved: 2 solved
    [0, 5, 0, 5, 0],
    [5, 0, 0, 0, 5],
    [0, 0, 0, 0, 0],
    [5, 0, 0, 0, 5],
    [0, 5, 0, 5, 0]
  ]

  private readonly zbllMask = [
    [0, 5, 5, 5, 0],
    [5, 5, 0, 5, 5],
    [5, 0, 0, 0, 5],
    [5, 5, 0, 5, 5],
    [0, 5, 5, 5, 0]
  ]

  private readonly eoMask = [
    [0, 0, 0, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 1, 0, 1, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 0, 0, 0]
  ]

  private readonly onelllMask = [
    [0, 5, 5, 5, 0],
    [5, 5, 5, 5, 5],
    [5, 5, 0, 5, 5],
    [5, 5, 5, 5, 5],
    [0, 5, 5, 5, 0]
  ]

  // Precompute rotation index maps for an n x n grid
  private makeIndexMaps(n: number): number[][] {
    const N = n * n;
    const maps: number[][] = [];
    for (let rot = 0; rot < 4; rot++) {
      const map = new Array<number>(N);
      for (let out = 0; out < N; out++) {
        const outRow = Math.floor(out / n);
        const outCol = out % n;
        let inRow: number, inCol: number;
        switch (rot) {
          case 0: // 0°
            inRow = outRow; 
            inCol = outCol; 
            break;
          case 1: // 90°
            inRow = outCol; 
            inCol = n - outRow - 1; 
            break;
          case 2: // 180°
            inRow = n - outRow - 1; 
            inCol = n - outCol - 1; 
            break;
          case 3: // 270° clockwise
            inRow = n - outCol - 1; 
            inCol = outRow; 
            break;
        }
        map[out] = inRow! * n + inCol!;
      }
      maps.push(map);
    }
    return maps;
  }

  // Flatten grid to a compact Uint8Array in a clockwise spiral pattern, skipping corners and center
  private flattenGrid(grid: Grid): Uint8Array {
    const n = grid.length;
    
    const out = new Uint8Array(n * n);
    let k = 0;
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        out[k++] = grid[r][c];
      }
    }
    return out;
  }

  private simplifyFlat(flat: Uint8Array, step: Step, n: number, maps: number[][]): {minKey: number, minMovements: number[]} {
    const N = n * n;

    switch (step) {
      case 'cp':
      case 'zbll':
      case 'onelll':
      case 'pll':
        return this.simplifySpiralRotations(flat, N);
      default:
        // f2l, oll, eo?
        return this.simplifyRegularRotations(flat, N, maps);
    }
  }

  private simplifySpiralRotations(flat: Uint8Array, N: number): {minKey: number, minMovements: number[]} {
    const outerSpiral = [5,1,2,3,9,14,19,23,22,21,15,10];
    const innerSpiral = [6,7,8,13,18,17,16,11];
    
    // Starting points for each rotation
    const outerStarts = [5, 3, 19, 21]; // actual grid positions
    const innerStarts = [6, 8, 18, 16]; // actual grid positions
    
    let minKey = Number.POSITIVE_INFINITY;
    let minMovements: number[] = []; //

    for (let rot = 0; rot < 4; rot++) {
      const newFlat = new Uint8Array(25);
      
      // Find starting positions in the spiral arrays
      const outerStartIdx = outerSpiral.indexOf(outerStarts[rot]);
      const innerStartIdx = innerSpiral.indexOf(innerStarts[rot]);
      
      const colorMap = new Map<number, number>();
      let nextColorNum = 1;
      
      for (let i = 0; i < outerSpiral.length; i++) {
        // read from rotated order, write to fixed order
        const readIndex = outerSpiral[(outerStartIdx + i) % outerSpiral.length]; // where to read from
        const writeIndex = outerSpiral[i]; // where to write to (fixed position)
        const sticker = flat[readIndex];
        
        // Assign a number to this color if we haven't seen it yet
        if (!colorMap.has(sticker)) {
          colorMap.set(sticker, nextColorNum++);
        }
        
        newFlat[writeIndex] = colorMap.get(sticker)!;
      }
      
      for (let i = 0; i < innerSpiral.length; i++) {
        const readIndex = innerSpiral[(innerStartIdx + i) % innerSpiral.length];
        const writeIndex = innerSpiral[i];
        const sticker = flat[readIndex];
        
        if (!colorMap.has(sticker)) {
          colorMap.set(sticker, nextColorNum++);
        }
        
        newFlat[writeIndex] = colorMap.get(sticker)!;
      }
      
      // generate key
      let value = 0;
      for (const idx of outerSpiral) {
        value = value * 6 + newFlat[idx];
      }
      for (const idx of innerSpiral) {
        value = value * 6 + newFlat[idx];
      }

      if (value < minKey) {
        minMovements = [rot];
        minKey = value;
      } else if (value === minKey) {
        minMovements.push(rot);
      }

      // console.log(`Rotation ${rot * 90}°:`);
      // for (let r = 0; r < 5; r++) {
      //   console.log(newFlat.slice(r * 5, r * 5 + 5).join(' '));
      // }
    }

    return {minKey, minMovements: minMovements};
  }

  private simplifyRegularRotations(flat: Uint8Array, N: number, maps: number[][]): {minKey: number, minMovements: number[]} {
    let minKey = Number.POSITIVE_INFINITY;
    let minMovements: number[] = [];

    // Process each of the 4 rotations
    for (let rot = 0; rot < 4; rot++) {
      const map = maps[rot];
      let value = 0;
      for (let i = 0; i < N; i++) {
        // multiply-add in base-6
        value = value * 6 + flat[map[i]];
      }
      
      if (value < minKey) {
        minMovements = [rot];
        minKey = value;
      } else if (value === minKey) {
        minMovements.push(rot);
      }
    }

    return {minKey, minMovements};
  }

  // Compute canonical key as the minimum base-6 integer over 4 rotations
  public canonicalBase6Key(grid: Grid, step: Step, mapsCache?: number[][][]): {key: number, minMovements: number[]} {
    const masked: Grid = this.calcMaskedGrid(grid, step);

    const n = grid.length;
    const flattened = this.flattenGrid(masked);

    // optional cache of maps per n
    let maps = mapsCache?.[n];
    if (!maps) {
      maps = this.makeIndexMaps(n);
      if (mapsCache) mapsCache[n] = maps;
    }

    const {minKey, minMovements} = this.simplifyFlat(flattened, step, n, maps);

    return {key: minKey, minMovements}
  }

  private calcMaskedGrid = (pattern: Grid, step: Step): Grid => {
    let mask: Grid;
    switch (step) {
      case 'oll':
        mask = this.ollMask;
        break;
      case 'pll':
        mask = this.pllMask;
        break;
      case 'zbll':
        mask = this.zbllMask;
        break;
      case 'eo':
        mask = this.eoMask;
        break;
      case 'onelll':
        mask = this.onelllMask;
        break;
    }

    const maskedPattern: Grid = pattern.map((row, r) =>
      row.map((cell, c) => (mask[r][c] === 0 || cell > mask[r][c]) ? 0 : cell)
    );
    return maskedPattern;
  }

  public getStepInfo = (pattern: Grid, step: Step): {step: string, index: number, minMovements: number[], name: string} => {

    const { key: key, minMovements } = this.canonicalBase6Key(pattern, step);

    let caseMap: Record<number, { caseIndex: number; name: string }>;
    switch (step) {
      case 'oll':
        caseMap = this.ollMaps;
        break;
      case 'pll':
        caseMap = this.pllMaps;
        break;
      case 'zbll':
        caseMap = this.zbllMaps;
        break;
      case 'eo':
        caseMap = this.eoMaps;
        break;
      case 'cp':
        caseMap = this.cpMaps;
        break;
      case 'onelll':
        caseMap = this.onelllMaps;
        break;
      default:
        throw new Error(`Unsupported step type: ${step}`);
    }

    const caseIndex = caseMap[key]?.caseIndex;
    if (caseIndex === undefined) {
      throw new Error(`No case found for step ${step} with key ${key}`);
    }
    const caseName = caseMap[key]?.name ?? 'Unknown';

    
    return {step, index: caseIndex, minMovements, name: caseName};
  }
}