export async function handleWorkoutRequest({
  env,
  readBody,
  readManagerCatalog,
  request,
  requireManager,
  url,
}) {
  const authorizeAdmin = async () => {
    const payload = await requireManager(request, env);
    const managers = await readManagerCatalog(env);
    const manager = managers.find(
      (entry) => String(entry.id) === String(payload.sub),
    );
    const names = [manager?.displayName, manager?.name]
      .filter(Boolean)
      .flatMap((value) => {
        const normalized = String(value)
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, " ")
          .trim();
        return [normalized, normalized.split(/\s+/)[0]];
      });
    if (!names.includes("wyatt"))
      throw httpError(403, "Administrator access is required.");
    return payload;
  };

  if (
    url.pathname === "/api/workouts/exercises" &&
    ["GET", "POST"].includes(request.method)
  ) {
    if (request.method === "GET") {
      await requireManager(request, env);
      return { exercises: await readWorkoutExercises(env) };
    }
    await authorizeAdmin();
    return { exercise: await addWorkoutExercise(env, await readBody(request)) };
  }

  const exerciseMatch = url.pathname.match(
    /^\/api\/workouts\/exercises\/([^/]+)$/,
  );
  if (exerciseMatch && request.method === "PATCH") {
    await authorizeAdmin();
    return {
      exercise: await updateWorkoutExercise(
        env,
        parseId(exerciseMatch[1], "exercise ID"),
        await readBody(request),
      ),
    };
  }

  if (url.pathname === "/api/me/workouts" && request.method === "GET") {
    const manager = await requireManager(request, env);
    return readWorkoutMonth(env, manager.sub, url.searchParams.get("month"));
  }

  if (url.pathname === "/api/me/workouts/stats" && request.method === "GET") {
    const manager = await requireManager(request, env);
    return { workouts: await readWorkoutHistory(env, manager.sub) };
  }

  const operationMatch = url.pathname.match(
    /^\/api\/me\/workouts\/(\d{4}-\d{2}-\d{2})\/(start|action|complete)$/,
  );
  if (operationMatch && request.method === "POST") {
    const manager = await requireManager(request, env);
    const date = parseWorkoutDate(operationMatch[1]);
    const body = await readBody(request);
    const workout =
      operationMatch[2] === "start"
        ? await startWorkout(env, manager.sub, date, body.timeZone)
        : operationMatch[2] === "action"
          ? await updateWorkout(env, manager.sub, date, body)
          : await completeWorkout(env, manager.sub, date);
    return { workout };
  }

  const ownReadMatch = url.pathname.match(
    /^\/api\/me\/workouts\/(\d{4}-\d{2}-\d{2})$/,
  );
  if (ownReadMatch && request.method === "GET") {
    const manager = await requireManager(request, env);
    return {
      workout: await readWorkout(
        env,
        manager.sub,
        parseWorkoutDate(ownReadMatch[1]),
      ),
    };
  }

  const adminMonthMatch = url.pathname.match(
    /^\/api\/admin\/managers\/([^/]+)\/workouts$/,
  );
  if (adminMonthMatch && request.method === "GET") {
    await authorizeAdmin();
    return readWorkoutMonth(
      env,
      parseId(adminMonthMatch[1], "manager ID"),
      url.searchParams.get("month"),
    );
  }

  const adminResultMatch = url.pathname.match(
    /^\/api\/admin\/managers\/([^/]+)\/workouts\/(\d{4}-\d{2}-\d{2})$/,
  );
  if (adminResultMatch && ["GET", "PATCH"].includes(request.method)) {
    await authorizeAdmin();
    const managerId = parseId(adminResultMatch[1], "manager ID");
    const date = parseWorkoutDate(adminResultMatch[2]);
    return {
      workout:
        request.method === "GET"
          ? await readWorkout(env, managerId, date)
          : await correctWorkoutResult(
              env,
              managerId,
              date,
              await readBody(request),
            ),
    };
  }

  return null;
}

