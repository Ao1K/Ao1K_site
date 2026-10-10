'use client';

import { useState } from 'react';
import DropdownIcon from '../icons/dropdown';
import ArrowClockwiseIcon from '../icons/arrow-clockwise';
import InvertIcon from '../icons/invert';
import Parrot from '../icons/parrot';
import { prefetchRandomScramble, takeRandomScramble } from '../../composables/recon/cubeSolverClient';
import { invertAlgMoves, removeRotations, simplifySetupMoves } from '../../composables/recon/setupMoves';
import { SimpleCube } from '../../composables/recon/SimpleCube';

interface ScrambleDropdownProps {
  scramble: string;
  solution: string;
  scrambleOfTheDay: string;
  onScrambleChange: (scrambleContent: string) => void;
}

const normalizeAlg = (alg: string) => alg.trim().split(/\s+/).join(' ');

const getMovesFromHTML = (html: string) => normalizeAlg(html
  .split('</div>')
  .map((line) => line.replace(/<[^>]*>/g, '').replace(/\/\/.*/, ''))
  .join(' '));

const isSolvedBy = (scramble: string, solution: string) => new SimpleCube()
  .getCubeState(`${scramble} ${solution}`.trim().split(' '))
  .every((face) => face.flat().every((color) => color === face[1][1]));

type LoadingAction = 'new' | 'infer';

export default function ScrambleDropdown({ scramble, solution, scrambleOfTheDay, onScrambleChange }: ScrambleDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loadingAction, setLoadingAction] = useState<LoadingAction | null>(null);
  const isLoading = loadingAction !== null;
  const rotationFreeSolution = removeRotations(solution);
  const canInferFromSolution = rotationFreeSolution !== '' && !isSolvedBy(scramble, solution);
  const canAddScrambleOfTheDay = normalizeAlg(scramble) !== getMovesFromHTML(scrambleOfTheDay);

  const handleToggle = () => {
    prefetchRandomScramble();
    setIsOpen(open => !open);
  };

  const runWithLoadingIndicator = async (action: LoadingAction, task: () => Promise<void>) => {
    setLoadingAction(action);
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => setTimeout(resolve));
    });
    try {
      await task();
    } finally {
      setLoadingAction(null);
      setIsOpen(false);
    }
  };

  const handleNewScramble = () => runWithLoadingIndicator('new', async () => {
    const newScramble = await takeRandomScramble();
    if (newScramble) onScrambleChange(newScramble);
  });

  const handleGenerateFromSolution = () => runWithLoadingIndicator('infer', async () => {
    onScrambleChange(await simplifySetupMoves(invertAlgMoves(rotationFreeSolution)));
  });

  const handleScrambleOfTheDay = () => {
    setIsOpen(false);
    onScrambleChange(scrambleOfTheDay);
  };

  return (
    <div className="relative w-fit">
      <button
        className="pb-1 text-xl text-dark_accent hover:text-primary-100 transition-colors underline underline-offset-2 font-medium flex flex-row items-center gap-1 select-none"
        onPointerEnter={prefetchRandomScramble}
        onClick={handleToggle}
      >
        Scramble
        <DropdownIcon
          className="w-4 h-4"
          style={{ transition: 'transform 300ms ease', transform: isOpen ? 'rotate(0deg)' : 'rotate(180deg)' }}
        />
      </button>
      {isOpen ? (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />
          <div className="flex flex-col bg-primary-900 absolute z-40 place-items-start text-dark_accent pb-1 px-1 -ml-1 -mt-1.5 text-sm whitespace-nowrap">
            <button
              className={`hover:bg-neutral-600 ${loadingAction === 'new' ? 'bg-neutral-600' : ''} py-2 px-2 border border-neutral-600 w-full text-left flex items-center space-x-2`}
              onClick={handleNewScramble}
              disabled={isLoading}
            >
              <ArrowClockwiseIcon className="w-4 h-4 -translate-y-0.5" />
              <span>Generate New</span>
            </button>
            <button
              className={`${canInferFromSolution ? 'hover:bg-neutral-600' : 'text-neutral-600'} ${loadingAction === 'infer' ? 'bg-neutral-600' : ''} py-2 px-2 border border-neutral-600 w-full text-left flex items-center space-x-2`}
              onClick={handleGenerateFromSolution}
              disabled={isLoading || !canInferFromSolution}
            >
              <InvertIcon className="w-4 h-4 -translate-y-0.5" />
              <span>Infer from Solution</span>
            </button>
            <button
              className={`${canAddScrambleOfTheDay ? 'hover:bg-neutral-600' : 'text-neutral-600'} py-2 px-2 border border-neutral-600 w-full text-left flex items-center space-x-2`}
              onClick={handleScrambleOfTheDay}
              disabled={isLoading || !canAddScrambleOfTheDay}
            >
              <Parrot className="w-4 h-4 -translate-y-0.5 scale-[1.125]" />
              <span>Use Scramble of the Day</span>
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
