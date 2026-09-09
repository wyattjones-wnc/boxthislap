import { exchangeAccessCodeForAuthTokens, exchangeNpssoForAccessCode } from "psn-api";
import { getPsnAuthStatus, savePsnNpsso } from "../psn/stored-auth.ts";
import { refreshPublicSnapshots, refreshPublicStatusSnapshot } from "./router.ts";
import type { PsnEnvironment } from "../types";

const LOG_VIEWS = new Set(["unsorted", "favorites", "seen", "all", "platinums"]);
const LOG_SORTS: Record<string, string> = {
  newest: "t.earned_at DESC, t.game_id ASC, t.trophy_id ASC",
  oldest: "t.earned_at ASC, t.game_id ASC, t.trophy_id ASC",
  name: "t.trophy_name COLLATE NOCASE ASC, t.game_id ASC, t.trophy_id ASC",
  rarity: "t.earned_rate ASC, t.earned_at DESC, t.game_id ASC, t.trophy_id ASC",
  "platinum-duration-desc": "completion_seconds DESC, t.earned_at DESC",
  "platinum-duration-asc": "(completion_seconds IS NULL) ASC, completion_seconds ASC, t.earned_at DESC",
};

const INBOX_SORTS: Record<string, string> = {
  newest: "i.earned_at DESC, i.game_id ASC, i.trophy_id ASC",
  oldest: "i.earned_at ASC, i.game_id ASC, i.trophy_id ASC",
  name: "i.trophy_name COLLATE NOCASE ASC, i.game_id ASC, i.trophy_id ASC",
  rarity: "i.earned_rate ASC, i.earned_at DESC, i.game_id ASC, i.trophy_id ASC",
};

const INBOX_SORT_INDEXES: Record<string, string> = {
  newest: "idx_trophy_inbox_newest",
};

// D1's query planner otherwise prefers the older earned/type index and builds a
// temporary sort over the full trophy collection. These names are selected only
// from the validated sort key above, never from request text.
const LOG_SORT_INDEXES: Record<string, string> = {
  newest: "idx_trophies_log_date_desc",
  oldest: "idx_trophies_log_date",
  name: "idx_trophies_log_name",
  rarity: "idx_trophies_log_rarity",
};

export async function routeTrophyManagementApi(request: Request, env: PsnEnvironment): Promise<Response | null> {
  const url = new URL(request.url);
  const isLog = request.method === "GET" && url.pathname === "/api/psn/trophy-log";
  const isPlatinums = request.method === "GET" && url.pathname === "/api/psn/platinums";
  const isAuthStatus = request.method === "GET" && url.pathname === "/api/psn/auth";
  const isAuthUpdate = request.method === "PUT" && url.pathname === "/api/psn/auth";
  const isSync = request.method === "POST" && url.pathname === "/api/psn/sync";
  const isSeenThrough = request.method === "PUT" && url.pathname === "/api/psn/trophies/seen-through";
  const preferenceMatch = url.pathname.match(/^\/api\/psn\/trophies\/([^/]+)\/(\d+)\/preference$/);
  const isPreferenceUpdate = request.method === "PUT" && Boolean(preferenceMatch);
  if (!isLog && !isPlatinums && !isAuthStatus && !isAuthUpdate && !isSync && !isSeenThrough && !isPreferenceUpdate) return null;

  const managerId = await requireAdmin(request, env);
  if (isLog) return listTrophyLog(env, url.searchParams);
  if (isPlatinums) return listPlatinums(env, url.searchParams);
  if (isAuthStatus) return noStoreJson({ ok: true, ...(await getPsnAuthStatus(env)) });
  if (isAuthUpdate) return updatePsnAuth(request, env, managerId);
  if (isSync) {
    const { syncTrophyBatch } = await import("../sync/sync-one-game.ts");
    const result = await syncTrophyBatch(env, 0, { prioritizeChanges: true });
    await (result.trophiesUpdated > 0 || result.titlesAdded > 0
      ? refreshPublicSnapshots(env)
      : refreshPublicStatusSnapshot(env));
    return noStoreJson({ ok: true, ...result });
  }
  if (isSeenThrough) return updateSeenThrough(request, env, managerId);
  return updatePreference(request, env, decodeGameId(preferenceMatch![1]!), Number(preferenceMatch![2]), managerId);
}

