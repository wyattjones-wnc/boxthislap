import test from "node:test";
import assert from "node:assert/strict";
import {
  buildFormulaOneMainDatasets,
  buildFormulaOneQualifyingComparisons,
  formatFormulaOneLapTime,
  getAdjustedQualifyingTimes,
  getLastQualifyingTime,
  getRacePointsForPosition,
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

test("uses the constructor recorded for the round when a driver changes teams", () => {
  const drivers = [
    { driver_id: "a", display_name: "Alex A", constructor_id: "new_team", constructor_name: "New Team" },
    { driver_id: "b", display_name: "Blake B", constructor_id: "old_team", constructor_name: "Old Team" },
  ];
  const results = [
    { round: 1, session_type: "qualifying", driver_id: "a", constructor_id: "old_team", constructor_name: "Old Team", q1: "1:21.000" },
    { round: 1, session_type: "qualifying", driver_id: "b", constructor_id: "old_team", constructor_name: "Old Team", q1: "1:20.750" },
  ];
  const comparisons = buildFormulaOneQualifyingComparisons(results, drivers);
  assert.equal(comparisons.length, 1);
  assert.equal(comparisons[0].constructorId, "old_team");
  assert.equal(comparisons[0].constructorName, "Old Team");
});

test("builds complete main and sprint export datasets from stored results", () => {
  const rounds = [{
    round: 1,
    name: "Test Grand Prix",
    race_date: "2026-03-08",
    has_sprint: 1,
    driver_of_the_day: "Alex A",
    fastest_pit_time: "2.10",
    fastest_pit_team: "Team",
    dnf_count: "1",
    safety_car: "Yes",
  }];
  const drivers = [
    { driver_id: "a", display_name: "Alex A", constructor_id: "team", constructor_name: "Team" },
    { driver_id: "b", display_name: "Blake B", constructor_id: "team", constructor_name: "Team" },
  ];
  const results = [
    { round: 1, session_type: "qualifying", driver_id: "a", position: 1, q1: "1:21.000", q2: "1:20.500", q3: "1:20.000" },
    { round: 1, session_type: "qualifying", driver_id: "b", position: 12, q1: "1:21.250", q2: "1:20.750", q3: "" },
    { round: 1, session_type: "sprint", driver_id: "a", position: 1, points: 8 },
    { round: 1, session_type: "sprint", driver_id: "b", position: 2, points: 7 },
    { round: 1, session_type: "race", driver_id: "a", position: 1, points: 25, laps: 57 },
    { round: 1, session_type: "race", driver_id: "b", position: 4, points: 12, laps: 56 },
  ];

  const datasets = buildFormulaOneMainDatasets({ year: 2026, rounds, drivers, results });
  const alex = datasets.mainData.find((row) => row.driverId === "a");
  const blake = datasets.mainData.find((row) => row.driverId === "b");

  assert.deepEqual({
    racePoints: alex.racePoints,
    racePodium: alex.racePodium,
    qualifyingPosition: alex.qualifyingPosition,
    madeQ2: alex.madeQ2,
    madeQ3: alex.madeQ3,
    raceLapsCompleted: alex.raceLapsCompleted,
    polePosition: alex.polePosition,
    raceFinishingPosition: alex.raceFinishingPosition,
  }, {
    racePoints: 25,
    racePodium: "Yes",
    qualifyingPosition: 1,
    madeQ2: "Yes",
    madeQ3: "Yes",
    raceLapsCompleted: 57,
    polePosition: "Yes",
    raceFinishingPosition: 1,
  });
  assert.equal(alex.qualifyingUnadjustedTime, "1:20.000");
  assert.equal(blake.qualifyingUnadjustedTime, "1:20.750");
  assert.equal(alex.qualifyingAdjustedTime, "1:20.500");
  assert.equal(blake.qualifyingAdjustedTime, "1:20.750");
  assert.equal(alex.unadjustedQualifyingHeadToHead, "Win");
  assert.equal(blake.unadjustedQualifyingHeadToHead, "Loss");
  assert.equal(alex.adjustedQualifyingHeadToHead, "Win");
  assert.equal(alex.qualifyingPositionHeadToHead, "Win");
  assert.equal(alex.raceFinishingPositionHeadToHead, "Win");
  assert.equal(blake.madeQ3, "No");
  assert.equal(datasets.teammateComparisons[0].qualifyingPositionWinner, "Alex A");
  assert.equal(datasets.teammateComparisons[0].racePositionWinner, "Alex A");
  assert.deepEqual(datasets.roundSummary[0], {
    year: 2026,
    round: 1,
    roundName: "Test Grand Prix",
    raceDate: "2026-03-08",
    driverOfTheDay: "Alex A",
    fastestPitTime: "2.10",
    fastestPitTeam: "Team",
    dnfCount: "1",
    safetyCar: "Yes",
  });
  assert.equal(datasets.sprintData.find((row) => row.driverId === "a").sprintPoints, 8);
  assert.equal(datasets.sprintData.find((row) => row.driverId === "b").adjustedSprintPoints, 18);
  assert.deepEqual(datasets.sprintSummary[0], {
    year: 2026,
    round: 1,
    roundName: "Test Grand Prix",
    sprintWinner: "Alex A",
    raceWinner: "Alex A",
    sameRaceAndSprintWinner: "Yes",
  });
});

test("uses the race points system for adjusted sprint points", () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(getRacePointsForPosition), [25, 18, 15, 12, 10, 8, 6, 4, 2, 1, 0]);
});

test("does not create position head-to-heads from non-numeric classifications", () => {
  const drivers = [
    { driver_id: "a", display_name: "Alex A", constructor_id: "team", constructor_name: "Team" },
    { driver_id: "b", display_name: "Blake B", constructor_id: "team", constructor_name: "Team" },
  ];
  const results = [
    { round: 1, session_type: "qualifying", driver_id: "a", constructor_id: "team", constructor_name: "Team", position: 1, classified_position: "1" },
    { round: 1, session_type: "qualifying", driver_id: "b", constructor_id: "team", constructor_name: "Team", position: null, classified_position: "DNS" },
    { round: 1, session_type: "race", driver_id: "a", constructor_id: "team", constructor_name: "Team", position: 1, classified_position: "1" },
    { round: 1, session_type: "race", driver_id: "b", constructor_id: "team", constructor_name: "Team", position: null, classified_position: "DNF" },
  ];
  const comparison = buildFormulaOneMainDatasets({ year: 2026, rounds: [{ round: 1, name: "Test" }], drivers, results }).teammateComparisons[0];
  assert.equal(comparison.qualifyingPositionWinner, "");
  assert.equal(comparison.qualifyingPositionGap, "");
  assert.equal(comparison.racePositionWinner, "");
  assert.equal(comparison.racePositionGap, "");
});
