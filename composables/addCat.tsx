import isSelectionInTextbox from "./isSelectionInTextbox";

export default function addCat() {
  const src = '/tangus.png';
  const img = document.createElement('img');
  img.src = src;
  img.alt = 'Tangus';
  
  // wrap image in span
  const span = document.createElement('span');
  span.appendChild(img);

  let selection = window.getSelection();

  if (selection && isSelectionInTextbox(selection) === false) {
    // default to scramble contenteditable div
    const defaultID = 'scramble';
    const parentElement = document.getElementById(defaultID);
    const textbox = parentElement!.querySelector<HTMLDivElement>('div[contenteditable="true"]');
    textbox?.focus()
    selection = window.getSelection();
  } 

  if (selection && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    range.insertNode(span);

    const newRange = document.createRange();
    newRange.setStartAfter(span);
    newRange.setEndAfter(span);

    selection.removeAllRanges();
    selection.addRange(newRange);
  }
}