async function readWorkoutExercises(env) {
  const rows = await env.DB.prepare(
    "SELECT exercise_id, name, video_url, is_active, created_at, updated_at FROM workout_exercises ORDER BY is_active DESC, name COLLATE NOCASE",
  ).all();
  return (rows.results || []).map(mapWorkoutExercise);
}

function mapWorkoutExercise(row) {
  return {
    active: Boolean(row.is_active),
    createdAt: String(row.created_at || ""),
    id: String(row.exercise_id || ""),
    name: String(row.name || ""),
    updatedAt: String(row.updated_at || ""),
    videoUrl: String(row.video_url || ""),
  };
}

export function normalizeWorkoutExercise(body) {
  const name = String(body?.name || "").trim();
  if (!name || name.length > 120)
    throw httpError(
      400,
      "Exercise name is required and must be 120 characters or fewer.",
    );
  const videoUrl = String(body?.videoUrl || "").trim();
  if (videoUrl) {
    let parsed;
    try {
      parsed = new URL(videoUrl);
    } catch {
      throw httpError(400, "Video URL must be a valid HTTP(S) URL.");
    }
    if (!["http:", "https:"].includes(parsed.protocol))
      throw httpError(400, "Video URL must be a valid HTTP(S) URL.");
  }
  return { active: body?.active !== false, name, videoUrl };
}

async function addWorkoutExercise(env, body) {
  const exercise = normalizeWorkoutExercise(body);
  if (
    await env.DB.prepare(
      "SELECT exercise_id FROM workout_exercises WHERE name = ? COLLATE NOCASE",
    )
      .bind(exercise.name)
      .first()
  )
    throw httpError(409, "An exercise with that name already exists.");
  const id = crypto.randomUUID();
  await env.DB.prepare(
    "INSERT INTO workout_exercises (exercise_id, name, video_url, is_active) VALUES (?, ?, ?, ?)",
  )
    .bind(id, exercise.name, exercise.videoUrl, exercise.active ? 1 : 0)
    .run();
  return mapWorkoutExercise(
    await env.DB.prepare(
      "SELECT exercise_id, name, video_url, is_active, created_at, updated_at FROM workout_exercises WHERE exercise_id = ?",
    )
      .bind(id)
      .first(),
  );
}

async function updateWorkoutExercise(env, id, body) {
  const current = await env.DB.prepare(
    "SELECT exercise_id, name, video_url, is_active FROM workout_exercises WHERE exercise_id = ?",
  )
    .bind(id)
    .first();
  if (!current) throw httpError(404, "Exercise was not found.");
  const exercise = normalizeWorkoutExercise({
    active: body?.active ?? Boolean(current.is_active),
    name: body?.name ?? current.name,
    videoUrl: body?.videoUrl ?? current.video_url,
  });
  if (Boolean(current.is_active) && !exercise.active) {
    const count = await env.DB.prepare(
      "SELECT COUNT(*) AS count FROM workout_exercises WHERE is_active = 1",
    ).first();
    if (Number(count?.count || 0) <= 5)
      throw httpError(409, "At least five exercises must remain active.");
  }
  if (
    await env.DB.prepare(
      "SELECT exercise_id FROM workout_exercises WHERE name = ? COLLATE NOCASE AND exercise_id <> ?",
    )
      .bind(exercise.name, id)
      .first()
  )
    throw httpError(409, "An exercise with that name already exists.");
  await env.DB.prepare(
    "UPDATE workout_exercises SET name = ?, video_url = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE exercise_id = ?",
  )
    .bind(exercise.name, exercise.videoUrl, exercise.active ? 1 : 0, id)
    .run();
  return mapWorkoutExercise(
    await env.DB.prepare(
      "SELECT exercise_id, name, video_url, is_active, created_at, updated_at FROM workout_exercises WHERE exercise_id = ?",
    )
      .bind(id)
      .first(),
  );
}