async function listPlatinums(env: PsnEnvironment, params: URLSearchParams): Promise<Response> {
  const { limit, offset, page } = parsePagination(params, 200);
  const [result, count] = await Promise.all([
    env.DB.prepare(`
      SELECT t.game_id, t.trophy_id, t.trophy_name, t.trophy_description, t.trophy_type,
        t.icon_url, t.earned_at, t.rarity_class, t.earned_rate, g.title_name,
        t.earned_number AS trophy_number, t.platinum_number,
        CASE WHEN g.first_trophy_at IS NOT NULL
          THEN CAST((julianday(t.earned_at) - julianday(g.first_trophy_at)) * 86400 AS INTEGER) END AS completion_seconds
      FROM trophies t JOIN games g ON g.id = t.game_id
      WHERE t.earned = 1 AND t.earned_at IS NOT NULL AND t.trophy_type = 'platinum'
      ORDER BY t.platinum_number DESC LIMIT ? OFFSET ?
    `).bind(limit + 1, offset).all<Record<string, unknown>>(),
    env.DB.prepare("SELECT value AS total_count FROM sync_state WHERE key = 'platinum_number'")
      .first<Record<string, unknown>>(),
  ]);
  const rows = result.results || [];
  const total = numberValue(count?.total_count);
  return noStoreJson({
    ok: true,
    items: rows.slice(0, limit).map((row) => ({ ...mapTrophy(row), platinumNumber: numberValue(row.platinum_number) })),
    pagination: { hasMore: rows.length > limit, limit, page, total },
  });
}

async function listTrophyLog(env: PsnEnvironment, params: URLSearchParams): Promise<Response> {
  const requestedView = String(params.get("view") || "unsorted").toLowerCase();
  if (!LOG_VIEWS.has(requestedView)) throw httpError(400, "view must be unsorted, favorites, seen, all, or platinums.");
  const sort = String(params.get("sort") || "newest").toLowerCase();
  const orderBy = LOG_SORTS[sort];
  if (!orderBy) throw httpError(400, `sort must be ${Object.keys(LOG_SORTS).join(", ")}.`);
  const indexHint = LOG_SORT_INDEXES[sort] ? ` INDEXED BY ${LOG_SORT_INDEXES[sort]}` : "";
  const evergreen = params.get("evergreen") === "true";
  const view = sort.startsWith("platinum-duration-") ? "platinums" : evergreen ? "all" : requestedView;
  const { limit, offset, page } = parsePagination(params, 48);
  const stateColumn = view === "unsorted" ? "NULL AS state" : "p.state";
  const select = `
    SELECT t.game_id, t.trophy_id, t.trophy_name, t.trophy_description, t.trophy_type,
      t.icon_url, t.earned_at, t.rarity_class, t.earned_rate, g.title_name, ${stateColumn},
      t.earned_number AS trophy_number, t.platinum_number,
      CASE WHEN t.trophy_type = 'platinum' AND g.first_trophy_at IS NOT NULL
        THEN CAST((julianday(t.earned_at) - julianday(g.first_trophy_at)) * 86400 AS INTEGER) END AS completion_seconds`;
  let statement;
  let bindings: unknown[];
  if (view === "unsorted") {
    const inboxOrderBy = INBOX_SORTS[sort] || INBOX_SORTS.newest;
    const inboxIndex = INBOX_SORT_INDEXES[sort] || INBOX_SORT_INDEXES.newest;
    statement = env.DB.prepare(`${select}
      FROM trophy_inbox i INDEXED BY ${inboxIndex}
      JOIN trophies t ON t.game_id = i.game_id AND t.trophy_id = i.trophy_id
      JOIN games g ON g.id = t.game_id
      ORDER BY ${inboxOrderBy}
      LIMIT ? OFFSET ?`);
    bindings = [limit + 1, offset];
  } else if (view === "favorites" || view === "seen") {
    statement = env.DB.prepare(`${select}
      FROM trophy_preferences p INDEXED BY idx_trophy_preferences_state
      JOIN trophies t ON t.game_id = p.game_id AND t.trophy_id = p.trophy_id
      JOIN games g ON g.id = t.game_id
      WHERE p.state = ? AND t.earned = 1 AND t.earned_at IS NOT NULL
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?`);
    bindings = [view === "favorites" ? "favorite" : "seen", limit + 1, offset];
  } else {
    const filters = ["t.earned = 1", "t.earned_at IS NOT NULL"];
    if (view === "platinums") filters.push("t.trophy_type = 'platinum'");
    statement = env.DB.prepare(`${select}
      FROM trophies t${indexHint}
      JOIN games g ON g.id = t.game_id
      LEFT JOIN trophy_preferences p ON p.game_id = t.game_id AND p.trophy_id = t.trophy_id
      WHERE ${filters.join(" AND ")}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?`);
    bindings = [limit + 1, offset];
  }
  const result = await statement.bind(...bindings).all<Record<string, unknown>>();
  const rows = result.results || [];
  return noStoreJson({
    ok: true,
    items: rows.slice(0, limit).map(mapTrophy),
    pagination: { hasMore: rows.length > limit, limit, page },
    view,
    sort,
    evergreen,
  });
}

