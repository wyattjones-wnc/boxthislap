import { lazy, Suspense } from "react";
import { useAppState } from "../../../app/providers";
import type { League } from "./types";

const Page = lazy(() =>
  import("./LeagueDraftFeature").then((module) => ({
    default: module.LeagueDraftPage,
  })),
);
const Hub = lazy(() =>
  import("./LeagueDraftFeature").then((module) => ({
    default: module.LeagueDraftHubCard,
  })),
);

export function LeagueDraftEntry({
  league,
  mode,
}: {
  league: League;
  mode: "draft" | "resources" | "manage";
}) {
  const { route } = useAppState();
  if (route.split("?")[0] !== `${league}-2027-${mode}`) return null;
  return (
    <Suspense fallback={<p>Loading…</p>}>
      <Page league={league} mode={mode} />
    </Suspense>
  );
}

export function LeagueDraftHubEntry() {
  const { route } = useAppState();
  if (route !== "manager-hub") return null;
  return (
    <Suspense fallback={<p>Loading…</p>}>
      <Hub />
    </Suspense>
  );
}

const Leagues = lazy(() =>
  import("../LeaguesFeature").then((module) => ({
    default: module.LeaguesPage,
  })),
);
export function LeaguesEntry() {
  const { route } = useAppState();
  if (route !== "leagues") return null;
  return (
    <Suspense fallback={<p>Loading…</p>}>
      <Leagues />
    </Suspense>
  );
}
