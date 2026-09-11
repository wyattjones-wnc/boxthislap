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
    const storedDriver = driversById.get(result.driver_id) || {};
    const driver = {
      ...storedDriver,
      constructor_id: result.constructor_id || storedDriver.constructor_id || "",
      constructor_name: result.constructor_name || storedDriver.constructor_name || "",
    };
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

export function buildFormulaOneMainDatasets({ year, rounds = [], drivers = [], sessions = [], results = [] } = {}) {
  const resultByKey = new Map(results.map((result) => [`${result.round}:${result.session_type}:${result.driver_id}`, result]));
  const driverById = new Map(drivers.map((driver) => [driver.driver_id, driver]));
  const qualifyingComparisons = buildFormulaOneQualifyingComparisons(results, drivers);
  const comparisonByRoundTeam = new Map(qualifyingComparisons.map((comparison) => [
    `${comparison.round}:${comparison.constructorId || comparison.constructorName}`,
    comparison,
  ]));
  const driverPairs = buildRoundDriverPairs(results, driverById);
  const teammateComparisons = driverPairs.map((pair) => {
    const comparison = comparisonByRoundTeam.get(`${pair.round}:${pair.constructorId || pair.constructorName}`);
    const firstQualifying = resultByKey.get(`${pair.round}:qualifying:${pair.firstDriverId}`);
    const secondQualifying = resultByKey.get(`${pair.round}:qualifying:${pair.secondDriverId}`);
    const firstRace = resultByKey.get(`${pair.round}:race:${pair.firstDriverId}`);
    const secondRace = resultByKey.get(`${pair.round}:race:${pair.secondDriverId}`);
    return {
      year: Number(year), round: pair.round, team: pair.constructorName,
      firstDriver: pair.firstDriverName, secondDriver: pair.secondDriverName,
      firstDriverId: pair.firstDriverId, secondDriverId: pair.secondDriverId,
      unadjustedWinner: comparisonWinner(pair, comparison?.unadjusted),
      unadjustedGapSeconds: absoluteDifference(comparison?.unadjusted?.differenceSeconds),
      adjustedWinner: comparisonWinner(pair, comparison?.adjusted),
      adjustedGapSeconds: absoluteDifference(comparison?.adjusted?.differenceSeconds),
      adjustedSession: comparison?.adjusted?.session?.toUpperCase() || "",
      qualifyingPositionWinner: positionWinner(pair, firstQualifying, secondQualifying),
      qualifyingPositionGap: positionGap(firstQualifying, secondQualifying),
      racePositionWinner: positionWinner(pair, firstRace, secondRace),
      racePositionGap: positionGap(firstRace, secondRace),
    };
  });
  const comparisonByDriver = new Map();
  for (const comparison of teammateComparisons) {
    comparisonByDriver.set(`${comparison.round}:${comparison.firstDriverId}`, { comparison, driverName: comparison.firstDriver });
    comparisonByDriver.set(`${comparison.round}:${comparison.secondDriverId}`, { comparison, driverName: comparison.secondDriver });
  }

  const participantIdsByRound = new Map();
  for (const result of results) {
    const key = Number(result.round);
    if (!participantIdsByRound.has(key)) participantIdsByRound.set(key, new Set());
    participantIdsByRound.get(key).add(result.driver_id);
  }
  const mainData = rounds.flatMap((round) => drivers.filter((driver) => participantIdsByRound.get(Number(round.round))?.has(driver.driver_id)).map((driver) => {
    const qualifying = resultByKey.get(`${round.round}:qualifying:${driver.driver_id}`);
    const race = resultByKey.get(`${round.round}:race:${driver.driver_id}`);
    const qualifyingComparison = qualifyingComparisons.find((comparison) => Number(comparison.round) === Number(round.round)
      && [comparison.firstDriverId, comparison.secondDriverId].includes(driver.driver_id));
    const side = qualifyingComparison?.firstDriverId === driver.driver_id ? "first" : "second";
    const driverComparison = comparisonByDriver.get(`${round.round}:${driver.driver_id}`);
    const unadjusted = qualifyingComparison?.unadjusted?.[side] || getLastQualifyingTime(qualifying);
    const adjusted = qualifyingComparison?.adjusted?.[side] || null;
    return {
      year: Number(year), round: Number(round.round), roundName: round.name, raceDate: round.race_date,
      driverId: driver.driver_id, driver: driver.display_name,
      team: qualifying?.constructor_name || race?.constructor_name || driver.constructor_name,
      racePoints: valueOrBlank(race?.points), racePodium: yesNo(race, numericPosition(race) <= 3),
      qualifyingUnadjustedTime: unadjusted?.time || "", qualifyingUnadjustedSeconds: valueOrBlank(unadjusted?.seconds),
      unadjustedQualifyingHeadToHead: headToHeadOutcome(driverComparison?.comparison.unadjustedWinner, driverComparison?.driverName),
      qualifyingAdjustedTime: adjusted?.time || "", qualifyingAdjustedSeconds: valueOrBlank(adjusted?.seconds),
      qualifyingAdjustedSession: adjusted?.session?.toUpperCase() || "",
      adjustedQualifyingHeadToHead: headToHeadOutcome(driverComparison?.comparison.adjustedWinner, driverComparison?.driverName),
      qualifyingPosition: sessionPosition(qualifying),
      qualifyingPositionHeadToHead: headToHeadOutcome(driverComparison?.comparison.qualifyingPositionWinner, driverComparison?.driverName),
      madeQ2: yesNo(qualifying, Boolean(qualifying?.q2) || numericPosition(qualifying) <= 15),
      madeQ3: yesNo(qualifying, Boolean(qualifying?.q3) || numericPosition(qualifying) <= 10),
      raceLapsCompleted: valueOrBlank(race?.laps), polePosition: yesNo(qualifying, numericPosition(qualifying) === 1),
      raceFinishingPosition: sessionPosition(race),
      raceFinishingPositionHeadToHead: headToHeadOutcome(driverComparison?.comparison.racePositionWinner, driverComparison?.driverName),
    };
  }));

  const roundSummary = rounds.map((round) => ({
    year: Number(year), round: Number(round.round), roundName: round.name, raceDate: round.race_date,
    driverOfTheDay: round.driver_of_the_day || "", fastestPitTime: round.fastest_pit_time || "",
    fastestPitTeam: round.fastest_pit_team || "", dnfCount: round.dnf_count || "", safetyCar: normalizeYesNo(round.safety_car),
  }));

  const sprintRounds = rounds.filter((round) => round.has_sprint);
  const sprintData = sprintRounds.flatMap((round) => results
    .filter((result) => Number(result.round) === Number(round.round) && result.session_type === "sprint")
    .map((sprint) => {
    const driver = driverById.get(sprint.driver_id) || {};
    return {
      year: Number(year), round: Number(round.round), roundName: round.name,
      driverId: sprint.driver_id, driver: driver.display_name || sprint.driver_id,
      team: sprint.constructor_name || driver.constructor_name,
      sprintPosition: valueOrBlank(sprint?.position), sprintPoints: valueOrBlank(sprint?.points),
      adjustedSprintPoints: sprint ? getRacePointsForPosition(numericPosition(sprint)) : "",
    };
  }));

  const sprintSummary = sprintRounds.map((round) => {
    const sprintWinner = results.find((result) => Number(result.round) === Number(round.round) && result.session_type === "sprint" && numericPosition(result) === 1);
    const raceWinner = results.find((result) => Number(result.round) === Number(round.round) && result.session_type === "race" && numericPosition(result) === 1);
    return {
      year: Number(year), round: Number(round.round), roundName: round.name,
      sprintWinner: driverById.get(sprintWinner?.driver_id)?.display_name || sprintWinner?.driver_id || "",
      raceWinner: driverById.get(raceWinner?.driver_id)?.display_name || raceWinner?.driver_id || "",
      sameRaceAndSprintWinner: sprintWinner && raceWinner ? (sprintWinner.driver_id === raceWinner.driver_id ? "Yes" : "No") : "",
    };
  });

  return { mainData, roundSummary, teammateComparisons, sprintData, sprintSummary };
}

