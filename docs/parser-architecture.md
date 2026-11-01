# Parser architecture

## Goal

All move notation goes through one module, the Parser. No file outside it reads characters
of a move, splits alg strings, or keeps its own move tables. Code outside the Parser works
with typed `Move[]` arrays and calls Parser operations.

The Parser takes a puzzle id. Only `'3x3'` exists now. The design must let a later puzzle
bring its own notation (`2R`, `3Rw`, `R--`, or `r2` with a different meaning on 4x4) without
touching the code that consumes moves.

When this is done, `docs/move-parsing.md` is obsolete and gets deleted.

## Decision 1: a move is a typed string

```ts
type TurnLayer3x3 =
  | 'U' | 'D' | 'R' | 'L' | 'F' | 'B'
  | 'u' | 'd' | 'r' | 'l' | 'f' | 'b'

type SliceOrRotation3x3 = 'M' | 'E' | 'S' | 'x' | 'y' | 'z'

type Layer3x3 = TurnLayer3x3 | SliceOrRotation3x3

export type Move3x3 =
  | `${TurnLayer3x3}${'' | "'" | '2' | "2'" | '3' | "3'"}`
  | `${SliceOrRotation3x3}${'' | "'" | '2' | "2'"}`
```

This replaces `CubeMove` from `components/learn/cubeProps.ts`. `CubeSceneLine.moves` keeps
its shape: `(Move3x3 | Move3x3[])[]`.

`3` suffixes are valid only on face and wide moves. This matches the editor's current
`validMoves` list and `docs/cubing-term-definitions.md` (`x3` is not a valid rotation).
`CubeMove` allowed `x3` and `M3`; `Move3x3` does not. Each class (face, wide, slice,
rotation) maps to itself under invert, mirror, and rotate, so no transform can produce an
invalid move.

Why a template-literal string instead of an object like `{ layer, amount }`:

- The 3x3 move set is finite (12 layers × 6 suffixes + 6 layers × 4 suffixes = 96 values). Every transform (invert,
  mirror, rotate) becomes one table lookup, with tables generated once at module load.
- `===` equality, `Set`/`Map` keys, React deps, and JSON all work with no helpers.
  `SimpleCube.calcStrategy`, the alg compiler's dedupe sets, and the scene data island all
  rely on this today.
- Lesson authors keep writing `["R", "U'"]` with full type checking.
- No per-move allocation in hot loops (alg compiler, suggestion search, keystroke parsing).

The rule that makes this safe: a `Move3x3` is opaque outside the Parser. Nothing outside
the Parser indexes into it (`move[0]`, `move.slice(1)`, regex). It asks the Parser
(`layer(move)`, `amount(move)`, `geometry(move)`).

No brand type. A brand would break literal authoring in lessons. Function signatures that
take `Move3x3[]` instead of `string` are what force callers through `parse`.

### Amount model

`amount(move)` is the signed quarter-turn count as written:
`R` 1, `R'` -1, `R2` 2, `R2'` -2, `R3` 3, `R3'` -3.

The written form is kept because the editor must round-trip what the user typed (`R3`
stays `R3`) and the animation uses the sign of a half turn.

Suffix rule for every transform and edit: the turn count (`2`, `3`) and the prime stay as
written. Rotating `R2'` gives a `2'` move. Rotating `R3` gives a `3` move. Operations that
reverse turn direction (invert, mirror) toggle the prime the same way they turn `R` into
`R'`: `R2'` inverts to `R2`, `R3` inverts to `R3'`. No operation drops a prime or rewrites a
`3` as a side effect. `turns(move)` gives the
mod-4 value in `{1, 2, 3}` for code that compares effects. `normalize(moves)` rewrites to
`'' | "'" | '2'` when a caller wants canonical output.

## Decision 2: two layers

