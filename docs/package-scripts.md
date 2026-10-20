# package.json scripts

One entry per `pnpm <script>`. Each lists what it reads, what it writes, and when to run it, so the script source doesn't need to be opened. "Writes" means files on disk that change; check them before running if they have uncommitted edits.

Custom scripts run through `npx tsx` from the project root. Paths below are relative to the root.

Next.js scripts aren't listed here.

## Alg data pipeline

The alg pipeline flows from source data (`utils/raw*data.json`, `utils/ZBLL.xlsx`) through `ingest-zbll` and `mirror-algs` into `compile-algs`, which produces `public/recon/compiled-*-algs.json`. `utils/rawAlgs.tsx` imports every raw JSON file and has usage notes at the top. The suggestion engine and the `/algs` pages read the compiled files at runtime.

### `ingest-zbll`
`scripts/ingestZBLL.ts`. Reads `utils/ZBLL.xlsx` (JuJu's ZBLL spreadsheet) with its own zip/XML parser, so no xlsx dependency is needed. For every sheet with a "3x3 algorithms" header, it collects the cells and cell notes below that header. Each line gets cleaned: the text after `/`, `*annotations*`, brackets, odd unicode spaces and apostrophes, and leading U moves are all removed. Lines that parse as move sequences are deduplicated. **Overwrites `utils/rawZBLLdata.json`.** Run `mirror-algs` on that file afterward.

### `mirror-algs <path>`
`scripts/mirrorAlgs.ts`. Takes one required argument: a raw LL file such as `utils/rawZBLLdata.json`, `rawOLLdata.json`, or `rawPLLdata.json`. It M-mirrors each alg and sorts the result into righty and lefty lists. An alg with no L moves is righty. A lefty alg is flipped to righty when its mirror qualifies. An alg using both sides goes into both lists in both orientations. It appends the step's `frequentLefty` algs from `utils/frequentLeftAlgs.json` (step name comes from the file name), then dedupes after normalizing `2'`, `3`, and `3'` suffixes, and sorts. **Writes `<base>_righty.json` and `<base>_lefty.json` next to the input.** Works on plain strings and on `{value}` objects.

### `compile-algs [types...] [--dry-run]`
`scripts/compileAlgs.ts`. Wraps `compileAlgs` in `utils/algCompilerCore.ts`. Types are `f2l zbls oll pll zbll`, and passing none or `all` compiles every type. Input is the raw data through `utils/rawAlgs.tsx` (generic, plus the LL `_righty`/`_lefty` lists). It writes:
- `public/recon/compiled-<label>-algs.json`, the runtime data (labels such as `f2l`, `zbls`, `oll-righty`, `zbll-lefty`)
- `scripts/output/new_<label>_algs.json`, with algs marked `"new": true`, for review
- `scripts/output/repaired-<label>-algs.json`, the raw input after repairs

`--dry-run` lists the paths that would be written and writes none of them. Run it after any change to raw alg data or to the compiler, suggester hashing, or AUF canonicalization. Can be slow for `zbll`.

### `y-move-algs`
`scripts/generateYMoveAlgs.ts`. Generates F2L candidate algs shaped `trigger1 y/y' [AUF] trigger2`. trigger1 is an R or L trigger and trigger2 is an R, L, or F trigger, each shaped `X U* X'`. It drops pointless and inefficient combinations and keeps only cases where the target edge starts in a different slot than it ends in. Output records are `ExactAlg`s (`new: true, step: 'f2l', add_y: false`). **Writes `y-move-algs.json` at the repo root**, not in `utils/`. Copying any results into `rawGenericData.json` is manual. One-off generator.
## Generated source

### `f2l-pair-distances`
`scripts/generateF2lPairDistances.ts`. Runs a breadth-first search to depth 4 over `<U,R,L,F,B>` from solved. For each corner placement (12) × edge placement (8) of an F2L pair, measured from its home slot, it records the minimum number of moves while the cross is intact. It checks that all four slots give the same table. **Overwrites `composables/recon/f2lPairDistances.ts`** (`PAIR_SEARCH_DEPTH`, `PAIR_DISTANCES`). The value 5 means more than 4 moves. Rerun it after changing `applyMove`, `crossSolved`, or `topLayerPlacementIndex` in `composables/recon/f2lIntuitiveDetection.ts`.

## Cube rendering runtime

### `build-cube-runtime`
`scripts/buildCubeRuntime.ts`. Uses esbuild to bundle `utils/cubeSceneEntry.client.ts` (minified IIFE, es2018). **Writes `public/learn/cubeScene.js`**, which is committed. Required after editing anything that bundle imports: `cubeSceneRuntime.client.ts`, `cubeSvgRender.ts`, `cubeSceneIsland.ts`, `cubeMoves.ts`, and similar. Deploy does not run it, so a stale bundle ships if it's skipped.

### `verify-cube-parity`
`scripts/verifyCubeFrameParity.ts`. Checks that the server-rendered SVG (`buildCubeSvgBody(islandFrameZero(...))`) is byte-identical to the client runtime's first frame (`renderSceneMarkup` through `cubieWorld`). It covers 4 scrambles × 4 angles × 3 highlight sets × hints × labels × startHighlighted. It also checks that `app/globals.css` still contains `CUBE_SCENE_CSS` from `utils/cubeSceneCss.ts`. Writes nothing. Exits 1 on any mismatch and prints each failing combination. Run it with `build-cube-runtime` after changes to the render pipeline. It imports the TS sources directly, not the bundle, so it does not detect a stale `cubeScene.js`.

## Tests and measurement

### `bench-cube-frame [frames=1000] [rounds=9] [cpuThrottle=1]`
`scripts/benchCubeFrame.ts`. Bundles `scripts/benchCubeFrame.browser.ts` with esbuild and runs it in headless Chrome at `/usr/bin/google-chrome`. It builds `frames` scene inputs for a fixed scramble and solution: the camera sweeps two full turns while the solution plays, with hints and labels on and every third frame dimmed. Then it times four stages per frame: pose (`sceneGeometry` plus each cubie's `cubieWorld`, the same work the runtime's `renderInput` does), `sceneDrawables`, the canvas painter (1280×720), and the SVG painter. After one warmup round it prints the median of `rounds` rounds in µs per frame, plus the average drawable count. `cpuThrottle` sets Chrome's CPU throttling rate (4 approximates a mid-range phone). It only times main-thread work, not rasterization. Writes nothing. Run it before and after changes to `cubeSvgRender.ts`, `cubeCanvasRender.ts`, or the runtime painters. Expect about ±20 µs of variation between runs at 1x, so run it a few times.

### `f2l-label-snapshot [--record] [--tolerance=0.02] [--show=10]`
`tests/f2lLabelSnapshot.ts`. A regression check on F2L alg suggestions and `labelF2lAlg` breakdown labels. With a fixed seed it picks 100 F2L case IDs that have suggestions, then fetches the shown suggestions (f2l + zbls, EO filtered when full EO is active) and labels each alg. `--record` **overwrites `tests/snapshots/f2lLabels.json`**. The default run compares against that file. It **fails** if any case's suggested alg list changed in content or order, or if more than `tolerance` of the alg labels changed. It prints up to `--show` before/after label diffs and the time spent labeling. Reads `public/recon/compiled-f2l-algs.json` and `compiled-zbls-algs.json`, so it detects changes made by `compile-algs`. Record again only after confirming a diff is intended.

### `autocomplete-solve [--count=100] [--no-zbls] [--no-zbll] [--verbose]`
`tests/autocompleteSolve.ts`. Solves random 3x3 scrambles (from `cubing/scramble`) by always taking the top suggestion: a cross suggestion first, then `getAlgSuggestions` repeatedly, for up to 20 steps, right-handed. It prints the solved count and move-count stats (mean, median, standard deviation, min, max) for cross plus first pair, pairs 2-4, last layer, and total. Moves are counted excluding rotations. Exits 1 if any scramble fails. Some failures are expected because the F2L sets don't cover every case, so a nonzero exit by itself doesn't prove a regression. Compare the solve rate and move counts instead. Uses the compiled righty OLL/PLL/ZBLL and F2L/ZBLS files. Writes nothing.
## Not in package.json

- `tests/benchRecon.mjs` (run with `node`, usage in `docs/remove-cubing-twisty.md`) is the /recon load benchmark. It writes to `tests/output/`.
- `scripts/benchGif.ts`, `scripts/extractLabelGlyphs.ts`, and `scripts/verifyAufReconstruction.ts` exist but have no script entry. Run them with `npx tsx scripts/<file>.ts` and read the source first.
