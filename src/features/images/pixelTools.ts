export async function processPixels(
  data: ImageData,
  x: number,
  y: number,
  color: number[],
  tolerance: number,
  wand: boolean,
  mask?: ImageData,
): Promise<{ data: ImageData; cut?: ImageData }> {
  const worker = new Worker(new URL("./pixelWorker.ts", import.meta.url), {
    type: "module",
  });
  try {
    return await new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () =>
          reject(
            new Error(
              "Pixel operation exceeded its time limit. Try a smaller image.",
            ),
          ),
        20000,
      );
      worker.onerror = () => {
        clearTimeout(timeout);
        reject(new Error("Pixel operation failed."));
      };
      worker.onmessage = (event) => {
        clearTimeout(timeout);
        const result = event.data;
        resolve({
          data: new ImageData(
            new Uint8ClampedArray(result.buffer),
            data.width,
            data.height,
          ),
          cut: result.cut
            ? new ImageData(
                new Uint8ClampedArray(result.cut),
                data.width,
                data.height,
              )
            : undefined,
        });
      };
      const buffer = data.data.buffer as ArrayBuffer,
        maskBuffer = mask?.data.buffer as ArrayBuffer | undefined;
      worker.postMessage(
        {
          buffer,
          width: data.width,
          height: data.height,
          x,
          y,
          color,
          tolerance,
          wand,
          mask: maskBuffer,
        },
        maskBuffer ? [buffer, maskBuffer] : [buffer],
      );
    });
  } finally {
    worker.terminate();
  }
}
