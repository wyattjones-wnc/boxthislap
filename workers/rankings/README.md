# Rankings Worker

Stores manager-owned Game, Movie, and TV submissions plus manager-scoped manual order, Elo, comparisons, exclusions, and snapshots. MCU catalog content remains in the validated `data/rankings.json` snapshot.

Writes require a signed manager access token and use a revision number plus a transactional revision claim to reject stale or simultaneous updates. Normal login credentials are revalidated through the existing Manager Portal before tokens are issued; legacy site sessions can use the origin-restricted bootstrap route only until the configured cutoff. Dev and production intentionally share the production Worker and D1 database so tests exercise functionality and UI without creating divergent ranking data.

The generated migrations are idempotent. `0002_import_legacy.sql` intentionally preserves Manager 6 item IDs and excludes Manager 8's Game history because that manager has no owned Game set.
