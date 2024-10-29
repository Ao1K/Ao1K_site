import isSelectionInTextbox from "./isSelectionInTextbox";

export default function addCat() {
  const src = '/tangus.png';
  const img = document.createElement('img');
  img.src = src;
  img.alt = 'Tangus';

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
    range.insertNode(img);

    const newRange = document.createRange();
    newRange.setStartAfter(img);
    newRange.setEndAfter(img);

    selection.removeAllRanges();
    selection.addRange(newRange);
  }
}