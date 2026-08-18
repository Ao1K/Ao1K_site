'use client';

import type { Suggestion } from '../../composables/recon/SimpleCubeInterpreter';
import SuggestionCard from './SuggestionCard';
import { useEffect, useRef } from 'react';

interface SuggestionBoxSuggestion {
  suggestion: Suggestion;
  originalIndex: number;
}

interface SuggestionBoxProps {
  suggestions: SuggestionBoxSuggestion[];
  selectedOriginalIndex: number | null;
  topOffset: number;
  leftOffset: number;
  onSelect: (originalIndex: number) => void;
  onAccept: (originalIndex: number) => void;
  onReject: () => void;
}

export const SuggestionBox = ({suggestions, selectedOriginalIndex, topOffset, leftOffset, onSelect, onAccept, onReject }: SuggestionBoxProps) => {
  const foundIndex = suggestions.findIndex((item) => item.originalIndex === selectedOriginalIndex);
  const selectedIndex = foundIndex === -1 ? 0 : foundIndex;

  const navigationStateRef = useRef({ suggestions, selectedIndex, onSelect });
  navigationStateRef.current = { suggestions, selectedIndex, onSelect };

  const selectAtIndex = (index: number) => {
    if (!suggestions[index]) return;
    onSelect(suggestions[index].originalIndex);
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // tab event handled by parent component
      const { suggestions: current, selectedIndex: currentIndex, onSelect: select } = navigationStateRef.current;
      if (!current.length) return;

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        select(current[(currentIndex + 1) % current.length].originalIndex);
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        select(current[(currentIndex - 1 + current.length) % current.length].originalIndex);
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const isTouchScreen = typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0;

  return (
    <div
      id="suggestion-box"
      className="absolute z-40 flex flex-col"
      style={{
        top: `min(calc(${topOffset}px - var(--solution-scroll-top, 0px)), 100%)`,
        left: leftOffset,
      }}
    >
    {
      suggestions.map((item, index) => {
        const isLast = index === suggestions.length - 1;
        const isOnly = suggestions.length === 1;
        let placement = `${index}`;
        if (isOnly) {
          placement = 'only';
        } else if (isLast) {
          placement = 'last';
        }
        return (
          <SuggestionCard
            key={index}
            id={`suggestion-card-${index}`}
            placement={placement}
            isFocused={selectedIndex === index}
            alg={item.suggestion.alg}
            steps={item.suggestion.steps}
            hasEOsolved={item.suggestion.hasEOsolved}
            algset={item.suggestion.algset}
            onSelect={() => selectAtIndex(index)}
            onAccept={() => onAccept(item.originalIndex)}
          />
        )
      })
    }
    { suggestions.length < 1 ?
      null :
      <div className={`
        hover:bg-primary-200 hover:shadow-md
        flex flex-row items-center gap-3 w-fit border-t-dark
        border rounded-b-sm border-neutral-400 bg-primary-300 text-dark text-md p-1
        ${isTouchScreen ? 'min-w-25 justify-center' : 'w-fit'}`}
        onClick={onReject}>
          Cancel
        { !isTouchScreen ? (
        <img src="/esc.svg" alt="Esc" className='mb-0.5 border border-dark'/>
        ) : null}
      </div>
    }
    </div>
  );
};