import * as Tooltip from "@radix-ui/react-tooltip";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { FootyPage, NextPage } from "./OperationalPages";

afterEach(() => {
  cleanup();
  delete window.__boxThisLapNextListView;
  delete window.__boxThisLapSetNextListView;
});

function renderWithTooltips(component: React.ReactNode) {
  return render(<Tooltip.Provider>{component}</Tooltip.Provider>);
}

describe("operational React pages", () => {
  it("renders live Next view updates from the transition data bridge", async () => {
    renderWithTooltips(<NextPage />);

    window.dispatchEvent(
      new CustomEvent("boxthislap:next-list", {
        detail: {
          activeItemId: "",
          editMode: false,
          emptyLabel: "No upcoming Next items found.",
          items: [
            {
              completed: false,
              dateLabel: "Jan 2, 2099",
              id: "next-1",
              imageUrl: "",
              isPast: false,
              passed: false,
              thing: "React-owned Next card",
              timeLabel: "8:00 PM EST",
            },
          ],
          previousItems: [],
        },
      }),
    );

    expect(await screen.findByText("React-owned Next card")).not.toBeNull();
    expect(screen.getByText("Jan 2, 2099")).not.toBeNull();
  });

  it("uses accessible Lucide actions for the Footy surface", () => {
    renderWithTooltips(<FootyPage />);

    expect(
      screen.getByRole("link", { name: "Create a custom Footy schedule" }),
    ).not.toBeNull();
    expect(screen.getByRole("button", { name: "Show filters" })).not.toBeNull();
  });
});
// @vitest-environment jsdom
