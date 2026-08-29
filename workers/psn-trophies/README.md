# PSN Trophy Worker

This Worker imports the account's complete PSN trophy library into D1 and serves aggregate stats plus per-game trophies through a read-only public API. Imports use bounded four-title batches so large libraries do not exceed Worker request limits.

The public site remains static. PSN credentials stay in Worker secrets, and the public API is read-only.

## One-time Cloudflare setup

Create the database and replace the placeholder `database_id` in `wrangler.toml` with the returned UUID:

```powershell
npx wrangler d1 create psn-trophies
npx wrangler d1 migrations apply psn-trophies --remote --config workers\psn-trophies\wrangler.toml
npx wrangler secret put PSN_NPSSO --config workers\psn-trophies\wrangler.toml
npx wrangler secret put SYNC_SECRET --config workers\psn-trophies\wrangler.toml
npx wrangler deploy --config workers\psn-trophies\wrangler.toml
```

`PSN_NPSSO` is equivalent to a password. Never put it in a file, command argument, log, frontend bundle, or Git commit. The current `psn-api` documentation says an NPSSO normally needs to be retrieved again after about two months.

`PSN_ACCOUNT_ID` defaults to `me`.

## Renew PSN access and run a sync

Run this from the repository:

```powershell
npm run refresh:psn-auth
```

On Windows, `scripts\refresh-psn-auth.cmd` can also be double-clicked to open a dedicated terminal. The renewal workflow:

1. Opens the official PlayStation site so the owner can sign in and complete any two-factor check.
2. Opens Sony's `ssocookie` endpoint in the same browser session.
3. Accepts only the 64-character NPSSO through a masked terminal prompt.
4. Stores the NPSSO directly as an encrypted Cloudflare Worker secret.
5. Generates and rotates a private manual-sync secret without displaying or saving it.
6. Walks every trophy-title batch automatically and prints the non-secret totals.

The script never asks for, reads, or stores the PSN password or two-factor code. Sony's unofficial authentication session eventually expires, so the owner must repeat the browser login/token-copy step when PSN rejects it; the rest of the renewal is automated.

If the NPSSO upload succeeds but a later step is interrupted, resume without pasting it again:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\refresh-psn-auth.ps1 -UseStoredNpsso
```

An interrupted import can resume at the next unprocessed title without replacing the stored NPSSO:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\refresh-psn-auth.ps1 -UseStoredNpsso -StartOffset 624
```

## Verify locally

```powershell
npm run test:psn
npm run check:psn
npx wrangler d1 migrations apply psn-trophies --local --config workers\psn-trophies\wrangler.toml
```

PSN synchronization still calls the live PSN service. Put local secrets in `workers/psn-trophies/.dev.vars` (explicitly ignored by this repository), then start Wrangler:

```powershell
npx wrangler dev --config workers\psn-trophies\wrangler.toml
```

Trigger one import batch manually. Continue with the returned `nextOffset` until it is `null`:

```text
POST http://localhost:8787/internal/psn/sync?offset=0
Authorization: Bearer <SYNC_SECRET>
```

Read the imported title:

```text
GET http://localhost:8787/api/psn/games/<NP_COMMUNICATION_ID>/trophies
GET http://localhost:8787/api/psn/stats
GET http://localhost:8787/api/psn/status
```

Supported trophy filters are `earned=true|false`, `group=<id>`, `sort=date|id|rarity`, and `order=asc|desc`.

The hourly Cron Trigger advances a persisted title cursor, refreshing the complete current library in roughly one week before starting again. Failed title requests produce a partial sync record while successful titles remain available; authentication or title-list failures are recorded as failed runs.
