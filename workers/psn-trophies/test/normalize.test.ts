import assert from "node:assert/strict";
import test from "node:test";
import { normalizeProofGame, normalizeUtcTimestamp } from "../src/psn/normalize.ts";

const counts = { bronze: 1, silver: 0, gold: 0, platinum: 1 } as const;

test("normalizes metadata, earnings, UTC timestamps, and derived game fields", () => {
  const result = normalizeProofGame(
    {
      npServiceName: "trophy2",
      npCommunicationId: "NPWR12345_00",
      trophySetVersion: "01.00",
      trophyTitleName: "Proof Game",
      trophyTitleIconUrl: "https://example.com/game.png",
      trophyTitlePlatform: "PS5",
      hasTrophyGroups: false,
      definedTrophies: counts,
      progress: 100,
      earnedTrophies: counts,
      hiddenFlag: false,
      lastUpdatedDateTime: "2026-08-20T01:00:00Z",
    },
    {
      trophySetVersion: "01.00",
      hasTrophyGroups: false,
      totalItemCount: 2,
      trophies: [
        { trophyId: 1, trophyHidden: false, trophyType: "bronze", trophyName: "First", trophyDetail: "Begin", trophyIconUrl: "https://example.com/1.png", trophyGroupId: "default" },
        { trophyId: 2, trophyHidden: false, trophyType: "platinum", trophyName: "Done", trophyGroupId: "default" },
      ],
    },
    {
      trophySetVersion: "01.00",
      hasTrophyGroups: false,
      lastUpdatedDateTime: "2026-08-20T01:00:00Z",
      totalItemCount: 2,
      trophies: [
        { trophyId: 1, trophyHidden: false, trophyType: "bronze", earned: true, earnedDateTime: "2026-08-19T20:00:00-04:00", trophyRare: 3, trophyEarnedRate: "72.5" },
        { trophyId: 2, trophyHidden: false, trophyType: "platinum", earned: true, earnedDateTime: "2026-08-20T01:00:00Z", trophyRare: 1, trophyEarnedRate: "8.4" },
      ],
    },
    {
      trophySetVersion: "01.00",
      trophyTitleName: "Proof Game",
      trophyTitleIconUrl: "https://example.com/game.png",
      trophyTitlePlatform: "PS5",
      definedTrophies: counts,
      trophyGroups: [{ trophyGroupId: "default", trophyGroupName: "Proof Game", trophyGroupIconUrl: "https://example.com/group.png", definedTrophies: counts }],
    },
  );

  assert.equal(result.game.firstTrophyAt, "2026-08-20T00:00:00.000Z");
  assert.equal(result.game.latestTrophyAt, "2026-08-20T01:00:00.000Z");
  assert.equal(result.game.platinumEarnedAt, "2026-08-20T01:00:00.000Z");
  assert.equal(result.game.completion100At, "2026-08-20T01:00:00.000Z");
  assert.equal(result.game.is100Percent, true);
  assert.equal(result.trophies[1].earnedRate, 8.4);
  assert.equal(result.groups[0].groupId, "default");
});

test("does not equate platinum with 100 percent when another trophy is unearned", () => {
  const metadata = {
    trophySetVersion: "01.00",
    hasTrophyGroups: false,
    totalItemCount: 2,
    trophies: [
      { trophyId: 1, trophyHidden: false, trophyType: "bronze" as const, trophyName: "Missing" },
      { trophyId: 2, trophyHidden: false, trophyType: "platinum" as const, trophyName: "Platinum" },
    ],
  };
  const earnings = {
    trophySetVersion: "01.00",
    hasTrophyGroups: false,
    lastUpdatedDateTime: "2026-08-20T01:00:00Z",
    totalItemCount: 2,
    trophies: [
      { trophyId: 1, trophyHidden: false, trophyType: "bronze" as const, earned: false },
      { trophyId: 2, trophyHidden: false, trophyType: "platinum" as const, earned: true, earnedDateTime: "2026-08-20T01:00:00Z" },
    ],
  };
  const summary = {
    npServiceName: "trophy2" as const,
    npCommunicationId: "NPWR12345_00",
    trophySetVersion: "01.00",
    trophyTitleName: "Proof Game",
    trophyTitleIconUrl: "",
    trophyTitlePlatform: "PS5" as const,
    hasTrophyGroups: false,
    definedTrophies: counts,
    progress: 50,
    earnedTrophies: { ...counts, bronze: 0 },
    hiddenFlag: false,
    lastUpdatedDateTime: "2026-08-20T01:00:00Z",
  };
  const groups = {
    trophySetVersion: "01.00",
    trophyTitleName: "Proof Game",
    trophyTitleIconUrl: "",
    trophyTitlePlatform: "PS5",
    definedTrophies: counts,
    trophyGroups: [],
  };

  const result = normalizeProofGame(summary, metadata, earnings, groups);
  assert.equal(result.game.platinumEarned, true);
  assert.equal(result.game.is100Percent, false);
  assert.equal(result.game.completion100At, null);
});

test("rejects invalid timestamps instead of storing non-UTC text", () => {
  assert.equal(normalizeUtcTimestamp("not-a-date"), null);
  assert.equal(normalizeUtcTimestamp(null), null);
});

