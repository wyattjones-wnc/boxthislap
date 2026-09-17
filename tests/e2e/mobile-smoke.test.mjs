import { expect, test } from "@playwright/test";

const publicRoutes = ["footy", "next", "leagues", "formula-1-2026-results"];

test.beforeEach(async ({ page }) => {
  await page.route("https://visitor-badge.laobi.icu/**", (route) =>
    route.abort(),
  );
});

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

test("React shell exposes an accessible mobile navigation rail and foundation pages", async ({
  page,
}) => {
  await page.goto("/#footy", { waitUntil: "domcontentloaded" });

  const navigationRail = page.locator("[data-nav-scroll]:not([hidden])");
  await expect(navigationRail).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Open site navigation" }),
  ).toHaveCount(0);
  await navigationRail.getByRole("tab", { name: "Next" }).click();
  await expect(page.locator('[data-page="next"]')).toHaveClass(/is-active/);

  await page.goto("/#login", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: "Manager Login" }),
  ).toBeVisible();
  await expect(page.getByText("Manager access", { exact: true })).toBeVisible();
});

test("signed-out manager hub keeps private data closed", async ({ page }) => {
  await page.goto("/#manager-hub", { waitUntil: "domcontentloaded" });

  const managerHub = page.locator('[data-page="manager-hub"]');
  await expect(managerHub).toHaveClass(/is-active/);
  await expect(managerHub.getByText("Log in to load awards.")).toBeVisible();
  await expect(
    managerHub.getByText("Log in to load manager results."),
  ).toBeVisible();
});

