export const WILDCARD_POINTS = Object.freeze({
  1: 233, 2: 200, 3: 180, 4: 155, 5: 135, 6: 115, 7: 100, 8: 85,
  9: 60, 10: 50, 11: 45, 12: 40, 13: 35, 14: 30, 15: 25, 16: 20,
  17: 15, 18: 10, 19: 5, 20: 0, 21: 0, 22: 0,
});

export function scorePodiumPick(slot, finishPosition) {
  const selectedPosition = Number(slot);
  const actualPosition = Number(finishPosition);
  if (!Number.isInteger(actualPosition) || actualPosition < 1 || actualPosition > 3) return 0;
  if (selectedPosition === actualPosition) return selectedPosition === 1 ? 60 : 50;
  return 25;
}

export function scoreWildcardPosition(position) {
  return WILDCARD_POINTS[Number(position)] ?? 0;
}

export function scoreWeeklyEntry(entry, qualifyingResults = [], raceResults = []) {
  const qualifying = new Map(qualifyingResults.map((result) => [result.driver_id, result.position]));
  const race = new Map(raceResults.map((result) => [result.driver_id, result.position]));
  const p1Points = scorePodiumPick(1, race.get(entry.p1_driver_id));
  const p2Points = scorePodiumPick(2, race.get(entry.p2_driver_id));
  const p3Points = scorePodiumPick(3, race.get(entry.p3_driver_id));
  const wildcardQualifyingPoints = scoreWildcardPosition(qualifying.get(entry.wildcard_driver_id));
  const wildcardRacePoints = scoreWildcardPosition(race.get(entry.wildcard_driver_id));
  return {
    p1Points,
    p2Points,
    p3Points,
    wildcardQualifyingPoints,
    wildcardRacePoints,
    totalPoints: p1Points + p2Points + p3Points + wildcardQualifyingPoints + wildcardRacePoints,
  };
}

export function buildWeeklyStandings(scores = []) {
  const scoresByManager = new Map();
  for (const score of scores) {
    const managerId = String(score.manager_id ?? score.managerId ?? "").trim();
    const round = Number(score.round);
    if (!managerId || !Number.isInteger(round) || round < 1) continue;
    if (!scoresByManager.has(managerId)) scoresByManager.set(managerId, []);
    scoresByManager.get(managerId).push({ round, points: Number(score.total_points ?? score.totalPoints) || 0 });
  }

  const standings = [...scoresByManager.entries()].map(([managerId, managerScores]) => {
    const blocks = new Map();
    for (const score of managerScores) {
      const block = Math.floor((score.round - 1) / 8) + 1;
      if (!blocks.has(block)) blocks.set(block, []);
      blocks.get(block).push(score);
    }
    const blockTotals = [...blocks.entries()].sort(([first], [second]) => first - second).map(([block, blockScores]) => {
      const counted = [...blockScores].sort((first, second) => second.points - first.points || first.round - second.round).slice(0, 4);
      return { block, points: counted.reduce((total, score) => total + score.points, 0), countedRounds: counted.map((score) => score.round) };
    });
    return { managerId, points: blockTotals.reduce((total, block) => total + block.points, 0), blockTotals };
  }).sort((first, second) => second.points - first.points || first.managerId.localeCompare(second.managerId, undefined, { numeric: true }));

  let previousPoints = null;
  let previousRank = 0;
  return standings.map((standing, index) => {
    const rank = standing.points === previousPoints ? previousRank : index + 1;
    previousPoints = standing.points;
    previousRank = rank;
    return { ...standing, rank };
  });
}
