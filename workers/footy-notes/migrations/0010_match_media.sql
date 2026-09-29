PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS footy_media_scans (
  id TEXT PRIMARY KEY,
  requested_by TEXT,
  requested_at TEXT NOT NULL,
  started_at TEXT,
  finished_at TEXT,
  status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'completed', 'partial', 'failed')),
  source_count INTEGER NOT NULL DEFAULT 0,
  gallery_count INTEGER NOT NULL DEFAULT 0,
  new_image_count INTEGER NOT NULL DEFAULT 0,
  existing_image_count INTEGER NOT NULL DEFAULT 0,
  unmatched_gallery_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  error_summary TEXT,
  report_json TEXT
);

CREATE TABLE IF NOT EXISTS footy_media_galleries (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL CHECK (source IN ('arsenal', 'barcelona', 'getty')),
  source_gallery_id TEXT NOT NULL,
  team_id TEXT NOT NULL,
  match_id TEXT,
  source_url TEXT NOT NULL,
  title TEXT NOT NULL,
  published_at TEXT,
  category TEXT NOT NULL DEFAULT 'other'
    CHECK (category IN ('match', 'celebration', 'behind_scenes', 'other')),
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

CREATE TABLE IF NOT EXISTS footy_media_images (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL CHECK (source IN ('arsenal', 'barcelona', 'getty')),
  source_image_key TEXT NOT NULL,
  source_image_url TEXT,
  original_page_url TEXT NOT NULL,
  render_mode TEXT NOT NULL DEFAULT 'image'
    CHECK (render_mode IN ('image', 'getty_embed')),
  embed_url TEXT,
  caption TEXT,
  photographer_credit TEXT,
  width INTEGER,
  height INTEGER,
  normalized_url TEXT,
  content_hash TEXT,
  duplicate_of_image_id TEXT,
  first_observed_at TEXT NOT NULL,
  last_observed_at TEXT NOT NULL,
  hard_asset_key TEXT,
  hard_asset_mime TEXT,
  hard_asset_size INTEGER,
  hard_saved_at TEXT,
  hard_save_error TEXT,
  UNIQUE (source, source_image_key),
  FOREIGN KEY (duplicate_of_image_id) REFERENCES footy_media_images(id)
);

CREATE TABLE IF NOT EXISTS footy_media_gallery_images (
  gallery_id TEXT NOT NULL,
  image_id TEXT NOT NULL,
  ordinal INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (gallery_id, image_id),
  FOREIGN KEY (gallery_id) REFERENCES footy_media_galleries(id) ON DELETE CASCADE,
  FOREIGN KEY (image_id) REFERENCES footy_media_images(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS footy_media_manager_state (
  manager_id TEXT NOT NULL,
  image_id TEXT NOT NULL,
  seen_at TEXT,
  soft_saved_at TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (manager_id, image_id),
  FOREIGN KEY (image_id) REFERENCES footy_media_images(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS footy_media_source_runs (
  id TEXT PRIMARY KEY,
  scan_id TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('arsenal', 'barcelona', 'getty')),
  started_at TEXT NOT NULL,
  finished_at TEXT,
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed', 'suspect')),
  pages_scanned INTEGER NOT NULL DEFAULT 0,
  galleries_found INTEGER NOT NULL DEFAULT 0,
  images_found INTEGER NOT NULL DEFAULT 0,
  error_summary TEXT,
  FOREIGN KEY (scan_id) REFERENCES footy_media_scans(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_footy_media_gallery_feed
  ON footy_media_galleries(team_id, published_at DESC, id);
CREATE INDEX IF NOT EXISTS idx_footy_media_gallery_match
  ON footy_media_galleries(match_status, match_id, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_footy_media_image_feed
  ON footy_media_images(first_observed_at DESC, id);
CREATE INDEX IF NOT EXISTS idx_footy_media_state_seen
  ON footy_media_manager_state(manager_id, seen_at, image_id);
CREATE INDEX IF NOT EXISTS idx_footy_media_state_saved
  ON footy_media_manager_state(manager_id, soft_saved_at, image_id);
CREATE INDEX IF NOT EXISTS idx_footy_media_runs_source
  ON footy_media_source_runs(source, finished_at DESC);
