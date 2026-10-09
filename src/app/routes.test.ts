import { describe, expect, it } from "vitest";
import { getNavScope, navItems } from "./routes";

describe("getNavScope", () => {
  it("keeps route families in their existing navigation scopes", () => {
    expect(getNavScope("footy")).toBe("home");
    expect(getNavScope("todo")).toBe("the-monster-maniac");
    expect(getNavScope("psn")).toBe("the-monster-maniac");
    expect(getNavScope("standings")).toBe("world-cup");
    expect(getNavScope("formula-1-2026-results")).toBe("formula-one-2026");
    expect(getNavScope("fantasy-office-2026-movies")).toBe(
      "fantasy-office-2026",
    );
  });

  it("keeps the Formula One calculator out of the tab strip", () => {
    expect(
      navItems["formula-one-2026"].some(
        (item) => item.route === "formula-1-2026-calculator",
      ),
    ).toBe(false);
  });

  it("keeps Guides out of the TheMonsterManiac tab strip", () => {
    expect(
      navItems["the-monster-maniac"].some((item) => item.route === "guides"),
    ).toBe(false);
  });

  it("restricts Fantasy Office management to administrators", () => {
    expect(
      navItems["fantasy-office-2026"].find(
        (item) => item.route === "fantasy-office-2026-manage",
      )?.adminOnly,
    ).toBe(true);
  });
  it("keeps 2027 drafts in separate scopes with protected management tabs", () => {
    for (const league of ["fantasy-office", "world-cup"] as const) {
      const scope = `${league}-2027` as const;
      expect(getNavScope(`${scope}-draft?draft=example`)).toBe(scope);
      expect(
        navItems[scope].find((item) => item.route === `${scope}-manage`)
          ?.adminOnly,
      ).toBe(true);
      expect(navItems[scope].map((item) => item.label)).toEqual([
        "Draft",
        "Resources",
        "Manage",
        "Leagues",
      ]);
    }
  });
});
