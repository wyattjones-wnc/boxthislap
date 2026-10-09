import assert from "node:assert/strict";
import { test } from "node:test";
import { bundledRankingImages, sharedRankingImages } from "./rankingImages.js";
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

test("item galleries use the same bundled selection as Compare", () => {
  const manifest = {
    games: { 1: ["assets/ranking/games/1/one.webp"] },
    mcu: { 2: ["assets/ranking/mcu/2/two.webp"] },
  };
  assert.deepEqual(
    bundledRankingImages("6", "games", { id: "1", name: "Game" }, manifest, []),
    manifest.games[1],
  );
  assert.deepEqual(
    bundledRankingImages(
      "6",
      "games",
      { id: "other", name: "Another" },
      manifest,
      [],
    ),
    [],
  );
  assert.deepEqual(
    bundledRankingImages(
      "7",
      "games",
      { id: "1", name: "Different manager's game" },
      manifest,
      [],
    ),
    [],
  );
  const item = { id: "movie", name: "Endgame" },
    mcu = [{ id: "2", name: "Endgame" }];
  assert.deepEqual(
    bundledRankingImages("7", "movies", item, manifest, mcu),
    sharedRankingImages("7", "movies", item, manifest, mcu),
  );
});
