# F2L Pair Speed Estimator

Estimates how many seconds a strong solver takes to execute any F2L alg. The estimate is a weighted
sum of features describing the alg and the step before it. Most features come from fingertrick
categories (`fingertrick-category-approximator.md`). The weights are fit to pair times from
professional reconstructions.

This is the source of numbers for the "F2L cost estimator (new)" section of `f2l-review.md`.
`AlgSpeedEstimator.tsx` is unchanged.

## Model

```
seconds(alg, previousStep) = intercept + Σ weight[feature] × value[feature]
```

The features are listed in `## Features`. Fingertrick categories come from
`approximateFingertricks`. Its path is chosen by the owner's comfort table and does not depend on
the fitted weights, so the fit runs once.

- The target is raw seconds, not log seconds, so weights add up along the alg.
- No solver feature. Faster solvers are faster partly because they choose algs and grips that
  execute well, and that is what the model should pick up. The estimator also has no solver input
  at runtime.
- Recognition and pauses are in the measured times and are not modeled separately. They land in
  `intercept` and in the feature weights.

## Fingertrick categories

A category is a label for one step of the path that `approximateFingertricks` returns. The full
definition is in `fingertrick-category-approximator.md`. There are two kinds.

| Kind | Key format | Example | Meaning |
|------|------------|---------|---------|
| Move | `<move><leftGrip><rightGrip><variant>` | `U01`, `U'-10`, `R2r01` | A move token, started from that grip pair. `variant` is usually empty. |
| Regrip | `regrip<hand><from><to>` | `regripR10` | One hand changes grip between moves. `hand` is `L` or `R`. |

Each category also has a **bare** form that drops the grips:

| Kind | Bare form | Example |
|------|-----------|---------|
| Move | The move token | `U01` → `U`, `R2r01` → `R2` |
| Regrip | `regripL` or `regripR` | `regripR10` → `regripR` |

A **move type** is the face or axis a move turns, without direction or amount: `R`, `R'`, and `R2`
are all type `R`. Wide moves, slices, and rotations are their own types (`r`, `M`, `y`). Move type is
read from `Move3x3`, not from the category key.

The category set is open. Any key the approximator produces in the pair dataset becomes a feature.
Keys never seen in training get no feature of their own (see `## Step 3`).

## Features

All features are computed from the pair's moves, its `pair_index`, and the previous step's moves.
The previous step is the nearest earlier stage of the same solve with a non-empty alg, whatever its
label. For `1st pair` that is usually the cross. An `xcross` stage never becomes a row, but it can
be a previous step: a `2nd pair` after an `xcross` gets its previous-step features from the `xcross`.

Each pair is treated as independent of the rest of its solve. The pair's path is searched on its own
moves from the 5 start grips, not continued from the previous step's end grip.

### Pair features

| Feature | Value |
|---------|-------|
| `cat:<key>` | Count of that full category key in the pair's path. One feature per key. |
| `bare:<form>` | Count of that bare form in the pair's path. One feature per bare form. |
| `distinctCategories` | Number of distinct move-category keys in the path. Regrips not counted. |
| `distinctMoveTypes` | Number of distinct move types in the pair's moves. |
| `discomfort` | The `discomfort` total that `approximateFingertricks` returns for the pair's path. |
| `pair1`, `pair2`, `pair4` | 1 if `pair_index` is that number, else 0. `3rd pair` is the reference, with all three at 0. Solvers in this dataset often plan the 2nd pair ahead of time, which makes early pairs faster, so a later pair is the baseline. |
| `slotFL`, `slotBR`, `slotBL` | 1 if the pair's `slot` is that slot, else 0. `FR` is the reference, with all three at 0. |
| `zbls` | 1 for `4th pair/ZBLS`, else 0. |

Regrip counts are covered by `cat:regrip…` and `bare:regripL` / `bare:regripR`.

### Slot