test("admin Manager Hub cards load independently of slow portal sheets", async ({
  page,
}) => {
  /** @type {string[]} */
  const formulaOnePaths = [];
  /** @type {string[]} */
  const pageErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") pageErrors.push(message.text());
  });
  await page.addInitScript(() => {
    const nativeFetch = window.fetch.bind(window);
    window.fetch = (input, init) => {
      const url = String(input instanceof Request ? input.url : input);
      if (
        url.includes("docs.google.com/") &&
        ["121360226", "1819817720"].includes(
          String(new URL(url).searchParams.get("gid") || ""),
        )
      ) {
        const stalledResponse = new Response("", { status: 200 });
        stalledResponse.text = () => new Promise(() => {});
        return Promise.resolve(stalledResponse);
      }
      return nativeFetch(input, init);
    };
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
    localStorage.setItem(
      "boxthislap-manager-hub-drafts",
      JSON.stringify({
        cachedAt: new Date().toISOString(),
        drafts: [
          {
            ID: "fantasy-critic-2025",
            "Is Completed": "TRUE",
            League: "Fantasy Critic",
            Name: "2025 Fantasy Critic",
            "Winner Manager ID": "6",
            Year: "2025",
          },
        ],
      }),
    );
  });
  await page.route("https://docs.google.com/**", (route) => {
    const url = route.request().url();
    const gid = new URL(url).searchParams.get("gid");
    const body =
      url.includes("2PACX-1vTQnBD") && gid === "0"
        ? "ID,Display Name,Is Admin\n6,Wyatt,TRUE"
        : "";
    return route.fulfill({ body, contentType: "text/csv", status: 200 });
  });
  await page.route("https://script.google.com/**", (route) =>
    route.fulfill({ body: "", contentType: "text/javascript", status: 200 }),
  );
  await page
    .context()
    .route("https://box-this-lap-rankings.boxthislap.workers.dev/**", (route) =>
      route.fulfill({
        body: JSON.stringify({ defaultTeamIds: [], ok: true, teams: [] }),
        contentType: "application/json",
        status: 200,
      }),
    );
  await page
    .context()
    .route(
      "https://box-this-lap-formula-one.boxthislap.workers.dev/**",
      (route) => {
        const request = route.request();
        const corsHeaders = {
          "access-control-allow-headers": "authorization,content-type",
          "access-control-allow-methods": "GET,OPTIONS",
          "access-control-allow-origin": "*",
        };
        if (request.method() === "OPTIONS") {
          return route.fulfill({ headers: corsHeaders, status: 204 });
        }
        const path = new URL(request.url()).pathname;
        formulaOnePaths.push(path);
        const body = path.endsWith("/api/admin/seasons/2026/weekly")
          ? {
              ok: true,
              rounds: [
                {
                  facts_complete: 0,
                  has_sprint: 0,
                  is_complete: 0,
                  name: "Australian Grand Prix",
                  race_date: "2020-03-08",
                  round: 1,
                },
              ],
              sessions: [],
              year: 2026,
            }
          : path.endsWith("/api/admin/seasons")
            ? { ok: true, seasons: [{ year: 2026 }] }
            : {
                entries: [],
                ok: true,
                roundDrivers: [],
                rounds: [],
                year: 2026,
              };
        return route.fulfill({
          body: JSON.stringify(body),
          contentType: "application/json",
          headers: corsHeaders,
          status: 200,
        });
      },
    );
  await page
    .context()
    .route(
      "https://box-this-lap-footy-notes.boxthislap.workers.dev/**",
      (route) =>
        route.fulfill({
          body: JSON.stringify({ notes: [], ok: true }),
          contentType: "application/json",
          status: 200,
        }),
    );

  await page.goto("/#fantasy-critic-2026", { waitUntil: "domcontentloaded" });
  await page.locator("#fantasy-critic-2026-content").evaluate((container) => {
    const fragment = document.createDocumentFragment();
    for (let index = 0; index < 5000; index += 1) {
      fragment.append(document.createElement("article"));
    }
    container.replaceChildren(fragment);
  });
  await page.locator("#profile-menu-button").click();
  await page
    .locator("#profile-dropdown")
    .getByText("Manager Hub", { exact: true })
    .click();
  const hub = page.locator('[data-page="manager-hub"]');
  await expect(hub).toHaveClass(/is-active/, { timeout: 1000 });
  await expect(page.locator("#profile-dropdown")).toBeHidden();
  await expect(
    hub.getByRole("heading", { name: "2025 Fantasy Critic Winner" }),
  ).toBeVisible();
  await hub.getByText("Notifications", { exact: true }).click();
  await expect
    .poll(() => formulaOnePaths)
    .toContain("/api/admin/seasons/2026/weekly");
  await expect
    .poll(() =>
      pageErrors.filter((message) =>
        message.includes("Manager Hub notifications source formula-one-admin"),
      ),
    )
    .toEqual([]);
  await expect(
    hub.getByRole("heading", {
      name: "2026 Australian Grand Prix data is incomplete",
    }),
  ).toBeVisible();
  await expect(
    hub.getByText("Checking remaining notifications..."),
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

test("Formula One navigation fits one mobile row", async ({ page }) => {
  await page.goto("/#formula-1-2026-results", {
    waitUntil: "domcontentloaded",
  });
  const navigation = page.locator(
    '.nav-links[data-nav-scope="formula-one-2026"]',
  );
  await expect(navigation).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Formula 1 points calculator" }),
  ).toBeVisible();
  await expect(navigation.getByRole("tab", { name: "Calculator" })).toHaveCount(
    0,
  );
  expect(
    await navigation.evaluate(
      (element) => element.scrollWidth <= element.clientWidth + 1,
    ),
  ).toBe(true);
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

test("Match Notes dialog contains its populated mobile form", async ({
  page,
}) => {
  await page.goto("/#footy", { waitUntil: "domcontentloaded" });
  const dialog = page.locator("#footy-note-dialog");
  await dialog.evaluate((element) => {
    const matchId = element.querySelector("#footy-note-match-id");
    const title = element.querySelector("#footy-note-title");
    if (matchId)
      matchId.textContent = "MATCH ID FOOTY_COMP_FOOTBALL_DATA_ORG_564679";
    if (title) title.textContent = "RC Deportivo La Coruña v Sevilla FC";
    /** @type {HTMLDialogElement} */ (element).showModal();
  });

  const bounds = await dialog.boundingBox();
  const viewport = page.viewportSize();
  if (!bounds || !viewport)
    throw new Error("Match Notes dialog was not laid out");
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width);
  expect(
    await dialog.evaluate((element) => {
      const dialogBounds = element.getBoundingClientRect();
      return [
        ...element.querySelectorAll(
          "header, .footy-note-grid, label, details, input, textarea, footer, button",
        ),
      ]
        .filter((item) => {
          const itemBounds = item.getBoundingClientRect();
          return (
            itemBounds.left < dialogBounds.left - 1 ||
            itemBounds.right > dialogBounds.right + 1
          );
        })
        .map((item) => item.tagName);
    }),
  ).toEqual([]);
});

test("Missing Match Notes prepares once and toggles filters without rebuilding", async ({
  page,
}) => {
  await prepareAuthenticatedFollowedTeams(page);
  await page.route(
    "https://box-this-lap-footy-notes.boxthislap.workers.dev/**",
    (route) =>
      route.fulfill({
        body: JSON.stringify({ notes: [], ok: true }),
        contentType: "application/json",
        status: 200,
      }),
  );

  await page.goto("/#footy-missing-notes", { waitUntil: "domcontentloaded" });
  const list = page.locator("#footy-missing-notes-list");
  await expect(list).toHaveAttribute("aria-busy", "false");
  await list.evaluate((element) => {
    Reflect.set(element, "__renderedListNode", element.firstElementChild);
  });

  const filterToggle = page.locator("#footy-missing-notes-filter-toggle");
  await filterToggle.click();
  await expect(page.locator("#footy-missing-notes-filters")).toBeVisible();
  await expect(filterToggle).toHaveAttribute("aria-expanded", "true");
  expect(
    await list.evaluate(
      (element) =>
        Reflect.get(element, "__renderedListNode") ===
        element.firstElementChild,
    ),
  ).toBe(true);

  await filterToggle.click();
  await expect(page.locator("#footy-missing-notes-filters")).toBeHidden();
  await expect(filterToggle).toHaveAttribute("aria-expanded", "false");
  expect(
    await list.evaluate(
      (element) =>
        Reflect.get(element, "__renderedListNode") ===
        element.firstElementChild,
    ),
  ).toBe(true);
});

test("signed-in managers can find notification setup in unsupported browser contexts", async ({
  page,
}) => {
  await prepareAuthenticatedFollowedTeams(page);
  await page.addInitScript(() => {
    Reflect.deleteProperty(window, "Notification");
  });
  await page.goto("/#footy", { waitUntil: "networkidle" });

  const notificationToggle = page.locator("#footy-notification-toggle");
  await expect(notificationToggle).toBeVisible();
  await notificationToggle.click();
  await expect(page.locator("#footy-notification-status")).toContainText(
    "add Box This Lap to the Home Screen",
  );
});

test("followed-team picker loads on demand with a contained mobile scroll list", async ({
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
  await expect(page.locator("#site-version")).toContainText("v2.5 · build ");
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
  expect(
    await search.evaluate((input) => input.getBoundingClientRect().height),
  ).toBeGreaterThanOrEqual(48);
  await expect(page.locator("body")).toHaveCSS("position", "fixed");
  const teamList = dialog.getByRole("region", { name: "Teams" });
  await expect(
    dialog.getByRole("navigation", { name: "Team picker pages" }),
  ).toHaveCount(0);
  await expect(dialog.getByRole("checkbox")).toHaveCount(26);
  expect(
    await teamList.evaluate(
      (list) => list.scrollHeight > list.clientHeight && list.clientHeight > 0,
    ),
  ).toBe(true);
  const boundaryTouchWasContained = await dialog
    .locator(".followed-teams-picker")
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
  const pullRefreshWasSuppressed = await teamList.evaluate((scrollArea) => {
    /**
     * @param {string} type
     * @param {number} clientY
     */
    const dispatchTouch = (type, clientY) => {
      const event = new Event(type, {
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(event, "touches", {
        value: type === "touchend" ? [] : [{ clientY }],
      });
      scrollArea.dispatchEvent(event);
    };
    scrollArea.scrollTop = scrollArea.scrollHeight;
    dispatchTouch("touchstart", 100);
    dispatchTouch("touchmove", 300);
    const wasPulling = document.body.classList.contains("is-pulling-refresh");
    dispatchTouch("touchend", 300);
    return {
      pullDistance: getComputedStyle(document.documentElement)
        .getPropertyValue("--pull-refresh-distance")
        .trim(),
      wasPulling,
    };
  });
  expect(pullRefreshWasSuppressed).toEqual({
    pullDistance: "0px",
    wasPulling: false,
  });
  expect(new URL(page.url()).searchParams.has("refresh")).toBe(false);
  const boundaryWheelWasContained = await teamList.evaluate((scrollArea) => {
    scrollArea.scrollTop = scrollArea.scrollHeight;
    const event = new WheelEvent("wheel", {
      bubbles: true,
      cancelable: true,
      deltaY: 100,
    });
    return !scrollArea.dispatchEvent(event);
  });
  expect(boundaryWheelWasContained).toBe(true);

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
  await expect(page.locator("html")).not.toHaveClass(/has-contained-dialog/);
});

test("Next item form loads as a contained React dialog and saves", async ({
  page,
}) => {
  /** @type {string[]} */
  const dialogBundleRequests = [];
  page.on("request", (request) => {
    if (/\/nextItemDialog-[^/]+\.js$/.test(new URL(request.url()).pathname)) {
      dialogBundleRequests.push(request.url());
    }
  });
  await prepareAuthenticatedFollowedTeams(page);
  await page.addInitScript(() => {
    const originalFetch = window.fetch.bind(window);
    Reflect.set(window, "__nextDialogSavedItem", null);
    window.fetch = async (input, init = {}) => {
      const url = new URL(
        input instanceof Request ? input.url : String(input),
        window.location.href,
      );

      if (url.hostname !== "box-this-lap-next.boxthislap.workers.dev") {
        return originalFetch(input, init);
      }

      const method = String(init.method || "GET").toUpperCase();
      if (method === "GET") {
        return new Response(JSON.stringify({ items: [], ok: true }), {
          headers: { "content-type": "application/json" },
          status: 200,
        });
      }

      const item = JSON.parse(String(init.body || "{}"));
      Reflect.set(window, "__nextDialogSavedItem", item);
      return new Response(
        JSON.stringify({
          item: { ...item, id: "next-test-1", revision: 1 },
          ok: true,
        }),
        {
          headers: { "content-type": "application/json" },
          status: 200,
        },
      );
    };
  });
  await page.goto("/#next", { waitUntil: "networkidle" });

  expect(dialogBundleRequests).toEqual([]);
  await page.getByRole("button", { name: "Add Next item" }).click();
  const dialog = page.getByRole("dialog", { name: "Add Next Item" });
  const thing = dialog.getByRole("textbox", { name: "Thing" });
  await expect(dialog).toBeVisible();
  await expect(thing).toBeFocused();
  await expect(
    dialog
      .getByRole("button", { name: "Close Next item dialog" })
      .locator(".lucide-x"),
  ).toHaveCount(1);
  await expect(dialog.getByRole("button", { name: "Cancel" })).toHaveClass(
    /secondary-action/,
  );
  await expect(dialog.locator(".react-form-dialog-actions")).toHaveCSS(
    "justify-content",
    "flex-end",
  );
  expect(dialogBundleRequests).toHaveLength(1);
  expect(
    await thing.evaluate((input) =>
      Number.parseFloat(getComputedStyle(input).fontSize),
    ),
  ).toBeGreaterThanOrEqual(16);
  expect(
    await thing.evaluate((input) => input.getBoundingClientRect().height),
  ).toBeGreaterThanOrEqual(48);
  await expect(page.locator("body")).toHaveCSS("position", "fixed");

  await thing.fill("React migration check");
  await dialog.getByLabel("Date", { exact: true }).fill("2099-01-02");
  await dialog.getByLabel("Priority", { exact: true }).fill("8");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog).toBeHidden();
  expect(
    await page.evaluate(() => Reflect.get(window, "__nextDialogSavedItem")),
  ).toMatchObject({
    date: "2099-01-02",
    priority: 8,
    thing: "React migration check",
  });
  await expect(
    page.getByText("React migration check", { exact: true }),
  ).toBeVisible();
  await expect(page.locator("html")).not.toHaveClass(/has-contained-dialog/);

  await page.getByRole("button", { name: "Add Next item" }).click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeHidden();
});

test("To Do form uses the shared contained React dialog", async ({
  page,
}, testInfo) => {
  /** @type {string[]} */
  const dialogBundleRequests = [];
  page.on("request", (request) => {
    if (/\/todoItemDialog-[^/]+\.js$/.test(new URL(request.url()).pathname)) {
      dialogBundleRequests.push(request.url());
    }
  });
  await prepareAuthenticatedFollowedTeams(page);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "sendBeacon", {
      configurable: true,
      value: () => true,
    });
  });
  await page.route("https://script.google.com/macros/s/**", async (route) => {
    const url = new URL(route.request().url());
    const callback = url.searchParams.get("callback");
    const callbackId = url.searchParams.get("callbackId");
    const action = url.searchParams.get("action");
    const items =
      action === "listTodoItems"
        ? [
            { ID: "1", Name: "Parent task", Order: "1" },
            { ID: "2", Name: "Existing task", Order: "2" },
          ]
        : [];
    await route.fulfill({
      body: `${callback}(${JSON.stringify({
        callbackId,
        items,
        ok: true,
        source: "boxthislap-next-data",
      })});`,
      contentType: "application/javascript",
      status: 200,
    });
  });
  await page.goto("/#todo", { waitUntil: "networkidle" });

  expect(dialogBundleRequests).toEqual([]);
  await page.getByRole("button", { name: "Add To Do item" }).click();
  const dialog = page.getByRole("dialog", { name: "Add To Do Item" });
  const name = dialog.getByRole("textbox", { name: "Name" });
  await expect(dialog).toBeVisible();
  await expect(name).toBeFocused();
  expect(dialogBundleRequests).toHaveLength(1);
  await expect(page.locator("body")).toHaveCSS("position", "fixed");
  expect(
    await name.evaluate((input) =>
      Number.parseFloat(getComputedStyle(input).fontSize),
    ),
  ).toBeGreaterThanOrEqual(16);

  await name.fill("React To Do check");
  const parent = dialog.getByRole("combobox", { name: "Parent" });
  await parent.fill("Parent");
  await dialog.getByRole("option", { name: /Parent task/ }).click();
  await expect(parent).toHaveValue("Parent task");
  await dialog.getByRole("checkbox", { name: "Started" }).check();
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog).toBeHidden();
  await expect(
    page.getByText("React To Do check", { exact: true }),
  ).toBeVisible();
  await expect(page.locator("html")).not.toHaveClass(/has-contained-dialog/);

  await page.getByRole("button", { name: "Show To Do filters" }).click();
  await page.getByRole("checkbox", { name: "Edit", exact: true }).check();
  await page.locator("#todo-filter-toggle").click();
  const firstHandle = page.getByRole("button", {
    name: "Reorder Parent task",
  });
  if (testInfo.project.name === "mobile-safari") {
    await firstHandle.press("ArrowDown");
  } else {
    const secondCard = page.locator('[data-todo-id="2"]');
    const firstBounds = await firstHandle.boundingBox();
    const secondBounds = await secondCard.boundingBox();
    if (!firstBounds || !secondBounds) {
      throw new Error("Sortable To Do cards must be visible before dragging.");
    }
    await page.mouse.move(
      firstBounds.x + firstBounds.width / 2,
      firstBounds.y + firstBounds.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      secondBounds.x + secondBounds.width / 2,
      secondBounds.y + secondBounds.height / 2,
      { steps: 8 },
    );
    await page.mouse.up();
  }
  await expect
    .poll(() => page.locator("[data-todo-id] h2").allTextContents())
    .toEqual(["Existing task", "Parent task"]);
  await page
    .locator("[data-todo-child-id]", { hasText: "React To Do check" })
    .getByRole("button", { name: "Edit" })
    .click();
  const editDialog = page.getByRole("dialog", { name: "Edit To Do Item" });
  await expect(editDialog).toBeVisible();
  await expect(editDialog.getByRole("textbox", { name: "Name" })).toHaveValue(
    "React To Do check",
  );
  await expect(
    editDialog.getByRole("combobox", { name: "Parent" }),
  ).toHaveValue("Parent task");
  await editDialog.getByRole("button", { name: "Cancel" }).click();

  await page.getByRole("button", { name: "Add To Do item" }).click();
  await expect(dialog).toBeVisible();
  await expect(name).toHaveValue("");
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeHidden();
});

