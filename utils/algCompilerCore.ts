import {
  rawGeneric,
  rawOLLrightyAlgs,
  rawOLLleftyAlgs,
  rawPLLrightyAlgs,
  rawPLLleftyAlgs,
  rawZBLLrightyAlgs,
  rawZBLLleftyAlgs,
} from "./rawAlgs";
import type { ExactAlg } from "./rawAlgs";
import { SimpleCubeInterpreter, type StepInfo, type HashAlgset } from "../composables/recon/SimpleCubeInterpreter";
import { SimpleCube } from '../composables/recon/SimpleCube';
import { reverseMove, replacementTable_Y, replacementTable_M } from '../composables/recon/transformHTML';
import AlgSpeedEstimator from '../composables/recon/AlgSpeedEstimator';
import type { CompiledLLAlg } from '../composables/recon/LLsuggester';
import type { CompilableLLStep } from '../composables/recon/LLinterpreter';
import { ollFrequencies, pllFrequencies } from './algFrequencies';
import { collapseAufGroups, canonicalizeAufHashes } from './collapseAufVariants';
import { combineMoves, formatMove, parseMove } from './moveUtils';

const LL_REPAIR_ROTATIONS = ['x', "x'", 'x2', 'z', "z'", 'z2'];

interface CompiledExactAlg {
  alg: string;
  hash: string;
  eoValue: number;
}

interface ExpandedExactAlg extends ExactAlg {
  originalIndex: number;
}

export type AlgorithmType = HashAlgset | CompilableLLStep;

export const ALGORITHM_TYPES: AlgorithmType[] = ['f2l', 'zbls', 'oll', 'pll', 'zbll'];

export type EmittedFileKind = 'compiled' | 'newAlgs' | 'repairedRaw';

export interface EmittedFile {
  kind: EmittedFileKind;
  label: string;
  contents: string;
}

export interface CompileOptions {
  types: Iterable<AlgorithmType>;
  emit: (file: EmittedFile) => void;
  shouldContinue?: () => boolean;
}

/**
 * Environment-free algorithm compiler. Callers decide what to do with emitted files,
 * so the same pipeline drives both the in-browser tool and the CLI script.
 */
