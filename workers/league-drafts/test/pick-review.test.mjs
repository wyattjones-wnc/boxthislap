import assert from "node:assert/strict";
import test from "node:test";
import { newDraft, transition, pickNeedsReview } from "../src/model.js";
import { movieForReview } from "../src/movie-resource.js";

function active(league = "fantasy-office") {
  let state = newDraft(
    {
      league,
      year: 2027,
      name: "Review test",
      participants: [
        { id: "1", name: "One" },
        { id: "2", name: "Two" },
      ],
      rounds: 2,
      options: [{ id: "listed", name: "Listed film" }],
    },
    "6",
  );
  if (league === "fantasy-office") state.options[0].tmdbId = 42;
  state = apply(apply(state, "publish"), "start");
  return state;
}
function apply(
  state,
  action,
  body = {},
  actor = "6",
  admin = true,
  movie = null,
) {
  return transition(
    state,
    action,
    { revision: state.revision, ...body },
    actor,
    admin,
    actor,
    movie,
  );
}
function custom(state = active(), name = "An unlisted title") {
  return apply(
    state,
    "pick",
    { optionName: name, requestId: "custom" },
    "1",
    false,
  );
}

test("any unlisted name is accepted immediately and flagged, while listed choices need no review", () => {
  const state = custom();
  assert.equal(state.picks[0].optionName, "An unlisted title");
  assert.equal(pickNeedsReview(state.picks[0]), true);
  assert.equal(state.schedule[state.picks.length].managerId, "2");
  assert.equal(
    pickNeedsReview(
      apply(
        active(),
        "pick",
        { optionId: "listed", requestId: "listed" },
        "1",
        false,
      ).picks[0],
    ),
    false,
  );
  const legacy = { ...state.picks[0] };
  delete legacy.needsReview;
  assert.equal(pickNeedsReview(legacy), true);
});

test("association claims the resource without changing pick identity, submission, turn, or retry receipt", () => {
  const original = custom();
  const next = apply(
    original,
    "associate-pick",
    {
      pickNumber: 1,
      links: {
        letterboxd: "https://letterboxd.com/film/linked/",
        rottenTomatoes: "https://www.rottentomatoes.com/m/linked",
      },
    },
    "6",
    true,
    original.options[0],
  );
  assert.equal(next.picks[0].optionId, original.picks[0].optionId);
  assert.equal(next.picks[0].optionName, original.picks[0].optionName);
  assert.equal(next.picks[0].managerId, "1");
  assert.equal(next.picks[0].number, 1);
  assert.equal(next.turnToken, original.turnToken);
  assert.deepEqual(next.schedule, original.schedule);
  assert.deepEqual(next.requests, original.requests);
  assert.equal(next.picks[0].tmdbId, 42);
  assert.equal(
    next.picks[0].sourceLinks.tmdb,
    "https://www.themoviedb.org/movie/42",
  );
  assert.equal(pickNeedsReview(next.picks[0]), false);
  assert.equal(
    next.options.find((option) => option.tmdbId === 42).id,
    original.picks[0].optionId,
  );
  assert.throws(
    () =>
      apply(
        next,
        "pick",
        { optionName: "Listed film", requestId: "duplicate" },
        "2",
        false,
      ),
    /taken/,
  );
  assert.throws(
    () =>
      apply(
        next,
        "pick",
        { optionName: "An unlisted title", requestId: "duplicate" },
        "2",
        false,
      ),
    /taken/,
  );
  assert.equal(
    apply(
      next,
      "pick",
      { optionName: "An unlisted title", requestId: "custom" },
      "1",
      false,
    ),
    next,
  );
});

test("an admin cannot associate a second pick with a movie already claimed by another manager", () => {
  let state = apply(
    active(),
    "pick",
    { optionId: "listed", requestId: "one" },
    "1",
    false,
  );
  state = apply(
    state,
    "pick",
    { optionName: "Working name", requestId: "two" },
    "2",
    false,
  );
  assert.throws(
    () =>
      apply(
        state,
        "associate-pick",
        { pickNumber: 2 },
        "6",
        true,
        state.options[0],
      ),
    /another pick/,
  );
  assert.equal(pickNeedsReview(state.picks[1]), true);
});

