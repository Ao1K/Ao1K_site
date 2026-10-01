import { applyMoves, faceOfSticker, FACELET_COUNT, getMovePermutation, solvedFacelets } from './faceletCube';
import type { Facelets } from './faceletCube';
import { FACE_COLOR_NAMES } from './cubeHashState';
import type { ColorName } from './cubeHashState';

export interface PairDisturbance {
  pairColors: [ColorName, ColorName];
  count: number;
}

export interface CrossSolution {
  moves: string[];
  pairDisturbances: PairDisturbance[];
}

export interface CrossSearchOptions {
  maxSolutions?: number;
  extraDepth?: number;
}

const SEARCH_FACES = ['U', 'D', 'F', 'B', 'L', 'R'] as const;
const SEARCH_SUFFIXES = ['', '2', "'"] as const;
const SEARCH_MOVES = SEARCH_FACES.flatMap(face => SEARCH_SUFFIXES.map(suffix => `${face}${suffix}`));
const MOVE_COUNT = SEARCH_MOVES.length;

const EDGE_FACELET_PAIRS: readonly [number, number][] = [
  [7, 19], [5, 28], [1, 37], [3, 46],
  [10, 25], [14, 34], [16, 43], [12, 52],
  [23, 30], [21, 50], [39, 32], [41, 48],
];
const D_CENTER_FACELET = 13;
const D_EDGE_HOME_FACELETS = [10, 14, 16, 12] as const;
// order is DFR, DFL, DBL, DBR to match F2L_SLOTS.yellow. pairDisturbances uses this order.
const F2L_PAIR_SIDE_CENTER_FACELETS: readonly [number, number][] = [
  [31, 22], [22, 49], [49, 40], [40, 31],
];

const EDGE_POSITION_COUNT = 24;
const EDGE_COUPLE_COUNT = EDGE_POSITION_COUNT * EDGE_POSITION_COUNT;
const CROSS_STATE_COUNT = EDGE_COUPLE_COUNT * EDGE_COUPLE_COUNT;
const UNVISITED = 255;

const CORNER_POSITION_COUNT = 24;
const PAIR_STATE_COUNT = CORNER_POSITION_COUNT * EDGE_POSITION_COUNT;
const DISTURBANCE_SHIFT = 10;
const PAIR_STATE_MASK = (1 << DISTURBANCE_SHIFT) - 1;

const FRAME_SIZE = 6;
const FIRST_COUPLE_INDEX = 0;
const SECOND_COUPLE_INDEX = 1;
const FIRST_PAIR_INDEX = 2;

const allFacelets = Array.from({ length: FACELET_COUNT }, (_, facelet) => facelet);
const centerFaceletOf = (facelet: number) => faceOfSticker(facelet) * 9 + 4;

const edgePositionFacelets: number[] = EDGE_FACELET_PAIRS.flat();
const partnerFacelet = new Map<number, number>(
  EDGE_FACELET_PAIRS.flatMap(([a, b]): [number, number][] => [[a, b], [b, a]])
);
const positionOfFacelet = new Map<number, number>(edgePositionFacelets.map((facelet, position) => [facelet, position]));
const crossHomePositions = D_EDGE_HOME_FACELETS.map(facelet => positionOfFacelet.get(facelet)!);

const turnedFacesKey = (facelet: number) =>
  SEARCH_FACES.filter(face => getMovePermutation(face)[facelet] !== facelet).join('');
const cornerPositionFacelets = allFacelets.filter(facelet =>
  facelet !== centerFaceletOf(facelet) && !positionOfFacelet.has(facelet)
);
const cornerPositionOfFacelet = new Map<number, number>(cornerPositionFacelets.map((facelet, position) => [facelet, position]));
const cornerMatesOf = new Map<number, number[]>(cornerPositionFacelets.map(facelet => [
  facelet,
  cornerPositionFacelets.filter(other => other !== facelet && turnedFacesKey(other) === turnedFacesKey(facelet)),
]));

