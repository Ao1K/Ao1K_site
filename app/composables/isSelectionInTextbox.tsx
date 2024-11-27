export default function isSelectionInTextbox(selection: Selection) {
  if (!selection || selection.rangeCount === 0) {
    return false;
  }

  const range = selection.getRangeAt(0);
  let node = range.commonAncestorContainer;

  if (node.nodeType === Node.TEXT_NODE) {
    node = node.parentNode as HTMLElement;
  }

  // Traverse up parent nodes till reaching body or contenteditable div
  while (node && node.nodeType === Node.ELEMENT_NODE) {
    const element = node as HTMLElement;

    if (element.getAttribute('contenteditable') === 'true') {
      return true;
    }

    if (element.tagName === 'BODY') {
      return false;
    }

    node = node.parentNode as HTMLElement;
  }

  return false;
}
