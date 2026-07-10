// Cube color model for the algs page.
//
// A facelet has two colors that we deliberately keep separate:
//
//   - its TRUE color: what cubing.js actually renders. The true-yellow center is
//     always physically on the bottom, true-white always up, etc. This never moves
//     because we never turn the cube.
//   - its SHOWN color, which we call its PAINT: what the viewer actually sees. The
//     paint can differ from the true color — the bottom (true-yellow) center might be
//     painted red, white, grey, anything.
//
// The gap between the two is the cube's "paint layer". True colors only matter once,
// to translate cubing.js's facelets into our working space; after the PaintMap is
// built we work entirely in paint/shown space and never read cubing.js colors again.
//
// The model is keyed per facelet, so a single facelet (or, by setting all of a
// piece's facelets, a single piece) can be repainted independently — see `overrides`
// in computeShown.

export type FaceKey = 'up' | 'down' | 'front' | 'back' | 'right' | 'left';

export type PieceType = 'CORNERS' | 'EDGES' | 'CENTERS';

// `${orbit}:${pieceIndex}:${faceletIndex}`
export type FaceletId = string;

export const faceletId = (pieceType: PieceType, pieceIndex: number, faceletIndex: number): FaceletId =>
  `${pieceType}:${pieceIndex}:${faceletIndex}`;

export const pieceKeyOf = (pieceType: PieceType, pieceIndex: number): string => `${pieceType}:${pieceIndex}`;

export interface FaceletPaint {
  pieceType: PieceType;
  pieceIndex: number;
  faceletIndex: number;
  // which face this facelet truly belongs to, derived once from its true color
  face: FaceKey;
  // cubing.js native hex (e.g. '#ffffff') — only kept as the translation record
  trueColor: string;
}

export type PaintMap = Map<FaceletId, FaceletPaint>;

// cubing.js ordering
export const CENTER_FACE_ORDER: FaceKey[] = ['up', 'left', 'front', 'right', 'back', 'down'];

// conventional color name per face (independent of the user's custom colors)
export const FACE_COLOR_NAME: Record<FaceKey, string> = {
  up: 'White',
  down: 'Yellow',
  front: 'Green',
  back: 'Blue',
  right: 'Red',
  left: 'Orange',
};

// the three opposite-color axes of the cube
export const AXES: [FaceKey, FaceKey][] = [
  ['up', 'down'],
  ['front', 'back'],
  ['right', 'left'],
];

export const CROSS_OPTIONS: FaceKey[] = ['up', 'down', 'front', 'back', 'right', 'left'];

// The cube is never turned, so true-white is always physically up, true-yellow down, etc.
// To show a chosen cross color on the bottom we instead REPAINT: each table below maps a
// physical position → the color identity displayed there, i.e. a solved cube reoriented so
// the cross color lands on `down`. (Derived as proper rotations, so chirality is preserved.)
export const ORIENTATIONS: Record<FaceKey, Record<FaceKey, FaceKey>> = {
  down: { up: 'up', down: 'down', front: 'front', back: 'back', right: 'right', left: 'left' },
  up: { up: 'down', down: 'up', front: 'front', back: 'back', right: 'left', left: 'right' },
  front: { up: 'back', down: 'front', front: 'up', back: 'down', right: 'right', left: 'left' },
  back: { up: 'front', down: 'back', front: 'down', back: 'up', right: 'right', left: 'left' },
  right: { up: 'left', down: 'right', front: 'front', back: 'back', right: 'up', left: 'down' },
  left: { up: 'right', down: 'left', front: 'front', back: 'back', right: 'down', left: 'up' },
};

const ALL_FACES: FaceKey[] = ['up', 'down', 'front', 'back', 'right', 'left'];

const Y_FACE_NEXT: Record<FaceKey, FaceKey> = {
  front: 'left', left: 'back', back: 'right', right: 'front', up: 'up', down: 'down',
};

export function rotateFaceY(face: FaceKey, q: number): FaceKey {
  const n = ((q % 4) + 4) % 4;
  let f = face;
  for (let i = 0; i < n; i++) f = Y_FACE_NEXT[f];
  return f;
}

export function orientationFor(cross: FaceKey, yTurns: number): Record<FaceKey, FaceKey> {
  const base = ORIENTATIONS[cross];
  const orient = {} as Record<FaceKey, FaceKey>;
  for (const f of ALL_FACES) orient[f] = base[rotateFaceY(f, -yTurns)];
  return orient;
}

