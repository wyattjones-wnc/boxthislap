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
  'manager',
  '6',
  position,
  step_id,
  name,
  step_type,
  duration_seconds,
  target_count,
  completion_mode
FROM morning_routine_steps
WHERE owner_type = 'default'
  AND owner_id = 'default'
  AND NOT EXISTS (
    SELECT 1
    FROM morning_routine_steps
    WHERE owner_type = 'manager' AND owner_id = '6'
  );

DELETE FROM morning_routine_steps
WHERE owner_type = 'default' AND owner_id = 'default';
