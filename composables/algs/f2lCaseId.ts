// pure, no 'use client': the codec must be importable by the server page so it can seed
// initial state from the URL, keeping the prerender in step with the first client render.
import {
  pairsForCross,
  f2lPairHomeSlot,
  freeEoEdgeSet,
  F2L_SLOT_PIECES,
  EDGE_LOC_FACES,
  type FaceKey,
  type CornerLocation,
  type CornerOrientation,
  type EdgeLocation,
  type EdgeOrientation,
  type CornerPlacement,
  type EdgePlacement,
  type F2lSlot,
} from './cubePaint';

// configuration of the F2L case being built, lifted to f2lSearch.
export interface F2lCaseConfig {
  // index into STEPS — which setup step is active
  step: number;
  // net quarter turns about the vertical axis; the logical y state is ((yTurns % 4) + 4) % 4.
  // a counter (rather than 0–3) so the cube animates in the pressed direction across the wrap.
  yTurns: number;
  // the placed F2L corner / edge, in the cube-fixed frame (null until located).
  // buildF2lCubeState spins this by yTurns to express the case from the viewing angle.
  corner: CornerPlacement | null;
  edge: EdgePlacement | null;
  // whether each orientation step is done. orientation 0 is valid, so the value can't tell us
  // if the user acted; and it's sticky across step nav, so it can't be re-derived from `step`.
  cornerOriDone: boolean;
  edgeOriDone: boolean;
  // F2L slots already filled with solved context pairs
  filledSlots: F2lSlot[];
  // Full EO: cube-fixed free edge locations marked bad (flipped). null when the optional
  // Full EO step is not engaged; only meaningful while on STEP.FULL_EO.
  fullEO: EdgeLocation[] | null;
}

export const DEFAULT_F2L_CONFIG: F2lCaseConfig = {
  step: 0,
  yTurns: 0,
  corner: null,
  edge: null,
  cornerOriDone: false,
  edgeOriDone: false,
  filledSlots: [],
  fullEO: null,
};

// step indices, named for clarity
export const STEP = {
  ORIENT: 0,
  CORNER_LOC: 1,
  CORNER_ORI: 2,
  EDGE_LOC: 3,
  EDGE_ORI: 4,
  SLOTS: 5,
  FULL_EO: 6,
} as const;

// diagram order at y=0: index → physical location (see CubeRefDiagram comments)
const CORNER_LOCS: CornerLocation[] = ['UFR', 'UBR', 'UBL', 'UFL', 'DFR', 'DBR', 'DBL', 'DFL'];
const EDGE_LOCS: EdgeLocation[] = ['UF', 'UR', 'UB', 'UL', 'FR', 'BR', 'BL', 'FL'];
const F2L_SLOT_ORDER: F2lSlot[] = ['FR', 'BR', 'BL', 'FL'];

const rotateSlotIndex = (index: number, y: number): number => (((index + y) % 4) + 4) % 4;

function viewToLoc<T>(locs: T[], i: number, y: number): T {
  return locs[Math.floor(i / 4) * 4 + rotateSlotIndex(i % 4, y)];
}
function locToView<T>(locs: T[], loc: T, y: number): number {
  const abs = locs.indexOf(loc);
  return Math.floor(abs / 4) * 4 + rotateSlotIndex(abs % 4, -y);
}

export const viewEoFlip = (loc: EdgeLocation, y: number): EdgeOrientation =>
  EDGE_LOC_FACES[loc].includes('up') && y % 2 === 1 ? 1 : 0;

// the Full EO free edges ordered by their on-screen position, so the case-ID bits stay
// positionally stable as the cube is spun (matching how corner/edge indices are encoded).
export function freeEoEdgesInViewOrder(config: F2lCaseConfig): EdgeLocation[] {
  const y = ((config.yTurns % 4) + 4) % 4;
  const free = freeEoEdgeSet(config.edge?.loc ?? null, config.filledSlots);
  return [...free].sort((a, b) => locToView(EDGE_LOCS, a, y) - locToView(EDGE_LOCS, b, y));
}

