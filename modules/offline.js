const PREFIX = "boxthislap-offline-v1:";
const loaded = new Map();
const available = new Set(["footy", "next", "rankings"]);

export async function loadOfflineSnapshot(key, loader) {
  let saved;
  try {
    saved = JSON.parse(localStorage.getItem(PREFIX + key) || "null");
    if (!saved || !Number.isFinite(saved.savedAt) || !("data" in saved))
      saved = null;
  } catch {
    saved = null;
  }
  const restore = () => {
    if (!saved)
      throw new Error(
        "No saved data is available. Open this page online first.",
      );
    loaded.set(key, { savedAt: saved.savedAt, cached: true });
    window.dispatchEvent(new Event("boxthislap:offline-data"));
    return saved.data;
  };
  if (!navigator.onLine) return restore();
  let data;
  try {
    data = await loader();
  } catch (error) {
    if (saved && (!error.status || error.status >= 500)) return restore();
    throw error;
  }
  const savedAt = Date.now();
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({ savedAt, data }));
  } catch {
    /* Storage may be full or unavailable. */
  }
  loaded.set(key, { savedAt, cached: false });
  window.dispatchEvent(new Event("boxthislap:offline-data"));
  return data;
}

export function initializeOfflineMode() {
  const banner = document.createElement("p");
  banner.className = "offline-status";
  banner.setAttribute("role", "status");
  document.body.prepend(banner);
  const disabled = new Map();
  let offlineReady = false;
  const blocked = (element) => {
    if (navigator.onLine) return false;
    const href = element.getAttribute("href");
    if (href?.startsWith("#"))
      return !available.has(href.slice(1).split("?")[0]);
    return element.matches(
      "#next-add-button, #next-edit-mode-filter, [data-next-edit], [data-next-complete], #ranking-manager-select, #ranking-add-button, #ranking-compare-button, #ranking-normalize-button, #ranking-elo-to-manual-button, .ranking-row-action, .ranking-drag-handle, [data-ranking-empty-add], #footy-competition-toggle, #footy-competition-select, #footy-notification-toggle, [data-footy-match-notification], [data-footy-perfect-match], [data-footy-seen-match], [data-footy-note-edit], [data-footy-next-export], #image-cache-toggle",
    );
  };
  const update = () => {
    const page = window.location.hash.slice(1).split("?")[0] || "footy";
    const entries = [...loaded].filter(
      ([key]) => key === page || key.startsWith(page + ":"),
    );
    const cached = entries.some(([, value]) => value.cached);
    const timestamp = entries.length
      ? new Date(
          Math.min(...entries.map(([, value]) => value.savedAt)),
        ).toLocaleString()
      : "";
    const message = !navigator.onLine
      ? `Offline — ${available.has(page) ? "viewing saved data" : "this page needs a connection"}. Editing, 10/10 Performances, Seen Matches, and full league schedules are unavailable.`
      : cached
        ? "Connection unavailable — showing saved data."
        : "";
    const readiness =
      navigator.onLine && timestamp
        ? offlineReady
          ? " Offline ready on this device."
          : " Preparing offline access…"
        : "";
    const text = `${message}${timestamp ? ` ${cached || !navigator.onLine ? "Saved" : "Loaded"}: ${timestamp}.` : !navigator.onLine && available.has(page) ? " No saved load is available yet." : ""}${readiness}`;
    if (banner.textContent !== text) banner.textContent = text;
    banner.hidden = !text;
    document
      .querySelectorAll('a, button, input, select, [role="button"]')
      .forEach((element) => {
        if (blocked(element)) {
          if (!disabled.has(element))
            disabled.set(element, {
              disabled: element.disabled,
              title: element.getAttribute("title"),
              aria: element.getAttribute("aria-disabled"),
            });
          if ("disabled" in element && !element.disabled)
            element.disabled = true;
          if (element.getAttribute("aria-disabled") !== "true")
            element.setAttribute("aria-disabled", "true");
          if (element.title !== "Unavailable offline")
            element.title = "Unavailable offline";
        } else if (disabled.has(element)) {
          const previous = disabled.get(element);
          if ("disabled" in element) element.disabled = previous.disabled;
          for (const [name, value] of [
            ["title", previous.title],
            ["aria-disabled", previous.aria],
          ]) {
            if (value === null) element.removeAttribute(name);
            else element.setAttribute(name, value);
          }
          disabled.delete(element);
        }
      });
  };
  document.addEventListener(
    "submit",
    (event) => {
      if (!navigator.onLine) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true,
  );
  document.addEventListener(
    "click",
    (event) => {
      const target = event.target.closest?.('a, button, [role="button"]');
      if (target && blocked(target)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    true,
  );
  for (const name of [
    "online",
    "offline",
    "hashchange",
    "boxthislap:offline-data",
    "boxthislap:page-shown",
  ])
    window.addEventListener(name, update);
  if ("serviceWorker" in navigator && window.isSecureContext) {
    const requestStatus = () =>
      navigator.serviceWorker.controller?.postMessage({
        type: "OFFLINE_STATUS",
      });
    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data?.type === "OFFLINE_READY") {
        offlineReady = true;
        update();
      }
    });
    navigator.serviceWorker.addEventListener("controllerchange", requestStatus);
    void navigator.serviceWorker.ready.then(requestStatus);
    requestStatus();
  }
  new MutationObserver(update).observe(document.body, {
    childList: true,
    subtree: true,
  });
  update();
}
