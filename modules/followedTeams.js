export function createFollowedTeamsController({
  getManagerId,
  onChanged = () => {},
  request,
}) {
  const root = document.querySelector("#followed-teams-settings");
  const count = document.querySelector("#followed-teams-count");
  const list = document.querySelector("#followed-teams-list");
  const status = document.querySelector("#followed-teams-status");
  const addButton = document.querySelector("#followed-teams-add");
  const resetButton = document.querySelector("#followed-teams-reset");
  const saveButton = document.querySelector("#followed-teams-save");
  const chooseButton = document.querySelector("#footy-choose-teams");
  const topResetButton = document.querySelector("#footy-reset-teams");
  const choiceActions = document.querySelector("#footy-team-choice-actions");
  const footyFilters = document.querySelector("#footy-filters");
  const dialogMount = document.querySelector("#followed-teams-dialog-root");
  const state = {
    catalog: [],
    defaultIds: [],
    error: "",
    leagues: [],
    loadPromise: null,
    loadedManagerId: "",
    loading: false,
    pendingIds: [],
    revision: 0,
    savedIds: [],
    savedNotificationIds: [],
    savedPersonalIds: [],
    saving: false,
    usingDefault: true,
  };
  let dialogController = null;
  let dialogControllerPromise = null;
  let dialogMessage = "";
  let dialogMessageIsError = false;
  let dialogOpen = false;
  let draggedId = "";

  root?.addEventListener("click", handleRootClick);
  chooseButton?.addEventListener("click", openPicker);
  topResetButton?.addEventListener("click", () => {
    void resetToDefault();
  });
  list?.addEventListener("dragstart", handleDragStart);
  list?.addEventListener(
    "dragover",
    (event) => draggedId && event.preventDefault(),
  );
  list?.addEventListener("drop", handleDrop);
  list?.addEventListener("dragend", () => {
    draggedId = "";
  });

  function reset() {
    closePicker();
    state.catalog = [];
    state.defaultIds = [];
    state.error = "";
    state.leagues = [];
    state.loadPromise = null;
    state.loadedManagerId = "";
    state.loading = false;
    state.pendingIds = [];
    state.revision = 0;
    state.savedIds = [];
    state.savedNotificationIds = [];
    state.savedPersonalIds = [];
    state.saving = false;
    state.usingDefault = true;
    dialogMessage = "";
    dialogMessageIsError = false;
    render();
    onChanged([]);
  }

  async function load(options = {}) {
    const managerId = String(getManagerId() || "").trim();
    const loadKey = managerId || "anonymous";
    if (!root) return;
    if (
      !options.force &&
      state.loadedManagerId === loadKey &&
      state.catalog.length
    ) {
      render();
      return;
    }
    if (state.loadPromise) return state.loadPromise;
    state.loading = true;
    state.error = "";
    render();
    state.loadPromise = Promise.all([
      request("/api/teams?includeLeagues=true&active=true", { auth: false }),
      managerId ? request("/api/me/followed-teams") : Promise.resolve(null),
    ])
      .then(([catalog, preferences]) => {
        state.catalog = normalizeCatalog(catalog);
        state.leagues = normalizeLeagues(catalog, state.catalog);
        state.defaultIds = (catalog.defaultTeamIds || []).map(String);
        state.revision = Number(preferences?.revision || 0);
        state.usingDefault = !managerId || Boolean(preferences?.usingDefault);
        state.savedIds = effectiveTeamIds(state.defaultIds, preferences);
        state.savedNotificationIds = notificationTeamIds(preferences);
        state.savedPersonalIds = personalTeamIds(
          state.savedIds,
          state.usingDefault,
        );
        state.pendingIds = [...state.savedPersonalIds];
        state.loadedManagerId = loadKey;
        onChanged(getFollowedTeams());
      })
      .catch((error) => {
        state.error = error.message || "Followed teams could not be loaded.";
        throw error;
      })
      .finally(() => {
        state.loading = false;
        state.loadPromise = null;
        render();
      });
    return state.loadPromise;
  }

  function getFollowedTeamIds() {
    return [...state.savedIds];
  }

  function getFollowedTeams() {
    const teams = new Map(state.catalog.map((team) => [team.id, team]));
    return state.savedIds.map((id, index) => ({
      ...(teams.get(id) || {
        active: false,
        badge: "",
        id,
        leagues: [],
        name: `Unavailable team (${id})`,
      }),
      priority: index + 1,
    }));
  }

  function getNotificationSelectionState() {
    const managerId = String(getManagerId() || "").trim();
    return {
      loaded: Boolean(managerId) && state.loadedManagerId === managerId,
      teamIds: [...state.savedNotificationIds],
    };
  }

  function getSelectionState() {
    const managerId = String(getManagerId() || "").trim();
    return {
      hasPersonalSelection:
        Boolean(managerId) &&
        state.loadedManagerId === managerId &&
        !state.usingDefault &&
        state.savedIds.length > 0,
      loaded: Boolean(managerId) && state.loadedManagerId === managerId,
    };
  }

  function render() {
    const managerId = String(getManagerId() || "").trim();
    const canReset =
      Boolean(managerId) && (!state.usingDefault || hasChanges());
    if (choiceActions) {
      if (state.usingDefault) {
        footyFilters?.insertAdjacentElement("afterend", choiceActions);
      } else {
        footyFilters?.append(choiceActions);
      }
      choiceActions.hidden = !managerId;
      choiceActions.classList.toggle("is-default", state.usingDefault);
    }
    if (chooseButton) {
      chooseButton.hidden = !managerId;
      chooseButton.disabled =
        state.loading || state.saving || !state.catalog.length;
      chooseButton.textContent = state.usingDefault
        ? "Add Teams"
        : "Choose teams";
    }
    if (topResetButton) {
      topResetButton.hidden = !managerId || state.usingDefault;
      topResetButton.disabled = state.loading || state.saving;
    }
    if (!root) return;
    root.hidden = !managerId;
    if (!managerId) return;
    count.textContent =
      state.usingDefault && !hasChanges()
        ? `${state.savedIds.length} default team${state.savedIds.length === 1 ? "" : "s"}`
        : `${state.pendingIds.length} team${state.pendingIds.length === 1 ? "" : "s"}`;
    addButton.disabled = state.loading || state.saving;
    if (resetButton) {
      resetButton.hidden = !canReset;
      resetButton.disabled = state.loading || state.saving;
    }
    saveButton.disabled = state.loading || state.saving || !hasChanges();
    saveButton.textContent = state.saving ? "Saving…" : "Save teams";
    if (state.loading && !state.loadedManagerId) {
      list.innerHTML = loadingMarkup("Loading followed teams…");
      setStatus("");
      return;
    }
    if (state.error && !state.loadedManagerId) {
      list.innerHTML = `<div class="followed-teams-empty"><p>${escapeHtml(state.error)}</p><button type="button" data-followed-teams-retry>Try again</button></div>`;
      setStatus("Preferences or team catalog could not load.", true);
      return;
    }
    if (!state.pendingIds.length) {
      list.innerHTML = `<div class="followed-teams-empty"><p>${state.usingDefault ? "Using the admin’s default teams. Choose teams to replace the default view." : "You aren't following any teams. Add teams to personalize Box This Lap and receive team notifications."}</p></div>`;
    } else {
      list.innerHTML = state.pendingIds.map(renderSelectedTeam).join("");
    }
    if (!state.saving && !state.error) {
      setStatus(
        hasChanges()
          ? "You have unsaved changes."
          : state.usingDefault
            ? "Using the admin’s default teams."
            : "",
      );
    }
    syncDialog();
  }

  function renderSelectedTeam(id, index) {
    const team = state.catalog.find((entry) => entry.id === id);
    const name = team?.name || `Unavailable team (${id})`;
    const league =
      selectableLeagueNames(team?.leagues).join(", ") || "Other competitions";
    return `
      <article class="followed-team-row${team ? "" : " is-unavailable"}" draggable="true" data-followed-team-id="${escapeAttribute(id)}">
        <button class="followed-team-drag" type="button" aria-label="Drag ${escapeAttribute(name)} to reorder" title="Drag to reorder">⋮⋮</button>
        ${team?.badge ? `<img src="${escapeAttribute(team.badge)}" alt="" loading="lazy" decoding="async">` : `<span class="followed-team-fallback" aria-hidden="true">${escapeHtml(name.charAt(0))}</span>`}
        <div class="followed-team-copy"><strong>${escapeHtml(name)}</strong><span>${escapeHtml(league)}</span></div>
        <span class="followed-team-priority" aria-label="Priority ${index + 1}">${index + 1}</span>
        <div class="followed-team-row-actions">
          <button type="button" data-followed-team-up="${escapeAttribute(id)}" aria-label="Move ${escapeAttribute(name)} up"${index === 0 ? " disabled" : ""}>↑</button>
          <button type="button" data-followed-team-down="${escapeAttribute(id)}" aria-label="Move ${escapeAttribute(name)} down"${index === state.pendingIds.length - 1 ? " disabled" : ""}>↓</button>
          <button type="button" data-followed-team-remove="${escapeAttribute(id)}" aria-label="Remove ${escapeAttribute(name)}">Remove</button>
        </div>
      </article>
    `;
  }

  async function openPicker() {
    if (
      !getManagerId() ||
      !dialogMount ||
      state.loading ||
      !state.catalog.length
    )
      return;
    setDialogStatus("");
    dialogOpen = true;
    try {
      const controller = await ensureDialogController();
      if (dialogOpen) controller.open(getDialogProps());
    } catch (error) {
      dialogOpen = false;
      setStatus(error.message || "The team picker could not be opened.", true);
    }
  }

  function closePicker() {
    dialogOpen = false;
    dialogController?.close();
    render();
  }

  async function ensureDialogController() {
    if (dialogController) return dialogController;
    if (!dialogControllerPromise) {
      dialogControllerPromise =
        import("./dialogs/followedTeamsDialog.jsx?v=202609122320")
          .then(({ createFollowedTeamsDialog }) => {
            dialogController = createFollowedTeamsDialog({
              mount: dialogMount,
              onClose: closePicker,
              onDone: () => {
                void save({ closeDialog: true });
              },
              onSelectionChange: handleDialogSelectionChange,
            });
            return dialogController;
          })
          .finally(() => {
            dialogControllerPromise = null;
          });
    }
    return dialogControllerPromise;
  }

  function getDialogProps() {
    return {
      defaultIds: state.defaultIds,
      leagues: state.leagues,
      message: dialogMessage,
      messageIsError: dialogMessageIsError,
      savedIds: state.savedPersonalIds,
      saving: state.saving,
      selectedIds: state.pendingIds,
      teams: state.catalog.map((team) => ({
        ...team,
        leagueIds: (team.leagues || [])
          .map((league) => normalizeSelectableLeague(league.name)?.id)
          .filter(Boolean),
        leagueLabel:
          selectableLeagueNames(team.leagues).join(", ") ||
          "Other competitions",
      })),
    };
  }

  function syncDialog() {
    if (dialogOpen && dialogController) {
      dialogController.update(getDialogProps());
    }
  }

  function handleDialogSelectionChange(nextIds, id, checked) {
    state.pendingIds = nextIds;
    syncDialog();
    announce(
      checked
        ? `${teamName(id)} added. Save teams to apply.`
        : `${teamName(id)} removed. Save teams to apply.`,
    );
  }

  async function save(options = {}) {
    if (state.saving) return;
    if (!hasChanges()) {
      if (options.closeDialog) closePicker();
      return;
    }
    state.saving = true;
    state.error = "";
    let successMessage = "";
    setStatus("Saving followed teams…");
    setDialogStatus("Saving teams…");
    syncDialogAction();
    render();
    try {
      const previousIds = new Set(state.savedIds);
      const response = await request("/api/me/followed-teams", {
        body: JSON.stringify({
          revision: state.revision,
          teamIds: state.pendingIds,
        }),
        method: "PUT",
      });
      applyPreference(response);
      onChanged(getFollowedTeams(), {
        addedTeamIds: state.savedIds.filter((id) => !previousIds.has(id)),
        source: "save",
      });
      successMessage = state.usingDefault
        ? "Reset to the admin’s default teams."
        : "Followed teams saved. Team notifications now use this list.";
      if (options.closeDialog) closePicker();
    } catch (error) {
      state.error = error.message || "Followed teams could not be saved.";
      setStatus(
        `${state.error} Your unsaved selection is still here for retry.`,
        true,
      );
      setDialogStatus(
        `${state.error} Your selection is still here for retry.`,
        true,
      );
    } finally {
      state.saving = false;
      render();
      syncDialogAction();
      if (successMessage) setStatus(successMessage);
    }
  }

  function handleRootClick(event) {
    if (event.target.closest("#followed-teams-add")) return openPicker();
    if (event.target.closest("#followed-teams-reset"))
      return void resetToDefault();
    if (event.target.closest("#followed-teams-save")) return void save();
    if (event.target.closest("[data-followed-teams-retry]"))
      return void load({ force: true }).catch(() => undefined);
    const remove = event.target.closest("[data-followed-team-remove]");
    if (remove) {
      const id = remove.dataset.followedTeamRemove;
      state.pendingIds = state.pendingIds.filter((entry) => entry !== id);
      announce(
        `${teamName(id)} removed. Notifications will stop after you save.`,
      );
      return render();
    }
    const up = event.target.closest("[data-followed-team-up]");
    if (up) return move(up.dataset.followedTeamUp, -1);
    const down = event.target.closest("[data-followed-team-down]");
    if (down) return move(down.dataset.followedTeamDown, 1);
  }

  async function resetToDefault() {
    if (state.saving || !getManagerId()) return;
    if (state.usingDefault) {
      state.pendingIds = [...state.savedPersonalIds];
      render();
      return;
    }
    state.saving = true;
    state.error = "";
    setStatus("Resetting to the admin’s default teams…");
    render();
    try {
      const response = await request("/api/me/followed-teams", {
        body: JSON.stringify({ revision: state.revision, teamIds: [] }),
        method: "PUT",
      });
      applyPreference(response);
      onChanged(getFollowedTeams());
      render();
      setStatus("Reset to the admin’s default teams.");
    } catch (error) {
      state.error = error.message || "Followed teams could not be reset.";
      setStatus(state.error, true);
    } finally {
      state.saving = false;
      render();
    }
  }

  function applyPreference(response = {}) {
    state.savedIds = preferenceTeamIds(response);
    state.savedNotificationIds = notificationTeamIds(response);
    state.revision = Number(response.revision ?? state.revision + 1);
    state.usingDefault = Boolean(response.usingDefault);
    state.savedPersonalIds = personalTeamIds(
      state.savedIds,
      state.usingDefault,
    );
    state.pendingIds = [...state.savedPersonalIds];
  }

  function move(id, offset) {
    const from = state.pendingIds.indexOf(id);
    const to = from + offset;
    if (from < 0 || to < 0 || to >= state.pendingIds.length) return;
    [state.pendingIds[from], state.pendingIds[to]] = [
      state.pendingIds[to],
      state.pendingIds[from],
    ];
    announce(`${teamName(id)} moved to priority ${to + 1}.`);
    render();
  }

  function handleDragStart(event) {
    const row = event.target.closest("[data-followed-team-id]");
    if (!row || !event.target.closest(".followed-team-drag"))
      return event.preventDefault();
    draggedId = row.dataset.followedTeamId;
    event.dataTransfer?.setData("text/plain", draggedId);
  }

  function handleDrop(event) {
    const target = event.target.closest("[data-followed-team-id]");
    if (!draggedId || !target) return;
    event.preventDefault();
    const from = state.pendingIds.indexOf(draggedId);
    const to = state.pendingIds.indexOf(target.dataset.followedTeamId);
    if (from >= 0 && to >= 0 && from !== to) {
      const [id] = state.pendingIds.splice(from, 1);
      state.pendingIds.splice(to, 0, id);
      announce(`${teamName(id)} moved to priority ${to + 1}.`);
      render();
    }
    draggedId = "";
  }

  function hasChanges() {
    return (
      state.pendingIds.join("\u0000") !== state.savedPersonalIds.join("\u0000")
    );
  }
  function teamName(id) {
    return state.catalog.find((team) => team.id === id)?.name || "Team";
  }
  function announce(message) {
    setStatus(message);
  }
  function setStatus(message, error = false) {
    status.textContent = message || "";
    status.classList.toggle("is-error", error);
  }
  function setDialogStatus(message, error = false) {
    dialogMessage = message || "";
    dialogMessageIsError = error;
    syncDialog();
  }
  function syncDialogAction() {
    syncDialog();
  }

  return {
    getFollowedTeamIds,
    getFollowedTeams,
    getNotificationSelectionState,
    getSelectionState,
    load,
    openPicker,
    render,
    reset,
    resetToDefault,
  };
}

