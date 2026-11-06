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
  reviewMatchMediaGallery,
  saveMatchMediaState,
  syncMatchMediaScan,
} from "../src/index.js";

const schemaPath = fileURLToPath(
  new URL("../migrations/0010_match_media.sql", import.meta.url),
);
const trainingMigrationPath = fileURLToPath(
  new URL("../migrations/0011_match_media_training.sql", import.meta.url),
);
const root = fileURLToPath(new URL("../../../", import.meta.url));
const workerPath = fileURLToPath(new URL("../src/index.js", import.meta.url));

test("match media import is idempotent and preserves save state through Seen through here", async (context) => {
  const worker = await createWorker();
  context.after(() => worker.dispose());
  const DB = await worker.getD1Database("DB");
  await executeSql(DB, await readFile(schemaPath, "utf8"));
  await executeSql(
    DB,
    await readFile(
      new URL("../migrations/0012_image_library.sql", import.meta.url),
      "utf8",
    ),
  );
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
  await importMatchMedia(env, scanId, {
    galleries: [
      {
        ...gallery,
        id: "gallery-2",
        sourceGalleryId: "456",
        title: "Another gallery",
        images: [image("image-3", "three", "2026-09-28T03:00:00Z")],
      },
    ],
    sourceRuns: [],
  });
  let feed = await listMatchMedia(env, "6", new URLSearchParams());
  assert.equal(feed.images.length, 3);
  assert.ok(
    feed.images
      .filter((candidate) => candidate.gallery.id === "gallery-1")
      .every(
        (candidate) =>
          candidate.sourceImageUrl ===
          `https://media.fcbarcelona.com/${candidate.id === "image-1" ? "one" : "two"}.jpg?width=1200`,
      ),
  );
  await saveMatchMediaState(env, "6", "image-1", { softSaved: true });
  const result = await markMatchMediaSeenThrough(env, "6", "image-2", {
    sort: "newest",
    galleryId: "gallery-1",
  });
  assert.equal(result.seen, 2);
  feed = await listMatchMedia(env, "6", new URLSearchParams());
  assert.equal(feed.images.length, 1);
  assert.equal(feed.images[0].id, "image-3");
  feed = await listMatchMedia(env, "6", new URLSearchParams("view=saved"));
  assert.equal(feed.images.length, 1);
  assert.equal(feed.images[0].id, "image-1");
  assert.equal(feed.images[0].seen, true);

  // Hard saves can retain a soft-save flag, but belong only in Hard Saved.
  await saveMatchMediaState(env, "6", "image-2", { softSaved: true });
  await DB.prepare(
    "UPDATE footy_media_images SET hard_saved_at = CURRENT_TIMESTAMP WHERE id IN ('image-2', 'image-3')",
  ).run();
  const softSaved = await listMatchMedia(env, "6", new URLSearchParams("view=saved"));
  const hardSaved = await listMatchMedia(env, "6", new URLSearchParams("view=hard-saved"));
  assert.deepEqual(softSaved.images.map((candidate) => candidate.id), ["image-1"]);
  assert.deepEqual(hardSaved.images.map((candidate) => candidate.id).sort(), ["image-2", "image-3"]);
  assert.ok(softSaved.images.every((candidate) => !candidate.hardSaved));
  assert.ok(hardSaved.images.every((candidate) => candidate.hardSaved));
  assert.equal(hardSaved.images.find((candidate) => candidate.id === "image-3").softSaved, false);
});

