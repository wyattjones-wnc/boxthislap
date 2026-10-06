import {
  buildFormulaOneQualifyingComparisons,
  getRacePointsForPosition,
} from "./formulaOneQualifying.js";

export function normalizeFormulaOneName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function normalizeFormulaOneConstructor(value) {
  const key = normalizeFormulaOneName(value);
  const aliases = {
    "cadillac f1 team": "Cadillac",
    cadillac: "Cadillac",
    "red bull": "Red Bull Racing",
    "red bull racing": "Red Bull Racing",
    rb: "Racing Bulls",
    "rb f1 team": "Racing Bulls",
    "racing bulls": "Racing Bulls",
    haas: "Haas F1 Team",
    "haas f1 team": "Haas F1 Team",
    alpine: "Alpine",
    "alpine f1 team": "Alpine",
    "aston martin": "Aston Martin",
    "aston martin f1 team": "Aston Martin",
    mclaren: "McLaren",
    mercedes: "Mercedes",
    ferrari: "Ferrari",
    audi: "Audi",
    williams: "Williams",
  };
  return aliases[key] || String(value || "").trim();
}

export function resolveFormulaOneDriver(value, drivers = []) {
  const key = normalizeFormulaOneName(value);
  if (!key) return null;
  const direct = drivers.find(
    (driver) => driver.id === value || driver.driver_id === value,
  );
  if (direct) return direct;
  const matches = drivers.filter((driver) => {
    const aliases = [
      driver.name || driver.display_name,
      `${driver.given_name || ""} ${driver.family_name || ""}`,
    ].map(normalizeFormulaOneName);
    return (
      aliases.some((alias) => alias === key || alias.endsWith(` ${key}`)) ||
      (driver.family_name &&
        key.split(" ").at(-1) === normalizeFormulaOneName(driver.family_name))
    );
  });
  return matches.length === 1 ? matches[0] : null;
}

export function normalizeFormulaOneRoundName(value) {
  const key = normalizeFormulaOneName(value).replace(/ grand prix.*$/, "");
  const aliases = {
    australia: "australian",
    china: "chinese",
    japan: "japanese",
    canada: "canadian",
    catalunya: "barcelona",
    catalonia: "barcelona",
    austria: "austrian",
    "great britain": "british",
    "united kingdom": "british",
    silverstone: "british",
    belgium: "belgian",
    hungary: "hungarian",
    netherlands: "dutch",
    zandvoort: "dutch",
    italy: "italian",
    monza: "italian",
    spain: "spanish",
    madrid: "spanish",
    austin: "united states",
    usa: "united states",
    mexico: "mexico city",
    brazil: "brazilian",
    "sao paulo": "brazilian",
    suzuka: "japanese",
  };
  return aliases[key] || key;
}

export function normalizeFormulaOneQuestionText(question, year) {
  return String(year) === "2026" &&
    Number(question.number) === 16 &&
    /average qualifying positions.*Max Verstappen/i.test(question.question)
    ? question.question.replace(/Liam Lawson/g, "Isack Hadjar")
    : question.question;
}

function positivePosition(value) {
  const position = Number(value);
  return Number.isFinite(position) && position > 0 ? position : null;
}

export function isFormulaOneRaceFinish(result) {
  if (!positivePosition(result.position)) return false;
  const status = normalizeFormulaOneName(result.status);
  if (status)
    return (
      ["finished", "lapped"].includes(status) || /^\d+ laps?$/.test(status)
    );
  return /^\d+$/.test(String(result.classified_position || ""));
}

function countback(a, b) {
  if (a.points !== b.points) return b.points - a.points;
  const positions = new Set(
    [...Object.keys(a.finishes), ...Object.keys(b.finishes)].map(Number),
  );
  for (const position of [...positions].sort((x, y) => x - y)) {
    const difference =
      (b.finishes[position] || 0) - (a.finishes[position] || 0);
    if (difference) return difference;
  }
  return 0;
}

