// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
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
      imageUrl: null,
      inScope: true,
      newSince: "2026-09-26T00:00:00Z",
      priceMinor: 9999,
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
});
