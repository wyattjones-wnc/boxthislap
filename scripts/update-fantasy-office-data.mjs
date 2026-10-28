import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import {
  countNumberOneWeekends,
  discoverMovieSources,
  extractDomesticGross,
  extractLetterboxdRating,
  extractTomatometer,
  extractWeekendWinners,
  fetchSource,
  releaseIdFromUrl,
} from "./fantasy-office-sources.mjs";

const REPORT_PATH = ".tmp/fantasy-office-report.json";
const DEBUG_DIRECTORY = ".tmp/fantasy-office-debug";

export function createFantasyOfficeApi({
  endpoint,
  secret,
  fetchImpl = fetch,
}) {
  return async (path, options = {}) => {
    const method = options.method || "GET";
    try {
      const response = await fetchImpl(`${endpoint}${path}`, {
        ...options,
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${secret}`,
          "Content-Type": "application/json",
          ...(options.headers || {}),
        },
        signal: AbortSignal.timeout(30_000),
      });
      const value = await response.json().catch(() => ({}));
      if (!response.ok || !value.ok) {
        throw new Error(
          value.error || `Fantasy Office API returned HTTP ${response.status}.`,
        );
      }
      return value;
    } catch (error) {
      throw new Error(`${method} ${path}: ${error.message}`, { cause: error });
    }
  };
}

async function observation(movie, metric, url, parser, sourceFetch) {
  const fetchedAt = new Date().toISOString();
  if (!url) {
    return failed(
      movie.id,
      metric,
      fetchedAt,
      url,
      "CONFIG_ERROR",
      "Source URL is not configured.",
    );
  }
  try {
    const html = await sourceFetch(url);
    let result;
    try {
      result = parser(html);
    } catch (error) {
      error.responseText = html;
      throw error;
    }
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
    await saveDebug(movie, metric, error.responseText);
    return failed(
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

function failed(movieId, metric, fetchedAt, sourceUrl, type, message) {
  return {
    error: { message, type },
    fetchedAt,
    metric,
    movieId,
    sourceUrl,
    success: false,
  };
}

async function saveDebug(movie, metric, contents) {
  if (!contents) return;
  await mkdir(DEBUG_DIRECTORY, { recursive: true });
  const safeMovie = movie.id.replace(/[^a-z0-9-]/gi, "-");
  await writeFile(
    `${DEBUG_DIRECTORY}/${safeMovie}_${metric}.html`,
    String(contents).slice(0, 2_000_000),
    "utf8",
  );
}

async function loadWeekendWinners(year, sourceFetch) {
  const url = `https://www.boxofficemojo.com/weekend/by-year/${year}/`;
  try {
    const html = await sourceFetch(url);
    return { url, winners: extractWeekendWinners(html, year) };
  } catch (error) {
    await mkdir(DEBUG_DIRECTORY, { recursive: true });
    if (error.responseText) {
      await writeFile(
        `${DEBUG_DIRECTORY}/box-office-mojo_weekend-index.html`,
        String(error.responseText).slice(0, 2_000_000),
        "utf8",
      );
    }
    return { error, url, winners: null };
  }
}

export async function runFantasyOfficeUpdate({
  env = process.env,
  fetchImpl = fetch,
  sourceFetch = fetchSource,
  discoverSources = discoverMovieSources,
  log = console.log,
  saveReport = writeReport,
} = {}) {
  const endpoint =
    env.FANTASY_OFFICE_ENDPOINT ||
    "https://box-this-lap-fantasy-office.boxthislap.workers.dev";
  const year = Number(env.FANTASY_OFFICE_YEAR || 2026);
  const startedAt = new Date().toISOString();
  const report = {
    runId: `${startedAt.slice(0, 10)}-${randomUUID()}`,
    startedAt,
    completedAt: null,
    endpoint,
    year,
    status: "running",
    phase: "configuration",
    succeeded: 0,
    failed: 0,
    completedMovies: 0,
    totalMovies: 0,
    outcomes: [],
  };
  const api = createFantasyOfficeApi({
    endpoint,
    secret: env.FANTASY_OFFICE_SYNC_SECRET,
    fetchImpl,
  });
  try {
    if (!env.FANTASY_OFFICE_SYNC_SECRET)
      throw new Error("FANTASY_OFFICE_SYNC_SECRET is required.");
    const movieLimit = Number(env.FANTASY_OFFICE_MOVIE_LIMIT || 0);
    if (!Number.isInteger(movieLimit) || movieLimit < 0)
      throw new Error(
        "FANTASY_OFFICE_MOVIE_LIMIT must be a non-negative integer.",
      );
    log("Loading Fantasy Office configuration.");
    await saveReport(report);
    const config = await api(`/api/sync/seasons/${year}/config`);
    const movies = movieLimit
      ? config.movies.slice(0, movieLimit)
      : config.movies;
    report.totalMovies = movies.length;
    report.partial = movies.length < config.movies.length;
    if (!movies.length)
      throw new Error("No movies are configured; no data was updated.");
    report.phase = "weekend source";
    await saveReport(report);
    const weekend = await loadWeekendWinners(year, sourceFetch);
    for (const movie of movies) {
      report.movieId = movie.id;
      report.phase = "source discovery";
      log(
        `[${report.completedMovies + 1}/${movies.length}] Discovering sources for ${movie.title} (${movie.id}).`,
      );
      await saveReport(report);
      if (
        !movie.letterboxdUrl ||
        !movie.rottenTomatoesUrl ||
        !movie.boxOfficeMojoUrl
      ) {
        const discovery = {
          movieId: movie.id,
          sources: await discoverSources(movie, year),
        };
        report.phase = "saving sources";
        await saveReport(report);
        await api(`/api/sync/seasons/${year}/sources`, {
          method: "POST",
          body: JSON.stringify({
            discoveredAt: new Date().toISOString(),
            discoveries: [discovery],
          }),
        });
        applyDiscoveries([movie], [discovery]);
      }
      report.phase = "collecting metrics";
      log(`Collecting metrics for ${movie.id}.`);
      await saveReport(report);
      const observations = await Promise.all([
        observation(
          movie,
          "letterboxd_rating",
          movie.letterboxdUrl,
          extractLetterboxdRating,
          sourceFetch,
        ),
        observation(
          movie,
          "tomatometer",
          movie.rottenTomatoesUrl,
          extractTomatometer,
          sourceFetch,
        ),
        observation(
          movie,
          "domestic_gross",
          movie.boxOfficeMojoUrl,
          extractDomesticGross,
          sourceFetch,
        ),
      ]);
      const fetchedAt = new Date().toISOString();
      const releaseId =
        movie.boxOfficeMojoReleaseId ||
        releaseIdFromUrl(movie.boxOfficeMojoUrl);
      if (!releaseId) {
        observations.push(
          failed(
            movie.id,
            "number_one_weekends",
            fetchedAt,
            weekend.url,
            "CONFIG_ERROR",
            "Box Office Mojo release ID is not configured.",
          ),
        );
      } else if (!weekend.winners) {
        observations.push(
          failed(
            movie.id,
            "number_one_weekends",
            fetchedAt,
            weekend.url,
            weekend.error.sourceType || "PARSE_ERROR",
            weekend.error.message,
          ),
        );
      } else {
        observations.push({
          fetchedAt,
          metric: "number_one_weekends",
          movieId: movie.id,
          sourceUrl: weekend.url,
          state: "available",
          success: true,
          value: countNumberOneWeekends(weekend.winners, releaseId),
        });
      }
      // Each request contains four metrics for one movie. A whole-season request
      // can exceed the Worker's D1 subrequest budget or API deadline.
      report.phase = "saving metrics";
      await saveReport(report);
      const result = await api(`/api/sync/seasons/${year}/observations`, {
        method: "POST",
        body: JSON.stringify({
          completedAt: new Date().toISOString(),
          observations,
          runId: `${report.runId}-${movie.id}`,
          startedAt,
        }),
      });
      report.succeeded += result.succeeded;
      report.failed += result.failed;
      report.outcomes.push(...result.outcomes);
      report.completedMovies += 1;
      log(
        `${movie.id}: ${result.succeeded} succeeded, ${result.failed} failed; saved.`,
      );
      await saveReport(report);
    }
    report.status = report.failed ? "warning" : "healthy";
    report.phase = "complete";
  } catch (error) {
    report.status = "failed";
    report.error = `${report.phase}${report.movieId ? ` (${report.movieId})` : ""}: ${error.message}`;
    log(report.error);
  }
  report.completedAt = new Date().toISOString();
  await saveReport(report);
  log(
    `Fantasy Office ${year}: ${report.completedMovies}/${report.totalMovies} movies saved, ${report.succeeded} observations succeeded, ${report.failed} failed.`,
  );
  return report;
}

async function writeReport(report) {
  await mkdir(".tmp", { recursive: true });
  await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

function applyDiscoveries(movies, discoveries) {
  const moviesById = new Map(movies.map((movie) => [movie.id, movie]));
  for (const discovery of discoveries) {
    const movie = moviesById.get(discovery.movieId);
    if (!movie) continue;
    const sources = discovery.sources || {};
    movie.letterboxdUrl ||= sources.letterboxd?.url || "";
    movie.rottenTomatoesUrl ||= sources.rottenTomatoes?.url || "";
    movie.boxOfficeMojoUrl ||= sources.boxOfficeMojo?.url || "";
    movie.boxOfficeMojoReleaseId ||= sources.boxOfficeMojo?.releaseId || "";
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  runFantasyOfficeUpdate()
    .then((report) => {
      if (report.status !== "healthy") process.exitCode = 1;
    })
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