// the four F2L pairs for a cross: every combination of one color from each of the
// two side axes (i.e. adjacent pairs, excluding the cross color and its opposite)
export function pairsForCross(cross: FaceKey): [FaceKey, FaceKey][] {
  const [axisA, axisB] = AXES.filter((axis) => !axis.includes(cross));
  const pairs: [FaceKey, FaceKey][] = [];
  for (const a of axisA) for (const b of axisB) pairs.push([a, b]);
  return pairs;
}

// tailwind neutral-700
export const MASK_COLOR = '#404040';

// tailwind neutral-500
export const HINT_MASK_COLOR = '#737373';

// compute starting visible pieces: cross pieces and centers
function isUnmasked(facelets: FaceletPaint[]): boolean {
  const pieceType = facelets[0]?.pieceType;
  if (pieceType === 'CENTERS') return true;
  if (pieceType === 'EDGES') return facelets.some((f) => f.face === 'down');
  return false;
}

/**
 * Computes the shown (paint) color for every facelet given the chosen cross.
 *
 * Unmasked facelets (all centers + the four bottom edges) are repainted according to
 * ORIENTATIONS[cross], which reorients the color scheme so the cross color sits on the
 * bottom. Everything else is painted MASK_COLOR.
 *
 * `overrides` wins over everything, letting a single facelet/piece be repainted.
 */
export function computeShown(
  model: PaintMap,
  cross: FaceKey,
  faceColor: (face: FaceKey) => string,
  overrides?: Map<FaceletId, string>,
): Map<FaceletId, string> {
  const orientation = ORIENTATIONS[cross];

  // group facelets by piece so masking can consider the whole piece at once
  const byPiece = new Map<string, FaceletPaint[]>();
  for (const facelet of model.values()) {
    const key = pieceKeyOf(facelet.pieceType, facelet.pieceIndex);
    const list = byPiece.get(key);
    if (list) list.push(facelet);
    else byPiece.set(key, [facelet]);
  }

  const shown = new Map<FaceletId, string>();
  for (const [id, facelet] of model) {
    if (overrides?.has(id)) {
      shown.set(id, overrides.get(id)!);
      continue;
    }
    const pieceFacelets = byPiece.get(pieceKeyOf(facelet.pieceType, facelet.pieceIndex))!;
    // paint the position's true face as the color the reorientation places there
    shown.set(id, isUnmasked(pieceFacelets) ? faceColor(orientation[facelet.face]) : MASK_COLOR);
  }
  return shown;
}

// ---------------------------------------------------------------------------
// F2L case placement
//
// The user builds a case by placing the F2L corner and edge at locations. Pieces
// are GLUED to the cube: a placement is stored in the cube-fixed (physical)
// frame, so painting it never depends on how the cube has been spun — a y turn
// just rotates the cube and the painted pieces ride along.
// ---------------------------------------------------------------------------

const mod3 = (n: number) => ((n % 3) + 3) % 3;

// corners face U or D (0), F or B (1), L or R (2) with the cross color
export type CornerOrientation = 0 | 1 | 2;
// edge orientation: 0 = good EO, 1 = bad EO. "good" is defined by edgeGoodFace.
export type EdgeOrientation = 0 | 1;

export type CornerLocation = 'UFR' | 'UBR' | 'UBL' | 'UFL' | 'DFR' | 'DBR' | 'DBL' | 'DFL';
// only the eight non-cross edge locations: four top-layer + four middle-layer
export type EdgeLocation = 'UF' | 'UR' | 'UB' | 'UL' | 'FR' | 'BR' | 'BL' | 'FL';

export const CORNER_LOC_FACES: Record<CornerLocation, FaceKey[]> = {
  UFR: ['up', 'front', 'right'], 
  UBR: ['up', 'back', 'right'], 
  UBL: ['up', 'back', 'left'],
  UFL: ['up', 'front', 'left'],
  DFR: ['down', 'front', 'right'], 
  DBR: ['down', 'back', 'right'], 
  DBL: ['down', 'back', 'left'],
  DFL: ['down', 'front', 'left'],
};

