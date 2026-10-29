import assert from "node:assert/strict";
import test from "node:test";
import { classifyFantasyOfficeRun } from "../../../scripts/fantasy-office-run-status.mjs";
import {
  runFantasyOfficeUpdate,
  renderFantasyOfficeSummary,
} from "../../../scripts/update-fantasy-office-data.mjs";

function movie(index, configured = true) {
  return {
    id: `movie-${index}`,
    title: `Movie ${index}`,
    letterboxdUrl: configured
      ? `https://letterboxd.com/film/movie-${index}/`
      : "",
    rottenTomatoesUrl: configured
      ? `https://www.rottentomatoes.com/m/movie_${index}`
      : "",
    boxOfficeMojoUrl: configured
      ? "https://www.boxofficemojo.com/release/rl111/"
      : "",
  };
}

function fixture({
  movies = [movie(1), movie(2)],
  failMovie,
  sourceError,
  limit = 0,
} = {}) {
  const requests = [];
  const snapshots = [];
  const discoveryCalls = [];
  return {
    requests,
    snapshots,
    discoveryCalls,
    options: {
      env: {
        FANTASY_OFFICE_SYNC_SECRET: "test-secret",
        FANTASY_OFFICE_MOVIE_LIMIT: String(limit),
      },
      log() {},
      async saveReport(report) {
        snapshots.push(structuredClone(report));
      },
      async discoverSources(entry) {
        discoveryCalls.push(entry.id);
        const configured = movie(1);
        return {
          letterboxd: { url: configured.letterboxdUrl },
          rottenTomatoes: { url: configured.rottenTomatoesUrl },
          boxOfficeMojo: {
            url: configured.boxOfficeMojoUrl,
            releaseId: "rl111",
          },
        };
      },
      async sourceFetch(url) {
        if (sourceError && url.includes("letterboxd"))
          throw new Error("Source unavailable");
        if (url.includes("/weekend/by-year/"))
          return '<tr><td><a href="/weekend/2026W21/">May 22-24</a></td><td><a href="/release/rl111/">Movie</a></td></tr>';
        if (url.includes("letterboxd"))
          return '<script type="application/ld+json">{"@type":"Movie","aggregateRating":{"ratingValue":"4.18"}}</script>';
        if (url.includes("rottentomatoes"))
          return '<score-board tomatometerscore="91">';
        return "<h2>Domestic</h2><span>$344,050,007</span>";
      },
      async fetchImpl(url, options) {
        const body = options.body ? JSON.parse(options.body) : null;
        requests.push({ url, body });
        let result = {};
        if (url.endsWith("/config"))
          result = { movies: structuredClone(movies) };
        if (url.endsWith("/observations")) {
          const observations = body.observations;
          if (observations[0].movieId === failMovie)
            throw new DOMException(
              "The operation was aborted due to timeout",
              "TimeoutError",
            );
          const outcomes = observations.map((entry) => ({
            movieId: entry.movieId,
            metric: entry.metric,
            status: entry.success ? "healthy" : "error",
            error: entry.error?.type,
          }));
          const succeeded = outcomes.filter(
            (entry) => entry.status === "healthy",
          ).length;
          result = { outcomes, succeeded, failed: outcomes.length - succeeded };
        }
        return Response.json({ ok: true, ...result });
      },
    },
  };
}

test("a 55-movie season is ingested in independently bounded requests", async () => {
  const setup = fixture({
    movies: Array.from({ length: 55 }, (_, index) => movie(index)),
  });
  const report = await runFantasyOfficeUpdate(setup.options);
  const ingests = setup.requests.filter((entry) =>
    entry.url.endsWith("/observations"),
  );
  assert.equal(report.status, "healthy");
  assert.equal(report.completedMovies, 55);
  assert.equal(report.succeeded, 220);
  assert.equal(ingests.length, 55);
  assert.equal(new Set(ingests.map((entry) => entry.body.runId)).size, 55);
  assert.ok(
    ingests.every(
      ({ body }) =>
        body.observations.length === 4 &&
        new Set(body.observations.map((entry) => entry.movieId)).size === 1,
    ),
  );
});

test("source discovery is persisted for one movie before collecting its metrics", async () => {
  const setup = fixture({ movies: [movie(1, false), movie(2, false)] });
  const report = await runFantasyOfficeUpdate(setup.options);
  assert.equal(report.status, "healthy");
  assert.deepEqual(
    setup.requests.map((entry) => entry.url.split("/").at(-1)),
    ["config", "sources", "observations", "sources", "observations"],
  );
  assert.ok(
    setup.requests
      .filter((entry) => entry.body?.discoveries)
      .every((entry) => entry.body.discoveries.length === 1),
  );
  assert.equal(report.succeeded, 8);
});

test("a later ingestion timeout preserves saved results and identifies the request without replaying writes", async () => {
  const setup = fixture({ failMovie: "movie-2" });
  const report = await runFantasyOfficeUpdate(setup.options);
  assert.equal(report.status, "failed");
  assert.equal(report.completedMovies, 1);
  assert.equal(report.succeeded, 4);
  assert.equal(report.outcomes.length, 4);
  assert.match(
    report.error,
    /saving metrics \(movie-2\): POST \/api\/sync\/seasons\/2026\/observations: .*timeout/,
  );
  assert.equal(
    setup.requests.filter((entry) => entry.url.endsWith("/observations"))
      .length,
    2,
  );
  assert.ok(
    setup.snapshots.some(
      (entry) => entry.completedMovies === 1 && entry.status === "running",
    ),
  );
  assert.deepEqual(setup.snapshots.at(-1), report);
});

