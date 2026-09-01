const EXCLUSION_TYPES = new Set([
  "manufacturer", "product_line", "scale", "release_category",
  "release_series", "year", "catalog_category", "catalog_category_year", "collectible",
]);
// Keep each exclusion lookup separate so SQLite can use the unique
// (exclusion_type, exclusion_value) index. A single EXISTS containing ORs made
// D1 repeatedly scan the exclusions table while building catalog views.
const EXCLUDED_SQL = `(
  EXISTS (SELECT 1 FROM collection_exclusions ex WHERE ex.exclusion_type = 'collectible' AND ex.exclusion_value = c.id) OR
  EXISTS (SELECT 1 FROM collection_exclusions ex WHERE ex.exclusion_type = 'manufacturer' AND ex.exclusion_value = m.slug) OR
  EXISTS (SELECT 1 FROM collection_exclusions ex WHERE ex.exclusion_type = 'product_line' AND ex.exclusion_value = pl.slug) OR
  EXISTS (SELECT 1 FROM collection_exclusions ex WHERE ex.exclusion_type = 'scale' AND ex.exclusion_value = c.scale) OR
  EXISTS (SELECT 1 FROM collection_exclusions ex WHERE ex.exclusion_type = 'release_category' AND ex.exclusion_value = c.release_category) OR
  EXISTS (SELECT 1 FROM collection_exclusions ex WHERE ex.exclusion_type = 'release_series' AND ex.exclusion_value = c.release_series) OR
  EXISTS (SELECT 1 FROM collection_exclusions ex WHERE ex.exclusion_type = 'year' AND ex.exclusion_value = CAST(c.year AS TEXT)) OR
  EXISTS (
    SELECT 1 FROM collectible_categories eycc
    JOIN catalog_categories eycat ON eycat.id = eycc.category_id
    JOIN collection_exclusions ex ON ex.exclusion_type = 'catalog_category_year'
      AND ex.exclusion_value = eycat.slug || ':' || CAST(c.year AS TEXT)
    WHERE eycc.collectible_id = c.id
  ) OR
  EXISTS (
    SELECT 1 FROM collectible_categories ecc
    JOIN catalog_categories ecat ON ecat.id = ecc.category_id
    JOIN collection_exclusions ex ON ex.exclusion_type = 'catalog_category'
      AND ex.exclusion_value = ecat.slug
    WHERE ecc.collectible_id = c.id
  )
)`;
const NORMAL_CHECKLIST_SQL = `EXISTS (
  SELECT 1 FROM collectible_categories ncc
  JOIN catalog_categories ncat ON ncat.id = ncc.category_id
  WHERE ncc.collectible_id = c.id AND ncat.checklist_mode = 'normal'
)`;
const SCOPED_SORTS = {
  source: "source_sort_order ASC, name COLLATE NOCASE ASC",
  year_asc: "year ASC, name COLLATE NOCASE ASC",
  year_desc: "year DESC, name COLLATE NOCASE ASC",
  name_asc: "name COLLATE NOCASE ASC",
  name_desc: "name COLLATE NOCASE DESC",
  item_number: "item_number COLLATE NOCASE ASC, name COLLATE NOCASE ASC",
  manufacturer: "manufacturer COLLATE NOCASE ASC, year DESC, name COLLATE NOCASE ASC",
  recently_acquired: "acquired_at DESC, name COLLATE NOCASE ASC",
  recently_updated: "updated_at DESC, name COLLATE NOCASE ASC",
  owned_first: "CASE WHEN collection_status = 'owned' THEN 0 ELSE 1 END, name COLLATE NOCASE ASC",
  missing_first: "CASE WHEN collection_status = 'not_owned' THEN 0 ELSE 1 END, name COLLATE NOCASE ASC",
};

function scopedExclusionValue(scope) {
  if (scope === "excluded") return "1";
  if (scope === "all") return `CASE WHEN ${EXCLUDED_SQL} OR NOT ${NORMAL_CHECKLIST_SQL} THEN 1 ELSE 0 END`;
  return "0";
}

