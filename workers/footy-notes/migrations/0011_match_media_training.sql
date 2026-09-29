PRAGMA foreign_keys = OFF;

CREATE TABLE footy_media_galleries_next (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL CHECK (source IN ('arsenal', 'barcelona', 'getty')),
  source_gallery_id TEXT NOT NULL,
  team_id TEXT NOT NULL,
  match_id TEXT,
  source_url TEXT NOT NULL,
  title TEXT NOT NULL,
  published_at TEXT,
  category TEXT NOT NULL DEFAULT 'other'
    CHECK (category IN ('match', 'celebration', 'training', 'behind_scenes', 'other')),
  expected_image_count INTEGER,
  match_confidence INTEGER NOT NULL DEFAULT 0,
  match_status TEXT NOT NULL DEFAULT 'unmatched'
    CHECK (match_status IN ('auto', 'review', 'manual', 'rejected', 'unmatched')),
  match_evidence TEXT,
  first_observed_at TEXT NOT NULL,
  last_observed_at TEXT NOT NULL,
  last_extracted_at TEXT,
  extraction_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (extraction_status IN ('pending', 'complete', 'partial', 'failed')),
  extraction_error TEXT,
  UNIQUE (source, source_gallery_id)
);

INSERT INTO footy_media_galleries_next
SELECT * FROM footy_media_galleries;

DROP TABLE footy_media_galleries;
ALTER TABLE footy_media_galleries_next RENAME TO footy_media_galleries;

CREATE INDEX idx_footy_media_gallery_feed
  ON footy_media_galleries(team_id, published_at DESC, id);
CREATE INDEX idx_footy_media_gallery_match
  ON footy_media_galleries(match_status, match_id, published_at DESC);

PRAGMA foreign_keys = ON;
