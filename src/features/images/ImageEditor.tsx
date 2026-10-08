import {
  Move,
  Scaling,
  Hand,
  Brush,
  Eraser,
  PaintBucket,
  RectangleHorizontal,
  Circle,
  Lasso,
  WandSparkles,
  Undo2,
  Redo2,
  Layers,
  Type,
  Download,
  Save,
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown,
  Scan,
  ImagePlus,
  FolderOpen,
} from "lucide-react";
import { processPixels } from "./pixelTools";
import { useEffect, useRef, useState } from "react";
import { FloatingField } from "../../components/FloatingField/FloatingField";
import {
  canvas,
  dimensions,
  download,
  drawLayer,
  exportImage,
  loadImage,
  MAX_PROJECT_BYTES,
  newLayer,
  newProject,
  parseProject,
  renderProject,
  selectionBounds,
  toDocumentPoint,
  toLayerPoint,
  validateProjectImages,
  type ImageProject,
  type Layer,
  type Point,
  type Selection,
} from "./model";
import styles from "./Images.module.css";

type Gesture = {
  point: Point;
  layer?: Layer;
  working?: HTMLCanvasElement;
  scroll?: Point;
  points: Point[];
  token: number;
  processing?: boolean;
  handle?: "resize" | "rotate";
};
type Tool =
  | "move"
  | "resize"
  | "pan"
  | "brush"
  | "eraser"
  | "fill"
  | "rectangle"
  | "ellipse"
  | "lasso"
  | "wand";
export type CropPreset = {
  id: string;
  name: string;
  width: number;
  height: number;
  context: string;
  version: number;
  is_default: number;
};
export type EditorOptions = {
  width?: number;
  height?: number;
  file?: File;
  limited?: boolean;
  presets?: CropPreset[];
  initialPreset?: CropPreset;
  onSave?: (
    blob: Blob,
    project: ImageProject,
    preset?: CropPreset,
  ) => Promise<void>;
  onDirty?: (dirty: boolean) => void;
};

const toolIcons = {
  move: Move,
  resize: Scaling,
  pan: Hand,
  brush: Brush,
  eraser: Eraser,
  fill: PaintBucket,
  rectangle: RectangleHorizontal,
  ellipse: Circle,
  lasso: Lasso,
  wand: WandSparkles,
};
const toolNames = {
  move: "Move layer",
  resize: "Resize layer",
  pan: "Pan canvas",
  brush: "Brush",
  eraser: "Eraser",
  fill: "Fill",
  rectangle: "Rectangle selection",
  ellipse: "Ellipse selection",
  lasso: "Freehand selection",
  wand: "Connected color selection",
};