// how many edges are already pinned bad outside the Full EO selection (just the placed pair
// edge), counted in the view frame the Full EO bits live in
const determinedBadCount = (config: F2lCaseConfig): number => {
  if (!config.edge) return 0;
  const y = ((config.yTurns % 4) + 4) % 4;
  return config.edge.orientation ^ viewEoFlip(config.edge.loc, y);
};

export const isFullEOActive = (config: F2lCaseConfig): boolean => config.fullEO != null;

// a legal EO needs an even number of flipped edges
export function isFullEOValid(config: F2lCaseConfig): boolean {
  if (config.fullEO == null) return true;
  return (config.fullEO.length + determinedBadCount(config)) % 2 === 0;
}

// the default Full EO selection: all free edges good, but if the placed pair edge is bad we
// must flip one free edge to keep parity even — preferring the top layer (middle never needed).
export function initialFullEO(config: F2lCaseConfig): EdgeLocation[] {
  if (determinedBadCount(config) % 2 === 0) return [];
  const free = freeEoEdgeSet(config.edge?.loc ?? null, config.filledSlots);
  const forced = free.find((l) => EDGE_LOC_FACES[l].includes('up')) ?? free[0];
  return forced ? [forced] : [];
}

const FACE_LETTER: Record<FaceKey, string> = {
  up: 'W', down: 'Y', front: 'G', back: 'B', right: 'R', left: 'O',
};
const LETTER_FACE: Record<string, FaceKey> = {
  w: 'up', y: 'down', g: 'front', b: 'back', r: 'right', o: 'left',
};

export function configToRaw(config: F2lCaseConfig): string {
  const y = ((config.yTurns % 4) + 4) % 4;
  let raw = `y${y}`;
  if (!config.corner) return raw;
  raw += `${locToView(CORNER_LOCS, config.corner.loc, y)}${config.corner.orientation}`;
  if (!config.edge) return raw;
  raw += `${locToView(EDGE_LOCS, config.edge.loc, y)}${config.edge.orientation ^ viewEoFlip(config.edge.loc, y)}`;
  for (let vi = 0; vi < 4; vi++) {
    const cubeSlot = F2L_SLOT_ORDER[rotateSlotIndex(vi, y)];
    raw += config.filledSlots.includes(cubeSlot) ? '1' : '0';
  }
  if (config.fullEO != null) {
    for (const loc of freeEoEdgesInViewOrder(config)) raw += config.fullEO.includes(loc) ? '1' : '0';
  }
  return raw;
}

export type SlotContext = {
  y: number;
  cornerLoc: CornerLocation;
  edgeLoc: EdgeLocation;
  homeSlot: F2lSlot | null;
};

export function isValidChar(i: number, ch: string, ctx?: SlotContext): boolean {
  const n = parseInt(ch);
  switch (i) {
    case 0: return ch === 'y';
    case 1: return n >= 0 && n <= 3;
    case 2: return n >= 0 && n <= 7;
    case 3: return n >= 0 && n <= 2;
    case 4: return n >= 0 && n <= 7;
    case 5: return n === 0 || n === 1;
    case 6:
    case 7:
    case 8:
    case 9: {
      if (n !== 0 && n !== 1) return false;
      if (n === 0 || !ctx) return true;
      const slot = F2L_SLOT_ORDER[rotateSlotIndex(i - 6, ctx.y)];
      if (slot === ctx.homeSlot) return false;
      if (ctx.cornerLoc === F2L_SLOT_PIECES[slot].corner) return false;
      if (ctx.edgeLoc === F2L_SLOT_PIECES[slot].edge) return false;
      return true;
    }
    default:
      // Full EO bits: at most seven free edges (positions 10–16), each 0 (good) or 1 (bad)
      return i >= 10 && i <= 16 && (ch === '0' || ch === '1');
  }
}

export function buildSlotContext(raw: string, cross?: FaceKey, pair?: [FaceKey, FaceKey]): SlotContext {
  const y = parseInt(raw[1]);
  return {
    y,
    cornerLoc: viewToLoc(CORNER_LOCS, parseInt(raw[2]), y),
    edgeLoc: viewToLoc(EDGE_LOCS, parseInt(raw[4]), y),
    homeSlot: cross && pair ? f2lPairHomeSlot(cross, pair) : null,
  };
}

