import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { HOT_WHEELS_2001, SOURCE_HOME, parseCatalogIndex, parseHomepageCategories, parseHotWheels2001 } from "./brianzpatton.mjs";

const dryRun = process.argv.includes("--dry-run");
const snapshotOnly = process.argv.includes("--snapshot-only");
const token = process.env.CLOUDFLARE_API_TOKEN;
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const databaseId = process.env.D1_DATABASE_ID || "45c405ab-a0cd-442a-b135-b7ffe4b7d933";
if (!dryRun && !snapshotOnly && (!token || !accountId || !databaseId)) throw new Error("CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, and D1_DATABASE_ID are required.");

const overrides = JSON.parse(await readFile(new URL("./grouping-overrides.json", import.meta.url), "utf8"));
const startedAt = new Date().toISOString();
let runId;
let pagesProcessed = 0;

try {
  if (!dryRun && !snapshotOnly) runId = await insertRun();
  const catalog = await discoverCatalog();
  await writeCatalogSnapshot(catalog);
  if (dryRun) {
    console.log(JSON.stringify({ categories: catalog.categories.length, indexPages: catalog.pages.length, collectibles: catalog.collectibles.length, variants: catalog.collectibles.reduce((sum, item) => sum + item.variants.length, 0), sample: catalog.collectibles.slice(0, 5).map(({ name, year, scale, categorySlug, sourceUrl }) => ({ name, year, scale, categorySlug, sourceUrl })) }, null, 2));
  } else if (!snapshotOnly) {
    await importCatalog(catalog);
    await finishRun("success", catalog.collectibles);
    console.log(`Synced ${catalog.collectibles.length} collectibles across ${catalog.categories.length} catalog categories and ${pagesProcessed} source pages.`);
  } else {
    console.log(`Generated static catalog with ${catalog.collectibles.length} collectibles.`);
  }
} catch (error) {
  if (runId) await finishRun("failed", [], error).catch(() => {});
  throw error;
}

async function writeCatalogSnapshot(catalog) {
  const categoryBySlug = new Map(catalog.categories.map((category) => [category.slug, category]));
  const manufacturerNames = new Map([
    ["hot-wheels", "Hot Wheels"], ["spin-master", "Spin Master"],
    ["greenlight", "GreenLight"], ["other", "Other"],
  ]);
  const snapshot = {
    version: 1,
    updatedAt: startedAt,
    categories: catalog.categories.map((category) => ({
      slug: category.slug,
      name: category.name,
      type: category.type,
      checklistMode: category.checklistMode || "normal",
      sourceSortOrder: category.sourceSortOrder,
    })),
    items: catalog.collectibles.map((item) => ({
      id: item.id,
      itemNumber: item.itemNumber || "",
      name: item.name,
      normalizedName: item.normalizedName || "",
      year: item.year ?? null,
      scale: item.scale || "",
      releaseCategory: item.releaseCategory || "",
      releaseSeries: item.releaseSeries || "",
      mix: item.mix || "",
      manufacturer: { slug: item.manufacturerSlug || "other", name: manufacturerNames.get(item.manufacturerSlug) || "Other" },
      productLine: item.productLineSlug ? { slug: item.productLineSlug, name: item.productLineSlug === "monster-jam" ? "Monster Jam" : item.productLineSlug } : null,
      categories: [item.categorySlug].filter(Boolean),
      checklistMode: categoryBySlug.get(item.categorySlug)?.checklistMode || "normal",
      image: item.primaryImageUrl || "",
      sourceUrl: item.sourceUrl || "",
      sourceSortOrder: item.sourceSortOrder,
      variants: (item.variants || []).map((variant) => ({
        id: variant.id,
        sourceName: variant.sourceName,
        variantName: variant.variantName || "",
        sourceUrl: variant.sourceUrl || "",
        sourceItemNumber: variant.sourceItemNumber || "",
      })),
    })),
  };
  const target = new URL("../../data/collectibles-catalog.json", import.meta.url);
  await writeFile(target, `${JSON.stringify(snapshot)}\n`, "utf8");
}

