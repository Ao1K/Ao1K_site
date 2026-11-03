import React, { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { warmUpCubeSolver } from '../../composables/recon/cubeSolverClient';
import { simplifySetupMoves } from '../../composables/recon/setupMoves';
import PlayerControls from './PlayerControls';
import CubeImageDialog from './CubeImageDialog';
import type { ControllerRequestOptions } from './_PageContent';
import type { PlayerParams as RenderRefProps } from './_PageContent';
import { createCubeImageCapture, type ScreenshotSetupStatus } from '../../composables/recon/cubeImageCapture';
import { useSyncedSettings, useShowControls, useHintFaceletsElevation, useStickerScale, useCameraFov } from '../../composables/useSettings';
import { SimpleCube } from '../../composables/recon/SimpleCube';
import { cube3x3, type Move3x3 } from '../../utils/parser/cube3x3';
import type { Amount } from '../../utils/parser';
import { cameraView, INITIAL_ANGLES, ORBIT_DAMPING, smootherStep, timelineMoveMs, turnRotation } from '../../composables/recon/reconCube';
import { createCubeScene, type CubeScene } from '../../utils/cubeSceneRuntime.client';
import { createCanvasPainter } from '../../utils/cubeCanvasRender';
import type { RotationInfo, SceneDrawable } from '../../utils/cubeSvgRender';
import { faceletsFromState } from '../../utils/cubeFacelets';
import { buildColorHex, DEFAULT_SCENE_LOOK } from '../../utils/cubeSceneAuthoring';
import CameraIcon from '../icons/camera';

export interface CubePlayerImperativeRef {
  setTempoScale: (scale: number) => void;
  setInstantOverride: (instant: boolean) => void;
  playPreview: (setupMoves: Move3x3[], moves: Move3x3[], onEnd: () => void) => void;
  stopPreview: () => void;
  restoreSolveState: () => void;
}

const PREVIEW_TEMPO = 1;
const CATCH_UP_MS = 500;
const STICKER_ELEVATION = 0.503;
const HINT_RISE_DELAY_MS = 500;
const HINT_RISE_MS = 1000;

interface PlayerProps {
  scrambleRequest: Move3x3[];
  solutionRequest: Move3x3[];
  speed: number;
  animationTimesRequest: number[];
  handleControllerRequest: (request: ControllerRequestOptions) => void;
  controllerButtonsStatus: {
    fullLeft: string;
    stepLeft: string;
    playPause: string;
    stepRight: string;
    fullRight: string;
  };
  isControllerHidden: boolean;
  ref?: React.Ref<CubePlayerImperativeRef>;
}

const getQueueTempo = (pendingCount: number, baseTempo: number): number => {
  if (pendingCount <= 0) return baseTempo;
  if (pendingCount === 1) return Math.max(baseTempo, 5);
  if (pendingCount === 2) return Math.max(baseTempo, 10);
  if (pendingCount === 3) return Math.max(baseTempo, 20);
  return Math.max(baseTempo, 100);
};

const calcCubeSpeed = (speed: number) => {
  if (speed === 100) {
    return 1000;
  } else {
    return 1.5 ** (speed / 15) - 0.6;
  }
};

const AVAILABLE_SCREENSHOT_SETUP_STATUS: ScreenshotSetupStatus = {
  status: 'available',
  message: '',
};

const getDisplayedSolutionAlg = (solution: Move3x3[], animationTimes: number[]): Move3x3[] => {
  if (animationTimes.length === 0) {
    return [];
  }

  if (animationTimes.length === 1 && (animationTimes[0] === 0 || animationTimes[0] === 1)) {
    return [];
  }

  const appliedMoveCount = animationTimes.filter((time) => time > 0).length;
  return solution.slice(0, appliedMoveCount);
};

const Player = React.memo(({
  scrambleRequest,
  solutionRequest,
  speed,
  animationTimesRequest,
  handleControllerRequest,
  controllerButtonsStatus,
  isControllerHidden,
  ref,
}: PlayerProps) => {
  const { settings } = useSyncedSettings();
  const cubeColors = settings.cubeColors;
  const [showControls] = useShowControls();
  const [elevation] = useHintFaceletsElevation();
  const elevationRef = useRef(elevation);
  elevationRef.current = elevation;
  const [stickerScale] = useStickerScale();
  const stickerScaleRef = useRef(stickerScale);
  stickerScaleRef.current = stickerScale;
  const [cameraFov] = useCameraFov();
  const cameraFovRef = useRef(cameraFov);
  cameraFovRef.current = cameraFov;

  const sceneRef = useRef<CubeScene | null>(null);
  const divRef = useRef<HTMLDivElement>(null);
  const orbitRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCubeReady, setIsCubeReady] = useState(false);
  const [simpleCube] = useState(() => new SimpleCube());
  const hintRiseRef = useRef<number | null>(null);
  const lastColorsRef = useRef(cubeColors);
  const lastElevationRef = useRef(elevation);
  const lastStickerScaleRef = useRef(stickerScale);
  const lastCameraFovRef = useRef(cameraFov);

  const lastSolution = useRef<Move3x3[]>([]);
  const lastScramble = useRef<Move3x3[]>([]);
  const lastAnimationTimes = useRef<number[]>([]);
  const lastSpeed = useRef<number>(0);

  const animatingRef = useRef<boolean>(false);
  const pendingQueueRef = useRef<RenderRefProps[]>([]);
  const instantOverrideRef = useRef<boolean>(false);
  const previewTokenRef = useRef(0);
  const previewSetupRef = useRef<Move3x3[] | null>(null);

  const cubeSpeed = calcCubeSpeed(speed);
  const cubeSpeedRef = useRef(cubeSpeed);
  cubeSpeedRef.current = cubeSpeed;
  const baseTempoRef = useRef(cubeSpeed);
  const isInstant = cubeSpeed === 1000;

  const [flashingButtons, setFlashingButtons] = useState<Set<string>>(new Set());
  const [isScreenshotDialogOpen, setIsScreenshotDialogOpen] = useState(false);
  const [displayedSetupMoves, setDisplayedSetupMoves] = useState('');
  const displayedSetupMovesRef = useRef('');
  const setupMoveSimplificationCacheRef = useRef({ unsimplified: '', simplified: '' });
  const pendingSetupMovesRef = useRef('');
  const screenshotSetupStatus = AVAILABLE_SCREENSHOT_SETUP_STATUS;

  const [imageCapture] = useState(() => {
    return createCubeImageCapture(() => ({
      scene: sceneRef.current,
      viewerElement: divRef.current,
      sceneView: (zoom: number) => cameraView(divRef.current?.clientHeight ?? 0, elevationRef.current, zoom, stickerScaleRef.current, cameraFovRef.current),
      hintsVisible: elevationRef.current !== 0,
      setupMoves: displayedSetupMovesRef.current,
      setupStatus: screenshotSetupStatus,
    }));
  });

  const faceletsAfter = (...algs: Move3x3[][]) => {
    return faceletsFromState(simpleCube.getCubeState(algs.flat()));
  };

  const applyView = () => {
    const scene = sceneRef.current;
    const div = divRef.current;
    const canvas = canvasRef.current;
    if (!scene || !div || !canvas || div.clientHeight === 0) return;

    const pixelWidth = Math.round(div.clientWidth * devicePixelRatio);
    const pixelHeight = Math.round(div.clientHeight * devicePixelRatio);
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }

    const view = cameraView(div.clientHeight, elevationRef.current, 1, stickerScaleRef.current, cameraFovRef.current);
    scene.setView(hintRiseRef.current === null ? view : { ...view, hintElevation: hintRiseRef.current });
  };

  if (sceneRef.current && lastColorsRef.current !== cubeColors) {
    lastColorsRef.current = cubeColors;
    sceneRef.current.setLook({ colors: buildColorHex(cubeColors) });
  }

  if (sceneRef.current && lastElevationRef.current !== elevation) {
    lastElevationRef.current = elevation;
    sceneRef.current.setLook({ hints: elevation !== 0 });
    applyView();
  }

  if (sceneRef.current && lastStickerScaleRef.current !== stickerScale) {
    lastStickerScaleRef.current = stickerScale;
    applyView();
  }

  if (sceneRef.current && lastCameraFovRef.current !== cameraFov) {
    lastCameraFovRef.current = cameraFov;
    applyView();
  }

  const playPreview = (setupMoves: Move3x3[], moves: Move3x3[], onEnd: () => void) => {
    previewTokenRef.current++;
    const scene = sceneRef.current;
    if (!scene) return;

    const token = previewTokenRef.current;
    previewSetupRef.current = setupMoves;
    scene.setFacelets(faceletsAfter(setupMoves));

    const playFrom = (index: number) => {
      if (token !== previewTokenRef.current) return;
      if (index >= moves.length) {
        onEnd();
        return;
      }
      const turn = turnRotation(moves[index]);
      if (!turn) {
        playFrom(index + 1);
        return;
      }
      scene.applyMove([turn], timelineMoveMs(moves[index]) / PREVIEW_TEMPO, () => playFrom(index + 1));
    };
    playFrom(0);
  };

  const stopPreview = () => {
    previewTokenRef.current++;
    sceneRef.current?.setFacelets(faceletsAfter(previewSetupRef.current ?? lastScramble.current));
  };

  const restoreSolveState = () => {
    previewTokenRef.current++;
    previewSetupRef.current = null;
    baseTempoRef.current = cubeSpeedRef.current;
    sceneRef.current?.setFacelets(faceletsAfter(
      lastScramble.current,
      getDisplayedSolutionAlg(lastSolution.current, lastAnimationTimes.current),
    ));
  };

  useImperativeHandle(ref, () => ({
    setTempoScale: (scale: number) => {
      baseTempoRef.current = scale;
    },
    setInstantOverride: (instant: boolean) => {
      instantOverrideRef.current = instant;
    },
    playPreview,
    stopPreview,
    restoreSolveState,
  }));

  const applyDisplayedSetupMoves = (setupMoves: string) => {
    if (displayedSetupMovesRef.current === setupMoves) {
      return;
    }

    displayedSetupMovesRef.current = setupMoves;
    setDisplayedSetupMoves(setupMoves);
  };

  const syncDisplayedSetupMoves = async (scramble: Move3x3[], displayedSolutionAlg: Move3x3[]) => {
    const unsimplifiedMoves = [...scramble, ...displayedSolutionAlg];
    const nextUnsimplifiedSetupMoves = cube3x3.format(unsimplifiedMoves);
    pendingSetupMovesRef.current = nextUnsimplifiedSetupMoves;

    if (setupMoveSimplificationCacheRef.current.unsimplified === nextUnsimplifiedSetupMoves) {
      applyDisplayedSetupMoves(setupMoveSimplificationCacheRef.current.simplified);
      return;
    }

    applyDisplayedSetupMoves(nextUnsimplifiedSetupMoves);

    const nextSetupMoves = cube3x3.format(await simplifySetupMoves(unsimplifiedMoves));
    if (pendingSetupMovesRef.current !== nextUnsimplifiedSetupMoves) {
      return;
    }

    setupMoveSimplificationCacheRef.current = {
      unsimplified: nextUnsimplifiedSetupMoves,
      simplified: nextSetupMoves,
    };
    applyDisplayedSetupMoves(nextSetupMoves);
  };

  if (lastSpeed.current !== speed && sceneRef.current) {
    baseTempoRef.current = cubeSpeed;
    lastSpeed.current = speed;
  }

  const handleTakePicture = () => {
    if (!sceneRef.current) return;

    void syncDisplayedSetupMoves(
      lastScramble.current,
      getDisplayedSolutionAlg(lastSolution.current, lastAnimationTimes.current),
    );

    setIsScreenshotDialogOpen(true);
  };

  const handleFlash = (buttonId: string) => {
    setFlashingButtons(prev => {
      const newSet = new Set(prev);
      newSet.add(buttonId);
      return newSet;
    });

    setTimeout(() => {
      setFlashingButtons(prev => {
        const newSet = new Set(prev);
        newSet.delete(buttonId);
        return newSet;
      });
    }, 150);
  };

  const handleFullLeft = () => {
    handleFlash('fullLeft');
    handleControllerRequest({ type: 'fullLeft' });
  };

  const handleStepLeft = () => {
    handleFlash('stepLeft');
    handleControllerRequest({ type: 'stepLeft' });
  };

  const handlePause = () => {
    handleFlash('playPause');
    handleControllerRequest({ type: 'pause' });
  };

  const handlePlay = () => {
    handleFlash('playPause');
    handleControllerRequest({ type: 'play' });
  };

  const handleReplay = () => {
    handleFlash('playPause');
    handleControllerRequest({ type: 'replay' });
  };

  const handleStepRight = () => {
    handleFlash('stepRight');
    handleControllerRequest({ type: 'stepRight' });
  };

  const handleFullRight = () => {
    handleFlash('fullRight');
    handleControllerRequest({ type: 'fullRight' });
  };

  const setInstantPlayerProps = (scramble: Move3x3[], solution: Move3x3[], animationTimes: number[]) => {
    if (!sceneRef.current) return;

    if (lastSpeed.current !== speed) {
      baseTempoRef.current = cubeSpeed;
    }

    sceneRef.current.setFacelets(faceletsAfter(scramble, getDisplayedSolutionAlg(solution, animationTimes)));
  };

  const updateLastPlayerProps = (scramble: Move3x3[], solution: Move3x3[], animationTimes: number[]) => {
    lastSolution.current = solution;
    lastAnimationTimes.current = animationTimes;
    lastScramble.current = scramble;
    lastSpeed.current = speed;
  };

  const findSingleMovecountChange = (moves: Move3x3[], prevMoves: Move3x3[], times: number[]): { singleMove: Move3x3 | null, movesBefore: Move3x3[] } => {
    let longerMoves;
    let shorterMoves;
    let isAdded: boolean;

    if (moves.length > prevMoves.length) {
      longerMoves = moves;
      shorterMoves = prevMoves;
      isAdded = true;
    } else {
      longerMoves = prevMoves;
      shorterMoves = moves;
      isAdded = false;
    }

    times = times.filter(time => time !== 0);

    const changeIndex = times.length - 1 + (isAdded ? 0 : 1);
    const longerBeforeChange = longerMoves.slice(0, changeIndex);

    const shorterBeforeChange = shorterMoves.slice(0, changeIndex);
    const longerAfterChange = longerMoves.slice(changeIndex + 1);
    const shorterAfterChange = shorterMoves.slice(changeIndex);

    const isBeforeSame = cube3x3.format(longerBeforeChange) === cube3x3.format(shorterBeforeChange);
    const isAfterSame = cube3x3.format(longerAfterChange) === cube3x3.format(shorterAfterChange);
    const changedMove = longerMoves[changeIndex];
    if (!isBeforeSame || !isAfterSame || changedMove === undefined) {
      return { singleMove: null, movesBefore: [] };
    }

    const singleMoveChange = isAdded ? changedMove : cube3x3.invert([changedMove])[0];

    return { singleMove: singleMoveChange, movesBefore: longerBeforeChange };
  };

  const findAlgBeforeSingle = (solution: Move3x3[], singleMoveChange: Move3x3, movesBeforeChange: Move3x3[], moveChangeDelta: number) => {
    let alg = solution;
    if (singleMoveChange) {
      switch (moveChangeDelta) {
        case 1:
          alg = movesBeforeChange;
          break;
        case -1:
          alg = [...movesBeforeChange, ...cube3x3.invert([singleMoveChange])];
          break;
        case 0:
          alg = movesBeforeChange;
          break;
        default:
          console.warn('moveChangeDelta is invalid:', moveChangeDelta);
          break;
      }
    }
    return alg;
  };

  const findAlgAfterSingle = (solution: Move3x3[], singleMoveChange: Move3x3, movesBeforeChange: Move3x3[], moveChangeDelta: number) => {
    let currentAlg = solution;
    if (singleMoveChange) {
      switch (moveChangeDelta) {
        case 1:
          currentAlg = [...movesBeforeChange, singleMoveChange];
          break;
        case -1:
          currentAlg = movesBeforeChange;
          break;
        case 0:
          currentAlg = solution.slice(0, movesBeforeChange.length);
          break;
        default:
          break;
      }
    }
    return currentAlg;
  };

  const findSingleMoveSwitch = (solution: Move3x3[], animationTimes: number[]): { singleMove: Move3x3 | null, movesBefore: Move3x3[], isForward: boolean | undefined } => {
    const noSingle = { singleMove: null, movesBefore: [], isForward: undefined };
    if (!sceneRef.current) return noSingle;
    if (cube3x3.format(solution) !== cube3x3.format(lastSolution.current)) {
      return noSingle;
    }

    const positionChangeDelta = animationTimes.length - lastAnimationTimes.current.length;

    let movesBefore: Move3x3[] = [];
    let singleMove: Move3x3 | null = null;
    if (positionChangeDelta === 1) {
      movesBefore = solution.slice(0, animationTimes.length - 1);
      singleMove = solution[animationTimes.length - 1] ?? null;
    } else if (positionChangeDelta === -1) {
      movesBefore = lastSolution.current.slice(0, lastAnimationTimes.current.length - 1);
      const undoneMove = lastSolution.current[animationTimes.length];
      singleMove = undoneMove === undefined ? null : cube3x3.invert([undoneMove])[0];
    }

    return { singleMove: singleMove, movesBefore: movesBefore, isForward: positionChangeDelta > 0 };
  };

  const calcMoveBetweenSingles = (singleBeforeChange: Move3x3 | undefined, singleAfterChange: Move3x3 | undefined): Move3x3 | null => {
    if (!singleBeforeChange || !singleAfterChange) {
      console.warn('move modified detected but found no move');
      return null;
    }

    const layer = cube3x3.layer(singleBeforeChange);
    if (layer !== cube3x3.layer(singleAfterChange)) {
      return null;
    }

    const amountChange = cube3x3.amount(singleAfterChange) - cube3x3.amount(singleBeforeChange);
    const wrappedAmountChange = Math.abs(amountChange) > 3 ? amountChange - 4 * Math.sign(amountChange) : amountChange;
    if (wrappedAmountChange === 0) {
      return null;
    }

    return cube3x3.make(layer, wrappedAmountChange as Amount);
  };

  const findSingleMoveModify = (solution: Move3x3[], animationTimes: number[]): { singleMove: Move3x3 | null, movesBefore: Move3x3[] } => {
    const noSingle = { singleMove: null, movesBefore: [] };

    if (!sceneRef.current) return noSingle;

    const lastSolutionMoves = lastSolution.current;
    const lastLength = lastAnimationTimes.current.length;

    const leftBeforeChange = lastSolutionMoves.slice(0, lastLength - 1);
    const rightBeforeChange = lastSolutionMoves.slice(lastLength);

    const leftAfterChange = solution.slice(0, animationTimes.length - 1);
    const rightAfterChange = solution.slice(animationTimes.length);

    const isLeftSame = cube3x3.format(leftBeforeChange) === cube3x3.format(leftAfterChange);
    const isRightSame = cube3x3.format(rightBeforeChange) === cube3x3.format(rightAfterChange);
    if (!isLeftSame || !isRightSame) {
      return noSingle;
    }

    const singleBeforeChange = lastSolutionMoves[lastLength - 1];
    const singleAfterChange = solution[animationTimes.length - 1];

    const singleMoveChange = calcMoveBetweenSingles(singleBeforeChange, singleAfterChange);

    if (!singleMoveChange) {
      return noSingle;
    }

    return { singleMove: singleMoveChange, movesBefore: [...leftBeforeChange, singleBeforeChange] };
  };

  const displaySingleChange = (
    scramble: Move3x3[],
    solution: Move3x3[],
    animationTimes: number[],
    singleMoveChange: Move3x3,
    movesBeforeChange: Move3x3[],
    delta: number
  ): RotationInfo | null => {
    const algBeforeSingle = findAlgBeforeSingle(solution, singleMoveChange, movesBeforeChange, delta);
    const algAfterSingle = findAlgAfterSingle(solution, singleMoveChange, movesBeforeChange, delta);
    const timeArrayAfterSingle = animationTimes.slice(0, algAfterSingle.length);

    if (!sceneRef.current) return null;

    sceneRef.current.setFacelets(faceletsAfter(scramble, algBeforeSingle));
    updateLastPlayerProps(scramble, solution, timeArrayAfterSingle);

    const turn = turnRotation(singleMoveChange);
    if (!turn) {
      console.error('Failed to add move:', singleMoveChange);
      setInstantPlayerProps(scramble, solution, animationTimes);
    }
    return turn;
  };

  const handleSingleMovecountChange = (
    moves: Move3x3[],
    lastMoves: Move3x3[],
    moveChangeDelta: number,
    scramble: Move3x3[],
    solution: Move3x3[],
    animationTimes: number[]
  ): RotationInfo | null => {
    const { singleMove: singleMoveChange, movesBefore: movesBeforeChange } = findSingleMovecountChange(moves, lastMoves, animationTimes);

    if (!singleMoveChange) {
      setInstantPlayerProps(scramble, solution, animationTimes);
      updateLastPlayerProps(scramble, solution, animationTimes);
      return null;
    }

    return displaySingleChange(scramble, solution, animationTimes, singleMoveChange, movesBeforeChange, moveChangeDelta);
  };

  const handleSingleMoveSwitch = (
    scramble: Move3x3[],
    solution: Move3x3[],
    animationTimes: number[]
  ): RotationInfo | null => {
    const { singleMove: singleMoveChange, movesBefore: movesBeforeChange, isForward } = findSingleMoveSwitch(solution, animationTimes);

    if (!singleMoveChange) {
      setInstantPlayerProps(scramble, solution, animationTimes);
      updateLastPlayerProps(scramble, solution, animationTimes);
      return null;
    }

    const delta = isForward ? 1 : -1;

    return displaySingleChange(scramble, solution, animationTimes, singleMoveChange, movesBeforeChange, delta);
  };

  const handleSingleMoveModify = (
    scramble: Move3x3[],
    solution: Move3x3[],
    animationTimes: number[]
  ): RotationInfo | null => {
    const { singleMove: singleMoveChange, movesBefore: movesBeforeChange } = findSingleMoveModify(solution, animationTimes);

    if (!singleMoveChange) {
      setInstantPlayerProps(scramble, solution, animationTimes);
      updateLastPlayerProps(scramble, solution, animationTimes);
      return null;
    }

    return displaySingleChange(scramble, solution, animationTimes, singleMoveChange, movesBeforeChange, 0);
  };

  const displayMoves = useCallback((p: RenderRefProps): RotationInfo | null => {
    const { scramble, solution, animationTimes } = p;

    const isScrambleSelected = animationTimes.length === 1 && animationTimes[0] === 1;

    if (isInstant || instantOverrideRef.current || isScrambleSelected) {
      setInstantPlayerProps(scramble, solution, animationTimes);
      updateLastPlayerProps(scramble, solution, animationTimes);
      return null;
    }

    const moves = solution;
    const lastMoves = lastSolution.current;

    const movecountDelta = moves.length - lastMoves.length;

    if (Math.abs(movecountDelta) === 1) {
      return handleSingleMovecountChange(moves, lastMoves, movecountDelta, scramble, solution, animationTimes);
    } else if (movecountDelta === 0 && moves.length > 0) {
      const animationSelectionDelta = animationTimes.length - lastAnimationTimes.current.length;
      if (Math.abs(animationSelectionDelta) === 1) {
        return handleSingleMoveSwitch(scramble, solution, animationTimes);
      } else if (animationSelectionDelta === 0 && animationTimes.length > 0) {
        return handleSingleMoveModify(scramble, solution, animationTimes);
      } else {
        setInstantPlayerProps(scramble, solution, animationTimes);
        updateLastPlayerProps(scramble, solution, animationTimes);
        return null;
      }
    } else {
      setInstantPlayerProps(scramble, solution, animationTimes);
      updateLastPlayerProps(scramble, solution, animationTimes);
      return null;
    }
  }, [
    isInstant
  ]);

  const queuePlayerParams = useCallback((p: RenderRefProps) => {
    if (animatingRef.current) {
      pendingQueueRef.current.push(p);
      return;
    }

    animatingRef.current = true;
    const turnTempo = getQueueTempo(pendingQueueRef.current.length, baseTempoRef.current);

    const turn = displayMoves(p);

    const advance = () => {
      animatingRef.current = false;
      const next = pendingQueueRef.current.shift();
      if (next) queuePlayerParams(next);
    };

    if (!turn || !sceneRef.current) {
      advance();
      return;
    }

    sceneRef.current.applyMove([turn], CATCH_UP_MS / turnTempo, advance);
  }, [displayMoves]);

  useEffect(() => {
    queuePlayerParams({
      scramble: scrambleRequest,
      solution: solutionRequest,
      animationTimes: animationTimesRequest
    });
  }, [
    scrambleRequest,
    solutionRequest,
    animationTimesRequest,
    queuePlayerParams
  ]);

  const startHintRise = () => {
    let riseFrame = 0;
    hintRiseRef.current = STICKER_ELEVATION;

    const riseDelay = setTimeout(() => {
      const riseStart = performance.now();
      const rise = (now: number) => {
        const fraction = Math.min(1, (now - riseStart) / HINT_RISE_MS);
        const eased = fraction * (2 - fraction);
        hintRiseRef.current = fraction < 1
          ? STICKER_ELEVATION + (elevationRef.current - STICKER_ELEVATION) * eased
          : null;
        applyView();
        if (fraction < 1) riseFrame = requestAnimationFrame(rise);
      };
      riseFrame = requestAnimationFrame(rise);
    }, HINT_RISE_DELAY_MS);

    return () => {
      clearTimeout(riseDelay);
      cancelAnimationFrame(riseFrame);
      hintRiseRef.current = null;
    };
  };

  useEffect(() => {
    if (typeof requestIdleCallback === 'function') {
      const handle = requestIdleCallback(warmUpCubeSolver, { timeout: 10000 });
      return () => cancelIdleCallback(handle);
    } else {
      const handle = setTimeout(warmUpCubeSolver, 3000);
      return () => clearTimeout(handle);
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const orbitArea = orbitRef.current;
    const div = divRef.current;
    if (!canvas || !orbitArea || !div) return;

    const paintCanvas = createCanvasPainter(canvas);
    let hasPainted = false;
    const paintAndMarkReady = (drawables: SceneDrawable[]) => {
      paintCanvas(drawables);
      if (hasPainted) return;
      hasPainted = true;
      setIsCubeReady(true);
    };

    sceneRef.current = createCubeScene(paintAndMarkReady, {
      facelets: faceletsAfter(scrambleRequest, getDisplayedSolutionAlg(solutionRequest, animationTimesRequest)),
      angles: INITIAL_ANGLES,
      colors: buildColorHex(cubeColors),
      shade: DEFAULT_SCENE_LOOK.shade,
      dim: DEFAULT_SCENE_LOOK.dim,
      hints: elevationRef.current !== 0,
      labels: true,
      ease: smootherStep,
      orbit: { target: orbitArea, damping: ORBIT_DAMPING },
    });
    lastColorsRef.current = cubeColors;
    lastElevationRef.current = elevationRef.current;

    const stopHintRise = startHintRise();
    applyView();

    const resizeObserver = new ResizeObserver(applyView);
    resizeObserver.observe(div);

    return () => {
      resizeObserver.disconnect();
      stopHintRise();
      sceneRef.current?.destroy();
      sceneRef.current = null;
    };
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const isWithinContainer = divRef.current?.contains(document.activeElement as Node);
    if (isControllerHidden) return;
    if (document.activeElement !== e.currentTarget && !isWithinContainer) return;

    switch (e.key) {
      case ' ':
        e.preventDefault();
        if (controllerButtonsStatus.playPause === 'play') {
          handlePause();
        } else if (controllerButtonsStatus.playPause === 'pause') {
          handlePlay();
        } else if (controllerButtonsStatus.playPause === 'replay') {
          handleReplay();
        }
        break;
      case 'ArrowLeft':
        e.preventDefault();
        handleStepLeft();
        break;
      case 'ArrowRight':
        e.preventDefault();
        handleStepRight();
        break;
      case 'ArrowUp':
        e.preventDefault();
        handleFullLeft();
        break;
      case 'ArrowDown':
        e.preventDefault();
        handleFullRight();
        break;
    }
  };

  return (
    <>
      <div
        ref={divRef}
        className="h-full w-full border border-neutral-600 hover:border-primary-100 rounded-t-sm overflow-hidden relative bg-black"
        onKeyDown={handleKeyDown}
        tabIndex={2}
      >
        <div ref={orbitRef} className="absolute inset-0 touch-none">
          <canvas ref={canvasRef} className="block w-full h-full" />
        </div>
        {!isCubeReady && (
          <div className="absolute inset-0 flex text-xl justify-center items-center text-primary-100">
            Loading cube...
          </div>
        )}
        {isCubeReady && showControls && (
          <>
          <button
            className="absolute bottom-2 right-2 origin-bottom-right p-1 w-8 h-8 border border-neutral-600 bg-dark text-dark_accent hover:text-primary-100 rounded"
            aria-label="Take picture"
            onClick={() => {
              handleTakePicture();
            }}
          >
            <CameraIcon/>
          </button>
          {!isControllerHidden && (
            <PlayerControls
              onFullLeft={handleFullLeft}
              onStepLeft={handleStepLeft}
              onPause={handlePause}
              onPlay={handlePlay}
              onReplay={handleReplay}
              onStepRight={handleStepRight}
              onFullRight={handleFullRight}
              controllerButtonsStatus={controllerButtonsStatus}
              flashingButtons={flashingButtons}
              handleFlash={handleFlash}
            />
          )}
          </>
        )}
      </div>
      {isScreenshotDialogOpen ? (
        <CubeImageDialog
          onClose={() => setIsScreenshotDialogOpen(false)}
          onGeneratePreview={imageCapture.capture}
          setupStatus={screenshotSetupStatus}
          viewerAspectRatio={imageCapture.getViewerAspectRatio()}
          setupMovesForFilename={displayedSetupMoves}
        />
      ) : null}
    </>
  );
});
Player.displayName = 'Player';
export default Player;