export function compileAlgs({ types, emit, shouldContinue = () => true }: CompileOptions): void {
  const simpleCube = new SimpleCube();
  const selectedAlgTypes = new Set<AlgorithmType>(types);

  const getAlgInverse = (alg: string): string => {
    let reversedAlg = '';
    const moves = alg.split(' ').reverse();
    moves.forEach((move) => {
      let reversedMove = reverseMove(move);
      if (reversedMove) {
        reversedAlg += reversedMove + ' ';
      }
    });
    return reversedAlg.trim();
  };

  const getAllowedAngles = (alg: ExactAlg): string[] => {
    switch (alg.step) {
      case 'f2l':
        if (alg.add_y && alg.add_U) {
          // allow all combinations of y and U, except any y2
          return ['', 'y', "y'", 'U', "U'", 'U2', 'y U', "y U'", 'y U2', "y' U", "y' U'", "y' U2"];
        } else if (alg.add_y) {
          return ['', 'y', "y'"];
        } else if (alg.add_U) {
          return ['', 'U', "U'", 'U2'];
        } else {
          return [''];
        }
      case 'oll':
      case 'pll':
        if (alg.add_U) {
          return ['', 'U', "U'", 'U2'];
        } else {
          return [''];
        }
      default:
        if (alg.add_y && alg.add_U) {
          // allow all combinations of y and U, including y2 and U2
          return ['', 'y', "y'", "y2", 'U', "U'", 'U2', 'y U', "y U'", 'y U2', "y' U", "y' U'", "y' U2", "y2 U", "y2 U'", "y2 U2"];
        } else if (alg.add_y) {
          return ['', 'y', "y'", "y2"];
        } else if (alg.add_U) {
          return ['', 'U', "U'", 'U2'];
        } else {
          return [''];
        }
    }
  }

  /**
   * Reorders algorithm by flipping U and y moves using regex
   * Example: "U2 y' R U R'" becomes "y' U2 R U R'"
   */
  const reorderAnglingInAlg = (angle: string, algValue: string): string => {
    const combined = (angle ? `${angle} ` : '') + algValue;
    const moves = combined.trim().split(/\s+/).filter(m => m.length > 0);

    let leadingCount = 0;
    while (leadingCount < moves.length && /^[Uy]['2]?$/.test(moves[leadingCount])) {
      leadingCount++;
    }

    const leading = moves.slice(0, leadingCount).join(' ').replace(/(U'?2?)\s+(y'?2?)/g, '$2 $1');
    const rest = moves.slice(leadingCount).join(' ');

    return `${leading} ${rest}`.trim();
  };

  /**
   * Validates that algorithm doesn't have more than 2 leading rotation/AUF moves
   * and not more than 1 of each type (U and y)
   */
  const validateAlg = (alg: string): boolean => {
    const moves = alg.trim().split(/\s+/);
    const leadingMoves = [];
    
    // Get leading U and y moves
    for (const move of moves) {
      if (move.match(/^[Uy]['2]?$/)) {
        leadingMoves.push(move);
      } else {
        break;
      }
    }
    
    // Check if we have more than 2 leading moves
    if (leadingMoves.length > 2) {
      console.error(`Invalid algorithm pattern detected: ${alg}. Too many leading rotation/AUF moves (${leadingMoves.length}). Halting processing.`);
      return false;
    }
    
    // Check if we have more than 1 of each type
    const uMoves = leadingMoves.filter(move => move.startsWith('U'));
    const yMoves = leadingMoves.filter(move => move.startsWith('y'));
    
    if (uMoves.length > 1) {
      console.error(`Invalid algorithm pattern detected: ${alg}. Too many leading U moves (${uMoves.length}). Halting processing.`);
      return false;
    }
    
    if (yMoves.length > 1) {
      console.error(`Invalid algorithm pattern detected: ${alg}. Too many leading y moves (${yMoves.length}). Halting processing.`);
      return false;
    }
    
    return true;
  };

  const compileSelectedAlgs = () => {
    if (selectedAlgTypes.has('f2l')) {
      const f2lAlgs = rawGeneric.filter(alg => alg.step === 'f2l');
      compileExactAlgorithms(prepareExactAlgs(f2lAlgs, 'f2l'), 'f2l');
    }
    if (selectedAlgTypes.has('zbls')) {
      const zblsAlgs = rawGeneric.filter(alg => alg.step === 'zbls');
      compileExactAlgorithms(prepareExactAlgs(zblsAlgs, 'zbls'), 'zbls');
    }
    if (selectedAlgTypes.has('oll')) {
      compileLLalgorithms(rawOLLrightyAlgs, 'oll', 'oll-righty');
      compileLLalgorithms(rawOLLleftyAlgs, 'oll', 'oll-lefty');
    }
    if (selectedAlgTypes.has('pll')) {
      compileLLalgorithms(rawPLLrightyAlgs, 'pll', 'pll-righty');
      compileLLalgorithms(rawPLLleftyAlgs, 'pll', 'pll-lefty');
    }
    if (selectedAlgTypes.has('zbll')) {
      compileLLalgorithms(rawZBLLrightyAlgs, 'zbll', 'zbll-righty');
      compileLLalgorithms(rawZBLLleftyAlgs, 'zbll', 'zbll-lefty');
    }
  };

  /**
   * Checks for moves that cancel out or combine (ex1: U U' = '', ex2: U U = U2).
   */
  const simplifyAlgValue = (value: string): string => {
    let current = (value ?? '').trim().replace(/\s+/g, ' ').split(' ');
    let previous: string[] = [];

    while (current.length !== previous.length) {
      previous = [...current];

      const combined = combineMoves(current);

      current = combined.filter(move => move !== '');
    }

    return current.join(' ');
  };

  const stripLeadingSetupMoves = (value: string): string => {
    const moves = value.split(' ').filter(move => move.length > 0);

    while (moves.length > 0) {
      const parsed = parseMove(moves[0]);

      if (!parsed) {
        break;
      }

      if (parsed.base === 'y' || parsed.base === 'U' || parsed.base === 'd') {
        moves.shift();
        continue;
      }

      break;
    }

    return moves.join(' ');
  };

  const simplifyExactAlgs = (algs: ExactAlg[]): ExactAlg[] => {
    return algs.map(alg => ({ ...alg, value: simplifyAlgValue(alg.value) }));
  };

  const simplifyLLalgs = (algs: string[]): string[] => {
    return algs.map(alg => stripLeadingSetupMoves(simplifyAlgValue(alg)));
  };

  const stripTrailingYMoves = (alg: string): string => {
    const moves = alg.trim().split(/\s+/).filter(m => m.length > 0);
    while (moves.length > 0 && /^y['2]?$/.test(moves[moves.length - 1])) {
      moves.pop();
    }
    return moves.join(' ');
  };

  const getY2Variant = (alg: string): string => {
    const moves = alg.trim().split(/\s+/);
    if (!moves.length || (moves.length === 1 && moves[0] === '')) return alg;

    const rootMoves = new Set<string>();
    for (const move of moves) {
      if (!move) continue;
      const root = move.replace(/['23]/g, '');
      rootMoves.add(root);
    }

    const yRU_set = new Set(['y', 'R', 'U']);
    const yLU_set = new Set(['y', 'L', 'U']);
    
    let is_yRU = true;
    let is_yLU = true;
    
    for (const root of rootMoves) {
      if (!yRU_set.has(root)) is_yRU = false;
      if (!yLU_set.has(root)) is_yLU = false;
    }
    
    // must be just yRU or just yLU
    if ((is_yRU && is_yLU) || (!is_yRU && !is_yLU)) {
      return alg;
    }

    const newMoves = moves.map(move => {
        let transformed = move;
        
        // apply y transform twice
        // let program crash if not found in table
        transformed = replacementTable_Y[transformed]
        transformed = replacementTable_Y[transformed]

        return transformed;
    });

    return newMoves.join(' ');
  };

  const getMirrorMVariant = (alg: string): string => {
    const moves = alg.trim().split(/\s+/);
    if (!moves.length || (moves.length === 1 && moves[0] === '')) return alg;

    const rootMoves = new Set<string>();
    for (const move of moves) {
      if (!move) continue;
      const root = move.replace(/['23]/g, '');
      rootMoves.add(root);
    }

    const yRU_set = new Set(['y', 'R', 'U']);
    const yLU_set = new Set(['y', 'L', 'U']);

    let is_yRU = true;
    let is_yLU = true;

    for (const root of rootMoves) {
      if (!yRU_set.has(root)) is_yRU = false;
      if (!yLU_set.has(root)) is_yLU = false;
    }

    // must be just yRU or just yLU
    if ((is_yRU && is_yLU) || (!is_yRU && !is_yLU)) {
      return alg;
    }

    const newMoves = moves.map(move => {
        // let program crash if not found in table
        return replacementTable_M[move];
    });

    return newMoves.join(' ');
  };

  /**
   * Filters out new F2L algs where a move doesn't change the value at the slot's indices.
   *
   * Logic:
   * 1. Determine which slot the alg solves based on ending move:
   *    - R' → FR (Front-Right): edge 8, corner 16
   *    - R → BR (Back-Right): edge 10, corner 19
   *    - L' → BL (Back-Left): edge 11, corner 18
   *    - L → FL (Front-Left): edge 9, corner 17
   * 2. For right slot algs (R/R'): if there's an L move that doesn't change the value at the slot's indices, filter out
   * 3. For left slot algs (L/L'): if there's an R move that doesn't change the value at the slot's indices, filter out
   * 4. If the alg starts with a U move (after optional y), and it doesn't change the value at the slot's indices, filter out
   */
  const filterInefficientNewF2LAlgs = <T extends ExactAlg>(newAlgs: T[]): T[] => {
    // Slot indices in hash: edge index comes from 0-11, corner from 12-19
    const slotIndices: { [key: string]: { edge: number; corner: number } } = {
      "R'": { edge: 8, corner: 16 },  // FR slot
      "R": { edge: 10, corner: 19 },  // BR slot
      "L'": { edge: 11, corner: 18 }, // BL slot
      "L": { edge: 9, corner: 17 },   // FL slot
    };

    const inefficientEndings = new Set([
      "U2 L' U2 L", 
      "U2 L U2 L'", 
      "U2 R' U2 R", 
      "U2 R U2 R'", 
      "U' L' U2 L", 
      "U L U2 L'", 
      "U R U2 R'", 
      "U' R' U2 R", 
      "U' R U' R'", 
      "U R' U R", 
      "U L' U L",
      "U' L U' L'",
      "U R U2 R'",
      "U' R' U2 R",
      "U L U2 L'",
      "U' L' U2 L"
    ])

    // Pattern to detect opposite-side moves for each ending move
    const oppositeMovePattern: { [key: string]: RegExp } = {
      "R'": /^L['2]?$/,  // Right slot algs - look for L moves
      "R": /^L['2]?$/,
      "L'": /^R['2]?$/,  // Left slot algs - look for R moves
      "L": /^R['2]?$/,
    };

    const filteredAlgs: T[] = [];

    for (const alg of newAlgs) {
      const DEBUG = alg.value === "";

      if (alg.step !== 'f2l' && alg.step !== 'zbls') {
        filteredAlgs.push(alg);
        console.log(`Keeping non-f2l/zbls alg: "${alg.value}"`);
        continue;
      }

      // Check if alg ends with an inefficient pattern
      const hasInefficientEnding = Array.from(inefficientEndings).some(ending => alg.value.endsWith(ending));
      if (hasInefficientEnding) {
        console.log(`Filtering out alg with inefficient ending: "${alg.value}"`);
        continue;
      }

      const moves = alg.value.trim().split(/\s+/).filter(m => m.length > 0);
      if (moves.length <= 1) {
        continue;
      }

      // Initialize cube with inverse of alg
      const inverseAlg = getAlgInverse(alg.value);
      const tempCube = new SimpleCube();
      const tempInterpreter = new SimpleCubeInterpreter();

      const inverseMoves = inverseAlg.split(' ').filter(m => m.length > 0);
      let cubeState = tempCube.getCubeState(inverseMoves);
      const inverseSteps = tempInterpreter.getStepsCompleted(cubeState);
      const inverseF2lSolved = inverseSteps.filter(s => s.type === 'f2l').length;
      if (inverseF2lSolved === 4) {
        if (DEBUG) console.log(`DEBUG: inverse leaves all F2L slots solved, filtering out`);
        continue;
      }

      if (alg.step === 'zbls') {
        // don't bother trying to check zbls algs for inefficiencies
        // too complicated for now
        if (DEBUG) console.log('DEBUG: Keeping zbls alg')
        filteredAlgs.push(alg);
        continue;
      }

      const lastMove = moves[moves.length - 1];
      const slot = slotIndices[lastMove];
      const oppositePattern = oppositeMovePattern[lastMove];

      if (DEBUG) console.log(`DEBUG: lastMove=${lastMove}, slot=${JSON.stringify(slot)}, oppositePattern=${oppositePattern}`);

      if (!slot || !oppositePattern) {
        if (DEBUG) console.log(`DEBUG: No slot or oppositePattern, keeping alg`);
        filteredAlgs.push(alg);
        continue;
      }

      // Check if there are any opposite-side moves in the alg
      const hasOppositeMove = moves.some(m => oppositePattern.test(m));
      if (DEBUG) console.log(`DEBUG: hasOppositeMove=${hasOppositeMove}, moves=${JSON.stringify(moves)}`);
      if (!hasOppositeMove) {
        // If the alg doesn't change both sides of the cube, 
        // this function has nothing to make an easy check against,
        // so we keep these algs by default.
        if (DEBUG) console.log(`DEBUG: No opposite moves, keeping alg`);
        filteredAlgs.push(alg);
        continue;
      }

      let prevHash = tempInterpreter.getCurrentState()?.hash || '';

      if (DEBUG) console.log(`DEBUG: inverseAlg="${inverseAlg}", initial prevHash="${prevHash}"`);

      // Check if any opposite-side move or starting U move doesn't change the value at slot indices
      let hasUselessMove = false;

      // Determine the index of the first U move (after optional y)
      const movesAfterY = /^y['2]?$/.test(moves[0]) ? moves.slice(1) : moves;
      const firstUMoveIndex = /^U['2]?$/.test(movesAfterY[0])
        ? (moves.length - movesAfterY.length)
        : -1;

      if (DEBUG) console.log(`DEBUG: firstUMoveIndex=${firstUMoveIndex}`);

      for (let i = 0; i < moves.length; i++) {
        const move = moves[i];

        // Apply this move
        cubeState = tempCube.getCubeState([...inverseMoves, ...moves.slice(0, i + 1)]);
        const stepsCompleted = tempInterpreter.getStepsCompleted(cubeState);
        const currHash = tempInterpreter.getCurrentState()?.hash || '';
        const crossSolved = stepsCompleted.some(s => s.type === 'cross');

        if (DEBUG) console.log(`DEBUG: i=${i}, move="${move}", prevHash="${prevHash}", currHash="${currHash}", crossSolved=${crossSolved}`);

        // Check if this is the starting U move (after optional y)
        if (i === firstUMoveIndex) {
          const edgeChanged = prevHash[slot.edge] !== currHash[slot.edge];
          const cornerChanged = prevHash[slot.corner] !== currHash[slot.corner];

          if (DEBUG) console.log(`DEBUG: Starting U check - edgeChanged=${edgeChanged} (prev=${prevHash[slot.edge]}, curr=${currHash[slot.edge]}), cornerChanged=${cornerChanged} (prev=${prevHash[slot.corner]}, curr=${currHash[slot.corner]})`);

          if (!edgeChanged && !cornerChanged && !crossSolved) {
            if (DEBUG) console.log(`DEBUG: Marking as useless due to starting U move`);
            hasUselessMove = true;
            break;
          }
        }

        // If this is an opposite-side move, check if it changed the value at slot indices
        if (oppositePattern.test(move)) {
          const edgeChanged = prevHash[slot.edge] !== currHash[slot.edge];
          const cornerChanged = prevHash[slot.corner] !== currHash[slot.corner];

          if (DEBUG) console.log(`DEBUG: Opposite move check - edgeChanged=${edgeChanged}, cornerChanged=${cornerChanged}`);

          if (!edgeChanged && !cornerChanged && !crossSolved) {
            // This opposite-side move didn't change the value at slot indices - bad alg
            if (DEBUG) console.log(`DEBUG: Marking as useless due to opposite move`);
            hasUselessMove = true;
            break;
          }
        }

        prevHash = currHash;
      }

      if (hasUselessMove) {
        console.log(`Filtering out inefficient F2L alg: "${alg.value}" - move doesn't change value at slot indices (edge: ${slot.edge}, corner: ${slot.corner})`);
      } else {
        if (DEBUG) console.log(`DEBUG: Keeping alg - no useless moves found`);
        filteredAlgs.push(alg);
      }
    }

    console.log(`Filtered F2L algs: kept ${filteredAlgs.length} out of ${newAlgs.length}`);
    return filteredAlgs;
  };

  const findUniqueNewAlgs = (algs: ExactAlg[], expandedAlgs: ExpandedExactAlg[]) => {

    const newAlgs: ExactAlg[] = [];
    const existingAlgs = new Set<string>();
    const checkedIndices = new Set<number>();
    for (let i = 0; i < expandedAlgs.length; i++) {

      const index = expandedAlgs[i].originalIndex;
      const originalAlg = index === -1 ? null : algs[index];
      const simplifiedAlg = expandedAlgs[i];

      // warn if old alg is not in its most simplified form
      // only check the first (unrotated/base-angle) expansion per original alg, since
      // the other expanded angle variants are expected to differ from the original by design
      if (originalAlg && !checkedIndices.has(index)) {
        checkedIndices.add(index);
        if (!originalAlg.new && originalAlg.value !== simplifiedAlg.value) {
          console.warn(`Algorithm at index ${index} is not in simplified form. Original: "${originalAlg.value}", Simplified: "${simplifiedAlg.value}"`);
        }
      }

      // add simplified alg to either list depending on if it's new or existing
      if (simplifiedAlg.new) {
        newAlgs.push(simplifiedAlg);
      } else {
        // remove N2'-type moves and turn into N2
        const cleanExistingValue = simplifiedAlg.value.replace(/2'/g, '2');
        existingAlgs.add(cleanExistingValue);
      }
    }

    console.log('new alg size:', newAlgs.length);
    const actuallyNewAlgs = newAlgs.filter(alg => !existingAlgs.has(alg.value));

    // filter out duplicate alg.values within new algs
    const uniqueNewAlgSet = new Set<string>();
    const uniqueNewAlgs: ExactAlg[] = [];
    actuallyNewAlgs.forEach(alg => {
      const cleanNewAlgValue = alg.value.replace(/2'/g, '2');

      // verify both that the alg isn't in the uniqueSet
      // and also not in existingAlgs in its cleaned version
      if (!uniqueNewAlgSet.has(alg.value) && !existingAlgs.has(cleanNewAlgValue)) {
        uniqueNewAlgSet.add(alg.value);
        uniqueNewAlgs.push(alg);
      }
    });

    console.log('unique new alg size:', uniqueNewAlgs.length);
    return uniqueNewAlgs;
  };

  const preservesF2L = (cubeInterpreter: SimpleCubeInterpreter, alg: string): boolean => {
    const cube = simpleCube.getCubeState(alg.split(' '));
    const steps: StepInfo[] = cubeInterpreter.getStepsCompleted(cube);
    return steps.filter(step => step.type === 'f2l').length === 4;
  };

  const getSuffixVariants = (move: string): string[] => {
    const parsed = parseMove(move);
    if (!parsed) return [];

    return [1, 2, 3]
      .filter(amount => amount !== parsed.amount)
      .map(amount => formatMove(parsed.base, amount));
  };

  /**
   * Attempts to salvage an LL alg that doesn't preserve F2L. First tries a trailing
   * rotation, then a single wrong move suffix, then both together.
   */
  const repairLLalg = (cubeInterpreter: SimpleCubeInterpreter, alg: string): string | null => {
    const moves = alg.trim().split(/\s+/).filter(move => move.length > 0);
    if (moves.length === 0) return null;

    for (const rotation of LL_REPAIR_ROTATIONS) {
      const candidate = [...moves, rotation].join(' ');
      if (preservesF2L(cubeInterpreter, candidate)) return candidate;
    }

    for (const rotation of ['', ...LL_REPAIR_ROTATIONS]) {
      for (let i = moves.length - 1; i >= 0; i--) {
        for (const variant of getSuffixVariants(moves[i])) {
          const patched = [...moves];
          patched[i] = variant;
          if (rotation) patched.push(rotation);

          const candidate = patched.join(' ');
          if (preservesF2L(cubeInterpreter, candidate)) return candidate;
        }
      }
    }

    return null;
  };

  const emitRepairedRawLLalgs = (algs: string[], label: string) => {
    emit({ kind: 'repairedRaw', label, contents: `${JSON.stringify(algs, null, 2)}\n` });
  };

  const repairBrokenLLalgs = (algs: string[], step: CompilableLLStep, label: string): string[] => {
    const cubeInterpreter = new SimpleCubeInterpreter();

    const repairedAlgs: string[] = [];
    let repairedCount = 0;
    let unrepairableCount = 0;

    for (const alg of algs) {
      if (!shouldContinue()) {
        repairedAlgs.push(alg);
        continue;
      }

      if (preservesF2L(cubeInterpreter, alg)) {
        repairedAlgs.push(alg);
        continue;
      }

      const repaired = repairLLalg(cubeInterpreter, alg);
      if (repaired) {
        console.log(`Repaired LL alg "${alg}" to "${repaired}"`);
        repairedAlgs.push(repaired);
        repairedCount++;
      } else {
        console.warn(`LL alg "${alg}" does not preserve F2L and could not be repaired.`);
        repairedAlgs.push(alg);
        unrepairableCount++;
      }
    }

    console.log(`Repaired ${repairedCount} ${step} algs, ${unrepairableCount} still broken.`);

    if (repairedCount > 0 && shouldContinue()) {
      emitRepairedRawLLalgs(repairedAlgs, label);
    }

    return repairedAlgs;
  };

  /**
   * Find algs that preserve F2L. For PLL, doesn't check if OLL is solved. Only checks F2L.
   */
  const findWorkingLLalgs = (algs: string[]) => {

    const cubeInterpreter = new SimpleCubeInterpreter();

    const usableAlgs: string[] = [];
    console.log(`Filtering ${algs.length} LL algs for F2L-preserving ones...`);
    for (const alg of algs) {

      if (!shouldContinue()) {
        break;
      }

      if (preservesF2L(cubeInterpreter, alg)) {
        usableAlgs.push(alg);
      }
    };

    console.log(`Filtered usable LL algs: ${usableAlgs.length} out of ${algs.length}`);
    return usableAlgs;
  }

  /**
   * Creates the full list of algs based on all allowed angles.
   */
  const expandAlgs = (algs: ExactAlg[]) => {
    const expandedAlgs: (ExpandedExactAlg)[] = [];

    algs.forEach((alg, index) => {
      const angles = getAllowedAngles(alg);
      angles.forEach((angle) => {

        // add AUF/rotation and reorder if needed (y moves should go before U moves)
        const completeAlg = reorderAnglingInAlg(angle, alg.value);

        expandedAlgs.push({
          ...alg,
          value: completeAlg,
          originalIndex: index,
        } as ExpandedExactAlg);
      });
    });

    algs.forEach((alg) => {
      const y2Variant = stripTrailingYMoves(getY2Variant(alg.value));
      if (y2Variant !== alg.value) {
        expandedAlgs.push({
          value: y2Variant,
          originalIndex: -1, // no need to associate with original index
          step: alg.step,
          name: alg.name ?? "",
          new: true,
        } as ExpandedExactAlg);
      }
    });

    algs.forEach((alg) => {
      const mirrorVariant = stripTrailingYMoves(getMirrorMVariant(alg.value));
      if (mirrorVariant !== alg.value) {
        expandedAlgs.push({
          value: mirrorVariant,
          originalIndex: -1, // no need to associate with original index
          step: alg.step,
          name: alg.name ?? "",
          new: true,
        } as ExpandedExactAlg);
      }
    });

    // sort algs by index
    expandedAlgs.sort((a, b) => {
      return a.originalIndex - b.originalIndex;
    });       

    return expandedAlgs;
  }

  const findUniqueOldAlgSet = (expandedAlgs: ExpandedExactAlg[]) => {
    const algSet = new Set<ExactAlg>();
    expandedAlgs.forEach((alg) => {
      // Don't include new variants in the base set
      if (alg.new) return;

      if (algSet.has(alg)) {
        console.warn(`Duplicate algorithm detected in rawAlgs.tsx at index ${alg.originalIndex}`);
        console.log({...alg});
      }
      algSet.add(alg);
    });
    return algSet;
  }

  const emitUniqueNewAlgs = (algs: ExactAlg[], label: string) => {
    if (algs.length === 0) return;

    algs = algs.map(alg => ({
      new: false,
      value: alg.value,
      step: alg.step,
      name: alg.name ?? "",
      add_y: false,
      add_U: false,
    }));

    algs = collapseAufGroups(algs);

    const prettyJson = '[\n  ' + algs.map(alg => JSON.stringify(alg).replaceAll(',',', ')).join(',\n  ') + '\n]';
    emit({ kind: 'newAlgs', label, contents: prettyJson });
  };

  const prepareExactAlgs = (algs: ExactAlg[], downloadLabel: string): ExactAlg[] => {

    console.log(`Preparing Exact algorithms... Total algs: ${algs.length}`);

    const simplifiedAlgs = simplifyExactAlgs(algs);

    let expandedAlgs = expandAlgs(simplifiedAlgs);

    // Filter inefficient new F2L algs AFTER expansion (U moves are added during expansion)
    const newAlgs: ExpandedExactAlg[] = [];
    const oldAlgs: ExpandedExactAlg[] = [];
    expandedAlgs.forEach(alg => {
      if (alg.new) {
        newAlgs.push(alg);
      } else {
        oldAlgs.push(alg);
      }
    });
    const filteredNewAlgs = filterInefficientNewF2LAlgs(newAlgs);
    expandedAlgs = [...oldAlgs, ...filteredNewAlgs];

    // parse out duplicates in algs without `new: true`
    const algSet = findUniqueOldAlgSet(expandedAlgs);
    console.log('alg set size before adding new algs:', algSet.size);

    const uniqueNewAlgs = findUniqueNewAlgs(algs, expandedAlgs);

    if (uniqueNewAlgs.length > 0) {
      console.log('Replace new algs with this list');

      emitUniqueNewAlgs(uniqueNewAlgs, downloadLabel);
    }

    const allAlgs = Array.from(algSet);
    console.log('Usable new algs count:', uniqueNewAlgs.length);
    console.log('Existing algs count:', allAlgs.length);
    allAlgs.push(...uniqueNewAlgs);

    return allAlgs;
  };

  const prepareLLAlgs = (algs: string[], step: CompilableLLStep, label: string): string[] => {

    console.log(`Preparing LastLayer algorithms... Total algs: ${algs.length}`);

    const repairedAlgs = repairBrokenLLalgs(algs, step, label);

    const uniqueAlgs = Array.from(new Set(simplifyLLalgs(repairedAlgs)));
    console.log('unique alg count:', uniqueAlgs.length);

    // make sure applying alg keeps F2L solved
    return findWorkingLLalgs(uniqueAlgs);
  };

  const removeAngleFromAlg = (alg: string): string => {
    const moves = alg.trim().split(/\s+/);
    for (const move in moves) {
      if (move.match(/^[Uy]['2]?$/)) {
        moves.shift();
      } else {
        break;
      }
    }
    return moves.join(' ').trim();
  };

  const normalizeAlgForMatching = (alg: string): string => {
    const validBases = new Set(['U', 'D', 'R', 'L', 'F', 'B', 'u', 'd', 'r', 'l', 'f', 'b', 'M', 'E', 'S', 'x', 'y', 'z']);

    const getAxis = (move: string): string | null => {
      const base = move[0];
      if (!base) return null;
      if ('UDudE'.includes(base)) return 'UD';
      if ('RLrlM'.includes(base)) return 'RL';
      if ('FBfbS'.includes(base)) return 'FB';
      return null; // x, y, z rotations — not commutative
    };

    // convert move to canonical form: M2' → M2, R3 → R', etc.
    const canonicalizeMove = (move: string): string => {
      if (!move) return move;
      const base = move.charAt(0);
      if (!validBases.has(base)) return move;
      let index = 1;
      let amount = 1;
      const digit = move.charAt(index);
      if (digit === '2') {
        amount = 2;
        index += 1;
      } else if (digit === '3') {
        // keep R3 as-is (distinct from R')
        return move;
      }
      if (move.charAt(index) === "'") {
        amount = (4 - amount) % 4;
        index += 1;
      }
      if (index !== move.length) return move; // unparseable, keep as-is
      const normalized = amount % 4;
      if (normalized === 0) return ''; // identity
      if (normalized === 1) return base;
      if (normalized === 2) return `${base}2`;
      return `${base}'`;
    };

    const moves = alg.trim().split(/\s+/).filter(m => m.length > 0);
    const canonicalized = moves.map(canonicalizeMove).filter(m => m.length > 0);

    // sort consecutive same-axis (commuting) groups alphabetically
    const result: string[] = [];
    let i = 0;
    while (i < canonicalized.length) {
      const axis = getAxis(canonicalized[i]);
      if (!axis) {
        result.push(canonicalized[i]);
        i++;
        continue;
      }
      const group: string[] = [];
      while (i < canonicalized.length && getAxis(canonicalized[i]) === axis) {
        group.push(canonicalized[i]);
        i++;
      }
      group.sort();
      result.push(...group);
    }
    return result.join(' ');
  };

  const isPureLefty = (alg: string): boolean => {
    let hasR = false;
    let hasL = false;
    for (const move of alg.trim().split(/\s+/)) {
      const base = move[0];
      if (base === 'R' || base === 'r') hasR = true;
      if (base === 'L' || base === 'l') hasL = true;
    }
    return hasL && !hasR;
  };

  const mirrorToRighty = (alg: string): string => {
    return alg.trim().split(/\s+/).filter(m => m.length > 0)
      .map(move => replacementTable_M[move] ?? move)
      .join(' ');
  };

  const normalizeToRightyForFrequency = (alg: string): { value: string; wasMirrored: boolean } => {
    if (isPureLefty(alg)) {
      return { value: mirrorToRighty(alg), wasMirrored: true };
    }
    return { value: alg, wasMirrored: false };
  };

  const identifyLLalgs = (algs: string[], step: CompilableLLStep): CompiledLLAlg[] => {

    const cubeInterpreter = new SimpleCubeInterpreter();
    const compiledData: CompiledLLAlg[] = [];

    for (const alg of algs) {
      if (!shouldContinue()) {
        break;
      }

      const deangledAlg = removeAngleFromAlg(alg);
      const algInverse = getAlgInverse(deangledAlg);

      const cube = simpleCube.getCubeState(algInverse.split(' '));

      if (!cube) {
        console.error('Failed to get cube state for algorithm:', algInverse);
        continue;
      }

      // Update the cube interpreter with current cube state
      cubeInterpreter.getStepsCompleted(cube);
      console.log('Identifying alg:', alg);
      const { index: caseIndex, refPieceMovement, minMovements } = cubeInterpreter.identifyLLcase(step, alg);

      compiledData.push({
        alg,
        caseIndex,
        refPieceMovement,
        minMovements,
      });
    }

    return compiledData;
  }

  /**
   * Attaches competition frequency data. Only OLL and PLL have frequencies available.
   */
  const addLLfrequencies = (compiledData: CompiledLLAlg[], step: 'oll' | 'pll'): CompiledLLAlg[] => {

    // build normalized frequency lookup for this step only
    const stepFrequencies = step === 'oll' ? ollFrequencies : pllFrequencies;
    type FreqEntry = { frequency: number; originalValue: string; directMatchCount: number; mirroredMatchCount: number };
    const normalizedFreqMap = new Map<string, FreqEntry>();
    stepFrequencies.forEach(f => {
      const key = normalizeAlgForMatching(f.value);
      if (normalizedFreqMap.has(key)) {
        const existing = normalizedFreqMap.get(key)!;
        console.error(`algFrequencies has duplicate normalized entries: "${f.value}" and "${existing.originalValue}" both normalize to "${key}"`);
        throw new Error('Duplicate normalized algFrequency entries');
      }
      normalizedFreqMap.set(key, { frequency: f.frequency, originalValue: f.value, directMatchCount: 0, mirroredMatchCount: 0 });
    });

    const withFrequencies = compiledData.map(compiled => {
      const { value: rightyForFrequency, wasMirrored } = normalizeToRightyForFrequency(compiled.alg);
      const normalizedKey = normalizeAlgForMatching(rightyForFrequency);
      const freqEntry = normalizedFreqMap.get(normalizedKey);
      if (freqEntry) {
        if (wasMirrored) {
          freqEntry.mirroredMatchCount++;
        } else {
          freqEntry.directMatchCount++;
        }
        if (freqEntry.directMatchCount > 1 || freqEntry.mirroredMatchCount > 1) {
          console.error(`algFrequency entry "${freqEntry.originalValue}" matched more than one compiled alg of the same handedness (also matched: "${compiled.alg}")`);
          throw new Error('algFrequency entry matched more than one compiled alg');
        }
      }

      return { ...compiled, frequency: freqEntry?.frequency ?? 0 };
    });

    // validate all frequency entries were matched exactly once
    const unmatchedEntries = [...normalizedFreqMap.values()].filter(e => e.directMatchCount === 0 && e.mirroredMatchCount === 0);
    if (unmatchedEntries.length > 0) {
      console.warn(`${unmatchedEntries.length} ignored! These algFrequency entries were not matched with any compiled alg. This is usually happens due to algFrequencies containing alg variants that represent mistakes, such as "R U U' R'"`);
    }

    return withFrequencies;
  }

  const compileLLalgorithms = (algs: string[], step: CompilableLLStep, label: string = step) => {

    const compiledData = identifyLLalgs(prepareLLAlgs(algs, step, label), step);

    emitCompiledAlgs(step === 'zbll' ? compiledData : addLLfrequencies(compiledData, step), label);
  }

  /**
   * Takes an array of cubing algs, determines the cube hash, then creates a json file and downloads it.
   */
  const compileExactAlgorithms = (algs: ExactAlg[], stepLabel: string) => {

    const cubeInterpreter = new SimpleCubeInterpreter();

    // Array to store compiled algorithm data
    const compiledData: CompiledExactAlg[] = [];
    for (const alg of algs) {
      if (!shouldContinue()) {
        break;
      }

      const completeAlg = alg.value;
      
      // Validate the algorithm - skip processing if invalid
      if (!validateAlg(completeAlg)) {
        continue;
      }
      
      // Start alg green front, white top.
      // Extract leading y moves from complete algorithm for normalization
      const moves = completeAlg.trim().split(/\s+/);
      const leadingYMoves = [];
      
      // Get leading y moves only
      for (const move of moves) {
        if (move.match(/^y['2]?$/)) {
          leadingYMoves.push(move);
        } else if (!move.match(/^U['2]?$/)) {
          // Stop if we hit a non-U, non-y move
          break;
        }
      }

      if (leadingYMoves.length > 1) {
        console.error(`Invalid algorithm pattern detected after cleanup: ${completeAlg}. Too many leading y moves (${leadingYMoves.length}). Skipping.`);
        continue;
      }
      
      const angleNormalization = leadingYMoves.length > 0 ? leadingYMoves[0] + ' ' : '';
      
      const algInverse = angleNormalization + getAlgInverse(completeAlg);
      // console.log(`Processing Alg: ${completeAlg}`);
      
      const cube = simpleCube.getCubeState(algInverse.split(' '));
      
      if (!cube) {
        console.error('Failed to get cube state for algorithm:', algInverse);
        continue;
      }

      // Update the cube interpreter with current cube state
      const steps = cubeInterpreter.getStepsCompleted(cube);

      const isCrossSolved = steps.some(step => step.type === 'cross');
      if (!isCrossSolved) {
        console.error(`Algorithm either does not solve the cross or does nothing: ${completeAlg}. Skipping.`);
        continue;
      }
      const cubeState = cubeInterpreter.getCurrentState();
      const hash = cubeState?.hash || 'unknown';
      const eoValue = cubeInterpreter.getEOvalue();

      // console.log(`Algorithm: ${completeAlg}, Hash: ${hash}`);

      // Add to compiled data
      compiledData.push({
        alg: completeAlg,
        hash: hash,
        eoValue,
      });

    }
    // Create and download JSON file
    emitCompiledAlgs(canonicalizeAufHashes(compiledData), stepLabel);
  };

  /**
   * Emits the compiled algorithms data as JSON
   */
  const emitCompiledAlgs = (data: CompiledExactAlg[] | CompiledLLAlg[], step: string) => {
    if (!shouldContinue()) {
      return;
    }

    // sort by speed estimate (fastest first)
    const speedEstimator = new AlgSpeedEstimator();
    const scores = new Map(data.map(d => [d, speedEstimator.calcScore(d.alg)]));
    data.sort((a, b) => scores.get(a)! - scores.get(b)!);

    const jsonData = {
      timestamp: new Date().toISOString(),
      step,
      totalAlgorithms: data.length,
      algorithms: data
    };

    emit({ kind: 'compiled', label: step, contents: JSON.stringify(jsonData, null, 2) });

    console.log(`Compiled ${data.length} ${step} algorithms`);
  };

  compileSelectedAlgs();
}
