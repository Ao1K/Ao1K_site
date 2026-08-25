# AUF-Canonical Search

How F2L and ZBLS suggestions survive the fact that a pair can sit in four different U-layer
positions that are all the same case.

Relevant files: `utils/canonicalizeAuf.ts`, `utils/collapseAufVariants.ts`,
`composables/recon/SimpleCubeInterpreter.tsx` (`getQueriesForF2L`, `reconstructF2LAlg`,
`runF2LQueries`), `scripts/verifyAufReconstruction.ts`.

## The problem

A compiled alg entry stores a hash: the cube state that alg solves, produced by applying the
alg's inverse to a solved cube (see `hash-system.md`). An F2L case with a piece in the U layer
therefore has four stored hashes that differ only by a U turn — one per preAUF. Searching all
four separately means four times the entries and four times the queries.

Instead: pick one of the four as **canonical**, store only that, and rebuild the preAUF the
solver actually needs at query time.

## Vocabulary

Terms used throughout this doc and in the code.

| Term | Meaning |
| --- | --- |
| **AUF index** | A U turn as a number: `0` = none, `1` = U, `2` = U2, `3` = U'. Same convention as `AUF_PREFIX` in `LLsuggester.tsx:11` and `AUF_VAL_TO_TOKEN` in `canonicalizeAuf.ts`. Adding indices mod 4 composes the turns. |
| **preAUF** | The U turn the solver does before the alg body. This is what ends up at the front of a suggestion. |
| **canonical preAUF** | The preAUF already written into a compiled entry's stored text — the `U` in `"U R U' R'"`. It is the preAUF that would be correct *if the pair were already in its canonical position*. |
| **canonical position** | For one pair: whichever of its four U-turn positions has the lexicographically smallest `cornerChar + edgeChar`. An arbitrary bucket label, not a cubing-meaningful angle. |
| **pair** | A slot's corner and edge, whether or not they're joined. |
| **U layer / E layer / D layer** | Face-letter layers. A piece outside the U layer is in an E- or D-layer slot — its own or the wrong one — and a U turn does not move it. |
| **isTopLayer** | Per-query flag, true when **either** of the pair's two pieces is in the U layer. When it's false, a U turn cannot move this pair at all. |
| **rotation** | Reserved for `x`/`y`/`z`. U turns are turns, never rotations. |

## The three AUF quantities

All three are AUF indices.

| Symbol | Name | Where it comes from |
| --- | --- | --- |
| `q` | canonicalizing turn | `canonicalizePair` — the turns that move the **live** pair onto its canonical position |
| `c` | canonical preAUF | `splitLeadingAuf` on the matched entry's stored alg text |
| `m` | preAUF | what gets prepended to the suggestion |

```
m = q + c   (mod 4)   — combineAuf() in canonicalizeAuf.ts
```

Read it as: turn your pair onto canonical, then do the preAUF the canonical entry expects.

The direction matters and is easy to invert. `q` counts turns applied to the live pair to
**reach** canonical, not turns that undo canonicalization. That is why the two compose by
addition. `scripts/verifyAufReconstruction.ts` checks both conventions against every cleanly
collapsed entry in `compiled-f2l-algs.json`: addition passes all of them, subtraction fails
about 27%.

## 1. A U turn acts on one hash character at a time

A hash character encodes a piece's position and orientation together, so the effect of a U turn
on a piece is a pure character-to-character map, independent of the alg, the rest of the hash,
and which hash index the piece sits at. `EDGE_STEP` and `CORNER_STEP` in `canonicalizeAuf.ts`
are those maps.

Which characters a U turn actually moves:

| Piece | Moved by U (U layer) | Fixed by U (E and D layers) |
| --- | --- | --- |
| Corner | `a`–`l` | `m`–`x` |
| Edge | `a`–`d`, `m`–`p` | `e`–`l`, `q`–`x` |

Corners are `location * 3 + axis`, so the four U-layer locations take up the first twelve
characters. Edges list the four U-layer positions first (`a`–`d`) and their flipped forms at
`m`–`p`. `isTopLayerChar` just asks whether the step table moves the character.

Both tables were derived empirically against SimpleCube rather than by hand — corner behavior
under repeated U turns is not a plain mod-4 add on the character index, because the axis field
changes too.

## 2. Canonical position of a pair

`canonicalizePair(cornerChar, edgeChar)` rotates both characters together through all four U
turns and keeps whichever step gives the smallest `cornerChar + edgeChar`, returning that pair
plus `q`.

Both characters step together because one physical U turn moves both pieces. A pair with
neither piece in the U layer has four identical steps, so it canonicalizes to itself with
`q = 0`.

## 3. Compile time

`canonicalizeAufHashes` in `collapseAufVariants.ts` does the collapse:

1. Group entries by their alg text minus any leading `y` and leading U turn (`splitLeadingAuf`).
   Only groups holding all four AUF variants exactly once are touched; anything else passes
   through untouched.
2. Find the group's **AUF-sensitive** pairs — the ones whose two hash characters actually differ
   across the four variants, which is exactly the pairs with a piece in the U layer. Pairs
   already solved in the base hash are ignored.
