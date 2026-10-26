// Move-string helpers for the algs page.
//
// A move token is a single base letter plus an optional suffix:
//   base   ∈ U D F B L R (faces), u d f b l r (wide), M E S (slices), x y z (rotations)
//   suffix ∈ an optional turn count (default 1) with an optional "'" for counterclockwise, e.g. '' "'" '2' "2'" '3' "3'"
// We treat a token as (letter, amount) where amount is signed quarter-turns: positive is
// clockwise, negative counterclockwise. ±2 are both half turns but spin opposite directions.

import { SimpleCube, type Color } from '../recon/SimpleCube';

export const tokenize = (alg: string): string[] => alg.split(/\s+/).filter(Boolean);

const MOVE_RE = /^[UDFBLRudfblrMESxyz][23]?'?$/;

export const isMoveSequence = (alg: string): boolean => {
  const tokens = tokenize(alg);
  return tokens.length > 0 && tokens.every((token) => MOVE_RE.test(token));
};

const invertToken = (token: string): string => {
  const primed = token.endsWith("'");
  const withoutPrime = primed ? token.slice(0, -1) : token;
  const isHalfTurn = withoutPrime.endsWith('2');
  if (isHalfTurn) return withoutPrime;
  return primed ? withoutPrime : `${withoutPrime}'`;
};

export const invertTokens = (tokens: string[]): string[] => tokens.slice().reverse().map(invertToken);

const amountOf = (suffix: string): number => {
  const magnitude = parseInt(suffix, 10) || 1;
  return suffix.includes("'") ? -magnitude : magnitude;
};

const suffixOf = (amount: number): string => {
  const a = ((amount % 4) + 4) % 4;
  if (a === 1) return '';
  if (a === 3) return "'";
  if (a === 2) return amount < 0 ? "2'" : '2'; // preserve the half turn's spin direction
  return ''; // a === 0 is a no-op; never produced by a single quarter relabel of a real move
};

// effect of one `y` cube rotation on a move's base letter, as [newLetter, addedAmount].
// derived as ground truth from cubing.js (y · move · y'): faces cycle F→R→B→L,
// wides f→r→b→l, slices M→S and S→M' (the addedAmount of -1 supplies the prime).
const Y_QUARTER: Record<string, [string, number]> = {
  U: ['U', 1], D: ['D', 1], E: ['E', 1], u: ['u', 1], d: ['d', 1],
  x: ['x', 1], y: ['y', 1], z: ['z', 1],
  F: ['R', 1], R: ['B', 1], B: ['L', 1], L: ['F', 1],
  f: ['r', 1], r: ['b', 1], b: ['l', 1], l: ['f', 1],
  M: ['S', 1], S: ['M', -1],
};

// relabels a single token by one `y` quarter turn
const rotateTokenByYQuarter = (token: string): string => {
  const base = token[0];
  const mapped = Y_QUARTER[base];
  if (!mapped) return token;
  const [letter, addedAmount] = mapped;
  // y · (base^a) · y' = (y · base · y')^a = (letter^addedAmount)^a
  const amount = amountOf(token.slice(1)) * addedAmount;
  return letter + suffixOf(amount);
};

type Face = 'U' | 'D' | 'F' | 'R' | 'B' | 'L';

const FACE_AT_STATE_INDEX: Face[] = ['U', 'D', 'F', 'R', 'B', 'L'];

const OPPOSITE_FACE: Record<Face, Face> = { U: 'D', D: 'U', F: 'B', B: 'F', L: 'R', R: 'L' };

const STARTING_TOP_CENTER: Color = 'W';

const centerTracker = new SimpleCube();

const movesCenters = (token: string): boolean => /^[xyzudfblrMES]|w/.test(token);

const startingTopFaceAfter = (tokens: string[]): Face => {
  if (!tokens.some(movesCenters)) return 'U';
  return FACE_AT_STATE_INDEX[centerTracker.getCubeState(tokens).findIndex((face) => face[1][1] === STARTING_TOP_CENTER)];
};

const isRotation = (token: string): boolean => /^[xyz]/.test(token);

const isFace = (letter: string): letter is Face => letter in OPPOSITE_FACE;

const isStartingTopAuf = (token: string, startingTopFace: Face): boolean => {
  const base = token[0];
  if (isFace(base)) return base === startingTopFace;
  const wideFace = base.toUpperCase();
  if (!isFace(wideFace)) return false;
  const stillLayer = OPPOSITE_FACE[wideFace];
  return stillLayer === startingTopFace;
};

export const stripTrailingAuf = (alg: string): string => {
  const tokens = tokenize(alg);
  const kept = [...tokens];

  // the first move is always kept so AUF-only algs like U2 keep distinct keys
  while (kept.length > 1) {
    const lastMove = kept.pop()!;
    const startingTopFace = startingTopFaceAfter(kept);
    if (!isRotation(lastMove) && !isStartingTopAuf(lastMove, startingTopFace)) {
      kept.push(lastMove);
      break;
    }
  }
  return kept.join(' ');
};

export const addPostAuf = (alg: string, auf: '' | 'U' | 'U2' | "U'"): string => {
  const tokens = tokenize(alg);
  while (tokens.length > 0 && isRotation(tokens[tokens.length - 1])) tokens.pop();
  if (!auf) return tokens.join(' ');
  return [...tokens, startingTopFaceAfter(tokens) + auf.slice(1)].join(' ');
};

// rotates an alg by `quarterTurns` `y` turns. used to convert a suggestion alg from the
// viewing frame (cross down, spun by the chosen angle) into the cube object's fixed frame.
export const rotateAlgByY = (alg: string, quarterTurns: number): string => {
  const q = ((quarterTurns % 4) + 4) % 4;
  if (q === 0) return alg;
  let tokens = tokenize(alg);
  for (let i = 0; i < q; i++) tokens = tokens.map(rotateTokenByYQuarter);
  return tokens.join(' ');
};
