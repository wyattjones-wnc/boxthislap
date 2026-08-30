import {
  exchangeAccessCodeForAuthTokens,
  exchangeNpssoForAccessCode,
  getTitleTrophies,
  getTitleTrophyGroups,
  getUserTitles,
  getUserTrophiesEarnedForTitle,
  type TrophyTitle,
} from "psn-api";
import { finishSyncRun, getSyncCursor, saveGame, setSyncCursor, startSyncRun } from "../db/repository";
import { normalizeProofGame } from "../psn/normalize";
import { getPsnNpsso } from "../psn/stored-auth";
import type { PsnEnvironment } from "../types";
import { getTitleBatch } from "./title-batch";

const PAGE_LIMIT = 100;
export const TITLE_BATCH_LIMIT = 4;

export interface TrophySyncBatchResult {
  failedTitles: Array<{ gameId: string; error: string }>;
  nextOffset: number | null;
  offset: number;
  titlesAdded: number;
  titlesSeen: number;
  titlesSynced: number;
  trophiesUpdated: number;
}

export async function syncTrophyBatch(env: PsnEnvironment, requestedOffset = 0): Promise<TrophySyncBatchResult> {
  const startedAt = new Date().toISOString();
  const runId = await startSyncRun(env, startedAt);

  try {
    const accessCode = await exchangeNpssoForAccessCode(await getPsnNpsso(env));
    const authorization = await exchangeAccessCodeForAuthTokens(accessCode);
    const auth = { accessToken: authorization.accessToken };
    const accountId = env.PSN_ACCOUNT_ID?.trim() || "me";
    const titles = await getAllTitlePages(auth, accountId);
    const batch = getTitleBatch(titles, requestedOffset, TITLE_BATCH_LIMIT);
    const failures: TrophySyncBatchResult["failedTitles"] = [];
    let titlesAdded = 0;
    let titlesSynced = 0;
    let trophiesUpdated = 0;

    for (const summary of batch.titles) {
      try {
        const options = { npServiceName: summary.npServiceName };
        const [metadata, earnings, groups] = await Promise.all([
          getAllPages((offset) => getTitleTrophies(auth, summary.npCommunicationId, "all", { ...options, limit: PAGE_LIMIT, offset })),
          getAllPages((offset) => getUserTrophiesEarnedForTitle(
            auth, accountId, summary.npCommunicationId, "all", { ...options, limit: PAGE_LIMIT, offset },
          )),
          getTitleTrophyGroups(auth, summary.npCommunicationId, options),
        ]);
        const normalized = normalizeProofGame(summary, metadata, earnings, groups);
        titlesAdded += Number(await saveGame(env, normalized.game, normalized.groups, normalized.trophies, startedAt));
        titlesSynced += 1;
        trophiesUpdated += normalized.trophies.length;
      } catch (error) {
        failures.push({ gameId: summary.npCommunicationId, error: safeErrorMessage(error) });
      }
    }

    await finishSyncRun(env, runId, failures.length ? "partial" : "success", {
      titlesSeen: titles.length,
      titlesChanged: titlesSynced,
      titlesAdded,
      trophiesUpdated,
      errorMessage: failures.length ? `${failures.length} title(s) failed.` : undefined,
    });
    const result: TrophySyncBatchResult = {
      failedTitles: failures,
      nextOffset: batch.nextOffset,
      offset: batch.offset,
      titlesAdded,
      titlesSeen: titles.length,
      titlesSynced,
      trophiesUpdated,
    };
    console.log(JSON.stringify({
      event: "psn_trophy_batch_sync_complete",
      ...result,
    }));
    return result;
  } catch (error) {
    const message = safeErrorMessage(error);
    await finishSyncRun(env, runId, "failed", { errorMessage: message }).catch(() => undefined);
    console.error(JSON.stringify({ event: "psn_trophy_batch_sync_failed", error: message }));
    throw error;
  }
}

export async function syncScheduledTrophyBatch(env: PsnEnvironment): Promise<TrophySyncBatchResult> {
  const cursor = await getSyncCursor(env);
  const result = await syncTrophyBatch(env, cursor);
  await setSyncCursor(env, result.nextOffset ?? 0);
  return result;
}

async function getAllTitlePages(
  auth: { accessToken: string },
  accountId: string,
): Promise<TrophyTitle[]> {
  const first = await getUserTitles(auth, accountId, { limit: PAGE_LIMIT, offset: 0 });
  const titles = [...first.trophyTitles];
  while (titles.length < first.totalItemCount) {
    const page = await getUserTitles(auth, accountId, { limit: PAGE_LIMIT, offset: titles.length });
    if (!page.trophyTitles.length) throw new Error("PSN title pagination ended before totalItemCount was reached.");
    titles.push(...page.trophyTitles);
  }
  return titles;
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
