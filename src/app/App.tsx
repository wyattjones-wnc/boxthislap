import { lazy, Suspense, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AccountSettingsPage, LoginPage, SiteFooter } from "./FoundationPages";
import { AppErrorBoundary } from "./AppErrorBoundary";
import { AppProviders } from "./providers";
import { SiteShell } from "./Shell";
import {
  DraftListPage,
  FootyPage,
  GuidesPage,
  ManagerAwardsPage,
  ManagerHubPage,
  NextPage,
  RankingsPage,
  TodoPage,
  WantPage,
} from "../features/operational/OperationalPages";
import {
  FootyCustomSchedulePage,
  FootyGoalAssistsPage,
  FootyMissingNotesPage,
  FootyOperationalDialogs,
  FootyPerfectPage,
  FootySeenPage,
  FootyTeamPage,
} from "../features/operational/FootyOperationalPages";
import {
  FantasyCriticPage,
  FantasyOfficePage,
  FormulaOne2025WeeklyPage,
  FormulaOne2026WeeklyPage,
  FormulaOneAdminPage,
  FormulaOneCalculatorPage,
  FormulaOneQuestionsPage,
  FormulaOneResultsPage,
  LeaguesPage,
  TodayPage,
  TomorrowPage,
  WorldCupBracketPage,
  WorldCupDraftPage,
  WorldCupMatchesPage,
  WorldCupResultsPage,
  WorldCupRulesPage,
  WorldCupStandingsPage,
  WorldCupTestingPage,
} from "../features/competition/CompetitionPages";
import {
  AdminHomePage,
  CollectiblesPage,
  PsnPage,
  TrophyLogPage,
  TrophyStatsPage,
  YouTubePage,
} from "../features/specialist/SpecialistPages";

const DatabaseAdminPage = lazy(() =>
  import("../features/specialist/DatabaseAdminPage").then((module) => ({
    default: module.DatabaseAdminPage,
  })),
);

export function DeferredDatabaseAdminPage() {
  const [active, setActive] = useState(
    () => window.location.hash.split("?")[0] === "#database-admin",
  );
  useEffect(() => {
    const update = (event?: Event) => {
      const shownPage =
        event instanceof CustomEvent
          ? String(event.detail?.pageName || "")
          : window.location.hash.slice(1).split("?")[0];
      setActive(shownPage === "database-admin");
    };
    window.addEventListener("hashchange", update);
    window.addEventListener("boxthislap:page-shown", update);
    return () => {
      window.removeEventListener("hashchange", update);
      window.removeEventListener("boxthislap:page-shown", update);
    };
  }, []);
  if (!active) return null;
  return (
    <Suspense
      fallback={<p className="table-message">Loading Database Explorer…</p>}
    >
      <DatabaseAdminPage />
    </Suspense>
  );
}

export interface SpecialistRoots {
  adminHome: Element;
  collectibles: Element;
  databaseAdmin: Element;
  psn: Element;
  trophyLog: Element;
  trophyStats: Element;
  youtube: Element;
}

export interface CompetitionRoots {
  bracket: Element;
  draft: Element;
  fantasyCritic2025: Element;
  fantasyCritic2026: Element;
  fantasyOffice2025Draft: Element;
  fantasyOffice2025Movies: Element;
  fantasyOffice2025Results: Element;
  fantasyOffice2026Draft: Element;
  fantasyOffice2026Movies: Element;
  fantasyOffice2026Results: Element;
  formulaOne2024Questions: Element;
  formulaOne2024Results: Element;
  formulaOne2025Questions: Element;
  formulaOne2025Results: Element;
  formulaOne2025Weekly: Element;
  formulaOne2026Calculator: Element;
  formulaOne2026Manage: Element;
  formulaOne2026Questions: Element;
  formulaOne2026Results: Element;
  formulaOne2026Review: Element;
  formulaOne2026Weekly: Element;
  leagues: Element;
  matches: Element;
  results: Element;
  rules: Element;
  standings: Element;
  testing: Element;
  today: Element;
  tomorrow: Element;
}

export interface OperationalRoots {
  draftList: Element;
  footy: Element;
  footyCustomSchedule: Element;
  footyDialogs: Element;
  footyGoalAssists: Element;
  footyMissingNotes: Element;
  footyPerfect: Element;
  footySeen: Element;
  footyTeam: Element;
  guides: Element;
  managerAwards: Element;
  managerHub: Element;
  next: Element;
  rankings: Element;
  todo: Element;
  want: Element;
}

interface AppProps {
  accountRoot: Element;
  competitionRoots: CompetitionRoots;
  footerRoot: Element;
  loginRoot: Element;
  operationalRoots: OperationalRoots;
  specialistRoots: SpecialistRoots;
}

