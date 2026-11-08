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
    /selection failed/,
  );
});

test("any saved match-note data excludes a followed match from Missing Match Notes", () => {
  const fixture = { date: "2020-01-01", homeTeamId: "a", awayTeamId: "b" };
  assert.equal(isFootyFixtureMissingDetails(fixture, ["a"]), true);
  assert.equal(isFootyFixtureMissingDetails(fixture, ["b"]), true);
  assert.equal(isFootyFixtureMissingDetails(fixture, ["c"]), false);
  assert.equal(
    isFootyFixtureMissingDetails({ ...fixture, matchNote: {} }, ["a"]),
    true,
  );
  for (const matchNote of [
    { homeScore: "0" },
    { awayScore: "2" },
    { kit: "home" },
    { note: "Details" },
    { highlightLink: "https://example.com" },
    { followGoalAssists: [{ scorer: "Player" }] },
    { opponentGoalAssists: [{ assister: "Player" }] },
  ])
    assert.equal(
      isFootyFixtureMissingDetails({ ...fixture, matchNote }, ["a", "b"]),
      false,
    );
  for (const change of [
    { date: "2099-01-01" },
    { status: "POSTPONED" },
    { status: "CANCELLED" },
  ]) {
    assert.equal(
      isFootyFixtureMissingDetails({ ...fixture, ...change }, ["a"]),
      false,
    );
  }
});

test("automation excludes every copy of a followed match and keeps unrelated results", () => {
  const result = {
    status: "FINISHED",
    finalResult: { homeScore: "1", awayScore: "0" },
  };
  const followed = {
    ...result,
    matchId: "followed",
    homeTeamId: "a",
    awayTeamId: "b",
    sourceIds: { provider: "one" },
  };
  const alternate = {
    ...result,
    matchId: "alternate",
    sourceIds: { provider: "one" },
  };
  const other = {
    ...result,
    matchId: "other",
    homeTeamId: "c",
    awayTeamId: "d",
  };
  assert.deepEqual(
    collectFinalResults([alternate, followed, other], { manualTeamIds: ["b"] }),
    [{ matchId: "other", homeScore: "1", awayScore: "0" }],
  );
  assert.deepEqual(
    collectFinalResults([followed], { manualTeamIds: ["a", "b"] }),
    [],
  );
});

test("sync uses the live followed selection and posts only unfollowed results", async () => {
  const fixtures = ["a", "c"].map((id) => ({
    matchId: id,
    homeTeamId: id,
    awayTeamId: "b",
    status: "FINISHED",
    finalResult: { homeScore: "0", awayScore: "0" },
  }));
  const posts = [];
  await syncFinalResults(fixtures, {
    endpoint: "https://example.com/sync",
    token: "test",
    async fetchImpl(url, options) {
      if (!options)
        return {
          ok: true,
          json: async () => ({ ok: true, teams: [{ teamId: "a" }] }),
        };
      posts.push(JSON.parse(options.body).results);
      return { ok: true, json: async () => ({ ok: true, notes: [] }) };
    },
  });
  assert.deepEqual(
    posts.flat().map((result) => result.matchId),
    ["c"],
  );
  let wrote = false;
  await assert.rejects(
    syncFinalResults(fixtures, {
      endpoint: "https://example.com/sync",
      token: "test",
      async fetchImpl(_url, options) {
        if (options) wrote = true;
        return { ok: false, status: 503 };
      },
    }),
    /selection failed/,
  );
  assert.equal(wrote, false);
});

test("Missing Match Notes excludes all friendlies even without saved notes", () => {
  const fixture = { date: "2020-01-01", homeTeamId: "a", awayTeamId: "b" };
  for (const metadata of [
    { isFriendly: true },
    { league: "MLS Preseason Friendlies" },
    { league: "International Friendly" },
    { league: "Club Friendly" },
    { leagueId: "4569" },
  ]) {
    assert.equal(
      isFootyFixtureMissingDetails({ ...fixture, ...metadata }, ["a", "b"]),
      false,
    );
  }
  assert.equal(
    isFootyFixtureMissingDetails(
      { ...fixture, league: "MLS - Regular Season" },
      ["a"],
    ),
    true,
  );
});
