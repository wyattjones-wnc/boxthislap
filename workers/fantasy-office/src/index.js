import {
  buildFantasyOfficeStandings,
  scoreFantasyOfficeMovie,
} from "./scoring.js";
import {
  countNumberOneWeekends,
  discoverMovieSources,
  extractDomesticGross,
  extractLetterboxdRating,
  extractTomatometer,
  extractWeekendWinners,
  fetchSource,
  releaseIdFromUrl,
} from "../../../scripts/fantasy-office-sources.mjs";

const METRICS = new Set([
  "domestic_gross",
  "letterboxd_rating",
  "tomatometer",
  "number_one_weekends",
]);
const METRIC_FIELDS = {
  domestic_gross: "domesticGross",
  letterboxd_rating: "letterboxdRating",
  number_one_weekends: "numberOneWeekends",
  tomatometer: "tomatometer",
};

export default {
  async scheduled(_controller, env, context) {
    context.waitUntil(runScheduledUpdate(env, 2026));
  },
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const cors = corsHeaders(origin, env);
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: isAllowedOrigin(origin, env) ? 204 : 403,
        headers: cors,
      });
    }
    if (origin && !isAllowedOrigin(origin, env)) {
      return json({ ok: false, error: "Origin is not allowed." }, 403, cors);
    }

    try {
      const url = new URL(request.url);
      if (request.method === "GET" && url.pathname === "/health") {
        return json(
          { ok: true, service: "box-this-lap-fantasy-office" },
          200,
          cors,
        );
      }

      const publicMatch = url.pathname.match(/^\/api\/seasons\/(\d{4})$/);
      if (publicMatch && request.method === "GET") {
        return json(
          { ok: true, ...(await readSeason(env, parseYear(publicMatch[1]))) },
          200,
          cors,
        );
      }

      const syncConfigMatch = url.pathname.match(
        /^\/api\/sync\/seasons\/(\d{4})\/config$/,
      );
      if (syncConfigMatch && request.method === "GET") {
        requireSync(request, env);
        return json(
          {
            ok: true,
            ...(await readSyncConfig(env, parseYear(syncConfigMatch[1]))),
          },
          200,
          cors,
        );
      }

      const sourceDiscoveryMatch = url.pathname.match(
        /^\/api\/sync\/seasons\/(\d{4})\/sources$/,
      );
      if (sourceDiscoveryMatch && request.method === "POST") {
        requireSync(request, env);
        return json(
          {
            ok: true,
            ...(await ingestSourceDiscoveries(
              env,
              parseYear(sourceDiscoveryMatch[1]),
              await readBody(request),
            )),
          },
          200,
          cors,
        );
      }

      const ingestMatch = url.pathname.match(
        /^\/api\/sync\/seasons\/(\d{4})\/observations$/,
      );
      if (ingestMatch && request.method === "POST") {
        requireSync(request, env);
        return json(
          {
            ok: true,
            ...(await ingestObservations(
              env,
              parseYear(ingestMatch[1]),
              await readBody(request),
            )),
          },
          200,
          cors,
        );
      }

      const adminSeasonMatch = url.pathname.match(
        /^\/api\/admin\/seasons\/(\d{4})$/,
      );
      if (adminSeasonMatch && request.method === "GET") {
        await requireAdmin(request, env);
        const year = parseYear(adminSeasonMatch[1]);
        const runs = await env.DB.prepare(
          "SELECT id, started_at, completed_at, status, attempted, succeeded, failed, summary_json FROM fantasy_office_sync_runs ORDER BY started_at DESC LIMIT 20",
        ).all();
        return json(
          {
            ok: true,
            ...(await readSeason(env, year, { admin: true })),
            runs: runs.results || [],
          },
          200,
          cors,
        );
      }

      const importMatch = url.pathname.match(
        /^\/api\/admin\/seasons\/(\d{4})\/import$/,
      );
      if (importMatch && request.method === "POST") {
        const admin = await requireAdmin(request, env);
        return json(
          {
            ok: true,
            ...(await importRoster(
              env,
              parseYear(importMatch[1]),
              await readBody(request),
              admin.managerId,
            )),
          },
          200,
          cors,
        );
      }

      const adminMovieMatch = url.pathname.match(
        /^\/api\/admin\/seasons\/(\d{4})\/movies\/([^/]+)$/,
      );
      if (adminMovieMatch && request.method === "PUT") {
        const admin = await requireAdmin(request, env);
        return json(
          {
            ok: true,
            movie: await updateMovie(
              env,
              parseYear(adminMovieMatch[1]),
              decodeURIComponent(adminMovieMatch[2]),
              await readBody(request),
              admin.managerId,
            ),
          },
          200,
          cors,
        );
      }

      return json({ ok: false, error: "Not found." }, 404, cors);
    } catch (error) {
      const status = Number(error?.status) || 500;
      if (status >= 500) console.error(error);
      return json(
        {
          ok: false,
          error:
            status >= 500
              ? "Fantasy Office data could not be updated."
              : error.message,
        },
        status,
        cors,
      );
    }
  },
};

