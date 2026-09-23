// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppProviders } from "../../app/providers";
import { GuidesFeature } from "./GuidesFeature";

beforeEach(() => {
  window.localStorage.setItem(
    "boxThisLapManagerSession",
    JSON.stringify({ isAdmin: true, managerId: "manager-guides-test" }),
  );
  window.history.replaceState({}, "", "/#guides");
  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/progress")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              ok: true,
              progress: [{ guideId: "done", stepId: "done-step" }],
            }),
          ),
        );
      }
      return Promise.resolve(
        new Response(
          JSON.stringify({
            guides: [
              { ID: "open", Name: "Open Guide", isAdmin: false },
              { ID: "done", Name: "Completed Guide", isAdmin: true },
            ],
            steps: [
              { ID: "1", "Guide ID": "open", "Step ID": "open-step" },
              { ID: "2", "Guide ID": "done", "Step ID": "done-step" },
            ],
          }),
        ),
      );
    }),
  );
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.unstubAllGlobals();
});

describe("GuidesFeature", () => {
  it("shows uncompleted guides first and toggles to completed guides", async () => {
    render(
      <AppProviders>
        <GuidesFeature />
      </AppProviders>,
    );

    expect(await screen.findByText("Open Guide")).not.toBeNull();
    expect(screen.queryByText("Completed Guide")).toBeNull();

    fireEvent.click(
      screen.getByRole("button", { name: "Show completed guides" }),
    );

    expect(screen.getByText("Completed Guide")).not.toBeNull();
    expect(screen.queryByText("Open Guide")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Show uncompleted guides" }),
    ).not.toBeNull();
  });
});
