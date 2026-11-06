// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RaceResults, type Candidate } from "./RaceResults";
import { loadBaselines, seenQueryKey, type Baseline } from "./electionSeen";

const candidate = (id: string, votes: number): Candidate => ({
  id,
  first: id,
  last: "Candidate",
  party: id === "A" ? "Dem" : id === "B" ? "GOP" : "Ind",
  votes,
  percent: 0.5,
});
const initial = [candidate("A", 100), candidate("B", 80)];
let shared: Baseline | null;
let failSave = false;
const row = (name: string) =>
  within(screen.getByRole("rowheader", { name }).closest("tr")!);
function Harness({
  candidates = initial,
  isAdmin = true,
  sourceUpdated = 1000,
}: {
  candidates?: Candidate[];
  isAdmin?: boolean;
  sourceUpdated?: number;
}) {
  const seen = useQuery({
    queryKey: seenQueryKey,
    queryFn: ({ signal }) => loadBaselines(signal),
  });
  return (
    <RaceResults
      candidates={candidates}
      caption="Alaska Senate vote totals"
      raceKey="AK:3079"
      baseline={seen.data?.baselines["AK:3079"] || null}
      baselineLoaded={Boolean(seen.data)}
      isAdmin={isAdmin}
      sourceUpdated={sourceUpdated}
      canMarkSeen={seen.isSuccess}
    />
  );
}
function renderRace(props: Parameters<typeof Harness>[0] = {}) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrap = (value: Parameters<typeof Harness>[0]) => (
    <QueryClientProvider client={client}>
      <Harness {...value} />
    </QueryClientProvider>
  );
  const view = render(wrap(props));
  return {
    ...view,
    update: (value: Parameters<typeof Harness>[0]) =>
      view.rerender(wrap(value)),
  };
}
beforeEach(() => {
  shared = null;
  failSave = false;
  window.boxThisLapGetManagerAccessToken = async () => "admin-token";
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, options?: RequestInit) => {
      if (options?.method === "PUT") {
        if (failSave)
          return {
            ok: false,
            json: async () => ({
              ok: false,
              error: "Administrator access is required.",
            }),
          };
        const body = JSON.parse(options.body as string);
        const sorted = [...body.candidates].sort((a, b) => b.votes - a.votes);
        shared = {
          markedAt: "2026-11-05T19:00:00Z",
          sourceUpdated: body.sourceUpdated,
          votes: Object.fromEntries(
            body.candidates.map((c: Candidate) => [c.id, c.votes]),
          ),
          total: body.candidates.reduce(
            (sum: number, c: Candidate) => sum + c.votes,
            0,
          ),
          gap: sorted.length > 1 ? sorted[0].votes - sorted[1].votes : null,
          revision: (shared?.revision || 0) + 1,
        };
        return { ok: true, json: async () => ({ ok: true, baseline: shared }) };
      }
      return {
        ok: true,
        json: async () => ({
          ok: true,
          baselines: shared ? { "AK:3079": shared } : {},
        }),
      };
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  delete window.boxThisLapGetManagerAccessToken;
});