The slot is the one the pair is solved into, named from where the solver is holding the cube at the
end of the alg. If the alg rotates and then inserts into the back-left slot, the slot is `BL`.

`algSolvedSlots` (`composables/algs/multislotSlots.ts`) already does this. It applies the inverse of
the alg to a solved cube, replays the alg, and returns the slots completed last, named in the cube's
final orientation. It reads only the alg, so the dataset script and the runtime estimator get the same
answer from the same input.

### Previous-step features

| Feature | Value |
|---------|-------|
| `prevDistinctCategories` | `distinctCategories` of the previous step's path. |
| `prevDistinctMoveTypes` | `distinctMoveTypes` of the previous step's moves. |

The previous step's path is a separate `approximateFingertricks` run on the previous step's moves
alone.

If there is no previous step, both values are 0.

### Sparse categories

Many full keys will be rare. Every move adds to both its `cat:` feature and its `bare:` feature, so
ridge shrinks a rare full key toward 0 and its cost falls back to the bare form's cost. Ridge uses two
penalties:

- `cat:` features: the larger penalty.
- All other features: the smaller penalty.

Both are picked by cross-validation. The intercept is not penalized.

## Step 1: pair dataset

Script: `scripts/extractF2lPairTimes.ts`, run as `pnpm f2l-pair-times`. Add it to
`docs/package-scripts.md`.

**Reads** `utils/reconz_data/reconz_3x3_cfop_zz_zb_sub10_max80.csv`. This file is already filtered
to large sessions under timing and move count limits. Don't add more solve-level filtering.

**Writes** `utils/reconz_data/f2l_pair_times.csv`.

### Reading the CSV

Fields contain commas, quotes doubled as `""`, and possibly newlines. Write a small RFC 4180 reader in
the script. No new dependency.

Columns used:
- `id`, `solver`, `method`, `framerate`
- `inspection_time`, `stage1_time` … `stage8_time`
- `stage1_alg` … `stage8_alg`

### Stage timing

`stageN_time` is the frame where stage N **ends**. `inspection_time` is the frame where inspection
ends. Pair duration is:

```
(stageN_time - stage(N-1)_time) / framerate
```

using `inspection_time` for stage 1. Example from solve 4151: `(7744.6 - 7411) / 60 = 5.56`, which
matches `result`. A stage with an empty alg repeats the previous stage's time.

### Stage alg text

`stageN_alg` looks like `["U R U' R' // 1st pair"]`: an array of lines with a `//` label at the end.
Join the lines, take the text before the first `//` on each line for moves, and the text after the last
`//` as the label.

### Which stages become rows

Keep stages whose label is exactly one of:

| Label | `pair_index` | `zbls` |
|-------|--------------|--------|
| `1st pair` | 1 | false |
| `2nd pair` | 2 | false |
| `3rd pair` | 3 | false |
| `4th pair` | 4 | false |
| `4th pair/ZBLS` | 4 | true |

Every other label is skipped: multi-pair labels (`2nd & 3rd pairs`), cross variants (`xcross`), and
labels with extra work (`3rd pair/finish cross`, `4th pair/VLS`). A skipped stage can still be the
`prev_alg` of the next kept row.

### Dropping single pairs

Drop the pair, not the solve, when:
1. `cube3x3.parse` returns any `invalid` tokens.
2. The pair has a redundancy. Run `groupRedundantMoves` (`composables/recon/redundantMoves.ts`) on the
   previous stage's moves followed by the pair's moves. Drop the pair if any `combine` or `cancel` group
   contains a pair move. This catches `U U'` inside the pair and a pair whose first move cancels or
   combines with the previous stage's last moves. `exception` groups are not mistakes.
3. The duration is ≤ 0.1. Log when this happens.
4. `algSolvedSlots` doesn't return exactly one slot.

The script prints the kept row count and the count for each drop reason.

### Output columns

