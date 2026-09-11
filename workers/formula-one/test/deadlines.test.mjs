import test from "node:test";
import assert from "node:assert/strict";
import { getQualifyingDeadline } from "../src/index.js";

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
