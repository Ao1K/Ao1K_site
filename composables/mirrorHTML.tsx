const VALID_SPAN_CLASS = 'text-light'; // mirror will ignore all other classes

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
  "F": "F'", "F2": "F2'", "F3": "F3'", "F'": "F", "F2'": "F2", "F3'": "F3",
  "f": "f'", "f2": "f2'", "f3": "f3'", "f'": "f", "f2'": "f2", "f3'": "f3",
  "B": "B'", "B2": "B2'", "B3": "B3'", "B'": "B", "B2'": "B2", "B3'": "B3",
  "b": "b'", "b2": "b2'", "b3": "b3'", "b'": "b", "b2'": "b2", "b3'": "b3",
  "x": "x'", "x2": "x2'", "x'": "x", "x2'": "x2",
  "y": "y'", "y2": "y2'", "y'": "y", "y2'": "y2",
  "z": "z'", "z2": "z2'", "z'": "z", "z2'": "z2",
  "M": "M'", "M2": "M2'", "M'": "M", "M2'": "M2",
  "E": "E'", "E2": "E2'", "E'": "E", "E2'": "E2",
  "S": "S'", "S2": "S2'", "S'": "S", "S2'": "S2"
};


function parseSelection(range: Range, textbox: string, processFunction: (text: string) => string): string | null {

  const parentElement = document.getElementById(textbox);
  const container = parentElement!.querySelector<HTMLDivElement>('div[contenteditable="true"]');

  if (!container) {
    console.error('container not found');
    return null;
  }
  
  function exploreAndProcess(node: Node): Node {
    if (node.nodeType === Node.ELEMENT_NODE) { // caretNodes are never a parent node and are handled by processFunction.
      const element = node as HTMLElement;
      const nodeRange = document.createRange();
      nodeRange.selectNodeContents(element);

      const startIsBeforeEndOfChild = range.compareBoundaryPoints(Range.START_TO_END, nodeRange) === 1;
      const endIsAfterStartOfChild = range.compareBoundaryPoints(Range.END_TO_START, nodeRange) === -1;
      const isWithinRange = startIsBeforeEndOfChild && endIsAfterStartOfChild;

      let clonedElement = element.cloneNode() as HTMLElement;

      if (isWithinRange && element.tagName === "SPAN") {
        let html = element.outerHTML;
        html = processFunction(html);
        
        clonedElement.innerHTML = html;

      } else if (isWithinRange) {
        for (const child of Array.from(element.childNodes)) {
          clonedElement.appendChild(exploreAndProcess(child));
        }

      } else {
        clonedElement = element.cloneNode(true) as HTMLElement;
      }

      console.log('clonedElement:', clonedElement);
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

const getSplits = (text: string, outerGroupRegex: RegExp, innerGroupRegex: RegExp): { split: string, isMatch: boolean }[] => {
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

const mirrorSplitMatches = (splits: { split: string, isMatch: boolean }[], replacementTable: { [key: string]: string }, caretPlaceholder: string, placeholderLength: number): string => {
  let mirroredText = "";
  const splitPattern = new RegExp(`(&nbsp;)`, 'g');

  splits.forEach(({ split, isMatch }) => {
    if (!isMatch) {
      mirroredText += split;
      return;
    }

    const moveParts = split.split(splitPattern);

    let mirroredMoveParts = moveParts.reduce((acc, movePart) => {
      if (movePart === "" || splitPattern.test(movePart)) {
        return acc + movePart;
      }

      const mirroredPart = replacementTable[movePart] || reportMove(movePart);
      return acc + mirroredPart;
    }, "");

    mirroredMoveParts = '<span class="' + VALID_SPAN_CLASS + '">' + mirroredMoveParts + '</span>';

    mirroredText += mirroredMoveParts;
  });

  return mirroredText;
};

const mirrorTextInValidSpans = (text: string, replacementTable: { [key: string]: string }): string => {

  const caretPlaceholder  = '&placeholder;';
  const placeholderLength = caretPlaceholder.length;
  text = text.replace(/<span id="caretNode"><\/span>/, caretPlaceholder);
  const hasPlaceholder = text.includes(caretPlaceholder);

  const outerGroupRegex = new RegExp(`(<span class="${VALID_SPAN_CLASS}">.*?<\/span>)`,'g');
  const innerGroupRegex = new RegExp(`<span class="${VALID_SPAN_CLASS}">(.*?)<\/span>`);

  let splits = getSplits(text, outerGroupRegex, innerGroupRegex);
  
  if (hasPlaceholder) {
    splits = adjustCaretPostitionInSplits(splits, caretPlaceholder);
  }

  const mirroredText = mirrorSplitMatches(splits, replacementTable, caretPlaceholder, placeholderLength);

  console.log('mirroredText:', mirroredText);
  return mirroredText;
}



interface MirrorHTMLFunction {
  (range: Range, textbox: string): string | null;
}

export const mirrorHTML_M: MirrorHTMLFunction = (range, textbox) => {
  function processMirrorM(text: string): string {
    text = mirrorTextInValidSpans(text, replacementTable_M);
    return text;
  }

  return parseSelection(range, textbox, processMirrorM);
};

export const mirrorHTML_S: MirrorHTMLFunction = (range, textbox) => {
  function processMirrorS(text: string): string {
    text = mirrorTextInValidSpans(text, replacementTable_S);
    return text;
  }

  return parseSelection(range, textbox, processMirrorS);
};
