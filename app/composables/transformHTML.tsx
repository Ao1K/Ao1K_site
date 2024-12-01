import { colorDict } from '../components/MovesTextEditor';
import simplifyRotations from './simplifyRotations';

const VALID_SPAN_CLASS = colorDict.find((dict) => dict.key === 'move')!.value;
const COMMENT_SPAN_CLASS = colorDict.find((dict) => dict.key === 'comment')!.value;

const replacementTable_M: { [key: string]: string } = {
  "U": "U'", "U2": "U2'", "U3": "U3'", "U'": "U", "U2'": "U2", "U3'": "U3",
  "u": "u'", "u2": "u2'", "u3": "u3'", "u'": "u", "u2'": "u2", "u3'": "u3",
  "D": "D'", "D2": "D2'", "D3": "D3'", "D'": "D", "D2'": "D2", "D3'": "D3",
  "d": "d'", "d2": "d2'", "d3": "d3'", "d'": "d", "d2'": "d2", "d3'": "d3",
  "L": "R'", "L2": "R2'", "L3": "R3'", "L'": "R", "L2'": "R2", "L3'": "R3",
  "l": "r'", "l2": "r2'", "l3": "r3'", "l'": "r", "l2'": "r2", "l3'": "r3",
  "R": "L'", "R2": "L2'", "R3": "L3'", "R'": "L", "R2'": "L2", "R3'": "L3",
  "r": "l'", "r2": "l2'", "r3": "l3'", "r'": "l", "r2'": "l2", "r3'": "l3",
  "F": "F'", "F2": "F2'", "F3": "F3'", "F'": "F", "F2'": "F2", "F3'": "F3",
  "f": "f'", "f2": "f2'", "f3": "f3'", "f'": "f", "f2'": "f2", "f3'": "f3",
  "B": "B'", "B2": "B2'", "B3": "B3'", "B'": "B", "B2'": "B2", "B3'": "B3",
  "b": "b'", "b2": "b2'", "b3": "b3'", "b'": "b", "b2'": "b2", "b3'": "b3",
  "x": "x", "x2": "x2", "x'": "x'", "x2'": "x2'",
  "y": "y'", "y2": "y2'", "y'": "y", "y2'": "y2",
  "z": "z'", "z2": "z2'", "z'": "z", "z2'": "z2",
  "M": "M", "M2": "M2", "M'": "M'", "M2'": "M2'",
  "E": "E'", "E2": "E2'", "E'": "E", "E2'": "E2",
  "S": "S'", "S2": "S2'", "S'": "S", "S2'": "S2"
};

const replacementTable_S: { [key: string]: string } = {
  "U": "U'", "U2": "U2'", "U3": "U3'", "U'": "U", "U2'": "U2", "U3'": "U3",
  "u": "u'", "u2": "u2'", "u3": "u3'", "u'": "u", "u2'": "u2", "u3'": "u3",
  "D": "D'", "D2": "D2'", "D3": "D3'", "D'": "D", "D2'": "D2", "D3'": "D3",
  "d": "d'", "d2": "d2'", "d3": "d3'", "d'": "d", "d2'": "d2", "d3'": "d3",
  "R": "R'", "R2": "R2'", "R3": "R3'", "R'": "R", "R2'": "R2", "R3'": "R3",
  "r": "r'", "r2": "r2'", "r3": "r3'", "r'": "r", "r2'": "r2", "r3'": "r3",
  "L": "L'", "L2": "L2'", "L3": "L3'", "L'": "L", "L2'": "L2", "L3'": "L3",
  "l": "l'", "l2": "l2'", "l3": "l3'", "l'": "l", "l2'": "l2", "l3'": "l3",
  "F": "B'", "F2": "B2'", "F3": "B3'", "F'": "B", "F2'": "B2", "F3'": "B3",
  "f": "b'", "f2": "b2'", "f3": "b3'", "f'": "b", "f2'": "b2", "f3'": "b3",
  "B": "F'", "B2": "F2'", "B3": "F3'", "B'": "F", "B2'": "F2", "B3'": "F3",
  "b": "f'", "b2": "f2'", "b3": "f3'", "b'": "f", "b2'": "f2", "b3'": "f3",
  "x": "x'", "x2": "x2'", "x'": "x", "x2'": "x2",
  "y": "y'", "y2": "y2'", "y'": "y", "y2'": "y2",
  "z": "z'", "z2": "z2'", "z'": "z", "z2'": "z2",
  "M": "M'", "M2": "M2'", "M'": "M", "M2'": "M2",
  "E": "E'", "E2": "E2'", "E'": "E", "E2'": "E2",
  "S": "S", "S2": "S2", "S'": "S'", "S2'": "S2'"
};

