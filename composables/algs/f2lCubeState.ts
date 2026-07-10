// Builds an approximate SimpleCubeState for an F2L case so the SimpleCubeInterpreter
// can be queried for suggestions. Only the pieces the config pins down (centers, the
// cross, the placed F2L pair, and solved slots) are meaningful; every other piece is
// filled in with a valid leftover so the interpreter sees a legal cube. Parity and the
// exact placement of those leftovers don't matter — the F2L queries only constrain the
// cross, the solved pairs, and the target pair.

import type { CubeState as SimpleCubeState, Color } from '../recon/SimpleCube';
import {
  orientationFor,
  F2L_SLOT_PIECES,
  cornerFaceColors,
  edgeFaceColors,
  orientEdgeMap,
  flipEdgeMap,
  type FaceKey,
  type CornerLocation,
  type EdgeLocation,
} from './cubePaint';
import type { F2lCaseConfig } from '../../components/algs/f2lSetup';

const FACE_KEYS: FaceKey[] = ['up', 'down', 'front', 'right', 'back', 'left'];

// color identity → cube sticker color (SimpleCube's fixed scheme)
const COLOR_OF: Record<FaceKey, Color> = {
  up: 'W', down: 'Y', front: 'G', right: 'R', back: 'B', left: 'O',
};

const OPPOSITE: Record<FaceKey, FaceKey> = {
  up: 'down', down: 'up', front: 'back', back: 'front', right: 'left', left: 'right',
};

// SimpleCubeState facelet coordinates [faceIndex, row, col] keyed per physical face.
// face indices: 0=up, 1=down, 2=front, 3=right, 4=back, 5=left.
type Coord = [number, number, number];

const EDGE_FACELETS: Record<string, Partial<Record<FaceKey, Coord>>> = {
  UF: { up: [0, 2, 1], front: [2, 0, 1] },
  UR: { up: [0, 1, 2], right: [3, 0, 1] },
  UB: { up: [0, 0, 1], back: [4, 0, 1] },
  UL: { up: [0, 1, 0], left: [5, 0, 1] },
  DF: { down: [1, 0, 1], front: [2, 2, 1] },
  DR: { down: [1, 1, 2], right: [3, 2, 1] },
  DB: { down: [1, 2, 1], back: [4, 2, 1] },
  DL: { down: [1, 1, 0], left: [5, 2, 1] },
  FR: { front: [2, 1, 2], right: [3, 1, 0] },
  FL: { front: [2, 1, 0], left: [5, 1, 2] },
  BR: { back: [4, 1, 0], right: [3, 1, 2] },
  BL: { back: [4, 1, 2], left: [5, 1, 0] },
};

const CORNER_FACELETS: Record<CornerLocation, Partial<Record<FaceKey, Coord>>> = {
  UFR: { up: [0, 2, 2], front: [2, 0, 2], right: [3, 0, 0] },
  UBR: { up: [0, 0, 2], back: [4, 0, 0], right: [3, 0, 2] },
  UBL: { up: [0, 0, 0], back: [4, 0, 2], left: [5, 0, 0] },
  UFL: { up: [0, 2, 0], front: [2, 0, 0], left: [5, 0, 2] },
  DFR: { down: [1, 0, 2], front: [2, 2, 2], right: [3, 2, 0] },
  DFL: { down: [1, 0, 0], front: [2, 2, 0], left: [5, 2, 2] },
  DBL: { down: [1, 2, 0], back: [4, 2, 2], left: [5, 2, 0] },
  DBR: { down: [1, 2, 2], back: [4, 2, 0], right: [3, 2, 2] },
};

const CENTER_FACELETS: Record<FaceKey, Coord> = {
  up: [0, 1, 1], down: [1, 1, 1], front: [2, 1, 1], right: [3, 1, 1], back: [4, 1, 1], left: [5, 1, 1],
};

const CROSS_EDGE_LOCS = ['DF', 'DR', 'DB', 'DL'];
const TOP_EDGE_LOCS = ['UF', 'UR', 'UB', 'UL'];
const MIDDLE_EDGE_LOCS = ['FR', 'BR', 'BL', 'FL'];
const ALL_CORNER_LOCS = Object.keys(CORNER_FACELETS) as CornerLocation[];

// the 12 real edges / 8 real corners as identity color-sets
const EDGE_PIECES: FaceKey[][] = [
  ['up', 'front'], ['up', 'right'], ['up', 'back'], ['up', 'left'],
  ['down', 'front'], ['down', 'right'], ['down', 'back'], ['down', 'left'],
  ['front', 'right'], ['front', 'left'], ['back', 'right'], ['back', 'left'],
];
const CORNER_PIECES: FaceKey[][] = [
  ['up', 'front', 'right'], ['up', 'back', 'right'], ['up', 'back', 'left'], ['up', 'front', 'left'],
  ['down', 'front', 'right'], ['down', 'front', 'left'], ['down', 'back', 'left'], ['down', 'back', 'right'],
];

const setKey = (ids: FaceKey[]) => [...ids].sort().join(',');

const solvedTemplate = (): SimpleCubeState =>
  FACE_KEYS.map((f) => {
    const c = COLOR_OF[f];
    return [[c, c, c], [c, c, c], [c, c, c]];
  }) as SimpleCubeState;

/**
 * Builds a valid SimpleCubeState representing the given F2L case. The cross sits on the
 * bottom (reoriented per `cross`), the placed pair and any solved slots are painted from
 * their real colors, and the rest is filled with leftover pieces.
 */
