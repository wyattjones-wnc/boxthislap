import assert from "node:assert/strict";
import test from "node:test";
import { mergeFixtures } from "./update-footy-schedule.mjs";

const fixture = {
  home: "Rayo Vallecano de Madrid",
  away: "Athletic Club",
  source: "football-data.org",
  sourceIds: { "football-data.org": "564698" },
  matchId: "footy_comp_football_data_org_564698",
  timestamp: "2026-10-10T12:00:00Z",
  status: "TIMED",
};

test("overnight refresh keeps the confirmed postponement and stable identity", () => {
  const [updated] = mergeFixtures([{ ...fixture, status: "POSTPONED" }, fixture]);
  assert.equal(updated.status, "POSTPONED");
  assert.equal(updated.matchId, fixture.matchId);
});

test("provider rescheduling and match progress supersede the correction", () => {
  for (const update of [
    { timestamp: "2026-11-10T12:00:00Z" },
    { status: "IN_PLAY" },
    { status: "FINISHED" },
    { status: "CANCELLED" },
    { sourceIds: { "football-data.org": "other-match" } },
  ]) {
    const incoming = { ...fixture, ...update };
    assert.equal(mergeFixtures([incoming])[0].status, incoming.status);
  }
});
