// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppProviders } from "../../app/providers";
import { FantasyOffice2026Page } from "./FantasyOffice2026Feature";

afterEach(() => {
  vi.restoreAllMocks();
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
          movies: [],
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
});
