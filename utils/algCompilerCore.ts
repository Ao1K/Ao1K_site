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
import { cube3x3 } from './parser/cube3x3';
import type { Layer3x3, Move3x3, Rotation3x3 } from './parser/cube3x3';
import AlgSpeedEstimator from '../composables/recon/AlgSpeedEstimator';
import type { CompiledLLAlg } from '../composables/recon/LLsuggester';
import type { CompilableLLStep } from '../composables/recon/LLinterpreter';
import { ollFrequencies, pllFrequencies } from './algFrequencies';
import { collapseAufGroups, canonicalizeAufHashes } from './collapseAufVariants';
import { eoAngleOfAlg } from './canonicalizeAuf';

const LL_REPAIR_ROTATIONS: Rotation3x3[] = ['x', "x'", 'x2', 'z', "z'", 'z2'];
const U_ANGLE_MOVES = new Set<Move3x3>(['U', "U'", 'U2']);
const Y_ANGLE_MOVES = new Set<Move3x3>(['y', "y'", 'y2']);
const LL_ANGLE_MOVES = new Set<Move3x3>(['U', "U'", 'U2', "U2'", 'y', "y'", 'y2', "y2'"]);
const SETUP_LAYERS = new Set<Layer3x3>(['y', 'U', 'd']);
const LEFT_SLOT_MOVES = new Set<Move3x3>(['L', "L'", 'L2']);
const RIGHT_SLOT_MOVES = new Set<Move3x3>(['R', "R'", 'R2']);

type ExactAlgMoves = Omit<ExactAlg, 'value'> & { moves: Move3x3[] };

interface CompiledExactAlg {
  moves: Move3x3[];
  hash: string;
  eoValue: number;
}

type CompiledLLAlgMoves = Omit<CompiledLLAlg, 'alg'> & { moves: Move3x3[] };

