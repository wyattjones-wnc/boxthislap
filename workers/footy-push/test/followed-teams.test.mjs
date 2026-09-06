import assert from "node:assert/strict";
import test from "node:test";
import { getFixtureTeamIds, getUniqueFixtures, isFootyAlertSelected, resolveFollowedTeamIds } from "../src/index.js";

test("notification events expose both canonical teams once", () => {
  assert.deepEqual(getFixtureTeamIds({ homeTeamId: "1", awayTeamId: "2" }), ["1", "2"]);
  assert.deepEqual(getFixtureTeamIds({ homeTeamId: "1", awayTeamId: "1" }), ["1"]);
});

test("notification matching never falls back to display names", () => {
  assert.deepEqual(getFixtureTeamIds({ home: "Arsenal", away: "Chelsea" }), []);
});

test("notification recipients inherit defaults only without personal choices", () => {
  assert.deepEqual(resolveFollowedTeamIds([], ["1", "2"], "9", "6"), ["1", "2"]);
  assert.deepEqual(resolveFollowedTeamIds(["3"], ["1", "2"], "9", "6"), ["3"]);
  assert.deepEqual(resolveFollowedTeamIds([], ["1", "2"], "6", "6"), []);
});

test("alerts are selected by either a followed team or an opted-in match", () => {
  const alert = { matchId: "match-9", teamIds: ["10", "11"] };
  assert.equal(isFootyAlertSelected(alert, new Set(["10"]), new Set()), true);
  assert.equal(isFootyAlertSelected(alert, new Set(), new Set(["match-9"])), true);
  assert.equal(isFootyAlertSelected(alert, new Set(["12"]), new Set(["match-8"])), false);
});

test("background alerts include non-followed competition fixtures once", () => {
  const followed = { matchId: "match-1", home: "A", away: "B" };
  const extra = { matchId: "match-2", home: "C", away: "D" };
  assert.deepEqual(getUniqueFixtures({
    competitionSchedules: [{ fixtures: [followed, extra] }],
    teamSchedules: [{ fixtures: [followed] }],
  }).map((fixture) => fixture.matchId), ["match-1", "match-2"]);
});
