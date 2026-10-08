export const MAX_PIXELS = 16_000_000;
export const MAX_PROJECT_BYTES = 48_000_000;
export type Point = { x: number; y: number };
export type Selection = {
  kind: "rectangle" | "ellipse" | "lasso";
  points: Point[];
};
export type Layer = {
  id: string;
  name: string;
  kind: "raster" | "text";
  source: string;
  width: number;
  height: number;
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  opacity: number;
  visible: boolean;
  text: string;
  fontSize: number;
  color: string;
  brightness: number;
  contrast: number;
  saturation: number;
  blur: number;
  invert: boolean;
};
export type ImageProject = {
  format: "box-this-lap-image";
  version: 1;
  width: number;
  height: number;
  background: string;
  layers: Layer[];
};
export function dimensions(width: number, height: number) {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1 ||
    width > 8192 ||
    height > 8192 ||
    width * height > MAX_PIXELS
  )
    throw new Error(
      "Use dimensions up to 8192 pixels and 16 million pixels in total.",
    );
}
export function newProject(width = 1200, height = 800): ImageProject {
  dimensions(width, height);
  return {
    format: "box-this-lap-image",
    version: 1,
    width,
    height,
    background: "",
    layers: [],
  };
}
export function newLayer(
  width: number,
  height: number,
  source = "",
  name = "Layer",
): Layer {
  return {
    id: crypto.randomUUID(),
    name,
    kind: "raster",
    source,
    width,
    height,
    x: 0,
    y: 0,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    opacity: 1,
    visible: true,
    text: "",
    fontSize: 48,
    color: "#ffffff",
    brightness: 100,
    contrast: 100,
    saturation: 100,
    blur: 0,
    invert: false,
  };
}
const finite = (n: unknown, min: number, max: number) =>
  typeof n === "number" && Number.isFinite(n) && n >= min && n <= max;
