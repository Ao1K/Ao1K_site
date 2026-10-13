# F2L Review (design notes)

Working document. Nothing here is implemented yet except the `reviewF2L` stub in
`composables/recon/f2lReview.ts`. Read `solve-review.md` first for the line pass / solve pass model.
Sections marked **OPEN** need a decision before the code that depends on them gets written.

> **Data access warning.** Do not scrape, crawl, or bulk-download reconstructions from reco.nz or
> any other recon site. We don't have permission yet. This applies to every contributor, human or AI.
> The project owner will supply any external recon data once permission exists.

## Principles

1. **One grade scale for everyone.** The grade measures how much time the solver lost on a pair
   compared to a strong human solving the same state. The grade never depends on who the solver is.
2. **What we point out depends on how bad the segment was.** We don't try to guess the solver's
   speed. A segment with a large loss gets feedback on the basics: a better way to solve that pair,
   and at most a short "the <colors> pair looks better" when another pair was clearly cheaper. A
   segment with a small loss gets nitpicks: lookahead-friendly moves, back slot preference, edge
   control. A very good solve can collect several nitpicks and still be graded `great`.
3. **Notes don't lower the grade by existing.** A note carries an estimated cost. The grade comes
   from the total cost, not from the number of notes. Nitpicks show as notes with a `good` or `null`
   category on a `great` line.
4. **Only suggest what a human could have seen.** The limits we enforce:
   - Look at most one pair ahead.
   - Use known algs from the database, not solver-generated move sequences.
   - Suggest ZBLS / edge control only on the last slot.
5. **Forgive creative choices.** If a solver takes a slower pair to get a better next pair, and the
   two-pair total is close to the best two-pair total, the choice is not a mistake. We don't need to
   understand the solver's reasoning, only that the result was good.
6. **Say nothing when unsure.** A missing note costs little. A wrong note on a good solve costs the
   user's trust in the whole review. When a rule can't be confident, it gives no note and a `null`
   category, the same way the cross review does for xxcross.

## Lookahead and visibility

Any piece can be tracked by a solver with good lookahead who uses lookahead-friendly algs. So
visibility is not a filter on what we may suggest. It shows up in two places instead:

1. **Move set.** `R U L D` moves keep pieces easy to track. `F` is somewhat worse. Everything else
   (`B`, slices, wide moves, rotations) is bad for lookahead. The F2L cost estimator charges for this
   directly (see below), so a slightly longer `RU` solution can beat a shorter one with `F` or a
   rotation.
2. **Back slots early.** Solving back slots first keeps the front slots open, which leaves more of
   the cube in view for the remaining pairs. This matters most for intermediate solvers and early in
   F2L. It's a tie-break rule: it only applies when two pairs cost about the same.

## What exists to build on

| Piece | Where | Use for F2L review |
|-------|-------|--------------------|
| `F2LScoreIndex.bestPairScore` | `f2lPairLookup.ts` | Fastest known alg for one pair from a given state, with AUF. The core lookup. Its query only pins the cross, solved pairs, and the target pair, so candidate algs are already free to disturb unsolved slots. |
| `buildF2LPairQueries` | `f2lPairLookup.ts` | One query per unsolved pair. Already has `isZBLSrelevant` and the current EO value. |
| `findBestContinuation` / `bestContinuationScore` | `crossContinuations.ts` | Best next pair after a state. Already used by the cross review for one-pair lookahead. |
| `analyzeF2lPair` | `f2lIntuitiveDetection.ts` | Per-pair facts: where the pieces are, whether they touch, min moves for a top-layer pair (depth 4). Good for "free pair", "made pair", and "pieces stuck in a slot" rules. |
| `f2lLabeling.ts` | `composables/algs` | Splits an F2L alg into keyhole / commutator / conjugate groups. Can tell us whether the user's moves were a keyhole. |
| `reviewRedundantMoves` | `redundantMoves.ts` | U U', y y', and similar. Already feeds `ReviewFeedback.redundancy`. |
| `AlgSpeedEstimator` | `AlgSpeedEstimator.tsx` | Stays as-is for F2L autocomplete ranking. Not used for review costs. |
| `StepInfo` (`pair` / `multislot`) | `getLineStepInfo.ts` | Which pairs a line solved, from `colors` and `f2lSlotList`. Doesn't tell F2L from ZBLS. |

