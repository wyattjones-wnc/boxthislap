CREATE TABLE IF NOT EXISTS manager_match_notifications (
  manager_id TEXT NOT NULL,
  match_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (manager_id, match_id)
);

CREATE INDEX IF NOT EXISTS idx_manager_match_notifications_match
  ON manager_match_notifications(match_id, manager_id);