export const EDGE_LOC_FACES: Record<EdgeLocation, FaceKey[]> = {
  UF: ['up', 'front'], 
  UR: ['up', 'right'],
  UB: ['up', 'back'], 
  UL: ['up', 'left'], 
  FR: ['front', 'right'], 
  BR: ['back', 'right'], 
  BL: ['back', 'left'],
  FL: ['front', 'left'], 
};

export interface CornerPlacement { loc: CornerLocation; orientation: CornerOrientation; }
export interface EdgePlacement { loc: EdgeLocation; orientation: EdgeOrientation; }

// a reference to a cube-fixed corner/edge location (a clicked piece, or one to highlight)
export type PieceRef =
  | { pieceType: 'CORNERS'; loc: CornerLocation }
  | { pieceType: 'EDGES'; loc: EdgeLocation };

// the four F2L slots, each a bottom-layer corner paired with its middle-layer edge
export type F2lSlot = 'FR' | 'BR' | 'BL' | 'FL';
export const F2L_SLOT_PIECES: Record<F2lSlot, { corner: CornerLocation; edge: EdgeLocation }> = {
  FR: { corner: 'DFR', edge: 'FR' },
  BR: { corner: 'DBR', edge: 'BR' },
  BL: { corner: 'DBL', edge: 'BL' },
  FL: { corner: 'DFL', edge: 'FL' },
};

const sortedFaceKey = (faces: FaceKey[]) => [...faces].sort().join(',');

function cornerLocFromFaces(faces: FaceKey[]): CornerLocation {
  const key = sortedFaceKey(faces);
  return (Object.keys(CORNER_LOC_FACES) as CornerLocation[]).find((l) => sortedFaceKey(CORNER_LOC_FACES[l]) === key)!;
}
function edgeLocFromFaces(faces: FaceKey[]): EdgeLocation {
  const key = sortedFaceKey(faces);
  return (Object.keys(EDGE_LOC_FACES) as EdgeLocation[]).find((l) => sortedFaceKey(EDGE_LOC_FACES[l]) === key)!;
}

export const rotateCornerLocY = (loc: CornerLocation, q: number): CornerLocation =>
  cornerLocFromFaces(CORNER_LOC_FACES[loc].map((f) => rotateFaceY(f, q)));
export const rotateEdgeLocY = (loc: EdgeLocation, q: number): EdgeLocation =>
  edgeLocFromFaces(EDGE_LOC_FACES[loc].map((f) => rotateFaceY(f, q)));

export function rotateSlotY(slot: F2lSlot, q: number): F2lSlot {
  const cornerLoc = rotateCornerLocY(F2L_SLOT_PIECES[slot].corner, q);
  return (Object.keys(F2L_SLOT_PIECES) as F2lSlot[]).find((s) => F2L_SLOT_PIECES[s].corner === cornerLoc)!;
}

const axisOf = (f: FaceKey): 'X' | 'Y' | 'Z' =>
  f === 'up' || f === 'down' ? 'Y' : f === 'right' || f === 'left' ? 'X' : 'Z';
const signOf = (f: FaceKey): number => (f === 'up' || f === 'right' || f === 'front' ? 1 : -1);

// a corner's three faces in a consistent cyclic (handedness-preserving) order.
// works on color identities too, since a solved facelet's face equals its color.
function cornerCycle(faces: FaceKey[]): FaceKey[] {
  const x = faces.find((f) => axisOf(f) === 'X')!;
  const y = faces.find((f) => axisOf(f) === 'Y')!;
  const z = faces.find((f) => axisOf(f) === 'Z')!;
  // reversing the last two flips handedness back when the sign product is negative
  return signOf(x) * signOf(y) * signOf(z) > 0 ? [x, y, z] : [x, z, y];
}

// maps each (physical) face of a corner location to the color identity shown there.
// the F2L corner's intrinsic chirality (from its solved home) is rotated so the
// cross color lands on the axis the orientation requires.
export function cornerFaceColors(
  loc: CornerLocation,
  orientation: CornerOrientation,
  cross: FaceKey,
  pair: [FaceKey, FaceKey],
): Map<FaceKey, FaceKey> {
  const locCycle = cornerCycle(CORNER_LOC_FACES[loc]);
  const pieceCycle = cornerCycle([cross, pair[0], pair[1]]);
  const reqAxis = orientation === 0 ? 'Y' : orientation === 1 ? 'Z' : 'X';
  const i0 = locCycle.findIndex((f) => axisOf(f) === reqAxis);
  const j = pieceCycle.indexOf(cross);
  const r = mod3(j - i0);
  const map = new Map<FaceKey, FaceKey>();
  for (let i = 0; i < 3; i++) map.set(locCycle[i], pieceCycle[(i + r) % 3]);
  return map;
}

