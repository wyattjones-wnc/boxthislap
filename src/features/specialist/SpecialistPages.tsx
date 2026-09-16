import { BarChart3, Filter, List, X } from "lucide-react";
import { IconButton } from "../../components/IconButton/IconButton";

function Skeletons({ count }: { count: number }) {
  return Array.from({ length: count }, (_, index) => (
    <span className="platinum-skeleton" key={index} />
  ));
}

export function AdminHomePage() {
  return (
    <>
      <div className="section-heading page-heading-with-action admin-home-heading">
        <div>
          <p className="eyebrow">TheMonsterManiac</p>
          <h1>Home</h1>
        </div>
        <div className="admin-home-actions">
          <a
            className="icon-action-button"
            href="#trophy-log"
            data-page-link="trophy-log"
            aria-label="Open Trophy Log"
            title="Trophy Log"
          >
            <List aria-hidden="true" />
          </a>
          <a
            className="icon-action-button"
            href="#trophy-stats"
            data-page-link="trophy-stats"
            aria-label="Open Trophy Stats"
            title="Trophy Stats"
          >
            <BarChart3 aria-hidden="true" />
          </a>
        </div>
      </div>
      <details className="favorite-trophies-card" id="favorite-trophies-card">
        <summary className="favorite-trophies-summary">
          <span>Favorite Trophies</span>
        </summary>
        <div
          className="platinums-grid favorite-trophies-grid"
          id="favorite-trophies-grid"
          aria-live="polite"
          aria-busy="true"
        >
          <Skeletons count={4} />
        </div>
      </details>
      <div className="manager-hub-grid">
        <section
          className="manager-hub-card"
          aria-labelledby="admin-platinums-heading"
        >
          <div className="manager-hub-card-heading">
            <h2 id="admin-platinums-heading">
              Platinums <span id="admin-platinums-count" />
            </h2>
          </div>
          <div
            className="platinums-grid"
            id="admin-platinums-grid"
            aria-live="polite"
            aria-busy="true"
          >
            <Skeletons count={6} />
          </div>
          <button
            className="action-button platinums-show-more"
            id="admin-platinums-show-more"
            type="button"
            aria-controls="admin-platinums-grid"
            aria-expanded="false"
            hidden
          >
            Show More
          </button>
        </section>
      </div>
    </>
  );
}

export function TrophyStatsPage() {
  return (
    <>
      <a
        className="back-link"
        href="#the-monster-maniac"
        data-page-link="the-monster-maniac"
      >
        Home
      </a>
      <div className="section-heading">
        <p className="eyebrow">PlayStation Network</p>
        <h1>Trophy Stats</h1>
        <p className="trophy-stats-updated" id="trophy-stats-updated">
          Live data from PlayStation Network
        </p>
      </div>
      <div id="trophy-stats-content" aria-live="polite" aria-busy="true">
        <span className="loading-message">
          <span className="loading-spinner" aria-hidden="true" />
          Loading PSN trophy stats...
        </span>
      </div>
    </>
  );
}

