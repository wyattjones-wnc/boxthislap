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
  const grid = document.querySelector("#trophy-log-grid");
  const pagination = document.querySelector("#trophy-log-pagination");
  const resultLabel = document.querySelector("#trophy-log-result");
  const authForm = document.querySelector("#psn-auth-form");
  const authStatus = document.querySelector("#psn-auth-status");
  const state = { view: "unsorted", page: 1, busy: false };
  if (!root) return { renderPage: () => Promise.resolve() };

  filters?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-trophy-log-view]");
    if (!button || state.busy) return;
    state.view = button.dataset.trophyLogView || "unsorted";
    state.page = 1;
    syncFilters();
    void load();
  });
  grid?.addEventListener("click", (event) => {
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
      const value = await request(`/api/psn/trophy-log?view=${encodeURIComponent(state.view)}&page=${state.page}&limit=48`);
      renderItems(value.items || []);
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
      return `<article class="trophy-log-card" data-game-id="${escapeHtml(item.gameId)}" data-trophy-id="${escapeHtml(item.id)}">
        <div class="trophy-log-image">${item.iconUrl ? `<img src="${escapeHtml(item.iconUrl)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">` : `<span aria-hidden="true">★</span>`}</div>
        <div class="trophy-log-copy"><p>${escapeHtml(item.gameName || "Unknown game")}</p><h2>${escapeHtml(item.name || "Unknown trophy")}</h2>${item.description ? `<span>${escapeHtml(item.description)}</span>` : ""}<small>${escapeHtml(details)}</small></div>
        <div class="trophy-log-actions" aria-label="Classify ${escapeHtml(item.name)}">
          <button type="button" data-trophy-preference="favorite" ${current === "favorite" ? "disabled" : ""}>★ Favorite</button>
          <button type="button" data-trophy-preference="seen" ${current === "seen" ? "disabled" : ""}>✓ Seen</button>
          ${current !== "unsorted" ? `<button type="button" data-trophy-preference="">Return to Unsorted</button>` : ""}
        </div>
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
      await request(`/api/psn/trophies/${encodeURIComponent(card.dataset.gameId)}/${encodeURIComponent(card.dataset.trophyId)}/preference`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: button.dataset.trophyPreference || null }),
      });
      window.dispatchEvent(new CustomEvent("boxthislap:trophy-preferences-changed"));
      await load();
    } catch (error) {
      button.disabled = false;
      window.alert(error.message);
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
function escapeHtml(value) { return String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]); }
