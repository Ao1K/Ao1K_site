'use client';
import { useState, useRef, useEffect, lazy, Suspense, useCallback, useMemo, useSyncExternalStore } from 'react';
import MovesTextEditor from "../../components/recon/MovesTextEditor";
import SpeedDropdown from "../../components/recon/SpeedDropdown";

import Toolbar from "../../components/Toolbar";
import TimeArea from "../../components/recon/TimeArea";
import { formatTimeStat, parsePenaltyParam, type PenaltyStatus } from "../../composables/recon/penaltyStatus";
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
import isSelectionInTextbox from "../../composables/recon/isSelectionInTextbox";
import {
  invertSelectedMoves,
  relabelSelectedMoves,
  removeSelectedComments,
  rotateSelectedMoves,
  type SelectionTransform,
} from "../../composables/recon/editorDocument";

import TitleWithPlaceholder from "../../components/recon/TitleInput";
import TopButton from "../../components/recon/TopButton";
import CopySolveDropdown from "../../components/recon/CopySolveDropdown";
import ScrambleDropdown from "../../components/recon/ScrambleDropdown";
import { customDecodeURL } from '../../composables/recon/urlEncoding';
import InfoPanel from '../../components/recon/InfoPanel';
import IconStack, { computeLineIconData } from './IconStack';
import { showToast, dismissToast } from '../../composables/toast';
import SplitsStack, { SPLITS_WIDTH, splitsToURLParam } from './SplitsStack';
import ColumnSelector from './ColumnSelector';
import { useEnabledColumns } from '../../composables/recon/useEnabledColumns';
import { ICON_SIZE_CONFIG, useCubeColors, useAlgsets, useHandedness, readSettingsFromCookie, type Handedness } from '../../composables/useSettings';
import { SimpleCube, type CubeState } from '../../composables/recon/SimpleCube';
import { cube3x3, type Move3x3, type Rotation3x3 } from '../../utils/parser/cube3x3';
import { SimpleCubeInterpreter } from '../../composables/recon/SimpleCubeInterpreter';
import type { StepInfo, Suggestion } from '../../composables/recon/SimpleCubeInterpreter';
import type { CompiledDoc } from '../../composables/recon/ExactAlgSuggester';
import type { CompiledLLAlg } from '../../composables/recon/LLsuggester';
import type { CompilableLLStep } from '../../composables/recon/LLinterpreter';
import { savedAlgKeys } from '../../composables/recon/suggestionRanking';
import { llAlgKey } from '../../composables/algs/algMoves';
import { applyMovesUntilCross, getCrossSuggestions } from '../../composables/recon/crossAutocomplete';
import { hasReviewContent, reviewSolve } from '../../composables/recon/solveReview';
import type { CubeStateReader } from '../../composables/recon/algReview';
import { readFavorites } from '../../composables/algs/algFavorites';
import { llStepsForAlg } from '../../composables/algs/classifyAlg';
import { getNewSteps } from '../../composables/recon/getLineStepInfo';
import { ScreenshotManager, isSolveComplete } from '../../composables/recon/ScreenshotManager';
import type { CubePlayerImperativeRef } from '../../components/recon/CubePlayer';
import SolveBreakdown, { type BreakdownPlayRequest } from './SolveBreakdown';
import {
  startBreakdown,
  endBreakdown,
  FLIGHT_BOX_CLASS,
  PAGE_TRANSITION_NAMES,
  flightStyle,
  type EditorView,
  type BreakdownSession,
} from '../../composables/recon/breakdownTransition';

// utility imports
// import HtmlSceneDialog from "../../components/recon/HtmlSceneDialog";
// import HtmlImageDialog from "../../components/recon/HtmlImageDialog";
// import { AlgCompiler } from '../../utils/AlgCompiler';
// import ManualAlgVerifier from './ManualAlgVerifier';
// import LLpatternBuilder from '../../utils/LLpatternBuilder';
// import { highlightClass } from '../../utils/sharedConstants';
// import ReconSkeleton from './ReconSkeleton';

export interface MoveHistory {
  history: string[][];
  index: number;
  status: string;
  MAX_HISTORY: number;
}

export type PlayerParams = { animationTimes: number[]; solution: Move3x3[]; scramble: Move3x3[] };

interface ClearedPageSnapshot {
  scrambleHTML: string;
  solutionHTML: string;
  allMoves: Move3x3[][][];
  moveLocation: [number, number, number];
  playerParams: PlayerParams;
  solveTime: number | string;
  penaltyStatus: PenaltyStatus;
  solveTitle: string;
  splits: string[];
  committedSplits: string[];
  lineSteps: { moveLine: string; stepInfo: StepInfo[] }[];
  moveHistory: { history: string[][]; index: number };
  search: string;
}


export interface ControllerRequestOptions {
  type: 'fullLeft' | 'stepLeft' | 'pause' | 'play' | 'replay' | 'stepRight' | 'fullRight';
}

const CubePlayer = lazy(() => import("../../components/recon/CubePlayer"));
const CubeGifDialog = lazy(() => import("../../components/recon/CubeGifDialog"));

type AlgsetModule = Promise<{ default: { algorithms: unknown[] } }>;

const ALGSET_LOADERS: Record<string, (handedness: Handedness) => AlgsetModule> = {
  f2l: () => import('../../public/recon/compiled-f2l-algs.json'),
  oll: (handedness) => handedness === 'left'
    ? import('../../public/recon/compiled-oll-lefty-algs.json')
    : import('../../public/recon/compiled-oll-righty-algs.json'),
  pll: (handedness) => handedness === 'left'
    ? import('../../public/recon/compiled-pll-lefty-algs.json')
    : import('../../public/recon/compiled-pll-righty-algs.json'),
  zbls: () => import('../../public/recon/compiled-zbls-algs.json'),
  zbll: (handedness) => handedness === 'left'
    ? import('../../public/recon/compiled-zbll-lefty-algs.json')
    : import('../../public/recon/compiled-zbll-righty-algs.json'),
};

const HANDED_ALGSETS: readonly CompilableLLStep[] = ['oll', 'pll', 'zbll'];

const algsetVariant = (name: string, handedness: Handedness): Handedness | undefined =>
  HANDED_ALGSETS.some(handed => handed === name) ? handedness : undefined;

const algKeysByList = new WeakMap<unknown[], ReadonlySet<string>>();

const getAlgKeys = (algorithms: unknown[]): ReadonlySet<string> => {
  let keys = algKeysByList.get(algorithms);
  if (!keys) {
    keys = new Set((algorithms as CompiledLLAlg[]).map(entry => llAlgKey(cube3x3.parseTrusted(entry.alg))));
    algKeysByList.set(algorithms, keys);
  }
  return keys;
};

const pickOffHandAlgsets = async (
  enabledHanded: CompilableLLStep[],
  unloaded: CompilableLLStep[],
  handedness: Handedness,
): Promise<Set<CompilableLLStep>> => {
  const picked = new Set<CompilableLLStep>();
  if (unloaded.length === 0) return picked;

  const inHandLists = await Promise.all(enabledHanded.map(name => ALGSET_LOADERS[name](handedness)));
  const inHandKeys = inHandLists.map(mod => getAlgKeys(mod.default.algorithms));

  const wanted = new Set(unloaded);
  for (const favorite of readFavorites()) {
    if (picked.size === wanted.size) break;
    const key = llAlgKey(favorite.moves);
    if (inHandKeys.some(keys => keys.has(key))) continue;
    llStepsForAlg(favorite.moves)
      .filter(step => wanted.has(step))
      .forEach(step => picked.add(step));
  }
  return picked;
};

let currentSpeed = 30;
const calcCubeSpeedLocal = (speed: number) =>
  speed === 100 ? 1000 : 1.5 ** (speed / 15) - 0.6;

