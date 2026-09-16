import {
  BookPlus,
  Bell,
  CalendarPlus,
  Check as CheckIcon,
  ChevronLeft,
  ChevronRight,
  Dices,
  Eye,
  ExternalLink,
  Film,
  Filter,
  Folder,
  Gamepad2,
  GripVertical,
  History,
  Link2,
  ListPlus,
  Notebook,
  Pencil,
  Plus,
  Star,
  Trash2,
  Trophy,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { IconButton } from "../../components/IconButton/IconButton";
import { GuidesFeature } from "./GuidesFeature";

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

interface OperationalGuideLink {
  href: string;
  label: string;
}

interface OperationalStatusChip {
  icon: string;
  key: string;
  label: string;
}

interface TodoItemView {
  children: TodoItemView[];
  deleted: boolean;
  draggable: boolean;
  expanded: boolean;
  guideLinks: OperationalGuideLink[];
  hourLabel: string;
  id: string;
  meta: string[];
  name: string;
  orderLabel: string;
  started: boolean;
  statusChips: OperationalStatusChip[];
}

interface TodoListView {
  emptyLabel: string;
  items: TodoItemView[];
}

interface WantItemView {
  archived: boolean;
  completed: boolean;
  deleted: boolean;
  draggable: boolean;
  expanded: boolean;
  id: string;
  meta: string[];
  name: string;
  orderLabel: string;
  priceLabel: string;
}

interface WantListView {
  emptyLabel: string;
  items: WantItemView[];
}

declare global {
  interface Window {
    __boxThisLapTodoListView?: TodoListView;
    __boxThisLapWantListView?: WantListView;
  }
}

function useOperationalListView<T>(
  eventName: string,
  initialView: T,
  currentView: T | undefined,
) {
  const [view, setView] = useState(currentView ?? initialView);

  useEffect(() => {
    const update = (event: Event) => setView((event as CustomEvent<T>).detail);
    window.addEventListener(eventName, update);
    return () => window.removeEventListener(eventName, update);
  }, [eventName]);

  return view;
}

interface SortableOptions<T extends { id: string }> {
  detail?: Record<string, string>;
  enabled: boolean;
  eventName: string;
  items: T[];
  selector: string;
}

function useSortableItems<T extends { id: string }>({
  detail = {},
  enabled,
  eventName,
  items,
  selector,
}: SortableOptions<T>) {
  const [orderedItems, setOrderedItems] = useState(items);
  const [draggingId, setDraggingId] = useState("");
  const detailRef = useRef(detail);
  const draggingIdRef = useRef("");
  const orderedItemsRef = useRef(items);
  const movedRef = useRef(false);
  detailRef.current = detail;

  useEffect(() => {
    if (draggingId) return;
    orderedItemsRef.current = items;
    setOrderedItems(items);
  }, [draggingId, items]);

  useEffect(() => {
    const move = (event: PointerEvent) => {
      const activeId = draggingIdRef.current;
      if (!activeId) return;
      event.preventDefault();
      const target = document
        .elementFromPoint(event.clientX, event.clientY)
        ?.closest<HTMLElement>(selector);
      const targetId = target?.dataset.sortableId || "";
      if (!targetId || targetId === activeId) return;
      const rows = orderedItemsRef.current;
      const from = rows.findIndex((item) => item.id === activeId);
      const to = rows.findIndex((item) => item.id === targetId);
      if (from < 0 || to < 0) return;
      const next = [...rows];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      movedRef.current = true;
      orderedItemsRef.current = next;
      setOrderedItems(next);
    };
    const finish = () => {
      if (!draggingIdRef.current) return;
      if (movedRef.current) {
        window.dispatchEvent(
          new CustomEvent(eventName, {
            detail: {
              ...detailRef.current,
              itemIds: orderedItemsRef.current.map((item) => item.id),
            },
          }),
        );
      }
      movedRef.current = false;
      draggingIdRef.current = "";
      setDraggingId("");
    };

    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
    };
  }, [eventName, selector]);

  const start = (id: string, event: React.PointerEvent<HTMLElement>) => {
    if (!enabled || event.button !== 0) return;
    event.preventDefault();
    movedRef.current = false;
    draggingIdRef.current = id;
    setDraggingId(id);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const moveWithKeyboard = (id: string, direction: -1 | 1) => {
    if (!enabled) return;
    const rows = orderedItemsRef.current;
    const from = rows.findIndex((item) => item.id === id);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= rows.length) return;
    const next = [...rows];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    orderedItemsRef.current = next;
    setOrderedItems(next);
    window.dispatchEvent(
      new CustomEvent(eventName, {
        detail: { ...detailRef.current, itemIds: next.map((item) => item.id) },
      }),
    );
  };

  return { draggingId, moveWithKeyboard, orderedItems, start };
}

