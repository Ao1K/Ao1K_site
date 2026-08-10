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
  // the placed F2L corner / edge, in the literal frame (the cube held cross-down and turned
  // yTurns; null until located). a y turn rotates these locations along with the cube.
  corner: CornerPlacement | null;
  edge: EdgePlacement | null;
  // F2L slots already filled with solved context pairs
  filledSlots: F2lSlot[];
  // Full EO: literal-frame free edge locations marked bad (flipped). null when the optional
  // Full EO step is not engaged; only meaningful while on STEP.FULL_EO.
  fullEO: EdgeLocation[] | null;
}

export const BASELINE_Y_TURNS = -1;

export const DEFAULT_F2L_CONFIG: F2lCaseConfig = {
  step: 0,
  yTurns: BASELINE_Y_TURNS,
  corner: null,
  edge: null,
  filledSlots: [],
  fullEO: null,
};

// step indices, named for clarity
export const STEP = {
  ORIENT: 0,
  F2L: 1,
  SLOTS: 2,
  EO: 3,
} as const;

// Slots and EO are only reachable once both pair pieces are placed
export const isF2lConfigured = (config: F2lCaseConfig): boolean =>
  config.corner != null && config.edge != null;

// a slot can hold a solved context pair unless it is the selected pair's home, or one of the
// placed pair pieces already sits in it
export function isSlotFillable(
  slot: F2lSlot,
  cornerLoc: CornerLocation | null | undefined,
  edgeLoc: EdgeLocation | null | undefined,
  homeSlot: F2lSlot | null,
): boolean {
  const pieces = F2L_SLOT_PIECES[slot];
  return slot !== homeSlot && cornerLoc !== pieces.corner && edgeLoc !== pieces.edge;
}

// diagram order: index → location (see CubeRefDiagram comments)
const CORNER_LOCS: CornerLocation[] = ['UFR', 'UBR', 'UBL', 'UFL', 'DFR', 'DBR', 'DBL', 'DFL'];
const EDGE_LOCS: EdgeLocation[] = ['UF', 'UR', 'UB', 'UL', 'FR', 'BR', 'BL', 'FL'];
const F2L_SLOT_ORDER: F2lSlot[] = ['FR', 'BR', 'BL', 'FL'];

// the Full EO free edges ordered by location index, so the case-ID bits stay positionally
// stable (matching how corner/edge indices are encoded).
export function freeEoEdgesInViewOrder(config: F2lCaseConfig): EdgeLocation[] {
  const free = freeEoEdgeSet(config.edge?.loc ?? null, config.filledSlots);
  return [...free].sort((a, b) => EDGE_LOCS.indexOf(a) - EDGE_LOCS.indexOf(b));
}

// how many edges are already pinned bad outside the Full EO selection (just the placed pair edge)
const determinedBadCount = (config: F2lCaseConfig): number => {
  if (!config.edge) return 0;
  return config.edge.orientation;
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
  raw += `${CORNER_LOCS.indexOf(config.corner.loc)}${config.corner.orientation}`;
  if (!config.edge) return raw;
  raw += `${EDGE_LOCS.indexOf(config.edge.loc)}${config.edge.orientation}`;
  for (let vi = 0; vi < 4; vi++) {
    raw += config.filledSlots.includes(F2L_SLOT_ORDER[vi]) ? '1' : '0';
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
      return isSlotFillable(F2L_SLOT_ORDER[i - 6], ctx.cornerLoc, ctx.edgeLoc, ctx.homeSlot);
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
    cornerLoc: CORNER_LOCS[parseInt(raw[2])],
    edgeLoc: EDGE_LOCS[parseInt(raw[4])],
    homeSlot: cross && pair ? f2lPairHomeSlot(cross, pair, y) : null,
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
  const config: F2lCaseConfig = { ...DEFAULT_F2L_CONFIG, yTurns: y, step: STEP.F2L };
  if (len < 3) return config;

  config.corner = { loc: CORNER_LOCS[parseInt(raw[2])], orientation: len >= 4 ? parseInt(raw[3]) as CornerOrientation : 0 };
  if (len < 5) return config;

  const edgeLoc = EDGE_LOCS[parseInt(raw[4])];
  const edgeOri = len >= 6 ? parseInt(raw[5]) : 0;
  config.edge = { loc: edgeLoc, orientation: edgeOri as EdgeOrientation };
  if (len < 6) return config;
  config.step = STEP.SLOTS;

  // apply each typed slot bit independently so partial slot input updates the cube right away
  config.filledSlots = [];
  for (let vi = 0; vi < 4 && 6 + vi < len; vi++) {
    if (raw[6 + vi] === '1') config.filledSlots.push(F2L_SLOT_ORDER[vi]);
  }
  if (len <= 10) return config;

  // Full EO bits (positions 10+), in the same view order configToRaw emits them
  config.step = STEP.EO;
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
