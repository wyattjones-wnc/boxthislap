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

      const rosterMediaRoute = url.pathname.match(/^\/media\/rosters\/(.+)$/);
      if (request.method === "GET" && rosterMediaRoute) {
        return getRosterMedia(env, decodeURIComponent(rosterMediaRoute[1]), cors);
      }

      if (request.method === "GET" && url.pathname === "/api/rosters") {
        return json({ ok: true, rosters: await listRosters(env, url.searchParams) }, 200, cors);
      }

      if (request.method === "POST" && url.pathname === "/api/rosters/sync") {
        requireRosterSync(request, env);
        const result = await syncRosters(env, await readBody(request));
        return json({ ok: true, ...result }, 200, cors);
      }

      if (request.method === "POST" && url.pathname === "/api/roster-players") {
        const managerId = await requireAdmin(request, env);
        return json({ ok: true, player: await createRosterPlayer(env, await readBody(request), managerId) }, 201, cors);
      }

      const rosterMediaMutation = url.pathname.match(/^\/api\/roster-players\/([^/]+)\/media(?:\/([^/]+))?$/);
      if (rosterMediaMutation && ["POST", "DELETE"].includes(request.method)) {
        const managerId = await requireAdmin(request, env);
        const playerId = decodeURIComponent(rosterMediaMutation[1]);
        const kind = rosterMediaMutation[2] ? decodeURIComponent(rosterMediaMutation[2]) : "";
        const player = request.method === "POST"
          ? await saveRosterMedia(env, playerId, await readBody(request), managerId)
          : await deleteRosterMedia(env, playerId, kind, managerId);
        return json({ ok: true, player }, 200, cors);
      }

      const rosterPlayerRoute = url.pathname.match(/^\/api\/roster-players\/([^/]+)$/);
      if (request.method === "PUT" && rosterPlayerRoute) {
        const managerId = await requireAdmin(request, env);
        const player = await updateRosterPlayer(env, decodeURIComponent(rosterPlayerRoute[1]), await readBody(request), managerId);
        return json({ ok: true, player }, 200, cors);
      }

      if (request.method === "GET" && url.pathname === "/api/match-notes") {
        return json({ ok: true, notes: await listMatchNotes(env) }, 200, cors);
      }

      if (request.method === "GET" && url.pathname === "/api/ten-out-of-ten") {
        await requireAdmin(request, env);
        return json({ ok: true, performances: await listTenOutOfTenPerformances(env) }, 200, cors);
      }

      if (request.method === "POST" && url.pathname === "/api/ten-out-of-ten") {
        const managerId = await requireAdmin(request, env);
        const savedPerformance = await saveTenOutOfTenPerformance(env, await readBody(request), managerId);
        return json({ ok: true, savedPerformance, status: "saved" }, 201, cors);
      }

      if (request.method === "GET" && url.pathname === "/api/seen-matches") {
        await requireAdmin(request, env);
        return json({ ok: true, seenMatches: await listSeenMatches(env) }, 200, cors);
      }

      if (request.method === "POST" && url.pathname === "/api/seen-matches") {
        const managerId = await requireAdmin(request, env);
        const savedSeenMatch = await saveSeenMatch(env, await readBody(request), managerId);
        return json({ ok: true, savedSeenMatch, status: "saved" }, 201, cors);
      }

      const seenMatchRoute = url.pathname.match(/^\/api\/seen-matches\/([^/]+)$/);

      if (request.method === "PUT" && seenMatchRoute) {
        const id = parseSeenMatchId(seenMatchRoute[1]);
        const managerId = await requireAdmin(request, env);
        const savedSeenMatch = await updateSeenMatch(env, id, await readBody(request), managerId);
        return json({ ok: true, savedSeenMatch, status: "saved" }, 200, cors);
      }

      const performanceMatch = url.pathname.match(/^\/api\/ten-out-of-ten\/([^/]+)$/);

      if (request.method === "PUT" && performanceMatch) {
        const id = parsePerformanceId(performanceMatch[1]);
        const managerId = await requireAdmin(request, env);
        const savedPerformance = await updateTenOutOfTenPerformance(env, id, await readBody(request), managerId);
        return json({ ok: true, savedPerformance, status: "saved" }, 200, cors);
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
        error: status >= 500 ? "Footy data could not be saved." : error.message,
      }, status, cors);
    }
  },
};

