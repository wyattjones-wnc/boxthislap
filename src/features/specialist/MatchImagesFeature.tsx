import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, HardDriveDownload, Images, Play, X } from "lucide-react";
import { FOOTY_MATCH_NOTES_ENDPOINT } from "../../../modules/siteConfig";
import styles from "./MatchImagesFeature.module.css";

type View = "unseen" | "saved" | "hard-saved" | "seen" | "needs-match" | "all";
type ImageCandidate = {
  id: string;
  source: "arsenal" | "barcelona" | "getty";
  sourceImageUrl: string;
  originalPageUrl: string;
  renderMode: "image" | "getty_embed";
  embedUrl: string;
  caption: string;
  credit: string;
  firstObservedAt: string;
  seen: boolean;
  softSaved: boolean;
  hardSaved: boolean;
  hardSaveEligible: boolean;
  hardSaveError: string;
  assetUrl: string;
  duplicateOfImageId: string;
  teamId: string;
  matchId: string;
  gallery: {
    id: string;
    sourceUrl: string;
    title: string;
    publishedAt: string;
    category: string;
    matchConfidence: number;
    matchStatus: string;
    matchEvidence: string[];
  };
};
type Scan = {
  id: string;
  status: "queued" | "running" | "completed" | "partial" | "failed";
  requestedAt: string;
  finishedAt: string;
  sourceCount: number;
  galleryCount: number;
  newImageCount: number;
  unmatchedGalleryCount: number;
  errorCount: number;
  errorSummary: string;
};
type SourceHealth = {
  source: string;
  status: string;
  lastCheckedAt: string;
  lastSuccessAt: string;
  galleriesFound: number;
  imagesFound: number;
  error: string;
};
type Feed = {
  images: ImageCandidate[];
  pagination: { page: number; total: number; hasMore: boolean };
  facets: Array<{
    team_id: string;
    match_id: string;
    title: string;
    published_at: string;
  }>;
};
type Fixture = {
  matchId: string;
  teamId: string;
  home: string;
  away: string;
  timestamp: string;
  status: string;
};

declare global {
  interface Window {
    boxThisLapGetManagerAccessToken?: () => Promise<string>;
  }
}

