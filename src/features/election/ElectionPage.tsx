import { useQuery } from "@tanstack/react-query";
import styles from "./ElectionPage.module.css";

interface Candidate {
  id: string;
  first: string;
  last: string;
  party: string;
  votes: number;
  percent: number;
  winner?: string;
}
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
      <h1>Election 2026</h1>
      <p>November 3 general election · Senate, House and governor results</p>
      <p>
        Vote totals: The Associated Press, via{" "}
        <a
          href="https://apps.npr.org/2026-election-results/"
          target="_blank"
          rel="noreferrer"
        >
          NPR
        </a>
        . Results are unofficial and may change.
      </p>
      {query.isPending && <p role="status">Loading election results…</p>}
      {query.isError && (
        <p role="alert">
          Results could not be refreshed.{" "}
          {query.data
            ? "Showing the last available results."
            : "Use the NPR links below for current results."}{" "}
          <button type="button" onClick={() => void query.refetch()}>
            Retry
          </button>
        </p>
      )}
      {query.data && (
        <p>
          Snapshot retrieved: {new Date(query.data.fetchedAt).toLocaleString()}.
          Checks for a new snapshot every minute.
        </p>
      )}
      {stale && (
        <p role="status">
          These results are more than 30 minutes old. Check NPR for the latest
          counts.
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
            <h2>{name}</h2>
            <a
              href={`https://apps.npr.org/2026-election-results/${slug}.html`}
              target="_blank"
              rel="noreferrer"
            >
              Latest {name} results at NPR
            </a>
            {code === "AK" && (
              <p>
                Alaska uses ranked-choice voting. These are initial tallies; a
                first-round lead does not establish a winner.
              </p>
            )}
            {query.data?.races
              .filter((race) => race.state === code)
              .sort(
                (a, b) => Number(a.seatNumber || 0) - Number(b.seatNumber || 0),
              )
              .map((race) => (
                <article className={styles.race} key={race.id}>
                  <h3>
                    {race.officeName}
                    {race.office === "H"
                      ? race.state === "AK"
                        ? " · At large"
                        : ` · District ${race.seatNumber || "At large"}`
                      : ""}
                  </h3>
                  <p>
                    {race.raceCallStatus}
                    {typeof race.eevp === "number"
                      ? ` · ${(race.eevp * 100).toFixed(1)}% of estimated votes counted`
                      : ""}
                  </p>
                  <table>
                    <caption className={styles.caption}>
                      {name} {race.officeName} vote totals
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">Candidate</th>
                        <th scope="col">Votes</th>
                        <th scope="col">Share</th>
                      </tr>
                    </thead>
                    <tbody>
                      {race.candidates.map((candidate) => (
                        <tr key={candidate.id}>
                          <th scope="row">
                            {candidate.first} {candidate.last}
                            <small>
                              {candidate.party}
                              {candidate.winner === "X" ? " · AP winner" : ""}
                            </small>
                          </th>
                          <td>{candidate.votes.toLocaleString()}</td>
                          <td>{(candidate.percent * 100).toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className={styles.updated}>
                    Source updated: {new Date(race.updated).toLocaleString()}
                  </p>
                </article>
              ))}
            {query.data &&
              !query.data.races.some((race) => race.state === code) && (
                <p>No results are available yet.</p>
              )}
          </section>
        ))}
      </div>
    </div>
  );
}