const ROSTER_FIELDS = ["name", "position", "number", "appearances", "birthday", "homeCountry", "yearJoined", "clubJoinedFrom", "fromAcademy", "isNew", "transferOut", "profileImage", "cardImage"];

async function listRosters(env, searchParams) {
  const teamId = cleanText(searchParams.get("teamId"), 80, "Team ID");
  const season = cleanText(searchParams.get("season"), 20, "Season");
  const conditions = searchParams.get("includeArchived") === "1" ? ["1 = 1"] : ["p.status <> 'archived'"];
  const bindings = [];
  if (teamId) { conditions.push("p.team_id = ?"); bindings.push(teamId); }
  if (season) { conditions.push("p.season = ?"); bindings.push(season); }
  if (!season && searchParams.get("includeInactive") !== "1") conditions.push("(s.is_active = 1 OR s.is_active IS NULL)");
  const result = await env.DB.prepare(`
    SELECT p.*, COALESCE(s.is_active, 0) AS is_active
    FROM footy_roster_players p
    LEFT JOIN footy_roster_seasons s ON s.team_id = p.team_id AND s.season = p.season
    WHERE ${conditions.join(" AND ")}
    ORDER BY p.team_id, p.season DESC, p.status, p.created_at
  `).bind(...bindings).all();
  const groups = new Map();
  for (const row of result.results || []) {
    const key = `${row.team_id}|${row.season}`;
    if (!groups.has(key)) groups.set(key, { teamId: String(row.team_id), season: String(row.season), active: Boolean(row.is_active), players: [] });
    groups.get(key).players.push(mapRosterPlayer(row));
  }
  return [...groups.values()];
}

