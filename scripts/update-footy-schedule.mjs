import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_FOOTBALL_TEAMS_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vTQnBDCv-KRIucQp-UsH_yb8MsrskZyuDHOC0ACgDKbmKB8SA3JGWORwr-pPxvkXwEJv5S2dCvcvf2n/pub?gid=1614272244&single=true&output=csv";
const OUTPUT_PATH = path.resolve(process.env.FOOTY_SCHEDULE_OUTPUT_PATH || path.join("data", "footy-schedule.json"));
const PROVIDER_NAME = "TheSportsDB";
const THE_SPORTS_DB_BASE_URL = "https://www.thesportsdb.com/api/v1/json/3";

async function main() {
  const generatedAt = new Date().toISOString();
  const teamRows = await loadCsv(process.env.FOOTBALL_TEAMS_CSV_URL || DEFAULT_FOOTBALL_TEAMS_CSV_URL);
  const activeTeams = teamRows
    .filter((team) => !isFalseValue(getField(team, "IsActive", "Active")))
    .sort((first, second) => comparePriority(first.Priority, second.Priority));
  const teams = [];
  const fixtures = [];
  const errors = [];

  for (const team of activeTeams) {
    const teamRecord = await resolveTeam(team);
    teams.push(teamRecord);

    if (!teamRecord.providerTeamId) {
      errors.push(`Unable to resolve team: ${teamRecord.name}`);
      continue;
    }

    try {
      const events = await loadUpcomingEvents(teamRecord);
      fixtures.push(...events.map((event) => normalizeEvent(event, teamRecord)));
    } catch (error) {
      errors.push(`Unable to load fixtures for ${teamRecord.name}: ${error.message}`);
    }
  }

  fixtures.sort(compareFixtures);

  const payload = {
    generatedAt,
    source: PROVIDER_NAME,
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
  const explicitId = getField(team, "TheSportsDB ID", "TheSportsDBID", "Source ID", "SourceID", "Provider ID", "ProviderID").trim();

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

  if (explicitId) {
    return {
      id: getField(team, "ID"),
      league,
      name,
      priority: getField(team, "Priority"),
      provider: PROVIDER_NAME,
      providerTeamId: explicitId,
      resolvedName: name,
      status: "configured",
    };
  }

  const candidates = await searchTeams(name);
  const selectedTeam = selectBestTeamCandidate(candidates, { league, name });

  return {
    badge: selectedTeam?.strBadge || "",
    id: getField(team, "ID"),
    league,
    name,
    priority: getField(team, "Priority"),
    provider: PROVIDER_NAME,
    providerLeague: selectedTeam?.strLeague || "",
    providerTeamId: selectedTeam?.idTeam || "",
    resolvedName: selectedTeam?.strTeam || "",
    status: selectedTeam ? "resolved" : "unresolved",
  };
}

async function searchTeams(name) {
  const data = await loadJson(`${THE_SPORTS_DB_BASE_URL}/searchteams.php?t=${encodeURIComponent(name)}`);

  return Array.isArray(data.teams) ? data.teams.filter((team) => team.strSport === "Soccer") : [];
}

function selectBestTeamCandidate(candidates, { league, name }) {
  if (candidates.length === 0) {
    return null;
  }

  const normalizedName = normalizeText(name);
  const normalizedLeague = normalizeText(league);

  return [...candidates].sort((first, second) => {
    return scoreTeamCandidate(second, normalizedName, normalizedLeague) -
      scoreTeamCandidate(first, normalizedName, normalizedLeague);
  })[0];
}

function scoreTeamCandidate(team, normalizedName, normalizedLeague) {
  const candidateName = normalizeText(team.strTeam);
  const alternateNames = normalizeText(team.strTeamAlternate);
  const candidateLeague = normalizeText(team.strLeague);
  let score = 0;

  if (candidateName === normalizedName) {
    score += 100;
  }

  if (alternateNames.includes(normalizedName)) {
    score += 30;
  }

  if (normalizedLeague && (candidateLeague.includes(normalizedLeague) || normalizedLeague.includes(candidateLeague))) {
    score += 20;
  }

  return score;
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

async function loadJson(url) {
  const response = await fetch(url, { headers: { "user-agent": "boxthislap-footy-updater" } });

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
