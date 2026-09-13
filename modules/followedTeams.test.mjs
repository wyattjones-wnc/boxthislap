import assert from "node:assert/strict";
import test from "node:test";
import {
  effectiveTeamIds,
  filterPickerTeams,
  followedTeamBadge,
  normalizeLeagues,
  normalizeSelectableLeague,
  partitionPickerTeams,
  personalTeamIds,
} from "./followedTeams.js";

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
  for (const name of [
    "Club Friendlies",
    "MLS Preseason Friendlies",
    "EFL Cup",
    "Community Shield",
    "UEFA Champions League",
    "Supercopa de España",
    "International",
  ]) {
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

test("team picker excludes ancillary teams unless they are defaults", () => {
  const teams = [
    { id: "1", leagues: [{ name: "Club Friendlies" }] },
    { id: "2", leagues: [{ name: "FA Cup" }] },
    { id: "3", leagues: [{ name: "Premier League" }] },
    { id: "4", leagues: [] },
  ];

  assert.deepEqual(filterPickerTeams(teams, ["1", "4"]), [
    teams[0],
    teams[2],
    teams[3],
  ]);
});

test("known followed teams use their canonical local badges", () => {
  assert.equal(
    followedTeamBadge({ badge: "assets/teams/usmnt.svg", id: "4" }),
    "assets/teams/4/badge.svg",
  );
  assert.equal(
    followedTeamBadge({ badge: "assets/teams/uswnt.svg", id: "5" }),
    "assets/teams/5/badge.svg",
  );
  assert.equal(
    followedTeamBadge({ badge: "assets/teams/charlotte-fc.svg", id: "6" }),
    "assets/teams/6/badge.svg",
  );
  assert.equal(
    followedTeamBadge({ badge: "assets/teams/inter-miami-cf.webp", id: "7" }),
    "assets/teams/7/badge.svg",
  );
  assert.equal(
    followedTeamBadge({
      badge: "https://example.com/team.png",
      id: "team:other",
    }),
    "https://example.com/team.png",
  );
});

test("inherited preferences always resolve to the public site defaults", () => {
  assert.deepEqual(
    effectiveTeamIds(["1", "2"], { teams: [], usingDefault: true }),
    ["1", "2"],
  );
  assert.deepEqual(
    effectiveTeamIds(["1", "2"], {
      teams: [{ priority: 1, teamId: "7" }],
      usingDefault: false,
    }),
    ["7"],
  );
});