export function App({
  accountRoot,
  competitionRoots,
  footerRoot,
  loginRoot,
  operationalRoots,
  specialistRoots,
}: AppProps) {
  return (
    <AppProviders>
      <AppErrorBoundary>
        <SiteShell />
        {createPortal(<LoginPage />, loginRoot)}
        {createPortal(<AccountSettingsPage />, accountRoot)}
        {createPortal(<NextPage />, operationalRoots.next)}
        {createPortal(<RankingsPage />, operationalRoots.rankings)}
        {createPortal(<TodoPage />, operationalRoots.todo)}
        {createPortal(<WantPage />, operationalRoots.want)}
        {createPortal(<GuidesPage />, operationalRoots.guides)}
        {createPortal(<DraftListPage />, operationalRoots.draftList)}
        {createPortal(<FootyPage />, operationalRoots.footy)}
        {createPortal(
          <FootyCustomSchedulePage />,
          operationalRoots.footyCustomSchedule,
        )}
        {createPortal(
          <FootyGoalAssistsPage />,
          operationalRoots.footyGoalAssists,
        )}
        {createPortal(
          <FootyMissingNotesPage />,
          operationalRoots.footyMissingNotes,
        )}
        {createPortal(<FootyPerfectPage />, operationalRoots.footyPerfect)}
        {createPortal(<FootySeenPage />, operationalRoots.footySeen)}
        {createPortal(<FootyTeamPage />, operationalRoots.footyTeam)}
        {createPortal(
          <FootyOperationalDialogs />,
          operationalRoots.footyDialogs,
        )}
        {createPortal(<ManagerHubPage />, operationalRoots.managerHub)}
        {createPortal(<ManagerAwardsPage />, operationalRoots.managerAwards)}
        {createPortal(<AdminHomePage />, specialistRoots.adminHome)}
        {createPortal(<PsnPage />, specialistRoots.psn)}
        {createPortal(<TrophyStatsPage />, specialistRoots.trophyStats)}
        {createPortal(<CollectiblesPage />, specialistRoots.collectibles)}
        {createPortal(
          <DeferredDatabaseAdminPage />,
          specialistRoots.databaseAdmin,
        )}
        {createPortal(<TrophyLogPage />, specialistRoots.trophyLog)}
        {createPortal(<YouTubePage />, specialistRoots.youtube)}
        {createPortal(<TodayPage />, competitionRoots.today)}
        {createPortal(<TomorrowPage />, competitionRoots.tomorrow)}
        {createPortal(<WorldCupResultsPage />, competitionRoots.results)}
        {createPortal(<WorldCupDraftPage />, competitionRoots.draft)}
        {createPortal(<WorldCupStandingsPage />, competitionRoots.standings)}
        {createPortal(<WorldCupRulesPage />, competitionRoots.rules)}
        {createPortal(<WorldCupMatchesPage />, competitionRoots.matches)}
        {createPortal(<WorldCupBracketPage />, competitionRoots.bracket)}
        {createPortal(<WorldCupTestingPage />, competitionRoots.testing)}
        {createPortal(<LeaguesPage />, competitionRoots.leagues)}
        {createPortal(
          <FantasyCriticPage year={2025} />,
          competitionRoots.fantasyCritic2025,
        )}
        {createPortal(
          <FantasyCriticPage year={2026} />,
          competitionRoots.fantasyCritic2026,
        )}
        {createPortal(
          <FormulaOneQuestionsPage year={2024} />,
          competitionRoots.formulaOne2024Questions,
        )}
        {createPortal(
          <FormulaOneResultsPage year={2024} />,
          competitionRoots.formulaOne2024Results,
        )}
        {createPortal(
          <FormulaOneQuestionsPage year={2025} />,
          competitionRoots.formulaOne2025Questions,
        )}
        {createPortal(
          <FormulaOneResultsPage year={2025} />,
          competitionRoots.formulaOne2025Results,
        )}
        {createPortal(
          <FormulaOne2025WeeklyPage />,
          competitionRoots.formulaOne2025Weekly,
        )}
        {createPortal(
          <FormulaOneQuestionsPage year={2026} />,
          competitionRoots.formulaOne2026Questions,
        )}
        {createPortal(
          <FormulaOneResultsPage year={2026} />,
          competitionRoots.formulaOne2026Results,
        )}
        {createPortal(
          <FormulaOne2026WeeklyPage />,
          competitionRoots.formulaOne2026Weekly,
        )}
        {createPortal(
          <FormulaOneAdminPage mode="manage" />,
          competitionRoots.formulaOne2026Manage,
        )}
        {createPortal(
          <FormulaOneAdminPage mode="review" />,
          competitionRoots.formulaOne2026Review,
        )}
        {createPortal(
          <FormulaOneCalculatorPage />,
          competitionRoots.formulaOne2026Calculator,
        )}
        {createPortal(
          <FantasyOfficePage year={2025} mode="draft" />,
          competitionRoots.fantasyOffice2025Draft,
        )}
        {createPortal(
          <FantasyOfficePage year={2025} mode="movies" />,
          competitionRoots.fantasyOffice2025Movies,
        )}
        {createPortal(
          <FantasyOfficePage year={2025} mode="results" />,
          competitionRoots.fantasyOffice2025Results,
        )}
        {createPortal(
          <FantasyOfficePage year={2026} mode="draft" />,
          competitionRoots.fantasyOffice2026Draft,
        )}
        {createPortal(
          <FantasyOfficePage year={2026} mode="movies" />,
          competitionRoots.fantasyOffice2026Movies,
        )}
        {createPortal(
          <FantasyOfficePage year={2026} mode="results" />,
          competitionRoots.fantasyOffice2026Results,
        )}
        {createPortal(<SiteFooter />, footerRoot)}
      </AppErrorBoundary>
    </AppProviders>
  );
}
