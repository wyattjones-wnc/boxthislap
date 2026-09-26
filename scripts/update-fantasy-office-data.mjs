import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
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

const ENDPOINT =
  process.env.FANTASY_OFFICE_ENDPOINT ||
  "https://box-this-lap-fantasy-office.boxthislap.workers.dev";
const SECRET = process.env.FANTASY_OFFICE_SYNC_SECRET || "";
const YEAR = Number(process.env.FANTASY_OFFICE_YEAR || 2026);
const REPORT_PATH = ".tmp/fantasy-office-report.json";
const DEBUG_DIRECTORY = ".tmp/fantasy-office-debug";

async function api(path, options = {}) {
  const response = await fetch(`${ENDPOINT}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${SECRET}`,
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
}

async function observation(movie, metric, url, parser) {
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
    const html = await fetchSource(url);
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

async function loadWeekendWinners() {
  const url = `https://www.boxofficemojo.com/weekend/by-year/${YEAR}/`;
  try {
    const html = await fetchSource(url);
    return { url, winners: extractWeekendWinners(html, YEAR) };
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

async function main() {
  if (!SECRET) throw new Error("FANTASY_OFFICE_SYNC_SECRET is required.");
  const startedAt = new Date().toISOString();
  const runId = `${startedAt.slice(0, 10)}-${randomUUID()}`;
  const config = await api(`/api/sync/seasons/${YEAR}/config`);
  const discoveries = await discoverMissingSources(config.movies);
  if (discoveries.length) {
    await api(`/api/sync/seasons/${YEAR}/sources`, {
      method: "POST",
      body: JSON.stringify({
        discoveredAt: new Date().toISOString(),
        discoveries,
      }),
    });
    applyDiscoveries(config.movies, discoveries);
  }
  const weekend = await loadWeekendWinners();
  const observations = [];

  for (const movie of config.movies) {
    observations.push(
      await observation(
        movie,
        "letterboxd_rating",
        movie.letterboxdUrl,
        extractLetterboxdRating,
      ),
      await observation(
        movie,
        "tomatometer",
        movie.rottenTomatoesUrl,
        extractTomatometer,
      ),
      await observation(
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
  }

  const completedAt = new Date().toISOString();
  const result = await api(`/api/sync/seasons/${YEAR}/observations`, {
    method: "POST",
    body: JSON.stringify({ completedAt, observations, runId, startedAt }),
  });
  const report = {
    completedAt,
    endpoint: ENDPOINT,
    failed: result.failed,
    outcomes: result.outcomes,
    runId,
    startedAt,
    status: result.status,
    succeeded: result.succeeded,
    year: YEAR,
  };
  await mkdir(".tmp", { recursive: true });
  await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(
    `Fantasy Office ${YEAR}: ${result.succeeded} succeeded, ${result.failed} failed.`,
  );
  if (result.failed) process.exitCode = 1;
}

async function discoverMissingSources(movies) {
  const pending = movies.filter(
    (movie) =>
      !movie.letterboxdUrl ||
      !movie.rottenTomatoesUrl ||
      !movie.boxOfficeMojoUrl,
  );
  const discoveries = [];
  for (let index = 0; index < pending.length; index += 3) {
    const batch = pending.slice(index, index + 3);
    discoveries.push(
      ...(await Promise.all(
        batch.map(async (movie) => ({
          movieId: movie.id,
          sources: await discoverMovieSources(movie, YEAR),
        })),
      )),
    );
  }
  return discoveries;
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

main().catch(async (error) => {
  await mkdir(".tmp", { recursive: true });
  await writeFile(
    REPORT_PATH,
    `${JSON.stringify(
      {
        completedAt: new Date().toISOString(),
        error: error.message,
        status: "failed",
        year: YEAR,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  console.error(error.message);
  process.exitCode = 1;
});
