import assert from "node:assert/strict";

import {
  getCurrentTeamFixtures,
  getSportDbTimestamp,
  isSameFootballClubName,
  mergeFixtures,
} from "./update-footy-schedule.mjs";

const fixture = (overrides = {}) => ({
  away: "Opponent",
  date: "2026-08-31",
  home: "FC Barcelona",
  source: "iCalendar",
  sourceIds: { iCalendar: "calendar-id" },
  sources: ["iCalendar"],
  teamId: "2",
  teamName: "Barcelona",
  timestamp: "2026-08-31T19:30:00Z",
  ...overrides,
});

assert.equal(getSportDbTimestamp({ strTimestamp: "2026-08-19T18:00:00" }), "2026-08-19T18:00:00Z");
assert.equal(getSportDbTimestamp({ strTimestamp: "2026-08-19T18:00:00+00:00" }), "2026-08-19T18:00:00+00:00");
assert.equal(isSameFootballClubName("Rayo Vallecano", "Rayo Vallecano de Madrid"), true);

const [rescheduledAthletic] = mergeFixtures([
  fixture({
    away: "Athletic Club",
    date: "2026-08-16",
    matchId: "stale-registry-id",
    source: "Footy Matches",
    sources: ["Footy Matches"],
    timestamp: "2026-08-16T10:00:00",
  }),
  fixture({
    away: "Athletic Club",
    date: "2026-08-27",
    matchId: "current-registry-id",
    timestamp: "2026-08-27T19:00:00Z",
  }),
]);
assert.equal(rescheduledAthletic.date, "2026-08-27");
assert.equal(rescheduledAthletic.matchId, "current-registry-id");

const [rayo] = mergeFixtures([
  fixture({ away: "Rayo Vallecano de Madrid", source: "football-data.org", sourceIds: { "football-data.org": "564650" }, sources: ["football-data.org"] }),
  fixture({ away: "Rayo Vallecano" }),
]);
assert.deepEqual(rayo.sources, ["football-data.org", "iCalendar"]);
assert.equal(rayo.away, "Rayo Vallecano de Madrid");

const currentFixtures = getCurrentTeamFixtures({
  generatedAt: "2026-08-16T10:00:00Z",
  previousFixtures: [
    fixture({ date: "2026-08-15" }),
    fixture({ away: "Stale future match", date: "2026-08-20", sourceIds: { iCalendar: "stale" } }),
  ],
  teamFixtures: [fixture({ away: "Current future match", sourceIds: { iCalendar: "current" } })],
});
assert.deepEqual(currentFixtures.map(({ away }) => away), ["Opponent", "Current future match"]);

console.log("Footy schedule updater regression checks passed.");
