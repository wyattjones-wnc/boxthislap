import assert from "node:assert/strict";
import test from "node:test";
import worker, {
  listProducts,
  markSeenThrough,
  saveState,
} from "../src/index.js";

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

test("product listing reads one bounded page without full-feed counts", async () => {
  const bindings = [];
  const rows = Array.from({ length: 49 }, (_, index) => ({
    availability: "unknown",
    canonical_url: `https://example.com/${index}`,
    category: "other",
    currency: "USD",
    first_observed_at: "2026-09-26T00:00:00Z",
    id: `barcelona:${String(index).padStart(2, "0")}`,
    image_url: null,
    in_scope: 1,
    new_since: null,
    price_minor: 100,
    regular_price_minor: null,
    seen_at: null,
    source: "barcelona",
    team: "barcelona",
    title: `Product ${index}`,
    wishlisted_at: null,
  }));
  const env = {
    DB: {
      prepare(sql) {
        if (sql.includes("FROM merch_products"))
          assert.doesNotMatch(sql, /COUNT\s*\(|SUM\s*\(/i);
        return {
          bind(...values) {
            bindings.push(values);
            return {
              all: async () => ({
                results: sql.includes("FROM merch_products") ? rows : [],
              }),
            };
          },
          all: async () => ({ results: [] }),
        };
      },
    },
  };
  const result = await listProducts(
    env,
    "6",
    new URLSearchParams("view=unseen&page=1&limit=48"),
  );
  assert.equal(result.items.length, 48);
  assert.equal(result.pagination.hasMore, true);
  assert.ok(bindings[0].includes(49));
});
test("sale listing is paginated and remains independent of seen state", async () => {
  let productQuery = "";
  const env = {
    DB: {
      prepare(sql) {
        if (sql.includes("FROM merch_products")) productQuery = sql;
        return {
          bind: () => ({ all: async () => ({ results: [] }) }),
          all: async () => ({ results: [] }),
        };
      },
    },
  };
  await listProducts(env, "6", new URLSearchParams("view=sale&limit=24"));
  assert.match(productQuery, /regular_price_minor > p\.price_minor/);
  assert.doesNotMatch(productQuery, /seen_at IS NULL/);
  assert.match(productQuery, /LIMIT \? OFFSET \?/);
});

test("seen listing is paginated and includes explicitly seen products", async () => {
  let productQuery = "";
  const env = {
    DB: {
      prepare(sql) {
        if (sql.includes("FROM merch_products")) productQuery = sql;
        return {
          bind: () => ({ all: async () => ({ results: [] }) }),
          all: async () => ({ results: [] }),
        };
      },
    },
  };
  await listProducts(env, "6", new URLSearchParams("view=seen&limit=24"));
  assert.match(productQuery, /s\.seen_at IS NOT NULL/);
  assert.doesNotMatch(productQuery, /p\.in_scope = 1/);
  assert.match(productQuery, /LIMIT \? OFFSET \?/);
});

test("individual state updates cannot mark products seen", async () => {
  await assert.rejects(
    saveState({}, "6", "barcelona:1", { seen: true }),
    (error) => error.status === 400 && /Seen through here/.test(error.message),
  );
});