const replacementTable_X: { [key: string]: string } = {
  "U": "B", "U2": "B2", "U3": "B3", "U'": "B'", "U2'": "B2", "U3'": "B3'", // for double moves (ex: x2) that don't change, preserve the apostrophe. Else, remove.
  "u": "b", "u2": "b2", "u3": "b3", "u'": "b'", "u2'": "b2", "u3'": "b3'",
  "D": "F", "D2": "F2", "D3": "F3", "D'": "F'", "D2'": "F2", "D3'": "F3'",
  "d": "f", "d2": "f2", "d3": "f3", "d'": "f'", "d2'": "f2", "d3'": "f3'",
  "F": "U", "F2": "U2", "F3": "U3", "F'": "U'", "F2'": "U2", "F3'": "U3'",
  "f": "u", "f2": "u2", "f3": "u3", "f'": "u'", "f2'": "u2", "f3'": "u3'",
  "B": "D", "B2": "D2", "B3": "D3", "B'": "D'", "B2'": "D2", "B3'": "D3'",
  "b": "d", "b2": "d2", "b3": "d3", "b'": "d'", "b2'": "d2", "b3'": "d3'",
  "R": "R", "R2": "R2", "R3": "R3", "R'": "R'", "R2'": "R2'", "R3'": "R3'",
  "r": "r", "r2": "r2", "r3": "r3", "r'": "r'", "r2'": "r2'", "r3'": "r3'",
  "L": "L", "L2": "L2", "L3": "L3", "L'": "L'", "L2'": "L2'", "L3'": "L3'",
  "l": "l", "l2": "l2", "l3": "l3", "l'": "l'", "l2'": "l2'", "l3'": "l3'",
  "x": "x", "x2": "x2", "x'": "x'", "x2'": "x2'", 
  "y": "z'", "y2": "z2", "y'": "z", "y2'": "z2",
  "z": "y", "z2": "y2", "z'": "y'", "z2'": "y2",
  "M": "M", "M2": "M2", "M'": "M'", "M2'": "M2'",
  "E": "S", "E2": "S2", "E'": "S'", "E2'": "S2",
  "S": "E'", "S2": "E2", "S'": "E", "S2'": "E2"
};

const replacementTable_Y: { [key: string]: string } = {
  "U": "U", "U2": "U2", "U3": "U3", "U'": "U'", "U2'": "U2'", "U3'": "U3'",
  "u": "u", "u2": "u2", "u3": "u3", "u'": "u'", "u2'": "u2'", "u3'": "u3'",
  "D": "D", "D2": "D2", "D3": "D3", "D'": "D'", "D2'": "D2'", "D3'": "D3'",
  "d": "d", "d2": "d2", "d3": "d3", "d'": "d'", "d2'": "d2'", "d3'": "d3'",
  "F": "L", "F2": "L2", "F3": "L3", "F'": "L'", "F2'": "L2", "F3'": "L3'",
  "f": "l", "f2": "l2", "f3": "l3", "f'": "l'", "f2'": "l2", "f3'": "l3'",
  "B": "R", "B2": "R2", "B3": "R3", "B'": "R'", "B2'": "R2", "B3'": "R3'",
  "b": "r", "b2": "r2", "b3": "r3", "b'": "r'", "b2'": "r2", "b3'": "r3'",
  "L": "B", "L2": "B2", "L3": "B3", "L'": "B'", "L2'": "B2", "L3'": "B3'",
  "l": "b", "l2": "b2", "l3": "b3", "l'": "b'", "l2'": "b2", "l3'": "b3'",
  "R": "F", "R2": "F2", "R3": "F3", "R'": "F'", "R2'": "F2", "R3'": "F3'",
  "r": "f", "r2": "f2", "r3": "f3", "r'": "f'", "r2'": "f2", "r3'": "f3'",
  "x": "z", "x2": "z2", "x'": "z'", "x2'": "z2",
  "y": "y", "y2": "y2", "y'": "y'", "y2'": "y2'",
  "z": "x'", "z2": "x2", "z'": "x", "z2'": "x2",
  "M": "S'", "M2": "S2", "M'": "S", "M2'": "S2",
  "E": "E", "E2": "E2", "E'": "E'", "E2'": "E2'",
  "S": "M", "S2": "M2", "S'": "M'", "S2'": "M2"
};

