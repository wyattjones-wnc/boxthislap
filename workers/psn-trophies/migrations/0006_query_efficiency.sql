ALTER TABLE trophies ADD COLUMN earned_number INTEGER;
ALTER TABLE trophies ADD COLUMN platinum_number INTEGER;

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
  platinum_number = (SELECT platinum_number FROM ordered WHERE ordered.game_id = trophies.game_id AND ordered.trophy_id = trophies.trophy_id)
WHERE earned = 1 AND earned_at IS NOT NULL;

INSERT OR REPLACE INTO sync_state (key, value, updated_at)
SELECT 'earned_number', CAST(COALESCE(MAX(earned_number), 0) AS TEXT), CURRENT_TIMESTAMP FROM trophies;

INSERT OR REPLACE INTO sync_state (key, value, updated_at)
SELECT 'platinum_number', CAST(COALESCE(MAX(platinum_number), 0) AS TEXT), CURRENT_TIMESTAMP FROM trophies;
