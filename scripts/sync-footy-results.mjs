import { readFile, writeFile } from "node:fs/promises";
import { reconcileFootyResults } from "./footy-result-reconciliation.mjs";
import { syncFinalResults } from "./footy-results.mjs";

const path =
  process.env.FOOTY_SCHEDULE_OUTPUT_PATH || "data/footy-schedule.json";
const schedule = JSON.parse(await readFile(path, "utf8"));
const schedules = [...schedule.competitionSchedules, ...schedule.teamSchedules];
const fixtures = schedules.flatMap((entry) => entry.fixtures || []);
const previous = new Map(
  fixtures.map((fixture) => [fixture, fixture.finalResult]),
);
let lastRequest = 0;
const result = await reconcileFootyResults({
  schedules,
  generatedAt: new Date().toISOString(),
  async loadJson(url) {
    const wait = Math.max(0, lastRequest + 6500 - Date.now());
    if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
    lastRequest = Date.now();
    const response = await fetch(url);
    if (!response.ok)
      throw new Error(`Provider request failed (${response.status}).`);
    return response.json();
  },
});
if (result.failedRequests)
  console.warn(
    `::warning::${result.failedRequests} result-provider requests failed.`,
  );
if (!result.resolved && result.failedRequests)
  throw new Error(
    "No missing results resolved; provider failures require a retry.",
  );
const changed = fixtures.filter(
  (fixture) => fixture.finalResult !== previous.get(fixture),
);
const notes = await syncFinalResults(changed, {
  endpoint: process.env.FOOTY_RESULTS_SYNC_ENDPOINT,
  token: process.env.FOOTY_RESULTS_SYNC_TOKEN,
});
const byId = new Map(notes.map((note) => [note.matchId, note]));
for (const fixture of fixtures)
  if (byId.has(fixture.matchId)) fixture.matchNote = byId.get(fixture.matchId);
await writeFile(path, `${JSON.stringify(schedule, null, 2)}\n`);
console.log(
  `Reconciled ${result.resolved} missing results with ${result.requests} provider requests; synchronized ${notes.length} match notes.`,
);
