'use client';
import debounce from 'lodash.debounce';
import { useState, useRef, useEffect, lazy } from "react";
import MovesTextEditor from "../../components/recon/MovesTextEditor";
import SpeedSlider from "../../components/recon/SpeedSlider";

import Toolbar from "../../components/recon/Toolbar";

import ReconTimeHelpInfo from "../../components/recon/ReconTimeHelpInfo";
import TPSInfo from "../../components/recon/TPSInfo";
import updateURL from "../../composables/recon/updateURL";

import type { EditorRef } from "../../components/recon/MovesTextEditor";

import UndoIcon from "../../components/icons/undo";
import RedoIcon from "../../components/icons/redo";
import CatIcon from "../../components/icons/cat";
import MirrorM from "../../components/icons/mirrorM";
import MirrorS from "../../components/icons/mirrorS";
import TrashIcon from "../../components/icons/trash";
import CopyIcon from "../../components/icons/copy";
import ShareIcon from "../../components/icons/share";

import addCat from "../../composables/recon/addCat";
import { mirrorHTML_M, mirrorHTML_S, removeComments, rotateHTML_X, rotateHTML_Y, rotateHTML_Z } from "../../composables/recon/transformHTML";
import isSelectionInTextbox from "../../composables/recon/isSelectionInTextbox";
import { TransformHTMLprops } from "../../composables/recon/transformHTML";

import TitleWithPlaceholder from "../../components/recon/TitleInput";
import TopButton from "../../components/recon/TopButton";
import { customDecodeURL } from '../../composables/recon/urlEncoding';
import getDailyScramble from '../../composables/recon/getDailyScramble';

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

const TwistyPlayer = lazy(() => import("../../components/TwistyPlayer"));

