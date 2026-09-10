import test from "node:test";
import assert from "node:assert/strict";
import { scorePodiumPick, scoreWeeklyEntry, scoreWildcardPosition } from "../src/scoring.js";

test("podium scoring matches the 2026 workbook rules", () => {
  assert.equal(scorePodiumPick(1, 1), 60);
  assert.equal(scorePodiumPick(2, 2), 50);
  assert.equal(scorePodiumPick(3, 3), 50);
  assert.equal(scorePodiumPick(1, 3), 25);
  assert.equal(scorePodiumPick(2, 8), 0);
});

test("wildcard scoring preserves the workbook lookup", () => {
  assert.equal(scoreWildcardPosition(1), 233);
  assert.equal(scoreWildcardPosition(10), 50);
  assert.equal(scoreWildcardPosition(19), 5);
  assert.equal(scoreWildcardPosition("DNF"), 0);
});

test("weekly score combines podium and both wildcard sessions", () => {
  const entry = { p1_driver_id: "a", p2_driver_id: "b", p3_driver_id: "c", wildcard_driver_id: "d" };
  const score = scoreWeeklyEntry(entry,
    [{ driver_id: "d", position: 10 }],
    [{ driver_id: "a", position: 1 }, { driver_id: "b", position: 3 }, { driver_id: "c", position: 8 }, { driver_id: "d", position: 19 }]
  );
  assert.deepEqual(score, {
    p1Points: 60,
    p2Points: 25,
    p3Points: 0,
    wildcardQualifyingPoints: 50,
    wildcardRacePoints: 5,
    totalPoints: 140,
  });
});
