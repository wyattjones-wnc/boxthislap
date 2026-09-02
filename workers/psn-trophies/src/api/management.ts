import { exchangeAccessCodeForAuthTokens, exchangeNpssoForAccessCode } from "psn-api";
import { getPsnAuthStatus, savePsnNpsso } from "../psn/stored-auth.ts";
import { refreshPublicSnapshots } from "./router.ts";
import type { PsnEnvironment } from "../types";

const LOG_VIEWS = new Set(["unsorted", "favorites", "seen", "all", "platinums"]);
const LOG_SORTS: Record<string, string> = {
  newest: "t.earned_at DESC, t.game_id ASC, t.trophy_id ASC",
  oldest: "t.earned_at ASC, t.game_id ASC, t.trophy_id ASC",
  name: "t.trophy_name COLLATE NOCASE ASC, t.game_id ASC, t.trophy_id ASC",
  rarity: "t.earned_rate ASC, t.earned_at DESC",
  "platinum-duration-desc": "t.completion_seconds DESC, t.earned_at DESC",
  "platinum-duration-asc": "(t.completion_seconds IS NULL) ASC, t.completion_seconds ASC, t.earned_at DESC",
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
    await refreshPublicSnapshots(env);
    return noStoreJson({ ok: true, ...result });
  }
  if (isSeenThrough) return updateSeenThrough(request, env, managerId);
  return updatePreference(request, env, decodeGameId(preferenceMatch![1]!), Number(preferenceMatch![2]), managerId);
}

async function listPlatinums(env: PsnEnvironment, params: URLSearchParams): Promise<Response> {
  const { limit, offset, page } = parsePagination(params, 200);
  const result = await env.DB.prepare(`
    WITH numbered AS (
      SELECT t.game_id, t.trophy_id, t.trophy_name, t.trophy_description, t.trophy_type,
        t.icon_url, t.earned_at, t.rarity_class, t.earned_rate, g.title_name,
        ROW_NUMBER() OVER (ORDER BY t.earned_at ASC, t.game_id ASC, t.trophy_id ASC) AS trophy_number,
        SUM(CASE WHEN t.trophy_type = 'platinum' THEN 1 ELSE 0 END) OVER (
          ORDER BY t.earned_at ASC, t.game_id ASC, t.trophy_id ASC ROWS UNBOUNDED PRECEDING
        ) AS platinum_number,
        CASE WHEN t.trophy_type = 'platinum' AND g.first_trophy_at IS NOT NULL
          THEN CAST((julianday(t.earned_at) - julianday(g.first_trophy_at)) * 86400 AS INTEGER) END AS completion_seconds
      FROM trophies t JOIN games g ON g.id = t.game_id
      WHERE t.earned = 1 AND t.earned_at IS NOT NULL
    )
    SELECT *, COUNT(*) OVER () AS total_count FROM numbered
    WHERE trophy_type = 'platinum' ORDER BY platinum_number DESC LIMIT ? OFFSET ?
  `).bind(limit + 1, offset).all<Record<string, unknown>>();
  const rows = result.results || [];
  const total = numberValue(rows[0]?.total_count);
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
  const evergreen = params.get("evergreen") === "true";
  const view = sort.startsWith("platinum-duration-") ? "platinums" : evergreen ? "all" : requestedView;
  const { limit, offset, page } = parsePagination(params, 48);
  const filters = ["1 = 1"];
  if (view === "unsorted") filters.push("t.state IS NULL");
  if (view === "favorites") filters.push("t.state = 'favorite'");
  if (view === "seen") filters.push("t.state = 'seen'");
  if (view === "platinums") filters.push("t.trophy_type = 'platinum'");
  const result = await env.DB.prepare(`
    WITH numbered AS (
      SELECT t.game_id, t.trophy_id, t.trophy_name, t.trophy_description, t.trophy_type,
        t.icon_url, t.earned_at, t.rarity_class, t.earned_rate, g.title_name, p.state,
        ROW_NUMBER() OVER (ORDER BY t.earned_at ASC, t.game_id ASC, t.trophy_id ASC) AS trophy_number,
        SUM(CASE WHEN t.trophy_type = 'platinum' THEN 1 ELSE 0 END) OVER (
          ORDER BY t.earned_at ASC, t.game_id ASC, t.trophy_id ASC ROWS UNBOUNDED PRECEDING
        ) AS platinum_number,
        CASE WHEN t.trophy_type = 'platinum' AND g.first_trophy_at IS NOT NULL
          THEN CAST((julianday(t.earned_at) - julianday(g.first_trophy_at)) * 86400 AS INTEGER) END AS completion_seconds
      FROM trophies t
      JOIN games g ON g.id = t.game_id
      LEFT JOIN trophy_preferences p ON p.game_id = t.game_id AND p.trophy_id = t.trophy_id
      WHERE t.earned = 1 AND t.earned_at IS NOT NULL
    )
    SELECT * FROM numbered t
    WHERE ${filters.join(" AND ")}
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `).bind(limit + 1, offset).all<Record<string, unknown>>();
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
  if (!LOG_VIEWS.has(requestedView)) throw httpError(400, "view must be unsorted, favorites, seen, all, or platinums.");
  const sort = String(body.sort || "newest").toLowerCase();
  const orderBy = LOG_SORTS[sort];
  if (!orderBy) throw httpError(400, `sort must be ${Object.keys(LOG_SORTS).join(", ")}.`);
  const evergreen = body.evergreen === true;
  const view = sort.startsWith("platinum-duration-") ? "platinums" : evergreen ? "all" : requestedView;
  const datasetFilter = view === "platinums" ? "WHERE t.trophy_type = 'platinum'" : "";
  const targets = await env.DB.prepare(`
    WITH numbered AS (
      SELECT t.game_id, t.trophy_id, t.trophy_name, t.trophy_type, t.earned_at, t.earned_rate,
        p.state,
        CASE WHEN t.trophy_type = 'platinum' AND g.first_trophy_at IS NOT NULL
          THEN CAST((julianday(t.earned_at) - julianday(g.first_trophy_at)) * 86400 AS INTEGER) END AS completion_seconds
      FROM trophies t
      JOIN games g ON g.id = t.game_id
      LEFT JOIN trophy_preferences p ON p.game_id = t.game_id AND p.trophy_id = t.trophy_id
      WHERE t.earned = 1 AND t.earned_at IS NOT NULL
    ), ordered AS (
      SELECT t.game_id, t.trophy_id, t.state,
        ROW_NUMBER() OVER (ORDER BY ${orderBy}) AS display_rank
      FROM numbered t ${datasetFilter}
    ), anchor AS (
      SELECT display_rank FROM ordered WHERE game_id = ? AND trophy_id = ?
    )
    SELECT game_id, trophy_id FROM ordered
    WHERE state IS NULL AND display_rank <= (SELECT display_rank FROM anchor)
    ORDER BY display_rank
  `).bind(gameId, trophyId).all<Record<string, unknown>>();
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
