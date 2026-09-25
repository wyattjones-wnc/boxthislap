import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeWorkoutExercise,
  parseWorkoutDate,
  workoutElapsed,
} from "../src/workouts.js";

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
