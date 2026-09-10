import { readFile, writeFile } from "node:fs/promises";
import { scoreWeeklyEntry } from "../workers/formula-one/src/scoring.js";

const inputPath = process.argv[2] || "data/formula-one-2026-migration.json";
const outputPath = process.argv[3] || ".tmp/formula-one-2026-seed.sql";
const data = JSON.parse(await readFile(inputPath, "utf8"));
const year = Number(data.rounds?.[0]?.raceDate?.slice(0, 4) || 2026);
const statements = ["PRAGMA foreign_keys = ON;"];

statements.push(`INSERT INTO f1_seasons (year, status, updated_at) VALUES (${year}, 'active', CURRENT_TIMESTAMP) ON CONFLICT(year) DO UPDATE SET status = 'active', updated_at = CURRENT_TIMESTAMP;`);

for (const round of data.rounds || []) {
  statements.push(`INSERT INTO f1_rounds (year, round, name, race_date, deadline_at, has_sprint, driver_of_the_day, fastest_pit_time, fastest_pit_team, dnf_count, safety_car, updated_at)
VALUES (${year}, ${integer(round.round)}, ${text(round.name)}, ${text(round.raceDate)}, ${text(round.deadlineAt)}, ${round.hasSprint ? 1 : 0}, ${text(round.driverOfTheDay)}, ${text(round.fastestPitTime)}, ${text(round.fastestPitTeam)}, ${text(round.dnfCount)}, ${text(round.safetyCar)}, CURRENT_TIMESTAMP)
ON CONFLICT(year, round) DO UPDATE SET name = excluded.name, race_date = excluded.race_date, deadline_at = excluded.deadline_at, has_sprint = excluded.has_sprint, driver_of_the_day = excluded.driver_of_the_day, fastest_pit_time = excluded.fastest_pit_time, fastest_pit_team = excluded.fastest_pit_team, dnf_count = excluded.dnf_count, safety_car = excluded.safety_car, updated_at = CURRENT_TIMESTAMP;`);
}

for (const driver of data.drivers || []) {
  statements.push(`INSERT INTO f1_drivers (year, driver_id, permanent_number, code, given_name, family_name, display_name, constructor_id, constructor_name, active, updated_at)
VALUES (${year}, ${text(driver.driverId)}, ${text(driver.permanentNumber)}, ${text(driver.code)}, ${text(driver.givenName)}, ${text(driver.familyName)}, ${text(driver.displayName)}, ${text(driver.constructorId)}, ${text(driver.constructorName)}, 1, CURRENT_TIMESTAMP)
ON CONFLICT(year, driver_id) DO UPDATE SET permanent_number = excluded.permanent_number, code = excluded.code, given_name = excluded.given_name, family_name = excluded.family_name, display_name = excluded.display_name, constructor_id = excluded.constructor_id, constructor_name = excluded.constructor_name, active = 1, updated_at = CURRENT_TIMESTAMP;`);
}

for (const session of data.sessions || []) {
  statements.push(`INSERT INTO f1_sessions (year, round, session_type, status, source, source_url, fetched_at, approved_at, approved_by, revision, updated_at)
VALUES (${year}, ${integer(session.round)}, ${text(session.sessionType)}, ${text(session.status)}, ${text(session.source)}, ${text(session.sourceUrl)}, '', ${text(data.generatedAt)}, '6', 1, CURRENT_TIMESTAMP)
ON CONFLICT(year, round, session_type) DO UPDATE SET status = excluded.status, source = excluded.source, source_url = excluded.source_url, approved_at = excluded.approved_at, approved_by = excluded.approved_by, revision = MAX(f1_sessions.revision, 1), updated_at = CURRENT_TIMESTAMP;`);
}

for (const result of data.results || []) {
  statements.push(`INSERT INTO f1_session_results (year, round, session_type, driver_id, position, classified_position, grid, points, laps, status, q1, q2, q3, time_text, fastest_lap_rank, raw_json, updated_at)
VALUES (${year}, ${integer(result.round)}, ${text(result.sessionType)}, ${text(result.driverId)}, ${nullableNumber(result.position)}, ${text(result.classifiedPosition)}, NULL, ${number(result.points)}, NULL, ${text(result.status)}, '', '', '', '', NULL, '{}', CURRENT_TIMESTAMP)
ON CONFLICT(year, round, session_type, driver_id) DO UPDATE SET position = excluded.position, classified_position = excluded.classified_position, points = excluded.points, status = excluded.status, updated_at = CURRENT_TIMESTAMP;`);
}

