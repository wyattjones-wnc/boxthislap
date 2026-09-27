ALTER TABLE fantasy_office_movies ADD COLUMN letterboxd_verified INTEGER NOT NULL DEFAULT 0 CHECK (letterboxd_verified IN (0, 1));
ALTER TABLE fantasy_office_movies ADD COLUMN rotten_tomatoes_verified INTEGER NOT NULL DEFAULT 0 CHECK (rotten_tomatoes_verified IN (0, 1));
ALTER TABLE fantasy_office_movies ADD COLUMN box_office_mojo_verified INTEGER NOT NULL DEFAULT 0 CHECK (box_office_mojo_verified IN (0, 1));
ALTER TABLE fantasy_office_movies ADD COLUMN source_discovery_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE fantasy_office_movies ADD COLUMN source_discovered_at TEXT NOT NULL DEFAULT '';