function orderStandings(entries, official, identity) {
  const officialById = new Map(
    (official || []).map((row) => [identity(row), row]),
  );
  const useOfficial =
    entries.length > 0 &&
    entries.every((entry) => {
      const row = officialById.get(entry.id);
      return (
        row &&
        positivePosition(row.position) &&
        Math.abs(Number(row.points) - entry.points) < 0.001
      );
    });
  const ordered = [...entries].sort(
    useOfficial
      ? (a, b) =>
          Number(officialById.get(a.id).position) -
          Number(officialById.get(b.id).position)
      : countback,
  );
  return ordered.map((entry, index) => ({
    ...entry,
    rank: useOfficial
      ? Number(officialById.get(entry.id).position)
      : ordered.some(
            (other) => other !== entry && countback(other, entry) === 0,
          )
        ? null
        : index + 1,
  }));
}

// Only approved session facts and manually recorded public round facts enter this dataset.
export function buildFormulaOneProgress({
  drivers = [],
  rounds = [],
  results = [],
  driverStandings = [],
  constructorStandings = [],
} = {}) {
  const originalRound = Math.min(...rounds.map((round) => Number(round.round)));
  const originalIds = new Set(
    results
      .filter(
        (row) =>
          Number(row.round) === originalRound &&
          ["qualifying", "race"].includes(row.session_type),
      )
      .map((row) => row.driver_id),
  );
  const participants = new Set(
    results
      .filter((row) => ["race", "sprint"].includes(row.session_type))
      .map((row) => row.driver_id),
  );
  const constructorNamesById = new Map(
    drivers
      .filter((driver) => driver.constructor_id && driver.constructor_name)
      .map((driver) => [
        driver.constructor_id,
        normalizeFormulaOneConstructor(driver.constructor_name),
      ]),
  );
  const driverMap = new Map(
    drivers.map((driver) => [
      driver.driver_id,
      {
        ...driver,
        id: driver.driver_id,
        name: driver.display_name,
        team: normalizeFormulaOneConstructor(driver.constructor_name),
        points: 0,
        laps: 0,
        podiums: 0,
        wins: 0,
        thirdPlaces: 0,
        poles: 0,
        pointsFinishes: 0,
        q3: 0,
        qualifyingSum: 0,
        qualifyingCount: 0,
        sprintPoints: 0,
        adjustedSprintPoints: 0,
        finishes: {},
        starting: originalIds.has(driver.driver_id),
      },
    ]),
  );
  const teamMap = new Map();
  const roundMap = new Map(
    rounds.map((round) => [
      Number(round.round),
      {
        id: Number(round.round),
        name: round.name,
        hasSprint: Boolean(round.has_sprint),
        complete: false,
        race: [],
        sprint: [],
        qualifying: [],
        driverOfTheDay: round.driver_of_the_day || "",
        fastestPitTime: round.fastest_pit_time ?? "",
        fastestPitTeam: normalizeFormulaOneConstructor(round.fastest_pit_team),
        dnfCount: round.dnf_count ?? "",
        safetyCar: round.safety_car ?? "",
      },
    ]),
  );
  const counts = {};
  const add = (metric, name, value) => {
    if (!name) return;
    counts[metric] ??= {};
    counts[metric][name] = (counts[metric][name] || 0) + value;
  };
  for (const row of results) {
    const driver = driverMap.get(row.driver_id);
    const round = roundMap.get(Number(row.round));
    if (!driver || !round) continue;
    const teamName =
      constructorNamesById.get(row.constructor_id) ||
      normalizeFormulaOneConstructor(row.constructor_name || driver.team);
    if (!teamMap.has(teamName))
      teamMap.set(teamName, {
        id: teamName,
        name: teamName,
        points: 0,
        wins: 0,
        poles: 0,
        podiums: 0,
        finishes: {},
      });
    const team = teamMap.get(teamName);
    const position = positivePosition(row.position);
    const points = Number(row.points) || 0;
    if (["race", "sprint"].includes(row.session_type)) {
      driver.points += points;
      team.points += points;
      add("driverPoints", driver.name, points);
      add("constructorPoints", teamName, points);
    }
    if (row.session_type === "race") {
      round.complete = true;
      round.race.push({
        driverId: driver.id,
        driver: driver.name,
        team: teamName,
        position,
        points,
        finished: isFormulaOneRaceFinish(row),
      });
      if (position) {
        driver.finishes[position] = (driver.finishes[position] || 0) + 1;
        team.finishes[position] = (team.finishes[position] || 0) + 1;
      }
      driver.laps += Number(row.laps) || 0;
      if (row.laps !== null && row.laps !== undefined && row.laps !== "")
        add("laps", driver.name, Number(row.laps) || 0);
      if (points > 0) driver.pointsFinishes += 1;
      if (position && position <= 3) {
        driver.podiums += 1;
        team.podiums += 1;
        add("podiums", driver.name, 1);
      }
      if (position === 1) {
        driver.wins += 1;
        team.wins += 1;
      }
      if (position === 3) driver.thirdPlaces += 1;
    }
    if (row.session_type === "qualifying" && position) {
      round.qualifying.push({
        driverId: driver.id,
        driver: driver.name,
        team: teamName,
        position,
      });
      driver.qualifyingSum += position;
      driver.qualifyingCount += 1;
      if (row.q3 || position <= 10) driver.q3 += 1;
      if (position === 1) {
        driver.poles += 1;
        team.poles += 1;
        add("poles", driver.name, 1);
      }
    }
    if (row.session_type === "sprint") {
      round.sprint.push({
        driverId: driver.id,
        driver: driver.name,
        team: teamName,
        position,
        points,
      });
      driver.sprintPoints += points;
      driver.adjustedSprintPoints += position
        ? getRacePointsForPosition(position)
        : 0;
      add("sprintPoints", driver.name, points);
      add(
        "adjustedSprintPoints",
        driver.name,
        position ? getRacePointsForPosition(position) : 0,
      );
    }
  }
  for (const round of roundMap.values()) {
    if (!round.complete) continue;
    const name =
      resolveFormulaOneDriver(round.driverOfTheDay, drivers)?.display_name ||
      round.driverOfTheDay;
    add("driverOfTheDay", name, 1);
  }
  const driverEntries = [...driverMap.values()].filter(
    (driver) => participants.has(driver.id) || driver.starting,
  );
  const rankedDrivers = orderStandings(
    driverEntries,
    driverStandings,
    (row) => row.driverId,
  );
  const rankedTeams = orderStandings(
    [...teamMap.values()],
    constructorStandings,
    (row) =>
      constructorNamesById.get(row.constructorId) ||
      normalizeFormulaOneConstructor(row.name),
  );
  const pairMap = new Map();
  const addPair = (first, second, metric, gap) => {
    const pairIds = [first, second].sort();
    const key = pairIds.join(":");
    if (!pairMap.has(key))
      pairMap.set(key, {
        driverIds: pairIds,
        names: pairIds.map((id) => driverMap.get(id)?.name || id),
        adjusted: [],
        unadjusted: [],
        qualifyingPositions: [],
        racePositions: [],
      });
    pairMap.get(key)[metric].push(gap);
  };
  for (const comparison of buildFormulaOneQualifyingComparisons(
    results,
    drivers,
  )) {
    for (const metric of ["adjusted", "unadjusted"]) {
      if (comparison[metric])
        addPair(
          comparison.firstDriverId,
          comparison.secondDriverId,
          metric,
          Math.abs(comparison[metric].differenceSeconds),
        );
    }
  }
  for (const round of roundMap.values()) {
    for (const [session, metric] of [
      ["qualifying", "qualifyingPositions"],
      ["race", "racePositions"],
    ]) {
      const teams = new Map();
      for (const result of round[session]) {
        if (!teams.has(result.team)) teams.set(result.team, []);
        teams.get(result.team).push(result);
      }
      for (const pair of teams.values()) {
        if (
          pair.length !== 2 ||
          pair.some(
            (entry) =>
              !entry.position || (session === "race" && !entry.finished),
          )
        )
          continue;
        addPair(
          pair[0].driverId,
          pair[1].driverId,
          metric,
          Math.abs(pair[0].position - pair[1].position),
        );
      }
    }
  }
  return {
    counts,
    completedRounds: [...roundMap.values()].filter((round) => round.complete)
      .length,
    drivers: rankedDrivers,
    constructors: rankedTeams,
    rounds: [...roundMap.values()],
    teammatePairs: [...pairMap.values()],
  };
}

