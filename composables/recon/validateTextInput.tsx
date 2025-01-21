type MovesValidation = [string, string, number?];
//[char, validationKeyword, parenthesisDepth]


const MAX_3X3_REPS = 1260;


export default function validateText(text: string) {
  
  let validation = initializeValidation(text);
  //assignHTMLvalidation(validation);
  assignCommentValidation(validation);
  const iterationArray: number[] = textToIterate(validation)
  //console.log('iterationArray: ' + iterationArray);

  assignParenthesis(validation, iterationArray);
  assignSpaceValidation(validation, iterationArray);
  assignMoveValidation(validation, iterationArray);

    // return starterArray;
  return validation;
}



function initializeValidation(text: string): MovesValidation[] {
  let validation: MovesValidation[] = [];
  //console.log('text: ' + text);
  for (let i = 0; i < text.length; i++) {
    let char = text[i];

    if (char === '<') {
      let htmlTagEnd = text.indexOf('>', i);
      let htmlTagType = findHTMLtagType(text.substring(i, htmlTagEnd));
      validation.push([text.substring(i,htmlTagEnd+1), htmlTagType, undefined]);
      i = htmlTagEnd;
      continue;
    }

    if (char === '&') {
      if (text.substring(i, i + 6) === '&nbsp;' ) {
        validation.push([' ', 'space', undefined]);

        i += 5;
      }
      if (text.substring(i, i + 4) === '&lt;' || text.substring(i, i + 4) === '&gt;') {
        console.log('invalid html tag: ' + text.substring(i, i + 4));
        validation.push([text.substring(i, i + 4), 'invalid', undefined]);
        i += 3;
      }
      continue;
    }

    validation.push([char, 'unknown', undefined]);

  }
  // console.log('validation after init: ');
  // console.table(validation);
  return validation;
}

function findHTMLtagType(htmlTag: string) {
  let newlineHTMLregex = new RegExp(`^<\/?(br|div)>$`);
  let validationKeyword: string;

  newlineHTMLregex.test(htmlTag) ? validationKeyword = "newlineHTML" : validationKeyword = "stylingHTML";
  return validationKeyword;
}

function assignCommentValidation(validation: MovesValidation[]) {
  let commentStart = -1;
  let commentEnd = -1;
  for (let i = 0; i < validation.length; i++) {
    if (commentStart === -1) {
      commentStart = findIfCommentStart(i, validation);
    }
    if (commentStart !== -1 && (i === validation.length - 1 || validation[i][1] === 'newlineHTML')) {
      commentEnd = i;
      assignComments(commentStart, commentEnd, validation);
      commentStart = -1;
      commentEnd = -1;
    }
  }
  // console.log('comment validation:')
  // console.table(validation)
}

function findIfCommentStart(i: number, validation: MovesValidation[]): number {
  if (validation[i][0] === '/' && validation[i + 1]?.[0] === '/') {
    return i;
  }

  if (validation[i+1]?.[1] !== "stylingHTML") {
    return -1;
  }

  for (let j = i+2; j < validation.length; j++) {
    if (validation[j][1] === "stylingHTML") {
      continue;
    }
    if (validation[j][0] === '/') {
      return i;
    }
  } 
  return -1;
}

function assignComments(commentStart: number, commentEnd: number, validation: MovesValidation[]) {
  for (let j = commentStart; j <= commentEnd; j++) {
    if (validation[j][1] === "stylingHTML" || validation[j][1] === "newlineHTML") {
      continue;
    }
    validation[j][1] = "comment";
  }
}

function textToIterate(validation: MovesValidation[]) {
  // expand this to limit re-validation to only the effected area of text
  let iterationArray = [];
  for (let i=0; i < validation.length; i++) {
    if (validation[i][1] === "comment" || validation[i][1] === "newlineHTML" || validation[i][1] === "stylingHTML") {
      continue;
    } else { iterationArray.push(i);}
  }
  return iterationArray;
}