| Layer | Knows about | Does not know about |
|---|---|---|
| Parser (`utils/parser/`) | Puzzle notation, move geometry, sequence transforms | HTML, comments, parens/reps, caret, DOM |
| Editor document (`composables/recon/editorDocument.ts`) | Recon text syntax: comments, `( ... )N` groups, hashtags, lines, caret offset, painting | What makes a token a valid move |

The editor document asks the Parser whether a token is a move. The Parser never sees HTML.

## Parser module

```
utils/parser/
  index.ts       PuzzleId, Parser and CubeParser interfaces, getParser()
  cube3x3.ts     Move3x3, Layer3x3, geometry table, generated transform tables, the 3x3 parser
```

`cube3x3.ts` imports nothing from the app. It must stay a leaf module so it can be pulled
into any bundle at near-zero cost.

### Interfaces

```ts
export type PuzzleId = '3x3'

type PuzzleMoves = { '3x3': Move3x3 }
export type Move<P extends PuzzleId> = PuzzleMoves[P]

export type Amount = 1 | 2 | 3 | -1 | -2 | -3
export type Metric = 'htm' | 'qtm' | 'stm' | 'etm'

export type ParseResult<M> = { moves: M[]; invalid: string[] }

export interface Parser<M extends string, L extends string> {
  readonly puzzle: PuzzleId
  parse(text: string): ParseResult<M>
  parseTrusted(text: string): M[]
  parseMove(token: string): M | null
  format(moves: readonly M[]): string
  layer(move: M): L
  amount(move: M): Amount
  turns(move: M): 1 | 2 | 3
  make(layer: L, amount: Amount): M
  invert(moves: readonly M[]): M[]
  combine(moves: readonly M[]): M[]
  normalize(moves: readonly M[]): M[]
  count(moves: readonly M[], metric: Metric): number
}

export type Axis = 'x' | 'y' | 'z'
export type Geometry = { axis: Axis; layers: readonly number[]; sign: 1 | -1 }

export interface CubeParser<M extends string, L extends string, R extends M> extends Parser<M, L> {
  geometry(move: M): Geometry
  isRotation(move: M): move is R
  mirror(moves: readonly M[], plane: 'M' | 'S' | 'E'): M[]
  rotate(moves: readonly M[], rotation: R): M[]
  simplifyRotations(rotations: readonly R[]): R[]
}

export function getParser<P extends PuzzleId>(puzzle: P): CubeParser<Move<P>, ...>
```

- `Parser` holds what every puzzle has. `CubeParser` adds what only cubic puzzles have
  (axes, M/S/E mirrors, x/y/z rotations). A future megaminx parser implements `Parser` only.
- `parse` splits on whitespace and accepts aliases. The 3x3 parser accepts `Rw` (any face
  plus `w`) as an alias for the lowercase wide move: `Rw'` parses to `r'`. Aliases are
  per-puzzle; other puzzles do not inherit this one. `format` joins with single spaces and
  always emits the canonical spelling.
- `parseTrusted` splits on whitespace and casts with no validation. It is only for compiled
  alg JSON in `public/recon`, which the alg compiler validates when it writes it (see
  Phase 4).
- `combine` merges adjacent same-layer moves and drops cancellations. It replaces
  `moveUtils.combineMoves`, including its rule that an unmerged move keeps its written form.
- `count` replaces ad-hoc counting such as the `/[^xyz2']/` filter in `_PageContent.tsx`.
- Code where the puzzle is fixed imports the 3x3 parser directly
  (`import { cube3x3 } from 'utils/parser/cube3x3'`). `getParser` is for places where the
  puzzle is a runtime value. Direct import keeps other puzzles out of the bundle later.

### One source table, everything else generated

`MOVE_TABLE` in `utils/cubeMoves.ts` already gives each layer letter an axis, a layer list,
and a base sign. Move it into `cube3x3.ts` as the geometry table. Generate from it at load:

- invert table: `amount → -amount`
- mirror tables for M, S, E: reflect the geometry across the plane, look up the letter with
  the reflected axis and layers, negate the amount