async function updateSeenThrough(request: Request, env: PsnEnvironment, managerId: string): Promise<Response> {
  const body = await readBody(request);
  const anchor = body.anchor;
  if (!anchor || typeof anchor !== "object" || Array.isArray(anchor)) throw httpError(400, "A trophy anchor is required.");
  const anchorValue = anchor as Record<string, unknown>;
  const gameId = decodeGameId(encodeURIComponent(String(anchorValue.gameId || "")));
  const trophyId = Number(anchorValue.trophyId);
  if (!Number.isSafeInteger(trophyId) || trophyId < 0) throw httpError(400, "Trophy ID is invalid.");
  const requestedView = String(body.view || "unsorted").toLowerCase();
  if (requestedView !== "unsorted" || body.evergreen === true) throw httpError(400, "Seen through is available only in the unsorted view.");
  const sort = String(body.sort || "newest").toLowerCase();
  if (sort !== "newest") throw httpError(400, "Seen through requires newest-first sorting.");
  const anchorRow = await env.DB.prepare(`
    SELECT earned_at FROM trophy_inbox WHERE game_id = ? AND trophy_id = ?
  `).bind(gameId, trophyId).first<{ earned_at?: unknown }>();
  const earnedAt = String(anchorRow?.earned_at || "");
  if (!earnedAt) throw httpError(409, "That trophy is no longer awaiting review.");
  const targets = await env.DB.prepare(`
    SELECT game_id, trophy_id
    FROM trophy_inbox INDEXED BY idx_trophy_inbox_newest
    WHERE earned_at >= ? AND (
      earned_at > ? OR (earned_at = ? AND (game_id < ? OR (game_id = ? AND trophy_id <= ?)))
    )
    ORDER BY earned_at DESC, game_id ASC, trophy_id ASC
  `).bind(earnedAt, earnedAt, earnedAt, gameId, gameId, trophyId).all<Record<string, unknown>>();
  const rows = targets.results || [];
  const updatedAt = new Date().toISOString();
  for (let offset = 0; offset < rows.length; offset += 100) {
    const statements = rows.slice(offset, offset + 100).map((row) => env.DB.prepare(`
      INSERT INTO trophy_preferences (game_id, trophy_id, state, updated_at, updated_by)
      VALUES (?, ?, 'seen', ?, ?)
      ON CONFLICT(game_id, trophy_id) DO UPDATE SET state = 'seen',
        updated_at = excluded.updated_at, updated_by = excluded.updated_by
    `).bind(String(row.game_id), Number(row.trophy_id), updatedAt, managerId));
    await env.DB.batch(statements);
  }
  return noStoreJson({ ok: true, seen: rows.length });
}

async function updatePreference(
  request: Request,
  env: PsnEnvironment,
  gameId: string,
  trophyId: number,
  managerId: string,
): Promise<Response> {
  if (!Number.isSafeInteger(trophyId) || trophyId < 0) throw httpError(400, "Trophy ID is invalid.");
  const body = await readBody(request);
  const state = body.state === null || body.state === "" ? null : String(body.state || "").toLowerCase();
  if (state !== null && state !== "seen" && state !== "favorite") throw httpError(400, "state must be seen, favorite, or null.");
  const trophy = await env.DB.prepare(`
    SELECT trophy_type, earned FROM trophies WHERE game_id = ? AND trophy_id = ?
  `).bind(gameId, trophyId).first<Record<string, unknown>>();
  if (!trophy) throw httpError(404, "Trophy was not found.");
  if (!Boolean(trophy.earned)) throw httpError(409, "Only earned trophies can be reviewed.");
  if (state === null) {
    await env.DB.prepare("DELETE FROM trophy_preferences WHERE game_id = ? AND trophy_id = ?")
      .bind(gameId, trophyId).run();
  } else {
    await env.DB.prepare(`
      INSERT INTO trophy_preferences (game_id, trophy_id, state, updated_at, updated_by)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(game_id, trophy_id) DO UPDATE SET state = excluded.state,
        updated_at = excluded.updated_at, updated_by = excluded.updated_by
    `).bind(gameId, trophyId, state, new Date().toISOString(), managerId).run();
  }
  return noStoreJson({ ok: true, preference: { gameId, trophyId, state } });
}

