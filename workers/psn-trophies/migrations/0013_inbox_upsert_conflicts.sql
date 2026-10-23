-- Explicit UPSERT clauses survive the outer trophy UPSERT conflict policy.
-- Replace only trigger definitions; existing trophies and preferences stay intact.

DROP TRIGGER trophies_add_to_inbox_after_insert;
CREATE TRIGGER trophies_add_to_inbox_after_insert
AFTER INSERT ON trophies
WHEN NEW.earned = 1 AND NEW.earned_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM trophy_preferences p
    WHERE p.game_id = NEW.game_id AND p.trophy_id = NEW.trophy_id
  )
BEGIN
  INSERT INTO trophy_inbox (game_id, trophy_id, earned_at, trophy_name, earned_rate)
  VALUES (NEW.game_id, NEW.trophy_id, NEW.earned_at, NEW.trophy_name, NEW.earned_rate)
  ON CONFLICT(game_id, trophy_id) DO UPDATE SET
    earned_at = excluded.earned_at,
    trophy_name = excluded.trophy_name,
    earned_rate = excluded.earned_rate;
END;

DROP TRIGGER trophies_refresh_inbox_after_update;
CREATE TRIGGER trophies_refresh_inbox_after_update
AFTER UPDATE OF earned, earned_at, trophy_name, earned_rate ON trophies
WHEN NEW.earned = 1 AND NEW.earned_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM trophy_preferences p
    WHERE p.game_id = NEW.game_id AND p.trophy_id = NEW.trophy_id
  )
BEGIN
  INSERT INTO trophy_inbox (game_id, trophy_id, earned_at, trophy_name, earned_rate)
  VALUES (NEW.game_id, NEW.trophy_id, NEW.earned_at, NEW.trophy_name, NEW.earned_rate)
  ON CONFLICT(game_id, trophy_id) DO UPDATE SET
    earned_at = excluded.earned_at,
    trophy_name = excluded.trophy_name,
    earned_rate = excluded.earned_rate;
END;

DROP TRIGGER trophy_preferences_restore_inbox_after_delete;
CREATE TRIGGER trophy_preferences_restore_inbox_after_delete
AFTER DELETE ON trophy_preferences
BEGIN
  INSERT INTO trophy_inbox (game_id, trophy_id, earned_at, trophy_name, earned_rate)
  SELECT t.game_id, t.trophy_id, t.earned_at, t.trophy_name, t.earned_rate
  FROM trophies t
  WHERE t.game_id = OLD.game_id AND t.trophy_id = OLD.trophy_id
    AND t.earned = 1 AND t.earned_at IS NOT NULL
  ON CONFLICT(game_id, trophy_id) DO UPDATE SET
    earned_at = excluded.earned_at,
    trophy_name = excluded.trophy_name,
    earned_rate = excluded.earned_rate;
END;
