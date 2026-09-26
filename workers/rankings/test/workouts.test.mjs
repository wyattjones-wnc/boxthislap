import assert from "node:assert/strict";
import test from "node:test";
import {
  handleWorkoutRequest,
  normalizeWorkoutExercise,
  parseWorkoutDate,
  workoutElapsed,
} from "../src/workouts.js";

test("completing a workout does not require a JSON request body", async () => {
  let readBodyCalled = false;
  const workoutRow = {
    completed_at: null,
    elapsed_seconds: 300,
    sets: 2,
    time_zone: "America/New_York",
    timer_duration_seconds: 1200,
    timer_started_at: null,
  };
  const env = {
    DB: {
      batch: async () => {
        workoutRow.completed_at = "2026-09-25T12:05:00Z";
        return [];
      },
      prepare: (sql) => ({
        bind: () => ({
          all: async () => ({ results: [] }),
          first: async () =>
            sql.includes("FROM manager_workouts") ? workoutRow : null,
          run: async () => ({}),
        }),
      }),
    },
  };

  const result = await handleWorkoutRequest({
    env,
    readBody: async () => {
      readBodyCalled = true;
      throw new Error("body should not be read");
    },
    readManagerCatalog: async () => [],
    request: new Request(
      "https://example.com/api/me/workouts/2026-09-25/complete",
      { method: "POST" },
    ),
    requireManager: async () => ({ sub: "8" }),
    url: new URL(
      "https://example.com/api/me/workouts/2026-09-25/complete",
    ),
  });

  assert.equal(readBodyCalled, false);
  assert.equal(result.workout.completedAt, "2026-09-25T12:05:00Z");
  assert.equal(result.workout.sets, 2);
});

test("workout exercise input trims fields and accepts an optional video", () => {
  assert.deepEqual(
    normalizeWorkoutExercise({
      active: false,
      name: "  Push ups  ",
      videoUrl: "",
    }),
    { active: false, name: "Push ups", videoUrl: "" },
  );
  assert.throws(
    () =>
      normalizeWorkoutExercise({
        name: "Push ups",
        videoUrl: "javascript:alert(1)",
      }),
    /HTTP\(S\)/,
  );
});

test("workout dates reject invalid calendar values", () => {
  assert.equal(parseWorkoutDate("2026-09-25"), "2026-09-25");
  assert.throws(() => parseWorkoutDate("2026-02-30"), /invalid/i);
});

test("running workout elapsed time excludes pauses and clamps at duration", () => {
  const now = Date.parse("2026-09-25T12:10:00Z");
  assert.equal(
    workoutElapsed(
      {
        elapsed_seconds: 120,
        timer_duration_seconds: 1200,
        timer_started_at: "2026-09-25T12:05:00Z",
      },
      now,
    ),
    420,
  );
  assert.equal(
    workoutElapsed(
      {
        elapsed_seconds: 1190,
        timer_duration_seconds: 1200,
        timer_started_at: "2026-09-25T12:00:00Z",
      },
      now,
    ),
    1200,
  );
});
