declare module 'gif.js' {
  interface GIFOptions {
    workers?: number;
    quality?: number;
    width?: number;
    height?: number;
    workerScript?: string;
    repeat?: number;
    background?: string;
    transparent?: number | null;
    debug?: boolean;
    dither?: boolean | string;
  }

  interface AddFrameOptions {
    delay?: number;
    copy?: boolean;
    dispose?: number;
  }

  type GIFEvent = 'start' | 'finished' | 'progress' | 'abort' | 'error';

  class GIF {
    constructor(options?: GIFOptions);
    addFrame(
      element: HTMLCanvasElement | HTMLImageElement | CanvasRenderingContext2D | ImageData,
      options?: AddFrameOptions,
    ): void;
    on(event: 'finished', cb: (blob: Blob) => void): void;
    on(event: 'progress', cb: (progress: number) => void): void;
    on(event: 'start' | 'abort', cb: () => void): void;
    on(event: 'error', cb: (err: Error) => void): void;
    render(): void;
    abort(): void;
  }

  export default GIF;
}
