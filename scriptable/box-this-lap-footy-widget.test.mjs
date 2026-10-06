import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('./box-this-lap-footy-widget.js', import.meta.url), 'utf8');
const functions = source.slice(0, source.indexOf('if (!WIDGET_OPTIONS.managerValue) {'))
  + source.slice(source.indexOf('async function loadFixtures() {'));

function load(files, parameter = '', responses = {}, family = 'medium') {
  const context = vm.createContext({
    args: { widgetParameter: parameter },
    config: { widgetFamily: family },
    Color: class {},
    console: { warn() {} },
    FileManager: { local: () => ({
      documentsDirectory: () => '/cache',
      joinPath: (directory, name) => `${directory}/${name}`,
      fileExists: (path) => files.has(path),
      readString: (path) => files.get(path),
      writeString: (path, value) => files.set(path, value),
    }) },
    Request: class {
      constructor(url) { this.url = url.split('?')[0]; }
      async loadJSON() {
        if (!(this.url in responses)) throw new Error('No service');
        return responses[this.url];
      }
    },
  });
  vm.runInContext(functions, context);
  return vm.runInContext('loadFixtures()', context);
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
