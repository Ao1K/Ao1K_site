/**
 * Position-based search over `hash` strings.
 * - Builds a per-character-position inverted index.
 * - Supports per-position "must", "may", and "not" constraints.
 *
 * Uses 0-based indexing (so "first character" === pos=0).
 */

export type Doc = { alg: string; hash: string; [k: string]: any };

type CharSet = Set<string>;
type PosMap = Map<number, Map<string, Set<number>>>;

export type Constraint = {
  must?: string | string[];
  may?: string | string[];
  not?: string | string[];
};

export type Query = {
  positions: Record<number | string, Constraint>; // keys are position numbers (0-based)
  limit?: number;
  scoreBy?: 'may' | 'exact'; // how to score / rank results
};

interface IndexData {
  index: PosMap;
  docs: Doc[];
  maxLen: number;
}

export default class AlgSuggester {
  private indexData: IndexData | null = null;
  private static globalInstance: AlgSuggester | null = null;

  constructor(docs?: Doc[]) {
    if (docs) {
      this.buildIndex(docs);
    }
  }

  /**
   * Build the position-based index from documents
   */
  buildIndex(docs: Doc[]): IndexData {
    const index: PosMap = new Map();
    const idToDoc: Doc[] = [];
    let maxLen = 0;

    for (let i = 0; i < docs.length; i++) {
      const d = docs[i];
      idToDoc.push(d);
      const h = d.hash ?? '';
      maxLen = Math.max(maxLen, h.length);
      for (let pos = 0; pos < h.length; pos++) {
        const char = h[pos];
        let posMap = index.get(pos);
        if (!posMap) {
          posMap = new Map();
          index.set(pos, posMap);
        }
        let setForChar = posMap.get(char);
        if (!setForChar) {
          setForChar = new Set();
          posMap.set(char, setForChar);
        }
        setForChar.add(i); // store numeric index into idToDoc
      }
    }

    this.indexData = { index, docs: idToDoc, maxLen };
    return this.indexData;
  }

  /**
   * Convert string or string array to CharSet
   */
  private toCharSet(x?: string | string[]): CharSet | undefined {
    if (!x) return undefined;
    if (typeof x === 'string') return new Set([x]);
    return new Set(x);
  }

  /**
   * Search using position-based constraints
   */
  searchByPosition(q: Query) {
    if (!this.indexData) {
      throw new Error('Index not built. Call buildIndex() first or provide docs in constructor.');
    }

    const { index, docs } = this.indexData;
    const constraintEntries: Array<{ pos: number; must?: CharSet; may?: CharSet; not?: CharSet }> = [];

    for (const k of Object.keys(q.positions)) {
      const pos = Number(k);
      const c = q.positions[k];
      constraintEntries.push({
        pos,
        must: this.toCharSet(c.must),
        may: this.toCharSet(c.may),
        not: this.toCharSet(c.not)
      });
    }

    let candidateIds: Set<number> | null = null;

    // Use MUST constraints to narrow aggressively.
    const mustConstraints = constraintEntries.filter(c => c.must && c.must.size > 0);
    if (mustConstraints.length > 0) {
      for (const c of mustConstraints) {
        const posMap = index.get(c.pos);
        let posUnion = new Set<number>();
        for (const ch of c.must!) {
          const s = posMap?.get(ch);
          if (s) for (const id of s) posUnion.add(id);
        }
        if (candidateIds === null) candidateIds = posUnion;
        else candidateIds = this.intersectSets(candidateIds, posUnion);
        if (candidateIds.size === 0) return [];
      }
    } else {
      // No MUST constraints -> use MAY constraints union if available to reduce work
      const mayConstraints = constraintEntries.filter(c => c.may && c.may.size > 0);
      if (mayConstraints.length > 0) {
        candidateIds = new Set<number>();
        for (const c of mayConstraints) {
          const posMap = index.get(c.pos);
          for (const ch of c.may!) {
            const s = posMap?.get(ch);
            if (s) for (const id of s) candidateIds.add(id);
          }
        }
      } else {
        // fallback to all documents
        candidateIds = new Set<number>(Array.from(Array(docs.length).keys()));
      }
    }

    // Exclude NOT constraints
    for (const c of constraintEntries) {
      if (c.not && c.not.size > 0) {
        const posMap = index.get(c.pos);
        for (const ch of c.not) {
          const s = posMap?.get(ch);
          if (s) {
            for (const id of s) candidateIds?.delete(id);
          }
        }
      }
    }

    // Final filter and scoring
    const results: Array<{ id: number; doc: Doc; score: number; matches: Record<number, string | undefined> }> = [];
    const scoreBy = q.scoreBy ?? 'may';

    if (!candidateIds) return [];

    for (const id of candidateIds) {
      const doc = docs[id];
      let excluded = false;
      let score = 0;
      const matches: Record<number, string | undefined> = {};

      for (const c of constraintEntries) {
        const rawChar = doc.hash?.[c.pos];
        matches[c.pos] = rawChar;

        if (c.must && c.must.size > 0) {
          if (!rawChar || !c.must.has(rawChar)) { excluded = true; break; }
          score += 100; // big boost for satisfying MUST
        }

        if (c.not && c.not.size > 0) {
          if (rawChar && c.not.has(rawChar)) { excluded = true; break; }
        }

        if (c.may && c.may.size > 0) {
          if (rawChar && c.may.has(rawChar)) {
            score += (scoreBy === 'may' ? 1 : 0);
          }
        }
      }

      if (!excluded) results.push({ id, doc, score, matches });
    }

    results.sort((a, b) => b.score - a.score);
    const limit = q.limit ?? 100;
    return results.slice(0, limit).map(r => ({ id: r.doc.alg, hash: r.doc.hash, score: r.score, matches: r.matches }));
  }

