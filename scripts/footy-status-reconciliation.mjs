import { isSameFootballClubName } from "./footy-club-names.mjs";

const ESPN_LEAGUES = {
  PL: "eng.1", ELC: "eng.2", PD: "esp.1", BL1: "ger.1", SA: "ita.1",
  FL1: "fra.1", PPL: "por.1", DED: "ned.1", CL: "uefa.champions",
  EL: "uefa.europa", MLS: "usa.1",
};
const INTERRUPTED = {
  STATUS_POSTPONED: "POSTPONED",
  STATUS_SUSPENDED: "SUSPENDED",
  // An abandoned match has no valid upcoming kickoff; retain ESPN's exact label below.
  STATUS_ABANDONED: "SUSPENDED",
  STATUS_CANCELED: "CANCELLED",
  STATUS_CANCELLED: "CANCELLED",
};
const PENDING = new Set(["SCHEDULED", "TIMED", "POSTPONED", "SUSPENDED"]);

export async function reconcileFootyStatuses({ schedules, previousSchedules = [], generatedAt, loadJson }) {
  const requests = new Map();
  const previous = new Map(previousSchedules.flatMap((s) => s.fixtures || [])
    .filter((f) => f.matchId).map((f) => [f.matchId, f]));
  const now = Date.parse(generatedAt);
  for (const schedule of schedules) {
    const league = ESPN_LEAGUES[schedule.competition?.code];
    if (!league) continue;
    schedule.notes ||= [];
    schedule.errors ||= [];
    for (const fixture of schedule.fixtures || []) {
      if (!PENDING.has(fixture.status)) continue;
      const prior = previous.get(fixture.matchId);
      if (prior?.statusVerification && INTERRUPTED[prior.statusVerification.reportedStatus] &&
          Date.parse(prior.timestamp) === Date.parse(fixture.timestamp)) {
        fixture.status = prior.status;
        fixture.statusVerification = prior.statusVerification;
      }
      const age = now - Date.parse(fixture.timestamp);
      if (!Number.isFinite(age) || age < -7 * 86400000 || age > 14 * 86400000) continue;
      const date = String(fixture.timestamp).slice(0, 10).replaceAll("-", "");
      const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/scoreboard?dates=${date}`;
      if (!requests.has(url)) requests.set(url, loadJson(url).catch((error) => ({ error: error.message })));
      const data = await requests.get(url);
      if (data.error || !Array.isArray(data.events)) {
        const message = `ESPN status verification failed (${league}, ${date}): ${data.error || "missing events"}`;
        if (!schedule.errors.includes(message)) schedule.errors.push(message);
        schedule.status = "partial";
        continue;
      }
      const matches = data.events.filter((event) => {
        const competitors = event.competitions?.[0]?.competitors || [];
        const home = competitors.find((team) => team.homeAway === "home")?.team?.displayName;
        const away = competitors.find((team) => team.homeAway === "away")?.team?.displayName;
        return String(event.date).slice(0, 10) === String(fixture.timestamp).slice(0, 10) &&
          isSameFootballClubName(home, fixture.home) && isSameFootballClubName(away, fixture.away);
      });
      if (matches.length !== 1) continue;
      const event = matches[0];
      const reportedStatus = event.status?.type?.name;
      if (!INTERRUPTED[reportedStatus]) continue;
      fixture.status = INTERRUPTED[reportedStatus];
      fixture.statusVerification = { source: "ESPN", eventId: String(event.id), reportedStatus, checkedAt: generatedAt, url };
      schedule.notes.push(`ESPN confirmed ${fixture.home} v ${fixture.away}: ${event.status.type.description || reportedStatus}.`);
    }
  }
}
