import { writeFile } from "node:fs/promises";
import process from "node:process";

const DEFAULT_SOURCE = "https://script.google.com/macros/s/AKfycby-gmghq1bBK7MakQQ4xjDxK5FbSdoIc9DZcu26bvupWpVo61meNizhcZ-goaLsx2Vn/exec";
const args = parseArgs(process.argv.slice(2));

if (args.verify) {
  await verifyMigration(args.source || DEFAULT_SOURCE, args.verify);
} else if (args.output) {
  const items = await loadLegacyItems(args.source || DEFAULT_SOURCE);
  await writeFile(args.output, buildImportSql(items), "utf8");
  console.log(`Wrote ${items.length} Next items to ${args.output} with sequential IDs.`);
} else {
  throw new Error("Use --output <path> to generate import SQL or --verify <Cloudflare endpoint> to compare data.");
}

function parseArgs(values) {
  const parsed = {};
  for (let index = 0; index < values.length; index += 1) {
    const key = values[index];
    if (!["--output", "--source", "--verify"].includes(key) || !values[index + 1]) {
      throw new Error(`Unknown or incomplete argument: ${key}`);
    }
    parsed[key.slice(2)] = values[index + 1];
    index += 1;
  }
  return parsed;
}

async function loadLegacyItems(endpoint) {
  const url = new URL(endpoint);
  url.searchParams.set("action", "listNextItems");
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  const value = await response.json();
  if (!response.ok || !value?.ok || !Array.isArray(value.items)) {
    throw new Error(value?.error || `Legacy Next endpoint returned ${response.status}.`);
  }
  return value.items.map(normalizeItem).filter((item) => item.thing && item.date);
}

async function loadCloudflareItems(endpoint) {
  const url = new URL("api/items", `${endpoint.replace(/\/$/, "")}/`);
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  const value = await response.json();
  if (!response.ok || !value?.ok || !Array.isArray(value.items)) {
    throw new Error(value?.error || `Cloudflare Next endpoint returned ${response.status}.`);
  }
  return value.items.map(normalizeItem).filter((item) => item.thing && item.date);
}

async function verifyMigration(source, destination) {
  const [legacyItems, cloudflareItems] = await Promise.all([
    loadLegacyItems(source),
    loadCloudflareItems(destination),
  ]);
  const legacy = legacyItems.map(canonical).sort();
  const cloudflare = cloudflareItems.map(canonical).sort();

  if (JSON.stringify(legacy) !== JSON.stringify(cloudflare)) {
    throw new Error(`Next migration differs: legacy has ${legacy.length} rows and Cloudflare has ${cloudflare.length} rows.`);
  }
  console.log(`Verified ${legacy.length} Next items with no differences.`);
}

function buildImportSql(items) {
  return items.map((item, index) => {
    const id = index + 1;
    const values = [
      sql(item.thing),
      sql(item.imageUrl),
      sql(item.date),
      sql(item.endDate),
      sql(item.time),
      item.priority,
      Number(item.completed),
      Number(item.nonAdmin),
    ].join(", ");

    return `INSERT INTO next_items (
  id, thing, image_url, start_date, end_date, time, priority, completed, non_admin,
  revision, updated_by
) VALUES (${id}, ${values}, 1, 'legacy-import');`;
  }).join("\n") + "\n";
}

function normalizeItem(item) {
  return {
    completed: toBoolean(item?.completed ?? item?.Completed),
    date: String(item?.date ?? item?.Date ?? "").trim(),
    endDate: String(item?.endDate ?? item?.["End Date"] ?? "").trim(),
    imageUrl: String(item?.imageUrl ?? item?.["Image URL"] ?? "").trim(),
    nonAdmin: toBoolean(item?.nonAdmin ?? item?.NonAdmin),
    priority: clampPriority(item?.priority ?? item?.priorityLevel ?? item?.["Priority Level"]),
    thing: String(item?.thing ?? item?.Thing ?? "").trim(),
    time: String(item?.time ?? item?.Time ?? "").trim(),
  };
}

function toBoolean(value) {
  if (typeof value === "boolean") return value;
  return ["true", "yes", "y", "1", "checked"].includes(String(value || "").trim().toLowerCase());
}

function clampPriority(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(10, Math.max(0, Math.round(number))) : 0;
}

function canonical(item) {
  return JSON.stringify(item);
}

function sql(value) {
  return `'${String(value ?? "").replaceAll("'", "''")}'`;
}
