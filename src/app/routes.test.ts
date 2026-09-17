import { describe, expect, it } from "vitest";
import { getNavScope, navItems } from "./routes";

describe("getNavScope", () => {
  it("keeps route families in their existing navigation scopes", () => {
    expect(getNavScope("footy")).toBe("home");
    expect(getNavScope("todo")).toBe("the-monster-maniac");
    expect(getNavScope("standings")).toBe("world-cup");
    expect(getNavScope("formula-1-2026-results")).toBe("formula-one-2026");
    expect(getNavScope("fantasy-office-2026-movies")).toBe(
      "fantasy-office-2026",
    );
  });

  it("uses the compact Formula One calculator label", () => {
    expect(
      navItems["formula-one-2026"].find(
        (item) => item.route === "formula-1-2026-calculator",
      )?.label,
    ).toBe("Calc");
  });
});