- rotate tables for x, y, z: apply the rotation matrix to the geometry, look up the letter,
  keep the amount. Direction matches `replacementTable_X/Y/Z` in `transformHTML.tsx`:
  `rotate(moves, 'y')` maps `F → L`, `M → S'`, `x → z`
- rotation group (24 orientations) for `simplifyRotations`, replacing the matrix search in
  `simplifyRotations.tsx`

This deletes the six hand-written move tables in `transformHTML.tsx`, `Y_QUARTER` in
`algMoves.ts`, the enumerated `validMoves` list, and every `MOVE_RE`.

### Parity check before deleting old code

Add `scripts/verifyParser.ts` (and a `verify-parser` package script). It compares the
generated tables against the current hand tables (`replacementTable_M/S/X/Y/Z`, `Y_QUARTER`,
`reverseMove`, `invertToken`, `moveUtils.parseMove`) for all 96 moves, then the old code
is removed. Known differences the script must allow:

- `replacementTable_X/Y/Z` drop the `'` from `2'` when the letter changes (`U2'` → `B2`).
  `rotate` keeps it (`U2'` → `B2'`).
- `Y_QUARTER` relabels in the opposite direction to the table. Compare it against
  `rotate(moves, "y'")`, except for `x`, `z` (`Y_QUARTER` leaves them unchanged; `rotate`
  relabels them) and `3` suffixes (`Y_QUARTER` rewrites `R3 → F'`; `rotate` keeps `3`).

## Editor document

Replaces `validateTextInput.tsx` (the `MovesParsing` char array), `validationToMoves.tsx`,
and the span-regex half of `transformHTML.tsx`.

```ts
type Segment<M> =
  | { kind: 'move'; move: M; start: number; end: number; depth: number }
  | { kind: 'invalid'; text: string; start: number; end: number }
  | { kind: 'comment'; text: string; start: number; end: number }
  | { kind: 'open' | 'close'; depth: number; start: number; end: number }
  | { kind: 'reps'; count: number; start: number; end: number }
  | { kind: 'hashtag'; text: string; start: number; end: number }
  | { kind: 'space'; start: number; end: number }

parseLine(text: string, parser): Segment<M>[]
expandLine(segments): M[]
paintLine(segments, highlightMoveIndex?): string
```

- Input is one line of plain text plus a caret offset, not HTML. The editor currently
  re-parses its own painted spans as `stylingHTML`; reading `textContent` per line removes
  that whole branch, along with the `&nbsp;` / entity handling and the `caretNode` span
  placeholders.
- Token boundaries: the document reads a run of non-space, non-syntax characters and calls
  `parser.parseMove(run)`. Valid → `move` segment, else `invalid`.
- `expandLine` replaces `degroup` / `expandGroup` and keeps the `MAX_3X3_REPS` and
  `maxMoves` limits.
- The auto-substitutions in `MovesTextEditor.tsx` (`XX → x2`, `NN → N2`, missing spaces) are
  notation rules. `Rw → r` is handled by the parser alias instead. Move their move knowledge into the Parser as
  `inputRules: { pattern, replacement }[]` on the 3x3 parser. The editor applies whatever
  rules the active parser provides.

### Transforms (mirror, rotate, invert, remove comments)

The editor's `setContent` already accepts plain text. New flow:

1. Map the DOM selection to a line range and character offsets.
2. `parseLine` each selected line. Collect the selected `move` segments.
3. Apply the Parser transform to their `Move[]`.
4. Write the result back as plain text, then let the normal input path repaint.

Two write-back shapes:

- Same length (mirror, rotate relabel): replace each move segment in place. Comments,
  parens, and spacing stay where they were.
- Different length (invert, rotation prefix): invert replaces the selected moves with the
  inverted run and drops non-move segments, as today. Rotate also rewrites the leading
  rotation run of the first selected line to
  `simplifyRotations([rotation, ...existingLeadingRotations])`.