function mapStats(row) {
  const total = Number(row?.stats_total || 0);
  const owned = Number(row?.stats_owned || 0);
  return {
    total,
    owned,
    missing: Number(row?.stats_missing || 0),
    wanted: Number(row?.stats_wanted || 0),
    completionPercent: total ? Math.round((owned / total) * 10000) / 100 : 0,
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const cors = corsHeaders(origin, env);
    if (request.method === "OPTIONS") {
      return new Response(null, { status: allowedOrigin(origin, env) ? 204 : 403, headers: cors });
    }
    if (origin && !allowedOrigin(origin, env)) {
      return json({ ok: false, error: "Origin is not allowed." }, 403, cors);
    }

    try {
      const url = new URL(request.url);
      if (request.method === "GET" && url.pathname === "/health") {
        return json({ ok: true, service: "box-this-lap-collectibles" }, 200, cors, "public, max-age=60");
      }
      if (request.method === "GET" && url.pathname === "/api/collectibles") {
        return json({ ok: true, ...(await cachedCatalogResponse(env, url, () => listCollectibles(env, url.searchParams))) }, 200, cors);
      }
      if (request.method === "GET" && url.pathname === "/api/collectibles/filters") {
        return json({ ok: true, ...(await cachedCatalogResponse(env, url, () => listFilters(env))) }, 200, cors, "public, max-age=900");
      }
      if (request.method === "GET" && url.pathname === "/api/collectibles/groups") {
        return json({ ok: true, ...(await cachedCatalogResponse(env, url, () => listGroups(env, url.searchParams))) }, 200, cors);
      }
      if (request.method === "GET" && url.pathname === "/api/collectibles/stats") {
        return json({ ok: true, ...(await cachedCatalogResponse(env, url, () => readStats(env, url.searchParams))) }, 200, cors);
      }
      if (request.method === "GET" && url.pathname === "/api/collection/exclusions") {
        await requireAdmin(request, env);
        return json({ ok: true, exclusions: await listExclusions(env) }, 200, cors);
      }
      if (request.method === "GET" && url.pathname === "/api/collection/state") {
        await requireAdmin(request, env);
        return json({ ok: true, ...(await readCollectionState(env)) }, 200, cors);
      }
      if (request.method === "POST" && url.pathname === "/api/collection/exclusions") {
        await requireAdmin(request, env);
        const exclusion = await addExclusion(env, await readBody(request));
        await patchCollectionStateCache(env, (state) => { state.exclusions = [...state.exclusions.filter((entry) => entry.id !== exclusion.id), exclusion]; });
        return json({ ok: true, exclusion }, 201, cors);
      }

      const detailMatch = url.pathname.match(/^\/api\/collectibles\/([^/]+)$/);
      if (request.method === "GET" && detailMatch) {
        return json({ ok: true, collectible: await readCollectible(env, decodeURIComponent(detailMatch[1])) }, 200, cors);
      }
      const collectionMatch = url.pathname.match(/^\/api\/collection\/([^/]+)$/);
      if (request.method === "PATCH" && collectionMatch) {
        await requireAdmin(request, env);
        const collectibleId = decodeURIComponent(collectionMatch[1]);
        const collection = await saveCollection(env, collectibleId, await readBody(request));
        await patchCollectionStateCache(env, (state) => { state.items = [...state.items.filter((entry) => entry.collectibleId !== collectibleId), { collectibleId, ...collection }]; });
        return json({ ok: true, collection }, 200, cors);
      }
      const exclusionMatch = url.pathname.match(/^\/api\/collection\/exclusions\/(\d+)$/);
      if (request.method === "DELETE" && exclusionMatch) {
        await requireAdmin(request, env);
        const exclusionId = Number(exclusionMatch[1]);
        await deleteExclusion(env, exclusionId);
        await patchCollectionStateCache(env, (state) => { state.exclusions = state.exclusions.filter((entry) => Number(entry.id) !== exclusionId); });
        return json({ ok: true }, 200, cors);
      }
      return json({ ok: false, error: "Not found." }, 404, cors);
    } catch (error) {
      const status = Number(error?.status) || 500;
      if (status >= 500) console.error(error);
      return json({ ok: false, error: status >= 500 ? "Collectibles data is unavailable." : error.message }, status, cors);
    }
  },
};

async function cachedCatalogResponse(env, url, load) {
  if (!env.CACHE) return load();
  const digest = await sha256(`${url.pathname}?${url.searchParams.toString()}`);
  const key = `catalog:${digest}`;
  let cached = null;
  try {
    cached = await env.CACHE.get(key, "json");
    if (cached?.value && Date.now() - Date.parse(cached.savedAt) < 300000) return cached.value;
  } catch (error) {
    console.warn(JSON.stringify({ event: "collectibles_catalog_cache_read_failed", error: String(error) }));
  }
  try {
    const value = await load();
    await env.CACHE.put(key, JSON.stringify({ savedAt: new Date().toISOString(), value }));
    return value;
  } catch (error) {
    if (cached?.value) return { ...cached.value, stale: true };
    throw error;
  }
}

