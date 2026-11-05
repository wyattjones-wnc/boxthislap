// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RaceResults, type Candidate } from "./RaceResults";

const key = "test-election-baseline";
const candidate = (id: string, votes: number): Candidate => ({
  id,
  first: id,
  last: "Candidate",
  party: "Test",
  votes,
  percent: 0.5,
});
const props = {
  caption: "Alaska Senate vote totals",
  storageKey: key,
  isAdmin: true,
  sourceUpdated: 1000,
  canMarkSeen: true,
};
const row = (name: string) =>
  within(screen.getByRole("rowheader", { name }).closest("tr")!);
beforeEach(() => {
  localStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("race comparisons", () => {
  it("sums every vote, orders candidates and saves a persistent timestamped baseline", () => {
    const candidates = [
      candidate("B", 80),
      candidate("A", 100),
      { ...candidate("other", 5), first: "", last: "Other" },
    ];
    const view = render(<RaceResults {...props} candidates={candidates} />);
    expect(row("Total votes").getByText("185")).toBeTruthy();
    expect(screen.getByText("20 votes")).toBeTruthy();
    expect(screen.getByText(/A Candidate leads B Candidate/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Mark .* seen/ }));
    const stored = JSON.parse(localStorage.getItem(key)!);
    expect(stored.total).toBe(185);
    expect(stored.gap).toBe(20);
    expect(Date.parse(stored.markedAt)).toBeGreaterThan(0);
    expect(
      screen.getByText(/Comparing against results marked seen/),
    ).toBeTruthy();
    view.unmount();
    render(
      <RaceResults
        {...props}
        sourceUpdated={2000}
        candidates={[
          candidate("B", 90),
          candidate("A", 130),
          { ...candidate("other", 5), first: "", last: "Other" },
        ]}
      />,
    );
    expect(row("A Candidate Test").getByText("+30 since seen")).toBeTruthy();
    expect(row("B Candidate Test").getByText("+10 since seen")).toBeTruthy();
    expect(row("Total votes").getByText("+40 since seen")).toBeTruthy();
    expect(screen.getByText("+20 votes since seen")).toBeTruthy();
    expect(JSON.parse(localStorage.getItem(key)!).markedAt).toBe(
      stored.markedAt,
    );
  });
  it("handles corrections, a change of leader and re-marking seen", () => {
    const view = render(
      <RaceResults
        {...props}
        candidates={[candidate("A", 100), candidate("B", 90)]}
      />,
    );
    fireEvent.click(screen.getByRole("button"));
    view.rerender(
      <RaceResults
        {...props}
        sourceUpdated={2000}
        candidates={[candidate("A", 98), candidate("B", 105)]}
      />,
    );
    expect(row("A Candidate Test").getByText("−2 since seen")).toBeTruthy();
    expect(screen.getByText(/B Candidate leads A Candidate/)).toBeTruthy();
    expect(screen.getByText("−3 votes since seen")).toBeTruthy();
    fireEvent.click(screen.getByRole("button"));
    expect(row("Total votes").getByText("0 since seen")).toBeTruthy();
    expect(screen.getByText("0 votes since seen")).toBeTruthy();
  });
  it("does not offer non-admins a seen action and handles missing/invalid baselines", () => {
    localStorage.setItem(key, "bad json");
    render(
      <RaceResults
        {...props}
        isAdmin={false}
        candidates={[candidate("A", 100)]}
      />,
    );
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText(/No seen baseline/)).toBeTruthy();
    expect(screen.getByText(/Top-two gap unavailable/)).toBeTruthy();
  });
  it("reports storage failures without pretending results were saved", () => {
    const view = render(
      <RaceResults {...props} candidates={[candidate("A", 100)]} />,
    );
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage unavailable");
    });
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("alert").textContent).toContain("Could not save");
    expect(screen.queryByText("Seen baseline saved.")).toBeNull();
    view.rerender(
      <RaceResults
        {...props}
        canMarkSeen={false}
        candidates={[candidate("A", 100)]}
      />,
    );
    expect((screen.getByRole("button") as HTMLButtonElement).disabled).toBe(
      true,
    );
  });
  it("does not compare older cached results against a newer baseline", () => {
    const view = render(
      <RaceResults
        {...props}
        sourceUpdated={2000}
        candidates={[candidate("A", 100), candidate("B", 90)]}
      />,
    );
    fireEvent.click(screen.getByRole("button"));
    view.rerender(
      <RaceResults
        {...props}
        candidates={[candidate("A", 70), candidate("B", 60)]}
      />,
    );
    expect(screen.getByText(/older than your seen baseline/)).toBeTruthy();
    expect(screen.queryByText("−30 since seen")).toBeNull();
  });
});
