'use client';

import { useState, useRef, useEffect } from "react";
import MovesTextEditor from "../../components/MovesTextEditor";
import SpeedSlider from "../../components/SpeedSlider";

import Dropdown from "../../components/Dropdown";

import TwistyPlayer from "../../components/TwistyPlayer";
import ReconTimeHelpInfo from "../../components/ReconTimeHelpInfo";
import TPSInfo from "../../components/TPSInfo";
import updateURL from "@/composables/updateURL";


export default function Recon() {
  const allMoves = useRef<string[][][]>([[[]], [[]]]);
  const moveLocation = useRef<number[]>([0, 0, 0]);
  const [animationTime, setAnimationTime] = useState<number>(0);

  const [speed, setSpeed] = useState<number>(25);
  const [scramble, setScramble] = useState<string>('');
  const [solution, setSolution] = useState<string>('');
  const [totalMoves, setTotalMoves] = useState<number>(0);
  const [solveTime, setSolveTime] = useState<number|string>('');
  
  interface MoveHistory {
    history: string[][];
    index: number;
    MAX_HISTORY: number;
  }
  const moveHistory = useRef<MoveHistory>({ history: [['','']], index: 0, MAX_HISTORY: 50});
  
  const findPrevNonEmptyLine = (moves: string[][], lineIndex: number, idIndex: number): number => {
    for (let i = lineIndex; i >= 0; i--) {
      if (moves && moves[i]) {
        return i;
      }
    }
    return 0;
  }


  const trackMoves = (
    idIndex: number, lineIndex: number, moveIndex: number, 
    moves: string[][], // the moves in the textbox of id
    moveCounts: number[],
    moveAnimationTimes: number[][],
  ) => {

    const regex =/[^xyz2']/g;
    if (idIndex === 1) {
      let moveCount = moves.flat(2).filter(move => move.match(regex)).length
      setTotalMoves(moveCount);
    }

    //console.log('tracking moves');
    const movesSame: boolean = JSON.stringify(allMoves.current[idIndex]) === JSON.stringify(moves);

    const newMoveLocation = [idIndex, lineIndex, moveIndex];
    const moveIndexSame = 
       moveLocation.current[0] === newMoveLocation[0] 
    && moveLocation.current[1] === newMoveLocation[1] 
    && moveLocation.current[2] === newMoveLocation[2];

    if (movesSame && moveIndexSame) {
      //console.log('no change');
      return;
    }

    //if (!movesSame) console.log('moves not same');

    
    
    if(!moves[lineIndex]) {
      moveIndex = -1;
      lineIndex = findPrevNonEmptyLine(moves, lineIndex, idIndex);
      //console.log('newLineIndex:', lineIndex);
    }

    if (idIndex === 0) {
      //console.log('scramble', moves, moves.flat().join(' '));
      setScramble(moves.flat().join(' '));  
    }
    else {
      //console.log('solution', moves, 'flattened:', moves.flat().join(' '));
      setSolution(moves.flat().join(' '));
    }

    
    
    if(!moveIndexSame && idIndex === 1 && moveAnimationTimes.length > 0) {
      let sumPrevMoveTimes = 0;
      const nonEmptyLineIndexAdjustment = moveIndex === -1 ? 1 : 0;

      for (let i = 0; i < lineIndex + nonEmptyLineIndexAdjustment; i++) {
        sumPrevMoveTimes += moveAnimationTimes[i].reduce((total, time) => total + time, 0); // BUG: sometimes moveAnimationTimes[i] is undefined
      }

      for (let i = 0; i <= moveIndex; i++) {
        if (moveAnimationTimes[lineIndex] && moveAnimationTimes[lineIndex][i]) {
          sumPrevMoveTimes += moveAnimationTimes[lineIndex][i];
        }
      }
      //console.log('sumPrevMoveTimes:', sumPrevMoveTimes);
      setAnimationTime(sumPrevMoveTimes);
    }

    if(idIndex === 0) {
      setAnimationTime(1);
    }


    moveLocation.current = newMoveLocation;
    allMoves.current[idIndex] = [...moves];
    //console.log('allMoves:', allMoves.current[idIndex]);
  }

  const handleSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSpeed(parseInt(e.target.value));
  }

  const handleSolveTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value.length > 9) return;
    if (e.target.value === '') {
      setSolveTime('');
      updateURL('time', 'undefined');
      return;
    }

    setSolveTime(parseFloat(e.target.value));
    updateURL('time', e.target.value);
  }

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const time = urlParams.get('time');
    if (time) {
      setSolveTime(parseFloat(time));
    }
  }, []);

  return (
    <div id="main_page" className="w-full flex flex-col items-center bg-dark h-dvh">
      <div className="relative flex flex-row w-full m-4 mt-8 justify-center">
          <div className="absolute h-full inset-5 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 blur-xl bg-primary w-11/12 md:w-4/5 lg:w-3/5 xl:w-2/5"></div>
          <div id="cube_model" className="relative flex w-11/12 md:w-4/5 lg:w-3/5 xl:w-2/5 aspect-[3/2] max-h-96 bg-dark">
            <TwistyPlayer scramble={scramble} solution={solution} speed={speed} moveLocation={moveLocation.current} animationTime={animationTime}/>
          </div>
      </div>
      <SpeedSlider speed={speed} onChange={handleSpeedChange} />
      <div id="datafields" className="pl-6 max-h-[calc(100vh/2.5)] overflow-x-hidden w-full xs:w-11/12 md:w-4/5 lg:w-3/5 xl:w-2/5 transition-width duration-500 ease-linear flex flex-col justify-center items-center">
        <div className="w-full flex flex-col pr-6 overflow-y-auto">
          <div className="flex flex-row items-center">
            <Dropdown targetDiv="scramble"/> 
          </div>
          <div id="scramble">
            <MovesTextEditor name={`scramble`} trackMoves={trackMoves} autofocus={true} moveHistory={moveHistory}/>
          </div>

          <div className="flex flex-row items-center">
            <Dropdown targetDiv="solution"/> 
          </div>
          <div id="solution">
            <MovesTextEditor name={`solution`} trackMoves={trackMoves} autofocus={false} moveHistory={moveHistory}/>
          </div>

          <div className="text-dark_accent text-xl font-medium py-2">Time</div>
          <div id="time-stats" className="flex flex-row items-center mb-4">
            <div id="time-field" className="border border-light flex flex-row items-center justify-start">
              <input 
                type="number" 
                placeholder="00.000" 
                className="pt-2 pb-2 pl-2 text-xl text-light bg-dark focus:outline-none rounded-sm box-content no-spinner w-[4.25rem]"
                value={solveTime}
                onChange={handleSolveTimeChange}
                onWheel={(e) => e.currentTarget.blur()}
                />
              <div className="text-light ml-2 pr-2 text-xl">sec</div> 
            </div>
            <div className="text-light ml-2 text-xl">{totalMoves} stm </div> 
            <TPSInfo moveCount={totalMoves} solveTime={solveTime} />
            <ReconTimeHelpInfo />
          </div>
          {/* <div className="text-dark_accent text-xl pt-1 font-medium">Review</div> */}
        </div>
      </div>
    </div>
  );
}
