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
  const footyFilters = document.querySelector("#footy-filters");
  const dialog = document.querySelector("#followed-teams-dialog");
  const dialogClose = document.querySelector("#followed-teams-dialog-close");
  const dialogDone = document.querySelector("#followed-teams-dialog-done");
  const dialogStatus = document.querySelector("#followed-teams-dialog-status");
  const search = document.querySelector("#followed-teams-search");
  const leagueFilter = document.querySelector("#followed-teams-league");
  const picker = document.querySelector("#followed-teams-picker");
  const pagination = document.querySelector("#followed-teams-pagination");
  const pagePrevious = document.querySelector("#followed-teams-page-previous");
  const pageNext = document.querySelector("#followed-teams-page-next");
  const pageStatus = document.querySelector("#followed-teams-page-status");
  const state = {
    catalog: [],
    defaultIds: [],
    error: "",
    leagues: [],
    loadPromise: null,
    loadedManagerId: "",
    loading: false,
    pendingIds: [],
    pickerPage: 1,
    revision: 0,
    savedIds: [],
    savedPersonalIds: [],
    saving: false,
    usingDefault: true,
  };
  let draggedId = "";
  let lockedScrollY = 0;

  root?.addEventListener("click", handleRootClick);
  chooseButton?.addEventListener("click", openPicker);
  topResetButton?.addEventListener("click", () => { void resetToDefault(); });
  list?.addEventListener("dragstart", handleDragStart);
  list?.addEventListener("dragover", (event) => draggedId && event.preventDefault());
  list?.addEventListener("drop", handleDrop);
  list?.addEventListener("dragend", () => { draggedId = ""; });
  picker?.addEventListener("change", handlePickerChange);
  search?.addEventListener("input", resetPickerPage);
  leagueFilter?.addEventListener("change", resetPickerPage);
  pagePrevious?.addEventListener("click", () => changePickerPage(-1));
  pageNext?.addEventListener("click", () => changePickerPage(1));
  dialogClose?.addEventListener("click", closePicker);
  dialogDone?.addEventListener("click", () => { void save({ closeDialog: true }); });
  dialog?.addEventListener("click", (event) => { if (event.target === dialog) closePicker(); });
  dialog?.addEventListener("close", unlockPageScroll);
  window.addEventListener("resize", () => {
    if (!dialog?.open) return;
    state.pickerPage = 1;
    renderPicker();
  });

  function reset() {
    if (dialog?.open) dialog.close();
    unlockPageScroll();
    state.catalog = [];
    state.defaultIds = [];
    state.error = "";
    state.leagues = [];
    state.loadPromise = null;
    state.loadedManagerId = "";
    state.loading = false;
    state.pendingIds = [];
    state.pickerPage = 1;
    state.revision = 0;
    state.savedIds = [];
    state.savedPersonalIds = [];
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
      state.revision = Number(preferences?.revision || 0);
      state.usingDefault = !managerId || Boolean(preferences?.usingDefault);
      state.savedIds = effectiveTeamIds(state.defaultIds, preferences);
      state.savedPersonalIds = personalTeamIds(state.savedIds, state.usingDefault);
      state.pendingIds = [...state.savedPersonalIds];
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

  function getSelectionState() {
    const managerId = String(getManagerId() || "").trim();
    return {
      hasPersonalSelection: Boolean(managerId) && state.loadedManagerId === managerId && !state.usingDefault && state.savedIds.length > 0,
      loaded: Boolean(managerId) && state.loadedManagerId === managerId,
    };
  }

  function render() {
    const managerId = String(getManagerId() || "").trim();
    const canReset = Boolean(managerId) && (!state.usingDefault || hasChanges());
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
      chooseButton.disabled = state.loading || state.saving || !state.catalog.length;
      chooseButton.textContent = state.usingDefault ? "Add Teams" : "Choose teams";
    }
    if (topResetButton) {
      topResetButton.hidden = !managerId || state.usingDefault;
      topResetButton.disabled = state.loading || state.saving;
    }
    if (!root) return;
    root.hidden = !managerId;
    if (!managerId) return;
    count.textContent = state.usingDefault && !hasChanges()
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
      setStatus(hasChanges() ? "You have unsaved changes." : state.usingDefault ? "Using the admin’s default teams." : "");
    }
  }

  function renderSelectedTeam(id, index) {
    const team = state.catalog.find((entry) => entry.id === id);
    const name = team?.name || `Unavailable team (${id})`;
    const league = selectableLeagueNames(team?.leagues).join(", ") || "Other competitions";
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
    state.pickerPage = 1;
    setDialogStatus("");
    renderPicker();
    dialog.showModal();
    lockedScrollY = window.scrollY;
    document.documentElement.style.setProperty("--followed-teams-scroll-offset", `${-lockedScrollY}px`);
    document.documentElement.classList.add("has-followed-teams-dialog");
    window.setTimeout(() => search.focus(), 0);
  }

  function closePicker() {
    if (dialog?.open) dialog.close();
    unlockPageScroll();
    render();
  }

  function unlockPageScroll() {
    const wasLocked = document.documentElement.classList.contains("has-followed-teams-dialog");
    document.documentElement.classList.remove("has-followed-teams-dialog");
    document.documentElement.style.removeProperty("--followed-teams-scroll-offset");
    if (wasLocked) window.scrollTo(0, lockedScrollY);
  }

  function renderPicker() {
    if (!picker) return;
    const query = normalize(search?.value);
    const leagueId = leagueFilter?.value || "";
    const visible = state.catalog.filter((team) => {
      const matchesText = !query || normalize(`${team.name} ${team.prettyName}`).includes(query);
      const matchesLeague = !leagueId || team.leagues.some((league) => normalizeSelectableLeague(league.name)?.id === leagueId);
      return team.active && matchesText && matchesLeague;
    });
    leagueFilter.innerHTML = [`<option value="">All competitions</option>`, ...state.leagues.map((league) => `<option value="${escapeAttribute(league.id)}"${league.id === leagueId ? " selected" : ""}>${escapeHtml(league.name)}</option>`)].join("");
    const page = paginatePickerTeams(visible, state.defaultIds, state.pickerPage, pickerPageSizeForViewport({
      height: window.innerHeight,
      width: window.innerWidth,
    }));
    state.pickerPage = page.page;
    const renderTeam = (team) => {
      const selected = state.pendingIds.includes(team.id);
      const league = selectableLeagueNames(team.leagues).join(", ") || "Other competitions";
      return `
        <label class="followed-team-picker-row${selected ? " is-selected" : ""}">
          <input type="checkbox" value="${escapeAttribute(team.id)}"${selected ? " checked" : ""}>
          ${team.badge ? `<img src="${escapeAttribute(team.badge)}" alt="" loading="lazy" decoding="async">` : `<span class="followed-team-fallback" aria-hidden="true">${escapeHtml(team.name.charAt(0))}</span>`}
          <span><strong>${escapeHtml(team.name)}</strong><small>${escapeHtml(league)}</small></span>
        </label>
      `;
    };
    picker.innerHTML = visible.length ? [
      page.defaults.length ? `<div class="followed-team-picker-group-label">Default teams</div>${page.defaults.map(renderTeam).join("")}` : "",
      page.defaults.length && page.others.length ? `<div class="followed-team-picker-divider" role="separator"><span>Other teams</span></div>` : "",
      !page.defaults.length && page.others.length ? `<div class="followed-team-picker-group-label">Other teams</div>` : "",
      page.others.map(renderTeam).join(""),
    ].join("") : `<p class="table-message">No teams match those filters.</p>`;
    if (pagination) pagination.hidden = page.pageCount <= 1;
    if (pagePrevious) pagePrevious.disabled = page.page <= 1;
    if (pageNext) pageNext.disabled = page.page >= page.pageCount;
    if (pageStatus) pageStatus.textContent = `Page ${page.page} of ${page.pageCount}`;
    syncDialogAction();
  }

  function resetPickerPage() {
    state.pickerPage = 1;
    renderPicker();
  }

  function changePickerPage(offset) {
    state.pickerPage += offset;
    renderPicker();
    picker?.scrollTo({ top: 0 });
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
      const response = await request("/api/me/followed-teams", {
        body: JSON.stringify({ revision: state.revision, teamIds: state.pendingIds }),
        method: "PUT",
      });
      applyPreference(response);
      onChanged(getFollowedTeams());
      successMessage = state.usingDefault
        ? "Reset to the admin’s default teams."
        : "Followed teams saved. Team notifications now use this list.";
      if (options.closeDialog) closePicker();
    } catch (error) {
      state.error = error.message || "Followed teams could not be saved.";
      setStatus(`${state.error} Your unsaved selection is still here for retry.`, true);
      setDialogStatus(`${state.error} Your selection is still here for retry.`, true);
    } finally {
      state.saving = false;
      render();
      syncDialogAction();
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
    state.revision = Number(response.revision ?? state.revision + 1);
    state.usingDefault = Boolean(response.usingDefault);
    state.savedPersonalIds = personalTeamIds(state.savedIds, state.usingDefault);
    state.pendingIds = [...state.savedPersonalIds];
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

  function hasChanges() { return state.pendingIds.join("\u0000") !== state.savedPersonalIds.join("\u0000"); }
  function teamName(id) { return state.catalog.find((team) => team.id === id)?.name || "Team"; }
  function announce(message) { setStatus(message); }
  function setStatus(message, error = false) { status.textContent = message || ""; status.classList.toggle("is-error", error); }
  function setDialogStatus(message, error = false) { if (dialogStatus) { dialogStatus.textContent = message || ""; dialogStatus.classList.toggle("is-error", error); } }
  function syncDialogAction() { if (dialogDone) { dialogDone.disabled = state.saving; dialogDone.textContent = state.saving ? "Saving…" : hasChanges() ? "Save teams" : "Done"; } }

  return { getFollowedTeamIds, getFollowedTeams, getSelectionState, load, openPicker, render, reset, resetToDefault };
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
    const existing = teams.get(id) || { active: source.active !== false, badge: followedTeamBadge(source), id, leagues: [], name: source.name || id, prettyName: source.prettyName || source.name || id };
    for (const league of source.leagues || []) if (!existing.leagues.some((entry) => entry.id === String(league.id))) existing.leagues.push({ id: String(league.id), name: String(league.name || "Competition") });
    teams.set(id, existing);
  }
  return [...teams.values()].sort((left, right) => left.name.localeCompare(right.name));
}

