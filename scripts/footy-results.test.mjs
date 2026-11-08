import assert from "node:assert/strict";
import test from "node:test";
import {
  finalFootballDataResult,
  collectFinalResults,
  syncFinalResults,
} from "./footy-results.mjs";
import { isFootyFixtureMissingDetails } from "../modules/footyFixtures.js";

test("only completed, numeric results are synced, once per match", async () => {
  const finished = {
    matchId: "one",
    status: "FINISHED",
    finalResult: { homeScore: "0", awayScore: "2" },
  };
  assert.deepEqual(
    collectFinalResults([
      finished,
      finished,
      { ...finished, matchId: "live", status: "IN_PLAY" },
      { ...finished, matchId: "empty", finalResult: null },
    ]),
    [{ matchId: "one", homeScore: "0", awayScore: "2" }],
  );
  assert.equal(
    finalFootballDataResult({
      status: "IN_PLAY",
      score: { fullTime: { home: 1, away: 0 } },
    }),
    null,
  );
  assert.deepEqual(
    finalFootballDataResult({
      status: "FINISHED",
      score: { fullTime: { home: 0, away: 0 } },
    }),
    { homeScore: "0", awayScore: "0" },
  );
  assert.equal(
    finalFootballDataResult({
      status: "FINISHED",
      score: { duration: "PENALTY_SHOOTOUT", fullTime: { home: 5, away: 4 } },
    }),
    null,
  );
  await assert.rejects(
    syncFinalResults([finished], {
      endpoint: "https://example.com",
      token: "test",
      fetchImpl: async () => ({
        ok: false,
        status: 500,
        json: async () => ({ error: "Failed" }),
      }),
    }),
    /Failed/,
  );
});

test("manual detail completion follows the selected sides and any scorer entry", () => {
  const fixture = {
    date: "2020-01-01",
    homeTeamId: "a",
    awayTeamId: "b",
    isHome: true,
    matchNote: { kit: "home", homeScore: "0", awayScore: "2" },
  };
  const missing = (f, ids = ["a"]) =>
    isFootyFixtureMissingDetails(f, ids, "home");
  assert.equal(missing(fixture), false);
  assert.equal(
    missing({
      ...fixture,
      date: "2099-01-01",
      matchNote: { kit: "home", homeScore: "2" },
    }),
    false,
  );
  assert.equal(missing(fixture, ["c"]), false);
  assert.equal(missing(fixture, ["b"]), true);
  assert.equal(
    missing({ ...fixture, matchNote: { ...fixture.matchNote, kit: "" } }),
    true,
  );
  assert.equal(
    missing({ ...fixture, matchNote: { ...fixture.matchNote, homeScore: "" } }),
    true,
  );
  assert.equal(
    missing({
      ...fixture,
      matchNote: {
        ...fixture.matchNote,
        homeScore: "4",
        followGoalAssists: [{ scorer: "Player", assister: "" }],
      },
    }),
    false,
  );
  assert.equal(
    missing({
      ...fixture,
      matchNote: {
        ...fixture.matchNote,
        homeScore: "1",
        followGoalAssists: [{ scorer: " ", assister: "Player" }],
      },
    }),
    true,
  );
  assert.equal(
    missing(
      {
        ...fixture,
        matchNote: {
          ...fixture.matchNote,
          opponentGoalAssists: [{ scorer: "Player" }],
        },
      },
      ["a", "b"],
    ),
    false,
  );
  assert.equal(missing({ ...fixture, status: "POSTPONED" }), false);
});
