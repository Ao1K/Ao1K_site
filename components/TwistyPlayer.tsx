import React, { useEffect, useRef } from 'react';
import { TwistyPlayer } from 'cubing/twisty';
import * as THREE from 'three';
import type { Object3D } from 'three';
import { OrbitControls } from 'three/addons/controls/orbitcontrols.js'

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

  const findSingleMoveChange = (moves: string[], prevMoves: string[], times: number[]): {singleMove: string, movesBefore: string} => {

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
    let currentAlg = solution;
    if (singleMoveChange) {
      switch (moveChangeDelta) {
        case 1:
          currentAlg = movesBeforeChange;
          break;
        case -1:
          currentAlg = movesBeforeChange + " " + reverseMove(singleMoveChange);
          break;
        default:
          console.warn('moveChangeDelta is invalid'); // findAlgBeforeSingle should only be called with delta of 1 or -1
          break;
      }
    }
    return currentAlg;
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
          currentAlg = movesBeforeChange;
          break;
        default:
          break;
      }
    }
    return currentAlg;
  }

  const findSingleMoveSwitch = (): {singleMove: string, movesBefore: string, isForward: boolean | undefined} => {
    if (!playerRef.current) return {singleMove: '', movesBefore: '', isForward: undefined};
    if (solution !== lastSolution.current) {
      // solution was changed. Likely only happens if move was replaced.
      return {singleMove: '', movesBefore: '', isForward: undefined};
    }
    if (animationTimes.length === 1 && animationTimes[0] === 1) {
      // scramble was selected
      return {singleMove: '', movesBefore: '', isForward: undefined};
    }
    const positionChangeDelta = animationTimes.length - lastAnimationTimes.current.length;
    if (Math.abs(positionChangeDelta) !== 1) {
      return {singleMove: '', movesBefore: '', isForward: undefined};
    }

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

  const handleSingleMoveChange = (moves: string[], lastMoves: string[], moveChangeDelta: number) => {

    let singleMoveChange = "";
    let movesBeforeChange = "";
    ({ singleMove: singleMoveChange, movesBefore: movesBeforeChange } = findSingleMoveChange(moves, lastMoves, animationTimes));

    if (!singleMoveChange) {
      setInstantPlayerProps();
      updateLastPlayerProps(undefined, undefined);

    } else if (singleMoveChange) {
      
      const algBeforeSingle = findAlgBeforeSingle(singleMoveChange, movesBeforeChange, moveChangeDelta); 
      const timeBeforeSingle = findTimestamp(animationTimes, algBeforeSingle);
      const algAfterSingle = findAlgAfterSingle(singleMoveChange, movesBeforeChange, moveChangeDelta);
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
  }

  const handleSingleMoveSwitch = () => {
    
    let singleMoveChange = "";
    let movesBeforeChange = "";
    let isForward: boolean | undefined;
    ({ singleMove: singleMoveChange, movesBefore: movesBeforeChange, isForward: isForward } = findSingleMoveSwitch());

    if (!singleMoveChange) {
      setInstantPlayerProps();
      updateLastPlayerProps(undefined, undefined);

    } else if (singleMoveChange) {
      
      let delta = isForward ? 1 : -1;
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
  }


  // handles all visual cube updates
  const displayMoves = () => {
  
    // four cases for single move change:
    // 1. new move added
    // 2. move removed
    // 3. move selection changed by one move. Not yet implemented.
    // 4. move modified. Ignored for now. Possibly too unintuitive to user to implement.

    if (isInstant) {
      setInstantPlayerProps();
      updateLastPlayerProps(undefined, undefined);
      return;
    }
    
    // check for single move change
    const moves = solution.split(' ').filter(move => move !== '');
    const lastMoves = lastSolution.current ? lastSolution.current.split(' ').filter(move => move !== '') : [];
    
    const moveChangeDelta = moves.length - lastMoves.length;
    

    if (moveChangeDelta === 1 || moveChangeDelta === -1) {
      handleSingleMoveChange(moves, lastMoves, moveChangeDelta);
    } else if (moveChangeDelta === 0) {
      // find if move selection changed by one move
      handleSingleMoveSwitch();
    } else {
      // invalid delta
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
    
  const animate = (time: number) => {
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
    console.log('creating scene');
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
          file: 'U.svg',
          position: { x: 0, y: 2, z: 0 },
          rotation: { x: -Math.PI / 2, y: 0, z: 0 }
        },
        {
          file: 'D.svg',
          position: { x: 0, y: -2, z: 0 },
          rotation: { x: Math.PI / 2, y: 0, z: 0 }
        },
        {
          file: 'R.svg',
          position: { x: 2, y: 0, z: 0 },
          rotation: { x: 0, y: Math.PI / 2, z: 0 }
        },
        {
          file: 'L.svg',
          position: { x: -2, y: 0, z: 0 },
          rotation: { x: 0, y: -Math.PI / 2, z: 0 }
        },
        {
          file: 'B.svg',
          position: { x: 0, y: 0, z: -2 },
          rotation: { x: 0, y: Math.PI, z: 0 }
        },
        {
          file: 'F.svg',
          position: { x: 0, y: 0, z: 2 },
          rotation: { x: 0, y: 0, z: 0 }
        }
      ];

      // add  R, L, U, D, F, B labels
      labels.forEach(label => {
        const texture = loader.load(label.file, () => {
          texture.minFilter = THREE.LinearFilter;
          texture.magFilter = THREE.LinearFilter;
          texture.anisotropy = renderer.capabilities.getMaxAnisotropy() / 4;
          
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
      
      camera = new THREE.PerspectiveCamera(75, divRef.current.clientWidth / divRef.current.clientHeight, 0.1, 5);
      camera.position.z = 1.56; // unit circle stuff. [sqrt(3) / 2] * 1.8
      camera.position.y = .9; // [1/2] * 1.8

      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(divRef.current.clientWidth, divRef.current.clientHeight);
      divRef.current.appendChild(renderer.domElement);

      const light = new THREE.AmbientLight(0xffffff, 0.5); // soft white light
      scene.add(light);

      // Add OrbitControls
      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.15;
      controls.enableZoom = false;
      controls.enablePan = false;
      controls.update();
      
      animate(0);
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

export default Player;



// NOTE:
// access kpuzzleFaceletInfo to change cube colors, etc
// for example:
//  cube.kpuzzleFaceletInfo.CENTERS[0][0]);