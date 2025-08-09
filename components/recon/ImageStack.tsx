import CubeImage from "./CubeImage";

interface ImageStackProps {
  position: [number, number, number] | null;
  moves: string[][][] | null;
  isTextboxFocused: boolean;
}

const ImageStack = ({position, moves, isTextboxFocused}: ImageStackProps) => {
  
  const lineFocus = (isTextboxFocused && position?.[0] === 1) ? position[1] : -1; // if scram is focused, put focus on same line
  const scramble = moves?.[0]?.map((move) => move.join(' ')).join(' ') || '';
  const solutionLines = moves?.[1]?.map((move) => move.join(' ')) || [''];

  // TODO: use step information from CubeInterpreter.tsx
  // TODO: determine line heights from getBoundingClientRect for each div inside solution div.

  // console.log('ImageStack position: ', position);
  // console.log('ImageStack scramble: ', scramble);
  // console.log('ImageStack solutionLines: ', solutionLines);

  return (
    <div className="flex flex-col items-center justify-start w-10 pt-1 border-none">
      {solutionLines.map((line, index) => {
        const isWhitespace = line.trim() === '';
        const isFirstLine = index === 0;
        const shouldShowCube = !isWhitespace || isFirstLine;
                
        const textUpToThisPoint = scramble + ' ' + solutionLines.slice(0, index).join(' ');
        const textLength = textUpToThisPoint?.length || 0;
        const isFocus = lineFocus === index;
        
        return (
          <div
            key={index}
            className={`
              w-10 h-7
              transition-all duration-300 ease-in-out border-none
              hover:h-[42px] hover:z-20
              group
              ${index > 0 ? '-mt-5.5' : ''}
              ${isFocus ? 'h-[42px] bg-dark bg-opacity-70' : ''}
            `}
          >
            { shouldShowCube ? (
              <div className="w-full h-full hover:scale-110">
                <CubeImage 
                  key={`cube-${index}-${textLength}`}
                  moves={textUpToThisPoint} 
                  lineNumber={index} 
                />
              </div>
            ) : (
              <div className="w-full h-7 flex-none"/>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default ImageStack;