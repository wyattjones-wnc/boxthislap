import assert from "node:assert/strict";
import test from "node:test";

import { refreshSubscriptions, settleWithConcurrency } from "../src/index.js";

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

test("channel checks refill available slots while preserving the concurrency cap and result order", async () => {
  const gates = Array.from({ length: 8 }, deferred);
  const started = [];
  let active = 0;
  let peak = 0;
  const failure = new Error("Channel unavailable");
  const running = settleWithConcurrency(gates, 5, async (gate) => {
    const index = gates.indexOf(gate);
    started.push(index);
    peak = Math.max(peak, ++active);
    try {
      return await gate.promise;
    } finally {
      active -= 1;
    }
  });
  assert.deepEqual(started, [0, 1, 2, 3, 4]);

  gates[1].resolve("one");
  await new Promise(setImmediate);
  assert.deepEqual(started, [0, 1, 2, 3, 4, 5]);
  assert.equal(active, 5);

  gates[2].reject(failure);
  await new Promise(setImmediate);
  assert.deepEqual(started, [0, 1, 2, 3, 4, 5, 6]);
  gates[6].resolve("six");
  await new Promise(setImmediate);
  assert.equal(started.at(-1), 7);

  gates.forEach((gate, index) => gate.resolve(index));
  const results = await running;
  assert.equal(peak, 5);
  assert.equal(active, 0);
  assert.deepEqual(
    results.map((result) => result.status),
    [
      "fulfilled",
      "fulfilled",
      "rejected",
      "fulfilled",
      "fulfilled",
      "fulfilled",
      "fulfilled",
      "fulfilled",
    ],
  );
  assert.equal(results[2].reason, failure);
  assert.deepEqual(
    results
      .filter((result) => result.status === "fulfilled")
      .map((result) => result.value),
    [0, "one", 3, 4, 5, "six", 7],
  );
});

test("empty channel batches make no checks", async () => {
  assert.deepEqual(
    await settleWithConcurrency([], 5, () => assert.fail("Unexpected check")),
    [],
  );
});

test("subscription metadata is batched while preserving pagination, configured channels, removals and sorting", async (t) => {
  const ids = Array.from(
    { length: 60 },
    (_, index) => `UC${String(index).padStart(2, "0")}`,
  );
  const requestedIds = [];
  const batches = [];
  const env = {
    DB: {
      prepare(sql) {
        assert.match(sql, /ON CONFLICT\(youtube_channel_id\) DO UPDATE/);
        assert.match(sql, /WHERE channels.name IS NOT excluded.name/);
        return { bind: (...values) => ({ values }) };
      },
      async batch(statements) {
        batches.push(statements.map((statement) => statement.values));
      },
    },
  };
  t.mock.method(globalThis, "fetch", async (input) => {
    const url = new URL(input);
    let data;
    if (url.pathname.endsWith("/subscriptions")) {
      const secondPage = url.searchParams.get("pageToken") === "next";
      data = {
        items: (secondPage ? ids.slice(50) : ids.slice(0, 50)).map((id) => ({
          snippet: { resourceId: { channelId: id } },
        })),
        ...(secondPage ? {} : { nextPageToken: "next" }),
      };
    } else {
      assert.ok(url.pathname.endsWith("/channels"));
      const pageIds = url.searchParams.get("id").split(",");
      assert.ok(pageIds.length <= 50);
      requestedIds.push(...pageIds);
      data = {
        items: pageIds.toReversed().map((id) => ({
          id,
          snippet: { title: `Channel ${id}` },
          contentDetails: {
            relatedPlaylists: id === "UC59" ? {} : { uploads: `uploads-${id}` },
          },
        })),
      };
    }
    return Response.json(data);
  });

  const channels = await refreshSubscriptions(
    env,
    "token",
    new Set(["UC00", "configured"]),
    new Set(["UC01"]),
  );
  const expectedIds = [
    ...ids.filter((id) => !["UC01", "UC59"].includes(id)),
    "configured",
  ].sort((a, b) => a.localeCompare(b));
  assert.equal(requestedIds.length, 60);
  assert.equal(new Set(requestedIds).size, 60);
  assert.ok(!requestedIds.includes("UC01"));
  assert.deepEqual(
    batches.map((batch) => batch.length),
    [50, 9],
  );
  assert.deepEqual(
    channels.map((channel) => channel.youtubeChannelId),
    expectedIds,
  );
  assert.deepEqual(
    batches
      .flat()
      .map(([id]) => id)
      .sort((a, b) => a.localeCompare(b)),
    expectedIds,
  );
});

test("empty subscriptions do not submit an empty D1 batch", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json({ items: [] }));
  const channels = await refreshSubscriptions(
    { DB: { batch: () => assert.fail("Unexpected write") } },
    "token",
  );
  assert.deepEqual(channels, []);
});
