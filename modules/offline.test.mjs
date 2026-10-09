import { test } from "node:test";
import assert from "node:assert/strict";
import { loadOfflineSnapshot } from "./offline.js";
const values = new Map();
Object.defineProperty(globalThis, "navigator", {
  value: { onLine: true },
  configurable: true,
});
globalThis.localStorage = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, value),
};
globalThis.window = { dispatchEvent() {} };
test("successful loads persist, offline reloads avoid network, and failures retain timestamps", async () => {
  const data = { items: [{ id: "1" }] };
  assert.deepEqual(await loadOfflineSnapshot("next", async () => data), data);
  const snapshot = values.get("boxthislap-offline-v1:next");
  navigator.onLine = false;
  assert.deepEqual(
    await loadOfflineSnapshot("next", () => assert.fail("network called")),
    data,
  );
  navigator.onLine = true;
  assert.deepEqual(
    await loadOfflineSnapshot("next", async () => {
      throw new Error("network down");
    }),
    data,
  );
  assert.equal(values.get("boxthislap-offline-v1:next"), snapshot);
});
test("missing and corrupt snapshots have a useful offline error", async () => {
  navigator.onLine = false;
  values.set("boxthislap-offline-v1:broken", "bad json");
  await assert.rejects(
    loadOfflineSnapshot("broken", () => {}),
    /Open this page online first/,
  );
  await assert.rejects(
    loadOfflineSnapshot("missing", () => {}),
    /No saved data/,
  );
});
test("manager caches are separate and rejected access never falls back", async () => {
  navigator.onLine = true;
  await loadOfflineSnapshot("rankings:a:games", async () => ({ items: ["a"] }));
  await assert.rejects(
    loadOfflineSnapshot("rankings:a:games", async () => {
      throw Object.assign(new Error("Forbidden"), { status: 403 });
    }),
    /Forbidden/,
  );
  navigator.onLine = false;
  await assert.rejects(
    loadOfflineSnapshot("rankings:b:games", () => {}),
    /No saved data/,
  );
});

test("cache storage restores a load when local storage cannot save it", async () => {
  const entries = new Map();
  const storage = globalThis.localStorage;
  globalThis.document = { baseURI: "https://site.test/dev/" };
  globalThis.caches = {
    open: async () => ({
      match: async (key) => entries.get(String(key))?.clone(),
      put: async (key, response) => entries.set(String(key), response.clone()),
    }),
    match: async (key) => entries.get(String(key))?.clone(),
  };
  globalThis.localStorage = {
    getItem: () => null,
    setItem: () => {
      throw new Error("Storage full");
    },
  };
  try {
    navigator.onLine = true;
    const data = { items: [{ id: "cache-only" }] };
    await loadOfflineSnapshot("next", async () => data);
    navigator.onLine = false;
    assert.deepEqual(
      await loadOfflineSnapshot("next", () => assert.fail("network called")),
      data,
    );
    assert.ok(entries.has("https://site.test/dev/__offline-data__/next"));
    globalThis.document.baseURI = "https://site.test/";
    await assert.rejects(
      loadOfflineSnapshot("next", () => {}),
      /No saved data/,
    );
  } finally {
    globalThis.localStorage = storage;
    delete globalThis.document;
    delete globalThis.caches;
  }
});

test("Footy uses the installed schedule even without a browser snapshot", async () => {
  const schedule = { generatedAt: "2026-10-09T00:00:00Z", teams: [] };
  globalThis.document = { baseURI: "https://site.test/dev/" };
  globalThis.caches = {
    open: async () => ({ match: async () => undefined }),
    match: async (url) => {
      assert.equal(url, "https://site.test/dev/data/footy-schedule.json");
      return new Response(JSON.stringify(schedule), {
        headers: { "X-BoxThisLap-Saved-At": "1791504000000" },
      });
    },
  };
  navigator.onLine = false;
  try {
    assert.deepEqual(
      await loadOfflineSnapshot("footy", () => assert.fail("network called")),
      schedule,
    );
  } finally {
    delete globalThis.document;
    delete globalThis.caches;
  }
});
