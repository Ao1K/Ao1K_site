import { tokenize } from './algMoves';
import type { CubeState as SimpleCubeState, Color } from '../recon/SimpleCube';
import {
  analyzeF2lPair,
  applyMove,
  crossSolved,
  flattenState,
  type Facelets,
  type F2lPairInfo,
} from '../recon/f2lIntuitiveDetection';

export interface F2lSegment {
  label?: string;
  moves: string[];
  // index of the alg's own move each displayed move came from, since a turn may be split
  rawIndices?: number[];
}

export type F2lGroupName = 'Keyhole' | 'Commutator' | 'Conjugate';

// a named row is a group drawn with a border; an unnamed one holds a single loose segment
export interface F2lBreakdownRow {
  name?: F2lGroupName;
  segments: F2lSegment[];
}

// group membership rides along on segments through the pipeline, then folds into rows at the end
interface TaggedSegment extends F2lSegment {
  groupId?: number;
  groupName?: F2lGroupName;
}

function groupRows(tagged: TaggedSegment[]): F2lBreakdownRow[] {
  const rows: F2lBreakdownRow[] = [];
  let openId: number | null = null;

  for (const { groupId, groupName, ...segment } of tagged) {
    if (groupId === undefined || !groupName) {
      openId = null;
      rows.push({ segments: [segment] });
      continue;
    }
    if (openId !== groupId) {
      openId = groupId;
      rows.push({ name: groupName, segments: [] });
    }
    rows[rows.length - 1].segments.push(segment);
  }

  return rows;
}

const baseOf = (token: string): string => token[0] ?? '';

const magnitudeOf = (token: string): number => parseInt(token.slice(1), 10) || 1;

const amountOf = (token: string): number => {
  const signed = token.includes("'") ? -magnitudeOf(token) : magnitudeOf(token);
  return ((signed % 4) + 4) % 4;
};

const ROTATIONS = new Set(['x', 'y', 'z']);
const RULD = new Set(['R', 'U', 'L', 'D', 'r', 'u', 'l', 'd']);
const SPLITTABLE = new Set(['R', 'r', 'L', 'l']);

const isU = (token: string): boolean => baseOf(token) === 'U';
const isD = (token: string): boolean => baseOf(token) === 'D';
const isRotation = (token: string): boolean => ROTATIONS.has(baseOf(token));
const allU = (moves: string[]): boolean => moves.every(isU);
const allD = (moves: string[]): boolean => moves.every(isD);
const cancels = (a: string, b: string): boolean =>
  baseOf(a) === baseOf(b) && (amountOf(a) + amountOf(b)) % 4 === 0;

const EO_ROTATION_LABEL = 'Rotate based on EO';
const PLAIN_ROTATION_LABEL = 'Rotate';

export const UNINFORMATIVE_LABELS: ReadonlySet<string> = new Set([EO_ROTATION_LABEL, PLAIN_ROTATION_LABEL]);

const rotationLabel = (rest: string[]): string =>
  rest.every((token) => RULD.has(baseOf(token))) ? EO_ROTATION_LABEL : PLAIN_ROTATION_LABEL;

const countLeadingRotations = (tokens: string[]): number => {
  let lead = 0;
  while (lead < tokens.length && isRotation(tokens[lead])) lead++;
  return lead;
};

function bodyStates(tokens: string[], lead: number, start?: Facelets | null): (Facelets | null)[] {
  const states: (Facelets | null)[] = tokens.slice(lead).map(() => null);
  if (!start) return states;

  let state = start;
  for (let i = 0; i < lead; i++) state = applyMove(state, tokens[i]);
  for (let i = lead; i < tokens.length; i++) {
    states[i - lead] = state;
    state = applyMove(state, tokens[i]);
  }
  return states;
}

const plainLabel = (moves: string[]): string | undefined => {
  if (allU(moves)) return 'AUF';
  if (allD(moves)) return 'Move D layer';
  return undefined;
};

// identify portions that aren't using labelStandard()
function labelSlice(
  moves: string[],
  state: Facelets | null,
  pairColors?: [Color, Color] | null,
): TaggedSegment[] {
  if (state && pairColors) {
    const labeled = labelStandard(moves, state, pairColors);
    if (labeled) return labeled;
  }
  return [{ label: plainLabel(moves), moves }];
}

// spans tile the rotation-stripped body; the ones a detector left unlabeled are filled in here
function expandSpans(
  tokens: string[],
  lead: number,
  states: (Facelets | null)[],
  spans: TaggedSegment[],
  pairColors?: [Color, Color] | null,
): TaggedSegment[] {
  const segments: TaggedSegment[] = [];
  if (lead > 0) segments.push({ label: rotationLabel(tokens.slice(lead)), moves: tokens.slice(0, lead) });

  let offset = 0;
  for (const span of spans) {
    if (span.label) segments.push(span);
    else {
      const filled = labelSlice(span.moves, states[offset], pairColors);
      const { groupId, groupName } = span;
      segments.push(
        ...(groupId === undefined ? filled : filled.map((segment) => ({ ...segment, groupId, groupName }))),
      );
    }
    offset += span.moves.length;
  }

  return segments;
}

