# Collectibles Worker

Serves the public monster-truck catalog and admin-protected personal collection state from the existing `rankings` D1 database.

## Deploy

```powershell
npx wrangler d1 migrations apply rankings --remote --config workers/collectibles/wrangler.toml
npx wrangler deploy --config workers/collectibles/wrangler.toml
```

The Worker verifies write tokens through the existing `box-this-lap-rankings` service binding. Catalog reads are public; collection mutations and exclusion changes require manager ID `6`.

The first catalog load can be started with the **Update Collectibles Catalog** GitHub Actions workflow after its three Cloudflare secrets are configured.
