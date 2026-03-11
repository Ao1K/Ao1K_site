import React, { useRef, useState } from 'react';
import { rawGeneric, rawOLLalgs, rawPLLalgs } from "./rawAlgs";
import type { ExactAlg, LastLayerAlg } from "./rawAlgs";
import { SimpleCubeInterpreter, type StepInfo } from "../composables/recon/SimpleCubeInterpreter";
import { SimpleCube } from '../composables/recon/SimpleCube';
import { reverseMove, replacementTable_Y } from '../composables/recon/transformHTML';
import AlgSpeedEstimator from '../composables/recon/AlgSpeedEstimator';
import type { CompiledLLAlg } from '../composables/recon/LLsuggester';

interface CompiledExactAlg {
  alg: string;
  hash: string;
  eoValue: number;
  step?: string;
}

interface ExpandedExactAlg extends ExactAlg {
  originalIndex: number;
}

interface AlgCompilerProps {
  algs?: ExactAlg[];
}

/**
 * React component for compiling algorithms and rendering a TwistyPlayer
 */
type AlgorithmType = 'exact' | 'oll' | 'pll';

export const AlgCompiler: React.FC<AlgCompilerProps> = () => {
  const simpleCubeRef = useRef<SimpleCube>(new SimpleCube());
  const isCompilingRef = useRef(false);

  const [isCompiling, setIsCompiling] = useState(false);
  const [selectedAlgTypes, setSelectedAlgTypes] = useState<Set<AlgorithmType>>(new Set(['exact', 'oll', 'pll']));


  const handleAlgTypeToggle = (algType: AlgorithmType) => {
    setSelectedAlgTypes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(algType)) {
        newSet.delete(algType);
      } else {
        newSet.add(algType);
      }
      return newSet;
    });
  };

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
    
    // Use regex to find U move followed by y move and flip them
    const reordered = combined.replace(/(U'?2?)\s+(y'?2?)/g, '$2 $1');
    
    return reordered.trim();
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
    if (selectedAlgTypes.has('exact')) {
      compileAlgorithms(rawGeneric, 'Exact');
    }
    if (selectedAlgTypes.has('oll')) {
      compileAlgorithms(rawOLLalgs, 'LastLayer');
    }
    if (selectedAlgTypes.has('pll')) {
      compileAlgorithms(rawPLLalgs, 'LastLayer');
    }
  };

  /**
   * For each alg, check for moves that cancel out or combine (ex1: U U' = '', ex2: U U = U2).
   * If alg-type = LastLayer, also remove leading y, U, and d moves.
   */
  const simplifyAlgs = (algs: ExactAlg[] | LastLayerAlg[], algType: 'Exact' | 'LastLayer') => {
    const validBases = new Set(['U', 'D', 'R', 'L', 'F', 'B', 'u', 'd', 'r', 'l', 'f', 'b', 'M', 'E', 'S', 'x', 'y', 'z']);

    const formatMove = (base: string, amount: number) => {
      const normalized = amount % 4;

      if (normalized === 0) {
        return '';
      }

      if (normalized === 1) {
        return base;
      }

      if (normalized === 2) {
        return `${base}2`;
      }

      return `${base}'`;
    };

    const parseMove = (move: string) => {
      if (!move) {
        return null;
      }

      const base = move.charAt(0);
      if (!validBases.has(base)) {
        return null;
      }

      let index = 1;
      let amount = 1;

      const digit = move.charAt(index);
      if (digit === '2' || digit === '3') {
        amount = Number(digit);
        index += 1;
      }

      if (move.charAt(index) === "'") {
        amount = (4 - amount) % 4;
        index += 1;
      }

      if (index !== move.length) {
        return null;
      }

      const normalized = amount % 4;
      if (normalized === 0) {
        return null;
      }

      return { base, amount: normalized } as const;
    };

    type ParsedMove = ReturnType<typeof parseMove>;

    const combineMoves = (moves: string[]) => {
      const stack: { move: string; parsed: ParsedMove }[] = [];

      for (const move of moves) {
        const parsed = parseMove(move);

        if (!parsed) {
          if (move) {
            stack.push({ move, parsed: null });
          }

          continue;
        }

        const last = stack[stack.length - 1];
        const lastParsed = last?.parsed;

        if (lastParsed && lastParsed.base === parsed.base) {
          const total = (lastParsed.amount + parsed.amount) % 4;

          if (total === 0) {
            stack.pop();
          } else {
            stack[stack.length - 1] = {
              move: formatMove(lastParsed.base, total),
              parsed: { base: lastParsed.base, amount: total },
            };
          }
        } else {
          // keep original notation when no merge occurs so single moves like R3 stay intact
          stack.push({
            move,
            parsed: { base: parsed.base, amount: parsed.amount },
          });
        }
      }

      return stack.map(entry => entry.move);
    };

    const stripLeadingSetupMoves = (moves: string[]) => {
      if (algType !== 'LastLayer') {
        return moves;
      }

      const result = [...moves];

      while (result.length > 0) {
        const parsed = parseMove(result[0]);

        if (!parsed) {
          break;
        }

        if (parsed.base === 'y' || parsed.base === 'U' || parsed.base === 'd') {
          result.shift();
          continue;
        }

        break;
      }

      return result;
    };

    const simplifiedAlgs: (ExactAlg | LastLayerAlg)[] = algs.map((alg) => {
      let current = (alg.value ?? '').trim().replace(/\s+/g, ' ').split(' ')
      let previous: string[] = [];

      while (current.length !== previous.length) {
        previous = [...current];

        const combined = combineMoves(current);
        
        current = combined.filter(move => move !== '');
      }

      // only for last layer algs, strip leading y, U, d moves
      const withoutSetup = stripLeadingSetupMoves(current).join(' ');
      
      return {
        ...alg,
        value: withoutSetup,
      };
    });

    return simplifiedAlgs;
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

      if (alg.step !== 'f2l') {
        filteredAlgs.push(alg);
        console.log(`Keeping non-F2L alg: "${alg.value}"`);
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
        // No opposite-side moves, keep the alg
        if (DEBUG) console.log(`DEBUG: No opposite moves, keeping alg`);
        filteredAlgs.push(alg);
        continue;
      }

      // Initialize cube with inverse of alg
      const inverseAlg = getAlgInverse(alg.value);
      const tempCube = new SimpleCube();
      const tempInterpreter = new SimpleCubeInterpreter();

      const inverseMoves = inverseAlg.split(' ').filter(m => m.length > 0);
      let cubeState = tempCube.getCubeState(inverseMoves);
      tempInterpreter.getStepsCompleted(cubeState);
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

  const findUniqueNewAlgs = (algType: 'Exact' | 'LastLayer', algs: (ExactAlg | LastLayerAlg)[], expandedAlgs: (ExpandedExactAlg | LastLayerAlg)[]) => {

    const newAlgs: (ExactAlg | LastLayerAlg)[] = [];
    const existingAlgs = new Set<string>();
    for (let i = 0; i < expandedAlgs.length; i++) {

      const index = algType === 'Exact' ? (expandedAlgs[i] as ExpandedExactAlg).originalIndex : i;
      const originalAlg = index === -1 ? null : algs[index];
      const simplifiedAlg = expandedAlgs[i];

      // warn if old alg is not in its most simplified form
      if (originalAlg && !originalAlg.new && originalAlg.value !== simplifiedAlg.value) {
        console.warn(`Algorithm at index ${index} is not in simplified form. Original: "${originalAlg.value}", Simplified: "${simplifiedAlg.value}"`);
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
    const uniqueNewAlgs: (ExactAlg | LastLayerAlg)[] = [];
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

  /**
   * Find algs that preserve F2L. For PLL, doesn't check if OLL is solved. Only checks F2L.
   */
  const findWorkingLLalgs = (algs: LastLayerAlg[]) => {

    const cubeInterpreter = new SimpleCubeInterpreter();

    const usableAlgs: LastLayerAlg[] = [];
    console.log(`Filtering ${algs.length} LL algs for F2L-preserving ones...`);
    for (const alg of algs) {
      
      if (!isCompilingRef.current) {
        break;
      }

      const inverseAlg = getAlgInverse(alg.value);
      const cube = simpleCubeRef.current!.getCubeState(inverseAlg.split(' '));
      const steps: StepInfo[] = cubeInterpreter.getStepsCompleted(cube);
      const f2lPairsSolved: number = steps.filter(step => step.type === 'f2l').length;
      if (f2lPairsSolved === 4) {
        usableAlgs.push(alg);
      } else {
        console.warn(`LL alg "${alg.value}" does not preserve F2L. Final new usable alg list will not include this alg.`);
      }
    };

    console.log(`Filtered usable LL algs: ${usableAlgs.length} out of ${algs.length}`);
    return usableAlgs;
  }

  /**
   * If the algs are Exact, create the full list of algs based on all allowed angles.
   * If the algs are LastLayer, just return the original list.
   */
  const expandAlgs = (algs: (ExactAlg | LastLayerAlg)[], algType: 'Exact' | 'LastLayer') => {
    const expandedAlgs: (ExpandedExactAlg)[] = [];
    if (algType === 'LastLayer') {
      return algs as LastLayerAlg[];
    }
    

    algs.forEach((alg, index) => {
      const angles = getAllowedAngles(alg as ExactAlg);
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

    algs.forEach((alg, index) => {
      const y2Variant = getY2Variant(alg.value);
      if (y2Variant !== alg.value) {
        expandedAlgs.push({
          value: y2Variant,
          originalIndex: -1, // no need to associate with original index
          step: alg.step,
          name: (alg as ExactAlg).name ?? "",
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

  const findUniqueOldAlgSet = (algType: 'Exact' | 'LastLayer', expandedAlgs: (ExpandedExactAlg | LastLayerAlg)[]) => {
    const algSet = new Set<ExactAlg | LastLayerAlg>();
    expandedAlgs.forEach((alg, index) => {
      // Don't include new variants in the base set
      if (alg.new) return;

      if (algSet.has(alg)) {
        const i = algType === 'Exact' ? (alg as ExpandedExactAlg).originalIndex : index;
        console.warn(`Duplicate algorithm detected in rawAlgs.tsx at index ${i}`);
        console.log({...alg});
      }
      algSet.add(alg);
    });
    return algSet;
  }

  const downloadUniqueNewAlgs = (algType: 'Exact' | 'LastLayer', algs: (ExactAlg | LastLayerAlg)[]) => {
    if (algs.length === 0) return;

    algs = algs.map(alg => {
      if (algType === 'Exact') {
        alg = {
          new: false,
          value: alg.value,
          step: alg.step,
          name: (alg as ExactAlg).name ?? "",
          add_y: false, // algs were already expanded with all allowed angles
          add_U: false, // algs were already expanded with all allowed angles
        }
      } else {
        alg = {
          new: false,
          value: alg.value,
          step: alg.step,
        }
      };
      return alg;
    });


    const prettyJson = '[\n  ' + algs.map(alg => JSON.stringify(alg).replaceAll(',',', ').replace(/"(\w+)":/g, '$1: ')).join(',\n  ') + '\n]';
    const blob = new Blob([prettyJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `new_${algType.toString().toLowerCase()}_algs.tsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const compileAlgorithms = (algs: ExactAlg[] | LastLayerAlg[], algType: 'Exact' | 'LastLayer') => {

    console.log(`Compiling ${algType} algorithms... Total algs: ${algs.length}`);

    const simplifiedAlgs: (ExactAlg | LastLayerAlg)[] = simplifyAlgs(algs, algType);

    let expandedAlgs: (ExpandedExactAlg | LastLayerAlg)[] = expandAlgs(simplifiedAlgs, algType);

    // Filter inefficient new F2L algs AFTER expansion (U moves are added during expansion)
    if (algType === 'Exact') {
      const newAlgs: ExpandedExactAlg[] = [];
      const oldAlgs: (ExpandedExactAlg | LastLayerAlg)[] = [];
      expandedAlgs.forEach(alg => {
        if (alg.new) {
          newAlgs.push(alg as ExpandedExactAlg);
        } else {
          oldAlgs.push(alg);
        }
      });
      const filteredNewAlgs = filterInefficientNewF2LAlgs(newAlgs);
      expandedAlgs = [...oldAlgs, ...filteredNewAlgs];
    }

    // parse out duplicates in algs without `new: true`
    const algSet = findUniqueOldAlgSet(algType, expandedAlgs);
    console.log('alg set size before adding new algs:', algSet.size);

    const uniqueNewAlgs = findUniqueNewAlgs(algType, algs, expandedAlgs);

    if (uniqueNewAlgs.length > 0) {
      console.log('Replace new algs with this list');

      downloadUniqueNewAlgs(algType, uniqueNewAlgs);
    }

    // for LL algs, make sure applying alg in reverse keeps F2L solved.
    let usableNewAlgs: LastLayerAlg[] | ExactAlg[] = uniqueNewAlgs;
    if (algType === 'LastLayer' && uniqueNewAlgs.length !== 0) {
      usableNewAlgs = findWorkingLLalgs(uniqueNewAlgs as LastLayerAlg[]) ?? uniqueNewAlgs;
      console.log('Usable new algs. Update rawAlgs.tsx accordingly:');
      console.log(usableNewAlgs);
    }

    // add new algs to expandedAlgs for final processing
    const allAlgs: ExactAlg[] | LastLayerAlg[] = Array.from(algSet)
    if (typeof usableNewAlgs !== typeof allAlgs) {
      console.error('Type mismatch between usableNewAlgs and allAlgs');;
      return;
    }
    console.log('Usable new algs count:', usableNewAlgs.length);
    console.log('Existing algs count:', allAlgs.length);
    allAlgs.push(...usableNewAlgs);

    switch (algType) {
      case 'Exact':
        compileExactAlgorithms(allAlgs as ExactAlg[]);
        break;
      case 'LastLayer':
        compileLLalgorithms(allAlgs as LastLayerAlg[]);
        break;
      default:
        console.error(`Unknown algorithm type: ${algType}`);
    }
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

  const compileLLalgorithms = (algs: LastLayerAlg[]) => {

    const cubeInterpreter = new SimpleCubeInterpreter();

    // Array to store compiled algorithm data
    const compiledData: CompiledLLAlg[] = [];

    for (const alg of algs) {
      if (!isCompilingRef.current) {
        break;
      }

      const deangledAlg = removeAngleFromAlg(alg.value);
      const algInverse = getAlgInverse(deangledAlg);

      const cube = simpleCubeRef.current.getCubeState(algInverse.split(' '));
      
      if (!cube) {
        console.error('Failed to get cube state for algorithm:', algInverse);
        continue;
      }

      // Update the cube interpreter with current cube state
      cubeInterpreter.getStepsCompleted(cube);
      console.log('Identifying alg:', alg.value);
      const { index: caseIndex, refPieceMovement, minMovements } = cubeInterpreter.identifyLLcase(alg.step, alg.value);
      compiledData.push({
        alg: alg.value,
        caseIndex,
        refPieceMovement,
        minMovements
      });
    }
    const step = algs[0]!.step;
    downloadCompiledAlgs(compiledData, step);

  }

  /**
   * Takes an array of cubing algs, determines the cube hash, then creates a json file and downloads it.
   */
  const compileExactAlgorithms = (algs: ExactAlg[]) => {

    const cubeInterpreter = new SimpleCubeInterpreter();

    // Array to store compiled algorithm data
    const compiledData: CompiledExactAlg[] = [];
    for (const alg of algs) {
      if (Math.random() < 0.0) {
        break;
      }
      if (!isCompilingRef.current) {
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
        console.error(`Invalid algorithm pattern detected after cleanup: ${completeAlg}. Too many leading y moves (${leadingYMoves.length}). Halting processing.`);
        continue;
      }
      
      const angleNormalization = leadingYMoves.length > 0 ? leadingYMoves[0] + ' ' : '';
      
      const algInverse = angleNormalization + getAlgInverse(completeAlg);
      // console.log(`Processing Alg: ${completeAlg}`);
      
      const cube = simpleCubeRef.current.getCubeState(algInverse.split(' '));
      
      if (!cube) {
        console.error('Failed to get cube state for algorithm:', algInverse);
        continue;
      }

      // Update the cube interpreter with current cube state
      const steps = cubeInterpreter.getStepsCompleted(cube);

      const isCrossSolved = steps.some(step => step.type === 'cross');
      if (!isCrossSolved) {
        console.warn(`Algorithm does not solve the cross: ${completeAlg}.`);
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
        step: alg.step || '',
      });

    }
    // Create and download JSON file
    downloadCompiledAlgs(compiledData, 'exact');
  };

  /**
   * Downloads the compiled algorithms data as a JSON file
   */
  const downloadCompiledAlgs = (data: CompiledExactAlg[] | CompiledLLAlg[], step: string) => {
    if (!isCompilingRef.current) {
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

    const jsonString = JSON.stringify(jsonData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // Create download link and trigger download
    const link = document.createElement('a');
    link.href = url;
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').split('.')[0];
    link.download = `compiled-algs-${step}-${timestamp}.json`;
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    console.log(`Downloaded ${data.length} compiled algorithms as JSON file`);
  };

  const handleToggleCompile = () => {
    if (isCompilingRef.current) {
      isCompilingRef.current = false;
      setIsCompiling(false);
      return;
    }

    isCompilingRef.current = true;
    setIsCompiling(true);
    handleCompileAlgorithms();
  };

  const handleCompileAlgorithms = () => {
    if (selectedAlgTypes.size === 0) {
      alert('Please select at least one algorithm type to compile.');
      isCompilingRef.current = false;
      setIsCompiling(false);
      return;
    }

    try {
      compileSelectedAlgs();
    } catch (error) {
      console.error('Error compiling algorithms:', error);
    } finally {
      isCompilingRef.current = false;
      setIsCompiling(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 text-primary-100">
      
      {/* Algorithm Type Selection */}
      <div className="flex flex-col">
        <h3 className="text-lg font-semibold">Select Algorithm Types to Compile:</h3>
        <div className="flex space-x-10">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={selectedAlgTypes.has('exact')}
              onChange={() => handleAlgTypeToggle('exact')}
              className="w-4 h-4"
            />
            <span>Exact (F2L)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedAlgTypes.has('oll')}
              onChange={() => handleAlgTypeToggle('oll')}
              className="w-4 h-4"
            />
            <span>OLL</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedAlgTypes.has('pll')}
              onChange={() => handleAlgTypeToggle('pll')}
              className="w-4 h-4"
            />
            <span>PLL</span>
          </label>
        </div>
      </div>

      <div className="flex gap-2 items-center">
        <button 
          onClick={handleToggleCompile}
          disabled={selectedAlgTypes.size === 0}
          className={`p-3 rounded-sm border border-primary-100 hover:border-primary-500 ${
            selectedAlgTypes.size === 0
              ? 'bg-gray-500 cursor-not-allowed' 
              : 'bg-black hover:bg-gray-800'
          }`}
        >
          {isCompiling ? 'Compiling. Click to Cancel.' : `Compile Selected Algs (${selectedAlgTypes.size} type${selectedAlgTypes.size > 1 ? 's' : ''})`}
        </button>
        {selectedAlgTypes.size === 0 && (
          <span className="">Select at least one algorithm type</span>
        )}
      </div>
    </div>
  );
};