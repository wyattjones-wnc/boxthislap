const GUIDE_DATA_CACHE_KEY = "boxThisLapGuideData:v1";

export function createGuideDataLoader({ loadJson, path = "data/guides.json" }) {
  let loadPromise = null;

  return function loadGuideData() {
    if (!loadPromise) {
      loadPromise = Promise.resolve()
        .then(() => loadJson(path))
        .then((snapshot) => {
          validateGuideData(snapshot);
          cacheGuideData(snapshot);
          return snapshot;
        })
        .catch((error) => {
          const cached = readCachedGuideData();
          if (cached) {
            console.warn("Unable to refresh Guides; using the last valid snapshot.", error);
            return cached;
          }
          loadPromise = null;
          throw error;
        });
    }

    return loadPromise;
  };
}

function validateGuideData(snapshot) {
  if (snapshot?.schemaVersion !== 1 || !Array.isArray(snapshot.guides) || !Array.isArray(snapshot.steps)) {
    throw new Error("Guide data has an unsupported format.");
  }
  if (!snapshot.guides.every((guide) => String(guide?.id || "").trim() && String(guide?.name || "").trim())) {
    throw new Error("Guide data contains an invalid Guide.");
  }
  if (!snapshot.steps.every((step) =>
    String(step?.id || "").trim() && String(step?.guideId || "").trim() && String(step?.stepId || "").trim()
  )) {
    throw new Error("Guide data contains an invalid checklist step.");
  }
}

function cacheGuideData(snapshot) {
  try {
    localStorage.setItem(GUIDE_DATA_CACHE_KEY, JSON.stringify(snapshot));
  } catch {
    // The deployed JSON remains the source of truth when browser storage is unavailable or full.
  }
}

function readCachedGuideData() {
  try {
    const snapshot = JSON.parse(localStorage.getItem(GUIDE_DATA_CACHE_KEY) || "null");
    validateGuideData(snapshot);
    return snapshot;
  } catch {
    return null;
  }
}