function SortHandle({
  id,
  label,
  onKeyboardMove,
  onPointerDown,
  className,
}: {
  className: string;
  id: string;
  label: string;
  onKeyboardMove: (id: string, direction: -1 | 1) => void;
  onPointerDown: (id: string, event: React.PointerEvent<HTMLElement>) => void;
}) {
  return (
    <button
      className={className}
      type="button"
      data-react-sort-handle
      aria-label={label}
      title={`${label}. Use the up and down arrow keys to move it.`}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
        event.preventDefault();
        event.stopPropagation();
        onKeyboardMove(id, event.key === "ArrowUp" ? -1 : 1);
      }}
      onPointerDown={(event) => {
        event.stopPropagation();
        onPointerDown(id, event);
      }}
    >
      <GripVertical aria-hidden="true" />
    </button>
  );
}

const emptyTodoList: TodoListView = {
  emptyLabel: "To Do items will load here.",
  items: [],
};

function TodoItems() {
  const view = useOperationalListView(
    "boxthislap:todo-list",
    emptyTodoList,
    window.__boxThisLapTodoListView,
  );
  const sortable = useSortableItems({
    enabled: view.items.some((item) => item.draggable),
    eventName: "boxthislap:todo-reorder",
    items: view.items,
    selector: "[data-sortable-kind='todo']",
  });

  if (!view.items.length) {
    return <p className="table-message">{view.emptyLabel}</p>;
  }

  return (
    <div className="next-list todo-list">
      {sortable.orderedItems.map((item, index) => (
        <TodoCard
          dragging={sortable.draggingId === item.id}
          item={item}
          moveWithKeyboard={sortable.moveWithKeyboard}
          orderLabel={String(index + 1)}
          startDrag={sortable.start}
          key={item.id || item.name}
        />
      ))}
    </div>
  );
}

function TodoCard({
  item,
  child = false,
  dragging = false,
  moveWithKeyboard,
  orderLabel,
  startDrag,
}: {
  item: TodoItemView;
  child?: boolean;
  dragging?: boolean;
  moveWithKeyboard?: (id: string, direction: -1 | 1) => void;
  orderLabel?: string;
  startDrag?: (id: string, event: React.PointerEvent<HTMLElement>) => void;
}) {
  if (child) {
    return (
      <article className="todo-child-card" data-todo-child-id={item.id}>
        <div>
          <OperationalItemHeading item={item} level={3} />
          {item.hourLabel ? (
            <p className="next-card-date">{item.hourLabel}</p>
          ) : null}
          <StatusChips chips={item.statusChips} />
          {item.meta.length ? (
            <p className="todo-more-data">{item.meta.join(" | ")}</p>
          ) : null}
        </div>
        {item.draggable ? (
          <button
            className="ranking-inline-action"
            type="button"
            data-todo-edit={item.id}
          >
            Edit
          </button>
        ) : null}
      </article>
    );
  }

  const classes = [
    "next-card todo-card",
    item.started && "todo-card--started",
    item.deleted && "todo-card--deleted",
    item.expanded && "is-actions-open",
    dragging && "is-dragging",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article
      className={classes}
      tabIndex={0}
      role="button"
      data-todo-id={item.id}
      data-sortable-id={item.id}
      data-sortable-kind="todo"
      aria-label={`${item.draggable ? "Edit" : "View"} ${item.name}`}
    >
      <div className="next-card-main">
        <span className="todo-order-number">
          {orderLabel || item.orderLabel}
        </span>
        <div>
          <OperationalItemHeading item={item} level={2} />
          {item.hourLabel ? (
            <p className="next-card-date">{item.hourLabel}</p>
          ) : null}
          <StatusChips chips={item.statusChips} />
          {item.meta.length ? (
            <p className="todo-more-data">{item.meta.join(" | ")}</p>
          ) : null}
        </div>
        {item.draggable ? (
          <SortHandle
            className="ranking-drag-handle todo-drag-handle"
            id={item.id}
            label={`Reorder ${item.name}`}
            onKeyboardMove={moveWithKeyboard!}
            onPointerDown={startDrag!}
          />
        ) : null}
      </div>
      {item.draggable ? (
        <div className="todo-card-actions">
          <button
            className="ranking-inline-action"
            type="button"
            data-todo-edit={item.id}
          >
            Edit
          </button>
          <button
            className="ranking-inline-action"
            type="button"
            data-todo-delete={item.id}
          >
            Delete
          </button>
        </div>
      ) : null}
      {item.children.length ? (
        <div className="todo-child-list">
          {item.children.map((entry) => (
            <TodoCard child item={entry} key={entry.id || entry.name} />
          ))}
        </div>
      ) : null}
    </article>
  );
}

