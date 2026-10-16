import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(
  (match) => match[1],
);
const navigationScript = scripts.find((script) =>
  script.includes("boxThisLapLastPage:"),
);
const shellScript = scripts.find((script) =>
  script.includes("let isShellReady"),
);

function launch({
  standalone = true,
  hash = "",
  pathname = "/",
  blocked = false,
  saved = "#rankings?type=games",
} = {}) {
  const values = new Map([["boxThisLapLastPage:/", saved]]);
  const listeners = new Map();
  const addEventListener = (name, callback) => {
    listeners.set(name, [...(listeners.get(name) || []), callback]);
  };
  const location = {
    pathname,
    search: "",
    hash,
    href: `https://example.com${pathname}${hash}`,
    replace() {
      throw new Error("Unexpected automatic reload");
    },
  };
  const context = {
    window: {
      location,
      matchMedia: () => ({ matches: standalone }),
      history: {
        replaceState(_state, _title, url) {
          location.hash = new URL(url, location.href).hash;
        },
      },
      addEventListener,
    },
    navigator: {},
    document: { addEventListener, visibilityState: "hidden" },
    localStorage: {
      getItem(key) {
        if (blocked) throw new Error("Blocked");
        return values.get(key);
      },
      setItem(key, value) {
        if (blocked) throw new Error("Blocked");
        values.set(key, value);
      },
      removeItem(key) {
        if (blocked) throw new Error("Blocked");
        values.delete(key);
      },
    },
    URL,
    Date,
  };
  runInNewContext(navigationScript, context);
  return {
    context,
    values,
    fire(name, event = {}) {
      for (const callback of listeners.get(name) || []) callback(event);
    },
  };
}

test("installed app restores the full last route on a fresh launch", () => {
  const { context } = launch();
  assert.equal(context.window.location.hash, "#rankings?type=games");
});
test("explicit links and ordinary browser visits keep their own destination", () => {
  assert.equal(launch({ hash: "#next" }).context.window.location.hash, "#next");
  assert.equal(launch({ standalone: false }).context.window.location.hash, "");
});
test("development and production installations have separate saved pages", () => {
  assert.equal(launch({ pathname: "/dev/" }).context.window.location.hash, "");
});
test("backgrounding saves routes changed with history.pushState", () => {
  const app = launch();
  app.context.window.location.hash = "#footy-team-123?match=456";
  app.fire("visibilitychange");
  assert.equal(
    app.values.get("boxThisLapLastPage:/"),
    "#footy-team-123?match=456",
  );
});
test("unavailable storage does not prevent launch or navigation", () => {
  const app = launch({ blocked: true });
  app.context.window.location.hash = "#next";
  assert.doesNotThrow(() => app.fire("hashchange"));
  assert.doesNotThrow(() => app.fire("pagehide"));
});
test("returning from a long background period does not reload content", () => {
  const app = launch();
  runInNewContext(shellScript, app.context);
  let now = 1;
  app.context.Date = { now: () => now };
  app.fire("pagehide");
  now += 24 * 60 * 60 * 1000;
  app.context.document.visibilityState = "visible";
  app.fire("visibilitychange");
  app.fire("pageshow", { persisted: true });
});