function preferenceTeamIds(preferences = {}) {
  return [...(preferences.teams || [])]
    .sort((left, right) => left.priority - right.priority)
    .map((team) => String(team.teamId));
}

function notificationTeamIds(preferences = {}) {
  return [...(preferences?.teams || [])]
    .filter((team) => team.notificationsEnabled !== false)
    .sort((left, right) => left.priority - right.priority)
    .map((team) => String(team.teamId));
}

function normalizeCatalog(response = {}) {
  const fromTopLevel = Array.isArray(response.teams) ? response.teams : [];
  const fromLeagues = (response.leagues || []).flatMap((league) =>
    (league.teams || []).map((team) => ({
      ...team,
      leagues: [{ id: league.id, name: league.name }],
    })),
  );
  const teams = new Map();
  for (const source of [...fromTopLevel, ...fromLeagues]) {
    const id = String(source.id || "").trim();
    if (!id) continue;
    const existing = teams.get(id) || {
      active: source.active !== false,
      badge: followedTeamBadge(source),
      id,
      leagues: [],
      name: source.name || id,
      prettyName: source.prettyName || source.name || id,
      providerTeamIds: { ...(source.providerTeamIds || {}) },
    };
    existing.providerTeamIds = {
      ...existing.providerTeamIds,
      ...(source.providerTeamIds || {}),
    };
    for (const league of source.leagues || [])
      if (!existing.leagues.some((entry) => entry.id === String(league.id)))
        existing.leagues.push({
          id: String(league.id),
          name: String(league.name || "Competition"),
        });
    teams.set(id, existing);
  }
  return [...teams.values()].sort((left, right) =>
    left.name.localeCompare(right.name),
  );
}

