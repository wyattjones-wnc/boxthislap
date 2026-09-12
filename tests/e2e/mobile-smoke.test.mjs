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