test("Getty embeds cannot be hard saved", async (context) => {
  const worker = await createWorker();
  context.after(() => worker.dispose());
  const DB = await worker.getD1Database("DB");
  await executeSql(DB, await readFile(schemaPath, "utf8"));
  await executeSql(
    DB,
    await readFile(
      new URL("../migrations/0012_image_library.sql", import.meta.url),
      "utf8",
    ),
  );
  await DB.prepare(
    `INSERT INTO footy_media_images (id, source, source_image_key, original_page_url, render_mode, embed_url, first_observed_at, last_observed_at)
    VALUES ('getty-1', 'getty', '1', 'https://gettyimages.com/1', 'getty_embed', 'https://embed.gettyimages.com/embed/1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
  ).run();
  await assert.rejects(
    () => hardSaveMatchMedia({ DB, MATCH_MEDIA: {} }, "6", "getty-1"),
    (error) => error.status === 409,
  );
});

test("review can keep a training gallery without a match", async (context) => {
  const worker = await createWorker();
  context.after(() => worker.dispose());
  const DB = await worker.getD1Database("DB");
  await executeSql(DB, await readFile(schemaPath, "utf8"));
  await executeSql(
    DB,
    await readFile(
      new URL("../migrations/0012_image_library.sql", import.meta.url),
      "utf8",
    ),
  );
  await executeSql(DB, await readFile(trainingMigrationPath, "utf8"));
  await DB.prepare(
    `INSERT INTO footy_media_galleries
      (id, source, source_gallery_id, team_id, source_url, title, category, match_status, first_observed_at, last_observed_at)
     VALUES ('training-1', 'barcelona', 'training-1', '2', 'https://example.com/training', 'Training session', 'other', 'review', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
  ).run();

  const reviewed = await reviewMatchMediaGallery({ DB }, "training-1", {
    category: "training",
    matchId: "",
  });
  assert.deepEqual(reviewed, {
    id: "training-1",
    matchId: "",
    matchStatus: "manual",
    category: "training",
  });
  const stored = await DB.prepare(
    "SELECT category, match_id, match_status FROM footy_media_galleries WHERE id = 'training-1'",
  ).first();
  assert.deepEqual(stored, {
    category: "training",
    match_id: null,
    match_status: "manual",
  });
});

test("rescans preserve rejected galleries and manual matchless decisions", async (context) => {
  const worker = await createWorker();
  context.after(() => worker.dispose());
  const DB = await worker.getD1Database("DB");
  await executeSql(DB, await readFile(schemaPath, "utf8"));
  await executeSql(DB, await readFile(trainingMigrationPath, "utf8"));
  const env = { DB };
  const galleries = ["rejected", "kept", "linked", "pending"].map((id) => ({
    id,
    source: "barcelona",
    sourceGalleryId: id,
    teamId: "2",
    sourceUrl: `https://www.fcbarcelona.com/gallery/${id}`,
    title: `Photos ${id}`,
    category: "match",
    matchStatus: "review",
    images: [image(`image-${id}`, id, "2026-09-28T01:00:00Z")],
  }));
  await importMatchMedia(env, "scan-1", { galleries });
  await reviewMatchMediaGallery(env, "rejected", { rejected: true });
  await reviewMatchMediaGallery(env, "kept", { category: "other", matchId: "" });
  await reviewMatchMediaGallery(env, "linked", { category: "celebration", matchId: "chosen-match" });
  for (const matchStatus of ["review", "auto"]) {
    await importMatchMedia(env, "scan-2", {
      galleries: galleries.map((gallery) => ({ ...gallery, matchStatus, matchId: "suggested-match" })),
    });
    const rows = await DB.prepare("SELECT id, match_id, category, match_status FROM footy_media_galleries ORDER BY id").all();
    const byId = Object.fromEntries(rows.results.map((row) => [row.id, row]));
    assert.equal(byId.rejected.match_status, "rejected");
    assert.equal(byId.rejected.match_id, null);
    assert.equal(byId.kept.match_status, "manual");
    assert.equal(byId.kept.match_id, null);
    assert.equal(byId.kept.category, "other");
    assert.equal(byId.linked.match_id, "chosen-match");
    assert.equal(byId.linked.category, "celebration");
    assert.equal(byId.pending.match_status, matchStatus);
    const feed = await listMatchMedia(env, "6", new URLSearchParams("view=needs-match"));
    assert.deepEqual(feed.images.map((entry) => entry.gallery.id), matchStatus === "review" ? ["pending"] : []);
  }
});

test("Needs Match excludes existing galleries containing unwanted words", async (context) => {
  const worker = await createWorker();
  context.after(() => worker.dispose());
  const DB = await worker.getD1Database("DB");
  await executeSql(DB, await readFile(schemaPath, "utf8"));
  const titles = ["Women’s match photos", "TRAINING session", "Players train", "Pre-training photos", "Match photos", "Trainspotting photos", ...Array.from({ length: 48 }, (_, index) => `Match photos ${index}`)];
  await importMatchMedia({ DB }, "scan-1", {
    galleries: titles.map((title, index) => ({
      id: `gallery-${index}`,
      source: "barcelona",
      sourceGalleryId: String(index),
      teamId: "2",
      sourceUrl: `https://www.fcbarcelona.com/gallery/${index}`,
      title,
      category: "match",
      matchStatus: "review",
      images: [image(`image-${index}`, String(index), "2026-09-28T01:00:00Z")],
    })),
  });
  const feed = await listMatchMedia({ DB }, "6", new URLSearchParams("view=needs-match"));
  assert.equal(feed.pagination.total, 50);
  assert.equal(feed.images.length, 48);
  assert.equal(feed.pagination.hasMore, true);
  for (const page of [1, 2]) {
    const result = await listMatchMedia({ DB }, "6", new URLSearchParams(`view=needs-match&page=${page}`));
    assert.ok(titles.slice(4).includes(result.images[0].gallery.title));
  }
});

test("Hard Save copies an imported club image and applies Soft Save", async (context) => {
  const worker = await createWorker();
  context.after(() => worker.dispose());
  const DB = await worker.getD1Database("DB");
  await executeSql(DB, await readFile(schemaPath, "utf8"));
  await executeSql(
    DB,
    await readFile(
      new URL("../migrations/0012_image_library.sql", import.meta.url),
      "utf8",
    ),
  );
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
      headers: new Headers({ "Content-Type": "image/png" }),
      arrayBuffer: async () =>
        Uint8Array.from(
          Buffer.from(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==",
            "base64",
          ),
        ).buffer,
    };
  };
  context.after(() => {
    globalThis.fetch = originalFetch;
  });
  const saved = await hardSaveMatchMedia(
    {
      DB,
      MEDIA_BUDGET: {
        idFromName: (name) => name,
        get: () => ({ fetch: async () => Response.json({ ok: true }) }),
      },
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
  assert.deepEqual(stored, { key: "match-images/club-1.png", size: 70 });
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
    .split(/;\s*(?:\n|$)(?!\s*END\b)/)
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
            mainModule: "workers/footy-notes/src/index.js",
            modules: {
              "workers/shared/file-metadata.js": {
                contents: await readFile(
                  new URL("../../shared/file-metadata.js", import.meta.url),
                  "utf8",
                ),
                type: "esm",
              },
              "workers/image-library/src/image-info.js": {
                contents: await readFile(
                  new URL(
                    "../../image-library/src/image-info.js",
                    import.meta.url,
                  ),
                  "utf8",
                ),
                type: "esm",
              },
              "workers/shared/media-budget.js": {
                contents: await readFile(
                  new URL("../../shared/media-budget.js", import.meta.url),
                  "utf8",
                ),
                type: "esm",
              },
              "workers/footy-notes/src/index.js": {
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
