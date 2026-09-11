import { buildWeeklyStandings, scoreWeeklyEntry, WILDCARD_POINTS } from "./scoring.js";
import { buildFormulaOneMainDatasets } from "../../../modules/formulaOneQualifying.js";

const SESSION_TYPES = new Set(["qualifying", "sprint", "race"]);

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const cors = corsHeaders(origin, env);
    if (request.method === "OPTIONS") {
      return new Response(null, { status: isAllowedOrigin(origin, env) ? 204 : 403, headers: cors });
    }
    if (origin && !isAllowedOrigin(origin, env)) return json({ ok: false, error: "Origin is not allowed." }, 403, cors);

    try {
      const url = new URL(request.url);
      if (request.method === "GET" && url.pathname === "/health") {
        return json({ ok: true, service: "box-this-lap-formula-one" }, 200, cors);
      }

      if (request.method === "GET" && url.pathname === "/api/admin/seasons") {
        await requireAdmin(request, env);
        return json({ ok: true, seasons: await readAdminSeasons(env) }, 200, cors);
      }

      const publicWeeklyMatch = url.pathname.match(/^\/api\/seasons\/(\d{4})\/weekly$/);
      if (publicWeeklyMatch && request.method === "GET") {
        return json({ ok: true, ...(await readPublicWeekly(env, parseYear(publicWeeklyMatch[1]))) }, 200, cors);
      }

      const overviewMatch = url.pathname.match(/^\/api\/admin\/seasons\/(\d{4})\/weekly$/);
      if (overviewMatch && request.method === "GET") {
        await requireAdmin(request, env);
        return json({ ok: true, ...(await readAdminWeekly(env, Number(overviewMatch[1]))) }, 200, cors);
      }

      const roundFetchMatch = url.pathname.match(/^\/api\/admin\/seasons\/(\d{4})\/rounds\/(\d+)\/fetch$/);
      if (roundFetchMatch && request.method === "POST") {
        const admin = await requireAdmin(request, env);
        return json({ ok: true, ...(await fetchRound(env, parseYear(roundFetchMatch[1]), parseRound(roundFetchMatch[2]), admin.managerId)) }, 200, cors);
      }

      const sessionMatch = url.pathname.match(/^\/api\/admin\/seasons\/(\d{4})\/rounds\/(\d+)\/sessions\/(qualifying|sprint|race)\/(fetch|approve|reopen)$/);
      if (sessionMatch && request.method === "POST") {
        const admin = await requireAdmin(request, env);
        const year = parseYear(sessionMatch[1]);
        const round = parseRound(sessionMatch[2]);
        const sessionType = parseSessionType(sessionMatch[3]);
        const action = sessionMatch[4];
        const result = action === "fetch"
          ? await fetchSession(env, year, round, sessionType, admin.managerId)
          : action === "approve"
            ? await approveSession(env, year, round, sessionType, admin.managerId)
            : await reopenSession(env, year, round, sessionType, admin.managerId);
        return json({ ok: true, ...result }, 200, cors);
      }

      const draftMatch = url.pathname.match(/^\/api\/admin\/seasons\/(\d{4})\/rounds\/(\d+)\/sessions\/(qualifying|sprint|race)$/);
      if (draftMatch && request.method === "PUT") {
        const admin = await requireAdmin(request, env);
        const year = parseYear(draftMatch[1]);
        const round = parseRound(draftMatch[2]);
        const sessionType = parseSessionType(draftMatch[3]);
        return json({ ok: true, ...(await saveSessionDraft(env, year, round, sessionType, await readBody(request), admin.managerId)) }, 200, cors);
      }

      const picksMatch = url.pathname.match(/^\/api\/admin\/seasons\/(\d{4})\/rounds\/(\d+)\/picks\/me$/);
      if (picksMatch && request.method === "PUT") {
        const admin = await requireAdmin(request, env);
        return json({ ok: true, ...(await saveWeeklyPicks(env, parseYear(picksMatch[1]), parseRound(picksMatch[2]), admin.managerId, await readBody(request))) }, 200, cors);
      }

      const managerPicksMatch = url.pathname.match(/^\/api\/admin\/seasons\/(\d{4})\/rounds\/(\d+)\/picks\/([^/]+)$/);
      if (managerPicksMatch && request.method === "PUT") {
        const admin = await requireAdmin(request, env);
        const managerId = clean(decodeURIComponent(managerPicksMatch[3]), 80);
        if (!managerId) throw httpError(400, "A manager is required.");
        return json({ ok: true, ...(await saveWeeklyPicks(env, parseYear(managerPicksMatch[1]), parseRound(managerPicksMatch[2]), managerId, await readBody(request), admin.managerId)) }, 200, cors);
      }

      const factsMatch = url.pathname.match(/^\/api\/admin\/seasons\/(\d{4})\/rounds\/(\d+)\/facts$/);
      if (factsMatch && request.method === "PUT") {
        const admin = await requireAdmin(request, env);
        return json({ ok: true, ...(await saveRoundFacts(env, parseYear(factsMatch[1]), parseRound(factsMatch[2]), await readBody(request), admin.managerId)) }, 200, cors);
      }

      const importMatch = url.pathname.match(/^\/api\/admin\/seasons\/(\d{4})\/import$/);
      if (importMatch && request.method === "POST") {
        const admin = await requireAdmin(request, env);
        return json({ ok: true, ...(await importSeason(env, parseYear(importMatch[1]), await readBody(request), admin.managerId)) }, 200, cors);
      }

      const exportMatch = url.pathname.match(/^\/api\/admin\/seasons\/(\d{4})\/export\/google-sheets$/);
      if (exportMatch && request.method === "POST") {
        const admin = await requireAdmin(request, env);
        return json({ ok: true, ...(await exportToGoogleSheets(env, parseYear(exportMatch[1]), admin.managerId, url.searchParams.get("dataset"))) }, 200, cors);
      }

      return json({ ok: false, error: "Not found." }, 404, cors);
    } catch (error) {
      const status = Number(error?.status) || 500;
      if (status >= 500) console.error(error);
      return json({ ok: false, error: status >= 500 ? "Formula 1 data could not be updated." : error.message }, status, cors);
    }
  },
};

async function readAdminSeasons(env) {
  const query = await env.DB.prepare("SELECT year, status, created_at, updated_at FROM f1_seasons ORDER BY year DESC").all();
  return query.results || [];
}

