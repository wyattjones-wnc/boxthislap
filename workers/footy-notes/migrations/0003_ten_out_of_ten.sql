CREATE TABLE IF NOT EXISTS footy_ten_out_of_ten (
  id TEXT PRIMARY KEY,
  match_id TEXT NOT NULL DEFAULT '',
  player_name TEXT NOT NULL,
  home TEXT NOT NULL,
  away TEXT NOT NULL,
  match_date TEXT NOT NULL,
  match_time TEXT NOT NULL DEFAULT '',
  competition TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by TEXT NOT NULL DEFAULT ''
) WITHOUT ROWID;

CREATE INDEX IF NOT EXISTS footy_ten_out_of_ten_date_idx
ON footy_ten_out_of_ten(match_date DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS footy_ten_out_of_ten_match_idx
ON footy_ten_out_of_ten(match_id);
