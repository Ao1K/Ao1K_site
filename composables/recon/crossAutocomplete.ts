import { applyMoves, solvedFacelets } from './faceletCube';
import type { Facelets } from './faceletCube';
import { calcCrossColorsSolved, readHashStateFromFacelets } from './cubeHashState';
import { rateCrossSolutions, Y_ROTATIONS } from './crossContinuations';
import type { ContinuationCategory, PairColors, RatedCrossSolution } from './crossContinuations';
import type { F2LScoreIndex } from './f2lPairLookup';
import type { StepInfo, Suggestion } from './SimpleCubeInterpreter';
import { MAX_SHOWN_SUGGESTIONS } from './suggestionRanking';

export interface LastInputMoveMerge {
  inputMove: string;
  suffix: string;
  remainingMoves: string[];
}

export interface CrossSuggestionDetails {
  stepInfo: StepInfo;
  continuation: string;
  continuationPair: PairColors | null;
  category: ContinuationCategory;
  followsInput: boolean;
  lastInputMoveMerge: LastInputMoveMerge | null;
}

const AXIS_OF_FACE: Record<string, string> = { U: 'UD', D: 'UD', F: 'FB', B: 'FB', L: 'LR', R: 'LR' };
const MERGE_SUFFIX_BY_MOVE_SUFFIX: Record<string, string> = { '': '2', '2': "'" };
const Y_ROTATIONS_MERGEABLE_INTO_Y = ['', 'y', 'y2'];
const isRotation = (move: string) => /^[xyz]/.test(move);

const leadingAxisRun = (moves: readonly string[], axis: string): readonly string[] => {
  const runEnd = moves.findIndex(move => AXIS_OF_FACE[move[0]] !== axis);
  return runEnd === -1 ? moves : moves.slice(0, runEnd);
};

// We could just check bottom cross in case one of the other crosses is already solved,
// but a person doing cross on side or top is more likely than a free cross they won't use
const isAnyCrossSolved = (facelets: Facelets): boolean => {
  const state = readHashStateFromFacelets(facelets);
  return !!state && calcCrossColorsSolved(state).length > 0;
};

export const applyMovesSafely = (facelets: Facelets, moves: readonly string[]): Facelets | null => {
  try {
    return applyMoves(facelets, moves);
  } catch {
    return null;
  }
};

