'use client';
import React, { useRef, useState, useEffect } from 'react';
import debounce from 'lodash.debounce';
import updateURL from '../../composables/recon/updateURL';
import { ICON_SIZE_CONFIG } from '../../composables/useSettings';

export const SPLITS_WIDTH = 80;

export function formatSplitValue(value: string): string {
  if (!value) return '';

  if (!value.includes('.')) {
    const padded = value.padStart(4, '0');
    const intPart = padded.slice(0, padded.length - 3);
    const decPart = padded.slice(padded.length - 3);
    return `${intPart}.${decPart}`.replace(/^0*(\d)/, '$1');
  }

  const [intPart, decPart] = value.split('.');
  return `${intPart}.${decPart.slice(0, 3)}`.replace(/^0*(\d)/, '$1');
}

export function splitsToURLParam(splits: string[]): string | null {
  const trimmed = [...splits];
  while (trimmed.length > 0 && trimmed[trimmed.length - 1] === '') {
    trimmed.pop();
  }
  return trimmed.length === 0 ? null : trimmed.join(',');
}

interface SplitsStackProps {
  editableElement?: HTMLElement | null;
  splits: string[];
  onSplitsChange: (splits: string[]) => void;
  onSplitsCommit: (splits: string[]) => void;
  isWhitespaceLine?: boolean[];
}

function SplitsStack({ editableElement, splits, onSplitsChange, onSplitsCommit, isWhitespaceLine }: SplitsStackProps) {
  const { lineHeight: iconLineHeight } = ICON_SIZE_CONFIG['medium'];
  const [, forceRender] = useState({});
  const observerRef = useRef<ResizeObserver | null>(null);
  const prevHeightsRef = useRef<string>('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const getCurrentDivHeights = (element: HTMLElement) => {
    const divs = element.querySelectorAll('div');
    return Array.from(divs).map((div, index) => ({
      index,
      height: div.getBoundingClientRect().height,
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
      if (observerRef.current) observerRef.current.disconnect();

      const handleResize = debounce(() => {
        const newHeights = JSON.stringify(getCurrentDivHeights(editableElement));
        if (newHeights !== prevHeightsRef.current) {
          prevHeightsRef.current = newHeights;
          forceRender({});
        }
      }, 300);

      observerRef.current = new ResizeObserver(handleResize);
      editableElement.querySelectorAll('div').forEach(div => observerRef.current!.observe(div));
    };

    setupResizeObserver();

    const mutationObserver = new MutationObserver(() => setupResizeObserver());
    mutationObserver.observe(editableElement, { childList: true, subtree: true });

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      mutationObserver.disconnect();
    };
  }, [editableElement]);

  const divHeights = editableElement ? getCurrentDivHeights(editableElement) : [];

  // map each line index to its split index (null for whitespace lines)
  const lineToSplitIndex: (number | null)[] = [];
  let splitCount = 0;
  for (let i = 0; i < divHeights.length; i++) {
    lineToSplitIndex.push(isWhitespaceLine?.[i] ? null : splitCount++);
  }

  const handleChange = (index: number, value: string) => {
    let filtered = value.replace(/[^0-9.]/g, '');
    const dotIndex = filtered.indexOf('.');
    if (dotIndex !== -1) {
      filtered = filtered.slice(0, dotIndex + 1) + filtered.slice(dotIndex + 1).replace(/\./g, '');
    }
    if (filtered.replace('.', '').length > 8) return;

    const newSplits = [...splits];
    while (newSplits.length <= index) newSplits.push('');
    newSplits[index] = filtered;
    onSplitsChange(newSplits);
  };

  const handleBlur = (index: number) => {
    const value = splits[index] || '';
    const formatted = formatSplitValue(value);
    const newSplits = [...splits];
    while (newSplits.length <= index) newSplits.push('');
    newSplits[index] = formatted;
    if (formatted !== value) onSplitsChange(newSplits);
    updateURL('splits', splitsToURLParam(newSplits));
    onSplitsCommit(newSplits);
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    const isDown = e.key === 'ArrowDown' || (e.key === 'Enter' && !e.shiftKey);
    const isUp = e.key === 'ArrowUp' || (e.key === 'Enter' && e.shiftKey);

    if (isDown) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    } else if (isUp) {
      e.preventDefault();
      if (index > 0) inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <div
      className="flex flex-col items-start justify-start pt-1"
      style={{ width: `${SPLITS_WIDTH}px` }}
    >
      {divHeights.map((divHeight, lineIndex) => {
        const lineWraps = Math.round((divHeight.height + 5) / iconLineHeight);
        const calculatedHeight = lineWraps * iconLineHeight;
        const splitIndex = lineToSplitIndex[lineIndex];

        return (
          <div
            key={lineIndex}
            className={`transition-[height] duration-300 ease-in-out ${lineIndex === 0 ? 'mt-1' : ''}`}
            style={{ width: `${SPLITS_WIDTH}px`, height: `${calculatedHeight}px` }}
          >
            {splitIndex !== null && (
              <input
                ref={el => { inputRefs.current[splitIndex] = el; }}
                type="text"
                inputMode="decimal"
                placeholder={splitIndex === 0 ? 'ssmmm' : undefined}
                value={splits[splitIndex] ?? ''}
                onChange={e => handleChange(splitIndex, e.target.value)}
                onBlur={() => handleBlur(splitIndex)}
                onKeyDown={e => handleKeyDown(e, splitIndex)}
                className="w-full h-full text-sm bg-transparent outline-none text-center border border-neutral-600 focus:border-primary-100 text-primary-100"
                autoComplete="off"
                spellCheck={false}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default React.memo(SplitsStack);
