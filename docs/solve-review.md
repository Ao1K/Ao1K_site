# The Solve Review System

The solve breakdown grades a reconstruction line by line and summarizes the whole solve in a
Key Takeaways section. The entry point is `reviewSolve` in `composables/recon/solveReview.ts`. It
returns a `SolveReview`: a map from line index to `LineReview`, plus one `takeaways` object for
the whole solve. `startBreakdown` (`breakdownTransition.ts`) attaches each line's review to its
row and passes `takeaways` through the breakdown session to `SolveBreakdown.tsx`.

## Two passes

The review runs in two passes. The **line pass** visits every line with moves and gives it at
most one review. `pickLineReview` decides which kind, in this order: AUF (the last layer was
already done before the line), cross (the line found by `findCrossLine`), F2L (step type `f2l`),
then alg (step type `last layer`, or a line that finishes a named LL case). Each kind has its own
module: `aufReview.ts`, `crossReview.ts`, `f2lReview.ts`, `algReview.ts`. `reviewLine` wraps the
pick with checks that need solve context but still belong to one line. Today that is the Wrong AUF
check on the final line, which adds a note and grades the line `bad`.

The **solve pass** (`reviewTakeaways`) receives the finished line reviews and produces the
takeaways. It only reads line reviews and never changes them. Anything shown on a line is decided
in the line pass; anything about the solve as a whole is decided in the solve pass. Keeping that
direction one-way means the passes can't depend on each other's ordering.

## Shared shape

Every review extends `ReviewFeedback` (`components/recon/FeedbackNotes.tsx`): a `category`
(`great`, `good`, `okay`, `bad`, or `null` when no grade can be given) and a list of `notes`. Code
that only needs the grade or the notes, such as the breakdown labels, the Wrong AUF check, and the
solve pass, works on any review without switching on its kind. Kind-specific data (cross picks,
alg suggestions) lives on the subtype and is read only by that kind's feedback component.

`ReviewFeedback` also carries optional structured results that the solve pass can aggregate
without parsing note text. Currently that is `redundancy` (from `reviewRedundantMoves` in
`redundantMoves.ts`), filled by the alg and AUF reviews. Add a new field there only when the solve
pass needs to count or filter something across lines.

## Display

`SolveBreakdown.tsx` shows a line's feedback box only when its review has notes, and shows the
grade label when there are notes or a category. A line with a clean review (for example a correct
AUF) shows its grade with no box. The feedback component for each kind lives in
`components/recon/*ReviewFeedback.tsx`.
