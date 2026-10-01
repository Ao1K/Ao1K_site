function hasContentEditableAncestor(startNode: Node) {
  let node: Node | null = startNode.nodeType === Node.TEXT_NODE ? startNode.parentNode : startNode;

  // Traverse up parent nodes till reaching body or contenteditable div
  while (node && node.nodeType === Node.ELEMENT_NODE) {
    const element = node as HTMLElement;

    if (element.getAttribute('contenteditable') === 'true') {
      return true;
    }

    if (element.tagName === 'BODY') {
      return false;
    }

    node = node.parentNode;
  }

  return false;
}

export default function isSelectionInTextbox(selection: Selection | null) {
  if (!selection || selection.rangeCount === 0) {
    return false;
  }

  try {
    return hasContentEditableAncestor(selection.getRangeAt(0).commonAncestorContainer);
  } catch {
    // firefox can place the selection in browser-internal nodes, like a <summary> toggle, and reading them throws.
    return false;
  }
}
