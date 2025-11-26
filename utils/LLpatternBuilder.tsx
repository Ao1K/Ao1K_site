import React, { useRef, useState } from 'react';
import { ollCases, pllCases } from './llCases';
import type { ExactAlg } from "./rawAlgs";
import { CubeInterpreter } from "../composables/recon/CubeInterpreter";
import { reverseMove } from '../composables/recon/transformHTML';
import HiddenPlayer, { HiddenPlayerHandle } from '../components/recon/HiddenPlayer';
import LLinterpreter from '../composables/recon/LLinterpreter';

interface AlgPattern {
  caseIndex: number;
  pattern: number;
  name: string;
}

export interface Case {
  index: number,
  alg: string,
  name: string,
  step: 'oll' | 'pll' | 'zbll' | 'eo' | 'cp' | 'onelll',
}

/**
 * React component for compiling algorithms using HiddenPlayer to generate algorithm patterns
 */
export default function LLpatternBuilder() {
  const hiddenPlayerRef = useRef<HiddenPlayerHandle>(null);

  const [isGenerating, setIsCompiling] = useState(false);
  const [cubeLoaded, setCubeLoaded] = useState(false);

  // HiddenPlayer callbacks
  const handleCubeLoaded = () => {
    setCubeLoaded(true);
    console.log('Cube loaded for pattern generation');
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


  /**
   * Removes all leading or trailing U and y moves.
   */
  const trimExtraMoves = (algValue: string): string => {
    const moves = algValue.trim().split(/\s+/);
    // remove leading
    for (const move of moves) {
      if (move.match(/^[Uy]['2]?$/)) {
        moves.shift();
      } else {
        break;
      }
    }

    // remove trailing
    for (let i = moves.length - 1; i >= 0; i--) {
      if (moves[i].match(/^[Uy]['2]?$/)) {
        moves.pop();
      } else {
        break;
      }
    }

    const alg = moves.join(' ');
    return alg.trim();
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
  }

  /**
   * Takes an array of cubing algs, determines the cube hash, then creates a json file and downloads it.
   */
  const generatePatterns = async (cases: Case[]) => {
    if (!cubeLoaded || !hiddenPlayerRef.current) {
      console.error('Cube not loaded yet. Please wait for the cube to load before generating patterns.');
      return;
    }

    console.log('Generating patterns...');
    // if no algs, use rawAlgs file
    if (!cases) {
      cases = ollCases;
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
    const patternData: AlgPattern[] = [];

    for (const algCase of cases) {
      try {
        
        // remove leading/trailing U and y moves
        let completeAlg = trimExtraMoves(algCase.alg);
        
        const algInverse = getAlgInverse(completeAlg);
        console.log(`Processing Alg: ${completeAlg}, Inverse: ${algInverse}`);
        
        // Use imperative API to update cube state
        // Pass animation times to position cube at the end of the algorithm
        const animationTimes = findAnimationLengths(algInverse.split(' '));
        const cube = await hiddenPlayerRef.current.updateCube('', algInverse, animationTimes);
        
        if (!cube) {
          console.error('Failed to get cube state for algorithm:', algInverse);
          continue;
        }

        // Update the cube interpreter with current cube state
        cubeInterpreter.getStepsCompleted(cube);
        const llPattern = cubeInterpreter.getLLcoloring('pattern');

        if (algCase.step !== 'oll' && algCase.step !== 'pll') {
          //&& algCase.step !== 'zbll' && algCase.step !== 'eo' && algCase.step !== 'onelll') {
          throw new Error(`Algorithm step "${algCase.step}" is not supported for pattern generation.`);
        }

        const generator = new LLinterpreter();

        const { key: minimizedPattern, minMovements: _ } = generator.canonicalBase6Key(llPattern, algCase.step);

        console.log('Case index:', algCase.index || -1);
        
        
        // Add to compiled data
        patternData.push({
          caseIndex: algCase.index || -1,
          name: algCase.name,
          pattern: minimizedPattern,
        });
      } catch (error) {
        console.error(`Error processing algorithm ${algCase.alg}:`, error);
        patternData.push({
          caseIndex: -1,
          name: algCase.name,
          pattern: -1,
        });
      }
    }
    // Create and download JSON file
    downloadCasePatterns(patternData, cases[0]?.step || 'unknown');
  };

  /**
   * Downloads the compiled algorithms data as a JSON file
   */
  const downloadCasePatterns = (data: AlgPattern[], type: string) => {
    const jsonData = {
      timestamp: new Date().toISOString(),
      totalPatterns: data.length,
      patternType: type,
      patterns: data
    };

    const jsonString = JSON.stringify(jsonData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // Create download link and trigger download
    const link = document.createElement('a');
    link.href = url;
    link.download = `${type}-patterns-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    console.log(`Downloaded ${data.length} patterns as JSON file`);
  };



  const handleGeneratePatterns = async () => {
    if (!cubeLoaded) {
      alert('Please wait for the cube to load before compiling algorithms.');
      return;
    }

    setIsCompiling(true);
    try {
      await generatePatterns(ollCases);
      // await generatePatterns(pllCases);
      // await generatePatterns(zbllCases);
      // await generatePatterns(eoCases);
      // await generatePatterns(cpCases);
      // await generatePatterns(onelllCases);
    } catch (error) {
      console.error('Error generating patterns:', error);
    } finally {
      setIsCompiling(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <HiddenPlayer
        ref={hiddenPlayerRef}
        onCubeLoaded={handleCubeLoaded}
      />
      <div className="flex gap-2 items-center">
        <button 
          onClick={handleGeneratePatterns}
          disabled={isGenerating || !cubeLoaded}
          className={`text-primary-100 p-3 mt-2 rounded-sm border ${
            isGenerating || !cubeLoaded 
              ? 'bg-gray-500 cursor-not-allowed' 
              : 'bg-black hover:bg-gray-800'
          }`}
        >
          {isGenerating ? 'Making patterns...' : 'Make alg patterns'}
        </button>
        {!cubeLoaded && (
          <span className="text-primary-400">Loading cube...</span>
        )}
        {cubeLoaded && (
          <span className="text-primary-100">Cube ready</span>
        )}
      </div>
    </div>
  );
};