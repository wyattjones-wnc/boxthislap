import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { Miniflare } from "miniflare";
import {
  hardSaveMatchMedia,
  importMatchMedia,
  listMatchMedia,
  markMatchMediaSeenThrough,
  saveMatchMediaState,
  syncMatchMediaScan,
} from "../src/index.js";

const schemaPath = fileURLToPath(
  new URL("../migrations/0010_match_media.sql", import.meta.url),
);
const root = fileURLToPath(new URL("../../../", import.meta.url));
const workerPath = fileURLToPath(new URL("../src/index.js", import.meta.url));

test("match media import is idempotent and preserves save state through Seen through here", async (context) => {
  const worker = await createWorker();
  context.after(() => worker.dispose());
  const DB = await worker.getD1Database("DB");
  await executeSql(DB, await readFile(schemaPath, "utf8"));
  const env = { DB };
  const scanId = "scan-1";
  await syncMatchMediaScan(env, scanId, "start", {});
  const gallery = {
    id: "gallery-1",
    source: "barcelona",
    sourceGalleryId: "123",
    teamId: "2",
    matchId: "match-1",
    sourceUrl: "https://www.fcbarcelona.com/gallery/123",
    title: "Photos from the win",
    publishedAt: "2026-09-27T20:00:00Z",
    category: "match",
    expectedImageCount: 2,
    matchConfidence: 90,
    matchStatus: "auto",
    matchEvidence: ["opponent"],
    images: [
      image("image-1", "one", "2026-09-28T02:00:00Z"),
      image("image-2", "two", "2026-09-28T01:00:00Z"),
    ],
  };
  await importMatchMedia(env, scanId, { galleries: [gallery], sourceRuns: [] });
  await importMatchMedia(env, scanId, { galleries: [gallery], sourceRuns: [] });
  let feed = await listMatchMedia(env, "6", new URLSearchParams());
  assert.equal(feed.images.length, 2);
  assert.ok(
    feed.images.every(
      (candidate) =>
        candidate.sourceImageUrl ===
        `https://media.fcbarcelona.com/${candidate.id === "image-1" ? "one" : "two"}.jpg`,
    ),
  );
  await saveMatchMediaState(env, "6", "image-1", { softSaved: true });
  const result = await markMatchMediaSeenThrough(env, "6", "image-2", {
    sort: "newest",
    teamId: "2",
  });
  assert.equal(result.seen, 2);
  feed = await listMatchMedia(env, "6", new URLSearchParams("view=saved"));
  assert.equal(feed.images.length, 1);
  assert.equal(feed.images[0].id, "image-1");
  assert.equal(feed.images[0].seen, true);
});

test("Getty embeds cannot be hard saved", async (context) => {
  const worker = await createWorker();
  context.after(() => worker.dispose());
  const DB = await worker.getD1Database("DB");
  await executeSql(DB, await readFile(schemaPath, "utf8"));
  await DB.prepare(
    `INSERT INTO footy_media_images (id, source, source_image_key, original_page_url, render_mode, embed_url, first_observed_at, last_observed_at)
    VALUES ('getty-1', 'getty', '1', 'https://gettyimages.com/1', 'getty_embed', 'https://embed.gettyimages.com/embed/1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
  ).run();
  await assert.rejects(
    () => hardSaveMatchMedia({ DB, MATCH_MEDIA: {} }, "6", "getty-1"),
    (error) => error.status === 409,
  );
});

test("Hard Save copies an imported club image and applies Soft Save", async (context) => {
  const worker = await createWorker();
  context.after(() => worker.dispose());
  const DB = await worker.getD1Database("DB");
  await executeSql(DB, await readFile(schemaPath, "utf8"));
  await DB.prepare(
    `INSERT INTO footy_media_images (id, source, source_image_key, source_image_url, normalized_url, original_page_url, render_mode, first_observed_at, last_observed_at)
     VALUES ('club-1', 'arsenal', '1', 'https://media.arsenal.com/1.jpg?width\\u003d1200,', 'https://media.arsenal.com/1.jpg', 'https://arsenal.com/gallery/1', 'image', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
  ).run();
  let stored = null;
  let requestedUrl = "";
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    requestedUrl = String(url);
    return {
      ok: true,
      status: 200,
      url: "https://media.arsenal.com/1.jpg",
      headers: new Headers({ "Content-Type": "image/jpeg" }),
      arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
    };
  };
  context.after(() => {
    globalThis.fetch = originalFetch;
  });
  const saved = await hardSaveMatchMedia(
    {
      DB,
      MATCH_MEDIA: {
        put: async (key, bytes) => {
          stored = { key, size: bytes.byteLength };
        },
      },
    },
    "6",
    "club-1",
  );
  assert.equal(saved.hardSaved, true);
  assert.equal(saved.softSaved, true);
  assert.equal(requestedUrl, "https://media.arsenal.com/1.jpg");
  assert.deepEqual(stored, { key: "match-images/club-1.jpg", size: 3 });
  const state = await DB.prepare(
    "SELECT soft_saved_at FROM footy_media_manager_state WHERE manager_id = '6' AND image_id = 'club-1'",
  ).first();
  assert.ok(state.soft_saved_at);
});

function image(id, key, firstObservedAt) {
  return {
    id,
    sourceImageKey: key,
    sourceImageUrl: `https://media.fcbarcelona.com/${key}.jpg?width\\u003d1200,`,
    normalizedUrl: `https://media.fcbarcelona.com/${key}.jpg`,
    originalPageUrl: "https://www.fcbarcelona.com/gallery/123",
    renderMode: "image",
    firstObservedAt,
  };
}

async function executeSql(db, sql) {
  const statements = String(sql)
    .replaceAll("\r", "")
    .split(/;\s*(?:\n|$)/)
    .map((value) => value.trim())
    .filter(Boolean);
  for (const statement of statements) await db.prepare(statement).run();
}

async function createWorker() {
  return new Miniflare({
    workers: [
      {
        config: {
          compatibilityDate: "2026-08-22",
          env: {
            DB: { name: `footy-media-${crypto.randomUUID()}`, type: "d1" },
          },
          manifest: {
            mainModule: "index.js",
            modules: {
              "index.js": {
                contents: await readFile(workerPath, "utf8"),
                type: "esm",
              },
            },
            modulesRoot: root,
          },
          name: `footy-media-${crypto.randomUUID()}`,
          type: "worker",
        },
      },
    ],
  });
}
