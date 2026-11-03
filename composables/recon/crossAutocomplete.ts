import { applyMoves, solvedFacelets } from './faceletCube';
import type { Facelets } from './faceletCube';
import { calcCrossColorsSolved, readHashStateFromFacelets } from './cubeHashState';
import { rateCrossSolutions, Y_ROTATIONS } from './crossContinuations';
import type { ContinuationCategory, PairColors, RatedCrossSolution } from './crossContinuations';
import type { F2LScoreIndex } from './f2lPairLookup';
import type { StepInfo, Suggestion } from './SimpleCubeInterpreter';
import { cube3x3 } from '../../utils/parser/cube3x3';
import type { Move3x3, Rotation3x3 } from '../../utils/parser/cube3x3';
import type { Amount, Axis } from '../../utils/parser';

export interface LastInputMoveMerge {
  inputMove: Move3x3;
  mergedMove: Move3x3;
  suffix: string;
  remainingMoves: Move3x3[];
}

export interface CrossSuggestionDetails {
  stepInfo: StepInfo;
  continuation: Move3x3[];
  continuationPair: PairColors | null;
  category: ContinuationCategory;
  followsInput: boolean;
  lastInputMoveMerge: LastInputMoveMerge | null;
}

const MAX_CROSS_SUGGESTIONS = 10;
const SUFFIX_TYPED_AFTER_BARE_MOVE: Partial<Record<Amount, string>> = { 1: '', 2: '2', [-1]: "'" };
const Y_ROTATIONS_MERGEABLE_INTO_Y: readonly (Rotation3x3 | null)[] = [null, 'y', 'y2'];

const isFaceMove = (move: Move3x3) => {
  const { layers } = cube3x3.geometry(move);
  return layers.length === 1 && layers[0] !== 0;
};

const faceAxisOf = (move: Move3x3 | undefined): Axis | null =>
  move !== undefined && isFaceMove(move) ? cube3x3.geometry(move).axis : null;

const leadingAxisRun = (moves: readonly Move3x3[], axis: Axis): readonly Move3x3[] => {
  const runEnd = moves.findIndex(move => faceAxisOf(move) !== axis);
  return runEnd === -1 ? moves : moves.slice(0, runEnd);
};

// We could just check bottom cross in case one of the other crosses is already solved,
// but a person doing cross on side or top is more likely than a free cross they won't use
const isAnyCrossSolved = (facelets: Facelets): boolean => {
  const state = readHashStateFromFacelets(facelets);
  return !!state && calcCrossColorsSolved(state).length > 0;
};

export const applyMovesSafely = (facelets: Facelets, moves: readonly Move3x3[]): Facelets | null => {
  try {
    return applyMoves(facelets, moves);
  } catch {
    return null;
  }
};

export function applyMovesUntilCross(moveGroups: readonly (readonly Move3x3[])[]): Facelets | null {
  let facelets = solvedFacelets();
  for (const moves of moveGroups) {
    const next = applyMovesSafely(facelets, moves);
    if (!next || isAnyCrossSolved(next)) return null;
    facelets = next;
  }
  return facelets;
}

export function crossStepInfo({ crossColor, solvedPairs }: RatedCrossSolution): StepInfo {
  if (solvedPairs.length === 0) {
    return { step: 'D-Cross', type: 'cross', colors: [crossColor] };
  }
  return {
    step: `${'x'.repeat(solvedPairs.length)}cross`,
    type: 'cross',
    colors: [crossColor, ...solvedPairs.flat()],
  };
}

interface CrossCandidate {
  solution: RatedCrossSolution;
  lastInputMoveMerge: LastInputMoveMerge | null;
}

const movesLeftToInput = ({ solution, lastInputMoveMerge }: CrossCandidate): readonly Move3x3[] =>
  lastInputMoveMerge?.remainingMoves ?? solution.cross;

const ghostKey = (candidate: CrossCandidate): string =>
  `${candidate.lastInputMoveMerge?.suffix ?? ''}|${candidate.solution.yRotation ?? ''}|${cube3x3.format(movesLeftToInput(candidate))}`;

