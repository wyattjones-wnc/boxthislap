import { useCallback, useEffect, useState } from "react";
import { MERCHANDISE_ENDPOINT } from "../../../modules/siteConfig";
import { useAppState } from "../../app/providers";
import styles from "./MerchandiseFeature.module.css";

type View = "unseen" | "all" | "wishlist";
type Product = {
  availability: "in_stock" | "out_of_stock" | "unknown";
  canonicalUrl: string;
  category: string;
  currency: string | null;
  firstObservedAt: string;
  id: string;
  imageUrl: string | null;
  inScope: boolean;
  newSince: string | null;
  priceMinor: number | null;
  seen: boolean;
  source: string;
  team: string;
  title: string;
  wishlisted: boolean;
};
type SourceHealth = {
  checkedAt: string | null;
  error: string | null;
  itemCount: number;
  source: string;
  stale: boolean;
  status: string;
};
type Feed = {
  items: Product[];
  pagination: { hasMore: boolean; page: number };
  sources: SourceHealth[];
};

declare global {
  interface Window {
    boxThisLapGetManagerAccessToken?: () => Promise<string>;
  }
}

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await window.boxThisLapGetManagerAccessToken?.();
  if (!token) throw new Error("Sign in as an admin to browse merchandise.");
  const response = await fetch(`${MERCHANDISE_ENDPOINT}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
    signal: AbortSignal.timeout(20000),
  });
  const value = await response.json().catch(() => ({}));
  if (!response.ok || value.ok === false)
    throw new Error(value.error || "Merchandise request failed.");
  return value as T;
}

const CATEGORY_LABELS: Record<string, string> = {
  kits: "Kits",
  clothing: "Clothing",
  footwear: "Footwear",
  accessories: "Accessories",
  "gifts-collectibles": "Gifts & collectibles",
  home: "Home",
  other: "Other",
};

export function MerchandiseFeature() {
  const { route } = useAppState();
  const [view, setView] = useState<View>("unseen");
  const [team, setTeam] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [feed, setFeed] = useState<Feed | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [confirmingId, setConfirmingId] = useState("");

  const load = useCallback(async () => {
    if (route !== "merchandise") return;
    setBusy(true);
    setError("");
    try {
      const params = new URLSearchParams({
        view,
        page: String(page),
        limit: "48",
      });
      if (team) params.set("team", team);
      if (category) params.set("category", category);
      setFeed(await api<Feed>(`/api/products?${params}`));
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Merchandise could not be loaded.",
      );
    } finally {
      setBusy(false);
    }
  }, [category, page, route, team, view]);

  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    setPage(1);
    setConfirmingId("");
  }, [category, team, view]);

  const updateState = async (
    product: Product,
    state: { seen?: boolean; wishlisted?: boolean },
  ) => {
    setError("");
    try {
      await api(`/api/products/${encodeURIComponent(product.id)}/state`, {
        method: "PATCH",
        body: JSON.stringify(state),
      });
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Product state could not be saved.",
      );
    }
  };

  const seenThrough = async (product: Product) => {
    if (confirmingId !== product.id) {
      setConfirmingId(product.id);
      setMessage(
        "Click again to mark this product and every earlier matching product across all pages seen.",
      );
      return;
    }
    setBusy(true);
    setError("");
    try {
      const value = await api<{ seen: number }>(
        `/api/products/${encodeURIComponent(product.id)}/seen-through`,
        {
          method: "PUT",
          body: JSON.stringify({ category, sort: "newest", team }),
        },
      );
      setMessage(
        `${value.seen} ${value.seen === 1 ? "product" : "products"} marked seen.`,
      );
      setConfirmingId("");
      setPage(1);
      await load();
      document
        .querySelector('[data-page="merchandise"]')
        ?.scrollIntoView({ block: "start", behavior: "smooth" });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Products could not be marked seen.",
      );
      setConfirmingId("");
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.heading}>
        <div>
          <a
            className="back-link"
            href="#the-monster-maniac"
            data-page-link="the-monster-maniac"
          >
            Admin Home
          </a>
          <p className="eyebrow">Arsenal · FC Barcelona</p>
          <h1>Merchandise</h1>
        </div>
        <div className={styles.viewTabs} aria-label="Merchandise view">
          {(["unseen", "all", "wishlist"] as View[]).map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={view === item}
              onClick={() => setView(item)}
            >
              {item[0].toUpperCase() + item.slice(1)}
            </button>
          ))}
        </div>
      </div>
      {feed?.sources?.length ? (
        <div className={styles.health}>
          {feed.sources.map((source) => (
            <div
              className={styles.healthItem}
              data-stale={source.stale || source.status !== "succeeded"}
              key={source.source}
            >
              <strong>{source.source}</strong>
              <span>
                {source.checkedAt
                  ? `Last checked ${new Date(source.checkedAt).toLocaleString()} · ${source.itemCount.toLocaleString()} items`
                  : "No successful scan yet"}
              </span>
              {source.error ? <span>{source.error}</span> : null}
            </div>
          ))}
        </div>
      ) : null}
      <div className={styles.toolbar}>
        <div className={styles.filters}>
          <label>
            Team
            <select
              aria-label="Team"
              value={team}
              onChange={(event) => setTeam(event.target.value)}
            >
              <option value="">All teams</option>
              <option value="arsenal">Arsenal</option>
              <option value="barcelona">FC Barcelona</option>
            </select>
          </label>
          <label>
            Category
            <select
              aria-label="Category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option value="">All categories</option>
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <span className={styles.resultCount}>
          {feed ? `${feed.items.length.toLocaleString()} shown` : ""}
        </span>
      </div>
      <p
        className={`${styles.notice} ${error ? styles.error : ""}`}
        role="status"
      >
        {error || message || (busy ? "Loading merchandise…" : "")}
      </p>
      {!busy && feed && !feed.items.length ? (
        <p className="table-message">
          {view === "unseen"
            ? "You're caught up."
            : "No products match this view."}
        </p>
      ) : null}
      <div className={styles.grid} aria-busy={busy}>
        {feed?.items.map((product) => (
          <article className={styles.card} key={product.id}>
            <a
              className={styles.image}
              href={product.canonicalUrl}
              target="_blank"
              rel="noopener"
              onClick={() => {
                if (!product.seen) void updateState(product, { seen: true });
              }}
            >
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span>No image</span>
              )}
            </a>
            <div className={styles.copy}>
              <p className={styles.meta}>
                {product.team === "barcelona" ? "FC Barcelona" : "Arsenal"} ·{" "}
                {CATEGORY_LABELS[product.category] || "Other"}
              </p>
              <h2>
                <a
                  href={product.canonicalUrl}
                  target="_blank"
                  rel="noopener"
                  onClick={() => {
                    if (!product.seen)
                      void updateState(product, { seen: true });
                  }}
                >
                  {product.title}
                </a>
              </h2>
              <p className={styles.price}>
                {formatPrice(product.priceMinor, product.currency)}
              </p>
              <div className={styles.badges}>
                {product.newSince ? (
                  <span className={styles.badge}>New</span>
                ) : null}
                {product.availability === "out_of_stock" ? (
                  <span className={styles.badge}>Out of stock</span>
                ) : null}
                {!product.inScope ? (
                  <span className={styles.badge}>No longer listed</span>
                ) : null}
              </div>
              <div className={styles.actions}>
                <button
                  className="action-button"
                  type="button"
                  onClick={() =>
                    void updateState(product, {
                      wishlisted: !product.wishlisted,
                    })
                  }
                >
                  {product.wishlisted ? "Remove wishlist" : "Wishlist"}
                </button>
                <button
                  className="action-button"
                  type="button"
                  onClick={() =>
                    void updateState(product, { seen: !product.seen })
                  }
                >
                  {product.seen ? "Mark unseen" : "Seen"}
                </button>
                {view === "unseen" ? (
                  <button
                    className={`action-button ${styles.seenThrough}`}
                    data-confirming={confirmingId === product.id}
                    type="button"
                    disabled={busy}
                    onClick={() => void seenThrough(product)}
                  >
                    {confirmingId === product.id
                      ? "Confirm through here"
                      : "Seen through here"}
                  </button>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </div>
      {feed && (page > 1 || feed.pagination.hasMore) ? (
        <div className={styles.pagination}>
          <button
            className="action-button"
            type="button"
            disabled={page <= 1 || busy}
            onClick={() => setPage((value) => value - 1)}
          >
            Previous
          </button>
          <span>Page {page}</span>
          <button
            className="action-button"
            type="button"
            disabled={!feed.pagination.hasMore || busy}
            onClick={() => setPage((value) => value + 1)}
          >
            Next
          </button>
        </div>
      ) : null}
    </div>
  );
}

function formatPrice(value: number | null, currency: string | null) {
  if (value === null || !currency) return "Price unavailable";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
    }).format(value / 100);
  } catch {
    return `${currency} ${(value / 100).toFixed(2)}`;
  }
}