export function effectiveTeamIds(defaultIds = [], preferences = null) {
  if (!preferences || preferences.usingDefault) return [...defaultIds].map(String);
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
  return [...leagues.values()].sort((left, right) => left.name.localeCompare(right.name));
}

export function personalTeamIds(effectiveIds = [], usingDefault = false) {
  return usingDefault ? [] : [...effectiveIds];
}

export function partitionPickerTeams(teams = [], defaultIds = []) {
  const defaults = new Set(defaultIds.map(String));
  const defaultOrder = new Map(defaultIds.map((id, index) => [String(id), index]));
  return {
    defaults: teams.filter((team) => defaults.has(String(team.id))).sort((left, right) => defaultOrder.get(String(left.id)) - defaultOrder.get(String(right.id))),
    others: teams.filter((team) => !defaults.has(String(team.id))),
  };
}

export function paginatePickerTeams(teams = [], defaultIds = [], requestedPage = 1, pageSize = 5) {
  const groups = partitionPickerTeams(teams, defaultIds);
  const defaults = new Set(groups.defaults.map((team) => String(team.id)));
  const ordered = [...groups.defaults, ...groups.others];
  const pageCount = Math.max(1, Math.ceil(ordered.length / pageSize));
  const page = Math.min(pageCount, Math.max(1, Number(requestedPage) || 1));
  const items = ordered.slice((page - 1) * pageSize, page * pageSize);
  return {
    defaults: items.filter((team) => defaults.has(String(team.id))),
    others: items.filter((team) => !defaults.has(String(team.id))),
    page,
    pageCount,
  };
}

