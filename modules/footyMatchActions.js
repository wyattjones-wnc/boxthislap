export function getFootyNotificationFixtures(schedule = {}) {
  const fixtures = [
    ...(schedule.teamSchedules || []).flatMap((entry) => entry.fixtures || []),
    ...(schedule.competitionSchedules || []).flatMap((entry) => entry.fixtures || []),
  ];
  const unique = [];
  const recordsByIdentity = new Map();
  fixtures.forEach((fixture) => {
    const identities = getFootyFixtureIdentities(fixture);
    const existing = identities.map((identity) => recordsByIdentity.get(identity)).find(Boolean);
    const record = existing || { fixture };
    if (!existing) unique.push(record);
    identities.forEach((identity) => recordsByIdentity.set(identity, record));
  });
  return unique.map((record) => record.fixture);
}

export function getFootyFixtureSourceIdentities(fixture = {}) {
  const sourceIds = fixture.sourceIds && typeof fixture.sourceIds === "object" && !Array.isArray(fixture.sourceIds)
    ? fixture.sourceIds
    : {};
  const identities = Object.entries(sourceIds)
    .map(([source, id]) => `${normalizeIdentityPart(source)}:${normalizeIdentityPart(id)}`)
    .filter((identity) => !identity.startsWith(":") && !identity.endsWith(":"));

  if (!identities.length && fixture.source && fixture.id) {
    const source = normalizeIdentityPart(fixture.source);
    const rawId = normalizeIdentityPart(fixture.id);
    const id = rawId.startsWith(`${source}:`) ? rawId.slice(source.length + 1) : rawId;
    identities.push(`${source}:${id}`);
  }

  return [...new Set(identities)].sort();
}

export function findFootyFixtureBySharedIdentity(fixtures = [], target = {}) {
  const targetMatchId = String(target.matchId || target.id || "").trim();
  const targetSources = new Set(getFootyFixtureSourceIdentities(target));

  return fixtures.find((fixture) => {
    const matchId = String(fixture.matchId || fixture.id || "").trim();
    return Boolean(targetMatchId && matchId === targetMatchId) ||
      getFootyFixtureSourceIdentities(fixture).some((identity) => targetSources.has(identity));
  }) || null;
}

export function isFootyFixtureFollowed(fixture = {}, followedTeamIds = []) {
  const followed = new Set([...followedTeamIds].map(String));
  return [fixture.teamId, fixture.homeTeamId, fixture.awayTeamId]
    .map((value) => String(value || "").trim())
    .some((teamId) => teamId && followed.has(teamId));
}

export function shouldOfferFootyMatchNotification(fixture = {}, options = {}) {
  if (!options.followedTeamsLoaded || !options.matchNotificationsLoaded) return false;
  const matchId = String(fixture.matchId || fixture.id || "").trim();
  if (!matchId || new Set((options.matchNotificationIds || []).map(String)).has(matchId)) return false;
  return !isFootyFixtureFollowed(fixture, options.notificationTeamIds || []);
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

function getFootyFixtureIdentities(fixture = {}) {
  return [...new Set([
    ...getFootyFixtureSourceIdentities(fixture).map((identity) => `source:${identity}`),
    `fixture:${getFixtureIdentity(fixture)}`,
  ].filter((identity) => !identity.endsWith(":")))];
}

function normalizeIdentityPart(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeTime(value) {
  const match = String(value || "").trim().match(/^(\d{1,2}):(\d{2})/);
  return match ? `${match[1].padStart(2, "0")}:${match[2]}` : "";
}
