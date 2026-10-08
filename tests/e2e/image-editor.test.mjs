import { expect, test } from "@playwright/test";
test.beforeEach(async ({ page }) => {
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
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === "http://127.0.0.1:4173") return route.continue();
    if (url.hostname.includes("workers.dev")) {
      const value = url.pathname.endsWith("/presets")
        ? { presets: [] }
        : url.pathname.endsWith("/catalog")
          ? { content: [], files: [] }
          : {
              ok: true,
              items: [],
              managers: [{ id: "6", isAdmin: true, name: "Wyatt" }],
              sessions: [],
              rosters: [],
              notes: [],
              sets: [],
              config: {
                enabled: false,
                initialized: false,
                billingDay: 1,
                storageLimit: 512000000,
                readLimit: 100000,
                writeLimit: 2500,
                dailyLimit: 2000,
              },
              storage: 0,
              reads: 0,
              writes: 0,
              daily: 0,
            };
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(value),
      });
    }
    return route.fulfill({ status: 200, contentType: "text/plain", body: "" });
  });
});
test("layered editor exports exact cropped pixels and reopens local project transforms", async ({
  page,
}) => {
  await page.goto("/#image-editor");
  await expect(
    page.getByRole("heading", { name: "Image Studio", exact: true }),
  ).toBeVisible();
  const editor = page.locator("[data-image-editor]");
  await editor.getByLabel("Canvas width", { exact: true }).fill("80");
  await editor.getByLabel("Canvas height", { exact: true }).fill("60");
  await editor
    .getByRole("button", { name: "Resize canvas", exact: true })
    .click();
  const image = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 20;
    c.height = 20;
    const ctx = c.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");
    ctx.fillStyle = "#ff0000";
    ctx.fillRect(0, 0, 20, 20);
    return c.toDataURL().split(",")[1];
  });
  await editor
    .locator("input[type=file]")
    .first()
    .setInputFiles({
      name: "red.png",
      mimeType: "image/png",
      buffer: Buffer.from(image, "base64"),
    });
  await expect(editor.getByLabel("Layer name", { exact: true })).toHaveValue(
    "red.png",
  );
  await editor.getByLabel("Scale (%)", { exact: true }).fill("100");
  await editor.getByLabel("X", { exact: true }).fill("-10");
  await editor.getByLabel("Y", { exact: true }).fill("0");
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const c = document.querySelector("[data-image-editor] canvas"),
          ctx = c instanceof HTMLCanvasElement ? c.getContext("2d") : null;
        if (!ctx) throw new Error("Canvas unavailable");
        return [...ctx.getImageData(5, 5, 1, 1).data];
      }),
    )
    .toEqual([255, 0, 0, 255]);
  expect(
    await page.evaluate(() => {
      const c = document.querySelector("[data-image-editor] canvas");
      if (!(c instanceof HTMLCanvasElement))
        throw new Error("Canvas unavailable");
      const ctx = c.getContext("2d");
      if (!ctx) throw new Error("Canvas unavailable");
      return [c.width, c.height, [...ctx.getImageData(15, 5, 1, 1).data]];
    }),
  ).toEqual([80, 60, [0, 0, 0, 0]]);
  const projectDownload = page.waitForEvent("download");
  await editor
    .getByRole("button", { name: "Save project", exact: true })
    .click();
  const downloaded = await projectDownload;
  const path = await downloaded.path();
  await editor.getByLabel("X", { exact: true }).fill("10");
  await editor.locator("input[type=file]").nth(1).setInputFiles(path);
  await expect(editor.getByLabel("X", { exact: true })).toHaveValue("-10");
  const exportDownload = page.waitForEvent("download");
  await editor
    .getByRole("button", { name: "Export image", exact: true })
    .click();
  expect((await exportDownload).suggestedFilename()).toBe("image.png");
});
/** @param {import('@playwright/test').Page} page */
async function pixel(page) {
  return page.evaluate(() => {
    const c = document.querySelector("[data-image-editor] canvas");
    if (!(c instanceof HTMLCanvasElement))
      throw new Error("Canvas unavailable");
    const ctx = c.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");
    return [...ctx.getImageData(20, 20, 1, 1).data];
  });
}
test("paint tools, selections, text, and history work on a real canvas", async ({
  page,
}) => {
  await page.goto("/#image-editor");
  const editor = page.locator("[data-image-editor]");
  await expect(editor).toBeVisible();
  await editor.getByLabel("Canvas width", { exact: true }).fill("80");
  await editor.getByLabel("Canvas height", { exact: true }).fill("60");
  await editor
    .getByRole("button", { name: "Resize canvas", exact: true })
    .click();
  await editor
    .getByRole("button", { name: "Paint layer", exact: true })
    .click();
  await editor
    .getByRole("combobox", { name: "Tool", exact: true })
    .selectOption("fill");
  await editor.locator("canvas").click({ position: { x: 10, y: 10 } });
  await expect.poll(() => pixel(page)).toEqual([255, 255, 255, 255]);
  await editor.getByRole("button", { name: "Undo", exact: true }).click();
  await expect.poll(async () => (await pixel(page))[3]).toBe(0);
  await editor.getByRole("button", { name: "Redo", exact: true }).click();
  await editor
    .getByRole("combobox", { name: "Tool", exact: true })
    .selectOption("eraser");
  await editor.locator("canvas").click({ position: { x: 10, y: 10 } });
  await expect.poll(async () => (await pixel(page))[3]).toBe(0);
  await editor
    .getByRole("combobox", { name: "Tool", exact: true })
    .selectOption("brush");
  await editor.locator("canvas").click({ position: { x: 10, y: 10 } });
  await expect.poll(() => pixel(page)).toEqual([255, 255, 255, 255]);
  await editor
    .getByRole("combobox", { name: "Tool", exact: true })
    .selectOption("rectangle");
  const box = await editor.locator("canvas").boundingBox();
  if (!box) throw new Error("Canvas unavailable");
  await page.mouse.move(box.x + 2, box.y + 2);
  await page.mouse.down();
  await page.mouse.move(box.x + 15, box.y + 15);
  await page.mouse.up();
  await expect(
    editor.getByRole("button", {
      name: "Move selection to layer",
      exact: true,
    }),
  ).toBeVisible();
  await editor
    .getByRole("button", { name: "Move selection to layer", exact: true })
    .click();
  await expect(editor.getByLabel("Layer name", { exact: true })).toHaveValue(
    "Paint layer selection",
  );
  await editor.getByRole("button", { name: "Text layer", exact: true }).click();
  await editor
    .getByRole("textbox", { name: "Text", exact: true })
    .fill("Hello");
  await editor
    .getByRole("button", { name: "Rasterize layer", exact: true })
    .click();
  await expect(
    editor.getByRole("textbox", { name: "Text", exact: true }),
  ).toHaveCount(0);
});
test("embedded crop remains available when cloud settings fail", async ({
  page,
}) => {
  await page.goto("/#image-editor");
  await expect(
    page.getByRole("heading", { name: "Image Studio", exact: true }),
  ).toBeVisible();
  await page.route("**/api/images/presets", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "Cloud unavailable" }),
    }),
  );
  await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = 20;
    c.height = 20;
    const ctx = c.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");
    ctx.fillStyle = "#ff0000";
    ctx.fillRect(0, 0, 20, 20);
    const bytes = Uint8Array.from(atob(c.toDataURL().split(",")[1]), (char) =>
      char.charCodeAt(0),
    );
    const open = /** @type {unknown} */ (window);
    const tools =
      /** @type {{ boxThisLapOpenImageEditor: (request: object) => Promise<{width:number,height:number} | null>; croppedResult?: object | null }} */ (
        open
      );
    void tools
      .boxThisLapOpenImageEditor({
        file: new File([bytes], "red.png", { type: "image/png" }),
        limited: true,
        width: 80,
        height: 60,
        context: "footy-card",
      })
      .then((result) => {
        tools.croppedResult = result
          ? { width: result.width, height: result.height }
          : null;
      });
  });
  const dialog = page.getByRole("dialog", {
    name: "Position image",
    exact: true,
  });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("Layer name", { exact: true })).toHaveValue(
    "red.png",
  );
  await expect(dialog.getByText(/You can still edit locally/)).toBeVisible();
  await dialog
    .getByRole("button", { name: "Use cropped image", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  expect(
    await page.evaluate(
      () =>
        /** @type {{croppedResult?: object | null}} */ (
          /** @type {unknown} */ (window)
        ).croppedResult,
    ),
  ).toEqual({ width: 80, height: 60 });
});