`transformHTML.tsx` shrinks to these thin functions or is deleted in favor of functions in
`editorDocument.ts`.

## Where strings remain

Strings are allowed only at boundaries, and each boundary converts with `parse` / `format`
once:

- Persisted data: raw alg JSON in `utils/`, favorites (local and backend), URL params,
  cookies. These use `parse`.
- Compiled alg JSON in `public/recon`. This uses `parseTrusted`.
- Editor text (via the editor document).
- External tools: the Kociemba solver in `setupMoves.ts` and `cubeSolver.worker.ts`,
  `cubing/scramble` output.
- Lesson `lines` need no conversion: the literals are already `Move3x3`. Lesson `scramble`
  props (in `notation.tsx`, `eo.tsx`, `what-to-learn.tsx`, and `CubeImage`) stay
  space-separated strings and go through `parse` like every other user input. An invalid
  move throws instead of being skipped. Lessons render on the server, so a typo fails the
  dev page and the build. Update the `scramble` doc comment in `cubeProps.ts` to match.
- Alg case data in `utils/llCases.tsx`, parsed where `LLpatternBuilder.tsx` reads it.

These stay strings and need no Parser change, because they handle whole editor text or
display text rather than moves:

- `composables/recon/urlEncoding.tsx` encodes the full editor text, comments included
  (`'` → `-`, space → `_`).
- `composables/recon/cubeImageCapture.ts` `wrapSetupMoves` word-wraps already formatted
  text for a canvas.
- `app/notimer/page.tsx` and `components/notimer/NoTimeSolveBox.tsx` show `cubing/scramble`
  strings without parsing them.
- `composables/recon/ScreenshotManager.ts` lays out scramble and solution text for an image.
- `components/changeblog/CubeGraphic.tsx` passes an alg string to the external
  `sr-puzzlegen` library, used only by the old `ReconstructV04.tsx` changeblog post.

Internal state switches from `string` / `string[]` to `Move3x3[]`. The main one is
`allMovesRef: string[][][]` in `_PageContent.tsx`, which becomes `Move3x3[][][]`.

### Alg records

Many records carry an alg as `alg: string` and use it both as moves and as a key:
`Doc.alg` (`ExactAlgSuggester.tsx`), `Suggestion.alg` (`SimpleCubeInterpreter.tsx`),
`KnownLLAlg.alg` (`algReview.ts`, `LLsuggester.tsx`), `FavoriteAlg.alg` (`algFavorites.ts`),
and `savedAlgKey` (`suggestionRanking.ts`). Readers include `SuggestionManager.tsx`,
`SuggestionBox.tsx`, `SuggestionCard.tsx`, `f2lSuggestions.tsx`, `AlgReviewFeedback.tsx`,
`ReviewAlgButtons.tsx`, `YourAlgsList.tsx`, `YourAlgCard.tsx`, `f2lSearch.tsx`,
`algIcon.ts`, and `algKeywords.ts`.

Rule: records hold `moves: Move3x3[]`. Map and set keys stay strings and are built from the
moves with Parser operations plus `format`, never by editing an alg string.

- Compiled docs get `moves` from `parseTrusted` at load. Favorites stay strings in storage
  and get `parse` on load and `format` on save.
- `parseTrusted` maps each token through the 96-entry move table, so every array shares
  the same 96 string instances instead of holding its own copies.
- Build a record's key once and reuse it. `savedAlgKey` is currently recomputed on every
  call, twice per suggestion in `dedupeByAlgsetPriority`. Cache it in a `WeakMap` keyed by
  the moves array, or store it on the record when the record is created.
- `savedAlgKey` itself becomes: drop leading `U`/`y` moves (`layer`), compare half turns
  by `turns` instead of stripping `2'` with a regex, strip the trailing AUF, then `format`.

## Cube runtime constraint

