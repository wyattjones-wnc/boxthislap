export function attachCanonicalFootyTeams({ competitionSchedules = [], teamSchedules = [] } = {}) {
  const catalog = new Map();
  const configuredByName = new Map();

  for (const teamSchedule of teamSchedules) {
    const team = teamSchedule?.team || {};
    const id = String(team.id || "").trim();
    const name = String(team.name || "").trim();
    if (!id || !name) continue;
    configuredByName.set(normalizeName(name), id);
    rememberTeam(catalog, {
      active: true,
      badge: team.badge || "",
      id,
      leagues: team.league ? [{ id: slug(team.league), name: team.league }] : [],
      name,
      prettyName: team.prettyName || name,
    });
  }

  for (const teamSchedule of teamSchedules) {
    for (const fixture of Array.isArray(teamSchedule?.fixtures) ? teamSchedule.fixtures : []) {
      const id = String(fixture.teamId || teamSchedule?.team?.id || "").trim();
      if (!id) continue;
      const followedName = normalizeName(fixture.teamName || teamSchedule?.team?.name);
      if (followedName) configuredByName.set(followedName, id);
      const side = fixture.isHome ? "home" : "away";
      const sideName = normalizeName(fixture[side]);
      if (sideName) configuredByName.set(sideName, id);
    }
  }

  const fixtureGroups = [...teamSchedules, ...competitionSchedules];
  for (const group of fixtureGroups) {
    const competition = group?.competition || {};
    const fixtures = Array.isArray(group?.fixtures) ? group.fixtures : [];
    for (const fixture of fixtures) {
      const league = {
        id: String(competition.key || competition.id || fixture.leagueId || slug(fixture.league)).trim(),
        name: String(competition.name || fixture.league || "Competition").trim(),
      };
      fixture.homeTeamId = resolveTeamId(fixture, "home", configuredByName);
      fixture.awayTeamId = resolveTeamId(fixture, "away", configuredByName);
      rememberTeam(catalog, {
        active: true,
        badge: fixture.homeBadge || (fixture.teamId === fixture.homeTeamId ? fixture.teamBadge : ""),
        id: fixture.homeTeamId,
        leagues: [league],
        name: fixture.home,
        prettyName: fixture.home,
      });
      rememberTeam(catalog, {
        active: true,
        badge: fixture.awayBadge || (fixture.teamId === fixture.awayTeamId ? fixture.teamBadge : ""),
        id: fixture.awayTeamId,
        leagues: [league],
        name: fixture.away,
        prettyName: fixture.away,
      });
    }
  }

  return [...catalog.values()]
    .map((team) => ({ ...team, leagues: team.leagues.sort(compareLeague) }))
    .sort((left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id));
}

function resolveTeamId(fixture, side, configuredByName) {
  const name = String(fixture?.[side] || "").trim();
  const configuredId = configuredByName.get(normalizeName(name));
  if (configuredId) return configuredId;

  const explicit = String(fixture?.[`${side}TeamId`] || "").trim();
  if (explicit.startsWith("legacy:")) return `team:${explicit.slice("legacy:".length)}`;
  if (explicit) return explicit;

  // Canonical IDs are assigned while building reference data and written into each
  // event. Runtime preference and notification matching never falls back to names.
  return name ? `team:${slug(name)}` : "";
}

function rememberTeam(catalog, candidate) {
  const id = String(candidate.id || "").trim();
  const name = String(candidate.name || "").trim();
  if (!id || !name) return;
  const existing = catalog.get(id);
  if (!existing) {
    catalog.set(id, {
      active: candidate.active !== false,
      badge: String(candidate.badge || "").trim(),
      id,
      leagues: uniqueLeagues(candidate.leagues),
      name,
      prettyName: String(candidate.prettyName || name).trim(),
    });
    return;
  }
  existing.badge ||= String(candidate.badge || "").trim();
  existing.leagues = uniqueLeagues([...existing.leagues, ...(candidate.leagues || [])]);
}

function uniqueLeagues(leagues = []) {
  const values = new Map();
  for (const league of leagues) {
    const id = String(league?.id || slug(league?.name)).trim();
    const name = String(league?.name || "Competition").trim();
    if (id) values.set(id, { id, name });
  }
  return [...values.values()];
}

function compareLeague(left, right) {
  return left.name.localeCompare(right.name) || left.id.localeCompare(right.id);
}

function normalizeName(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function slug(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "team";
}
