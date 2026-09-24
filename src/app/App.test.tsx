// @vitest-environment jsdom

import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DeferredDatabaseAdminPage } from "./App";

beforeEach(() => {
  window.history.replaceState(null, "", "#the-monster-maniac");
  window.boxThisLapGetManagerAccessToken = async () => "token";
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      json: async () => ({ databases: [] }),
    })) as unknown as typeof fetch,
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  delete window.boxThisLapGetManagerAccessToken;
});

describe("deferred Database Explorer route", () => {
  it("mounts when the custom router shows the page without a hashchange", async () => {
    render(<DeferredDatabaseAdminPage />);
    expect(
      screen.queryByRole("heading", { name: "Database Explorer" }),
    ).toBeNull();

    await act(async () => {
      window.history.pushState(null, "", "#database-admin");
      window.dispatchEvent(
        new CustomEvent("boxthislap:page-shown", {
          detail: { pageName: "database-admin" },
        }),
      );
    });

    expect(
      await screen.findByRole("heading", { name: "Database Explorer" }),
    ).not.toBeNull();
  });
});
