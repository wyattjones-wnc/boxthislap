import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { HOT_WHEELS_2001, SOURCE_HOME, parseDetailImages, parseHomepageCategories, parseHotWheels2001 } from "./brianzpatton.mjs";

const token = process.env.CLOUDFLARE_API_TOKEN;
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const databaseId = process.env.D1_DATABASE_ID || "45c405ab-a0cd-442a-b135-b7ffe4b7d933";
if (!token || !accountId || !databaseId) throw new Error("CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, and D1_DATABASE_ID are required.");
const overrides = JSON.parse(await readFile(new URL("./grouping-overrides.json", import.meta.url), "utf8"));
const startedAt = new Date().toISOString();
let runId;
let pagesProcessed = 0;

try {
  runId = await insertRun();
  const homeHtml = await fetchText(SOURCE_HOME);
  pagesProcessed += 1;
  const categories = parseHomepageCategories(homeHtml);
  await upsertCategories(categories);
  await savePageState(SOURCE_HOME, homeHtml, null);

  const indexHtml = await fetchText(HOT_WHEELS_2001);
  pagesProcessed += 1;
  const collectibles = parseHotWheels2001(indexHtml, overrides);
  await savePageState(HOT_WHEELS_2001, indexHtml, "hot-wheels");
  await upsertCollectibles(collectibles);
  await finishRun("success", collectibles);
  console.log(`Synced ${collectibles.length} canonical 2001 Hot Wheels collectibles across ${pagesProcessed} source pages.`);
} catch (error) {
  if (runId) await finishRun("failed", [], error).catch(() => {});
  throw error;
}

async function upsertCategories(categories) {
  const required = [
    { slug: "hot-wheels", name: "Hot Wheels", type: "manufacturer", checklistMode: "normal", sourceUrl: new URL("HotWheels/", SOURCE_HOME).href, sourceSortOrder: 0 },
    { slug: "spin-master", name: "Spin Master", type: "manufacturer", checklistMode: "normal", sourceUrl: new URL("SpinMaster/", SOURCE_HOME).href, sourceSortOrder: 1 },
    { slug: "greenlight", name: "GreenLight", type: "manufacturer", checklistMode: "normal", sourceUrl: new URL("Greenlight/", SOURCE_HOME).href, sourceSortOrder: 2 },
  ];
  const merged = new Map([...required, ...categories].map((category) => [category.slug, category]));
  for (const category of merged.values()) {
    await query(`INSERT INTO catalog_categories (slug, name, category_type, source_url, source_sort_order, active, checklist_mode)
      VALUES (?, ?, ?, ?, ?, 1, ?)
      ON CONFLICT(slug) DO UPDATE SET name = excluded.name, category_type = excluded.category_type,
        source_url = excluded.source_url, source_sort_order = excluded.source_sort_order, active = 1,
        checklist_mode = CASE WHEN catalog_categories.checklist_mode = 'normal' THEN excluded.checklist_mode ELSE catalog_categories.checklist_mode END`,
      [category.slug, category.name, category.type, category.sourceUrl, category.sourceSortOrder, category.checklistMode]);
  }
}

