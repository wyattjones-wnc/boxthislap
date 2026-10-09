import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";

test.use({ serviceWorkers: "allow" });

test("Footy reopens offline with saved data and unavailable actions disabled", async ({
  page,
  context,
  browserName,
}) => {
  test.skip(
    browserName === "webkit",
    "WebKit offline emulation blocks service workers; use the stopped-server test below.",
  );
  await page.goto("/#footy");
  await page.waitForFunction(() =>
    localStorage.getItem("boxthislap-offline-v1:footy"),
  );
  await page.waitForFunction(() => navigator.serviceWorker.controller);
  await expect(page.locator("#offline-settings-status")).toContainText(
    "Saved — Footy:",
  );
  await page.evaluate(async () => {
    localStorage.removeItem("boxthislap-offline-v1:footy");
    await caches.delete("box-this-lap-offline-data-v1");
  });
  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator("#offline-settings-status")).toContainText(
    "Saved —",
  );
  await expect(page.locator("#offline-settings-status")).toContainText(
    "Footy:",
  );
  await expect(page.locator(".offline-status")).toHaveCount(0);
  await expect(page.locator('[data-header-art="offline"]')).toHaveClass(
    /is-active/,
  );
  await expect(page.locator("#footy-notification-toggle")).toBeHidden();
  await expect(page.locator("#footy-competition-toggle")).toBeHidden();
  await expect(page.locator('a[href="#leagues"]').first()).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  await expect(page.locator("#footy-filter-toggle")).toBeEnabled();
  await context.setOffline(false);
  await expect(page.locator("#footy-competition-toggle")).toBeEnabled();
});

test("Next restores its latest load after an offline reload", async ({
  page,
  context,
  browserName,
}) => {
  test.skip(
    browserName === "webkit",
    "WebKit offline emulation blocks service workers; use the stopped-server test below.",
  );
  await context.addInitScript(() => {
    const setItem = Storage.prototype.setItem;
    /** @param {string} key @param {string} value */
    Storage.prototype.setItem = function (key, value) {
      if (key.startsWith("boxthislap-offline-v1:"))
        throw new DOMException("Storage full", "QuotaExceededError");
      return setItem.call(this, key, value);
    };
  });
  await page.route("**/api/items", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        items: [
          {
            ID: "offline-next",
            Thing: "Saved offline item",
            Date: "2099-01-01",
            NonAdmin: true,
            "Priority Level": 5,
          },
        ],
      }),
    }),
  );
  await page.goto("/#next");
  await page.waitForFunction(async () =>
    Boolean(
      await caches.match(
        new URL("__offline-data__/next", document.baseURI).href,
      ),
    ),
  );
  expect(
    await page.evaluate(() =>
      localStorage.getItem("boxthislap-offline-v1:next"),
    ),
  ).toBeNull();
  await page.waitForFunction(() => navigator.serviceWorker.controller);
  await expect(page.locator("#offline-settings-status")).toContainText(
    "Saved — Footy:",
  );
  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator("#offline-settings-status")).toContainText("Next:");
  await expect(page.locator("#next-list")).toContainText("Saved offline item");
  await expect(page.locator("#next-add-button")).toBeDisabled();
  await expect(page.locator("#next-search")).toBeEnabled();
  // Footy was never opened online; its installation copy must still be usable.
  await page.goto("/#footy", { waitUntil: "domcontentloaded" });
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator("#offline-settings-status")).toContainText(
    "Footy:",
  );
  await expect(page.locator("#footy-schedule-list")).not.toContainText(
    "Unable to load footy schedule",
  );
  await expect(page.locator('[data-header-art="offline"] img')).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator('[data-header-art="offline"] img')
        .evaluate((img) => /** @type {HTMLImageElement} */ (img).naturalWidth),
    )
    .toBeGreaterThan(0);
});

