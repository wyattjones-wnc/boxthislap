import assert from "node:assert/strict";
import test from "node:test";
import { buildCollectibleOptions, queryCollectibles } from "../../modules/collectiblesCatalog.js";

const catalog = {
  categories: [
    { slug: "main", name: "Main", checklistMode: "normal", sourceSortOrder: 1 },
    { slug: "reference", name: "Reference", checklistMode: "reference", sourceSortOrder: 2 },
  ],
  items: [
    { id: "a", name: "Alpha", normalizedName: "alpha", year: 2025, scale: "1:64", manufacturer: { slug: "maker", name: "Maker" }, categories: ["main"], sourceSortOrder: 1, variants: [] },
    { id: "b", name: "Beta", normalizedName: "beta", year: 2024, scale: "1:64", manufacturer: { slug: "maker", name: "Maker" }, categories: ["main"], sourceSortOrder: 2, variants: [] },
    { id: "c", name: "Reference", normalizedName: "reference", year: null, scale: "", manufacturer: { slug: "other", name: "Other" }, categories: ["reference"], sourceSortOrder: 3, variants: [] },
  ],
};
const overlay = {
  items: [{ collectibleId: "a", status: "owned", quantity: 1, wanted: false }],
  exclusions: [{ id: 9, type: "collectible", value: "b" }],
};

test("static catalog options are derived without D1", () => {
  const options = buildCollectibleOptions(catalog);
  assert.deepEqual(options.years, [2025, 2024]);
  assert.deepEqual(options.manufacturers.map((entry) => entry.slug), ["maker", "other"]);
});

test("collection overlay and exclusions are applied locally", () => {
  const active = queryCollectibles(catalog, overlay, { scope: "active", status: "", sort: "source", page: 1 });
  assert.deepEqual(active.items.map((item) => item.id), ["a"]);
  assert.equal(active.stats.owned, 1);

  const all = queryCollectibles(catalog, overlay, { scope: "all", status: "", sort: "source", page: 1 });
  assert.equal(all.pagination.total, 3);
  assert.equal(all.items.find((item) => item.id === "b").exclusion.itemExclusionId, 9);
});

test("groups and text filters are computed from the static snapshot", () => {
  const result = queryCollectibles(catalog, overlay, { scope: "all", search: "alpha", status: "", sort: "source", page: 1 }, { groupBy: "category" });
  assert.equal(result.groups.length, 1);
  assert.equal(result.groups[0].key, "main");
  assert.equal(result.groups[0].owned, 1);
});