async function requireAdmin(request, env) {
  const authorization = request.headers.get("Authorization") || "";
  if (!authorization.startsWith("Bearer ")) throw httpError(401, "Sign in is required.");
  const verifyRequest = new Request(String(env.AUTH_VERIFY_URL || "https://box-this-lap-rankings.internal/api/auth/verify"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessToken: authorization.slice(7) }),
  });
  const response = env.AUTH_SERVICE ? await env.AUTH_SERVICE.fetch(verifyRequest) : await fetch(verifyRequest);
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.ok || !result.managerId) throw httpError(401, "Your session has expired. Sign in again.");
  const managerId = String(result.managerId);
  const adminIds = new Set(String(env.ADMIN_MANAGER_IDS || "").split(",").map((value) => value.trim()).filter(Boolean));
  if (!adminIds.has(managerId)) throw httpError(403, "Formula 1 administration is restricted to admins.");
  return { managerId };
}

async function readAdminWeekly(env, year) {
  const [roundQuery, driverQuery, sessionQuery, resultQuery, entryQuery, scoreQuery] = await Promise.all([
    env.DB.prepare("SELECT * FROM f1_rounds WHERE year = ? ORDER BY round").bind(year).all(),
    env.DB.prepare("SELECT * FROM f1_drivers WHERE year = ? ORDER BY display_name").bind(year).all(),
    env.DB.prepare("SELECT * FROM f1_sessions WHERE year = ? ORDER BY round, CASE session_type WHEN 'qualifying' THEN 1 WHEN 'sprint' THEN 2 ELSE 3 END").bind(year).all(),
    env.DB.prepare("SELECT * FROM f1_session_results WHERE year = ? ORDER BY round, session_type, position IS NULL, position, driver_id").bind(year).all(),
    env.DB.prepare("SELECT * FROM f1_weekly_entries WHERE year = ? ORDER BY round, manager_id").bind(year).all(),
    env.DB.prepare("SELECT * FROM f1_weekly_scores WHERE year = ? ORDER BY round, manager_id").bind(year).all(),
  ]);
  await backfillMissingQualifyingDeadlines(env, year, roundQuery.results || []);
  const sessions = sessionQuery.results || [];
  const rounds = (roundQuery.results || []).map((round) => {
    const requiredSessions = ["qualifying", ...(round.has_sprint ? ["sprint"] : []), "race"];
    const sessionsComplete = requiredSessions.every((sessionType) => sessions.some((session) => Number(session.round) === Number(round.round) && session.session_type === sessionType && session.status === "approved"));
    const factsComplete = [round.driver_of_the_day, round.fastest_pit_time, round.fastest_pit_team, round.dnf_count, round.safety_car]
      .every((value) => String(value ?? "").trim() !== "");
    return { ...round, facts_complete: factsComplete ? 1 : 0, is_complete: sessionsComplete && factsComplete ? 1 : 0 };
  });
  return {
    year,
    rollout: "admin_preview",
    capabilities: { googleSheetsExport: Boolean(String(env.GOOGLE_SHEETS_EXPORT_ENDPOINT || "").trim() && String(env.GOOGLE_SHEETS_EXPORT_KEY || "").trim()) },
    rounds,
    drivers: driverQuery.results || [],
    sessions,
    results: resultQuery.results || [],
    entries: entryQuery.results || [],
    scores: scoreQuery.results || [],
  };
}

async function readPublicWeekly(env, year) {
  const [roundQuery, entryQuery, scoreQuery] = await Promise.all([
    env.DB.prepare("SELECT round, name FROM f1_rounds WHERE year = ? ORDER BY round").bind(year).all(),
    env.DB.prepare("SELECT * FROM f1_weekly_entries WHERE year = ? AND entry_status = 'submitted' AND EXISTS (SELECT 1 FROM f1_weekly_scores scores WHERE scores.year = f1_weekly_entries.year AND scores.round = f1_weekly_entries.round AND scores.manager_id = f1_weekly_entries.manager_id) ORDER BY round, manager_id").bind(year).all(),
    env.DB.prepare("SELECT * FROM f1_weekly_scores WHERE year = ? ORDER BY round, manager_id").bind(year).all(),
  ]);
  const roundsById = new Map((roundQuery.results || []).map((round) => [Number(round.round), round]));
  const scores = scoreQuery.results || [];
  const scoreByEntry = new Map(scores.map((score) => [`${score.round}:${score.manager_id}`, score]));
  const races = [];
  for (const entry of entryQuery.results || []) {
    const round = Number(entry.round);
    let race = races.find((item) => item.id === round);
    if (!race) {
      race = { id: round, name: roundsById.get(round)?.name || `Round ${round}`, entries: [] };
      races.push(race);
    }
    const score = scoreByEntry.get(`${round}:${entry.manager_id}`) || {};
    race.entries.push({
      managerId: String(entry.manager_id),
      picks: { p1: entry.p1_driver_id, p2: entry.p2_driver_id, p3: entry.p3_driver_id, wildcard: entry.wildcard_driver_id },
      points: { p1: score.p1_points, p2: score.p2_points, p3: score.p3_points, wildcardQualifying: score.wildcard_qualifying_points, wildcardRace: score.wildcard_race_points },
      total: Number(score.total_points) || 0,
    });
  }
  return { year, races, standings: buildWeeklyStandings(scores) };
}

