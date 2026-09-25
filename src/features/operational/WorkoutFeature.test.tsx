// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
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
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  delete window.boxThisLapGetManagerAccessToken;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Daily Workouts", () => {
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
    vi.stubGlobal(
      "ResizeObserver",
      class {
        disconnect() {}
        observe() {}
        unobserve() {}
      },
    );

    render(
      <AppProviders>
        <WorkoutFeature />
      </AppProviders>,
    );

    fireEvent.click(
      await screen.findByRole("button", { name: "Add exercise" }),
    );
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
            checked: boolean;
            position: number;
          };
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
    expect(
      await screen.findByRole("button", { name: /Mountain climbers/ }),
    ).not.toBeNull();
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
