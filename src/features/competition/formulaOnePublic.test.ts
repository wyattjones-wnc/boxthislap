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

  it("sets optimal weekly picks apart from manager results", () => {
    document.body.innerHTML = `
      <select id="round"><option value="">All rounds</option></select>
      <div id="weekly-list"></div>
      <table><tbody id="manager-rows"></tbody></table>
    `;
    const controller = createFormulaOnePublicController({
      escapeHtml: (value: unknown) => String(value),
      formatPoints: (value: unknown) => String(value),
      formatRankDisplay: (_entry: unknown, index: number) => String(index + 1),
      getAwardsForManager: () => [],
      getField: () => "",
      getManagerById: () => null,
      getManagerByName: (name: string) => ({ name }),
      getResolvedAwards: () => [],
      getView: () => ({
        weeklyList: document.querySelector("#weekly-list"),
        weeklyManagers: document.querySelector("#manager-rows"),
        weeklyRoundSelect: document.querySelector("#round"),
      }),
      normalizeLookupName: (value: unknown) => String(value).toLowerCase(),
      parseCsvMatrix: () => [],
      rankRows: (rows: unknown[]) => rows,
      renderAwardBadges: () => "",
      renderAwardCard: () => "",
      renderManagerChip: (manager: { name: string }) => manager.name,
      shouldRenderPageSection: () => true,
    });
    controller.renderWeeklyPage("2026", {
      races: [
        {
          id: 1,
          name: "Australian Grand Prix",
          entries: [],
          optimal: {
            picks: {
              p1: "Norris",
              p2: "Piastri",
              p3: "Russell",
              wildcard: "Albon",
            },
            positions: {
              p1: 1,
              p2: 2,
              p3: 3,
              wildcardQualifying: 6,
              wildcardRace: 5,
            },
            points: {
              p1: 60,
              p2: 50,
              p3: 50,
              wildcardQualifying: 115,
              wildcardRace: 135,
            },
            total: 410,
          },
        },
      ],
      standings: [],
    });
    const card = document.querySelector(".formula-one-weekly-optimal");
    expect(card?.textContent).toContain("Optimal Picks");
    expect(card?.textContent).toContain("410 pts");
    expect(card?.textContent).toContain("Albon");
  });
});
