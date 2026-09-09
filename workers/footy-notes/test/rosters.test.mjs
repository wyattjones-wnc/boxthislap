import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { Miniflare } from "miniflare";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const workerPath = fileURLToPath(new URL("../src/index.js", import.meta.url));
const schemaPath = fileURLToPath(new URL("../migrations/0006_rosters.sql", import.meta.url));

test("roster sync merges provider data, preserves overrides, and flags departures", async (context) => {
  const worker = new Miniflare({
    bindings: { ALLOWED_ORIGINS: "http://localhost:8000", ROSTER_SYNC_TOKEN: "test-token" },
    compatibilityDate: "2026-08-08",
    d1Databases: { DB: "footy-rosters-test" },
    modules: true,
    rootPath: root,
    scriptPath: workerPath,
  });
  context.after(() => worker.dispose());
  const db = await worker.getD1Database("DB");
  await executeSql(db, await readFile(schemaPath, "utf8"));

  await sync(worker, [{
    teamId: "1",
    season: "2026-27",
    players: [
      { playerKey: "provider:10", provider: "provider", providerPlayerId: "10", providerData: { name: "First Player", number: "9" }, seedOverrides: { number: "10", cardImage: "assets/custom.webp" } },
      { playerKey: "provider:11", provider: "provider", providerPlayerId: "11", providerData: { name: "Second Player", number: "11" } },
      { playerKey: "legacy:12", provider: "legacy-sheet", providerPlayerId: "12", providerData: { name: "Manual Player" }, manual: true },
    ],
  }]);
  let roster = (await getJson(worker, "/api/rosters?includeInactive=1")).rosters[0];
  assert.equal(roster.players.length, 3);
  assert.equal(roster.players.find((player) => player.providerPlayerId === "10").number, "10");
  assert.equal(roster.players.find((player) => player.providerPlayerId === "10").cardImage, "assets/custom.webp");

  await sync(worker, [{ teamId: "1", season: "2026-27", players: [
    { playerKey: "provider:10", provider: "provider", providerPlayerId: "10", providerData: { name: "First Player", number: "12" } },
  ] }]);
  roster = (await getJson(worker, "/api/rosters?includeInactive=1")).rosters[0];
  assert.equal(roster.players.find((player) => player.providerPlayerId === "10").number, "10");
  assert.equal(roster.players.find((player) => player.providerPlayerId === "11").reviewDeparture, true);
  assert.equal(roster.players.find((player) => player.providerPlayerId === "12").status, "active");
});

async function sync(worker, rosters) {
  const response = await worker.dispatchFetch("http://localhost:8787/api/rosters/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Roster-Sync-Token": "test-token" },
    body: JSON.stringify({ rosters }),
  });
  const value = await response.json();
  assert.equal(response.status, 200, JSON.stringify(value));
  assert.equal(value.ok, true, JSON.stringify(value));
}

async function getJson(worker, route) {
  const response = await worker.dispatchFetch(`http://localhost:8787${route}`);
  const value = await response.json();
  assert.equal(response.status, 200, JSON.stringify(value));
  return value;
}

async function executeSql(db, sql) {
  const statements = String(sql).replaceAll("\r", "").split(/;\s*(?:\n|$)/).map((value) => value.trim()).filter(Boolean);
  for (const statement of statements) await db.prepare(statement).run();
}
