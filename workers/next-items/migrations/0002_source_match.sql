ALTER TABLE next_items ADD COLUMN source_match_id TEXT NOT NULL DEFAULT '';
ALTER TABLE next_item_history ADD COLUMN source_match_id TEXT NOT NULL DEFAULT '';

CREATE UNIQUE INDEX IF NOT EXISTS next_items_source_match_idx
ON next_items(source_match_id)
WHERE source_match_id <> '';

DROP TRIGGER IF EXISTS next_items_insert_history;
DROP TRIGGER IF EXISTS next_items_update_history;

CREATE TRIGGER next_items_insert_history
AFTER INSERT ON next_items
BEGIN
  INSERT INTO next_item_history (
    item_id, revision, thing, image_url, start_date, end_date, time,
    priority, completed, non_admin, changed_by, source_match_id
  ) VALUES (
    NEW.id, NEW.revision, NEW.thing, NEW.image_url, NEW.start_date, NEW.end_date,
    NEW.time, NEW.priority, NEW.completed, NEW.non_admin, NEW.updated_by, NEW.source_match_id
  );
END;

CREATE TRIGGER next_items_update_history
AFTER UPDATE ON next_items
BEGIN
  INSERT INTO next_item_history (
    item_id, revision, thing, image_url, start_date, end_date, time,
    priority, completed, non_admin, changed_by, source_match_id
  ) VALUES (
    NEW.id, NEW.revision, NEW.thing, NEW.image_url, NEW.start_date, NEW.end_date,
    NEW.time, NEW.priority, NEW.completed, NEW.non_admin, NEW.updated_by, NEW.source_match_id
  );
END;
