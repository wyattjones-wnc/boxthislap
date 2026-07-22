import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_FOOTBALL_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTQnBDCv-KRIucQp-UsH_yb8MsrskZyuDHOC0ACgDKbmKB8SA3JGWORwr-pPxvkXwEJv5S2dCvcvf2n/pub?gid=1614272244&single=true&output=csv";
const API_BASE_URL = "https://v3.football.api-sports.io";
const CACHE_DIR = path.resolve(process.env.API_FOOTBALL_TEST_CACHE_DIR || path.join(".cache", "api-football-tests"));
const API_KEY = process.env.API_FOOTBALL_API_KEY || process.env.API_SPORTS_KEY || "";
const SHOULD_REFRESH_CACHE = isTrueValue(process.env.API_FOOTBALL_TEST_REFRESH);
const SHOULD_USE_CACHE = !isFalseValue(process.env.API_FOOTBALL_TEST_CACHE || "true");
const LOOKAHEAD_DAYS = Number(process.env.API_FOOTBALL_TEST_LOOKAHEAD_DAYS) || 365;
const SEASON = process.env.API_FOOTBALL_TEST_SEASON || String(new Date().getUTCFullYear());
const TODAY = new Date();

async function main() {
  if (!API_KEY) {
    throw new Error([
      "Missing API key.",
      "Set API_FOOTBALL_API_KEY to your API-Football key, then run:",
      "  $env:API_FOOTBALL_API_KEY='your-key'; node scripts\\test-api-football.mjs",
    ].join("\n"));
  }

  const teams = await loadConfiguredTeams(process.env.FOOTBALL_TEAMS_CSV_URL || DEFAULT_FOOTBALL_CSV_URL);

  if (teams.length === 0) {
    throw new Error("No teams were loaded from the Football sheet.");
  }

  const fromDate = formatDate(TODAY);
  const toDate = formatDate(addDays(TODAY, LOOKAHEAD_DAYS));
  const results = [];

  for (const team of teams) {
    const resolvedTeam = await resolveApiFootballTeam(team);

    if (!resolvedTeam) {
      results.push({
        name: team.name,
        status: "not-found",
        fixtures: [],
        notes: [`No API-Football team match found for ${team.name}.`],
      });
      continue;
    }

    const fixtureResult = await loadApiFootballFixtures({
      fromDate,
      season: SEASON,
      teamId: resolvedTeam.id,
      toDate,
    });
    const apiErrors = getApiFootballErrorMessages(fixtureResult.errors);

    results.push({
      apiFootballId: resolvedTeam.id,
      name: team.name,
      resolvedName: resolvedTeam.name,
      status: apiErrors.length > 0 ? "error" : fixtureResult.fixtures.length > 0 ? "ok" : "empty",
      fixtures: fixtureResult.fixtures,
      notes: [
        `Resolved ${team.name} to API-Football team ${resolvedTeam.id} (${resolvedTeam.name}).`,
        `Loaded ${fixtureResult.fixtures.length} fixtures from ${fromDate} through ${toDate} for season ${SEASON}.`,
        ...apiErrors.map((error) => `API-Football error: ${error}`),
      ],
    });
  }

  printReport(results);
}

async function loadConfiguredTeams(url) {
  const rows = parseCsvRows(stripBom(await loadText(url, { extension: "csv", useApiFootballHeaders: false })));
  const sections = splitCsvSections(rows);
  const teams = [];

  for (const section of sections) {
    if (!isTeamsSection(section.headers)) {
      continue;
    }

    const records = recordsFromCsvSection(section);
    teams.push(...records.filter((record) => !isFalseValue(getField(record, "IsActive", "Active"))).map((record) => ({
      country: getField(record, "Country").trim(),
      id: getField(record, "ID").trim(),
      name: getField(record, "Name", "Team").trim(),
      priority: getField(record, "Priority").trim(),
      providerTeamId: getField(record, "API-Football Team ID", "ApiFootball Team ID", "ApiFootballTeamID").trim(),
    })).filter((team) => team.name));
  }

  return teams.sort((first, second) => comparePriority(first.priority, second.priority));
}

async function resolveApiFootballTeam(team) {
  if (team.providerTeamId) {
    const data = await loadApiFootballJson(`/teams?id=${encodeURIComponent(team.providerTeamId)}`);
    const firstTeam = data.response?.[0]?.team;
    return firstTeam ? normalizeApiFootballTeam(firstTeam) : null;
  }

  const data = await loadApiFootballJson(`/teams?search=${encodeURIComponent(team.name)}`);
  const matches = Array.isArray(data.response) ? data.response : [];
  const exactMatch = matches.find((match) => normalizeText(match.team?.name) === normalizeText(team.name));
  const countryMatch = team.country
    ? matches.find((match) => normalizeText(match.team?.country) === normalizeText(team.country))
    : null;
  const selectedMatch = exactMatch || countryMatch || matches[0];

  return selectedMatch?.team ? normalizeApiFootballTeam(selectedMatch.team) : null;
}

async function loadApiFootballFixtures({ fromDate, season, teamId, toDate }) {
  const data = await loadApiFootballJson([
    "/fixtures?",
    `team=${encodeURIComponent(teamId)}`,
    `&season=${encodeURIComponent(season)}`,
    `&from=${encodeURIComponent(fromDate)}`,
    `&to=${encodeURIComponent(toDate)}`,
    "&timezone=America%2FNew_York",
  ].join(""));
  const fixtures = Array.isArray(data.response) ? data.response : [];

  return {
    errors: data.errors,
    fixtures: fixtures.map((fixture) => ({
      away: fixture.teams?.away?.name || "",
      date: fixture.fixture?.date || "",
      home: fixture.teams?.home?.name || "",
      id: fixture.fixture?.id || "",
      league: fixture.league?.name || "",
      round: fixture.league?.round || "",
      season: fixture.league?.season || "",
      status: fixture.fixture?.status?.short || "",
      timestamp: fixture.fixture?.timestamp || "",
    })).sort((first, second) => String(first.date).localeCompare(String(second.date))),
  };
}

