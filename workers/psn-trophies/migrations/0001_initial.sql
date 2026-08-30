PRAGMA foreign_keys = ON;

CREATE TABLE profile (
  account_id TEXT PRIMARY KEY,
  online_id TEXT NOT NULL,
  avatar_url TEXT,
  trophy_level INTEGER,
  progress INTEGER,
  bronze_count INTEGER,
  silver_count INTEGER,
  gold_count INTEGER,
  platinum_count INTEGER,
  last_synced_at TEXT NOT NULL
);

CREATE TABLE games (
  id TEXT PRIMARY KEY,
  np_communication_id TEXT,
  title_name TEXT NOT NULL,
  platforms TEXT,
  icon_url TEXT,
  progress INTEGER,
  earned_bronze INTEGER,
  earned_silver INTEGER,
  earned_gold INTEGER,
  earned_platinum INTEGER,
  defined_bronze INTEGER,
  defined_silver INTEGER,
  defined_gold INTEGER,
  defined_platinum INTEGER,
  has_platinum INTEGER NOT NULL DEFAULT 0 CHECK (has_platinum IN (0, 1)),
  platinum_earned INTEGER NOT NULL DEFAULT 0 CHECK (platinum_earned IN (0, 1)),
  first_trophy_at TEXT,
  latest_trophy_at TEXT,
  platinum_earned_at TEXT,
  completion_100_at TEXT,
  is_100_percent INTEGER NOT NULL DEFAULT 0 CHECK (is_100_percent IN (0, 1)),
  source_updated_at TEXT,
  first_seen_at TEXT NOT NULL,
  last_synced_at TEXT NOT NULL
);

CREATE TABLE trophy_groups (
  game_id TEXT NOT NULL,
  group_id TEXT NOT NULL,
  group_name TEXT,
  icon_url TEXT,
  defined_bronze INTEGER,
  defined_silver INTEGER,
  defined_gold INTEGER,
  defined_platinum INTEGER,
  PRIMARY KEY (game_id, group_id),
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
) WITHOUT ROWID;

CREATE TABLE trophies (
  game_id TEXT NOT NULL,
  trophy_id INTEGER NOT NULL,
  trophy_group_id TEXT,
  trophy_name TEXT NOT NULL,
  trophy_description TEXT,
  trophy_type TEXT NOT NULL CHECK (trophy_type IN ('bronze', 'silver', 'gold', 'platinum')),
  icon_url TEXT,
  earned INTEGER NOT NULL DEFAULT 0 CHECK (earned IN (0, 1)),
  earned_at TEXT,
  rarity_class INTEGER,
  earned_rate REAL,
  progress INTEGER,
  first_seen_at TEXT NOT NULL,
  last_synced_at TEXT NOT NULL,
  PRIMARY KEY (game_id, trophy_id),
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
) WITHOUT ROWID;

CREATE TABLE sync_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  status TEXT NOT NULL CHECK (status IN ('running', 'success', 'partial', 'failed')),
  titles_seen INTEGER DEFAULT 0,
  titles_changed INTEGER DEFAULT 0,
  titles_added INTEGER DEFAULT 0,
  trophies_updated INTEGER DEFAULT 0,
  error_message TEXT
);

CREATE INDEX idx_games_platinum_at ON games(platinum_earned_at);
CREATE INDEX idx_games_latest_trophy ON games(latest_trophy_at);
CREATE INDEX idx_games_progress ON games(progress);
CREATE INDEX idx_trophies_earned_at ON trophies(earned_at);
CREATE INDEX idx_trophies_game_earned ON trophies(game_id, earned);
CREATE INDEX idx_trophies_rate ON trophies(earned_rate);
CREATE INDEX idx_trophies_type ON trophies(trophy_type);

