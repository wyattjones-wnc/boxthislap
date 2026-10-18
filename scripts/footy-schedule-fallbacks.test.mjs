import assert from "node:assert/strict";
import test from "node:test";
import { applySportDbCompetitionFallbacks } from "./update-footy-schedule.mjs";

const restrictedSchedule = {
  competition: { name: "EFL Cup", source: "football-data.org" },
  errors: ["403: resource restricted by subscription"],
  fixtures: [],
};
const fallbackSchedule = {
  competition: { name: "EFL Cup", source: "TheSportsDB" },
  errors: [],
  fixtures: [{ id: "efl-match" }],
};

test("replaces a subscription-restricted EFL Cup schedule with the populated fallback", () => {
  assert.deepEqual(
    applySportDbCompetitionFallbacks([restrictedSchedule], [fallbackSchedule]),
    [fallbackSchedule],
  );
});

test("preserves the provider error when the fallback has no fixtures", () => {
  assert.deepEqual(
    applySportDbCompetitionFallbacks([restrictedSchedule], [{ ...fallbackSchedule, fixtures: [] }]),
    [restrictedSchedule],
  );
});
