'use client';
import { useState, useRef, useEffect, lazy, Suspense, useCallback } from 'react';
import MovesTextEditor from "../../components/recon/MovesTextEditor";
import SpeedDropdown from "../../components/recon/SpeedDropdown";

import Toolbar from "../../components/Toolbar";
import TPSInfo from "../../components/recon/TPSInfo";
import updateURL from "../../composables/recon/updateURL";

import type { ImperativeRef } from "../../components/recon/MovesTextEditor";

import UndoIcon from "../../components/icons/undo";
import RedoIcon from "../../components/icons/redo";
import CatIcon from "../../components/icons/cat";
import TrashIcon from "../../components/icons/trash";
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
import InfoPanel from '../../components/recon/InfoPanel';
import IconStack, { computeLineIconData } from './IconStack';
import SplitsStack, { SPLITS_WIDTH, splitsToURLParam } from './SplitsStack';
import { ICON_SIZE_CONFIG, useCubeColors, useShowSplits } from '../../composables/useSettings';
import { SimpleCube } from '../../composables/recon/SimpleCube';
import { SimpleCubeInterpreter } from '../../composables/recon/SimpleCubeInterpreter';
import type { StepInfo, Suggestion } from '../../composables/recon/SimpleCubeInterpreter';
import { getNewSteps } from '../../composables/recon/getLineStepInfo';
import { ScreenshotManager } from '../../composables/recon/ScreenshotManager';
import type { TwistyPlayerImperativeRef } from '../../components/recon/TwistyPlayer';

// utility imports
import { AlgCompiler } from '../../utils/AlgCompiler';
import ManualAlgVerifier from './ManualAlgVerifier';
import LLpatternBuilder from '../../utils/LLpatternBuilder';
import { highlightClass } from '../../utils/sharedConstants';
import ReconSkeleton from './ReconSkeleton';

export interface MoveHistory {
  history: string[][];
  index: number;
  status: string;
  MAX_HISTORY: number;
}

interface OldSelectionRef {
  status: string;
  range: Range | null;
  textbox: 'solution' | 'scramble' | null;
}

export type PlayerParams = { animationTimes: number[]; solution: string; scramble: string };


export interface ControllerRequestOptions {
  type: 'fullLeft' | 'stepLeft' | 'pause' | 'play' | 'replay' | 'stepRight' | 'fullRight';
}

const TwistyPlayer = lazy(() => import("../../components/recon/TwistyPlayer"));

let currentSpeed = 30;
const calcCubeSpeedLocal = (speed: number) =>
  speed === 100 ? 1000 : 1.5 ** (speed / 15) - 0.6;

