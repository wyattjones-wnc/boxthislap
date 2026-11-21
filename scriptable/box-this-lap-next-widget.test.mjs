import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('./box-this-lap-next-widget.js', import.meta.url), 'utf8');
const functions = source.slice(0, source.indexOf('const loadedResult ='))
  + source.slice(source.indexOf('async function loadNextItems()'));
const item = { id: '12', thing: 'Example', date: '2099-01-01', nonAdmin: true, imageUrl: 'https://example.com/art.png' };

function runtime(files, { offline = false, artworkFails = false, image = 'live-image', data = { ok: true, items: [item] } } = {}) {
  const requests = [];
  const context = vm.createContext({
    Size: class { constructor(width, height) { this.width = width; this.height = height; } },
    Rect: class { constructor(x, y, width, height) { Object.assign(this, { x, y, width, height }); } },
    Device: { screenSize: () => ({ width: 390, height: 844 }) },
    DrawContext: class {
      drawImageInRect(image, rect) { this.rect = rect; }
      getImage() { return { size: this.size, rect: this.rect }; }
    },
    args: {}, config: { runsInWidget: true }, Color: class {},
    console: { warn() {} },
    FileManager: { local: () => ({
      documentsDirectory: () => '/cache', joinPath: (a, b) => `${a}/${b}`,
      fileExists: (path) => files.has(path),
      readString: (path) => files.get(path), writeString: (path, value) => files.set(path, value),
      readImage: (path) => files.get(path), writeImage: (path, value) => files.set(path, value),
    }) },
    Request: class {
      constructor(url) { this.url = url; }
      async loadJSON() {
        requests.push({ type: 'data', timeout: this.timeoutInterval });
        if (offline) throw new Error('Offline');
        return data;
      }
      async loadImage() {
        requests.push({ type: 'image', timeout: this.timeoutInterval });
        if (offline || artworkFails) throw new Error('Artwork unavailable');
        return image;
      }
    },
  });
  vm.runInContext(functions, context);
  return { requests, run: (code) => vm.runInContext(code, context) };
}

test('saved items and artwork survive offline runs with no artwork requests', async () => {
  const files = new Map();
  const online = runtime(files);
  assert.equal((await online.run('loadNextItems()')).items.length, 1);
  assert.equal(await online.run(`loadItemImage(${JSON.stringify(item)})`), 'live-image');
  const offline = runtime(files, { offline: true });
  const result = await offline.run('loadNextItems()');
  assert.equal(result.ok, true);
  assert.equal(result.cached, true);
  assert.equal(result.items[0].thing, 'Example');
  assert.equal(await offline.run(`loadItemImage(${JSON.stringify(item)})`), 'live-image');
  assert.deepEqual(offline.requests, [{ type: 'data', timeout: 3 }]);
});

test('online refresh replaces cached items and artwork, and artwork failure uses saved image', async () => {
  const files = new Map();
  const initial = runtime(files);
  await initial.run('loadNextItems()');
  await initial.run(`loadItemImage(${JSON.stringify(item)})`);
  const fresh = runtime(files, { image: 'new-image', data: { ok: true, items: [{ ...item, thing: 'Updated' }] } });
  const result = await fresh.run('loadNextItems()');
  assert.equal(result.cached, undefined);
  assert.equal(result.items[0].thing, 'Updated');
  assert.equal(await fresh.run(`loadItemImage(${JSON.stringify(item)})`), 'new-image');
  const failed = runtime(files, { artworkFails: true });
  await failed.run('loadNextItems()');
  assert.equal(await failed.run(`loadItemImage(${JSON.stringify(item)})`), 'new-image');
});

test('missing artwork cache leaves offline items usable', async () => {
  const files = new Map();
  await runtime(files).run('loadNextItems()');
  const offline = runtime(files, { offline: true });
  assert.equal((await offline.run('loadNextItems()')).cached, true);
  assert.equal(await offline.run(`loadItemImage(${JSON.stringify(item)})`), null);
});

test('empty live lists replace old cached data', async () => {
  const files = new Map();
  await runtime(files).run('loadNextItems()');
  await runtime(files, { data: { ok: true, items: [] } }).run('loadNextItems()');
  assert.equal((await runtime(files, { offline: true }).run('loadNextItems()')).items.length, 0);
});


test('saved positions control portrait and landscape cover crops', () => {
  const app = runtime(new Map());
  const crop = (width, height, x, y) => app.run(`positionItemImage({ size: { width: ${width}, height: ${height} } }, { imagePositionX: ${x}, imagePositionY: ${y} }, new Size(120, 42))`);
  // Portrait image overflows vertically; 0% aligns the top, 100% the bottom.
  assert.equal(Math.abs(crop(100, 200, 50, 0).rect.y), 0);
  assert.equal(crop(100, 200, 50, 100).rect.y, -198);
  assert.equal(crop(100, 200, 50, 80).rect.y, -158.4);
  assert.equal(Math.abs(crop(400, 100, 0, 50).rect.x), 0);
  assert.equal(crop(400, 100, 100, 50).rect.x, -48);
  assert.equal(app.run('positionItemImage({ size: { width: 100, height: 200 } }, {}, new Size(120, 42)).rect.y'), -99);
  assert.equal(app.run('getMediumWidgetSize().width'), 338);
  assert.equal(app.run('getMediumWidgetSize().height'), 158);
});

test('positions normalize and survive cached offline item data', async () => {
  const files = new Map();
  const online = runtime(files, { data: { ok: true, items: [{ ...item, imagePositionX: 20, imagePositionY: 80 }] } });
  await online.run('loadNextItems()');
  const offline = runtime(files, { offline: true });
  const result = await offline.run('loadNextItems()');
  assert.equal(result.items[0].imagePositionX, 20);
  assert.equal(result.items[0].imagePositionY, 80);
  assert.equal(offline.run('normalizeImagePosition(undefined)'), 50);
  assert.equal(offline.run('normalizeImagePosition("invalid")'), 50);
  assert.equal(offline.run('normalizeImagePosition(-10)'), 0);
  assert.equal(offline.run('normalizeImagePosition(110)'), 100);
});


test('medium background renders saved position into its canvas', async () => {
  const app = runtime(new Map(), { image: { size: { width: 400, height: 800 } } });
  assert.equal(await app.run('applyItemBackground(globalThis.testWidget = {}, { imageUrl: "https://example.com/art.png", imagePositionY: 100 })'), true);
  const rect = app.run('testWidget.backgroundImage.rect');
  assert.equal(rect.width, 338);
  assert.equal(rect.height, 676);
  assert.equal(rect.y, -518);
});
