import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_FOOTBALL_TEAMS_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTQnBDCv-KRIucQp-UsH_yb8MsrskZyuDHOC0ACgDKbmKB8SA3JGWORwr-pPxvkXwEJv5S2dCvcvf2n/pub?gid=1614272244&single=true&output=csv";
const OUTPUT_PATH = path.resolve(process.env.FOOTY_SCHEDULE_OUTPUT_PATH || path.join("data", "footy-schedule.json"));
const PROVIDER_NAME = "TheSportsDB";
const THE_SPORTS_DB_API_KEY = process.env.THE_SPORTS_DB_API_KEY || "";
const THE_SPORTS_DB_V1_API_KEY = process.env.THE_SPORTS_DB_V1_API_KEY || THE_SPORTS_DB_API_KEY || "3";
const THE_SPORTS_DB_BASE_URL = `https://www.thesportsdb.com/api/v1/json/${THE_SPORTS_DB_V1_API_KEY}`;
const API_CACHE_DIR = path.resolve(process.env.FOOTY_API_CACHE_DIR || path.join(".cache", "footy-schedule-api"));
const EXTERNAL_REQUEST_INTERVAL_MS = Number(process.env.FOOTY_API_REQUEST_INTERVAL_MS) || 2200;
const SHOULD_REFRESH_API_CACHE = isTrueValue(process.env.FOOTY_API_REFRESH);
const SHOULD_USE_API_CACHE = !isFalseValue(process.env.FOOTY_API_CACHE || "true");
const leagueSeasonCache = new Map();
let lastExternalRequestAt = 0;

async function main() {
  const generatedAt = new Date().toISOString();
  const footballData = await loadFootballData(process.env.FOOTBALL_TEAMS_CSV_URL || DEFAULT_FOOTBALL_TEAMS_CSV_URL);
  const leagueRowsByTeamId = groupRowsByField(footballData.leagueRows, "Team ID", "TeamID");
  const activeTeams = footballData.teamRows
    .filter((team) => hasTeamIdentity(team) && !isFalseValue(getField(team, "IsActive", "Active")))
    .sort((first, second) => comparePriority(first.Priority, second.Priority));
  const teams = [];
  const fixtures = [];
  const errors = [];
  const coverageNotes = [];

  for (const team of activeTeams) {
    const teamRecord = await resolveTeam(team, leagueRowsByTeamId.get(getField(team, "ID")) || []);
    teams.push(teamRecord);

    if (!teamRecord.providerTeamId) {
      errors.push(`Unable to resolve team: ${teamRecord.name}`);
      continue;
    }

    try {
      const schedule = await loadTeamSchedule(teamRecord);
      coverageNotes.push(...schedule.notes.map((note) => `${teamRecord.name}: ${note}`));
      errors.push(...schedule.errors.map((error) => `${teamRecord.name}: ${error}`));
      const events = schedule.events;
      fixtures.push(...events.map((event) => normalizeEvent(event, teamRecord)));
    } catch (error) {
      errors.push(`Unable to load fixtures for ${teamRecord.name}: ${error.message}`);
    }
  }

  fixtures.sort(compareFixtures);

  const payload = {
    generatedAt,
    source: PROVIDER_NAME,
    coverage: {
      mode: THE_SPORTS_DB_API_KEY ? "league-season-premium" : "league-season-free",
      notes: [...new Set(coverageNotes)],
    },
    teams,
    fixtures,
    errors,
  };

  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`Wrote ${fixtures.length} fixtures for ${teams.length} teams to ${OUTPUT_PATH}`);
}

