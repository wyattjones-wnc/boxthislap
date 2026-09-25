import * as Tooltip from "@radix-ui/react-tooltip";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  FootyPage,
  NextPage,
  RankingsPage,
  TodoPage,
  WantPage,
} from "./OperationalPages";
import {
  FootyCustomSchedulePage,
  FootyTeamPage,
} from "./FootyOperationalPages";

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
  it("keeps the Ranking heading actions grouped for consistent sizing", () => {
    renderWithTooltips(<RankingsPage />);

    const compareButton = screen.getByRole("button", { name: "Compare" });
    const filterButton = screen.getByRole("button", { name: "Show filters" });
    const actions = compareButton.closest(".heading-actions");

    expect(compareButton.classList.contains("ranking-compare-button")).toBe(
      true,
    );
    expect(actions?.contains(filterButton)).toBe(true);
  });

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

  it("keeps Custom Schedule navigation and filters clear", () => {
    renderWithTooltips(<FootyCustomSchedulePage />);

    expect(screen.getByRole("link", { name: "Footy" })).not.toBeNull();
    expect(screen.queryByText(/last only while this page is open/i)).toBeNull();
    expect(
      screen.queryByRole("button", { name: /custom schedule filters/i }),
    ).toBeNull();
    expect(document.querySelector("#footy-custom-filters")).not.toBeNull();
  });

  it("uses the icon library for the Footy team back link", () => {
    renderWithTooltips(<FootyTeamPage />);

    const backLink = screen.getByRole("link", { name: "Footy" });
    expect(backLink.querySelector(".lucide-chevron-left")).not.toBeNull();
  });

  it("renders To Do and Want list updates as React cards", async () => {
    renderWithTooltips(
      <>
        <TodoPage />
        <WantPage />
      </>,
    );

    expect(
      screen
        .getByRole("button", { name: "Show Want filters" })
        .parentElement?.classList.contains("heading-actions"),
    ).toBe(true);

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
            {
              children: [],
              deleted: false,
              draggable: true,
              expanded: false,
              guideLinks: [],
              hourLabel: "4 hours",
              id: "todo-2",
              meta: ["Movies"],
              name: "Second React To Do card",
              orderLabel: "2",
              started: false,
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

    const reordered = new Promise<CustomEvent<{ itemIds: string[] }>>(
      (resolve) =>
        window.addEventListener(
          "boxthislap:todo-reorder",
          (event) => resolve(event as CustomEvent<{ itemIds: string[] }>),
          { once: true },
        ),
    );
    fireEvent.keyDown(
      screen.getByRole("button", { name: "Reorder React To Do card" }),
      { key: "ArrowDown" },
    );
    expect((await reordered).detail.itemIds).toEqual(["todo-2", "todo-1"]);
    expect(
      screen
        .getAllByRole("heading", { level: 2 })
        .map((heading) => heading.textContent),
    ).toEqual([
      "Second React To Do card",
      "React To Do card",
      "React Want card",
    ]);
  });

  it("renders ranking bridge updates with React actions", async () => {
    renderWithTooltips(<RankingsPage />);
    expect(screen.getByRole("tab", { name: "TV" })).not.toBeNull();
    expect(screen.queryByRole("tab", { name: "Tv" })).toBeNull();
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
    expect(
      screen.queryByRole("button", { name: "Exclude React ranking card" }),
    ).toBeNull();
    expect(
      screen.getByRole("button", { name: "Edit React ranking card" }),
    ).not.toBeNull();
    expect(
      screen.getByRole("button", { name: "Archive React ranking card" }),
    ).not.toBeNull();
    expect(screen.queryByText("Exclude", { selector: "button" })).toBeNull();
  });
});
// @vitest-environment jsdom
