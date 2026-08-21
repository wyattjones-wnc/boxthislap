import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT = path.join(ROOT, "data", "rankings.json");
const MCU_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRTQZAN1znMdqJ3eaU_FUtq-UM2HeaOISqqGuTidCE0tCoc8TzA5brhbO-fccCKt-sBOk3pY3Zg0YVW/pub?single=true&output=csv&gid=1257157651";

const rows = await loadCsv(MCU_URL);
const items = rows.map((row) => ({
  id: clean(row.ID || row.Id || row.id),
  name: clean(row.Entry || row.Name || row.name),
  rank: positiveInteger(row.Rank),
}));
validate(items);
await validateAssetReferences(items);
items.sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name, undefined, { numeric: true }));

const previous = await readPrevious();
const unchanged = previous && JSON.stringify(previous.items) === JSON.stringify(items);
const snapshot = {
  schemaVersion: 1,
  generatedAt: unchanged ? previous.generatedAt : new Date().toISOString(),
  items,
};
await writeFile(OUTPUT, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
console.log(`${unchanged ? "Validated" : "Generated"} ${items.length} MCU ranking entries.`);

async function loadCsv(url) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const requestUrl = new URL(url);
      requestUrl.searchParams.set("refresh", `${Date.now()}-${attempt}`);
      const response = await fetch(requestUrl, { headers: { Accept: "text/csv" }, signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error(`MCU sheet returned ${response.status}.`);
      return parseCsv(await response.text());
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 500));
    }
  }
  throw new Error(`Unable to load MCU rankings: ${lastError?.message || "Unknown error."}`);
}

function validate(items) {
  if (!items.length) throw new Error("At least one MCU ranking entry is required.");
  const ids = new Set();
  const ranks = new Set();
  for (const item of items) {
    if (!item.id || !item.name || !item.rank) throw new Error(`Invalid MCU entry: ${JSON.stringify(item)}`);
    if (ids.has(item.id)) throw new Error(`Duplicate MCU ID: ${item.id}`);
    if (ranks.has(item.rank)) throw new Error(`Duplicate MCU rank: ${item.rank}`);
    ids.add(item.id);
    ranks.add(item.rank);
  }
}

async function validateAssetReferences(items) {
  const manifest = JSON.parse(await readFile(path.join(ROOT, "data", "ranking-assets.json"), "utf8"));
  const catalogIds = new Set(items.map((item) => item.id));
  for (const [itemId, references] of Object.entries(manifest?.mcu || {})) {
    if (!catalogIds.has(itemId)) throw new Error(`MCU asset manifest references unknown ID: ${itemId}`);
    if (!Array.isArray(references) || !references.length) throw new Error(`MCU asset manifest has no files for ID: ${itemId}`);
    for (const reference of references) {
      const relative = clean(reference).replaceAll("/", path.sep);
      const resolved = path.resolve(ROOT, relative);
      if (!relative || !resolved.startsWith(`${ROOT}${path.sep}`)) throw new Error(`Invalid MCU asset reference: ${reference}`);
      try { await access(resolved); } catch { throw new Error(`Missing MCU asset: ${reference}`); }
    }
  }
}

async function readPrevious() {
  try {
    const value = JSON.parse(await readFile(OUTPUT, "utf8"));
    return value?.schemaVersion === 1 ? value : null;
  } catch {
    return null;
  }
}

function parseCsv(text) {
  const matrix = [];
  let row = [], value = "", quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"' && quoted && text[index + 1] === '"') { value += '"'; index += 1; }
    else if (character === '"') quoted = !quoted;
    else if (character === "," && !quoted) { row.push(value); value = ""; }
    else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(value); if (row.some((cell) => cell !== "")) matrix.push(row); row = []; value = "";
    } else value += character;
  }
  row.push(value); if (row.some((cell) => cell !== "")) matrix.push(row);
  const headers = (matrix.shift() || []).map((header) => header.replace(/^\uFEFF/, "").trim());
  return matrix.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] || ""])));
}

function clean(value) { return String(value ?? "").trim(); }
function positiveInteger(value) { const number = Number(value); return Number.isInteger(number) && number > 0 ? number : 0; }
