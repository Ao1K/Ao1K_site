import { PNG, Type } from "sr-puzzlegen";
import { useRef, useEffect } from "react";
import type { PNGVisualizerOptions } from "sr-puzzlegen";

interface CubeGraphicProps {
  alg?: string;
  customMask?: PNGVisualizerOptions;
}

const CubeGraphic = ({ alg = "", customMask, }: CubeGraphicProps) => {
  const imageRef = useRef<HTMLDivElement>(null);
  const cubeCreatedRef = useRef<string | null>(null);
  
  const options = {
    width: 250,
    height: 250,
    puzzle: {
      scheme: {
        U: { value: "#FFFF00" }, // Yellow
        F: { value: "#FF0000" }, // Red
        R: { value: "#0CEC00" }, // Green
        D: { value: "#FFFFFF" }, // White
        L: { value: "#0085FF" }, // Blue
        B: { value: "#FF7F00" }  // Orange
      },
      // "mostly see red and yellow"
      // "green takes up about half the horizontal space as red"
      rotations: [ { y: -290 }, { x: 30 } ], 
      alg: alg,
      mask: customMask?.puzzle?.mask,
    },
  };

  useEffect(() => {
    if (imageRef.current && cubeCreatedRef.current !== alg) {
      imageRef.current.innerHTML = '';
      PNG(imageRef.current, Type.CUBE, options);
      cubeCreatedRef.current = alg;
    }
  }, [alg]);

  return (
    <div ref={imageRef} className="flex justify-center"></div>
  )
};

export default CubeGraphic;
