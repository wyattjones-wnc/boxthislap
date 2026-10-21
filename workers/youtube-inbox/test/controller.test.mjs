import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";

import { createYouTubeInboxController } from "../../../modules/youtubeInbox.js";

function video(index) {
  return {
    youtubeVideoId: `video-${index}`,
    title: `Video ${index}`,
    status: "new",
    channel: { youtubeChannelId: "channel-a", name: "A" },
    publishedAt: "2026-10-16T00:00:00Z",
  };
}

async function setup(t, handler, { filter = "" } = {}) {
  const dom = new JSDOM('<div id="youtube-inbox-view"></div>', {
    url: "https://example.com",
  });
  for (const key of ["window", "document", "localStorage"]) {
    const original = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, {
      value: dom.window[key === "window" ? "window" : key],
      configurable: true,
    });
    t.after(() => {
      if (original) Object.defineProperty(globalThis, key, original);
      else delete globalThis[key];
    });
  }
  t.after(() => dom.window.close());
  const requests = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    requests.push({ url: new URL(url), options });
    return handler(new URL(url), options);
  });
  const controller = createYouTubeInboxController({
    endpoint: "https://api.example.com",
    loadSheet: async () => [
      {
        ID: "1",
        "Display Name": "A",
        "YouTube Channel ID": "channel-a",
        Priority: "1",
      },
      {
        ID: "Priority",
        "Display Name": "Description",
        "YouTube Channel ID": "Filter",
      },
      { ID: "1", "Display Name": "Priority 1", "YouTube Channel ID": filter },
    ],
  });
  await controller.renderPage();
  return {
    controller,
    requests,
    document: dom.window.document,
    storage: dom.window.localStorage,
  };
}

async function until(check) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (check()) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  assert.fail("Expected browser update did not finish");
}

test("initial display fetches one page; Load more uses a cursor and appends videos", async (t) => {
  const { controller, requests, document } = await setup(t, (url) => {
    if (url.pathname.includes("playlists"))
      return Response.json({ playlists: [] });
    return Response.json(
      url.searchParams.has("cursor")
        ? { videos: [video(100)], nextCursor: null }
        : {
            videos: Array.from({ length: 100 }, (_, index) => video(index)),
            nextCursor: "older-page",
          },
    );
  });
  assert.equal(
    requests.filter(({ url }) => url.pathname === "/api/videos").length,
    1,
  );
  assert.equal(document.querySelectorAll("[data-youtube-video]").length, 100);
  document.querySelector("[data-youtube-load-more]").click();
  await until(
    () => document.querySelectorAll("[data-youtube-video]").length === 101,
  );
  const last = requests.at(-1).url;
  assert.equal(last.searchParams.get("cursor"), "older-page");
  assert.equal(last.searchParams.has("offset"), false);
  assert.equal(document.querySelector("[data-youtube-load-more]"), null);
  await controller.renderPage();
  assert.equal(requests.length, 3);
});

test("an empty inbox stays loaded when returning to the route", async (t) => {
  const { controller, requests } = await setup(t, (url) =>
    Response.json(
      url.pathname.includes("playlists")
        ? { playlists: [] }
        : { videos: [], nextCursor: null },
    ),
  );
  await controller.renderPage();
  assert.equal(requests.length, 2);
});

test("title filters can advance past an empty page without downloading later matching pages", async (t) => {
  const { requests, document } = await setup(
    t,
    (url) => {
      if (url.pathname.includes("playlists"))
        return Response.json({ playlists: [] });
      return Response.json(
        url.searchParams.has("cursor")
          ? {
              videos: [{ ...video(1), title: "Race highlights" }],
              nextCursor: "still-older",
            }
          : { videos: [video(0)], nextCursor: "filtered-page" },
      );
    },
    { filter: "highlights" },
  );
  assert.equal(
    requests.filter(({ url }) => url.pathname === "/api/videos").length,
    2,
  );
  assert.equal(document.querySelectorAll("[data-youtube-video]").length, 1);
  assert.match(document.querySelector("h2").textContent, /Race highlights/);
  assert.ok(document.querySelector("[data-youtube-load-more]"));
});

