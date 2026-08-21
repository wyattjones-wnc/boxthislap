CREATE TABLE guide_progress (
  manager_id TEXT NOT NULL,
  guide_id TEXT NOT NULL,
  step_id TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (manager_id, guide_id, step_id)
) WITHOUT ROWID;
