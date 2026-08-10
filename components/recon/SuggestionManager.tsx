import React, { useImperativeHandle, useRef, useState, type Ref } from 'react';
import { createPortal } from 'react-dom';

import type { Suggestion } from '../../composables/recon/SimpleCubeInterpreter';
import { SuggestionBox } from './SuggestionBox';
import { SuggestionGhost } from './SuggestionGhost';
import { colorDict } from '../../utils/sharedConstants';

export interface SuggestionFilterClasses {
  comment: string;
  move: string;
  space: string;
  paren: string;
  rep: string;
}

export interface SuggestionManagerHandle {
  // re-show after the user dismissed with Esc (used by Tab)
  canShowSuggestion: () => boolean;
  // a ghost is visible with text left to type (used by Tab)
  canAcceptSuggestion: () => boolean;
  isShowing: () => boolean;
  showSuggestion: () => void;
  dismissSuggestion: () => void;
  // the exact text the editor should append when the suggestion is accepted (includes a
  // leading space when one is needed, so the editor inserts it verbatim).
  getAcceptText: () => string | null;
  // ghost anchor box (relative to the overlay) for aligning the ghost. kept in the manager
  // so updating it re-renders only the ghost, never the editor's contentEditable.
  updateCaretRect: (left: number, top: number, height: number) => void;
  setSuggestions: (suggestions: Suggestion[], lineIndex: number | null) => void;
}

interface SuggestionState {
  suggestions: Suggestion[];
  lineIndex: number | null;
}

interface SuggestionFilterInput {
  suggestions?: Suggestion[];
  lineHtml?: string;
}

interface FilteredSuggestionItem {
  suggestion: Suggestion;
  originalIndex: number;
}

interface SuggestionManagerProps {
  name: string;
  activeLineIndex: number;
  lines: string[];
  overlayElement: HTMLElement | null;
  topOffset: number;
  leftOffset: number;
  showTabHint: boolean;
  onAcceptSuggestion: () => void;
  onRejectSuggestion: () => void;
  ref?: Ref<SuggestionManagerHandle>;
}

const buildSuggestionSignature = (suggestions?: Suggestion[]) =>
  suggestions?.map((suggestion) => suggestion.alg).join('|') || '';

const lineHasComments = (lineHtml = '', commentClass: string) =>
  lineHtml.includes(`class="${commentClass}"`);

/**
 * The visible text of a painted line: strip the markup and normalize the entities the
 * editor can leave behind. This is the source of truth for matching suggestions and for
 * positioning the ghost, so the spacing it shows always matches what's actually typed.
 */
const getLineText = (lineHtml = ''): string =>
  lineHtml
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

/**
 * The portion of a suggestion still left to type, given the text already on the line.
 * Because it's a raw suffix of the alg, a leading space (when the typed text doesn't end
 * with one) comes for free, and no space is added when the line already ends with one.
 * Returns '' when the typed text isn't a prefix of the alg.
 */
const resolveRemaining = (suggestionAlg: string, visibleText: string): string =>
  suggestionAlg.startsWith(visibleText) ? suggestionAlg.slice(visibleText.length) : '';

const NO_REGION = -2;

const isBlankLine = (lineHtml = '') => getLineText(lineHtml).trim() === '';

const buildRegionOfLine = (lines: string[]) => {
  const regionByLine: number[] = [];

  let anchor = -1;
  lines.forEach((lineHtml, lineIndex) => {
    regionByLine[lineIndex] = anchor;
    if (!isBlankLine(lineHtml)) anchor = lineIndex;
  });

  return (lineIndex: number) => regionByLine[lineIndex] ?? NO_REGION;
};

const filterSuggestionsForDisplay = ({
  suggestions,
  lineHtml,
}: SuggestionFilterInput): FilteredSuggestionItem[] | undefined => {
  if (lineHasComments(lineHtml, colorDict['comment'])) {
    return undefined;
  }

  const visibleText = getLineText(lineHtml);

  return suggestions
    ?.map((suggestion, originalIndex) => ({ suggestion, originalIndex }))
    .filter(({ suggestion }) => resolveRemaining(suggestion.alg, visibleText).trim().length > 0);
};