async function readSeason(env, year, options = {}) {
  const [season, movieQuery, metricQuery] = await Promise.all([
    env.DB.prepare(
      "SELECT year, status, cutoff_at, imported_from, updated_at FROM fantasy_office_seasons WHERE year = ?",
    )
      .bind(year)
      .first(),
    env.DB.prepare(
      "SELECT id, year, manager_name, draft_number, title, active, substitute, letterboxd_url, letterboxd_verified, rotten_tomatoes_url, rotten_tomatoes_verified, box_office_mojo_url, box_office_mojo_release_id, box_office_mojo_verified, source_discovery_json, source_discovered_at, award_points, updated_at FROM fantasy_office_movies WHERE year = ? ORDER BY manager_name, substitute, draft_number",
    )
      .bind(year)
      .all(),
    env.DB.prepare(
      "SELECT m.movie_id, m.metric, m.automatic_value, m.manual_override, m.frozen_value, m.status, m.last_attempt_at, m.last_success_at, m.last_changed_at, m.consecutive_failures, m.source_url, m.last_error_type, m.last_error_message FROM fantasy_office_metrics m JOIN fantasy_office_movies f ON f.id = m.movie_id WHERE f.year = ?",
    )
      .bind(year)
      .all(),
  ]);

  const metricsByMovie = new Map();
  for (const metric of metricQuery.results || []) {
    const values = metricsByMovie.get(metric.movie_id) ?? {};
    values[metric.metric] = metric;
    metricsByMovie.set(metric.movie_id, values);
  }

  const movies = (movieQuery.results || []).map((record) => {
    const metricRecords = metricsByMovie.get(record.id) ?? {};
    const values = {};
    const health = {};
    for (const [metric, field] of Object.entries(METRIC_FIELDS)) {
      const entry = metricRecords[metric];
      values[field] = effectiveMetricValue(entry);
      health[metric] = normalizeMetricHealth(entry);
      if (options.admin && entry) {
        health[metric].automaticValue = entry.automatic_value;
        health[metric].manualOverride = entry.manual_override;
        health[metric].frozenValue = entry.frozen_value;
      }
    }
    const movie = {
      active: Boolean(record.active),
      awardPoints: record.award_points,
      boxOfficeMojoReleaseId: record.box_office_mojo_release_id,
      boxOfficeMojoUrl: record.box_office_mojo_url,
      boxOfficeMojoVerified: Boolean(record.box_office_mojo_verified),
      draftNumber: record.draft_number,
      id: record.id,
      letterboxdUrl: record.letterboxd_url,
      letterboxdVerified: Boolean(record.letterboxd_verified),
      manager: record.manager_name,
      movie: record.title,
      rottenTomatoesUrl: record.rotten_tomatoes_url,
      rottenTomatoesVerified: Boolean(record.rotten_tomatoes_verified),
      sourceDiscoveredAt: record.source_discovered_at,
      sourceDiscovery: parseJson(record.source_discovery_json, {}),
      substitute: Boolean(record.substitute),
      ...values,
    };
    return {
      ...movie,
      health,
      score: scoreFantasyOfficeMovie(movie),
    };
  });
  const standings = buildFantasyOfficeStandings(movies);
  const draft = buildDraft(movies);
  const latestVerification =
    [...metricsByMovie.values()]
      .flatMap((value) => Object.values(value))
      .map((metric) => metric.last_success_at)
      .filter(Boolean)
      .sort()
      .at(-1) ?? "";

  if (!options.admin) {
    movies.forEach(sanitizePublicMovie);
    standings
      .flatMap((standing) => standing.movies)
      .forEach(sanitizePublicMovie);
  }

  return {
    draft,
    generatedAt: new Date().toISOString(),
    latestVerification,
    movies,
    provisional: standings.some((row) => row.provisional),
    season: season ?? { year, status: "planned", cutoff_at: "" },
    standings,
  };
}

function sanitizePublicMovie(movie) {
  delete movie.letterboxdUrl;
  delete movie.rottenTomatoesUrl;
  delete movie.boxOfficeMojoUrl;
  delete movie.boxOfficeMojoReleaseId;
  delete movie.letterboxdVerified;
  delete movie.rottenTomatoesVerified;
  delete movie.boxOfficeMojoVerified;
  delete movie.sourceDiscoveredAt;
  delete movie.sourceDiscovery;
  delete movie.health;
}

