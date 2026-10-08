import { describe, expect, it } from "vitest";
import {
  floodFill,
  newLayer,
  newProject,
  parseProject,
  selected,
  toDocumentPoint,
  toLayerPoint,
} from "./model";
describe("local layered projects and image tools", () => {
  it("round-trips layers positioned outside the fixed canvas with rotations", () => {
    const p = newProject(1200, 800),
      l = newLayer(400, 300);
    Object.assign(l, { x: -250, y: 600, scaleX: 2, scaleY: 0.5, rotation: 37 });
    p.layers.push(l);
    expect(parseProject(JSON.stringify(p))).toEqual(p);
    const point = { x: 53, y: 128 };
    const local = toLayerPoint(l, toDocumentPoint(l, point));
    expect(local.x).toBeCloseTo(point.x);
    expect(local.y).toBeCloseTo(point.y);
  });
  it("rejects external image references, invalid transforms, and excessive pixel allocations", () => {
    const p = newProject(),
      l = newLayer(400, 300);
    p.layers.push(l);
    l.source = "https://external.test/a.png";
    expect(() => parseProject(JSON.stringify(p))).toThrow("Invalid layer");
    l.source = "";
    l.scaleX = 0;
    expect(() => parseProject(JSON.stringify(p))).toThrow("scaleX");
    expect(() => newProject(8192, 8192)).toThrow("16 million");
  });
  it("supports rectangular, elliptical, and freehand selections", () => {
    const points = [
      { x: 0, y: 0 },
      { x: 100, y: 100 },
    ];
    expect(selected({ kind: "rectangle", points }, { x: 1, y: 1 })).toBe(true);
    expect(selected({ kind: "ellipse", points }, { x: 1, y: 1 })).toBe(false);
    expect(selected({ kind: "ellipse", points }, { x: 50, y: 50 })).toBe(true);
    expect(
      selected(
        {
          kind: "lasso",
          points: [
            { x: 0, y: 0 },
            { x: 100, y: 0 },
            { x: 0, y: 100 },
          ],
        },
        { x: 80, y: 80 },
      ),
    ).toBe(false);
  });
  it("fills connected colors only and respects selection boundaries", () => {
    const pixel = [0, 0, 0, 255],
      white = [255, 255, 255, 255];
    const data = new Uint8ClampedArray([
      ...pixel,
      ...white,
      ...pixel,
      ...pixel,
      ...white,
      ...pixel,
    ]);
    floodFill(data, 3, 2, 0, 0, [255, 0, 0, 255], 0, (_x, y) => y === 0);
    expect([...data.slice(0, 4)]).toEqual([255, 0, 0, 255]);
    expect([...data.slice(12, 16)]).toEqual(pixel);
    expect([...data.slice(8, 12)]).toEqual(pixel);
  });
});