test("source failures remain visible while successful metrics and later movies are saved", async () => {
  const setup = fixture({ sourceError: true });
  const report = await runFantasyOfficeUpdate(setup.options);
  assert.equal(report.status, "failed");
  assert.equal(report.completedMovies, 2);
  assert.equal(report.succeeded, 6);
  assert.equal(report.failed, 2);
});

test("limited verification touches only the requested number of movies and marks the report partial", async () => {
  const setup = fixture({ limit: 1 });
  const report = await runFantasyOfficeUpdate(setup.options);
  assert.equal(report.partial, true);
  assert.equal(report.completedMovies, 1);
  assert.equal(report.totalMovies, 1);
  assert.equal(
    setup.requests.filter((entry) => entry.body?.observations).length,
    1,
  );
});

test("an empty configuration cannot falsely report a recovered season", async () => {
  const setup = fixture({ movies: [] });
  const report = await runFantasyOfficeUpdate(setup.options);
  assert.equal(report.status, "failed");
  assert.match(report.error, /No movies are configured/);
});

test("non-theatrical movies require only rating sources and submit no box office observations", async () => {
  const entry = { ...movie(1), nonTheatrical: true, boxOfficeMojoUrl: "" };
  const setup = fixture({ movies: [entry] });
  const urls = [];
  const fetchRating = setup.options.sourceFetch;
  setup.options.sourceFetch = async (url) => {
    urls.push(url);
    return fetchRating(url);
  };
  const report = await runFantasyOfficeUpdate(setup.options);
  assert.equal(report.status, "healthy");
  assert.equal(report.succeeded, 2);
  assert.equal(setup.discoveryCalls.length, 0);
  assert.equal(urls.length, 2);
  assert.ok(urls.every((url) => !url.includes("boxofficemojo")));
  assert.deepEqual(
    setup.requests
      .find((entry) => entry.body?.observations)
      .body.observations.map((entry) => entry.metric),
    ["letterboxd_rating", "tomatometer"],
  );
});

test("the Actions summary distinguishes completed work from missing sources and parser failures", () => {
  const summary = renderFantasyOfficeSummary({
    completedMovies: 55,
    totalMovies: 55,
    succeeded: 159,
    failed: 2,
    outcomes: [
      {
        movieTitle: "Missing Film",
        metric: "domestic_gross",
        status: "error",
        error: "CONFIG_ERROR",
      },
      {
        movieTitle: "Changed Page",
        metric: "tomatometer",
        status: "error",
        error: "PARSE_ERROR",
      },
      { movieTitle: "Good Film", metric: "tomatometer", status: "healthy" },
    ],
  });
  assert.match(summary, /55\/55 movies saved/);
  assert.match(summary, /1 observations are missing a source/);
  assert.match(summary, /Missing Film \| domestic gross \| CONFIG_ERROR/);
  assert.match(summary, /Changed Page \| tomatometer \| PARSE_ERROR/);
  assert.ok(!summary.includes("Good Film"));
});

test("missing source matches are warnings after all movie results have been saved", async () => {
  const setup = fixture({ movies: [movie(1, false), movie(2, false)] });
  setup.options.discoverSources = async () => ({
    letterboxd: null,
    rottenTomatoes: null,
    boxOfficeMojo: null,
  });
  const report = await runFantasyOfficeUpdate(setup.options);
  assert.equal(report.status, "warning");
  assert.equal(report.completedMovies, 2);
  assert.equal(report.failed, 8);
  assert.equal(classifyFantasyOfficeRun(report).exitCode, 0);
  const summary = renderFantasyOfficeSummary(report);
  assert.match(summary, /completed successfully with source gaps/);
  assert.match(summary, /gaps are warnings and do not fail/);
});

test("discovery transport errors cannot be hidden behind missing URL warnings", async () => {
  const setup = fixture({ movies: [movie(1, false)] });
  setup.options.discoverSources = async () => ({
    letterboxd: { error: { type: "NETWORK_ERROR", message: "unreachable" } },
  });
  const report = await runFantasyOfficeUpdate(setup.options);
  assert.equal(classifyFantasyOfficeRun(report).exitCode, 1);
  assert.equal(report.status, "failed");
  assert.ok(
    report.outcomes.some((outcome) => outcome.error === "NETWORK_ERROR"),
  );
});

test("a discovered movie without a domestic release page remains a source gap", async () => {
  const setup = fixture({ movies: [movie(1, false)] });
  setup.options.discoverSources = async () => ({
    boxOfficeMojo: {
      error: {
        type: "PARSE_ERROR",
        message: "Box Office Mojo domestic release was not found.",
      },
    },
  });
  const report = await runFantasyOfficeUpdate(setup.options);
  assert.equal(report.status, "warning");
  assert.equal(classifyFantasyOfficeRun(report).exitCode, 0);
  assert.equal(classifyFantasyOfficeRun(report).gaps.length, 4);
});