function buildDraft(movies) {
  const managers = new Map();
  for (const movie of movies) {
    const entry = managers.get(movie.manager) ?? {
      manager: movie.manager,
      picks: [],
    };
    entry.picks.push({
      active: movie.active,
      id: movie.id,
      movie: movie.movie,
      pick: movie.draftNumber,
      substitute: movie.substitute,
    });
    managers.set(movie.manager, entry);
  }
  return [...managers.values()];
}

function effectiveMetricValue(metric) {
  if (!metric) return null;
  return (
    metric.frozen_value ?? metric.manual_override ?? metric.automatic_value
  );
}

function normalizeMetricHealth(metric) {
  if (!metric) {
    return {
      lastAttemptAt: "",
      lastSuccessAt: "",
      status: "not_available",
    };
  }
  let status = metric.status;
  if (metric.last_success_at && !["error", "disabled"].includes(status)) {
    const age = Date.now() - Date.parse(metric.last_success_at);
    if (age > 72 * 60 * 60 * 1000) status = "stale";
    else if (age > 36 * 60 * 60 * 1000) status = "warning";
  }
  return {
    consecutiveFailures: metric.consecutive_failures,
    lastAttemptAt: metric.last_attempt_at,
    lastChangedAt: metric.last_changed_at,
    lastErrorMessage: metric.last_error_message,
    lastErrorType: metric.last_error_type,
    lastSuccessAt: metric.last_success_at,
    status,
  };
}

async function readSyncConfig(env, year) {
  const query = await env.DB.prepare(
    "SELECT id, title, letterboxd_url, letterboxd_verified, rotten_tomatoes_url, rotten_tomatoes_verified, box_office_mojo_url, box_office_mojo_release_id, box_office_mojo_verified FROM fantasy_office_movies WHERE year = ? ORDER BY id",
  )
    .bind(year)
    .all();
  return {
    movies: (query.results || []).map((movie) => ({
      boxOfficeMojoReleaseId: movie.box_office_mojo_release_id,
      boxOfficeMojoUrl: movie.box_office_mojo_url,
      boxOfficeMojoVerified: Boolean(movie.box_office_mojo_verified),
      id: movie.id,
      letterboxdUrl: movie.letterboxd_url,
      letterboxdVerified: Boolean(movie.letterboxd_verified),
      rottenTomatoesUrl: movie.rotten_tomatoes_url,
      rottenTomatoesVerified: Boolean(movie.rotten_tomatoes_verified),
      title: movie.title,
    })),
    year,
  };
}

async function ingestSourceDiscoveries(env, year, body) {
  const discoveries = Array.isArray(body.discoveries) ? body.discoveries : [];
  const discoveredAt = String(body.discoveredAt || new Date().toISOString());
  let applied = 0;
  for (const discovery of discoveries) {
    const movieId = String(discovery.movieId || "");
    const sources = discovery.sources || {};
    const letterboxdUrl = sources.letterboxd?.url
      ? validateSourceUrl(sources.letterboxd.url, "letterboxd.com")
      : "";
    const rottenTomatoesUrl = sources.rottenTomatoes?.url
      ? validateSourceUrl(sources.rottenTomatoes.url, "rottentomatoes.com")
      : "";
    const boxOfficeMojoUrl = sources.boxOfficeMojo?.url
      ? validateSourceUrl(sources.boxOfficeMojo.url, "boxofficemojo.com")
      : "";
    const boxOfficeMojoReleaseId = boxOfficeMojoUrl
      ? String(sources.boxOfficeMojo?.releaseId || "").trim()
      : "";
    const result = await env.DB.prepare(
      "UPDATE fantasy_office_movies SET letterboxd_url = CASE WHEN letterboxd_verified = 0 AND ? <> '' THEN ? ELSE letterboxd_url END, rotten_tomatoes_url = CASE WHEN rotten_tomatoes_verified = 0 AND ? <> '' THEN ? ELSE rotten_tomatoes_url END, box_office_mojo_url = CASE WHEN box_office_mojo_verified = 0 AND ? <> '' THEN ? ELSE box_office_mojo_url END, box_office_mojo_release_id = CASE WHEN box_office_mojo_verified = 0 AND ? <> '' THEN ? ELSE box_office_mojo_release_id END, source_discovery_json = ?, source_discovered_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND year = ?",
    )
      .bind(
        letterboxdUrl,
        letterboxdUrl,
        rottenTomatoesUrl,
        rottenTomatoesUrl,
        boxOfficeMojoUrl,
        boxOfficeMojoUrl,
        boxOfficeMojoUrl,
        boxOfficeMojoReleaseId,
        JSON.stringify(sources),
        discoveredAt,
        movieId,
        year,
      )
      .run();
    if (result.meta?.changes) applied += 1;
  }
  return { applied };
}