function buildFaceletDestinationTable(): Uint8Array {
  const table = new Uint8Array(MOVE_COUNT * FACELET_COUNT);
  SEARCH_MOVES.forEach((move, moveIndex) => {
    getMovePermutation(move).forEach((sourceFacelet, destinationFacelet) => {
      table[moveIndex * FACELET_COUNT + sourceFacelet] = destinationFacelet;
    });
  });
  return table;
}

const faceletDestinationTable = buildFaceletDestinationTable();
const destinationOf = (move: number, facelet: number) => faceletDestinationTable[move * FACELET_COUNT + facelet];

function buildEdgeMoveTable(): Uint8Array {
  const table = new Uint8Array(MOVE_COUNT * EDGE_POSITION_COUNT);
  for (let move = 0; move < MOVE_COUNT; move++) {
    edgePositionFacelets.forEach((facelet, position) => {
      table[move * EDGE_POSITION_COUNT + position] = positionOfFacelet.get(destinationOf(move, facelet))!;
    });
  }
  return table;
}

const encodePairState = (cornerPosition: number, edgePosition: number) => cornerPosition * EDGE_POSITION_COUNT + edgePosition;

function buildPairStateMoveTable(): Uint16Array {
  const table = new Uint16Array(MOVE_COUNT * PAIR_STATE_COUNT);
  for (let move = 0; move < MOVE_COUNT; move++) {
    cornerPositionFacelets.forEach((cornerFacelet, cornerPosition) => {
      edgePositionFacelets.forEach((edgeFacelet, edgePosition) => {
        const nextCornerFacelet = destinationOf(move, cornerFacelet);
        const nextEdgeFacelet = destinationOf(move, edgeFacelet);
        const disturbance = Number(nextCornerFacelet !== cornerFacelet) + Number(nextEdgeFacelet !== edgeFacelet);
        const nextPairState = encodePairState(
          cornerPositionOfFacelet.get(nextCornerFacelet)!,
          positionOfFacelet.get(nextEdgeFacelet)!,
        );
        table[move * PAIR_STATE_COUNT + encodePairState(cornerPosition, edgePosition)] =
          nextPairState | (disturbance << DISTURBANCE_SHIFT);
      });
    });
  }
  return table;
}

const pairStateMoveTable = buildPairStateMoveTable();

const advanceTrackedPair = (trackedPair: number, pairStateOffset: number) =>
  pairStateMoveTable[pairStateOffset + (trackedPair & PAIR_STATE_MASK)] + (trackedPair & ~PAIR_STATE_MASK);

const encodeEdgeCouple = (first: number, second: number) => first * EDGE_POSITION_COUNT + second;
const encodeCross = (firstCouple: number, secondCouple: number) => firstCouple * EDGE_COUPLE_COUNT + secondCouple;

function buildEdgeCoupleMoveTable(): Uint16Array {
  const edgeMoveTable = buildEdgeMoveTable();
  const table = new Uint16Array(MOVE_COUNT * EDGE_COUPLE_COUNT);
  for (let move = 0; move < MOVE_COUNT; move++) {
    const edgeOffset = move * EDGE_POSITION_COUNT;
    for (let first = 0; first < EDGE_POSITION_COUNT; first++) {
      for (let second = 0; second < EDGE_POSITION_COUNT; second++) {
        table[move * EDGE_COUPLE_COUNT + encodeEdgeCouple(first, second)] = encodeEdgeCouple(
          edgeMoveTable[edgeOffset + first],
          edgeMoveTable[edgeOffset + second],
        );
      }
    }
  }
  return table;
}

const edgeCoupleMoveTable = buildEdgeCoupleMoveTable();
let crossDistanceTable: Uint8Array | null = null;

