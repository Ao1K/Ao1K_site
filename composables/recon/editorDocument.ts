import type { CubeParser, InputRule, Parser } from '../../utils/parser';
import { colorDict } from '../../utils/sharedConstants';

export const MAX_3X3_REPS = 1260;

export type MoveSegment<M> = { kind: 'move'; move: M; start: number; end: number; depth: number };

export type Segment<M> =
  | MoveSegment<M>
  | { kind: 'invalid'; text: string; start: number; end: number }
  | { kind: 'comment'; text: string; start: number; end: number }
  | { kind: 'open' | 'close'; depth: number; start: number; end: number }
  | { kind: 'reps'; count: number; start: number; end: number }
  | { kind: 'hashtag'; text: string; start: number; end: number }
  | { kind: 'space'; start: number; end: number };

export type SegmentStyle = 'move' | 'invalid' | 'comment' | 'paren' | 'rep' | 'hashtag' | 'space';

export type Caret = { line: number; offset: number };
export type TextRange = { start: Caret; end: Caret };
export type TransformResult = { lines: string[]; selection: TextRange };
export type SelectionTransform = (lines: readonly string[], range: TextRange) => TransformResult;
export type DomPoint = { node: Node; offset: number };

type MoveReader<M extends string> = Pick<Parser<M, string>, 'parseMove'>;
type CharKind = 'unknown' | 'hashtag' | 'comment' | 'open' | 'close' | 'reps' | 'invalid' | 'space';
type LineEdit = { start: number; end: number; text: string };
type SelectedLine<M> = { text: string; segments: Segment<M>[]; selected: Segment<M>[] };
type SequenceNode<M> = { kind: 'move'; move: M } | { kind: 'group'; children: SequenceNode<M>[]; reps: string };

const CARET_MARK = '\u0000';
const BLOCK_TAGS = new Set(['DIV', 'P']);

function markHashtags(text: string, kinds: CharKind[]) {
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== '#') continue;
    const whitespaceIndex = text.slice(i).search(/\s/);
    const end = whitespaceIndex === -1 ? text.length : i + whitespaceIndex;
    kinds.fill('hashtag', i, end);
    i = end - 1;
  }
}

function markGroups(text: string, kinds: CharKind[], depths: number[]) {
  const openStack: number[] = [];
  for (let i = 0; i < text.length; i++) {
    if (kinds[i] !== 'unknown') continue;
    if (text[i] === '(') {
      openStack.push(i);
      continue;
    }
    if (text[i] !== ')') continue;

    const openIndex = openStack.pop();
    if (openIndex === undefined) {
      kinds[i] = 'invalid';
      continue;
    }
    const depth = openStack.length + 1;
    kinds[openIndex] = 'open';
    kinds[i] = 'close';
    depths[openIndex] = depth;
    depths[i] = depth;

    let reps = 0;
    while (i + 1 < text.length && kinds[i + 1] === 'unknown' && /[0-9]/.test(text[i + 1])) {
      i++;
      reps = reps * 10 + Number(text[i]);
      kinds[i] = reps <= MAX_3X3_REPS ? 'reps' : 'invalid';
    }
  }
  for (const openIndex of openStack) kinds[openIndex] = 'invalid';
}

export function parseLine<M extends string>(text: string, parser: MoveReader<M>): Segment<M>[] {
  const kinds = new Array<CharKind>(text.length).fill('unknown');
  const depths = new Array<number>(text.length).fill(0);

  markHashtags(text, kinds);
  const commentStart = text.indexOf('//');
  if (commentStart !== -1) {
    for (let i = commentStart; i < text.length; i++) {
      if (kinds[i] !== 'hashtag') kinds[i] = 'comment';
    }
  }
  markGroups(text, kinds, depths);
  for (let i = 0; i < text.length; i++) {
    if (kinds[i] === 'unknown' && /\s/.test(text[i])) kinds[i] = 'space';
  }

  const segments: Segment<M>[] = [];
  let depth = 0;
  let start = 0;
  while (start < text.length) {
    const kind = kinds[start];
    if (kind === 'open' || kind === 'close') {
      segments.push({ kind, depth: depths[start], start, end: start + 1 });
      depth = kind === 'open' ? depths[start] : depths[start] - 1;
      start++;
      continue;
    }

    let end = start + 1;
    while (end < text.length && kinds[end] === kind) end++;
    const segmentText = text.slice(start, end);

    if (kind === 'unknown') {
      const move = parser.parseMove(segmentText);
      segments.push(move === null
        ? { kind: 'invalid', text: segmentText, start, end }
        : { kind: 'move', move, start, end, depth });
    } else if (kind === 'reps') {
      segments.push({ kind, count: Number(segmentText), start, end });
    } else if (kind === 'space') {
      segments.push({ kind, start, end });
    } else {
      segments.push({ kind, text: segmentText, start, end });
    }
    start = end;
  }
  return segments;
}

