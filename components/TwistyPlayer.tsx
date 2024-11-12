import React, { useEffect, useRef } from 'react';
import { TwistyPlayer } from 'cubing/twisty';
import * as THREE from 'three';
import type { Object3D } from 'three';
import { OrbitControls } from 'three/addons/controls/orbitcontrols.js'
import U_image from 'U.svg';
import { text } from 'stream/consumers';
interface PlayerProps {
  scramble: string;
  solution: string;
  speed: number;
  moveLocation: number[];
  animationTime: number;
}

export default function Player({ scramble, solution, speed, moveLocation, animationTime: animationTimePosition }: PlayerProps) {
  const divRef = useRef<HTMLDivElement>(null);
  const hiddenRef = useRef<HTMLDivElement>(null);
  const lastMoves = useRef<string[]>(solution ? solution.split(' ') : []);


  const calcCubeSpeed = (speed: number) => {
    if (speed === 100) {
      return 1000;
    } else {
      return 1.5**(speed / 15) - 0.6;
    }
  }

  const cubeSpeed = calcCubeSpeed(speed);

  
  const playerRef = useRef<TwistyPlayer | null>(null);
  const canvasRef = useRef<{ canvas: HTMLCanvasElement | null }>({ canvas: null });
  
  const setPlayerProps = () => {
    playerRef.current!.style.width = '100%';
    playerRef.current!.style.height = '100%';
    playerRef.current!.experimentalFaceletScale = .95;
    playerRef.current!.experimentalSetupAlg = scramble;
    playerRef.current!.tempoScale = cubeSpeed;
  }
  
  if (playerRef.current) {
    setPlayerProps();
  }

  const displayNewMove = () => {
    // console.log('moves', solution.split(' '));
    const moves = solution.split(' ');
    const isOneNewMove = moves.length - lastMoves.current.length === 1;
    const lastMove = moves.pop();
    const isLastMoveChange = lastMoves.current.toString() === moves.toString();

    if (isOneNewMove && isLastMoveChange && lastMove) {
      playerRef.current!.experimentalAddMove(lastMove); // todo: make this work on any singular new move. Will need to adjust animationTimePosition. Can change animation time to pass as an array.
    } else {
      playerRef.current ? playerRef.current.alg = solution : null;
    }

    solution ? 
      lastMoves.current = solution.split(' ') : 
      lastMoves.current = [];
  }

  displayNewMove();

  animationTimePosition ? playerRef.current!.timestamp = animationTimePosition : null;

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

  const createCustomScene = async () => {
    hiddenRef.current!.appendChild(playerRef.current!); 
    
    // wait one second
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('hiddenRef.children', hiddenRef.current!.children);
    
    console.log('hiddenRef.current', hiddenRef.current);
    await playerRef.current!.connectedCallback()
    console.log('connected');
    // const canvases = await playerRef.current!.experimentalCurrentCanvases();
    // console.log('canvases', canvases);
    // canvasRef.current.canvas = canvases[0];

    cube = await playerRef.current!.experimentalCurrentThreeJSPuzzleObject() as unknown as Object3D;

    if (divRef.current && cube && !scene) {
    
      //remove all hiddenRef children
      while (hiddenRef.current!.firstChild) {
        hiddenRef.current!.removeChild(hiddenRef.current!.firstChild);
      }


      divRef.current.style.width = '100%';
      divRef.current.style.height = '100%';

      
      scene = new THREE.Scene();
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const material = new THREE.MeshBasicMaterial({ color: 0xFFFF00 });
      const mesh = new THREE.Mesh(geometry, material);
    
      // add U_image to mesh
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
      // @ts-ignore
      console.log(cube, cube.kpuzzleFaceletInfo.CENTERS[0][0].facelet.position.x);
      
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

    setPlayerProps();

    
    // Append TwistyPlayer to DOM
    
    // divRef.current!.appendChild(playerRef.current);

    createCustomScene();

    
    // on resize event handler
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
}




//these work to add or remove any move from the player
// playerInstance.current.experimentalAddMove("move alg");
// playerInstance.current.experimentalRemoveFinalChild();