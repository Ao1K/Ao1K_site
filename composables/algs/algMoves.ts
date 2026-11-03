import { SimpleCube, type Color } from '../recon/SimpleCube';
import { cube3x3, GEOMETRY_3X3, type FaceLayer3x3, type Layer3x3, type Move3x3 } from '../../utils/parser/cube3x3';

const FACE_AT_STATE_INDEX: FaceLayer3x3[] = ['U', 'D', 'F', 'R', 'B', 'L'];

const STARTING_TOP_CENTER: Color = 'W';

const centerTracker = new SimpleCube();

const startingTopFaceAfter = (moves: Move3x3[]): FaceLayer3x3 => {
  const movesCenters = moves.some((move) => cube3x3.geometry(move).layers.includes(0));
  if (!movesCenters) return 'U';
  return FACE_AT_STATE_INDEX[centerTracker.getCubeState(moves).findIndex((face) => face[1][1] === STARTING_TOP_CENTER)];
};

const isStartingTopAuf = (move: Move3x3, startingTopFace: FaceLayer3x3): boolean => {
  const top = GEOMETRY_3X3[startingTopFace];
  const { axis, layers } = cube3x3.geometry(move);
  if (axis !== top.axis) return false;
  const [topLayer] = top.layers;
  const turnsOnlyTop = layers.length === 1 && layers[0] === topLayer;
  const turnsAllButTop = layers.length === 2 && !layers.includes(topLayer);
  return turnsOnlyTop || turnsAllButTop;
};

export const stripTrailingAuf = (moves: readonly Move3x3[]): Move3x3[] => {
  const kept = [...moves];

  // the first move is always kept so AUF-only algs like U2 keep distinct keys
  while (kept.length > 1) {
    const lastMove = kept.pop()!;
    const startingTopFace = startingTopFaceAfter(kept);
    if (!cube3x3.isRotation(lastMove) && !isStartingTopAuf(lastMove, startingTopFace)) {
      kept.push(lastMove);
      break;
    }
  }
  return kept;
};

export const aufFreeAlg = (moves: readonly Move3x3[]): Move3x3[] => {
  const halfTurnsUnprimed = moves.map((move) => (cube3x3.turns(move) === 2 ? cube3x3.make(cube3x3.layer(move), 2) : move));
  const aufIndex = halfTurnsUnprimed[0] !== undefined && cube3x3.layer(halfTurnsUnprimed[0]) === 'y' ? 1 : 0;
  const auf = halfTurnsUnprimed[aufIndex];
  const hasLeadingAuf = auf !== undefined && cube3x3.layer(auf) === 'U';
  const core = hasLeadingAuf ? halfTurnsUnprimed.filter((_, i) => i !== aufIndex) : halfTurnsUnprimed;
  return stripTrailingAuf(core.length > 0 ? core : halfTurnsUnprimed);
};

const aufFreeKeyCache = new WeakMap<readonly Move3x3[], string>();

export const aufFreeKey = (moves: readonly Move3x3[]): string => {
  const cached = aufFreeKeyCache.get(moves);
  if (cached !== undefined) return cached;
  const key = cube3x3.format(aufFreeAlg(moves));
  aufFreeKeyCache.set(moves, key);
  return key;
};

const LL_SETUP_LAYERS: ReadonlySet<Layer3x3> = new Set<Layer3x3>(['U', 'y']);

const llAlgKeyCache = new WeakMap<readonly Move3x3[], string>();

export const llAlgKey = (moves: readonly Move3x3[]): string => {
  const cached = llAlgKeyCache.get(moves);
  if (cached !== undefined) return cached;

  let setupLength = 0;
  while (setupLength < moves.length - 1 && LL_SETUP_LAYERS.has(cube3x3.layer(moves[setupLength]))) {
    setupLength++;
  }

  const key = cube3x3.format(aufFreeAlg(moves.slice(setupLength)));
  llAlgKeyCache.set(moves, key);
  return key;
};

export const addPostAuf =(moves: readonly Move3x3[], auf: readonly Move3x3[]): Move3x3[] => {
  const kept = [...moves];
  while (kept.length > 0 && cube3x3.isRotation(kept[kept.length - 1])) kept.pop();
  if (auf.length === 0) return kept;
  const startingTopFace = startingTopFaceAfter(kept);
  return [...kept, ...auf.map((move) => cube3x3.make(startingTopFace, cube3x3.amount(move)))];
};