const isRotationOnlyLine = (moves: string[]) =>
  moves.length > 0 && moves.every(move => !/[^xyz2'3]/.test(move));

const MAX_EDITOR_HISTORY = 100;

export default function Recon({ dailyScramble = "", infoPanelSlot }: { dailyScramble?: string, infoPanelSlot?: React.ReactNode }) {
  const solutionLineHeight = ICON_SIZE_CONFIG['medium'].lineHeight;
  const [cubeColors] = useCubeColors();
  const [showSplitsSetting] = useShowSplits();

  const allMovesRef = useRef<string[][][]>([[[]], [[]]]);
  const moveLocation = useRef<[number, number, number]>([0, 0, 0]);

  const [speed, setSpeed] = useState<number>(30);
  currentSpeed = speed;

  const [solveTime, setSolveTime] = useState<number | string>('');
  const [solveTitle, setSolveTitle] = useState<string>('');
  const [topButtonAlert, setTopButtonAlert] = useState<{ id: string; message: string; messageType: 'info' | 'warn' }>({ id: "", message: "", messageType: 'info' });
  const [isShowingToolbar, setIsShowingToolbar] = useState<boolean>(true);
  const [lineSteps, setLineSteps] = useState<{ moveLine: string; stepInfo: StepInfo[] }[]>([]);
  const lineStepsRef = useRef(lineSteps); // keep latest lineSteps accessible inside stable callbacks

  const [scrambleHTML, setScrambleHTML] = useState<string>('');
  const [solutionHTML, setSolutionHTML] = useState<string>('');

  const [playerParams, setPlayerParams] = useState<PlayerParams>({ animationTimes: [], solution: '', scramble: '' });
  const suggestionsRef = useRef<Suggestion[]>([]);

  // TODO: check if these are needed any more
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const updateSuggestions = useCallback((next: Suggestion[]) => {
    suggestionsRef.current = next;
    setSuggestions(next);
  }, []);

  const [splits, setSplits] = useState<string[]>([]);
  const splitsRef = useRef<string[]>([]);
  const [committedSplits, setCommittedSplits] = useState<string[]>([]);
  const committedSplitsRef = useRef<string[]>([]);

  const tpsRef = useRef<HTMLDivElement>(null!);
  const scrambleMethodsRef = useRef<ImperativeRef>(null);
  const solutionMethodsRef = useRef<ImperativeRef>(null);
  const undoRef = useRef<HTMLButtonElement>(null!);
  const redoRef = useRef<HTMLButtonElement>(null!);
  const iconScrollRef = useRef<HTMLDivElement>(null);
  const splitsScrollRef = useRef<HTMLDivElement>(null);
  const oldSelectionRef = useRef<OldSelectionRef>({ range: null, textbox: null, status: "init" });
  const bottomBarRef = useRef<HTMLDivElement>(null!);
  const isLoopingRef = useRef<boolean>(false);
  const loopTimeoutRef = useRef<number | null>(null);
  const screenshotManagerRef = useRef<ScreenshotManager | null>(null);
  const isWhiteSpaceLineRef = useRef<boolean[]>([]);
  const twistyPlayerRef = useRef<TwistyPlayerImperativeRef>(null);
  const clearLoopTimeout = useCallback(() => {
    if (loopTimeoutRef.current !== null) {
      clearTimeout(loopTimeoutRef.current);
      loopTimeoutRef.current = null;
    }
  }, []);

  splitsRef.current = splits;
  committedSplitsRef.current = committedSplits;

  const totalMoves = allMovesRef.current[1].flat(2).filter(move => move.match(/[^xyz2']/g)).length

  const solutionLines = allMovesRef.current[1]?.map((move: string[]) => move.join(' ')) || [''];
  const lineIconData = computeLineIconData(solutionLines, lineSteps.map(item => item.stepInfo), cubeColors);
  const hasIcons = lineIconData.some(d => !d.isEmptyIcon);

  const showSplitsColumn = showSplitsSetting;

  const isWhitespaceLine = lineIconData.map(d => d.isWhitespace);
  isWhiteSpaceLineRef.current = isWhitespaceLine;
  const splitsSum = committedSplits
    .filter(s => s !== '')
    .reduce((acc, s) => acc + parseFloat(s), 0);

  let splitIdxCounter = 0;
  const requiredSplitIndices: number[] = [];
  for (let lineIdx = 0; lineIdx < allMovesRef.current[1].length; lineIdx++) {
    if (isWhitespaceLine[lineIdx]) continue;
    const line = allMovesRef.current[1][lineIdx];
    if (line.length > 0 && !isRotationOnlyLine(line)) requiredSplitIndices.push(splitIdxCounter);
    splitIdxCounter++;
  }

  const allRequiredSplitsFilled = requiredSplitIndices.length > 0 &&
    requiredSplitIndices.every(i => committedSplits[i] != null && committedSplits[i] !== '');

  const showSplitsWarning = showSplitsColumn
    && typeof solveTime === 'number'
    && allRequiredSplitsFilled
    && Math.abs(splitsSum - solveTime) > 0.1;

  const lastContentfulLineStep = (() => {
    for (let i = lineSteps.length - 1; i >= 0; i--) {
      if (lineSteps[i].stepInfo.length > 0) {
        return lineSteps[i];
      }
    }
  })();
  const isSolveComplete = lastContentfulLineStep?.stepInfo.some(step => step.type?.toLowerCase() === 'solved');

  const moveHistory = useRef<MoveHistory>({ history: [['', '']], index: 0, MAX_HISTORY: MAX_EDITOR_HISTORY, status: 'loading' });

  const [controllerButtonsStatus, setControllerButtonsStatus] = useState<{ fullLeft: string, stepLeft: string, stepRight: string, fullRight: string, playPause: string }>({
    fullLeft: 'disabled',
    stepLeft: 'disabled',
    stepRight: 'disabled',
    fullRight: 'disabled',
    playPause: 'disabled'
  });

  const cubeInterpreter = useRef<SimpleCubeInterpreter | null>(null);
  const simpleCubeRef = useRef<SimpleCube>(new SimpleCube());

  // Detect OS on client side only to avoid hydration mismatch
  const [ctrlKey, setCtrlKey] = useState('Ctrl');

  useEffect(() => {
    const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
    setCtrlKey(isMac ? '⌘' : 'Ctrl');
  }, []);

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

  /**
   * Evaluates if the moves on each line are the same. Example: R U R' [newline] U' and R U R' U' are different.
   * @param currentMoves
   * @param lines 
   * @returns 
   */
  const areMoveLinesEqual = (currentMoves: string[][], lines: string[][]): boolean => {
    currentMoves = currentMoves.filter(line => line.length != 0);
    lines = lines.filter(line => line.length != 0);

    if (currentMoves.length !== lines.length) {
      return false;
    } else {
      for (let i = 0; i < currentMoves.length; i++) {
        const line = currentMoves[i];
        const newLine = lines[i] || [];
        if (line.join(' ') !== newLine.join(' ')) {
          return false;
        }
      }
    }
    return true;
  };


  const areMovesSame = (currentMoves: string[][], moves: string[][]): boolean => {
    if (currentMoves.length !== moves.length) {
      return false;
    }

    // compare each line
    for (let i = 0; i < currentMoves.length; i++) {
      const currentLine = currentMoves[i];
      const newLine = moves[i];

      if (!newLine || currentLine.length !== newLine.length) {

        return false;
      }

      // compare each move
      for (let j = 0; j < currentLine.length; j++) {
        if (currentLine[j] !== newLine[j]) {
          return false;
        }
      }
    }

    return true;
  };

  const findAnimationLengths = (moves: string[]): number[] => {
    const moveAnimationTimes: number[] = [];
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
   * @returns [1] if scramble is selected. [0] if there are no moves in the solution.
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
      // if (time === undefined) { console.warn(`Undefined time at line ${lineIndex}, move ${j}.`); }
      if (selectedLineAnimationTimes && !isEmptyMove) {
        newMoveTimes.push(time);
      }
    }

    return newMoveTimes;

  };

  const highlightMove = useCallback((moveIndex: number, lineIndex: number) => {
    solutionMethodsRef.current?.highlightMove(moveIndex, lineIndex);
  }, []);

  const removeHighlight = useCallback(() => {
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
        return [nextLineIndex, 1]; // go to first move in next line
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

  const computeLinePlaybackTiming = (lineIndex: number): { pause: number; moveTimes: number[]; tempoScale: number } | null => {
    const isWs = isWhiteSpaceLineRef.current;
    const committed = committedSplitsRef.current;
    const moves = allMovesRef.current[1];

    if (isWs[lineIndex]) return null;

    let splitIdx = 0;
    for (let i = 0; i < lineIndex; i++) {
      if (!isWs[i]) splitIdx++;
    }

    const splitStr = committed[splitIdx];
    if (!splitStr || splitStr === '') return null;

    const splitTime = parseFloat(splitStr);
    if (isNaN(splitTime) || splitTime <= 0) return null;

    const lineMoves = moves[lineIndex] || [];
    if (lineMoves.length === 0) return null;

    const stmCount = lineMoves.filter(move => move.match(/[^xyz2']/)).length;
    if (stmCount === 0) return null;

    const tps = stmCount / splitTime;
    const pauseFraction = Math.max(0, 1 - tps / 10);
    // pause is an absolute recognition time capped at 800ms, not a fraction of the split
    const pauseMs = Math.min(pauseFraction * 800, splitTime * 1000 * 0.5);
    const moveTimeMs = splitTime * 1000 - pauseMs;

    const weights = lineMoves.map(move => {
      if (move.includes('3')) return 2.0;
      if (move.includes('2')) return 1.5;
      return 1.0;
    });
    const weightedTotal = weights.reduce((sum, w) => sum + w, 0);
    if (weightedTotal === 0) return null;

    const baseTime = moveTimeMs / weightedTotal;
    const moveTimes = weights.map(w => Math.max(50, baseTime * w));
    const tempoScale = 1000 / Math.max(50, baseTime);

    return { pause: pauseMs, moveTimes, tempoScale };
  };

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
      removeHighlight();

      return;
    }

    trackMoves(1, lineIndex, moveIndex, allMovesRef.current[1], 'play');

    let timeoutMs = 1000 - (10 * currentSpeed);
    const splitTiming = computeLinePlaybackTiming(lineIndex);
    if (splitTiming) {
      // above 10 TPS, animations look instant anyway — use actual instant mode
      const useInstant = splitTiming.tempoScale > 10;
      twistyPlayerRef.current?.setInstantOverride(useInstant);
      if (!useInstant && moveIndex !== 0) {
        twistyPlayerRef.current?.setTempoScale(splitTiming.tempoScale);
      }
      timeoutMs = moveIndex === 0
        ? splitTiming.pause
        : (splitTiming.moveTimes[moveIndex - 1] ?? timeoutMs);
    } else {
      twistyPlayerRef.current?.setInstantOverride(false);
      twistyPlayerRef.current?.setTempoScale(calcCubeSpeedLocal(currentSpeed));
    }

    loopTimeoutRef.current = window.setTimeout(() => {
      loopStepRight([1, lineIndex, moveIndex]);
    }, timeoutMs);
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
        trackMoves(1, 0, 0, allMovesRef.current[1], 'fullLeft');
        break;
      case 'stepLeft':
        [lineIndex, moveIndex] = getMoveToLeft();
        if (lineIndex !== -1 || moveIndex !== -1) {
          trackMoves(1, lineIndex, moveIndex, allMovesRef.current[1], 'stepLeft');
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
        trackMoves(1, 0, 0, allMovesRef.current[1], 'play'); // reset to start of solution

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
          trackMoves(1, lineIndex, moveIndex, allMovesRef.current[1], 'stepRight');
        }
        break;
      case 'fullRight':
        [lineIndex, moveIndex] = getLastMoveInSolution();
        trackMoves(1, lineIndex, moveIndex, allMovesRef.current[1], 'fullRight');
        break;
      default:
        console.warn('Unknown controller request type:', request.type);
        return;
    }
  }

  const getControllerButtonsStatus = (idIndex: number, lineIndex: number, moveIndex: number, moves: string[][], playPauseStatus: string): {
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

  const handleEmptyLineSuggestions = (solutionMoves: string[][], trueLineIndex: number) => {
    if (!solutionMethodsRef.current || !cubeInterpreter.current) {
      return;
    }
    const lastMoveIndex = findLastMoveInLine(solutionMoves, trueLineIndex);

    // build moves up to current position
    const scrambleMoves = allMovesRef.current[0].flat();
    const solutionMovesUpToPoint = solutionMoves.flatMap((line, lineIdx) => {
      if (lineIdx < trueLineIndex) return line;
      if (lineIdx === trueLineIndex) return line.slice(0, lastMoveIndex);
      return [];
    });
    const allMoves = [...scrambleMoves, ...solutionMovesUpToPoint];
    const cubeState = simpleCubeRef.current.getCubeState(allMoves as any);

    const steps = cubeInterpreter.current!.getStepsCompleted(cubeState);
    const newSuggestions: Suggestion[] = cubeInterpreter.current.getAlgSuggestions(steps);

    const prevSuggestions = suggestionsRef.current;

    const isSuggestionChange = prevSuggestions.length !== newSuggestions.length ||
      newSuggestions.some((newSug, index) => newSug.alg !== (prevSuggestions[index]?.alg ?? ''));

    suggestionsRef.current = newSuggestions;

    if (!isSuggestionChange) {
      return;
    }

    if (newSuggestions.length > 0) {
      solutionMethodsRef.current?.showSuggestion(newSuggestions[0].alg);
    }

    updateSuggestions(newSuggestions);

  };

  const trackMoves = useCallback(
    (
      idIndex: number,
      lineIndex: number, // the line number of the caret, zero-indexed
      moveIndex: number, // the number of moves before the caret on its line 
      moves: string[][], // the moves in the textbox of id
      moveControllerStatus?: string // the current status of loopStepRight
    ) => {

      if (moveControllerStatus !== 'play') {
        isLoopingRef.current = false; // break out of loopStepRight when status changes
      }

      if (lineIndex === -1 || moveIndex === -1) {
        // handles invalid ControllerRequests
        console.warn('Invalid lineIndex or moveIndex:', lineIndex, moveIndex);
        return;
      }

      const isLineEmpty = moves[lineIndex]?.length === 0;
      if (isLineEmpty) {

        // only allowing suggestions on empty line simplifies logic and leads to more beautiful recons
        idIndex === 0 ? null : handleEmptyLineSuggestions(moves, lineIndex);

        // pretend caret is at end of the last line that has a move
        const adjustedLineIndex = findPrevNonEmptyLine(moves, lineIndex);
        const adjustedMoveIndex = findLastMoveInLine(moves, adjustedLineIndex);

        if (adjustedLineIndex !== -1 && adjustedMoveIndex !== -1) {
          lineIndex = adjustedLineIndex;
          moveIndex = adjustedMoveIndex;
        }
      }

      const isMovesSame = areMovesSame(allMovesRef.current[idIndex], moves);

      // content same if all contentful lines are the same.
      const isMoveLineContentSame = areMoveLinesEqual(allMovesRef.current[idIndex], moves);

      const isMoveIndexSame =
        moveLocation.current[0] === idIndex &&
        moveLocation.current[1] === lineIndex &&
        moveLocation.current[2] === moveIndex;

      if (isMovesSame && isMoveIndexSame) {
        return;
      }

      if (idIndex === 1) {
        const nonEmptyCount = moves.filter(line => line.length > 0).length;
        const prev = splitsRef.current;
        if (prev.length !== nonEmptyCount) {
          if (prev.length < nonEmptyCount) {
            const padded = [...prev, ...Array(nonEmptyCount - prev.length).fill('')];
            splitsRef.current = padded;
            setSplits(padded);
            setCommittedSplits(c => [...c, ...Array(nonEmptyCount - c.length).fill('')]);
          } else {
            const trimmed = prev.slice(0, nonEmptyCount);
            splitsRef.current = trimmed;
            setSplits(trimmed);
            setCommittedSplits(c => c.slice(0, nonEmptyCount));
            updateURL('splits', splitsToURLParam(trimmed));
          }
        }
      }

      allMovesRef.current[idIndex] = [...moves];
      const sol = allMovesRef.current[1].flat().join(' ');
      const scram = allMovesRef.current[0].flat().join(' ');

      if (idIndex === 1 && moveControllerStatus) highlightMove(moveIndex, lineIndex);

      let limitedTimes = findAnimationTimes(idIndex, lineIndex, moveIndex, moves);
      moveLocation.current = [idIndex, lineIndex, moveIndex];

      const currentLineSteps = lineStepsRef.current;

      if (!isMoveLineContentSame) {
        updateLineSteps();
      } else {
        if (hasLineStepSpaceChanges(moves, currentLineSteps)) {
          respaceLineSteps();
        }
      };

      setPlayerParams({ animationTimes: limitedTimes, solution: sol, scramble: scram });

      const validPlayPauseStatuses = ['play', 'pause', 'replay', 'disabled'];
      const playPauseStatus =
        (moveControllerStatus && validPlayPauseStatuses.includes(moveControllerStatus)) ?
          moveControllerStatus : controllerButtonsStatus.playPause;

      const controllerButtonsEnabled = getControllerButtonsStatus(idIndex, lineIndex, moveIndex, allMovesRef.current[idIndex], playPauseStatus);
      setControllerButtonsStatus(controllerButtonsEnabled)

  }, [controllerButtonsStatus, suggestions]);

  const memoizedSetScrambleHTML = useCallback((html: string) => {
    setScrambleHTML(html);
  }, []);
  const memoizedSetSolutionHTML = useCallback((html: string) => {
    setSolutionHTML(html);
  }, []);

  const memoizedUpdateHistoryBtns = useCallback(() => {
    handleHistoryBtnUpdate();
  }, []);

  const handleSplitsCommit = (newSplits: string[]) => {
    setCommittedSplits(newSplits);
    if (solveTime) return;

    const newSum = newSplits.filter(s => s !== '').reduce((acc, s) => acc + parseFloat(s), 0);
    if (newSum <= 0) return;

    let idx = 0;
    const required: number[] = [];
    for (let lineIdx = 0; lineIdx < allMovesRef.current[1].length; lineIdx++) {
      if (isWhitespaceLine[lineIdx]) continue;
      const line = allMovesRef.current[1][lineIdx];
      if (line.length > 0 && !isRotationOnlyLine(line)) required.push(idx);
      idx++;
    }

    if (required.length === 0) return;
    if (!required.every(i => newSplits[i] != null && newSplits[i] !== '')) return;

    setSolveTime(Math.round(newSum * 1000) / 1000);
    updateURL('time', newSum.toFixed(3));
  };

  const handleSolveTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const regex = /^\d{0,5}(\.\d{1,3})?$/;

    if (!regex.test(value)) {
      return;
    }

    if (value === '') {
      setSolveTime('');
      updateURL('time', '');
      return;
    }

    setSolveTime(parseFloat(value));
    updateURL('time', value);
  }

  const handleUndo = () => {
    if (scrambleMethodsRef.current && solutionMethodsRef.current) {
      scrambleMethodsRef.current.undo();
      solutionMethodsRef.current.undo();
    }
  }

  const handleRedo = () => {
    if (scrambleMethodsRef.current && solutionMethodsRef.current) {
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

  const getWholeTextboxRange = (textboxName: 'scramble' | 'solution'): Range => {

    const parentElement = document.getElementById(textboxName);
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
    allMovesRef.current = [[[]], [[]]];
    moveLocation.current = [0, 0, 0];
    setPlayerParams({ animationTimes: [], solution: '', scramble: '' });
    scrambleMethodsRef.current?.transform('');
    solutionMethodsRef.current?.transform('');
    setSolveTime('');
    setSolveTitle('');
    setSplits([]);
    setCommittedSplits([]);
    setLineSteps([]);

    // don't clear moveHistory

    updateURL('title', null);
    updateURL('time', null);
    updateURL('splits', null);
    updateURL('preview', null);
    setTopButtonAlert({ id: "trash", message: "Page cleared! Undo with Ctrl+Z", messageType: 'info' });
  }

  const handleAddCat = () => {
    const { range, textbox } = getLastRangeAndTextbox()

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

  const getAlertMessage: (type: 'solve-text' | 'screenshot' | 'preview') => { message: string, messageType: 'info' | 'warn' } = (type) => {
    const scrambleMoves = allMovesRef.current[0].flat();
    const solutionMoves = allMovesRef.current[1].flat();

    const hasScramble = scrambleMoves.length > 0 && scrambleMoves.some(move => move.trim() !== '');
    const hasSolution = solutionMoves.length > 0 && solutionMoves.some(move => move.trim() !== '');

    if (!hasSolution) {
      return {
        message: 'Copied, Missing Solution',
        messageType: 'warn'
      };
    }

    if (!hasScramble) {
      return {
        message: 'Copied, Missing Scramble',
        messageType: 'warn'
      };
    }

    if (!isSolveComplete) {
      return {
        message: 'Copied, Solve Incomplete',
        messageType: 'warn'
      };
    }

    // Default success messages
    switch (type) {
      case 'solve-text':
        return { message: 'Solve text copied!', messageType: 'info' };
      case 'screenshot':
        return { message: 'Screenshot copied!', messageType: 'info' };
      case 'preview':
        return { message: 'Preview copied!', messageType: 'info' };
    }
  };

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
    const url = window.location.href + '&preview=0';
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

    const alert = getAlertMessage('solve-text');
    setTopButtonAlert({ id: "copy-solve", ...alert });
  }

  const handleScreenshot = async () => {
    if (!screenshotManagerRef.current) return;

    const tpsString = (tpsRef.current && tpsRef.current.innerHTML !== '(-- tps)') ? tpsRef.current.innerHTML : '';
    const blob = await screenshotManagerRef.current.getBlob(
      { scrambleHTML, solutionHTML, solveTime },
      { totalMoves, tpsString }
    );

    if (!blob) {
      setTopButtonAlert({ id: "copy-solve", message: "Screenshot Failed. Please report!", messageType: 'warn' });
      return;
    }

    const success = await screenshotManagerRef.current!.copyToClipboard(blob);
    if (success) {
      const alert = getAlertMessage('screenshot');
      setTopButtonAlert({ id: "copy-solve", ...alert });
    } else {
      setTopButtonAlert({ id: "copy-solve", message: "Screenshot Failed. Please report!", messageType: 'warn' });
    }
  }

  const handleShare = async () => {

    updateURL('preview', null); // remove the parameter that might block previews

    // flush any debounced URL updates so window.location.href is current
    scrambleMethodsRef.current?.flushURLUpdate();
    solutionMethodsRef.current?.flushURLUpdate();

    const canNativeShare =
      typeof navigator.share === "function" &&
      window.matchMedia("(pointer: coarse)").matches;

    const title = solveTitle ? `${solveTitle.trim()}` : '';
    const text = `[${title || 'Solve'}](${window.location.href})`;

    // Native share (mobile, some desktop browsers)
    if (canNativeShare) {
      try {
        await navigator.share({ title, text });
        const alert = getAlertMessage('preview');
        setTopButtonAlert({ id: "share", ...alert });
      } catch (err) {
        // User canceled or browser rejected
      }
    } else {
      try {
        navigator.clipboard.writeText(text);
        const alert = getAlertMessage('preview');
        setTopButtonAlert({ id: "share", ...alert });
      } catch (error) {
        console.error('Failed to copy to clipboard:', error);
      }
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
    let textbox: 'solution' | 'scramble' | null = null;

    oldSelectionRef.current.range = null;
    oldSelectionRef.current.textbox = null;

    if (selection && isSelectionInTextbox(selection)) {
      range = selection.getRangeAt(0).cloneRange();
      textbox = getTextboxOfSelection(range);
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

  const handleStoreSelection = () => {
    const lastSelection = oldSelectionRef.current.textbox;

    storeLastSelection();

    if (lastSelection === 'solution' && oldSelectionRef.current.textbox !== 'solution') {
      const isCubeSolved = lineStepsRef.current.some(stepEntry =>
        stepEntry.stepInfo.some(step => step.type?.toLowerCase() === 'solved')
      );
      if (isCubeSolved) {
        const tpsString = (tpsRef.current && tpsRef.current.innerHTML !== '(-- tps)') ? tpsRef.current.innerHTML : '';
        void screenshotManagerRef.current?.getBlob(
          { scrambleHTML, solutionHTML, solveTime },
          { totalMoves, tpsString }
        );
      }
    }
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;

    if (e.target.value.length > 100) return;

    setSolveTitle(title);

    updateURL('title', e.target.value);
  }

  const handleCommand = (e: KeyboardEvent) => {
    const isCtrl = e.ctrlKey || e.metaKey;

    // Use alt for most mac shortcuts because cmd+shift+Z is standard on mac for redo.
    const isModifier = (ctrlKey === '⌘' && e.altKey) || (ctrlKey === 'Ctrl' && e.shiftKey);

    if (isCtrl && isModifier && e.key === 'M') {

      e.preventDefault();

      handleMirrorM();
    }

    if (isCtrl && isModifier && e.key === 'S') {

      e.preventDefault();

      handleMirrorS();
    }

    if (isCtrl && e.key === 's') {

      e.preventDefault();
      handleShare();
    }

    if (isCtrl && isModifier && e.key === 'X') {

      e.preventDefault();

      handleRotateX();
    }

    if (isCtrl && isModifier && e.key === 'Y') {

      e.preventDefault();

      handleRotateY();
    }

    if (isCtrl && isModifier && e.key === 'Z') {

      e.preventDefault();

      handleRotateZ();
    }

    if (isCtrl && e.key === 'i') {

      e.preventDefault();

      handleInvert();
    }

    if (isCtrl && e.key === '/') {

      e.preventDefault();

      handleRemoveComments();
    }

    if (isCtrl && e.key === 'q') {

      e.preventDefault();

      handleCopySolve();
    }

    if (isCtrl && e.key === 'Delete') {

      e.preventDefault();

      handleClearPage();
    }
  };

  const hasLineStepSpaceChanges = (moves: string[][], currentLineSteps: { moveLine: string; stepInfo: StepInfo[] }[]): boolean => {
    let hasAddedScramble = false;
    for (let idx = 0; idx < moves.length; idx++) {
      const line = moves[idx];
      const lineStepEntry = currentLineSteps[idx];
      if (!lineStepEntry) continue;
      if (!line || line.length === 0) continue;
      const lineAndScram = hasAddedScramble ? line : [...allMovesRef.current[0].flat(), ...line];
      hasAddedScramble = true;
      if (lineStepEntry.moveLine !== lineAndScram.join(' ')) return true;
    }
    return false;
  };

  const respaceLineSteps = () => {
    const respacedSteps: { moveLine: string, stepInfo: StepInfo[] }[] = [];
    const solutionMoves = allMovesRef.current[1];
    const currentLineSteps = lineStepsRef.current;
    const filteredLineSteps = currentLineSteps.filter(item => item.moveLine.trim() !== '');
    let hasStepsCount = 0;
    let hasAddedScramble = false;
    for (let lineIdx = 0; lineIdx < solutionMoves.length; lineIdx++) {
      const line = solutionMoves[lineIdx];
      if (!line || line.length === 0) {
        respacedSteps.push({ moveLine: '', stepInfo: [] });
        continue;
      }
      const lineAndScram = hasAddedScramble ? line : [...allMovesRef.current[0].flat(), ...line];
      hasAddedScramble = true;
      const flatLine = lineAndScram.join(' ');
      const existingLine = filteredLineSteps[hasStepsCount];
      if (existingLine && existingLine.moveLine === flatLine) {
        respacedSteps.push({ moveLine: existingLine.moveLine, stepInfo: existingLine.stepInfo });
        hasStepsCount++;
      } else {
        console.warn('Move order appears to have changed.')
        respacedSteps.push({ moveLine: flatLine, stepInfo: [] });
      }
    };
    lineStepsRef.current = respacedSteps;
    setLineSteps(respacedSteps);
  };

  const updateLineSteps = () => {
    if (!cubeInterpreter.current) {
      return;
    }
    const updatedSteps: { moveLine: string, stepInfo: StepInfo[] }[] = [];
    const previousLineSteps = lineStepsRef.current;

    const getStepsForLine = (lineIdx: number): StepInfo[] => {
      if (!cubeInterpreter.current) {
        console.warn('Cube interpreter missing when computing steps.');
        return [];
      }

      // build moves up to end of this line
      const scrambleMoves = allMovesRef.current[0].flat();
      const solutionMovesUpToLine = solutionMoves.flatMap((line, idx) => {
        if (idx <= lineIdx) return line;
        return [];
      });
      const allMoves = [...scrambleMoves, ...solutionMovesUpToLine];
      const cubeState = simpleCubeRef.current.getCubeState(allMoves as any);

      const steps = cubeInterpreter.current.getStepsCompleted(cubeState);
      return steps;
    };



    const buildMoveLine = (line: string[], lineIdx: number, hasAddedScramble: boolean): string => {
      const lineAndScram = hasAddedScramble ? line : [...allMovesRef.current[0].flat(), ...line];
      return lineAndScram.join(' ');
    };

    const processLineAfterChange = (line: string[], lineIdx: number, updatedSteps: { moveLine: string, stepInfo: StepInfo[] }[]): void => {
      const stepInfo = getStepsForLine(lineIdx);
      const prevSteps = updatedSteps.map(item => item.stepInfo).flat();
      const newSteps = getNewSteps(prevSteps, stepInfo);
      updatedSteps.push({ moveLine: line.join(' '), stepInfo: newSteps });
    };

    const processLineBeforeChange = (
      line: string[],
      lineIdx: number,
      hasAddedScramble: boolean,
      previousLineSteps: { moveLine: string, stepInfo: StepInfo[] }[],
      updatedSteps: { moveLine: string, stepInfo: StepInfo[] }[]
    ): boolean => {
      const flatLine = buildMoveLine(line, lineIdx, hasAddedScramble);
      const oldMoveLine = previousLineSteps[lineIdx]?.moveLine || '';
      const movesSame = oldMoveLine === flatLine;

      if (movesSame) {
        updatedSteps.push({ moveLine: oldMoveLine, stepInfo: previousLineSteps[lineIdx]?.stepInfo || [] });
        return false; // no change found
      } else {
        const stepInfo = getStepsForLine(lineIdx);
        const prevSteps = updatedSteps.map(item => item.stepInfo).flat();
        const newSteps = getNewSteps(prevSteps, stepInfo);
        updatedSteps.push({ moveLine: flatLine, stepInfo: newSteps });
        return true; // change found
      }
    };

    const solutionMoves = allMovesRef.current[1];

    // update steps
    let hasAddedScramble = false;
    let isChangeFound = false;
    for (let lineIdx = 0; lineIdx < solutionMoves.length; lineIdx++) {
      const line = solutionMoves[lineIdx];

      if (!line || line.length === 0) {
        // if this line previously had moves, it's a change that affects subsequent lines
        if (!isChangeFound && previousLineSteps[lineIdx]?.moveLine) {
          isChangeFound = true;
        }
        updatedSteps.push({ moveLine: '', stepInfo: [] });
        continue;
      }

      if (isChangeFound) {
        processLineAfterChange(line, lineIdx, updatedSteps);
      } else {
        const changeDetected = processLineBeforeChange(line, lineIdx, hasAddedScramble, previousLineSteps, updatedSteps);
        hasAddedScramble = true;
        if (changeDetected) {
          isChangeFound = true;
        }
      }
    };

    lineStepsRef.current = updatedSteps;
    setLineSteps(updatedSteps);
  };

  const initializeCubeInterpreter = async () => {
    const algDoc = await import('../../public/recon/compiled-exact-algs.json');
    cubeInterpreter.current = new SimpleCubeInterpreter(algDoc.default.algorithms);
    updateLineSteps();

    // initialize screenshot manager and warm up renderer
    if (!screenshotManagerRef.current) {
      screenshotManagerRef.current = new ScreenshotManager();
    }
    void screenshotManagerRef.current.getBlob(
      { scrambleHTML: '', solutionHTML: '', solveTime: '' },
      { totalMoves: 0, tpsString: '' }
    );
  };

  const toggleShowBottomBar = () => {
    Cookies.set('isShowingBottomBar', (!isShowingToolbar).toString(), { expires: 365 });
    setIsShowingToolbar(prev => !prev);
  }

  useEffect(() => {
    initializeCubeInterpreter();
  }, []);

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

    const splitsParam = urlParams.get('splits');
    if (splitsParam !== null) {
      const parsed = splitsParam === '' ? [''] : splitsParam.split(',');
      setSplits(parsed);
      setCommittedSplits(parsed);
    }

    const solution = allMovesRef.current[1].flat().join(' ');
    if (solution) {
      setPlayerParams(prev => ({ ...prev, solution }));
    }

    const scramble = allMovesRef.current[0].flat().join(' ');
    if (scramble) {
      setPlayerParams(prev => ({ ...prev, scramble }));
    }

    Cookies.get('isShowingBottomBar') === 'false' ? setIsShowingToolbar(false) : setIsShowingToolbar(true);
  }, []);


  const handleCommandRef = useRef(handleCommand);
  handleCommandRef.current = handleCommand;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => handleCommandRef.current(e);
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {

    document.addEventListener('selectionchange', handleStoreSelection);
    return () => {

      document.removeEventListener('selectionchange', handleStoreSelection);
    };

    // may create screenshot, so handleStoreSelection needs current values.
  }, [scrambleHTML, solutionHTML]);

  const windowsToolbarButtons = [
    { id: 'undo', text: 'Undo', shortcutHint: `Ctrl+Z`, onClick: handleUndo, icon: <UndoIcon />, buttonRef: undoRef },
    { id: 'redo', text: 'Redo', shortcutHint: `Ctrl+Y`, onClick: handleRedo, icon: <RedoIcon />, buttonRef: redoRef },
    { id: 'mirrorM', text: 'Mirror M', shortcutHint: `Ctrl+Shift+M`, onClick: handleMirrorM, iconText: 'M' },
    { id: 'mirrorS', text: 'Mirror S', shortcutHint: `Ctrl+Shift+S`, onClick: handleMirrorS, iconText: 'S' },
    { id: 'rotateX', text: 'Rotate X', shortcutHint: `Ctrl+Shift+X`, onClick: handleRotateX, iconText: "X" },
    { id: 'rotateY', text: 'Rotate Y', shortcutHint: `Ctrl+Shift+Y`, onClick: handleRotateY, iconText: "Y" },
    { id: 'rotateZ', text: 'Rotate Z', shortcutHint: `Ctrl+Shift+Z`, onClick: handleRotateZ, iconText: "Z" },
    { id: 'invert', text: 'Invert', shortcutHint: `Ctrl+I`, onClick: handleInvert, icon: <InvertIcon /> },
    { id: 'cat', text: 'Cat', shortcutHint: 'Cat', onClick: handleAddCat, icon: <CatIcon /> },
    { id: 'removeComments', text: 'Remove Comments', shortcutHint: `Ctrl+/ `, onClick: handleRemoveComments, iconText: '// ' },
  ];

  const macToolbarButtons = [
    { id: 'undo', text: 'Undo', shortcutHint: `⌘+Z`, onClick: handleUndo, icon: <UndoIcon />, buttonRef: undoRef },
    { id: 'redo', text: 'Redo', shortcutHint: `⌘+Y`, onClick: handleRedo, icon: <RedoIcon />, buttonRef: redoRef },
    { id: 'mirrorM', text: 'Mirror M', shortcutHint: `⌘+Alt+M`, onClick: handleMirrorM, iconText: 'M' },
    { id: 'mirrorS', text: 'Mirror S', shortcutHint: `⌘+Alt+S`, onClick: handleMirrorS, iconText: 'S' },
    { id: 'rotateX', text: 'Rotate X', shortcutHint: `⌘+Alt+X`, onClick: handleRotateX, iconText: "X" },
    { id: 'rotateY', text: 'Rotate Y', shortcutHint: `⌘+Alt+Y`, onClick: handleRotateY, iconText: "Y" },
    { id: 'rotateZ', text: 'Rotate Z', shortcutHint: `⌘+Alt+Z`, onClick: handleRotateZ, iconText: "Z" },
    { id: 'invert', text: 'Invert', shortcutHint: `⌘+I`, onClick: handleInvert, icon: <InvertIcon /> },
    { id: 'cat', text: 'Cat', shortcutHint: 'Cat', onClick: handleAddCat, icon: <CatIcon /> },
    { id: 'removeComments', text: 'Remove Comments', shortcutHint: `⌘+/ `, onClick: handleRemoveComments, iconText: '// ' },
  ];

  const toolbarButtons = ctrlKey === '⌘' ? macToolbarButtons : windowsToolbarButtons;

  return (
    <main id="main_page" className="relative flex flex-col bg-primary-900 mt-10">

      {/* For aligning the skeleton perfectly */}
      {/* <div className="absolute inset-0 z-50 pointer-events-none opacity-50 [&>main]:mt-0">
        <ReconSkeleton />
      </div> */}

      {/* utility for compiling list of alg hashes */}
      {/* <AlgCompiler /> */}

      {/* utility for verifying manual algs */}
      {/* <ManualAlgVerifier
        scrambleRef={scrambleMethodsRef}
        solutionRef={solutionMethodsRef}
      /> */}

      {/* utility for building case patterns */}
      {/* <LLpatternBuilder /> */}

      <InfoPanel initiallyDismissed={infoPanelSlot == null}>{infoPanelSlot}</InfoPanel>
      {isGifDialogOpen ? (
        <CubeGifDialog
          onClose={() => setIsGifDialogOpen(false)}
          scramble={allMovesRef.current[0].flat().join(' ')}
          solutionLines={allMovesRef.current[1].map((moves, i) => ({
            moves,
            isWhitespace: !!isWhitespaceLine[i],
          }))}
          lineIconData={lineIconData}
          splits={splits}
          committedSplits={committedSplits}
          onSplitsChange={setSplits}
          onSplitsCommit={handleSplitsCommit}
        />
      ) : null}
      <div id="top-bar" className="px-3 flex flex-col w-full items-end gap-5 mb-2 -mt-11 pointer-events-none">
        <div className="flex-none flex flex-row space-x-1 text-dark_accent pointer-events-auto">
          <TopButton id="trash" text="Clear Page" shortcutHint={`${ctrlKey}+Del`} onClick={handleClearPage} icon={<TrashIcon />} alert={topButtonAlert} setAlert={setTopButtonAlert} />
          <CopySolveDropdown onCopyText={handleCopySolve} onScreenshot={handleScreenshot} alert={topButtonAlert} setAlert={setTopButtonAlert} />
          <TopButton id="share" innerText="Share" text="Share Preview" shortcutHint={`${ctrlKey}+S`} onClick={handleShare} icon={<ShareIcon />} alert={topButtonAlert} setAlert={setTopButtonAlert} />
        </div>
        <TitleWithPlaceholder solveTitle={solveTitle} handleTitleChange={handleTitleChange} />
      </div>
      <div id="scramble-area" className="px-3 mt-3 flex flex-col">
        <div className="text-xl text-dark_accent font-medium">Scramble</div>
        <div className="lg:max-h-[15.1rem] max-h-40 overflow-y-auto" id="scramble">
          <MovesTextEditor
            name={`scramble`}
            ref={scrambleMethodsRef}
            trackMoves={trackMoves}
            autofocus={false}
            moveHistory={moveHistory}
            updateHistoryBtns={memoizedUpdateHistoryBtns}
            html={scrambleHTML}
            setHTML={memoizedSetScrambleHTML}
            initialContent={solutionHTML ? '' : dailyScramble}
          />
        </div>
      </div>
      <div id="player-box" className="px-3 relative flex flex-col mt-6 w-full justify-center items-center">
        <div id="cube_model" className="flex h-full aspect-video max-h-96 min-h-50 bg-primary-900 select-none z-20 w-full">
          <Suspense fallback={<div className="flex text-xl w-full h-full justify-center items-center text-primary-100">Loading cube...</div>}>
            <TwistyPlayer
              ref={twistyPlayerRef}
              speed={speed}
              scrambleRequest={playerParams.scramble}
              solutionRequest={playerParams.solution}
              animationTimesRequest={playerParams.animationTimes}
              handleControllerRequest={handleControllerRequest}
              controllerButtonsStatus={controllerButtonsStatus}
            />
          </Suspense>
        </div>
      </div>
      <div id="bottom-box" className="mx-3 relative flex flex-col justify-center items-center">
        <div id="bottom-box-borders" className={`border-x w-full border-neutral-600 h-14 absolute top-0 z-0 pointer-events-none ${isShowingToolbar ? 'block' : 'hidden'}`}></div>
        <div
          id="bottom-bar"
          ref={bottomBarRef}
          className={`w-full px-3 space-x-1 static flex flex-row items-center place-content-end justify-start transform z-20
              ${isShowingToolbar ? 'translate-y-0 opacity-100 h-14' : '-translate-y-full opacity-0 pointer-events-none h-0'}`}
          style={{
            visibility: isShowingToolbar ? 'visible' : 'hidden',
            transition: isShowingToolbar
              ? 'transform 300ms linear, opacity 300ms ease-in-out, visibility 0s linear 100ms' : ''
          }}
        >
          <SpeedDropdown speed={speed} setSpeed={setSpeed} />
          <Toolbar buttons={toolbarButtons} containerRef={bottomBarRef} />
        </div>
        <div className="border border-neutral-600 hover:border-primary-100 h-1.5 rounded-b-sm w-full z-0 bg-primary-700 mb-2" onClick={() => toggleShowBottomBar()}></div>
      </div>
      <div id="datafields" className="w-full items-start transition-width duration-500 ease-linear">
        <div id="solution-area" className="px-3 mt-1 mb-14 flex flex-col w-full">
          <div className="flex flex-row items-baseline w-full z-10">
            <div className="text-xl text-dark_accent font-medium flex-1">Solution</div>
            {showSplitsColumn && (
              <div className="text-xl text-dark_accent font-medium" style={{ width: SPLITS_WIDTH, textAlign: 'center' }}>Splits</div>
            )}
          </div>
          <div id="rich-solution-display" className="relative max-h-[35vh] -mb-20 border-none overflow-visible">
            <div
              className="icon-column-clip max-h-[35vh] absolute left-0 top-0"
              style={{ width: ICON_SIZE_CONFIG['medium'].iconWidth }}
            >
              <div ref={iconScrollRef}>
                <IconStack
                  moves={allMovesRef.current}
                  position={moveLocation.current}
                  editableElement={solutionMethodsRef.current?.getElement() || null}
                  lineIconData={lineIconData}
                />
                <div className="h-6 z-10" /> {/* buffer at bottom so last line of icons doesn't get cut off */}
              </div>
            </div>
            <div
              className="min-w-0 overflow-y-auto max-h-[35vh] relative z-10"
              id="solution"
              style={{
                marginLeft: hasIcons ? ICON_SIZE_CONFIG['medium'].iconWidth : 0,
                marginRight: showSplitsColumn ? SPLITS_WIDTH : 0,
                transition: 'margin-left 200ms linear, margin-right 200ms linear',
              }}
              onScroll={(e) => {
                if (iconScrollRef.current) {
                  iconScrollRef.current.style.transform = `translateY(-${e.currentTarget.scrollTop}px)`;
                }
                if (splitsScrollRef.current) {
                  splitsScrollRef.current.style.transform = `translateY(-${e.currentTarget.scrollTop}px)`;
                }
              }}
            >
              <MovesTextEditor
                name={`solution`}
                ref={solutionMethodsRef}
                trackMoves={trackMoves}
                autofocus={infoPanelSlot == null}
                moveHistory={moveHistory}
                updateHistoryBtns={memoizedUpdateHistoryBtns}
                html={solutionHTML}
                setHTML={memoizedSetSolutionHTML}
                suggestionsRef={suggestionsRef}
                lineHeight={solutionLineHeight}
              />
            </div>
            {showSplitsColumn && (
              <div
                className="max-h-[35vh] absolute right-0 top-0 overflow-hidden"
                style={{ width: SPLITS_WIDTH }}
              >
                <div ref={splitsScrollRef}>
                  <SplitsStack
                    editableElement={solutionMethodsRef.current?.getElement() || null}
                    splits={splits}
                    onSplitsChange={setSplits}
                    onSplitsCommit={handleSplitsCommit}
                    isWhitespaceLine={isWhitespaceLine}
                  />
                  <div className="h-6" />
                </div>
              </div>
            )}
          </div>
        </div>
        <div id="time-area" className="px-3 pt-12 flex flex-col w-full pb-16">
          <div className="text-xl text-dark_accent font-medium w-full">Time</div>
          <div id="time-stats" className="flex flex-row flex-wrap text-nowrap items-center w-full gap-y-2 pb-2">
            <div id="time-field" className="border border-neutral-600 group flex flex-row items-center justify-start">
              <input
                id="time-input"
                type="number"
                placeholder="00.000"
                className="pt-2 pb-2 px-2 text-xl text-primary-100 bg-primary-900 group-focus:border-primary-100 hover:bg-primary-800 rounded-sm box-content no-spinner w-17"
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
            </div>
          </div>
          {showSplitsWarning && (
            <div className="text-orange-500 text-sm">Time doesn&apos;t match sum of splits ({splitsSum.toFixed(3)} sec)</div>
          )}
        </div>
      </div>
    </main>
  );
}
