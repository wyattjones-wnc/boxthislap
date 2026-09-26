import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { useAppState } from "../../app/providers";
import { FANTASY_OFFICE_ENDPOINT } from "../../../modules/siteConfig.js";
import styles from "./FantasyOffice2026Feature.module.css";

declare global {
  interface Window {
    boxThisLapGetManagerAccessToken?: () => Promise<string>;
  }
}

type MetricName =
  | "domestic_gross"
  | "letterboxd_rating"
  | "tomatometer"
  | "number_one_weekends";

interface MetricHealth {
  automaticValue?: number | null;
  consecutiveFailures?: number;
  frozenValue?: number | null;
  lastAttemptAt: string;
  lastChangedAt?: string;
  lastErrorMessage?: string;
  lastErrorType?: string;
  lastSuccessAt: string;
  manualOverride?: number | null;
  status: string;
}

interface MovieScore {
  awardPoints: number;
  boxOfficePoints: number;
  criticalPoints: number;
  points: number;
  provisional: boolean;
}

interface FantasyOfficeMovie {
  active: boolean;
  awardPoints: number;
  boxOfficeMojoReleaseId?: string;
  boxOfficeMojoUrl?: string;
  boxOfficeMojoVerified?: boolean;
  domesticGross: number | null;
  draftNumber: string;
  health: Record<MetricName, MetricHealth>;
  id: string;
  letterboxdRating: number | null;
  letterboxdUrl?: string;
  letterboxdVerified?: boolean;
  manager: string;
  movie: string;
  numberOneWeekends: number | null;
  rottenTomatoesUrl?: string;
  rottenTomatoesVerified?: boolean;
  sourceDiscoveredAt?: string;
  score: MovieScore;
  substitute: boolean;
  tomatometer: number | null;
}

interface DraftManager {
  manager: string;
  picks: Array<{
    active: boolean;
    id: string;
    movie: string;
    pick: string;
    substitute: boolean;
  }>;
}

interface Standing {
  awardPoints: number;
  boxOfficePoints: number;
  criticalPoints: number;
  manager: string;
  movies: FantasyOfficeMovie[];
  points: number;
  provisional: boolean;
  rank: number;
}

interface SeasonData {
  draft: DraftManager[];
  generatedAt: string;
  latestVerification: string;
  movies: FantasyOfficeMovie[];
  ok: boolean;
  provisional: boolean;
  runs?: Array<{
    completed_at: string;
    failed: number;
    id: string;
    status: string;
    succeeded: number;
  }>;
  standings: Standing[];
}

