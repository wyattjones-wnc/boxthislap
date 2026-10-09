// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LeaguesPage } from "./LeaguesFeature";
import { defaultLeagueYear, leagueDestination } from "./leagueYears";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("league years", () => {
  it("keeps the calendar-year default when a future season is configured", () => {
    expect(
      defaultLeagueYear(
        [2024, 2025, 2026, 2027],
        new Date("2026-12-31T23:59:59Z"),
      ),
    ).toBe(2026);
    expect(
      defaultLeagueYear(
        [2024, 2025, 2026, 2027],
        new Date("2027-01-01T00:00:00Z"),
      ),
    ).toBe(2027);
    expect(defaultLeagueYear([2024, 2025, 2027], new Date("2026-10-09Z"))).toBe(
      2025,
    );
    expect(defaultLeagueYear([2027], new Date("2026-10-09Z"))).toBe(2026);
  });
  it("opens 2027 only when selected while preserving old league destinations", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-09T00:00:00Z"));
    const view = render(<LeaguesPage />);
    const selector = screen.getByRole("combobox") as HTMLSelectElement;
    expect(selector.value).toBe("2026");
    expect(
      screen
        .getByRole("link", { name: "Open 2026 World Cup" })
        .getAttribute("href"),
    ).toBe("#results");
    fireEvent.change(selector, { target: { value: "2027" } });
    expect(
      screen
        .getByRole("link", { name: "Open 2027 Fantasy Office" })
        .getAttribute("href"),
    ).toBe("#fantasy-office-2027-draft");
    expect(
      screen
        .getByRole("link", { name: "Open 2027 World Cup" })
        .getAttribute("href"),
    ).toBe("#world-cup-2027-draft");
    expect(leagueDestination("Fantasy Office", 2025)).toBe(
      "fantasy-office-2025-results",
    );
    expect(leagueDestination("Fantasy Office", 2026)).toBe(
      "fantasy-office-2026-draft",
    );
    view.unmount();
    render(<LeaguesPage />);
    expect((screen.getByRole("combobox") as HTMLSelectElement).value).toBe(
      "2027",
    );
  });
});