export function parseWorkoutDate(value) {
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

function parseWorkoutMonth(value) {
  const month = String(value || "");
  if (!/^\d{4}-\d{2}$/.test(month))
    throw httpError(400, "Workout month is invalid.");
  parseWorkoutDate(`${month}-01`);
  return month;
}

function dateInTimeZone(timeZone) {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      day: "2-digit",
      month: "2-digit",
      timeZone,
      year: "numeric",
    }).formatToParts(new Date());
    const get = (type) => parts.find((part) => part.type === type)?.value || "";
    return `${get("year")}-${get("month")}-${get("day")}`;
  } catch {
    throw httpError(400, "Device timezone is invalid.");
  }
}

async function ensureWorkoutAssignment(env, date) {
  const existing = await env.DB.prepare(
    "SELECT COUNT(*) AS count FROM workout_day_exercises WHERE workout_date = ?",
  )
    .bind(date)
    .first();
  if (Number(existing?.count || 0) === 0) {
    const active = await env.DB.prepare(
      "SELECT COUNT(*) AS count FROM workout_exercises WHERE is_active = 1",
    ).first();
    if (Number(active?.count || 0) < 5)
      throw httpError(
        409,
        "At least five active exercises are needed before a workout can start.",
      );
    await env.DB.prepare(
      `INSERT OR IGNORE INTO workout_day_exercises (workout_date, position, exercise_id, exercise_name, video_url)
      SELECT ?, ROW_NUMBER() OVER (ORDER BY RANDOM()), exercise_id, name, video_url
      FROM (SELECT exercise_id, name, video_url FROM workout_exercises WHERE is_active = 1 ORDER BY RANDOM() LIMIT 5)`,
    )
      .bind(date)
      .run();
  }
  const rows = await env.DB.prepare(
    "SELECT position, exercise_id, exercise_name, video_url FROM workout_day_exercises WHERE workout_date = ? ORDER BY position",
  )
    .bind(date)
    .all();
  if ((rows.results || []).length !== 5)
    throw new Error("Daily exercises could not be prepared.");
  return rows.results;
}

async function startWorkout(env, managerId, date, timeZone) {
  const zone = String(timeZone || "").trim();
  if (dateInTimeZone(zone) !== date)
    throw httpError(400, "Only today's workout can be started.");
  const exercises = await ensureWorkoutAssignment(env, date);
  await env.DB.batch([
    env.DB.prepare(
      "INSERT OR IGNORE INTO manager_workouts (manager_id, workout_date, time_zone) VALUES (?, ?, ?)",
    ).bind(managerId, date, zone),
    ...exercises.map((exercise) =>
      env.DB.prepare(
        "INSERT OR IGNORE INTO manager_workout_checks (manager_id, workout_date, position, checked) VALUES (?, ?, ?, 0)",
      ).bind(managerId, date, Number(exercise.position)),
    ),
  ]);
  return readWorkout(env, managerId, date);
}

export function workoutElapsed(row, now = Date.now()) {
  const saved = Math.max(0, Number(row.elapsed_seconds || 0));
  const running = row.timer_started_at
    ? Math.max(0, Math.floor((now - Date.parse(row.timer_started_at)) / 1000))
    : 0;
  return Math.min(Number(row.timer_duration_seconds || 1200), saved + running);
}

async function readWorkout(env, managerId, date) {
  const row = await env.DB.prepare(
    "SELECT * FROM manager_workouts WHERE manager_id = ? AND workout_date = ?",
  )
    .bind(managerId, date)
    .first();
  if (!row) throw httpError(404, "Workout was not found.");
  const exercises = await env.DB.prepare(
    `SELECT d.position, d.exercise_id, d.exercise_name, d.video_url, c.checked, c.completion_count
    FROM workout_day_exercises d JOIN manager_workout_checks c ON c.workout_date = d.workout_date AND c.position = d.position
    WHERE c.manager_id = ? AND d.workout_date = ? ORDER BY d.position`,
  )
    .bind(managerId, date)
    .all();
  const elapsed = workoutElapsed(row);
  return {
    completedAt: row.completed_at || null,
    date,
    elapsedSeconds: elapsed,
    exercises: (exercises.results || []).map((exercise) => ({
      checked: Boolean(exercise.checked),
      completionCount:
        exercise.completion_count == null
          ? null
          : Number(exercise.completion_count),
      id: String(exercise.exercise_id),
      name: String(exercise.exercise_name),
      position: Number(exercise.position),
      videoUrl: String(exercise.video_url || ""),
    })),
    remainingSeconds: Math.max(0, Number(row.timer_duration_seconds) - elapsed),
    running:
      Boolean(row.timer_started_at) &&
      elapsed < Number(row.timer_duration_seconds) &&
      !row.completed_at,
    sets: Number(row.sets || 0),
    timeZone: String(row.time_zone || ""),
    timerDurationSeconds: Number(row.timer_duration_seconds || 1200),
  };
}

