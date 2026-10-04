CREATE TABLE IF NOT EXISTS morning_routine_steps (
  owner_type TEXT NOT NULL CHECK (owner_type IN ('default', 'manager')),
  owner_id TEXT NOT NULL,
  position INTEGER NOT NULL CHECK (position > 0),
  step_id TEXT NOT NULL,
  name TEXT NOT NULL,
  step_type TEXT NOT NULL CHECK (step_type IN ('timer', 'count')),
  duration_seconds INTEGER CHECK (duration_seconds IS NULL OR duration_seconds BETWEEN 5 AND 3600),
  target_count INTEGER CHECK (target_count IS NULL OR target_count BETWEEN 1 AND 1000),
  completion_mode TEXT CHECK (completion_mode IS NULL OR completion_mode IN ('toggle', 'tally')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (owner_type, owner_id, position),
  UNIQUE (owner_type, owner_id, step_id)
);

CREATE TABLE IF NOT EXISTS manager_morning_workouts (
  manager_id TEXT NOT NULL,
  workout_date TEXT NOT NULL,
  time_zone TEXT NOT NULL,
  current_position INTEGER NOT NULL DEFAULT 1,
  step_started_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (manager_id, workout_date)
);

CREATE TABLE IF NOT EXISTS manager_morning_steps (
  manager_id TEXT NOT NULL,
  workout_date TEXT NOT NULL,
  position INTEGER NOT NULL,
  step_id TEXT NOT NULL,
  name TEXT NOT NULL,
  step_type TEXT NOT NULL CHECK (step_type IN ('timer', 'count')),
  duration_seconds INTEGER,
  target_count INTEGER,
  completion_mode TEXT,
  completed_count INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  PRIMARY KEY (manager_id, workout_date, position),
  FOREIGN KEY (manager_id, workout_date)
    REFERENCES manager_morning_workouts (manager_id, workout_date)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS morning_routine_steps_owner_idx
  ON morning_routine_steps (owner_type, owner_id, position);

CREATE INDEX IF NOT EXISTS manager_morning_workouts_completed_idx
  ON manager_morning_workouts (manager_id, completed_at, workout_date);