// a solved piece shows each of its faces' own center identity (its physical face's color)
const solvedColors = (faces: FaceKey[], orient: Record<FaceKey, FaceKey>): Map<FaceKey, FaceKey> =>
  new Map(faces.map((f) => [f, orient[f]]));

export function edgeGoodFace(loc: EdgeLocation): FaceKey {
  const faces = EDGE_LOC_FACES[loc];
  return faces.find((f) => axisOf(f) === 'X') ?? faces.find((f) => axisOf(f) === 'Z')!;
}

// maps each (physical) face of an edge location to the color identity shown there.
// orientation 0 (good) puts the L/R color on edgeGoodFace; 1 (bad) puts it on the other face.
export function edgeFaceColors(
  loc: EdgeLocation,
  orientation: EdgeOrientation,
  orient: Record<FaceKey, FaceKey>,
  pair: [FaceKey, FaceKey],
): Map<FaceKey, FaceKey> {
  const faces = EDGE_LOC_FACES[loc];
  // the pair color whose identity sits on a physical L/R center
  const lrColors = new Set<FaceKey>([orient.left, orient.right]);
  const lrColor = lrColors.has(pair[0]) ? pair[0] : pair[1];
  const otherColor = lrColor === pair[0] ? pair[1] : pair[0];

  const goodFace = edgeGoodFace(loc);
  const badFace = faces.find((f) => f !== goodFace)!;

  const map = new Map<FaceKey, FaceKey>();
  map.set(orientation === 0 ? goodFace : badFace, lrColor);
  map.set(orientation === 0 ? badFace : goodFace, otherColor);
  return map;
}

// the non-cross edge locations split by layer, in a stable canonical order
const TOP_EDGE_LOCS: EdgeLocation[] = ['UF', 'UR', 'UB', 'UL'];
const MIDDLE_EDGE_LOCS: EdgeLocation[] = ['FR', 'BR', 'BL', 'FL'];

// the non-cross edges not pinned down by the placed pair edge or solved slots: the edges
// whose orientation the Full EO step lets the user set. Cube-fixed, canonical order.
export function freeEoEdgeSet(edgeLoc: EdgeLocation | null, filledSlots: F2lSlot[]): EdgeLocation[] {
  const excluded = new Set<EdgeLocation>();
  if (edgeLoc) excluded.add(edgeLoc);
  for (const slot of filledSlots) excluded.add(F2L_SLOT_PIECES[slot].edge);
  return [...TOP_EDGE_LOCS, ...MIDDLE_EDGE_LOCS].filter((l) => !excluded.has(l));
}

// whether an edge placement is oriented (EO "good"), matching SimpleCubeInterpreter.getEOvalue:
// edges carrying a U/D identity orient off that sticker, the rest off their L/R identity.
export function isEdgeOriented(
  faces: FaceKey[],
  faceToId: Map<FaceKey, FaceKey>,
  orient: Record<FaceKey, FaceKey>,
): boolean {
  const verticalColors = new Set<FaceKey>([orient.up, orient.down]);
  const xColors = new Set<FaceKey>([orient.left, orient.right]);
  const inTopBottom = faces.includes('up') || faces.includes('down');

  let classifyFace = faces.find((f) => verticalColors.has(faceToId.get(f)!));
  if (classifyFace) {
    return inTopBottom
      ? classifyFace === 'up' || classifyFace === 'down'
      : classifyFace !== 'left' && classifyFace !== 'right';
  }
  classifyFace = faces.find((f) => xColors.has(faceToId.get(f)!));
  if (!classifyFace) return true;
  return inTopBottom
    ? classifyFace !== 'up' && classifyFace !== 'down'
    : classifyFace === 'left' || classifyFace === 'right';
}

