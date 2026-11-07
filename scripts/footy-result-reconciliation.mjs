import {
  isSameFootballClubName,
  normalizeFootballClubName,
} from "./footy-club-names.mjs";
import { collectFinalResults, resultScores } from "./footy-results.mjs";

const LEAGUES = {
  PL: "eng.1",
  ELC: "eng.2",
  PD: "esp.1",
  BL1: "ger.1",
  SA: "ita.1",
  FL1: "fra.1",
  PPL: "por.1",
  DED: "ned.1",
  CL: "uefa.champions",
  EL: "uefa.europa",
  MLS: "usa.1",
};
const CUP_LEAGUES = {
  "efl cup": "eng.league_cup",
  "league cup": "eng.league_cup",
  "fa cup": "eng.fa",
  "u.s. open cup": "usa.open",
  "leagues cup": "concacaf.leagues.cup",
  "supercopa de españa": "esp.super_cup",
  "community shield": "eng.charity",
};
const FINISHED = new Set([
  "ft",
  "finished",
  "match finished",
  "final",
  "aet",
  "pen",
]);

function sameTeam(first, second) {
  if (isSameFootballClubName(first, second)) return true;
  // Feeds can reorder words, add calendar markers, or pluralize a nickname.
  // Require all normalized words to agree; never use a substring match here.
  const tokens = (name) =>
    normalizeFootballClubName(name)
      .split(/[^a-z0-9]+/)
      .filter(Boolean)
      .map((word) => (word.length > 3 ? word.replace(/s$/, "") : word))
      .sort()
      .join(" ");
  return Boolean(tokens(first)) && tokens(first) === tokens(second);
}

function sameFixture(fixture, date, home, away) {
  return (
    String(date).slice(0, 10) ===
      String(fixture.timestamp || fixture.date).slice(0, 10) &&
    sameTeam(fixture.home, home) &&
    sameTeam(fixture.away, away)
  );
}

export async function reconcileFootyResults({
  schedules,
  generatedAt,
  loadJson,
  lookbackDays = 30,
}) {
  const requests = new Map();
  const records = new Map();
  for (const schedule of schedules)
    for (const fixture of schedule.fixtures || []) {
      if (!fixture.matchId) continue;
      const record = records.get(fixture.matchId) || {
        fixture,
        schedule,
        copies: [],
      };
      record.copies.push(fixture);
      records.set(fixture.matchId, record);
    }
  const load = (url) => {
    if (!requests.has(url))
      requests.set(
        url,
        loadJson(url).catch((error) => ({ error: error.message })),
      );
    return requests.get(url);
  };
  let resolved = 0;
  for (const { fixture, schedule, copies } of records.values()) {
    if (collectFinalResults(copies).length) continue;
    const age =
      Date.parse(generatedAt) - Date.parse(fixture.timestamp || fixture.date);
    if (!Number.isFinite(age) || age < 0 || age > lookbackDays * 86400000)
      continue;
    const competition = String(
      schedule.competition?.key ||
        schedule.competition?.name ||
        fixture.league ||
        "",
    ).toLowerCase();
    const league =
      CUP_LEAGUES[competition] ||
      LEAGUES[schedule.competition?.code] ||
      (/^mls(?:\b|$)|major league soccer/.test(competition) ? "usa.1" : "");
    let result = null;
    let evidence = null;
    if (league) {
      // ESPN's single-day scoreboards use Eastern calendar days, including
      // late-night games whose UTC fixture date is already the following day.
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).formatToParts(new Date(fixture.timestamp || fixture.date));
      const date = ["year", "month", "day"]
        .map((part) => parts.find((entry) => entry.type === part).value)
        .join("");
      const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/scoreboard?dates=${date}&limit=100`;
      const data = await load(url);
      if (data.error || !Array.isArray(data.events)) {
        schedule.errors ||= [];
        schedule.errors.push(
          `Result verification failed (${league}, ${date}): ${data.error || "missing events"}`,
        );
        schedule.status = "partial";
      }
      const matches = (data.events || []).filter((event) => {
        const teams = event.competitions?.[0]?.competitors || [];
        return sameFixture(
          fixture,
          event.date,
          teams.find((team) => team.homeAway === "home")?.team?.displayName,
          teams.find((team) => team.homeAway === "away")?.team?.displayName,
        );
      });
      if (matches.length === 1) {
        const event = matches[0];
        const status = event.status?.type;
        if (
          status?.completed === true &&
          status.state === "post" &&
          !/CANCEL|ABANDON|POSTPON|SUSPEND/.test(status.name || "")
        ) {
          const teams = event.competitions[0].competitors;
          // Soccer competitor scores exclude the separate shootoutScore field.
          result = resultScores(
            teams.find((team) => team.homeAway === "home")?.score,
            teams.find((team) => team.homeAway === "away")?.score,
          );
          evidence = {
            source: "ESPN",
            eventId: String(event.id),
            reportedStatus: status.name,
            url,
          };
        }
      }
    }
    const sportDbId = fixture.sourceIds?.TheSportsDB;
    if (!result && /^\d+$/.test(String(sportDbId || ""))) {
      const url = `https://www.thesportsdb.com/api/v1/json/123/lookupevent.php?id=${sportDbId}`;
      const data = await load(url);
      const events = (data.events || []).filter(
        (event) =>
          String(event.idEvent) === String(sportDbId) &&
          sameFixture(
            fixture,
            event.dateEvent,
            event.strHomeTeam,
            event.strAwayTeam,
          ),
      );
      if (
        events.length === 1 &&
        FINISHED.has(String(events[0].strStatus).toLowerCase())
      ) {
        // Extra scores are shootout totals, not match goals.
        result = resultScores(events[0].intHomeScore, events[0].intAwayScore);
        evidence = {
          source: "TheSportsDB",
          eventId: String(sportDbId),
          reportedStatus: events[0].strStatus,
          url,
        };
      }
      if (data.error) {
        schedule.errors ||= [];
        schedule.errors.push(
          `Result verification failed (TheSportsDB ${sportDbId}): ${data.error}`,
        );
        schedule.status = "partial";
      }
    }
    if (!result) continue;
    for (const copy of copies) {
      copy.status = "FINISHED";
      copy.finalResult = result;
      copy.resultVerification = { ...evidence, checkedAt: generatedAt };
    }
    resolved++;
  }
  const failedRequests = (await Promise.all(requests.values())).filter(
    (data) => data.error,
  ).length;
  return { resolved, requests: requests.size, failedRequests };
}
