# Footy Match Notes Worker

Stores Footy Match Notes in D1, keyed by the schedule's stable `matchId`.

Each confirmed save increments a revision number and appends the full saved state to `footy_match_note_history`. The revision check rejects stale editor tabs instead of silently overwriting a newer save. Goal/assist lists remain ordered JSON because the application reads and writes them as one note aggregate.

- `GET /health` reports service health.
- `GET /api/match-notes` returns all notes for public Footy rendering.
- `GET /api/match-notes/:matchId` returns one note.
- `PUT /api/match-notes/:matchId` upserts one note after validating the existing Box This Lap manager access token and confirming the manager is an admin.
- `GET /api/ten-out-of-ten` returns every saved 10/10 player performance to an authenticated admin.
- `POST /api/ten-out-of-ten` adds a performance after validating the existing Box This Lap admin access token. Records may include a tracked fixture `matchId`, but manual matches store the same home, away, date, time, and competition fields without one.
- `PUT /api/ten-out-of-ten/:id` updates an existing performance for an authenticated admin.
- `GET /api/seen-matches` returns the admin's saved seen-match list.
- `POST /api/seen-matches` adds a tracked or manually entered seen match.
- `PUT /api/seen-matches/:id` updates the Sports Bar flag or manual fixture details.
- `GET /api/rosters` returns the active season for each team; `includeInactive=1` includes historical seasons.
- `POST /api/rosters/sync` performs the scheduled hybrid provider merge using `X-Roster-Sync-Token`. Provider omissions are marked for review rather than removed.
- `POST /api/roster-players` and `PUT /api/roster-players/:id` create or curate season roster entries for an authenticated admin.
- `POST /api/roster-players/:id/media` stores a custom profile or trading-card image in R2. Roster override flags can temporarily use fallback images without deleting the stored custom image; deleting `/media/:kind` permanently removes it.
- `GET /api/match-media` returns the authenticated admin's match-image review stream. Soft Save and Seen through here are manager state; Hard Save copies an eligible official-club image to the match-media R2 bucket.
- `POST /api/match-media/scans` creates a manual scan and dispatches `update-footy-media.yml`. Getty candidates remain embed-only and cannot be copied to R2.
- `/api/match-media/sync/scans/:id/*` accepts collector results authenticated by `X-Media-Sync-Token`; `/media/match-images/:id` serves Hard Saved images with immutable caching.

Dev and production intentionally share this Worker and database. Apply migrations with `npx wrangler d1 migrations apply DB --remote`, import the legacy sheet with `scripts/migrate-footy-match-notes.mjs`, and deploy with `npx wrangler deploy` from this directory.

The Google Sheet is a legacy migration/rollback source after cutover. Editing its Match Notes tab no longer changes the site.

## Roster deployment

Roster metadata uses migration `0006_rosters.sql`; uploaded images use the `box-this-lap-footy-roster-media` R2 bucket. Provision and deploy in this order:

```powershell
npx wrangler r2 bucket create box-this-lap-footy-roster-media
npx wrangler d1 migrations apply DB --remote
npx wrangler secret put ROSTER_SYNC_TOKEN
npx wrangler secret put FOOTBALL_DATA_API_KEY
npx wrangler deploy
```

Run those commands from `workers/footy-notes`. Configure the same random sync token as the repository secret `FOOTY_ROSTER_SYNC_TOKEN`, and reuse the repository's free football-data.org key for `FOOTBALL_DATA_API_KEY`. Set `FOOTY_ROSTER_SYNC_ENDPOINT` to this Worker's public origin. Run `node scripts/update-footy-rosters.mjs --seed-legacy` once from the repository root with those environment variables to migrate current Sheet records and local image paths. The `Update Footy Rosters` workflow then uses football-data.org as the authoritative club squad, TheSportsDB for image enrichment and club fallback data, and the official U.S. Soccer roster pages for USMNT and USWNT squads; the Sheet is no longer a live dependency. European club seasons use split-year labels such as `2026-27`; MLS and national-team editions use calendar years.

## Match image deployment

Match Images uses migration `0010_match_media.sql` and a separate `box-this-lap-footy-match-media` R2 bucket. It is manual-only: the admin page dispatches the GitHub workflow, and no cron schedule is configured.

```powershell
npx wrangler r2 bucket create box-this-lap-footy-match-media
npx wrangler d1 migrations apply DB --remote
npx wrangler secret put MEDIA_SYNC_TOKEN
npx wrangler secret put GITHUB_ACTIONS_TOKEN
npx wrangler deploy
```

Use a fine-grained GitHub token limited to this repository with Actions write access. Store the same media sync token as repository secret `FOOTY_MEDIA_SYNC_TOKEN`, and set repository secret `FOOTY_MEDIA_SYNC_ENDPOINT` to this Worker's public origin. The initial and subsequent scans examine the latest 30 days, so reruns are safe and can fill galleries that were incomplete earlier.
