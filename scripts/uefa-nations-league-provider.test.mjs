import assert from "node:assert/strict";
import test from "node:test";
import { parseUefaNationsLeagueFixtures } from "./uefa-nations-league-provider.mjs";

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
