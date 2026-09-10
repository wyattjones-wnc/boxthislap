import { writeFile } from "node:fs/promises";
import { parseCsvMatrix } from "../modules/tableUtils.js";

const YEAR = 2026;
const SHEET_ID = "142OIev2l32tXB1PmKvN3pdqhNwdlesqPMiBTy5hqJWM";
const SOURCE_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`;
const PUBLISHED_BASE_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTx5bYjw_XeqE4Pk6SosOnf-S0tFQI5IeyERphgP7BjKpum-0Qj2vTokmy99qgvbyvH6OU9_ENJjA-2/pub";
const PUBLISHED_GIDS = { Data: "2022697649", Drivers: "0", Sprints: "1932990040", Weekly: "1508426028" };
const MANAGER_IDS = new Map([
  ["jonathan", "1"], ["jordan", "2"], ["luisa", "3"],
  ["michael", "4"], ["sean", "5"], ["wyatt", "6"],
]);
const CONSTRUCTORS = [
  ["mclaren", "McLaren", ["norris", "piastri"]],
  ["mercedes", "Mercedes", ["russell", "antonelli"]],
  ["red_bull", "Red Bull Racing", ["max_verstappen", "hadjar"]],
  ["ferrari", "Ferrari", ["leclerc", "hamilton"]],
  ["williams", "Williams", ["albon", "sainz"]],
  ["rb", "Racing Bulls", ["lawson", "arvid_lindblad"]],
  ["aston_martin", "Aston Martin", ["alonso", "stroll"]],
  ["haas", "Haas", ["ocon", "bearman"]],
  ["audi", "Audi", ["hulkenberg", "bortoleto"]],
  ["alpine", "Alpine", ["gasly", "colapinto"]],
  ["cadillac", "Cadillac", ["perez", "bottas"]],
];

const args = new Set(process.argv.slice(2));
const outputIndex = process.argv.indexOf("--output");
const outputPath = outputIndex >= 0 ? process.argv[outputIndex + 1] : "data/formula-one-2026-migration.json";
const apply = args.has("--apply");

const [dataRows, raceRows, driverRows, sprintRows, weeklyRows, providerDrivers] = await Promise.all([
  loadSheet("Data"), loadSheet("Races"), loadSheet("Drivers"), loadSheet("Sprints"), loadSheet("Weekly"), loadProviderDrivers(),
]);

const driverLookup = buildDriverLookup(providerDrivers);
const rounds = parseRounds(dataRows, raceRows, sprintRows);
const { sessions, results } = parseSessionTables(driverRows, sprintRows, driverLookup, rounds);
const entries = parseWeeklyEntries(weeklyRows, driverLookup);
const usedDriverIds = new Set([...results.map((result) => result.driverId), ...entries.flatMap((entry) => [entry.p1DriverId, entry.p2DriverId, entry.p3DriverId, entry.wildcardDriverId])].filter(Boolean));
const providerDriversById = new Map(providerDrivers.map((driver) => [driver.driverId, normalizeProviderDriver(driver)]));
const constructorByDriver = new Map(CONSTRUCTORS.flatMap(([constructorId, constructorName, driverIds]) => driverIds.map((driverId) => [driverId, { constructorId, constructorName }])));
const drivers = [...usedDriverIds].map((driverId) => ({
  ...(providerDriversById.get(driverId) || fallbackDriver(driverId, results)),
  ...(constructorByDriver.get(driverId) || {}),
}));
const payload = { sourceUrl: SOURCE_URL, generatedAt: new Date().toISOString(), rounds, drivers, sessions, results, entries };

if (apply) {
  const endpoint = String(process.env.FORMULA_ONE_ENDPOINT || "").replace(/\/$/, "");
  const token = String(process.env.FORMULA_ONE_ACCESS_TOKEN || "");
  if (!endpoint || !token) throw new Error("--apply requires FORMULA_ONE_ENDPOINT and FORMULA_ONE_ACCESS_TOKEN.");
  const response = await fetch(`${endpoint}/api/admin/seasons/${YEAR}/import`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.ok === false) throw new Error(result.error || `Import failed (${response.status}).`);
  console.log(JSON.stringify(result, null, 2));
} else {
  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`Wrote ${rounds.length} rounds, ${sessions.length} sessions, ${results.length} results, and ${entries.length} weekly entries to ${outputPath}.`);
}

async function loadSheet(name) {
  const url = PUBLISHED_GIDS[name]
    ? `${PUBLISHED_BASE_URL}?single=true&output=csv&gid=${PUBLISHED_GIDS[name]}`
    : `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(name)}`;
  const response = await fetch(url, { headers: { "User-Agent": "BoxThisLap/1.0 (formula-one-migration)" } });
  if (!response.ok) throw new Error(`Unable to read ${name} (${response.status}).`);
  return parseCsvMatrix(await response.text());
}

async function loadProviderDrivers() {
  const response = await fetch(`https://api.jolpi.ca/ergast/f1/${YEAR}/drivers.json`, {
    headers: { "User-Agent": "BoxThisLap/1.0 (formula-one-migration)" },
  });
  if (!response.ok) throw new Error(`Unable to read the ${YEAR} driver list (${response.status}).`);
  const payload = await response.json();
  return payload?.MRData?.DriverTable?.Drivers || [];
}

