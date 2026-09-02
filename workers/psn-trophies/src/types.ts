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
  ADMIN_MANAGER_IDS?: string;
  ALLOWED_ORIGINS?: string;
  DB: D1Database;
  MANAGER_AUTH?: ServiceFetcher;
  PSN_ACCOUNT_ID?: string;
  PSN_AUTH_ENCRYPTION_KEY?: string;
  PSN_NPSSO?: string;
  SNAPSHOTS?: KVNamespace;
  SYNC_SECRET?: string;
}

export interface KVNamespace {
  get<T = unknown>(key: string, type: "json"): Promise<T | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

export interface ServiceFetcher {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

export interface D1Database {
  batch(statements: D1PreparedStatement[]): Promise<unknown[]>;
  prepare(query: string): D1PreparedStatement;
}

export interface D1PreparedStatement {
  all<T = Record<string, unknown>>(): Promise<{ results?: T[]; meta?: { rows_read?: number; rows_written?: number } }>;
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  run(): Promise<{ meta?: { changes?: number; last_row_id?: number }; success?: boolean }>;
}
