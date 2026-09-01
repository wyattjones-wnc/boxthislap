const DEFAULT_FILTERS = { status: "", search: "", manufacturer: "", year: "", scale: "", category: "", sort: "source", scope: "active", page: 1 };
const CATEGORY_ART_SOURCE = "https://www.brianzpatton.com/New%20Site%201-2026.jpg";
const CATEGORY_ART = {
  bigfoot: [1204, 1663, 205, 55], brekina: [1193, 1962, 231, 82], majorette: [887, 886, 262, 47], monstertruck2pack: [670, 1636, 164, 97],
  spinmaster: [157, 72, 174, 174], hotwheels: [74, 310, 344, 111], greenlight: [142, 542, 184, 121], matchbox: [367, 730, 201, 50],
  galoob: [661, 720, 171, 60], johnnylightning: [931, 698, 153, 95], racingchampions: [100, 872, 159, 74], tonka: [1186, 726, 229, 65],
  monstermashers: [1090, 563, 289, 83], monstermachines: [1146, 82, 212, 105], musclemachines: [59, 689, 245, 120], adventureforce: [649, 1024, 198, 85],
  maisto: [107, 1190, 162, 70], funrise: [680, 1485, 136, 99], ertl: [929, 1047, 185, 43], hotwheelsmonstertrucks: [74, 310, 344, 111],
  tradingcards: [690, 2722, 113, 119], pufftrucks: [1223, 2577, 147, 103], prototypes: [95, 2901, 178, 102], errors: [368, 2902, 209, 85],
};

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
  const viewSelect = document.querySelector("#collectibles-view-select");
  const state = { filters: { ...DEFAULT_FILTERS }, options: null, loadPromise: null, directEntries: false, requestId: 0 };
  if (!root) return { renderPage: () => Promise.resolve() };

  form?.addEventListener("submit", (event) => { event.preventDefault(); state.directEntries = false; state.filters.page = 1; readForm(); syncUrl(); void load(); });
  form?.addEventListener("change", (event) => { state.directEntries = false; state.filters.page = event.target.name === "page" ? Number(event.target.value) || 1 : 1; readForm(); syncUrl(); void load(); });
  root.querySelector("[data-collectibles-clear]")?.addEventListener("click", () => { state.filters = { ...DEFAULT_FILTERS }; state.directEntries = false; writeForm(); syncUrl(); void load(); });
  filterToggle?.addEventListener("click", () => {
    const open = form.hasAttribute("hidden");
    form.toggleAttribute("hidden", !open);
    filterToggle.setAttribute("aria-expanded", String(open));
    filterToggle.setAttribute("aria-label", `${open ? "Hide" : "Show"} collectible filters`);
  });
  viewSelect?.addEventListener("change", () => {
    const view = viewSelect.value;
    state.filters.status = view === "owned" ? "owned" : view === "missing" ? "not_owned" : view === "wishlist" ? "wanted" : "";
    state.filters.scope = view === "catalog" ? "all" : "active";
    state.filters.category = "";
    state.filters.year = "";
    state.directEntries = false;
    state.filters.page = 1;
    writeForm(); syncUrl(true); void load();
  });
  grid?.addEventListener("click", (event) => {
    const groupExclusion = event.target.closest("[data-group-exclusion-type]");
    if (groupExclusion) { void toggleGroupExclusion(groupExclusion); return; }
    const itemExclusion = event.target.closest("[data-card-exclusion]");
    if (itemExclusion) { void toggleCardExclusion(itemExclusion); return; }
    const group = event.target.closest("[data-collectible-group]");
    if (group) { openGroup(group.dataset.groupType, group.dataset.collectibleGroup); return; }
    if (event.target.closest("[data-collectibles-all-entries]")) { state.directEntries = true; state.filters.page = 1; syncUrl(true); void load(); return; }
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
    writeForm(); syncUrl(true); void load();
  });
  pagination?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-collectibles-page]");
    if (!button) return;
    state.filters.page = Number(button.dataset.collectiblesPage) || 1;
    syncUrl(); void load(); root.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  window.addEventListener("popstate", () => {
    if (window.location.hash !== "#collectibles") return;
    state.filters = { ...DEFAULT_FILTERS, ...filtersFromUrl() };
    state.directEntries = false;
    writeForm(); void load();
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
    writeForm();
  }

  async function load() {
    const requestId = ++state.requestId;
    grid.innerHTML = loading("Loading collectibles...");
    stats.innerHTML = loading("Loading collection progress...");
    updateViewButtons();
    const query = buildQuery();
    try {
      let groupBy = !state.filters.category ? "category" : !state.filters.year && !state.directEntries ? "year" : "";
      let [catalog, progress] = await Promise.all([request(groupBy ? `/api/collectibles/groups?groupBy=${groupBy}&${query}` : `/api/collectibles?${query}`), request(`/api/collectibles/stats?${query}`)]);
      if (requestId !== state.requestId) return;
      if (groupBy === "year" && !(catalog.groups || []).length) {
        state.directEntries = true;
        groupBy = "";
        catalog = await request(`/api/collectibles?${query}`);
      }
      renderStats(progress);
      renderBreadcrumbs();
      if (groupBy) { renderGroups(catalog.groups || [], groupBy); pagination.innerHTML = ""; renderPageSelect(1, 1, false); }
      else { renderCards(catalog.items || []); renderPagination(catalog.pagination || {}); }
    } catch (error) {
      if (requestId !== state.requestId) return;
      grid.innerHTML = `<p class="table-message">${escapeHtml(error.message)}</p>`;
      stats.innerHTML = "";
      resultCount.textContent = "Unable to load catalog";
    }
  }

  function renderGroups(groups, groupBy) {
    grid.classList.add("is-grouped");
    resultCount.textContent = `${formatNumber(groups.length)} ${groupBy === "category" ? "categories" : "years"}`;
    if (!groups.length) { grid.innerHTML = `<p class="table-message">No ${groupBy === "category" ? "categories" : "years"} match these filters.</p>`; return; }
    const allEntries = groupBy === "year" ? `<article class="collectible-group-card collectible-group-card-all"><button class="collectible-group-open" type="button" data-collectibles-all-entries><span class="collectible-group-image" aria-hidden="true">•••</span><span class="collectible-group-copy"><h2>View all entries</h2><p>Include entries without year data</p></span></button></article>` : "";
    grid.innerHTML = allEntries + groups.map((group) => {
      const displayLabel = groupBy === "category" ? prettyCategoryName(group.label) : group.label;
      const progress = group.total ? Math.round((group.owned / group.total) * 100) : 0;
      const explicitlyExcluded = Boolean(group.exclusionId);
      const referenceOnly = group.checklistMode !== "normal" && !explicitlyExcluded;
      const exclusionLabel = explicitlyExcluded ? (groupBy === "category" ? "Restore vertical" : "Restore year") : referenceOnly ? (group.checklistMode === "optional" ? "Optional reference" : "Reference only") : (groupBy === "category" ? "Exclude vertical" : "Exclude year");
      const exclusionType = groupBy === "category" ? "catalog_category" : "catalog_category_year";
      const exclusionValue = groupBy === "category" ? group.key : `${state.filters.category}:${group.key}`;
      return `<article class="collectible-group-card${group.excluded === group.total && group.total ? " is-excluded" : ""}">
        <button class="collectible-group-open" type="button" data-collectible-group="${escapeHtml(group.key)}" data-group-type="${escapeHtml(groupBy)}">
          ${groupArtwork(group, groupBy)}
          <span class="collectible-group-copy"><h2>${escapeHtml(displayLabel)}</h2><p><strong>${formatNumber(group.owned)}</strong> have · ${formatNumber(group.total)} total</p><span class="collectible-group-progress" aria-label="${progress}% complete"><i style="width:${progress}%"></i></span></span>
        </button>
        <button class="collectible-group-exclusion" type="button" data-group-exclusion-type="${exclusionType}" data-group-exclusion-value="${escapeHtml(exclusionValue)}" data-group-label="${escapeHtml(displayLabel)}"${group.exclusionId ? ` data-exclusion-id="${group.exclusionId}"` : ""}${referenceOnly ? " disabled" : ""} aria-label="${escapeHtml(exclusionLabel)}: ${escapeHtml(displayLabel)}" title="${escapeHtml(exclusionLabel)}"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M3 3l18 18M10.6 10.7a2 2 0 0 0 2.7 2.7M9.9 4.2A10.7 10.7 0 0 1 12 4c5.5 0 9 5.5 9 5.5a16 16 0 0 1-2.1 2.7M6.2 6.2C4.2 7.5 3 9.5 3 9.5S6.5 15 12 15c1 0 2-.2 2.8-.5"></path></svg></button>
      </article>`;
    }).join("");
  }

  function renderBreadcrumbs() {
    const category = state.options?.categories?.find((entry) => entry.slug === state.filters.category);
    const parts = [`<button type="button" data-collectibles-level="categories">Categories</button>`];
    if (category) parts.push(`<span aria-hidden="true">›</span><button type="button" data-collectibles-level="years">${escapeHtml(prettyCategoryName(category.name))}</button>`);
    if (state.filters.year) parts.push(`<span aria-hidden="true">›</span><strong>${escapeHtml(state.filters.year)}</strong>`);
    else if (category && state.directEntries) parts.push(`<span aria-hidden="true">›</span><strong>All entries</strong>`);
    breadcrumbs.innerHTML = parts.join("");
  }

  function openGroup(type, key) {
    if (type === "category") { state.filters.category = key; state.filters.year = ""; state.directEntries = false; }
    if (type === "year") { state.filters.year = key; state.directEntries = false; }
    state.filters.page = 1;
    writeForm(); syncUrl(true); void load(); root.scrollIntoView({ behavior: "smooth", block: "start" });
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
    renderPageSelect(page, pages, true);
    resultCount.textContent = `${formatNumber(value.total || 0)} collectible${Number(value.total) === 1 ? "" : "s"}`;
    pagination.innerHTML = pages <= 1 ? "" : `<button type="button" data-collectibles-page="${page - 1}" ${page <= 1 ? "disabled" : ""}>Previous</button><span>Page ${page} of ${pages}</span><button type="button" data-collectibles-page="${page + 1}" ${page >= pages ? "disabled" : ""}>Next</button>`;
  }

  async function quickToggle(id, desiredOwned, button) {
    button.disabled = true;
    try {
      await mutate(`/api/collection/${encodeURIComponent(id)}`, { status: desiredOwned ? "owned" : "not_owned" });
      const card = button.closest("[data-collectible-id]");
      const name = card?.querySelector("h2")?.textContent?.trim() || "collectible";
      const toggleLabel = desiredOwned ? `Mark ${name} as don't have` : `Mark ${name} as have`;
      card?.classList.toggle("is-owned", desiredOwned);
      button.classList.toggle("is-owned", desiredOwned);
      button.dataset.owned = String(desiredOwned);
      button.setAttribute("aria-pressed", String(desiredOwned));
      button.setAttribute("aria-label", toggleLabel);
      button.setAttribute("title", toggleLabel);
      button.disabled = false;
      request(`/api/collectibles/stats?${buildQuery()}`).then(renderStats).catch(() => {});
    }
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
    const statusMessage = formElement.querySelector("[role=status]"); const submit = formElement.querySelector("button[type=submit]"); submit.disabled = true; statusMessage.textContent = "Saving...";
    const data = new FormData(formElement);
    try {
      const id = formElement.dataset.id;
      const owned = data.get("status") === "owned";
      await mutate(`/api/collection/${encodeURIComponent(id)}`, { status: data.get("status"), quantity: Number(data.get("quantity") || 0), wanted: data.get("wanted") === "on", acquiredAt: data.get("acquiredAt") || null, notes: data.get("notes") || null });
      const card = grid.querySelector(`[data-collectible-id="${CSS.escape(id)}"]`);
      const toggle = card?.querySelector("[data-collectible-toggle]");
      card?.classList.toggle("is-owned", owned);
      toggle?.classList.toggle("is-owned", owned);
      if (toggle) { toggle.dataset.owned = String(owned); toggle.setAttribute("aria-pressed", String(owned)); }
      dialog.close();
      request(`/api/collectibles/stats?${buildQuery()}`).then(renderStats).catch(() => {});
    }
    catch (error) { statusMessage.textContent = error.message; }
    finally { submit.disabled = false; }
  }

  async function toggleExclusion(button) {
    const id = button.dataset.collectibleExclusion;
    const exclusionId = Number(button.dataset.exclusionId || 0);
    button.disabled = true;
    try {
      if (exclusionId) await authenticatedRequest(`/api/collection/exclusions/${exclusionId}`, { method: "DELETE" });
      else await authenticatedRequest("/api/collection/exclusions", { method: "POST", body: { type: "collectible", value: id, note: "Excluded from collectible detail." } });
      dialog.close();
      if ((!exclusionId && state.filters.scope === "active") || (exclusionId && state.filters.scope === "excluded")) grid.querySelector(`[data-collectible-id="${CSS.escape(id)}"]`)?.remove();
      request(`/api/collectibles/stats?${buildQuery()}`).then(renderStats).catch(() => {});
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
      let nextExclusionId = 0;
      if (exclusionId) await authenticatedRequest(`/api/collection/exclusions/${exclusionId}`, { method: "DELETE" });
      else {
        const result = await authenticatedRequest("/api/collection/exclusions", { method: "POST", body: { type, value, note: `Excluded from ${type === "catalog_category_year" ? "category year" : "category"} browser.` } });
        nextExclusionId = Number(result.exclusion?.id || 0);
      }
      const label = button.dataset.groupLabel || "group";
      const action = nextExclusionId ? (type === "catalog_category" ? "Restore vertical" : "Restore year") : (type === "catalog_category" ? "Exclude vertical" : "Exclude year");
      button.closest(".collectible-group-card")?.classList.toggle("is-excluded", Boolean(nextExclusionId));
      if (nextExclusionId) button.dataset.exclusionId = String(nextExclusionId); else delete button.dataset.exclusionId;
      button.setAttribute("aria-label", `${action}: ${label}`);
      button.setAttribute("title", action);
      button.disabled = false;
      if ((nextExclusionId && state.filters.scope === "active") || (!nextExclusionId && state.filters.scope === "excluded")) button.closest(".collectible-group-card")?.remove();
      request(`/api/collectibles/stats?${buildQuery()}`).then(renderStats).catch(() => {});
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
      let nextExclusionId = 0;
      if (exclusionId) await authenticatedRequest(`/api/collection/exclusions/${exclusionId}`, { method: "DELETE" });
      else {
        const result = await authenticatedRequest("/api/collection/exclusions", { method: "POST", body: { type: "collectible", value: id, note: "Excluded from collectible card." } });
        nextExclusionId = Number(result.exclusion?.id || 0);
      }
      const card = button.closest(".collectible-card");
      card?.classList.toggle("is-excluded", Boolean(nextExclusionId));
      if (nextExclusionId) button.dataset.exclusionId = String(nextExclusionId); else delete button.dataset.exclusionId;
      button.textContent = nextExclusionId ? "Restore item" : "Exclude item";
      button.disabled = false;
      if ((nextExclusionId && state.filters.scope === "active") || (!nextExclusionId && state.filters.scope === "excluded")) card?.remove();
      request(`/api/collectibles/stats?${buildQuery()}`).then(renderStats).catch(() => {});
    } catch (error) {
      button.disabled = false;
      window.alert(error.message);
    }
  }

  function metadata(item) { return `<dl class="collectible-metadata">${[["Product line", item.productLine?.name], ["Category", item.releaseCategory], ["Series", item.releaseSeries], ["Mix", item.mix]].filter(([, value]) => value).map(([label, value]) => `<div><dt>${label}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl>`; }
  function fillSelect(name, values, label) { const select = form?.elements.namedItem(name); if (!select) return; select.innerHTML = `<option value="">${label}</option>${(values || []).map((entry) => { const value = typeof entry === "object" ? entry.slug : entry; const text = typeof entry === "object" ? entry.name : entry; return `<option value="${escapeHtml(value)}">${escapeHtml(text)}</option>`; }).join("")}`; }
  function exclusionAction(item) {
    const exclusionId = item.exclusion?.itemExclusionId;
    if (item.exclusion?.excluded && !exclusionId) return `<div class="collectible-exclusion-action"><button class="footer-copy-link" type="button" disabled>Excluded at a higher level</button></div>`;
    return `<div class="collectible-exclusion-action"><button class="footer-copy-link" type="button" data-collectible-exclusion="${escapeHtml(item.id)}"${exclusionId ? ` data-exclusion-id="${exclusionId}"` : ""}>${exclusionId ? "Include in checklist" : "Exclude from checklist"}</button></div>`;
  }
  function readForm() { const data = new FormData(form); for (const key of ["status", "search", "manufacturer", "year", "scale", "category", "sort", "scope"]) state.filters[key] = String(data.get(key) || ""); }
  function writeForm() { if (!form) return; for (const [key, value] of Object.entries(state.filters)) { const input = form.elements.namedItem(key); if (!input) continue; if (input.type === "checkbox") input.checked = Boolean(value); else input.value = String(value ?? ""); } updateViewButtons(); }
  function updateViewButtons() { if (!viewSelect) return; viewSelect.value = state.filters.scope === "all" ? "catalog" : state.filters.status === "owned" ? "owned" : state.filters.status === "not_owned" ? "missing" : state.filters.status === "wanted" ? "wishlist" : "collection"; }
  function buildQuery() { const params = new URLSearchParams(); for (const [key, value] of Object.entries(state.filters)) { if (value && key !== "page") params.set(key, String(value)); } params.set("page", String(state.filters.page)); params.set("limit", "48"); return params.toString(); }
  function filtersFromUrl() { const params = new URLSearchParams(window.location.search); const value = {}; for (const key of Object.keys(DEFAULT_FILTERS)) { if (!params.has(key)) continue; value[key] = key === "page" ? Number(params.get(key)) || 1 : params.get(key); } if (params.get("includeExcluded") === "true" && !params.has("scope")) value.scope = "all"; return value; }
  function syncUrl(push = false) { const url = new URL(window.location.href); for (const key of [...Object.keys(DEFAULT_FILTERS), "series"]) url.searchParams.delete(key); for (const [key, value] of Object.entries(state.filters)) if (value && !(key === "page" && value === 1)) url.searchParams.set(key, String(value)); window.history[push ? "pushState" : "replaceState"](null, "", `${url.pathname}${url.search}#collectibles`); }
  function renderPageSelect(page, pages, enabled) {
    const select = form?.elements.namedItem("page");
    if (!select) return;
    select.disabled = !enabled || pages <= 1;
    select.innerHTML = Array.from({ length: pages }, (_, index) => `<option value="${index + 1}">Page ${index + 1}</option>`).join("");
    select.value = String(Math.min(Math.max(1, page), pages));
  }
  async function mutate(path, body) { return authenticatedRequest(path, { method: "PATCH", body }); }
  async function authenticatedRequest(path, options = {}) { const token = await getAccessToken(); const body = options.body === undefined ? undefined : JSON.stringify(options.body); return request(path, { ...options, headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}), ...(options.headers || {}) }, body }); }
  async function request(path, options = {}) { const response = await fetch(`${String(endpoint).replace(/\/$/, "")}${path}`, { signal: options.signal || AbortSignal.timeout(15000), headers: { Accept: "application/json", ...(options.headers || {}) }, ...options }); const value = await response.json().catch(() => null); if (!response.ok || !value?.ok) throw new Error(value?.error || `Collectibles request failed (${response.status}).`); return value; }
  return { renderPage };
}