function parseRounds(dataRows, raceRows, sprintRows) {
  const raceFacts = new Map(raceRows.slice(1).map((row) => [Number(row[0]), row]));
  const sprintNames = new Set((sprintRows[0] || []).slice(1, -1).map((header) => normalize(String(header).replace(/^Round\s+\d+\s*/i, ""))).filter(Boolean));
  return dataRows.slice(1).map((row) => {
    const round = Number(row[0]);
    const facts = raceFacts.get(round) || [];
    return {
      round,
      name: row[1] || facts[1] || `Round ${round}`,
      raceDate: toIsoDate(row[2] || facts[2]),
      deadlineAt: toIsoDateTime(row[4]),
      hasSprint: sprintNames.has(normalize(row[1] || facts[1])) || truthy(facts[8]),
      driverOfTheDay: facts[3] || "",
      fastestPitTime: facts[4] || "",
      fastestPitTeam: facts[5] || "",
      dnfCount: facts[6] || "",
      safetyCar: facts[7] || "",
    };
  }).filter((round) => Number.isInteger(round.round));
}

function parseSessionTables(driverRows, sprintRows, driverLookup, rounds) {
  const headers = driverRows.map((row, index) => ({ index, row })).filter(({ row }) => normalize(row[0]) === "driver" && /^round\s+1(?:\D|$)/i.test(String(row[1] || "").trim()));
  if (headers.length < 6) {
    const candidates = driverRows.filter((row) => normalize(row[0]) === "driver").map((row) => row.slice(0, 3));
    throw new Error(`The Drivers sheet no longer contains the expected qualifying and race position tables (found ${headers.length}): ${JSON.stringify(candidates)}`);
  }
  const sessions = [];
  const results = [];
  const qualifyingTimes = {
    unadjusted: parseDriverTimeTable(driverRows, headers[2].index, driverLookup),
    adjusted: parseDriverTimeTable(driverRows, headers[3].index, driverLookup),
  };
  addPositionTable(driverRows, headers.at(-2).index, "qualifying", driverLookup, sessions, results, qualifyingTimes);
  addPositionTable(driverRows, headers.at(-1).index, "race", driverLookup, sessions, results);
  addSprintTable(sprintRows, driverLookup, rounds, sessions, results);
  return { sessions, results };
}

function addPositionTable(rows, headerIndex, sessionType, driverLookup, sessions, results, qualifyingTimes = null) {
  const header = rows[headerIndex];
  const driverRows = rows.slice(headerIndex + 1, headerIndex + 23);
  for (let column = 1; column < header.length; column += 1) {
    const round = Number(String(header[column]).match(/Round\s+(\d+)/i)?.[1]);
    if (!round) continue;
    const values = driverRows.map((row) => row[column]).filter((value) => String(value || "").trim());
    if (values.length < 18) continue;
    sessions.push({ round, sessionType, status: "approved", source: "google_sheet_2026", sourceUrl: SOURCE_URL });
    for (const row of driverRows) {
      const raw = String(row[column] || "").trim();
      if (!raw) continue;
      const driverId = resolveDriverId(row[0], driverLookup);
      const position = Number(raw);
      const result = {
        round, sessionType, driverId, displayName: row[0], position: Number.isInteger(position) ? position : null,
        classifiedPosition: raw, status: Number.isInteger(position) ? "" : raw,
      };
      if (qualifyingTimes) {
        result.qualifyingUnadjustedSeconds = qualifyingTimes.unadjusted.get(`${round}:${driverId}`) ?? null;
        result.qualifyingAdjustedSeconds = qualifyingTimes.adjusted.get(`${round}:${driverId}`) ?? null;
      }
      results.push(result);
    }
  }
}

