WITH earned AS (
  SELECT t.game_id, t.trophy_id,
    ROW_NUMBER() OVER (ORDER BY t.earned_at ASC, t.game_id ASC, t.trophy_id ASC) AS trophy_number
  FROM trophies t
  WHERE t.earned = 1 AND t.earned_at IS NOT NULL
)
INSERT INTO trophy_preferences (game_id, trophy_id, state, updated_at, updated_by)
SELECT game_id, trophy_id, 'favorite', CURRENT_TIMESTAMP, 'legacy-sheet'
FROM earned
WHERE trophy_number IN (11591, 11619)
ON CONFLICT(game_id, trophy_id) DO UPDATE SET state = 'favorite',
  updated_at = excluded.updated_at, updated_by = excluded.updated_by;
