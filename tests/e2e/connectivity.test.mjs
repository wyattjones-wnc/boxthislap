import { expect, test } from "@playwright/test";

test.use({ serviceWorkers: "block" });

test("stalled connections use saved Footy data and recover without an airplane-mode event", async ({
  page,
}) => {
  test.setTimeout(45000);
  await page.route("https://*.workers.dev/**", (route) =>
    route.fulfill({
      json: {
        ok: true,
        items: [],
        managers: [],
        teams: [],
        notes: [],
        competitions: [],
      },
    }),
  );
  await page.goto("/#footy");
  await page.waitForFunction(() =>
    localStorage.getItem("boxthislap-offline-v1:footy"),
  );
  await expect(page.locator("#footy-competition-toggle")).toBeEnabled();
  // Leave the browser's online flag true while its data and reachability requests stall.
  await page.route("**/data/footy-schedule.json*", () => {});
  await page.route("**/manifest.webmanifest?connectivity=*", () => {});
  await page.reload();
  await expect(page.locator('[data-header-art="offline"]')).toHaveClass(
    /is-active/,
    { timeout: 8000 },
  );
  expect(await page.evaluate(() => navigator.onLine)).toBe(true);
  await expect(page.locator("#footy-competition-toggle")).toBeHidden();
  await expect(page.locator('a[href="#leagues"]').first()).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  await expect(page.locator("#footy-filter-toggle")).toBeEnabled();
  await page.unroute("**/data/footy-schedule.json*");
  await page.unroute("**/manifest.webmanifest?connectivity=*");
  await expect(page.locator("#footy-competition-toggle")).toBeEnabled({
    timeout: 25000,
  });
  await expect(page.locator('[data-header-art="offline"]')).not.toHaveClass(
    /is-active/,
  );
});
