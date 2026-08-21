export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const cors = getCorsHeaders(origin, env);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors, status: isAllowedOrigin(origin, env) ? 204 : 403 });
    }

    if (origin && !isAllowedOrigin(origin, env)) {
      return json({ error: "Origin is not allowed.", ok: false }, 403, cors);
    }

    try {
      const url = new URL(request.url);
      if (request.method === "GET" && url.pathname === "/health") {
        return json({ ok: true, service: "box-this-lap-guides" }, 200, cors);
      }

      const progressMatch = url.pathname.match(/^\/api\/managers\/([^/]+)\/progress$/);
      if (request.method === "GET" && progressMatch) {
        const managerId = parseId(progressMatch[1], "manager ID");
        return json({ ok: true, progress: await listProgress(env, managerId) }, 200, cors);
      }

      const stepMatch = url.pathname.match(/^\/api\/managers\/([^/]+)\/guides\/([^/]+)\/steps\/([^/]+)$/);
      if (["PUT", "DELETE"].includes(request.method) && stepMatch) {
        const managerId = parseId(stepMatch[1], "manager ID");
        const guideId = parseId(stepMatch[2], "guide ID");
        const stepId = parseId(stepMatch[3], "step ID");
        const completed = request.method === "PUT";
        await setProgress(env, { completed, guideId, managerId, stepId });
        return json({ completed, guideId, managerId, ok: true, stepId }, 200, cors);
      }

      return json({ error: "Not found.", ok: false }, 404, cors);
    } catch (error) {
      const status = Number(error.status) || 500;
      if (status >= 500) console.error(error);
      return json({ error: status >= 500 ? "Guide progress could not be saved." : error.message, ok: false }, status, cors);
    }
  },
};

async function listProgress(env, managerId) {
  const result = await env.DB.prepare(`
    SELECT guide_id, step_id, updated_at
    FROM guide_progress
    WHERE manager_id = ?
    ORDER BY guide_id, step_id
  `).bind(managerId).all();

  return (result.results || []).map((row) => ({
    guideId: row.guide_id,
    stepId: row.step_id,
    updatedAt: row.updated_at,
  }));
}

async function setProgress(env, { completed, guideId, managerId, stepId }) {
  if (completed) {
    const result = await env.DB.prepare(`
      INSERT INTO guide_progress (manager_id, guide_id, step_id, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT (manager_id, guide_id, step_id)
      DO UPDATE SET updated_at = excluded.updated_at
    `).bind(managerId, guideId, stepId).run();
    if (!result.success) throw new Error("D1 did not confirm the guide progress write.");
    return;
  }

  const result = await env.DB.prepare(`
    DELETE FROM guide_progress
    WHERE manager_id = ? AND guide_id = ? AND step_id = ?
  `).bind(managerId, guideId, stepId).run();
  if (!result.success) throw new Error("D1 did not confirm the guide progress deletion.");
}

function parseId(value, label) {
  try {
    const decoded = decodeURIComponent(value || "").trim();
    if (!decoded || decoded.length > 120 || /[\/\u0000-\u001F\u007F]/.test(decoded)) {
      throw httpError(400, `Invalid ${label}.`);
    }
    return decoded;
  } catch (error) {
    if (error?.status === 400) throw error;
    throw httpError(400, `Invalid ${label}.`);
  }
}

function isAllowedOrigin(origin, env) {
  if (!origin) return true;
  return String(env.ALLOWED_ORIGINS || "").split(",").map((value) => value.trim()).includes(origin);
}

function getCorsHeaders(origin, env) {
  const headers = {
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, PUT, DELETE, OPTIONS",
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    Vary: "Origin",
  };
  if (origin && isAllowedOrigin(origin, env)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

function json(data, status, headers) {
  return new Response(JSON.stringify(data), { headers, status });
}

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}
