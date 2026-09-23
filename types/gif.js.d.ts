declare module 'gif.js/src/LZWEncoder.js' {
  interface ByteOutput {
    writeByte(value: number): void;
    writeBytes(values: ArrayLike<number>, offset?: number, count?: number): void;
  }

  class LZWEncoder {
    constructor(width: number, height: number, pixels: Uint8Array, colorDepth: number);
    encode(output: ByteOutput): void;
  }

  export = LZWEncoder;
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
