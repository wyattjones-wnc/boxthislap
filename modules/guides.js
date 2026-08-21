const GUIDE_STEP_BATCH_SIZE = 60;
const GUIDE_COMPLETION_CONFIRMATION_MS = 1000;

export function createGuidesController({ getManagerId, getIsAdmin, loadData, progressEndpoint }) {
  const view = document.querySelector("#guides-view");
  let guides = null;
  let checklist = null;
  let dataPromise = null;
  let progressPromise = null;
  let progressManagerId = "";
  let selectedGuideId = "";
  let shouldShowFilters = false;
  let shouldShowStats = false;
  let hideDone = true;
  let dividerFilter = "";
  let sectionFilter = "";
  let typeFilter = "";
  let visibleStepLimit = GUIDE_STEP_BATCH_SIZE;
  let stepObserver = null;
  const completedStepKeys = new Set();
  const pendingStepKeys = new Set();
  const confirmedStepKeys = new Set();
  const saveErrors = new Map();
  const expandedParentKeys = new Set();

  view?.addEventListener("click", handleClick);
  view?.addEventListener("change", handleChange);
  view?.addEventListener("keydown", handleKeydown);

  function renderPage() {
    if (!view) return;

    const routeGuideId = new URL(window.location.href).searchParams.get("guide") || "";
    if (routeGuideId !== selectedGuideId) {
      selectedGuideId = routeGuideId;
      resetGuideControls();
    }

    if (selectedGuideId) {
      renderGuideDetail();
    } else {
      renderGuideIndex();
    }
  }

  function isItemDone(item) {
    return completedStepKeys.has(getStepKey(item.guideId, item.stepId));
  }

  function getChildrenByParent(items) {
    const itemIds = new Set(items.map((item) => item.id));
    const childrenByParent = new Map();

    items.forEach((item) => {
      if (!item.parentId || !itemIds.has(item.parentId)) return;
      const children = childrenByParent.get(item.parentId) || [];
      children.push(item);
      childrenByParent.set(item.parentId, children);
    });

    return childrenByParent;
  }

  async function ensureDataLoaded() {
    if (guides && checklist) return { guides, steps: checklist };
    if (!dataPromise) {
      dataPromise = loadData()
        .then((snapshot) => {
          guides = (snapshot.guides || []).map(normalizeGuide).filter((guide) => guide.id && guide.name);
          const seenIds = new Set();
          const seenPairs = new Set();
          checklist = (snapshot.steps || []).map(normalizeChecklistItem).filter((item) => {
            const itemKey = `${item.guideId}::${item.id}`;
            const pairKey = getStepKey(item.guideId, item.stepId);
            if (!item.id || !item.guideId || !item.stepId || seenIds.has(itemKey) || seenPairs.has(pairKey)) return false;
            seenIds.add(itemKey);
            seenPairs.add(pairKey);
            return true;
          });
          return snapshot;
        })
        .catch((error) => {
          dataPromise = null;
          throw error;
        });
    }
    return dataPromise;
  }

  async function ensureProgressLoaded() {
    const managerId = String(getManagerId?.() || "").trim();
    if (!managerId) throw new Error("Sign in to load your guide progress.");

    if (progressManagerId !== managerId) {
      progressManagerId = managerId;
      progressPromise = null;
      completedStepKeys.clear();
      pendingStepKeys.clear();
      confirmedStepKeys.clear();
      saveErrors.clear();
    }

    if (!progressPromise) {
      progressPromise = requestGuideProgress(progressEndpoint, managerId)
        .then((rows) => {
          completedStepKeys.clear();
          rows.forEach((row) => completedStepKeys.add(getStepKey(row.guideId, row.stepId)));
          return rows;
        })
        .catch((error) => {
          progressPromise = null;
          throw error;
        });
    }

    return progressPromise;
  }

  function renderGuideIndex() {
    if (!guides) {
      view.innerHTML = renderIndexLoading();
      ensureDataLoaded().then(renderPage).catch((error) => renderError("guides", error));
      return;
    }

    const visibleGuides = guides.filter(canViewGuide);
    view.innerHTML = `
      <div class="section-heading page-heading-with-action footy-heading">
        <div>
          <p class="guides-eyebrow">Walkthroughs</p>
          <h1>Guides</h1>
          <p class="guides-intro">Pick a guide and keep your place as you work through it.</p>
        </div>
      </div>
      <div class="guides-grid">
        ${visibleGuides.length ? visibleGuides.map(renderGuideCard).join("") : `<p class="table-message">No guides are available yet.</p>`}
      </div>
    `;
  }

  function renderGuideDetail() {
    if (!guides) {
      view.innerHTML = renderDetailLoading();
      ensureDataLoaded().then(renderPage).catch((error) => renderError("guide", error));
      return;
    }

    const guide = guides.find((entry) => entry.id === selectedGuideId && canViewGuide(entry));
    if (!guide) {
      view.innerHTML = `
        <a class="guides-back-link" href="${escapeAttribute(getGuidesUrl())}" data-guides-back>&larr; All Guides</a>
        <div class="guides-empty-state"><h1>Guide not found</h1><p>This guide may have been removed or its ID may have changed.</p></div>
      `;
      return;
    }

    if (!checklist || !progressPromise || progressManagerId !== String(getManagerId?.() || "").trim()) {
      view.innerHTML = renderDetailLoading(guide.name);
      Promise.all([ensureDataLoaded(), ensureProgressLoaded()])
        .then(renderPage)
        .catch((error) => renderError("guide progress", error));
      return;
    }

    const allItems = checklist.filter((item) => item.guideId === guide.id);
    const childrenByParent = getChildrenByParent(allItems);
    const childIds = new Set([...childrenByParent.values()].flat().map((item) => item.id));
    const rootItems = allItems.filter((item) => !childIds.has(item.id));
    const completed = allItems.filter(isItemDone).length;
    const remaining = allItems.length - completed;
    const progress = allItems.length ? Math.round((completed / allItems.length) * 100) : 0;
    const filterOptions = getFilterOptions(allItems);
    const matchesFilters = (item) => {
      if (dividerFilter && item.divider !== dividerFilter) return false;
      if (sectionFilter && item.section !== sectionFilter) return false;
      if (typeFilter && item.type !== typeFilter) return false;
      return true;
    };
    const visibleItems = rootItems.filter((item) => {
      const children = childrenByParent.get(item.id) || [];
      if (!matchesFilters(item) && !children.some(matchesFilters)) return false;
      if (!hideDone) return true;
      return !isItemDone(item) || confirmedStepKeys.has(getStepKey(item.guideId, item.stepId)) || children.some((child) =>
        !isItemDone(child) || confirmedStepKeys.has(getStepKey(child.guideId, child.stepId))
      );
    });
    const renderedItems = visibleItems.slice(0, visibleStepLimit);

    view.innerHTML = `
      <a class="guides-back-link" href="${escapeAttribute(getGuidesUrl())}" data-guides-back>&larr; All Guides</a>
      <div class="section-heading page-heading-with-action footy-heading guides-detail-heading">
        <div>
          <p class="guides-eyebrow">Guide</p>
          <h1>${escapeHtml(guide.name)}</h1>
          ${renderGuideReferences(guide)}
        </div>
        <div class="heading-actions">
          <button class="icon-action-button guides-stats-toggle${shouldShowStats ? " is-active" : ""}" type="button" data-guides-stats aria-pressed="${shouldShowStats}" aria-label="${shouldShowStats ? "Hide" : "Show"} guide progress" title="${shouldShowStats ? "Hide" : "Show"} guide progress">
            <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false"><path d="M4 19V9h3v10H4Zm6 0V5h3v14h-3Zm6 0v-7h3v7h-3Z"></path></svg>
          </button>
          <button class="icon-action-button ranking-filter-toggle${shouldShowFilters ? " is-active" : ""}" type="button" data-guides-filter aria-expanded="${shouldShowFilters}" aria-controls="guides-filters" aria-label="${shouldShowFilters ? "Hide" : "Show"} guide filters">
            <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false"><path d="M4 5h16l-6.2 7.1v5.2l-3.6 1.8v-7L4 5Z"></path></svg>
          </button>
        </div>
      </div>
      ${shouldShowStats ? renderStats(allItems.length, completed, remaining, progress) : ""}
      ${renderFilters(filterOptions)}
      <div class="guides-checklist-summary"><span>${visibleItems.length} ${visibleItems.length === 1 ? "match" : "matches"}</span><span>${remaining} remaining</span></div>
      <div class="guides-checklist" id="guides-checklist">
        ${renderedItems.length ? renderedItems.map((item) => renderChecklistGroup(item, childrenByParent.get(item.id) || [], matchesFilters)).join("") : renderChecklistEmpty(allItems.length, remaining)}
        ${renderedItems.length < visibleItems.length ? renderLoadMore(renderedItems.length, visibleItems.length) : ""}
      </div>
    `;
    syncParentCheckboxes();
    setupStepObserver();
  }

  function renderGuideCard(guide) {
    return `
      <a class="guide-card" href="${escapeAttribute(getGuideUrl(guide.id))}" data-guide-open="${escapeAttribute(guide.id)}">
        <strong>${escapeHtml(guide.name)}</strong>
        <span class="guide-card-arrow" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="m9 6 6 6-6 6"></path></svg></span>
      </a>
    `;
  }

  function canViewGuide(guide) {
    return Boolean(getIsAdmin?.()) || !guide.isAdmin;
  }

  function renderGuideReferences(guide) {
    const references = [];
    if (guide.todoId) references.push(`To Do #${escapeHtml(guide.todoId)}`);
    if (guide.rankingId) references.push(`VG Ranking #${escapeHtml(guide.rankingId)}`);
    return references.length ? `<p class="guide-references">${references.join("<span aria-hidden=\"true\">&bull;</span>")}</p>` : "";
  }

  function renderFilters(options) {
    return `
      <div class="ranking-filters guides-filters" id="guides-filters"${shouldShowFilters ? "" : " hidden"}>
        <label class="toggle-row"><span>Hide Done</span><input type="checkbox" data-guide-filter="hide-done"${hideDone ? " checked" : ""}></label>
        ${renderFilterSelect("divider", "Divider", options.dividers, dividerFilter)}
        ${renderFilterSelect("section", "Section", options.sections, sectionFilter)}
        ${renderFilterSelect("type", "Type", options.types, typeFilter)}
      </div>
    `;
  }

  function renderFilterSelect(key, label, options, value) {
    if (!options.length) return "";
    return `
      <label class="ranking-select-control">
        <span>${escapeHtml(label)}</span>
        <select data-guide-filter="${key}">
          <option value="">All</option>
          ${options.map((option) => `<option value="${escapeAttribute(option)}"${option === value ? " selected" : ""}>${escapeHtml(option)}</option>`).join("")}
        </select>
      </label>
    `;
  }

  function renderStats(total, completed, remaining, progress) {
    return `
      <section class="guide-stats" aria-label="Guide progress">
        <div><span>Total Steps</span><strong>${total}</strong></div>
        <div><span>Completed</span><strong>${completed}</strong></div>
        <div><span>Remaining</span><strong>${remaining}</strong></div>
        <div><span>Progress</span><strong>${progress}%</strong></div>
        <div class="guide-progress-track" aria-label="${progress}% complete"><span style="width:${progress}%"></span></div>
      </section>
    `;
  }

  function renderChecklistGroup(item, children, matchesFilters) {
    if (!children.length) return renderChecklistItem(item);

    const parentKey = getParentKey(item);
    const expanded = expandedParentKeys.has(parentKey);
    const completedChildren = children.filter(isItemDone).length;
    const hasActiveChildren = completedChildren < children.length;
    const visibleChildren = children.filter((child) => matchesFilters(child) && (
      !hideDone || !isItemDone(child) || confirmedStepKeys.has(getStepKey(child.guideId, child.stepId))
    ));

    return `
      <section class="guide-step-group${expanded ? " is-expanded" : ""}" data-guide-parent-group="${escapeAttribute(parentKey)}">
        ${renderChecklistItem(item, {
          childCount: children.length,
          completedChildren,
          disableCompletion: !isItemDone(item) && hasActiveChildren,
          expanded,
          isMixed: !isItemDone(item) && completedChildren > 0 && hasActiveChildren,
          parentKey,
        })}
        <div class="guide-step-children"${expanded ? "" : " hidden"}>
          ${visibleChildren.length ? visibleChildren.map((child) => renderChecklistItem(child, { isChild: true })).join("") : `<p class="guide-step-children-empty">No child steps match the current filters.</p>`}
        </div>
      </section>
    `;
  }

  function renderChecklistItem(item, options = {}) {
    const done = isItemDone(item);
    const stepKey = getStepKey(item.guideId, item.stepId);
    const isPending = pendingStepKeys.has(stepKey);
    const isConfirmed = confirmedStepKeys.has(stepKey);
    const saveError = saveErrors.get(stepKey);
    const context = [item.divider, item.section].filter(Boolean);
    const inputId = `guide-step-${toSafeId(item.guideId)}-${toSafeId(item.stepId)}`;
    const parentAttributes = options.parentKey
      ? ` data-guide-parent-toggle="${escapeAttribute(options.parentKey)}" role="button" tabindex="0" aria-expanded="${options.expanded}"`
      : "";
    const checkboxTitle = options.disableCompletion ? "Complete all child steps before completing this parent" : "";
    return `
      <article class="guide-step${done ? " is-done" : ""}${isPending ? " is-saving" : ""}${isConfirmed ? " is-confirmed" : ""}${saveError ? " has-save-error" : ""}${options.isChild ? " guide-step--child" : ""}${options.parentKey ? " guide-step--parent" : ""}" data-guide-step-row="${escapeAttribute(stepKey)}"${parentAttributes}>
        <label class="guide-step-check" for="${inputId}"${checkboxTitle ? ` title="${escapeAttribute(checkboxTitle)}"` : ""}>
          <input id="${inputId}" type="checkbox" data-guide-step="${escapeAttribute(stepKey)}"${done ? " checked" : ""}${options.disableCompletion || isPending || isConfirmed ? " disabled" : ""}${options.isMixed ? ` data-guide-mixed="true" aria-checked="mixed"` : ""}>
          <span aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="${options.isMixed ? "M6 12h12" : "m6 12.5 4 4L18 8"}"></path></svg></span>
          <span class="sr-only">Mark step ${escapeHtml(item.stepId)} ${done ? "not done" : "done"}</span>
        </label>
        <div class="guide-step-content">
          ${context.length ? `<p class="guide-step-context">${context.map(escapeHtml).join("<span aria-hidden=\"true\">&bull;</span>")}</p>` : ""}
          <div class="guide-step-main">
            ${item.type ? `<span class="guide-step-type">${escapeHtml(item.type)}</span>` : ""}
            <p>${escapeHtml(item.step)}${renderStepLink(item.url)}</p>
          </div>
          ${options.parentKey ? `<p class="guide-step-child-summary"><span>${options.completedChildren} of ${options.childCount} child steps complete</span><span class="guide-step-expand-label">${options.expanded ? "Hide" : "Show"} steps</span></p>` : ""}
          ${isPending ? `<p class="guide-step-save-status" role="status">Saving…</p>` : ""}
          ${isConfirmed ? `<p class="guide-step-save-status" role="status">Saved</p>` : ""}
          ${saveError ? `<p class="guide-step-save-status is-error" role="alert">Not saved. <button type="button" data-guide-retry-step="${escapeAttribute(stepKey)}">Try again</button></p>` : ""}
        </div>
      </article>
    `;
  }

  function renderStepLink(url) {
    const safeUrl = getSafeUrl(url);
    if (!safeUrl) return "";
    return `<a class="guide-step-link" href="${escapeAttribute(safeUrl)}" target="_blank" rel="noopener noreferrer" aria-label="Open more information" title="Open more information"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M14 5h5v5M19 5l-8 8M18 13v5H6V6h5"></path></svg></a>`;
  }

  function syncParentCheckboxes() {
    view?.querySelectorAll("[data-guide-mixed]").forEach((input) => {
      input.indeterminate = true;
    });
  }

  function renderChecklistEmpty(total, remaining) {
    const message = total === 0
      ? "No checklist steps have been added for this guide yet."
      : remaining === 0 && hideDone
        ? "You completed every step. Turn off Hide Done to review the checklist."
        : "No steps match these filters.";
    return `<div class="guides-empty-state"><span aria-hidden="true">&#10003;</span><p>${escapeHtml(message)}</p></div>`;
  }

  function renderLoadMore(renderedCount, totalCount) {
    return `
      <div class="guides-load-more" id="guides-load-more">
        <button class="action-button" type="button" data-guides-load-more>Load More</button>
        <span>${renderedCount} of ${totalCount} steps loaded</span>
      </div>
    `;
  }

  function setupStepObserver() {
    stepObserver?.disconnect();
    const sentinel = view?.querySelector("#guides-load-more");
    if (!sentinel || !("IntersectionObserver" in window)) return;

    stepObserver = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      stepObserver.disconnect();
      visibleStepLimit += GUIDE_STEP_BATCH_SIZE;
      renderPage();
    }, { rootMargin: "320px 0px" });
    stepObserver.observe(sentinel);
  }

  function handleClick(event) {
    const parentRow = event.target.closest("[data-guide-parent-toggle]");
    if (parentRow && !event.target.closest("input, label, a, button, select")) {
      toggleParent(parentRow.dataset.guideParentToggle);
      return;
    }

    const openLink = event.target.closest("[data-guide-open]");
    if (openLink) {
      event.preventDefault();
      navigateToGuide(openLink.dataset.guideOpen);
      return;
    }

    if (event.target.closest("[data-guides-back]")) {
      event.preventDefault();
      navigateToGuide("");
      return;
    }

    if (event.target.closest("[data-guides-filter]")) {
      shouldShowFilters = !shouldShowFilters;
      renderPage();
      return;
    }

    if (event.target.closest("[data-guides-stats]")) {
      shouldShowStats = !shouldShowStats;
      renderPage();
      return;
    }

    if (event.target.closest("[data-guides-load-more]")) {
      visibleStepLimit += GUIDE_STEP_BATCH_SIZE;
      renderPage();
      return;
    }

    if (event.target.closest("[data-guides-retry]")) {
      renderPage();
      return;
    }

    const retryButton = event.target.closest("[data-guide-retry-step]");
    if (retryButton) {
      const errorState = saveErrors.get(retryButton.dataset.guideRetryStep);
      if (errorState) void saveChecklistItem(errorState.item, errorState.done);
    }
  }

  function handleKeydown(event) {
    const parentRow = event.target.closest("[data-guide-parent-toggle]");
    if (!parentRow || !["Enter", " "].includes(event.key) || event.target.closest("input, label, a, button, select")) return;
    event.preventDefault();
    toggleParent(parentRow.dataset.guideParentToggle);
  }

  function toggleParent(parentKey) {
    if (expandedParentKeys.has(parentKey)) expandedParentKeys.delete(parentKey);
    else expandedParentKeys.add(parentKey);
    renderPage();
  }

  async function completeParentWhenChildrenAreDone(item) {
    if (!item?.parentId) return;

    const parent = checklist?.find((entry) => entry.guideId === item.guideId && entry.id === item.parentId);
    if (!parent || isItemDone(parent)) return;

    const siblings = checklist.filter((entry) => entry.guideId === item.guideId && entry.parentId === parent.id);
    if (!siblings.length || !siblings.every(isItemDone)) return;

    await saveChecklistItem(parent, true);
  }

  async function saveChecklistItem(item, done) {
    if (!item) return;
    const managerId = String(getManagerId?.() || "").trim();
    const stepKey = getStepKey(item.guideId, item.stepId);
    const previousDone = completedStepKeys.has(stepKey);
    pendingStepKeys.add(stepKey);
    saveErrors.delete(stepKey);
    renderPage();

    try {
      await saveGuideProgress(progressEndpoint, managerId, item, done);
      if (done) completedStepKeys.add(stepKey);
      else completedStepKeys.delete(stepKey);
      saveErrors.delete(stepKey);
      pendingStepKeys.delete(stepKey);
      if (done) confirmedStepKeys.add(stepKey);
      renderPage();
      if (done) {
        await wait(GUIDE_COMPLETION_CONFIRMATION_MS);
        confirmedStepKeys.delete(stepKey);
      }
    } catch (error) {
      if (previousDone) completedStepKeys.add(stepKey);
      else completedStepKeys.delete(stepKey);
      saveErrors.set(stepKey, { done, error, item });
    } finally {
      pendingStepKeys.delete(stepKey);
      if (!done || !completedStepKeys.has(stepKey)) confirmedStepKeys.delete(stepKey);
      renderPage();
    }

    if (done && completedStepKeys.has(stepKey)) {
      await completeParentWhenChildrenAreDone(item);
    }
  }

  function handleChange(event) {
    const stepInput = event.target.closest("[data-guide-step]");
    if (stepInput) {
      const item = checklist?.find((entry) => getStepKey(entry.guideId, entry.stepId) === stepInput.dataset.guideStep);
      const requestedDone = stepInput.checked;
      stepInput.checked = isItemDone(item);
      void saveChecklistItem(item, requestedDone);
      return;
    }

    const filter = event.target.dataset.guideFilter;
    if (filter === "hide-done") hideDone = event.target.checked;
    if (filter === "divider") dividerFilter = event.target.value;
    if (filter === "section") sectionFilter = event.target.value;
    if (filter === "type") typeFilter = event.target.value;
    if (filter) {
      visibleStepLimit = GUIDE_STEP_BATCH_SIZE;
      renderPage();
    }
  }

  function navigateToGuide(guideId) {
    const url = new URL(window.location.href);
    if (guideId) url.searchParams.set("guide", guideId);
    else url.searchParams.delete("guide");
    url.hash = "guides";
    window.history.pushState({}, "", url);
    selectedGuideId = guideId;
    resetGuideControls();
    renderPage();
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }

  function resetGuideControls() {
    shouldShowFilters = false;
    shouldShowStats = false;
    hideDone = true;
    dividerFilter = "";
    sectionFilter = "";
    typeFilter = "";
    visibleStepLimit = GUIDE_STEP_BATCH_SIZE;
  }

  function renderError(label, error) {
    if (!view) return;
    view.innerHTML = `
      <div class="guides-empty-state guides-error-state">
        <h1>Unable to load ${escapeHtml(label)}</h1>
        <p>${escapeHtml(error?.message || "Please check your connection and try again.")}</p>
        <button class="action-button" type="button" data-guides-retry>Try Again</button>
      </div>
    `;
  }

  function renderIndexLoading() {
    return `
      <div class="section-heading page-heading-with-action footy-heading"><div><p class="guides-eyebrow">Walkthroughs</p><h1>Guides</h1></div></div>
      <div class="guides-loading-grid" aria-label="Loading guides"><span class="guides-skeleton-card"></span><span class="guides-skeleton-card"></span><span class="guides-skeleton-card"></span></div>
    `;
  }

  function renderDetailLoading(name = "Guide") {
    return `
      <a class="guides-back-link" href="${escapeAttribute(getGuidesUrl())}" data-guides-back>&larr; All Guides</a>
      <div class="section-heading page-heading-with-action footy-heading"><div><p class="guides-eyebrow">Guide</p><h1>${escapeHtml(name)}</h1></div></div>
      <div class="guides-checklist guides-checklist-loading" aria-label="Loading checklist">${Array.from({ length: 6 }, () => `<span class="guides-skeleton-step"></span>`).join("")}</div>
    `;
  }

  return { renderPage };
}

