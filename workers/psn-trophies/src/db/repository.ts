import type { D1PreparedStatement, NormalizedGame, NormalizedTrophy, NormalizedTrophyGroup, PsnEnvironment } from "../types";

export async function startSyncRun(env: PsnEnvironment, startedAt: string): Promise<number> {
  const result = await env.DB.prepare(`
    INSERT INTO sync_runs (started_at, status) VALUES (?, 'running')
  `).bind(startedAt).run();
  const id = Number(result.meta?.last_row_id);
  if (!result.success || !Number.isSafeInteger(id) || id < 1) throw new Error("D1 did not create the sync run.");
  return id;
}

export async function finishSyncRun(
  env: PsnEnvironment,
  id: number,
  status: "success" | "partial" | "failed",
  values: { titlesSeen?: number; titlesChanged?: number; titlesAdded?: number; trophiesUpdated?: number; errorMessage?: string },
): Promise<void> {
  await env.DB.prepare(`
    UPDATE sync_runs SET completed_at = ?, status = ?, titles_seen = ?, titles_changed = ?,
      titles_added = ?, trophies_updated = ?, error_message = ? WHERE id = ?
  `).bind(
    new Date().toISOString(), status, values.titlesSeen || 0, values.titlesChanged || 0,
    values.titlesAdded || 0, values.trophiesUpdated || 0, values.errorMessage || null, id,
  ).run();
}

export async function saveGame(
  env: PsnEnvironment,
  game: NormalizedGame,
  groups: NormalizedTrophyGroup[],
  trophies: NormalizedTrophy[],
  syncedAt: string,
): Promise<boolean> {
  const existing = await env.DB.prepare("SELECT id FROM games WHERE id = ?").bind(game.id).first();
  const existingTrophies = await env.DB.prepare(`
    SELECT trophy_id, earned_number, platinum_number FROM trophies WHERE game_id = ?
  `).bind(game.id).all<Record<string, unknown>>();
  const existingById = new Map((existingTrophies.results || []).map((row) => [Number(row.trophy_id), row]));
  const ordinalById = new Map<number, { earnedNumber: number | null; platinumNumber: number | null }>();
  const newlyEarned = trophies
    .filter((trophy) => trophy.earned && !Number(existingById.get(trophy.trophyId)?.earned_number))
    .sort((first, second) => String(first.earnedAt || "").localeCompare(String(second.earnedAt || "")) || first.trophyId - second.trophyId);
  const newPlatinums = newlyEarned.filter((trophy) => trophy.type === "platinum").length;
  const [earnedMaximum, platinumMaximum] = await Promise.all([
    reserveOrdinalRange(env, "earned_number", newlyEarned.length),
    reserveOrdinalRange(env, "platinum_number", newPlatinums),
  ]);
  let nextEarnedNumber = earnedMaximum - newlyEarned.length;
  let nextPlatinumNumber = platinumMaximum - newPlatinums;
  for (const trophy of newlyEarned) {
    nextEarnedNumber += 1;
    const platinumNumber = trophy.type === "platinum" ? ++nextPlatinumNumber : null;
    ordinalById.set(trophy.trophyId, { earnedNumber: nextEarnedNumber, platinumNumber });
  }
  await env.DB.prepare(`
    INSERT INTO games (
      id, np_communication_id, title_name, platforms, icon_url, progress,
      earned_bronze, earned_silver, earned_gold, earned_platinum,
      defined_bronze, defined_silver, defined_gold, defined_platinum,
      has_platinum, platinum_earned, first_trophy_at, latest_trophy_at,
      platinum_earned_at, completion_100_at, is_100_percent, source_updated_at,
      first_seen_at, last_synced_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      np_communication_id = excluded.np_communication_id,
      title_name = excluded.title_name,
      platforms = excluded.platforms,
      icon_url = excluded.icon_url,
      progress = excluded.progress,
      earned_bronze = excluded.earned_bronze,
      earned_silver = excluded.earned_silver,
      earned_gold = excluded.earned_gold,
      earned_platinum = excluded.earned_platinum,
      defined_bronze = excluded.defined_bronze,
      defined_silver = excluded.defined_silver,
      defined_gold = excluded.defined_gold,
      defined_platinum = excluded.defined_platinum,
      has_platinum = excluded.has_platinum,
      platinum_earned = excluded.platinum_earned,
      first_trophy_at = excluded.first_trophy_at,
      latest_trophy_at = excluded.latest_trophy_at,
      platinum_earned_at = excluded.platinum_earned_at,
      completion_100_at = excluded.completion_100_at,
      is_100_percent = excluded.is_100_percent,
      source_updated_at = excluded.source_updated_at,
      last_synced_at = excluded.last_synced_at
  `).bind(
    game.id, game.npCommunicationId, game.name, JSON.stringify(game.platforms), game.iconUrl, game.progress,
    game.earned.bronze, game.earned.silver, game.earned.gold, game.earned.platinum,
    game.defined.bronze, game.defined.silver, game.defined.gold, game.defined.platinum,
    Number(game.hasPlatinum), Number(game.platinumEarned), game.firstTrophyAt, game.latestTrophyAt,
    game.platinumEarnedAt, game.completion100At, Number(game.is100Percent), game.sourceUpdatedAt,
    syncedAt, syncedAt,
  ).run();

  const statements: D1PreparedStatement[] = [
    ...groups.map((group) => env.DB.prepare(`
      INSERT INTO trophy_groups (
        game_id, group_id, group_name, icon_url, defined_bronze, defined_silver, defined_gold, defined_platinum
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(game_id, group_id) DO UPDATE SET
        group_name = excluded.group_name, icon_url = excluded.icon_url,
        defined_bronze = excluded.defined_bronze, defined_silver = excluded.defined_silver,
        defined_gold = excluded.defined_gold, defined_platinum = excluded.defined_platinum
    `).bind(
      group.gameId, group.groupId, group.name, group.iconUrl,
      group.defined.bronze, group.defined.silver, group.defined.gold, group.defined.platinum,
    )),
    ...trophies.map((trophy) => env.DB.prepare(`
      INSERT INTO trophies (
        game_id, trophy_id, trophy_group_id, trophy_name, trophy_description, trophy_type,
        icon_url, earned, earned_at, rarity_class, earned_rate, progress, first_seen_at, last_synced_at,
        earned_number, platinum_number
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(game_id, trophy_id) DO UPDATE SET
        trophy_group_id = excluded.trophy_group_id, trophy_name = excluded.trophy_name,
        trophy_description = excluded.trophy_description, trophy_type = excluded.trophy_type,
        icon_url = excluded.icon_url, earned = excluded.earned, earned_at = excluded.earned_at,
        rarity_class = excluded.rarity_class, earned_rate = excluded.earned_rate,
        progress = excluded.progress, last_synced_at = excluded.last_synced_at,
        earned_number = CASE WHEN excluded.earned = 1 THEN COALESCE(trophies.earned_number, excluded.earned_number) ELSE NULL END,
        platinum_number = CASE WHEN excluded.earned = 1 AND excluded.trophy_type = 'platinum'
          THEN COALESCE(trophies.platinum_number, excluded.platinum_number) ELSE NULL END
    `).bind(
      trophy.gameId, trophy.trophyId, trophy.groupId, trophy.name, trophy.description, trophy.type,
      trophy.iconUrl, Number(trophy.earned), trophy.earnedAt, trophy.rarityClass, trophy.earnedRate,
      trophy.progress, syncedAt, syncedAt,
      ordinalById.get(trophy.trophyId)?.earnedNumber || existingById.get(trophy.trophyId)?.earned_number || null,
      ordinalById.get(trophy.trophyId)?.platinumNumber || existingById.get(trophy.trophyId)?.platinum_number || null,
    )),
  ];

  for (let index = 0; index < statements.length; index += 100) {
    await env.DB.batch(statements.slice(index, index + 100));
  }
  return !existing;
}

