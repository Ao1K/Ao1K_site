import type { Algset, Suggestion } from './SimpleCubeInterpreter';
import { aufFreeKey, llAlgKey } from '../algs/algMoves';
import type { Move3x3 } from '../../utils/parser/cube3x3';

export type SavedAlgKeys = { ll: ReadonlySet<string>; aufFree: ReadonlySet<string> };

export const MAX_SHOWN_SUGGESTIONS = 20;

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

const LL_ALGSETS: ReadonlySet<Algset> = new Set<Algset>(['oll', 'pll', 'zbll']);

let keyedFavorites: readonly { moves: readonly Move3x3[] }[] | null = null;
let keyedResult: SavedAlgKeys = { ll: new Set<string>(), aufFree: new Set<string>() };

export const savedAlgKeys = (favorites: readonly { moves: readonly Move3x3[] }[]): SavedAlgKeys => {
  if (favorites !== keyedFavorites) {
    keyedFavorites = favorites;
    keyedResult = {
      ll: new Set(favorites.map((favorite) => llAlgKey(favorite.moves))),
      aufFree: new Set(favorites.map((favorite) => aufFreeKey(favorite.moves))),
    };
  }
  return keyedResult;
};

export const dedupeByAlgsetPriority = (suggestions: Suggestion[]): Suggestion[] => {
  const best = new Map<string, Suggestion>();

  suggestions.forEach((suggestion) => {
    const key = llAlgKey(suggestion.moves);
    const existing = best.get(key);
    if (!existing || algsetPriority(suggestion.algset) > algsetPriority(existing.algset)) {
      best.set(key, suggestion);
    }
  });

  return suggestions.filter((suggestion) => best.get(llAlgKey(suggestion.moves)) === suggestion);
};

export const suggestionRank = (suggestion: Suggestion, savedAlgs?: SavedAlgKeys): number => {
  if (!savedAlgs || !isCaseSpecific(suggestion.algset)) return 0;
  const isSaved = LL_ALGSETS.has(suggestion.algset)
    ? savedAlgs.ll.has(llAlgKey(suggestion.moves))
    : savedAlgs.aufFree.has(aufFreeKey(suggestion.moves));
  return isSaved ? 1 : 0;
};

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
