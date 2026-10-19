# /recon baseline: TwistyPlayer (cubing.js + Three.js)

Measured 2026-10-18 against prod at `https://www.ao1k.com/recon/` with `tests/benchRecon.mjs`. No run followed a redirect.

Raw data: `recon-twistyplayer-desktop.json`, `recon-twistyplayer-mobile.json`.

## Setup

- Headless Google Chrome 155.0.8059.39 driven by `playwright-core`. Each run launches a new browser with an empty profile, so every run is a first-time view.
- The `infoPanelDismissed_v1=true` cookie is set in every run, so the info panel is hidden and the cube is visible on load.
- **Desktop:** 1440×900, no throttling, 5 runs.
- **Mobile:** 412×823 at 2.625× DPR, 150 ms RTT, 1.6 Mbps down / 750 Kbps up, 4× CPU slowdown, 3 runs. The network throttle only applies to the page. Requests made by workers are not throttled.
- A run ends at least 15 s after navigation and after 3 s with no network activity. That covers the cube solver warmup, which `requestIdleCallback` schedules with a 10 s timeout.
- **Cube visible** is the time when a `<canvas>` with nonzero width first appears in `#cube_model`. That is when the custom Three.js scene is mounted.

## Load time (ms from the document request, median with min–max)

| Metric | Desktop | Mobile (throttled) |
|---|---|---|
| TTFB | 206 (163–307) | 218 (184–256) |
| First contentful paint | 330 (294–458) | 1370 (1334–1426) |
| Largest contentful paint | 682 (566–846) | 3654 (3642–3690) |
| DOMContentLoaded | 350 (310–453) | 1395 (1381–1459) |
| Load event | 473 (436–611) | 3389 (3359–3426) |
| **Cube visible** | **1226 (1108–1390)** | **4582 (4574–4636)** |
| Cube visible − load event | 730 (635–789) | 1211 (1186–1222) |

## Download size (transferred bytes, compressed, including headers)

| Metric | Desktop | Mobile |
|---|---|---|
| Total after settle | 703.1 kB | 693.3 kB |
| Finished by load event | 553.6 kB | 553.5 kB |
| Finished by cube visible | 672.1 kB | 662.0 kB |
| Requests | 53 | 46 |

By type (desktop): scripts 592.5 kB, font 35.6 kB, images 22.8 kB, document 16.6 kB, stylesheets 14.1 kB, worker/other 13.3 kB, RSC fetches 8.1 kB.

Cube-specific downloads:
- **205.6 kB** in five chunks that contain cubing.js or Three.js markers (`twisty-player`, `kpuzzle`, `WebGLRenderer`, `PerspectiveCamera`):
  - `3zu2kzoacc8tt.js`: 122.3 kB, Three.js core, loaded before the load event
  - `2322sbogzqxj9.js`: 31.7 kB
  - `3ryi4bj-9-v2q.js`: 30.7 kB
  - `0w6cuz3sumzpm.js`: 11.8 kB, loaded after the load event
  - `1vm3xgizbl8lj.js`: 9.1 kB, loaded after the load event
  
  This is a lower bound. Minified chunks without those markers could still hold cubing.js code.
- **19.9 kB** for the face label images `/U.svg`, `/D.svg`, `/R.svg`, `/L.svg`, `/F.svg` and `/B.svg`.

`cubing/twisty` and `three` are also imported statically by `CubeGifDialog.tsx`. Replacing only `TwistyPlayer.tsx` will not remove them from the page.

## Memory after settle (median)

| Metric | Desktop | Mobile |
|---|---|---|
| JS heap used, main thread, after forced GC | 9.7 MiB | 9.5 MiB |
| JS heap total | 10.7 MiB | 10.4 MiB |
| DOM nodes | 700 | 606 |
| JS event listeners | 440 | 433 |
| Recon tab renderer process (PSS) | 156.8 MiB | 151.7 MiB |
| GPU process (PSS) | 66.1 MiB | 53.1 MiB |
| Browser process (PSS) | 97.0 MiB | 95.7 MiB |
| All Chrome processes (PSS) | 446.1 MiB | 428.0 MiB |

Notes:
- The JS heap figures cover the main thread only. Worker heaps and WebGL buffers are not included.
- PSS is read from `/proc/<pid>/smaps_rollup` for each Chrome process. The browser process has nothing to do with the page.
- The tab renderer and GPU process figures are the best numbers to compare. Headless GPU memory may not match a real desktop GPU.

## Rerunning

```
node tests/benchRecon.mjs https://www.ao1k.com/recon/ 5 desktop tests/output/<name>-desktop.json
node tests/benchRecon.mjs https://www.ao1k.com/recon/ 3 mobile tests/output/<name>-mobile.json
```
