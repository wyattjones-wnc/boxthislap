export function createTrophyStatsController({ endpoint }) {
  const content = document.querySelector("#trophy-stats-content");
  const updated = document.querySelector("#trophy-stats-updated");
  let stats = null;
  let loadPromise = null;

  content?.addEventListener("click", (event) => {
    if (event.target.closest("[data-trophy-stats-retry]")) void load(true);
  });

  function renderPage() {
    if (!content) return;
    if (stats) {
      renderStats(stats);
      return;
    }
    if (!loadPromise) renderLoading();
  }

  function load(force = false) {
    if (loadPromise && !force) return loadPromise;
    if (force) loadPromise = null;
    renderLoading();
    loadPromise = fetch(`${String(endpoint || "").replace(/\/$/, "")}/api/psn/stats`, {
      headers: { Accept: "application/json" },
    })
      .then(async (response) => {
        const value = await response.json().catch(() => null);
        if (!response.ok) throw new Error(value?.error || `Trophy stats returned ${response.status}.`);
        stats = value;
        renderStats(value);
        return value;
      })
      .catch((error) => {
        renderError(error);
        loadPromise = null;
        throw error;
      });
    return loadPromise;
  }

  function renderLoading() {
    if (!content) return;
    content.setAttribute("aria-busy", "true");
    content.innerHTML = `
      <div class="trophy-stat-grid" aria-hidden="true">
        ${Array.from({ length: 4 }, () => `<span class="trophy-stat-skeleton"></span>`).join("")}
      </div>
      <span class="loading-message"><span class="loading-spinner"></span>Loading PSN trophy stats...</span>
    `;
    if (updated) updated.textContent = "Live data from PlayStation Network";
  }

  function renderStats(value) {
    if (!content) return;
    const counts = value?.counts || {};
    const byType = value?.earnedByType || {};
    const earnedTotal = Math.max(1, Number(counts.earnedTrophies || 0));
    const gameCount = Number(counts.games || 0);
    content.setAttribute("aria-busy", "false");
    content.innerHTML = `
      <section class="trophy-stat-grid" aria-label="Trophy totals">
        ${renderStat("Synced Games", gameCount)}
        ${renderStat("Earned Trophies", counts.earnedTrophies)}
        ${renderStat("Platinums", counts.platinums)}
        ${renderStat("100% Games", counts.hundredPercent)}
      </section>
      <div class="trophy-stats-layout">
        <section class="trophy-stats-card" aria-labelledby="trophy-type-heading">
          <div class="trophy-stats-card-heading">
            <div>
              <p class="eyebrow">Collection</p>
              <h2 id="trophy-type-heading">Earned by Type</h2>
            </div>
            <span>${formatNumber(counts.earnedTrophies)} / ${formatNumber(counts.totalTrophies)}</span>
          </div>
          <div class="trophy-type-list">
            ${["platinum", "gold", "silver", "bronze"].map((type) => renderTypeRow(type, byType[type], earnedTotal)).join("")}
          </div>
        </section>
        <section class="trophy-stats-card trophy-highlights-card" aria-labelledby="trophy-highlights-heading">
          <div class="trophy-stats-card-heading">
            <div>
              <p class="eyebrow">Highlights</p>
              <h2 id="trophy-highlights-heading">Current Import</h2>
            </div>
          </div>
          ${renderHighlight("Rarest Earned", value?.rarestEarned)}
          ${renderHighlight("Latest Earned", value?.latestEarned)}
        </section>
      </div>
      <p class="trophy-coverage-note">Stats reflect ${formatNumber(gameCount)} synced ${gameCount === 1 ? "game" : "games"} from your PSN trophy library.</p>
    `;
    if (updated) updated.textContent = value?.updatedAt
      ? `Updated ${formatDate(value.updatedAt)}`
      : "Waiting for the first successful sync";
  }

  function renderError(error) {
    if (!content) return;
    content.setAttribute("aria-busy", "false");
    content.innerHTML = `
      <div class="trophy-stats-error" role="alert">
        <strong>Trophy stats could not be loaded.</strong>
        <span>${escapeHtml(error?.message || "Unknown error.")}</span>
        <button class="action-button" type="button" data-trophy-stats-retry>Try Again</button>
      </div>
    `;
    if (updated) updated.textContent = "PSN data is temporarily unavailable";
  }

  return { load, renderPage };
}

function renderStat(label, value) {
  return `<article class="trophy-stat-card"><strong>${formatNumber(value)}</strong><span>${escapeHtml(label)}</span></article>`;
}

function renderTypeRow(type, value, total) {
  const count = Number(value || 0);
  const width = Math.max(count > 0 ? 3 : 0, Math.round((count / total) * 100));
  return `
    <div class="trophy-type-row trophy-type-row--${type}">
      <span class="trophy-type-medal" aria-hidden="true"></span>
      <strong>${escapeHtml(capitalize(type))}</strong>
      <span class="trophy-type-track"><span style="width:${width}%"></span></span>
      <b>${formatNumber(count)}</b>
    </div>
  `;
}

function renderHighlight(label, trophy) {
  if (!trophy) return `<article class="trophy-highlight"><span>${escapeHtml(label)}</span><p>No earned trophy is available yet.</p></article>`;
  const details = [
    trophy.type ? capitalize(trophy.type) : "",
    trophy.earnedRate === null || trophy.earnedRate === undefined ? "" : `${Number(trophy.earnedRate).toFixed(1)}% earned`,
    trophy.earnedAt ? formatDate(trophy.earnedAt) : "",
  ].filter(Boolean).join(" · ");
  return `
    <article class="trophy-highlight">
      ${trophy.iconUrl ? `<img src="${escapeAttribute(trophy.iconUrl)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">` : `<span class="trophy-highlight-placeholder" aria-hidden="true">★</span>`}
      <div>
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(trophy.name || "Unknown trophy")}</strong>
        <p>${escapeHtml(trophy.gameName || "Unknown game")}</p>
        ${details ? `<small>${escapeHtml(details)}</small>` : ""}
      </div>
    </article>
  `;
}

function formatNumber(value) {
  return new Intl.NumberFormat().format(Number(value || 0));
}

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown date" : date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

function capitalize(value) {
  const text = String(value || "");
  return text ? `${text[0].toUpperCase()}${text.slice(1)}` : "";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}