async function runScheduledUpdate(env, year) {
  const startedAt = new Date().toISOString();
  const config = await readSyncConfig(env, year);
  if (!config.movies.length) return;
  const stateKey = `scheduled-cursor-${year}`;
  const state = await env.DB.prepare(
    "SELECT value FROM fantasy_office_sync_state WHERE key = ?",
  )
    .bind(stateKey)
    .first();
  const cursor = Math.max(0, Number(state?.value) || 0) % config.movies.length;
  const { movies, nextCursor } = scheduledBatch(config.movies, cursor);
  const discoveries = [];
  for (const movie of movies) {
    if (
      !movie.letterboxdUrl ||
      !movie.rottenTomatoesUrl ||
      !movie.boxOfficeMojoUrl
    ) {
      const sources = await discoverMovieSources(movie, year);
      discoveries.push({ movieId: movie.id, sources });
      applyDiscoveredSources(movie, sources);
    }
  }
  if (discoveries.length) {
    await ingestSourceDiscoveries(env, year, {
      discoveredAt: new Date().toISOString(),
      discoveries,
    });
  }
  const weekendUrl = `https://www.boxofficemojo.com/weekend/by-year/${year}/`;
  let weekendWinners = null;
  let weekendError = null;
  try {
    weekendWinners = extractWeekendWinners(await fetchSource(weekendUrl), year);
  } catch (error) {
    weekendError = error;
  }
  const observations = [];
  for (const movie of movies) {
    observations.push(
      await scheduledObservation(
        movie,
        "letterboxd_rating",
        movie.letterboxdUrl,
        extractLetterboxdRating,
      ),
      await scheduledObservation(
        movie,
        "tomatometer",
        movie.rottenTomatoesUrl,
        extractTomatometer,
      ),
      await scheduledObservation(
        movie,
        "domestic_gross",
        movie.boxOfficeMojoUrl,
        extractDomesticGross,
      ),
    );
    const fetchedAt = new Date().toISOString();
    const releaseId =
      movie.boxOfficeMojoReleaseId || releaseIdFromUrl(movie.boxOfficeMojoUrl);
    if (!releaseId) {
      observations.push(
        scheduledFailure(
          movie.id,
          "number_one_weekends",
          fetchedAt,
          weekendUrl,
          "CONFIG_ERROR",
          "Box Office Mojo release ID has not been discovered.",
        ),
      );
    } else if (!weekendWinners) {
      observations.push(
        scheduledFailure(
          movie.id,
          "number_one_weekends",
          fetchedAt,
          weekendUrl,
          weekendError?.sourceType || "PARSE_ERROR",
          weekendError?.message || "Weekend winners could not be loaded.",
        ),
      );
    } else {
      observations.push({
        fetchedAt,
        metric: "number_one_weekends",
        movieId: movie.id,
        sourceUrl: weekendUrl,
        state: "available",
        success: true,
        value: countNumberOneWeekends(weekendWinners, releaseId),
      });
    }
  }
  await ingestObservations(env, year, {
    completedAt: new Date().toISOString(),
    observations,
    runId: `scheduled-${startedAt}-${crypto.randomUUID()}`,
    startedAt,
  });
  await env.DB.prepare(
    "INSERT INTO fantasy_office_sync_state (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP",
  )
    .bind(stateKey, String(nextCursor))
    .run();
}

export function scheduledBatch(movies, cursor) {
  const selected = [];
  let cost = 1;
  for (let offset = 0; offset < movies.length; offset += 1) {
    const movie = movies[(cursor + offset) % movies.length];
    const needsDiscovery =
      !movie.letterboxdUrl ||
      !movie.rottenTomatoesUrl ||
      !movie.boxOfficeMojoUrl;
    const movieCost = needsDiscovery ? 8 : 3;
    if (selected.length && cost + movieCost > 44) break;
    selected.push(movie);
    cost += movieCost;
  }
  return {
    movies: selected,
    nextCursor: (cursor + selected.length) % movies.length,
  };
}

function applyDiscoveredSources(movie, sources) {
  movie.letterboxdUrl ||= sources.letterboxd?.url || "";
  movie.rottenTomatoesUrl ||= sources.rottenTomatoes?.url || "";
  movie.boxOfficeMojoUrl ||= sources.boxOfficeMojo?.url || "";
  movie.boxOfficeMojoReleaseId ||= sources.boxOfficeMojo?.releaseId || "";
}

