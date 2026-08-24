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
        return json({ ok: true, service: "box-this-lap-footy-notes" }, 200, cors);
      }

      if (request.method === "GET" && url.pathname === "/api/match-notes") {
        return json({ ok: true, notes: await listMatchNotes(env) }, 200, cors);
      }

      const noteMatch = url.pathname.match(/^\/api\/match-notes\/([^/]+)$/);

      if (request.method === "GET" && noteMatch) {
        const matchId = parseMatchId(noteMatch[1], { encoded: true });
        const note = await getMatchNote(env, matchId);
        return note
          ? json({ ok: true, note }, 200, cors)
          : json({ ok: false, error: "Match note was not found." }, 404, cors);
      }

      if (request.method === "PUT" && noteMatch) {
        const matchId = parseMatchId(noteMatch[1], { encoded: true });
        const managerId = await requireAdmin(request, env);
        const savedNote = await saveMatchNote(env, matchId, await readBody(request), managerId);
        return json({ ok: true, savedNote, status: "saved" }, 200, cors);
      }

      return json({ ok: false, error: "Not found." }, 404, cors);
    } catch (error) {
      const status = Number(error?.status) || 500;
      if (status >= 500) console.error(error);
      return json({
        ok: false,
        error: status >= 500 ? "Match note data could not be saved." : error.message,
      }, status, cors);
    }
  },
};

async function listMatchNotes(env) {
  const result = await env.DB.prepare(`
    SELECT match_id, home_score, away_score, follow_goal_assists,
      opponent_goal_assists, note, highlight_link, revision, updated_at
    FROM footy_match_notes
    ORDER BY match_id
  `).all();

  return (result.results || []).map(mapMatchNote);
}

async function getMatchNote(env, matchId) {
  const row = await env.DB.prepare(`
    SELECT match_id, home_score, away_score, follow_goal_assists,
      opponent_goal_assists, note, highlight_link, revision, updated_at
    FROM footy_match_notes
    WHERE match_id = ?
  `).bind(matchId).first();

  return row ? mapMatchNote(row) : null;
}

