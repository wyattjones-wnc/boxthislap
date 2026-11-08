import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import {
  buildFootyNextItemDefaults,
  deduplicateFootyFixtureCards,
  findFootyFixtureBySharedIdentity,
  getFootyFixtureSourceIdentities,
  getFootyNotificationFixtures,
  isFootyFixtureFollowed,
  shouldOfferFootyMatchNotification,
} from "./footyMatchActions.js";

test("notification fixtures include and deduplicate full competition matches", () => {
  const shared = { home: "A", away: "B", matchId: "match-1" };
  const extra = { home: "C", away: "D", matchId: "match-2" };
  assert.deepEqual(getFootyNotificationFixtures({
    competitionSchedules: [{ fixtures: [shared, extra] }],
    teamSchedules: [{ fixtures: [shared] }],
  }).map((fixture) => fixture.matchId), ["match-1", "match-2"]);
});

test("shared provider IDs reconcile fixtures with different generated match IDs", () => {
  const followed = {
    away: "Inter Miami CF",
    home: "Chicago Fire FC",
    matchId: "footy_c0fb8d3eca3c",
    matchNote: { awayScore: "2", homeScore: "1" },
    sourceIds: { iCalendar: "MLS-MAT-0009KR" },
  };
  const competition = {
    away: "Inter Miami CF",
    home: "Chicago Fire FC",
    matchId: "footy_comp_icalendar_mls_mat_0009kr",
    sourceIds: { iCalendar: "MLS-MAT-0009KR" },
  };

  assert.deepEqual(getFootyFixtureSourceIdentities(competition), ["icalendar:mls-mat-0009kr"]);
  assert.equal(findFootyFixtureBySharedIdentity([followed], competition), followed);
  assert.deepEqual(getFootyNotificationFixtures({
    teamSchedules: [{ fixtures: [followed] }],
    competitionSchedules: [{ fixtures: [competition] }],
  }), [followed]);
});

test("a fixture is followed when any canonical side is selected", () => {
  assert.equal(isFootyFixtureFollowed({ homeTeamId: "8", awayTeamId: "9" }, ["9"]), true);
  assert.equal(isFootyFixtureFollowed({ homeTeamId: "8", awayTeamId: "9" }, ["10"]), false);
});

test("match alert action is offered only after recipient state loads and the match is uncovered", () => {
  const fixture = { homeTeamId: "8", awayTeamId: "9", matchId: "match-2" };
  const loaded = { followedTeamsLoaded: true, matchNotificationsLoaded: true };
  assert.equal(shouldOfferFootyMatchNotification(fixture, loaded), true);
  assert.equal(shouldOfferFootyMatchNotification(fixture, { ...loaded, matchNotificationIds: ["match-2"] }), false);
  assert.equal(shouldOfferFootyMatchNotification(fixture, { ...loaded, notificationTeamIds: ["9"] }), false);
  assert.equal(shouldOfferFootyMatchNotification(fixture, { ...loaded, followedTeamsLoaded: false }), false);
  assert.equal(shouldOfferFootyMatchNotification(fixture, { ...loaded, matchNotificationsLoaded: false }), false);
});

test("Next defaults use the displayed Eastern match date and time", () => {
  assert.deepEqual(buildFootyNextItemDefaults({
    away: "Chelsea",
    home: "Arsenal",
    matchId: "match-3",
    timestamp: "2026-09-06T00:30:00Z",
  }), {
    date: "2026-09-05",
    sourceMatchId: "match-3",
    thing: "Arsenal v Chelsea",
    time: "20:30",
  });
});

