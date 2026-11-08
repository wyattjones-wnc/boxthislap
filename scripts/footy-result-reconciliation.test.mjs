import assert from "node:assert/strict";
import test from "node:test";
import { reconcileFootyResults } from "./footy-result-reconciliation.mjs";

const fixture = (extra = {}) => ({
  matchId: "stable",
  home: "Home Club",
  away: "Away Club",
  timestamp: "2026-10-25T02:30:00Z",
  status: "Scheduled",
  ...extra,
});
const event = (extra = {}) => ({
  id: "provider-id",
  date: "2026-10-25T02:30:00Z",
  status: {
    type: { name: "STATUS_FULL_TIME", state: "post", completed: true },
  },
  competitions: [
    {
      competitors: [
        {
          homeAway: "home",
          team: { displayName: "Home Club" },
          score: "4",
          shootoutScore: "5",
        },
        {
          homeAway: "away",
          team: { displayName: "Away Club" },
          score: "0",
          shootoutScore: "3",
        },
      ],
    },
  ],
  ...extra,
});
const schedule = (fixtures = [fixture()]) => ({
  competition: { code: "MLS" },
  fixtures,
});
const reconcile = (schedules, loadJson) =>
  reconcileFootyResults({
    schedules,
    generatedAt: "2026-11-07T10:30:00Z",
    loadJson,
  });

test("calendar fixtures acquire verified final results, including late UTC kickoffs", async () => {
  let calls = 0;
  const s = schedule([fixture(), fixture({ matchId: "other-id" })]);
  const team = { fixtures: [fixture()] };
  await reconcile([s, team], async (url) => {
    calls++;
    assert.match(url, /dates=20261024/);
    return { events: [event()] };
  });
  assert.equal(calls, 1);
  assert.equal(s.fixtures[0].matchId, "stable");
  assert.deepEqual(s.fixtures[0].finalResult, {
    homeScore: "4",
    awayScore: "0",
  });
  assert.deepEqual(team.fixtures[0].finalResult, s.fixtures[0].finalResult);
  assert.equal(team.fixtures[0].status, "FINISHED");
});

test("cup mapping precedes ambiguous competition codes and penalty scores exclude shootouts", async () => {
  const s = {
    competition: { key: "efl cup", code: "ELC" },
    fixtures: [fixture()],
  };
  await reconcile([s], async (url) => {
    assert.match(url, /eng.league_cup/);
    return {
      events: [
        event({
          status: {
            type: { completed: true, state: "post", name: "STATUS_FINAL_PEN" },
          },
        }),
      ],
    };
  });
  assert.equal(s.fixtures[0].finalResult.homeScore, "4");
});

test("exact provider event IDs fill final and penalty-decided cup results", async () => {
  const s = { fixtures: [fixture({ sourceIds: { TheSportsDB: "1234" } })] };
  await reconcile([s], async () => ({
    events: [
      {
        idEvent: "1234",
        dateEvent: "2026-10-25",
        strHomeTeam: "Home Club",
        strAwayTeam: "Away Club",
        strStatus: "PEN",
        intHomeScore: "1",
        intAwayScore: "1",
        intHomeScoreExtra: "5",
        intAwayScoreExtra: "3",
      },
    ],
  }));
  assert.deepEqual(s.fixtures[0].finalResult, {
    homeScore: "1",
    awayScore: "1",
  });
});

test("missing, live, ambiguous, reversed, canceled and invalid scores are never inferred", async () => {
  for (const events of [
    [],
    [event(), event()],
    [event({ date: "2026-10-26T02:30Z" })],
    [event({ status: { type: { completed: false, state: "in" } } })],
    [
      event({
        status: {
          type: { completed: true, state: "post", name: "STATUS_ABANDONED" },
        },
      }),
    ],
  ]) {
    const s = schedule();
    await reconcile([s], async () => ({ events }));
    assert.equal(s.fixtures[0].finalResult, undefined);
  }
  const s = schedule([fixture({ home: "Away Club", away: "Home Club" })]);
  await reconcile([s], async () => ({ events: [event()] }));
  assert.equal(s.fixtures[0].finalResult, undefined);
});

test("successful provider results and out-of-window fixtures need no fallback requests", async () => {
  const s = schedule([
    fixture({
      status: "FINISHED",
      finalResult: { homeScore: "0", awayScore: "0" },
    }),
    fixture({ matchId: "old", timestamp: "2025-01-01T00:00Z" }),
    fixture({ matchId: "future", timestamp: "2027-01-01T00:00Z" }),
  ]);
  await reconcile([s], async () => {
    throw new Error("unexpected request");
  });
  assert.equal(s.errors, undefined);
});

test("generic feed markers, word order and plural nicknames do not require club overrides", async () => {
  const s = schedule([fixture({ home: "Harbor Bulls*" })]);
  const e = event();
  e.competitions[0].competitors[0].team.displayName = "Bull Harbor";
  await reconcile([s], async () => ({ events: [e] }));
  assert.equal(s.fixtures[0].finalResult.homeScore, "4");
});

test("unavailable numeric scores remain unresolved instead of becoming zero", async () => {
  const s = schedule();
  const e = event();
  e.competitions[0].competitors[0].score = null;
  await reconcile([s], async () => ({ events: [e] }));
  assert.equal(s.fixtures[0].finalResult, undefined);
});