async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function listCollectibles(env, searchParams) {
  const page = positiveInteger(searchParams.get("page"), 1);
  const limit = Math.min(100, positiveInteger(searchParams.get("limit"), 50));
  const { joins, where, params, scope } = buildScope(searchParams);
  const base = `FROM collectibles c
    JOIN manufacturers m ON m.id = c.manufacturer_id
    LEFT JOIN product_lines pl ON pl.id = c.product_line_id
    LEFT JOIN collection_items ci ON ci.collectible_id = c.id
    ${joins.join("\n")}
    WHERE ${where.join(" AND ")}`;
  const exclusionValue = scopedExclusionValue(scope);
  const sort = SCOPED_SORTS[searchParams.get("sort")] || SCOPED_SORTS.source;
  const result = await env.DB.prepare(`
    WITH scoped AS (
      SELECT DISTINCT c.id, c.name, c.item_number, c.year, c.scale, c.release_category,
        c.release_series, c.mix_name, c.primary_image_url, c.source_url, c.source_sort_order,
        c.is_special_release, c.is_store_exclusive, c.is_event_exclusive,
        m.slug AS manufacturer_slug, m.name AS manufacturer,
        pl.slug AS product_line_slug, pl.name AS product_line,
        COALESCE(ci.status, 'not_owned') AS collection_status,
        COALESCE(ci.quantity, 0) AS quantity, COALESCE(ci.wanted, 0) AS wanted,
        ci.acquired_at, ci.notes, ci.updated_at,
        ${exclusionValue} AS is_excluded,
        (SELECT ex.id FROM collection_exclusions ex WHERE ex.exclusion_type = 'collectible' AND ex.exclusion_value = c.id LIMIT 1) AS item_exclusion_id
      ${base}
    )
    SELECT scoped.*,
      (SELECT COUNT(*) FROM scoped) AS stats_total,
      (SELECT COUNT(*) FROM scoped WHERE collection_status = 'owned') AS stats_owned,
      (SELECT COUNT(*) FROM scoped WHERE collection_status = 'not_owned') AS stats_missing,
      (SELECT COUNT(*) FROM scoped WHERE wanted = 1) AS stats_wanted
    FROM scoped
    ORDER BY ${sort}
    LIMIT ? OFFSET ?
  `).bind(...params, limit, (page - 1) * limit).all();
  const rows = result.results || [];
  const total = Number(rows[0]?.stats_total || 0);
  return {
    items: rows.map(mapCard),
    pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
    stats: mapStats(rows[0]),
  };
}

function buildScope(searchParams) {
  const joins = [];
  const where = ["m.active = 1"];
  const params = [];
  const filters = [
    ["manufacturer", "m.slug"], ["productLine", "pl.slug"],
    ["scale", "c.scale"], ["releaseCategory", "c.release_category"],
    ["series", "c.release_series"], ["mix", "c.mix_name"], ["itemNumber", "c.item_number"],
  ];
  for (const [key, column] of filters) {
    const value = cleanQuery(searchParams.get(key));
    if (value) { where.push(`${column} = ?`); params.push(value); }
  }
  const year = cleanQuery(searchParams.get("year"));
  if (year === "unknown") where.push("c.year IS NULL");
  else if (year) { where.push("c.year = ?"); params.push(year); }
  const category = cleanQuery(searchParams.get("category"));
  if (category) {
    joins.push("JOIN collectible_categories selected_cc ON selected_cc.collectible_id = c.id JOIN catalog_categories selected_cat ON selected_cat.id = selected_cc.category_id");
    where.push("selected_cat.slug = ?");
    params.push(category);
  }
  const status = cleanQuery(searchParams.get("status"));
  if (status === "owned") where.push("ci.status = 'owned'");
  if (status === "unreviewed") where.push("ci.collectible_id IS NULL");
  if (["not_owned", "missing"].includes(status)) where.push("COALESCE(ci.status, 'not_owned') = 'not_owned'");
  if (status === "wanted" || booleanQuery(searchParams.get("wanted"))) where.push("COALESCE(ci.wanted, 0) = 1");
  for (const [key, column] of [["special", "c.is_special_release"], ["storeExclusive", "c.is_store_exclusive"], ["eventExclusive", "c.is_event_exclusive"]]) {
    if (searchParams.has(key)) { where.push(`${column} = ?`); params.push(booleanQuery(searchParams.get(key)) ? 1 : 0); }
  }
  const search = cleanQuery(searchParams.get("search"));
  if (search) {
    const like = `%${search.toLowerCase()}%`;
    where.push(`(LOWER(c.name) LIKE ? OR LOWER(COALESCE(c.normalized_name, '')) LIKE ? OR LOWER(COALESCE(c.item_number, '')) LIKE ? OR LOWER(COALESCE(c.release_series, '')) LIKE ? OR EXISTS (SELECT 1 FROM collectible_variants cv WHERE cv.collectible_id = c.id AND LOWER(cv.source_name) LIKE ?))`);
    params.push(like, like, like, like, like);
  }
  const requestedScope = cleanQuery(searchParams.get("scope"));
  const scope = requestedScope || (booleanQuery(searchParams.get("includeExcluded")) ? "all" : "active");
  if (scope === "excluded") where.push(`(${EXCLUDED_SQL} OR NOT ${NORMAL_CHECKLIST_SQL})`);
  else if (scope !== "all") where.push(`NOT (${EXCLUDED_SQL}) AND ${NORMAL_CHECKLIST_SQL}`);
  return { joins, where, params, scope };
}