`utils/cubeSceneRuntime.client.ts` imports `utils/cubeMoves.ts` for `stateFromFacelets`.
Move `MOVE_TABLE` into the Parser and `parseMoveRotation` out of `cubeMoves.ts` (its only
callers are `cubeSceneAuthoring.ts` and `reconCube.ts`). The facelet helpers stay in
`cubeMoves.ts`, so it never imports the Parser, the runtime bundle does not grow, and the
facelet importers (`cubeSceneIsland.ts`, `HtmlImageDialog.tsx`, `CubeAnglePreview.tsx`,
`SettingsCubePreview.tsx`, `devActions.ts`, `CubeImage.tsx`) need no import changes. Moves reach the
runtime as `RotationInfo` built server-side in `cubeSceneAuthoring.ts`, so the runtime does
not need the Parser. Run `pnpm build-cube-runtime` and `pnpm verify-cube-parity` after this
phase.

## Migration inventory

Each phase leaves the app working. Within a phase, change a function's signature to take
`Move3x3[]` and let type errors list the callers.

A signature change in one phase breaks callers that belong to a later phase (for example,
`SimpleCube.getCubeState` changes in Phase 1, but `_PageContent.tsx` moves in Phase 2a).
Bridge those callers at the call site: wrap the old string or `string[]` in `parse` (user
text) or `parseTrusted` (compiled data), and use `format` where a migrated function returns
moves to an unmigrated caller. Each bridge is removed when its file's own phase lands. The
work is done when no bridge is left.

### Phase 0: Parser

- Create `utils/parser/index.ts`, `utils/parser/cube3x3.ts`.
- Create `scripts/verifyParser.ts` and run it.

### Phase 1: core logic (no UI)

| File | Change |
|---|---|
| `composables/recon/SimpleCube.tsx` | `getCubeState(moves: Move3x3[])`. Delete local `Move` / `PermissiveMove` types, `parseMoves`, `simplifyMoves`, `getInverseMove`. Switch on `layer` and `turns`. |
| `utils/cubeMoves.ts`, `composables/recon/reconCube.ts` | `parseMoveRotation` uses `geometry` and `amount`. Drop the `'3'` string handling in `reconCube.ts`. |
| `utils/cubeSceneAuthoring.ts`, `components/learn/cubeProps.ts` | Use `Move3x3`. Delete `SceneMove`, `CubeMove`. Parse `scramble` once. |
| `utils/moveUtils.ts` | Delete. Callers use `combine`, `amount`, `make`. |
| `composables/recon/simplifyRotations.tsx` | Delete. Callers use `simplifyRotations`. |
| `composables/algs/algMoves.ts` | Delete `tokenize`, `MOVE_RE`, `invertToken`, `amountOf`, `suffixOf`, `Y_QUARTER`. Keep AUF helpers, rewritten on `Move3x3[]` with `geometry` / `isRotation`. Delete `rotateAlgByY`. `ClickableCube.playAlg` calls `rotate` with the inverse y rotation for its `yTurns`, since `rotate` follows the editor's direction. |
| `composables/algs/classifyAlg.ts` | Take `Move3x3[]`. The `MOVE_RE` gate moves to the caller's `parse`. |
| `composables/algs/f2lLabeling.ts` | Delete `baseOf`, `magnitudeOf`, `amountOf`. Use `layer`, `turns`. |
| `composables/algs/multislotSlots.ts`, `f2lIsoIcon.ts` | Use `invert`, `layer`. |
| `composables/recon/setupMoves.ts` | Delete rotation-table walking and `expandSliceOrWideMove` string math. Use `rotate`, `geometry`. Strings only at the Kociemba call. |
| `composables/recon/redundantMoves.ts`, `faceletCube.ts` | Use Parser instead of `moveUtils`. |
| `composables/recon/crossAutocomplete.ts`, `crossReview.ts`, `crossContinuations.ts`, `f2lPairLookup.ts` | Replace `move[0]`, `slice(1)`, `/^[xyz]/` with `layer`, `amount`, `isRotation`, `geometry().axis`. |
| `utils/canonicalizeAuf.ts`, `utils/collapseAufVariants.ts` | Same. |
| `composables/recon/f2lIntuitiveDetection.ts` | Delete `quarterCountOf` and the `token[0]` lookup in `permOf`. Key permutations by `layer` and `turns`. `applyMove` takes `Move3x3`. |
| `composables/recon/crossSolver.ts` | `moves: string[]` and `SEARCH_FACES` become `Move3x3`. |
| `composables/recon/SimpleCubeInterpreter.tsx` | `filterOverlongAlgorithms`: `countMoves` uses `count`, `toMoves` (strips `2'` with a regex) uses `turns` for comparison, `isHalfOfDouble` uses `layer` / `turns`. `applyHandednessModifier` (`/[Rr]/`, `/[Ll]/` on the alg string) uses `layer`. |
| `composables/recon/AlgSpeedEstimator.tsx` | `calcScore` and `eoRegex` use `layer` and `amount`. The suffix-keyed `moveTypeWeights` keys off `amount`. |
| `composables/recon/LLsuggester.tsx` | `TRAILING_ROTATIONS` regex, `AUF_PREFIX`, `POST_AUF` become `Move3x3` arrays and `isRotation`. |
| `composables/recon/suggestionRanking.ts` | `LEADING_SETUP` regex becomes a leading run check with `layer` / `isRotation`. |
| `composables/recon/aufReview.ts`, `algReview.ts` | `AUF_MOVES` and `moves: readonly string[]` become `Move3x3`. |
| `composables/recon/redundantMoves.ts` consumers: `components/recon/AlgReviewFeedback.tsx`, `FeedbackNotes.tsx` | `MoveGroup.moves` becomes `Move3x3[]`. |
| `composables/algs/algFavorites.ts` | `aufFreeAlg` and the favorite helpers follow the rule in Alg records. |
| `components/learn/CubeImage.tsx` | Same scramble handling as `cubeSceneAuthoring.ts`. |
| `utils/cubeSceneJsx.ts`, `app/devActions.ts` | Follow the `SceneMove` / `AuthoredLine` type change. |