async function reserveOrdinalRange(env: PsnEnvironment, key: string, count: number): Promise<number> {
  if (!count) {
    const current = await env.DB.prepare("SELECT value FROM sync_state WHERE key = ?").bind(key).first<{ value?: unknown }>();
    return Number(current?.value || 0);
  }
  const row = await env.DB.prepare(`
    INSERT INTO sync_state (key, value, updated_at) VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = CAST(sync_state.value AS INTEGER) + CAST(excluded.value AS INTEGER), updated_at = excluded.updated_at
    RETURNING value
  `).bind(key, String(count), new Date().toISOString()).first<{ value?: unknown }>();
  return Number(row?.value || count);
}

export async function getSyncCursor(env: PsnEnvironment): Promise<number> {
  const row = await env.DB.prepare("SELECT value FROM sync_state WHERE key = 'title_cursor'").first<{ value?: unknown }>();
  const cursor = Number(row?.value);
  return Number.isSafeInteger(cursor) && cursor >= 0 ? cursor : 0;
}

export async function setSyncCursor(env: PsnEnvironment, cursor: number): Promise<void> {
  await env.DB.prepare(`
    INSERT INTO sync_state (key, value, updated_at) VALUES ('title_cursor', ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `).bind(String(Math.max(0, Math.trunc(cursor))), new Date().toISOString()).run();
}

export async function getStoredGameUpdates(env: PsnEnvironment): Promise<Map<string, string>> {
  const result = await env.DB.prepare("SELECT id, source_updated_at FROM games").all<Record<string, unknown>>();
  return new Map((result.results || []).map((row) => [String(row.id), String(row.source_updated_at || "")]));
}
