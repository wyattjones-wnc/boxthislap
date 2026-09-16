import { createPortal } from "react-dom";
import { AccountSettingsPage, LoginPage, SiteFooter } from "./FoundationPages";
import { AppErrorBoundary } from "./AppErrorBoundary";
import { AppProviders } from "./providers";
import { SiteShell } from "./Shell";

interface AppProps {
  accountRoot: Element;
  footerRoot: Element;
  loginRoot: Element;
}

export function App({ accountRoot, footerRoot, loginRoot }: AppProps) {
  return (
    <AppProviders>
      <AppErrorBoundary>
        <SiteShell />
        {createPortal(<LoginPage />, loginRoot)}
        {createPortal(<AccountSettingsPage />, accountRoot)}
        {createPortal(<SiteFooter />, footerRoot)}
      </AppErrorBoundary>
    </AppProviders>
  );
}