export function ImageEditor({
  width = 1200,
  height = 800,
  file,
  limited = false,
  presets = [],
  initialPreset,
  onSave,
  onDirty,
}: EditorOptions) {
  const [project, setProject] = useState(() => newProject(width, height));
  const [active, setActive] = useState("");
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [tool, setTool] = useState<Tool>("move");
  const [color, setColor] = useState("#ffffff");
  const [brushSize, setBrushSize] = useState(24);
  const [hardness, setHardness] = useState(100);
  const [tolerance, setTolerance] = useState(24);
  const [zoom, setZoom] = useState(0.5);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [presetId, setPresetId] = useState(initialPreset?.id || "");
  const [output, setOutput] = useState("image/png");
  const [size, setSize] = useState({ width, height });
  const [historyVersion, setHistoryVersion] = useState(0);
  const target = useRef<HTMLCanvasElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const images = useRef(new Map<string, HTMLImageElement>());
  const projectRef = useRef(project);
  projectRef.current = project;
  const history = useRef<{ undo: string[]; redo: string[] }>({
    undo: [],
    redo: [],
  });
  const saved = useRef(JSON.stringify(project));
  const gesture = useRef<Gesture | null>(null);
  const renderGeneration = useRef(0),
    gestureToken = useRef(0);
  const initialized = useRef(false);
  const current = project.layers.find((l) => l.id === active);
  const preset = presets.find((p) => p.id === presetId);

  function remember(text: string) {
    history.current.undo.push(text);
    while (
      history.current.undo.length > 30 ||
      history.current.undo.reduce((sum, value) => sum + value.length * 2, 0) >
        32_000_000
    )
      history.current.undo.shift();
    history.current.redo = [];
  }
  function commit(next: ImageProject) {
    try {
      parseProject(JSON.stringify(next));
      remember(JSON.stringify(projectRef.current));
      projectRef.current = next;
      setProject(next);
      setHistoryVersion((v) => v + 1);
    } catch (e) {
      setMessage(error(e));
    }
  }
  function updateLayer(changes: Partial<Layer>) {
    if (!current) return;
    commit({
      ...project,
      layers: project.layers.map((l) =>
        l.id === active ? { ...l, ...changes } : l,
      ),
    });
  }
  function undo(redo = false) {
    const from = redo ? history.current.redo : history.current.undo;
    const text = from.pop();
    if (!text) return;
    (redo ? history.current.undo : history.current.redo).push(
      JSON.stringify(projectRef.current),
    );
    const p = parseProject(text);
    projectRef.current = p;
    setProject(p);
    setSelection(null);
    setHistoryVersion((v) => v + 1);
  }
  function error(e: unknown) {
    return e instanceof Error ? e.message : "Image operation failed.";
  }
  async function run(work: () => Promise<void> | void) {
    if (busy || gesture.current) return;
    setBusy(true);
    setMessage("");
    try {
      await work();
    } catch (e) {
      setMessage(error(e));
    } finally {
      setBusy(false);
    }
  }
  async function addImage(input: File) {
    if (!/^image\/(png|jpeg|webp)$/.test(input.type) || input.size > 12_000_000)
      throw new Error("Choose a PNG, JPEG, or WebP image up to 12 MB.");
    const url = URL.createObjectURL(input);
    try {
      const image = await loadImage(url);
      dimensions(image.naturalWidth, image.naturalHeight);
      const c = canvas(image.naturalWidth, image.naturalHeight);
      c.getContext("2d")!.drawImage(image, 0, 0);
      const p = projectRef.current,
        l = newLayer(c.width, c.height, c.toDataURL(), input.name);
      const scale = Math.max(p.width / c.width, p.height / c.height);
      l.scaleX = scale;
      l.scaleY = scale;
      l.x = (p.width - c.width * scale) / 2;
      l.y = (p.height - c.height * scale) / 2;
      commit({ ...p, layers: [...p.layers, l] });
      setActive(l.id);
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  useEffect(() => {
    if (file && !initialized.current) {
      initialized.current = true;
      void run(() => addImage(file));
    }
    // Initial file belongs to this editor instance.
  }, [file]);
  useEffect(() => {
    const generation = ++renderGeneration.current;
    const live = new Set(project.layers.map((l) => l.source));
    for (const source of images.current.keys())
      if (!live.has(source)) images.current.delete(source);
    void renderProject(project, undefined, images.current)
      .then((c) => {
        if (generation !== renderGeneration.current || !target.current) return;
        target.current.width = c.width;
        target.current.height = c.height;
        target.current.getContext("2d")?.drawImage(c, 0, 0);
      })
      .catch((e) => setMessage(error(e)));
    onDirty?.(JSON.stringify(project) !== saved.current);
  }, [project, onDirty]);
  useEffect(() => {
    const paste = (event: ClipboardEvent) => {
      const element = event.target as HTMLElement;
      if (element.closest("input,textarea,[contenteditable]")) return;
      const image = [...(event.clipboardData?.files || [])].find((f) =>
        f.type.startsWith("image/"),
      );
      if (image && !busy) {
        event.preventDefault();
        void run(() => addImage(image));
      }
    };
    const keys = (event: KeyboardEvent) => {
      const element = event.target as HTMLElement;
      if (
        element.closest("input,textarea,[contenteditable]") ||
        busy ||
        gesture.current
      )
        return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        undo(event.shiftKey);
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") {
        event.preventDefault();
        undo(true);
      }
      if (event.key === "Escape") setSelection(null);
    };
    const el = viewport.current?.closest("[data-image-editor]");
    el?.addEventListener("paste", paste as EventListener);
    el?.addEventListener("keydown", keys as EventListener);
    return () => {
      el?.removeEventListener("paste", paste as EventListener);
      el?.removeEventListener("keydown", keys as EventListener);
    };
    // Event handlers read the current document; refresh on control changes.
  }, [project, busy]);

  function point(event: React.PointerEvent): Point {
    const rect = target.current!.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) * project.width) / rect.width,
      y: ((event.clientY - rect.top) * project.height) / rect.height,
    };
  }
  function clip(ctx: CanvasRenderingContext2D, l: Layer) {
    if (!selection) return;
    let points = selection.points;
    if (selection.kind !== "lasso") {
      const b = selectionBounds(selection);
      points =
        selection.kind === "rectangle"
          ? [
              { x: b.x, y: b.y },
              { x: b.x + b.width, y: b.y },
              { x: b.x + b.width, y: b.y + b.height },
              { x: b.x, y: b.y + b.height },
            ]
          : Array.from({ length: 72 }, (_, i) => ({
              x:
                b.x +
                b.width / 2 +
                (Math.cos((i * Math.PI) / 36) * b.width) / 2,
              y:
                b.y +
                b.height / 2 +
                (Math.sin((i * Math.PI) / 36) * b.height) / 2,
            }));
    }
    ctx.beginPath();
    points
      .map((p) => toLayerPoint(l, p))
      .forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    ctx.clip();
  }
  function preview(working: HTMLCanvasElement, l: Layer) {
    const ctx = target.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, project.width, project.height);
    if (project.background) {
      ctx.fillStyle = project.background;
      ctx.fillRect(0, 0, project.width, project.height);
    }
    for (const layer of project.layers)
      drawLayer(
        ctx,
        layer,
        layer.id === l.id ? working : images.current.get(layer.source),
      );
  }
  function paint(g: Gesture, p: Point) {
    if (!g.working || !g.layer) return;
    const ctx = g.working.getContext("2d")!,
      start = toLayerPoint(g.layer, g.point),
      end = toLayerPoint(g.layer, p);
    ctx.save();
    clip(ctx, g.layer);
    ctx.globalCompositeOperation =
      tool === "eraser" ? "destination-out" : "source-over";
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = brushSize / Math.sqrt(g.layer.scaleX * g.layer.scaleY);
    if (hardness < 100) {
      const radius = ctx.lineWidth / 2;
      const distance = Math.hypot(end.x - start.x, end.y - start.y);
      const steps = Math.max(
        1,
        Math.ceil(distance / Math.max(0.5, radius / 4)),
      );
      for (let i = distance === 0 ? steps : 0; i <= steps; i++) {
        const x = start.x + ((end.x - start.x) * i) / steps;
        const y = start.y + ((end.y - start.y) * i) / steps;
        const gradient = ctx.createRadialGradient(
          x,
          y,
          (radius * hardness) / 100,
          x,
          y,
          radius,
        );
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, `${color}00`);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(end.x, end.y, ctx.lineWidth / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    g.point = p;
    preview(g.working, g.layer);
  }
  async function pointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    if (busy || gesture.current) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const p = point(event);
    const selectedLayer =
      tool === "move" || tool === "resize"
        ? [...project.layers].reverse().find((l) => {
            const local = toLayerPoint(l, p);
            return (
              l.visible &&
              local.x >= 0 &&
              local.y >= 0 &&
              local.x <= l.width &&
              local.y <= l.height
            );
          }) || current
        : current;
    if (selectedLayer && (tool === "move" || tool === "resize"))
      setActive(selectedLayer.id);
    const token = ++gestureToken.current;
    const g = {
      point: p,
      points: [p],
      layer: selectedLayer ? { ...selectedLayer } : undefined,
      token,
    } as Gesture;
    if (tool === "resize") g.handle = "resize";
    gesture.current = g;
    if (tool === "pan") {
      g.scroll = { x: event.clientX, y: event.clientY };
      return;
    }
    if (["rectangle", "ellipse", "lasso"].includes(tool)) {
      setSelection({ kind: tool as Selection["kind"], points: [p, p] });
      return;
    }
    if (!selectedLayer) {
      gesture.current = null;
      setMessage("Add or select a layer first.");
      return;
    }
    if (tool === "move" || tool === "resize") return;
    if (selectedLayer.kind !== "raster") {
      gesture.current = null;
      setMessage("Rasterize the text layer before painting.");
      return;
    }
    try {
      const c = canvas(selectedLayer.width, selectedLayer.height),
        ctx = c.getContext("2d")!;
      if (selectedLayer.source)
        ctx.drawImage(
          images.current.get(selectedLayer.source) ||
            (await loadImage(selectedLayer.source)),
          0,
          0,
        );
      if (gesture.current?.token !== token) return;
      g.working = c;
      if (tool === "brush" || tool === "eraser") paint(g, p);
      else {
        const lp = toLayerPoint(selectedLayer, p),
          data = ctx.getImageData(0, 0, c.width, c.height);
        const rgba = [
          parseInt(color.slice(1, 3), 16),
          parseInt(color.slice(3, 5), 16),
          parseInt(color.slice(5, 7), 16),
          255,
        ];
        g.processing = true;
        setBusy(true);
        const requestedTool = tool;
        let mask: ImageData | undefined;
        if (selection) {
          const m = canvas(c.width, c.height),
            maskContext = m.getContext("2d")!;
          maskContext.save();
          clip(maskContext, selectedLayer);
          maskContext.fillStyle = "#fff";
          maskContext.fillRect(0, 0, m.width, m.height);
          maskContext.restore();
          mask = maskContext.getImageData(0, 0, m.width, m.height);
        }
        const result = await processPixels(
          data,
          lp.x,
          lp.y,
          rgba,
          tolerance,
          requestedTool === "wand",
          mask,
        );
        ctx.putImageData(result.data, 0, 0);
        if (requestedTool === "wand" && result.cut) {
          const cut = canvas(c.width, c.height);
          cut.getContext("2d")!.putImageData(result.cut, 0, 0);
          const l = {
            ...selectedLayer,
            id: crypto.randomUUID(),
            name: `${selectedLayer.name} selection`.slice(0, 200),
            source: cut.toDataURL(),
          };
          commit({
            ...project,
            layers: [
              ...project.layers.map((layer) =>
                layer.id === active
                  ? { ...layer, source: c.toDataURL() }
                  : layer,
              ),
              l,
            ],
          });
          setActive(l.id);
          setTool("move");
          setSelection(null);
          setMessage("Connected color selection lifted into its own layer.");
        } else updateLayer({ source: c.toDataURL() });
        setBusy(false);
        gesture.current = null;
      }
    } catch (e) {
      gesture.current = null;
      setMessage(error(e));
      setBusy(false);
    }
  }
  function startHandle(
    event: React.PointerEvent<SVGElement>,
    handle: "resize" | "rotate",
  ) {
    if (!current || busy || gesture.current) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    gesture.current = {
      point: point(event),
      points: [],
      layer: { ...current },
      token: ++gestureToken.current,
      handle,
    };
  }
  function pointerMove(event: React.PointerEvent) {
    const g = gesture.current;
    if (!g || g.processing) return;
    const p = point(event);
    if (g.handle && g.layer) {
      const l = g.layer,
        center = toDocumentPoint(l, { x: l.width / 2, y: l.height / 2 });
      const factor =
        Math.hypot(p.x - center.x, p.y - center.y) /
        Math.max(1, Math.hypot(g.point.x - center.x, g.point.y - center.y));
      const rotation =
        l.rotation +
        ((Math.atan2(p.y - center.y, p.x - center.x) -
          Math.atan2(g.point.y - center.y, g.point.x - center.x)) *
          180) /
          Math.PI;
      const scaleX = Math.max(0.01, Math.min(100, l.scaleX * factor)),
        scaleY = Math.max(0.01, Math.min(100, l.scaleY * factor));
      const changes =
        g.handle === "rotate"
          ? { rotation }
          : {
              scaleX,
              scaleY,
              x: center.x - (l.width * scaleX) / 2,
              y: center.y - (l.height * scaleY) / 2,
            };
      setProject({
        ...projectRef.current,
        layers: projectRef.current.layers.map((layer) =>
          layer.id === l.id ? { ...layer, ...changes } : layer,
        ),
      });
    } else if (tool === "pan" && g.scroll && viewport.current) {
      viewport.current.scrollLeft -= event.clientX - g.scroll.x;
      viewport.current.scrollTop -= event.clientY - g.scroll.y;
      g.scroll = { x: event.clientX, y: event.clientY };
    } else if (["rectangle", "ellipse", "lasso"].includes(tool)) {
      if (tool === "lasso") g.points.push(p);
      setSelection({
        kind: tool as Selection["kind"],
        points: tool === "lasso" ? [...g.points] : [g.point, p],
      });
    } else if (tool === "move" && g.layer) {
      setProject({
        ...projectRef.current,
        layers: projectRef.current.layers.map((l) =>
          l.id === g.layer!.id
            ? {
                ...l,
                x: g.layer!.x + p.x - g.point.x,
                y: g.layer!.y + p.y - g.point.y,
              }
            : l,
        ),
      });
    } else if (g.working) paint(g, p);
  }
  function pointerUp() {
    const g = gesture.current;
    if (!g || g.processing) return;
    ++gestureToken.current;
    gesture.current = null;
    if (g.working && g.layer) updateLayer({ source: g.working.toDataURL() });
    else if ((tool === "move" || g.handle) && g.layer) {
      const before = {
        ...projectRef.current,
        layers: projectRef.current.layers.map((l) =>
          l.id === g.layer!.id ? g.layer! : l,
        ),
      };
      if (JSON.stringify(before) !== JSON.stringify(projectRef.current))
        remember(JSON.stringify(before));
      setHistoryVersion((v) => v + 1);
    }
  }
  async function rasterize() {
    if (!current) return;
    const c = canvas(project.width, project.height),
      ctx = c.getContext("2d")!;
    drawLayer(
      ctx,
      current,
      current.source ? await loadImage(current.source) : undefined,
    );
    updateLayer({
      ...newLayer(c.width, c.height, c.toDataURL(), current.name),
      id: current.id,
    });
  }
  async function deleteSelection() {
    if (!current || current.kind !== "raster" || !selection) return;
    const c = canvas(current.width, current.height),
      ctx = c.getContext("2d")!;
    if (current.source) ctx.drawImage(await loadImage(current.source), 0, 0);
    ctx.save();
    clip(ctx, current);
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.restore();
    updateLayer({ source: c.toDataURL() });
  }
  async function liftSelection() {
    if (!current || current.kind !== "raster" || !selection) return;
    const source = current.source ? await loadImage(current.source) : null;
    const cut = canvas(current.width, current.height),
      rest = canvas(current.width, current.height);
    const cutCtx = cut.getContext("2d")!,
      restCtx = rest.getContext("2d")!;
    cutCtx.save();
    clip(cutCtx, current);
    if (source) cutCtx.drawImage(source, 0, 0);
    cutCtx.restore();
    if (source) restCtx.drawImage(source, 0, 0);
    restCtx.save();
    clip(restCtx, current);
    restCtx.clearRect(0, 0, rest.width, rest.height);
    restCtx.restore();
    const l = {
      ...current,
      id: crypto.randomUUID(),
      name: `${current.name} selection`,
      source: cut.toDataURL(),
    };
    commit({
      ...project,
      layers: [
        ...project.layers.map((layer) =>
          layer.id === active ? { ...layer, source: rest.toDataURL() } : layer,
        ),
        l,
      ],
    });
    setActive(l.id);
    setSelection(null);
    setTool("move");
  }
  const selectionBox = selection ? selectionBounds(selection) : null;
  void historyVersion;
  return (
    <section
      data-image-editor
      className={styles.editor}
      tabIndex={0}
      aria-label="Layered image editor"
      aria-busy={busy}
    >
      <div className={styles.toolbar}>
        <label className="action-button" title="Add image">
          <ImagePlus size={18} aria-hidden="true" />
          <span className={styles.srOnly}>Add image</span>
          <input
            className={styles.srOnly}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) void run(() => addImage(f));
            }}
          />
        </label>
        {!limited && (
          <>
            <button
              title="Paint layer"
              type="button"
              disabled={busy}
              onClick={() => {
                const l = newLayer(
                  project.width,
                  project.height,
                  "",
                  "Paint layer",
                );
                commit({ ...project, layers: [...project.layers, l] });
                setActive(l.id);
              }}
            >
              <Layers size={18} aria-hidden="true" />
              <span className={styles.srOnly}>Paint layer</span>
            </button>
            <button
              title="Text layer"
              type="button"
              disabled={busy}
              onClick={() => {
                const l = {
                  ...newLayer(
                    project.width,
                    Math.min(200, project.height),
                    "",
                    "Text",
                  ),
                  kind: "text" as const,
                  text: "Text",
                  color,
                };
                commit({ ...project, layers: [...project.layers, l] });
                setActive(l.id);
              }}
            >
              <Type size={18} aria-hidden="true" />
              <span className={styles.srOnly}>Text layer</span>
            </button>
          </>
        )}
        <button
          title="Save project"
          type="button"
          disabled={busy}
          onClick={() => {
            download(
              new Blob([JSON.stringify(project)], { type: "application/json" }),
              "image.btl-image.json",
            );
            saved.current = JSON.stringify(project);
            onDirty?.(false);
            setMessage("Layered project saved locally.");
          }}
        >
          <Save size={18} aria-hidden="true" />
          <span className={styles.srOnly}>Save project</span>
        </button>
        <label className="action-button" title="Open project">
          <FolderOpen size={18} aria-hidden="true" />
          <span className={styles.srOnly}>Open project</span>
          <input
            className={styles.srOnly}
            type="file"
            accept=".json"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f)
                void run(async () => {
                  if (f.size > MAX_PROJECT_BYTES)
                    throw new Error("Project exceeds 48 MB.");
                  const p = parseProject(await f.text());
                  if (
                    limited &&
                    (p.width !== project.width || p.height !== project.height)
                  )
                    throw new Error("Project dimensions must match this crop.");
                  await validateProjectImages(p);
                  commit(p);
                  setActive(p.layers[0]?.id || "");
                  setSelection(null);
                  saved.current = JSON.stringify(p);
                  onDirty?.(false);
                });
            }}
          />
        </label>
      </div>
      <div className={styles.toolStrip} role="toolbar" aria-label="Image tools">
        {(Object.keys(toolIcons) as Tool[])
          .filter((t) => !limited || ["move", "resize", "pan"].includes(t))
          .map((t) => {
            const Icon = toolIcons[t];
            return (
              <button
                key={t}
                type="button"
                title={toolNames[t]}
                aria-label={toolNames[t]}
                aria-pressed={tool === t}
                disabled={busy}
                onClick={() => setTool(t)}
              >
                <Icon size={20} />
              </button>
            );
          })}
        <span className={styles.toolHint}>
          {tool === "resize"
            ? "Drag a corner to resize · proportions stay locked"
            : tool === "move"
              ? "Click a layer to select · drag to move · double-click for properties"
              : toolNames[tool]}
        </span>
      </div>
      <fieldset
        className={styles.workspace}
        disabled={busy}
        aria-label="Image editing controls"
      >
        <aside className={styles.controls}>
          <label>
            Zoom{" "}
            <input
              type="range"
              min="0.05"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
            />
          </label>
          <button
            title="Fit canvas"
            type="button"
            onClick={() =>
              setZoom(
                Math.min(
                  1,
                  Math.max(
                    0.05,
                    ((viewport.current?.clientWidth || 600) - 48) /
                      project.width,
                  ),
                ),
              )
            }
          >
            <Scan size={18} aria-hidden="true" />
            <span className={styles.srOnly}>Fit canvas</span>
          </button>
          {!limited && ["brush", "eraser", "fill", "wand"].includes(tool) && (
            <>
              <label>
                Color{" "}
                <input
                  aria-label="Paint color"
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                />
              </label>
              {(tool === "brush" || tool === "eraser") && (
                <FloatingField label="Brush size">
                  <input
                    type="number"
                    min="1"
                    max="500"
                    value={brushSize}
                    onChange={(e) =>
                      setBrushSize(
                        Math.max(1, Math.min(500, Number(e.target.value))),
                      )
                    }
                  />
                </FloatingField>
              )}
              {(tool === "brush" || tool === "eraser") && (
                <label>
                  Hardness {hardness}%
                  <input
                    aria-label="Tool hardness"
                    type="range"
                    min="0"
                    max="100"
                    value={hardness}
                    onChange={(e) => setHardness(Number(e.target.value))}
                  />
                  <small>0% soft · 100% sharp</small>
                </label>
              )}
              {(tool === "fill" || tool === "wand") && (
                <FloatingField label="Color tolerance">
                  <input
                    type="number"
                    min="0"
                    max="255"
                    value={tolerance}
                    onChange={(e) =>
                      setTolerance(
                        Math.max(0, Math.min(255, Number(e.target.value))),
                      )
                    }
                  />
                </FloatingField>
              )}
            </>
          )}
          {presets.length > 0 && (
            <FloatingField label="Crop preset">
              <select
                value={presetId}
                disabled={busy}
                onChange={(e) => {
                  const p = presets.find((p) => p.id === e.target.value);
                  if (!p) return;
                  setPresetId(p.id);
                  setSelection(null);
                  commit({ ...project, width: p.width, height: p.height });
                }}
              >
                <option value="">Current dimensions</option>
                {presets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.width} × {p.height})
                  </option>
                ))}
              </select>
            </FloatingField>
          )}
          {!limited && (
            <details className={styles.settings}>
              <summary>Canvas size & background</summary>
              <div className={styles.propertyGrid}>
                <FloatingField label="Canvas width">
                  <input
                    type="number"
                    value={size.width}
                    min="1"
                    max="8192"
                    onChange={(e) =>
                      setSize({ ...size, width: Number(e.target.value) })
                    }
                  />
                </FloatingField>
                <FloatingField label="Canvas height">
                  <input
                    type="number"
                    value={size.height}
                    min="1"
                    max="8192"
                    onChange={(e) =>
                      setSize({ ...size, height: Number(e.target.value) })
                    }
                  />
                </FloatingField>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void run(() => {
                      dimensions(size.width, size.height);
                      commit({ ...project, ...size });
                      setSelection(null);
                    })
                  }
                >
                  Resize canvas
                </button>
                <small>
                  Changes output bounds; use Resize layer to scale an image.
                </small>
              </div>
            </details>
          )}
          <label>
            <input
              type="checkbox"
              checked={!project.background}
              onChange={(e) =>
                commit({
                  ...project,
                  background: e.target.checked ? "" : "#ffffff",
                })
              }
            />{" "}
            Transparent background
          </label>
          {project.background && (
            <input
              aria-label="Background color"
              type="color"
              value={project.background}
              onChange={(e) =>
                commit({ ...project, background: e.target.value })
              }
            />
          )}
          <p>
            {project.width} × {project.height} pixels
          </p>
          {selection && !limited && (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => void run(liftSelection)}
              >
                Move selection to layer
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void run(deleteSelection)}
              >
                Erase selection
              </button>
              <button
                type="button"
                onClick={() => {
                  const b = selectionBounds(selection);
                  commit({
                    ...project,
                    width: b.width,
                    height: b.height,
                    layers: project.layers.map((l) => ({
                      ...l,
                      x: l.x - b.x,
                      y: l.y - b.y,
                    })),
                  });
                  setSelection(null);
                }}
              >
                Crop canvas to selection
              </button>
              <button type="button" onClick={() => setSelection(null)}>
                Clear selection
              </button>
            </>
          )}
        </aside>
        <div className={styles.viewport} ref={viewport}>
          <div
            className={styles.canvasHistory}
            role="toolbar"
            aria-label="Canvas history"
          >
            <button
              title="Undo"
              type="button"
              disabled={!history.current.undo.length || busy}
              onClick={() => undo()}
            >
              <Undo2 size={18} aria-hidden="true" />
              <span>Undo</span>
            </button>
            <button
              title="Redo"
              type="button"
              disabled={!history.current.redo.length || busy}
              onClick={() => undo(true)}
            >
              <Redo2 size={18} aria-hidden="true" />
              <span>Redo</span>
            </button>
          </div>
          <div
            className={styles.canvasWrap}
            style={{
              width: project.width * zoom,
              height: project.height * zoom,
            }}
          >
            <canvas
              aria-label="Image canvas"
              ref={target}
              onPointerDown={(e) => void pointerDown(e)}
              onPointerMove={pointerMove}
              onPointerUp={pointerUp}
              onPointerCancel={pointerUp}
              onDoubleClick={() => {
                if (tool === "move" || tool === "resize") {
                  setTool("move");
                  setInspectorOpen(true);
                }
              }}
              style={{
                width: "100%",
                height: "100%",
                cursor:
                  tool === "pan"
                    ? "grab"
                    : tool === "resize"
                      ? "nwse-resize"
                      : tool === "move"
                        ? "move"
                        : "crosshair",
              }}
            />
            {current && (tool === "move" || tool === "resize") && (
              <svg
                className={styles.transform}
                viewBox={`0 0 ${project.width} ${project.height}`}
                aria-label="Layer transform handles"
              >
                <polygon
                  points={[
                    { x: 0, y: 0 },
                    { x: current.width, y: 0 },
                    { x: current.width, y: current.height },
                    { x: 0, y: current.height },
                  ]
                    .map((p) => {
                      const world = toDocumentPoint(current, p);
                      return `${world.x},${world.y}`;
                    })
                    .join(" ")}
                />
                {tool === "resize" && (
                  <>
                    {[
                      { x: 0, y: 0 },
                      { x: current.width, y: 0 },
                      { x: current.width, y: current.height },
                      { x: 0, y: current.height },
                    ].map((corner, index) => {
                      const p = toDocumentPoint(current, corner);
                      return (
                        <circle
                          key={index}
                          aria-label={`Resize layer corner ${index + 1}`}
                          data-transform-handle="resize"
                          cx={p.x}
                          cy={p.y}
                          r={12 / zoom}
                          onPointerDown={(e) => startHandle(e, "resize")}
                          onPointerMove={pointerMove}
                          onPointerUp={pointerUp}
                          onPointerCancel={pointerUp}
                        />
                      );
                    })}
                    {(() => {
                      const p = toDocumentPoint(current, {
                        x: current.width / 2,
                        y: -30 / zoom,
                      });
                      return (
                        <circle
                          aria-label="Rotate layer"
                          data-transform-handle="rotate"
                          cx={p.x}
                          cy={p.y}
                          r={12 / zoom}
                          onPointerDown={(e) => startHandle(e, "rotate")}
                          onPointerMove={pointerMove}
                          onPointerUp={pointerUp}
                          onPointerCancel={pointerUp}
                        />
                      );
                    })()}
                  </>
                )}
              </svg>
            )}
            {selectionBox && (
              <svg
                className={styles.selection}
                viewBox={`0 0 ${project.width} ${project.height}`}
                aria-hidden="true"
              >
                <path
                  vectorEffect="non-scaling-stroke"
                  d={
                    selection!.kind === "ellipse"
                      ? `M ${selectionBox.x} ${selectionBox.y + selectionBox.height / 2} a ${selectionBox.width / 2} ${selectionBox.height / 2} 0 1 0 ${selectionBox.width} 0 a ${selectionBox.width / 2} ${selectionBox.height / 2} 0 1 0 ${-selectionBox.width} 0`
                      : selection!.kind === "lasso"
                        ? `M ${selection!.points.map((p) => `${p.x} ${p.y}`).join(" L ")} Z`
                        : `M ${selectionBox.x} ${selectionBox.y} h ${selectionBox.width} v ${selectionBox.height} h ${-selectionBox.width} Z`
                  }
                />
              </svg>
            )}
          </div>
        </div>
        <aside className={styles.controls}>
          <h3>Layers</h3>
          <div className={styles.layers}>
            {[...project.layers].reverse().map((l) => (
              <div key={l.id}>
                <input
                  aria-label={`Show ${l.name}`}
                  type="checkbox"
                  checked={l.visible}
                  onChange={(e) =>
                    commit({
                      ...project,
                      layers: project.layers.map((layer) =>
                        layer.id === l.id
                          ? { ...layer, visible: e.target.checked }
                          : layer,
                      ),
                    })
                  }
                />
                <button
                  type="button"
                  aria-pressed={l.id === active}
                  onClick={() => {
                    setActive(l.id);
                    setTool("move");
                    setInspectorOpen(true);
                  }}
                >
                  {l.name}
                </button>
              </div>
            ))}
          </div>
          {current && (
            <details
              className={styles.settings}
              open={inspectorOpen}
              onToggle={(e) => setInspectorOpen(e.currentTarget.open)}
            >
              <summary>Layer properties</summary>
              <div className={styles.propertyGrid}>
                <FloatingField label="Layer name">
                  <input
                    value={current.name}
                    maxLength={200}
                    onChange={(e) => updateLayer({ name: e.target.value })}
                  />
                </FloatingField>
                <div className={styles.toolbar}>
                  <button
                    title="Up"
                    type="button"
                    onClick={() => {
                      const index = project.layers.findIndex(
                        (l) => l.id === active,
                      );
                      if (index < project.layers.length - 1) {
                        const layers = [...project.layers];
                        [layers[index], layers[index + 1]] = [
                          layers[index + 1],
                          layers[index],
                        ];
                        commit({ ...project, layers });
                      }
                    }}
                  >
                    <ArrowUp size={18} aria-hidden="true" />
                    <span className={styles.srOnly}>Up</span>
                  </button>
                  <button
                    title="Down"
                    type="button"
                    onClick={() => {
                      const index = project.layers.findIndex(
                        (l) => l.id === active,
                      );
                      if (index > 0) {
                        const layers = [...project.layers];
                        [layers[index], layers[index - 1]] = [
                          layers[index - 1],
                          layers[index],
                        ];
                        commit({ ...project, layers });
                      }
                    }}
                  >
                    <ArrowDown size={18} aria-hidden="true" />
                    <span className={styles.srOnly}>Down</span>
                  </button>
                  <button
                    title="Duplicate"
                    type="button"
                    onClick={() => {
                      const l = {
                        ...current,
                        id: crypto.randomUUID(),
                        name: `${current.name} copy`.slice(0, 200),
                      };
                      commit({ ...project, layers: [...project.layers, l] });
                      setActive(l.id);
                    }}
                  >
                    <Copy size={18} aria-hidden="true" />
                    <span className={styles.srOnly}>Duplicate</span>
                  </button>
                  <button
                    title="Delete"
                    type="button"
                    onClick={() => {
                      commit({
                        ...project,
                        layers: project.layers.filter((l) => l.id !== active),
                      });
                      setActive("");
                    }}
                  >
                    <Trash2 size={18} aria-hidden="true" />
                    <span className={styles.srOnly}>Delete</span>
                  </button>
                </div>
                {(["width", "height"] as const).map((dimension) => (
                  <FloatingField
                    key={dimension}
                    label={`${dimension === "width" ? "Width" : "Height"} (px)`}
                  >
                    <input
                      type="number"
                      min="1"
                      max="819200"
                      aria-label={`Image ${dimension} (px)`}
                      value={Math.round(
                        current[dimension] *
                          (dimension === "width"
                            ? current.scaleX
                            : current.scaleY),
                      )}
                      onChange={(e) => {
                        const factor =
                          Math.max(1, Number(e.target.value)) /
                          (current[dimension] *
                            (dimension === "width"
                              ? current.scaleX
                              : current.scaleY));
                        updateLayer({
                          scaleX: Math.min(
                            100,
                            Math.max(0.01, current.scaleX * factor),
                          ),
                          scaleY: Math.min(
                            100,
                            Math.max(0.01, current.scaleY * factor),
                          ),
                        });
                      }}
                    />
                  </FloatingField>
                ))}
                <button
                  className={styles.wide}
                  type="button"
                  onClick={() => {
                    const scale = Math.min(
                      project.width / current.width,
                      project.height / current.height,
                    );
                    updateLayer({
                      scaleX: scale,
                      scaleY: scale,
                      x: (project.width - current.width * scale) / 2,
                      y: (project.height - current.height * scale) / 2,
                    });
                    setTool("resize");
                  }}
                >
                  Fit image to canvas
                </button>
                {(["x", "y", "rotation"] as const).map((key) => (
                  <FloatingField
                    key={key}
                    label={
                      key === "rotation"
                        ? "Rotation (degrees)"
                        : key.toUpperCase()
                    }
                  >
                    <input
                      type="number"
                      value={current[key]}
                      onChange={(e) =>
                        updateLayer({ [key]: Number(e.target.value) })
                      }
                    />
                  </FloatingField>
                ))}
                <details className={styles.settings}>
                  <summary>Scale percentages</summary>
                  <div className={styles.propertyGrid}>
                    <FloatingField label="Scale (%)">
                      <input
                        type="number"
                        min="1"
                        max="10000"
                        value={Math.round(current.scaleX * 10000) / 100}
                        onChange={(e) =>
                          updateLayer({
                            scaleX: Number(e.target.value) / 100,
                            scaleY: Number(e.target.value) / 100,
                          })
                        }
                      />
                    </FloatingField>
                    {!limited && (
                      <FloatingField label="Vertical scale (%)">
                        <input
                          type="number"
                          min="1"
                          max="10000"
                          value={Math.round(current.scaleY * 10000) / 100}
                          onChange={(e) =>
                            updateLayer({
                              scaleY: Number(e.target.value) / 100,
                            })
                          }
                        />
                      </FloatingField>
                    )}
                  </div>
                </details>
                <label>
                  Opacity
                  <input
                    aria-label="Layer opacity"
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={current.opacity}
                    onChange={(e) =>
                      updateLayer({ opacity: Number(e.target.value) })
                    }
                  />
                </label>
                {current.kind === "text" && (
                  <>
                    <FloatingField label="Text">
                      <textarea
                        value={current.text}
                        maxLength={10000}
                        onChange={(e) => updateLayer({ text: e.target.value })}
                      />
                    </FloatingField>
                    <FloatingField label="Font size">
                      <input
                        type="number"
                        min="1"
                        max="2000"
                        value={current.fontSize}
                        onChange={(e) =>
                          updateLayer({ fontSize: Number(e.target.value) })
                        }
                      />
                    </FloatingField>
                    <input
                      aria-label="Text color"
                      type="color"
                      value={current.color}
                      onChange={(e) => updateLayer({ color: e.target.value })}
                    />
                  </>
                )}
                {!limited && (
                  <>
                    <details className={styles.settings}>
                      <summary>Adjustments & raster tools</summary>
                      {(
                        [
                          "brightness",
                          "contrast",
                          "saturation",
                          "blur",
                        ] as const
                      ).map((key) => (
                        <label key={key}>
                          {key}
                          <input
                            aria-label={key}
                            type="range"
                            min="0"
                            max={key === "blur" ? 100 : 300}
                            value={current[key]}
                            onChange={(e) =>
                              updateLayer({ [key]: Number(e.target.value) })
                            }
                          />
                        </label>
                      ))}
                      <label>
                        <input
                          type="checkbox"
                          checked={current.invert}
                          onChange={(e) =>
                            updateLayer({ invert: e.target.checked })
                          }
                        />{" "}
                        Invert colors
                      </label>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void run(rasterize)}
                      >
                        Rasterize layer
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          void run(async () => {
                            const c = await renderProject({
                              ...project,
                              background: "",
                            });
                            const l = newLayer(
                              c.width,
                              c.height,
                              c.toDataURL(),
                              "Merged image",
                            );
                            commit({ ...project, layers: [l] });
                            setActive(l.id);
                          })
                        }
                      >
                        Merge visible layers
                      </button>
                    </details>
                  </>
                )}
              </div>
            </details>
          )}
        </aside>
      </fieldset>
      <div className={styles.toolbar}>
        <FloatingField label="Export format">
          <select value={output} onChange={(e) => setOutput(e.target.value)}>
            <option value="image/png">PNG (transparency)</option>
            <option value="image/webp">WebP (smaller)</option>
            <option value="image/jpeg">JPEG</option>
          </select>
        </FloatingField>
        <button
          title="Export image"
          type="button"
          disabled={busy}
          onClick={() =>
            void run(async () => {
              if (output === "image/jpeg" && !project.background)
                throw new Error(
                  "Choose a background color before exporting JPEG.",
                );
              download(
                await exportImage(project, output),
                `image.${output.split("/")[1]}`,
              );
              setMessage("Finished image exported locally.");
            })
          }
        >
          <Download size={18} aria-hidden="true" />
          <span className={styles.srOnly}>Export image</span>
        </button>
        {onSave && (
          <button
            className="action-button"
            type="button"
            disabled={busy || !project.layers.length}
            onClick={() =>
              void run(async () => {
                const blob = await exportImage(project, "image/webp");
                if (blob.size > 5 * 1024 * 1024)
                  throw new Error(
                    "Finished image exceeds 5 MB. Reduce its dimensions or simplify it.",
                  );
                await onSave(blob, project, preset);
                saved.current = JSON.stringify(project);
                onDirty?.(false);
                setMessage("Image saved.");
              })
            }
          >
            {limited ? "Use cropped image" : "Upload finished image"}
          </button>
        )}
      </div>
      <p className={styles.status} role="status">
        {message ||
          "Paste an image here, or add one from a file. Drag with Move to position it anywhere inside or outside the canvas."}
      </p>
    </section>
  );
}
