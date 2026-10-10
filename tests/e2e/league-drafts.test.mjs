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
    draft.getByRole("link", { name: "Log in", exact: true }),
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
  await expect(
    draft.getByRole("region", { name: "Draft choices" }),
  ).toBeVisible();
  await draft.getByRole("link", { name: "Go to drafting" }).click();
  const active = page.locator('[data-page="fantasy-office-2027-active"]');
  await expect(active).toHaveClass(/is-active/);
  await active
    .getByRole("searchbox", { name: "Movie or pick name" })
    .fill("Movie 0");
  const option = active.getByRole("article").filter({
    has: page.getByRole("heading", { name: "Test Movie 0", exact: true }),
  });
  await option.getByRole("button", { name: "Draft this", exact: true }).click();
  await page.getByRole("button", { name: "Confirm pick", exact: true }).click();
  await expect(active.getByRole("status")).toContainText(
    "Manager 2 is picking",
  );
  await active.getByRole("tab", { name: "Resource", exact: true }).click();
  await expect(
    active.getByText("Taken by Manager 1 · round 1, pick #1"),
  ).toBeVisible();
  await page
    .locator('[data-nav-scope="fantasy-office-2027"]')
    .getByRole("tab", { name: "Draft", exact: true })
    .click();
  await expect(
    draft.getByRole("region", { name: "Draft choices" }),
  ).toBeVisible();
  await expect(
    draft
      .getByRole("region", { name: "Draft choices" })
      .getByText("Test Movie 0", { exact: true }),
  ).toBeVisible();
  expect(state.picks).toHaveLength(1);
  state.status = "completed";
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(draft.getByRole("status")).toContainText("Draft completed");
  await expect(
    page
      .locator('[data-nav-scope="fantasy-office-2027"]')
      .getByRole("tab", { name: "Active", exact: true, includeHidden: true }),
  ).toBeHidden();
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
