// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { AppProviders } from "../../../app/providers";
import {
  newDraft,
  transition,
  visibleDraft,
} from "../../../../workers/league-drafts/src/model.js";
import {
  DraftBanner,
  LeagueDraftHubCard,
  LeagueDraftPage,
} from "./LeagueDraftFeature";
import type { Draft, Pick } from "./types";

const participants = ["1", "2", "3", "6"].map((id) => ({
  id,
  name: `Manager ${id}`,
}));
const configuration = {
  league: "fantasy-office",
  year: 2027,
  name: "Test office draft",
  resourceLabel: "Movies",
  participants,
  rounds: 2,
  options: Array.from({ length: 10 }, (_, index) => ({
    id: `option-${index}`,
    name: `Movie ${index}`,
  })),
};
function activeState() {
  let state = newDraft(configuration, "6");
  state = transition(state, "publish", { revision: state.revision }, "6", true);
  return transition(state, "start", { revision: state.revision }, "6", true);
}
const clients: QueryClient[] = [];
function wrapper(component: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  clients.push(client);
  return render(
    <AppProviders>
      <QueryClientProvider client={client}>{component}</QueryClientProvider>
    </AppProviders>,
  );
}
beforeEach(() => {
  vi.stubEnv(
    "VITE_LEAGUE_DRAFTS_ENDPOINT",
    "https://box-this-lap-league-drafts-dev.example",
  );
  window.history.replaceState(null, "", "#fantasy-office-2027-draft");
  window.boxThisLapGetManagerAccessToken = async () => "token";
});
afterEach(() => {
  cleanup();
  clients.forEach((client) => client.clear());
  clients.length = 0;
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  localStorage.clear();
  sessionStorage.clear();
  delete window.boxThisLapGetManagerAccessToken;
});