export function applyMovesUntilCross(moveGroups: readonly (readonly string[])[]): Facelets | null {
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

const movesLeftToInput = ({ solution, lastInputMoveMerge }: CrossCandidate): readonly string[] =>
  lastInputMoveMerge?.remainingMoves ?? solution.cross;

const ghostKey = (candidate: CrossCandidate): string =>
  `${candidate.lastInputMoveMerge?.suffix ?? ''}|${candidate.solution.yRotation}|${movesLeftToInput(candidate).join(' ')}`;

function scoreMovesLeftToInput(candidate: CrossCandidate, index: F2LScoreIndex): CrossCandidate {
  const crossScore = index.scoreAlg(movesLeftToInput(candidate).join(' '));
  const totalScore = crossScore + candidate.solution.continuationScore;
  return { ...candidate, solution: { ...candidate.solution, crossScore, totalScore } };
}

function toSuggestion({ solution, lastInputMoveMerge }: CrossCandidate, inputMoves: readonly string[]): Suggestion {
  const stepInfo = crossStepInfo(solution);
  const shownMoves = lastInputMoveMerge
    ? [lastInputMoveMerge.inputMove + lastInputMoveMerge.suffix, ...lastInputMoveMerge.remainingMoves]
    : [...(solution.yRotation ? [solution.yRotation] : []), ...solution.cross];
  const inputMovesBeforeShownMoves = lastInputMoveMerge ? inputMoves.slice(0, -1) : inputMoves;
  const followsInput = inputMovesBeforeShownMoves.length > 0;

  return {
    alg: shownMoves.join(' '),
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

function findSameAxisOverlaps(inputMoves: readonly string[], cross: readonly string[]): readonly string[] {
  const axis = AXIS_OF_FACE[inputMoves.at(-1)?.[0] ?? ''];
  if (!axis) return [];

  const inputFaces = leadingAxisRun(inputMoves.toReversed(), axis).map(move => move[0]);
  return leadingAxisRun(cross, axis).filter(move => inputFaces.includes(move[0]));
}

function findLastInputMoveMerge(lastInputMove: string, cross: readonly string[], overlap: string): LastInputMoveMerge | null {
  const suffix = MERGE_SUFFIX_BY_MOVE_SUFFIX[overlap.slice(1)];
  const canMergeByAppending = lastInputMove === overlap[0] && suffix !== undefined;

  const merge = {
    inputMove: lastInputMove,
    suffix,
    remainingMoves: cross.toSpliced(cross.indexOf(overlap), 1),
  };
  return canMergeByAppending ? merge : null;
}

function findAllowedYRotations(inputMoves: readonly string[]): readonly string[] {
  const lastInputMove = inputMoves.at(-1) ?? '';
  if (!inputMoves.every(isRotation)) return [''];
  if (lastInputMove === 'y') return Y_ROTATIONS_MERGEABLE_INTO_Y;
  if (lastInputMove.startsWith('y')) return [''];
  return Y_ROTATIONS;
}

function findYRotationMerge(inputMoves: readonly string[], { yRotation, cross }: RatedCrossSolution): LastInputMoveMerge | null {
  const merge = { inputMove: 'y', suffix: MERGE_SUFFIX_BY_MOVE_SUFFIX[yRotation.slice(1)], remainingMoves: cross };
  return inputMoves.at(-1) === 'y' ? merge : null;
}

function candidateAfterInput(solution: RatedCrossSolution, inputMoves: readonly string[]): CrossCandidate | null {
  if (solution.yRotation) return { solution, lastInputMoveMerge: findYRotationMerge(inputMoves, solution) };

  const overlaps = findSameAxisOverlaps(inputMoves, solution.cross);
  const lastInputMoveMerge = overlaps.length === 1
    ? findLastInputMoveMerge(inputMoves.at(-1)!, solution.cross, overlaps[0])
    : null;

  const fitsAfterInput = overlaps.length === 0 || lastInputMoveMerge !== null;
  const candidate = { solution, lastInputMoveMerge };
  return fitsAfterInput ? candidate : null;
}

function toReplacementCandidate(solution: RatedCrossSolution, inputMoves: readonly string[], replacement: string): CrossCandidate {
  const remainingMoves = solution.cross.toSpliced(solution.cross.indexOf(replacement), 1);
  const suffix = replacement.slice(1);
  const lastInputMoveMerge = { inputMove: inputMoves.at(-1)!, suffix, remainingMoves };

  const plainCandidate = { solution: { ...solution, cross: remainingMoves }, lastInputMoveMerge: null };
  const mergeCandidate = { solution, lastInputMoveMerge };
  return suffix === '' ? plainCandidate : mergeCandidate;
}

function findLastInputMoveReplacement(inputMoves: readonly string[], cross: readonly string[]): string | undefined {
  const overlaps = findSameAxisOverlaps(inputMoves, cross);
  const replacesLastInputMove = overlaps.length === 1 && overlaps[0][0] === inputMoves.at(-1);
  return replacesLastInputMove ? overlaps[0] : undefined;
}

function findCandidatesReplacingLastInputMove(
  facelets: Facelets,
  inputMoves: readonly string[],
  index: F2LScoreIndex,
): CrossCandidate[] {
  const isLastInputBareFaceMove = (inputMoves.at(-1) ?? '') in AXIS_OF_FACE;
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

export function getCrossSuggestions(facelets: Facelets, lineMoves: readonly string[], index: F2LScoreIndex): Suggestion[] {
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

  const plainCandidates = candidates.filter(candidate => !candidate.lastInputMoveMerge).slice(0, MAX_SHOWN_SUGGESTIONS);
  const mergeCandidates = candidates.filter(candidate => candidate.lastInputMoveMerge).slice(0, MAX_SHOWN_SUGGESTIONS);
  const shownCandidates = new Set([...plainCandidates, ...mergeCandidates]);
  return candidates
    .filter(candidate => shownCandidates.has(candidate))
    .map(candidate => toSuggestion(candidate, lineMoves));
}