const isRotationOnlyLine = (moves: Move3x3[]) =>
  moves.length > 0 && moves.every(cube3x3.isRotation);

const TRANSFORM_SHORTCUT_LETTERS = new Set(['m', 's', 'x', 'y', 'z', 'i']);

const MAX_EDITOR_HISTORY = 100;
const CLEAR_UNDO_DURATION = 8000;

const noopSubscribe = () => () => {};
const getCtrlKeySnapshot = () => (/Mac|iPod|iPhone|iPad/.test(navigator.userAgent) ? '⌘' : 'Ctrl');
const getCtrlKeyServerSnapshot = () => 'Ctrl';

export default function Recon({ dailyScramble = "", infoPanelSlot }: { dailyScramble?: string, infoPanelSlot?: React.ReactNode }) {
  const [cubeColors] = useCubeColors();
  const [algsets] = useAlgsets();
  const [handedness] = useHandedness();
  const [enabledColumns, updateEnabledColumns] = useEnabledColumns();
  
  const [hasSplitsFromURL, setHasSplitsFromURL] = useState<boolean>(false);
  const isIconsColumnEnabled = enabledColumns.icons;
  const showSplitsColumn = enabledColumns.splits || hasSplitsFromURL;
  const enabledAlgsets = useMemo(() => new Set(Object.values(algsets).flat()), [algsets]);

  const allMovesRef = useRef<Move3x3[][][]>([[[]], [[]]]);
  const moveLocation = useRef<[number, number, number]>([0, 0, 0]);
  const trueCaretRef = useRef<[number, number]>([0, 0]);

  const [speed, setSpeed] = useState<number>(30);
  currentSpeed = speed;

  const [solveTime, setSolveTime] = useState<number | string>('');
  const [penaltyStatus, setPenaltyStatus] = useState<PenaltyStatus>(0);
  const [solveTitle, setSolveTitle] = useState<string>('');
  const [topButtonAlert, setTopButtonAlert] = useState<{ id: string; message: string; messageType: 'info' | 'warn' }>({ id: "", message: "", messageType: 'info' });
  const [isShowingToolbar, setIsShowingToolbar] = useState<boolean>(true);
  const [historyPosition, setHistoryPosition] = useState<{ index: number; length: number }>({ index: 0, length: 1 });
  const [lineSteps, setLineSteps] = useState<{ moveLine: string; stepInfo: StepInfo[] }[]>([]);

  const [scrambleHTML, setScrambleHTML] = useState<string>('');
  const [solutionHTML, setSolutionHTML] = useState<string>('');
  const [isGifDialogOpen, setIsGifDialogOpen] = useState<boolean>(false);
  const [isHtmlSceneDialogOpen, setIsHtmlSceneDialogOpen] = useState<boolean>(false);
  const [htmlImageData, setHtmlImageData] = useState<{ cubeState: CubeState; setupMovesForFilename: string } | null>(null);
  const [breakdownSession,setBreakdownSession] = useState<BreakdownSession | null>(null);
  const [breakdownPlayRequest, setBreakdownPlayRequest] = useState<BreakdownPlayRequest | null>(null);
  const isBreakdownOpen = breakdownSession !== null;

  const [playerParams, setPlayerParams] = useState<PlayerParams>({ animationTimes: [], solution: [], scramble: [] });

  const [splits, setSplits] = useState<string[]>([]);
  const [committedSplits, setCommittedSplits] = useState<string[]>([]);
  const committedSplitsRef = useRef<string[]>([]);

  const scrambleMethodsRef = useRef<ImperativeRef>(null);
  const solutionMethodsRef = useRef<ImperativeRef>(null);
  const [solutionDisplayElement, setSolutionDisplayElement] = useState<HTMLDivElement | null>(null);
  const selectionTextboxRef = useRef<'scramble' | 'solution' | null>(null);
  const bottomBarRef = useRef<HTMLDivElement>(null!);
  const isLoopingRef = useRef<boolean>(false);
  const loopTimeoutRef = useRef<number | null>(null);
  const screenshotManagerRef = useRef<ScreenshotManager | null>(null);
  const isWhiteSpaceLineRef = useRef<boolean[]>([]);
  const cubePlayerRef = useRef<CubePlayerImperativeRef>(null);
  const clearedPageRef = useRef<ClearedPageSnapshot | null>(null);
  const lastCopiedSolveRef = useRef<{ moves: string; solveTime: number | string } | null>(null);
  const clearedPageToastIdRef = useRef<number | null>(null);
  const clearedPageTimeoutRef = useRef<number | null>(null);
  const clearLoopTimeout = useCallback(() => {
    if (loopTimeoutRef.current !== null) {
      clearTimeout(loopTimeoutRef.current);
      loopTimeoutRef.current = null;
    }
  }, []);

  committedSplitsRef.current = committedSplits;

  const totalMoves = cube3x3.count(allMovesRef.current[1].flat(), 'stm');
  const tpsString = typeof solveTime === 'number' && solveTime > 0
    ? `(${Math.round((totalMoves / solveTime) * 100) / 100} tps)`
    : '';

  const solutionLineHeight = ICON_SIZE_CONFIG['medium'].lineHeight;

  const lineIconData = computeLineIconData(allMovesRef.current[1], lineSteps.map(item => item.stepInfo), cubeColors);
  const showIconsColumn = isIconsColumnEnabled && lineIconData.some(d => !d.isEmptyIcon);
  const hasReviewFeedback = hasReviewContent(
    allMovesRef.current[0].flat(),
    allMovesRef.current[1],
    lineIconData,
  );
  const reviewButtonClass = !hasReviewFeedback
    ? 'text-neutral-500 border-neutral-700'
    : isSolveComplete(lineSteps.map(line => line.stepInfo))
      ? 'text-primary-900 border-primary-100 animate-review-highlight'
      : 'text-primary-100 border-neutral-600 hover:border-primary-100';

  const isWhitespaceLine = lineIconData.map(d => d.isWhitespace);
  isWhiteSpaceLineRef.current = isWhitespaceLine;

  let splitIdxCounter = 0;
  const requiredSplitIndices: number[] = [];
  for (let lineIdx = 0; lineIdx < allMovesRef.current[1].length; lineIdx++) {
    if (isWhitespaceLine[lineIdx]) continue;
    const line = allMovesRef.current[1][lineIdx];
    if (line.length > 0 && !isRotationOnlyLine(line)) requiredSplitIndices.push(splitIdxCounter);
    splitIdxCounter++;
  }

  const isCompletedSolve = isSolveComplete(lineSteps.map((line) => line.stepInfo));
  const solutionSectionLabel = isCompletedSolve ? 'Solution' : 'Partial Solution';

  const moveHistory = useRef<MoveHistory>({ history: [['', '']], index: 0, MAX_HISTORY: MAX_EDITOR_HISTORY, status: 'loading' });

  const [controllerButtonsStatus, setControllerButtonsStatus] = useState<{ fullLeft: string, stepLeft: string, stepRight: string, fullRight: string, playPause: string }>({
    fullLeft: 'disabled',
    stepLeft: 'disabled',
    stepRight: 'disabled',
    fullRight: 'disabled',
    playPause: 'disabled'
  });

  const cubeInterpreter = useRef<SimpleCubeInterpreter | null>(null);
  const oppositeHandInterpreterRef = useRef<SimpleCubeInterpreter | null>(null);
  const simpleCubeRef = useRef<SimpleCube>(new SimpleCube());

  const ctrlKey = useSyncExternalStore(noopSubscribe, getCtrlKeySnapshot, getCtrlKeyServerSnapshot);

  /**
   * Finds the first non-empty line at or before the given line index.
   * Returns -1 if no non-empty line is found.
   */
  const findPrevNonEmptyLine = (moves: Move3x3[][], lineIndex: number): number => {
    for (let i = lineIndex; i >= 0; i--) {
      if (moves && moves[i]?.length > 0) {
        return i;
      }
    }
    return -1;
  }

  const findLastMoveInLine = (moves: Move3x3[][], lineIndex: number): number => {
    const lastMoveIndex = moves[lineIndex] ? moves[lineIndex].length : -1; // not length - 1 because it's the number of moves before the caret
    return lastMoveIndex;
  }

  /**
   * Starting from first line of interest, find first line that has a move.
   * If no line has a move, return -1.
   */
  const findLineOfNextMove = (moves: Move3x3[][], lineIndex: number): number => {
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
  const areMoveLinesEqual = (currentMoves: Move3x3[][], lines: Move3x3[][]): boolean => {
    currentMoves = currentMoves.filter(line => line.length != 0);
    lines = lines.filter(line => line.length != 0);

    if (currentMoves.length !== lines.length) {
      return false;
    } else {
      for (let i = 0; i < currentMoves.length; i++) {
        const line = currentMoves[i];
        const newLine = lines[i] || [];
        if (cube3x3.format(line) !== cube3x3.format(newLine)) {
          return false;
        }
      }
    }
    return true;
  };


  const areMovesSame = (currentMoves: Move3x3[][], moves: Move3x3[][]): boolean => {
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

  const findAnimationLengths = (moves: Move3x3[]): number[] => {
    const moveAnimationTimes: number[] = [];
    const singleTime = 1000;
    const doubleTime = 1500;
    const tripleTime = 2000;

    if (!moves || moves.length === 0) {
      return [0]; // no moves, return 0
    }

    moves.forEach((move) => {
      const quarterTurnCount = Math.abs(cube3x3.amount(move));
      if (quarterTurnCount === 2) {
        moveAnimationTimes.push(doubleTime);
      } else if (quarterTurnCount === 3) {
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
  const findAnimationTimes = (idIndex: number, lineIndex: number, moveIndex: number, moves: Move3x3[][]): number[] => {

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

  const getMoveToRight = (moves?: Move3x3[][]): [number, number] => {
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

    const stmCount = cube3x3.count(lineMoves, 'stm');
    if (stmCount === 0) return null;

    const tps = stmCount / splitTime;
    const pauseFraction = Math.max(0, 1 - tps / 10);
    // pause is an absolute recognition time capped at 800ms, not a fraction of the split
    const pauseMs = Math.min(pauseFraction * 800, splitTime * 1000 * 0.5);
    const moveTimeMs = splitTime * 1000 - pauseMs;

    const weights = lineMoves.map(move => {
      const quarterTurnCount = Math.abs(cube3x3.amount(move));
      if (quarterTurnCount === 3) return 2.0;
      if (quarterTurnCount === 2) return 1.5;
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
      cubePlayerRef.current?.setInstantOverride(useInstant);
      if (!useInstant && moveIndex !== 0) {
        cubePlayerRef.current?.setTempoScale(splitTiming.tempoScale);
      }
      timeoutMs = moveIndex === 0
        ? splitTiming.pause
        : (splitTiming.moveTimes[moveIndex - 1] ?? timeoutMs);
    } else {
      cubePlayerRef.current?.setInstantOverride(false);
      cubePlayerRef.current?.setTempoScale(calcCubeSpeedLocal(currentSpeed));
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

  const getControllerButtonsStatus = (idIndex: number, lineIndex: number, moveIndex: number, moves: Move3x3[][], playPauseStatus: string): {
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

  const handleEmptyLineSuggestions = (
    solutionMoves: Move3x3[][],
    trueLineIndex: number,
    enabledAlgsets: Set<string>,
    handedness: Handedness,
  ) => {
    if (!cubeInterpreter.current) {
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
    const cubeState = simpleCubeRef.current.getCubeState(allMoves);

    const steps = cubeInterpreter.current.getStepsCompleted(cubeState);
    const savedAlgs = savedAlgKeys(readFavorites());
    const newSuggestions: Suggestion[] = cubeInterpreter.current.getAlgSuggestions(steps, { enabledAlgsets, handedness, savedAlgs });

    solutionMethodsRef.current?.setSuggestions(newSuggestions, trueLineIndex);
  };

  /**
   * Creates and pushes out cross suggestions. Returns true or false based on if operation was successful.
   */
  const handleCrossSuggestions = (
    solutionMoves: Move3x3[][],
    lineIndex: number,
    enabledAlgsets: Set<string>,
    handedness: Handedness,
  ): boolean => {
    const interpreter = cubeInterpreter.current;
    if (!interpreter || !enabledAlgsets.has('cross')) return false;

    const precedingMoveGroups = [allMovesRef.current[0].flat(), ...solutionMoves.slice(0, lineIndex)];
    const facelets = applyMovesUntilCross(precedingMoveGroups);
    if (!facelets) return false;

    const index = interpreter.getF2LScoreIndex(handedness);
    const suggestions = index ? getCrossSuggestions(facelets, solutionMoves[lineIndex] ?? [], index) : [];
    solutionMethodsRef.current?.setSuggestions(suggestions, lineIndex);
    return true;
  };

  const updateLineSuggestions = (
    solutionMoves: Move3x3[][],
    lineIndex: number,
    enabledAlgsets: Set<string>,
    handedness: Handedness,
  ) => {
    if (handleCrossSuggestions(solutionMoves, lineIndex, enabledAlgsets, handedness)) return;
    if (solutionMoves[lineIndex]?.length === 0) {
      handleEmptyLineSuggestions(solutionMoves, lineIndex, enabledAlgsets, handedness);
    }
  };

  const isCaretInSolution = () =>
    solutionMethodsRef.current?.getElement()?.contains(window.getSelection()?.anchorNode ?? null) ?? false;

  const refreshLineSuggestions = (lineIndex: number, enabledAlgsets: Set<string>, handedness: Handedness) => {
    updateLineSuggestions(allMovesRef.current[1], lineIndex, enabledAlgsets, handedness);
  };

  const loadEnabledAlgsets = async (enabledAlgsets: Set<string>, forHandedness: Handedness) => {
    const interpreter = cubeInterpreter.current;
    if (!interpreter) return;

    const algsetsToLoad = enabledAlgsets.has('cross') ? new Set([...enabledAlgsets, 'f2l']) : enabledAlgsets;
    const toLoad = [...algsetsToLoad].filter(name =>
      ALGSET_LOADERS[name] && !interpreter.isAlgsetLoaded(name, algsetVariant(name, forHandedness))
    );
    if (toLoad.length > 0) {
      await Promise.all(toLoad.map(async name => {
        const mod = await ALGSET_LOADERS[name](forHandedness);
        interpreter.addAlgset(name, mod.default.algorithms as CompiledDoc[] | CompiledLLAlg[], algsetVariant(name, forHandedness));
      }));
    }

    const offHand: Handedness = forHandedness === 'left' ? 'right' : 'left';
    const enabledHanded = HANDED_ALGSETS.filter(name => enabledAlgsets.has(name));
    const unloadedOffHand = enabledHanded.filter(name => !interpreter.isOffHandAlgsetLoaded(name, offHand));
    const offHandAlgsets = await pickOffHandAlgsets(enabledHanded, unloadedOffHand, forHandedness);
    await Promise.all([...offHandAlgsets].map(async name => {
      const mod = await ALGSET_LOADERS[name](offHand);
      interpreter.addOffHandAlgset(name, mod.default.algorithms as CompiledLLAlg[], offHand);
    }));

    const [idIndex, lineIndex] = trueCaretRef.current;
    if (idIndex === 1 && isCaretInSolution()) refreshLineSuggestions(lineIndex, enabledAlgsets, forHandedness);
  };

  useEffect(() => {
    const handleSettingsChanged = () => {
      const freshSettings = readSettingsFromCookie();
      const freshEnabledAlgsets = new Set(Object.values(freshSettings.algsets).flat());
      void loadEnabledAlgsets(freshEnabledAlgsets, freshSettings.handedness);
    };
    window.addEventListener('ao1kSettingsChanged', handleSettingsChanged);
    return () => window.removeEventListener('ao1kSettingsChanged', handleSettingsChanged);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- listens once at mount; loadEnabledAlgsets only closes over refs
  }, []);

  const trackMoves = useCallback(
    (
      idIndex: number,
      lineIndex: number, // the line number of the caret, zero-indexed
      moveIndex: number, // the number of moves before the caret on its line 
      moves: Move3x3[][], // the moves in the textbox of id
      moveControllerStatus?: string // the current status of loopStepRight
    ) => {

      if (moveControllerStatus !== 'play') {
        isLoopingRef.current = false; // break out of loopStepRight when status changes
        cubePlayerRef.current?.setInstantOverride(false);
        cubePlayerRef.current?.setTempoScale(calcCubeSpeedLocal(currentSpeed));
      }

      if (lineIndex === -1 || moveIndex === -1) {
        // handles invalid ControllerRequests
        console.warn('Invalid lineIndex or moveIndex:', lineIndex, moveIndex);
        return;
      }

      trueCaretRef.current = [idIndex, lineIndex];

      if (idIndex === 1 && isCaretInSolution()) updateLineSuggestions(moves, lineIndex, enabledAlgsets, handedness);

      const isLineEmpty = moves[lineIndex]?.length === 0;
      if (isLineEmpty) {

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
        const prev = splits;
        if (prev.length !== nonEmptyCount) {
          if (prev.length < nonEmptyCount) {
            const padded = [...prev, ...Array(nonEmptyCount - prev.length).fill('')];
            setSplits(padded);
            setCommittedSplits(c => [...c, ...Array(nonEmptyCount - c.length).fill('')]);
          } else {
            const trimmed = prev.slice(0, nonEmptyCount);
            setSplits(trimmed);
            setCommittedSplits(c => c.slice(0, nonEmptyCount));
            updateURL('splits', splitsToURLParam(trimmed));
          }
        }
      }

      allMovesRef.current[idIndex] = [...moves];
      if (idIndex === 0 && !isMovesSame) {
        const suggestionLineIndex = solutionMethodsRef.current?.getSuggestionLineIndex();
        if (suggestionLineIndex != null) refreshLineSuggestions(suggestionLineIndex, enabledAlgsets, handedness);
      }

      const sol = allMovesRef.current[1].flat();
      const scram = allMovesRef.current[0].flat();

      if (idIndex === 1 && moveControllerStatus) highlightMove(moveIndex, lineIndex);

      let limitedTimes = findAnimationTimes(idIndex, lineIndex, moveIndex, moves);
      moveLocation.current = [idIndex, lineIndex, moveIndex];

      const currentLineSteps = lineSteps;

      if (!isMoveLineContentSame) {
        updateLineSteps();
      } else {
        if (hasLineStepSpaceChanges(moves, currentLineSteps)) {
          respaceLineSteps();
        }
      };

      setPlayerParams({ animationTimes: limitedTimes, solution: sol, scramble: scram });

      const playPauseStatus = moveControllerStatus === 'play' ? 'play' : 'pause';

      const controllerButtonsEnabled = getControllerButtonsStatus(idIndex, lineIndex, moveIndex, allMovesRef.current[idIndex], playPauseStatus);
      setControllerButtonsStatus(controllerButtonsEnabled)

  // eslint-disable-next-line react-hooks/exhaustive-deps -- the helper fns below only close over refs/params, not component state; listing them would force a new trackMoves identity every render
  }, [splits, lineSteps, enabledAlgsets, handedness]);

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

  const canUndo = historyPosition.index > 0;
  const canRedo = historyPosition.index < historyPosition.length - 1;

  const publishHistoryPosition = useCallback(() => {
    setHistoryPosition({
      index: moveHistory.current.index,
      length: moveHistory.current.history.length,
    });
  }, []);

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

  const getWholeTextboxRange = (textboxName: 'scramble' | 'solution'): Range => {

    const parentElement = document.getElementById(textboxName);
    const textbox = parentElement!.querySelector<HTMLDivElement>('div[contenteditable="true"]');
    let range = document.createRange();
    range.selectNodeContents(textbox!);
    return range;

  }

  const getSelectionTextbox = (): 'scramble' | 'solution' | null => {
    const selection = window.getSelection();
    if (!isSelectionInTextbox(selection)) return null;
    return getTextboxOfSelection(selection!.getRangeAt(0));
  };

  const handleTransform = (transform: SelectionTransform) => {
    const editor = getSelectionTextbox() === 'scramble' ? scrambleMethodsRef.current : solutionMethodsRef.current;
    editor?.transformSelection(transform);
  }

  const handleMirror = (plane: 'M' | 'S') => handleTransform((lines, range) =>
    relabelSelectedMoves(lines, range, cube3x3, moves => cube3x3.mirror(moves, plane)));
  const handleRotate = (rotation: Rotation3x3) => handleTransform((lines, range) =>
    rotateSelectedMoves(lines, range, cube3x3, rotation));
  const handleMirrorM = () => handleMirror('M');
  const handleMirrorS = () => handleMirror('S');
  const handleRotateX = () => handleRotate('x');
  const handleRotateY = () => handleRotate('y');
  const handleRotateZ = () => handleRotate('z');
  const handleInvert = () => handleTransform((lines, range) => invertSelectedMoves(lines, range, cube3x3));

  const handleRemoveComments = () => handleTransform((lines, range) => removeSelectedComments(lines, range, cube3x3));

  const handleScrambleChange = (scrambleContent: string) => {
    scrambleMethodsRef.current?.setContent(scrambleContent);
  };

  const takePageSnapshot = (): ClearedPageSnapshot => ({
    scrambleHTML,
    solutionHTML,
    allMoves: allMovesRef.current.map(textbox => textbox.map(line => [...line])),
    moveLocation: [...moveLocation.current] as [number, number, number],
    playerParams: { ...playerParams, animationTimes: [...playerParams.animationTimes] },
    solveTime,
    penaltyStatus,
    solveTitle,
    splits: [...splits],
    committedSplits: [...committedSplits],
    lineSteps: [...lineSteps],
    moveHistory: {
      history: moveHistory.current.history.map(entry => [...entry]),
      index: moveHistory.current.index,
    },
    search: window.location.search,
  });

  const discardClearedPage = () => {
    if (clearedPageTimeoutRef.current !== null) {
      clearTimeout(clearedPageTimeoutRef.current);
      clearedPageTimeoutRef.current = null;
    }
    clearedPageRef.current = null;
    clearedPageToastIdRef.current = null;
  }

  const handleUndoClearPage = () => {
    const snapshot = clearedPageRef.current;
    const toastId = clearedPageToastIdRef.current;
    if (!snapshot) return;

    discardClearedPage();
    if (toastId !== null) dismissToast(toastId);

    scrambleMethodsRef.current?.setContent(snapshot.scrambleHTML);
    solutionMethodsRef.current?.setContent(snapshot.solutionHTML);

    allMovesRef.current = snapshot.allMoves;
    moveLocation.current = snapshot.moveLocation;
    moveHistory.current.history = snapshot.moveHistory.history;
    moveHistory.current.index = snapshot.moveHistory.index;

    // status is a transient state machine flag, not content, so it is never snapshotted.
    // Restoring a stale 'loading' would make the next keystroke wipe the history.
    moveHistory.current.status = 'ready';
    publishHistoryPosition();

    setPlayerParams(snapshot.playerParams);
    setSolveTime(snapshot.solveTime);
    setPenaltyStatus(snapshot.penaltyStatus);
    setSolveTitle(snapshot.solveTitle);
    setSplits(snapshot.splits);
    setCommittedSplits(snapshot.committedSplits);
    setLineSteps(snapshot.lineSteps);

    window.history.pushState({}, '', `${window.location.pathname}${snapshot.search}`);
  }

  const handleClearPage = () => {
    if (clearedPageRef.current) return;

    const snapshot = takePageSnapshot();

    setBreakdownSession(null);
    cubePlayerRef.current?.restoreSolveState();
    setBreakdownPlayRequest(null);
    allMovesRef.current = [[[]], [[]]];
    moveLocation.current = [0, 0, 0];
    setPlayerParams({ animationTimes: [], solution: [], scramble: [] });
    scrambleMethodsRef.current?.setContent('');
    solutionMethodsRef.current?.setContent('');
    setSolveTime('');
    setPenaltyStatus(0);
    setSolveTitle('');
    setSplits([]);
    setCommittedSplits([]);
    setLineSteps([]);
    solutionMethodsRef.current?.setSuggestions([], null);

    moveHistory.current.history = [['', '']];
    moveHistory.current.index = 0;
    moveHistory.current.status = 'ready';
    publishHistoryPosition();

    updateURL('title', null);
    updateURL('time', null);
    updateURL('penalty', null);
    updateURL('splits', null);
    updateURL('preview', null);

    clearedPageRef.current = snapshot;
    clearedPageTimeoutRef.current = window.setTimeout(discardClearedPage, CLEAR_UNDO_DURATION);
    clearedPageToastIdRef.current = showToast({
      closable: false,
      duration: CLEAR_UNDO_DURATION,
      message: (
        <span className="flex items-center justify-between gap-3">
          <span>Page cleared</span>
          <button
            type="button"
            onClick={handleUndoClearPage}
            className="shrink-0 font-semibold text-primary-800 hover:underline"
          >
            Undo
          </button>
        </span>
      ),
    });
  }

  const handleAddCat = () => {
    const selection = window.getSelection();
    const selectionTextbox = getSelectionTextbox();
    const hasSelectedText = !!selectionTextbox && !selection!.isCollapsed;
    const textbox = selectionTextbox ?? 'solution';
    const range = hasSelectedText ? selection!.getRangeAt(0).cloneRange() : getWholeTextboxRange(textbox);

    range.collapse(false); // collapse to end of selection
    addCat(range, textbox)
  }

  const getTextboxInnerText = (textboxID: string): string => {
    const parentElement = document.getElementById(textboxID);
    const textbox = parentElement!.querySelector<HTMLDivElement>('div[contenteditable]');
    const textboxClone = textbox!.cloneNode(true) as HTMLElement;
    textboxClone.innerHTML = textboxClone.innerHTML.replace(/<br>/g, '\n');
    return textboxClone.innerText;
  }

  const getAlertMessage: (type: 'solve-text' | 'screenshot' | 'preview') => { message: string, messageType: 'info' | 'warn' } = (type) => {
    const scrambleMoves = allMovesRef.current[0].flat();
    const solutionMoves = allMovesRef.current[1].flat();

    const hasScramble = scrambleMoves.length > 0;
    const hasSolution = solutionMoves.length > 0;

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

    if (!isCompletedSolve) {
      return {
        message: 'Copied, Solve Incomplete',
        messageType: 'warn'
      };
    }

    const moves = `${cube3x3.format(scrambleMoves)}|${cube3x3.format(solutionMoves)}`;
    const lastCopiedSolve = lastCopiedSolveRef.current;
    if (lastCopiedSolve?.solveTime !== solveTime) {
      lastCopiedSolveRef.current = { moves, solveTime };
    }

    const isTimeOutdated = solveTime !== ''
      && lastCopiedSolve?.solveTime === solveTime
      && lastCopiedSolve.moves !== moves;

    if (isTimeOutdated) {
      return {
        message: 'Copied, Time Outdated?',
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

    const time = formatTimeStat(solveTime, penaltyStatus, ' ').replaceAll(' ', ' ');
    const stm = totalMoves ? `${totalMoves} stm` : '';
    const visibleTps = typeof penaltyStatus === 'number' ? tpsString : '';
    const url = window.location.href + '&preview=0';
    let printout = "";

    title ? printout += `${title}\n\n` : '';
    scramble ? printout += `${scramble}\n\n` : '';
    solution ? printout += `${solutionSectionLabel}:\n${solution}\n\n` : '';

    time ? printout += time : '';
    time && stm ? printout += `, ` : ' ';
    stm ? printout += `${stm} ` : '';
    visibleTps ? printout += visibleTps : '';
    printout += '\n';

    url ? printout += `\n[View solve on Ao1K](${url})` : '';

    navigator.clipboard.writeText(printout);

    const alert = getAlertMessage('solve-text');
    setTopButtonAlert({ id: "copy-solve", ...alert });
  }

  const handleScreenshot = async () => {
    if (!screenshotManagerRef.current) return;

    const blob = await screenshotManagerRef.current.getBlob(
      { scrambleHTML, solutionHTML, solveTime, penaltyStatus, solutionLabel: solutionSectionLabel },
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

  const getTextboxOfSelection = (range: Range): 'scramble' | 'solution' | null => {
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

  const handleSelectionChange = () => {
    const previousTextbox = selectionTextboxRef.current;
    selectionTextboxRef.current = getSelectionTextbox();

    if (previousTextbox === 'solution' && selectionTextboxRef.current !== 'solution') {
      if (isCompletedSolve) {
        void screenshotManagerRef.current?.getBlob(
          { scrambleHTML, solutionHTML, solveTime, penaltyStatus, solutionLabel: solutionSectionLabel },
          { totalMoves, tpsString }
        );
      }
    }
  }

  const getSolutionEditorView = (): EditorView | null => {
    const editor = solutionMethodsRef.current?.getElement();
    const scrollBox = document.getElementById('solution');
    return editor && scrollBox ? { editor, scrollBox } : null;
  }

  const loadOppositeHandInterpreter = async (oppositeHandedness: Handedness) => {
    oppositeHandInterpreterRef.current ??= new SimpleCubeInterpreter();
    const interpreter = oppositeHandInterpreterRef.current;
    const toLoad = [...enabledAlgsets].filter(name => HANDED_ALGSETS.some(handed => handed === name) &&!interpreter.isAlgsetLoaded(name, oppositeHandedness));
    await Promise.all(toLoad.map(async name => {
      const mod = await ALGSET_LOADERS[name](oppositeHandedness);
      interpreter.addAlgset(name, mod.default.algorithms as CompiledLLAlg[], oppositeHandedness);
    }));
    return interpreter;
  }

  const handleOpenBreakdown = async () => {
    const editorView = getSolutionEditorView();
    const interpreter = cubeInterpreter.current;
    if (!editorView || !interpreter) return;
    if (!interpreter.isAlgsetLoaded('f2l')) {
      const f2lModule = await ALGSET_LOADERS.f2l(handedness);
      interpreter.addAlgset('f2l', f2lModule.default.algorithms as CompiledDoc[]);
    }
    const oppositeHandedness: Handedness = handedness === 'right' ? 'left' : 'right';
    const oppositeHandInterpreter = await loadOppositeHandInterpreter(oppositeHandedness);
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();

    // create empty index
    const index = interpreter.getF2LScoreIndex(handedness);
    const readSteps = (moves: readonly Move3x3[]) => interpreter.getStepsCompleted(simpleCubeRef.current.getCubeState(moves));
    const reader: CubeStateReader = {
      handedness,
      readSteps,
      readSuggestions: moves => interpreter.getAlgSuggestions(readSteps(moves), { enabledAlgsets, handedness }),
      findKnownAlgs: alg => interpreter.findKnownLLAlgs(alg, enabledAlgsets, handedness),
      findOppositeHandKnownAlgs: alg => oppositeHandInterpreter.findKnownLLAlgs(alg, enabledAlgsets, oppositeHandedness),
    };

    const solveReview = reviewSolve(
      allMovesRef.current[0].flat(),
      allMovesRef.current[1],
      lineIconData,
      index,
      reader,
    );
    clearLoopTimeout();
    isLoopingRef.current = false;
    setControllerButtonsStatus(status => status.playPause === 'play' ? { ...status, playPause: 'pause' } : status);
    scrambleMethodsRef.current?.flushURLUpdate();
    solutionMethodsRef.current?.flushURLUpdate();
    startBreakdown(editorView, lineIconData, solveReview, setBreakdownSession);
  }

  const handleBreakdownPlay = (request: BreakdownPlayRequest) => {
    const setupMoves = [...allMovesRef.current[0].flat(), ...allMovesRef.current[1].slice(0, request.lineIndex).flat()];
    setBreakdownPlayRequest(request);
    document.getElementById('player-box')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    cubePlayerRef.current?.playPreview(setupMoves, request.moves, () => setBreakdownPlayRequest({ ...request, isFinished: true }));
  }

  const handleBreakdownStop = () => {
    cubePlayerRef.current?.stopPreview();
    setBreakdownPlayRequest(null);
  }

  const handleCloseBreakdown = () => {
    if (!breakdownSession) return;
    cubePlayerRef.current?.restoreSolveState();
    setBreakdownPlayRequest(null);
    endBreakdown(breakdownSession.lines, getSolutionEditorView, () => setBreakdownSession(null));
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

    // macOS treats alt as a glyph modifier, so e.key for cmd+alt+i is a dead circumflex rather than a letter. Fall back to the physical key in that case.
    const letter = /^[a-z]$/i.test(e.key)
      ? e.key.toLowerCase()
      : e.code.replace(/^Key/, '').toLowerCase();

    const isTextTransformShortcut = isCtrl && ((isModifier && TRANSFORM_SHORTCUT_LETTERS.has(letter)) || e.key === '/');
    if (isBreakdownOpen && isTextTransformShortcut) {
      e.preventDefault();
      return;
    }

    if (isCtrl && isModifier && letter === 'm') {

      e.preventDefault();

      handleMirrorM();
    }

    if (isCtrl && isModifier && letter === 's') {

      e.preventDefault();

      handleMirrorS();
    }

    if (isCtrl && !isModifier && letter === 's') {

      e.preventDefault();
      handleShare();
    }

    if (isCtrl && isModifier && letter === 'x') {

      e.preventDefault();

      handleRotateX();
    }

    if (isCtrl && isModifier && letter === 'y') {

      e.preventDefault();

      handleRotateY();
    }

    if (isCtrl && isModifier && letter === 'z') {

      e.preventDefault();

      handleRotateZ();
    }

    if (isCtrl && isModifier && letter === 'i') {

      e.preventDefault();

      handleInvert();
    }

    if (isCtrl && e.key === '/') {

      e.preventDefault();

      handleRemoveComments();
    }

    if (isCtrl && letter === 'q') {

      e.preventDefault();

      handleCopySolve();
    }

    if (isCtrl && e.key === 'Delete') {

      e.preventDefault();

      handleClearPage();
    }
  };

  function hasLineStepSpaceChanges(moves: Move3x3[][], currentLineSteps: { moveLine: string; stepInfo: StepInfo[] }[]): boolean {
    if (currentLineSteps.length === 0) return false;
    let hasAddedScramble = false;
    for (let idx = 0; idx < moves.length; idx++) {
      const line = moves[idx];
      const lineStepEntry = currentLineSteps[idx];
      if (!line || line.length === 0) continue;
      if (!lineStepEntry) return true;
      const lineAndScram = hasAddedScramble ? line : [...allMovesRef.current[0].flat(), ...line];
      hasAddedScramble = true;
      if (lineStepEntry.moveLine !== cube3x3.format(lineAndScram)) return true;
    }
    return false;
  }

  function respaceLineSteps() {
    const respacedSteps: { moveLine: string, stepInfo: StepInfo[] }[] = [];
    const solutionMoves = allMovesRef.current[1];
    const filteredLineSteps = lineSteps.filter(item => item.moveLine.trim() !== '');
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
      const flatLine = cube3x3.format(lineAndScram);
      const existingLine = filteredLineSteps[hasStepsCount];
      if (existingLine && existingLine.moveLine === flatLine) {
        respacedSteps.push({ moveLine: existingLine.moveLine, stepInfo: existingLine.stepInfo });
        hasStepsCount++;
      } else {
        console.warn('Move order appears to have changed.')
        respacedSteps.push({ moveLine: flatLine, stepInfo: [] });
      }
    };
    setLineSteps(respacedSteps);
  }

  function updateLineSteps() {
    if (!cubeInterpreter.current) {
      return;
    }
    const updatedSteps: { moveLine: string, stepInfo: StepInfo[] }[] = [];
    const previousLineSteps = lineSteps;

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
      const cubeState = simpleCubeRef.current.getCubeState(allMoves);

      const steps = cubeInterpreter.current.getStepsCompleted(cubeState);
      return steps;
    };



    const buildMoveLine = (line: Move3x3[], lineIdx: number, hasAddedScramble: boolean): string => {
      const lineAndScram = hasAddedScramble ? line : [...allMovesRef.current[0].flat(), ...line];
      return cube3x3.format(lineAndScram);
    };

    const processLineAfterChange = (line: Move3x3[], lineIdx: number, updatedSteps: { moveLine: string, stepInfo: StepInfo[] }[]): void => {
      const stepInfo = getStepsForLine(lineIdx);
      const prevSteps = updatedSteps.map(item => item.stepInfo).flat();
      const newSteps = getNewSteps(prevSteps, stepInfo);
      updatedSteps.push({ moveLine: cube3x3.format(line), stepInfo: newSteps });
    };

    const processLineBeforeChange = (
      line: Move3x3[],
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

    setLineSteps(updatedSteps);
  }

  const initializeCubeInterpreter = async () => {
    cubeInterpreter.current = new SimpleCubeInterpreter();
    const initialSettings = readSettingsFromCookie();
    await loadEnabledAlgsets(new Set(Object.values(initialSettings.algsets).flat()), initialSettings.handedness);
    updateLineSteps();

    // initialize screenshot manager and warm up renderer
    if (!screenshotManagerRef.current) {
      screenshotManagerRef.current = new ScreenshotManager();
    }
    void screenshotManagerRef.current.getBlob(
      { scrambleHTML: '', solutionHTML: '', solveTime: '', penaltyStatus: 0, solutionLabel: 'Solution' },
      { totalMoves: 0, tpsString: '' }
    );
  };

  const toggleShowBottomBar = () => {
    Cookies.set('isShowingBottomBar', (!isShowingToolbar).toString(), { expires: 365 });
    setIsShowingToolbar(prev => !prev);
  }

  useEffect(() => {
    initializeCubeInterpreter();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- must run exactly once at mount; re-running on every lineSteps change would re-initialize the interpreter
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);

    const time = urlParams.get('time');
    if (time) {
      const parsedTime = parseFloat(time);
      if (!isNaN(parsedTime)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrating from the URL query string, which only exists client-side; must run once at mount
        setSolveTime(parsedTime);
      }
    }

    setPenaltyStatus(parsePenaltyParam(urlParams.get('penalty')));

    const title = urlParams.get('title');
    if (title) {
      setSolveTitle(decodeURIComponent(customDecodeURL(title)));
    }

    const splitsParam = urlParams.get('splits');
    if (splitsParam !== null) {
      const parsed = splitsParam === '' ? [''] : splitsParam.split(',');
      setSplits(parsed);
      setCommittedSplits(parsed);
      setHasSplitsFromURL(true);
    }

    const solution = allMovesRef.current[1].flat();
    if (solution.length > 0) {
      setPlayerParams(prev => ({ ...prev, solution }));
    }

    const scramble = allMovesRef.current[0].flat();
    if (scramble.length > 0) {
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

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {

      document.removeEventListener('selectionchange', handleSelectionChange);
    };

    // may create screenshot, so handleSelectionChange needs current values.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately re-subscribes only on scramble/solution changes, not every value handleSelectionChange reads
  }, [scrambleHTML, solutionHTML]);

  const windowsToolbarButtons = [
    { id: 'undo', text: 'Undo', shortcutHint: `Ctrl+Z`, onClick: handleUndo, icon: <UndoIcon />, disabled: !canUndo },
    { id: 'redo', text: 'Redo', shortcutHint: `Ctrl+Y`, onClick: handleRedo, icon: <RedoIcon />, disabled: !canRedo },
    { id: 'mirrorM', text: 'Mirror M', shortcutHint: `Ctrl+Shift+M`, onClick: handleMirrorM, iconText: 'M' },
    { id: 'mirrorS', text: 'Mirror S', shortcutHint: `Ctrl+Shift+S`, onClick: handleMirrorS, iconText: 'S' },
    { id: 'rotateX', text: 'Rotate X', shortcutHint: `Ctrl+Shift+X`, onClick: handleRotateX, iconText: "X" },
    { id: 'rotateY', text: 'Rotate Y', shortcutHint: `Ctrl+Shift+Y`, onClick: handleRotateY, iconText: "Y" },
    { id: 'rotateZ', text: 'Rotate Z', shortcutHint: `Ctrl+Shift+Z`, onClick: handleRotateZ, iconText: "Z" },
    { id: 'invert', text: 'Invert', shortcutHint: `Ctrl+Shift+I`, onClick: handleInvert, icon: <InvertIcon /> },
    { id: 'cat', text: 'Cat', shortcutHint: 'Cat', onClick: handleAddCat, icon: <CatIcon /> },
    { id: 'removeComments', text: 'Remove Comments', shortcutHint: `Ctrl+/ `, onClick: handleRemoveComments, iconText: '// ' },
  ];

  const macToolbarButtons = [
    { id: 'undo', text: 'Undo', shortcutHint: `⌘+Z`, onClick: handleUndo, icon: <UndoIcon />, disabled: !canUndo },
    { id: 'redo', text: 'Redo', shortcutHint: `⌘+Y`, onClick: handleRedo, icon: <RedoIcon />, disabled: !canRedo },
    { id: 'mirrorM', text: 'Mirror M', shortcutHint: `⌘+Alt+M`, onClick: handleMirrorM, iconText: 'M' },
    { id: 'mirrorS', text: 'Mirror S', shortcutHint: `⌘+Alt+S`, onClick: handleMirrorS, iconText: 'S' },
    { id: 'rotateX', text: 'Rotate X', shortcutHint: `⌘+Alt+X`, onClick: handleRotateX, iconText: "X" },
    { id: 'rotateY', text: 'Rotate Y', shortcutHint: `⌘+Alt+Y`, onClick: handleRotateY, iconText: "Y" },
    { id: 'rotateZ', text: 'Rotate Z', shortcutHint: `⌘+Alt+Z`, onClick: handleRotateZ, iconText: "Z" },
    { id: 'invert', text: 'Invert', shortcutHint: `⌘+Alt+I`, onClick: handleInvert, icon: <InvertIcon /> },
    { id: 'cat', text: 'Cat', shortcutHint: 'Cat', onClick: handleAddCat, icon: <CatIcon /> },
    { id: 'removeComments', text: 'Remove Comments', shortcutHint: `⌘+/ `, onClick: handleRemoveComments, iconText: '// ' },
  ];

  const toolbarButtons = ctrlKey === '⌘' ? macToolbarButtons : windowsToolbarButtons;

  return (
    <main id="main_page" className="relative flex flex-col bg-primary-900 mt-10 overflow-visible">

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

      {/* utility for HTML video of solve */}
      {/* <button className="w-40 h-10 flex items-center justify-center z-50 bg-neutral-700 text-primary-100 px-3 py-1 text-sm rounded" onClick={() => setIsHtmlSceneDialogOpen(true)}>Create HTML Video</button>
      {isHtmlSceneDialogOpen ? (
        <HtmlSceneDialog
          onClose={() => setIsHtmlSceneDialogOpen(false)}
          scramble={allMovesRef.current[0].flat()}
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
      ) : null} */}

      {/* utility for static HTML image of the cube */}
      {/* <button
        className="w-40 h-10 flex items-center justify-center z-50 bg-neutral-700 text-primary-100 px-3 py-1 text-sm rounded"
        onClick={() => {
          const [, lineIdx, moveIdx] = moveLocation.current;
          const scrambleMoves = allMovesRef.current[0].flat();
          const solutionMovesUpToPoint = allMovesRef.current[1].flatMap((line, i) => {
            if (i < lineIdx) return line;
            if (i === lineIdx) return line.slice(0, moveIdx);
            return [];
          });
          const setupMoves = [...scrambleMoves, ...solutionMovesUpToPoint];
          const cubeState = new SimpleCube().getCubeState(setupMoves);
          setHtmlImageData({ cubeState, setupMovesForFilename: cube3x3.format(setupMoves) });
        }}
      >Create HTML Image</button>
      {htmlImageData ? (
        <HtmlImageDialog
          onClose={() => setHtmlImageData(null)}
          cubeState={htmlImageData.cubeState}
          setupMovesForFilename={htmlImageData.setupMovesForFilename}
        />
      ) : null} */}

      <InfoPanel initiallyDismissed={infoPanelSlot == null}>{infoPanelSlot}</InfoPanel>
      {isGifDialogOpen ? (
        <Suspense fallback={null}>
          <CubeGifDialog
            onClose={() => setIsGifDialogOpen(false)}
            scramble={allMovesRef.current[0].flat()}
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
        </Suspense>
      ) : null}
      <div id="top-bar" className="px-3 flex flex-col w-full items-end gap-5 mb-2 -mt-11 pointer-events-none">
        <div className="flex-none flex flex-row space-x-1 text-dark_accent pointer-events-auto">
          <TopButton 
            id="trash" 
            text="Clear Page" 
            shortcutHint={`${ctrlKey}+Del`} 
            onClick={handleClearPage}
            icon={<TrashIcon />} 
            alert={topButtonAlert} 
            setAlert={setTopButtonAlert} 
            alertAlign='center' />
          <CopySolveDropdown
            onCopyText={handleCopySolve}
            onScreenshot={handleScreenshot}
            onOpenGif={() => setIsGifDialogOpen(true)}
            alert={topButtonAlert}
            setAlert={setTopButtonAlert}
          />
          <TopButton id="share" 
            innerText="Share" 
            text="Share Preview" 
            shortcutHint={`${ctrlKey}+S`} 
            onClick={handleShare} 
            icon={<ShareIcon />} 
            alert={topButtonAlert} 
            setAlert={setTopButtonAlert} 
            alertAlign='right' />
        </div>
        <TitleWithPlaceholder solveTitle={solveTitle} handleTitleChange={handleTitleChange} />
      </div>
      <div id="scramble-area" className="px-3 mt-3 flex flex-col">
        <ScrambleDropdown
          scramble={allMovesRef.current[0].flat()}
          solution={allMovesRef.current[1].flat()}
          scrambleOfTheDay={dailyScramble}
          onScrambleChange={handleScrambleChange}
          isLabelOnly={isBreakdownOpen}
        />
        <div className="lg:max-h-[15.1rem] max-h-40 overflow-y-auto" id="scramble">
          <MovesTextEditor
            name={`scramble`}
            ref={scrambleMethodsRef}
            trackMoves={trackMoves}
            autofocus={false}
            moveHistory={moveHistory}
            onHistoryChange={publishHistoryPosition}
            html={scrambleHTML}
            setHTML={setScrambleHTML}
            initialContent={solutionHTML ? '' : dailyScramble}
            isReadOnly={isBreakdownOpen}
          />
        </div>
      </div>
      <div
        id="player-box"
        className="px-3 relative flex flex-col mt-5 w-full justify-center items-center"
        style={{ viewTransitionName: PAGE_TRANSITION_NAMES.player }}
      >
        <div id="cube_model" className="flex h-full aspect-video max-h-96 min-h-50 bg-primary-900 select-none z-20 w-full">
          <Suspense fallback={<div className="flex text-xl w-full h-full justify-center items-center text-primary-100 border border-neutral-600 hover:border-primary-100 rounded-t-sm">Loading cube...</div>}>
            <CubePlayer
              ref={cubePlayerRef}
              speed={speed}
              scrambleRequest={playerParams.scramble}
              solutionRequest={playerParams.solution}
              animationTimesRequest={playerParams.animationTimes}
              handleControllerRequest={handleControllerRequest}
              controllerButtonsStatus={controllerButtonsStatus}
              isControllerHidden={isBreakdownOpen}
            />
          </Suspense>
        </div>
      </div>
      <div id="bottom-box" className={`mx-3 relative flex-col justify-center items-center ${isBreakdownOpen ? 'hidden' : 'flex'}`}>
        <div id="bottom-box-borders" className={`border-x w-full border-neutral-600 h-14 absolute top-0 z-0 pointer-events-none ${isShowingToolbar ? 'block' : 'hidden'}`}></div>
        <div
          id="bottom-bar"
          ref={bottomBarRef}
          className={`w-full px-3 space-x-1 static flex flex-row items-center place-content-end justify-start transform z-30
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
        <div className="border border-neutral-600 hover:border-primary-100 h-1.75 rounded-b-sm w-full z-0 bg-primary-700" onClick={() => toggleShowBottomBar()}></div>
      </div>
      <div id="datafields" className="w-full items-start transition-width duration-500 ease-linear">
        <div id="solution-area" className={`relative px-3 mt-2.5 flex flex-col w-full ${isBreakdownOpen ? '' : 'mb-14'}`}>
          <div
            className="flex flex-row items-end w-full z-20"
            style={{ viewTransitionName: PAGE_TRANSITION_NAMES.heading }}
          >
            <div className="mb-2 text-xl text-dark_accent leading-none font-medium">{isBreakdownOpen ? 'Review' : 'Solution'}</div>
            <div
              className={`flex flex-row items-end ${isBreakdownOpen ? 'ml-auto mb-2' : 'absolute'}`}
              style={isBreakdownOpen ? undefined : {
                right: 'anchor(--solution-content right)',
                bottom: 'anchor(--solution-box top)',
              }}
            >
              <div className="flex flex-row items-stretch">
                <button
                  type="button"
                  autoComplete="off"
                  disabled={!isBreakdownOpen && !hasReviewFeedback}
                  onClick={isBreakdownOpen ? handleCloseBreakdown : handleOpenBreakdown}
                  className={`px-2 py-1 text-sm border transition-colors duration-150 disabled:cursor-not-allowed ${isBreakdownOpen ? 'rounded-sm' : 'border-b-0 rounded-tl-sm'} ${reviewButtonClass}`}
                  style={{ viewTransitionName: PAGE_TRANSITION_NAMES.reviewButton }}
                >
                  <span className="inline-block whitespace-nowrap" style={flightStyle(PAGE_TRANSITION_NAMES.reviewLabel)}>
                    {isBreakdownOpen ? 'Go back to editor' : 'Review'}
                  </span>
                </button>
                {!isBreakdownOpen && (
                  <ColumnSelector
                    showIcons={isIconsColumnEnabled}
                    onShowIconsChange={(icons) => updateEnabledColumns({ icons })}
                    showSplits={showSplitsColumn}
                    onShowSplitsChange={(splits) => {
                      setHasSplitsFromURL(false);
                      updateEnabledColumns({ splits });
                    }}
                  />
                )}
              </div>
              {!isBreakdownOpen && (
                <div
                  className="mb-2 overflow-hidden whitespace-nowrap text-center text-xl text-dark_accent leading-none font-medium"
                  style={{ width: showSplitsColumn ? SPLITS_WIDTH : 0, transition: 'width 200ms linear' }}
                >
                  Splits
                </div>
              )}
            </div>
          </div>
          {breakdownSession && (
            <SolveBreakdown
              session={breakdownSession}
              playingRequest={breakdownPlayRequest}
              onPlay={handleBreakdownPlay}
              onStop={handleBreakdownStop}
            />
          )}
          <div
            id="rich-solution-display"
            ref={setSolutionDisplayElement}
            className={`relative border-none [anchor-name:--solution-box] ${FLIGHT_BOX_CLASS} ${isBreakdownOpen ? 'invisible h-0 overflow-hidden' : 'max-h-[35vh] -mb-20 overflow-visible z-10'}`}
            style={isBreakdownOpen ? undefined : flightStyle(PAGE_TRANSITION_NAMES.solutionBox)}
          >
            <div
              className="min-w-0 overflow-y-auto max-h-[35vh] relative z-10"
              id="solution"
              onScroll={(e) => {
                e.currentTarget.parentElement?.style.setProperty('--solution-scroll-top', `${e.currentTarget.scrollTop}px`);
              }}
            >
              <div
                className="relative [anchor-name:--solution-content]"
                style={{
                  paddingLeft: showIconsColumn ? ICON_SIZE_CONFIG['medium'].iconWidth : 0,
                  paddingRight: showSplitsColumn ? SPLITS_WIDTH : 0,
                  transition: 'padding-left 200ms linear, padding-right 200ms linear',
                }}
              >
                {isIconsColumnEnabled && (
                  <div
                    id="icon-column"
                    className="absolute left-0 inset-y-0 overflow-clip"
                    style={{ width: ICON_SIZE_CONFIG['medium'].iconWidth }}
                  >
                    <IconStack
                      moves={allMovesRef.current}
                      position={moveLocation.current}
                      editableElement={solutionMethodsRef.current?.getElement() || null}
                      lineIconData={lineIconData}
                      zoomLayerHost={isBreakdownOpen ? null : solutionDisplayElement}
                    />
                  </div>
                )}
                <div className="relative z-10">
                  <MovesTextEditor
                    name={`solution`}
                    ref={solutionMethodsRef}
                    trackMoves={trackMoves}
                    autofocus={infoPanelSlot == null}
                    moveHistory={moveHistory}
                    onHistoryChange={publishHistoryPosition}
                    html={solutionHTML}
                    setHTML={setSolutionHTML}
                    lineHeight={solutionLineHeight}
                    iconColumnWidth={showIconsColumn ? ICON_SIZE_CONFIG['medium'].iconWidth : 0}
                    isTopRightCornerSquare
                    isReadOnly={isBreakdownOpen}
                  />
                </div>
                {showSplitsColumn && (
                  <div className="absolute right-0 inset-y-0 overflow-clip" style={{ width: SPLITS_WIDTH }}>
                    <SplitsStack
                      editableElement={solutionMethodsRef.current?.getElement() || null}
                      splits={splits}
                      onSplitsChange={setSplits}
                      onSplitsCommit={handleSplitsCommit}
                      isWhitespaceLine={isWhitespaceLine}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        <TimeArea
          solveTime={solveTime}
          onSolveTimeChange={setSolveTime}
          penaltyStatus={penaltyStatus}
          onPenaltyStatusChange={setPenaltyStatus}
          totalMoves={totalMoves}
          tpsString={tpsString}
          committedSplits={committedSplits}
          requiredSplitIndices={requiredSplitIndices}
          showSplitsColumn={showSplitsColumn}
        />
      </div>
    </main>
  );
}
