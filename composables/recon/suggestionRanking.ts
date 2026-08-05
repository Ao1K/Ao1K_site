import type { Suggestion } from './SimpleCubeInterpreter';

export type SavedAlgKeys = ReadonlySet<string>;

export type SuggestionComparator = (a: Suggestion, b: Suggestion) => number;

const CASE_SPECIFIC_ALGSETS: ReadonlySet<string> = new Set(['oll', 'pll', 'zbls', 'zbll', 'cmll', 'lse']);

const LEADING_SETUP = /^(?:[Uy][2']?\s+)+/;
const TRAILING_AUF = /(?:\s+U[2']?)+$/;

export const savedAlgKey = (alg: string): string =>
  alg
    .trim()
    .replace(/2'/g, '2')
    .replace(/\s+/g, ' ')
    .replace(LEADING_SETUP, '')
    .replace(TRAILING_AUF, '');

let keyedFavorites: readonly { alg: string }[] | null = null;
let keyedResult: SavedAlgKeys = new Set<string>();

export const savedAlgKeys = (favorites: readonly { alg: string }[]): SavedAlgKeys => {
  if (favorites !== keyedFavorites) {
    keyedFavorites = favorites;
    keyedResult = new Set(favorites.map((favorite) => savedAlgKey(favorite.alg)));
  }
  return keyedResult;
};

export const suggestionRank = (suggestion: Suggestion, savedAlgs?: SavedAlgKeys): number =>
  savedAlgs && CASE_SPECIFIC_ALGSETS.has(suggestion.algset ?? '') && savedAlgs.has(savedAlgKey(suggestion.alg))
    ? 1
    : 0;

export const rankSuggestions = (
  suggestions: Suggestion[],
  compare: SuggestionComparator,
  savedAlgs?: SavedAlgKeys,
): Suggestion[] => {
  if (!savedAlgs) {
    return suggestions.sort(compare);
  }

  const ranks = new Map<Suggestion, number>();
  suggestions.forEach((suggestion) => ranks.set(suggestion, suggestionRank(suggestion, savedAlgs)));

  return suggestions.sort((a, b) => ranks.get(b)! - ranks.get(a)! || compare(a, b));
};
