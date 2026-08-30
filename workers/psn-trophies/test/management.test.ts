import assert from "node:assert/strict";
import test from "node:test";
import { routeTrophyManagementApi } from "../src/api/management.ts";

function managerAuth() {
  return { fetch: async () => Response.json({ ok: true, managerId: "6" }) };
}

test("requires manager authorization before reading the personal trophy log", async () => {
  const env = { DB: { batch: async () => [], prepare: () => { throw new Error("should not query"); } } } as any;
  await assert.rejects(
    () => routeTrophyManagementApi(new Request("https://example.com/api/psn/trophy-log"), env),
    (error: any) => error.status === 401,
  );
});

test("returns an authenticated unsorted trophy page", async () => {
  let sql = "";
  let bindings: unknown[] = [];
  const env = {
    ADMIN_MANAGER_IDS: "6",
    MANAGER_AUTH: managerAuth(),
    DB: {
      batch: async () => [],
      prepare: (query: string) => {
        sql = query;
        return { bind: (...values: unknown[]) => ({
          all: async () => {
            bindings = values;
            return { results: [{ game_id: "NPWR1_00", trophy_id: 2, trophy_name: "Fresh", trophy_type: "platinum", title_name: "Game", earned_at: "2026-08-30T00:00:00Z", earned_rate: 5.5, rarity_class: 1, trophy_number: 11630, platinum_number: 161, completion_seconds: 172800 }] };
          },
        }) };
      },
    },
  } as any;
  const response = await routeTrophyManagementApi(new Request("https://example.com/api/psn/trophy-log", { headers: { Authorization: "Bearer token" } }), env);
  assert.ok(response);
  const body = await response.json() as any;
  assert.equal(body.items[0].name, "Fresh");
  assert.equal(body.items[0].trophyNumber, 11630);
  assert.equal(body.items[0].platinumNumber, 161);
  assert.equal(body.items[0].completionSeconds, 172800);
  assert.match(sql, /t\.state IS NULL/);
  assert.doesNotMatch(sql, /t\.trophy_type <> 'platinum'/);
  assert.deepEqual(bindings, [49, 0]);
});

test("stores a bounded seen-through batch", async () => {
  let batchSize = 0;
  const env = {
    ADMIN_MANAGER_IDS: "6",
    MANAGER_AUTH: managerAuth(),
    DB: {
      batch: async (statements: unknown[]) => { batchSize = statements.length; return []; },
      prepare: () => ({ bind: () => ({}) }),
    },
  } as any;
  const response = await routeTrophyManagementApi(new Request("https://example.com/api/psn/trophies/seen-through", {
    method: "PUT",
    headers: { Authorization: "Bearer token", "Content-Type": "application/json" },
    body: JSON.stringify({ items: [{ gameId: "NPWR1_00", trophyId: 2 }, { gameId: "NPWR2_00", trophyId: 3 }] }),
  }), env);
  assert.ok(response);
  assert.equal((await response.json() as any).seen, 2);
  assert.equal(batchSize, 2);
});

test("platinum duration sorting always uses the evergreen platinum view", async () => {
  let sql = "";
  const env = {
    ADMIN_MANAGER_IDS: "6",
    MANAGER_AUTH: managerAuth(),
    DB: {
      batch: async () => [],
      prepare: (query: string) => {
        sql = query;
        return { bind: () => ({ all: async () => ({ results: [] }) }) };
      },
    },
  } as any;
  const response = await routeTrophyManagementApi(new Request("https://example.com/api/psn/trophy-log?view=unsorted&sort=platinum-duration-desc", {
    headers: { Authorization: "Bearer token" },
  }), env);
  assert.ok(response);
  const body = await response.json() as any;
  assert.equal(body.view, "platinums");
  assert.match(sql, /t\.trophy_type = 'platinum'/);
  assert.doesNotMatch(sql, /t\.state IS NULL/);
});

test("stores a favorite preference for an earned platinum trophy", async () => {
  const queries: string[] = [];
  const env = {
    ADMIN_MANAGER_IDS: "6",
    MANAGER_AUTH: managerAuth(),
    DB: {
      batch: async () => [],
      prepare: (query: string) => {
        queries.push(query);
        return {
          bind: () => ({ first: async () => ({ earned: 1, trophy_type: "platinum" }), run: async () => ({ success: true }) }),
        };
      },
    },
  } as any;
  const response = await routeTrophyManagementApi(new Request("https://example.com/api/psn/trophies/NPWR1_00/2/preference", {
    method: "PUT",
    headers: { Authorization: "Bearer token", "Content-Type": "application/json" },
    body: JSON.stringify({ state: "favorite" }),
  }), env);
  assert.ok(response);
  assert.equal((await response.json() as any).preference.state, "favorite");
  assert.match(queries[1], /INSERT INTO trophy_preferences/);
});
