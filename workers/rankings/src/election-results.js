const SOURCE = "https://apps.npr.org/2026-election-results/data/senate.json";
export const RESULTS_CACHE_SECONDS = 120;
const inFlight = new Map();

function unavailable() {
  return Object.assign(new Error("Live Senate results are unavailable."), {
    status: 502,
  });
}

export function normalizeSenateResults(data) {
  if (!Array.isArray(data?.results)) throw unavailable();
  const races = data.results.filter(
    (race) =>
      race &&
      ["AK", "MS"].includes(race.state) &&
      race.office === "S" &&
      race.test === false &&
      race.resultsType === "live",
  );
  for (const state of ["AK", "MS"]) {
    const matches = races.filter((race) => race.state === state);
    if (matches.length !== 1) throw unavailable();
    const race = matches[0];
    if (
      typeof race.id !== "string" ||
      !/^\d{1,12}$/.test(race.id) ||
      !Number.isSafeInteger(race.updated) ||
      race.updated < 0 ||
      typeof race.officeName !== "string" ||
      typeof race.raceCallStatus !== "string" ||
      !Array.isArray(race.candidates) ||
      race.candidates.length < 1 ||
      race.candidates.length > 100
    )
      throw unavailable();
    const ids = new Set();
    for (const candidate of race.candidates) {
      if (
        !candidate ||
        typeof candidate.id !== "string" ||
        ids.has(candidate.id) ||
        typeof candidate.first !== "string" ||
        typeof candidate.last !== "string" ||
        typeof candidate.party !== "string" ||
        !Number.isSafeInteger(candidate.votes) ||
        candidate.votes < 0 ||
        !Number.isFinite(candidate.percent) ||
        candidate.percent < 0 ||
        candidate.percent > 1
      )
        throw unavailable();
      ids.add(candidate.id);
    }
  }
  return races;
}

export async function loadLiveSenateResults(
  url,
  { cache = globalThis.caches?.default, fetcher = fetch } = {},
) {
  // Cache only normalized, validated source data. Public responses receive CORS
  // separately, so a cached response cannot contain another visitor's origin.
  const key = new Request(new URL("/__cache/senate-results-2026-v1", url));
  const fresh = new URL(url).searchParams.get("fresh") === "1";
  const hit = fresh
    ? undefined
    : await cache?.match(key).catch(() => undefined);
  if (hit) return hit.json();
  if (inFlight.has(key.url)) return inFlight.get(key.url);
  const job = (async () => {
    let source;
    try {
      source = await fetcher(SOURCE, {
        headers: {
          Accept: "application/json",
          ...(fresh ? { "Cache-Control": "no-cache" } : {}),
        },
        ...(fresh ? { cache: "no-store" } : {}),
        signal: AbortSignal.timeout(10000),
      });
    } catch {
      throw unavailable();
    }
    if (!source.ok) throw unavailable();
    let races;
    try {
      races = normalizeSenateResults(await source.json());
    } catch {
      throw unavailable();
    }
    const results = { year: 2026, fetchedAt: new Date().toISOString(), races };
    if (cache)
      await cache
        .put(
          key,
          new Response(JSON.stringify(results), {
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": `public, max-age=${RESULTS_CACHE_SECONDS}`,
            },
          }),
        )
        .catch(() => {});
    return results;
  })();
  inFlight.set(key.url, job);
  try {
    return await job;
  } finally {
    inFlight.delete(key.url);
  }
}
