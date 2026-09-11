import test from "node:test";
import assert from "node:assert/strict";
import { findRoundRosterSession, getQualifyingDeadline, isTopFourConstructor } from "../src/index.js";

test("qualifying start is used as the weekly deadline", () => {
  assert.equal(getQualifyingDeadline({
    Qualifying: { date: "2026-03-07", time: "05:00:00Z" },
    SprintQualifying: { date: "2026-03-06", time: "05:30:00Z" },
  }), "2026-03-07T05:00:00.000Z");
});

test("a deadline is not guessed when qualifying time is incomplete", () => {
  assert.equal(getQualifyingDeadline({ Qualifying: { date: "2026-03-07" } }), "");
  assert.equal(getQualifyingDeadline({}), "");
});

test("round rosters wait for the second weekend session", () => {
  const sessions = [
    { meeting_key: 10, session_key: 101, session_name: "Practice 1" },
    { meeting_key: 10, session_key: 102, session_name: "Practice 2" },
    { meeting_key: 20, session_key: 201, session_name: "Practice 1" },
    { meeting_key: 20, session_key: 202, session_name: "Sprint Qualifying" },
  ];
  assert.equal(findRoundRosterSession(sessions, 10, false)?.session_key, 102);
  assert.equal(findRoundRosterSession(sessions, 20, true)?.session_key, 202);
  assert.equal(findRoundRosterSession(sessions.slice(0, 1), 10, false), null);
});

test("wildcards exclude the top four constructors", () => {
  for (const team of ["McLaren", "Mercedes", "Ferrari", "Red Bull Racing"]) assert.equal(isTopFourConstructor(team), true);
  assert.equal(isTopFourConstructor("Racing Bulls"), false);
  assert.equal(isTopFourConstructor("Williams"), false);
});
