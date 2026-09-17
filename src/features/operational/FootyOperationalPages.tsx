import { ChevronLeft, Filter, Plus, X } from "lucide-react";
import type { ReactNode } from "react";
import { IconButton } from "../../components/IconButton/IconButton";

function LoadingMessage({ children }: { children: string }) {
  return (
    <p className="table-message loading-message">
      <span className="loading-spinner" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

function FootyBackHeading({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="section-heading page-heading-with-action footy-heading">
      <div>
        <a
          className="back-link back-link--library-icon"
          href="#footy"
          data-page-link="footy"
        >
          <ChevronLeft aria-hidden="true" />
          Footy
        </a>
        <h1>{title}</h1>
      </div>
      {children ? <div className="heading-actions">{children}</div> : null}
    </div>
  );
}

export function FootyMissingNotesPage() {
  return (
    <>
      <div className="section-heading page-heading-with-action footy-heading">
        <div>
          <a
            className="back-link back-link--library-icon"
            href="#manager-hub"
            data-page-link="manager-hub"
          >
            <ChevronLeft aria-hidden="true" />
            Manager Hub
          </a>
          <h1>Missing Match Notes</h1>
        </div>
        <div className="heading-actions">
          <IconButton
            className="icon-action-button footy-filter-toggle"
            icon={<Filter />}
            id="footy-missing-notes-filter-toggle"
            label="Show missing match note filters"
            aria-controls="footy-missing-notes-filters"
            aria-expanded="false"
          />
        </div>
      </div>
      <div
        className="footy-filters footy-missing-notes-filters"
        id="footy-missing-notes-filters"
        hidden
      >
        <label>
          <span>Search</span>
          <input
            id="footy-missing-notes-search"
            type="search"
            placeholder="Search"
            autoComplete="off"
          />
        </label>
        <label>
          <span>Date</span>
          <span className="footy-date-range">
            <input
              id="footy-missing-notes-date-from"
              type="date"
              aria-label="Date from"
            />
            <input
              id="footy-missing-notes-date-to"
              type="date"
              aria-label="Date to"
            />
          </span>
        </label>
        <label>
          <span>Competition</span>
          <select id="footy-missing-notes-competition">
            <option value="">All competitions</option>
          </select>
        </label>
        <label>
          <span>Match Week / Day</span>
          <select id="footy-missing-notes-match-period">
            <option value="">All match weeks / days</option>
          </select>
        </label>
        <label>
          <span>Team</span>
          <select id="footy-missing-notes-team">
            <option value="">All teams</option>
          </select>
        </label>
      </div>
      <p
        className="footy-missing-notes-summary"
        id="footy-missing-notes-summary"
        aria-live="polite"
      />
      <div
        className="content-shell"
        id="footy-missing-notes-list"
        aria-live="polite"
        aria-busy="true"
      >
        <LoadingMessage>Loading missing match notes...</LoadingMessage>
      </div>
      <nav
        className="footy-missing-notes-pagination"
        id="footy-missing-notes-pagination"
        aria-label="Missing match notes pages"
        hidden
      />
    </>
  );
}

export function FootyCustomSchedulePage() {
  return (
    <>
      <FootyBackHeading title="Custom Schedule" />
      <p className="body-copy footy-custom-intro">
        Choose any number of teams to build a combined schedule.
      </p>
      <div
        className="footy-custom-selection-summary"
        id="footy-custom-selection-summary"
        hidden
      >
        <div>
          <span>Schedule for</span>
          <strong id="footy-custom-selection-names" />
        </div>
        <button
          className="action-button"
          id="footy-custom-change"
          type="button"
        >
          Change teams
        </button>
      </div>
      <div
        className="footy-filters footy-custom-filters"
        id="footy-custom-filters"
        hidden
      >
        <label>
          <span>Search matches</span>
          <input
            id="footy-custom-match-search"
            type="search"
            placeholder="Team, competition, venue"
            autoComplete="off"
          />
        </label>
        <label>
          <span>Date</span>
          <span className="footy-date-range">
            <input
              id="footy-custom-date-from"
              type="date"
              aria-label="Custom schedule date from"
            />
            <input
              id="footy-custom-date-to"
              type="date"
              aria-label="Custom schedule date to"
            />
          </span>
        </label>
        <label>
          <span>Competition</span>
          <select id="footy-custom-match-competition">
            <option value="">All competitions</option>
          </select>
        </label>
        <label>
          <span>Time</span>
          <select id="footy-custom-time-filter">
            <option value="upcoming">Upcoming matches</option>
            <option value="past">Past matches</option>
            <option value="all">All matches</option>
          </select>
        </label>
      </div>
      <div className="footy-custom-team-tools" id="footy-custom-team-tools">
        <label>
          <span>Find teams</span>
          <input
            id="footy-custom-team-search"
            type="search"
            placeholder="Search team names"
            autoComplete="off"
          />
        </label>
        <label>
          <span>Competition</span>
          <select id="footy-custom-team-competition">
            <option value="">All competitions</option>
          </select>
        </label>
        <label className="footy-checkbox-control">
          <input id="footy-custom-selected-only" type="checkbox" />
          <span>Selected only</span>
        </label>
        <button
          className="footer-copy-link"
          id="footy-custom-clear"
          type="button"
        >
          Clear selection
        </button>
      </div>
      <div
        className="footy-custom-team-picker"
        id="footy-custom-team-picker"
        aria-live="polite"
      >
        <LoadingMessage>Loading teams...</LoadingMessage>
      </div>
      <div className="footy-custom-team-actions" id="footy-custom-team-actions">
        <button
          className="action-button"
          id="footy-custom-confirm"
          type="button"
          disabled
        >
          Show schedule
        </button>
      </div>
      <div
        className="content-shell footy-custom-schedule-list"
        id="footy-custom-schedule-list"
        aria-live="polite"
      >
        <p className="table-message">
          Confirm your teams to create a schedule.
        </p>
      </div>
    </>
  );
}

export function FootyTeamPage() {
  return (
    <>
      <div className="section-heading page-heading-with-action footy-team-heading">
        <div>
          <a
            className="back-link back-link--library-icon"
            href="#footy"
            data-page-link="footy"
          >
            <ChevronLeft aria-hidden="true" />
            Footy
          </a>
          <h1 id="footy-team-title">Team</h1>
        </div>
        <div className="heading-actions heading-actions-right">
          <div
            className="segmented-control ranking-mode-toggle footy-team-view-toggle"
            role="group"
            aria-label="Team page view"
          >
            <button
              className="is-active"
              type="button"
              data-footy-team-view-mode="schedule"
              aria-pressed="true"
            >
              Schedule
            </button>
            <button
              type="button"
              data-footy-team-view-mode="team"
              aria-pressed="false"
            >
              Team
            </button>
          </div>
        </div>
      </div>
      <div className="content-shell" id="footy-team-content">
        <p className="table-message">Loading team...</p>
      </div>
      <dialog
        className="footy-note-dialog footy-trading-card-dialog"
        id="footy-trading-card-dialog"
      >
        <form
          className="footy-note-form footy-trading-card-form"
          method="dialog"
        >
          <div
            id="footy-trading-card-content"
            className="footy-trading-card-content"
          />
        </form>
      </dialog>
      <RosterEditorDialog />
      <TradingCardImageEditorDialog />
    </>
  );
}

function RosterEditorDialog() {
  return (
    <dialog
      className="footy-note-dialog footy-roster-editor-dialog"
      id="footy-roster-editor-dialog"
      data-admin-only
      hidden
    >
      <form
        className="footy-note-form footy-roster-editor-form"
        id="footy-roster-editor-form"
      >
        <div className="dialog-heading">
          <div>
            <span className="eyebrow" id="footy-roster-editor-season" />
            <h2 id="footy-roster-editor-title">Edit player</h2>
          </div>
          <IconButton
            className="icon-action-button"
            icon={<X />}
            id="footy-roster-editor-close"
            label="Close roster editor"
          />
        </div>
        <input id="footy-roster-editor-id" type="hidden" />
        <div className="footy-roster-editor-fields">
          <label>
            <span>Player</span>
            <input id="footy-roster-editor-name" required maxLength={300} />
          </label>
          <label>
            <span>Position</span>
            <input id="footy-roster-editor-position" maxLength={100} />
          </label>
          <label>
            <span>Number</span>
            <input id="footy-roster-editor-number" maxLength={20} />
          </label>
          <label>
            <span>Appearances</span>
            <input id="footy-roster-editor-appearances" maxLength={40} />
          </label>
          <label>
            <span>Birthday</span>
            <input id="footy-roster-editor-birthday" type="date" />
          </label>
          <label>
            <span>Home country</span>
            <input id="footy-roster-editor-country" maxLength={100} />
          </label>
          <label>
            <span>Year joined</span>
            <input id="footy-roster-editor-joined" maxLength={20} />
          </label>
          <label>
            <span>Club joined from</span>
            <input id="footy-roster-editor-from" maxLength={200} />
          </label>
          <label>
            <span>Transfer-out date</span>
            <input id="footy-roster-editor-transfer" type="date" />
          </label>
          <label>
            <span>Profile image</span>
            <input
              id="footy-roster-editor-profile"
              type="file"
              accept="image/png,image/jpeg,image/webp"
            />
          </label>
          <label>
            <span>Trading-card image</span>
            <input
              id="footy-roster-editor-card"
              type="file"
              accept="image/png,image/jpeg,image/webp"
            />
          </label>
        </div>
        <div className="footy-roster-editor-checks">
          <label>
            <input id="footy-roster-editor-academy" type="checkbox" />
            <span>Academy product</span>
          </label>
          <label>
            <input id="footy-roster-editor-new" type="checkbox" />
            <span>New player</span>
          </label>
          <label id="footy-roster-editor-default-profile-row" hidden>
            <input id="footy-roster-editor-default-profile" type="checkbox" />
            <span>Use default profile image</span>
          </label>
          <label id="footy-roster-editor-default-card-row" hidden>
            <input id="footy-roster-editor-default-card" type="checkbox" />
            <span>Use default card image</span>
          </label>
          <label id="footy-roster-editor-keep-row" hidden>
            <input id="footy-roster-editor-keep" type="checkbox" />
            <span>Keep manually if provider omits player</span>
          </label>
          <label>
            <input id="footy-roster-editor-archive" type="checkbox" />
            <span>Archive from this season</span>
          </label>
        </div>
        <p
          className="table-message footy-roster-editor-source"
          id="footy-roster-editor-source"
        />
        <p
          className="form-status"
          id="footy-roster-editor-status"
          role="status"
        />
        <div className="dialog-actions">
          <button
            className="footer-copy-link"
            id="footy-roster-editor-cancel"
            type="button"
          >
            Cancel
          </button>
          <button className="action-button" type="submit">
            Save player
          </button>
        </div>
      </form>
    </dialog>
  );
}

function TradingCardImageEditorDialog() {
  return (
    <dialog
      className="footy-note-dialog trading-card-image-editor-dialog"
      id="trading-card-image-editor-dialog"
      data-admin-only
      hidden
    >
      <form
        className="footy-note-form trading-card-image-editor-form"
        id="trading-card-image-editor-form"
      >
        <div className="dialog-heading">
          <div>
            <span className="eyebrow">Trading-card image</span>
            <h2>Position image</h2>
          </div>
          <IconButton
            className="icon-action-button"
            icon={<X />}
            id="trading-card-image-editor-close"
            label="Close image editor"
          />
        </div>
        <p className="table-message trading-card-image-editor-help">
          Drag the image to position it. Use the slider or pinch to resize it.
          The card elements are previews and will remain layered above the saved
          image.
        </p>
        <div
          className="trading-card-image-editor-stage"
          id="trading-card-image-editor-stage"
        >
          <canvas id="trading-card-image-editor-canvas" />
          <div
            id="trading-card-image-editor-overlay"
            className="trading-card-image-editor-overlay"
            aria-hidden="true"
          />
        </div>
        <label className="trading-card-image-editor-zoom">
          <span>Image size</span>
          <input
            id="trading-card-image-editor-zoom"
            type="range"
            min="1"
            max="3"
            step="0.01"
            defaultValue="1"
          />
        </label>
        <p
          className="form-status"
          id="trading-card-image-editor-status"
          role="status"
        />
        <div className="dialog-actions">
          <button
            className="footer-copy-link"
            id="trading-card-image-editor-reset"
            type="button"
          >
            Reset
          </button>
          <button
            className="footer-copy-link"
            id="trading-card-image-editor-cancel"
            type="button"
          >
            Cancel
          </button>
          <button className="action-button" type="submit">
            Use image
          </button>
        </div>
      </form>
    </dialog>
  );
}

export function FootyPerfectPage() {
  return (
    <>
      <FootyBackHeading title="10/10 Performances">
        <IconButton
          className="icon-action-button"
          icon={<Filter />}
          id="footy-perfect-filter-toggle"
          label="Show 10 out of 10 filters"
          aria-controls="footy-perfect-filters"
          aria-expanded="false"
        />
        <IconButton
          className="icon-action-button"
          icon={<Plus />}
          id="footy-perfect-add"
          label="Add a 10 out of 10 performance"
          data-admin-only
          hidden
        />
      </FootyBackHeading>
      <div
        className="footy-filters footy-perfect-filters"
        id="footy-perfect-filters"
        hidden
      >
        <label>
          <span>Search</span>
          <input
            id="footy-perfect-search"
            type="search"
            placeholder="Player, team, competition"
            autoComplete="off"
          />
        </label>
        <label>
          <span>Date</span>
          <span className="footy-date-range">
            <input
              id="footy-perfect-date-from"
              type="date"
              aria-label="10 out of 10 date from"
            />
            <input
              id="footy-perfect-date-to"
              type="date"
              aria-label="10 out of 10 date to"
            />
          </span>
        </label>
        <label>
          <span>Player Team</span>
          <select
            id="footy-perfect-team-filter"
            aria-label="Filter by player team"
          >
            <option value="">All teams</option>
          </select>
        </label>
        <label>
          <span>Competition</span>
          <select
            id="footy-perfect-competition-filter"
            aria-label="Filter by competition"
          >
            <option value="">All competitions</option>
          </select>
        </label>
        <div className="footy-filter-toggles footy-perfect-filter-toggles">
          <label className="footy-checkbox-control">
            <input id="footy-perfect-edit-toggle" type="checkbox" />
            <span>Edit entries</span>
          </label>
        </div>
      </div>
      <div
        className="content-shell footy-perfect-list"
        id="footy-perfect-list"
        aria-live="polite"
        aria-busy="true"
      >
        <LoadingMessage>Loading 10/10 performances...</LoadingMessage>
      </div>
    </>
  );
}

export function FootySeenPage() {
  return (
    <>
      <FootyBackHeading title="Seen Matches">
        <IconButton
          className="icon-action-button"
          icon={<Filter />}
          id="footy-seen-filter-toggle"
          label="Show seen match filters"
          aria-controls="footy-seen-filters"
          aria-expanded="false"
        />
        <IconButton
          className="icon-action-button"
          icon={<Plus />}
          id="footy-seen-add"
          label="Add a seen match"
        />
      </FootyBackHeading>
      <div
        className="footy-filters footy-seen-filters"
        id="footy-seen-filters"
        hidden
      >
        <label>
          <span>Search</span>
          <input
            id="footy-seen-search"
            type="search"
            placeholder="Team, competition, venue"
            autoComplete="off"
          />
        </label>
        <label>
          <span>Date</span>
          <span className="footy-date-range">
            <input
              id="footy-seen-date-from"
              type="date"
              aria-label="Seen match date from"
            />
            <input
              id="footy-seen-date-to"
              type="date"
              aria-label="Seen match date to"
            />
          </span>
        </label>
        <label>
          <span>Competition</span>
          <select
            id="footy-seen-competition-filter"
            aria-label="Filter seen matches by competition"
          >
            <option value="">All competitions</option>
          </select>
        </label>
        <label>
          <span>Sports Bar</span>
          <select
            id="footy-seen-sports-bar-filter"
            aria-label="Filter seen matches by Sports Bar"
          >
            <option value="">All matches</option>
            <option value="yes">Sports Bar</option>
            <option value="no">Not Sports Bar</option>
          </select>
        </label>
        <div className="footy-filter-toggles footy-seen-filter-toggles">
          <label className="footy-checkbox-control">
            <input id="footy-seen-edit-toggle" type="checkbox" />
            <span>Edit entries</span>
          </label>
        </div>
      </div>
      <div
        className="content-shell footy-seen-list"
        id="footy-seen-list"
        aria-live="polite"
        aria-busy="true"
      >
        <LoadingMessage>Loading seen matches...</LoadingMessage>
      </div>
    </>
  );
}

export function FootyGoalAssistsPage() {
  return (
    <>
      <div className="section-heading page-heading-with-action">
        <div>
          <h1>G/A&apos;son</h1>
          <p className="body-copy">
            Build goal and assist JSON for match notes.
          </p>
        </div>
        <div className="heading-actions heading-actions-right">
          <button
            className="action-button"
            id="footy-goal-assists-back"
            type="button"
          >
            Footy
          </button>
          <button
            className="action-button"
            id="footy-goal-assists-copy"
            type="button"
          >
            Copy
          </button>
        </div>
      </div>
      <div className="content-shell footy-goal-assists-shell">
        <form className="footy-goal-assists-form" id="footy-goal-assists-form">
          <label>
            <span>Scorer Name</span>
            <input
              id="footy-scorer-name"
              type="text"
              autoComplete="off"
              placeholder="Scorer Name"
            />
          </label>
          <label>
            <span>Assister Name</span>
            <input
              id="footy-assister-name"
              type="text"
              autoComplete="off"
              placeholder="Assister Name"
            />
          </label>
          <label className="footy-penalty-toggle">
            <input id="footy-penalty" type="checkbox" />
            <span>Penalty</span>
          </label>
          <div className="footy-goal-assists-actions">
            <button className="action-button" type="submit">
              Save
            </button>
            <IconButton
              className="icon-action-button"
              icon={<Plus />}
              id="footy-goal-assists-add"
              label="Save goal assist entry"
            />
          </div>
        </form>
        <div className="footy-goal-assists-status-row">
          <div
            className="footy-goal-assists-saved"
            id="footy-goal-assists-saved"
            aria-live="polite"
          >
            <p className="table-message">No saved goal/assist entries.</p>
          </div>
          <button
            className="action-button"
            id="footy-goal-assists-clear"
            type="button"
          >
            Clear
          </button>
        </div>
        <p
          className="footy-goal-assists-feedback"
          id="footy-goal-assists-feedback"
          aria-live="polite"
        />
      </div>
    </>
  );
}

export function FootyOperationalDialogs() {
  return (
    <>
      <PerfectDialog />
      <SeenDialog />
    </>
  );
}

function PerfectDialog() {
  return (
    <dialog
      className="footy-note-dialog legacy-contained-dialog"
      id="footy-perfect-dialog"
      aria-labelledby="footy-perfect-dialog-title"
    >
      <form className="footy-note-form" id="footy-perfect-form" method="dialog">
        <header>
          <div>
            <span id="footy-perfect-match-label" />
            <h2 id="footy-perfect-dialog-title">Add 10/10 Performance</h2>
          </div>
          <IconButton
            className="icon-action-button"
            icon={<X />}
            id="footy-perfect-close"
            label="Close 10 out of 10 performance editor"
          />
        </header>
        <input id="footy-perfect-entry-id" type="hidden" />
        <input id="footy-perfect-match-id" type="hidden" />
        <div className="legacy-dialog-scroll">
          <div className="footy-note-grid">
            <label className="footy-note-wide">
              <span>Player</span>
              <input
                id="footy-perfect-player"
                type="text"
                autoComplete="off"
                required
              />
            </label>
            <label>
              <span>Home</span>
              <input
                id="footy-perfect-home"
                type="text"
                autoComplete="off"
                required
              />
            </label>
            <label>
              <span>Away</span>
              <input
                id="footy-perfect-away"
                type="text"
                autoComplete="off"
                required
              />
            </label>
            <label className="footy-note-wide">
              <span>Player Team</span>
              <select id="footy-perfect-player-team-side" required>
                <option value="">Select home or away</option>
                <option value="home">Home</option>
                <option value="away">Away</option>
              </select>
            </label>
            <label>
              <span>Date</span>
              <input id="footy-perfect-date" type="date" required />
            </label>
            <label>
              <span>Time</span>
              <input id="footy-perfect-time" type="time" />
            </label>
            <label className="footy-note-wide">
              <span>Competition</span>
              <input
                id="footy-perfect-competition"
                type="text"
                autoComplete="off"
              />
            </label>
            <label className="footy-note-wide">
              <span>Game Info</span>
              <textarea
                id="footy-perfect-note"
                rows={3}
                placeholder="Optional context about the performance"
              />
            </label>
          </div>
        </div>
        <p
          className="footy-note-status"
          id="footy-perfect-status"
          aria-live="polite"
        />
        <footer>
          <button
            className="action-button"
            id="footy-perfect-cancel"
            type="button"
          >
            Cancel
          </button>
          <button
            className="action-button"
            id="footy-perfect-save"
            type="submit"
          >
            Save
          </button>
        </footer>
      </form>
    </dialog>
  );
}

function SeenDialog() {
  return (
    <dialog
      className="footy-note-dialog legacy-contained-dialog"
      id="footy-seen-dialog"
      aria-labelledby="footy-seen-dialog-title"
    >
      <form className="footy-note-form" id="footy-seen-form" method="dialog">
        <header>
          <div>
            <span id="footy-seen-match-label" />
            <h2 id="footy-seen-dialog-title">Add Seen Match</h2>
          </div>
          <IconButton
            className="icon-action-button"
            icon={<X />}
            id="footy-seen-close"
            label="Close seen match editor"
          />
        </header>
        <input id="footy-seen-entry-id" type="hidden" />
        <input id="footy-seen-match-id" type="hidden" />
        <div className="legacy-dialog-scroll">
          <div
            className="footy-seen-manual-fields"
            id="footy-seen-manual-fields"
          >
            <div className="footy-note-grid">
              <label>
                <span>Home</span>
                <input
                  id="footy-seen-home"
                  type="text"
                  autoComplete="off"
                  required
                />
              </label>
              <label>
                <span>Away</span>
                <input
                  id="footy-seen-away"
                  type="text"
                  autoComplete="off"
                  required
                />
              </label>
              <label>
                <span>Date</span>
                <input id="footy-seen-date" type="date" required />
              </label>
              <label>
                <span>Time</span>
                <input id="footy-seen-time" type="time" />
              </label>
              <label className="footy-note-wide">
                <span>Competition</span>
                <input
                  id="footy-seen-competition"
                  type="text"
                  autoComplete="off"
                />
              </label>
              <label className="footy-note-wide">
                <span>Venue</span>
                <input id="footy-seen-venue" type="text" autoComplete="off" />
              </label>
            </div>
          </div>
          <label className="footy-checkbox-control footy-seen-sports-bar-control">
            <input id="footy-seen-sports-bar" type="checkbox" />
            <span>Saw it in Sports Bar</span>
          </label>
        </div>
        <p
          className="footy-note-status"
          id="footy-seen-status"
          aria-live="polite"
        />
        <footer>
          <button
            className="action-button"
            id="footy-seen-cancel"
            type="button"
          >
            Cancel
          </button>
          <button className="action-button" id="footy-seen-save" type="submit">
            Save
          </button>
        </footer>
      </form>
    </dialog>
  );
}
