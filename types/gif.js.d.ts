declare module 'gif.js/src/GIFEncoder.js' {
  class GIFEncoder {
    constructor(width: number, height: number);
    colorTab: number[] | null;
    indexedPixels: Uint8Array | null;
    setRepeat(repeat: number): void;
    setDelay(milliseconds: number): void;
    setQuality(quality: number): void;
    setDither(dither: boolean | string): void;
    setTransparent(color: number | null): void;
    setGlobalPalette(palette: number[] | boolean): void;
    findClosestRGB(r: number, g: number, b: number, used?: boolean): number;
    writeHeader(): void;
    addFrame(imageData: Uint8ClampedArray): void;
    finish(): void;
    stream(): { pages: Uint8Array[]; cursor: number };
  }

  export = GIFEncoder;
}

declare module 'gif.js/src/TypedNeuQuant.js' {
  class NeuQuant {
    constructor(pixels: Uint8Array, sampleFactor: number);
    buildColormap(): void;
    getColormap(): number[];
    lookupRGB(r: number, g: number, b: number): number;
  }

  export = NeuQuant;
}
