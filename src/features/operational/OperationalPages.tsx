import {
  BookPlus,
  Bell,
  CalendarPlus,
  Check as CheckIcon,
  ChevronLeft,
  ChevronRight,
  Dices,
  Eye,
  Filter,
  History,
  ListPlus,
  Plus,
  Star,
  Trash2,
  Trophy,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { IconButton } from "../../components/IconButton/IconButton";

export function NextPage() {
  return (
    <>
      <PageHeading title="Next">
        <IconButton
          className="icon-action-button next-filter-toggle"
          icon={<Filter />}
          id="next-filter-toggle"
          label="Show filters"
          aria-controls="next-filters"
          aria-expanded="false"
        />
        <IconButton
          className="icon-action-button next-add-button"
          data-admin-only
          hidden
          icon={<Plus />}
          id="next-add-button"
          label="Add Next item"
        />
      </PageHeading>
      <div className="next-controls">
        <label>
          <span>Search</span>
          <input
            id="next-search"
            type="search"
            placeholder="Search"
            autoComplete="off"
          />
        </label>
      </div>
      <div className="next-filters" id="next-filters" hidden>
        <Check id="next-completed-filter" label="Completed" adminOnly />
        <Check id="next-previous-filter" label="Previous" />
        <Check id="next-non-admin-filter" label="Non-Admin Only" adminOnly />
        <Check id="next-edit-mode-filter" label="Edit" adminOnly />
        <label className="next-date-filter">
          <span>Date</span>
          <div className="footy-date-range">
            <input
              id="next-date-from-filter"
              type="date"
              aria-label="Date from"
            />
            <input id="next-date-to-filter" type="date" aria-label="Date to" />
          </div>
        </label>
        <div
          className="next-priority-filter"
          role="group"
          aria-labelledby="next-priority-label"
          data-admin-only
          hidden
        >
          <span id="next-priority-label">Priority</span>
          <div className="next-priority-values">
            <output id="next-priority-min-value" htmlFor="next-priority-min">
              0
            </output>
            <output id="next-priority-max-value" htmlFor="next-priority-max">
              10
            </output>
          </div>
          <div className="next-priority-sliders">
            <div className="next-range-track" aria-hidden="true" />
            <input
              id="next-priority-min"
              type="range"
              min="0"
              max="10"
              step="1"
              defaultValue="0"
              aria-label="Minimum priority"
            />
            <input
              id="next-priority-max"
              type="range"
              min="0"
              max="10"
              step="1"
              defaultValue="10"
              aria-label="Maximum priority"
            />
          </div>
        </div>
      </div>
      <div className="content-shell" id="next-list" data-react-list="next">
        <NextItems />
      </div>
    </>
  );
}

interface NextItemView {
  completed: boolean;
  dateLabel: string;
  id: string;
  imageUrl: string;
  isPast: boolean;
  passed: boolean;
  thing: string;
  timeLabel: string;
}

interface NextListView {
  activeItemId: string;
  editMode: boolean;
  emptyLabel: string;
  items: NextItemView[];
  previousItems: NextItemView[];
}

declare global {
  interface Window {
    __boxThisLapNextListView?: NextListView;
    __boxThisLapSetNextListView?: (view: NextListView) => void;
  }
}

const initialNextList: NextListView = {
  activeItemId: "",
  editMode: false,
  emptyLabel: "Next items will load here.",
  items: [],
  previousItems: [],
};

function NextItems() {
  const [view, setView] = useState<NextListView>(initialNextList);

  useEffect(() => {
    const update = (event: Event) =>
      setView((event as CustomEvent<NextListView>).detail);
    window.__boxThisLapSetNextListView = setView;
    if (window.__boxThisLapNextListView) {
      setView(window.__boxThisLapNextListView);
    }
    window.addEventListener("boxthislap:next-list", update);
    return () => {
      delete window.__boxThisLapSetNextListView;
      window.removeEventListener("boxthislap:next-list", update);
    };
  }, []);

  if (!view.items.length && !view.previousItems.length) {
    return <p className="table-message">{view.emptyLabel}</p>;
  }

  return (
    <div className="next-list">
      {view.items.map((item) => (
        <NextCard item={item} view={view} key={item.id || item.thing} />
      ))}
      {view.previousItems.length ? (
        <>
          <div
            className="next-previous-divider"
            role="separator"
            aria-label="Previous items"
          >
            <span>Previous</span>
          </div>
          {view.previousItems.map((item) => (
            <NextCard item={item} view={view} key={item.id || item.thing} />
          ))}
        </>
      ) : null}
    </div>
  );
}

function NextCard({ item, view }: { item: NextItemView; view: NextListView }) {
  const expanded = view.editMode && view.activeItemId === item.id;
  const classes = [
    "next-card",
    item.completed && "next-card--completed",
    view.editMode && "next-card--editable",
    expanded && "is-expanded",
    item.isPast && "next-card--past",
    item.imageUrl && "next-card--with-image",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article
      className={classes}
      role={view.editMode && item.id ? "button" : undefined}
      tabIndex={view.editMode && item.id ? 0 : undefined}
      aria-expanded={view.editMode && item.id ? expanded : undefined}
      data-next-item-id={view.editMode && item.id ? item.id : undefined}
    >
      {item.imageUrl ? (
        <img
          className="next-card-image"
          src={item.imageUrl}
          alt=""
          loading="lazy"
          decoding="async"
          data-next-card-image
        />
      ) : null}
      <div
        className={`next-card-main${item.completed ? " has-completed-icon" : ""}`}
      >
        {item.completed ? (
          <span
            className="next-completed-icon"
            aria-label="Completed"
            title="Completed"
          >
            <CheckIcon aria-hidden="true" />
          </span>
        ) : null}
        <div>
          {item.passed && !item.completed ? (
            <span
              className="next-passed-status"
              aria-label="Event time has passed"
              title="Event time has passed"
            >
              <CheckIcon aria-hidden="true" />
            </span>
          ) : null}
          <h2>{item.thing}</h2>
          <p className="next-card-date">
            <span>{item.dateLabel}</span>
            {item.timeLabel ? (
              <span className="next-time">{item.timeLabel}</span>
            ) : null}
          </p>
        </div>
      </div>
      {expanded ? (
        <button
          className="action-button next-edit-button"
          type="button"
          data-next-edit={item.id}
        >
          Edit
        </button>
      ) : null}
    </article>
  );
}

export function FootyPage() {
  return (
    <>
      <div className="section-heading page-heading-with-action footy-heading footy-heading--actions-only">
        <div className="heading-actions">
          <IconLink
            className=""
            href="#footy-custom-schedule"
            label="Create a custom Footy schedule"
            icon={<CalendarPlus />}
          />
          <IconLink
            className="footy-perfect-button"
            href="#footy-perfect"
            label="Open 10 out of 10 performances"
            icon={<Star />}
            adminOnly
          />
          <IconLink
            className=""
            href="#footy-seen"
            label="Open Seen Matches"
            icon={<Eye />}
            adminOnly
          />
          <button
            className="action-button footy-past-toggle"
            id="footy-past-toggle"
            type="button"
            aria-pressed="false"
          >
            <History className="footy-past-toggle-icon" aria-hidden="true" />
            <span>Past Matches</span>
          </button>
          <IconButton
            className="icon-action-button footy-competition-toggle"
            icon={<Trophy />}
            id="footy-competition-toggle"
            label="Show competition schedules"
            aria-pressed="false"
          />
          <IconButton
            className="icon-action-button footy-notification-toggle"
            icon={<Bell />}
            id="footy-notification-toggle"
            label="Subscribe to match alerts"
            aria-pressed="false"
          />
          <IconButton
            className="icon-action-button footy-filter-toggle"
            icon={<Filter />}
            id="footy-filter-toggle"
            label="Show filters"
            aria-controls="footy-filters"
            aria-expanded="false"
          />
        </div>
      </div>
      <p
        className="footy-notification-status"
        id="footy-notification-status"
        role="status"
        aria-live="polite"
      />
      <div
        className="footy-competition-controls"
        id="footy-competition-controls"
        hidden
      >
        <label>
          <span>Competition</span>
          <select
            id="footy-competition-select"
            aria-label="Competition schedule"
          />
        </label>
      </div>
      <div className="footy-filters" id="footy-filters" hidden>
        <label>
          <span>Search</span>
          <input
            id="footy-search"
            type="search"
            placeholder="Search"
            autoComplete="off"
          />
        </label>
        <label>
          <span>Date</span>
          <div className="footy-date-range">
            <input
              id="footy-date-from-filter"
              type="date"
              aria-label="Date from"
            />
            <input id="footy-date-to-filter" type="date" aria-label="Date to" />
          </div>
        </label>
        <label>
          <span>Match Week / Day</span>
          <select
            id="footy-match-period-filter"
            aria-label="Match week or matchday"
            defaultValue=""
          >
            <option value="">All match weeks / days</option>
          </select>
        </label>
        <label>
          <span>Teams</span>
          <div className="multi-filter" id="footy-team-filter">
            <button
              className="multi-filter-button"
              type="button"
              aria-expanded="false"
            >
              Loading teams...
            </button>
            <div className="multi-filter-options" hidden />
          </div>
        </label>
        <div className="footy-filter-toggles">
          <label
            className="footy-checkbox-control"
            id="footy-competition-past-control"
          >
            <input id="footy-competition-past-filter" type="checkbox" />
            <span>Past Matches</span>
          </label>
          <label className="footy-checkbox-control">
            <input
              id="footy-friendlies-filter"
              type="checkbox"
              defaultChecked
            />
            <span>Friendlies</span>
          </label>
        </div>
        <div
          className="footy-team-choice-actions"
          id="footy-team-choice-actions"
          aria-label="Team selection"
          hidden
        >
          <button
            className="action-button"
            id="footy-choose-teams"
            type="button"
            hidden
          >
            Choose teams
          </button>
          <button
            className="footer-copy-link"
            id="footy-reset-teams"
            type="button"
            hidden
          >
            Reset to default
          </button>
        </div>
      </div>
      <div className="content-shell" id="footy-schedule-list">
        <p className="table-message">
          Upcoming football fixtures will load here once a source is connected.
        </p>
      </div>
      <FootyNoteDialog />
    </>
  );
}

function FootyNoteDialog() {
  return (
    <dialog className="footy-note-dialog" id="footy-note-dialog">
      <form className="footy-note-form" id="footy-note-form" method="dialog">
        <header>
          <div>
            <span id="footy-note-match-id" />
            <h2 id="footy-note-title">Edit Match Notes</h2>
          </div>
          <IconButton
            className="icon-action-button"
            icon={<X />}
            id="footy-note-close"
            label="Close match note editor"
          />
        </header>
        <div className="footy-note-grid">
          <label>
            <span>Home Score</span>
            <input
              id="footy-note-home-score"
              type="text"
              inputMode="numeric"
              autoComplete="off"
            />
          </label>
          <label>
            <span>Away Score</span>
            <input
              id="footy-note-away-score"
              type="text"
              inputMode="numeric"
              autoComplete="off"
            />
          </label>
          <GoalAssistBuilder
            side="follow"
            title="Follow G/A"
            empty="No saved followed-team entries."
          />
          <GoalAssistBuilder
            side="opponent"
            title="Opp G/A"
            empty="No saved opponent entries."
          />
          <label className="footy-note-wide">
            <span>Note</span>
            <textarea id="footy-note-text" rows={3} />
          </label>
          <label className="footy-note-wide">
            <span>Highlight Link</span>
            <input
              id="footy-note-highlight-link"
              type="url"
              autoComplete="off"
            />
          </label>
        </div>
        <p
          className="footy-note-status"
          id="footy-note-status"
          aria-live="polite"
        />
        <footer>
          <button
            className="action-button"
            id="footy-note-cancel"
            type="button"
          >
            Cancel
          </button>
          <button className="action-button" id="footy-note-save" type="submit">
            Save
          </button>
        </footer>
      </form>
    </dialog>
  );
}

function GoalAssistBuilder({
  side,
  title,
  empty,
}: {
  side: "follow" | "opponent";
  title: string;
  empty: string;
}) {
  return (
    <details className="footy-note-ga-builder" data-footy-note-ga-side={side}>
      <summary>{title}</summary>
      <div className="footy-note-ga-fields">
        <label>
          <span>Scorer Name</span>
          <input
            type="text"
            data-footy-note-ga-field="scorer"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="sentences"
            spellCheck="false"
            placeholder="Scorer Name"
          />
        </label>
        <label>
          <span>Assister Name</span>
          <input
            type="text"
            data-footy-note-ga-field="assister"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="sentences"
            spellCheck="false"
            placeholder="Assister Name"
          />
        </label>
        <label>
          <span>Minute</span>
          <input
            type="text"
            data-footy-note-ga-field="minute"
            inputMode="text"
            autoComplete="off"
            placeholder="45 +5"
          />
        </label>
        <label className="footy-penalty-toggle">
          <input type="checkbox" data-footy-note-ga-field="penalty" />
          <span>Penalty</span>
        </label>
        <div className="footy-goal-assists-actions">
          <button
            className="action-button"
            type="button"
            data-footy-note-ga-save={side}
          >
            Save
          </button>
        </div>
      </div>
      <div className="footy-note-ga-saved" data-footy-note-ga-saved={side}>
        <p className="table-message">{empty}</p>
      </div>
    </details>
  );
}

export function TodoPage() {
  return (
    <>
      <PageHeading title="To Do">
        <IconButton
          className="icon-action-button todo-random-button"
          icon={<Dices />}
          id="todo-random-button"
          label="Pick a weighted random To Do item"
        />
        <button
          className="action-button ranking-compare-button"
          id="todo-compare-button"
          type="button"
        >
          Compare
        </button>
        <IconButton
          className="icon-action-button ranking-filter-toggle"
          icon={<Filter />}
          id="todo-filter-toggle"
          label="Show To Do filters"
          aria-controls="todo-filters"
          aria-expanded="false"
        />
        <IconButton
          className="icon-action-button next-add-button"
          data-admin-only
          hidden
          icon={<Plus />}
          id="todo-add-button"
          label="Add To Do item"
        />
      </PageHeading>
      <RankingFilters kind="todo" includeMoreData />
      <LoadingList id="todo-list" label="To Do items will load here." />
      <RandomDialog kind="todo" title="Random To Do" />
    </>
  );
}

export function WantPage() {
  return (
    <>
      <PageHeading title="Want" actionsClassName="page-heading-actions">
        <IconButton
          className="icon-action-button todo-random-button"
          icon={<Dices />}
          id="want-random-button"
          label="Pick a weighted random Want item"
        />
        <button
          className="action-button ranking-compare-button"
          id="want-compare-button"
          type="button"
        >
          Compare
        </button>
        <IconButton
          className="icon-action-button ranking-filter-toggle"
          icon={<Filter />}
          id="want-filter-toggle"
          label="Show Want filters"
          aria-controls="want-filters"
          aria-expanded="false"
        />
        <IconButton
          className="icon-action-button next-add-button"
          data-admin-only
          hidden
          icon={<Plus />}
          id="want-add-button"
          label="Add Want item"
        />
      </PageHeading>
      <RankingFilters kind="want" />
      <LoadingList id="want-list" label="Want items will load here." />
      <RandomDialog kind="want" title="Random Want" />
      <dialog className="footy-note-dialog" id="want-move-dialog">
        <form className="footy-note-form" method="dialog">
          <header>
            <div>
              <h2>Move to To Do?</h2>
            </div>
            <IconButton
              className="icon-action-button footy-note-close"
              icon={<X />}
              id="want-move-close"
              label="Close move confirmation"
            />
          </header>
          <p>
            Move <strong id="want-move-name" /> from Want to To Do? The Want
            item will be marked completed.
          </p>
          <p
            className="footy-note-status"
            id="want-move-status"
            aria-live="polite"
          />
          <footer>
            <button
              className="action-button"
              id="want-move-cancel"
              type="button"
            >
              Cancel
            </button>
            <button
              className="action-button"
              id="want-move-confirm"
              type="button"
            >
              Move to To Do
            </button>
          </footer>
        </form>
      </dialog>
    </>
  );
}

export function GuidesPage() {
  return (
    <div id="guides-view">
      <div className="section-heading page-heading-with-action footy-heading">
        <div>
          <p className="guides-eyebrow">Walkthroughs</p>
          <h1>Guides</h1>
        </div>
      </div>
      <div className="guides-loading-grid" aria-label="Loading guides">
        <span className="guides-skeleton-card" />
        <span className="guides-skeleton-card" />
        <span className="guides-skeleton-card" />
      </div>
    </div>
  );
}

export function ManagerHubPage() {
  return (
    <>
      <div className="section-heading page-heading-with-action">
        <div>
          <h1>Manager Hub</h1>
          <p
            className="manager-hub-subtitle"
            id="manager-hub-subtitle"
            hidden
          />
        </div>
        <div className="heading-actions manager-hub-actions">
          <IconLink
            className="manager-draft-list-button"
            href="#draft-list"
            label="Open Draft List"
            icon={<ListPlus />}
            loginOnly
          />
          <IconLink
            className="manager-awards-button"
            href="#manager-awards"
            label="View all league awards"
            icon={<Trophy />}
          />
        </div>
      </div>
      <div className="manager-hub-grid">
        <details
          className="manager-hub-card workflow-dropdown"
          aria-labelledby="workflow-heading"
        >
          <summary className="manager-hub-card-heading workflow-summary">
            <h2 id="workflow-heading">Notifications</h2>
            <span id="workflow-count">0 notifications</span>
          </summary>
          <div className="workflow-list" id="workflow-list">
            <Message text="Log in to load notifications." />
          </div>
        </details>
        <section
          className="manager-hub-card manager-awards-card"
          aria-labelledby="manager-awards-heading"
        >
          <div className="manager-hub-card-heading">
            <h2 id="manager-awards-heading">Awards</h2>
          </div>
          <div className="manager-awards-list" id="manager-awards-list">
            <Message text="Log in to load awards." />
          </div>
        </section>
        <section
          className="manager-hub-card manager-summary-card"
          aria-labelledby="manager-summary-heading"
        >
          <div className="manager-hub-card-heading">
            <h2 id="manager-summary-heading">Results</h2>
            <label className="manager-summary-year-control">
              <span>Year</span>
              <select id="manager-summary-year-select" defaultValue="2026">
                <option value="2026">2026</option>
                <option value="all">All</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
              </select>
            </label>
          </div>
          <div className="manager-summary-list" id="manager-summary-list">
            <Message text="Log in to load manager results." />
          </div>
        </section>
      </div>
    </>
  );
}

export function ManagerAwardsPage() {
  return (
    <>
      <div className="section-heading">
        <a
          className="back-link"
          href="#manager-hub"
          data-page-link="manager-hub"
        >
          Manager Hub
        </a>
        <h1>League Awards</h1>
        <p className="body-copy">
          Championships and award winners from completed leagues.
        </p>
      </div>
      <div
        className="league-awards-groups"
        id="league-awards-list"
        aria-live="polite"
      >
        <section className="manager-hub-card league-awards-group">
          <p className="table-message">Log in to load league awards.</p>
        </section>
      </div>
    </>
  );
}

export function DraftListPage() {
  return (
    <>
      <div className="section-heading page-heading-with-action footy-heading draft-list-heading">
        <div>
          <a
            className="back-link"
            href="#manager-hub"
            data-page-link="manager-hub"
          >
            Manager Hub
          </a>
          <h1>Draft List</h1>
        </div>
        <div className="heading-actions">
          <IconButton
            className="icon-action-button draft-list-filter-toggle"
            icon={<Filter />}
            id="draft-list-filter-toggle"
            label="Show Draft List filters"
            aria-controls="draft-list-filters"
            aria-expanded="false"
          />
          <IconButton
            className="icon-action-button draft-list-new-sheet-button"
            icon={<BookPlus />}
            id="draft-list-new-sheet-button"
            label="Create a new Draft List sheet"
          />
          <IconButton
            className="icon-action-button draft-list-delete-sheet-button"
            hidden
            icon={<Trash2 />}
            id="draft-list-delete-sheet-button"
            label="Delete current Draft List sheet"
          />
          <IconButton
            className="icon-action-button draft-list-add-button"
            icon={<Plus />}
            id="draft-list-add-button"
            label="Add a Draft List item"
          />
        </div>
      </div>
      <div className="draft-list-filters" id="draft-list-filters" hidden>
        <label className="ranking-select-control">
          <span>Entered after</span>
          <input id="draft-list-entry-after" type="date" />
        </label>
        <div
          className="draft-list-filter-toggles"
          role="group"
          aria-label="Entry status filters"
        >
          <Check id="draft-list-show-archived" label="Archived" />
          <Check id="draft-list-show-drafted" label="Drafted" />
          <Check id="draft-list-show-unavailable" label="Unavailable" />
        </div>
        <button
          className="ranking-inline-action"
          id="draft-list-clear-filters"
          type="button"
        >
          Clear
        </button>
      </div>
      <div className="draft-list-tab-nav" id="draft-list-tab-nav">
        <IconButton
          className="draft-list-tab-scroll"
          hidden
          icon={<ChevronLeft />}
          id="draft-list-tabs-previous"
          label="Scroll sheet tabs left"
        />
        <div
          className="tabs draft-list-tabs"
          id="draft-list-tabs"
          role="tablist"
          aria-label="Draft List sheets"
        >
          <button
            className="tab is-active"
            type="button"
            aria-selected="true"
            role="tab"
          >
            Fantasy Critic
          </button>
          <button
            className="tab"
            type="button"
            aria-selected="false"
            role="tab"
          >
            Fantasy Office
          </button>
        </div>
        <IconButton
          className="draft-list-tab-scroll"
          hidden
          icon={<ChevronRight />}
          id="draft-list-tabs-next"
          label="Scroll sheet tabs right"
        />
      </div>
      <p
        className="draft-list-status"
        id="draft-list-status"
        aria-live="polite"
      />
      <div
        className="content-shell draft-list-items"
        id="draft-list-items"
        aria-live="polite"
        aria-busy="true"
      >
        <p className="table-message loading-message">
          <span className="loading-spinner" aria-hidden="true" />
          <span>Loading Draft List...</span>
        </p>
      </div>
      <DraftListItemDialog />
      <DraftListSheetDialog />
    </>
  );
}

function DraftListItemDialog() {
  return (
    <dialog
      className="footy-note-dialog next-item-dialog"
      id="draft-list-item-dialog"
    >
      <form
        className="footy-note-form next-item-form"
        id="draft-list-item-form"
        method="dialog"
      >
        <header>
          <div>
            <h2 id="draft-list-item-dialog-title">Add Draft List Item</h2>
          </div>
          <IconButton
            className="icon-action-button footy-note-close"
            icon={<X />}
            id="draft-list-item-close"
            label="Close Draft List item dialog"
          />
        </header>
        <input id="draft-list-item-id" type="hidden" />
        <div className="next-item-fields">
          <label className="next-item-wide">
            <span>Name</span>
            <input
              id="draft-list-item-name"
              type="text"
              maxLength={180}
              autoComplete="off"
              required
            />
          </label>
          <label>
            <span>Release Date</span>
            <input id="draft-list-item-release-date" type="date" />
          </label>
          <label>
            <span>Rank</span>
            <input
              id="draft-list-item-rank"
              type="number"
              min="1"
              step="1"
              required
            />
          </label>
          <label className="next-item-wide">
            <span>Data URL</span>
            <input
              id="draft-list-item-data-url"
              type="url"
              inputMode="url"
              autoComplete="url"
              placeholder="https://example.com/details"
            />
          </label>
          <label className="next-item-wide">
            <span>Image URL</span>
            <input
              id="draft-list-item-image-url"
              type="url"
              inputMode="url"
              autoComplete="url"
              placeholder="https://example.com/image.jpg"
            />
          </label>
          <details className="draft-list-notes-field">
            <summary>Notes</summary>
            <label>
              <span className="sr-only">Notes</span>
              <textarea
                id="draft-list-item-notes"
                rows={4}
                maxLength={4000}
                placeholder="Add notes about this item"
              />
            </label>
          </details>
          <div className="next-dialog-checks draft-list-dialog-checks">
            <Check id="draft-list-item-archived" label="Archived" />
            <Check id="draft-list-item-drafted" label="Drafted" />
            <Check id="draft-list-item-unavailable" label="Unavailable" />
          </div>
        </div>
        <p
          className="footy-note-status"
          id="draft-list-item-status"
          aria-live="polite"
        />
        <footer>
          <button
            className="action-button draft-list-delete-button"
            id="draft-list-item-delete"
            type="button"
            hidden
          >
            Delete
          </button>
          <span className="draft-list-dialog-spacer" />
          <button
            className="action-button"
            id="draft-list-item-cancel"
            type="button"
          >
            Cancel
          </button>
          <button className="action-button" type="submit">
            Save
          </button>
        </footer>
      </form>
    </dialog>
  );
}

function DraftListSheetDialog() {
  return (
    <dialog
      className="footy-note-dialog next-item-dialog"
      id="draft-list-sheet-dialog"
    >
      <form
        className="footy-note-form next-item-form"
        id="draft-list-sheet-form"
        method="dialog"
      >
        <header>
          <div>
            <h2>Create Draft List Sheet</h2>
          </div>
          <IconButton
            className="icon-action-button footy-note-close"
            icon={<X />}
            id="draft-list-sheet-close"
            label="Close new sheet dialog"
          />
        </header>
        <div className="next-item-fields">
          <label className="next-item-wide">
            <span>Sheet Name</span>
            <input
              id="draft-list-sheet-name"
              type="text"
              maxLength={80}
              autoComplete="off"
              placeholder="Grocery List"
              required
            />
          </label>
        </div>
        <p
          className="footy-note-status"
          id="draft-list-sheet-status"
          aria-live="polite"
        />
        <footer>
          <button
            className="action-button"
            id="draft-list-sheet-cancel"
            type="button"
          >
            Cancel
          </button>
          <button className="action-button" type="submit">
            Create
          </button>
        </footer>
      </form>
    </dialog>
  );
}

function PageHeading({
  title,
  children,
  actionsClassName = "heading-actions",
}: {
  title: string;
  children: React.ReactNode;
  actionsClassName?: string;
}) {
  return (
    <div className="section-heading page-heading-with-action footy-heading">
      <h1>{title}</h1>
      <div className={actionsClassName}>{children}</div>
    </div>
  );
}

function Check({
  id,
  label,
  adminOnly = false,
}: {
  id: string;
  label: string;
  adminOnly?: boolean;
}) {
  return (
    <label
      className="next-checkbox-control"
      data-admin-only={adminOnly ? "" : undefined}
      hidden={adminOnly}
    >
      <input id={id} type="checkbox" />
      <span>{label}</span>
    </label>
  );
}

function LoadingList({ id, label }: { id: string; label: string }) {
  return (
    <div className="content-shell" id={id}>
      <p className="table-message">{label}</p>
    </div>
  );
}

function RankingFilters({
  kind,
  includeMoreData = false,
}: {
  kind: "todo" | "want";
  includeMoreData?: boolean;
}) {
  const labels =
    kind === "todo"
      ? [
          "started",
          "archived",
          "platinumCleanup",
          "completed",
          "deleted",
          "unpurchased",
          "all",
        ]
      : ["archived", "completed", "deleted", "all"];
  const pretty: Record<string, string> = {
    all: "All",
    archived: "Archived",
    completed: "Completed",
    deleted: "Deleted",
    platinumCleanup: "Platinum Cleanup",
    started: "Only Started",
    unpurchased: "Unpurchased",
  };
  return (
    <div className="ranking-filters todo-filters" id={`${kind}-filters`} hidden>
      <div
        className="segmented-control ranking-mode-toggle"
        role="group"
        aria-label={`${kind === "todo" ? "To Do" : "Want"} view`}
      >
        <button
          className="is-active"
          type="button"
          data-todo-view-mode={kind === "todo" ? "manual" : undefined}
          data-want-view-mode={kind === "want" ? "manual" : undefined}
          aria-pressed="true"
        >
          Manual
        </button>
        <button
          type="button"
          data-todo-view-mode={kind === "todo" ? "calculated" : undefined}
          data-want-view-mode={kind === "want" ? "calculated" : undefined}
          aria-pressed="false"
        >
          Calculated
        </button>
      </div>
      <label className="toggle-row todo-edit-filter">
        <span>Edit</span>
        <input id={`${kind}-edit-toggle`} type="checkbox" />
      </label>
      {includeMoreData ? (
        <label className="toggle-row">
          <span>More Data</span>
          <input id="todo-more-data-toggle" type="checkbox" />
        </label>
      ) : null}
      <label className="ranking-select-control">
        <span>Snapshot</span>
        <select id={`${kind}-snapshot-select`} defaultValue="current">
          <option value="current">Current</option>
        </select>
      </label>
      <label className="ranking-select-control">
        <span>Compare</span>
        <select id={`${kind}-snapshot-compare-select`} defaultValue="">
          <option value="">None</option>
        </select>
      </label>
      <button
        className="action-button ranking-normalize-button"
        id={`${kind}-normalize-button`}
        type="button"
      >
        Normalize
      </button>
      <div
        className="todo-filter-group"
        role="group"
        aria-label={`${kind === "todo" ? "To Do" : "Want"} status filters`}
      >
        {labels.map((label) => (
          <label className="toggle-row" key={label}>
            <span>{pretty[label]}</span>
            <input
              type="checkbox"
              {...{ [`data-${kind}-status-filter`]: label }}
            />
          </label>
        ))}
      </div>
    </div>
  );
}

function RandomDialog({
  kind,
  title,
}: {
  kind: "todo" | "want";
  title: string;
}) {
  return (
    <dialog
      className="footy-note-dialog todo-random-dialog"
      id={`${kind}-random-dialog`}
    >
      <form className="footy-note-form ranking-battle-form" method="dialog">
        <header>
          <div>
            <h2>{title}</h2>
          </div>
          <IconButton
            className="icon-action-button footy-note-close"
            icon={<X />}
            id={`${kind}-random-close`}
            label={`Close random ${kind === "todo" ? "To Do" : "Want"} dialog`}
          />
        </header>
        <div id={`${kind}-random-content`} />
        <footer>
          <button
            className="action-button"
            id={`${kind}-random-again`}
            type="button"
          >
            Pick Again
          </button>
          <button
            className="action-button"
            id={`${kind}-random-done`}
            type="button"
          >
            Done
          </button>
        </footer>
      </form>
    </dialog>
  );
}

function IconLink({
  className,
  href,
  icon,
  label,
  adminOnly = false,
  loginOnly = false,
}: {
  className: string;
  href: string;
  icon: React.ReactNode;
  label: string;
  adminOnly?: boolean;
  loginOnly?: boolean;
}) {
  return (
    <a
      className={`icon-action-button ${className}`}
      href={href}
      data-page-link={href.slice(1)}
      data-admin-only={adminOnly ? "" : undefined}
      data-login-only={loginOnly ? "" : undefined}
      hidden={adminOnly || loginOnly}
      aria-label={label}
      title={label}
    >
      {icon}
    </a>
  );
}

function Message({ text }: { text: string }) {
  return (
    <article className="workflow-item">
      <p className="table-message">{text}</p>
    </article>
  );
}
