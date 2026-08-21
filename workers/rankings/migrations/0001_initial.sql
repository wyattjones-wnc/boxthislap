CREATE TABLE IF NOT EXISTS ranking_items (
  manager_id TEXT NOT NULL,
  ranking_type TEXT NOT NULL CHECK (ranking_type IN ('games', 'movies', 'tv')),
  item_id TEXT NOT NULL,
  name TEXT NOT NULL,
  manual_rank INTEGER NOT NULL,
  archived INTEGER NOT NULL DEFAULT 0 CHECK (archived IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (manager_id, ranking_type, item_id)
);

CREATE TABLE IF NOT EXISTS ranking_manual_order (
  manager_id TEXT NOT NULL,
  ranking_type TEXT NOT NULL CHECK (ranking_type = 'mcu'),
  item_id TEXT NOT NULL,
  manual_rank INTEGER NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (manager_id, ranking_type, item_id)
);

CREATE TABLE IF NOT EXISTS ranking_revisions (
  manager_id TEXT NOT NULL,
  ranking_type TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (manager_id, ranking_type)
);

CREATE TABLE IF NOT EXISTS ranking_revision_claims (
  manager_id TEXT NOT NULL,
  ranking_type TEXT NOT NULL,
  revision INTEGER NOT NULL,
  claimed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (manager_id, ranking_type, revision)
);

CREATE TABLE IF NOT EXISTS ranking_elo (
  manager_id TEXT NOT NULL,
  ranking_type TEXT NOT NULL,
  item_id TEXT NOT NULL,
  rating INTEGER NOT NULL DEFAULT 1500,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  last_choice_id TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (manager_id, ranking_type, item_id)
);

CREATE TABLE IF NOT EXISTS ranking_choices (
  choice_id TEXT PRIMARY KEY,
  manager_id TEXT NOT NULL,
  ranking_type TEXT NOT NULL,
  item_a_id TEXT NOT NULL,
  item_b_id TEXT NOT NULL,
  winner_id TEXT NOT NULL,
  loser_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ranking_exclusions (
  manager_id TEXT NOT NULL,
  ranking_type TEXT NOT NULL,
  item_id TEXT NOT NULL,
  excluded INTEGER NOT NULL DEFAULT 0 CHECK (excluded IN (0, 1)),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (manager_id, ranking_type, item_id)
);

CREATE TABLE IF NOT EXISTS ranking_seeds (
  manager_id TEXT NOT NULL,
  ranking_type TEXT NOT NULL,
  item_id TEXT NOT NULL,
  seed_rank INTEGER NOT NULL DEFAULT 0,
  seed_rating INTEGER NOT NULL DEFAULT 1500,
  seeded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reason TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (manager_id, ranking_type, item_id)
);

CREATE TABLE IF NOT EXISTS ranking_snapshots (
  snapshot_id TEXT PRIMARY KEY,
  manager_id TEXT NOT NULL,
  ranking_type TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  label TEXT NOT NULL DEFAULT '',
  reason TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS ranking_snapshot_items (
  snapshot_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  item_name TEXT NOT NULL DEFAULT '',
  rank INTEGER NOT NULL,
  rating INTEGER NOT NULL DEFAULT 1500,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  games INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (snapshot_id, item_id),
  FOREIGN KEY (snapshot_id) REFERENCES ranking_snapshots(snapshot_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ranking_items_order_idx ON ranking_items(manager_id, ranking_type, archived, manual_rank);
CREATE INDEX IF NOT EXISTS ranking_choices_manager_idx ON ranking_choices(manager_id, ranking_type, created_at);
