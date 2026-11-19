# Fingertrick Category Approximator

Input: an alg. Output: how many moves it has in each **fingertrick category**, plus regrip counts.
The F2L pair speed estimator (`f2l-pair-speed-estimator.md`) uses these counts as its features.

Which grips a solver used can't be known from an alg. The approximator picks the most comfortable
way to execute the alg, using comfort as a proxy for speed, and reports the categories along that
path.

## Fingertrick category

`<move><leftGrip><rightGrip>`, for example `U01`: a `U` started with the left hand in grip 0 and the
right hand in grip 1. The grips are the ones at the **start** of the move.

A grip number is a signed count of quarter turns of that hand away from home grip, measured in the
clockwise direction of the hand's own face. Home is `0` for both hands, so home grip is `00`.

- Right hand: thumb on top is `1` (the direction an `R` turns). Thumb on bottom is `-1`.
- Left hand: thumb on bottom is `1` (the direction an `L` turns). Thumb on top is `-1`.

Negative grips keep their sign in the key: `U-10` is a `U` with the left thumb on top and the right
hand at home. Each grip is an optional `-` plus one digit, so keys parse with
`^(.+?)(-?\d)(-?\d)(\w*)$`. The last group is an optional variant suffix (see rolling moves below).

Regrips are categories too: `regripL<from><to>` and `regripR<from><to>`.

## Fingertrick table (owner-supplied)

All cubing knowledge lives in `utils/fingertrickTable.ts`. The project owner writes its contents. An
LLM implementing this spec writes the types, the loader, and the verify script, then hands the table
to the owner. The code must not hard-code which moves are possible from which grip, or how
comfortable anything is.

The table has three parts.

### 1. Possible moves

For each move token `cube3x3.parse` can produce, the list of ways it can be done. Each entry has:

- `start`: `[left, right]` grip at the start of the move.
- `end`: `[left, right]` grip after the move.
- `variant` (optional): key suffix for a second way to do the move between the same start grips.
  Rolling `R2` / `L2` is the expected use. The hand changes grip during the turn at little or no
  cost, so the rolling version has a different `end` and its own key, such as `R2r01`.

A move/grip combination with no entry is impossible. Examples of impossible combinations:
- `U-11`: both thumbs on top means the whole cube has turned, which is written as an `x`, not a `U`
  in that grip.
- `U03`: `+3` from home is past what a wrist can turn.

### 2. Regrips

For each hand, which `from → to` regrips are possible.

### 3. Comfort

A `discomfort` number ≥ 0 on every possible move entry and every regrip. `0` is fully comfortable.
The search minimizes the total. The owner picks the scale.

General guidance from the owner, to be turned into concrete numbers:
- Grips in the `-1` to `+1` range are the most comfortable.
- Some moves are uncomfortable even inside that range. Example: `U'10`.
- Most of the variation is in `U` moves.

**Work item: line-by-line comfort review.** The owner rates comfort for each move entry one at a
time. To support this, `pnpm list-fingertricks` writes `scripts/output/fingertrick-review.md`. It is
a table of every possible move entry with its current discomfort (blank if unset) and how often its
category appears in `utils/reconz_data/f2l_pair_times.csv` under the current table. It is sorted by
frequency, so the most common categories get reviewed first. `U` moves are listed first. The owner
copies the decisions into `utils/fingertrickTable.ts`.

## Path search

`approximateFingertricks(moves)` finds the most comfortable way to execute the alg.

- **Starting grips:** run the search once from each of `00`, `0-1`, `01`, `-10`, and `10`: home, or
  one hand turned one quarter turn either way. Keep the run with the lowest total discomfort. Ties go
  to `00` first, then the others in the order listed.
- **States:** `(moveIndex, leftGrip, rightGrip)`.
- **Steps:** before each move, zero or more possible regrips, then one possible entry of the move from
  the current grip. A regrip is allowed anywhere, not only when the next move is impossible without
  one. It is chosen whenever regripping plus the move is more comfortable in total than any path
  without the regrip.
- **Search:** Dijkstra over the states. Discomfort is ≥ 0, so it is valid.
- **Ties inside one start:** fewest regrips first, then the smallest sum of absolute grip numbers
  across the path, then the earliest-listed table entry. This keeps the output deterministic.
- **No path:** if no possible sequence executes the alg, return an error that names the first move
  that can't be reached. That means the table is missing something. The search must not invent an
  entry.

### Output

```ts
{
  counts: Record<string, number>
  startGrip: [number, number]
  steps: { category: string; grip: [number, number] }[]
  discomfort: number
}
```

`counts` is the main output. `steps` lists the moves and regrips in order, so the owner can check the
path by hand.

## Files

| File | Contents |
|------|----------|
| `utils/fingertrickTable.ts` | Types and owner-written table. |
| `composables/recon/fingertrickApproximator.ts` | `approximateFingertricks`. Pure, no I/O. |
| `scripts/listFingertricks.ts` | `pnpm list-fingertricks`, the comfort review file described above. |
| `scripts/verifyFingertricks.ts` | `pnpm verify-fingertricks`. Checks owner-written fixtures (alg → expected `steps`) and lists move tokens from the pair dataset with no table entry. Exits 1 on a mismatch. |

Add both scripts to `docs/package-scripts.md`.

## Order of work

1. Types, loader, search, and both scripts, with a small placeholder table so the code runs.
2. The owner fills in possible moves and regrips.
3. The owner reviews comfort line by line, using `fingertrick-review.md`.
4. The owner adds about 20 known algs as fixtures and checks their paths.
