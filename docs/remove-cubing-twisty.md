# Removing cubing.js Twisty and Three.js

## Goal

Every 3D cube on the site draws with the SVG cube runtime that the lessons use:
`utils/cubeSvgRender.ts`, `utils/cubeSceneRuntime.client.ts` and `utils/cubeMoves.ts`.
When this is done:

- Nothing imports `cubing/twisty`.
- Nothing imports `three` or `three/examples/*`.
- `three` and `@types/three` are removed from `package.json`.

`cubing` stays as a dependency. `cubing/scramble` and `cubing/search` are still used by
`app/api/scramble/route.ts`, `app/notimer/page.tsx`, `utils/fetchDailyScramble.ts` and the
solver worker. `cubing` lists `three` as one of its own dependencies, so `three` remains in
`node_modules`. That is fine. Only imports decide what reaches the browser.

## Current consumers

| File | Uses | What it does with them |
|---|---|---|
| `components/recon/TwistyPlayer.tsx` | Twisty, Three | Main recon cube. Moves the 3D object out of the Twisty element into its own scene, then steps and animates moves through `alg`, `timestamp` and `experimentalAddMove`. |
| `composables/recon/CubeScreenshotGenerator.ts` | Three | Camera button. Draws the live Three.js scene to a canvas. |
| `components/recon/CubeGifDialog.tsx` | Twisty, Three | GIF export. For each frame it sets the Twisty timestamp, draws with WebGL and reads the pixels back. |
| `components/algs/TwistyClickable.tsx` | Twisty, Three | Algs page F2L picker. A clickable cube with a color for every facelet, raycast picking and alg playback. |
| `components/recon/HtmlImageDialog.tsx` | Three | Dev tool. A Three.js box with letter textures, used only to choose a viewing angle. |
| `components/recon/HtmlSceneDialog.tsx` | Three | Dev tool. Same angle picker as the image dialog. |

`CubeGifDialog` is imported statically by `components/recon/_PageContent.tsx`. That import
keeps Twisty and Three.js in the first `/recon` download even after `TwistyPlayer.tsx` is
replaced.

## Overall shape

### 1. Runtime groundwork

Everything else depends on this step.

Turn the closed `createScene` in `cubeSceneRuntime.client.ts` into a scene that other code can
control. The lesson island mount becomes one consumer of that scene. Consumers need to be able
to:
- set the cube state instantly from facelets
- animate one move group with a duration and a completion callback
- play a sequence of moves
- change colors, hints, labels and the viewing angle while the scene is live
- tell when the user orbits the cube, and read the new angles

The renderer needs these additions:
- **Per-sticker colors.** Colors are currently looked up from the `StickerColor` enum through
  `COLOR_ORDER`. `TwistyClickable` paints any facelet any color: mask grey, EO colors, overrides.
- **Hint elevation and cube scale as parameters.** `HINT_OFFSET` and `CUBE_SCALE` are fixed
  today. Recon and the algs page let the user set the elevation in
  `useHintFaceletsElevation`, and pull the camera back as the elevation grows.
- **A raster draw path.** Draw the projected quads from the same depth-sorted list to a 2D
  canvas. The screenshot and the GIF need pixels. Turning the SVG into an image once per
  frame would be slow and asynchronous.
- **The pose at time t.** A pure function that returns every cubie's position for a given
  time, given the move groups and their durations. The GIF export samples arbitrary times and
  can't depend on `requestAnimationFrame` playback.

Concerns:
- Lesson output must not change. Defaults have to reproduce today's output exactly.
- Any change to these files means running `pnpm build-cube-runtime` and
  `pnpm verify-cube-parity`. The lesson bundle in `public/learn/cubeScene.js` is only rebuilt
  by hand.
- `render()` replaces all of `innerHTML` on every frame. Recon plays fast queued moves, so
  measure on a throttled phone before optimizing. If it is too slow, reuse the path elements
  between frames or draw to a canvas.

### 2. Recon player and screenshot

- Write a new cube component in place of `TwistyPlayer.tsx`. Keep its imperative handle
  (`setTempoScale`, `setInstantOverride`, `playPreview`, `stopPreview`, `restoreSolveState`)
  so `_PageContent.tsx` hardly changes.
- The move-diff logic in `TwistyPlayer.tsx` doesn't depend on Twisty: the single-move
  add/remove, step and modify detection, plus the animation queue. Keep it, and point it at the
  new scene. An instant jump becomes "set the facelets": scramble plus the first N solution
  moves, through `SimpleCube` and `faceletsFromState`.
