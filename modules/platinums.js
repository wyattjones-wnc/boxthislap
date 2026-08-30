export function createPlatinumsController({ endpoint, getAccessToken }) {
  const favoriteDetails = document.querySelector("#favorite-trophies-card");
  const request = async (path) => {
    const token = await getAccessToken();
    const response = await fetch(`${String(endpoint).replace(/\/$/, "")}${path}`, {
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
    });
    const value = await response.json().catch(() => null);
    if (!response.ok || !value?.ok) throw new Error(value?.error || `Trophy request failed (${response.status}).`);
    return value;
  };
  const platinums = createTrophyListController({
    countElement: document.querySelector("#admin-platinums-count"),
    emptyMessage: "No platinum icons are available yet.",
    errorLabel: "Platinums",
    grid: document.querySelector("#admin-platinums-grid"),
    initialItemLimit: 6,
    loadItems: () => request("/api/psn/platinums?limit=250").then((value) => value.items || []),
    showMoreButton: document.querySelector("#admin-platinums-show-more"),
    sortItems: comparePlatinums,
  });
  const favorites = createTrophyListController({
    emptyMessage: "No favorite trophies are available yet.",
    errorLabel: "Favorite Trophies",
    grid: document.querySelector("#favorite-trophies-grid"),
    loadItems: () => request("/api/psn/trophy-log?view=favorites&limit=250").then((value) => value.items || []),
    showDescription: true,
    sortItems: compareEarnedDates,
  });

  window.addEventListener("boxthislap:trophy-preferences-changed", () => {
    favorites.invalidate();
  });

  favoriteDetails?.addEventListener("toggle", () => {
    if (favoriteDetails.open) {
      void favorites.renderPage().catch(() => {});
    }
  });

  function renderPage() {
    const loads = [platinums.renderPage()];
    if (favoriteDetails?.open) loads.push(favorites.renderPage());
    return Promise.all(loads);
  }

  return { renderPage };
}

