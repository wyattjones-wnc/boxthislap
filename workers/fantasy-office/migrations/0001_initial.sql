CREATE TABLE IF NOT EXISTS fantasy_office_seasons (
  year INTEGER PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('planned', 'active', 'frozen', 'complete')),
  cutoff_at TEXT NOT NULL DEFAULT '',
  imported_from TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fantasy_office_movies (
  id TEXT PRIMARY KEY,
  year INTEGER NOT NULL,
  manager_name TEXT NOT NULL,
  draft_number TEXT NOT NULL,
  title TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  substitute INTEGER NOT NULL DEFAULT 0 CHECK (substitute IN (0, 1)),
  letterboxd_url TEXT NOT NULL DEFAULT '',
  rotten_tomatoes_url TEXT NOT NULL DEFAULT '',
  box_office_mojo_url TEXT NOT NULL DEFAULT '',
  box_office_mojo_release_id TEXT NOT NULL DEFAULT '',
  award_points REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (year, manager_name, draft_number),
  FOREIGN KEY (year) REFERENCES fantasy_office_seasons(year)
);

CREATE TABLE IF NOT EXISTS fantasy_office_metrics (
  movie_id TEXT NOT NULL,
  metric TEXT NOT NULL CHECK (metric IN ('domestic_gross', 'letterboxd_rating', 'tomatometer', 'number_one_weekends')),
  automatic_value REAL,
  manual_override REAL,
  frozen_value REAL,
  status TEXT NOT NULL DEFAULT 'not_available' CHECK (status IN ('healthy', 'not_available', 'warning', 'error', 'stale', 'disabled')),
  last_attempt_at TEXT NOT NULL DEFAULT '',
  last_success_at TEXT NOT NULL DEFAULT '',
  last_changed_at TEXT NOT NULL DEFAULT '',
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  source_url TEXT NOT NULL DEFAULT '',
  last_error_type TEXT NOT NULL DEFAULT '',
  last_error_message TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (movie_id, metric),
  FOREIGN KEY (movie_id) REFERENCES fantasy_office_movies(id)
);

CREATE TABLE IF NOT EXISTS fantasy_office_metric_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  movie_id TEXT NOT NULL,
  metric TEXT NOT NULL,
  value REAL NOT NULL,
  observed_at TEXT NOT NULL,
  source_url TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (movie_id) REFERENCES fantasy_office_movies(id)
);

CREATE TABLE IF NOT EXISTS fantasy_office_sync_runs (
  id TEXT PRIMARY KEY,
  started_at TEXT NOT NULL,
  completed_at TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'healthy', 'warning', 'failed')),
  attempted INTEGER NOT NULL DEFAULT 0,
  succeeded INTEGER NOT NULL DEFAULT 0,
  failed INTEGER NOT NULL DEFAULT 0,
  summary_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fantasy_office_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  year INTEGER NOT NULL,
  actor_manager_id TEXT NOT NULL,
  action TEXT NOT NULL,
  details_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_fantasy_office_movies_year ON fantasy_office_movies(year, manager_name, draft_number);
CREATE INDEX IF NOT EXISTS idx_fantasy_office_metrics_status ON fantasy_office_metrics(status, last_success_at);
CREATE INDEX IF NOT EXISTS idx_fantasy_office_history_movie ON fantasy_office_metric_history(movie_id, metric, observed_at);
CREATE INDEX IF NOT EXISTS idx_fantasy_office_runs_started ON fantasy_office_sync_runs(started_at);
