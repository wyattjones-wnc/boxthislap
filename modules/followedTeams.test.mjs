import assert from "node:assert/strict";
import test from "node:test";
import { normalizeLeagues, normalizeSelectableLeague, partitionPickerTeams, personalTeamIds } from "./followedTeams.js";

test("team picker shows unique canonical domestic leagues", () => {
  const response = {
    leagues: [
      { id: "1", name: "La Liga" },
      { id: "2", name: "Primera Division" },
      { id: "3", name: "LaLiga Season 2026-2027" },
      { id: "4", name: "MLS" },
      { id: "5", name: "MLS - Regular Season" },
      { id: "6", name: "Premier League" },
      { id: "7", name: "Championship" },
    ],
  };
  assert.deepEqual(normalizeLeagues(response), [
    { id: "championship", name: "Championship" },
    { id: "la-liga", name: "La Liga" },
    { id: "mls", name: "MLS" },
    { id: "premier-league", name: "Premier League" },
  ]);
});

test("team picker excludes friendlies and cup competitions", () => {
  for (const name of ["Club Friendlies", "MLS Preseason Friendlies", "EFL Cup", "Community Shield", "UEFA Champions League", "Supercopa de España", "International"]) {
    assert.equal(normalizeSelectableLeague(name), null, name);
  }
});

test("inherited defaults are effective but not checked as personal choices", () => {
  assert.deepEqual(personalTeamIds(["1", "2"], true), []);
  assert.deepEqual(personalTeamIds(["1", "2"], false), ["1", "2"]);
});

test("default teams are listed before all other picker teams", () => {
  const teams = [{ id: "3" }, { id: "2" }, { id: "1" }];
  assert.deepEqual(partitionPickerTeams(teams, ["1", "2"]), {
    defaults: [{ id: "1" }, { id: "2" }],
    others: [{ id: "3" }],
  });
});
