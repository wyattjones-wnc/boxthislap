import test from "node:test";
import assert from "node:assert/strict";
import { getDueFormulaOneAlerts } from "../src/index.js";

const round = {
  year: 2026,
  round: 7,
  name: "Miami Grand Prix",
  race_date: "2026-05-03",
  deadline_at: "2026-05-02T20:00:00.000Z",
};
const race = { round: "7", date: "2026-05-03", time: "20:00:00Z" };
const env = { NOTIFICATION_LOOKBACK_MINUTES: "16", FORMULA_ONE_YEAR: "2026" };

test("Formula 1 alerts are sent 24 hours, 12 hours, and 1 hour before the deadline", () => {
  for (const [hours, key] of [[24, "24h"], [12, "12h"], [1, "1h"]]) {
    const now = Date.parse(round.deadline_at) - hours * 60 * 60 * 1000;
    const alerts = getDueFormulaOneAlerts([round], [race], env, now);
    assert.equal(alerts.length, 1);
    assert.match(alerts[0].key, new RegExp(`${key}$`));
    assert.match(alerts[0].title, new RegExp(hours === 1 ? "1 hour" : `${hours} hours`));
  }
});

test("deadline alert says the deadline passed and includes the race time", () => {
  const alerts = getDueFormulaOneAlerts([round], [race], env, Date.parse(round.deadline_at));
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0].title, "Formula 1 deadline has passed");
  assert.match(alerts[0].body, /picks are closed/);
  assert.match(alerts[0].body, /Race: May 3, 2026, 4:00 PM/);
});

test("Formula 1 alerts do not repeat outside the scheduler lookback", () => {
  const now = Date.parse(round.deadline_at) + 17 * 60 * 1000;
  assert.deepEqual(getDueFormulaOneAlerts([round], [race], env, now), []);
});
