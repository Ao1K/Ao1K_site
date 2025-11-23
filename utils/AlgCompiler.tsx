import React, { useRef, useState } from 'react';
import { rawGeneric, rawOLLalgs, rawPLLalgs } from "./rawAlgs";
import type { ExactAlg, LastLayerAlg } from "./rawAlgs";
import { CubeInterpreter } from "../composables/recon/CubeInterpreter";
import type { StepInfo } from "../composables/recon/CubeInterpreter";
import { reverseMove } from '../composables/recon/transformHTML';
import HiddenPlayer, { HiddenPlayerHandle } from '../components/recon/HiddenPlayer';
import type { CompiledLLAlg } from '../composables/recon/LLsuggester';

interface CompiledExactAlg {
  alg: string;
  hash: string;
  step?: string;
}

interface AlgCompilerProps {
  algs?: ExactAlg[];
}

/**
 * React component for compiling algorithms and rendering a TwistyPlayer
 */
type AlgorithmType = 'exact' | 'oll' | 'pll';

export const AlgCompiler: React.FC<AlgCompilerProps> = () => {
  const hiddenPlayerRef = useRef<HiddenPlayerHandle>(null);
  const isCompilingRef = useRef(false);

  const [isCompiling, setIsCompiling] = useState(false);
  const [cubeLoaded, setCubeLoaded] = useState(false);
  const [selectedAlgTypes, setSelectedAlgTypes] = useState<Set<AlgorithmType>>(new Set(['exact', 'oll', 'pll']));

  // HiddenPlayer callbacks
  const handleCubeLoaded = () => {
    setCubeLoaded(true);
    console.log('Cube loaded for compiler');
  };

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

  const findAnimationLengths = (moves: string[]): number[] => {
    let moveAnimationTimes: number[] = [];
    const singleTime = 1000;
    const doubleTime = 1500;
    const tripleTime = 2000;

    if (!moves || moves.length === 0) {
      return [0]; // no moves, return 0
    }

    moves.forEach((move) => {
      if (move.includes('2')) {
        moveAnimationTimes.push(doubleTime);
      } else if (move.includes('3')) {
        moveAnimationTimes.push(tripleTime);
      } else {
        moveAnimationTimes.push(singleTime);
      }
    });

    return moveAnimationTimes;
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

  const compileSelectedAlgs = async () => {
    if (selectedAlgTypes.has('exact')) {
      await compileAlgorithms(rawGeneric, 'Exact');
    }
    if (selectedAlgTypes.has('oll')) {
      await compileAlgorithms(rawOLLalgs, 'LastLayer');
    }
    if (selectedAlgTypes.has('pll')) {
      await compileAlgorithms(rawPLLalgs, 'LastLayer');
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

  const findUniqueNewAlgs = (algs: (ExactAlg | LastLayerAlg)[], simplifiedAlgs: (ExactAlg | LastLayerAlg)[]) => {
    const newAlgs: (ExactAlg | LastLayerAlg)[] = [];
    const existingAlgs = new Set<string>();
    
    for (let i = 0; i < simplifiedAlgs.length; i++) {
      const originalAlg = algs[i];
      const simplifiedAlg = simplifiedAlgs[i];
      
      // warn if non-new alg is not in its most simplified form
      if (!originalAlg.new && originalAlg.value !== simplifiedAlg.value) {
        console.warn(`Algorithm at index ${i} is not in simplified form. Original: "${originalAlg.value}", Simplified: "${simplifiedAlg.value}"`);
      }
      
      if (simplifiedAlg.new) {
        newAlgs.push(simplifiedAlg);
      } else {
        existingAlgs.add(simplifiedAlg.value);
      }
    }

    const actuallyNewAlgs = newAlgs.filter(alg => !existingAlgs.has(alg.value));

    const uniqueNewAlgSet = new Set<string>();
    const uniqueNewAlgs: (ExactAlg | LastLayerAlg)[] = [];
    actuallyNewAlgs.forEach(alg => {
      if (!uniqueNewAlgSet.has(alg.value)) {
        uniqueNewAlgSet.add(alg.value);
        uniqueNewAlgs.push(alg);
      }
    });
    
    return uniqueNewAlgs;
  };

  /**
   * Find algs that preserve F2L. For PLL, doesn't check if OLL is solved. Only checks F2L.
   */
  const findWorkingLLalgs = async (algs: LastLayerAlg[]) => {
    if (!cubeLoaded || !hiddenPlayerRef.current) {
      console.error('Cube not loaded yet. Please wait for the cube to load before compiling.');
      return;
    }

    // Get initial cube state
    const initialCube = await hiddenPlayerRef.current.updateCube('', '', []);
    if (!initialCube) {
      console.error('Failed to get initial cube state');
      return;
    }

    const cubeInterpreter = new CubeInterpreter(initialCube);

    // Add a small delay to ensure cube is fully initialized
    await new Promise(resolve => setTimeout(resolve, 100));

    const matrixMaps = cubeInterpreter.solvedMatrixMaps;
    if (!matrixMaps || matrixMaps.size === 0) {
      console.error('CubeInterpreter solvedMatrixMaps is not available. Cannot proceed with compilation.');
      return;
    }

    const usableAlgs: LastLayerAlg[] = [];
    console.log(`Filtering ${algs.length} LL algs for F2L-preserving ones...`);
    for (const alg of algs) {
      
      if (!isCompilingRef.current) {
        break;
      }

      const inverseAlg = getAlgInverse(alg.value);
      const cube = await hiddenPlayerRef.current!.updateCube('', inverseAlg, findAnimationLengths(inverseAlg.split(' ')));
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

  const compileAlgorithms = async (algs: ExactAlg[] | LastLayerAlg[], algType: 'Exact' | 'LastLayer') => {
    if (!cubeLoaded || !hiddenPlayerRef.current) {
      console.error('Cube not loaded yet. Please wait for the cube to load before compiling.');
      return;
    }
    

    const simplifiedAlgs: (ExactAlg | LastLayerAlg)[] = simplifyAlgs(algs, algType);

    const algSet = new Set<string>();
    simplifiedAlgs.forEach((alg, index) => {
      if (algSet.has(alg.value) && alg.new !== true) {
        console.warn(`Duplicate algorithm detected in rawAlgs.tsx at index ${index}`);
        console.log({...alg});
      }
      algSet.add(alg.value);
    });

    const uniqueNewAlgs = findUniqueNewAlgs(algs, simplifiedAlgs);
    console.log('Unique new algs:');
    console.log(uniqueNewAlgs);

    // for LL algs, make sure applying alg in reverse keeps F2L solved.
    let usableNewAlgs: LastLayerAlg[] | ExactAlg[] = uniqueNewAlgs;
    if (algType === 'LastLayer' && uniqueNewAlgs.length !== 0) {
      usableNewAlgs = await findWorkingLLalgs(uniqueNewAlgs as LastLayerAlg[]) ?? uniqueNewAlgs;
      console.log('Usable new algs. Update rawAlgs.tsx accordingly:');
      console.log(usableNewAlgs);
    }

    // add new algs to simplifedAlgs for final processing
    simplifiedAlgs.push(...usableNewAlgs);

    switch (algType) {
      case 'Exact':
        await compileExactAlgorithms(simplifiedAlgs as ExactAlg[]);
        break;
      case 'LastLayer':
        await compileLLalgorithms(simplifiedAlgs as LastLayerAlg[]);
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

  const compileLLalgorithms = async (algs: LastLayerAlg[]) => {
    if (!cubeLoaded || !hiddenPlayerRef.current) {
      console.error('Cube not loaded yet. Please wait for the cube to load before compiling.');
      return;
    }

    // Get initial cube state
    const initialCube = await hiddenPlayerRef.current.updateCube('', '', []);
    if (!initialCube) {
      console.error('Failed to get initial cube state');
      return;
    }

    const cubeInterpreter = new CubeInterpreter(initialCube);

    // Add a small delay to ensure cube is fully initialized
    await new Promise(resolve => setTimeout(resolve, 100));

    const matrixMaps = cubeInterpreter.solvedMatrixMaps;
    if (!matrixMaps || matrixMaps.size === 0) {
      console.error('CubeInterpreter solvedMatrixMaps is not available. Cannot proceed with compilation.');
      return;
    }

    // Array to store compiled algorithm data
    const compiledData: CompiledLLAlg[] = [];

    for (const alg of algs) {
      if (!isCompilingRef.current) {
        break;
      }

      const deangledAlg = removeAngleFromAlg(alg.value);
      const algInverse = getAlgInverse(deangledAlg);

      // Use imperative API to update cube state
      const animationTimes = findAnimationLengths(algInverse.split(' '));
      const cube = await hiddenPlayerRef.current.updateCube('', algInverse, animationTimes);
      
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
  const compileExactAlgorithms = async (algs: ExactAlg[]) => {
    if (!hiddenPlayerRef.current) {
      console.error('Hidden player reference not available. Cannot proceed with compilation.');
      return;
    }

    // Get initial cube state
    const initialCube = await hiddenPlayerRef.current.updateCube('', '', []);
    if (!initialCube) {
      console.error('Failed to get initial cube state');
      return;
    }

    const cubeInterpreter = new CubeInterpreter(initialCube);
    // Add a small delay to ensure cube is fully initialized
    await new Promise(resolve => setTimeout(resolve, 100));
    const matrixMaps = cubeInterpreter.solvedMatrixMaps;
    if (!matrixMaps || matrixMaps.size === 0) {
      console.error('CubeInterpreter solvedMatrixMaps is not available. Cannot proceed with compilation.');
      return;
    }

    // Array to store compiled algorithm data
    const compiledData: CompiledExactAlg[] = [];

    for (const alg of algs) {
      if (!isCompilingRef.current) {
        break;
      }
      const angles = getAllowedAngles(alg);
      for (const angle of angles) {
        try {
          
          // add AUF/rotation and reorder if needed (y moves should go before U moves)
          const completeAlg = reorderAnglingInAlg(angle, alg.value);
          
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
          console.log(`Processing Alg: ${completeAlg}, Inverse: ${algInverse}`);
          
          // Use imperative API to update cube state
          const animationTimes = findAnimationLengths(algInverse.split(' '));
          const cube = await hiddenPlayerRef.current.updateCube('', algInverse, animationTimes);
          
          if (!cube) {
            console.error('Failed to get cube state for algorithm:', algInverse);
            continue;
          }

          // Update the cube interpreter with current cube state
          cubeInterpreter.getStepsCompleted(cube);
          const cubeState = cubeInterpreter.getCurrentState();
          const hash = cubeState?.hash || 'unknown';
          
          console.log(`Algorithm: ${alg.value}, Hash: ${hash}`);
          
          // Add to compiled data
          compiledData.push({
            alg: completeAlg,
            hash: hash,
            step: alg.step || '',
          });
        } catch (error) {
          console.error(`Error processing algorithm ${alg.value}:`, error);
          compiledData.push({
            alg: alg.value + ' (Does not include AUF/rotation)',
            hash: 'error',
            step: alg.step || '',
          });
        }
      }
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

    // start compilation and let async loops read cancellation synchronously
    isCompilingRef.current = true;
    setIsCompiling(true);
    handleCompileAlgorithms();
  };

  const handleCompileAlgorithms = async () => {
    if (!cubeLoaded) {
      alert('Please wait for the cube to load before compiling algorithms.');
      isCompilingRef.current = false;
      setIsCompiling(false);
      return;
    }

    if (selectedAlgTypes.size === 0) {
      alert('Please select at least one algorithm type to compile.');
      isCompilingRef.current = false;
      setIsCompiling(false);
      return;
    }

    try {
      await compileSelectedAlgs();
    } catch (error) {
      console.error('Error compiling algorithms:', error);
    } finally {
      isCompilingRef.current = false;
      setIsCompiling(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 text-primary-100">
      <HiddenPlayer
        ref={hiddenPlayerRef}
        onCubeLoaded={handleCubeLoaded}
      />
      
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
          disabled={!cubeLoaded || selectedAlgTypes.size === 0}
          className={`p-3 rounded-sm border border-primary-100 hover:border-primary-500 ${
            !cubeLoaded || selectedAlgTypes.size === 0
              ? 'bg-gray-500 cursor-not-allowed' 
              : 'bg-black hover:bg-gray-800'
          }`}
        >
          {isCompiling ? 'Compiling. Click to Cancel.' : `Compile Selected Algs (${selectedAlgTypes.size} type${selectedAlgTypes.size > 1 ? 's' : ''})`}
        </button>
        {!cubeLoaded && (
          <span className="">Loading cube...</span>
        )}
        {cubeLoaded && (
          <span className="">Cube ready</span>
        )}
        {selectedAlgTypes.size === 0 && cubeLoaded && (
          <span className="">Select at least one algorithm type</span>
        )}
      </div>
    </div>
  );
};