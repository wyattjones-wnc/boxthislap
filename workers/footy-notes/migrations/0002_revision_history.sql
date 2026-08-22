ALTER TABLE footy_match_notes
ADD COLUMN revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0);

CREATE TABLE IF NOT EXISTS footy_match_note_history (
  match_id TEXT NOT NULL,
  revision INTEGER NOT NULL CHECK (revision > 0),
  home_score TEXT NOT NULL DEFAULT '',
  away_score TEXT NOT NULL DEFAULT '',
  follow_goal_assists TEXT NOT NULL DEFAULT '[]',
  opponent_goal_assists TEXT NOT NULL DEFAULT '[]',
  note TEXT NOT NULL DEFAULT '',
  highlight_link TEXT NOT NULL DEFAULT '',
  changed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  changed_by TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (match_id, revision)
) WITHOUT ROWID;

CREATE INDEX IF NOT EXISTS footy_match_note_history_changed_idx
ON footy_match_note_history(changed_at);