for (const entry of data.entries || []) {
  const picks = [entry.p1DriverId, entry.p2DriverId, entry.p3DriverId, entry.wildcardDriverId];
  const entryStatus = picks.every(Boolean) ? "submitted" : "draft";
  statements.push(`INSERT INTO f1_weekly_entries (year, round, manager_id, p1_driver_id, p2_driver_id, p3_driver_id, wildcard_driver_id, entry_status, submitted_at, updated_at)
VALUES (${year}, ${integer(entry.round)}, ${text(entry.managerId)}, ${text(entry.p1DriverId)}, ${text(entry.p2DriverId)}, ${text(entry.p3DriverId)}, ${text(entry.wildcardDriverId)}, ${text(entryStatus)}, ${entryStatus === "submitted" ? text(data.generatedAt) : "''"}, CURRENT_TIMESTAMP)
ON CONFLICT(year, round, manager_id) DO UPDATE SET p1_driver_id = excluded.p1_driver_id, p2_driver_id = excluded.p2_driver_id, p3_driver_id = excluded.p3_driver_id, wildcard_driver_id = excluded.wildcard_driver_id, entry_status = excluded.entry_status, submitted_at = excluded.submitted_at, updated_at = CURRENT_TIMESTAMP;`);
}

const resultsBySession = new Map();
for (const result of data.results || []) resultsBySession.set(`${result.round}:${result.sessionType}`, [...(resultsBySession.get(`${result.round}:${result.sessionType}`) || []), { driver_id: result.driverId, position: result.position }]);
for (const entry of (data.entries || []).filter((item) => [item.p1DriverId, item.p2DriverId, item.p3DriverId, item.wildcardDriverId].every(Boolean))) {
  const qualifying = resultsBySession.get(`${entry.round}:qualifying`);
  const race = resultsBySession.get(`${entry.round}:race`);
  if (!qualifying?.length || !race?.length) continue;
  const score = scoreWeeklyEntry({
    p1_driver_id: entry.p1DriverId,
    p2_driver_id: entry.p2DriverId,
    p3_driver_id: entry.p3DriverId,
    wildcard_driver_id: entry.wildcardDriverId,
  }, qualifying, race);
  statements.push(`INSERT INTO f1_weekly_scores (year, round, manager_id, p1_points, p2_points, p3_points, wildcard_qualifying_points, wildcard_race_points, total_points, details_json, updated_at)
VALUES (${year}, ${integer(entry.round)}, ${text(entry.managerId)}, ${number(score.p1Points)}, ${number(score.p2Points)}, ${number(score.p3Points)}, ${number(score.wildcardQualifyingPoints)}, ${number(score.wildcardRacePoints)}, ${number(score.totalPoints)}, ${text(JSON.stringify(score))}, CURRENT_TIMESTAMP)
ON CONFLICT(year, round, manager_id) DO UPDATE SET p1_points = excluded.p1_points, p2_points = excluded.p2_points, p3_points = excluded.p3_points, wildcard_qualifying_points = excluded.wildcard_qualifying_points, wildcard_race_points = excluded.wildcard_race_points, total_points = excluded.total_points, details_json = excluded.details_json, updated_at = CURRENT_TIMESTAMP;`);
}

statements.push(`INSERT INTO f1_audit_log (year, round, actor_manager_id, action, details_json) VALUES (${year}, NULL, '6', 'season_seeded', ${text(JSON.stringify({ sourceUrl: data.sourceUrl, generatedAt: data.generatedAt }))});`);
await writeFile(outputPath, `${statements.join("\n")}\n`, "utf8");
console.log(`Wrote ${statements.length} idempotent statements to ${outputPath}.`);

function text(value) {
  return `'${String(value ?? "").replace(/'/g, "''")}'`;
}

function integer(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) throw new Error(`Expected integer, received ${value}.`);
  return String(parsed);
}

function number(value) {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed)) throw new Error(`Expected number, received ${value}.`);
  return String(parsed);
}

function nullableNumber(value) {
  return value === null || value === undefined || value === "" ? "NULL" : number(value);
}
