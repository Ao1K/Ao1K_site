import React, { useEffect, useRef } from 'react';
import { TwistyPlayer, TwistyPlayerConfig } from 'cubing/twisty';

interface PlayerProps {
  scramble: string;
  solution: string;
  speed: number;
  moveLocation: number[];
  animationTime: number;
}

export default function Player({ scramble, solution, speed, moveLocation, animationTime: animationTimePosition }: PlayerProps) {
  const playerRef = useRef<HTMLDivElement>(null);
  
  const calcCubeSpeed = (speed: number) => {
    if (speed === 100) {
      return 1000;
    } else {
      return 1.5**(speed / 15) - 0.6;
    }
  }

  const cubeSpeed = calcCubeSpeed(speed);

  const playerInstance = useRef<TwistyPlayer | null>(new TwistyPlayer(
    {
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
    }
    
  ));

  playerInstance.current!.style.width = '100%';
  playerInstance.current!.style.height = '100%';
  playerInstance.current!.experimentalFaceletScale = .95;
  playerInstance.current!.experimentalSetupAlg = scramble;
  playerInstance.current!.alg = solution;

  animationTimePosition ? playerInstance.current!.timestamp = animationTimePosition : null;


  useEffect(() => {
    playerRef.current!.appendChild(playerInstance.current!)

    return () => { // untested
      if (playerInstance.current) {
        playerInstance.current.remove();
        playerInstance.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={playerRef}
      className="w-full h-full"
    />
  );
}




//these work to add or remove any move from the player
// playerInstance.current.experimentalAddMove("move alg");
// playerInstance.current.experimentalRemoveFinalChild();