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
import TrashIcon from "@/components/icons/trash";
import CopyIcon from "@/components/icons/copy";
import ShareIcon from "@/components/icons/share";

import addCat from "@/composables/addCat";
import { mirrorHTML_M, mirrorHTML_S, removeComments } from "@/composables/transformHTML";
import isSelectionInTextbox from "@/composables/isSelectionInTextbox";
import { TransformHTMLprops } from "@/composables/transformHTML";

import InputWithPlaceholder from "@/components/TitleInput";
import TopButton from "@/components/TopButton";
import { customDecodeURL } from "@/composables/urlEncoding";
import { update } from "three/examples/jsm/libs/tween.module.js";

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
  const moveLocation = useRef<[number, number, number]>([0, 0, 0]);

  const [speed, setSpeed] = useState<number>(25);
  const scrambleRef = useRef<string>('');
  const [solution, setSolution] = useState<string>('');
  const [totalMoves, setTotalMoves] = useState<number>(0);
  const [solveTime, setSolveTime] = useState<number|string>('');
  const [solveTitle, setSolveTitle] = useState<string>('');
  const [topButtonAlert, setTopButtonAlert] = useState<[string, string]>(["", ""]); // [id, alert msg]
    
  const [scrambleHTML, setScrambleHTML] = useState<string>('');
  const [solutionHTML, setSolutionHTML] = useState<string>('');
    
  const tpsRef = useRef<string>('');
  const scrambleEditorRef = useRef<EditorRef>(null);
  const solutionRef = useRef<EditorRef>(null);
  const undoRef = useRef<HTMLButtonElement>(null);
  const redoRef = useRef<HTMLButtonElement>(null);
  const oldSelectionRef = useRef<OldSelectionRef>({ range: null, textbox: null,  status: "init" });
  const bottomBarRef = useRef<HTMLDivElement>(null);

  const MAX_EDITOR_HISTORY = 100;
  const moveHistory = useRef<MoveHistory>({ history: [['','']], index: 0, MAX_HISTORY: MAX_EDITOR_HISTORY, status: 'loading' });

  const [playerParams, setPlayerParams] = useState<{ animationTimes: number[], solution: string, scramble: string }>({ animationTimes: [], solution: '', scramble: '' });

  const findPrevNonEmptyLine = (moves: string[][], lineIndex: number, idIndex: number): number => {
    for (let i = lineIndex; i >= 0; i--) {
      if (moves && moves[i]) {
        return i;
      }
    }
    return 0;
  }

  const trackMoves = (
    idIndex: number, 
    lineIndex: number, // the line number of the caret
    moveIndex: number, // the number of moves before the caret on its line
    moves: string[][], // the moves in the textbox of id
    moveCounts: number[],
    moveAnimationTimes: number[][],
  ) => {

    // create local variables for updating TwistyPlayer that don't rely on state
    let sol = solution;
    let scram = scrambleRef.current;
    let animTimes = [0];

    const regex =/[^xyz2']/g;
    if (idIndex === 1) {
      let moveCount = moves.flat(2).filter(move => move.match(regex)).length
      setTotalMoves(moveCount);
    }

    //console.log('tracking moves');
    const movesSame: boolean = JSON.stringify(allMoves.current[idIndex]) === JSON.stringify(moves);

    const newMoveLocation: [number, number, number] = [idIndex, lineIndex, moveIndex];
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
      scram = moves.flat().join(' ');
      scrambleRef.current = scram;  
    }
    else {
      console.log('updating sol');
      sol = moves.flat().join(' ');
      setSolution(sol);
    }

    // set animationTimes to whole list of times up to and including time for move at caret
    moveAnimationTimes = moveAnimationTimes
      .map(line => line.filter(time => time !== 0))
      .filter(line => line.length > 0);

    if(idIndex === 1 && moveAnimationTimes.length > 0) {
      let prevMoveTimes: number[] = [];
      const nonEmptyLineIndexAdjustment = moveIndex === -1 ? 1 : 0;

      // push in moves from previous lines
      for (let i = 0; i < lineIndex + nonEmptyLineIndexAdjustment; i++) {
        if (moveAnimationTimes[i]) prevMoveTimes.push(...moveAnimationTimes[i]);
      }

      // push in moves from current line, up to moveIndex
      for (let j = 0; j < moveIndex; j++) {
        if (moveAnimationTimes[lineIndex] && moveAnimationTimes[lineIndex][j]) {

          prevMoveTimes.push(moveAnimationTimes[lineIndex][j]);
        }
      }
      console.log('updating animation times', prevMoveTimes);
      animTimes = prevMoveTimes;
    }

    if(idIndex === 0) {
      console.log('updating animation times');
      animTimes = [1];
    }


    moveLocation.current = newMoveLocation;
    allMoves.current[idIndex] = [...moves];

    console.log('UPDATING PLAYER PARAMS', animTimes, scram, sol);
    setPlayerParams({animationTimes: animTimes, solution: sol, scramble: scram});
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
    if (scrambleEditorRef.current  && solutionRef.current) {
      scrambleEditorRef.current.undo();
      solutionRef.current.undo();
    }
  }

  const handleRedo = () => {
    if (scrambleEditorRef.current  && solutionRef.current) {
      scrambleEditorRef.current.redo();
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
      scrambleEditorRef.current!.transform(newHTML)

    

  }

  const handleTransform = (transformType: TransformHTMLprops) => {
    oldSelectionRef.current.status = 'locked';

    transformSelection(transformType);

    oldSelectionRef.current.status = 'unlocked';
  }

  const handleMirrorM = () => handleTransform(mirrorHTML_M);
  const handleMirrorS = () => handleTransform(mirrorHTML_S);
  const handleRemoveComments = () => handleTransform(removeComments);

  const handleClearPage = () => {
    scrambleRef.current = '';
    scrambleEditorRef.current?.transform('');
    setSolution('');
    solutionRef.current?.transform('');
    setSolveTime('');
    setSolveTitle('');
    setTotalMoves(0);
    // don't clear moveHistory

    updateURL('title', null);
    updateURL('time', null);
    setTopButtonAlert(["trash", "Page cleared! Undo with Ctrl+Z"]);
  }

  const getTextboxInnerText = (textboxID: string): string => {
    const parentElement = document.getElementById(textboxID);
    const textbox = parentElement!.querySelector<HTMLDivElement>('div[contenteditable="true"]');
    return textbox!.innerText;
  }

  const handleCopySolve = () => {
    const title = solveTitle ? `${solveTitle.trim()}` : '';

    const scramble = getTextboxInnerText('scramble').trim();
    const solution = getTextboxInnerText('solution').trim();

    const time = solveTime ? `${solveTime}` : '';
    const stm = totalMoves ? `${totalMoves} stm` : '';
    let tpsString = '';
    if (tpsRef.current && tpsRef.current !== '(-- tps)') {
      tpsString = tpsRef.current;
    }
    const url = window.location.href;
    let printout = "";

    title ? printout += `${title}\n\n` : '';
    scramble ? printout += `${scramble}\n\n` : '';
    solution ? printout += `Solution:\n${solution}\n\n` : '';

    time ? printout += `${time} sec ` : '';
    stm ? printout += `${stm} ` : '';
    tpsString ? printout += `${tpsString}` : '';
    printout += '\n';

    url ? printout += `\n[View solve on Ao1K](${url})` : '';

    navigator.clipboard.writeText(printout);
    setTopButtonAlert(["copy", "Solve text copied!"]);
  }

  const handleShare = async () => {
    const url = new URL(window.location.href);
    updateURL('scramble', scrambleRef.current);
    updateURL('solution', solution);
    url.searchParams.set('time', solveTime.toString());
    url.searchParams.set('title', solveTitle);

    try {
      await navigator.clipboard.writeText(url.toString());
      setTopButtonAlert(["share", "URL copied!"]);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  }
  
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

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;

    if (e.target.value.length > 100) return;

    // if (e.target.value === '') {
    //   setSolveTime('');
    //   updateURL('time', null);
    //   return;
    // }

    setSolveTitle(title);

    updateURL('title', e.target.value);
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

    if (e.ctrlKey && e.shiftKey && e.key === 'd') {

      e.preventDefault();

      handleCopySolve();
    }

    if (e.ctrlKey && e.key === 'Delete') {

      e.preventDefault();

      handleClearPage();
    }
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);

    const time = urlParams.get('time');
    if (time) {
      setSolveTime(parseFloat(time));
    }

    const title = urlParams.get('title');
    if (title) {
      setSolveTitle(decodeURIComponent(title));
    }

    if (solution) {
      console.log('solution:', solution);
      setPlayerParams(prev => ({ ...prev, solution: solution }));
    }
    if (scrambleRef.current) {
      setPlayerParams(prev => ({ ...prev, scramble: scrambleRef.current }));
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

  const toolbarButtons = [
    { id: 'undo', text: 'Undo', shortcutHint: 'Ctrl+Z', onClick: handleUndo, icon: <UndoIcon />, buttonRef: undoRef },
    { id: 'redo', text: 'Redo', shortcutHint: 'Ctrl+Y', onClick: handleRedo, icon: <RedoIcon />, buttonRef: redoRef },
    { id: 'mirrorM', text: 'Mirror M', shortcutHint: 'Ctrl+M', onClick: handleMirrorM, icon: <MirrorM /> },
    { id: 'mirrorS', text: 'Mirror S', shortcutHint: 'Ctrl+S', onClick: handleMirrorS, icon: <MirrorS /> },
    { id: 'cat', text: 'Angus', shortcutHint: 'Cat', onClick: addCat, icon: <CatIcon /> },
    { id: 'removeComments', text: 'Remove Comments', shortcutHint: 'Ctrl+/ ', onClick: handleRemoveComments, iconText: '// ' },
  ];

  return (
    <div id="main_page" className="col-start-2 col-span-1 flex flex-col bg-dark overflow-x-hidden px-2">
      <div id="top-bar" className="pl-6 pr-5 flex flex-row items-center justify-between space-x-2 mt-8">
        <div className="text-dark_accent text-xl font-medium select-none">Title</div>
        <InputWithPlaceholder solveTitle={solveTitle} handleTitleChange={handleTitleChange} />
        <div className="flex flex-row space-x-1 pr-2 text-dark_accent">
          <TopButton id="trash" text="Clear Page" shortcutHint="Ctrl+Del" onClick={handleClearPage} icon={<TrashIcon />} alert={topButtonAlert} setAlert={setTopButtonAlert}/>
          <TopButton id="copy" text="Copy Solve" shortcutHint="" onClick={handleCopySolve} icon={<CopyIcon />} alert={topButtonAlert} setAlert={setTopButtonAlert}/>
          <TopButton id="share" text="Copy URL" shortcutHint="" onClick={handleShare} icon={<ShareIcon />} alert={topButtonAlert} setAlert={setTopButtonAlert}/>
        </div>
      </div>
      <div id="player-box" className="relative flex flex-col my-4 w-full justify-center items-center">
        <div id="cube-highlight"className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 inset-0 h-full blur-sm bg-primary w-full"></div>
        <div id="cube_model" className="flex aspect-[1.618/1] max-h-96 bg-dark z-10 w-full">
          <TwistyPlayer scramble={playerParams.scramble} solution={playerParams.solution} speed={25} animationTimes={playerParams.animationTimes}/>
        </div>
      </div>
      <div id="bottom-bar" className="flex flex-row space-x-1 text-light w-full items-center" ref={bottomBarRef}>
        <div id="spacer-1" className="flex-1 text-paren"></div>
        <SpeedSlider speed={speed} onChange={handleSpeedChange}/>
        <Toolbar buttons={toolbarButtons} containerRef={bottomBarRef}/>
        <div id="spacer-2" className="flex-1 text-rep"></div>
      </div>
      <div id="datafields" className="pl-6 max-h-[calc(100vh/2.5)] overflow-x-hidden w-full transition-width duration-500 ease-linear flex flex-col justify-center items-center">
        <div className="pr-6 flex flex-col flex-shrink max-w-full w-full overflow-y-auto">
          <div className="flex flex-row items-center">
            <Dropdown targetDiv="scramble"/> 
          </div>
          <div id="scramble">
            <MovesTextEditor
              name={`scramble`}
              ref={scrambleEditorRef}
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
          <div id="solution" className="max-w-full">
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
            <TPSInfo moveCount={totalMoves} solveTime={solveTime} tpsRef={tpsRef} />
            <ReconTimeHelpInfo />
          </div>
          {/* <div className="text-dark_accent text-xl pt-1 font-medium">Review</div> */}
        </div>
      </div>
      <div id="blur-border" className="h-[20px] blur-xl bg-primary mt-1 mb-12"/>
    </div>
  );
}