async function listGroups(env, searchParams) {
  const groupBy = cleanQuery(searchParams.get("groupBy"));
  if (!new Set(["category", "year"]).has(groupBy)) throw httpError(400, "Group must be category or year.");
  const { joins, where, params, scope } = buildScope(searchParams);
  const base = `FROM collectibles c
    JOIN manufacturers m ON m.id = c.manufacturer_id
    LEFT JOIN product_lines pl ON pl.id = c.product_line_id
    LEFT JOIN collection_items ci ON ci.collectible_id = c.id
    ${joins.join("\n")}
    WHERE ${where.join(" AND ")}`;
  const exclusionValue = scopedExclusionValue(scope);
  const countColumns = `COUNT(DISTINCT s.id) AS total,
    COUNT(DISTINCT CASE WHEN s.collection_status = 'owned' THEN s.id END) AS owned,
    COUNT(DISTINCT CASE WHEN s.collection_status = 'not_owned' THEN s.id END) AS missing,
    COUNT(DISTINCT CASE WHEN s.wanted = 1 THEN s.id END) AS wanted,
    COALESCE(MAX(CASE WHEN s.primary_image_url NOT LIKE '%TruckNeeded%' THEN NULLIF(s.primary_image_url, '') END), MAX(NULLIF(s.primary_image_url, ''))) AS image_url`;
  const common = `WITH scoped AS (
      SELECT DISTINCT c.id, c.year, c.primary_image_url,
        COALESCE(ci.status, 'not_owned') AS collection_status,
        COALESCE(ci.wanted, 0) AS wanted,
        ${exclusionValue} AS is_excluded
      ${base}
    ), summary AS (
      SELECT COUNT(*) AS stats_total,
        COUNT(CASE WHEN collection_status = 'owned' THEN 1 END) AS stats_owned,
        COUNT(CASE WHEN collection_status = 'not_owned' THEN 1 END) AS stats_missing,
        COUNT(CASE WHEN wanted = 1 THEN 1 END) AS stats_wanted
      FROM scoped
    )`;
  let sql;
  const bindings = [...params];
  if (groupBy === "category") {
    sql = `${common}, grouped AS (
      SELECT cat.slug AS group_key, cat.name AS label, cat.category_type AS group_type,
        cat.checklist_mode, ${countColumns},
        COUNT(DISTINCT CASE WHEN s.is_excluded = 1 THEN s.id END) AS excluded,
        (SELECT ex.id FROM collection_exclusions ex WHERE ex.exclusion_value = cat.slug AND ex.exclusion_type IN ('catalog_category', 'manufacturer') ORDER BY ex.exclusion_type = 'catalog_category' DESC LIMIT 1) AS exclusion_id,
        (SELECT ex.exclusion_type FROM collection_exclusions ex WHERE ex.exclusion_value = cat.slug AND ex.exclusion_type IN ('catalog_category', 'manufacturer') ORDER BY ex.exclusion_type = 'catalog_category' DESC LIMIT 1) AS exclusion_type,
        cat.source_sort_order
      FROM scoped s
      JOIN collectible_categories gcc ON gcc.collectible_id = s.id
      JOIN catalog_categories cat ON cat.id = gcc.category_id
      GROUP BY cat.id
    )
    SELECT grouped.*, summary.* FROM grouped CROSS JOIN summary
    ORDER BY grouped.source_sort_order, grouped.label COLLATE NOCASE`;
  } else {
    const category = cleanQuery(searchParams.get("category"));
    const exclusionId = category
      ? "(SELECT ex.id FROM collection_exclusions ex WHERE ex.exclusion_type = 'catalog_category_year' AND ex.exclusion_value = ? || ':' || CAST(s.year AS TEXT) LIMIT 1)"
      : "NULL";
    if (category) bindings.push(category);
    sql = `${common}, grouped AS (
      SELECT CAST(s.year AS TEXT) AS group_key,
        CAST(s.year AS TEXT) AS label, ${countColumns},
        COUNT(DISTINCT CASE WHEN s.is_excluded = 1 THEN s.id END) AS excluded,
        ${exclusionId} AS exclusion_id,
        CASE WHEN ${exclusionId} IS NOT NULL THEN 'catalog_category_year' ELSE NULL END AS exclusion_type
      FROM scoped s WHERE s.year IS NOT NULL
      GROUP BY s.year
    )
    SELECT grouped.*, summary.* FROM grouped CROSS JOIN summary
    ORDER BY CAST(grouped.group_key AS INTEGER) DESC`;
    if (category) bindings.push(category);
  }
  const result = await env.DB.prepare(sql).bind(...bindings).all();
  const rows = result.results || [];
  return {
    groupBy,
    groups: rows.map((row) => ({
      key: row.group_key,
      label: row.label,
      type: row.group_type || groupBy,
      checklistMode: row.checklist_mode || "normal",
      image: row.image_url || "",
      total: Number(row.total || 0),
      owned: Number(row.owned || 0),
      missing: Number(row.missing || 0),
      wanted: Number(row.wanted || 0),
      excluded: Number(row.excluded || 0),
      exclusionId: row.exclusion_id ? Number(row.exclusion_id) : null,
      exclusionType: row.exclusion_type || null,
    })),
    stats: mapStats(rows[0]),
  };
}

