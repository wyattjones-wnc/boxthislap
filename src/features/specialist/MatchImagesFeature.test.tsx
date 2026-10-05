// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MatchImagesFeature from "./MatchImagesFeature";

const candidate = {
  id: "image-1",
  source: "barcelona",
  sourceImageUrl: "https://media.fcbarcelona.com/image.jpg",
  originalPageUrl: "https://www.fcbarcelona.com/gallery/1",
  renderMode: "image",
  embedUrl: "",
  caption: "Winning goal",
  credit: "FC Barcelona",
  firstObservedAt: "2026-09-28T01:00:00Z",
  seen: false,
  softSaved: false,
  hardSaved: false,
  hardSaveEligible: true,
  hardSaveError: "",
  assetUrl: "",
  duplicateOfImageId: "",
  teamId: "2",
  matchId: "match-1",
  gallery: {
    id: "gallery-1",
    sourceUrl: "https://www.fcbarcelona.com/gallery/1",
    title: "Photos from the win",
    publishedAt: "2026-09-27T20:00:00Z",
    category: "match",
    matchConfidence: 90,
    matchStatus: "auto",
    matchEvidence: ["opponent"],
  },
};

beforeEach(() => {
  HTMLElement.prototype.scrollIntoView = vi.fn();
  window.boxThisLapGetManagerAccessToken = async () => "token";
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  delete window.boxThisLapGetManagerAccessToken;
});

describe("MatchImagesFeature", () => {
  it("starts a manual scan and applies filtered Seen through here", async () => {
    const requests: Array<{ url: string; options?: RequestInit }> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request, options?: RequestInit) => {
        const url = String(input);
        requests.push({ url, options });
        if (url.endsWith("data/footy-schedule.json"))
          return {
            ok: true,
            json: async () => ({ teamSchedules: [] }),
          } as Response;
        if (url.includes("/seen-through"))
          return {
            ok: true,
            json: async () => ({ ok: true, seen: 3 }),
          } as Response;
        if (url.endsWith("/api/match-media/scans"))
          return {
            ok: true,
            json: async () => ({
              scan: {
                id: "scan-1",
                status: "queued",
                requestedAt: "2026-09-28T12:00:00Z",
                finishedAt: "",
                sourceCount: 0,
                galleryCount: 0,
                newImageCount: 0,
                unmatchedGalleryCount: 0,
                errorCount: 0,
                errorSummary: "",
              },
            }),
          } as Response;
        if (url.includes("/api/match-media/health"))
          return {
            ok: true,
            json: async () => ({ ok: true, latestScan: null, sources: [] }),
          } as Response;
        return {
          ok: true,
          json: async () => ({
            ok: true,
            images: [candidate],
            pagination: { page: 1, total: 1, hasMore: true },
            facets: [],
          }),
        } as Response;
      }),
    );
    const user = userEvent.setup();
    render(<MatchImagesFeature />);
    expect(
      await screen.findByRole("heading", { name: "Photos from the win" }),
    ).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "Next" }));
    await screen.findByText("Page 2");
    const readsBeforeFilter = requests.filter((request) =>
      request.url.includes("/api/match-media?"),
    ).length;
    await user.selectOptions(screen.getByLabelText("Team"), "2");
    await screen.findByText("Page 1");
    expect(
      requests.filter((request) => request.url.includes("/api/match-media?"))
        .length,
    ).toBe(readsBeforeFilter + 1);
    await user.click(screen.getByRole("button", { name: "Next" }));
    await screen.findByText("Page 2");
    const readsBeforeSeen = requests.filter((request) =>
      request.url.includes("/api/match-media?"),
    ).length;
    const first = await screen.findByRole("button", {
      name: "Seen through here",
    });
    await user.click(first);
    expect(HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalled();
    await user.click(
      screen.getByRole("button", { name: "Confirm through here" }),
    );
    await waitFor(() =>
      expect(
        requests.some((request) => request.url.includes("/seen-through")),
      ).toBe(true),
    );
    const seen = requests.find((request) =>
      request.url.includes("/seen-through"),
    );
    expect(JSON.parse(String(seen?.options?.body))).toMatchObject({
      galleryId: "gallery-1",
      sort: "newest",
    });
    expect(await screen.findByText("3 images marked seen.")).not.toBeNull();
    await waitFor(() =>
      expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalledWith({
        block: "start",
        behavior: "instant",
      }),
    );
    await screen.findByText("Page 1");
    expect(
      requests.filter((request) => request.url.includes("/api/match-media?"))
        .length,
    ).toBe(readsBeforeSeen + 1);
    expect(
      requests.filter((request) =>
        request.url.endsWith("/api/match-media/health"),
      ),
    ).toHaveLength(1);
    expect(
      requests.filter((request) => request.url.includes("/seen-through")),
    ).toHaveLength(1);
    await user.click(
      screen.getByRole("button", { name: /Scan for new images/ }),
    );
    await waitFor(() =>
      expect(
        requests.some((request) =>
          request.url.endsWith("/api/match-media/scans"),
        ),
      ).toBe(true),
    );
  });
});
