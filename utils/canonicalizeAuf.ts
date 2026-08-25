export type F2LPieceType = 'edge' | 'corner';

/**
 * Effect of a single U turn on a hash character, derived and verified empirically against
 * SimpleCube (see scripts/verifyAufReconstruction.ts) rather than hand-derived, per
 * docs/auf-canonical-search.md section 1. Corner axis-swap behavior under repeated U turns is
 * not a simple mod-4 add, so this table is not reconstructable from the index math alone.
 */
const EDGE_STEP: Record<string, string> = {
  a: 'd', b: 'a', c: 'b', d: 'c', e: 'e', f: 'f', g: 'g', h: 'h', i: 'i', j: 'j', k: 'k', l: 'l',
  m: 'p', n: 'm', o: 'n', p: 'o', q: 'q', r: 'r', s: 's', t: 't', u: 'u', v: 'v', w: 'w', x: 'x',
};

const CORNER_STEP: Record<string, string> = {
  a: 'l', b: 'k', c: 'j', d: 'c', e: 'b', f: 'a', g: 'f', h: 'e', i: 'd', j: 'i', k: 'h', l: 'g',
  m: 'm', n: 'n', o: 'o', p: 'p', q: 'q', r: 'r', s: 's', t: 't', u: 'u', v: 'v', w: 'w', x: 'x',
};

function stepTable(pieceType: F2LPieceType): Record<string, string> {
  return pieceType === 'edge' ? EDGE_STEP : CORNER_STEP;
}

function normalizeAufIndex(amount: number): number {
  return ((amount % 4) + 4) % 4;
}

/**
 * True when this character sits in a U-layer position (i.e. a single U turn actually moves it).
 * Matches the U-layer character ranges tabulated in docs/auf-canonical-search.md section 1.
 */
export function isTopLayerChar(pieceType: F2LPieceType, char: string): boolean {
  return stepTable(pieceType)[char] !== char;
}

/**
 * canonicalizeChar(pieceType, char) -> smallest of the four characters char cycles through under
 * U turns, plus q, the AUF index that reaches it. Non-U-layer characters are an identity map
 * (q=0). Per docs/auf-canonical-search.md section 1, this is alg- and hash-position-independent.
 */
export function canonicalizeChar(pieceType: F2LPieceType, char: string): { char: string; q: number } {
  const step = stepTable(pieceType);
  let cur = char;
  let best = char;
  let bestQ = 0;
  for (let q = 0; q < 4; q++) {
    if (cur < best) {
      best = cur;
      bestQ = q;
    }
    cur = step[cur] ?? cur;
  }
  return { char: best, q: bestQ };
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
  return AUF_VAL_TO_TOKEN[normalizeAufIndex(val)];
}

/**
 * m = combine(q, c): the preAUF to prepend when executing a matched alg on the live cube.
 * q (the canonicalizing turn that puts the live pair in its canonical position) and c (the
 * matched entry's own canonical preAUF) are both AUF indices in the same convention as
 * EDGE_STEP/CORNER_STEP, so they simply add mod 4. Verified against compiled-f2l-algs.json
 * with zero counterexamples across 1800+ cleanly-collapsed cases in
 * scripts/verifyAufReconstruction.ts; the subtraction convention fails ~27% of those.
 */
export function combineAuf(q: number, c: number): number {
  return normalizeAufIndex(q + c);
}

/**
 * Cycle the low 4 bits (U-layer edge positions) of a 12-bit eoValue by AUF index q; bits 4-11
 * (D- and E-layer edges) never move under a U turn, and no U turn flips an edge. Uses the same
 * direction as EDGE_STEP, verified empirically to match in scripts/verifyAufReconstruction.ts
 * (bit j after one U turn always equals the old bit (j+1) mod 4).
 */
export function rotateEOBits(eoValue: number, q: number): number {
  const amount = normalizeAufIndex(q);
  const high = eoValue & ~0b1111;
  let low = eoValue & 0b1111;
  for (let i = 0; i < amount; i++) {
    low = ((low >> 1) | ((low & 1) << 3)) & 0b1111;
  }
  return high | low;
}