test("review is admin-only and requires verified identity or a safe matching source link", () => {
  const state = custom();
  assert.throws(
    () =>
      apply(
        state,
        "associate-pick",
        { pickNumber: 1 },
        "1",
        false,
        state.options[0],
      ),
    /Administrator/,
  );
  assert.throws(
    () =>
      apply(state, "associate-pick", {
        pickNumber: 1,
        movie: state.options[0],
      }),
    /Associate a resource/,
  );
  for (const link of [
    "javascript:alert(1)",
    "http://letterboxd.com/film/test",
    "https://evil.example/film/test",
    "https://person@letterboxd.com/film/test",
  ])
    assert.throws(
      () =>
        apply(state, "associate-pick", {
          pickNumber: 1,
          links: { letterboxd: link },
        }),
      /HTTPS|website/,
    );
  const linked = apply(state, "associate-pick", {
    pickNumber: 1,
    links: { boxOfficeMojo: "https://www.boxofficemojo.com/title/tt123/" },
  });
  assert.equal(pickNeedsReview(linked.picks[0]), false);
  assert.equal(linked.picks[0].optionName, state.picks[0].optionName);
});

test("non-movie drafts can associate an unlisted pick with a resource or reference link", () => {
  const state = custom(active("world-cup"), "Unlisted player");
  const linked = apply(state, "associate-pick", {
    pickNumber: 1,
    optionId: "listed",
    links: { reference: "https://www.fifa.com/player/example" },
  });
  assert.equal(pickNeedsReview(linked.picks[0]), false);
  assert.equal(linked.options[0].id, state.picks[0].optionId);
  assert.equal(
    linked.picks[0].sourceLinks.reference,
    "https://www.fifa.com/player/example",
  );
});

test("TMDB references parse only trusted movie URLs, and cached identities avoid provider calls", async () => {
  const movie = active().options[0];
  assert.equal(
    await movieForReview(
      {},
      "https://www.themoviedb.org/movie/42-listed-film",
      [movie],
    ),
    movie,
  );
  assert.equal(await movieForReview({}, "42", [movie]), movie);
  assert.equal(await movieForReview({}, ""), null);
  for (const reference of [
    "https://evil.example/movie/42",
    "https://www.themoviedb.org/tv/42",
    "http://www.themoviedb.org/movie/42",
    "0",
    "unknown",
  ])
    await assert.rejects(movieForReview({}, reference), /TMDB/);
});

test("correcting an association frees the previous movie and preserves claims by stable ID", () => {
  let state = custom();
  state.options.push({ id: "another", name: "Another film", tmdbId: 43 });
  state = apply(
    state,
    "associate-pick",
    { pickNumber: 1 },
    "6",
    true,
    state.options.find((option) => option.tmdbId === 42),
  );
  state = apply(
    state,
    "associate-pick",
    { pickNumber: 1 },
    "6",
    true,
    state.options.find((option) => option.tmdbId === 43),
  );
  const available = state.options.find((option) => option.tmdbId === 42);
  assert.ok(available);
  assert.equal(
    new Set(state.options.map((option) => option.id)).size,
    state.options.length,
  );
  state = apply(
    state,
    "pick",
    { optionId: available.id, requestId: "freed" },
    "2",
    false,
  );
  assert.equal(state.picks[1].optionId, available.id);
  assert.equal(
    pickNeedsReview({ optionId: "custom-already-listed", needsReview: false }),
    false,
  );
});

test("different TMDB IDs can share a title without becoming the same claim", () => {
  let state = active();
  state.options.push({
    id: "same-name-different-film",
    name: "Listed film",
    tmdbId: 43,
  });
  state = apply(
    state,
    "pick",
    { optionId: "listed", requestId: "one" },
    "1",
    false,
  );
  state = apply(
    state,
    "pick",
    { optionId: "same-name-different-film", requestId: "two" },
    "2",
    false,
  );
  assert.equal(state.picks.length, 2);
});

test("released resource IDs are rejected while their names remain reviewable", () => {
  const state = active();
  state.movieResource = { policy: "unreleased-na-2027" };
  Object.assign(state.options[0], {
    releaseDate: "2027-04-01",
    worldwideReleaseDate: "2020-01-01",
  });
  assert.throws(
    () =>
      apply(
        state,
        "pick",
        { optionId: "listed", requestId: "stale" },
        "1",
        false,
      ),
    /no longer available/,
  );
  const picked = custom(state, "Listed film");
  assert.equal(picked.picks[0].needsReview, true);
});