const replacementTable_Z: { [key: string]: string } = {
  "U": "R", "U2": "R2", "U3": "R3", "U'": "R'", "U2'": "R2", "U3'": "R3'",
  "u": "r", "u2": "r2", "u3": "r3", "u'": "r'", "u2'": "r2", "u3'": "r3'",
  "D": "L", "D2": "L2", "D3": "L3", "D'": "L'", "D2'": "L2", "D3'": "L3'",
  "d": "l", "d2": "l2", "d3": "l3", "d'": "l'", "d2'": "l2", "d3'": "l3'",
  "R": "D", "R2": "D2", "R3": "D3", "R'": "D'", "R2'": "D2", "R3'": "D3'",
  "r": "d", "r2": "d2", "r3": "d3", "r'": "d'", "r2'": "d2", "r3'": "d3'",
  "L": "U", "L2": "U2", "L3": "U3", "L'": "U'", "L2'": "U2", "L3'": "U3'",
  "l": "u", "l2": "u2", "l3": "u3", "l'": "u'", "l2'": "u2", "l3'": "u3'",
  "F": "F", "F2": "F2", "F3": "F3", "F'": "F'", "F2'": "F2'", "F3'": "F3'",
  "f": "f", "f2": "f2", "f3": "f3", "f'": "f'", "f2'": "f2'", "f3'": "f3'",
  "B": "B", "B2": "B2", "B3": "B3", "B'": "B'", "B2'": "B2'", "B3'": "B3'",
  "b": "b", "b2": "b2", "b3": "b3", "b'": "b'", "b2'": "b2'", "b3'": "b3'",
  "x": "y'", "x2": "y2", "x'": "y", "x2'": "y2",
  "y": "x", "y2": "x2", "y'": "x'", "y2'": "x2",
  "z": "z", "z2": "z2", "z'": "z'", "z2'": "z2'",
  "M": "E'", "M2": "E2", "M'": "E", "M2'": "E2",
  "E": "M", "E2": "M2", "E'": "M'", "E2'": "M2",
  "S": "S", "S2": "S2", "S'": "S'", "S2'": "S2'"
};



function parseSelection(range: Range, textbox: string, processFunction: (text: string, isFirstTransform: boolean) => string): string | null {

  let isFirstTransform = true;

  const parentElement = document.getElementById(textbox);
  const container = parentElement!.querySelector<HTMLDivElement>('div[contenteditable="true"]');

  if (!container) {
    console.error('textbox not found');
    return null;
  }
  
  function exploreAndProcess(node: Node): Node {
    if (node.nodeType === Node.ELEMENT_NODE) { // caretNodes are never a parent node and are handled by processFunction.
      const element = node as HTMLElement;
      const nodeRange = document.createRange();
      nodeRange.selectNodeContents(element);

    // TODO: to properly check the boundararies of the selection within each span,
      // would need to grab selection and range.
        // const selection = window.getSelection();
        // const range = selection.getRangeAt(0);
      // then somehow compare that range to the range of the span, and expand the selection until the end of span or until it reaches a &nbsp;.
      // then split the spans accordingly and pass to processFunction.

      const startIsBeforeEndOfChild = range.compareBoundaryPoints(Range.START_TO_END, nodeRange) === 1;
      const endIsAfterStartOfChild = range.compareBoundaryPoints(Range.END_TO_START, nodeRange) === -1;
      const isWithinRange = startIsBeforeEndOfChild && endIsAfterStartOfChild;

      let clonedElement = element.cloneNode() as HTMLElement;

      if (isWithinRange && element.tagName === "SPAN") {
        let html = element.outerHTML;

        html = processFunction(html, isFirstTransform);

        isFirstTransform = false;

        clonedElement.innerHTML = html;

      } else if (isWithinRange) {
        for (const child of Array.from(element.childNodes)) {
          clonedElement.appendChild(exploreAndProcess(child));
        }

      } else {
        clonedElement = element.cloneNode(true) as HTMLElement;
      }

      return clonedElement;
    } else {
      return node.cloneNode(true);
    }
  }

  const resultContainer = exploreAndProcess(container) as HTMLDivElement;
  return resultContainer.innerHTML;

}