export function SuggestionManager({
  name,
  activeLineIndex,
  lines,
  overlayElement,
  topOffset,
  leftOffset,
  showTabHint,
  onAcceptSuggestion,
  onRejectSuggestion,
  ref,
}: SuggestionManagerProps) {
  const [{ suggestions, lineIndex: suggestionLineIndex }, setSuggestionState] = useState<SuggestionState>({
    suggestions: [],
    lineIndex: null,
  });
  // the only genuine state: which suggestion is highlighted, and whether Esc was pressed.
  const [selectedOriginalIndex, setSelectedOriginalIndex] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);
  // ghost anchor box pushed in by the editor; lives here so it re-renders only the ghost.
  const [caretLeft, setCaretLeft] = useState(0);
  const [caretTop, setCaretTop] = useState(0);
  const [caretHeight, setCaretHeight] = useState(0);

  // suggestions are only valid in the region they were generated for; in any other region
  // they're stale (e.g. backspacing onto an earlier line whose suggestions were never recomputed).
  const regionOfLine = buildRegionOfLine(lines);
  const activeRegionId = regionOfLine(activeLineIndex);
  const activeLineHtml = lines[activeLineIndex] ?? '';
  const suggestionsApplyToActiveRegion = suggestionLineIndex !== null
    && regionOfLine(suggestionLineIndex) === activeRegionId;

  const filteredSuggestions = name === 'solution' && suggestionsApplyToActiveRegion
    ? filterSuggestionsForDisplay({
        suggestions,
        lineHtml: activeLineHtml,
      })
    : undefined;

  // reset selection + dismissal when the suggestion set changes (by content, not identity).
  const signature = buildSuggestionSignature(suggestions);
  const prevSignatureRef = useRef(signature);
  if (prevSignatureRef.current !== signature) {
    prevSignatureRef.current = signature;
    setSelectedOriginalIndex(null);
    setDismissed(false);
  }

  // a dismissal belongs to the region it was made in, so it survives moving between the blank
  // lines of that region, and clears once the caret leaves it.
  const prevRegionIdRef = useRef(activeRegionId);
  if (prevRegionIdRef.current !== activeRegionId) {
    prevRegionIdRef.current = activeRegionId;
    setDismissed(false);
  }

  // everything below is derived every render.
  const selectedItem = filteredSuggestions?.find((item) => item.originalIndex === selectedOriginalIndex)
    ?? filteredSuggestions?.[0];
  const full = selectedItem?.suggestion.alg ?? '';
  const remaining = full ? resolveRemaining(full, getLineText(activeLineHtml)) : '';

  const shouldShow = name === 'solution'
    && !!filteredSuggestions?.length
    && !dismissed
    && !!remaining;

  useImperativeHandle(ref, () => ({
    canShowSuggestion: () => dismissed && !!filteredSuggestions?.length,
    canAcceptSuggestion: () => shouldShow && !!remaining,
    isShowing: () => shouldShow,
    showSuggestion: () => setDismissed(false),
    dismissSuggestion: () => setDismissed(true),
    getAcceptText: () => (shouldShow && remaining ? remaining : null),
    updateCaretRect: (left: number, top: number, height: number) => {
      setCaretLeft(left);
      setCaretTop(top);
      setCaretHeight(height);
    },
    setSuggestions: (next: Suggestion[], nextLineIndex: number | null) => {
      setSuggestionState((prev) =>
        prev.lineIndex === nextLineIndex && buildSuggestionSignature(prev.suggestions) === buildSuggestionSignature(next)
          ? prev
          : { suggestions: next, lineIndex: nextLineIndex },
      );
    },
  }));

  if (!shouldShow || !filteredSuggestions) {
    return null;
  }

  return (
    <>
      {overlayElement && createPortal(
        <SuggestionBox
          suggestions={filteredSuggestions}
          selectedOriginalIndex={selectedItem?.originalIndex ?? null}
          topOffset={topOffset}
          leftOffset={leftOffset}
          handleSuggestionRequest={(index) => setSelectedOriginalIndex(index)}
          handleSuggestionAccept={onAcceptSuggestion}
          handleSuggestionReject={onRejectSuggestion}
        />,
        overlayElement,
      )}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <SuggestionGhost
          remaining={remaining}
          showTabHint={showTabHint}
          left={caretLeft}
          top={caretTop}
          height={caretHeight}
        />
      </div>
    </>
  );
}
