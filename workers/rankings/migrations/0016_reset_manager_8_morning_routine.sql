DELETE FROM morning_routine_steps
WHERE owner_type = 'manager' AND owner_id = '8';

DELETE FROM manager_morning_workouts
WHERE manager_id = '8'
  AND completed_at IS NULL
  AND (
    SELECT COUNT(*)
    FROM manager_morning_steps
    WHERE manager_id = manager_morning_workouts.manager_id
      AND workout_date = manager_morning_workouts.workout_date
  ) = 3
  AND (
    SELECT COUNT(*)
    FROM manager_morning_steps
    WHERE manager_id = manager_morning_workouts.manager_id
      AND workout_date = manager_morning_workouts.workout_date
      AND step_id IN (
        'default-wake-up-stretch',
        'default-shoulder-rolls',
        'default-lunges'
      )
  ) = 3;
