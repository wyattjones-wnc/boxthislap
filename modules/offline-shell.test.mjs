import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync(
  new URL("../service-worker.js", import.meta.url),
  "utf8",
);
test("installed app shell restores its cached navigation when a connection stalls", async () => {
  let fetchListener;
  let expire;
  const cached = new Response("saved app shell");
  vm.runInNewContext(source, {
    URL,
    Response,
    AbortController,
    setTimeout: (callback, delay) => {
      assert.equal(delay, 4000);
      expire = callback;
    },
    clearTimeout() {},
    self: {
      location: { origin: "https://example.test" },
      registration: { scope: "https://example.test/dev/" },
      addEventListener: (name, listener) => {
        if (name === "fetch") fetchListener = listener;
      },
    },
    caches: { open: async () => ({ match: async () => cached }) },
    fetch: (_request, { signal }) =>
      new Promise((_, reject) => {
        signal.addEventListener("abort", () =>
          reject(new DOMException("Aborted", "AbortError")),
        );
      }),
  });
  let response;
  fetchListener({
    request: {
      method: "GET",
      mode: "navigate",
      url: "https://example.test/dev/",
    },
    respondWith: (promise) => {
      response = promise;
    },
  });
  for (let i = 0; i < 10; i++) await Promise.resolve();
  expire();
  assert.equal(await (await response).text(), "saved app shell");
});
