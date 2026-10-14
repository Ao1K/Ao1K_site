import NeuQuant from 'gif.js/src/TypedNeuQuant.js';

export type Rgb = [number, number, number];

export type TranslucentLayer = { color: Rgb; opacity: number };

export type SceneColors = {
  background: Rgb;
  opaqueStickers: Rgb[];
  foundation: TranslucentLayer;
  hints: TranslucentLayer[];
  labels: Rgb[];
};

type Histogram = { colors: Rgb[]; counts: number[] };

const MAX_PALETTE_COLORS = 255;
const PALETTE_SAMPLE_STRIDE = 3;
const NEUQUANT_SAMPLE_FACTOR = 30;
const PINNED_CLEAR_DISTANCE_SQUARED = 400;

const over = (layer: TranslucentLayer, behind: Rgb): Rgb => [
  layer.opacity * layer.color[0] + (1 - layer.opacity) * behind[0],
  layer.opacity * layer.color[1] + (1 - layer.opacity) * behind[1],
  layer.opacity * layer.color[2] + (1 - layer.opacity) * behind[2],
];

const roundRgb = (color: Rgb): Rgb => [Math.round(color[0]), Math.round(color[1]), Math.round(color[2])];

const distanceSquared = (a: Rgb, b: Rgb) => {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return dr * dr + dg * dg + db * db;
};

function nearestIndex(colors: Rgb[], color: Rgb, allowed?: (index: number) => boolean): number {
  let best = -1;
  let bestDistance = Infinity;
  colors.forEach((candidate, i) => {
    if (allowed && !allowed(i)) return;
    const distance = distanceSquared(candidate, color);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = i;
    }
  });
  return best;
}

function uniqueColors(colors: Rgb[]): Rgb[] {
  const seen = new Set<number>();
  return colors.filter(([r, g, b]) => {
    const key = (r << 16) | (g << 8) | b;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function listFlatSceneColors(scene: SceneColors): Rgb[] {
  const { background, foundation } = scene;
  const behindStickers = [background, ...scene.hints.map(hint => over(hint, background))];
  return uniqueColors([
    background,
    ...scene.opaqueStickers,
    ...scene.labels,
    ...behindStickers,
    ...behindStickers.map(color => over(foundation, color)),
  ].map(roundRgb));
}

function sampleFrames(frames: Uint8ClampedArray[]) {
  let sampledPixels = 0;
  for (const frame of frames) sampledPixels += Math.ceil((frame.length / 4) / PALETTE_SAMPLE_STRIDE);

  const pixels = new Uint8Array(sampledPixels * 3);
  const countByColor = new Map<number, number>();
  let out = 0;
  frames.forEach((frame, frameIdx) => {
    const pixelCount = frame.length / 4;
    for (let i = frameIdx % PALETTE_SAMPLE_STRIDE; i < pixelCount; i += PALETTE_SAMPLE_STRIDE) {
      const p = i * 4;
      pixels[out++] = frame[p];
      pixels[out++] = frame[p + 1];
      pixels[out++] = frame[p + 2];
      const key = (frame[p] << 16) | (frame[p + 1] << 8) | frame[p + 2];
      countByColor.set(key, (countByColor.get(key) ?? 0) + 1);
    }
  });

  const histogram: Histogram = { colors: [], counts: [] };
  for (const [key, count] of countByColor) {
    histogram.colors.push([(key >> 16) & 0xff, (key >> 8) & 0xff, key & 0xff]);
    histogram.counts.push(count);
  }
  return { pixels: pixels.subarray(0, out), histogram };
}

function neuQuantColors(pixels: Uint8Array): Rgb[] {
  const quantizer = new NeuQuant(pixels, NEUQUANT_SAMPLE_FACTOR);
  quantizer.buildColormap();
  const map = quantizer.getColormap().map(v => v & 0xff);
  const colors: Rgb[] = [];
  for (let i = 0; i < map.length; i += 3) colors.push([map[i], map[i + 1], map[i + 2]]);
  return colors;
}

function pinColors(colors: Rgb[], pins: Rgb[]) {
  const pinned = colors.map(() => false);
  for (const pin of pins) {
    const index = nearestIndex(colors, pin, i => !pinned[i]);
    if (index < 0) break;
    colors[index] = pin;
    pinned[index] = true;
  }
  return pinned;
}

function dropLeastUsed(colors: Rgb[], pinned: boolean[], histogram: Histogram) {
  const usage = colors.map(() => 0);
  histogram.colors.forEach((color, i) => {
    usage[nearestIndex(colors, color)] += histogram.counts[i];
  });
  let leastUsed = -1;
  usage.forEach((count, i) => {
    if (!pinned[i] && (leastUsed < 0 || count < usage[leastUsed])) leastUsed = i;
  });
  colors.splice(leastUsed, 1);
  pinned.splice(leastUsed, 1);
}

function clearAroundPinned(colors: Rgb[], pinned: boolean[]) {
  for (let i = colors.length - 1; i >= 0; i--) {
    if (pinned[i]) continue;
    const nearPinned = colors.some(
      (other, j) => pinned[j] && distanceSquared(other, colors[i]) < PINNED_CLEAR_DISTANCE_SQUARED,
    );
    if (nearPinned) {
      colors.splice(i, 1);
      pinned.splice(i, 1);
    }
  }
}

// every frame shares this palette. A palette per frame shifts flat areas by a level or two
// between frames, and sites that re-encode the gif (Discord) show that as flicker.
export function buildSharedPalette(
  frames: Uint8ClampedArray[],
  flatColors: Rgb[],
): { palette: number[]; spareIndex: number } {
  const { pixels, histogram } = sampleFrames(frames);
  const colors = neuQuantColors(pixels);
  const pinned = pinColors(colors, flatColors);
  while (colors.length > MAX_PALETTE_COLORS) dropLeastUsed(colors, pinned, histogram);
  clearAroundPinned(colors, pinned);
  return { palette: colors.flat(), spareIndex: colors.length };
}
