const DATE_BLOCK_PATTERN = /<p><b>(?:[A-Za-z]+\s+)?(\d{1,2}\s+[A-Za-z]+)<\/b><\/p>\s*<p>([\s\S]*?)<\/p>/g;
const MATCH_PATTERN = /([A-D]\d)\s*<a\b[^>]*href="[^"]*\/match\/(\d+)--[^"]*"[^>]*>([\s\S]*?)<\/a>(?:\s*\((\d{1,2}:\d{2})\))?/g;

export function parseUefaNationsLeagueFixtures(html, { seasonYear = new Date().getUTCFullYear() } = {}) {
  const fixtures = [];
  const fixtureSection = String(html || "").split("League phase fixtures and results")[1] || "";

  for (const dateMatch of fixtureSection.matchAll(DATE_BLOCK_PATTERN)) {
    const date = parseUefaDate(dateMatch[1], seasonYear);

    if (!date) continue;

    for (const match of dateMatch[2].matchAll(MATCH_PATTERN)) {
      const teams = parseUefaMatchLabel(decodeHtml(stripTags(match[3])));

      if (!teams) continue;

      const time = match[4] || "20:45";
      const timestamp = centralEuropeanTimeToUtc(date, time);

      fixtures.push({
        away: teams.away,
        awayBadge: "",
        date,
        home: teams.home,
        homeBadge: "",
        id: match[2],
        isCompetitionFixture: true,
        league: "UEFA Nations League",
        leagueId: "4490",
        round: match[1],
        score: teams.score,
        source: "UEFA.com",
        sourceIds: { "UEFA.com": match[2] },
        sources: ["UEFA.com"],
        status: teams.score ? "FINISHED" : "SCHEDULED",
        time: `${time}:00`,
        timestamp,
        venue: "",
      });
    }
  }

  return fixtures;
}

function parseUefaMatchLabel(label) {
  const normalized = String(label || "").replace(/\s+/g, " ").trim();
  const upcoming = normalized.match(/^(.*?)\s+vs\s+(.*?)$/i);

  if (upcoming) {
    return { away: upcoming[2].trim(), home: upcoming[1].trim(), score: "" };
  }

  const completed = normalized.match(/^(.*?)\s+(\d+)\s*[-–]\s*(\d+)\s+(.*?)$/);

  return completed
    ? {
        away: completed[4].trim(),
        home: completed[1].trim(),
        score: `${completed[2]}-${completed[3]}`,
      }
    : null;
}

function parseUefaDate(value, year) {
  const match = String(value || "").trim().match(/^(\d{1,2})\s+([A-Za-z]+)$/);

  if (!match) return "";

  const parsed = new Date(`${match[2]} ${match[1]}, ${year} 12:00:00 UTC`);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
}

function centralEuropeanTimeToUtc(date, time) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  let utcTime = Date.UTC(year, month - 1, day, hour, minute);

  for (let attempt = 0; attempt < 2; attempt += 1) {
    utcTime = Date.UTC(year, month - 1, day, hour, minute) - getTimeZoneOffsetMs(new Date(utcTime), "Europe/Paris");
  }

  return new Date(utcTime).toISOString();
}

function getTimeZoneOffsetMs(date, timeZone) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    month: "2-digit",
    second: "2-digit",
    timeZone,
    year: "numeric",
  }).formatToParts(date).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  const zonedTime = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second));
  return zonedTime - date.getTime();
}

function stripTags(value) {
  return String(value || "").replace(/<[^>]+>/g, "");
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
}
