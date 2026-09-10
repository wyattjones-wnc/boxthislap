import test from "node:test";
import assert from "node:assert/strict";
import {
  buildFormulaOneQualifyingComparisons,
  formatFormulaOneLapTime,
  getAdjustedQualifyingTimes,
  getLastQualifyingTime,
  parseFormulaOneLapTime,
  summarizeFormulaOneQualifyingComparisons,
} from "./formulaOneQualifying.js";

test("parses Formula 1 lap times", () => {
  assert.equal(parseFormulaOneLapTime("1:20.250"), 80.25);
  assert.equal(parseFormulaOneLapTime("79.900"), 79.9);
  assert.equal(parseFormulaOneLapTime(""), null);
  assert.equal(formatFormulaOneLapTime(79.475), "1:19.475");
});

test("uses migrated adjusted and unadjusted qualifying seconds when raw sessions are unavailable", () => {
  const first = { qualifying_unadjusted_seconds: 79.475, qualifying_adjusted_seconds: 79.475 };
  const second = { qualifying_unadjusted_seconds: 76.38, qualifying_adjusted_seconds: 79.38 };
  assert.equal(getLastQualifyingTime(first).time, "1:19.475");
  const adjusted = getAdjustedQualifyingTimes(first, second);
  assert.equal(adjusted.session, "adjusted");
  assert.ok(Math.abs(adjusted.first.seconds - adjusted.second.seconds - 0.095) < 0.000001);
});

test("unadjusted qualifying uses each driver's last completed session", () => {
  assert.deepEqual(getLastQualifyingTime({ q1: "1:21.000", q2: "1:20.500", q3: "" }), {
    session: "q2", seconds: 80.5, time: "1:20.500",
  });
});

test("adjusted qualifying uses the latest session shared by teammates", () => {
  const adjusted = getAdjustedQualifyingTimes(
    { q1: "1:21.000", q2: "", q3: "" },
    { q1: "1:20.750", q2: "1:20.100", q3: "" }
  );
  assert.equal(adjusted.session, "q1");
  assert.equal(adjusted.first.seconds - adjusted.second.seconds, 0.25);
});

test("builds round and season teammate comparisons", () => {
  const drivers = [
    { driver_id: "a", display_name: "Alex A", constructor_id: "team", constructor_name: "Team" },
    { driver_id: "b", display_name: "Blake B", constructor_id: "team", constructor_name: "Team" },
  ];
  const results = [
    { round: 1, session_type: "qualifying", driver_id: "a", q1: "1:21.000", q2: "", q3: "" },
    { round: 1, session_type: "qualifying", driver_id: "b", q1: "1:20.750", q2: "1:20.100", q3: "" },
  ];
  const comparisons = buildFormulaOneQualifyingComparisons(results, drivers);
  assert.ok(Math.abs(comparisons[0].unadjusted.differenceSeconds - 0.9) < 0.000001);
  assert.equal(comparisons[0].adjusted.session, "q1");
  assert.ok(Math.abs(comparisons[0].adjusted.differenceSeconds - 0.25) < 0.000001);
  assert.deepEqual(summarizeFormulaOneQualifyingComparisons(comparisons)[0].adjusted, {
    averageDifferenceSeconds: 0.25,
    firstDriverWins: 0,
    secondDriverWins: 1,
    rounds: 1,
  });
});
