import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import debounce from 'lodash.debounce';
import type { StepInfo } from '../../composables/recon/SimpleCubeInterpreter';
import { useSyncedSettings, ICON_SIZE_CONFIG, type CubeColors } from '../../composables/useSettings';
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

export interface LineIconDatum {
  line: string;
  isWhitespace: boolean;
  compiledStepInfo: StepInfo | null;
  descriptor: IconDescriptor | null;
  isEmptyIcon: boolean;
}

export const buildIconColorConfig = (cubeColors: CubeColors): ColorConfig => ({
  up: cubeColors.up,
  down: cubeColors.down,
  front: cubeColors.front,
  back: cubeColors.back,
  right: cubeColors.right,
  left: cubeColors.left,
  gray: '#888888',
  darkBg: '#161018',
});

export const getCrossBg = (crossColor: string) =>
  isColorDark(crossColor) ? '#ECE6EF' : '#161018';

export function computeLineIconData(
  solutionLines: string[],
  lineSteps: StepInfo[][] | null,
  cubeColors: CubeColors,
): LineIconDatum[] {
  const colorConfig = buildIconColorConfig(cubeColors);

  return solutionLines.map((line, index) => {
    const isWhitespace = line.trim() === '';
    const currentSteps = lineSteps?.[index] || [];
    const prevSteps = lineSteps?.slice(0, index).flat() || [];
    const { stepInfo: compiledStepInfo, hasEO } = getLineStepInfo(currentSteps, prevSteps);
    const eoColor = hasEO ? cubeColors.eo : undefined;
    const descriptor = !isWhitespace && compiledStepInfo
      ? getStepIconDescriptor(colorConfig, compiledStepInfo, { getCrossBg, eoColor })
      : null;
    const isEmptyIcon = !descriptor || (descriptor.shapes.length === 0 && !descriptor.eoBorderColor);
    return { line, isWhitespace, compiledStepInfo, descriptor, isEmptyIcon };
  });
}

const renderShape = (shape: SvgShape, i: number) => {
  if (shape.type === 'rect') return <rect key={i} x={shape.x} y={shape.y} width={shape.width} height={shape.height} fill={shape.fill} />;
  if (shape.type === 'polygon') return <polygon key={i} points={shape.points} fill={shape.fill} />;
  return <circle key={i} cx={shape.cx} cy={shape.cy} r={shape.r} fill={shape.fill} />;
};

export function StepIconSvg({ descriptor: desc, nameType }: { descriptor: IconDescriptor; nameType?: string }) {
  const [, , vw, vh] = desc.viewBox.split(' ').map(Number);

  return (
    <svg
      viewBox={desc.viewBox}
      className={`step-icon-svg w-full border ${desc.eoBorderColor ? 'border-2' : 'border border-neutral-600'}`}
      style={desc.eoBorderColor ? { borderColor: desc.eoBorderColor } : undefined}
      stroke="#52525b"
      strokeWidth="1"
      fill="none"
    >
      {desc.shapes.map(renderShape)}
      {desc.label && (
        <text
          x={vw / 2}
          y={vh / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fill={desc.label.color}
          stroke="none"
          fontSize={desc.label.fontSize}
          fontWeight={desc.label.fontWeight}
          fontFamily="var(--font-Rubik), system-ui, sans-serif"
        >
          {desc.label.text}
        </text>
      )}
      {desc.name && !desc.label && (
        <title>{nameType ? `${nameType.toUpperCase()} ${desc.name}` : desc.name}</title>
      )}
    </svg>
  );
}

interface IconStackProps {
  position: [number, number, number] | null;
  moves: string[][][] | null;
  lineIconData: LineIconDatum[];
  editableElement?: HTMLElement | null;
  zoomLayerHost?: HTMLElement | null;
}

const IconStack = ({position, moves, lineIconData, editableElement, zoomLayerHost}: IconStackProps) => {
  const { settings } = useSyncedSettings();
  const { lineHeight: iconLineHeight, iconWidth } = ICON_SIZE_CONFIG['medium'];

  const [, forceRender] = useState({});
  const [zoomedIndex, setZoomedIndex] = useState<number | null>(null);
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

  const lineData = lineIconData.map((iconDatum, index) => {
    const rawDivHeight = divHeights[index]?.height || iconLineHeight;
    const lineWraps = Math.round((rawDivHeight + 5) / iconLineHeight);
    const calculatedHeight = lineWraps * iconLineHeight;
    const hasIcon = !iconDatum.isWhitespace && !iconDatum.isEmptyIcon;
    return { ...iconDatum, calculatedHeight, hasIcon };
  });

  const hasIconBelowZoomed = zoomedIndex !== null && !!lineData[zoomedIndex + 1]?.hasIcon;
  const zoomGrowth = hasIconBelowZoomed ? iconLineHeight : 0;
  const shrinkingRowIndex = hasIconBelowZoomed
    ? lineData.findIndex((row, index) => index > zoomedIndex && !row.hasIcon)
    : -1;

  const renderRows = (isZoomLayer: boolean) => lineData.map(({ isWhitespace, calculatedHeight, hasIcon, compiledStepInfo, descriptor, isEmptyIcon }, index) => {
    const isZoomed = hasIcon && zoomedIndex === index;
    const isPointerTarget = hasIcon && !isZoomLayer;
    const heightChange = isZoomed ? zoomGrowth : index === shrinkingRowIndex ? -zoomGrowth : 0;

    return (
      <div
        key={index}
        className={`
          ${isZoomed ? 'step-icon-zoomed' : ''} ${heightChange !== 0 ? 'step-icon-resized' : ''}
          transition-[height] duration-300 ease-in-out border-none
          ${index > 0 ? '' : 'mt-1'}
        `}
        style={{
          width: `${iconWidth}px`,
          height: `${calculatedHeight}px`,
          '--zoom-height': `${calculatedHeight + heightChange}px`,
        } as React.CSSProperties}
        onPointerEnter={isPointerTarget ? () => setZoomedIndex(index) : undefined}
        onPointerLeave={isPointerTarget ? () => setZoomedIndex(current => current === index ? null : current) : undefined}
      >
        {!isWhitespace ? (
          <StepIcon
            id={isZoomLayer ? undefined : `step-icon-${index}-${compiledStepInfo?.step || 'empty'}`}
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
  });

  const stackClassName = 'flex flex-col items-center justify-start pt-1 border-none';

  return (
    <>
      <div className={stackClassName} style={{ width: `${iconWidth}px` }}>
        {renderRows(false)}
      </div>
      {/* drawn outside the scroll box so the zoom isn't clipped. It follows the scroll through --solution-scroll-top. */}
      {zoomLayerHost && createPortal(
        <div className="icon-zoom-layer absolute left-0 top-0 h-full z-10 pointer-events-none" style={{ width: `${iconWidth}px` }}>
          <div
            className={stackClassName}
            style={{ width: `${iconWidth}px`, transform: 'translateY(calc(-1 * var(--solution-scroll-top, 0px)))' }}
          >
            {renderRows(true)}
          </div>
        </div>,
        zoomLayerHost
      )}
    </>
  );
}

function StepIcon({ id, stepInfo, descriptor, height }: { id?: string, stepInfo: StepInfo | null; descriptor: IconDescriptor | null; height: number }) {
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

  return (
    <div className="relative group w-full h-full overflow-visible">
      <div
        id={id}
        className="step-icon-inner w-full flex items-center justify-center overflow-visible"
        style={{
          height: `${height}px`
        }}
      >
        <StepIconSvg descriptor={descriptor} nameType={stepInfo?.nameType} />
      </div>
    </div>
  );
}

export default React.memo(IconStack);