async function syncRosters(env, body) {
  if (!Array.isArray(body.rosters) || body.rosters.length > 100) throw httpError(400, "Rosters must be a list.");
  const now = new Date().toISOString();
  let added = 0;
  let updated = 0;
  let reviewDepartures = 0;
  let duplicatesMerged = 0;
  for (const rosterValue of body.rosters) {
    const teamId = requireText(rosterValue?.teamId, 80, "Team ID");
    const season = requireText(rosterValue?.season, 20, "Season");
    const players = Array.isArray(rosterValue?.players) ? rosterValue.players : [];
    if (players.length > 200) throw httpError(400, "A roster has too many players.");
    const isActive = rosterValue?.active !== false;
    const seasonStatements = [];
    if (isActive) seasonStatements.push(env.DB.prepare("UPDATE footy_roster_seasons SET is_active = 0, updated_at = ? WHERE team_id = ?").bind(now, teamId));
    seasonStatements.push(env.DB.prepare(`INSERT INTO footy_roster_seasons (team_id, season, is_active, last_synced_at, updated_at)
      VALUES (?, ?, ?, ?, ?) ON CONFLICT(team_id, season) DO UPDATE SET is_active = excluded.is_active, last_synced_at = excluded.last_synced_at, updated_at = excluded.updated_at`).bind(teamId, season, isActive ? 1 : 0, now, now));
    await env.DB.batch(seasonStatements);
    const existingResult = await env.DB.prepare("SELECT * FROM footy_roster_players WHERE team_id = ? AND season = ?").bind(teamId, season).all();
    let existingRows = [...(existingResult.results || [])];
    const seenKeys = [];
    for (const value of players) {
      const provider = cleanText(value?.provider, 80, "Provider") || "manual-import";
      const providerPlayerId = cleanText(value?.providerPlayerId, 120, "Provider player ID");
      const providerData = normalizeRosterData(value?.providerData || value);
      if (!providerData.name) continue;
      const playerKey = cleanText(value?.playerKey, 160, "Player key") || `${provider}:${providerPlayerId || slugRosterValue(providerData.name)}`;
      const matches = existingRows.filter((row) => row.player_key === playerKey || rosterIdentityMatches(row, providerData));
      const existing = chooseRosterSurvivor(matches, playerKey);
      const duplicateRows = matches.filter((row) => row.id !== existing?.id);
      const mergedOverrides = mergeRosterOverrides(matches, value?.seedOverrides || {});
      for (const duplicate of duplicateRows) {
        await env.DB.prepare("DELETE FROM footy_roster_players WHERE id = ?").bind(duplicate.id).run();
        duplicatesMerged += 1;
      }
      existingRows = existingRows.filter((row) => !duplicateRows.some((duplicate) => duplicate.id === row.id));
      const id = existing?.id || crypto.randomUUID();
      const preserveManual = existing && Number(existing.manual) === 1 && existing.provider !== "legacy-sheet" && existing.provider !== "legacy-history";
      const manual = value?.manual || preserveManual ? 1 : 0;
      if (existing) {
        await env.DB.prepare(`UPDATE footy_roster_players SET player_key = ?, provider = ?, provider_player_id = ?, provider_data = ?, overrides = ?,
          status = CASE WHEN status = 'archived' THEN 'archived' ELSE 'active' END, manual = ?, source_seen_at = ?, updated_at = ? WHERE id = ?`)
          .bind(playerKey, provider, providerPlayerId, JSON.stringify(providerData), JSON.stringify(mergedOverrides), manual, now, now, id).run();
        existingRows = existingRows.map((row) => row.id === id ? { ...row, player_key: playerKey, provider, provider_player_id: providerPlayerId, provider_data: JSON.stringify(providerData), overrides: JSON.stringify(mergedOverrides), manual } : row);
        updated += 1;
      } else {
        await env.DB.prepare(`INSERT INTO footy_roster_players
          (id, team_id, season, player_key, provider, provider_player_id, provider_data, overrides, status, manual, source_seen_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)`)
          .bind(id, teamId, season, playerKey, provider, providerPlayerId, JSON.stringify(providerData), JSON.stringify(mergedOverrides), manual, now, now).run();
        existingRows.push({ id, team_id: teamId, season, player_key: playerKey, provider, provider_player_id: providerPlayerId, provider_data: JSON.stringify(providerData), overrides: JSON.stringify(mergedOverrides), status: "active", manual });
        added += 1;
      }
      seenKeys.push(playerKey);
    }
    const activeProviderRows = await env.DB.prepare("SELECT id, player_key FROM footy_roster_players WHERE team_id = ? AND season = ? AND manual = 0 AND status = 'active'").bind(teamId, season).all();
    const seen = new Set(seenKeys);
    for (const row of activeProviderRows.results || []) {
      if (seen.has(row.player_key)) continue;
      await env.DB.prepare("UPDATE footy_roster_players SET status = 'review_departure', updated_at = ? WHERE id = ?").bind(now, row.id).run();
      reviewDepartures += 1;
    }
  }
  return { added, updated, reviewDepartures, duplicatesMerged };
}

