'use client';

import React, { Suspense, useLayoutEffect, useEffect, useState } from 'react';
import { useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import sanitizeHtml from 'sanitize-html';
import validateTextInput from "../composables/validateTextInput";
import validationToMoves from "../composables/validationToMoves";
import updateURL from '../composables/updateURL';

//todo: create replacement table for URL encoding AND decoding.


const EditorLoader = ({ contentEditableRef, onInputChange, name, autofocus }: { contentEditableRef: React.RefObject<any>, onInputChange: () => void, name: string, autofocus: boolean})  => {
  const searchParams = useSearchParams();

  useEffect(() => {
    let encodedText = searchParams.get(name)?.replace(/_/g, '%C2%A0');

    if (encodedText) {
      const decodedText = decodeURIComponent(encodedText);
      contentEditableRef.current.innerText = decodedText;
    }

    if (autofocus) {
      if (!encodedText) {
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
      
  if (encodedText || (autofocus && !encodedText)) {
    onInputChange();
  }
  

}, []);

  return null;
}

interface EditorProps {
  name: string;
  trackMoves: (idIndex: number, lineIndex: number, moveIndex: number, moves: string[][], moveCounts: number[], moveAnimationTimes: number[][]) => void;
  autofocus: boolean;
  moveHistory: React.MutableRefObject<any>;
}

const MovesTextEditor = React.memo(({ name, trackMoves, autofocus, moveHistory }: EditorProps) => {

  //console.log('editor rendered');

  const contentEditableRef = useRef<any>(null);
  let moveOffset = useRef<number>(0);
  let lineOffset = useRef<number>(0);
  let moveStatus = useRef<string[][]>([['']]); // inner array for line of moves, outer array for all lines in textbox 

  const updateURLTimeout = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();
  const [html, setHTML] = useState<string>('');

  const oldHTMLlines = useRef<string[]>(['']);
  const oldLineMoveCounts = useRef<number[]>([0]);
  const oldMoveAnimationTimes = useRef<number[][]>([[]]); // stores move animation times for each move in each line. Only for solution textbox.

  const idIndex = name === 'scramble' ? 0 : 1;

  // const [_, setReload] = useState<number>(0);
  // const reloadRef = useRef<any>(0);


  // const triggerReload = () => {
  //   reloadRef.current = Date.now();
  //   setReload(reloadRef.current);
  // };

  // useEffect(() => {
  //   const intervalId = setInterval(() => {
  //     console.log('BEFORE RELOAD');
  //     console.log('contentEditableRef:', contentEditableRef.current);
  //     triggerReload();
  //     console.log('RELOAD');
  //     console.log('contentEditableRef:', contentEditableRef.current);
  //   }, 5000); // Example: reload every 5 seconds

  //   return () => clearInterval(intervalId);
  // }, []);

  const colorDict = [
    { key: 'move', value: 'text-light' },
    { key: 'comment', value: 'text-gray-500' },
    { key: 'space', value: 'text-light' },
    { key: 'invalid', value: 'text-red-500' },
    { key: 'paren', value: 'text-paren' },
    { key: 'rep', value: 'text-paren' },
  ];


  const sanitizeConf = {
    allowedTags: ["b", "i","br","div"],
    allowedAttributes: { span: ["class"]}
  };
  
  const handleInput = () => {

    //console.log('input event triggered');

    onInputChange();
    
    updateURLTimeout.current ? clearTimeout(updateURLTimeout.current) : null;
    updateURLTimeout.current = setTimeout(passURLupdate, 500);
  };
  
  function denestHTML(html: string) {
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

  function handleHTMLlines(htmlUpdateMatrix: string[], lineMoveCounts: number[], moveAnimationTimes: number[][]): [string[], number[], number[][]] {

    if (moveStatus.current.length > htmlUpdateMatrix.length) {
      moveStatus.current = moveStatus.current.slice(0, htmlUpdateMatrix.length);
    }

    const paintedHTML = htmlUpdateMatrix.map((line, i) => {
      
      if (!moveStatus.current[i]) {
        console.log('moveStatus not found at line', i, "for textbox", idIndex);
        moveStatus.current[i] = [''];
      }

      if (lineMoveCounts[i] === undefined) {
        lineMoveCounts.push(0);
        moveAnimationTimes.push([0]);
      }

      if (line) {
        const text = line.replace(/<[^>]+>/g, '');
        const validation = validateTextInput(text);
        
        const [newHTMLline, caretIndex] = updateLine(validation, line);

        moveOffset.current = caretIndex;
        lineOffset.current = i; // could be wrong in certain situations (copy-paste)

        
        const moves = validationToMoves(validation);
        lineMoveCounts[i] = moves.length;
        moveStatus.current[i] = moves;

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
    if (oldMoveCounts.length === 0) oldMoveCounts = [0]
    if (newMoveCounts.length === 0) newMoveCounts = [0]
    
    if (oldMoveCounts.length !== newMoveCounts.length) return true;

    for (let i = 0; i < oldMoveCounts.length; i++) {
      if (oldMoveCounts[i] !== newMoveCounts[i]) return true;
    }

    return false;
  }

  // const otherTextboxChanged = () => {
  //   if (moveHistory.current.index === 0) return false;
  //   const otherID = idIndex === 0 ? 1 : 0;
  //   let v = moveHistory.current.history[moveHistory.current.index][otherID] !== 'unchanged';
  //   //console.log('otherTextboxChanged:', v);
  //   return v;
  // }

  const updateMoveHistory = (html: string, moveCountChanged: boolean) => {
    console.log('movecountchanged:', moveCountChanged);
    let i = moveHistory.current.index;
    //console.log('historyIndex1:', i);
   
    moveHistory.current.history = moveHistory.current.history.slice(0, i + 1); // delete redo history
    
    const MaxHistoryReached = i >= moveHistory.current.MAX_HISTORY;

    if (MaxHistoryReached) {
      moveHistory.current.history.shift();
    } else if (moveCountChanged || i === 0) { 
      moveHistory.current.index++;
      i++;
    }
    //console.log('historyIndex:', i);

    idIndex === 0 ?
      moveHistory.current.history[i] = [html, 'unchanged'] : 
      moveHistory.current.history[i] = ['unchanged', html];

    console.log('history:', moveHistory.current.history);
    
  }

  function updateLine(validation: [string, string, number?][], line: string): [string, number] {
    line = removeSpansExceptCaret(line);
    line = line.replace(/&nbsp;/g, ' ');
  
    let { updatedLine, caretIndex } = processValidation(validation, line);
  
    return [updatedLine, caretIndex!];
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
        const valLength = validation[valIndex][0].substring(valOffset).length;
        const type = validation[valIndex][1];
        const color = colorDict.find((color) => color.key === type)?.value || 'text-dark';
    
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
    let htmlLines = denestHTML(contentEditableRef.current.innerHTML);
    const htmlUpdateMatrix = findHTMLchanges(oldHTMLlines.current, htmlLines);
    
    // 5
    let lineMoveCounts = [...oldLineMoveCounts.current];
    lineMoveCounts = lineMoveCounts.slice(0, htmlLines.length);

    let moveAnimationTimes = [...oldMoveAnimationTimes.current];
    moveAnimationTimes = moveAnimationTimes.slice(0, htmlLines.length);

    // 3, 5
    [htmlLines, lineMoveCounts, moveAnimationTimes] = handleHTMLlines(htmlUpdateMatrix, lineMoveCounts, moveAnimationTimes);
    
    // 4
    const newHTMLlines = htmlLines.join('');
    
    // 5
    const moveCountChanged = isQuantifiableMoveChange(oldLineMoveCounts.current, lineMoveCounts);
    updateMoveHistory(newHTMLlines, moveCountChanged); // can't use html state because it's not done updating
    
    // 6
    oldHTMLlines.current = htmlLines;
    oldLineMoveCounts.current = lineMoveCounts;
    oldMoveAnimationTimes.current = moveAnimationTimes;
    
    // 4
    setHTML(newHTMLlines);

    // 7
    // console.log('trackMoves from onInputChange');
    // console.log('html', newHTMLlines);
    // console.log('lineOffset', lineOffset.current);
    // console.log('moveOffset', moveOffset.current);
    trackMoves(idIndex, lineOffset.current, moveOffset.current, moveStatus.current, oldLineMoveCounts.current, oldMoveAnimationTimes.current);
  };

  const splitIntoLines = (html: string) => {
    const lines = html.split(/<\/div>(?!$)|<br>/)

    // if line 0 has div in middle, split it
    if (lines[0].match(/.+<div>.+/)) {
      let divStart = lines[0].indexOf('<div>');
      const firstLine = lines[0].substring(0, divStart);
      const remainingText = lines[0].substring(divStart+5);

      lines[0] = firstLine;
      lines.splice(1, 0, remainingText);
    }

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

    let existingCaretNode = contentEditableRef.current?.querySelector('#caretNode');
    while (existingCaretNode) {
      existingCaretNode.parentNode.removeChild(existingCaretNode);
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
    const existingCaretNode = contentEditableRef.current.querySelector('#caretNode');
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

    setHTML(contentEditableRef.current.innerHTML);
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
      

    const prevHTML = contentEditableRef.current.innerHTML;
    insertCaretNode();
    if (prevHTML === contentEditableRef.current.innerHTML) {
      //console.log('no change');
      return;
    }

      
    let caretLine = '';
    let caretOffset = 0;

    let lines = splitIntoLines(contentEditableRef.current.innerHTML);
    lines = cleanLines(lines);

    lineOffset.current = lines.findIndex((line) => line.includes('<span id="caretNode">'));
    caretLine = lines[lineOffset.current];
    let lineTextArray = caretLine?.match(/>[^<>]+<|caretNode">/g);
    let fullRawText = '';
    let caretReached = false;
    if (lineTextArray) {
      for (let text of lineTextArray){
        
        if (text === 'caretNode">') {
          //console.log('caret reached');
          caretReached = true;
          continue;
        }

        text = text.substring(1, text.length - 1);
        fullRawText += text;
  
        if (!caretReached) {
          text = text.replaceAll(/&[a-zA-Z0-9]+;/g, ' ');
          caretOffset += text.length;
        }
      }
      let validation = validateTextInput(fullRawText);

      let i = caretOffset;
      for (i; i < validation.length; i++) {
        const type = validation[i][1];
        if (type === 'move' || type === 'rep') {
          continue;
        } else {
          break;
        }
      }
      let v = validationToMoves(validation.slice(0, i));
      moveOffset.current = v.length;
    }


    if (lineOffset.current !== -1) {
      caretLine ? setHTML(contentEditableRef.current.innerHTML): null; // ensures html will not be set during mounting
      // console.log('trackMoves from handleCaretChange');
      // console.log('html', html);
      // console.log('lineOffset', lineOffset.current);
      // console.log('moveOffset', moveOffset.current);
      trackMoves(idIndex, lineOffset.current, moveOffset.current, moveStatus.current, oldLineMoveCounts.current, oldMoveAnimationTimes.current);
    }
  };

  const handleUndoRedo = (e: KeyboardEvent) => {
    if (e.ctrlKey && e.key === 'z') {
      console.log('undo on textbox:', idIndex);
      console.log('Checking history:', moveHistory.current.history);
      console.log('On index:', Math.ceil(moveHistory.current.index) - 1);

      e.preventDefault();
      
      let historyIndex = Math.ceil(moveHistory.current.index) - 1;

      if (historyIndex < 0) {
        console.log('end of history');
        return;
      }

      moveHistory.current.index = moveHistory.current.index - 0.5;

      if (moveHistory.current.history[historyIndex + 1] && moveHistory.current.history[historyIndex + 1][idIndex] === 'unchanged') {
        console.log('not target textbox')
        return;
      }
      
      let prevHTML = moveHistory.current.history[historyIndex][idIndex];
      while (prevHTML === 'unchanged' || historyIndex < 0) {
        console.log('1,',moveHistory.current.index);
        historyIndex--;
        console.log('2,',moveHistory.current.index);

        prevHTML = moveHistory.current.history[historyIndex][idIndex];
      }
      
      setHTML(prevHTML);
      handleInput();
      oldLineMoveCounts.current = [-1];
      setCaretToCaretNode();
      console.log('move undone')
    }


    if (e.ctrlKey && e.key === 'y') {
      // console.log('redo on textbox:', idIndex);
      // console.log('Checking history:', moveHistory.current.history);
      // console.log('On index:', Math.floor(moveHistory.current.index) + 1);
      e.preventDefault();

      let historyIndex = Math.floor(moveHistory.current.index) + 1;

      if (historyIndex > moveHistory.current.MAX_HISTORY || historyIndex >= moveHistory.current.history.length) {
        // console.log('max history reached');
        return;
      }

      moveHistory.current.index = moveHistory.current.index + 0.5;

      if (moveHistory.current.history[historyIndex][idIndex] === 'unchanged') {
        // console.log('not target textbox')
        return;
      }

      let nextHTML = moveHistory.current.history[historyIndex][idIndex];
      
      setHTML(nextHTML);
      oldLineMoveCounts.current = [-1];
      // console.log('move redone')
    }
  };



 
  useEffect(() => { // on mount
    
    document.addEventListener('selectionchange', handleCaretChange); // this is triggered more than necessary due to rerenders
    document.addEventListener('keydown', handleUndoRedo);

    return () => {

      document.removeEventListener('selectionchange', handleCaretChange);
      document.removeEventListener('keydown', handleUndoRedo);

      updateURLTimeout.current ? clearTimeout(updateURLTimeout.current) : null;

    };
  }, []);

  useEffect(() => {
    if (!contentEditableRef.current) return;
    setCaretToCaretNode();

  }, [html]);
  
  return (
      <Suspense>
        <EditorLoader 
          contentEditableRef={contentEditableRef} 
          onInputChange={onInputChange}
          name={name} 
          autofocus={autofocus}
        />
        <div
          contentEditable
          ref={contentEditableRef}
          className="bg-dark text-left rounded-sm resize-none text-xl w-full min-h-[4.5rem] mb-4 mx-1 p-2 caret-light border border-primary focus:border-1"
          onInput={handleInput}
          onCopy={handleCopy}
          onPaste={handlePaste}
          onBlur={passURLupdate}
          onFocus={handleInput} // this hack ensures a visual cube update
          dangerouslySetInnerHTML={{ __html: html }}
          spellCheck={false} 
        /> 
      </Suspense>
  );
});

export default MovesTextEditor;