import assert from "node:assert/strict";
import test from "node:test";
import type { TrophyTitle } from "psn-api";
import { getTitleBatch } from "../src/sync/title-batch.ts";

const titles = Array.from({ length: 23 }, (_, index) => ({
  npCommunicationId: `NPWR${String(index).padStart(5, "0")}_00`,
} as TrophyTitle));

test("walks the complete trophy title library in bounded batches", () => {
  const first = getTitleBatch(titles, 0, 10);
  const second = getTitleBatch(titles, first.nextOffset!, 10);
  const final = getTitleBatch(titles, second.nextOffset!, 10);

  assert.equal(first.titles.length, 10);
  assert.equal(second.offset, 10);
  assert.equal(second.titles.length, 10);
  assert.equal(final.offset, 20);
  assert.equal(final.titles.length, 3);
  assert.equal(final.nextOffset, null);
});

test("wraps a stale scheduled cursor back to the start", () => {
  const batch = getTitleBatch(titles, 99, 10);
  assert.equal(batch.offset, 0);
  assert.equal(batch.titles[0].npCommunicationId, titles[0].npCommunicationId);
});
