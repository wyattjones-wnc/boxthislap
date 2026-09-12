import assert from "node:assert/strict";
import test from "node:test";
import {
  compareFootyFixturesAscending,
  getDefaultFootyTeams,
  getFootyCalendarWeek,
  getFootyFilterTeams,
  getFootyFixtureDateKey,
  getFootyFixtureTimingLabel,
  groupFootyFixturesByCalendarWeek,
  hasFootyMatchNoteData,
  isFootyFixtureInDateRange,
  isFootyFixturePast,
  isFootyFriendlyFixture,
  normalizeFootyDateRange,
} from "./footyFixtures.js";

test("normalizes reversed and one-sided Footy date ranges", () => {
  assert.deepEqual(normalizeFootyDateRange("2026-09-20", "2026-09-10"), {
    end: "2026-09-20",
    start: "2026-09-10",
  });
  assert.deepEqual(normalizeFootyDateRange("", "2026-09-10"), {
    end: "2026-09-10",
    start: "2026-09-10",
  });
  assert.equal(normalizeFootyDateRange("", ""), null);
});

test("derives fixture dates and applies inclusive date filters", () => {
  const fixture = { timestamp: "2026-09-12T15:00:00Z" };
  assert.equal(getFootyFixtureDateKey(fixture), "2026-09-12");
  assert.equal(
    isFootyFixtureInDateRange(fixture, {
      start: "2026-09-12",
      end: "2026-09-12",
    }),
    true,
  );
  assert.equal(
    isFootyFixtureInDateRange(fixture, {
      start: "2026-09-13",
      end: "2026-09-14",
    }),
    false,
  );
});

test("recognizes friendly overrides, provider IDs, and known names", () => {
  assert.equal(
    isFootyFriendlyFixture({ isFriendly: false, league: "Friendly" }),
    false,
  );
  assert.equal(isFootyFriendlyFixture({ leagueId: "4569" }), true);
  assert.equal(isFootyFriendlyFixture({ league: "Trofeo Joan Gamper" }), true);
  assert.equal(isFootyFriendlyFixture({ league: "Premier League" }), false);
});

test("deduplicates team filter names and resolves default-priority teams", () => {
  const fixtures = [
    { priority: "1", teamName: "Arsenal" },
    { priority: "2", teamName: "Arsenal FC" },
    { priority: "1", teamName: "Barcelona" },
  ];
  assert.deepEqual(getFootyFilterTeams(fixtures), ["Arsenal FC", "Barcelona"]);
  assert.deepEqual(
    [...getDefaultFootyTeams(fixtures, new Set(["1"]))],
    ["arsenal", "barcelona"],
  );
});

test("sorts fixtures chronologically with stable team fallbacks", () => {
  const fixtures = [
    { date: "2026-09-13", teamId: "2", teamName: "Barcelona" },
    { date: "2026-09-12", teamId: "1", teamName: "Arsenal" },
  ];
  assert.deepEqual(
    fixtures
      .sort(compareFootyFixturesAscending)
      .map((fixture) => fixture.teamName),
    ["Arsenal", "Barcelona"],
  );
});

test("classifies noted matches as past and labels current or imminent fixtures", () => {
  const now = Date.parse("2026-09-12T15:00:00Z");
  assert.equal(hasFootyMatchNoteData({ matchNote: { homeScore: "0" } }), true);
  assert.equal(
    isFootyFixturePast({ matchNote: { note: "Complete" } }, now),
    true,
  );
  assert.equal(
    getFootyFixtureTimingLabel(
      { time: "11:30", timestamp: "2026-09-12T15:30:00Z" },
      now,
    ),
    "Next 24h",
  );
  assert.equal(
    getFootyFixtureTimingLabel(
      { time: "14:00", timestamp: "2026-09-13T18:00:01Z" },
      now,
    ),
    "",
  );
});

test("groups fixtures into Monday-based calendar weeks", () => {
  const first = { date: "2026-09-14", matchId: "one" };
  const second = { date: "2026-09-20", matchId: "two" };
  const third = { date: "2026-09-21", matchId: "three" };
  const groups = groupFootyFixturesByCalendarWeek([first, second, third]);
  assert.equal(groups.length, 2);
  assert.deepEqual(groups[0].fixtures, [first, second]);
  assert.equal(groups[0].key, getFootyCalendarWeek(first).key);
  assert.deepEqual(groups[1].fixtures, [third]);
});
