export function createPlatinumsController({ loadSheet }) {
  const favoriteDetails = document.querySelector("#favorite-trophies-card");
  const platinums = createTrophyListController({
    emptyMessage: "No platinum icons are available yet.",
    errorLabel: "Platinums",
    grid: document.querySelector("#admin-platinums-grid"),
    initialItemLimit: 6,
    loadSheet,
    showMoreButton: document.querySelector("#admin-platinums-show-more"),
    source: "platinums",
    sortItems: comparePlatinums,
  });
  const favorites = createTrophyListController({
    emptyMessage: "No favorite trophies are available yet.",
    errorLabel: "Favorite Trophies",
    grid: document.querySelector("#favorite-trophies-grid"),
    loadSheet,
    showDescription: true,
    source: "favoriteTrophies",
    sortItems: compareTrophyNumbers,
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
  emptyMessage,
  errorLabel,
  grid,
  initialItemLimit = 0,
  loadSheet,
  showMoreButton = null,
  showDescription = false,
  sortItems,
  source,
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
      loadPromise = loadSheet(source)
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
    expandedId = expandedId === itemId ? "" : itemId;
    renderItems();
    grid.querySelector(`[data-trophy-id="${CSS.escape(itemId)}"]`)?.focus();
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

  return { renderPage };
}

function normalizeTrophy(row) {
  return {
    description: String(row.Description || row.description || "").trim(),
    gameName: String(row["Game Name"] || row.gameName || "").trim(),
    id: String(row.ID || row.Id || row.id || "").trim(),
    imageUrl: getSafeImageUrl(row["Image Url"] || row["Image URL"] || row.imageUrl),
    number: String(row["Platinum Number"] || row.number || "").trim(),
    platinumName: String(row["Platinum Name"] || row.platinumName || "").trim(),
    trophyNumber: String(row["Trophy Number"] || row.trophyNumber || "").trim(),
  };
}

function comparePlatinums(first, second) {
  return compareNumericDescending(first.number, second.number) || compareIdsDescending(first, second);
}

function compareTrophyNumbers(first, second) {
  return compareNumericDescending(first.trophyNumber, second.trophyNumber) || compareIdsDescending(first, second);
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
