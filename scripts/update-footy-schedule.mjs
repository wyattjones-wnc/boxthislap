import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_FOOTY_WORKBOOK_BASE_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRBd-UqYHhrob90IdNm8CmAmDy0gCfJ8cYTCESL01ph4D9A9kEY62Y78pWc9rjrEQq0lCS3JWc8Nar7/pub";
const DEFAULT_FOOTBALL_TEAMS_CSV_URL = `${DEFAULT_FOOTY_WORKBOOK_BASE_URL}?gid=0&single=true&output=csv`;
const DEFAULT_FOOTY_MATCHES_CSV_URL = `${DEFAULT_FOOTY_WORKBOOK_BASE_URL}?gid=1436836758&single=true&output=csv`;
const DEFAULT_FOOTY_MATCH_NOTES_CSV_URL = `${DEFAULT_FOOTY_WORKBOOK_BASE_URL}?gid=866481448&single=true&output=csv`;
const OUTPUT_PATH = path.resolve(process.env.FOOTY_SCHEDULE_OUTPUT_PATH || path.join("data", "footy-schedule.json"));
const PRIMARY_PROVIDER_NAME = "football-data.org";
const SPORTDB_PROVIDER_NAME = "TheSportsDB";
const ARSENAL_PROVIDER_NAME = "Arsenal.com";
const ICALENDAR_PROVIDER_NAME = "iCalendar";
const SOURCE_PRIORITY = {
  [PRIMARY_PROVIDER_NAME]: 40,
  [ARSENAL_PROVIDER_NAME]: 30,
  [SPORTDB_PROVIDER_NAME]: 20,
  [ICALENDAR_PROVIDER_NAME]: 10,
};
const FOOTBALL_DATA_API_KEY = process.env.FOOTBALL_DATA_API_KEY || "";
const SHOULD_ALLOW_MISSING_FOOTBALL_DATA_API_KEY = isTrueValue(process.env.FOOTY_ALLOW_MISSING_FOOTBALL_DATA_API_KEY);
const FOOTBALL_DATA_BASE_URL = "https://api.football-data.org/v4";
const SPORTDB_BASE_URL = process.env.SPORTDB_BASE_URL || "https://www.thesportsdb.com/api/v1/json/3";
const ARSENAL_GRAPHQL_URL = process.env.ARSENAL_GRAPHQL_URL || "https://afc-prd.graph.arsenal.com/graphql";
const API_CACHE_DIR = path.resolve(process.env.FOOTY_API_CACHE_DIR || path.join(".cache", "footy-schedule-api"));
const EXTERNAL_REQUEST_INTERVAL_MS = Number(process.env.FOOTY_API_REQUEST_INTERVAL_MS) || 6500;
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
  const footyMatchNotes = await loadFootyMatchNotesSheet(process.env.FOOTY_MATCH_NOTES_CSV_URL || DEFAULT_FOOTY_MATCH_NOTES_CSV_URL);
  const activeTeams = footballData.teamRows
    .filter((team) => hasTeamIdentity(team) && !isFalseValue(getField(team, "IsActive", "Active")))
    .sort((first, second) => comparePriority(first.Priority, second.Priority));

  assertRequiredProviderConfiguration(activeTeams);

  const dateFrom = formatDate(new Date());
  const dateTo = formatDate(addDays(new Date(), LOOKAHEAD_DAYS));
  const teams = [];
  const fixtures = [];
  const errors = [];
  const coverageNotes = [];
  const prioritySets = normalizePrioritySets(footballData.prioritySetRows);
  const teamRowsById = new Map(activeTeams.map((team) => [getField(team, "ID").trim(), team]));
  const leagueRowsByTeamId = groupBy(footballData.leagueRows, (league) => getField(league, "Team ID").trim());

  for (const team of activeTeams) {
    const teamRecord = await resolveTeam(team);
    teams.push(teamRecord);

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

  const registryHydratedFixtures = buildFixturesFromFootyMatchRows(footyMatchRows, teams);
  const dedupedFixtures = mergeFixtures([...registryHydratedFixtures, ...fixtures]).sort(compareFixtures);
  const footyMatchRegistry = buildFootyMatchRegistry({
    fixtures: dedupedFixtures,
    generatedAt,
    matchRows: footyMatchRows,
    matchNotes: footyMatchNotes,
    previousSchedules: previousPayload?.teamSchedules,
  });
  const enrichedFixtures = applyFootyMatchRegistry(dedupedFixtures, footyMatchRegistry).sort(compareFixtures);
  const teamSchedules = buildTeamSchedules({
    errors,
    fixtures: enrichedFixtures,
    generatedAt,
    notes: coverageNotes,
    previousSchedules: previousPayload?.teamSchedules,
    teams,
  });
  const footyMatchSync = await syncFootyMatchesToSheet(footyMatchRegistry.rows, { generatedAt });
  const payload = {
    generatedAt,
    schemaVersion: 2,
    source: `${PRIMARY_PROVIDER_NAME} + ${SPORTDB_PROVIDER_NAME} + ${ARSENAL_PROVIDER_NAME} + ${ICALENDAR_PROVIDER_NAME}`,
    updateTracker: buildFileUpdateTracker({ generatedAt, teamSchedules }),
    prioritySets,
    footyMatchRegistry: {
      matchCount: footyMatchRegistry.rows.length,
      noteCount: footyMatchNotes.size,
      sync: footyMatchSync,
    },
    teamSchedules,
  };

  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`Wrote ${payload.updateTracker.fixtureCount} fixtures for ${teamSchedules.length} teams to ${OUTPUT_PATH}`);
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

  if (!FOOTBALL_DATA_API_KEY) {
    return {
      badge: getTeamBadge(team),
      id: getField(team, "ID"),
      league: getField(team, "League").trim(),
      name,
      priority: getField(team, "Priority"),
      provider: PRIMARY_PROVIDER_NAME,
      providerLeague: "",
      providerLeagues: [],
      providerTeamId: configuredId,
      resolvedName: name,
      sportDbTeamId: getSportDbTeamId(team),
      status: "configured-unverified",
      warning: `Skipped ${PRIMARY_PROVIDER_NAME} team verification; missing FOOTBALL_DATA_API_KEY.`,
    };
  }

  let providerTeam = null;

  try {
    providerTeam = await loadFootballDataJson(`/teams/${encodeURIComponent(configuredId)}`);
  } catch (error) {
    return {
      badge: getTeamBadge(team),
      id: getField(team, "ID"),
      league: getField(team, "League").trim(),
      name,
      priority: getField(team, "Priority"),
      provider: PRIMARY_PROVIDER_NAME,
      providerLeague: "",
      providerLeagues: [],
      providerTeamId: configuredId,
      resolvedName: name,
      sportDbTeamId: getSportDbTeamId(team),
      status: "configured-unverified",
      warning: `Unable to verify football-data.org team ${configuredId}: ${error.message}`,
    };
  }

  return {
    badge: getTeamBadge(team) || providerTeam.crest || "",
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
      const events = parseICalendarEvents(await loadText(normalizeCalendarUrl(calendarUrl), { extension: "ics" }));
      const matchEvents = events
        .filter((event) => isCalendarMatchEvent(event, team))
        .filter((event) => isCalendarEventInRange(event, dateFrom, dateTo));
      fixtures.push(...matchEvents.map((event) => normalizeCalendarMatch(event, team)));
      notes.push(`${team.name}: Loaded ${matchEvents.length} ${ICALENDAR_PROVIDER_NAME} fixtures from calendar feed.`);
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

async function loadFootyMatchNotesSheet(url) {
  const section = await loadCsvTableSection(url, isFootyMatchNotesSection);
  const notesByMatchId = new Map();

  if (!section) {
    return notesByMatchId;
  }

  for (const row of recordsFromCsvSection(section)) {
    const matchId = getField(row, "Match ID").trim();

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

  await waitForExternalRequestSlot();
  const response = await fetch(url, {
    body: body || undefined,
    headers: { "user-agent": "boxthislap-footy-updater", ...headers },
    method,
  });
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
    const matchNote = row ? registry.matchNotes.get(row.matchId) : null;
    const enrichedFixture = {
      ...fixture,
      matchId: row?.matchId || fixture.matchId || "",
      sourceIds: mergeSourceIds(row?.sourceIds, fixture.sourceIds),
    };

    return hasMatchNote(matchNote) ? { ...enrichedFixture, matchNote } : enrichedFixture;
  });
}

