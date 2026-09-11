CREATE TABLE IF NOT EXISTS f1_round_drivers (
  year INTEGER NOT NULL,
  round INTEGER NOT NULL,
  driver_id TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (year, round, driver_id),
  FOREIGN KEY (year, round) REFERENCES f1_rounds(year, round),
  FOREIGN KEY (year, driver_id) REFERENCES f1_drivers(year, driver_id)
);

CREATE INDEX IF NOT EXISTS idx_f1_round_drivers_round ON f1_round_drivers(year, round);

INSERT OR IGNORE INTO f1_round_drivers (year, round, driver_id, source)
SELECT year, round, driver_id, 'session_result' FROM f1_session_results;

INSERT OR IGNORE INTO f1_round_drivers (year, round, driver_id, source)
SELECT year, round, driver_id, 'weekly_entry'
FROM (
  SELECT year, round, p1_driver_id AS driver_id FROM f1_weekly_entries
  UNION ALL SELECT year, round, p2_driver_id FROM f1_weekly_entries
  UNION ALL SELECT year, round, p3_driver_id FROM f1_weekly_entries
  UNION ALL SELECT year, round, wildcard_driver_id FROM f1_weekly_entries
)
WHERE driver_id <> '';
