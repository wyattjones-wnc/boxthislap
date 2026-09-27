export const GROSS_BONUS_TIERS = Object.freeze([
  { minimum: 200_000_000, points: 105 },
  { minimum: 150_000_000, points: 80 },
  { minimum: 100_000_000, points: 45 },
  { minimum: 75_000_000, points: 25 },
  { minimum: 50_000_000, points: 15 },
  { minimum: 25_000_000, points: 5 },
]);

function finiteOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function grossBonusPoints(domesticGross) {
  const gross = finiteOrNull(domesticGross);
  if (gross === null || gross < 0) return 0;
  return GROSS_BONUS_TIERS.find((tier) => gross >= tier.minimum)?.points ?? 0;
}

export function scoreFantasyOfficeMovie(movie) {
  const domesticGross = finiteOrNull(movie.domesticGross);
  const letterboxdRating = finiteOrNull(movie.letterboxdRating);
  const tomatometer = finiteOrNull(movie.tomatometer);
  const numberOneWeekends = finiteOrNull(movie.numberOneWeekends);
  const awardPoints = finiteOrNull(movie.awardPoints) ?? 0;
  const grossBase =
    domesticGross === null ? 0 : Math.round(domesticGross / 1_000_000);
  const grossBonus = grossBonusPoints(domesticGross);
  const numberOneBonus = Math.max(0, Math.trunc(numberOneWeekends ?? 0)) * 10;
  const boxOfficePoints = grossBase + grossBonus + numberOneBonus;
  const letterboxdPoints =
    letterboxdRating === null ? 0 : Math.round(letterboxdRating * 10) * 10;
  const rottenTomatoesPoints =
    tomatometer === null ? 0 : Math.round(tomatometer) * 5;
  const criticalPoints = letterboxdPoints + rottenTomatoesPoints;

  return {
    awardPoints,
    boxOfficePoints,
    criticalPoints,
    grossBase,
    grossBonus,
    letterboxdPoints,
    numberOneBonus,
    points: boxOfficePoints + criticalPoints + awardPoints,
    rottenTomatoesPoints,
    provisional:
      domesticGross === null ||
      letterboxdRating === null ||
      tomatometer === null,
  };
}

export function buildFantasyOfficeStandings(movies) {
  const managers = new Map();
  for (const movie of movies.filter((entry) => entry.active)) {
    const score = scoreFantasyOfficeMovie(movie);
    const row = managers.get(movie.manager) ?? {
      awardPoints: 0,
      boxOfficePoints: 0,
      criticalPoints: 0,
      manager: movie.manager,
      movies: [],
      points: 0,
      provisional: false,
    };
    row.awardPoints += score.awardPoints;
    row.boxOfficePoints += score.boxOfficePoints;
    row.criticalPoints += score.criticalPoints;
    row.points += score.points;
    row.provisional ||= score.provisional;
    row.movies.push({ ...movie, score });
    managers.set(movie.manager, row);
  }

  const standings = [...managers.values()].sort(
    (first, second) =>
      second.points - first.points ||
      first.manager.localeCompare(second.manager),
  );
  let previousPoints = null;
  let previousRank = 0;
  standings.forEach((row, index) => {
    row.rank = row.points === previousPoints ? previousRank : index + 1;
    previousPoints = row.points;
    previousRank = row.rank;
  });
  return standings;
}
