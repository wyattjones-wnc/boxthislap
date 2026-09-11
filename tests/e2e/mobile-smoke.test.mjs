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

test("secondary admin bundles stay off the initial mobile route", async ({
  page,
}) => {
  /** @type {string[]} */
  const secondaryBundleRequests = [];
  page.on("request", (request) => {
    if (
      /\/(?:collectibles|platinums|trophyLog|trophyStats|youtubeInbox)-[^/]+\.js$/.test(
        new URL(request.url()).pathname,
      )
    ) {
      secondaryBundleRequests.push(request.url());
    }
  });

  await page.goto("/#footy", { waitUntil: "networkidle" });
  await expect(page.locator('[data-page="footy"]')).toHaveClass(/is-active/);

  expect(secondaryBundleRequests).toEqual([]);
});

test("authenticated YouTube route loads its deferred controller", async ({
  page,
}) => {
  /** @type {string[]} */
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.addInitScript(() => {
    localStorage.setItem(
      "boxThisLapManagerSession",
      JSON.stringify({
        isAdmin: true,
        manager: { id: "6", displayName: "Wyatt", isAdmin: true },
        managerId: "6",
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
        body: JSON.stringify({ ok: true, teams: [] }),
        contentType: "application/json",
        status: 200,
      });
    },
  );

  await page.goto("/#youtube", { waitUntil: "networkidle" });

  await expect(page.locator('[data-page="youtube"]')).toHaveClass(/is-active/);
  await expect(page.locator(".youtube-toolbar")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "All caught up" }),
  ).toBeVisible();
  expect(pageErrors).toEqual([]);
});
