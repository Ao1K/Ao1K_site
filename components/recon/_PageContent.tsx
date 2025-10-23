'use client';
import debounce from 'lodash.debounce';
import HiddenPlayer from './HiddenPlayer';
import { useState, useRef, useEffect, lazy, Suspense, useCallback, Profiler, useMemo } from 'react';
import MovesTextEditor from "../../components/recon/MovesTextEditor";
import SpeedDropdown from "../../components/recon/SpeedDropdown";

import Toolbar from "../../components/Toolbar";
import Footer from "../../components/Footer"; 
import ReconTimeHelpInfo from "../../components/recon/ReconTimeHelpInfo";
import TPSInfo from "../../components/recon/TPSInfo";
import updateURL from "../../composables/recon/updateURL";

import type { ImperativeRef } from "../../components/recon/MovesTextEditor";
import type { Object3D } from 'three';

import UndoIcon from "../../components/icons/undo";
import RedoIcon from "../../components/icons/redo";
import CatIcon from "../../components/icons/cat";
import TrashIcon from "../../components/icons/trash";
import CopyIcon from "../../components/icons/copy";
import ShareIcon from "../../components/icons/share";
import InvertIcon from "../../components/icons/invert";

import Cookies from 'js-cookie';

import addCat from "../../composables/recon/addCat";
import { mirrorHTML_M, mirrorHTML_S, removeComments, rotateHTML_X, rotateHTML_Y, rotateHTML_Z, invertHTML } from "../../composables/recon/transformHTML";
import isSelectionInTextbox from "../../composables/recon/isSelectionInTextbox";
import { TransformHTMLprops } from "../../composables/recon/transformHTML";

import TitleWithPlaceholder from "../../components/recon/TitleInput";
import TopButton from "../../components/recon/TopButton";
import CopySolveDropdown from "../../components/recon/CopySolveDropdown";
import { customDecodeURL } from '../../composables/recon/urlEncoding';
import getDailyScramble from '../../composables/recon/getDailyScramble';
import VideoHelpPrompt from '../../components/recon/VideoHelpPrompt';
import ImageStack from '../recon/ImageStack';
import { CubeInterpreter } from '../../composables/recon/CubeInterpreter';
import type { StepInfo } from '../../composables/recon/CubeInterpreter';
import { AlgCompiler } from '../../utils/AlgCompiler';
import LLpatternBuilder from '../../utils/LLpatternBuilder';

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

export type PlayerParams = { animationTimes: number[]; solution: string; scramble: string };


export interface ControllerRequestOptions {
  type: 'fullLeft' | 'stepLeft' | 'pause' | 'play' | 'replay' | 'stepRight' | 'fullRight';
}

const TwistyPlayer = lazy(() => import("../../components/recon/TwistyPlayer"));