### Phase 2a: recon editor and player on the Parser

Keeps the `MovesParsing` char array and the HTML input path.

| File | Change |
|---|---|
| `composables/recon/validateTextInput.tsx` | Delete the `validMoves` list. `validateMove` calls `parseMove`. |
| `composables/recon/validationToMoves.tsx` | Tokens become `Move3x3`. |
| `composables/recon/transformHTML.tsx` | Delete the tables, `reverseMove`, and the rotation-prefix regex. Moves inside valid spans go through `invert`, `mirror`, `rotate`, `simplifyRotations`. Span handling stays for now. |
| `components/recon/MovesTextEditor.tsx` | Auto-substitutions read `inputRules` from the parser. Drop the `Nw → n` rule (the parser alias covers it). Emit `Move3x3[][]`. |
| `components/recon/_PageContent.tsx` | `allMovesRef` typed `Move3x3[][][]`. Replace `.join(' ')` keys with `format`. Use `count`. |
| `components/recon/CubePlayer.tsx` | Moves held as `Move3x3[]`, not split strings. The single-move-change `switch` on suffix pairs becomes `make(layer, amount(after) - amount(before))`. |
| `components/recon/ScrambleDropdown.tsx`, `ManualAlgVerifier.tsx`, `HtmlSceneDialog.tsx`, `CubeGifDialog.tsx`, `CrossReviewFeedback.tsx`, `SolveBreakdown.tsx`, `IconStack.tsx`, suggestion components | Take `Move3x3[]` props. |
| `components/recon/LineConfigItem.tsx` | `moves: Move3x3[]`. The preview uses `format`. |
| `components/algs/AlgTextEditor.tsx`, `composables/algs/useAlgDraft.ts` | The algs page alg input is a `MovesTextEditor`, so it moves with the editor. `useAlgDraft` takes the editor's `Move3x3[][]` instead of joining and re-tokenizing strings. |

