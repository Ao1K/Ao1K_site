'use client';

import { useState, useRef, useEffect } from "react";
import MovesTextEditor from "@/components/MovesTextEditor";
import SpeedSlider from "@/components/SpeedSlider";

import Dropdown from "@/components/Dropdown";
import Toolbar from "@/components/Toolbar";

import TwistyPlayer from "@/components/TwistyPlayer";
import ReconTimeHelpInfo from "@/components/ReconTimeHelpInfo";
import TPSInfo from "@/components/TPSInfo";
import updateURL from "@/composables/updateURL";

import type { EditorRef } from "@/components/MovesTextEditor";

import UndoIcon from "@/components/icons/undo";
import RedoIcon from "@/components/icons/redo";
import CatIcon from "@/components/icons/cat";
import MirrorM from "@/components/icons/mirrorM";
import MirrorS from "@/components/icons/mirrorS";

import addCat from "@/composables/addCat";
import { mirrorHTML_M, mirrorHTML_S, removeComments } from "@/composables/transformHTML";
import isSelectionInTextbox from "@/composables/isSelectionInTextbox";
import { TransformHTMLprops } from "@/composables/transformHTML";

export interface MoveHistory {
  history: string[][];
  index: number;
  status: string;
  MAX_HISTORY: number;
}

interface OldSelectionRef {
  status: string;
  range: Range | null;
  textbox: string | null;
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

  const oldSelectionRef = useRef<OldSelectionRef>({ range: null, textbox: null,  status: "init" });

  const MAX_EDITOR_HISTORY = 100;
  const moveHistory = useRef<MoveHistory>({ history: [['','']], index: 0, MAX_HISTORY: MAX_EDITOR_HISTORY, status: 'loading' });

