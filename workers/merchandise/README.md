# Merchandise Worker

Serves the admin-only merchandise discovery feed and manager seen/wishlist state from the existing `rankings` D1 database.

```powershell
npx wrangler d1 migrations apply rankings --remote --config workers/merchandise/wrangler.toml
npx wrangler deploy --config workers/merchandise/wrangler.toml
```

The Worker verifies access tokens through the existing Rankings service binding and restricts every catalog endpoint to `ADMIN_MANAGER_IDS`. Run the **Update Merchandise Catalog** workflow once in dry-run mode before applying a baseline import.

Scheduled ingestion defaults to Barcelona only. Set the repository variable `MERCHANDISE_SOURCES` to a comma-separated source list after additional adapters pass a manual dry-run; Arsenal should not be enabled while its catalog remains inaccessible to the runner.
