import type { Algset, Suggestion } from './SimpleCubeInterpreter';

export type SavedAlgKeys = ReadonlySet<string>;

export type SuggestionComparator = (a: Suggestion, b: Suggestion) => number;

export type CaseSpecificAlgset = Exclude<Algset, 'f2l' | 'auf'>;

const isCaseSpecific = (algset?: Algset): algset is CaseSpecificAlgset =>
  algset !== undefined && algset !== 'f2l' && algset !== 'auf';

const ALGSET_PRIORITY: Partial<Record<Algset, number>> = {
  zbll: 2,
  oll: 1,
};

export const algsetPriority = (algset?: Algset): number =>
  (algset && ALGSET_PRIORITY[algset]) ?? 0;

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

export const dedupeByAlgsetPriority = (suggestions: Suggestion[]): Suggestion[] => {
  const best = new Map<string, Suggestion>();

  suggestions.forEach((suggestion) => {
    const key = savedAlgKey(suggestion.alg);
    const existing = best.get(key);
    if (!existing || algsetPriority(suggestion.algset) > algsetPriority(existing.algset)) {
      best.set(key, suggestion);
    }
  });

  return suggestions.filter((suggestion) => best.get(savedAlgKey(suggestion.alg)) === suggestion);
};

export const suggestionRank = (suggestion: Suggestion, savedAlgs?: SavedAlgKeys): number =>
  savedAlgs && isCaseSpecific(suggestion.algset) && savedAlgs.has(savedAlgKey(suggestion.alg))
    ? 1
    : 0;

const caseKey = (suggestion: Suggestion): string =>
  `${suggestion.name ?? ''}:::${suggestion.steps[0] ?? ''}`;

/**
 * Produces the display order: saved algs lead the list on their own, then the rest are
 * clustered by case so an algset stays together, each cluster placed by its best member.
 * Saved algs are pulled out of their cluster so one of them can't drag a whole algset above
 * a higher priority one.
 */
export const rankSuggestions = (
  suggestions: Suggestion[],
  compare: SuggestionComparator,
  savedAlgs?: SavedAlgKeys,
): Suggestion[] => {
  const ranks = new Map<Suggestion, number>();
  suggestions.forEach((suggestion) => ranks.set(suggestion, suggestionRank(suggestion, savedAlgs)));

  const ordered = suggestions.sort((a, b) => ranks.get(b)! - ranks.get(a)! || compare(a, b));

  const saved: Suggestion[] = [];
  const clusters = new Map<string, Suggestion[]>();

  ordered.forEach((suggestion) => {
    if (ranks.get(suggestion)! > 0) {
      saved.push(suggestion);
      return;
    }
    const key = caseKey(suggestion);
    const cluster = clusters.get(key);
    if (cluster) {
      cluster.push(suggestion);
    } else {
      clusters.set(key, [suggestion]);
    }
  });

  return [...saved, ...Array.from(clusters.values()).flat()];
};
