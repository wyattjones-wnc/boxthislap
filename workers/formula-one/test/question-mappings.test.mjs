import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildFormulaOneProgress,
  getFormulaOneQuestionProgress,
  normalizeFormulaOneConstructor,
  normalizeFormulaOneQuestionText,
  normalizeFormulaOneRoundName,
  resolveFormulaOneDriver,
} from "../../../modules/formulaOneProgress.js";

const questions = JSON.parse(
  readFileSync(new URL("./fixtures/2026-questions.json", import.meta.url)),
);
const migration = JSON.parse(
  readFileSync(
    new URL("../../../data/formula-one-2026-migration.json", import.meta.url),
  ),
);
const snakeCase = (row) =>
  Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`),
      value,
    ]),
  );
const approved = new Set(
  migration.sessions
    .filter((session) => session.status === "approved")
    .map((session) => `${session.round}:${session.sessionType}`),
);
const fixture = {
  drivers: migration.drivers.map(snakeCase),
  rounds: migration.rounds.map(snakeCase),
  results: migration.results
    .filter((row) => approved.has(`${row.round}:${row.sessionType}`))
    .map(snakeCase),
};
const base = buildFormulaOneProgress(fixture);
const progress = buildFormulaOneProgress({
  ...fixture,
  driverStandings: base.drivers.map((entry, index) => ({
    driverId: entry.id,
    points: entry.points,
    position: index + 1,
  })),
  constructorStandings: base.constructors.map((entry, index) => ({
    name: entry.name,
    points: entry.points,
    position: index + 1,
  })),
});
const question = (number) => questions.find((entry) => entry.number === number);
const answer = (number, source = progress) =>
  getFormulaOneQuestionProgress(question(number), source);

test("every requested question has a data mapping in the imported season fixture", () => {
  const supported = [
    1, 2, 3, 4, 5, 6, 7, 9, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23,
    25, 27, 28, 29, 30, 31, 34, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 48, 49,
    50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67,
  ];
  for (const number of supported)
    assert.ok(answer(number), `Question ${number} should have data`);
  for (const number of [8, 10, 24, 26, 32, 33, 47])
    assert.equal(
      answer(number),
      null,
      `Question ${number} needs another source or future result`,
    );
});

test("explicit mappings prevent historical championship mentions from becoming leader answers", () => {
  const lando = progress.drivers.find((entry) => entry.id === "norris");
  assert.deepEqual(answer(34).entries, [
    [lando.name, `P${lando.rank} · ${lando.points} points`],
  ]);
  assert.match(answer(55).label, /P1–P2 gap/);
  assert.match(answer(56).label, /P1–P2 gap/);
  assert.match(answer(50).label, /Japan \(Round 3\)/);
  assert.match(answer(51).label, /22 poles/);
  assert.match(answer(52).label, /20 or more wins/);
});

test("race aliases preserve the distinction between Barcelona and Madrid and match pick totals", () => {
  for (const [bet, round] of [
    ["Catalunya", "Barcelona Grand Prix"],
    ["Austin", "United States Grand Prix"],
    ["Bahrain", "Bahrain Grand Prix in Malaysia"],
    ["Japan", "Japanese Grand Prix"],
    ["Brazil", "Brazilian Grand Prix"],
    ["Great Britain", "British Grand Prix"],
  ]) {
    assert.equal(
      normalizeFormulaOneRoundName(bet),
      normalizeFormulaOneRoundName(round),
    );
  }
  assert.notEqual(
    normalizeFormulaOneRoundName("Catalunya"),
    normalizeFormulaOneRoundName("Spanish Grand Prix"),
  );
  const picks = {
    number: 11,
    question: "",
    bets: [{ bet: "Australia, Catalunya, Austria, Abu Dhabi" }],
  };
  const data = getFormulaOneQuestionProgress(picks, progress);
  const completedPicks = progress.rounds.filter(
    (round) =>
      round.complete &&
      ["australian", "barcelona", "austrian", "abu dhabi"].includes(
        normalizeFormulaOneRoundName(round.name),
      ),
  );
  const expected = completedPicks.reduce(
    (sum, round) =>
      sum + (round.race.find((row) => row.driverId === "bottas")?.points || 0),
    0,
  );
  assert.equal(
    data.betProgress[picks.bets[0].bet],
    `Selected race points: ${expected} · ${completedPicks.length}/4 completed`,
  );
  assert.match(answer(13).betProgress[question(13).bets[0].bet], /DNFs/);
});

test("starting roster alone is considered for fewest laps and standings last place", () => {
  const lateDriver = {
    driver_id: "reserve",
    display_name: "Reserve Driver",
    constructor_name: "Williams",
  };
  const data = buildFormulaOneProgress({
    ...fixture,
    drivers: [...fixture.drivers, lateDriver],
    results: [
      ...fixture.results,
      {
        round: 2,
        session_type: "race",
        driver_id: "reserve",
        position: 22,
        points: 0,
        laps: 1,
      },
    ],
  });
  const entries = getFormulaOneQuestionProgress(question(9), data).entries;
  assert.equal(entries.length, 22);
  assert.ok(entries.every(([name]) => name !== "Reserve Driver"));
  assert.deepEqual(
    entries.map(([, laps]) => laps),
    entries.map(([, laps]) => laps).sort((a, b) => a - b),
  );
  const starting = progress.drivers.filter((entry) => entry.starting);
  assert.equal(answer(4).entries[0][0], starting.at(-1).name);
});

test("provider standings decide exact ties; mismatched future points cannot override approved facts", () => {
  const input = {
    drivers: [
      { driver_id: "a", display_name: "A", constructor_name: "Cadillac" },
      {
        driver_id: "b",
        display_name: "B",
        constructor_name: "Cadillac F1 Team",
      },
    ],
    rounds: [{ round: 1, name: "Australia" }],
    results: ["a", "b"].map((id) => ({
      round: 1,
      session_type: "race",
      driver_id: id,
      constructor_name: id === "a" ? "Cadillac" : "Cadillac F1 Team",
      position: null,
      points: 0,
      laps: 1,
    })),
    driverStandings: [
      { driverId: "a", position: 2, points: 0 },
      { driverId: "b", position: 1, points: 0 },
    ],
  };
  const data = buildFormulaOneProgress(input);
  assert.equal(
    getFormulaOneQuestionProgress(question(4), data).entries[0][0],
    "A",
  );
  assert.equal(data.constructors.length, 1);
  assert.equal(data.constructors[0].name, "Cadillac");
  const fallback = buildFormulaOneProgress({
    ...input,
    driverStandings: [
      { driverId: "a", position: 1, points: 25 },
      { driverId: "b", position: 2, points: 0 },
    ],
  });
  assert.equal(getFormulaOneQuestionProgress(question(4), fallback), null);
});

test("sprint champion uses the Grand Prix points scale rather than sprint awards", () => {
  const data = buildFormulaOneProgress({
    drivers: [
      { driver_id: "a", display_name: "A" },
      { driver_id: "b", display_name: "B" },
    ],
    rounds: [{ round: 1, name: "China", has_sprint: 1 }],
    results: [
      {
        round: 1,
        session_type: "sprint",
        driver_id: "a",
        position: 1,
        points: 8,
      },
      {
        round: 1,
        session_type: "sprint",
        driver_id: "b",
        position: 9,
        points: 0,
      },
    ],
  });
  assert.deepEqual(getFormulaOneQuestionProgress(question(7), data).entries, [
    ["A", 25],
    ["B", 2],
  ]);
});

test("qualifying displays adjusted and unadjusted gaps without allowing signed gaps to cancel", () => {
  const data = {
    teammatePairs: [
      { names: ["A", "B"], adjusted: [0.2, 0.4], unadjusted: [1, 2] },
    ],
  };
  const result = getFormulaOneQuestionProgress(question(5), data);
  assert.equal(result.sections.length, 2);
  assert.match(result.sections[0].entries[0][1], /^0.3 seconds/);
  assert.match(result.sections[1].entries[0][1], /^1.5 seconds/);
});

test("ahead-at-any-race requires both finishes and the constructors named in the question", () => {
  const input = {
    drivers: [
      {
        driver_id: "sainz",
        display_name: "Carlos Sainz",
        constructor_name: "Williams",
      },
      {
        driver_id: "hamilton",
        display_name: "Lewis Hamilton",
        constructor_name: "Ferrari",
      },
    ],
    rounds: [
      { round: 1, name: "Australia" },
      { round: 2, name: "China" },
    ],
    results: [
      {
        round: 1,
        session_type: "race",
        driver_id: "sainz",
        constructor_name: "Williams",
        position: 5,
        points: 10,
        status: "Finished",
      },
      {
        round: 1,
        session_type: "race",
        driver_id: "hamilton",
        constructor_name: "Ferrari",
        position: 8,
        points: 4,
        status: "Retired",
      },
      {
        round: 2,
        session_type: "race",
        driver_id: "sainz",
        constructor_name: "Williams",
        position: 5,
        points: 10,
        status: "Finished",
      },
      {
        round: 2,
        session_type: "race",
        driver_id: "hamilton",
        constructor_name: "Ferrari",
        position: 8,
        points: 4,
        status: "Lapped",
      },
    ],
  };
  const data = buildFormulaOneProgress(input);
  assert.equal(
    getFormulaOneQuestionProgress(question(35), data).entries.length,
    1,
  );
  assert.equal(
    getFormulaOneQuestionProgress(question(35), data).entries[0][0],
    "China",
  );
  const retired = buildFormulaOneProgress({
    ...input,
    results: input.results.slice(0, 2),
  });
  assert.equal(getFormulaOneQuestionProgress(question(35), retired), null);
  const wrongTeams = buildFormulaOneProgress({
    ...input,
    results: input.results.map((row) => ({
      ...row,
      constructor_name: "McLaren",
    })),
  });
  assert.equal(getFormulaOneQuestionProgress(question(35), wrongTeams), null);
});

test("all teammate points comparisons use championship order and known driver aliases", () => {
  assert.equal(
    resolveFormulaOneDriver("Alex Albon", progress.drivers).name,
    "Alexander Albon",
  );
  assert.equal(
    resolveFormulaOneDriver("Nico Hulkenberg", progress.drivers).id,
    "hulkenberg",
  );
  assert.equal(normalizeFormulaOneConstructor("RB F1 Team"), "Racing Bulls");
  for (let number = 57; number <= 67; number++) {
    assert.equal(answer(number).entries.length, 2);
    assert.match(answer(number).label, /Currently ahead:/);
    const ranks = answer(number).entries.map(([, entry]) =>
      Number(entry.match(/^P(\d+)/)[1]),
    );
    assert.ok(ranks[0] < ranks[1]);
  }
});

test("question 16 typo is corrected only for the 2026 question", () => {
  assert.match(
    normalizeFormulaOneQuestionText(question(16), "2026"),
    /Isack Hadjar/,
  );
  assert.doesNotMatch(
    normalizeFormulaOneQuestionText(question(16), "2026"),
    /Liam Lawson/,
  );
  assert.equal(
    normalizeFormulaOneQuestionText(question(16), "2025"),
    question(16).question,
  );
});

test("record and threshold questions use current totals rather than historical mentions", () => {
  const data = {
    counts: {},
    completedRounds: 1,
    rounds: [{ id: 1, complete: true, race: [], sprint: [] }],
    drivers: [
      {
        id: "hamilton",
        name: "Lewis Hamilton",
        points: 167,
        rank: 1,
        thirdPlaces: 6,
        wins: 1,
      },
      { id: "norris", name: "Lando Norris", points: 100, rank: 2, wins: 1 },
    ],
    constructors: [
      {
        id: "Mercedes",
        name: "Mercedes",
        points: 396,
        rank: 1,
        wins: 20,
        poles: 22,
        podiums: 24,
      },
      {
        id: "Aston Martin",
        name: "Aston Martin",
        points: 100,
        rank: 2,
        wins: 0,
        poles: 0,
        podiums: 4,
      },
    ],
  };
  assert.match(answer(51, data).label, /TRUE/);
  assert.match(answer(52, data).label, /TRUE/);
  assert.match(answer(53, data).entries[0][1], /46 career · 6 in 2026/);
  assert.match(answer(54, data).entries[0][1], /13 total.*TRUE/);
  assert.match(answer(55, data).label, /67 points.*FALSE/);
  assert.match(answer(56, data).label, /296 points.*FALSE/);
  assert.match(answer(49, data).entries[0][1], /FALSE · 2 winners/);
  const won = {
    ...data,
    constructors: data.constructors.map((entry) =>
      entry.name === "Aston Martin" ? { ...entry, wins: 1 } : entry,
    ),
  };
  assert.match(answer(54, won).entries[0][1], /FALSE/);
});

test("a retired driver with no race points does not count as a finish in the points", () => {
  const data = buildFormulaOneProgress({
    drivers: [
      { driver_id: "hadjar", display_name: "Isack Hadjar" },
      { driver_id: "lawson", display_name: "Liam Lawson" },
    ],
    rounds: [{ round: 1, name: "Australia" }],
    results: [
      {
        round: 1,
        session_type: "race",
        driver_id: "hadjar",
        position: 9,
        points: 0,
        status: "Retired",
      },
      {
        round: 1,
        session_type: "race",
        driver_id: "lawson",
        position: 10,
        points: 1,
        status: "Finished",
      },
    ],
  });
  assert.deepEqual(answer(18, data).entries, [
    ["Liam Lawson", 1],
    ["Isack Hadjar", 0],
  ]);
});
