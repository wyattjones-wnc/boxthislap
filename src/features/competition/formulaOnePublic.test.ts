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
          entries: [
            {
              managerId: "6",
              picks: {
                p1: "Norris",
                p2: "Russell",
                p3: "Leclerc",
                wildcard: "Albon",
              },
              positions: {
                p1: 1,
                p2: 3,
                p3: 4,
                wildcardQualifying: 6,
                wildcardRace: 5,
              },
              points: {
                p1: 60,
                p2: 25,
                p3: 0,
                wildcardQualifying: 115,
                wildcardRace: 135,
              },
              total: 335,
            },
          ],
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
    expect(card?.textContent).toContain("Best Possible Picks");
    expect(card?.textContent).toContain("benchmark, not a manager entry");
    expect(card?.textContent).toContain("Total: 410 points");
    expect(card?.textContent).toContain("Albon");
    expect(card?.textContent).toContain("250 wildcard points");
    const managerResult = document.querySelector(".formula-one-weekly-entry");
    expect(managerResult?.getAttribute("role")).toBeNull();
    expect(managerResult?.textContent).toContain("Manager 6");
    expect(managerResult?.textContent).toContain("Total: 335 points");
    expect(managerResult?.textContent).toContain("Finished P3");
    expect(managerResult?.textContent).toContain("25 points");
  });
});
