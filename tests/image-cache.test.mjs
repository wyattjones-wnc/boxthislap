import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
/** @typedef {{ request: Request, respondWith(value: Promise<Response>): void, waitUntil(value: Promise<unknown>): void }} TestFetchEvent */
async function fixture() {
  const entries = /** @type {Map<string, Response>} */ (new Map());
  const listeners =
    /** @type {Record<string, (event: TestFetchEvent) => void>} */ ({});
  const fetches = /** @type {Request[]} */ ([]);
  /** @param {string | Request} value */
  const url = (value) => (typeof value === "string" ? value : value.url);
  const cache = {
    /** @param {string | Request} key */
    match: async (key) => entries.get(url(key))?.clone(),
    /** @param {string | Request} key @param {Response} value */
    put: async (key, value) => entries.set(url(key), value.clone()),
    /** @param {string | Request} key */
    delete: async (key) => entries.delete(url(key)),
    keys: async () => [...entries.keys()].map((k) => new Request(k)),
  };
  const context = {
    self: {
      location: { origin: "https://site.test" },
      registration: { scope: "https://site.test/" },
      /** @param {string} name @param {(event: TestFetchEvent) => void} callback */
      addEventListener: (name, callback) => {
        listeners[name] = callback;
      },
    },
    Request,
    Response,
    Headers,
    URL,
    Set,
    Map,
    Date,
    Promise,
    setTimeout,
    caches: { open: async () => cache, delete: async () => entries.clear() },
    /** @param {Request} request */
    fetch: async (request) => {
      fetches.push(request);
      return new Response("good", { headers: { "Content-Type": "image/png" } });
    },
    /** @param {Blob} blob */
    createImageBitmap: async (blob) => {
      if ((await blob.text()) === "corrupt") throw new Error("Decode failed");
      return { close() {} };
    },
  };
  vm.runInNewContext(
    await readFile(new URL("../service-worker.js", import.meta.url), "utf8"),
    context,
  );
  /** @param {string} source */
  async function load(source) {
    let response = /** @type {Promise<Response> | undefined} */ (undefined);
    const pending = /** @type {Promise<unknown>[]} */ ([]);
    listeners.fetch({
      request: new Request(source),
      respondWith: (value) => {
        response = value;
      },
      waitUntil: (value) => pending.push(value),
    });
    const result = response
      ? await response
      : new Response(null, { status: 418 });
    await Promise.all(pending);
    return result;
  }
  return { load, entries, fetches, context };
}
test("approved cloud images are fetched once and subsequent interactions remain local", async () => {
  const f = await fixture(),
    source =
      "https://box-this-lap-image-library.boxthislap.workers.dev/media/library/abc.webp";
  assert.equal(await (await f.load(source)).text(), "good");
  assert.equal(await (await f.load(source)).text(), "good");
  assert.equal(f.fetches.length, 1);
  assert.equal(f.fetches[0].mode, "cors");
});
test("corrupted cached images refetch the origin and replace their local copies", async () => {
  const f = await fixture(),
    source = "https://site.test/image.png";
  f.entries.set(
    source,
    new Response("corrupt", { headers: { "Content-Type": "image/png" } }),
  );
  assert.equal(await (await f.load(source)).text(), "good");
  assert.equal(f.fetches.length, 1);
  assert.equal(await (await f.load(source)).text(), "good");
  assert.equal(f.fetches.length, 1);
});
test("a usage cutoff is not cached and does not create a retry loop", async () => {
  const f = await fixture();
  let requests = 0;
  f.context.fetch = async () => {
    requests++;
    return new Response("stopped", { status: 429 });
  };
  assert.equal(
    (
      await f.load(
        "https://box-this-lap-footy-notes.boxthislap.workers.dev/media/rosters/a.webp",
      )
    ).status,
    429,
  );
  assert.equal(requests, 1);
  assert.equal(f.entries.size, 0);
});
test("cache storage failure still allows the image to display", async () => {
  const f = await fixture();
  f.context.caches.open = async () => {
    throw new Error("Storage unavailable");
  };
  assert.equal(
    await (await f.load("https://site.test/image.png")).text(),
    "good",
  );
});
test("unapproved cross-origin sources are left to the browser", async () => {
  const f = await fixture();
  assert.equal((await f.load("https://unapproved.test/image.png")).status, 418);
  assert.equal(f.fetches.length, 0);
});
test("missing cache metadata is rebuilt before enforcing the size ceiling", async () => {
  const f = await fixture();
  f.entries.set(
    "https://site.test/existing.png",
    new Response("good", { headers: { "Content-Type": "image/png" } }),
  );
  await f.load("https://site.test/another.png");
  const metadata = await f.entries
    .get("https://site.test/__image_cache_metadata")
    ?.json();
  assert.equal(metadata["https://site.test/existing.png"].bytes, 4);
  assert.equal(metadata["https://site.test/another.png"].bytes, 4);
});

test("online schedules replace installed copies and never hide server or network failures", async () => {
  const f = await fixture();
  const url = "https://site.test/data/footy-schedule.json";
  f.entries.set(url, new Response("outdated schedule"));
  assert.equal(await (await f.load(url)).text(), "good");
  assert.equal(await f.entries.get(url)?.clone().text(), "good");
  f.context.fetch = async () =>
    new Response("server unavailable", { status: 503 });
  assert.equal((await f.load(url)).status, 503);
  f.context.fetch = async () => {
    throw new Error("Network unavailable");
  };
  await assert.rejects(f.load(url), /Network unavailable/);
});
test("installed build files check the network first and reserve copies for outages", async () => {
  const f = await fixture();
  const url = "https://site.test/build/app.js";
  f.entries.set(url, new Response("old build"));
  assert.equal(await (await f.load(url)).text(), "good");
  f.context.fetch = async () =>
    new Response("server unavailable", { status: 503 });
  assert.equal((await f.load(url)).status, 503);
  f.context.fetch = async () => {
    throw new Error("Network unavailable");
  };
  assert.equal(await (await f.load(url)).text(), "good");
});