function scoreMovesLeftToInput(candidate: CrossCandidate, index: F2LScoreIndex): CrossCandidate {
  const crossScore = index.scoreAlg(movesLeftToInput(candidate));
  const totalScore = crossScore + candidate.solution.continuationScore;
  return { ...candidate, solution: { ...candidate.solution, crossScore, totalScore } };
}

function toSuggestion({ solution, lastInputMoveMerge }: CrossCandidate, inputMoves: readonly Move3x3[]): Suggestion {
  const stepInfo = crossStepInfo(solution);
  const shownMoves = lastInputMoveMerge
    ? [lastInputMoveMerge.mergedMove, ...lastInputMoveMerge.remainingMoves]
    : [...(solution.yRotation ? [solution.yRotation] : []), ...solution.cross];
  const inputMovesBeforeShownMoves = lastInputMoveMerge ? inputMoves.slice(0, -1) : inputMoves;
  const followsInput = inputMovesBeforeShownMoves.length > 0;

  return {
    moves: shownMoves,
    time: solution.totalScore,
    steps: [stepInfo.step],
    cross: {
      stepInfo,
      continuation: solution.continuation,
      continuationPair: solution.continuationPair,
      category: solution.category,
      followsInput,
      lastInputMoveMerge,
    },
  };
}

function findSameAxisOverlaps(inputMoves: readonly Move3x3[], cross: readonly Move3x3[]): readonly Move3x3[] {
  const axis = faceAxisOf(inputMoves.at(-1));
  if (!axis) return [];

  const inputLayers = leadingAxisRun(inputMoves.toReversed(), axis).map(cube3x3.layer);
  return leadingAxisRun(cross, axis).filter(move => inputLayers.includes(cube3x3.layer(move)));
}

function mergeOntoBareMove(inputMove: Move3x3, addedMove: Move3x3, remainingMoves: Move3x3[]): LastInputMoveMerge | null {
  const isBareMove = inputMove === cube3x3.make(cube3x3.layer(addedMove), 1);
  const merged = cube3x3.combine([inputMove, addedMove]);
  const suffix = merged.length === 1 ? SUFFIX_TYPED_AFTER_BARE_MOVE[cube3x3.amount(merged[0])] : undefined;
  const merge = suffix === undefined ? null : { inputMove, mergedMove: merged[0], suffix, remainingMoves };
  return isBareMove ? merge : null;
}

function findAllowedYRotations(inputMoves: readonly Move3x3[]): readonly (Rotation3x3 | null)[] {
  const lastInputMove = inputMoves.at(-1);
  if (!inputMoves.every(cube3x3.isRotation)) return [null];
  if (lastInputMove === 'y') return Y_ROTATIONS_MERGEABLE_INTO_Y;
  if (lastInputMove !== undefined && cube3x3.layer(lastInputMove) === 'y') return [null];
  return Y_ROTATIONS;
}

function findYRotationMerge(inputMoves: readonly Move3x3[], yRotation: Rotation3x3, cross: Move3x3[]): LastInputMoveMerge | null {
  const lastInputMove = inputMoves.at(-1);
  return lastInputMove === 'y' ? mergeOntoBareMove(lastInputMove, yRotation, cross) : null;
}

function candidateAfterInput(solution: RatedCrossSolution, inputMoves: readonly Move3x3[]): CrossCandidate | null {
  if (solution.yRotation) {
    return { solution, lastInputMoveMerge: findYRotationMerge(inputMoves, solution.yRotation, solution.cross) };
  }

  const overlaps = findSameAxisOverlaps(inputMoves, solution.cross);
  const lastInputMoveMerge = overlaps.length === 1
    ? mergeOntoBareMove(inputMoves.at(-1)!, overlaps[0], solution.cross.toSpliced(solution.cross.indexOf(overlaps[0]), 1))
    : null;

  const fitsAfterInput = overlaps.length === 0 || lastInputMoveMerge !== null;
  const candidate = { solution, lastInputMoveMerge };
  return fitsAfterInput ? candidate : null;
}

