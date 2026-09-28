ALTER TABLE footy_match_notes
ADD COLUMN kit TEXT NOT NULL DEFAULT '' CHECK (kit IN ('', 'home', 'away', 'third'));

ALTER TABLE footy_match_note_history
ADD COLUMN kit TEXT NOT NULL DEFAULT '' CHECK (kit IN ('', 'home', 'away', 'third'));
