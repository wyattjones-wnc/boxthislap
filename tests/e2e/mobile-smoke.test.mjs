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

test("To Do form uses the shared contained React dialog", async ({ page }) => {
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
