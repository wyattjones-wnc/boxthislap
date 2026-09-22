import * as Tooltip from "@radix-ui/react-tooltip";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  AdminHomePage,
  CollectiblesPage,
  TrophyLogPage,
  TrophyStatsPage,
  YouTubePage,
} from "./SpecialistPages";

afterEach(cleanup);

function renderPage(page: React.ReactNode) {
  return render(<Tooltip.Provider>{page}</Tooltip.Provider>);
}

describe("specialist React pages", () => {
  it("renders the admin home navigation and trophy targets", () => {
    const { container } = renderPage(<AdminHomePage />);

    expect(
      screen.getByRole("link", { name: "Open Trophy Log" }),
    ).not.toBeNull();
    expect(container.querySelector("#admin-platinums-grid")).not.toBeNull();
    expect(container.querySelector("#favorite-trophies-grid")).not.toBeNull();
  });

  it("preserves the lazy specialist controller mount points", () => {
    const { container } = renderPage(
      <>
        <TrophyStatsPage />
        <CollectiblesPage />
        <TrophyLogPage />
        <YouTubePage />
      </>,
    );

    [
      "trophy-stats-content",
      "collectibles-grid",
      "collectible-detail-content",
      "trophy-log-grid",
      "youtube-inbox-view",
    ].forEach((id) => expect(container.querySelector(`#${id}`)).not.toBeNull());
  });
});
// @vitest-environment jsdom
