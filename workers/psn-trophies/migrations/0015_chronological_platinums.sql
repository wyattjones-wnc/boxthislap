-- Keep platinum ordinals chronological across out-of-order game imports.
-- Only the small indexed set of numbered platinums is ranked; write mismatches.
-- Earned-trophy ordinals and preferences are unchanged.
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

  UPDATE trophies SET platinum_number = ordered.number
  FROM (
    SELECT game_id, trophy_id,
      ROW_NUMBER() OVER (ORDER BY earned_at, game_id, trophy_id) AS number
    FROM trophies INDEXED BY idx_trophies_platinum_number
    WHERE platinum_number > 0 AND NEW.trophy_type = 'platinum'
  ) AS ordered
  WHERE trophies.game_id = ordered.game_id AND trophies.trophy_id = ordered.trophy_id
    AND trophies.platinum_number IS NOT ordered.number;

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
  OR ((OLD.platinum_number IS NOT NULL OR NEW.trophy_type = 'platinum') AND
      (OLD.earned IS NOT NEW.earned OR OLD.earned_at IS NOT NEW.earned_at
       OR OLD.trophy_type IS NOT NEW.trophy_type))
BEGIN
  UPDATE trophies SET
    earned_number = CASE WHEN NEW.earned = 1 AND NEW.earned_at IS NOT NULL
      THEN COALESCE(earned_number, (SELECT COALESCE(MAX(earned_number), 0) + 1 FROM trophies)) ELSE NULL END,
    platinum_number = CASE WHEN NEW.earned = 1 AND NEW.earned_at IS NOT NULL AND NEW.trophy_type = 'platinum'
      THEN COALESCE(platinum_number, (SELECT COALESCE(MAX(platinum_number), 0) + 1 FROM trophies)) ELSE NULL END
  WHERE game_id = NEW.game_id AND trophy_id = NEW.trophy_id;

  UPDATE trophies SET platinum_number = ordered.number
  FROM (
    SELECT game_id, trophy_id,
      ROW_NUMBER() OVER (ORDER BY earned_at, game_id, trophy_id) AS number
    FROM trophies INDEXED BY idx_trophies_platinum_number
    WHERE platinum_number > 0
      AND (NEW.trophy_type = 'platinum' OR OLD.platinum_number IS NOT NULL)
  ) AS ordered
  WHERE trophies.game_id = ordered.game_id AND trophies.trophy_id = ordered.trophy_id
    AND trophies.platinum_number IS NOT ordered.number;

  INSERT INTO sync_state (key, value, updated_at)
  SELECT 'earned_number', CAST(COALESCE(MAX(earned_number), 0) AS TEXT), CURRENT_TIMESTAMP FROM trophies WHERE true
  ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;
  INSERT INTO sync_state (key, value, updated_at)
  SELECT 'platinum_number', CAST(COALESCE(MAX(platinum_number), 0) AS TEXT), CURRENT_TIMESTAMP FROM trophies WHERE true
  ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;
END;

-- Repair recent out-of-order imports using the same chronological rule.
UPDATE trophies SET platinum_number = ordered.number
  FROM (
    SELECT game_id, trophy_id,
      ROW_NUMBER() OVER (ORDER BY earned_at, game_id, trophy_id) AS number
    FROM trophies INDEXED BY idx_trophies_platinum_number
    WHERE platinum_number > 0
  ) AS ordered
  WHERE trophies.game_id = ordered.game_id AND trophies.trophy_id = ordered.trophy_id
    AND trophies.platinum_number IS NOT ordered.number;
