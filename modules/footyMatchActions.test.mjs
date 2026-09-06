import assert from "node:assert/strict";
import test from "node:test";
import {
  buildFootyNextItemDefaults,
  getFootyNotificationFixtures,
  isFootyFixtureFollowed,
} from "./footyMatchActions.js";

test("notification fixtures include and deduplicate full competition matches", () => {
  const shared = { home: "A", away: "B", matchId: "match-1" };
  const extra = { home: "C", away: "D", matchId: "match-2" };
  assert.deepEqual(getFootyNotificationFixtures({
    competitionSchedules: [{ fixtures: [shared, extra] }],
    teamSchedules: [{ fixtures: [shared] }],
  }).map((fixture) => fixture.matchId), ["match-1", "match-2"]);
});

test("a fixture is followed when any canonical side is selected", () => {
  assert.equal(isFootyFixtureFollowed({ homeTeamId: "8", awayTeamId: "9" }, ["9"]), true);
  assert.equal(isFootyFixtureFollowed({ homeTeamId: "8", awayTeamId: "9" }, ["10"]), false);
});

test("Next defaults use the displayed Eastern match date and time", () => {
  assert.deepEqual(buildFootyNextItemDefaults({
    away: "Chelsea",
    home: "Arsenal",
    matchId: "match-3",
    timestamp: "2026-09-06T00:30:00Z",
  }), {
    date: "2026-09-05",
    sourceMatchId: "match-3",
    thing: "Arsenal v Chelsea",
    time: "20:30",
  });
});
