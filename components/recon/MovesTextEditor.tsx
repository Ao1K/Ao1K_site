'use client';

import React, { useImperativeHandle, useEffect, useLayoutEffect, memo, useEffectEvent, useRef } from 'react';

import {
  applyInputRules,
  countMovesBeforeCaret,
  expandLine,
  findDomPoint,
  linesToHTML,
  mapCaretOffset,
  paintLine,
  parseLine,
  readEditorLines,
  type Caret,
  type DomPoint,
  type Segment,
  type SelectionTransform,
} from '../../composables/recon/editorDocument';
import updateURL from '../../composables/recon/updateURL';

import { customDecodeURL } from '../../composables/recon/urlEncoding';

import { cube3x3, type Move3x3 } from '../../utils/parser/cube3x3';
import type { Suggestion } from '../../composables/recon/SimpleCubeInterpreter';
import { editorAliases } from '../../utils/sharedConstants';
import {
  SuggestionManager,
  type SuggestionManagerHandle,
} from './SuggestionManager';
import { KEYBOARD_KEEPER_SELECTOR } from './KeyboardKeeper';

type EditorSelection = { anchor: Caret; focus: Caret };

type EditorLine = {
  text: string;
  segments: Segment<Move3x3>[];
  moves: Move3x3[];
  html: string;
};

const buildEditorLine = (text: string): EditorLine => {
  const segments = parseLine(text, cube3x3);
  return {
    text,
    segments,
    moves: expandLine(segments),
    html: `<div>${paintLine(text, segments)}<br></div>`,
  };
};

const EMPTY_EDITOR_LINE = buildEditorLine('');

// the ghost anchor is measured from the freshly painted text, so it must run before paint to
// stay in lockstep with the recalculated suggestion text. fall back to useEffect on the server.
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

const supportsHardwareKeyboard =
  typeof window !== 'undefined' && !window.matchMedia('(pointer: coarse)').matches;

const suggestionNavigationKeys = new Set(['Tab', 'Escape', 'ArrowUp', 'ArrowDown']);
const bareModifierKeys = new Set(['Shift', 'Control', 'Alt', 'Meta']);

const keyLeavesFocusOnKeeper = (e: KeyboardEvent) =>
  e.ctrlKey || e.metaKey || e.altKey
  || suggestionNavigationKeys.has(e.key)
  || bareModifierKeys.has(e.key);

const domPointFromCoordinates = (x: number, y: number): DomPoint | null => {
  if (document.caretPositionFromPoint) {
    const position = document.caretPositionFromPoint(x, y);
    return position ? { node: position.offsetNode, offset: position.offset } : null;
  }
  const range = document.caretRangeFromPoint?.(x, y);
  return range ? { node: range.startContainer, offset: range.startOffset } : null;
};

interface EditorProps {
  name: string;
  trackMoves: (idIndex: number, lineIndex: number, caretIndex: number, moves: Move3x3[][]) => void;
  autofocus: boolean;
  moveHistory: React.RefObject<any>;
  onHistoryChange?: () => void;
  html: string;
  setHTML: (html: string) => void;
  ref?: React.Ref<ImperativeRef>;
  initialContent?: string;
  lineHeight?: number;
  simpleInput?: boolean;
  iconColumnWidth?: number;
  isReadOnly?: boolean;
  isTopRightCornerSquare?: boolean;
}

export interface ImperativeRef {
  undo: () => void;
  redo: () => void;
  setContent: (html: string) => void;
  transformSelection: (transform: SelectionTransform) => void;
  highlightMove: (moveIndex: number, lineIndex: number) => void;
  removeHighlight: () => void;
  getElement: () => HTMLDivElement | null;
  flushURLUpdate: () => void;
  setSuggestions: (suggestions: Suggestion[], lineIndex: number | null) => void;
  getSuggestionLineIndex: () => number | null;
}