test("successful mutations update the visible list without refetching and discard stale offline snapshots", async (t) => {
  const { requests, document, storage } = await setup(t, (url, options) => {
    if (options.method === "POST") return Response.json({ ok: true });
    if (url.pathname.includes("playlists"))
      return Response.json({
        playlists: [{ name: "3New", youtubePlaylistId: "playlist" }],
      });
    return Response.json({
      videos: [video(0), video(1)],
      nextCursor: "older-page",
    });
  });
  storage.setItem("boxThisLapYouTubeSnapshotV1:old", "{}");
  document.querySelector("[data-youtube-quick-save]").click();
  await until(
    () => document.querySelectorAll("[data-youtube-video]").length === 1,
  );
  assert.equal(
    Object.keys(storage).filter((key) =>
      key.startsWith("boxThisLapYouTubeSnapshot"),
    ).length,
    0,
  );
  const seen = document.querySelector("[data-youtube-seen-through]");
  seen.click();
  seen.click();
  await until(
    () => document.querySelectorAll("[data-youtube-video]").length === 0,
  );
  assert.equal(
    requests.filter(({ url }) => url.pathname === "/api/videos").length,
    1,
  );
  assert.match(
    document.querySelector("h2").textContent,
    /More videos available/,
  );
  assert.ok(document.querySelector("[data-youtube-load-more]"));
  assert.equal(
    document.querySelector("[data-youtube-load-more]").disabled,
    false,
  );
});

test("a failed save leaves the video available to retry", async (t) => {
  let fail = true;
  const { document } = await setup(t, (url, options) => {
    if (options.method === "POST")
      return fail
        ? Response.json({ error: "Temporary failure" }, { status: 503 })
        : Response.json({ ok: true });
    if (url.pathname.includes("playlists"))
      return Response.json({
        playlists: [{ name: "3New", youtubePlaylistId: "playlist" }],
      });
    return Response.json({ videos: [video(0)], nextCursor: null });
  });
  document.querySelector("[data-youtube-quick-save]").click();
  await until(() => document.querySelector(".youtube-sync-message"));
  assert.equal(document.querySelectorAll("[data-youtube-video]").length, 1);
  assert.equal(
    document.querySelector("[data-youtube-quick-save]").disabled,
    false,
  );
  assert.match(
    document.querySelector(".youtube-sync-message").textContent,
    /Temporary failure/,
  );
  fail = false;
  document.querySelector("[data-youtube-quick-save]").click();
  await until(
    () => document.querySelectorAll("[data-youtube-video]").length === 0,
  );
  assert.equal(document.querySelector(".youtube-sync-message"), null);
});

test("large seen selections keep successful batches applied if a later batch fails", async (t) => {
  const batches = [];
  const { document } = await setup(t, (url, options) => {
    if (options.method === "POST") {
      batches.push(JSON.parse(options.body).videoIds);
      return batches.length === 2
        ? Response.json({ error: "Retry remaining video" }, { status: 503 })
        : Response.json({ ok: true });
    }
    if (url.pathname.includes("playlists"))
      return Response.json({ playlists: [] });
    // Seed the same list state produced by loading more than ten pages.
    return Response.json({
      videos: Array.from({ length: 1001 }, (_, index) => video(index)),
      nextCursor: null,
    });
  });
  const selected = document.querySelectorAll(
    "[data-youtube-seen-through]",
  )[1000];
  selected.click();
  selected.click();
  await until(() => document.querySelector(".youtube-sync-message"));
  assert.deepEqual(
    batches.map((batch) => batch.length),
    [1000, 1],
  );
  assert.equal(document.querySelectorAll("[data-youtube-video]").length, 1);
  assert.equal(
    document.querySelector("[data-youtube-video]").dataset.youtubeVideo,
    "video-1000",
  );
  const retry = document.querySelector("[data-youtube-seen-through]");
  retry.click();
  retry.click();
  await until(
    () => document.querySelectorAll("[data-youtube-video]").length === 0,
  );
  assert.equal(batches.at(-1).length, 1);
});