async function resolveTeam(team, configuredLeagueRows = []) {
  const name = getField(team, "Name", "Team").trim();
  const league = getField(team, "League").trim();
  const explicitId = getField(
    team,
    "Provider Team ID",
    "ProviderTeamID",
    "TheSportsDB ID",
    "TheSportsDBID",
    "Source ID",
    "SourceID",
    "Provider ID",
    "ProviderID",
  ).trim();

  if (!name) {
    return {
      id: getField(team, "ID"),
      league,
      name: "Unnamed team",
      priority: getField(team, "Priority"),
      provider: PROVIDER_NAME,
      providerTeamId: explicitId,
      resolvedName: "",
      status: "missing-name",
    };
  }

  if (!explicitId) {
    return {
      id: getField(team, "ID"),
      league,
      name,
      priority: getField(team, "Priority"),
      provider: PROVIDER_NAME,
      providerTeamId: "",
      resolvedName: "",
      status: "missing-provider-team-id",
    };
  }

  const providerTeam = await loadTeamDetails(explicitId);

  return {
    badge: providerTeam?.strBadge || "",
    id: getField(team, "ID"),
    league,
    providerLeagues: getTeamProviderLeagues(team, configuredLeagueRows, providerTeam),
    name,
    priority: getField(team, "Priority"),
    provider: PROVIDER_NAME,
    providerLeague: providerTeam?.strLeague || "",
    providerTeamId: explicitId,
    resolvedName: providerTeam?.strTeam || name,
    status: providerTeam ? "configured" : "configured-unverified",
  };
}

async function loadTeamDetails(providerTeamId) {
  const data = await loadJson(`${THE_SPORTS_DB_BASE_URL}/lookupteam.php?id=${encodeURIComponent(providerTeamId)}`);

  return Array.isArray(data.teams) ? data.teams[0] : null;
}

async function loadTeamSchedule(team) {
  const leagueSchedules = [];
  const notes = [];
  const errors = [];

  for (const league of team.providerLeagues) {
    let leagueHadMatchingEvents = false;

    for (const season of getCurrentScheduleSeasonCandidates()) {
      try {
        const leagueEvents = await loadLeagueSeasonEvents(league.id, season);
        const teamEvents = leagueEvents.filter((event) => isTeamEvent(event, team));
        leagueSchedules.push(...teamEvents);
        notes.push(
          `Loaded ${teamEvents.length} matching events from ${league.name || `league ${league.id}`} ${season}.`,
        );

        if (teamEvents.length > 0) {
          leagueHadMatchingEvents = true;
          break;
        }
      } catch (error) {
        errors.push(`Unable to load ${league.name || `league ${league.id}`} ${season}: ${error.message}`);
      }
    }

    if (!leagueHadMatchingEvents) {
      notes.push(`${league.name || `league ${league.id}`} did not expose matching events in current season data.`);
    }
  }

  let nextEvents = [];

  try {
    nextEvents = await loadUpcomingEvents(team);
  } catch (error) {
    errors.push(`Unable to load direct team next events: ${error.message}`);
  }

  const events = dedupeEvents([...leagueSchedules, ...nextEvents]);

  return {
    events,
    errors,
    notes: [
      ...notes,
      `Merged ${nextEvents.length} direct team next-event records for near-term friendlies or fixtures not exposed through league-season calls.`,
      THE_SPORTS_DB_API_KEY
        ? "Using configured API key for v1 schedule calls."
        : "Using free v1 API key; TheSportsDB documents lower schedule limits for free calls.",
    ],
  };
}

async function loadLeagueSeasonEvents(leagueId, season) {
  const cacheKey = `${leagueId}:${season}`;

  if (leagueSeasonCache.has(cacheKey)) {
    return leagueSeasonCache.get(cacheKey);
  }

  const data = await loadJson(
    `${THE_SPORTS_DB_BASE_URL}/eventsseason.php?id=${encodeURIComponent(leagueId)}&s=${encodeURIComponent(season)}`,
  );
  const events = Array.isArray(data.events) ? data.events : [];
  leagueSeasonCache.set(cacheKey, events);

  return events;
}

async function loadUpcomingEvents(team) {
  const data = await loadJson(`${THE_SPORTS_DB_BASE_URL}/eventsnext.php?id=${encodeURIComponent(team.providerTeamId)}`);

  return Array.isArray(data.events) ? data.events : [];
}

function normalizeEvent(event, team) {
  const homeTeam = event.strHomeTeam || "";
  const awayTeam = event.strAwayTeam || "";
  const isHome = normalizeText(homeTeam) === normalizeText(team.resolvedName || team.name);
  const timestamp = event.strTimestamp ? `${event.strTimestamp}Z` : buildTimestamp(event.dateEvent, event.strTime);

  return {
    away: awayTeam,
    awayBadge: event.strAwayTeamBadge || "",
    date: event.dateEvent || "",
    home: homeTeam,
    homeBadge: event.strHomeTeamBadge || "",
    id: event.idEvent || "",
    leagueId: event.idLeague || "",
    isHome,
    league: event.strLeague || "",
    opponent: isHome ? awayTeam : homeTeam,
    round: event.intRound || "",
    season: event.strSeason || "",
    source: PROVIDER_NAME,
    status: event.strStatus || "",
    teamId: team.id,
    teamName: team.name,
    time: event.strTime || "",
    timestamp,
    venue: event.strVenue || "",
  };
}

