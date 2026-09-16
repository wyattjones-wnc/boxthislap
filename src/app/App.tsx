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
  TodoPage,
  WantPage,
} from "../features/operational/OperationalPages";

export interface OperationalRoots {
  draftList: Element;
  footy: Element;
  guides: Element;
  managerAwards: Element;
  managerHub: Element;
  next: Element;
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
        {createPortal(<TodoPage />, operationalRoots.todo)}
        {createPortal(<WantPage />, operationalRoots.want)}
        {createPortal(<GuidesPage />, operationalRoots.guides)}
        {createPortal(<DraftListPage />, operationalRoots.draftList)}
        {createPortal(<FootyPage />, operationalRoots.footy)}
        {createPortal(<ManagerHubPage />, operationalRoots.managerHub)}
        {createPortal(<ManagerAwardsPage />, operationalRoots.managerAwards)}
        {createPortal(<SiteFooter />, footerRoot)}
      </AppErrorBoundary>
    </AppProviders>
  );
}
