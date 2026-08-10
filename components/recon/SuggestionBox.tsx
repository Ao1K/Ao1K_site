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
  handleSuggestionRequest: (index: number) => void;
  handleSuggestionAccept: () => void;
  handleSuggestionReject: () => void;
}

export const SuggestionBox = ({suggestions, selectedOriginalIndex, topOffset, leftOffset, handleSuggestionRequest, handleSuggestionAccept, handleSuggestionReject }: SuggestionBoxProps) => {
  const foundIndex = suggestions.findIndex((item) => item.originalIndex === selectedOriginalIndex);
  const selectedIndex = foundIndex === -1 ? 0 : foundIndex;

  const navigationStateRef = useRef({ suggestions, selectedIndex, handleSuggestionRequest });
  navigationStateRef.current = { suggestions, selectedIndex, handleSuggestionRequest };

  const focusHoveredElement = (index: number) => {
    if (!suggestions[index]) return;
    handleSuggestionRequest(suggestions[index].originalIndex);
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // tab event handled by parent component
      const { suggestions: current, selectedIndex: currentIndex, handleSuggestionRequest: request } = navigationStateRef.current;
      if (!current.length) return;

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        request(current[(currentIndex + 1) % current.length].originalIndex);
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        request(current[(currentIndex - 1 + current.length) % current.length].originalIndex);
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
            handleSuggestionRequest={() => focusHoveredElement(index)}
            handleSuggestionAccept={handleSuggestionAccept}
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
        onClick={handleSuggestionReject}>
          Cancel
        { !isTouchScreen ? (
        <img src="/esc.svg" alt="Esc" className='mb-0.5 border border-dark'/>
        ) : null}
      </div>
    }
    </div>
  );
};