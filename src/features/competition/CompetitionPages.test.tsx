import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  FantasyOfficePage,
  FormulaOne2026WeeklyPage,
  FormulaOneQuestionsPage,
  WorldCupStandingsPage,
} from "./CompetitionPages";

afterEach(cleanup);

describe("competition React pages", () => {
  it("preserves the World Cup controller mount points", () => {
    const { container } = render(<WorldCupStandingsPage />);

    expect(container.querySelector("#standings-round-select")).not.toBeNull();
    expect(container.querySelector("#player-championship-rows")).not.toBeNull();
    expect(container.querySelector("#nations-league-rows")).not.toBeNull();
    expect(container.querySelector("#manager-results-rows")).not.toBeNull();
  });

  it("renders Formula 1 public controls and weekly sections", () => {
    const { container } = render(
      <>
        <FormulaOneQuestionsPage year={2026} />
        <FormulaOne2026WeeklyPage />
      </>,
    );

    expect(
      container.querySelector("#formula-one-2026-question-select"),
    ).not.toBeNull();
    expect(
      container.querySelector("#formula-one-2026-weekly-form"),
    ).not.toBeNull();
    expect(
      screen.getByRole("button", {
        name: "Subscribe to Formula 1 deadline alerts",
      }),
    ).not.toBeNull();
    expect(
      screen.getByRole("tab", { name: "Managers' Championship" }),
    ).not.toBeNull();
  });

  it("keeps Fantasy Office data targets stable", () => {
    const { container } = render(
      <FantasyOfficePage year={2026} mode="results" />,
    );

    expect(
      container.querySelector("#fantasy-office-2026-result-list"),
    ).not.toBeNull();
    expect(screen.getByText("2026 Results")).not.toBeNull();
  });
});
// @vitest-environment jsdom
