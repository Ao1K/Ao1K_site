'use strict';

import type { MovesParsing } from "./validateTextInput";

export type MovesDisplayValidation = [
  string, // char
  string, // type
  number, // paren depth
  number // display order
];

export type Token = {
  type: string;
  value: string;
}

const validTokenTypes = ["move"]; // add "hashtag" if feature ever implemented

export default function validationToArray(validation: MovesParsing[]): Token[] {
  const newValidation = JSON.parse(JSON.stringify(validation));

  degroup(newValidation);

  // console.log('newValidation after degrouping: ');
  // console.table(newValidation);

  const tokens: Token[] = findTokens(newValidation);

  return tokens;
}

const addDisplayOrder = (validation: MovesParsing[]): MovesDisplayValidation[] => {
  const displayValidation: MovesDisplayValidation[] = validation.map(([char, type, parenDepth]) => [
    char,
    type,
    parenDepth ?? 0,
    -1 // initial display order
  ]);
  
  let displayOrder = 0;
  for (let i = 0; i < displayValidation.length; i++) {
    if (displayValidation[i][1] === 'move') {

      const [start, end] = findTokenLocation(i, validation);
      // set display order for the token
      for (let j = start; j <= end; j++) {
        displayValidation[j][3] = displayOrder; 
      }

      i = end; // Move the index to the end of the token
      displayOrder++;
    }
  }
  return displayValidation;
};

export const degroup = (validation: MovesParsing[] | MovesDisplayValidation[], storeDisplayOrder: boolean = false) => {
  if (!validation || validation.length === 0) {
    return;
  }
  if (storeDisplayOrder) {
    validation = addDisplayOrder(validation as MovesParsing[]) as MovesDisplayValidation[];
  }

  for(let i = 0; i < validation.length; i++) {
    if(validation[i][1] === 'paren' && validation[i][0] === '(') {
      const startParenIndex = i;
      //console.log('start: ' + startParenIndex);
      const closeParenIndex = findClosingParen(i+1, validation[i][2]!, validation);
      const reps = findReps(closeParenIndex, validation);

      //console.log('reps: ' + reps);
      reps ? expandGroup(startParenIndex, closeParenIndex, reps, validation) : null;
    }
  }

  return validation;
}

const findTokenLocation = (i: number, newValidation: MovesParsing[]) => {
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

const findTokens = (newValidation: MovesParsing[]): Token[] => {
  const tokens: Token[] = [];

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

function findClosingParen(i: number, depth: number, newValidation: MovesParsing[] | MovesDisplayValidation[]): number {
  for (let j = i; j < newValidation.length; j++) {
    if (newValidation[j][2] === depth) {
      return j;
    }
  }
  //console.log('no closing parenthesis found');
  return -1;
}

function findReps(i: number, newValidation: MovesParsing[] | MovesDisplayValidation[]): number {
  let reps = 0;
  if (i+1 >= newValidation.length) {
    // reached end, return 0
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

function expandGroup(start: number, end: number, reps: number, validation: MovesParsing[] | MovesDisplayValidation[]): MovesParsing[] | MovesDisplayValidation[] {

  const disallowedTypes: string[] = ["hashtag"];
  
  //console.log('Start: ' + start + ' End: ' + end + ' Reps: ' + reps)
  if (start < 0 || end >= validation.length || start > end || reps <= 0) {
    throw new Error('Invalid indices or repetition count provided.');
  }

  let splicePoint = end + 1 + reps.toString().length;
  //console.log('splicePoint: ' + splicePoint);

  // change type of parens and reps to ungrouped
  validation[start][1] = "ungrouped";
  validation[end][1] = "ungrouped";
  for (let i = end+1; i < splicePoint; i++) {
        validation[i][1] = "ungrouped";
  }

  // change text of disallowed types inside the group to ungrouped
  for (let i = start+1; i < end; i++) {
    if (disallowedTypes.includes(validation[i][1])) {
      validation[i][1] = "ungrouped";
    }
  }

  const copiedRows = JSON.parse(JSON.stringify(validation.slice(start+1, end+1)));
    //end+1 is to not have to add a space character between new copies
  for (let i = 0; i < reps - 1; i++) {
    validation.splice(splicePoint, 0, ...copiedRows);
    splicePoint = splicePoint + copiedRows.length;
  }

  // console.log('newValidation after degrouping: ');
  // console.table(newValidation);

  return validation;
}