async function readStats(env, searchParams) {
  const { joins, where, params } = buildScope(searchParams);
  const row = await env.DB.prepare(`
    SELECT COUNT(DISTINCT c.id) AS total,
      COUNT(DISTINCT CASE WHEN ci.status = 'owned' THEN c.id END) AS owned,
      COUNT(DISTINCT CASE WHEN COALESCE(ci.status, 'not_owned') = 'not_owned' THEN c.id END) AS missing,
      COUNT(DISTINCT CASE WHEN ci.wanted = 1 THEN c.id END) AS wanted
    FROM collectibles c JOIN manufacturers m ON m.id = c.manufacturer_id
    LEFT JOIN product_lines pl ON pl.id = c.product_line_id
    LEFT JOIN collection_items ci ON ci.collectible_id = c.id
    ${joins.join("\n")} WHERE ${where.join(" AND ")}
  `).bind(...params).first();
  const total = Number(row?.total || 0);
  const owned = Number(row?.owned || 0);
  return { total, owned, missing: Number(row?.missing || 0), wanted: Number(row?.wanted || 0), completionPercent: total ? Math.round((owned / total) * 10000) / 100 : 0 };
}

async function listFilters(env) {
  const [manufacturers, productLines, years, scales, releaseCategories, series, mixes, categories] = await Promise.all([
    rows(env, "SELECT slug, name FROM manufacturers WHERE active = 1 ORDER BY name"),
    rows(env, "SELECT pl.slug, pl.name, m.slug AS manufacturer FROM product_lines pl JOIN manufacturers m ON m.id = pl.manufacturer_id ORDER BY pl.name"),
    values(env, "SELECT DISTINCT year AS value FROM collectibles WHERE year IS NOT NULL ORDER BY year DESC"),
    values(env, "SELECT DISTINCT scale AS value FROM collectibles WHERE scale IS NOT NULL AND scale != '' ORDER BY scale"),
    values(env, "SELECT DISTINCT release_category AS value FROM collectibles WHERE release_category IS NOT NULL AND release_category != '' ORDER BY release_category"),
    values(env, "SELECT DISTINCT release_series AS value FROM collectibles WHERE release_series IS NOT NULL AND release_series != '' ORDER BY release_series"),
    values(env, "SELECT DISTINCT mix_name AS value FROM collectibles WHERE mix_name IS NOT NULL AND mix_name != '' ORDER BY mix_name"),
    rows(env, "SELECT slug, name, category_type AS type, checklist_mode AS checklistMode, parent_id AS parentId FROM catalog_categories WHERE active = 1 ORDER BY source_sort_order, name"),
  ]);
  return { manufacturers, productLines, years, scales, releaseCategories, series, mixes, categories };
}

