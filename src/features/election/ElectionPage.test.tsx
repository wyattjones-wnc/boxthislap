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
  it("shows only counted progress beside the state name and one source link", async () => {
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
    expect(
      screen.getByText("74.0% counted").closest("header")?.textContent,
    ).toContain("Alaska");
    expect(screen.queryByText(/Too Early to Call/)).toBeNull();
    expect(screen.queryByText(/ranked choice/)).toBeNull();
    expect(screen.getByAltText("Outline of Mississippi")).toBeTruthy();
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(
      screen.getByRole("link", { name: /AP via NPR/ }).getAttribute("href"),
    ).toContain("apps.npr.org/2026-election-results/");
  });
  it("keeps source links available when results cannot load", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    renderPage();
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByRole("link", { name: /AP via NPR/ })).toBeTruthy();
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
  it("checks before showing totals even on an immediate return with warm query data", async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 30000 } },
    });
    const prior = {
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
              first: "Cached",
              last: "Candidate",
              party: "Dem",
              votes: 100,
              percent: 0.5,
            },
          ],
        },
      ],
    };
    client.setQueryData(["election-results-2026"], prior);
    let complete!: (value: {
      ok: boolean;
      json: () => Promise<typeof prior>;
    }) => void;
    const fetcher = vi.fn(
      () =>
        new Promise<{ ok: boolean; json: () => Promise<typeof prior> }>(
          (resolve) => {
            complete = resolve;
          },
        ),
    );
    vi.stubGlobal("fetch", fetcher);
    const view = render(
      <QueryClientProvider client={client}>
        <ElectionPage />
      </QueryClientProvider>,
    );
    expect(screen.queryByText("Cached Candidate")).toBeNull();
    expect(screen.getByText("Checking results…")).toBeTruthy();
    await act(async () => {
      complete({ ok: true, json: async () => prior });
    });
    expect(await screen.findByText("Cached Candidate")).toBeTruthy();
    expect(String(vi.mocked(fetch).mock.calls[0]?.[0])).toContain("?fresh=1");
    view.unmount();
    render(
      <QueryClientProvider client={client}>
        <ElectionPage />
      </QueryClientProvider>,
    );
    expect(screen.queryByText("Cached Candidate")).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(2);
    await act(async () => {
      complete({
        ok: true,
        json: async () => ({
          ...prior,
          races: prior.races.map((r) => ({
            ...r,
            candidates: r.candidates.map((c) => ({
              ...c,
              first: "Updated",
              votes: 125,
            })),
          })),
        }),
      });
    });
    expect(await screen.findByText("Updated Candidate")).toBeTruthy();
    expect(String(vi.mocked(fetch).mock.calls[1]?.[0])).toContain("?fresh=1");
  });
});
