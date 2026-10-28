ALTER TABLE fantasy_office_movies ADD COLUMN non_theatrical INTEGER NOT NULL DEFAULT 0 CHECK (non_theatrical IN (0, 1));