function MovesTextEditor({
  name,
  trackMoves,
  autofocus,
  moveHistory,
  onHistoryChange,
  html,
  setHTML,
  ref,
  initialContent,
  lineHeight,
  simpleInput = false,
  iconColumnWidth = 0,
  isReadOnly = false,
  isTopRightCornerSquare = false,
}: EditorProps) {

  const contentEditableRef = useRef<HTMLDivElement>(null);
  const editorWrapperRef = useRef<HTMLDivElement>(null);
  const moveOffsetRef = useRef<number>(0); // number of moves before and at the caret. 0 is at the start of the line before any moves.
  const lineOffsetRef = useRef<number>(0);
  const editorLinesRef = useRef<EditorLine[]>([EMPTY_EDITOR_LINE]);
  const caretRef = useRef<Caret>({ line: 0, offset: 0 });
  const caretPlacedRef = useRef(false);
  const pendingSelectionRef = useRef<EditorSelection | null>(null);
  const suggestionManagerRef = useRef<SuggestionManagerHandle | null>(null);
  const restoreFrameRef = useRef<number | null>(null);
  const dragStartedInEditorRef = useRef(false);

  const updateURLTimeout = useRef<NodeJS.Timeout | null>(null);

  const oldLineMoveCounts = useRef<number[]>([0]);

  const idIndex = name === 'scramble' ? 0 : 1;
  const fallbackEditorTopInset = 9;
  const fallbackLineHeight = lineHeight || 28;

  const scheduleURLUpdate = () => {
    updateURLTimeout.current ? clearTimeout(updateURLTimeout.current) : null;
    updateURLTimeout.current = setTimeout(passURLupdate, 500);
  };

  const handleInput = () => {
    const root = contentEditableRef.current;
    if (!root) return;

    const selection = window.getSelection();
    const focusNode = selection?.focusNode;
    const canReadCaret = moveHistory.current.undo_redo_done !== false && !!focusNode && root.contains(focusNode);
    const focusPoints: DomPoint[] = canReadCaret ? [{ node: focusNode, offset: selection!.focusOffset }] : [];

    const { lines, points: [caret] } = readEditorLines(root, focusPoints);
    processLines(lines, caret ?? null);
    scheduleURLUpdate();
  };

  const mappedCaret = (newLines: string[]): Caret | null => {
    if (!caretPlacedRef.current) return null;

    const oldLines = editorLinesRef.current.map((line) => line.text);
    const line = Math.min(caretRef.current.line, newLines.length - 1);
    const offset = mapCaretOffset(oldLines[line] ?? '', newLines[line], caretRef.current.offset);
    return { line, offset };
  };

  const getCurrentLineHeights = (element: HTMLDivElement) => {
    const lineDivs = Array.from(element.children).filter(
      (child): child is HTMLDivElement => child instanceof HTMLDivElement,
    );

    return lineDivs.map((div) => div.getBoundingClientRect().height);
  };

  const getMeasuredSuggestionTopOffset = () => {
    const element = contentEditableRef.current;
    if (!element) {
      return fallbackEditorTopInset + fallbackLineHeight * (lineOffsetRef.current + 1) + 5;
    }

    const styles = window.getComputedStyle(element);
    const editorTopInset = Number.parseFloat(styles.paddingTop) + Number.parseFloat(styles.borderTopWidth);
    const lineHeights = getCurrentLineHeights(element);

    let totalHeight = 0;
    for (let index = 0; index < lineOffsetRef.current; index++) {
      totalHeight += lineHeights[index] ?? fallbackLineHeight;
    }

    return editorTopInset + totalHeight + fallbackLineHeight;
  };

  const isQuantifiableMoveChange = (oldMoveCounts: number[], newMoveCounts: number[]) => {
    //Remove trailing zeros. Clean empty count arrays.
    while (oldMoveCounts[oldMoveCounts.length - 1] === 0) oldMoveCounts.pop();
    while (newMoveCounts[newMoveCounts.length - 1] === 0) newMoveCounts.pop();
    if (oldMoveCounts.length === 0) oldMoveCounts = [0]
    if (newMoveCounts.length === 0) newMoveCounts = [0]

    if (oldMoveCounts.length !== newMoveCounts.length) return true;

    for (let i = 0; i < oldMoveCounts.length; i++) {
      if (oldMoveCounts[i] !== newMoveCounts[i]) return true;
    }

    return false;
  }

  const updateMoveHistory = (text: string, moveCountChanged: boolean) => {

    if (moveHistory.current.status === 'loading') {
      moveHistory.current.history = [["", ""]];
      moveHistory.current.index = 0;

      moveHistory.current.status = 'ready';
    }

    if (moveHistory.current.status !== 'ready') {
      return;
    }

    let i = moveHistory.current.index;

    const MaxHistoryReached = i >= moveHistory.current.MAX_HISTORY;

    if (MaxHistoryReached) {

      moveHistory.current.history.shift();

    } else if (moveCountChanged || i === 0) {

      moveHistory.current.index++;
      i++;

    } else if (!moveCountChanged) {

      let lastTextboxHistory = moveHistory.current.history[moveHistory.current.index][idIndex];
      let rowIndex = moveHistory.current.index;
      while (lastTextboxHistory === '<unchanged>' && rowIndex > 1) {
        rowIndex--;
        lastTextboxHistory = moveHistory.current.history[rowIndex][idIndex];
      }

      if (lastTextboxHistory === '<unchanged>') {
        return;
      } else {
        i = rowIndex; // moveHistory.current.index stays the same
      }
    }

    moveCountChanged ? moveHistory.current.history = moveHistory.current.history.slice(0, i + 1) : null;

    idIndex === 0 ?
      moveHistory.current.history[i] = [text, '<unchanged>'] :
      moveHistory.current.history[i] = ['<unchanged>', text];
  }

  const processLines = (rawLines: string[], caret: Caret | null) => {
    const root = contentEditableRef.current;
    if (!root) return;

    let lines = rawLines;
    let nextCaret = caret;
    if (simpleInput && lines.length > 1) {
      if (nextCaret) {
        const offset = lines
          .slice(0, nextCaret.line)
          .reduce((total, line) => total + line.length + 1, nextCaret.offset);
        nextCaret = { line: 0, offset };
      }
      lines = [lines.join(' ')];
    }

    const previousLines = editorLinesRef.current;
    const editorLines = lines.map((text, index) => {
      const previous = previousLines[index];
      if (previous && previous.text === text) return previous;

      const caretOffset = nextCaret?.line === index ? nextCaret.offset : null;
      const substituted = applyInputRules(text, caretOffset, cube3x3.inputRules);
      if (substituted.caretOffset !== null) nextCaret = { line: index, offset: substituted.caretOffset };
      return buildEditorLine(substituted.text);
    });

    if (nextCaret) {
      const line = Math.min(nextCaret.line, editorLines.length - 1);
      caretRef.current = { line, offset: Math.min(nextCaret.offset, editorLines[line].text.length) };
      caretPlacedRef.current = true;
      lineOffsetRef.current = line;
      moveOffsetRef.current = countMovesBeforeCaret(editorLines[line].segments, caretRef.current.offset);
    } else {
      const line = Math.min(caretRef.current.line, editorLines.length - 1);
      caretRef.current = { line, offset: Math.min(caretRef.current.offset, editorLines[line].text.length) };
    }

    const lineMoveCounts = editorLines.map((line) => line.moves.length);
    const moveCountChanged = isQuantifiableMoveChange([...oldLineMoveCounts.current], [...lineMoveCounts]);
    updateMoveHistory(editorLines.map((line) => line.text).join('\n'), moveCountChanged);
    onHistoryChange?.();

    editorLinesRef.current = editorLines;
    oldLineMoveCounts.current = lineMoveCounts;

    const newHTML = editorLines.map((line) => line.html).join('');
    setHTML(newHTML);

    if (newHTML === html && root.innerHTML !== newHTML) {
      root.innerHTML = newHTML;
      restoreCaret();
    }

    trackMoves(idIndex, lineOffsetRef.current, moveOffsetRef.current, editorLines.map((line) => line.moves));
  };

  const selectCaret = () => {
    const root = contentEditableRef.current;
    if (!root) return;

    const point = findDomPoint(root, caretRef.current);
    window.getSelection()?.collapse(point.node, point.offset);
  };

  const selectEditorRange = ({ anchor, focus }: EditorSelection) => {
    const root = contentEditableRef.current;
    if (!root) return;

    const anchorPoint = findDomPoint(root, anchor);
    const focusPoint = findDomPoint(root, focus);
    window.getSelection()?.setBaseAndExtent(anchorPoint.node, anchorPoint.offset, focusPoint.node, focusPoint.offset);
    if (document.activeElement !== root) root.focus({ preventScroll: true });
  };

  const restoreCaret = () => {
    const pendingSelection = pendingSelectionRef.current;
    if (pendingSelection) {
      pendingSelectionRef.current = null;
      selectEditorRange(pendingSelection);
      return;
    }

    if (document && document.activeElement !== contentEditableRef.current) {
      return;
    }

    selectCaret();
  };

  const handleCopy = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = window.getSelection()?.toString() || '';
    e.clipboardData?.setData('text/plain', text);
  };

  const insertPlainText = (text: string, startPoint: DomPoint, endPoint: DomPoint) => {
    const root = contentEditableRef.current;
    if (!root) return;

    const newLines = text
      .replace(/’/g, "'")
      .replace(/\r\n?/g, '\n')
      .split('\n');

    const { lines, points: [start, end] } = readEditorLines(root, [startPoint, endPoint]);
    if (!start || !end) return;

    const textBefore = lines[start.line].slice(0, start.offset);
    const textAfter = lines[end.line].slice(end.offset);
    const insertedLines = newLines.map((line, index) => {
      const withBefore = index === 0 ? textBefore + line : line;
      return index === newLines.length - 1 ? withBefore + textAfter : withBefore;
    });
    const lastInsertedLine = insertedLines[insertedLines.length - 1];
    const caret = {
      line: start.line + insertedLines.length - 1,
      offset: lastInsertedLine.length - textAfter.length,
    };

    processLines([...lines.slice(0, start.line), ...insertedLines, ...lines.slice(end.line + 1)], caret);
    scheduleURLUpdate();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    insertPlainText(
      e.clipboardData.getData('text'),
      { node: range.startContainer, offset: range.startOffset },
      { node: range.endContainer, offset: range.endOffset },
    );
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    // let the browser handle drags within this editor so the dragged text gets moved, not copied.
    if (dragStartedInEditorRef.current) return;
    e.preventDefault();

    const root = contentEditableRef.current;
    const dropPoint = domPointFromCoordinates(e.clientX, e.clientY);
    if (!root || !dropPoint || !root.contains(dropPoint.node)) return;

    root.focus({ preventScroll: true });
    insertPlainText(e.dataTransfer.getData('text/plain'), dropPoint, dropPoint);
  };

  const passURLupdate = () => {

    // don't allow dummy text editors to update the URL
    if (name !== 'scramble' && name !== 'solution') return;
    if (isReadOnly) return;

    const root = contentEditableRef.current;
    if (!root) {
      // updateURL(name, '');
      return;
    }

    // innerText produces double newlines because each <div>...<br></div> line
    // contributes both a <br> newline and a block-boundary newline.
    // Normalize to single newlines.
    const text = (root.innerText || '').replace(/\n\n/g, '\n');

    updateURL(name, text);
  };

  const isMultiSelect = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return false;

    const range = selection.getRangeAt(0);
    const isMulti = !range.collapsed && (range.startContainer !== range.endContainer || range.startOffset !== range.endOffset);
    return isMulti
  };

  const readMovedCaret = () => {
    const root = contentEditableRef.current;
    if (!root) return null;
    if (moveHistory.current.undo_redo_done === false) return null;
    if (isMultiSelect()) return null;

    const selection = window.getSelection();
    const focusNode = selection?.focusNode;
    if (!focusNode || !root.contains(focusNode)) return null;

    const { lines, points: [caret] } = readEditorLines(root, [{ node: focusNode, offset: selection!.focusOffset }]);
    const isSameCaret = !!caret
      && caret.line === caretRef.current.line
      && caret.offset === caretRef.current.offset;
    if (!caret || isSameCaret) return null;

    return { lines, caret };
  };

  const applyMovedCaret = ({ lines, caret }: NonNullable<ReturnType<typeof readMovedCaret>>) => {
    caretRef.current = caret;
    caretPlacedRef.current = true;
    lineOffsetRef.current = caret.line;
    moveOffsetRef.current = countMovesBeforeCaret(parseLine(lines[caret.line], cube3x3), caret.offset);

    const editorLines = editorLinesRef.current;
    const isDomPainted = lines.length === editorLines.length
      && lines.every((text, index) => text === editorLines[index].text);

    if (isDomPainted) {
      setHTML(editorLines.map((line) => line.html).join(''));
    }
    trackMoves(idIndex, lineOffsetRef.current, moveOffsetRef.current, editorLines.map((line) => line.moves));
  };

  const lastTextNodeIn = (node: Node): Text | null => {
    let last: Text | null = null;
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      last = walker.currentNode as Text;
    }
    return last;
  };

  /**
   * Positions the ghost preview at the end of the active line's typed text, relative to the
   * editor itself. The ghost continues the whole line, so it anchors to the end of the
   * text rather than the live caret — moving the caret back into the line (arrow keys) must
   * not drag the ghost left with it. The box is measured against the editor's own wrapper, which
   * the icon column slides and the solution list scrolls, so the anchor stays valid through both
   * without being remeasured. A collapsed Range at the end of the last text node gives the
   * x just past the final character; the last painted span's right edge is the fallback.
   */
  const measureCaretRect = () => {
    const editor = contentEditableRef.current;
    const wrapper = editorWrapperRef.current;
    if (!editor || !wrapper) return;

    const lineDivs = Array.from(editor.children).filter(
      (child): child is HTMLDivElement => child instanceof HTMLDivElement,
    );
    const lineDiv = lineDivs[lineOffsetRef.current] ?? lineDivs[lineDivs.length - 1];
    if (!lineDiv) return;

    let rect: DOMRect | null = null;

    const lastText = lastTextNodeIn(lineDiv);
    if (lastText && (lastText.textContent?.length ?? 0) > 0) {
      const range = document.createRange();
      range.setStart(lastText, lastText.textContent!.length);
      range.collapse(true);
      const measured = range.getBoundingClientRect();
      if (measured.height > 0) {
        rect = measured;
      }
    }

    if (!rect) {
      // empty/unmeasurable line: fall back to the right edge of the last painted span,
      // then to the start of the line box.
      const spans = lineDiv.querySelectorAll('span');
      const lastSpan = spans[spans.length - 1] as HTMLElement | undefined;
      const box = (lastSpan ?? lineDiv).getBoundingClientRect();
      rect = new DOMRect(lastSpan ? box.right : box.left, box.top, 0, box.height);
    }

    const wrapperRect = wrapper.getBoundingClientRect();
    // push to the manager imperatively. updating editor state here would re-render the
    // contentEditable and reset the caret (React re-applies dangerouslySetInnerHTML).
    // height is the caret box height so the ghost text aligns to the typed text, not the full
    // line box (which would center the smaller glyphs lower than the typed text).
    suggestionManagerRef.current?.updateCaretAnchor({
      lineIndex: lineOffsetRef.current,
      left: rect.left - wrapperRect.left,
      top: rect.top - wrapperRect.top,
      height: rect.height,
    });
  };

  /**
   * Handles when user changes caret position.
   * Gets moveOffset and lineOffset, validates text, and updates move history.
   */
  const handleCaretChange = () => {
    const movedCaret = readMovedCaret();
    if (!movedCaret) return;

    applyMovedCaret(movedCaret);
    measureCaretRect();
  };

  const handleFocus = () => {
    const movedCaret = readMovedCaret();
    if (movedCaret) {
      applyMovedCaret(movedCaret);
    } else {
      trackMoves(idIndex, lineOffsetRef.current, moveOffsetRef.current, editorLinesRef.current.map((line) => line.moves));
    }
    measureCaretRect();
  };

  const restoreCaretAfterMouseUp = () => {
    const root = contentEditableRef.current;
    if (!root || document.activeElement !== root) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const touchesRoot = (node: Node | null) => !!node && (node === root || root.contains(node));
    if (range.collapsed || !(touchesRoot(selection.anchorNode) || touchesRoot(selection.focusNode) || touchesRoot(range.commonAncestorContainer))) {
      return;
    }

    // Firefox can leave a transient drag range after mouseup even when no content was selected.
    const selectionText = (selection.toString() || range.cloneContents().textContent || '').replace(/\u200B/g, '');
    if (selectionText.length > 0) return;

    if (!selection.focusNode) return;

    selection.collapse(selection.focusNode, selection.focusOffset);
    handleCaretChange();
  };

  const handleMouseUp = (event: MouseEvent) => {
    if (event.button !== 0) return;

    if (restoreFrameRef.current !== null) {
      cancelAnimationFrame(restoreFrameRef.current);
    }

    restoreFrameRef.current = requestAnimationFrame(() => {
      restoreFrameRef.current = null;
      restoreCaretAfterMouseUp();
    });
  };

  const dismissSuggestion = () => {
    if (name === 'scramble') return;
    // the preview is an overlay, so dismissing is pure state — no HTML surgery.
    suggestionManagerRef.current?.dismissSuggestion();
  };

  const keyboardKeeperHasFocus = () => {
    const active = document.activeElement;
    return active instanceof HTMLElement && active.matches(KEYBOARD_KEEPER_SELECTOR);
  };

  const resumeTypingInEditor = () => {
    if (name !== 'solution') return false;
    const editor = contentEditableRef.current;
    if (!editor || !keyboardKeeperHasFocus()) return false;

    selectCaret();
    editor.focus();
    measureCaretRect();
    return true;
  };

  const blockInputOnKeeper = (e: InputEvent) => {
    if (!keyboardKeeperHasFocus()) return;

    e.preventDefault();
    resumeTypingInEditor();
  };

  const handleCommand = (e: KeyboardEvent) => {
    if (!keyLeavesFocusOnKeeper(e)) {
      resumeTypingInEditor();
    }

    if (e.key === 'Tab' && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
      const manager = suggestionManagerRef.current;
      const canAcceptSuggestion = manager?.canAcceptSuggestion() ?? false;
      const canShowSuggestion = manager?.canShowSuggestion() ?? false;

      if (!canShowSuggestion && !canAcceptSuggestion) {
        return;
      }

      e.preventDefault();
      if (canAcceptSuggestion) {
        const acceptText = manager?.getAcceptText();
        if (acceptText) insertAcceptedSuggestion(acceptText);
        return;
      }
      // re-show after the user previously dismissed with Esc
      manager?.showSuggestion();
    }

    if (e.key === 'Escape' && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
      dismissSuggestion();
    }

    const isMac =
      typeof navigator !== "undefined" &&
      navigator.userAgent &&
      /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);

    const isCtrl = e.ctrlKey || e.metaKey;

    if (isCtrl && !e.shiftKey && !e.altKey && e.key === 'z') {

      e.preventDefault();
      handleUndo();
    }

    if (isMac && e.shiftKey && isCtrl && e.key === 'z') {

      e.preventDefault();
      handleRedo();

    } else if (!isMac && isCtrl && e.key === 'y') {

      e.preventDefault();
      handleRedo();
    }

    if (suggestionManagerRef.current?.isShowing()) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
      }
    }
  };

  const statusTransitions: any = {
    ready: { start: 'in_progress_one' },
    in_progress_one: { fail: 'checked_one', success: 'success_one' },
    checked_one: { fail: 'ready', success: 'ready', start: 'in_progress_two' },
    success_one: { start: 'ready' },
    in_progress_two: { fail: 'ready', success: 'ready' },
  };

  const runAfterFocus = (callback: () => void) => {
    const editor = contentEditableRef.current;
    if (!editor) return;

    if (document.activeElement === editor) {
      callback();
      return;
    }

    // waits for focus handler to finish before running callback
    const attemptCallback = (attempt: number) => {
      const node = contentEditableRef.current;
      if (!node) return;

      if (document.activeElement !== node) {
        if (attempt >= 10) {
          console.warn('Suggestion accept focus timeout');
          return;
        }
        node.focus({ preventScroll: true });
        requestAnimationFrame(() => attemptCallback(attempt + 1));
        return;
      }

      callback();
    };

    if (document.activeElement !== editor) {
      editor.focus({ preventScroll: true });
    }

    requestAnimationFrame(() => attemptCallback(0));
  };

  /**
   * Insert confirmed suggestion text, from either the Tab key or a tap on a card.
   */
  const insertAcceptedSuggestion = (remaining: string) => {
    if (!contentEditableRef.current) return;
    if (name === 'scramble') return; // no suggestions in scramble

    const targetLineIndex = lineOffsetRef.current;

    runAfterFocus(() => {
      const root = contentEditableRef.current;
      if (!root) return;

      // append at the end of the active line — where the ghost is anchored — rather than at
      // the live caret, which may have been moved back into the line. the remaining string
      // already carries its own leading space when one is needed, so it inserts verbatim.
      const { lines } = readEditorLines(root);
      const lineIndex = Math.min(targetLineIndex, lines.length - 1);
      const newLines = lines.map((line, index) => index === lineIndex ? line + remaining : line);

      processLines(newLines, { line: lineIndex, offset: newLines[lineIndex].length });
      scheduleURLUpdate();
    });
  }

  const incrementStatus = (type: 'fail' | 'success') => {
    const nextStatus = statusTransitions[moveHistory.current.status]?.[type];
    if (nextStatus) {
      moveHistory.current.status = nextStatus;
    } else {
      console.error('moveHistory status out of sync!');
    }
  };

  const restoreHistoryText = (text: string) => {
    const lines = text.split('\n');
    processLines(lines, mappedCaret(lines));
    scheduleURLUpdate();
  };

  const simpleRestore = (text: string) => {
    moveHistory.current.status = 'in_progress_one';
    restoreHistoryText(text);
    moveHistory.current.status = 'ready';
  };

  const simpleUndo = () => {
    const history = moveHistory.current.history;
    let index = moveHistory.current.index;
    if (index < 1) return;
    moveHistory.current.index = --index;

    let prevText = history[index][idIndex];
    while (prevText === '<unchanged>' && index > 0) {
      prevText = history[--index][idIndex];
    }

    simpleRestore(prevText);
  };

  const simpleRedo = () => {
    const history = moveHistory.current.history;
    let index = moveHistory.current.index;
    if (index + 1 > moveHistory.current.MAX_HISTORY || index + 1 >= history.length) return;
    moveHistory.current.index = ++index;

    let nextText = history[index][idIndex];
    while (nextText === '<unchanged>' && index + 1 < history.length) {
      nextText = history[++index][idIndex];
    }

    simpleRestore(nextText);
  };

  const handleUndo = () => {
    if (simpleInput) return simpleUndo();

    const startStatus = statusTransitions[moveHistory.current.status]?.start;
    if (startStatus) {
      moveHistory.current.status = startStatus;
    } else {
      console.error('moveHistory status out of sync!');
    }
    if (startStatus === 'ready') {
      return;
    }

    let index = moveHistory.current.index;
    const history = moveHistory.current.history;

    if (index < 1) {
      moveHistory.current.index = 0;
      incrementStatus('fail');
      return;
    }

    if (history[index] && history[index][idIndex] === '<unchanged>') {
      incrementStatus('fail');
      return;
    }

    index--;
    moveHistory.current.index--;

    const parentElement = document.getElementById(name);
    const textbox = parentElement?.querySelector<HTMLDivElement>('div[contenteditable="true"]');
    textbox?.focus({ preventScroll: true });

    let prevText = history[index][idIndex];
    while (prevText === '<unchanged>' && index > 0) {
      index--;
      //don't update moveHistory.current.index here. While loop would cause skips.
      prevText = history[index][idIndex];
    }

    restoreHistoryText(prevText);

    incrementStatus('success'); // placed at end to give correct moveHistory state to updateMoveHistory
  };


  const handleRedo = () => {
    if (simpleInput) return simpleRedo();

    const startStatus = statusTransitions[moveHistory.current.status]?.start;
    if (startStatus) {
      moveHistory.current.status = startStatus;
    } else {
      console.error('moveHistory status out of sync!');
    }

    if (startStatus === 'ready') {
      return;
    }

    let index = moveHistory.current.index;
    const history = moveHistory.current.history;

    if (index + 1 > moveHistory.current.MAX_HISTORY || index + 1 >= moveHistory.current.history.length) {
      incrementStatus('fail');
      return;
    }

    if (history[index + 1] && history[index + 1][idIndex] === '<unchanged>') {
      incrementStatus('fail');
      return;
    }

    index++;
    moveHistory.current.index++;

    const parentElement = document.getElementById(name);
    const textbox = parentElement?.querySelector<HTMLDivElement>('div[contenteditable="true"]');
    textbox?.focus({ preventScroll: true });

    let nextText = history[index][idIndex];
    while (nextText === '<unchanged>' && index > moveHistory.current.MAX_HISTORY) {
      index++;
      nextText = history[index][idIndex];
    }

    restoreHistoryText(nextText);

    incrementStatus('success');
  }

  const handleSetContent = (newHTML: string) => {
    const template = document.createElement('template');
    template.innerHTML = newHTML;
    const { lines } = readEditorLines(template.content);

    oldLineMoveCounts.current = [-1]; // ensures that moveHistory contains the new moves
    processLines(lines, mappedCaret(lines));
    scheduleURLUpdate();
  }

  const handleTransformSelection = (transform: SelectionTransform) => {
    const root = contentEditableRef.current;
    if (!root) return;

    const selection = window.getSelection();
    const anchorNode = selection?.anchorNode;
    const focusNode = selection?.focusNode;
    const hasSelectionInEditor = !!selection && !selection.isCollapsed
      && !!anchorNode && root.contains(anchorNode)
      && !!focusNode && root.contains(focusNode);
    const selectionPoints: DomPoint[] = hasSelectionInEditor
      ? [{ node: anchorNode, offset: selection.anchorOffset }, { node: focusNode, offset: selection.focusOffset }]
      : [];
    const { lines, points: [anchor, focus] } = readEditorLines(root, selectionPoints);

    const lastLine = lines.length - 1;
    const wholeDocument = { start: { line: 0, offset: 0 }, end: { line: lastLine, offset: lines[lastLine].length } };
    const isBackward = !!anchor && !!focus
      && (focus.line < anchor.line || (focus.line === anchor.line && focus.offset < anchor.offset));
    const selectedRange = anchor && focus && (isBackward ? { start: focus, end: anchor } : { start: anchor, end: focus });
    const transformed = transform(lines, selectedRange || wholeDocument);
    if (transformed.lines.join('\n') === lines.join('\n')) return;

    const { start, end } = transformed.selection;
    const [newAnchor, newFocus] = isBackward ? [end, start] : [start, end];
    oldLineMoveCounts.current = [-1];
    processLines(transformed.lines, newFocus);
    scheduleURLUpdate();

    const finalLines = editorLinesRef.current.map((line) => line.text);
    const anchorLine = Math.min(newAnchor.line, finalLines.length - 1);
    const anchorOffset = mapCaretOffset(transformed.lines[anchorLine] ?? '', finalLines[anchorLine], newAnchor.offset);
    pendingSelectionRef.current = { anchor: { line: anchorLine, offset: anchorOffset }, focus: caretRef.current };

    const isRenderPending = editorLinesRef.current.map((line) => line.html).join('') !== html;
    if (!isRenderPending) restoreCaret();
  }

  const handleRemoveHighlight = () => {
    if (!contentEditableRef.current) return;
    if (name === 'scramble') return; // no highlights in scramble
    contentEditableRef.current.innerHTML = editorLinesRef.current.map((line) => line.html).join('');
  }

  /**
   * Highlights the requested move in the solution text editor.
   */
  const handleHighlightMove = (moveIndex: number, lineIndex: number) => {

    if (!contentEditableRef.current) return;
    if (name === 'scramble') return;
    if (moveIndex < 0 || lineIndex < 0) return; // invalid move index or line index

    const editorLines = editorLinesRef.current;
    if (lineIndex >= editorLines.length) return; // invalid line index
    if (editorLines.every((line) => line.segments.length === 0)) return;

    const highlightedHTML = editorLines
      .map((line, index) => index === lineIndex
        ? `<div>${paintLine(line.text, line.segments, moveIndex - 1)}<br></div>`
        : line.html)
      .join('');
    setHTML(highlightedHTML);
  }

  const solutionScrollElement = contentEditableRef.current?.closest('#solution') as HTMLDivElement | null;
  const suggestionOverlayElement = solutionScrollElement?.parentElement ?? null;
  const suggestionTopOffset = getMeasuredSuggestionTopOffset();
  const suggestionLeftOffset = iconColumnWidth;

  useImperativeHandle(ref, () => ({
    undo: () => {
      handleUndo();
    },

    redo: () => {
      handleRedo();
    },

    setContent: (newHTML: string) => {
      handleSetContent(newHTML);
    },

    transformSelection: (transform: SelectionTransform) => {
      handleTransformSelection(transform);
    },

    highlightMove: (moveIndex: number, lineIndex: number) => {
      handleHighlightMove(moveIndex, lineIndex);
    },

    removeHighlight: () => {
      handleRemoveHighlight();
    },

    getElement: () => {
      return contentEditableRef.current;
    },

    flushURLUpdate: () => {
      if (updateURLTimeout.current) {
        clearTimeout(updateURLTimeout.current);
        updateURLTimeout.current = null;
      }
      passURLupdate();
    },

    setSuggestions: (nextSuggestions: Suggestion[], lineIndex: number | null) => {
      suggestionManagerRef.current?.setSuggestions(nextSuggestions, lineIndex);
    },

    getSuggestionLineIndex: () => suggestionManagerRef.current?.getSuggestionLineIndex() ?? null,
  }));

  // useEffectEvent ensures up-to-date values are used in subsequent function calls even if they are 
  // not in the parent useEffect().
  //
  // The useEffectEvent here makes sure that handleCaretChange uses an up-to-date copy of trackMoves(), 
  // which _PageContent rebuilds. A frozen trackMoves would mean stale values, like reading splits as [], 
  // leading to splits being set to ['', '', ...] every time the selection changes.
  const handleSelectionChangeEvent = useEffectEvent(() => {
    handleCaretChange();
  });

  const handleMouseUpEvent = useEffectEvent((event: MouseEvent) => {
    handleMouseUp(event);
  });

  const handleCommandEvent = useEffectEvent((event: KeyboardEvent) => {
    if (isReadOnly) return;
    handleCommand(event);
  });

  const handleBeforeInputEvent = useEffectEvent((event: InputEvent) => {
    if (isReadOnly) return;
    blockInputOnKeeper(event);
  });

  const handleCompositionStartEvent = useEffectEvent(() => {
    if (isReadOnly) return;
    resumeTypingInEditor();
  });

  const cleanupEditorEffect = useEffectEvent(() => {
    if (updateURLTimeout.current) {
      clearTimeout(updateURLTimeout.current);
      updateURLTimeout.current = null;
    }

    if (restoreFrameRef.current !== null) {
      cancelAnimationFrame(restoreFrameRef.current);
      restoreFrameRef.current = null;
    }
  });

  // runs once at mount to seed the editor from the URL. reading window.location.search
  // directly (as updateURL also does) avoids the reactive useSearchParams hook, which would
  // otherwise force this into a component under a <Suspense> boundary.
  const handleStartupProcess = useEffectEvent(() => {
    if (!contentEditableRef.current) return;

    const searchParams = new URLSearchParams(window.location.search);
    const aliases = editorAliases[name] ?? [];
    const editorText = searchParams.get(name)
      ?? aliases.reduce<string | null>((found, alias) => found ?? searchParams.get(alias), null);
    const otherID = name === 'scramble' ? 'solution' : 'scramble';
    const otherEditorText = searchParams.get(otherID);

    if (editorText) {
      let decodedText: string;
      try {
        decodedText = decodeURIComponent(customDecodeURL(editorText));
      } catch {
        decodedText = customDecodeURL(editorText);
      }
      const lines = decodedText.replace(/\n+/g, '\n').split('\n');
      contentEditableRef.current.innerHTML = linesToHTML(lines);

    } else if (initialContent && !otherEditorText) {
      contentEditableRef.current.innerHTML = linesToHTML(initialContent.split('\n'));
    }

    // Run for syntax highlighting, but skip URL update since we just loaded from URL
    processLines(readEditorLines(contentEditableRef.current).lines, null);


    if (autofocus && editorText && !otherEditorText) { // TODO: `&& !otherURLtext` isn't desired, but an unknown bug causes animation desync otherwise.
      const lastLineIndex = editorLinesRef.current.length - 1;
      caretRef.current = { line: lastLineIndex, offset: editorLinesRef.current[lastLineIndex].text.length };
      selectCaret();
    } else if (autofocus) {
      // select the other textbox
      const parentOtherElement = document.getElementById(otherID);
      const otherTextbox = parentOtherElement?.querySelector<HTMLDivElement>('div[contenteditable="true"]');
      otherTextbox?.focus();
    }
  });

  useEffect(() => {
    handleStartupProcess();

    document.addEventListener('selectionchange', handleSelectionChangeEvent);
    document.addEventListener('mouseup', handleMouseUpEvent);
    document.addEventListener('keydown', handleCommandEvent);
    document.addEventListener('beforeinput', handleBeforeInputEvent);
    document.addEventListener('compositionstart', handleCompositionStartEvent);

    return () => {

      document.removeEventListener('selectionchange', handleSelectionChangeEvent);
      document.removeEventListener('mouseup', handleMouseUpEvent);
      document.removeEventListener('keydown', handleCommandEvent);
      document.removeEventListener('beforeinput', handleBeforeInputEvent);
      document.removeEventListener('compositionstart', handleCompositionStartEvent);

      cleanupEditorEffect();

    };
  }, []);

  const queueCaretRestore = (origin: string, retries = 0) => {
    restoreFrameRef.current = requestAnimationFrame(() => {
      restoreFrameRef.current = null;

      if (!contentEditableRef.current) {
        return;
      }

      if (isMultiSelect()) {
        const selection = window.getSelection();
        if (selection && selection.rangeCount === 1 && retries < 2) {
          queueCaretRestore(origin, retries + 1);
          return;
        }

        return;
      }

      restoreCaret();
    });
  };


  const checkCaretRestore = () => {
    if (typeof window === 'undefined') {
    } else if (!contentEditableRef.current) {
    } else {
      if (pendingSelectionRef.current) {
        restoreCaret();
      } else if (isMultiSelect()) {
        const selection = window.getSelection();
        if (selection && selection.rangeCount === 1) {
          queueCaretRestore('multi-range-deferral');
        } else {
        }
      } else {
        restoreCaret();
      }
    }
  };

  const syncSuggestionOverlay = useEffectEvent(() => {
    checkCaretRestore();
    measureCaretRect();
  });

  // layout effect (not useEffect): re-measure and re-anchor the ghost in the same commit the
  // new suggestion text is computed, before the browser paints, so the ghost doesn't flutter
  // sideways for a frame while the anchor catches up to the typed character.
  useIsomorphicLayoutEffect(() => {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- useIsomorphicLayoutEffect is a real effect at runtime; the lint rule can't see through the indirection.
    syncSuggestionOverlay();
  }, [html]);

  return (
    <div className="relative" ref={editorWrapperRef}>
      <div
        contentEditable={!isReadOnly}
        aria-readonly={isReadOnly}
        ref={contentEditableRef}
        className={`
          text-[1.125rem] text-left ff-space-adjust wrap-break-word p-2
          rounded-sm ${isTopRightCornerSquare ? 'rounded-tr-none' : ''} whitespace-pre-wrap border
          outline-none resize-none caret-primary-200
          ${isReadOnly
            ? 'border-transparent'
            : 'min-h-[4.7rem] border-neutral-600 focus:border-primary-100 hover:border-primary-100 bg-primary-800'}`}
        style={{ lineHeight: lineHeight ? `${lineHeight}px` : '1.75rem' }}
        onInput={handleInput}
        onCopy={handleCopy}
        onPaste={handlePaste}
        onDrop={handleDrop}
        onDragStart={() => { dragStartedInEditorRef.current = true; }}
        onDragEnd={() => { dragStartedInEditorRef.current = false; }}
        onFocus={handleFocus}
        onBlur={() => passURLupdate()}
        dangerouslySetInnerHTML={{ __html: html }}
        spellCheck={false}
        inputMode="text"
        role="textbox"
        autoCorrect="off"
        autoCapitalize="characters"
        tabIndex={simpleInput || isReadOnly ? undefined : (idIndex === 0 ? 1 : 3)}
      />
      <SuggestionManager
        ref={suggestionManagerRef}
        name={name}
        lines={editorLinesRef.current.map((line) => line.html)}
        overlayElement={suggestionOverlayElement}
        topOffset={suggestionTopOffset}
        leftOffset={suggestionLeftOffset}
        showTabHint={supportsHardwareKeyboard}
        onAccept={insertAcceptedSuggestion}
        onReject={dismissSuggestion}
      />
    </div>
  );
}

MovesTextEditor.displayName = 'MovesTextEditor';
export default memo(MovesTextEditor);