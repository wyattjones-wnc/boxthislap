// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SiteFooter } from "./FoundationPages";
import HelpPage from "./HelpPage";

afterEach(cleanup);

describe("help experience", () => {
  it("links the footer question mark to the help page", () => {
    render(<SiteFooter />);

    expect(
      screen
        .getByRole("link", {
          name: "Help and frequently asked questions",
        })
        .getAttribute("href"),
    ).toBe("#help");
  });

  it("opens specific instructions for manager features", () => {
    render(<HelpPage />);

    expect(screen.getByRole("heading", { name: "Site Guide" })).not.toBeNull();
    expect(screen.queryByText("Site guide")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Manager Hub/ }));
    expect(
      screen.getByText(/select your name in the upper-right corner/i),
    ).not.toBeNull();
    expect(
      screen
        .getByRole("link", { name: "Open Manager Hub" })
        .getAttribute("href"),
    ).toBe("#manager-hub");
    expect(
      document.documentElement.classList.contains("has-contained-dialog"),
    ).toBe(true);
    const dialog = screen.getByRole("dialog", { name: "Manager Hub" });
    const boundaryScroll = new WheelEvent("wheel", {
      bubbles: true,
      cancelable: true,
      deltaY: -1,
    });
    expect(dialog.dispatchEvent(boundaryScroll)).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Close Manager Hub" }));
    expect(
      document.documentElement.classList.contains("has-contained-dialog"),
    ).toBe(false);
  });

  it("documents all three Home Screen widgets", () => {
    render(<HelpPage />);
    fireEvent.click(
      screen.getByRole("button", { name: /Home Screen Widgets/ }),
    );
    expect(
      screen.getByRole("heading", { name: "Footy widget" }),
    ).not.toBeNull();
    expect(
      screen.getByRole("heading", { name: "Formula 1 widget" }),
    ).not.toBeNull();
    expect(screen.getByRole("heading", { name: "Next widget" })).not.toBeNull();
  });
});