`bestPairScore` checks one angle and ranks by `AlgSpeedEstimator`. The review needs the best cost per
pair across the four `y` angles, ranked by the new estimator. Either add a scoring parameter to the
index or give the review its own lookup over `matchingDocIndices`.

## F2L cost estimator (new)

A separate estimator for review costs. `AlgSpeedEstimator` keeps serving autocomplete, where it's
already tuned well enough. The new one returns an estimate in seconds so losses can be shown and
compared across rules.

It needs to model:
- **Base turn cost** per move, by face and amount, like the old estimator.
- **Lookahead cost.** Extra cost per move by move set: none for `R U L D`, some for `F`, more for
  everything else. This is the main difference from the old estimator.
- **Rotations.** `y` / `y'` / `y2` get a real cost. The old estimator scores `y` as 0.
- **Regrips.** At least a rough charge for sequences that force a regrip.
- **Move set changes.** Switching between generators costs time (the old estimator does this with
  `1.2 ** generatorCount`; revisit whether that shape is right).

**OPEN:** where the numbers come from. Starting point: hand-tune against the fixture set so that the
estimator ranks known alg pairs the way the project owner would.

## Architecture

### F2L phase analysis runs before the line pass

Pair choice can't be judged one line at a time, because it compares the pair the user chose against
the pairs they didn't. So one function analyzes the whole F2L phase up front, the same way
`findCrossLine` runs before the line pass today:

```
reviewSolve
  context.f2l = analyzeF2LPhase(scramble, solutionLines, index, reader)   // new
  line pass: pickLineReview → reviewF2L(line, context.f2l)                // reads the analysis
  solve pass: reviewTakeaways(lineReviews)                                // unchanged direction
```

`analyzeF2LPhase` is input to the line pass, not a third pass. It doesn't read or write reviews.
The one-way rule from `solve-review.md` still holds.

### Segment by cube state, not by line

Users split lines however they like. One pair can take two lines (a setup line, then an insert),
and one line can solve two pairs. The analysis therefore splits the F2L moves into **segments**:
each segment ends when the number of solved pairs goes up. Each segment records:

- the state before it (facelets + hash state)
- the moves (with leading rotation and AUF separated out)
- the pairs solved by it
- which unsolved slots it disturbed, and what was in them before and after
- the line index where it ended

The review for a segment attaches to the line where the segment ended. A line that solves no pair
(a pure setup line) gets no F2L review of its own; its moves are judged as part of the next segment.

Solvers almost never unsolve a solved pair on purpose. If the solved-pair count drops, the segment
gets a `null` review.

### Disturbing unsolved slots

Solvers often move pieces in slots that aren't solved yet. This is frequently the right call:
- A misoriented edge sits in a slot. Disturbing the slot frees it.
- Both pieces of one pair sit in the same slot (their own or another) but not solved. Disturbing the
  slot pulls them out together.
- An empty slot (neither of its own pieces in it) is free to use as a keyhole or to set up a pair.

Disturbing a slot is also how a solver can ruin a setup, e.g. knocking a pair's correctly placed
corner out of its slot. The segment facts track both sides: what the disturbed slots held before,
and whether the next pair got cheaper or more expensive because of it.

### Per-segment facts

For each segment, compute once:

| Fact | How |
|------|-----|
| `userCost` | New estimator on the user's moves in the segment. |
| `bestCostForChosenPair` | Best known alg for the pair the user solved, from the segment's start state, over all angles. |
| `bestCostAnyPair` | Minimum of the above across every unsolved pair. |
| `twoStepUser` | `userCost` + best next-pair cost from the state after the segment. |
| `twoStepBest` | Minimum over unsolved pairs P of (best cost for P + best next-pair cost after P). |
| `freePairs` | Pairs solvable at the segment start in ≤ 4 moves (`analyzeF2lPair.minMoves`), or with a best cost under a threshold. |
| `brokenSetups` | Pairs that were connected or free at the segment start and are no longer after it. |
| `stuckPieces` | Slots holding a misoriented edge, or both pieces of one unsolved pair, at the segment start. |
| `eoAfter` | Number of misoriented LL edges after the segment (last slot only). |

Two-step values are the expensive part: at most 4 pairs × 4 angles × (lookup + 4 pairs × 4 angles).
That's 4 × 4 × 17 ≈ 270 index lookups per segment, cached by query key. Should be fine but measure it.

### Grading a segment

Grade on time lost, in seconds from the new estimator:

```
loss = min(userCost - bestCostForChosenPair, twoStepUser - twoStepBest) + choiceLoss
```

- **Execution loss** (`userCost - bestCostForChosenPair`): how much slower the user's solution was
  than the best known alg for the pair they chose.
- **Choice loss**: how much more the chosen pair cost than the best pair, but forgiven when the
  two-step total says the choice paid off later (principle 5). In practice:
  `choiceLoss = max(0, min(bestCostForChosenPair - bestCostAnyPair, twoStepUser - twoStepBest))`.

Thresholds on `loss` pick the category, like `SCORE_CEILINGS` in `crossReview.ts`. The thresholds are
the same for every solver.

**OPEN:** the exact formula. The version above double-counts in some cases. It's here to show the
shape: execution and choice are separate losses, and both get forgiven by the two-step total.

### Choosing which notes to show

Every rule that fires produces a candidate note with its estimated loss. The segment's grade decides
which kinds of candidates are allowed:

| Segment grade | Allowed notes |
|---------------|---------------|
| `bad` / `okay` | Execution notes (better alg for this pair, missed keyhole, missed short insert). Plus "the <colors> pair looks better" if a different pair was clearly cheaper. No lookahead or tie-break notes. |
| `good` | Execution notes, pair choice notes, free pairs, rotation notes. |
| `great` | Nitpicks: lookahead-friendly move set, back slot first, last slot edge control, lookahead payoff praise. |

Candidates are sorted by estimated loss. Show at most 2 or 3 per line. **OPEN:** exact cap.

The point of the gate: a solver who lost a lot on a pair gets told how to solve that pair, not a
lecture on lookahead. A solver whose pair was already near best gets the small stuff, because that's
all there is to improve.

## Rule catalog

Grouped by how sure we can be. Build in order. "Shown on" lists the segment grades where the note can
appear (see the gate above).

### Group A: execution of the chosen pair (deterministic, ship first)

| Rule | Detect | Note | Shown on |
|------|--------|------|----------|
| Known alg | User's moves (minus leading rotation/AUF) match a database alg for this state | "Matches a known alg" (`great`) | all |
| Slower than known alg | `userCost / bestCostForChosenPair` over a ratio ceiling | "A faster alg exists for this pair", with the alg shown | all |
| Redundant moves | `reviewRedundantMoves` | Existing notes | all |
| Missed keyhole | Best alg is a keyhole by `f2lLabeling`, user's isn't, and costs differ enough | "Missed a keyhole" (link tutorial) | all |
| Missed short insert | Pair had `minMoves ≤ 4` at segment start; user used notably more | "Missed a 3/4-move insert" | all |
| Missed 5-mover | Best alg is a known 5-mover pattern; user used more | "Missed a five mover" | all |

The alg review's pattern (match known alg → great, else compare speed against the best options)
carries over directly.

### Group B: rotations, angle, move set

