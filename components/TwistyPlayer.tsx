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
  const playerInstance = useRef<TwistyPlayer | null>(null);

  //trying to understand props

  // interface test extends TwistyPlayerConfig {
  //   nothing: string;
  // }

  // const whatever = ({nothing, ...props}: test) => {
  //   console.log('...props', props, props.experimentalHintSprite, props.experimentalSprite, props.experimentalStickeringMaskOrbits, props.alg);
  // }
  
  // whatever({nothing: "something"});

 //



  const calcCubeSpeed = (speed: number) => {
    if (speed === 100) {
      return 1000;
    } else {
      return 1.5**(speed / 15) - 0.6;
    }
  }


  useEffect(() => {

    const cubeSpeed = calcCubeSpeed(speed);


    if (playerRef.current && !playerInstance.current) {
      playerInstance.current = new TwistyPlayer({
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
      playerInstance.current.style.width = '100%';
      playerInstance.current.style.height = '100%';
      
      playerInstance.current.experimentalFaceletScale = .95;
      //console.log(playerInstance.current);
      playerRef.current.appendChild(playerInstance.current);
    }

    return () => { // untested
      if (playerInstance.current) {
        playerInstance.current.remove();
        playerInstance.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (playerInstance.current) {
      playerInstance.current.experimentalSetupAlg = scramble;
    }
  }, [scramble]);

  useEffect(() => {
    if (playerInstance.current) {

      playerInstance.current.alg = solution;
    }
  }, [solution]);

  useEffect(() => {
    if (playerInstance.current) {
      const cubeSpeed = calcCubeSpeed(speed);
      playerInstance.current.tempoScale = cubeSpeed;
    }
  }, [speed]);

  useEffect(() => {
    if (playerInstance.current && animationTimePosition) {

      playerInstance.current.timestamp = animationTimePosition;

    }
  }, [animationTimePosition]);

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