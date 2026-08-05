import type { CubeState as SimpleCubeState, Color } from './SimpleCube';

export type Facelets = Color[];

type Vec = [number, number, number];

type Placement = { pos: Vec; normal: Vec };

const placementOf = (face: number, row: number, col: number): Placement => {
  switch (face) {
    case 0: return { pos: [col - 1, -1, 1 - row], normal: [0, -1, 0] };
    case 1: return { pos: [col - 1, 1, row - 1], normal: [0, 1, 0] };
    case 2: return { pos: [col - 1, row - 1, -1], normal: [0, 0, -1] };
    case 3: return { pos: [1, row - 1, col - 1], normal: [1, 0, 0] };
    case 4: return { pos: [1 - col, row - 1, 1], normal: [0, 0, 1] };
    default: return { pos: [-1, row - 1, 1 - col], normal: [-1, 0, 0] };
  }
};

const placementKey = (pos: Vec, normal: Vec): string => `${pos.join(',')}|${normal.join(',')}`;

const PLACEMENTS: Placement[] = [];
const INDEX_BY_PLACEMENT = new Map<string, number>();

for (let face = 0; face < 6; face++) {
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const index = face * 9 + row * 3 + col;
      const placement = placementOf(face, row, col);
      PLACEMENTS[index] = placement;
      INDEX_BY_PLACEMENT.set(placementKey(placement.pos, placement.normal), index);
    }
  }
}

const spin = (v: Vec, axis: number, reversed: boolean): Vec => {
  const [x, y, z] = v;
  if (axis === 0) return reversed ? [x, -z, y] : [x, z, -y];
  if (axis === 1) return reversed ? [-z, y, x] : [z, y, -x];
  return reversed ? [y, -x, z] : [-y, x, z];
};

interface Turn {
  axis: number;
  layers: number[];
  reversed: boolean;
}

const TURNS: Record<string, Turn> = {
  R: { axis: 0, layers: [1], reversed: false },
  L: { axis: 0, layers: [-1], reversed: true },
  M: { axis: 0, layers: [0], reversed: true },
  r: { axis: 0, layers: [1, 0], reversed: false },
  l: { axis: 0, layers: [-1, 0], reversed: true },
  x: { axis: 0, layers: [1, 0, -1], reversed: false },
  U: { axis: 1, layers: [-1], reversed: false },
  D: { axis: 1, layers: [1], reversed: true },
  E: { axis: 1, layers: [0], reversed: true },
  u: { axis: 1, layers: [-1, 0], reversed: false },
  d: { axis: 1, layers: [1, 0], reversed: true },
  y: { axis: 1, layers: [1, 0, -1], reversed: false },
  F: { axis: 2, layers: [-1], reversed: false },
  B: { axis: 2, layers: [1], reversed: true },
  S: { axis: 2, layers: [0], reversed: false },
  f: { axis: 2, layers: [-1, 0], reversed: false },
  b: { axis: 2, layers: [1, 0], reversed: true },
  z: { axis: 2, layers: [1, 0, -1], reversed: false },
};

const buildQuarter = (turn: Turn): number[] => {
  const perm = new Array<number>(54);
  for (let i = 0; i < 54; i++) perm[i] = i;
  for (let i = 0; i < 54; i++) {
    const { pos, normal } = PLACEMENTS[i];
    if (!turn.layers.includes(pos[turn.axis])) continue;
    const moved = placementKey(spin(pos, turn.axis, turn.reversed), spin(normal, turn.axis, turn.reversed));
    const destination = INDEX_BY_PLACEMENT.get(moved);
    if (destination !== undefined) perm[destination] = i;
  }
  return perm;
};

const QUARTERS = new Map<string, number[]>();
for (const [base, turn] of Object.entries(TURNS)) QUARTERS.set(base, buildQuarter(turn));

const TOKEN_PERMS = new Map<string, number[] | null>();

const quarterCountOf = (token: string): number => {
  const suffix = token.slice(1);
  const magnitude = parseInt(suffix, 10) || 1;
  const signed = suffix.includes("'") ? -magnitude : magnitude;
  return ((signed % 4) + 4) % 4;
};

const permOf = (token: string): number[] | null => {
  const cached = TOKEN_PERMS.get(token);
  if (cached !== undefined) return cached;

  const quarter = QUARTERS.get(token[0] ?? '');
  const count = quarterCountOf(token);
  let perm: number[] | null = null;
  if (quarter && count > 0) {
    perm = quarter;
    for (let i = 1; i < count; i++) perm = perm.map((source) => quarter[source]);
  }
  TOKEN_PERMS.set(token, perm);
  return perm;
};

export const flattenState = (state: SimpleCubeState): Facelets => {
  const flat: Color[] = new Array<Color>(54);
  for (let face = 0; face < 6; face++) {
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) flat[face * 9 + row * 3 + col] = state[face][row][col];
    }
  }
  return flat;
};

export const applyMove = (state: Facelets, token: string): Facelets => {
  const perm = permOf(token);
  if (!perm) return state;
  const next = new Array<Color>(54);
  for (let i = 0; i < 54; i++) next[i] = state[perm[i]];
  return next;
};

const FACE_OF: Record<string, number> = { U: 0, D: 1, F: 2, R: 3, B: 4, L: 5 };

const EDGE_SLOTS: Record<string, number[]> = {
  UF: [7, 19], UR: [5, 28], UB: [1, 37], UL: [3, 46],
  DF: [10, 25], DR: [14, 34], DB: [16, 43], DL: [12, 52],
  FR: [23, 30], FL: [21, 50], BR: [39, 32], BL: [41, 48],
};

