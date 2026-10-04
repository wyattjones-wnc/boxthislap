INSERT INTO morning_routine_steps (
  owner_type,
  owner_id,
  position,
  step_id,
  name,
  step_type,
  duration_seconds,
  target_count,
  completion_mode
)
SELECT
  'default',
  'default',
  starter.position,
  starter.step_id,
  starter.name,
  starter.step_type,
  starter.duration_seconds,
  starter.target_count,
  starter.completion_mode
FROM (
  SELECT
    1 AS position,
    'default-wake-up-stretch' AS step_id,
    'Wake-up stretch' AS name,
    'timer' AS step_type,
    30 AS duration_seconds,
    NULL AS target_count,
    NULL AS completion_mode
  UNION ALL
  SELECT 2, 'default-shoulder-rolls', 'Shoulder rolls', 'count', NULL, 10, 'tally'
  UNION ALL
  SELECT 3, 'default-lunges', 'Lunges', 'count', NULL, 10, 'tally'
) AS starter
WHERE NOT EXISTS (
  SELECT 1
  FROM morning_routine_steps
  WHERE owner_type = 'default' AND owner_id = 'default'
);
