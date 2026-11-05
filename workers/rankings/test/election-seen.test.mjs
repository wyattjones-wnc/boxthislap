import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import {
  handleElectionSeenRequest,
  normalizeElectionBaseline,
} from "../src/election-seen.js";

const body = (expectedRevision = 0, sourceUpdated = 1000) => ({
  expectedRevision,
  sourceUpdated,
  markedAt: "fake",
  total: 999999,
  candidates: [
    { id: "a", first: "A", last: "One", votes: 100 },
    { id: "b", first: "B", last: "Two", votes: 80 },
    { id: "other", first: "", last: "Other", votes: 200 },
  ],
});
function setup() {
  const db = new DatabaseSync(":memory:");
  db.exec(
    readFileSync(
      new URL("../migrations/0019_election_seen.sql", import.meta.url),
      "utf8",
    ),
  );
  const env = {
    DB: {
      prepare(sql) {
        return {
          bind(...args) {
            return {
              async all() {
                return { results: db.prepare(sql).all(...args) };
              },
              async run() {
                return {
                  meta: { changes: db.prepare(sql).run(...args).changes },
                };
              },
            };
          },
        };
      },
    },
  };
  const call = (
    method,
    value,
    id = "6",
    path = method === "GET"
      ? "/api/elections/2026/seen"
      : "/api/elections/2026/seen/AK/3079",
  ) =>
    handleElectionSeenRequest({
      env,
      request: new Request(`https://test${path}`, { method }),
      url: new URL(`https://test${path}`),
      readBody: async () => value,
      requireManager: async () => {
        if (!id) throw Object.assign(new Error("Sign in"), { status: 401 });
        return { sub: id };
      },
      readManagerCatalog: async () => [
        { id: "6", displayName: "Wyatt" },
        { id: "8", displayName: "Other" },
      ],
    });
  return { call, db };
}
test("admin saves one public baseline with a server timestamp and derived totals", async () => {
  const { call, db } = setup();
  try {
    assert.deepEqual(await call("GET", null, null), { baselines: {} });
    const { baseline } = await call("PUT", body());
    assert.equal(baseline.total, 380);
    assert.equal(baseline.gap, 20); // aggregate Other is not a contender
    assert.equal(baseline.revision, 1);
    assert.ok(Number.isFinite(Date.parse(baseline.markedAt)));
    assert.notEqual(baseline.markedAt, "fake");
    const publicRead = await call("GET", null, null);
    assert.deepEqual(publicRead.baselines["AK:3079"], baseline);
  } finally {
    db.close();
  }
});
test("writes require signed admin identity, regardless of submitted admin flags", async () => {
  const { call, db } = setup();
  try {
    await assert.rejects(call("PUT", body(), null), { status: 401 });
    await assert.rejects(
      call("PUT", { ...body(), isAdmin: true, managerId: "6" }, "8"),
      { status: 403 },
    );
    assert.deepEqual(await call("GET", null, null), { baselines: {} });
  } finally {
    db.close();
  }
});
test("conditional SQL rejects competing tabs and older snapshots without replacing the baseline", async () => {
  const { call, db } = setup();
  try {
    await call("PUT", body(0, 2000));
    await assert.rejects(call("PUT", body(0, 3000)), { status: 409 });
    await assert.rejects(call("PUT", body(1, 1000)), { status: 409 });
    const saved = await call("PUT", body(1, 3000));
    assert.equal(saved.baseline.revision, 2);
    await assert.rejects(call("PUT", body(1, 4000)), { status: 409 });
    assert.equal(
      (await call("GET", null, null)).baselines["AK:3079"].sourceUpdated,
      3000,
    );
    await assert.rejects(
      call("PUT", body(3, 4000), "6", "/api/elections/2026/seen/MS/42"),
      { status: 409 },
    );
  } finally {
    db.close();
  }
});
test("validation rejects invalid counts, duplicate identities and unbounded payloads", () => {
  for (const value of [
    null,
    { ...body(), expectedRevision: -1 },
    { ...body(), sourceUpdated: Date.now() + 600000 },
    { ...body(), candidates: [{ id: "a", first: "A", last: "B", votes: -1 }] },
    { ...body(), candidates: [body().candidates[0], body().candidates[0]] },
    { ...body(), candidates: [] },
  ]) {
    assert.throws(() => normalizeElectionBaseline(value), { status: 400 });
  }
});