export function CollectiblesPage() {
  return (
    <>
      <div className="section-heading page-heading-with-action collectibles-heading">
        <div>
          <a
            className="back-link"
            href="#the-monster-maniac"
            data-page-link="the-monster-maniac"
          >
            TheMonsterManiac
          </a>
          <p className="eyebrow">Monster Trucks</p>
          <h1>Collectibles</h1>
        </div>
        <label className="collectibles-view-control">
          <span>View</span>
          <select
            id="collectibles-view-select"
            aria-label="Collection view"
            defaultValue="collection"
          >
            <option value="collection">Checklist</option>
            <option value="owned">My Collection</option>
            <option value="missing">Missing</option>
            <option value="wishlist">Wishlist</option>
            <option value="catalog">Full Catalog</option>
          </select>
        </label>
      </div>
      <div
        className="collectibles-stats"
        id="collectibles-stats"
        aria-live="polite"
      />
      <div className="collectibles-toolbar">
        <IconButton
          className="icon-action-button"
          icon={<Filter />}
          id="collectibles-filter-toggle"
          label="Show collectible filters"
          aria-expanded="false"
          aria-controls="collectibles-filters"
        />
      </div>
      <nav
        className="collectibles-breadcrumbs"
        id="collectibles-breadcrumbs"
        aria-label="Catalog location"
      />
      <CollectiblesFilters />
      <div className="collectibles-results-heading">
        <h2>Checklist</h2>
        <span id="collectibles-result-count" />
      </div>
      <div
        className="collectibles-grid"
        id="collectibles-grid"
        aria-live="polite"
        aria-busy="false"
      >
        <p className="table-message">
          <span className="loading-spinner" aria-hidden="true" />
          Loading collectibles...
        </p>
      </div>
      <div className="collectibles-pagination" id="collectibles-pagination" />
      <dialog
        className="collectible-detail-dialog"
        id="collectible-detail-dialog"
      >
        <IconButton
          className="dialog-close"
          data-collectible-close
          icon={<X />}
          label="Close collectible details"
        />
        <div id="collectible-detail-content" />
      </dialog>
    </>
  );
}

function CollectiblesFilters() {
  return (
    <form className="collectibles-filters" id="collectibles-filters" hidden>
      <label className="collectibles-search">
        <span>Search</span>
        <input
          type="search"
          name="search"
          placeholder="Name, item number, or variant"
        />
      </label>
      <label>
        <span>Ownership</span>
        <select name="status" defaultValue="">
          <option value="">All</option>
          <option value="unreviewed">Unreviewed</option>
          <option value="owned">Have</option>
          <option value="not_owned">Don&apos;t Have</option>
          <option value="wanted">Want</option>
        </select>
      </label>
      {[
        ["manufacturer", "Manufacturer", "All manufacturers"],
        ["year", "Year", "All years"],
        ["scale", "Scale", "All scales"],
        ["category", "Catalog category", "All catalog categories"],
      ].map(([name, label, option]) => (
        <label key={name}>
          <span>{label}</span>
          <select name={name} defaultValue="">
            <option value="">{option}</option>
          </select>
        </label>
      ))}
      <label>
        <span>Sort</span>
        <select name="sort" defaultValue="source">
          <option value="source">Catalog order</option>
          <option value="year_desc">Year newest</option>
          <option value="year_asc">Year oldest</option>
          <option value="name_asc">Name A–Z</option>
          <option value="name_desc">Name Z–A</option>
          <option value="item_number">Item number</option>
          <option value="manufacturer">Manufacturer</option>
          <option value="recently_acquired">Recently acquired</option>
          <option value="recently_updated">Recently updated</option>
          <option value="owned_first">Owned first</option>
          <option value="missing_first">Missing first</option>
        </select>
      </label>
      <label>
        <span>Checklist visibility</span>
        <select name="scope" defaultValue="active">
          <option value="active">Checklist items</option>
          <option value="excluded">Excluded only</option>
          <option value="all">Include excluded</option>
        </select>
      </label>
      <label>
        <span>Page</span>
        <select name="page" disabled defaultValue="1">
          <option value="1">Page 1</option>
        </select>
      </label>
      <div className="collectibles-filter-actions">
        <button className="action-button" type="submit">
          Apply
        </button>
        <button
          className="footer-copy-link"
          type="button"
          data-collectibles-clear
        >
          Clear filters
        </button>
      </div>
    </form>
  );
}

