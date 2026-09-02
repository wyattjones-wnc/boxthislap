import type { PsnEnvironment } from "../types";

const SORT_COLUMNS = {
  date: "earned_at",
  id: "trophy_id",
  rarity: "earned_rate",
} as const;
const STATS_SNAPSHOT_KEY = "public:stats:v1";
const STATUS_SNAPSHOT_KEY = "public:status:v1";

export async function routePublicApi(request: Request, env: PsnEnvironment): Promise<Response | null> {
  const url = new URL(request.url);
  if (request.method === "GET" && url.pathname === "/api/psn/status") return getStatus(env);
  if (request.method === "GET" && url.pathname === "/api/psn/stats") return getStats(env);

  const trophyMatch = url.pathname.match(/^\/api\/psn\/games\/([^/]+)\/trophies$/);
  if (request.method === "GET" && trophyMatch) {
    return getGameTrophies(env, decodeURIComponent(trophyMatch[1]!), url.searchParams);
  }
  return null;
}

async function getStats(env: PsnEnvironment): Promise<Response> {
  const snapshot = await readSnapshot(env, STATS_SNAPSHOT_KEY);
  if (snapshot) return cachedJson(snapshot, 300);
  const value = await buildStats(env);
  await writeSnapshot(env, STATS_SNAPSHOT_KEY, value);
  return cachedJson(value, 300);
}

export async function buildStats(env: PsnEnvironment): Promise<Record<string, unknown>> {
  const [gamesResult, trophiesResult, rarestEarnedResult, latestEarnedResult, rarestByTypeRows] = await Promise.all([
    env.DB.prepare(`
      SELECT COUNT(*) AS games, COALESCE(SUM(platinum_earned), 0) AS platinums,
        COALESCE(SUM(is_100_percent), 0) AS hundred_percent, MAX(last_synced_at) AS updated_at
      FROM games
    `).all<Record<string, unknown>>(),
    env.DB.prepare(`
      SELECT COUNT(*) AS total_trophies, COALESCE(SUM(earned), 0) AS earned_trophies,
        COALESCE(SUM(CASE WHEN earned = 1 AND trophy_type = 'bronze' THEN 1 ELSE 0 END), 0) AS bronze,
        COALESCE(SUM(CASE WHEN earned = 1 AND trophy_type = 'silver' THEN 1 ELSE 0 END), 0) AS silver,
        COALESCE(SUM(CASE WHEN earned = 1 AND trophy_type = 'gold' THEN 1 ELSE 0 END), 0) AS gold,
        COALESCE(SUM(CASE WHEN earned = 1 AND trophy_type = 'platinum' THEN 1 ELSE 0 END), 0) AS platinum
      FROM trophies
    `).all<Record<string, unknown>>(),
    env.DB.prepare(`
      SELECT t.game_id, g.title_name, t.trophy_id, t.trophy_name, t.trophy_type,
        t.icon_url, t.earned_at, t.rarity_class, t.earned_rate
      FROM trophies t
      JOIN games g ON g.id = t.game_id
      WHERE t.earned = 1 AND t.earned_rate IS NOT NULL
      ORDER BY t.earned_rate ASC, t.earned_at ASC, t.trophy_id ASC
      LIMIT 1
    `).all<Record<string, unknown>>(),
    env.DB.prepare(`
      SELECT t.game_id, g.title_name, t.trophy_id, t.trophy_name, t.trophy_type,
        t.icon_url, t.earned_at, t.rarity_class, t.earned_rate
      FROM trophies t
      JOIN games g ON g.id = t.game_id
      WHERE t.earned = 1 AND t.earned_at IS NOT NULL
      ORDER BY t.earned_at DESC, t.trophy_id DESC
      LIMIT 1
    `).all<Record<string, unknown>>(),
    env.DB.prepare(`
      WITH ranked AS (
        SELECT t.game_id, g.title_name, t.trophy_id, t.trophy_name, t.trophy_type,
          t.icon_url, t.earned_at, t.rarity_class, t.earned_rate,
          ROW_NUMBER() OVER (
            PARTITION BY t.trophy_type
            ORDER BY t.earned_rate ASC, t.earned_at ASC, t.game_id ASC, t.trophy_id ASC
          ) AS rarity_rank
        FROM trophies t
        JOIN games g ON g.id = t.game_id
        WHERE t.earned = 1 AND t.earned_rate IS NOT NULL
      )
      SELECT * FROM ranked WHERE rarity_rank = 1
    `).all<Record<string, unknown>>(),
  ]);

  const games = gamesResult.results?.[0] || null;
  const trophies = trophiesResult.results?.[0] || null;
  const rarestEarned = rarestEarnedResult.results?.[0] || null;
  const latestEarned = latestEarnedResult.results?.[0] || null;

  const rarestByType = Object.fromEntries(["bronze", "silver", "gold", "platinum"].map((type) => {
    const row = (rarestByTypeRows.results || []).find((entry) => entry.trophy_type === type) || null;
    return [type, mapStatTrophy(row)];
  }));

  const value = {
    counts: {
      earnedTrophies: numberValue(trophies?.earned_trophies),
      games: numberValue(games?.games),
      hundredPercent: numberValue(games?.hundred_percent),
      platinums: numberValue(games?.platinums),
      totalTrophies: numberValue(trophies?.total_trophies),
    },
    earnedByType: {
      bronze: numberValue(trophies?.bronze),
      silver: numberValue(trophies?.silver),
      gold: numberValue(trophies?.gold),
      platinum: numberValue(trophies?.platinum),
    },
    latestEarned: mapStatTrophy(latestEarned),
    rarestByType,
    rarestEarned: mapStatTrophy(rarestEarned),
    updatedAt: games?.updated_at || null,
  };
  console.log(JSON.stringify({
    event: "psn_d1_snapshot_rebuilt",
    snapshot: "stats",
    queries: 5,
    rowsRead: [gamesResult, trophiesResult, rarestEarnedResult, latestEarnedResult, rarestByTypeRows]
      .reduce((total, result) => total + Number(result.meta?.rows_read || 0), 0),
  }));
  return value;
}

