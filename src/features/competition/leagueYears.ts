import { FANTASY_LEAGUES_BY_YEAR } from "../../../modules/siteConfig.js";

export function defaultLeagueYear(years: number[], now = new Date()): number {
  const current = now.getUTCFullYear();
  const eligible = years.filter((year) => year <= current);
  return eligible.length ? Math.max(...eligible) : current;
}

export function leagueDestination(league: string, year: number): string | null {
  if (year === 2027 && ["Fantasy Office", "World Cup"].includes(league))
    return `${league === "Fantasy Office" ? "fantasy-office" : "world-cup"}-2027-draft`;
  if (league === "World Cup" && year === 2026) return "results";
  if (league === "Fantasy Critic" && [2025, 2026].includes(year))
    return `fantasy-critic-${year}`;
  if (league === "Formula 1" && [2024, 2025, 2026].includes(year))
    return `formula-1-${year}-questions`;
  if (league === "Fantasy Office" && [2025, 2026].includes(year))
    return `fantasy-office-${year}-${year === 2026 ? "draft" : "results"}`;
  return null;
}

export const leaguesByYear: Record<number, string[]> = FANTASY_LEAGUES_BY_YEAR;