async function discoverCatalog() {
  const homeHtml = await fetchText(SOURCE_HOME);
  pagesProcessed += 1;
  const categories = parseHomepageCategories(homeHtml);
  const queue = categories.map((category) => ({ url: category.sourceUrl, category }));
  const queued = new Set(queue.map((entry) => canonicalUrl(entry.url)));
  const visited = new Set();
  const pages = [{ url: SOURCE_HOME, html: homeHtml, categorySlug: null }];
  const items = new Map();
  let sourceSortOrder = 0;

  while (queue.length) {
    const batch = queue.splice(0, 8);
    const results = await Promise.all(batch.map(async (entry) => ({ ...entry, html: await fetchText(entry.url) })));
    for (const entry of results) {
      const pageUrl = canonicalUrl(entry.url);
      if (visited.has(pageUrl)) continue;
      visited.add(pageUrl);
      pagesProcessed += 1;
      pages.push({ url: pageUrl, html: entry.html, categorySlug: entry.category.slug });
      if (samePage(pageUrl, HOT_WHEELS_2001)) {
        for (const item of parseHotWheels2001(entry.html, overrides)) {
          Object.assign(item, { categorySlug: "hot-wheels", manufacturerSlug: "hot-wheels", productLineSlug: "monster-jam", sourceSortOrder: sourceSortOrder++ });
          items.set(item.id, item);
        }
        continue;
      }
      const parsed = parseCatalogIndex(entry.html, pageUrl, entry.category.slug);
      for (const item of parsed.cards) {
        item.sourceSortOrder = sourceSortOrder++;
        if (!items.has(item.id)) items.set(item.id, item);
      }
      for (const url of parsed.indexUrls) {
        const canonical = canonicalUrl(url);
        if (!queued.has(canonical) && !visited.has(canonical)) {
          queued.add(canonical);
          queue.push({ url: canonical, category: entry.category });
        }
      }
    }
  }
  return { categories, pages, collectibles: [...items.values()] };
}

async function importCatalog({ categories, pages, collectibles }) {
  const requiredCategories = [
    { slug: "hot-wheels", name: "Hot Wheels", type: "manufacturer", checklistMode: "normal", sourceUrl: new URL("HotWheels/", SOURCE_HOME).href, sourceSortOrder: 0 },
    { slug: "spin-master", name: "Spin Master", type: "manufacturer", checklistMode: "normal", sourceUrl: new URL("SpinMaster/", SOURCE_HOME).href, sourceSortOrder: 1 },
    { slug: "greenlight", name: "GreenLight", type: "manufacturer", checklistMode: "normal", sourceUrl: new URL("GreenLight/", SOURCE_HOME).href, sourceSortOrder: 2 },
  ];
  const mergedCategories = new Map([...requiredCategories, ...categories].map((category) => [category.slug, category]));
  await runStatements([
    ...[["hot-wheels", "Hot Wheels"], ["spin-master", "Spin Master"], ["greenlight", "GreenLight"], ["other", "Other"]]
      .map(([slug, name]) => statement("INSERT INTO manufacturers (slug, name, active) VALUES (?, ?, 1) ON CONFLICT(slug) DO UPDATE SET name = excluded.name, active = 1", [slug, name])),
    ...[...mergedCategories.values()].map((category) => statement(`INSERT INTO catalog_categories (slug, name, category_type, source_url, source_sort_order, active, checklist_mode)
      VALUES (?, ?, ?, ?, ?, 1, ?)
      ON CONFLICT(slug) DO UPDATE SET name = excluded.name, category_type = excluded.category_type,
        source_url = excluded.source_url, source_sort_order = excluded.source_sort_order, active = 1,
        checklist_mode = CASE WHEN catalog_categories.checklist_mode = 'normal' THEN excluded.checklist_mode ELSE catalog_categories.checklist_mode END`,
    [category.slug, category.name, category.type, category.sourceUrl, category.sourceSortOrder, category.checklistMode])),
  ]);

  const manufacturerIds = new Map((await queryRows("SELECT id, slug FROM manufacturers WHERE slug IN ('hot-wheels', 'spin-master', 'greenlight', 'other')")).map((row) => [row.slug, row.id]));
  const categoryIds = new Map((await queryRows("SELECT id, slug FROM catalog_categories")).map((row) => [row.slug, row.id]));
  await query("INSERT OR IGNORE INTO product_lines (manufacturer_id, slug, name) VALUES (?, 'monster-jam', 'Monster Jam')", [manufacturerIds.get("hot-wheels")]);
  const productLine = await queryOne("SELECT id FROM product_lines WHERE manufacturer_id = ? AND slug = 'monster-jam'", [manufacturerIds.get("hot-wheels")]);
  const now = new Date().toISOString();
  const itemStatements = [];

  for (const item of collectibles) {
    const manufacturerId = manufacturerIds.get(item.manufacturerSlug) || manufacturerIds.get("other");
    const productLineId = item.productLineSlug === "monster-jam" ? productLine?.id || null : null;
    itemStatements.push(statement(`INSERT INTO collectibles (id, manufacturer_id, product_line_id, year, scale, item_number, name,
      normalized_name, release_series, mix_name, source_url, source_site, primary_image_url, source_sort_order,
      first_seen_at, last_seen_at, last_imported_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'brianzpatton.com', ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET manufacturer_id = excluded.manufacturer_id, product_line_id = excluded.product_line_id,
        year = excluded.year, scale = excluded.scale, item_number = excluded.item_number, name = excluded.name,
        normalized_name = excluded.normalized_name, release_series = excluded.release_series, mix_name = excluded.mix_name,
        source_url = excluded.source_url, primary_image_url = excluded.primary_image_url,
        source_sort_order = excluded.source_sort_order, last_seen_at = excluded.last_seen_at, last_imported_at = excluded.last_imported_at`,
    [item.id, manufacturerId, productLineId, item.year, item.scale || null, item.itemNumber || null, item.name, item.normalizedName,
      item.releaseSeries || null, item.mix || null, item.sourceUrl, item.primaryImageUrl || null, item.sourceSortOrder, now, now, now]));
    const categoryId = categoryIds.get(item.categorySlug);
    if (categoryId) itemStatements.push(statement("INSERT OR IGNORE INTO collectible_categories (collectible_id, category_id) VALUES (?, ?)", [item.id, categoryId]));
    for (const variant of item.variants) itemStatements.push(statement(`INSERT INTO collectible_variants (id, collectible_id, source_name, variant_name, source_url,
      source_item_number, first_seen_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET source_name = excluded.source_name, variant_name = excluded.variant_name,
        source_url = excluded.source_url, source_item_number = excluded.source_item_number, last_seen_at = excluded.last_seen_at`,
    [variant.id, item.id, variant.sourceName, variant.variantName, variant.sourceUrl, variant.sourceItemNumber, now, now]));
    if (item.primaryImageUrl) {
      const imageId = `img_${createHash("sha256").update(`${item.id}|${item.primaryImageUrl}`).digest("hex").slice(0, 24)}`;
      itemStatements.push(statement(`INSERT INTO collectible_images (id, collectible_id, source_url, image_type, sort_order, is_primary)
        VALUES (?, ?, ?, 'thumbnail', 0, 1) ON CONFLICT(id) DO UPDATE SET is_primary = 1`, [imageId, item.id, item.primaryImageUrl]));
    }
  }
  await runStatements(itemStatements);
  await runStatements(pages.map((page) => statement(`INSERT INTO catalog_source_pages (url, category_id, content_hash, last_checked_at, last_changed_at, last_successful_import_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(url) DO UPDATE SET category_id = excluded.category_id,
      last_changed_at = CASE WHEN catalog_source_pages.content_hash != excluded.content_hash THEN CURRENT_TIMESTAMP ELSE catalog_source_pages.last_changed_at END,
      content_hash = excluded.content_hash, last_checked_at = CURRENT_TIMESTAMP, last_successful_import_at = CURRENT_TIMESTAMP`,
  [page.url, page.categorySlug ? categoryIds.get(page.categorySlug) || null : null, createHash("sha256").update(page.html).digest("hex")])));
}

