const QUALIFYING_SESSIONS = ["q3", "q2", "q1"];

export function parseFormulaOneLapTime(value) {
  const text = String(value || "").trim();
  if (!text) return null;
  const parts = text.split(":").map(Number);
  if (parts.some((part) => !Number.isFinite(part))) return null;
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return (parts[0] * 60) + parts[1];
  return null;
}

export function getLastQualifyingTime(result = {}) {
  const recordedSeconds = Number(result.qualifying_unadjusted_seconds ?? result.qualifyingUnadjustedSeconds);
  if (Number.isFinite(recordedSeconds) && recordedSeconds > 0) {
    return { session: "last", seconds: recordedSeconds, time: formatFormulaOneLapTime(recordedSeconds) };
  }
  for (const session of QUALIFYING_SESSIONS) {
    const seconds = parseFormulaOneLapTime(result[session]);
    if (seconds !== null) return { session, seconds, time: String(result[session]).trim() };
  }
  return null;
}

export function getAdjustedQualifyingTimes(first = {}, second = {}) {
  const firstRecorded = Number(first.qualifying_adjusted_seconds ?? first.qualifyingAdjustedSeconds);
  const secondRecorded = Number(second.qualifying_adjusted_seconds ?? second.qualifyingAdjustedSeconds);
  if (Number.isFinite(firstRecorded) && firstRecorded > 0 && Number.isFinite(secondRecorded) && secondRecorded > 0) {
    return {
      session: String(first.qualifying_adjusted_session || second.qualifying_adjusted_session || "adjusted"),
      first: { seconds: firstRecorded, time: formatFormulaOneLapTime(firstRecorded) },
      second: { seconds: secondRecorded, time: formatFormulaOneLapTime(secondRecorded) },
    };
  }
  for (const session of QUALIFYING_SESSIONS) {
    const firstSeconds = parseFormulaOneLapTime(first[session]);
    const secondSeconds = parseFormulaOneLapTime(second[session]);
    if (firstSeconds !== null && secondSeconds !== null) {
      return {
        session,
        first: { seconds: firstSeconds, time: String(first[session]).trim() },
        second: { seconds: secondSeconds, time: String(second[session]).trim() },
      };
    }
  }
  return null;
}

export function formatFormulaOneLapTime(seconds) {
  const value = Number(seconds);
  if (!Number.isFinite(value) || value <= 0) return "";
  const minutes = Math.floor(value / 60);
  return `${minutes}:${(value - (minutes * 60)).toFixed(3).padStart(6, "0")}`;
}

export function buildFormulaOneQualifyingComparisons(results = [], drivers = []) {
  const driversById = new Map(drivers.map((driver) => [driver.driver_id, driver]));
  const qualifyingResults = results.filter((result) => result.session_type === "qualifying");
  const roundGroups = new Map();

  for (const result of qualifyingResults) {
    const driver = driversById.get(result.driver_id) || {};
    const constructorKey = driver.constructor_id || driver.constructor_name;
    if (!constructorKey) continue;
    const key = `${result.round}:${constructorKey}`;
    if (!roundGroups.has(key)) roundGroups.set(key, []);
    roundGroups.get(key).push({ ...result, driver });
  }

  const comparisons = [];
  for (const group of roundGroups.values()) {
    if (group.length !== 2) continue;
    const [first, second] = [...group].sort((a, b) => getDriverName(a).localeCompare(getDriverName(b)));
    const firstLast = getLastQualifyingTime(first);
    const secondLast = getLastQualifyingTime(second);
    const adjusted = getAdjustedQualifyingTimes(first, second);
    comparisons.push({
      round: Number(first.round),
      constructorId: first.driver.constructor_id || second.driver.constructor_id || "",
      constructorName: first.driver.constructor_name || second.driver.constructor_name || "",
      firstDriverId: first.driver_id,
      firstDriverName: getDriverName(first),
      secondDriverId: second.driver_id,
      secondDriverName: getDriverName(second),
      unadjusted: firstLast && secondLast ? {
        first: firstLast,
        second: secondLast,
        differenceSeconds: firstLast.seconds - secondLast.seconds,
      } : null,
      adjusted: adjusted ? {
        session: adjusted.session,
        first: adjusted.first,
        second: adjusted.second,
        differenceSeconds: adjusted.first.seconds - adjusted.second.seconds,
      } : null,
    });
  }

  return comparisons.sort((a, b) => a.round - b.round || a.constructorName.localeCompare(b.constructorName));
}

export function summarizeFormulaOneQualifyingComparisons(comparisons = []) {
  const groups = new Map();
  for (const comparison of comparisons) {
    const pairKey = [comparison.firstDriverId, comparison.secondDriverId].sort().join(":");
    const key = `${comparison.constructorId || comparison.constructorName}:${pairKey}`;
    if (!groups.has(key)) groups.set(key, { ...comparison, adjustedDifferences: [], unadjustedDifferences: [] });
    const group = groups.get(key);
    if (comparison.adjusted) group.adjustedDifferences.push(comparison.adjusted.differenceSeconds);
    if (comparison.unadjusted) group.unadjustedDifferences.push(comparison.unadjusted.differenceSeconds);
  }

  return [...groups.values()].map((group) => ({
    constructorName: group.constructorName,
    firstDriverName: group.firstDriverName,
    secondDriverName: group.secondDriverName,
    adjusted: summarizeDifferences(group.adjustedDifferences),
    unadjusted: summarizeDifferences(group.unadjustedDifferences),
  })).sort((a, b) => a.constructorName.localeCompare(b.constructorName));
}

function summarizeDifferences(differences) {
  if (!differences.length) return null;
  return {
    averageDifferenceSeconds: differences.reduce((total, value) => total + value, 0) / differences.length,
    firstDriverWins: differences.filter((value) => value < 0).length,
    secondDriverWins: differences.filter((value) => value > 0).length,
    rounds: differences.length,
  };
}

function getDriverName(result) {
  return result.driver?.display_name || result.driver_id;
}
