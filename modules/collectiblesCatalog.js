export function buildCollectibleOptions(catalog) {
  const items = catalog?.items || [];
  const unique = (values, sorter = (a, b) => String(a).localeCompare(String(b))) => [...new Set(values.filter((value) => value !== "" && value !== null && value !== undefined))].sort(sorter);
  return {
    manufacturers: unique(items.map((item) => item.manufacturer?.slug)).map((slug) => items.find((item) => item.manufacturer?.slug === slug)?.manufacturer).filter(Boolean),
    productLines: unique(items.map((item) => item.productLine?.slug)).map((slug) => items.find((item) => item.productLine?.slug === slug)?.productLine).filter(Boolean),
    years: unique(items.map((item) => item.year), (a, b) => Number(b) - Number(a)),
    scales: unique(items.map((item) => item.scale)),
    releaseCategories: unique(items.map((item) => item.releaseCategory)),
    series: unique(items.map((item) => item.releaseSeries)),
    mixes: unique(items.map((item) => item.mix)),
    categories: catalog?.categories || [],
  };
}

export function queryCollectibles(catalog, overlay, filters, { groupBy = "", limit = 48 } = {}) {
  const collectionById = new Map((overlay?.items || []).map((item) => [item.collectibleId, item]));
  const exclusions = overlay?.exclusions || [];
  const exclusionByKey = new Map(exclusions.map((entry) => [`${entry.type}:${entry.value}`, entry]));
  const categoryBySlug = new Map((catalog?.categories || []).map((entry) => [entry.slug, entry]));
  let items = (catalog?.items || []).map((item) => enrich(item, collectionById.get(item.id), exclusionByKey, categoryBySlug));
  items = items.filter((item) => matches(item, filters));
  const stats = summarize(items);
  if (groupBy) return { groupBy, groups: groupItems(items, groupBy, categoryBySlug, exclusionByKey), stats };
  items.sort(sorter(filters.sort));
  const page = Math.max(1, Number(filters.page) || 1);
  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(page, pages);
  return { items: items.slice((safePage - 1) * limit, safePage * limit), pagination: { page: safePage, limit, total, pages }, stats };
}

function enrich(item, stored, exclusions, categories) {
  const collection = stored || { status: "not_owned", quantity: 0, wanted: false, acquiredAt: null, notes: null, updatedAt: null };
  const direct = exclusions.get(`collectible:${item.id}`);
  const categoryEntries = (item.categories || []).map((slug) => categories.get(slug)).filter(Boolean);
  const excluded = Boolean(direct ||
    exclusions.get(`manufacturer:${item.manufacturer?.slug}`) ||
    exclusions.get(`product_line:${item.productLine?.slug}`) ||
    exclusions.get(`scale:${item.scale}`) ||
    exclusions.get(`release_category:${item.releaseCategory}`) ||
    exclusions.get(`release_series:${item.releaseSeries}`) ||
    exclusions.get(`year:${item.year}`) ||
    (item.categories || []).some((slug) => exclusions.has(`catalog_category:${slug}`) || exclusions.has(`catalog_category_year:${slug}:${item.year}`)) ||
    !categoryEntries.some((entry) => (entry.checklistMode || "normal") === "normal"));
  return {
    ...item,
    collection: { ...collection, reviewed: Boolean(stored), status: collection.status || "not_owned", quantity: Number(collection.quantity || 0), wanted: Boolean(collection.wanted) },
    exclusion: { excluded, itemExclusionId: direct ? Number(direct.id) : null },
  };
}

