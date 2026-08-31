import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { attachCanonicalFootyTeams } from "./footy-team-catalog.mjs";

const schedulePath = path.resolve(process.argv[2] || "data/footy-schedule.json");
const schedule = JSON.parse(await readFile(schedulePath, "utf8"));
schedule.schemaVersion = Math.max(Number(schedule.schemaVersion || 0), 4);
schedule.teamCatalog = attachCanonicalFootyTeams(schedule);
await writeFile(schedulePath, `${JSON.stringify(schedule, null, 2)}\n`, "utf8");
console.log(`Added ${schedule.teamCatalog.length} canonical teams to ${schedulePath}.`);
