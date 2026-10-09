# Rankings Worker

Stores manager-owned Game, Movie, and TV submissions plus manager-scoped manual order, Elo, comparisons, exclusions, and snapshots. It also stores private Draft List sheets and ordered items for each manager, including the default Fantasy Critic and Fantasy Office sheets. MCU catalog content remains in the validated `data/rankings.json` snapshot.

Adding a Game, Movie, or TV item saves a snapshot of the existing active calculated rankings, inserts the new item at the requested position in that calculated order, and normalizes all active Elo ratings with comparison counters and history reset. Manual order retains its existing placement behavior. These writes share one transactional revision claim; failed or stale additions cannot leave a partial snapshot or normalization. The first item starts at the base rating without creating an empty snapshot. Archived items and other managers or ranking types are untouched.

Writes require a signed manager access token and use a revision number plus a transactional revision claim to reject stale or simultaneous updates. Normal login credentials are revalidated through the existing Manager Portal before tokens are issued; legacy site sessions can use the origin-restricted bootstrap route only until the configured cutoff. Dev and production intentionally share the production Worker and D1 database so tests exercise functionality and UI without creating divergent ranking data.

The generated migrations are idempotent. `0002_import_legacy.sql` intentionally preserves Manager 6 item IDs and excludes Manager 8's Game history because that manager has no owned Game set.

## Deploying schema changes

Apply D1 migrations before deploying a Worker version that depends on them:

```powershell
npx wrangler d1 migrations apply rankings --remote --config workers\rankings\wrangler.toml
npx wrangler deploy --config workers\rankings\wrangler.toml
```
