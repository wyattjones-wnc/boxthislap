DELETE FROM morning_routine_steps
WHERE owner_type = 'default'
  AND owner_id = 'default'
  AND (
    SELECT COUNT(*)
    FROM morning_routine_steps
    WHERE owner_type = 'default' AND owner_id = 'default'
  ) = 3
  AND (
    SELECT COUNT(*)
    FROM morning_routine_steps
    WHERE owner_type = 'default'
      AND owner_id = 'default'
      AND (
        (
          position = 1
          AND step_id = 'default-wake-up-stretch'
          AND name = 'Wake-up stretch'
          AND step_type = 'timer'
          AND duration_seconds = 30
          AND target_count IS NULL
          AND completion_mode IS NULL
        )
        OR (
          position = 2
          AND step_id = 'default-shoulder-rolls'
          AND name = 'Shoulder rolls'
          AND step_type = 'count'
          AND duration_seconds IS NULL
          AND target_count = 10
          AND completion_mode = 'tally'
        )
        OR (
          position = 3
          AND step_id = 'default-lunges'
          AND name = 'Lunges'
          AND step_type = 'count'
          AND duration_seconds IS NULL
          AND target_count = 10
          AND completion_mode = 'tally'
        )
      )
  ) = 3;
