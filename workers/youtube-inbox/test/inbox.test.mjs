import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

import worker, { buildVideoPageQuery } from "../src/index.js";

async function inbox(t, { cache = true } = {}) {
  const database = new DatabaseSync(":memory:");
  t.after(() => database.close());
  for (const file of ["0001_initial.sql", "0002_feed_indexes.sql"]) {
    database.exec(
      readFileSync(new URL(`../migrations/${file}`, import.meta.url), "utf8"),
    );
  }
  database.exec(`
    INSERT INTO channels (youtube_channel_id, name, uploads_playlist_id)
    VALUES ('channel-a', 'A', 'uploads-a'), ('channel-b', 'B', 'uploads-b');
    INSERT INTO settings (key, value) VALUES ('last_sync_at', '2026-10-17T00:00:00Z');
    INSERT INTO playlists (youtube_playlist_id, name) VALUES ('playlist', 'VW');
  `);
  const insert = database.prepare(`
    INSERT INTO videos (youtube_video_id, channel_id, title, published_at, status)
    VALUES (?, ?, ?, ?, ?)
  `);
  database.exec("BEGIN");
  for (let index = 0; index < 16000; index += 1) {
    insert.run(
      `video-${index}`,
      (index % 2) + 1,
      `Video ${index}`,
      "2026-10-16T00:00:00Z",
      index === 15999 ? "saved" : "new",
    );
  }
  database.exec("COMMIT");
  const queries = [];
  const cacheCalls = [];
  const storage = new Map();
  const snapshots = {
    async get(key) {
      cacheCalls.push(["get", key]);
      return JSON.parse(storage.get(key) || "null");
    },
    async put(key, value, options) {
      cacheCalls.push(["put", key]);
      storage.set(key, value);
      assert.ok(options.expirationTtl <= 300);
    },
    async delete(key) {
      cacheCalls.push(["delete", key]);
      storage.delete(key);
    },
  };
  const env = {
    INBOX_PASSPHRASE: "test-passphrase",
    SESSION_SECRET: "test-secret",
    GOOGLE_CLIENT_ID: "test-client",
    GOOGLE_CLIENT_SECRET: "test-client-secret",
    YOUTUBE_REFRESH_TOKEN: "test-refresh",
    SNAPSHOTS: cache ? snapshots : undefined,
    DB: {
      prepare(sql) {
        const statement = database.prepare(sql);
        let bindings = [];
        return {
          bind(...values) {
            bindings = values;
            return this;
          },
          async all() {
            queries.push({ sql, bindings });
            return { results: statement.all(...bindings) };
          },
          async first() {
            queries.push({ sql, bindings });
            return statement.get(...bindings) || null;
          },
          async run() {
            queries.push({ sql, bindings });
            return { meta: { changes: statement.run(...bindings).changes } };
          },
        };
      },
      async batch(statements) {
        database.exec("BEGIN");
        try {
          const results = await Promise.all(
            statements.map((statement) => statement.run()),
          );
          database.exec("COMMIT");
          return results;
        } catch (error) {
          database.exec("ROLLBACK");
          throw error;
        }
      },
    },
  };
  const login = await worker.fetch(
    new Request("https://example.com/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ passphrase: env.INBOX_PASSPHRASE }),
    }),
    env,
  );
  assert.equal(login.status, 200);
  const { token } = await login.json();
  async function request(path, body, expectedStatus = 200) {
    const response = await worker.fetch(
      new Request(`https://example.com${path}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        ...(body ? { method: "POST", body: JSON.stringify(body) } : {}),
      }),
      env,
    );
    const data = await response.json();
    assert.equal(response.status, expectedStatus, JSON.stringify(data));
    return data;
  }
  return { request, database, queries, cacheCalls, storage, env };
}

test("video pages are bounded, ordered, filtered, and reuse only small metadata", async (t) => {
  const { request, queries, cacheCalls, storage } = await inbox(t);
  const [first, playlists] = await Promise.all([
    request("/api/videos?limit=100"),
    request("/api/youtube/playlists"),
  ]);
  assert.equal(first.videos.length, 100);
  assert.equal(first.videos[0].youtubeVideoId, "video-15998");
  assert.equal(first.lastSyncAt, "2026-10-17T00:00:00Z");
  assert.ok(first.nextCursor);
  assert.ok(playlists.playlists.some((playlist) => playlist.name === "VW"));
  assert.equal(queries.length, 4); // one feed query plus three shared metadata queries
  assert.equal(cacheCalls.length, 2);
  assert.ok(cacheCalls.every(([, key]) => key === "youtube-inbox:metadata:v1"));
  assert.ok(!storage.get("youtube-inbox:metadata:v1").includes('"videos"'));

  const second = await request(
    `/api/videos?limit=100&cursor=${encodeURIComponent(first.nextCursor)}`,
  );
  assert.equal(second.videos[0].youtubeVideoId, "video-15898");
  assert.equal(queries.length, 5); // no repeated channel, settings, or playlist reads
  const filtered = await request(
    "/api/videos?channel=channel-b&limit=2&offset=1",
  );
  assert.deepEqual(
    filtered.videos.map((video) => video.youtubeVideoId),
    ["video-15995", "video-15993"],
  );
  const saved = await request("/api/videos?status=saved");
  assert.deepEqual(
    saved.videos.map((video) => video.youtubeVideoId),
    ["video-15999"],
  );
  assert.equal(saved.nextCursor, null);
  const all = await request("/api/videos?status=all&channel=channel-b&limit=2");
  assert.deepEqual(
    all.videos.map((video) => video.youtubeVideoId),
    ["video-15999", "video-15997"],
  );
  const before = queries.length;
  assert.equal(
    (await request("/api/videos?channel=__none__")).videos.length,
    0,
  );
  assert.equal(queries.length, before);
  await request("/api/videos?cursor=invalid", undefined, 400);
});

test("seen-through seeks selected IDs and preserves unrelated and non-new videos", async (t) => {
  const { request, database, queries, cacheCalls } = await inbox(t);
  const first = await request("/api/videos?limit=2");
  cacheCalls.length = 0;
  const result = await request("/api/videos/video-15997/seen-through", {
    videoIds: [
      "video-15999",
      "video-15998",
      "video-15997",
      "video-15997",
      "missing",
    ],
  });
  assert.equal(result.updated, 2);
  const update = queries.at(-1);
  const plan = database
    .prepare(`EXPLAIN QUERY PLAN ${update.sql}`)
    .all(...update.bindings)
    .map((row) => row.detail)
    .join("\n");
  assert.match(plan, /SEARCH videos USING INTEGER PRIMARY KEY/);
  assert.match(
    plan,
    /SEARCH videos USING COVERING INDEX sqlite_autoindex_videos_1/,
  );
  assert.doesNotMatch(plan, /idx_videos_status_published|SCAN videos/);
  assert.equal(cacheCalls.length, 0);
  const seen = await request("/api/videos?status=watched");
  assert.deepEqual(
    seen.videos.map((video) => video.youtubeVideoId),
    ["video-15998", "video-15997"],
  );
  const next = await request(
    `/api/videos?limit=2&cursor=${encodeURIComponent(first.nextCursor)}`,
  );
  assert.deepEqual(
    next.videos.map((video) => video.youtubeVideoId),
    ["video-15996", "video-15995"],
  );
  const saved = await request("/api/videos?status=saved");
  assert.equal(saved.videos[0].youtubeVideoId, "video-15999");
  await request("/api/videos/video-15996/status", { status: "watched" });
  assert.equal(
    (await request("/api/videos")).videos[0].youtubeVideoId,
    "video-15995",
  );
});

test("feed indexes avoid sorting full history and seek into later pages", async (t) => {
  const { database } = await inbox(t, { cache: false });
  for (const options of [
    { status: "new" },
    { status: "all" },
    { status: "new", channelIds: [1] },
    { status: "new", channelIds: [1, 2] },
  ]) {
    const query = buildVideoPageQuery({
      ...options,
      cursor: { publishedAt: "2026-10-16T00:00:00Z", id: 8000 },
    });
    const plan = database
      .prepare(`EXPLAIN QUERY PLAN ${query.sql}`)
      .all(...query.bindings)
      .map((row) => row.detail)
      .join("\n");
    assert.doesNotMatch(plan, /TEMP B-TREE|SCAN videos/, plan);
    assert.match(
      plan,
      /SEARCH videos USING INDEX idx_videos_.*published/,
      plan,
    );
    assert.equal(
      database.prepare(query.sql).all(...query.bindings).length,
      101,
    );
  }
});

test("playlist saves persist atomically without any full-history or metadata cache work", async (t) => {
  const { request, database, queries, cacheCalls } = await inbox(t);
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    calls.push({ url, options });
    return Response.json(
      url.includes("oauth2")
        ? { access_token: "test-access-token" }
        : { id: "playlist-item" },
    );
  });
  await request("/api/youtube/playlists/playlist/videos", {
    videoId: "video-15998",
  });
  assert.equal(calls.length, 2);
  assert.deepEqual(JSON.parse(calls[1].options.body).snippet, {
    playlistId: "playlist",
    resourceId: { kind: "youtube#video", videoId: "video-15998" },
  });
  assert.equal(queries.length, 4);
  assert.equal(cacheCalls.length, 0);
  assert.equal(
    database.prepare("SELECT COUNT(*) AS n FROM video_playlist_actions").get()
      .n,
    1,
  );
  assert.equal((await request("/api/videos?status=saved")).videos.length, 2);

  database.exec(`CREATE TRIGGER reject_save BEFORE UPDATE ON videos
    WHEN NEW.youtube_video_id = 'video-15997' BEGIN SELECT RAISE(ABORT, 'simulated write failure'); END;`);
  t.mock.method(console, "error", () => {});
  await request(
    "/api/youtube/playlists/playlist/videos",
    { videoId: "video-15997" },
    500,
  );
  assert.equal(
    database.prepare("SELECT COUNT(*) AS n FROM video_playlist_actions").get()
      .n,
    1,
  );
});

test("expired metadata is rebuilt and cache failures fall back to bounded D1 reads", async (t) => {
  const { request, storage, env } = await inbox(t);
  storage.set(
    "youtube-inbox:metadata:v1",
    JSON.stringify({ channels: [], playlists: [], expiresAt: Date.now() - 1 }),
  );
  assert.equal((await request("/api/videos?limit=1")).videos.length, 1);
  const other = await inbox(t);
  other.env.SNAPSHOTS = {
    async get() {
      throw new Error("unavailable");
    },
    async put() {
      throw new Error("unavailable");
    },
  };
  t.mock.method(console, "warn", () => {});
  assert.equal((await other.request("/api/videos?limit=1")).videos.length, 1);
  assert.ok(env.SNAPSHOTS);
});

test("a sync invalidates only small metadata and does not rebuild video history", async (t) => {
  const { request, queries, cacheCalls } = await inbox(t);
  await request("/api/videos?limit=1");
  const before = queries.length;
  t.mock.method(globalThis, "fetch", async (url) =>
    Response.json(
      url.includes("oauth2")
        ? { access_token: "test-access-token" }
        : { items: [] },
    ),
  );
  const result = await request("/api/youtube/sync", {});
  assert.equal(result.hasMore, false);
  assert.equal(cacheCalls.at(-1)[0], "delete");
  const syncQueries = queries.slice(before);
  assert.ok(!syncQueries.some(({ sql }) => /SELECT.*FROM videos/is.test(sql)));
  const page = await request("/api/videos?limit=1");
  assert.equal(page.lastSyncAt, result.lastSyncAt);
  assert.equal(cacheCalls.at(-1)[0], "put");
});
