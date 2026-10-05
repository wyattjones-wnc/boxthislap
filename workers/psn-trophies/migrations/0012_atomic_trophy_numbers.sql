-- Repair gaps left by preallocated counters using the original chronological order.
WITH ordered AS MATERIALIZED (
  SELECT
    game_id,
    trophy_id,
    ROW_NUMBER() OVER (ORDER BY earned_at ASC, game_id ASC, trophy_id ASC) AS earned_number,
    CASE WHEN trophy_type = 'platinum' THEN
      SUM(CASE WHEN trophy_type = 'platinum' THEN 1 ELSE 0 END) OVER (
        ORDER BY earned_at ASC, game_id ASC, trophy_id ASC ROWS UNBOUNDED PRECEDING
      )
    END AS platinum_number
  FROM trophies
  WHERE earned = 1 AND earned_at IS NOT NULL
)
UPDATE trophies
SET
  earned_number = (SELECT earned_number FROM ordered WHERE ordered.game_id = trophies.game_id AND ordered.trophy_id = trophies.trophy_id),
  platinum_number = (SELECT platinum_number FROM ordered WHERE ordered.game_id = trophies.game_id AND ordered.trophy_id = trophies.trophy_id);

INSERT OR REPLACE INTO sync_state (key, value, updated_at)
SELECT 'earned_number', CAST(COALESCE(MAX(earned_number), 0) AS TEXT), CURRENT_TIMESTAMP FROM trophies;

INSERT OR REPLACE INTO sync_state (key, value, updated_at)
SELECT 'platinum_number', CAST(COALESCE(MAX(platinum_number), 0) AS TEXT), CURRENT_TIMESTAMP FROM trophies;

CREATE INDEX idx_trophies_earned_number ON trophies(earned_number);
CREATE INDEX idx_trophies_platinum_number ON trophies(platinum_number);

-- Allocate from persisted rows inside the trophy statement's transaction.
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

  INSERT OR REPLACE INTO sync_state (key, value, updated_at)
  SELECT 'earned_number', CAST(COALESCE(MAX(earned_number), 0) AS TEXT), CURRENT_TIMESTAMP FROM trophies;
  INSERT OR REPLACE INTO sync_state (key, value, updated_at)
  SELECT 'platinum_number', CAST(COALESCE(MAX(platinum_number), 0) AS TEXT), CURRENT_TIMESTAMP FROM trophies;
END;

-- Allocate from persisted rows inside the trophy statement's transaction.
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

  INSERT OR REPLACE INTO sync_state (key, value, updated_at)
  SELECT 'earned_number', CAST(COALESCE(MAX(earned_number), 0) AS TEXT), CURRENT_TIMESTAMP FROM trophies;
  INSERT OR REPLACE INTO sync_state (key, value, updated_at)
  SELECT 'platinum_number', CAST(COALESCE(MAX(platinum_number), 0) AS TEXT), CURRENT_TIMESTAMP FROM trophies;
END;
