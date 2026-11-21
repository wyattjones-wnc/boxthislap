ALTER TABLE next_items ADD COLUMN image_position_x REAL NOT NULL DEFAULT 50 CHECK (image_position_x BETWEEN 0 AND 100);
ALTER TABLE next_items ADD COLUMN image_position_y REAL NOT NULL DEFAULT 50 CHECK (image_position_y BETWEEN 0 AND 100);
ALTER TABLE next_item_history ADD COLUMN image_position_x REAL NOT NULL DEFAULT 50 CHECK (image_position_x BETWEEN 0 AND 100);
ALTER TABLE next_item_history ADD COLUMN image_position_y REAL NOT NULL DEFAULT 50 CHECK (image_position_y BETWEEN 0 AND 100);

DROP TRIGGER IF EXISTS next_items_insert_history;
DROP TRIGGER IF EXISTS next_items_update_history;

CREATE TRIGGER next_items_insert_history
AFTER INSERT ON next_items
BEGIN
  INSERT INTO next_item_history (
    item_id, revision, thing, image_url, start_date, end_date, time,
    priority, completed, non_admin, changed_by, source_match_id, image_position_x, image_position_y
  ) VALUES (
    NEW.id, NEW.revision, NEW.thing, NEW.image_url, NEW.start_date, NEW.end_date,
    NEW.time, NEW.priority, NEW.completed, NEW.non_admin, NEW.updated_by, NEW.source_match_id, NEW.image_position_x, NEW.image_position_y
  );
END;

CREATE TRIGGER next_items_update_history
AFTER UPDATE ON next_items
BEGIN
  INSERT INTO next_item_history (
    item_id, revision, thing, image_url, start_date, end_date, time,
    priority, completed, non_admin, changed_by, source_match_id, image_position_x, image_position_y
  ) VALUES (
    NEW.id, NEW.revision, NEW.thing, NEW.image_url, NEW.start_date, NEW.end_date,
    NEW.time, NEW.priority, NEW.completed, NEW.non_admin, NEW.updated_by, NEW.source_match_id, NEW.image_position_x, NEW.image_position_y
  );
END;
