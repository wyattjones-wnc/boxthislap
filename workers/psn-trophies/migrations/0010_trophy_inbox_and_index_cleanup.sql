CREATE TABLE trophy_inbox (
  game_id TEXT NOT NULL,
  trophy_id INTEGER NOT NULL,
  earned_at TEXT NOT NULL,
  trophy_name TEXT NOT NULL,
  earned_rate REAL,
  PRIMARY KEY (game_id, trophy_id),
  FOREIGN KEY (game_id, trophy_id) REFERENCES trophies(game_id, trophy_id) ON DELETE CASCADE
) WITHOUT ROWID;

CREATE INDEX idx_trophy_inbox_newest
  ON trophy_inbox(earned_at DESC, game_id ASC, trophy_id ASC);

INSERT INTO trophy_inbox (game_id, trophy_id, earned_at, trophy_name, earned_rate)
SELECT t.game_id, t.trophy_id, t.earned_at, t.trophy_name, t.earned_rate
FROM trophies t
LEFT JOIN trophy_preferences p ON p.game_id = t.game_id AND p.trophy_id = t.trophy_id
WHERE t.earned = 1 AND t.earned_at IS NOT NULL AND p.state IS NULL;

CREATE TRIGGER trophies_add_to_inbox_after_insert
AFTER INSERT ON trophies
WHEN NEW.earned = 1 AND NEW.earned_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM trophy_preferences p
    WHERE p.game_id = NEW.game_id AND p.trophy_id = NEW.trophy_id
  )
BEGIN
  INSERT OR REPLACE INTO trophy_inbox (game_id, trophy_id, earned_at, trophy_name, earned_rate)
  VALUES (NEW.game_id, NEW.trophy_id, NEW.earned_at, NEW.trophy_name, NEW.earned_rate);
END;

CREATE TRIGGER trophies_refresh_inbox_after_update
AFTER UPDATE OF earned, earned_at, trophy_name, earned_rate ON trophies
WHEN NEW.earned = 1 AND NEW.earned_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM trophy_preferences p
    WHERE p.game_id = NEW.game_id AND p.trophy_id = NEW.trophy_id
  )
BEGIN
  INSERT OR REPLACE INTO trophy_inbox (game_id, trophy_id, earned_at, trophy_name, earned_rate)
  VALUES (NEW.game_id, NEW.trophy_id, NEW.earned_at, NEW.trophy_name, NEW.earned_rate);
END;

CREATE TRIGGER trophies_remove_from_inbox_after_update
AFTER UPDATE OF earned, earned_at ON trophies
WHEN NEW.earned <> 1 OR NEW.earned_at IS NULL
BEGIN
  DELETE FROM trophy_inbox WHERE game_id = NEW.game_id AND trophy_id = NEW.trophy_id;
END;

CREATE TRIGGER trophy_preferences_remove_from_inbox_after_insert
AFTER INSERT ON trophy_preferences
BEGIN
  DELETE FROM trophy_inbox WHERE game_id = NEW.game_id AND trophy_id = NEW.trophy_id;
END;

CREATE TRIGGER trophy_preferences_remove_from_inbox_after_update
AFTER UPDATE OF state ON trophy_preferences
BEGIN
  DELETE FROM trophy_inbox WHERE game_id = NEW.game_id AND trophy_id = NEW.trophy_id;
END;

CREATE TRIGGER trophy_preferences_restore_inbox_after_delete
AFTER DELETE ON trophy_preferences
BEGIN
  INSERT OR REPLACE INTO trophy_inbox (game_id, trophy_id, earned_at, trophy_name, earned_rate)
  SELECT t.game_id, t.trophy_id, t.earned_at, t.trophy_name, t.earned_rate
  FROM trophies t
  WHERE t.game_id = OLD.game_id AND t.trophy_id = OLD.trophy_id
    AND t.earned = 1 AND t.earned_at IS NOT NULL;
END;

DROP INDEX idx_games_platinum_at;
DROP INDEX idx_games_latest_trophy;
DROP INDEX idx_games_progress;
DROP INDEX idx_trophies_earned_at;
DROP INDEX idx_trophies_rate;
DROP INDEX idx_trophies_type;

PRAGMA optimize;
