'use strict';

import type { MovesValidation } from "./validateTextInput";

export type Token = {
  type: string;
  value: string;
}

export default function validationToArray(validation: MovesValidation[]): Token[] {
  const newValidation = JSON.parse(JSON.stringify(validation));

  degroup(newValidation);

  // console.log('newValidation after degrouping: ');
  // console.table(newValidation);

  const tokens: Token[] = findTokens(newValidation);

  return tokens;
}

const findTokenLocation = (i: number, newValidation: MovesValidation[]) => {
  const type = newValidation[i][1];
  const start = i;
  let end = i;
  for (let j = i; j < newValidation.length; j++) {
    if (newValidation[j][1] === type) {
      end = j;
    } else {
      break;
    }
  }
  return [start, end];
}

const findTokens = (newValidation: MovesValidation[]): Token[] => {
  const tokens: Token[] = [];
  const validTokenTypes = ["move"]; // add "hashtag" if feature ever implemented

  for (let i = 0; i < newValidation.length; i++) {
    if (validTokenTypes.includes(newValidation[i][1])) {

      let [start, end] = findTokenLocation(i, newValidation);

      const tokenValue = newValidation.slice(start, end + 1).map((item) => item[0]).join('');
      tokens.push({ type: newValidation[i][1], value: tokenValue });
      i = end; // Move the index to the end of the token
    }
  }

  // console.log('tokens: ', tokens);
  return tokens;
}

const degroup = (newValidation: MovesValidation[]) => {
  for(let i = 0; i < newValidation.length; i++) {
    if(newValidation[i][1] === 'paren' && newValidation[i][0] === '(') {
      const startParenIndex = i;
      //console.log('start: ' + startParenIndex);
      const closeParenIndex = findClosingParen(i+1, newValidation[i][2]!, newValidation,);
      const reps = findReps(closeParenIndex, newValidation);

      //console.log('reps: ' + reps);
      reps ? expandGroup(startParenIndex, closeParenIndex, reps, newValidation) : null;
    }
  }
}

function findClosingParen(i: number, depth: number, newValidation: MovesValidation[]) {
  for (let j = i; j < newValidation.length; j++) {
    if (newValidation[j][2] === depth) {
      return j;
    }
  }
  //console.log('no closing parenthesis found');
  return -1;
}

function findReps(i: number, newValidation: MovesValidation[]) {
  let reps = 0;
  if (i+1 >= newValidation.length) {
    return reps;
  }

  for (let k = i+1; k < newValidation.length; k++) {
    if (newValidation[k][1] === "rep") {
      reps = (reps * 10) + parseInt(newValidation[k][0] ?? '0', 10);
      continue;
    } else {
      return reps;
    }
  }
  return reps
}

function expandGroup(start: number, end: number, reps: number, newValidation: MovesValidation[]): MovesValidation[] {

  const disallowedTypes: string[] = ["hashtag"];
  
  //console.log('Start: ' + start + ' End: ' + end + ' Reps: ' + reps)
  if (start < 0 || end >= newValidation.length || start > end || reps <= 0) {
    throw new Error('Invalid indices or repetition count provided.');
  }

  let splicePoint = end + 1 + reps.toString().length;
  //console.log('splicePoint: ' + splicePoint);

  // change type of parens and reps to ungrouped
  newValidation[start][1] = "ungrouped";
  newValidation[end][1] = "ungrouped";
  for (let i = end+1; i < splicePoint; i++) {
        newValidation[i][1] = "ungrouped";
  }

  // change text of disallowed types inside the group to ungrouped
  for (let i = start+1; i < end; i++) {
    if (disallowedTypes.includes(newValidation[i][1])) {
      newValidation[i][1] = "ungrouped";
    }
  }

  const copiedRows = JSON.parse(JSON.stringify(newValidation.slice(start+1, end+1)));
    //end+1 is a simple hack to not have to add a space character between new copies
  for (let i = 0; i < reps - 1; i++) {
    newValidation.splice(splicePoint, 0, ...copiedRows);
    splicePoint = splicePoint + copiedRows.length;
  }

  // console.log('newValidation after degrouping: ');
  // console.table(newValidation);

  return newValidation;
}
