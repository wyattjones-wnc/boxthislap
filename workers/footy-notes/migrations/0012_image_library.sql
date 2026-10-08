-- Empty schema only: no bucket scans, existing-row rewrites, or image backfill.
CREATE TABLE image_content (
  id TEXT PRIMARY KEY, kind TEXT NOT NULL, title TEXT NOT NULL, year TEXT NOT NULL DEFAULT '',
  external_key TEXT UNIQUE, created_by TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE image_title_aliases (
  kind TEXT NOT NULL, normalized_title TEXT NOT NULL, content_id TEXT NOT NULL REFERENCES image_content(id) ON DELETE CASCADE,
  PRIMARY KEY (kind, normalized_title, content_id)
);
CREATE TABLE image_presets (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, context TEXT NOT NULL, width INTEGER NOT NULL, height INTEGER NOT NULL,
  version INTEGER NOT NULL DEFAULT 1, is_default INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE image_files (
  id TEXT PRIMARY KEY, object_key TEXT, bucket TEXT NOT NULL DEFAULT 'library', location TEXT NOT NULL CHECK(location IN ('r2', 'bundled')),
  path TEXT NOT NULL, content_hash TEXT, mime TEXT NOT NULL, byte_size INTEGER NOT NULL, width INTEGER NOT NULL, height INTEGER NOT NULL,
  preset_id TEXT, preset_version INTEGER, created_by TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX image_files_object ON image_files(bucket, object_key);
CREATE INDEX image_aliases_title ON image_title_aliases(normalized_title, kind);
CREATE INDEX image_aliases_content ON image_title_aliases(content_id);
CREATE INDEX image_content_recent ON image_content(created_at);
CREATE INDEX image_files_recent ON image_files(created_at);
CREATE UNIQUE INDEX image_files_hash ON image_files(content_hash) WHERE content_hash IS NOT NULL;
CREATE TABLE image_associations (
  content_id TEXT NOT NULL REFERENCES image_content(id) ON DELETE CASCADE, file_id TEXT NOT NULL REFERENCES image_files(id),
  PRIMARY KEY (content_id, file_id)
);
CREATE INDEX image_associations_file ON image_associations(file_id);
CREATE TABLE image_manager_links (
  manager_id TEXT NOT NULL, kind TEXT NOT NULL, item_id TEXT NOT NULL, content_id TEXT NOT NULL REFERENCES image_content(id),
  PRIMARY KEY (manager_id, kind, item_id)
);

-- Default changes happen inside the same statement as the version-checked preset mutation.
CREATE TRIGGER image_preset_default_insert BEFORE INSERT ON image_presets WHEN NEW.is_default=1 BEGIN
  UPDATE image_presets SET is_default=0, version=version+1 WHERE context=NEW.context AND id<>NEW.id AND is_default=1;
END;
CREATE TRIGGER image_preset_default_update BEFORE UPDATE OF is_default ON image_presets WHEN NEW.is_default=1 BEGIN
  UPDATE image_presets SET is_default=0, version=version+1 WHERE context=NEW.context AND id<>NEW.id AND is_default=1;
END;
