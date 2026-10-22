// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { saveMovie, savedMovie, tmdbMovieId } from "./movieDraftList";
const movie = {
  id: "resource-id",
  tmdbId: 42,
  name: "A Movie",
  releaseDate: "2027-05-01",
};
afterEach(() => {
  vi.unstubAllGlobals();
  delete window.boxThisLapGetManagerAccessToken;
});
it("recognizes stable TMDB identities without confusing remakes with matching titles", () => {
  expect(tmdbMovieId("https://www.themoviedb.org/movie/42-working-title")).toBe(
    42,
  );
  expect(tmdbMovieId("https://example.com/movie/42")).toBeUndefined();
  expect(
    savedMovie(
      [
        {
          id: "one",
          sheetId: "fantasy-office",
          name: "A Movie",
          dataUrl: "https://www.themoviedb.org/movie/99",
        },
      ],
      movie,
    ),
  ).toBeUndefined();
});
it("exports metadata with owner authentication and appends without a second entry on retry", async () => {
  window.boxThisLapGetManagerAccessToken = async () => "owner-token";
  const items: {
    id: string;
    sheetId: string;
    name: string;
    dataUrl: string;
  }[] = [];
  const request = vi.fn(async (_url: string, options: RequestInit) => {
    expect(options.headers).toMatchObject({
      Authorization: "Bearer owner-token",
    });
    if (options.method === "POST") {
      const body = JSON.parse(String(options.body));
      expect(body).toEqual({
        name: "A Movie",
        releaseDate: "2027-05-01",
        dataUrl: "https://www.themoviedb.org/movie/42",
        revision: 0,
      });
      const item = { ...body, id: "saved", sheetId: "fantasy-office" };
      items.push(item);
      return Response.json({ ok: true, item });
    }
    return Response.json({
      ok: true,
      sheets: [{ id: "fantasy-office", revision: 0 }],
      items,
    });
  });
  vi.stubGlobal("fetch", request);
  expect((await saveMovie("1", movie)).existed).toBe(false);
  expect((await saveMovie("1", { ...movie, name: "Renamed" })).existed).toBe(
    true,
  );
  expect(items).toHaveLength(1);
  expect(items[0].name).toBe("A Movie");
});
it("reloads a conflicting revision and recognizes the movie saved in another session", async () => {
  window.boxThisLapGetManagerAccessToken = async () => "owner-token";
  let reads = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, options: RequestInit) =>
      options.method === "POST"
        ? Response.json({ ok: false, error: "Changed" }, { status: 409 })
        : Response.json({
            ok: true,
            sheets: [{ id: "fantasy-office", revision: reads++ }],
            items:
              reads > 1
                ? [
                    {
                      id: "saved",
                      sheetId: "fantasy-office",
                      name: "Other title",
                      dataUrl: "https://www.themoviedb.org/movie/42",
                    },
                  ]
                : [],
          }),
    ),
  );
  expect((await saveMovie("1", movie)).existed).toBe(true);
});
it("links an existing unlinked manual entry without replacing its notes or list position", async () => {
  window.boxThisLapGetManagerAccessToken = async () => "owner-token";
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, options: RequestInit) => {
      if (options.method === "PATCH") {
        expect(url).toContain("/fantasy-office/items/manual");
        expect(JSON.parse(String(options.body))).toEqual({
          dataUrl: "https://www.themoviedb.org/movie/42",
          releaseDate: "2027-05-01",
          revision: 5,
        });
        return Response.json({
          ok: true,
          item: {
            id: "manual",
            sheetId: "fantasy-office",
            name: "A Movie",
            dataUrl: "https://www.themoviedb.org/movie/42",
          },
        });
      }
      expect(options.method).not.toBe("POST");
      return Response.json({
        ok: true,
        sheets: [{ id: "fantasy-office", revision: 5 }],
        items: [
          {
            id: "manual",
            sheetId: "fantasy-office",
            name: "A Movie",
            dataUrl: "",
            notes: "My notes",
            rank: 3,
          },
        ],
      });
    }),
  );
  expect((await saveMovie("1", movie)).item.id).toBe("manual");
});