function matches(item, filters) {
  if (filters.scope === "excluded" && !item.exclusion.excluded) return false;
  if (filters.scope !== "all" && filters.scope !== "excluded" && item.exclusion.excluded) return false;
  if (filters.manufacturer && item.manufacturer?.slug !== filters.manufacturer) return false;
  if (filters.year === "unknown" && item.year !== null) return false;
  if (filters.year && filters.year !== "unknown" && String(item.year) !== String(filters.year)) return false;
  if (filters.scale && item.scale !== filters.scale) return false;
  if (filters.category && !(item.categories || []).includes(filters.category)) return false;
  if (filters.status === "owned" && item.collection.status !== "owned") return false;
  if (filters.status === "unreviewed" && item.collection.reviewed) return false;
  if (["not_owned", "missing"].includes(filters.status) && item.collection.status !== "not_owned") return false;
  if (filters.status === "wanted" && !item.collection.wanted) return false;
  if (filters.search) {
    const needle = String(filters.search).toLocaleLowerCase();
    const haystack = [item.name, item.normalizedName, item.itemNumber, item.releaseSeries, ...(item.variants || []).map((variant) => variant.sourceName)].join(" ").toLocaleLowerCase();
    if (!haystack.includes(needle)) return false;
  }
  return true;
}

function groupItems(items, groupBy, categories, exclusions) {
  const grouped = new Map();
  for (const item of items) {
    const keys = groupBy === "category" ? item.categories || [] : item.year === null ? [] : [String(item.year)];
    for (const key of keys) {
      const category = groupBy === "category" ? categories.get(key) : null;
      const current = grouped.get(key) || {
        key, label: category?.name || key, type: category?.type || groupBy,
        checklistMode: category?.checklistMode || "normal", image: "", total: 0, owned: 0, missing: 0, wanted: 0, excluded: 0,
        exclusionId: Number((groupBy === "category" ? exclusions.get(`catalog_category:${key}`) : exclusions.get(`catalog_category_year:${item.categories?.[0]}:${key}`))?.id || 0) || null,
        exclusionType: groupBy === "category" ? "catalog_category" : "catalog_category_year",
        sourceSortOrder: category?.sourceSortOrder ?? 99999,
      };
      current.total += 1;
      current.owned += item.collection.status === "owned" ? 1 : 0;
      current.missing += item.collection.status !== "owned" ? 1 : 0;
      current.wanted += item.collection.wanted ? 1 : 0;
      current.excluded += item.exclusion.excluded ? 1 : 0;
      if (!current.image || /TruckNeeded/i.test(current.image)) current.image = item.image || current.image;
      grouped.set(key, current);
    }
  }
  return [...grouped.values()].sort(groupBy === "category"
    ? (a, b) => a.sourceSortOrder - b.sourceSortOrder || a.label.localeCompare(b.label)
    : (a, b) => Number(b.key) - Number(a.key));
}

function summarize(items) {
  const total = items.length;
  const owned = items.filter((item) => item.collection.status === "owned").length;
  return { total, owned, missing: total - owned, wanted: items.filter((item) => item.collection.wanted).length, completionPercent: total ? Math.round((owned / total) * 10000) / 100 : 0 };
}

function sorter(sort) {
  const text = (value) => String(value || "").toLocaleLowerCase();
  const name = (a, b) => text(a.name).localeCompare(text(b.name));
  const sorts = {
    year_asc: (a, b) => Number(a.year || 0) - Number(b.year || 0) || name(a, b),
    year_desc: (a, b) => Number(b.year || 0) - Number(a.year || 0) || name(a, b),
    name_asc: name,
    name_desc: (a, b) => -name(a, b),
    item_number: (a, b) => text(a.itemNumber).localeCompare(text(b.itemNumber)) || name(a, b),
    manufacturer: (a, b) => text(a.manufacturer?.name).localeCompare(text(b.manufacturer?.name)) || Number(b.year || 0) - Number(a.year || 0) || name(a, b),
    recently_acquired: (a, b) => text(b.collection.acquiredAt).localeCompare(text(a.collection.acquiredAt)) || name(a, b),
    recently_updated: (a, b) => text(b.collection.updatedAt).localeCompare(text(a.collection.updatedAt)) || name(a, b),
    owned_first: (a, b) => Number(b.collection.status === "owned") - Number(a.collection.status === "owned") || name(a, b),
    missing_first: (a, b) => Number(b.collection.status === "not_owned") - Number(a.collection.status === "not_owned") || name(a, b),
  };
  return sorts[sort] || ((a, b) => Number(a.sourceSortOrder || 0) - Number(b.sourceSortOrder || 0) || name(a, b));
}
