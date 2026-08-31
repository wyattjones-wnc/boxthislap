import assert from "node:assert/strict";
import test from "node:test";
import { getFixtureTeamIds, resolveFollowedTeamIds } from "../src/index.js";

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