function expandMoveSegments<M>(segments: readonly Segment<M>[], maxMoves?: number): MoveSegment<M>[] {
  const frames: MoveSegment<M>[][] = [[]];
  let total = 0;

  segments.forEach((segment, index) => {
    if (segment.kind === 'move') {
      frames[frames.length - 1].push(segment);
      total++;
    } else if (segment.kind === 'open') {
      frames.push([]);
    } else if (segment.kind === 'close' && frames.length > 1) {
      const group = frames.pop()!;
      const next = segments[index + 1];
      const reps = next?.kind === 'reps' && next.count > 0 ? next.count : 1;
      total += group.length * (reps - 1);
      if (maxMoves !== undefined && total > maxMoves) {
        throw new Error(`Move limit of ${maxMoves} exceeded`);
      }
      const parent = frames[frames.length - 1];
      for (let rep = 0; rep < reps; rep++) {
        for (const move of group) parent.push(move);
      }
    }
  });

  return frames.flat();
}

export function expandLine<M>(segments: readonly Segment<M>[], maxMoves?: number): M[] {
  return expandMoveSegments(segments, maxMoves).map(segment => segment.move);
}

export function countMovesBeforeCaret<M>(segments: readonly Segment<M>[], caretOffset: number): number {
  let wordEnd = caretOffset;
  for (const segment of segments) {
    const isWord = segment.kind === 'move' || segment.kind === 'reps' || segment.kind === 'hashtag';
    if (isWord && segment.start <= wordEnd && wordEnd < segment.end) wordEnd = segment.end;
  }
  return expandMoveSegments(segments.filter(segment => segment.start < wordEnd)).length;
}

export function segmentStyle<M>(segment: Segment<M>): SegmentStyle {
  switch (segment.kind) {
    case 'open':
    case 'close':
      return 'paren';
    case 'reps':
      return 'rep';
    default:
      return segment.kind;
  }
}