export function buildF2lCubeState(
  config: F2lCaseConfig,
  cross: FaceKey,
  pair: [FaceKey, FaceKey],
): SimpleCubeState {
  const state = solvedTemplate();
  const orient = orientationFor(cross, config.yTurns);

  const usedEdges = new Set<string>();
  const usedCorners = new Set<string>();
  const placedEdgeLocs = new Set<string>();
  const placedCornerLocs = new Set<string>();

  const paint = (coord: Coord | undefined, id: FaceKey) => {
    if (!coord) return;
    state[coord[0]][coord[1]][coord[2]] = COLOR_OF[id];
  };

  // paints a piece at a location given a physical-face → identity map, recording the piece used
  const placeEdge = (loc: string, faceToId: Map<FaceKey, FaceKey>) => {
    const facelets = EDGE_FACELETS[loc];
    const ids: FaceKey[] = [];
    for (const f of Object.keys(facelets) as FaceKey[]) {
      const id = faceToId.get(f)!;
      paint(facelets[f], id);
      ids.push(id);
    }
    usedEdges.add(setKey(ids));
    placedEdgeLocs.add(loc);
  };

  const placeCorner = (loc: CornerLocation, faceToId: Map<FaceKey, FaceKey>) => {
    const facelets = CORNER_FACELETS[loc];
    const ids: FaceKey[] = [];
    for (const f of Object.keys(facelets) as FaceKey[]) {
      const id = faceToId.get(f)!;
      paint(facelets[f], id);
      ids.push(id);
    }
    usedCorners.add(setKey(ids));
    placedCornerLocs.add(loc);
  };

  // a solved piece shows each physical face's reoriented identity
  const solvedMap = (loc: string, facelets: Partial<Record<FaceKey, Coord>>): Map<FaceKey, FaceKey> => {
    const map = new Map<FaceKey, FaceKey>();
    for (const f of Object.keys(facelets) as FaceKey[]) map.set(f, orient[f]);
    return map;
  };

  // centers
  for (const f of FACE_KEYS) paint(CENTER_FACELETS[f], orient[f]);

  // cross (the four bottom edges), solved
  for (const loc of CROSS_EDGE_LOCS) placeEdge(loc, solvedMap(loc, EDGE_FACELETS[loc]));

  // solved context slots
  for (const slot of config.filledSlots) {
    const { corner: cLoc, edge: eLoc } = F2L_SLOT_PIECES[slot];
    placeCorner(cLoc, solvedMap(cLoc, CORNER_FACELETS[cLoc]));
    placeEdge(eLoc, solvedMap(eLoc, EDGE_FACELETS[eLoc]));
  }

  // the placed F2L pair (reuse cubePaint's orientation logic for exact colors)
  if (config.corner) placeCorner(config.corner.loc, cornerFaceColors(config.corner.loc, config.corner.orientation, cross, pair));
  if (config.edge) placeEdge(config.edge.loc, edgeFaceColors(config.edge.loc, config.edge.orientation, orient, pair));

  // fill leftover edges: the four edges carrying the top color go into the remaining
  // top-then-middle locations, then any remaining edges fill whatever is left.
  const topColor = OPPOSITE[cross];
  const leftoverEdges = EDGE_PIECES.filter((p) => !usedEdges.has(setKey(p)));
  const topEdges = leftoverEdges.filter((p) => p.includes(topColor));
  const otherEdges = leftoverEdges.filter((p) => !p.includes(topColor));
  const orderedEdges = [...topEdges, ...otherEdges];
  const openEdgeLocs = [...TOP_EDGE_LOCS, ...MIDDLE_EDGE_LOCS].filter((l) => !placedEdgeLocs.has(l));

  // the open edge locations are exactly the Full EO free edges. When Full EO is engaged, place
  // each leftover edge oriented (good) and flip the ones the user marked bad, so getEOvalue reads
  // the user's chosen EO; otherwise orientation is irrelevant, so any valid arrangement will do.
  const badEdges = config.fullEO;
  orderedEdges.forEach((piece, i) => {
    const loc = openEdgeLocs[i] as EdgeLocation | undefined;
    if (!loc) return;
    if (badEdges) {
      let map = orientEdgeMap(loc, piece as [FaceKey, FaceKey], orient);
      if (badEdges.includes(loc)) map = flipEdgeMap(map);
      placeEdge(loc, map);
    } else {
      placeEdge(loc, assignByFaceOrder(EDGE_FACELETS[loc], piece));
    }
  });

  // fill leftover corners into open corner locations in any valid orientation
  const leftoverCorners = CORNER_PIECES.filter((p) => !usedCorners.has(setKey(p)));
  const openCornerLocs = ALL_CORNER_LOCS.filter((l) => !placedCornerLocs.has(l));
  leftoverCorners.forEach((piece, i) => {
    const loc = openCornerLocs[i];
    if (!loc) return;
    placeCorner(loc, assignByFaceOrder(CORNER_FACELETS[loc], piece));
  });

  return state;
}

// maps a location's physical faces to a piece's identities in order — an arbitrary but
// valid sticker arrangement, which is all the interpreter needs for a leftover piece.
function assignByFaceOrder(
  facelets: Partial<Record<FaceKey, Coord>>,
  piece: FaceKey[],
): Map<FaceKey, FaceKey> {
  const faces = Object.keys(facelets) as FaceKey[];
  const map = new Map<FaceKey, FaceKey>();
  faces.forEach((f, i) => map.set(f, piece[i]));
  return map;
}