async function insertRun() {
  await query("INSERT INTO catalog_import_runs (source_site, started_at, status) VALUES ('brianzpatton.com', ?, 'running')", [startedAt]);
  return (await queryOne("SELECT id FROM catalog_import_runs WHERE started_at = ? ORDER BY id DESC LIMIT 1", [startedAt])).id;
}
async function finishRun(status, collectibles, error) {
  await query(`UPDATE catalog_import_runs SET completed_at = CURRENT_TIMESTAMP, status = ?, pages_processed = ?,
    items_seen = ?, variants_added = ?, images_seen = ?, error_message = ? WHERE id = ?`,
  [status, pagesProcessed, collectibles.length, collectibles.reduce((sum, item) => sum + item.variants.length, 0), collectibles.filter((item) => item.primaryImageUrl).length,
    error ? String(error.message || error).slice(0, 2000) : null, runId]);
}

async function fetchText(url, attempt = 1) {
  try {
    const response = await fetch(url, { headers: { "User-Agent": "BoxThisLapCatalogSync/1.1 (+https://wyattjones-wnc.github.io/boxthislap/)" }, signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`${url} returned ${response.status}.`);
    return response.text();
  } catch (error) {
    if (attempt < 3) return fetchText(url, attempt + 1);
    throw error;
  }
}

function statement(sql, params = []) { return { sql, params }; }
async function runStatements(statements) { for (let index = 0; index < statements.length; index += 75) await queryBatch(statements.slice(index, index + 75)); }
async function queryBatch(statements) {
  if (!statements.length) return [];
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`, {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ batch: statements }),
  });
  const value = await response.json().catch(() => null);
  if (!response.ok || !value?.success || value.result?.some((result) => !result.success)) throw new Error(value?.errors?.[0]?.message || value?.result?.find((result) => !result.success)?.error || "Cloudflare D1 batch query failed.");
  return value.result || [];
}
async function query(sql, params = []) { return (await queryBatch([statement(sql, params)]))[0] || {}; }
async function queryRows(sql, params = []) { return (await query(sql, params)).results || []; }
async function queryOne(sql, params = []) { return (await queryRows(sql, params))[0] || null; }
function canonicalUrl(value) { const url = new URL(value); url.hash = ""; url.search = ""; if (url.pathname.endsWith("/")) url.pathname += "index.html"; return url.href; }
function samePage(left, right) { return canonicalUrl(left).toLowerCase() === canonicalUrl(right).toLowerCase(); }
