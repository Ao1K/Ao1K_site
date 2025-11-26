import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { TwistyPlayer } from 'cubing/twisty';
import type { Object3D } from 'three';

interface PlayerProps {
  onCubeLoaded: () => void;
}

export interface HiddenPlayerHandle {
  updateCube: (scramble: string, solution: string, animationTimes: number[]) => Promise<Object3D | null>;
}

/**
 * More cubingjs abuse.
 * This component creates a hidden TwistyPlayer instance to manipulate a cube in the background.
 */
const HiddenPlayer = forwardRef<HiddenPlayerHandle, PlayerProps>(({ 
  onCubeLoaded
}, ref) => {
  const playerRef = useRef<TwistyPlayer | null>(null);
  const cubeRef = useRef<Object3D | null>(null);
  const updateQueueRef = useRef<Promise<void>>(Promise.resolve());

  useImperativeHandle(ref, () => ({
    updateCube: (scramble: string, solution: string, animationTimes: number[]) => {
      const runTask = async (): Promise<Object3D | null> => {
        if (!playerRef.current) {
          console.warn('Player not initialized yet');
          return null;
        }

        // serialize cube updates so each request sees its own state
        const timestamp = animationTimes.reduce((acc, val) => acc + val, 0);

        playerRef.current.experimentalSetupAlg = scramble;
        playerRef.current.alg = solution;
        playerRef.current.timestamp = timestamp;

        await new Promise(resolve => setTimeout(resolve, 250));

        return cubeRef.current;
      };

      // add request to queue
      const queuedPromise = updateQueueRef.current
        .catch(() => undefined)
        .then(runTask);

      // update queue ref
      updateQueueRef.current = queuedPromise
        .then(() => undefined)
        .catch(() => undefined);

      return queuedPromise;
    }
  }), []);

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
      
      
      experimentalSetupAlg: '',
      alg: '',
      
      
      tempoScale: 10000,
    });

    playerRef.current!.style.width = '1px';
    playerRef.current!.style.height = '1px';
    playerRef.current!.experimentalFaceletScale = .95;

    console.log('Hidden TwistyPlayer initialized:', playerRef.current);

    // create a detached DOM element for the headless player
    const detachedContainer = document.createElement('div');
    detachedContainer.style.position = 'fixed'; // make div always "visible" but...
    detachedContainer.style.width = '1px'; // ...so small it won't be seen
    detachedContainer.style.height = '1px';
    // detachedContainer.style.overflow = 'hidden';
    detachedContainer.style.pointerEvents = 'none';
    
    document.body.appendChild(detachedContainer);
    detachedContainer.appendChild(playerRef.current!);
    
    const initializeCube = async () => {
      const cube = await loadCubeObject();
      cubeRef.current = cube || null;
      onCubeLoaded();
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