function createTrophyListController({
  countElement = null,
  emptyMessage,
  errorLabel,
  grid,
  initialItemLimit = 0,
  loadItems,
  showMoreButton = null,
  showDescription = false,
  sortItems,
}) {
  let items = null;
  let loadPromise = null;
  let expandedId = "";
  let showAll = false;

  grid?.addEventListener("click", handleClick);
  showMoreButton?.addEventListener("click", handleShowMoreClick);

  function renderPage() {
    if (!grid) return Promise.resolve([]);

    if (items) {
      renderItems();
      return Promise.resolve(items);
    }

    renderLoading();
    if (!loadPromise) {
      loadPromise = loadItems()
        .then((rows) => {
          items = rows
            .map(normalizeTrophy)
            .filter((item) => item.id && item.imageUrl)
            .sort(sortItems);
          renderItems();
          return items;
        })
        .catch((error) => {
          loadPromise = null;
          renderError(error);
          throw error;
        });
    }

    return loadPromise;
  }

  function renderItems() {
    if (!grid) return;
    grid.setAttribute("aria-busy", "false");
    if (countElement) {
      const platinumNumber = items[0]?.number || String(items.length);
      countElement.textContent = `(${platinumNumber})`;
    }

    if (!items.length) {
      grid.innerHTML = `<p class="table-message">${escapeHtml(emptyMessage)}</p>`;
      return;
    }

    const visibleItems = initialItemLimit && !showAll ? items.slice(0, initialItemLimit) : items;
    grid.innerHTML = visibleItems.map((item) => {
      const expanded = item.id === expandedId;
      const label = [item.platinumName, item.gameName].filter(Boolean).join(" - ") || `Trophy ${item.trophyNumber || item.id}`;
      const metadata = [
        item.number ? `Platinum Number: ${item.number}` : "",
        item.trophyNumber ? `Trophy Number: ${item.trophyNumber}` : "",
        item.completionSeconds !== null ? `Time to Platinum: ${formatElapsed(item.completionSeconds)}` : "",
      ].filter(Boolean);
      const accessibleLabel = [label, ...metadata].join(", ");
      const description = showDescription && item.description
        ? `<span class="platinum-description">${escapeHtml(item.description)}</span>`
        : "";
      return `
        <button class="platinum-tile${expanded ? " is-expanded" : ""}" type="button" data-trophy-id="${escapeAttribute(item.id)}" aria-expanded="${expanded}" aria-label="${expanded ? "Hide" : "Show"} ${escapeAttribute(accessibleLabel)}">
          <span class="platinum-image-frame"><img src="${escapeAttribute(item.imageUrl)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer"></span>
          <span class="platinum-caption"${expanded ? "" : " hidden"}>
            <strong>${escapeHtml(label)}</strong>
            ${metadata.length ? `<small>${metadata.map((value) => `<span class="trophy-metadata-chip">${escapeHtml(value)}</span>`).join("")}</small>` : ""}
            ${description}
          </span>
        </button>
      `;
    }).join("");

    renderShowMoreButton();
  }

  function renderLoading() {
    grid.setAttribute("aria-busy", "true");
    const skeletonCount = initialItemLimit || 8;
    grid.innerHTML = Array.from({ length: skeletonCount }, () => `<span class="platinum-skeleton"></span>`).join("");
  }

  function renderError(error) {
    grid.setAttribute("aria-busy", "false");
    grid.innerHTML = `
      <div class="platinums-error">
        <p class="table-message">Unable to load ${escapeHtml(errorLabel)}: ${escapeHtml(error?.message || "Please try again.")}</p>
        <button class="action-button" type="button" data-trophies-retry>Try Again</button>
      </div>
    `;
  }

  function handleClick(event) {
    if (event.target.closest("[data-trophies-retry]")) {
      void renderPage().catch(() => {});
      return;
    }

    const tile = event.target.closest("[data-trophy-id]");
    if (!tile) return;
    const itemId = tile.dataset.trophyId || "";
    const previousExpandedId = expandedId;
    expandedId = expandedId === itemId ? "" : itemId;
    if (previousExpandedId && previousExpandedId !== itemId) {
      setTileExpanded(grid.querySelector(`[data-trophy-id="${CSS.escape(previousExpandedId)}"]`), false);
    }
    setTileExpanded(tile, expandedId === itemId);
    tile.focus();
  }

  function setTileExpanded(tile, expanded) {
    if (!tile) return;
    tile.classList.toggle("is-expanded", expanded);
    tile.setAttribute("aria-expanded", String(expanded));
    const accessibleLabel = (tile.getAttribute("aria-label") || "").replace(/^(?:Hide|Show) /, "");
    tile.setAttribute("aria-label", `${expanded ? "Hide" : "Show"} ${accessibleLabel}`);
    const caption = tile.querySelector(".platinum-caption");
    if (caption) caption.hidden = !expanded;
  }

  function handleShowMoreClick() {
    showAll = !showAll;
    renderItems();
    showMoreButton?.focus();
  }

  function renderShowMoreButton() {
    if (!showMoreButton) return;
    const hasMoreItems = Boolean(initialItemLimit && items?.length > initialItemLimit);
    showMoreButton.hidden = !hasMoreItems;
    showMoreButton.textContent = showAll ? "Show Less" : "Show More";
    showMoreButton.setAttribute("aria-expanded", String(showAll));
  }

  function invalidate() {
    items = null;
    loadPromise = null;
    expandedId = "";
  }

  return { invalidate, renderPage };
}

function normalizeTrophy(row) {
  return {
    description: String(row.description || "").trim(),
    earnedAt: String(row.earnedAt || "").trim(),
    gameName: String(row.gameName || "").trim(),
    id: `${String(row.gameId || "").trim()}:${String(row.id ?? "").trim()}`,
    imageUrl: getSafeImageUrl(row.iconUrl),
    number: String(row.platinumNumber || "").trim(),
    platinumName: String(row.name || "").trim(),
    trophyNumber: String(row.trophyNumber || "").trim(),
    completionSeconds: row.completionSeconds === null || row.completionSeconds === undefined ? null : Number(row.completionSeconds),
  };
}

function formatElapsed(seconds) {
  const value = Math.max(0, Number(seconds) || 0);
  const days = Math.floor(value / 86400);
  const hours = Math.floor((value % 86400) / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  if (days) return `${days}d ${hours}h`;
  if (hours) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function comparePlatinums(first, second) {
  return compareNumericDescending(first.number, second.number) || compareIdsDescending(first, second);
}

function compareEarnedDates(first, second) {
  return String(second.earnedAt || "").localeCompare(String(first.earnedAt || "")) || compareIdsDescending(first, second);
}

function compareNumericDescending(first, second) {
  const firstNumber = Number(first);
  const secondNumber = Number(second);
  return Number.isFinite(firstNumber) && Number.isFinite(secondNumber) ? secondNumber - firstNumber : 0;
}

function compareIdsDescending(first, second) {
  return second.id.localeCompare(first.id, undefined, { numeric: true });
}

function getSafeImageUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}
