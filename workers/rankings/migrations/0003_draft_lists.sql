CREATE TABLE IF NOT EXISTS draft_sheets (
  manager_id TEXT NOT NULL,
  sheet_id TEXT NOT NULL,
  name TEXT NOT NULL COLLATE NOCASE,
  icon TEXT NOT NULL DEFAULT 'notebook' CHECK (icon IN ('gamepad', 'film', 'notebook')),
  is_system INTEGER NOT NULL DEFAULT 0 CHECK (is_system IN (0, 1)),
  position INTEGER NOT NULL DEFAULT 0,
  revision INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (manager_id, sheet_id),
  UNIQUE (manager_id, name)
);

CREATE TABLE IF NOT EXISTS draft_items (
  manager_id TEXT NOT NULL,
  sheet_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  name TEXT NOT NULL,
  release_date TEXT NOT NULL DEFAULT '',
  manual_rank INTEGER NOT NULL,
  data_url TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '',
  entry_date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (manager_id, sheet_id, item_id),
  FOREIGN KEY (manager_id, sheet_id) REFERENCES draft_sheets(manager_id, sheet_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS draft_revision_claims (
  manager_id TEXT NOT NULL,
  sheet_id TEXT NOT NULL,
  revision INTEGER NOT NULL,
  claimed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (manager_id, sheet_id, revision)
);

CREATE INDEX IF NOT EXISTS draft_sheets_manager_idx ON draft_sheets(manager_id, position, created_at);
CREATE INDEX IF NOT EXISTS draft_items_order_idx ON draft_items(manager_id, sheet_id, manual_rank);
