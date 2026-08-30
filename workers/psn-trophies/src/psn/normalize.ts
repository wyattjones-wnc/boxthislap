import type { TrophyTitle, TitleTrophiesResponse, TitleTrophyGroupsResponse, UserTrophiesEarnedForTitleResponse } from "psn-api";
import type { NormalizedGame, NormalizedTrophy, NormalizedTrophyGroup, TrophyCounts, TrophyType } from "../types";

export function normalizeProofGame(
  summary: TrophyTitle,
  metadata: TitleTrophiesResponse,
  earnings: UserTrophiesEarnedForTitleResponse,
  groups: TitleTrophyGroupsResponse,
): { game: NormalizedGame; trophies: NormalizedTrophy[]; groups: NormalizedTrophyGroup[] } {
  const earnedById = new Map(earnings.trophies.map((trophy) => [trophy.trophyId, trophy]));
  const trophies = metadata.trophies.map((trophy): NormalizedTrophy => {
    const earned = earnedById.get(trophy.trophyId);
    const isEarned = earned?.earned === true;
    return {
      gameId: summary.npCommunicationId,
      trophyId: trophy.trophyId,
      groupId: trophy.trophyGroupId || null,
      name: trophy.trophyName?.trim() || `Trophy ${trophy.trophyId}`,
      description: cleanOptional(trophy.trophyDetail),
      type: normalizeTrophyType(trophy.trophyType),
      iconUrl: cleanOptional(trophy.trophyIconUrl),
      earned: isEarned,
      earnedAt: isEarned ? normalizeUtcTimestamp(earned.earnedDateTime) : null,
      rarityClass: finiteNumber(earned?.trophyRare),
      earnedRate: finiteNumber(earned?.trophyEarnedRate),
      progress: null,
    };
  });

  const earnedDates = trophies
    .map((trophy) => trophy.earnedAt)
    .filter((value): value is string => Boolean(value))
    .sort();
  const platinum = trophies.find((trophy) => trophy.type === "platinum");
  const is100Percent = trophies.length > 0 && trophies.every((trophy) => trophy.earned);

  const game: NormalizedGame = {
    id: summary.npCommunicationId,
    npCommunicationId: summary.npCommunicationId,
    name: summary.trophyTitleName.trim(),
    platforms: normalizePlatforms(summary.trophyTitlePlatform),
    iconUrl: cleanOptional(summary.trophyTitleIconUrl),
    progress: boundedPercent(summary.progress),
    earned: normalizeCounts(summary.earnedTrophies),
    defined: normalizeCounts(summary.definedTrophies),
    sourceUpdatedAt: normalizeUtcTimestamp(summary.lastUpdatedDateTime),
    hasPlatinum: Boolean(platinum || summary.definedTrophies.platinum),
    platinumEarned: platinum?.earned === true,
    firstTrophyAt: earnedDates[0] || null,
    latestTrophyAt: earnedDates.at(-1) || null,
    platinumEarnedAt: platinum?.earnedAt || null,
    completion100At: is100Percent ? earnedDates.at(-1) || null : null,
    is100Percent,
  };

  return {
    game,
    trophies,
    groups: groups.trophyGroups.map((group) => ({
      gameId: summary.npCommunicationId,
      groupId: group.trophyGroupId,
      name: cleanOptional(group.trophyGroupName),
      iconUrl: cleanOptional(group.trophyGroupIconUrl),
      defined: normalizeCounts(group.definedTrophies),
    })),
  };
}

export function normalizeUtcTimestamp(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizePlatforms(value: unknown): string[] {
  return String(value || "")
    .split(",")
    .map((platform) => platform.trim())
    .filter(Boolean);
}

function normalizeCounts(value: Partial<TrophyCounts> | null | undefined): TrophyCounts {
  return {
    bronze: nonNegativeInteger(value?.bronze),
    silver: nonNegativeInteger(value?.silver),
    gold: nonNegativeInteger(value?.gold),
    platinum: nonNegativeInteger(value?.platinum),
  };
}

function normalizeTrophyType(value: string): TrophyType {
  if (["bronze", "silver", "gold", "platinum"].includes(value)) return value as TrophyType;
  throw new Error(`Unsupported PSN trophy type: ${value}`);
}

function finiteNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function nonNegativeInteger(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.trunc(number)) : 0;
}

function boundedPercent(value: unknown): number {
  return Math.min(100, nonNegativeInteger(value));
}

function cleanOptional(value: unknown): string | null {
  const text = typeof value === "string" ? value.trim() : "";
  return text || null;
}

