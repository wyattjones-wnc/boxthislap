CREATE TABLE featured_platinums (
  game_id TEXT NOT NULL,
  trophy_id INTEGER NOT NULL,
  featured_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  featured_by TEXT,
  PRIMARY KEY (game_id, trophy_id),
  FOREIGN KEY (game_id, trophy_id) REFERENCES trophies(game_id, trophy_id) ON DELETE CASCADE
) WITHOUT ROWID;

CREATE TRIGGER featured_platinums_limit
BEFORE INSERT ON featured_platinums
WHEN (SELECT COUNT(*) FROM featured_platinums) >= 3
BEGIN
  SELECT RAISE(ABORT, 'featured_platinums_limit');
END;
