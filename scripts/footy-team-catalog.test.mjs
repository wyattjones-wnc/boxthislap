import assert from "node:assert/strict";
import test from "node:test";
import { attachCanonicalFootyTeams } from "./footy-team-catalog.mjs";

test("configured team IDs replace provider aliases across competition fixtures", () => {
  const schedule = {
    teamSchedules: [{
      team: { id: "1", name: "Arsenal", prettyName: "Arsenal Football Club" },
      fixtures: [{ away: "Chelsea FC", home: "Arsenal FC", isHome: true, teamId: "1", teamName: "Arsenal" }],
    }],
    competitionSchedules: [{
      competition: { id: "2021", key: "premier-league", name: "Premier League" },
      fixtures: [{ away: "Chelsea FC", awayProviderTeamId: "61", home: "Arsenal FC", homeProviderTeamId: "57", source: "football-data.org" }],
    }],
  };
  const catalog = attachCanonicalFootyTeams(schedule);
  assert.equal(schedule.competitionSchedules[0].fixtures[0].homeTeamId, "1");
  assert.equal(schedule.competitionSchedules[0].fixtures[0].awayTeamId, "team:chelsea-fc");
  assert.equal(catalog.filter((team) => team.id === "1").length, 1);
});

test("fixtures receive stable event team IDs before runtime matching", () => {
  const schedule = { competitionSchedules: [{ competition: { key: "cup", name: "Cup" }, fixtures: [{ home: "Alpha FC", away: "Beta FC" }] }] };
  attachCanonicalFootyTeams(schedule);
  assert.equal(schedule.competitionSchedules[0].fixtures[0].homeTeamId, "team:alpha-fc");
  assert.equal(schedule.competitionSchedules[0].fixtures[0].awayTeamId, "team:beta-fc");
});