function loading(label) { return `<p class="table-message"><span class="loading-spinner"></span>${escapeHtml(label)}</p>`; }
function formatNumber(value) { return Number(value || 0).toLocaleString("en-US"); }
function prettyCategoryName(value) {
  const text = String(value || "");
  const known = { GreenLight: "GreenLight", Bigfoot: "Bigfoot", ADC: "ADC" };
  return known[text] || text.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/([A-Za-z])(\d)/g, "$1 $2").replace(/(\d)([A-Za-z])/g, "$1 $2");
}
function groupArtwork(group, groupBy) {
  const art = groupBy === "category" ? CATEGORY_ART[String(group.key || "").replace(/[^a-z0-9]/gi, "").toLowerCase()] : null;
  if (art) {
    const [x, y, width, height] = art;
    const scale = Math.max(48 / width, 48 / height);
    const left = -x * scale + (48 - width * scale) / 2;
    const top = -y * scale + (48 - height * scale) / 2;
    return `<span class="collectible-group-image collectible-group-logo"><img src="${CATEGORY_ART_SOURCE}" alt="" loading="lazy" decoding="async" style="width:${1471 * scale}px;height:${4200 * scale}px;left:${left}px;top:${top}px"></span>`;
  }

  return `<span class="collectible-group-image">${group.image ? `<img src="${escapeHtml(group.image)}" alt="" loading="lazy" decoding="async">` : "🏁"}</span>`;
}
function escapeHtml(value) { return String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]); }
