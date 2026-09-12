import { normalizeLookupName } from "./tableUtils.js";

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

export function isFootyFriendlyFixture(fixture = {}) {
  if (typeof fixture.isFriendly === "boolean") return fixture.isFriendly;
  return (
    FRIENDLY_COMPETITION_IDS.has(String(fixture.leagueId || "").trim()) ||
    FRIENDLY_COMPETITION_NAMES.has(normalizeLookupName(fixture.league))
  );
}

export function normalizeFootyDateRange(rawStart, rawEnd) {
  const startValue = String(rawStart || "").trim();
  const endValue = String(rawEnd || "").trim();
  if (!startValue && !endValue) return null;
  const start = startValue || endValue;
  const end = endValue || startValue;
  return start <= end ? { start, end } : { start: end, end: start };
}

export function isFootyFixtureInDateRange(fixture, dateRange) {
  const fixtureDate = getFootyFixtureDateKey(fixture);
  return Boolean(
    fixtureDate &&
    fixtureDate >= dateRange.start &&
    fixtureDate <= dateRange.end,
  );
}

export function normalizeFootyPriority(priority) {
  return String(priority || "").trim();
}

export function getFootyFixtureSearchText(fixture) {
  return normalizeLookupName(
    [
      fixture.home,
      fixture.away,
      fixture.league,
      fixture.opponent,
      fixture.teamName,
      fixture.venue,
    ]
      .filter(Boolean)
      .join(" "),
  );
}

