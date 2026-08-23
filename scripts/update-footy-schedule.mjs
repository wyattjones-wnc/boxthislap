import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_FOOTY_WORKBOOK_BASE_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRBd-UqYHhrob90IdNm8CmAmDy0gCfJ8cYTCESL01ph4D9A9kEY62Y78pWc9rjrEQq0lCS3JWc8Nar7/pub";
const DEFAULT_FOOTBALL_TEAMS_CSV_URL = `${DEFAULT_FOOTY_WORKBOOK_BASE_URL}?gid=0&single=true&output=csv`;
const DEFAULT_FOOTY_MATCHES_CSV_URL = `${DEFAULT_FOOTY_WORKBOOK_BASE_URL}?gid=1436836758&single=true&output=csv`;
const DEFAULT_FOOTY_MATCH_NOTES_CSV_URL = `${DEFAULT_FOOTY_WORKBOOK_BASE_URL}?gid=866481448&single=true&output=csv`;
const DEFAULT_FOOTY_MATCH_NOTES_ENDPOINT = "https://box-this-lap-footy-notes.boxthislap.workers.dev/api/match-notes";
const OUTPUT_PATH = path.resolve(process.env.FOOTY_SCHEDULE_OUTPUT_PATH || path.join("data", "footy-schedule.json"));
const FOOTY_MATCH_SEEDS_PATH = path.resolve(process.env.FOOTY_MATCH_SEEDS_PATH || path.join("data", "footy-match-seeds.json"));
const PRIMARY_PROVIDER_NAME = "football-data.org";
const SPORTDB_PROVIDER_NAME = "TheSportsDB";
const ARSENAL_PROVIDER_NAME = "Arsenal.com";
const ICALENDAR_PROVIDER_NAME = "iCalendar";
const FULL_MLS_CALENDAR_URL = "https://raw.githubusercontent.com/jbaranski/majorleaguesoccer-ical/refs/heads/main/calendars/mls.ics";
const SPORTDB_COMPETITION_FALLBACKS = [
  { code: "FACS", id: "4571", key: "community shield", name: "FA Community Shield", seasonType: "calendar", type: "SUPER_CUP" },
  { code: "ELC", id: "4570", key: "efl cup", name: "EFL Cup", seasonType: "split", type: "CUP" },
  { code: "SDE", id: "4511", key: "supercopa de espana", name: "Supercopa de España", seasonType: "split", type: "SUPER_CUP" },
];
const SOURCE_PRIORITY = {
  [PRIMARY_PROVIDER_NAME]: 40,
  [ARSENAL_PROVIDER_NAME]: 30,
  [SPORTDB_PROVIDER_NAME]: 20,
  [ICALENDAR_PROVIDER_NAME]: 10,
};
const FRIENDLY_COMPETITION_IDS = new Set([
  "4nidzmunvpvxk1ir9b6m8mpay",
  "4569",
  "bfbepcvvs13v9didqrb12rh05",
]);
const FRIENDLY_COMPETITION_NAMES = new Set([
  "club friendlies",
  "club friendly",
  "emirates cup",
  "english premier league summer series",
  "friendly",
  "friendlies",
  "trofeo joan gamper",
]);
const FOOTBALL_LEAGUE_POINTS = Object.freeze({
  draw: 1,
  loss: 0,
  win: 3,
});
const FOOTBALL_DATA_API_KEY = process.env.FOOTBALL_DATA_API_KEY || "";
const SHOULD_ALLOW_MISSING_FOOTBALL_DATA_API_KEY = isTrueValue(process.env.FOOTY_ALLOW_MISSING_FOOTBALL_DATA_API_KEY);
const SHOULD_VERIFY_FOOTBALL_DATA_TEAMS = isTrueValue(process.env.FOOTY_VERIFY_FOOTBALL_DATA_TEAMS);
const FOOTBALL_DATA_BASE_URL = "https://api.football-data.org/v4";
const SPORTDB_BASE_URL = process.env.SPORTDB_BASE_URL || "https://www.thesportsdb.com/api/v1/json/3";
const ARSENAL_GRAPHQL_URL = process.env.ARSENAL_GRAPHQL_URL || "https://afc-prd.graph.arsenal.com/graphql";
const API_CACHE_DIR = path.resolve(process.env.FOOTY_API_CACHE_DIR || path.join(".cache", "footy-schedule-api"));
const EXTERNAL_REQUEST_INTERVAL_MS = Number(process.env.FOOTY_API_REQUEST_INTERVAL_MS) || 6500;
const EXTERNAL_REQUEST_RETRY_LIMIT = Number(process.env.FOOTY_API_RETRY_LIMIT) || 3;
const LOOKAHEAD_DAYS = Number(process.env.FOOTY_SCHEDULE_LOOKAHEAD_DAYS) || 365;
const MATCH_STATUS = process.env.FOOTY_SCHEDULE_MATCH_STATUS || "SCHEDULED";
const SHOULD_REFRESH_API_CACHE = isTrueValue(process.env.FOOTY_API_REFRESH);
const SHOULD_USE_API_CACHE = !isFalseValue(process.env.FOOTY_API_CACHE || "true");
const FOOTY_MATCH_SYNC_ENDPOINT = process.env.FOOTY_MATCH_SYNC_ENDPOINT || "";
const FALLBACK_FOOTBALL_DATA_TEAM_IDS = {
  arsenal: "57",
  barcelona: "81",
  wrexham: "404",
};
const FALLBACK_TEAM_BADGES = {
  "charlotte fc": "assets/teams/charlotte-fc.svg",
  "inter miami": "assets/teams/inter-miami-cf.webp",
  "inter miami cf": "assets/teams/inter-miami-cf.webp",
  usmnt: "assets/teams/usmnt.svg",
  uswmt: "assets/teams/uswnt.svg",
  uswnt: "assets/teams/uswnt.svg",
};
const DISPLAY_TEAM_NAMES = {
  uswmt: "USWNT",
};
const FALLBACK_ARSENAL_GRAPHQL_TEAM_IDS = {
  arsenal: "4dsgumo7d4zupm2ugsvm4zm4d",
};
const FALLBACK_ICALENDAR_URLS = {
  arsenal: "webcal://ics.ecal.com/ecal-sub/6a6038dce1c23100024c84fb/Arsenal%20FC.ics",
  barcelona: "webcal://ics.ecal.com/ecal-sub/6a60382d0d8ade00024d911f/FC%20Barcelona.ics",
  "charlotte fc": "https://raw.githubusercontent.com/jbaranski/majorleaguesoccer-ical/refs/heads/main/calendars/charlottefc.ics",
  "inter miami": "https://raw.githubusercontent.com/jbaranski/majorleaguesoccer-ical/refs/heads/main/calendars/intermiamicf.ics",
  "inter miami cf": "https://raw.githubusercontent.com/jbaranski/majorleaguesoccer-ical/refs/heads/main/calendars/intermiamicf.ics",
  wrexham: "webcal://ics.ecal.com/ecal-sub/6a603a2c0d8ade00024d912f/Wrexham%20AFC.ics",
};
const ARSENAL_FIXTURES_QUERY = `query FixturesByIds($date: String = "", $competitions: String = "", $rangeType: String = "", $teamIds: String = "", $timeOffset: Float) {
  fixturesByIds(
    date: $date
    competitions: $competitions
    rangeType: $rangeType
    teamIds: $teamIds
    timeOffset: $timeOffset
  ) {
    matches {
      matchInfo {
        id
        date
        time
        localDate
        localTime
        competition {
          id
          name
          competitionLogo
          __typename
        }
        contestant {
          id
          name
          code
          clubLogo
          __typename
        }
        venue {
          longName
          __typename
        }
        __typename
      }
      liveData {
        matchDetails {
          matchStatus
          scores {
            aggregate {
              home
              away
              __typename
            }
            total {
              home
              away
              __typename
            }
            pen {
              home
              away
              __typename
            }
            et {
              home
              away
              __typename
            }
            ft {
              home
              away
              __typename
            }
            ht {
              home
              away
              __typename
            }
            __typename
          }
          __typename
        }
        __typename
      }
      __typename
    }
    __typename
  }
}`;
let lastExternalRequestAt = 0;

