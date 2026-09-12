import assert from "node:assert/strict";
import test from "node:test";
import {
  buildFootyNextItemDefaults,
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
