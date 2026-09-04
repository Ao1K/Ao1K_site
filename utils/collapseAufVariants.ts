import { canonicalizePair } from './canonicalizeAuf';

export type AufPart = '' | 'U' | "U'" | 'U2';

export const AUF_PARTS: AufPart[] = ['', 'U', "U'", 'U2'];

const Y_TOKEN_RE = /^y['2]?$/;
const U_TOKEN_RE = /^U['2]?$/;
const KEY_SEP = '||';

export function splitLeadingAuf(value: string): { coreKey: string; aufPart: AufPart } {
  const tokens = value.trim().replace(/2'/g, '2').split(/\s+/);
  let idx = 0;

  let yPart = '';
  if (tokens[idx] && Y_TOKEN_RE.test(tokens[idx])) {
    yPart = tokens[idx];
    idx += 1;
  }

  let aufPart: AufPart = '';
  if (tokens[idx] && U_TOKEN_RE.test(tokens[idx])) {
    aufPart = tokens[idx] as AufPart;
    idx += 1;
  }

  const rest = tokens.slice(idx).join(' ');
  const coreKey = yPart ? `${yPart} ${rest}`.trim() : rest;

  return { coreKey, aufPart };
}

export function groupCleanAufSets<T>(
  items: T[],
  groupKeyOf: (item: T) => string,
  valueOf: (item: T) => string,
): Map<string, Map<AufPart, T>> {
  const raw = new Map<string, Map<AufPart, T[]>>();

  items.forEach((item) => {
    const { coreKey, aufPart } = splitLeadingAuf(valueOf(item));
    const key = `${groupKeyOf(item)}${KEY_SEP}${coreKey}`;

    let byPart = raw.get(key);
    if (!byPart) {
      byPart = new Map();
      raw.set(key, byPart);
    }

    const list = byPart.get(aufPart) ?? [];
    list.push(item);
    byPart.set(aufPart, list);
  });

  const clean = new Map<string, Map<AufPart, T>>();
  for (const [key, byPart] of raw) {
    if (byPart.size !== AUF_PARTS.length) continue;

    const resolved = new Map<AufPart, T>();
    let isClean = true;
    for (const part of AUF_PARTS) {
      const list = byPart.get(part);
      if (!list || list.length !== 1) {
        isClean = false;
        break;
      }
      resolved.set(part, list[0]);
    }

    if (isClean) clean.set(key, resolved);
  }

  return clean;
}

interface AufSourceAlg {
  value: string;
  step: string;
}

export function collapseAufGroups<T extends AufSourceAlg>(algs: T[]): T[] {
  const cleanGroups = groupCleanAufSets(
    algs,
    (a) => a.step,
    (a) => a.value,
  );

  const emitted = new Set<string>();
  const result: T[] = [];

  algs.forEach((alg) => {
    const { coreKey } = splitLeadingAuf(alg.value);
    const key = `${alg.step}${KEY_SEP}${coreKey}`;
    const group = cleanGroups.get(key);

    if (!group) {
      result.push(alg);
      return;
    }

    if (emitted.has(key)) return;
    emitted.add(key);

    const base = group.get('')!;
    result.push({ ...base, value: coreKey });
  });

  return result;
}

interface AufSourceHash {
  alg: string;
  hash: string;
  step?: string;
}

const F2L_SLOT_PAIRS: { corner: number; edge: number }[] = [
  { corner: 16, edge: 8 },
  { corner: 17, edge: 9 },
  { corner: 18, edge: 11 },
  { corner: 19, edge: 10 },
];

const SOLVED_HASH = 'abcdefghijklehkbnqtwabcdef';

const pairChars = (hash: string, pair: { corner: number; edge: number }) => hash[pair.corner] + hash[pair.edge];

export function canonicalizeAufHashes<T extends AufSourceHash>(entries: T[]): T[] {
  const cleanGroups = groupCleanAufSets(
    entries,
    (e) => e.step ?? '',
    (e) => e.alg,
  );

  const emitted = new Set<string>();
  const result: T[] = [];

  entries.forEach((entry) => {
    const { coreKey } = splitLeadingAuf(entry.alg);
    const key = `${entry.step ?? ''}${KEY_SEP}${coreKey}`;
    const group = cleanGroups.get(key);

    if (!group) {
      result.push(entry);
      return;
    }

    if (emitted.has(key)) return;
    emitted.add(key);

    const base = group.get('')!;

    const relevantPairs = F2L_SLOT_PAIRS.filter(
      (pair) => pairChars(base.hash, pair) !== pairChars(SOLVED_HASH, pair),
    );

    const sensitivePairs = relevantPairs.filter((pair) => {
      const chars = new Set(AUF_PARTS.map((part) => pairChars(group.get(part)!.hash, pair)));
      return chars.size > 1;
    });

    if (sensitivePairs.length === 0) {
      result.push(base);
      return;
    }

    const emittedHashes = new Set<string>();
    sensitivePairs.forEach((pair) => {
      const { cornerChar, edgeChar } = canonicalizePair(base.hash[pair.corner], base.hash[pair.edge]);
      const target = cornerChar + edgeChar;
      const winner = AUF_PARTS.map((part) => group.get(part)!).find((candidate) => pairChars(candidate.hash, pair) === target)!;
      if (!emittedHashes.has(winner.hash)) {
        emittedHashes.add(winner.hash);
        result.push(winner);
      }
    });
  });

  return result;
}