async function fetchSession(env, year, round, sessionType, actorManagerId, options = {}) {
  const existing = await env.DB.prepare("SELECT status, source FROM f1_sessions WHERE year = ? AND round = ? AND session_type = ?")
    .bind(year, round, sessionType).first();
  const reconcileApproved = existing?.status === "approved" && options.reconcileApproved && !String(existing.source || "").startsWith("jolpica");
  if (existing?.status === "approved" && !reconcileApproved) throw httpError(409, "Reopen this approved session before fetching it again.");

  const baseUrl = String(env.JOLPICA_BASE_URL || "https://api.jolpi.ca/ergast/f1").replace(/\/$/, "");
  const endpoint = sessionType === "qualifying" ? "qualifying" : sessionType === "sprint" ? "sprint" : "results";
  const sourceUrl = `${baseUrl}/${year}/${round}/${endpoint}.json`;
  const response = await fetch(sourceUrl, { headers: { "User-Agent": "BoxThisLap/1.0 (formula-one-admin-import)" } });
  if (!response.ok) throw httpError(502, `The Formula 1 provider returned ${response.status}.`);
  const payload = await response.json();
  const race = payload?.MRData?.RaceTable?.Races?.[0];
  if (!race) throw httpError(404, "No provider results are available for this session yet.");
  const sourceResults = sessionType === "qualifying"
    ? race.QualifyingResults
    : sessionType === "sprint"
      ? race.SprintResults
      : race.Results;
  if (!Array.isArray(sourceResults) || !sourceResults.length) throw httpError(404, "No provider results are available for this session yet.");
  const results = sourceResults.map((result) => normalizeProviderResult(result));
  if (sessionType === "qualifying") enrichProviderQualifyingTimes(results);
  const fetchedAt = new Date().toISOString();
  const hasSprint = Boolean(race.Sprint || sessionType === "sprint");
  const statements = [
    env.DB.prepare("INSERT INTO f1_seasons (year, status, updated_at) VALUES (?, 'active', CURRENT_TIMESTAMP) ON CONFLICT(year) DO UPDATE SET updated_at = CURRENT_TIMESTAMP").bind(year),
    env.DB.prepare(`INSERT INTO f1_rounds (year, round, name, race_date, has_sprint, updated_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(year, round) DO UPDATE SET name = excluded.name, race_date = excluded.race_date,
        has_sprint = MAX(f1_rounds.has_sprint, excluded.has_sprint), updated_at = CURRENT_TIMESTAMP`)
      .bind(year, round, String(race.raceName || `Round ${round}`), String(race.date || ""), hasSprint ? 1 : 0),
    env.DB.prepare(`INSERT INTO f1_sessions (year, round, session_type, status, source, source_url, fetched_at, updated_at)
      VALUES (?, ?, ?, 'needs_review', ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(year, round, session_type) DO UPDATE SET status = 'needs_review', source = excluded.source,
        source_url = excluded.source_url, fetched_at = excluded.fetched_at, approved_at = '', approved_by = '', updated_at = CURRENT_TIMESTAMP`)
      .bind(year, round, sessionType, reconcileApproved ? "jolpica_reconciled" : "jolpica", sourceUrl, fetchedAt),
  ];
  if (!reconcileApproved) statements.push(env.DB.prepare("DELETE FROM f1_session_results WHERE year = ? AND round = ? AND session_type = ?").bind(year, round, sessionType));
  for (const result of results) {
    statements.push(driverUpsert(env, year, result));
    statements.push(resultInsert(env, year, round, sessionType, result));
  }
  statements.push(auditInsert(env, year, round, actorManagerId, reconcileApproved ? "session_reconciled" : "session_fetched", { sessionType, sourceUrl, resultCount: results.length }));
  await env.DB.batch(statements);
  return { session: { year, round, sessionType, status: "needs_review", source: reconcileApproved ? "jolpica_reconciled" : "jolpica", sourceUrl, fetchedAt, reconciled: reconcileApproved }, results };
}

async function fetchRound(env, year, round, actorManagerId) {
  const roundRow = await env.DB.prepare("SELECT name, has_sprint FROM f1_rounds WHERE year = ? AND round = ?").bind(year, round).first();
  if (!roundRow) throw httpError(404, "Round not found.");
  await syncRoundQualifyingDeadline(env, year, round).catch((error) => {
    console.warn("The qualifying deadline could not be synchronized.", error);
  });
  const sessionTypes = ["qualifying", ...(roundRow.has_sprint ? ["sprint"] : []), "race"];
  const sessions = [];

  for (const sessionType of sessionTypes) {
    const existing = await env.DB.prepare("SELECT status, source FROM f1_sessions WHERE year = ? AND round = ? AND session_type = ?")
      .bind(year, round, sessionType).first();
    if (existing?.status === "approved" && String(existing.source || "").startsWith("jolpica")) {
      sessions.push({ sessionType, status: "approved", skipped: true });
      continue;
    }
    try {
      const result = await fetchSession(env, year, round, sessionType, actorManagerId, { reconcileApproved: true });
      sessions.push({ sessionType, status: result.session.status, resultCount: result.results.length, reconciled: Boolean(result.session.reconciled) });
    } catch (error) {
      if (![404, 502].includes(Number(error?.status))) throw error;
      sessions.push({ sessionType, status: "unavailable", error: error.message });
    }
  }

  await syncActiveDriversForRound(env, year, round);
  let safetyCarError = "";
  const safetyCar = await fetchRoundSafetyCar(env, year, round).catch((error) => {
    console.warn("OpenF1 race-control data could not be fetched.", error);
    safetyCarError = String(error?.message || "Race-control data is unavailable.");
    return null;
  });
  if (safetyCar) {
    await env.DB.batch([
      env.DB.prepare(`UPDATE f1_rounds SET safety_car = ?, updated_at = CURRENT_TIMESTAMP
        WHERE year = ? AND round = ?`).bind(safetyCar.value, year, round),
      auditInsert(env, year, round, actorManagerId, "safety_car_fetched", safetyCar),
    ]);
  }

  return {
    round: { year, round, name: roundRow.name },
    sessions,
    fetchedCount: sessions.filter((session) => session.status === "needs_review").length,
    safetyCar,
    safetyCarError,
  };
}

async function backfillMissingQualifyingDeadlines(env, year, rounds) {
  const missingRounds = new Set(rounds
    .filter((round) => !String(round.deadline_at || "").trim())
    .map((round) => Number(round.round)));
  if (!missingRounds.size) return;

  try {
    const races = await fetchProviderSchedule(env, year);
    const updates = [];
    for (const race of races) {
      const round = Number(race?.round);
      const deadlineAt = getQualifyingDeadline(race);
      if (!missingRounds.has(round) || !deadlineAt) continue;
      updates.push(env.DB.prepare(`UPDATE f1_rounds SET deadline_at = ?, updated_at = CURRENT_TIMESTAMP
        WHERE year = ? AND round = ?`).bind(deadlineAt, year, round));
      const row = rounds.find((item) => Number(item.round) === round);
      if (row) row.deadline_at = deadlineAt;
    }
    if (updates.length) await env.DB.batch(updates);
  } catch (error) {
    console.warn("Missing qualifying deadlines could not be backfilled.", error);
  }
}

