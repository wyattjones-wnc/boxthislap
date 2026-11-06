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

export function collectFinalResults(fixtures) {
  const results = new Map();
  for (const fixture of fixtures) {
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
  { endpoint, token, fetchImpl = fetch },
) {
  if (!endpoint || !token)
    throw new Error(
      "Footy result sync requires FOOTY_RESULTS_SYNC_ENDPOINT and FOOTY_RESULTS_SYNC_TOKEN.",
    );
  const results = collectFinalResults(fixtures);
  const notes = [];
  for (let index = 0; index < results.length; index += 100) {
    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Results-Sync-Token": token,
      },
      body: JSON.stringify({ results: results.slice(index, index + 100) }),
    });
    const data = await response.json();
    if (!response.ok || !data.ok)
      throw new Error(data.error || `Result sync failed (${response.status}).`);
    notes.push(...data.notes);
  }
  return notes;
}
