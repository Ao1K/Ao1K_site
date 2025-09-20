import React, { useRef, useState, useCallback, useEffect, MutableRefObject } from 'react';
import { rawAlgs } from "./rawAlgs";
import type { RawAlg } from "./rawAlgs";
import { TwistyPlayer } from 'cubing/twisty';
import { CubeInterpreter } from "../composables/recon/CubeInterpreter";
import type { Object3D, Object3DEventMap } from 'three';
import { Scene, PerspectiveCamera, WebGLRenderer, AmbientLight } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { reverseMove } from '../composables/recon/transformHTML'

interface CompiledAlg {
  alg: string;
  hash: string;
  step?: string;
}

interface AlgCompilerProps {
  algs?: RawAlg[];
}


/**
 * React component for compiling algorithms and rendering a TwistyPlayer
 */
export const AlgCompiler: React.FC<AlgCompilerProps> = ({ algs }) => {
  const divRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<TwistyPlayer | null>(null);
  const cubeRef = useRef<Object3D<Object3DEventMap> | null>(null);

  const [isCompiling, setIsCompiling] = useState(false);
  const [cubeLoaded, setCubeLoaded] = useState(false);

  // Three.js scene variables
  let scene: THREE.Scene;
  let camera: THREE.PerspectiveCamera;
  let renderer: THREE.WebGLRenderer;
  let controls: OrbitControls;
  let cube: Object3D;

  const animate = () => {
    requestAnimationFrame(animate);
    if (controls && renderer && scene && camera) {
      controls.update();
      renderer.render(scene, camera);
    }
  };

  const loadCubeObject = async () => {
    cube = await playerRef.current!.experimentalCurrentThreeJSPuzzleObject() as unknown as Object3D;
    let attempts = 0;
    const maxAttempts = 100; // 10 seconds
    const waitTime = 100; // ms

    while (!cube && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, waitTime));
      cube = await playerRef.current!.experimentalCurrentThreeJSPuzzleObject() as unknown as Object3D;
      attempts++;
    }

    if (!cube) {
      console.error('Failed to load cube object within 10 seconds.');
      return;
    }
    
    return cube;
  };

  const createCustomScene = async () => {
    if (!divRef.current || !playerRef.current) return;

    divRef.current.appendChild(playerRef.current); 
    
    await playerRef.current.connectedCallback();
    
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
      divRef.current.style.height = '400px'; // Set a fixed height for the compiler

      scene = new Scene();
      scene.add(cube);

      cubeRef.current = cube;
      setCubeLoaded(true);

      console.log('Cube loaded for compiler:', cube);
      
      const aspectRatio = divRef.current.clientWidth / divRef.current.clientHeight;
      camera = new PerspectiveCamera(75, aspectRatio, 0.1, 5);

      const scaleFactor = (divRef.current.clientHeight * 0.0024) + 0.92;

      //zoom level
      camera.position.z = (Math.sqrt(3) / 2) * scaleFactor;
      camera.position.y = (1 / 2) * scaleFactor;

      renderer = new WebGLRenderer({ antialias: true });
      renderer.setSize(divRef.current.clientWidth, divRef.current.clientHeight);
      divRef.current.appendChild(renderer.domElement);

      const light = new AmbientLight(0xffffff, 0.5);
      scene.add(light);

      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.15;
      controls.enableZoom = true;
      controls.enablePan = true;
      controls.update();
      
      animate();
    }
  };

  const handleResize = () => {
    if (renderer && camera && divRef.current) {
      camera.aspect = divRef.current.clientWidth / divRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(divRef.current.clientWidth, divRef.current.clientHeight);
    }
  };

  const getAlgInverse = (alg: string): string => {
    let reversedAlg = '';
    const moves = alg.split(' ').reverse();
    moves.forEach((move) => {
      let reversedMove = reverseMove(move);
      if (reversedMove) {
        reversedAlg += reversedMove + ' ';
      }
    });
    return reversedAlg.trim();
  };

  const guessAllowedAlgAngles = (step: string): string[] => {
    switch (step) {
      case 'f2l':
        // don't allow y2. 
        // y2 should generally not be used, so we don't give users the ability to autocomplete to it
        return ['', 'y', "y'"]; 
      case 'oll':
        return [ '', 'U', 'U2', "U'"];
      case 'pll':
        return [ '', 'U', 'U2', "U'"];
      case 'zbll':
        return [ '', 'U', 'U2', "U'"];
      case 'ollcp':
        return [ '', 'U', 'U2', "U'"];
      case 'coll':
        return [ '', 'U', 'U2', "U'"];
      // TODO: add more options
      default:
        return [ ];
    }
  };

  /**
   * Takes an array of cubing algs, determines the cube hash, then creates a json file and downloads it.
   */
  const compileAlgorithms = async (algs?: RawAlg[]) => {
    if (!cubeLoaded || !cubeRef.current) {
      console.error('Cube not loaded yet. Please wait for the cube to load before compiling.');
      return;
    }

    console.log('Compiling algorithms...');
    // if no algs, use rawAlgs file
    if (!algs) {
      algs = rawAlgs;
    }

    const cubeInterpreter = new CubeInterpreter(cubeRef.current);

    // Array to store compiled algorithm data
    const compiledData: CompiledAlg[] = [];

    for (const alg of algs) {
      const angles = alg.allowedAngles ?? guessAllowedAlgAngles(alg.step || '');
      for (const angle of angles) {
        try {
          
          // add AUF/rotation
          const completeAlg =  (angle ? `${angle} ` : '') + alg.value;
          
          // Start alg green front, white top.
          const angleNormalization = (angle ? `${angle} ` : '') // TODO: May need to account for wide moves/rotations in alg.
          
          const algInverse = angleNormalization + getAlgInverse(completeAlg);
          console.log(`Processing Alg: ${completeAlg}, Inverse: ${algInverse}`);
          
          // Set the algorithm on the player
          if (playerRef.current) {
            playerRef.current.alg = algInverse;
            
            // Wait for the cube to update
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // Update the cube interpreter with current cube state
            cubeInterpreter.updateCurrentState(cubeRef.current!);
            const cubeState = cubeInterpreter.getCurrentState();
            const hash = cubeState?.hash || 'unknown';
            
            console.log(`Algorithm: ${alg.value}, Hash: ${hash}`);
            
            // Add to compiled data
            compiledData.push({
              alg: completeAlg,
              hash: hash,
              step: alg.step || '',
            });
          }
        } catch (error) {
          console.error(`Error processing algorithm ${alg.value}:`, error);
          compiledData.push({
            alg: alg.value + ' (Does not include AUF/rotation)',
            hash: 'error',
            step: alg.step || '',
          });
        }
      }
    }
    // Create and download JSON file
    downloadCompiledAlgs(compiledData);
  };

  /**
   * Downloads the compiled algorithms data as a JSON file
   */
  const downloadCompiledAlgs = (data: CompiledAlg[]) => {
    const jsonData = {
      timestamp: new Date().toISOString(),
      totalAlgorithms: data.length,
      algorithms: data
    };

    const jsonString = JSON.stringify(jsonData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // Create download link and trigger download
    const link = document.createElement('a');
    link.href = url;
    link.download = `compiled-algs-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    console.log(`Downloaded ${data.length} compiled algorithms as JSON file`);
  };

  // Initialize player when component mounts
  useEffect(() => {
    playerRef.current = new TwistyPlayer({
      viewerLink: 'none',
      puzzle: '3x3x3',
      backView: 'none',
      background: 'none',
      controlPanel: 'none',
      alg: '',
    });

    createCustomScene();
  }, []);

  useEffect(() => {
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleCompileAlgorithms = async () => {
    if (!cubeLoaded) {
      alert('Please wait for the cube to load before compiling algorithms.');
      return;
    }

    setIsCompiling(true);
    try {
      await compileAlgorithms(algs);
    } catch (error) {
      console.error('Error compiling algorithms:', error);
    } finally {
      setIsCompiling(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div ref={divRef} className="w-full border border-neutral-600 rounded-sm" />
      <div className="flex gap-2 items-center">
        <button 
          onClick={handleCompileAlgorithms}
          disabled={isCompiling || !cubeLoaded}
          className={`text-white p-3 rounded-sm ${
            isCompiling || !cubeLoaded 
              ? 'bg-gray-500 cursor-not-allowed' 
              : 'bg-black hover:bg-gray-800'
          }`}
        >
          {isCompiling ? 'Compiling...' : 'Compile Algorithms'}
        </button>
        {!cubeLoaded && (
          <span className="text-yellow-600">Loading cube...</span>
        )}
        {cubeLoaded && (
          <span className="text-green-600">Cube ready</span>
        )}
      </div>
    </div>
  );
};