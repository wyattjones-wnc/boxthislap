ALTER TABLE f1_session_results ADD COLUMN constructor_id TEXT NOT NULL DEFAULT '';
ALTER TABLE f1_session_results ADD COLUMN constructor_name TEXT NOT NULL DEFAULT '';

UPDATE f1_session_results
SET constructor_id = COALESCE(
  NULLIF(json_extract(raw_json, '$.Constructor.constructorId'), ''),
  CASE
    WHEN driver_id IN ('norris', 'piastri') THEN 'mclaren'
    WHEN driver_id IN ('russell', 'antonelli') THEN 'mercedes'
    WHEN driver_id IN ('max_verstappen', 'hadjar') THEN 'red_bull'
    WHEN driver_id IN ('leclerc', 'hamilton') THEN 'ferrari'
    WHEN driver_id IN ('albon', 'sainz') THEN 'williams'
    WHEN driver_id IN ('lawson', 'arvid_lindblad') THEN 'rb'
    WHEN driver_id IN ('alonso', 'stroll') THEN 'aston_martin'
    WHEN driver_id IN ('ocon', 'bearman') THEN 'haas'
    WHEN driver_id IN ('hulkenberg', 'bortoleto') THEN 'audi'
    WHEN driver_id IN ('gasly', 'colapinto') THEN 'alpine'
    WHEN driver_id IN ('perez', 'bottas') THEN 'cadillac'
    ELSE ''
  END
),
constructor_name = COALESCE(
  NULLIF(json_extract(raw_json, '$.Constructor.name'), ''),
  CASE
    WHEN driver_id IN ('norris', 'piastri') THEN 'McLaren'
    WHEN driver_id IN ('russell', 'antonelli') THEN 'Mercedes'
    WHEN driver_id IN ('max_verstappen', 'hadjar') THEN 'Red Bull Racing'
    WHEN driver_id IN ('leclerc', 'hamilton') THEN 'Ferrari'
    WHEN driver_id IN ('albon', 'sainz') THEN 'Williams'
    WHEN driver_id IN ('lawson', 'arvid_lindblad') THEN 'Racing Bulls'
    WHEN driver_id IN ('alonso', 'stroll') THEN 'Aston Martin'
    WHEN driver_id IN ('ocon', 'bearman') THEN 'Haas'
    WHEN driver_id IN ('hulkenberg', 'bortoleto') THEN 'Audi'
    WHEN driver_id IN ('gasly', 'colapinto') THEN 'Alpine'
    WHEN driver_id IN ('perez', 'bottas') THEN 'Cadillac'
    ELSE ''
  END
);

UPDATE f1_drivers
SET active = CASE WHEN EXISTS (
  SELECT 1
  FROM f1_session_results result
  WHERE result.year = f1_drivers.year
    AND result.driver_id = f1_drivers.driver_id
    AND result.round = (
      SELECT MAX(latest.round)
      FROM f1_session_results latest
      WHERE latest.year = f1_drivers.year
    )
) THEN 1 ELSE 0 END,
updated_at = CURRENT_TIMESTAMP;
