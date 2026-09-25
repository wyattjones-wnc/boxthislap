CREATE TABLE IF NOT EXISTS want_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sort_order INTEGER NOT NULL CHECK (sort_order > 0),
  name TEXT NOT NULL,
  price_cents INTEGER CHECK (price_cents IS NULL OR price_cents >= 0),
  image_url TEXT NOT NULL DEFAULT '',
  archived INTEGER NOT NULL DEFAULT 0 CHECK (archived IN (0, 1)),
  completed INTEGER NOT NULL DEFAULT 0 CHECK (completed IN (0, 1)),
  deleted INTEGER NOT NULL DEFAULT 0 CHECK (deleted IN (0, 1)),
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS want_items_order_idx
ON want_items(archived, completed, deleted, sort_order);

CREATE TABLE IF NOT EXISTS want_item_history (
  item_id INTEGER NOT NULL,
  revision INTEGER NOT NULL CHECK (revision > 0),
  sort_order INTEGER NOT NULL CHECK (sort_order > 0),
  name TEXT NOT NULL,
  price_cents INTEGER CHECK (price_cents IS NULL OR price_cents >= 0),
  image_url TEXT NOT NULL DEFAULT '',
  archived INTEGER NOT NULL CHECK (archived IN (0, 1)),
  completed INTEGER NOT NULL CHECK (completed IN (0, 1)),
  deleted INTEGER NOT NULL CHECK (deleted IN (0, 1)),
  changed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  changed_by TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (item_id, revision)
) WITHOUT ROWID;

CREATE INDEX IF NOT EXISTS want_item_history_changed_idx
ON want_item_history(changed_at);

CREATE TRIGGER IF NOT EXISTS want_items_insert_history
AFTER INSERT ON want_items
BEGIN
  INSERT INTO want_item_history (
    item_id, revision, sort_order, name, price_cents, image_url,
    archived, completed, deleted, changed_by
  ) VALUES (
    NEW.id, NEW.revision, NEW.sort_order, NEW.name, NEW.price_cents,
    NEW.image_url, NEW.archived, NEW.completed, NEW.deleted, NEW.updated_by
  );
END;

CREATE TRIGGER IF NOT EXISTS want_items_update_history
AFTER UPDATE ON want_items
BEGIN
  INSERT INTO want_item_history (
    item_id, revision, sort_order, name, price_cents, image_url,
    archived, completed, deleted, changed_by
  ) VALUES (
    NEW.id, NEW.revision, NEW.sort_order, NEW.name, NEW.price_cents,
    NEW.image_url, NEW.archived, NEW.completed, NEW.deleted, NEW.updated_by
  );
END;