function isKeyholeWindow(window: string[]): boolean {
  const [open, first, middle, last, restore] = window;
  if (baseOf(open) !== 'D' || baseOf(restore) !== 'D' || !cancels(open, restore)) return false;
  const side = baseOf(first);
  if (side !== 'R' && side !== 'L') return false;
  return isU(middle) && cancels(first, last);
}

// keyhole only makes sense once the cross is done, so a window that opens before then is not one
function findKeyholeWindows(tokens: string[], states: (Facelets | null)[]): number[] {
  const starts: number[] = [];
  let i = 0;
  while (i + 5 <= tokens.length) {
    const state = states[i];
    if ((!state || crossSolved(state)) && isKeyholeWindow(tokens.slice(i, i + 5))) {
      starts.push(i);
      i += 5;
    } else {
      i++;
    }
  }
  return starts;
}

function labelKeyhole(
  tokens: string[],
  start?: Facelets | null,
  pairColors?: [Color, Color] | null,
): TaggedSegment[] | null {
  const lead = countLeadingRotations(tokens);
  const body = tokens.slice(lead);

  const states = bodyStates(tokens, lead, start);
  const windows = findKeyholeWindows(body, states);
  if (!windows.length) return null;

  const spans: TaggedSegment[] = [];
  let cursor = 0;
  for (const [groupId, windowStart] of windows.entries()) {
    if (windowStart > cursor) spans.push({ moves: body.slice(cursor, windowStart) });

    const [open, first, middle, last, restore] = body.slice(windowStart, windowStart + 5);
    const tag = { groupId, groupName: 'Keyhole' as const };
    spans.push({ ...tag, label: 'Move D layer', moves: [open] });
    spans.push({ ...tag, label: 'Insert piece', moves: [first, middle, last] });
    spans.push({ ...tag, label: 'Undo D move', moves: [restore] });
    cursor = windowStart + 5;
  }

  if (cursor < body.length) spans.push({ moves: body.slice(cursor) });

  return expandSpans(tokens, lead, states, spans, pairColors);
}

const RUD = new Set(['R', 'U', 'D']);
const LUD = new Set(['L', 'U', 'D']);

const isInverseOf = (a: string[], b: string[]): boolean =>
  a.length === b.length && a.every((token, i) => cancels(token, b[b.length - 1 - i]));

interface CandidateGroup {
  start: number;
  size: number;
  partner: number;
}

// create a process that uses a sliding window and checks for at least 3 moves where the normal and
// inverse are both present, for example, R D R' and R D' R'. We'll call these candidate groups.
function findCandidateGroups(tokens: string[]): CandidateGroup[] {
  const groups: CandidateGroup[] = [];
  // increase window size until size is greater or equal to total number of moves divided by 2
  const maxSize = Math.max(3, Math.ceil(tokens.length / 2));

  for (let size = 3; size <= maxSize; size++) {
    for (let start = 0; start + size <= tokens.length; start++) {
      const window = tokens.slice(start, start + size);
      for (let partner = start + size + 1; partner + size <= tokens.length; partner++) {
        // return list of all sequences that have normal and inverse
        if (isInverseOf(window, tokens.slice(partner, partner + size))) {
          groups.push({ start, size, partner });
        }
      }
    }
  }

  return groups;
}

// check all combinations of candidate groups
function selectCandidateGroups(groups: CandidateGroup[]): CandidateGroup[] {
  const ordered = [...groups].sort((a, b) => a.start - b.start);
  let best: CandidateGroup[] = [];
  let bestCovered = 0;

  const search = (index: number, chosen: CandidateGroup[], covered: number, reach: number) => {
    // return the largest list of candidate groups that don't interfere. For a tie breaker, use the
    // candidate groups that capture the largest number of moves total
    if (chosen.length > best.length || (chosen.length === best.length && covered > bestCovered)) {
      best = [...chosen];
      bestCovered = covered;
    }
    for (let i = index; i < ordered.length; i++) {
      const group = ordered[i];
      if (group.start < reach) continue;
      const end = group.partner + group.size;
      chosen.push(group);
      search(i + 1, chosen, covered + end - group.start, end);
      chosen.pop();
    }
  };

  search(0, [], 0, 0);
  return best;
}

const restoreLabel = (moves: string[]): string => {
  if (allU(moves)) return 'Undo AUF';
  if (allD(moves)) return 'Undo D move';
  return 'Undo interchange';
};

