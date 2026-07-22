import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_FOOTBALL_TEAMS_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTQnBDCv-KRIucQp-UsH_yb8MsrskZyuDHOC0ACgDKbmKB8SA3JGWORwr-pPxvkXwEJv5S2dCvcvf2n/pub?gid=1614272244&single=true&output=csv";
const OUTPUT_PATH = path.resolve(process.env.FOOTY_SCHEDULE_OUTPUT_PATH || path.join("data", "footy-schedule.json"));
const PROVIDER_NAME = "football-data.org";
const FOOTBALL_DATA_API_KEY = process.env.FOOTBALL_DATA_API_KEY || "";
const FOOTBALL_DATA_BASE_URL = "https://api.football-data.org/v4";
const API_CACHE_DIR = path.resolve(process.env.FOOTY_API_CACHE_DIR || path.join(".cache", "footy-schedule-api"));
const EXTERNAL_REQUEST_INTERVAL_MS = Number(process.env.FOOTY_API_REQUEST_INTERVAL_MS) || 6500;
const LOOKAHEAD_DAYS = Number(process.env.FOOTY_SCHEDULE_LOOKAHEAD_DAYS) || 365;
const MATCH_STATUS = process.env.FOOTY_SCHEDULE_MATCH_STATUS || "SCHEDULED";
const SHOULD_REFRESH_API_CACHE = isTrueValue(process.env.FOOTY_API_REFRESH);
const SHOULD_USE_API_CACHE = !isFalseValue(process.env.FOOTY_API_CACHE || "true");
const FALLBACK_FOOTBALL_DATA_TEAM_IDS = {
  arsenal: "57",
  barcelona: "81",
  wrexham: "404",
};
let lastExternalRequestAt = 0;

async function main() {
  if (!FOOTBALL_DATA_API_KEY) {
    throw new Error("Missing FOOTBALL_DATA_API_KEY. Add it as a GitHub Actions repository secret.");
  }

  const generatedAt = new Date().toISOString();
  const footballData = await loadFootballSheet(process.env.FOOTBALL_TEAMS_CSV_URL || DEFAULT_FOOTBALL_TEAMS_CSV_URL);
  const activeTeams = footballData.teamRows
    .filter((team) => hasTeamIdentity(team) && !isFalseValue(getField(team, "IsActive", "Active")))
    .sort((first, second) => comparePriority(first.Priority, second.Priority));
  const dateFrom = formatDate(new Date());
  const dateTo = formatDate(addDays(new Date(), LOOKAHEAD_DAYS));
  const teams = [];
  const fixtures = [];
  const errors = [];
  const coverageNotes = [];

  for (const team of activeTeams) {
    const teamRecord = await resolveTeam(team);
    teams.push(teamRecord);

    if (!teamRecord.providerTeamId) {
      errors.push(`Unable to resolve football-data.org team ID for ${teamRecord.name}.`);
      continue;
    }

    try {
      const schedule = await loadTeamSchedule(teamRecord, { dateFrom, dateTo });
      coverageNotes.push(...schedule.notes.map((note) => `${teamRecord.name}: ${note}`));
      errors.push(...schedule.errors.map((error) => `${teamRecord.name}: ${error}`));
      fixtures.push(...schedule.matches.map((match) => normalizeMatch(match, teamRecord)));
    } catch (error) {
      errors.push(`Unable to load fixtures for ${teamRecord.name}: ${error.message}`);
    }
  }

  const dedupedFixtures = dedupeFixtures(fixtures).sort(compareFixtures);
  const payload = {
    generatedAt,
    source: PROVIDER_NAME,
    coverage: {
      mode: "team-scheduled-matches",
      notes: [...new Set(coverageNotes)],
    },
    teams,
    fixtures: dedupedFixtures,
    errors,
  };

  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`Wrote ${dedupedFixtures.length} fixtures for ${teams.length} teams to ${OUTPUT_PATH}`);
}

