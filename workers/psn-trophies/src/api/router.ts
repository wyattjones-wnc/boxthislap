import type { PsnEnvironment } from "../types";

const SORT_COLUMNS = {
  date: "earned_at",
  id: "trophy_id",
  rarity: "earned_rate",
} as const;

export async function routePublicApi(request: Request, env: PsnEnvironment): Promise<Response | null> {
  const url = new URL(request.url);
  if (request.method === "GET" && url.pathname === "/api/psn/status") return getStatus(env);

  const trophyMatch = url.pathname.match(/^\/api\/psn\/games\/([^/]+)\/trophies$/);
  if (request.method === "GET" && trophyMatch) {
    return getGameTrophies(env, decodeURIComponent(trophyMatch[1]!), url.searchParams);
  }
  return null;
}

async function getStatus(env: PsnEnvironment): Promise<Response> {
  const row = await env.DB.prepare(`
    SELECT completed_at FROM sync_runs WHERE status = 'success' ORDER BY id DESC LIMIT 1
  `).first<{ completed_at: string }>();
  return cachedJson({ lastSuccessfulSync: row?.completed_at || null, status: row ? "ok" : "pending" }, 60);
}

async function getGameTrophies(env: PsnEnvironment, gameId: string, params: URLSearchParams): Promise<Response> {
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(gameId)) throw httpError(400, "Game ID is invalid.");
  const earned = optionalBoolean(params.get("earned"), "earned");
  const group = cleanGroup(params.get("group"));
  const sort = params.get("sort") || "id";
  const order = (params.get("order") || "asc").toLowerCase();
  if (!(sort in SORT_COLUMNS)) throw httpError(400, "sort must be date, id, or rarity.");
  if (order !== "asc" && order !== "desc") throw httpError(400, "order must be asc or desc.");

  const game = await env.DB.prepare(`
    SELECT id, title_name, platforms, progress, has_platinum, platinum_earned,
      platinum_earned_at, is_100_percent, last_synced_at
    FROM games WHERE id = ?
  `).bind(gameId).first<Record<string, unknown>>();
  if (!game) throw httpError(404, "Game was not found.");

  const filters = ["game_id = ?"];
  const bindings: unknown[] = [gameId];
  if (earned !== null) {
    filters.push("earned = ?");
    bindings.push(Number(earned));
  }
  if (group) {
    filters.push("trophy_group_id = ?");
    bindings.push(group);
  }
  const sortColumn = SORT_COLUMNS[sort as keyof typeof SORT_COLUMNS];
  const result = await env.DB.prepare(`
    SELECT trophy_id, trophy_group_id, trophy_name, trophy_description, trophy_type,
      icon_url, earned, earned_at, rarity_class, earned_rate, progress
    FROM trophies WHERE ${filters.join(" AND ")}
    ORDER BY ${sortColumn} ${order.toUpperCase()}, trophy_id ASC
  `).bind(...bindings).all<Record<string, unknown>>();

  return cachedJson({
    game: {
      id: game.id,
      name: game.title_name,
      platforms: parsePlatforms(game.platforms),
      progress: Number(game.progress || 0),
      hasPlatinum: Boolean(game.has_platinum),
      platinumEarned: Boolean(game.platinum_earned),
      platinumEarnedAt: game.platinum_earned_at || null,
      is100Percent: Boolean(game.is_100_percent),
      updatedAt: game.last_synced_at,
    },
    items: (result.results || []).map((row) => ({
      id: Number(row.trophy_id),
      groupId: row.trophy_group_id || null,
      name: row.trophy_name,
      description: row.trophy_description || null,
      type: row.trophy_type,
      iconUrl: row.icon_url || null,
      earned: Boolean(row.earned),
      earnedAt: row.earned_at || null,
      rarityClass: row.rarity_class === null ? null : Number(row.rarity_class),
      earnedRate: row.earned_rate === null ? null : Number(row.earned_rate),
      progress: row.progress === null ? null : Number(row.progress),
    })),
  }, 300);
}

async function cachedJson(value: unknown, maxAge: number): Promise<Response> {
  const body = JSON.stringify(value);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(body));
  const etag = `"${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")}"`;
  return new Response(body, {
    headers: {
      "Cache-Control": `public, max-age=${maxAge}, s-maxage=${maxAge}`,
      "Content-Type": "application/json; charset=utf-8",
      ETag: etag,
    },
  });
}

function optionalBoolean(value: string | null, name: string): boolean | null {
  if (value === null) return null;
  if (value === "true") return true;
  if (value === "false") return false;
  throw httpError(400, `${name} must be true or false.`);
}

function cleanGroup(value: string | null): string | null {
  if (value === null || value === "") return null;
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(value)) throw httpError(400, "group is invalid.");
  return value;
}

function parsePlatforms(value: unknown): string[] {
  try {
    const parsed = JSON.parse(String(value || "[]"));
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function httpError(status: number, message: string): Error & { status: number } {
  return Object.assign(new Error(message), { status });
}
