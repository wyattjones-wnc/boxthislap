-- New namespace only: no legacy league, ranking, or roster tables are changed.
CREATE TABLE IF NOT EXISTS league_drafts_state (
  environment TEXT NOT NULL,
  id TEXT NOT NULL,
  league TEXT NOT NULL,
  year INTEGER NOT NULL CHECK (year >= 2027),
  status TEXT NOT NULL,
  revision INTEGER NOT NULL CHECK (revision > 0),
  state TEXT NOT NULL CHECK (json_valid(state)),
  updated_at TEXT NOT NULL,
  PRIMARY KEY (environment, id),
  CHECK (json_extract(state, '$.revision') = revision),
  CHECK (json_extract(state, '$.status') = status)
);
CREATE INDEX IF NOT EXISTS league_drafts_season ON league_drafts_state (environment, year, league);
