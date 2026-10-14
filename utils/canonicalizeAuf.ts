export type F2LPieceType = 'edge' | 'corner';

/**
 * Effect of a single U turn on a hash character
 */
const EDGE_STEP: Record<string, string> = {
  a: 'd', b: 'a', c: 'b', d: 'c', e: 'e', f: 'f', g: 'g', h: 'h', i: 'i', j: 'j', k: 'k', l: 'l',
  m: 'p', n: 'm', o: 'n', p: 'o', q: 'q', r: 'r', s: 's', t: 't', u: 'u', v: 'v', w: 'w', x: 'x',
};

const CORNER_STEP: Record<string, string> = {
  a: 'l', b: 'k', c: 'j', d: 'c', e: 'b', f: 'a', g: 'f', h: 'e', i: 'd', j: 'i', k: 'h', l: 'g',
  m: 'm', n: 'n', o: 'o', p: 'p', q: 'q', r: 'r', s: 's', t: 't', u: 'u', v: 'v', w: 'w', x: 'x',
};

/**
 * Check if appplying a U move via stepTable causes the character to changee
 */
export function isTopLayerChar(pieceType: F2LPieceType, char: string): boolean {
  const table = pieceType === 'edge' ? EDGE_STEP : CORNER_STEP;
  return table[char] !== char;
}

/**
 * One U turn moves a pair's corner and edge at once, so they share one q. Steps
 * (cornerChar, edgeChar) together through q = 0..3 and keeps whichever q makes
 * cornerChar + edgeChar lexicographically smallest, corner first — the same comparison
 * compileExactAlgorithms's pairChars does, just over stepped characters instead of 4
 * separately-simulated hashes. Verified against public/recon/compiled-f2l-algs.json via
 * scripts/verifyAufReconstruction.ts.
 */
export function canonicalizePair(cornerChar: string, edgeChar: string): { cornerChar: string; edgeChar: string; q: number } {
  let curCorner = cornerChar;
  let curEdge = edgeChar;
  let bestCorner = cornerChar;
  let bestEdge = edgeChar;
  let bestQ = 0;
  for (let q = 0; q < 4; q++) {
    if (curCorner + curEdge < bestCorner + bestEdge) {
      bestCorner = curCorner;
      bestEdge = curEdge;
      bestQ = q;
    }
    curCorner = CORNER_STEP[curCorner] ?? curCorner;
    curEdge = EDGE_STEP[curEdge] ?? curEdge;
  }
  return { cornerChar: bestCorner, edgeChar: bestEdge, q: bestQ };
}

export type AufToken = '' | 'U' | "U'" | 'U2';

const AUF_TOKEN_TO_VAL: Record<AufToken, number> = { '': 0, U: 1, "U'": 3, U2: 2 };
const AUF_VAL_TO_TOKEN: AufToken[] = ['', 'U', 'U2', "U'"];

export function aufTokenToVal(token: string): number {
  return AUF_TOKEN_TO_VAL[token as AufToken] ?? 0;
}

export function aufValToToken(val: number): AufToken {
  return AUF_VAL_TO_TOKEN[val % 4];
}

/**
 * Cycle the low 4 bits (U-layer edge positions) of a 12-bit eoValue by AUF index q; bits 4-11
 * (D- and E-layer edges) never move under a U turn, and no U turn flips an edge. Uses the same
 * direction as EDGE_STEP, verified empirically to match in scripts/verifyAufReconstruction.ts
 * (bit j after one U turn always equals the old bit (j+1) mod 4).
 */
export type EOAngle = 'y0' | 'y';

type Axis = 'x' | 'y' | 'z';

const ROTATION_AXIS_OF_MOVE: Record<string, Axis> = {
  x: 'x', r: 'x', l: 'x', M: 'x',
  y: 'y', u: 'y', d: 'y', E: 'y',
  z: 'z', f: 'z', b: 'z', S: 'z',
};

export function eoAngleOfAlg(alg: string): EOAngle {
  const originalAxisAt: Record<Axis, Axis> = { x: 'x', y: 'y', z: 'z' };

  for (const move of alg.trim().split(/\s+/)) {
    const rotationAxis = ROTATION_AXIS_OF_MOVE[move[0]];
    const isHalfTurn = move.includes('2');
    if (!rotationAxis || isHalfTurn) continue;

    const [a, b] = (['x', 'y', 'z'] as Axis[]).filter((axis) => axis !== rotationAxis);
    [originalAxisAt[a], originalAxisAt[b]] = [originalAxisAt[b], originalAxisAt[a]];
  }

  return originalAxisAt.z === 'x' ? 'y' : 'y0';
}

export function rotateEOBits(eoValue: number, q: number): number {
  const amount = q % 4;
  const high = eoValue & ~0b1111;
  let low = eoValue & 0b1111;
  for (let i = 0; i < amount; i++) {
    low = ((low >> 1) | ((low & 1) << 3)) & 0b1111;
  }
  return high | low;
}
