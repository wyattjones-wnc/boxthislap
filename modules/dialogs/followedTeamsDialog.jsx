import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createRoot } from "react-dom/client";

export function createFollowedTeamsDialog({
  mount,
  onClose,
  onDone,
  onSelectionChange,
}) {
  const root = createRoot(mount);
  let currentProps = { open: false };
  let openKey = 0;

  function render(nextProps = {}) {
    currentProps = { ...currentProps, ...nextProps };
    root.render(
      React.createElement(FollowedTeamsDialog, {
        ...currentProps,
        key: openKey,
        onClose,
        onDone,
        onSelectionChange,
      }),
    );
  }

  return {
    close() {
      const dialog = mount.querySelector("dialog[open]");
      if (dialog) dialog.close();
      render({ open: false });
    },
    destroy() {
      root.unmount();
    },
    open(props) {
      openKey += 1;
      render({ ...props, open: true, openKey });
    },
    update(props) {
      render(props);
    },
  };
}

function FollowedTeamsDialog({
  defaultIds = [],
  leagues = [],
  message = "",
  messageIsError = false,
  onClose,
  onDone,
  onSelectionChange,
  open,
  openKey,
  savedIds = [],
  saving = false,
  selectedIds = [],
  teams = [],
}) {
  const dialogRef = useRef(null);
  const scrollRef = useRef(null);
  const searchRef = useRef(null);
  const [leagueId, setLeagueId] = useState("");
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [viewport, setViewport] = useState(getViewport);

  useEffect(() => {
    if (!open) return undefined;
    setLeagueId("");
    setPage(1);
    setQuery("");
    return undefined;
  }, [open, openKey]);

  useEffect(() => {
    if (!open) return undefined;
    const handleResize = () => {
      setViewport(getViewport());
      setPage(1);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [open]);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    const scrollArea = scrollRef.current;
    if (!open || !dialog) {
      if (dialog?.open) dialog.close();
      return undefined;
    }
    const scrollY = window.scrollY;
    let lastTouchY = 0;
    const rememberTouch = (event) => {
      lastTouchY = event.touches[0]?.clientY ?? 0;
    };
    const containTouch = (event) => {
      if (!scrollArea?.contains(event.target)) {
        event.preventDefault();
        return;
      }
      const touchY = event.touches[0]?.clientY ?? lastTouchY;
      const movingDown = touchY > lastTouchY;
      const atTop = scrollArea.scrollTop <= 0;
      const atBottom =
        Math.ceil(scrollArea.scrollTop + scrollArea.clientHeight) >=
        scrollArea.scrollHeight;
      if (
        scrollArea.scrollHeight <= scrollArea.clientHeight ||
        (atTop && movingDown) ||
        (atBottom && !movingDown)
      ) {
        event.preventDefault();
      }
      lastTouchY = touchY;
    };
    document.documentElement.style.setProperty(
      "--followed-teams-scroll-offset",
      `${-scrollY}px`,
    );
    document.documentElement.classList.add("has-followed-teams-dialog");
    dialog.addEventListener("touchstart", rememberTouch, { passive: true });
    dialog.addEventListener("touchmove", containTouch, { passive: false });
    dialog.showModal();
    window.requestAnimationFrame(() => searchRef.current?.focus());
    return () => {
      dialog.removeEventListener("touchstart", rememberTouch);
      dialog.removeEventListener("touchmove", containTouch);
      if (dialog.open) dialog.close();
      document.documentElement.classList.remove("has-followed-teams-dialog");
      document.documentElement.style.removeProperty(
        "--followed-teams-scroll-offset",
      );
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  const visibleTeams = useMemo(() => {
    const normalizedQuery = normalize(query);
    return teams.filter(
      (team) =>
        team.active &&
        (!normalizedQuery ||
          normalize(`${team.name} ${team.prettyName}`).includes(
            normalizedQuery,
          )) &&
        (!leagueId || team.leagueIds.includes(leagueId)),
    );
  }, [leagueId, query, teams]);
  const pageState = paginateTeams(
    visibleTeams,
    defaultIds,
    page,
    pageSizeForViewport(viewport),
  );

  useEffect(() => {
    if (page !== pageState.page) setPage(pageState.page);
  }, [page, pageState.page]);

  const selected = new Set(selectedIds.map(String));
  const hasChanges = selectedIds.join("\u0000") !== savedIds.join("\u0000");

  function updateSelection(teamId, checked) {
    const nextIds = checked
      ? selected.has(teamId)
        ? selectedIds
        : [...selectedIds, teamId]
      : selectedIds.filter((id) => id !== teamId);
    onSelectionChange(nextIds, teamId, checked);
  }

  return (
    <dialog
      aria-labelledby="followed-teams-dialog-title"
      className="followed-teams-dialog"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      ref={dialogRef}
    >
      <div className="followed-teams-dialog-heading">
        <h2 id="followed-teams-dialog-title">Add teams</h2>
        <button
          aria-label="Close team picker"
          className="dialog-close"
          onClick={onClose}
          type="button"
        >
          ×
        </button>
      </div>
      <div className="followed-teams-dialog-scroll" ref={scrollRef}>
        <div className="followed-teams-picker-filters">
          <label>
            <span>Search teams</span>
            <input
              autoComplete="off"
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Search by team name"
              ref={searchRef}
              type="search"
              value={query}
            />
          </label>
          <label>
            <span>Competition</span>
            <select
              onChange={(event) => {
                setLeagueId(event.target.value);
                setPage(1);
              }}
              value={leagueId}
            >
              <option value="">All competitions</option>
              {leagues.map((league) => (
                <option key={league.id} value={league.id}>
                  {league.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="followed-teams-picker">
          {visibleTeams.length ? (
            <>
              {pageState.defaults.length ? (
                <>
                  <div className="followed-team-picker-group-label">
                    Default teams
                  </div>
                  {pageState.defaults.map((team) =>
                    renderTeam(team, selected, updateSelection),
                  )}
                </>
              ) : null}
              {pageState.defaults.length && pageState.others.length ? (
                <div className="followed-team-picker-divider" role="separator">
                  <span>Other teams</span>
                </div>
              ) : null}
              {!pageState.defaults.length && pageState.others.length ? (
                <div className="followed-team-picker-group-label">
                  Other teams
                </div>
              ) : null}
              {pageState.others.map((team) =>
                renderTeam(team, selected, updateSelection),
              )}
            </>
          ) : (
            <p className="table-message">No teams match those filters.</p>
          )}
        </div>
        <nav
          aria-label="Team picker pages"
          className="followed-teams-pagination"
          hidden={pageState.pageCount <= 1}
        >
          <button
            className="footer-copy-link"
            disabled={pageState.page <= 1}
            onClick={() => setPage((value) => value - 1)}
            type="button"
          >
            Previous
          </button>
          <span aria-live="polite">
            Page {pageState.page} of {pageState.pageCount}
          </span>
          <button
            className="footer-copy-link"
            disabled={pageState.page >= pageState.pageCount}
            onClick={() => setPage((value) => value + 1)}
            type="button"
          >
            Next
          </button>
        </nav>
      </div>
      <div className="followed-teams-dialog-actions">
        <p
          aria-live="polite"
          className={`followed-teams-dialog-status${messageIsError ? " is-error" : ""}`}
          role="status"
        >
          {message}
        </p>
        <button
          className="action-button"
          disabled={saving}
          onClick={onDone}
          type="button"
        >
          {saving ? "Saving…" : hasChanges ? "Save teams" : "Done"}
        </button>
      </div>
    </dialog>
  );
}

function renderTeam(team, selected, onSelectionChange) {
  const isSelected = selected.has(team.id);
  return (
    <label
      className={`followed-team-picker-row${isSelected ? " is-selected" : ""}`}
      key={team.id}
    >
      <input
        checked={isSelected}
        onChange={(event) => onSelectionChange(team.id, event.target.checked)}
        type="checkbox"
        value={team.id}
      />
      {team.badge ? (
        <img alt="" decoding="async" loading="lazy" src={team.badge} />
      ) : (
        <span aria-hidden="true" className="followed-team-fallback">
          {team.name.charAt(0)}
        </span>
      )}
      <span>
        <strong>{team.name}</strong>
        <small>{team.leagueLabel}</small>
      </span>
    </label>
  );
}

function paginateTeams(teams, defaultIds, requestedPage, pageSize) {
  const defaults = new Set(defaultIds.map(String));
  const defaultOrder = new Map(
    defaultIds.map((id, index) => [String(id), index]),
  );
  const defaultTeams = teams
    .filter((team) => defaults.has(team.id))
    .sort(
      (left, right) => defaultOrder.get(left.id) - defaultOrder.get(right.id),
    );
  const otherTeams = teams.filter((team) => !defaults.has(team.id));
  const ordered = [...defaultTeams, ...otherTeams];
  const pageCount = Math.max(1, Math.ceil(ordered.length / pageSize));
  const page = Math.min(pageCount, Math.max(1, Number(requestedPage) || 1));
  const items = ordered.slice((page - 1) * pageSize, page * pageSize);
  return {
    defaults: items.filter((team) => defaults.has(team.id)),
    others: items.filter((team) => !defaults.has(team.id)),
    page,
    pageCount,
  };
}

function pageSizeForViewport({ height, width }) {
  if (height < 580) return 2;
  if (height < 760 || width <= 620) return 3;
  return 5;
}

function getViewport() {
  return { height: window.innerHeight, width: window.innerWidth };
}

function normalize(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}
