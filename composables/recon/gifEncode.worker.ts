import { createBlockEncoder } from '@/utils/gifEncoding';
import { buildSharedPalette } from '@/utils/gifPalette';
import type { GifWorkerRequest, GifWorkerResponse } from './gifEncoderPool';

let encodeBlock: ReturnType<typeof createBlockEncoder> | null = null;

const respond = (response: GifWorkerResponse, transfer: Transferable[] = []) => {
  self.postMessage(response, { transfer });
};

self.onmessage = (event: MessageEvent<GifWorkerRequest>) => {
  const request = event.data;

  if (request.type === 'configure') {
    encodeBlock = createBlockEncoder(request.settings);
    return;
  }

  if (request.type === 'palette') {
    const { palette, spareIndex } = buildSharedPalette(request.samples, request.flatColors);
    respond({ type: 'palette', id: request.id, palette, spareIndex });
    return;
  }

  if (!encodeBlock) throw new Error('GIF encoder worker received a block before its settings.');
  const block = encodeBlock(request.reference, request.frames);
  const transfer = block.segments.flatMap(segment => [segment.imageBytes.buffer, segment.usedEntries.buffer]);
  respond({ type: 'block', id: request.id, block }, transfer);
};
