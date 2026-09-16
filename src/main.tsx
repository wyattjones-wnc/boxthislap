import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import {
  App,
  type CompetitionRoots,
  type OperationalRoots,
  type SpecialistRoots,
} from "./app/App";
import "./styles/tokens.css";

const shellRoot = document.querySelector(".site-header");
const loginRoot = document.querySelector('[data-page="login"]');
const accountRoot = document.querySelector('[data-page="account-settings"]');
const footerRoot = document.querySelector(".site-footer");
const footyDialogsRoot = document.createElement("div");
footyDialogsRoot.id = "footy-operational-dialog-root";
document.body.append(footyDialogsRoot);
const operationalRoots = {
  draftList: document.querySelector('[data-page="draft-list"]'),
  footy: document.querySelector('[data-page="footy"]'),
  footyCustomSchedule: document.querySelector(
    '[data-page="footy-custom-schedule"]',
  ),
  footyDialogs: footyDialogsRoot,
  footyGoalAssists: document.querySelector('[data-page="footy-goal-assists"]'),
  footyMissingNotes: document.querySelector(
    '[data-page="footy-missing-notes"]',
  ),
  footyPerfect: document.querySelector('[data-page="footy-perfect"]'),
  footySeen: document.querySelector('[data-page="footy-seen"]'),
  footyTeam: document.querySelector('[data-page="footy-team"]'),
  guides: document.querySelector('[data-page="guides"]'),
  managerAwards: document.querySelector('[data-page="manager-awards"]'),
  managerHub: document.querySelector('[data-page="manager-hub"]'),
  next: document.querySelector('[data-page="next"]'),
  rankings: document.querySelector('[data-page="rankings"]'),
  todo: document.querySelector('[data-page="todo"]'),
  want: document.querySelector('[data-page="want"]'),
};
const competitionRoots = {
  bracket: document.querySelector('[data-page="bracket"]'),
  draft: document.querySelector('[data-page="draft"]'),
  fantasyCritic2025: document.querySelector(
    '[data-page="fantasy-critic-2025"]',
  ),
  fantasyCritic2026: document.querySelector(
    '[data-page="fantasy-critic-2026"]',
  ),
  fantasyOffice2025Draft: document.querySelector(
    '[data-page="fantasy-office-2025-draft"]',
  ),
  fantasyOffice2025Movies: document.querySelector(
    '[data-page="fantasy-office-2025-movies"]',
  ),
  fantasyOffice2025Results: document.querySelector(
    '[data-page="fantasy-office-2025-results"]',
  ),
  fantasyOffice2026Draft: document.querySelector(
    '[data-page="fantasy-office-2026-draft"]',
  ),
  fantasyOffice2026Movies: document.querySelector(
    '[data-page="fantasy-office-2026-movies"]',
  ),
  fantasyOffice2026Results: document.querySelector(
    '[data-page="fantasy-office-2026-results"]',
  ),
  formulaOne2024Questions: document.querySelector(
    '[data-page="formula-1-2024-questions"]',
  ),
  formulaOne2024Results: document.querySelector(
    '[data-page="formula-1-2024-results"]',
  ),
  formulaOne2025Questions: document.querySelector(
    '[data-page="formula-1-2025-questions"]',
  ),
  formulaOne2025Results: document.querySelector(
    '[data-page="formula-1-2025-results"]',
  ),
  formulaOne2025Weekly: document.querySelector(
    '[data-page="formula-1-2025-weekly"]',
  ),
  formulaOne2026Calculator: document.querySelector(
    '[data-page="formula-1-2026-calculator"]',
  ),
  formulaOne2026Manage: document.querySelector(
    '[data-page="formula-1-2026-manage"]',
  ),
  formulaOne2026Questions: document.querySelector(
    '[data-page="formula-1-2026-questions"]',
  ),
  formulaOne2026Results: document.querySelector(
    '[data-page="formula-1-2026-results"]',
  ),
  formulaOne2026Review: document.querySelector(
    '[data-page="formula-1-2026-review"]',
  ),
  formulaOne2026Weekly: document.querySelector(
    '[data-page="formula-1-2026-weekly"]',
  ),
  leagues: document.querySelector('[data-page="leagues"]'),
  matches: document.querySelector('[data-page="matches"]'),
  results: document.querySelector('[data-page="results"]'),
  rules: document.querySelector('[data-page="rules"]'),
  standings: document.querySelector('[data-page="standings"]'),
  testing: document.querySelector('[data-page="testing"]'),
  today: document.querySelector('[data-page="today"]'),
  tomorrow: document.querySelector('[data-page="tomorrow"]'),
};
const specialistRoots = {
  adminHome: document.querySelector('[data-page="the-monster-maniac"]'),
  collectibles: document.querySelector('[data-page="collectibles"]'),
  trophyLog: document.querySelector('[data-page="trophy-log"]'),
  trophyStats: document.querySelector('[data-page="trophy-stats"]'),
  youtube: document.querySelector('[data-page="youtube"]'),
};
const hasOperationalRoots = Object.values(operationalRoots).every(Boolean);
const hasCompetitionRoots = Object.values(competitionRoots).every(Boolean);
const hasSpecialistRoots = Object.values(specialistRoots).every(Boolean);

if (
  !shellRoot ||
  !loginRoot ||
  !accountRoot ||
  !footerRoot ||
  !hasOperationalRoots ||
  !hasCompetitionRoots ||
  !hasSpecialistRoots
) {
  throw new Error(
    "The React application shell could not find its mount points.",
  );
}

loginRoot.replaceChildren();
accountRoot.replaceChildren();
footerRoot.replaceChildren();
Object.values(operationalRoots).forEach((root) => root?.replaceChildren());
Object.values(competitionRoots).forEach((root) => root?.replaceChildren());
Object.values(specialistRoots).forEach((root) => root?.replaceChildren());
[
  "next-item-dialog-root",
  "todo-item-dialog-root",
  "want-item-dialog-root",
].forEach((id) => {
  const root = document.createElement("div");
  root.id = id;
  root.dataset.legacyDialogRoot = "";
  document.body.append(root);
});

flushSync(() => {
  createRoot(shellRoot).render(
    <App
      accountRoot={accountRoot}
      competitionRoots={competitionRoots as CompetitionRoots}
      footerRoot={footerRoot}
      loginRoot={loginRoot}
      operationalRoots={operationalRoots as OperationalRoots}
      specialistRoots={specialistRoots as SpecialistRoots}
    />,
  );
});

const initialRoute = window.location.hash.slice(1).split("?")[0];
if (
  [
    ...Object.values(operationalRoots),
    ...Object.values(competitionRoots),
    ...Object.values(specialistRoots),
  ].some((root) => root?.id === initialRoute)
) {
  window.requestAnimationFrame(() => window.scrollTo({ left: 0, top: 0 }));
}

void import("../script.js");
