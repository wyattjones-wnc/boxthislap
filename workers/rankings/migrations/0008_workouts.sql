CREATE TABLE IF NOT EXISTS workout_exercises (
  exercise_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  video_url TEXT NOT NULL DEFAULT '',
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workout_day_exercises (
  workout_date TEXT NOT NULL,
  position INTEGER NOT NULL CHECK (position BETWEEN 1 AND 5),
  exercise_id TEXT NOT NULL,
  exercise_name TEXT NOT NULL,
  video_url TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (workout_date, position),
  UNIQUE (workout_date, exercise_id)
);

CREATE TABLE IF NOT EXISTS manager_workouts (
  manager_id TEXT NOT NULL,
  workout_date TEXT NOT NULL,
  time_zone TEXT NOT NULL,
  timer_duration_seconds INTEGER NOT NULL DEFAULT 1200,
  elapsed_seconds INTEGER NOT NULL DEFAULT 0,
  timer_started_at TEXT,
  sets INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (manager_id, workout_date)
);

CREATE TABLE IF NOT EXISTS manager_workout_checks (
  manager_id TEXT NOT NULL,
  workout_date TEXT NOT NULL,
  position INTEGER NOT NULL CHECK (position BETWEEN 1 AND 5),
  checked INTEGER NOT NULL DEFAULT 0 CHECK (checked IN (0, 1)),
  completion_count INTEGER,
  PRIMARY KEY (manager_id, workout_date, position),
  FOREIGN KEY (manager_id, workout_date)
    REFERENCES manager_workouts (manager_id, workout_date)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS manager_workouts_completed_idx
  ON manager_workouts (manager_id, completed_at, workout_date);
