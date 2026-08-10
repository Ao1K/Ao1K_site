# Move parsing

Notes on how move tokens are parsed across the codebase, and where that parsing is duplicated. Written as a reference while a proper unification is still pending.

## Token shape

A move token is a base letter plus an optional suffix.

- base: `U D F B L R` (faces), `u d f b l r` (wide), `M E S` (slices), `x y z` (rotations)
- suffix: an optional turn count (`2` or `3`, default `1`) followed by an optional `'` for counterclockwise. Valid suffixes: `''`, `'`, `2`, `2'`, `3`, `3'`.

`3` is a legal quarter-turn count. `R3` equals `R'`, and `R3'` equals `R`. The recon text input treats these as valid moves, so any code that parses tokens must accept them.

## Where parsing lives (the problem)

There is no single parser. Each site re-implements suffix handling, and they have drifted:

- `composables/algs/algMoves.ts` — `amountOf` / `suffixOf`, used by `rotateAlgByY` and re-exported `tokenize`. Signed quarter-turn model.
- `composables/algs/classifyAlg.ts` — `MOVE_RE` regex gate plus `invertToken`. If a token fails the regex the whole alg is classified `unknown`, so the icon/step never resolves.
- `composables/algs/f2lLabeling.ts` — its own `amountOf`, normalized mod-4, used by `areInverse` for trigger/cancellation detection.
- `composables/recon/SimpleCube.tsx` — the cube simulator. This one already normalizes `3`, `3'`, `2'` down to base modifiers, so it is the most complete.
- `composables/recon/validateTextInput.tsx` — `validateMove` uses an explicit enumerated `validMoves` list (includes the `3` forms).

## Known scope / gotchas

- A missing suffix case fails silently and differently at each site: `algMoves` mislabels the amount, `classifyAlg` drops the alg to `unknown`, `f2lLabeling` mislabels the step breakdown. There is no shared test guarding all of them.
- `validateMove` is a hand-maintained enumerated list. Adding a base letter or notation there does not propagate to the parsers above.
- Wide-move `w` notation (`Rw`, `Uw`) is not handled anywhere; only lowercase wides (`r`, `u`) are supported.

## The fix we want later

Unify on one tokenizer/parser (base letter + signed amount) and have every site consume it, replacing the per-file `amountOf`, the regex, and the enumerated `validMoves` list. Tracked as future work; not done yet.
