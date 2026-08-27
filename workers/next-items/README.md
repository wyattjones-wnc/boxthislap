# Next Items Worker

Stores the Next page in D1. Reads are public; writes require an existing Box This Lap manager access token and admin manager ID. IDs are assigned by D1 as ordinary sequential integers, and revision checks reject stale edits.

Dev and production intentionally share this Worker and database. The Google Sheet remains a rollback source after cutover, but editing its Next tab no longer changes the site.

## Initial cutover

```powershell
npx wrangler d1 migrations apply DB --remote --config workers\next-items\wrangler.toml
node scripts\migrate-next-items.mjs --output workers\next-items\legacy-import.sql
npx wrangler d1 execute DB --remote --config workers\next-items\wrangler.toml --file workers\next-items\legacy-import.sql
npx wrangler deploy --config workers\next-items\wrangler.toml
node scripts\migrate-next-items.mjs --verify https://box-this-lap-next.boxthislap.workers.dev
```

Delete the generated `legacy-import.sql` after the import; it is ignored by Git.

## Later schema changes

```powershell
npx wrangler d1 migrations apply DB --remote --config workers\next-items\wrangler.toml
npx wrangler deploy --config workers\next-items\wrangler.toml
```
