import { RANKINGS_ENDPOINT } from "../../../modules/siteConfig.js";
import type { Candidate } from "./RaceResults";

export interface Baseline {
  markedAt: string;
  sourceUpdated: number;
  votes: Record<string, number>;
  total: number;
  gap: number | null;
  revision: number;
}
export interface SharedBaselines {
  baselines: Record<string, Baseline>;
}
export const seenQueryKey = ["election-shared-seen-2026"];
const endpoint = `${RANKINGS_ENDPOINT}/api/elections/2026/seen`;

async function responseData<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.ok !== true)
    throw new Error(body.error || "Shared election baselines are unavailable.");
  return body as T;
}

export async function loadBaselines(
  signal: AbortSignal,
): Promise<SharedBaselines> {
  const data = await responseData<SharedBaselines>(
    await fetch(endpoint, { signal, cache: "no-store" }),
  );
  if (
    !data.baselines ||
    typeof data.baselines !== "object" ||
    Array.isArray(data.baselines)
  )
    throw new Error("Invalid shared election baselines.");
  return data;
}

export async function saveBaseline({
  raceKey,
  candidates,
  sourceUpdated,
  expectedRevision,
}: {
  raceKey: string;
  candidates: Candidate[];
  sourceUpdated: number;
  expectedRevision: number;
}): Promise<{ baseline: Baseline }> {
  const token = await window.boxThisLapGetManagerAccessToken?.();
  if (!token) throw new Error("Sign in as an admin to mark results seen.");
  const [state, raceId] = raceKey.split(":");
  return responseData(
    await fetch(
      `${endpoint}/${encodeURIComponent(state)}/${encodeURIComponent(raceId)}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          candidates: candidates.map(({ id, first, last, votes }) => ({
            id,
            first,
            last,
            votes,
          })),
          sourceUpdated,
          expectedRevision,
        }),
      },
    ),
  );
}