test("Want form uses the shared contained React dialog", async ({ page }) => {
  /** @type {string[]} */
  const dialogBundleRequests = [];
  page.on("request", (request) => {
    if (/\/wantItemDialog-[^/]+\.js$/.test(new URL(request.url()).pathname)) {
      dialogBundleRequests.push(request.url());
    }
  });
  await prepareAuthenticatedFollowedTeams(page);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "sendBeacon", {
      configurable: true,
      value: () => true,
    });
  });
  await page.route("https://script.google.com/macros/s/**", async (route) => {
    const url = new URL(route.request().url());
    const callback = url.searchParams.get("callback");
    const callbackId = url.searchParams.get("callbackId");
    const action = url.searchParams.get("action");
    const items =
      action === "listWantItems"
        ? [{ ID: "1", Name: "Existing want", Order: "1", Price: "15" }]
        : [];
    await route.fulfill({
      body: `${callback}(${JSON.stringify({
        callbackId,
        items,
        ok: true,
        source: "boxthislap-next-data",
      })});`,
      contentType: "application/javascript",
      status: 200,
    });
  });
  await page.goto("/#want", { waitUntil: "networkidle" });

  expect(dialogBundleRequests).toEqual([]);
  await page.getByRole("button", { name: "Add Want item" }).click();
  const dialog = page.getByRole("dialog", { name: "Add Want Item" });
  const name = dialog.getByRole("textbox", { name: "Name" });
  await expect(dialog).toBeVisible();
  await expect(name).toBeFocused();
  expect(dialogBundleRequests).toHaveLength(1);
  await expect(page.locator("body")).toHaveCSS("position", "fixed");
  expect(
    await name.evaluate((input) =>
      Number.parseFloat(getComputedStyle(input).fontSize),
    ),
  ).toBeGreaterThanOrEqual(16);

  await name.fill("React Want check");
  await dialog.getByRole("spinbutton", { name: "Price" }).fill("24.99");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog).toBeHidden();
  await expect(
    page.getByText("React Want check", { exact: true }),
  ).toBeVisible();
  await expect(page.locator("html")).not.toHaveClass(/has-contained-dialog/);

  await page.getByRole("button", { name: "Show Want filters" }).click();
  await page.locator("#want-edit-toggle").check();
  const wantCard = page.locator("[data-want-id]", {
    hasText: "React Want check",
  });
  await wantCard.click();
  await expect(wantCard).toHaveClass(/is-actions-open/);
  await wantCard.getByRole("button", { name: "Edit" }).click();
  const editDialog = page.getByRole("dialog", { name: "Edit Want Item" });
  await expect(editDialog).toBeVisible();
  await expect(editDialog.getByRole("textbox", { name: "Name" })).toHaveValue(
    "React Want check",
  );
  await expect(
    editDialog.getByRole("spinbutton", { name: "Price" }),
  ).toHaveValue("24.99");
  await editDialog.getByRole("button", { name: "Cancel" }).click();

  await page.getByRole("button", { name: "Add Want item" }).click();
  await expect(dialog).toBeVisible();
  await expect(name).toHaveValue("");
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).toBeHidden();
});

