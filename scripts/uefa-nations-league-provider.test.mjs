import assert from "node:assert/strict";
import test from "node:test";
import { parseUefaNationsLeagueFixtures } from "./uefa-nations-league-provider.mjs";

test("parses UEFA's results heading and explicit years after the league phase", () => {
  const html = `
    <meta name="description" content="Knockout fixtures and league phase results.">
    <h2><b>Knockout stage fixtures</b></h2>
    <h2>League phase results</h2>
    <h3>Matchday 1</h3>
    <p><b>Thursday 24 September 2026</b></p>
    <p>A2 <a href="/uefanationsleague/match/2048003--netherlands-vs-germany/">Netherlands 1-1 Germany</a></p>
    <p><b>Tuesday 17 November 2026</b></p>
    <p>A2 <a href="/uefanationsleague/match/2048140--germany-vs-netherlands/">Germany 2-0 Netherlands</a></p>
    <h2>Other fixtures</h2>
    <p><b>Thursday 25 March 2027</b></p>
    <p>A2 <a href="/uefanationsleague/match/2050901--belgium-vs-germany/">Belgium vs Germany</a></p>
  `;

  const fixtures = parseUefaNationsLeagueFixtures(html, { seasonYear: 2027 });

  assert.deepEqual(fixtures.map(({ date, timestamp, score }) => ({ date, timestamp, score })), [
    { date: "2026-09-24", timestamp: "2026-09-24T18:45:00.000Z", score: "1-1" },
    { date: "2026-11-17", timestamp: "2026-11-17T19:45:00.000Z", score: "2-0" },
  ]);
});

test("parses complete and upcoming UEFA Nations League fixtures", () => {
  const html = `
    <h2>League phase fixtures and results</h2>
    <p><b>Thursday 24 September</b></p>
    <p>
      A2 <a href="https://www.uefa.com/uefanationsleague/match/2048003--netherlands-vs-germany/">Netherlands 1-1 Germany</a><br/>
      D2 <a href="https://www.uefa.com/uefanationsleague/match/2048008--liechtenstein-vs-lithuania/">Liechtenstein vs Lithuania</a> (18:00)
    </p>
    <h3>Matchday 2</h3>
  `;

  const fixtures = parseUefaNationsLeagueFixtures(html, { seasonYear: 2026 });

  assert.deepEqual(
    fixtures.map(({ away, home, id, score, status, timestamp }) => ({ away, home, id, score, status, timestamp })),
    [{
      away: "Germany",
      home: "Netherlands",
      id: "2048003",
      score: "1-1",
      status: "FINISHED",
      timestamp: "2026-09-24T18:45:00.000Z",
    }, {
      away: "Lithuania",
      home: "Liechtenstein",
      id: "2048008",
      score: "",
      status: "SCHEDULED",
      timestamp: "2026-09-24T16:00:00.000Z",
    }],
  );
});