export function effectiveTeamIds(defaultIds = [], preferences = null) {
  if (!preferences || preferences.usingDefault)
    return [...defaultIds].map(String);
  return preferenceTeamIds(preferences);
}

export function followedTeamBadge(team = {}) {
  const id = String(team.id || "").trim();
  const localTeamIds = new Set(["1", "2", "3", "4", "5", "6", "7"]);
  if (localTeamIds.has(id)) {
    return `assets/teams/${id}/badge.${["1", "2"].includes(id) ? "png" : "svg"}`;
  }
  return String(team.crestUrl || team.badge || "").trim();
}

export function normalizeLeagues(response = {}, catalog = []) {
  const leagues = new Map();
  const sources = [
    ...(response.leagues || []),
    ...catalog.flatMap((team) => team.leagues || []),
  ];
  for (const source of sources) {
    const league = normalizeSelectableLeague(source.name);
    if (league) leagues.set(league.id, league);
  }
  return [...leagues.values()].sort((left, right) =>
    left.name.localeCompare(right.name),
  );
}

export function personalTeamIds(effectiveIds = [], usingDefault = false) {
  return usingDefault ? [] : [...effectiveIds];
}

export function partitionPickerTeams(teams = [], defaultIds = []) {
  const defaults = new Set(defaultIds.map(String));
  const defaultOrder = new Map(
    defaultIds.map((id, index) => [String(id), index]),
  );
  return {
    defaults: teams
      .filter((team) => defaults.has(String(team.id)))
      .sort(
        (left, right) =>
          defaultOrder.get(String(left.id)) -
          defaultOrder.get(String(right.id)),
      ),
    others: teams.filter((team) => !defaults.has(String(team.id))),
  };
}

