import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  loadLiveSenateResults,
  normalizeSenateResults,
} from "../src/election-results.js";
const snapshot = JSON.parse(
  readFileSync(
    new URL("../../../data/election-results.json", import.meta.url),
    "utf8",
  ),
);
const source = () => ({ results: structuredClone(snapshot.races) });
function fakeCache() {
  let now = 0;
  const entries = new Map();
  return {
    advance(ms) {
      now += ms;
    },
    entries,
    async match(key) {
      const entry = entries.get(key.url);
      return entry && entry.expires > now ? entry.response.clone() : undefined;
    },
    async put(key, response) {
      const seconds = Number(
        response.headers.get("Cache-Control").match(/max-age=(\d+)/)[1],
      );
      entries.set(key.url, {
        response: response.clone(),
        expires: now + seconds * 1000,
      });
    },
  };
}
test("results refresh after a fixed two-minute cache lifetime, not after a site build", async () => {
  const cache = fakeCache();
  let calls = 0;
  let data = source();
  const fetcher = async (url) => {
    assert.equal(
      url,
      "https://apps.npr.org/2026-election-results/data/senate.json",
    );
    calls++;
    return Response.json(data);
  };
  const url = new URL("https://test-cache/api/elections/2026/results");
  const first = await loadLiveSenateResults(url, { cache, fetcher });
  assert.equal(first.races.length, 2);
  assert.equal(calls, 1);
  assert.ok(Date.parse(first.fetchedAt));
  cache.advance(60000);
  data = source();
  data.results[0].candidates[0].votes += 25;
  assert.deepEqual(await loadLiveSenateResults(url, { cache, fetcher }), first);
  assert.equal(calls, 1);
  cache.advance(61000);
  const next = await loadLiveSenateResults(url, { cache, fetcher });
  assert.equal(calls, 2);
  assert.equal(
    next.races[0].candidates[0].votes,
    first.races[0].candidates[0].votes + 25,
  );
});
test("concurrent visitors share one in-flight upstream fetch", async () => {
  let release;
  let calls = 0;
  const pending = new Promise((resolve) => {
    release = resolve;
  });
  const cache = fakeCache();
  const fetcher = async () => {
    calls++;
    return pending;
  };
  const url = new URL("https://test-concurrent/api/elections/2026/results");
  const requests = Array.from({ length: 3 }, () =>
    loadLiveSenateResults(url, { cache, fetcher }),
  );
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls, 1);
  release(Response.json(source()));
  const results = await Promise.all(requests);
  assert.deepEqual(results[0], results[2]);
});
test("an upstream failure or invalid feed is not cached as fresh data", async () => {
  const cache = fakeCache();
  const url = new URL("https://test-failure/api/elections/2026/results");
  for (const fetcher of [
    async () => new Response("down", { status: 503 }),
    async () => new Response("not json"),
    async () => {
      throw new Error("timeout");
    },
    async () => Response.json({ results: [] }),
  ]) {
    await assert.rejects(loadLiveSenateResults(url, { cache, fetcher }), {
      status: 502,
    });
    assert.equal(cache.entries.size, 0);
  }
  assert.equal(
    (
      await loadLiveSenateResults(url, {
        cache,
        fetcher: async () => Response.json(source()),
      })
    ).races.length,
    2,
  );
});
test("only complete, live Alaska and Mississippi Senate results are accepted", () => {
  const data = source();
  data.results.push({ ...data.results[0], office: "H", state: "NY" });
  assert.equal(normalizeSenateResults(data).length, 2);
  for (const modify of [
    (data) => {
      data.results[0].test = true;
    },
    (data) => {
      data.results[0].candidates[0].votes = -1;
    },
    (data) => {
      data.results[0].candidates[0].percent = 2;
    },
    (data) => {
      data.results.push(structuredClone(data.results[0]));
    },
  ]) {
    const bad = source();
    modify(bad);
    assert.throws(() => normalizeSenateResults(bad), { status: 502 });
  }
});

test("opening checks bypass a warm cache and request upstream revalidation", async () => {
  const cache = fakeCache();
  const url = new URL("https://test-opening/api/elections/2026/results");
  let calls = 0;
  const fetcher = async (_url, options) => {
    calls++;
    if (calls === 2) {
      assert.equal(options.cache, "no-store");
      assert.equal(options.headers["Cache-Control"], "no-cache");
    }
    const data = source();
    data.results[0].candidates[0].votes += calls;
    return Response.json(data);
  };
  const first = await loadLiveSenateResults(url, { cache, fetcher });
  const fresh = await loadLiveSenateResults(new URL(`${url}?fresh=1`), {
    cache,
    fetcher,
  });
  assert.equal(calls, 2);
  assert.equal(
    fresh.races[0].candidates[0].votes,
    first.races[0].candidates[0].votes + 1,
  );
  assert.deepEqual(await loadLiveSenateResults(url, { cache, fetcher }), fresh);
  assert.equal(calls, 2);
});
