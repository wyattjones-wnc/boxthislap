const DEFAULT_FILTERS = { status: "", search: "", manufacturer: "", year: "", scale: "", category: "", series: "", sort: "source", scope: "active", page: 1 };

export function createCollectiblesController({ endpoint, getAccessToken }) {
  const root = document.querySelector("#collectibles");
  const form = document.querySelector("#collectibles-filters");
  const grid = document.querySelector("#collectibles-grid");
  const stats = document.querySelector("#collectibles-stats");
  const resultCount = document.querySelector("#collectibles-result-count");
  const pagination = document.querySelector("#collectibles-pagination");
  const breadcrumbs = document.querySelector("#collectibles-breadcrumbs");
  const dialog = document.querySelector("#collectible-detail-dialog");
  const detail = document.querySelector("#collectible-detail-content");
  const filterToggle = document.querySelector("#collectibles-filter-toggle");
  const state = { filters: { ...DEFAULT_FILTERS }, options: null, loadPromise: null, directEntries: false };
  if (!root) return { renderPage: () => Promise.resolve() };

  form?.addEventListener("submit", (event) => { event.preventDefault(); state.directEntries = false; state.filters.page = 1; readForm(); syncUrl(); void load(); });
  form?.addEventListener("change", () => { state.directEntries = false; state.filters.page = 1; readForm(); syncUrl(); void load(); });
  root.querySelector("[data-collectibles-clear]")?.addEventListener("click", () => { state.filters = { ...DEFAULT_FILTERS }; state.directEntries = false; writeForm(); syncUrl(); void load(); });
  filterToggle?.addEventListener("click", () => {
    const open = form.hasAttribute("hidden");
    form.toggleAttribute("hidden", !open);
    filterToggle.setAttribute("aria-expanded", String(open));
    filterToggle.setAttribute("aria-label", `${open ? "Hide" : "Show"} collectible filters`);
  });
  root.querySelector("[data-collection-views]")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-collection-view]");
    if (!button) return;
    const view = button.dataset.collectionView;
    state.filters.status = view === "owned" ? "owned" : view === "missing" ? "not_owned" : view === "wishlist" ? "wanted" : "";
    state.filters.scope = view === "catalog" ? "all" : "active";
    state.filters.category = "";
    state.filters.year = "";
    state.directEntries = false;
    state.filters.page = 1;
    writeForm(); syncUrl(); void load();
  });
  grid?.addEventListener("click", (event) => {
    const groupExclusion = event.target.closest("[data-group-exclusion-type]");
    if (groupExclusion) { void toggleGroupExclusion(groupExclusion); return; }
    const itemExclusion = event.target.closest("[data-card-exclusion]");
    if (itemExclusion) { void toggleCardExclusion(itemExclusion); return; }
    const group = event.target.closest("[data-collectible-group]");
    if (group) { openGroup(group.dataset.groupType, group.dataset.collectibleGroup); return; }
    if (event.target.closest("[data-collectibles-all-entries]")) { state.directEntries = true; state.filters.page = 1; void load(); return; }
    const toggle = event.target.closest("[data-collectible-toggle]");
    if (toggle) { void quickToggle(toggle.dataset.collectibleToggle, toggle.dataset.owned !== "true", toggle); return; }
    const card = event.target.closest("[data-collectible-id]");
    if (card) void openDetail(card.dataset.collectibleId);
  });
  breadcrumbs?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-collectibles-level]");
    if (!button) return;
    if (button.dataset.collectiblesLevel === "categories") { state.filters.category = ""; state.filters.year = ""; }
    if (button.dataset.collectiblesLevel === "years") state.filters.year = "";
    state.directEntries = false;
    state.filters.page = 1;
    writeForm(); syncUrl(); void load();
  });
  pagination?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-collectibles-page]");
    if (!button) return;
    state.filters.page = Number(button.dataset.collectiblesPage) || 1;
    syncUrl(); void load(); root.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  dialog?.querySelector("[data-collectible-close]")?.addEventListener("click", () => dialog.close());
  dialog?.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
  detail?.addEventListener("submit", (event) => { if (event.target.matches("[data-collectible-form]")) { event.preventDefault(); void saveDetail(event.target); } });
  detail?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-collectible-exclusion]");
    if (button) void toggleExclusion(button);
  });

  async function renderPage() {
    state.filters = { ...DEFAULT_FILTERS, ...filtersFromUrl() };
    form?.setAttribute("hidden", "");
    filterToggle?.setAttribute("aria-expanded", "false");
    filterToggle?.setAttribute("aria-label", "Show collectible filters");
    writeForm();
    if (!state.options) await loadOptions();
    return load();
  }

  async function loadOptions() {
    const value = await request("/api/collectibles/filters");
    state.options = value;
    fillSelect("manufacturer", value.manufacturers, "All manufacturers");
    fillSelect("year", (value.years || []).map((year) => ({ slug: String(year), name: String(year) })), "All years");
    fillSelect("scale", value.scales, "All scales");
    fillSelect("category", value.categories, "All catalog categories");
    fillSelect("series", value.series, "All series");
    writeForm();
  }

  async function load() {
    grid.innerHTML = loading("Loading collectibles...");
    stats.innerHTML = loading("Loading collection progress...");
    updateViewButtons();
    const query = buildQuery();
    try {
      let groupBy = !state.filters.category ? "category" : !state.filters.year && !state.directEntries ? "year" : "";
      let [catalog, progress] = await Promise.all([request(groupBy ? `/api/collectibles/groups?groupBy=${groupBy}&${query}` : `/api/collectibles?${query}`), request(`/api/collectibles/stats?${query}`)]);
      if (groupBy === "year" && !(catalog.groups || []).length) {
        state.directEntries = true;
        groupBy = "";
        catalog = await request(`/api/collectibles?${query}`);
      }
      renderStats(progress);
      renderBreadcrumbs();
      if (groupBy) { renderGroups(catalog.groups || [], groupBy); pagination.innerHTML = ""; }
      else { renderCards(catalog.items || []); renderPagination(catalog.pagination || {}); }
    } catch (error) {
      grid.innerHTML = `<p class="table-message">${escapeHtml(error.message)}</p>`;
      stats.innerHTML = "";
      resultCount.textContent = "Unable to load catalog";
    }
  }

  function renderGroups(groups, groupBy) {
    grid.classList.add("is-grouped");
    resultCount.textContent = `${formatNumber(groups.length)} ${groupBy === "category" ? "categories" : "years"}`;
    if (!groups.length) { grid.innerHTML = `<p class="table-message">No ${groupBy === "category" ? "categories" : "years"} match these filters.</p>`; return; }
    const allEntries = groupBy === "year" ? `<article class="collectible-group-card collectible-group-card-all"><button class="collectible-group-open" type="button" data-collectibles-all-entries><span class="eyebrow">Category</span><h2>View all entries</h2><p>Include entries without year data</p></button></article>` : "";
    grid.innerHTML = allEntries + groups.map((group) => {
      const progress = group.total ? Math.round((group.owned / group.total) * 100) : 0;
      const explicitlyExcluded = Boolean(group.exclusionId);
      const referenceOnly = group.checklistMode !== "normal" && !explicitlyExcluded;
      const exclusionLabel = explicitlyExcluded ? (groupBy === "category" ? "Restore vertical" : "Restore year") : referenceOnly ? (group.checklistMode === "optional" ? "Optional reference" : "Reference only") : (groupBy === "category" ? "Exclude vertical" : "Exclude year");
      const exclusionType = groupBy === "category" ? "catalog_category" : "catalog_category_year";
      const exclusionValue = groupBy === "category" ? group.key : `${state.filters.category}:${group.key}`;
      return `<article class="collectible-group-card${group.excluded === group.total && group.total ? " is-excluded" : ""}">
        <button class="collectible-group-open" type="button" data-collectible-group="${escapeHtml(group.key)}" data-group-type="${escapeHtml(groupBy)}">
          <span class="eyebrow">${groupBy === "category" ? escapeHtml(group.type === "reference" ? "Reference" : "Category") : "Year"}</span>
          <h2>${escapeHtml(group.label)}</h2>
          <p><strong>${formatNumber(group.owned)}</strong> have · ${formatNumber(group.total)} total</p>
          <div class="collectible-group-progress" aria-label="${progress}% complete"><i style="width:${progress}%"></i></div>
        </button>
        <button class="collectible-group-exclusion" type="button" data-group-exclusion-type="${exclusionType}" data-group-exclusion-value="${escapeHtml(exclusionValue)}"${group.exclusionId ? ` data-exclusion-id="${group.exclusionId}"` : ""}${referenceOnly ? " disabled" : ""} aria-label="${escapeHtml(exclusionLabel)}: ${escapeHtml(group.label)}" title="${escapeHtml(exclusionLabel)}">${escapeHtml(exclusionLabel)}</button>
      </article>`;
    }).join("");
  }

  function renderBreadcrumbs() {
    const category = state.options?.categories?.find((entry) => entry.slug === state.filters.category);
    const parts = [`<button type="button" data-collectibles-level="categories">Categories</button>`];
    if (category) parts.push(`<span aria-hidden="true">›</span><button type="button" data-collectibles-level="years">${escapeHtml(category.name)}</button>`);
    if (state.filters.year) parts.push(`<span aria-hidden="true">›</span><strong>${escapeHtml(state.filters.year)}</strong>`);
    else if (category && state.directEntries) parts.push(`<span aria-hidden="true">›</span><strong>All entries</strong>`);
    breadcrumbs.innerHTML = parts.join("");
  }

  function openGroup(type, key) {
    if (type === "category") { state.filters.category = key; state.filters.year = ""; state.directEntries = false; }
    if (type === "year") { state.filters.year = key; state.directEntries = false; }
    state.filters.page = 1;
    writeForm(); syncUrl(); void load(); root.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderStats(value) {
    stats.innerHTML = `
      <article><strong>${formatNumber(value.owned)}</strong><span>Have</span></article>
      <article><strong>${formatNumber(value.missing)}</strong><span>Missing</span></article>
      <article><strong>${formatNumber(value.wanted)}</strong><span>Wanted</span></article>
      <article class="collectibles-progress-stat"><strong>${escapeHtml(value.completionPercent)}%</strong><span>${formatNumber(value.owned)} of ${formatNumber(value.total)}</span><div><i style="width:${Math.max(0, Math.min(100, Number(value.completionPercent) || 0))}%"></i></div></article>`;
  }

  function renderCards(items) {
    grid.classList.remove("is-grouped");
    resultCount.textContent = `${formatNumber(items.length)} shown`;
    if (!items.length) { grid.innerHTML = `<p class="table-message">No collectibles match these filters.</p>`; return; }
    grid.innerHTML = items.map((item) => {
      const owned = item.collection?.status === "owned";
      const excluded = item.exclusion?.excluded;
      const itemExclusionId = item.exclusion?.itemExclusionId;
      const toggleLabel = owned ? `Mark ${item.name} as don't have` : `Mark ${item.name} as have`;
      const exclusionLabel = itemExclusionId ? "Restore item" : excluded ? "Excluded at higher level" : "Exclude item";
      return `<article class="collectible-card${owned ? " is-owned" : ""}${excluded ? " is-excluded" : ""}" data-collectible-id="${escapeHtml(item.id)}" tabindex="0">
        <div class="collectible-card-image">${item.image ? `<img src="${escapeHtml(item.image)}" alt="" loading="lazy" decoding="async">` : `<span aria-hidden="true">🏁</span>`}<button class="collectible-check-button${owned ? " is-owned" : ""}" type="button" data-collectible-toggle="${escapeHtml(item.id)}" data-owned="${owned}" aria-pressed="${owned}" aria-label="${escapeHtml(toggleLabel)}" title="${escapeHtml(toggleLabel)}"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="m5 12 4 4 10-10"></path></svg></button>${item.collection?.wanted ? `<b>Wanted</b>` : ""}</div>
        <div class="collectible-card-body"><p>${escapeHtml([item.manufacturer?.name, item.year, item.scale].filter(Boolean).join(" • "))}</p><h2>${escapeHtml(item.name)}</h2>${item.itemNumber ? `<span>#${escapeHtml(item.itemNumber)}</span>` : ""}
          ${excluded ? `<span>Excluded from checklist</span>` : ""}
          <button class="collectible-card-exclusion" type="button" data-card-exclusion="${escapeHtml(item.id)}"${itemExclusionId ? ` data-exclusion-id="${itemExclusionId}"` : ""}${excluded && !itemExclusionId ? " disabled" : ""}>${escapeHtml(exclusionLabel)}</button>
        </div></article>`;
    }).join("");
  }

  function renderPagination(value) {
    const page = Number(value.page || 1); const pages = Number(value.pages || 1);
    resultCount.textContent = `${formatNumber(value.total || 0)} collectible${Number(value.total) === 1 ? "" : "s"}`;
    pagination.innerHTML = pages <= 1 ? "" : `<button type="button" data-collectibles-page="${page - 1}" ${page <= 1 ? "disabled" : ""}>Previous</button><span>Page ${page} of ${pages}</span><button type="button" data-collectibles-page="${page + 1}" ${page >= pages ? "disabled" : ""}>Next</button>`;
  }

  async function quickToggle(id, owned, button) {
    button.disabled = true;
    try { await mutate(`/api/collection/${encodeURIComponent(id)}`, { status: owned ? "owned" : "not_owned" }); await load(); }
    catch (error) { button.disabled = false; window.alert(error.message); }
  }

  async function openDetail(id) {
    dialog.showModal(); detail.innerHTML = loading("Loading collectible details...");
    try {
      const { collectible: item } = await request(`/api/collectibles/${encodeURIComponent(id)}`);
      const owned = item.collection?.status === "owned";
      detail.innerHTML = `<div class="collectible-detail-layout">
        <div class="collectible-detail-gallery">${(item.images?.length ? item.images : item.image ? [{ sourceUrl: item.image }] : []).map((image) => `<img src="${escapeHtml(image.localUrl || image.sourceUrl)}" alt="${escapeHtml(item.name)}" loading="lazy">`).join("") || `<span class="table-message">No image available.</span>`}</div>
        <div class="collectible-detail-copy"><p class="eyebrow">${escapeHtml([item.manufacturer?.name, item.year, item.scale].filter(Boolean).join(" • "))}</p><h2>${escapeHtml(item.name)}</h2>${item.itemNumber ? `<p>Item #${escapeHtml(item.itemNumber)}</p>` : ""}
          ${metadata(item)}
          ${item.variants?.length ? `<details><summary>Known variants (${item.variants.length})</summary><ul>${item.variants.map((variant) => `<li>${escapeHtml(variant.sourceName)}</li>`).join("")}</ul></details>` : ""}
          <form class="collectible-detail-form" data-collectible-form data-id="${escapeHtml(item.id)}">
            <label><span>Status</span><select name="status"><option value="not_owned" ${owned ? "" : "selected"}>Don't Have</option><option value="owned" ${owned ? "selected" : ""}>Have</option></select></label>
            <label><span>Quantity</span><input name="quantity" type="number" min="0" max="999" value="${escapeHtml(item.collection?.quantity || 0)}"></label>
            <label class="collectible-check"><input name="wanted" type="checkbox" ${item.collection?.wanted ? "checked" : ""}><span>Wanted</span></label>
            <label><span>Acquired</span><input name="acquiredAt" type="date" value="${escapeHtml(item.collection?.acquiredAt || "")}"></label>
            <label class="collectible-notes"><span>Notes</span><textarea name="notes" rows="4">${escapeHtml(item.collection?.notes || "")}</textarea></label>
            ${exclusionAction(item)}
            <p class="collectible-save-status" role="status"></p><button class="action-button" type="submit">Save collection details</button>
          </form>
          ${item.sourceUrl ? `<a class="back-link" href="${escapeHtml(item.sourceUrl)}" target="_blank" rel="noopener">View source at Brian Z. Patton</a>` : ""}
        </div></div>`;
    } catch (error) { detail.innerHTML = `<p class="table-message">${escapeHtml(error.message)}</p>`; }
  }

  async function saveDetail(formElement) {
    const status = formElement.querySelector("[role=status]"); const submit = formElement.querySelector("button[type=submit]"); submit.disabled = true; status.textContent = "Saving...";
    const data = new FormData(formElement);
    try { await mutate(`/api/collection/${encodeURIComponent(formElement.dataset.id)}`, { status: data.get("status"), quantity: Number(data.get("quantity") || 0), wanted: data.get("wanted") === "on", acquiredAt: data.get("acquiredAt") || null, notes: data.get("notes") || null }); status.textContent = "Saved."; await load(); }
    catch (error) { status.textContent = error.message; }
    finally { submit.disabled = false; }
  }

  async function toggleExclusion(button) {
    const id = button.dataset.collectibleExclusion;
    const exclusionId = Number(button.dataset.exclusionId || 0);
    button.disabled = true;
    try {
      if (exclusionId) await authenticatedRequest(`/api/collection/exclusions/${exclusionId}`, { method: "DELETE" });
      else await authenticatedRequest("/api/collection/exclusions", { method: "POST", body: { type: "collectible", value: id, note: "Excluded from collectible detail." } });
      await load();
      dialog.close();
      await openDetail(id);
    } catch (error) {
      button.disabled = false;
      window.alert(error.message);
    }
  }

  async function toggleGroupExclusion(button) {
    const type = button.dataset.groupExclusionType;
    const value = button.dataset.groupExclusionValue;
    const exclusionId = Number(button.dataset.exclusionId || 0);
    button.disabled = true;
    try {
      if (exclusionId) await authenticatedRequest(`/api/collection/exclusions/${exclusionId}`, { method: "DELETE" });
      else await authenticatedRequest("/api/collection/exclusions", { method: "POST", body: { type, value, note: `Excluded from ${type === "catalog_category_year" ? "category year" : "category"} browser.` } });
      await load();
    } catch (error) {
      button.disabled = false;
      window.alert(error.message);
    }
  }

  async function toggleCardExclusion(button) {
    const id = button.dataset.cardExclusion;
    const exclusionId = Number(button.dataset.exclusionId || 0);
    button.disabled = true;
    try {
      if (exclusionId) await authenticatedRequest(`/api/collection/exclusions/${exclusionId}`, { method: "DELETE" });
      else await authenticatedRequest("/api/collection/exclusions", { method: "POST", body: { type: "collectible", value: id, note: "Excluded from collectible card." } });
      await load();
    } catch (error) {
      button.disabled = false;
      window.alert(error.message);
    }
  }

  function metadata(item) { return `<dl class="collectible-metadata">${[["Product line", item.productLine?.name], ["Category", item.releaseCategory], ["Series", item.releaseSeries], ["Mix", item.mix]].filter(([, value]) => value).map(([label, value]) => `<div><dt>${label}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl>`; }
  function fillSelect(name, values, label) { const select = form?.elements.namedItem(name); if (!select) return; select.innerHTML = `<option value="">${label}</option>${(values || []).map((entry) => { const value = typeof entry === "object" ? entry.slug : entry; const text = typeof entry === "object" ? entry.name : entry; return `<option value="${escapeHtml(value)}">${escapeHtml(text)}</option>`; }).join("")}`; }
  function exclusionAction(item) {
    const exclusionId = item.exclusion?.itemExclusionId;
    if (item.exclusion?.excluded && !exclusionId) return `<div class="collectible-exclusion-action"><strong>Excluded by a catalog rule</strong><p>Use the visibility filter to find this item. Its broader category rule must be changed to include it.</p></div>`;
    return `<div class="collectible-exclusion-action"><strong>${exclusionId ? "Excluded from checklist" : "Checklist visibility"}</strong><p>${exclusionId ? "This item is hidden from the normal checklist but remains available under Excluded only." : "Hide this individual item from the normal checklist."}</p><button class="footer-copy-link" type="button" data-collectible-exclusion="${escapeHtml(item.id)}"${exclusionId ? ` data-exclusion-id="${exclusionId}"` : ""}>${exclusionId ? "Include in checklist" : "Exclude from checklist"}</button></div>`;
  }
  function readForm() { const data = new FormData(form); for (const key of ["status", "search", "manufacturer", "year", "scale", "category", "series", "sort", "scope"]) state.filters[key] = String(data.get(key) || ""); }
  function writeForm() { if (!form) return; for (const [key, value] of Object.entries(state.filters)) { const input = form.elements.namedItem(key); if (!input) continue; if (input.type === "checkbox") input.checked = Boolean(value); else input.value = String(value ?? ""); } updateViewButtons(); }
  function updateViewButtons() { root.querySelectorAll("[data-collection-view]").forEach((button) => { const view = button.dataset.collectionView; const active = view === "catalog" ? state.filters.scope === "all" : state.filters.scope === "active" && ((view === "collection" && !state.filters.status) || (view === "owned" && state.filters.status === "owned") || (view === "missing" && state.filters.status === "not_owned") || (view === "wishlist" && state.filters.status === "wanted")); button.classList.toggle("is-active", active); button.setAttribute("aria-pressed", String(active)); }); }
  function buildQuery() { const params = new URLSearchParams(); for (const [key, value] of Object.entries(state.filters)) { if (value && key !== "page") params.set(key, String(value)); } params.set("page", String(state.filters.page)); params.set("limit", "48"); return params.toString(); }
  function filtersFromUrl() { const params = new URLSearchParams(window.location.search); const value = {}; for (const key of Object.keys(DEFAULT_FILTERS)) { if (!params.has(key)) continue; value[key] = key === "page" ? Number(params.get(key)) || 1 : params.get(key); } if (params.get("includeExcluded") === "true" && !params.has("scope")) value.scope = "all"; return value; }
  function syncUrl() { const url = new URL(window.location.href); for (const key of Object.keys(DEFAULT_FILTERS)) url.searchParams.delete(key); for (const [key, value] of Object.entries(state.filters)) if (value && !(key === "page" && value === 1)) url.searchParams.set(key, String(value)); window.history.replaceState(null, "", `${url.pathname}${url.search}#collectibles`); }
  async function mutate(path, body) { return authenticatedRequest(path, { method: "PATCH", body }); }
  async function authenticatedRequest(path, options = {}) { const token = await getAccessToken(); const body = options.body === undefined ? undefined : JSON.stringify(options.body); return request(path, { ...options, headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}), ...(options.headers || {}) }, body }); }
  async function request(path, options = {}) { const response = await fetch(`${String(endpoint).replace(/\/$/, "")}${path}`, { headers: { Accept: "application/json", ...(options.headers || {}) }, ...options }); const value = await response.json().catch(() => null); if (!response.ok || !value?.ok) throw new Error(value?.error || `Collectibles request failed (${response.status}).`); return value; }
  return { renderPage };
}

function loading(label) { return `<p class="table-message"><span class="loading-spinner"></span>${escapeHtml(label)}</p>`; }
function formatNumber(value) { return Number(value || 0).toLocaleString("en-US"); }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]); }
