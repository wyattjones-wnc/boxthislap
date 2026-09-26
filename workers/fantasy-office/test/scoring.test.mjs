import assert from "node:assert/strict";
import test from "node:test";
import {
  buildFantasyOfficeStandings,
  grossBonusPoints,
  scoreFantasyOfficeMovie,
} from "../src/scoring.js";

test("gross bonuses preserve the 2025 thresholds", () => {
  assert.equal(grossBonusPoints(24_999_999), 0);
  assert.equal(grossBonusPoints(25_000_000), 5);
  assert.equal(grossBonusPoints(50_000_000), 15);
  assert.equal(grossBonusPoints(75_000_000), 25);
  assert.equal(grossBonusPoints(100_000_000), 45);
  assert.equal(grossBonusPoints(150_000_000), 80);
  assert.equal(grossBonusPoints(200_000_000), 105);
  assert.equal(grossBonusPoints(900_000_000), 105);
});

test("scores all automated metrics and the manual award value", () => {
  assert.deepEqual(
    scoreFantasyOfficeMovie({
      awardPoints: 25,
      domesticGross: 279_989_632,
      letterboxdRating: 4.14,
      numberOneWeekends: 2,
      tomatometer: 97,
    }),
    {
      awardPoints: 25,
      boxOfficePoints: 405,
      criticalPoints: 895,
      grossBase: 280,
      grossBonus: 105,
      letterboxdPoints: 410,
      numberOneBonus: 20,
      points: 1325,
      provisional: false,
      rottenTomatoesPoints: 485,
    },
  );
});

test("missing source values contribute zero and mark scores provisional", () => {
  const score = scoreFantasyOfficeMovie({
    awardPoints: 0,
    domesticGross: null,
    letterboxdRating: null,
    numberOneWeekends: 0,
    tomatometer: null,
  });
  assert.equal(score.points, 0);
  assert.equal(score.provisional, true);
});

test("standings ignore substitutes and use competition ranks for ties", () => {
  const metrics = {
    domesticGross: 25_000_000,
    letterboxdRating: 3,
    numberOneWeekends: 0,
    tomatometer: 60,
  };
  const standings = buildFantasyOfficeStandings([
    { ...metrics, active: true, manager: "Alpha", movie: "One" },
    { ...metrics, active: true, manager: "Bravo", movie: "Two" },
    { ...metrics, active: false, manager: "Alpha", movie: "Sub" },
  ]);
  assert.deepEqual(
    standings.map(({ manager, rank }) => ({ manager, rank })),
    [
      { manager: "Alpha", rank: 1 },
      { manager: "Bravo", rank: 1 },
    ],
  );
});
