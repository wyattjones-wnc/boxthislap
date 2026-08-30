CREATE TABLE IF NOT EXISTS footy_seen_matches (
  id TEXT PRIMARY KEY,
  match_id TEXT NOT NULL DEFAULT '',
  home TEXT NOT NULL,
  away TEXT NOT NULL,
  match_date TEXT NOT NULL,
  match_time TEXT NOT NULL DEFAULT '',
  competition TEXT NOT NULL DEFAULT '',
  venue TEXT NOT NULL DEFAULT '',
  sports_bar INTEGER NOT NULL DEFAULT 0 CHECK (sports_bar IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by TEXT NOT NULL DEFAULT ''
) WITHOUT ROWID;

CREATE UNIQUE INDEX IF NOT EXISTS footy_seen_matches_match_idx
ON footy_seen_matches(match_id)
WHERE match_id <> '';

CREATE INDEX IF NOT EXISTS footy_seen_matches_date_idx
ON footy_seen_matches(match_date DESC, match_time DESC, created_at DESC);

