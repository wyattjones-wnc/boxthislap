const VIEWS = new Set(["unseen", "all", "wishlist"]);
const TEAMS = new Set(["arsenal", "barcelona"]);
const CATEGORIES = new Set([
  "kits",
  "clothing",
  "footwear",
  "accessories",
  "gifts-collectibles",
  "home",
  "other",
]);

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const cors = corsHeaders(origin, env);
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: allowedOrigin(origin, env) ? 204 : 403,
        headers: cors,
      });
    }
    if (origin && !allowedOrigin(origin, env)) {
      return json({ ok: false, error: "Origin is not allowed." }, 403, cors);
    }
    try {
      const url = new URL(request.url);
      if (request.method === "GET" && url.pathname === "/health") {
        return json(
          { ok: true, service: "box-this-lap-merchandise" },
          200,
          cors,
        );
      }
      const { managerId } = await requireAdmin(request, env);
      if (request.method === "GET" && url.pathname === "/api/products") {
        return json(
          {
            ok: true,
            ...(await listProducts(env, managerId, url.searchParams)),
          },
          200,
          cors,
        );
      }
      const seenThroughMatch = url.pathname.match(
        /^\/api\/products\/([^/]+)\/seen-through$/,
      );
      if (request.method === "PUT" && seenThroughMatch) {
        const result = await markSeenThrough(
          env,
          managerId,
          decodeURIComponent(seenThroughMatch[1]),
          await readBody(request),
        );
        return json({ ok: true, ...result }, 200, cors);
      }
      const stateMatch = url.pathname.match(
        /^\/api\/products\/([^/]+)\/state$/,
      );
      if (request.method === "PATCH" && stateMatch) {
        const state = await saveState(
          env,
          managerId,
          decodeURIComponent(stateMatch[1]),
          await readBody(request),
        );
        return json({ ok: true, state }, 200, cors);
      }
      return json({ ok: false, error: "Not found." }, 404, cors);
    } catch (error) {
      const status = Number(error?.status) || 500;
      if (status >= 500) console.error(error);
      return json(
        {
          ok: false,
          error:
            status >= 500 ? "Merchandise data is unavailable." : error.message,
        },
        status,
        cors,
      );
    }
  },
};

export async function listProducts(env, managerId, searchParams) {
  const view = normalizedChoice(
    searchParams.get("view"),
    VIEWS,
    "unseen",
    "view",
  );
  const team = normalizedChoice(searchParams.get("team"), TEAMS, "", "team");
  const category = normalizedChoice(
    searchParams.get("category"),
    CATEGORIES,
    "",
    "category",
  );
  const page = positiveInteger(searchParams.get("page"), 1);
  const limit = Math.min(100, positiveInteger(searchParams.get("limit"), 48));
  const { where, params } = feedScope({ category, managerId, team, view });
  const result = await env.DB.prepare(
    `
    SELECT p.*, s.seen_at, s.wishlisted_at
    FROM merch_products p
    LEFT JOIN merch_manager_state s ON s.product_id = p.id AND s.manager_id = ?
    WHERE ${where.join(" AND ")}
    ORDER BY p.first_observed_at DESC, p.id ASC
    LIMIT ? OFFSET ?
  `,
  )
    .bind(managerId, ...params, limit + 1, (page - 1) * limit)
    .all();
  const rows = result.results || [];
  const hasMore = rows.length > limit;
  return {
    filters: { category, team },
    items: rows.slice(0, limit).map(mapProduct),
    pagination: { hasMore, page, limit },
    sources: await sourceHealth(env),
    view,
  };
}

function feedScope({ category, managerId, team, view }) {
  const where = [];
  const params = [];
  if (view === "wishlist") where.push("s.wishlisted_at IS NOT NULL");
  else where.push("p.in_scope = 1");
  if (view === "unseen") where.push("s.seen_at IS NULL");
  if (team) {
    where.push("p.team = ?");
    params.push(team);
  }
  if (category) {
    where.push("p.category = ?");
    params.push(category);
  }
  return { where, params, managerId };
}

