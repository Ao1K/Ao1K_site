'use client';

// order cards first by steps, then colors, then speed
import type { Suggestion } from '../../composables/recon/SimpleCubeInterpreter';
import SuggestionCard from './SuggestionCard';
import { useEffect, useRef } from 'react';

interface SuggestionBoxSuggestion {
  suggestion: Suggestion;
  originalIndex: number;
}

interface SuggestionBoxProps {
  suggestions: SuggestionBoxSuggestion[];
  topOffset: number;
  leftOffset: number;
  handleSuggestionRequest: (index: number) => void;
  handleSuggestionAccept: () => void;
  handleSuggestionReject: () => void;
}

const sortSuggestions = (items: SuggestionBoxSuggestion[]) => {
  // 1. group by unique (name, step)
  const groups = new Map<string, SuggestionBoxSuggestion[]>()

  for (const item of items) {
    const step = item.suggestion.steps[0] || '';
    const name = item.suggestion.name ?? "";
    const key = `${name}:::${step}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(item)
  }

  // 2. sort each group by originalIndex to preserve logic-layer ordering (frequency for LL, time for F2L)
  const sortedGroups = Array.from(groups.values()).map(group =>
    group.sort((a, b) => a.originalIndex - b.originalIndex)
  )

  // 3. sort the groups by the originalIndex of their first element
  sortedGroups.sort((a, b) => a[0].originalIndex - b[0].originalIndex)

  return sortedGroups.flat()
};

export const SuggestionBox = ({suggestions, topOffset, leftOffset, handleSuggestionRequest, handleSuggestionAccept, handleSuggestionReject }: SuggestionBoxProps) => {
  const sortedSuggestions = sortSuggestions(suggestions);
  const selectedCardRef = useRef<number | null>(null);
  
  const selectCard = (index: number) => {
    const cardElement = document.getElementById(`suggestion-card-${index}`);
    cardElement?.focus();
    selectedCardRef.current = index;
  }
  if (selectedCardRef.current === null && sortedSuggestions.length > 0) {
    selectCard(0);
  }
  
  const handleKeyDown = (event: KeyboardEvent) => {

    // tab event handled by parent component
    
    if (event.key === 'ArrowDown') {
      if (!sortedSuggestions.length) return;
      event.preventDefault();
      if (selectedCardRef.current === null) {
        selectCard(0);
      } else {
        const nextIndex = (selectedCardRef.current + 1) % sortedSuggestions.length;
        selectCard(nextIndex);
        handleSuggestionRequest(sortedSuggestions[nextIndex].originalIndex);
      }
    }
    if (event.key === 'ArrowUp') {
      if (!sortedSuggestions.length) return;
      event.preventDefault();
      if (selectedCardRef.current === null) {
        selectCard(sortedSuggestions.length - 1);
      } else {
        const prevIndex = (selectedCardRef.current - 1 + sortedSuggestions.length) % sortedSuggestions.length;
        selectCard(prevIndex);
        handleSuggestionRequest(sortedSuggestions[prevIndex].originalIndex);
      }
    }
  };

  const focusHoveredElement = (index: number) => {
    if (!sortedSuggestions[index]) return;
    selectCard(index);
    handleSuggestionRequest(sortedSuggestions[index].originalIndex);
  }

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    if (sortedSuggestions.length > 0) {
      handleSuggestionRequest(sortedSuggestions[0].originalIndex);
    }
    if (selectedCardRef.current === null && sortedSuggestions.length > 0) {
      selectCard(0);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  if (selectedCardRef.current === null) selectedCardRef.current = 0;

  const isTouchScreen = typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0;

  return (
    <div className="absolute z-40 flex flex-col" style={{ top: topOffset, left: leftOffset }}>
    {
      sortedSuggestions.map((item, index) => (
        <SuggestionCard
          key={index}
          id={`suggestion-card-${index}`}
          isFocused={selectedCardRef.current === index}
          alg={item.suggestion.alg}
          steps={item.suggestion.steps}
          hasEOsolved={item.suggestion.hasEOsolved}
          handleSuggestionRequest={() => focusHoveredElement(index)}
          handleSuggestionAccept={handleSuggestionAccept}
        />
      )) 
    }
    { sortedSuggestions.length < 1 ? 
      null : 
      <div className={`
        hover:bg-primary-200 hover:shadow-md
        flex flex-row items-center gap-3 w-fit border-t-dark
        border border-neutral-400 bg-primary-300 text-dark text-md p-1
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