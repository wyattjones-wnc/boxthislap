const DEFAULT_SHEET_ID = "fantasy-critic";

export function createDraftListsController({ getManagerId, request }) {
  const page = document.querySelector("#draft-list");
  const tabs = document.querySelector("#draft-list-tabs");
  const itemsView = document.querySelector("#draft-list-items");
  const status = document.querySelector("#draft-list-status");
  const filterToggle = document.querySelector("#draft-list-filter-toggle");
  const filters = document.querySelector("#draft-list-filters");
  const entryAfter = document.querySelector("#draft-list-entry-after");
  const clearFilters = document.querySelector("#draft-list-clear-filters");
  const addButton = document.querySelector("#draft-list-add-button");
  const newSheetButton = document.querySelector("#draft-list-new-sheet-button");
  const itemDialog = document.querySelector("#draft-list-item-dialog");
  const itemForm = document.querySelector("#draft-list-item-form");
  const itemDialogTitle = document.querySelector("#draft-list-item-dialog-title");
  const itemIdInput = document.querySelector("#draft-list-item-id");
  const itemNameInput = document.querySelector("#draft-list-item-name");
  const itemReleaseDateInput = document.querySelector("#draft-list-item-release-date");
  const itemRankInput = document.querySelector("#draft-list-item-rank");
  const itemDataUrlInput = document.querySelector("#draft-list-item-data-url");
  const itemImageUrlInput = document.querySelector("#draft-list-item-image-url");
  const itemStatus = document.querySelector("#draft-list-item-status");
  const itemClose = document.querySelector("#draft-list-item-close");
  const itemCancel = document.querySelector("#draft-list-item-cancel");
  const itemDelete = document.querySelector("#draft-list-item-delete");
  const sheetDialog = document.querySelector("#draft-list-sheet-dialog");
  const sheetForm = document.querySelector("#draft-list-sheet-form");
  const sheetNameInput = document.querySelector("#draft-list-sheet-name");
  const sheetStatus = document.querySelector("#draft-list-sheet-status");
  const sheetClose = document.querySelector("#draft-list-sheet-close");
  const sheetCancel = document.querySelector("#draft-list-sheet-cancel");
  const state = {
    activeSheetId: DEFAULT_SHEET_ID,
    entryAfter: "",
    error: "",
    initialized: false,
    loadedManagerId: "",
    loading: false,
    loadPromise: null,
    message: "",
    sheets: [],
    showFilters: false,
    items: [],
  };
  let draggedItemId = "";
  let draggedSheetId = "";
  let didMovePointer = false;

  function initialize() {
    if (state.initialized || !page) return;
    state.initialized = true;
    page.addEventListener("click", handleClick);
    page.addEventListener("change", handleChange);
    itemForm?.addEventListener("submit", handleItemSubmit);
    sheetForm?.addEventListener("submit", handleSheetSubmit);
    itemsView?.addEventListener("dragstart", handleDragStart);
    itemsView?.addEventListener("dragend", endDragging);
    itemsView?.addEventListener("dragover", handleDragOver);
    itemsView?.addEventListener("drop", handleDrop);
    itemsView?.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("pointermove", handlePointerMove, true);
    document.addEventListener("pointerup", handlePointerUp, true);
    document.addEventListener("pointercancel", cancelPointerDrag, true);
    document.addEventListener("error", handleImageError, true);
  }

  function renderPage() {
    initialize();
    const managerId = String(getManagerId() || "").trim();

    if (!managerId) {
      renderSignedOut();
      return;
    }

    if (state.loadedManagerId && state.loadedManagerId !== managerId) {
      reset();
    }

    render();
    if (!state.loading && state.loadedManagerId !== managerId) void load().catch(() => undefined);
  }

  async function load(options = {}) {
    initialize();
    const managerId = String(getManagerId() || "").trim();
    if (!managerId || !page) return;
    if (!options.force && state.loadedManagerId === managerId) return;
    if (state.loadPromise) return state.loadPromise;

    state.loading = true;
    state.error = "";
    if (!options.preserveMessage) state.message = "";
    render();

    const promise = request(`/api/managers/${encodeURIComponent(managerId)}/draft-lists`)
      .then((response) => {
        state.sheets = Array.isArray(response.sheets) ? response.sheets.map(normalizeSheet) : [];
        state.items = Array.isArray(response.items) ? response.items.map(normalizeItem) : [];
        state.loadedManagerId = managerId;
        if (!state.sheets.some((sheet) => sheet.id === state.activeSheetId)) {
          state.activeSheetId = state.sheets.find((sheet) => sheet.id === DEFAULT_SHEET_ID)?.id || state.sheets[0]?.id || "";
        }
      })
      .catch((error) => {
        state.error = error.message || "Draft List could not be loaded.";
        throw error;
      })
      .finally(() => {
        state.loading = false;
        state.loadPromise = null;
        render();
      });

    state.loadPromise = promise;
    return promise;
  }

  function reset() {
    state.activeSheetId = DEFAULT_SHEET_ID;
    state.entryAfter = "";
    state.error = "";
    state.loadedManagerId = "";
    state.loading = false;
    state.loadPromise = null;
    state.message = "";
    state.sheets = [];
    state.showFilters = false;
    state.items = [];
    draggedItemId = "";
    draggedSheetId = "";
    didMovePointer = false;
    if (entryAfter) entryAfter.value = "";
    closeDialog(itemDialog);
    closeDialog(sheetDialog);
  }

  function render() {
    if (!page) return;
    syncControls();
    renderTabs();
    renderItems();
  }

  function renderSignedOut() {
    if (tabs) tabs.innerHTML = "";
    if (itemsView) {
      itemsView.setAttribute("aria-busy", "false");
      itemsView.innerHTML = `<p class="table-message">Sign in to open your Draft List.</p>`;
    }
    setPageStatus("");
  }

  function syncControls() {
    const hasSheet = Boolean(getActiveSheet());
    if (filterToggle) {
      filterToggle.classList.toggle("is-active", state.showFilters || Boolean(state.entryAfter));
      filterToggle.setAttribute("aria-expanded", String(state.showFilters));
      filterToggle.setAttribute("aria-label", `${state.showFilters ? "Hide" : "Show"} Draft List filters`);
    }
    if (filters) filters.hidden = !state.showFilters;
    if (entryAfter && entryAfter.value !== state.entryAfter) entryAfter.value = state.entryAfter;
    if (clearFilters) clearFilters.disabled = !state.entryAfter;
    if (addButton) addButton.disabled = state.loading || !hasSheet;
    if (newSheetButton) newSheetButton.disabled = state.loading;
    setPageStatus(state.error || state.message, Boolean(state.error));
  }

  function renderTabs() {
    if (!tabs) return;
    if (state.loading && !state.sheets.length) {
      tabs.innerHTML = `<button class="tab is-active" type="button" role="tab" aria-selected="true">Loading sheets...</button>`;
      return;
    }
    tabs.innerHTML = state.sheets.map((sheet) => {
      const active = sheet.id === state.activeSheetId;
      return `
        <button class="tab${active ? " is-active" : ""}" type="button" data-draft-list-tab="${escapeAttribute(sheet.id)}" aria-selected="${String(active)}" role="tab">
          <span class="draft-list-tab-icon" aria-hidden="true">${renderSheetIcon(sheet.icon)}</span>
          <span>${escapeHtml(sheet.name)}</span>
        </button>
      `;
    }).join("");
    window.requestAnimationFrame(() => {
      tabs.querySelector("[data-draft-list-tab].is-active")?.scrollIntoView({ behavior: "auto", block: "nearest", inline: "nearest" });
    });
  }

  function renderItems() {
    if (!itemsView) return;
    itemsView.setAttribute("aria-busy", String(state.loading));
    if (state.loading && !state.loadedManagerId) {
      itemsView.innerHTML = renderLoading("Loading Draft List...");
      return;
    }
    if (state.error && !state.loadedManagerId) {
      itemsView.innerHTML = `
        <div class="draft-list-empty">
          <p class="table-message">${escapeHtml(state.error)}</p>
          <button class="action-button" type="button" data-draft-list-retry>Try Again</button>
        </div>
      `;
      return;
    }

    const sheet = getActiveSheet();
    if (!sheet) {
      itemsView.innerHTML = `<p class="table-message">Create a sheet to begin your Draft List.</p>`;
      return;
    }

    const allItems = getSheetItems(sheet.id);
    const visibleItems = state.entryAfter
      ? allItems.filter((item) => getEntryDateKey(item.entryDate) > state.entryAfter)
      : allItems;
    if (!visibleItems.length) {
      const filtered = Boolean(state.entryAfter && allItems.length);
      itemsView.innerHTML = `
        <div class="draft-list-empty">
          <p class="table-message">${filtered ? "No entries were added after that date." : `No items have been added to ${escapeHtml(sheet.name)} yet.`}</p>
          ${filtered
            ? `<button class="action-button" type="button" data-draft-list-clear-filter>Clear Filter</button>`
            : `<button class="action-button" type="button" data-draft-list-add-empty>Add Item</button>`}
        </div>
      `;
      return;
    }

    itemsView.innerHTML = visibleItems.map((item) => renderItem(item, sheet)).join("");
  }

  function renderItem(item, sheet) {
    const image = item.imageUrl
      ? `<div class="draft-list-item-image"><img src="${escapeAttribute(item.imageUrl)}" alt="" loading="lazy" decoding="async" data-draft-list-image></div>`
      : "";
    const releaseDate = item.releaseDate ? formatDate(item.releaseDate) : "Date TBD";
    const dataLink = item.dataUrl ? `
      <a class="icon-action-button draft-list-item-action" href="${escapeAttribute(item.dataUrl)}" target="_blank" rel="noopener noreferrer" aria-label="Open data page for ${escapeAttribute(item.name)}" title="Open data page">
        <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false"><path d="M10 14 21 3M14 3h7v7"></path><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"></path></svg>
      </a>
    ` : "";

    return `
      <article class="draft-list-item${image ? " has-image" : ""}" draggable="true" data-draft-list-item-id="${escapeAttribute(item.id)}" data-draft-list-sheet-id="${escapeAttribute(sheet.id)}">
        ${image}
        <span class="draft-list-rank">${escapeHtml(item.rank)}</span>
        <div class="draft-list-item-main">
          <h2>${escapeHtml(item.name)}</h2>
          <p class="draft-list-item-date">${escapeHtml(releaseDate)}</p>
        </div>
        <div class="draft-list-item-actions">
          ${dataLink}
          <button class="icon-action-button draft-list-item-action" type="button" data-draft-list-edit="${escapeAttribute(item.id)}" aria-label="Edit ${escapeAttribute(item.name)}" title="Edit item">
            <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false"><path d="m4 20 4.4-1 10.9-10.9a2.1 2.1 0 0 0-3-3L5.4 16 4 20Z"></path><path d="m14.5 6 3.5 3.5"></path></svg>
          </button>
        </div>
        <span class="draft-list-drag-handle" aria-hidden="true" title="Drag to reorder"></span>
      </article>
    `;
  }

  function handleClick(event) {
    const tab = event.target.closest("[data-draft-list-tab]");
    if (tab) {
      state.activeSheetId = tab.dataset.draftListTab || state.activeSheetId;
      state.message = "";
      render();
      return;
    }
    if (event.target.closest("#draft-list-filter-toggle")) {
      state.showFilters = !state.showFilters;
      render();
      return;
    }
    if (event.target.closest("#draft-list-new-sheet-button")) {
      openSheetDialog();
      return;
    }
    if (event.target.closest("#draft-list-add-button, [data-draft-list-add-empty]")) {
      openItemDialog();
      return;
    }
    if (event.target.closest("#draft-list-clear-filters, [data-draft-list-clear-filter]")) {
      clearEntryFilter();
      return;
    }
    if (event.target.closest("[data-draft-list-retry]")) {
      state.error = "";
      void load({ force: true }).catch(() => undefined);
      return;
    }
    const edit = event.target.closest("[data-draft-list-edit]");
    if (edit) {
      openItemDialog(edit.dataset.draftListEdit || "");
      return;
    }
    if (event.target === itemClose || event.target === itemCancel) {
      closeDialog(itemDialog);
      return;
    }
    if (event.target === sheetClose || event.target === sheetCancel) {
      closeDialog(sheetDialog);
      return;
    }
    if (event.target === itemDelete) void deleteActiveItem();
  }

  function handleChange(event) {
    if (event.target !== entryAfter) return;
    state.entryAfter = entryAfter.value || "";
    render();
  }

  function clearEntryFilter() {
    state.entryAfter = "";
    if (entryAfter) entryAfter.value = "";
    render();
  }

  function openItemDialog(itemId = "") {
    const sheet = getActiveSheet();
    if (!sheet || !itemDialog || !itemForm) return;
    const item = itemId ? getSheetItems(sheet.id).find((entry) => entry.id === itemId) : null;
    itemForm.reset();
    itemIdInput.value = item?.id || "";
    itemNameInput.value = item?.name || "";
    itemReleaseDateInput.value = item?.releaseDate || "";
    itemRankInput.max = String(Math.max(getSheetItems(sheet.id).length + (item ? 0 : 1), 1));
    itemRankInput.value = String(item?.rank || getSheetItems(sheet.id).length + 1);
    itemDataUrlInput.value = item?.dataUrl || "";
    itemImageUrlInput.value = item?.imageUrl || "";
    itemDialogTitle.textContent = `${item ? "Edit" : "Add"} ${sheet.name} Item`;
    itemDelete.hidden = !item;
    setStatus(itemStatus, "");
    itemDialog.showModal();
    window.setTimeout(() => itemNameInput.focus(), 0);
  }

  function openSheetDialog() {
    if (!sheetDialog || !sheetForm) return;
    sheetForm.reset();
    setStatus(sheetStatus, "");
    sheetDialog.showModal();
    window.setTimeout(() => sheetNameInput.focus(), 0);
  }

  async function handleItemSubmit(event) {
    event.preventDefault();
    const sheet = getActiveSheet();
    if (!sheet || !itemForm) return;
    const itemId = itemIdInput.value.trim();
    const body = {
      dataUrl: itemDataUrlInput.value.trim(),
      imageUrl: itemImageUrlInput.value.trim(),
      manualRank: Number(itemRankInput.value),
      name: itemNameInput.value.trim(),
      releaseDate: itemReleaseDateInput.value,
      revision: Number(sheet.revision || 0),
    };
    setFormBusy(itemForm, true);
    setStatus(itemStatus, "Saving...");
    try {
      const response = await request(`${getSheetPath(sheet.id)}/items${itemId ? `/${encodeURIComponent(itemId)}` : ""}`, {
        body: JSON.stringify(body),
        method: itemId ? "PATCH" : "POST",
      });
      applySheetRevision(sheet.id, response.revision);
      const savedItem = normalizeItem(response.item);
      upsertLocalItem(sheet.id, savedItem);
      state.message = `${savedItem.name} saved.`;
      closeDialog(itemDialog);
      render();
    } catch (error) {
      setStatus(itemStatus, error.message || "Draft List item could not be saved.", true);
      if (error.status === 409) void reloadAfterConflict();
    } finally {
      setFormBusy(itemForm, false);
    }
  }

  async function handleSheetSubmit(event) {
    event.preventDefault();
    const managerId = String(getManagerId() || "").trim();
    if (!managerId || !sheetForm) return;
    setFormBusy(sheetForm, true);
    setStatus(sheetStatus, "Creating...");
    try {
      const response = await request(`/api/managers/${encodeURIComponent(managerId)}/draft-lists`, {
        body: JSON.stringify({ name: sheetNameInput.value.trim() }),
        method: "POST",
      });
      const sheet = normalizeSheet(response.sheet);
      state.sheets = [...state.sheets, sheet].sort(compareSheets);
      state.activeSheetId = sheet.id;
      state.message = `${sheet.name} created.`;
      closeDialog(sheetDialog);
      render();
    } catch (error) {
      setStatus(sheetStatus, error.message || "Draft List sheet could not be created.", true);
    } finally {
      setFormBusy(sheetForm, false);
    }
  }

  async function deleteActiveItem() {
    const sheet = getActiveSheet();
    const itemId = itemIdInput?.value.trim();
    const item = getSheetItems(sheet?.id).find((entry) => entry.id === itemId);
    if (!sheet || !item || !window.confirm(`Delete ${item.name} from ${sheet.name}?`)) return;
    setFormBusy(itemForm, true);
    setStatus(itemStatus, "Deleting...");
    try {
      const response = await request(`${getSheetPath(sheet.id)}/items/${encodeURIComponent(item.id)}`, {
        body: JSON.stringify({ revision: Number(sheet.revision || 0) }),
        method: "DELETE",
      });
      applySheetRevision(sheet.id, response.revision);
      state.items = state.items.filter((entry) => !(entry.sheetId === sheet.id && entry.id === item.id));
      normalizeLocalRanks(sheet.id);
      state.message = `${item.name} deleted.`;
      closeDialog(itemDialog);
      render();
    } catch (error) {
      setStatus(itemStatus, error.message || "Draft List item could not be deleted.", true);
      if (error.status === 409) void reloadAfterConflict();
    } finally {
      setFormBusy(itemForm, false);
    }
  }

  function handleDragStart(event) {
    const item = event.target.closest("[data-draft-list-item-id]");
    if (!item || !event.target.closest(".draft-list-drag-handle")) {
      event.preventDefault();
      return;
    }
    draggedItemId = item.dataset.draftListItemId || "";
    draggedSheetId = item.dataset.draftListSheetId || "";
    event.dataTransfer?.setData("text/plain", draggedItemId);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
    item.classList.add("is-dragging");
  }

  function handleDragOver(event) {
    if (draggedItemId && event.target.closest("[data-draft-list-item-id]")) event.preventDefault();
  }

  function handleDrop(event) {
    const target = event.target.closest("[data-draft-list-item-id]");
    if (!target || !draggedItemId || target.dataset.draftListSheetId !== draggedSheetId) return;
    event.preventDefault();
    const sheetId = draggedSheetId;
    const moved = moveItem(sheetId, draggedItemId, target.dataset.draftListItemId || "");
    endDragging();
    if (moved) void saveOrder(sheetId);
  }

  function handlePointerDown(event) {
    const handle = event.target.closest(".draft-list-drag-handle");
    const item = handle?.closest("[data-draft-list-item-id]");
    if (!item) return;
    draggedItemId = item.dataset.draftListItemId || "";
    draggedSheetId = item.dataset.draftListSheetId || "";
    didMovePointer = false;
    event.preventDefault();
    item.classList.add("is-dragging");
  }

  function handlePointerMove(event) {
    if (!draggedItemId || !draggedSheetId) return;
    event.preventDefault();
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest("[data-draft-list-item-id]");
    if (!target || target.dataset.draftListSheetId !== draggedSheetId) return;
    if (moveItem(draggedSheetId, draggedItemId, target.dataset.draftListItemId || "")) {
      didMovePointer = true;
      getItemElement(draggedItemId)?.classList.add("is-dragging");
    }
  }

  function handlePointerUp() {
    if (!draggedItemId || !draggedSheetId) return;
    const sheetId = draggedSheetId;
    const shouldSave = didMovePointer;
    endDragging();
    if (shouldSave) void saveOrder(sheetId);
  }

  function cancelPointerDrag() {
    if (draggedItemId) getItemElement(draggedItemId)?.classList.remove("is-dragging");
    endDragging();
  }

  function endDragging(event) {
    event?.target?.closest?.("[data-draft-list-item-id]")?.classList.remove("is-dragging");
    if (draggedItemId) getItemElement(draggedItemId)?.classList.remove("is-dragging");
    draggedItemId = "";
    draggedSheetId = "";
    didMovePointer = false;
  }

  function moveItem(sheetId, itemId, targetId) {
    if (!sheetId || !itemId || !targetId || itemId === targetId) return false;
    const rows = getSheetItems(sheetId);
    const fromIndex = rows.findIndex((item) => item.id === itemId);
    const targetIndex = rows.findIndex((item) => item.id === targetId);
    if (fromIndex < 0 || targetIndex < 0) return false;
    const [moved] = rows.splice(fromIndex, 1);
    rows.splice(targetIndex, 0, moved);
    const ranks = new Map(rows.map((item, index) => [item.id, index + 1]));
    state.items = state.items.map((item) => item.sheetId === sheetId ? { ...item, rank: ranks.get(item.id) } : item);
    renderItems();
    return true;
  }

  async function saveOrder(sheetId) {
    const sheet = state.sheets.find((entry) => entry.id === sheetId);
    if (!sheet) return;
    state.message = "Saving order...";
    state.error = "";
    syncControls();
    try {
      const response = await request(`${getSheetPath(sheetId)}/order`, {
        body: JSON.stringify({
          itemIds: getSheetItems(sheetId).map((item) => item.id),
          revision: Number(sheet.revision || 0),
        }),
        method: "PUT",
      });
      applySheetRevision(sheetId, response.revision);
      state.message = "Draft List order saved.";
    } catch (error) {
      const message = error.message || "Draft List order could not be saved.";
      if (error.status === 409) await reloadAfterConflict();
      state.error = message;
    } finally {
      render();
    }
  }

  async function reloadAfterConflict() {
    state.loadedManagerId = "";
    state.loadPromise = null;
    try {
      await load({ force: true, preserveMessage: true });
    } catch {
      // The current error is already visible and the retry action remains available.
    }
  }

  function handleImageError(event) {
    if (!event.target.matches?.("[data-draft-list-image]")) return;
    const sheetId = event.target.closest("[data-draft-list-sheet-id]")?.dataset.draftListSheetId || "";
    const sheet = state.sheets.find((entry) => entry.id === sheetId);
    event.target.parentElement.innerHTML = `<span class="draft-list-image-placeholder" aria-hidden="true">${renderSheetIcon(sheet?.icon)}</span>`;
  }

  function getSheetPath(sheetId) {
    return `/api/managers/${encodeURIComponent(getManagerId())}/draft-lists/${encodeURIComponent(sheetId)}`;
  }

  function getActiveSheet() {
    return state.sheets.find((sheet) => sheet.id === state.activeSheetId) || null;
  }

  function getSheetItems(sheetId = "") {
    return state.items
      .filter((item) => item.sheetId === sheetId)
      .sort((first, second) => first.rank - second.rank || first.name.localeCompare(second.name));
  }

  function getItemElement(itemId) {
    return [...(itemsView?.querySelectorAll("[data-draft-list-item-id]") || [])]
      .find((element) => element.dataset.draftListItemId === itemId) || null;
  }

  function applySheetRevision(sheetId, revision) {
    state.sheets = state.sheets.map((sheet) => sheet.id === sheetId ? { ...sheet, revision: Number(revision || 0) } : sheet);
  }

  function upsertLocalItem(sheetId, savedItem) {
    const rows = getSheetItems(sheetId).filter((item) => item.id !== savedItem.id);
    const index = Math.min(Math.max(Number(savedItem.rank || rows.length + 1) - 1, 0), rows.length);
    rows.splice(index, 0, savedItem);
    const normalizedRows = rows.map((item, rowIndex) => ({ ...item, rank: rowIndex + 1 }));
    state.items = [
      ...state.items.filter((item) => item.sheetId !== sheetId),
      ...normalizedRows,
    ];
  }

  function normalizeLocalRanks(sheetId) {
    const ranks = new Map(getSheetItems(sheetId).map((item, index) => [item.id, index + 1]));
    state.items = state.items.map((item) => item.sheetId === sheetId ? { ...item, rank: ranks.get(item.id) } : item);
  }

  function setPageStatus(message, isError = false) {
    setStatus(status, message, isError);
  }

  return { load, renderPage, reset };
}

