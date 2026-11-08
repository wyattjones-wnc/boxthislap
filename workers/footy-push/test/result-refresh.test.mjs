import assert from "node:assert/strict";
import test from "node:test";
import { maybeRefreshMatchResults } from "../src/index.js";

test("existing timer dispatches results once daily without extra IO outside the window", async () => {
  const values = new Map();
  let reads = 0;
  let dispatches = 0;
  const env = {
    FOOTY_PUSH_KV: {
      async get(key) {
        reads++;
        return values.get(key);
      },
      async put(key, value, options) {
        assert.equal(options.expirationTtl, 172800);
        values.set(key, value);
      },
    },
    RESULT_REFRESH: {
      async dispatch() {
        dispatches++;
      },
    },
  };
  const tick = (time) => maybeRefreshMatchResults(env, Date.parse(time));
  assert.equal(await tick("2026-11-07T10:15:00Z"), false);
  assert.equal(reads, 0);
  assert.equal(await tick("2026-11-07T10:30:00Z"), true);
  assert.equal(await tick("2026-11-07T10:45:00Z"), false);
  assert.equal(dispatches, 1);
  assert.equal(await tick("2026-11-07T11:30:00Z"), false);
  assert.equal(reads, 2);
  assert.equal(await tick("2026-11-08T10:30:00Z"), true);
  assert.equal(dispatches, 2);
});

test("failed dispatch leaves the daily refresh eligible for the next tick", async () => {
  let written = false;
  const env = {
    FOOTY_PUSH_KV: {
      async get() {
        return null;
      },
      async put() {
        written = true;
      },
    },
    RESULT_REFRESH: {
      async dispatch() {
        throw new Error("temporary failure");
      },
    },
  };
  await assert.rejects(
    maybeRefreshMatchResults(env, Date.parse("2026-11-07T10:30:00Z")),
    /temporary/,
  );
  assert.equal(written, false);
});
