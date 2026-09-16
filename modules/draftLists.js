import { openContainedDialog } from "./dialogs/containDialog.js?v=202609130510";

const DEFAULT_SHEET_ID = "fantasy-critic";

export function createDraftListsController({ getManagerId, request }) {
  const page = document.querySelector("#draft-list");
  const tabs = document.querySelector("#draft-list-tabs");
  const tabsPrevious = document.querySelector("#draft-list-tabs-previous");
  const tabsNext = document.querySelector("#draft-list-tabs-next");
  const itemsView = document.querySelector("#draft-list-items");
  const status = document.querySelector("#draft-list-status");
  const filterToggle = document.querySelector("#draft-list-filter-toggle");
  const filters = document.querySelector("#draft-list-filters");
  const entryAfter = document.querySelector("#draft-list-entry-after");
  const showArchived = document.querySelector("#draft-list-show-archived");
  const showDrafted = document.querySelector("#draft-list-show-drafted");
  const showUnavailable = document.querySelector("#draft-list-show-unavailable");
  const clearFilters = document.querySelector("#draft-list-clear-filters");
  const addButton = document.querySelector("#draft-list-add-button");
  const newSheetButton = document.querySelector("#draft-list-new-sheet-button");
  const deleteSheetButton = document.querySelector("#draft-list-delete-sheet-button");
  const itemDialog = document.querySelector("#draft-list-item-dialog");
  const itemForm = document.querySelector("#draft-list-item-form");
  const itemDialogTitle = document.querySelector("#draft-list-item-dialog-title");
  const itemIdInput = document.querySelector("#draft-list-item-id");
  const itemNameInput = document.querySelector("#draft-list-item-name");
  const itemReleaseDateInput = document.querySelector("#draft-list-item-release-date");
  const itemRankInput = document.querySelector("#draft-list-item-rank");
  const itemDataUrlInput = document.querySelector("#draft-list-item-data-url");
  const itemImageUrlInput = document.querySelector("#draft-list-item-image-url");
  const itemNotesInput = document.querySelector("#draft-list-item-notes");
  const itemArchivedInput = document.querySelector("#draft-list-item-archived");
  const itemDraftedInput = document.querySelector("#draft-list-item-drafted");
  const itemUnavailableInput = document.querySelector("#draft-list-item-unavailable");
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
    showArchived: false,
    showDrafted: false,
    showUnavailable: false,
    items: [],
  };
  let draggedItemId = "";
  let draggedSheetId = "";
  let didMovePointer = false;
  let tabResizeObserver = null;

  function initialize() {
    if (state.initialized || !page) return;
    state.initialized = true;
    page.addEventListener("click", handleClick);
    page.addEventListener("change", handleChange);
    tabs?.addEventListener("scroll", updateTabPagination, { passive: true });
    if (tabs && typeof ResizeObserver === "function") {
      tabResizeObserver = new ResizeObserver(updateTabPagination);
      tabResizeObserver.observe(tabs);
    } else {
      window.addEventListener("resize", updateTabPagination);
    }
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
      return Promise.resolve();
    }

    if (state.loadedManagerId && state.loadedManagerId !== managerId) {
      reset();
    }

    render();
    if (!state.loading && state.loadedManagerId !== managerId) return load();
    return state.loadPromise || Promise.resolve();
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
    state.showArchived = false;
    state.showDrafted = false;
    state.showUnavailable = false;
    state.items = [];
    draggedItemId = "";
    draggedSheetId = "";
    didMovePointer = false;
    if (entryAfter) entryAfter.value = "";
    if (showArchived) showArchived.checked = false;
    if (showDrafted) showDrafted.checked = false;
    if (showUnavailable) showUnavailable.checked = false;
    closeDialog(itemDialog);
    closeDialog(sheetDialog);
  }

  function render() {
    if (!page) return;
    syncControls();
    publishView();
  }

  function renderSignedOut() {
    publishView({ signedOut: true });
    setPageStatus("");
  }

  function publishView({ signedOut = false } = {}) {
    const sheet = signedOut ? null : getActiveSheet();
    const allItems = getSheetItems(sheet?.id);
    const items = allItems.filter((item) => {
      if (state.entryAfter && getEntryDateKey(item.entryDate) <= state.entryAfter) return false;
      const isMarked = item.archived || item.drafted || item.unavailable;
      if (!isMarked) return true;
      return (item.archived && state.showArchived)
        || (item.drafted && state.showDrafted)
        || (item.unavailable && state.showUnavailable);
    });
    const hasFilters = hasActiveFilters();
    const detail = {
      activeSheetId: state.activeSheetId,
      emptyAction: state.error && !state.loadedManagerId
        ? "retry"
        : !sheet
          ? ""
          : items.length
            ? ""
            : hasFilters && allItems.length
              ? "clear"
              : allItems.length
                ? "filters"
                : "add",
      emptyLabel: signedOut
        ? "Sign in to open your Draft List."
        : state.error && !state.loadedManagerId
          ? state.error
          : !sheet
            ? "Create a sheet to begin your Draft List."
            : items.length
              ? ""
              : hasFilters && allItems.length
                ? "No entries match the current filters."
                : allItems.length
                  ? "No active entries. Use filters to show marked entries."
                  : `No items have been added to ${sheet.name} yet.`,
      items: signedOut ? [] : items.map((item) => ({
        ...item,
        releaseLabel: item.releaseDate ? formatDate(item.releaseDate) : "Date TBD",
      })),
      loading: !signedOut && state.loading && !state.loadedManagerId,
      sheets: signedOut ? [] : state.sheets,
    };
    window.__boxThisLapDraftListView = detail;
    window.dispatchEvent(new CustomEvent("boxthislap:draft-list", { detail }));
    window.requestAnimationFrame(() => {
      keepActiveTabInView();
      updateTabPagination();
    });
  }

  function syncControls() {
    const hasSheet = Boolean(getActiveSheet());
    const hasFilters = hasActiveFilters();
    if (filterToggle) {
      filterToggle.classList.toggle("is-active", state.showFilters || hasFilters);
      filterToggle.setAttribute("aria-expanded", String(state.showFilters));
      filterToggle.setAttribute("aria-label", `${state.showFilters ? "Hide" : "Show"} Draft List filters`);
    }
    if (filters) filters.hidden = !state.showFilters;
    if (entryAfter && entryAfter.value !== state.entryAfter) entryAfter.value = state.entryAfter;
    if (showArchived && showArchived.checked !== state.showArchived) showArchived.checked = state.showArchived;
    if (showDrafted && showDrafted.checked !== state.showDrafted) showDrafted.checked = state.showDrafted;
    if (showUnavailable && showUnavailable.checked !== state.showUnavailable) showUnavailable.checked = state.showUnavailable;
    if (clearFilters) clearFilters.disabled = !hasFilters;
    if (addButton) addButton.disabled = state.loading || !hasSheet;
    if (newSheetButton) newSheetButton.disabled = state.loading;
    if (deleteSheetButton) {
      deleteSheetButton.hidden = !hasSheet || Boolean(getActiveSheet()?.isSystem);
      deleteSheetButton.disabled = state.loading;
    }
    setPageStatus(state.error || state.message, Boolean(state.error));
  }

  function updateTabPagination() {
    if (!tabs || !tabsPrevious || !tabsNext) return;
    const maxScrollLeft = Math.max(0, tabs.scrollWidth - tabs.clientWidth);
    const hasOverflow = maxScrollLeft > 1;
    tabsPrevious.hidden = !hasOverflow;
    tabsNext.hidden = !hasOverflow;
    tabsPrevious.disabled = !hasOverflow || tabs.scrollLeft <= 1;
    tabsNext.disabled = !hasOverflow || tabs.scrollLeft >= maxScrollLeft - 1;
  }

  function scrollTabs(direction) {
    if (!tabs) return;
    const distance = Math.max(120, Math.round(tabs.clientWidth * 0.72));
    tabs.scrollBy({ left: distance * direction, behavior: "smooth" });
  }

  function keepActiveTabInView() {
    const activeTab = tabs?.querySelector("[data-draft-list-tab].is-active");
    if (!tabs || !activeTab) return;
    const padding = 8;
    const stripBounds = tabs.getBoundingClientRect();
    const tabBounds = activeTab.getBoundingClientRect();

    if (tabBounds.left < stripBounds.left + padding) {
      tabs.scrollLeft = Math.max(0, tabs.scrollLeft + tabBounds.left - stripBounds.left - padding);
    } else if (tabBounds.right > stripBounds.right - padding) {
      tabs.scrollLeft = Math.min(tabs.scrollWidth - tabs.clientWidth, tabs.scrollLeft + tabBounds.right - stripBounds.right + padding);
    }
  }

  function handleClick(event) {
    if (event.target.closest("#draft-list-tabs-previous")) {
      scrollTabs(-1);
      return;
    }
    if (event.target.closest("#draft-list-tabs-next")) {
      scrollTabs(1);
      return;
    }
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
    if (event.target.closest("[data-draft-list-show-filters]")) {
      state.showFilters = true;
      render();
      return;
    }
    if (event.target.closest("#draft-list-new-sheet-button")) {
      openSheetDialog();
      return;
    }
    if (event.target.closest("#draft-list-delete-sheet-button")) {
      void deleteActiveSheet();
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
    if (event.target === entryAfter) state.entryAfter = entryAfter.value || "";
    else if (event.target === showArchived) state.showArchived = showArchived.checked;
    else if (event.target === showDrafted) state.showDrafted = showDrafted.checked;
    else if (event.target === showUnavailable) state.showUnavailable = showUnavailable.checked;
    else return;
    render();
  }

  function clearEntryFilter() {
    state.entryAfter = "";
    state.showArchived = false;
    state.showDrafted = false;
    state.showUnavailable = false;
    if (entryAfter) entryAfter.value = "";
    render();
  }

  function hasActiveFilters() {
    return Boolean(state.entryAfter || state.showArchived || state.showDrafted || state.showUnavailable);
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
    itemNotesInput.value = item?.notes || "";
    const notesDetails = itemNotesInput.closest("details");
    if (notesDetails) notesDetails.open = Boolean(item?.notes);
    itemArchivedInput.checked = Boolean(item?.archived);
    itemDraftedInput.checked = Boolean(item?.drafted);
    itemUnavailableInput.checked = Boolean(item?.unavailable);
    itemDialogTitle.textContent = `${item ? "Edit" : "Add"} ${sheet.name} Item`;
    itemDelete.hidden = !item;
    setStatus(itemStatus, "");
    openContainedDialog({ dialog: itemDialog, initialFocus: itemNameInput });
  }

  function openSheetDialog() {
    if (!sheetDialog || !sheetForm) return;
    sheetForm.reset();
    setStatus(sheetStatus, "");
    openContainedDialog({ dialog: sheetDialog, initialFocus: sheetNameInput });
  }

  async function handleItemSubmit(event) {
    event.preventDefault();
    const sheet = getActiveSheet();
    if (!sheet || !itemForm) return;
    const itemId = itemIdInput.value.trim();
    const body = {
      archived: itemArchivedInput.checked,
      dataUrl: itemDataUrlInput.value.trim(),
      drafted: itemDraftedInput.checked,
      imageUrl: itemImageUrlInput.value.trim(),
      manualRank: Number(itemRankInput.value),
      name: itemNameInput.value.trim(),
      notes: itemNotesInput.value.trim(),
      releaseDate: itemReleaseDateInput.value,
      revision: Number(sheet.revision || 0),
      unavailable: itemUnavailableInput.checked,
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

  async function deleteActiveSheet() {
    const sheet = getActiveSheet();
    if (!sheet || sheet.isSystem || !window.confirm(`Delete ${sheet.name} and all of its items? This cannot be undone.`)) return;
    deleteSheetButton.disabled = true;
    state.error = "";
    state.message = `Deleting ${sheet.name}...`;
    syncControls();
    try {
      await request(getSheetPath(sheet.id), {
        body: JSON.stringify({ revision: Number(sheet.revision || 0) }),
        method: "DELETE",
      });
      state.sheets = state.sheets.filter((entry) => entry.id !== sheet.id);
      state.items = state.items.filter((entry) => entry.sheetId !== sheet.id);
      state.activeSheetId = state.sheets.find((entry) => entry.id === DEFAULT_SHEET_ID)?.id || state.sheets[0]?.id || "";
      state.message = `${sheet.name} deleted.`;
    } catch (error) {
      state.error = error.message || "Draft List sheet could not be deleted.";
      if (error.status === 409) await reloadAfterConflict();
    } finally {
      render();
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
    publishView();
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
    const item = event.target.closest("[data-draft-list-item-id]");
    event.target.parentElement?.remove();
    item?.classList.remove("has-image");
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
    archived: Boolean(item.archived),
    dataUrl: String(item.dataUrl || ""),
    drafted: Boolean(item.drafted),
    entryDate: String(item.entryDate || ""),
    id: String(item.id || ""),
    imageUrl: String(item.imageUrl || ""),
    notes: String(item.notes || ""),
    name: String(item.name || "Untitled"),
    rank: Number(item.rank || item.manualRank || 0),
    releaseDate: String(item.releaseDate || ""),
    sheetId: String(item.sheetId || ""),
    updatedAt: String(item.updatedAt || ""),
    unavailable: Boolean(item.unavailable),
  };
}

function compareSheets(first, second) {
  return first.position - second.position || first.name.localeCompare(second.name);
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