async function createRosterPlayer(env, body, managerId) {
  const teamId = requireText(body?.teamId, 80, "Team ID");
  const season = requireText(body?.season, 20, "Season");
  const overrides = normalizeRosterData(body?.overrides || body);
  if (!overrides.name) throw httpError(400, "Player name is required.");
  const id = crypto.randomUUID();
  const playerKey = `manual:${id}`;
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO footy_roster_seasons (team_id, season, is_active, updated_at) VALUES (?, ?, 1, CURRENT_TIMESTAMP)
      ON CONFLICT(team_id, season) DO NOTHING`).bind(teamId, season),
    env.DB.prepare(`INSERT INTO footy_roster_players
      (id, team_id, season, player_key, overrides, status, manual, updated_by)
      VALUES (?, ?, ?, ?, ?, 'active', 1, ?)`
    ).bind(id, teamId, season, playerKey, JSON.stringify(overrides), managerId),
  ]);
  return getRosterPlayer(env, id);
}

async function updateRosterPlayer(env, id, body, managerId) {
  const existing = await getRosterPlayerRow(env, id);
  if (!existing) throw httpError(404, "Roster player was not found.");
  const overrides = normalizeRosterData(body?.overrides || body);
  const status = ["active", "review_departure", "archived"].includes(body?.status) ? body.status : existing.status;
  const manual = body?.keepManually ? 1 : Number(existing.manual || 0);
  if (!(overrides.name || safeJson(existing.provider_data).name)) throw httpError(400, "Player name is required.");
  await env.DB.prepare("UPDATE footy_roster_players SET overrides = ?, status = ?, manual = ?, updated_at = CURRENT_TIMESTAMP, updated_by = ? WHERE id = ?")
    .bind(JSON.stringify(overrides), status, manual, managerId, id).run();
  return getRosterPlayer(env, id);
}

async function saveRosterMedia(env, id, body, managerId) {
  if (!env.ROSTER_MEDIA) throw new Error("Roster media storage is not configured.");
  const row = await getRosterPlayerRow(env, id);
  if (!row) throw httpError(404, "Roster player was not found.");
  const kind = ["profile", "card"].includes(body?.kind) ? body.kind : "";
  if (!kind) throw httpError(400, "Image kind must be profile or card.");
  const match = String(body?.dataUrl || "").match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) throw httpError(400, "Upload a PNG, JPEG, or WebP image.");
  const bytes = Uint8Array.from(atob(match[2]), (character) => character.charCodeAt(0));
  if (bytes.byteLength > 5 * 1024 * 1024) throw httpError(413, "Roster images must be 5 MB or smaller.");
  const extension = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" }[match[1]];
  const key = `${row.team_id}/${row.season}/${id}/${kind}.${extension}`;
  const overrides = safeJson(row.overrides);
  const field = kind === "profile" ? "profileImage" : "cardImage";
  const previousPath = String(overrides[field] || "").split("?")[0];
  const previousKey = previousPath.startsWith("/media/rosters/") ? previousPath.slice("/media/rosters/".length) : "";
  if (previousKey && previousKey !== key) await env.ROSTER_MEDIA.delete(previousKey);
  await env.ROSTER_MEDIA.put(key, bytes, { httpMetadata: { contentType: match[1], cacheControl: "public, max-age=31536000, immutable" } });
  overrides[field] = `/media/rosters/${key}?v=${Date.now()}`;
  await env.DB.prepare("UPDATE footy_roster_players SET overrides = ?, updated_at = CURRENT_TIMESTAMP, updated_by = ? WHERE id = ?")
    .bind(JSON.stringify(overrides), managerId, id).run();
  return getRosterPlayer(env, id);
}

async function deleteRosterMedia(env, id, kind, managerId) {
  if (!env.ROSTER_MEDIA) throw new Error("Roster media storage is not configured.");
  if (!["profile", "card"].includes(kind)) throw httpError(400, "Image kind must be profile or card.");
  const row = await getRosterPlayerRow(env, id);
  if (!row) throw httpError(404, "Roster player was not found.");
  const overrides = safeJson(row.overrides);
  const field = kind === "profile" ? "profileImage" : "cardImage";
  const path = String(overrides[field] || "").split("?")[0];
  const key = path.startsWith("/media/rosters/") ? path.slice("/media/rosters/".length) : "";
  if (key) await env.ROSTER_MEDIA.delete(key);
  delete overrides[field];
  await env.DB.prepare("UPDATE footy_roster_players SET overrides = ?, updated_at = CURRENT_TIMESTAMP, updated_by = ? WHERE id = ?")
    .bind(JSON.stringify(overrides), managerId, id).run();
  return getRosterPlayer(env, id);
}

async function getRosterMedia(env, key, cors) {
  if (!env.ROSTER_MEDIA || !key || key.includes("..")) return json({ ok: false, error: "Image was not found." }, 404, cors);
  const object = await env.ROSTER_MEDIA.get(key);
  if (!object) return json({ ok: false, error: "Image was not found." }, 404, cors);
  const headers = new Headers(cors);
  object.writeHttpMetadata(headers);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  headers.delete("Content-Type");
  headers.set("Content-Type", object.httpMetadata?.contentType || "application/octet-stream");
  return new Response(object.body, { headers });
}

async function getRosterPlayerRow(env, id) {
  return env.DB.prepare("SELECT * FROM footy_roster_players WHERE id = ?").bind(id).first();
}

async function getRosterPlayer(env, id) {
  const row = await getRosterPlayerRow(env, id);
  return row ? mapRosterPlayer(row) : null;
}

function mapRosterPlayer(row) {
  const providerData = safeJson(row.provider_data);
  const overrides = safeJson(row.overrides);
  const effective = { ...providerData, ...overrides };
  return { ...effective, id: String(row.id), teamId: String(row.team_id), season: String(row.season), playerKey: String(row.player_key), provider: String(row.provider || ""), providerPlayerId: String(row.provider_player_id || ""), providerData, overrides, status: String(row.status), manual: Boolean(row.manual), reviewDeparture: row.status === "review_departure" };
}

function normalizeRosterData(value) {
  const result = {};
  for (const field of ROSTER_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(value || {}, field)) continue;
    result[field] = ["fromAcademy", "isNew", "transferOut"].includes(field)
      ? Boolean(value[field])
      : cleanText(value[field], field.includes("Image") ? 3000 : 300, field);
  }
  return result;
}

function safeJson(value) {
  try { const parsed = JSON.parse(String(value || "{}")); return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {}; } catch { return {}; }
}

function slugRosterValue(value) {
  return String(value || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function rosterIdentityMatches(row, incoming) {
  const effective = { ...safeJson(row.provider_data), ...safeJson(row.overrides) };
  const rowName = slugRosterValue(effective.name);
  const incomingName = slugRosterValue(incoming.name);
  const rowBirthday = normalizeRosterBirthday(effective.birthday);
  const incomingBirthday = normalizeRosterBirthday(incoming.birthday);
  return Boolean(rowName && incomingName && rowName === incomingName) || Boolean(rowBirthday && incomingBirthday && rowBirthday === incomingBirthday);
}

function normalizeRosterBirthday(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  const direct = text.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  if (direct) return direct;
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

function chooseRosterSurvivor(rows, playerKey) {
  return [...rows].sort((first, second) => rosterRowPriority(second, playerKey) - rosterRowPriority(first, playerKey))[0] || null;
}

function rosterRowPriority(row, playerKey) {
  return (row.updated_by ? 1000 : 0) + (["legacy-sheet", "legacy-history"].includes(row.provider) ? 100 : 0) +
    Object.keys(safeJson(row.overrides)).length * 10 + (row.player_key === playerKey ? 1 : 0);
}

function mergeRosterOverrides(rows, seedOverrides) {
  const ordered = [...rows].sort((first, second) => rosterRowPriority(first, "") - rosterRowPriority(second, ""));
  return normalizeRosterData(Object.assign({}, normalizeRosterData(seedOverrides || {}), ...ordered.map((row) => safeJson(row.overrides))));
}

function requireRosterSync(request, env) {
  const expected = String(env.ROSTER_SYNC_TOKEN || "");
  const supplied = String(request.headers.get("X-Roster-Sync-Token") || "");
  if (!expected || !supplied || supplied !== expected) throw httpError(401, "Roster synchronization is not authorized.");
}

async function listSeenMatches(env) {
  const result = await env.DB.prepare(`
    SELECT id, match_id, home, away, match_date, match_time, competition,
      venue, sports_bar, created_at
    FROM footy_seen_matches
    ORDER BY match_date DESC, match_time DESC, created_at DESC
  `).all();
  return (result.results || []).map(mapSeenMatch);
}

async function saveSeenMatch(env, body, managerId) {
  const seenMatch = normalizeSeenMatch(body);
  const id = crypto.randomUUID();
  try {
    await env.DB.prepare(`
      INSERT INTO footy_seen_matches (
        id, match_id, home, away, match_date, match_time, competition,
        venue, sports_bar, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      seenMatch.matchId,
      seenMatch.home,
      seenMatch.away,
      seenMatch.matchDate,
      seenMatch.matchTime,
      seenMatch.competition,
      seenMatch.venue,
      seenMatch.sportsBar ? 1 : 0,
      managerId,
    ).run();
  } catch (error) {
    if (/unique|constraint/i.test(String(error?.message || "")) && seenMatch.matchId) {
      throw httpError(409, "This fixture is already in Seen Matches.");
    }
    throw error;
  }
  return getSeenMatch(env, id);
}