function parseDriverTimeTable(rows, headerIndex, driverLookup) {
  const header = rows[headerIndex] || [];
  const values = new Map();
  for (const row of rows.slice(headerIndex + 1, headerIndex + 23)) {
    const driverId = resolveDriverId(row[0], driverLookup);
    for (let column = 1; column < header.length; column += 1) {
      const round = Number(String(header[column]).match(/Round\s+(\d+)/i)?.[1]);
      const seconds = Number(row[column]);
      if (round && Number.isFinite(seconds) && seconds > 0) values.set(`${round}:${driverId}`, seconds);
    }
  }
  return values;
}

function addSprintTable(rows, driverLookup, rounds, sessions, results) {
  const header = rows[0] || [];
  const driverRows = rows.slice(1, 23);
  const roundsByName = new Map(rounds.map((round) => [normalize(round.name), round.round]));
  for (let column = 1; column < header.length - 1; column += 1) {
    const sprintName = normalize(String(header[column]).replace(/^Round\s+\d+\s*/i, ""));
    const round = roundsByName.get(sprintName);
    const pointRows = driverRows.map((row) => ({ name: row[0], points: Number(row[column]) })).filter((item) => Number.isFinite(item.points) && item.points > 0);
    if (!round || !pointRows.length) continue;
    sessions.push({ round, sessionType: "sprint", status: "approved", source: "google_sheet_2026", sourceUrl: SOURCE_URL });
    for (const item of pointRows) {
      results.push({ round, sessionType: "sprint", driverId: resolveDriverId(item.name, driverLookup), displayName: item.name, position: 9 - item.points, classifiedPosition: String(9 - item.points), points: item.points });
    }
  }
}

function parseWeeklyEntries(rows, driverLookup) {
  const entries = [];
  let round = 0;
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index] || [];
    if (!(normalize(row[0]) === "person" && normalize(row[1]) === "p1" && normalize(row[6]) === "person" && normalize(row[13]) === "person")) continue;
    round += 1;
    for (const entryRow of rows.slice(index + 1)) {
      const managerName = String(entryRow[0] || "").trim();
      if (!managerName) break;
      const picks = entryRow.slice(1, 5).map((name) => {
        const value = String(name || "").trim();
        return ["n/a", "na", "-"].includes(normalize(value)) ? "" : value;
      });
      if (picks.every((pick) => !pick)) continue;
      const managerId = MANAGER_IDS.get(normalize(managerName));
      if (!managerId) throw new Error(`Unknown Formula 1 manager: ${managerName}`);
      entries.push({
        round, managerId,
        p1DriverId: picks[0] ? resolveDriverId(picks[0], driverLookup) : "",
        p2DriverId: picks[1] ? resolveDriverId(picks[1], driverLookup) : "",
        p3DriverId: picks[2] ? resolveDriverId(picks[2], driverLookup) : "",
        wildcardDriverId: picks[3] ? resolveDriverId(picks[3], driverLookup) : "",
      });
    }
  }
  return entries;
}

function buildDriverLookup(drivers) {
  return new Map(drivers.flatMap((driver) => {
    const fullName = `${driver.givenName || ""} ${driver.familyName || ""}`.trim();
    return [[normalize(fullName), driver.driverId], [normalize(driver.familyName), driver.driverId], [normalize(driver.driverId), driver.driverId]];
  }));
}

function resolveDriverId(name, lookup) {
  const key = normalize(name);
  const familyName = key.split(/\s+/).at(-1);
  return lookup.get(key) || lookup.get(familyName) || key.replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function normalizeProviderDriver(driver) {
  return {
    driverId: driver.driverId,
    permanentNumber: driver.permanentNumber || "",
    code: driver.code || "",
    givenName: driver.givenName || "",
    familyName: driver.familyName || "",
    displayName: `${driver.givenName || ""} ${driver.familyName || ""}`.trim(),
  };
}

function fallbackDriver(driverId, results) {
  const displayName = results.find((result) => result.driverId === driverId)?.displayName || driverId.replace(/_/g, " ");
  const names = displayName.split(/\s+/);
  return { driverId, permanentNumber: "", code: "", givenName: names.slice(0, -1).join(" "), familyName: names.at(-1) || "", displayName };
}

function normalize(value) {
  return String(value || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function truthy(value) {
  return ["true", "yes", "y", "1"].includes(normalize(value));
}

function toIsoDate(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? String(value) : date.toISOString().slice(0, 10);
}

function toIsoDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? String(value) : date.toISOString();
}
