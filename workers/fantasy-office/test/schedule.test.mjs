import assert from "node:assert/strict";
import test from "node:test";
import { draftSlotOrder, scheduledBatch } from "../src/index.js";

function movie(index, configured = false) {
  return {
    boxOfficeMojoUrl: configured
      ? `https://www.boxofficemojo.com/release/rl${index}/`
      : "",
    id: `movie-${index}`,
    letterboxdUrl: configured
      ? `https://letterboxd.com/film/movie-${index}/`
      : "",
    rottenTomatoesUrl: configured
      ? `https://www.rottentomatoes.com/m/movie_${index}`
      : "",
  };
}

test("scheduled discovery stays within the Worker subrequest budget", () => {
  const batch = scheduledBatch(
    Array.from({ length: 55 }, (_, index) => movie(index)),
    0,
  );
  assert.equal(batch.movies.length, 5);
  assert.equal(batch.nextCursor, 5);
});

test("configured sources rotate through fourteen movies per run", () => {
  const movies = Array.from({ length: 55 }, (_, index) => movie(index, true));
  const batch = scheduledBatch(movies, 50);
  assert.equal(batch.movies.length, 14);
  assert.equal(batch.movies[0].id, "movie-50");
  assert.equal(batch.movies[5].id, "movie-0");
  assert.equal(batch.nextCursor, 9);
});

test("draft slots sort D1 through D10 before Sub", () => {
  assert.deepEqual(
    ["D1", "D10", "D2", "Sub"].sort(
      (left, right) => draftSlotOrder(left) - draftSlotOrder(right),
    ),
    ["D1", "D2", "D10", "Sub"],
  );
});