  const bottomBarRef = useRef<HTMLDivElement>(null);
  
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
      return;
    }

    if(!moves[lineIndex]) {
      moveIndex = -1;
      lineIndex = findPrevNonEmptyLine(moves, lineIndex, idIndex);
    }

    if (idIndex === 0) {
      setScramble(moves.flat().join(' '));  
    }
    else {
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

      setAnimationTime(sumPrevMoveTimes);
    }

    if(idIndex === 0) {
      setAnimationTime(1);
    }


    moveLocation.current = newMoveLocation;
    allMoves.current[idIndex] = [...moves];
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

  const getWholeTextboxRange = (textboxID: string): Range => {

      const parentElement = document.getElementById(textboxID);
      const textbox = parentElement!.querySelector<HTMLDivElement>('div[contenteditable="true"]');
      textbox!.focus()
      let range = document.createRange();
      range.selectNodeContents(textbox!);
      return range;

  }

  const transformSelection = (transformType: TransformHTMLprops) => {

    let range = oldSelectionRef.current.range;
    let textbox = oldSelectionRef.current.textbox;

    // if (oldSelectionRef.current.status === 'updating') {
    //   console.log('updating');
    //   setTimeout(() => {
    //     mirrorSelectionM(range, textbox);
    //   }, 100);
    //   return;
    // }

    //set range and textbox as necessary
    if (range && textbox) { // testing only

    } else if (!range && textbox) {
      range = getWholeTextboxRange(textbox);

    } else {
      range = getWholeTextboxRange('solution')      
      textbox = 'solution';      
    } 

    if (!range) return;

    let newHTML = transformType(range, textbox) ?? '';

    textbox === 'solution' ? 
      solutionRef.current!.transform(newHTML) : // can handle html or plaintext
      scrambleRef.current!.transform(newHTML)

    

  }

  const handleTransform = (transformType: TransformHTMLprops) => {
    oldSelectionRef.current.status = 'locked';

    transformSelection(transformType);

    oldSelectionRef.current.status = 'unlocked';
  }

  const handleMirrorM = () => handleTransform(mirrorHTML_M);
  const handleMirrorS = () => handleTransform(mirrorHTML_S);
  const handleRemoveComments = () => handleTransform(removeComments);
  
  const getTextboxOfSelection = (range: Range) => {
    let node = range?.commonAncestorContainer
    let nodeType = node?.nodeType;
    while (node && (nodeType === Node.ELEMENT_NODE || nodeType === Node.TEXT_NODE)) {
      const element = node as HTMLElement;
  
      if (element.id === "scramble" || element.id === "solution") {
        return element.id
      }
  
      if (element.tagName === 'BODY') {
        return null;
      }
  
      node = node.parentNode as HTMLElement;
    }

    return null;
  }

  const storeLastSelection = () => {
    if (oldSelectionRef.current.status === 'locked') {
      console.log('locked');
      return;
    }

    oldSelectionRef.current.status = 'updating';

    const selection = window.getSelection();
    let range = null;
    let textbox = null;

    oldSelectionRef.current.range = null;
    oldSelectionRef.current.textbox = null;

    if (selection && isSelectionInTextbox(selection)) {
      range = selection.getRangeAt(0).cloneRange();
      //console.log('range:', range, range.toString());
      textbox = getTextboxOfSelection(range);
      //console.log('selection in textbox:', textbox);
    }

    if (!range || !textbox) return;

    if (range.startContainer === range.endContainer && range.startOffset === range.endOffset) {
      // not multi-select
      range = null;
    }

    oldSelectionRef.current.range = range;
    oldSelectionRef.current.textbox = textbox;
    oldSelectionRef.current.status = 'updated';


  }

  const handleCommand = (e: KeyboardEvent) => {
    if (!e.ctrlKey) return;

    if (e.ctrlKey && e.key === 'm') {
      
      e.preventDefault();

      handleMirrorM();
    }

    if (e.ctrlKey && e.key === 's') {

      e.preventDefault();

      handleMirrorS();
    }

    if (e.ctrlKey && e.shiftKey && e.key === 'x') {

      e.preventDefault();

      // handleRotationX();
    }

    if (e.ctrlKey && e.key === '/') {

      e.preventDefault();

      handleRemoveComments();
    }
  };

  const toolbarButtons = [
    { id: 'undo', text: 'Undo', shortcutHint: 'ctrl+z', onClick: handleUndo, icon: <UndoIcon />, buttonRef: undoRef },
    { id: 'redo', text: 'Redo', shortcutHint: 'ctrl+y', onClick: handleRedo, icon: <RedoIcon />, buttonRef: redoRef },
    { id: 'mirrorM', text: 'Mirror M', shortcutHint: 'ctrl+m', onClick: handleMirrorM, icon: <MirrorM /> },
    { id: 'mirrorS', text: 'Mirror S', shortcutHint: 'ctrl+s', onClick: handleMirrorS, icon: <MirrorS /> },
    { id: 'cat', text: 'Angus', shortcutHint: 'Cat', onClick: addCat, icon: <CatIcon /> },
    { id: 'removeComments', text: 'Remove Comments', shortcutHint: 'ctrl+/ ', onClick: handleRemoveComments, iconText: '// ' },
  ];

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const time = urlParams.get('time');
    if (time) {
      setSolveTime(parseFloat(time));
    }
  }, []);

  useEffect(() => {
    
    document.addEventListener('selectionchange', storeLastSelection);
    document.addEventListener('keydown', handleCommand);

    return () => {

      document.removeEventListener('selectionchange', storeLastSelection);
      document.addEventListener('keydown', handleCommand);

    };
  }, []);

  return (
    <div id="main_page" className="col-start-2 col-span-1 flex flex-col bg-dark">
      <div className="relative flex flex-col mt-8 m-4 w-full justify-center items-center">
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 inset-0 h-full blur-sm bg-primary w-full"></div>
        <div id="cube_model" className="flex aspect-[1.618/1] max-h-96 bg-dark z-10 w-full">
          <TwistyPlayer scramble={scramble} solution={solution} speed={speed} moveLocation={moveLocation.current} animationTime={animationTime}/>
        </div>
      </div>
      <div id="bottom bar" className="flex flex-row space-x-1 text-light w-full items-center" ref={bottomBarRef}>
        <div id="spacer-1" className="flex-1 text-paren"></div>
        <SpeedSlider speed={speed} onChange={handleSpeedChange}/>
        <Toolbar buttons={toolbarButtons} containerRef={bottomBarRef}/>
        <div id="spacer-2" className="flex-1 text-rep"></div>
      </div>
      <div id="datafields" className="pl-6 max-h-[calc(100vh/2.5)] overflow-x-hidden w-full transition-width duration-500 ease-linear flex flex-col justify-center items-center">
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
      <div id="blur-border" className="h-[20px] blur-xl bg-primary mt-1 mb-8"/>
    </div>
  );
}