function normalizeApiFootballTeam(team) {
  return {
    country: team.country || "",
    id: String(team.id || ""),
    logo: team.logo || "",
    name: team.name || "",
  };
}

async function loadApiFootballJson(endpoint) {
  return loadText(`${API_BASE_URL}${endpoint}`, {
    extension: "json",
    useApiFootballHeaders: true,
  }).then((text) => JSON.parse(text));
}

async function loadText(url, { extension, useApiFootballHeaders }) {
  const cachePath = getCachePath(url, extension);

  if (SHOULD_USE_CACHE && !SHOULD_REFRESH_CACHE) {
    const cachedText = await tryReadFile(cachePath);

    if (cachedText !== null) {
      return cachedText;
    }
  }

  const headers = useApiFootballHeaders ? { "x-apisports-key": API_KEY } : {};
  const response = await fetch(url, { headers: { "user-agent": "boxthislap-api-football-test", ...headers } });

  if (!response.ok) {
    throw new Error(`Failed to load ${url}: ${response.status}`);
  }

  const text = await response.text();

  if (SHOULD_USE_CACHE) {
    await writeCacheFile(cachePath, url, text);
  }

  return text;
}

async function tryReadFile(filePath) {
  try {
    return await readFile(filePath, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

async function writeCacheFile(filePath, url, text) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, text, "utf8");
  await writeFile(
    `${filePath}.meta.json`,
    `${JSON.stringify({
      fetchedAt: new Date().toISOString(),
      url,
    }, null, 2)}\n`,
    "utf8",
  );
}

function getCachePath(url, extension) {
  const parsedUrl = new URL(url);
  const readableName = [
    parsedUrl.hostname.replace(/^www\./, ""),
    ...parsedUrl.pathname.split("/").filter(Boolean).slice(-2),
  ].join("-");
  const safeName = readableName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const hash = createHash("sha256").update(url).digest("hex").slice(0, 12);

  return path.join(CACHE_DIR, `${safeName}-${hash}.${extension}`);
}

function printReport(results) {
  console.log("API-Football fixture coverage test");
  console.log(`Season: ${SEASON}`);
  console.log(`Lookahead days: ${LOOKAHEAD_DAYS}`);
  console.log("");

  for (const result of results) {
    console.log(`${result.name}: ${result.status}`);

    for (const note of result.notes) {
      console.log(`  - ${note}`);
    }

    for (const fixture of result.fixtures.slice(0, 12)) {
      console.log(`  - ${fixture.date.slice(0, 10)} ${fixture.home} v ${fixture.away} (${fixture.league})`);
    }

    if (result.fixtures.length > 12) {
      console.log(`  - ... ${result.fixtures.length - 12} more`);
    }

    console.log("");
  }
}

function getApiFootballErrorMessages(errors) {
  if (!errors) {
    return [];
  }

  if (Array.isArray(errors)) {
    return errors.map(String).filter(Boolean);
  }

  if (typeof errors === "object") {
    return Object.entries(errors).map(([key, value]) => {
      return `${key}: ${Array.isArray(value) ? value.join(", ") : String(value)}`;
    }).filter((error) => !error.endsWith(": "));
  }

  return [String(errors)].filter(Boolean);
}

function splitCsvSections(rows) {
  const sections = [];
  let headers = null;
  let sectionRows = [];

  for (const row of rows) {
    if (isBlankCsvRow(row)) {
      if (headers) {
        sections.push({ headers, rows: sectionRows });
        headers = null;
        sectionRows = [];
      }

      continue;
    }

    if (!headers) {
      headers = row;
      sectionRows = [];
      continue;
    }

    sectionRows.push(row);
  }

  if (headers) {
    sections.push({ headers, rows: sectionRows });
  }

  return sections;
}

function recordsFromCsvSection(section) {
  const headers = section.headers.map((header) => header.trim());

  return section.rows.filter((row) => row.some((value) => value.trim())).map((row) => {
    return headers.reduce((record, header, index) => {
      record[header || `Column ${index + 1}`] = row[index] ?? "";
      return record;
    }, {});
  });
}

function isTeamsSection(headers) {
  const normalizedHeaders = headers.map(normalizeText);

  return normalizedHeaders.includes("priority") &&
    normalizedHeaders.includes("provider team id") &&
    !normalizedHeaders.includes("team id");
}

function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === "\"") {
      if (inQuotes && nextChar === "\"") {
        field += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";

      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }

      continue;
    }

    field += char;
  }

  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function isBlankCsvRow(row) {
  return row.every((value) => !value.trim());
}

function stripBom(text) {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function getField(row, ...names) {
  for (const name of names) {
    if (Object.prototype.hasOwnProperty.call(row, name)) {
      return String(row[name] ?? "");
    }
  }

  return "";
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);

  return copy;
}

function comparePriority(firstPriority, secondPriority) {
  return (Number(firstPriority) || 999) - (Number(secondPriority) || 999);
}

function normalizeText(value) {
  return String(value ?? "").trim().toLowerCase();
}

function isFalseValue(value) {
  return ["false", "no", "n", "0"].includes(normalizeText(value));
}

function isTrueValue(value) {
  return ["true", "yes", "y", "1"].includes(normalizeText(value));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
