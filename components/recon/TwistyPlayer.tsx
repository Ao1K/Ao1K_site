import React, { useCallback, useEffect, useRef, useState } from 'react';
import { TwistyPlayer } from 'cubing/twisty';
import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  TextureLoader,
  LinearMipmapLinearFilter,
  LinearFilter,
  MeshBasicMaterial,
  PlaneGeometry,
  Mesh,
  AmbientLight,
  type Object3D
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Object3DEventMap } from 'three/src/core/Object3D.js';
import ContextMenuImperative, { ContextMenuHandle } from './ContextMenuImperative';
import PlayerControls from './PlayerControls';
import { reverseMove } from '../../composables/recon/transformHTML'
import type { ControllerRequestOptions } from './_PageContent';
import type { PlayerParams as RenderRefProps } from './_PageContent';
import Cookies from 'js-cookie';

interface PlayerProps {
  scrambleRequest: string;
  solutionRequest: string;
  speed: number;
  animationTimesRequest: number[]; // all times of animations up to but not including the current move
  onCubeStateUpdate: () => void;
  handleCubeLoaded: () => void;
  handleControllerRequest: (request: ControllerRequestOptions) => void;
  controllerButtonsStatus: {
    fullLeft: string;
    stepLeft: string;
    playPause: string;
    stepRight: string;
    fullRight: string;
  };
  setControllerButtonsStatus: React.Dispatch<React.SetStateAction<{
    fullLeft: string;
    stepLeft: string;
    playPause: string;
    stepRight: string;
    fullRight: string;
  }>>;
}

export const CUBE_COLORS = {
  red: '#FF0000',
  green: '#0CEC00',
  blue: '#003CFF',
  yellow: '#EEFF00',
  orange: '#FF7F00',
  white: '#FFFFFF',
};