const CORNER_SLOTS: Record<string, number[]> = {
  UFR: [8, 20, 27], UBR: [2, 36, 29], UBL: [0, 38, 45], UFL: [6, 18, 47],
  DFR: [11, 26, 33], DFL: [9, 24, 53], DBL: [15, 44, 51], DBR: [17, 42, 35],
};

const CROSS_SLOTS = ['DF', 'DR', 'DB', 'DL'];
const MIDDLE_SLOTS = ['FR', 'FL', 'BR', 'BL'];
const SLOT_PAIRS: [string, string][] = [['DFR', 'FR'], ['DFL', 'FL'], ['DBL', 'BL'], ['DBR', 'BR']];

const SLOT_BY_SIDES: Record<string, { corner: string; edge: string }> = {
  FR: { corner: 'DFR', edge: 'FR' },
  FL: { corner: 'DFL', edge: 'FL' },
  RB: { corner: 'DBR', edge: 'BR' },
  BL: { corner: 'DBL', edge: 'BL' },
};

const centerColor = (state: Facelets, letter: string): Color => state[FACE_OF[letter] * 9 + 4];

const isSlotSolved = (state: Facelets, key: string, table: Record<string, number[]>): boolean => {
  const indices = table[key];
  for (let i = 0; i < indices.length; i++) {
    if (state[indices[i]] !== centerColor(state, key[i])) return false;
  }
  return true;
};

const slotColorKey = (state: Facelets, indices: number[]): string =>
  indices.map((i) => state[i]).sort().join('');

const findSlot = (state: Facelets, table: Record<string, number[]>, colors: Color[]): string | null => {
  const want = [...colors].sort().join('');
  for (const key of Object.keys(table)) {
    if (slotColorKey(state, table[key]) === want) return key;
  }
  return null;
};

export const crossSolved = (state: Facelets): boolean =>
  CROSS_SLOTS.every((key) => isSlotSolved(state, key, EDGE_SLOTS));

const pairHome = (state: Facelets, pairColors: [Color, Color]): { corner: string; edge: string } | null => {
  const sides = ['F', 'R', 'B', 'L'].filter((letter) => pairColors.includes(centerColor(state, letter)));
  if (sides.length !== 2) return null;
  return SLOT_BY_SIDES[sides.join('')] ?? null;
};

const isPairSolved = (state: Facelets, home: { corner: string; edge: string }): boolean =>
  isSlotSolved(state, home.corner, CORNER_SLOTS) && isSlotSolved(state, home.edge, EDGE_SLOTS);

const SEARCH_TOKENS = ['U', 'R', 'L', 'F', 'B'].flatMap((base) => [base, `${base}2`, `${base}'`]);

const searchDepth = (
  state: Facelets,
  home: { corner: string; edge: string },
  depth: number,
  lastBase: string,
): boolean => {
  for (const token of SEARCH_TOKENS) {
    if (token[0] === lastBase) continue;
    const next = applyMove(state, token);
    if (depth === 1) {
      if (crossSolved(next) && isPairSolved(next, home)) return true;
    } else if (searchDepth(next, home, depth - 1, token[0])) {
      return true;
    }
  }
  return false;
};

const movesToSolvePair = (
  state: Facelets,
  home: { corner: string; edge: string },
  maxDepth: number,
): number => {
  if (crossSolved(state) && isPairSolved(state, home)) return 0;
  for (let depth = 1; depth <= maxDepth; depth++) {
    if (searchDepth(state, home, depth, '')) return depth;
  }
  return maxDepth + 1;
};

export interface F2lPairInfo {
  cornerSlot: string;
  edgeSlot: string;
  cornerInBottom: boolean;
  edgeInMiddle: boolean;
  edgeInTop: boolean;
  cornerSolved: boolean;
  edgeSolved: boolean;
  touching: boolean;
  pairSolved: boolean;
  pairsSolved: number;
  minMoves: number;
}

const sharedLetters = (a: string, b: string): number =>
  [...b].filter((letter) => a.includes(letter)).length;

export function analyzeF2lPair(state: Facelets, pairColors: [Color, Color]): F2lPairInfo | null {
  const home = pairHome(state, pairColors);
  if (!home) return null;

  const bottomColor = centerColor(state, 'D');
  const cornerSlot = findSlot(state, CORNER_SLOTS, [pairColors[0], pairColors[1], bottomColor]);
  const edgeSlot = findSlot(state, EDGE_SLOTS, [pairColors[0], pairColors[1]]);
  if (!cornerSlot || !edgeSlot) return null;

  const cornerInBottom = cornerSlot[0] === 'D';
  const edgeInMiddle = MIDDLE_SLOTS.includes(edgeSlot);
  const edgeInTop = edgeSlot[0] === 'U';
  const cornerSolved = isSlotSolved(state, home.corner, CORNER_SLOTS);
  const edgeSolved = isSlotSolved(state, home.edge, EDGE_SLOTS);
  const pairSolved = cornerSolved && edgeSolved;
  const inTopLayer = !cornerInBottom && edgeInTop;

  const pairsSolved = SLOT_PAIRS.filter(
    ([corner, edge]) => isSlotSolved(state, corner, CORNER_SLOTS) && isSlotSolved(state, edge, EDGE_SLOTS),
  ).length;

  return {
    cornerSlot,
    edgeSlot,
    cornerInBottom,
    edgeInMiddle,
    edgeInTop,
    cornerSolved,
    edgeSolved,
    touching: inTopLayer && sharedLetters(cornerSlot, edgeSlot) === 2,
    pairSolved,
    pairsSolved,
    minMoves: !pairSolved && inTopLayer ? movesToSolvePair(state, home, 4) : -1,
  };
}
