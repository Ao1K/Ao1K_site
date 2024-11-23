'use client';

import React, { useImperativeHandle, forwardRef, useEffect, useMemo, useState, memo } from 'react';
import { useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import sanitizeHtml from 'sanitize-html';

import validateTextInput from "../composables/validateTextInput";
import validationToMoves from "../composables/validationToMoves";
import updateURL from '../composables/updateURL';

import { customDecodeURL } from '../composables/urlEncoding';

export const colorDict = [ // can't be in /utils folder due to automatic tailwind style purging. probably.
  { key: 'move', value: 'text-light'},
  { key: 'comment', value: 'text-gray-500'},
  { key: 'space', value: 'text-light'},
  { key: 'invalid', value: 'text-red-500'},
  { key: 'paren', value: 'text-paren'},
  { key: 'rep', value: 'text-paren'},
  { key: 'image', value: 'text-light'}, // wip
];

const EditorLoader = ({ editorRef: contentEditableRef, onInputChange, name, autofocus }: { editorRef: React.RefObject<any>, onInputChange: () => void, name: string, autofocus: boolean})  => {
  // useSearchParams is a hook. Storing searchParams here prevents it from being called again and causing reloads.
  const searchParams = useSearchParams();

  useEffect(() => {
    let urlText = searchParams.get(name);

    if (urlText) {
      let decodedText = decodeURIComponent(customDecodeURL(urlText));
      contentEditableRef.current.innerText = decodedText;
    }

    if (autofocus) {
      if (!urlText && name === 'solution') {
        //adds caretNode span, which then is processed by onInputChange
        const selection = window.getSelection();
        const range = document.createRange();
        const caretNode = document.createElement('span');
        caretNode.id = 'caretNode';
        range.selectNodeContents(contentEditableRef.current);
        range.collapse(false);
        range.insertNode(caretNode);
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
      else {
        //select the other textbox
        const otherID = name === 'scramble' ? 'solution' : 'scramble';
        const parentOtherElement = document.getElementById(otherID);
        const otherTextbox = parentOtherElement?.querySelector<HTMLDivElement>('div[contenteditable="true"]');
        otherTextbox?.focus();
      }
      
    }
      
  if (urlText || (autofocus && !urlText)) {
    onInputChange();
  }
  

}, []);

  return null;
}

interface EditorProps {
  name: string;
  trackMoves: (idIndex: number, lineIndex: number, caretIndex: number, moves: string[][], moveCounts: number[], moveAnimationTimes: number[][]) => void;
  autofocus: boolean;
  moveHistory: React.MutableRefObject<any>;
  updateHistoryBtns: () => void;
  html: string;
  setHTML: React.Dispatch<React.SetStateAction<string>>;
}

export interface EditorRef {
  undo: () => void;
  redo: () => void;
  transform: (html: string) => void;
}

const MovesTextEditor = forwardRef<EditorRef, EditorProps>(({ name, trackMoves, autofocus, moveHistory, updateHistoryBtns, html, setHTML }, ref) => {

  const contentEditableRef = useRef<HTMLDivElement>(null);
  const moveOffsetRef = useRef<number>(0); // number of moves before and at the caret. 0 is at the start of the line before any moves.
  const lineOffsetRef = useRef<number>(0);
  const textboxMovesRef = useRef<string[][]>([['']]); // inner array for line of moves, outer array for all lines in textbox 

  const updateURLTimeout = useRef<NodeJS.Timeout | null>(null);

  const oldHTMLlines = useRef<string[]>(['']);
  const oldLineMoveCounts = useRef<number[]>([0]);
  const oldMoveAnimationTimes = useRef<number[][]>([[]]); // stores move animation times for each move in each line. Only for solution textbox.

  const idIndex = name === 'scramble' ? 0 : 1;

  const sanitizeConf = {
    allowedTags: ["b", "i","br","div"],
    allowedAttributes: { span: ["className","class"]}
  };
  
  const handleInput = () => {

    onInputChange();
    
    updateURLTimeout.current ? clearTimeout(updateURLTimeout.current) : null;
    updateURLTimeout.current = setTimeout(passURLupdate, 500);
  };
  
  function htmlToLineArray(html: string) {
    //Remove obvious nested divs
    html = html.replace(/<div><div>/g, '');
    html = html.replace(/<\/div><\/div>/g, '');
    
    let lines = splitIntoLines(html);
    lines = cleanLines(lines);    
    
    return lines;
  }
  
  function findHTMLchanges(oldHTML: string[], newHTML: string[]) {
    const htmlUpdateMatrix: string[] = [];

    newHTML.forEach((line, index) => {
      const oldLine = oldHTML[index];
      
      if (line !== oldLine || !line.includes('span')) { //adds changed lines or lines that are not painted
        htmlUpdateMatrix.push(line);
        
      } else { htmlUpdateMatrix.push("");}
    });
    return htmlUpdateMatrix;
  }

  const findEndOfMoveOnCaret = (validation: [string, string, number?][], caretOffset: number) => {
    // counts characters
    // increment caretOffset until it reaches the end of a move or move rep

    let i = caretOffset;
    try {
      for (i; i < validation.length; i++) {
        const type = validation[i][1];
        if (type === 'move' || type === 'rep') {
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

  function handleHTMLlines(htmlUpdateMatrix: string[], lineMoveCounts: number[], moveAnimationTimes: number[][]): [string[], number[], number[][]] {

    if (textboxMovesRef.current.length > htmlUpdateMatrix.length) {
      textboxMovesRef.current = textboxMovesRef.current.slice(0, htmlUpdateMatrix.length);
    }

    const paintedHTML = htmlUpdateMatrix.map((line, i) => {
      
      if (!textboxMovesRef.current[i]) {
        //console.log('moveStatus not found at line', i, "for textbox", idIndex);
        textboxMovesRef.current[i] = [''];
      }

      if (lineMoveCounts[i] === undefined) {
        lineMoveCounts.push(0);
        moveAnimationTimes.push([0]);
      }

      if (line) {
        const text = line.replace(/<[^>]+>/g, '');
        const validation = validateTextInput(text);
        
        const [newHTMLline, caretIndex] = updateLine(validation, line);
        
        let moves: string[];
        
        if (caretIndex !== null) {
          //console.log('updating lineoffset:', htmlUpdateMatrix, line, i)
          let caretSplitIndex = findEndOfMoveOnCaret(validation, caretIndex);
  
          const movesBeforeCaret = validationToMoves(validation.slice(0, caretSplitIndex + 1));
          const movesAfterCaret = validationToMoves(validation.slice(caretSplitIndex + 1));
          moves = movesBeforeCaret.concat(movesAfterCaret);

          lineOffsetRef.current = i; // could be wrong in certain situations? (copy-paste)

          moveOffsetRef.current = movesBeforeCaret.length; // not minus 1. 0 represents before any moves.

        } else {
          moves = validationToMoves(validation);
        }

        lineMoveCounts[i] = moves.length;
        textboxMovesRef.current[i] = moves;

        moveAnimationTimes[i] = findAnimationLengths(moves);
    
        return newHTMLline;
      } else {

        return oldHTMLlines.current[i];}

    });
    return [paintedHTML, lineMoveCounts, moveAnimationTimes];
  }

  const findAnimationLengths = (moves: string[]) => {
    const moveAnimationTimes = [0];
    const singleTime = 1000;
    const doubleTime = 1500;
    const tripleTime = 2000;

    moves.forEach((move) => {
      if (move.includes('2')) {
        moveAnimationTimes.push(doubleTime);
      } else if (move.includes('3')) {
        moveAnimationTimes.push(tripleTime);
      } else {
        moveAnimationTimes.push(singleTime);
      }
    });

    return moveAnimationTimes;
  }

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

    //console.table(moveHistory.current.history);
    
  }

  function updateLine(validation: [string, string, number?][], line: string): [string, number | null] {
    line = removeSpansExceptCaret(line);
    line = line.replace(/&nbsp;/g, ' ');
  
    let { updatedLine, caretIndex } = processValidation(validation, line);
  
    return [updatedLine, caretIndex];
  }
  
  function processValidation(validation: [string, string, number?][], line: string): { updatedLine: string, caretIndex: number | null } {
    let valIndex = 0;
    let valOffset = 0;
    let matchOffset = 0;
  
    let caretIndex: number | null = null;

    line = line.replace(/>[^<>]+<|caretNode">/g, (match) => { //matches the ">" of caretNode to ensure no user text match. 
      if (match === 'caretNode">') {
        caretIndex = valIndex;
        return 'caretNode">';
      }

      match = match.substring(1, match.length - 1);
  
      let remainingMatchLength = match.length;
      let paintedMatch = '';
      let prevNonspaceType = '';
    
      while (remainingMatchLength > 0) {
        if (!(validation[valIndex] && validation[valIndex][0])) {
          console.error(`ERROR: Validation at ${valIndex} is undefined`);
          break;
        }
        const valLength = validation[valIndex][0].substring(valOffset).length;
        const type = validation[valIndex][1];
        let colorEntry = colorDict.find((color) => color.key === type);
        if (!colorEntry) {
          console.error(`Color not found for type: ${type}`);
          colorEntry = { key: 'not found', value: 'text-light' };
        }
        const color = colorEntry.value;
    
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
    
        const matchString = match.substring(oldOffset, matchEnd).replace(/\s/g, '&nbsp;');
    
        if (type === prevNonspaceType || (type === 'space' && paintedMatch)) {
          paintedMatch = paintedMatch.replace(/<\/span>$/, matchString + '</span>');
        } else {
          paintedMatch += `<span class='${color}'>${matchString}</span>`;
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
  
  function removeSpansExceptCaret(line: string): string {
    let line2 = '';
    while (line2 !== line) {
      line2 = line.replace(/<span class[^>]+>|<\/span>/g, '');
      line = line2;
    }
    line = line.replace(/<span id="caret.*?>/, '<span id="caretNode"></span>');
    return line;
  }

  const onInputChange = () => {

    
    // core functionality of the input change sequence:
    // 1. Store existing caret node. Textbox caret is later restored via useEffect.
    // 2. The lines of in the textbox are found. Changes are pushed into updateMatrix.
    // 3. Based on updateMatrix, lines in textbox are painted by functional class (valid, invalid, paren, etc).
    // 4. Painted lines are set as the new html state.
    // 5. Concurrently,
          // moveCount is stored for the purposes of undo/redo. 
          // moveAnimationTimes stored for the purpose of skipping to specific moves in the model playback.
          // MoveHistory updated.
    // 6. Refs updated.
    // 7. State passed to page through trackMoves().

    // 1
    insertCaretNode();

    // 2
    let htmlLines = htmlToLineArray(contentEditableRef.current!.innerHTML);
    const htmlUpdateMatrix = findHTMLchanges(oldHTMLlines.current, htmlLines);
    
    // 5
    let lineMoveCounts = [...oldLineMoveCounts.current];
    lineMoveCounts = lineMoveCounts.slice(0, htmlLines.length);

    let moveAnimationTimes = [...oldMoveAnimationTimes.current];
    moveAnimationTimes = moveAnimationTimes.slice(0, htmlLines.length);

    // 3, 5
    [htmlLines, lineMoveCounts, moveAnimationTimes] = handleHTMLlines(htmlUpdateMatrix, lineMoveCounts, moveAnimationTimes);
    
    const newHTMLlines = htmlLines.join('');
    
    // 5
    const moveCountChanged = isQuantifiableMoveChange(oldLineMoveCounts.current, lineMoveCounts);
    updateMoveHistory(newHTMLlines, moveCountChanged);
    
    // 6
    oldHTMLlines.current = htmlLines;
    oldLineMoveCounts.current = lineMoveCounts;
    oldMoveAnimationTimes.current = moveAnimationTimes;
    
    // 4
    updateHistoryBtns();
    setHTML(newHTMLlines);

    // 7
    trackMoves(idIndex, lineOffsetRef.current, moveOffsetRef.current, textboxMovesRef.current, oldLineMoveCounts.current, oldMoveAnimationTimes.current);
  };

  const splitIntoLines = (html: string) => {
    //console.log('html', html)
    const lines = html.split(/<\/div>(?!$)|<br>/)

    // if line 0 has div in middle, split it
    if (lines[0].match(/.+<div>.+/)) {
      let divStart = lines[0].indexOf('<div>');
      const firstLine = lines[0].substring(0, divStart);
      const remainingText = lines[0].substring(divStart+5);

      lines[0] = firstLine;
      lines.splice(1, 0, remainingText);
    }
    //console.log('lines:', lines)
    return lines;
  };

  const cleanLines = (lines: string[]) => {

    lines = lines
      .map((line: string) => line.replace(/<\/?div>|<br>/g, ""))
      .filter((line: string) => line !== '')
      .map((line: string) => `<div>${line}</div>`)
    ;
    lines[lines.length-1] = lines[lines.length-1]?.replace(/<\/div>/, '</div><br>'); 

    return lines;
  };

  const insertCaretNode = () => {

    if (document.activeElement !== contentEditableRef.current) return;
    if (!contentEditableRef.current) return;
    if (moveHistory.current.undo_redo_done === false) return;
    
    let existingCaretNode = contentEditableRef.current?.querySelector('#caretNode');
    while (existingCaretNode) {
      existingCaretNode.parentNode!.removeChild(existingCaretNode);
      existingCaretNode = contentEditableRef.current.querySelector('#caretNode');
    }   

    const caretNode = document.createElement('span');
    caretNode.id = 'caretNode';

    const selection = window.getSelection()
    const range = document.createRange();
    
    const node = selection?.focusNode;
    if (node) {
      range.setStart(node, selection.focusOffset);
      range.setEnd(node, selection.focusOffset);
      range.insertNode(caretNode);
    }
  };

  const setCaretToCaretNode = () => {
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

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
  
    const text = e.clipboardData.getData('text');
  
    let sanitizedText = sanitizeHtml(text, sanitizeConf);
    
    // TODO: may need to manually clean up <font color=""></font> tags. Not sure where these tags are created.
    const selection = window.getSelection();
    if (selection) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
  
      insertCaretNode();

      const lines = sanitizedText.split('\n');
      lines.reverse();
      lines.forEach((line, index) => {
        if (index > 0) {
          range.insertNode(document.createElement('br'));
        }
        range.insertNode(document.createTextNode(line));
      });
  
      range.collapse(false);
    }

    setHTML(contentEditableRef.current!.innerHTML);
    onInputChange();
  };
  
  const passURLupdate = () => {
    const text = contentEditableRef.current?.innerText || '';
    updateURL(name, text);
  };

  const isMultiSelect = () => {
    const selection = window.getSelection();
    if (!selection) return false;
  
    const range = selection.getRangeAt(0);
    return !range.collapsed && (range.startContainer !== range.endContainer || range.startOffset !== range.endOffset);
  };


  

  const handleCaretChange = () => {

    if (document.activeElement !== contentEditableRef.current) return;
    
    const multiSelect = isMultiSelect();
    if (multiSelect) return;
      

    const prevHTML = contentEditableRef.current!.innerHTML;
    insertCaretNode();
    if (prevHTML === contentEditableRef.current!.innerHTML) {
      //console.log('no change');
      return;
    }

      
    let caretLine = '';
    let caretOffset = 0;

    let lines = htmlToLineArray(contentEditableRef.current!.innerHTML);

    lineOffsetRef.current = lines.findIndex((line) => line.includes('<span id="caretNode">'));

    caretLine = lines[lineOffsetRef.current];
    let lineTextArray = caretLine?.match(/>[^<>]+<|caretNode">/g);
    let fullRawText = '';
    let caretReached = false;

    // find number of characters before caret and get full text for validation
    if (lineTextArray) {
      for (let text of lineTextArray){
        
        if (text === 'caretNode">') {
          caretReached = true;
          continue;
        }

        text = text.substring(1, text.length - 1);
        fullRawText += text;
  
        // accumulate characters before caret
        if (!caretReached) {
          text = text.replaceAll(/&[a-zA-Z0-9]+;/g, ' ');
          caretOffset += text.length;
        }
      }
      let validation = validateTextInput(fullRawText);



      let i = findEndOfMoveOnCaret(validation, caretOffset);

      // calculate number of moves before caret
      let v = validationToMoves(validation.slice(0, i));
      moveOffsetRef.current = v.length;
    }


    if (lineOffsetRef.current !== -1) {
      caretLine ? setHTML(contentEditableRef.current!.innerHTML): null; // ensures html will not be set during mounting
      trackMoves(idIndex, lineOffsetRef.current, moveOffsetRef.current, textboxMovesRef.current, oldLineMoveCounts.current, oldMoveAnimationTimes.current);
    }
  };

  const handleCommand = (e: KeyboardEvent) => {
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
    textbox?.focus();
  
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
    textbox?.focus();

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

  useImperativeHandle(ref, () => {
    return {
      undo: () => {
        handleUndo();
      },

      redo: () => {
        handleRedo();
      },

      transform: (transformedHTML: string) => {
        handleTransform(transformedHTML);
      },
      

    };
  },[]);

  useEffect(() => {
    if (!contentEditableRef.current) return;
    
    setCaretToCaretNode();
    
  }, [html]);

  useEffect(() => {
    
    document.addEventListener('selectionchange', handleCaretChange);
    document.addEventListener('keydown', handleCommand);

    return () => {

      document.removeEventListener('selectionchange', handleCaretChange);
      document.removeEventListener('keydown', handleCommand);

      updateURLTimeout.current ? clearTimeout(updateURLTimeout.current) : null;

    };
  }, []);

  return (
    <>
      <EditorLoader editorRef={contentEditableRef} onInputChange={onInputChange} name={name} autofocus={autofocus} />   
      <div
        contentEditable
        ref={contentEditableRef}
        className="bg-dark text-left rounded-sm resize-none text-xl min-h-[4.7rem] mb-4 mx-1 p-2 max-w-full caret-light border border-primary focus:border-1 ff-space-adjust"
        onInput={handleInput}
        onCopy={handleCopy}
        onPaste={handlePaste}
        onBlur={passURLupdate}
        onFocus={handleInput} // this hack ensures a visual cube update
        dangerouslySetInnerHTML={{ __html: html }}
        spellCheck={false}
      /> 
    </>
  );
});

export default MovesTextEditor;