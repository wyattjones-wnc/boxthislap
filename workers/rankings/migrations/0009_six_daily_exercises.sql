CREATE TABLE workout_day_exercises_v2 (
  workout_date TEXT NOT NULL,
  position INTEGER NOT NULL CHECK (position BETWEEN 1 AND 6),
  exercise_id TEXT NOT NULL,
  exercise_name TEXT NOT NULL,
  video_url TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (workout_date, position),
  UNIQUE (workout_date, exercise_id)
);

INSERT INTO workout_day_exercises_v2
  (workout_date, position, exercise_id, exercise_name, video_url, created_at)
SELECT workout_date, position, exercise_id, exercise_name, video_url, created_at
FROM workout_day_exercises;

DROP TABLE workout_day_exercises;
ALTER TABLE workout_day_exercises_v2 RENAME TO workout_day_exercises;

CREATE TABLE manager_workout_checks_v2 (
  manager_id TEXT NOT NULL,
  workout_date TEXT NOT NULL,
  position INTEGER NOT NULL CHECK (position BETWEEN 1 AND 6),
  checked INTEGER NOT NULL DEFAULT 0 CHECK (checked IN (0, 1)),
  completion_count INTEGER,
  PRIMARY KEY (manager_id, workout_date, position),
  FOREIGN KEY (manager_id, workout_date)
    REFERENCES manager_workouts (manager_id, workout_date)
    ON DELETE CASCADE
);

INSERT INTO manager_workout_checks_v2
  (manager_id, workout_date, position, checked, completion_count)
SELECT manager_id, workout_date, position, checked, completion_count
FROM manager_workout_checks;

DROP TABLE manager_workout_checks;
ALTER TABLE manager_workout_checks_v2 RENAME TO manager_workout_checks;