async function syncRoundQualifyingDeadline(env, year, round) {
  const races = await fetchProviderSchedule(env, year, round);
  const race = races.find((item) => Number(item?.round) === Number(round)) || races[0];
  const deadlineAt = getQualifyingDeadline(race);
  if (!deadlineAt) return "";
  await env.DB.prepare(`UPDATE f1_rounds SET deadline_at = ?, updated_at = CURRENT_TIMESTAMP
    WHERE year = ? AND round = ?`).bind(deadlineAt, year, round).run();
  return deadlineAt;
}

async function fetchProviderSchedule(env, year, round = null) {
  const baseUrl = String(env.JOLPICA_BASE_URL || "https://api.jolpi.ca/ergast/f1").replace(/\/$/, "");
  const sourceUrl = `${baseUrl}/${year}${round ? `/${round}` : ""}.json`;
  const response = await fetch(sourceUrl, { headers: { "User-Agent": "BoxThisLap/1.0 (formula-one-admin-import)" } });
  if (!response.ok) throw new Error(`The Formula 1 schedule provider returned ${response.status}.`);
  const payload = await response.json();
  return Array.isArray(payload?.MRData?.RaceTable?.Races) ? payload.MRData.RaceTable.Races : [];
}

export function getQualifyingDeadline(race) {
  const date = String(race?.Qualifying?.date || "").trim();
  const time = String(race?.Qualifying?.time || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}(?::\d{2})?Z$/.test(time)) return "";
  const timestamp = Date.parse(`${date}T${time}`);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : "";
}

async function fetchRoundSafetyCar(env, year, round) {
  const roundRow = await env.DB.prepare(`SELECT race_date, EXISTS(
      SELECT 1 FROM f1_session_results WHERE year = ? AND round = ? AND session_type = 'race'
    ) AS has_race_results FROM f1_rounds WHERE year = ? AND round = ?`).bind(year, round, year, round).first();
  const raceDate = String(roundRow?.race_date || "").trim();
  if (!raceDate || !Number(roundRow?.has_race_results)) return null;

  const baseUrl = String(env.OPENF1_BASE_URL || "https://api.openf1.org/v1").replace(/\/$/, "");
  const sessionsUrl = `${baseUrl}/sessions?year=${encodeURIComponent(year)}&session_name=Race`;
  const sessions = await fetchOpenF1Json(sessionsUrl, "sessions");
  if (!Array.isArray(sessions) || !sessions.length) return null;

  const raceTimestamp = Date.parse(`${raceDate}T12:00:00Z`);
  const datedSessions = sessions
    .map((session) => ({ session, distance: Math.abs(Date.parse(session.date_start) - raceTimestamp) }))
    .filter((item) => Number.isFinite(item.distance))
    .sort((a, b) => a.distance - b.distance);
  const nearest = datedSessions[0];
  const session = nearest?.distance <= 36 * 60 * 60 * 1000 ? nearest.session : sessions[round - 1];
  if (!session?.session_key) return null;

  const sourceUrl = `${baseUrl}/race_control?session_key=${encodeURIComponent(session.session_key)}`;
  const messages = await fetchOpenF1Json(sourceUrl, "race control");
  if (!Array.isArray(messages) || !messages.length) return null;
  return { ...deriveSafetyCarValue(messages), source: "openf1", sourceUrl, sessionKey: session.session_key };
}

async function fetchOpenF1Json(url, label) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { "User-Agent": "BoxThisLap/1.0 (formula-one-admin-import)" } });
      if (response.ok) return await response.json();
      lastError = new Error(`OpenF1 ${label} returned ${response.status}.`);
      if (response.status < 500 && response.status !== 429) break;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error(`OpenF1 ${label} is unavailable.`);
}

export function deriveSafetyCarValue(messages = []) {
  const safetyCarMessages = messages.filter((item) => String(item?.category || "").toLowerCase() === "safetycar");
  const deployed = safetyCarMessages.some((item) => {
    const message = String(item?.message || "").toUpperCase();
    return message.includes("SAFETY CAR DEPLOYED") && !message.includes("VSC") && !message.includes("VIRTUAL");
  });
  const virtualOnly = !deployed && safetyCarMessages.some((item) => /\bVSC\b|VIRTUAL SAFETY CAR/i.test(String(item?.message || "")));
  return {
    value: deployed ? "Yes" : "No",
    detail: deployed ? "Safety Car deployed" : virtualOnly ? "Virtual Safety Car only" : "No Safety Car deployment",
    raceControlMessageCount: safetyCarMessages.length,
  };
}

async function syncActiveDriversForRound(env, year, round) {
  const resultCount = await env.DB.prepare("SELECT COUNT(DISTINCT driver_id) AS count FROM f1_session_results WHERE year = ? AND round = ?")
    .bind(year, round).first();
  if (!Number(resultCount?.count)) return;
  await env.DB.prepare(`UPDATE f1_drivers SET active = CASE WHEN driver_id IN (
      SELECT DISTINCT driver_id FROM f1_session_results WHERE year = ? AND round = ?
    ) THEN 1 ELSE 0 END, updated_at = CURRENT_TIMESTAMP WHERE year = ?`)
    .bind(year, round, year).run();
}

async function saveSessionDraft(env, year, round, sessionType, body, actorManagerId) {
  const current = await env.DB.prepare("SELECT status FROM f1_sessions WHERE year = ? AND round = ? AND session_type = ?")
    .bind(year, round, sessionType).first();
  if (current?.status === "approved") throw httpError(409, "Reopen this approved session before editing it.");
  const results = Array.isArray(body.results) ? body.results.map(normalizeDraftResult) : [];
  if (!results.length) throw httpError(400, "At least one session result is required.");
  const statements = [
    env.DB.prepare("INSERT INTO f1_seasons (year, status) VALUES (?, 'active') ON CONFLICT(year) DO NOTHING").bind(year),
    env.DB.prepare("INSERT INTO f1_rounds (year, round, name) VALUES (?, ?, ?) ON CONFLICT(year, round) DO NOTHING").bind(year, round, clean(body.roundName, 120) || `Round ${round}`),
    env.DB.prepare(`INSERT INTO f1_sessions (year, round, session_type, status, source, updated_at)
      VALUES (?, ?, ?, 'needs_review', 'manual', CURRENT_TIMESTAMP)
      ON CONFLICT(year, round, session_type) DO UPDATE SET status = 'needs_review', source = 'manual', approved_at = '', approved_by = '', updated_at = CURRENT_TIMESTAMP`)
      .bind(year, round, sessionType),
    env.DB.prepare("DELETE FROM f1_session_results WHERE year = ? AND round = ? AND session_type = ?").bind(year, round, sessionType),
  ];
  for (const result of results) {
    statements.push(driverUpsert(env, year, result));
    statements.push(resultInsert(env, year, round, sessionType, result));
  }
  statements.push(auditInsert(env, year, round, actorManagerId, "session_draft_saved", { sessionType, resultCount: results.length }));
  await env.DB.batch(statements);
  return { session: { year, round, sessionType, status: "needs_review", source: "manual" }, results };
}