### Phase 2b: editor document

Replaces the char array with `Segment[]` and the HTML input path with plain text per line.

| File | Change |
|---|---|
| `composables/recon/editorDocument.ts` | New. |
| `composables/recon/parseMovesText.ts`, `app/api/og/route.tsx` | Both read editor text with `validateTextInput` and `validationToMoves`. Move them to `parseLine` / `expandLine` before those files are deleted. The OG route's `/[^xyz2']/` STM count uses `count`. |
| `composables/recon/validateTextInput.tsx`, `validationToMoves.tsx` | Delete. |
| `composables/recon/transformHTML.tsx` | Delete the span regex. Transforms follow the flow in Transforms. |
| `components/recon/MovesTextEditor.tsx` | Use `parseLine` / `expandLine` / `paintLine`. |

### Phase 3: algs page

`composables/algs/importFavorites.ts` (CSV import is user input: `parse`, and report
invalid rows), `exportFavorites.ts`, `components/algs/f2lAlgCard.tsx`, `ClickableCube.tsx`,
`YourAlgsList.tsx`, `YourAlgCard.tsx`, `AddAlgRow.tsx`, `AlgIcon.tsx`, `f2lSearch.tsx`
(`handlePlay`), `components/recon/ReviewAlgButtons.tsx` (copy uses `format`). Favorites
stay strings in storage; parse on load, format on save.

### Phase 4: compiler and scripts

`utils/algCompilerCore.ts` (42 string-handling sites), `utils/LLpatternBuilder.tsx`,
`scripts/mirrorAlgs.ts`, `scripts/generateYMoveAlgs.ts`, `scripts/verifyAufReconstruction.ts`,
`scripts/ingestZBLL.ts`, `scripts/generateF2lPairDistances.ts` (`SEARCH_TOKENS` template
strings), `scripts/benchCubeFrame.browser.ts`, `scripts/verifyCubeFrameParity.ts`,
`tests/autocompleteSolve.ts`, `tests/f2lLabelSnapshot.ts`.

The compiler reads raw alg JSON with `parse` and throws if `invalid` is non-empty, naming
the alg and the bad token. It never skips or filters a bad token. This is what makes
`parseTrusted` safe at load time.

Diff `public/recon` after
`pnpm compile-algs all`. The only allowed differences are `2'` moves that keep their prime
where the old `replacementTable_Y` dropped it (the compiler's y2 relabel of yRU/yLU algs).

### Checking and verification

Add a lint rule to check for parsing done outside of this new architecture. 
For example, it should check for using .split(' ') or grabbing move[0] without the Parser.
Keep this lint rule around after all work is done.

### Docs to update

- `docs/package-scripts.md`: add `verify-parser`.
- `docs/auf-canonical-search.md`: it describes prepending through `combineMoves`; point it
  at `combine`.
- `docs/move-parsing.md`: delete.

### Regression checks per phase

- `scripts/verifyParser.ts` (phase 0 onward)
- `tests/f2lLabelSnapshot.ts` (phase 1)
- `pnpm verify-cube-parity` (phase 1)
- `public/recon` diff after compile (phase 4)

## Future puzzles

A new puzzle adds a file next to `cube3x3.ts` and an entry in `PuzzleMoves`. Example shape
for 4x4:

```ts
type Move4x4 =
  | `${'' | '2' | '3'}${Face}${'' | 'w'}${Suffix}`
  | `${WideLetter}${Suffix}`
  | `${Rotation}${Suffix}`
```

Code that only rearranges moves (invert, combine, format, count) works unchanged through
`Parser`. Code that depends on meaning (simulators, renderers, step detection) is
per-puzzle. Square-1 uses parentheses in its notation, which conflicts with the editor's
`( ... )N` group syntax; the editor document will need the parser to claim tokens before the
group scanner runs. Not needed for 3x3.
