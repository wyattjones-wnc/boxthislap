export type NavScope =
  | "home"
  | "the-monster-maniac"
  | "world-cup"
  | "formula-one-2024"
  | "formula-one-2025"
  | "formula-one-2026"
  | "fantasy-critic-2025"
  | "fantasy-critic-2026"
  | "fantasy-office-2025"
  | "fantasy-office-2026";

export interface NavItem {
  adminOnly?: boolean;
  label: string;
  loginOnly?: boolean;
  route: string;
  testOnly?: boolean;
}

export const navItems: Record<NavScope, NavItem[]> = {
  home: [
    { label: "Footy", route: "footy" },
    { label: "Next", route: "next" },
    { label: "Rankings", loginOnly: true, route: "rankings" },
    { label: "Leagues", route: "leagues" },
  ],
  "the-monster-maniac": [
    { label: "Home", route: "the-monster-maniac" },
    { label: "To Do", route: "todo" },
    { label: "Want", route: "want" },
    { label: "YouTube", route: "youtube" },
  ],
  "world-cup": [
    { label: "Results", route: "results" },
    { label: "Bracket", route: "bracket" },
    { label: "Standings", route: "standings" },
    { label: "Rules", route: "rules", testOnly: true },
    { label: "Leagues", route: "leagues" },
  ],
  "formula-one-2024": [
    { label: "Questions", route: "formula-1-2024-questions" },
    { label: "Results", route: "formula-1-2024-results" },
    { label: "Leagues", route: "leagues" },
  ],
  "formula-one-2025": [
    { label: "Questions", route: "formula-1-2025-questions" },
    { label: "Weekly", route: "formula-1-2025-weekly" },
    { label: "Results", route: "formula-1-2025-results" },
    { label: "Leagues", route: "leagues" },
  ],
  "formula-one-2026": [
    { label: "Questions", route: "formula-1-2026-questions" },
    { label: "Weekly", route: "formula-1-2026-weekly" },
    { label: "Results", route: "formula-1-2026-results" },
    { label: "Leagues", route: "leagues" },
  ],
  "fantasy-critic-2025": [{ label: "Leagues", route: "leagues" }],
  "fantasy-critic-2026": [{ label: "Leagues", route: "leagues" }],
  "fantasy-office-2025": [
    { label: "Draft", route: "fantasy-office-2025-draft" },
    { label: "Movies", route: "fantasy-office-2025-movies" },
    { label: "Results", route: "fantasy-office-2025-results" },
    { label: "Leagues", route: "leagues" },
  ],
  "fantasy-office-2026": [
    { label: "Draft", route: "fantasy-office-2026-draft" },
    { label: "Movies", route: "fantasy-office-2026-movies" },
    { label: "Results", route: "fantasy-office-2026-results" },
    { adminOnly: true, label: "Manage", route: "fantasy-office-2026-manage" },
    { label: "Leagues", route: "leagues" },
  ],
};

const personalRoutes = new Set([
  "the-monster-maniac",
  "psn",
  "trophy-stats",
  "trophy-log",
  "todo",
  "want",
  "youtube",
  "collectibles",
  "database-admin",
  "merchandise",
]);

const worldCupRoutes = new Set([
  "today",
  "tomorrow",
  "results",
  "draft",
  "standings",
  "rules",
  "matches",
  "bracket",
  "testing",
]);

export function readRoute(): string {
  return window.location.hash.replace(/^#/, "") || "footy";
}

export function getNavScope(route: string): NavScope {
  if (personalRoutes.has(route)) return "the-monster-maniac";
  if (worldCupRoutes.has(route)) return "world-cup";
  if (route.startsWith("formula-1-2024")) return "formula-one-2024";
  if (route.startsWith("formula-1-2025")) return "formula-one-2025";
  if (route.startsWith("formula-1-2026")) return "formula-one-2026";
  if (route.startsWith("fantasy-critic-2025")) return "fantasy-critic-2025";
  if (route.startsWith("fantasy-critic-2026")) return "fantasy-critic-2026";
  if (route.startsWith("fantasy-office-2025")) return "fantasy-office-2025";
  if (route.startsWith("fantasy-office-2026")) return "fantasy-office-2026";
  return "home";
}
