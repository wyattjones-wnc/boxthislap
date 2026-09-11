UPDATE f1_drivers
SET display_name = TRIM(given_name || ' ' || family_name),
    updated_at = CURRENT_TIMESTAMP
WHERE given_name <> ''
  AND family_name <> ''
  AND display_name <> TRIM(given_name || ' ' || family_name);
