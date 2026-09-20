# Load speed work on /recon

## Objective

Make `/recon` usable sooner after a reload, measured with the info panel closed.

The open info panel is out of scope. It carries a heavy video and image pair, but they load after
the text rather than blocking it, so the cost there is acceptable.

Reference point: `alpha.twizzle.net` does similar work and is usable in roughly a second.

## The harness

`scripts/measureLoad.ts`, run through `pnpm measure-load`. It drives the locally installed Google
Chrome with `playwright-core`, loads a page several times, and reports the median of each metric.

### Requirements

- Google Chrome or Chromium on the machine. The script looks at `CHROME_PATH`, then
  `/usr/bin/google-chrome`, `/usr/bin/google-chrome-stable`, `/usr/bin/chromium`,
  `/usr/bin/chromium-browser`.
- A server already answering at the URL. The script waits up to 20 seconds for one and then fails
  with instructions.

### Measure a production build

Dev-server numbers are meaningless here, since Next compiles routes on demand. Always measure a
production build, and rebuild between two measurements or the second one measures the old bundle.

```bash
pnpm build
pnpm start          # leave running in another terminal
pnpm measure-load --runs 5 --json scripts/output/load-run.json --label after-change
```

Add `--baseline scripts/output/load-run.json` on a later run to print median deltas against an
earlier report.

### Options

| Flag | Default | Meaning |
| --- | --- | --- |
| `--url` | `http://localhost:3000/recon` | Page to load. Point it at `https://ao1k.com/recon/` to measure production. |
| `--runs` | `5` | Number of loads. Medians come from these. |
| `--cache` | `cold` | `cold` uses a fresh context per run with the HTTP cache cleared. `warm` reuses one context, so runs 2+ hit cache. |
| `--cpu` | `1` | CPU throttling multiplier through CDP. `4` approximates a mid-range laptop, `6` a phone. |
| `--network` | `none` | `none`, `cable`, `slow4g`, `fast3g`. |
| `--viewport` | `1440x900` | Viewport size. Matters — see "Viewport gates the cube" below. |
| `--cookies` | target state for the page | `name=value,name2=value2`, or `none`. Overriding this on `/recon` drops the closed-info-panel state and the script warns you. |
| `--timeout` | `45000` | Per-run milliseconds to wait for navigation and milestones. |
| `--json` | — | Write the full report, including per-run data, to this path. |
| `--baseline` | — | A previously written `--json` report. Prints median deltas against it. |
| `--label` | `run` | Name stored in the report. |

### What it reports

Standard timings, all measured from navigation start:

- `ttfb`, `domContentLoaded`, `load` — from the Navigation Timing entry.
- `fcp`, `lcp` — first and largest contentful paint.
- `tbt` — total blocking time: the sum of long-task time over 50ms. This is the number that tracks
  "the page is on screen but does not respond".
- `longestTask` — the single worst main-thread block.
- `totalTransferKB`, `scriptTransferKB` — bytes over the wire, plus a list of the heaviest scripts
  from the first run.

Milestones, which are page-specific and defined in `MILESTONES_BY_PATH`. Each is the time at which
the selector first matches an element with a non-zero box:

| Milestone | Selector | Means |
| --- | --- | --- |
| `contentRendered` | `#cube_model` | `_PageContent` rendered; the skeleton is gone. |
| `editorReady` | `#scramble [contenteditable]` | The scramble editor can be typed into. |
| `cubeCanvas` | `#cube_model canvas` | Three.js has replaced `<twisty-player>` with its own canvas. This is when "Loading cube..." stops. |

To measure another page, add an entry to `MILESTONES_BY_PATH`. Anything without an entry gets a
single `contentRendered` milestone on `main`.

## Things that bite

### Closing the info panel is what the cookie does

`app/recon/page.tsx:75` reads `infoPanelDismissed_v1` and passes `infoPanelSlot={null}` when it is
set. `_PageContent.tsx:1710` turns that into `initiallyDismissed`, which `InfoPanel.tsx:20` uses as
the starting `collapsed` state and `InfoPanel.tsx:22` uses to hold `hasExpanded` at false, so
`InfoPanelContent` never mounts. Setting the cookie is therefore exactly the state being measured:
info closed, content not mounted, editor autofocused.

That is why `TARGET_STATE_COOKIES_BY_PATH` sets it for `/recon`. Passing `--cookies none` measures
the open panel instead, which is out of scope; the script prints a warning if the cookie is missing.

### Viewport gates the cube

