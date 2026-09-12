import { expect, test } from "@playwright/test";

const publicRoutes = ["footy", "next", "leagues", "formula-1-2026-results"];

for (const route of publicRoutes) {
  test(`${route} renders without horizontal overflow`, async ({ page }) => {
    await page.goto(`/#${route}`, { waitUntil: "domcontentloaded" });

    await expect(page.locator(`[data-page="${route}"]`)).toHaveClass(
      /is-active/,
    );
    await expect(page.locator(".site-header")).toBeVisible();
    await expect(page.locator("main")).toBeVisible();

    const viewport = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));

    expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.clientWidth + 1);
  });
}

test("signed-out manager hub keeps private data closed", async ({ page }) => {
  await page.goto("/#manager-hub", { waitUntil: "domcontentloaded" });

  const managerHub = page.locator('[data-page="manager-hub"]');
  await expect(managerHub).toHaveClass(/is-active/);
  await expect(managerHub.getByText("Log in to load awards.")).toBeVisible();
  await expect(
    managerHub.getByText("Log in to load manager results."),
  ).toBeVisible();
});

test("visible pointer targets meet the WCAG minimum size", async ({ page }) => {
  await page.goto("/#footy", { waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-page="footy"]')).toHaveClass(/is-active/);

  const undersizedTargets = await page
    .locator("a, button, input, select, [role=button], [role=tab]")
    .evaluateAll((elements) =>
      elements
        .filter(
          (element) =>
            element instanceof HTMLElement && element.offsetParent !== null,
        )
        .map((element) => {
          const bounds = element.getBoundingClientRect();
          return {
            height: bounds.height,
            label:
              element.getAttribute("aria-label") ||
              element.textContent?.trim() ||
              element.tagName,
            width: bounds.width,
          };
        })
        .filter(
          ({ height, width }) =>
            height > 0 && width > 0 && (height < 24 || width < 24),
        ),
    );

  expect(undersizedTargets).toEqual([]);
});

test("Footy filters and fixture expansion remain interactive", async ({
  page,
}) => {
  await prepareFootyFixture(page);
  await page.goto("/#footy", { waitUntil: "networkidle" });
  const fixture = page.locator("[data-footy-match-id][role=button]").first();
  await expect(fixture).toBeVisible();

  await page.locator("#footy-filter-toggle").click();
  await expect(page.locator("#footy-filters")).toBeVisible();
  await page.locator("#footy-search").fill("__no_such_footy_fixture__");
  await expect(
    page.getByText("No matches found for the current filters."),
  ).toBeVisible();

  await page.locator("#footy-search").fill("");
  const restoredFixture = page
    .locator("[data-footy-match-id][role=button]")
    .first();
  await expect(restoredFixture).toBeVisible();
  await restoredFixture.click();
  await expect(restoredFixture).toHaveAttribute("aria-expanded", "true");
  await expect(restoredFixture.locator(".footy-fixture-details")).toBeVisible();
});

test("followed-team picker loads on demand and preserves mobile input state", async ({
  page,
}) => {
  /** @type {string[]} */
  const dialogBundleRequests = [];
  page.on("request", (request) => {
    if (
      /\/followedTeamsDialog-[^/]+\.js$/.test(new URL(request.url()).pathname)
    ) {
      dialogBundleRequests.push(request.url());
    }
  });
  await prepareAuthenticatedFollowedTeams(page);
  await page.goto("/#account-settings", { waitUntil: "networkidle" });

  expect(dialogBundleRequests).toEqual([]);
  const addTeams = page.locator("#followed-teams-add");
  await expect(addTeams).toBeVisible();
  await expect(addTeams).toBeEnabled();
  await addTeams.click();

  const dialog = page.getByRole("dialog", { name: "Add teams" });
  const search = dialog.getByRole("searchbox", { name: "Search teams" });
  await expect(dialog).toBeVisible();
  await expect(search).toBeFocused();
  expect(dialogBundleRequests).toHaveLength(1);
  expect(
    await search.evaluate((input) =>
      Number.parseFloat(getComputedStyle(input).fontSize),
    ),
  ).toBeGreaterThanOrEqual(16);
  await expect(page.locator("body")).toHaveCSS("position", "fixed");
  const boundaryTouchWasContained = await dialog
    .locator(".followed-teams-dialog-scroll")
    .evaluate((scrollArea) => {
      const event = new Event("touchmove", {
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(event, "touches", {
        value: [{ clientY: 100 }],
      });
      return !scrollArea.dispatchEvent(event);
    });
  expect(boundaryTouchWasContained).toBe(true);

  await search.fill("Barcelona");
  await expect(dialog.getByText("Barcelona", { exact: true })).toBeVisible();
  await expect(dialog.getByText("Arsenal", { exact: true })).toHaveCount(0);
  await search.fill("");
  await dialog.getByRole("checkbox", { name: /Barcelona/ }).check();
  await expect(
    dialog.getByRole("button", { name: "Save teams" }),
  ).toBeVisible();

  await dialog.getByRole("button", { name: "Close team picker" }).click();
  await expect(dialog).toBeHidden();
  await addTeams.click();
  await expect(
    dialog.getByRole("checkbox", { name: /Barcelona/ }),
  ).toBeChecked();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await addTeams.click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Close team picker" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator("html")).not.toHaveClass(
    /has-followed-teams-dialog/,
  );
});

/** @param {import("@playwright/test").Page} page */
async function prepareFootyFixture(page) {
  await page.route("**/data/footy-schedule.json*", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        competitionSchedules: [],
        generatedAt: "2098-12-31T00:00:00.000Z",
        prioritySets: [{ priorities: ["1"], set: "1" }],
        schemaVersion: 4,
        teamCatalog: [
          {
            active: true,
            badge: "",
            id: "1",
            league: "Premier League",
            name: "Arsenal",
            prettyName: "Arsenal",
            priority: "1",
          },
        ],
        teamSchedules: [
          {
            fixtures: [
              {
                away: "Chelsea",
                date: "2099-01-01",
                home: "Arsenal",
                isHome: true,
                league: "Premier League",
                matchId: "test-footy-match",
                opponent: "Chelsea",
                priority: "1",
                teamId: "1",
                teamName: "Arsenal",
                time: "10:00",
                timestamp: "2099-01-01T15:00:00.000Z",
                venue: "Test Ground",
              },
            ],
            team: {
              badge: "",
              id: "1",
              league: "Premier League",
              name: "Arsenal",
              priority: "1",
            },
          },
        ],
      }),
      contentType: "application/json",
      status: 200,
    });
  });
  await page.route(
    "https://box-this-lap-rankings.boxthislap.workers.dev/api/teams*",
    async (route) => {
      await route.fulfill({
        body: JSON.stringify({
          defaultTeamIds: ["1"],
          leagues: [],
          ok: true,
          teams: [
            {
              active: true,
              badge: "",
              id: "1",
              name: "Arsenal",
              prettyName: "Arsenal",
            },
          ],
        }),
        contentType: "application/json",
        status: 200,
      });
    },
  );
}