async function getStatus(env: PsnEnvironment): Promise<Response> {
  const snapshot = await readSnapshot(env, STATUS_SNAPSHOT_KEY);
  if (snapshot) return cachedJson(snapshot, 60);
  const value = await buildStatus(env);
  await writeSnapshot(env, STATUS_SNAPSHOT_KEY, value);
  return cachedJson(value, 60);
}

export async function buildStatus(env: PsnEnvironment): Promise<Record<string, unknown>> {
  const row = await env.DB.prepare(`
    SELECT completed_at FROM sync_runs WHERE status = 'success' ORDER BY id DESC LIMIT 1
  `).first<{ completed_at: string }>();
  console.log(JSON.stringify({ event: "psn_d1_snapshot_rebuilt", snapshot: "status", queries: 1 }));
  return { lastSuccessfulSync: row?.completed_at || null, status: row ? "ok" : "pending" };
}

export async function refreshPublicSnapshots(env: PsnEnvironment): Promise<void> {
  if (!env.SNAPSHOTS) return;
  const [stats, status] = await Promise.all([buildStats(env), buildStatus(env)]);
  await Promise.all([
    writeSnapshot(env, STATS_SNAPSHOT_KEY, stats),
    writeSnapshot(env, STATUS_SNAPSHOT_KEY, status),
  ]);
}

async function readSnapshot(env: PsnEnvironment, key: string): Promise<Record<string, unknown> | null> {
  if (!env.SNAPSHOTS) return null;
  try {
    return await env.SNAPSHOTS.get<Record<string, unknown>>(key, "json");
  } catch (error) {
    console.warn(JSON.stringify({ event: "psn_snapshot_read_failed", key, error: String(error) }));
    return null;
  }
}

async function writeSnapshot(env: PsnEnvironment, key: string, value: unknown): Promise<void> {
  if (!env.SNAPSHOTS) return;
  try {
    await env.SNAPSHOTS.put(key, JSON.stringify(value));
  } catch (error) {
    console.warn(JSON.stringify({ event: "psn_snapshot_write_failed", key, error: String(error) }));
  }
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

function mapStatTrophy(row: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!row) return null;
  return {
    earnedAt: row.earned_at || null,
    earnedRate: row.earned_rate === null ? null : Number(row.earned_rate),
    gameId: row.game_id,
    gameName: row.title_name,
    iconUrl: row.icon_url || null,
    id: Number(row.trophy_id),
    name: row.trophy_name,
    rarityClass: row.rarity_class === null ? null : Number(row.rarity_class),
    type: row.trophy_type,
  };
}

function numberValue(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function httpError(status: number, message: string): Error & { status: number } {
  return Object.assign(new Error(message), { status });
}