function OperationalItemHeading({
  item,
  level,
}: {
  item: TodoItemView;
  level: 2 | 3;
}) {
  const Heading = level === 2 ? "h2" : "h3";
  return (
    <div className="guide-linked-heading">
      <Heading>{item.name}</Heading>
      {item.guideLinks.length ? (
        <span className="guide-entry-links">
          {item.guideLinks.map((link) => (
            <a
              className="guide-entry-link"
              href={link.href}
              aria-label={link.label}
              title={link.label}
              key={link.href}
            >
              <Link2 aria-hidden="true" />
            </a>
          ))}
        </span>
      ) : null}
    </div>
  );
}

function StatusChips({ chips }: { chips: OperationalStatusChip[] }) {
  if (!chips.length) return null;
  return (
    <div className="todo-chip-list">
      {chips.map((chip) => (
        <span
          className={`todo-status-chip todo-status-chip--${chip.key}`}
          key={chip.key}
        >
          <span aria-hidden="true">
            {chip.icon === "check" ? (
              <CheckIcon />
            ) : chip.icon === "folder" ? (
              <Folder />
            ) : (
              chip.icon
            )}
          </span>
          {chip.label}
        </span>
      ))}
    </div>
  );
}

const emptyWantList: WantListView = {
  emptyLabel: "Want items will load here.",
  items: [],
};

function WantItems() {
  const view = useOperationalListView(
    "boxthislap:want-list",
    emptyWantList,
    window.__boxThisLapWantListView,
  );
  const sortable = useSortableItems({
    enabled: view.items.some((item) => item.draggable),
    eventName: "boxthislap:want-reorder",
    items: view.items,
    selector: "[data-sortable-kind='want']",
  });

  if (!view.items.length)
    return <p className="table-message">{view.emptyLabel}</p>;

  return (
    <div className="next-list todo-list">
      {sortable.orderedItems.map((item, index) => (
        <WantCard
          dragging={sortable.draggingId === item.id}
          item={item}
          moveWithKeyboard={sortable.moveWithKeyboard}
          orderLabel={String(index + 1)}
          startDrag={sortable.start}
          key={item.id || item.name}
        />
      ))}
    </div>
  );
}

