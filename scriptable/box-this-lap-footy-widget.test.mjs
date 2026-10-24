import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('./box-this-lap-footy-widget.js', import.meta.url), 'utf8');
const functions = source.slice(0, source.indexOf('if (!WIDGET_OPTIONS.managerValue) {'))
  + source.slice(source.indexOf('async function loadFixtures() {'));

function load(files, parameter = '', responses = {}, family = 'medium', exerciseBadges = false) {
  let imageRequests = 0;
  const context = vm.createContext({
    args: { widgetParameter: parameter },
    config: { widgetFamily: family, runsInWidget: true },
    Color: class {},
    console: { warn() {} },
    FileManager: { local: () => ({
      documentsDirectory: () => '/cache',
      joinPath: (directory, name) => `${directory}/${name}`,
      fileExists: (path) => files.has(path),
      readString: (path) => files.get(path),
      writeString: (path, value) => files.set(path, value),
      readImage: (path) => files.get(path),
      writeImage: (path, value) => files.set(path, value),
    }) },
    Request: class {
      constructor(url) { this.url = url.split('?')[0]; }
      async loadImage() {
        imageRequests += 1;
        return 'badge-image';
      }
      async loadJSON() {
        if (!(this.url in responses)) throw new Error('No service');
        return responses[this.url];
      }
    },
  });
  vm.runInContext(functions, context);
  const result = vm.runInContext(exerciseBadges
    ? '(async () => { const result = await loadFixtures(); const badges = []; for (const fixture of result.fixtures) badges.push(await loadTeamBadge(fixture)); return { ...result, badges }; })()'
    : 'loadFixtures()', context);
  return result.then((value) => {
    if (exerciseBadges === 'offline') assert.equal(imageRequests, 0);
    if (exerciseBadges === 'online-refresh') assert.equal(imageRequests, value.fixtures.length);
    return value;
  });
}

const scheduleUrl = 'https://wyattjones-wnc.github.io/boxthislap/data/footy-schedule.json';
const managersUrl = 'https://box-this-lap-rankings.boxthislap.workers.dev/api/managers';
const preferencesUrl = `${managersUrl}/9/followed-teams`;
const fixtures = Array.from({ length: 8 }, (_, index) => ({
  id: index, home: 'Arsenal', away: `Opponent ${index}`,
  date: `2099-01-${String(index + 1).padStart(2, '0')}`,
}));
const schedule = { teamSchedules: [{ team: { id: '1' }, fixtures }] };
const responses = {
  [scheduleUrl]: schedule,
  [managersUrl]: { ok: true, managers: [{ id: '9', name: 'Wyatt', active: true }] },
  [preferencesUrl]: { ok: true, teams: [{ teamId: '1' }] },
};

test('keeps the last loaded manager display offline across runs and widget sizes', async () => {
  const files = new Map();
  assert.equal((await load(files, 'Wyatt', responses)).fixtures.length, 3);
  // The complete display survives independently of the individual API caches.
  for (const key of files.keys()) if (!key.includes('-display-')) files.delete(key);
  const offline = await load(files, 'Wyatt', {}, 'large');
  assert.equal(offline.fixtures.length, 8);
  assert.equal(offline.cached, true);
  assert.equal(offline.ok, true);
});

test('manager service failures retain the saved display even with a fresh schedule', async () => {
  const files = new Map();
  await load(files, 'Wyatt', responses);
  for (const key of files.keys()) if (!key.includes('-display-')) files.delete(key);
  const result = await load(files, 'Wyatt', { [scheduleUrl]: { teamSchedules: [] } });
  assert.equal(result.fixtures.length, 3);
  assert.equal(result.cached, true);
});

test('offline first load is neutral and never leaks another manager or channel display', async () => {
  const files = new Map();
  await load(files, 'Wyatt', responses);
  for (const key of files.keys()) if (!key.includes('-display-')) files.delete(key);
  for (const parameter of ['Other', 'dev Wyatt', '']) {
    const result = await load(files, parameter);
    assert.equal(result.ok, true);
    assert.equal(result.error, undefined);
    assert.equal(result.fixtures.length, 0);
  }
  assert.equal((await load(new Map())).pending, true);
});

test('a successful refresh replaces the saved display, including an empty schedule', async () => {
  const files = new Map();
  await load(files, '', responses);
  await load(files, '', { [scheduleUrl]: { teamSchedules: [] } });
  assert.equal((await load(files)).fixtures.length, 0);
});

test('offline display renders saved badges without issuing artwork requests', async () => {
  const files = new Map();
  const online = await load(files, '', responses, 'medium', true);
  assert.equal(online.badges[0], 'badge-image');
  const offline = await load(files, '', {}, 'large', 'offline');
  assert.equal(offline.cached, true);
  assert.equal(offline.badges[0], 'badge-image');
  for (const key of files.keys()) if (key.includes('-badge-')) files.delete(key);
  const missingArt = await load(files, '', {}, 'large', 'offline');
  assert.equal(missingArt.fixtures.length, 8);
  assert.ok(missingArt.badges.every((badge) => badge === null));
});

