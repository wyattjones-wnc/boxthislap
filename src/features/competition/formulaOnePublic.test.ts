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
