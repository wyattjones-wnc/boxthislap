import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_FOOTBALL_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTQnBDCv-KRIucQp-UsH_yb8MsrskZyuDHOC0ACgDKbmKB8SA3JGWORwr-pPxvkXwEJv5S2dCvcvf2n/pub?gid=1614272244&single=true&output=csv";
const API_BASE_URL = "https://api.football-data.org/v4";
const CACHE_DIR = path.resolve(process.env.FOOTBALL_DATA_TEST_CACHE_DIR || path.join(".cache", "football-data-tests"));
const API_KEY = process.env.FOOTBALL_DATA_API_KEY || "";
const SHOULD_REFRESH_CACHE = isTrueValue(process.env.FOOTBALL_DATA_TEST_REFRESH);
const SHOULD_USE_CACHE = !isFalseValue(process.env.FOOTBALL_DATA_TEST_CACHE || "true");
const LOOKAHEAD_DAYS = Number(process.env.FOOTBALL_DATA_TEST_LOOKAHEAD_DAYS) || 365;
const MATCH_STATUS = process.env.FOOTBALL_DATA_TEST_STATUS || "SCHEDULED";
const TODAY = new Date();
const FALLBACK_TEAM_IDS = {
  arsenal: "57",
  barcelona: "81",
  wrexham: "404",
};

async function main() {
  if (!API_KEY) {
    throw new Error([
      "Missing API key.",
      "Set FOOTBALL_DATA_API_KEY to your football-data.org token, then run:",
      "  $env:FOOTBALL_DATA_API_KEY='your-token'; node scripts\\test-football-data.mjs",
    ].join("\n"));
  }

  const teams = await loadConfiguredTeams(process.env.FOOTBALL_TEAMS_CSV_URL || DEFAULT_FOOTBALL_CSV_URL);

  if (teams.length === 0) {
    throw new Error("No teams were loaded from the Football sheet.");
  }

  const dateFrom = formatDate(TODAY);
  const dateTo = formatDate(addDays(TODAY, LOOKAHEAD_DAYS));
  const results = [];

  for (const team of teams) {
    const footballDataId = team.footballDataTeamId || FALLBACK_TEAM_IDS[normalizeText(team.name)];

    if (!footballDataId) {
      results.push({
        fixtures: [],
        name: team.name,
        notes: [`No Football-Data team ID configured for ${team.name}.`],
        status: "missing-id",
      });
      continue;
    }

    let teamResult = { errors: [], team: null };
    let matchResult = { errors: [], fixtures: [] };

    try {
      teamResult = await loadFootballDataTeam(footballDataId);
      matchResult = await loadFootballDataMatches({
        dateFrom,
        dateTo,
        status: MATCH_STATUS,
        teamId: footballDataId,
      });
    } catch (error) {
      teamResult.errors.push(error.message);
    }

    const errors = [
      ...teamResult.errors.map((error) => `Team lookup error: ${error}`),
      ...matchResult.errors.map((error) => `Match lookup error: ${error}`),
    ];

    results.push({
      fixtures: matchResult.fixtures,
      footballDataId,
      name: team.name,
      resolvedName: teamResult.team?.name || "",
      status: errors.length > 0 ? "error" : matchResult.fixtures.length > 0 ? "ok" : "empty",
      notes: [
        `Using Football-Data team ${footballDataId}${teamResult.team?.name ? ` (${teamResult.team.name})` : ""}.`,
        `Loaded ${matchResult.fixtures.length} ${MATCH_STATUS || "all-status"} matches from ${dateFrom} through ${dateTo}.`,
        ...formatRunningCompetitions(teamResult.team),
        ...errors,
      ],
    });
  }

  printReport(results);
}