async function updateWorkout(env, managerId, date, body) {
  const row = await env.DB.prepare(
    "SELECT * FROM manager_workouts WHERE manager_id = ? AND workout_date = ?",
  )
    .bind(managerId, date)
    .first();
  if (!row) throw httpError(404, "Workout was not found.");
  if (row.completed_at)
    throw httpError(409, "Completed workouts are read-only.");
  const action = String(body?.action || "");
  const elapsed = workoutElapsed(row);
  if (action === "timer-start") {
    if (elapsed < Number(row.timer_duration_seconds) && !row.timer_started_at)
      await env.DB.prepare(
        "UPDATE manager_workouts SET timer_started_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), updated_at = CURRENT_TIMESTAMP WHERE manager_id = ? AND workout_date = ?",
      )
        .bind(managerId, date)
        .run();
  } else if (action === "timer-pause") {
    await env.DB.prepare(
      "UPDATE manager_workouts SET elapsed_seconds = ?, timer_started_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE manager_id = ? AND workout_date = ?",
    )
      .bind(elapsed, managerId, date)
      .run();
  } else if (action === "timer-reset") {
    await env.DB.prepare(
      "UPDATE manager_workouts SET elapsed_seconds = 0, timer_started_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE manager_id = ? AND workout_date = ?",
    )
      .bind(managerId, date)
      .run();
  } else if (action === "timer-duration") {
    const seconds = Number(body.seconds);
    if (row.timer_started_at || Number(row.elapsed_seconds || 0) !== 0)
      throw httpError(409, "Reset the timer before changing its duration.");
    if (!Number.isInteger(seconds) || seconds < 60 || seconds > 10800)
      throw httpError(400, "Timer duration must be between 1 and 180 minutes.");
    await env.DB.prepare(
      "UPDATE manager_workouts SET timer_duration_seconds = ?, updated_at = CURRENT_TIMESTAMP WHERE manager_id = ? AND workout_date = ?",
    )
      .bind(seconds, managerId, date)
      .run();
  } else if (action === "toggle") {
    const position = Number(body.position);
    if (!Number.isInteger(position) || position < 1 || position > 5)
      throw httpError(400, "Exercise position is invalid.");
    await env.DB.prepare(
      "UPDATE manager_workout_checks SET checked = ? WHERE manager_id = ? AND workout_date = ? AND position = ?",
    )
      .bind(body.checked ? 1 : 0, managerId, date, position)
      .run();
    const checked = await env.DB.prepare(
      "SELECT COUNT(*) AS count FROM manager_workout_checks WHERE manager_id = ? AND workout_date = ? AND checked = 1",
    )
      .bind(managerId, date)
      .first();
    if (Number(checked?.count || 0) === 5)
      await env.DB.batch([
        env.DB.prepare(
          "UPDATE manager_workouts SET sets = sets + 1, updated_at = CURRENT_TIMESTAMP WHERE manager_id = ? AND workout_date = ?",
        ).bind(managerId, date),
        env.DB.prepare(
          "UPDATE manager_workout_checks SET checked = 0 WHERE manager_id = ? AND workout_date = ?",
        ).bind(managerId, date),
      ]);
  } else if (action === "adjust-sets") {
    const delta = Number(body.delta);
    if (![1, -1].includes(delta))
      throw httpError(400, "Set adjustment is invalid.");
    if (delta < 0 && Number(row.sets || 0) === 0)
      throw httpError(409, "Sets cannot be below zero.");
    await env.DB.prepare(
      "UPDATE manager_workouts SET sets = sets + ?, updated_at = CURRENT_TIMESTAMP WHERE manager_id = ? AND workout_date = ?",
    )
      .bind(delta, managerId, date)
      .run();
  } else throw httpError(400, "Workout action is invalid.");
  return readWorkout(env, managerId, date);
}