| Rule | Detect | Note | Shown on |
|------|--------|------|----------|
| Extra rotation | User rotated, and a no-rotation alg from the original angle costs within a small margin | "Could solve this from the front without rotating" | `good`, `great` |
| Back-to-back AUF/rotation | `U y U`, `y U y'` and similar that collapse | Existing redundancy rule, extended for mixed U/y | all |
| Rotation broke EO | User rotated with `y` where `R U L D` moves (no rotation) would have kept the same pair cost | "y2 and RULD would have been fine" | `great` |
| Lookahead-unfriendly moves | User's alg uses `F`, `B`, slices, or wide moves where an `R U L D` alg costs about the same | "An RULD alg here keeps pieces easier to track" | `great` |
| Lefty vs. righty | User's alg is the mirror-hand alg for a case with a common same-hand alg | Callout only, `null` category | `good`, `great` |

### Group C: pair choice and slot use (one step ahead)

| Rule | Detect | Note | Shown on |
|------|--------|------|----------|
| Better pair available | `choiceLoss` over threshold | "<colors> pair looks better" (no further detail) | all |
| Missed free pair | A pair in `freePairs` was ignored, and solving it first gives a lower two-step total | "Missed a free pair: <colors>" | `good`, `great` |
| Broke a setup | A pair in `brokenSetups` ended up costing more because of this segment | "This solution split up the <colors> pair" | `good`, `great` |
| Didn't use a slot | `stuckPieces` or an empty slot existed, and the best alg disturbs that slot and beats the user's solution | "Using the empty slot would have been faster" (link "Using empty slots") | all |
| Freed stuck pieces | User's segment disturbed a slot from `stuckPieces` and the next pair got cheaper | Positive note | `great` |
| Back slot first | Two pairs within a small cost margin, early in F2L, user solved front and left back open | Small note, `good` at worst | `great` |
| Lookahead payoff | User's choice was not the cheapest pair but the two-step total was best | Positive note, `great` | `great` |

### Group D: last slot

Only on the segment that solves the fourth pair.

| Rule | Detect | Note | Shown on |
|------|--------|------|----------|
| Free edge control | An alg with the same or near-same cost leaves fewer misoriented edges or avoids the dot case | "Same cost, better OLL" | `great` |
| Sledge / back sledge insert | Made pair at segment start, sledge/back sledge insert gives cross or avoids dot | "Partial edge control" (link tutorial) | `great` |
| ZBLS | `isZBLSrelevant` and a ZBLS alg costs close to the plain F2L alg | "ZBLS would skip to ZBLL" | `great`, only when the solve shows ZBLL use |

### Group E: deferred

Not worth building until the groups above work:
- Multislot segments. First version gives `null`. Later: compare against the sum of best single
  pairs and only praise, never criticize.
- Anything beyond one pair of lookahead.
- EO-aware pair choice before the last slot (e.g. "this pair choice would have oriented more edges").
  Humans who think this way are rare, and the gain is hard to estimate.

## Validating "best pair"

### Test fixtures (primary)

The project owner labels the cases. Each fixture holds:
- scramble and moves up to the start of the segment
- the user's segment
- expected segment grade
- pairs the labeler considers acceptable choices
- notes that must appear, and notes that must not appear

The test runs the analysis and checks all of the above. Start with 20 to 40 cases taken from real
recons where the right answer is clear, and add one every time a wrong note turns up.

**OPEN:** file format. It needs to be easy to write by hand. A recon URL plus a few labeled fields
is probably enough, since recon URLs already carry scramble and solution.

### Professional recons (secondary)

Pros use multislot, intentional setups, and lookahead we don't model, so their choices aren't ground
truth for one-step rules. Use them as a **false positive detector and threshold calibration**: run the
review over a few hundred pro solves, and hand-check every `bad` or `okay` segment. Each one is
either a real mistake or a rule bug. The loss distribution on pro solves also tells us where to put
the `great` ceiling.

Blocked on permission. See the warning at the top. Don't fetch this data; wait for it to be
supplied.

### No learned model

Don't fit a model to the data. The dataset is too small and noisy, and a learned score can't explain
its notes, which is the whole point of the review.