function normalizeFootyMatchRows(rows = []) {
  return rows.map((row) => ({
    away: getField(row, "Away").trim(),
    competition: getField(row, "Competition").trim(),
    date: getField(row, "Date").trim(),
    followedTeam: getField(row, "Followed Team").trim(),
    home: getField(row, "Home").trim(),
    lastSeen: getField(row, "Last Seen").trim(),
    matchId: getField(row, "Match ID").trim(),
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

function buildFixturesFromFootyMatchRows(rows = [], teams = []) {
  const teamByName = new Map(
    teams
      .filter((team) => team?.name)
      .map((team) => [normalizeText(team.name), team])
  );

  return normalizeFootyMatchRows(rows).map((row) => {
    const team = teamByName.get(normalizeText(row.followedTeam)) || {};
    const timestamp = buildFootyRegistryTimestamp(row.date, row.time);
    const isHome = normalizeText(row.home) === normalizeText(row.followedTeam);
    const opponent = isHome ? row.away : row.home;

    return {
      away: row.away,
      awayBadge: "",
      date: row.date,
      home: row.home,
      homeBadge: "",
      id: row.matchId,
      isRegistryFixture: true,
      isHome,
      lastSeen: row.lastSeen,
      league: row.competition,
      opponent,
      priority: team.priority || "",
      source: "Footy Matches",
      sourceIds: row.sourceIds,
      sources: ["Footy Matches"],
      teamBadge: team.badge || "",
      teamId: team.id || row.followedTeam,
      teamName: team.name || row.followedTeam,
      time: row.time,
      timestamp,
    };
  });
}

function buildFootyRegistryTimestamp(date, time) {
  const normalizedDate = String(date || "").trim();
  const normalizedTime = String(time || "").trim();

  if (!normalizedDate) {
    return "";
  }

  return normalizedTime ? `${normalizedDate}T${normalizedTime}` : normalizedDate;
}

function registerFootyMatchRow(row, { entriesByFingerprint, entriesBySourceId, registryRowsById, usedMatchIds }) {
  if (!row.matchId) {
    return;
  }

  const existingRow = registryRowsById.get(row.matchId);
  const mergedRow = existingRow ? {
    ...existingRow,
    ...row,
    sourceIds: mergeSourceIds(existingRow.sourceIds, row.sourceIds),
  } : row;

  registryRowsById.set(row.matchId, mergedRow);
  usedMatchIds.add(row.matchId);

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
  const sourceKey = getSourceIdKeys(sourceIds).join("|");
  const seed = sourceKey || getFootyMatchFingerprint({
    away: fixture.away,
    competition: fixture.league,
    date: fixture.date,
    followedTeam: fixture.teamName,
    home: fixture.home,
  });
  const baseId = `footy_${createShortHash(seed)}`;
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
        team: buildTeamScheduleTeam(team, previousSchedule.team),
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

    const currentFixtures = getCurrentTeamFixtures({ previousFixtures, teamErrors, teamFixtures });

    return {
      attemptedAt: generatedAt,
      updatedAt: generatedAt,
      previousUpdatedAt: previousSchedule?.updatedAt || "",
      status: getTeamScheduleStatus(currentFixtures, teamErrors),
      team: buildTeamScheduleTeam(team),
      sources: getFixtureSources(currentFixtures),
      fixtureCount: currentFixtures.length,
      fixtures: currentFixtures,
      notes: [...new Set([
        ...teamNotes,
        ...getPartialPreservationNotes({ previousFixtures, teamErrors, teamFixtures }),
      ])],
      errors: [...new Set(teamErrors)],
    };
  });
}

function shouldPreservePreviousTeamSchedule({ previousSchedule, teamErrors = [], teamFixtures = [] }) {
  return teamFixtures.length === 0 &&
    teamErrors.length > 0 &&
    Array.isArray(previousSchedule?.fixtures) &&
    previousSchedule.fixtures.length > 0;
}

function getCurrentTeamFixtures({ previousFixtures = [], teamErrors = [], teamFixtures = [] }) {
  if (previousFixtures.length === 0) {
    return teamFixtures;
  }

  return mergeFixtures([...previousFixtures, ...teamFixtures]).sort(compareFixtures);
}

function getPartialPreservationNotes({ previousFixtures = [], teamErrors = [], teamFixtures = [] }) {
  if (previousFixtures.length === 0 || teamFixtures.length === 0) {
    return [];
  }

  const mergedCount = mergeFixtures([...previousFixtures, ...teamFixtures]).length;
  const preservedCount = Math.max(0, mergedCount - teamFixtures.length);

  if (preservedCount === 0) {
    return [];
  }

  return teamErrors.length > 0
    ? [`Preserved ${preservedCount} previous fixtures while the current update had provider errors.`]
    : [`Preserved ${preservedCount} registered fixtures that were not returned by providers this run.`];
}

function buildTeamScheduleTeam(team, previousTeam = {}) {
  return {
    badge: team.badge || previousTeam.badge || "",
    id: team.id || previousTeam.id || "",
    league: team.league || previousTeam.league || "",
    name: team.name || previousTeam.name || "",
    priority: team.priority || previousTeam.priority || "",
  };
}

function getFixtureSources(fixtures = []) {
  return [...new Set(fixtures.flatMap((fixture) => {
    return getSingleFixtureSources(fixture);
  }))].sort();
}

function getSingleFixtureSources(fixture = {}) {
  return Array.isArray(fixture.sources) ? fixture.sources : [fixture.source].filter(Boolean);
}

function buildFileUpdateTracker({ generatedAt, teamSchedules = [] }) {
  const schedules = Array.isArray(teamSchedules) ? teamSchedules : [];
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

function getFixtureMergeKey(fixture) {
  return [
    fixture.teamId,
    fixture.date,
    normalizeTeamName(fixture.home),
    normalizeTeamName(fixture.away),
  ].join("|");
}

function mergeFixture(existingFixture, incomingFixture) {
  const primaryFixture = getFixtureSourcePriority(existingFixture) > getFixtureSourcePriority(incomingFixture) ? existingFixture : incomingFixture;
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
    priority: primaryFixture.priority || secondaryFixture.priority || "",
    round: primaryFixture.round || secondaryFixture.round || "",
    season: primaryFixture.season || secondaryFixture.season || "",
    sources,
    sourceIds: mergeSourceIds(secondaryFixture.sourceIds, primaryFixture.sourceIds),
    source: sources.join(" + "),
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

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