// Stop the server rather than using WebKit's offline emulation, which prevents
// the service worker from responding to navigations in Playwright.
test("Safari restores Footy and Next when the server is unreachable", async ({
  page,
  context,
  browserName,
}) => {
  test.skip(browserName !== "webkit", "WebKit-specific network failure check.");
  const server = createServer(async (request, response) => {
    try {
      const pathname = new URL(request.url || "/", "http://localhost").pathname;
      const file = pathname === "/" ? "/index.html" : pathname;
      const data = await readFile(path.join("dist", file));
      const contentTypes = {
        ".js": "application/javascript",
        ".css": "text/css",
        ".json": "application/json",
        ".html": "text/html",
      };
      response.setHeader(
        "Content-Type",
        contentTypes[
          /** @type {keyof typeof contentTypes} */ (path.extname(file))
        ] || "application/octet-stream",
      );
      response.end(data);
    } catch {
      response.writeHead(404);
      response.end();
    }
  });
  await new Promise((resolve) =>
    server.listen(0, "127.0.0.1", () => resolve(undefined)),
  );
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("Missing local server address.");
  const url = `http://127.0.0.1:${address.port}/`;
  try {
    await page.route("**/api/items", (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          items: [
            {
              ID: "offline-next",
              Thing: "Saved offline item",
              Date: "2099-01-01",
              NonAdmin: true,
            },
          ],
        }),
      }),
    );
    await page.goto(`${url}#next`);
    await page.waitForFunction(
      () =>
        localStorage.getItem("boxthislap-offline-v1:next") &&
        navigator.serviceWorker.controller,
    );
    await page.goto(`${url}#footy`);
    await page.waitForFunction(() =>
      localStorage.getItem("boxthislap-offline-v1:footy"),
    );
    await expect(page.locator("#offline-settings-status")).toContainText(
      "Saved — Footy:",
    );
    await page.evaluate(async () => {
      localStorage.removeItem("boxthislap-offline-v1:footy");
      const cache = await caches.open("box-this-lap-offline-data-v1");
      await cache.delete(
        new URL("__offline-data__/footy", document.baseURI).href,
      );
    });
    await context.addInitScript(() =>
      Object.defineProperty(navigator, "onLine", { get: () => false }),
    );
    server.closeAllConnections();
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve(undefined))),
    );
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator("#offline-settings-status")).toContainText(
      "Footy:",
    );
    await expect(page.locator(".offline-status")).toHaveCount(0);
    await expect(page.locator('[data-header-art="offline"]')).toHaveClass(
      /is-active/,
    );
    await expect(page.locator("#footy-notification-toggle")).toBeHidden();
    await expect(page.locator("#footy-competition-toggle")).toBeHidden();
    await page.goto(`${url}#next`, { waitUntil: "domcontentloaded" });
    await expect(page.locator("#offline-settings-status")).toContainText(
      "Footy:",
    );
    await expect(page.locator("#next-list")).toContainText(
      "Saved offline item",
    );
    await expect(page.locator("#next-add-button")).toBeDisabled();
  } finally {
    server.closeAllConnections();
    server.close();
  }
});

test("signed-in users can open Next and Footy offline after loading only Ranking", async ({
  page,
  context,
  browserName,
}) => {
  test.skip(
    browserName === "webkit",
    "Use the stopped-server test for WebKit.",
  );
  await context.addInitScript(() => {
    localStorage.setItem(
      "boxThisLapManagerSession",
      JSON.stringify({
        managerId: "6",
        isAdmin: true,
        manager: { id: "6", displayName: "Wyatt", isAdmin: true },
        rankingAuth: {
          accessToken: "test-token",
          accessExpiresAt: "2099-01-01T00:00:00.000Z",
        },
      }),
    );
  });
  await page.route("**/api/items", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        items: [
          {
            ID: "warm-next",
            Thing: "Background saved Next item",
            Date: "2099-01-01",
            NonAdmin: true,
          },
        ],
      }),
    }),
  );
  await page.route("**/api/managers/6/rankings/*", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        revision: 1,
        items: [],
        elo: [],
        exclusions: [],
        seeds: [],
        snapshots: [],
        snapshotItems: [],
        pairCounts: [],
      }),
    }),
  );
  await page.route("**/api/match-notes", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ ok: true, notes: [] }),
    }),
  );
  await page.route("**/api/teams?includeLeagues=true&active=true", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        teams: [{ id: "1", name: "Arsenal", active: true }],
        defaultTeamIds: ["1"],
        leagues: [],
      }),
    }),
  );
  await page.route("**/api/me/followed-teams", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        revision: 1,
        teams: [{ teamId: "1", priority: 1, notificationsEnabled: false }],
        usingDefault: false,
      }),
    }),
  );
  await page.goto("/#rankings");
  await page.waitForFunction(
    () =>
      localStorage.getItem("boxthislap-offline-v1:next") &&
      localStorage.getItem("boxthislap-offline-v1:footy") &&
      localStorage.getItem("boxthislap-offline-v1:rankings:6:games") &&
      localStorage.getItem("boxthislap-offline-v1:footy-following:6") &&
      navigator.serviceWorker.controller,
  );
  // A cached old entrypoint must not pin the online app to a stale build.
  await page.evaluate(async () => {
    const cache = await caches.open("box-this-lap-shell-v1");
    await cache.put(
      new URL("index.html", document.baseURI).href,
      new Response("Obsolete application", {
        headers: { "Content-Type": "text/html" },
      }),
    );
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator("#offline-settings-status")).toContainText("Next:");
  await expect(page.locator("body")).not.toHaveText("Obsolete application");
  await context.setOffline(true);
  await page.goto("/#footy", { waitUntil: "domcontentloaded" });
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator("#footy-schedule-list")).not.toContainText(
    "Unable to load",
  );
  await expect(page.locator("#footy-schedule-list")).toContainText(
    "Arsenal FC",
  );
  await expect(page.locator("#footy-choose-teams")).toBeHidden();
  await expect(page.locator("#footy-reset-teams")).toBeHidden();
  await page.locator("#footy-past-toggle").click();
  await expect(
    page.locator("#footy-schedule-list .footy-past-week").first(),
  ).toBeVisible();
  await expect(page.locator("#footy-schedule-list")).not.toContainText(
    "Unable to load match notes",
  );
  await expect(
    page.locator('[data-page="footy"] a[href="#footy-perfect"]'),
  ).toBeHidden();
  await expect(
    page.locator('[data-page="footy"] a[href="#footy-seen"]'),
  ).toBeHidden();
  await expect(page.locator("#footy-competition-toggle")).toBeHidden();
  await page.goto("/#next", { waitUntil: "domcontentloaded" });
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator("#next-list")).toContainText(
    "Background saved Next item",
  );
  await expect(page.locator("#offline-settings-status")).not.toContainText(
    "Editing",
  );
});
