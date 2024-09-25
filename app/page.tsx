'use client';
'use strict';

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";


export default function Home() {  
  return (
  <div id="main_page" className="w-full h-dvh min-h-full flex flex-col items-center bg-background overflow-none">
    <div id="inputs" className="p-4 w-full md:w-2/3 xl:w-1/3 lg:w-3/5 flex justify-center items-center">
      <div className="w-full flex-col ">
        <textarea 
          className="bg-light flex-grow resize-none p-2 mb-2 w-full min-h-[4.5rem] text-dark font-sans text-xl" 
          placeholder="Enter scramble">
        </textarea>
      </div>
    </div>
    <div id="cube_model" className="flex w-1/3 transition-width duration-500 ease-in-out h-1/3 mb-4 z-0">
        <Canvas>
          <Suspense fallback={null}>
            {/* <CubeModel /> */}
            <OrbitControls minDistance={3} maxDistance={10} dampingFactor={0.2} enablePan={false}/>
          </Suspense>
        </Canvas>
    </div>
  </div>
  );
}