function WantCard({
  dragging,
  item,
  moveWithKeyboard,
  orderLabel,
  startDrag,
}: {
  dragging: boolean;
  item: WantItemView;
  moveWithKeyboard: (id: string, direction: -1 | 1) => void;
  orderLabel: string;
  startDrag: (id: string, event: React.PointerEvent<HTMLElement>) => void;
}) {
  const classes = [
    "next-card todo-card",
    item.deleted && "todo-card--deleted",
    item.expanded && "is-actions-open",
    dragging && "is-dragging",
  ]
    .filter(Boolean)
    .join(" ");
  const chips = [
    item.archived && { key: "archived", label: "Archived" },
    item.completed && { key: "completed", label: "Completed" },
    item.deleted && { key: "deleted", label: "Deleted" },
  ].filter(Boolean) as Array<{ key: string; label: string }>;

  return (
    <article
      className={classes}
      tabIndex={0}
      role="button"
      data-want-id={item.id}
      data-sortable-id={item.id}
      data-sortable-kind="want"
      aria-label={`${item.draggable ? "Edit" : "View"} ${item.name}`}
    >
      <div className="next-card-main">
        <span className="todo-order-number">{orderLabel}</span>
        <div>
          <h2>{item.name}</h2>
          {item.priceLabel ? (
            <p className="next-card-date">{item.priceLabel}</p>
          ) : null}
          {chips.length ? (
            <div className="todo-chip-list">
              {chips.map((chip) => (
                <span
                  className={`todo-status-chip todo-status-chip--${chip.key}`}
                  key={chip.key}
                >
                  {chip.label}
                </span>
              ))}
            </div>
          ) : null}
          {item.meta.length ? (
            <p className="todo-more-data">{item.meta.join(" | ")}</p>
          ) : null}
        </div>
        {item.draggable ? (
          <SortHandle
            className="ranking-drag-handle want-drag-handle"
            id={item.id}
            label={`Reorder ${item.name}`}
            onKeyboardMove={moveWithKeyboard}
            onPointerDown={startDrag}
          />
        ) : null}
      </div>
      {item.draggable ? (
        <div className="todo-card-actions">
          <button
            className="ranking-inline-action"
            type="button"
            data-want-edit={item.id}
          >
            Edit
          </button>
          <button
            className="ranking-inline-action"
            type="button"
            data-want-move={item.id}
          >
            Move to To Do
          </button>
          <button
            className="ranking-inline-action"
            type="button"
            data-want-delete={item.id}
          >
            Delete
          </button>
        </div>
      ) : null}
    </article>
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
      <div className="content-shell" id="todo-list" data-react-list="todo">
        <TodoItems />
      </div>
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
      <div className="content-shell" id="want-list" data-react-list="want">
        <WantItems />
      </div>
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

type RankingKind = "games" | "mcu" | "movies" | "tv";

interface RankingItemView {
  archived: boolean;
  canEdit: boolean;
  canExclude: boolean;
  draggable: boolean;
  excluded: boolean;
  exclusionLabel: string;
  guideLinks: OperationalGuideLink[];
  id: string;
  meta: string[];
  movement: string;
  name: string;
  rankLabel: string;
}

interface RankingListView {
  canAdd: boolean;
  emptyLabel: string;
  itemLabel: string;
  loading: boolean;
  messages: string[];
  rows: RankingItemView[];
}

declare global {
  interface Window {
    __boxThisLapRankingListViews?: Partial<
      Record<RankingKind, RankingListView>
    >;
  }
}

export function RankingsPage() {
  return (
    <>
      <PageHeading title="Rankings">
        <button
          className="action-button ranking-compare-button"
          id="ranking-compare-button"
          type="button"
        >
          Compare
        </button>
        <IconButton
          className="icon-action-button ranking-filter-toggle"
          icon={<Filter />}
          id="ranking-filter-toggle"
          label="Show filters"
          aria-controls="ranking-filters"
          aria-expanded="false"
        />
        <IconButton
          className="icon-action-button ranking-add-button"
          icon={<Plus />}
          id="ranking-add-button"
          label="Add ranking item"
          hidden
        />
      </PageHeading>
      <div className="ranking-filters" id="ranking-filters" hidden>
        <label className="ranking-select-control">
          <span>Manager</span>
          <select id="ranking-manager-select" />
        </label>
        <span className="ranking-read-only" id="ranking-read-only" hidden>
          Read only
        </span>
        <Check id="ranking-more-data-toggle" label="More Data" />
        <Check id="ranking-show-excluded-toggle" label="Show Excluded" />
        <label
          className="ranking-checkbox-control"
          id="ranking-show-archived-control"
        >
          <input id="ranking-show-archived-toggle" type="checkbox" />
          <span>Show Archived</span>
        </label>
        <div
          className="segmented-control ranking-mode-toggle"
          role="group"
          aria-label="Ranking view"
        >
          <button
            className="is-active"
            type="button"
            data-ranking-view-mode="manual"
            aria-pressed="true"
          >
            Manual
          </button>
          <button
            type="button"
            data-ranking-view-mode="calculated"
            aria-pressed="false"
          >
            Calculated
          </button>
        </div>
        <label
          className="ranking-select-control"
          data-ranking-owner-only
          hidden
        >
          <span>Snapshot</span>
          <select id="ranking-snapshot-select">
            <option value="current">Current</option>
          </select>
        </label>
        <label
          className="ranking-select-control"
          data-ranking-owner-only
          hidden
        >
          <span>Compare</span>
          <select id="ranking-compare-select">
            <option value="">None</option>
          </select>
        </label>
        <button
          className="action-button ranking-normalize-button"
          id="ranking-normalize-button"
          type="button"
          data-ranking-owner-only
          hidden
        >
          Normalize
        </button>
        <button
          className="action-button"
          id="ranking-elo-to-manual-button"
          type="button"
          data-ranking-owner-only
          hidden
        >
          Set Manual from Elo
        </button>
        <span
          className="ranking-filter-status"
          id="ranking-elo-to-manual-status"
          aria-live="polite"
        />
      </div>
      <div
        className="tabs ranking-tabs"
        role="tablist"
        aria-label="Ranking lists"
      >
        {(["games", "mcu", "movies", "tv"] as RankingKind[]).map(
          (kind, index) => (
            <button
              className={`tab${index === 0 ? " is-active" : ""}`}
              type="button"
              data-ranking-tab={kind}
              aria-selected={index === 0}
              role="tab"
              key={kind}
            >
              {kind === "mcu"
                ? "MCU"
                : kind === "tv"
                  ? "TV"
                  : kind[0].toUpperCase() + kind.slice(1)}
            </button>
          ),
        )}
      </div>
      <div className="content-shell ranking-shell">
        {(["games", "mcu", "movies", "tv"] as RankingKind[]).map(
          (kind, index) => (
            <section
              className={`ranking-panel${index === 0 ? " is-active" : ""}`}
              data-ranking-panel={kind}
              role="tabpanel"
              key={kind}
            >
              <div
                className="ranking-list"
                id={`ranking-list-${kind}`}
                data-react-list="ranking"
              >
                <RankingItems kind={kind} />
              </div>
            </section>
          ),
        )}
      </div>
      <RankingItemDialog />
      <RankingBattleDialog />
      <RankingNormalizeDialog />
    </>
  );
}

const rankingLabels: Record<RankingKind, string> = {
  games: "game",
  mcu: "MCU",
  movies: "movie",
  tv: "TV",
};

function RankingItems({ kind }: { kind: RankingKind }) {
  const initial: RankingListView = {
    canAdd: false,
    emptyLabel: `Loading ${rankingLabels[kind]} rankings...`,
    itemLabel: rankingLabels[kind],
    loading: true,
    messages: [],
    rows: [],
  };
  const view = useOperationalListView(
    `boxthislap:ranking-list:${kind}`,
    initial,
    window.__boxThisLapRankingListViews?.[kind],
  );
  const sortable = useSortableItems({
    detail: { kind },
    enabled: view.rows.some((item) => item.draggable),
    eventName: "boxthislap:ranking-reorder",
    items: view.rows,
    selector: `[data-sortable-kind='ranking-${kind}']`,
  });

  return (
    <>
      {view.messages.length ? (
        <p className="table-message ranking-warning">
          {view.messages.map((message) => (
            <span key={message}>
              {message}
              <br />
            </span>
          ))}
        </p>
      ) : null}
      {view.loading ? (
        <p className="table-message loading-message">
          <span className="loading-spinner" aria-hidden="true" />
          <span>{view.emptyLabel}</span>
        </p>
      ) : null}
      {!view.loading && !view.rows.length ? (
        <div className="table-message ranking-empty-state">
          <span>{view.emptyLabel}</span>
          {view.canAdd ? (
            <button
              className="action-button ranking-empty-add"
              type="button"
              data-ranking-empty-add={kind}
            >
              Add One
            </button>
          ) : null}
        </div>
      ) : null}
      {sortable.orderedItems.map((item, index) => (
        <RankingCard
          dragging={sortable.draggingId === item.id}
          item={item}
          kind={kind}
          moveWithKeyboard={sortable.moveWithKeyboard}
          rankLabel={String(index + 1)}
          startDrag={sortable.start}
          key={item.id || item.name}
        />
      ))}
    </>
  );
}

function RankingCard({
  dragging,
  item,
  kind,
  moveWithKeyboard,
  rankLabel,
  startDrag,
}: {
  dragging: boolean;
  item: RankingItemView;
  kind: RankingKind;
  moveWithKeyboard: (id: string, direction: -1 | 1) => void;
  rankLabel: string;
  startDrag: (id: string, event: React.PointerEvent<HTMLElement>) => void;
}) {
  return (
    <article
      className={`ranking-item${item.excluded ? " is-excluded" : ""}${dragging ? " is-dragging" : ""}`}
      data-ranking-kind={kind}
      data-ranking-id={item.id}
      data-sortable-id={item.id}
      data-sortable-kind={`ranking-${kind}`}
    >
      <span className="ranking-rank">{rankLabel}</span>
      <span className="ranking-item-main">
        <span className="guide-linked-heading">
          <strong>{item.name}</strong>
          {item.guideLinks.length ? (
            <span className="guide-entry-links">
              {item.guideLinks.map((link) => (
                <a
                  className="guide-entry-link"
                  href={link.href}
                  aria-label={link.label}
                  title={link.label}
                  key={link.href}
                >
                  <Link2 aria-hidden="true" />
                </a>
              ))}
            </span>
          ) : null}
        </span>
        {item.excluded ? (
          <small className="ranking-excluded-label">Excluded</small>
        ) : null}
        {item.movement ? <small>{item.movement}</small> : null}
        {item.meta.length ? (
          <span className="ranking-item-meta">
            {item.meta.map((part) => (
              <span key={part}>{part}</span>
            ))}
          </span>
        ) : null}
      </span>
      {item.draggable ? (
        <SortHandle
          className="ranking-drag-handle"
          id={item.id}
          label={`Reorder ${item.name}`}
          onKeyboardMove={moveWithKeyboard}
          onPointerDown={startDrag}
        />
      ) : (
        <span className="ranking-spacer" aria-hidden="true" />
      )}
      {item.canExclude || item.canEdit ? (
        <span className="ranking-item-actions">
          {item.canExclude ? (
            <button
              className="ranking-inline-action"
              type="button"
              data-ranking-exclusion-toggle={item.id}
              data-ranking-kind={kind}
            >
              {item.exclusionLabel}
            </button>
          ) : null}
          {item.canEdit ? (
            <button
              className="ranking-inline-action"
              type="button"
              data-ranking-edit={item.id}
              data-ranking-kind={kind}
            >
              Edit
            </button>
          ) : null}
          {item.canEdit ? (
            <button
              className="ranking-inline-action"
              type="button"
              data-ranking-archive={item.id}
              data-ranking-kind={kind}
            >
              {item.archived ? "Restore" : "Archive"}
            </button>
          ) : null}
        </span>
      ) : null}
    </article>
  );
}

function RankingItemDialog() {
  return (
    <dialog
      className="footy-note-dialog ranking-item-dialog"
      id="ranking-item-dialog"
    >
      <form
        className="footy-note-form ranking-item-form"
        id="ranking-item-form"
        method="dialog"
      >
        <header>
          <div>
            <h2 id="ranking-item-dialog-title">Add Ranking Item</h2>
          </div>
          <IconButton
            className="icon-action-button footy-note-close"
            icon={<X />}
            id="ranking-item-close"
            label="Close ranking item dialog"
          />
        </header>
        <input id="ranking-item-kind" type="hidden" />
        <input id="ranking-item-id" type="hidden" />
        <div className="next-item-fields">
          <label className="next-item-wide">
            <span>Name</span>
            <input
              id="ranking-item-name"
              type="text"
              autoComplete="off"
              required
            />
          </label>
          <label>
            <span>Rank</span>
            <input
              id="ranking-item-rank"
              type="number"
              min="1"
              step="1"
              required
            />
          </label>
        </div>
        <p
          className="footy-note-status"
          id="ranking-item-status"
          aria-live="polite"
        />
        <footer>
          <button
            className="action-button"
            id="ranking-item-cancel"
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

function RankingBattleDialog() {
  return (
    <dialog
      className="footy-note-dialog ranking-battle-dialog"
      id="ranking-battle-dialog"
    >
      <form className="footy-note-form ranking-battle-form" method="dialog">
        <header>
          <div>
            <h2 id="ranking-battle-title">Compare Rankings</h2>
            <p
              id="ranking-battle-status"
              className="footy-note-status"
              aria-live="polite"
            />
          </div>
          <IconButton
            className="icon-action-button footy-note-close"
            icon={<X />}
            id="ranking-battle-close"
            label="Close comparison dialog"
          />
        </header>
        <div className="ranking-battle-options" id="ranking-battle-options" />
        <footer>
          <button
            className="action-button"
            id="ranking-battle-skip"
            type="button"
          >
            Skip
          </button>
          <button
            className="action-button"
            id="ranking-battle-done"
            type="button"
          >
            Done
          </button>
        </footer>
      </form>
    </dialog>
  );
}

function RankingNormalizeDialog() {
  return (
    <dialog
      className="footy-note-dialog ranking-normalize-dialog"
      id="ranking-normalize-dialog"
    >
      <form className="footy-note-form ranking-battle-form" method="dialog">
        <header>
          <div>
            <h2>Normalize Rankings</h2>
            <p
              id="ranking-normalize-status"
              className="footy-note-status"
              aria-live="polite"
            />
          </div>
          <IconButton
            className="icon-action-button footy-note-close"
            icon={<X />}
            id="ranking-normalize-close"
            label="Close normalize dialog"
          />
        </header>
        <p className="body-copy">
          This saves the current calculated order as a snapshot, compresses Elo
          ratings into closer gaps, and clears old choices for this ranking
          list.
        </p>
        <label className="next-item-wide">
          <span>Reason</span>
          <input
            id="ranking-normalize-reason"
            type="text"
            defaultValue="Normalized calculated rankings"
            autoComplete="off"
          />
        </label>
        <footer>
          <button
            className="action-button"
            id="ranking-normalize-cancel"
            type="button"
          >
            Cancel
          </button>
          <button
            className="action-button"
            id="ranking-normalize-confirm"
            type="button"
          >
            Save Snapshot &amp; Normalize
          </button>
        </footer>
      </form>
    </dialog>
  );
}

export function GuidesPage() {
  return <GuidesFeature />;
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

interface DraftListSheetView {
  icon: string;
  id: string;
  isSystem: boolean;
  name: string;
  position: number;
  revision: number;
}

interface DraftListItemView {
  archived: boolean;
  dataUrl: string;
  drafted: boolean;
  id: string;
  imageUrl: string;
  name: string;
  rank: number;
  releaseLabel: string;
  sheetId: string;
  unavailable: boolean;
}

interface DraftListView {
  activeSheetId: string;
  emptyAction: "" | "add" | "clear" | "filters" | "retry";
  emptyLabel: string;
  items: DraftListItemView[];
  loading: boolean;
  sheets: DraftListSheetView[];
}

declare global {
  interface Window {
    __boxThisLapDraftListView?: DraftListView;
  }
}

const emptyDraftList: DraftListView = {
  activeSheetId: "",
  emptyAction: "",
  emptyLabel: "Loading Draft List...",
  items: [],
  loading: true,
  sheets: [],
};

function useDraftListView() {
  return useOperationalListView(
    "boxthislap:draft-list",
    emptyDraftList,
    window.__boxThisLapDraftListView,
  );
}

function DraftListTabs() {
  const view = useDraftListView();
  if (view.loading && !view.sheets.length) {
    return (
      <button
        className="tab is-active"
        type="button"
        role="tab"
        aria-selected="true"
      >
        Loading sheets...
      </button>
    );
  }
  return view.sheets.map((sheet) => {
    const active = sheet.id === view.activeSheetId;
    return (
      <button
        className={`tab${active ? " is-active" : ""}`}
        type="button"
        data-draft-list-tab={sheet.id}
        aria-selected={active}
        role="tab"
        key={sheet.id}
      >
        <span className="draft-list-tab-icon" aria-hidden="true">
          {sheet.icon === "gamepad" ? (
            <Gamepad2 />
          ) : sheet.icon === "film" ? (
            <Film />
          ) : (
            <Notebook />
          )}
        </span>
        <span>{sheet.name}</span>
      </button>
    );
  });
}

function DraftListItems() {
  const view = useDraftListView();
  const sortable = useSortableItems({
    detail: { sheetId: view.activeSheetId },
    enabled: Boolean(view.activeSheetId && view.items.length),
    eventName: "boxthislap:draft-list-reorder",
    items: view.items,
    selector: "[data-sortable-kind='draft-list']",
  });
  if (view.loading) {
    return (
      <p className="table-message loading-message">
        <span className="loading-spinner" aria-hidden="true" />
        <span>Loading Draft List...</span>
      </p>
    );
  }
  if (view.items.length) {
    return sortable.orderedItems.map((item, index) => (
      <DraftListCard
        dragging={sortable.draggingId === item.id}
        item={item}
        moveWithKeyboard={sortable.moveWithKeyboard}
        rank={index + 1}
        startDrag={sortable.start}
        key={item.id}
      />
    ));
  }
  return (
    <div className="draft-list-empty">
      <p className="table-message">{view.emptyLabel}</p>
      {view.emptyAction ? (
        <button
          className="action-button"
          type="button"
          data-draft-list-retry={view.emptyAction === "retry" || undefined}
          data-draft-list-clear-filter={
            view.emptyAction === "clear" || undefined
          }
          data-draft-list-show-filters={
            view.emptyAction === "filters" || undefined
          }
          data-draft-list-add-empty={view.emptyAction === "add" || undefined}
        >
          {view.emptyAction === "retry"
            ? "Try Again"
            : view.emptyAction === "clear"
              ? "Clear Filter"
              : view.emptyAction === "filters"
                ? "Show Filters"
                : "Add Item"}
        </button>
      ) : null}
    </div>
  );
}

function DraftListCard({
  dragging,
  item,
  moveWithKeyboard,
  rank,
  startDrag,
}: {
  dragging: boolean;
  item: DraftListItemView;
  moveWithKeyboard: (id: string, direction: -1 | 1) => void;
  rank: number;
  startDrag: (id: string, event: React.PointerEvent<HTMLElement>) => void;
}) {
  const [showImage, setShowImage] = useState(Boolean(item.imageUrl));
  const flags = [
    item.archived && "Archived",
    item.drafted && "Drafted",
    item.unavailable && "Unavailable",
  ].filter(Boolean) as string[];
  return (
    <article
      className={`draft-list-item${showImage ? " has-image" : ""}${dragging ? " is-dragging" : ""}`}
      data-draft-list-item-id={item.id}
      data-draft-list-sheet-id={item.sheetId}
      data-sortable-id={item.id}
      data-sortable-kind="draft-list"
    >
      {showImage ? (
        <div className="draft-list-item-image">
          <img
            src={item.imageUrl}
            alt=""
            loading="lazy"
            decoding="async"
            data-draft-list-image
            onError={() => setShowImage(false)}
          />
        </div>
      ) : null}
      <span className="draft-list-rank">{rank}</span>
      <div className="draft-list-item-main">
        <h2>{item.name}</h2>
        <p className="draft-list-item-date">{item.releaseLabel}</p>
        {flags.length ? (
          <div className="draft-list-item-flags">
            {flags.map((flag) => (
              <span key={flag}>{flag}</span>
            ))}
          </div>
        ) : null}
      </div>
      <div className="draft-list-item-actions">
        {item.dataUrl ? (
          <a
            className="icon-action-button draft-list-item-action"
            href={item.dataUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open data page for ${item.name}`}
            title="Open data page"
          >
            <ExternalLink aria-hidden="true" />
          </a>
        ) : null}
        <button
          className="icon-action-button draft-list-item-action"
          type="button"
          data-draft-list-edit={item.id}
          aria-label={`Edit ${item.name}`}
          title="Edit item"
        >
          <Pencil aria-hidden="true" />
        </button>
      </div>
      <SortHandle
        className="draft-list-drag-handle"
        id={item.id}
        label={`Reorder ${item.name}`}
        onKeyboardMove={moveWithKeyboard}
        onPointerDown={startDrag}
      />
    </article>
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
          <DraftListTabs />
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
        <DraftListItems />
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
