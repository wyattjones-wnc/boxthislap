-- The 2026 workbook treats an unanswered individual pick as zero while still
-- scoring the manager's other choices. Preserve Michael's partial round 11 row.
UPDATE f1_weekly_entries
SET entry_status = 'submitted', submitted_at = COALESCE(NULLIF(submitted_at, ''), CURRENT_TIMESTAMP), updated_at = CURRENT_TIMESTAMP
WHERE year = 2026 AND round = 11 AND manager_id = '4';

INSERT INTO f1_weekly_scores (
  year, round, manager_id, p1_points, p2_points, p3_points,
  wildcard_qualifying_points, wildcard_race_points, total_points,
  details_json, updated_at
) VALUES (
  2026, 11, '4', 25, 0, 0, 60, 50, 135,
  '{"p1Points":25,"p2Points":0,"p3Points":0,"wildcardQualifyingPoints":60,"wildcardRacePoints":50,"totalPoints":135}',
  CURRENT_TIMESTAMP
)
ON CONFLICT(year, round, manager_id) DO UPDATE SET
  p1_points = excluded.p1_points,
  p2_points = excluded.p2_points,
  p3_points = excluded.p3_points,
  wildcard_qualifying_points = excluded.wildcard_qualifying_points,
  wildcard_race_points = excluded.wildcard_race_points,
  total_points = excluded.total_points,
  details_json = excluded.details_json,
  updated_at = CURRENT_TIMESTAMP;
