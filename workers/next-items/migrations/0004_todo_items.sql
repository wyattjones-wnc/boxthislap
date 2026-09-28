CREATE TABLE IF NOT EXISTS todo_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sort_order INTEGER NOT NULL CHECK (sort_order > 0),
  name TEXT NOT NULL,
  low_hour REAL,
  high_hour REAL,
  parent_id INTEGER,
  started INTEGER NOT NULL DEFAULT 0 CHECK (started IN (0, 1)),
  archived INTEGER NOT NULL DEFAULT 0 CHECK (archived IN (0, 1)),
  platinum_cleanup INTEGER NOT NULL DEFAULT 0 CHECK (platinum_cleanup IN (0, 1)),
  completed INTEGER NOT NULL DEFAULT 0 CHECK (completed IN (0, 1)),
  deleted INTEGER NOT NULL DEFAULT 0 CHECK (deleted IN (0, 1)),
  unpurchased INTEGER NOT NULL DEFAULT 0 CHECK (unpurchased IN (0, 1)),
  image_url TEXT NOT NULL DEFAULT '',
  source_want_id INTEGER UNIQUE,
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS todo_items_order_idx
ON todo_items(archived, completed, deleted, unpurchased, sort_order);

CREATE TABLE IF NOT EXISTS todo_item_history (
  item_id INTEGER NOT NULL,
  revision INTEGER NOT NULL CHECK (revision > 0),
  sort_order INTEGER NOT NULL CHECK (sort_order > 0),
  name TEXT NOT NULL,
  low_hour REAL,
  high_hour REAL,
  parent_id INTEGER,
  started INTEGER NOT NULL CHECK (started IN (0, 1)),
  archived INTEGER NOT NULL CHECK (archived IN (0, 1)),
  platinum_cleanup INTEGER NOT NULL CHECK (platinum_cleanup IN (0, 1)),
  completed INTEGER NOT NULL CHECK (completed IN (0, 1)),
  deleted INTEGER NOT NULL CHECK (deleted IN (0, 1)),
  unpurchased INTEGER NOT NULL CHECK (unpurchased IN (0, 1)),
  image_url TEXT NOT NULL DEFAULT '',
  source_want_id INTEGER,
  changed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  changed_by TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (item_id, revision)
) WITHOUT ROWID;

CREATE TRIGGER IF NOT EXISTS todo_items_insert_history
AFTER INSERT ON todo_items
BEGIN
  INSERT INTO todo_item_history (
    item_id, revision, sort_order, name, low_hour, high_hour, parent_id,
    started, archived, platinum_cleanup, completed, deleted, unpurchased,
    image_url, source_want_id, changed_by
  ) VALUES (
    NEW.id, NEW.revision, NEW.sort_order, NEW.name, NEW.low_hour, NEW.high_hour,
    NEW.parent_id, NEW.started, NEW.archived, NEW.platinum_cleanup,
    NEW.completed, NEW.deleted, NEW.unpurchased, NEW.image_url,
    NEW.source_want_id, NEW.updated_by
  );
END;

CREATE TRIGGER IF NOT EXISTS todo_items_update_history
AFTER UPDATE ON todo_items
BEGIN
  INSERT INTO todo_item_history (
    item_id, revision, sort_order, name, low_hour, high_hour, parent_id,
    started, archived, platinum_cleanup, completed, deleted, unpurchased,
    image_url, source_want_id, changed_by
  ) VALUES (
    NEW.id, NEW.revision, NEW.sort_order, NEW.name, NEW.low_hour, NEW.high_hour,
    NEW.parent_id, NEW.started, NEW.archived, NEW.platinum_cleanup,
    NEW.completed, NEW.deleted, NEW.unpurchased, NEW.image_url,
    NEW.source_want_id, NEW.updated_by
  );
END;
