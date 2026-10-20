import LZWEncoder from 'gif.js/src/LZWEncoder.js';

const PALETTE_ENTRY_COUNT = 256;
const COLOR_DEPTH = 8;
const MIN_OPAQUE_ALPHA = 128;

const GIF_DISPOSE_LEAVE_IN_PLACE = 1;
const GIF_DISPOSE_RESTORE_BACKGROUND = 2;

export type GifSettings = {
  width: number;
  height: number;
  palette: number[];
  spareIndex: number;
  transparentBackground: boolean;
};

export type EncodedSegment = {
  imageBytes: Uint8Array<ArrayBuffer>;
  frameCount: number;
};

export type EncodedBlock = {
  leadingDuplicates: number;
  segments: EncodedSegment[];
};

class ByteWriter {
  private buffer = new Uint8Array(4096);
  private length = 0;

  private ensureCapacity(extra: number) {
    if (this.length + extra <= this.buffer.length) return;
    let capacity = this.buffer.length * 2;
    while (capacity < this.length + extra) capacity *= 2;
    const grown = new Uint8Array(capacity);
    grown.set(this.buffer.subarray(0, this.length));
    this.buffer = grown;
  }

  writeByte(value: number) {
    this.ensureCapacity(1);
    this.buffer[this.length++] = value;
  }

  writeBytes(values: ArrayLike<number>, offset = 0, count = values.length - offset) {
    this.ensureCapacity(count);
    for (let i = 0; i < count; i++) this.buffer[this.length++] = values[offset + i];
  }

  writeShort(value: number) {
    this.writeByte(value & 0xff);
    this.writeByte((value >> 8) & 0xff);
  }

  writeAscii(text: string) {
    for (let i = 0; i < text.length; i++) this.writeByte(text.charCodeAt(i));
  }

  toBytes(): Uint8Array<ArrayBuffer> {
    return this.buffer.slice(0, this.length);
  }
}

function closestPaletteIndex(
  palette: number[],
  r: number,
  g: number,
  b: number,
  excluded: number,
): number {
  let best = excluded === 0 ? 1 : 0;
  let bestDistance = Infinity;
  for (let i = 0, index = 0; i < palette.length; index++) {
    const dr = r - palette[i++];
    const dg = g - palette[i++];
    const db = b - palette[i++];
    if (index === excluded) continue;
    const distance = dr * dr + dg * dg + db * db;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = index;
    }
  }
  return best;
}

function createFrameIndexer(palette: number[], spareIndex: number, transparentBackground: boolean) {
  const indexByColor = new Map<number, number>();

  return (frame: Uint8ClampedArray): Uint8Array => {
    const indexed = new Uint8Array(frame.length / 4);
    for (let pixel = 0, p = 0; pixel < indexed.length; pixel++, p += 4) {
      if (transparentBackground && frame[p + 3] < MIN_OPAQUE_ALPHA) {
        indexed[pixel] = spareIndex;
        continue;
      }
      const key = (frame[p] << 16) | (frame[p + 1] << 8) | frame[p + 2];
      let index = indexByColor.get(key);
      if (index === undefined) {
        index = closestPaletteIndex(palette, frame[p], frame[p + 1], frame[p + 2], spareIndex);
        indexByColor.set(key, index);
      }
      indexed[pixel] = index;
    }
    return indexed;
  };
}

function framesEqual(a: Uint8ClampedArray, b: Uint8ClampedArray): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function encodeImage(width: number, height: number, indexedPixels: Uint8Array): Uint8Array<ArrayBuffer> {
  const writer = new ByteWriter();
  writer.writeByte(0x2c);
  writer.writeShort(0);
  writer.writeShort(0);
  writer.writeShort(width);
  writer.writeShort(height);
  writer.writeByte(0);
  new LZWEncoder(width, height, indexedPixels, COLOR_DEPTH).encode(writer);
  return writer.toBytes();
}

