import { cube3x3, type Move3x3 } from '../../utils/parser/cube3x3';
import { expandLine, parseLine } from './editorDocument';

const MAX_PARSED_MOVES = 300;

export function cleanMovesText(text: string): string {
  let clean = '';
  for (const line of text.split('\n')) {
    const validChars = parseLine(line, cube3x3)
      .filter(segment => segment.kind !== 'comment' && segment.kind !== 'invalid')
      .map(segment => line.slice(segment.start, segment.end))
      .join('')
      .replace(/\s+/g, ' ')
      .trim();
    if (validChars) clean += (clean ? ' ' : '') + validChars;
  }
  return clean;
}

export function movesFromText(text: string): Move3x3[] {
  return expandLine(parseLine(cleanMovesText(text), cube3x3), MAX_PARSED_MOVES);
}