async function main() {
  const generatedAt = new Date().toISOString();
  const previousPayload = await loadPreviousSchedulePayload();
  const footballData = await loadFootballSheet(process.env.FOOTBALL_TEAMS_CSV_URL || DEFAULT_FOOTBALL_TEAMS_CSV_URL);
  const footyMatchRows = await loadFootyMatchesSheet(process.env.FOOTY_MATCHES_CSV_URL || DEFAULT_FOOTY_MATCHES_CSV_URL);
  const footyMatchSeedRows = await loadFootyMatchSeedRows();
  const previousSchedulesByTeamId = getPreviousSchedulesByTeamId(previousPayload?.teamSchedules);
  const activeTeams = footballData.teamRows
    .filter((team) => hasTeamIdentity(team) && !isFalseValue(getField(team, "IsActive", "Active")))
    .sort((first, second) => compareTeamUpdateFreshness(first, second, previousSchedulesByTeamId));

  assertRequiredProviderConfiguration(activeTeams);

  const dateFrom = formatDate(new Date());
  const dateTo = formatDate(addDays(new Date(), LOOKAHEAD_DAYS));
  const teams = [];
  const fixtures = [];
  const errors = [];
  const coverageNotes = [];
  const relevantFootballDataCompetitions = new Map();
  const prioritySets = normalizePrioritySets(footballData.prioritySetRows);
  const teamRowsById = new Map(activeTeams.map((team) => [getField(team, "ID").trim(), team]));
  const leagueRowsByTeamId = groupBy(footballData.leagueRows, (league) => getField(league, "Team ID").trim());

  for (const team of activeTeams) {
    const teamRecord = await resolveTeam(team);
    teamRecord.leagueGames = normalizeLeagueGames(getField(team, "League Games"));
    teamRecord.leagueIds = getTeamLeagueIds(teamRecord, leagueRowsByTeamId.get(String(teamRecord.id || "")) || []);
    teams.push(teamRecord);
    registerFootballDataTeamCompetitions(relevantFootballDataCompetitions, teamRecord);

    if (teamRecord.warning) {
      coverageNotes.push(`${teamRecord.name}: ${teamRecord.warning}`);
    }

    if (!teamRecord.providerTeamId) {
      coverageNotes.push(`${teamRecord.name}: Skipped football-data.org; no provider team ID configured.`);
      continue;
    }

    if (!FOOTBALL_DATA_API_KEY) {
      errors.push(`${teamRecord.name}: Unable to load ${PRIMARY_PROVIDER_NAME} fixtures: missing FOOTBALL_DATA_API_KEY.`);
      continue;
    }

    try {
      const schedule = await loadTeamSchedule(teamRecord, { dateFrom, dateTo });
      registerRelevantFootballDataCompetitions(relevantFootballDataCompetitions, schedule.matches, teamRecord);
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

  const arsenalSchedules = await loadArsenalSchedules({ dateFrom, dateTo, teamRowsById, teams });
  coverageNotes.push(...arsenalSchedules.notes);
  errors.push(...arsenalSchedules.errors);
  fixtures.push(...arsenalSchedules.fixtures);

  const calendarSchedules = await loadCalendarSchedules({ dateFrom, dateTo, teamRowsById, teams });
  coverageNotes.push(...calendarSchedules.notes);
  errors.push(...calendarSchedules.errors);
  fixtures.push(...calendarSchedules.fixtures);

  const knownFootyMatchRows = [...footyMatchSeedRows, ...footyMatchRows];
  const dedupedFixtures = mergeFixtures(fixtures).sort(compareFixtures);
  const matchNotes = await loadFootyMatchNotes();
  const footyMatchRegistry = buildFootyMatchRegistry({
    fixtures: dedupedFixtures,
    generatedAt,
    matchRows: knownFootyMatchRows,
    matchNotes,
    previousSchedules: previousPayload?.teamSchedules,
  });
  const enrichedFixtures = mergeFixtures(applyFootyMatchRegistry(dedupedFixtures, footyMatchRegistry)).sort(compareFixtures);
  registerRelevantFootballDataCompetitionsFromFixtures(relevantFootballDataCompetitions, enrichedFixtures, teams);
  const footballDataCompetitionSchedules = await loadFootballDataCompetitionSchedules(relevantFootballDataCompetitions);
  const sportDbCompetitionFallbackSchedules = await loadSportDbCompetitionFallbackSchedules({
    followedFixtures: enrichedFixtures,
    footballDataSchedules: footballDataCompetitionSchedules,
    teams,
  });
  const loadedCompetitionSchedules = [
    ...applySportDbCompetitionFallbacks(footballDataCompetitionSchedules, sportDbCompetitionFallbackSchedules),
    ...await loadMlsCompetitionSchedules({
      dateFrom,
      dateTo,
      followedFixtures: enrichedFixtures,
      teams,
    }),
  ];
  const competitionSchedules = buildCompetitionSchedules({
    generatedAt,
    loadedSchedules: loadedCompetitionSchedules,
    preserveUnloaded: !FOOTBALL_DATA_API_KEY,
    previousSchedules: previousPayload?.competitionSchedules,
    teams,
    followedFixtures: enrichedFixtures,
  });
  const teamSchedules = stripTeamScheduleMatchNotes(buildTeamSchedules({
    errors,
    fixtures: enrichedFixtures,
    generatedAt,
    notes: coverageNotes,
    previousSchedules: previousPayload?.teamSchedules,
    teams,
  }));
  const footyMatchSync = await syncFootyMatchesToSheet(footyMatchRegistry.rows, { generatedAt });
  const payload = {
    generatedAt,
    schemaVersion: 3,
    source: `${PRIMARY_PROVIDER_NAME} + ${SPORTDB_PROVIDER_NAME} + ${ARSENAL_PROVIDER_NAME} + ${ICALENDAR_PROVIDER_NAME}`,
    updateTracker: buildFileUpdateTracker({ competitionSchedules, generatedAt, teamSchedules }),
    prioritySets,
    footyMatchRegistry: {
      matchCount: footyMatchRegistry.rows.length,
      sync: footyMatchSync,
    },
    competitionSchedules,
    teamSchedules,
  };

  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`Wrote ${payload.updateTracker.fixtureCount} fixtures for ${teamSchedules.length} teams to ${OUTPUT_PATH}`);
}

async function resolveTeam(team) {
  const name = getTeamDisplayName(getField(team, "Name", "Team"));
  const prettyName = getField(team, "Pretty Name", "PrettyName").trim() || name;
  const configuredId = getFootballDataTeamId(team);
  const badge = await resolveTeamBadge(team);
  const sportDbTeamId = getSportDbTeamId(team);

  if (!name) {
    return {
      id: getField(team, "ID"),
      name: "Unnamed team",
      prettyName: prettyName || "Unnamed team",
      priority: getField(team, "Priority"),
      provider: PRIMARY_PROVIDER_NAME,
      providerTeamId: configuredId,
      resolvedName: "",
      status: "missing-name",
    };
  }

  if (!configuredId) {
    return {
      badge,
      id: getField(team, "ID"),
      league: getField(team, "League").trim(),
      name,
      prettyName,
      priority: getField(team, "Priority"),
      provider: PRIMARY_PROVIDER_NAME,
      providerLeague: "",
      providerLeagues: [],
      providerTeamId: "",
      resolvedName: "",
      sportDbTeamId,
      status: "missing-provider-team-id",
    };
  }

  if (!FOOTBALL_DATA_API_KEY) {
    return {
      badge,
      id: getField(team, "ID"),
      league: getField(team, "League").trim(),
      name,
      prettyName,
      priority: getField(team, "Priority"),
      provider: PRIMARY_PROVIDER_NAME,
      providerLeague: "",
      providerLeagues: [],
      providerTeamId: configuredId,
      resolvedName: name,
      sportDbTeamId,
      status: "configured-unverified",
      warning: `Skipped ${PRIMARY_PROVIDER_NAME} team verification; missing FOOTBALL_DATA_API_KEY.`,
    };
  }

  if (!SHOULD_VERIFY_FOOTBALL_DATA_TEAMS) {
    return {
      badge,
      id: getField(team, "ID"),
      league: getField(team, "League").trim(),
      name,
      prettyName,
      priority: getField(team, "Priority"),
      provider: PRIMARY_PROVIDER_NAME,
      providerLeague: getField(team, "League").trim(),
      providerLeagues: [],
      providerTeamId: configuredId,
      resolvedName: name,
      sportDbTeamId,
      status: "configured",
    };
  }

  let providerTeam = null;

  try {
    providerTeam = await loadFootballDataJson(`/teams/${encodeURIComponent(configuredId)}`);
  } catch (error) {
    return {
      badge,
      id: getField(team, "ID"),
      league: getField(team, "League").trim(),
      name,
      prettyName,
      priority: getField(team, "Priority"),
      provider: PRIMARY_PROVIDER_NAME,
      providerLeague: "",
      providerLeagues: [],
      providerTeamId: configuredId,
      resolvedName: name,
      sportDbTeamId,
      status: "configured-unverified",
      warning: `Unable to verify football-data.org team ${configuredId}: ${error.message}`,
    };
  }

  return {
    badge: badge || providerTeam.crest || "",
    id: getField(team, "ID"),
    league: getField(team, "League").trim(),
    name,
    prettyName,
    priority: getField(team, "Priority"),
    provider: PRIMARY_PROVIDER_NAME,
    providerLeague: providerTeam.runningCompetitions?.[0]?.name || "",
    providerLeagues: normalizeRunningCompetitions(providerTeam.runningCompetitions),
    providerTeamId: String(providerTeam.id || configuredId),
    resolvedName: providerTeam.name || name,
    sportDbTeamId,
    status: providerTeam.id ? "configured" : "configured-unverified",
  };
}

async function loadPreviousSchedulePayload() {
  const text = await tryReadFile(OUTPUT_PATH);

  if (!text) {
    return null;
  }

  try {
    const payload = JSON.parse(text);

    return payload && typeof payload === "object" ? payload : null;
  } catch (error) {
    console.warn(`Unable to parse existing footy schedule for preservation: ${error.message}`);
    return null;
  }
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
    priority: team.priority || "",
    round: match.matchday ? String(match.matchday) : "",
    season: match.season?.startDate ? match.season.startDate.slice(0, 4) : "",
    source: PRIMARY_PROVIDER_NAME,
    sourceIds: buildSourceIds(PRIMARY_PROVIDER_NAME, match.id),
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

function registerRelevantFootballDataCompetitions(competitionsByKey, matches = [], team = {}) {
  for (const match of Array.isArray(matches) ? matches : []) {
    const competition = match.competition || {};
    const competitionId = String(competition.id || "").trim();
    const seasonYear = String(match.season?.startDate || "").slice(0, 4);

    if (!competitionId || !seasonYear || isFriendlyCompetition(competitionId, competition.name)) {
      continue;
    }

    const key = `${competitionId}|${seasonYear}`;
    const existing = competitionsByKey.get(key) || {
      code: competition.code || "",
      followedTeamNames: new Set(),
      id: competitionId,
      name: competition.name || "Competition",
      priority: Number.MAX_SAFE_INTEGER,
      season: seasonYear,
      type: competition.type || "",
    };
    const priority = Number.parseInt(String(team.priority || "").trim(), 10);

    if (team.name) {
      existing.followedTeamNames.add(team.name);
    }

    if (Number.isFinite(priority)) {
      existing.priority = Math.min(existing.priority, priority);
    }

    competitionsByKey.set(key, existing);
  }
}

function registerFootballDataTeamCompetitions(competitionsByKey, team = {}) {
  const seasonYear = getCurrentSeason().slice(0, 4);

  for (const competition of Array.isArray(team.providerLeagues) ? team.providerLeagues : []) {
    const competitionId = String(competition.id || "").trim();

    if (!competitionId || isFriendlyCompetition(competitionId, competition.name)) {
      continue;
    }

    const key = `${competitionId}|${seasonYear}`;
    const existing = competitionsByKey.get(key) || {
      code: competition.code || "",
      followedTeamNames: new Set(),
      id: competitionId,
      name: competition.name || "Competition",
      priority: Number.MAX_SAFE_INTEGER,
      season: seasonYear,
      type: competition.type || "",
    };
    const priority = Number.parseInt(String(team.priority || "").trim(), 10);

    if (team.name) {
      existing.followedTeamNames.add(team.name);
    }

    if (Number.isFinite(priority)) {
      existing.priority = Math.min(existing.priority, priority);
    }

    competitionsByKey.set(key, existing);
  }
}

function registerRelevantFootballDataCompetitionsFromFixtures(competitionsByKey, fixtures = [], teams = []) {
  const teamsById = new Map(teams.map((team) => [String(team.id || ""), team]));

  fixtures.forEach((fixture) => {
    const fixtureSources = getSingleFixtureSources(fixture);
    const footballDataId = String(getFixtureSourceIds(fixture)[PRIMARY_PROVIDER_NAME] || "").trim();
    const competitionId = String(fixture.leagueId || "").trim();
    const seasonYear = String(fixture.season || "").slice(0, 4);

    if (!fixtureSources.includes(PRIMARY_PROVIDER_NAME) || !footballDataId || !competitionId || !seasonYear || isFriendlyCompetition(competitionId, fixture.league)) {
      return;
    }

    const team = teamsById.get(String(fixture.teamId || "")) || {};
    const key = `${competitionId}|${seasonYear}`;
    const existing = competitionsByKey.get(key) || {
      code: "",
      followedTeamNames: new Set(),
      id: competitionId,
      name: fixture.league || "Competition",
      priority: Number.MAX_SAFE_INTEGER,
      season: seasonYear,
      type: "",
    };
    const priority = Number.parseInt(String(team.priority || fixture.priority || "").trim(), 10);

    if (team.name || fixture.teamName) {
      existing.followedTeamNames.add(team.name || fixture.teamName);
    }

    if (Number.isFinite(priority)) {
      existing.priority = Math.min(existing.priority, priority);
    }

    competitionsByKey.set(key, existing);
  });
}

async function loadFootballDataCompetitionSchedules(competitionsByKey = new Map()) {
  if (!FOOTBALL_DATA_API_KEY) {
    return [...competitionsByKey.values()].map((competition) => ({
      attemptedAt: new Date().toISOString(),
      competition: {
        code: competition.code || "",
        followedTeamNames: [...competition.followedTeamNames],
        id: competition.id,
        key: getCompetitionScheduleKey(competition.name),
        name: competition.name,
        priority: Number.isFinite(competition.priority) ? competition.priority : null,
        season: competition.season,
        source: PRIMARY_PROVIDER_NAME,
        type: competition.type || "",
      },
      errors: [`Unable to load the full ${competition.name} schedule: missing FOOTBALL_DATA_API_KEY.`],
      fixtures: [],
      notes: [],
    }));
  }

  const schedules = [];

  for (const competition of competitionsByKey.values()) {
    const followedTeamNames = [...competition.followedTeamNames];

    try {
      const query = new URLSearchParams({ season: competition.season });
      const data = await loadFootballDataJson(`/competitions/${encodeURIComponent(competition.id)}/matches?${query.toString()}`);
      const matches = Array.isArray(data.matches) ? data.matches : [];
      const responseCompetition = data.competition || {};

      schedules.push({
        attemptedAt: new Date().toISOString(),
        competition: {
          code: responseCompetition.code || competition.code || "",
          followedTeamNames,
          id: String(responseCompetition.id || competition.id),
          key: getCompetitionScheduleKey(responseCompetition.name || competition.name),
          name: responseCompetition.name || competition.name,
          priority: Number.isFinite(competition.priority) ? competition.priority : null,
          season: competition.season,
          source: PRIMARY_PROVIDER_NAME,
          type: responseCompetition.type || competition.type || "",
        },
        errors: getFootballDataErrorMessages(data),
        fixtures: matches.map((match) => normalizeFootballDataCompetitionMatch(match)),
        notes: [`Loaded the full ${responseCompetition.name || competition.name} ${competition.season} schedule (${matches.length} matches).`],
      });
    } catch (error) {
      schedules.push({
        attemptedAt: new Date().toISOString(),
        competition: {
          code: competition.code || "",
          followedTeamNames,
          id: competition.id,
          key: getCompetitionScheduleKey(competition.name),
          name: competition.name,
          priority: Number.isFinite(competition.priority) ? competition.priority : null,
          season: competition.season,
          source: PRIMARY_PROVIDER_NAME,
          type: competition.type || "",
        },
        errors: [error.message],
        fixtures: [],
        notes: [],
      });
    }
  }

  return schedules;
}

function normalizeFootballDataCompetitionMatch(match) {
  const timestamp = match.utcDate || "";

  return {
    away: match.awayTeam?.name || "",
    awayBadge: match.awayTeam?.crest || "",
    date: timestamp.slice(0, 10),
    home: match.homeTeam?.name || "",
    homeBadge: match.homeTeam?.crest || "",
    id: String(match.id || ""),
    isCompetitionFixture: true,
    leagueId: String(match.competition?.id || ""),
    league: match.competition?.name || "",
    round: match.matchday ? String(match.matchday) : match.stage || "",
    season: match.season?.startDate ? match.season.startDate.slice(0, 4) : "",
    source: PRIMARY_PROVIDER_NAME,
    sourceIds: buildSourceIds(PRIMARY_PROVIDER_NAME, match.id),
    sources: [PRIMARY_PROVIDER_NAME],
    status: match.status || "",
    time: timestamp.slice(11, 19),
    timestamp,
    venue: match.venue || "",
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

async function loadSportDbTeamDetails(teamId) {
  const query = new URLSearchParams({ id: teamId });
  const data = JSON.parse(await loadText(`${SPORTDB_BASE_URL}/lookupteam.php?${query.toString()}`, {
    extension: "json",
  }));

  return Array.isArray(data.teams) ? data.teams[0] || null : null;
}

async function loadSportDbLeagueSeason(leagueId, season) {
  const query = new URLSearchParams({ id: leagueId, s: season });
  const data = JSON.parse(await loadText(`${SPORTDB_BASE_URL}/eventsseason.php?${query.toString()}`, {
    extension: "json",
  }));

  return Array.isArray(data.events) ? data.events : [];
}

async function loadSportDbCompetitionFallbackSchedules({ followedFixtures = [], footballDataSchedules = [], teams = [] } = {}) {
  const relevantKeys = new Set([
    ...followedFixtures
      .filter((fixture) => !isFriendlyCompetition(fixture.leagueId, fixture.league))
      .map((fixture) => getCompetitionScheduleKey(fixture.league)),
    ...footballDataSchedules.map((schedule) => getCompetitionScheduleKey(schedule?.competition?.name)),
  ].filter(Boolean));
  const teamPriority = Math.min(...teams.map((team) => Number.parseInt(String(team.priority || "").trim(), 10)).filter(Number.isFinite));
  const schedules = [];

  for (const competition of SPORTDB_COMPETITION_FALLBACKS.filter((record) => relevantKeys.has(record.key))) {
    const season = competition.seasonType === "calendar" ? String(new Date().getUTCFullYear()) : getCurrentSeason();

    try {
      const events = await loadSportDbLeagueSeason(competition.id, season);
      const fixtures = events.map((event) => normalizeSportDbCompetitionMatch(event));

      schedules.push({
        attemptedAt: new Date().toISOString(),
        competition: {
          code: competition.code,
          followedTeamNames: teams
            .filter((team) => followedFixtures.some((fixture) => (
              getCompetitionScheduleKey(fixture.league) === competition.key && String(fixture.teamId || "") === String(team.id || "")
            )))
            .map((team) => team.name),
          id: competition.id,
          key: competition.key,
          name: competition.name,
          priority: Number.isFinite(teamPriority) ? teamPriority : null,
          season: season.slice(0, 4),
          source: SPORTDB_PROVIDER_NAME,
          type: competition.type,
        },
        errors: fixtures.length > 0 ? [] : [`${SPORTDB_PROVIDER_NAME} returned no ${competition.name} fixtures for ${season}.`],
        fixtures,
        notes: fixtures.length > 0 ? [`Loaded all ${fixtures.length} currently published ${competition.name} matches from ${SPORTDB_PROVIDER_NAME}.`] : [],
      });
    } catch (error) {
      schedules.push({
        attemptedAt: new Date().toISOString(),
        competition: {
          code: competition.code,
          followedTeamNames: [],
          id: competition.id,
          key: competition.key,
          name: competition.name,
          priority: Number.isFinite(teamPriority) ? teamPriority : null,
          season: season.slice(0, 4),
          source: SPORTDB_PROVIDER_NAME,
          type: competition.type,
        },
        errors: [error.message],
        fixtures: [],
        notes: [],
      });
    }
  }

  return schedules;
}

function normalizeSportDbCompetitionMatch(event = {}) {
  const fixture = normalizeSportDbMatch(event, {}, "league-season-full");
  const { isHome, opponent, priority, teamBadge, teamId, teamName, ...competitionFixture } = fixture;

  return {
    ...competitionFixture,
    isCompetitionFixture: true,
  };
}

function applySportDbCompetitionFallbacks(footballDataSchedules = [], fallbackSchedules = []) {
  const fallbacksByKey = new Map(
    fallbackSchedules
      .filter((schedule) => Array.isArray(schedule.fixtures) && schedule.fixtures.length > 0)
      .map((schedule) => [getCompetitionScheduleKey(schedule.competition?.name), schedule])
  );
  const mergedSchedules = footballDataSchedules.map((schedule) => {
    const key = getCompetitionScheduleKey(schedule?.competition?.name);
    const fallback = fallbacksByKey.get(key);

    if (!fallback || schedule.fixtures?.length) {
      return schedule;
    }

    fallbacksByKey.delete(key);
    return fallback;
  });

  return [...mergedSchedules, ...fallbacksByKey.values()];
}

async function loadArsenalSchedules({ dateFrom, dateTo, teamRowsById, teams }) {
  const errors = [];
  const fixtures = [];
  const notes = [];
  const monthStarts = getMonthStarts(dateFrom, dateTo);

  for (const team of teams) {
    const teamRow = teamRowsById.get(String(team.id));
    const arsenalTeamId = getArsenalGraphQlTeamId(teamRow || {});

    if (!arsenalTeamId) {
      continue;
    }

    let loadedCount = 0;

    for (const monthStart of monthStarts) {
      try {
        const matches = await loadArsenalMonthFixtures(arsenalTeamId, monthStart);
        const matchingMatches = matches
          .filter((match) => isArsenalTeamMatch(match, arsenalTeamId, team))
          .filter((match) => isArsenalMatchInRange(match, dateFrom, dateTo));
        loadedCount += matchingMatches.length;
        fixtures.push(...matchingMatches.map((match) => normalizeArsenalMatch(match, team, arsenalTeamId)));
      } catch (error) {
        errors.push(`${team.name}: Unable to load ${ARSENAL_PROVIDER_NAME} fixtures for ${monthStart}: ${error.message}`);
      }
    }

    notes.push(`${team.name}: Loaded ${loadedCount} ${ARSENAL_PROVIDER_NAME} fixtures from monthly GraphQL windows.`);
  }

  return { errors, fixtures, notes };
}

async function loadArsenalMonthFixtures(teamId, monthStart) {
  const body = JSON.stringify({
    operationName: "FixturesByIds",
    variables: {
      competitions: "all",
      date: monthStart,
      rangeType: "month",
      teamIds: teamId,
      timeOffset: 240,
    },
    query: ARSENAL_FIXTURES_QUERY,
  });
  const data = JSON.parse(await loadText(ARSENAL_GRAPHQL_URL, {
    body,
    extension: "json",
    headers: {
      "Accept": "*/*",
      "Content-Type": "application/json",
      "x-arsenal-app-version": "2.7.87",
      "x-arsenal-operation-name": "FixturesByIds",
      "x-arsenal-request-source": "Arsenal-Web",
    },
    method: "POST",
  }));

  return Array.isArray(data.data?.fixturesByIds?.matches) ? data.data.fixturesByIds.matches : [];
}

async function loadCalendarSchedules({ dateFrom, dateTo, teamRowsById, teams }) {
  const errors = [];
  const fixtures = [];
  const notes = [];

  for (const team of teams) {
    const teamRow = teamRowsById.get(String(team.id));
    const calendarUrl = getCalendarUrl(teamRow || {});

    if (!calendarUrl) {
      continue;
    }

    try {
      const scheduleDateFrom = getTeamScheduleStartDate(teamRow || {}, dateFrom);
      const events = parseICalendarEvents(await loadText(normalizeCalendarUrl(calendarUrl), { extension: "ics" }));
      const matchEvents = events
        .filter((event) => isCalendarMatchEvent(event, team))
        .filter((event) => isCalendarEventInRange(event, scheduleDateFrom, dateTo));
      fixtures.push(...matchEvents.map((event) => normalizeCalendarMatch(event, team)));
      notes.push(`${team.name}: Loaded ${matchEvents.length} ${ICALENDAR_PROVIDER_NAME} fixtures from ${scheduleDateFrom} through ${dateTo}.`);
    } catch (error) {
      errors.push(`${team.name}: Unable to load ${ICALENDAR_PROVIDER_NAME} fixtures: ${error.message}`);
    }
  }

  return { errors, fixtures, notes };
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
    priority: team.priority || "",
    round: event.intRound ? String(event.intRound) : "",
    season: event.strSeason || "",
    source: SPORTDB_PROVIDER_NAME,
    sourceIds: buildSourceIds(SPORTDB_PROVIDER_NAME, event.idEvent),
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

function normalizeArsenalMatch(match, team, arsenalTeamId) {
  const matchInfo = match.matchInfo || {};
  const contestants = Array.isArray(matchInfo.contestant) ? matchInfo.contestant : [];
  const homeTeam = contestants[0]?.name || "";
  const awayTeam = contestants[1]?.name || "";
  const isHome = String(contestants[0]?.id || "") === String(arsenalTeamId) ||
    normalizeText(homeTeam) === normalizeText(team.name) ||
    normalizeText(homeTeam) === normalizeText(team.resolvedName);
  const timestamp = getArsenalTimestamp(matchInfo);
  const status = match.liveData?.matchDetails?.matchStatus || "";

  return {
    away: awayTeam,
    awayBadge: "",
    date: timestamp.slice(0, 10) || String(matchInfo.localDate || matchInfo.date || "").slice(0, 10),
    home: homeTeam,
    homeBadge: "",
    id: matchInfo.id ? `${ARSENAL_PROVIDER_NAME}:${matchInfo.id}` : "",
    leagueId: String(matchInfo.competition?.id || ""),
    isHome,
    league: matchInfo.competition?.name || "",
    opponent: isHome ? awayTeam : homeTeam,
    priority: team.priority || "",
    round: "",
    season: "",
    source: ARSENAL_PROVIDER_NAME,
    sourceIds: buildSourceIds(ARSENAL_PROVIDER_NAME, matchInfo.id),
    sources: [ARSENAL_PROVIDER_NAME],
    sourceDetail: "monthly-graphql",
    status: status || "Fixture",
    teamBadge: team.badge || "",
    teamId: team.id,
    teamName: team.name,
    time: timestamp.slice(11, 19),
    timestamp,
    venue: matchInfo.venue?.longName || "",
  };
}

function normalizeCalendarMatch(event, team) {
  const parsedSummary = parseCalendarMatchSummary(event.SUMMARY || "", team);
  const timestamp = getCalendarTimestamp(event.DTSTART || "");
  const isTimeTbc = /\btime\s+tbc\b/i.test(event.SUMMARY || "");

  return {
    away: parsedSummary.away,
    awayBadge: "",
    date: timestamp.slice(0, 10),
    home: parsedSummary.home,
    homeBadge: "",
    id: event.UID ? `${ICALENDAR_PROVIDER_NAME}:${event.UID}` : "",
    leagueId: "",
    isHome: parsedSummary.isHome,
    league: parsedSummary.league || getCalendarLeague(event.DESCRIPTION || ""),
    opponent: parsedSummary.isHome ? parsedSummary.away : parsedSummary.home,
    priority: team.priority || "",
    round: "",
    season: "",
    source: ICALENDAR_PROVIDER_NAME,
    sourceIds: buildSourceIds(ICALENDAR_PROVIDER_NAME, event.UID),
    sources: [ICALENDAR_PROVIDER_NAME],
    sourceDetail: "calendar-feed",
    status: isTimeTbc ? "Time TBC" : "Scheduled",
    teamBadge: team.badge || "",
    teamId: team.id,
    teamName: team.name,
    time: isTimeTbc ? "" : timestamp.slice(11, 19),
    timestamp,
    venue: event.LOCATION || "",
  };
}

async function loadMlsCompetitionSchedules({ dateFrom, dateTo, followedFixtures = [], teams = [] }) {
  const mlsTeams = teams.filter((team) => getCompetitionScheduleKey(team.league) === "mls");

  if (mlsTeams.length === 0) {
    return [];
  }

  const mlsTeamIds = new Set(mlsTeams.map((team) => String(team.id || "")));
  const relevantCompetitions = new Map();

  followedFixtures
    .filter((fixture) => mlsTeamIds.has(String(fixture.teamId || "")))
    .filter((fixture) => !isFriendlyCompetition(fixture.leagueId, fixture.league))
    .forEach((fixture) => {
      const key = getCompetitionScheduleKey(fixture.league);

      if (!key) {
        return;
      }

      const existing = relevantCompetitions.get(key) || {
        followedTeamNames: new Set(),
        name: getCompetitionScheduleDisplayName(fixture.league),
        priority: Number.MAX_SAFE_INTEGER,
      };
      const priority = Number.parseInt(String(fixture.priority || "").trim(), 10);

      if (fixture.teamName) {
        existing.followedTeamNames.add(fixture.teamName);
      }

      if (Number.isFinite(priority)) {
        existing.priority = Math.min(existing.priority, priority);
      }

      relevantCompetitions.set(key, existing);
    });

  if (relevantCompetitions.size === 0) {
    return [];
  }

  try {
    const calendarText = await loadText(FULL_MLS_CALENDAR_URL, { extension: "ics" });
    const seasonDateFrom = `${String(dateFrom || "").slice(0, 4)}-01-01`;
    const fixturesByCompetition = new Map();

    parseICalendarEvents(calendarText)
      .filter((event) => isCalendarEventInRange(event, seasonDateFrom, dateTo))
      .map(normalizeFullCalendarMatch)
      .forEach((fixture) => {
        const key = getCompetitionScheduleKey(fixture.league);

        if (!key || !relevantCompetitions.has(key)) {
          return;
        }

        if (!fixturesByCompetition.has(key)) {
          fixturesByCompetition.set(key, []);
        }

        fixturesByCompetition.get(key).push(fixture);
      });

    return [...relevantCompetitions.entries()].map(([key, competition]) => {
      const fixtures = mergeFixtures(fixturesByCompetition.get(key) || []).sort(compareFixtures);

      return {
        attemptedAt: new Date().toISOString(),
        competition: {
          code: key === "mls" ? "MLS" : "",
          followedTeamNames: [...competition.followedTeamNames],
          id: key,
          key,
          name: competition.name,
          priority: Number.isFinite(competition.priority) ? competition.priority : null,
          season: String(dateFrom || "").slice(0, 4),
          source: ICALENDAR_PROVIDER_NAME,
          type: key === "mls" ? "LEAGUE" : "CUP",
        },
        errors: fixtures.length > 0 ? [] : [`The league-wide MLS calendar returned no ${competition.name} fixtures.`],
        fixtures,
        notes: fixtures.length > 0 ? [`Loaded the full available ${competition.name} schedule (${fixtures.length} matches).`] : [],
      };
    });
  } catch (error) {
    return [...relevantCompetitions.entries()].map(([key, competition]) => ({
      attemptedAt: new Date().toISOString(),
      competition: {
        code: key === "mls" ? "MLS" : "",
        followedTeamNames: [...competition.followedTeamNames],
        id: key,
        key,
        name: competition.name,
        priority: Number.isFinite(competition.priority) ? competition.priority : null,
        season: String(dateFrom || "").slice(0, 4),
        source: ICALENDAR_PROVIDER_NAME,
        type: key === "mls" ? "LEAGUE" : "CUP",
      },
      errors: [error.message],
      fixtures: [],
      notes: [],
    }));
  }
}

function normalizeFullCalendarMatch(event) {
  const parsedSummary = parseFullCalendarMatchSummary(event.SUMMARY || "");
  const timestamp = getCalendarTimestamp(event.DTSTART || "");
  const isTimeTbc = /\btime\s+tbc\b/i.test(event.SUMMARY || "");

  return {
    away: parsedSummary.away,
    awayBadge: "",
    date: timestamp.slice(0, 10),
    home: parsedSummary.home,
    homeBadge: "",
    id: event.UID ? `${ICALENDAR_PROVIDER_NAME}:${event.UID}` : "",
    isCompetitionFixture: true,
    leagueId: "",
    league: parsedSummary.league || getCalendarLeague(event.DESCRIPTION || ""),
    round: "",
    season: timestamp.slice(0, 4),
    source: ICALENDAR_PROVIDER_NAME,
    sourceIds: buildSourceIds(ICALENDAR_PROVIDER_NAME, event.UID),
    sources: [ICALENDAR_PROVIDER_NAME],
    sourceDetail: "league-calendar-feed",
    status: isTimeTbc ? "Time TBC" : "Scheduled",
    time: isTimeTbc ? "" : timestamp.slice(11, 19),
    timestamp,
    venue: event.LOCATION || "",
  };
}

async function loadFootballSheet(url) {
  const rows = parseCsvRows(stripBom(await loadText(url, { extension: "csv" })));
  const sections = splitCsvSections(rows);
  const teamRows = [];
  const leagueRows = [];
  const prioritySetRows = [];

  for (const section of sections) {
    const records = recordsFromCsvSection(section);

    if (isTeamsSection(section.headers)) {
      teamRows.push(...records);
      continue;
    }

    if (isLeaguesSection(section.headers)) {
      leagueRows.push(...records);
      continue;
    }

    if (isPrioritySetsSection(section.headers)) {
      prioritySetRows.push(...records);
    }
  }

  return { leagueRows, prioritySetRows, teamRows };
}

async function loadFootyMatchesSheet(url) {
  const section = await loadCsvTableSection(url, isFootyMatchesSection);

  return section ? recordsFromCsvSection(section) : [];
}

async function loadFootyMatchSeedRows() {
  const text = await tryReadFile(FOOTY_MATCH_SEEDS_PATH);

  if (!text) {
    return [];
  }

  try {
    const rows = JSON.parse(text);

    return Array.isArray(rows) ? rows : [];
  } catch (error) {
    console.warn(`Unable to parse footy match seed rows: ${error.message}`);
    return [];
  }
}

async function loadFootyMatchNotesSheet(url) {
  const section = await loadCsvTableSection(url, isFootyMatchNotesSection);
  const notesByMatchId = new Map();

  if (!section) {
    return notesByMatchId;
  }

  for (const row of recordsFromCsvSection(section)) {
    const matchId = normalizeFootyMatchId(getField(row, "Match ID"));

    if (!matchId) {
      continue;
    }

    notesByMatchId.set(matchId, {
      awayScore: getField(row, "Away Score").trim(),
      followGoalAssists: parseGoalAssistEvents(getField(row, "Follow G/A")),
      highlightLink: getField(row, "Highlight Link").trim(),
      homeScore: getField(row, "Home Score").trim(),
      note: getField(row, "Note").trim(),
      opponentGoalAssists: parseGoalAssistEvents(getField(row, "Opp G/A", "Column 7")),
    });
  }

  return notesByMatchId;
}

async function loadFootyMatchNotes() {
  const endpoint = process.env.FOOTY_MATCH_NOTES_ENDPOINT || DEFAULT_FOOTY_MATCH_NOTES_ENDPOINT;

  if (endpoint) {
    try {
      return await loadFootyMatchNotesEndpoint(endpoint);
    } catch (error) {
      console.warn(`Unable to load Footy match notes from Cloudflare: ${error.message}`);
    }
  }

  try {
    return await loadFootyMatchNotesSheet(process.env.FOOTY_MATCH_NOTES_CSV_URL || DEFAULT_FOOTY_MATCH_NOTES_CSV_URL);
  } catch (error) {
    console.warn(`Unable to load Footy match notes from the legacy sheet: ${error.message}`);
    return new Map();
  }
}

async function loadFootyMatchNotesEndpoint(endpoint) {
  const data = JSON.parse(await loadText(endpoint, { extension: "json" }));
  const notesByMatchId = new Map();

  if (!data.ok || !Array.isArray(data.notes)) {
    throw new Error(data.error || "Footy match notes endpoint returned no notes.");
  }

  data.notes.forEach((note) => {
    const matchId = normalizeFootyMatchId(note.matchId || note["Match ID"]);

    if (!matchId) {
      return;
    }

    notesByMatchId.set(matchId, {
      awayScore: String(note.awayScore ?? note["Away Score"] ?? "").trim(),
      followGoalAssists: normalizeGoalAssistEvents(note.followGoalAssists ?? note["Follow G/A"]),
      highlightLink: String(note.highlightLink ?? note["Highlight Link"] ?? "").trim(),
      homeScore: String(note.homeScore ?? note["Home Score"] ?? "").trim(),
      note: String(note.note ?? note.Note ?? "").trim(),
      opponentGoalAssists: normalizeGoalAssistEvents(note.opponentGoalAssists ?? note["Opp G/A"]),
    });
  });

  return notesByMatchId;
}

async function loadCsvTableSection(url, isTargetSection) {
  const rows = parseCsvRows(stripBom(await loadText(url, { extension: "csv" })));
  const sections = splitCsvSections(rows);

  return sections.find((section) => isTargetSection(section.headers)) || null;
}

function isFootyMatchesSection(headers) {
  const normalizedHeaders = headers.map(normalizeText);

  return normalizedHeaders.includes("match id") &&
    normalizedHeaders.includes("followed team") &&
    normalizedHeaders.includes("source ids") &&
    normalizedHeaders.includes("last seen");
}

function isFootyMatchNotesSection(headers) {
  const normalizedHeaders = headers.map(normalizeText);

  return normalizedHeaders.includes("match id") &&
    normalizedHeaders.includes("home score") &&
    normalizedHeaders.includes("away score") &&
    normalizedHeaders.includes("highlight link");
}

function parseGoalAssistEvents(value) {
  const text = String(value || "").trim();

  if (!text) {
    return [];
  }

  try {
    const parsed = JSON.parse(text);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map((event) => ({
      assister: String(event?.assister || "").trim(),
      minute: Number(event?.minute) || "",
      penalty: Boolean(event?.penalty),
      scorer: String(event?.scorer || "").trim(),
    })).filter((event) => event.scorer || event.assister || event.minute || event.penalty);
  } catch {
    return [];
  }
}

function normalizeGoalAssistEvents(value) {
  if (!Array.isArray(value)) {
    return parseGoalAssistEvents(value);
  }

  return value.map((event) => ({
    assister: String(event?.assister || "").trim(),
    minute: Number(event?.minute) || "",
    penalty: Boolean(event?.penalty),
    scorer: String(event?.scorer || "").trim(),
  })).filter((event) => event.scorer || event.assister || event.minute || event.penalty);
}

async function loadFootballDataJson(endpoint) {
  return JSON.parse(await loadText(`${FOOTBALL_DATA_BASE_URL}${endpoint}`, {
    extension: "json",
    headers: { "X-Auth-Token": FOOTBALL_DATA_API_KEY },
  }));
}

async function loadText(url, { body = "", extension, headers = {}, method = "GET" }) {
  const cachePath = getApiCachePath(url, extension, { body, method });

  if (SHOULD_USE_API_CACHE && !SHOULD_REFRESH_API_CACHE) {
    const cachedText = await tryReadFile(cachePath);

    if (cachedText !== null) {
      return cachedText;
    }
  }

  let response;
  let text = "";

  for (let attempt = 0; attempt <= EXTERNAL_REQUEST_RETRY_LIMIT; attempt += 1) {
    await waitForExternalRequestSlot();
    response = await fetch(url, {
      body: body || undefined,
      headers: { "user-agent": "boxthislap-footy-updater", ...headers },
      method,
    });
    text = await response.text();

    if (response.ok) {
      break;
    }

    if (response.status !== 429 || attempt >= EXTERNAL_REQUEST_RETRY_LIMIT) {
      throw new Error(`Failed to load ${url}: ${response.status} ${getErrorMessageFromText(text)}`);
    }

    const retryMs = getRateLimitRetryMs(response, text);
    console.warn(`Rate limited loading ${url}; retrying in ${Math.round(retryMs / 1000)} seconds.`);
    await sleep(retryMs);
  }

  if (SHOULD_USE_API_CACHE) {
    await writeApiCacheFile(cachePath, url, text);
  }

  return text;
}

function getRateLimitRetryMs(response, text) {
  const retryAfter = Number(response.headers.get("retry-after"));

  if (Number.isFinite(retryAfter) && retryAfter > 0) {
    return (retryAfter + 1) * 1000;
  }

  const waitMatch = String(text || "").match(/wait\s+(\d+)\s+seconds?/i);
  const waitSeconds = waitMatch ? Number(waitMatch[1]) : 0;

  return (Number.isFinite(waitSeconds) && waitSeconds > 0 ? waitSeconds + 1 : 20) * 1000;
}

async function waitForExternalRequestSlot() {
  if (!EXTERNAL_REQUEST_INTERVAL_MS) {
    return;
  }

  const now = Date.now();
  const waitMs = Math.max(0, lastExternalRequestAt + EXTERNAL_REQUEST_INTERVAL_MS - now);

  if (waitMs > 0) {
    await sleep(waitMs);
  }

  lastExternalRequestAt = Date.now();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

function getApiCachePath(url, extension, options = {}) {
  const parsedUrl = new URL(url);
  const readableName = [
    parsedUrl.hostname.replace(/^www\./, ""),
    ...parsedUrl.pathname.split("/").filter(Boolean).slice(-2),
  ].join("-");
  const safeName = readableName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const cacheIdentity = (!options.body && (!options.method || options.method === "GET"))
    ? url
    : [options.method || "GET", url, options.body || ""].join("\n");
  const hash = createHash("sha256").update(cacheIdentity).digest("hex").slice(0, 12);

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
      normalizedHeaders.includes("sportdb team id") ||
      normalizedHeaders.includes("calendar url") ||
      normalizedHeaders.includes("ics url") ||
      normalizedHeaders.includes("webcal url")
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

function isPrioritySetsSection(headers) {
  const normalizedHeaders = headers.map(normalizeText);
  const nonEmptyHeaders = normalizedHeaders.filter(Boolean);

  return normalizedHeaders.includes("priority") &&
    (normalizedHeaders.includes("sets") || normalizedHeaders.includes("set")) &&
    nonEmptyHeaders.length <= 3;
}

function normalizePrioritySets(rows = []) {
  const setMap = new Map();

  for (const row of rows) {
    const priority = getField(row, "Priority").trim();
    const sets = getField(row, "Sets", "Set")
      .split(/[;,]/)
      .map((set) => set.trim())
      .filter(Boolean);

    if (!priority || sets.length === 0) {
      continue;
    }

    for (const set of sets) {
      if (!setMap.has(set)) {
        setMap.set(set, []);
      }

      setMap.get(set).push(priority);
    }
  }

  return [...setMap.entries()].map(([set, priorities]) => ({
    set,
    priorities: [...new Set(priorities)].sort(comparePriority),
  })).sort((first, second) => comparePriority(first.set, second.set));
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

function getTeamDisplayName(teamName) {
  const rawName = String(teamName || "").trim();

  return DISPLAY_TEAM_NAMES[normalizeText(rawName)] || rawName;
}

function getTeamBadge(team) {
  const explicitBadge = getField(
    team,
    "Badge",
    "Badge URL",
    "Badge Path",
    "Logo",
    "Logo URL",
    "Logo Path",
  ).trim();

  return explicitBadge || FALLBACK_TEAM_BADGES[normalizeText(getField(team, "Name", "Team"))] || "";
}

async function resolveTeamBadge(team) {
  const configuredBadge = getTeamBadge(team);

  if (configuredBadge) {
    return configuredBadge;
  }

  const sportDbTeamId = getSportDbTeamId(team);

  if (!sportDbTeamId) {
    return "";
  }

  try {
    const sportDbTeam = await loadSportDbTeamDetails(sportDbTeamId);

    return String(sportDbTeam?.strBadge || sportDbTeam?.strLogo || "").trim();
  } catch {
    return "";
  }
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

function getArsenalGraphQlTeamId(team) {
  const explicitId = getField(
    team,
    "Arsenal GraphQL Team ID",
    "Arsenal GraphQl Team ID",
    "Arsenal Team ID",
    "ArsenalTeamID",
  ).trim();

  return explicitId || FALLBACK_ARSENAL_GRAPHQL_TEAM_IDS[normalizeText(getField(team, "Name", "Team"))] || "";
}

function getCalendarUrl(team) {
  const explicitUrl = getField(
    team,
    "Calendar URL",
    "Calendar Feed URL",
    "ICS URL",
    "iCal URL",
    "iCalendar URL",
    "Webcal URL",
  ).trim();

  return explicitUrl || FALLBACK_ICALENDAR_URLS[normalizeText(getField(team, "Name", "Team"))] || "";
}

function getScheduleSeasons(team) {
  const configuredSeasons = getField(team, "Schedule Seasons", "Schedule Season")
    .split(/[;,]/)
    .map((season) => season.trim())
    .filter(Boolean);

  return configuredSeasons.length > 0 ? configuredSeasons : [getCurrentSeason()];
}

function getTeamScheduleStartDate(team, fallbackDate) {
  const fallbackYear = String(fallbackDate || "").slice(0, 4);
  const league = normalizeText(getField(team, "League", "Competition"));

  if (["international", "major league soccer", "mls"].includes(league) && /^\d{4}$/.test(fallbackYear)) {
    return `${fallbackYear}-01-01`;
  }

  const seasonStartDates = getScheduleSeasons(team)
    .map(getSeasonStartDate)
    .filter(Boolean)
    .sort();
  const activeSeasonStart = seasonStartDates
    .filter((startDate) => startDate <= fallbackDate)
    .at(-1);

  return activeSeasonStart || fallbackDate;
}

function getSeasonStartDate(season) {
  const normalizedSeason = String(season || "").trim();
  const calendarYearMatch = normalizedSeason.match(/^(\d{4})$/);

  if (calendarYearMatch) {
    return `${calendarYearMatch[1]}-01-01`;
  }

  const splitSeasonMatch = normalizedSeason.match(/^(\d{4})\s*[-/]\s*\d{2,4}$/);
  return splitSeasonMatch ? `${splitSeasonMatch[1]}-07-01` : "";
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
    type: competition.type || "",
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
  const mergedFixtures = [];

  for (const fixture of fixtures) {
    const existingIndex = mergedFixtures.findIndex((existingFixture) => areSameFixture(existingFixture, fixture));

    if (existingIndex === -1) {
      mergedFixtures.push(fixture);
      continue;
    }

    mergedFixtures[existingIndex] = mergeFixture(mergedFixtures[existingIndex], fixture);
  }

  return mergedFixtures;
}

function areSameFixture(firstFixture = {}, secondFixture = {}) {
  const firstMatchId = normalizeFootyMatchId(firstFixture.matchId);
  const secondMatchId = normalizeFootyMatchId(secondFixture.matchId);

  if (firstMatchId && secondMatchId && firstMatchId === secondMatchId) {
    return true;
  }

  const firstSourceIds = new Set(getSourceIdKeys(getFixtureSourceIds(firstFixture)));
  const hasSharedSourceId = getSourceIdKeys(getFixtureSourceIds(secondFixture))
    .some((sourceId) => firstSourceIds.has(sourceId));

  if (hasSharedSourceId) {
    return true;
  }

  return String(firstFixture.teamId || "").trim() === String(secondFixture.teamId || "").trim() &&
    String(firstFixture.date || "").trim() === String(secondFixture.date || "").trim() &&
    isSameFootballClubName(firstFixture.home, secondFixture.home) &&
    isSameFootballClubName(firstFixture.away, secondFixture.away);
}

function buildFootyMatchRegistry({ fixtures = [], generatedAt, matchRows = [], matchNotes = new Map(), previousSchedules = [] }) {
  const registryRowsById = new Map();
  const entriesBySourceId = new Map();
  const entriesByFingerprint = new Map();
  const usedMatchIds = new Set();

  for (const row of normalizeFootyMatchRows(matchRows)) {
    registerFootyMatchRow(row, {
      entriesByFingerprint,
      entriesBySourceId,
      registryRowsById,
      usedMatchIds,
    });
  }

  for (const row of previousFootyMatchRows(previousSchedules)) {
    registerFootyMatchRow(row, {
      entriesByFingerprint,
      entriesBySourceId,
      registryRowsById,
      usedMatchIds,
    });
  }

  const fixtureRowsByReference = new Map();

  for (const fixture of fixtures) {
    const sourceIds = getFixtureSourceIds(fixture);
    const existingRow = findFootyMatchRegistryRow(fixture, sourceIds, {
      entriesByFingerprint,
      entriesBySourceId,
    });
    const matchId = existingRow?.matchId || createFootyMatchId(fixture, sourceIds, usedMatchIds);
    const row = {
      competition: fixture.league || existingRow?.competition || "",
      date: fixture.date || existingRow?.date || "",
      followedTeam: fixture.teamName || existingRow?.followedTeam || "",
      home: fixture.home || existingRow?.home || "",
      lastSeen: fixture.isRegistryFixture ? existingRow?.lastSeen || fixture.lastSeen || "" : generatedAt,
      matchId,
      away: fixture.away || existingRow?.away || "",
      sourceIds: mergeSourceIds(existingRow?.sourceIds, sourceIds),
      time: fixture.time || existingRow?.time || "",
    };

    registerFootyMatchRow(row, {
      entriesByFingerprint,
      entriesBySourceId,
      registryRowsById,
      usedMatchIds,
    });
    fixtureRowsByReference.set(getFixtureReferenceKey(fixture), row);
  }

  return {
    fixtureRowsByReference,
    rows: [...registryRowsById.values()].sort(compareFootyMatchRows),
    matchNotes,
  };
}

function applyFootyMatchRegistry(fixtures = [], registry) {
  return fixtures.map((fixture) => {
    const row = registry.fixtureRowsByReference.get(getFixtureReferenceKey(fixture));
    const matchNote = row ? registry.matchNotes.get(normalizeFootyMatchId(row.matchId)) : null;
    const existingMatchNote = hasMatchNote(fixture.matchNote) ? fixture.matchNote : null;
    const enrichedFixture = {
      ...fixture,
      isFriendly: isFriendlyCompetition(fixture.leagueId, fixture.league),
      matchId: row?.matchId || fixture.matchId || "",
      sourceIds: mergeSourceIds(row?.sourceIds, fixture.sourceIds),
    };
    const preservedMatchNote = hasMatchNote(matchNote) ? matchNote : existingMatchNote;

    return preservedMatchNote ? { ...enrichedFixture, matchNote: preservedMatchNote } : enrichedFixture;
  });
}

function isFriendlyCompetition(leagueId, leagueName) {
  const normalizedLeagueId = String(leagueId || "").trim();
  const normalizedLeagueName = normalizeText(leagueName);

  return FRIENDLY_COMPETITION_IDS.has(normalizedLeagueId) ||
    FRIENDLY_COMPETITION_NAMES.has(normalizedLeagueName) ||
    /\bfriendl(?:y|ies)\b/.test(normalizedLeagueName);
}

function normalizeFootyMatchRows(rows = []) {
  return rows.map((row) => ({
    away: getField(row, "Away").trim(),
    competition: getField(row, "Competition").trim(),
    date: getField(row, "Date").trim(),
    followedTeam: getField(row, "Followed Team").trim(),
    home: getField(row, "Home").trim(),
    lastSeen: getField(row, "Last Seen").trim(),
    matchId: normalizeFootyMatchId(getField(row, "Match ID")),
    sourceIds: parseSourceIds(getField(row, "Source IDs")),
    time: getField(row, "Time").trim(),
  })).filter((row) => row.matchId);
}

function previousFootyMatchRows(previousSchedules = []) {
  return (Array.isArray(previousSchedules) ? previousSchedules : []).flatMap((schedule) => {
    const teamName = schedule?.team?.name || "";

    return (Array.isArray(schedule?.fixtures) ? schedule.fixtures : [])
      .filter((fixture) => fixture?.matchId)
      .map((fixture) => ({
        away: fixture.away || "",
        competition: fixture.league || "",
        date: fixture.date || "",
        followedTeam: fixture.teamName || teamName,
        home: fixture.home || "",
        lastSeen: fixture.lastSeen || schedule.updatedAt || "",
        matchId: fixture.matchId,
        sourceIds: getFixtureSourceIds(fixture),
        time: fixture.time || "",
      }));
  });
}

function isSameFootballClubName(firstName, secondName) {
  const first = normalizeFootballClubName(firstName);
  const second = normalizeFootballClubName(secondName);

  if (!first || !second) {
    return false;
  }

  if (first === second) {
    return true;
  }

  const firstTokens = getFootballClubIdentityTokens(first);
  const secondTokens = getFootballClubIdentityTokens(second);
  const shorterTokens = firstTokens.length <= secondTokens.length ? firstTokens : secondTokens;
  const longerTokens = new Set(firstTokens.length <= secondTokens.length ? secondTokens : firstTokens);

  return shorterTokens.length > 0 &&
    shorterTokens.reduce((length, token) => length + token.length, 0) >= 6 &&
    shorterTokens.every((token) => longerTokens.has(token));
}

function getFootballClubIdentityTokens(value) {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((token) => token && !["de", "del", "la", "the"].includes(token));
}

function registerFootyMatchRow(row, { entriesByFingerprint, entriesBySourceId, registryRowsById, usedMatchIds }) {
  if (!row.matchId) {
    return;
  }

  const normalizedMatchId = normalizeFootyMatchId(row.matchId);
  const normalizedRow = { ...row, matchId: normalizedMatchId };
  const existingRow = registryRowsById.get(normalizedMatchId);
  const mergedRow = existingRow ? {
    ...existingRow,
    ...normalizedRow,
    sourceIds: mergeSourceIds(existingRow.sourceIds, normalizedRow.sourceIds),
  } : normalizedRow;

  registryRowsById.set(normalizedMatchId, mergedRow);
  usedMatchIds.add(normalizedMatchId);

  for (const sourceKey of getSourceIdKeys(mergedRow.sourceIds)) {
    entriesBySourceId.set(sourceKey, mergedRow);
  }

  entriesByFingerprint.set(getFootyMatchFingerprint(mergedRow), mergedRow);
}

function findFootyMatchRegistryRow(fixture, sourceIds, { entriesByFingerprint, entriesBySourceId }) {
  for (const sourceKey of getSourceIdKeys(sourceIds)) {
    const entry = entriesBySourceId.get(sourceKey);

    if (entry) {
      return entry;
    }
  }

  return entriesByFingerprint.get(getFootyMatchFingerprint({
    away: fixture.away,
    competition: fixture.league,
    date: fixture.date,
    followedTeam: fixture.teamName,
    home: fixture.home,
  })) || null;
}

function buildFootyMatchSheetRows(rows = []) {
  return rows.map((row) => ({
    "Match ID": row.matchId,
    Date: row.date,
    Time: row.time,
    "Followed Team": row.followedTeam,
    Home: row.home,
    Away: row.away,
    Competition: row.competition,
    "Source IDs": JSON.stringify(row.sourceIds || {}),
    "Last Seen": row.lastSeen,
  }));
}

async function syncFootyMatchesToSheet(rows = [], { generatedAt }) {
  if (!FOOTY_MATCH_SYNC_ENDPOINT) {
    console.log("Skipped Footy Matches sheet sync; FOOTY_MATCH_SYNC_ENDPOINT is not configured.");
    return { status: "skipped", reason: "FOOTY_MATCH_SYNC_ENDPOINT is not configured." };
  }

  try {
    const response = await fetch(FOOTY_MATCH_SYNC_ENDPOINT, {
      body: JSON.stringify({
        action: "syncFootyMatches",
        generatedAt,
        matches: buildFootyMatchSheetRows(rows),
      }),
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      method: "POST",
    });
    const text = await response.text();

    if (!response.ok) {
      throw new Error(`${response.status}: ${text.slice(0, 240)}`);
    }

    const data = JSON.parse(text);

    if (!data.ok) {
      throw new Error(data.error || "Footy Matches sheet sync returned ok=false.");
    }

    console.log(`Synced ${rows.length} Footy Matches rows.`);
    return {
      status: "synced",
      rows: rows.length,
      syncedAt: generatedAt,
      appended: data.appended || 0,
      updated: data.updated || 0,
    };
  } catch (error) {
    console.warn(`Unable to sync Footy Matches sheet: ${error.message}`);
    return {
      status: "error",
      error: error.message,
    };
  }
}

function createFootyMatchId(fixture, sourceIds, usedMatchIds) {
  const providerMatchId = createFootyCompetitionMatchId({ ...fixture, sourceIds });
  const seed = getFootyMatchFingerprint({
    away: fixture.away,
    competition: fixture.league,
    date: fixture.date,
    followedTeam: fixture.teamName,
    home: fixture.home,
  });
  const baseId = providerMatchId || `footy_${createShortHash(seed)}`;
  let matchId = baseId;
  let suffix = 2;

  while (usedMatchIds.has(matchId)) {
    matchId = `${baseId}_${suffix}`;
    suffix += 1;
  }

  usedMatchIds.add(matchId);
  return matchId;
}

function getFixtureReferenceKey(fixture) {
  return [
    fixture.teamId,
    fixture.date,
    normalizeTeamName(fixture.home),
    normalizeTeamName(fixture.away),
  ].join("|");
}

function getFootyMatchFingerprint(match) {
  return [
    normalizeText(match.followedTeam),
    normalizeText(match.date),
    normalizeTeamName(match.home),
    normalizeTeamName(match.away),
    normalizeText(match.competition),
  ].join("|");
}

function compareFootyMatchRows(first, second) {
  return String(first.date).localeCompare(String(second.date)) ||
    String(first.time).localeCompare(String(second.time)) ||
    normalizeText(first.followedTeam).localeCompare(normalizeText(second.followedTeam)) ||
    normalizeText(first.home).localeCompare(normalizeText(second.home)) ||
    normalizeText(first.away).localeCompare(normalizeText(second.away));
}

function hasMatchNote(note) {
  return Boolean(note) && (
    note.homeScore ||
    note.awayScore ||
    note.note ||
    note.highlightLink ||
    (Array.isArray(note.followGoalAssists) && note.followGoalAssists.length > 0) ||
    (Array.isArray(note.opponentGoalAssists) && note.opponentGoalAssists.length > 0)
  );
}

function buildSourceIds(source, id) {
  const normalizedId = String(id || "").trim();

  return normalizedId ? { [source]: normalizedId } : {};
}

function getFixtureSourceIds(fixture = {}) {
  const sourceIds = parseSourceIds(fixture.sourceIds);

  if (Object.keys(sourceIds).length > 0) {
    return sourceIds;
  }

  const sources = getSingleFixtureSources(fixture);
  const source = sources[0] || fixture.source || "";
  const providerId = getProviderIdFromFixtureId(fixture.id, source);

  return buildSourceIds(source, providerId);
}

function getProviderIdFromFixtureId(id, source) {
  const text = String(id || "").trim();

  if (!text || !source) {
    return "";
  }

  const prefix = `${source}:`;

  return text.startsWith(prefix) ? text.slice(prefix.length) : text;
}

function parseSourceIds(value) {
  if (!value) {
    return {};
  }

  if (typeof value === "object" && !Array.isArray(value)) {
    return Object.fromEntries(Object.entries(value)
      .map(([source, id]) => [String(source || "").trim(), String(id || "").trim()])
      .filter(([source, id]) => source && id));
  }

  const text = String(value || "").trim();

  if (!text) {
    return {};
  }

  try {
    return parseSourceIds(JSON.parse(text));
  } catch {
    return Object.fromEntries(text
      .split(/[;,]/)
      .map((part) => part.split(/[:=]/).map((piece) => piece.trim()))
      .filter(([source, id]) => source && id));
  }
}

function mergeSourceIds(...sourceIdSets) {
  return sourceIdSets.reduce((merged, sourceIdSet) => {
    for (const [source, id] of Object.entries(parseSourceIds(sourceIdSet))) {
      if (!merged[source] && id) {
        merged[source] = id;
      }
    }

    return merged;
  }, {});
}

function getSourceIdKeys(sourceIds = {}) {
  return Object.entries(parseSourceIds(sourceIds))
    .filter(([source, id]) => source && id)
    .map(([source, id]) => `${normalizeText(source)}:${String(id).trim()}`)
    .sort();
}

function createShortHash(value) {
  return createHash("sha256").update(String(value || "")).digest("hex").slice(0, 12);
}

function buildCompetitionSchedules({ generatedAt, loadedSchedules = [], preserveUnloaded = false, previousSchedules = [], teams = [], followedFixtures = [] }) {
  const previousByKey = new Map(
    (Array.isArray(previousSchedules) ? previousSchedules : [])
      .map((schedule) => [getCompetitionScheduleRecordKey(schedule?.competition), schedule])
      .filter(([key]) => key)
  );

  const schedules = loadedSchedules.map((loadedSchedule) => {
    const competition = loadedSchedule?.competition || {};
    const recordKey = getCompetitionScheduleRecordKey(competition);
    const previousSchedule = previousByKey.get(recordKey);
    const loadedFixtures = mergeFixtures(Array.isArray(loadedSchedule?.fixtures) ? loadedSchedule.fixtures : [])
      .sort(compareFixtures);
    const errors = [...new Set((Array.isArray(loadedSchedule?.errors) ? loadedSchedule.errors : []).filter(Boolean))];

    if (loadedFixtures.length === 0 && previousSchedule?.fixtures?.length) {
      return {
        ...previousSchedule,
        attemptedAt: loadedSchedule.attemptedAt || generatedAt,
        status: "stale-error",
        errors,
        notes: [...new Set([
          ...(Array.isArray(loadedSchedule.notes) ? loadedSchedule.notes : []),
          `Preserved ${previousSchedule.fixtures.length} matches from the previous successful competition update.`,
        ])],
      };
    }

    const fixtures = attachFollowedTeamDetailsToCompetitionFixtures(loadedFixtures, {
      followedFixtures,
      teams,
    }).map((fixture) => {
      const { matchNote, ...fixtureWithoutMatchNote } = fixture;
      return fixtureWithoutMatchNote;
    });

    return {
      attemptedAt: loadedSchedule.attemptedAt || generatedAt,
      competition,
      errors,
      fixtureCount: fixtures.length,
      fixtures,
      notes: [...new Set((Array.isArray(loadedSchedule.notes) ? loadedSchedule.notes : []).filter(Boolean))],
      previousUpdatedAt: previousSchedule?.updatedAt || "",
      sources: getFixtureSources(fixtures),
      status: errors.length > 0 ? "partial" : fixtures.length > 0 ? "updated" : "no-fixtures",
      updatedAt: generatedAt,
    };
  });

  if (preserveUnloaded) {
    const loadedKeys = new Set(schedules.map((schedule) => getCompetitionScheduleRecordKey(schedule.competition)));

    for (const previousSchedule of Array.isArray(previousSchedules) ? previousSchedules : []) {
      const recordKey = getCompetitionScheduleRecordKey(previousSchedule?.competition);

      if (!recordKey || loadedKeys.has(recordKey) || !previousSchedule?.fixtures?.length || previousSchedule?.competition?.source !== PRIMARY_PROVIDER_NAME) {
        continue;
      }

      schedules.push({
        ...previousSchedule,
        attemptedAt: generatedAt,
        errors: [`Unable to refresh the full ${previousSchedule.competition.name} schedule: missing FOOTBALL_DATA_API_KEY.`],
        notes: [...new Set([
          ...(Array.isArray(previousSchedule.notes) ? previousSchedule.notes : []),
          `Preserved ${previousSchedule.fixtures?.length || 0} matches from the previous successful competition update.`,
        ])],
        status: "stale-error",
      });
    }
  }

  return schedules;
}

function attachFollowedTeamDetailsToCompetitionFixtures(fixtures = [], { followedFixtures = [], teams = [] } = {}) {
  const followedBySourceId = new Map();
  const followedByMatch = new Map();

  followedFixtures.forEach((fixture) => {
    getSourceIdKeys(getFixtureSourceIds(fixture)).forEach((sourceId) => {
      if (!followedBySourceId.has(sourceId)) {
        followedBySourceId.set(sourceId, fixture);
      }
    });
    followedByMatch.set(getCompetitionFixtureFingerprint(fixture), fixture);
  });

  return fixtures.map((fixture) => {
    const sourceMatch = getSourceIdKeys(getFixtureSourceIds(fixture))
      .map((sourceId) => followedBySourceId.get(sourceId))
      .find(Boolean);
    const followedMatch = sourceMatch || followedByMatch.get(getCompetitionFixtureFingerprint(fixture));
    const followedTeams = teams.filter((team) => (
      isSameFootballClubName(team.name, fixture.home) ||
      isSameFootballClubName(team.resolvedName, fixture.home) ||
      isSameFootballClubName(team.name, fixture.away) ||
      isSameFootballClubName(team.resolvedName, fixture.away)
    ));
    const followedTeamNames = followedTeams.map((team) => team.name).filter(Boolean);
    const primaryTeam = followedTeams[0];
    const primaryIsHome = Boolean(primaryTeam) && (
      isSameFootballClubName(primaryTeam.name, fixture.home) ||
      isSameFootballClubName(primaryTeam.resolvedName, fixture.home)
    );

    return {
      ...fixture,
      matchId: followedMatch?.matchId || createFootyCompetitionMatchId(fixture),
      sourceIds: mergeSourceIds(fixture.sourceIds, followedMatch?.sourceIds),
      followedTeamNames,
      isCompetitionFixture: true,
      isHome: primaryTeam ? primaryIsHome : null,
      opponent: primaryTeam ? (primaryIsHome ? fixture.away : fixture.home) : "",
      priority: primaryTeam?.priority || "",
      teamBadge: primaryTeam?.badge || "",
      teamId: primaryTeam?.id || "",
      teamName: primaryTeam?.name || "",
    };
  });
}

function createFootyCompetitionMatchId(fixture = {}) {
  const sourceKey = getSourceIdKeys(getFixtureSourceIds(fixture))[0] || "";

  if (!sourceKey) {
    return "";
  }

  const identity = normalizeText(sourceKey)
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return identity ? `footy_comp_${identity}`.slice(0, 200) : "";
}

function getCompetitionFixtureFingerprint(fixture = {}) {
  return [
    String(fixture.date || "").trim(),
    normalizeFootballClubName(fixture.home),
    normalizeFootballClubName(fixture.away),
    getCompetitionScheduleKey(fixture.league),
  ].join("|");
}

function getCompetitionScheduleRecordKey(competition = {}) {
  const key = competition.key || getCompetitionScheduleKey(competition.name);
  const season = String(competition.season || "").trim();
  return key ? `${key}|${season}` : "";
}

function getCompetitionScheduleKey(name) {
  const normalizedName = normalizeText(name);

  if (!normalizedName) {
    return "";
  }

  if (["la liga", "primera division"].includes(normalizedName) || normalizedName.startsWith("laliga season")) {
    return "la liga";
  }

  if (["mls", "mls - regular season", "mls regular season", "major league soccer"].includes(normalizedName)) {
    return "mls";
  }

  if (["championship", "efl championship", "english league championship"].includes(normalizedName)) {
    return "championship";
  }

  if (["premier league", "english premier league"].includes(normalizedName)) {
    return "premier league";
  }

  if (["community shield", "fa community shield"].includes(normalizedName)) {
    return "community shield";
  }

  if (["efl cup", "football league cup", "league cup"].includes(normalizedName)) {
    return "efl cup";
  }

  if (["spanish super cup", "supercopa de espana", "supercopa de españa"].includes(normalizedName)) {
    return "supercopa de espana";
  }

  return normalizedName;
}

function getCompetitionScheduleDisplayName(name) {
  const key = getCompetitionScheduleKey(name);
  const displayNames = {
    championship: "Championship",
    "community shield": "FA Community Shield",
    "efl cup": "EFL Cup",
    "la liga": "La Liga",
    mls: "MLS",
    "premier league": "Premier League",
    "supercopa de espana": "Supercopa de España",
  };

  return displayNames[key] || String(name || "").trim();
}

function buildTeamSchedules({ errors = [], fixtures = [], generatedAt, notes = [], previousSchedules = [], teams = [] }) {
  const fixturesByTeamId = groupBy(fixtures, (fixture) => String(fixture.teamId || "").trim());
  const previousScheduleByTeamId = new Map(
    (Array.isArray(previousSchedules) ? previousSchedules : [])
      .filter((schedule) => schedule?.team?.id)
      .map((schedule) => [String(schedule.team.id), schedule])
  );

  return teams.map((team) => {
    const teamFixtures = (fixturesByTeamId.get(String(team.id || "").trim()) || []).sort(compareFixtures);
    const teamNotes = getMessagesForTeam(team, notes);
    const teamErrors = getMessagesForTeam(team, errors);
    const previousSchedule = previousScheduleByTeamId.get(String(team.id || ""));
    const previousFixtures = Array.isArray(previousSchedule?.fixtures) ? previousSchedule.fixtures : [];

    if (shouldPreservePreviousTeamSchedule({ previousSchedule, teamErrors, teamFixtures })) {
      return {
        ...previousSchedule,
        attemptedAt: generatedAt,
        status: "stale-error",
        team: buildTeamScheduleTeam(team, previousSchedule.team, previousFixtures),
        sources: Array.isArray(previousSchedule.sources) ? previousSchedule.sources : getFixtureSources(previousFixtures),
        fixtureCount: previousFixtures.length,
        fixtures: previousFixtures,
        notes: [...new Set([
          ...teamNotes,
          `Preserved ${previousFixtures.length} fixtures from the previous successful update.`,
        ])],
        errors: [...new Set(teamErrors)],
      };
    }

    const currentFixtures = getCurrentTeamFixtures({ generatedAt, previousFixtures, teamErrors, teamFixtures });

    return {
      attemptedAt: generatedAt,
      updatedAt: generatedAt,
      previousUpdatedAt: previousSchedule?.updatedAt || "",
      status: getTeamScheduleStatus(currentFixtures, teamErrors),
      team: buildTeamScheduleTeam(team, previousSchedule?.team, currentFixtures),
      sources: getFixtureSources(currentFixtures),
      fixtureCount: currentFixtures.length,
      fixtures: currentFixtures,
      notes: [...new Set([
        ...teamNotes,
        ...getPartialPreservationNotes({ generatedAt, previousFixtures, teamErrors, teamFixtures }),
      ])],
      errors: [...new Set(teamErrors)],
    };
  });
}

function stripTeamScheduleMatchNotes(teamSchedules = []) {
  return (Array.isArray(teamSchedules) ? teamSchedules : []).map((schedule) => ({
    ...schedule,
    fixtures: (Array.isArray(schedule.fixtures) ? schedule.fixtures : []).map((fixture) => {
      const { matchNote, ...fixtureWithoutMatchNote } = fixture;

      return fixtureWithoutMatchNote;
    }),
  }));
}

function shouldPreservePreviousTeamSchedule({ previousSchedule, teamErrors = [], teamFixtures = [] }) {
  return teamFixtures.length === 0 &&
    teamErrors.length > 0 &&
    Array.isArray(previousSchedule?.fixtures) &&
    previousSchedule.fixtures.length > 0;
}

function getCurrentTeamFixtures({ generatedAt = "", previousFixtures = [], teamErrors = [], teamFixtures = [] }) {
  if (previousFixtures.length === 0) {
    return teamFixtures;
  }

  const updateDate = String(generatedAt || "").slice(0, 10);
  const fixturesToPreserve = teamErrors.length > 0
    ? previousFixtures
    : previousFixtures.filter((fixture) => String(fixture.date || "") < updateDate);

  return mergeFixtures([...fixturesToPreserve, ...teamFixtures]).sort(compareFixtures);
}

function getPartialPreservationNotes({ generatedAt = "", previousFixtures = [], teamErrors = [], teamFixtures = [] }) {
  if (previousFixtures.length === 0 || teamFixtures.length === 0) {
    return [];
  }

  const mergedCount = getCurrentTeamFixtures({ generatedAt, previousFixtures, teamErrors, teamFixtures }).length;
  const preservedCount = Math.max(0, mergedCount - teamFixtures.length);

  if (preservedCount === 0) {
    return [];
  }

  return teamErrors.length > 0
    ? [`Preserved ${preservedCount} previous fixtures while the current update had provider errors.`]
    : [`Preserved ${preservedCount} registered fixtures that were not returned by providers this run.`];
}

function buildTeamScheduleTeam(team, previousTeam = {}, fixtures = []) {
  const leagueGames = normalizeLeagueGames(team.leagueGames);
  const projectedPoints = calculateProjectedLeaguePoints(team, fixtures);

  return {
    badge: team.badge || previousTeam.badge || "",
    id: team.id || previousTeam.id || "",
    league: team.league || previousTeam.league || "",
    ...(leagueGames ? { leagueGames, projectedPoints } : {}),
    name: team.name || previousTeam.name || "",
    prettyName: team.prettyName || previousTeam.prettyName || team.name || previousTeam.name || "",
    priority: team.priority || previousTeam.priority || "",
  };
}

function calculateProjectedLeaguePoints(team = {}, fixtures = []) {
  const leagueGames = normalizeLeagueGames(team.leagueGames);

  if (!leagueGames) {
    return null;
  }

  const completedMatchIds = new Set();
  let pointsDropped = 0;

  for (const fixture of Array.isArray(fixtures) ? fixtures : []) {
    const matchId = normalizeFootyMatchId(fixture?.matchId);
    const homeScore = parseCompletedScore(fixture?.matchNote?.homeScore);
    const awayScore = parseCompletedScore(fixture?.matchNote?.awayScore);

    if (!isTeamLeagueFixture(team, fixture) || homeScore === null || awayScore === null || (matchId && completedMatchIds.has(matchId))) {
      continue;
    }

    if (matchId) {
      completedMatchIds.add(matchId);
    }

    const isHome = typeof fixture.isHome === "boolean"
      ? fixture.isHome
      : isSameFootballClubName(fixture.home, team.name);
    const teamScore = isHome ? homeScore : awayScore;
    const opponentScore = isHome ? awayScore : homeScore;
    const earnedPoints = teamScore > opponentScore
      ? FOOTBALL_LEAGUE_POINTS.win
      : teamScore === opponentScore
        ? FOOTBALL_LEAGUE_POINTS.draw
        : FOOTBALL_LEAGUE_POINTS.loss;

    pointsDropped += FOOTBALL_LEAGUE_POINTS.win - earnedPoints;
  }

  return Math.max(0, (leagueGames * FOOTBALL_LEAGUE_POINTS.win) - pointsDropped);
}

function parseCompletedScore(value) {
  const text = String(value ?? "").trim();

  if (!/^\d+$/.test(text)) {
    return null;
  }

  return Number(text);
}

function normalizeLeagueGames(value) {
  const leagueGames = Number.parseInt(String(value ?? "").trim(), 10);
  return Number.isInteger(leagueGames) && leagueGames > 0 ? leagueGames : null;
}

function getTeamLeagueIds(team = {}, leagueRows = []) {
  return [...new Set((Array.isArray(leagueRows) ? leagueRows : [])
    .filter((league) => areLeagueNamesEquivalent(team.league, getField(league, "Name")))
    .flatMap((league) => [
      getField(league, "Provider League ID", "football-data League ID"),
      getField(league, "SportDB League ID"),
    ])
    .map((leagueId) => String(leagueId || "").trim())
    .filter(Boolean))];
}

function isTeamLeagueFixture(team = {}, fixture = {}) {
  const leagueId = String(fixture.leagueId || "").trim();

  if (leagueId && Array.isArray(team.leagueIds) && team.leagueIds.includes(leagueId)) {
    return true;
  }

  return areLeagueNamesEquivalent(team.league, fixture.league);
}

function areLeagueNamesEquivalent(firstLeague, secondLeague) {
  const first = normalizeText(firstLeague).replace(/\b(english|spanish|season|regular)\b/g, "").replace(/[^a-z0-9]/g, "");
  const second = normalizeText(secondLeague).replace(/\b(english|spanish|season|regular)\b/g, "").replace(/[^a-z0-9]/g, "");

  return Boolean(first && second && (first.includes(second) || second.includes(first)));
}

function getFixtureSources(fixtures = []) {
  return [...new Set(fixtures.flatMap((fixture) => {
    return getSingleFixtureSources(fixture);
  }))].sort();
}

function getSingleFixtureSources(fixture = {}) {
  return Array.isArray(fixture.sources) ? fixture.sources : [fixture.source].filter(Boolean);
}

function buildFileUpdateTracker({ competitionSchedules = [], generatedAt, teamSchedules = [] }) {
  const schedules = Array.isArray(teamSchedules) ? teamSchedules : [];
  const competitions = Array.isArray(competitionSchedules) ? competitionSchedules : [];
  const updatedTimes = schedules
    .map((schedule) => schedule.updatedAt)
    .filter(Boolean)
    .sort();
  const attemptedTimes = schedules
    .map((schedule) => schedule.attemptedAt)
    .filter(Boolean)
    .sort();
  const statuses = schedules.reduce((counts, schedule) => {
    const status = schedule.status || "unknown";
    counts[status] = (counts[status] || 0) + 1;
    return counts;
  }, {});

  return {
    generatedAt,
    attemptedAt: attemptedTimes.at(-1) || generatedAt,
    updatedAt: updatedTimes.at(-1) || generatedAt,
    oldestTeamUpdatedAt: updatedTimes[0] || "",
    competitionCount: competitions.length,
    competitionFixtureCount: competitions.reduce((sum, schedule) => sum + (Number(schedule.fixtureCount) || 0), 0),
    teamCount: schedules.length,
    fixtureCount: schedules.reduce((sum, schedule) => sum + (Number(schedule.fixtureCount) || 0), 0),
    statuses,
  };
}

function getTeamScheduleStatus(fixtures = [], errors = []) {
  if (errors.length > 0 && fixtures.length === 0) {
    return "error";
  }

  if (errors.length > 0) {
    return "partial";
  }

  if (fixtures.length === 0) {
    return "no-fixtures";
  }

  return "updated";
}

function getMessagesForTeam(team, messages = []) {
  const teamName = String(team.name || "").trim();
  const normalizedTeamName = normalizeText(teamName);
  const prefixedMessage = `${normalizedTeamName}:`;
  const unablePrefix = `unable to load fixtures for ${normalizedTeamName}:`;

  return messages
    .map((message) => String(message || "").trim())
    .filter((message) => {
      const normalizedMessage = normalizeText(message);

      return normalizedMessage.startsWith(prefixedMessage) || normalizedMessage.startsWith(unablePrefix);
    })
    .map((message) => stripTeamMessagePrefix(teamName, message))
    .filter(Boolean);
}

function stripTeamMessagePrefix(teamName, message) {
  const directPrefix = `${teamName}:`;
  const unablePrefix = `Unable to load fixtures for ${teamName}:`;

  if (message.startsWith(directPrefix)) {
    return message.slice(directPrefix.length).trim();
  }

  if (message.startsWith(unablePrefix)) {
    return message.slice(unablePrefix.length).trim();
  }

  return message;
}

function mergeFixture(existingFixture, incomingFixture) {
  const primaryFixture = getFixtureSourcePriority(existingFixture) > getFixtureSourcePriority(incomingFixture) ? existingFixture : incomingFixture;
  const secondaryFixture = primaryFixture === existingFixture ? incomingFixture : existingFixture;
  const primaryMatchNote = hasMatchNote(primaryFixture.matchNote) ? primaryFixture.matchNote : null;
  const secondaryMatchNote = hasMatchNote(secondaryFixture.matchNote) ? secondaryFixture.matchNote : null;
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
    lastSeen: primaryFixture.lastSeen || secondaryFixture.lastSeen || "",
    matchId: primaryFixture.matchId || secondaryFixture.matchId || "",
    matchNote: primaryMatchNote || secondaryMatchNote || primaryFixture.matchNote || secondaryFixture.matchNote || null,
    priority: primaryFixture.priority || secondaryFixture.priority || "",
    round: primaryFixture.round || secondaryFixture.round || "",
    season: primaryFixture.season || secondaryFixture.season || "",
    sources,
    sourceIds: mergeSourceIds(secondaryFixture.sourceIds, primaryFixture.sourceIds),
    source: sources.join(" + "),
    teamBadge: primaryFixture.teamBadge || secondaryFixture.teamBadge || "",
    time: primaryFixture.time || secondaryFixture.time || "",
    timestamp: primaryFixture.timestamp || secondaryFixture.timestamp || "",
    venue: primaryFixture.venue || secondaryFixture.venue || "",
  };
}

function getFixtureSourcePriority(fixture) {
  return getSingleFixtureSources(fixture).reduce((highestPriority, source) => {
    return Math.max(highestPriority, SOURCE_PRIORITY[source] || 0);
  }, 0);
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

function isArsenalTeamMatch(match, arsenalTeamId, team) {
  const contestants = Array.isArray(match.matchInfo?.contestant) ? match.matchInfo.contestant : [];

  return contestants.some((contestant) => {
    return String(contestant.id || "") === String(arsenalTeamId) ||
      normalizeText(contestant.name) === normalizeText(team.name) ||
      normalizeText(contestant.name) === normalizeText(team.resolvedName);
  });
}

function isArsenalMatchInRange(match, dateFrom, dateTo) {
  const matchDate = String(match.matchInfo?.localDate || match.matchInfo?.date || "").slice(0, 10);
  const status = normalizeText(match.liveData?.matchDetails?.matchStatus || "");

  return matchDate >= dateFrom && matchDate <= dateTo && !["played", "full time", "ft", "post match"].includes(status);
}

function isCalendarMatchEvent(event, team) {
  const parsedSummary = parseCalendarMatchSummary(event.SUMMARY || "", team);

  return Boolean(parsedSummary.home && parsedSummary.away && parsedSummary.isTeamMatch);
}

function isCalendarEventInRange(event, dateFrom, dateTo) {
  const eventDate = getCalendarTimestamp(event.DTSTART || "").slice(0, 10);

  return eventDate >= dateFrom && eventDate <= dateTo;
}

function getSportDbTimestamp(event) {
  if (event.strTimestamp) {
    return normalizeUtcTimestamp(event.strTimestamp);
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

function normalizeUtcTimestamp(value) {
  const timestamp = String(value || "").trim();

  if (!timestamp || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(timestamp)) {
    return timestamp;
  }

  return /(?:Z|[+-]\d{2}:?\d{2})$/i.test(timestamp) ? timestamp : `${timestamp}Z`;
}

function getArsenalTimestamp(matchInfo) {
  const rawDate = String(matchInfo.date || matchInfo.localDate || "").trim();
  const date = rawDate.slice(0, 10);
  const rawTime = String(matchInfo.time || matchInfo.localTime || "").trim();
  const time = rawTime.replace(/Z$/, "");

  if (!date) {
    return "";
  }

  if (!time) {
    return date;
  }

  return `${date}T${time}${rawTime.endsWith("Z") ? "Z" : ""}`;
}

function getCalendarTimestamp(value) {
  const rawDate = String(value || "").trim();
  const match = rawDate.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})Z?)?$/);

  if (!match) {
    return "";
  }

  const [, year, month, day, hour = "00", minute = "00", second = "00"] = match;

  return `${year}-${month}-${day}T${hour}:${minute}:${second}${rawDate.endsWith("Z") ? "Z" : ""}`;
}

function getMonthStarts(dateFrom, dateTo) {
  const starts = [];
  const current = new Date(`${dateFrom}T00:00:00Z`);
  const end = new Date(`${dateTo}T00:00:00Z`);
  current.setUTCDate(1);

  while (current <= end) {
    starts.push(formatDate(current));
    current.setUTCMonth(current.getUTCMonth() + 1);
  }

  return starts;
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

function parseICalendarEvents(text) {
  const unfoldedLines = String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .reduce((lines, line) => {
      if (/^[ \t]/.test(line) && lines.length > 0) {
        lines[lines.length - 1] += line.slice(1);
      } else {
        lines.push(line);
      }

      return lines;
  }, []);
  const events = [];
  let currentEvent = null;
  let nestedEventComponentDepth = 0;

  for (const line of unfoldedLines) {
    if (line === "BEGIN:VEVENT") {
      currentEvent = {};
      nestedEventComponentDepth = 0;
      continue;
    }

    if (line === "END:VEVENT") {
      if (currentEvent) {
        events.push(currentEvent);
      }

      currentEvent = null;
      nestedEventComponentDepth = 0;
      continue;
    }

    if (currentEvent && line.startsWith("BEGIN:")) {
      nestedEventComponentDepth += 1;
      continue;
    }

    if (currentEvent && line.startsWith("END:") && nestedEventComponentDepth > 0) {
      nestedEventComponentDepth -= 1;
      continue;
    }

    if (nestedEventComponentDepth > 0) {
      continue;
    }

    if (!currentEvent || !line.includes(":")) {
      continue;
    }

    const separatorIndex = line.indexOf(":");
    const rawKey = line.slice(0, separatorIndex).split(";")[0];
    currentEvent[rawKey] = decodeICalendarText(line.slice(separatorIndex + 1));
  }

  return events;
}

function parseCalendarMatchSummary(summary, team) {
  let cleanedSummary = String(summary || "")
    .replace(/^[^\w]+/u, "")
    .replace(/\s+\(Time TBC\)\s*$/i, "")
    .replace(/\s+\([HAN]\)\s*$/i, "")
    .trim();
  const prefixedMatch = cleanedSummary.match(/^([^:]+):\s+(.+\s+v(?:s)?\.?\s+.+)$/i);
  const league = prefixedMatch ? prefixedMatch[1].trim() : "";

  if (prefixedMatch) {
    cleanedSummary = prefixedMatch[2].trim();
  }

  const [home = "", away = ""] = cleanedSummary.split(/\s+v(?:s)?\.?\s+/i).map((value) => value.trim());
  const teamNames = [team.name, team.resolvedName].filter(Boolean).map(normalizeTeamName);
  const normalizedHome = normalizeTeamName(home);
  const normalizedAway = normalizeTeamName(away);

  return {
    away,
    home,
    isHome: teamNames.includes(normalizedHome),
    isTeamMatch: teamNames.includes(normalizedHome) || teamNames.includes(normalizedAway),
    league,
  };
}

function parseFullCalendarMatchSummary(summary) {
  let cleanedSummary = String(summary || "")
    .replace(/^[^\w]+/u, "")
    .replace(/\s+\(Time TBC\)\s*$/i, "")
    .replace(/\s+\([HAN]\)\s*$/i, "")
    .trim();
  const prefixedMatch = cleanedSummary.match(/^([^:]+):\s+(.+\s+v(?:s)?\.?\s+.+)$/i);
  const league = prefixedMatch ? prefixedMatch[1].trim() : "";

  if (prefixedMatch) {
    cleanedSummary = prefixedMatch[2].trim();
  }

  const [home = "", away = ""] = cleanedSummary
    .split(/\s+v(?:s)?\.?\s+/i)
    .map((value) => value.replace(/\*+$/g, "").trim());

  return { away, home, league };
}

function getCalendarLeague(description) {
  const firstLine = String(description || "").split(/\n/)[0] || "";
  const [league = ""] = firstLine.split("|").map((value) => value.trim());
  const normalizedLeague = normalizeText(league);

  if (normalizedLeague === "manage my ecal") {
    return "Friendly";
  }

  if (normalizedLeague.startsWith("join in:")) {
    return "";
  }

  return league;
}

function decodeICalendarText(value) {
  return String(value || "")
    .replace(/\\n/g, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

function normalizeCalendarUrl(url) {
  return String(url || "").replace(/^webcal:\/\//i, "https://");
}

function normalizeTeamName(value) {
  return normalizeText(value)
    .replace(/\bfc\b/g, "")
    .replace(/\bafc\b/g, "")
    .replace(/\bcf\b/g, "")
    .replace(/\b(?:18|19|20)\d{2}\b/g, "")
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

function normalizeFootyMatchId(value) {
  return normalizeText(value);
}

function normalizeFootballClubName(value) {
  return normalizeText(value)
    .replace(/\b(afc|cf|fc|sc)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
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

function getPreviousSchedulesByTeamId(previousSchedules = []) {
  return new Map(
    (Array.isArray(previousSchedules) ? previousSchedules : [])
      .filter((schedule) => schedule?.team?.id)
      .map((schedule) => [String(schedule.team.id), schedule])
  );
}

function compareTeamUpdateFreshness(firstTeam, secondTeam, previousSchedulesByTeamId = new Map()) {
  const firstSchedule = previousSchedulesByTeamId.get(getField(firstTeam, "ID").trim());
  const secondSchedule = previousSchedulesByTeamId.get(getField(secondTeam, "ID").trim());

  return compareScheduleFreshness(firstSchedule, secondSchedule) ||
    comparePriority(firstTeam.Priority, secondTeam.Priority) ||
    getField(firstTeam, "Name", "Team").localeCompare(getField(secondTeam, "Name", "Team"));
}

function compareScheduleFreshness(firstSchedule, secondSchedule) {
  const firstValue = getScheduleFreshnessValue(firstSchedule);
  const secondValue = getScheduleFreshnessValue(secondSchedule);

  return firstValue - secondValue;
}

function getScheduleFreshnessValue(schedule) {
  const timestamp = schedule?.updatedAt || schedule?.attemptedAt || "";
  const parsed = timestamp ? Date.parse(timestamp) : Number.NaN;

  return Number.isFinite(parsed) ? parsed : 0;
}

function compareFixtures(first, second) {
  return String(first.timestamp || first.date).localeCompare(String(second.timestamp || second.date)) ||
    comparePriority(first.teamId, second.teamId) ||
    String(first.teamName || "").localeCompare(String(second.teamName || ""));
}

function assertRequiredProviderConfiguration(activeTeams = []) {
  const teamsUsingFootballData = activeTeams.filter((team) => getFootballDataTeamId(team));

  if (FOOTBALL_DATA_API_KEY || SHOULD_ALLOW_MISSING_FOOTBALL_DATA_API_KEY || teamsUsingFootballData.length === 0) {
    return;
  }

  const teamNames = teamsUsingFootballData
    .map((team) => getField(team, "Name", "Team").trim())
    .filter(Boolean)
    .join(", ");

  throw new Error(
    `Missing FOOTBALL_DATA_API_KEY; refusing to write a degraded schedule for football-data.org teams: ${teamNames}.`
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

export {
  getCurrentTeamFixtures,
  getSportDbTimestamp,
  isSameFootballClubName,
  mergeFixtures,
};
