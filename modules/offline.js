import { updateOfflineSettings } from "./offlineStatus.js";
const PREFIX = "boxthislap-offline-v1:";
const SNAPSHOT_CACHE = "box-this-lap-offline-data-v1";
const STATIC_FALLBACKS = {
  footy: "data/footy-schedule.json",
  "ranking-catalog": "data/rankings.json",
};
const loaded = new Map();
const available = new Set(["footy", "next", "rankings", "account-settings"]);
function validSnapshot(value) {
  return value && Number.isFinite(value.savedAt) && "data" in value;
}
function snapshotUrl(key) {
  return new URL(
    `__offline-data__/${encodeURIComponent(key)}`,
    document.baseURI,
  ).href;
}
async function readSnapshot(key) {
  const candidates = [];
  try {
    const value = JSON.parse(localStorage.getItem(PREFIX + key) || "null");
    if (validSnapshot(value)) candidates.push(value);
  } catch {
    /* Try the independent snapshot store. */
  }
  try {
    const cache = await caches.open(SNAPSHOT_CACHE);
    const response = await cache.match(snapshotUrl(key));
    const value = response ? await response.json() : null;
    if (validSnapshot(value)) candidates.push(value);
  } catch {
    /* Cache storage can also be unavailable. */
  }
  if (candidates.length)
    return candidates.sort((a, b) => b.savedAt - a.savedAt)[0];
  const path = STATIC_FALLBACKS[key];
  if (path) {
    try {
      const response = await caches.match(
        new URL(path, document.baseURI).href,
        { ignoreSearch: true, ignoreVary: true },
      );
      if (response?.ok) {
        const data = await response.json();
        const savedAt =
          Number(response.headers.get("X-BoxThisLap-Saved-At")) ||
          Date.parse(response.headers.get("Date") || "") ||
          Date.parse(data.generatedAt || "");
        if (Number.isFinite(savedAt)) return { data, savedAt };
      }
    } catch {
      /* An offline installation may not exist yet. */
    }
  }
  return null;
}
async function saveSnapshot(key, value) {
  let persisted = false;
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
    persisted = true;
  } catch {
    /* Fall back to cache storage. */
  }
  try {
    const cache = await caches.open(SNAPSHOT_CACHE);
    await cache.put(
      snapshotUrl(key),
      new Response(JSON.stringify(value), {
        headers: { "Content-Type": "application/json" },
      }),
    );
    persisted = true;
  } catch {
    /* Report unavailable storage in Account Settings. */
  }
  return persisted;
}
export async function loadOfflineSnapshot(key, loader) {
  const saved = await readSnapshot(key);
  const restore = () => {
    if (!saved)
      throw new Error(
        "No saved data is available. Open this page online first.",
      );
    loaded.set(key, {
      savedAt: saved.savedAt,
      cached: true,
      persisted: true,
      sourceUpdatedAt: saved.data?.generatedAt,
    });
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
  const persisted = await saveSnapshot(key, { savedAt, data });
  loaded.set(key, {
    savedAt,
    cached: false,
    persisted,
    sourceUpdatedAt: data?.generatedAt,
  });
  window.dispatchEvent(new Event("boxthislap:offline-data"));
  return data;
}

export function initializeOfflineMode() {
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
    const state = navigator.onLine
      ? offlineReady
        ? "Offline access is ready on this device."
        : "Preparing offline access…"
      : "You’re offline.";
    const details = ["footy", "next", "rankings"]
      .map((page) => {
        const entries = [...loaded].filter(
          ([key]) => key === page || key.startsWith(page + ":"),
        );
        const saved = entries.filter(([, value]) => value.persisted);
        const label =
          page === "footy" ? "Footy" : page === "next" ? "Next" : "Ranking";
        if (!saved.length)
          return `${label}: ${entries.length ? "couldn’t save this load" : "no saved load yet"}.`;
        const date = new Date(
          Math.min(...saved.map(([, value]) => value.savedAt)),
        ).toLocaleString();
        const sourceTime = saved.find(([, value]) => value.sourceUpdatedAt)?.[1]
          .sourceUpdatedAt;
        return `${label} saved ${date}${sourceTime ? ` (schedule updated ${new Date(sourceTime).toLocaleString()})` : ""}.`;
      })
      .join(" ");
    const nextText = `${state} ${details} Editing, 10/10 Performances, Seen Matches, and full league schedules need a connection.`;
    updateOfflineSettings(nextText);
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
        const keys = ["footy", "next"];
        try {
          const managerId = JSON.parse(
            localStorage.getItem("boxThisLapManagerSession") || "null",
          )?.managerId;
          if (managerId)
            keys.push(
              ...["games", "mcu", "movies", "tv"].map(
                (kind) => `rankings:${managerId}:${kind}`,
              ),
            );
        } catch {
          /* Signed-out settings do not show manager snapshots. */
        }
        void Promise.all(
          keys.map(async (key) => {
            if (loaded.has(key)) return;
            const saved = await readSnapshot(key);
            if (saved && !loaded.has(key))
              loaded.set(key, {
                savedAt: saved.savedAt,
                persisted: true,
                sourceUpdatedAt: saved.data?.generatedAt,
              });
          }),
        ).then(update);
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
