CREATE TABLE IF NOT EXISTS next_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  thing TEXT NOT NULL,
  image_url TEXT NOT NULL DEFAULT '',
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL DEFAULT '',
  time TEXT NOT NULL DEFAULT '',
  priority INTEGER NOT NULL DEFAULT 0 CHECK (priority BETWEEN 0 AND 10),
  completed INTEGER NOT NULL DEFAULT 0 CHECK (completed IN (0, 1)),
  non_admin INTEGER NOT NULL DEFAULT 0 CHECK (non_admin IN (0, 1)),
  revision INTEGER NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS next_items_dates_idx
ON next_items(start_date, end_date);

CREATE TABLE IF NOT EXISTS next_item_history (
  item_id INTEGER NOT NULL,
  revision INTEGER NOT NULL CHECK (revision > 0),
  thing TEXT NOT NULL,
  image_url TEXT NOT NULL DEFAULT '',
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL DEFAULT '',
  time TEXT NOT NULL DEFAULT '',
  priority INTEGER NOT NULL CHECK (priority BETWEEN 0 AND 10),
  completed INTEGER NOT NULL CHECK (completed IN (0, 1)),
  non_admin INTEGER NOT NULL CHECK (non_admin IN (0, 1)),
  changed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  changed_by TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (item_id, revision)
) WITHOUT ROWID;

CREATE INDEX IF NOT EXISTS next_item_history_changed_idx
ON next_item_history(changed_at);

CREATE TRIGGER IF NOT EXISTS next_items_insert_history
AFTER INSERT ON next_items
BEGIN
  INSERT INTO next_item_history (
    item_id, revision, thing, image_url, start_date, end_date, time,
    priority, completed, non_admin, changed_by
  ) VALUES (
    NEW.id, NEW.revision, NEW.thing, NEW.image_url, NEW.start_date, NEW.end_date,
    NEW.time, NEW.priority, NEW.completed, NEW.non_admin, NEW.updated_by
  );
END;

CREATE TRIGGER IF NOT EXISTS next_items_update_history
AFTER UPDATE ON next_items
BEGIN
  INSERT INTO next_item_history (
    item_id, revision, thing, image_url, start_date, end_date, time,
    priority, completed, non_admin, changed_by
  ) VALUES (
    NEW.id, NEW.revision, NEW.thing, NEW.image_url, NEW.start_date, NEW.end_date,
    NEW.time, NEW.priority, NEW.completed, NEW.non_admin, NEW.updated_by
  );
END;
