import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_PATH = path.join(ROOT_DIR, "data", "guides.json");
const GUIDES_BASE_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQ8gH2UmVBci0IYeYYAxM5KleyYTz_IN4hMGFTqyYAtcvkwVwTJ7ZMC5c-bOI_DIMYh6efBPlxBsz0M/pub";
const GUIDES_URL = `${GUIDES_BASE_URL}?single=true&output=csv&gid=0`;
const CHECKLIST_URL = `${GUIDES_BASE_URL}?single=true&output=csv&gid=1000271762`;

const [guideRows, checklistRows] = await Promise.all([
  loadCsv(GUIDES_URL, "Guides"),
  loadCsv(CHECKLIST_URL, "WalkthroughChecklist"),
]);

const guides = guideRows.map((row) => {
  const id = clean(row.ID || row.Id || row.id);
  return {
    id,
    name: clean(row.Name || row.name),
    rankingId: clean(row["VG Ranking ID"] || row.rankingId),
    todoId: clean(row["To Do ID"] || row.todoId),
    isAdmin: parseBoolean(row.IsAdmin ?? row.isAdmin, `Guide ${id || "without an ID"} IsAdmin`),
  };
});
let ignoredBlankRows = 0;
const steps = checklistRows.map((row) => ({
  id: clean(row.ID || row.Id || row.id),
  guideId: clean(row["Guide ID"] || row.guideId),
  stepId: clean(row["Step ID"] || row.stepId),
  parentId: clean(row["Parent ID"] || row.parentId),
  divider: clean(row.Divider || row.divider),
  section: clean(row.Section || row.section),
  type: clean(row.Type || row.type),
  step: clean(row.Step || row.step),
  url: clean(row.Url || row.URL || row.url),
})).filter((item) => {
  const isUnaddressableBlankRow = !item.guideId && !item.stepId && !item.parentId &&
    !item.divider && !item.section && !item.step && !item.url;
  if (isUnaddressableBlankRow) ignoredBlankRows += 1;
  return !isUnaddressableBlankRow;
});
if (ignoredBlankRows) console.warn(`Warning: Ignoring ${ignoredBlankRows} unaddressable blank checklist rows.`);

validateSnapshot({ guides, steps });

const previous = await readExistingSnapshot();
const unchanged = previous &&
  JSON.stringify(previous.guides) === JSON.stringify(guides) &&
  JSON.stringify(previous.steps) === JSON.stringify(steps);
const snapshot = {
  schemaVersion: 2,
  generatedAt: unchanged ? previous.generatedAt : new Date().toISOString(),
  guides,
  steps,
};

await writeFile(OUTPUT_PATH, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
console.log(`${unchanged ? "Validated" : "Generated"} ${guides.length} guides and ${steps.length} steps.`);

async function loadCsv(url, label) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const requestUrl = new URL(url);
      requestUrl.searchParams.set("refresh", `${Date.now()}-${attempt}`);
      const response = await fetch(requestUrl, {
        headers: { Accept: "text/csv" },
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error(`${label} returned ${response.status}.`);
      const rows = parseCsv(await response.text());
      if (!rows.length) throw new Error(`${label} returned no rows.`);
      return rows;
    } catch (error) {
      lastError = error;
      if (attempt < 3) await wait(attempt * 500);
    }
  }
  throw new Error(`Unable to load ${label}: ${lastError?.message || "Unknown error."}`);
}

function validateSnapshot(snapshot) {
  if (!snapshot.guides.length) throw new Error("At least one Guide is required.");
  if (!snapshot.steps.length) throw new Error("At least one walkthrough step is required.");

  const guideIds = new Set();
  for (const guide of snapshot.guides) {
    if (!guide.id || !guide.name) throw new Error("Every Guide requires ID and Name.");
    if (typeof guide.isAdmin !== "boolean") throw new Error(`Guide ${guide.id} requires a valid IsAdmin value.`);
    if (guideIds.has(guide.id)) throw new Error(`Duplicate Guide ID: ${guide.id}`);
    guideIds.add(guide.id);
  }

  const itemIds = new Set();
  const pairKeys = new Set();
  const stepsByGuide = new Map();
  for (const item of snapshot.steps) {
    if (!item.id || !item.guideId || !item.stepId) {
      throw new Error(`Every walkthrough step requires ID, Guide ID, and Step ID: ${JSON.stringify(item)}`);
    }
    if (!item.step) console.warn(`Warning: Guide ${item.guideId} step ${item.stepId} has no Step text.`);
    if (!guideIds.has(item.guideId)) throw new Error(`Step ${item.id} references unknown Guide ID ${item.guideId}.`);
    const itemKey = `${item.guideId}::${item.id}`;
    if (itemIds.has(itemKey)) throw new Error(`Duplicate walkthrough ID ${item.id} within Guide ${item.guideId}.`);
    itemIds.add(itemKey);
    const pairKey = `${item.guideId}::${item.stepId}`;
    if (pairKeys.has(pairKey)) throw new Error(`Duplicate Guide ID and Step ID pair: ${pairKey}`);
    pairKeys.add(pairKey);
    if (item.url) {
      let url;
      try {
        url = new URL(item.url);
      } catch {
        throw new Error(`Step ${item.id} has an invalid URL.`);
      }
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error(`Step ${item.id} URL must use HTTP or HTTPS.`);
    }
    const guideSteps = stepsByGuide.get(item.guideId) || new Map();
    guideSteps.set(item.id, item);
    stepsByGuide.set(item.guideId, guideSteps);
  }

  for (const [guideId, guideSteps] of stepsByGuide) {
    for (const item of guideSteps.values()) {
      if (item.parentId && !guideSteps.has(item.parentId)) {
        throw new Error(`Step ${item.id} references missing parent ${item.parentId} in Guide ${guideId}.`);
      }
      const visited = new Set([item.id]);
      let parentId = item.parentId;
      while (parentId) {
        if (visited.has(parentId)) throw new Error(`Guide ${guideId} contains a parent cycle at step ${item.id}.`);
        visited.add(parentId);
        parentId = guideSteps.get(parentId)?.parentId || "";
      }
    }
  }
}

async function readExistingSnapshot() {
  try {
    const value = JSON.parse(await readFile(OUTPUT_PATH, "utf8"));
    return value?.schemaVersion === 2 ? value : null;
  } catch {
    return null;
  }
}

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

function clean(value) {
  return String(value ?? "").trim();
}

function parseBoolean(value, label) {
  const normalized = clean(value).toLowerCase();
  if (["true", "yes", "1"].includes(normalized)) return true;
  if (["false", "no", "0"].includes(normalized)) return false;
  throw new Error(`${label} must be TRUE or FALSE.`);
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
