import { workoutDateInTimeZone } from "./workout-date.js";

const MAX_ROUTINE_STEPS = 30;
const ROUTINE_CONFIGS = [
  {
    key: "morning",
    label: "Morning Stretch",
    routineTable: "morning_routine_steps",
    stepsTable: "manager_morning_steps",
    workoutsTable: "manager_morning_workouts",
  },
  {
    key: "knee",
    label: "Knee",
    routineTable: "knee_routine_steps",
    stepsTable: "manager_knee_steps",
    workoutsTable: "manager_knee_workouts",
  },
];
const MORNING_CONFIG = ROUTINE_CONFIGS[0];

export async function handleMorningRequest({
  authorizeAdmin,
  env,
  readBody,
  request,
  requireManager,
  url,
}) {
  for (const config of ROUTINE_CONFIGS) {
    const result = await handleRoutineRequest({
      authorizeAdmin,
      config,
      env,
      readBody,
      request,
      requireManager,
      url,
    });
    if (result) return result;
  }
  return null;
}

async function handleRoutineRequest({
  authorizeAdmin,
  config,
  env,
  readBody,
  request,
  requireManager,
  url,
}) {
  if (url.pathname === `/api/me/${config.key}-routine`) {
    const manager = await requireManager(request, env);
    if (request.method === "GET")
      return readEffectiveRoutine(env, manager.sub, config);
    if (request.method === "PUT") {
      await saveRoutine(
        env,
        "manager",
        manager.sub,
        await readBody(request),
        config,
      );
      return readEffectiveRoutine(env, manager.sub, config);
    }
    if (request.method === "DELETE") {
      if (isDefaultManager(env, manager.sub))
        throw httpError(
          400,
          "The default manager cannot restore another routine.",
        );
      await deleteRoutine(env, "manager", manager.sub, config);
      return readEffectiveRoutine(env, manager.sub, config);
    }
  }

  const ownMatch = url.pathname.match(
    new RegExp(
      `^/api/me/workouts/(\\d{4}-\\d{2}-\\d{2})/${config.key}(?:/(start|action))?$`,
    ),
  );
  if (ownMatch) {
    const manager = await requireManager(request, env);
    const date = parseWorkoutDate(ownMatch[1]);
    const operation = ownMatch[2] || "read";
    if (request.method === "GET" && operation === "read")
      return {
        [config.key]: await readMorningWorkout(env, manager.sub, date, config),
      };
    if (request.method === "POST" && operation === "start")
      return {
        [config.key]: await startMorningWorkout(
          env,
          manager.sub,
          date,
          (await readBody(request)).timeZone,
          config,
        ),
      };
    if (request.method === "POST" && operation === "action")
      return {
        [config.key]: await updateMorningWorkout(
          env,
          manager.sub,
          date,
          await readBody(request),
          config,
        ),
      };
  }

  const adminMatch = url.pathname.match(
    new RegExp(
      `^/api/admin/managers/([^/]+)/workouts/(\\d{4}-\\d{2}-\\d{2})/${config.key}$`,
    ),
  );
  if (adminMatch && request.method === "GET") {
    await authorizeAdmin();
    return {
      [config.key]: await readMorningWorkout(
        env,
        parseId(adminMatch[1], "manager ID"),
        parseWorkoutDate(adminMatch[2]),
        config,
      ),
    };
  }

  return null;
}

