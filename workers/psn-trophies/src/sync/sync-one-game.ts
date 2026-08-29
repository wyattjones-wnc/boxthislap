import {
  exchangeAccessCodeForAuthTokens,
  exchangeNpssoForAccessCode,
  getTitleTrophies,
  getTitleTrophyGroups,
  getUserTitles,
  getUserTrophiesEarnedForTitle,
  type TrophyTitle,
} from "psn-api";
import { finishSyncRun, saveProofGame, startSyncRun } from "../db/repository";
import { normalizeProofGame } from "../psn/normalize";
import type { PsnEnvironment } from "../types";

const PAGE_LIMIT = 100;

export async function syncOnePlatinumGame(env: PsnEnvironment): Promise<{ gameId: string; trophiesUpdated: number }> {
  const startedAt = new Date().toISOString();
  const runId = await startSyncRun(env, startedAt);

  try {
    if (!env.PSN_NPSSO) throw new Error("PSN_NPSSO is not configured.");
    const accessCode = await exchangeNpssoForAccessCode(env.PSN_NPSSO);
    const authorization = await exchangeAccessCodeForAuthTokens(accessCode);
    const auth = { accessToken: authorization.accessToken };
    const accountId = env.PSN_ACCOUNT_ID?.trim() || "me";
    const titlesResponse = await getUserTitles(auth, accountId, { limit: 800 });
    const summary = selectProofTitle(titlesResponse.trophyTitles, env.PSN_PROOF_GAME_ID);
    const options = { npServiceName: summary.npServiceName };

    const [metadata, earnings, groups] = await Promise.all([
      getAllPages((offset) => getTitleTrophies(auth, summary.npCommunicationId, "all", { ...options, limit: PAGE_LIMIT, offset })),
      getAllPages((offset) => getUserTrophiesEarnedForTitle(
        auth, accountId, summary.npCommunicationId, "all", { ...options, limit: PAGE_LIMIT, offset },
      )),
      getTitleTrophyGroups(auth, summary.npCommunicationId, options),
    ]);

    const normalized = normalizeProofGame(summary, metadata, earnings, groups);
    const added = await saveProofGame(env, normalized.game, normalized.groups, normalized.trophies, startedAt);
    await finishSyncRun(env, runId, "success", {
      titlesSeen: titlesResponse.totalItemCount,
      titlesChanged: 1,
      titlesAdded: Number(added),
      trophiesUpdated: normalized.trophies.length,
    });
    console.log(JSON.stringify({
      event: "psn_proof_sync_complete",
      gameId: normalized.game.id,
      titlesSeen: titlesResponse.totalItemCount,
      trophiesUpdated: normalized.trophies.length,
    }));
    return { gameId: normalized.game.id, trophiesUpdated: normalized.trophies.length };
  } catch (error) {
    const message = safeErrorMessage(error);
    await finishSyncRun(env, runId, "failed", { errorMessage: message }).catch(() => undefined);
    console.error(JSON.stringify({ event: "psn_proof_sync_failed", error: message }));
    throw error;
  }
}

function selectProofTitle(titles: TrophyTitle[], requestedId?: string): TrophyTitle {
  const id = requestedId?.trim();
  const title = id
    ? titles.find((candidate) => candidate.npCommunicationId === id)
    : titles.find((candidate) => candidate.earnedTrophies.platinum > 0);
  if (!title) throw new Error(id ? "PSN_PROOF_GAME_ID was not found in this account." : "No platinumed PSN title was found.");
  if (title.earnedTrophies.platinum < 1) throw new Error("PSN_PROOF_GAME_ID is not a platinumed title.");
  return title;
}

async function getAllPages<T extends { trophies: unknown[]; totalItemCount: number }>(
  fetchPage: (offset: number) => Promise<T>,
): Promise<T> {
  const first = await fetchPage(0);
  const trophies = [...first.trophies];
  while (trophies.length < first.totalItemCount) {
    const page = await fetchPage(trophies.length);
    if (!page.trophies.length) throw new Error("PSN pagination ended before totalItemCount was reached.");
    trophies.push(...page.trophies);
  }
  return { ...first, trophies };
}

function safeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "Unknown PSN synchronization failure.";
  return message.slice(0, 1000);
}