function normalizeSheet(sheet = {}) {
  return {
    createdAt: String(sheet.createdAt || ""),
    icon: String(sheet.icon || "notebook"),
    id: String(sheet.id || ""),
    isSystem: Boolean(sheet.isSystem),
    name: String(sheet.name || "Untitled"),
    position: Number(sheet.position || 0),
    revision: Number(sheet.revision || 0),
  };
}

function normalizeItem(item = {}) {
  return {
    dataUrl: String(item.dataUrl || ""),
    entryDate: String(item.entryDate || ""),
    id: String(item.id || ""),
    imageUrl: String(item.imageUrl || ""),
    name: String(item.name || "Untitled"),
    rank: Number(item.rank || item.manualRank || 0),
    releaseDate: String(item.releaseDate || ""),
    sheetId: String(item.sheetId || ""),
    updatedAt: String(item.updatedAt || ""),
  };
}

function compareSheets(first, second) {
  return first.position - second.position || first.name.localeCompare(second.name);
}

function renderSheetIcon(icon = "notebook") {
  if (icon === "gamepad") {
    return `<svg viewBox="0 0 24 24" focusable="false"><path d="M8 8h8a5 5 0 0 1 4.7 6.7l-1.1 3.1a2.2 2.2 0 0 1-3.7.8L14.5 17h-5l-1.4 1.6a2.2 2.2 0 0 1-3.7-.8l-1.1-3.1A5 5 0 0 1 8 8Z"></path><path d="M7 12v4M5 14h4M16.5 13h.01M18.5 15h.01"></path></svg>`;
  }
  if (icon === "film") {
    return `<svg viewBox="0 0 24 24" focusable="false"><circle cx="12" cy="12" r="9"></circle><circle cx="12" cy="12" r="2"></circle><circle cx="12" cy="6.5" r="1.5"></circle><circle cx="17.2" cy="10.3" r="1.5"></circle><circle cx="15.2" cy="16.4" r="1.5"></circle><circle cx="8.8" cy="16.4" r="1.5"></circle><circle cx="6.8" cy="10.3" r="1.5"></circle></svg>`;
  }
  return `<svg viewBox="0 0 24 24" focusable="false"><path d="M6 3.5h13v17H6a3 3 0 0 1-3-3v-11a3 3 0 0 1 3-3Z"></path><path d="M7 3.5v17M3 7h4M3 12h4M3 17h4"></path></svg>`;
}

function formatDate(value) {
  const [year, month, day] = String(value || "").split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (!year || !month || !day || Number.isNaN(date.getTime())) return "Date TBD";
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(date);
}

function getEntryDateKey(value) {
  const match = String(value || "").match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] || "";
}

function renderLoading(message) {
  return `<p class="table-message loading-message"><span class="loading-spinner" aria-hidden="true"></span><span>${escapeHtml(message)}</span></p>`;
}

function closeDialog(dialog) {
  if (dialog?.open) dialog.close();
}

function setFormBusy(form, busy) {
  form?.querySelectorAll("button, input, select, textarea").forEach((control) => {
    control.disabled = busy;
  });
}

function setStatus(element, message, isError = false) {
  if (!element) return;
  element.textContent = message || "";
  element.classList.toggle("is-error", Boolean(isError));
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
  return escapeHtml(value);
}
