import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFile } from "node:fs/promises";
import test from "node:test";
import worker, { saveState } from "../src/index.js";
import { newDraft, transition } from "../src/model.js";
import {
  BATCH_SIZE,
  advanceMovieJob,
  mergeMovieCatalog,
  movieFromDetails as normalizeMovie,
  refreshMovieResource,
  tmdbRequest,
} from "../src/movie-resource.js";

const movieFromDetails = (details, year, previous) =>
  normalizeMovie(details, year, previous, new Date("2026-10-21T09:00:00Z"));

const configuration = {
  league: "fantasy-office",
  year: 2027,
  name: "Draft",
  participants: [
    { id: "1", name: "One" },
    { id: "2", name: "Two" },
  ],
  rounds: 2,
  options: [],
};
const entry = (
  id = 1,
  name = "First Film",
  date = "2027-04-05",
  previousNames = [],
) => ({
  id: `tmdb-${id}`,
  tmdbId: id,
  name,
  releaseDate: date,
  worldwideReleaseDate: date || "2027-01-01",
  previousNames,
});
const catalog = (
  movies = [entry()],
  updatedAt = "2026-10-21T09:00:00.000Z",
) => ({
  year: 2027,
  source: "tmdb",
  policy: "unreleased-na-2027",
  movies,
  updatedAt,
});
const details = (id, title, date, releases = null) => ({
  id,
  title,
  release_date: date,
  release_dates: {
    results: [
      {
        iso_3166_1: "US",
        release_dates: (releases || [[3, date]]).map(
          ([type, release_date]) => ({
            type,
            release_date,
          }),
        ),
      },
    ],
  },
});
const start = () => ({
  phase: "discover",
  policy: "unreleased-na-2027",
  regionIndex: 0,
  page: 1,
  totalPages: null,
  ids: [],
  movies: [],
});
const apply = (state, action, body = {}, actor = "6", admin = true) =>
  transition(
    state,
    action,
    { revision: state.revision, ...body },
    actor,
    admin,
  );
