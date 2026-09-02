import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { Miniflare } from "miniflare";
import { ensureStaticCatalogItem } from "../../workers/collectibles/src/index.js";

const root = fileURLToPath(new URL("../../", import.meta.url));
const workerPath = fileURLToPath(new URL("../../workers/collectibles/src/index.js", import.meta.url));
const schemaPath = fileURLToPath(new URL("../../workers/collectibles/migrations/1001_collectibles_initial.sql", import.meta.url));

test("collectibles list and group responses include progress without a second query", async (context) => {
  const worker = new Miniflare({
    bindings: { ALLOWED_ORIGINS: "http://localhost:8000" },
    compatibilityDate: "2026-08-08",
    d1Databases: { DB: "collectibles-test" },
    modules: true,
    rootPath: root,
    scriptPath: workerPath,
  });
  context.after(() => worker.dispose());

  const db = await worker.getD1Database("DB");
  await executeSql(db, await readFile(schemaPath, "utf8"));
  await executeSql(db, `
    INSERT INTO manufacturers (slug, name) VALUES ('other', 'Other');
    INSERT INTO catalog_categories (slug, name, category_type, source_sort_order, checklist_mode)
      VALUES ('active', 'Active', 'collection', 1, 'normal'),
             ('reference', 'Reference', 'collection', 2, 'reference_only');
    INSERT INTO collectibles
      (id, manufacturer_id, year, name, source_sort_order, first_seen_at, last_seen_at, last_imported_at)
      VALUES ('owned', 4, 2026, 'Owned truck', 1, '2026-01-01', '2026-01-01', '2026-01-01'),
             ('missing', 4, 2025, 'Missing truck', 2, '2026-01-01', '2026-01-01', '2026-01-01'),
             ('reference', 4, 2024, 'Reference truck', 3, '2026-01-01', '2026-01-01', '2026-01-01');
    INSERT INTO collectible_categories (collectible_id, category_id)
      VALUES ('owned', 1), ('missing', 1), ('reference', 2);
    INSERT INTO collection_items (collectible_id, status, quantity, wanted, updated_at)
      VALUES ('owned', 'owned', 1, 0, '2026-01-01'),
             ('missing', 'not_owned', 0, 1, '2026-01-01');
  `);

  const activeList = await getJson(worker, "/api/collectibles?scope=active&limit=48");
  assert.deepEqual(activeList.items.map((item) => item.id), ["owned", "missing"]);
  assert.deepEqual(activeList.stats, {
    completionPercent: 50,
    missing: 1,
    owned: 1,
    total: 2,
    wanted: 1,
  });

  const categoryGroups = await getJson(worker, "/api/collectibles/groups?groupBy=category&scope=active");
  assert.equal(categoryGroups.groups.length, 1);
  assert.equal(categoryGroups.groups[0].key, "active");
  assert.deepEqual(categoryGroups.stats, activeList.stats);

  const yearGroups = await getJson(worker, "/api/collectibles/groups?groupBy=year&category=active&scope=active");
  assert.deepEqual(yearGroups.groups.map((group) => group.key), ["2026", "2025"]);
  assert.deepEqual(yearGroups.stats, activeList.stats);

  const fullCatalog = await getJson(worker, "/api/collectibles?scope=all&limit=48");
  assert.equal(fullCatalog.stats.total, 3);
  assert.equal(fullCatalog.items.find((item) => item.id === "reference")?.exclusion.excluded, true);

  await ensureStaticCatalogItem({ DB: db }, "static-only-item", {
    name: "Static only truck",
    normalizedName: "static only truck",
    manufacturerSlug: "other",
    sourceSortOrder: 99,
    sourceUrl: "https://example.com/static-only",
  });
  const staticOnly = await db.prepare("SELECT name, source_site FROM collectibles WHERE id = 'static-only-item'").first();
  assert.deepEqual(staticOnly, { name: "Static only truck", source_site: "static-catalog" });

});

async function getJson(worker, path) {
  const response = await worker.dispatchFetch(`http://localhost:8787${path}`);
  const value = await response.json();
  assert.equal(response.status, 200, JSON.stringify(value));
  assert.equal(value.ok, true, JSON.stringify(value));
  return value;
}

async function executeSql(db, sql) {
  const statements = String(sql).replaceAll("\r", "").split(/;\s*(?:\n|$)/).map((value) => value.trim()).filter(Boolean);
  for (const statement of statements) await db.prepare(statement).run();
}
