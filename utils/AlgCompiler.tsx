import React, { useRef, useState } from 'react';
import { rawGeneric, rawOLLalgs, rawPLLalgs } from "./rawAlgs";
import type { ExactAlg, LastLayerAlg } from "./rawAlgs";
import { CubeInterpreter } from "../composables/recon/CubeInterpreter";
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
    let combined = (angle ? `${angle} ` : '') + algValue;
    
    // Use regex to find U move followed by y move and flip them
    combined = combined.replace(/(U'?2?)\s+(y'?2?)/g, '$2 $1');
    
    return combined.trim();
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

  const compileAllAlgs = async () => {
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

  const compileAlgorithms = async (algs: ExactAlg[] | LastLayerAlg[], algType: 'Exact' | 'LastLayer') => {
    if (!cubeLoaded || !hiddenPlayerRef.current) {
      console.error('Cube not loaded yet. Please wait for the cube to load before compiling.');
      return;
    }
    switch (algType) {
      case 'Exact':
        await compileExactAlgorithms(algs as ExactAlg[]);
        break;
      case 'LastLayer':
        await compileLLalgorithms(algs as LastLayerAlg[]);
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
      const cleanedAlg = removeAngleFromAlg(alg.value);
      const algInverse = getAlgInverse(cleanedAlg);

      // Use imperative API to update cube state
      const animationTimes = findAnimationLengths(algInverse.split(' '));
      const cube = await hiddenPlayerRef.current.updateCube('', algInverse, animationTimes);
      
      if (!cube) {
        console.error('Failed to get cube state for algorithm:', algInverse);
        continue;
      }

      // Update the cube interpreter with current cube state
      cubeInterpreter.setCurrentState(cube);
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
      const angles = getAllowedAngles(alg);
      for (const angle of angles) {
        try {
          
          // add AUF/rotation and reorder if needed (y moves should go before U moves)
          let completeAlg = reorderAnglingInAlg(angle, alg.value);
          
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
          cubeInterpreter.setCurrentState(cube);
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
    link.download = `compiled-algs-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    console.log(`Downloaded ${data.length} compiled algorithms as JSON file`);
  };



  const handleCompileAlgorithms = async () => {
    if (!cubeLoaded) {
      alert('Please wait for the cube to load before compiling algorithms.');
      return;
    }

    if (selectedAlgTypes.size === 0) {
      alert('Please select at least one algorithm type to compile.');
      return;
    }

    setIsCompiling(true);
    try {
      await compileAllAlgs();
    } catch (error) {
      console.error('Error compiling algorithms:', error);
    } finally {
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
          onClick={handleCompileAlgorithms}
          disabled={isCompiling || !cubeLoaded || selectedAlgTypes.size === 0}
          className={`p-3 rounded-sm border border-primary-100 hover:border-primary-500 ${
            isCompiling || !cubeLoaded || selectedAlgTypes.size === 0
              ? 'bg-gray-500 cursor-not-allowed' 
              : 'bg-black hover:bg-gray-800'
          }`}
        >
          {isCompiling ? 'Compiling...' : `Compile Selected Algs (${selectedAlgTypes.size} types)`}
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