const pairQuestions = {
  14: ["Charles Leclerc", "Lewis Hamilton"],
  15: ["Fernando Alonso", "Lance Stroll"],
  16: ["Max Verstappen", "Isack Hadjar"],
  17: ["George Russell", "Oscar Piastri"],
  18: ["Isack Hadjar", "Liam Lawson"],
  19: ["Nico Hulkenberg", "Gabriel Bortoleto"],
  20: ["Nico Hulkenberg", "Gabriel Bortoleto"],
  57: ["Lando Norris", "Oscar Piastri"],
  58: ["George Russell", "Kimi Antonelli"],
  59: ["Max Verstappen", "Isack Hadjar"],
  60: ["Charles Leclerc", "Lewis Hamilton"],
  61: ["Alex Albon", "Carlos Sainz"],
  62: ["Liam Lawson", "Arvid Lindblad"],
  63: ["Fernando Alonso", "Lance Stroll"],
  64: ["Esteban Ocon", "Oliver Bearman"],
  65: ["Nico Hulkenberg", "Gabriel Bortoleto"],
  66: ["Pierre Gasly", "Franco Colapinto"],
  67: ["Valtteri Bottas", "Sergio Perez"],
};
const winQuestions = {
  37: "Lewis Hamilton",
  38: "Charles Leclerc",
  39: "Aston Martin",
  40: "Lando Norris",
  41: "Oscar Piastri",
  42: "George Russell",
  43: "Kimi Antonelli",
  44: "Max Verstappen",
  45: "Isack Hadjar",
};
const display = (label, entries, unit = "", extra = {}) =>
  entries.length ? { label, entries, unit, ...extra } : null;