function labelCommutatorOrConjugate(
  tokens: string[],
  start?: Facelets | null,
  pairColors?: [Color, Color] | null,
): TaggedSegment[] | null {
  const lead = countLeadingRotations(tokens);
  const body = tokens.slice(lead);

  // if just (y)RU or (y)LU, can be explained in other ways, skip
  if (!body.join('').includes('D')) return null;

  // if yRUD or yLUD, may be commutator or conjugate
  const fits = (allowed: Set<string>) => body.every((token) => allowed.has(baseOf(token)));
  if (!fits(RUD) && !fits(LUD)) return null;

  // identify portion that is commutator or conjugate
  const selected = selectCandidateGroups(findCandidateGroups(body));
  if (!selected.length) return null;

  const spans: TaggedSegment[] = [];
  let cursor = 0;
  for (let index = 0; index < selected.length; index++) {
    const group = selected[index];
    if (group.start > cursor) spans.push({ moves: body.slice(cursor, group.start) });

    // any moves that are in between candidate groups is the B in a conjugate of form A B A'
    const setupEnd = group.start + group.size;
    const inner = body.slice(setupEnd, group.partner);
    const restoreEnd = group.partner + group.size;

    const nextStart = selected[index + 1]?.start ?? body.length;
    const tail = body.slice(restoreEnd, restoreEnd + inner.length);
    const isCommutator = restoreEnd + inner.length <= nextStart && isInverseOf(inner, tail);

    // create label for all identified conjugate and commutator parts
    const tag = { groupId: index, groupName: (isCommutator ? 'Commutator' : 'Conjugate') as F2lGroupName };
    spans.push({ ...tag, label: 'Set up', moves: body.slice(group.start, setupEnd) });
    spans.push({ ...tag, moves: inner });
    spans.push({ ...tag, label: 'Undo setup', moves: body.slice(group.partner, restoreEnd) });
    cursor = restoreEnd;

    if (isCommutator) {
      spans.push({ ...tag, label: restoreLabel(tail), moves: tail });
      cursor = restoreEnd + tail.length;
    }
  }

  if (cursor < body.length) spans.push({ moves: body.slice(cursor) });

  // join labels and return
  return expandSpans(tokens, lead, bodyStates(tokens, lead, start), spans, pairColors);
}

// a double or triple outer-slice turn can pass through cross-solved on its way, so the paths
// it could have been turned along are tried before treating it as one atomic move
function quarterPaths(token: string): string[][] {
  if (!SPLITTABLE.has(baseOf(token))) return [];
  const magnitude = magnitudeOf(token);
  if (magnitude === 2) {
    const forward = baseOf(token);
    const backward = `${forward}'`;
    return [[forward, forward], [backward, backward]];
  }
  if (magnitude === 3) {
    const quarter = token.includes("'") ? `${baseOf(token)}'` : baseOf(token);
    return [[quarter, quarter, quarter]];
  }
  return [];
}

function mapExpandedToRaw(raw: string[], expanded: string[]): number[] {
  const map: number[] = [];
  let e = 0;
  for (let r = 0; r < raw.length && e < expanded.length; r++) {
    if (expanded[e] === raw[r]) {
      map[e++] = r;
      continue;
    }
    const target = amountOf(raw[r]);
    let amount = 0;
    while (e < expanded.length && baseOf(expanded[e]) === baseOf(raw[r])) {
      amount = (amount + amountOf(expanded[e])) % 4;
      map[e++] = r;
      if (amount === target) break;
    }
  }
  while (map.length < expanded.length) map.push(-1);
  return map;
}

function withRawIndices(segments: TaggedSegment[], raw: string[]): TaggedSegment[] {
  const map = mapExpandedToRaw(raw, segments.flatMap((segment) => segment.moves));
  let offset = 0;
  return segments.map((segment) => {
    const rawIndices = map.slice(offset, offset + segment.moves.length);
    offset += segment.moves.length;
    return { ...segment, rawIndices };
  });
}

interface Breakpoint {
  moves: string[];
  state: Facelets;
}

function expandTurns(start: Facelets, tokens: string[]): string[] {
  const expanded: string[] = [];
  let state = start;
  let wasSolved = crossSolved(state);

  for (const token of tokens) {
    let atoms = [token];
    for (const path of quarterPaths(token)) {
      let probe = state;
      let probeSolved = wasSolved;
      let passes = false;
      for (let i = 0; i < path.length - 1; i++) {
        probe = applyMove(probe, path[i]);
        const solved = crossSolved(probe);
        if (solved && !probeSolved) {
          passes = true;
          break;
        }
        probeSolved = solved;
      }
      if (passes) {
        atoms = path;
        break;
      }
    }

    for (const atom of atoms) {
      expanded.push(atom);
      state = applyMove(state, atom);
      wasSolved = crossSolved(state);
    }
  }

  return expanded;
}