export function escapeText(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function paintLine<M>(text: string, segments: readonly Segment<M>[], highlightMoveIndex?: number): string {
  const highlighted = highlightMoveIndex === undefined ? undefined : expandMoveSegments(segments)[highlightMoveIndex];
  const spans: { style: keyof typeof colorDict; text: string }[] = [];
  let previousStyle: keyof typeof colorDict | null = null;

  for (const segment of segments) {
    const style = segment === highlighted ? 'highlight' : segmentStyle(segment);
    const piece = text.slice(segment.start, segment.end).replace(/\s/g, ' ');
    const joinsPrevious = style === previousStyle || (segment.kind === 'space' && previousStyle !== null);

    if (joinsPrevious) spans[spans.length - 1].text += piece;
    else spans.push({ style, text: piece });

    if (segment.kind !== 'space') previousStyle = style;
  }

  return spans.map(span => `<span class="${colorDict[span.style]}">${escapeText(span.text)}</span>`).join('');
}

export function linesToHTML(lines: readonly string[]): string {
  return lines.map(line => `<div>${escapeText(line)}<br></div>`).join('');
}

export function applyInputRules(
  text: string,
  caretOffset: number | null,
  rules: readonly InputRule[],
): { text: string; caretOffset: number | null } {
  const commentStart = text.indexOf('//');
  const ruleEnd = commentStart === -1 ? text.length : commentStart;
  const ruleText = text.slice(0, ruleEnd);
  const caretInRuleText = caretOffset !== null && caretOffset <= ruleEnd;

  const markedText = caretInRuleText
    ? ruleText.slice(0, caretOffset) + CARET_MARK + ruleText.slice(caretOffset)
    : ruleText;
  const substituted = rules.reduce((current, rule) => current.replace(rule.pattern, rule.replacement), markedText);
  const markIndex = substituted.indexOf(CARET_MARK);
  const newRuleText = substituted.replace(CARET_MARK, '');
  const newText = newRuleText + text.slice(ruleEnd);

  let newCaretOffset: number | null = null;
  if (caretOffset !== null) {
    newCaretOffset = caretInRuleText
      ? (markIndex === -1 ? Math.min(caretOffset, newRuleText.length) : markIndex)
      : caretOffset + newRuleText.length - ruleEnd;
  }

  return { text: newText, caretOffset: newCaretOffset };
}

export function mapCaretOffset(oldText: string, newText: string, offset: number): number {
  const sharedLength = Math.min(oldText.length, newText.length);
  let prefix = 0;
  while (prefix < sharedLength && oldText[prefix] === newText[prefix]) prefix++;
  let suffix = 0;
  while (
    suffix < sharedLength - prefix
    && oldText[oldText.length - 1 - suffix] === newText[newText.length - 1 - suffix]
  ) suffix++;

  if (offset <= prefix) return offset;
  const mappedOffset = offset >= oldText.length - suffix
    ? newText.length - (oldText.length - offset)
    : newText.length - suffix;
  return mappedOffset;
}

export function readEditorLines(root: Node, points: readonly DomPoint[] = []): { lines: string[]; points: (Caret | null)[] } {
  const lines: string[] = [];
  let current: string | null = null;
  const found: (Caret | null)[] = points.map(() => null);

  const markPoints = (node: Node, offset: number) => {
    points.forEach((point, index) => {
      if (point.node === node && point.offset === offset) {
        found[index] = { line: lines.length, offset: current?.length ?? 0 };
      }
    });
  };

  const breakLine = () => {
    lines.push(current ?? '');
    current = '';
  };

  const closeLine = () => {
    if (current !== null) lines.push(current);
    current = null;
  };

  const isPlaceholderBreak = (br: Node) => {
    let node = br;
    while (!node.nextSibling && node.parentNode && node.parentNode !== root && !BLOCK_TAGS.has(node.parentNode.nodeName)) {
      node = node.parentNode;
    }
    return !node.nextSibling;
  };

  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const data = (node as Text).data;
      for (let i = 0; i < data.length; i++) {
        markPoints(node, i);
        if (data[i] === '\n') breakLine();
        else current = (current ?? '') + (data[i] === ' ' ? ' ' : data[i]);
      }
      markPoints(node, data.length);
      return;
    }

    if (node.nodeName === 'BR') {
      if (isPlaceholderBreak(node)) current ??= '';
      else breakLine();
      return;
    }

    const isBlock = node !== root && BLOCK_TAGS.has(node.nodeName);
    if (isBlock) closeLine();
    node.childNodes.forEach((child, index) => {
      markPoints(node, index);
      walk(child);
    });
    markPoints(node, node.childNodes.length);
    if (isBlock) closeLine();
  };

  walk(root);
  closeLine();
  if (lines.length === 0) lines.push('');

  const clampedPoints = found.map(caret => {
    if (!caret) return null;
    const line = Math.min(caret.line, lines.length - 1);
    const offset = caret.line > line ? lines[line].length : Math.min(caret.offset, lines[line].length);
    return { line, offset };
  });

  return { lines, points: clampedPoints };
}

export function findDomPoint(root: HTMLElement, caret: Caret): DomPoint {
  const lineElements = Array.from(root.children).filter(child => child.tagName === 'DIV');
  const lineElement = lineElements[Math.min(caret.line, lineElements.length - 1)];
  if (!lineElement) return { node: root, offset: 0 };

  const walker = document.createTreeWalker(lineElement, NodeFilter.SHOW_TEXT);
  let remaining = caret.offset;
  let lastText: Text | null = null;
  while (walker.nextNode()) {
    const textNode = walker.currentNode as Text;
    if (remaining <= textNode.length) return { node: textNode, offset: remaining };
    remaining -= textNode.length;
    lastText = textNode;
  }

  const endPoint = lastText ? { node: lastText, offset: lastText.length } : { node: lineElement, offset: 0 };
  return endPoint;
}

function selectLines<M extends string>(lines: readonly string[], range: TextRange, parser: MoveReader<M>): SelectedLine<M>[] {
  return lines.map((text, index) => {
    const segments = parseLine(text, parser);
    const isInRange = index >= range.start.line && index <= range.end.line;
    if (!isInRange) return { text, segments, selected: [] };

    const rangeFrom = index === range.start.line ? range.start.offset : 0;
    const rangeTo = index === range.end.line ? range.end.offset : text.length;
    const touchedGroups = findGroupSpans(segments).filter(span => span.start < rangeTo && span.end > rangeFrom);
    const from = Math.min(rangeFrom, ...touchedGroups.map(span => span.start));
    const to = Math.max(rangeTo, ...touchedGroups.map(span => span.end));
    const selected = segments.filter(segment => segment.kind !== 'space' && segment.start < to && segment.end > from);
    return { text, segments, selected };
  });
}

