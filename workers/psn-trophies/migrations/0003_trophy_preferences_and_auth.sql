CREATE TABLE trophy_preferences (
  game_id TEXT NOT NULL,
  trophy_id INTEGER NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('seen', 'favorite')),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by TEXT,
  PRIMARY KEY (game_id, trophy_id),
  FOREIGN KEY (game_id, trophy_id) REFERENCES trophies(game_id, trophy_id) ON DELETE CASCADE
) WITHOUT ROWID;

CREATE INDEX idx_trophy_preferences_state ON trophy_preferences(state, updated_at DESC);
CREATE INDEX idx_trophies_earned_type_date ON trophies(earned, trophy_type, earned_at DESC);

CREATE TABLE psn_auth (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  cipher_text TEXT NOT NULL,
  iv TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by TEXT
);
