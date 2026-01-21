import { useSyncedSettings } from '../../composables/useSettings';
import React, { JSX } from 'react';

interface SuggestionCardProps {
  alg: string;
  steps: string[];
  id: string;
  isFocused: boolean;
  handleSuggestionRequest: () => void;
  handleSuggestionAccept: () => void;
}

const extractF2LColors = (step: string, letterToColor: Record<string, string>): string[] => {
  const prefix = step.split(' ')[0] ?? '';
  const letters = prefix.replace(/[^A-Za-z]/g, '').toUpperCase();

  const mapped = letters
    .split('')
    .map(letter => letterToColor[letter])
    .filter((color): color is string => Boolean(color));

  const uniqueColors = mapped.filter((color, index) => mapped.indexOf(color) === index);

  return uniqueColors;
};

const renderPairIcon = (colors: string[], defaultColors: string[]): JSX.Element => {
  const [first, second] = colors.length >= 2 ? colors : defaultColors;

  return (
    <svg viewBox="0 0 24 24" className="border border-neutral-600">
      <polygon points="0,0 24,0 0,24" fill={first} />
      <polygon points="24,0 24,24 0,24" fill={second} />
    </svg>
  );
};

const renderMultislotIcon = (colors: string[], defaultColors: string[]): JSX.Element => {
  const palette = colors.length >= 3 ? colors : defaultColors;

  if (palette.length >= 4) {
    return (
      <svg viewBox="0 0 24 24" className="border border-neutral-600">
        <rect x="0" y="0" width="6" height="24" fill={palette[0]} />
        <rect x="6" y="0" width="6" height="24" fill={palette[1]} />
        <rect x="12" y="0" width="6" height="24" fill={palette[2]} />
        <rect x="18" y="0" width="6" height="24" fill={palette[3]} />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="border border-neutral-600">
      <rect x="0" y="0" width="8" height="24" fill={palette[0]} />
      <rect x="8" y="0" width="8" height="24" fill={palette[1]} />
      <rect x="16" y="0" width="8" height="24" fill={palette[2]} />
    </svg>
  );
};

const renderTextIcon = (label: string): JSX.Element => (
  <div className="border border-neutral-600 text-primary-100 p-[2px] bg-dark flex items-center align-middle justify-center text-xs font-semibold uppercase">
    {label || '?'}
  </div>
);

const renderStepIcon = (steps: string[], letterToColor: Record<string, string>, defaultPairColors: string[], defaultMultislotColors: string[]): JSX.Element => {
  if (steps.length === 0) {
    return renderTextIcon('?');
  }

  // Extract all colors from all steps
  const allColors = steps.flatMap(step => extractF2LColors(step, letterToColor));
  const uniqueColors = allColors.filter((color, index) => allColors.indexOf(color) === index);

  // Check if any step contains 'pair' or 'multislot'
  const hasPair = steps.some(step => step.toLowerCase().includes('pair'));
  const hasMultislot = steps.some(step => step.toLowerCase().includes('multislot'));

  if (hasMultislot || uniqueColors.length >= 3) {
    return renderMultislotIcon(uniqueColors.length >= 3 ? uniqueColors.slice(0, 4) : defaultMultislotColors, defaultMultislotColors);
  }

  if (hasPair || uniqueColors.length === 2) {
    return renderPairIcon(uniqueColors.length >= 2 ? uniqueColors.slice(0, 2) : defaultPairColors, defaultPairColors);
  }

  // Default to text icon using the first step
  return renderTextIcon(steps[0] || '?');
};

export const SuggestionCard = ({ alg, steps, id, isFocused, handleSuggestionRequest, handleSuggestionAccept }: SuggestionCardProps) => {
  const { settings } = useSyncedSettings();
  const { cubeColors } = settings;

  // Create dynamic color mapping based on current cube colors
  const letterToColor: Record<string, string> = {
    W: cubeColors.up,      // white/up
    Y: cubeColors.down,    // yellow/down
    G: cubeColors.front,   // green/front
    B: cubeColors.back,    // blue/back
    R: cubeColors.right,   // red/right
    O: cubeColors.left,    // orange/left
  };

  const defaultPairColors: string[] = [cubeColors.front, cubeColors.left];
  const defaultMultislotColors: string[] = [cubeColors.front, cubeColors.back, cubeColors.right, cubeColors.left];

  const icon = renderStepIcon(steps, letterToColor, defaultPairColors, defaultMultislotColors);

  return (
    <div 
      className={
        `hover:bg-primary-100 hover:shadow-md
        flex flex-row items-center gap-3 border border-neutral-300 bg-primary-200 text-dark text-md p-1`
      }
      onMouseOver={handleSuggestionRequest}
      onClick={handleSuggestionAccept}
      id={id}
      tabIndex={0}
    >
      <div className="w-6 h-6"> 
        {icon}
      </div>
      <div className="flex-grow">{alg}</div>
    </div>
  );
};

export default SuggestionCard;
