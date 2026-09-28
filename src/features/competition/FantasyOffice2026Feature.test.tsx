// @vitest-environment jsdom
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppProviders } from "../../app/providers";
import { FantasyOffice2026Page } from "./FantasyOffice2026Feature";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
  window.location.hash = "";
});

describe("FantasyOffice2026Page", () => {
  it("renders provisional API standings and metric totals", async () => {
    window.location.hash = "#fantasy-office-2026-results";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          draft: [],
          generatedAt: "2026-09-25T12:00:00Z",
          latestVerification: "2026-09-25T12:00:00Z",
          movies: [
            {
              active: true,
              awardPoints: 0,
              domesticGross: 10,
              draftNumber: "D1",
              id: "alpha",
              letterboxdRating: 3,
              manager: "Jonathan",
              movie: "Alpha",
              numberOneWeekends: 0,
              score: { points: 10, provisional: false },
              tomatometer: 60,
            },
            {
              active: true,
              awardPoints: 0,
              domesticGross: 20,
              draftNumber: "D2",
              id: "zulu",
              letterboxdRating: 4,
              manager: "Wyatt",
              movie: "Zulu",
              numberOneWeekends: 1,
              score: { points: 20, provisional: false },
              tomatometer: 80,
            },
          ],
          ok: true,
          provisional: true,
          standings: [
            {
              awardPoints: 10,
              boxOfficePoints: 100,
              criticalPoints: 500,
              manager: "Manager One",
              movies: [
                {
                  id: "movie-one",
                  movie: "Movie One",
                  score: { points: 610 },
                },
              ],
              points: 610,
              provisional: true,
              rank: 1,
            },
          ],
        }),
        { headers: { "Content-Type": "application/json" }, status: 200 },
      ),
    );

    render(
      <AppProviders>
        <FantasyOffice2026Page mode="results" />
      </AppProviders>,
    );

    await waitFor(() => expect(screen.getByText("Manager")).toBeTruthy());
    expect(document.querySelector(".manager-chip .manager-dot")).toBeTruthy();
    expect(screen.getByText("610 pts")).toBeTruthy();
    expect(screen.getByText(/Standings are provisional/)).toBeTruthy();
  });

  it("separates pending movies from missing-source failures in Manage", async () => {
    window.location.hash = "#fantasy-office-2026-manage";
    localStorage.setItem(
      "boxThisLapManagerSession",
      JSON.stringify({ isAdmin: true, managerId: "6" }),
    );
    window.boxThisLapGetManagerAccessToken = async () => "admin-token";
    const emptyHealth = {
      domestic_gross: {
        lastAttemptAt: "",
        lastSuccessAt: "",
        status: "not_available",
      },
      letterboxd_rating: {
        lastAttemptAt: "",
        lastSuccessAt: "",
        status: "not_available",
      },
      number_one_weekends: {
        lastAttemptAt: "",
        lastSuccessAt: "",
        status: "not_available",
      },
      tomatometer: {
        lastAttemptAt: "",
        lastSuccessAt: "",
        status: "not_available",
      },
    };
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          draft: [],
          generatedAt: "2026-09-25T12:00:00Z",
          latestVerification: "",
          movies: [
            {
              active: true,
              awardPoints: 0,
              draftNumber: "D1",
              health: emptyHealth,
              id: "movie-one",
              manager: "Manager One",
              movie: "Movie One",
              score: { points: 0 },
            },
          ],
          ok: true,
          provisional: true,
          runs: [],
          standings: [],
        }),
        { headers: { "Content-Type": "application/json" }, status: 200 },
      ),
    );

    render(
      <AppProviders>
        <FantasyOffice2026Page mode="manage" />
      </AppProviders>,
    );

    expect(await screen.findByText("Movie diagnostics")).toBeTruthy();
    expect(screen.getByText("1 pending")).toBeTruthy();
    expect(
      screen.getByText(/rotating collector has not attempted this movie yet/i),
    ).toBeTruthy();
    delete window.boxThisLapGetManagerAccessToken;
  });

  it("sorts the Movies table from every column header", async () => {
    const user = userEvent.setup();
    window.location.hash = "#fantasy-office-2026-movies";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          draft: [],
          generatedAt: "2026-09-27T12:00:00Z",
          latestVerification: "2026-09-27T12:00:00Z",
          movies: [
            {
              active: true,
              awardPoints: 0,
              domesticGross: 10,
              draftNumber: "D1",
              id: "alpha",
              letterboxdRating: 3,
              manager: "Jonathan",
              movie: "Alpha",
              numberOneWeekends: 0,
              score: { points: 10, provisional: false },
              tomatometer: 60,
            },
            {
              active: true,
              awardPoints: 0,
              domesticGross: 20,
              draftNumber: "D2",
              id: "zulu",
              letterboxdRating: 4,
              manager: "Wyatt",
              movie: "Zulu",
              numberOneWeekends: 1,
              score: { points: 20, provisional: false },
              tomatometer: 80,
            },
          ],
          ok: true,
          provisional: false,
          standings: [],
        }),
        { headers: { "Content-Type": "application/json" }, status: 200 },
      ),
    );
    render(
      <AppProviders>
        <FantasyOffice2026Page mode="movies" />
      </AppProviders>,
    );

    const table = await screen.findByRole("table");
    await user.click(screen.getByRole("button", { name: "Sort by Total" }));
    await user.click(
      screen.getByRole("button", {
        name: "Sort by Total, currently ascending",
      }),
    );
    const rows = within(table).getAllByRole("row").slice(1);
    expect(within(rows[0]).getByText("Zulu")).toBeTruthy();
    expect(screen.getAllByRole("columnheader")).toHaveLength(8);
  });
});
