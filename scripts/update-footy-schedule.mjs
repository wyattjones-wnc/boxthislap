import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_FOOTBALL_TEAMS_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTQnBDCv-KRIucQp-UsH_yb8MsrskZyuDHOC0ACgDKbmKB8SA3JGWORwr-pPxvkXwEJv5S2dCvcvf2n/pub?gid=1614272244&single=true&output=csv";
const OUTPUT_PATH = path.resolve(process.env.FOOTY_SCHEDULE_OUTPUT_PATH || path.join("data", "footy-schedule.json"));
const PRIMARY_PROVIDER_NAME = "football-data.org";
const SPORTDB_PROVIDER_NAME = "TheSportsDB";
const FOOTBALL_DATA_API_KEY = process.env.FOOTBALL_DATA_API_KEY || "";
const FOOTBALL_DATA_BASE_URL = "https://api.football-data.org/v4";
const SPORTDB_BASE_URL = process.env.SPORTDB_BASE_URL || "https://www.thesportsdb.com/api/v1/json/3";
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
  const teamRowsById = new Map(activeTeams.map((team) => [getField(team, "ID").trim(), team]));
  const leagueRowsByTeamId = groupBy(footballData.leagueRows, (league) => getField(league, "Team ID").trim());

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
      fixtures.push(...schedule.matches.map((match) => normalizeFootballDataMatch(match, teamRecord)));
    } catch (error) {
      errors.push(`Unable to load fixtures for ${teamRecord.name}: ${error.message}`);
    }
  }

  const sportDbSchedules = await loadSportDbSchedules({
    dateFrom,
    dateTo,
    leagueRowsByTeamId,
    teamRowsById,
    teams,
  });
  coverageNotes.push(...sportDbSchedules.notes);
  errors.push(...sportDbSchedules.errors);
  fixtures.push(...sportDbSchedules.fixtures);

  const dedupedFixtures = mergeFixtures(fixtures).sort(compareFixtures);
  const payload = {
    generatedAt,
    source: `${PRIMARY_PROVIDER_NAME} + ${SPORTDB_PROVIDER_NAME}`,
    coverage: {
      mode: "team-scheduled-matches-merged-sources",
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
      provider: PRIMARY_PROVIDER_NAME,
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
      provider: PRIMARY_PROVIDER_NAME,
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
    provider: PRIMARY_PROVIDER_NAME,
    providerLeague: providerTeam.runningCompetitions?.[0]?.name || "",
    providerLeagues: normalizeRunningCompetitions(providerTeam.runningCompetitions),
    providerTeamId: String(providerTeam.id || configuredId),
    resolvedName: providerTeam.name || name,
    sportDbTeamId: getSportDbTeamId(team),
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

function normalizeFootballDataMatch(match, team) {
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
    source: PRIMARY_PROVIDER_NAME,
    sources: [PRIMARY_PROVIDER_NAME],
    status: match.status || "",
    teamBadge: team.badge || "",
    teamId: team.id,
    teamName: team.name,
    time: timestamp.slice(11, 19),
    timestamp,
    venue: "",
  };
}

async function loadSportDbSchedules({ dateFrom, dateTo, leagueRowsByTeamId, teamRowsById, teams }) {
  const errors = [];
  const fixtures = [];
  const notes = [];
  const schedulesByLeagueSeason = new Map();

  for (const team of teams) {
    const teamRow = teamRowsById.get(String(team.id));
    const sportDbTeamId = getSportDbTeamId(teamRow || {});
    const leagueRows = leagueRowsByTeamId.get(String(team.id)) || [];
    const sportDbLeagueRows = leagueRows.filter((league) => getSportDbLeagueId(league));
    const seasons = getScheduleSeasons(teamRow || {});

    if (!sportDbTeamId) {
      notes.push(`${team.name}: Skipped ${SPORTDB_PROVIDER_NAME}; no SportDB Team ID configured.`);
      continue;
    }

    let leagueLoadedCount = 0;
    let teamLoadedCount = 0;

    try {
      const teamEvents = await loadSportDbTeamUpcoming(sportDbTeamId);
      const matchingTeamEvents = teamEvents
        .filter((event) => isSportDbTeamEvent(event, sportDbTeamId, team))
        .filter((event) => isSportDbEventInRange(event, dateFrom, dateTo));
      teamLoadedCount = matchingTeamEvents.length;
      fixtures.push(...matchingTeamEvents.map((event) => normalizeSportDbMatch(event, team, sportDbTeamId, "team-upcoming")));
    } catch (error) {
      errors.push(`${team.name}: Unable to load ${SPORTDB_PROVIDER_NAME} upcoming team matches: ${error.message}`);
    }

    for (const leagueRow of sportDbLeagueRows) {
      const leagueId = getSportDbLeagueId(leagueRow);

      for (const season of seasons) {
        const cacheKey = `${leagueId}|${season}`;
        let events;

        try {
          if (!schedulesByLeagueSeason.has(cacheKey)) {
            schedulesByLeagueSeason.set(cacheKey, await loadSportDbLeagueSeason(leagueId, season));
          }

          events = schedulesByLeagueSeason.get(cacheKey);
        } catch (error) {
          errors.push(`${team.name}: Unable to load ${SPORTDB_PROVIDER_NAME} league ${leagueId} season ${season}: ${error.message}`);
          continue;
        }

        const matchingEvents = events
          .filter((event) => isSportDbTeamEvent(event, sportDbTeamId, team))
          .filter((event) => isSportDbEventInRange(event, dateFrom, dateTo));
        leagueLoadedCount += matchingEvents.length;
        fixtures.push(...matchingEvents.map((event) => normalizeSportDbMatch(event, team, sportDbTeamId, "league-season")));
      }
    }

    if (sportDbLeagueRows.length === 0) {
      notes.push(`${team.name}: No ${SPORTDB_PROVIDER_NAME} League IDs configured; team-upcoming matches still checked.`);
    }

    notes.push(`${team.name}: Loaded ${teamLoadedCount} ${SPORTDB_PROVIDER_NAME} team-upcoming matches and ${leagueLoadedCount} league-season matches.`);
  }

  return { errors, fixtures, notes };
}

async function loadSportDbTeamUpcoming(teamId) {
  const query = new URLSearchParams({ id: teamId });
  const data = JSON.parse(await loadText(`${SPORTDB_BASE_URL}/eventsnext.php?${query.toString()}`, {
    extension: "json",
  }));

  return Array.isArray(data.events) ? data.events : [];
}

async function loadSportDbLeagueSeason(leagueId, season) {
  const query = new URLSearchParams({ id: leagueId, s: season });
  const data = JSON.parse(await loadText(`${SPORTDB_BASE_URL}/eventsseason.php?${query.toString()}`, {
    extension: "json",
  }));

  return Array.isArray(data.events) ? data.events : [];
}

function normalizeSportDbMatch(event, team, sportDbTeamId, detailSource = "") {
  const homeTeam = event.strHomeTeam || "";
  const awayTeam = event.strAwayTeam || "";
  const isHome = String(event.idHomeTeam || "") === String(sportDbTeamId) ||
    normalizeText(homeTeam) === normalizeText(team.name) ||
    normalizeText(homeTeam) === normalizeText(team.resolvedName);
  const timestamp = getSportDbTimestamp(event);
  const date = timestamp ? timestamp.slice(0, 10) : String(event.dateEvent || "");

  return {
    away: awayTeam,
    awayBadge: "",
    date,
    home: homeTeam,
    homeBadge: "",
    id: event.idEvent ? `${SPORTDB_PROVIDER_NAME}:${event.idEvent}` : "",
    leagueId: String(event.idLeague || ""),
    isHome,
    league: event.strLeague || "",
    opponent: isHome ? awayTeam : homeTeam,
    round: event.intRound ? String(event.intRound) : "",
    season: event.strSeason || "",
    source: SPORTDB_PROVIDER_NAME,
    sources: [SPORTDB_PROVIDER_NAME],
    sourceDetail: detailSource,
    status: normalizeSportDbStatus(event),
    teamBadge: team.badge || "",
    teamId: team.id,
    teamName: team.name,
    time: timestamp ? timestamp.slice(11, 19) : String(event.strTime || ""),
    timestamp: timestamp || date,
    venue: event.strVenue || "",
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
    (
      normalizedHeaders.includes("provider team id") ||
      normalizedHeaders.includes("football-data team id") ||
      normalizedHeaders.includes("sportdb team id")
    ) &&
    !normalizedHeaders.includes("team id");
}

function isLeaguesSection(headers) {
  const normalizedHeaders = headers.map(normalizeText);

  return normalizedHeaders.includes("team id") &&
    (
      normalizedHeaders.includes("provider league id") ||
      normalizedHeaders.includes("provider team id") ||
      normalizedHeaders.includes("football-data league id") ||
      normalizedHeaders.includes("sportdb league id")
    );
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
    "football-data Team ID",
    "Football-Data Team ID",
    "Football Data Team ID",
    "FootballData Team ID",
    "FootballDataTeamID",
  ).trim();

  return explicitId || FALLBACK_FOOTBALL_DATA_TEAM_IDS[normalizeText(getField(team, "Name", "Team"))] || "";
}

function getSportDbTeamId(team) {
  return getField(
    team,
    "SportDB Team ID",
    "TheSportsDB Team ID",
    "SportsDB Team ID",
    "SportDbTeamID",
  ).trim();
}

function getSportDbLeagueId(league) {
  return getField(
    league,
    "SportDB League ID",
    "TheSportsDB League ID",
    "SportsDB League ID",
    "SportDbLeagueID",
  ).trim();
}

function getScheduleSeasons(team) {
  const configuredSeasons = getField(team, "Schedule Seasons", "Schedule Season")
    .split(/[;,]/)
    .map((season) => season.trim())
    .filter(Boolean);

  return configuredSeasons.length > 0 ? configuredSeasons : [getCurrentSeason()];
}

function getCurrentSeason(date = new Date()) {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;

  return month >= 7 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
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

function mergeFixtures(fixtures) {
  const fixtureMap = new Map();

  for (const fixture of fixtures) {
    const key = getFixtureMergeKey(fixture);
    const existingFixture = fixtureMap.get(key);

    if (!existingFixture) {
      fixtureMap.set(key, fixture);
      continue;
    }

    fixtureMap.set(key, mergeFixture(existingFixture, fixture));
  }

  return [...fixtureMap.values()];
}

function getFixtureMergeKey(fixture) {
  return [
    fixture.teamId,
    fixture.date,
    normalizeTeamName(fixture.home),
    normalizeTeamName(fixture.away),
  ].join("|");
}

function mergeFixture(existingFixture, incomingFixture) {
  const primaryFixture = isPrimarySource(existingFixture) ? existingFixture : incomingFixture;
  const secondaryFixture = primaryFixture === existingFixture ? incomingFixture : existingFixture;
  const sources = [...new Set([
    ...(Array.isArray(primaryFixture.sources) ? primaryFixture.sources : [primaryFixture.source].filter(Boolean)),
    ...(Array.isArray(secondaryFixture.sources) ? secondaryFixture.sources : [secondaryFixture.source].filter(Boolean)),
  ])];

  return {
    ...secondaryFixture,
    ...primaryFixture,
    awayBadge: primaryFixture.awayBadge || secondaryFixture.awayBadge || "",
    homeBadge: primaryFixture.homeBadge || secondaryFixture.homeBadge || "",
    league: primaryFixture.league || secondaryFixture.league || "",
    leagueId: primaryFixture.leagueId || secondaryFixture.leagueId || "",
    round: primaryFixture.round || secondaryFixture.round || "",
    season: primaryFixture.season || secondaryFixture.season || "",
    sources,
    source: sources.join(" + "),
    time: primaryFixture.time || secondaryFixture.time || "",
    timestamp: primaryFixture.timestamp || secondaryFixture.timestamp || "",
    venue: primaryFixture.venue || secondaryFixture.venue || "",
  };
}

function isPrimarySource(fixture) {
  return fixture.source === PRIMARY_PROVIDER_NAME || fixture.sources?.includes(PRIMARY_PROVIDER_NAME);
}

function isSportDbTeamEvent(event, sportDbTeamId, team) {
  return String(event.idHomeTeam || "") === String(sportDbTeamId) ||
    String(event.idAwayTeam || "") === String(sportDbTeamId) ||
    normalizeText(event.strHomeTeam) === normalizeText(team.name) ||
    normalizeText(event.strAwayTeam) === normalizeText(team.name) ||
    normalizeText(event.strHomeTeam) === normalizeText(team.resolvedName) ||
    normalizeText(event.strAwayTeam) === normalizeText(team.resolvedName);
}

function isSportDbEventInRange(event, dateFrom, dateTo) {
  const eventDate = String(event.dateEvent || "").slice(0, 10);

  return eventDate >= dateFrom && eventDate <= dateTo && !isPastSportDbStatus(event);
}

function getSportDbTimestamp(event) {
  if (event.strTimestamp) {
    return event.strTimestamp;
  }

  const date = String(event.dateEvent || "").trim();

  if (!date) {
    return "";
  }

  const time = String(event.strTime || "").trim();

  if (!time) {
    return date;
  }

  return `${date}T${time.replace(/\+00:00$/, "")}Z`;
}

function normalizeSportDbStatus(event) {
  const status = getField(event, "strStatus", "strProgress");

  if (isPastSportDbStatus(event)) {
    return status || "FINISHED";
  }

  return status || "SCHEDULED";
}

function isPastSportDbStatus(event) {
  const status = normalizeText(getField(event, "strStatus", "strProgress"));

  return ["match finished", "ft", "finished", "final", "aet", "pen"].includes(status);
}

function normalizeTeamName(value) {
  return normalizeText(value)
    .replace(/\bfc\b/g, "")
    .replace(/\bafc\b/g, "")
    .replace(/\bcf\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function groupBy(items, getKey) {
  const groups = new Map();

  for (const item of items) {
    const key = getKey(item);

    if (!groups.has(key)) {
      groups.set(key, []);
    }

    groups.get(key).push(item);
  }

  return groups;
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