async function updatePsnAuth(request: Request, env: PsnEnvironment, managerId: string): Promise<Response> {
  const body = await readBody(request);
  const npsso = String(body.npsso || "").trim();
  if (!/^[A-Za-z0-9_-]{64}$/.test(npsso)) throw httpError(400, "NPSSO must be the 64-character value from Sony's response.");
  try {
    const accessCode = await exchangeNpssoForAccessCode(npsso);
    await exchangeAccessCodeForAuthTokens(accessCode);
  } catch {
    throw httpError(400, "Sony rejected this NPSSO. Sign in again and copy a fresh value.");
  }
  const updatedAt = await savePsnNpsso(env, npsso, managerId);
  return noStoreJson({ ok: true, configured: true, updatedAt });
}

async function requireAdmin(request: Request, env: PsnEnvironment): Promise<string> {
  const authorization = request.headers.get("Authorization") || "";
  if (!authorization.startsWith("Bearer ")) throw httpError(401, "Sign in as an admin to manage trophies.");
  if (!env.MANAGER_AUTH) throw new Error("Manager authorization is not configured.");
  const response = await env.MANAGER_AUTH.fetch("https://rankings.internal/api/auth/verify", {
    method: "POST",
    headers: { Accept: "application/json", Authorization: authorization },
  });
  const value = await response.json().catch(() => null) as { ok?: boolean; managerId?: unknown; error?: string } | null;
  if (!response.ok || !value?.ok || !value.managerId) throw httpError(401, value?.error || "Manager authorization is invalid.");
  const managerId = String(value.managerId);
  const admins = new Set(String(env.ADMIN_MANAGER_IDS || "").split(",").map((entry) => entry.trim()).filter(Boolean));
  if (!admins.has(managerId)) throw httpError(403, "Only an admin can manage trophies.");
  return managerId;
}

function parsePagination(params: URLSearchParams, defaultLimit: number): { limit: number; offset: number; page: number } {
  const page = Number(params.get("page") || 1);
  const limit = Number(params.get("limit") || defaultLimit);
  if (!Number.isSafeInteger(page) || page < 1) throw httpError(400, "page must be a positive integer.");
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 250) throw httpError(400, "limit must be from 1 through 250.");
  return { limit, offset: (page - 1) * limit, page };
}

function decodeGameId(value: string): string {
  let gameId = "";
  try { gameId = decodeURIComponent(value); } catch { throw httpError(400, "Game ID is invalid."); }
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(gameId)) throw httpError(400, "Game ID is invalid.");
  return gameId;
}

function mapTrophy(row: Record<string, unknown>): Record<string, unknown> {
  return {
    description: row.trophy_description || null,
    earnedAt: row.earned_at || null,
    earnedRate: row.earned_rate === null ? null : Number(row.earned_rate),
    gameId: row.game_id,
    gameName: row.title_name,
    iconUrl: row.icon_url || null,
    id: Number(row.trophy_id),
    name: row.trophy_name,
    rarityClass: row.rarity_class === null ? null : Number(row.rarity_class),
    state: row.state || null,
    trophyNumber: numberValue(row.trophy_number),
    platinumNumber: row.trophy_type === "platinum" ? numberValue(row.platinum_number) : null,
    completionSeconds: row.completion_seconds === null || row.completion_seconds === undefined
      ? null : numberValue(row.completion_seconds),
    type: row.trophy_type,
  };
}

async function readBody(request: Request): Promise<Record<string, unknown>> {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) throw httpError(400, "A JSON body is required.");
  return body as Record<string, unknown>;
}

function numberValue(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function noStoreJson(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Cache-Control": "no-store", "Content-Type": "application/json; charset=utf-8" },
  });
}

function httpError(status: number, message: string): Error & { status: number } {
  return Object.assign(new Error(message), { status });
}