export function getRacePointsForPosition(position) {
  return ({ 1: 25, 2: 18, 3: 15, 4: 12, 5: 10, 6: 8, 7: 6, 8: 4, 9: 2, 10: 1 })[Number(position)] ?? 0;
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

function yesNo(record, value) {
  return record ? (value ? "Yes" : "No") : "";
}

function normalizeYesNo(value) {
  const text = String(value || "").trim().toLowerCase();
  if (text === "yes") return "Yes";
  if (text === "no") return "No";
  return String(value || "").trim();
}

function valueOrBlank(value) {
  return value === null || value === undefined ? "" : value;
}

function sessionPosition(result) {
  return valueOrBlank(result?.position ?? result?.classified_position);
}

function numericPosition(result) {
  const rawPosition = result?.position;
  if (rawPosition === null || rawPosition === undefined || String(rawPosition).trim() === "") return Number.POSITIVE_INFINITY;
  const position = Number(rawPosition);
  return Number.isFinite(position) && position > 0 ? position : Number.POSITIVE_INFINITY;
}

function absoluteDifference(value) {
  return Number.isFinite(value) ? Math.abs(value) : "";
}

function buildRoundDriverPairs(results, driverById) {
  const groups = new Map();
  for (const result of results) {
    const driver = driverById.get(result.driver_id);
    const constructorId = result.constructor_id || result.constructor_name || driver?.constructor_id || driver?.constructor_name;
    if (!constructorId) continue;
    const key = `${result.round}:${constructorId}`;
    if (!groups.has(key)) groups.set(key, { round: Number(result.round), constructorId, constructorName: result.constructor_name || driver.constructor_name || "", driverIds: new Set() });
    groups.get(key).driverIds.add(result.driver_id);
  }
  return [...groups.values()].flatMap((group) => {
    if (group.driverIds.size !== 2) return [];
    const [firstDriverId, secondDriverId] = [...group.driverIds].sort((firstId, secondId) => (
      (driverById.get(firstId)?.display_name || firstId).localeCompare(driverById.get(secondId)?.display_name || secondId)
    ));
    return [{
      round: group.round,
      constructorId: group.constructorId,
      constructorName: group.constructorName,
      firstDriverId,
      firstDriverName: driverById.get(firstDriverId)?.display_name || firstDriverId,
      secondDriverId,
      secondDriverName: driverById.get(secondDriverId)?.display_name || secondDriverId,
    }];
  }).sort((a, b) => a.round - b.round || a.constructorName.localeCompare(b.constructorName));
}

function comparisonWinner(comparison, values) {
  if (!values || !Number.isFinite(values.differenceSeconds)) return "";
  if (Math.abs(values.differenceSeconds) < 0.0005) return "Tie";
  return values.differenceSeconds < 0 ? comparison.firstDriverName : comparison.secondDriverName;
}

function positionWinner(comparison, first, second) {
  const firstPosition = numericPosition(first);
  const secondPosition = numericPosition(second);
  if (!Number.isFinite(firstPosition) || !Number.isFinite(secondPosition)) return "";
  if (firstPosition === secondPosition) return "Tie";
  return firstPosition < secondPosition ? comparison.firstDriverName : comparison.secondDriverName;
}

function positionGap(first, second) {
  const firstPosition = numericPosition(first);
  const secondPosition = numericPosition(second);
  return Number.isFinite(firstPosition) && Number.isFinite(secondPosition) ? Math.abs(firstPosition - secondPosition) : "";
}

function headToHeadOutcome(winner, driverName) {
  if (!winner || !driverName) return "";
  if (winner === "Tie") return "Tie";
  return winner === driverName ? "Win" : "Loss";
}

function getDriverName(result) {
  return result.driver?.display_name || result.driver_id;
}