test("Footy entry dialogs contain mobile scrolling", async ({ page }) => {
  await prepareAuthenticatedFollowedTeams(page);
  await page.route(
    "https://box-this-lap-footy-notes.boxthislap.workers.dev/**",
    async (route) => {
      await route.fulfill({
        body: JSON.stringify({
          ok: true,
          performances: [],
          seenMatches: [],
        }),
        contentType: "application/json",
        status: 200,
      });
    },
  );

  for (const entry of [
    {
      addName: "Add a 10 out of 10 performance",
      closeName: "Close 10 out of 10 performance editor",
      dialogName: "Add 10/10 Performance",
      pageName: "footy-perfect",
    },
    {
      addName: "Add a seen match",
      closeName: "Close seen match editor",
      dialogName: "Add Seen Match",
      pageName: "footy-seen",
    },
  ]) {
    await page.goto(`/#${entry.pageName}`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: entry.addName }).click();
    const dialog = page.getByRole("dialog", { name: entry.dialogName });
    const scrollArea = dialog.locator(".legacy-dialog-scroll");
    await expect(dialog).toBeVisible();
    await expect(page.locator("body")).toHaveCSS("position", "fixed");
    expect(
      await scrollArea.evaluate((element) => {
        const event = new Event("touchmove", {
          bubbles: true,
          cancelable: true,
        });
        Object.defineProperty(event, "touches", {
          value: [{ clientY: 100 }],
        });
        return !element.dispatchEvent(event);
      }),
    ).toBe(true);
    await dialog.getByRole("button", { name: entry.closeName }).click();
    await expect(dialog).toBeHidden();
    await expect(page.locator("html")).not.toHaveClass(/has-contained-dialog/);
  }
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
        const extraTeams = Array.from({ length: 24 }, (_, index) => ({
          active: true,
          id: String(index + 3),
          leagues: [{ id: "test-league", name: "Test League" }],
          name: `Test Team ${String(index + 1).padStart(2, "0")}`,
          prettyName: `Test Team ${String(index + 1).padStart(2, "0")}`,
        }));
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
              ...extraTeams,
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
  /** @type {string[]} */
  const formulaOnePublicRequests = [];
  await page.route(
    "https://box-this-lap-rankings.boxthislap.workers.dev/**",
    (route) =>
      route.fulfill({
        body: JSON.stringify({ teams: [] }),
        contentType: "application/json",
        status: 200,
      }),
  );
  page.on("request", (request) => {
    if (/\/formulaOnePublic-[^/]+\.js$/.test(new URL(request.url()).pathname)) {
      formulaOnePublicRequests.push(request.url());
    }
    if (
      /\/(?:collectibles|draftLists|formulaOneCalculator|formulaOneQualifying|guideData|guides|platinums|trophyLog|trophyStats|youtubeInbox)-[^/]+\.js$/.test(
        new URL(request.url()).pathname,
      )
    ) {
      secondaryBundleRequests.push(request.url());
    }
  });

  await page.goto("/#footy", { waitUntil: "networkidle" });
  await expect(page.locator('[data-page="footy"]')).toHaveClass(/is-active/);

  expect(secondaryBundleRequests).toEqual([]);
  expect(formulaOnePublicRequests).toEqual([]);

  await page.goto("/#formula-1-2026-results", { waitUntil: "networkidle" });
  await expect(
    page.locator('[data-page="formula-1-2026-results"]'),
  ).toHaveClass(/is-active/);

  expect(secondaryBundleRequests).toEqual([]);
  expect(formulaOnePublicRequests).toHaveLength(1);
});