describe("2027 league drafting", () => {
  it("lets an admin select managers, seed, publish, start, and make an attributed dev test pick", async () => {
    localStorage.setItem(
      "boxThisLapManagerSession",
      JSON.stringify({ managerId: "6", isAdmin: true }),
    );
    type BackendState = Omit<ReturnType<typeof newDraft>, "picks" | "audit"> & {
      picks: Pick[];
      audit: Array<{ action: string }>;
    };
    let state: BackendState | null = null;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, options) => {
      const url = new URL(String(input));
      if (url.pathname === "/api/managers")
        return Response.json({ managers: participants });
      if (options?.method === "POST") {
        const body = JSON.parse(String(options.body));
        if (url.pathname === "/api/drafts") state = newDraft(body, "6");
        else if (state) {
          const action = url.pathname.split("/").at(-1);
          const next = transition(
            state,
            action === "test-pick" ? "pick" : action,
            body,
            action === "test-pick"
              ? state.schedule[state.picks.length].managerId
              : "6",
            true,
            "6",
          ) as BackendState;
          if (action === "test-pick") {
            next.picks.at(-1)!.adminActor = "6";
            next.audit.at(-1)!.action = "test-pick";
          }
          state = next;
        }
        return Response.json({ draft: visibleDraft(state, "6", true) });
      }
      return Response.json({
        drafts: state ? [visibleDraft(state, "6", true)] : [],
      });
    });
    wrapper(<LeagueDraftPage league="fantasy-office" mode="manage" />);
    await screen.findByRole("checkbox", { name: "Manager 1" });
    for (const manager of participants)
      await userEvent.click(
        screen.getByRole("checkbox", { name: manager.name }),
      );
    for (let index = 0; index < 3; index += 1)
      await userEvent.click(
        screen.getByRole("button", { name: "Move Manager 6 earlier" }),
      );
    await userEvent.click(
      screen.getByRole("button", { name: "Fill with sample test options" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Save setup" }));
    await userEvent.click(
      await screen.findByRole("button", { name: "Publish" }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Confirm publish" }),
    );
    await userEvent.click(await screen.findByRole("button", { name: "Start" }));
    await userEvent.click(
      screen.getByRole("button", { name: "Confirm start" }),
    );
    await userEvent.click(await screen.findByRole("tab", { name: "Resource" }));
    const movie = (
      await screen.findByRole("heading", { name: "Test Movie 1" })
    ).closest("article")!;
    expect(screen.getByRole("status").textContent).toContain(
      "Manager 6 is on the clock",
    );
    await userEvent.click(
      within(movie).getByRole("button", { name: "Test select" }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Confirm test pick" }),
    );
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toContain(
        "Manager 1 is on the clock",
      ),
    );
    expect(screen.getByText(/Admin test pick/)).toBeTruthy();
  });
  it("directs signed-out managers to login and preserves the return draft", async () => {
    const state = activeState();
    wrapper(
      <DraftBanner draft={visibleDraft(state, "") as Draft} managerId="" />,
    );
    expect(screen.getByText(/Log in to see your position/)).toBeTruthy();
    await userEvent.click(screen.getByRole("link", { name: "Log in" }));
    expect(sessionStorage.getItem("boxThisLapDraftLoginReturn")).toBe(
      "fantasy-office-2027-draft",
    );
  });
  it("counts the remaining schedule and identifies consecutive snake picks", () => {
    let state = activeState();
    for (let index = 0; index < 3; index += 1)
      state = transition(
        state,
        "pick",
        {
          revision: state.revision,
          optionId: `option-${index}`,
          requestId: `request-${index}`,
        },
        state.schedule[state.picks.length].managerId,
        false,
      );
    wrapper(
      <DraftBanner draft={visibleDraft(state, "6") as Draft} managerId="6" />,
    );
    expect(screen.getByRole("status").textContent).toContain(
      "Your turn — round 1, pick #4",
    );
    expect(screen.getByText(/another pick immediately/)).toBeTruthy();
  });
  it("confirms a pick, updates taken resources, and displays the new turn", async () => {
    localStorage.setItem(
      "boxThisLapManagerSession",
      JSON.stringify({ managerId: "1" }),
    );
    let state = activeState();
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, options) => {
      const url = String(input);
      if (url.endsWith("/picks")) {
        state = transition(
          state,
          "pick",
          JSON.parse(String(options?.body)),
          "1",
          false,
        );
        return Response.json({ ok: true, draft: visibleDraft(state, "1") });
      }
      return Response.json({ ok: true, drafts: [visibleDraft(state, "1")] });
    });
    wrapper(<LeagueDraftPage league="fantasy-office" mode="active" />);
    await screen.findByRole("heading", { name: "Test office draft" });
    await userEvent.click(await screen.findByRole("tab", { name: "Resource" }));
    const movie = screen
      .getByRole("heading", { name: "Movie 0" })
      .closest("article")!;
    await userEvent.click(
      within(movie).getByRole("button", { name: "Draft this" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Confirm pick" }));
    await waitFor(() =>
      expect(within(movie).getByRole("button", { name: "Taken" })).toBeTruthy(),
    );
    expect(screen.getByRole("status").textContent).toContain(
      "Manager 2 is on the clock",
    );
    expect(screen.getByRole("status").textContent).toContain(
      "Your next pick is #8 — 6 selections before you",
    );
    expect(
      (
        within(movie).getByRole("button", {
          name: "Taken",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    expect(state.picks.length).toBe(1);
  });
  it("shows conflicts without inventing a successful selection", async () => {
    localStorage.setItem(
      "boxThisLapManagerSession",
      JSON.stringify({ managerId: "1" }),
    );
    const state = activeState();
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) =>
      String(input).endsWith("/picks")
        ? Response.json(
            { ok: false, error: "The draft changed. Refresh and try again." },
            { status: 409 },
          )
        : Response.json({ drafts: [visibleDraft(state, "1")] }),
    );
    wrapper(<LeagueDraftPage league="fantasy-office" mode="active" />);
    await userEvent.click(await screen.findByRole("tab", { name: "Resource" }));
    const movie = (
      await screen.findByRole("heading", { name: "Movie 0" })
    ).closest("article")!;
    await userEvent.click(
      within(movie).getByRole("button", { name: "Draft this" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Confirm pick" }));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(state.picks.length).toBe(0);
  });
  it("uses the same subscription in Manager Hub and the banner, with no automatic push permission request", async () => {
    localStorage.setItem(
      "boxThisLapManagerSession",
      JSON.stringify({ managerId: "1" }),
    );
    let state = activeState();
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, options) => {
      if (String(input).endsWith("/preferences")) {
        state = transition(
          state,
          "preferences",
          JSON.parse(String(options?.body)),
          "1",
          false,
        );
        return Response.json({ draft: visibleDraft(state, "1") });
      }
      return Response.json({ drafts: [visibleDraft(state, "1")] });
    });
    const page = wrapper(
      <LeagueDraftPage league="fantasy-office" mode="draft" />,
    );
    await userEvent.click(
      await screen.findByRole("button", { name: "Subscribe to device alerts" }),
    );
    await screen.findByRole("button", {
      name: "Unsubscribe from device alerts",
    });
    expect(state.preferences["1"].push).toBe(true);
    page.unmount();
    wrapper(<LeagueDraftHubCard />);
    expect(
      await screen.findByRole("button", {
        name: "Unsubscribe from device alerts",
      }),
    ).toBeTruthy();
    expect(screen.getByText("Your turn · pick #1")).toBeTruthy();
  });
  it("clears the personalized view when the account changes", async () => {
    localStorage.setItem(
      "boxThisLapManagerSession",
      JSON.stringify({ managerId: "1" }),
    );
    const state = activeState();
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      const id =
        JSON.parse(localStorage.getItem("boxThisLapManagerSession") || "{}")
          .managerId || "";
      return Response.json({ drafts: [visibleDraft(state, id)] });
    });
    wrapper(<LeagueDraftPage league="fantasy-office" mode="draft" />);
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toContain("Your turn"),
    );
    await act(async () => {
      localStorage.setItem(
        "boxThisLapManagerSession",
        JSON.stringify({ managerId: "2" }),
      );
      window.dispatchEvent(new Event("boxthislap:session-changed"));
    });
    await waitFor(() =>
      expect(screen.getByRole("status").textContent).toContain(
        "Your next pick is #2",
      ),
    );
    expect(screen.getByRole("status").textContent).not.toContain("Your turn");
  });
  it("drafts an unlisted name and shows it on the manager overview", async () => {
    localStorage.setItem(
      "boxThisLapManagerSession",
      JSON.stringify({ managerId: "1" }),
    );
    let state = activeState();
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, options) => {
      if (String(input).endsWith("/picks")) {
        state = transition(
          state,
          "pick",
          JSON.parse(String(options?.body)),
          "1",
          false,
        );
        return Response.json({ draft: visibleDraft(state, "1") });
      }
      return Response.json({ drafts: [visibleDraft(state, "1")] });
    });
    const active = wrapper(
      <LeagueDraftPage league="fantasy-office" mode="active" />,
    );
    await userEvent.type(
      await screen.findByRole("searchbox", { name: "Movie or pick name" }),
      "An Unlisted Film",
    );
    expect(
      screen.getByText("No resource matches. You can still draft this name."),
    ).toBeTruthy();
    await userEvent.click(
      screen.getByRole("button", { name: "Draft An Unlisted Film" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Confirm pick" }));
    await waitFor(() =>
      expect(state.picks[0].optionName).toBe("An Unlisted Film"),
    );
    active.unmount();
    wrapper(<LeagueDraftPage league="fantasy-office" mode="draft" />);
    expect(await screen.findByText("Round 1: An Unlisted Film")).toBeTruthy();
    expect(screen.queryByRole("searchbox")).toBeNull();
    expect(
      screen.getByRole("link", { name: "Go to drafting" }).getAttribute("href"),
    ).toContain("-active?draft=");
  });
  it("protects manage pages for non-admin managers", () => {
    localStorage.setItem(
      "boxThisLapManagerSession",
      JSON.stringify({ managerId: "1" }),
    );
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ drafts: [] }),
    );
    wrapper(<LeagueDraftPage league="fantasy-office" mode="manage" />);
    expect(screen.getByText("Administrator access is required.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Save setup" })).toBeNull();
  });
});