describe("shared election comparisons", () => {
  it("admin saves a baseline and an independent signed-out viewer sees the same timestamp and changes", async () => {
    const admin = renderRace();
    await waitFor(() =>
      expect((screen.getByRole("button") as HTMLButtonElement).disabled).toBe(
        false,
      ),
    );
    fireEvent.click(screen.getByRole("button"));
    await screen.findByText("Shared seen baseline saved.");
    expect(shared?.total).toBe(180);
    expect(
      (
        vi
          .mocked(fetch)
          .mock.calls.find(([, options]) => options?.method === "PUT")?.[1]
          ?.headers as Record<string, string>
      ).Authorization,
    ).toBe("Bearer admin-token");
    admin.unmount();
    delete window.boxThisLapGetManagerAccessToken;
    renderRace({
      isAdmin: false,
      sourceUpdated: 2000,
      candidates: [candidate("A", 130), candidate("B", 90)],
    });
    expect(await screen.findByText("+30")).toBeTruthy();
    expect(row("B Candidate GOP").getByText("+10")).toBeTruthy();
    expect(row("Total votes").getByText("+40")).toBeTruthy();
    expect(screen.getByText("+20")).toBeTruthy();
    expect(document.querySelector("time")?.getAttribute("datetime")).toBe(
      "2026-11-05T19:00:00Z",
    );
    expect(screen.queryByRole("button")).toBeNull();
  });
  it("shows corrections and leadership changes against a shared baseline", async () => {
    shared = {
      markedAt: "2026-11-05T19:00:00Z",
      sourceUpdated: 1000,
      votes: { A: 100, B: 90 },
      total: 190,
      gap: 10,
      revision: 1,
    };
    renderRace({
      sourceUpdated: 2000,
      candidates: [candidate("A", 98), candidate("B", 105)],
    });
    expect(await screen.findByText("−2")).toBeTruthy();
    expect(screen.getByText(/B Candidate leads A Candidate/)).toBeTruthy();
    expect(screen.getByText("−17")).toBeTruthy();
  });
  it("does not claim success when the server rejects a save", async () => {
    failSave = true;
    renderRace();
    await waitFor(() =>
      expect((screen.getByRole("button") as HTMLButtonElement).disabled).toBe(
        false,
      ),
    );
    fireEvent.click(screen.getByRole("button"));
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Administrator access is required",
    );
    expect(shared).toBeNull();
    expect(screen.queryByText("Shared seen baseline saved.")).toBeNull();
  });
  it("ignores browser-local baselines and disables writes when shared data is unavailable", async () => {
    localStorage.setItem(
      "boxThisLap:election-seen:2026:admin:AK:3079",
      JSON.stringify({ total: 1000 }),
    );
    vi.mocked(fetch).mockRejectedValue(new Error("unavailable"));
    renderRace();
    expect(await screen.findByText(/Loading comparison/)).toBeTruthy();
    expect((screen.getByRole("button") as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect(screen.queryByText(/Compared with/)).toBeNull();
    localStorage.clear();
  });
  it("uses an empty dash for unchanged candidate, total and lead differences", async () => {
    shared = {
      markedAt: "2026-11-05T19:00:00Z",
      sourceUpdated: 1000,
      votes: { A: 100, B: 80 },
      total: 180,
      gap: 20,
      revision: 1,
    };
    renderRace({ isAdmin: false });
    await screen.findByText(/Compared with/);
    expect(screen.getAllByText("—")).toHaveLength(4);
    expect(screen.queryByText("0")).toBeNull();
    expect(screen.getByText("20 votes")).toBeTruthy();
    expect(screen.getByText("Lead")).toBeTruthy();
    expect(
      screen.getByLabelText("No change in total votes since seen"),
    ).toBeTruthy();
  });
  it("groups remaining candidates into one Other row without changing saved raw counts", async () => {
    shared = {
      markedAt: "2026-11-05T19:00:00Z",
      sourceUpdated: 1000,
      votes: { A: 100, B: 80, C: 10, D: 5, other: 5 },
      total: 200,
      gap: 20,
      revision: 1,
    };
    const candidates = [
      candidate("A", 110),
      candidate("B", 90),
      candidate("C", 14),
      candidate("D", 6),
      { ...candidate("other", 10), first: "", last: "Other" },
    ].map((c) => ({ ...c, percent: c.votes / 230 }));
    renderRace({ candidates, sourceUpdated: 2000 });
    await screen.findByText(/Compared with/);
    expect(screen.queryByRole("rowheader", { name: /C Candidate/ })).toBeNull();
    expect(screen.queryByRole("rowheader", { name: /D Candidate/ })).toBeNull();
    expect(row("Other").getByText("30")).toBeTruthy();
    expect(row("Other").getByText("13.0%")).toBeTruthy();
    expect(row("Other").getByText("+10")).toBeTruthy();
    expect(row("Total votes").getByText("230")).toBeTruthy();
    const timing = screen.getByText(/Compared with/).closest("p")!;
    expect(timing.textContent).toContain(" · Updated");
    expect(timing.querySelectorAll("time")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button"));
    await screen.findByText("Shared seen baseline saved.");
    expect(shared?.votes).toEqual({ A: 110, B: 90, C: 14, D: 6, other: 10 });
  });
  it("compares Other using the current members when a candidate enters the top two", async () => {
    shared = {
      markedAt: "2026-11-05T19:00:00Z",
      sourceUpdated: 1000,
      votes: { A: 100, B: 80, C: 70, other: 5 },
      total: 255,
      gap: 20,
      revision: 1,
    };
    renderRace({
      isAdmin: false,
      sourceUpdated: 2000,
      candidates: [
        candidate("C", 120),
        candidate("A", 110),
        candidate("B", 90),
        { ...candidate("other", 10), first: "", last: "Other" },
      ],
    });
    await screen.findByText(/Compared with/);
    expect(screen.queryByRole("rowheader", { name: /B Candidate/ })).toBeNull();
    expect(row("Other").getByText("100")).toBeTruthy();
    expect(row("Other").getByText("+15")).toBeTruthy();
  });
  it("shows a negative Democratic lead and compares legacy baselines using signed raw counts", async () => {
    shared = {
      markedAt: "2026-11-05T19:00:00Z",
      sourceUpdated: 1000,
      votes: { A: 80, B: 100, C: 8 },
      total: 188,
      gap: 20,
      revision: 1,
    };
    renderRace({
      isAdmin: false,
      sourceUpdated: 2000,
      candidates: [
        candidate("A", 90),
        candidate("B", 120),
        { ...candidate("C", 10), party: "GOP" },
      ],
    });
    expect(await screen.findByText(/Compared with/)).toBeTruthy();
    expect(screen.getByText("−30 votes")).toBeTruthy();
    expect(screen.getByLabelText("−10 lead since seen")).toBeTruthy();
    expect(
      screen.getByRole("rowheader", { name: "B Candidate GOP" }),
    ).toBeTruthy();
  });
});
