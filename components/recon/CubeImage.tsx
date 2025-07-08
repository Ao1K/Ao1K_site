import { PNG, Type } from "sr-puzzlegen";
import { useRef, memo, useEffect } from "react";

interface CubeImageProps {
  moves: string;
  lineNumber: number;
}

const CubeImage = ({ moves, lineNumber }: CubeImageProps) => {

  moves = moves.trim();

  const imageRef = useRef<HTMLDivElement>(null);
  const cubeCreatedRef = useRef<string>('');
  const idString = `cube-${lineNumber}`;
  
  const options = {
    width: 100,
    height: 100,
    puzzle: {
      scheme: {
        // twistyPlayer colors don't display true color, so these are taken via external tool
        // i.e. taking screenshot of cube and using color picker
        U: { value: "#FFFFFF" },
        F: { value: "#3DF600" },
        R: { value: "#FF0000" },
        D: { value: "#FFFF00" },
        L: { value: "#FFBB00" },
        B: { value: "#0085FF"}
      },
      rotations: [ { y: 60 }, { x: 34 } ],
      alg: moves
    },

  };

  const makeImage = () => {
    if (imageRef.current && cubeCreatedRef.current !== moves) {
      let cube = imageRef.current;
      // delete any existing cubes
      imageRef.current.innerHTML = '';
      // create a new cube
      PNG(cube, Type.CUBE, options);
      cubeCreatedRef.current = moves;
    }
  };

  makeImage();

  useEffect(() => {
    makeImage();
  }, []);


  return (
    <div id={idString} ref={imageRef}></div>
  )
};

export default CubeImage;