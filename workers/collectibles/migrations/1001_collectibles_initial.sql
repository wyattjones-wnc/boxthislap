PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS manufacturers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL UNIQUE,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1))
);

CREATE TABLE IF NOT EXISTS product_lines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  manufacturer_id INTEGER NOT NULL,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  UNIQUE (manufacturer_id, slug),
  FOREIGN KEY (manufacturer_id) REFERENCES manufacturers(id)
);

CREATE TABLE IF NOT EXISTS catalog_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_id INTEGER,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category_type TEXT NOT NULL DEFAULT 'other',
  source_url TEXT,
  source_sort_order INTEGER,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  checklist_mode TEXT NOT NULL DEFAULT 'normal'
    CHECK (checklist_mode IN ('normal', 'optional', 'reference_only')),
  FOREIGN KEY (parent_id) REFERENCES catalog_categories(id)
);

CREATE TABLE IF NOT EXISTS collectibles (
  id TEXT PRIMARY KEY,
  manufacturer_id INTEGER NOT NULL,
  product_line_id INTEGER,
  year INTEGER,
  scale TEXT,
  item_number TEXT,
  name TEXT NOT NULL,
  normalized_name TEXT,
  release_category TEXT,
  release_series TEXT,
  mix_name TEXT,
  source_url TEXT,
  source_site TEXT NOT NULL DEFAULT 'brianzpatton.com',
  primary_image_url TEXT,
  source_sort_order INTEGER,
  is_special_release INTEGER NOT NULL DEFAULT 0 CHECK (is_special_release IN (0, 1)),
  is_store_exclusive INTEGER NOT NULL DEFAULT 0 CHECK (is_store_exclusive IN (0, 1)),
  is_event_exclusive INTEGER NOT NULL DEFAULT 0 CHECK (is_event_exclusive IN (0, 1)),
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  last_imported_at TEXT NOT NULL,
  FOREIGN KEY (manufacturer_id) REFERENCES manufacturers(id),
  FOREIGN KEY (product_line_id) REFERENCES product_lines(id)
);

CREATE TABLE IF NOT EXISTS collectible_variants (
  id TEXT PRIMARY KEY,
  collectible_id TEXT NOT NULL,
  source_name TEXT NOT NULL,
  variant_name TEXT,
  source_url TEXT,
  source_item_number TEXT,
  notes TEXT,
  first_seen_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  FOREIGN KEY (collectible_id) REFERENCES collectibles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS collectible_images (
  id TEXT PRIMARY KEY,
  collectible_id TEXT NOT NULL,
  variant_id TEXT,
  source_url TEXT NOT NULL,
  local_url TEXT,
  image_type TEXT NOT NULL DEFAULT 'unknown',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_primary INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0, 1)),
  FOREIGN KEY (collectible_id) REFERENCES collectibles(id) ON DELETE CASCADE,
  FOREIGN KEY (variant_id) REFERENCES collectible_variants(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS collectible_categories (
  collectible_id TEXT NOT NULL,
  category_id INTEGER NOT NULL,
  PRIMARY KEY (collectible_id, category_id),
  FOREIGN KEY (collectible_id) REFERENCES collectibles(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES catalog_categories(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS collection_items (
  collectible_id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'not_owned' CHECK (status IN ('owned', 'not_owned')),
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  wanted INTEGER NOT NULL DEFAULT 0 CHECK (wanted IN (0, 1)),
  acquired_at TEXT,
  notes TEXT,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (collectible_id) REFERENCES collectibles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS collection_exclusions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exclusion_type TEXT NOT NULL,
  exclusion_value TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (exclusion_type, exclusion_value)
);

CREATE TABLE IF NOT EXISTS catalog_import_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_site TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  status TEXT NOT NULL,
  pages_processed INTEGER DEFAULT 0,
  items_seen INTEGER DEFAULT 0,
  items_added INTEGER DEFAULT 0,
  items_updated INTEGER DEFAULT 0,
  variants_added INTEGER DEFAULT 0,
  images_seen INTEGER DEFAULT 0,
  error_message TEXT
);

CREATE TABLE IF NOT EXISTS catalog_source_pages (
  url TEXT PRIMARY KEY,
  category_id INTEGER,
  content_hash TEXT,
  last_checked_at TEXT,
  last_changed_at TEXT,
  last_successful_import_at TEXT,
  FOREIGN KEY (category_id) REFERENCES catalog_categories(id)
);

CREATE INDEX IF NOT EXISTS idx_collectibles_manufacturer ON collectibles(manufacturer_id);
CREATE INDEX IF NOT EXISTS idx_collectibles_year ON collectibles(year);
CREATE INDEX IF NOT EXISTS idx_collectibles_scale ON collectibles(scale);
CREATE INDEX IF NOT EXISTS idx_collectibles_item_number ON collectibles(item_number);
CREATE INDEX IF NOT EXISTS idx_collectibles_name ON collectibles(normalized_name);
CREATE INDEX IF NOT EXISTS idx_collectibles_series ON collectibles(release_series);
CREATE INDEX IF NOT EXISTS idx_collectibles_manufacturer_year ON collectibles(manufacturer_id, year);
CREATE INDEX IF NOT EXISTS idx_collection_status ON collection_items(status);
CREATE INDEX IF NOT EXISTS idx_collection_wanted ON collection_items(wanted);
CREATE INDEX IF NOT EXISTS idx_collectible_images_item ON collectible_images(collectible_id, sort_order);

INSERT OR IGNORE INTO manufacturers (slug, name) VALUES
  ('hot-wheels', 'Hot Wheels'),
  ('spin-master', 'Spin Master'),
  ('greenlight', 'GreenLight');

INSERT OR IGNORE INTO collection_exclusions (exclusion_type, exclusion_value, note)
VALUES ('manufacturer', 'greenlight', 'Not part of the owner checklist by default.');
