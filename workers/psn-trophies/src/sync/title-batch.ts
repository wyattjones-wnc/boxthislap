import type { TrophyTitle } from "psn-api";

export function getTitleBatch(titles: TrophyTitle[], requestedOffset: number, limit: number): {
  nextOffset: number | null;
  offset: number;
  titles: TrophyTitle[];
} {
  const normalized = Number.isSafeInteger(requestedOffset) && requestedOffset >= 0 ? requestedOffset : 0;
  const offset = titles.length && normalized >= titles.length ? 0 : normalized;
  const end = Math.min(titles.length, offset + Math.max(1, Math.trunc(limit)));
  return {
    nextOffset: end < titles.length ? end : null,
    offset,
    titles: titles.slice(offset, end),
  };
}
