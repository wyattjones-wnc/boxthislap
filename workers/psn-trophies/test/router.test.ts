import assert from "node:assert/strict";
import test from "node:test";
import { routePublicApi } from "../src/api/router.ts";

test("rejects query values outside the explicit sort allowlist before querying D1", async () => {
  let queried = false;
  const env = {
    DB: {
      batch: async () => [],
      prepare: () => {
        queried = true;
        throw new Error("D1 should not be queried for invalid input.");
      },
    },
  } as any;

  await assert.rejects(
    () => routePublicApi(new Request("https://example.com/api/psn/games/NPWR12345_00/trophies?sort=title_name%20DESC"), env),
    (error: any) => error.status === 400 && error.message === "sort must be date, id, or rarity.",
  );
  assert.equal(queried, false);
});

test("returns a bounded trophy DTO with caching metadata", async () => {
  const queries: Array<{ sql: string; bindings: unknown[] }> = [];
  const env = {
    DB: {
      batch: async () => [],
      prepare: (sql: string) => {
        const entry = { sql, bindings: [] as unknown[] };
        queries.push(entry);
        return {
          bind: (...bindings: unknown[]) => {
            entry.bindings = bindings;
            return {
              first: async () => ({
                id: "NPWR12345_00",
                title_name: "Proof Game",
                platforms: '["PS5"]',
                progress: 100,
                has_platinum: 1,
                platinum_earned: 1,
                platinum_earned_at: "2026-08-20T01:00:00.000Z",
                is_100_percent: 1,
                last_synced_at: "2026-08-29T08:00:00.000Z",
              }),
              all: async () => ({
                results: [{
                  trophy_id: 2,
                  trophy_group_id: "default",
                  trophy_name: "Done",
                  trophy_description: null,
                  trophy_type: "platinum",
                  icon_url: "https://example.com/trophy.png",
                  earned: 1,
                  earned_at: "2026-08-20T01:00:00.000Z",
                  rarity_class: 1,
                  earned_rate: 8.4,
                  progress: null,
                }],
              }),
            };
          },
        };
      },
    },
  } as any;

  const response = await routePublicApi(
    new Request("https://example.com/api/psn/games/NPWR12345_00/trophies?earned=true&group=default&sort=rarity&order=asc"),
    env,
  );
  assert.ok(response);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("etag") || "", /^"[a-f0-9]{64}"$/);
  assert.equal(response.headers.get("cache-control"), "public, max-age=300, s-maxage=300");
  const body = await response.json() as any;
  assert.deepEqual(body.game.platforms, ["PS5"]);
  assert.equal(body.items[0].type, "platinum");
  assert.deepEqual(queries[1].bindings, ["NPWR12345_00", 1, "default"]);
  assert.match(queries[1].sql, /ORDER BY earned_rate ASC, trophy_id ASC/);
});

test("returns null for routes outside the PSN public API", async () => {
  const response = await routePublicApi(new Request("https://example.com/other"), {} as any);
  assert.equal(response, null);
});

test("returns aggregate trophy statistics without exposing database rows", async () => {
  const rows = [
    { games: 1, platinums: 1, hundred_percent: 1, updated_at: "2026-08-29T05:28:15.835Z" },
    { total_trophies: 48, earned_trophies: 48, bronze: 34, silver: 10, gold: 3, platinum: 1 },
    { game_id: "NPWR07722_00", title_name: "Grim Fandango Remastered", trophy_id: 12, trophy_name: "Rarest", trophy_type: "silver", icon_url: null, earned_at: "2020-01-01T00:00:00Z", rarity_class: 1, earned_rate: 4.2 },
    { game_id: "NPWR07722_00", title_name: "Grim Fandango Remastered", trophy_id: 48, trophy_name: "Latest", trophy_type: "platinum", icon_url: null, earned_at: "2020-02-01T00:00:00Z", rarity_class: 2, earned_rate: 12.5 },
    [
      { game_id: "B", title_name: "Bronze Game", trophy_id: 1, trophy_name: "Bronze Rarest", trophy_type: "bronze", icon_url: null, earned_at: "2020-01-01T00:00:00Z", rarity_class: 0, earned_rate: 0.1 },
      { game_id: "S", title_name: "Silver Game", trophy_id: 2, trophy_name: "Silver Rarest", trophy_type: "silver", icon_url: null, earned_at: "2020-01-02T00:00:00Z", rarity_class: 0, earned_rate: 0.2 },
      { game_id: "G", title_name: "Gold Game", trophy_id: 3, trophy_name: "Gold Rarest", trophy_type: "gold", icon_url: null, earned_at: "2020-01-03T00:00:00Z", rarity_class: 0, earned_rate: 0.3 },
      { game_id: "P", title_name: "Platinum Game", trophy_id: 4, trophy_name: "Platinum Rarest", trophy_type: "platinum", icon_url: null, earned_at: "2020-01-04T00:00:00Z", rarity_class: 0, earned_rate: 0.4 },
    ],
  ];
  let queryIndex = 0;
  const env = {
    DB: {
      batch: async () => [],
      prepare: () => {
        const index = queryIndex++;
        return {
          first: async () => rows[index],
          all: async () => ({ results: rows[index] }),
        };
      },
    },
  } as any;

  const response = await routePublicApi(new Request("https://example.com/api/psn/stats"), env);
  assert.ok(response);
  const body = await response.json() as any;
  assert.deepEqual(body.counts, {
    earnedTrophies: 48,
    games: 1,
    hundredPercent: 1,
    platinums: 1,
    totalTrophies: 48,
  });
  assert.deepEqual(body.earnedByType, { bronze: 34, silver: 10, gold: 3, platinum: 1 });
  assert.equal(body.rarestEarned.name, "Rarest");
  assert.equal(body.latestEarned.name, "Latest");
  assert.equal(body.rarestByType.bronze.name, "Bronze Rarest");
  assert.equal(body.rarestByType.silver.name, "Silver Rarest");
  assert.equal(body.rarestByType.gold.name, "Gold Rarest");
  assert.equal(body.rarestByType.platinum.name, "Platinum Rarest");
});
