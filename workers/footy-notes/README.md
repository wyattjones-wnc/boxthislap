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

Dev and production intentionally share this Worker and database. Apply migrations with `npx wrangler d1 migrations apply DB --remote`, import the legacy sheet with `scripts/migrate-footy-match-notes.mjs`, and deploy with `npx wrangler deploy` from this directory.

The Google Sheet is a legacy migration/rollback source after cutover. Editing its Match Notes tab no longer changes the site.
