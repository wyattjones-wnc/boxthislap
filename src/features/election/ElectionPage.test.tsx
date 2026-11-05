// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
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
});