const value = (label, answer, extra = {}) =>
  display(label, [["Currently", String(answer)]], "", extra);
const boolean = (condition) => (condition ? "TRUE" : "FALSE");
const decimal = (number) => Number(number.toFixed(3));

export function getFormulaOneQuestionProgress(question, progress) {
  if (!progress || progress.error) return null;
  const text = typeof question === "string" ? question : question.question;
  let number = typeof question === "object" ? Number(question.number) : 0;
  // Text fallback serves reusable callers; the 2026 workbook uses explicit mappings.
  if (!number) {
    if (/finish on the podium/i.test(text)) number = 2;
    else if (/driver of the day/i.test(text)) number = 3;
    else if (/world drivers champion/i.test(text)) number = 1;
    else if (/world constructors champion/i.test(text)) number = 22;
    else if (/sprint race champion/i.test(text)) number = 7;
  }
  const drivers = progress.drivers || [];
  const teams = progress.constructors || [];
  const rounds = progress.rounds || [];
  const completed = rounds.filter((round) => round.complete);
  const driver = (name) => resolveFormulaOneDriver(name, drivers);
  const team = (name) =>
    teams.find((entry) => entry.name === normalizeFormulaOneConstructor(name));
  const countEntries = (metric, ascending = false) =>
    Object.entries(progress.counts?.[metric] || {}).sort(
      (a, b) =>
        (ascending ? a[1] - b[1] : b[1] - a[1]) || a[0].localeCompare(b[0]),
    );
  const standing = (entry) => [
    entry.name,
    `${entry.rank ? `P${entry.rank} · ` : ""}${entry.points} points`,
  ];
  const knownRounds = completed.length > 0;
  if (number === 1) {
    if (!drivers.length) return null;
    return display(
      "Current championship leader",
      (drivers[0].rank
        ? drivers.slice(0, 1)
        : drivers.filter((entry) => entry.points === drivers[0].points)
      ).map(standing),
    );
  }
  if (number === 2)
    return display("Podiums so far", countEntries("podiums"), "podiums");
  if (number === 3)
    return display(
      "Driver of the Day awards so far",
      countEntries("driverOfTheDay"),
      "awards",
    );
  if (number === 4) {
    const last = drivers.filter((entry) => entry.starting).at(-1);
    return last?.rank
      ? display("Currently last among the starting drivers", [standing(last)])
      : null;
  }
  if (number === 5 || number === 6) {
    const gaps = (metric) =>
      (progress.teammatePairs || [])
        .filter((pair) => pair[metric]?.length)
        .map((pair) => [
          pair.names.join(" / "),
          `${decimal(pair[metric].reduce((total, gap) => total + gap, 0) / pair[metric].length)} ${metric === "racePositions" ? "places" : "seconds"} · ${pair[metric].length} rounds`,
        ])
        .sort((a, b) => parseFloat(a[1]) - parseFloat(b[1]));
    if (number === 6)
      return display(
        "Mean absolute race-position gap · both drivers finished",
        gaps("racePositions"),
      );
    const sections = [
      { label: "Adjusted", entries: gaps("adjusted") },
      { label: "Unadjusted", entries: gaps("unadjusted") },
    ].filter((section) => section.entries.length);
    return sections.length
      ? { label: "Mean absolute qualifying gaps", entries: [], sections }
      : null;
  }
  if (number === 7)
    return display(
      "Sprint standings using Grand Prix points",
      countEntries("adjustedSprintPoints"),
      "points",
    );
  if (number === 9)
    return display(
      "Racing laps completed by starting drivers",
      drivers
        .filter((entry) => entry.starting)
        .sort((a, b) => a.laps - b.laps || (b.rank || 0) - (a.rank || 0))
        .map((entry) => [entry.name, entry.laps]),
      "laps",
    );
  if (number === 11 || number === 12) {
    const selectedDriver = driver(
      number === 11 ? "Valtteri Bottas" : "Isack Hadjar",
    );
    if (!selectedDriver) return null;
    const available = completed.filter((round) =>
      round.race.some((row) => row.driverId === selectedDriver.id),
    );
    const betProgress = {};
    for (const bet of question.bets || []) {
      const picks = bet.bet
        .split(",")
        .map((pick) => pick.trim())
        .filter(Boolean);
      const matches = picks
        .map((pick) =>
          available.find(
            (round) =>
              normalizeFormulaOneRoundName(round.name) ===
              normalizeFormulaOneRoundName(pick),
          ),
        )
        .filter(Boolean);
      const points = matches.reduce(
        (total, round) =>
          total +
          (round.race.find((row) => row.driverId === selectedDriver.id)
            ?.points || 0),
        0,
      );
      betProgress[bet.bet] =
        `Selected race points: ${points} · ${matches.length}/${picks.length} completed`;
    }
    return display(
      `${selectedDriver.name}: Grand Prix points`,
      available.map((round) => [
        round.name,
        round.race.find((row) => row.driverId === selectedDriver.id).points,
      ]),
      "points",
      { betProgress },
    );
  }
  if (number === 13) {
    const available = completed
      .filter((round) => round.dnfCount !== "" && round.dnfCount !== null)
      .sort((a, b) => Number(b.dnfCount) - Number(a.dnfCount));
    const betProgress = {};
    for (const bet of question.bets || []) {
      const matches = bet.bet
        .split(",")
        .map((pick) =>
          available.find(
            (round) =>
              normalizeFormulaOneRoundName(round.name) ===
              normalizeFormulaOneRoundName(pick),
          ),
        )
        .filter(Boolean);
      betProgress[bet.bet] = matches
        .map((round) => `${round.name}: ${round.dnfCount} DNFs`)
        .join(" · ");
    }
    return display(
      "Classified DNFs by Grand Prix",
      available.map((round) => [round.name, Number(round.dnfCount)]),
      "DNFs",
      { betProgress },
    );
  }
  if (pairQuestions[number]) {
    const pair = pairQuestions[number].map(driver);
    if (pair.some((entry) => !entry)) return null;
    const [first, second] = pair;
    if (number === 14)
      return display(
        `Points difference: ${Math.abs(first.points - second.points)}`,
        pair.map(standing),
      );
    if (number === 15 || number === 16) {
      if (pair.some((entry) => !entry.qualifyingCount)) return null;
      const averages = pair.map(
        (entry) => entry.qualifyingSum / entry.qualifyingCount,
      );
      return display(
        `Average qualifying position difference: ${decimal(Math.abs(averages[0] - averages[1]))}`,
        pair.map((entry, index) => [entry.name, decimal(averages[index])]),
        "average position",
      );
    }
    if (number === 18 || number === 19) {
      const metric = number === 18 ? "pointsFinishes" : "q3";
      return display(
        number === 18 ? "Grand Prix finishes in the points" : "Q3 appearances",
        pair
          .sort((a, b) => b[metric] - a[metric])
          .map((entry) => [entry.name, entry[metric]]),
        number === 18 ? "finishes" : "appearances",
      );
    }
    if (!first.rank || !second.rank) return null;
    if (number === 17)
      return display(
        `Russell currently outscoring Piastri: ${boolean(first.points > second.points)}`,
        pair.map(standing),
      );
    if (number === 20)
      return display(
        `Championship position difference: ${Math.abs(first.rank - second.rank)}`,
        pair.map(standing),
      );
    return display(
      `Currently ahead: ${first.rank < second.rank ? first.name : second.name}`,
      pair.sort((a, b) => a.rank - b.rank).map(standing),
    );
  }
  if (number === 21) {
    const selected = driver("Isack Hadjar");
    if (!selected || !knownRounds) return null;
    const total = Math.max(...rounds.map((round) => round.id));
    const entries = [0, 1, 2].map((third) => {
      const start = Math.floor((third * total) / 3) + 1,
        end = Math.floor(((third + 1) * total) / 3);
      const selectedRounds = rounds.filter(
        (round) => round.id >= start && round.id <= end,
      );
      const points = selectedRounds.reduce(
        (sum, round) =>
          sum +
          [...round.race, ...round.sprint]
            .filter((row) => row.driverId === selected.id)
            .reduce((subtotal, row) => subtotal + row.points, 0),
        0,
      );
      return [
        `${["First", "Middle", "Last"][third]} third (Rounds ${start}–${end})`,
        `${points} points · ${selectedRounds.filter((round) => round.complete).length}/${selectedRounds.length} races completed`,
      ];
    });
    return display(`${selected.name}: points by season third`, entries);
  }
  if (number === 22 || number === 23) {
    const selected = number === 22 ? teams[0] : teams.at(-1);
    return selected?.rank
      ? display(
          number === 22
            ? "Current constructors championship leader"
            : "Currently last in the constructors championship",
          [standing(selected)],
        )
      : null;
  }
  if (number === 25)
    return knownRounds
      ? value(
          "Constructors currently below 20 points",
          teams.filter((entry) => entry.points < 20).length,
          {
            details: teams
              .filter((entry) => entry.points < 20)
              .map((entry) => `${entry.name}: ${entry.points} points`),
          },
        )
      : null;
  if (number === 27) {
    const pitStops = completed
      .filter(
        (round) => Number(round.fastestPitTime) > 0 && round.fastestPitTeam,
      )
      .sort((a, b) => Number(a.fastestPitTime) - Number(b.fastestPitTime));
    const fastest = pitStops[0];
    return fastest
      ? display(
          "Fastest recorded pit stop",
          pitStops
            .filter(
              (round) =>
                Number(round.fastestPitTime) === Number(fastest.fastestPitTime),
            )
            .map((round) => [
              `${round.fastestPitTeam} · ${round.name}`,
              Number(round.fastestPitTime),
            ]),
          "seconds",
        )
      : null;
  }
  if (number === 28) {
    const eligible = completed.filter(
      (round) =>
        round.sprint.some((row) => row.position === 1) &&
        round.race.some((row) => row.position === 1),
    );
    const matched = eligible.filter(
      (round) =>
        round.sprint.find((row) => row.position === 1).driverId ===
        round.race.find((row) => row.position === 1).driverId,
    );
    return eligible.length
      ? value(
          "Sprint / Grand Prix weekends with the same winner",
          `${matched.length}/${eligible.length}`,
          {
            details: matched.map(
              (round) =>
                `${round.name}: ${round.race.find((row) => row.position === 1).driver}`,
            ),
          },
        )
      : null;
  }
  if (number === 29) {
    const known = completed.filter((round) =>
      ["yes", "no", "true", "false", "1", "0"].includes(
        String(round.safetyCar).toLowerCase(),
      ),
    );
    const yes = known.filter((round) =>
      ["yes", "true", "1"].includes(String(round.safetyCar).toLowerCase()),
    );
    return known.length
      ? value("Races with a safety car", `${yes.length}/${known.length}`, {
          details: yes.map((round) => round.name),
        })
      : null;
  }
  if (number === 30)
    return knownRounds
      ? value(
          "All constructors have scored points",
          boolean(teams.every((entry) => entry.points > 0)),
          {
            details: teams
              .filter((entry) => entry.points === 0)
              .map((entry) => `${entry.name}: 0 points`),
          },
        )
      : null;
  if (number === 31 || number === 52) {
    const leader = teams[0];
    return leader && knownRounds
      ? display(
          number === 31
            ? `Leading constructor has 10 or fewer wins: ${boolean(leader.wins <= 10)}`
            : `Leading constructor has 20 or more wins: ${boolean(leader.wins >= 20)}`,
          [[leader.name, leader.wins]],
          "wins",
        )
      : null;
  }
  if (number === 34) {
    const selected = driver("Lando Norris");
    return selected?.rank
      ? display(
          `Lando Norris currently in the top 3: ${boolean(selected.rank <= 3)}`,
          [standing(selected)],
        )
      : null;
  }
  if (number === 35 || number === 36) {
    const pair = (
      number === 35
        ? ["Carlos Sainz", "Lewis Hamilton"]
        : ["Liam Lawson", "Isack Hadjar"]
    ).map(driver);
    if (pair.some((entry) => !entry)) return null;
    const matches = completed.flatMap((round) => {
      const first = round.race.find((row) => row.driverId === pair[0].id),
        second = round.race.find((row) => row.driverId === pair[1].id);
      return first?.finished &&
        second?.finished &&
        first.team === (number === 35 ? "Williams" : "Racing Bulls") &&
        second.team === (number === 35 ? "Ferrari" : "Red Bull Racing") &&
        first.position < second.position
        ? [
            [
              round.name,
              `${first.driver} P${first.position} · ${second.driver} P${second.position}`,
            ],
          ]
        : [];
    });
    return display("TRUE · Grand Prix results", matches);
  }
  if (winQuestions[number]) {
    const selected = driver(winQuestions[number]) || team(winQuestions[number]);
    return selected && knownRounds
      ? value(
          `${selected.name}: has won a Grand Prix`,
          `${boolean(selected.wins > 0)} · ${selected.wins} wins`,
        )
      : null;
  }
  if (number === 46) {
    const topFour = ["McLaren", "Ferrari", "Red Bull Racing", "Mercedes"];
    const wins = completed.flatMap((round) =>
      round.race
        .filter((row) => row.position === 1 && !topFour.includes(row.team))
        .map((row) => `${round.name}: ${row.driver} (${row.team})`),
    );
    return knownRounds
      ? value(
          "Grand Prix won by a constructor outside the named top four",
          boolean(wins.length > 0),
          { details: wins },
        )
      : null;
  }
  if (number === 48) {
    const selected = team("Williams");
    return selected && knownRounds
      ? value(
          "Williams has scored a podium",
          `${boolean(selected.podiums > 0)} · ${selected.podiums} podiums`,
        )
      : null;
  }
  if (number === 49) {
    const winners = drivers.filter((entry) => entry.wins > 0);
    return knownRounds
      ? value(
          "More than four unique Grand Prix winners",
          `${boolean(winners.length > 4)} · ${winners.length} winners`,
          { details: winners.map((entry) => entry.name) },
        )
      : null;
  }
  if (number === 50) {
    const japan = completed.find((round) => round.id === 3),
      max = driver("Max Verstappen");
    const winner = japan?.race.find((row) => row.position === 1);
    return winner && max
      ? value(
          "Max Verstappen won Japan (Round 3)",
          boolean(winner.driverId === max.id),
          { details: [`Winner: ${winner.driver}`] },
        )
      : null;
  }
  if (number === 51)
    return teams.some((entry) => entry.poles)
      ? display(
          `A constructor has at least 22 poles: ${boolean(teams.some((entry) => entry.poles >= 22))}`,
          [...teams]
            .sort((a, b) => b.poles - a.poles)
            .map((entry) => [entry.name, entry.poles]),
          "poles",
        )
      : null;
  if (number === 53) {
    const selected = driver("Lewis Hamilton");
    return selected && knownRounds
      ? value(
          "Hamilton third-place finishes: 40 before 2026",
          `${40 + selected.thirdPlaces} career · ${selected.thirdPlaces} in 2026 · record exceeded: ${boolean(40 + selected.thirdPlaces > 45)}`,
        )
      : null;
  }
  if (number === 54) {
    const selected = team("Aston Martin");
    return selected && knownRounds
      ? value(
          "Aston Martin podiums: 9 before 2026",
          `${9 + selected.podiums} total · ${selected.podiums} in 2026 · Toyota matched or surpassed: ${boolean(9 + selected.podiums >= 13 && selected.wins === 0)}`,
          { details: [`2026 wins: ${selected.wins}`] },
        )
      : null;
  }
  if (number === 55 || number === 56) {
    const standings = number === 55 ? drivers : teams;
    if (standings.length < 2) return null;
    const gap = standings[0].points - standings[1].points;
    return display(
      `P1–P2 gap: ${gap} points · smaller than ${number === 55 ? 67 : 296}: ${boolean(gap < (number === 55 ? 67 : 296))}`,
      standings.slice(0, 2).map(standing),
    );
  }
  return null;
}