export function parseProject(text: string): ImageProject {
  if (text.length > MAX_PROJECT_BYTES)
    throw new Error("Project exceeds the 48 MB local file limit.");
  const p = JSON.parse(text) as ImageProject;
  if (
    p?.format !== "box-this-lap-image" ||
    p.version !== 1 ||
    !Array.isArray(p.layers) ||
    p.layers.length > 32
  )
    throw new Error("This is not a supported layered project.");
  dimensions(p.width, p.height);
  if (
    typeof p.background !== "string" ||
    (p.background !== "" && !/^#[0-9a-f]{6}$/i.test(p.background))
  )
    throw new Error("Invalid background color.");
  let pixels = 0;
  const ids = new Set();
  for (const l of p.layers) {
    dimensions(l.width, l.height);
    pixels += l.width * l.height;
    if (
      pixels > 32_000_000 ||
      !l.id ||
      ids.has(l.id) ||
      typeof l.name !== "string" ||
      l.name.length > 200 ||
      !["raster", "text"].includes(l.kind) ||
      typeof l.source !== "string" ||
      (l.source &&
        !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(
          l.source,
        )) ||
      typeof l.text !== "string" ||
      l.text.length > 10000 ||
      !/^#[0-9a-f]{6}$/i.test(l.color) ||
      typeof l.visible !== "boolean" ||
      typeof l.invert !== "boolean"
    )
      throw new Error("Invalid layer data or layer memory limit exceeded.");
    ids.add(l.id);
    for (const [key, min, max] of [
      ["x", -100000, 100000],
      ["y", -100000, 100000],
      ["scaleX", 0.01, 100],
      ["scaleY", 0.01, 100],
      ["rotation", -36000, 36000],
      ["opacity", 0, 1],
      ["fontSize", 1, 2000],
      ["brightness", 0, 300],
      ["contrast", 0, 300],
      ["saturation", 0, 300],
      ["blur", 0, 100],
    ] as const)
      if (!finite(l[key], min, max)) throw new Error(`Invalid layer ${key}.`);
  }
  return p;
}
export function toLayerPoint(l: Layer, p: Point): Point {
  const angle = (-l.rotation * Math.PI) / 180;
  const dx = p.x - l.x - (l.width * l.scaleX) / 2;
  const dy = p.y - l.y - (l.height * l.scaleY) / 2;
  return {
    x: (dx * Math.cos(angle) - dy * Math.sin(angle)) / l.scaleX + l.width / 2,
    y: (dx * Math.sin(angle) + dy * Math.cos(angle)) / l.scaleY + l.height / 2,
  };
}
export function toDocumentPoint(l: Layer, p: Point): Point {
  const angle = (l.rotation * Math.PI) / 180;
  const dx = (p.x - l.width / 2) * l.scaleX,
    dy = (p.y - l.height / 2) * l.scaleY;
  return {
    x:
      l.x +
      (l.width * l.scaleX) / 2 +
      dx * Math.cos(angle) -
      dy * Math.sin(angle),
    y:
      l.y +
      (l.height * l.scaleY) / 2 +
      dx * Math.sin(angle) +
      dy * Math.cos(angle),
  };
}
export function selectionBounds(s: Selection) {
  const xs = s.points.map((p) => p.x),
    ys = s.points.map((p) => p.y);
  return {
    x: Math.floor(Math.min(...xs)),
    y: Math.floor(Math.min(...ys)),
    width: Math.max(1, Math.ceil(Math.max(...xs) - Math.min(...xs))),
    height: Math.max(1, Math.ceil(Math.max(...ys) - Math.min(...ys))),
  };
}
export function selected(s: Selection | null, p: Point): boolean {
  if (!s) return true;
  if (s.points.length < 2) return false;
  const b = selectionBounds(s);
  if (s.kind === "rectangle")
    return (
      p.x >= b.x && p.x < b.x + b.width && p.y >= b.y && p.y < b.y + b.height
    );
  if (s.kind === "ellipse")
    return (
      ((p.x - b.x - b.width / 2) / (b.width / 2)) ** 2 +
        ((p.y - b.y - b.height / 2) / (b.height / 2)) ** 2 <=
      1
    );
  let inside = false;
  for (let i = 0, j = s.points.length - 1; i < s.points.length; j = i++) {
    const a = s.points[i],
      b = s.points[j];
    if (
      a.y > p.y !== b.y > p.y &&
      p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x
    )
      inside = !inside;
  }
  return inside;
}
/** Bounded iterative scan; each pixel is visited once, with no recursive stack. */
export function floodFill(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
  color: number[],
  tolerance: number,
  accepts: (x: number, y: number) => boolean = () => true,
) {
  x = Math.floor(x);
  y = Math.floor(y);
  if (x < 0 || y < 0 || x >= width || y >= height) return;
  const start = y * width + x,
    target = [...data.slice(start * 4, start * 4 + 4)];
  const filled = new Uint8Array(width * height);
  const seen = new Uint8Array(width * height),
    queue = new Int32Array(width * height);
  let head = 0,
    tail = 1;
  queue[0] = start;
  seen[start] = 1;
  while (head < tail) {
    const n = queue[head++],
      px = n % width,
      py = Math.floor(n / width),
      offset = n * 4;
    if (
      !accepts(px, py) ||
      target.some((value, c) => Math.abs(value - data[offset + c]) > tolerance)
    )
      continue;
    filled[n] = 1;
    data.set(color, offset);
    for (const neighbor of [
      px ? n - 1 : -1,
      px + 1 < width ? n + 1 : -1,
      py ? n - width : -1,
      py + 1 < height ? n + width : -1,
    ])
      if (neighbor >= 0 && !seen[neighbor]) {
        seen[neighbor] = 1;
        queue[tail++] = neighbor;
      }
  }
  return filled;
}
export function canvas(width: number, height: number) {
  dimensions(width, height);
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  return c;
}
export async function loadImage(source: string) {
  const image = new Image();
  image.src = source;
  await image.decode();
  return image;
}
export async function validateProjectImages(p: ImageProject) {
  for (const l of p.layers)
    if (l.source) {
      const i = await loadImage(l.source);
      if (i.naturalWidth !== l.width || i.naturalHeight !== l.height)
        throw new Error("Layer dimensions do not match the embedded image.");
    }
}
export function drawLayer(
  ctx: CanvasRenderingContext2D,
  l: Layer,
  image?: CanvasImageSource,
) {
  if (!l.visible) return;
  ctx.save();
  ctx.globalAlpha = l.opacity;
  ctx.translate(
    l.x + (l.width * l.scaleX) / 2,
    l.y + (l.height * l.scaleY) / 2,
  );
  ctx.rotate((l.rotation * Math.PI) / 180);
  ctx.scale(l.scaleX, l.scaleY);
  ctx.filter = `brightness(${l.brightness}%) contrast(${l.contrast}%) saturate(${l.saturation}%) blur(${l.blur}px) invert(${l.invert ? 100 : 0}%)`;
  if (l.kind === "text") {
    ctx.font = `${l.fontSize}px sans-serif`;
    ctx.textBaseline = "top";
    ctx.fillStyle = l.color;
    l.text
      .split("\n")
      .forEach((line, index) =>
        ctx.fillText(
          line,
          -l.width / 2,
          -l.height / 2 + index * l.fontSize * 1.2,
        ),
      );
  } else if (image)
    ctx.drawImage(image, -l.width / 2, -l.height / 2, l.width, l.height);
  ctx.restore();
}
export async function renderProject(
  p: ImageProject,
  target = canvas(p.width, p.height),
  cache = new Map<string, HTMLImageElement>(),
) {
  target.width = p.width;
  target.height = p.height;
  const ctx = target.getContext("2d");
  if (!ctx) throw new Error("Canvas is unavailable.");
  if (p.background) {
    ctx.fillStyle = p.background;
    ctx.fillRect(0, 0, p.width, p.height);
  }
  for (const l of p.layers) {
    let image: HTMLImageElement | undefined;
    if (l.source) {
      image = cache.get(l.source);
      if (!image) {
        image = await loadImage(l.source);
        cache.set(l.source, image);
      }
    }
    drawLayer(ctx, l, image);
  }
  return target;
}
export async function exportImage(
  p: ImageProject,
  type: string,
  quality = 0.9,
): Promise<Blob> {
  const target = await renderProject(p);
  return new Promise((resolve, reject) =>
    target.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Image export failed.")),
      type,
      quality,
    ),
  );
}
export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