test('schedule requests share a bounded refresh budget', () => {
  let now = 1000;
  const context = vm.createContext({
    args: {}, config: { runsInWidget: true }, Color: class {},
    Date: { now: () => now },
  });
  vm.runInContext(functions, context);
  assert.equal(vm.runInContext('getRequestTimeout()', context), 3);
  now += 7500;
  assert.equal(vm.runInContext('getRequestTimeout()', context), 0.5);
  now += 500;
  assert.throws(() => vm.runInContext('getRequestTimeout()', context), /budget exhausted/);
});

test('a failed badge still tries its PNG fallback and subsequent teams', async () => {
  const requests = [];
  let now = 1000;
  const files = new Map();
  const context = vm.createContext({
    args: {}, config: { runsInWidget: true }, Color: class {},
    Date: { now: () => now },
    FileManager: { local: () => ({
      documentsDirectory: () => '/cache',
      joinPath: (directory, name) => `${directory}/${name}`,
      fileExists: (path) => files.has(path),
      readImage: (path) => files.get(path),
      writeImage: (path, image) => files.set(path, image),
    }) },
    Request: class {
      constructor(url) { this.url = url; }
      async loadImage() {
        requests.push({ url: this.url, timeout: this.timeoutInterval });
        now += 11000;
        if (this.url.includes('broken')) throw new Error('Unsupported image');
        return this.url;
      }
    },
  });
  vm.runInContext(functions, context);
  const fallback = await vm.runInContext('loadTeamBadge({ teamBadge: "https://example.com/broken.svg", teamId: "6" })', context);
  assert.ok(fallback.endsWith('assets/teams/6/badge.png'));
  const next = await vm.runInContext('loadTeamBadge({ teamBadge: "https://example.com/charlotte.png", teamId: "6" })', context);
  assert.equal(next, 'https://example.com/charlotte.png');
  assert.equal(requests.length, 3);
  assert.ok(requests.every((request) => request.timeout === 10));
  assert.equal(vm.runInContext('refreshFailed', context), false);
});

test('all eight online badges load even after the schedule refresh budget expires', async () => {
  let now = 1000;
  const requests = [];
  const context = vm.createContext({
    args: {}, config: { runsInWidget: true }, Color: class {},
    Date: { now: () => now },
    FileManager: { local: () => ({
      documentsDirectory: () => '/cache',
      joinPath: (directory, name) => `${directory}/${name}`,
      fileExists: () => false,
      writeImage() {},
    }) },
    Request: class {
      constructor(url) { this.url = url; }
      async loadImage() {
        requests.push(this.url);
        assert.equal(this.timeoutInterval, 10);
        now += 2000;
        return this.url;
      }
    },
  });
  vm.runInContext(functions, context);
  // Schedule and manager requests can already have consumed the data budget.
  now += 9000;
  for (let index = 0; index < 8; index += 1) {
    const url = `https://example.com/team-${index}.png`;
    assert.equal(await vm.runInContext(`loadTeamBadge({ teamBadge: "${url}" })`, context), url);
  }
  assert.equal(requests.length, 8);
});

test('online badge loading refreshes existing cached images', async () => {
  const files = new Map();
  await load(files, '', responses, 'medium', true);
  await load(files, '', responses, 'medium', 'online-refresh');
});

test('cached schedule indicator appears only for saved schedule data', () => {
  const labels = [];
  const stack = {
    addStack: () => stack, centerAlignContent() {}, setPadding() {},
    addSpacer() {}, addText: (text) => { labels.push(text); return {}; },
    addImage: () => ({}),
  };
  const context = vm.createContext({
    args: {}, config: {}, Color: class {}, Size: class {},
    Font: { semiboldSystemFont() {} }, SFSymbol: { named: () => ({ image: {} }) },
    widget: stack,
  });
  vm.runInContext(functions, context);
  vm.runInContext('addHeader(widget, { cached: false })', context);
  assert.ok(!labels.includes('CACHED'));
  vm.runInContext('addHeader(widget, { cached: true })', context);
  assert.ok(labels.includes('CACHED'));
});

test('Inter Miami uses the corrected transparent PNG before the missing schedule image', async () => {
  const context = vm.createContext({
    args: {}, config: {}, Color: class {},
    FileManager: { local: () => ({ documentsDirectory: () => '/cache', joinPath: (a, b) => `${a}/${b}`, writeImage() {} }) },
    Request: class {
      constructor(url) { this.url = url; }
      async loadImage() { return this.url; }
    },
  });
  vm.runInContext(functions, context);
  const result = await vm.runInContext('loadTeamBadge({ teamId: "7", teamBadge: "assets/teams/inter-miami-cf.webp" })', context);
  assert.ok(result.endsWith('/assets/teams/7/badge.png'));
});
