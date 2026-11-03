import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  applyOfficialQualifying,
  findOfficialQualifyingPath,
  fetchOfficialQualifying,
} from "../src/official-qualifying.js";
const html = await readFile(
  new URL("./fixtures/mexico-2026-qualifying.html", import.meta.url),
  "utf8",
);
const numbers = [
  44, 63, 16, 3, 12, 1, 6, 41, 10, 27, 43, 81, 5, 87, 55, 23, 14, 50, 18, 11,
  77, 30,
];
const results = numbers.map((number) => ({
  permanentNumber: String(number),
  position: 8,
  rawJson: JSON.stringify({ number }),
}));
const index =
  '<table><tr><td><a href="/en/results/2026/races/1298/mexico/race-result">Mexico</a></td><td>01 Nov</td></tr></table>';
test("discovers official round by date rather than assuming provider race IDs or round numbering", () => {
  assert.equal(
    findOfficialQualifyingPath(index, 2026, "2026-11-01"),
    "/en/results/2026/races/1298/mexico/qualifying",
  );
  assert.throws(() => findOfficialQualifyingPath(index, 2026, "2026-10-25"));
  assert.throws(() =>
    findOfficialQualifyingPath(index + index, 2026, "2026-11-01"),
  );
});
test("official classification replaces stale positions and records Lawson's disqualification", () => {
  const imported = applyOfficialQualifying(results, html, "official-url");
  const lawson = imported.find((row) => row.permanentNumber === "30");
  assert.equal(lawson.position, null);
  assert.equal(lawson.classifiedPosition, "DSQ");
  assert.equal(lawson.status, "Disqualified");
  assert.equal(lawson.q1, "");
  assert.equal(lawson.q3, "1:17.029");
  assert.equal(JSON.parse(lawson.rawJson).official.sourceUrl, "official-url");
  assert.equal(
    imported.find((row) => row.permanentNumber === "41").position,
    8,
  );
  assert.equal(imported[0].q1, "1:17.341");
  assert.equal(results[21].position, 8);
});
test("rejects missing drivers, duplicate rows, and changed classification markup", () => {
  assert.throws(() => applyOfficialQualifying(results.slice(1), html, "url"));
  assert.throws(() =>
    applyOfficialQualifying(
      results,
      html.replace("<td>DQ</td>", "<td>UNKNOWN</td>"),
      "url",
    ),
  );
  assert.throws(() =>
    applyOfficialQualifying(results, "<html>Unavailable</html>", "url"),
  );
  assert.throws(() => applyOfficialQualifying(results, html + html, "url"));
});
test("fetches the discovered official classification and fails on provider errors", async (t) => {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url) => {
    calls.push(url);
    return new Response(calls.length === 1 ? index : html);
  });
  const imported = await fetchOfficialQualifying(results, 2026, "2026-11-01");
  assert.equal(imported.results[21].status, "Disqualified");
  assert.equal(calls[1], imported.sourceUrl);
  t.mock.method(
    globalThis,
    "fetch",
    async () => new Response("", { status: 503 }),
  );
  await assert.rejects(
    fetchOfficialQualifying(results, 2026, "2026-11-01"),
    /503/,
  );
});
