PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS merch_products (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL CHECK (source IN ('arsenal', 'barcelona')),
  source_product_id TEXT NOT NULL,
  team TEXT NOT NULL CHECK (team IN ('arsenal', 'barcelona')),
  title TEXT NOT NULL,
  canonical_url TEXT NOT NULL,
  image_url TEXT,
  category TEXT NOT NULL DEFAULT 'other'
    CHECK (category IN ('kits', 'clothing', 'footwear', 'accessories', 'gifts-collectibles', 'home', 'other')),
  price_minor INTEGER,
  currency TEXT,
  availability TEXT NOT NULL DEFAULT 'unknown'
    CHECK (availability IN ('in_stock', 'out_of_stock', 'unknown')),
  first_observed_at TEXT NOT NULL,
  first_published_at TEXT,
  last_observed_at TEXT NOT NULL,
  new_since TEXT,
  in_scope INTEGER NOT NULL DEFAULT 1 CHECK (in_scope IN (0, 1)),
  source_metadata TEXT,
  UNIQUE (source, source_product_id)
);

CREATE TABLE IF NOT EXISTS merch_manager_state (
  manager_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  seen_at TEXT,
  wishlisted_at TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (manager_id, product_id),
  FOREIGN KEY (product_id) REFERENCES merch_products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS merch_scans (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL CHECK (source IN ('arsenal', 'barcelona')),
  started_at TEXT NOT NULL,
  finished_at TEXT,
  status TEXT NOT NULL CHECK (status IN ('running', 'succeeded', 'failed', 'suspect')),
  scope TEXT NOT NULL DEFAULT 'full-store',
  item_count INTEGER NOT NULL DEFAULT 0,
  new_count INTEGER NOT NULL DEFAULT 0,
  page_count INTEGER NOT NULL DEFAULT 0,
  complete INTEGER NOT NULL DEFAULT 0 CHECK (complete IN (0, 1)),
  content_hash TEXT,
  error_summary TEXT
);

CREATE INDEX IF NOT EXISTS idx_merch_products_feed
  ON merch_products(in_scope, first_observed_at DESC, id ASC);
CREATE INDEX IF NOT EXISTS idx_merch_products_team_category
  ON merch_products(team, category, in_scope, first_observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_merch_state_seen
  ON merch_manager_state(manager_id, seen_at, product_id);
CREATE INDEX IF NOT EXISTS idx_merch_state_wishlist
  ON merch_manager_state(manager_id, wishlisted_at, product_id);
CREATE INDEX IF NOT EXISTS idx_merch_scans_source_finished
  ON merch_scans(source, finished_at DESC);
