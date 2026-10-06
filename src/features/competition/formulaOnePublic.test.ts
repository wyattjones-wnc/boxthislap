// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { createFormulaOnePublicController } from "../../../modules/formulaOnePublic.js";

describe("Formula One public standings", () => {
  it("makes Manager Championship rows expandable like Results rows", () => {
    document.body.innerHTML = `
      <select id="round"><option value="">All rounds</option></select>
      <div id="weekly-list"></div>
      <table><tbody id="manager-rows"></tbody></table>
    `;
    const view = {
      weeklyList: document.querySelector("#weekly-list"),
      weeklyManagers: document.querySelector("#manager-rows"),
      weeklyRoundSelect: document.querySelector("#round"),
    };
    const controller = createFormulaOnePublicController({
      escapeHtml: (value: unknown) => String(value),
      formatPoints: (value: unknown) => String(value),
      formatRankDisplay: (_entry: unknown, index: number) => String(index + 1),
      getAwardsForManager: () => [],
      getField: () => "",
      getManagerById: () => null,
      getManagerByName: (name: string) => ({ name }),
      getResolvedAwards: () => [],
      getView: () => view,
      normalizeLookupName: (value: unknown) => String(value).toLowerCase(),
      parseCsvMatrix: () => [],
      rankRows: (rows: unknown[]) => rows,
      renderAwardBadges: () => "",
      renderAwardCard: () => "",
      renderManagerChip: (manager: { name: string }) => manager.name,
      shouldRenderPageSection: () => true,
    });

    controller.renderWeeklyPage("2026", {
      races: [{ entries: [], id: 1, name: "Australian Grand Prix" }],
      standings: [{ manager: "Test Manager", points: 12, rank: 1 }],
    });

    const row = view.weeklyManagers?.querySelector<HTMLElement>(
      "[data-formula-one-weekly-standing-row]",
    );
    const detail = row?.nextElementSibling as HTMLElement | null;
    expect(row?.getAttribute("role")).toBe("button");
    expect(row?.tabIndex).toBe(0);
    expect(detail?.hidden).toBe(true);

    controller.toggleWeeklyStandingRow(view.weeklyManagers, row);

    expect(row?.getAttribute("aria-expanded")).toBe("true");
    expect(detail?.hidden).toBe(false);
  });
});

describe("Formula One question progress", () => {
  function setup(year = "2026") {
    document.body.innerHTML = `<select id="question"><option value="in-progress" selected>In Progress</option></select><input id="filter"><div id="questions"></div>`;
    const data: Record<string, unknown> = {};
    const view = {
      questionSelect: document.querySelector<HTMLSelectElement>("#question")!,
      questionFilter: document.querySelector<HTMLInputElement>("#filter")!,
      questionList: document.querySelector<HTMLElement>("#questions")!,
    };
    const controller = createFormulaOnePublicController({
      getData: (key: string) => data[key],
      setData: (key: string, value: unknown) => {
        data[key] = value;
      },
      getView: () => view,
      escapeHtml: (value: unknown) => String(value).replaceAll("<", "&lt;"),
      shouldRenderPageSection: () => true,
    });
    const questions = [
      {
        id: "q1",
        number: 1,
        question: "Who will be World Drivers Champion?",
        answer: "",
        bets: [],
      },
      {
        id: "q2",
        number: 2,
        question: "Which drivers will finish on the podium this season?",
        answer: "",
        bets: [],
      },
      {
        id: "q3",
        number: 3,
        question: "Who will get the most Driver of the Day awards?",
        answer: "",
        bets: [],
      },
      {
        id: "q4",
        number: 4,
        question: "What is your bold prediction?",
        answer: "",
        bets: [],
      },
      {
        id: "q5",
        number: 5,
        question: "Who will be World Constructors Champion?",
        answer: "Team",
        bets: [],
      },
    ];
    data.formulaOne2026QuestionProgress = {
      counts: {
        driverPoints: { "Driver A": 50 },
        podiums: { "Driver A": 2, "Driver B": 1 },
        driverOfTheDay: { "Driver B": 2 },
        constructorPoints: { Team: 70 },
      },
    };
    controller.renderLeague(year, { questions, standings: [] });
    return { controller, data, view, questions };
  }

  it("defaults to accumulating unanswered questions and keeps all and individual filters", () => {
    const { controller, view } = setup();
    expect(view.questionSelect.value).toBe("in-progress");
    expect(view.questionList.querySelectorAll("article")).toHaveLength(3);
    expect(view.questionList.textContent).toContain("Current points leader");
    expect(view.questionList.textContent).toContain("Driver B: 2 awards");
    expect(view.questionList.textContent).not.toContain("Answer:");
    view.questionSelect.value = "";
    controller.renderQuestions("2026");
    expect(view.questionList.querySelectorAll("article")).toHaveLength(5);
    view.questionSelect.value = "q4";
    controller.renderQuestions("2026");
    expect(view.questionList.querySelectorAll("article")).toHaveLength(1);
    expect(view.questionList.textContent).toContain("bold prediction");
  });

  it("preserves selected questions across refreshes and applies search to In Progress", () => {
    const { controller, view, questions } = setup();
    view.questionSelect.value = "q2";
    controller.renderLeague("2026", { questions, standings: [] });
    expect(view.questionSelect.value).toBe("q2");
    view.questionSelect.value = "in-progress";
    view.questionFilter.value = "podium";
    controller.renderQuestions("2026");
    expect(view.questionList.querySelectorAll("article")).toHaveLength(1);
    expect(view.questionList.textContent).toContain("Podiums so far");
  });

  it("shows distinct loading, unavailable and empty states", () => {
    const { controller, data, view } = setup();
    delete data.formulaOne2026QuestionProgress;
    controller.renderQuestions("2026");
    expect(view.questionList.textContent).toContain("Loading provisional");
    data.formulaOne2026QuestionProgress = { error: true };
    controller.renderQuestions("2026");
    expect(view.questionList.textContent).toContain("unavailable");
    data.formulaOne2026QuestionProgress = { counts: {} };
    controller.renderQuestions("2026");
    expect(view.questionList.textContent).toContain(
      "No questions have provisional data yet",
    );
  });

  it("keeps archived seasons on All questions without provisional results", () => {
    const { view } = setup("2025");
    expect(view.questionSelect.value).toBe("");
    expect(view.questionSelect.textContent).not.toContain("In Progress");
    expect(view.questionList.querySelectorAll("article")).toHaveLength(5);
    expect(view.questionList.textContent).not.toContain(
      "Current points leader",
    );
  });
});
