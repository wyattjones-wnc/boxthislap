import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import worker from "../src/index.js";
import { discoverMovieSources } from "../../../scripts/fantasy-office-sources.mjs";
import { scoreFantasyOfficeMovie } from "../src/scoring.js";

async function setup(t) {
  const sqlite = new DatabaseSync(":memory:");
  t.after(() => sqlite.close());
  const directory = new URL("../migrations/", import.meta.url);
  for (const file of (await readdir(directory))
    .filter((name) => name.endsWith(".sql"))
    .sort()) {
    sqlite.exec(await readFile(new URL(file, directory), "utf8"));
  }
  sqlite.exec(`INSERT INTO fantasy_office_seasons (year) VALUES (2026);
    INSERT INTO fantasy_office_movies (id, year, manager_name, draft_number, title, letterboxd_url, rotten_tomatoes_url)
    VALUES ('movie-1', 2026, 'Manager', 'D1', 'Movie One', 'https://letterboxd.com/film/movie-one/', 'https://www.rottentomatoes.com/m/movie_one');
    INSERT INTO fantasy_office_metrics (movie_id, metric, automatic_value, status, last_success_at)
    VALUES ('movie-1', 'domestic_gross', 100000000, 'error', '2026-01-01'),
    ('movie-1', 'number_one_weekends', 2, 'error', '2026-01-01'),
    ('movie-1', 'letterboxd_rating', 4, 'healthy', '2026-01-01'),
    ('movie-1', 'tomatometer', 80, 'healthy', '2026-01-01');`);
  const env = {
    ADMIN_MANAGER_IDS: "6",
    SYNC_SECRET: "sync-test",
    AUTH_SERVICE: {
      async fetch() {
        return Response.json({ ok: true, managerId: "6" });
      },
    },
    DB: {
      prepare(sql) {
        const statement = sqlite.prepare(sql);
        let params = [];
        return {
          bind(...values) {
            params = values;
            return this;
          },
          async first() {
            return statement.get(...params) ?? null;
          },
          async all() {
            return { results: statement.all(...params) };
          },
          async run() {
            const result = statement.run(...params);
            return { meta: { changes: result.changes } };
          },
        };
      },
    },
  };
  async function request(path, method = "GET", body) {
    const response = await worker.fetch(
      new Request(`https://example.test${path}`, {
        method,
        headers: {
          Authorization: "Bearer sync-test",
          "Content-Type": "application/json",
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      }),
      env,
    );
    const value = await response.json();
    assert.equal(response.status, 200, JSON.stringify(value));
    return value;
  }
  return { sqlite, env, request };
}

test("non-theatrical scores ignore existing box office values without making ratings provisional", () => {
  const score = scoreFantasyOfficeMovie({
    nonTheatrical: true,
    domesticGross: 100000000,
    numberOneWeekends: 2,
    letterboxdRating: 4,
    tomatometer: 80,
    awardPoints: 10,
  });
  assert.equal(score.boxOfficePoints, 0);
  assert.equal(score.points, 810);
  assert.equal(score.provisional, false);
  assert.equal(
    scoreFantasyOfficeMovie({
      nonTheatrical: true,
      letterboxdRating: null,
      tomatometer: 80,
    }).provisional,
    true,
  );
});

test("the release setting persists, masks obsolete box office health, and can be reversed", async (t) => {
  const { request, sqlite } = await setup(t);
  const path = "/api/admin/seasons/2026/movies/movie-1";
  await request(path, "PUT", { nonTheatrical: true });
  let season = await request("/api/admin/seasons/2026");
  assert.equal(season.movies[0].nonTheatrical, true);
  assert.equal(season.movies[0].domesticGross, null);
  assert.equal(season.movies[0].health.domestic_gross.status, "not_applicable");
  assert.equal(season.movies[0].score.boxOfficePoints, 0);
  assert.equal(season.movies[0].score.provisional, false);
  assert.equal(
    (await request("/api/sync/seasons/2026/config")).movies[0].nonTheatrical,
    true,
  );
  assert.equal(
    sqlite
      .prepare(
        "SELECT automatic_value FROM fantasy_office_metrics WHERE metric = 'domestic_gross'",
      )
      .get().automatic_value,
    100000000,
  );
  await request(path, "PUT", { awardPoints: 5 });
  assert.equal(
    (await request("/api/admin/seasons/2026")).movies[0].nonTheatrical,
    true,
  );
  await request(path, "PUT", { nonTheatrical: false });
  season = await request("/api/admin/seasons/2026");
  assert.equal(season.movies[0].nonTheatrical, false);
  assert.equal(season.movies[0].domesticGross, 100000000);
  assert.equal(season.movies[0].score.boxOfficePoints, 165);
});

test("in-flight box office errors from an older collector cannot update a non-theatrical movie", async (t) => {
  const { request, sqlite } = await setup(t);
  await request("/api/admin/seasons/2026/movies/movie-1", "PUT", {
    nonTheatrical: true,
  });
  const result = await request("/api/sync/seasons/2026/observations", "POST", {
    runId: "in-flight",
    startedAt: "2026-10-28T01:00:00Z",
    completedAt: "2026-10-28T01:01:00Z",
    observations: [
      {
        movieId: "movie-1",
        metric: "domestic_gross",
        success: false,
        error: { type: "CONFIG_ERROR", message: "Missing source" },
      },
    ],
  });
  assert.equal(result.failed, 0);
  assert.equal(
    sqlite
      .prepare(
        "SELECT last_error_type FROM fantasy_office_metrics WHERE metric = 'domestic_gross'",
      )
      .get().last_error_type,
    "",
  );
});

test("the scheduled collector fetches only ratings for a non-theatrical movie", async (t) => {
  const { request, env } = await setup(t);
  await request("/api/admin/seasons/2026/movies/movie-1", "PUT", {
    nonTheatrical: true,
  });
  const fetched = [];
  t.mock.method(globalThis, "fetch", async (url) => {
    fetched.push(String(url));
    assert.ok(!String(url).includes("boxofficemojo"));
    return new Response(
      String(url).includes("letterboxd")
        ? '<script type="application/ld+json">{"@type":"Movie","aggregateRating":{"ratingValue":"4.0"}}</script>'
        : '<score-board tomatometerscore="80">',
    );
  });
  let work;
  await worker.scheduled({}, env, {
    waitUntil(promise) {
      work = promise;
    },
  });
  await work;
  assert.equal(fetched.length, 2);
  assert.equal((await request("/api/admin/seasons/2026")).runs[0].attempted, 2);
});

test("source discovery does not search Box Office Mojo for a non-theatrical movie", async (t) => {
  const fetched = [];
  t.mock.method(globalThis, "fetch", async (url) => {
    fetched.push(String(url));
    return new Response(
      String(url).includes("letterboxd")
        ? '<meta property="og:title" content="Streaming Movie (2026)">'
        : "<html></html>",
    );
  });
  const sources = await discoverMovieSources(
    { title: "Streaming Movie", nonTheatrical: true },
    2026,
  );
  assert.equal(sources.boxOfficeMojo, null);
  assert.ok(sources.letterboxd.url.includes("letterboxd"));
  assert.ok(fetched.every((url) => !url.includes("boxofficemojo")));
});
