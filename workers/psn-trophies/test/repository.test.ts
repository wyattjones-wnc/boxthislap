import assert from "node:assert/strict";
import test from "node:test";
import { saveGame } from "../src/db/repository.ts";

test("does not rewrite unchanged game, group, or trophy rows", async () => {
  let batches = 0;
  let writes = 0;
  const game = {
    id: "NPWR1_00", npCommunicationId: "NPWR1_00", name: "Game", platforms: ["PS5"],
    iconUrl: "https://example.com/game.png", progress: 50,
    earned: { bronze: 1, silver: 0, gold: 0, platinum: 0 },
    defined: { bronze: 2, silver: 0, gold: 0, platinum: 0 },
    sourceUpdatedAt: "2026-09-09T00:00:00.000Z", hasPlatinum: false, platinumEarned: false,
    firstTrophyAt: "2026-09-08T00:00:00.000Z", latestTrophyAt: "2026-09-08T00:00:00.000Z",
    platinumEarnedAt: null, completion100At: null, is100Percent: false,
  } as const;
  const group = {
    gameId: game.id, groupId: "default", name: "Base Game", iconUrl: null,
    defined: { bronze: 2, silver: 0, gold: 0, platinum: 0 },
  } as const;
  const trophy = {
    gameId: game.id, trophyId: 1, groupId: "default", name: "First", description: "Earn it",
    type: "bronze", iconUrl: "https://example.com/trophy.png", earned: true,
    earnedAt: "2026-09-08T00:00:00.000Z", rarityClass: 2, earnedRate: 42.5, progress: null,
  } as const;
  const existingGame = {
    id: game.id, np_communication_id: game.npCommunicationId, title_name: game.name,
    platforms: JSON.stringify(game.platforms), icon_url: game.iconUrl, progress: game.progress,
    earned_bronze: 1, earned_silver: 0, earned_gold: 0, earned_platinum: 0,
    defined_bronze: 2, defined_silver: 0, defined_gold: 0, defined_platinum: 0,
    has_platinum: 0, platinum_earned: 0, first_trophy_at: game.firstTrophyAt,
    latest_trophy_at: game.latestTrophyAt, platinum_earned_at: null, completion_100_at: null,
    is_100_percent: 0, source_updated_at: game.sourceUpdatedAt,
  };
  const existingTrophy = {
    trophy_id: 1, trophy_group_id: trophy.groupId, trophy_name: trophy.name,
    trophy_description: trophy.description, trophy_type: trophy.type, icon_url: trophy.iconUrl,
    earned: 1, earned_at: trophy.earnedAt, rarity_class: trophy.rarityClass,
    earned_rate: trophy.earnedRate, progress: null, earned_number: 1, platinum_number: null,
  };
  const existingGroup = {
    group_id: group.groupId, group_name: group.name, icon_url: null,
    defined_bronze: 2, defined_silver: 0, defined_gold: 0, defined_platinum: 0,
  };
  const env = {
    DB: {
      batch: async () => { batches += 1; return []; },
      prepare: (sql: string) => ({
        bind: () => ({
          first: async () => sql.includes("FROM games") ? existingGame
            : sql.includes("sync_state") ? { value: "1" } : null,
          all: async () => sql.includes("FROM trophies") ? { results: [existingTrophy] }
            : sql.includes("FROM trophy_groups") ? { results: [existingGroup] } : { results: [] },
          run: async () => { writes += 1; return { success: true }; },
        }),
      }),
    },
  } as any;

  const result = await saveGame(env, game as any, [group as any], [trophy as any], "2026-09-09T01:00:00.000Z");

  assert.deepEqual(result, { added: false, trophiesWritten: 0 });
  assert.equal(writes, 0);
  assert.equal(batches, 0);
});
