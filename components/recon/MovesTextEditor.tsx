'use client';

import React, { useImperativeHandle, useEffect, Suspense, memo } from 'react';
import { useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import sanitizeHtml from 'sanitize-html';

import parseTextInput from "../../composables/recon/validateTextInput";
import parsingToTokens, { degroup } from "../../composables/recon/validationToMoves";
import type { MovesDisplayValidation as MovesDisplayParsing } from "../../composables/recon/validationToMoves";
import type { MovesParsing } from "../../composables/recon/validateTextInput";
import updateURL from '../../composables/recon/updateURL';

import { customDecodeURL } from '../../composables/recon/urlEncoding';

import type { Token } from "../../composables/recon/validationToMoves";
import { SuggestionBox } from './SuggestionBox';
import type { Suggestion } from '../../composables/recon/CubeInterpreter';
import { colorDict, highlightClass } from '../../utils/sharedConstants';

interface HTMLUpdateItem {
  html?: string;
  change: 'modified' | 'none' | 'suggestion';
}

const supportsHardwareKeyboard =
  typeof window !== 'undefined' && !window.matchMedia('(pointer: coarse)').matches;



const EditorLoader = ({ 
  editorRef: contentEditableRef, 
  handleInput, 
  name, 
  autofocus 
}: { 
  editorRef: React.RefObject<any>, 
  handleInput: () => void, 
  name: string, 
  autofocus: boolean
})  => {
  // useSearchParams is a hook. Storing searchParams here prevents it from being called again and causing reloads.
  const searchParams = useSearchParams();
  
  const handleStartupProcess = () => {
    const urlText = searchParams.get(name);
    const otherID = name === 'scramble' ? 'solution' : 'scramble';
    const otherURLtext = searchParams.get(otherID);

    if (urlText) {
      let decodedText = decodeURIComponent(customDecodeURL(urlText));
      contentEditableRef.current.innerText = decodedText;
    }

    // needs to be run regardless to get syntax highlighting on text editors not using URL params
    handleInput();

    
    if (autofocus && urlText && !otherURLtext) { // TODO: `&& !otherURLtext` isn't desired, but an unknown bug causes animation desync otherwise.
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

  };

  useEffect(() => {
    handleStartupProcess();
  }, []);

  return null;
}

interface EditorProps {
  name: string;
  trackMoves: (idIndex: number, lineIndex: number, caretIndex: number, moves: string[][]) => void;
  autofocus: boolean;
  moveHistory: React.MutableRefObject<any>;
  updateHistoryBtns: () => void;
  html: string;
  setHTML: (html: string) => void;
  ref?: React.Ref<ImperativeRef>;
  suggestionsRef?: React.MutableRefObject<Suggestion[] | undefined>;
}

export interface ImperativeRef {
  undo: () => void;
  redo: () => void;
  transform: (html: string) => void;
  highlightMove: (moveIndex: number, lineIndex: number) => void;
  removeHighlight: () => void;
  getElement: () => HTMLDivElement | null;
  showSuggestion: (alg: string) => void;
  dismissSuggestion: () => void;
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
  suggestionsRef
}: EditorProps) {
  
  const suggestions = suggestionsRef?.current;
  const contentEditableRef = useRef<HTMLDivElement>(null);
  const moveOffsetRef = useRef<number>(0); // number of moves before and at the caret. 0 is at the start of the line before any moves.
  const lineOffsetRef = useRef<number>(0);
  const textboxMovesRef = useRef<string[][]>([['']]); // inner array for line of moves, outer array for all lines in textbox 
  const selectedSuggestionRef = useRef<{ lineIndex: number,  full: string; remaining: string } | null>(null);
  const suggestionStateRef = useRef<'showing' | 'dismissed' | 'accepted'>('showing');
  const suggestionSignatureRef = useRef<string>(''); // for knowing when to show new suggestions, should previous suggestions be dismissed
  const restoreFrameRef = useRef<number | null>(null);

  const updateURLTimeout = useRef<NodeJS.Timeout | null>(null);

  const oldHTMLlinesRef = useRef<string[]>(['']);
  const oldLineMoveCounts = useRef<number[]>([0]);

  const idIndex = name === 'scramble' ? 0 : 1;

  const sanitizeConf = {
    allowedTags: ["b", "i","br","div"],
    allowedAttributes: { span: ["className","class"]}
  };

  const localColorDict = useRef(JSON.parse(JSON.stringify(colorDict)));

  /**
   * Helper function. Should show as unused when deploying.
   */
  const log = (...args: any[]) => {

    const ONLY_LOG_SOLUTION = true;

    if (ONLY_LOG_SOLUTION && idIndex === 0) return;
    console.log(idIndex, "[MovesTextEditor]", ...args);
  }

  const handleInput = () => {
    if (!contentEditableRef.current) return;

    onInputChange();
    updateURLTimeout.current ? clearTimeout(updateURLTimeout.current) : null;
    updateURLTimeout.current = setTimeout(passURLupdate, 500);
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
    
    return lines;
  }
  
  const findHTMLchanges = (oldHTML: string[], newHTML: string[]): HTMLUpdateItem[] => {
    const htmlUpdateMatrix: HTMLUpdateItem[] = [];
    const suggestionClass = colorDict['suggestion'];

    newHTML.forEach((line, index) => {
      const oldLine = oldHTML[index];
      
      // Check if line contains suggestions and is active line
      if (line.includes(`class="${suggestionClass}"`) && selectedSuggestionRef.current?.lineIndex === index) {
        htmlUpdateMatrix.push({
          html: line,
          change: 'suggestion'
        });
      } else if (line.includes(`class="${suggestionClass}"`) && selectedSuggestionRef.current?.lineIndex !== index) {
        suggestionStateRef.current = 'dismissed';
        htmlUpdateMatrix.push({
          html: line
            .replace(/<img[^>]*>/g, '')
            .replace(new RegExp(`<span class="${suggestionClass}">.*<\\/span>`, 'g'), 
              (match) => match.includes('id="caretNode"') ? '<span id="caretNode"></span>' : ''
            ),
          change: 'modified'
        });
      } else if (line !== oldLine || !line.includes('span')) { //adds changed lines or lines that are not painted
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

  const getMovesFromTokens = (tokens: Token[]): string[] => {
    return tokens
      .filter((token) => token.type === 'move')
      .map((token) => token.value);
  }

  const handleLineModified = (updateItem: HTMLUpdateItem, i: number, lineMoveCounts: number[]): string => {
    const line = updateItem.html || '';

    // get html
    const text = line.replace(/<[^>]+>/g, '');
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

  const handleLineSuggestion = (updateItem: HTMLUpdateItem, index: number, lineMoveCounts: number[]): string => {
    
    if (selectedSuggestionRef.current === null) {
      selectedSuggestionRef.current = { lineIndex: -1, full: '', remaining: '' };
    }
    
    const line = updateItem.html || '';
    const text = line.replace(/<[^>]+>/g, '');

    // try to remove duplicate text in suggestion and manual entry
    let acceptedSuggestion = '';
    let remainingSuggestion = '';

    const textNotSuggestion = text.replace(selectedSuggestionRef.current.remaining, '');

    let isSuggestionMatch = !!selectedSuggestionRef.current.full; // if no suggestion, no match possible
    (isSuggestionMatch && textNotSuggestion.split('').forEach((char, index) => {
      if (!selectedSuggestionRef.current || selectedSuggestionRef.current.full[index] !== char) {
        isSuggestionMatch = false;
        return;
      }
    }));
    if (isSuggestionMatch) {
      acceptedSuggestion = textNotSuggestion;
      remainingSuggestion = selectedSuggestionRef.current.full.replace(acceptedSuggestion, '');
    }

    // get html without suggestion or image
    const htmlWithoutSuggestion = line.replace(selectedSuggestionRef.current.remaining, '').replace(/<img[^>]*>/g, '');
    const validatedHTML = handleLineModified({html: htmlWithoutSuggestion, change: 'modified'}, index, lineMoveCounts);
    const suggestionClass = colorDict['suggestion'];
    const tabImageHTML = supportsHardwareKeyboard
      ? `<img src="/tab.svg" alt="Press Tab" style="display: inline; pointer-events-none; width: 51px; height: 20px; margin-left: 8px; margin-bottom: 4px; vertical-align: middle;" />`
      : '';

    const suggestionHTML = remainingSuggestion ? `<span class="${suggestionClass}">${remainingSuggestion}</span>${tabImageHTML}` : '';
    const combinedHTML = validatedHTML.replace(/<br><\/div>$/, `${suggestionHTML}<br></div>`);
    selectedSuggestionRef.current = { 
      lineIndex: index,
      full: selectedSuggestionRef.current.full,
      remaining: remainingSuggestion 
    };
    return combinedHTML;
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
        case 'suggestion':
          return handleLineSuggestion(updateItem, i, lineMoveCounts);
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
      line2 = line.replace(/<span class[^>]+>|<\/span>/g, '');
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
    // 6. Contenteditable div's and move history buttons' state updated.
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
    // suggestionStateRef.current = 
    //   // if there's any change after accept, show suggestions again.
    //   suggestionStateRef.current === 'accepted' ? 'showing' : suggestionStateRef.current;
    suggestionStateRef.current = 'showing';

    // 6
    updateHistoryBtns();
    setHTML(newHTMLlines);

    // 7
    trackMoves(idIndex, lineOffsetRef.current, moveOffsetRef.current, textboxMovesRef.current);
  };

  const cleanLines = (lines: string[]) => {

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
    // if (document.activeElement !== contentEditableRef.current) return;
    const isCaretSpan = !!contentEditableRef.current?.querySelector('#caretNode');
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
      .replace(/([UDFBLR])w/g, (match, p1) => p1.toLowerCase());
  
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
  
    setHTML(contentEditableRef.current!.innerHTML);
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

    const suggestionClass = colorDict['suggestion'];
    
    // TODO: try just cloning the node and removing suggestions from that
    const removeSuggestions = (element: HTMLElement) => {
      const removedNodes: Array<{ parent: Node; node: Node; nextSibling: Node | null }> = [];
      const suggestionSpans = element.querySelectorAll(`span.${suggestionClass}`);
      suggestionSpans.forEach((span) => {
        const parent = span.parentNode;
        if (parent) {
          removedNodes.push({ parent, node: span, nextSibling: span.nextSibling });
          parent.removeChild(span);
        }
      });

      const tabImages = element.querySelectorAll('img[src="/tab.svg"]');
      tabImages.forEach((img) => {
        const parent = img.parentNode;
        if (parent) {
          removedNodes.push({ parent, node: img, nextSibling: img.nextSibling });
          parent.removeChild(img);
        }
      });
      return removedNodes;
    };

    // Temporarily remove inline suggestion UI, capture text (with newlines), restore nodes.
    const removedNodes = removeSuggestions(root);
    const text = root.innerText || '';

    removedNodes.reverse().forEach(({ parent, node, nextSibling }) => {
      if (nextSibling && nextSibling.parentNode === parent) {
        parent.insertBefore(node, nextSibling);
      } else {
        parent.appendChild(node);
      }
    });

    updateURL(name, text);
  };

  const isMultiSelect = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return false;
  
    const range = selection.getRangeAt(0);
    return !range.collapsed && (range.startContainer !== range.endContainer || range.startOffset !== range.endOffset);
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
    for (let text of lineTextArray){
      
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

    // Clean html for case where user changed caret during move replay
    const noHighlightHTML = element.innerHTML.replace(new RegExp(`<span class="${highlightClass}">`, 'g'), '<span class="text-primary-100">');

    const hasStyling = /<span class="[^"]+">[^<]+<\/span>/.test(noHighlightHTML);
    // if no styling, we assume that the html is still being loaded and parsed by onInputChange
    // otherwise we'd get a race condition
    if (hasStyling) {
      setHTML(noHighlightHTML);
    }
    trackMoves(idIndex, lineOffsetRef.current, moveOffsetRef.current, textboxMovesRef.current);
  };

  /**
   * Handles when user changes caret position.
   * Gets moveOffset and lineOffset, validates text, and updates move history.
   */
  const handleCaretChange = () => {
    // Parse the current state - returns null if invalid
    const state = parseCaretState();
    if (!state) return;

    setCaretState(state);
  };

  const handleSuggestionRequest = (suggestionIndex: number) => {
    const suggestion = suggestions?.[suggestionIndex];
    if (suggestion) {
      handleShowSuggestion(suggestion.alg);
    }
  }

  const handleSuggestionReject = () => {
    if (name === 'scramble') return;

    const suggestionClass = colorDict['suggestion'];
    const regex = new RegExp(`<span class="${suggestionClass}">[^<]*<\/span>(<img[^>]*>)?`, 'g');

    runAfterFocus(() => {
      if (!contentEditableRef.current) return;
      const isSuggestions = regex.test(contentEditableRef.current.innerHTML);
      if (!isSuggestions || !selectedSuggestionRef.current) return;

      const linesWithoutSuggestions = removeAllSuggestions();
      const htmlWithoutSuggestions = linesWithoutSuggestions.join('');
      contentEditableRef.current.innerHTML = htmlWithoutSuggestions;

      setCaretToCaretSpan();
      handleInput();
    });
    
    // sus. How can we better prevent suggestionBox from showing? Setting a ref to dismissed doesn't update state.
    selectedSuggestionRef.current = {lineIndex: -1, full: '', remaining: '' };
    
    suggestionStateRef.current = 'dismissed';
    
  };

  const handleCommand = (e: KeyboardEvent) => {
    if (e.key === 'Tab' && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
      const canShowSuggestion = !selectedSuggestionRef.current?.full && suggestionsRef && suggestionsRef.current && suggestionsRef.current.length > 0;
      const canAcceptSuggestion = selectedSuggestionRef.current !== null && selectedSuggestionRef.current.remaining !== '';

      if (!canShowSuggestion && !canAcceptSuggestion) {
        return;
      }

      e.preventDefault();
      if (canShowSuggestion && suggestionsRef.current) {
        suggestionStateRef.current = 'showing';
        // TODO: difficult to say when tab should jump them to the next element instead.
        // Showing handleShowSuggestion may not generate a suggestion and 
        // user may expect to be able to tab out, or may not.
        handleShowSuggestion(suggestionsRef.current[0].alg || '');
        return;
      }
      if (canAcceptSuggestion) {
        handleSuggestionAccept();
        return;
      }
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

    if (suggestions && suggestions.length > 0 && suggestionStateRef.current === 'showing') {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
      }
    }
  };

  const statusTransitions: any = {
    ready: { start: 'in_progress_one'},
    in_progress_one: { fail: 'checked_one', success: 'success_one' },
    checked_one: { fail: 'ready', success: 'ready', start: 'in_progress_two' },
    success_one: { start: 'ready'},
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
    
    const suggestionClass = colorDict['suggestion'];
    const moveClass = colorDict['move'];
    
    runAfterFocus(() => {
      if (!contentEditableRef.current) return;

      let lines = oldHTMLlinesRef.current;

      // Find the line with the suggestion and replace it
      lines = lines.map(line => {
        if (!line.includes(`class="${suggestionClass}"`)) {
          return line;
        }

        // remove all caret nodes from this line
        let updatedLine = line.replace(/<span id="caretNode"><\/span>/g, '');

        // remove tab instruction image if present
        updatedLine = updatedLine.replace(/<img src="\/tab\.svg"[^>]*\/>/g, '');

        // replace suggestion span with move span and add caret node
        // $1 = any other attributes in the span
        // $2 = suggested text
        updatedLine = updatedLine.replace(
          new RegExp(`<span class="${suggestionClass.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"([^>]*)>([^<]*)<\/span>`, 'g'),
          `<span class="${moveClass}"$1>$2</span><span id="caretNode"></span>`
        );

        return updatedLine;
      });

      const newHTML = lines.join('');
      contentEditableRef.current.innerHTML = newHTML;

      setCaretToCaretSpan();

      handleInput();
      suggestionStateRef.current = 'accepted';

      // changed full to '' for testing
      selectedSuggestionRef.current = {...selectedSuggestionRef.current!, full: '', remaining: '' };
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
  
  const handleUndo = () => {

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
    let [ updatedLine, _ ] = updateLine(highlightedParsing, line);
    
    lines[lineIndex] = updatedLine;

    // Update the contentEditable with highlighted content
    const newHTML = lines.join('');
    setHTML(newHTML);
  }

  const removeAllSuggestions = (): string[] => {
    if (!contentEditableRef.current) return [];
    
    const lines = htmlToLineArray(contentEditableRef.current.innerHTML);
    const suggestionClass = colorDict['suggestion'];
    return lines.map(line => line.replace(new RegExp(`<span class="${suggestionClass}">[^<]*<\/span>(<img[^>]*>)?`, 'g'), ''));
  }

  const handleShowSuggestion = (suggestion: string) => {
    if (!contentEditableRef.current) return;
    if (name === 'scramble') return; // no suggestions in scramble
    if (selectedSuggestionRef.current?.full === suggestion) return; // same suggestion already shown

    let lines = removeAllSuggestions();
    
    
    const isCommentSuggestion = suggestion.startsWith('//');
    if (isCommentSuggestion) {
      // not currently using comment suggestions
      showCommentSuggestion(lines, suggestion);
    } else {
      showMoveSuggestion(lines, suggestion);
    }
  }

  /**
   * @deprecated
   */
  const showCommentSuggestion = (lines: string[], suggestion: string) => {
    // remove caret nodes
    let existingCaretNode = contentEditableRef.current?.querySelector('#caretNode');
    while (existingCaretNode) {
      existingCaretNode.parentNode!.removeChild(existingCaretNode);
      existingCaretNode = contentEditableRef.current!.querySelector('#caretNode');
    }
    const movecount = oldLineMoveCounts.current[lineOffsetRef.current];
    if (!movecount || movecount === 0) return;
    // if there's already a comment, return
    const commentClass = colorDict['comment'];
    if (lines[lineOffsetRef.current].includes(`class="${commentClass}"`)) return
    
    const oldLine = lines[lineOffsetRef.current] || '';
    const suggestionClass = colorDict['suggestion'];
    const newline = oldLine.replace(/<br>/, `<span class="${suggestionClass}">${suggestion}</span><span id="caretNode"></span><br>`);
    lines[lineOffsetRef.current] = newline;
    oldHTMLlinesRef.current = lines;
    const newHTML = lines.join('');
    selectedSuggestionRef.current = {
      lineIndex: lineOffsetRef.current, 
      full: suggestion, 
      remaining: suggestion 
    };
    suggestionStateRef.current = 'showing';
    setHTML(newHTML);
  }

  const showMoveSuggestion = (lines: string[], suggestion: string) => {

    // remove caret nodes
    let existingCaretNode = contentEditableRef.current?.querySelector('#caretNode');
    while (existingCaretNode) {
      existingCaretNode.parentNode!.removeChild(existingCaretNode);
      existingCaretNode = contentEditableRef.current!.querySelector('#caretNode');
    }
    
    const oldLineMoves = textboxMovesRef.current[lineOffsetRef.current] || [];
    const movecount = oldLineMoveCounts.current[lineOffsetRef.current];
    const remainingMoves = suggestion.split(' ');
    let isMidMove = false;
    for (let i = 0; i < movecount; i++) {
      const oldMove = oldLineMoves[i];
      const suggestedMove = remainingMoves[0];
      const isLastMove = i === movecount - 1;
      if (oldMove === suggestedMove) {
        remainingMoves.shift();
      } else if (isLastMove && oldMove.length < suggestedMove.length && suggestedMove.startsWith(oldMove)) {
        remainingMoves[0] = suggestedMove.slice(oldMove.length);
        isMidMove = true;
      } else {
        console.warn('Should not show move suggestion, moves do not align');
        return;
      }
    }
    if (remainingMoves.length === 0) return;

    const remainingSuggestion = remainingMoves.join(' ');
    const suggestionClass = colorDict['suggestion'];
    const tabInstruction = supportsHardwareKeyboard
      ? `<img src="/tab.svg" alt="Press Tab" style="display: inline; pointer-events-none; width: 51px; height: 20px; margin-left: 8px; margin-bottom: 4px; vertical-align: middle;" />`
      : '';
    
    const optionalSpace = (oldLineMoveCounts.current[lineOffsetRef.current] > 0 && !isMidMove) ? ' ' : '';
    const oldMoves = oldLineMoves.join(' ');
    const validClass = colorDict['move'];
    const newline = `<div><span class="${validClass}">${oldMoves}</span><span id="caretNode"></span><span class="${suggestionClass}">${optionalSpace}${remainingSuggestion}</span>${tabInstruction}<br></div>`;

    lines[lineOffsetRef.current] = newline;

    oldHTMLlinesRef.current = lines; // update oldHTMLlines to prevent undo/redo issues
    const newHTML = lines.join('');
    selectedSuggestionRef.current = {
      lineIndex: lineOffsetRef.current, 
      full: suggestion, 
      remaining: remainingSuggestion 
    };
    suggestionStateRef.current = 'showing';
    setHTML(newHTML);
  }

  const getSuggestionPosition = (lineIndex: number): { x: number; y: number } => {
    const solutionElement = contentEditableRef.current;

    if (!solutionElement) {
      return { x: 0, y: 0 };
    }

    const lineDivs = Array.from(solutionElement.children).filter(
      (child): child is HTMLDivElement => child instanceof HTMLDivElement
    );

    const targetDiv = lineDivs[lineIndex] ?? lineDivs[lineDivs.length - 1];

    if (!targetDiv) {
      return { x: 0, y: 0 };
    }

    const { bottom, left } = targetDiv.getBoundingClientRect();
    const y = bottom + window.scrollY + 9;
    const x = left + window.scrollX - 9;

    return { x, y };
  };


  const { x: locationX, y: locationY } = suggestionStateRef.current === 'showing' && name === 'solution'
    ? getSuggestionPosition(lineOffsetRef.current)
    : { x: 0, y: 0 };
  
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

    showSuggestion: (alg: string) => {
      handleShowSuggestion(alg);
    },

    dismissSuggestion: () => {
      handleSuggestionReject();
    }
  }), []);

  useEffect(() => {
        
    document.addEventListener('selectionchange', handleCaretChange);
    document.addEventListener('keydown', handleCommand);

    return () => {

      document.removeEventListener('selectionchange', handleCaretChange);
      document.removeEventListener('keydown', handleCommand);

      removeAllSuggestions();

      updateURLTimeout.current ? clearTimeout(updateURLTimeout.current) : null;

      if (restoreFrameRef.current !== null) {
        cancelAnimationFrame(restoreFrameRef.current);
        restoreFrameRef.current = null;
      }

    };
  }, []);

  const logCaretRestoreExit = (reason: string) => {
    // log('caret restore exit:', reason);
  };

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

  const checkNewSuggestions = () => {
    if (name !== 'solution') return;
    const suggestionSignature = suggestions?.map(s => s.alg).join('|') || '';
    if (suggestionSignature !== suggestionSignatureRef.current) {
      suggestionSignatureRef.current = suggestionSignature;
      suggestionStateRef.current = 'showing';
    }
  }

  // Dismiss suggestion if caret line has changed
  // TODO: move this to caret change handler
  if (selectedSuggestionRef.current 
    && selectedSuggestionRef.current.lineIndex !== lineOffsetRef.current
    && suggestionStateRef.current !== 'accepted'
  ) {

    suggestionStateRef.current = 'dismissed';
  // Show if caret is on the suggestion line
  } else if (selectedSuggestionRef.current
    && selectedSuggestionRef.current.lineIndex === lineOffsetRef.current
    && suggestionStateRef.current !== 'accepted'
  ) {
    suggestionStateRef.current = 'showing';
  }

  const completedString = textboxMovesRef.current[lineOffsetRef.current]?.join(' ');
  const filteredSuggestions = suggestions
    ?.map((suggestion, index) => ({ suggestion, originalIndex: index }))
    .filter(({ suggestion }) => {
      // if (suggestion.alg === selectedSuggestionRef.current?.full) return false;
      return suggestion.alg.startsWith(completedString) && suggestion.alg !== completedString;
    });


  useEffect(() => {
    checkNewSuggestions();
    checkCaretRestore();
  }, [html, suggestions]);

  return (
    <>
      <Suspense fallback={null}>
        <EditorLoader editorRef={contentEditableRef} handleInput={handleInput} name={name} autofocus={autofocus} />   
      </Suspense>
      <div
        contentEditable
        ref={contentEditableRef}
        className={`
          text-lg text-left ff-space-adjust break-normal p-2
          min-h-[4.7rem]
          rounded-sm whitespace-pre-wrap 
          border border-neutral-600 focus:border-primary-100 hover:border-primary-100
          outline-none resize-none caret-primary-200 bg-primary-800 `}
        onInput={() => handleInput()}
        onCopy={handleCopy}
        onPaste={handlePaste}
        onBlur={() => passURLupdate()}
        dangerouslySetInnerHTML={{ __html: html }}
        spellCheck={false}
        inputMode="text"
        role="textbox"
        autoCorrect="off"
        autoCapitalize="characters" // annoying for comments and rotations. Could implement custom fix.
        tabIndex={idIndex === 0 ? 1 : 3}
      />
      {name === 'solution' && suggestions?.length && suggestionStateRef.current === 'showing' ? (
        <SuggestionBox 
          suggestions={filteredSuggestions || []}
          xLocation={locationX}
          yLocation={locationY}
          handleSuggestionRequest={handleSuggestionRequest}
          handleSuggestionAccept={handleSuggestionAccept}
          handleSuggestionReject={handleSuggestionReject}
        />
      ) : null}
    </>
  );
}

MovesTextEditor.displayName = 'MovesTextEditor';
export default memo(MovesTextEditor);