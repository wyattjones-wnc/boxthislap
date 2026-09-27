import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type CSSProperties, type FormEvent } from "react";
import { useAppState } from "../../app/providers";
import {
  FANTASY_OFFICE_ENDPOINT,
  MANAGER_COLORS,
} from "../../../modules/siteConfig.js";
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
          <h3>
            <ManagerChip name={entry.manager} />
          </h3>
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
  type SortColumn =
    | "movie"
    | "manager"
    | "domesticGross"
    | "numberOneWeekends"
    | "letterboxdRating"
    | "tomatometer"
    | "awardPoints"
    | "points";
  const [sort, setSort] = useState<{
    column: SortColumn;
    direction: "asc" | "desc";
  }>({ column: "movie", direction: "asc" });
  const active = movies.filter((movie) => movie.active);
  if (!active.length)
    return <Loading text="No active Fantasy Office movies are available." />;
  const sorted = [...active].sort((left, right) => {
    const value = (movie: FantasyOfficeMovie) =>
      sort.column === "points" ? movie.score.points : movie[sort.column];
    const leftValue = value(left);
    const rightValue = value(right);
    if (leftValue == null) return rightValue == null ? 0 : 1;
    if (rightValue == null) return -1;
    const comparison =
      typeof leftValue === "string"
        ? leftValue.localeCompare(String(rightValue))
        : Number(leftValue) - Number(rightValue);
    return sort.direction === "asc" ? comparison : -comparison;
  });
  const header = (label: string, column: SortColumn) => (
    <button
      className={styles.sortButton}
      type="button"
      aria-label={`Sort by ${label}${sort.column === column ? `, currently ${sort.direction === "asc" ? "ascending" : "descending"}` : ""}`}
      onClick={() =>
        setSort((current) => ({
          column,
          direction:
            current.column === column && current.direction === "asc"
              ? "desc"
              : "asc",
        }))
      }
    >
      {label}
      <span aria-hidden="true">
        {sort.column === column
          ? sort.direction === "asc"
            ? " ↑"
            : " ↓"
          : " ↕"}
      </span>
    </button>
  );
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>{header("Movie", "movie")}</th>
            <th>{header("Manager", "manager")}</th>
            <th>{header("Domestic", "domesticGross")}</th>
            <th>{header("#1", "numberOneWeekends")}</th>
            <th>{header("Letterboxd", "letterboxdRating")}</th>
            <th>{header("RT", "tomatometer")}</th>
            <th>{header("Awards", "awardPoints")}</th>
            <th>{header("Total", "points")}</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((movie) => (
            <tr key={movie.id}>
              <td>
                <strong>{movie.movie}</strong>
                <small>{movie.draftNumber}</small>
              </td>
              <td>
                <ManagerChip name={movie.manager} />
              </td>
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
            <h3>
              <ManagerChip name={standing.manager} />
            </h3>
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
  const [issueFilter, setIssueFilter] = useState("attention");
  const diagnostics = data.movies.map((movie) => ({
    movie,
    ...movieDiagnostic(movie),
  }));
  const counts = diagnostics.reduce<Record<string, number>>(
    (result, diagnostic) => {
      result[diagnostic.category] = (result[diagnostic.category] || 0) + 1;
      return result;
    },
    {},
  );
  const visibleMovies = diagnostics.filter(({ category }) =>
    issueFilter === "all"
      ? true
      : issueFilter === "attention"
        ? ["pending", "source", "error"].includes(category)
        : category === issueFilter,
  );
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
      <section className={styles.issueQueue}>
        <header>
          <div>
            <h3>Movie diagnostics</h3>
            <p>
              Pending movies have not been visited by the rotating collector.
              Missing source and collection error movies need review. Expected
              unavailable means the source page exists but has no value yet.
            </p>
          </div>
          <label>
            Show
            <select
              value={issueFilter}
              onChange={(event) => setIssueFilter(event.target.value)}
            >
              <option value="attention">Everything needing attention</option>
              <option value="pending">
                Pending first collection ({counts.pending || 0})
              </option>
              <option value="source">
                Missing source ({counts.source || 0})
              </option>
              <option value="error">
                Collection error ({counts.error || 0})
              </option>
              <option value="unavailable">
                Expected unavailable ({counts.unavailable || 0})
              </option>
              <option value="healthy">Healthy ({counts.healthy || 0})</option>
              <option value="all">All movies ({data.movies.length})</option>
            </select>
          </label>
        </header>
        <div className={styles.diagnosticCounts}>
          {(
            ["pending", "source", "error", "unavailable", "healthy"] as const
          ).map((category) => (
            <span className={styles[category]} key={category}>
              {counts[category] || 0} {diagnosticLabel(category)}
            </span>
          ))}
        </div>
      </section>
      {visibleMovies.map(({ movie, category, details }) => (
        <MovieAdminForm
          category={category}
          details={details}
          key={movie.id}
          movie={movie}
        />
      ))}
      {!visibleMovies.length ? (
        <p className={styles.notice}>No movies match this diagnostic filter.</p>
      ) : null}
    </div>
  );
}