export function pickerPageSizeForViewport({ height = 800, width = 1024 } = {}) {
  if (Number(height) < 580) return 2;
  if (Number(height) < 760 || Number(width) <= 620) return 3;
  return 5;
}

export function normalizeSelectableLeague(value) {
  const name = String(value || "").trim();
  const key = normalize(name).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  if (!key || /\b(cup|copa|supercopa|coppa|coupe|pokal|trophy|shield|friendlies|friendly|preseason|summer series|international|champions league|europa league|conference league|nations league|playoffs?)\b/.test(key)) return null;
  if (key === "premier league" || key === "english premier league") return { id: "premier-league", name: "Premier League" };
  if (key === "la liga" || key === "primera division" || key.startsWith("laliga season ")) return { id: "la-liga", name: "La Liga" };
  if (key === "mls" || key === "major league soccer" || key.startsWith("mls regular season")) return { id: "mls", name: "MLS" };
  const displayName = name.replace(/\s+season\s+\d{4}(?:\s*[-–]\s*\d{4})?$/i, "").trim();
  return { id: normalize(displayName).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""), name: displayName };
}

function selectableLeagueNames(leagues = []) {
  const names = new Map();
  for (const source of leagues) {
    const league = normalizeSelectableLeague(source.name);
    if (league) names.set(league.id, league.name);
  }
  return [...names.values()].sort((left, right) => left.localeCompare(right));
}

function normalize(value) { return String(value || "").trim().toLowerCase(); }
function loadingMarkup(message) { return `<p class="table-message loading-message"><span class="loading-spinner" aria-hidden="true"></span><span>${escapeHtml(message)}</span></p>`; }
function escapeAttribute(value) { return escapeHtml(value); }
function escapeHtml(value) { return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