async function resolveTeam(team) {
  const name = getField(team, "Name", "Team").trim();
  const configuredId = getFootballDataTeamId(team);

  if (!name) {
    return {
      id: getField(team, "ID"),
      name: "Unnamed team",
      priority: getField(team, "Priority"),
      provider: PROVIDER_NAME,
      providerTeamId: configuredId,
      resolvedName: "",
      status: "missing-name",
    };
  }

  if (!configuredId) {
    return {
      id: getField(team, "ID"),
      name,
      priority: getField(team, "Priority"),
      provider: PROVIDER_NAME,
      providerTeamId: "",
      resolvedName: "",
      status: "missing-provider-team-id",
    };
  }

  const providerTeam = await loadFootballDataJson(`/teams/${encodeURIComponent(configuredId)}`);

  return {
    badge: providerTeam.crest || "",
    id: getField(team, "ID"),
    league: getField(team, "League").trim(),
    name,
    priority: getField(team, "Priority"),
    provider: PROVIDER_NAME,
    providerLeague: providerTeam.runningCompetitions?.[0]?.name || "",
    providerLeagues: normalizeRunningCompetitions(providerTeam.runningCompetitions),
    providerTeamId: String(providerTeam.id || configuredId),
    resolvedName: providerTeam.name || name,
    status: providerTeam.id ? "configured" : "configured-unverified",
  };
}

async function loadTeamSchedule(team, { dateFrom, dateTo }) {
  const query = new URLSearchParams({
    dateFrom,
    dateTo,
    limit: "500",
  });

  if (MATCH_STATUS) {
    query.set("status", MATCH_STATUS);
  }

  const data = await loadFootballDataJson(`/teams/${encodeURIComponent(team.providerTeamId)}/matches?${query.toString()}`);
  const matches = Array.isArray(data.matches) ? data.matches : [];

  return {
    errors: getFootballDataErrorMessages(data),
    matches,
    notes: [
      `Loaded ${matches.length} ${MATCH_STATUS || "all-status"} matches from ${dateFrom} through ${dateTo}.`,
      ...formatRunningCompetitionNotes(team.providerLeagues),
    ],
  };
}

function normalizeMatch(match, team) {
  const homeTeam = match.homeTeam?.name || "";
  const awayTeam = match.awayTeam?.name || "";
  const isHome = String(match.homeTeam?.id || "") === String(team.providerTeamId) ||
    normalizeText(homeTeam) === normalizeText(team.resolvedName || team.name);
  const timestamp = match.utcDate || "";

  return {
    away: awayTeam,
    awayBadge: "",
    date: timestamp.slice(0, 10),
    home: homeTeam,
    homeBadge: "",
    id: String(match.id || ""),
    leagueId: String(match.competition?.id || ""),
    isHome,
    league: match.competition?.name || "",
    opponent: isHome ? awayTeam : homeTeam,
    round: match.matchday ? String(match.matchday) : "",
    season: match.season?.startDate ? match.season.startDate.slice(0, 4) : "",
    source: PROVIDER_NAME,
    status: match.status || "",
    teamBadge: team.badge || "",
    teamId: team.id,
    teamName: team.name,
    time: timestamp.slice(11, 19),
    timestamp,
    venue: "",
  };
}

async function loadFootballSheet(url) {
  const rows = parseCsvRows(stripBom(await loadText(url, { extension: "csv" })));
  const sections = splitCsvSections(rows);
  const teamRows = [];
  const leagueRows = [];

  for (const section of sections) {
    const records = recordsFromCsvSection(section);

    if (isTeamsSection(section.headers)) {
      teamRows.push(...records);
      continue;
    }

    if (isLeaguesSection(section.headers)) {
      leagueRows.push(...records);
    }
  }

  return { leagueRows, teamRows };
}

async function loadFootballDataJson(endpoint) {
  return JSON.parse(await loadText(`${FOOTBALL_DATA_BASE_URL}${endpoint}`, {
    extension: "json",
    headers: { "X-Auth-Token": FOOTBALL_DATA_API_KEY },
  }));
}

