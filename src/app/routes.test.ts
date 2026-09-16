import { describe, expect, it } from "vitest";
import { getNavScope } from "./routes";

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
});
