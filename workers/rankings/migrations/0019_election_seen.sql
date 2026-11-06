CREATE TABLE IF NOT EXISTS election_seen (
  election_year INTEGER NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('AK', 'MS')),
  race_id TEXT NOT NULL,
  baseline_json TEXT NOT NULL,
  source_updated INTEGER NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (election_year, state, race_id)
);
