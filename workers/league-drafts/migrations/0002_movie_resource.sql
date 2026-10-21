-- One catalog/job row per environment and season; no existing league data is rewritten.
CREATE TABLE IF NOT EXISTS league_drafts_movie_resource (
  environment TEXT NOT NULL,
  year INTEGER NOT NULL,
  revision INTEGER NOT NULL DEFAULT 0,
  published TEXT NOT NULL DEFAULT 'null' CHECK (json_valid(published)),
  job TEXT NOT NULL DEFAULT 'null' CHECK (json_valid(job)),
  next_run TEXT NOT NULL DEFAULT '',
  lease_until TEXT NOT NULL DEFAULT '',
  last_error TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (environment, year)
);