async function readCollectible(env, id) {
  const row = await env.DB.prepare(`
    SELECT c.*, m.slug AS manufacturer_slug, m.name AS manufacturer,
      pl.slug AS product_line_slug, pl.name AS product_line,
      COALESCE(ci.status, 'not_owned') AS collection_status,
      COALESCE(ci.quantity, 0) AS quantity, COALESCE(ci.wanted, 0) AS wanted,
      ci.acquired_at, ci.notes AS collection_notes, ci.updated_at,
      CASE WHEN ${EXCLUDED_SQL} OR NOT ${NORMAL_CHECKLIST_SQL} THEN 1 ELSE 0 END AS is_excluded,
      (SELECT ex.id FROM collection_exclusions ex WHERE ex.exclusion_type = 'collectible' AND ex.exclusion_value = c.id LIMIT 1) AS item_exclusion_id
    FROM collectibles c JOIN manufacturers m ON m.id = c.manufacturer_id
    LEFT JOIN product_lines pl ON pl.id = c.product_line_id
    LEFT JOIN collection_items ci ON ci.collectible_id = c.id WHERE c.id = ?
  `).bind(id).first();
  if (!row) throw httpError(404, "Collectible was not found.");
  const [variants, storedImages, categories, sourceDiscovery] = await Promise.all([
    rowsPrepared(env, "SELECT id, source_name AS sourceName, variant_name AS variantName, source_url AS sourceUrl, source_item_number AS sourceItemNumber, notes FROM collectible_variants WHERE collectible_id = ? ORDER BY source_name", id),
    rowsPrepared(env, "SELECT id, source_url AS sourceUrl, local_url AS localUrl, image_type AS imageType, sort_order AS sortOrder, is_primary AS isPrimary FROM collectible_images WHERE collectible_id = ? ORDER BY sort_order", id),
    rowsPrepared(env, "SELECT cat.slug, cat.name, cat.category_type AS type, cat.checklist_mode AS checklistMode FROM collectible_categories cc JOIN catalog_categories cat ON cat.id = cc.category_id WHERE cc.collectible_id = ? ORDER BY cat.source_sort_order", id),
    discoverSourceImages(row.source_url),
  ]);
  const validStoredImages = sourceDiscovery.images.length ? storedImages : (await Promise.all(storedImages.map(async (image) => await remoteImageExists(image.sourceUrl) ? image : null))).filter(Boolean);
  const sourceUrls = new Set(sourceDiscovery.images.map((image) => image.sourceUrl));
  const images = [...sourceDiscovery.images, ...validStoredImages.filter((image) => !sourceUrls.has(image.sourceUrl))];
  const mapped = mapCard(row);
  return { ...mapped, image: images[0]?.localUrl || images[0]?.sourceUrl || "", sourceUrl: sourceDiscovery.available ? mapped.sourceUrl : sourceIndexUrl(mapped.sourceUrl), normalizedName: row.normalized_name || "", releaseCategory: row.release_category || "", releaseSeries: row.release_series || "", mix: row.mix_name || "", sourceSite: row.source_site, categories, variants, images };
}

async function discoverSourceImages(sourceUrl) {
  let pageUrl;
  try { pageUrl = new URL(sourceUrl); } catch { return { available: false, images: [] }; }
  if (pageUrl.protocol !== "https:" || !/(^|\.)brianzpatton\.com$/i.test(pageUrl.hostname)) return { available: false, images: [] };
  try {
    const response = await fetch(pageUrl.href, { headers: { Accept: "text/html" }, cf: { cacheEverything: true, cacheTtl: 86400 } });
    if (!response.ok) return { available: false, images: [] };
    const html = await response.text();
    const images = [];
    const seen = new Set();
    const pattern = /<img\b[^>]*src=["']([^"']+)["'][^>]*>/gi;
    let match;
    while ((match = pattern.exec(html))) {
      let imageUrl;
      try { imageUrl = new URL(match[1].replace(/&amp;/gi, "&"), pageUrl).href; } catch { continue; }
      if (!/\.(?:jpe?g|png|webp)(?:$|\?)/i.test(imageUrl) || /(?:bar|logo|tread|\/SM-)/i.test(imageUrl) || seen.has(imageUrl)) continue;
      seen.add(imageUrl);
      images.push({ id: `source-${images.length + 1}`, sourceUrl: imageUrl, localUrl: "", imageType: "detail", sortOrder: images.length, isPrimary: images.length === 0 });
    }
    return { available: true, images };
  } catch { return { available: false, images: [] }; }
}

async function remoteImageExists(sourceUrl) {
  let url;
  try { url = new URL(sourceUrl); } catch { return false; }
  if (url.protocol !== "https:" || !/(^|\.)brianzpatton\.com$/i.test(url.hostname)) return false;
  try {
    const response = await fetch(url.href, { method: "HEAD", cf: { cacheEverything: true, cacheTtl: 86400 } });
    return response.ok && /^image\//i.test(response.headers.get("Content-Type") || "");
  } catch { return false; }
}

function sourceIndexUrl(sourceUrl) {
  try { return new URL("./index.html", sourceUrl).href; } catch { return sourceUrl || ""; }
}

