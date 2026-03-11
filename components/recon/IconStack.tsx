import React, { useRef, useState, useEffect, useMemo } from 'react';
import debounce from 'lodash.debounce';
import type { StepInfo } from '../../composables/recon/SimpleCubeInterpreter';
import { useSyncedSettings, ICON_SIZE_CONFIG } from '../../composables/useSettings';
import { getLineStepInfo } from '../../composables/recon/getLineStepInfo';
import { getStepIconDescriptor, type ColorConfig, type IconDescriptor, type SvgShape } from '@/composables/recon/stepIconDescriptors';

// Helper to determine if a color is dark (needs light background)
function isColorDark(hexColor: string): boolean {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  // Using relative luminance formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.5;
}

interface IconStackProps {
  position: [number, number, number] | null;
  moves: string[][][] | null;
  lineSteps: StepInfo[][] | null;
  editableElement?: HTMLElement | null;
}

const IconStack = ({position, moves, lineSteps, editableElement}: IconStackProps) => {
  // const scramble = moves?.[0]?.map((move) => move.join(' ')).join(' ') || '';
  const solutionLines = moves?.[1]?.map((move) => move.join(' ')) || [''];

  const { settings } = useSyncedSettings();
  const cubeColors = settings.cubeColors;
  const { lineHeight: iconLineHeight, iconWidth } = ICON_SIZE_CONFIG[settings.iconSize];
  
  const [, forceRender] = useState({});
  const observerRef = useRef<ResizeObserver | null>(null);
  const prevHeightsRef = useRef<string>('');

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
        const newHeights = JSON.stringify(getCurrentDivHeights(editableElement));
        if (newHeights !== prevHeightsRef.current) {
          prevHeightsRef.current = newHeights;
          forceRender({});
        }
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

  const colorConfig: ColorConfig = useMemo(() => ({
    up: cubeColors.up,
    down: cubeColors.down,
    front: cubeColors.front,
    back: cubeColors.back,
    right: cubeColors.right,
    left: cubeColors.left,
    gray: '#888888',
    darkBg: '#161018',
  }), [cubeColors]);

  const getCrossBg = (crossColor: string) =>
    isColorDark(crossColor) ? '#ECE6EF' : '#161018';

  const renderShape = (shape: SvgShape, i: number) => {
    if (shape.type === 'rect') return <rect key={i} x={shape.x} y={shape.y} width={shape.width} height={shape.height} fill={shape.fill} />;
    if (shape.type === 'polygon') return <polygon key={i} points={shape.points} fill={shape.fill} />;
    return <circle key={i} cx={shape.cx} cy={shape.cy} r={shape.r} fill={shape.fill} />;
  };

  const descriptorToJsx = (desc: IconDescriptor, showNameAsText?: boolean, nameType?: string) => {
    const [, , vw, vh] = desc.viewBox.split(' ').map(Number);

    return (
      <svg
        viewBox={desc.viewBox}
        className={`step-icon-svg w-full border ${desc.eoBorderColor ? 'border-2' : 'border border-1 border-neutral-600'}`}
        style={desc.eoBorderColor ? { borderColor: desc.eoBorderColor } : undefined}
        stroke="#52525b"
        strokeWidth="1"
        fill="none"
      >
        {desc.shapes.map(renderShape)}
        {desc.name && showNameAsText && (
          <text
            x={vw / 2}
            y={vh / 2}
            textAnchor="middle"
            dominantBaseline="central"
            fill={desc.nameColor || '#ECE6EF'}
            stroke="none"
            fontSize={desc.name.length <= 2 ? 10 : 8}
            fontWeight="bold"
            fontFamily="var(--font-Rubik), system-ui, sans-serif"
          >
            {desc.name}
          </text>
        )}
        {desc.name && !showNameAsText && (
          <title>{nameType ? `${nameType} ${desc.name}` : desc.name}</title>
        )}
      </svg>
    );
  };

  const StepIcon = ({ id, stepInfo, descriptor, height }: { id: string, stepInfo: StepInfo | null; descriptor: IconDescriptor | null; height: number }) => {
    if (!descriptor) {
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

    // PLL-type steps show name as text overlay; others show as hover tooltip
    const showNameAsText = stepInfo?.nameType === 'pll';

    return (
      <div className="relative group w-full h-full overflow-visible">
        <div
          id={id}
          className="step-icon-inner w-full flex items-center justify-center overflow-visible transform transition-transform duration-300 ease-out origin-top-right"
          style={{
            height: `${height}px`
          }}
        >
          {descriptorToJsx(descriptor, showNameAsText, stepInfo?.nameType)}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center justify-start pt-1 border-none" style={{ width: `${iconWidth}px` }}>
      {solutionLines.map((line, index) => {
        const isWhitespace = line.trim() === '';

        // Calculate line wraps based on div height (with wiggle room)
        const rawDivHeight = divHeights[index]?.height || iconLineHeight;
        const lineWraps = Math.round((rawDivHeight + 5) / iconLineHeight); // +5px wiggle room
        const calculatedHeight = lineWraps * iconLineHeight;

        // 2x group-hover scale
        const hoverHeight = Math.max(iconLineHeight * 2, calculatedHeight);

        const currentSteps = lineSteps?.[index] || [];
        const prevSteps = lineSteps?.slice(0, index).flat() || [];
        const { stepInfo: compiledStepInfo, hasEO } = getLineStepInfo(currentSteps, prevSteps);

        // compute descriptor once for non-whitespace lines
        const eoColor = hasEO ? cubeColors.eo : undefined;
        const descriptor = !isWhitespace && compiledStepInfo
          ? getStepIconDescriptor(colorConfig, compiledStepInfo, { getCrossBg, eoColor })
          : null;

        // completely empty icon (no shapes, no EO border) — skip hover
        const isEmptyIcon = !descriptor || (descriptor.shapes.length === 0 && !descriptor.eoBorderColor);
        const enableHover = !isWhitespace && !isEmptyIcon;

        return (
          <div
            key={index}
            className={`
              ${enableHover ? 'step-icon-hover' : ''} transition-[height] duration-300 ease-in-out border-none
              ${index > 0 ? '' : 'mt-[4px]'}
            `}
            style={{
              width: `${iconWidth}px`,
              height: `${calculatedHeight}px`,
              '--hover-height': `${hoverHeight}px`,
            } as React.CSSProperties}
          >
            {!isWhitespace ? (
              <StepIcon
                id={`step-icon-${index}-${compiledStepInfo?.step || 'empty'}`}
                stepInfo={compiledStepInfo}
                descriptor={isEmptyIcon ? null : descriptor}
                height={calculatedHeight}
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

export default React.memo(IconStack);