CREATE TABLE channels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  youtube_channel_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  uploads_playlist_id TEXT NOT NULL,
  latest_known_video_id TEXT,
  last_checked_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE videos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  youtube_video_id TEXT NOT NULL UNIQUE,
  channel_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  published_at TEXT NOT NULL,
  thumbnail_url TEXT,
  duration_seconds INTEGER,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'ignored', 'saved', 'watched')),
  processed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (channel_id) REFERENCES channels(id)
);

CREATE INDEX idx_videos_status_published ON videos(status, published_at DESC);
CREATE INDEX idx_videos_channel ON videos(channel_id);

CREATE TABLE playlists (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  youtube_playlist_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE video_playlist_actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  video_id INTEGER NOT NULL,
  playlist_id INTEGER NOT NULL,
  added_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(video_id, playlist_id),
  FOREIGN KEY (video_id) REFERENCES videos(id),
  FOREIGN KEY (playlist_id) REFERENCES playlists(id)
);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
