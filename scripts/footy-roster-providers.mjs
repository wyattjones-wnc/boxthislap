export function buildRosterProviderIndex(schedule = {}) {
  const byTeamId = new Map();
  const byName = new Map();
  const teamSchedules = Array.isArray(schedule.teamSchedules) ? schedule.teamSchedules : [];
  const competitionSchedules = Array.isArray(schedule.competitionSchedules) ? schedule.competitionSchedules : [];

  for (const group of teamSchedules) {
    const team = group?.team || {};
    const providerIds = normalizeProviderIds({
      ...(team.providerTeamIds || {}),
      ...(String(team.provider || "").toLowerCase() === "football-data.org" && team.providerTeamId
        ? { "football-data.org": team.providerTeamId }
        : {}),
      ...(team.sportDbTeamId ? { TheSportsDB: team.sportDbTeamId } : {}),
    });
    remember(byTeamId, team.id, providerIds);
    remember(byName, normalizeRosterClubName(team.name), providerIds);
  }

  for (const group of [...teamSchedules, ...competitionSchedules]) {
    for (const fixture of Array.isArray(group?.fixtures) ? group.fixtures : []) {
      const sources = [fixture.source, ...(Array.isArray(fixture.sources) ? fixture.sources : [])]
        .map((value) => String(value || "").toLowerCase());
      const isFootballData = sources.some((value) => value.includes("football-data.org"));
      for (const side of ["home", "away"]) {
        const providerIds = normalizeProviderIds({
          ...(isFootballData && fixture[`${side}ProviderTeamId`]
            ? { "football-data.org": fixture[`${side}ProviderTeamId`] }
            : {}),
          ...(fixture[`${side}SportDbTeamId`] ? { TheSportsDB: fixture[`${side}SportDbTeamId`] } : {}),
        });
        remember(byTeamId, fixture[`${side}TeamId`], providerIds);
        remember(byName, normalizeRosterClubName(fixture[side]), providerIds);
      }
    }
  }

  for (const team of Array.isArray(schedule.teamCatalog) ? schedule.teamCatalog : []) {
    const providerIds = normalizeProviderIds(team.providerTeamIds || {});
    remember(byTeamId, team.id, providerIds);
    remember(byName, normalizeRosterClubName(team.name), providerIds);
  }

  return { byName, byTeamId };
}

export function getRosterProviderIds(index, team = {}) {
  return normalizeProviderIds({
    ...(index?.byName?.get(normalizeRosterClubName(team.name)) || {}),
    ...(index?.byTeamId?.get(String(team.id || team.teamId || "").trim()) || {}),
    ...(team.providerTeamIds || {}),
  });
}

export function normalizeRosterClubName(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+(?:football club|association football club|afc|fc|cf|sc)$/i, "")
    .trim();
}

function normalizeProviderIds(value = {}) {
  const footballData = String(value["football-data.org"] || value.footballData || "").trim();
  const sportDb = String(value.TheSportsDB || value.thesportsdb || value.sportDb || "").trim();
  return {
    ...(footballData ? { "football-data.org": footballData } : {}),
    ...(sportDb ? { TheSportsDB: sportDb } : {}),
  };
}

function remember(index, key, providerIds) {
  const normalizedKey = String(key || "").trim();
  if (!normalizedKey || !Object.keys(providerIds).length) return;
  index.set(normalizedKey, { ...(index.get(normalizedKey) || {}), ...providerIds });
}
