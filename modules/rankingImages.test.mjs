import assert from "node:assert/strict";
import { test } from "node:test";
import { sharedRankingImages } from "./rankingImages.js";
test("a manager movie inherits bundled MCU images through an unambiguous normalized title", () => {
  const manifest = { mcu: { 1: ["assets/ranking/mcu/1/example.webp"] } },
    movies = [{ id: "1", name: "Avengers: Endgame" }];
  assert.deepEqual(
    sharedRankingImages(
      "6",
      "movies",
      { id: "other", name: "  avengers: endgame " },
      manifest,
      movies,
    ),
    manifest.mcu[1],
  );
  assert.deepEqual(
    sharedRankingImages(
      "6",
      "movies",
      { id: "other", name: "Avengers: Endgame" },
      manifest,
      [...movies, { id: "2", name: "Avengers: Endgame" }],
    ),
    [],
  );
});