async function updateSeenMatch(env, id, body, managerId) {
  const seenMatch = normalizeSeenMatch(body);
  const existing = await getSeenMatch(env, id);
  if (!existing) throw httpError(404, "Seen match was not found.");

  await env.DB.prepare(`
    UPDATE footy_seen_matches SET
      match_id = ?, home = ?, away = ?, match_date = ?, match_time = ?,
      competition = ?, venue = ?, sports_bar = ?, updated_by = ?
    WHERE id = ?
  `).bind(
    seenMatch.matchId,
    seenMatch.home,
    seenMatch.away,
    seenMatch.matchDate,
    seenMatch.matchTime,
    seenMatch.competition,
    seenMatch.venue,
    seenMatch.sportsBar ? 1 : 0,
    managerId,
    id,
  ).run();
  return getSeenMatch(env, id);
}

async function getSeenMatch(env, id) {
  const row = await env.DB.prepare(`
    SELECT id, match_id, home, away, match_date, match_time, competition,
      venue, sports_bar, created_at
    FROM footy_seen_matches
    WHERE id = ?
  `).bind(id).first();
  return row ? mapSeenMatch(row) : null;
}

function normalizeSeenMatch(value) {
  const matchDate = cleanText(value?.matchDate, 10, "Match date");
  const matchTime = cleanText(value?.matchTime, 5, "Match time");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(matchDate) || Number.isNaN(Date.parse(`${matchDate}T00:00:00Z`))) {
    throw httpError(400, "Match date is required.");
  }
  if (matchTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(matchTime)) {
    throw httpError(400, "Match time is invalid.");
  }
  return {
    matchId: cleanText(value?.matchId, 200, "Match ID"),
    home: requireText(value?.home, 200, "Home team"),
    away: requireText(value?.away, 200, "Away team"),
    matchDate,
    matchTime,
    competition: cleanText(value?.competition, 200, "Competition"),
    venue: cleanText(value?.venue, 300, "Venue"),
    sportsBar: Boolean(value?.sportsBar),
  };
}

