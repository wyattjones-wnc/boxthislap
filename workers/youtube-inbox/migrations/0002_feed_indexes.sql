-- Match feed ordering, including ties, without sorting the full inbox history.
DROP INDEX idx_videos_status_published;
CREATE INDEX idx_videos_status_published
  ON videos(status, published_at DESC, id DESC, channel_id);

DROP INDEX idx_videos_channel;
CREATE INDEX idx_videos_channel_status_published
  ON videos(channel_id, status, published_at DESC, id DESC);

CREATE INDEX idx_videos_published
  ON videos(published_at DESC, id DESC, channel_id);
