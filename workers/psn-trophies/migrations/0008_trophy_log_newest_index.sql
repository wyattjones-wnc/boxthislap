CREATE INDEX idx_trophies_log_date_desc
  ON trophies(earned_at DESC, game_id ASC, trophy_id ASC)
  WHERE earned = 1 AND earned_at IS NOT NULL;