function assignParenthesis(validation: MovesValidation[], iterationArray: number[]) {

  //modifies validation array in place. Returns index of last rep digit.
  function assignRepsThenIncrement(i: number, iterationArray: number[], validation: MovesValidation[]) {
    let repTracker = 0;
    for (let j = i; j < iterationArray.length; j++) {
      
      const iterIndex = iterationArray[j];
      const char = validation[iterIndex][0];

      if (/[0-9]/.test(char)) {
        repTracker = parseInt(repTracker.toString() + char, 10);
        repTracker <= MAX_3X3_REPS ? validation[iterIndex][1] = "rep" : validation[iterIndex][1] = "invalid";
        //console.log('repTracker: ' + repTracker);
      } else { return j-1;}
    }
    return i-1;
  }

  
  const stack: { index: number; depth: number }[] = [];

  for (let i = 0; i < iterationArray.length; i++) {

    const iterIndex = iterationArray[i];
    const char = validation[iterIndex][0];

    if (char === '(') {
      const depth = stack.length + 1;
      stack.push({ index: iterIndex, depth });
    } 
    if (char === ')') {
      if (stack.length === 0) {
        validation[iterIndex][1] = "invalid";
        continue;
      }
      const { index, depth } = stack.pop()!;
      validation[index][1] = "paren";
      validation[index][2] = depth;
      validation[iterIndex][1] = "paren";
      validation[iterIndex][2] = depth;

      i = assignRepsThenIncrement(i+1, iterationArray, validation);
    }
  }

  stack.forEach(({ index }) => {
    validation[index][1] = "invalid";
  });
}




function assignSpaceValidation(validation: MovesValidation[], iterationArray: number[]) {
  iterationArray.forEach((i) => {
    if (/\s/.test(validation[i][0])) {
      validation[i][1] = "space";
    }
  });
}

function assignMoveValidation(validation: MovesValidation[], iterationArray: number[]) {
  let untestedMove = "";
  let start = -1;
  let end = -1;

  for (let i = 0; i < iterationArray.length; i++) {
    const iterIndex = iterationArray[i];
    const char = validation[iterIndex][0];
    const type = validation[iterIndex][1];

    if (type === 'unknown') {
      start = i;
      end = findMoveEnd(i, validation, iterationArray);
      untestedMove = findMove(start, end, validation, iterationArray);
      validateMove(untestedMove, validation, iterationArray, start, end);
    }
  }
}

function findMoveEnd(i: number, validation: MovesValidation[], iterationArray: number[]) {
  let end = -1;
  for (let j = i; j < iterationArray.length; j++) {

    let nextType = validation[iterationArray[j+1]]?.[1];

    if (nextType === 'unknown' || nextType === 'stylingHTML') {
      continue;
    } else {
      end = j;
      break;
    }
  }

  if (end === -1) {
    end = iterationArray.length - 1;
  }
  return end;
}

function findMove(start: number, end: number, validation: MovesValidation[], iterationArray: number[]) {
  let move = "";
  for (let i = start; i <= end; i++) {
    move = move + validation[iterationArray[i]][0];
  }
  return move;
}

function validateMove(move: string, validation: MovesValidation[], iterationArray: number[], start: number, end: number): MovesValidation[] {
  const validMoves = [
    "U", "U2", "U3", "U'", "U2'", "U3'",
    "u", "u2", "u3", "u'", "u2'", "u3'",
    "D", "D2", "D3", "D'", "D2'", "D3'",
    "d", "d2", "d3", "d'", "d2'", "d3'",
    "R", "R2", "R3", "R'", "R2'", "R3'",
    "r", "r2", "r3", "r'", "r2'", "r3'",
    "L", "L2", "L3", "L'", "L2'", "L3'",
    "l", "l2", "l3", "l'", "l2'", "l3'",
    "F", "F2", "F3", "F'", "F2'", "F3'",
    "f", "f2", "f3", "f'", "f2'", "f3'",
    "B", "B2", "B3", "B'", "B2'", "B3'",
    "b", "b2", "b3", "b'", "b2'", "b3'",
    "x","x'","x2","x2'","y","y'","y2","y2'","z","z'","z2","z2'",
    "M","M'","M2","M2'","E","E'","E2","E2'","S","S'","S2","S2'",
  ];

  const regex = new RegExp(`^(${validMoves.join('|')})$`);

  let validationKeyword = "invalid"
  if (regex.test(move)) {
    validationKeyword = "move"
  }
  
  for (let i = start; i <= end; i++) {
    const type = validation[iterationArray[i]][1];
    if (type === 'unknown') {
      validation[iterationArray[i]][1] = validationKeyword;
    }
  }

  return validation;
}