function findGroupSpans<M>(segments: readonly Segment<M>[]): { start: number; end: number }[] {
  const spans: { start: number; end: number }[] = [];
  const openStarts: number[] = [];
  segments.forEach((segment, index) => {
    if (segment.kind === 'open') openStarts.push(segment.start);
    if (segment.kind !== 'close') return;

    const start = openStarts.pop();
    if (start === undefined) return;
    const next = segments[index + 1];
    spans.push({ start, end: next?.kind === 'reps' ? next.end : segment.end });
  });
  return spans;
}

function mapOffsetThroughEdits(edits: readonly LineEdit[], offset: number, includeInsertsAtOffset: boolean): number {
  return edits.reduce((mapped, edit) => {
    const isBeforeOffset = edit.end < offset || (edit.end === offset && (includeInsertsAtOffset || edit.start < offset));
    if (isBeforeOffset) return mapped + edit.text.length - (edit.end - edit.start);
    const isOffsetInsideEdit = edit.start < offset;
    const insertedLength = includeInsertsAtOffset ? edit.text.length : 0;
    return isOffsetInsideEdit ? mapped - (offset - edit.start) + insertedLength : mapped;
  }, offset);
}

function editSelectedLines<M>(range: TextRange, selectedLines: readonly SelectedLine<M>[], lineEdits: readonly LineEdit[][]): TransformResult {
  const lines = selectedLines.map(({ text }, index) => applyEdits(text, lineEdits[index]));
  if (lineEdits.every(edits => edits.length === 0)) return { lines, selection: range };

  const firstLine = selectedLines.findIndex(line => line.selected.length > 0);
  const lastLine = selectedLines.findLastIndex(line => line.selected.length > 0);
  const firstSegment = selectedLines[firstLine].selected[0];
  const lastSegment = selectedLines[lastLine].selected[selectedLines[lastLine].selected.length - 1];
  const selection = {
    start: { line: firstLine, offset: mapOffsetThroughEdits(lineEdits[firstLine], firstSegment.start, false) },
    end: { line: lastLine, offset: mapOffsetThroughEdits(lineEdits[lastLine], lastSegment.end, true) },
  };
  return { lines, selection };
}

function applyEdits(text: string, edits: readonly LineEdit[]): string {
  let result = '';
  let cursor = 0;
  for (const edit of [...edits].sort((a, b) => a.start - b.start)) {
    result += text.slice(cursor, edit.start) + edit.text;
    cursor = edit.end;
  }
  return result + text.slice(cursor);
}

export function relabelSelectedMoves<M extends string>(
  lines: readonly string[],
  range: TextRange,
  parser: MoveReader<M>,
  transform: (moves: readonly M[]) => M[],
): TransformResult {
  const selectedLines = selectLines(lines, range, parser);
  const lineEdits = selectedLines.map(({ selected }) => {
    const moveSegments = selected.filter(segment => segment.kind === 'move');
    const relabeled = transform(moveSegments.map(segment => segment.move));
    return moveSegments.map((segment, i) => ({ start: segment.start, end: segment.end, text: relabeled[i] }));
  });
  return editSelectedLines(range, selectedLines, lineEdits);
}

