// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { useState } from "react";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { TimePicker } from "./TimePicker";

// jsdom does not implement the native Popover API; browser tests cover its
// opening, dismissal, layout, and focus behavior.
const showDescriptor = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  "showPopover",
);
const hideDescriptor = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  "hidePopover",
);
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, "showPopover", {
    configurable: true,
    value(this: HTMLElement) {
      this.style.display = "block";
    },
  });
  Object.defineProperty(HTMLElement.prototype, "hidePopover", {
    configurable: true,
    value(this: HTMLElement) {
      this.style.display = "none";
    },
  });
});
afterAll(() => {
  if (showDescriptor)
    Object.defineProperty(HTMLElement.prototype, "showPopover", showDescriptor);
  else Reflect.deleteProperty(HTMLElement.prototype, "showPopover");
  if (hideDescriptor)
    Object.defineProperty(HTMLElement.prototype, "hidePopover", hideDescriptor);
  else Reflect.deleteProperty(HTMLElement.prototype, "hidePopover");
});

afterEach(cleanup);

function Form({ initial = "" }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <TimePicker value={value} onChange={setValue} />
      <output aria-label="Saved time">{value}</output>
    </>
  );
}

function choose(label: string, option: string) {
  fireEvent.click(
    within(screen.getByRole("listbox", { name: label })).getByRole("option", {
      name: option,
    }),
  );
}

describe("time scroll picker", () => {
  it("offers independent hour, quarter-hour minute, and period columns and saves HH:mm", () => {
    render(<Form />);
    fireEvent.click(screen.getByRole("button", { name: "Time: No time" }));
    expect(
      within(screen.getByRole("listbox", { name: "Minute" }))
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual(["00", "15", "30", "45"]);
    choose("Hour", "7");
    choose("Minute", "45");
    choose("AM/PM", "PM");
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(screen.getByLabelText("Saved time").textContent).toBe("19:45");
    expect(
      screen.getByRole("button", { name: "Time: 7:45 PM" }),
    ).not.toBeNull();
  });

  it("handles midnight, noon, clearing, and canceled edits", () => {
    render(<Form initial="00:15" />);
    fireEvent.click(screen.getByRole("button", { name: "Time: 12:15 AM" }));
    choose("AM/PM", "PM");
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(screen.getByLabelText("Saved time").textContent).toBe("12:15");
    fireEvent.click(screen.getByRole("button", { name: "Time: 12:15 PM" }));
    choose("Hour", "4");
    fireEvent.keyDown(screen.getByRole("listbox", { name: "Hour" }), {
      key: "Escape",
    });
    expect(screen.getByLabelText("Saved time").textContent).toBe("12:15");
    expect(screen.queryByRole("listbox")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Time: 12:15 PM" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(screen.getByLabelText("Saved time").textContent).toBe("");
  });

  it("supports keyboard selection and confirms the final visible scroll row immediately", () => {
    render(<Form initial="13:00" />);
    fireEvent.click(screen.getByRole("button", { name: "Time: 1:00 PM" }));
    fireEvent.keyDown(screen.getByRole("listbox", { name: "Hour" }), {
      key: "ArrowDown",
    });
    const minutes = screen.getByRole("listbox", { name: "Minute" });
    minutes.scrollTop = 88;
    fireEvent.scroll(minutes);
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(screen.getByLabelText("Saved time").textContent).toBe("14:30");
  });
});
