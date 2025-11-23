'use client';

// order cards first by steps, then colors, then speed
import type { Suggestion } from '../../composables/recon/CubeInterpreter';
import SuggestionCard from './SuggestionCard';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface SuggestionBoxSuggestion {
  suggestion: Suggestion;
  originalIndex: number;
}

interface SuggestionBoxProps {
  suggestions: SuggestionBoxSuggestion[];
  xLocation: number;
  yLocation: number;
  handleSuggestionRequest: (index: number) => void;
  handleSuggestionAccept: () => void;
  handleSuggestionReject: () => void;
}

const sortSuggestions = (items: SuggestionBoxSuggestion[]) => {
  // 1. group by unique (name, step)
  const groups = new Map<string, SuggestionBoxSuggestion[]>()

  for (const item of items) {
    const step = item.suggestion.step;
    const name = item.suggestion.name ?? "";
    const key = `${name}:::${step}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(item)
  }

  // 2. sort each group by time (smallest first)
  const sortedGroups = Array.from(groups.values()).map(group =>
    group.sort((a, b) => a.suggestion.time - b.suggestion.time)
  )

  // 3. sort the groups by the time of the first element
  sortedGroups.sort((a, b) => a[0].suggestion.time - b[0].suggestion.time)

  return sortedGroups.flat()
};

export const SuggestionBox = ({suggestions, xLocation, yLocation, handleSuggestionRequest, handleSuggestionAccept, handleSuggestionReject }: SuggestionBoxProps) => {
  const sortedSuggestions = sortSuggestions(suggestions);
  const selectedCardRef = useRef<number | null>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  
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
    setPortalTarget(document.body);
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

  if (!portalTarget) return null;
  if (selectedCardRef.current === null) selectedCardRef.current = 0;

  const isTouchScreen = typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0;

  // render inside body so parent overflow settings never clip the menu
  return createPortal(
    <div className="flex flex-col absolute" style={{ left: xLocation, top: yLocation, zIndex: 1000 }}>
    {
      sortedSuggestions.map((item, index) => (
        <SuggestionCard
          key={index}
          id={`suggestion-card-${index}`}
          isFocused={selectedCardRef.current === index}
          alg={item.suggestion.alg}
          step={item.suggestion.step}
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
        ${isTouchScreen ? 'min-w-[100px] justify-center' : 'w-fit'}`}
        onClick={handleSuggestionReject}>
          Cancel
        { !isTouchScreen ? (
        <img src="/esc.svg" alt="Esc" className='border border-dark mb-[2px]'/>
        ) : null}
      </div>
    }
    </div>,
    portalTarget
  );
};