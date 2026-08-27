ALTER TABLE draft_items ADD COLUMN is_archived INTEGER NOT NULL DEFAULT 0 CHECK (is_archived IN (0, 1));
ALTER TABLE draft_items ADD COLUMN is_drafted INTEGER NOT NULL DEFAULT 0 CHECK (is_drafted IN (0, 1));
ALTER TABLE draft_items ADD COLUMN is_unavailable INTEGER NOT NULL DEFAULT 0 CHECK (is_unavailable IN (0, 1));
