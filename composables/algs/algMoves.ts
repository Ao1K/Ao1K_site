// Move-string helpers for the algs page.
//
// A move token is a single base letter plus an optional suffix:
//   base   ∈ U D F B L R (faces), u d f b l r (wide), M E S (slices), x y z (rotations)
//   suffix ∈ an optional turn count (default 1) with an optional "'" for counterclockwise, e.g. '' "'" '2' "2'" '3' "3'"
// We treat a token as (letter, amount) where amount is signed quarter-turns: positive is
// clockwise, negative counterclockwise. ±2 are both half turns but spin opposite directions.

export const tokenize = (alg: string): string[] => alg.split(/\s+/).filter(Boolean);

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

// rotates an alg by `quarterTurns` `y` turns. used to convert a suggestion alg from the
// viewing frame (cross down, spun by the chosen angle) into the cube object's fixed frame.
export const rotateAlgByY = (alg: string, quarterTurns: number): string => {
  const q = ((quarterTurns % 4) + 4) % 4;
  if (q === 0) return alg;
  let tokens = tokenize(alg);
  for (let i = 0; i < q; i++) tokens = tokens.map(rotateTokenByYQuarter);
  return tokens.join(' ');
};