async function loadText(url, { extension, headers = {} }) {
  const cachePath = getApiCachePath(url, extension);

  if (SHOULD_USE_API_CACHE && !SHOULD_REFRESH_API_CACHE) {
    const cachedText = await tryReadFile(cachePath);

    if (cachedText !== null) {
      return cachedText;
    }
  }

  await waitForExternalRequestSlot();
  const response = await fetch(url, { headers: { "user-agent": "boxthislap-footy-updater", ...headers } });
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Failed to load ${url}: ${response.status} ${getErrorMessageFromText(text)}`);
  }

  if (SHOULD_USE_API_CACHE) {
    await writeApiCacheFile(cachePath, url, text);
  }

  return text;
}

async function waitForExternalRequestSlot() {
  if (!EXTERNAL_REQUEST_INTERVAL_MS) {
    return;
  }

  const now = Date.now();
  const waitMs = Math.max(0, lastExternalRequestAt + EXTERNAL_REQUEST_INTERVAL_MS - now);

  if (waitMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  lastExternalRequestAt = Date.now();
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

async function writeApiCacheFile(filePath, url, text) {
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

function getApiCachePath(url, extension) {
  const parsedUrl = new URL(url);
  const readableName = [
    parsedUrl.hostname.replace(/^www\./, ""),
    ...parsedUrl.pathname.split("/").filter(Boolean).slice(-2),
  ].join("-");
  const safeName = readableName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const hash = createHash("sha256").update(url).digest("hex").slice(0, 12);

  return path.join(API_CACHE_DIR, `${safeName}-${hash}.${extension}`);
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

function isBlankCsvRow(row) {
  return row.every((value) => !value.trim());
}

function isTeamsSection(headers) {
  const normalizedHeaders = headers.map(normalizeText);

  return normalizedHeaders.includes("priority") &&
    normalizedHeaders.includes("provider team id") &&
    !normalizedHeaders.includes("team id");
}

function isLeaguesSection(headers) {
  const normalizedHeaders = headers.map(normalizeText);

  return normalizedHeaders.includes("team id") &&
    (normalizedHeaders.includes("provider league id") || normalizedHeaders.includes("provider team id"));
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

function getFootballDataTeamId(team) {
  const explicitId = getField(
    team,
    "Football-Data Team ID",
    "Football Data Team ID",
    "FootballData Team ID",
    "FootballDataTeamID",
  ).trim();

  return explicitId || FALLBACK_FOOTBALL_DATA_TEAM_IDS[normalizeText(getField(team, "Name", "Team"))] || "";
}

function normalizeRunningCompetitions(competitions = []) {
  return competitions.map((competition) => ({
    id: String(competition.id || ""),
    name: competition.name || "",
    code: competition.code || "",
  })).filter((competition) => competition.id || competition.name || competition.code);
}

function formatRunningCompetitionNotes(competitions = []) {
  const names = competitions.map((competition) => {
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

function dedupeFixtures(fixtures) {
  return dedupeBy(fixtures, (fixture) => {
    if (fixture.id) {
      return `id:${fixture.id}:team:${fixture.teamId}`;
    }

    return [
      fixture.date,
      fixture.time,
      normalizeText(fixture.home),
      normalizeText(fixture.away),
      normalizeText(fixture.league),
      fixture.teamId,
    ].join("|");
  });
}

function dedupeBy(items, getKey) {
  const seen = new Set();
  const deduped = [];

  for (const item of items) {
    const key = getKey(item);

    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(item);
  }

  return deduped;
}

function hasTeamIdentity(team) {
  return Boolean(getField(team, "Name", "Team").trim() || getFootballDataTeamId(team));
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);

  return copy;
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

function comparePriority(firstPriority, secondPriority) {
  return (Number(firstPriority) || 999) - (Number(secondPriority) || 999);
}

function compareFixtures(first, second) {
  return String(first.timestamp || first.date).localeCompare(String(second.timestamp || second.date)) ||
    comparePriority(first.teamId, second.teamId) ||
    first.teamName.localeCompare(second.teamName);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