async function approveSession(env, year, round, sessionType, actorManagerId) {
  const session = await env.DB.prepare("SELECT status FROM f1_sessions WHERE year = ? AND round = ? AND session_type = ?")
    .bind(year, round, sessionType).first();
  if (!session) throw httpError(404, "Fetch or enter this session before approving it.");
  const resultCount = await env.DB.prepare("SELECT COUNT(*) AS count FROM f1_session_results WHERE year = ? AND round = ? AND session_type = ?")
    .bind(year, round, sessionType).first();
  if (!Number(resultCount?.count)) throw httpError(409, "A session cannot be approved without results.");
  await env.DB.batch([
    env.DB.prepare(`UPDATE f1_sessions SET status = 'approved', approved_at = ?, approved_by = ?, revision = revision + 1,
      updated_at = CURRENT_TIMESTAMP WHERE year = ? AND round = ? AND session_type = ?`)
      .bind(new Date().toISOString(), actorManagerId, year, round, sessionType),
    auditInsert(env, year, round, actorManagerId, "session_approved", { sessionType }),
  ]);
  await recalculateRoundScores(env, year, round);
  return { session: { year, round, sessionType, status: "approved" } };
}

async function reopenSession(env, year, round, sessionType, actorManagerId) {
  const result = await env.DB.prepare(`UPDATE f1_sessions SET status = 'needs_review', approved_at = '', approved_by = '',
    updated_at = CURRENT_TIMESTAMP WHERE year = ? AND round = ? AND session_type = ?`).bind(year, round, sessionType).run();
  if (!result.meta?.changes) throw httpError(404, "Session not found.");
  await auditInsert(env, year, round, actorManagerId, "session_reopened", { sessionType }).run();
  await recalculateRoundScores(env, year, round);
  return { session: { year, round, sessionType, status: "needs_review" } };
}