export default function Recon() {
  const allMoves = useRef<string[][][]>([[[]], [[]]]);
  const moveLocation = useRef<[number, number, number]>([0, 0, 0]);

  const [speed, setSpeed] = useState<number>(25); // allows debounced speed updates to Player
  const [localSpeed, setLocalSpeed] = useState<number>(25); // allows smooth slider input rendering

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
  const solutionEditorRef = useRef<EditorRef>(null);
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
      //console.log('nonEmptyLineIndexAdjustment', nonEmptyLineIndexAdjustment);
      //console.log('lineIndex', lineIndex);

      // push in moves from previous lines
      for (let i = 0; i < lineIndex + nonEmptyLineIndexAdjustment; i++) {
        //console.log('movesAnimationTimes[i]', moveAnimationTimes[i]);
        if (moveAnimationTimes[i]) prevMoveTimes.push(...moveAnimationTimes[i]);
      }
      //console.log('prevMoveTimes', prevMoveTimes);

      // push in moves from current line, up to moveIndex
      //console.log('moveIndex', moveIndex);
      for (let j = 0; j < moveIndex; j++) {
        if (moveAnimationTimes[lineIndex] && moveAnimationTimes[lineIndex][j]) {
          prevMoveTimes.push(moveAnimationTimes[lineIndex][j]);
        }
      }
      //console.log('updating animation times', prevMoveTimes);
      animTimes = prevMoveTimes;
    }

    if(idIndex === 0) {
      animTimes = [1];
    }


    moveLocation.current = newMoveLocation;
    allMoves.current[idIndex] = [...moves];

    setPlayerParams({animationTimes: animTimes, solution: sol, scramble: scram});
  }



  const debouncedSetSpeed = debounce((value: number) => {
    setSpeed(value);
  }, 300);

  const handleSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    setLocalSpeed(value); // Update the local state immediately
    debouncedSetSpeed(value); // Debounce the state update
  };

  const handleSolveTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const regex = /^\d{0,5}(\.\d{1,3})?$/;

    if (!regex.test(value)) {
      return;
    }

    if (value === '') {
      setSolveTime('');
      updateURL('time', 'undefined');
      return;
    }

    setSolveTime(parseFloat(value));
    updateURL('time', value);
  }

  const handleUndo = () => {
    if (scrambleEditorRef.current  && solutionEditorRef.current) {
      scrambleEditorRef.current.undo();
      solutionEditorRef.current.undo();
    }
  }

  const handleRedo = () => {
    if (scrambleEditorRef.current  && solutionEditorRef.current) {
      scrambleEditorRef.current.redo();
      solutionEditorRef.current.redo();
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

      const parentElement = document.getElementById(textboxID); // either "scramble" or "solution"
      const textbox = parentElement!.querySelector<HTMLDivElement>('div[contenteditable="true"]');
      let range = document.createRange();
      range.selectNodeContents(textbox!);
      return range;

  }

  const getLastRangeAndTextbox = (): { range: Range | null, textbox: string | null } => {
    let range = oldSelectionRef.current.range;
    let textbox = oldSelectionRef.current.textbox;

    if (range && textbox) {
      return { range, textbox };
    } else if (!range && textbox) {
      range = getWholeTextboxRange(textbox);
      return { range, textbox };
    } else {
      range = getWholeTextboxRange('solution');
      textbox = 'solution';
      return { range, textbox };
    }
  };

  const transformSelection = (transformType: TransformHTMLprops) => {

    const { range, textbox } = getLastRangeAndTextbox();

    if (!range || !textbox) return;

    let newHTML = transformType(range, textbox!) ?? '';

    textbox === 'solution' ? 
      solutionEditorRef.current!.transform(newHTML) : // can handle html or plaintext
      scrambleEditorRef.current!.transform(newHTML)
  }

  const handleTransform = (transformType: TransformHTMLprops) => {
    oldSelectionRef.current.status = 'locked';

    transformSelection(transformType);

    oldSelectionRef.current.status = 'unlocked';
  }

  const handleMirrorM = () => handleTransform(mirrorHTML_M);
  const handleMirrorS = () => handleTransform(mirrorHTML_S);
  const handleRotateX = () => handleTransform(rotateHTML_X);
  const handleRotateY = () => handleTransform(rotateHTML_Y);
  const handleRotateZ = () => handleTransform(rotateHTML_Z);

  const handleRemoveComments = () => handleTransform(removeComments);

  const handleClearPage = () => {
    scrambleRef.current = '';
    scrambleEditorRef.current?.transform('');
    setSolution('');
    solutionEditorRef.current?.transform('');
    setSolveTime('');
    setSolveTitle('');
    setTotalMoves(0);
    // don't clear moveHistory

    updateURL('title', null);
    updateURL('time', null);
    setTopButtonAlert(["trash", "Page cleared! Undo with Ctrl+Z"]);
  }

  const handleAddCat = () => {
    const { range , textbox} = getLastRangeAndTextbox()

    if (!range || !textbox) return;

    range!.collapse(false); // collapse to end of selection
    addCat(range, textbox)
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
    await new Promise(resolve => setTimeout(resolve, 500)); // wait for scramble and solution to finish updating:
    // There's definitely a more clever way of updating it right away.
    // Tried using useImperativeHandle to force updateURL to run. Didn't appear to cause a timely update.

    try {
      const currentURL = window.location.href;
      navigator.clipboard.writeText(currentURL);
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
      //console.log('selection is locked');
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

  const showDailyScramble = async () => {

    try {
      const data = await getDailyScramble(new Date());

      if (data === undefined) {
        console.error('No daily scramble found.');
        return;
      }

      console.log('daily scramble:', data);
      return;
      
      
      // const scrambleMessage = `<div><span class="text-gray-500">//&nbsp;Scramble&nbsp;of&nbsp;the&nbsp;day:</span></div><div><span class="text-light">${dailyScramble}</span></div>`;
      // scrambleEditorRef.current?.transform(scrambleMessage); // force update inside MovesTextEditor

    } catch (error) {
      console.error('Failed to get daily scramble:', error);
    }
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;

    if (e.target.value.length > 100) return;

    setSolveTitle(title);

    updateURL('title', e.target.value);
  }

  const handleCommand = (e: KeyboardEvent) => {

    if (e.ctrlKey && e.key === 'm') {
    
      e.preventDefault();

      handleMirrorM();
    }

    if (e.ctrlKey && e.key === 's') {

      e.preventDefault();

      handleMirrorS();
    }

    if (e.ctrlKey && e.shiftKey && e.key === 'S') {

      e.preventDefault();

      handleShare();
    }

    if (e.ctrlKey && e.shiftKey && e.key === 'X') {

      e.preventDefault();

      handleRotateX();
    }

    if (e.ctrlKey && e.shiftKey && e.key === 'Y') {

      e.preventDefault();

      handleRotateY();
    }

    if (e.ctrlKey && e.shiftKey && e.key === 'Z') {

      e.preventDefault();

      handleRotateZ();
    }

    if (e.ctrlKey && e.key === '/') {

      e.preventDefault();

      handleRemoveComments();
    }

    if (e.ctrlKey && e.key === 'q') {

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
      const parsedTime = parseFloat(time);
      if (!isNaN(parsedTime)) {
        setSolveTime(parsedTime);
      }
    }

    const title = urlParams.get('title');
    if (title) {
      setSolveTitle(decodeURIComponent(customDecodeURL(title)));
    }

    if (solution) {
      setPlayerParams(prev => ({ ...prev, solution: solution }));
    }
    if (scrambleRef.current) {
      setPlayerParams(prev => ({ ...prev, scramble: scrambleRef.current }));
    }

    if (!Array.from(urlParams.values()).filter(val => val !== '').length) { 
      // if no URL query values or empty string values, then show daily scramble
      showDailyScramble();
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
    { id: 'rotateX', text: 'Rotate X', shortcutHint: 'Ctrl+Shift+X', onClick: handleRotateX, iconText: "X" },
    { id: 'rotateY', text: 'Rotate Y', shortcutHint: 'Ctrl+Shift+Y', onClick: handleRotateY, iconText: "Y" },
    { id: 'rotateZ', text: 'Rotate Z', shortcutHint: 'Ctrl+Shift+Z', onClick: handleRotateZ, iconText: "Z" },
    { id: 'cat', text: 'Angus', shortcutHint: 'Cat', onClick: handleAddCat, icon: <CatIcon /> },
    { id: 'removeComments', text: 'Remove Comments', shortcutHint: 'Ctrl+/ ', onClick: handleRemoveComments, iconText: '// ' },
  ];

  return (
    <div id="main_page" className="col-start-2 col-span-1 flex flex-col bg-dark">
      <div id="top-bar" className="px-3 flex flex-row flex-wrap items-center place-content-end gap-2 mt-8 mb-3">
        <TitleWithPlaceholder solveTitle={solveTitle} handleTitleChange={handleTitleChange} />
        <div className="flex-none flex flex-row space-x-1 pr-2 text-dark_accent">
          <TopButton id="trash" text="Clear Page" shortcutHint="Ctrl+Del" onClick={handleClearPage} icon={<TrashIcon />} alert={topButtonAlert} setAlert={setTopButtonAlert}/>
          <TopButton id="copy" text="Copy Solve" shortcutHint="Ctrl+Q" onClick={handleCopySolve} icon={<CopyIcon />} alert={topButtonAlert} setAlert={setTopButtonAlert}/>
          <TopButton id="share" text="Copy URL" shortcutHint="Ctrl+Shift+S" onClick={handleShare} icon={<ShareIcon />} alert={topButtonAlert} setAlert={setTopButtonAlert}/>
        </div>
      </div> {/* place-content-end works best to keep command success popup and tool hint popup on screen */}
      <div id="scramble-area" className="px-3 mt-3 flex flex-col">
        <div className="text-xl text-dark_accent font-medium">Scramble</div>
        <div id="scramble">
              <MovesTextEditor
                name={`scramble`}
                ref={scrambleEditorRef}
                trackMoves={trackMoves}
                autofocus={false}
                moveHistory={moveHistory}
                updateHistoryBtns={handleHistoryBtnUpdate}
                html={scrambleHTML}
                setHTML={setScrambleHTML}
              />
        </div>
      </div>
      <div id="player-box" className="px-3 relative flex flex-col my-6 w-full justify-center items-center">
        <div id="cube-highlight" className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-full blur-sm bg-primary w-[calc(100%-1.5rem)]"></div>
        <div id="cube_model" className="flex aspect-video h-full max-h-96 bg-dark z-10 w-full">
          <TwistyPlayer scramble={playerParams.scramble} solution={playerParams.solution} speed={speed} animationTimes={playerParams.animationTimes}/>
        </div>
      </div>
      <div id="bottom-bar" className="px-3 static flex flex-row items-center place-content-end justify-center text-light w-full" ref={bottomBarRef}>
        <SpeedSlider speed={localSpeed} onChange={handleSpeedChange}/>
        <Toolbar buttons={toolbarButtons} containerRef={bottomBarRef}/>
      </div>
      <div id="datafields" className="max-h-[calc(100vh/4)] overflow-y-auto w-full items-start transition-width duration-500 ease-linear">
        <div id="solution-area" className="px-3 mt-3 mb-6 flex flex-col w-full">
          <div className="text-xl text-dark_accent font-medium w-full">Solution</div>
          <div id="solution">
            <MovesTextEditor 
              name={`solution`}
              ref={solutionEditorRef} 
              trackMoves={trackMoves} 
              autofocus={true} 
              moveHistory={moveHistory}
              updateHistoryBtns={handleHistoryBtnUpdate}
              html={solutionHTML}
              setHTML={setSolutionHTML}
            />
          </div>
        </div>
        <div id="time-area" className="px-3 flex flex-col w-full">
          <div className="text-xl text-dark_accent font-medium w-full">Time</div>
          <div id="time-stats" className="flex flex-row flex-wrap text-nowrap items-center mb-4 w-full gap-y-2">
          <div id="time-field" className="border border-light flex flex-row items-center justify-start">
            <input
              id="time-input"
              type="number" 
              placeholder="00.000" 
              className="pt-2 pb-2 pl-2 text-xl text-light bg-dark focus:outline-none rounded-sm box-content no-spinner w-[4.25rem]"
              value={solveTime}
              onChange={handleSolveTimeChange}
              onWheel={(e) => e.currentTarget.blur()}
              autoComplete="off"
              />
            <div className="text-light ml-2 pr-2 text-xl">sec</div> 
          </div>
          <div className="text-light ml-2 text-xl">{totalMoves} stm </div> 
          <div className="flex-nowrap text-nowrap items-center flex flex-row">
            <TPSInfo moveCount={totalMoves} solveTime={solveTime} tpsRef={tpsRef} />
            <ReconTimeHelpInfo />
          </div>
        </div>
        </div>
      </div>
      <div id="blur-border" className="h-[20px] blur-xl bg-primary mt-1 mb-12"/>
    </div>
  );
}
