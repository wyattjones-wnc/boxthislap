CREATE TABLE IF NOT EXISTS footy_roster_players (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  season TEXT NOT NULL,
  player_key TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT '',
  provider_player_id TEXT NOT NULL DEFAULT '',
  provider_data TEXT NOT NULL DEFAULT '{}',
  overrides TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'review_departure', 'archived')),
  manual INTEGER NOT NULL DEFAULT 0 CHECK (manual IN (0, 1)),
  source_seen_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by TEXT NOT NULL DEFAULT '',
  UNIQUE (team_id, season, player_key)
);

CREATE INDEX IF NOT EXISTS footy_roster_team_season_idx
ON footy_roster_players(team_id, season, status);

CREATE UNIQUE INDEX IF NOT EXISTS footy_roster_provider_player_idx
ON footy_roster_players(team_id, season, provider, provider_player_id)
WHERE provider <> '' AND provider_player_id <> '';

CREATE TABLE IF NOT EXISTS footy_roster_seasons (
  team_id TEXT NOT NULL,
  season TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 0 CHECK (is_active IN (0, 1)),
  last_synced_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (team_id, season)
) WITHOUT ROWID;

CREATE INDEX IF NOT EXISTS footy_roster_active_season_idx
ON footy_roster_seasons(team_id, is_active);
