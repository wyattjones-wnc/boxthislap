import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import worker from "../src/index.js";
import { billingPeriod, MediaBudget, reserve } from "../src/budget.js";
import { imageInfo } from "../src/image-info.js";
const png =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==";
const defaults = {
  enabled: true,
  billingDay: 15,
  storageLimit: 1000,
  readLimit: 2,
  writeLimit: 2,
  dailyLimit: 4,
  baselineBytes: 0,
};
function budgetFixture() {
  let values = new Map(),
    tail = Promise.resolve();
  const ctx = {
    storage: {
      transaction: (work) => {
        const run = tail.then(async () => {
          const staged = new Map(values);
          const result = await work({
            get: async (key) => structuredClone(staged.get(key)),
            put: async (key, value) => {
              staged.set(key, structuredClone(value));
            },
          });
          values = staged;
          return result;
        });
        tail = run.catch(() => undefined);
        return run;
      },
    },
  };
  const budget = new MediaBudget(ctx);
  const call = (path, data, method = "POST") =>
    budget.fetch(
      new Request(`https://budget${path}`, {
        method,
        body: data === undefined ? undefined : JSON.stringify(data),
      }),
    );
  return {
    budget,
    call,
    binding: {
      idFromName: (name) => name,
      get: () => ({ fetch: (...args) => budget.fetch(new Request(...args)) }),
    },
  };
}
async function fixture(context) {
  const sql = new DatabaseSync(":memory:");
  context.after(() => sql.close());
  sql.exec(
    await readFile(
      new URL(
        "../../footy-notes/migrations/0012_image_library.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  const DB = {
    prepare: (query) => {
      let values = [];
      const statement = {
        bind: (...args) => {
          values = args;
          return statement;
        },
        first: async () => sql.prepare(query).get(...values) || null,
        all: async () => ({ results: sql.prepare(query).all(...values) }),
        run: async () => ({
          meta: { changes: Number(sql.prepare(query).run(...values).changes) },
        }),
      };
      return statement;
    },
    batch: async (statements) => {
      sql.exec("BEGIN");
      try {
        const results = [];
        for (const s of statements) results.push(await s.run());
        sql.exec("COMMIT");
        return results;
      } catch (e) {
        sql.exec("ROLLBACK");
        throw e;
      }
    },
  };
  const budget = budgetFixture(),
    objects = new Map();
  let puts = 0,
    gets = 0;
  const env = {
    DB,
    MEDIA_BUDGET: budget.binding,
    ALLOWED_ORIGINS: "https://site.test",
    ADMIN_MANAGER_IDS: "6",
    MANAGER_AUTH: {
      fetch: async (_url, options) => {
        const token = JSON.parse(options.body).accessToken;
        return Response.json(
          token === "admin" || token === "manager"
            ? { ok: true, managerId: token === "admin" ? "6" : "8" }
            : { ok: false },
          { status: token === "bad" ? 401 : 200 },
        );
      },
    },
    IMAGES: {
      put: async (key, bytes, options) => {
        puts++;
        objects.set(key, {
          body: bytes,
          size: bytes.length,
          httpMetadata: options.httpMetadata,
          httpEtag: '"fixture"',
        });
      },
      get: async (key) => {
        gets++;
        return objects.get(key);
      },
      delete: async (key) => objects.delete(key),
    },
  };
  const call = (
    path,
    data,
    token = "admin",
    method = data === undefined ? "GET" : "POST",
  ) =>
    worker.fetch(
      new Request(`https://library.test${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          Origin: "https://site.test",
          "Content-Type": "application/json",
        },
        body: data === undefined ? undefined : JSON.stringify(data),
      }),
      env,
      { waitUntil: () => {} },
    );
  return { call, env, budget, counts: () => ({ puts, gets }) };
}
test("billing cycle boundaries use the configured day, including year changes", () => {
  assert.equal(billingPeriod(Date.UTC(2026, 0, 14), 15), "2025-12-15");
  assert.equal(billingPeriod(Date.UTC(2026, 0, 15), 15), "2026-01-15");
});
test("shared budget starts closed, reserves atomically, retains failed attempts, and releases once", async () => {
  const f = budgetFixture();
  assert.equal(
    (await f.call("/reserve", { operation: "write", bytes: 1 })).status,
    503,
  );
  assert.equal((await f.call("/configure", defaults, "PUT")).status, 200);
  const results = await Promise.all(
    Array.from({ length: 4 }, () =>
      f.call("/reserve", { operation: "write", bytes: 10 }),
    ),
  );
  assert.deepEqual(
    results.map((r) => r.status),
    [200, 200, 429, 429],
  );
  assert.equal(
    (await f.call("/configure", { ...defaults, billingDay: 1 }, "PUT")).status,
    409,
  );
  await f.call("/release", { key: "deleted-object", bytes: 10 });
  await f.call("/release", { key: "deleted-object", bytes: 10 });
  const state = await (await f.call("/status", undefined, "GET")).json();
  assert.equal(state.storage, 10);
  assert.equal(state.writes, 2);
});
test("storage limits stop reads and writes but permit deletion; disabled budgets permit safe cleanup", () => {
  const state = {
    config: { ...defaults, initialized: true, storageLimit: 10 },
    storage: 20,
    reads: 0,
    writes: 0,
    daily: 0,
    period: "",
    day: "",
  };
  assert.throws(() => reserve(state, { operation: "read" }), /safety limit/);
  reserve(state, { operation: "delete" });
  state.config.enabled = false;
  reserve(state, { operation: "delete" });
  assert.throws(
    () => reserve(state, { operation: "write", bytes: 1 }),
    /stopped/,
  );
});
test("authentication and admin restrictions reject mutations before storage access", async (context) => {
  const f = await fixture(context);
  assert.equal(
    (
      await f.call(
        "/api/images/content",
        { kind: "movies", title: "Paddington" },
        "manager",
      )
    ).status,
    403,
  );
  assert.equal(
    (await f.call("/api/images/catalog", undefined, "bad")).status,
    401,
  );
  assert.deepEqual(f.counts(), { puts: 0, gets: 0 });
});
test("normalized titles and aliases share images; ambiguous titles require manager-scoped links", async (context) => {
  const f = await fixture(context);
  await f.budget.call("/configure", defaults, "PUT");
  const create = async (title, year) =>
    (
      await (
        await f.call("/api/images/content", {
          kind: "movies",
          title,
          year,
          aliases: ["PADDINGTON"],
        })
      ).json()
    ).content;
  const first = await create("Paddington", "2014");
  const upload = await f.call("/api/images/files", {
    contentId: first.id,
    dataUrl: `data:image/png;base64,${png}`,
  });
  assert.equal(upload.status, 201);
  await f.call("/api/images/files", {
    contentId: first.id,
    dataUrl: `data:image/png;base64,${png}`,
  });
  assert.equal(f.counts().puts, 1);
  const resolve = async (token) =>
    (
      await (
        await f.call(
          "/api/images/resolve",
          { items: [{ id: "7", kind: "movies", title: "  PADDINGTon  " }] },
          token,
        )
      ).json()
    ).matches[0];
  assert.equal((await resolve("manager")).files.length, 1);
  await create("Paddington", "2099");
  assert.equal((await resolve("manager")).candidates.length, 2);
  assert.equal((await resolve("manager")).files.length, 0);
  assert.equal(
    (
      await f.call(
        "/api/images/link",
        { itemId: "7", kind: "movies", contentId: first.id },
        "manager",
        "PUT",
      )
    ).status,
    200,
  );
  assert.equal((await resolve("manager")).files.length, 1);
  assert.equal((await resolve("admin")).files.length, 0);
});
test("presets enforce dimensions and versions; exactly one default survives competing updates", async (context) => {
  const f = await fixture(context);
  const add = async (name) =>
    (
      await (
        await f.call(
          "/api/images/presets",
          { name, context: "movies", width: 1, height: 1, is_default: true },
          "admin",
          "PUT",
        )
      ).json()
    ).preset;
  const first = await add("Wide"),
    second = await add("Square");
  let presets = (await (await f.call("/api/images/presets")).json()).presets;
  assert.equal(presets.filter((p) => p.is_default).length, 1);
  const changed = presets.find((p) => p.id === first.id);
  assert.equal(changed.version, 2);
  const results = await Promise.all(
    [1, 2].map((width) =>
      f.call(
        "/api/images/presets",
        { ...second, width, version: second.version },
        "admin",
        "PUT",
      ),
    ),
  );
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
  const content = (
    await (
      await f.call("/api/images/content", { kind: "movies", title: "Movie" })
    ).json()
  ).content;
  const response = await f.call("/api/images/files", {
    contentId: content.id,
    dataUrl: `data:image/png;base64,${png}`,
    presetId: first.id,
    presetVersion: first.version,
  });
  assert.equal(response.status, 409);
  assert.equal(f.counts().puts, 0);
});
test("closed or exhausted gates prevent R2 access, including anonymous image reads", async (context) => {
  const f = await fixture(context);
  assert.equal((await f.call("/media/library/abc.png")).status, 503);
  assert.equal(f.counts().gets, 0);
  const c = (
    await (
      await f.call("/api/images/content", { kind: "movies", title: "Movie" })
    ).json()
  ).content;
  assert.equal(
    (
      await f.call("/api/images/files", {
        contentId: c.id,
        dataUrl: `data:image/png;base64,${png}`,
      })
    ).status,
    503,
  );
  assert.equal(f.counts().puts, 0);
});
test("server inspects image bytes and rejects spoofed formats and oversized dimensions", () => {
  const bytes = Uint8Array.from(Buffer.from(png, "base64"));
  assert.deepEqual(imageInfo(bytes), {
    width: 1,
    height: 1,
    mime: "image/png",
  });
  assert.throws(() => imageInfo(new Uint8Array([1, 2, 3])), /valid PNG/);
  new DataView(bytes.buffer).setUint32(16, 9000);
  assert.throws(() => imageInfo(bytes), /16 million/);
});
test("bundled files gain shared metadata without R2 uploads", async (context) => {
  const f = await fixture(context),
    c = (
      await (
        await f.call("/api/images/content", { kind: "games", title: "Game" })
      ).json()
    ).content;
  const input = {
    contentId: c.id,
    files: [
      {
        path: "assets/ranking/games/1/example.webp",
        width: 100,
        height: 60,
        byte_size: 2000,
      },
    ],
  };
  assert.equal((await f.call("/api/images/bundled", input)).status, 200);
  assert.equal((await f.call("/api/images/bundled", input)).status, 200);
  const resolved = (
    await (
      await f.call(
        "/api/images/resolve",
        { items: [{ id: "999", kind: "games", title: "Game" }] },
        "manager",
      )
    ).json()
  ).matches[0];
  assert.equal(resolved.files.length, 1);
  assert.equal(resolved.files[0].location, "bundled");
  assert.deepEqual(f.counts(), { puts: 0, gets: 0 });
});
test("Footy image routes return a structured cutoff without reaching R2", async () => {
  const { default: footy } = await import("../../footy-notes/src/index.js");
  let reads = 0;
  const env = {
    ROSTER_MEDIA: {
      get: async () => {
        reads++;
      },
    },
    MATCH_MEDIA: {
      get: async () => {
        reads++;
      },
    },
  };
  for (const path of ["/media/rosters/any.webp", "/media/match-images/any"]) {
    const response = await footy.fetch(
      new Request(`https://footy.test${path}`),
      env,
      {},
    );
    assert.equal(response.status, 503);
    assert.match((await response.json()).error, /stopped/);
  }
  assert.equal(reads, 0);
});
test("binary uploads avoid base64 expansion and retain server image validation", async (context) => {
  const f = await fixture(context);
  await f.budget.call("/configure", defaults, "PUT");
  const c = (
    await (
      await f.call("/api/images/content", { kind: "movies", title: "Movie" })
    ).json()
  ).content;
  const form = new FormData();
  form.set("contentId", c.id);
  form.set(
    "file",
    new Blob([Buffer.from(png, "base64")], { type: "image/png" }),
    "image.png",
  );
  const response = await worker.fetch(
    new Request("https://library.test/api/images/files", {
      method: "POST",
      headers: { Authorization: "Bearer admin", Origin: "https://site.test" },
      body: form,
    }),
    f.env,
    { waitUntil() {} },
  );
  assert.equal(response.status, 201);
  assert.equal(f.counts().puts, 1);
});