/** @param {import("@playwright/test").Page} page */
async function prepareAuthenticatedFollowedTeams(page) {
  await page.addInitScript(() => {
    localStorage.setItem(
      "boxThisLapManagerSession",
      JSON.stringify({
        isAdmin: true,
        manager: { id: "6", displayName: "Wyatt", isAdmin: true },
        managerId: "6",
        rankingAuth: {
          accessExpiresAt: "2099-01-01T00:00:00.000Z",
          accessToken: "test-access-token",
        },
      }),
    );
  });
  await page.route(
    "https://box-this-lap-rankings.boxthislap.workers.dev/**",
    async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const corsHeaders = {
        "access-control-allow-headers":
          "authorization,content-type,x-box-this-lap-channel",
        "access-control-allow-methods": "GET,PUT,OPTIONS",
        "access-control-allow-origin": "*",
      };
      if (request.method() === "OPTIONS") {
        return route.fulfill({ headers: corsHeaders, status: 204 });
      }
      if (url.pathname === "/api/teams") {
        return route.fulfill({
          body: JSON.stringify({
            defaultTeamIds: ["1"],
            leagues: [],
            ok: true,
            teams: [
              {
                active: true,
                id: "1",
                leagues: [{ id: "premier-league", name: "Premier League" }],
                name: "Arsenal",
                prettyName: "Arsenal",
              },
              {
                active: true,
                id: "2",
                leagues: [{ id: "la-liga", name: "La Liga" }],
                name: "Barcelona",
                prettyName: "FC Barcelona",
              },
            ],
          }),
          contentType: "application/json",
          headers: corsHeaders,
          status: 200,
        });
      }

      const selectedIds = request.method() === "PUT" ? ["1", "2"] : ["1"];
      return route.fulfill({
        body: JSON.stringify({
          ok: true,
          revision: request.method() === "PUT" ? 2 : 1,
          teams: selectedIds.map((teamId, index) => ({
            notificationsEnabled: true,
            priority: index + 1,
            teamId,
          })),
          usingDefault: false,
        }),
        contentType: "application/json",
        headers: corsHeaders,
        status: 200,
      });
    },
  );
}

