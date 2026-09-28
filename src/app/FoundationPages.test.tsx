// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { HelpPage, SiteFooter } from "./FoundationPages";

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

  it("explains and links to non-admin manager features", () => {
    render(<HelpPage />);

    expect(
      screen.getByRole("heading", { name: "How can we help?" }),
    ).not.toBeNull();
    expect(
      document
        .querySelector('[data-page-link="manager-hub"]')
        ?.getAttribute("href"),
    ).toBe("#manager-hub");
    expect(screen.getAllByText(/login required/i).length).toBeGreaterThan(0);
  });
});