async function database() {
  const sqlite = new DatabaseSync(":memory:");
  for (const file of ["0001_initial.sql", "0002_movie_resource.sql"])
    sqlite.exec(
      await readFile(new URL(`../migrations/${file}`, import.meta.url), "utf8"),
    );
  const DB = {
    prepare(sql) {
      return {
        bind(...values) {
          const statement = sqlite.prepare(sql);
          return {
            async run() {
              return {
                meta: { changes: Number(statement.run(...values).changes) },
              };
            },
            async first() {
              return statement.get(...values) || null;
            },
            async all() {
              return { results: statement.all(...values) };
            },
          };
        },
      };
    },
  };
  const env = {
    DB,
    DRAFT_ENVIRONMENT: "dev",
    TMDB_CATALOG_ENABLED: "true",
    TMDB_READ_ACCESS_TOKEN: "fixture-token",
  };
  const insert = (state) =>
    DB.prepare(
      "INSERT INTO league_drafts_state VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    )
      .bind(
        "dev",
        state.id,
        state.league,
        2027,
        state.status,
        state.revision,
        JSON.stringify(state),
        "now",
      )
      .run();
  return { sqlite, env, insert };
}

test("first releases include streaming, physical, TV, and premieres but never a later video window", () => {
  for (const type of [1, 2, 3, 4, 5, 6])
    assert.equal(
      movieFromDetails(
        details(1, "First Film", "2027-04-05", [
          [type, "2027-04-05T00:00:00.000Z"],
        ]),
        2027,
      )?.releaseDate,
      "2027-04-05",
    );
  assert.equal(
    movieFromDetails(
      details(1, "Older Film", "2026-12-01", [
        [3, "2026-12-01"],
        [4, "2027-02-01"],
      ]),
      2027,
    ),
    null,
  );
  const foreignPremiere = details(1, "Foreign Film", "2027-05-01", [
    [4, "2027-05-01"],
  ]);
  foreignPremiere.release_dates.results.push({
    iso_3166_1: "FR",
    release_dates: [{ type: 1, release_date: "2026-10-01" }],
  });
  assert.equal(movieFromDetails(foreignPremiere, 2027), null);
  foreignPremiere.release_dates.results[1] = {
    iso_3166_1: "JP",
    release_dates: [{ type: 1, release_date: "2027-02-01" }],
  };
  const upcoming = movieFromDetails(foreignPremiere, 2027);
  assert.equal(upcoming.releaseDate, "2027-05-01");
  assert.equal(upcoming.worldwideReleaseDate, "2027-02-01");
  assert.equal(
    normalizeMovie(
      foreignPremiere,
      2027,
      undefined,
      new Date("2027-02-01T00:00:00Z"),
    ),
    null,
  );
  foreignPremiere.release_dates.results.push({
    iso_3166_1: "CA",
    release_dates: [{ type: 3, release_date: "2026-12-01" }],
  });
  assert.equal(movieFromDetails(foreignPremiere, 2027), null);
  assert.equal(
    movieFromDetails(details(1, "No regional date", "2027-03-01", []), 2027)
      .releaseDate,
    "",
  );
  assert.throws(
    () =>
      movieFromDetails(
        { id: 1, title: "Missing history", release_date: "2027-01-01" },
        2027,
      ),
    /history is missing/,
  );
});

test("a known North American date outside 2027 excludes a future 2027 foreign debut", () => {
  const film = details(12, "Foreign debut", "2027-02-01", [[4, "2028-01-01"]]);
  assert.equal(movieFromDetails(film, 2027), null);
  film.release_dates.results[0].release_dates = [];
  assert.equal(movieFromDetails(film, 2027).releaseDate, "");
  assert.equal(movieFromDetails(film, 2027).worldwideReleaseDate, "2027-02-01");
});

test("a rename keeps the TMDB ID and previous names", () => {
  const movie = movieFromDetails(
    details(1, "New title", "2027-05-01"),
    2027,
    entry(1, "Working title"),
  );
  assert.equal(movie.id, "tmdb-1");
  assert.deepEqual(movie.previousNames, ["Working title"]);
});

test("TMDB auth stays in a bearer header, supports API key fallback, and failures never echo secrets", async () => {
  await tmdbRequest(
    { TMDB_READ_ACCESS_TOKEN: "private-token", TMDB_API_KEY: "private-key" },
    "discover/movie",
    {},
    async (url, options) => {
      assert.equal(options.headers.Authorization, "Bearer private-token");
      assert.equal(new URL(url).searchParams.has("api_key"), false);
      return Response.json({ results: [] });
    },
  );
  await assert.rejects(
    tmdbRequest(
      { TMDB_API_KEY: "private-key" },
      "discover/movie",
      {},
      async (url) => {
        assert.equal(new URL(url).searchParams.get("api_key"), "private-key");
        return new Response("private-key", { status: 429 });
      },
    ),
    /^Error: TMDB request failed \(429\)\.$/,
  );
});

test("discovery follows every page, includes video and all release types, and rechecks existing IDs", async () => {
  const seen = [];
  const job = await advanceMovieJob(
    start(),
    catalog([entry(42)]),
    { TMDB_READ_ACCESS_TOKEN: "fixture" },
    async (url) => {
      const query = new URL(url).searchParams;
      seen.push(`${query.get("region")}:${query.get("page")}`);
      assert.equal(query.get("include_video"), "true");
      assert.equal(
        query.get(
          query.has("region") ? "release_date.gte" : "primary_release_date.gte",
        ),
        "2027-01-01",
      );
      if (query.has("region"))
        assert.equal(query.get("with_release_type"), "1|2|3|4|5|6");
      return Response.json({
        total_pages: 2,
        results: [{ id: Number(query.get("page")) }],
      });
    },
  );
  assert.deepEqual(seen, ["US:1", "US:2", "CA:1", "CA:2", "null:1", "null:2"]);
  assert.deepEqual(job.ids, [1, 2, 42]);
  assert.equal(job.phase, "details");
  await assert.rejects(
    advanceMovieJob(start(), null, { TMDB_API_KEY: "fixture" }, async () =>
      Response.json({ total_pages: 501, results: [] }),
    ),
    /completely/,
  );
});

test("detail work is bounded and failed batches do not mutate the checkpoint", async () => {
  const job = {
    ...start(),
    phase: "details",
    cursor: 0,
    ids: Array.from({ length: BATCH_SIZE + 3 }, (_, i) => i + 1),
  };
  let calls = 0;
  const next = await advanceMovieJob(
    job,
    null,
    { TMDB_READ_ACCESS_TOKEN: "fixture" },
    async (url) => {
      calls += 1;
      const id = Number(new URL(url).pathname.split("/").at(-1));
      return Response.json(details(id, `Film ${id}`, "2027-01-01"));
    },
  );
  assert.equal(calls, BATCH_SIZE);
  assert.equal(next.cursor, BATCH_SIZE);
  assert.equal(job.cursor, 0);
  await assert.rejects(
    advanceMovieJob(
      job,
      null,
      { TMDB_API_KEY: "fixture" },
      async () => new Response("busy", { status: 503 }),
    ),
    /503/,
  );
  assert.deepEqual(job.movies, []);
});

test("legacy and free-text picks adopt stable identity, remain taken after a rename, and preserve retry receipts", () => {
  let state = newDraft(
    { ...configuration, options: [{ id: "legacy", name: "Working title" }] },
    "6",
  );
  state = apply(apply(state, "publish"), "start");
  state = apply(
    state,
    "pick",
    { optionId: "legacy", requestId: "pick-1" },
    "1",
    false,
  );
  const before = structuredClone(state);
  state = mergeMovieCatalog(
    state,
    catalog([entry(1, "New title", "2027-04-05", ["Working title"])]),
  );
  assert.equal(state.options.length, 1);
  assert.equal(state.options[0].id, "legacy");
  assert.equal(state.options[0].tmdbId, 1);
  assert.equal(state.options[0].name, "New title");
  assert.deepEqual(state.picks, before.picks);
  assert.deepEqual(state.requests, before.requests);
  assert.deepEqual(state.schedule, before.schedule);
  assert.equal(state.turnToken, before.turnToken);
  assert.throws(
    () =>
      apply(
        state,
        "pick",
        { optionName: "New title", requestId: "pick-2" },
        "2",
        false,
      ),
    /taken/,
  );
  assert.throws(
    () =>
      apply(
        state,
        "pick",
        { optionName: "Working title", requestId: "pick-3" },
        "2",
        false,
      ),
    /taken/,
  );
  assert.equal(
    mergeMovieCatalog(
      state,
      catalog([entry(1, "New title", "2027-04-05", ["Working title"])]),
    ),
    state,
  );

  let custom = apply(apply(newDraft(configuration, "6"), "publish"), "start");
  custom = apply(
    custom,
    "pick",
    { optionName: "Working title", requestId: "custom" },
    "1",
    false,
  );
  const id = custom.picks[0].optionId;
  custom = mergeMovieCatalog(
    custom,
    catalog([entry(1, "New title", "2027-04-05", ["Working title"])]),
  );
  assert.equal(custom.options[0].id, id);
  assert.throws(
    () =>
      apply(custom, "pick", { optionId: id, requestId: "another" }, "2", false),
    /taken/,
  );
});

test("old-title submissions are idempotent even when the canonical title differs", () => {
  let state = mergeMovieCatalog(
    newDraft(configuration, "6"),
    catalog([entry(1, "New title", "2027-04-05", ["Working title"])]),
  );
  state = apply(apply(state, "publish"), "start");
  state = apply(
    state,
    "pick",
    { optionName: "Working title", requestId: "alias" },
    "1",
    false,
  );
  assert.equal(
    apply(
      state,
      "pick",
      { optionName: "Working title", requestId: "alias" },
      "1",
      false,
    ),
    state,
  );
  assert.throws(
    () =>
      apply(
        state,
        "pick",
        { optionName: "Different title", requestId: "alias" },
        "1",
        false,
      ),
    /another selection/,
  );
});

test("admin corrections survive refresh; unpicked shifted films leave the pool while picked films stay taken", () => {
  let state = mergeMovieCatalog(
    newDraft(configuration, "6"),
    catalog([entry(1), entry(2, "Another film")]),
  );
  state = apply(state, "resource-dates", {
    options: [{ id: "tmdb-1", releaseDate: "2027-09-09" }],
  });
  state = mergeMovieCatalog(
    state,
    catalog(
      [entry(1, "Renamed", "2027-02-02"), entry(2, "Another film")],
      "2026-10-22T09:00:00.000Z",
    ),
  );
  assert.equal(state.options[0].releaseDate, "2027-09-09");
  state = apply(apply(state, "publish"), "start");
  state = apply(
    state,
    "pick",
    { optionId: "tmdb-1", requestId: "pick" },
    "1",
    false,
  );
  state = mergeMovieCatalog(
    state,
    catalog([entry(3, "New film")], "2026-10-23T09:00:00.000Z"),
  );
  assert.equal(
    state.options.some((option) => option.tmdbId === 2),
    false,
  );
  assert.equal(
    state.options.find((option) => option.tmdbId === 1).retired,
    true,
  );
  assert.equal(state.picks[0].optionId, "tmdb-1");
  assert.equal(state.movieResourceDateOverrides[1], "2027-09-09");
  state = mergeMovieCatalog(
    state,
    catalog(
      [entry(1, "Returned film", "2027-02-02")],
      "2026-10-24T09:00:00.000Z",
    ),
  );
  assert.equal(
    state.options.find((option) => option.tmdbId === 1).releaseDate,
    "2027-09-09",
  );
  assert.equal(
    mergeMovieCatalog({ ...state, league: "world-cup" }, catalog()).league,
    "world-cup",
  );
});

test("reconfiguring manual options preserves the automatic catalog", () => {
  const state = mergeMovieCatalog(newDraft(configuration, "6"), catalog());
  const next = apply(state, "configure", {
    ...configuration,
    options: [{ id: "manual", name: "Manual choice" }],
  });
  assert.deepEqual(
    next.options.map((option) => option.id),
    ["manual", "tmdb-1"],
  );
});

test("real SQLite checkpoints publish only complete data, sync drafts, and schedule the next overnight refresh", async () => {
  const { sqlite, env, insert } = await database();
  try {
    const state = newDraft(configuration, "6");
    await insert(state);
    const now = new Date("2026-10-21T09:00:00.000Z");
    const fetcher = async (url) =>
      new URL(url).pathname.endsWith("discover/movie")
        ? Response.json({ total_pages: 1, results: [{ id: 1 }, { id: 2 }] })
        : Response.json(
            new URL(url).pathname.endsWith("/1")
              ? details(1, "First Film", "2027-03-01", [[4, "2027-03-01"]])
              : details(2, "Old movie on video", "2026-12-01", [
                  [3, "2026-12-01"],
                  [4, "2027-01-01"],
                ]),
          );
    assert.equal(
      (await refreshMovieResource(env, saveState, { now, fetcher })).phase,
      "details",
    );
    assert.equal(
      JSON.parse(
        sqlite
          .prepare("SELECT published FROM league_drafts_movie_resource")
          .get().published,
      ),
      null,
    );
    assert.equal(
      (await refreshMovieResource(env, saveState, { now, fetcher })).phase,
      "publish",
    );
    assert.equal(
      (await refreshMovieResource(env, saveState, { now, fetcher })).phase,
      "drafts",
    );
    assert.equal(
      (await refreshMovieResource(env, saveState, { now, fetcher })).phase,
      "drafts",
    );
    assert.equal(
      (await refreshMovieResource(env, saveState, { now, fetcher })).phase,
      "complete",
    );
    const stored = JSON.parse(
      sqlite.prepare("SELECT state FROM league_drafts_state").get().state,
    );
    assert.equal(stored.options.length, 1);
    assert.equal(stored.options[0].name, "First Film");
    assert.equal(
      (await refreshMovieResource(env, saveState, { now, fetcher })).phase,
      "idle",
    );
    assert.equal(
      sqlite.prepare("SELECT next_run FROM league_drafts_movie_resource").get()
        .next_run,
      "2026-10-22T09:00:00.000Z",
    );
    const publicStatus = await worker.fetch(
      new Request("https://draft.test/api/movie-resource"),
      env,
      { waitUntil() {} },
    );
    const status = await publicStatus.json();
    assert.equal(status.movies, 1);
    assert.equal(status.policy, "unreleased-na-2027");
    assert.equal(JSON.stringify(status).includes("fixture-token"), false);
  } finally {
    sqlite.close();
  }
});

test("concurrent refreshes are leased, provider failures retain the publication, and concurrent picks are never overwritten", async () => {
  const { sqlite, env, insert } = await database();
  try {
    const state = apply(
      apply(newDraft(configuration, "6"), "publish"),
      "start",
    );
    await insert(state);
    const published = catalog();
    await env.DB.prepare(
      "INSERT INTO league_drafts_movie_resource (environment, year, published, job) VALUES (?, ?, ?, ?)",
    )
      .bind(
        "dev",
        2027,
        JSON.stringify(published),
        JSON.stringify({ ...start(), phase: "details", cursor: 0, ids: [1] }),
      )
      .run();
    const now = new Date("2026-10-22T09:00:00.000Z");
    let release;
    const pause = new Promise((resolve) => {
      release = resolve;
    });
    const first = refreshMovieResource(env, saveState, {
      now,
      fetcher: async () => {
        await pause;
        return new Response("unavailable", { status: 503 });
      },
    });
    // Wait until the lease is visible before submitting another invocation.
    for (
      let i = 0;
      i < 10 &&
      !sqlite
        .prepare("SELECT lease_until FROM league_drafts_movie_resource")
        .get().lease_until;
      i++
    )
      await Promise.resolve();
    assert.equal(
      (await refreshMovieResource(env, saveState, { now })).phase,
      "busy",
    );
    release();
    await assert.rejects(first, /503/);
    assert.deepEqual(
      JSON.parse(
        sqlite
          .prepare("SELECT published FROM league_drafts_movie_resource")
          .get().published,
      ),
      published,
    );
    assert.equal(
      JSON.parse(
        sqlite.prepare("SELECT job FROM league_drafts_movie_resource").get()
          .job,
      ).cursor,
      0,
    );

    sqlite.prepare("UPDATE league_drafts_movie_resource SET job = ?").run(
      JSON.stringify({
        phase: "drafts",
        policy: "unreleased-na-2027",
        after: "",
      }),
    );
    let calls = 0;
    const conflict = async (_env, previous) => {
      calls++;
      const picked = apply(
        previous,
        "pick",
        { optionName: "Free-form pick", requestId: "concurrent" },
        "1",
        false,
      );
      await saveState(env, previous, picked);
      return false;
    };
    await assert.rejects(
      refreshMovieResource(env, conflict, { now }),
      /draft changed/,
    );
    assert.equal(calls, 1);
    assert.equal(
      JSON.parse(
        sqlite.prepare("SELECT state FROM league_drafts_state").get().state,
      ).picks.length,
      1,
    );
    await refreshMovieResource(env, saveState, { now });
    const updated = JSON.parse(
      sqlite.prepare("SELECT state FROM league_drafts_state").get().state,
    );
    assert.equal(updated.picks.length, 1);
    assert.equal(updated.options[0].tmdbId, 1);
  } finally {
    sqlite.close();
  }
});

test("regional policy changes restart discovery without discarding the last publication", async () => {
  const { sqlite, env } = await database();
  try {
    const old = { ...catalog(), policy: "first-worldwide" };
    await env.DB.prepare(
      "INSERT INTO league_drafts_movie_resource (environment, year, published, next_run) VALUES (?, ?, ?, ?)",
    )
      .bind("dev", 2027, JSON.stringify(old), "2099-01-01T09:00:00.000Z")
      .run();
    const regions = [];
    const result = await refreshMovieResource(env, saveState, {
      now: new Date("2026-10-21T09:00:00.000Z"),
      fetcher: async (url) => {
        regions.push(new URL(url).searchParams.get("region"));
        return Response.json({ total_pages: 1, results: [{ id: 1 }] });
      },
    });
    assert.equal(result.phase, "details");
    assert.deepEqual(regions, ["US", "CA", null]);
    assert.deepEqual(
      JSON.parse(
        sqlite
          .prepare("SELECT published FROM league_drafts_movie_resource")
          .get().published,
      ),
      old,
    );
  } finally {
    sqlite.close();
  }
});

test("authenticated review associates an unlisted pick through the real SQLite service", async () => {
  const { sqlite, env, insert } = await database();
  try {
    let state = mergeMovieCatalog(newDraft(configuration, "6"), catalog());
    state = apply(apply(state, "publish"), "start");
    state = apply(
      state,
      "pick",
      { optionName: "Unlisted working name", requestId: "original" },
      "1",
      false,
    );
    const originalId = state.picks[0].optionId;
    await insert(state);
    const authEnv = {
      ...env,
      ADMIN_MANAGER_IDS: "6",
      AUTH_SERVICE: {
        async fetch(request) {
          const body = await request.json();
          return Response.json({
            ok: true,
            managerId: body.accessToken === "admin" ? "6" : "1",
          });
        },
      },
    };
    const request = (token) =>
      new Request(`https://draft.test/api/drafts/${state.id}/associate-pick`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          revision: state.revision,
          pickNumber: 1,
          tmdbReference: "1",
          links: { letterboxd: "https://letterboxd.com/film/first-film/" },
        }),
      });
    const ctx = { waitUntil() {} };
    assert.equal(
      (await worker.fetch(request("participant"), authEnv, ctx)).status,
      403,
    );
    const response = await worker.fetch(request("admin"), authEnv, ctx);
    assert.equal(response.status, 200);
    const reviewed = (await response.json()).draft;
    assert.equal(reviewed.picks[0].needsReview, false);
    assert.equal(reviewed.picks[0].optionId, originalId);
    assert.equal(
      reviewed.picks[0].sourceLinks.tmdb,
      "https://www.themoviedb.org/movie/1",
    );
    assert.equal(
      reviewed.options.find((option) => option.tmdbId === 1).id,
      originalId,
    );
    assert.equal(reviewed.picks.length, 1);
    assert.deepEqual(reviewed.schedule, state.schedule);
    assert.deepEqual(
      JSON.parse(
        sqlite.prepare("SELECT state FROM league_drafts_state").get().state,
      ).requests,
      state.requests,
    );
  } finally {
    sqlite.close();
  }
});
