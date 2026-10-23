-- Replace trigger definitions only; no trophy backfill or index rebuild.
DROP TRIGGER trophies_number_after_insert;
CREATE TRIGGER trophies_number_after_insert
AFTER INSERT ON trophies
WHEN (NEW.earned = 1 AND NEW.earned_at IS NOT NULL AND
      (NEW.earned_number IS NULL OR (NEW.trophy_type = 'platinum' AND NEW.platinum_number IS NULL)))
  OR ((NEW.earned <> 1 OR NEW.earned_at IS NULL) AND
      (NEW.earned_number IS NOT NULL OR NEW.platinum_number IS NOT NULL))
  OR (NEW.trophy_type <> 'platinum' AND NEW.platinum_number IS NOT NULL)
BEGIN
  UPDATE trophies SET
    earned_number = CASE WHEN NEW.earned = 1 AND NEW.earned_at IS NOT NULL
      THEN COALESCE(earned_number, (SELECT COALESCE(MAX(earned_number), 0) + 1 FROM trophies)) ELSE NULL END,
    platinum_number = CASE WHEN NEW.earned = 1 AND NEW.earned_at IS NOT NULL AND NEW.trophy_type = 'platinum'
      THEN COALESCE(platinum_number, (SELECT COALESCE(MAX(platinum_number), 0) + 1 FROM trophies)) ELSE NULL END
  WHERE game_id = NEW.game_id AND trophy_id = NEW.trophy_id;

  INSERT INTO sync_state (key, value, updated_at)
  SELECT 'earned_number', CAST(COALESCE(MAX(earned_number), 0) AS TEXT), CURRENT_TIMESTAMP FROM trophies WHERE true
  ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;
  INSERT INTO sync_state (key, value, updated_at)
  SELECT 'platinum_number', CAST(COALESCE(MAX(platinum_number), 0) AS TEXT), CURRENT_TIMESTAMP FROM trophies WHERE true
  ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;
END;

-- Allocate from persisted rows inside the trophy statement's transaction.
DROP TRIGGER trophies_number_after_update;
CREATE TRIGGER trophies_number_after_update
AFTER UPDATE OF earned, earned_at, trophy_type ON trophies
WHEN (NEW.earned = 1 AND NEW.earned_at IS NOT NULL AND
      (NEW.earned_number IS NULL OR (NEW.trophy_type = 'platinum' AND NEW.platinum_number IS NULL)))
  OR ((NEW.earned <> 1 OR NEW.earned_at IS NULL) AND
      (NEW.earned_number IS NOT NULL OR NEW.platinum_number IS NOT NULL))
  OR (NEW.trophy_type <> 'platinum' AND NEW.platinum_number IS NOT NULL)
BEGIN
  UPDATE trophies SET
    earned_number = CASE WHEN NEW.earned = 1 AND NEW.earned_at IS NOT NULL
      THEN COALESCE(earned_number, (SELECT COALESCE(MAX(earned_number), 0) + 1 FROM trophies)) ELSE NULL END,
    platinum_number = CASE WHEN NEW.earned = 1 AND NEW.earned_at IS NOT NULL AND NEW.trophy_type = 'platinum'
      THEN COALESCE(platinum_number, (SELECT COALESCE(MAX(platinum_number), 0) + 1 FROM trophies)) ELSE NULL END
  WHERE game_id = NEW.game_id AND trophy_id = NEW.trophy_id;

  INSERT INTO sync_state (key, value, updated_at)
  SELECT 'earned_number', CAST(COALESCE(MAX(earned_number), 0) AS TEXT), CURRENT_TIMESTAMP FROM trophies WHERE true
  ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;
  INSERT INTO sync_state (key, value, updated_at)
  SELECT 'platinum_number', CAST(COALESCE(MAX(platinum_number), 0) AS TEXT), CURRENT_TIMESTAMP FROM trophies WHERE true
  ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;
END;