async function saveCollection(env, collectibleId, body) {
  const exists = await env.DB.prepare("SELECT id FROM collectibles WHERE id = ?").bind(collectibleId).first();
  if (!exists) throw httpError(404, "Collectible was not found.");
  const current = await env.DB.prepare("SELECT * FROM collection_items WHERE collectible_id = ?").bind(collectibleId).first();
  const status = body.status === undefined ? current?.status || "not_owned" : cleanStatus(body.status);
  let quantity = body.quantity === undefined ? Number(current?.quantity || 0) : Number(body.quantity);
  if (!Number.isInteger(quantity) || quantity < 0 || quantity > 999) throw httpError(400, "Quantity must be from 0 through 999.");
  if (status === "owned" && quantity < 1) quantity = 1;
  if (status === "not_owned") quantity = 0;
  const wanted = body.wanted === undefined ? Boolean(current?.wanted) : Boolean(body.wanted);
  const acquiredAt = body.acquiredAt === undefined ? current?.acquired_at || null : cleanDate(body.acquiredAt);
  const notes = body.notes === undefined ? current?.notes || null : cleanText(body.notes, 4000) || null;
  await env.DB.prepare(`INSERT INTO collection_items (collectible_id, status, quantity, wanted, acquired_at, notes, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(collectible_id) DO UPDATE SET status = excluded.status, quantity = excluded.quantity,
      wanted = excluded.wanted, acquired_at = excluded.acquired_at, notes = excluded.notes, updated_at = CURRENT_TIMESTAMP`)
    .bind(collectibleId, status, quantity, Number(wanted), acquiredAt, notes).run();
  const saved = await env.DB.prepare("SELECT status, quantity, wanted, acquired_at, notes, updated_at FROM collection_items WHERE collectible_id = ?").bind(collectibleId).first();
  return { status: saved.status, quantity: Number(saved.quantity), wanted: Boolean(saved.wanted), acquiredAt: saved.acquired_at, notes: saved.notes, updatedAt: saved.updated_at };
}

async function listExclusions(env) {
  return rows(env, "SELECT id, exclusion_type AS type, exclusion_value AS value, note, created_at AS createdAt FROM collection_exclusions ORDER BY exclusion_type, exclusion_value");
}
async function readCollectionState(env, force = false) {
  if (!force && env.CACHE) {
    try {
      const cached = await env.CACHE.get("collection-state:v1", "json");
      if (cached?.items && cached?.exclusions) return cached;
    } catch (error) {
      console.warn(JSON.stringify({ event: "collectibles_state_cache_read_failed", error: String(error) }));
    }
  }
  const [itemsResult, exclusionsResult] = await Promise.all([
    env.DB.prepare(`SELECT collectible_id, status, quantity, wanted, acquired_at, notes, updated_at
      FROM collection_items ORDER BY collectible_id`).all(),
    env.DB.prepare(`SELECT id, exclusion_type AS type, exclusion_value AS value, note, created_at AS createdAt
      FROM collection_exclusions ORDER BY exclusion_type, exclusion_value`).all(),
  ]);
  console.log(JSON.stringify({
    event: "collectibles_d1_state_read",
    rowsRead: Number(itemsResult.meta?.rows_read || 0) + Number(exclusionsResult.meta?.rows_read || 0),
    rowsReturned: (itemsResult.results?.length || 0) + (exclusionsResult.results?.length || 0),
  }));
  const value = {
    items: (itemsResult.results || []).map((row) => ({
      collectibleId: row.collectible_id,
      status: row.status,
      quantity: Number(row.quantity || 0),
      wanted: Boolean(row.wanted),
      acquiredAt: row.acquired_at || null,
      notes: row.notes || null,
      updatedAt: row.updated_at || null,
    })),
    exclusions: exclusionsResult.results || [],
  };
  if (env.CACHE) {
    try { await env.CACHE.put("collection-state:v1", JSON.stringify(value)); }
    catch (error) { console.warn(JSON.stringify({ event: "collectibles_state_cache_write_failed", error: String(error) })); }
  }
  return value;
}
async function patchCollectionStateCache(env, update) {
  if (!env.CACHE) return;
  try {
    const state = await env.CACHE.get("collection-state:v1", "json");
    if (!state?.items || !state?.exclusions) return;
    update(state);
    await env.CACHE.put("collection-state:v1", JSON.stringify(state));
  } catch (error) {
    console.warn(JSON.stringify({ event: "collectibles_state_cache_patch_failed", error: String(error) }));
  }
}
async function addExclusion(env, body) {
  const type = cleanText(body.type, 40);
  const value = cleanText(body.value, 200);
  if (!EXCLUSION_TYPES.has(type)) throw httpError(400, "Exclusion type is not supported.");
  if (!value) throw httpError(400, "Exclusion value is required.");
  await env.DB.prepare("INSERT OR IGNORE INTO collection_exclusions (exclusion_type, exclusion_value, note) VALUES (?, ?, ?)").bind(type, value, cleanText(body.note, 500) || null).run();
  return env.DB.prepare("SELECT id, exclusion_type AS type, exclusion_value AS value, note, created_at AS createdAt FROM collection_exclusions WHERE exclusion_type = ? AND exclusion_value = ?").bind(type, value).first();
}
async function deleteExclusion(env, id) {
  if (!Number.isSafeInteger(id) || id < 1) throw httpError(400, "Exclusion ID is invalid.");
  await env.DB.prepare("DELETE FROM collection_exclusions WHERE id = ?").bind(id).run();
}

