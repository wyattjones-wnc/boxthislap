-- Wyatt's current Morning Stretch snapshot was created while his routine only
-- contained one step. Remove only that recent one-step snapshot so the current
-- routine is copied in the next time he opens Morning Stretch.
DELETE FROM manager_morning_workouts
WHERE manager_id = '6'
  AND workout_date IN (date('now'), date('now', '-1 day'))
  AND (
    SELECT COUNT(*)
    FROM manager_morning_steps
    WHERE manager_morning_steps.manager_id = manager_morning_workouts.manager_id
      AND manager_morning_steps.workout_date = manager_morning_workouts.workout_date
  ) = 1;
