import assert from "node:assert/strict";
import test from "node:test";
import {
  countNumberOneWeekends,
  extractDomesticGross,
  extractBoxOfficeMojoCandidates,
  extractBoxOfficeMojoIdentity,
  extractLetterboxdIdentity,
  extractLetterboxdRating,
  extractRottenTomatoesCandidates,
  extractTomatometer,
  extractWeekendWinners,
  releaseIdFromUrl,
  sourceConfidence,
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

test("discovers provider identities from title and year metadata", () => {
  assert.deepEqual(
    extractLetterboxdIdentity(
      '<meta property="og:title" content="Dune: Part Two (2024)">',
      "https://letterboxd.com/film/dune-part-two/",
    ),
    {
      title: "Dune: Part Two",
      url: "https://letterboxd.com/film/dune-part-two/",
      year: 2024,
    },
  );
  assert.deepEqual(
    extractRottenTomatoesCandidates(`
      <search-page-media-row release-year="2024">
        <a href="https://www.rottentomatoes.com/m/dune_part_two" data-qa="info-name" slot="title">Dune: Part Two</a>
      </search-page-media-row>`),
    [
      {
        title: "Dune: Part Two",
        url: "https://www.rottentomatoes.com/m/dune_part_two",
        year: 2024,
      },
    ],
  );
  assert.deepEqual(
    extractBoxOfficeMojoCandidates(`
      <tr><td><a href="/title/tt15239678/">Dune: Part Two</a></td><td>2024</td></tr>`),
    [
      {
        title: "Dune: Part Two",
        url: "https://www.boxofficemojo.com/title/tt15239678/",
        year: 2024,
      },
    ],
  );
  assert.deepEqual(
    extractBoxOfficeMojoIdentity(`
      <h1>Dune: Part Two (2024)</h1>
      <span>Domestic Opening</span><a href="/release/rl68715265/weekend">$82m</a>
      <span>Earliest Release Date</span><span>Feb 28, 2024</span>`),
    {
      releaseId: "rl68715265",
      title: "Dune: Part Two",
      url: "https://www.boxofficemojo.com/release/rl68715265/",
      year: 2024,
    },
  );
  assert.equal(
    sourceConfidence("Dune Part Two", 2024, {
      title: "Dune: Part Two",
      year: 2024,
    }),
    1,
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
