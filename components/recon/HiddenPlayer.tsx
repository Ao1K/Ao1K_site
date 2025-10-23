import React, { useCallback, useEffect, useRef } from 'react';
import { TwistyPlayer } from 'cubing/twisty';
import type { Object3D } from 'three';
import type { MutableRefObject } from 'react';
import type { Object3DEventMap } from 'three/src/core/Object3D.js';
import type { PlayerParams as RenderRefProps } from './_PageContent';

interface PlayerProps {
  scramble: string;
  solution: string;
  animationTimes: number[]; // all times of animations up to but not including the current move
  cubeRef: MutableRefObject<Object3D<Object3DEventMap> | null>;
  onCubeStateUpdate: () => void;
  handleCubeLoaded: () => void;
}

/**
 * More cubingjs abuse.
 * This component creates a hidden TwistyPlayer instance to manipulate a cube in the background.
 */
const HiddenPlayer = React.memo(({ 
  scramble, 
  solution, 
  animationTimes, 
  cubeRef, 
  onCubeStateUpdate,
  handleCubeLoaded
}: PlayerProps) => {
  const playerRef = useRef<TwistyPlayer | null>(null);

  // console.log('HiddenPlayer props changed:');
  // console.log('scramble:', scramble);
  // console.log('solution:', solution);
  // console.log('animationTimes:', animationTimes);
    
  if (playerRef.current) {
    const timestamp = animationTimes.reduce((acc, val) => acc + val, 0);
    playerRef.current.experimentalSetupAlg = scramble;
    playerRef.current.alg = solution;
    playerRef.current.timestamp = timestamp;
  }


  setTimeout(() => {
    // slight delay to ensure cube has finished turning
    onCubeStateUpdate();
  }, 100); // try 10 later

  let cube: Object3D;
    
  const loadCubeObject = async () => {
    cube = await playerRef.current!.experimentalCurrentThreeJSPuzzleObject() as unknown as Object3D;
    let attempts = 0;
    const maxAttempts = 100; // 10 seconds
    const waitTime = 100; // ms

    while (!cube && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, waitTime));
      cube = await playerRef.current!.experimentalCurrentThreeJSPuzzleObject() as unknown as Object3D;
      playerRef.current? playerRef.current.timestamp = 'end' : null;
      attempts++;
    }

    if (!cube) {
      console.error('Failed to load cube object within 10 seconds.');
      return;
    }
    
    return cube;
  };

  useEffect(() => {
    console.log('Initializing hidden TwistyPlayer...');
    playerRef.current = new TwistyPlayer({
      viewerLink: 'none',
      puzzle: '3x3x3',
      hintFacelets: 'none',
      backView: 'none',
      background: 'none',
      controlPanel: 'none',
      
      
      experimentalSetupAlg: scramble || '',
      alg: solution || '',
      
      
      tempoScale: 10000,
    });

    playerRef.current!.style.width = '1px';
    playerRef.current!.style.height = '1px';
    playerRef.current!.experimentalFaceletScale = .95;

    console.log('Hidden TwistyPlayer initialized:', playerRef.current);

    // Create a detached DOM element for the headless player
    const detachedContainer = document.createElement('div');
    detachedContainer.style.position = 'fixed'; // make div always "visible" but...
    detachedContainer.style.width = '1px'; // ...so small it won't be seen
    detachedContainer.style.height = '1px';
    // detachedContainer.style.overflow = 'hidden';
    detachedContainer.style.pointerEvents = 'none';
    
    // Append to body (but positioned off-screen)
    document.body.appendChild(detachedContainer);
    detachedContainer.appendChild(playerRef.current!);
    
    const initializeCube = async () => {
      const cube = await loadCubeObject();
      cubeRef.current = cube || null;
      handleCubeLoaded();
    };
    
    initializeCube();

    // console.log('Scene done');
    // set props after cubeInterpreter is initialized during createCustomScene
    // setInstantPlayerProps(scramble, solution, animationTimes);

    // Cleanup function to remove the detached element
    return () => {
      if (detachedContainer && detachedContainer.parentNode) {
        detachedContainer.parentNode.removeChild(detachedContainer);
      }
    };

  }, []);

  return null; 
});

HiddenPlayer.displayName = 'HiddenPlayer';
export default HiddenPlayer;