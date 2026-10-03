import assert from "node:assert/strict";
import test from "node:test";
import {
  handleWorkoutRequest,
  normalizeCardioEntry,
  normalizeWorkoutExercise,
  parseWorkoutDate,
  workoutElapsed,
} from "../src/workouts.js";

test("cardio entries accept walks and runs with bounded mileage", () => {
  assert.deepEqual(normalizeCardioEntry({ miles: 1.2345, type: "WALK" }), {
    miles: 1.235,
    type: "walk",
  });
  assert.throws(
    () => normalizeCardioEntry({ miles: 0, type: "run" }),
    /Mileage/,
  );
  assert.throws(
    () => normalizeCardioEntry({ miles: 1, type: "bike" }),
    /walk or run/,
  );
});

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
    url: new URL("https://example.com/api/me/workouts/2026-09-25/complete"),
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

for (const completedAt of [null, "2026-09-25T12:00:00Z"]) {
  test(`cardio edits update own entry and totals (${completedAt ? "completed" : "active"})`, async () => {
    let entry = { entry_id: "entry-1", activity_type: "walk", miles: 1 };
    const date = "2026-09-25";
    const env = {
      DB: {
        prepare: (sql) => ({
          bind: (...values) => ({
            first: async () => ({ completed_at: completedAt }),
            all: async () => ({ results: [entry] }),
            run: async () => {
              assert.match(sql, /UPDATE manager_cardio_entries/);
              assert.deepEqual(values, ["run", 2.5, "entry-1", "8", date]);
              assert.match(
                sql,
                /WHERE entry_id = \? AND manager_id = \? AND workout_date = \?/,
              );
              entry = { ...entry, activity_type: values[0], miles: values[1] };
              return { meta: { changes: 1 } };
            },
          }),
        }),
      },
    };
    const url = new URL(
      `https://example.com/api/me/workouts/${date}/cardio/entries/entry-1`,
    );
    const result = await handleWorkoutRequest({
      env,
      readBody: async () => ({ type: "run", miles: 2.5 }),
      request: new Request(url, { method: "PATCH" }),
      requireManager: async () => ({ sub: "8" }),
      url,
    });
    assert.deepEqual(result.cardio.entries, [
      { id: "entry-1", type: "run", miles: 2.5 },
    ]);
    assert.equal(result.cardio.totalMiles, 2.5);
    assert.equal(result.cardio.completedAt, completedAt);
  });
}

test("cardio edits reject missing or other managers' entries", async () => {
  const url = new URL(
    "https://example.com/api/me/workouts/2026-09-25/cardio/entries/missing",
  );
  await assert.rejects(
    handleWorkoutRequest({
      env: {
        DB: {
          prepare: () => ({
            bind: () => ({ run: async () => ({ meta: { changes: 0 } }) }),
          }),
        },
      },
      readBody: async () => ({ type: "walk", miles: 1 }),
      request: new Request(url, { method: "PATCH" }),
      requireManager: async () => ({ sub: "8" }),
      url,
    }),
    /Cardio entry was not found/,
  );
});
