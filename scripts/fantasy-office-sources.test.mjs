import assert from "node:assert/strict";
import test from "node:test";
import {
  countNumberOneWeekends,
  extractDomesticGross,
  extractLetterboxdRating,
  extractTomatometer,
  extractWeekendWinners,
  releaseIdFromUrl,
} from "./fantasy-office-sources.mjs";

test("extracts the three source metrics", () => {
  assert.deepEqual(
    extractLetterboxdRating(
      '<script type="application/ld+json">{"@type":"Movie","aggregateRating":{"ratingValue":"4.18"}}</script>',
    ),
    { state: "available", value: 4.18 },
  );
  assert.deepEqual(extractTomatometer('<score-board tomatometerscore="91">'), {
    state: "available",
    value: 91,
  });
  assert.deepEqual(
    extractDomesticGross("<h2>Domestic</h2><span>$344,050,007</span>"),
    {
      state: "available",
      value: 344_050_007,
    },
  );
});

test("recognizes expected pre-release missing values", () => {
  assert.equal(
    extractLetterboxdRating(
      '<script type="application/ld+json">{"@type":"Movie"}</script>',
    ).state,
    "not_available",
  );
  assert.equal(
    extractTomatometer('<score-board tomatometerscore=""></score-board>').state,
    "not_available",
  );
});

test("deduplicates long-weekend rows by Box Office Mojo week", () => {
  const html = `
    <tr><td><a href="/weekend/2026W21/">May 22-24</a></td><td><a href="/release/rl111/">Movie A</a></td></tr>
    <tr><td><a href="/weekend/2026W21/">May 22-25 Memorial Day</a></td><td><a href="/release/rl111/">Movie A</a></td></tr>
    <tr><td><a href="/weekend/2026W22/">May 29-31</a></td><td><a href="/release/rl222/">Movie B</a></td></tr>`;
  const winners = extractWeekendWinners(html, 2026);
  assert.equal(winners.size, 2);
  assert.equal(countNumberOneWeekends(winners, "rl111"), 1);
  assert.equal(
    releaseIdFromUrl("https://www.boxofficemojo.com/release/rl111/"),
    "rl111",
  );
});