| Column | Notes |
|--------|-------|
| `solve_id` | From `id`. |
| `solver` | For grouped cross-validation only. Never a model feature. |
| `method` | `CFOP` or `ZB`. |
| `pair_index` | 1–4. |
| `zbls` | `true` / `false`. |
| `slot` | `FR`, `FL`, `BR`, or `BL`, from `algSolvedSlots`. |
| `alg` | `cube3x3.format` of the parsed moves. |
| `prev_alg` | `cube3x3.format` of the previous step's parsed moves. Empty if there is none. |
| `stm` | `cube3x3.count(moves, 'stm')`. |
| `duration_s` | Seconds, from frames. |

## Step 2: fitting

Script: `scripts/fitF2lSpeedModel.ts`, run as `pnpm fit-f2l-speed`. Add it to
`docs/package-scripts.md`.

**Reads** `utils/reconz_data/f2l_pair_times.csv` and `utils/fingertrickTable.ts`.
**Writes** `utils/f2lSpeedWeights.json`: `{ intercept, weights: Record<feature, number>, penalties,
cvMae, baselineMae }`.

All TypeScript, so fitting and runtime share `approximateFingertricks`. The feature matrix has a few
hundred columns, so ridge regression can be solved directly with the normal equations. No library
needed.

### Fit

1. Run `approximateFingertricks` on every row's `alg` and `prev_alg`. If any run returns an error,
   stop and list the moves the table is missing.
2. Build the features in `## Features`.
3. Fit ridge regression of `duration_s` on the features.
4. List any negative weights for the owner. A negative weight means that feature goes with faster
   pairs after the other features are accounted for. Report it. Don't clip it.

### Validation

- Grouped k-fold cross-validation by `solver` (leave one solver out if there are few solvers). Pick
  both ridge penalties by CV mean absolute error.
- Baseline model: `duration_s ~ intercept + stm + rotation count`. Write its CV MAE as `baselineMae`
  next to the model's `cvMae`. The fingertrick model has to beat it to be worth using.
- Print the 20 largest weights and the 20 rows with the largest absolute error, so the owner can check
  them.

## Step 3: runtime estimator

`composables/recon/f2lSpeedEstimator.ts`:

```ts
estimateF2lSeconds(
  moves: Move3x3[],
  previousMoves: Move3x3[],
  pairIndex: 1 | 2 | 3 | 4,
  zbls: boolean,
):
  | {
      seconds: number
      steps: { category: string; grip: [number, number]; seconds: number }[]
      otherFeatures: { feature: string; value: number; seconds: number }[]
    }
  | { error: string }
```

Loads `utils/f2lSpeedWeights.json`, builds the features in `## Features`, and returns `intercept`
plus every feature's contribution.

- `steps`: one entry per step of the pair's path. A step's seconds are
  `weight[cat:<key>] + weight[bare:<form>]`. A `cat:` key not in the weights counts as 0, so it falls
  back to its bare form. If the bare form isn't there either, use the mean `bare:` weight.
- `otherFeatures`: every feature that isn't `cat:` or `bare:`, each with its value and
  `weight × value`.

The slot comes from `algSolvedSlots(moves)`. If it doesn't return exactly one slot, return an error
that says how many slots it found.

`seconds` is `intercept` plus the sum of both lists. Both lists are returned so review notes can say
where the time went.

## Open

- Fingertrick table contents and the comfort review (`fingertrick-category-approximator.md`).
  Steps 2 and 3 are blocked on them. Step 1 is not.
- The previous step is often the cross, which uses moves F2L algs rarely do (`D`, `B`, and so on).
  The table has to cover every move in `prev_alg` too, or the fit stops at step 1 of `### Fit`.
- Whether `pair1`, `pair2`, and `pair4` earn their place. Check their weights and the CV MAE with and without
  them.
- Whether `zbls` rows go into the same fit or a separate one. Default: same fit, with `zbls` as a
  0/1 feature, and check its weight.
