import { RANKINGS_ENDPOINT } from "../../../../modules/siteConfig.js";
import type { Draft, DraftOption } from "./types";

export interface SavedMovie {
  id: string;
  sheetId: string;
  name: string;
  dataUrl: string;
  releaseDate?: string;
}
interface Lists {
  sheets: { id: string; revision: number }[];
  items: SavedMovie[];
}
export function tmdbMovieId(link: string): number | undefined {
  try {
    const url = new URL(link);
    if (
      url.protocol !== "https:" ||
      !["www.themoviedb.org", "themoviedb.org"].includes(url.hostname)
    )
      return undefined;
    const match = url.pathname.match(/^\/movie\/(\d+)(?:-|\/|$)/);
    const id = Number(match?.[1]);
    return Number.isSafeInteger(id) && id > 0 ? id : undefined;
  } catch {
    return undefined;
  }
}
async function listRequest<T>(
  managerId: string,
  path = "",
  options: RequestInit = {},
): Promise<T> {
  const token = await window.boxThisLapGetManagerAccessToken?.();
  if (!token) throw new Error("Log in again to open your Draft List.");
  const response = await fetch(
    `${RANKINGS_ENDPOINT}/api/managers/${encodeURIComponent(managerId)}/draft-lists${path}`,
    {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    },
  );
  const body = await response.json();
  if (!response.ok || body.ok === false)
    throw Object.assign(
      new Error(body.error || "Your Draft List could not be saved."),
      { status: response.status },
    );
  return body as T;
}
export const loadMovieList = (managerId: string) =>
  listRequest<Lists>(managerId);
export function savedMovie(items: SavedMovie[], option: DraftOption) {
  return items.find((item) => {
    if (item.sheetId !== "fantasy-office") return false;
    const id = tmdbMovieId(item.dataUrl);
    return Boolean(id && option.tmdbId && id === option.tmdbId);
  });
}

export async function saveMovie(managerId: string, option: DraftOption) {
  if (!option.tmdbId)
    throw new Error("Only linked TMDB movies can be saved from this resource.");
  for (let attempt = 0; attempt < 2; attempt++) {
    const lists = await loadMovieList(managerId);
    const existing = savedMovie(lists.items, option);
    if (existing) return { item: existing, existed: true };
    const sheet = lists.sheets.find((entry) => entry.id === "fantasy-office");
    if (!sheet)
      throw new Error("Your Fantasy Office Draft List could not be found.");
    const manual = lists.items.find(
      (item) =>
        item.sheetId === "fantasy-office" &&
        !item.dataUrl &&
        item.name.trim().toLocaleLowerCase() ===
          option.name.trim().toLocaleLowerCase(),
    );
    try {
      const result = await listRequest<{ item: SavedMovie }>(
        managerId,
        `/fantasy-office/items${manual ? `/${encodeURIComponent(manual.id)}` : ""}`,
        {
          method: manual ? "PATCH" : "POST",
          body: JSON.stringify({
            ...(!manual ? { name: option.name } : {}),
            releaseDate: manual?.releaseDate || option.releaseDate || "",
            dataUrl: `https://www.themoviedb.org/movie/${option.tmdbId}`,
            revision: sheet.revision,
          }),
        },
      );
      window.dispatchEvent(new CustomEvent("boxthislap:draft-list-saved"));
      return { ...result, existed: false };
    } catch (error) {
      if (
        !(
          error instanceof Error &&
          "status" in error &&
          error.status === 409
        ) ||
        attempt
      )
        throw error;
    }
  }
  throw new Error("Your Draft List changed. Try again.");
}
export function eligibleMovies(draft: Draft) {
  const today = new Date().toISOString().slice(0, 10);
  return draft.options.filter(
    (option) =>
      !option.retired &&
      (draft.movieResource?.policy === "unreleased-na-2027"
        ? option.tmdbId &&
          option.worldwideReleaseDate &&
          option.worldwideReleaseDate > today &&
          (option.releaseDate
            ? option.releaseDate.startsWith("2027-")
            : option.worldwideReleaseDate.startsWith("2027-"))
        : !option.worldwideReleaseDate || option.worldwideReleaseDate > today),
  );
}
export function movieRanks(options: DraftOption[]) {
  const sorted = options
    .filter((o) => o.popularity != null)
    .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));
  const ranks = new Map<string, number>();
  let rank = 0;
  sorted.forEach((option, index) => {
    if (!index || option.popularity !== sorted[index - 1].popularity)
      rank = index + 1;
    ranks.set(option.id, rank);
  });
  return ranks;
}