const reportMove = (move: string): string => {
  console.warn(`Move  "${move}" is not supported`);
  return move;
}

const getSplits = (text: string): { split: string, isMatch: boolean }[] => {

  const outerGroupRegex = new RegExp(`(<span class="${VALID_SPAN_CLASS}">.*?<\/span>)`,'g'); // matches entire span
  const innerGroupRegex = new RegExp(`<span class="${VALID_SPAN_CLASS}">(.*?)<\/span>`); // matches what the span contains

  const splits: { split: string, isMatch: boolean }[] = [];
  const outerSplits = text.split(outerGroupRegex);

  outerSplits.forEach((outerSplit) => {
    if (outerSplit === "") return;

    // format innerGroupRegex matches to not include span wrapper
    const innerSplit = innerGroupRegex.exec(outerSplit);
    const isMatch = innerSplit !== null;
    const formattedSplit = isMatch ? innerSplit[1] : outerSplit;

    splits.push({ split: formattedSplit, isMatch: isMatch });
  });

  return splits;
};

const adjustCaretPostitionInSplits = (splits: { split: string, isMatch: boolean }[], caretPlaceholder: string): { split: string, isMatch: boolean }[] => {
  for (let i = 0; i < splits.length; i++) {
    let split = splits[i]['split'];

    // give caret its own split after the first match. Assumes only 1 caretNode.
    const placeholderIndex = split.indexOf(caretPlaceholder);
    if (placeholderIndex !== -1) {
      splits[i]['split'] = split.replace(caretPlaceholder, '');

      splits.splice(i + 1, 0, { split: '<span id="caretNode"></span>', isMatch: false });

      break;
    }
  }
  return splits;
};

const transformSplitMatches = (splits: { split: string, isMatch: boolean }[], replacementTable: { [key: string]: string }, caretPlaceholder: string, placeholderLength: number): string[] => {
  let transformedSplits: string[] = [];
  const splitPattern = new RegExp(`(&nbsp;)`, 'g');

  splits.forEach(({ split, isMatch }) => {
    if (!isMatch) {
      transformedSplits.push(split);
      return;
    }

    const moveParts = split.split(splitPattern);

    let transformedMoveParts = moveParts.reduce((acc, movePart) => {
      if (movePart === "" || splitPattern.test(movePart)) {
        return acc + movePart;
      }

      const transformedPart = replacementTable[movePart] || reportMove(movePart);
      return acc + transformedPart;
    }, "");

    //transformedMoveParts = '<span class="' + VALID_SPAN_CLASS + '">' + transformedMoveParts + '</span>';

    transformedSplits.push(transformedMoveParts);
  });

  return transformedSplits;
};

const getCurrentRotationPrefix = (text: string): string => {
  const prefixRegex = new RegExp(`^(&nbsp;)*((x|y|z)('|2'|2|)(&nbsp;|$)+)+`); 
  // matches: 
   // 1. start of string
   // 2. zero or more &nbsp;
   // 3. one of any rotation
   // 4. one or more space or end of string
   // 5. repeat 3-4 one or more times
  
  let prefixMatch = text.match(prefixRegex);
  let match = prefixMatch ? prefixMatch[0] : '';
  return match;
}


const getNewRotationPrefix = (currentPrefix: string, rotation: string): string => {
  currentPrefix = currentPrefix.replace(/(&nbsp;)+/g, ' ').trim();
  let newPrefix = (rotation + ' ' + currentPrefix).trim();

  newPrefix = simplifyRotations(newPrefix).join('&nbsp;');

  return newPrefix;
}


const findRotationPrefixChange = (text: string, rotation: string): string[] => {
  const currentPrefix = getCurrentRotationPrefix(text);
  const newPrefix = getNewRotationPrefix(currentPrefix, rotation);

  return [currentPrefix, newPrefix]

}

