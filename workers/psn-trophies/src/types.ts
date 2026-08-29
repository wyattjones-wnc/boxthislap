export type TrophyType = "bronze" | "silver" | "gold" | "platinum";

export interface TrophyCounts {
  bronze: number;
  silver: number;
  gold: number;
  platinum: number;
}

export interface NormalizedGame {
  id: string;
  npCommunicationId: string;
  name: string;
  platforms: string[];
  iconUrl: string | null;
  progress: number;
  earned: TrophyCounts;
  defined: TrophyCounts;
  sourceUpdatedAt: string | null;
  hasPlatinum: boolean;
  platinumEarned: boolean;
  firstTrophyAt: string | null;
  latestTrophyAt: string | null;
  platinumEarnedAt: string | null;
  completion100At: string | null;
  is100Percent: boolean;
}

export interface NormalizedTrophyGroup {
  gameId: string;
  groupId: string;
  name: string | null;
  iconUrl: string | null;
  defined: TrophyCounts;
}

export interface NormalizedTrophy {
  gameId: string;
  trophyId: number;
  groupId: string | null;
  name: string;
  description: string | null;
  type: TrophyType;
  iconUrl: string | null;
  earned: boolean;
  earnedAt: string | null;
  rarityClass: number | null;
  earnedRate: number | null;
  progress: number | null;
}

export interface PsnEnvironment {
  ALLOWED_ORIGINS?: string;
  DB: D1Database;
  PSN_ACCOUNT_ID?: string;
  PSN_NPSSO?: string;
  SYNC_SECRET?: string;
}

export interface D1Database {
  batch(statements: D1PreparedStatement[]): Promise<unknown[]>;
  prepare(query: string): D1PreparedStatement;
}

export interface D1PreparedStatement {
  all<T = Record<string, unknown>>(): Promise<{ results?: T[] }>;
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  run(): Promise<{ meta?: { changes?: number; last_row_id?: number }; success?: boolean }>;
}
