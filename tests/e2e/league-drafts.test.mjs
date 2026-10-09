import { expect, test } from "@playwright/test";

const participants = ["1", "2", "3", "6"].map((id) => ({
  id,
  name: `Manager ${id}`,
}));
function fixture() {
  return {
    id: "dev-test",
    league: "fantasy-office",
    year: 2027,
    name: "Mobile test draft",
    resourceLabel: "Movies",
    revision: 3,
    status: "active",
    reason: "",
    participants,
    rounds: 2,
    options: Array.from({ length: 10 }, (_, index) => ({
      id: `movie-${index}`,
      name: `Test Movie ${index}`,
    })),
    schedule: [participants, [...participants].reverse()].flatMap(
      (order, round) =>
        order.map((manager, position) => ({
          managerId: manager.id,
          number: round * 4 + position + 1,
          round: round + 1,
        })),
    ),
    /** @type {Array<{number: number, round: number, managerId: string, optionId: string, optionName: string, at: string, requestId: string}>} */
    picks: [],
    preference: { enabled: false, push: false },
    notifications: [],
  };
}

test("2027 navigation preserves the current-year default and a signed-out draft shows login", async ({
  page,
}) => {
  const state = fixture();
  await page.route(
    "https://box-this-lap-league-drafts-dev.boxthislap.workers.dev/**",
    (route) => route.fulfill({ json: { ok: true, drafts: [state] } }),
  );
  await page.goto("/#leagues", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#league-year-select")).toHaveValue(
    String(Math.min(new Date().getUTCFullYear(), 2027)),
  );
  await page.locator("#league-year-select").selectOption("2027");
  await page.getByRole("link", { name: "Open 2027 Fantasy Office" }).click();
  const draft = page.locator('[data-page="fantasy-office-2027-draft"]');
  await expect(draft).toHaveClass(/is-active/);
  await expect(
    draft.getByText("Log in to see your position and make your pick."),
  ).toBeVisible();
  await expect(
    page
      .locator('[data-nav-scope="fantasy-office-2027"]')
      .getByRole("tab", { name: "Manage" }),
  ).toBeHidden();
  const viewport = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(viewport.scroll).toBeLessThanOrEqual(viewport.width + 1);
});

test("manager confirms a pick and resources show ownership on the next turn", async ({
  page,
}) => {
  const state = fixture();
  await page.addInitScript(() => {
    localStorage.setItem(
      "boxThisLapManagerSession",
      JSON.stringify({
        managerId: "1",
        manager: { id: "1", displayName: "Manager 1" },
        rankingAuth: {
          accessExpiresAt: "2099-01-01T00:00:00Z",
          accessToken: "test-token",
        },
      }),
    );
  });
  await page.route(
    "https://box-this-lap-rankings.boxthislap.workers.dev/**",
    (route) =>
      route.fulfill({
        json: {
          ok: true,
          managers: participants.map((manager) => ({
            ...manager,
            active: true,
          })),
          sheets: [],
          teams: [],
          matchIds: [],
        },
      }),
  );
  await page.route(
    "https://box-this-lap-league-drafts-dev.boxthislap.workers.dev/**",
    async (route) => {
      if (route.request().url().endsWith("/picks")) {
        const body = route.request().postDataJSON();
        const option = state.options.find(
          (entry) => entry.id === body.optionId,
        );
        if (!option)
          return route.fulfill({
            status: 400,
            json: { error: "Unknown option" },
          });
        state.picks.push({
          ...state.schedule[state.picks.length],
          optionId: option.id,
          optionName: option.name,
          at: new Date().toISOString(),
          requestId: body.requestId,
        });
        state.revision += 1;
        return route.fulfill({ json: { ok: true, draft: state } });
      }
      return route.fulfill({ json: { ok: true, drafts: [state] } });
    },
  );
  await page.goto("/#fantasy-office-2027-draft?draft=dev-test", {
    waitUntil: "domcontentloaded",
  });
  const draft = page.locator('[data-page="fantasy-office-2027-draft"]');
  await expect(draft).toHaveClass(/is-active/);
  await expect(draft.getByRole("status")).toContainText("Your turn");
  const option = draft.getByRole("article").filter({
    has: page.getByRole("heading", { name: "Test Movie 0", exact: true }),
  });
  await option.getByRole("button", { name: "Select", exact: true }).click();
  await page.getByRole("button", { name: "Confirm pick", exact: true }).click();
  await expect(
    option.getByRole("button", { name: "Taken", exact: true }),
  ).toBeDisabled();
  await expect(draft.getByRole("status")).toContainText(
    "Manager 2 is on the clock",
  );
  await page
    .locator('[data-nav-scope="fantasy-office-2027"]')
    .getByRole("tab", { name: "Resources" })
    .click();
  const resources = page.locator('[data-page="fantasy-office-2027-resources"]');
  await expect(resources).toHaveClass(/is-active/);
  await expect(
    resources.getByText("Taken by Manager 1 · round 1, pick #1"),
  ).toBeVisible();
  expect(state.picks).toHaveLength(1);
});

test("World Cup has an independent 2027 Draft page", async ({ page }) => {
  await page.route(
    "https://box-this-lap-league-drafts-dev.boxthislap.workers.dev/**",
    (route) => route.fulfill({ json: { ok: true, drafts: [] } }),
  );
  await page.goto("/#world-cup-2027-draft", { waitUntil: "domcontentloaded" });
  const draft = page.locator('[data-page="world-cup-2027-draft"]');
  await expect(draft).toHaveClass(/is-active/);
  await expect(
    draft.getByRole("heading", { name: "World Cup", exact: true }),
  ).toBeVisible();
  await expect(
    draft.getByText("A draft has not been scheduled."),
  ).toBeVisible();
});
