'use client';

import { useState, useRef, useEffect } from "react";
import MovesTextEditor from "../../components/MovesTextEditor";
import SpeedSlider from "../../components/SpeedSlider";

import Dropdown from "../../components/Dropdown";
import UndoRedoButton from "../../components/UndoRedoButton";
import ToolbarButton from "../../components/UndoRedoButton";

import TwistyPlayer from "../../components/TwistyPlayer";
import ReconTimeHelpInfo from "../../components/ReconTimeHelpInfo";
import TPSInfo from "../../components/TPSInfo";
import updateURL from "@/composables/updateURL";

import type { EditorRef } from "../../components/MovesTextEditor";
import UndoIcon from "../../components/icons/undo";
import RedoIcon from "../../components/icons/redo";
import CatIcon from "../../components/icons/cat";

export interface MoveHistory {
  history: string[][];
  index: number;
  status: string;
  MAX_HISTORY: number;
}

export default function Recon() {
  const allMoves = useRef<string[][][]>([[[]], [[]]]);
  const moveLocation = useRef<number[]>([0, 0, 0]);
  const [animationTime, setAnimationTime] = useState<number>(0);

  const [speed, setSpeed] = useState<number>(25);
  const [scramble, setScramble] = useState<string>('');
  const [solution, setSolution] = useState<string>('');
  const [totalMoves, setTotalMoves] = useState<number>(0);
  const [solveTime, setSolveTime] = useState<number|string>('');

  const [scrambleHTML, setScrambleHTML] = useState<string>('');
  const [solutionHTML, setSolutionHTML] = useState<string>('');

  const scrambleRef = useRef<EditorRef>(null);
  const solutionRef = useRef<EditorRef>(null);
  const undoRef = useRef<HTMLButtonElement>(null);
  const redoRef = useRef<HTMLButtonElement>(null);

  const MAX_EDITOR_HISTORY = 100;


  const moveHistory = useRef<MoveHistory>({ history: [['','']], index: 0, MAX_HISTORY: MAX_EDITOR_HISTORY, status: 'loading' });
  
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

  const handleUndo = () => {
    if (scrambleRef.current  && solutionRef.current) {
      scrambleRef.current.undo();
      solutionRef.current.undo();
    }
  }
  const handleRedo = () => {
    if (scrambleRef.current  && solutionRef.current) {
      scrambleRef.current.redo();
      solutionRef.current.redo();
    }
  }

  const handleHistoryBtnUpdate = () => {
    const isAtEnd = moveHistory.current.index === moveHistory.current.history.length - 1;
    const isAtStart = moveHistory.current.index === 0;

    console.log('start?, end?, index, history length:', isAtStart, isAtEnd, moveHistory.current.index, moveHistory.current.history.length);
    console.log('history:', moveHistory.current.history);

    const buttons = [
      { ref: undoRef, condition: isAtStart },
      { ref: redoRef, condition: isAtEnd }
    ];

    buttons.forEach(({ ref, condition }) => {
      if (!ref.current) return;

      if (condition) {
        ref.current.setAttribute("disabled", "true");
        ref.current.classList.remove("text-light");
        ref.current.classList.add("text-primary", "pointer-events-none");
      } else {
        ref.current.removeAttribute("disabled");
        ref.current.classList.remove("text-primary", "pointer-events-none");
        ref.current.classList.add("text-light");
      }
    });
  };

  const createCat = () => {
    const src = '/tangus.png'; // Path relative to the public folder
    
    const img = document.createElement('img');
    img.src = src;
    img.alt = 'Image from public folder';
  
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.insertNode(img); // Insert the image at the caret position

      const newRange = document.createRange();
      newRange.setStartAfter(img);
      newRange.setEndAfter(img);

      selection.removeAllRanges();
      selection.addRange(newRange);
    }
  };
  


  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const time = urlParams.get('time');
    if (time) {
      setSolveTime(parseFloat(time));
    }
  }, []);

  return (
    <div id="main_page" className="w-full flex flex-col items-center bg-dark">
      <div className="relative flex flex-col w-full mt-8 m-4 justify-center items-center">
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 inset-0 h-full blur-sm bg-primary w-11/12 md:w-4/5 lg:w-3/5 xl:w-2/5"></div>
        <div id="cube_model" className="flex aspect-[1.618/1] max-h-96 bg-dark z-10 w-11/12 md:w-4/5 lg:w-3/5 xl:w-2/5 ">
          <TwistyPlayer scramble={scramble} solution={solution} speed={speed} moveLocation={moveLocation.current} animationTime={animationTime}/>
        </div>
      </div>
      <div id="toolbar" className="flex flex-row space-x-1 text-light">
        <SpeedSlider speed={speed} onChange={handleSpeedChange}/>
        <UndoRedoButton buttonRef={undoRef} text="Undo" shortcutHint="ctrl+z" onClick={handleUndo} icon={<UndoIcon/>} />
        <UndoRedoButton buttonRef={redoRef} text="Redo" shortcutHint="ctrl+y" onClick={handleRedo} icon={<RedoIcon/>} />
        <ToolbarButton text="" shortcutHint="Cat" onClick={createCat} icon={<CatIcon/>} />
      </div>
      <div id="datafields" className="pl-6 max-h-[calc(100vh/2.5)] overflow-x-hidden w-full xs:w-11/12 md:w-4/5 lg:w-3/5 xl:w-2/5 transition-width duration-500 ease-linear flex flex-col justify-center items-center">
        <div className="w-full flex flex-col pr-6 overflow-y-auto">
          <div className="flex flex-row items-center">
            <Dropdown targetDiv="scramble"/> 
          </div>
          <div id="scramble">
            <MovesTextEditor
              name={`scramble`}
              ref={scrambleRef}
              trackMoves={trackMoves}
              autofocus={true}
              moveHistory={moveHistory}
              updateHistoryBtns={handleHistoryBtnUpdate}
              html={scrambleHTML}
              setHTML={setScrambleHTML}
            />
          </div>

          <div className="flex flex-row items-center">
            <Dropdown targetDiv="solution"/> 
          </div>
          <div id="solution">
            <MovesTextEditor 
              name={`solution`}
              ref={solutionRef} 
              trackMoves={trackMoves} 
              autofocus={false} 
              moveHistory={moveHistory}
              updateHistoryBtns={handleHistoryBtnUpdate}
              html={solutionHTML}
              setHTML={setSolutionHTML}
            />
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