async function loadConfiguredTeams(url) {
  const rows = parseCsvRows(stripBom(await loadText(url, { extension: "csv", useFootballDataHeaders: false })));
  const sections = splitCsvSections(rows);
  const teams = [];

  for (const section of sections) {
    if (!isTeamsSection(section.headers)) {
      continue;
    }

    const records = recordsFromCsvSection(section);
    teams.push(...records.filter((record) => !isFalseValue(getField(record, "IsActive", "Active"))).map((record) => ({
      footballDataTeamId: getField(
        record,
        "Football-Data Team ID",
        "Football Data Team ID",
        "FootballData Team ID",
        "FootballDataTeamID",
      ).trim(),
      id: getField(record, "ID").trim(),
      name: getField(record, "Name", "Team").trim(),
      priority: getField(record, "Priority").trim(),
    })).filter((team) => team.name));
  }

  return teams.sort((first, second) => comparePriority(first.priority, second.priority));
}

async function loadFootballDataTeam(teamId) {
  const data = await loadFootballDataJson(`/teams/${encodeURIComponent(teamId)}`);

  return {
    errors: getFootballDataErrorMessages(data),
    team: data.id ? data : null,
  };
}

async function loadFootballDataMatches({ dateFrom, dateTo, status, teamId }) {
  const query = new URLSearchParams({
    dateFrom,
    dateTo,
    limit: "500",
  });

  if (status) {
    query.set("status", status);
  }

  const data = await loadFootballDataJson(`/teams/${encodeURIComponent(teamId)}/matches?${query.toString()}`);
  const matches = Array.isArray(data.matches) ? data.matches : [];

  return {
    errors: getFootballDataErrorMessages(data),
    fixtures: matches.map((match) => ({
      away: match.awayTeam?.name || "",
      competition: match.competition?.name || "",
      date: match.utcDate || "",
      home: match.homeTeam?.name || "",
      id: match.id || "",
      matchday: match.matchday || "",
      status: match.status || "",
    })).sort((first, second) => String(first.date).localeCompare(String(second.date))),
  };
}

async function loadFootballDataJson(endpoint) {
  return loadText(`${API_BASE_URL}${endpoint}`, {
    extension: "json",
    useFootballDataHeaders: true,
  }).then((text) => JSON.parse(text));
}

async function loadText(url, { extension, useFootballDataHeaders }) {
  const cachePath = getCachePath(url, extension);

  if (SHOULD_USE_CACHE && !SHOULD_REFRESH_CACHE) {
    const cachedText = await tryReadFile(cachePath);

    if (cachedText !== null) {
      return cachedText;
    }
  }

  const headers = useFootballDataHeaders ? { "X-Auth-Token": API_KEY } : {};
  const response = await fetch(url, { headers: { "user-agent": "boxthislap-football-data-test", ...headers } });
  const text = await response.text();

  if (!response.ok) {
    const message = getErrorMessageFromText(text) || response.statusText;
    throw new Error(`Failed to load ${url}: ${response.status} ${message}`);
  }

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
  console.log("football-data.org fixture coverage test");
  console.log(`Status: ${MATCH_STATUS || "all"}`);
  console.log(`Lookahead days: ${LOOKAHEAD_DAYS}`);
  console.log("");

  for (const result of results) {
    console.log(`${result.name}: ${result.status}`);

    for (const note of result.notes) {
      console.log(`  - ${note}`);
    }

    for (const fixture of result.fixtures.slice(0, 12)) {
      console.log(`  - ${fixture.date.slice(0, 10)} ${fixture.home} v ${fixture.away} (${fixture.competition})`);
    }

    if (result.fixtures.length > 12) {
      console.log(`  - ... ${result.fixtures.length - 12} more`);
    }

    console.log("");
  }
}

function formatRunningCompetitions(team) {
  if (!Array.isArray(team?.runningCompetitions) || team.runningCompetitions.length === 0) {
    return [];
  }

  const names = team.runningCompetitions.map((competition) => {
    return competition.code ? `${competition.name} (${competition.code})` : competition.name;
  }).filter(Boolean);

  return names.length > 0 ? [`Running competitions: ${names.join(", ")}.`] : [];
}

function getFootballDataErrorMessages(data) {
  if (!data || !data.errorCode && !data.message) {
    return [];
  }

  return [[data.errorCode, data.message].filter(Boolean).join(": ")].filter(Boolean);
}

function getErrorMessageFromText(text) {
  try {
    const data = JSON.parse(text);
    return [data.errorCode, data.message].filter(Boolean).join(": ");
  } catch {
    return text.slice(0, 180);
  }
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
