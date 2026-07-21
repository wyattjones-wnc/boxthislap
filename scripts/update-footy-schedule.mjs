import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_FOOTBALL_TEAMS_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTQnBDCv-KRIucQp-UsH_yb8MsrskZyuDHOC0ACgDKbmKB8SA3JGWORwr-pPxvkXwEJv5S2dCvcvf2n/pub?gid=1614272244&single=true&output=csv";
const OUTPUT_PATH = path.resolve(process.env.FOOTY_SCHEDULE_OUTPUT_PATH || path.join("data", "footy-schedule.json"));
const PROVIDER_NAME = "TheSportsDB";
const THE_SPORTS_DB_BASE_URL = "https://www.thesportsdb.com/api/v1/json/3";
const THE_SPORTS_DB_V2_BASE_URL = "https://www.thesportsdb.com/api/v2/json";
const THE_SPORTS_DB_API_KEY = process.env.THE_SPORTS_DB_API_KEY || "";

async function main() {
  const generatedAt = new Date().toISOString();
  const teamRows = await loadCsv(process.env.FOOTBALL_TEAMS_CSV_URL || DEFAULT_FOOTBALL_TEAMS_CSV_URL);
  const activeTeams = teamRows
    .filter((team) => hasTeamIdentity(team) && !isFalseValue(getField(team, "IsActive", "Active")))
    .sort((first, second) => comparePriority(first.Priority, second.Priority));
  const teams = [];
  const fixtures = [];
  const errors = [];
  const coverageNotes = [];

  for (const team of activeTeams) {
    const teamRecord = await resolveTeam(team);
    teams.push(teamRecord);

    if (!teamRecord.providerTeamId) {
      errors.push(`Unable to resolve team: ${teamRecord.name}`);
      continue;
    }

    try {
      const schedule = await loadTeamSchedule(teamRecord);
      coverageNotes.push(...schedule.notes.map((note) => `${teamRecord.name}: ${note}`));
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
      mode: THE_SPORTS_DB_API_KEY ? "full-team-season" : "limited-next-events",
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

async function resolveTeam(team) {
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
  if (THE_SPORTS_DB_API_KEY) {
    const fullSchedule = await loadFullTeamSchedule(team);

    return {
      events: fullSchedule,
      notes: ["Loaded full team season schedule from the v2 API."],
    };
  }

  const nextEvents = await loadUpcomingEvents(team);

  return {
    events: nextEvents,
    notes: [
      "Loaded limited upcoming events from the free v1 API because THE_SPORTS_DB_API_KEY is not configured.",
    ],
  };
}

async function loadFullTeamSchedule(team) {
  const data = await loadJson(
    `${THE_SPORTS_DB_V2_BASE_URL}/schedule/full/team/${encodeURIComponent(team.providerTeamId)}`,
    { "X-API-KEY": THE_SPORTS_DB_API_KEY },
  );
  const eventLists = [data.events, data.event, data.schedule, data.data].filter(Array.isArray);

  return eventLists.flat();
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
    isHome,
    league: event.strLeague || "",
    opponent: isHome ? awayTeam : homeTeam,
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
  const response = await fetch(url, { headers: { "user-agent": "boxthislap-footy-updater" } });

  if (!response.ok) {
    throw new Error(`Failed to load CSV from ${url}: ${response.status}`);
  }

  return parseCsv(await response.text());
}

async function loadJson(url, headers = {}) {
  const response = await fetch(url, { headers: { "user-agent": "boxthislap-footy-updater", ...headers } });

  if (!response.ok) {
    throw new Error(`Failed to load JSON from ${url}: ${response.status}`);
  }

  return response.json();
}

function parseCsv(text) {
  const rows = parseCsvRows(stripBom(text));

  if (rows.length === 0) {
    return [];
  }

  const headers = rows[0].map((header) => header.trim());

  return rows.slice(1).filter((row) => row.some((value) => value.trim())).map((row) => {
    return headers.reduce((record, header, index) => {
      record[header || `Column ${index + 1}`] = row[index] ?? "";
      return record;
    }, {});
  });
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

function hasTeamIdentity(team) {
  return Boolean(getField(team, "Name", "Team").trim() || getField(team, "Provider Team ID", "ProviderTeamID").trim());
}

function normalizeText(value) {
  return String(value ?? "").trim().toLowerCase();
}

function isFalseValue(value) {
  return ["false", "no", "n", "0"].includes(normalizeText(value));
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