- Rewrite `CubeScreenshotGenerator.ts` to use the raster path. Keep its background and
  setup-moves text code, because that code is plain canvas work.
- Change `CubeGifDialog` to a lazy import in `_PageContent.tsx`, so Three.js leaves the first
  view before the GIF port is done.

Concerns:
- `PlayerParams.animationTimes` and `findAnimationLengths` hold cubing.js timeline values
  (1000, 1500 and 2000 ms per move). The player sums them into a Twisty timestamp. The new
  player only needs a move count. `[1]` is a marker that means the scramble is selected. Make
  sure every reader of `animationTimes` still works.
- `getQueueTempo` and split playback push the speed up to 100×. Check that very short turns
  still finish, and that the queue's `done` callback fires every time.
- Speed is set with `tempoScale` today. Convert it to a turn duration in milliseconds.
- `/U.svg` and the other face label images are drawn as textures. The SVG renderer draws its
  own text labels, so the labels will look different.
- The orbit drag has no damping, and the perspective is weaker than the Three.js camera's.
- The face colors from `useSyncedSettings` go straight into `cubeLooks`. The color-matching
  code in `setStickerColors` is deleted.

### 3. GIF export

`CubeGifDialog.tsx` is the largest port.

- Frames come from the raster path plus the pose function.
- Piece highlighting uses the runtime's dim/shade system, which `HtmlSceneDialog` already
  uses. It replaces the cubing.js `StickeringMask` and the translucent materials.
- `collectSceneColors` and `listFlatSceneColors` in `utils/gifPalette.ts` build the palette
  from Three.js materials. The palette inputs have to come from `cubeLooks` instead: the black
  sticker frames, the dim blends, the hint opacity and the label colors.

Concerns:
- Canvas antialiasing adds blended edge colors. Check palette quality against the current
  GIFs.
- The GIF and the HTML video tool share timing logic: line percentages, pauses and Combine UD.
  Look for shared code before copying it.

### 4. Algs page clickable cube

`TwistyClickable.tsx` is the port most tied to cubing.js.

- `composables/algs/cubePaint.ts` names facelets by cubing.js orbit, piece index and facelet
  index, and maps centers to faces with `CENTER_FACE_ORDER`. Build the `PaintMap` from the
  runtime's cubies and stickers instead. Location logic such as `physicalLocOfFacelet` works
  from face sets and should carry over, but check every place that reads `pieceIndex`.
- Picking: a pointer-up with little movement has to resolve to the front-most sticker under
  the pointer. Either tag the SVG paths with sticker ids, or hit-test the projected quads.
  Hint facelets must not catch clicks.
- The view eases toward `yTurns` while the face labels stay fixed to the camera. In runtime
  terms, this is an animated rotation of the whole cube about y, with the labels left in place.
- Playback reports the index of the move being animated through `onHighlightMove`, and holds
  the solved view before returning to the case. The runtime has to report move progress.

### 5. HTML dev dialogs

`HtmlImageDialog.tsx` and `HtmlSceneDialog.tsx` use Three.js only for the orbit angle picker.
Their output already comes from the SVG renderer. Replace the preview with an orbiting SVG
scene that reports its angles back to the dialog's angle inputs.

These dialogs are commented out in `_PageContent.tsx`. They still need to be ported, or
deleted, before `three` can be removed.

### 6. Cleanup

- Remove `three` and `@types/three` from `package.json`.
- Delete `public/U.svg`, `D.svg`, `R.svg`, `L.svg`, `F.svg` and `B.svg` if nothing references
  them.
- Searching the source for `cubing/twisty`, `from 'three` and `three/examples` returns nothing.
- `pnpm build` passes.

## Measuring

The baseline for `/recon` before any of this work is in
`tests/output/recon-twistyplayer-baseline.md`.

After step 2 and again after step 6, run:

```
node tests/benchRecon.mjs https://www.ao1k.com/recon/ 5 desktop tests/output/<name>-desktop.json
node tests/benchRecon.mjs https://www.ao1k.com/recon/ 3 mobile tests/output/<name>-mobile.json
```

The script detects the cube as a `<canvas>` inside `#cube_model`. Update that selector when
the cube becomes an SVG.

The numbers to compare:
- the time from the load event to the cube appearing
- the download size, including the chunks that contain Three.js or Twisty
- the memory of the tab's renderer process
- the memory of the GPU process
