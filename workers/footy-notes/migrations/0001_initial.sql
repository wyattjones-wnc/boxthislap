CREATE TABLE IF NOT EXISTS footy_match_notes (
  match_id TEXT PRIMARY KEY,
  home_score TEXT NOT NULL DEFAULT '',
  away_score TEXT NOT NULL DEFAULT '',
  follow_goal_assists TEXT NOT NULL DEFAULT '[]',
  opponent_goal_assists TEXT NOT NULL DEFAULT '[]',
  note TEXT NOT NULL DEFAULT '',
  highlight_link TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by TEXT NOT NULL DEFAULT ''
) WITHOUT ROWID;

CREATE INDEX IF NOT EXISTS footy_match_notes_updated_idx
ON footy_match_notes(updated_at);
