CREATE TABLE IF NOT EXISTS f1_seasons (
  year INTEGER PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('planned', 'active', 'complete')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS f1_rounds (
  year INTEGER NOT NULL,
  round INTEGER NOT NULL,
  name TEXT NOT NULL,
  race_date TEXT NOT NULL DEFAULT '',
  deadline_at TEXT NOT NULL DEFAULT '',
  has_sprint INTEGER NOT NULL DEFAULT 0 CHECK (has_sprint IN (0, 1)),
  driver_of_the_day TEXT NOT NULL DEFAULT '',
  fastest_pit_time TEXT NOT NULL DEFAULT '',
  fastest_pit_team TEXT NOT NULL DEFAULT '',
  dnf_count TEXT NOT NULL DEFAULT '',
  safety_car TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (year, round)
);

CREATE TABLE IF NOT EXISTS f1_drivers (
  year INTEGER NOT NULL,
  driver_id TEXT NOT NULL,
  permanent_number TEXT NOT NULL DEFAULT '',
  code TEXT NOT NULL DEFAULT '',
  given_name TEXT NOT NULL DEFAULT '',
  family_name TEXT NOT NULL DEFAULT '',
  display_name TEXT NOT NULL,
  constructor_id TEXT NOT NULL DEFAULT '',
  constructor_name TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (year, driver_id)
);

CREATE TABLE IF NOT EXISTS f1_sessions (
  year INTEGER NOT NULL,
  round INTEGER NOT NULL,
  session_type TEXT NOT NULL CHECK (session_type IN ('qualifying', 'sprint', 'race')),
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'draft', 'needs_review', 'approved')),
  source TEXT NOT NULL DEFAULT '',
  source_url TEXT NOT NULL DEFAULT '',
  fetched_at TEXT NOT NULL DEFAULT '',
  approved_at TEXT NOT NULL DEFAULT '',
  approved_by TEXT NOT NULL DEFAULT '',
  revision INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (year, round, session_type),
  FOREIGN KEY (year, round) REFERENCES f1_rounds(year, round)
);

CREATE TABLE IF NOT EXISTS f1_session_results (
  year INTEGER NOT NULL,
  round INTEGER NOT NULL,
  session_type TEXT NOT NULL,
  driver_id TEXT NOT NULL,
  position INTEGER,
  classified_position TEXT NOT NULL DEFAULT '',
  grid INTEGER,
  points REAL NOT NULL DEFAULT 0,
  laps INTEGER,
  status TEXT NOT NULL DEFAULT '',
  q1 TEXT NOT NULL DEFAULT '',
  q2 TEXT NOT NULL DEFAULT '',
  q3 TEXT NOT NULL DEFAULT '',
  time_text TEXT NOT NULL DEFAULT '',
  fastest_lap_rank INTEGER,
  raw_json TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (year, round, session_type, driver_id),
  FOREIGN KEY (year, round, session_type) REFERENCES f1_sessions(year, round, session_type)
);

CREATE TABLE IF NOT EXISTS f1_weekly_entries (
  year INTEGER NOT NULL,
  round INTEGER NOT NULL,
  manager_id TEXT NOT NULL,
  p1_driver_id TEXT NOT NULL DEFAULT '',
  p2_driver_id TEXT NOT NULL DEFAULT '',
  p3_driver_id TEXT NOT NULL DEFAULT '',
  wildcard_driver_id TEXT NOT NULL DEFAULT '',
  entry_status TEXT NOT NULL DEFAULT 'draft' CHECK (entry_status IN ('draft', 'submitted')),
  submitted_at TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (year, round, manager_id),
  FOREIGN KEY (year, round) REFERENCES f1_rounds(year, round)
);

CREATE TABLE IF NOT EXISTS f1_weekly_scores (
  year INTEGER NOT NULL,
  round INTEGER NOT NULL,
  manager_id TEXT NOT NULL,
  p1_points REAL NOT NULL DEFAULT 0,
  p2_points REAL NOT NULL DEFAULT 0,
  p3_points REAL NOT NULL DEFAULT 0,
  wildcard_qualifying_points REAL NOT NULL DEFAULT 0,
  wildcard_race_points REAL NOT NULL DEFAULT 0,
  total_points REAL NOT NULL DEFAULT 0,
  details_json TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (year, round, manager_id)
);

CREATE TABLE IF NOT EXISTS f1_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  year INTEGER NOT NULL,
  round INTEGER,
  actor_manager_id TEXT NOT NULL,
  action TEXT NOT NULL,
  details_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_f1_sessions_status ON f1_sessions(year, status, round);
CREATE INDEX IF NOT EXISTS idx_f1_results_session ON f1_session_results(year, round, session_type, position);
CREATE INDEX IF NOT EXISTS idx_f1_weekly_manager ON f1_weekly_entries(year, manager_id, round);
CREATE INDEX IF NOT EXISTS idx_f1_audit_round ON f1_audit_log(year, round, created_at);
