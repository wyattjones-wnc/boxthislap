# Next Items Worker

Stores the Next, Want, and To Do pages in D1. Reads are public; writes require an existing Box This Lap manager access token and admin manager ID. IDs are assigned by D1 as ordinary sequential integers, and revision checks reject stale edits. Moving Want to To Do is one atomic D1 batch, so both records change or neither does.

Dev and production intentionally share this Worker and database. The Google Sheet remains a rollback source after cutover, but editing its Next, Want, or To Do item tabs no longer changes the site.

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

Migration `0002_source_match.sql` records the stable Footy match ID on exported fixtures and prevents the same match from being added twice.

Migration `0003_want_items.sql` moves the Want catalog, ordering, prices, and status fields into D1. For the initial import:

```powershell
node scripts\migrate-want-items.mjs --output workers\next-items\legacy-want-import.sql
npx wrangler d1 execute DB --remote --config workers\next-items\wrangler.toml --file workers\next-items\legacy-want-import.sql
node scripts\migrate-want-items.mjs --verify https://box-this-lap-next.boxthislap.workers.dev
```

Migration `0004_todo_items.sql` moves the To Do catalog, hierarchy, ordering, hours, images, and status fields into D1. Apply the schema and import the existing sheet before deploying the frontend cutover:

```powershell
npx wrangler d1 migrations apply DB --remote --config workers\next-items\wrangler.toml
node scripts\migrate-todo-items.mjs --output workers\next-items\legacy-todo-import.sql
npx wrangler d1 execute DB --remote --config workers\next-items\wrangler.toml --file workers\next-items\legacy-todo-import.sql
npx wrangler deploy --config workers\next-items\wrangler.toml
node scripts\migrate-todo-items.mjs --verify https://box-this-lap-next.boxthislap.workers.dev
```

Delete `legacy-todo-import.sql` after the import; generated legacy import files are ignored by Git.
