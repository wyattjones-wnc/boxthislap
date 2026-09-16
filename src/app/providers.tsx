import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as Tooltip from "@radix-ui/react-tooltip";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { readRoute } from "./routes";

interface ManagerSession {
  isAdmin?: boolean;
  manager?: { displayName?: string; isAdmin?: boolean; name?: string };
  managerId?: string;
}

interface AppState {
  isOnline: boolean;
  pwaCapable: boolean;
  route: string;
  session: ManagerSession | null;
  theme: "dark" | "light";
}

const AppStateContext = createContext<AppState>({
  isOnline: true,
  pwaCapable: false,
  route: "footy",
  session: null,
  theme: "dark",
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function readSession(): ManagerSession | null {
  try {
    const value = localStorage.getItem("boxThisLapManagerSession");
    return value ? (JSON.parse(value) as ManagerSession) : null;
  } catch {
    return null;
  }
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [route, setRoute] = useState(readRoute);
  const [session, setSession] = useState(readSession);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [theme, setTheme] = useState<"dark" | "light">(
    document.documentElement.dataset.theme === "light" ? "light" : "dark",
  );
  const pwaCapable = "serviceWorker" in navigator;

  useEffect(() => {
    const syncRoute = () => setRoute(readRoute());
    const syncSession = () => setSession(readSession());
    const syncOffline = () => setIsOnline(false);
    const syncOnline = () => setIsOnline(true);
    const syncTheme = () =>
      setTheme(
        document.documentElement.dataset.theme === "light" ? "light" : "dark",
      );
    const themeObserver = new MutationObserver(syncTheme);
    themeObserver.observe(document.documentElement, {
      attributeFilter: ["data-theme"],
      attributes: true,
    });
    window.addEventListener("hashchange", syncRoute);
    window.addEventListener("offline", syncOffline);
    window.addEventListener("online", syncOnline);
    window.addEventListener("popstate", syncRoute);
    window.addEventListener("boxthislap:session-changed", syncSession);
    window.addEventListener("storage", syncSession);
    return () => {
      window.removeEventListener("hashchange", syncRoute);
      window.removeEventListener("offline", syncOffline);
      window.removeEventListener("online", syncOnline);
      window.removeEventListener("popstate", syncRoute);
      window.removeEventListener("boxthislap:session-changed", syncSession);
      window.removeEventListener("storage", syncSession);
      themeObserver.disconnect();
    };
  }, []);

  const value = useMemo(
    () => ({ isOnline, pwaCapable, route, session, theme }),
    [isOnline, pwaCapable, route, session, theme],
  );

  return (
    <QueryClientProvider client={queryClient}>
      <Tooltip.Provider delayDuration={350}>
        <AppStateContext.Provider value={value}>
          {children}
        </AppStateContext.Provider>
      </Tooltip.Provider>
    </QueryClientProvider>
  );
}

export function useAppState() {
  return useContext(AppStateContext);
}
