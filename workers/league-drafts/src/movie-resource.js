import { choiceKey } from "./model.js";

export const MOVIE_YEAR = 2027;
export const MOVIE_POLICY = "unreleased-na-2027";
const DISCOVERY_SCOPES = ["US", "CA", "worldwide"];
const REGIONS = ["US", "CA"];
export const MOVIE_CRON = "2-57/5 * * * *";
export const BATCH_SIZE = 32;
const MAX_PAGES = 500;
const MAX_CATALOG_BYTES = 1_500_000;

function isoDate(value) {
  const date = String(value || "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    Number.isFinite(Date.parse(date)) &&
    new Date(date).toISOString().slice(0, 10) === date
    ? date
    : "";
}

export function northAmericanReleaseDate(details) {
  return (
    (details.release_dates?.results || [])
      .filter((country) => REGIONS.includes(country.iso_3166_1))
      .flatMap((country) =>
        (country.release_dates || []).map((release) =>
          isoDate(release.release_date),
        ),
      )
      .filter(Boolean)
      .sort()[0] || ""
  );
}

export function worldwideReleaseDate(details) {
  return (
    [
      details.release_date,
      ...(details.release_dates?.results || []).flatMap((country) =>
        (country.release_dates || []).map((release) => release.release_date),
      ),
    ]
      .map(isoDate)
      .filter(Boolean)
      .sort()[0] || ""
  );
}

export async function movieForReview(env, reference, options = []) {
  const value = String(reference || "").trim();
  if (!value) return null;
  let id;
  if (/^\d+$/.test(value)) id = Number(value);
  else {
    let url;
    try {
      url = new URL(value);
    } catch {
      throw Object.assign(new Error("Enter a TMDB movie ID or movie link."), {
        status: 400,
      });
    }
    const match = url.pathname.match(/^\/movie\/(\d+)(?:-|\/|$)/);
    if (
      url.protocol !== "https:" ||
      !["www.themoviedb.org", "themoviedb.org"].includes(url.hostname) ||
      !match ||
      url.username ||
      url.password
    )
      throw Object.assign(new Error("Enter a TMDB movie ID or movie link."), {
        status: 400,
      });
    id = Number(match[1]);
  }
  if (!Number.isSafeInteger(id) || id < 1)
    throw Object.assign(new Error("Enter a valid TMDB movie ID."), {
      status: 400,
    });
  const existing = options.find((option) => option.tmdbId === id);
  if (existing) return existing;
  const details = await tmdbRequest(env, `movie/${id}`, {
    append_to_response: "release_dates",
  });
  if (!details)
    throw Object.assign(new Error("That movie was not found on TMDB."), {
      status: 400,
    });
  if (
    details.id !== id ||
    !details.title?.trim() ||
    details.title.trim().length > 200
  )
    throw new Error("TMDB returned an invalid movie identity.");
  return {
    id: `tmdb-${id}`,
    tmdbId: id,
    name: details.title.trim(),
    releaseDate: northAmericanReleaseDate(details),
    worldwideReleaseDate: worldwideReleaseDate(details),
    previousNames: [],
  };
}

export function movieFromDetails(details, year, previous, now = new Date()) {
  if (
    !Number.isSafeInteger(details?.id) ||
    details.id <= 0 ||
    !details.title?.trim()
  )
    throw new Error("TMDB returned an invalid movie identity.");
  if (!Array.isArray(details.release_dates?.results))
    throw new Error(
      "TMDB release history is missing; retrying before publication.",
    );
  const releaseDate = northAmericanReleaseDate(details);
  const firstWorldwide = worldwideReleaseDate(details);
  if (
    details.adult ||
    !firstWorldwide ||
    firstWorldwide <= now.toISOString().slice(0, 10)
  )
    return null;
  if (
    releaseDate
      ? !releaseDate.startsWith(`${year}-`)
      : !firstWorldwide.startsWith(`${year}-`)
  )
    return null;
  const name = details.title.trim();
  if (name.length > 200)
    throw new Error("A TMDB movie title exceeds the supported length.");
  return {
    id: `tmdb-${details.id}`,
    tmdbId: details.id,
    name,
    releaseDate,
    worldwideReleaseDate: firstWorldwide,
    previousNames: [
      ...new Set(
        [...(previous?.previousNames || []), previous?.name].filter(
          (title) => title && title !== name,
        ),
      ),
    ].slice(-20),
  };
}

export async function tmdbRequest(env, path, params = {}, fetcher = fetch) {
  const url = new URL(`https://api.themoviedb.org/3/${path}`);
  for (const [name, value] of Object.entries({ language: "en-US", ...params }))
    url.searchParams.set(name, String(value));
  const headers = { Accept: "application/json" };
  if (env.TMDB_READ_ACCESS_TOKEN)
    headers.Authorization = `Bearer ${env.TMDB_READ_ACCESS_TOKEN}`;
  else if (env.TMDB_API_KEY) url.searchParams.set("api_key", env.TMDB_API_KEY);
  else throw new Error("TMDB credentials are not configured.");
  // One attempt per tick keeps the invocation inside the free subrequest budget.
  // Failed work is retried by the next cron, with the last published catalog intact.
  const result = await fetcher(url.toString(), {
    headers,
    signal: AbortSignal.timeout(15_000),
  });
  if (result.status === 404 && path.startsWith("movie/")) return null;
  if (!result.ok) throw new Error(`TMDB request failed (${result.status}).`);
  const body = await result.json();
  if (!body || typeof body !== "object")
    throw new Error("TMDB returned an invalid response.");
  return body;
}

async function parallelMap(items, operation) {
  const results = new Array(items.length);
  let cursor = 0;
  const outcomes = await Promise.allSettled(
    Array.from({ length: Math.min(4, items.length) }, async () => {
      while (cursor < items.length) {
        const index = cursor++;
        results[index] = await operation(items[index]);
      }
    }),
  );
  const failure = outcomes.find((outcome) => outcome.status === "rejected");
  if (failure) throw failure.reason;
  return results;
}

export async function advanceMovieJob(
  job,
  previous,
  env,
  fetcher = fetch,
  now = new Date(),
) {
  const next = structuredClone(job);
  if (next.phase === "discover") {
    let budget = 8;
    while (budget-- > 0 && (next.regionIndex || 0) < DISCOVERY_SCOPES.length) {
      const page = await tmdbRequest(
        env,
        "discover/movie",
        {
          ...(DISCOVERY_SCOPES[next.regionIndex || 0] === "worldwide"
            ? {
                "primary_release_date.gte": `${MOVIE_YEAR}-01-01`,
                "primary_release_date.lte": `${MOVIE_YEAR}-12-31`,
              }
            : {
                region: DISCOVERY_SCOPES[next.regionIndex || 0],
                with_release_type: "1|2|3|4|5|6",
                "release_date.gte": `${MOVIE_YEAR}-01-01`,
                "release_date.lte": `${MOVIE_YEAR}-12-31`,
              }),
          include_adult: false,
          include_video: true,
          sort_by: "primary_release_date.asc",
          page: next.page,
        },
        fetcher,
      );
      if (
        !Array.isArray(page.results) ||
        !Number.isInteger(page.total_pages) ||
        page.total_pages < 0 ||
        page.total_pages > MAX_PAGES
      )
        throw new Error(
          "TMDB discovery could not be read completely; retaining the previous catalog.",
        );
      // A growing page count is followed; a shrinking count does not remove an already-seen page.
      next.totalPages = Math.max(next.totalPages || 0, page.total_pages);
      for (const movie of page.results) {
        if (!Number.isSafeInteger(movie.id) || movie.id <= 0)
          throw new Error("TMDB discovery returned an invalid movie ID.");
        next.ids.push(movie.id);
      }
      next.page += 1;
      if (next.page > next.totalPages) {
        next.regionIndex = (next.regionIndex || 0) + 1;
        next.page = 1;
        next.totalPages = null;
      }
    }
    if (next.regionIndex === DISCOVERY_SCOPES.length) {
      if (!next.ids.length)
        throw new Error(
          "TMDB returned empty regional discovery; retaining the previous catalog.",
        );
      next.ids = [
        ...new Set([
          ...next.ids,
          ...(previous?.movies || []).map((movie) => movie.tmdbId),
        ]),
      ];
      if (!next.ids.length)
        throw new Error(
          "TMDB returned an empty catalog; retaining the previous catalog.",
        );
      next.phase = "details";
      next.cursor = 0;
    }
  } else if (next.phase === "details") {
    const oldMovies = new Map(
      (previous?.movies || []).map((movie) => [movie.tmdbId, movie]),
    );
    const ids = next.ids.slice(next.cursor, next.cursor + BATCH_SIZE);
    const movies = await parallelMap(ids, async (id) => {
      const details = await tmdbRequest(
        env,
        `movie/${id}`,
        { append_to_response: "release_dates" },
        fetcher,
      );
      // A confirmed 404 can occur when TMDB removes/merges a discovery result.
      if (details && details.id !== id)
        throw new Error("TMDB returned a different movie identity.");
      return details
        ? movieFromDetails(details, MOVIE_YEAR, oldMovies.get(id), now)
        : null;
    });
    next.movies.push(...movies.filter(Boolean));
    next.cursor += ids.length;
    if (next.cursor === next.ids.length) {
      next.phase = "publish";
    }
  }
  if (
    new TextEncoder().encode(JSON.stringify(next) + JSON.stringify(previous))
      .length > MAX_CATALOG_BYTES
  )
    throw new Error(
      "The movie catalog exceeded its storage budget; retaining the previous catalog.",
    );
  return next;
}

export function mergeMovieCatalog(original, catalog) {
  if (
    original.league !== "fantasy-office" ||
    original.year !== MOVIE_YEAR ||
    !catalog
  )
    return original;
  if (original.movieResource?.updatedAt === catalog.updatedAt) return original;
  const state = structuredClone(original);
  const overrides = { ...(state.movieResourceDateOverrides || {}) };
  for (const option of state.options)
    if (option.tmdbId && Object.hasOwn(option, "releaseDateOverride"))
      overrides[option.tmdbId] = option.releaseDateOverride;
  const names = new Map();
  for (const movie of catalog.movies)
    for (const name of [movie.name, ...movie.previousNames]) {
      const key = choiceKey(name);
      names.set(
        key,
        names.has(key) && names.get(key) !== movie.tmdbId ? null : movie.tmdbId,
      );
    }
  const existingByTmdb = new Map(
    state.options
      .filter((option) => option.tmdbId)
      .map((option) => [option.tmdbId, option]),
  );
  const submittedNames = new Map(
    state.picks.map((pick) => [pick.optionId, pick.optionName]),
  );
  const adopted = new Set();
  const retained = state.options.filter((option) => !option.tmdbId);
  const manualByTmdb = new Map();
  for (const option of retained) {
    const id = names.get(choiceKey(option.name));
    if (id) manualByTmdb.set(id, [...(manualByTmdb.get(id) || []), option]);
  }
  const picksByTmdb = new Map();
  for (const pick of state.picks) {
    const id = names.get(choiceKey(pick.optionName));
    if (id) picksByTmdb.set(id, [...(picksByTmdb.get(id) || []), pick]);
  }
  const options = catalog.movies.map((movie) => {
    const matches = manualByTmdb.get(movie.tmdbId) || [];
    // Every adopted name must identify exactly one TMDB movie. Multiple aliases
    // of that same movie collapse into one entry, while historical picks stay intact.
    let existing =
      existingByTmdb.get(movie.tmdbId) ||
      matches.find((option) =>
        state.picks.some((pick) => pick.optionId === option.id),
      ) ||
      matches[0];
    for (const match of matches) adopted.add(match.id);
    if (existing && !existing.tmdbId) {
      if (existing.releaseDate)
        existing = { ...existing, releaseDateOverride: existing.releaseDate };
    }
    const oldPicks = picksByTmdb.get(movie.tmdbId) || [];
    if (!existing?.tmdbId && oldPicks.length > 0)
      existing = { ...existing, id: oldPicks[0].optionId };
    if (existing && Object.hasOwn(existing, "releaseDateOverride"))
      overrides[movie.tmdbId] = existing.releaseDateOverride;
    const hasOverride = Object.hasOwn(overrides, movie.tmdbId);
    return {
      id: existing?.id || movie.id,
      tmdbId: movie.tmdbId,
      name: movie.name,
      previousNames: [
        ...new Set(
          [
            ...movie.previousNames,
            ...(existing?.previousNames || []),
            submittedNames.get(existing?.id),
          ].filter((name) => name && name !== movie.name),
        ),
      ].slice(-40),
      releaseDate: hasOverride ? overrides[movie.tmdbId] : movie.releaseDate,
      worldwideReleaseDate: movie.worldwideReleaseDate,
      ...(hasOverride ? { releaseDateOverride: overrides[movie.tmdbId] } : {}),
    };
  });
  const activeIds = new Set(options.map((option) => option.id));
  const retired = state.options
    .filter(
      (option) =>
        option.tmdbId &&
        !activeIds.has(option.id) &&
        state.picks.some((pick) => pick.optionId === option.id),
    )
    .map((option) => ({ ...option, retired: true }));
  state.options = [
    ...retained.filter((option) => !adopted.has(option.id)),
    ...options,
    ...retired,
  ];
  if (Object.keys(overrides).length)
    state.movieResourceDateOverrides = overrides;
  if (catalog.policy === MOVIE_POLICY) {
    const linkedIds = new Set(
      state.options
        .filter((option) => option.tmdbId)
        .map((option) => option.id),
    );
    for (const pick of state.picks)
      if (!pick.reviewedAt && !linkedIds.has(pick.optionId))
        pick.needsReview = true;
  }
  state.movieResource = {
    source: "tmdb",
    policy: catalog.policy || MOVIE_POLICY,
    updatedAt: catalog.updatedAt,
    count: catalog.movies.length,
  };
  state.revision += 1;
  state.audit.push({
    revision: state.revision,
    action: "movie-resource-sync",
    actor: "system",
    reason: "Movie release resource refreshed from TMDB.",
    at: catalog.updatedAt,
  });
  return state;
}

export async function readMovieCatalog(env) {
  if (env.TMDB_CATALOG_ENABLED !== "true") return null;
  const row = await env.DB.prepare(
    "SELECT published FROM league_drafts_movie_resource WHERE environment = ? AND year = ?",
  )
    .bind(env.DRAFT_ENVIRONMENT, MOVIE_YEAR)
    .first();
  return row ? JSON.parse(row.published) : null;
}

function nextNight(now) {
  const next = new Date(now);
  next.setUTCHours(9, 0, 0, 0);
  if (next.getTime() <= now.getTime()) next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString();
}

// Leased, bounded batches: no TMDB request is made on a manager's page load.
export async function refreshMovieResource(
  env,
  saveState,
  { now = new Date(), fetcher = fetch } = {},
) {
  if (env.TMDB_CATALOG_ENABLED !== "true") return { phase: "disabled" };
  if (!env.TMDB_READ_ACCESS_TOKEN && !env.TMDB_API_KEY)
    throw new Error("TMDB credentials are not configured.");
  await env.DB.prepare(
    "INSERT OR IGNORE INTO league_drafts_movie_resource (environment, year) VALUES (?, ?)",
  )
    .bind(env.DRAFT_ENVIRONMENT, MOVIE_YEAR)
    .run();
  const row = await env.DB.prepare(
    "SELECT * FROM league_drafts_movie_resource WHERE environment = ? AND year = ?",
  )
    .bind(env.DRAFT_ENVIRONMENT, MOVIE_YEAR)
    .first();
  if (row.lease_until > now.toISOString()) return { phase: "busy" };
  let job = JSON.parse(row.job);
  const previousPublication = JSON.parse(row.published);
  if (job && job.policy !== MOVIE_POLICY) job = null;
  if (
    !job &&
    previousPublication?.policy === MOVIE_POLICY &&
    row.next_run > now.toISOString()
  )
    return { phase: "idle" };
  const lease = new Date(now.getTime() + 5 * 60_000).toISOString();
  const locked = await env.DB.prepare(
    "UPDATE league_drafts_movie_resource SET revision = revision + 1, lease_until = ? WHERE environment = ? AND year = ? AND revision = ? AND lease_until = ?",
  )
    .bind(
      lease,
      env.DRAFT_ENVIRONMENT,
      MOVIE_YEAR,
      row.revision,
      row.lease_until,
    )
    .run();
  if (!locked.meta.changes) return { phase: "busy" };
  const revision = row.revision + 1;
  let published = JSON.parse(row.published);
  let nextRun = row.next_run;
  try {
    job ||= {
      phase: "discover",
      policy: MOVIE_POLICY,
      regionIndex: 0,
      page: 1,
      totalPages: null,
      ids: [],
      movies: [],
      startedAt: now.toISOString(),
    };
    if (["discover", "details"].includes(job.phase))
      job = await advanceMovieJob(job, published, env, fetcher, now);
    else if (job.phase === "publish") {
      published = {
        source: "tmdb",
        policy: MOVIE_POLICY,
        year: MOVIE_YEAR,
        updatedAt: now.toISOString(),
        movies: job.movies.filter(
          (movie) =>
            movie.worldwideReleaseDate > now.toISOString().slice(0, 10),
        ),
      };
      job = {
        phase: "drafts",
        policy: MOVIE_POLICY,
        after: "",
        startedAt: job.startedAt,
      };
    } else if (job.phase === "drafts") {
      const rows = await env.DB.prepare(
        "SELECT id, state FROM league_drafts_state WHERE environment = ? AND year = ? AND league = ? AND id > ? ORDER BY id LIMIT 1",
      )
        .bind(env.DRAFT_ENVIRONMENT, MOVIE_YEAR, "fantasy-office", job.after)
        .all();
      if (rows.results.length && (job.processed || 0) >= 200)
        throw new Error(
          "More than 200 season drafts require a resource-sync usage review.",
        );
      for (const draft of rows.results) {
        const previous = JSON.parse(draft.state);
        // Finished drafts are historical records; current/set-up drafts follow the feed.
        if (!["completed", "cancelled"].includes(previous.status)) {
          const next = mergeMovieCatalog(previous, published);
          if (next !== previous && !(await saveState(env, previous, next)))
            throw new Error(
              "A draft changed during movie sync; retrying this batch.",
            );
        }
      }
      if (rows.results.length === 1) {
        job.after = rows.results[0].id;
        job.processed = (job.processed || 0) + 1;
      } else {
        job = null;
        nextRun = nextNight(now);
      }
    }
    const saved = await env.DB.prepare(
      "UPDATE league_drafts_movie_resource SET published = ?, job = ?, next_run = ?, lease_until = '', last_error = '' WHERE environment = ? AND year = ? AND revision = ? AND lease_until = ?",
    )
      .bind(
        JSON.stringify(published),
        JSON.stringify(job),
        nextRun,
        env.DRAFT_ENVIRONMENT,
        MOVIE_YEAR,
        revision,
        lease,
      )
      .run();
    if (!saved.meta.changes)
      throw new Error(
        "Movie resource lease changed before the batch could be saved.",
      );
    return {
      phase: job?.phase || "complete",
      movies: published?.movies.length || 0,
      cursor: job?.cursor || 0,
    };
  } catch (error) {
    // Retain both the last good publication and the last successful checkpoint.
    await env.DB.prepare(
      "UPDATE league_drafts_movie_resource SET lease_until = '', last_error = ? WHERE environment = ? AND year = ? AND revision = ? AND lease_until = ?",
    )
      .bind(
        String(error.message).slice(0, 300),
        env.DRAFT_ENVIRONMENT,
        MOVIE_YEAR,
        revision,
        lease,
      )
      .run();
    throw error;
  }
}