async function upsertCollectibles(collectibles) {
  const now = new Date().toISOString();
  const manufacturer = await queryOne("SELECT id FROM manufacturers WHERE slug = ?", ["hot-wheels"]);
  const category = await queryOne("SELECT id FROM catalog_categories WHERE slug = ?", ["hot-wheels"]);
  await query("INSERT OR IGNORE INTO product_lines (manufacturer_id, slug, name) VALUES (?, 'monster-jam', 'Monster Jam')", [manufacturer.id]);
  const productLine = await queryOne("SELECT id FROM product_lines WHERE manufacturer_id = ? AND slug = 'monster-jam'", [manufacturer.id]);

  for (const collectible of collectibles) {
    const detailHtml = collectible.sourceUrl !== HOT_WHEELS_2001 ? await fetchText(collectible.sourceUrl).catch(() => "") : "";
    if (detailHtml) pagesProcessed += 1;
    const detailImages = detailHtml ? parseDetailImages(detailHtml, collectible.sourceUrl) : [];
    const images = [...new Set([collectible.primaryImageUrl, ...detailImages].filter(Boolean))];
    await query(`INSERT INTO collectibles (id, manufacturer_id, product_line_id, year, scale, item_number, name,
      normalized_name, source_url, source_site, primary_image_url, source_sort_order,
      first_seen_at, last_seen_at, last_imported_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'brianzpatton.com', ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET item_number = excluded.item_number, name = excluded.name,
        normalized_name = excluded.normalized_name, source_url = excluded.source_url,
        primary_image_url = excluded.primary_image_url, source_sort_order = excluded.source_sort_order,
        last_seen_at = excluded.last_seen_at, last_imported_at = excluded.last_imported_at`,
      [collectible.id, manufacturer.id, productLine.id, collectible.year, collectible.scale, collectible.itemNumber,
        collectible.name, collectible.normalizedName, collectible.sourceUrl, collectible.primaryImageUrl,
        collectible.sourceSortOrder, now, now, now]);
    await query("INSERT OR IGNORE INTO collectible_categories (collectible_id, category_id) VALUES (?, ?)", [collectible.id, category.id]);
    for (const variant of collectible.variants) {
      await query(`INSERT INTO collectible_variants (id, collectible_id, source_name, variant_name, source_url,
        source_item_number, first_seen_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET source_name = excluded.source_name, variant_name = excluded.variant_name,
          source_url = excluded.source_url, source_item_number = excluded.source_item_number, last_seen_at = excluded.last_seen_at`,
        [variant.id, collectible.id, variant.sourceName, variant.variantName, variant.sourceUrl, variant.sourceItemNumber, now, now]);
    }
    for (let index = 0; index < images.length; index += 1) {
      const imageUrl = images[index];
      const imageId = `img_${createHash("sha256").update(`${collectible.id}|${imageUrl}`).digest("hex").slice(0, 24)}`;
      await query(`INSERT INTO collectible_images (id, collectible_id, source_url, image_type, sort_order, is_primary)
        VALUES (?, ?, ?, 'unknown', ?, ?) ON CONFLICT(id) DO UPDATE SET sort_order = excluded.sort_order, is_primary = excluded.is_primary`,
        [imageId, collectible.id, imageUrl, index, Number(index === 0)]);
    }
  }
}

async function savePageState(url, html, categorySlug) {
  const hash = createHash("sha256").update(html).digest("hex");
  let categoryId = null;
  if (categorySlug) categoryId = (await queryOne("SELECT id FROM catalog_categories WHERE slug = ?", [categorySlug]))?.id || null;
  const old = await queryOne("SELECT content_hash FROM catalog_source_pages WHERE url = ?", [url]);
  const changedAt = old?.content_hash === hash ? null : new Date().toISOString();
  await query(`INSERT INTO catalog_source_pages (url, category_id, content_hash, last_checked_at, last_changed_at, last_successful_import_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP, COALESCE(?, CURRENT_TIMESTAMP), CURRENT_TIMESTAMP)
    ON CONFLICT(url) DO UPDATE SET category_id = excluded.category_id, content_hash = excluded.content_hash,
      last_checked_at = CURRENT_TIMESTAMP, last_changed_at = COALESCE(?, catalog_source_pages.last_changed_at),
      last_successful_import_at = CURRENT_TIMESTAMP`, [url, categoryId, hash, changedAt, changedAt]);
}

async function insertRun() {
  await query("INSERT INTO catalog_import_runs (source_site, started_at, status) VALUES ('brianzpatton.com', ?, 'running')", [startedAt]);
  return (await queryOne("SELECT id FROM catalog_import_runs WHERE started_at = ? ORDER BY id DESC LIMIT 1", [startedAt])).id;
}
async function finishRun(status, collectibles, error) {
  await query(`UPDATE catalog_import_runs SET completed_at = CURRENT_TIMESTAMP, status = ?, pages_processed = ?,
    items_seen = ?, variants_added = ?, images_seen = ?, error_message = ? WHERE id = ?`,
    [status, pagesProcessed, collectibles.length, collectibles.reduce((sum, item) => sum + item.variants.length, 0),
      collectibles.filter((item) => item.primaryImageUrl).length, error ? String(error.message || error).slice(0, 2000) : null, runId]);
}
async function fetchText(url) { const response = await fetch(url, { headers: { "User-Agent": "BoxThisLapCatalogSync/1.0 (+https://wyattjones-wnc.github.io/boxthislap/)" } }); if (!response.ok) throw new Error(`${url} returned ${response.status}.`); return response.text(); }
async function query(sql, params = []) {
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`, {
    method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ sql, params }),
  });
  const value = await response.json().catch(() => null);
  if (!response.ok || !value?.success || value.result?.some((result) => !result.success)) throw new Error(value?.errors?.[0]?.message || "Cloudflare D1 query failed.");
  return value.result?.[0] || {};
}
async function queryOne(sql, params = []) { const result = await query(sql, params); return result.results?.[0] || null; }
