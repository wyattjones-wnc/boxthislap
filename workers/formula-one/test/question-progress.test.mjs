import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/index.js";
import {
  buildFormulaOneProgress,
  getFormulaOneQuestionProgress,
} from "../../../modules/formulaOneProgress.js";

const drivers = [
  { driver_id: "a", display_name: "Driver A" },
  { driver_id: "b", display_name: "Driver B" },
];
const results = [
  {
    round: 1,
    session_type: "race",
    driver_id: "a",
    position: 1,
    points: 25,
    laps: 50,
    constructor_name: "Team",
  },
  {
    round: 1,
    session_type: "race",
    driver_id: "b",
    position: 2,
    points: 18,
    laps: 50,
    constructor_name: "Team",
  },
  {
    round: 2,
    session_type: "sprint",
    driver_id: "b",
    position: 1,
    points: 8,
    constructor_name: "Team",
  },
  { round: 2, session_type: "qualifying", driver_id: "a", position: 1 },
];
const rounds = [
  { round: 1, driver_of_the_day: "a" },
  { round: 2, driver_of_the_day: "b" },
];

test("season progress includes sprint points, race podiums and recorded awards from completed races", () => {
  const progress = buildFormulaOneProgress({ drivers, rounds, results });
  assert.deepEqual(
    getFormulaOneQuestionProgress(
      "Who will be World Drivers Champion?",
      progress,
    ).entries,
    [["Driver B", "P1 · 26 points"]],
  );
  assert.deepEqual(
    getFormulaOneQuestionProgress(
      "Which drivers will finish on the podium this season?",
      progress,
    ).entries,
    [
      ["Driver A", 1],
      ["Driver B", 1],
    ],
  );
  assert.deepEqual(
    getFormulaOneQuestionProgress(
      "Who will get the most Driver of the Day awards?",
      progress,
    ).entries,
    [["Driver A", 1]],
  );
  assert.equal(progress.completedRounds, 1);
  assert.equal(progress.counts.constructorPoints.Team, 51);
  assert.equal(
    getFormulaOneQuestionProgress("What is your bold prediction?", progress),
    null,
  );
  assert.equal(
    getFormulaOneQuestionProgress(
      "Who will be World Drivers Champion?",
      buildFormulaOneProgress(),
    ),
    null,
  );
});

test("leaders include ties and invalid or sprint positions do not count as podiums", () => {
  const progress = buildFormulaOneProgress({
    drivers,
    rounds,
    results: [
      ...results,
      {
        round: 2,
        session_type: "race",
        driver_id: "a",
        position: null,
        points: 1,
      },
    ],
  });
  assert.deepEqual(
    getFormulaOneQuestionProgress(
      "Who will be World Drivers Champion?",
      progress,
    ).entries,
    [["Driver A", "P1 · 26 points"]],
  );
  assert.deepEqual(progress.counts.podiums, { "Driver A": 1, "Driver B": 1 });
});

test("public endpoint reads only approved facts and exposes no manager entries", async () => {
  const sqlQueries = [];
  const response = await worker.fetch(
    new Request("https://example.com/api/seasons/2026/questions/progress"),
    {
      DB: {
        prepare(sql) {
          sqlQueries.push(sql);
          return {
            bind(year) {
              assert.equal(year, 2026);
              return {
                async all() {
                  return {
                    results: sql.includes("FROM f1_drivers")
                      ? drivers
                      : sql.includes("FROM f1_rounds")
                        ? rounds
                        : results,
                  };
                },
              };
            },
          };
        },
      },
    },
  );
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.counts.driverPoints["Driver B"], 26);
  assert.ok(
    sqlQueries.some((sql) => sql.includes("sessions.status = 'approved'")),
  );
  assert.ok(sqlQueries.every((sql) => !sql.includes("weekly_entries")));
  assert.deepEqual(Object.keys(data).sort(), [
    "completedRounds",
    "constructors",
    "counts",
    "drivers",
    "ok",
    "rounds",
    "teammatePairs",
    "year",
  ]);
});

test("award name variants aggregate under the roster name without altering round facts", () => {
  const awardRounds = [
    { round: 1, driver_of_the_day: "Kimi Antonelli" },
    { round: 2, driver_of_the_day: "Andrea Kimi Antonelli" },
  ];
  const progress = buildFormulaOneProgress({
    drivers: [
      {
        driver_id: "antonelli",
        display_name: "Kimi Antonelli",
        given_name: "Andrea Kimi",
        family_name: "Antonelli",
      },
    ],
    rounds: awardRounds,
    results: [1, 2].map((round) => ({
      round,
      session_type: "race",
      driver_id: "antonelli",
      position: 1,
      points: 25,
    })),
  });
  assert.deepEqual(progress.counts.driverOfTheDay, { "Kimi Antonelli": 2 });
  assert.equal(awardRounds[1].driver_of_the_day, "Andrea Kimi Antonelli");
});

test("public standings requests stop at the approved race and use provider ranks for ties", async (t) => {
  const requests = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    requests.push({ url, options });
    const kind = url.includes("driverStandings")
      ? "DriverStandings"
      : "ConstructorStandings";
    return new Response(
      JSON.stringify({
        MRData: {
          StandingsTable: {
            StandingsLists: [
              {
                season: "2026",
                round: "1",
                [kind]:
                  kind === "DriverStandings"
                    ? [
                        {
                          position: "1",
                          points: "0",
                          Driver: { driverId: "b" },
                        },
                        {
                          position: "2",
                          points: "0",
                          Driver: { driverId: "a" },
                        },
                      ]
                    : [
                        {
                          position: "1",
                          points: "0",
                          Constructor: { name: "Cadillac F1 Team" },
                        },
                      ],
              },
            ],
          },
        },
      }),
    );
  });
  const tiedDrivers = [
    { driver_id: "a", display_name: "A", constructor_name: "Cadillac" },
    { driver_id: "b", display_name: "B", constructor_name: "Cadillac" },
  ];
  const tiedResults = tiedDrivers.map((driver) => ({
    round: 1,
    session_type: "race",
    driver_id: driver.driver_id,
    position: null,
    points: 0,
  }));
  const env = {
    JOLPICA_BASE_URL: "https://provider.example/f1",
    DB: {
      prepare(sql) {
        return {
          bind() {
            return {
              async all() {
                return {
                  results: sql.includes("FROM f1_drivers")
                    ? tiedDrivers
                    : sql.includes("FROM f1_rounds")
                      ? [
                          { round: 1, name: "Australia" },
                          { round: 2, name: "China" },
                        ]
                      : tiedResults,
                };
              },
            };
          },
        };
      },
    },
  };
  const response = await worker.fetch(
    new Request("https://example.com/api/seasons/2026/questions/progress"),
    env,
  );
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.deepEqual(
    data.drivers.map((driver) => [driver.id, driver.rank]),
    [
      ["b", 1],
      ["a", 2],
    ],
  );
  assert.equal(requests.length, 2);
  assert.ok(
    requests.every(
      ({ url, options }) =>
        url.includes("/2026/1/") && options.cf.cacheTtl === 300,
    ),
  );
  assert.equal(data.rounds[1].complete, false);
});
