import parseText from './validateTextInput';
import validationToArray from './validationToMoves';

const MAX_PARSED_MOVES = 300;

export function cleanMovesText(text: string): string {
  let clean = '';
  for (const line of text.split('\n')) {
    const validChars = parseText(line)
      .filter(([_, type]) => type !== 'comment' && type !== 'invalid')
      .map(([char]) => char)
      .join('')
      .replace(/\s+/g, ' ')
      .trim();
    if (validChars) clean += (clean ? ' ' : '') + validChars;
  }
  return clean;
}

export function movesFromText(text: string): string[] {
  return validationToArray(parseText(cleanMovesText(text)), MAX_PARSED_MOVES).map(token => token.value);
}
