CREATE TABLE IF NOT EXISTS manager_followed_teams (
  manager_id TEXT NOT NULL,
  team_id TEXT NOT NULL,
  priority INTEGER NOT NULL CHECK (priority >= 1),
  notifications_enabled INTEGER NOT NULL DEFAULT 1 CHECK (notifications_enabled IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (manager_id, team_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_manager_followed_team_priority
  ON manager_followed_teams(manager_id, priority);
CREATE INDEX IF NOT EXISTS idx_manager_followed_team_team
  ON manager_followed_teams(team_id, manager_id);

CREATE TABLE IF NOT EXISTS manager_followed_team_revisions (
  manager_id TEXT PRIMARY KEY,
  revision INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS manager_followed_team_revision_claims (
  manager_id TEXT NOT NULL,
  revision INTEGER NOT NULL,
  claimed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (manager_id, revision)
);

-- Preserve the former global followed-team order on the owner's existing manager record.
INSERT OR IGNORE INTO manager_followed_teams (manager_id, team_id, priority) VALUES
  ('6', '1', 1),
  ('6', '2', 2),
  ('6', '3', 3),
  ('6', '4', 4),
  ('6', '5', 5),
  ('6', '6', 6),
  ('6', '7', 7);
INSERT OR IGNORE INTO manager_followed_team_revisions (manager_id, revision) VALUES ('6', 1);