export function normalizeSelectableLeague(value) {
  const name = String(value || "").trim();
  const key = normalize(name)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  if (
    !key ||
    /\b(cup|copa|supercopa|coppa|coupe|pokal|trophy|shield|friendlies|friendly|preseason|summer series|international|champions league|europa league|conference league|nations league|playoffs?)\b/.test(
      key,
    )
  )
    return null;
  if (key === "premier league" || key === "english premier league")
    return { id: "premier-league", name: "Premier League" };
  if (
    key === "la liga" ||
    key === "primera division" ||
    key.startsWith("laliga season ")
  )
    return { id: "la-liga", name: "La Liga" };
  if (
    key === "mls" ||
    key === "major league soccer" ||
    key.startsWith("mls regular season")
  )
    return { id: "mls", name: "MLS" };
  const displayName = name
    .replace(/\s+season\s+\d{4}(?:\s*[-–]\s*\d{4})?$/i, "")
    .trim();
  return {
    id: normalize(displayName)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, ""),
    name: displayName,
  };
}

function selectableLeagueNames(leagues = []) {
  const names = new Map();
  for (const source of leagues) {
    const league = normalizeSelectableLeague(source.name);
    if (league) names.set(league.id, league.name);
  }
  return [...names.values()].sort((left, right) => left.localeCompare(right));
}

function normalize(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}
function loadingMarkup(message) {
  return `<p class="table-message loading-message"><span class="loading-spinner" aria-hidden="true"></span><span>${escapeHtml(message)}</span></p>`;
}
function escapeAttribute(value) {
  return escapeHtml(value);
}
function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