test("combined cards merge followed-team perspectives and retain both badges", () => {
  const shared = {
    home: "Home",
    away: "Away",
    homeTeamId: "home",
    awayTeamId: "away",
    matchId: "shared",
    sourceIds: { provider: "123" },
  };
  const away = {
    ...shared,
    teamId: "away",
    teamName: "Away",
    isHome: false,
    teamBadge: "away.svg",
  };
  const home = {
    ...shared,
    teamId: "home",
    teamName: "Home",
    isHome: true,
    teamBadge: "home.svg",
    matchNote: { homeScore: "1", awayScore: "0", kit: "away" },
  };
  const cards = deduplicateFootyFixtureCards([away, home, away]);
  assert.equal(cards.length, 1);
  assert.deepEqual(cards[0].followedTeamIds, ["away", "home"]);
  assert.deepEqual(cards[0].followedTeamNames, ["Away", "Home"]);
  assert.equal(cards[0].followedHomeBadge, "home.svg");
  assert.equal(cards[0].followedAwayBadge, "away.svg");
  assert.equal(cards[0].matchNote, home.matchNote);
  assert.equal(away.followedHomeBadge, undefined);
  assert.equal(deduplicateFootyFixtureCards([home])[0].isHome, true);
  assert.equal(deduplicateFootyFixtureCards([away])[0].isHome, false);
});

test("shared source identity merges generated IDs while distinct fixtures stay separate", () => {
  const first = {
    matchId: "team-id",
    teamId: "1",
    sourceIds: { provider: "123" },
  };
  const second = {
    matchId: "competition-id",
    teamId: "2",
    sourceIds: { provider: "123" },
  };
  const third = {
    matchId: "different",
    teamId: "1",
    sourceIds: { provider: "456" },
  };
  assert.deepEqual(
    deduplicateFootyFixtureCards([first, second, third]).map(
      (fixture) => fixture.matchId,
    ),
    ["team-id", "different"],
  );
});


test("combined list deduplicates after team filtering and renders one shared card", () => {
  const source = readFileSync(new URL("../script.js", import.meta.url), "utf8");
  const filterSource = source.slice(source.indexOf("function getFilteredFootyFixtures("), source.indexOf("function hasActiveFootyFilters("));
  const renderSource = source.slice(source.indexOf("function renderFootyFixture("), source.indexOf("function renderFootyCompetitionBadgePair("));
  let selected = new Set(["home", "away"]);
  const context = vm.createContext({
    deduplicateFootyFixtureCards,
    normalizeLookupName: (value) => String(value).toLowerCase(),
    footySearchInput: null, footyMatchPeriodFilter: null, footyCompetitionPastFilter: null, footyFriendliesFilter: null,
    getFootyDateFilterRange: () => null,
    getSelectedFootyTeams: () => selected,
    getFootyTeamFilterKey: (name) => name.toLowerCase(),
    activeFootyScheduleMode: "followed",
    formatFootyFixtureDate: () => "Date",
    getFootyLocalTeamBadge: () => "",
    getFootyFixtureFallbackBadge: () => "",
    getFootyFixtureTimingLabel: () => "",
    expandedFootyMatchIds: new Set(),
    getFootyMatchScore: () => null,
    getFootyFixtureResultClass: () => "",
    isFootyFixturePostponed: () => false,
    shouldShowFootyFixtureVenue: () => false,
    escapeHtml: String,
    renderFootyCompetitionBadgePair: () => '<div class="badge-pair"></div>',
    renderFootyBadgeMarkup: () => "badge",
    fixtures: [
      { matchId: "shared", home: "Home", away: "Away", teamId: "home", teamName: "Home", isHome: true },
      { matchId: "shared", home: "Home", away: "Away", teamId: "away", teamName: "Away", isHome: false },
    ],
  });
  vm.runInContext(filterSource + renderSource, context);
  const shared = vm.runInContext("getFilteredFootyFixtures(fixtures)", context);
  assert.equal(shared.length, 1);
  const markup = vm.runInContext("getFilteredFootyFixtures(fixtures).map(renderFootyFixture).join('')", context);
  assert.equal((markup.match(/data-footy-match-id=/g) || []).length, 1);
  assert.match(markup, /Home · Away/);
  assert.match(markup, /badge-pair/);
  assert.doesNotMatch(markup, /footy-side-chip/);
  for (const [team, side] of [["home", "Home"], ["away", "Away"]]) {
    selected = new Set([team]);
    const filtered = vm.runInContext("getFilteredFootyFixtures(fixtures)", context);
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].teamId, team);
    const individual = vm.runInContext("renderFootyFixture(getFilteredFootyFixtures(fixtures)[0])", context);
    assert.match(individual, new RegExp(`aria-label="${side}"`));
  }
});
