DROP INDEX idx_trophies_log_rarity;

CREATE INDEX idx_trophies_log_rarity
  ON trophies(earned_rate, earned_at DESC, game_id, trophy_id)
  WHERE earned = 1 AND earned_at IS NOT NULL;