// a gif has one transparent index. the transparent preset already spends it on "show the
// page", which leaves nothing to mean "same as the previous frame".
const usesFrameDifferencing = (settings: GifSettings) => !settings.transparentBackground;

export function createBlockEncoder(settings: GifSettings) {
  const { width, height, palette, spareIndex, transparentBackground } = settings;
  const differencing = usesFrameDifferencing(settings);
  const indexFrame = createFrameIndexer(palette, spareIndex, transparentBackground);

  return (reference: Uint8ClampedArray | null, frames: Uint8ClampedArray[]): EncodedBlock => {
    const segments: EncodedSegment[] = [];
    // frames at the start of the block that repeat the previous block's last frame. They
    // lengthen that frame's delay instead of becoming frames of their own.
    let leadingDuplicates = 0;
    let previousFrame = reference;
    let previousIndexed: Uint8Array | null = null;

    const indexedPrevious = () => {
      if (!previousIndexed && previousFrame) {
        previousIndexed = indexFrame(previousFrame);
      }
      return previousIndexed;
    };

    for (const frame of frames) {
      if (previousFrame && framesEqual(previousFrame, frame)) {
        const lastSegment = segments.at(-1);
        if (lastSegment) lastSegment.frameCount++;
        else leadingDuplicates++;
        continue;
      }

      const indexed = indexFrame(frame);
      const previous = differencing ? indexedPrevious() : null;
      const written = previous
        ? indexed.map((index, pixel) => (index === previous[pixel] ? spareIndex : index))
        : indexed;

      segments.push({ imageBytes: encodeImage(width, height, written), frameCount: 1 });
      previousFrame = frame;
      previousIndexed = indexed;
    }

    return { leadingDuplicates, segments };
  };
}

function writeHeader(writer: ByteWriter, settings: GifSettings) {
  writer.writeAscii('GIF89a');

  writer.writeShort(settings.width);
  writer.writeShort(settings.height);
  writer.writeByte(0x80 | 0x70 | (COLOR_DEPTH - 1));
  writer.writeByte(0);
  writer.writeByte(0);

  writer.writeBytes(settings.palette);
  for (let i = settings.palette.length; i < PALETTE_ENTRY_COUNT * 3; i++) writer.writeByte(0);

  writer.writeByte(0x21);
  writer.writeByte(0xff);
  writer.writeByte(11);
  writer.writeAscii('NETSCAPE2.0');
  writer.writeByte(3);
  writer.writeByte(1);
  writer.writeShort(0);
  writer.writeByte(0);
}

function writeGraphicControl(writer: ByteWriter, disposal: number, delayMs: number, transparentIndex: number) {
  writer.writeByte(0x21);
  writer.writeByte(0xf9);
  writer.writeByte(4);
  writer.writeByte((disposal << 2) | 1);
  writer.writeShort(Math.round(delayMs / 10));
  writer.writeByte(transparentIndex);
  writer.writeByte(0);
}

export function assembleGif(
  settings: GifSettings,
  blocks: EncodedBlock[],
  frameDelayMs: number,
  endHoldMs: number,
): Uint8Array<ArrayBuffer> {
  const segments: EncodedSegment[] = [];
  for (const block of blocks) {
    const previousSegment = segments.at(-1);
    if (previousSegment) previousSegment.frameCount += block.leadingDuplicates;
    segments.push(...block.segments);
  }

  const differencing = usesFrameDifferencing(settings);
  const disposal = differencing ? GIF_DISPOSE_LEAVE_IN_PLACE : GIF_DISPOSE_RESTORE_BACKGROUND;

  const writer = new ByteWriter();
  writeHeader(writer, settings);
  segments.forEach((segment, i) => {
    const isLastSegment = i === segments.length - 1;
    const delayMs = segment.frameCount * frameDelayMs + (isLastSegment ? endHoldMs : 0);

    writeGraphicControl(writer, disposal, delayMs, settings.spareIndex);
    writer.writeBytes(segment.imageBytes);
  });
  writer.writeByte(0x3b);

  return writer.toBytes();
}