async function saveMatchNote(env, matchId, body, managerId) {
  const note = normalizeMatchNote({ ...body, matchId });
  const existing = await getMatchNote(env, matchId);
  const expectedRevision = Number(body.revision || 0);

  if (existing && expectedRevision !== existing.revision) {
    throw httpError(409, "This match note changed after it was opened. Reopen it and apply the edit again.");
  }

  const nextRevision = existing ? existing.revision + 1 : 1;
  const values = [
    note.matchId,
    nextRevision,
    note.homeScore,
    note.awayScore,
    JSON.stringify(note.followGoalAssists),
    JSON.stringify(note.opponentGoalAssists),
    note.note,
    note.highlightLink,
    managerId,
  ];

  try {
    const results = await env.DB.batch([
      env.DB.prepare(`
    INSERT INTO footy_match_notes (
      match_id, home_score, away_score, follow_goal_assists,
      opponent_goal_assists, note, highlight_link, revision, updated_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(match_id) DO UPDATE SET
      home_score = excluded.home_score,
      away_score = excluded.away_score,
      follow_goal_assists = excluded.follow_goal_assists,
      opponent_goal_assists = excluded.opponent_goal_assists,
      note = excluded.note,
      highlight_link = excluded.highlight_link,
      revision = excluded.revision,
      updated_at = CURRENT_TIMESTAMP,
      updated_by = excluded.updated_by
      `).bind(
        note.matchId,
        note.homeScore,
        note.awayScore,
        JSON.stringify(note.followGoalAssists),
        JSON.stringify(note.opponentGoalAssists),
        note.note,
        note.highlightLink,
        nextRevision,
        managerId,
      ),
      env.DB.prepare(`
        INSERT INTO footy_match_note_history (
          match_id, revision, home_score, away_score, follow_goal_assists,
          opponent_goal_assists, note, highlight_link, changed_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(...values),
    ]);

    if (results.some((result) => !result.success)) throw new Error("D1 did not confirm the match note write.");
  } catch (error) {
    if (/unique|constraint/i.test(String(error?.message || ""))) {
      throw httpError(409, "This match note changed while it was being saved. Reopen it and apply the edit again.");
    }
    throw error;
  }

  return getMatchNote(env, matchId);
}

async function requireAdmin(request, env) {
  const authorization = request.headers.get("Authorization") || "";
  if (!authorization.startsWith("Bearer ")) throw httpError(401, "Sign in as an admin to edit match notes.");
  if (!env.MANAGER_AUTH) throw new Error("Manager authorization is not configured.");
  const accessToken = authorization.slice(7);

  const response = await env.MANAGER_AUTH.fetch("https://rankings.internal/api/auth/verify", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ accessToken }),
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

  if (!adminIds.has(managerId)) throw httpError(403, "Only an admin can edit match notes.");
  return managerId;
}

function normalizeMatchNote(note) {
  return {
    matchId: parseMatchId(note.matchId),
    homeScore: cleanText(note.homeScore, 20, "Home score"),
    awayScore: cleanText(note.awayScore, 20, "Away score"),
    followGoalAssists: normalizeGoalAssists(note.followGoalAssists),
    opponentGoalAssists: normalizeGoalAssists(note.opponentGoalAssists),
    note: cleanText(note.note, 10000, "Note"),
    highlightLink: cleanHighlightLink(note.highlightLink),
  };
}

function normalizeGoalAssists(value) {
  if (!Array.isArray(value)) throw httpError(400, "Goal and assist entries must be a list.");
  if (value.length > 100) throw httpError(400, "Too many goal and assist entries.");

  return value.map((entry) => ({
    scorer: cleanText(entry?.scorer, 200, "Scorer"),
    assister: cleanText(entry?.assister, 200, "Assister"),
    penalty: Boolean(entry?.penalty),
    ...(String(entry?.minute ?? "").trim()
      ? { minute: cleanText(entry.minute, 20, "Minute") }
      : {}),
  }));
}

function cleanHighlightLink(value) {
  const link = cleanText(value, 2000, "Highlight link");
  if (!link) return "";

  let url;
  try {
    url = new URL(link);
  } catch {
    throw httpError(400, "Highlight link must be a valid URL.");
  }
  if (!["http:", "https:"].includes(url.protocol)) throw httpError(400, "Highlight link must use HTTP or HTTPS.");
  return link;
}

function cleanText(value, maxLength, label) {
  const text = String(value ?? "").trim();
  if (text.length > maxLength) throw httpError(400, `${label} is too long.`);
  return text;
}

function parseMatchId(value, { encoded = false } = {}) {
  let matchId = String(value || "");
  if (encoded) {
    try {
      matchId = decodeURIComponent(matchId);
    } catch {
      throw httpError(400, "Match ID is invalid.");
    }
  }
  matchId = matchId.trim();
  if (!matchId) throw httpError(400, "Match ID is required.");
  if (matchId.length > 200) throw httpError(400, "Match ID is too long.");
  return matchId;
}

function mapMatchNote(row) {
  return {
    matchId: String(row.match_id || ""),
    homeScore: String(row.home_score || ""),
    awayScore: String(row.away_score || ""),
    followGoalAssists: parseStoredList(row.follow_goal_assists),
    opponentGoalAssists: parseStoredList(row.opponent_goal_assists),
    note: String(row.note || ""),
    highlightLink: String(row.highlight_link || ""),
    revision: Number(row.revision || 0),
    updatedAt: String(row.updated_at || ""),
  };
}

function parseStoredList(value) {
  try {
    const parsed = JSON.parse(String(value || "[]"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function readBody(request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) throw httpError(400, "A JSON match note is required.");
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
    "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
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
