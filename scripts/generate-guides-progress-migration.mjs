import { mkdir, writeFile } from "node:fs/promises";

const CHECKLIST_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ8gH2UmVBci0IYeYYAxM5KleyYTz_IN4hMGFTqyYAtcvkwVwTJ7ZMC5c-bOI_DIMYh6efBPlxBsz0M/pub?single=true&output=csv&gid=1000271762";
const OUTPUT_PATH = new URL("../workers/guides/migrations/0002_import_manager_6_progress.sql", import.meta.url);

const response = await fetch(CHECKLIST_URL);
if (!response.ok) throw new Error(`Unable to load checklist CSV (${response.status}).`);

const rows = parseCsv(await response.text());
const completed = rows.filter((row) => isTrue(row.Done));
const unique = new Map();

for (const row of completed) {
  const guideId = String(row["Guide ID"] || "").trim();
  const stepId = String(row["Step ID"] || "").trim();
  if (!guideId || !stepId) throw new Error("A completed checklist row is missing Guide ID or Step ID.");
  unique.set(`${guideId}::${stepId}`, { guideId, stepId });
}

const statements = [...unique.values()].map(({ guideId, stepId }) =>
  `INSERT OR IGNORE INTO guide_progress (manager_id, guide_id, step_id) VALUES ('6', '${sql(guideId)}', '${sql(stepId)}');`
);
const output = [
  "-- Generated from legacy WalkthroughChecklist Done values for manager 6.",
  ...statements,
  "",
].join("\n");

await mkdir(new URL("../workers/guides/migrations/", import.meta.url), { recursive: true });
await writeFile(OUTPUT_PATH, output, "utf8");
console.log(`Wrote ${statements.length} completed steps for manager 6.`);

function parseCsv(text) {
  const matrix = [];
  let row = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"' && quoted && text[index + 1] === '"') {
      value += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(value);
      value = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(value);
      if (row.some((cell) => cell !== "")) matrix.push(row);
      row = [];
      value = "";
    } else {
      value += character;
    }
  }
  row.push(value);
  if (row.some((cell) => cell !== "")) matrix.push(row);
  const headers = (matrix.shift() || []).map((header) => header.replace(/^\uFEFF/, "").trim());
  return matrix.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] || ""])));
}

function isTrue(value) {
  return ["true", "yes", "y", "1", "checked", "done", "complete", "completed"].includes(String(value || "").trim().toLowerCase());
}

function sql(value) {
  return String(value).replaceAll("'", "''");
}
