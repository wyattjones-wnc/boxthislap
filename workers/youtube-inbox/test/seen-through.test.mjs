import assert from "node:assert/strict";
import test from "node:test";

import { markVideosSeenThrough } from "../src/index.js";

test("seen-through accepts a selected video after the first 100 visible items", async () => {
  const videoIds = Array.from({ length: 101 }, (_, index) => `video-${index + 1}`);
  let boundVideoIds = [];
  const env = {
    DB: {
      prepare() {
        return {
          bind(_processedAt, serializedVideoIds) {
            boundVideoIds = JSON.parse(serializedVideoIds);
            return { run: async () => ({ meta: { changes: videoIds.length } }) };
          },
        };
      },
    },
  };
  const request = new Request("https://example.com/api/videos/video-101/seen-through", {
    body: JSON.stringify({ videoIds }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

  const result = await markVideosSeenThrough("video-101", request, env);

  assert.equal(result.updated, 101);
  assert.deepEqual(boundVideoIds, videoIds);
});

test("seen-through rejects an unexpectedly large visible selection", async () => {
  const videoIds = Array.from({ length: 1001 }, (_, index) => `video-${index + 1}`);
  const request = new Request("https://example.com/api/videos/video-1001/seen-through", {
    body: JSON.stringify({ videoIds }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

  await assert.rejects(
    markVideosSeenThrough("video-1001", request, { DB: {} }),
    (error) => error.status === 400 && error.message.includes("1000"),
  );
});