`createCustomScene` in `components/recon/TwistyPlayer.tsx:934` awaits `waitForPlayerIntersection`
before building the Three.js scene, because cubing defers 3D setup until the player intersects the
viewport. This matters for the harness: if `#cube_model` starts below the fold, the cube never
initializes and `cubeCanvas` never fires. With the info panel open at 1440x900 it sits at roughly
y=1310 and times out; closed, it is in view and the milestone is real.

So `--viewport` changes what is being measured, not just how it looks. Keep it fixed across
comparisons.

### The `__name` shim

`tsx` compiles with esbuild's `--keep-names`, which wraps named functions in a `__name(...)` helper.
Functions handed to Playwright are serialized to source and run in the browser, where that helper
does not exist, so they throw `ReferenceError: __name is not defined`. The script injects
`ESBUILD_KEEP_NAMES_SHIM` as its first init script to define a pass-through `__name`. Any new code
injected into the page needs that shim in place first.

### Numbers are machine-specific

Medians from this harness are only comparable against other runs on the same machine with the same
flags. Re-record rather than trusting an old report after changing machines.

## Where the Kociemba solver runs

`cube-solver` is imported in exactly one place, `composables/recon/cubeSolver.worker.ts:1`. It is not
in the main bundle, so no main-thread code path can trigger its table build.

- `composables/recon/cubeSolver.worker.ts` — owns `cube-solver`. Handles a warm-up message
  (`scramble === null`) and solve requests.
- `composables/recon/cubeSolverClient.ts` — spawns the worker lazily, matches replies to requests by
  id, and resolves `null` if the worker cannot start or errors.
- `TwistyPlayer.tsx:99` — `simplifySetupMoves` is async and delegates to the worker. On `null` it
  keeps the unsimplified alg.
- `TwistyPlayer.tsx:1093` — a mount effect sends the warm-up through `requestIdleCallback`, or a 3s
  `setTimeout` where that does not exist. Both only post a message; the table build is on the worker
  thread either way.
- `TwistyPlayer.tsx:219` — `syncDisplayedSetupMoves` shows the unsimplified moves immediately and
  replaces them when the worker answers, guarded by `pendingSetupMovesRef` so a stale reply cannot
  win.

The warm-up is an optimization, not a precondition. `cube-solver`'s `solve` calls `initialize()`
itself, so a camera click before the warm-up fires builds the tables on that request instead.

## Current measurements

Local production build, 5 runs, cold cache, no throttling, 1440x900, info panel closed. Re-record
with `--json` to compare against these.

| Metric | Median |
| --- | --- |
| ttfb | 20ms |
| fcp | 244ms |
| lcp | 696ms |
| domContentLoaded | 184ms |
| load | 198ms |
| tbt | 474ms |
| longestTask | 276ms |
| contentRendered | 414ms |
| editorReady | 415ms |
| cubeCanvas | 1146ms |
| totalTransferKB | 807 KB |
| scriptTransferKB | 719 KB |

Verified in Chrome only. The worker path has not been run under WebKit; if module workers failed
there, `cubeSolverClient.ts:18` catches it and screenshots carry the unsimplified alg.

## Tried and rejected

- **`initializeCubeSolver('kociemba')` in a mount effect**, the original shape. The synchronous table
  build was the single ~2.8s main-thread task, blocking everything behind it including the Three.js
  scene build that produces `#cube_model canvas`. Paid on every load for a feature only reached by
  pressing the camera button.
- **Deferring that same call to `requestIdleCallback` on the main thread.** Load numbers matched the
  worker version, but the work only moved: the page froze for ~2.8s shortly after it became
  interactive.
- **Dropping the warm-up entirely and letting `solveCube` self-initialize.** Correct, but moves the
  2.8s freeze onto the first camera click.

## Considered, not tried

- **Code-splitting the camera/screenshot dialogs** (`CubeImageDialog`, `CubeGifDialog`). They are
  imported eagerly and cannot be reached until the user opens them. Would cut script bytes and parse
  time, though transfer size is not the current bottleneck. `HtmlSceneDialog` and `HtmlImageDialog`
  are not relevant because they are dev only.
- **Deferring `three` and `OrbitControls`** until `waitForPlayerIntersection` resolves. Same idea,
  applied to the largest dependency.
- **Trimming the 158 KB and 127 KB chunks.** Not yet identified; `@next/bundle-analyzer` is already a
  devDependency but the config for it is commented out in `next.config.mjs`.
- **Avoiding the `<twisty-player>` → Three.js handoff.** The cube is built by `cubing`, then its
  scene is taken over. Rendering the first frame directly would remove a whole initialization pass.