async function completeWorkout(env, managerId, date) {
  const row = await env.DB.prepare(
    "SELECT * FROM manager_workouts WHERE manager_id = ? AND workout_date = ?",
  )
    .bind(managerId, date)
    .first();
  if (!row) throw httpError(404, "Workout was not found.");
  if (row.completed_at) throw httpError(409, "Workout is already complete.");
  const elapsed = workoutElapsed(row);
  await env.DB.batch([
    env.DB.prepare(
      "UPDATE manager_workout_checks SET completion_count = ? + checked WHERE manager_id = ? AND workout_date = ?",
    ).bind(Number(row.sets || 0), managerId, date),
    env.DB.prepare(
      "UPDATE manager_workouts SET elapsed_seconds = ?, timer_started_at = NULL, completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE manager_id = ? AND workout_date = ?",
    ).bind(elapsed, managerId, date),
  ]);
  return readWorkout(env, managerId, date);
}

async function readWorkoutMonth(env, managerId, value) {
  const month = parseWorkoutMonth(value);
  const rows = await env.DB.prepare(
    "SELECT workout_date, completed_at FROM manager_workouts WHERE manager_id = ? AND workout_date >= ? AND workout_date < date(?, '+1 month') ORDER BY workout_date",
  )
    .bind(managerId, `${month}-01`, `${month}-01`)
    .all();
  return {
    days: (rows.results || []).map((row) => ({
      completed: Boolean(row.completed_at),
      date: String(row.workout_date),
    })),
    month,
  };
}

async function readWorkoutHistory(env, managerId) {
  const rows = await env.DB.prepare(
    "SELECT workout_date, elapsed_seconds, sets, completed_at FROM manager_workouts WHERE manager_id = ? AND completed_at IS NOT NULL ORDER BY workout_date",
  )
    .bind(managerId)
    .all();
  return (rows.results || []).map((row) => ({
    completedAt: String(row.completed_at),
    date: String(row.workout_date),
    elapsedSeconds: Number(row.elapsed_seconds || 0),
    sets: Number(row.sets || 0),
  }));
}

async function correctWorkoutResult(env, managerId, date, body) {
  const row = await env.DB.prepare(
    "SELECT completed_at FROM manager_workouts WHERE manager_id = ? AND workout_date = ?",
  )
    .bind(managerId, date)
    .first();
  if (!row?.completed_at)
    throw httpError(404, "Completed workout was not found.");
  const elapsed = Number(body?.elapsedSeconds);
  const sets = Number(body?.sets);
  const counts = Array.isArray(body?.completionCounts)
    ? body.completionCounts.map(Number)
    : [];
  if (
    !Number.isInteger(elapsed) ||
    elapsed < 0 ||
    elapsed > 10800 ||
    !Number.isInteger(sets) ||
    sets < 0 ||
    counts.length !== 5 ||
    counts.some(
      (count) =>
        !Number.isInteger(count) || (count !== sets && count !== sets + 1),
    )
  )
    throw httpError(400, "Corrected workout values are invalid.");
  await env.DB.batch([
    env.DB.prepare(
      "UPDATE manager_workouts SET elapsed_seconds = ?, sets = ?, updated_at = CURRENT_TIMESTAMP WHERE manager_id = ? AND workout_date = ?",
    ).bind(elapsed, sets, managerId, date),
    ...counts.map((count, index) =>
      env.DB.prepare(
        "UPDATE manager_workout_checks SET completion_count = ?, checked = 0 WHERE manager_id = ? AND workout_date = ? AND position = ?",
      ).bind(count, managerId, date, index + 1),
    ),
  ]);
  return readWorkout(env, managerId, date);
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