function buildTimestamp(date, time) {
  if (!date) {
    return "";
  }

  return `${date}T${time || "00:00:00"}Z`;
}

async function loadCsv(url) {
  return parseCsv(await loadText(url, { extension: "csv" }));
}

async function loadFootballData(url) {
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

async function loadJson(url, headers = {}) {
  const text = await loadText(url, { extension: "json", headers });

  return JSON.parse(text);
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

  if (!response.ok) {
    throw new Error(`Failed to load ${extension.toUpperCase()} from ${url}: ${response.status}`);
  }

  const text = await response.text();

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

function parseCsv(text) {
  const rows = parseCsvRows(stripBom(text));

  if (rows.length === 0) {
    return [];
  }

  return recordsFromCsvSection({ headers: rows[0], rows: rows.slice(1) });
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

function getTeamProviderLeagues(team, configuredLeagueRows, providerTeam) {
  const configuredLeagueTableIds = configuredLeagueRows.map((league) => {
    const id = getField(
      league,
      "Provider League ID",
      "ProviderLeagueID",
      "Provider Team ID",
      "ProviderTeamID",
      "League ID",
      "LeagueID",
    ).trim();

    return {
      id,
      name: getField(league, "Name").trim(),
    };
  }).filter((league) => league.id);

  if (configuredLeagueTableIds.length > 0) {
    return dedupeBy(configuredLeagueTableIds, (league) => league.id);
  }

  const configuredLeagueIds = parseList(getField(
    team,
    "Provider League IDs",
    "Provider League ID",
    "ProviderLeagueIDs",
    "ProviderLeagueID",
    "League IDs",
    "League ID",
    "LeagueIDs",
    "LeagueID",
  ));

  if (configuredLeagueIds.length > 0) {
    return configuredLeagueIds.map((id) => ({ id, name: "" }));
  }

  if (!providerTeam) {
    return [];
  }

  const leagues = [];

  for (let index = 1; index <= 7; index += 1) {
    const suffix = index === 1 ? "" : String(index);
    const id = String(providerTeam[`idLeague${suffix}`] || "").trim();
    const name = String(providerTeam[`strLeague${suffix}`] || "").trim();

    if (id) {
      leagues.push({ id, name });
    }
  }

  return dedupeBy(leagues, (league) => league.id);
}

function groupRowsByField(rows, ...fieldNames) {
  const groupedRows = new Map();

  for (const row of rows) {
    const key = getField(row, ...fieldNames).trim();

    if (!key) {
      continue;
    }

    const currentRows = groupedRows.get(key) || [];
    currentRows.push(row);
    groupedRows.set(key, currentRows);
  }

  return groupedRows;
}

function getCurrentScheduleSeasonCandidates(referenceDate = new Date()) {
  const year = referenceDate.getUTCFullYear();
  const seasonStartYear = referenceDate.getUTCMonth() >= 6 ? year : year - 1;
  const seasonCandidates = [`${seasonStartYear}-${seasonStartYear + 1}`, String(year)];

  return dedupeBy(seasonCandidates, (season) => season);
}

function isTeamEvent(event, team) {
  return event.idHomeTeam === team.providerTeamId ||
    event.idAwayTeam === team.providerTeamId ||
    normalizeText(event.strHomeTeam) === normalizeText(team.resolvedName || team.name) ||
    normalizeText(event.strAwayTeam) === normalizeText(team.resolvedName || team.name);
}

function dedupeEvents(events) {
  return dedupeBy(events, (event) => {
    if (event.idEvent) {
      return `id:${event.idEvent}`;
    }

    return [
      event.dateEvent,
      event.strTime,
      normalizeText(event.strHomeTeam),
      normalizeText(event.strAwayTeam),
      normalizeText(event.strLeague),
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

function parseList(value) {
  return String(value ?? "")
    .split(/[,;|\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function hasTeamIdentity(team) {
  return Boolean(getField(team, "Name", "Team").trim() || getField(team, "Provider Team ID", "ProviderTeamID").trim());
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