test("2025 Formula One pages load while their deferred controller downloads", async ({
  page,
}) => {
  let controllerFinished = false;
  let dataStartedBeforeControllerFinished = false;
  const mainSheet = [
    ",,Wyatt,",
    "Question,Answer,Wyatt,Points",
    "Who wins the championship?,Oscar,Lando,10",
  ].join("\n");
  const weeklySheet = [
    "Person,P1,P2,P3,Wildcard,,Person,P1,P2,P3,Wildcard Qualifying,Wildcard Race,,Person,P1,P2,P3,Wildcard Qualifying,Wildcard Race,Total",
    "Wyatt,Lando,Oscar,George,Charles,,Wyatt,1,2,3,4,5,,Wyatt,25,18,15,10,8,76",
  ].join("\n");

  await page.route("**/formulaOnePublic-*.js", async (route) => {
    const response = await route.fetch();
    await new Promise((resolve) => setTimeout(resolve, 500));
    await route.fulfill({ response });
    controllerFinished = true;
  });
  await page.route("https://docs.google.com/**", async (route) => {
    const url = route.request().url();
    if (url.includes("2PACX-1vRrushAAc96VpAzSRiZsRK0198bbc")) {
      dataStartedBeforeControllerFinished ||= !controllerFinished;
      await route.fulfill({ body: mainSheet, contentType: "text/csv" });
      return;
    }
    if (url.includes("2PACX-1vR4JBp8m58prqFPqifgHB0xS7y")) {
      await route.fulfill({ body: weeklySheet, contentType: "text/csv" });
      return;
    }
    await route.fulfill({ body: "", contentType: "text/csv" });
  });
  await page.route(
    "https://box-this-lap-rankings.boxthislap.workers.dev/**",
    (route) =>
      route.fulfill({
        body: JSON.stringify({ teams: [] }),
        contentType: "application/json",
        status: 200,
      }),
  );

  await page.goto("/#formula-1-2025-questions", { waitUntil: "networkidle" });
  await expect(page.getByText("Who wins the championship?")).toBeVisible();
  expect(dataStartedBeforeControllerFinished).toBe(true);

  await page.evaluate(() => {
    window.location.hash = "formula-1-2025-weekly";
  });
  await expect(
    page.locator("#formula-one-2025-weekly-round-select"),
  ).toBeVisible();
  await expect(page.locator("#formula-one-2025-weekly-list")).not.toContainText(
    "Loading",
  );

  await page.evaluate(() => {
    window.location.hash = "formula-1-2025-results";
  });
  await expect(page.locator("#formula-one-2025-results-rows")).toContainText(
    "Wyatt",
  );
});