async function sourceHealth(env) {
  const result = await env.DB.prepare(
    `
    SELECT source, status, finished_at, item_count, error_summary,
      (SELECT successful.finished_at FROM merch_scans successful
       WHERE successful.source = current.source AND successful.status = 'succeeded'
       ORDER BY successful.finished_at DESC LIMIT 1) AS last_successful_at,
      (SELECT successful.item_count FROM merch_scans successful
       WHERE successful.source = current.source AND successful.status = 'succeeded'
       ORDER BY successful.finished_at DESC LIMIT 1) AS healthy_item_count
    FROM merch_scans current
    WHERE finished_at = (
      SELECT MAX(candidate.finished_at) FROM merch_scans candidate
      WHERE candidate.source = current.source AND candidate.finished_at IS NOT NULL
    )
    ORDER BY source ASC
  `,
  ).all();
  const bySource = new Map(
    (result.results || []).map((row) => [row.source, row]),
  );
  return ["arsenal", "barcelona"].map((source) => {
    const row = bySource.get(source);
    const checkedAt = row?.last_successful_at
      ? String(row.last_successful_at)
      : null;
    return {
      checkedAt,
      error:
        row?.status === "succeeded"
          ? null
          : String(row?.error_summary || "No successful scan has completed."),
      itemCount: Number(row?.healthy_item_count || 0),
      source,
      stale:
        !checkedAt || Date.now() - Date.parse(checkedAt) > 48 * 60 * 60 * 1000,
      status: String(row?.status || "unavailable"),
    };
  });
}

export async function saveState(env, managerId, productId, body) {
  if (!("seen" in body) && !("wishlisted" in body))
    throw httpError(400, "Seen or wishlist state is required.");
  if (
    ("seen" in body && typeof body.seen !== "boolean") ||
    ("wishlisted" in body && typeof body.wishlisted !== "boolean")
  ) {
    throw httpError(400, "State values must be boolean.");
  }
  const product = await env.DB.prepare(
    "SELECT id FROM merch_products WHERE id = ?",
  )
    .bind(productId)
    .first();
  if (!product) throw httpError(404, "Product not found.");
  const current = await env.DB.prepare(
    `
    SELECT seen_at, wishlisted_at FROM merch_manager_state WHERE manager_id = ? AND product_id = ?
  `,
  )
    .bind(managerId, productId)
    .first();
  const now = new Date().toISOString();
  const seenAt =
    "seen" in body ? (body.seen ? now : null) : current?.seen_at || null;
  const wishlistedAt =
    "wishlisted" in body
      ? body.wishlisted
        ? now
        : null
      : current?.wishlisted_at || null;
  await env.DB.prepare(
    `
    INSERT INTO merch_manager_state (manager_id, product_id, seen_at, wishlisted_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(manager_id, product_id) DO UPDATE SET
      seen_at = excluded.seen_at, wishlisted_at = excluded.wishlisted_at, updated_at = excluded.updated_at
  `,
  )
    .bind(managerId, productId, seenAt, wishlistedAt, now)
    .run();
  return {
    seen: Boolean(seenAt),
    seenAt,
    wishlisted: Boolean(wishlistedAt),
    wishlistedAt,
  };
}

