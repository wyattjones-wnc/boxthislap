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
        return json({ ok: true, service: "box-this-lap-next" }, 200, cors);
      }

      if (request.method === "GET" && url.pathname === "/api/items") {
        return json({ ok: true, items: await listItems(env) }, 200, cors);
      }

      if (request.method === "POST" && url.pathname === "/api/items") {
        const managerId = await requireAdmin(request, env);
        return json({ ok: true, item: await addItem(env, await readBody(request), managerId) }, 201, cors);
      }

      const itemMatch = url.pathname.match(/^\/api\/items\/(\d+)$/);

      if (request.method === "PATCH" && itemMatch) {
        const managerId = await requireAdmin(request, env);
        return json({
          ok: true,
          item: await updateItem(env, parseItemId(itemMatch[1]), await readBody(request), managerId),
        }, 200, cors);
      }

      return json({ ok: false, error: "Not found." }, 404, cors);
    } catch (error) {
      const status = Number(error?.status) || 500;
      if (status >= 500) console.error(error);
      return json({
        ok: false,
        error: status >= 500 ? "Next data could not be saved." : error.message,
      }, status, cors);
    }
  },
};

async function listItems(env) {
  const result = await env.DB.prepare(`
    SELECT id, thing, image_url, start_date, end_date, time, priority,
      completed, non_admin, revision, created_at, updated_at
    FROM next_items
    ORDER BY start_date, time, priority DESC, thing
  `).all();

  return (result.results || []).map(mapItem);
}

async function getItem(env, id) {
  const row = await env.DB.prepare(`
    SELECT id, thing, image_url, start_date, end_date, time, priority,
      completed, non_admin, revision, created_at, updated_at
    FROM next_items
    WHERE id = ?
  `).bind(id).first();

  return row ? mapItem(row) : null;
}

async function addItem(env, body, managerId) {
  const item = normalizeItem(body);
  const result = await env.DB.prepare(`
    INSERT INTO next_items (
      thing, image_url, start_date, end_date, time, priority,
      completed, non_admin, revision, updated_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
  `).bind(...itemValues(item), managerId).run();
  const id = Number(result.meta?.last_row_id);

  if (!result.success || !Number.isSafeInteger(id) || id < 1) {
    throw new Error("D1 did not return the new Next item ID.");
  }

  return getItem(env, id);
}

async function updateItem(env, id, body, managerId) {
  const existing = await getItem(env, id);
  if (!existing) throw httpError(404, "Next item was not found.");

  const expectedRevision = Number(body.revision || 0);
  if (!Number.isInteger(expectedRevision) || expectedRevision !== existing.revision) {
    throw httpError(409, "This Next item changed after it was opened. Reopen it and apply the edit again.");
  }

  const item = normalizeItem(body);
  const nextRevision = existing.revision + 1;
  const result = await env.DB.prepare(`
    UPDATE next_items SET
      thing = ?, image_url = ?, start_date = ?, end_date = ?, time = ?,
      priority = ?, completed = ?, non_admin = ?, revision = ?,
      updated_at = CURRENT_TIMESTAMP, updated_by = ?
    WHERE id = ? AND revision = ?
  `).bind(...itemValues(item), nextRevision, managerId, id, expectedRevision).run();

  if (!result.success) {
    throw new Error("D1 did not confirm the Next item write.");
  }

  const savedItem = await getItem(env, id);

  if (!savedItem || savedItem.revision !== nextRevision) {
    throw httpError(409, "This Next item changed while it was being saved. Reopen it and apply the edit again.");
  }

  return savedItem;
}

function itemValues(item) {
  return [
    item.thing,
    item.imageUrl,
    item.date,
    item.endDate,
    item.time,
    item.priority,
    Number(item.completed),
    Number(item.nonAdmin),
  ];
}

function normalizeItem(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw httpError(400, "A Next item is required.");
  }

  const date = cleanDate(body.date, "Date", true);
  const endDate = cleanDate(body.endDate, "End date", false);
  if (endDate && endDate < date) throw httpError(400, "End date cannot be before the start date.");

  const priority = Number(body.priority);
  if (!Number.isInteger(priority) || priority < 0 || priority > 10) {
    throw httpError(400, "Priority must be a whole number from 0 through 10.");
  }

  return {
    completed: Boolean(body.completed),
    date,
    endDate,
    imageUrl: cleanOptionalUrl(body.imageUrl),
    nonAdmin: Boolean(body.nonAdmin),
    priority,
    thing: cleanText(body.thing, 300, "Thing", true),
    time: cleanText(body.time, 30, "Time"),
  };
}

async function requireAdmin(request, env) {
  const authorization = request.headers.get("Authorization") || "";
  if (!authorization.startsWith("Bearer ")) throw httpError(401, "Sign in as an admin to edit Next items.");
  if (!env.MANAGER_AUTH) throw new Error("Manager authorization is not configured.");

  const response = await env.MANAGER_AUTH.fetch("https://rankings.internal/api/auth/verify", {
    method: "POST",
    headers: { Accept: "application/json", Authorization: authorization },
  });
  const value = await response.json().catch(() => null);

  if (!response.ok || !value?.ok || !value.managerId) {
    throw httpError(401, value?.error || "Manager authorization is invalid.");
  }

  const managerId = String(value.managerId);
  const adminIds = new Set(String(env.ADMIN_MANAGER_IDS || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean));

  if (!adminIds.has(managerId)) throw httpError(403, "Only an admin can edit Next items.");
  return managerId;
}

function cleanDate(value, label, required) {
  const date = String(value || "").trim();
  if (!date && !required) return "";
  const parsed = new Date(`${date}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    throw httpError(400, `${label} must be a valid date.`);
  }
  return date;
}

function cleanOptionalUrl(value) {
  const url = cleanText(value, 2048, "Image URL");
  if (!url) return "";
  let parsed;
  try { parsed = new URL(url); } catch { throw httpError(400, "Image URL must be a valid web URL."); }
  if (!["http:", "https:"].includes(parsed.protocol)) throw httpError(400, "Image URL must use HTTP or HTTPS.");
  return parsed.href;
}

function cleanText(value, maxLength, label, required = false) {
  const text = String(value ?? "").trim();
  if (required && !text) throw httpError(400, `${label} is required.`);
  if (text.length > maxLength) throw httpError(400, `${label} is too long.`);
  return text;
}

function parseItemId(value) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) throw httpError(400, "Next item ID is invalid.");
  return id;
}

function mapItem(row) {
  return {
    completed: Boolean(row.completed),
    createdAt: String(row.created_at || ""),
    date: String(row.start_date || ""),
    endDate: String(row.end_date || ""),
    id: String(row.id),
    imageUrl: String(row.image_url || ""),
    nonAdmin: Boolean(row.non_admin),
    priority: Number(row.priority || 0),
    revision: Number(row.revision || 0),
    thing: String(row.thing || ""),
    time: String(row.time || ""),
    updatedAt: String(row.updated_at || ""),
  };
}

async function readBody(request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) throw httpError(400, "A JSON Next item is required.");
  return body;
}

function allowedOrigin(origin, env) {
  if (!origin) return true;
  return String(env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .includes(origin);
}

function corsHeaders(origin, env) {
  const headers = {
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    Vary: "Origin",
  };
  if (origin && allowedOrigin(origin, env)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

function json(value, status, headers) {
  return new Response(JSON.stringify(value), { status, headers });
}

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}
