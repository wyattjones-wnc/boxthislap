import { floodFill } from "./model";
type PixelRequest = {
  buffer: ArrayBuffer;
  width: number;
  height: number;
  x: number;
  y: number;
  color: number[];
  tolerance: number;
  mask?: ArrayBuffer;
  wand: boolean;
};
const scope = globalThis as unknown as {
  onmessage: (event: MessageEvent<PixelRequest>) => void;
  postMessage: (value: unknown, transfer: Transferable[]) => void;
};
scope.onmessage = ({ data: input }) => {
  const pixels = new Uint8ClampedArray(input.buffer),
    mask = input.mask ? new Uint8ClampedArray(input.mask) : null;
  const original = input.wand ? new Uint8ClampedArray(pixels) : null;
  const filled = floodFill(
    pixels,
    input.width,
    input.height,
    input.x,
    input.y,
    input.color,
    input.tolerance,
    (x, y) => !mask || mask[(y * input.width + x) * 4 + 3] > 0,
  );
  let cut: Uint8ClampedArray<ArrayBuffer> | null = null;
  if (original) {
    cut = new Uint8ClampedArray(pixels.length);
    for (let n = 0; n < original.length / 4; n++) {
      if (filled?.[n]) {
        cut.set(original.subarray(n * 4, n * 4 + 4), n * 4);
        original[n * 4 + 3] = 0;
      }
    }
    pixels.set(original);
  }
  scope.postMessage(
    { buffer: pixels.buffer, cut: cut?.buffer },
    cut ? [pixels.buffer, cut.buffer] : [pixels.buffer],
  );
};
