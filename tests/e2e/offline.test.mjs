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
    "Offline access is ready on this device.",
  );
  await page.evaluate(async () => {
    localStorage.removeItem("boxthislap-offline-v1:footy");
    await caches.delete("box-this-lap-offline-data-v1");
  });
  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator("#offline-settings-status")).toContainText(
    "You’re offline.",
  );
  await expect(page.locator("#offline-settings-status")).toContainText(
    "Footy saved",
  );
  await expect(page.locator(".offline-status")).toHaveCount(0);
  await expect(page.locator('[data-header-art="offline"]')).toHaveClass(
    /is-active/,
  );
  await expect(page.locator("#footy-notification-toggle")).toBeHidden();
  await expect(page.locator("#footy-competition-toggle")).toBeDisabled();
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
    "Offline access is ready on this device.",
  );
  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator("#offline-settings-status")).toContainText(
    "Next saved",
  );
  await expect(page.locator("#next-list")).toContainText("Saved offline item");
  await expect(page.locator("#next-add-button")).toBeDisabled();
  await expect(page.locator("#next-search")).toBeEnabled();
  // Footy was never opened online; its installation copy must still be usable.
  await page.goto("/#footy", { waitUntil: "domcontentloaded" });
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator("#offline-settings-status")).toContainText(
    "Footy saved",
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
      "Offline access is ready on this device.",
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
      "Footy saved",
    );
    await expect(page.locator(".offline-status")).toHaveCount(0);
    await expect(page.locator('[data-header-art="offline"]')).toHaveClass(
      /is-active/,
    );
    await expect(page.locator("#footy-notification-toggle")).toBeHidden();
    await expect(page.locator("#footy-competition-toggle")).toBeDisabled();
    await page.goto(`${url}#next`, { waitUntil: "domcontentloaded" });
    await expect(page.locator("#offline-settings-status")).toContainText(
      "Footy saved",
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