test("authenticated YouTube route loads its deferred controller", async ({
  page,
}) => {
  /** @type {string[]} */
  const controllerRequests = [];
  /** @type {string[]} */
  const pageErrors = [];
  page.on("request", (request) => {
    if (/\/youtubeInbox-[^/]+\.js$/.test(new URL(request.url()).pathname)) {
      controllerRequests.push(request.url());
    }
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await prepareAuthenticatedSecondaryRoutes(page);

  await page.goto("/#youtube", { waitUntil: "networkidle" });

  await expect(page.locator('[data-page="youtube"]')).toHaveClass(/is-active/);
  await expect(page.locator(".youtube-toolbar")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "All caught up" }),
  ).toBeVisible();
  expect(controllerRequests).toHaveLength(1);
  expect(pageErrors).toEqual([]);
});

test("authenticated Guides render in React and Draft List loads its deferred controller", async ({
  page,
}) => {
  await prepareAuthenticatedSecondaryRoutes(page);

  await page.goto("/#guides", { waitUntil: "networkidle" });
  await expect(page.locator('[data-page="guides"]')).toHaveClass(/is-active/);
  await expect(page.locator(".guides-grid")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Guides" })).toBeVisible();

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

test("signed-in managers submit Formula One weekly choices on-site", async ({
  browserName,
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "boxThisLapManagerSession",
      JSON.stringify({
        isAdmin: false,
        manager: { id: "2", displayName: "Test Manager", isAdmin: false },
        managerId: "2",
        rankingAuth: {
          accessExpiresAt: "2099-01-01T00:00:00.000Z",
          accessToken: "test-access-token",
        },
      }),
    );
  });
  /** @type {null | Record<string, string | number>} */
  let entry = null;
  let submissionReceived = false;
  const weeklyData = () => ({
    drivers: [
      {
        active: 1,
        constructor_name: "McLaren",
        display_name: "Lando Norris",
        driver_id: "norris",
      },
      {
        active: 1,
        constructor_name: "Mercedes",
        display_name: "George Russell",
        driver_id: "russell",
      },
      {
        active: 1,
        constructor_name: "Ferrari",
        display_name: "Charles Leclerc",
        driver_id: "leclerc",
      },
      {
        active: 1,
        constructor_name: "Williams",
        display_name: "Carlos Sainz",
        driver_id: "sainz",
      },
    ],
    entries: entry ? [entry] : [],
    ok: true,
    roundDrivers: [],
    rounds: [
      {
        deadline_at: "2099-04-01T05:00:00.000Z",
        is_open: 1,
        name: "Japanese Grand Prix",
        round: 1,
        year: 2026,
      },
      {
        deadline_at: "2099-03-07T05:00:00.000Z",
        is_open: 1,
        name: "Australian Grand Prix",
        round: 2,
        year: 2026,
      },
    ],
    year: 2026,
  });
  await page.route("https://docs.google.com/**", (route) =>
    route.fulfill({ body: "", contentType: "text/csv", status: 200 }),
  );
  await page.route(
    "https://box-this-lap-rankings.boxthislap.workers.dev/**",
    (route) =>
      route.fulfill({
        body: JSON.stringify({ ok: true, teams: [] }),
        contentType: "application/json",
        status: 200,
      }),
  );
  await page.route(
    "https://box-this-lap-formula-one.boxthislap.workers.dev/**",
    async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const corsHeaders = {
        "access-control-allow-headers": "authorization,content-type",
        "access-control-allow-methods": "GET,POST,PUT,OPTIONS",
        "access-control-allow-origin": "*",
      };
      if (request.method() === "OPTIONS") {
        return route.fulfill({ headers: corsHeaders, status: 204 });
      }
      if (
        request.method() === "POST" &&
        url.pathname.endsWith("/drivers/refresh")
      ) {
        return route.fulfill({
          body: JSON.stringify({ drivers: [], ok: true }),
          contentType: "application/json",
          headers: corsHeaders,
          status: 200,
        });
      }
      if (request.method() === "PUT" && url.pathname.endsWith("/picks/me")) {
        submissionReceived = true;
        entry = {
          entry_status: "submitted",
          manager_id: "2",
          p1_driver_id: "norris",
          p2_driver_id: "russell",
          p3_driver_id: "leclerc",
          round: 2,
          submitted_at: "2099-03-01T12:00:00.000Z",
          wildcard_driver_id: "sainz",
          year: 2026,
        };
        return route.fulfill({
          body: JSON.stringify({ entry, ok: true }),
          contentType: "application/json",
          headers: corsHeaders,
          status: 200,
        });
      }
      const isWeeklyRead = url.pathname.endsWith("/weekly/me");
      const body = isWeeklyRead ? weeklyData() : { drivers: [], ok: true };
      return route.fulfill({
        body: JSON.stringify(body),
        contentType: "application/json",
        headers: corsHeaders,
        status: 200,
      });
    },
  );

  await page.goto("/#manager-hub", { waitUntil: "domcontentloaded" });
  await page.getByText("Notifications", { exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Australian Grand Prix weekly choices" }),
  ).toBeVisible();

  await page.goto("/#formula-1-2026-weekly", { waitUntil: "domcontentloaded" });
  const form = page.locator("[data-formula-one-manager-picks]");
  await expect(form).toBeVisible();
  await expect(form.locator("[data-formula-one-manager-round]")).toHaveValue(
    "2",
  );
  await expect(form.getByText("Deadline (Eastern Time)")).toBeVisible();
  await expect(form.locator(".formula-one-manager-deadline strong")).toHaveText(
    /E[DS]T$/,
  );
  await expect(
    form.locator('select[name="wildcardDriverId"] option'),
  ).toHaveText(["Choose driver", "Carlos Sainz"]);
  // Playwright WebKit cannot fulfill this cross-origin PUT reliably, but it
  // still verifies the complete mobile entry UI and wildcard filter above.
  if (browserName === "webkit") return;
  await form.locator('select[name="p1DriverId"]').selectOption("norris");
  await form.locator('select[name="p2DriverId"]').selectOption("russell");
  await form.locator('select[name="p3DriverId"]').selectOption("leclerc");
  await form.locator('select[name="wildcardDriverId"]').selectOption("sainz");
  await form.getByRole("button", { name: "Submit choices" }).click();

  await expect(form.getByText("Choices submitted.")).toBeVisible();
  await expect(
    form.getByRole("button", { name: "Edit choices" }),
  ).toBeVisible();
  expect(submissionReceived).toBe(true);
});

test("Formula One calculator loads its complete deferred controller", async ({
  page,
}) => {
  /** @type {string[]} */
  const controllerRequests = [];
  /** @type {string[]} */
  const pageErrors = [];
  page.on("request", (request) => {
    if (
      /\/formulaOneCalculator-[^/]+\.js$/.test(new URL(request.url()).pathname)
    ) {
      controllerRequests.push(request.url());
    }
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.route(
    "https://box-this-lap-formula-one.boxthislap.workers.dev/api/seasons/2026/calculator",
    async (route) => {
      await route.fulfill({
        body: JSON.stringify({
          currentTotals: { "Alex A": 150, "Blake B": 75, "Casey C": 49 },
          driversToWatch: ["Alex A", "Blake B", "Casey C"],
          raceOptions: [
            { position: "1", points: 25 },
            { position: "2", points: 18 },
            { position: "<10", points: 0 },
          ],
          rounds: [
            {
              id: 1,
              name: "Round 1",
              complete: true,
              pointsByDriver: { "Alex A": 150, "Blake B": 75, "Casey C": 49 },
            },
            { id: 2, name: "Round 2", complete: false, pointsByDriver: {} },
          ],
          sprintOptions: [
            { position: "1", points: 8 },
            { position: "2", points: 7 },
            { position: "<8", points: 0 },
          ],
          sprintRounds: [
            { id: 2, name: "Round 2", complete: false, pointsByDriver: {} },
          ],
        }),
        contentType: "application/json",
        status: 200,
      });
    },
  );
  await page.route(
    "https://box-this-lap-rankings.boxthislap.workers.dev/**",
    (route) =>
      route.fulfill({
        body: JSON.stringify({ teams: [] }),
        contentType: "application/json",
        status: 200,
      }),
  );

  await page.goto("/#formula-1-2026-calculator", { waitUntil: "networkidle" });
  await expect(
    page.locator('[data-page="formula-1-2026-calculator"]'),
  ).toHaveClass(/is-active/);
  await expect(
    page.getByRole("heading", { name: "Points calculator" }),
  ).toBeVisible();
  const resetButton = page.getByRole("button", { name: "Reset" });
  const filterButton = page.getByRole("button", {
    name: "Show driver filters",
  });
  const [resetBounds, filterBounds] = await Promise.all([
    resetButton.boundingBox(),
    filterButton.boundingBox(),
  ]);
  expect(Math.abs((resetBounds?.y ?? 0) - (filterBounds?.y ?? 0))).toBeLessThan(
    2,
  );
  expect(resetBounds?.x ?? 0).toBeLessThan(filterBounds?.x ?? 0);
  await page.getByRole("button", { name: "Expanded" }).click();
  const position = page
    .locator('[data-formula-one-calculator-position][data-event-type="race"]')
    .first();
  await position.selectOption("1");
  await expect(
    page.locator(".formula-one-calculator-projected").first(),
  ).toContainText("175");
  await page.getByRole("button", { name: "Simple" }).click();
  await page.getByRole("button", { name: "Expanded" }).click();
  await expect(
    page
      .locator('[data-formula-one-calculator-position][data-event-type="race"]')
      .first(),
  ).toHaveValue("1");
  const storedState = await page.evaluate(() =>
    localStorage.getItem("boxthislap-formula-one-calculator-2026"),
  );
  expect(storedState).toContain('"race:2:Alex A":"1"');
  await page.getByRole("button", { name: "Show driver filters" }).click();
  await page.getByRole("button", { name: "Only Protagonists" }).click();
  await expect(
    page.locator("[data-formula-one-calculator-filter]:checked"),
  ).toHaveCount(2);
  await expect(
    page.locator('[data-formula-one-calculator-filter][data-driver="Casey C"]'),
  ).not.toBeChecked();
  await page.getByRole("button", { name: "Reset" }).click();
  await expect(page.getByRole("button", { name: "Simple" })).toHaveClass(
    /is-active/,
  );
  await expect(
    page.locator("[data-formula-one-calculator-filter]:checked"),
  ).toHaveCount(3);
  expect(
    await page.evaluate(() =>
      localStorage.getItem("boxthislap-formula-one-calculator-2026"),
    ),
  ).toBeNull();
  expect(controllerRequests).toHaveLength(1);
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
