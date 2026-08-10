'use client';

import React, { useImperativeHandle, useEffect, useLayoutEffect, memo, useEffectEvent, useRef } from 'react';
import sanitizeHtml from 'sanitize-html';

import parseTextInput from "../../composables/recon/validateTextInput";
import parsingToTokens, { degroup } from "../../composables/recon/validationToMoves";
import type { MovesDisplayValidation as MovesDisplayParsing } from "../../composables/recon/validationToMoves";
import type { MovesParsing } from "../../composables/recon/validateTextInput";
import updateURL from '../../composables/recon/updateURL';

import { customDecodeURL } from '../../composables/recon/urlEncoding';

import type { Token } from "../../composables/recon/validationToMoves";
import type { Suggestion } from '../../composables/recon/SimpleCubeInterpreter';
import { colorDict, highlightClass, editorAliases } from '../../utils/sharedConstants';
import {
  SuggestionManager,
  type SuggestionManagerHandle,
} from './SuggestionManager';

interface HTMLUpdateItem {
  html?: string;
  change: 'modified' | 'none';
}

// the ghost anchor is measured from the freshly painted text, so it must run before paint to
// stay in lockstep with the recalculated suggestion text. fall back to useEffect on the server.
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

const supportsHardwareKeyboard =
  typeof window !== 'undefined' && !window.matchMedia('(pointer: coarse)').matches;

interface EditorProps {
  name: string;
  trackMoves: (idIndex: number, lineIndex: number, caretIndex: number, moves: string[][]) => void;
  autofocus: boolean;
  moveHistory: React.RefObject<any>;
  updateHistoryBtns: () => void;
  html: string;
  setHTML: (html: string) => void;
  ref?: React.Ref<ImperativeRef>;
  initialContent?: string;
  lineHeight?: number;
  simpleInput?: boolean;
  iconColumnWidth?: number;
}

export interface ImperativeRef {
  undo: () => void;
  redo: () => void;
  transform: (html: string) => void;
  highlightMove: (moveIndex: number, lineIndex: number) => void;
  removeHighlight: () => void;
  getElement: () => HTMLDivElement | null;
  flushURLUpdate: () => void;
  setSuggestions: (suggestions: Suggestion[], lineIndex: number | null) => void;
}

