import isSelectionInTextbox from "./isSelectionInTextbox";

export default async function addCat() {
  const src = '/tangus.png';
  const img = document.createElement('img');
  img.src = src;
  img.alt = 'Tangus';

  const span = document.createElement('span');
  span.appendChild(img);

  let selection = window.getSelection();

  if (selection && isSelectionInTextbox(selection) === false) {
    const defaultID = 'scramble';
    const parentElement = document.getElementById(defaultID);
    const textbox = parentElement?.querySelector<HTMLDivElement>('div[contenteditable="true"]');
    if (textbox) {
      selection = await focusTextbox(textbox);
    }
  }

  addCatSpan(selection, span);
}

const focusTextbox = (textbox: HTMLDivElement) => {
  return new Promise<Selection | null>((resolve) => {
    textbox.focus();
    setTimeout(() => resolve(window.getSelection()), 50);
  });
};

const addCatSpan = (selection: Selection | null, span: HTMLSpanElement) => {
  if (selection && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    range.insertNode(span);
    
    selection.removeAllRanges();

    const newRange = document.createRange();
    newRange.setStartAfter(span);
    newRange.setEndAfter(span);

    selection.addRange(newRange);
  }
} 