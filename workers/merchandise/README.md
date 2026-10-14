# Merchandise Worker

Serves the admin-only merchandise discovery feed and manager seen/wishlist state from the existing `rankings` D1 database.

```powershell
npx wrangler d1 migrations apply rankings --remote --config workers/merchandise/wrangler.toml
npx wrangler deploy --config workers/merchandise/wrangler.toml
```

The Worker verifies access tokens through the existing Rankings service binding and restricts every catalog endpoint to `ADMIN_MANAGER_IDS`. The **Update Merchandise Catalog** workflow saves products and scan dates by default, including on manual runs. Select **Preview only (do not save products or scan dates)** only when troubleshooting or inspecting a scan without importing it.

Scheduled ingestion always attempts Arsenal and Barcelona. The workflow no longer reads the repository variable `MERCHANDISE_SOURCES`, so a historical Barcelona-only setting cannot silently exclude Arsenal. Manual workflow runs can select stores with the `sources` input; direct script runs can still use the `MERCHANDISE_SOURCES` environment variable.

If Arsenal blocks automated access, its scan is recorded as failed and the workflow reports the failure through the incident issue while still importing Barcelona. The admin feed shows each store's last successful scan, so Arsenal's date will remain unchanged until its catalog is accessible and a scan succeeds. Enabling scans does not bypass the store's access restrictions.