// places an arbitrary edge piece at a location in its oriented (EO "good") arrangement
export function orientEdgeMap(
  loc: EdgeLocation,
  piece: [FaceKey, FaceKey],
  orient: Record<FaceKey, FaceKey>,
): Map<FaceKey, FaceKey> {
  const faces = EDGE_LOC_FACES[loc];
  const map = new Map<FaceKey, FaceKey>([[faces[0], piece[0]], [faces[1], piece[1]]]);
  if (isEdgeOriented(faces, map, orient)) return map;
  return new Map<FaceKey, FaceKey>([[faces[0], piece[1]], [faces[1], piece[0]]]);
}

// swaps the two stickers of an edge map, flipping its orientation (good ↔ bad)
export function flipEdgeMap(map: Map<FaceKey, FaceKey>): Map<FaceKey, FaceKey> {
  const [[fa, ia], [fb, ib]] = [...map];
  return new Map<FaceKey, FaceKey>([[fa, ib], [fb, ia]]);
}

// groups a model's facelets by piece, keyed by the sorted set of physical faces
function piecesByFaceSet(model: PaintMap, pieceType: PieceType): Map<string, FaceletPaint[]> {
  const byPiece = new Map<number, FaceletPaint[]>();
  for (const f of model.values()) {
    if (f.pieceType !== pieceType) continue;
    const arr = byPiece.get(f.pieceIndex) ?? [];
    arr.push(f);
    byPiece.set(f.pieceIndex, arr);
  }
  const out = new Map<string, FaceletPaint[]>();
  for (const arr of byPiece.values()) out.set(faceSetKey(arr.map((f) => f.face)), arr);
  return out;
}

const faceSetKey = (faces: FaceKey[]) => [...faces].sort().join(',');

// paints every facelet of a piece a single literal color
function applySolidPiece(
  pieceFaces: FaceKey[],
  color: string,
  index: Map<string, FaceletPaint[]>,
  overrides: Map<FaceletId, string>,
) {
  const facelets = index.get(faceSetKey(pieceFaces));
  if (!facelets) return;
  for (const f of facelets) overrides.set(faceletId(f.pieceType, f.pieceIndex, f.faceletIndex), color);
}

// paints a physical-face→color map onto the piece's (fixed) physical facelets
function applyPiece(
  pieceFaces: FaceKey[],
  faceColorMap: Map<FaceKey, FaceKey>,
  index: Map<string, FaceletPaint[]>,
  overrides: Map<FaceletId, string>,
  faceColor: (face: FaceKey) => string,
) {
  const facelets = index.get(faceSetKey(pieceFaces));
  if (!facelets) return;
  for (const f of facelets) {
    const identity = faceColorMap.get(f.face);
    if (identity) overrides.set(faceletId(f.pieceType, f.pieceIndex, f.faceletIndex), faceColor(identity));
  }
}

function literalColorsToFixed(litColors: Map<FaceKey, FaceKey>, yTurns: number): Map<FaceKey, FaceKey> {
  const fixed = new Map<FaceKey, FaceKey>();
  for (const [litFace, color] of litColors) fixed.set(rotateFaceY(litFace, -yTurns), color);
  return fixed;
}