function wait(durationMs) {
  return new Promise((resolve) => window.setTimeout(resolve, durationMs));
}

function normalizeGuide(row) {
  return {
    id: String(row.ID || row.Id || row.id || "").trim(),
    name: String(row.Name || row.name || "").trim(),
    todoId: String(row["To Do ID"] || row.todoId || "").trim(),
    rankingId: String(row["VG Ranking ID"] || row.rankingId || "").trim(),
    isAdmin: row.isAdmin === true,
  };
}

function normalizeChecklistItem(row) {
  return {
    id: String(row.ID || row.Id || row.id || "").trim(),
    guideId: String(row["Guide ID"] || row.guideId || "").trim(),
    stepId: String(row["Step ID"] || row.stepId || "").trim(),
    parentId: String(row["Parent ID"] || row.parentId || "").trim(),
    divider: String(row.Divider || row.divider || "").trim(),
    section: String(row.Section || row.section || "").trim(),
    type: String(row.Type || row.type || "").trim(),
    step: String(row.Step || row.step || "").trim(),
    url: String(row.Url || row.URL || row.url || "").trim(),
  };
}

function getFilterOptions(items) {
  return {
    dividers: uniqueValues(items.map((item) => item.divider)),
    sections: uniqueValues(items.map((item) => item.section)),
    types: uniqueValues(items.map((item) => item.type)),
  };
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

function getStepKey(guideId, stepId) {
  return `${guideId}::${stepId}`;
}

function getParentKey(item) {
  return `${item.guideId}::parent::${item.id}`;
}

function getSafeUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function getGuideUrl(guideId) {
  const url = new URL(window.location.href);
  url.searchParams.set("guide", guideId);
  url.hash = "guides";
  return `${url.pathname}${url.search}${url.hash}`;
}

function getGuidesUrl() {
  const url = new URL(window.location.href);
  url.searchParams.delete("guide");
  url.hash = "guides";
  return `${url.pathname}${url.search}${url.hash}`;
}

function toSafeId(value) {
  return String(value).replace(/[^a-zA-Z0-9_-]/g, "-");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

async function requestGuideProgress(endpoint, managerId) {
  if (!endpoint) throw new Error("Guide progress service is not configured.");
  const response = await fetchWithTimeout(`${endpoint.replace(/\/$/, "")}/api/managers/${encodeURIComponent(managerId)}/progress`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  const data = await readJsonResponse(response);
  if (!response.ok || !data.ok || !Array.isArray(data.progress)) {
    throw new Error(data.error || `Unable to load guide progress (${response.status}).`);
  }
  return data.progress;
}

async function saveGuideProgress(endpoint, managerId, item, done) {
  if (!endpoint || !managerId) throw new Error("Guide progress service is not configured.");
  const url = `${endpoint.replace(/\/$/, "")}/api/managers/${encodeURIComponent(managerId)}/guides/${encodeURIComponent(item.guideId)}/steps/${encodeURIComponent(item.stepId)}`;
  const response = await fetchWithTimeout(url, {
    headers: { Accept: "application/json" },
    method: done ? "PUT" : "DELETE",
  });
  const data = await readJsonResponse(response);
  if (!response.ok || !data.ok || Boolean(data.completed) !== Boolean(done)) {
    throw new Error(data.error || `Unable to save guide progress (${response.status}).`);
  }
  return data;
}

async function readJsonResponse(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

async function fetchWithTimeout(url, options, timeoutMs = 10000) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error?.name === "AbortError") throw new Error("The guide progress service did not respond in time.");
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}
