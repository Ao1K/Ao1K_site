import { useSyncedSettings } from '../../composables/useSettings';
import { useAlgFavorites } from '../../composables/algs/algFavorites';
import type { Algset } from '../../composables/recon/SimpleCubeInterpreter';
import { showToast } from '../../composables/toast';
import { splitLeadingAuf } from '../../utils/collapseAufVariants';
import Parrot from '../icons/parrot';
import KeyboardKeeper from './KeyboardKeeper';
import Link from 'next/link';
import React, { JSX, useRef, useState } from 'react';

interface SuggestionCardProps {
  alg: string;
  steps: string[];
  id: string;
  placement: string;
  isFocused: boolean;
  hasEOsolved?: boolean;
  algset?: Algset;
  onSelect: () => void;
  onAccept: () => void;
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

const renderPairIcon = (colors: string[], defaultColors: string[], eoColor?: string): JSX.Element => {
  const [first, second] = colors.length >= 2 ? colors : defaultColors;

  return (
    <svg viewBox="0 0 24 24" style={eoColor ? { border: `2px solid ${eoColor}` } : undefined} className={eoColor ? undefined : "border border-neutral-600"}>
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
  <div className="border border-neutral-600 text-primary-100 p-0.5 bg-dark flex items-center align-middle justify-center text-xs font-semibold uppercase">
    {label || '?'}
  </div>
);

const renderStepIcon = (steps: string[], letterToColor: Record<string, string>, defaultPairColors: string[], defaultMultislotColors: string[], hasPair: boolean, hasMultislot: boolean, eoColor?: string): JSX.Element => {
  if (steps.length === 0) {
    return renderTextIcon('?');
  }

  // Extract all colors from all steps
  const allColors = steps.flatMap(step => extractF2LColors(step, letterToColor));
  const uniqueColors = allColors.filter((color, index) => allColors.indexOf(color) === index);

  if (hasMultislot || uniqueColors.length >= 3) {
    return renderMultislotIcon(uniqueColors.length >= 3 ? uniqueColors.slice(0, 4) : defaultMultislotColors, defaultMultislotColors);
  }

  if (hasPair || uniqueColors.length === 2) {
    return renderPairIcon(uniqueColors.length >= 2 ? uniqueColors.slice(0, 2) : defaultPairColors, defaultPairColors, eoColor);
  }

  // Default to text icon using the first step
  return renderTextIcon(steps[0] || '?');
};

export const SuggestionCard = ({ alg, steps, id, placement, isFocused, hasEOsolved, algset, onSelect, onAccept }: SuggestionCardProps) => {
  const { settings } = useSyncedSettings();
  const { cubeColors } = settings;

  const { isFavorite, toggleFavorite } = useAlgFavorites();

  // WARNING: This could cause problems if we ever have a step type where AUFs have significant meaning
  // Would also need to change algFavorites.ts, since AUF is stripped out there as well
  const favoriteAlg = splitLeadingAuf(alg).coreKey || alg;

  const favorited = isFavorite(favoriteAlg);

  const [animating, setAnimating] = useState(false);
  const keeperRef = useRef<HTMLSpanElement>(null);
  const activationPointerType = useRef<string | null>(null);

  const focusKeyboardKeeper = () => {
    keeperRef.current?.focus();
  };

  const handleFavoritePointerDown = (event: React.PointerEvent) => {
    activationPointerType.current = event.pointerType;
  };

  const handleFavoriteClick = (event: React.MouseEvent) => {
    event.stopPropagation();

    const pointerType = activationPointerType.current;
    activationPointerType.current = null;
    if (pointerType === 'touch' || pointerType === 'pen') {
      focusKeyboardKeeper();
    }

    toggleFavorite(favoriteAlg, algset);
    if (favorited) return;

    setAnimating(true);
    showToast({
      dismissKey: 'alg-added-to-your-algs',
      addMethod: 'replace',
      closable: false,
      icon: <Parrot filled className="w-6 h-6 text-primary-800" />,
      message: (
        <span>
          {favoriteAlg} added to{' '}
          <Link href="/algs/" className="text-primary-800 underline hover:no-underline">
            Your Algs
          </Link>
        </span>
      ),
    });
  };

  const blockCardHoverSelect = (event: React.MouseEvent) => event.stopPropagation();

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
  const eoColor = hasEOsolved ? cubeColors.eo : undefined;
  const hasPair = steps.some(step => step.toLowerCase().includes('pair'));
  const hasMultislot = steps.some(step => step.toLowerCase().includes('multislot'));

  const icon = renderStepIcon(steps, letterToColor, defaultPairColors, defaultMultislotColors, hasPair, hasMultislot, eoColor);

  return (
    <div
      className={
        `group relative flex flex-row items-center gap-3 border text-dark text-md p-1
        ${isFocused ? 'bg-primary-100 shadow-md border-primary-100' : 'bg-primary-200 border-neutral-400'}
        ${placement === '0'  ? 'rounded-t-sm' : ''}
        ${placement === 'last' ? 'rounded-br-sm' : ''}
        ${placement === 'only' ? 'rounded-t-sm rounded-br-sm' : ''}
        `
      }
      onMouseOver={onSelect}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onAccept}
      id={id}
      tabIndex={0}
    >
      <KeyboardKeeper ref={keeperRef} />
      {hasPair || hasMultislot ? 
      <div className="w-6 h-6">
        {icon}
      </div>
      :
      <div className="w-fit h-6">
        {icon}
      </div>
      }
      <div className="grow">{alg}</div>
      <button
        type="button"
        aria-label={favorited ? 'Unfavorite alg' : 'Favorite alg'}
        title={favorited ? 'Unfavorite alg' : 'Favorite alg'}
        aria-pressed={favorited}
        className={`shrink-0 p-2 -m-2 text-neutral-500 hover:text-primary-800 transition-opacity
          group-hover:opacity-100 pointer-coarse:opacity-100 ${favorited ? 'opacity-100' : 'opacity-0'}`}
        onMouseOver={blockCardHoverSelect}
        onPointerDown={handleFavoritePointerDown}
        onClick={handleFavoriteClick}
      >
        <Parrot
          filled={favorited}
          animating={animating}
          onAnimationEnd={(event) => { if (event.animationName === 'parrot-squawk') setAnimating(false); }}
          className="w-6 h-6"
        />
      </button>
    </div>
  );
};

export default SuggestionCard;
