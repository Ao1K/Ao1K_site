import { assembleGif, type EncodedBlock, type GifSettings } from '@/utils/gifEncoding';
import type { Rgb } from '@/utils/gifPalette';

export type GifWorkerRequest =
  | { type: 'configure'; settings: GifSettings }
  | { type: 'palette'; id: number; samples: Uint8ClampedArray[]; flatColors: Rgb[] }
  | { type: 'block'; id: number; reference: Uint8ClampedArray | null; frames: Uint8ClampedArray[] };

export type GifWorkerResponse =
  | { type: 'palette'; id: number; palette: number[]; spareIndex: number }
  | { type: 'block'; id: number; block: EncodedBlock };

const FRAMES_PER_BLOCK = 16;
const MAX_QUEUED_BLOCKS_PER_WORKER = 2;
const MAX_WORKERS = 4;

type PendingRequest = {
  resolve: (response: GifWorkerResponse) => void;
  reject: (error: Error) => void;
};

function pickWorkerCount(): number {
  const cores = navigator.hardwareConcurrency || 2;
  return Math.max(1, Math.min(MAX_WORKERS, cores - 1));
}

export function createGifEncoderPool() {
  const workers = Array.from(
    { length: pickWorkerCount() },
    () => new Worker(new URL('./gifEncode.worker.ts', import.meta.url), { type: 'module' }),
  );
  const pending = new Map<number, PendingRequest>();
  let nextRequestId = 0;

  const failAll = (error: Error) => {
    for (const request of pending.values()) request.reject(error);
    pending.clear();
  };

  for (const worker of workers) {
    worker.onmessage = (event: MessageEvent<GifWorkerResponse>) => {
      const request = pending.get(event.data.id);
      pending.delete(event.data.id);
      request?.resolve(event.data);
    };
    worker.onerror = (event) => {
      event.preventDefault();
      failAll(new Error(event.message || 'GIF encoding failed.'));
    };
  }

  const send = (worker: Worker, request: Extract<GifWorkerRequest, { id: number }>, transfer: Transferable[]) =>
    new Promise<GifWorkerResponse>((resolve, reject) => {
      pending.set(request.id, { resolve, reject });
      worker.postMessage(request, transfer);
    });

  const buildPalette = async (samples: Uint8ClampedArray[], flatColors: Rgb[]) => {
    const id = nextRequestId++;
    const response = await send(
      workers[0],
      { type: 'palette', id, samples, flatColors },
      samples.map(sample => sample.buffer),
    );
    if (response.type !== 'palette') throw new Error('GIF encoder worker sent the wrong response.');
    return { palette: response.palette, spareIndex: response.spareIndex };
  };

  const encodeFrames = (pendingSettings: Promise<GifSettings>, onFramesEncoded: (count: number) => void) => {
    const configured = pendingSettings.then(settings => {
      for (const worker of workers) worker.postMessage({ type: 'configure', settings } satisfies GifWorkerRequest);
      return settings;
    });

    const blocks: Promise<EncodedBlock>[] = [];
    let blockFrames: Uint8ClampedArray[] = [];
    let reference: Uint8ClampedArray | null = null;
    let encodedFrames = 0;

    const sendBlock = () => {
      const frames = blockFrames;
      // sending a frame moves its memory to the worker, so the next block's copy of this
      // block's last frame is made first. Each block needs that frame for dedupe and differencing.
      const nextReference = frames[frames.length - 1].slice();
      const transfer = frames.map(frame => frame.buffer);
      if (reference) transfer.push(reference.buffer);

      const id = nextRequestId++;
      const worker = workers[blocks.length % workers.length];
      const request = { type: 'block', id, reference, frames } as const;
      blocks.push(configured.then(() => send(worker, request, transfer)).then(response => {
        if (response.type !== 'block') throw new Error('GIF encoder worker sent the wrong response.');
        encodedFrames += frames.length;
        onFramesEncoded(encodedFrames);
        return response.block;
      }));

      blockFrames = [];
      reference = nextReference;
    };

    const addFrame = async (frame: Uint8ClampedArray) => {
      blockFrames.push(frame);
      if (blockFrames.length < FRAMES_PER_BLOCK) return;
      sendBlock();
      // waiting on an older block caps how many frames sit in memory when encoding falls behind.
      const oldestAllowedIndex = blocks.length - 1 - workers.length * MAX_QUEUED_BLOCKS_PER_WORKER;
      if (oldestAllowedIndex >= 0) await blocks[oldestAllowedIndex];
    };

    const finish = async (frameDelayMs: number, endHoldMs: number) => {
      if (blockFrames.length > 0) sendBlock();
      return assembleGif(await configured, await Promise.all(blocks), frameDelayMs, endHoldMs);
    };

    return { addFrame, finish };
  };

  const dispose = () => {
    failAll(new Error('GIF encoding was cancelled.'));
    for (const worker of workers) worker.terminate();
  };

  return { buildPalette, encodeFrames, dispose };
}

export type GifEncoderPool = ReturnType<typeof createGifEncoderPool>;
