import assert from "node:assert/strict";
import test from "node:test";
import worker, { markSeenThrough } from "../src/index.js";

test("all merchandise endpoints require admin authentication", async () => {
  const response = await worker.fetch(
    new Request("https://example.com/api/products"),
    { ADMIN_MANAGER_IDS: "6" },
  );
  assert.equal(response.status, 401);
});

test("seen-through updates the anchor and all preceding filtered unseen products", async () => {
  const bindings = [];
  const env = {
    DB: {
      prepare(sql) {
        return {
          bind(...values) {
            bindings.push({ sql, values });
            if (sql.includes("SELECT p.id, p.first_observed_at"))
              return {
                first: async () => ({
                  id: "barcelona:2",
                  first_observed_at: "2026-09-25T00:00:00Z",
                }),
              };
            if (sql.includes("INSERT INTO merch_manager_state"))
              return { run: async () => ({ meta: { changes: 2 } }) };
            return {};
          },
        };
      },
    },
  };
  const result = await markSeenThrough(env, "6", "barcelona:2", {
    category: "kits",
    sort: "newest",
    team: "barcelona",
  });
  assert.equal(result.seen, 2);
  assert.ok(
    bindings.some(
      (entry) =>
        entry.values.includes("kits") && entry.values.includes("barcelona"),
    ),
  );
});

test("seen-through rejects an anchor no longer in the filtered unseen feed", async () => {
  const env = {
    DB: { prepare: () => ({ bind: () => ({ first: async () => null }) }) },
  };
  await assert.rejects(
    markSeenThrough(env, "6", "barcelona:missing", { sort: "newest" }),
    (error) => error.status === 409,
  );
});