export function getFootyFixtureDateKey(fixture) {
  const date = String(fixture?.date || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  const timestamp = String(fixture?.timestamp || "").trim();
  const parsedDate = timestamp ? parseFootyDate(timestamp) : null;
  return !parsedDate || Number.isNaN(parsedDate.getTime())
    ? ""
    : parsedDate.toISOString().slice(0, 10);
}

export function getDefaultFootyTeams(
  fixtures = [],
  defaultPrioritySet = new Set(),
) {
  if (defaultPrioritySet.size === 0) return new Set();
  return new Set(
    fixtures
      .filter((fixture) =>
        defaultPrioritySet.has(normalizeFootyPriority(fixture.priority)),
      )
      .map((fixture) => getFootyTeamFilterKey(fixture.teamName))
      .filter(Boolean),
  );
}

export function getFootyFilterTeams(fixtures = []) {
  const teamsByKey = new Map();
  fixtures.forEach((fixture) => {
    const teamName = String(fixture?.teamName || "").trim();
    const teamKey = getFootyTeamFilterKey(teamName);
    if (!teamName || !teamKey) return;
    const existingTeamName = teamsByKey.get(teamKey);
    if (!existingTeamName || teamName.length > existingTeamName.length) {
      teamsByKey.set(teamKey, teamName);
    }
  });
  return [...teamsByKey.values()].sort((first, second) =>
    first.localeCompare(second),
  );
}

export function getFootyTeamFilterKey(teamName) {
  return normalizeFootyClubName(teamName) || normalizeLookupName(teamName);
}

export function normalizeFootyClubName(name) {
  return normalizeLookupName(name)
    .replace(/\b(afc|cf|fc|sc)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function compareFootyFixturesAscending(firstFixture, secondFixture) {
  return (
    getFootyFixtureSortTime(firstFixture) -
      getFootyFixtureSortTime(secondFixture) ||
    String(firstFixture.teamId || "").localeCompare(
      String(secondFixture.teamId || ""),
    ) ||
    String(firstFixture.teamName || "").localeCompare(
      String(secondFixture.teamName || ""),
    )
  );
}

export function compareFootyFixturesDescending(firstFixture, secondFixture) {
  return (
    getFootyFixtureSortTime(secondFixture) -
      getFootyFixtureSortTime(firstFixture) ||
    String(firstFixture.teamId || "").localeCompare(
      String(secondFixture.teamId || ""),
    ) ||
    String(firstFixture.teamName || "").localeCompare(
      String(secondFixture.teamName || ""),
    )
  );
}

export function getFootyFixtureSortTime(fixture) {
  const comparableTime = getFootyFixtureComparableTime(fixture);
  return Number.isFinite(comparableTime)
    ? comparableTime
    : Number.MAX_SAFE_INTEGER;
}

export function isFootyFixturePast(fixture, now = Date.now()) {
  if (hasFootyMatchNoteData(fixture)) return true;
  const pastCutoffTime = getFootyFixturePastCutoffTime(fixture);
  return Number.isFinite(pastCutoffTime) && pastCutoffTime < now;
}

export function isFootyFixtureStarted(fixture, now = Date.now()) {
  const fixtureTime = getFootyFixtureComparableTime(fixture);
  return Number.isFinite(fixtureTime) && fixtureTime < now;
}

export function hasFootyMatchNoteData(fixture) {
  const note = fixture?.matchNote;
  if (!note) return false;
  return Boolean(
    String(note.homeScore ?? "").trim() ||
    String(note.awayScore ?? "").trim() ||
    String(note.note ?? "").trim() ||
    String(note.highlightLink ?? "").trim() ||
    (Array.isArray(note.followGoalAssists) &&
      note.followGoalAssists.length > 0) ||
    (Array.isArray(note.opponentGoalAssists) &&
      note.opponentGoalAssists.length > 0),
  );
}

export function getFootyFixturePastCutoffTime(fixture) {
  const matchTime = getFootyFixtureComparableTime(fixture);
  if (!Number.isFinite(matchTime)) return Number.NaN;
  const matchDate = new Date(matchTime);
  const endOfDay = new Date(matchDate);
  endOfDay.setHours(23, 59, 59, 999);
  const nextDayStart = new Date(matchDate);
  nextDayStart.setHours(24, 0, 0, 0);
  const twelveHoursAfterMatch = matchTime + 12 * 60 * 60 * 1000;
  return endOfDay.getTime() - matchTime < 12 * 60 * 60 * 1000
    ? twelveHoursAfterMatch
    : nextDayStart.getTime();
}

export function getFootyFixtureComparableTime(fixture) {
  const timestamp = String(fixture?.timestamp || "").trim();
  const date = String(fixture?.date || "").trim();
  const time = String(fixture?.time || "").trim();
  const parsedTimestamp = timestamp
    ? parseFootyDate(timestamp).getTime()
    : Number.NaN;
  if (time && Number.isFinite(parsedTimestamp)) return parsedTimestamp;
  if (date) return Date.parse(`${date}T23:59:59`);
  return parsedTimestamp;
}

export function isFootyFixtureWithinNextDay(fixture, now = Date.now()) {
  const fixtureTime = getFootyFixtureComparableTime(fixture);
  return (
    Number.isFinite(fixtureTime) &&
    fixtureTime >= now &&
    fixtureTime <= now + 24 * 60 * 60 * 1000
  );
}

export function getFootyFixtureTimingLabel(fixture, now = Date.now()) {
  if (isFootyFixtureCurrent(fixture, now)) return "Today";
  return isFootyFixtureWithinNextDay(fixture, now) ? "Next 24h" : "";
}

export function isFootyFixtureCurrent(fixture, now = Date.now()) {
  const fixtureTime = getFootyFixtureComparableTime(fixture);
  const pastCutoffTime = getFootyFixturePastCutoffTime(fixture);
  if (!Number.isFinite(fixtureTime) || !Number.isFinite(pastCutoffTime)) {
    return getFootyFixtureDateKey(fixture) === getEasternDateKey(now);
  }
  return fixtureTime <= now && now <= pastCutoffTime;
}

export function groupFootyFixturesByCalendarWeek(fixtures = []) {
  const groups = [];
  fixtures.forEach((fixture) => {
    const week = getFootyCalendarWeek(fixture);
    let group = groups.find((record) => record.key === week.key);
    if (!group) {
      group = { ...week, fixtures: [] };
      groups.push(group);
    }
    group.fixtures.push(fixture);
  });
  return groups;
}

export function getFootyCalendarWeek(fixture = {}) {
  const dateKey = getFootyFixtureDateKey(fixture);
  if (!dateKey) return { key: "date-tbc", label: "Date TBC" };
  const fixtureDate = new Date(`${dateKey}T12:00:00`);
  if (Number.isNaN(fixtureDate.getTime()))
    return { key: "date-tbc", label: "Date TBC" };
  const weekStart = new Date(fixtureDate);
  const daysSinceMonday = (weekStart.getDay() + 6) % 7;
  weekStart.setDate(weekStart.getDate() - daysSinceMonday);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const startLabel = weekStart.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  const endLabel = weekEnd.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return {
    key: formatLocalDateKey(weekStart),
    label: `${startLabel} – ${endLabel}`,
  };
}

function parseFootyDate(value) {
  return new Date(
    String(value || "")
      .trim()
      .replace(/T(\d)(?=:)/, "T0$1"),
  );
}

function formatLocalDateKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function getEasternDateKey(now) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      day: "2-digit",
      month: "2-digit",
      timeZone: "America/New_York",
      year: "numeric",
    })
      .formatToParts(new Date(now))
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}