export function normalizeMorningRoutine(value, label = "Morning Stretch") {
  const values = Array.isArray(value?.steps) ? value.steps : [];
  if (!values.length || values.length > MAX_ROUTINE_STEPS)
    throw httpError(
      400,
      `A ${label} routine must contain 1 to ${MAX_ROUTINE_STEPS} steps.`,
    );
  const steps = values.map((value, index) => {
    const name = String(value?.name || "").trim();
    const type = String(value?.type || "").toLowerCase();
    if (!name || name.length > 100)
      throw httpError(
        400,
        "Each Morning Stretch step needs a name of 100 characters or fewer.",
      );
    if (!["timer", "count"].includes(type))
      throw httpError(400, "Morning Stretch steps must be timers or counts.");
    if (type === "timer") {
      const durationSeconds = Number(value?.durationSeconds);
      if (
        !Number.isInteger(durationSeconds) ||
        durationSeconds < 5 ||
        durationSeconds > 3600
      )
        throw httpError(
          400,
          "Timer steps must last between 5 and 3600 seconds.",
        );
      return {
        completionMode: null,
        durationSeconds,
        id: normalizeStepId(value?.id),
        name,
        position: index + 1,
        targetCount: null,
        type,
      };
    }
    const targetCount = Number(value?.targetCount);
    const completionMode = String(
      value?.completionMode || "toggle",
    ).toLowerCase();
    if (!Number.isInteger(targetCount) || targetCount < 1 || targetCount > 1000)
      throw httpError(
        400,
        "Count steps must require between 1 and 1000 repetitions.",
      );
    if (!["toggle", "tally"].includes(completionMode))
      throw httpError(400, "Count steps must use toggle or tally completion.");
    return {
      completionMode,
      durationSeconds: null,
      id: normalizeStepId(value?.id),
      name,
      position: index + 1,
      targetCount,
      type,
    };
  });
  if (new Set(steps.map((step) => step.id)).size !== steps.length)
    throw httpError(400, "Morning Stretch step IDs must be unique.");
  return steps;
}

export async function readEffectiveRoutine(
  env,
  managerId,
  config = MORNING_CONFIG,
) {
  const own = await readRoutine(env, "manager", managerId, config);
  const defaultManager = isDefaultManager(env, managerId);
  const hasOwnRoutine = own.steps.length > 0;
  return {
    hasOverride: !defaultManager && hasOwnRoutine,
    isDefaultManager: defaultManager,
    routine: hasOwnRoutine
      ? own
      : await readRoutine(env, "manager", defaultManagerId(env), config),
    source: hasOwnRoutine ? "manager" : "default-manager",
  };
}

function defaultManagerId(env) {
  return String(env.DEFAULT_MORNING_MANAGER_ID || "6");
}

function isDefaultManager(env, managerId) {
  return String(managerId) === defaultManagerId(env);
}

async function readRoutine(env, ownerType, ownerId, config) {
  const rows = await env.DB.prepare(
    `SELECT step_id, position, name, step_type, duration_seconds, target_count, completion_mode FROM ${config.routineTable} WHERE owner_type = ? AND owner_id = ? ORDER BY position`,
  )
    .bind(ownerType, ownerId)
    .all();
  return {
    steps: (rows.results || []).map((row) => ({
      completionMode: row.completion_mode || null,
      durationSeconds:
        row.duration_seconds == null ? null : Number(row.duration_seconds),
      id: String(row.step_id),
      name: String(row.name),
      position: Number(row.position),
      targetCount: row.target_count == null ? null : Number(row.target_count),
      type: String(row.step_type),
    })),
  };
}

