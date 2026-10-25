import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(
  new URL("./connectivity.js", import.meta.url),
  "utf8",
).replaceAll("export ", "");
function monitor() {
  const window = new EventTarget();
  const document = new EventTarget();
  document.baseURI = "https://example.com/dev/";
  document.visibilityState = "visible";
  const timers = new Map();
  let interval;
  let behavior = async () => ({
    ok: true,
    json: async () => ({ name: "Box This Lap" }),
  });
  const requests = [];
  const navigator = { onLine: true };
  const context = vm.createContext({
    window,
    document,
    navigator,
    Event,
    URL,
    Date,
    DOMException,
    AbortController,
    setTimeout: (callback) => {
      const id = {};
      timers.set(id, callback);
      return id;
    },
    clearTimeout: (id) => timers.delete(id),
    setInterval: (callback) => {
      interval = callback;
    },
    fetch: (...args) => {
      requests.push(args);
      return behavior(...args);
    },
  });
  vm.runInContext(source, context);
  return {
    window,
    navigator,
    requests,
    run: (code) => vm.runInContext(code, context),
    fetchWith: (callback) => {
      behavior = callback;
    },
    tick: () => {
      for (const callback of [...timers.values()]) callback();
    },
    retry: () => interval(),
  };
}
const settle = async () => {
  for (let i = 0; i < 12; i++) await Promise.resolve();
};

test("a stalled reachability check enters offline mode and a fresh check restores it", async () => {
  const app = monitor();
  let changes = 0;
  app.window.addEventListener("boxthislap:connectivity", () => changes++);
  app.fetchWith(() => new Promise(() => {}));
  app.run("initializeConnectivity()");
  app.tick();
  await settle();
  assert.equal(app.navigator.onLine, true);
  assert.equal(app.run("isAppOnline()"), false);
  assert.equal(app.requests[0][1].signal.aborted, true);
  app.fetchWith(async () => ({
    ok: true,
    json: async () => ({ name: "Box This Lap" }),
  }));
  await app.retry();
  assert.equal(app.run("isAppOnline()"), true);
  assert.equal(changes, 2);
  assert.equal(app.requests[1][1].cache, "no-store");
  assert.equal(app.requests[1][0].pathname, "/dev/manifest.webmanifest");
});

test("HTTP errors do not falsely declare an outage or recovery", async () => {
  const app = monitor();
  app.fetchWith(async () => ({ ok: false }));
  app.run("initializeConnectivity()");
  await settle();
  assert.equal(app.run("isAppOnline()"), true);
  app.run("reportConnectivity(false)");
  await app.retry();
  assert.equal(app.run("isAppOnline()"), false);
});
