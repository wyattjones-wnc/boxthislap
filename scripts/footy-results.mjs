import {
  getFootyFixtureSourceIdentities,
  isFootyFixtureFollowed,
} from "../modules/footyMatchActions.js";

// Keep provider results separate from manually curated match-note fields.
export function finalFootballDataResult(match) {
  if (match.status !== "FINISHED") return null;
  const score = match.score || {};
  // football-data fullTime includes shootouts for penalty-decided matches.
  // Provider shootout totals are ambiguous; leave these for manual entry.
  if (score.duration === "PENALTY_SHOOTOUT") return null;
  const totals = score.fullTime;
  return resultScores(totals?.home, totals?.away);
}

export function resultScores(home, away) {
  const valid = (value) =>
    value !== null && value !== undefined && /^\d+$/.test(String(value));
  return valid(home) && valid(away)
    ? { homeScore: String(home), awayScore: String(away) }
    : null;
}

export function collectFinalResults(fixtures, { manualTeamIds = [] } = {}) {
  const identities = (fixture) => [
    ...(fixture.matchId ? [`match:${fixture.matchId}`] : []),
    ...getFootyFixtureSourceIdentities(fixture).map(
      (identity) => `source:${identity}`,
    ),
  ];
  const manualMatches = new Set(
    fixtures
      .filter((fixture) => isFootyFixtureFollowed(fixture, manualTeamIds))
      .flatMap(identities),
  );
  const results = new Map();
  for (const fixture of fixtures) {
    if (identities(fixture).some((identity) => manualMatches.has(identity)))
      continue;
    // Unknown sides cannot safely be classified as an unfollowed match.
    if (manualTeamIds.length && (!fixture.homeTeamId || !fixture.awayTeamId))
      continue;
    if (
      !fixture.matchId ||
      ![
        "finished",
        "final",
        "ft",
        "aet",
        "match finished",
        "after extra time",
        "played",
        "full time",
        "post match",
      ].includes(String(fixture.status).toLowerCase())
    )
      continue;
    const score = resultScores(
      fixture.finalResult?.homeScore,
      fixture.finalResult?.awayScore,
    );
    if (score && !results.has(fixture.matchId))
      results.set(fixture.matchId, { matchId: fixture.matchId, ...score });
  }
  return [...results.values()];
}

export async function syncFinalResults(
  fixtures,
  {
    endpoint,
    token,
    fetchImpl = fetch,
    followedTeamsEndpoint = process.env.FOOTY_MANUAL_TEAMS_ENDPOINT ||
      "https://box-this-lap-rankings.boxthislap.workers.dev/api/managers/6/followed-teams",
  },
) {
  if (!endpoint || !token)
    throw new Error(
      "Footy result sync requires FOOTY_RESULTS_SYNC_ENDPOINT and FOOTY_RESULTS_SYNC_TOKEN.",
    );
  // Notes are shared, so automation follows the current default/admin selection.
  // Failure must stop writes rather than treating unknown preferences as empty.
  const selectionResponse = await fetchImpl(followedTeamsEndpoint);
  if (!selectionResponse.ok)
    throw new Error(
      `Followed-team selection failed (${selectionResponse.status}).`,
    );
  const selection = await selectionResponse.json();
  if (!selection.ok || !Array.isArray(selection.teams))
    throw new Error("Followed-team selection is unavailable.");
  const manualTeamIds = selection.teams.map((team) => String(team.teamId));
  const results = collectFinalResults(fixtures, { manualTeamIds });
  const notes = [];
  for (let index = 0; index < results.length; index += 20) {
    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Results-Sync-Token": token,
      },
      body: JSON.stringify({
        results: results.slice(index, index + 20).map((result) => {
          const fixture = fixtures.find(
            (entry) => entry.matchId === result.matchId,
          );
          return {
            ...result,
            homeTeamId: fixture.homeTeamId,
            awayTeamId: fixture.awayTeamId,
          };
        }),
      }),
    });
    const data = await response.json();
    if (!response.ok || !data.ok)
      throw new Error(data.error || `Result sync failed (${response.status}).`);
    notes.push(...data.notes);
  }
  return notes;
}
