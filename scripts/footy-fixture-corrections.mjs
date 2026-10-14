// Confirmed postponements whose provider record still carries the old kickoff.
// Scope each correction to that kickoff so a rescheduled fixture updates normally.
const postponedKickoffs = new Map([
  ["564698", "2026-10-10T12:00:00Z"], // Rayo Vallecano v Athletic Club, match week 8.
]);

export function applyFootyFixtureCorrection(fixture) {
  const providerId = String(fixture.sourceIds?.["football-data.org"] || "");
  const oldKickoff = postponedKickoffs.get(providerId);
  const status = String(fixture.status || "").trim().toUpperCase();

  if (oldKickoff && Date.parse(fixture.timestamp) === Date.parse(oldKickoff) &&
      ["SCHEDULED", "TIMED"].includes(status)) {
    return { ...fixture, status: "POSTPONED" };
  }

  return fixture;
}
