export function getFootyNotificationFixtures(schedule = {}) {
  const fixtures = [
    ...(schedule.teamSchedules || []).flatMap((entry) => entry.fixtures || []),
    ...(schedule.competitionSchedules || []).flatMap((entry) => entry.fixtures || []),
  ];
  const unique = new Map();
  fixtures.forEach((fixture) => {
    const key = getFixtureIdentity(fixture);
    if (key && !unique.has(key)) unique.set(key, fixture);
  });
  return [...unique.values()];
}

export function isFootyFixtureFollowed(fixture = {}, followedTeamIds = []) {
  const followed = new Set([...followedTeamIds].map(String));
  return [fixture.teamId, fixture.homeTeamId, fixture.awayTeamId]
    .map((value) => String(value || "").trim())
    .some((teamId) => teamId && followed.has(teamId));
}

export function buildFootyNextItemDefaults(fixture = {}, timeZone = "America/New_York") {
  const timestamp = Date.parse(String(fixture.timestamp || ""));
  let date = String(fixture.date || "").trim();
  let time = normalizeTime(fixture.time);

  if (Number.isFinite(timestamp)) {
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
      minute: "2-digit",
      month: "2-digit",
      timeZone,
      year: "numeric",
    }).formatToParts(new Date(timestamp)).map((part) => [part.type, part.value]));
    date = `${parts.year}-${parts.month}-${parts.day}`;
    time = `${parts.hour === "24" ? "00" : parts.hour}:${parts.minute}`;
  }

  return {
    date,
    sourceMatchId: String(fixture.matchId || fixture.id || "").trim(),
    thing: `${String(fixture.home || "TBD").trim() || "TBD"} v ${String(fixture.away || "TBD").trim() || "TBD"}`,
    time,
  };
}

function getFixtureIdentity(fixture = {}) {
  return String(fixture.matchId || fixture.id || "").trim() || [
    String(fixture.date || "").trim(),
    String(fixture.home || "").trim().toLowerCase(),
    String(fixture.away || "").trim().toLowerCase(),
  ].filter(Boolean).join("|");
}

function normalizeTime(value) {
  const match = String(value || "").trim().match(/^(\d{1,2}):(\d{2})/);
  return match ? `${match[1].padStart(2, "0")}:${match[2]}` : "";
}