function mapSeenMatch(row) {
  return {
    id: String(row?.id || ""),
    matchId: String(row?.match_id || ""),
    home: String(row?.home || ""),
    away: String(row?.away || ""),
    matchDate: String(row?.match_date || ""),
    matchTime: String(row?.match_time || ""),
    competition: String(row?.competition || ""),
    venue: String(row?.venue || ""),
    sportsBar: Number(row?.sports_bar || 0) === 1,
    createdAt: String(row?.created_at || ""),
  };
}

function parseSeenMatchId(value) {
  let id;
  try {
    id = decodeURIComponent(String(value || "")).trim();
  } catch {
    throw httpError(400, "Seen match ID is invalid.");
  }
  if (!id || id.length > 100) throw httpError(400, "Seen match ID is invalid.");
  return id;
}

async function listTenOutOfTenPerformances(env) {
  const result = await env.DB.prepare(`
    SELECT id, match_id, player_name, player_team_side, home, away, match_date, match_time,
      competition, note, created_at
    FROM footy_ten_out_of_ten
    ORDER BY match_date DESC, match_time DESC, created_at DESC
  `).all();

  return (result.results || []).map(mapTenOutOfTenPerformance);
}

async function saveTenOutOfTenPerformance(env, body, managerId) {
  const performance = normalizeTenOutOfTenPerformance(body);
  const id = crypto.randomUUID();

  await env.DB.prepare(`
    INSERT INTO footy_ten_out_of_ten (
      id, match_id, player_name, player_team_side, home, away, match_date,
      match_time, competition, note, updated_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    performance.matchId,
    performance.playerName,
    performance.playerTeamSide,
    performance.home,
    performance.away,
    performance.matchDate,
    performance.matchTime,
    performance.competition,
    performance.note,
    managerId,
  ).run();

  const row = await env.DB.prepare(`
    SELECT id, match_id, player_name, player_team_side, home, away, match_date, match_time,
      competition, note, created_at
    FROM footy_ten_out_of_ten
    WHERE id = ?
  `).bind(id).first();

  return mapTenOutOfTenPerformance(row);
}

async function updateTenOutOfTenPerformance(env, id, body, managerId) {
  const performance = normalizeTenOutOfTenPerformance(body);
  const existing = await env.DB.prepare(`SELECT id FROM footy_ten_out_of_ten WHERE id = ?`).bind(id).first();
  if (!existing) throw httpError(404, "10/10 performance was not found.");

  await env.DB.prepare(`
    UPDATE footy_ten_out_of_ten SET
      match_id = ?, player_name = ?, player_team_side = ?, home = ?, away = ?,
      match_date = ?, match_time = ?, competition = ?, note = ?, updated_by = ?
    WHERE id = ?
  `).bind(
    performance.matchId,
    performance.playerName,
    performance.playerTeamSide,
    performance.home,
    performance.away,
    performance.matchDate,
    performance.matchTime,
    performance.competition,
    performance.note,
    managerId,
    id,
  ).run();

  const row = await env.DB.prepare(`
    SELECT id, match_id, player_name, player_team_side, home, away, match_date,
      match_time, competition, note, created_at
    FROM footy_ten_out_of_ten
    WHERE id = ?
  `).bind(id).first();
  return mapTenOutOfTenPerformance(row);
}

function normalizeTenOutOfTenPerformance(value) {
  const matchDate = cleanText(value?.matchDate, 10, "Match date");
  const matchTime = cleanText(value?.matchTime, 5, "Match time");

  if (!/^\d{4}-\d{2}-\d{2}$/.test(matchDate) || Number.isNaN(Date.parse(`${matchDate}T00:00:00Z`))) {
    throw httpError(400, "Match date is required.");
  }
  if (matchTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(matchTime)) {
    throw httpError(400, "Match time is invalid.");
  }

  return {
    matchId: cleanText(value?.matchId, 200, "Match ID"),
    playerName: requireText(value?.playerName, 200, "Player name"),
    playerTeamSide: parsePlayerTeamSide(value?.playerTeamSide),
    home: requireText(value?.home, 200, "Home team"),
    away: requireText(value?.away, 200, "Away team"),
    matchDate,
    matchTime,
    competition: cleanText(value?.competition, 200, "Competition"),
    note: cleanText(value?.note, 2000, "Game info"),
  };
}

function mapTenOutOfTenPerformance(row) {
  return {
    id: String(row?.id || ""),
    matchId: String(row?.match_id || ""),
    playerName: String(row?.player_name || ""),
    playerTeamSide: String(row?.player_team_side || ""),
    home: String(row?.home || ""),
    away: String(row?.away || ""),
    matchDate: String(row?.match_date || ""),
    matchTime: String(row?.match_time || ""),
    competition: String(row?.competition || ""),
    note: String(row?.note || ""),
    createdAt: String(row?.created_at || ""),
  };
}

function parsePlayerTeamSide(value) {
  const side = String(value || "").trim().toLowerCase();
  if (!["home", "away"].includes(side)) throw httpError(400, "Choose the player's home or away team.");
  return side;
}

function parsePerformanceId(value) {
  let id;
  try {
    id = decodeURIComponent(String(value || "")).trim();
  } catch {
    throw httpError(400, "Performance ID is invalid.");
  }
  if (!id || id.length > 100) throw httpError(400, "Performance ID is invalid.");
  return id;
}

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
  if (!authorization.startsWith("Bearer ")) throw httpError(401, "Sign in as an admin to edit Footy data.");
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

  if (!adminIds.has(managerId)) throw httpError(403, "Only an admin can edit Footy data.");
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

function requireText(value, maxLength, label) {
  const text = cleanText(value, maxLength, label);
  if (!text) throw httpError(400, `${label} is required.`);
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
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
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
