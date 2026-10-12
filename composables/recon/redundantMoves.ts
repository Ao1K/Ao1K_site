import { MOVE_TABLE } from '../../utils/cubeMoves';
import { formatMove, parseMove } from '../../utils/moveUtils';
import type { FeedbackCategory } from '../../utils/sharedConstants';
import type { FeedbackNote } from '../../components/recon/FeedbackNotes';

export type RedundancyCategory = 'none' | 'combine' | 'cancel' | 'exception';

export interface MoveGroup {
  moves: string[];
  category: RedundancyCategory;
  group: number;
}

interface AxisMove {
  index: number;
  base: string;
  amount: number;
}

interface Redundancy {
  category: Exclude<RedundancyCategory, 'none'>;
  base: string;
  totalAmount: number;
  key: string;
}

function splitAxisRuns(moves: readonly string[]): AxisMove[][] {
  const runs: AxisMove[][] = [];
  let currentAxis: string | null = null;

  moves.forEach((move, index) => {
    const parsed = parseMove(move);
    const axis = parsed ? MOVE_TABLE[parsed.base]?.axis : undefined;
    if (!parsed || !axis) {
      currentAxis = null;
      return;
    }
    if (axis !== currentAxis) runs.push([]);
    currentAxis = axis;
    runs[runs.length - 1].push({ index, ...parsed });
  });

  return runs;
}

const isOppositeFace = (a: string, b: string): boolean => {
  const [layerA] = MOVE_TABLE[a].layers;
  const [layerB] = MOVE_TABLE[b].layers;
  const isOuterFace = (base: string) => MOVE_TABLE[base].layers.length === 1 && MOVE_TABLE[base].layers[0] !== 0;
  return isOuterFace(a) && isOuterFace(b) && layerA === -layerB;
};

const isSimultaneousOppositeTurn = (run: readonly AxisMove[]): boolean =>
  run.length === 3 &&
  run[0].base === run[2].base &&
  isOppositeFace(run[0].base, run[1].base) &&
  run.every(move => move.amount % 2 === 1);

function findRedundancies(moves: readonly string[]): Map<number, Redundancy> {
  const redundancyByIndex = new Map<number, Redundancy>();

  splitAxisRuns(moves).forEach((run, runIndex) => {
    const movesByBase = new Map<string, AxisMove[]>();
    run.forEach(move => movesByBase.set(move.base, [...(movesByBase.get(move.base) ?? []), move]));

    movesByBase.forEach((sameBaseMoves, base) => {
      if (sameBaseMoves.length < 2) return;
      const totalAmount = sameBaseMoves.reduce((sum, move) => sum + move.amount, 0) % 4;
      const category = totalAmount === 0 ? 'cancel' : isSimultaneousOppositeTurn(run) ? 'exception' : 'combine';
      sameBaseMoves.forEach(move => redundancyByIndex.set(move.index, { category, base, totalAmount, key: `${runIndex}:${base}` }));
    });
  });

  return redundancyByIndex;
}

export function groupRedundantMoves(moves: readonly string[]): MoveGroup[] {
  const redundancyByIndex = findRedundancies(moves);
  const groupNumbers = new Map<string, number>();
  const groups: MoveGroup[] = [];
  let nextGroup = 1;

  moves.forEach((move, index) => {
    const redundancy = redundancyByIndex.get(index);
    const last = groups.at(-1);
    const continuesLast = last && (redundancy
      ? groupNumbers.get(redundancy.key) === last.group
      : last.category === 'none');
    if (continuesLast) {
      last.moves.push(move);
      return;
    }

    if (!redundancy) {
      groups.push({ moves: [move], category: 'none', group: nextGroup++ });
      return;
    }
    const group = groupNumbers.get(redundancy.key) ?? nextGroup++;
    groupNumbers.set(redundancy.key, group);
    groups.push({ moves: [move], category: redundancy.category, group });
  });

  return groups;
}

function mergeRedundantMovesOnce(moves: readonly string[]): string[] {
  const redundancyByIndex = findRedundancies(moves);
  const mergedKeys = new Set<string>();

  return moves.flatMap((move, index) => {
    const redundancy = redundancyByIndex.get(index);
    if (!redundancy || redundancy.category === 'exception') return [move];
    if (mergedKeys.has(redundancy.key)) return [];
    mergedKeys.add(redundancy.key);
    return redundancy.category === 'cancel' ? [] : [formatMove(redundancy.base, redundancy.totalAmount)];
  });
}

export interface RedundancyReview {
  moveGroups: MoveGroup[];
  notes: FeedbackNote[];
  mistakeCount: number;
}

const countGroups = (moveGroups: readonly MoveGroup[], category: RedundancyCategory) =>
  new Set(moveGroups.filter(group => group.category === category).map(group => group.group)).size;

const mistakeNoteCategory = (count: number): FeedbackCategory => count === 1 ? 'okay' : 'bad';

const pluralTimes = (count: number) => count === 1 ? `${count} time` : `${count} times`;

export function reviewRedundantMoves(moves: readonly string[]): RedundancyReview {
  const moveGroups = groupRedundantMoves(moves);
  const combineCount = countGroups(moveGroups, 'combine');
  const cancelCount = countGroups(moveGroups, 'cancel');

  const notes: FeedbackNote[] = [];
  if (combineCount > 0) notes.push({ category: mistakeNoteCategory(combineCount), text: `Moves could have combined ${pluralTimes(combineCount)}` });
  if (cancelCount > 0) notes.push({ category: mistakeNoteCategory(cancelCount), text: `Moves could have canceled ${pluralTimes(cancelCount)}` });

  return { moveGroups, notes, mistakeCount: combineCount + cancelCount };
}

export function removeRedundantMoves(moves: readonly string[]): string[] {
  let current = [...moves];
  let merged = mergeRedundantMovesOnce(current);
  while (merged.length < current.length) {
    current = merged;
    merged = mergeRedundantMovesOnce(current);
  }
  return merged;
}
