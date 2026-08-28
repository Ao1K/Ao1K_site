# GIF Inter-Frame Differencing

An unimplemented file-size optimization for the solve GIF exporter. This documents what the
encoder does today and which parts of `gif.js` stand in the way.

Relevant files: `components/recon/CubeGifDialog.tsx` (`handleDownload`, `buildSharedPalette`,
`cachePaletteLookups`, `encodedBytes`), `node_modules/gif.js/src/GIFEncoder.js`,
`types/gif.js.d.ts`.

## The technique

Every frame is currently encoded in full. Between two consecutive frames of a slow cube turn,
most pixels are unchanged background. Differencing writes those unchanged pixels as the GIF
transparent index and sets the frame's disposal method to 1 (do not dispose), so the previous
frame shows through. Long runs of a single index compress far better under LZW than the real
pixel data they replace.

This is the largest remaining lever. Frame rate, output dimensions, and palette size have all
been tried; palette size in particular did nothing, because LZW's dictionary fills within a
fraction of one 360×360 frame and the code width reaches 12 bits regardless of how many palette
entries exist.

## Current encode path

`handleDownload` in `CubeGifDialog.tsx`:

1. `captureFrame(tSec)` renders offscreen and returns an RGBA `Uint8ClampedArray` at
   `resolution × resolution`.
2. `buildSharedPalette` quantizes 16 sampled frames into one 256-color palette used for every
   frame. One palette for all frames is deliberate — per-frame palettes shift flat areas by a
   level or two, which re-encoders like Discord turn into visible flicker.
3. `cachePaletteLookups` memoizes `findClosestRGB` by packed RGB key, because the encoder does a
   linear scan of all 256 entries per pixel for a palette it did not build itself.
4. The capture loop buffers one frame. A frame identical to the pending one adds `FRAME_DELAY_MS`
   to the pending frame's delay instead of being written; a differing frame flushes the pending
   one first. The final frame's delay absorbs `END_HOLD_MS`.

Differencing sits between steps 3 and 4. The identical-frame merge must stay and must run first —
merging is strictly better than differencing two identical frames. Differencing applies only
between frames that actually differ, and the pending-frame buffer already holds the previous
frame's pixels.

## gif.js constraints

| Location | Constraint |
| --- | --- |
| `GIFEncoder.js:145` | `addFrame` encodes and writes the frame immediately. Its docstring claims frames are deferred so timing can be inserted; they are not. Delay and disposal must be set before each `addFrame` call. |
| `GIFEncoder.js:443` | `writeGraphicCtrlExt` forces disposal 2 whenever a transparent color is set. Differencing needs disposal 1. |
| `GIFEncoder.js:447` | `setDispose` cannot be used to override that. The line reads a free variable `dispose` instead of the parameter and throws `ReferenceError`. |
| `GIFEncoder.js:234` | `analyzePixels` runs inside `addFrame` before `writeGraphicCtrlExt`, `writeImageDesc`, and `writePixels`. Wrapping it is the hook point for rewriting `indexedPixels`. |
| `GIFEncoder.js:254` | `transIndex` is recomputed per frame from `findClosest(transparent, true)`, restricted to entries in `usedEntry`, which accumulates across frames and is never reset. Pin `transIndex` explicitly rather than relying on this. |
| `GIFEncoder.js:261` | `indexPixels` maps every pixel through `findClosestRGB`. There is no per-pixel override; rewrite `this.indexedPixels` afterward instead. |
| `GIFEncoder.js:467` | `writeImageDesc` hardcodes position 0,0 and full width/height. |
| `GIFEncoder.js:542` | `writePixels` passes `this.width`, `this.height`, `this.indexedPixels`, `this.colorDepth` to `LZWEncoder`. |

Patch the instance the way `cachePaletteLookups` already does — bind the original, replace the
method, call through. `types/gif.js.d.ts` will need the touched members declared;
`colorTab` and `indexedPixels` are already there.

## Reserving a transparent index

The palette is 256 real colors with no spare slot. A dedicated index is required, otherwise any
pixel whose true color happens to quantize to the chosen index turns see-through.

Reserve one entry and keep `findClosestRGB` from ever returning it. The `cachePaletteLookups`
wrapper is a convenient place to enforce that, since every lookup already passes through it.
Dropping the least-used entry is a reasonable choice of victim.

## Conflict with the transparent background preset

A GIF has exactly one transparent index and it can only mean one thing. When the user picks the
transparent background preset, `handleDownload` calls `setTransparent(0x000000)` and the index
already means "see through to the page". Differencing cannot share it.

Disable differencing whenever `transparentBackground` is true and encode full frames as today.
That path also has less to gain, since a transparent background is a single flat color that
already compresses well.

## Phase 2: dirty rectangles

GIF frames carry their own position and size. Computing the bounding box of changed pixels,
cropping `indexedPixels` to it, and writing that box in `writeImageDesc` shrinks the LZW input
itself rather than just making it more compressible.

This needs `writeImageDesc` overridden to emit the box, and `writePixels` overridden so
`LZWEncoder` receives the cropped dimensions rather than `this.width` and `this.height`. Land the
transparent-index version first and measure before deciding whether this is worth the added
surface.

## Verification

There is no unit test hook for encoder output. Check a real export:

- Opens and animates correctly in a browser, and in a strict decoder that is not a browser.
- No trails or ghosting — that symptom means disposal is wrong.
- The transparent background preset still produces a see-through GIF.
- Byte size compared against the same solve exported before the change.