function MovesTextEditor({
  name,
  trackMoves,
  autofocus,
  moveHistory,
  updateHistoryBtns,
  html,
  setHTML,
  ref,
  initialContent,
  lineHeight,
  simpleInput = false,
  iconColumnWidth = 0,
}: EditorProps) {

  const contentEditableRef = useRef<HTMLDivElement>(null);
  const editorWrapperRef = useRef<HTMLDivElement>(null);
  const moveOffsetRef = useRef<number>(0); // number of moves before and at the caret. 0 is at the start of the line before any moves.
  const lineOffsetRef = useRef<number>(0);
  const textboxMovesRef = useRef<string[][]>([['']]); // inner array for line of moves, outer array for all lines in textbox
  const suggestionManagerRef = useRef<SuggestionManagerHandle | null>(null);
  const restoreFrameRef = useRef<number | null>(null);

  const updateURLTimeout = useRef<NodeJS.Timeout | null>(null);

  const oldHTMLlinesRef = useRef<string[]>(['']);
  const oldLineMoveCounts = useRef<number[]>([0]);

  const idIndex = name === 'scramble' ? 0 : 1;
  const fallbackEditorTopInset = 9;
  const fallbackLineHeight = lineHeight || 28;

  const sanitizeConf = {
    allowedTags: ["b", "i", "br", "div"],
    allowedAttributes: { span: ["className", "class"] },
    nonTextTags: ['script', 'style', 'textarea', 'option', 'xmp'],
  };

  const localColorDict = useRef(JSON.parse(JSON.stringify(colorDict)));

  const handleInput = (shouldUpdateURL = true) => {
    if (!contentEditableRef.current) return;

    onInputChange();

    // Only debounce URL updates for user interactions, not initialization
    if (shouldUpdateURL) {
      updateURLTimeout.current ? clearTimeout(updateURLTimeout.current) : null;
      updateURLTimeout.current = setTimeout(passURLupdate, 500);
    }
  };

  const htmlToLineArray = (html: string) => {
    // strip properties from div tags
    html = html.replace(/<div[^>]*>/g, '<div>');

    // remove obvious nested divs
    html = html.replace(/<div><div>/g, '');
    html = html.replace(/<\/div><\/div>/g, '');

    // remove empty divs
    html = html.replace(/<div><\/div>/g, '');

    // replace newlines with div split
    // newlines are created by pressing shift+enter 
    // (chrome)
    html = html.replace(/\n/g, '<br></div><div>');
    // (firefox)
    html = html.replace(/>(<br>)<[^/]/g, '>$1</div><div><');

    // remove any old highlight spans and replace with primary text
    html = html.replace(new RegExp(`<span class="${highlightClass}">`, 'g'), '<span class="text-primary-100">');

    let lines = splitHTMLintoLines(html);
    lines = cleanLines(lines);

    // simpleInput disables multi-line input
    if (simpleInput && lines.length > 1) {
      const merged = lines
        .map((line) => line.replace(/^<div>/, '').replace(/<br><\/div>$/, ''))
        .join(' ');
      lines = cleanLines([merged]);
    }

    return lines;
  }

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

  const findHTMLchanges = (oldHTML: string[], newHTML: string[]): HTMLUpdateItem[] => {
    const htmlUpdateMatrix: HTMLUpdateItem[] = [];

    newHTML.forEach((line, index) => {
      const oldLine = oldHTML[index];

      // adds changed lines or lines that are not painted
      if (line !== oldLine || !line.includes('span')) {
        htmlUpdateMatrix.push({
          html: line,
          change: 'modified'
        });
      } else {
        htmlUpdateMatrix.push({
          change: 'none'
        });
      }
    });
    return htmlUpdateMatrix;
  }

  const findEndOfWordOnCaret = (parsing: [string, string, number?][], caretOffset: number): number => {
    // counts characters
    // increment caretOffset until it finds the end of the word
    const validWordTypes = ['move', 'rep', 'hashtag'];
    let i = caretOffset;
    try {
      for (i; i < parsing.length; i++) {
        const type = parsing[i][1];
        if (validWordTypes.includes(type)) {
          continue;
        } else {
          break;
        }
      }
    } catch (e) {
      console.error('Error in findEndOfMoveOnCaret:', e);
    }
    return i;

  };

  // Auto-substitution patterns for automatic text replacement
  const autoSubstitutions = [
    // Convert repeated moves to numbered notation (XX → X2)
    { pattern: /([UDFBLRMESudfblrxyz])(?!\s)\1/g, replacement: '$12' },
    
    // Convert X2X into X3 for r and l moves only. 
    // Other moves can't really be fingertricked as X3.
    { pattern: /([LRlr])2(?!\s)\1/g, replacement: (_match: string, move: string) => {
      const face = move.charAt(0);
      return `${face}3`;
    } },
    
    // UD/DU with double/triple moves - just add a space (before the grouping patterns catch them)
    { pattern: /([UD])([23])('?)([DU])/g, replacement: '$1$2$3 $4' },
    { pattern: /([UD])('?)([DU][23])/g, replacement: '$1$2 $3' },

    // Special UD/DU patterns
    { pattern: /U('?)(?!2)D('?)(?!2)\s/g, replacement: '(U$1 D$2) ' },
    { pattern: /D('?)(?!2)U('?)(?!2)\s/g, replacement: '(U$2 D$1) ' },
    
    // Xw → x conversion
    { pattern: /([UDFBLR])[wW]('?)(?!2)/g, 
      replacement: (_match: string, face: string, prime: string) =>
        `${face.toLowerCase()}${prime} ` 
    },
    
    // X -> x conversion
    { pattern: /([XYZ])/g,
      replacement: (_match: string, axis: string) => axis.toLowerCase()
    },


    // Fix missing spaces between moves
    { pattern: /([UDFBLRMESudfblrxyz])([23]?)('?)([UDFBLRMESudfblrxyzfblr])/g,
      replacement: (match: string, m1: string, num: string, prime: string, m2: string) => {
        // Skip if it's UD or DU (handled by special patterns above)
        if ((m1 === 'U' && m2 === 'D') || (m1 === 'D' && m2 === 'U')) return match;
        return `${m1}${num}${prime} ${m2}`;
      }
    },
    // Add more substitution patterns here as needed
  ];

  /**
   * Applies automatic text substitutions to the input text.
   * Skips text inside comment spans to preserve comments as-is.
   */
  const applyAutoSubstitutions = (html: string): [string, string] => {
    const caretMarker = '___CARET___';
    
    // Extract plain text from HTML, tracking caret position
    let workingHtml = html.replace(/<span id="caretNode"[^>]*>.*?<\/span>/i, caretMarker);
    let plainText = workingHtml.replace(/<[^>]+>/g, '');
    
    // detect comment ranges from plain text — works regardless of span attributes (class= or style=)
    const commentRanges: Array<{start: number, end: number}> = [];
    const commentPattern = /\/\/[^\n]*/g;
    let commentMatch;
    while ((commentMatch = commentPattern.exec(plainText)) !== null) {
      commentRanges.push({ start: commentMatch.index, end: commentMatch.index + commentMatch[0].length });
    }
    
    // Apply substitutions to non-comment portions
    let processedText = plainText;
    
    // Replace comment ranges with placeholders first, while positions
    // (computed against plainText) are still valid
    const commentPlaceholders: string[] = [];
    for (let i = commentRanges.length - 1; i >= 0; i--) {
      const range = commentRanges[i];
      if (range.end !== -1) {
        const placeholder = `\u0000\u0004${i}\u0005\u0000`;
        commentPlaceholders[i] = processedText.substring(range.start, range.end);
        processedText = processedText.substring(0, range.start) + placeholder + processedText.substring(range.end);
      }
    }
    
    // Protect caret marker from substitution patterns by temporarily replacing it
    // (done after comment placeholders since those use position-based indexing)
    const caretPlaceholder = '\u0000\u0001\u0002\u0003';
    processedText = processedText.replace(caretMarker, caretPlaceholder);
    
    // Apply all substitutions to the text (outside of comments)
    for (const sub of autoSubstitutions) {
      processedText = processedText.replace(sub.pattern, sub.replacement as any);
    }
    
    // Restore comments
    for (let i = 0; i < commentPlaceholders.length; i++) {
      processedText = processedText.replace(`\u0000\u0004${i}\u0005\u0000`, commentPlaceholders[i]);
    }
    
    // Restore caret marker
    processedText = processedText.replace(caretPlaceholder, caretMarker);
    
    // Restore caret marker position
    const modifiedText = processedText.replace(caretMarker, '');
    let modifiedHtml = processedText.replace(caretMarker, '<span id="caretNode"></span>');
    
    // Wrap in div if not already wrapped (preserve structure)
    if (!html.startsWith('<div>')) {
      modifiedHtml = `<div>${modifiedHtml}<br></div>`;
    } else {
      modifiedHtml = `<div>${modifiedHtml}<br></div>`;
    }
    
    return [modifiedText, modifiedHtml];
  };

  const getMovesFromTokens = (tokens: Token[]): string[] => {
    return tokens
      .filter((token) => token.type === 'move')
      .map((token) => token.value);
  }

  const handleLineModified = (updateItem: HTMLUpdateItem, i: number, lineMoveCounts: number[]): string => {
    let line = updateItem.html || '';

    // get html
    let text = line.replace(/<[^>]+>/g, '');

    [text, line] = applyAutoSubstitutions(line);

    const parsed = parseTextInput(text);

    const [newHTMLline, caretIndex] = updateLine(parsed, line);

    // get move and line offsets
    let moves: string[];
    if (caretIndex !== null) {
      let caretSplitIndex = findEndOfWordOnCaret(parsed, caretIndex);

      const tokensBeforeCaret = parsingToTokens(parsed.slice(0, caretSplitIndex)); // before and including move at caret
      const movesBeforeCaret: string[] = getMovesFromTokens(tokensBeforeCaret);
      moveOffsetRef.current = movesBeforeCaret.length; // not minus 1. 0 represents before any moves.

      // TODO: could be optimized.
      // Can't create tokensAfterCaret because the caret might be in the middle of a group 
      // [ex: (R U | R' U')2]
      // would need to create a parsed array that includes the caret,
      // then extract movesBeforeCaret.length from it
      moves = getMovesFromTokens(parsingToTokens(parsed));

      lineOffsetRef.current = i; // could be wrong in certain situations? (copy-paste)

    } else {
      // in the future, may need to expand to handle other types of tokens, such as hashtags
      moves = getMovesFromTokens(parsingToTokens(parsed));
    }

    lineMoveCounts[i] = moves.length;
    textboxMovesRef.current[i] = moves;

    return newHTMLline;
  };

  const handleHTMLlines = (htmlUpdateMatrix: HTMLUpdateItem[], lineMoveCounts: number[]): [string[], number[]] => {

    if (textboxMovesRef.current.length > htmlUpdateMatrix.length) {
      textboxMovesRef.current = textboxMovesRef.current.slice(0, htmlUpdateMatrix.length);
    }

    // iterate line by line and return painted HTML
    const paintedHTML = htmlUpdateMatrix.map((updateItem, i) => {

      if (!textboxMovesRef.current[i]) {
        textboxMovesRef.current[i] = [''];
      }

      if (lineMoveCounts[i] === undefined) {
        lineMoveCounts.push(0);
      }

      switch (updateItem.change) {
        case 'modified':
          return handleLineModified(updateItem, i, lineMoveCounts);
        case 'none':
        default:
          return oldHTMLlinesRef.current[i];
      }

    });

    return [paintedHTML, lineMoveCounts];
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

  const updateMoveHistory = (html: string, moveCountChanged: boolean) => {

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
      moveHistory.current.history[i] = [html, '<unchanged>'] :
      moveHistory.current.history[i] = ['<unchanged>', html];
  }

  const updateLine = (parsing: [string, string, number?][], line: string): [string, number | null] => {
    line = removeSpansExceptCaret(line);
    line = line.replace(/&nbsp;/g, ' ');

    let { updatedLine, caretIndex } = processParsing(parsing, line);

    return [updatedLine, caretIndex];
  }

  const processParsing = (parsing: [string, string, number?][], line: string): { updatedLine: string, caretIndex: number | null } => {
    let valIndex = 0;
    let valOffset = 0;
    let matchOffset = 0;

    let caretIndex: number | null = null;

    // find strings between ">" and "<" and modify each
    line = line.replace(/>[^<>]+<|caretNode">/g, (match) => { // matches the ">" of caretNode to ensure no user text match. 
      if (match === 'caretNode">') {
        caretIndex = valIndex;
        return 'caretNode">';
      }

      match = match.substring(1, match.length - 1); // remove ">" and "<"

      let remainingMatchLength = match.length;
      let paintedMatch = '';
      let prevNonspaceType = '';

      while (remainingMatchLength > 0) {
        if (!(parsing[valIndex] && parsing[valIndex][0])) {
          console.error(`ERROR: Parsing at ${valIndex} is undefined`);
          break;
        }
        const valLength = parsing[valIndex][0].substring(valOffset).length;
        const type = parsing[valIndex][1];
        let color = localColorDict.current[type as keyof typeof localColorDict.current];
        if (!color) {
          console.error(`Color not found for type: ${type}`);
          color = 'text-primary-100';
        }

        const allowableMatchOffset = valLength - valOffset;
        let matchEnd = matchOffset + remainingMatchLength;
        let oldOffset = matchOffset;

        if (remainingMatchLength > valLength) {
          matchEnd = allowableMatchOffset + matchOffset;
          remainingMatchLength -= allowableMatchOffset;
          matchOffset += allowableMatchOffset;
          valIndex++;
          valOffset = 0;
        } else if (remainingMatchLength < valLength) {
          console.error('ERROR: remainingMatchLength < valLength');
          matchOffset = 0;
          valOffset += remainingMatchLength;
          remainingMatchLength = 0;
        } else {
          matchOffset = 0;
          valOffset = 0;
          remainingMatchLength = 0;
          valIndex++;
        }

        const matchString = match.substring(oldOffset, matchEnd).replace(/\s/g, ' ');

        const typeContinuationWhitelist = ['move', 'comment', 'space', 'invalid', 'paren', 'rep', 'hashtag'];
        const isAllowableContinuation =
          (type === 'space'
            && typeContinuationWhitelist.includes(prevNonspaceType)
            && matchString);

        if (type === prevNonspaceType || isAllowableContinuation) {
          // append match to existing span
          paintedMatch = paintedMatch.replace(/<\/span>$/, matchString + '</span>');
        } else {
          // create new span
          paintedMatch += `<span class="${color}">${matchString}</span>`;
        }

        if (type !== 'space') {
          prevNonspaceType = type;
        }
      }

      paintedMatch = ">" + paintedMatch + "<";

      return paintedMatch;
    });

    return { updatedLine: line, caretIndex };
  }

  const removeSpansExceptCaret = (line: string): string => {
    let line2 = '';
    while (line2 !== line) {
      // strip any span except caretNode (including browser-injected style= spans)
      line2 = line.replace(/<span(?! id="caretNode")[^>]*>|<\/span>/g, '');
      line = line2;
    }
    line = line.replace(/<span id="caret.*?>/, '<span id="caretNode"></span>');
    return line;
  }

  const splitHTMLintoLines = (html: string): string[] => {
    const lines: string[] = [];

    const segments = splitByDiv(html);
    for (const segment of segments) {

      if (isDivBlock(segment)) {
        if (!divIsEmpty(segment)) lines.push(segment);
      } else {
        const outsideLines = splitByBr(segment);
        for (const line of outsideLines) {
          if (line !== "") lines.push(line);
        }
      }
    }
    return lines;
  }

  const splitByDiv = (html: string): string[] => {
    const segments: string[] = [];
    const divRegex = /<div>[\s\S]*?<\/div>/gi;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = divRegex.exec(html)) !== null) {
      if (match.index > lastIndex) {
        segments.push(html.substring(lastIndex, match.index));
      }
      segments.push(match[0]);
      lastIndex = divRegex.lastIndex;
    }
    if (lastIndex < html.length) {
      segments.push(html.substring(lastIndex));
    }
    return segments;
  }

  const isDivBlock = (segment: string): boolean => {
    return /^<div>[\s\S]*<\/div>$/i.test(segment);
  }

  const divIsEmpty = (divHtml: string): boolean => {

    // count caret node as content
    if (/<span id="caretNode">/i.test(divHtml)) return false;

    const inner = divHtml.replace(/^<div>([\s\S]*)<\/div>$/i, '$1');
    const withoutSpans = inner.replace(/<\/?span[^>]*>/gi, '');
    return withoutSpans === '';
  }

  const splitByBr = (segment: string): string[] => {
    const withoutSpaces = segment.replace(/\s/g, '');
    if (/^(<br>)+$/i.test(withoutSpaces)) {
      const count = (segment.match(/<br>/gi) || []).length;
      return Array(count).fill('<br>');
    } else {
      return segment.split(/<br>/gi);
    }
  }

  const onInputChange = () => {
    // core functionality of the input change sequence:
    // 1. Store existing caret node. Textbox caret is later restored via useEffect.
    // 2. The lines of in the textbox are found. Changes are pushed into updateMatrix.
    // 3. Based on updateMatrix, lines in textbox are painted by functional class (valid, invalid, paren, etc).
    // 4. Concurrently, get data for updating refs
    // moveCount is stored for the purposes of undo/redo. 
    // MoveHistory updated.
    // 5. Refs updated.
    // 6. State update queued.
    // 7. Cube visualization state passed to page through trackMoves().

    // 1
    setCaretSpanToCaret();

    // 2
    let htmlLines = htmlToLineArray(contentEditableRef.current!.innerHTML);
    const htmlUpdateMatrix = findHTMLchanges(oldHTMLlinesRef.current, htmlLines);

    // 4
    let lineMoveCounts = [...oldLineMoveCounts.current];
    lineMoveCounts = lineMoveCounts.slice(0, htmlLines.length);

    // 3, 4
    [htmlLines, lineMoveCounts] = handleHTMLlines(htmlUpdateMatrix, lineMoveCounts);
    const newHTMLlines = htmlLines.join('');

    // 4
    const moveCountChanged = isQuantifiableMoveChange(oldLineMoveCounts.current, lineMoveCounts);
    updateMoveHistory(newHTMLlines, moveCountChanged);

    // 5
    oldHTMLlinesRef.current = htmlLines;
    oldLineMoveCounts.current = lineMoveCounts;

    // 6
    setHTML(newHTMLlines);

    // in case live DOM and painted HTML are out of sync, update the live DOM and restore caret position
    if (newHTMLlines === html && contentEditableRef.current!.innerHTML !== newHTMLlines) {
      contentEditableRef.current!.innerHTML = newHTMLlines;
      setCaretToCaretSpan();
    }

    // 7
    trackMoves(idIndex, lineOffsetRef.current, moveOffsetRef.current, textboxMovesRef.current);
  };

  const cleanLines = (lines: string[]) => {

    // Keep an empty line around in the code to match the behavior of the contentEditable div, 
    // which always has at least one line.
    // Useful for handleEmptyLineSuggestions.
    lines = lines.length === 0 ? [''] : lines;

    lines = lines
      .map((line: string) => line.replace(/<\/?div>|<br>/g, ""))
      .map((line: string) => `<div>${line}<br></div>`)
      ;

    return lines;
  };

  /**
   * Sets the caret span (span with id=caretNode) to the current caret position
   */
  const setCaretSpanToCaret = () => {
    if (!contentEditableRef.current) {
      return;
    }
    if (moveHistory.current.undo_redo_done === false) {
      return;
    }

    const selection = window.getSelection();
    if (!selection) {
      return;
    }

    const isSelectionInEditor = contentEditableRef.current.contains(selection.focusNode);
    const selectionIsEditor = selection.focusNode === contentEditableRef.current;
    if (!isSelectionInEditor && !selectionIsEditor) {
      return;
    }

    const focusNode = selection.focusNode;

    // if focus is the outer contentEditable, keep the existing caret span
    if (focusNode === contentEditableRef.current) {
      return;
    }

    const existingCaretNodes = contentEditableRef.current.querySelectorAll('#caretNode');

    const caretNode = document.createElement('span');
    caretNode.id = 'caretNode';

    const range = document.createRange();
    let node: Node | null = focusNode || null;

    if (node === contentEditableRef.current
      && contentEditableRef.current.firstChild
      && contentEditableRef.current.firstChild.nodeType === Node.ELEMENT_NODE
      && (contentEditableRef.current.firstChild as Element).tagName === 'DIV'
    ) {
      node = contentEditableRef.current.firstChild;
    }

    // add new caretSpan, 
    // then remove old ones after to avoid any weird cleanup effects by browser
    if (node) {

      try {
        range.setStart(node, selection.focusOffset);
        range.setEnd(node, selection.focusOffset);
        range.insertNode(caretNode);

        // old caret node may contain new one, so preserve child nodes
        existingCaretNodes.forEach((node) => {
          if (node.childNodes.length > 0) {
            node.replaceWith(...Array.from(node.childNodes));
          } else {
            node.remove();
          }
        });
      } catch (e) {
        console.error('Error in testInsertCaretSpan:', e);
      }

      if (node.nodeType === Node.ELEMENT_NODE &&
        (node as Element).tagName === 'DIV' &&
        !(node as Element).querySelector('br')) {
        (node as Element).appendChild(document.createElement('br'));
      }

    }
  };

  /**
   * Sets the caret to the location of the caret span (span with id=caretNode)
   */
  const setCaretToCaretSpan = () => {
    if (document && document.activeElement !== contentEditableRef.current) {
      return;
    }

    const existingCaretSpan = contentEditableRef.current?.querySelector('#caretNode');
    if (existingCaretSpan) {
      const selection = window.getSelection();
      const range = document.createRange();
      range.setStart(existingCaretSpan, 0);
      range.collapse(true);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }

  const handleCopy = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = window.getSelection()?.toString() || '';
    e.clipboardData?.setData('text/plain', text);
  };

  const getAncestors = (node: Node, stopNode: Node): HTMLElement[] => {
    const ancestors: HTMLElement[] = [];
    let curr: Node | null = node;
    while (curr && curr !== stopNode) {
      if (curr.parentElement && curr.parentElement !== stopNode) {
        ancestors.push(curr.parentElement);
      }
      curr = curr.parentNode;
    }
    return ancestors;
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();

    let text = e.clipboardData.getData("text");
    let sanitizedText = sanitizeHtml(text, sanitizeConf)
      .replace(/’/g, "'")

      // this probably has some unfortunate edge cases with comments, 
      // but people shouldn't be making comments anyway
      .replace(/([UDFBLR])w/g, (_match, p1) => p1.toLowerCase());

    const selection = window.getSelection();
    if (selection && contentEditableRef.current) {
      const container = contentEditableRef.current;
      const range = selection.getRangeAt(0);

      const startAncestors = getAncestors(range.startContainer, container);
      const endAncestors = getAncestors(range.endContainer, container);
      const affected = new Set([...startAncestors, ...endAncestors]);

      range.deleteContents();

      // remove empty parent nodes
      affected.forEach((el) => {
        if (el.textContent?.trim() === "") {
          el.parentElement?.removeChild(el);
        }
      });

      const lines = sanitizedText.split("\n").reverse();
      lines.forEach((line, index) => {
        const tempElement = document.createElement("div");
        tempElement.innerHTML = line;

        // Add caret node to the last line
        if (index === 0) { // First element in reversed array is the last line
          const caretNode = document.createElement('span');
          caretNode.id = 'caretNode';
          tempElement.appendChild(caretNode);
        }

        range.insertNode(tempElement);
      });

      // existing selection invalid. Clear and reset to new caret.
      selection.removeAllRanges();
      setCaretToCaretSpan();
    }

    // setHTML(contentEditableRef.current!.innerHTML);
    onInputChange();
  };

  const passURLupdate = () => {

    // don't allow dummy text editors to update the URL
    if (name !== 'scramble' && name !== 'solution') return;

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

  /**
   * Parses the current caret state and returns structured data.
   * Returns null if the state is invalid or incomplete.
   */
  const parseCaretState = () => {

    if (!contentEditableRef.current) return null;
    if (isMultiSelect()) return null;

    const prevHTML = contentEditableRef.current.innerHTML;

    setCaretSpanToCaret();

    // check if insertion was a no-op
    if (prevHTML === contentEditableRef.current.innerHTML) {
      return null;
    }

    // parse HTML into structured lines
    const lines = htmlToLineArray(contentEditableRef.current.innerHTML);

    return {
      element: contentEditableRef.current,
      lines,
      html: contentEditableRef.current.innerHTML
    };
  };

  /**
   * Updates refs and state based on parsed caret state.
   * Calculates move and line offsets, updates HTML and tracking.
   */
  const setCaretState = (state: NonNullable<ReturnType<typeof parseCaretState>>) => {
    const { element, lines } = state;
    let caretLine = '';
    let caretOffset = 0;

    const newLineOffset = lines.findIndex((line) => line.includes('<span id="caretNode">'));

    if (newLineOffset === -1) return;

    lineOffsetRef.current = newLineOffset;

    caretLine = lines[lineOffsetRef.current];
    const lineTextArray = caretLine?.match(/>[^<>]+<|caretNode">/g);

    if (!lineTextArray) return;

    let fullRawText = '';
    let caretReached = false;

    // find number of characters before caret and get full text for parsing    
    for (let text of lineTextArray) {

      if (text === 'caretNode">') {
        caretReached = true;
        continue;
      }

      text = text.substring(1, text.length - 1);
      fullRawText += text;

      // accumulate characters before caret
      if (!caretReached) {
        caretOffset += text.length;
      }
    }
    let parsing = parseTextInput(fullRawText);

    let i = findEndOfWordOnCaret(parsing, caretOffset);

    // calculate number of moves before caret
    let tokens = parsingToTokens(parsing.slice(0, i));
    let moveTokens = tokens.filter((token) => token.type === 'move').map((token) => token.value);
    moveOffsetRef.current = moveTokens.length;

    // text outside a painted span means the html is still being loaded and parsed by
    // onInputChange. Setting it now would cause a race condition.
    const unpaintedText = element.innerHTML
      .replace(/<span id="caretNode">.*?<\/span>/i, '')
      .replace(/<span class="[^"]+">[^<]*<\/span>/g, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim();

    if (!unpaintedText) {
      // Clean html for case where user changed caret during move replay
      const noHighlightHTML = element.innerHTML.replace(new RegExp(`<span class="${highlightClass}">`, 'g'), '<span class="text-primary-100">');
      setHTML(noHighlightHTML);
    }
    trackMoves(idIndex, lineOffsetRef.current, moveOffsetRef.current, textboxMovesRef.current);
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
      const spans = lineDiv.querySelectorAll('span:not(#caretNode)');
      const lastSpan = spans[spans.length - 1] as HTMLElement | undefined;
      const box = (lastSpan ?? lineDiv).getBoundingClientRect();
      rect = new DOMRect(lastSpan ? box.right : box.left, box.top, 0, box.height);
    }

    const wrapperRect = wrapper.getBoundingClientRect();
    // push to the manager imperatively. updating editor state here would re-render the
    // contentEditable and reset the caret (React re-applies dangerouslySetInnerHTML).
    // height is the caret box height so the ghost text aligns to the typed text, not the full
    // line box (which would center the smaller glyphs lower than the typed text).
    suggestionManagerRef.current?.updateCaretRect(
      rect.left - wrapperRect.left,
      rect.top - wrapperRect.top,
      rect.height,
    );
  };

  /**
   * Handles when user changes caret position.
   * Gets moveOffset and lineOffset, validates text, and updates move history.
   */
  const handleCaretChange = () => {
    const state = parseCaretState();
    if (!state) return;
    setCaretState(state);
    measureCaretRect();
  };

  // focusing without moving the caret span leaves parseCaretState a no-op, so suggestions for
  // the line the caret already sits on would never be generated.
  const handleFocus = () => {
    const state = parseCaretState();
    if (state) {
      setCaretState(state);
    } else {
      trackMoves(idIndex, lineOffsetRef.current, moveOffsetRef.current, textboxMovesRef.current);
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

    const isCaretNode = (node: Node | null) => !!node && (
      (node.nodeType === Node.ELEMENT_NODE && (node as Element).id === 'caretNode')
      || node.parentElement?.id === 'caretNode'
    );
    const collapseNode = !isCaretNode(selection.focusNode)
      ? selection.focusNode
      : !isCaretNode(selection.anchorNode)
        ? selection.anchorNode
        : null;
    const collapseOffset = !isCaretNode(selection.focusNode)
      ? selection.focusOffset
      : selection.anchorOffset;

    if (!collapseNode) return;

    selection.collapse(collapseNode, collapseOffset);
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

  const handleSuggestionReject = () => {
    if (name === 'scramble') return;
    // the preview is an overlay, so dismissing is pure state — no HTML surgery.
    suggestionManagerRef.current?.dismissSuggestion();
  };

  const handleCommand = (e: KeyboardEvent) => {
    if (e.key === 'Tab' && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
      const manager = suggestionManagerRef.current;
      const canAcceptSuggestion = manager?.canAcceptSuggestion() ?? false;
      const canShowSuggestion = manager?.canShowSuggestion() ?? false;

      if (!canShowSuggestion && !canAcceptSuggestion) {
        return;
      }

      e.preventDefault();
      if (canAcceptSuggestion) {
        handleSuggestionAccept();
        return;
      }
      // re-show after the user previously dismissed with Esc
      manager?.showSuggestion();
    }

    if (e.key === 'Escape' && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
      handleSuggestionReject();
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
   * Handle tab key confirmation of any suggested text.
   */
  const handleSuggestionAccept = () => {
    if (!contentEditableRef.current) return;
    if (name === 'scramble') return; // no suggestions in scramble

    const remaining = suggestionManagerRef.current?.getAcceptText();
    if (!remaining) return;

    const targetLineIndex = lineOffsetRef.current;

    runAfterFocus(() => {
      const root = contentEditableRef.current;
      if (!root) return;

      // append at the end of the active line — where the ghost is anchored — rather than at
      // the live caret, which may have been moved back into the line. the remaining string
      // already carries its own leading space when one is needed, so it inserts verbatim.
      const lineDivs = Array.from(root.children).filter(
        (child): child is HTMLDivElement => child instanceof HTMLDivElement,
      );
      const lineDiv = lineDivs[targetLineIndex] ?? lineDivs[lineDivs.length - 1];
      if (!lineDiv) return;

      root.querySelectorAll('#caretNode').forEach((node) => node.remove());
      const caret = document.createElement('span');
      caret.id = 'caretNode';

      const br = lineDiv.querySelector('br');
      lineDiv.insertBefore(document.createTextNode(remaining), br ?? null);
      lineDiv.insertBefore(caret, br ?? null);

      setCaretToCaretSpan();
      handleInput();
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

  const simpleRestore = (html: string) => {
    contentEditableRef.current!.innerHTML = html;
    updateHistoryBtns();
    setCaretToCaretSpan();
    moveHistory.current.status = 'in_progress_one';
    handleInput();
    moveHistory.current.status = 'ready';
  };

  const simpleUndo = () => {
    const history = moveHistory.current.history;
    let index = moveHistory.current.index;
    if (index < 1) return;
    moveHistory.current.index = --index;

    let prevHTML = history[index][idIndex];
    while (prevHTML === '<unchanged>' && index > 0) {
      prevHTML = history[--index][idIndex];
    }

    simpleRestore(prevHTML);
  };

  const simpleRedo = () => {
    const history = moveHistory.current.history;
    let index = moveHistory.current.index;
    if (index + 1 > moveHistory.current.MAX_HISTORY || index + 1 >= history.length) return;
    moveHistory.current.index = ++index;

    let nextHTML = history[index][idIndex];
    while (nextHTML === '<unchanged>' && index + 1 < history.length) {
      nextHTML = history[++index][idIndex];
    }

    simpleRestore(nextHTML);
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

    let prevHTML = history[index][idIndex];
    while (prevHTML === '<unchanged>' && index > 0) {
      index--;
      //don't update moveHistory.current.index here. While loop would cause skips.
      prevHTML = history[index][idIndex];
    }

    contentEditableRef.current!.innerHTML = prevHTML;
    updateHistoryBtns();
    setCaretToCaretSpan(); // updating contentEditableRef causes refresh which misplaces caret
    handleInput(); // updates URL, oldlineCounts, oldHTMLlines, and moveAnimationTimes

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

    let nextHTML = history[index][idIndex];
    while (nextHTML === '<unchanged>' && index > moveHistory.current.MAX_HISTORY) {
      index++;
      nextHTML = history[index][idIndex];
    }

    contentEditableRef.current!.innerHTML = nextHTML;
    updateHistoryBtns();
    setCaretToCaretSpan();
    handleInput();

    incrementStatus('success');
  }

  const handleTransform = (newHTML: string) => {
    contentEditableRef.current!.innerHTML = newHTML;
    oldLineMoveCounts.current = [-1]; // ensures that moveHistory contains transformed moves
    setCaretToCaretSpan();
    handleInput();
  }

  const findEndOfMove = (degroupedParsing: MovesDisplayParsing[], startIndex: number): number => {
    let i = startIndex;
    while (i < degroupedParsing.length && degroupedParsing[i][1] === 'move') {
      i++;
    }
    return i;
  }

  const handleRemoveHighlight = () => {
    if (!contentEditableRef.current) return;
    if (name === 'scramble') return; // no highlights in scramble
    const noHighlightHTML = contentEditableRef.current.innerHTML.replace(new RegExp(`<span class="${highlightClass}">`, 'g'), '<span class="text-primary-100">');
    contentEditableRef.current.innerHTML = noHighlightHTML;
  }

  /**
   * Runs through parsing array until it finds moveIndex and returns moveDisplayIndex of that move.
   * @param degroupedParsing 
   * @returns moveDisplayIndex
   */
  const findMoveDisplayIndex = (degroupedParsing: MovesDisplayParsing[], moveIndex: number): number => {
    let moveCounter = 0;
    for (let i = 0; i < degroupedParsing.length; i++) {

      const type = degroupedParsing[i][1];
      if (type !== 'move') {
        continue;
      } else {
        if (moveCounter === moveIndex - 1) { // moveIndex of 0 is before first move
          return (degroupedParsing[i][3] + 1);
        }
        moveCounter++;
        i = findEndOfMove(degroupedParsing, i);
      }
    }
    return -1; // not found
  }

  const addHighlightParsing = (parsing: MovesParsing[], moveDisplayIndex: number): MovesParsing[] => {
    if (parsing.length === 0) {
      console.warn('No moves to highlight');
      console.info('parsing:', parsing);
      return parsing;
    }

    if (moveDisplayIndex < 0) {
      // acceptably occurs when moveIndex is placed before the first move
      return parsing;
    }

    const highlightedParsing: MovesParsing[] = [];
    let moveCounter = 0;
    let lastType = ''
    for (let i = 0; i < parsing.length; i++) {
      const type = parsing[i][1];
      if (type === 'move' && lastType !== 'move') {
        moveCounter++;
      }
      lastType = type;
      if (type === 'move' && moveCounter === moveDisplayIndex) {
        highlightedParsing.push([parsing[i][0], 'highlight', parsing[i][2]]);
      } else {
        highlightedParsing.push([parsing[i][0], type, parsing[i][2]]);
      }
    }
    return highlightedParsing
  }

  /**
   * Highlights the requested move in the solution text editor.
   */
  const handleHighlightMove = (moveIndex: number, lineIndex: number) => {

    if (!contentEditableRef.current) return;
    if (name === 'scramble') return;
    if (moveIndex < 0 || lineIndex < 0) return; // invalid move index or line index

    // should only highlight if moves have been painted
    if (!contentEditableRef.current.innerHTML.includes('<span')) return;

    let lines = htmlToLineArray(contentEditableRef.current.innerHTML);

    if (lineIndex >= lines.length) return; // invalid line index
    const line = lines[lineIndex];

    // iterate through valid spans, counting moves, and highlighting the move at moveIndex
    const text = line.replace(/<[^>]+>/g, '');
    const parsing = parseTextInput(text);
    const newVal = degroup(parsing, true) as MovesDisplayParsing[];
    const moveDisplayIndex = findMoveDisplayIndex(newVal, moveIndex);

    const highlightedParsing: MovesParsing[] = addHighlightParsing(parsing, moveDisplayIndex);

    // apply highlighted class. Do some cleanup.
    let [updatedLine, _] = updateLine(highlightedParsing, line);

    lines[lineIndex] = updatedLine;

    // Update the contentEditable with highlighted content
    const newHTML = lines.join('');
    setHTML(newHTML);
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

    transform: (transformedHTML: string) => {
      handleTransform(transformedHTML);
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
    }
  }));

  const handleSelectionChangeEvent = useEffectEvent(() => {
    handleCaretChange();
  });

  const handleMouseUpEvent = useEffectEvent((event: MouseEvent) => {
    handleMouseUp(event);
  });

  const handleCommandEvent = useEffectEvent((event: KeyboardEvent) => {
    handleCommand(event);
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
      const formattedHTML = lines.map(line => `<div>${line}<br></div>`).join('');
      contentEditableRef.current.innerHTML = formattedHTML;

    } else if (initialContent && !otherEditorText) {
      // if initial content (such as scramble of day) gets passed in,
      // pass it in as pre-formatted html
      contentEditableRef.current.innerHTML = initialContent;
    }

    // Run for syntax highlighting, but skip URL update since we just loaded from URL
    handleInput(false);


    if (autofocus && editorText && !otherEditorText) { // TODO: `&& !otherURLtext` isn't desired, but an unknown bug causes animation desync otherwise.
      // adds caretNode span, which then is processed by onInputChange
      const selection = window.getSelection();
      const range = document.createRange();
      const caretNode = document.createElement('span');
      caretNode.id = 'caretNode';
      range.selectNodeContents(contentEditableRef.current);
      range.collapse(false);
      range.insertNode(caretNode);
      selection?.removeAllRanges();
      selection?.addRange(range);
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

    return () => {

      document.removeEventListener('selectionchange', handleSelectionChangeEvent);
      document.removeEventListener('mouseup', handleMouseUpEvent);
      document.removeEventListener('keydown', handleCommandEvent);

      cleanupEditorEffect();

    };
  }, []);

  const queueCaretRestore = (origin: string, retries = 0) => {
    restoreFrameRef.current = requestAnimationFrame(() => {
      restoreFrameRef.current = null;

      if (!contentEditableRef.current) {
        // logCaretRestoreExit(`callback missing contentEditableRef (${origin})`);
        return;
      }

      if (isMultiSelect()) {
        const selection = window.getSelection();
        if (selection && selection.rangeCount === 1 && retries < 2) {
          // logCaretRestoreExit(`callback selection multi-range (${origin}); retrying`);
          queueCaretRestore(origin, retries + 1);
          return;
        }

        // logCaretRestoreExit(`callback selection remained multi-range (${origin})`);
        return;
      }

      setCaretToCaretSpan();
    });
  };


  const checkCaretRestore = () => {
    if (typeof window === 'undefined') {
      // logCaretRestoreExit('window undefined');
      // } else  if (restoreFrameRef.current !== null) {
      //   logCaretRestoreExit('frame already scheduled');
    } else if (!contentEditableRef.current) {
      // logCaretRestoreExit('missing contentEditableRef');
      // } else if (document.activeElement !== contentEditableRef.current) {
      //   logCaretRestoreExit('editor not focused');
    } else {
      if (isMultiSelect()) {
        const selection = window.getSelection();
        if (selection && selection.rangeCount === 1) {
          // logCaretRestoreExit('selection is multi-range; retrying next frame');
          queueCaretRestore('multi-range-deferral');
        } else {
          // logCaretRestoreExit('selection is multi-range');
        }
      } else {
        // schedule caret restore after render so native selection follows caret span
        // queueCaretRestore('initial');
        setCaretToCaretSpan();
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
        contentEditable
        ref={contentEditableRef}
        className={`
          text-[1.125rem] text-left ff-space-adjust break-normal p-2
          min-h-[4.7rem]
          rounded-sm whitespace-pre-wrap
          border border-neutral-600 focus:border-primary-100 hover:border-primary-100
          outline-none resize-none caret-primary-200 bg-primary-800 `}
        style={{ lineHeight: lineHeight ? `${lineHeight}px` : '1.75rem' }}
        onInput={() => handleInput(true)}
        onCopy={handleCopy}
        onPaste={handlePaste}
        onFocus={handleFocus}
        onBlur={() => passURLupdate()}
        dangerouslySetInnerHTML={{ __html: html }}
        spellCheck={false}
        inputMode="text"
        role="textbox"
        autoCorrect="off"
        autoCapitalize="characters"
        tabIndex={simpleInput ? undefined : (idIndex === 0 ? 1 : 3)}
      />
      <SuggestionManager
        ref={suggestionManagerRef}
        name={name}
        activeLineIndex={lineOffsetRef.current}
        lines={oldHTMLlinesRef.current}
        overlayElement={suggestionOverlayElement}
        topOffset={suggestionTopOffset}
        leftOffset={suggestionLeftOffset}
        showTabHint={supportsHardwareKeyboard}
        onAcceptSuggestion={handleSuggestionAccept}
        onRejectSuggestion={handleSuggestionReject}
      />
    </div>
  );
}

MovesTextEditor.displayName = 'MovesTextEditor';
export default memo(MovesTextEditor);