async function accessToken() {
  if (!window.boxThisLapGetManagerAccessToken) {
    await new Promise<void>((resolve) => {
      const timeout = window.setTimeout(resolve, 5000);
      window.addEventListener(
        "boxthislap:manager-auth-ready",
        () => {
          window.clearTimeout(timeout);
          resolve();
        },
        { once: true },
      );
    });
  }
  return window.boxThisLapGetManagerAccessToken?.();
}

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await accessToken();
  if (!token) throw new Error("Sign in again to open Match Images.");
  const response = await fetch(`${FOOTY_MATCH_NOTES_ENDPOINT}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    },
    signal: AbortSignal.timeout(30_000),
  });
  const value = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(value.error || "Match image request failed.");
  return value;
}

function formatDate(value: string) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? value
    : date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

function isReviewableFixture(fixture: Fixture, now = Date.now()) {
  const playedAt = Date.parse(fixture.timestamp);
  if (!Number.isFinite(playedAt)) return false;
  const status = String(fixture.status || "").toUpperCase();
  if (
    ["ABANDONED", "CANCELED", "CANCELLED", "POSTPONED", "SUSPENDED"].includes(
      status,
    )
  )
    return false;
  return (
    ["FT", "FINISHED", "AET", "PEN"].includes(status) ||
    playedAt <= now - 4 * 60 * 60 * 1000
  );
}

export default function MatchImagesFeature() {
  const [view, setView] = useState<View>("unseen");
  const [teamId, setTeamId] = useState("");
  const [source, setSource] = useState("");
  const [category, setCategory] = useState("");
  const [matchId, setMatchId] = useState("");
  const [page, setPage] = useState(1);
  const [feed, setFeed] = useState<Feed | null>(null);
  const [scan, setScan] = useState<Scan | null>(null);
  const [sources, setSources] = useState<SourceHealth[]>([]);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [confirmingId, setConfirmingId] = useState("");
  const [selected, setSelected] = useState<ImageCandidate | null>(null);

  const load = useCallback(async () => {
    const query = new URLSearchParams({ page: String(page), view });
    if (teamId) query.set("teamId", teamId);
    if (source) query.set("source", source);
    if (category) query.set("category", category);
    if (matchId) query.set("matchId", matchId);
    setBusy(true);
    setError("");
    try {
      const [feedValue, healthValue] = await Promise.all([
        api<{ ok: true } & Feed>(`/api/match-media?${query}`),
        api<{ ok: true; latestScan: Scan | null; sources: SourceHealth[] }>(
          "/api/match-media/health",
        ),
      ]);
      setFeed(feedValue);
      setScan(healthValue.latestScan);
      setSources(healthValue.sources);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Match images could not be loaded.",
      );
    } finally {
      setBusy(false);
    }
  }, [category, matchId, page, source, teamId, view]);

  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    setPage(1);
    setConfirmingId("");
  }, [category, matchId, source, teamId, view]);
  useEffect(() => {
    void fetch("data/footy-schedule.json", { cache: "no-store" })
      .then((response) => response.json())
      .then((value) => {
        const rows = (value.teamSchedules || [])
          .filter((entry: { team?: { id?: string } }) =>
            ["1", "2"].includes(String(entry.team?.id || "")),
          )
          .flatMap((entry: { team: { id: string }; fixtures?: Fixture[] }) =>
            (entry.fixtures || []).map((fixture) => ({
              ...fixture,
              teamId: String(entry.team.id),
            })),
          );
        setFixtures(
          rows
            .filter((fixture: Fixture) => isReviewableFixture(fixture))
            .sort(
              (a: Fixture, b: Fixture) =>
                Date.parse(b.timestamp) - Date.parse(a.timestamp),
            ),
        );
      })
      .catch(() => setFixtures([]));
  }, []);
  useEffect(() => {
    if (!scan || !["queued", "running"].includes(scan.status)) return;
    const timer = window.setInterval(() => void load(), 5000);
    return () => window.clearInterval(timer);
  }, [load, scan]);

  const grouped = useMemo(() => {
    const values = new Map<string, ImageCandidate[]>();
    for (const image of feed?.images || []) {
      const key = image.gallery.id;
      values.set(key, [...(values.get(key) || []), image]);
    }
    return [...values.values()];
  }, [feed]);

  const runScan = async () => {
    setBusy(true);
    setError("");
    setMessage("Starting a manual scan…");
    try {
      const value = await api<{ scan: Scan }>("/api/match-media/scans", {
        method: "POST",
        body: "{}",
      });
      setScan(value.scan);
      setMessage("The scan is queued. This page will update as it runs.");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The scan could not be started.",
      );
    } finally {
      setBusy(false);
    }
  };

  const toggleSoftSave = async (image: ImageCandidate) => {
    setError("");
    try {
      await api(`/api/match-media/${encodeURIComponent(image.id)}/state`, {
        method: "PATCH",
        body: JSON.stringify({ softSaved: !image.softSaved }),
      });
      setMessage(
        image.softSaved
          ? "Reference removed from Soft Saved."
          : "Reference Soft Saved.",
      );
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Save state could not be changed.",
      );
    }
  };

  const hardSave = async (image: ImageCandidate) => {
    setBusy(true);
    setError("");
    try {
      await api(`/api/match-media/${encodeURIComponent(image.id)}/hard-save`, {
        method: "POST",
        body: "{}",
      });
      setMessage("Original copied to R2 and Soft Saved.");
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The original could not be copied.",
      );
    } finally {
      setBusy(false);
    }
  };

  const seenThrough = async (image: ImageCandidate) => {
    if (confirmingId !== image.id) {
      setConfirmingId(image.id);
      setMessage(
        "Click again to mark this image and every newer matching image across all pages seen.",
      );
      return;
    }
    setBusy(true);
    setError("");
    try {
      const value = await api<{ seen: number }>(
        `/api/match-media/${encodeURIComponent(image.id)}/seen-through`,
        {
          method: "PUT",
          body: JSON.stringify({
            category,
            matchId,
            sort: "newest",
            source,
            teamId,
          }),
        },
      );
      setMessage(
        `${value.seen} ${value.seen === 1 ? "image" : "images"} marked seen.`,
      );
      setConfirmingId("");
      setPage(1);
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Images could not be marked seen.",
      );
      setConfirmingId("");
    } finally {
      setBusy(false);
    }
  };

  const reviewGallery = async (
    image: ImageCandidate,
    nextMatchId: string,
    rejected = false,
  ) => {
    setBusy(true);
    setError("");
    try {
      await api(
        `/api/match-media/galleries/${encodeURIComponent(image.gallery.id)}`,
        {
          method: "PATCH",
          body: JSON.stringify({ matchId: nextMatchId, rejected }),
        },
      );
      setMessage(
        rejected
          ? "Gallery rejected."
          : "Gallery linked to the selected match.",
      );
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Gallery review could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  };

  const copyAsset = async (image: ImageCandidate) => {
    await navigator.clipboard.writeText(
      `${FOOTY_MATCH_NOTES_ENDPOINT}${image.assetUrl}`,
    );
    setMessage("Site image URL copied.");
  };

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div>
          <a
            className="back-link"
            href="#the-monster-maniac"
            data-page-link="the-monster-maniac"
          >
            Admin Home
          </a>
          <p className="eyebrow">Arsenal · FC Barcelona · Getty</p>
          <h1>Match Images</h1>
          <p>
            Scan official post-match galleries, review every candidate, and keep
            references or durable site copies.
          </p>
        </div>
        <button
          className="action-button"
          type="button"
          disabled={
            busy || Boolean(scan && ["queued", "running"].includes(scan.status))
          }
          onClick={() => void runScan()}
        >
          <Play aria-hidden="true" /> Scan for new images
        </button>
      </header>

      {scan ? (
        <section className={styles.scan} aria-label="Latest scan">
          <strong>Latest scan: {scan.status}</strong>
          <span>{formatDate(scan.requestedAt)}</span>
          <span>
            {scan.galleryCount} galleries · {scan.newImageCount} images ·{" "}
            {scan.unmatchedGalleryCount} need matching
          </span>
          {scan.errorSummary ? <p>{scan.errorSummary}</p> : null}
        </section>
      ) : null}
      <details className={styles.health}>
        <summary>Source health</summary>
        <div>
          {sources.map((item) => (
            <p key={item.source}>
              <strong>{item.source}</strong> · {item.status} ·{" "}
              {item.imagesFound} images
              {item.lastCheckedAt ? ` · ${formatDate(item.lastCheckedAt)}` : ""}
              {item.error ? ` · ${item.error}` : ""}
            </p>
          ))}
        </div>
      </details>

      <div className={styles.filters}>
        <label>
          <span>View</span>
          <select
            value={view}
            onChange={(event) => setView(event.target.value as View)}
          >
            <option value="unseen">Unseen</option>
            <option value="saved">Soft Saved</option>
            <option value="hard-saved">Hard Saved</option>
            <option value="seen">Seen</option>
            <option value="needs-match">Needs Match</option>
            <option value="all">All</option>
          </select>
        </label>
        <label>
          <span>Team</span>
          <select
            value={teamId}
            onChange={(event) => setTeamId(event.target.value)}
          >
            <option value="">All teams</option>
            <option value="1">Arsenal</option>
            <option value="2">Barcelona</option>
          </select>
        </label>
        <label>
          <span>Source</span>
          <select
            value={source}
            onChange={(event) => setSource(event.target.value)}
          >
            <option value="">All sources</option>
            <option value="arsenal">Arsenal</option>
            <option value="barcelona">Barcelona</option>
            <option value="getty">Getty</option>
          </select>
        </label>
        <label>
          <span>Category</span>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="">All categories</option>
            <option value="match">Match</option>
            <option value="celebration">Celebration</option>
            <option value="behind_scenes">Behind the scenes</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label>
          <span>Match</span>
          <select
            value={matchId}
            onChange={(event) => setMatchId(event.target.value)}
          >
            <option value="">All matches</option>
            {feed?.facets
              .filter((item) => item.match_id)
              .map((item) => (
                <option
                  value={item.match_id}
                  key={`${item.match_id}:${item.title}`}
                >
                  {item.title}
                </option>
              ))}
          </select>
        </label>
      </div>

      <p className={styles.status} role="status">
        {busy ? "Working… " : ""}
        {error || message || `${feed?.pagination.total || 0} images`}
      </p>
      {grouped.map((images) => {
        const first = images[0];
        return (
          <section className={styles.gallery} key={first.gallery.id}>
            <div className={styles.galleryHeading}>
              <div>
                <p className="eyebrow">
                  {first.teamId === "1" ? "Arsenal" : "Barcelona"} ·{" "}
                  {first.source}
                </p>
                <h2>{first.gallery.title}</h2>
                <p>
                  {formatDate(first.gallery.publishedAt)} · {images.length}{" "}
                  images · confidence {first.gallery.matchConfidence}
                </p>
              </div>
              <a
                href={first.gallery.sourceUrl}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink aria-hidden="true" /> Original gallery
              </a>
            </div>
            {view === "needs-match" ? (
              <GalleryReview
                image={first}
                fixtures={fixtures.filter((fixture) => {
                  if (fixture.teamId !== first.teamId) return false;
                  const published = Date.parse(first.gallery.publishedAt);
                  const played = Date.parse(fixture.timestamp);
                  return (
                    !Number.isFinite(published) ||
                    !Number.isFinite(played) ||
                    Math.abs(published - played) <= 3 * 86_400_000
                  );
                })}
                busy={busy}
                onSave={reviewGallery}
              />
            ) : null}
            <div className={styles.grid}>
              {images.map((image) => (
                <article className={styles.card} key={image.id}>
                  <button
                    className={styles.preview}
                    type="button"
                    onClick={() => setSelected(image)}
                    aria-label="Open full image"
                  >
                    {image.renderMode === "getty_embed" ? (
                      <iframe
                        src={image.embedUrl}
                        title={image.caption || "Getty image"}
                        sandbox="allow-scripts allow-same-origin allow-popups"
                        loading="lazy"
                      />
                    ) : (
                      <img
                        src={image.sourceImageUrl}
                        alt={image.caption || image.gallery.title}
                        loading="lazy"
                      />
                    )}
                  </button>
                  <div className={styles.meta}>
                    {image.credit ? <small>{image.credit}</small> : null}
                    <div className={styles.actions}>
                      <button
                        type="button"
                        onClick={() => void toggleSoftSave(image)}
                      >
                        {image.softSaved ? "Remove Soft Save" : "Soft Save"}
                      </button>
                      {image.hardSaved ? (
                        <button
                          type="button"
                          onClick={() => void copyAsset(image)}
                        >
                          Copy Site URL
                        </button>
                      ) : image.hardSaveEligible ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void hardSave(image)}
                        >
                          <HardDriveDownload aria-hidden="true" /> Hard Save
                        </button>
                      ) : (
                        <span className={styles.restriction}>Embed only</span>
                      )}
                      {view === "unseen" ? (
                        <button
                          className="action-button"
                          data-confirming={confirmingId === image.id}
                          type="button"
                          disabled={busy}
                          onClick={() => void seenThrough(image)}
                        >
                          {confirmingId === image.id
                            ? "Confirm through here"
                            : "Seen through here"}
                        </button>
                      ) : null}
                      <a
                        href={image.originalPageUrl}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="Open original source"
                      >
                        <ExternalLink aria-hidden="true" />
                      </a>
                    </div>
                    {image.hardSaveError ? (
                      <small className={styles.error}>
                        {image.hardSaveError}
                      </small>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          </section>
        );
      })}
      {!busy && !grouped.length ? (
        <div className={styles.empty}>
          <Images aria-hidden="true" />
          <h2>No matching images</h2>
          <p>
            {view === "unseen"
              ? "You're caught up on matched images. Galleries awaiting a fixture are kept in Needs Match."
              : "Run a scan or change the current filters."}
          </p>
          {view === "unseen" ? (
            <button
              type="button"
              className="action-button"
              onClick={() => {
                setView("needs-match");
                setPage(1);
              }}
            >
              Review Needs Match
            </button>
          ) : null}
        </div>
      ) : null}
      {feed && (page > 1 || feed.pagination.hasMore) ? (
        <div className={styles.pagination}>
          <button
            type="button"
            disabled={busy || page <= 1}
            onClick={() => setPage((value) => value - 1)}
          >
            Previous
          </button>
          <span>Page {page}</span>
          <button
            type="button"
            disabled={busy || !feed.pagination.hasMore}
            onClick={() => setPage((value) => value + 1)}
          >
            Next
          </button>
        </div>
      ) : null}
      {selected ? (
        <div
          className={styles.lightbox}
          role="dialog"
          aria-modal="true"
          aria-label="Match image"
        >
          <button
            className={styles.close}
            type="button"
            onClick={() => setSelected(null)}
            aria-label="Close image"
          >
            <X aria-hidden="true" />
          </button>
          {selected.renderMode === "getty_embed" ? (
            <iframe
              src={selected.embedUrl}
              title={selected.caption || "Getty image"}
              sandbox="allow-scripts allow-same-origin allow-popups"
            />
          ) : (
            <img
              src={selected.sourceImageUrl}
              alt={selected.caption || selected.gallery.title}
            />
          )}
        </div>
      ) : null}
    </div>
  );
}

function GalleryReview({
  image,
  fixtures,
  busy,
  onSave,
}: {
  image: ImageCandidate;
  fixtures: Fixture[];
  busy: boolean;
  onSave: (
    image: ImageCandidate,
    matchId: string,
    rejected?: boolean,
  ) => Promise<void>;
}) {
  const [value, setValue] = useState("");
  return (
    <div className={styles.review}>
      <label>
        <span>Attach to match</span>
        <select
          value={value}
          onChange={(event) => setValue(event.target.value)}
        >
          <option value="">Choose a completed fixture</option>
          {fixtures.map((fixture) => (
            <option value={fixture.matchId} key={fixture.matchId}>
              {new Date(fixture.timestamp).toLocaleDateString()} ·{" "}
              {fixture.home} v {fixture.away}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        disabled={busy || !value}
        onClick={() => void onSave(image, value)}
      >
        Link gallery
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => void onSave(image, "", true)}
      >
        Reject
      </button>
    </div>
  );
}