function getCrossDistanceTable(): Uint8Array {
  if (crossDistanceTable) return crossDistanceTable;

  const distances = new Uint8Array(CROSS_STATE_COUNT).fill(UNVISITED);
  const reachableStateCount = 24 * 22 * 20 * 18;
  const queue = new Uint32Array(reachableStateCount);
  const [h0, h1, h2, h3] = crossHomePositions;
  const solvedIndex = encodeCross(encodeEdgeCouple(h0, h1), encodeEdgeCouple(h2, h3));
  distances[solvedIndex] = 0;
  queue[0] = solvedIndex;
  let head = 0;
  let tail = 1;

  while (head < tail) {
    const index = queue[head++];
    const nextDistance = distances[index] + 1;
    const firstCouple = (index / EDGE_COUPLE_COUNT) | 0;
    const secondCouple = index % EDGE_COUPLE_COUNT;

    for (let move = 0; move < MOVE_COUNT; move++) {
      const offset = move * EDGE_COUPLE_COUNT;
      const next = encodeCross(edgeCoupleMoveTable[offset + firstCouple], edgeCoupleMoveTable[offset + secondCouple]);
      if (distances[next] !== UNVISITED) continue;
      distances[next] = nextDistance;
      queue[tail++] = next;
    }
  }

  crossDistanceTable = distances;
  return distances;
}

function findCrossEdgePositions(facelets: Facelets): number[] {
  const crossColor = faceOfSticker(facelets[D_CENTER_FACELET]);

  return D_EDGE_HOME_FACELETS.map(homeFacelet => {
    const sideColor = faceOfSticker(facelets[centerFaceletOf(partnerFacelet.get(homeFacelet)!)]);
    const position = edgePositionFacelets.findIndex(facelet =>
      faceOfSticker(facelets[facelet]) === crossColor &&
      faceOfSticker(facelets[partnerFacelet.get(facelet)!]) === sideColor
    );
    if (position === -1) throw new Error('cross edge not found');
    return position;
  });
}

interface TrackedF2LPair {
  pairColors: [ColorName, ColorName];
  startState: number;
}

function findF2LPairs(facelets: Facelets): TrackedF2LPair[] {
  const colorAt = (facelet: number) => faceOfSticker(facelets[facelet]);
  const crossColor = colorAt(D_CENTER_FACELET);

  return F2L_PAIR_SIDE_CENTER_FACELETS.map(([firstCenterFacelet, secondCenterFacelet]) => {
    const firstSideColor = colorAt(firstCenterFacelet);
    const secondSideColor = colorAt(secondCenterFacelet);
    const sideColors = [firstSideColor, secondSideColor];

    const edgePosition = edgePositionFacelets.findIndex(facelet =>
      colorAt(facelet) === firstSideColor && colorAt(partnerFacelet.get(facelet)!) === secondSideColor
    );
    const cornerPosition = cornerPositionFacelets.findIndex(facelet =>
      colorAt(facelet) === crossColor && cornerMatesOf.get(facelet)!.every(mate => sideColors.includes(colorAt(mate)))
    );
    if (edgePosition === -1 || cornerPosition === -1) throw new Error('f2l pair not found');
    return {
      pairColors: [FACE_COLOR_NAMES[firstSideColor], FACE_COLOR_NAMES[secondSideColor]],
      startState: encodePairState(cornerPosition, edgePosition),
    };
  });
}

const readPairDisturbances = (pairs: TrackedF2LPair[], frames: Uint16Array, frame: number): PairDisturbance[] => [
  { pairColors: pairs[0].pairColors, count: frames[frame + FIRST_PAIR_INDEX] >> DISTURBANCE_SHIFT },
  { pairColors: pairs[1].pairColors, count: frames[frame + FIRST_PAIR_INDEX + 1] >> DISTURBANCE_SHIFT },
  { pairColors: pairs[2].pairColors, count: frames[frame + FIRST_PAIR_INDEX + 2] >> DISTURBANCE_SHIFT },
  { pairColors: pairs[3].pairColors, count: frames[frame + FIRST_PAIR_INDEX + 3] >> DISTURBANCE_SHIFT },
];

