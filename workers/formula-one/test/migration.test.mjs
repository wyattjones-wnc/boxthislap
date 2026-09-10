import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migration = JSON.parse(await readFile(new URL("../../../data/formula-one-2026-migration.json", import.meta.url), "utf8"));

test("2026 migration snapshot is internally consistent", () => {
  assert.equal(migration.rounds.length, 24);
  assert.ok(migration.sessions.length > 0);
  assert.ok(migration.results.length > 0);
  assert.ok(migration.entries.length > 0);
  const driverIds = new Set(migration.drivers.map((driver) => driver.driverId));
  assert.equal(migration.drivers.filter((driver) => driver.constructorId && driver.constructorName).length, 22);
  const usedDriverIds = new Set([
    ...migration.results.map((result) => result.driverId),
    ...migration.entries.flatMap((entry) => [entry.p1DriverId, entry.p2DriverId, entry.p3DriverId, entry.wildcardDriverId]),
  ].filter(Boolean));
  assert.deepEqual([...usedDriverIds].filter((driverId) => !driverIds.has(driverId)), []);
  assert.equal(usedDriverIds.has("n_a"), false);
  assert.equal(migration.results.filter((result) => !result.constructorId || !result.constructorName).length, 0);
  assert.equal(migration.entries.filter((entry) => [entry.p1DriverId, entry.p2DriverId, entry.p3DriverId, entry.wildcardDriverId].some((value) => !value)).length, 1);
  const qualifyingResults = migration.results.filter((result) => result.sessionType === "qualifying");
  assert.equal(qualifyingResults.filter((result) => Number.isFinite(result.qualifyingUnadjustedSeconds)).length, 237);
  assert.equal(qualifyingResults.filter((result) => Number.isFinite(result.qualifyingAdjustedSeconds)).length, 238);
  const raceResults = migration.results.filter((result) => result.sessionType === "race");
  assert.equal(raceResults.length, 242);
  assert.equal(raceResults.filter((result) => Number.isFinite(result.points)).length, raceResults.length);
  assert.equal(raceResults.filter((result) => Number.isInteger(result.laps)).length, raceResults.length);
  const sprintResults = migration.results.filter((result) => result.sessionType === "sprint");
  assert.equal(sprintResults.length, 88);
  assert.equal(sprintResults.filter((result) => Number.isFinite(result.points)).length, sprintResults.length);
  assert.equal(sprintResults.filter((result) => Number.isInteger(result.position)).length, 40);
});

test("sprint sessions use league round IDs derived from event names", () => {
  assert.deepEqual(
    migration.sessions.filter((session) => session.sessionType === "sprint").map((session) => session.round),
    [2, 4, 5, 9]
  );
  assert.deepEqual(
    migration.rounds.filter((round) => round.hasSprint).map((round) => round.round),
    [2, 4, 5, 9, 12, 16]
  );
});

test("historical approvals remain session-specific", () => {
  for (const session of migration.sessions) {
    assert.ok(["qualifying", "sprint", "race"].includes(session.sessionType));
    assert.equal(session.status, "approved");
    assert.ok(migration.results.some((result) => result.round === session.round && result.sessionType === session.sessionType));
  }
});
