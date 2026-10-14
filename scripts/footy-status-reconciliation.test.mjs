import assert from "node:assert/strict";
import test from "node:test";
import { reconcileFootyStatuses } from "./footy-status-reconciliation.mjs";

const generatedAt = "2026-10-14T10:00:00Z";
const fixture = (extra = {}) => ({ matchId: "stable-id", home: "Rayo Vallecano de Madrid", away: "Athletic Club", timestamp: "2026-10-10T12:00:00Z", status: "TIMED", ...extra });
const event = (status = "STATUS_POSTPONED") => ({ id: "espn-id", date: "2026-10-10T12:00Z", status: { type: { name: status } }, competitions: [{ competitors: [
  { homeAway: "home", team: { displayName: "Rayo Vallecano" } },
  { homeAway: "away", team: { displayName: "Athletic Bilbao" } },
] }] });
const schedule = (fixtures = [fixture()]) => ({ competition: { code: "PD" }, fixtures, errors: [], notes: [] });
const reconcile = (schedules, loadJson, previousSchedules = []) => reconcileFootyStatuses({ schedules, loadJson, previousSchedules, generatedAt });

test("detects interruptions dynamically, preserves identity, and records evidence", async () => {
  for (const [reported, expected] of [["STATUS_POSTPONED", "POSTPONED"], ["STATUS_SUSPENDED", "SUSPENDED"], ["STATUS_ABANDONED", "SUSPENDED"]]) {
    const s = schedule();
    await reconcile([s], async () => ({ events: [event(reported)] }));
    assert.equal(s.fixtures[0].status, expected);
    assert.equal(s.fixtures[0].matchId, "stable-id");
    assert.equal(s.fixtures[0].statusVerification.reportedStatus, reported);
  }
});

test("does not guess from missing, ambiguous, unrelated, or reversed matches", async () => {
  for (const events of [[], [event(), event()], [{ ...event(), date: "2026-10-11T12:00Z" }]]) {
    const s = schedule();
    await reconcile([s], async () => ({ events }));
    assert.equal(s.fixtures[0].status, "TIMED");
  }
  const s = schedule([fixture({ home: "Athletic Club", away: "Rayo Vallecano" })]);
  await reconcile([s], async () => ({ events: [event()] }));
  assert.equal(s.fixtures[0].status, "TIMED");
});

test("retains verified interruptions through provider lag or verifier failure", async () => {
  const previous = schedule();
  await reconcile([previous], async () => ({ events: [event()] }));
  const next = schedule();
  await reconcile([next], async () => { throw new Error("offline"); }, [previous]);
  assert.equal(next.fixtures[0].status, "POSTPONED");
  assert.equal(next.status, "partial");
  assert.match(next.errors[0], /offline/);
});

test("new kickoff and primary match progress supersede previous verification", async () => {
  const previous = schedule();
  await reconcile([previous], async () => ({ events: [event()] }));
  for (const extra of [{ timestamp: "2026-10-20T12:00:00Z" }, { status: "IN_PLAY" }, { status: "FINISHED" }]) {
    const s = schedule([fixture(extra)]);
    await reconcile([s], async () => ({ events: [event()] }), [previous]);
    assert.equal(s.fixtures[0].status, extra.status || "TIMED");
    assert.equal(s.fixtures[0].statusVerification, undefined);
  }
});

test("bounds lookups by date and supported competition and deduplicates requests", async () => {
  let calls = 0;
  const s = schedule([fixture(), fixture({ matchId: "another" }), fixture({ timestamp: "2027-01-01T12:00:00Z" })]);
  await reconcile([s, { ...schedule(), competition: { code: "unknown" } }], async () => { calls++; return { events: [] }; });
  assert.equal(calls, 1);
});
