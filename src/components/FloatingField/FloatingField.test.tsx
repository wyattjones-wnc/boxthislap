// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createRef, useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { FloatingField } from "./FloatingField";
import {
  enhanceLegacyFloatingFields,
  observeLegacyFloatingFields,
} from "./legacyFloatingFields";

afterEach(cleanup);

describe("shared floating fields", () => {
  it("uses plain-text captions once and preserves controls through rerenders", () => {
    const { rerender } = render(
      <FloatingField>
        Team
        <select aria-label="Team" defaultValue="all">
          <option value="all">All teams</option>
        </select>
      </FloatingField>,
    );
    const select = screen.getByRole("combobox", { name: "Team" });
    expect(select.closest("label")?.textContent).toBe("TeamAll teams");
    rerender(
      <FloatingField>
        Sort
        <select aria-label="Sort seen products" defaultValue="all">
          <option value="all">All products</option>
        </select>
      </FloatingField>,
    );
    expect(screen.getByRole("combobox", { name: "Sort seen products" })).toBe(
      select,
    );
    expect(select.closest("label")?.textContent).toBe("SortAll products");
  });

  it("moves plain-text legacy captions into a single floating label", () => {
    const root = document.createElement("div");
    root.innerHTML =
      '<label>Team<select aria-label="Choose team"><option>All teams</option></select></label><label>Notes<textarea></textarea></label>';
    const select = root.querySelector("select");
    enhanceLegacyFloatingFields(root);
    enhanceLegacyFloatingFields(root);
    expect(root.querySelector("select")).toBe(select);
    expect(select?.closest("label")?.textContent).toBe("TeamAll teams");
    expect(root.querySelector("textarea")?.closest("label")?.textContent).toBe(
      "Notes",
    );
    expect(root.querySelectorAll(".floating-label").length).toBe(2);
  });

  it("keeps the native control, ref, validation, and edits through rerenders", () => {
    const ref = createRef<HTMLInputElement>();
    function Form() {
      const [value, setValue] = useState("");
      return (
        <FloatingField>
          <span>Name</span>
          <input
            ref={ref}
            required
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
        </FloatingField>
      );
    }
    render(<Form />);
    const input = screen.getByRole("textbox", {
      name: "Name",
    }) as HTMLInputElement;
    expect(ref.current).toBe(input);
    expect(input.required).toBe(true);
    expect(input.checkValidity()).toBe(false);
    fireEvent.change(input, { target: { value: "Updated" } });
    expect(ref.current).toBe(input);
    expect(input.value).toBe("Updated");
    expect(input.checkValidity()).toBe(true);
  });

  it("suppresses placeholders that repeat the floating label", () => {
    render(
      <FloatingField>
        <span>Search</span>
        <input type="search" placeholder="Search" />
      </FloatingField>,
    );
    expect(
      screen
        .getByRole("searchbox", { name: "Search" })
        .getAttribute("placeholder"),
    ).toBe(" ");
    const root = document.createElement("div");
    root.innerHTML =
      '<label><span>Search</span><input type="search" placeholder="Search"></label>';
    enhanceLegacyFloatingFields(root);
    expect(root.querySelector("input")?.getAttribute("placeholder")).toBe(" ");
  });

  it("preserves hints and accessible names for unlabeled and date controls", () => {
    render(
      <>
        <FloatingField label="Image URL">
          <input type="url" placeholder="https://example.com/image.jpg" />
        </FloatingField>
        <FloatingField label="End date">
          <input type="date" />
        </FloatingField>
      </>,
    );
    expect(
      screen
        .getByRole("textbox", { name: "Image URL" })
        .getAttribute("placeholder"),
    ).toBe("https://example.com/image.jpg");
    expect(screen.getByLabelText("End date").getAttribute("type")).toBe("date");
  });

  it("preserves label IDs used by aria-labelledby", () => {
    render(
      <FloatingField>
        <span id="quantity-label" className="sr-only">
          Quantity
        </span>
        <input type="number" aria-labelledby="quantity-label" />
      </FloatingField>,
    );
    expect(screen.getByRole("spinbutton", { name: "Quantity" })).not.toBeNull();
    expect(
      document.querySelector("#quantity-label")?.classList.contains("sr-only"),
    ).toBe(false);
  });

  it("adapts legacy HTML without changing control identity or enhancing React fields twice", () => {
    render(
      <FloatingField>
        <span>React</span>
        <input />
      </FloatingField>,
    );
    const reactControl = screen.getByRole("textbox", { name: "React" });
    const legacy = document.createElement("div");
    legacy.innerHTML =
      '<label><span>Legacy</span><input required name="name"></label><select aria-label="Season"><option>2026</option></select><input type="checkbox" aria-label="Checked">';
    document.body.append(legacy);
    const input = legacy.querySelector("input");
    const select = legacy.querySelector("select");
    enhanceLegacyFloatingFields(document.body);
    enhanceLegacyFloatingFields(document.body);
    expect(legacy.querySelector("input")).toBe(input);
    expect(legacy.querySelector("select")).toBe(select);
    expect(legacy.querySelectorAll("[data-floating-field]").length).toBe(2);
    expect(screen.getByRole("textbox", { name: "React" })).toBe(reactControl);
    expect(
      reactControl.closest("label")?.querySelectorAll(".floating-label").length,
    ).toBe(1);
    expect(
      legacy
        .querySelector('input[type="checkbox"]')
        ?.closest("[data-floating-field]"),
    ).toBeNull();
    legacy.remove();
  });

  it("adapts fields added later by legacy renderers", async () => {
    const root = document.createElement("div");
    document.body.append(root);
    const stop = observeLegacyFloatingFields(root);
    root.innerHTML = "<label><span>Notes</span><textarea></textarea></label>";
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(
      root.querySelector("textarea")?.getAttribute("data-floating-control"),
    ).toBe("");
    expect(root.querySelectorAll(".floating-label").length).toBe(1);
    stop();
    root.remove();
  });
});