interface ExpandedExactAlg extends ExactAlgMoves {
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

const parseRawAlg = (text: string): Move3x3[] => {
  const { moves, invalid } = cube3x3.parse(text);
  if (invalid.length > 0) {
    const tokens = invalid.map(token => `"${token}"`).join(', ');
    throw new Error(`Invalid move ${tokens} in alg "${text}"`);
  }
  return moves;
};

const unprimeHalfTurns = (moves: readonly Move3x3[]): Move3x3[] =>
  moves.map(move => cube3x3.amount(move) === -2 ? cube3x3.make(cube3x3.layer(move), 2) : move);

/**
 * Environment-free algorithm compiler. Callers decide what to do with emitted files,
 * so the same pipeline drives both the in-browser tool and the CLI script.
 */
export function compileAlgs({ types, emit, shouldContinue = () => true }: CompileOptions): void {
  const simpleCube = new SimpleCube();
  const selectedAlgTypes = new Set<AlgorithmType>(types);

  const getAllowedAngles = (alg: ExactAlgMoves): Move3x3[][] => {
    if (!alg.add_y) {
      return [[], ['U'], ["U'"], ['U2']];
    }

    if (alg.step === 'f2l') {
      // all combinations of y and U, except any y2
      return [
        [], ['y'], ["y'"], ['U'], ["U'"], ['U2'],
        ['y', 'U'], ['y', "U'"], ['y', 'U2'], ["y'", 'U'], ["y'", "U'"], ["y'", 'U2'],
      ];
    }

    return [
      [], ['y'], ["y'"], ['y2'], ['U'], ["U'"], ['U2'],
      ['y', 'U'], ['y', "U'"], ['y', 'U2'], ["y'", 'U'], ["y'", "U'"], ["y'", 'U2'], ['y2', 'U'], ['y2', "U'"], ['y2', 'U2'],
    ];
  }

  /**
   * Reorders algorithm by flipping U and y moves
   * Example: "U2 y' R U R'" becomes "y' U2 R U R'"
   */
  const reorderAnglingInAlg = (angle: Move3x3[], algMoves: Move3x3[]): Move3x3[] => {
    const combined = [...angle, ...algMoves];
    const firstNonAngle = combined.findIndex(move => !U_ANGLE_MOVES.has(move) && !Y_ANGLE_MOVES.has(move));
    const leading = combined.slice(0, firstNonAngle === -1 ? combined.length : firstNonAngle);

    const reordered: Move3x3[] = [];
    for (let i = 0; i < leading.length; i++) {
      const next = leading[i + 1];
      if (U_ANGLE_MOVES.has(leading[i]) && next !== undefined && Y_ANGLE_MOVES.has(next)) {
        reordered.push(next, leading[i]);
        i++;
      } else {
        reordered.push(leading[i]);
      }
    }

    return [...reordered, ...combined.slice(leading.length)];
  };

  /**
   * Validates that algorithm doesn't have more than 2 leading rotation/AUF moves
   * and not more than 1 of each type (U and y)
   */
  const validateAlg = (moves: Move3x3[]): boolean => {
    const alg = cube3x3.format(moves);
    const firstNonAngle = moves.findIndex(move => !U_ANGLE_MOVES.has(move) && !Y_ANGLE_MOVES.has(move));
    const leadingMoves = moves.slice(0, firstNonAngle === -1 ? moves.length : firstNonAngle);

    // Check if we have more than 2 leading moves
    if (leadingMoves.length > 2) {
      console.error(`Invalid algorithm pattern detected: ${alg}. Too many leading rotation/AUF moves (${leadingMoves.length}). Halting processing.`);
      return false;
    }

    // Check if we have more than 1 of each type
    const uMoves = leadingMoves.filter(move => U_ANGLE_MOVES.has(move));
    const yMoves = leadingMoves.filter(move => Y_ANGLE_MOVES.has(move));

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

  const stripLeadingSetupMoves = (moves: Move3x3[]): Move3x3[] => {
    const firstKept = moves.findIndex(move => !SETUP_LAYERS.has(cube3x3.layer(move)));
    return firstKept === -1 ? [] : moves.slice(firstKept);
  };

  const simplifyExactAlgs = (algs: ExactAlgMoves[]): ExactAlgMoves[] => {
    return algs.map(alg => ({ ...alg, moves: cube3x3.combine(alg.moves) }));
  };

  const simplifyLLalgs = (algs: Move3x3[][]): Move3x3[][] => {
    return algs.map(moves => stripLeadingSetupMoves(cube3x3.combine(moves)));
  };

  const stripTrailingYMoves = (moves: Move3x3[]): Move3x3[] => {
    let end = moves.length;
    while (end > 0 && Y_ANGLE_MOVES.has(moves[end - 1])) {
      end--;
    }
    return moves.slice(0, end);
  };

  const isOneSidedYU = (moves: Move3x3[]): boolean => {
    const layers = [...new Set(moves.map(move => cube3x3.layer(move)))];
    const is_yRU = layers.every(layer => layer === 'y' || layer === 'R' || layer === 'U');
    const is_yLU = layers.every(layer => layer === 'y' || layer === 'L' || layer === 'U');
    // must be just yRU or just yLU
    return is_yRU !== is_yLU;
  };

  const getY2Variant = (moves: Move3x3[]): Move3x3[] => {
    return isOneSidedYU(moves) ? cube3x3.rotate(moves, 'y2') : moves;
  };

  const getMirrorMVariant = (moves: Move3x3[]): Move3x3[] => {
    return isOneSidedYU(moves) ? cube3x3.mirror(moves, 'M') : moves;
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
  const filterInefficientNewF2LAlgs = <T extends ExactAlgMoves>(newAlgs: T[]): T[] => {
    // Slot indices in hash: edge index comes from 0-11, corner from 12-19
    const slotIndices: Partial<Record<Move3x3, { edge: number; corner: number }>> = {
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

    // Opposite-side moves for each ending move
    const oppositeMoves: Partial<Record<Move3x3, ReadonlySet<Move3x3>>> = {
      "R'": LEFT_SLOT_MOVES,  // Right slot algs - look for L moves
      "R": LEFT_SLOT_MOVES,
      "L'": RIGHT_SLOT_MOVES,  // Left slot algs - look for R moves
      "L": RIGHT_SLOT_MOVES,
    };

    const filteredAlgs: T[] = [];

    for (const alg of newAlgs) {
      const moves = alg.moves;
      const algText = cube3x3.format(moves);
      const DEBUG = algText === "";

      if (alg.step !== 'f2l' && alg.step !== 'zbls') {
        filteredAlgs.push(alg);
        console.log(`Keeping non-f2l/zbls alg: "${algText}"`);
        continue;
      }

      // Check if alg ends with an inefficient pattern
      if (inefficientEndings.has(cube3x3.format(moves.slice(-4)))) {
        console.log(`Filtering out alg with inefficient ending: "${algText}"`);
        continue;
      }

      if (moves.length <= 1) {
        continue;
      }

      // Initialize cube with inverse of alg
      const inverseMoves = cube3x3.invert(moves);
      const tempCube = new SimpleCube();
      const tempInterpreter = new SimpleCubeInterpreter();

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
      const opposite = oppositeMoves[lastMove];

      if (DEBUG) console.log(`DEBUG: lastMove=${lastMove}, slot=${JSON.stringify(slot)}, opposite=${opposite && [...opposite]}`);

      if (!slot || !opposite) {
        if (DEBUG) console.log(`DEBUG: No slot or opposite moves, keeping alg`);
        filteredAlgs.push(alg);
        continue;
      }

      // Check if there are any opposite-side moves in the alg
      const hasOppositeMove = moves.some(m => opposite.has(m));
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

      if (DEBUG) console.log(`DEBUG: inverseAlg="${cube3x3.format(inverseMoves)}", initial prevHash="${prevHash}"`);

      // Check if any opposite-side move or starting U move doesn't change the value at slot indices
      let hasUselessMove = false;

      // Determine the index of the first U move (after optional y)
      const movesAfterY = Y_ANGLE_MOVES.has(moves[0]) ? moves.slice(1) : moves;
      const firstUMoveIndex = U_ANGLE_MOVES.has(movesAfterY[0])
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
        if (opposite.has(move)) {
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
        console.log(`Filtering out inefficient F2L alg: "${algText}" - move doesn't change value at slot indices (edge: ${slot.edge}, corner: ${slot.corner})`);
      } else {
        if (DEBUG) console.log(`DEBUG: Keeping alg - no useless moves found`);
        filteredAlgs.push(alg);
      }
    }

    console.log(`Filtered F2L algs: kept ${filteredAlgs.length} out of ${newAlgs.length}`);
    return filteredAlgs;
  };

  const findUniqueNewAlgs = (algs: ExactAlgMoves[], expandedAlgs: ExpandedExactAlg[]) => {

    const newAlgs: ExactAlgMoves[] = [];
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
        const originalText = cube3x3.format(originalAlg.moves);
        const simplifiedText = cube3x3.format(simplifiedAlg.moves);
        if (!originalAlg.new && originalText !== simplifiedText) {
          console.warn(`Algorithm at index ${index} is not in simplified form. Original: "${originalText}", Simplified: "${simplifiedText}"`);
        }
      }

      // add simplified alg to either list depending on if it's new or existing
      if (simplifiedAlg.new) {
        newAlgs.push(simplifiedAlg);
      } else {
        existingAlgs.add(cube3x3.format(unprimeHalfTurns(simplifiedAlg.moves)));
      }
    }

    console.log('new alg size:', newAlgs.length);
    const actuallyNewAlgs = newAlgs.filter(alg => !existingAlgs.has(cube3x3.format(alg.moves)));

    // filter out duplicate algs within new algs
    const uniqueNewAlgSet = new Set<string>();
    const uniqueNewAlgs: ExactAlgMoves[] = [];
    actuallyNewAlgs.forEach(alg => {
      const newAlgKey = cube3x3.format(alg.moves);
      const unprimedNewAlgKey = cube3x3.format(unprimeHalfTurns(alg.moves));

      // verify both that the alg isn't in the uniqueSet
      // and also not in existingAlgs in its cleaned version
      if (!uniqueNewAlgSet.has(newAlgKey) && !existingAlgs.has(unprimedNewAlgKey)) {
        uniqueNewAlgSet.add(newAlgKey);
        uniqueNewAlgs.push(alg);
      }
    });

    console.log('unique new alg size:', uniqueNewAlgs.length);
    return uniqueNewAlgs;
  };

  const preservesF2L = (cubeInterpreter: SimpleCubeInterpreter, moves: Move3x3[]): boolean => {
    const cube = simpleCube.getCubeState(moves);
    const steps: StepInfo[] = cubeInterpreter.getStepsCompleted(cube);
    return steps.filter(step => step.type === 'f2l').length === 4;
  };

  const getSuffixVariants = (move: Move3x3): Move3x3[] => {
    const layer = cube3x3.layer(move);
    const variants = [cube3x3.make(layer, 1), cube3x3.make(layer, 2), cube3x3.make(layer, -1)];
    return variants.filter(variant => cube3x3.turns(variant) !== cube3x3.turns(move));
  };

  /**
   * Attempts to salvage an LL alg that doesn't preserve F2L. First tries a trailing
   * rotation, then a single wrong move suffix, then both together.
   */
  const repairLLalg = (cubeInterpreter: SimpleCubeInterpreter, moves: Move3x3[]): Move3x3[] | null => {
    if (moves.length === 0) return null;

    for (const rotation of LL_REPAIR_ROTATIONS) {
      const candidate = [...moves, rotation];
      if (preservesF2L(cubeInterpreter, candidate)) return candidate;
    }

    for (const rotation of [null, ...LL_REPAIR_ROTATIONS]) {
      for (let i = moves.length - 1; i >= 0; i--) {
        for (const variant of getSuffixVariants(moves[i])) {
          const patched = [...moves];
          patched[i] = variant;
          if (rotation) patched.push(rotation);

          if (preservesF2L(cubeInterpreter, patched)) return patched;
        }
      }
    }

    return null;
  };

  const emitRepairedRawLLalgs = (algs: Move3x3[][], label: string) => {
    const rawAlgs = algs.map(moves => cube3x3.format(moves));
    emit({ kind: 'repairedRaw', label, contents: `${JSON.stringify(rawAlgs, null, 2)}\n` });
  };

  const repairBrokenLLalgs = (algs: Move3x3[][], step: CompilableLLStep, label: string): Move3x3[][] => {
    const cubeInterpreter = new SimpleCubeInterpreter();

    const repairedAlgs: Move3x3[][] = [];
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
        console.log(`Repaired LL alg "${cube3x3.format(alg)}" to "${cube3x3.format(repaired)}"`);
        repairedAlgs.push(repaired);
        repairedCount++;
      } else {
        console.warn(`LL alg "${cube3x3.format(alg)}" does not preserve F2L and could not be repaired.`);
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
  const findWorkingLLalgs = (algs: Move3x3[][]) => {

    const cubeInterpreter = new SimpleCubeInterpreter();

    const usableAlgs: Move3x3[][] = [];
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
  const expandAlgs = (algs: ExactAlgMoves[]) => {
    const expandedAlgs: (ExpandedExactAlg)[] = [];

    algs.forEach((alg, index) => {
      const angles = getAllowedAngles(alg);
      angles.forEach((angle) => {

        // add AUF/rotation and reorder if needed (y moves should go before U moves)
        const completeAlg = reorderAnglingInAlg(angle, alg.moves);

        expandedAlgs.push({
          ...alg,
          moves: completeAlg,
          originalIndex: index,
        } as ExpandedExactAlg);
      });
    });

    algs.forEach((alg) => {
      const y2Variant = stripTrailingYMoves(getY2Variant(alg.moves));
      if (cube3x3.format(y2Variant) !== cube3x3.format(alg.moves)) {
        expandedAlgs.push({
          moves: y2Variant,
          originalIndex: -1, // no need to associate with original index
          step: alg.step,
          new: true,
        } as ExpandedExactAlg);
      }
    });

    algs.forEach((alg) => {
      const mirrorVariant = stripTrailingYMoves(getMirrorMVariant(alg.moves));
      if (cube3x3.format(mirrorVariant) !== cube3x3.format(alg.moves)) {
        expandedAlgs.push({
          moves: mirrorVariant,
          originalIndex: -1, // no need to associate with original index
          step: alg.step,
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
    const algSet = new Set<ExactAlgMoves>();
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

  const emitUniqueNewAlgs = (algs: ExactAlgMoves[], label: string) => {
    if (algs.length === 0) return;

    const collapsedAlgs = collapseAufGroups(algs.map(alg => ({ moves: alg.moves, step: alg.step })));

    const rawAlgs = collapsedAlgs.map(alg => ({
      new: false,
      value: cube3x3.format(alg.moves),
      step: alg.step,
      add_y: false,
    }));

    const prettyJson = '[\n  ' + rawAlgs.map(alg => JSON.stringify(alg).replaceAll(',',', ')).join(',\n  ') + '\n]';
    emit({ kind: 'newAlgs', label, contents: prettyJson });
  };

  const prepareExactAlgs = (rawAlgs: ExactAlg[], downloadLabel: string): ExactAlgMoves[] => {

    console.log(`Preparing Exact algorithms... Total algs: ${rawAlgs.length}`);

    const algs: ExactAlgMoves[] = rawAlgs.map(({ value, ...rest }) => ({ ...rest, moves: parseRawAlg(value) }));

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

  const prepareLLAlgs = (algs: Move3x3[][], step: CompilableLLStep, label: string): Move3x3[][] => {

    console.log(`Preparing LastLayer algorithms... Total algs: ${algs.length}`);

    const repairedAlgs = repairBrokenLLalgs(algs, step, label);

    const algsByKey = new Map(simplifyLLalgs(repairedAlgs).map(moves => [cube3x3.format(moves), moves]));
    const uniqueAlgs = [...algsByKey.values()];
    console.log('unique alg count:', uniqueAlgs.length);

    // make sure applying alg keeps F2L solved
    return findWorkingLLalgs(uniqueAlgs);
  };

  const removeAngleFromAlg = (moves: Move3x3[]): Move3x3[] => {
    const firstNonAngleMove = moves.findIndex((move) => !LL_ANGLE_MOVES.has(move));
    return firstNonAngleMove === -1 ? [] : moves.slice(firstNonAngleMove);
  };

  const normalizeAlgForMatching = (moves: Move3x3[]): string => {
    const commutingAxisOf = (move: Move3x3) => cube3x3.isRotation(move) ? null : cube3x3.geometry(move).axis;

    // convert move to canonical form: M2' → M2. R3 stays distinct from R'
    const canonicalized = unprimeHalfTurns(moves);

    // sort consecutive same-axis (commuting) groups alphabetically
    const result: Move3x3[] = [];
    let i = 0;
    while (i < canonicalized.length) {
      const axis = commutingAxisOf(canonicalized[i]);
      if (!axis) {
        result.push(canonicalized[i]);
        i++;
        continue;
      }
      const group: Move3x3[] = [];
      while (i < canonicalized.length && commutingAxisOf(canonicalized[i]) === axis) {
        group.push(canonicalized[i]);
        i++;
      }
      group.sort();
      result.push(...group);
    }
    return cube3x3.format(result);
  };

  const isPureLefty = (moves: Move3x3[]): boolean => {
    const layers = moves.map(move => cube3x3.layer(move));
    const hasR = layers.some(layer => layer === 'R' || layer === 'r');
    const hasL = layers.some(layer => layer === 'L' || layer === 'l');
    return hasL && !hasR;
  };

  const normalizeToRightyForFrequency = (moves: Move3x3[]): { moves: Move3x3[]; wasMirrored: boolean } => {
    if (isPureLefty(moves)) {
      return { moves: cube3x3.mirror(moves, 'M'), wasMirrored: true };
    }
    return { moves, wasMirrored: false };
  };

  const identifyLLalgs = (algs: Move3x3[][], step: CompilableLLStep): CompiledLLAlgMoves[] => {

    const cubeInterpreter = new SimpleCubeInterpreter();
    const compiledData: CompiledLLAlgMoves[] = [];

    for (const moves of algs) {
      if (!shouldContinue()) {
        break;
      }

      const algInverse = cube3x3.invert(removeAngleFromAlg(moves));

      const cube = simpleCube.getCubeState(algInverse);

      if (!cube) {
        console.error('Failed to get cube state for algorithm:', cube3x3.format(algInverse));
        continue;
      }

      const alg = cube3x3.format(moves);

      // Update the cube interpreter with current cube state
      cubeInterpreter.getStepsCompleted(cube);
      console.log('Identifying alg:', alg);
      const { index: caseIndex, refPieceMovement, minMovements } = cubeInterpreter.identifyLLcase(step, alg);

      compiledData.push({
        moves,
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
  const addLLfrequencies = (compiledData: CompiledLLAlgMoves[], step: 'oll' | 'pll'): CompiledLLAlgMoves[] => {

    // build normalized frequency lookup for this step only
    const stepFrequencies = step === 'oll' ? ollFrequencies : pllFrequencies;
    type FreqEntry = { frequency: number; originalValue: string; directMatchCount: number; mirroredMatchCount: number };
    const normalizedFreqMap = new Map<string, FreqEntry>();
    stepFrequencies.forEach(f => {
      const key = normalizeAlgForMatching(parseRawAlg(f.value));
      if (normalizedFreqMap.has(key)) {
        const existing = normalizedFreqMap.get(key)!;
        console.error(`algFrequencies has duplicate normalized entries: "${f.value}" and "${existing.originalValue}" both normalize to "${key}"`);
        throw new Error('Duplicate normalized algFrequency entries');
      }
      normalizedFreqMap.set(key, { frequency: f.frequency, originalValue: f.value, directMatchCount: 0, mirroredMatchCount: 0 });
    });

    const withFrequencies = compiledData.map(compiled => {
      const { moves: rightyForFrequency, wasMirrored } = normalizeToRightyForFrequency(compiled.moves);
      const normalizedKey = normalizeAlgForMatching(rightyForFrequency);
      const freqEntry = normalizedFreqMap.get(normalizedKey);
      if (freqEntry) {
        if (wasMirrored) {
          freqEntry.mirroredMatchCount++;
        } else {
          freqEntry.directMatchCount++;
        }
        if (freqEntry.directMatchCount > 1 || freqEntry.mirroredMatchCount > 1) {
          console.error(`algFrequency entry "${freqEntry.originalValue}" matched more than one compiled alg of the same handedness (also matched: "${cube3x3.format(compiled.moves)}")`);
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

  const compileLLalgorithms = (rawAlgs: string[], step: CompilableLLStep, label: string = step) => {

    const algs = rawAlgs.map(alg => parseRawAlg(alg));
    const compiledData = identifyLLalgs(prepareLLAlgs(algs, step, label), step);

    emitCompiledAlgs(step === 'zbll' ? compiledData : addLLfrequencies(compiledData, step), label);
  }

  /**
   * Takes an array of cubing algs, determines the cube hash, then creates a json file and downloads it.
   */
  const compileExactAlgorithms = (algs: ExactAlgMoves[], stepLabel: string) => {

    const cubeInterpreter = new SimpleCubeInterpreter();

    // Array to store compiled algorithm data
    const compiledData: CompiledExactAlg[] = [];
    for (const alg of algs) {
      if (!shouldContinue()) {
        break;
      }

      const completeAlg = alg.moves;

      // Validate the algorithm - skip processing if invalid
      if (!validateAlg(completeAlg)) {
        continue;
      }

      // Start alg green front, white top.
      // Extract leading y moves from complete algorithm for normalization
      const leadingYMoves: Move3x3[] = [];

      // Get leading y moves only
      for (const move of completeAlg) {
        if (Y_ANGLE_MOVES.has(move)) {
          leadingYMoves.push(move);
        } else if (!U_ANGLE_MOVES.has(move)) {
          // Stop if we hit a non-U, non-y move
          break;
        }
      }

      if (leadingYMoves.length > 1) {
        console.error(`Invalid algorithm pattern detected after cleanup: ${cube3x3.format(completeAlg)}. Too many leading y moves (${leadingYMoves.length}). Skipping.`);
        continue;
      }

      const algInverse = [...leadingYMoves, ...cube3x3.invert(completeAlg)];

      const cube = simpleCube.getCubeState(algInverse);

      if (!cube) {
        console.error('Failed to get cube state for algorithm:', cube3x3.format(algInverse));
        continue;
      }

      // Update the cube interpreter with current cube state
      const steps = cubeInterpreter.getStepsCompleted(cube);

      const isCrossSolved = steps.some(step => step.type === 'cross');
      if (!isCrossSolved) {
        console.error(`Algorithm either does not solve the cross or does nothing: ${cube3x3.format(completeAlg)}. Skipping.`);
        continue;
      }
      const cubeState = cubeInterpreter.getCurrentState();
      const hash = cubeState?.hash || 'unknown';
      const eoValue = cubeInterpreter.getEOvalue(eoAngleOfAlg(completeAlg));

      // Add to compiled data
      compiledData.push({
        moves: completeAlg,
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
  const emitCompiledAlgs = <T extends { moves: Move3x3[] }>(data: T[], step: string) => {
    if (!shouldContinue()) {
      return;
    }

    // sort by speed estimate (fastest first)
    const speedEstimator = new AlgSpeedEstimator();
    const scores = new Map(data.map(d => [d, speedEstimator.calcScore(d.moves)]));
    data.sort((a, b) => scores.get(a)! - scores.get(b)!);

    const jsonData = {
      timestamp: new Date().toISOString(),
      step,
      totalAlgorithms: data.length,
      algorithms: data.map(({ moves, ...rest }) => ({ alg: cube3x3.format(moves), ...rest })),
    };

    emit({ kind: 'compiled', label: step, contents: JSON.stringify(jsonData, null, 2) });

    console.log(`Compiled ${data.length} ${step} algorithms`);
  };

  compileSelectedAlgs();
}