test("secondary admin bundles stay off public mobile routes", async ({
  page,
}) => {
  /** @type {string[]} */
  const secondaryBundleRequests = [];
  page.on("request", (request) => {
    if (
      /\/(?:collectibles|draftLists|formulaOneQualifying|guides|platinums|trophyLog|trophyStats)-[^/]+\.js$/.test(
        new URL(request.url()).pathname,
      )
    ) {
      secondaryBundleRequests.push(request.url());
    }
  });

  await page.goto("/#footy", { waitUntil: "networkidle" });
  await expect(page.locator('[data-page="footy"]')).toHaveClass(/is-active/);

  expect(secondaryBundleRequests).toEqual([]);

  await page.goto("/#formula-1-2026-results", { waitUntil: "networkidle" });
  await expect(
    page.locator('[data-page="formula-1-2026-results"]'),
  ).toHaveClass(/is-active/);

  expect(secondaryBundleRequests).toEqual([]);
});

test("authenticated YouTube route loads its stable controller", async ({
  page,
}) => {
  /** @type {string[]} */
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await prepareAuthenticatedSecondaryRoutes(page);

  await page.goto("/#youtube", { waitUntil: "networkidle" });

  await expect(page.locator('[data-page="youtube"]')).toHaveClass(/is-active/);
  await expect(page.locator(".youtube-toolbar")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "All caught up" }),
  ).toBeVisible();
  expect(pageErrors).toEqual([]);
});

test("authenticated Guides and Draft List load their deferred controllers", async ({
  page,
}) => {
  await prepareAuthenticatedSecondaryRoutes(page);

  await page.goto("/#guides", { waitUntil: "networkidle" });
  await expect(page.locator('[data-page="guides"]')).toHaveClass(/is-active/);
  await expect(page.locator(".guides-grid")).toBeVisible();

  await page.goto("/#draft-list", { waitUntil: "networkidle" });
  await expect(page.locator('[data-page="draft-list"]')).toHaveClass(
    /is-active/,
  );
  await expect(page.getByRole("heading", { name: "Draft List" })).toBeVisible();
  await expect(page.locator("#draft-list-items")).toBeVisible();
});

test("Formula One admin loads its deferred calculation engine", async ({
  page,
}) => {
  /** @type {string[]} */
  const calculationBundleRequests = [];
  /** @type {string[]} */
  const pageErrors = [];
  page.on("request", (request) => {
    if (
      /\/formulaOneQualifying-[^/]+\.js$/.test(new URL(request.url()).pathname)
    ) {
      calculationBundleRequests.push(request.url());
    }
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await prepareAuthenticatedSecondaryRoutes(page);
  await page.route(
    "https://box-this-lap-formula-one.boxthislap.workers.dev/**",
    async (route) => {
      const url = new URL(route.request().url());
      const body =
        url.pathname === "/api/admin/seasons"
          ? { seasons: [{ year: 2026 }] }
          : {
              drivers: [],
              picks: [],
              results: [],
              rounds: [],
              sessions: [],
              year: 2026,
            };
      await route.fulfill({
        body: JSON.stringify(body),
        contentType: "application/json",
        status: 200,
      });
    },
  );

  await page.goto("/#formula-1-2026-manage", { waitUntil: "networkidle" });

  await expect(page.locator('[data-page="formula-1-2026-manage"]')).toHaveClass(
    /is-active/,
  );
  expect(calculationBundleRequests).toHaveLength(1);
  expect(pageErrors).toEqual([]);
});

/** @param {import("@playwright/test").Page} page */
async function prepareAuthenticatedSecondaryRoutes(page) {
  await page.addInitScript(() => {
    localStorage.setItem(
      "boxThisLapManagerSession",
      JSON.stringify({
        isAdmin: true,
        manager: { id: "6", displayName: "Wyatt", isAdmin: true },
        managerId: "6",
        rankingAuth: {
          accessExpiresAt: "2099-01-01T00:00:00.000Z",
          accessToken: "test-access-token",
        },
      }),
    );
    localStorage.setItem("boxThisLapYouTubeSession", "test-token");
  });
  await page.route("https://docs.google.com/**", async (route) => {
    await route.fulfill({
      body: [
        "ID,Display Name,YouTube Channel ID,Priority,IsRemoved",
        "1,Test Channel,test-channel,1,FALSE",
        "Priority,Description,Filter,,",
        "1,Priority 1,,1,",
      ].join("\n"),
      contentType: "text/csv",
      status: 200,
    });
  });
  await page.route(
    "https://box-this-lap-youtube.boxthislap.workers.dev/**",
    async (route) => {
      const url = new URL(route.request().url());
      const body = url.pathname.includes("playlists")
        ? { playlists: [] }
        : { lastSyncAt: "", videos: [] };
      await route.fulfill({
        body: JSON.stringify(body),
        contentType: "application/json",
        status: 200,
      });
    },
  );
  await page.route(
    "https://box-this-lap-rankings.boxthislap.workers.dev/**",
    async (route) => {
      await route.fulfill({
        body: JSON.stringify({ items: [], ok: true, sheets: [], teams: [] }),
        contentType: "application/json",
        status: 200,
      });
    },
  );
}
