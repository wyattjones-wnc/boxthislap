// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import ElectionPage from "./ElectionPage";

vi.mock("./electionSeen", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./electionSeen")>()),
  loadBaselines: async () => ({ baselines: {} }),
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
function renderPage() {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <ElectionPage />
    </QueryClientProvider>,
  );
}
describe("Election page", () => {
  it("shows AP vote totals, call status and Alaska ranked-choice context", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          year: 2026,
          fetchedAt: new Date().toISOString(),
          races: [
            {
              id: "1",
              state: "AK",
              office: "S",
              officeName: "U.S. Senate",
              raceCallStatus: "Too Early to Call",
              eevp: 0.74,
              updated: Date.now(),
              candidates: [
                {
                  id: "a",
                  first: "Test",
                  last: "Candidate",
                  party: "Dem",
                  votes: 1234,
                  percent: 0.51,
                },
              ],
            },
          ],
        }),
      }),
    );
    renderPage();
    expect(await screen.findByText("Test Candidate")).toBeTruthy();
    expect(screen.getByText(/Too Early to Call/).textContent).toContain(
      "74.0%",
    );
    expect(screen.getByText(/Initial count/)).toBeTruthy();
    expect(screen.getByAltText("Outline of Mississippi")).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: "Latest Mississippi Senate results at NPR" })
        .getAttribute("href"),
    ).toContain("mississippi.html");
  });
  it("keeps source links available when results cannot load", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    renderPage();
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Latest Alaska Senate results at NPR" }),
    ).toBeTruthy();
  });
  it("polls the live Worker every minute and replaces vote counts without a reload", async () => {
    vi.useFakeTimers();
    let votes = 100;
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      expect(String(input)).toContain("/api/elections/2026/results");
      return {
        ok: true,
        json: async () => ({
          year: 2026,
          fetchedAt: new Date().toISOString(),
          races: [
            {
              id: "3079",
              state: "AK",
              office: "S",
              officeName: "U.S. Senate",
              raceCallStatus: "Too Early to Call",
              updated: Date.now(),
              candidates: [
                {
                  id: "a",
                  first: "Live",
                  last: "Candidate",
                  party: "Dem",
                  votes,
                  percent: 0.5,
                },
              ],
            },
          ],
        }),
      };
    });
    vi.stubGlobal("fetch", fetcher);
    renderPage();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(screen.getAllByRole("cell", { name: "100" })).toHaveLength(2);
    expect(String(fetcher.mock.calls[0]?.[0])).toContain(
      "/api/elections/2026/results",
    );
    votes = 125;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60010);
    });
    expect(fetcher.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByRole("cell", { name: "125" })).toHaveLength(2);
  });
});
