import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { Miniflare } from "miniflare";
import { isRosterPlayerRole, selectSportDbPlayerMatch } from "../src/index.js";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const workerPath = fileURLToPath(new URL("../src/index.js", import.meta.url));
const schemaPath = fileURLToPath(new URL("../migrations/0006_rosters.sql", import.meta.url));
const providerSchemaPath = fileURLToPath(new URL("../migrations/0007_roster_providers.sql", import.meta.url));
const mediaUsageSchemaPath = fileURLToPath(new URL("../migrations/0008_roster_media_usage.sql", import.meta.url));

test("roster discovery excludes staff roles without rejecting players", () => {
  assert.equal(isRosterPlayerRole("CEO", "Coaching"), false);
  assert.equal(isRosterPlayerRole("Director of Football", "Active"), false);
  assert.equal(isRosterPlayerRole("Centre-Back", "Active"), true);
});

test("individual image enrichment prefers the matching team", () => {
  const match = selectSportDbPlayerMatch({ name: "Phil Foden", dateOfBirth: "2000-05-28" }, [
    { dateBorn: "2000-05-28", idPlayer: "other", idTeam: "other-team", strPlayer: "Phil Foden" },
    { dateBorn: "2000-05-28", idPlayer: "city", idTeam: "133613", strPlayer: "Phil Foden" },
  ], "133613");
  assert.equal(match.idPlayer, "city");
});

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
  await executeSql(db, await readFile(providerSchemaPath, "utf8"));
  await executeSql(db, await readFile(mediaUsageSchemaPath, "utf8"));

  const unauthorizedDiscovery = await worker.dispatchFetch("http://localhost:8787/api/rosters/discover", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ teamId: "team:example", teamName: "Example FC", season: "2026-27" }),
  });
  assert.equal(unauthorizedDiscovery.status, 401);

  await sync(worker, [{
    teamId: "1",
    season: "2026-27",
    provider: "TheSportsDB",
    providerTeamId: "133604",
    players: [
      { playerKey: "provider:10", provider: "provider", providerPlayerId: "10", providerData: { name: "First Player", number: "9" }, seedOverrides: { number: "10", cardImage: "assets/custom.webp", useDefaultCardImage: true, transferOutDate: "2026-07-01" } },
      { playerKey: "provider:11", provider: "provider", providerPlayerId: "11", providerData: { name: "Second Player", number: "11" } },
      { playerKey: "legacy:12", provider: "legacy-sheet", providerPlayerId: "12", providerData: { name: "Manual Player" }, manual: true },
    ],
  }]);
  let roster = (await getJson(worker, "/api/rosters?includeInactive=1")).rosters[0];
  assert.equal(roster.players.length, 3);
  assert.equal(roster.provider, "TheSportsDB");
  assert.equal(roster.providerTeamId, "133604");
  assert.equal(roster.players.find((player) => player.providerPlayerId === "10").number, "10");
  assert.equal(roster.players.find((player) => player.providerPlayerId === "10").cardImage, "assets/custom.webp");
  assert.equal(roster.players.find((player) => player.providerPlayerId === "10").useDefaultCardImage, true);
  assert.equal(roster.players.find((player) => player.providerPlayerId === "10").transferOutDate, "2026-07-01");

  const unchanged = await sync(worker, [{
    teamId: "1",
    season: "2026-27",
    provider: "TheSportsDB",
    providerTeamId: "133604",
    players: [
      { playerKey: "provider:10", provider: "provider", providerPlayerId: "10", providerData: { name: "First Player", number: "9" }, seedOverrides: { number: "10", cardImage: "assets/custom.webp", useDefaultCardImage: true, transferOutDate: "2026-07-01" } },
      { playerKey: "provider:11", provider: "provider", providerPlayerId: "11", providerData: { name: "Second Player", number: "11" } },
      { playerKey: "legacy:12", provider: "legacy-sheet", providerPlayerId: "12", providerData: { name: "Manual Player" }, manual: true },
    ],
  }]);
  assert.equal(unchanged.updated, 0);

  await sync(worker, [{ teamId: "1", season: "2026-27", players: [
    { playerKey: "provider:10", provider: "provider", providerPlayerId: "10", providerData: { name: "First Player", number: "12" } },
  ] }]);
  roster = (await getJson(worker, "/api/rosters?includeInactive=1")).rosters[0];
  assert.equal(roster.players.find((player) => player.providerPlayerId === "10").number, "10");
  assert.equal(roster.players.find((player) => player.providerPlayerId === "11").reviewDeparture, true);
  assert.equal(roster.players.find((player) => player.providerPlayerId === "12").status, "active");

  await db.prepare(`INSERT INTO footy_roster_players
    (id, team_id, season, player_key, provider, provider_player_id, provider_data, overrides, status, manual)
    VALUES ('duplicate-12', '1', '2026-27', 'old-provider:12', 'old-provider', '12', '{"name":"Manual Player","birthday":"2001-02-03"}', '{}', 'active', 0)`).run();
  const merged = await sync(worker, [{ teamId: "1", season: "2026-27", players: [
    { playerKey: "new-provider:12", provider: "new-provider", providerPlayerId: "12", providerData: { name: "Manual Player", birthday: "2001-02-03", number: "8" } },
  ] }]);
  roster = (await getJson(worker, "/api/rosters?includeInactive=1")).rosters[0];
  assert.equal(roster.players.filter((player) => player.name === "Manual Player").length, 1);
  assert.equal(roster.players.find((player) => player.name === "Manual Player").playerKey, "new-provider:12");
  assert.equal(merged.duplicatesMerged, 1);

  await sync(worker, [{ teamId: "1", season: "2025-26", active: false, players: [
    { playerKey: "history:12", provider: "legacy-history", providerPlayerId: "12", manual: true, providerData: { name: "Manual Player" } },
  ] }]);
  const rosters = (await getJson(worker, "/api/rosters?includeInactive=1")).rosters;
  assert.equal(rosters.find((entry) => entry.season === "2026-27").active, true);
  assert.equal(rosters.find((entry) => entry.season === "2025-26").active, false);

  await db.prepare("UPDATE footy_roster_players SET status = 'active' WHERE provider_player_id = '10'").run();
  await sync(worker, [{ teamId: "1", season: "2026-27", refreshedProviders: ["new-provider"], players: [
    { playerKey: "new-provider:12", provider: "new-provider", providerPlayerId: "12", providerData: { name: "Manual Player", birthday: "2001-02-03" } },
  ] }]);
  roster = (await getJson(worker, "/api/rosters?teamId=1&season=2026-27")).rosters[0];
  assert.equal(roster.players.find((player) => player.providerPlayerId === "10").reviewDeparture, false);
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
  return value;
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
