import { cube3x3 } from '../../utils/parser/cube3x3';
import type { Layer3x3, Move3x3 } from '../../utils/parser/cube3x3';
import type { Amount, Axis } from '../../utils/parser';
import type { FeedbackCategory } from '../../utils/sharedConstants';
import type { FeedbackNote } from '../../components/recon/FeedbackNotes';

export type RedundancyCategory = 'none' | 'combine' | 'cancel' | 'exception';

export interface MoveGroup {
  moves: Move3x3[];
  category: RedundancyCategory;
  group: number;
}

interface AxisMove {
  index: number;
  move: Move3x3;
  layer: Layer3x3;
  turns: number;
}

interface Redundancy {
  category: Exclude<RedundancyCategory, 'none'>;
  layer: Layer3x3;
  totalTurns: number;
  key: string;
}

function splitAxisRuns(moves: readonly Move3x3[]): AxisMove[][] {
  const runs: AxisMove[][] = [];
  let currentAxis: Axis | null = null;

  moves.forEach((move, index) => {
    const { axis } = cube3x3.geometry(move);
    if (axis !== currentAxis) runs.push([]);
    currentAxis = axis;
    runs[runs.length - 1].push({ index, move, layer: cube3x3.layer(move), turns: cube3x3.turns(move) });
  });

  return runs;
}

const isOppositeFace = (a: Move3x3, b: Move3x3): boolean => {
  const layersA = cube3x3.geometry(a).layers;
  const layersB = cube3x3.geometry(b).layers;
  const isOuterFace = (layers: readonly number[]) => layers.length === 1 && layers[0] !== 0;
  return isOuterFace(layersA) && isOuterFace(layersB) && layersA[0] === -layersB[0];
};

const isSimultaneousOppositeTurn = (run: readonly AxisMove[]): boolean =>
  run.length === 3 &&
  run[0].layer === run[2].layer &&
  isOppositeFace(run[0].move, run[1].move) &&
  run.every(move => move.turns % 2 === 1);

function findRedundancies(moves: readonly Move3x3[]): Map<number, Redundancy> {
  const redundancyByIndex = new Map<number, Redundancy>();

  splitAxisRuns(moves).forEach((run, runIndex) => {
    const movesByLayer = new Map<Layer3x3, AxisMove[]>();
    run.forEach(move => movesByLayer.set(move.layer, [...(movesByLayer.get(move.layer) ?? []), move]));

    movesByLayer.forEach((sameLayerMoves, layer) => {
      if (sameLayerMoves.length < 2) return;
      const totalTurns = sameLayerMoves.reduce((sum, move) => sum + move.turns, 0) % 4;
      const category = totalTurns === 0 ? 'cancel' : isSimultaneousOppositeTurn(run) ? 'exception' : 'combine';
      sameLayerMoves.forEach(move => redundancyByIndex.set(move.index, { category, layer, totalTurns, key: `${runIndex}:${layer}` }));
    });
  });

  return redundancyByIndex;
}

export function groupRedundantMoves(moves: readonly Move3x3[]): MoveGroup[] {
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

function mergeRedundantMovesOnce(moves: readonly Move3x3[]): Move3x3[] {
  const redundancyByIndex = findRedundancies(moves);
  const mergedKeys = new Set<string>();

  return moves.flatMap((move, index) => {
    const redundancy = redundancyByIndex.get(index);
    if (!redundancy || redundancy.category === 'exception') return [move];
    if (mergedKeys.has(redundancy.key)) return [];
    mergedKeys.add(redundancy.key);
    const combinedAmount = (redundancy.totalTurns === 3 ? -1 : redundancy.totalTurns) as Amount;
    return redundancy.category === 'cancel' ? [] : [cube3x3.make(redundancy.layer, combinedAmount)];
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

export function reviewRedundantMoves(moves: readonly Move3x3[]): RedundancyReview {
  const moveGroups = groupRedundantMoves(moves);
  const combineCount = countGroups(moveGroups, 'combine');
  const cancelCount = countGroups(moveGroups, 'cancel');

  const notes: FeedbackNote[] = [];
  if (combineCount > 0) notes.push({ category: mistakeNoteCategory(combineCount), text: `Moves could have combined ${pluralTimes(combineCount)}` });
  if (cancelCount > 0) notes.push({ category: mistakeNoteCategory(cancelCount), text: `Moves could have canceled ${pluralTimes(cancelCount)}` });

  return { moveGroups, notes, mistakeCount: combineCount + cancelCount };
}

export function removeRedundantMoves(moves: readonly Move3x3[]): Move3x3[] {
  let current = [...moves];
  let merged = mergeRedundantMovesOnce(current);
  while (merged.length < current.length) {
    current = merged;
    merged = mergeRedundantMovesOnce(current);
  }
  return merged;
}