export function rotateSelectedMoves<M extends string, R extends M>(
  lines: readonly string[],
  range: TextRange,
  parser: Pick<CubeParser<M, string, R>, 'parseMove' | 'rotate' | 'isRotation' | 'simplifyRotations' | 'format'>,
  rotation: R,
): TransformResult {
  const selectedLines = selectLines(lines, range, parser);
  const prefixLineIndex = selectedLines.findIndex(line => line.selected.some(segment => segment.kind === 'move'));

  const lineEdits = selectedLines.map(({ text, segments, selected }, lineIndex) => {
    const moveSegments = selected.filter(segment => segment.kind === 'move');
    const rotated = parser.rotate(moveSegments.map(segment => segment.move), rotation);
    const moveEdits = moveSegments.map((segment, i) => ({ start: segment.start, end: segment.end, text: rotated[i] }));
    if (lineIndex !== prefixLineIndex) return moveEdits;

    const prefixAnchor = selected.find(segment => segment.kind === 'move' || segment.kind === 'open')!;
    const runStart = prefixAnchor.start;
    const leadingRotations: R[] = [];
    let restStart = text.length;
    for (let i = segments.indexOf(prefixAnchor); i < segments.length; i++) {
      const segment = segments[i];
      if (segment.kind === 'space') continue;
      const moveIndex = segment.kind === 'move' ? moveSegments.indexOf(segment) : -1;
      const rotatedMove = rotated[moveIndex];
      if (moveIndex === -1 || !parser.isRotation(rotatedMove)) {
        restStart = segment.start;
        break;
      }
      leadingRotations.push(rotatedMove);
    }
    if (leadingRotations.length === 0) restStart = runStart;

    const prefix = parser.format(parser.simplifyRotations([rotation, ...leadingRotations]));
    const separator = restStart < text.length ? ' ' : '';
    const prefixEdit = { start: runStart, end: restStart, text: prefix ? prefix + separator : '' };
    return [prefixEdit, ...moveEdits.filter(edit => edit.start >= restStart)];
  });
  return editSelectedLines(range, selectedLines, lineEdits);
}

export function invertSelectedMoves<M extends string>(
  lines: readonly string[],
  range: TextRange,
  parser: Pick<Parser<M, string>, 'parseMove' | 'invert' | 'format'>,
): TransformResult {
  const selectedLines = selectLines(lines, range, parser);
  const hasSelectedMoves = selectedLines.some(line => line.selected.some(segment => segment.kind === 'move'));
  if (!hasSelectedMoves) return { lines: [...lines], selection: range };

  const rootNodes: SequenceNode<M>[] = [];
  const openGroups: SequenceNode<M>[][] = [rootNodes];
  for (const { text, selected } of selectedLines) {
    for (const segment of selected) {
      const siblings = openGroups[openGroups.length - 1];
      if (segment.kind === 'move') {
        siblings.push({ kind: 'move', move: segment.move });
      } else if (segment.kind === 'open') {
        const group: SequenceNode<M> = { kind: 'group', children: [], reps: '' };
        siblings.push(group);
        openGroups.push(group.children);
      } else if (segment.kind === 'close' && openGroups.length > 1) {
        openGroups.pop();
      } else if (segment.kind === 'reps') {
        const group = siblings[siblings.length - 1];
        if (group?.kind === 'group') group.reps = text.slice(segment.start, segment.end);
      }
    }
  }
  const inverted = formatInvertedNodes(rootNodes, parser);

  const firstLine = selectedLines.findIndex(line => line.selected.length > 0);
  const lastLine = selectedLines.findLastIndex(line => line.selected.length > 0);
  const lastSelected = selectedLines[lastLine].selected;
  const before = lines[firstLine].slice(0, selectedLines[firstLine].selected[0].start);
  const after = lines[lastLine].slice(lastSelected[lastSelected.length - 1].end);
  const spaceBefore = before && !/\s$/.test(before) ? ' ' : '';
  const spaceAfter = after && !/^\s/.test(after) ? ' ' : '';
  const invertedLine = before + spaceBefore + inverted + spaceAfter + after;

  const invertedStart = before.length + spaceBefore.length;
  const selection = {
    start: { line: firstLine, offset: invertedStart },
    end: { line: firstLine, offset: invertedStart + inverted.length },
  };
  return { lines: [...lines.slice(0, firstLine), invertedLine, ...lines.slice(lastLine + 1)], selection };
}

function formatInvertedNodes<M extends string>(nodes: readonly SequenceNode<M>[], parser: Pick<Parser<M, string>, 'invert' | 'format'>): string {
  return [...nodes]
    .reverse()
    .map(node => node.kind === 'move'
      ? parser.format(parser.invert([node.move]))
      : `(${formatInvertedNodes(node.children, parser)})${node.reps}`)
    .join(' ');
}

export function removeSelectedComments<M extends string>(lines: readonly string[], range: TextRange, parser: MoveReader<M>): TransformResult {
  const selectedLines = selectLines(lines, range, parser);
  const lineEdits = selectedLines.map(({ text, segments, selected }) => selected
    .filter(segment => segment.kind === 'comment')
    .map(segment => {
      const previous = segments[segments.indexOf(segment) - 1];
      const isAtLineEnd = segment.end === text.length;
      const start = isAtLineEnd && previous?.kind === 'space' ? previous.start : segment.start;
      return { start, end: segment.end, text: '' };
    }));
  return editSelectedLines(range, selectedLines, lineEdits);
}
