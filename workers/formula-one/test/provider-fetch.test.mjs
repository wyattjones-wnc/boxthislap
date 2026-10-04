import test from "node:test";
import assert from "node:assert/strict";
import { fetchRound } from "../src/index.js";

function database() {
  const batches = [];
  return {
    batches,
    prepare(sql) {
      return {
        bind() {
          return this;
        },
        async first() {
          if (sql.includes("SELECT name, has_sprint"))
            return { name: "Canadian Grand Prix", has_sprint: 0 };
          return null;
        },
        async all() {
          return { results: [] };
        },
      };
    },
    async batch(statements) {
      batches.push(statements);
    },
  };
}

for (const scenario of [
  {
    name: "empty results",
    status: "unavailable",
    response: () => Response.json({ MRData: { RaceTable: { Races: [] } } }),
  },
  {
    name: "rate limiting",
    status: "error",
    response: () => new Response("Rate limited", { status: 429 }),
    error: /HTTP 429/,
  },
  {
    name: "provider outage",
    status: "error",
    response: () => new Response("Unavailable", { status: 503 }),
    error: /HTTP 503/,
  },
  {
    name: "invalid JSON",
    status: "error",
    response: () => new Response("<html>error</html>"),
    error: /invalid response/,
  },
  {
    name: "network failure",
    status: "error",
    response: () => {
      throw new Error("connection failed");
    },
    error: /could not be reached/,
  },
]) {
  test(`round fetch distinguishes ${scenario.name} from missing results`, async (t) => {
    t.mock.method(globalThis, "fetch", async (url) => {
      if (url.endsWith("/2026/5.json"))
        return Response.json({ MRData: { RaceTable: { Races: [] } } });
      return scenario.response();
    });
    const DB = database();
    const result = await fetchRound({ DB }, 2026, 5, "admin");
    assert.equal(result.fetchedCount, 0);
    assert.deepEqual(
      result.sessions.map(({ sessionType, status }) => ({
        sessionType,
        status,
      })),
      [
        { sessionType: "qualifying", status: scenario.status },
        { sessionType: "race", status: scenario.status },
      ],
    );
    if (scenario.error)
      for (const session of result.sessions)
        assert.match(session.error, scenario.error);
    assert.equal(DB.batches.length, 0);
  });
}

test("available round results are fetched into review", async (t) => {
  t.mock.method(globalThis, "fetch", async (url) => {
    if (url.endsWith("/2026/5.json"))
      return Response.json({ MRData: { RaceTable: { Races: [] } } });
    const key = url.includes("qualifying") ? "QualifyingResults" : "Results";
    return Response.json({
      MRData: {
        RaceTable: {
          Races: [
            {
              raceName: "Canadian Grand Prix",
              date: "2026-05-24",
              [key]: [
                {
                  position: "1",
                  Driver: {
                    driverId: "test",
                    givenName: "Test",
                    familyName: "Driver",
                  },
                  Constructor: { constructorId: "team", name: "Team" },
                },
              ],
            },
          ],
        },
      },
    });
  });
  const DB = database();
  const result = await fetchRound({ DB }, 2026, 5, "admin");
  assert.equal(result.fetchedCount, 2);
  assert.ok(
    result.sessions.every((session) => session.status === "needs_review"),
  );
  assert.equal(DB.batches.length, 2);
});

test("round fetch retries rate limiting and imports qualifying independently of race availability", async (t) => {
  const requests = [];
  let qualifyingAttempts = 0;
  t.mock.method(globalThis, "fetch", async (url) => {
    requests.push(url);
    if (!url.includes("qualifying"))
      return Response.json({ MRData: { RaceTable: { Races: [] } } });
    qualifyingAttempts += 1;
    if (qualifyingAttempts === 1)
      return new Response("Too many requests", { status: 429 });
    return Response.json({
      MRData: {
        RaceTable: {
          Races: [
            {
              raceName: "Bahrain Grand Prix in Malaysia",
              date: "2026-10-04",
              QualifyingResults: Array.from({ length: 22 }, (_, index) => ({
                position: String(index + 1),
                Driver: {
                  driverId: `driver_${index}`,
                  givenName: "Driver",
                  familyName: String(index),
                },
                Constructor: { constructorId: "team", name: "Team" },
                Q1: "1:38.000",
              })),
            },
          ],
        },
      },
    });
  });
  const DB = database();
  const result = await fetchRound({ DB }, 2026, 16, "admin");
  assert.equal(qualifyingAttempts, 2);
  assert.equal(result.fetchedCount, 1);
  assert.equal(result.sessions[0].status, "needs_review");
  assert.equal(result.sessions[0].resultCount, 22);
  assert.equal(result.sessions[1].status, "unavailable");
  assert.ok(
    requests.includes("https://api.jolpi.ca/ergast/f1/2026/16/qualifying.json"),
  );
  assert.equal(DB.batches.length, 1);
});