// builds per-facelet paint overrides for the current f2l pair and cross
export function buildF2lOverrides(
  model: PaintMap,
  cross: FaceKey,
  pair: [FaceKey, FaceKey],
  corner: CornerPlacement | null,
  edge: EdgePlacement | null,
  filledSlots: F2lSlot[],
  highlightedPieces: PieceRef[],
  faceColor: (face: FaceKey) => string,
  yTurns: number,
  // Full EO step overlay: free edges painted solid (eoColor = good, grey = bad)
  eoOverlay?: { good: EdgeLocation[]; bad: EdgeLocation[]; eoColor: string },
): Map<FaceletId, string> {
  const overrides = new Map<FaceletId, string>();
  const cornersIndex = piecesByFaceSet(model, 'CORNERS');
  const edgesIndex = piecesByFaceSet(model, 'EDGES');
  const orient = orientationFor(cross, yTurns);
  const baseOrient = ORIENTATIONS[cross];

  // tint the step's click-hint pieces first, so filled/active pieces paint over them
  for (const piece of highlightedPieces) {
    const faces = piece.pieceType === 'CORNERS'
      ? CORNER_LOC_FACES[rotateCornerLocY(piece.loc, -yTurns)]
      : EDGE_LOC_FACES[rotateEdgeLocY(piece.loc, -yTurns)];
    const index = piece.pieceType === 'CORNERS' ? cornersIndex : edgesIndex;
    applySolidPiece(faces, HINT_MASK_COLOR, index, overrides);
  }

  // solved context pairs next, so an active piece sharing a slot paints over them
  for (const slot of filledSlots) {
    const cLoc = rotateCornerLocY(F2L_SLOT_PIECES[slot].corner, -yTurns);
    const eLoc = rotateEdgeLocY(F2L_SLOT_PIECES[slot].edge, -yTurns);
    applyPiece(CORNER_LOC_FACES[cLoc], solvedColors(CORNER_LOC_FACES[cLoc], baseOrient), cornersIndex, overrides, faceColor);
    applyPiece(EDGE_LOC_FACES[eLoc], solvedColors(EDGE_LOC_FACES[eLoc], baseOrient), edgesIndex, overrides, faceColor);
  }

  if (corner) {
    const cLoc = rotateCornerLocY(corner.loc, -yTurns);
    const colors = literalColorsToFixed(cornerFaceColors(corner.loc, corner.orientation, cross, pair), yTurns);
    applyPiece(CORNER_LOC_FACES[cLoc], colors, cornersIndex, overrides, faceColor);
  }
  if (edge) {
    const eLoc = rotateEdgeLocY(edge.loc, -yTurns);
    const colors = literalColorsToFixed(edgeFaceColors(edge.loc, edge.orientation, orient, pair), yTurns);
    applyPiece(EDGE_LOC_FACES[eLoc], colors, edgesIndex, overrides, faceColor);
  }

  // the Full EO step recolors the free edges to show good/bad rather than their real stickers
  if (eoOverlay) {
    for (const loc of eoOverlay.good) applySolidPiece(EDGE_LOC_FACES[rotateEdgeLocY(loc, -yTurns)], eoOverlay.eoColor, edgesIndex, overrides);
    for (const loc of eoOverlay.bad) applySolidPiece(EDGE_LOC_FACES[rotateEdgeLocY(loc, -yTurns)], HINT_MASK_COLOR, edgesIndex, overrides);
  }
  return overrides;
}

// which cube-fixed location a clicked facelet belongs to. returns null for centers
// and for edges in the cross locations.
export function physicalLocOfFacelet(
  model: PaintMap,
  facelet: FaceletPaint,
): PieceRef | null {
  if (facelet.pieceType === 'CENTERS') return null;
  const faces = [...model.values()]
    .filter((f) => f.pieceType === facelet.pieceType && f.pieceIndex === facelet.pieceIndex)
    .map((f) => f.face);
  const key = faceSetKey(faces);
  if (facelet.pieceType === 'CORNERS') {
    const entry = (Object.entries(CORNER_LOC_FACES) as [CornerLocation, FaceKey[]][]).find(
      ([, fs]) => faceSetKey(fs) === key,
    );
    return entry ? { pieceType: 'CORNERS', loc: entry[0] } : null;
  }
  const entry = (Object.entries(EDGE_LOC_FACES) as [EdgeLocation, FaceKey[]][]).find(
    ([, fs]) => faceSetKey(fs) === key,
  );
  return entry ? { pieceType: 'EDGES', loc: entry[0] } : null;
}

// finds which (literal) slot the f2l pair needs to get solved into
export function f2lPairHomeSlot(cross: FaceKey, pair: [FaceKey, FaceKey], yTurns = 0): F2lSlot | null {
  const want = new Set<FaceKey>(pair);
  const entries = Object.entries(F2L_SLOT_PIECES) as [F2lSlot, { corner: CornerLocation; edge: EdgeLocation }][];
  const match = entries.find(([, p]) => {
    const sides = EDGE_LOC_FACES[p.edge].map((f) => ORIENTATIONS[cross][f]);
    return sides.every((c) => want.has(c));
  });
  return match ? rotateSlotY(match[0], yTurns) : null;
}

// finds which f2l slot a clicked piece belongs to
export function f2lSlotOf(click: PieceRef): F2lSlot | null {
  const entries = Object.entries(F2L_SLOT_PIECES) as [F2lSlot, { corner: CornerLocation; edge: EdgeLocation }][];
  const match = entries.find(([, p]) =>
    click.pieceType === 'CORNERS' ? p.corner === click.loc : p.edge === click.loc,
  );
  return match ? match[0] : null;
}