const Player = React.memo(({ 
  scrambleRequest, 
  solutionRequest, 
  speed, 
  animationTimesRequest,
  onCubeStateUpdate,
  handleCubeLoaded,
  handleControllerRequest,
  controllerButtonsStatus,
  setControllerButtonsStatus,
}: PlayerProps) => {
  const playerRef = useRef<TwistyPlayer | null>(null);
  const cubeRef = useRef<Object3D<Object3DEventMap> | null>(null);
  const divRef = useRef<HTMLDivElement>(null);

  const lastSolution = useRef<string>('');
  const lastScramble = useRef<string>('');
  const lastAnimationTimes = useRef<number[]>([]);
  const lastSpeed = useRef<number>(0);

  const contextMenuRef = useRef<ContextMenuHandle>(null);
  
  const animatingRef = useRef<boolean>(false);
  const pendingParamsRef = useRef<RenderRefProps>(null);


  const [showControls, setShowControls] = useState<boolean>(true);
  const [flashingButtons, setFlashingButtons] = useState<Set<string>>(new Set());

  const calcCubeSpeed = (speed: number) => {
    if (speed === 100) {
      return 1000;
    } else {
      return 1.5**(speed / 15) - 0.6;
    }
  }

  const cubeSpeed = calcCubeSpeed(speed);
  const isInstant = cubeSpeed === 1000;

  if (lastSpeed.current !== speed && playerRef.current) {
    playerRef.current.tempoScale = cubeSpeed;
    lastSpeed.current = speed;
  }

  const handleFlash = (buttonId: string) => {
    // console.log('Flashing button:', buttonId);
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
  }

  const handleStepLeft = () => {
    handleFlash('stepLeft');
    handleControllerRequest({ type: 'stepLeft' });
  }

  const handlePause = () => {
    handleFlash('playPause');
    handleControllerRequest({ type: 'pause' });
  }

  const handlePlay = () => {
    handleFlash('playPause');
    handleControllerRequest({ type: 'play' });
  }

  const handleReplay = () => {
    handleFlash('playPause');
    handleControllerRequest({ type: 'replay' });
  }

  const handleStepRight = () => {
    handleFlash('stepRight');
    handleControllerRequest({ type: 'stepRight' });
  }

  const handleFullRight = () => {
    handleFlash('fullRight');
    handleControllerRequest({ type: 'fullRight' });
  }
  
  const setInstantPlayerProps = (scramble: string, solution: string, animationTimes: number[]) => {

    if (!playerRef.current) return;

    if (lastScramble.current !== scramble) {
      playerRef.current.experimentalSetupAlg = scramble;
    }

    if (lastSpeed.current !== speed) {
      playerRef.current!.tempoScale = cubeSpeed;
    }

    playerRef.current.alg = solution;

    if (lastAnimationTimes.current !== animationTimes) {
      playerRef.current.timestamp = animationTimes.reduce((acc, val) => acc + val, 0);
    } 

  }

  const updateLastPlayerProps = (scramble: string, solution: string, animationTimes: number[]) => {
    lastSolution.current = solution;
    lastAnimationTimes.current = animationTimes;
    lastScramble.current = scramble;
    lastSpeed.current = speed;
  }

  const findTimestamp = (animationTimes: number[] | undefined, currentAlg: string) => {

    let time = 0;
    let currentLength = currentAlg.split(' ').length;

    if (animationTimes && playerRef.current) {
      for (let i = 0; i < currentLength; i++) {
          time += animationTimes[i];
      }
    }

    return time;
  }

  const findSingleMovecountChange = (moves: string[], prevMoves: string[], times: number[]): {singleMove: string, movesBefore: string} => {

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
    
    const changeIndex = times.length - 1 + (isAdded ? 0 : 1); // add one if move was removed. Corrects for fact that times sync with move prior to change
    const longerBeforeChange = longerMoves.slice(0, changeIndex);


    const shorterBeforeChange = shorterMoves.slice(0, changeIndex);
    const longerAfterChange = longerMoves.slice(changeIndex + 1); // excludes move at index of change
    const shorterAfterChange = shorterMoves.slice(changeIndex); // includes move at index of change

    if (longerBeforeChange.join(' ') !== shorterBeforeChange.join(' ') || longerAfterChange.join(' ') !== shorterAfterChange.join(' ')) {
      return {singleMove: '', movesBefore: ''};
    } 
    
    let singleMoveChange = longerMoves[changeIndex];
    let movesBeforeChange = longerBeforeChange.join(' ');

    if (!isAdded) {
      singleMoveChange = reverseMove(singleMoveChange);
    }

    return {singleMove: singleMoveChange, movesBefore: movesBeforeChange};
  }

  const findAlgBeforeSingle = (solution: string, singleMoveChange: string, movesBeforeChange: string, moveChangeDelta: number) => {
    let alg = solution;
    if (singleMoveChange) {
      switch (moveChangeDelta) {
        case 1:
          alg = movesBeforeChange;
          break;
        case -1:
          alg = movesBeforeChange + " " + reverseMove(singleMoveChange); // animation time of SingleMoveChange must be preserved upon reversal
          break;
        case 0:
          // only for moveModify case
          alg = movesBeforeChange;
          break;
        default:
          console.warn('moveChangeDelta is invalid:', moveChangeDelta);
          break;
      }
    }
    return alg;
  }

  const findAlgAfterSingle = (solution: string, singleMoveChange: string, movesBeforeChange: string, moveChangeDelta: number) => {
    let currentAlg = solution;
    if (singleMoveChange) {
      switch (moveChangeDelta) {
        case 1:
          currentAlg = movesBeforeChange + " " + singleMoveChange;
          break;
        case -1:
          currentAlg = movesBeforeChange;
          break;
        case 0:
          //only for moveModify case. Returns new alg up to and including the move selected during the change
          currentAlg = solution.split(' ').slice(0, movesBeforeChange.split(' ').length).join(' ');
          break;
        default:
          break;
      }
    }
    return currentAlg;
  }

  const findSingleMoveSwitch = (solution: string, animationTimes: number[]): {singleMove: string, movesBefore: string, isForward: boolean | undefined} => {
    const noSingle = { singleMove: '', movesBefore: '', isForward: undefined };
    if (!playerRef.current) return noSingle;
    if (solution !== lastSolution.current) {
      // solution was changed. Likely only happens if move was replaced.
      return noSingle;
    }

    const positionChangeDelta = animationTimes.length - lastAnimationTimes.current.length;

    let movesBefore: string = "";
    let singleMove: string = "";
    if (positionChangeDelta === 1) {
      movesBefore = solution.split(' ').slice(0, animationTimes.length - 1).join(' ');
      const forwardNewMove = solution.split(' ')[animationTimes.length - 1];
      singleMove = forwardNewMove;

    } else if (positionChangeDelta === -1) {
      movesBefore = lastSolution.current.split(' ').slice(0, lastAnimationTimes.current.length - 1).join(' ');
      const reversedLastMove = reverseMove(lastSolution.current.split(' ')[animationTimes.length]);
      singleMove = reversedLastMove;
    }

    return {singleMove: singleMove, movesBefore: movesBefore, isForward: positionChangeDelta > 0};

  }

  const calcMoveBetweenSingles = (singleBeforeChange: string, singleAfterChange: string): string | undefined => {

    if (!singleBeforeChange || !singleAfterChange) { // this check may be unnecessary
      console.warn('move modified detected but found no move');
      return '';
    }

    const singleBeforeChangeRoot = singleBeforeChange[0];
    const singleAfterChangeRoot = singleAfterChange[0];
    
    if (singleBeforeChangeRoot !== singleAfterChangeRoot) {
      return '';
    }
    const root = singleBeforeChangeRoot;

    const singleBeforeChangeSuffix = singleBeforeChange.slice(1);
    const singleAfterChangeSuffix = singleAfterChange.slice(1);

    if (singleBeforeChangeSuffix === singleAfterChangeSuffix) {
      return '';
    }

    const beforeAfter = singleBeforeChangeSuffix + " " + singleAfterChangeSuffix;
    let delta = 0;
    
    // we're only interested in handling cases that require a single character to be typed or deleted
    // this switch statement could be tweaked extensively based on preference. Possibly individual user preference.
    switch (beforeAfter) {
      case " '":
        delta = -2;
        break;
      case "' ":
        delta = 2;
        break;
      case " 2":
        delta = 1;
        break;
      case "2 ":
        delta = -1;
        break;
      case " 3":
        delta = 2;
        break;
      case "3 ":
        delta = -2;
        break;
      case "2' 2":
        delta = 0;
        break;
      case "2 2'":
        delta = 0;
        break;
      case "3' 3":
        delta = 2; // not intuitive. Might be better to set instantly on this case
        break;
      case "3 3'":
        delta = -2; // not intuitive. Might be better to set instantly on this case
        break;
      default:
        return '';
    }

    switch (delta) {
      case 0:
        return '';
      case 1:
        return root;
      case -1:
        return root + "'";
      case 2:
        return root + "2";
      case -2:
        return root + "2'";
      default:
        return '';
    }
  }

  const findSingleMoveModify = (solution: string, animationTimes: number[]): {singleMove: string, movesBefore: string} => {
    // movecount matching and selection matching have already been already verified

    const noSingle = { singleMove: '', movesBefore: '' };

    if (!playerRef.current) return noSingle;

    const lastSolutionArray = lastSolution.current.split(' ');
    const solutionArray = solution.split(' ');

    const leftBeforeChange = lastSolutionArray.slice(0, lastAnimationTimes.current.length - 1).join(' ');
    const rightBeforeChange = lastSolutionArray.slice(lastAnimationTimes.current.length).join(' ');

    const leftAfterChange = solutionArray.slice(0, animationTimes.length - 1).join(' ');
    const rightAfterChange = solutionArray.slice(animationTimes.length).join(' ');

    if (leftBeforeChange !== leftAfterChange || rightBeforeChange !== rightAfterChange) {
      return noSingle;
    }

    const singleBeforeChange = lastSolutionArray[lastAnimationTimes.current.length - 1];
    const singleAfterChange = solutionArray[animationTimes.length - 1];

    const singleMoveChange = calcMoveBetweenSingles(singleBeforeChange, singleAfterChange);

    if (!singleMoveChange) {
      return noSingle;
    }

    return {singleMove: singleMoveChange, movesBefore: leftBeforeChange + " " + singleBeforeChange};
  }

  const displaySingleChange = (
    scramble: string,
    solution: string,
    animationTimes: number[],
    singleMoveChange: string,
    movesBeforeChange: string,
    delta: number
  ) => {
    // delta represents the direction of the change, where positive means left to right

    const algBeforeSingle = findAlgBeforeSingle(solution, singleMoveChange, movesBeforeChange, delta); 
    const timeBeforeSingle = findTimestamp(animationTimes, algBeforeSingle);
    const algAfterSingle = findAlgAfterSingle(solution, singleMoveChange, movesBeforeChange, delta);
    const timeArrayAfterSingle = animationTimes.slice(0, algAfterSingle.split(' ').length);
    
    if (!playerRef.current) return;
    
    playerRef.current.alg = algBeforeSingle;
    playerRef.current.timestamp = timeBeforeSingle;

    updateLastPlayerProps(scramble, solution, timeArrayAfterSingle);
    
    // perform the animated move
    try {
      playerRef.current.experimentalAddMove(singleMoveChange);
    } catch (e) {
      console.error('Failed to add move:', singleMoveChange);
      setInstantPlayerProps(scramble, solution, animationTimes);
    }
  }

  const handleSingleMovecountChange = (
    moves: string[],
    lastMoves: string[],
    moveChangeDelta: number,
    scramble: string,
    solution: string,
    animationTimes: number[]
  ) => {
    // handles case were a single move was added or removed
    // animates the change if the selection count also changed by one

    let singleMoveChange = "";
    let movesBeforeChange = "";

    ({ singleMove: singleMoveChange, movesBefore: movesBeforeChange } = findSingleMovecountChange(moves, lastMoves, animationTimes));

    if (!singleMoveChange) {
      setInstantPlayerProps(scramble, solution, animationTimes);
      updateLastPlayerProps(scramble, solution, animationTimes);
      return;
    } 
      
    displaySingleChange(scramble, solution, animationTimes, singleMoveChange, movesBeforeChange, moveChangeDelta);
  }

  const handleSingleMoveSwitch = (
    scramble: string,
    solution: string,
    animationTimes: number[]
  ) => {
    // handles case where move selection changed by one move, ex: from first move to second move
    let singleMoveChange = "";
    let movesBeforeChange = "";
    let isForward: boolean | undefined;
    ({ singleMove: singleMoveChange, movesBefore: movesBeforeChange, isForward: isForward } = findSingleMoveSwitch(solution, animationTimes));

    if (!singleMoveChange) {
      setInstantPlayerProps(scramble, solution, animationTimes);
      updateLastPlayerProps(scramble, solution, animationTimes);
      return;
    }
      
    let delta = isForward ? 1 : -1;

    displaySingleChange(scramble, solution, animationTimes, singleMoveChange, movesBeforeChange, delta);
    
  }

  const handleSingleMoveModify = (
    scramble: string,
    solution: string,
    animationTimes: number[]
  ) => {
    // handles case where the move selected was modified, ex: from R to R2
    let singleMoveChange = "";
    let movesBeforeChange = "";

    ({ singleMove: singleMoveChange, movesBefore: movesBeforeChange } = findSingleMoveModify(solution, animationTimes));
    // movesBeforeChange is the last solution up to and including the move selected during the change

    if (!singleMoveChange) {
      setInstantPlayerProps(scramble, solution, animationTimes);
      updateLastPlayerProps(scramble, solution, animationTimes);
      return;
    } 
      
    let delta = 0;

    displaySingleChange(scramble, solution, animationTimes, singleMoveChange, movesBeforeChange, delta);
    
  }

  const displayMoves = useCallback((p: RenderRefProps) => {
    const { scramble, solution, animationTimes } = p;
  
    // three cases for single move change:
    // 1. number of moves changed by one (ex: R U| → R U F|)
    // 2. move selection changed by one (ex: R U |F → R U| F)
    // 3. move modified (ex: R U| F → R U'| F2)

    const isScrambleSelected = animationTimes.length === 1 && animationTimes[0] === 1;

    if (isInstant || isScrambleSelected) {
      setInstantPlayerProps(scramble, solution, animationTimes);
      updateLastPlayerProps(scramble, solution, animationTimes);
      return;
    }
    
    // check for single move change
    const moves = solution.split(' ').filter(move => move !== '');
    const lastMoves = lastSolution.current ? lastSolution.current.split(' ').filter(move => move !== '') : [];
    
    const movecountDelta = moves.length - lastMoves.length;
    

    if (Math.abs(movecountDelta) === 1) {
      // case 1
      handleSingleMovecountChange(moves, lastMoves, movecountDelta, scramble, solution, animationTimes);
    } else if (movecountDelta === 0 && moves.length > 0) {
        const animationSelectionDelta = animationTimes.length - lastAnimationTimes.current.length;
      if (Math.abs(animationSelectionDelta) === 1) {
        // case 2
        handleSingleMoveSwitch(scramble, solution, animationTimes);
      } else if (animationSelectionDelta === 0 && animationTimes.length > 0) {
        // case 3
        handleSingleMoveModify(scramble, solution, animationTimes);
      } else {
        setInstantPlayerProps(scramble, solution, animationTimes);
        updateLastPlayerProps(scramble, solution, animationTimes);
      }
    } else {
      setInstantPlayerProps(scramble, solution, animationTimes);
      updateLastPlayerProps(scramble, solution, animationTimes);
    }
  }, [
    isInstant
  ]);

  /**
   * Keeps a single-move queue to prevent large UI desyncs during rapid input.
   * Latest move replaces any pending queued move.
   *  
   * Function has the side effect of giving onCubeStateUpdate.
   */
  const queuePlayerParams = useCallback((p: RenderRefProps) => {

    if (!animatingRef.current) {
      animatingRef.current = true;
      displayMoves(p);
      
      // Monitor cube movement by checking matrix changes
      let lastMatrixStrings: string[] = [];
      
      const captureCurrentMatrices = () => {
        if (!cubeRef.current) return [];
        
        // Direct access to the last 6 children (center faces) - indices 20-25
        const children = cubeRef.current.children;
        
        // Extract only rotation-sensitive matrix elements (0,1,2,4,5,6,8,9,10)
        // These are the elements that change during 3D rotations
        return [
          `${children[20].matrix.elements[0]},${children[20].matrix.elements[1]},${children[20].matrix.elements[2]},${children[20].matrix.elements[4]},${children[20].matrix.elements[5]},${children[20].matrix.elements[6]},${children[20].matrix.elements[8]},${children[20].matrix.elements[9]},${children[20].matrix.elements[10]}`,
          `${children[21].matrix.elements[0]},${children[21].matrix.elements[1]},${children[21].matrix.elements[2]},${children[21].matrix.elements[4]},${children[21].matrix.elements[5]},${children[21].matrix.elements[6]},${children[21].matrix.elements[8]},${children[21].matrix.elements[9]},${children[21].matrix.elements[10]}`,
          `${children[22].matrix.elements[0]},${children[22].matrix.elements[1]},${children[22].matrix.elements[2]},${children[22].matrix.elements[4]},${children[22].matrix.elements[5]},${children[22].matrix.elements[6]},${children[22].matrix.elements[8]},${children[22].matrix.elements[9]},${children[22].matrix.elements[10]}`,
          `${children[23].matrix.elements[0]},${children[23].matrix.elements[1]},${children[23].matrix.elements[2]},${children[23].matrix.elements[4]},${children[23].matrix.elements[5]},${children[23].matrix.elements[6]},${children[23].matrix.elements[8]},${children[23].matrix.elements[9]},${children[23].matrix.elements[10]}`,
          `${children[24].matrix.elements[0]},${children[24].matrix.elements[1]},${children[24].matrix.elements[2]},${children[24].matrix.elements[4]},${children[24].matrix.elements[5]},${children[24].matrix.elements[6]},${children[24].matrix.elements[8]},${children[24].matrix.elements[9]},${children[24].matrix.elements[10]}`,
          `${children[25].matrix.elements[0]},${children[25].matrix.elements[1]},${children[25].matrix.elements[2]},${children[25].matrix.elements[4]},${children[25].matrix.elements[5]},${children[25].matrix.elements[6]},${children[25].matrix.elements[8]},${children[25].matrix.elements[9]},${children[25].matrix.elements[10]}`
        ];
      };
      
      const checkCubeMovement = () => {

        if (!cubeRef.current) {
          // Fallback if no cube reference
          setTimeout(() => {
            animatingRef.current = false;
            if (pendingParamsRef.current) {
              queuePlayerParams(pendingParamsRef.current);
              pendingParamsRef.current = null;
            }
          }, 400);
          return;
        }
        
        const currentMatrices = captureCurrentMatrices();
        
        // look for any changed in the matrixes compared to the last known state
        const hasChanged = currentMatrices.some((matrix, index) => matrix !== lastMatrixStrings[index]);
        
        if (hasChanged) {
          // console.log('Cube is still moving...');
          lastMatrixStrings = currentMatrices;
          setTimeout(checkCubeMovement, 20); // check again soon
        } else {

          // handle param updates
          animatingRef.current = false;
          if (pendingParamsRef.current) {
            queuePlayerParams(pendingParamsRef.current);
            pendingParamsRef.current = null;
          }
        }
      };
      
      // Capture initial state and start monitoring after a delay
      setTimeout(() => {
        lastMatrixStrings = captureCurrentMatrices();
        // console.log('Starting cube movement monitoring...');
        setTimeout(checkCubeMovement, 50); // Start checking after animation begins
      }, 10);
      
    } else {
      pendingParamsRef.current = p;
    }
  }, [displayMoves]);

  // main entry point for changes to params
  useEffect(() => {
    // console.log('Queueing player params:', {
    //   scramble: scrambleRequest,
    //   solution: solutionRequest,
    //   animationTimes: animationTimesRequest
    // });
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

  let scene: Scene;
  let camera: PerspectiveCamera;
  let renderer: WebGLRenderer;
  let controls: OrbitControls;
  let cube: Object3D;
    
  const animate = () => {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  };
  
  const loadCubeObject = async () => {
    cube = await playerRef.current!.experimentalCurrentThreeJSPuzzleObject() as unknown as Object3D;
    let attempts = 0;
    const maxAttempts = 100; // 10 seconds
    const waitTime = 100; // ms

    while (!cube && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, waitTime));
      cube = await playerRef.current!.experimentalCurrentThreeJSPuzzleObject() as unknown as Object3D;
      playerRef.current? playerRef.current.timestamp = findTimestamp(animationTimesRequest, solutionRequest) : null;
      attempts++;
    }

    if (!cube) {
      console.error('Failed to load cube object within 10 seconds.');
      return;
    }
    
    return cube;
  };

  const addFaceLabels = () => {
    const loader = new TextureLoader();      
    const labels: { file: string, position: { x: number, y: number, z: number }, rotation: { x: number, y: number, z: number } }[] = [
      {
        file: '/U.svg',
        position: { x: 0, y: 2, z: 0 },
        rotation: { x: -Math.PI / 2, y: 0, z: 0 }
      },
      {
        file: '/D.svg',
        position: { x: 0, y: -2, z: 0 },
        rotation: { x: Math.PI / 2, y: 0, z: 0 }
      },
      {
        file: '/R.svg',
        position: { x: 2, y: 0, z: 0 },
        rotation: { x: 0, y: Math.PI / 2, z: 0 }
      },
      {
        file: '/L.svg',
        position: { x: -2, y: 0, z: 0 },
        rotation: { x: 0, y: -Math.PI / 2, z: 0 }
      },
      {
        file: '/B.svg',
        position: { x: 0, y: 0, z: -2 },
        rotation: { x: 0, y: Math.PI, z: 0 }
      },
      {
        file: '/F.svg',
        position: { x: 0, y: 0, z: 2 },
        rotation: { x: 0, y: 0, z: 0 }
      }
    ];

    // add  R, L, U, D, F, B labels
    labels.forEach(label => {
      const texture = loader.load(label.file, () => {
        texture.generateMipmaps = true;
        texture.minFilter = LinearMipmapLinearFilter;
        texture.magFilter = LinearFilter;
        const maxAnisotropy = renderer.capabilities.getMaxAnisotropy()
        // texture.anisotropy = Math.min(16, maxAnisotropy);
        texture.anisotropy = maxAnisotropy;
        
                  
        const material = new MeshBasicMaterial({ 
          map: texture, 
          transparent: true 
        });
        
        const geometry = new PlaneGeometry(1.1, 1.6);
        const mesh = new Mesh(geometry, material);
        
        mesh.position.set(label.position.x, label.position.y, label.position.z);
        mesh.rotation.set(label.rotation.x, label.rotation.y, label.rotation.z);
        
        cube.add(mesh);
                  
      });
      
      
    });
  }

  const createCustomScene = async () => {
    divRef.current!.appendChild(playerRef.current!); 
    
    await playerRef.current!.connectedCallback();
    
    let possibleCube = await loadCubeObject();
    possibleCube ? cube = possibleCube : null;
    
    if (divRef.current && cube && !scene) {
      
      // Find and remove any <twisty-player> elements.
      let twistyPlayerElement = divRef.current.querySelector('twisty-player');
      while (twistyPlayerElement) {
        divRef.current.removeChild(twistyPlayerElement);
        twistyPlayerElement = divRef.current.querySelector('twisty-player');
      }

      divRef.current.style.width = '100%';
      divRef.current.style.height = '100%';

      scene = new Scene();

      addFaceLabels();
      setStickerColors(cube);
      
      scene.add(cube);

      cubeRef.current = cube;
      // handleCubeLoaded();

      // console.log('Cube loaded:', cube);
      
      const aspectRatio = (divRef.current.clientWidth - 1) / (divRef.current.clientHeight - 1);
      camera = new PerspectiveCamera(75, aspectRatio, 0.1, 5);

      const scaleFactor = (divRef.current.clientHeight * 0.0024) + 0.92; // found through experimentation w/linear system

      //zoom level
      camera.position.z = (Math.sqrt(3) / 2) * scaleFactor;
      camera.position.y = (1 / 2) * scaleFactor;

      renderer = new WebGLRenderer({ antialias: true });
      renderer.setSize(divRef.current.clientWidth - 1, divRef.current.clientHeight - 1);
      divRef.current.appendChild(renderer.domElement);

      const light = new AmbientLight(0xffffff, 0.5); // soft white light
      scene.add(light);

      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.15;
      controls.enableZoom = false;
      controls.enablePan = false;
      controls.update();
      
      animate();
    }
  }

  const handleResize = () => {
    if (renderer && camera && divRef.current) {
      
      
      camera.aspect = (divRef.current.clientWidth -1) / (divRef.current.clientHeight - 1);
      camera.updateProjectionMatrix();
      renderer.setSize(divRef.current.clientWidth - 1, divRef.current.clientHeight - 1);
    }

    // console.log('cube: ', playerRef.current?.experimentalCurrentThreeJSPuzzleObject());
    
  }

  const hexToRgb = (hex: string) => {
    const bigint = parseInt(hex.replace('#', ''), 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return [r, g, b];
  };

  const setStickerColors = (cube: any) => {
    if (!playerRef.current) return;
    const stickerColors = cube.kpuzzleFaceletInfo;
    if (!stickerColors) return;
    
    const red = hexToRgb(CUBE_COLORS.red);
    const green = hexToRgb(CUBE_COLORS.green);
    const blue = hexToRgb(CUBE_COLORS.blue);
    const yellow = hexToRgb(CUBE_COLORS.yellow);
    const orange = hexToRgb(CUBE_COLORS.orange);
    const white = hexToRgb(CUBE_COLORS.white);

    // not sure why I can just set the centers, but I'm not complaining
    cube.kpuzzleFaceletInfo.CENTERS[0][0].facelet.material.color.setRGB(...white.map(val => val / 255));
    cube.kpuzzleFaceletInfo.CENTERS[1][0].facelet.material.color.setRGB(...orange.map(val => val / 255));
    cube.kpuzzleFaceletInfo.CENTERS[2][0].facelet.material.color.setRGB(...green.map(val => val / 255));
    cube.kpuzzleFaceletInfo.CENTERS[3][0].facelet.material.color.setRGB(...red.map(val => val / 255));
    cube.kpuzzleFaceletInfo.CENTERS[4][0].facelet.material.color.setRGB(...blue.map(val => val / 255));
    cube.kpuzzleFaceletInfo.CENTERS[5][0].facelet.material.color.setRGB(...yellow.map(val => val / 255));
  }

  useEffect(() => {

    playerRef.current = new TwistyPlayer({
      viewerLink: 'none',
      puzzle: '3x3x3',
      hintFacelets: 'floating',
      experimentalInitialHintFaceletsAnimation: "always",
      backView: 'none',
      background: 'none',
      controlPanel: 'none',
      
      
      experimentalSetupAlg: scrambleRequest || '',
      alg: solutionRequest || '',
      
      
      tempoScale: cubeSpeed,
    });

    playerRef.current!.style.width = '100%';
    playerRef.current!.style.marginRight = '1px';
    playerRef.current!.style.height = '100%';
    playerRef.current!.experimentalFaceletScale = .95;

    // console.log('creating scene');
    createCustomScene();

    // console.log('Scene done');
    // set props after cubeInterpreter is initialized during createCustomScene
    setInstantPlayerProps(scrambleRequest, solutionRequest, animationTimesRequest);

  }, []);

  // open the menu imperatively
  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    contextMenuRef.current?.show(e.clientX, e.clientY);
  };

  const handleToggleControls = () => {
    Cookies.set('showPlayerControls', (!showControls).toString(), { expires: 365 });
    setShowControls(prev => !prev);
  };

  useEffect(() => {

    Cookies.get('showPlayerControls') === 'false' ? setShowControls(false) : setShowControls(true);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Handle if this div has focus OR if focus is on any element within this container
    const isWithinContainer = divRef.current?.contains(document.activeElement as Node);
    if (document.activeElement !== e.currentTarget && !isWithinContainer) return;
    
    switch (e.key) {
      case ' ': // Spacebar
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
        className="h-full w-full border border-neutral-600 hover:border-primary-100 rounded-t-sm relative bg-black"
        onClick={() => contextMenuRef.current?.close()}
        onContextMenu={handleContextMenu}
        onKeyDown={handleKeyDown}
        tabIndex={2}
      >
        <PlayerControls
          isVisible={showControls}
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
      </div>
    
      <ContextMenuImperative
        ref={contextMenuRef}
        onToggleControls={handleToggleControls}
        showControls={showControls}
        containerRef={divRef}
      />
    </>
  );
});
Player.displayName = 'Player';
export default Player;