export default function Recon() {
  const allMovesRef = useRef<string[][][]>([[[]], [[]]]);
  const moveLocation = useRef<[number, number, number]>([0, 0, 0]);

  const [speed, setSpeed] = useState<number>(30); // allows debounced speed updates to Player
  const [localSpeed, setLocalSpeed] = useState<number>(30) // artifact from when speed was a slider. TODO: Can be removed.

  const scrambleRef = useRef<string>(''); // TODO: eliminate and use allMovesRef[0] instead
  const [solution, setSolution] = useState<string>(''); // TODO: eliminate and use allMovesRef[1] instead
  const [totalMoves, setTotalMoves] = useState<number>(0);
  const [solveTime, setSolveTime] = useState<number|string>('');
  const [solveTitle, setSolveTitle] = useState<string>('');
  const [topButtonAlert, setTopButtonAlert] = useState<[string, string]>(["", ""]); // [id, alert msg]
  const [isTextboxFocused, setIsTextboxFocused] = useState<boolean>(false);
  const [isShowingBottomBar, setIsShowingBottomBar] = useState<boolean>(true);

  const [scrambleHTML, setScrambleHTML] = useState<string>('');
  const [solutionHTML, setSolutionHTML] = useState<string>('');
  
  const [playerParams, setPlayerParams] = useState<PlayerParams>({ animationTimes: [], solution: '', scramble: '' });

  const tpsRef = useRef<HTMLDivElement>(null!);
  const scrambleMethodsRef = useRef<ImperativeRef>(null);
  const solutionMethodsRef = useRef<ImperativeRef>(null);
  const undoRef = useRef<HTMLButtonElement>(null!);
  const redoRef = useRef<HTMLButtonElement>(null!);
  const oldSelectionRef = useRef<OldSelectionRef>({ range: null, textbox: null,  status: "init" });
  const bottomBarRef = useRef<HTMLDivElement>(null!);
  const cubeRef = useRef<Object3D | null>(null); // todo: delete
  const hiddenCubeRef = useRef<Object3D | null>(null);
  const isLoopingRef = useRef<boolean>(false);
  const loopTimeoutRef = useRef<number|null>(null);
  const lineStepsRef = useRef<StepInfo[][]>([]);
  const acceptedSuggestionsRef = useRef<Map<number, { alg: string; name?: string; step: string }>>(new Map());
  const clearLoopTimeout = useCallback(() => {
    if (loopTimeoutRef.current !== null) {
      clearTimeout(loopTimeoutRef.current);
      loopTimeoutRef.current = null;
    }
  }, []);

  const MAX_EDITOR_HISTORY = 100;
  const moveHistory = useRef<MoveHistory>({ history: [['','']], index: 0, MAX_HISTORY: MAX_EDITOR_HISTORY, status: 'loading' });

  const [controllerButtonsStatus, setControllerButtonsStatus] = useState<{ fullLeft: string, stepLeft: string, stepRight: string, fullRight: string, playPause: string }>({
    fullLeft: 'disabled',
    stepLeft: 'disabled',
    stepRight: 'disabled',
    fullRight: 'disabled',
    playPause: 'disabled'
  });

  const cubeInterpreter = useRef<CubeInterpreter | null>(null);


  /**
   * Finds the first non-empty line at or before the given line index.
   * Returns -1 if no non-empty line is found.
   */
  const findPrevNonEmptyLine = (moves: string[][], lineIndex: number): number => {
    for (let i = lineIndex; i >= 0; i--) {
      if (moves && moves[i]?.length > 0) {
        return i;
      }
    }
    return -1;
  }

  const updateTotalMoves = (moves: string[][]) => {
    const regex =/[^xyz2']/g;
    let moveCount = moves.flat(2).filter(move => move.match(regex)).length
    setTotalMoves(moveCount);
  }

  const findLastMoveInLine = (moves: string[][], lineIndex: number): number => {
    const lastMoveIndex = moves[lineIndex] ? moves[lineIndex].length : -1; // not length - 1 because it's the number of moves before the caret
    return lastMoveIndex;
  }

  /**
   * Starting from first line of interest, find first line that has a move.
   * If no line has a move, return -1.
   */
  const findLineOfNextMove = (moves: string[][], lineIndex: number): number => {
    for (let i = lineIndex; i < moves.length; i++) {
      if (moves[i] && moves[i].length > 0) {
        return i;
      }
    }
    return -1; // no next move found
  }

  const compareMoves = (currentMoves: string[][], moves: string[][]): boolean => {
    if (currentMoves.length !== moves.length) {
      return false;
    }
    
    for (let i = 0; i < currentMoves.length; i++) {
      const currentLine = currentMoves[i];
      const newLine = moves[i];
      
      if (!newLine || currentLine.length !== newLine.length) {

        return false;
      }
      
      for (let j = 0; j < currentLine.length; j++) {
        if (currentLine[j] !== newLine[j]) {
          return false;
        }
      }
    }
    
    return true;
  };

  const movesAndIndexSame = (moves: string[][], idIndex: number, lineIndex: number, moveIndex: number): boolean => {

    const currentMoves = allMovesRef.current[idIndex];

    const movesSame = compareMoves(currentMoves, moves);

    const newMoveLocation: [number, number, number] = [idIndex, lineIndex, moveIndex];
    const moveIndexSame = 
        moveLocation.current[0] === newMoveLocation[0] 
     && moveLocation.current[1] === newMoveLocation[1] 
     && moveLocation.current[2] === newMoveLocation[2];

    return movesSame && moveIndexSame;
  }

  const initMoves = (moves: string[][], idIndex: number): [string, string] => {
    let sol = "";
    let scram = "";

    // get current values, set reference variable (useRef, useState) to current 
    if (idIndex === 0) {
      scram = moves.flat().join(' ');
      sol = solution;
      scrambleRef.current = scram;  
    }
    else {
      sol = moves.flat().join(' ');
      scram = scrambleRef.current;
      setSolution(sol);
    }

    return [sol, scram];
  }

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
   * Calculates the cumulative animation times for moves up to a specific position in the move sequence.
   * Returns [1] if scramble is selected. 
   * Returns [0] if there are no moves in the solution.
   */
  const findAnimationTimes = (idIndex: number, lineIndex: number, moveIndex: number, moves: string[][]): number[] => {
    
    if (idIndex === 0) {
      return [1]; // scramble moves are not animated
    }

    // hereafter assume working on solution moves

    if (!moves || moves.length === 0) {
      return [0];
    }

    let newMoveTimes: number[] = [];

    // push in moves from previous lines
    for (let i = 0; i < lineIndex; i++) {
      const lineTimes = findAnimationLengths(moves[i]);
      const isEmptyLine = 
        lineTimes === undefined || 
        (lineTimes?.every(time => time === 0) && lineTimes.length === 1);
      if (lineTimes && !isEmptyLine) newMoveTimes.push(...lineTimes);
    }

    // push in moves from current line, up to but not including moveIndex
    const selectedLineAnimationTimes = findAnimationLengths(moves[lineIndex]);
    for (let j = 0; j < moveIndex; j++) {
      const time = selectedLineAnimationTimes[j];
      const isEmptyMove = 
        time === 0 || 
        time === undefined; // could be undefined if there's a mismatch between moves and moveIndex
      if (time === undefined) { console.warn(`Undefined time at line ${lineIndex}, move ${j}.`); }
      if (selectedLineAnimationTimes && !isEmptyMove) {
        newMoveTimes.push(time);
      }
    }

    return newMoveTimes;
    
  };

  const memoizedHighlightMove = useCallback((moveIndex: number, lineIndex: number) => {
    solutionMethodsRef.current?.highlightMove(moveIndex, lineIndex);
  }, []);

  const memoizedRemoveHighlight = useCallback(() => {
    solutionMethodsRef.current?.removeHighlight();
  }, []);

  const getMoveToLeft = (): [number, number] => {
    const [idIndex, lineIndex, moveIndex] = moveLocation.current;
    const moves = allMovesRef.current[idIndex];

    if (idIndex === 0) {
      return [-1, -1]; // can't go left in scramble textbox
    } else if (lineIndex === 0 && moveIndex === 0) {
      return [-1, -1]; // already at the start of solution
    }

    if (moveIndex > 0) {
      return [lineIndex, moveIndex - 1]; // just step back one move
    } else {
      // go to the end of the previous line
      const prevLineIndex = findPrevNonEmptyLine(moves, lineIndex - 1);
      const lastMoveInPrevLine = findLastMoveInLine(moves, prevLineIndex);
      return [prevLineIndex, lastMoveInPrevLine];
    }
  }

  const getMoveToRight = (moves?: string[][]): [number, number] => {
    const [idIndex, lineIndex, moveIndex] = moveLocation.current;
    const solutionMoves = moves ? moves : allMovesRef.current[1];

    if (!solutionMoves || solutionMoves.length === 0 || solutionMoves.every(line => !line || line.length === 0)) {
      console.warn('No solution moves found.');
      return [-1, -1]; // no moves in solution. Button should have been greyed out.
    }

    if (idIndex === 0) {
      // if in scramble textbox, go to first move in solution
      const firstLineWithMove = findLineOfNextMove(solutionMoves, 0);
      return [firstLineWithMove, 1]; // go to first move in solution
    }


    if (solutionMoves[lineIndex] && moveIndex < solutionMoves[lineIndex].length) {
      return [lineIndex, moveIndex + 1]; // just step forward one move
    } else {

      const nextLineIndex = findLineOfNextMove(solutionMoves, lineIndex + 1);
      if (nextLineIndex === -1) {
        return [-1, -1]; // no next move, stay in place
      } else {
        return [nextLineIndex, 0]; // go to first move in next line
      }
    }

  }

  /**
   * get the last move in the solution textbox
   */
  const getLastMoveInSolution = (): [number, number] => {
    
    const moves = allMovesRef.current[1];

    // get last line. 
    // If there's no moves on that line, then it wil be handled by trackMoves.
    const lastLineWithMove = moves.length - 1; 
    if (lastLineWithMove === -1) {
      console.warn('No moves found in solution.');
      return [-1, -1]; // no moves in solution
    }

    // find last move in last line
    const lastMoveInLastLine = findLastMoveInLine(moves, lastLineWithMove);
    return [lastLineWithMove, lastMoveInLastLine];
  }

  const stopLoopStepRight = () => {
    let [lineIndex, moveIndex] = getMoveToRight();
    let playPauseStatus = 'disabled';
    
    if (lineIndex !== -1 && moveIndex !== -1) {
      playPauseStatus = 'pause'; // can step right
    } else {
      playPauseStatus = 'replay'; // no more moves to step right
    }
    if (allMovesRef.current[1].length === 0) { // override if no solution moves
      playPauseStatus = 'disabled'
    }

    setControllerButtonsStatus((controllerButtonsStatus) => (
      { ...controllerButtonsStatus, playPause: playPauseStatus }
    ));
  }

  const loopStepRight = (location: [number, number, number] | null) => {
    if (!isLoopingRef.current) {
      stopLoopStepRight();
      return; // player is not playing, do not step right
    }

    let [idIndex, lineIndex, moveIndex] = location || moveLocation.current;
      
    
    [lineIndex, moveIndex] = getMoveToRight();
    if (lineIndex === -1 || moveIndex === -1) {
      // no more moves to step right
      
      // assure that controller buttons states are up to date
      const playPauseStatus = allMovesRef.current[1].length === 0 ? 'disabled' : 'replay';
      setControllerButtonsStatus((controllerButtonsStatus) => (
        { ...controllerButtonsStatus, stepRight: 'disabled', fullRight: 'disabled', playPause: playPauseStatus }
      ));
      
      // there may be race conditions with this, but minor and rare
      memoizedRemoveHighlight();

      return; 
    }
    
    memoizedTrackMoves(1, lineIndex, moveIndex, allMovesRef.current[1], 'play');
    
    // const animationTimes = playerParams.animationTimes;
    // const solutionMovesBefore = countMovesBeforeIndex(1);
    // const timeToWait = animationTimes[solutionMovesBefore] || 1000;
    
    loopTimeoutRef.current = window.setTimeout(() => {
      loopStepRight([1, lineIndex, moveIndex]);
    // }, timeToWait); 
    // moves with large animation times don't actually take longer. 
    // Re-implement timeToWait if this changes
    }, 1000 - (5 * speed));
  }


  const handleControllerRequest = (request: ControllerRequestOptions) => {
    clearLoopTimeout();
    let [_, lineIndex, moveIndex] = moveLocation.current;
    if (request.type !== 'play' && request.type !== 'replay') {
      isLoopingRef.current = false;
    } else {
      isLoopingRef.current = true;
    }

    switch (request.type) {
      case 'fullLeft':
        memoizedTrackMoves(1, 0, 0, allMovesRef.current[1], 'fullLeft');
        break;
      case 'stepLeft':
        [lineIndex, moveIndex] = getMoveToLeft();
        if (lineIndex !== -1 || moveIndex !== -1) {
          memoizedTrackMoves(1, lineIndex, moveIndex, allMovesRef.current[1], 'stepLeft');
        }
        break;
      case 'pause':
        setControllerButtonsStatus((controllerButtonsStatus) => (
          { ...controllerButtonsStatus, playPause: 'pause' }
        ));
        break;
      case 'play':
        loopStepRight(null);
        setControllerButtonsStatus((controllerButtonsStatus) => (
          { ...controllerButtonsStatus, playPause: 'play' }
        ));
        break;
      case 'replay':
        memoizedTrackMoves(1, 0, 0, allMovesRef.current[1], 'play'); // reset to start of solution

        setTimeout(() => {
          setControllerButtonsStatus((controllerButtonsStatus) => (
            { ...controllerButtonsStatus, playPause: 'play' }
          ));

          loopStepRight(null);
        }, 1000);
        break;
      case 'stepRight':
        [lineIndex, moveIndex] = getMoveToRight();
        if (lineIndex !== -1 || moveIndex !== -1) {
          memoizedTrackMoves(1, lineIndex, moveIndex, allMovesRef.current[1], 'stepRight');
        }
        break;
      case 'fullRight':
        [lineIndex, moveIndex] = getLastMoveInSolution();
        memoizedTrackMoves(1, lineIndex, moveIndex, allMovesRef.current[1], 'fullRight');
        break;
      default:
        console.warn('Unknown controller request type:', request.type);
        return;
    }
  }

  const getControllerButtonsStatus = (idIndex: number, lineIndex: number, moveIndex: number, moves: string[][], playPauseStatus: string): 
  { 
    fullLeft: string, stepLeft: string, stepRight: string, fullRight: string, playPause: string 
  } => {
    let fullLeft = 'disabled';
    let stepLeft = 'disabled';
    let playPause = 'disabled';
    let stepRight = 'disabled';
    let fullRight = 'disabled';


    let isMoveToRight = false;
    const solutionMoves = idIndex === 1 ? moves : allMovesRef.current[1];
    const isSolutionMoves = solutionMoves 
      && solutionMoves.length > 0 
      && solutionMoves.some(line => line && line.length > 0);

    if (isSolutionMoves) {

      // handle left buttons status
      const [prevLine, prevMove] = getMoveToLeft();
      if (prevLine !== -1 || prevMove !== -1) {
        stepLeft = 'enabled';
        fullLeft = 'enabled';
      }

      // handle right buttons status
      const [nextLine, nextMove] = getMoveToRight(solutionMoves);
      if (nextLine !== -1 || nextMove !== -1) {
        stepRight = 'enabled';
        fullRight = 'enabled';
        isMoveToRight = true;
      }
    }

    // handle play pause button status
    // Note: the status is what the player should currently be doing, 
    // not what the button should look like.
    // so if the player should be paused,
    // the status is 'pause'
    if (!solutionMoves) {
      playPause = 'disabled';
    } else {

      switch (playPauseStatus) {
        case 'play':
          if (isSolutionMoves && isMoveToRight) {
            playPause = 'play';
          } else if (isSolutionMoves && !isMoveToRight) {
            playPause = 'replay';
          }
          break;
        case 'pause':
          if (isSolutionMoves && isMoveToRight) {
            playPause = 'pause';
          } else if (isSolutionMoves && !isMoveToRight) {
            playPause = 'replay';
          }
          break;
        case 'replay':
          if (isSolutionMoves && isMoveToRight) {
            playPause = 'pause';
          } else if (isSolutionMoves && !isMoveToRight) {
            playPause = 'replay';
          }
          break;
        case 'disabled':
          if (isSolutionMoves && isMoveToRight) {
            playPause = 'pause';
          } else if (isSolutionMoves && !isMoveToRight) {
            playPause = 'replay';
          }
          break;
        default:
          console.warn('Unknown playPauseStatus:', playPauseStatus);
          playPause = 'disabled';
          break;
      }
    }
    return { fullLeft, stepLeft, stepRight, fullRight, playPause }
  };

  const handleNewlineSuggestions = () => {
    if (!solutionMethodsRef.current || !cubeInterpreter.current) return;
    const suggestions = cubeInterpreter.current.getAlgSuggestions();
    console.log('suggestions:', suggestions);
    if (suggestions && suggestions.length > 0) {
      const firstSuggestion = suggestions[0];
      solutionMethodsRef.current.showSuggestion(firstSuggestion.alg);
      
      // Track the suggestion metadata for later use in comment generation
      const currentLineIndex = moveLocation.current[1] + 1; // TODO: need to use different method to get current line. moveLocation may be up-to-date, meaning no +1.
      acceptedSuggestionsRef.current.set(currentLineIndex, {
        alg: firstSuggestion.alg,
        name: firstSuggestion.name,
        step: firstSuggestion.step
      });
    }
  }


  const memoizedTrackMoves = useCallback(
    (
      idIndex: number, 
      lineIndex: number, // the line number of the caret, zero-indexed
      moveIndex: number, // the number of moves before the caret on its line 
      moves: string[][], // the moves in the textbox of id
      moveControllerStatus?: string // the current status of loopStepRight
    ) => {
      // console.log('Tracking moves:', idIndex, lineIndex, moveIndex, moves, moveControllerStatus);
      // console.trace()
      
      if (moveControllerStatus !== 'play') {
        isLoopingRef.current = false; // break out of loopStepRight when status changes
      }

      const isLineEmpty = moves[lineIndex]?.length === 0;
      if (isLineEmpty) {

        // don't show any suggestions on 0th line (0th line is usually not algorithmic)
        lineIndex === 0 ? null : handleNewlineSuggestions();

        // pretend caret is at end of the last line that has a move
        const adjustedLineIndex = findPrevNonEmptyLine(moves, lineIndex);
        const adjustedMoveIndex = findLastMoveInLine(moves, adjustedLineIndex);

        if (adjustedLineIndex !== -1 && adjustedMoveIndex !== -1) {
          lineIndex = adjustedLineIndex;
          moveIndex = adjustedMoveIndex;
        }
      }

      if (movesAndIndexSame(moves, idIndex, lineIndex, moveIndex)) {
        // console.log('Moves and index are the same, skipping update.');
        return;
      }

      if (lineIndex === -1 || moveIndex === -1) {
        // handles invalid ControllerRequests
        return;
      }

      idIndex === 1 ? updateTotalMoves(moves) : null;
      let [sol, scram] = initMoves(moves, idIndex);

      if (idIndex === 1 && moveControllerStatus) memoizedHighlightMove(moveIndex, lineIndex);

      let limitedTimes = findAnimationTimes(idIndex, lineIndex, moveIndex, moves);
      moveLocation.current = [idIndex, lineIndex, moveIndex];
      

      let newMoves = [...allMovesRef.current];
      newMoves[idIndex] = [...moves];
      allMovesRef.current = newMoves;

      setIsTextboxFocused(true);
      setPlayerParams({animationTimes: limitedTimes, solution: sol, scramble: scram});

      const validPlayPauseStatuses = ['play', 'pause', 'replay', 'disabled'];
      const playPauseStatus = 
        (moveControllerStatus && validPlayPauseStatuses.includes(moveControllerStatus))? 
        moveControllerStatus : controllerButtonsStatus.playPause;

      const controllerButtonsEnabled = getControllerButtonsStatus(idIndex, lineIndex, moveIndex, newMoves[idIndex], playPauseStatus);
      setControllerButtonsStatus(controllerButtonsEnabled)

  }, [scrambleRef, memoizedHighlightMove, setPlayerParams, solution, setControllerButtonsStatus]);

  const memoizedSetScrambleHTML = useCallback((html: string) => {
    setScrambleHTML(html);
  }, []);

  const memoizedSetSolutionHTML = useCallback((html: string) => {
    setSolutionHTML(html);
  }, []);

  const memoizedUpdateHistoryBtns = useCallback(() => {
    handleHistoryBtnUpdate();
  }, []);

  const debouncedSetSpeed = debounce((value: number) => {
    setSpeed(value);
  }, 300);

  const handleSpeedChange = (speed: number) => {
    setLocalSpeed(speed); // Update the local state immediately
    debouncedSetSpeed(speed); // Debounce the state update
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
    if (scrambleMethodsRef.current  && solutionMethodsRef.current) {
      scrambleMethodsRef.current.undo();
      solutionMethodsRef.current.undo();
    }
  }

  const handleRedo = () => {
    if (scrambleMethodsRef.current  && solutionMethodsRef.current) {
      scrambleMethodsRef.current.redo();
      solutionMethodsRef.current.redo();
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
        ref.current.classList.remove("text-primary-100");
        ref.current.classList.add("text-neutral-700", "pointer-events-none");
      } else {
        ref.current.removeAttribute("disabled");
        ref.current.classList.remove("text-neutral-700", "pointer-events-none");
        ref.current.classList.add("text-primary-100");
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
      solutionMethodsRef.current!.transform(newHTML) : // can handle html or plaintext
      scrambleMethodsRef.current!.transform(newHTML)
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
  const handleInvert = () => handleTransform(invertHTML);

  const handleRemoveComments = () => handleTransform(removeComments);

  const handleClearPage = () => {
    scrambleRef.current = '';
    scrambleMethodsRef.current?.transform('');
    setSolution('');
    solutionMethodsRef.current?.transform('');
    setSolveTime('');
    setSolveTitle('');
    setTotalMoves(0);
    lineStepsRef.current = []; // Clear line steps tracking
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
    const textboxClone = textbox!.cloneNode(true) as HTMLElement;
    textboxClone.innerHTML = textboxClone.innerHTML.replace(/<br>/g, '\n');
    return textboxClone.innerText;
  }

  const handleCopySolve = () => {
    const title = solveTitle ? `${solveTitle.trim()}` : '';

    const scramble = getTextboxInnerText('scramble').trim();
    const solution = getTextboxInnerText('solution').trim();

    const time = solveTime ? `${solveTime}` : '';
    const stm = totalMoves ? `${totalMoves} stm` : '';
    let tpsString = '';
    if (tpsRef.current && tpsRef.current.innerHTML !== '(-- tps)') {
      tpsString = tpsRef.current.innerHTML;
    }
    const url = window.location.href;
    let printout = "";

    title ? printout += `${title}\n\n` : '';
    scramble ? printout += `${scramble}\n\n` : '';
    solution ? printout += `Solution:\n${solution}\n\n` : '';

    time ? printout += `${time} sec` : '';
    time && stm ? printout += `, ` : ' ';
    stm ? printout += `${stm} ` : '';
    tpsString ? printout += `${tpsString}` : '';
    printout += '\n';

    url ? printout += `\n[View solve on Ao1K](${url})` : '';

    navigator.clipboard.writeText(printout);
    setTopButtonAlert(["copy-solve", "Solve text copied!"]);
  }

  const handleScreenshot = async () => {
    try {
      // Dynamically import html2canvas only when needed
      const html2canvas = (await import('html2canvas')).default;
      
      const scrambleDiv = document.getElementById('scramble');
      const richSolutionDiv = document.getElementById('rich-solution-display');
      if (!scrambleDiv || !richSolutionDiv) {
        console.error('Scramble or solution div not found');
        return;
      }

      // Create a wrapper to hold both divs
      const wrapper = document.createElement('div');
      wrapper.style.position = 'absolute';
      wrapper.style.left = '-9999px';
      wrapper.style.width = 'fit-content';
      wrapper.style.backgroundColor = '#161018'; // bg-dark
      wrapper.style.padding = '0';
      wrapper.style.display = 'flex';
      wrapper.style.flexDirection = 'column';
      wrapper.style.gap = '0';
      wrapper.style.padding = '1rem';
      wrapper.style.border = '1px solid #525252'; // border-neutral-600
      wrapper.style.borderRadius = '0.5rem'; // rounded-lg

      // Clone scramble div
      const scrambleClone = scrambleDiv.cloneNode(true) as HTMLElement;
      scrambleClone.style.width = 'fit-content';
      scrambleClone.style.maxWidth = 'none';
      scrambleClone.style.maxHeight = 'none';
      
      // Clone solution div
      const solutionClone = richSolutionDiv.cloneNode(true) as HTMLElement;
      solutionClone.style.width = 'fit-content';
      solutionClone.style.maxWidth = 'none';
      solutionClone.style.maxHeight = 'none';
      solutionClone.style.overflow = 'visible';
      
      // Find the solution textbox div in the clone and set its width
      const clonedSolutionTextbox = solutionClone.querySelector('#solution') as HTMLElement;
      if (clonedSolutionTextbox) {
        clonedSolutionTextbox.style.width = 'fit-content';
        clonedSolutionTextbox.style.minWidth = '0';
      }

      // Fix text positioning in both contenteditable divs and remove borders
      const editableDivs = [scrambleClone, solutionClone].map(clone => 
        clone.querySelector('div[contenteditable="true"]')
      ).filter(Boolean) as HTMLElement[];
      
      editableDivs.forEach(editableDiv => {
        editableDiv.style.paddingTop = '0';
        editableDiv.style.paddingBottom = '1rem';
        editableDiv.style.paddingLeft = '0.5rem';
        editableDiv.style.paddingRight = '0.5rem';
        editableDiv.style.marginTop = '-0.2rem';
        editableDiv.style.border = '1px solid #525252'; // border-neutral-600
        editableDiv.style.borderRadius = '0.125rem'; // rounded-sm
        editableDiv.style.boxSizing = 'border-box';
        editableDiv.style.lineHeight = '1.6';
        
        const childDivs = editableDiv.querySelectorAll('div');
        childDivs.forEach((div: HTMLElement) => {
          div.style.marginTop = '0';
          div.style.marginBottom = '0';
          div.style.paddingTop = '0';
        });
      });

      scrambleClone.style.marginBottom = '1rem';
      scrambleClone.style.marginTop = '0';
      scrambleClone.style.paddingTop = '0.25rem';

      solutionClone.style.paddingTop = '0.5rem';
      solutionClone.style.paddingBottom = '0.25rem';

      // Create info div with time, STM, TPS, and watermark
      const infoDiv = document.createElement('div');
      infoDiv.style.display = 'flex';
      infoDiv.style.justifyContent = 'space-between';
      infoDiv.style.alignItems = 'center';
      infoDiv.style.paddingLeft = '0.5rem';
      infoDiv.style.paddingRight = '0.5rem';
      infoDiv.style.paddingBottom = '1rem';
      infoDiv.style.marginTop = '0.5rem';
      infoDiv.style.color = '#e5e5e5'; // text-neutral-200
      infoDiv.style.fontSize = '1.125rem'; // text-lg
      infoDiv.style.fontFamily = 'inherit';
      
      // Build info text (left side)
      const time = solveTime ? `${solveTime}` : '';
      const stm = totalMoves ? `${totalMoves} stm` : '';
      let tpsString = '';
      if (tpsRef.current && tpsRef.current.innerHTML !== '(-- tps)') {
        tpsString = tpsRef.current.innerHTML;
      }
      
      let infoText = '';
      if (time) infoText += `${time} sec`;
      if (time && stm) infoText += `, `;
      if (stm) infoText += `${stm} `;
      if (tpsString) infoText += `${tpsString}`;
      
      // Left side: stats
      const statsSpan = document.createElement('span');
      statsSpan.textContent = infoText;
      infoDiv.appendChild(statsSpan);
      
      // Right side: watermark
      const watermarkSpan = document.createElement('span');
      watermarkSpan.textContent = 'Ao1K.com';
      infoDiv.appendChild(watermarkSpan);

      // Append clones to wrapper
      wrapper.appendChild(scrambleClone);
      wrapper.appendChild(solutionClone);
      wrapper.appendChild(infoDiv);
      
      document.body.appendChild(wrapper);

      // Wait for layout to calculate widths
      await new Promise(resolve => setTimeout(resolve, 50));

      // Get the actual rendered widths after fit-content
      const scrambleWidth = scrambleClone.offsetWidth;
      const solutionWidth = solutionClone.offsetWidth;
      
      // Set both to the smaller width
      const minWidth = Math.min(scrambleWidth, solutionWidth);
      scrambleClone.style.width = `${minWidth}px`;
      solutionClone.style.width = `${minWidth}px`;
      if (clonedSolutionTextbox) {
        clonedSolutionTextbox.style.width = `${minWidth}px`;
      }
      infoDiv.style.width = `${minWidth}px`;

      // Wait again for layout adjustment
      await new Promise(resolve => setTimeout(resolve, 50));

      const canvas = await html2canvas(wrapper, {
        backgroundColor: '#221825',
        scale: 1,
        logging: false,
      });

      // Remove the wrapper
      document.body.removeChild(wrapper);

      canvas.toBlob(async (blob) => {
        if (blob) {
          try {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob })
            ]);
            setTopButtonAlert(["copy-solve", "Screenshot copied!"]);
          } catch (error) {
            console.error('Failed to copy screenshot to clipboard:', error);
            // Fallback: download the image
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'solve-screenshot.png';
            link.click();
            URL.revokeObjectURL(url);
            setTopButtonAlert(["copy-solve", "Screenshot downloaded!"]);
          }
        }
      });
    } catch (error) {
      console.error('Failed to take screenshot:', error);
    }
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
      textbox = getTextboxOfSelection(range);
    }

    if (textbox != 'solution') {
      setIsTextboxFocused(false)
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

      const dailyScramble = data.scramble3x3;
      const date = data.date;     
      
      const scrambleMessage = `// Scramble of the day<br>// ${date}<br>${dailyScramble}`;
      scrambleMethodsRef.current?.transform(scrambleMessage); // force update inside MovesTextEditor

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

    if (e.ctrlKey && e.shiftKey && e.key === 'M') {
    
      e.preventDefault();

      handleMirrorM();
    }

    if (e.ctrlKey && e.shiftKey && e.key === 'S') {

      e.preventDefault();

      handleMirrorS();
    }

    if (e.ctrlKey && e.key === 's') {

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

    if (e.ctrlKey && e.key === 'i') {

      e.preventDefault();

      handleInvert();
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

  const updateLineStepsTracking = (steps: StepInfo[]) => {
    const [idIndex, currentLineIndex, moveIndex] = moveLocation.current;
    
    if (idIndex !== 1 || !steps) return;
    
    while (lineStepsRef.current.length <= currentLineIndex) {
      lineStepsRef.current.push([]);
    }
    
    const previousSteps: StepInfo[] = [];
    for (let i = 0; i < currentLineIndex; i++) {
      if (lineStepsRef.current[i]) {
        previousSteps.push(...lineStepsRef.current[i]);
      }
    }
    
    const oldStepsOnLine = lineStepsRef.current[currentLineIndex] || [];

    // remove steps that were included in previousSteps
    const stepsOnLine = steps.filter(step => 
      !previousSteps.some(prevStep => 
        prevStep.step === step.step && 
        prevStep.colors.length === step.colors.length &&
        prevStep.colors.every((color, index) => color === step.colors[index])
      )
    );

    if (stepsOnLine.length > 0 && solutionMethodsRef.current) {
      handleCommentSuggestions(stepsOnLine);
    }
    
    lineStepsRef.current[currentLineIndex] = stepsOnLine;
    
    let stepsChanged = false;
    
    if (stepsOnLine.length !== oldStepsOnLine.length) {
      stepsChanged = true;
    } else {
      // Check if any existing steps changed
      stepsOnLine.forEach((step, index) => {
        if (!oldStepsOnLine[index] || oldStepsOnLine[index].step !== step.step || 
            oldStepsOnLine[index].colors.every((color, i) => color === step.colors[i]) === false) {
          stepsChanged = true;
        }
      });
    }


    // remove all unknown steps
    if (stepsChanged) {

      // TODO: recompute steps for subsequent lines via a queuing system on hiddenCube

      lineStepsRef.current.splice(currentLineIndex + 1);
    }
  };

  const handleCommentSuggestions = (steps: StepInfo[]) => {
    if (!solutionMethodsRef.current || !cubeInterpreter.current) return;
    
    const stepNames = steps.map(s => s.step);
    const hasEO = stepNames.includes('eo');
    const hasCO = stepNames.includes('co');
    const hasEP = stepNames.includes('ep');
    const hasCP = stepNames.includes('cp');
    const hasSolved = stepNames.includes('solved');
    const hasCross = steps.some(s => s.type === 'cross');
    const f2lSteps = steps.filter(s => s.type === 'f2l');
    const llSteps = steps.filter(s => s.type === 'last layer');
    
    const currentLineIndex = moveLocation.current[1];
    
    if (hasCross && f2lSteps.length > 0) {
      solutionMethodsRef.current.showSuggestion(`// ${"x".repeat(f2lSteps.length)}cross`);
      return;
    }
    
    // ZBLL: Check if EO was previously completed (from earlier line)
    // and now CO + CP + EP are all solved on this line
    if (hasCO && hasCP && hasEP) {
      // Check previous lines to see if EO was already completed
      let eoWasPreviouslyComplete = false;
      for (let i = 0; i < currentLineIndex; i++) {
        const prevSteps = lineStepsRef.current[i] || [];
        if (prevSteps.some(s => s.step === 'eo')) {
          eoWasPreviouslyComplete = true;
          break;
        }
      }
      
      if (eoWasPreviouslyComplete) {
        solutionMethodsRef.current.showSuggestion('// zbll');
        return;
      }
    }
    
    // oll
    if (hasEO && hasCO && !hasEP && !hasCP) {
      // Use tracked suggestion name if available
      const trackedSuggestion = acceptedSuggestionsRef.current.get(currentLineIndex);
      if (trackedSuggestion && trackedSuggestion.name && (trackedSuggestion.step === 'oll')) {
        solutionMethodsRef.current.showSuggestion(`// oll ${trackedSuggestion.name}`);
        return;
      }

      // fallback if no name available
      solutionMethodsRef.current.showSuggestion('// oll');
      return;
    }
    
    // pll
    let ollWasPreviouslyComplete = false;
    let eoWasPreviouslyComplete = false;
    let coWasPreviouslyComplete = false;
    for (let i = 0; i < currentLineIndex; i++) {
      const prevSteps = lineStepsRef.current[i] || [];
      if (prevSteps.some(s => s.step === 'eo')) {
        eoWasPreviouslyComplete = true;
      }
      if (prevSteps.some(s => s.step === 'co')) {
        coWasPreviouslyComplete = true;
      }
    }
    ollWasPreviouslyComplete = eoWasPreviouslyComplete && coWasPreviouslyComplete;
    if (hasSolved && !hasEO && !hasCO && ollWasPreviouslyComplete) {
      // Use tracked suggestion name if available
      const trackedSuggestion = acceptedSuggestionsRef.current.get(currentLineIndex);
      if (trackedSuggestion && trackedSuggestion.name && trackedSuggestion.step === 'pll') {
        solutionMethodsRef.current.showSuggestion(`// pll ${trackedSuggestion.name}`);
        return;
      }
      
      // fallback if no name available
      solutionMethodsRef.current.showSuggestion('// pll');
      return;
    }

    // single LL step with name from tracked suggestion
    const trackedSuggestion = acceptedSuggestionsRef.current.get(currentLineIndex);
    if (llSteps.length > 0 && trackedSuggestion && trackedSuggestion.name) {
      solutionMethodsRef.current.showSuggestion(`// ${trackedSuggestion.name}`);
      return;
    }
    
    // multiple f2l pairs with color initials
    if (f2lSteps.length > 1) {
      const pairLabels = f2lSteps.map(pair => {
        const colorInitials = pair.colors.map(color => color[0].toUpperCase()).join('');
        return colorInitials;
      });
      solutionMethodsRef.current.showSuggestion(`// ${pairLabels.join(' + ')}`);
      return;
    }
    
    // single f2l pair
    if (f2lSteps.length === 1) {
      const colorInitials = f2lSteps[0].colors.map(color => color[0].toUpperCase()).join('');
      solutionMethodsRef.current.showSuggestion(`// ${colorInitials}`);
      return;
    }
    
    if (steps.length === 1 && steps[0].step === 'cross' && steps[0].colors.length > 0) {
      const crossColor = steps[0].colors[0];
      solutionMethodsRef.current.showSuggestion(`// ${crossColor} cross`);
      return;
    }
    
    // fallback: Generic step names combined
    const stepLabels = steps.map(s => s.step).join(' + ');
    solutionMethodsRef.current.showSuggestion(`// ${stepLabels}`);
  }

  const handleHiddenCubeUpdate = useCallback(() => {
    if (!hiddenCubeRef.current) {
      console.warn('Hidden cube reference is not set.');
      return;
    }

    cubeInterpreter.current?.setCurrentState(hiddenCubeRef.current);
    const steps = cubeInterpreter.current?.getStepsCompleted()
    console.log('steps completed:', steps);
    
    if (steps) {
      updateLineStepsTracking(steps);
    }
  }, []);

  const handleHiddenCubeLoaded = useCallback(async () => {
    if (!hiddenCubeRef.current) {
      console.warn('Hidden Cube reference is not set.');
      return;
    }

    const { default: algDoc } = await import('../../utils/compiled-exact-algs.json');

    cubeInterpreter.current = new CubeInterpreter(hiddenCubeRef.current, algDoc.algorithms);
  }, []);

  const toggleShowBottomBar = () => {
    Cookies.set('isShowingBottomBar', (!isShowingBottomBar).toString(), { expires: 365 });
    setIsShowingBottomBar(prev => !prev);
  }

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

    Cookies.get('isShowingBottomBar') === 'false' ? setIsShowingBottomBar(false) : setIsShowingBottomBar(true);
  }, []);

  useEffect(() => {
    
    document.addEventListener('selectionchange', storeLastSelection);
    document.addEventListener('keydown', handleCommand);

    return () => {

      document.removeEventListener('selectionchange', storeLastSelection);
      document.removeEventListener('keydown', handleCommand);

    };
  }, []);

  const toolbarButtons = [
    { id: 'undo', text: 'Undo', shortcutHint: 'Ctrl+Z', onClick: handleUndo, icon: <UndoIcon />, buttonRef: undoRef },
    { id: 'redo', text: 'Redo', shortcutHint: 'Ctrl+Y', onClick: handleRedo, icon: <RedoIcon />, buttonRef: redoRef },
    { id: 'mirrorM', text: 'Mirror M', shortcutHint: 'Ctrl+Shift+M', onClick: handleMirrorM, iconText: 'M' },
    { id: 'mirrorS', text: 'Mirror S', shortcutHint: 'Ctrl+Shift+S', onClick: handleMirrorS, iconText: 'S' },
    { id: 'rotateX', text: 'Rotate X', shortcutHint: 'Ctrl+Shift+X', onClick: handleRotateX, iconText: "X" },
    { id: 'rotateY', text: 'Rotate Y', shortcutHint: 'Ctrl+Shift+Y', onClick: handleRotateY, iconText: "Y" },
    { id: 'rotateZ', text: 'Rotate Z', shortcutHint: 'Ctrl+Shift+Z', onClick: handleRotateZ, iconText: "Z" },
    { id: 'invert', text: 'Invert', shortcutHint: 'Ctrl+I', onClick: handleInvert, icon: <InvertIcon /> },
    { id: 'cat', text: 'Angus', shortcutHint: 'Cat', onClick: handleAddCat, icon: <CatIcon /> },
    { id: 'removeComments', text: 'Remove Comments', shortcutHint: 'Ctrl+/ ', onClick: handleRemoveComments, iconText: '// ' },
  ];

  return (
    <div id="main_page" className="col-start-2 col-span-1 flex flex-col bg-primary-900">
      <VideoHelpPrompt videoId="iIipycBl0iY" />
      
      {/* utility for compiling list of alg hashes */}
      {/* <AlgCompiler /> */}
      {/* <LLpatternBuilder /> */}
      <HiddenPlayer 
        scramble={playerParams.scramble} 
        solution={playerParams.solution} 
        cubeRef={hiddenCubeRef} 
        animationTimes={playerParams.animationTimes} 
        onCubeStateUpdate={handleHiddenCubeUpdate} 
        handleCubeLoaded={handleHiddenCubeLoaded}
      />
      
      <div id="top-bar" className="px-3 flex flex-row flex-wrap items-center place-content-end gap-2 mt-8 mb-3">
        <TitleWithPlaceholder solveTitle={solveTitle} handleTitleChange={handleTitleChange} />
        <div className="flex-none flex flex-row space-x-1 pr-2 text-dark_accent">
          <TopButton id="trash" text="Clear Page" shortcutHint="Ctrl+Del" onClick={handleClearPage} icon={<TrashIcon />} alert={topButtonAlert} setAlert={setTopButtonAlert}/>
          <CopySolveDropdown onCopyText={handleCopySolve} onScreenshot={handleScreenshot} alert={topButtonAlert} setAlert={setTopButtonAlert} />
          <TopButton id="share" text="Copy URL" shortcutHint="Ctrl+S" onClick={handleShare} icon={<ShareIcon />} alert={topButtonAlert} setAlert={setTopButtonAlert}/>
        </div>
      </div>
      <div id="scramble-area" className="px-3 mt-3 flex flex-col">
        <div className="text-xl text-dark_accent font-medium">Scramble</div>
        <div className="lg:max-h-[15.1rem] max-h-[10rem] overflow-y-auto" id="scramble">
          <MovesTextEditor
            name={`scramble`}
            ref={scrambleMethodsRef}
            trackMoves={memoizedTrackMoves}
            autofocus={false}
            moveHistory={moveHistory}
            updateHistoryBtns={memoizedUpdateHistoryBtns}
            html={scrambleHTML}
            setHTML={memoizedSetScrambleHTML}
          />
        </div>
      </div>
      <div id="player-box" className="px-3 relative flex flex-col mt-6 w-full justify-center items-center">
        <div id="cube_model" className="flex h-full aspect-video max-h-96 min-h-[200px] bg-primary-900 select-none z-20 w-[100%]">
          <Suspense fallback={<div className="flex text-xl w-full h-full justify-center items-center text-primary-100">Loading cube...</div>}>
            <TwistyPlayer 
              speed={speed} 
              cubeRef={cubeRef}
              scrambleRequest={playerParams.scramble}
              solutionRequest={playerParams.solution}
              animationTimesRequest={playerParams.animationTimes}
              onCubeStateUpdate={()=>{}}
              handleCubeLoaded={()=>{}}
              handleControllerRequest={handleControllerRequest}
              controllerButtonsStatus={controllerButtonsStatus}
              setControllerButtonsStatus={setControllerButtonsStatus}
            />
          </Suspense>
        </div>
      </div>
      <div id="bottom-box" className="mx-3 relative flex flex-col justify-center items-center">        
        <div id="bottom-box-borders" className={`border-x w-[100%] border-neutral-600 h-14 absolute top-0 z-0 pointer-events-none ${isShowingBottomBar ? 'block' : 'hidden'}`}></div>
        <div
          id="bottom-bar"
          ref={bottomBarRef}
          className={`w-full px-3 space-x-1 static flex flex-row items-center place-content-end justify-start transform z-10
              ${isShowingBottomBar ? 'translate-y-0 opacity-100 h-14' : '-translate-y-[100%] opacity-0 pointer-events-none h-0'}`}
          style={{
            visibility: isShowingBottomBar ? 'visible' : 'hidden',
            transition: isShowingBottomBar
              ? 'transform 300ms linear, opacity 300ms ease-in-out, visibility 0s linear 100ms' : ''
          }}
        >
          <SpeedDropdown speed={localSpeed} handleSpeedChange={handleSpeedChange} />
          <Toolbar buttons={toolbarButtons} containerRef={bottomBarRef} />
        </div>
        <div className="border border-neutral-600 hover:border-primary-100 h-[6px] rounded-b-sm w-full z-0 bg-primary-700 mb-2" onClick={() => toggleShowBottomBar()}></div>
      </div>
      <div id="datafields" className="w-full items-start transition-width duration-500 ease-linear">
        <div id="solution-area" className="px-3 mt-1 mb-6 flex flex-col w-full">
          <div className="text-xl text-dark_accent font-medium w-full">Solution</div>
          <div id="rich-solution-display" className="flex flex-row lg:max-h-[20rem] max-h-[10rem] border-none overflow-y-auto">
            <ImageStack 
              moves={allMovesRef.current}
              position={moveLocation.current}
              isTextboxFocused={isTextboxFocused}
              editableElement={solutionMethodsRef.current?.getElement() || null}
              lineSteps={lineStepsRef.current}
            />
            <div className="w-full min-w-0" id="solution">
              <MovesTextEditor 
                name={`solution`}
                ref={solutionMethodsRef} 
                trackMoves={memoizedTrackMoves} 
                autofocus={true} 
                moveHistory={moveHistory}
                updateHistoryBtns={memoizedUpdateHistoryBtns}
                html={solutionHTML}
                setHTML={memoizedSetSolutionHTML}
              />
            </div>
          </div>
        </div>
        <div id="time-area" className="px-3 flex flex-col w-full">
          <div className="text-xl text-dark_accent font-medium w-full">Time</div>
          <div id="time-stats" className="flex flex-row flex-wrap text-nowrap items-center w-full gap-y-2">
          <div id="time-field" className="border border-neutral-600 group flex flex-row items-center justify-start">
            <input
              id="time-input"
              type="number" 
              placeholder="00.000" 
              className="pt-2 pb-2 px-2 text-xl text-primary-100 bg-primary-900 group-focus:border-primary-100 hover:bg-primary-800 rounded-sm box-content no-spinner w-[4.25rem]"
              value={solveTime}
              onChange={handleSolveTimeChange}
              onWheel={(e) => e.currentTarget.blur()}
              autoComplete="off"
              tabIndex={4}
              />
            <div className="text-primary-100 pr-2 text-xl">sec</div> 
          </div>
          <div className="text-primary-100 ml-2 text-xl">{totalMoves} stm </div> 
          <div className="flex-nowrap text-nowrap items-center flex flex-row">
            <TPSInfo moveCount={totalMoves} solveTime={solveTime} tpsRef={tpsRef} />
            <ReconTimeHelpInfo />
          </div>
        </div>
        </div>
      </div>
      <div id="blur-border" className="h-[4px] blur-sm bg-neutral-600 my-32"/>
      <Footer />
    </div>
  );
}
