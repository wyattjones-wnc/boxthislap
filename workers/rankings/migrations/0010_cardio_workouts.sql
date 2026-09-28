CREATE TABLE IF NOT EXISTS manager_cardio_workouts (
  manager_id TEXT NOT NULL,
  workout_date TEXT NOT NULL,
  time_zone TEXT NOT NULL,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (manager_id, workout_date)
);

CREATE TABLE IF NOT EXISTS manager_cardio_entries (
  entry_id TEXT PRIMARY KEY,
  manager_id TEXT NOT NULL,
  workout_date TEXT NOT NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('walk', 'run')),
  miles REAL NOT NULL CHECK (miles > 0 AND miles <= 1000),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (manager_id, workout_date)
    REFERENCES manager_cardio_workouts (manager_id, workout_date)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS manager_cardio_entries_workout_idx
  ON manager_cardio_entries (manager_id, workout_date, created_at);

CREATE INDEX IF NOT EXISTS manager_cardio_workouts_completed_idx
  ON manager_cardio_workouts (manager_id, completed_at, workout_date);