3. If no pair is AUF-sensitive, keep one entry and drop the other three.
4. Otherwise, for each sensitive pair, keep whichever of the four variants puts that pair in its
   canonical position. Winners are deduplicated by hash.

**Step 4 is the part that bites.** A kept entry is canonical for *at least one* pair, not for
every pair. An entry retained because it canonicalizes the FR pair may well carry a leading
`U` that means nothing to the BL pair — and the same entry can still match a BL query.

Note the separate, unrelated collapse in the same file: `collapseAufGroups` works on the raw alg
*source list* and emits a bare core with `add_U: true`. Different input, different output, easy
to confuse with the hash collapse above.

## 4. Query time

`getQueriesForF2L` builds one query per unsolved slot:

- Cross pieces and already-solved pairs are constrained to their **live** characters. They all
  sit in the E and D layers, so no U turn moves them and no canonicalization applies.
- The queried pair's own two characters are replaced by their canonical form, and `q` is carried
  on the query alongside `isTopLayer`.

One exact-match search then finds every entry for the case regardless of which of the four
U-layer positions the live pair is in.

## 5. Rebuilding the suggestion

`reconstructF2LAlg` splits the matched entry's text into `coreKey` (any leading `y` stays
attached) and its canonical preAUF `c`, then branches on `isTopLayer`:

| Case | preAUF | Suggestion |
| --- | --- | --- |
| A pair piece is in the U layer | `m = q + c` | `m` + core |
| Both pair pieces are in E/D layers | `0`, or an EO-motivated turn | core alone |

In the second case `q` is always 0, and `c` is dead weight inherited from some other pair's
canonicalization — so it gets dropped. Dropping it is safe because everything the query
constrained is U-invariant: the pair's own characters by assumption, and the cross and
solved-pair characters because they are E/D-layer pieces.

Prepending is done through `combineMoves`, so a preAUF that meets the core's first move merges
(`U` + `U'` cancels, `U` + `U` becomes `U2`). A leading `U` landing in front of a leading `y` is
reordered to `y U` for display, matching `reorderAnglingInAlg` in `AlgCompiler.tsx`; the two
commute, so the reorder is free.

## 6. EO bookkeeping

`getEOvalue` returns a 12-bit number. Bit `i` is set when the edge **at position `i`** is
misoriented, so `0` means EO is solved. Positions 0–3 are the U layer, 4–7 the D layer, 8–11 the
E layer. Bits are indexed by position, not by which piece is there.

A U turn cycles bits 0–3 and leaves 4–11 alone — it never flips an edge under this definition.
That is `rotateEOBits(eoValue, q)`.

A compiled entry's stored `eoValue` is the EO of the state it solves, so it reads as a
**precondition**: the alg produces its stored result only when the cube's EO matches. Applying a
preAUF `m` first rotates the live EO, which gives the match conditions:

| Case | Condition |
| --- | --- |
| U-layer pair, executing `q + c` + core | `rotateEOBits(currentEO, q) === algEOvalue` |
| E/D pair, executing `m` + core (no `c`) | `rotateEOBits(currentEO, m) === rotateEOBits(algEOvalue, c)` |

The second row is the same equation with `c` shifted from the alg side to the EO side: since the
stored `eoValue` is the precondition for the text *including* `c`, removing `c` from the text
means advancing the precondition past it.

`hasEOsolved` on a suggestion means "this alg's EO precondition is met," which is what makes a
ZBLS alg a legitimate suggestion — `runF2LQueries` discards `zbls` entries that fail it. For an
E/D-layer pair with EO ranking on, a preAUF may be worth adding purely to satisfy EO even though
the pair does not need one; candidates are tried `''`, `U`, `U'`, `U2` so the cheapest wins. The
order is load-bearing: a `currentEO` whose low four bits are all-0 or all-1 is unchanged by
rotation and matches more than one candidate.

`checkZBLSrelevance` is a separate gate. ZBLS entries are compiled with the other three slots
solved, so they can only match when this pair's pieces are in the U layer or their own slot, and
when every E-layer edge outside this slot is already oriented.

## 7. Easy things to get wrong

- A compiled entry's hash is the state the alg **solves**, not the state after running it.
- `q` composes with `c` by addition. Subtraction looks plausible and fails on about a quarter of
  real entries.
- A stored canonical preAUF is only meaningful for the pair the entry was kept for. Never
  reuse it verbatim for a pair with no piece in the U layer.
- EO bits are indexed by board position, so U-layer bits move under a preAUF even though no edge
  flips.
- `collapseAufGroups` (alg source, `add_U`) and `canonicalizeAufHashes` (compiled hashes) are
  different mechanisms in the same file.
- `splitLeadingAuf` also consumes a leading `y` and reattaches it to the core, so `coreKey` is
  not always rotation-free.

## Verification

`scripts/verifyAufReconstruction.ts` runs against the real compiled data:

- `rotateEOBits` matches simulated U turns on actual EO values.
- Every f2l entry with a leading U turn, from a group that fully collapsed, reconstructs to the
  right hash — reported as `additionPasses` vs `subtractionPasses` so the composition direction
  is checked rather than assumed.
