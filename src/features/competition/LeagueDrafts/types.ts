export type League = "fantasy-office" | "world-cup";
export type DraftStatus =
  "setup" | "published" | "active" | "paused" | "completed" | "cancelled";
export interface Participant {
  id: string;
  name: string;
}
export interface DraftOption {
  id: string;
  name: string;
  releaseDate?: string;
}
export interface ScheduledPick {
  number: number;
  round: number;
  managerId: string;
}
export interface Pick extends ScheduledPick {
  optionId: string;
  optionName: string;
  at: string;
  requestId: string;
  adminActor?: string;
}
export interface Draft {
  id: string;
  league: League;
  year: number;
  name: string;
  resourceLabel: string;
  revision: number;
  status: DraftStatus;
  reason: string;
  participants: Participant[];
  rounds: number;
  options: DraftOption[];
  schedule: ScheduledPick[];
  picks: Pick[];
  preference: { enabled: boolean; push: boolean };
  notifications: Array<{
    id: string;
    title: string;
    body: string;
    createdAt: string;
  }>;
  audit?: Array<{
    revision: number;
    action: string;
    actor: string;
    reason: string;
    at: string;
  }>;
}
export interface DraftConfiguration {
  league: League;
  year: number;
  name: string;
  resourceLabel: string;
  participants: Participant[];
  rounds: number;
  options: DraftOption[];
}
