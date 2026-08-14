export function createPlatinumsController({ loadSheet }) {
  const grid = document.querySelector("#admin-platinums-grid");
  let items = null;
  let loadPromise = null;
  let expandedId = "";

  grid?.addEventListener("click", handleClick);

  function renderPage() {
    if (!grid) return Promise.resolve([]);

    if (items) {
      renderItems();
      return Promise.resolve(items);
    }

    renderLoading();
    if (!loadPromise) {
      loadPromise = loadSheet("platinums")
        .then((rows) => {
          items = rows
            .map(normalizePlatinum)
            .filter((item) => item.id && item.imageUrl)
            .sort(comparePlatinums);
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
      grid.innerHTML = `<p class="table-message">No platinum icons are available yet.</p>`;
      return;
    }

    grid.innerHTML = items.map((item) => {
      const expanded = item.id === expandedId;
      const label = [item.platinumName, item.gameName].filter(Boolean).join(" - ") || `Platinum ${item.number || item.id}`;
      return `
        <button class="platinum-tile${expanded ? " is-expanded" : ""}" type="button" data-platinum-id="${escapeAttribute(item.id)}" aria-expanded="${expanded}" aria-label="${expanded ? "Hide" : "Show"} ${escapeAttribute(label)}">
          <span class="platinum-image-frame"><img src="${escapeAttribute(item.imageUrl)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer"></span>
          <span class="platinum-caption"${expanded ? "" : " hidden"}>${escapeHtml(label)}</span>
        </button>
      `;
    }).join("");
  }

  function renderLoading() {
    grid.setAttribute("aria-busy", "true");
    grid.innerHTML = Array.from({ length: 8 }, () => `<span class="platinum-skeleton"></span>`).join("");
  }

  function renderError(error) {
    grid.setAttribute("aria-busy", "false");
    grid.innerHTML = `
      <div class="platinums-error">
        <p class="table-message">Unable to load Platinums: ${escapeHtml(error?.message || "Please try again.")}</p>
        <button class="action-button" type="button" data-platinums-retry>Try Again</button>
      </div>
    `;
  }

  function handleClick(event) {
    if (event.target.closest("[data-platinums-retry]")) {
      renderPage();
      return;
    }

    const tile = event.target.closest("[data-platinum-id]");
    if (!tile) return;
    const itemId = tile.dataset.platinumId || "";
    expandedId = expandedId === itemId ? "" : itemId;
    renderItems();
    grid.querySelector(`[data-platinum-id="${CSS.escape(itemId)}"]`)?.focus();
  }

  return { renderPage };
}

function normalizePlatinum(row) {
  return {
    gameName: String(row["Game Name"] || row.gameName || "").trim(),
    id: String(row.ID || row.Id || row.id || "").trim(),
    imageUrl: getSafeImageUrl(row["Image Url"] || row["Image URL"] || row.imageUrl),
    number: String(row["Platinum Number"] || row.number || "").trim(),
    platinumName: String(row["Platinum Name"] || row.platinumName || "").trim(),
  };
}

function comparePlatinums(first, second) {
  const firstNumber = Number(first.number);
  const secondNumber = Number(second.number);
  if (Number.isFinite(firstNumber) && Number.isFinite(secondNumber) && firstNumber !== secondNumber) {
    return firstNumber - secondNumber;
  }
  return first.id.localeCompare(second.id, undefined, { numeric: true });
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
