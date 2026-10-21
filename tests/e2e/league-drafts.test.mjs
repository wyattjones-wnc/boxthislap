import { expect, test } from "@playwright/test";

/** @param {import("@playwright/test").Locator} locator */
async function heightOf(locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error("Expected a visible drafting card.");
  return box.height;
}

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
    movieResource: {
      source: "tmdb",
      policy: "first-worldwide",
      updatedAt: "2026-10-21T09:00:00.000Z",
      count: 10,
    },
    revision: 3,
    status: "active",
    reason: "",
    participants,
    rounds: 2,
    options: Array.from({ length: 10 }, (_, index) => ({
      id: `movie-${index}`,
      name: `Test Movie ${index}`,
      ...(index === 0
        ? { releaseDate: "2027-06-01" }
        : index === 1
          ? { releaseDate: "2027-01-15" }
          : {}),
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
  await expect(draft.locator(".manager-chip")).toHaveCount(4);
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
  await expect(draft.locator(".manager-chip")).toHaveCount(4);
  await expect(draft.getByRole("status")).toContainText("Your turn");
  await expect(
    draft.getByRole("region", { name: "Draft choices" }),
  ).toBeVisible();
  await draft.getByRole("link", { name: "Go to drafting" }).click();
  const active = page.locator('[data-page="fantasy-office-2027-active"]');
  await expect(active).toHaveClass(/is-active/);
  const pickCard = active.locator("#draft-options");
  const pickHeight = await heightOf(pickCard);
  const heading = active.getByRole("heading", {
    name: "Fantasy Office",
    exact: true,
  });
  expect(
    await heading.evaluate(
      (element) =>
        element.parentElement?.offsetHeight ?? Number.POSITIVE_INFINITY,
    ),
  ).toBeLessThan(50);
  await active
    .getByRole("searchbox", { name: "Movie or pick name" })
    .fill("Movie");
  await expect(active.getByRole("caption")).toHaveCount(0);
  await active.getByRole("button", { name: "Name", exact: true }).click();
  await expect(active.getByRole("rowheader").first()).toHaveText(
    "Test Movie 9",
  );
  await active.getByRole("button", { name: "Release", exact: true }).click();
  await expect(active.getByRole("rowheader").first()).toHaveText(
    "Test Movie 1",
  );
  await active.getByRole("button", { name: "Release", exact: true }).click();
  await expect(active.getByRole("rowheader").first()).toHaveText(
    "Test Movie 0",
  );
  expect(await heightOf(pickCard)).toBe(pickHeight);
  const suggestions = active.getByRole("region", { name: "Pick suggestions" });
  expect(
    await suggestions.evaluate(
      (element) => element.scrollHeight > element.clientHeight,
    ),
  ).toBe(true);
  // Return to the default sort before checking the Resource view.
  await active.getByRole("button", { name: "Name", exact: true }).click();
  await active
    .getByRole("searchbox", { name: "Movie or pick name" })
    .fill("Movie 0");
  expect(await heightOf(pickCard)).toBe(pickHeight);
  const option = active.getByRole("row").filter({
    has: page.getByText("Test Movie 0", { exact: true }),
  });
  await option.getByRole("button", { name: "Draft this", exact: true }).click();
  await page.getByRole("button", { name: "Confirm pick", exact: true }).click();
  await expect(active.getByRole("status")).toContainText(
    "Manager 2 is picking",
  );
  await active.getByRole("tab", { name: "Resource", exact: true }).click();
  const resourceCard = active.locator("#draft-options");
  const initialHeight = await heightOf(resourceCard);
  expect(initialHeight).toBe(pickHeight);
  await expect(active.getByRole("caption")).toHaveCount(0);
  await active.getByRole("button", { name: "Name", exact: true }).click();
  await expect(active.getByRole("rowheader").first()).toHaveText(
    "Test Movie 9",
  );
  await active.getByRole("button", { name: "Release", exact: true }).click();
  await expect(active.getByRole("rowheader").first()).toHaveText(
    "Test Movie 1",
  );
  await expect(
    active.getByRole("columnheader", { name: /Release/ }),
  ).toHaveAttribute("aria-sort", "ascending");
  await active.getByRole("button", { name: "Release", exact: true }).click();
  await expect(active.getByRole("rowheader").first()).toContainText(
    "Test Movie 0",
  );
  expect(await heightOf(resourceCard)).toBe(initialHeight);
  const list = active.getByRole("region", { name: "Resource list" });
  expect(
    await list.evaluate(
      (element) => element.scrollHeight > element.clientHeight,
    ),
  ).toBe(true);

  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(await page.evaluate(() => window.innerWidth));
  await active
    .getByRole("searchbox", { name: "Search resource" })
    .fill("Test Movie 0");
  await expect(active.getByRole("row")).toHaveCount(2);
  expect(await heightOf(resourceCard)).toBe(initialHeight);
  await expect(active.getByText("Test Movie 1", { exact: true })).toHaveCount(
    0,
  );
  await expect(
    active.getByRole("button", { name: "Taken", exact: true }),
  ).toBeDisabled();
  await expect(active.getByText("Taken by Manager 1")).toBeVisible();
  await active.getByText(/Movie data and credits/).click();
  await expect(
    active.getByRole("img", { name: "TMDB", exact: true }),
  ).toBeVisible();
  await expect(
    active.getByText(
      "This product uses the TMDB API but is not endorsed or certified by TMDB.",
    ),
  ).toBeVisible();
  expect(await heightOf(resourceCard)).toBe(initialHeight);
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