async function requireAdmin(request, env) {
  const authorization = request.headers.get("Authorization") || "";
  if (!authorization.startsWith("Bearer ")) throw httpError(401, "Sign in as an admin to update the collection.");
  if (!env.MANAGER_AUTH) throw new Error("Manager authorization is not configured.");
  const response = await env.MANAGER_AUTH.fetch("https://rankings.internal/api/auth/verify", { method: "POST", headers: { Accept: "application/json", Authorization: authorization } });
  const value = await response.json().catch(() => null);
  if (!response.ok || !value?.ok || !value.managerId) throw httpError(401, value?.error || "Manager authorization is invalid.");
  const managerId = String(value.managerId);
  const admins = new Set(String(env.ADMIN_MANAGER_IDS || "").split(",").map((entry) => entry.trim()).filter(Boolean));
  if (!admins.has(managerId)) throw httpError(403, "Only an admin can update the collection.");
  return managerId;
}

function mapCard(row) {
  return {
    id: row.id, name: row.name, itemNumber: row.item_number || "", year: row.year, scale: row.scale || "",
    manufacturer: { slug: row.manufacturer_slug, name: row.manufacturer },
    productLine: row.product_line ? { slug: row.product_line_slug, name: row.product_line } : null,
    releaseCategory: row.release_category || "", releaseSeries: row.release_series || "", mix: row.mix_name || "",
    image: row.primary_image_url || "", sourceUrl: row.source_url || "",
    special: Boolean(row.is_special_release), storeExclusive: Boolean(row.is_store_exclusive), eventExclusive: Boolean(row.is_event_exclusive),
    exclusion: { excluded: Boolean(row.is_excluded), itemExclusionId: row.item_exclusion_id ? Number(row.item_exclusion_id) : null },
    collection: { status: row.collection_status || "not_owned", quantity: Number(row.quantity || 0), wanted: Boolean(row.wanted), acquiredAt: row.acquired_at || null, notes: row.collection_notes ?? row.notes ?? null, updatedAt: row.updated_at || null },
  };
}
async function rows(env, sql) { const value = await env.DB.prepare(sql).all(); return value.results || []; }
async function rowsPrepared(env, sql, ...params) { const value = await env.DB.prepare(sql).bind(...params).all(); return value.results || []; }
async function values(env, sql) { return (await rows(env, sql)).map((row) => row.value); }
function cleanQuery(value) { return String(value || "").trim().slice(0, 300); }
function cleanText(value, max) { const text = String(value ?? "").trim(); if (text.length > max) throw httpError(400, "A value is too long."); return text; }
function cleanStatus(value) { if (!["owned", "not_owned"].includes(value)) throw httpError(400, "Status must be owned or not_owned."); return value; }
function cleanDate(value) { const text = String(value || "").trim(); if (!text) return null; if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(Date.parse(`${text}T00:00:00Z`))) throw httpError(400, "Acquired date is invalid."); return text; }
function booleanQuery(value) { return ["1", "true", "yes", "on"].includes(String(value || "").toLowerCase()); }
function positiveInteger(value, fallback) { const number = Number(value); return Number.isSafeInteger(number) && number > 0 ? number : fallback; }
async function readBody(request) { const body = await request.json().catch(() => null); if (!body || typeof body !== "object" || Array.isArray(body)) throw httpError(400, "A JSON object is required."); return body; }
function allowedOrigin(origin, env) { if (!origin) return true; return String(env.ALLOWED_ORIGINS || "").split(",").map((value) => value.trim()).filter(Boolean).includes(origin); }
function corsHeaders(origin, env) { const headers = { "Access-Control-Allow-Headers": "Authorization, Content-Type", "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS", "Content-Type": "application/json; charset=utf-8", Vary: "Origin" }; if (origin && allowedOrigin(origin, env)) headers["Access-Control-Allow-Origin"] = origin; return headers; }
function json(value, status, headers, cache = "no-store") { return new Response(JSON.stringify(value), { status, headers: { ...headers, "Cache-Control": cache } }); }
function httpError(status, message) { return Object.assign(new Error(message), { status }); }
