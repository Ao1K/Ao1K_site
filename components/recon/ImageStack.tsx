import CubeImage from './CubeImage';
import React, { useRef, useState, useEffect } from 'react';
import debounce from 'lodash.debounce';
import type { StepInfo } from '../../composables/recon/CubeInterpreter';
import { CUBE_COLORS } from '../../components/recon/TwistyPlayer';
import type { Grid } from '../../composables/recon/LLinterpreter';

interface ImageStackProps {
  position: [number, number, number] | null;
  moves: string[][][] | null;
  isTextboxFocused: boolean;
  lineSteps: StepInfo[][] | null;
  editableElement?: HTMLElement | null;
}

const ImageStack = ({position, moves, isTextboxFocused, lineSteps, editableElement}: ImageStackProps) => {
  // const scramble = moves?.[0]?.map((move) => move.join(' ')).join(' ') || '';
  const solutionLines = moves?.[1]?.map((move) => move.join(' ')) || [''];

  // TODO: use step information from CubeInterpreter.tsx

  const [, forceRender] = useState({});
  const observerRef = useRef<ResizeObserver | null>(null);

  const getCurrentDivHeights = (element: HTMLElement) => {
    const divs = element.querySelectorAll('div');
    return Array.from(divs).map((div, index) => ({
      index,
      height: div.getBoundingClientRect().height
    }));
  };

  useEffect(() => {
    if (!editableElement) {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      return;
    }

    const setupResizeObserver = () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      const handleResize = debounce(() => {
        forceRender({});
      }, 300);

      observerRef.current = new ResizeObserver(handleResize);

      const divs = editableElement.querySelectorAll('div');
      divs.forEach(div => {
        observerRef.current!.observe(div);
      });
    };

    // Set up initial observer
    setupResizeObserver();

    // Set up MutationObserver to watch for DOM changes within editableElement
    const mutationObserver = new MutationObserver(() => {
      setupResizeObserver(); // Re-setup when DOM structure changes
    });

    // Watch for child additions/removals in the editable element
    mutationObserver.observe(editableElement, {
      childList: true,
      subtree: true
    });

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      mutationObserver.disconnect();
    };
  }, [editableElement]);

  const divHeights = editableElement ? getCurrentDivHeights(editableElement) : [];

  const getLineStepInfo = (index: number): StepInfo | null => {
    const currentSteps = lineSteps?.[index] || [];
    
    if (currentSteps.length === 0) return null;
    
    // Get all previous steps for context
    const prevSteps = lineSteps?.slice(0, index).flat() || [];
    // console.log('Current steps for line', index, ':', currentSteps);

    // get the most recent pattern from previous steps
    let prevPattern: Grid = [];
    for (let i = prevSteps.length - 1; i >= 0; i--) {
      if (prevSteps[i].pattern && prevSteps[i].pattern!.length > 0) {
        prevPattern =  prevSteps[i]!.pattern!;
        break;
      }
    }
    
    // Find the most recent/complex step on this line
    // Priority: solved > last layer steps > f2l > cross
    for (const step of currentSteps) {
      if (step.type === 'solved') return { step: 'solved', type: 'solved', colors: step.colors, caseIndex: null, pattern: prevPattern}
    }
    
    // Check for complex LL combinations
    const llSteps = currentSteps.filter(step => step.type === 'last layer');
    const llStepNames = llSteps.map(s => s.step);
    const prevLLSteps = prevSteps.filter(step => step.type === 'last layer').map(s => s.step);
    
    if (llStepNames.includes('ep') && llStepNames.includes('cp') && llStepNames.includes('co') && llStepNames.includes('eo')) {
      return { step: '1lll', type: 'last layer', colors: llSteps[0]?.colors || [], caseIndex: null, pattern: prevPattern  };
    }
    if (llStepNames.includes('ep') && llStepNames.includes('cp') && llStepNames.includes('co')) {
      return { step: 'zbll', type: 'last layer', colors: llSteps[0]?.colors || [], caseIndex: null, pattern: prevPattern  };
    }
    if (llStepNames.includes('eo') && llStepNames.includes('cp') && llStepNames.includes('co')) {
      return { step: 'oll(cp)', type: 'last layer', colors: llSteps[0]?.colors || [], caseIndex: null, pattern: prevPattern  };
    }
    if (llStepNames.includes('eo') && llStepNames.includes('co')) {
      return { step: 'oll', type: 'last layer', colors: llSteps[0]?.colors || [], caseIndex: null, pattern: prevPattern  };
    }
    if (llStepNames.includes('ep') && llStepNames.includes('cp')) {
      return { step: 'pll', type: 'last layer', colors: llSteps[0]?.colors || [], caseIndex: null, pattern: prevPattern  };
    }
    if (llStepNames.includes('co') && llStepNames.includes('cp') && prevLLSteps.includes('eo')) {
      return { step: 'coll', type: 'last layer', colors: llSteps[0]?.colors || [], caseIndex: null, pattern: prevPattern  };
    }
    if (llStepNames.includes('eo') && llStepNames.includes('ep')) {
      return { step: 'ell', type: 'last layer', colors: llSteps[0]?.colors || [], caseIndex: null, pattern: prevPattern  };
    }
    if (llStepNames.includes('co') && llStepNames.includes('cp')) {
      return { step: 'cll', type: 'last layer', colors: llSteps[0]?.colors || [], caseIndex: null, pattern: prevPattern  };
    }
    
    // Individual LL steps
    for (const step of llSteps) {
      if (step.step === 'eo') return { step: '1st look oll', type: 'last layer', colors: step.colors, caseIndex: null, pattern: prevPattern  };
      if (step.step === 'co') return { step: '2nd look oll', type: 'last layer', colors: step.colors, caseIndex: null, pattern: prevPattern  };
      if (step.step === 'cp') return { step: '1st look pll', type: 'last layer', colors: step.colors, caseIndex: null, pattern: prevPattern  };
      if (step.step === 'ep') return { step: '2nd look pll', type: 'last layer', colors: step.colors, caseIndex: null, pattern: prevPattern  };
    }
    
    // F2L pairs
    const f2lSteps = currentSteps.filter(step => step.type === 'f2l');
    if (f2lSteps.length > 1) {
      const uniqueColors = [...new Set(f2lSteps.flatMap(step => step.colors))];
      return { step: 'multislot', type: 'f2l', colors: uniqueColors, caseIndex: null };
    }
    
    // Cross
    const crossSteps = currentSteps.filter(step => step.type === 'cross');
    if (crossSteps.length > 0) return crossSteps[crossSteps.length - 1]; // Return the last cross step
    
    // Return the last step if no special handling
    return currentSteps[currentSteps.length - 1];
  }

  const StepIcon = ({ id, stepInfo, height, index }: { id: string, stepInfo: StepInfo | null; height: number; index: number }) => {
    if (!stepInfo) {
      return (
        <div 
          className="w-full flex items-center justify-center"
          style={{ 
            height: `${height}px`,
            backgroundColor: 'transparent'
          }}
        />
      );
    }

    const getStepColors = (colors: string[]): string[] => {
      // Map color names to their hex values from CUBE_COLORS
      const colorMap: Record<string, string> = {
        'white': CUBE_COLORS.white,
        'yellow': CUBE_COLORS.yellow,
        'green': CUBE_COLORS.green,
        'blue': '#0085FF',
        'red': CUBE_COLORS.red,
        'orange': CUBE_COLORS.orange
      };
      return colors.map(color => colorMap[color.toLowerCase()] || '#888888');
    };

    const getStepIcon = () => {
      const step = stepInfo.step;
      const stepType = stepInfo.type;

      const primaryColors = getStepColors(stepInfo.colors);
      // console.log('Rendering step icon for step:', stepInfo.step, 'with colors:', primaryColors, 'and pattern:', stepInfo.pattern);
      
      if (step === 'cross') {
        return (
          <svg viewBox="0 0 24 24" className="w-full h-full border border-1 border-neutral-600 hover:border-primary-100">
            <rect x="0" y="0" width="8" height="8" fill={'#161018'} />
            <rect x="8" y="0" width="8" height="8" fill={primaryColors[0]} />
            <rect x="16" y="0" width="8" height="8" fill={'#161018'} />
            <rect x="0" y="8" width="8" height="8" fill={primaryColors[0]} />
            <rect x="8" y="8" width="8" height="8" fill={primaryColors[0]} />
            <rect x="16" y="8" width="8" height="8" fill={primaryColors[0]} />
            <rect x="0" y="16" width="8" height="8" fill={'#161018'} />
            <rect x="8" y="16" width="8" height="8" fill={primaryColors[0]} />
            <rect x="16" y="16" width="8" height="8" fill={'#161018'} />
          </svg>
        );
      } else if (step === 'pair') {
        return (
          <svg viewBox="0 0 24 24" className="w-full h-full border border-1 border-neutral-600 hover:border-primary-100">
            <polygon points="0,0 24,0 0,24" fill={primaryColors[0]} />
            <polygon points="24,0 24,24 0,24" fill={primaryColors[1]} />
          </svg>
        );
      } else if (step === 'multislot' && primaryColors.length === 3) {
        return (
          <svg viewBox="0 0 24 24" className="w-full h-full border border-1 border-neutral-600 hover:border-primary-100">
            <rect x="0" y="0" width="8" height="24" fill={primaryColors[0]} />
            <rect x="8" y="0" width="8" height="24" fill={primaryColors[1]} />
            <rect x="16" y="0" width="8" height="24" fill={primaryColors[2]} />
          </svg>
        );
      } else if (step === 'multislot' && primaryColors.length === 4) {
        return (
          <svg viewBox="0 0 24 24" className="w-full h-full border border-1 border-neutral-600 hover:border-primary-100">
            <rect x="0" y="0" width="6" height="24" fill={primaryColors[0]} />
            <rect x="6" y="0" width="6" height="24" fill={primaryColors[1]} />
            <rect x="12" y="0" width="6" height="24" fill={primaryColors[2]} />
            <rect x="18" y="0" width="6" height="24" fill={primaryColors[3]} />
          </svg>
        );
      } else if (stepType === 'last layer' || stepType === 'solved') {
        const pattern = stepInfo.pattern || [];
        const getCellColor = (row: number, col: number): string => {
          if (!pattern[row] || pattern[row][col] === undefined) return '#888888'; // pink for undefined
          const colorNum = pattern[row][col];
          // Grid numbers run 1-6, map directly to cube colors
          const colorMap: Record<number, string> = {
            1: CUBE_COLORS.white,
            2: CUBE_COLORS.yellow,
            3: CUBE_COLORS.green,
            4: '#0085FF', // blue
            5: CUBE_COLORS.red,
            6: CUBE_COLORS.orange
          };
          return colorMap[colorNum] || '#888888';
        };

        return (
          <svg viewBox="0 0 24 24" className="w-full h-full border border-1 border-neutral-600 hover:border-primary-100">
            {/* Row 0 - all outer ring (height 3) */}
            <rect x="0" y="0" width="3" height="3" fill={getCellColor(0, 0)} />
            <rect x="3" y="0" width="6" height="3" fill={getCellColor(0, 1)} />
            <rect x="9" y="0" width="6" height="3" fill={getCellColor(0, 2)} />
            <rect x="15" y="0" width="6" height="3" fill={getCellColor(0, 3)} />
            <rect x="21" y="0" width="3" height="3" fill={getCellColor(0, 4)} />
            
            {/* Row 1 - outer (width 3), inner (6x6), outer (width 3) */}
            <rect x="0" y="3" width="3" height="6" fill={getCellColor(1, 0)} />
            <rect x="3" y="3" width="6" height="6" fill={getCellColor(1, 1)} />
            <rect x="9" y="3" width="6" height="6" fill={getCellColor(1, 2)} />
            <rect x="15" y="3" width="6" height="6" fill={getCellColor(1, 3)} />
            <rect x="21" y="3" width="3" height="6" fill={getCellColor(1, 4)} />
            
            {/* Row 2 - outer (width 3), inner (6x6), outer (width 3) */}
            <rect x="0" y="9" width="3" height="6" fill={getCellColor(2, 0)} />
            <rect x="3" y="9" width="6" height="6" fill={getCellColor(2, 1)} />
            <rect x="9" y="9" width="6" height="6" fill={getCellColor(2, 2)} />
            <rect x="15" y="9" width="6" height="6" fill={getCellColor(2, 3)} />
            <rect x="21" y="9" width="3" height="6" fill={getCellColor(2, 4)} />
            
            {/* Row 3 - outer (width 3), inner (6x6), outer (width 3) */}
            <rect x="0" y="15" width="3" height="6" fill={getCellColor(3, 0)} />
            <rect x="3" y="15" width="6" height="6" fill={getCellColor(3, 1)} />
            <rect x="9" y="15" width="6" height="6" fill={getCellColor(3, 2)} />
            <rect x="15" y="15" width="6" height="6" fill={getCellColor(3, 3)} />
            <rect x="21" y="15" width="3" height="6" fill={getCellColor(3, 4)} />
            
            {/* Row 4 - all outer ring (height 3) */}
            <rect x="0" y="21" width="3" height="3" fill={getCellColor(4, 0)} />
            <rect x="3" y="21" width="6" height="3" fill={getCellColor(4, 1)} />
            <rect x="9" y="21" width="6" height="3" fill={getCellColor(4, 2)} />
            <rect x="15" y="21" width="6" height="3" fill={getCellColor(4, 3)} />
            <rect x="21" y="21" width="3" height="3" fill={getCellColor(4, 4)} />
          </svg>
        );
      } else {
        return (
          <svg viewBox="0 0 24 24" className="w-full h-full p-1">
            <circle cx="12" cy="12" r="6" fill={primaryColors[0]} opacity="0.5" />
          </svg>
        );
      }
    };

    return (
      <div className="relative group w-full h-full">
        <div
          id={id}
          className="w-full flex items-center justify-center"
          style={{ 
            height: `${height}px`
          }}
        >
          {getStepIcon()}
        </div>
        <div className="flex flex-col absolute right-full top-1/2 -translate-y-1/2 mr-2 whitespace-nowrap text-primary-100 bg-primary-900 rounded-md text-sm opacity-0 group-hover:opacity-100 group-hover:delay-100 pointer-events-none select-none z-50 px-2 py-1">
          <div>{stepInfo.step}</div>
          {stepInfo.colors.length > 0 && (
            <div className="text-xs opacity-80">{stepInfo.colors.join(', ')}</div>
          )}
        </div>
      </div>
    );
  };

  // console.log('solution lines:', solutionLines);
  // console.log('line steps:', lineSteps);

  return (
    <div className="flex flex-col items-center justify-start w-[28.4px] pt-1 border-none">
      {solutionLines.map((line, index) => {
        const isWhitespace = line.trim() === '';
                
        // Calculate line wraps based on div height (with wiggle room)
        const rawDivHeight = divHeights[index]?.height || 28;
        const lineWraps = Math.round((rawDivHeight + 5) / 28); // +5px wiggle room
        const calculatedHeight = lineWraps * 28.4; // 30px is just a guess

        const hoverHeight = Math.max(42, calculatedHeight);

        const compiledStepInfo = getLineStepInfo(index);
        
        return (
          <div
            key={index}
            className={`
              w-[28.4px]
              transition-all duration-300 ease-in-out border-none
              hover:z-20
              ${index > 0 ? '' : 'mt-[4px]'}
            `}
            style={{
              height: `${calculatedHeight}px`
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.height = `${hoverHeight}px`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.height = `${calculatedHeight}px`;
            }}
          >
            {!isWhitespace ? (
              <StepIcon
                id={`step-icon-${index}-${compiledStepInfo?.step || 'empty'}`}
                stepInfo={compiledStepInfo}
                height={calculatedHeight}
                index={index}
              />
            ) : (
              <div 
                className="w-full"
                style={{ 
                  height: `${calculatedHeight}px`,
                  backgroundColor: 'transparent'
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default React.memo(ImageStack);