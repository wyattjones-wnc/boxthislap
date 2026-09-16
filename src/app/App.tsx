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
  footerRoot: Element;
  loginRoot: Element;
  operationalRoots: OperationalRoots;
}

export function App({
  accountRoot,
  footerRoot,
  loginRoot,
  operationalRoots,
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
        {createPortal(<SiteFooter />, footerRoot)}
      </AppErrorBoundary>
    </AppProviders>
  );
}