async function scheduledObservation(movie, metric, url, parser) {
  const fetchedAt = new Date().toISOString();
  if (!url) {
    return scheduledFailure(
      movie.id,
      metric,
      fetchedAt,
      "",
      "CONFIG_ERROR",
      "Source has not been discovered.",
    );
  }
  try {
    const result = parser(await fetchSource(url));
    return {
      fetchedAt,
      metric,
      movieId: movie.id,
      sourceUrl: url,
      state: result.state,
      success: true,
      value: result.value,
    };
  } catch (error) {
    return scheduledFailure(
      movie.id,
      metric,
      fetchedAt,
      url,
      error.sourceType ||
        (error.name === "TimeoutError" ? "TIMEOUT" : "NETWORK_ERROR"),
      error.message,
    );
  }
}

function scheduledFailure(
  movieId,
  metric,
  fetchedAt,
  sourceUrl,
  type,
  message,
) {
  return {
    error: { message, type },
    fetchedAt,
    metric,
    movieId,
    sourceUrl,
    success: false,
  };
}

async function ingestObservations(env, year, body) {
  const observations = Array.isArray(body.observations)
    ? body.observations
    : [];
  if (!body.runId || !body.startedAt || !body.completedAt) {
    throw httpError(400, "runId, startedAt, and completedAt are required.");
  }
  const runExists = await env.DB.prepare(
    "SELECT id FROM fantasy_office_sync_runs WHERE id = ?",
  )
    .bind(String(body.runId))
    .first();
  if (runExists)
    throw httpError(409, "This synchronization run was already ingested.");

  const knownMovies = await env.DB.prepare(
    "SELECT id FROM fantasy_office_movies WHERE year = ?",
  )
    .bind(year)
    .all();
  const movieIds = new Set(
    (knownMovies.results || []).map((movie) => movie.id),
  );
  let succeeded = 0;
  let failed = 0;
  const outcomes = [];
  for (const observation of observations) {
    if (!movieIds.has(String(observation.movieId))) {
      failed += 1;
      outcomes.push({
        movieId: observation.movieId,
        metric: observation.metric,
        status: "rejected",
        error: "Unknown movie.",
      });
      continue;
    }
    if (!METRICS.has(observation.metric)) {
      failed += 1;
      outcomes.push({
        movieId: observation.movieId,
        metric: observation.metric,
        status: "rejected",
        error: "Unknown metric.",
      });
      continue;
    }
    let outcome;
    try {
      outcome = await applyObservation(env, observation);
    } catch (error) {
      outcome = await applyObservation(env, {
        ...observation,
        error: {
          message: error.message || "Metric validation failed.",
          type: "VALIDATION_ERROR",
        },
        success: false,
      });
    }
    outcomes.push(outcome);
    if (outcome.status === "healthy" || outcome.status === "not_available") {
      succeeded += 1;
    } else {
      failed += 1;
    }
  }
  const status = failed ? (succeeded ? "warning" : "failed") : "healthy";
  await env.DB.prepare(
    "INSERT INTO fantasy_office_sync_runs (id, started_at, completed_at, status, attempted, succeeded, failed, summary_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  )
    .bind(
      String(body.runId),
      String(body.startedAt),
      String(body.completedAt),
      status,
      observations.length,
      succeeded,
      failed,
      JSON.stringify({ outcomes }),
    )
    .run();
  return {
    attempted: observations.length,
    failed,
    outcomes,
    status,
    succeeded,
  };
}

async function applyObservation(env, observation) {
  const movieId = String(observation.movieId);
  const metric = String(observation.metric);
  const attemptedAt = String(observation.fetchedAt || new Date().toISOString());
  const existing = await env.DB.prepare(
    "SELECT automatic_value, last_success_at, consecutive_failures FROM fantasy_office_metrics WHERE movie_id = ? AND metric = ?",
  )
    .bind(movieId, metric)
    .first();
  if (!observation.success) {
    const type = String(observation.error?.type || "UNEXPECTED_CONTENT");
    const message = String(
      observation.error?.message || "Source update failed.",
    ).slice(0, 500);
    await env.DB.prepare(
      "INSERT INTO fantasy_office_metrics (movie_id, metric, status, last_attempt_at, consecutive_failures, source_url, last_error_type, last_error_message) VALUES (?, ?, 'error', ?, 1, ?, ?, ?) ON CONFLICT(movie_id, metric) DO UPDATE SET status = 'error', last_attempt_at = excluded.last_attempt_at, consecutive_failures = fantasy_office_metrics.consecutive_failures + 1, source_url = excluded.source_url, last_error_type = excluded.last_error_type, last_error_message = excluded.last_error_message, updated_at = CURRENT_TIMESTAMP",
    )
      .bind(
        movieId,
        metric,
        attemptedAt,
        String(observation.sourceUrl || ""),
        type,
        message,
      )
      .run();
    return { movieId, metric, status: "error", error: type };
  }

  if (observation.state === "not_available") {
    await env.DB.prepare(
      "INSERT INTO fantasy_office_metrics (movie_id, metric, status, last_attempt_at, last_success_at, source_url) VALUES (?, ?, 'not_available', ?, ?, ?) ON CONFLICT(movie_id, metric) DO UPDATE SET status = 'not_available', last_attempt_at = excluded.last_attempt_at, last_success_at = excluded.last_success_at, consecutive_failures = 0, source_url = excluded.source_url, last_error_type = '', last_error_message = '', updated_at = CURRENT_TIMESTAMP",
    )
      .bind(
        movieId,
        metric,
        attemptedAt,
        attemptedAt,
        String(observation.sourceUrl || ""),
      )
      .run();
    return { movieId, metric, status: "not_available" };
  }

  const value = validateMetricValue(metric, observation.value);
  if (
    metric === "domestic_gross" &&
    existing?.automatic_value !== null &&
    existing?.automatic_value !== undefined &&
    value < Number(existing.automatic_value)
  ) {
    await env.DB.prepare(
      "UPDATE fantasy_office_metrics SET status = 'warning', last_attempt_at = ?, consecutive_failures = consecutive_failures + 1, source_url = ?, last_error_type = 'SUSPICIOUS_DECREASE', last_error_message = ?, updated_at = CURRENT_TIMESTAMP WHERE movie_id = ? AND metric = ?",
    )
      .bind(
        attemptedAt,
        String(observation.sourceUrl || ""),
        `Domestic gross decreased from ${existing.automatic_value} to ${value}; previous value retained.`,
        movieId,
        metric,
      )
      .run();
    return { movieId, metric, status: "warning", error: "SUSPICIOUS_DECREASE" };
  }

  const changed = Number(existing?.automatic_value) !== value;
  await env.DB.prepare(
    "INSERT INTO fantasy_office_metrics (movie_id, metric, automatic_value, status, last_attempt_at, last_success_at, last_changed_at, consecutive_failures, source_url) VALUES (?, ?, ?, 'healthy', ?, ?, ?, 0, ?) ON CONFLICT(movie_id, metric) DO UPDATE SET automatic_value = excluded.automatic_value, status = 'healthy', last_attempt_at = excluded.last_attempt_at, last_success_at = excluded.last_success_at, last_changed_at = CASE WHEN fantasy_office_metrics.automatic_value IS excluded.automatic_value THEN fantasy_office_metrics.last_changed_at ELSE excluded.last_changed_at END, consecutive_failures = 0, source_url = excluded.source_url, last_error_type = '', last_error_message = '', updated_at = CURRENT_TIMESTAMP",
  )
    .bind(
      movieId,
      metric,
      value,
      attemptedAt,
      attemptedAt,
      changed ? attemptedAt : existing?.last_success_at || attemptedAt,
      String(observation.sourceUrl || ""),
    )
    .run();
  if (changed) {
    await env.DB.prepare(
      "INSERT INTO fantasy_office_metric_history (movie_id, metric, value, observed_at, source_url) VALUES (?, ?, ?, ?, ?)",
    )
      .bind(
        movieId,
        metric,
        value,
        attemptedAt,
        String(observation.sourceUrl || ""),
      )
      .run();
  }
  return { movieId, metric, status: "healthy", value };
}

function validateMetricValue(metric, rawValue) {
  const value = Number(rawValue);
  if (!Number.isFinite(value))
    throw httpError(400, `${metric} must be numeric.`);
  if (metric === "letterboxd_rating" && (value < 0.5 || value > 5)) {
    throw httpError(400, "Letterboxd ratings must be between 0.5 and 5.");
  }
  if (metric === "tomatometer" && (value < 0 || value > 100)) {
    throw httpError(400, "Tomatometer scores must be between 0 and 100.");
  }
  if (metric === "domestic_gross" && value < 0) {
    throw httpError(400, "Domestic gross cannot be negative.");
  }
  if (
    metric === "number_one_weekends" &&
    (value < 0 || !Number.isInteger(value))
  ) {
    throw httpError(
      400,
      "Number-one weekend count must be a non-negative integer.",
    );
  }
  return value;
}

async function importRoster(env, year, body, managerId) {
  const movies = Array.isArray(body.movies) ? body.movies : [];
  if (!movies.length)
    throw httpError(400, "The import did not contain movies.");
  await env.DB.prepare(
    "INSERT INTO fantasy_office_seasons (year, status, imported_from) VALUES (?, 'active', ?) ON CONFLICT(year) DO UPDATE SET imported_from = excluded.imported_from, updated_at = CURRENT_TIMESTAMP",
  )
    .bind(year, String(body.source || "legacy-google-sheet"))
    .run();
  const statements = movies.map((movie) => {
    const normalized = normalizeImportedMovie(movie, year);
    return env.DB.prepare(
      "INSERT INTO fantasy_office_movies (id, year, manager_name, draft_number, title, active, substitute) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET manager_name = excluded.manager_name, draft_number = excluded.draft_number, title = excluded.title, active = excluded.active, substitute = excluded.substitute, updated_at = CURRENT_TIMESTAMP",
    ).bind(
      normalized.id,
      year,
      normalized.manager,
      normalized.draftNumber,
      normalized.title,
      normalized.active ? 1 : 0,
      normalized.substitute ? 1 : 0,
    );
  });
  await env.DB.batch(statements);
  await writeAudit(env, year, managerId, "import_roster", {
    count: movies.length,
    source: body.source || "legacy-google-sheet",
  });
  return { imported: movies.length };
}

function normalizeImportedMovie(movie, year) {
  const manager = String(movie.manager || "").trim();
  const title = String(movie.title || movie.movie || "").trim();
  const draftNumber = String(movie.draftNumber || movie.pick || "").trim();
  if (!manager || !title || !draftNumber) {
    throw httpError(
      400,
      "Every imported movie needs manager, title, and draftNumber.",
    );
  }
  const substitute = Boolean(
    movie.substitute || draftNumber.toLowerCase() === "sub",
  );
  return {
    active: substitute ? Boolean(movie.active) : movie.active !== false,
    draftNumber,
    id: `${year}-${slug(manager)}-${slug(draftNumber)}`,
    manager,
    substitute,
    title,
  };
}

async function updateMovie(env, year, movieId, body, managerId) {
  const existing = await env.DB.prepare(
    "SELECT * FROM fantasy_office_movies WHERE id = ? AND year = ?",
  )
    .bind(movieId, year)
    .first();
  if (!existing) throw httpError(404, "Movie was not found.");
  const next = {
    active: body.active === undefined ? existing.active : body.active ? 1 : 0,
    awardPoints:
      body.awardPoints === undefined
        ? existing.award_points
        : Math.max(0, Number(body.awardPoints) || 0),
    boxOfficeMojoReleaseId:
      body.boxOfficeMojoReleaseId === undefined
        ? existing.box_office_mojo_release_id
        : String(body.boxOfficeMojoReleaseId).trim(),
    boxOfficeMojoUrl:
      body.boxOfficeMojoUrl === undefined
        ? existing.box_office_mojo_url
        : validateSourceUrl(body.boxOfficeMojoUrl, "boxofficemojo.com"),
    boxOfficeMojoVerified:
      body.boxOfficeMojoVerified === undefined
        ? existing.box_office_mojo_verified
        : body.boxOfficeMojoVerified
          ? 1
          : 0,
    letterboxdUrl:
      body.letterboxdUrl === undefined
        ? existing.letterboxd_url
        : validateSourceUrl(body.letterboxdUrl, "letterboxd.com"),
    letterboxdVerified:
      body.letterboxdVerified === undefined
        ? existing.letterboxd_verified
        : body.letterboxdVerified
          ? 1
          : 0,
    rottenTomatoesUrl:
      body.rottenTomatoesUrl === undefined
        ? existing.rotten_tomatoes_url
        : validateSourceUrl(body.rottenTomatoesUrl, "rottentomatoes.com"),
    rottenTomatoesVerified:
      body.rottenTomatoesVerified === undefined
        ? existing.rotten_tomatoes_verified
        : body.rottenTomatoesVerified
          ? 1
          : 0,
    title:
      body.title === undefined ? existing.title : String(body.title).trim(),
  };
  if (!next.title) throw httpError(400, "Movie title is required.");
  if (!next.letterboxdUrl) next.letterboxdVerified = 0;
  if (!next.rottenTomatoesUrl) next.rottenTomatoesVerified = 0;
  if (!next.boxOfficeMojoUrl) next.boxOfficeMojoVerified = 0;
  if (next.active && !existing.active) {
    const activeCount = await env.DB.prepare(
      "SELECT COUNT(*) AS count FROM fantasy_office_movies WHERE year = ? AND manager_name = ? AND active = 1 AND id <> ?",
    )
      .bind(year, existing.manager_name, movieId)
      .first();
    if (Number(activeCount?.count || 0) >= 10) {
      throw httpError(
        409,
        "Deactivate the replaced movie before activating this substitute.",
      );
    }
  }
  await env.DB.prepare(
    "UPDATE fantasy_office_movies SET title = ?, active = ?, award_points = ?, letterboxd_url = ?, letterboxd_verified = ?, rotten_tomatoes_url = ?, rotten_tomatoes_verified = ?, box_office_mojo_url = ?, box_office_mojo_release_id = ?, box_office_mojo_verified = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND year = ?",
  )
    .bind(
      next.title,
      next.active,
      next.awardPoints,
      next.letterboxdUrl,
      next.letterboxdVerified,
      next.rottenTomatoesUrl,
      next.rottenTomatoesVerified,
      next.boxOfficeMojoUrl,
      next.boxOfficeMojoReleaseId,
      next.boxOfficeMojoVerified,
      movieId,
      year,
    )
    .run();
  if (body.overrides && typeof body.overrides === "object") {
    await saveMetricControls(env, movieId, body.overrides);
  }
  await writeAudit(env, year, managerId, "update_movie", {
    fields: Object.keys(body),
    movieId,
  });
  return { id: movieId, ...next };
}

function parseJson(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

async function saveMetricControls(env, movieId, controls) {
  for (const [metric, control] of Object.entries(controls)) {
    if (!METRICS.has(metric) || !control || typeof control !== "object")
      continue;
    const manualOverride =
      control.manualOverride === null || control.manualOverride === ""
        ? null
        : validateMetricValue(metric, control.manualOverride);
    const frozenValue =
      control.frozenValue === null || control.frozenValue === ""
        ? null
        : validateMetricValue(metric, control.frozenValue);
    await env.DB.prepare(
      "INSERT INTO fantasy_office_metrics (movie_id, metric, manual_override, frozen_value) VALUES (?, ?, ?, ?) ON CONFLICT(movie_id, metric) DO UPDATE SET manual_override = excluded.manual_override, frozen_value = excluded.frozen_value, updated_at = CURRENT_TIMESTAMP",
    )
      .bind(movieId, metric, manualOverride, frozenValue)
      .run();
  }
}

function validateSourceUrl(rawUrl, expectedHost) {
  const value = String(rawUrl || "").trim();
  if (!value) return "";
  let url;
  try {
    url = new URL(value);
  } catch {
    throw httpError(400, `Source URL must be a valid ${expectedHost} URL.`);
  }
  if (
    url.protocol !== "https:" ||
    (url.hostname !== expectedHost &&
      !url.hostname.endsWith(`.${expectedHost}`))
  ) {
    throw httpError(400, `Source URL must use ${expectedHost}.`);
  }
  return url.toString();
}

async function writeAudit(env, year, managerId, action, details) {
  await env.DB.prepare(
    "INSERT INTO fantasy_office_audit_log (year, actor_manager_id, action, details_json) VALUES (?, ?, ?, ?)",
  )
    .bind(year, managerId, action, JSON.stringify(details))
    .run();
}

function requireSync(request, env) {
  const authorization = request.headers.get("Authorization") || "";
  if (!env.SYNC_SECRET || authorization !== `Bearer ${env.SYNC_SECRET}`) {
    throw httpError(401, "Valid synchronization credentials are required.");
  }
}

async function requireAdmin(request, env) {
  const manager = await requireManager(request, env);
  const adminIds = new Set(
    String(env.ADMIN_MANAGER_IDS || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
  if (!adminIds.has(manager.managerId)) {
    throw httpError(
      403,
      "Fantasy Office administration is restricted to admins.",
    );
  }
  return manager;
}

async function requireManager(request, env) {
  const authorization = request.headers.get("Authorization") || "";
  if (!authorization.startsWith("Bearer "))
    throw httpError(401, "Sign in is required.");
  const verifyRequest = new Request(
    String(
      env.AUTH_VERIFY_URL ||
        "https://box-this-lap-rankings.internal/api/auth/verify",
    ),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken: authorization.slice(7) }),
    },
  );
  const response = env.AUTH_SERVICE
    ? await env.AUTH_SERVICE.fetch(verifyRequest)
    : await fetch(verifyRequest);
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.ok || !result.managerId) {
    throw httpError(401, "Your session has expired. Sign in again.");
  }
  return { managerId: String(result.managerId) };
}

async function readBody(request) {
  try {
    return await request.json();
  } catch {
    throw httpError(400, "A JSON request body is required.");
  }
}

function parseYear(value) {
  const year = Number(value);
  if (!Number.isInteger(year) || year < 2025 || year > 2100) {
    throw httpError(400, "Year is invalid.");
  }
  return year;
}

function slug(value) {
  return String(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function isAllowedOrigin(origin, env) {
  if (!origin) return true;
  return String(env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .includes(origin);
}

function corsHeaders(origin, env) {
  const headers = {
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
    Vary: "Origin",
  };
  if (origin && isAllowedOrigin(origin, env)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json; charset=utf-8" },
  });
}

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}
