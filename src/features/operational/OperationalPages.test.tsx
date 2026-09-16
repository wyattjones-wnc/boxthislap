import * as Tooltip from "@radix-ui/react-tooltip";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  FootyPage,
  NextPage,
  RankingsPage,
  TodoPage,
  WantPage,
} from "./OperationalPages";

afterEach(() => {
  cleanup();
  delete window.__boxThisLapNextListView;
  delete window.__boxThisLapSetNextListView;
  delete window.__boxThisLapTodoListView;
  delete window.__boxThisLapWantListView;
  delete window.__boxThisLapRankingListViews;
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

  it("renders To Do and Want list updates as React cards", async () => {
    renderWithTooltips(
      <>
        <TodoPage />
        <WantPage />
      </>,
    );

    window.dispatchEvent(
      new CustomEvent("boxthislap:todo-list", {
        detail: {
          emptyLabel: "No To Do items.",
          items: [
            {
              children: [],
              deleted: false,
              draggable: true,
              expanded: false,
              guideLinks: [],
              hourLabel: "2 hours",
              id: "todo-1",
              meta: ["Games"],
              name: "React To Do card",
              orderLabel: "1",
              started: true,
              statusChips: [],
            },
          ],
        },
      }),
    );
    window.dispatchEvent(
      new CustomEvent("boxthislap:want-list", {
        detail: {
          emptyLabel: "No Want items.",
          items: [
            {
              archived: false,
              completed: false,
              deleted: false,
              draggable: true,
              expanded: false,
              id: "want-1",
              meta: ["Games"],
              name: "React Want card",
              orderLabel: "1",
              priceLabel: "$20.00",
            },
          ],
        },
      }),
    );

    expect(await screen.findByText("React To Do card")).not.toBeNull();
    expect(await screen.findByText("React Want card")).not.toBeNull();
    expect(
      screen.getByRole("button", { name: "Edit React To Do card" }),
    ).not.toBeNull();
    expect(
      screen.getByRole("button", { name: "Edit React Want card" }),
    ).not.toBeNull();
  });

  it("renders ranking bridge updates with React actions", async () => {
    renderWithTooltips(<RankingsPage />);
    window.dispatchEvent(
      new CustomEvent("boxthislap:ranking-list:games", {
        detail: {
          canAdd: true,
          emptyLabel: "No game rankings.",
          itemLabel: "game",
          loading: false,
          messages: [],
          rows: [
            {
              archived: false,
              canEdit: true,
              canExclude: true,
              draggable: true,
              excluded: false,
              exclusionLabel: "Exclude",
              guideLinks: [],
              id: "game-1",
              meta: ["2026"],
              movement: "+1",
              name: "React ranking card",
              rankLabel: "1",
            },
          ],
        },
      }),
    );

    expect(await screen.findByText("React ranking card")).not.toBeNull();
    expect(screen.getByText("+1")).not.toBeNull();
  });
});
// @vitest-environment jsdom