export function TrophyLogPage() {
  return (
    <>
      <div className="section-heading">
        <a
          className="back-link"
          href="#the-monster-maniac"
          data-page-link="the-monster-maniac"
        >
          Home
        </a>
        <p className="eyebrow">PlayStation Network</p>
        <h1>Trophy Log</h1>
      </div>
      <div className="trophy-log-toolbar">
        <IconButton
          className="icon-action-button trophy-log-filter-toggle"
          icon={<Filter />}
          id="trophy-log-filter-toggle"
          label="Show trophy filters and sorting"
          aria-expanded="false"
          aria-controls="trophy-log-filter-panel"
        />
        <button className="action-button" id="trophy-log-refresh" type="button">
          Refresh
        </button>
        <span
          className="trophy-log-sync-status"
          id="trophy-log-sync-status"
          role="status"
        />
      </div>
      <div
        className="trophy-log-filter-panel"
        id="trophy-log-filter-panel"
        hidden
      >
        <div
          className="trophy-log-filters"
          id="trophy-log-filters"
          role="group"
          aria-label="Trophy log view"
        >
          {[
            ["unsorted", "Unsorted"],
            ["favorites", "Favorites"],
            ["seen", "Not Favorites"],
            ["all", "All Earned"],
            ["platinums", "Platinums"],
          ].map(([view, label]) => (
            <button type="button" data-trophy-log-view={view} key={view}>
              {label}
            </button>
          ))}
        </div>
        <label className="trophy-log-sort">
          <span>Sort</span>
          <select id="trophy-log-sort" defaultValue="">
            <option value="" disabled>
              Choose a sort
            </option>
            <option value="newest">Newest earned</option>
            <option value="oldest">Oldest earned</option>
            <option value="name">Trophy name</option>
            <option value="rarity">Rarest first</option>
            <option value="platinum-duration-desc">
              Platinum: longest to earn
            </option>
            <option value="platinum-duration-asc">
              Platinum: shortest to earn
            </option>
          </select>
        </label>
      </div>
      <div className="trophy-log-results-heading">
        <h2>Trophies</h2>
        <span id="trophy-log-result" />
      </div>
      <div
        className="trophy-log-grid"
        id="trophy-log-grid"
        aria-live="polite"
        aria-busy="true"
      >
        <p className="table-message">
          <span className="loading-spinner" aria-hidden="true" />
          Loading trophy log...
        </p>
      </div>
      <div className="trophy-log-pagination" id="trophy-log-pagination" />
      <PsnAuthentication />
    </>
  );
}

function PsnAuthentication() {
  return (
    <details className="psn-auth-card">
      <summary>Renew PlayStation Sign-In</summary>
      <div className="psn-auth-content">
        <p>
          Sony requires the NPSSO to be copied from its own signed-in page. Your
          password and two-factor code stay with PlayStation.
        </p>
        <ol>
          <li>
            <a
              className="back-link"
              href="https://www.playstation.com/"
              target="_blank"
              rel="noopener"
            >
              Open PlayStation Sign-In
            </a>{" "}
            and finish signing in.
          </li>
          <li>
            <a
              className="back-link"
              href="https://ca.account.sony.com/api/v1/ssocookie"
              target="_blank"
              rel="noopener"
            >
              Open Sony&apos;s NPSSO page
            </a>{" "}
            in the same browser.
          </li>
          <li>
            Copy only the 64-character value inside{" "}
            <code>&quot;npsso&quot;</code>, then paste it below.
          </li>
        </ol>
        <form className="psn-auth-form" id="psn-auth-form">
          <label>
            <span>NPSSO token</span>
            <input
              type="password"
              name="npsso"
              minLength={64}
              maxLength={64}
              autoComplete="off"
              spellCheck="false"
              required
            />
          </label>
          <button className="action-button" type="submit">
            Validate &amp; Save
          </button>
        </form>
        <p className="psn-auth-status" id="psn-auth-status" role="status">
          Checking PSN access...
        </p>
      </div>
    </details>
  );
}

export function YouTubePage() {
  return (
    <div id="youtube-inbox-view">
      <div className="youtube-loading-grid" aria-label="Loading YouTube inbox">
        <span className="youtube-skeleton-card" />
        <span className="youtube-skeleton-card" />
        <span className="youtube-skeleton-card" />
      </div>
    </div>
  );
}
