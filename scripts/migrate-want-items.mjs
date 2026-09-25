import { writeFile } from "node:fs/promises";
import process from "node:process";

const DEFAULT_SOURCE =
  "https://script.google.com/macros/s/AKfycby-gmghq1bBK7MakQQ4xjDxK5FbSdoIc9DZcu26bvupWpVo61meNizhcZ-goaLsx2Vn/exec";
const args = parseArgs(process.argv.slice(2));

if (args.verify) {
  await verifyMigration(args.source || DEFAULT_SOURCE, args.verify);
} else if (args.output) {
  const items = await loadLegacyItems(args.source || DEFAULT_SOURCE);
  await writeFile(args.output, buildImportSql(items), "utf8");
  console.log(
    `Wrote ${items.length} Want items to ${args.output} with their stable IDs.`,
  );
} else {
  throw new Error(
    "Use --output <path> to generate import SQL or --verify <Cloudflare endpoint> to compare data.",
  );
}

function parseArgs(values) {
  const parsed = {};
  for (let index = 0; index < values.length; index += 1) {
    const key = values[index];
    if (
      !["--output", "--source", "--verify"].includes(key) ||
      !values[index + 1]
    ) {
      throw new Error(`Unknown or incomplete argument: ${key}`);
    }
    parsed[key.slice(2)] = values[index + 1];
    index += 1;
  }
  return parsed;
}

async function loadLegacyItems(endpoint) {
  const url = new URL(endpoint);
  url.searchParams.set("action", "listWantItems");
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  const value = await response.json();
  if (!response.ok || !value?.ok || !Array.isArray(value.items)) {
    throw new Error(
      value?.error || `Legacy Want endpoint returned ${response.status}.`,
    );
  }
  return value.items.map(normalizeItem).filter((item) => item.id && item.name);
}

async function loadCloudflareItems(endpoint) {
  const url = new URL("api/want-items", `${endpoint.replace(/\/$/, "")}/`);
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  const value = await response.json();
  if (!response.ok || !value?.ok || !Array.isArray(value.items)) {
    throw new Error(
      value?.error || `Cloudflare Want endpoint returned ${response.status}.`,
    );
  }
  return value.items.map(normalizeItem).filter((item) => item.id && item.name);
}

async function verifyMigration(source, destination) {
  const [legacyItems, cloudflareItems] = await Promise.all([
    loadLegacyItems(source),
    loadCloudflareItems(destination),
  ]);
  const legacy = legacyItems.map(canonical).sort();
  const cloudflare = cloudflareItems.map(canonical).sort();
  if (JSON.stringify(legacy) !== JSON.stringify(cloudflare)) {
    throw new Error(
      `Want migration differs: legacy has ${legacy.length} rows and Cloudflare has ${cloudflare.length} rows.`,
    );
  }
  console.log(`Verified ${legacy.length} Want items with no differences.`);
}

function buildImportSql(items) {
  return (
    items
      .map(
        (item) => `INSERT INTO want_items (
  id, sort_order, name, price_cents, image_url, archived, completed, deleted,
  revision, updated_by
) VALUES (${Number(item.id)}, ${item.order}, ${sql(item.name)}, ${item.price === null ? "NULL" : Math.round(item.price * 100)}, ${sql(item.imageUrl)}, ${Number(item.archived)}, ${Number(item.completed)}, ${Number(item.deleted)}, 1, 'legacy-import');`,
      )
      .join("\n") + "\n"
  );
}

function normalizeItem(item) {
  const rawPrice = item?.price ?? item?.Price;
  const price =
    rawPrice === null || rawPrice === undefined || rawPrice === ""
      ? null
      : Number(rawPrice);
  return {
    archived: toBoolean(item?.archived ?? item?.Archived),
    completed: toBoolean(item?.completed ?? item?.Completed),
    deleted: toBoolean(item?.deleted ?? item?.IsDeleted),
    id: String(item?.id ?? item?.ID ?? "").trim(),
    imageUrl: String(item?.imageUrl ?? item?.["Image URL"] ?? "").trim(),
    name: String(item?.name ?? item?.Name ?? "").trim(),
    order: Math.max(1, Number(item?.order ?? item?.Order) || 1),
    price: Number.isFinite(price) && price >= 0 ? price : null,
  };
}

function toBoolean(value) {
  if (typeof value === "boolean") return value;
  return ["true", "yes", "y", "1", "checked"].includes(
    String(value || "")
      .trim()
      .toLowerCase(),
  );
}

function canonical(item) {
  return JSON.stringify(item);
}

function sql(value) {
  return `'${String(value ?? "").replaceAll("'", "''")}'`;
}
