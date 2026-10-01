import { flushSync } from 'react-dom';
import { highlightClass } from '../../utils/sharedConstants';
import type { LineIconDatum } from '../../components/recon/IconStack';

export interface BreakdownWord {
  text: string;
  className: string;
  spaceBefore: boolean;
}

export interface BreakdownLine {
  index: number;
  words: BreakdownWord[];
  iconDatum: LineIconDatum | undefined;
}

export interface BreakdownSession {
  lines: BreakdownLine[];
  viewTransition: ViewTransition | null;
}

export interface EditorView {
  editor: HTMLElement;
  scrollBox: HTMLElement;
}

const VIEW_TRANSITION_CLASS = 'bd-flight';
export const FLIGHT_BOX_CLASS = 'bd-flight-box';
export const PAGE_TRANSITION_NAMES = {
  player: 'bd-player',
  heading: 'bd-solution-heading',
  reviewButton: 'bd-review-button',
  reviewLabel: 'bd-review-label',
  stats: 'bd-stats',
  solutionBox: 'bd-solution-box',
};

export const lineTransitionName = (index: number) => `bd-line-${index}`;
export const iconTransitionName = (index: number) => `bd-icon-${index}`;

export const flightStyle = (name: string) => ({ viewTransitionName: name, viewTransitionClass: VIEW_TRANSITION_CLASS });

const findEditorIcon = (index: number) =>
  document.querySelector<SVGSVGElement>(`[id^="step-icon-${index}-"] svg`);

const readableClassName = (node: Text, lineElement: HTMLElement) => {
  const parent = node.parentElement;
  if (!parent || parent === lineElement) return '';
  return parent.className === highlightClass ? 'text-primary-100' : parent.className;
};

const captureWords = (lineElement: HTMLElement): BreakdownWord[] => {
  const words: BreakdownWord[] = [];
  const walker = document.createTreeWalker(lineElement, NodeFilter.SHOW_TEXT);
  let hasPendingSpace = false;

  for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
    const className = readableClassName(node, lineElement);
    for (const [text] of node.data.matchAll(/\s+|\S+/g)) {
      if (/^\s/.test(text)) {
        hasPendingSpace = true;
        continue;
      }
      words.push({ text, className, spaceBefore: hasPendingSpace && words.length > 0 });
      hasPendingSpace = false;
    }
  }
  return words;
};

const captureLines = (editor: HTMLElement, lineIconData: LineIconDatum[]): BreakdownLine[] =>
  Array.from(editor.children)
    .map((element, index) => ({ element: element as HTMLElement, index }))
    .filter(({ element }) => (element.textContent ?? '').trim() !== '')
    .map(({ element, index }) => ({ index, words: captureWords(element), iconDatum: lineIconData[index] }));

const nameForViewTransition = (element: HTMLElement | SVGSVGElement, name: string | null) => {
  element.style.viewTransitionName = name ?? '';
  element.style.viewTransitionClass = name ? VIEW_TRANSITION_CLASS : '';
};

const nameVisibleEditorLines = ({ editor, scrollBox }: EditorView, lines: BreakdownLine[], isNamed: boolean) => {
  const box = scrollBox.getBoundingClientRect();
  lines.forEach(({ index }) => {
    const line = editor.children[index];
    if (!(line instanceof HTMLElement)) return;
    const rect = line.getBoundingClientRect();
    const isInView = isNamed && rect.bottom > box.top && rect.top < box.bottom;
    nameForViewTransition(line, isInView ? lineTransitionName(index) : null);
    const icon = findEditorIcon(index);
    if (icon) nameForViewTransition(icon, isInView ? iconTransitionName(index) : null);
  });
};

const canViewTransition = () => typeof document.startViewTransition === 'function';

export function startBreakdown(
  editorView: EditorView,
  lineIconData: LineIconDatum[],
  commit: (session: BreakdownSession) => void,
) {
  const lines = captureLines(editorView.editor, lineIconData);

  if (!canViewTransition()) {
    commit({ lines, viewTransition: null });
    return;
  }

  nameVisibleEditorLines(editorView, lines, true);
  const viewTransition = document.startViewTransition(() => {
    nameVisibleEditorLines(editorView, lines, false);
    flushSync(() => commit({ lines, viewTransition }));
  });
}

export function endBreakdown(lines: BreakdownLine[], getEditorView: () => EditorView | null, commit: () => void) {
  if (!canViewTransition()) {
    commit();
    return;
  }

  const viewTransition = document.startViewTransition(() => {
    flushSync(commit);
    const editorView = getEditorView();
    if (editorView) nameVisibleEditorLines(editorView, lines, true);
  });
  viewTransition.finished.finally(() => {
    const editorView = getEditorView();
    if (editorView) nameVisibleEditorLines(editorView, lines, false);
  });
}
