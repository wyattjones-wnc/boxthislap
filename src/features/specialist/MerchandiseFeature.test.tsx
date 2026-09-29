// @vitest-environment jsdom

import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppProviders } from "../../app/providers";
import { MerchandiseFeature } from "./MerchandiseFeature";

const feed = {
  items: [
    {
      availability: "in_stock",
      canonicalUrl: "https://store.example/item",
      category: "kits",
      currency: "USD",
      firstObservedAt: "2026-09-26T00:00:00Z",
      id: "barcelona:2",
      imageUrl: "https://cdn.example/item.jpg",
      inScope: true,
      newSince: "2026-09-26T00:00:00Z",
      priceMinor: 9999,
      regularPriceMinor: 12999,
      seen: false,
      source: "barcelona",
      team: "barcelona",
      title: "Home shirt",
      wishlisted: false,
    },
  ],
  pagination: { hasMore: false, page: 1 },
  sources: [
    {
      checkedAt: "2026-09-26T00:00:00Z",
      error: null,
      itemCount: 2500,
      source: "barcelona",
      stale: false,
      status: "succeeded",
    },
  ],
};

beforeEach(() => {
  window.history.replaceState(null, "", "#merchandise");
  window.boxThisLapGetManagerAccessToken = async () => "token";
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  delete window.boxThisLapGetManagerAccessToken;
});

describe("MerchandiseFeature", () => {
  it("confirms and submits Seen through here with the active filters", async () => {
    const requests = [] as Array<{ url: string; options?: RequestInit }>;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, options?: RequestInit) => {
        requests.push({ url, options });
        const value = url.includes("seen-through")
          ? { ok: true, seen: 2 }
          : url.includes("/state")
            ? { ok: true, state: { wishlisted: true } }
            : { ok: true, ...feed };
        return { ok: true, json: async () => value } as Response;
      }),
    );
    const user = userEvent.setup();
    render(
      <AppProviders>
        <MerchandiseFeature />
      </AppProviders>,
    );
    expect(
      await screen.findByRole("heading", { name: "Home shirt" }),
    ).not.toBeNull();
    expect(document.querySelectorAll("[data-product-image]")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Seen" })).not.toBeNull();
    expect(screen.getByRole("button", { name: "Sale" })).not.toBeNull();
    expect(screen.getByText("$129.99").tagName).toBe("DEL");
    await user.click(screen.getByRole("button", { name: "Seen" }));
    const sort = await screen.findByLabelText("Sort seen products");
    await user.selectOptions(sort, "seen-oldest");
    await waitFor(() =>
      expect(
        requests.some(
          (request) =>
            request.url.includes("view=seen") &&
            request.url.includes("sort=seen-oldest"),
        ),
      ).toBe(true),
    );
    await user.click(screen.getByRole("button", { name: "Unseen" }));
    await user.click(screen.getByRole("link", { name: "Home shirt" }));
    expect(
      requests.some(
        (request) =>
          request.options?.method === "PATCH" &&
          String(request.options.body).includes('"seen"'),
      ),
    ).toBe(false);
    await user.selectOptions(screen.getByLabelText("Category"), "kits");
    const first = await screen.findByRole("button", {
      name: "Seen through here",
    });
    await user.click(first);
    await user.click(
      screen.getByRole("button", { name: "Confirm through here" }),
    );
    await waitFor(() =>
      expect(
        requests.some((request) => request.url.includes("/seen-through")),
      ).toBe(true),
    );
    const request = requests.find((entry) =>
      entry.url.includes("/seen-through"),
    );
    expect(JSON.parse(String(request?.options?.body))).toMatchObject({
      category: "kits",
      sort: "newest",
    });
    expect(await screen.findByText("2 products marked seen.")).not.toBeNull();
  });

  it("saves wishlist state once and updates the card without reloading the feed", async () => {
    let finishSave: ((value: Response) => void) | undefined;
    let getRequests = 0;
    let patchRequests = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, options?: RequestInit) => {
        if (options?.method === "PATCH") {
          patchRequests += 1;
          return new Promise<Response>((resolve) => {
            finishSave = resolve;
          });
        }
        getRequests += 1;
        return {
          ok: true,
          json: async () => ({ ok: true, ...feed }),
        } as Response;
      }),
    );
    const user = userEvent.setup();
    render(
      <AppProviders>
        <MerchandiseFeature />
      </AppProviders>,
    );
    const card = await screen.findByRole("article");
    const wishlist = within(card).getByRole("button", { name: "Wishlist" });
    await user.click(wishlist);
    const saving = within(card).getByRole("button", { name: "Saving…" });
    expect(saving.hasAttribute("disabled")).toBe(true);
    await user.click(saving);
    expect(patchRequests).toBe(1);
    finishSave?.({
      ok: true,
      json: async () => ({ ok: true, state: { wishlisted: true } }),
    } as Response);
    expect(
      await within(card).findByRole("button", { name: "Remove wishlist" }),
    ).not.toBeNull();
    expect(getRequests).toBe(1);
  });
});