function splitAtCrossSolved(start: Facelets, tokens: string[]): Breakpoint[] {
  const groups: Breakpoint[] = [];
  let state = start;
  let wasSolved = crossSolved(state);
  let current: string[] = [];

  for (const token of tokens) {
    current.push(token);
    state = applyMove(state, token);
    const solved = crossSolved(state);
    if (solved && !wasSolved) {
      groups.push({ moves: current, state });
      current = [];
    }
    wasSolved = solved;
  }

  if (current.length) groups.push({ moves: current, state });
  return groups;
}

const LONG_INSERTS = new Set<string>([
  "R' F R F'",
  "F R' F' R",
  "L F' L' F",
  "F' L F L'",
  "r U R' U' M",
  "M' U R U' r'",
  "R f' U' f",
  "L' f U f'",
]);

const isValidInsert = (moves: string[]): boolean => {
  let lead = 0;
  while (lead < moves.length && (isU(moves[lead]) || isRotation(moves[lead]))) lead++;
  const insert = moves.slice(lead);
  return insert.length === 3 || LONG_INSERTS.has(insert.join(' '));
};

function transitionLabel(before: F2lPairInfo, after: F2lPairInfo, moves: string[]): string | undefined {
  if (allU(moves)) return 'AUF';
  if (after.pairSolved && !before.pairSolved) {
    return isValidInsert(moves) ? 'Insert pair' : undefined;
  }

  const wasPaired = before.touching && before.minMoves >= 0 && before.minMoves <= 3;
  const isPaired = after.touching && after.minMoves >= 0 && after.minMoves <= 4;
  if (isPaired && !wasPaired) return 'Make pair';

  const isSplitPair = !after.touching && after.minMoves >= 0 && after.minMoves <= 4;
  if (isSplitPair && (before.minMoves < 0 || before.minMoves > 4)) return 'Make split pair';

  if (before.minMoves >= 0 && after.minMoves >= 0 && after.minMoves < before.minMoves) return 'Set up pair';

  const freedCorner = before.cornerInBottom && !after.cornerInBottom;
  const freedEdge = before.edgeInMiddle && after.edgeInTop;
  if (freedCorner && freedEdge) return 'Free both pieces';
  if (freedCorner) return 'Free the corner';
  if (freedEdge) return 'Free the edge';

  if (after.pairsSolved > before.pairsSolved) return 'Solve other pair';

  if (before.cornerInBottom !== after.cornerInBottom) {
    return after.cornerSolved ? 'Solve the corner' : 'Hide the corner';
  }
  if (before.edgeInMiddle !== after.edgeInMiddle) {
    return after.edgeSolved ? 'Solve the edge' : 'Hide the edge';
  }
  return undefined;
}

function labelStandard(tokens: string[], start: Facelets, pairColors: [Color, Color]): F2lSegment[] | null {
  const lead = countLeadingRotations(tokens);
  let state = start;
  for (let i = 0; i < lead; i++) state = applyMove(state, tokens[i]);

  const segments: F2lSegment[] = [];
  if (lead > 0) segments.push({ label: rotationLabel(tokens.slice(lead)), moves: tokens.slice(0, lead) });

  const groups = splitAtCrossSolved(state, tokens.slice(lead));

  let before = analyzeF2lPair(state, pairColors);
  if (!before) return null;

  for (const group of groups) {
    const after = analyzeF2lPair(group.state, pairColors);
    if (!after) return null;
    segments.push({ label: transitionLabel(before, after, group.moves), moves: group.moves });
    before = after;
  }

  return segments.some((segment) => segment.label) ? segments : null;
}

/**
 * Breaks an F2L solution into rows in display (forward) order, where a row is either a
 * standalone labeled segment or a named group of them.
 * Returns null when nothing could be labeled, so the card can skip the dropdown.
 */
export function labelF2lAlg(
  alg: string,
  caseState?: SimpleCubeState | null,
  pairColors?: [Color, Color] | null,
): F2lBreakdownRow[] | null {
  const raw = tokenize(alg);
  if (raw.length === 0) return null;

  const start = caseState ? flattenState(caseState) : null;
  const tokens = start ? expandTurns(start, raw) : raw;

  const keyhole = labelKeyhole(tokens, start, pairColors);
  if (keyhole) return groupRows(withRawIndices(keyhole, raw));

  const commutator = labelCommutatorOrConjugate(tokens, start, pairColors);
  if (commutator) return groupRows(withRawIndices(commutator, raw));

  if (!start || !pairColors) return null;
  const standard = labelStandard(tokens, start, pairColors);
  return standard && groupRows(withRawIndices(standard, raw));
}