async function request<T>(
  path: string,
  admin = false,
  options: RequestInit = {},
) {
  const token = admin ? await window.boxThisLapGetManagerAccessToken?.() : "";
  if (admin && !token)
    throw new Error("Sign in as an administrator to continue.");
  const response = await fetch(`${FANTASY_OFFICE_ENDPOINT}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(admin ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
  });
  const value = (await response.json().catch(() => ({}))) as T & {
    error?: string;
    ok?: boolean;
  };
  if (!response.ok || value.ok === false) {
    throw new Error(value.error || "Fantasy Office data could not be loaded.");
  }
  return value;
}

function heading(subtitle: string) {
  return (
    <div className="league-detail-heading">
      <div>
        <h2>Fantasy Office</h2>
        <p>{subtitle}</p>
      </div>
    </div>
  );
}

function Loading({ text }: { text: string }) {
  return <p className="table-message">{text}</p>;
}

function ErrorMessage({ error }: { error: Error }) {
  return <p className={styles.error}>{error.message}</p>;
}

function formatDate(value: string) {
  if (!value) return "Not verified yet";
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : date.toLocaleString();
}

function formatGross(value: number | null) {
  if (value === null) return "N/A";
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

export function FantasyOffice2026Page({
  mode,
}: {
  mode: "draft" | "movies" | "results" | "manage";
}) {
  const { route, session } = useAppState();
  const admin = mode === "manage";
  const isAdmin = Boolean(session?.isAdmin || session?.manager?.isAdmin);
  const query = useQuery({
    enabled: route === `fantasy-office-2026-${mode}`,
    queryFn: () =>
      request<SeasonData>(
        admin ? "/api/admin/seasons/2026" : "/api/seasons/2026",
        admin,
      ),
    queryKey: ["fantasy-office", 2026, admin ? "admin" : "public"],
  });

  if (admin && !isAdmin) {
    return (
      <>
        {heading("2026 Manage")}
        <Loading text="Administrator access is required." />
      </>
    );
  }
  if (query.isLoading) {
    return (
      <>
        {heading(`2026 ${titleCase(mode)}`)}
        <Loading text="Loading Fantasy Office…" />
      </>
    );
  }
  if (query.error) {
    return (
      <>
        {heading(`2026 ${titleCase(mode)}`)}
        <ErrorMessage error={query.error} />
      </>
    );
  }
  const data = query.data;
  if (!data) return null;

  return (
    <>
      {heading(`2026 ${titleCase(mode)}`)}
      {mode === "draft" ? <DraftView draft={data.draft} /> : null}
      {mode === "movies" ? <MoviesView movies={data.movies} /> : null}
      {mode === "results" ? <ResultsView data={data} /> : null}
      {mode === "manage" ? <ManageView data={data} /> : null}
    </>
  );
}

function DraftView({ draft }: { draft: DraftManager[] }) {
  if (!draft.length)
    return <Loading text="No Fantasy Office draft data is available." />;
  return (
    <div className={styles.draftGrid}>
      {draft.map((entry) => (
        <article className={styles.card} key={entry.manager}>
          <h3>{entry.manager}</h3>
          <ol className={styles.pickList}>
            {entry.picks.map((pick) => (
              <li
                className={!pick.active ? styles.inactive : undefined}
                key={pick.id}
              >
                <span>{pick.pick}</span>
                <strong>{pick.movie}</strong>
              </li>
            ))}
          </ol>
        </article>
      ))}
    </div>
  );
}

function MoviesView({ movies }: { movies: FantasyOfficeMovie[] }) {
  const active = movies.filter((movie) => movie.active);
  if (!active.length)
    return <Loading text="No active Fantasy Office movies are available." />;
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Movie</th>
            <th>Manager</th>
            <th>Domestic</th>
            <th>#1</th>
            <th>Letterboxd</th>
            <th>RT</th>
            <th>Awards</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {active.map((movie) => (
            <tr key={movie.id}>
              <td>
                <strong>{movie.movie}</strong>
                <small>{movie.draftNumber}</small>
              </td>
              <td>{movie.manager}</td>
              <td>{formatGross(movie.domesticGross)}</td>
              <td>{movie.numberOneWeekends ?? "N/A"}</td>
              <td>{movie.letterboxdRating?.toFixed(1) ?? "N/A"}</td>
              <td>{movie.tomatometer ?? "N/A"}</td>
              <td>{movie.awardPoints}</td>
              <td>
                <strong>{movie.score.points}</strong>
                {movie.score.provisional ? <small>Provisional</small> : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ResultsView({ data }: { data: SeasonData }) {
  if (!data.standings.length)
    return <Loading text="No Fantasy Office results are available." />;
  return (
    <div className={styles.results}>
      {data.provisional ? (
        <p className={styles.notice}>
          Standings are provisional. Missing source metrics currently contribute
          zero points.
        </p>
      ) : null}
      {data.standings.map((standing) => (
        <article className={styles.resultCard} key={standing.manager}>
          <header>
            <span>#{standing.rank}</span>
            <h3>{standing.manager}</h3>
            <strong>{standing.points} pts</strong>
          </header>
          <div className={styles.breakdown}>
            <span>
              Box office <strong>{standing.boxOfficePoints}</strong>
            </span>
            <span>
              Critical <strong>{standing.criticalPoints}</strong>
            </span>
            <span>
              Awards <strong>{standing.awardPoints}</strong>
            </span>
          </div>
          <ul>
            {standing.movies.map((movie) => (
              <li key={movie.id}>
                <span>{movie.movie}</span>
                <strong>{movie.score.points}</strong>
              </li>
            ))}
          </ul>
        </article>
      ))}
    </div>
  );
}

function ManageView({ data }: { data: SeasonData }) {
  return (
    <div className={styles.manage}>
      <p className={styles.notice}>
        Source pages are discovered automatically from each movie title and the
        season year. Review the suggested matches below and mark each one as
        verified; you only need to edit a URL when discovery picked the wrong
        film.
      </p>
      <section className={styles.healthSummary}>
        <h3>Update health</h3>
        <p>
          Latest successful verification: {formatDate(data.latestVerification)}
        </p>
        {data.runs?.slice(0, 5).map((run) => (
          <div key={run.id}>
            <strong>{run.status}</strong>
            <span>{formatDate(run.completed_at)}</span>
            <span>
              {run.succeeded} passed / {run.failed} failed
            </span>
          </div>
        ))}
      </section>
      {data.movies.map((movie) => (
        <MovieAdminForm key={movie.id} movie={movie} />
      ))}
    </div>
  );
}

function MovieAdminForm({ movie }: { movie: FantasyOfficeMovie }) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const mutation = useMutation({
    mutationFn: (body: object) =>
      request(
        `/api/admin/seasons/2026/movies/${encodeURIComponent(movie.id)}`,
        true,
        {
          body: JSON.stringify(body),
          method: "PUT",
        },
      ),
    onSuccess: async () => {
      setMessage("Saved.");
      await queryClient.invalidateQueries({
        queryKey: ["fantasy-office", 2026],
      });
    },
  });
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    const form = new FormData(event.currentTarget);
    const overrides = Object.fromEntries(
      (
        [
          "domestic_gross",
          "letterboxd_rating",
          "tomatometer",
          "number_one_weekends",
        ] as MetricName[]
      ).map((metric) => [
        metric,
        {
          frozenValue: emptyNumber(form.get(`${metric}.frozenValue`)),
          manualOverride: emptyNumber(form.get(`${metric}.manualOverride`)),
        },
      ]),
    );
    mutation.mutate({
      active: form.get("active") === "on",
      awardPoints: Number(form.get("awardPoints") || 0),
      boxOfficeMojoReleaseId: form.get("boxOfficeMojoReleaseId"),
      boxOfficeMojoUrl: form.get("boxOfficeMojoUrl"),
      boxOfficeMojoVerified: form.get("boxOfficeMojoVerified") === "on",
      letterboxdUrl: form.get("letterboxdUrl"),
      letterboxdVerified: form.get("letterboxdVerified") === "on",
      overrides,
      rottenTomatoesUrl: form.get("rottenTomatoesUrl"),
      rottenTomatoesVerified: form.get("rottenTomatoesVerified") === "on",
      title: form.get("title"),
    });
  };
  return (
    <form className={styles.adminCard} onSubmit={submit}>
      <header>
        <div>
          <h3>{movie.movie}</h3>
          <p>
            {movie.manager} · {movie.draftNumber}
          </p>
        </div>
        <label>
          <input defaultChecked={movie.active} name="active" type="checkbox" />{" "}
          Active
        </label>
      </header>
      <div className={styles.sourceGrid}>
        <label>
          Movie title
          <input defaultValue={movie.movie} name="title" required />
        </label>
        <label>
          Letterboxd URL
          <input
            defaultValue={movie.letterboxdUrl}
            name="letterboxdUrl"
            type="url"
          />
          <SourceVerification
            available={Boolean(movie.letterboxdUrl)}
            defaultChecked={movie.letterboxdVerified}
            name="letterboxdVerified"
          />
        </label>
        <label>
          Rotten Tomatoes URL
          <input
            defaultValue={movie.rottenTomatoesUrl}
            name="rottenTomatoesUrl"
            type="url"
          />
          <SourceVerification
            available={Boolean(movie.rottenTomatoesUrl)}
            defaultChecked={movie.rottenTomatoesVerified}
            name="rottenTomatoesVerified"
          />
        </label>
        <label>
          Box Office Mojo URL
          <input
            defaultValue={movie.boxOfficeMojoUrl}
            name="boxOfficeMojoUrl"
            type="url"
          />
          <SourceVerification
            available={Boolean(movie.boxOfficeMojoUrl)}
            defaultChecked={movie.boxOfficeMojoVerified}
            name="boxOfficeMojoVerified"
          />
        </label>
        <label>
          Box Office Mojo release ID
          <input
            defaultValue={movie.boxOfficeMojoReleaseId}
            name="boxOfficeMojoReleaseId"
          />
        </label>
        <label>
          Award points
          <input
            defaultValue={movie.awardPoints}
            min="0"
            name="awardPoints"
            step="1"
            type="number"
          />
        </label>
      </div>
      <details>
        <summary>Health, emergency corrections, and freezes</summary>
        <div className={styles.metricGrid}>
          {(Object.keys(movie.health) as MetricName[]).map((metric) => {
            const health = movie.health[metric];
            return (
              <fieldset key={metric}>
                <legend>{metric.replaceAll("_", " ")}</legend>
                <p
                  className={
                    styles[
                      health.status === "healthy" ? "healthy" : "unhealthy"
                    ]
                  }
                >
                  {health.status} · {formatDate(health.lastSuccessAt)}
                </p>
                {health.lastErrorMessage ? (
                  <p className={styles.error}>{health.lastErrorMessage}</p>
                ) : null}
                <label>
                  Override
                  <input
                    defaultValue={health.manualOverride ?? ""}
                    name={`${metric}.manualOverride`}
                    step="any"
                    type="number"
                  />
                </label>
                <label>
                  Frozen value
                  <input
                    defaultValue={health.frozenValue ?? ""}
                    name={`${metric}.frozenValue`}
                    step="any"
                    type="number"
                  />
                </label>
              </fieldset>
            );
          })}
        </div>
      </details>
      <footer>
        <button
          className="action-button"
          disabled={mutation.isPending}
          type="submit"
        >
          {mutation.isPending ? "Saving…" : "Save movie"}
        </button>
        {mutation.error ? (
          <span className={styles.error}>{mutation.error.message}</span>
        ) : (
          <span>{message}</span>
        )}
      </footer>
    </form>
  );
}

function SourceVerification({
  available,
  defaultChecked,
  name,
}: {
  available: boolean;
  defaultChecked?: boolean;
  name: string;
}) {
  if (!available) {
    return <small className={styles.unhealthy}>Awaiting discovery</small>;
  }
  return (
    <span className={styles.verification}>
      <input defaultChecked={defaultChecked} name={name} type="checkbox" />
      {defaultChecked ? "Administrator verified" : "Verify this match"}
    </span>
  );
}

function emptyNumber(value: FormDataEntryValue | null) {
  return value === null || String(value).trim() === "" ? null : Number(value);
}

function titleCase(value: string) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}
