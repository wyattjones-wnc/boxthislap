// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppProviders } from "../../app/providers";
import { WorkoutFeature } from "./WorkoutFeature";

const today = (() => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
})();

const baseExercises = [
  "Push ups",
  "Squats",
  "Plank",
  "Lunges",
  "Burpees",
  "Mountain climbers",
].map((name, index) => ({
  checked: false,
  completionCount: null,
  id: `exercise-${index + 1}`,
  name,
  position: index + 1,
  videoUrl: index === 0 ? "https://example.com/push-ups" : "",
}));

beforeEach(() => {
  window.history.replaceState(null, "", "#workouts");
  localStorage.setItem(
    "boxThisLapManagerSession",
    JSON.stringify({ managerId: "8", isAdmin: false }),
  );
  window.boxThisLapGetManagerAccessToken = async () => "token";
  vi.stubGlobal(
    "ResizeObserver",
    class {
      disconnect() {}
      observe() {}
      unobserve() {}
    },
  );
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  delete window.boxThisLapGetManagerAccessToken;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Daily Workouts", () => {
  it("uses the four-part completion marker and matching chooser order", async () => {
    localStorage.setItem(
      "boxThisLapManagerSession",
      JSON.stringify({ managerId: "completion-marker-test", isAdmin: false }),
    );
    const response = (value: Record<string, unknown>) =>
      Promise.resolve({ ok: true, json: async () => ({ ok: true, ...value }) });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/me/workouts?month="))
          return response({
            days: [
              {
                cardioCompleted: true,
                completed: true,
                date: today,
                kettlebellCompleted: false,
              },
            ],
          });
        throw new Error(`Unexpected request: ${url}`);
      }) as unknown as typeof fetch,
    );

    render(
      <AppProviders>
        <WorkoutFeature />
      </AppProviders>,
    );

    const day = await screen.findByRole("button", {
      name: /completed: Cardio/,
    });
    const marker = day.querySelector('[aria-hidden="true"]');
    expect(marker?.children).toHaveLength(4);
    expect(
      marker?.querySelectorAll('[class*="segmentCompleted"]'),
    ).toHaveLength(1);

    fireEvent.click(day);
    const chooser = screen.getByRole("region", {
      name: "Choose workout type",
    });
    expect(
      within(chooser)
        .getAllByRole("button")
        .map((button) => button.querySelector("strong")?.textContent),
    ).toEqual(["Morning Stretch", "Kettlebell", "Cardio", "Knee"]);
  });

  it("lets an administrator add an exercise from the calendar page", async () => {
    localStorage.setItem(
      "boxThisLapManagerSession",
      JSON.stringify({
        isAdmin: true,
        manager: { isAdmin: true, name: "Wyatt" },
        managerId: "6",
      }),
    );
    const response = (value: Record<string, unknown>) =>
      Promise.resolve({ ok: true, json: async () => ({ ok: true, ...value }) });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/me/workouts?month="))
          return response({ days: [] });
        if (url.endsWith("/api/managers"))
          return response({
            managers: [{ displayName: "Wyatt", id: "6", name: "Wyatt" }],
          });
        throw new Error(`Unexpected request: ${url}`);
      }) as unknown as typeof fetch,
    );
    render(
      <AppProviders>
        <WorkoutFeature />
      </AppProviders>,
    );

    const addExercise = await screen.findByRole("button", {
      name: "Add exercise",
    });
    expect(
      addExercise.parentElement?.parentElement?.contains(
        screen.getByLabelText("Manager"),
      ),
    ).toBe(true);
    fireEvent.click(addExercise);
    expect(
      await screen.findByRole("heading", { name: "Add Exercise" }),
    ).not.toBeNull();
    expect(screen.getByLabelText("Name")).not.toBeNull();
    expect(screen.getByLabelText(/Video URL/)).not.toBeNull();
  });

  it("keeps a normal partial set in the final exercise totals", async () => {
    let exercises = baseExercises.map((exercise) => ({ ...exercise }));
    const response = (value: Record<string, unknown>) =>
      Promise.resolve({ ok: true, json: async () => ({ ok: true, ...value }) });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.includes("/api/me/workouts?month="))
          return response({ days: [] });
        if (url.endsWith(`/api/me/workouts/${today}/start`))
          return response({ workout: activeWorkout(exercises) });
        if (url.endsWith(`/api/me/workouts/${today}/action`)) {
          const body = JSON.parse(String(init?.body || "{}")) as {
            action: string;
            checked: boolean;
            position: number;
          };
          if (body.action === "timer-start")
            return response({
              workout: { ...activeWorkout(exercises), running: true },
            });
          exercises = exercises.map((exercise) =>
            exercise.position === body.position
              ? { ...exercise, checked: body.checked }
              : exercise,
          );
          return response({ workout: activeWorkout(exercises) });
        }
        if (url.endsWith(`/api/me/workouts/${today}/complete`))
          return response({
            workout: {
              ...activeWorkout(exercises),
              completedAt: "2026-09-25T12:00:00Z",
              exercises: exercises.map((exercise) => ({
                ...exercise,
                completionCount: exercise.checked ? 1 : 0,
              })),
            },
          });
        throw new Error(`Unexpected request: ${url}`);
      }) as unknown as typeof fetch,
    );
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(
      <AppProviders>
        <WorkoutFeature />
      </AppProviders>,
    );

    fireEvent.click(
      await screen.findByRole("button", { name: /start workout/i }),
    );
    fireEvent.click(await screen.findByRole("button", { name: /Kettlebell/ }));
    expect(
      await screen.findByRole("button", { name: /Mountain climbers/ }),
    ).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Add exercise" })).toBeNull();
    expect(screen.getByRole("link", { name: "Workout Types" })).not.toBeNull();
    expect(
      screen
        .getByRole("button", { name: "Exercise videos" })
        .closest('[aria-live="polite"]'),
    ).not.toBeNull();
    const start = screen.getByRole("button", { name: "Start" });
    expect(start.parentElement?.lastElementChild).toBe(start);
    fireEvent.click(
      screen.getByRole("button", { name: "More timer controls" }),
    );
    expect(screen.getByRole("button", { name: "Update" })).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Save time" })).toBeNull();
    fireEvent.click(start);
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Update" })).toBeNull(),
    );
    const pushUps = await screen.findByRole("button", { name: /Push ups/ });
    fireEvent.click(pushUps);
    await waitFor(() =>
      expect(pushUps.getAttribute("aria-pressed")).toBe("true"),
    );
    fireEvent.click(await screen.findByRole("button", { name: /Squats/ }));
    await waitFor(() =>
      expect(
        screen
          .getByRole("button", { name: /Squats/ })
          .getAttribute("aria-pressed"),
      ).toBe("true"),
    );
    fireEvent.click(screen.getByRole("button", { name: "Complete Workout" }));

    expect(
      await screen.findByRole("heading", { name: "Workout Complete" }),
    ).not.toBeNull();
    expect(window.confirm).toHaveBeenCalledOnce();
    const resultRows = document.querySelectorAll("ol li");
    expect(resultRows[0]?.textContent).toContain("Push ups1");
    expect(resultRows[1]?.textContent).toContain("Squats1");
    expect(resultRows[2]?.textContent).toContain("Plank0");
    await waitFor(() => expect(screen.getByText("Full sets")).not.toBeNull());
  });

  it("adds multiple walk and run entries and completes cardio", async () => {
    let cardio = {
      completedAt: null as string | null,
      date: today,
      entries: [] as Array<{ id: string; miles: number; type: string }>,
      started: true,
      totalMiles: 0,
    };
    const response = (value: Record<string, unknown>) =>
      Promise.resolve({ ok: true, json: async () => ({ ok: true, ...value }) });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (url.includes("/api/me/workouts?month="))
          return response({ days: [] });
        if (url.endsWith(`/api/me/workouts/${today}/cardio/start`))
          return response({ cardio });
        if (url.endsWith(`/api/me/workouts/${today}/cardio/entries`)) {
          const entry = JSON.parse(String(init?.body || "{}")) as {
            miles: number;
            type: string;
          };
          cardio = {
            ...cardio,
            entries: [
              ...cardio.entries,
              { ...entry, id: `entry-${cardio.entries.length + 1}` },
            ],
            totalMiles: cardio.totalMiles + entry.miles,
          };
          return response({ cardio });
        }
        if (
          url.endsWith(`/api/me/workouts/${today}/cardio/entries/entry-1`) &&
          init?.method === "PATCH"
        ) {
          const entry = JSON.parse(String(init.body));
          cardio = {
            ...cardio,
            entries: cardio.entries.map((value) =>
              value.id === "entry-1" ? { ...value, ...entry } : value,
            ),
          };
          cardio.totalMiles = cardio.entries.reduce(
            (total, value) => total + value.miles,
            0,
          );
          return response({ cardio });
        }
        if (url.endsWith(`/api/me/workouts/${today}/cardio/complete`)) {
          cardio = { ...cardio, completedAt: "2026-09-28T12:00:00Z" };
          return response({ cardio });
        }
        throw new Error(`Unexpected request: ${url}`);
      }) as unknown as typeof fetch,
    );

    render(
      <AppProviders>
        <WorkoutFeature />
      </AppProviders>,
    );

    fireEvent.click(
      await screen.findByRole("button", { name: /start workout/i }),
    );
    fireEvent.click(await screen.findByRole("button", { name: /Cardio/ }));
    await screen.findByText("Total mileage");

    fireEvent.change(screen.getByLabelText("Miles"), {
      target: { value: "1.25" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Add/ }));
    await screen.findByText("1.25 mi");

    fireEvent.change(screen.getByLabelText("Type"), {
      target: { value: "run" },
    });
    fireEvent.change(screen.getByLabelText("Miles"), {
      target: { value: "2.5" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Add/ }));
    await screen.findByText("2.5 mi");
    expect(
      screen.getByText("Total mileage").parentElement?.textContent,
    ).toContain("3.75");

    fireEvent.click(
      screen.getByRole("button", { name: "Edit walk of 1.25 miles" }),
    );
    expect((screen.getByLabelText("Miles") as HTMLInputElement).value).toBe(
      "1.25",
    );
    fireEvent.change(screen.getByLabelText("Miles"), {
      target: { value: "9" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByText("1.25 mi")).not.toBeNull();
    fireEvent.click(
      screen.getByRole("button", { name: "Edit walk of 1.25 miles" }),
    );
    fireEvent.change(screen.getByLabelText("Miles"), {
      target: { value: "2" },
    });
    fireEvent.change(screen.getByLabelText("Type"), {
      target: { value: "run" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await screen.findByText("2 mi");
    expect(
      screen.getByText("Total mileage").parentElement?.textContent,
    ).toContain("4.5");

    fireEvent.click(screen.getByRole("button", { name: "Complete Cardio" }));
    expect(await screen.findByText("Cardio complete")).not.toBeNull();
    expect(screen.queryByLabelText("Miles")).toBeNull();
    fireEvent.click(
      screen.getByRole("button", { name: "Edit run of 2 miles" }),
    );
    fireEvent.change(screen.getByLabelText("Miles"), {
      target: { value: "3" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await screen.findByText("3 mi");
    expect(
      screen.getByText("Cardio complete").parentElement?.textContent,
    ).toContain("5.5");
    expect(screen.queryByLabelText("Miles")).toBeNull();
  });
});

function activeWorkout(exercises: typeof baseExercises) {
  return {
    completedAt: null,
    date: today,
    elapsedSeconds: 0,
    exercises,
    remainingSeconds: 1200,
    running: false,
    sets: 0,
    timerDurationSeconds: 1200,
  };
}