export async function markSeenThrough(env, managerId, productId, body) {
  const team = normalizedChoice(body.team, TEAMS, "", "team");
  const category = normalizedChoice(body.category, CATEGORIES, "", "category");
  if (String(body.sort || "newest") !== "newest")
    throw httpError(400, "Seen through requires newest-first sorting.");
  const filters = ["p.id = ?", "p.in_scope = 1", "s.seen_at IS NULL"];
  const bindings = [managerId, productId];
  if (team) {
    filters.push("p.team = ?");
    bindings.push(team);
  }
  if (category) {
    filters.push("p.category = ?");
    bindings.push(category);
  }
  const anchor = await env.DB.prepare(
    `
    SELECT p.id, p.first_observed_at
    FROM merch_products p
    LEFT JOIN merch_manager_state s ON s.product_id = p.id AND s.manager_id = ?
    WHERE ${filters.join(" AND ")}
  `,
  )
    .bind(...bindings)
    .first();
  if (!anchor)
    throw httpError(
      409,
      "That product is no longer in the current unseen feed.",
    );

  const targets = [
    "p.in_scope = 1",
    "s.seen_at IS NULL",
    "(p.first_observed_at > ? OR (p.first_observed_at = ? AND p.id <= ?))",
  ];
  const targetBindings = [
    managerId,
    anchor.first_observed_at,
    anchor.first_observed_at,
    anchor.id,
  ];
  if (team) {
    targets.push("p.team = ?");
    targetBindings.push(team);
  }
  if (category) {
    targets.push("p.category = ?");
    targetBindings.push(category);
  }
  const now = new Date().toISOString();
  const result = await env.DB.prepare(
    `
    INSERT INTO merch_manager_state (manager_id, product_id, seen_at, wishlisted_at, updated_at)
    SELECT ?, p.id, ?, s.wishlisted_at, ?
    FROM merch_products p
    LEFT JOIN merch_manager_state s ON s.product_id = p.id AND s.manager_id = ?
    WHERE ${targets.join(" AND ")}
    ON CONFLICT(manager_id, product_id) DO UPDATE SET
      seen_at = excluded.seen_at, updated_at = excluded.updated_at
  `,
  )
    .bind(managerId, now, now, ...targetBindings)
    .run();
  return { seen: Number(result.meta?.changes || 0) };
}

function mapProduct(row) {
  return {
    availability: row.availability,
    canonicalUrl: row.canonical_url,
    category: row.category,
    currency: row.currency,
    firstObservedAt: row.first_observed_at,
    id: row.id,
    imageUrl: row.image_url,
    inScope: Boolean(row.in_scope),
    newSince: row.new_since,
    priceMinor: row.price_minor === null ? null : Number(row.price_minor),
    seen: Boolean(row.seen_at),
    source: row.source,
    team: row.team,
    title: row.title,
    wishlisted: Boolean(row.wishlisted_at),
  };
}

async function requireAdmin(request, env) {
  const authorization = request.headers.get("Authorization") || "";
  if (!authorization.startsWith("Bearer "))
    throw httpError(401, "Sign in as an admin to browse merchandise.");
  if (!env.MANAGER_AUTH)
    throw new Error("Manager authorization is not configured.");
  const response = await env.MANAGER_AUTH.fetch(
    "https://rankings.internal/api/auth/verify",
    {
      method: "POST",
      headers: { Accept: "application/json", Authorization: authorization },
    },
  );
  const value = await response.json().catch(() => null);
  if (!response.ok || !value?.ok || !value.managerId)
    throw httpError(401, value?.error || "Manager authorization is invalid.");
  const managerId = String(value.managerId);
  const admins = new Set(
    String(env.ADMIN_MANAGER_IDS || "")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean),
  );
  if (!admins.has(managerId))
    throw httpError(403, "Only an admin can browse merchandise.");
  return { managerId };
}

function normalizedChoice(value, allowed, fallback, label) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (!normalized) return fallback;
  if (!allowed.has(normalized)) throw httpError(400, `Invalid ${label}.`);
  return normalized;
}
function positiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value || ""), 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}
async function readBody(request) {
  const value = await request.json().catch(() => null);
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw httpError(400, "A JSON object is required.");
  return value;
}
function allowedOrigin(origin, env) {
  return (
    !origin ||
    String(env.ALLOWED_ORIGINS || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .includes(origin)
  );
}
function corsHeaders(origin, env) {
  const headers = {
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "GET, PATCH, PUT, OPTIONS",
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    Vary: "Origin",
  };
  if (origin && allowedOrigin(origin, env))
    headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}
function json(value, status, headers) {
  return new Response(JSON.stringify(value), { status, headers });
}
function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}
