const VIEWS = [
  ["unsorted", "Unsorted"],
  ["favorites", "Favorites"],
  ["seen", "Seen"],
  ["all", "All Earned"],
  ["platinums", "Platinums"],
];

export function createTrophyLogController({ endpoint, getAccessToken }) {
  const root = document.querySelector("#trophy-log");
  const filters = document.querySelector("#trophy-log-filters");
  const filterPanel = document.querySelector("#trophy-log-filter-panel");
  const filterToggle = document.querySelector("#trophy-log-filter-toggle");
  const sortSelect = document.querySelector("#trophy-log-sort");
  const refreshButton = document.querySelector("#trophy-log-refresh");
  const syncStatus = document.querySelector("#trophy-log-sync-status");
  const grid = document.querySelector("#trophy-log-grid");
  const pagination = document.querySelector("#trophy-log-pagination");
  const resultLabel = document.querySelector("#trophy-log-result");
  const authForm = document.querySelector("#psn-auth-form");
  const authStatus = document.querySelector("#psn-auth-status");
  const state = { view: "unsorted", sort: "newest", page: 1, busy: false, syncing: false, items: [] };
  if (!root) return { renderPage: () => Promise.resolve() };

  filters?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-trophy-log-view]");
    if (!button || state.busy) return;
    state.view = button.dataset.trophyLogView || "unsorted";
    if (state.view !== "platinums" && state.sort.startsWith("platinum-duration-")) {
      state.sort = "newest";
      sortSelect.value = state.sort;
    }
    state.page = 1;
    syncFilters();
    void load();
  });
  filterToggle?.addEventListener("click", () => {
    const expanded = filterToggle.getAttribute("aria-expanded") === "true";
    filterToggle.setAttribute("aria-expanded", String(!expanded));
    filterToggle.setAttribute("aria-label", `${expanded ? "Show" : "Hide"} trophy filters and sorting`);
    filterToggle.classList.toggle("is-active", !expanded);
    filterPanel.hidden = expanded;
  });
  sortSelect?.addEventListener("change", () => {
    if (state.busy) return;
    state.sort = sortSelect.value || "newest";
    if (state.sort.startsWith("platinum-duration-")) {
      state.view = "platinums";
      syncFilters();
    }
    state.page = 1;
    void load();
  });
  refreshButton?.addEventListener("click", () => void refreshTrophies());
  grid?.addEventListener("click", (event) => {
    const seenThroughButton = event.target.closest("[data-trophy-seen-through]");
    if (seenThroughButton) {
      if (!seenThroughButton.classList.contains("is-confirming")) {
        grid.querySelectorAll("[data-trophy-seen-through].is-confirming").forEach((button) => {
          button.classList.remove("is-confirming");
          button.setAttribute("aria-expanded", "false");
        });
        seenThroughButton.classList.add("is-confirming");
        seenThroughButton.setAttribute("aria-expanded", "true");
        syncStatus.textContent = "Click Seen through here again to confirm.";
        return;
      }
      void saveSeenThrough(seenThroughButton);
      return;
    }
    const button = event.target.closest("[data-trophy-preference]");
    if (button) void savePreference(button);
  });
  pagination?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-trophy-log-page]");
    if (!button || state.busy) return;
    state.page = Math.max(1, Number(button.dataset.trophyLogPage) || 1);
    void load();
    root.scrollIntoView({ block: "start", behavior: "smooth" });
  });
  authForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    void savePsnAuth();
  });

  function renderPage() {
    syncFilters();
    return Promise.all([load(), loadAuthStatus()]);
  }

  async function load() {
    if (!grid || state.busy) return;
    state.busy = true;
    grid.setAttribute("aria-busy", "true");
    grid.innerHTML = loading("Loading trophy log...");
    try {
      const value = await request(`/api/psn/trophy-log?view=${encodeURIComponent(state.view)}&sort=${encodeURIComponent(state.sort)}&page=${state.page}&limit=48`);
      state.view = value.view || state.view;
      syncFilters();
      state.items = value.items || [];
      renderItems(state.items);
      renderPagination(value.pagination || {});
    } catch (error) {
      grid.innerHTML = `<p class="table-message">${escapeHtml(error.message)}</p>`;
      if (resultLabel) resultLabel.textContent = "Unable to load trophies";
    } finally {
      state.busy = false;
      grid.setAttribute("aria-busy", "false");
    }
  }

  function renderItems(items) {
    if (resultLabel) resultLabel.textContent = `${items.length} shown`;
    if (!items.length) {
      grid.innerHTML = `<div class="trophy-log-empty"><strong>${state.view === "unsorted" ? "You're caught up." : "No trophies in this view."}</strong><span>${state.view === "unsorted" ? "Newly earned trophies will appear here automatically." : "Choose another trophy-log view."}</span></div>`;
      return;
    }
    grid.innerHTML = items.map((item) => {
      const current = item.state || "unsorted";
      const details = [capitalize(item.type), item.earnedRate === null ? "" : `${Number(item.earnedRate).toFixed(1)}% earned`, formatDate(item.earnedAt)].filter(Boolean).join(" · ");
      const numbering = [item.platinumNumber ? `Platinum Number: ${item.platinumNumber}` : "", item.trophyNumber ? `Trophy Number: ${item.trophyNumber}` : "", item.completionSeconds !== null ? `Time to Platinum: ${formatElapsed(item.completionSeconds)}` : ""].filter(Boolean);
      return `<article class="trophy-log-card" data-game-id="${escapeHtml(item.gameId)}" data-trophy-id="${escapeHtml(item.id)}" data-preference-state="${escapeHtml(current)}">
        <div class="trophy-log-image">${item.iconUrl ? `<img src="${escapeHtml(item.iconUrl)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">` : `<span aria-hidden="true">★</span>`}</div>
        <div class="trophy-log-copy"><p>${escapeHtml(item.gameName || "Unknown game")}</p><h2>${escapeHtml(item.name || "Unknown trophy")}</h2>${item.description ? `<span>${escapeHtml(item.description)}</span>` : ""}<small>${escapeHtml(details)}</small>${numbering.length ? `<div class="trophy-log-numbering">${numbering.map((value) => `<span class="trophy-metadata-chip">${escapeHtml(value)}</span>`).join("")}</div>` : ""}</div>
        <div class="trophy-log-actions" aria-label="Classify ${escapeHtml(item.name)}">${renderActions(current)}</div>
      </article>`;
    }).join("");
  }

  function renderPagination(value) {
    const hasPrevious = state.page > 1;
    const hasMore = Boolean(value.hasMore);
    pagination.innerHTML = !hasPrevious && !hasMore ? "" : `<button type="button" data-trophy-log-page="${state.page - 1}" ${hasPrevious ? "" : "disabled"}>Previous</button><span>Page ${state.page}</span><button type="button" data-trophy-log-page="${state.page + 1}" ${hasMore ? "" : "disabled"}>Next</button>`;
  }

  async function savePreference(button) {
    const card = button.closest("[data-game-id][data-trophy-id]");
    if (!card || state.busy) return;
    button.disabled = true;
    try {
      const nextState = button.dataset.trophyPreference || null;
      await request(`/api/psn/trophies/${encodeURIComponent(card.dataset.gameId)}/${encodeURIComponent(card.dataset.trophyId)}/preference`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: nextState }),
      });
      window.dispatchEvent(new CustomEvent("boxthislap:trophy-preferences-changed"));
      updatePreferenceInPlace(card, nextState);
    } catch (error) {
      button.disabled = false;
      window.alert(error.message);
    }
  }

  async function saveSeenThrough(button) {
    const card = button.closest("[data-game-id][data-trophy-id]");
    const cards = [...grid.querySelectorAll("[data-game-id][data-trophy-id]")];
    const selectedIndex = cards.indexOf(card);
    if (selectedIndex < 0 || state.busy) return;
    const items = cards.slice(0, selectedIndex + 1)
      .filter((entry) => entry.dataset.preferenceState === "unsorted")
      .map((entry) => ({ gameId: entry.dataset.gameId, trophyId: Number(entry.dataset.trophyId) }));
    if (!items.length) return;
    state.busy = true;
    button.disabled = true;
    button.querySelector("span").textContent = "Working...";
    try {
      await request("/api/psn/trophies/seen-through", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      window.dispatchEvent(new CustomEvent("boxthislap:trophy-preferences-changed"));
      syncStatus.textContent = `${items.length} ${items.length === 1 ? "trophy" : "trophies"} marked Seen.`;
    } catch (error) {
      window.alert(error.message);
    } finally {
      state.busy = false;
      await load();
      root.scrollIntoView({ block: "start", behavior: "smooth" });
    }
  }

  function updatePreferenceInPlace(card, nextState) {
    const gameId = card.dataset.gameId;
    const trophyId = Number(card.dataset.trophyId);
    const item = state.items.find((entry) => entry.gameId === gameId && Number(entry.id) === trophyId);
    if (item) item.state = nextState;
    const leavesCurrentView = (state.view === "unsorted" && nextState !== null)
      || (state.view === "favorites" && nextState !== "favorite")
      || (state.view === "seen" && nextState !== "seen");
    if (leavesCurrentView) {
      state.items = state.items.filter((entry) => !(entry.gameId === gameId && Number(entry.id) === trophyId));
      card.remove();
      if (resultLabel) resultLabel.textContent = `${state.items.length} shown`;
      if (!state.items.length) renderItems([]);
      return;
    }
    const current = nextState || "unsorted";
    card.dataset.preferenceState = current;
    const actions = card.querySelector(".trophy-log-actions");
    if (actions) actions.innerHTML = renderActions(current);
  }

  async function refreshTrophies() {
    if (state.syncing) return;
    state.syncing = true;
    refreshButton.disabled = true;
    refreshButton.textContent = "Refreshing...";
    syncStatus.textContent = "Checking PSN for changed and recently played games...";
    try {
      const value = await request("/api/psn/sync", { method: "POST" });
      syncStatus.textContent = `Refresh complete: ${value.titlesSynced || 0} games checked and ${value.trophiesUpdated || 0} trophies updated.`;
      state.page = 1;
      await load();
    } catch (error) {
      syncStatus.textContent = error.message;
    } finally {
      state.syncing = false;
      refreshButton.disabled = false;
      refreshButton.textContent = "Refresh";
    }
  }

  async function loadAuthStatus() {
    if (!authStatus) return;
    try {
      const value = await request("/api/psn/auth");
      authStatus.textContent = value.updatedAt
        ? `Encrypted PSN access updated ${formatDate(value.updatedAt)}.`
        : value.configured ? "PSN access is configured. You can replace it below when Sony expires it." : "PSN access is not configured.";
    } catch (error) {
      authStatus.textContent = error.message;
    }
  }

  async function savePsnAuth() {
    const input = authForm?.elements.namedItem("npsso");
    const submit = authForm?.querySelector("button[type=submit]");
    const npsso = String(input?.value || "").trim();
    if (!npsso) { authStatus.textContent = "Paste the NPSSO value first."; input?.focus(); return; }
    submit.disabled = true;
    authStatus.textContent = "Validating with Sony and encrypting access...";
    try {
      const value = await request("/api/psn/auth", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ npsso }),
      });
      input.value = "";
      authStatus.textContent = `PSN access updated ${formatDate(value.updatedAt)}. The next hourly sync will use it.`;
    } catch (error) {
      authStatus.textContent = error.message;
    } finally {
      submit.disabled = false;
    }
  }

  async function request(path, options = {}) {
    const token = await getAccessToken();
    const response = await fetch(`${String(endpoint).replace(/\/$/, "")}${path}`, {
      ...options,
      headers: { Accept: "application/json", Authorization: `Bearer ${token}`, ...(options.headers || {}) },
    });
    const value = await response.json().catch(() => null);
    if (!response.ok || !value?.ok) throw new Error(value?.error || `Trophy request failed (${response.status}).`);
    return value;
  }

  function syncFilters() {
    filters?.querySelectorAll("[data-trophy-log-view]").forEach((button) => {
      const active = button.dataset.trophyLogView === state.view;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  return { renderPage };
}

function loading(label) { return `<p class="table-message"><span class="loading-spinner"></span>${escapeHtml(label)}</p>`; }
function formatDate(value) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "" : date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" }); }
function capitalize(value) { const text = String(value || ""); return text ? `${text[0].toUpperCase()}${text.slice(1)}` : ""; }
function renderActions(current) { return `<button type="button" data-trophy-preference="favorite" ${current === "favorite" ? "disabled" : ""}>★ Favorite</button>${current === "unsorted" ? `<button class="action-button trophy-seen-through-button" type="button" data-trophy-seen-through aria-expanded="false" aria-label="Seen through here"><svg aria-hidden="true" viewBox="0 0 24 24" focusable="false"><path d="M12 19V5m-6 6 6-6 6 6"></path></svg><span>Seen through here</span></button>` : ""}${current !== "unsorted" ? `<button type="button" data-trophy-preference="">Return to Unsorted</button>` : ""}`; }
function formatElapsed(seconds) { const value = Math.max(0, Number(seconds) || 0); const totalDays = Math.floor(value / 86400); const years = Math.floor(totalDays / 365); const months = Math.floor((totalDays % 365) / 30); const days = (totalDays % 365) % 30; const parts = [[years, "year"], [months, "month"], [days, "day"]].filter(([amount]) => amount).map(([amount, unit]) => `${amount} ${unit}${amount === 1 ? "" : "s"}`); if (parts.length) return parts.join(", "); const hours = Math.floor(value / 3600); if (hours) return `${hours} hour${hours === 1 ? "" : "s"}`; const minutes = Math.floor(value / 60); return `${minutes} minute${minutes === 1 ? "" : "s"}`; }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]); }
