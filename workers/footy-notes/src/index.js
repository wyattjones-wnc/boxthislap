export default {
  async fetch(request, env, context) {
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
        return getRosterMedia(env, decodeURIComponent(rosterMediaRoute[1]), request, context);
      }

      const matchMediaAssetRoute = url.pathname.match(/^\/media\/match-images\/([^/]+)$/);
      if (request.method === "GET" && matchMediaAssetRoute) {
        return getMatchMediaAsset(env, decodeURIComponent(matchMediaAssetRoute[1]), request, context);
      }

      if (request.method === "GET" && url.pathname === "/api/match-media") {
        const managerId = await requireAdmin(request, env);
        return json({ ok: true, ...(await listMatchMedia(env, managerId, url.searchParams)) }, 200, cors);
      }

      if (request.method === "GET" && url.pathname === "/api/match-media/health") {
        await requireAdmin(request, env);
        return json({ ok: true, ...(await getMatchMediaHealth(env)) }, 200, cors);
      }

      if (request.method === "POST" && url.pathname === "/api/match-media/scans") {
        const managerId = await requireAdmin(request, env);
        const scan = await requestMatchMediaScan(env, managerId);
        return json({ ok: true, scan }, 202, cors);
      }

      const matchMediaScanRoute = url.pathname.match(/^\/api\/match-media\/scans\/([^/]+)$/);
      if (request.method === "GET" && matchMediaScanRoute) {
        await requireAdmin(request, env);
        const scan = await getMatchMediaScan(env, decodeURIComponent(matchMediaScanRoute[1]));
        return json({ ok: true, scan }, 200, cors);
      }

      const matchMediaStateRoute = url.pathname.match(/^\/api\/match-media\/([^/]+)\/state$/);
      if (request.method === "PATCH" && matchMediaStateRoute) {
        const managerId = await requireAdmin(request, env);
        const state = await saveMatchMediaState(env, managerId, decodeURIComponent(matchMediaStateRoute[1]), await readBody(request));
        return json({ ok: true, state }, 200, cors);
      }

      const matchMediaSeenRoute = url.pathname.match(/^\/api\/match-media\/([^/]+)\/seen-through$/);
      if (request.method === "PUT" && matchMediaSeenRoute) {
        const managerId = await requireAdmin(request, env);
        const result = await markMatchMediaSeenThrough(env, managerId, decodeURIComponent(matchMediaSeenRoute[1]), await readBody(request));
        return json({ ok: true, ...result }, 200, cors);
      }

      const matchMediaHardSaveRoute = url.pathname.match(/^\/api\/match-media\/([^/]+)\/hard-save$/);
      if (request.method === "POST" && matchMediaHardSaveRoute) {
        const managerId = await requireAdmin(request, env);
        const image = await hardSaveMatchMedia(env, managerId, decodeURIComponent(matchMediaHardSaveRoute[1]));
        return json({ ok: true, image }, 200, cors);
      }

      const matchMediaGalleryRoute = url.pathname.match(/^\/api\/match-media\/galleries\/([^/]+)$/);
      if (request.method === "PATCH" && matchMediaGalleryRoute) {
        await requireAdmin(request, env);
        const gallery = await reviewMatchMediaGallery(env, decodeURIComponent(matchMediaGalleryRoute[1]), await readBody(request));
        return json({ ok: true, gallery }, 200, cors);
      }

      const matchMediaSyncRoute = url.pathname.match(/^\/api\/match-media\/sync\/scans\/([^/]+)\/(start|import|finish)$/);
      if (request.method === "POST" && matchMediaSyncRoute) {
        requireMatchMediaSync(request, env);
        const scan = await syncMatchMediaScan(env, decodeURIComponent(matchMediaSyncRoute[1]), matchMediaSyncRoute[2], await readBody(request));
        return json({ ok: true, scan }, 200, cors);
      }

      if (request.method === "GET" && url.pathname === "/api/rosters") {
        return json({ ok: true, rosters: await listRosters(env, url.searchParams) }, 200, cors);
      }

      if (request.method === "GET" && url.pathname === "/api/roster-media/usage") {
        await requireAdmin(request, env);
        return json({ ok: true, usage: await getRosterMediaUsage(env) }, 200, cors);
      }

      if (request.method === "POST" && url.pathname === "/api/rosters/sync") {
        requireRosterSync(request, env);
        const result = await syncRosters(env, await readBody(request));
        return json({ ok: true, ...result }, 200, cors);
      }

      if (request.method === "POST" && url.pathname === "/api/rosters/discover") {
        await requireManager(request, env);
        const roster = await discoverRoster(env, await readBody(request));
        return json({ ok: true, roster }, 200, cors);
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
        const result = request.method === "POST"
          ? await saveRosterMedia(env, playerId, await readBody(request), managerId)
          : await deleteRosterMedia(env, playerId, kind, managerId);
        return json({ ok: true, ...result }, 200, cors);
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

const ROSTER_FIELDS = ["name", "position", "number", "appearances", "birthday", "homeCountry", "yearJoined", "clubJoinedFrom", "fromAcademy", "isNew", "transferOutDate", "profileImage", "cardImage", "useDefaultProfileImage", "useDefaultCardImage"];
const ROSTER_MEDIA_STORAGE_LIMIT = 8_000_000_000;
const ROSTER_MEDIA_STORAGE_WARNING = 7_000_000_000;
const ROSTER_MEDIA_MONTHLY_UPLOAD_LIMIT = 250_000;
const ROSTER_MEDIA_MONTHLY_UPLOAD_WARNING = 200_000;

async function discoverRoster(env, body) {
  const teamId = requireText(body?.teamId, 80, "Team ID");
  const teamName = requireText(body?.teamName, 200, "Team name");
  const season = requireText(body?.season, 20, "Season");
  if (!/^\d{4}(?:-\d{2})?$/.test(season)) throw httpError(400, "Season is invalid.");
  const leagueNames = (Array.isArray(body?.leagueNames) ? body.leagueNames : [])
    .slice(0, 20).map((value) => cleanText(value, 160, "League")).filter(Boolean);
  const requestedProviderIds = body?.providerTeamIds && typeof body.providerTeamIds === "object" ? body.providerTeamIds : {};
  const footballDataTeamId = cleanText(requestedProviderIds["football-data.org"], 120, "football-data.org team ID");
  const requestedSportDbTeamId = cleanText(requestedProviderIds.TheSportsDB, 120, "TheSportsDB team ID");
  const providerTeam = requestedSportDbTeamId ? { idTeam: requestedSportDbTeamId } : await discoverSportDbTeam(teamName, leagueNames);
  const sportDbTeamId = String(providerTeam?.idTeam || "");
  const existingParams = new URLSearchParams({ teamId, season, includeInactive: "1" });
  const existingPlayers = (await listRosters(env, existingParams))[0]?.players || [];
  const [footballPlayers, sportDbPlayers] = await Promise.all([
    loadFootballDataRosterPlayers(env, footballDataTeamId),
    loadSportDbRosterPlayers(sportDbTeamId),
  ]);
  const sportDbMedia = footballPlayers.length
    ? await enrichSportDbRosterMedia(footballPlayers, sportDbPlayers, existingPlayers, sportDbTeamId)
    : new Map();
  const players = footballPlayers.length
    ? footballPlayers.map((player) => {
      const media = sportDbMedia.get(String(player.id)) || {};
      return {
        playerKey: `football-data.org:${player.id}`,
        provider: "football-data.org",
        providerPlayerId: String(player.id),
        providerData: {
          name: player.name,
          position: normalizeRosterPosition(player.position),
          number: String(player.shirtNumber || ""),
          birthday: String(player.dateOfBirth || ""),
          homeCountry: String(player.nationality || ""),
          profileImage: media.profileImage || "",
          cardImage: media.cardImage || "",
        },
      };
    })
    : sportDbPlayers.map((player) => ({
      playerKey: `thesportsdb:${player.id}`,
      provider: "TheSportsDB",
      providerPlayerId: player.id,
      providerData: player,
    }));
  if (!players.length) throw httpError(404, `No active players were found for ${teamName}.`);
  const primaryProvider = footballPlayers.length ? "football-data.org" : "TheSportsDB";
  const primaryProviderTeamId = footballPlayers.length ? footballDataTeamId : sportDbTeamId;
  await syncRosters(env, { rosters: [{
    teamId,
    season,
    active: true,
    provider: primaryProvider,
    providerTeamId: primaryProviderTeamId,
    refreshedProviders: [footballPlayers.length ? "football-data.org" : "", sportDbPlayers.length ? "TheSportsDB" : ""].filter(Boolean),
    players,
  }] });
  const params = new URLSearchParams({ teamId, season, includeInactive: "1" });
  return (await listRosters(env, params))[0] || null;
}

async function loadFootballDataRosterPlayers(env, providerTeamId) {
  if (!providerTeamId || !env.FOOTBALL_DATA_API_KEY) return [];
  const response = await fetch(`https://api.football-data.org/v4/teams/${encodeURIComponent(providerTeamId)}`, {
    headers: { "X-Auth-Token": env.FOOTBALL_DATA_API_KEY },
  });
  if (!response.ok) throw httpError(502, `football-data.org could not load this squad (${response.status}).`);
  const value = await response.json().catch(() => null);
  return (Array.isArray(value?.squad) ? value.squad : [])
    .filter((player) => player?.id && player?.name && player?.position);
}

async function loadSportDbRosterPlayers(providerTeamId) {
  if (!providerTeamId) return [];
  const response = await fetch(`https://www.thesportsdb.com/api/v1/json/3/lookup_all_players.php?id=${encodeURIComponent(providerTeamId)}`);
  if (!response.ok) return [];
  const value = await response.json().catch(() => null);
  return (Array.isArray(value?.player) ? value.player : [])
    .filter((player) => player?.idPlayer && player?.strPlayer && isRosterPlayerRole(player.strPosition, player.strStatus))
    .map((player) => ({
      id: String(player.idPlayer),
      name: String(player.strPlayer || ""),
      position: normalizeRosterPosition(player.strPosition),
      number: String(player.strNumber || ""),
      birthday: String(player.dateBorn || ""),
      homeCountry: String(player.strNationality || ""),
      profileImage: String(player.strCutout || player.strRender || player.strThumb || ""),
      cardImage: String(player.strThumb || player.strRender || player.strCutout || ""),
    }));
}

async function enrichSportDbRosterMedia(footballPlayers, teamPlayers, existingPlayers, providerTeamId) {
  const media = new Map();
  const missing = [];
  for (const player of footballPlayers) {
    const teamMatch = findRosterIdentityMatch(player, teamPlayers) || {};
    const existingMatch = findRosterIdentityMatch(player, existingPlayers) || {};
    const resolved = mergeRosterMedia(teamMatch, existingMatch);
    media.set(String(player.id), resolved);
    if ((!resolved.profileImage || !resolved.cardImage) && missing.length < 35) missing.push(player);
  }
  // The free player-search endpoint throttles concurrent bursts. Resolve missing
  // media sequentially and persist it so later refreshes do not repeat the work.
  const searched = await mapWithConcurrency(missing, 1, (player) => searchSportDbRosterPlayer(player, providerTeamId));
  missing.forEach((player, index) => media.set(String(player.id), mergeRosterMedia(searched[index], media.get(String(player.id)))));
  return media;
}

async function searchSportDbRosterPlayer(player, providerTeamId) {
  const response = await fetch(`https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p=${encodeURIComponent(player.name)}`);
  if (!response.ok) return {};
  const value = await response.json().catch(() => null);
  const candidates = (Array.isArray(value?.player) ? value.player : [])
    .filter((candidate) => candidate?.idPlayer && candidate?.strPlayer && isRosterPlayerRole(candidate.strPosition, candidate.strStatus));
  const match = selectSportDbPlayerMatch(player, candidates, providerTeamId);
  return match ? normalizeSportDbRosterPlayer(match) : {};
}

export function selectSportDbPlayerMatch(player, candidates, providerTeamId = "") {
  const exact = candidates.filter((candidate) => findRosterIdentityMatch(player, [{
    name: candidate.strPlayer,
    birthday: candidate.dateBorn,
  }]));
  return exact.sort((first, second) =>
    Number(String(second.idTeam || "") === String(providerTeamId)) - Number(String(first.idTeam || "") === String(providerTeamId)))[0] || null;
}

function normalizeSportDbRosterPlayer(player) {
  return {
    id: String(player.idPlayer),
    name: String(player.strPlayer || ""),
    position: normalizeRosterPosition(player.strPosition),
    number: String(player.strNumber || ""),
    birthday: String(player.dateBorn || ""),
    homeCountry: String(player.strNationality || ""),
    profileImage: String(player.strCutout || player.strRender || player.strThumb || ""),
    cardImage: String(player.strThumb || player.strRender || player.strCutout || ""),
  };
}

function mergeRosterMedia(primary = {}, fallback = {}) {
  return {
    profileImage: String(primary?.profileImage || fallback?.profileImage || ""),
    cardImage: String(primary?.cardImage || fallback?.cardImage || ""),
  };
}

async function mapWithConcurrency(values, concurrency, callback) {
  const results = new Array(values.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, async () => {
    while (next < values.length) {
      const index = next++;
      results[index] = await callback(values[index], index);
    }
  }));
  return results;
}

function findRosterIdentityMatch(player, candidates) {
  const name = slugRosterValue(player?.name);
  const birthday = normalizeRosterBirthday(player?.birthday || player?.dateOfBirth);
  return candidates.find((candidate) =>
    (name && slugRosterValue(candidate?.name) === name) ||
    (birthday && normalizeRosterBirthday(candidate?.birthday || candidate?.dateOfBirth) === birthday));
}

export function isRosterPlayerRole(position, status) {
  return !/coach|manager|coaching|chief|ceo|president|director|chairman|owner|staff/i.test(`${position || ""} ${status || ""}`);
}

async function discoverSportDbTeam(teamName, leagueNames) {
  const queries = [...new Set([teamName, stripRosterClubSuffix(teamName)].filter(Boolean))];
  const candidates = new Map();
  for (const query of queries) {
    const response = await fetch(`https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(query)}`);
    if (!response.ok) continue;
    const value = await response.json().catch(() => null);
    for (const team of Array.isArray(value?.teams) ? value.teams : []) {
      if (team?.idTeam) candidates.set(String(team.idTeam), team);
    }
  }
  return [...candidates.values()]
    .filter((team) => String(team.strSport || "").toLowerCase() === "soccer")
    .sort((first, second) => scoreRosterTeam(second, teamName, leagueNames) - scoreRosterTeam(first, teamName, leagueNames))[0] || null;
}

function scoreRosterTeam(team, teamName, leagueNames) {
  const candidateName = slugRosterValue(team.strTeam);
  const requestedName = slugRosterValue(teamName);
  const strippedName = slugRosterValue(stripRosterClubSuffix(teamName));
  const league = slugRosterValue(team.strLeague);
  const leagueMatch = leagueNames.some((name) => {
    const normalized = slugRosterValue(name);
    return normalized && league && (league.includes(normalized) || normalized.includes(league));
  });
  return (candidateName === requestedName ? 100 : 0) + (candidateName === strippedName ? 90 : 0) +
    (leagueMatch ? 40 : 0) + (/male/i.test(String(team.strGender || "")) ? 20 : 0) -
    (/women|ladies|u\d{2}|youth|reserve/i.test(`${team.strTeam || ""} ${team.strLeague || ""}`) ? 80 : 0);
}

function stripRosterClubSuffix(value) {
  return String(value || "").replace(/\*+$/g, "").replace(/\s+(?:AFC|FC|CF|SC)$/i, "").trim();
}

function normalizeRosterPosition(value) {
  const position = String(value || "").trim();
  return ({ Goalkeeper: "GK", Defence: "DF", Defender: "DF", Midfield: "MF", Midfielder: "MF", Offence: "FW", Attacker: "FW", Forward: "FW" })[position] || position;
}

async function listRosters(env, searchParams) {
  const teamId = cleanText(searchParams.get("teamId"), 80, "Team ID");
  const season = cleanText(searchParams.get("season"), 20, "Season");
  const conditions = searchParams.get("includeArchived") === "1" ? ["1 = 1"] : ["p.status <> 'archived'"];
  const bindings = [];
  if (teamId) { conditions.push("p.team_id = ?"); bindings.push(teamId); }
  if (season) { conditions.push("p.season = ?"); bindings.push(season); }
  if (!season && searchParams.get("includeInactive") !== "1") conditions.push("(s.is_active = 1 OR s.is_active IS NULL)");
  const result = await env.DB.prepare(`
    SELECT p.*, COALESCE(s.is_active, 0) AS is_active,
      COALESCE(s.provider, '') AS roster_provider,
      COALESCE(s.provider_team_id, '') AS roster_provider_team_id
    FROM footy_roster_players p
    LEFT JOIN footy_roster_seasons s ON s.team_id = p.team_id AND s.season = p.season
    WHERE ${conditions.join(" AND ")}
    ORDER BY p.team_id, p.season DESC, p.status, p.created_at
  `).bind(...bindings).all();
  const groups = new Map();
  for (const row of result.results || []) {
    const key = `${row.team_id}|${row.season}`;
    if (!groups.has(key)) groups.set(key, {
      teamId: String(row.team_id),
      season: String(row.season),
      active: Boolean(row.is_active),
      provider: String(row.roster_provider || ""),
      providerTeamId: String(row.roster_provider_team_id || ""),
      players: [],
    });
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
    const rosterProvider = cleanText(rosterValue?.provider, 80, "Roster provider");
    const rosterProviderTeamId = cleanText(rosterValue?.providerTeamId, 120, "Roster provider team ID");
    const players = Array.isArray(rosterValue?.players) ? rosterValue.players : [];
    const refreshedProviders = new Set((Array.isArray(rosterValue?.refreshedProviders) ? rosterValue.refreshedProviders : [])
      .map((value) => cleanText(value, 80, "Provider")).filter(Boolean));
    if (players.length > 200) throw httpError(400, "A roster has too many players.");
    const isActive = rosterValue?.active !== false;
    const seasonStatements = [];
    if (isActive) seasonStatements.push(env.DB.prepare("UPDATE footy_roster_seasons SET is_active = 0, updated_at = ? WHERE team_id = ? AND season <> ? AND is_active <> 0").bind(now, teamId, season));
    seasonStatements.push(env.DB.prepare(`INSERT INTO footy_roster_seasons
      (team_id, season, is_active, provider, provider_team_id, last_synced_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(team_id, season) DO UPDATE SET
      is_active = excluded.is_active,
      provider = CASE WHEN excluded.provider <> '' THEN excluded.provider ELSE footy_roster_seasons.provider END,
      provider_team_id = CASE WHEN excluded.provider_team_id <> '' THEN excluded.provider_team_id ELSE footy_roster_seasons.provider_team_id END,
      last_synced_at = excluded.last_synced_at,
      updated_at = excluded.updated_at`).bind(teamId, season, isActive ? 1 : 0, rosterProvider, rosterProviderTeamId, now, now));
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
        const storedProviderData = JSON.stringify(providerData);
        const storedOverrides = JSON.stringify(mergedOverrides);
        const nextStatus = existing.status === "archived" ? "archived" : "active";
        const changed = existing.player_key !== playerKey
          || existing.provider !== provider
          || String(existing.provider_player_id || "") !== providerPlayerId
          || String(existing.provider_data || "") !== storedProviderData
          || String(existing.overrides || "") !== storedOverrides
          || existing.status !== nextStatus
          || Number(existing.manual) !== manual;
        if (changed) {
          await env.DB.prepare(`UPDATE footy_roster_players SET player_key = ?, provider = ?, provider_player_id = ?, provider_data = ?, overrides = ?,
            status = ?, manual = ?, source_seen_at = ?, updated_at = ? WHERE id = ?`)
            .bind(playerKey, provider, providerPlayerId, storedProviderData, storedOverrides, nextStatus, manual, now, now, id).run();
          updated += 1;
        }
        existingRows = existingRows.map((row) => row.id === id ? { ...row, player_key: playerKey, provider, provider_player_id: providerPlayerId, provider_data: storedProviderData, overrides: storedOverrides, status: nextStatus, manual } : row);
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
    const seen = new Set(seenKeys);
    for (const row of existingRows.filter((value) => Number(value.manual) === 0 && value.status === "active")) {
      if (seen.has(row.player_key)) continue;
      if (refreshedProviders.size && !refreshedProviders.has(String(row.provider || ""))) continue;
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
  await ensureRosterMediaLedger(env);
  const extension = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" }[match[1]];
  const key = `${row.team_id}/${row.season}/${id}/${kind}-${Date.now()}.${extension}`;
  const overrides = safeJson(row.overrides);
  const field = kind === "profile" ? "profileImage" : "cardImage";
  const defaultField = kind === "profile" ? "useDefaultProfileImage" : "useDefaultCardImage";
  const previousPath = String(overrides[field] || "").split("?")[0];
  const previousKey = previousPath.startsWith("/media/rosters/") ? previousPath.slice("/media/rosters/".length) : "";
  const usage = await getRosterMediaUsage(env, { reconciled: true });
  const previousObject = previousKey
    ? await env.DB.prepare("SELECT size_bytes FROM footy_roster_media_objects WHERE object_key = ?").bind(previousKey).first()
    : null;
  const projectedStorage = usage.storageBytes - Number(previousObject?.size_bytes || 0) + bytes.byteLength;
  if (projectedStorage > ROSTER_MEDIA_STORAGE_LIMIT) throw httpError(413, "Roster media has reached its free-tier safety limit. Delete or replace images before uploading more.");
  if (usage.monthlyUploads >= ROSTER_MEDIA_MONTHLY_UPLOAD_LIMIT) throw httpError(429, "Roster media has reached its monthly upload safety limit. Try again next month.");
  if (previousKey && previousKey !== key) await env.ROSTER_MEDIA.delete(previousKey);
  await env.ROSTER_MEDIA.put(key, bytes, { httpMetadata: { contentType: match[1], cacheControl: "public, max-age=31536000, immutable" } });
  const period = new Date().toISOString().slice(0, 7);
  const statements = [
    env.DB.prepare(`INSERT INTO footy_roster_media_objects (object_key, size_bytes, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(object_key) DO UPDATE SET size_bytes = excluded.size_bytes, updated_at = CURRENT_TIMESTAMP`).bind(key, bytes.byteLength),
    env.DB.prepare(`INSERT INTO footy_roster_media_usage (period, upload_count, updated_at) VALUES (?, 1, CURRENT_TIMESTAMP)
      ON CONFLICT(period) DO UPDATE SET upload_count = upload_count + 1, updated_at = CURRENT_TIMESTAMP`).bind(period),
  ];
  if (previousKey && previousKey !== key) statements.push(env.DB.prepare("DELETE FROM footy_roster_media_objects WHERE object_key = ?").bind(previousKey));
  await env.DB.batch(statements);
  overrides[field] = `/media/rosters/${key}`;
  delete overrides[defaultField];
  await env.DB.prepare("UPDATE footy_roster_players SET overrides = ?, updated_at = CURRENT_TIMESTAMP, updated_by = ? WHERE id = ?")
    .bind(JSON.stringify(overrides), managerId, id).run();
  return { player: await getRosterPlayer(env, id), usage: await getRosterMediaUsage(env, { reconciled: true }) };
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
  if (key) await env.DB.prepare("DELETE FROM footy_roster_media_objects WHERE object_key = ?").bind(key).run();
  delete overrides[field];
  await env.DB.prepare("UPDATE footy_roster_players SET overrides = ?, updated_at = CURRENT_TIMESTAMP, updated_by = ? WHERE id = ?")
    .bind(JSON.stringify(overrides), managerId, id).run();
  return { player: await getRosterPlayer(env, id), usage: await getRosterMediaUsage(env) };
}

async function getRosterMediaUsage(env, options = {}) {
  if (!env.ROSTER_MEDIA) throw new Error("Roster media storage is not configured.");
  if (!options.reconciled) await ensureRosterMediaLedger(env);
  const storage = await env.DB.prepare("SELECT COALESCE(SUM(size_bytes), 0) AS storage_bytes, COUNT(*) AS object_count FROM footy_roster_media_objects").first();
  const period = new Date().toISOString().slice(0, 7);
  const monthly = await env.DB.prepare("SELECT upload_count FROM footy_roster_media_usage WHERE period = ?").bind(period).first();
  const storageBytes = Number(storage?.storage_bytes || 0);
  const monthlyUploads = Number(monthly?.upload_count || 0);
  return {
    storageBytes,
    objectCount: Number(storage?.object_count || 0),
    monthlyUploads,
    storageLimitBytes: ROSTER_MEDIA_STORAGE_LIMIT,
    monthlyUploadLimit: ROSTER_MEDIA_MONTHLY_UPLOAD_LIMIT,
    warning: storageBytes >= ROSTER_MEDIA_STORAGE_WARNING || monthlyUploads >= ROSTER_MEDIA_MONTHLY_UPLOAD_WARNING,
  };
}

async function ensureRosterMediaLedger(env) {
  const initialized = await env.DB.prepare("SELECT state_value FROM footy_roster_media_state WHERE state_key = 'r2-ledger-initialized'").first();
  if (initialized?.state_value === "1") return;
  let cursor;
  do {
    const page = await env.ROSTER_MEDIA.list({ cursor, limit: 1000 });
    const statements = (page.objects || []).map((object) => env.DB.prepare(`INSERT INTO footy_roster_media_objects
      (object_key, size_bytes, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(object_key) DO UPDATE SET size_bytes = excluded.size_bytes, updated_at = CURRENT_TIMESTAMP`).bind(object.key, object.size));
    if (statements.length) await env.DB.batch(statements);
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
  await env.DB.prepare(`INSERT INTO footy_roster_media_state (state_key, state_value, updated_at) VALUES ('r2-ledger-initialized', '1', CURRENT_TIMESTAMP)
    ON CONFLICT(state_key) DO UPDATE SET state_value = '1', updated_at = CURRENT_TIMESTAMP`).run();
}

async function getRosterMedia(env, key, request, context) {
  const headers = new Headers({ "Access-Control-Allow-Origin": "*" });
  if (!env.ROSTER_MEDIA || !key || key.includes("..")) return json({ ok: false, error: "Image was not found." }, 404, headers);
  const cacheUrl = new URL(request.url);
  cacheUrl.search = "";
  const cacheKey = new Request(cacheUrl.toString(), { method: "GET" });
  const cache = typeof caches === "undefined" ? null : caches.default;
  const cached = cache ? await cache.match(cacheKey) : null;
  if (cached) return cached;
  const object = await env.ROSTER_MEDIA.get(key);
  if (!object) return json({ ok: false, error: "Image was not found." }, 404, headers);
  object.writeHttpMetadata(headers);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  headers.delete("Content-Type");
  headers.set("Content-Type", object.httpMetadata?.contentType || "application/octet-stream");
  const response = new Response(object.body, { headers });
  if (cache) context?.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
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
    result[field] = ["fromAcademy", "isNew", "useDefaultProfileImage", "useDefaultCardImage"].includes(field)
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
    SELECT match_id, home_score, away_score, kit, follow_goal_assists,
      opponent_goal_assists, note, highlight_link, revision, updated_at
    FROM footy_match_notes
    ORDER BY match_id
  `).all();

  return (result.results || []).map(mapMatchNote);
}

async function getMatchNote(env, matchId) {
  const row = await env.DB.prepare(`
    SELECT match_id, home_score, away_score, kit, follow_goal_assists,
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
    note.kit,
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
      match_id, home_score, away_score, kit, follow_goal_assists,
      opponent_goal_assists, note, highlight_link, revision, updated_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(match_id) DO UPDATE SET
      home_score = excluded.home_score,
      away_score = excluded.away_score,
      kit = excluded.kit,
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
        note.kit,
        JSON.stringify(note.followGoalAssists),
        JSON.stringify(note.opponentGoalAssists),
        note.note,
        note.highlightLink,
        nextRevision,
        managerId,
      ),
      env.DB.prepare(`
        INSERT INTO footy_match_note_history (
          match_id, revision, home_score, away_score, kit, follow_goal_assists,
          opponent_goal_assists, note, highlight_link, changed_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
  const managerId = await requireManager(request, env);
  const adminIds = new Set(String(env.ADMIN_MANAGER_IDS || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean));

  if (!adminIds.has(managerId)) throw httpError(403, "Only an admin can edit Footy data.");
  return managerId;
}

async function requireManager(request, env) {
  const authorization = request.headers.get("Authorization") || "";
  if (!authorization.startsWith("Bearer ")) throw httpError(401, "Sign in to load this roster.");
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

  return String(value.managerId);
}

function normalizeMatchNote(note) {
  return {
    matchId: parseMatchId(note.matchId),
    homeScore: cleanText(note.homeScore, 20, "Home score"),
    awayScore: cleanText(note.awayScore, 20, "Away score"),
    kit: normalizeMatchKit(note.kit),
    followGoalAssists: normalizeGoalAssists(note.followGoalAssists),
    opponentGoalAssists: normalizeGoalAssists(note.opponentGoalAssists),
    note: cleanText(note.note, 10000, "Note"),
    highlightLink: cleanHighlightLink(note.highlightLink),
  };
}

const MATCH_MEDIA_SOURCES = new Set(["arsenal", "barcelona", "getty"]);
const MATCH_MEDIA_CATEGORIES = new Set(["match", "celebration", "training", "behind_scenes", "other"]);
const MATCH_MEDIA_VIEWS = new Set(["unseen", "saved", "hard-saved", "seen", "needs-match", "all"]);
const MATCH_MEDIA_ASSET_LIMIT = 15 * 1024 * 1024;

function matchMediaChoice(value, allowed, fallback, label) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return fallback;
  if (!allowed.has(normalized)) throw httpError(400, `Invalid ${label}.`);
  return normalized;
}

function matchMediaPage(value) {
  const parsed = Number.parseInt(String(value || "1"), 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
}

export async function listMatchMedia(env, managerId, searchParams) {
  const view = matchMediaChoice(searchParams.get("view"), MATCH_MEDIA_VIEWS, "unseen", "view");
  const source = matchMediaChoice(searchParams.get("source"), MATCH_MEDIA_SOURCES, "", "source");
  const category = matchMediaChoice(searchParams.get("category"), MATCH_MEDIA_CATEGORIES, "", "category");
  const teamId = String(searchParams.get("teamId") || "").trim();
  const matchId = String(searchParams.get("matchId") || "").trim();
  const page = matchMediaPage(searchParams.get("page"));
  const limit = 48;
  const where = [];
  const bindings = [managerId];
  if (view === "unseen") where.push("s.seen_at IS NULL", "g.match_status IN ('auto', 'manual')");
  if (view === "saved") where.push("s.soft_saved_at IS NOT NULL");
  if (view === "hard-saved") where.push("i.hard_saved_at IS NOT NULL");
  if (view === "seen") where.push("s.seen_at IS NOT NULL");
  if (view === "needs-match") where.push("g.match_status = 'review'");
  if (view === "all") where.push("g.match_status NOT IN ('rejected', 'unmatched')");
  if (source) { where.push("i.source = ?"); bindings.push(source); }
  if (category) { where.push("g.category = ?"); bindings.push(category); }
  if (teamId) { where.push("g.team_id = ?"); bindings.push(teamId); }
  if (matchId) { where.push("g.match_id = ?"); bindings.push(matchId); }
  const predicate = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const base = `
    FROM footy_media_images i
    JOIN footy_media_gallery_images gi ON gi.image_id = i.id
    JOIN footy_media_galleries g ON g.id = gi.gallery_id
    LEFT JOIN footy_media_manager_state s ON s.image_id = i.id AND s.manager_id = ?
    ${predicate}`;
  const count = await env.DB.prepare(`SELECT COUNT(DISTINCT i.id) AS count ${base}`).bind(...bindings).first();
  const rows = await env.DB.prepare(`
    SELECT i.id, i.source, i.source_image_url, i.normalized_url, i.original_page_url, i.render_mode, i.embed_url,
      i.caption, i.photographer_credit, i.width, i.height, i.duplicate_of_image_id,
      i.first_observed_at, i.hard_saved_at, i.hard_save_error,
      s.seen_at, s.soft_saved_at,
      g.id AS gallery_id, g.team_id, g.match_id, g.source_url AS gallery_url, g.title AS gallery_title,
      g.published_at, g.category, g.match_confidence, g.match_status, g.match_evidence
    ${base}
    GROUP BY i.id
    ORDER BY COALESCE(g.published_at, i.first_observed_at) DESC, gi.ordinal ASC, i.id ASC
    LIMIT ? OFFSET ?
  `).bind(...bindings, limit, (page - 1) * limit).all();
  const images = (rows.results || []).map((row) => ({
    id: row.id,
    source: row.source,
    sourceImageUrl: matchMediaSourceUrl(row),
    originalPageUrl: row.original_page_url,
    renderMode: row.render_mode,
    embedUrl: row.embed_url || "",
    caption: row.caption || "",
    credit: row.photographer_credit || "",
    width: row.width === null ? null : Number(row.width),
    height: row.height === null ? null : Number(row.height),
    duplicateOfImageId: row.duplicate_of_image_id || "",
    firstObservedAt: row.first_observed_at,
    seen: Boolean(row.seen_at),
    softSaved: Boolean(row.soft_saved_at),
    hardSaved: Boolean(row.hard_saved_at),
    hardSaveEligible: row.source !== "getty" && row.render_mode === "image" && Boolean(row.source_image_url),
    hardSaveError: row.hard_save_error || "",
    assetUrl: row.hard_saved_at ? `/media/match-images/${encodeURIComponent(row.id)}` : "",
    gallery: {
      id: row.gallery_id,
      sourceUrl: row.gallery_url,
      title: row.gallery_title,
      publishedAt: row.published_at || "",
      category: row.category,
      matchConfidence: Number(row.match_confidence || 0),
      matchStatus: row.match_status,
      matchEvidence: safeJsonValue(row.match_evidence, []),
    },
    teamId: row.team_id,
    matchId: row.match_id || "",
  }));
  const facets = await env.DB.prepare(`
    SELECT DISTINCT g.team_id, g.match_id, g.title, g.published_at
    FROM footy_media_galleries g
    WHERE g.match_status IN ('auto', 'manual', 'review')
    ORDER BY g.published_at DESC
  `).all();
  return {
    images,
    pagination: { page, pageSize: limit, total: Number(count?.count || 0), hasMore: page * limit < Number(count?.count || 0) },
    facets: facets.results || [],
    filters: { view, source, category, teamId, matchId },
  };
}

function safeJsonValue(value, fallback) {
  try { return value ? JSON.parse(value) : fallback; } catch { return fallback; }
}

export async function saveMatchMediaState(env, managerId, imageId, body) {
  if (typeof body.softSaved !== "boolean") throw httpError(400, "Soft Save state must be boolean.");
  const image = await env.DB.prepare("SELECT id FROM footy_media_images WHERE id = ?").bind(imageId).first();
  if (!image) throw httpError(404, "Match image was not found.");
  const current = await env.DB.prepare("SELECT seen_at FROM footy_media_manager_state WHERE manager_id = ? AND image_id = ?").bind(managerId, imageId).first();
  const now = new Date().toISOString();
  const softSavedAt = body.softSaved ? now : null;
  await env.DB.prepare(`
    INSERT INTO footy_media_manager_state (manager_id, image_id, seen_at, soft_saved_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(manager_id, image_id) DO UPDATE SET soft_saved_at = excluded.soft_saved_at, updated_at = excluded.updated_at
  `).bind(managerId, imageId, current?.seen_at || null, softSavedAt, now).run();
  return { imageId, seen: Boolean(current?.seen_at), softSaved: Boolean(softSavedAt), softSavedAt };
}

export async function markMatchMediaSeenThrough(env, managerId, imageId, body) {
  if (String(body.sort || "newest") !== "newest") throw httpError(400, "Seen through requires newest-first sorting.");
  const galleryId = String(body.galleryId || "").trim();
  const anchor = await env.DB.prepare(`
    SELECT i.id, gi.ordinal, g.id AS gallery_id
    FROM footy_media_images i
    JOIN footy_media_gallery_images gi ON gi.image_id = i.id
    JOIN footy_media_galleries g ON g.id = gi.gallery_id
    LEFT JOIN footy_media_manager_state s ON s.image_id = i.id AND s.manager_id = ?
    WHERE i.id = ? ${galleryId ? "AND g.id = ?" : ""} AND s.seen_at IS NULL AND g.match_status IN ('auto', 'manual')
    LIMIT 1
  `).bind(managerId, imageId, ...(galleryId ? [galleryId] : [])).first();
  if (!anchor) throw httpError(409, "That image is no longer in the current unseen feed.");
  const scopedGalleryId = String(anchor.gallery_id);
  const now = new Date().toISOString();
  const result = await env.DB.prepare(`
    INSERT INTO footy_media_manager_state (manager_id, image_id, seen_at, soft_saved_at, updated_at)
    SELECT ?, i.id, ?, s.soft_saved_at, ?
    FROM footy_media_images i
    JOIN footy_media_gallery_images gi ON gi.image_id = i.id
    JOIN footy_media_galleries g ON g.id = gi.gallery_id
    LEFT JOIN footy_media_manager_state s ON s.image_id = i.id AND s.manager_id = ?
    WHERE s.seen_at IS NULL AND g.match_status IN ('auto', 'manual')
      AND g.id = ? AND gi.ordinal <= ?
    GROUP BY i.id
    ON CONFLICT(manager_id, image_id) DO UPDATE SET seen_at = excluded.seen_at, updated_at = excluded.updated_at
  `).bind(managerId, now, now, managerId, scopedGalleryId, anchor.ordinal).run();
  return { seen: Number(result.meta?.changes || 0) };
}

function assertPublicImageUrl(value) {
  let url;
  try { url = new URL(String(value || "")); } catch { throw httpError(400, "The source image URL is invalid."); }
  if (url.protocol !== "https:") throw httpError(400, "The source image must use HTTPS.");
  const host = url.hostname.toLowerCase();
  if (!host || host === "localhost" || host.endsWith(".local") || /^(?:127\.|10\.|192\.168\.|169\.254\.)/.test(host) || /^172\.(?:1[6-9]|2\d|3[01])\./.test(host)) {
    throw httpError(400, "The source image host is not allowed.");
  }
  return url;
}

function matchMediaSourceUrl(row) {
  const value = String(row.normalized_url || row.source_image_url || "")
    .replaceAll("\\u003d", "=")
    .replaceAll("\\u0026", "&")
    .replace(/,+$/, "");
  if (row.source !== "barcelona") return value;
  try {
    const url = new URL(value);
    if (!url.searchParams.has("width") && !url.searchParams.has("height"))
      url.searchParams.set("width", "1200");
    return url.href;
  } catch {
    return value;
  }
}

export async function hardSaveMatchMedia(env, managerId, imageId) {
  if (!env.MATCH_MEDIA) throw new Error("Match image storage is not configured.");
  const image = await env.DB.prepare("SELECT * FROM footy_media_images WHERE id = ?").bind(imageId).first();
  if (!image) throw httpError(404, "Match image was not found.");
  if (image.source === "getty" || image.render_mode !== "image") throw httpError(409, "Getty embeds cannot be copied to R2.");
  if (image.hard_asset_key) return mapHardSavedImage(image);
  try {
  const sourceUrl = assertPublicImageUrl(matchMediaSourceUrl(image));
  const response = await fetch(sourceUrl, { redirect: "follow", headers: { Accept: "image/avif,image/webp,image/png,image/jpeg,image/*" } });
  if (!response.ok) throw httpError(502, `The source image returned HTTP ${response.status}.`);
  assertPublicImageUrl(response.url);
  const mime = String(response.headers.get("Content-Type") || "").split(";", 1)[0].toLowerCase();
  const extensions = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" };
  if (!extensions[mime]) throw httpError(415, "The source did not return a supported image type.");
  const contentLength = Number(response.headers.get("Content-Length") || 0);
  if (contentLength > MATCH_MEDIA_ASSET_LIMIT) throw httpError(413, "The source image is larger than 15 MB.");
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > MATCH_MEDIA_ASSET_LIMIT) throw httpError(413, "The source image is larger than 15 MB.");
  const hashBytes = await crypto.subtle.digest("SHA-256", bytes);
  const contentHash = [...new Uint8Array(hashBytes)].map((value) => value.toString(16).padStart(2, "0")).join("");
  const duplicate = await env.DB.prepare("SELECT id FROM footy_media_images WHERE content_hash = ? AND id <> ? LIMIT 1").bind(contentHash, imageId).first();
  const key = `match-images/${imageId}.${extensions[mime]}`;
  await env.MATCH_MEDIA.put(key, bytes, { httpMetadata: { contentType: mime, cacheControl: "public, max-age=31536000, immutable" }, customMetadata: { source: image.source, sourceUrl: String(sourceUrl) } });
  const now = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare(`UPDATE footy_media_images SET content_hash = ?, duplicate_of_image_id = ?, hard_asset_key = ?, hard_asset_mime = ?, hard_asset_size = ?, hard_saved_at = ?, hard_save_error = NULL WHERE id = ?`).bind(contentHash, duplicate?.id || null, key, mime, bytes.byteLength, now, imageId),
    env.DB.prepare(`INSERT INTO footy_media_manager_state (manager_id, image_id, seen_at, soft_saved_at, updated_at)
      VALUES (?, ?, NULL, ?, ?) ON CONFLICT(manager_id, image_id) DO UPDATE SET soft_saved_at = COALESCE(footy_media_manager_state.soft_saved_at, excluded.soft_saved_at), updated_at = excluded.updated_at`).bind(managerId, imageId, now, now),
  ]);
  return mapHardSavedImage({ ...image, hard_asset_key: key, hard_asset_mime: mime, hard_asset_size: bytes.byteLength, hard_saved_at: now, duplicate_of_image_id: duplicate?.id || null });
  } catch (error) {
    await env.DB.prepare("UPDATE footy_media_images SET hard_save_error = ? WHERE id = ?").bind(String(error?.message || "Hard Save failed.").slice(0, 500), imageId).run();
    throw error;
  }
}

function mapHardSavedImage(row) {
  return { id: row.id, hardSaved: Boolean(row.hard_saved_at), softSaved: true, assetUrl: row.hard_saved_at ? `/media/match-images/${encodeURIComponent(row.id)}` : "", duplicateOfImageId: row.duplicate_of_image_id || "", mime: row.hard_asset_mime || "", size: Number(row.hard_asset_size || 0) };
}

async function getMatchMediaAsset(env, imageId, request, context) {
  if (!env.MATCH_MEDIA) return new Response("Not found.", { status: 404 });
  const row = await env.DB.prepare("SELECT hard_asset_key FROM footy_media_images WHERE id = ?").bind(imageId).first();
  if (!row?.hard_asset_key) return new Response("Not found.", { status: 404 });
  const object = await env.MATCH_MEDIA.get(row.hard_asset_key);
  if (!object) return new Response("Not found.", { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  headers.set("ETag", object.httpEtag);
  if (request.headers.get("If-None-Match") === object.httpEtag) return new Response(null, { status: 304, headers });
  context?.waitUntil?.(Promise.resolve());
  return new Response(object.body, { headers });
}

export async function reviewMatchMediaGallery(env, galleryId, body) {
  const current = await env.DB.prepare("SELECT * FROM footy_media_galleries WHERE id = ?").bind(galleryId).first();
  if (!current) throw httpError(404, "Gallery was not found.");
  const rejected = body.rejected === true;
  const category = body.category === undefined ? current.category : matchMediaChoice(body.category, MATCH_MEDIA_CATEGORIES, "other", "category");
  const matchId = rejected ? null : String(body.matchId || "").trim();
  const mayRemainMatchless = ["training", "behind_scenes", "other"].includes(category);
  if (!rejected && !matchId && !mayRemainMatchless) throw httpError(400, "Choose a match, choose a non-match category, or reject the gallery.");
  await env.DB.prepare("UPDATE footy_media_galleries SET match_id = ?, match_status = ?, category = ?, last_observed_at = ? WHERE id = ?").bind(matchId || null, rejected ? "rejected" : "manual", category, new Date().toISOString(), galleryId).run();
  return { id: galleryId, matchId: matchId || "", matchStatus: rejected ? "rejected" : "manual", category };
}

function mapMatchMediaScan(row) {
  if (!row) return null;
  return {
    id: row.id,
    status: row.status,
    requestedAt: row.requested_at,
    startedAt: row.started_at || "",
    finishedAt: row.finished_at || "",
    sourceCount: Number(row.source_count || 0),
    galleryCount: Number(row.gallery_count || 0),
    newImageCount: Number(row.new_image_count || 0),
    existingImageCount: Number(row.existing_image_count || 0),
    unmatchedGalleryCount: Number(row.unmatched_gallery_count || 0),
    errorCount: Number(row.error_count || 0),
    errorSummary: row.error_summary || "",
    report: safeJsonValue(row.report_json, null),
  };
}

export async function getMatchMediaScan(env, scanId) {
  const row = await env.DB.prepare("SELECT * FROM footy_media_scans WHERE id = ?").bind(scanId).first();
  if (!row) throw httpError(404, "Scan was not found.");
  return mapMatchMediaScan(row);
}

export async function requestMatchMediaScan(env, managerId) {
  const active = await env.DB.prepare("SELECT * FROM footy_media_scans WHERE status IN ('queued', 'running') ORDER BY requested_at DESC LIMIT 1").first();
  if (active) throw httpError(409, "A match image scan is already active.");
  if (!env.GITHUB_ACTIONS_TOKEN || !env.GITHUB_REPOSITORY) throw httpError(503, "Manual match image scanning is not configured.");
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await env.DB.prepare("INSERT INTO footy_media_scans (id, requested_by, requested_at, status) VALUES (?, ?, ?, 'queued')").bind(id, managerId, now).run();
  const workflow = String(env.GITHUB_MEDIA_WORKFLOW || "update-footy-media.yml");
  const response = await fetch(`https://api.github.com/repos/${env.GITHUB_REPOSITORY}/actions/workflows/${encodeURIComponent(workflow)}/dispatches`, {
    method: "POST",
    headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${env.GITHUB_ACTIONS_TOKEN}`, "Content-Type": "application/json", "User-Agent": "box-this-lap-footy-media" },
    body: JSON.stringify({ ref: String(env.GITHUB_MEDIA_REF || "dev"), inputs: { request_id: id } }),
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300);
    await env.DB.prepare("UPDATE footy_media_scans SET status = 'failed', finished_at = ?, error_count = 1, error_summary = ? WHERE id = ?").bind(new Date().toISOString(), `GitHub dispatch failed (${response.status}): ${detail}`, id).run();
    throw httpError(502, "GitHub could not start the match image scan.");
  }
  return getMatchMediaScan(env, id);
}

export async function getMatchMediaHealth(env) {
  const latestScan = await env.DB.prepare("SELECT * FROM footy_media_scans ORDER BY requested_at DESC LIMIT 1").first();
  const runs = await env.DB.prepare(`
    SELECT current.*,
      (SELECT finished_at FROM footy_media_source_runs successful WHERE successful.source = current.source AND successful.status = 'completed' ORDER BY finished_at DESC LIMIT 1) AS last_success_at
    FROM footy_media_source_runs current
    WHERE started_at = (SELECT MAX(candidate.started_at) FROM footy_media_source_runs candidate WHERE candidate.source = current.source)
    ORDER BY source
  `).all();
  const bySource = new Map((runs.results || []).map((row) => [row.source, row]));
  return {
    latestScan: mapMatchMediaScan(latestScan),
    sources: ["arsenal", "barcelona", "getty"].map((source) => {
      const row = bySource.get(source);
      return { source, status: row?.status || "unavailable", lastCheckedAt: row?.finished_at || "", lastSuccessAt: row?.last_success_at || "", galleriesFound: Number(row?.galleries_found || 0), imagesFound: Number(row?.images_found || 0), error: row?.error_summary || "" };
    }),
  };
}

function requireMatchMediaSync(request, env) {
  const supplied = request.headers.get("X-Media-Sync-Token") || "";
  if (!env.MEDIA_SYNC_TOKEN || supplied !== env.MEDIA_SYNC_TOKEN) throw httpError(401, "Match media sync authorization is invalid.");
}

export async function syncMatchMediaScan(env, scanId, action, body) {
  let row = await env.DB.prepare("SELECT * FROM footy_media_scans WHERE id = ?").bind(scanId).first();
  const now = new Date().toISOString();
  if (!row && action === "start") {
    await env.DB.prepare("INSERT INTO footy_media_scans (id, requested_at, started_at, status) VALUES (?, ?, ?, 'running')").bind(scanId, now, now).run();
  } else if (!row) {
    throw httpError(404, "Scan was not found.");
  } else if (action === "start") {
    await env.DB.prepare("UPDATE footy_media_scans SET status = 'running', started_at = ?, finished_at = NULL, error_summary = NULL WHERE id = ?").bind(now, scanId).run();
  }
  if (action === "import") await importMatchMedia(env, scanId, body);
  if (action === "finish") {
    const status = ["completed", "partial", "failed"].includes(body.status) ? body.status : "failed";
    const summary = body.summary || {};
    await env.DB.prepare(`UPDATE footy_media_scans SET status = ?, finished_at = ?, source_count = ?, gallery_count = ?, new_image_count = ?, existing_image_count = ?, unmatched_gallery_count = ?, error_count = ?, error_summary = ?, report_json = ? WHERE id = ?`).bind(status, now, Number(summary.sourceCount || 0), Number(summary.galleryCount || 0), Number(summary.newImageCount || 0), Number(summary.existingImageCount || 0), Number(summary.unmatchedGalleryCount || 0), Number(summary.errorCount || 0), String(summary.errorSummary || ""), JSON.stringify(body.report || null), scanId).run();
  }
  row = await env.DB.prepare("SELECT * FROM footy_media_scans WHERE id = ?").bind(scanId).first();
  return mapMatchMediaScan(row);
}

export async function importMatchMedia(env, scanId, body) {
  const galleries = Array.isArray(body.galleries) ? body.galleries : [];
  const sourceRuns = Array.isArray(body.sourceRuns) ? body.sourceRuns : [];
  const now = new Date().toISOString();
  const statements = [];
  for (const run of sourceRuns) {
    const source = matchMediaChoice(run.source, MATCH_MEDIA_SOURCES, "", "source");
    statements.push(env.DB.prepare(`INSERT INTO footy_media_source_runs (id, scan_id, source, started_at, finished_at, status, pages_scanned, galleries_found, images_found, error_summary)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET finished_at = excluded.finished_at, status = excluded.status, pages_scanned = excluded.pages_scanned, galleries_found = excluded.galleries_found, images_found = excluded.images_found, error_summary = excluded.error_summary`).bind(String(run.id || `${scanId}:${source}`), scanId, source, String(run.startedAt || now), String(run.finishedAt || now), ["completed", "failed", "suspect"].includes(run.status) ? run.status : "failed", Number(run.pagesScanned || 0), Number(run.galleriesFound || 0), Number(run.imagesFound || 0), String(run.error || "")));
  }
  for (const gallery of galleries) {
    const source = matchMediaChoice(gallery.source, MATCH_MEDIA_SOURCES, "", "source");
    const id = String(gallery.id || "").trim();
    const sourceGalleryId = String(gallery.sourceGalleryId || "").trim();
    const teamId = String(gallery.teamId || "").trim();
    if (!id || !sourceGalleryId || !teamId || !gallery.sourceUrl || !gallery.title) throw httpError(400, "Imported gallery metadata is incomplete.");
    const category = matchMediaChoice(gallery.category, MATCH_MEDIA_CATEGORIES, "other", "category");
    const matchStatus = ["auto", "review", "rejected", "unmatched"].includes(gallery.matchStatus) ? gallery.matchStatus : "unmatched";
    statements.push(env.DB.prepare(`INSERT INTO footy_media_galleries (id, source, source_gallery_id, team_id, match_id, source_url, title, published_at, category, expected_image_count, match_confidence, match_status, match_evidence, first_observed_at, last_observed_at, last_extracted_at, extraction_status, extraction_error)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(source, source_gallery_id) DO UPDATE SET team_id = excluded.team_id, match_id = COALESCE(footy_media_galleries.match_id, excluded.match_id), source_url = excluded.source_url, title = excluded.title, published_at = excluded.published_at, category = excluded.category, expected_image_count = excluded.expected_image_count, match_confidence = MAX(footy_media_galleries.match_confidence, excluded.match_confidence), match_status = CASE WHEN footy_media_galleries.match_status = 'manual' THEN 'manual' ELSE excluded.match_status END, match_evidence = excluded.match_evidence, last_observed_at = excluded.last_observed_at, last_extracted_at = excluded.last_extracted_at, extraction_status = excluded.extraction_status, extraction_error = excluded.extraction_error`).bind(id, source, sourceGalleryId, teamId, gallery.matchId || null, String(gallery.sourceUrl), String(gallery.title), gallery.publishedAt || null, category, gallery.expectedImageCount === null || gallery.expectedImageCount === undefined ? null : Number(gallery.expectedImageCount), Number(gallery.matchConfidence || 0), matchStatus, JSON.stringify(gallery.matchEvidence || []), String(gallery.firstObservedAt || now), now, now, String(gallery.extractionStatus || "complete"), String(gallery.extractionError || "")));
    if (String(gallery.extractionStatus || "complete") === "complete") {
      statements.push(env.DB.prepare("DELETE FROM footy_media_gallery_images WHERE gallery_id = ?").bind(id));
    }
    for (const [ordinal, imported] of (Array.isArray(gallery.images) ? gallery.images : []).entries()) {
      const imageId = String(imported.id || "").trim();
      const sourceImageKey = String(imported.sourceImageKey || "").trim();
      if (!imageId || !sourceImageKey || !imported.originalPageUrl) throw httpError(400, "Imported image metadata is incomplete.");
      const renderMode = imported.renderMode === "getty_embed" ? "getty_embed" : "image";
      statements.push(env.DB.prepare(`INSERT INTO footy_media_images (id, source, source_image_key, source_image_url, original_page_url, render_mode, embed_url, caption, photographer_credit, width, height, normalized_url, first_observed_at, last_observed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(source, source_image_key) DO UPDATE SET source_image_url = excluded.source_image_url, original_page_url = excluded.original_page_url, render_mode = excluded.render_mode, embed_url = excluded.embed_url, caption = COALESCE(excluded.caption, footy_media_images.caption), photographer_credit = COALESCE(excluded.photographer_credit, footy_media_images.photographer_credit), width = COALESCE(excluded.width, footy_media_images.width), height = COALESCE(excluded.height, footy_media_images.height), normalized_url = excluded.normalized_url, last_observed_at = excluded.last_observed_at`).bind(imageId, source, sourceImageKey, imported.normalizedUrl || imported.sourceImageUrl || null, String(imported.originalPageUrl), renderMode, imported.embedUrl || null, imported.caption || null, imported.credit || null, imported.width || null, imported.height || null, imported.normalizedUrl || imported.sourceImageUrl || null, String(imported.firstObservedAt || now), now));
      statements.push(env.DB.prepare(`INSERT INTO footy_media_gallery_images (gallery_id, image_id, ordinal) VALUES (?, ?, ?) ON CONFLICT(gallery_id, image_id) DO UPDATE SET ordinal = excluded.ordinal`).bind(id, imageId, Number(imported.ordinal ?? ordinal)));
    }
  }
  for (let index = 0; index < statements.length; index += 80) await env.DB.batch(statements.slice(index, index + 80));
  return { galleries: galleries.length };
}

function normalizeMatchKit(value) {
  const kit = String(value || "").trim().toLowerCase();
  if (!["", "home", "away", "third"].includes(kit)) {
    throw httpError(400, "Kit must be Home, Away, or Third.");
  }
  return kit;
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
    kit: String(row.kit || ""),
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
    "Access-Control-Allow-Headers": "Authorization, Content-Type, X-Media-Sync-Token",
    "Access-Control-Allow-Methods": "GET, PATCH, POST, PUT, DELETE, OPTIONS",
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
