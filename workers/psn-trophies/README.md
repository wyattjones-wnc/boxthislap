# PSN Trophy Worker

This Worker is the first vertical proof of concept for Box This Lap trophy data. It authenticates with PSN, selects one platinumed title, stores that title and its complete trophy set in D1, and serves the stored trophies at `GET /api/psn/games/:id/trophies`.

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

`PSN_ACCOUNT_ID` defaults to `me`. To force the proof to use a specific platinumed title, add a non-secret `PSN_PROOF_GAME_ID` Worker variable containing its `npCommunicationId`; otherwise the sync selects the first platinumed title returned by PSN.

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
6. Runs the one-game proof import and prints the non-secret result.

The script never asks for, reads, or stores the PSN password or two-factor code. Sony's unofficial authentication session eventually expires, so the owner must repeat the browser login/token-copy step when PSN rejects it; the rest of the renewal is automated.

If the NPSSO upload succeeds but a later step is interrupted, resume without pasting it again:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\refresh-psn-auth.ps1 -UseStoredNpsso
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

Trigger the proof manually:

```text
POST http://localhost:8787/internal/psn/sync
Authorization: Bearer <SYNC_SECRET>
```

Read the imported title:

```text
GET http://localhost:8787/api/psn/games/<NP_COMMUNICATION_ID>/trophies
GET http://localhost:8787/api/psn/status
```

Supported trophy filters are `earned=true|false`, `group=<id>`, `sort=date|id|rarity`, and `order=asc|desc`.

The daily Cron Trigger runs at 08:00 UTC. Failed authentication or PSN requests are recorded in `sync_runs`; existing game and trophy rows remain available.