async function saveWeeklyPicks(env, year, round, managerId, body, actorManagerId = managerId) {
  const roundRow = await env.DB.prepare("SELECT deadline_at FROM f1_rounds WHERE year = ? AND round = ?").bind(year, round).first();
  if (!roundRow) throw httpError(404, "Round not found.");
  if (roundRow.deadline_at && Date.now() >= Date.parse(roundRow.deadline_at) && !body.force) throw httpError(409, "The weekly picks deadline has passed.");
  const picks = [body.p1DriverId, body.p2DriverId, body.p3DriverId, body.wildcardDriverId].map((value) => clean(value, 80));
  const answeredPicks = picks.filter(Boolean);
  const shouldSubmit = body.submit !== false;
  if (shouldSubmit && answeredPicks.length !== 4 && !body.allowPartial) throw httpError(400, "P1, P2, P3, and wildcard picks are required to submit.");
  if (shouldSubmit && !answeredPicks.length) throw httpError(400, "At least one choice is required to submit.");
  if (new Set(answeredPicks).size !== answeredPicks.length) throw httpError(400, "Choose a different driver for each answered pick.");
  if (answeredPicks.length) {
    const placeholders = answeredPicks.map(() => "?").join(", ");
    const knownDrivers = await env.DB.prepare(`SELECT driver_id FROM f1_drivers WHERE year = ? AND driver_id IN (${placeholders})`)
      .bind(year, ...answeredPicks).all();
    if ((knownDrivers.results || []).length !== answeredPicks.length) throw httpError(400, "Every pick must be an active driver in this season.");
  }
  const entryStatus = shouldSubmit ? "submitted" : "draft";
  const submittedAt = shouldSubmit ? new Date().toISOString() : "";
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO f1_weekly_entries (year, round, manager_id, p1_driver_id, p2_driver_id, p3_driver_id, wildcard_driver_id, entry_status, submitted_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(year, round, manager_id) DO UPDATE SET p1_driver_id = excluded.p1_driver_id,
        p2_driver_id = excluded.p2_driver_id, p3_driver_id = excluded.p3_driver_id,
        wildcard_driver_id = excluded.wildcard_driver_id, entry_status = excluded.entry_status,
        submitted_at = excluded.submitted_at, updated_at = CURRENT_TIMESTAMP`)
      .bind(year, round, managerId, ...picks, entryStatus, submittedAt),
    auditInsert(env, year, round, actorManagerId, "weekly_picks_saved", { forced: Boolean(body.force), entryStatus, managerId }),
  ]);
  await recalculateRoundScores(env, year, round);
  return { entry: { year, round, manager_id: managerId, p1_driver_id: picks[0], p2_driver_id: picks[1], p3_driver_id: picks[2], wildcard_driver_id: picks[3], entry_status: entryStatus } };
}

async function saveRoundFacts(env, year, round, body, actorManagerId) {
  const safetyCar = clean(body.safetyCar, 40);
  const normalizedSafetyCar = safetyCar ? `${safetyCar.charAt(0).toUpperCase()}${safetyCar.slice(1).toLowerCase()}` : "";
  if (normalizedSafetyCar && !["Yes", "No"].includes(normalizedSafetyCar)) throw httpError(400, "Safety car must be Yes or No.");
  const dnfCount = clean(body.dnfCount, 20);
  if (dnfCount && (!/^\d+$/.test(dnfCount) || Number(dnfCount) < 0)) throw httpError(400, "DNFs must be a whole number of zero or more.");
  const facts = {
    driverOfTheDay: clean(body.driverOfTheDay, 120),
    fastestPitTime: clean(body.fastestPitTime, 40),
    fastestPitTeam: clean(body.fastestPitTeam, 120),
    dnfCount,
    safetyCar: normalizedSafetyCar,
  };
  const result = await env.DB.prepare(`UPDATE f1_rounds SET driver_of_the_day = ?, fastest_pit_time = ?, fastest_pit_team = ?,
    dnf_count = ?, safety_car = ?, updated_at = CURRENT_TIMESTAMP WHERE year = ? AND round = ?`)
    .bind(facts.driverOfTheDay, facts.fastestPitTime, facts.fastestPitTeam, facts.dnfCount, facts.safetyCar, year, round).run();
  if (!result.meta?.changes) throw httpError(404, "Round not found.");
  await auditInsert(env, year, round, actorManagerId, "round_facts_saved", facts).run();
  return { facts };
}

async function importSeason(env, year, body, actorManagerId) {
  const rounds = Array.isArray(body.rounds) ? body.rounds : [];
  const drivers = Array.isArray(body.drivers) ? body.drivers : [];
  const entries = Array.isArray(body.entries) ? body.entries : [];
  const sessions = Array.isArray(body.sessions) ? body.sessions : [];
  const results = Array.isArray(body.results) ? body.results : [];
  if (!rounds.length) throw httpError(400, "The import must include at least one round.");
  const statements = [env.DB.prepare("INSERT INTO f1_seasons (year, status, updated_at) VALUES (?, 'active', CURRENT_TIMESTAMP) ON CONFLICT(year) DO UPDATE SET updated_at = CURRENT_TIMESTAMP").bind(year)];
  for (const item of rounds) {
    const round = parseRound(item.round);
    statements.push(env.DB.prepare(`INSERT INTO f1_rounds (year, round, name, race_date, deadline_at, has_sprint, driver_of_the_day,
      fastest_pit_time, fastest_pit_team, dnf_count, safety_car, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(year, round) DO UPDATE SET name = excluded.name, race_date = excluded.race_date,
        deadline_at = excluded.deadline_at, has_sprint = excluded.has_sprint, driver_of_the_day = excluded.driver_of_the_day,
        fastest_pit_time = excluded.fastest_pit_time, fastest_pit_team = excluded.fastest_pit_team,
        dnf_count = excluded.dnf_count, safety_car = excluded.safety_car, updated_at = CURRENT_TIMESTAMP`)
      .bind(year, round, clean(item.name, 120) || `Round ${round}`, clean(item.raceDate, 30), clean(item.deadlineAt, 40), item.hasSprint ? 1 : 0,
        clean(item.driverOfTheDay, 120), clean(item.fastestPitTime, 40), clean(item.fastestPitTeam, 120), clean(item.dnfCount, 20), clean(item.safetyCar, 40)));
  }
  for (const item of drivers) statements.push(driverUpsert(env, year, normalizeDraftResult(item)));
  for (const item of sessions) {
    const sessionType = parseSessionType(item.sessionType || item.session_type);
    const status = item.status === "approved" ? "approved" : "needs_review";
    statements.push(env.DB.prepare(`INSERT INTO f1_sessions (year, round, session_type, status, source, source_url, fetched_at, approved_at, approved_by, revision, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(year, round, session_type) DO UPDATE SET status = excluded.status, source = excluded.source,
        source_url = excluded.source_url, fetched_at = excluded.fetched_at, approved_at = excluded.approved_at,
        approved_by = excluded.approved_by, revision = excluded.revision, updated_at = CURRENT_TIMESTAMP`)
      .bind(year, parseRound(item.round), sessionType, status, clean(item.source, 40) || "google_sheet_2026",
        clean(item.sourceUrl || item.source_url, 500), clean(item.fetchedAt || item.fetched_at, 40),
        status === "approved" ? clean(item.approvedAt || item.approved_at, 40) || new Date().toISOString() : "",
        status === "approved" ? String(actorManagerId) : "", status === "approved" ? 1 : 0));
  }
  for (const item of results) {
    const normalized = normalizeDraftResult(item);
    statements.push(resultInsert(env, year, parseRound(item.round), parseSessionType(item.sessionType || item.session_type), normalized));
  }
  for (const item of entries) {
    const picks = [clean(item.p1DriverId, 80), clean(item.p2DriverId, 80), clean(item.p3DriverId, 80), clean(item.wildcardDriverId, 80)];
    const entryStatus = picks.some(Boolean) ? "submitted" : "draft";
    statements.push(env.DB.prepare(`INSERT INTO f1_weekly_entries (year, round, manager_id, p1_driver_id, p2_driver_id, p3_driver_id, wildcard_driver_id, entry_status, submitted_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(year, round, manager_id) DO UPDATE SET p1_driver_id = excluded.p1_driver_id, p2_driver_id = excluded.p2_driver_id,
        p3_driver_id = excluded.p3_driver_id, wildcard_driver_id = excluded.wildcard_driver_id,
        entry_status = excluded.entry_status, submitted_at = excluded.submitted_at, updated_at = CURRENT_TIMESTAMP`)
      .bind(year, parseRound(item.round), clean(item.managerId, 80), ...picks, entryStatus,
        entryStatus === "submitted" ? clean(item.submittedAt, 40) || new Date().toISOString() : ""));
  }
  statements.push(auditInsert(env, year, null, actorManagerId, "season_imported", { rounds: rounds.length, drivers: drivers.length, entries: entries.length, sessions: sessions.length, results: results.length }));
  await runBatches(env.DB, statements);
  for (const round of rounds) await recalculateRoundScores(env, year, parseRound(round.round));
  return { imported: { year, rounds: rounds.length, drivers: drivers.length, entries: entries.length, sessions: sessions.length, results: results.length } };
}

async function exportToGoogleSheets(env, year, actorManagerId, requestedDataset) {
  const endpoint = String(env.GOOGLE_SHEETS_EXPORT_ENDPOINT || "").trim();
  if (!endpoint) throw httpError(503, "Google Sheets export has not been configured yet.");
  const dataset = String(requestedDataset || "main").trim().toLowerCase();
  if (!["main", "weekly"].includes(dataset)) throw httpError(400, "Export dataset must be main or weekly.");
  const snapshot = await readExportSnapshot(env, year, dataset);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...snapshot, exportKey: String(env.GOOGLE_SHEETS_EXPORT_KEY || "") }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.ok === false) throw httpError(502, result.error || "Google Sheets export failed.");
  await auditInsert(env, year, null, actorManagerId, "google_sheets_exported", { dataset, spreadsheetUrl: result.spreadsheetUrl || "" }).run();
  return { dataset, spreadsheetUrl: result.spreadsheetUrl || "", exportedAt: new Date().toISOString() };
}

async function readExportSnapshot(env, year, dataset) {
  const data = await readAdminWeekly(env, year);
  const generatedAt = new Date().toISOString();
  const [allDrivers, allEntries, allScores] = await Promise.all([
    env.DB.prepare("SELECT * FROM f1_drivers WHERE year = ? ORDER BY display_name").bind(year).all(),
    env.DB.prepare("SELECT * FROM f1_weekly_entries WHERE year = ? ORDER BY round, manager_id").bind(year).all(),
    env.DB.prepare("SELECT * FROM f1_weekly_scores WHERE year = ? ORDER BY round, manager_id").bind(year).all(),
  ]);
  const drivers = allDrivers.results || [];
  const baseSnapshot = {
    dataset,
    year,
    rounds: data.rounds,
    drivers,
    sessions: data.sessions,
    results: data.results,
    entries: allEntries.results || [],
    scores: allScores.results || [],
    generatedAt,
  };
  if (dataset === "weekly") return {
    ...baseSnapshot,
    standings: buildWeeklyStandings(allScores.results || []),
    wildcardScoring: Object.entries(WILDCARD_POINTS).map(([position, points]) => ({ position: Number(position), points })),
    podiumScoring: [
      { result: "P1", points: 60 },
      { result: "P2", points: 50 },
      { result: "P3", points: 50 },
      { result: "P1-3 (wrong position)", points: 25 },
    ],
  };
  const approvedSessionKeys = new Set(data.sessions
    .filter((session) => session.status === "approved")
    .map((session) => `${session.round}:${session.session_type}`));
  const approvedResults = data.results.filter((result) => approvedSessionKeys.has(`${result.round}:${result.session_type}`));
  return {
    ...baseSnapshot,
    ...buildFormulaOneMainDatasets({ year, rounds: data.rounds, drivers, sessions: data.sessions, results: approvedResults }),
  };
}

async function recalculateRoundScores(env, year, round) {
  const approved = await env.DB.prepare("SELECT session_type FROM f1_sessions WHERE year = ? AND round = ? AND status = 'approved'").bind(year, round).all();
  const approvedTypes = new Set((approved.results || []).map((row) => row.session_type));
  if (!approvedTypes.has("qualifying") || !approvedTypes.has("race")) {
    await env.DB.prepare("DELETE FROM f1_weekly_scores WHERE year = ? AND round = ?").bind(year, round).run();
    return;
  }
  const [entryQuery, qualifyingQuery, raceQuery] = await Promise.all([
    env.DB.prepare("SELECT * FROM f1_weekly_entries WHERE year = ? AND round = ? AND entry_status = 'submitted'").bind(year, round).all(),
    env.DB.prepare("SELECT driver_id, position FROM f1_session_results WHERE year = ? AND round = ? AND session_type = 'qualifying'").bind(year, round).all(),
    env.DB.prepare("SELECT driver_id, position FROM f1_session_results WHERE year = ? AND round = ? AND session_type = 'race'").bind(year, round).all(),
  ]);
  const statements = [env.DB.prepare("DELETE FROM f1_weekly_scores WHERE year = ? AND round = ?").bind(year, round)];
  for (const entry of entryQuery.results || []) {
    const score = scoreWeeklyEntry(entry, qualifyingQuery.results || [], raceQuery.results || []);
    statements.push(env.DB.prepare(`INSERT INTO f1_weekly_scores (year, round, manager_id, p1_points, p2_points, p3_points,
      wildcard_qualifying_points, wildcard_race_points, total_points, details_json, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(year, round, manager_id) DO UPDATE SET p1_points = excluded.p1_points, p2_points = excluded.p2_points,
        p3_points = excluded.p3_points, wildcard_qualifying_points = excluded.wildcard_qualifying_points,
        wildcard_race_points = excluded.wildcard_race_points, total_points = excluded.total_points,
        details_json = excluded.details_json, updated_at = CURRENT_TIMESTAMP`)
      .bind(year, round, entry.manager_id, score.p1Points, score.p2Points, score.p3Points, score.wildcardQualifyingPoints,
        score.wildcardRacePoints, score.totalPoints, JSON.stringify(score)));
  }
  await env.DB.batch(statements);
}

function normalizeProviderResult(result) {
  const driver = result.Driver || {};
  const constructor = result.Constructor || {};
  return {
    driverId: clean(driver.driverId, 80),
    permanentNumber: clean(driver.permanentNumber, 10),
    code: clean(driver.code, 10),
    givenName: clean(driver.givenName, 80),
    familyName: clean(driver.familyName, 80),
    displayName: clean(`${driver.givenName || ""} ${driver.familyName || ""}`.trim(), 120) || clean(driver.driverId, 80),
    constructorId: clean(constructor.constructorId, 80),
    constructorName: clean(constructor.name, 120),
    position: optionalInteger(result.position),
    classifiedPosition: clean(result.positionText || result.position, 20),
    grid: optionalInteger(result.grid),
    points: optionalNumber(result.points) ?? 0,
    laps: optionalInteger(result.laps),
    status: clean(result.status, 120),
    q1: clean(result.Q1, 40), q2: clean(result.Q2, 40), q3: clean(result.Q3, 40),
    timeText: clean(result.Time?.time, 60),
    fastestLapRank: optionalInteger(result.FastestLap?.rank),
    qualifyingUnadjustedSeconds: null,
    qualifyingAdjustedSeconds: null,
    qualifyingAdjustedSession: "",
    rawJson: JSON.stringify(result),
  };
}

function normalizeDraftResult(result) {
  return {
    driverId: clean(result.driverId || result.driver_id, 80),
    permanentNumber: clean(result.permanentNumber || result.permanent_number, 10),
    code: clean(result.code, 10),
    givenName: clean(result.givenName || result.given_name, 80),
    familyName: clean(result.familyName || result.family_name, 80),
    displayName: clean(result.displayName || result.display_name, 120),
    constructorId: clean(result.constructorId || result.constructor_id, 80),
    constructorName: clean(result.constructorName || result.constructor_name, 120),
    position: optionalInteger(result.position), classifiedPosition: clean(result.classifiedPosition || result.classified_position || result.position, 20),
    grid: optionalInteger(result.grid), points: optionalNumber(result.points) ?? 0, laps: optionalInteger(result.laps),
    status: clean(result.status, 120), q1: clean(result.q1, 40), q2: clean(result.q2, 40), q3: clean(result.q3, 40),
    timeText: clean(result.timeText || result.time_text, 60), fastestLapRank: optionalInteger(result.fastestLapRank || result.fastest_lap_rank),
    qualifyingUnadjustedSeconds: optionalNumber(result.qualifyingUnadjustedSeconds ?? result.qualifying_unadjusted_seconds),
    qualifyingAdjustedSeconds: optionalNumber(result.qualifyingAdjustedSeconds ?? result.qualifying_adjusted_seconds),
    qualifyingAdjustedSession: clean(result.qualifyingAdjustedSession || result.qualifying_adjusted_session, 20),
    rawJson: JSON.stringify(result),
  };
}

function enrichProviderQualifyingTimes(results) {
  const byConstructor = new Map();
  for (const result of results) {
    const last = getLastQualifyingLap(result);
    result.qualifyingUnadjustedSeconds = last?.seconds ?? null;
    if (!result.constructorId) continue;
    if (!byConstructor.has(result.constructorId)) byConstructor.set(result.constructorId, []);
    byConstructor.get(result.constructorId).push(result);
  }
  for (const teammates of byConstructor.values()) {
    if (teammates.length !== 2) continue;
    const [first, second] = teammates;
    for (const session of ["q3", "q2", "q1"]) {
      const firstSeconds = parseQualifyingLap(first[session]);
      const secondSeconds = parseQualifyingLap(second[session]);
      if (firstSeconds === null || secondSeconds === null) continue;
      first.qualifyingAdjustedSeconds = firstSeconds;
      second.qualifyingAdjustedSeconds = secondSeconds;
      first.qualifyingAdjustedSession = session;
      second.qualifyingAdjustedSession = session;
      break;
    }
  }
}

function getLastQualifyingLap(result) {
  for (const session of ["q3", "q2", "q1"]) {
    const seconds = parseQualifyingLap(result[session]);
    if (seconds !== null) return { session, seconds };
  }
  return null;
}

function parseQualifyingLap(value) {
  const text = String(value || "").trim();
  if (!text) return null;
  const parts = text.split(":").map(Number);
  if (parts.some((part) => !Number.isFinite(part))) return null;
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return (parts[0] * 60) + parts[1];
  return null;
}

function driverUpsert(env, year, result) {
  if (!result.driverId) throw httpError(400, "Every session result needs a driver ID.");
  const displayName = result.displayName || [result.givenName, result.familyName].filter(Boolean).join(" ") || result.driverId;
  return env.DB.prepare(`INSERT INTO f1_drivers (year, driver_id, permanent_number, code, given_name, family_name, display_name,
    constructor_id, constructor_name, active, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
    ON CONFLICT(year, driver_id) DO UPDATE SET permanent_number = excluded.permanent_number, code = excluded.code,
      given_name = excluded.given_name, family_name = excluded.family_name, display_name = excluded.display_name,
      constructor_id = CASE WHEN excluded.constructor_id <> '' THEN excluded.constructor_id ELSE f1_drivers.constructor_id END,
      constructor_name = CASE WHEN excluded.constructor_name <> '' THEN excluded.constructor_name ELSE f1_drivers.constructor_name END,
      active = 1, updated_at = CURRENT_TIMESTAMP`)
    .bind(year, result.driverId, result.permanentNumber, result.code, result.givenName, result.familyName, displayName, result.constructorId, result.constructorName);
}

function resultInsert(env, year, round, sessionType, result) {
  return env.DB.prepare(`INSERT INTO f1_session_results (year, round, session_type, driver_id, position, classified_position,
    constructor_id, constructor_name, grid, points, laps, status, q1, q2, q3, time_text, fastest_lap_rank, qualifying_unadjusted_seconds,
    qualifying_adjusted_seconds, qualifying_adjusted_session, raw_json, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(year, round, session_type, driver_id) DO UPDATE SET position = excluded.position,
      classified_position = excluded.classified_position, constructor_id = excluded.constructor_id,
      constructor_name = excluded.constructor_name, grid = excluded.grid, points = excluded.points,
      laps = excluded.laps, status = excluded.status, q1 = excluded.q1, q2 = excluded.q2, q3 = excluded.q3,
      time_text = excluded.time_text, fastest_lap_rank = excluded.fastest_lap_rank,
      qualifying_unadjusted_seconds = excluded.qualifying_unadjusted_seconds,
      qualifying_adjusted_seconds = excluded.qualifying_adjusted_seconds,
      qualifying_adjusted_session = excluded.qualifying_adjusted_session,
      raw_json = excluded.raw_json, updated_at = CURRENT_TIMESTAMP`)
    .bind(year, round, sessionType, result.driverId, result.position, result.classifiedPosition,
      result.constructorId, result.constructorName, result.grid, result.points,
      result.laps, result.status, result.q1, result.q2, result.q3, result.timeText, result.fastestLapRank,
      result.qualifyingUnadjustedSeconds, result.qualifyingAdjustedSeconds, result.qualifyingAdjustedSession, result.rawJson);
}

function auditInsert(env, year, round, actorManagerId, action, details) {
  return env.DB.prepare("INSERT INTO f1_audit_log (year, round, actor_manager_id, action, details_json) VALUES (?, ?, ?, ?, ?)")
    .bind(year, round, String(actorManagerId), action, JSON.stringify(details || {}));
}

async function runBatches(db, statements, size = 75) {
  for (let index = 0; index < statements.length; index += size) await db.batch(statements.slice(index, index + size));
}

function parseYear(value) {
  const year = Number(value);
  if (!Number.isInteger(year) || year < 1950 || year > 2200) throw httpError(400, "Invalid season year.");
  return year;
}

function parseRound(value) {
  const round = Number(value);
  if (!Number.isInteger(round) || round < 1 || round > 30) throw httpError(400, "Invalid round.");
  return round;
}

function parseSessionType(value) {
  if (!SESSION_TYPES.has(value)) throw httpError(400, "Invalid session type.");
  return value;
}

function clean(value, maxLength) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function optionalInteger(value) {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isInteger(number) ? number : null;
}

function optionalNumber(value) {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

async function readBody(request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) throw httpError(400, "A JSON object is required.");
  return body;
}

function isAllowedOrigin(origin, env) {
  if (!origin) return true;
  return String(env.ALLOWED_ORIGINS || "").split(",").map((value) => value.trim()).includes(origin);
}

function corsHeaders(origin, env) {
  const headers = {
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
    "Vary": "Origin",
  };
  if (origin && isAllowedOrigin(origin, env)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), { status, headers: { ...headers, "Content-Type": "application/json; charset=utf-8" } });
}

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}