export function rawToConfig(raw: string, cross?: FaceKey, pair?: [FaceKey, FaceKey]): F2lCaseConfig | null {
  let len = 0;
  let ctx: SlotContext | undefined;
  while (len < raw.length) {
    if (len === 6) ctx = buildSlotContext(raw, cross, pair);
    if (!isValidChar(len, raw[len], ctx)) break;
    len++;
  }

  if (len < 2) return null;

  const y = parseInt(raw[1]);
  const config: F2lCaseConfig = { ...DEFAULT_F2L_CONFIG, yTurns: y, step: STEP.CORNER_LOC };
  if (len < 3) return config;

  config.corner = { loc: viewToLoc(CORNER_LOCS, parseInt(raw[2]), y), orientation: len >= 4 ? parseInt(raw[3]) as CornerOrientation : 0 };
  config.cornerOriDone = len >= 4;
  config.step = len >= 4 ? STEP.EDGE_LOC : STEP.CORNER_ORI;
  if (len < 5) return config;

  const edgeLoc = viewToLoc(EDGE_LOCS, parseInt(raw[4]), y);
  const edgeOriView = len >= 6 ? parseInt(raw[5]) : 0;
  config.edge = { loc: edgeLoc, orientation: (edgeOriView ^ viewEoFlip(edgeLoc, y)) as EdgeOrientation };
  config.edgeOriDone = len >= 6;
  config.step = len >= 6 ? STEP.SLOTS : STEP.EDGE_ORI;
  if (len < 6) return config;

  // apply each typed slot bit independently so partial slot input updates the cube right away
  config.filledSlots = [];
  for (let vi = 0; vi < 4 && 6 + vi < len; vi++) {
    if (raw[6 + vi] === '1') config.filledSlots.push(F2L_SLOT_ORDER[rotateSlotIndex(vi, y)]);
  }
  if (len < 10) return config;

  // Full EO bits (positions 10+), in the same view order configToRaw emits them
  config.step = STEP.FULL_EO;
  config.fullEO = [];
  const freeEdges = freeEoEdgesInViewOrder(config);
  for (let i = 0; i < freeEdges.length && 10 + i < len; i++) {
    if (raw[10 + i] === '1') config.fullEO.push(freeEdges[i]);
  }
  return config;
}

export function formatRaw(raw: string): string {
  let out = '';
  for (let i = 0; i < raw.length; i++) {
    if (i === 2 || i === 4 || i === 6) out += '-';
    if (i === 10) out += '(';
    out += raw[i];
  }
  if (raw.length > 10) out += ')';
  return out;
}

export function encodePrefixFromState(cross: FaceKey, pair: [FaceKey, FaceKey]): string {
  return FACE_LETTER[cross] + FACE_LETTER[pair[0]] + FACE_LETTER[pair[1]];
}

export function decodePrefixToState(prefix: string): { cross: FaceKey; pair: [FaceKey, FaceKey] } | null {
  if (prefix.length < 3) return null;
  const cross = LETTER_FACE[prefix[0].toLowerCase()];
  const p1 = LETTER_FACE[prefix[1].toLowerCase()];
  const p2 = LETTER_FACE[prefix[2].toLowerCase()];
  if (!cross || !p1 || !p2) return null;
  const valid = pairsForCross(cross).find(([a, b]) => (a === p1 && b === p2) || (a === p2 && b === p1));
  if (!valid) return null;
  return { cross, pair: valid };
}

export function configFromParams(
  prefixParam: string | undefined,
  rawParam: string | undefined,
): { cross: FaceKey; pair: [FaceKey, FaceKey]; config: F2lCaseConfig } {
  let cross: FaceKey = 'up';
  let pair: [FaceKey, FaceKey] = pairsForCross('up')[0];

  if (prefixParam) {
    const decoded = decodePrefixToState(prefixParam);
    if (decoded) {
      cross = decoded.cross;
      pair = decoded.pair;
    }
  }

  let config = DEFAULT_F2L_CONFIG;
  if (rawParam) {
    const parsed = rawToConfig(rawParam, cross, pair);
    if (parsed) config = parsed;
  }

  return { cross, pair, config };
}
