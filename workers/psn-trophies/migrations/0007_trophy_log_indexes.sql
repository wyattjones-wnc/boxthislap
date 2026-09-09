CREATE INDEX idx_trophies_log_date
  ON trophies(earned_at, game_id, trophy_id)
  WHERE earned = 1 AND earned_at IS NOT NULL;

CREATE INDEX idx_trophies_log_rarity
  ON trophies(earned_rate, earned_at DESC, game_id, trophy_id)
  WHERE earned = 1 AND earned_rate IS NOT NULL;

CREATE INDEX idx_trophies_log_name
  ON trophies(trophy_name COLLATE NOCASE, game_id, trophy_id)
  WHERE earned = 1 AND earned_at IS NOT NULL;