function toReplacementCandidate(solution: RatedCrossSolution, inputMoves: readonly Move3x3[], replacement: Move3x3): CrossCandidate {
  const remainingMoves = solution.cross.toSpliced(solution.cross.indexOf(replacement), 1);
  const suffix = SUFFIX_TYPED_AFTER_BARE_MOVE[cube3x3.amount(replacement)] ?? '';
  const lastInputMoveMerge = { inputMove: inputMoves.at(-1)!, mergedMove: replacement, suffix, remainingMoves };

  const plainCandidate = { solution: { ...solution, cross: remainingMoves }, lastInputMoveMerge: null };
  const mergeCandidate = { solution, lastInputMoveMerge };
  return suffix === '' ? plainCandidate : mergeCandidate;
}

function findLastInputMoveReplacement(inputMoves: readonly Move3x3[], cross: readonly Move3x3[]): Move3x3 | undefined {
  const overlaps = findSameAxisOverlaps(inputMoves, cross);
  const lastInputMove = inputMoves.at(-1);
  const replacesLastInputMove = overlaps.length === 1
    && lastInputMove === cube3x3.make(cube3x3.layer(overlaps[0]), 1);
  return replacesLastInputMove ? overlaps[0] : undefined;
}

function findCandidatesReplacingLastInputMove(
  facelets: Facelets,
  inputMoves: readonly Move3x3[],
  index: F2LScoreIndex,
): CrossCandidate[] {
  const lastInputMove = inputMoves.at(-1);
  const isLastInputBareFaceMove = lastInputMove !== undefined && isFaceMove(lastInputMove)
    && cube3x3.amount(lastInputMove) === 1;
  const faceletsBeforeLastMove = isLastInputBareFaceMove ? applyMovesSafely(facelets, inputMoves.slice(0, -1)) : null;

  const solutions = faceletsBeforeLastMove
    ? rateCrossSolutions(faceletsBeforeLastMove, index, {
        limit: Infinity,
        keepMoves: moves => findLastInputMoveReplacement(inputMoves, moves) !== undefined,
      })
    : [];
  return solutions.map(solution =>
    toReplacementCandidate(solution, inputMoves, findLastInputMoveReplacement(inputMoves, solution.cross)!));
}

const uniqueByGhost = (candidates: CrossCandidate[]): CrossCandidate[] => {
  const seen = new Set<string>();
  return candidates.filter(candidate => {
    const key = ghostKey(candidate);
    const isNew = !seen.has(key);
    seen.add(key);
    return isNew;
  });
};

export function getCrossSuggestions(facelets: Facelets, lineMoves: readonly Move3x3[], index: F2LScoreIndex): Suggestion[] {
  const lineFacelets = applyMovesSafely(facelets, lineMoves);
  if (!lineFacelets || isAnyCrossSolved(lineFacelets)) return [];

  const yRotations = findAllowedYRotations(lineMoves);
  const candidatesAfterInput = rateCrossSolutions(lineFacelets, index, { limit: Infinity, yRotations })
    .flatMap(solution => candidateAfterInput(solution, lineMoves) ?? []);
  const candidatesReplacingLastMove = findCandidatesReplacingLastInputMove(facelets, lineMoves, index);

  const candidates = uniqueByGhost(
    [...candidatesAfterInput, ...candidatesReplacingLastMove]
      .map(candidate => scoreMovesLeftToInput(candidate, index))
      .sort((a, b) =>
        b.solution.solvedPairs.length - a.solution.solvedPairs.length
        || a.solution.totalScore - b.solution.totalScore),
  );

  const plainCandidates = candidates.filter(candidate => !candidate.lastInputMoveMerge).slice(0, MAX_CROSS_SUGGESTIONS);
  const mergeCandidates = candidates.filter(candidate => candidate.lastInputMoveMerge).slice(0, MAX_CROSS_SUGGESTIONS);
  const shownCandidates = new Set([...plainCandidates, ...mergeCandidates]);
  return candidates
    .filter(candidate => shownCandidates.has(candidate))
    .map(candidate => toSuggestion(candidate, lineMoves));
}
