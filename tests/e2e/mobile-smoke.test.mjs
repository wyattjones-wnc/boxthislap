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