  /**
   * Helper method to intersect two sets
   */
  private intersectSets(a: Set<number>, b: Set<number>): Set<number> {
    if (a.size > b.size) [a, b] = [b, a];
    const out = new Set<number>();
    for (const v of a) if (b.has(v)) out.add(v);
    return out;
  }

  /**
   * Get the current index data
   */
  getIndexData(): IndexData | null {
    return this.indexData;
  }

  /**
   * Clear the current index
   */
  clearIndex(): void {
    this.indexData = null;
  }

  /**
   * Get or create a global singleton instance
   */
  static getOrCreateGlobalInstance(docs?: Doc[]): AlgSuggester {
    if (!AlgSuggester.globalInstance) {
      AlgSuggester.globalInstance = new AlgSuggester(docs);
    } else if (docs && !AlgSuggester.globalInstance.getIndexData()) {
      AlgSuggester.globalInstance.buildIndex(docs);
    }
    return AlgSuggester.globalInstance;
  }

  /**
   * Clear the global singleton instance
   */
  static clearGlobalInstance(): void {
    AlgSuggester.globalInstance = null;
  }
}

// Legacy function exports for backward compatibility
export function buildPositionIndex(docs: Doc[]) {
  const suggester = new AlgSuggester(docs);
  return suggester.getIndexData()!;
}

export function searchByPosition(
  db: IndexData,
  q: Query
) {
  const suggester = new AlgSuggester();
  suggester['indexData'] = db; // Access private property for compatibility
  return suggester.searchByPosition(q);
}

export function getOrCreateIndex(docs: Doc[]) {
  return AlgSuggester.getOrCreateGlobalInstance(docs).getIndexData()!;
}

export function clearIndex() {
  AlgSuggester.clearGlobalInstance();
}

/* ---------- Example usage ----------
const data: Doc[] = [
  { id: 1, hash: "adefpqjrousmfaedqprjawxbvj" },
  { id: 2, hash: "fadepqjrousmefdaqprjawxbvj" },
  // ...
];

// Using the class directly:
const suggester = new AlgSuggester(data);

const query: Query = {
  positions: {
    3: { must: "p" },     // 4th character (0-based index 3) must be 'p'
    6: { not: ["r","q"]}, // 7th char (0-based index 6) must not be r or q
    8: { may: ["o","u"] } // prefer hashes with 'o' or 'u' at position 8 (9th character)
  },
  limit: 50,
  scoreBy: 'may'
};

const out = suggester.searchByPosition(query);
console.log(out);

// Or using the legacy function approach:
const db = buildPositionIndex(data);
const legacyOut = searchByPosition(db, query);
console.log(legacyOut);
------------------------------------ */
