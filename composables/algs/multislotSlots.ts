import { SimpleCube, type Color, type CubeState } from '../recon/SimpleCube';
import { tokenize } from './algMoves';
import { type SlotKey } from './pairIcon';

export type Facelet = [number, number, number];

const UP = 0;
const DOWN = 1;

export const CORNERS: Facelet[][] = [
  [[0, 2, 0], [2, 0, 0], [5, 0, 2]],
  [[0, 2, 2], [2, 0, 2], [3, 0, 0]],
  [[0, 0, 2], [4, 0, 0], [3, 0, 2]],
  [[0, 0, 0], [4, 0, 2], [5, 0, 0]],
  [[1, 0, 0], [2, 2, 0], [5, 2, 2]],
  [[1, 0, 2], [2, 2, 2], [3, 2, 0]],
  [[1, 2, 2], [4, 2, 0], [3, 2, 2]],
  [[1, 2, 0], [4, 2, 2], [5, 2, 0]],
];

export const EDGES: Facelet[][] = [
  [[0, 2, 1], [2, 0, 1]],
  [[0, 1, 2], [3, 0, 1]],
  [[0, 0, 1], [4, 0, 1]],
  [[0, 1, 0], [5, 0, 1]],
  [[1, 0, 1], [2, 2, 1]],
  [[1, 1, 2], [3, 2, 1]],
  [[1, 2, 1], [4, 2, 1]],
  [[1, 1, 0], [5, 2, 1]],
  [[2, 1, 2], [3, 1, 0]],
  [[2, 1, 0], [5, 1, 2]],
  [[4, 1, 0], [3, 1, 2]],
  [[4, 1, 2], [5, 1, 0]],
];

const LATERAL_LETTER: Record<number, string> = { 2: 'F', 3: 'R', 4: 'B', 5: 'L' };

const SLOT_KEYS: SlotKey[] = ['FL', 'FR', 'BL', 'BR'];

const invertToken = (token: string): string =>
  token.endsWith('2') ? token
    : token.endsWith("2'") ? token.slice(0, -1)
      : token.endsWith("'") ? token.slice(0, -1)
        : token + "'";

// a half turn can complete a slot halfway through, and its written direction doesn't say which
// quarter that is, so both readings are sampled and either one counts
const halfTurnQuarters = (token: string): string[] => {
  const base = token.replace(/2'?$/, '');
  return base === token ? [] : [base, base + "'"];
};

function readPieces(state: CubeState): Map<string, boolean> {
  const pieces = new Map<string, boolean>();
  for (const position of [...CORNERS, ...EDGES]) {
    const stickers = position.map(([face, row, col]) => state[face][row][col]);
    const centers = position.map(([face]) => state[face][1][1]);
    pieces.set(
      [...stickers].sort().join(''),
      stickers.every((sticker, i) => sticker === centers[i]),
    );
  }
  return pieces;
}

function faceOfEachColor(state: CubeState): Map<Color, number> {
  return new Map(state.map((face, i) => [face[1][1], i] as [Color, number]));
}

function pieceSlot(identity: string, faceOfColor: Map<Color, number>): SlotKey | null {
  const faces = [...identity].map((color) => faceOfColor.get(color as Color) ?? UP);
  const lateral = faces.filter((face) => face !== UP && face !== DOWN);
  if (lateral.length !== 2) return null;
  if (faces.length === 3 && !faces.includes(DOWN)) return null;
  return lateral.map((face) => LATERAL_LETTER[face]).sort().join('') as SlotKey;
}

function solvedSlots(state: CubeState, faceOfColor: Map<Color, number>): Set<SlotKey> {
  const broken = new Set<SlotKey>();
  for (const [identity, solved] of readPieces(state)) {
    const slot = pieceSlot(identity, faceOfColor);
    if (slot && !solved) broken.add(slot);
  }
  return new Set(SLOT_KEYS.filter((slot) => !broken.has(slot)));
}

const SLOT_DIRECTION: Record<SlotKey, string> = {
  FR: 'front-right', FL: 'front-left', BR: 'back-right', BL: 'back-left',
};

const SIDE_GROUPS: { label: string; slots: [SlotKey, SlotKey] }[] = [
  { label: 'front', slots: ['FR', 'FL'] },
  { label: 'back', slots: ['BR', 'BL'] },
  { label: 'right', slots: ['FR', 'BR'] },
  { label: 'left', slots: ['FL', 'BL'] },
];

const capitalize = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

export function f2lPairTitle(alg: string): string {
  const slots = new Set(algSolvedSlots(alg));
  if (slots.size === 0) return 'F2L';
  if (slots.size === 4) return 'What did you do';

  const labels: string[] = [];
  const remaining = new Set(slots);
  for (const group of SIDE_GROUPS) {
    if (group.slots.every((slot) => remaining.has(slot))) {
      labels.push(group.label);
      group.slots.forEach((slot) => remaining.delete(slot));
    }
  }
  for (const slot of SLOT_KEYS) {
    if (remaining.has(slot)) labels.push(SLOT_DIRECTION[slot]);
  }

  const phrase = labels.length === 1
    ? labels[0]
    : `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
  return `${capitalize(phrase)} F2L pair${slots.size > 1 ? '(s)' : ''}`;
}

export function algSolvedSlots(alg: string): SlotKey[] {
  const tokens = tokenize(alg);
  if (tokens.length === 0) return [];

  const cube = new SimpleCube();
  const setup = tokens.slice().reverse().map(invertToken);
  const faceOfColor = faceOfEachColor(cube.getCubeState([...setup, ...tokens]));
  const slotsAfter = (moves: string[]) =>
    solvedSlots(cube.getCubeState([...setup, ...moves]), faceOfColor);

  const timeline = [slotsAfter([])];
  for (let i = 0; i < tokens.length; i++) {
    const quarters = halfTurnQuarters(tokens[i]);
    if (quarters.length > 0) {
      const midway = quarters.map((quarter) => slotsAfter([...tokens.slice(0, i), quarter]));
      timeline.push(new Set(midway.flatMap((slots) => [...slots])));
    }
    timeline.push(slotsAfter(tokens.slice(0, i + 1)));
  }

  const targets = SLOT_KEYS.filter((slot) => !timeline[0].has(slot));
  if (targets.length === 0) return [];

  const completedAt = new Map(
    targets.map((slot) => [slot, timeline.findIndex((slots) => slots.has(slot))] as const),
  );
  const last = Math.max(...completedAt.values());
  return targets.filter((slot) => completedAt.get(slot) === last);
}
