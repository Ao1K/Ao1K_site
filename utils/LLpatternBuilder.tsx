import React, { useRef, useState } from 'react';
import { ollCases, pllCases } from './llCases';
import type { ExactAlg } from "./rawAlgs";
import { SimpleCubeInterpreter } from "../composables/recon/SimpleCubeInterpreter";
import { SimpleCube } from '../composables/recon/SimpleCube';
import { reverseMove } from '../composables/recon/transformHTML';
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
 * Compiles pattern files using SimpleCube to generate algorithm patterns.
 * To change the sets of patterns created, modify the calls to generatePatterns within handleGeneratePatterns.
 */
export default function LLpatternBuilder() {
  const simpleCubeRef = useRef<SimpleCube>(new SimpleCube());

  const [isGenerating, setIsGenerating] = useState(false);

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

  /**
   * Takes an array of cubing algs, determines the cube hash, then creates a json file and downloads it.
   */
  const generatePatterns = (cases: Case[]) => {

    console.log('Generating patterns...');
    // if no algs, use rawAlgs file
    if (!cases) {
      cases = ollCases;
    }

    const cubeInterpreter = new SimpleCubeInterpreter();

    // Array to store compiled algorithm data
    const patternData: AlgPattern[] = [];

    for (const algCase of cases) {
      try {
        
        // remove leading/trailing U and y moves
        let completeAlg = trimExtraMoves(algCase.alg);
        
        const algInverse = getAlgInverse(completeAlg);
        console.log(`Processing Alg: ${completeAlg}, Inverse: ${algInverse}`);
        
        const cube = simpleCubeRef.current.getCubeState(algInverse.split(' '));
        
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



  const handleGeneratePatterns = () => {

    setIsGenerating(true);
    try {
      generatePatterns(ollCases);
      // generatePatterns(pllCases);
      // generatePatterns(zbllCases);
      // generatePatterns(eoCases);
      // generatePatterns(cpCases);
      // generatePatterns(onelllCases);
    } catch (error) {
      console.error('Error generating patterns:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 items-center">
        <button 
          onClick={handleGeneratePatterns}
          disabled={isGenerating}
          className={`text-primary-100 p-3 mt-2 rounded-sm border ${
            isGenerating 
              ? 'bg-gray-500 cursor-not-allowed' 
              : 'bg-black hover:bg-gray-800'
          }`}
        >
          {isGenerating ? 'Making patterns...' : 'Make alg patterns'}
        </button>
      </div>
    </div>
  );
};