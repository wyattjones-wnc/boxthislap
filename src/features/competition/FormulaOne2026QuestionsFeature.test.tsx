// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import questions from "../../../workers/formula-one/test/fixtures/2026-questions.json";
import {
  FormulaOne2026QuestionsPage,
  parseFormulaOne2026Questions,
  type SeasonProgress,
} from "./FormulaOne2026QuestionsFeature";

const state = vi.hoisted(() => ({
  route: "formula-1-2026-questions",
  session: null as { isAdmin: boolean } | null,
}));
vi.mock("../../app/providers", () => ({ useAppState: () => state }));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  state.route = "formula-1-2026-questions";
  state.session = null;
});
const season: SeasonProgress = {
  counts: {
    driverPoints: { "Andrea Kimi Antonelli": 70, "Lando Norris": 50 },
    podiums: { "Lando Norris": 2 },
    driverOfTheDay: { "Lando Norris": 1 },
  },
  drivers: [
    {
      id: "antonelli",
      name: "Andrea Kimi Antonelli",
      points: 70,
      rank: 1,
      starting: true,
      laps: 150,
    },
    {
      id: "norris",
      name: "Lando Norris",
      points: 50,
      rank: 5,
      starting: true,
      laps: 120,
    },
  ],
  constructors: [],
  rounds: [],
  teammatePairs: [
    {
      names: ["Lewis Hamilton", "Charles Leclerc"],
      adjusted: [0.2],
      unadjusted: [0.4],
    },
  ],
  completedRounds: 2,
};
function csv(emptyPodiumBets = false) {
  const escape = (value: string) => `"${value.replaceAll('"', '""')}"`;
  const rows = [
    ["", "", "Test Manager", ""],
    ["Question", "Answer", "Bet", "Points"],
    ...questions.map((question) => [
      question.question,
      question.answer,
      emptyPodiumBets && question.number === 2
        ? ""
        : question.bets[0]?.bet || "",
      "0",
    ]),
    ["TOTAL", "", "", "0"],
  ];
  return rows.map((row) => row.map(escape).join(",")).join("\n");
}
function setup({ emptyPodiumBets = false, failProgress = false } = {}) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const fetch = vi
    .spyOn(globalThis, "fetch")
    .mockImplementation(async (input) =>
      String(input).includes("/questions/progress")
        ? failProgress
          ? new Response("{}", { status: 503 })
          : new Response(JSON.stringify({ ok: true, ...season }))
        : new Response(csv(emptyPodiumBets)),
    );
  render(
    <QueryClientProvider client={client}>
      <FormulaOne2026QuestionsPage />
    </QueryClientProvider>,
  );
  return { fetch, user: userEvent.setup() };
}

describe("2026 Formula 1 Questions React page", () => {
  it("owns the default, filters, individual questions, and provisional results without a footer", async () => {
    const { user } = setup();
    await screen.findByText(/Current championship leader/);
    const select = screen.getByRole("combobox", { name: "Question" });
    expect((select as HTMLSelectElement).value).toBe("in-progress");
    expect(
      screen.queryByRole("heading", { name: questions[9].question }),
    ).toBeNull();
    expect(screen.queryByText(/Season to date/)).toBeNull();
    expect(screen.getByText("Adjusted")).toBeTruthy();
    expect(screen.getByText("Unadjusted")).toBeTruthy();
    await user.type(
      screen.getByRole("searchbox", { name: "Filter" }),
      "podium",
    );
    expect(
      screen.getByRole("heading", { name: questions[1].question }),
    ).toBeTruthy();
    await user.selectOptions(select, "question-34");
    expect((screen.getByRole("searchbox") as HTMLInputElement).value).toBe("");
    const card = screen
      .getByRole("heading", { name: questions[33].question })
      .closest("article")!;
    expect(within(card).getByText("P5 · 50 points")).toBeTruthy();
    expect(within(card).queryByText("Andrea Kimi Antonelli")).toBeNull();
    await user.selectOptions(select, "");
    expect(
      screen.getByRole("heading", { name: questions[9].question }),
    ).toBeTruthy();
    expect(screen.getByText("No bet listed")).toBeTruthy();
    await user.selectOptions(select, "question-16");
    expect(
      screen.getByRole("heading", { name: /Max Verstappen and Isack Hadjar/ }),
    ).toBeTruthy();
  });

  it("excludes questions with no actual bets even when provisional data exists", async () => {
    const { user } = setup({ emptyPodiumBets: true });
    await screen.findByText(/Current championship leader/);
    expect(
      screen.queryByRole("heading", { name: questions[1].question }),
    ).toBeNull();
    await user.selectOptions(screen.getByRole("combobox"), "question-2");
    expect(
      screen.getByRole("heading", { name: questions[1].question }),
    ).toBeTruthy();
    expect(screen.getByText("2 podiums")).toBeTruthy();
  });

  it("keeps workbook questions and bets accessible when provisional data fails", async () => {
    const { user } = setup({ failProgress: true });
    await screen.findByText(
      "Provisional results are unavailable. Select All questions to view bets.",
    );
    await user.selectOptions(screen.getByRole("combobox"), "");
    expect(
      screen.getByRole("heading", { name: questions[0].question }),
    ).toBeTruthy();
  });

  it("does not request data on an inactive route and protects the Manage link", async () => {
    state.route = "footy";
    const { fetch } = setup();
    await waitFor(() => expect(fetch).not.toHaveBeenCalled());
    expect(screen.queryByRole("link", { name: "Manage" })).toBeNull();
  });

  it("shows the existing Manage action for admins", () => {
    state.route = "footy";
    state.session = { isAdmin: true };
    setup();
    expect(
      screen.getByRole("link", { name: "Manage" }).getAttribute("href"),
    ).toBe("#formula-1-2026-manage");
  });

  it("parses quoted fields, preserves scores, and fixes only the intended question text", () => {
    const parsed = parseFormulaOne2026Questions(csv());
    expect(parsed).toHaveLength(67);
    expect(parsed[10].bets[0].bet).toBe(questions[10].bets[0].bet);
    expect(parsed[15].question).toContain("Isack Hadjar");
    expect(parsed[15].question).not.toContain("Liam Lawson");
    expect(parsed[9].bets[0].bet).toBe("");
    expect(parsed[0].bets[0].points).toBe(0);
  });
});
