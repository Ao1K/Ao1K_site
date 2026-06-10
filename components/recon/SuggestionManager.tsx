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
  suggestions?: Suggestion[];
  // the line index `suggestions` were generated for; null when none are active. suggestions
  // are only valid on the line they were computed for, so a mismatch hides them as stale.
  suggestionLineIndex?: number | null;
  activeLineIndex: number;
  activeLineHtml?: string;
  activeLineMoves?: string[];
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
  suggestions,
  suggestionLineIndex,
  activeLineIndex,
  activeLineHtml,
  activeLineMoves,
  overlayElement,
  topOffset,
  leftOffset,
  showTabHint,
  onAcceptSuggestion,
  onRejectSuggestion,
  ref,
}: SuggestionManagerProps) {
  // the only genuine state: which suggestion is highlighted, and whether Esc was pressed.
  const [selectedOriginalIndex, setSelectedOriginalIndex] = useState<number | null>(null);
  const [dismissed, setDismissed] = useState(false);
  // ghost anchor box pushed in by the editor; lives here so it re-renders only the ghost.
  const [caretLeft, setCaretLeft] = useState(0);
  const [caretTop, setCaretTop] = useState(0);
  const [caretHeight, setCaretHeight] = useState(0);

  // suggestions are only valid on the line they were generated for; on any other line they're
  // stale (e.g. backspacing onto an earlier line whose suggestions were never recomputed).
  const suggestionsApplyToActiveLine = suggestionLineIndex === activeLineIndex;

  const filteredSuggestions = name === 'solution' && suggestionsApplyToActiveLine
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

  // reset dismissal when the active line's content (line index or its moves) changes.
  const lineKey = `${activeLineIndex}::${(activeLineMoves ?? []).join(' ')}`;
  const prevLineKeyRef = useRef(lineKey);
  if (prevLineKeyRef.current !== lineKey) {
    prevLineKeyRef.current = lineKey;
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
  }));

  if (!overlayElement || !shouldShow || !filteredSuggestions) {
    return null;
  }

  return createPortal(
    <>
      <SuggestionBox
        suggestions={filteredSuggestions}
        topOffset={topOffset}
        leftOffset={leftOffset}
        handleSuggestionRequest={(index) => setSelectedOriginalIndex(index)}
        handleSuggestionAccept={onAcceptSuggestion}
        handleSuggestionReject={onRejectSuggestion}
      />
      <SuggestionGhost
        remaining={remaining}
        showTabHint={showTabHint}
        left={caretLeft}
        top={caretTop}
        height={caretHeight}
      />
    </>,
    overlayElement,
  );
}
