import React, { useEffect, useRef } from 'react';
import { TwistyPlayer } from 'cubing/twisty';
import * as THREE from 'three';
import type { Object3D } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

interface PlayerProps {
  scramble: string;
  solution: string;
  speed: number;
  animationTimes: number[];
}

const Player = React.memo(({ scramble, solution, speed, animationTimes }: PlayerProps) => {

  const playerRef = useRef<TwistyPlayer | null>(null);
  
  const divRef = useRef<HTMLDivElement>(null);
  const hiddenRef = useRef<HTMLDivElement>(null);
  const lastSolution = useRef<string>('');
  const lastScramble = useRef<string>('');
  const lastAnimationTimes = useRef<number[]>([]);
  const lastSpeed = useRef<number>(0);

  const lastRenderRef = useRef<PlayerProps>({ scramble: scramble, solution: solution, speed: speed, animationTimes: animationTimes });
  
  const calcCubeSpeed = (speed: number) => {
    if (speed === 100) {
      return 1000;
    } else {
      return 1.5**(speed / 15) - 0.6;
    }
  }

  const cubeSpeed = calcCubeSpeed(speed);
  const isInstant = cubeSpeed === 1000;
  
  const setInstantPlayerProps = () => {

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

  const updateLastPlayerProps = (sol: string | undefined, animTimes: number[] | undefined) => {

    if (sol === undefined) {
      lastSolution.current = solution;
    } else {
      lastSolution.current = sol;
    }

    animTimes ? lastAnimationTimes.current = animTimes : 
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

  const reverseMove = (move: string) => {
    if (!move) return '';
    const rootMove = move[0];
    const suffix = move.slice(1);
    let reversedSuffix;
    switch (suffix) {
      case '':
        reversedSuffix = "'";
        break;
      case "'":
        reversedSuffix = "";
        break;
      case "2":
        reversedSuffix = "2'";
        break;
        case "2'":
        reversedSuffix = "2";
        break;
        case "3":
          reversedSuffix = "3'";
        break;
      case "3'":
        reversedSuffix = "3";
        break;
      default:
        console.error('Invalid suffix:', suffix);
        reversedSuffix = suffix; 
    }

    return rootMove + reversedSuffix;
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

  const findAlgBeforeSingle = (singleMoveChange: string, movesBeforeChange: string, moveChangeDelta: number) => {
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

  const findAlgAfterSingle = (singleMoveChange: string, movesBeforeChange: string, moveChangeDelta: number) => {
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

  const findSingleMoveSwitch = (): {singleMove: string, movesBefore: string, isForward: boolean | undefined} => {
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
    // this switch statement could be tweaked extensively based on preference. Possibly user preference.
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

  const findSingleMoveModify = (): {singleMove: string, movesBefore: string} => {
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

  const manifestSingleChange = (singleMoveChange: string, movesBeforeChange: string, delta: number) => {
    const algBeforeSingle = findAlgBeforeSingle(singleMoveChange, movesBeforeChange, delta); 
    const timeBeforeSingle = findTimestamp(animationTimes, algBeforeSingle);
    const algAfterSingle = findAlgAfterSingle(singleMoveChange, movesBeforeChange, delta);
    const timeArrayAfterSingle = animationTimes.slice(0, algAfterSingle.split(' ').length);
    
    if (!playerRef.current) return;
    
    playerRef.current.alg = algBeforeSingle;

    playerRef.current.timestamp = timeBeforeSingle;

    updateLastPlayerProps(solution, timeArrayAfterSingle);
      
    try {
      playerRef.current.experimentalAddMove(singleMoveChange);
    } catch (e) {
      console.error('Failed to add move:', singleMoveChange);
      setInstantPlayerProps();
    }  
  }

  const handleSingleMovecountChange = (moves: string[], lastMoves: string[], moveChangeDelta: number) => {
    // handles case were a single move was added or removed
    // animates the change if the selection count also changed by one

    let singleMoveChange = "";
    let movesBeforeChange = "";

    ({ singleMove: singleMoveChange, movesBefore: movesBeforeChange } = findSingleMovecountChange(moves, lastMoves, animationTimes));

    if (!singleMoveChange) {
      setInstantPlayerProps();
      updateLastPlayerProps(undefined, undefined);
      return;
    } 
      
    manifestSingleChange(singleMoveChange, movesBeforeChange, moveChangeDelta);

  }

  const handleSingleMoveSwitch = () => {
    // handles case where move selection changed by one move, ex: from first move to second move
    let singleMoveChange = "";
    let movesBeforeChange = "";
    let isForward: boolean | undefined;
    ({ singleMove: singleMoveChange, movesBefore: movesBeforeChange, isForward: isForward } = findSingleMoveSwitch());

    if (!singleMoveChange) {
      setInstantPlayerProps();
      updateLastPlayerProps(undefined, undefined);
      return;
    }
      
    let delta = isForward ? 1 : -1;

    manifestSingleChange(singleMoveChange, movesBeforeChange, delta);
    
  }

  const handleSingleMoveModify = () => {
    // handles case where the move selected was modified, ex: from R to R2
    let singleMoveChange = "";
    let movesBeforeChange = "";

    ({ singleMove: singleMoveChange, movesBefore: movesBeforeChange } = findSingleMoveModify());
    // movesBeforeChange is the last solution up to and including the move selected during the change

    if (!singleMoveChange) {
      setInstantPlayerProps();
      updateLastPlayerProps(undefined, undefined);
      return;
    } 
      
    let delta = 0;

    manifestSingleChange(singleMoveChange, movesBeforeChange, delta);
    
  }


  // handles all visual cube updates
  const displayMoves = () => {
  
    // four cases for single move change:
    // 1. new move added
    // 2. move removed
    // 3. move selection changed by one move. Not yet implemented.
    // 4. move modified. Ignored for now. Possibly too unintuitive to user to implement.

    const isScrambleSelected = animationTimes.length === 1 && animationTimes[0] === 1;

    if (isInstant || isScrambleSelected) {
      setInstantPlayerProps();
      updateLastPlayerProps(undefined, undefined);
      return;
    }
    
    // check for single move change
    const moves = solution.split(' ').filter(move => move !== '');
    const lastMoves = lastSolution.current ? lastSolution.current.split(' ').filter(move => move !== '') : [];
    
    const movecountDelta = moves.length - lastMoves.length;
    

    if (Math.abs(movecountDelta) === 1) {
      handleSingleMovecountChange(moves, lastMoves, movecountDelta);
    } else if (movecountDelta === 0) {
        const animationSelectionDelta = animationTimes.length - lastAnimationTimes.current.length;
      if (Math.abs(animationSelectionDelta) === 1) {
        handleSingleMoveSwitch();
      } else if (animationSelectionDelta === 0) {
        handleSingleMoveModify();
      } else {
        setInstantPlayerProps();
        updateLastPlayerProps(undefined, undefined);
      }
    } else {
      setInstantPlayerProps();
      updateLastPlayerProps(undefined, undefined);
    }
  }

  const anyMoveChange = () => {
    if (lastRenderRef.current.scramble !== scramble) return true;
    if (lastRenderRef.current.solution !== solution) return true;
    if (lastRenderRef.current.speed !== speed) return true;
    if (lastRenderRef.current.animationTimes !== animationTimes) return true;
    return false;
  }

  if (anyMoveChange()) {
    displayMoves();
  }

  lastRenderRef.current = { scramble: scramble, solution: solution, speed: speed, animationTimes: animationTimes };
  
  let scene: THREE.Scene;
  let camera: THREE.PerspectiveCamera;
  let renderer: THREE.WebGLRenderer;
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
      playerRef.current? playerRef.current.timestamp = findTimestamp(animationTimes, solution) : null;
      attempts++;
    }

    if (!cube) {
      console.error('Failed to load cube object within 10 seconds.');
      return;
    }
    
    return cube;
  };

  const createCustomScene = async () => {
    hiddenRef.current!.appendChild(playerRef.current!); 
    
    await playerRef.current!.connectedCallback();
    
    let possibleCube = await loadCubeObject();
    possibleCube ? cube = possibleCube : null;
    
    if (divRef.current && cube && !scene) {
      
      while (hiddenRef.current!.firstChild) {
        hiddenRef.current!.removeChild(hiddenRef.current!.firstChild);
      }


      divRef.current.style.width = '100%';
      divRef.current.style.height = '100%';

      
      scene = new THREE.Scene();
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const material = new THREE.MeshBasicMaterial({ color: 0xFFFF00 });
      const mesh = new THREE.Mesh(geometry, material);
      
      const loader = new THREE.TextureLoader();
      
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
          texture.minFilter = THREE.LinearMipmapLinearFilter;
          texture.magFilter = THREE.LinearFilter;
          const maxAnisotropy = renderer.capabilities.getMaxAnisotropy()
          // texture.anisotropy = Math.min(16, maxAnisotropy);
          texture.anisotropy = maxAnisotropy;
          
                    
          const material = new THREE.MeshBasicMaterial({ 
            map: texture, 
            transparent: true 
          });
          
          const geometry = new THREE.PlaneGeometry(1.1, 1.6);
          const mesh = new THREE.Mesh(geometry, material);
          
          mesh.position.set(label.position.x, label.position.y, label.position.z);
          mesh.rotation.set(label.rotation.x, label.rotation.y, label.rotation.z);
          
          cube.add(mesh);
        });
      });
      
      scene.add(cube);
      
      const aspectRatio = divRef.current.clientWidth / divRef.current.clientHeight;
      camera = new THREE.PerspectiveCamera(75, aspectRatio, 0.1, 5);

      const scaleFactor = (divRef.current.clientHeight * 0.0024) + 0.92; // found through experimentation w/linear system

      //zoom level
      camera.position.z = (Math.sqrt(3) / 2) * scaleFactor;
      camera.position.y = (1 / 2) * scaleFactor;

      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(divRef.current.clientWidth, divRef.current.clientHeight);
      divRef.current.appendChild(renderer.domElement);

      const light = new THREE.AmbientLight(0xffffff, 0.5); // soft white light
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
      
      
      camera.aspect = divRef.current.clientWidth / divRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(divRef.current.clientWidth, divRef.current.clientHeight);
    }
    
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
      // experimentalDragInput: 'auto',
      // experimentalMovePressInput: 'basic',
      
      experimentalSetupAlg: scramble,
      alg: solution,
      
      
      tempoScale: cubeSpeed,
    });

    playerRef.current!.style.width = '100%';
    playerRef.current!.style.height = '100%';
    playerRef.current!.experimentalFaceletScale = .95;

    setInstantPlayerProps();
    
    createCustomScene();

    window.addEventListener('resize', handleResize);

    
    return () => {
      window.removeEventListener('resize', handleResize);
      //divRef.current?.removeChild(playerRef.current!);
    }
  }, []);

  return (
    <div
      ref={divRef}
      className="w-full h-full"
     >
      <div ref={hiddenRef} className="hidden w-1/2 h-1/2"></div>
    </div> 
    
  );
});

Player.displayName = 'Player';
export default Player;



// NOTE:
// access kpuzzleFaceletInfo to change cube colors, etc
// for example:
//  cube.kpuzzleFaceletInfo.CENTERS[0][0]);