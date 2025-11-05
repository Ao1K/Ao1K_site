'use client';

import React, { useImperativeHandle, useEffect, Suspense, memo, useState } from 'react';
import { useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import sanitizeHtml from 'sanitize-html';
import Cookies from 'js-cookie';

import parseTextInput from "../../composables/recon/validateTextInput";
import parsingToTokens, { degroup } from "../../composables/recon/validationToMoves";
import type { MovesDisplayValidation as MovesDisplayParsing } from "../../composables/recon/validationToMoves";
import type { MovesParsing } from "../../composables/recon/validateTextInput";
import updateURL from '../../composables/recon/updateURL';

import { customDecodeURL } from '../../composables/recon/urlEncoding';

import type { Token } from "../../composables/recon/validationToMoves";

interface HTMLUpdateItem {
  html?: string;
  change: 'modified' | 'none' | 'suggestion';
}

export const highlightClass = 'text-dark bg-primary-100 backdrop-blur-xs caret-dark';

export const colorDict = {
  move: 'text-primary-100',
  comment: 'text-gray-500',
  space: 'text-primary-100',
  invalid: 'text-red-500',
  paren: 'text-paren',
  rep: 'text-paren',
  hashtag: 'text-orange-300',
  suggestion: 'text-dark_accent',
  highlight: highlightClass,
};
  


const EditorLoader = ({ 
  editorRef: contentEditableRef, 
  onInputChange, 
  name, 
  autofocus 
}: { 
  editorRef: React.RefObject<any>, 
  onInputChange: () => void, 
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
    if (urlText) {
      onInputChange();
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
  scrambleMoves?: string; // for hashtags
  ref?: React.Ref<ImperativeRef>;
}

export interface ImperativeRef {
  undo: () => void;
  redo: () => void;
  transform: (html: string) => void;
  highlightMove: (moveIndex: number, lineIndex: number) => void;
  removeHighlight: () => void;
  showSuggestion: (suggestion: string) => void;
  getElement: () => HTMLDivElement | null;
}

function MovesTextEditor({
  name,
  trackMoves,
  autofocus,
  moveHistory,
  updateHistoryBtns,
  html,
  setHTML,
  ref
}: EditorProps) {
  const contentEditableRef = useRef<HTMLDivElement>(null);
  const moveOffsetRef = useRef<number>(0); // number of moves before and at the caret. 0 is at the start of the line before any moves.
  const lineOffsetRef = useRef<number>(0);
  const textboxMovesRef = useRef<string[][]>([['']]); // inner array for line of moves, outer array for all lines in textbox 
  const suggestionRef = useRef<{ full: string; remaining: string } | null>(null);
  const suggestionStateRef = useRef<'none' | 'showing' | 'dismissed'>('none');

  // Cookie state for first tab use
  const [firstTabUse, setFirstTabUse] = useState<boolean>(() => {
    const cookieValue = Cookies.get('firstTabUse');
    // return cookieValue === null ? true : cookieValue === 'true';
    return true; // disabled for testing
  });

  const updateURLTimeout = useRef<NodeJS.Timeout | null>(null);

  const oldHTMLlines = useRef<string[]>(['']);
  const oldLineMoveCounts = useRef<number[]>([0]);

  const idIndex = name === 'scramble' ? 0 : 1;

  const isFocusingRef = useRef<boolean>(false);

  const sanitizeConf = {
    allowedTags: ["b", "i","br","div"],
    allowedAttributes: { span: ["className","class"]}
  };

  const localColorDict = useRef(JSON.parse(JSON.stringify(colorDict)));
  
  useEffect(() => {
    if (name === 'scramble') {
      // hashtags in scramble currently not allowed
      localColorDict.current.hashtag = 'text-red-500';
    }
  }, []);

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
      
      // Check if line contains suggestions
      if (line.includes(`class="${suggestionClass}"`)) {
        htmlUpdateMatrix.push({
          html: line,
          change: 'suggestion'
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
          // console.log('breaking at:', i, 'type:', type, 'parsing:', parsing[i][0]);
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

    // Reset suggestion state when user types content
    if (moves.length > 0 || text.trim() !== '') {
      suggestionStateRef.current = 'none';
    }

    return newHTMLline;
  };

  const handleLineSuggestion = (updateItem: HTMLUpdateItem, i: number, lineMoveCounts: number[]): string => {
    // if there's a suggestion.current.remaining but not .full, it means the suggestion was rejected
    
    if (suggestionRef.current === null) {
      suggestionRef.current = { full: '', remaining: '' };
    }
    
    const line = updateItem.html || '';
    const text = line.replace(/<[^>]+>/g, '');

    // try to remove duplicate text in suggestion and manual entry
    let acceptedSuggestion = '';
    let remainingSuggestion = '';

    const textNotSuggestion = text.replace(suggestionRef.current.remaining, '');

    let isSuggestionMatch = !!suggestionRef.current.full; // if no suggestion, no match possible
    textNotSuggestion.split('').forEach((char, index) => {
      if (!suggestionRef.current || suggestionRef.current.full[index] !== char) {
        isSuggestionMatch = false;
        return;
      }
    });
    if (isSuggestionMatch) {
      acceptedSuggestion = textNotSuggestion;
      remainingSuggestion = suggestionRef.current.full.replace(acceptedSuggestion, '');
    }

    // get html without suggestion or possible image
    const htmlWithoutSuggestion = line.replace(suggestionRef.current.remaining, '').replace(/<img[^>]*>/g, '');
    const validatedHTML = handleLineModified({html: htmlWithoutSuggestion, change: 'modified'}, i, lineMoveCounts);
    const suggestionClass = colorDict['suggestion'];
    const tabImageHTML = firstTabUse ? `<img src="/tab.svg" alt="Press Tab" style="display: inline; pointer-events-none; width: 51px; height: 20px; margin-left: 8px; margin-bottom: 4px; vertical-align: middle;" />` : '';

    const suggestionHTML = remainingSuggestion ? `<span class="${suggestionClass}">${remainingSuggestion}</span>${tabImageHTML}` : '';
    const combinedHTML = validatedHTML.replace(/<br><\/div>$/, `${suggestionHTML}<br></div>`);

    suggestionRef.current = { 
      full: suggestionRef.current.full,
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
          return oldHTMLlines.current[i];
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
    insertCaretNode();

    // 2
    let htmlLines = htmlToLineArray(contentEditableRef.current!.innerHTML);
    const htmlUpdateMatrix = findHTMLchanges(oldHTMLlines.current, htmlLines);
    
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
    oldHTMLlines.current = htmlLines;
    oldLineMoveCounts.current = lineMoveCounts;

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

  const insertCaretNode = () => {
    
    if (!contentEditableRef.current) return;
    if (document.activeElement !== contentEditableRef.current) return;
    if (moveHistory.current.undo_redo_done === false) return;
    if (isFocusingRef.current) return;

    let existingCaretNode = contentEditableRef.current?.querySelector('#caretNode');
    while (existingCaretNode) {
      existingCaretNode.parentNode!.removeChild(existingCaretNode);
      existingCaretNode = contentEditableRef.current.querySelector('#caretNode');
    }

    const caretNode = document.createElement('span');
    caretNode.id = 'caretNode';

    const selection = window.getSelection();
    const range = document.createRange();
    
    let node = selection?.focusNode;

    // if node equals contenteditable div, make node first div instead, if it exists
    if (node === contentEditableRef.current 
      && contentEditableRef.current.firstChild
      && contentEditableRef.current.firstChild.nodeType === Node.ELEMENT_NODE
      && (contentEditableRef.current.firstChild as Element).tagName === 'DIV'
    ) {
      node = contentEditableRef.current.firstChild
    }

    if (node && selection) {

      // on certain browsers (firefox), <br> tags don't seem to be added automatically for newlines
      if (node.nodeType === Node.ELEMENT_NODE && 
      (node as Element).tagName === 'DIV' &&
      !(node as Element).querySelector('br')) {
        (node as Element).appendChild(document.createElement('br'));
      }
      
      try {
        range.setStart(node, selection.focusOffset);
        range.setEnd(node, selection.focusOffset);
        range.insertNode(caretNode);      
      } catch (e) {
        console.error('Error in insertCaretNode:', e);
      }
    }

  };

  const setCaretToCaretNode = () => {
    if (isFocusingRef.current)  {
      // console.log('aborting setCaretToCaretNode');
      return;
    }

    // console.log('continuing setCaretToCaretNode');

    const existingCaretNode = contentEditableRef.current?.querySelector('#caretNode');
    if (existingCaretNode) {
      const selection = window.getSelection();
      const range = document.createRange();
      range.setStart(existingCaretNode, 0);
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
    let sanitizedText = sanitizeHtml(text, sanitizeConf).replace(/’/g, "'");
  
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
      setCaretToCaretNode();
    }
  
    setHTML(contentEditableRef.current!.innerHTML);
    onInputChange();
  };
  
  const passURLupdate = () => {

    // don't allow dummy text editors to update the URL
    if (name !== 'scramble' && name !== 'solution') return;

    const root = contentEditableRef.current;
    if (!root) {
      updateURL(name, '');
      return;
    }

    const suggestionClass = colorDict['suggestion'];
    const removedNodes: Array<{ parent: Node; node: Node; nextSibling: Node | null }> = [];

    const removeSuggestions = (element: HTMLElement) => {
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
    };

    // Temporarily remove inline suggestion UI, capture text (with newlines), restore nodes.
    removeSuggestions(root);
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
    // console.log(idIndex, 'parseCaretState called');
    
    const element = contentEditableRef.current;
    if (!element) return null;
    if (isFocusingRef.current) return null;
    if (isMultiSelect()) return null;

    const caretNode = element.querySelector('#caretNode');
    if (!caretNode) {
      // console.log(idIndex, 'no caret node found');
      return null;
    }

    const prevHTML = element.innerHTML;
    insertCaretNode();
    
    // check if insertion was a no-op
    if (prevHTML === element.innerHTML) {
      // console.log(idIndex, 'caret node already in correct position');
      return null;
    }

    // parse HTML into structured lines
    const lines = htmlToLineArray(element.innerHTML);
    // console.log(idIndex, 'parsed by caret state check:', lines);
    return {
      element,
      lines,
      html: element.innerHTML
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
    
    // Reset suggestion state when moving to a different line
    if (newLineOffset !== lineOffsetRef.current) {
      // TOOD: don't think this does anything currently
      suggestionStateRef.current = 'dismissed';
    }
    
    lineOffsetRef.current = newLineOffset;

    caretLine = lines[lineOffsetRef.current];
    const lineTextArray = caretLine?.match(/>[^<>]+<|caretNode">/g);
    
    // Early return if no text array could be parsed
    if (!lineTextArray) return;
    
    let fullRawText = '';
    let caretReached = false;

    // find number of characters before caret and get full text for parsing
    {
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
    }

    // Clean html for case where user changed caret during move replay
    const noHighlightHTML = element.innerHTML.replace(new RegExp(`<span class="${highlightClass}">`, 'g'), '<span class="text-primary-100">');
    
    setHTML(noHighlightHTML);
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

  const handleCommand = (e: KeyboardEvent) => {
    if (e.key === 'Tab') {
      if (suggestionRef.current === null || suggestionRef.current.remaining === '') {
        return; // no suggestion to confirm
      }
      e.preventDefault();
      handleTab();
    }

    if (e.key === 'Escape') {
      if (suggestionRef.current && name === 'solution') {

        // use handleLineSuggestion to remove suggestion html
        suggestionRef.current = { full: '', remaining: suggestionRef.current.remaining };
        suggestionStateRef.current = 'dismissed';
        
        handleInput();
      }
    }

    if (!e.ctrlKey) return;

    if (e.ctrlKey && e.key === 'z') {
      
      e.preventDefault();

      handleUndo();
    }

    if (e.ctrlKey && e.key === 'y') {

      e.preventDefault();

      handleRedo();
    }
  };

  const statusTransitions: any = {
    ready: { start: 'in_progress_one'},
    in_progress_one: { fail: 'checked_one', success: 'success_one' },
    checked_one: { fail: 'ready', success: 'ready', start: 'in_progress_two' },
    success_one: { start: 'ready'},
    in_progress_two: { fail: 'ready', success: 'ready' },
  };

  /**
   * Handle tab key confirmation of any suggested text.
   */
  const handleTab = () => {
    if (!contentEditableRef.current) return;
    if (name === 'scramble') return; // no suggestions in scramble
    
    const suggestionClass = colorDict['suggestion'];
    const moveClass = colorDict['move'];
    
    let lines = oldHTMLlines.current;
    
    // Check if there are any suggestions to handle
    let hasSuggestions = false;
    
    // Iterate through all lines and replace suggestion spans
    lines = lines.map(line => {
      const isCaretOnLine = line.includes('<span id="caretNode">');
      
      // Remove all caret nodes from this line
      let updatedLine = line.replace(/<span id="caretNode"><\/span>/g, '');
      
      if (updatedLine.includes(`class="${suggestionClass}"`)) {
        hasSuggestions = true;
        
        // Remove tab instruction image if present
        updatedLine = updatedLine.replace(/<img src="\/tab\.svg"[^>]*\/>/g, '');
        
        // Replace suggestion spans with move spans and add caret node after replacement
        updatedLine = updatedLine.replace(
          new RegExp(`<span class="${suggestionClass.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"([^>]*)>([^<]*)</span>`, 'g'),
          isCaretOnLine ? `<span class="${moveClass}"$1>$2</span><span id="caretNode"></span>` : `<span class="${moveClass}"$1>$2</span>`
        );
      }
      
      return updatedLine;
    });
    
    const newHTML = lines.join('');
    contentEditableRef.current.innerHTML = newHTML;
    setCaretToCaretNode();
    
    handleInput();

    suggestionRef.current = null;
    suggestionStateRef.current = 'none';
    
    // Set firstTabUse to false after successful completion
    if (hasSuggestions && firstTabUse) {
      // disabled for testing
      // setFirstTabUse(false);
      // Cookies.set('firstTabUse', 'false', { expires: 365 });
    }
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
    setCaretToCaretNode(); // updating contentEditableRef causes refresh which misplaces caret
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
    setCaretToCaretNode();
    handleInput();

    incrementStatus('success');
  }

  const handleTransform = (newHTML: string) => {
    contentEditableRef.current!.innerHTML = newHTML;
    oldLineMoveCounts.current = [-1]; // ensures that moveHistory contains transformed moves
    setCaretToCaretNode();
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
    contentEditableRef.current.innerHTML = newHTML;
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
    if (suggestionRef.current?.full === suggestion) return; // same suggestion already shown
    if (suggestionStateRef.current === 'dismissed') return; // suggestion was recently dismissed

    let lines = removeAllSuggestions();
    
    
    const isCommentSuggestion = suggestion.startsWith('//');
    if (isCommentSuggestion) {
      showCommentSuggestion(lines, suggestion);
    } else {
      showMoveSuggestion(lines, suggestion);
    }
  }

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
    const newline = oldLine.replace(/<br>/, ` <span class="${suggestionClass}">${suggestion}</span><span id="caretNode"></span><br>`);
    lines[lineOffsetRef.current] = newline;
    oldHTMLlines.current = lines;
    const newHTML = lines.join('');
    suggestionRef.current = { 
      full: suggestion, 
      remaining: suggestion 
    };
    suggestionStateRef.current = 'showing';
    setHTML(newHTML);
  }

  const showMoveSuggestion = (lines: string[], suggestion: string) => {
    // TODO: add check that previous lines are what we expected. Don't want to give outdated suggestion.

    // if there text in the selected line, abort
    const movecount = oldLineMoveCounts.current[lineOffsetRef.current];
    if (movecount && movecount > 0) return;

    // remove caret nodes
    let existingCaretNode = contentEditableRef.current?.querySelector('#caretNode');
    while (existingCaretNode) {
      existingCaretNode.parentNode!.removeChild(existingCaretNode);
      existingCaretNode = contentEditableRef.current!.querySelector('#caretNode');
    }

    // Add tab instruction image to suggestion if firstTabUse is true
    const tabInstruction = firstTabUse ? `<img src="/tab.svg" alt="Press Tab" style="display: inline; pointer-events-none; width: 51px; height: 20px; margin-left: 8px; margin-bottom: 4px; vertical-align: middle;" />` : '';

    const suggestionClass = colorDict['suggestion'];
    const newline = `<div><span id="caretNode"></span><span class="${suggestionClass}">${suggestion}</span>${tabInstruction}<br></div>`;
    if (lineOffsetRef.current >= lines.length) {
      lines.push(newline);
    } else {
      lines[lineOffsetRef.current] = newline;
    }
    oldHTMLlines.current = lines; // update oldHTMLlines to prevent undo/redo issues
    const newHTML = lines.join('');
    suggestionRef.current = { 
      full: suggestion, 
      remaining: suggestion 
    };
    suggestionStateRef.current = 'showing';
    setHTML(newHTML);
  }
  
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

    showSuggestion: (suggestion: string) => {
      handleShowSuggestion(suggestion);
    },

    getElement: () => {
      return contentEditableRef.current;
    },
  }), []);

  const handleFocus = (e: React.FocusEvent<HTMLDivElement>) => {
    if (!contentEditableRef.current) return;
    
    isFocusingRef.current = true;

    // Use requestAnimationFrame to ensure browser has updated selection
    requestAnimationFrame(() => {
      if (!contentEditableRef.current) return;
      
      // Remove any existing caret nodes first
      let existingCaretNode = contentEditableRef.current.querySelector('#caretNode');
      while (existingCaretNode) {
        existingCaretNode.parentNode!.removeChild(existingCaretNode);
        existingCaretNode = contentEditableRef.current.querySelector('#caretNode');
      }
      
      const selection = window.getSelection();
      const caretNode = document.createElement('span');
      caretNode.id = 'caretNode';
      
      // If we have a valid selection, insert caret node at that position
      if (selection && selection.rangeCount > 0 && selection.focusNode) {
        try {
          const range = selection.getRangeAt(0);
          range.insertNode(caretNode);
          // console.log(idIndex, 'handleFocus: inserted caret node at selection');
        } catch (e) {
          console.error('Error inserting caret node at selection:', e);
        }
      } else {
        // No valid selection - insert at end of content
        const lastDiv = contentEditableRef.current.querySelector('div:last-child');
        if (lastDiv) {
          lastDiv.appendChild(caretNode);
          // console.log(idIndex, 'handleFocus: inserted caret node at end of last div');
        } else {
          contentEditableRef.current.appendChild(caretNode);
          // console.log(idIndex, 'handleFocus: inserted caret node at end of content');
        }
      }
      
      const element = contentEditableRef.current;
      const lines = htmlToLineArray(element.innerHTML);
      // console.log(idIndex, 'handleFocus: lines:', lines);
      const html = element.innerHTML;
      const caretState = { element, lines, html };
      setCaretState(caretState);
      
      isFocusingRef.current = false;
    });
  };

  useEffect(() => {
    if (!contentEditableRef.current) return;
    if (isFocusingRef.current) return;

    setCaretToCaretNode();
    
  }, [html]);

  useEffect(() => {handleInput()}, [contentEditableRef.current]); // initialize syntax highlighting

  useEffect(() => {
    
    document.addEventListener('selectionchange', handleCaretChange);
    document.addEventListener('keydown', handleCommand);

    return () => {

      document.removeEventListener('selectionchange', handleCaretChange);
      document.removeEventListener('keydown', handleCommand);

      removeAllSuggestions();

      updateURLTimeout.current ? clearTimeout(updateURLTimeout.current) : null;

    };
  }, []);


  

  return (
    <>
      <Suspense fallback={null}>
        <EditorLoader editorRef={contentEditableRef} onInputChange={onInputChange} name={name} autofocus={autofocus} />   
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
        onFocus={handleFocus}
        dangerouslySetInnerHTML={{ __html: html }}
        spellCheck={false}
        inputMode="text"
        role="textbox"
        autoCorrect="off"
        autoCapitalize="characters" // annoying for comments and rotations. Could implement custom fix.
        tabIndex={idIndex === 0 ? 1 : 3}
      /> 
    </>
  );
}

MovesTextEditor.displayName = 'MovesTextEditor';
export default memo(MovesTextEditor);