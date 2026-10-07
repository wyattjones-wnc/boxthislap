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
