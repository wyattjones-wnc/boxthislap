import assert from "node:assert/strict";
import test from "node:test";
import {
  isNextDateSpanInRange,
  normalizeNextDateRange,
  normalizeNextPriorityRange,
} from "./nextFilters.js";

test("priority handles keep at least one step between them", () => {
  assert.deepEqual(normalizeNextPriorityRange(7, 7, "min"), { min: 6, max: 7 });
  assert.deepEqual(normalizeNextPriorityRange(7, 7, "max"), { min: 7, max: 8 });
  assert.deepEqual(normalizeNextPriorityRange(10, 4, "min"), { min: 3, max: 4 });
  assert.deepEqual(normalizeNextPriorityRange(8, 2, "max"), { min: 8, max: 9 });
});

test("one-sided Next date ranges remain open ended", () => {
  const from = normalizeNextDateRange("2026-09-10", "");
  const to = normalizeNextDateRange("", "2026-09-20");

  assert.deepEqual(from, { start: "2026-09-10", end: "" });
  assert.deepEqual(to, { start: "", end: "2026-09-20" });
  assert.equal(isNextDateSpanInRange("2026-09-15", "", from), true);
  assert.equal(isNextDateSpanInRange("2026-09-09", "", from), false);
  assert.equal(isNextDateSpanInRange("2026-09-15", "", to), true);
  assert.equal(isNextDateSpanInRange("2026-09-21", "", to), false);
});

test("two-sided Next date ranges include overlapping multi-day items", () => {
  const range = normalizeNextDateRange("2026-09-20", "2026-09-10");
  assert.deepEqual(range, { start: "2026-09-10", end: "2026-09-20" });
  assert.equal(isNextDateSpanInRange("2026-09-08", "2026-09-12", range), true);
  assert.equal(isNextDateSpanInRange("2026-09-21", "2026-09-22", range), false);
});