type DiagnosticCategory =
  "pending" | "source" | "error" | "unavailable" | "healthy";

function diagnosticLabel(category: DiagnosticCategory) {
  return {
    error: "collection errors",
    healthy: "healthy",
    pending: "pending",
    source: "missing sources",
    unavailable: "expected unavailable",
  }[category];
}

function movieDiagnostic(movie: FantasyOfficeMovie): {
  category: DiagnosticCategory;
  details: string[];
} {
  const health = Object.entries(movie.health) as Array<
    [MetricName, MetricHealth]
  >;
  if (health.every(([, metric]) => !metric.lastAttemptAt)) {
    return {
      category: "pending",
      details: ["The rotating collector has not attempted this movie yet."],
    };
  }
  const missing = [
    !movie.letterboxdUrl ? "Letterboxd" : "",
    !movie.rottenTomatoesUrl ? "Rotten Tomatoes" : "",
    !movie.boxOfficeMojoUrl ? "Box Office Mojo" : "",
  ].filter(Boolean);
  const sourceDetails = missing.length
    ? [`No discovered source: ${missing.join(", ")}.`]
    : [];
  const errors = health.filter(([, metric]) =>
    ["error", "warning", "stale"].includes(metric.status),
  );
  if (errors.length) {
    return {
      category: "error",
      details: [
        ...sourceDetails,
        ...errors.map(
          ([name, metric]) =>
            `${name.replaceAll("_", " ")}: ${metric.lastErrorType || metric.status}${metric.lastErrorMessage ? ` — ${metric.lastErrorMessage}` : ""}`,
        ),
      ],
    };
  }
  if (missing.length) return { category: "source", details: sourceDetails };
  const unavailable = health
    .filter(([, metric]) => metric.status === "not_available")
    .map(([name]) => name.replaceAll("_", " "));
  if (unavailable.length) {
    return {
      category: "unavailable",
      details: [`No published value yet: ${unavailable.join(", ")}.`],
    };
  }
  return {
    category: "healthy",
    details: ["All automatic sources are healthy."],
  };
}

function MovieAdminForm({
  category,
  details,
  movie,
}: {
  category: DiagnosticCategory;
  details: string[];
  movie: FantasyOfficeMovie;
}) {
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
    <form
      className={styles.adminCard}
      id={`movie-admin-${movie.id}`}
      onSubmit={submit}
    >
      <header>
        <div>
          <h3>{movie.movie}</h3>
          <p>
            <ManagerChip name={movie.manager} /> · {movie.draftNumber}
          </p>
        </div>
        <label>
          <input defaultChecked={movie.active} name="active" type="checkbox" />{" "}
          Active
        </label>
      </header>
      <div className={styles.diagnosticStatus}>
        <strong className={styles[category]}>
          {diagnosticLabel(category)}
        </strong>
        <ul>
          {details.map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
        </ul>
      </div>
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

function ManagerChip({ name }: { name: string }) {
  const displayName = String(name).trim().split(/\s+/)[0] || "Manager";
  const color =
    MANAGER_COLORS[displayName.toLowerCase() as keyof typeof MANAGER_COLORS] ||
    "#5f6978";
  return (
    <span
      className="manager-chip"
      style={{ "--manager-color": color } as CSSProperties}
    >
      <span aria-hidden="true" className="manager-dot" />
      <span className="manager-name">{displayName}</span>
    </span>
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
