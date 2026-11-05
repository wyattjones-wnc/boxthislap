import { useQuery } from "@tanstack/react-query";
import { useAppState } from "../../app/providers";
import { loadBaselines, seenQueryKey } from "./electionSeen";
import { RaceResults, type Candidate } from "./RaceResults";
import styles from "./ElectionPage.module.css";

interface Race {
  id: string;
  state: string;
  office: string;
  officeName: string;
  seatNumber?: string;
  updated: number;
  eevp?: number;
  raceCallStatus: string;
  rankedChoice?: boolean;
  candidates: Candidate[];
}
interface Results {
  year: number;
  fetchedAt: string;
  races: Race[];
}

export default function ElectionPage() {
  const { session } = useAppState();
  const isAdmin = Boolean(session?.isAdmin || session?.manager?.isAdmin);
  const seen = useQuery({
    queryKey: seenQueryKey,
    queryFn: ({ signal }) => loadBaselines(signal),
    refetchInterval: 60000,
    refetchOnWindowFocus: true,
  });
  const query = useQuery<Results>({
    queryKey: ["election-results-2026"],
    queryFn: async ({ signal }) => {
      const response = await fetch("data/election-results.json", {
        signal,
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Election results are unavailable.");
      const data = (await response.json()) as Results;
      if (data.year !== 2026 || !Array.isArray(data.races))
        throw new Error("Invalid election results.");
      return data;
    },
    refetchInterval: 60000,
  });
  const stale =
    query.data && Date.now() - Date.parse(query.data.fetchedAt) > 30 * 60000;
  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <h1>
          Senate <span>2026</span>
        </h1>
        <a
          href="https://apps.npr.org/2026-election-results/"
          target="_blank"
          rel="noreferrer"
        >
          AP via NPR ↗
        </a>
      </header>
      {query.isPending && <p role="status">Loading results…</p>}
      {query.isError && (
        <p role="alert">
          Results unavailable.{" "}
          <button type="button" onClick={() => void query.refetch()}>
            Retry
          </button>
        </p>
      )}
      {stale && (
        <p role="status">
          Results are over 30 minutes old. Check NPR for updates.
        </p>
      )}
      {seen.isError && (
        <p role="alert">
          Comparison unavailable.{" "}
          <button type="button" onClick={() => void seen.refetch()}>
            Retry
          </button>
        </p>
      )}
      <div className={styles.states}>
        {(
          [
            ["AK", "Alaska", "alaska"],
            ["MS", "Mississippi", "mississippi"],
          ] as const
        ).map(([code, name, slug]) => (
          <section
            className={styles.state}
            key={code}
            aria-label={`${name} election results`}
          >
            <img
              className={styles.outline}
              src={`assets/election/${code}.svg`}
              alt={`Outline of ${name}`}
            />
            <header className={styles.stateHeading}>
              <h2>{name}</h2>
              <a
                href={`https://apps.npr.org/2026-election-results/${slug}.html`}
                aria-label={`Latest ${name} Senate results at NPR`}
                target="_blank"
                rel="noreferrer"
              >
                NPR ↗
              </a>
            </header>
            {query.data?.races
              .filter((race) => race.state === code && race.office === "S")
              .sort(
                (a, b) => Number(a.seatNumber || 0) - Number(b.seatNumber || 0),
              )
              .map((race) => (
                <article className={styles.race} key={race.id}>
                  <div className={styles.meta}>
                    <p className={styles.status}>
                      {race.raceCallStatus}
                      {typeof race.eevp === "number" ? (
                        <span title="Estimated votes counted">
                          {" "}
                          · {(race.eevp * 100).toFixed(1)}% counted
                        </span>
                      ) : (
                        ""
                      )}
                    </p>
                    {code === "AK" && (
                      <p className={styles.ranked}>
                        Initial count · ranked choice
                      </p>
                    )}
                  </div>
                  <RaceResults
                    key={`${query.data!.year}:${race.state}:${race.id}`}
                    candidates={race.candidates}
                    caption={`${name} Senate vote totals`}
                    raceKey={`${race.state}:${race.id}`}
                    baseline={
                      seen.data?.baselines[`${race.state}:${race.id}`] || null
                    }
                    baselineLoaded={Boolean(seen.data)}
                    isAdmin={isAdmin}
                    sourceUpdated={race.updated}
                    canMarkSeen={
                      !query.isError &&
                      !query.isFetching &&
                      !seen.isPending &&
                      !seen.isError
                    }
                  />
                  <p className={styles.updated}>
                    Updated {new Date(race.updated).toLocaleString()}
                  </p>
                </article>
              ))}
            {query.data &&
              !query.data.races.some(
                (race) => race.state === code && race.office === "S",
              ) && <p>Awaiting results.</p>}
          </section>
        ))}
      </div>
    </div>
  );
}