const axisOf = (move: number) => (move / 6) | 0;
const faceOf = (move: number) => (move / 3) | 0;

function isRedundantAfter(move: number, previousMove: number): boolean {
  if (previousMove < 0) return false;
  const face = faceOf(move);
  const previousFace = faceOf(previousMove);
  if (face === previousFace) return true;
  return axisOf(move) === axisOf(previousMove) && face < previousFace;
}

export function findCrossSolutions(facelets: Facelets, options: CrossSearchOptions = {}): CrossSolution[] {
  const { maxSolutions = 20, extraDepth = 1 } = options;
  const distances = getCrossDistanceTable();
  const [p0, p1, p2, p3] = findCrossEdgePositions(facelets);
  const startFirstCouple = encodeEdgeCouple(p0, p1);
  const startSecondCouple = encodeEdgeCouple(p2, p3);
  const optimalLength = distances[encodeCross(startFirstCouple, startSecondCouple)];
  const pairs = findF2LPairs(facelets);
  if (optimalLength === 0) return [{ moves: [], pairDisturbances: pairs.map(({ pairColors }) => ({ pairColors, count: 0 })) }];

  const solutions: CrossSolution[] = [];
  const path: number[] = [];
  const frames = new Uint16Array((optimalLength + extraDepth + 1) * FRAME_SIZE);
  frames[FIRST_COUPLE_INDEX] = startFirstCouple;
  frames[SECOND_COUPLE_INDEX] = startSecondCouple;
  frames.set(pairs.map(({ startState }) => startState), FIRST_PAIR_INDEX);

  const search = (depth: number, maxDepth: number, previousMove: number) => {
    const frame = depth * FRAME_SIZE;
    const nextFrame = frame + FRAME_SIZE;
    const firstCouple = frames[frame + FIRST_COUPLE_INDEX];
    const secondCouple = frames[frame + SECOND_COUPLE_INDEX];

    for (let move = 0; move < MOVE_COUNT; move++) {
      if (solutions.length >= maxSolutions) return;
      if (isRedundantAfter(move, previousMove)) continue;
      const offset = move * EDGE_COUPLE_COUNT;
      const nextFirstCouple = edgeCoupleMoveTable[offset + firstCouple];
      const nextSecondCouple = edgeCoupleMoveTable[offset + secondCouple];
      if (nextFirstCouple === firstCouple && nextSecondCouple === secondCouple) continue;

      const remaining = distances[encodeCross(nextFirstCouple, nextSecondCouple)];
      const nextDepth = depth + 1;
      if (nextDepth + remaining > maxDepth) continue;

      frames[nextFrame + FIRST_COUPLE_INDEX] = nextFirstCouple;
      frames[nextFrame + SECOND_COUPLE_INDEX] = nextSecondCouple;
      const pairStateOffset = move * PAIR_STATE_COUNT;
      for (let pairIndex = FIRST_PAIR_INDEX; pairIndex < FRAME_SIZE; pairIndex++) {
        frames[nextFrame + pairIndex] = advanceTrackedPair(frames[frame + pairIndex], pairStateOffset);
      }

      path.push(move);
      if (nextDepth === maxDepth) {
        solutions.push({
          moves: path.map(index => SEARCH_MOVES[index]),
          pairDisturbances: readPairDisturbances(pairs, frames, nextFrame),
        });
      } else if (remaining > 0) {
        search(nextDepth, maxDepth, move);
      }
      path.pop();
    }
  };

  for (let maxDepth = optimalLength; maxDepth <= optimalLength + extraDepth; maxDepth++) {
    if (solutions.length >= maxSolutions) break;
    search(0, maxDepth, -1);
  }

  return solutions;
}

export function findCrossSolutionsForMoves(moves: readonly string[], options?: CrossSearchOptions): CrossSolution[] {
  return findCrossSolutions(applyMoves(solvedFacelets(), moves), options);
}
