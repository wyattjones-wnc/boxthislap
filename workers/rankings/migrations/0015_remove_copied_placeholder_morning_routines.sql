DELETE FROM morning_routine_steps
WHERE owner_type = 'manager'
  AND owner_id IN (
    SELECT owner_id
    FROM morning_routine_steps
    WHERE owner_type = 'manager'
    GROUP BY owner_id
    HAVING COUNT(*) = 3
      AND SUM(
        CASE
          WHEN position = 1
            AND step_id = 'default-wake-up-stretch'
            AND name = 'Wake-up stretch'
            AND step_type = 'timer'
            AND duration_seconds = 30
            AND target_count IS NULL
            AND completion_mode IS NULL
          THEN 1
          WHEN position = 2
            AND step_id = 'default-shoulder-rolls'
            AND name = 'Shoulder rolls'
            AND step_type = 'count'
            AND duration_seconds IS NULL
            AND target_count = 10
            AND completion_mode = 'tally'
          THEN 1
          WHEN position = 3
            AND step_id = 'default-lunges'
            AND name = 'Lunges'
            AND step_type = 'count'
            AND duration_seconds IS NULL
            AND target_count = 10
            AND completion_mode = 'tally'
          THEN 1
          ELSE 0
        END
      ) = 3
  );
