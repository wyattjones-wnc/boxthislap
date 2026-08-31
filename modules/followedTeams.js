export function createFollowedTeamsController({ getManagerId, onChanged = () => {}, request }) {
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
  const dialog = document.querySelector("#followed-teams-dialog");
  const dialogClose = document.querySelector("#followed-teams-dialog-close");
  const dialogDone = document.querySelector("#followed-teams-dialog-done");
  const search = document.querySelector("#followed-teams-search");
  const leagueFilter = document.querySelector("#followed-teams-league");
  const picker = document.querySelector("#followed-teams-picker");
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
    saving: false,
    usingDefault: true,
  };
  let draggedId = "";

  root?.addEventListener("click", handleRootClick);
  chooseButton?.addEventListener("click", openPicker);
  topResetButton?.addEventListener("click", () => { void resetToDefault(); });
  list?.addEventListener("dragstart", handleDragStart);
  list?.addEventListener("dragover", (event) => draggedId && event.preventDefault());
  list?.addEventListener("drop", handleDrop);
  list?.addEventListener("dragend", () => { draggedId = ""; });
  picker?.addEventListener("change", handlePickerChange);
  search?.addEventListener("input", renderPicker);
  leagueFilter?.addEventListener("change", renderPicker);
  dialogClose?.addEventListener("click", closePicker);
  dialogDone?.addEventListener("click", closePicker);
  dialog?.addEventListener("click", (event) => { if (event.target === dialog) closePicker(); });

  function reset() {
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
    state.saving = false;
    state.usingDefault = true;
    render();
    onChanged([]);
  }

  async function load(options = {}) {
    const managerId = String(getManagerId() || "").trim();
    const loadKey = managerId || "anonymous";
    if (!root) return;
    if (!options.force && state.loadedManagerId === loadKey && state.catalog.length) {
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
    ]).then(([catalog, preferences]) => {
      state.catalog = normalizeCatalog(catalog);
      state.leagues = normalizeLeagues(catalog, state.catalog);
      state.defaultIds = (catalog.defaultTeamIds || []).map(String);
      state.savedIds = preferences
        ? preferenceTeamIds(preferences)
        : [...state.defaultIds];
      state.pendingIds = [...state.savedIds];
      state.revision = Number(preferences?.revision || 0);
      state.usingDefault = !managerId || Boolean(preferences?.usingDefault);
      state.loadedManagerId = loadKey;
      onChanged(getFollowedTeams());
    }).catch((error) => {
      state.error = error.message || "Followed teams could not be loaded.";
      throw error;
    }).finally(() => {
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
      ...(teams.get(id) || { active: false, badge: "", id, leagues: [], name: `Unavailable team (${id})` }),
      priority: index + 1,
    }));
  }

  function render() {
    const managerId = String(getManagerId() || "").trim();
    const canReset = Boolean(managerId) && (!state.usingDefault || hasChanges());
    if (choiceActions) choiceActions.hidden = !managerId;
    if (chooseButton) {
      chooseButton.hidden = !managerId;
      chooseButton.disabled = state.loading || state.saving || !state.catalog.length;
    }
    if (topResetButton) {
      topResetButton.hidden = !canReset;
      topResetButton.disabled = state.loading || state.saving;
    }
    if (!root) return;
    root.hidden = !managerId;
    if (!managerId) return;
    count.textContent = `${state.pendingIds.length} team${state.pendingIds.length === 1 ? "" : "s"}`;
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
      list.innerHTML = `<div class="followed-teams-empty"><p>You aren't following any teams. Add teams to personalize Box This Lap and receive team notifications.</p></div>`;
    } else {
      list.innerHTML = state.pendingIds.map(renderSelectedTeam).join("");
    }
    if (!state.saving && !state.error) {
      setStatus(hasChanges() ? "You have unsaved changes." : state.usingDefault ? "Using the admin’s default teams." : "");
    }
  }

  function renderSelectedTeam(id, index) {
    const team = state.catalog.find((entry) => entry.id === id);
    const name = team?.name || `Unavailable team (${id})`;
    const league = team?.leagues?.map((entry) => entry.name).join(", ") || "Unavailable";
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

  function openPicker() {
    if (!getManagerId() || !dialog || state.loading || !state.catalog.length) return;
    search.value = "";
    leagueFilter.value = "";
    renderPicker();
    dialog.showModal();
    window.setTimeout(() => search.focus(), 0);
  }

  function closePicker() {
    if (dialog?.open) dialog.close();
    render();
  }

  function renderPicker() {
    if (!picker) return;
    const query = normalize(search?.value);
    const leagueId = leagueFilter?.value || "";
    const visible = state.catalog.filter((team) => {
      const matchesText = !query || normalize(`${team.name} ${team.prettyName}`).includes(query);
      const matchesLeague = !leagueId || team.leagues.some((league) => league.id === leagueId);
      return team.active && matchesText && matchesLeague;
    });
    leagueFilter.innerHTML = [`<option value="">All competitions</option>`, ...state.leagues.map((league) => `<option value="${escapeAttribute(league.id)}"${league.id === leagueId ? " selected" : ""}>${escapeHtml(league.name)}</option>`)].join("");
    picker.innerHTML = visible.length ? visible.map((team) => {
      const selected = state.pendingIds.includes(team.id);
      const league = team.leagues.map((entry) => entry.name).join(", ");
      return `
        <label class="followed-team-picker-row${selected ? " is-selected" : ""}">
          <input type="checkbox" value="${escapeAttribute(team.id)}"${selected ? " checked" : ""}>
          ${team.badge ? `<img src="${escapeAttribute(team.badge)}" alt="" loading="lazy" decoding="async">` : `<span class="followed-team-fallback" aria-hidden="true">${escapeHtml(team.name.charAt(0))}</span>`}
          <span><strong>${escapeHtml(team.name)}</strong><small>${escapeHtml(league)}</small></span>
        </label>
      `;
    }).join("") : `<p class="table-message">No teams match those filters.</p>`;
  }

  function handlePickerChange(event) {
    const input = event.target.closest("input[type='checkbox']");
    if (!input) return;
    const id = input.value;
    if (input.checked && !state.pendingIds.includes(id)) state.pendingIds.push(id);
    if (!input.checked) state.pendingIds = state.pendingIds.filter((entry) => entry !== id);
    renderPicker();
    announce(input.checked ? `${teamName(id)} added. Save teams to apply.` : `${teamName(id)} removed. Save teams to apply.`);
  }

  async function save() {
    if (!hasChanges() || state.saving) return;
    state.saving = true;
    state.error = "";
    let successMessage = "";
    setStatus("Saving followed teams…");
    render();
    try {
      const response = await request("/api/me/followed-teams", {
        body: JSON.stringify({ revision: state.revision, teamIds: state.pendingIds }),
        method: "PUT",
      });
      applyPreference(response);
      onChanged(getFollowedTeams());
      successMessage = state.usingDefault
        ? "Reset to the admin’s default teams."
        : "Followed teams saved. Team notifications now use this list.";
    } catch (error) {
      state.error = error.message || "Followed teams could not be saved.";
      setStatus(`${state.error} Your unsaved selection is still here for retry.`, true);
    } finally {
      state.saving = false;
      render();
      if (successMessage) setStatus(successMessage);
    }
  }

  function handleRootClick(event) {
    if (event.target.closest("#followed-teams-add")) return openPicker();
    if (event.target.closest("#followed-teams-reset")) return void resetToDefault();
    if (event.target.closest("#followed-teams-save")) return void save();
    if (event.target.closest("[data-followed-teams-retry]")) return void load({ force: true }).catch(() => undefined);
    const remove = event.target.closest("[data-followed-team-remove]");
    if (remove) {
      const id = remove.dataset.followedTeamRemove;
      state.pendingIds = state.pendingIds.filter((entry) => entry !== id);
      announce(`${teamName(id)} removed. Notifications will stop after you save.`);
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
      state.pendingIds = [...state.savedIds];
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
    state.pendingIds = [...state.savedIds];
    state.revision = Number(response.revision ?? state.revision + 1);
    state.usingDefault = Boolean(response.usingDefault);
  }

  function move(id, offset) {
    const from = state.pendingIds.indexOf(id);
    const to = from + offset;
    if (from < 0 || to < 0 || to >= state.pendingIds.length) return;
    [state.pendingIds[from], state.pendingIds[to]] = [state.pendingIds[to], state.pendingIds[from]];
    announce(`${teamName(id)} moved to priority ${to + 1}.`);
    render();
  }

  function handleDragStart(event) {
    const row = event.target.closest("[data-followed-team-id]");
    if (!row || !event.target.closest(".followed-team-drag")) return event.preventDefault();
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

  function hasChanges() { return state.pendingIds.join("\u0000") !== state.savedIds.join("\u0000"); }
  function teamName(id) { return state.catalog.find((team) => team.id === id)?.name || "Team"; }
  function announce(message) { setStatus(message); }
  function setStatus(message, error = false) { status.textContent = message || ""; status.classList.toggle("is-error", error); }

  return { getFollowedTeamIds, getFollowedTeams, load, openPicker, render, reset, resetToDefault };
}

function preferenceTeamIds(preferences = {}) {
  return [...(preferences.teams || [])]
    .sort((left, right) => left.priority - right.priority)
    .map((team) => String(team.teamId));
}

function normalizeCatalog(response = {}) {
  const fromTopLevel = Array.isArray(response.teams) ? response.teams : [];
  const fromLeagues = (response.leagues || []).flatMap((league) => (league.teams || []).map((team) => ({ ...team, leagues: [{ id: league.id, name: league.name }] })));
  const teams = new Map();
  for (const source of [...fromTopLevel, ...fromLeagues]) {
    const id = String(source.id || "").trim();
    if (!id) continue;
    const existing = teams.get(id) || { active: source.active !== false, badge: source.crestUrl || source.badge || "", id, leagues: [], name: source.name || id, prettyName: source.prettyName || source.name || id };
    for (const league of source.leagues || []) if (!existing.leagues.some((entry) => entry.id === String(league.id))) existing.leagues.push({ id: String(league.id), name: String(league.name || "Competition") });
    teams.set(id, existing);
  }
  return [...teams.values()].sort((left, right) => left.name.localeCompare(right.name));
}

function normalizeLeagues(response, catalog) {
  const leagues = new Map((response.leagues || []).map((league) => [String(league.id), { id: String(league.id), name: String(league.name || "Competition") }]));
  for (const team of catalog) for (const league of team.leagues) leagues.set(league.id, league);
  return [...leagues.values()].sort((left, right) => left.name.localeCompare(right.name));
}

function normalize(value) { return String(value || "").trim().toLowerCase(); }
function loadingMarkup(message) { return `<p class="table-message loading-message"><span class="loading-spinner" aria-hidden="true"></span><span>${escapeHtml(message)}</span></p>`; }
function escapeAttribute(value) { return escapeHtml(value); }
function escapeHtml(value) { return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