const joinSplits = (transformedSplitText: string[], splits: { split: string, isMatch: boolean }[]): string => {
  let transformedText = '';
  splits.forEach(({ isMatch }, i) => {
    if (!isMatch) {
      transformedText += transformedSplitText[i];
    } else {
      transformedText += '<span class="' + VALID_SPAN_CLASS + '">' + transformedSplitText[i] + '</span>'
    }
  });
  return transformedText;
}

const transformTextInValidSpans = (text: string, replacementTable: { [key: string]: string }, rotation?: string): string => {

  const caretPlaceholder  = '&placeholder;';
  const placeholderLength = caretPlaceholder.length;
  text = text.replace(/<span id="caretNode"><\/span>/, caretPlaceholder);
  const hasPlaceholder = text.includes(caretPlaceholder);

  let splits = getSplits(text); 
  // getSplits returns an array of objects of either modifiable span inner text or outer spans, if no text was found.
  // isMatch is used to differentiate these.
  
  if (hasPlaceholder) {
    splits = adjustCaretPostitionInSplits(splits, caretPlaceholder);
  }

  let newRotationPrefix = '';
  let oldRotationPrefix = '';

  
  const transformedSplitText = transformSplitMatches(splits, replacementTable, caretPlaceholder, placeholderLength);
  
  if (rotation) { // indicates first transform on a rotation transform request
    for (let i = 0; i < transformedSplitText.length; i++) {
      if (splits[i].isMatch) {

        [oldRotationPrefix, newRotationPrefix] = findRotationPrefixChange(transformedSplitText[i], rotation);

        transformedSplitText[i] = transformedSplitText[i]
          .replace(oldRotationPrefix, '')
          .replace(/^(&nbsp;)+/g, ''); // remove leading spaces

          newRotationPrefix ? transformedSplitText[i] = newRotationPrefix + '&nbsp;' + transformedSplitText[i] : null;
        break;
      }
    }
  }

  let transformedText = joinSplits(transformedSplitText, splits);

  return transformedText;
}

export interface TransformHTMLprops {
  (range: Range, textbox: string): string | null;
}

export const mirrorHTML_M: TransformHTMLprops = (range, textbox) => {
  function processMirrorM(text: string): string {
    text = transformTextInValidSpans(text, replacementTable_M);
    return text;
  }

  return parseSelection(range, textbox, processMirrorM);
};

export const mirrorHTML_S: TransformHTMLprops = (range, textbox) => {
  function processMirrorS(text: string): string {
    text = transformTextInValidSpans(text, replacementTable_S);
    return text;
  }

  return parseSelection(range, textbox, processMirrorS);
};

export const removeComments: TransformHTMLprops = (range, textbox) => {
  function processRemoveComments(text: string): string {
    const commentSpan = new RegExp(`<span class="${COMMENT_SPAN_CLASS}">(.*?)<\/span>`, 'g');
    return text.replaceAll(commentSpan, '');
  }
  
  return parseSelection(range, textbox, processRemoveComments);
}

// roatation functions will break if VALID_SPAN_CLASS is ever not used for rotations.
// can fix by turning VALID_SPAN_CLASS into an array of valid classes that's passed into parseSelection as an argument.
export const rotateHTML_X: TransformHTMLprops = (range, textbox) => {
  function processRotateX(text: string, isFirstRotation: boolean): string {
    text = transformTextInValidSpans(text, replacementTable_X, isFirstRotation ? 'x' : undefined);
    return text;
  }
  
  return parseSelection(range, textbox, processRotateX);
}

export const rotateHTML_Y: TransformHTMLprops = (range, textbox) => {
  function processRotateY(text: string, isFirstRotation: boolean): string {
    text = transformTextInValidSpans(text, replacementTable_Y, isFirstRotation ? 'y' : undefined);
    return text;
  }
  
  return parseSelection(range, textbox, processRotateY);
}

export const rotateHTML_Z: TransformHTMLprops = (range, textbox) => {
  function processRotateZ(text: string, isFirstRotation: boolean): string {
    text = transformTextInValidSpans(text, replacementTable_Z, isFirstRotation ? 'z' : undefined);
    return text;
  }
  
  return parseSelection(range, textbox, processRotateZ);
}