async function saveRoutine(env, ownerType, ownerId, body, config) {
  const steps = normalizeMorningRoutine(body, config.label);
  await env.DB.batch([
    env.DB.prepare(
      `DELETE FROM ${config.routineTable} WHERE owner_type = ? AND owner_id = ?`,
    ).bind(ownerType, ownerId),
    ...steps.map((step) =>
      env.DB.prepare(
        `INSERT INTO ${config.routineTable} (owner_type, owner_id, position, step_id, name, step_type, duration_seconds, target_count, completion_mode) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        ownerType,
        ownerId,
        step.position,
        step.id,
        step.name,
        step.type,
        step.durationSeconds,
        step.targetCount,
        step.completionMode,
      ),
    ),
  ]);
  return {
    hasOverride: ownerType === "manager",
    routine: await readRoutine(env, ownerType, ownerId, config),
    source: ownerType,
  };
}

async function deleteRoutine(env, ownerType, ownerId, config) {
  await env.DB.prepare(
    `DELETE FROM ${config.routineTable} WHERE owner_type = ? AND owner_id = ?`,
  )
    .bind(ownerType, ownerId)
    .run();
}

export function morningSnapshotMatchesRoutine(snapshot, routine) {
  if (snapshot.length !== routine.length) return false;
  return snapshot.every((row, index) => {
    const step = routine[index];
    return (
      Number(row.position) === step.position &&
      String(row.step_id) === step.id &&
      String(row.name) === step.name &&
      String(row.step_type) === step.type &&
      (row.duration_seconds == null ? null : Number(row.duration_seconds)) ===
        step.durationSeconds &&
      (row.target_count == null ? null : Number(row.target_count)) ===
        step.targetCount &&
      (row.completion_mode || null) === step.completionMode
    );
  });
}

function insertMorningSteps(env, managerId, date, steps, config) {
  return steps.map((step) =>
    env.DB.prepare(
      `INSERT INTO ${config.stepsTable} (manager_id, workout_date, position, step_id, name, step_type, duration_seconds, target_count, completion_mode) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      managerId,
      date,
      step.position,
      step.id,
      step.name,
      step.type,
      step.durationSeconds,
      step.targetCount,
      step.completionMode,
    ),
  );
}

async function startMorningWorkout(env, managerId, date, timeZone, config) {
  const zone = String(timeZone || "").trim();
  if (workoutDateInTimeZone(zone) !== date)
    throw httpError(
      400,
      `That ${config.label} exercise day is no longer available.`,
    );
  const existing = await env.DB.prepare(
    `SELECT current_position, step_started_at, completed_at FROM ${config.workoutsTable} WHERE manager_id = ? AND workout_date = ?`,
  )
    .bind(managerId, date)
    .first();
  if (!existing) {
    const routine = (await readEffectiveRoutine(env, managerId, config))
      .routine;
    if (!routine.steps.length)
      throw httpError(409, `${config.label} has not been configured yet.`);
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO ${config.workoutsTable} (manager_id, workout_date, time_zone) VALUES (?, ?, ?)`,
      ).bind(managerId, date, zone),
      ...insertMorningSteps(env, managerId, date, routine.steps, config),
    ]);
  } else if (
    !existing.completed_at &&
    !existing.step_started_at &&
    Number(existing.current_position) === 1
  ) {
    const snapshot = await env.DB.prepare(
      `SELECT position, step_id, name, step_type, duration_seconds, target_count, completion_mode, completed_count, completed_at FROM ${config.stepsTable} WHERE manager_id = ? AND workout_date = ? ORDER BY position`,
    )
      .bind(managerId, date)
      .all();
    const rows = snapshot.results || [];
    const hasProgress = rows.some(
      (row) => row.completed_at || Number(row.completed_count || 0) > 0,
    );
    if (!hasProgress) {
      const routine = (await readEffectiveRoutine(env, managerId, config))
        .routine;
      if (!routine.steps.length)
        throw httpError(409, `${config.label} has not been configured yet.`);
      if (!morningSnapshotMatchesRoutine(rows, routine.steps)) {
        await env.DB.batch([
          env.DB.prepare(
            `DELETE FROM ${config.stepsTable} WHERE manager_id = ? AND workout_date = ?`,
          ).bind(managerId, date),
          env.DB.prepare(
            `UPDATE ${config.workoutsTable} SET time_zone = ?, current_position = 1, step_started_at = NULL, completed_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE manager_id = ? AND workout_date = ?`,
          ).bind(zone, managerId, date),
          ...insertMorningSteps(env, managerId, date, routine.steps, config),
        ]);
      }
    }
  }
  return readMorningWorkout(env, managerId, date, config);
}

async function readMorningWorkout(env, managerId, date, config) {
  await settleExpiredTimer(env, managerId, date, config);
  const workout = await env.DB.prepare(
    `SELECT current_position, step_started_at, completed_at FROM ${config.workoutsTable} WHERE manager_id = ? AND workout_date = ?`,
  )
    .bind(managerId, date)
    .first();
  if (!workout)
    return {
      completedAt: null,
      currentPosition: 1,
      date,
      started: false,
      steps: [],
    };
  const rows = await env.DB.prepare(
    `SELECT position, step_id, name, step_type, duration_seconds, target_count, completion_mode, completed_count, completed_at FROM ${config.stepsTable} WHERE manager_id = ? AND workout_date = ? ORDER BY position`,
  )
    .bind(managerId, date)
    .all();
  const currentPosition = Number(workout.current_position);
  const startedAt = workout.step_started_at
    ? parseSqliteTimestamp(workout.step_started_at)
    : null;
  return {
    completedAt: workout.completed_at || null,
    currentPosition,
    date,
    started: true,
    steps: (rows.results || []).map((row) => {
      const active = Number(row.position) === currentPosition;
      const durationSeconds =
        row.duration_seconds == null ? null : Number(row.duration_seconds);
      const running = Boolean(active && startedAt && !row.completed_at);
      return {
        active,
        completedAt: row.completed_at || null,
        completedCount: Number(row.completed_count || 0),
        completionMode: row.completion_mode || null,
        durationSeconds,
        id: String(row.step_id),
        name: String(row.name),
        position: Number(row.position),
        remainingSeconds:
          durationSeconds == null
            ? null
            : running
              ? Math.max(
                  0,
                  durationSeconds - Math.floor((Date.now() - startedAt) / 1000),
                )
              : durationSeconds,
        running,
        targetCount: row.target_count == null ? null : Number(row.target_count),
        type: String(row.step_type),
      };
    }),
  };
}

async function updateMorningWorkout(env, managerId, date, body, config) {
  const workout = await env.DB.prepare(
    `SELECT time_zone, current_position, step_started_at, completed_at FROM ${config.workoutsTable} WHERE manager_id = ? AND workout_date = ?`,
  )
    .bind(managerId, date)
    .first();
  if (!workout) throw httpError(404, `${config.label} routine was not found.`);
  if (workout.completed_at)
    throw httpError(409, `${config.label} is already complete.`);
  if (workoutDateInTimeZone(String(workout.time_zone || "")) !== date)
    throw httpError(409, "That exercise day closed at 3:00 a.m.");
  const position = Number(workout.current_position);
  const step = await env.DB.prepare(
    `SELECT step_id, step_type, duration_seconds, target_count, completion_mode, completed_count FROM ${config.stepsTable} WHERE manager_id = ? AND workout_date = ? AND position = ?`,
  )
    .bind(managerId, date, position)
    .first();
  if (!step) throw httpError(409, `${config.label} has no current step.`);
  const action = String(body?.action || "");
  if (
    action === "timer-finish" &&
    body?.stepId &&
    String(body.stepId) !== String(step.step_id)
  )
    return readMorningWorkout(env, managerId, date, config);
  if (action === "timer-start") {
    if (step.step_type !== "timer")
      throw httpError(409, "The current step is not a timer.");
    await env.DB.prepare(
      `UPDATE ${config.workoutsTable} SET step_started_at = COALESCE(step_started_at, CURRENT_TIMESTAMP), updated_at = CURRENT_TIMESTAMP WHERE manager_id = ? AND workout_date = ?`,
    )
      .bind(managerId, date)
      .run();
  } else if (action === "timer-finish") {
    if (step.step_type !== "timer" || !workout.step_started_at)
      throw httpError(409, "The current timer has not started.");
    const elapsed = Math.floor(
      (Date.now() - parseSqliteTimestamp(workout.step_started_at)) / 1000,
    );
    if (elapsed + 1 < Number(step.duration_seconds))
      throw httpError(409, "The current timer is still running.");
    await completeStep(env, managerId, date, position, 1, config);
  } else if (action === "complete-step") {
    if (step.step_type !== "count" || step.completion_mode !== "toggle")
      throw httpError(409, "The current step does not use toggle completion.");
    await completeStep(
      env,
      managerId,
      date,
      position,
      Number(step.target_count),
      config,
    );
  } else if (action === "increment") {
    if (step.step_type !== "count" || step.completion_mode !== "tally")
      throw httpError(409, "The current step does not use a tally.");
    const next = Math.min(
      Number(step.target_count),
      Number(step.completed_count || 0) + 1,
    );
    if (next >= Number(step.target_count))
      await completeStep(env, managerId, date, position, next, config);
    else
      await env.DB.prepare(
        `UPDATE ${config.stepsTable} SET completed_count = ? WHERE manager_id = ? AND workout_date = ? AND position = ?`,
      )
        .bind(next, managerId, date, position)
        .run();
  } else throw httpError(400, `${config.label} action is invalid.`);
  return readMorningWorkout(env, managerId, date, config);
}

async function settleExpiredTimer(env, managerId, date, config) {
  const row = await env.DB.prepare(
    `SELECT w.current_position, w.step_started_at, s.duration_seconds
     FROM ${config.workoutsTable} w
     JOIN ${config.stepsTable} s ON s.manager_id = w.manager_id AND s.workout_date = w.workout_date AND s.position = w.current_position
     WHERE w.manager_id = ? AND w.workout_date = ? AND w.completed_at IS NULL AND w.step_started_at IS NOT NULL AND s.step_type = 'timer'`,
  )
    .bind(managerId, date)
    .first();
  if (
    row &&
    Date.now() - parseSqliteTimestamp(row.step_started_at) >=
      Number(row.duration_seconds) * 1000
  )
    await completeStep(
      env,
      managerId,
      date,
      Number(row.current_position),
      1,
      config,
    );
}

async function completeStep(
  env,
  managerId,
  date,
  position,
  completedCount,
  config,
) {
  const next = await env.DB.prepare(
    `SELECT position FROM ${config.stepsTable} WHERE manager_id = ? AND workout_date = ? AND position > ? ORDER BY position LIMIT 1`,
  )
    .bind(managerId, date, position)
    .first();
  await env.DB.batch([
    env.DB.prepare(
      `UPDATE ${config.stepsTable} SET completed_count = ?, completed_at = CURRENT_TIMESTAMP WHERE manager_id = ? AND workout_date = ? AND position = ? AND completed_at IS NULL`,
    ).bind(completedCount, managerId, date, position),
    next
      ? env.DB.prepare(
          `UPDATE ${config.workoutsTable} SET current_position = ?, step_started_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE manager_id = ? AND workout_date = ?`,
        ).bind(Number(next.position), managerId, date)
      : env.DB.prepare(
          `UPDATE ${config.workoutsTable} SET current_position = ?, step_started_at = NULL, completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE manager_id = ? AND workout_date = ?`,
        ).bind(position + 1, managerId, date),
  ]);
}

function normalizeStepId(value) {
  const id = String(value || "").trim();
  return id && id.length <= 160 ? id : crypto.randomUUID();
}

function parseSqliteTimestamp(value) {
  const text = String(value || "");
  const parsed = Date.parse(
    text.includes("T") ? text : `${text.replace(" ", "T")}Z`,
  );
  return Number.isNaN(parsed) ? Date.now() : parsed;
}

function parseWorkoutDate(value) {
  const date = String(value || "");
  const parsed = new Date(`${date}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== date
  )
    throw httpError(400, "Workout date is invalid.");
  return date;
}

function parseId(value, label) {
  let decoded;
  try {
    decoded = decodeURIComponent(String(value || "")).trim();
  } catch {
    throw httpError(400, `Invalid ${label}.`);
  }
  if (
    !decoded ||
    decoded.length > 160 ||
    /[\/\u0000-\u001F\u007F]/.test(decoded)
  )
    throw httpError(400, `Invalid ${label}.`);
  return decoded;
}

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}
