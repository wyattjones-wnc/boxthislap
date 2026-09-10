import assert from "node:assert/strict";
import test from "node:test";
import { buildRosterProviderIndex, getRosterProviderIds, normalizeRosterClubName } from "./footy-roster-providers.mjs";

test("provider IDs follow club aliases across schedule sources", () => {
  const schedule = {
    competitionSchedules: [{
      fixtures: [{
        away: "Manchester City FC",
        awayProviderTeamId: "65",
        awayTeamId: "team:manchester-city-fc",
        home: "Arsenal FC",
        homeProviderTeamId: "57",
        homeTeamId: "1",
        source: "football-data.org",
      }],
    }],
    teamCatalog: [
      { id: "team:manchester-city", name: "Manchester City" },
      { id: "team:manchester-city-fc", name: "Manchester City FC" },
    ],
  };
  const index = buildRosterProviderIndex(schedule);
  assert.deepEqual(getRosterProviderIds(index, schedule.teamCatalog[0]), { "football-data.org": "65" });
  assert.deepEqual(getRosterProviderIds(index, schedule.teamCatalog[1]), { "football-data.org": "65" });
});

test("configured provider IDs include both squad and media sources", () => {
  const team = {
    id: "1",
    name: "Arsenal",
    provider: "football-data.org",
    providerTeamId: "57",
    sportDbTeamId: "133604",
  };
  const index = buildRosterProviderIndex({ teamSchedules: [{ team }] });
  assert.deepEqual(getRosterProviderIds(index, team), {
    "football-data.org": "57",
    TheSportsDB: "133604",
  });
});

test("club-name matching ignores common suffixes and accents", () => {
  assert.equal(normalizeRosterClubName("Málaga CF"), "malaga");
  assert.equal(normalizeRosterClubName("Manchester City FC"), normalizeRosterClubName("Manchester City"));
});
