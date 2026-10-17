# YouTube Inbox Worker

Private API for the TheMonsterManiac YouTube inbox. It stores inbox state in D1, syncs subscription uploads through YouTube Data API v3, and uses a Worker-managed passphrase session for authentication.

## One-time setup

1. Create a Google Cloud OAuth client, enable YouTube Data API v3, and authorize the scope `https://www.googleapis.com/auth/youtube.force-ssl` for the owner account. Obtain an offline refresh token for that client.
2. Create the databases from this directory:

   ```powershell
   npx wrangler d1 create youtube-inbox
   npx wrangler d1 create youtube-inbox-preview
   ```

3. Put the returned IDs and owner Google account email into `wrangler.toml`.
4. Apply the schema:

   ```powershell
   npx wrangler d1 migrations apply youtube-inbox --remote
   npx wrangler d1 migrations apply DB --remote --env preview
   ```

5. Store credentials as Worker secrets (never add their values to this repository):

   ```powershell
   npx wrangler secret put GOOGLE_CLIENT_ID
   npx wrangler secret put GOOGLE_CLIENT_SECRET
   npx wrangler secret put YOUTUBE_REFRESH_TOKEN
   npx wrangler secret put INBOX_PASSPHRASE
   npx wrangler secret put SESSION_SECRET
   ```

6. Deploy with `npx wrangler deploy`.
7. Open the YouTube page and enter the private inbox passphrase. The browser keeps only a signed 30-day token in local storage; it never stores the passphrase.

Each channel refresh scans its uploads from the last seven days so high-volume channels cannot skip videos between refreshes. Adjust `SYNC_LOOKBACK_DAYS` in `wrangler.toml` if that recovery window needs to change.

The public site is configured for `https://box-this-lap-youtube.boxthislap.workers.dev`. If the Worker is given another hostname, update `YOUTUBE_INBOX_ENDPOINT` in `modules/siteConfig.js`.

## API

- `GET /api/videos?status=new&channel=UC...&channel=UC...&limit=100` returns an opaque `nextCursor` (or `null` at the end); pass it as `cursor` with the same filters for the next page. Legacy `offset` remains supported.
- `POST /api/videos/:videoId/status` with `{ "status": "ignored" }`
- `POST /api/videos/:videoId/seen-through` with `{ "videoIds": ["..."] }` marks only the supplied visible `new` videos as watched
- `POST /api/youtube/sync` with `{ "configuredChannelIds": ["UC..."], "removedChannelIds": ["UC..."] }`
- `GET /api/youtube/playlists`
- `POST /api/youtube/playlists/:playlistId/videos` with `{ "videoId": "..." }`

Video status is read directly from D1 in pages of at most 100 videos. The page loads one matching page initially and offers **Load more** for older videos; cursor pagination avoids repeatedly reading earlier pages and remains stable when already displayed videos are marked seen or saved. A page containing only titles excluded by the priority filter is skipped until a match or the end is reached.

Channel, playlist, and last-sync metadata is cached separately in memory and the existing `SNAPSHOTS` KV binding for at most five minutes. Concurrent requests share the metadata load. Each sync batch invalidates this small cache. Video status is never cached server-side, and ordinary status changes and playlist saves do not read or rewrite the legacy full-history snapshot. Cache failures fall back to D1.

Seen-through updates seek only the selected video IDs through the unique video-ID index and primary keys, preserving non-new statuses. The browser divides selections larger than 1,000 into bounded requests and applies each successful batch locally. Playlist saves use indexed video/playlist lookups and one atomic D1 batch for the saved status and action record. Successful mutations invalidate browser fallback snapshots so failed reloads cannot restore an old pre-mutation list. YouTube is contacted during explicit refreshes and explicit playlist saves.

### Updating an existing deployment

Apply `0002_feed_indexes.sql` through D1 migrations **before** deploying this Worker, then publish the frontend. The Worker names these indexes explicitly to avoid planner choices that scan or sort unrelated history. From the repository root:

The canonical deployment is `.github/workflows/deploy-youtube-inbox-worker.yml`. Pushes to `dev` validate only; manual dispatch deploys after verifying the required indexes. Its `apply_migrations` option defaults to false and requires an explicit, recorded usage review before enabling it. It uses repository secrets and records the migration estimate in the run summary. Direct CLI commands below are a fallback when the cloud environment reports its Cloudflare credentials ready.

```sh
npx wrangler d1 migrations apply youtube-inbox --remote --config workers/youtube-inbox/wrangler.toml --env=""
npx wrangler deploy --config workers/youtube-inbox/wrangler.toml --env=""
```

The migration replaces the existing status and channel indexes and adds one index for the All feed. Index maintenance adds write overhead; no video-history cache writes or full-history rebuild queries remain. Multi-channel filters may still examine index entries for excluded channels, and title filtering may require additional pages; a 100-video response is not a promise of exactly 100 billed row reads. The old `youtube-inbox:v1` KV value is no longer used.

Run `npm run test:youtube` for SQLite-backed API/query-plan tests, browser controller tests, and selection validation.

Refresh advances past individual channel, duration, or playlist-metadata failures and returns warnings to the page instead of leaving the sync cursor permanently stalled.

Refresh keeps up to five channel checks in flight, starting another as soon as a slot becomes available. Subscription metadata is written in D1 batches of up to 50 channels instead of one database round trip per channel. These optimizations preserve the seven-day upload scan and the existing YouTube request count and concurrency limit.

Each completed manual sync marks any remaining `new` video older than 30 days as watched. Channel filters use stable YouTube channel IDs while displaying the current channel names.

The public site's published `YouTube` sheet controls which channels are synced, which channels appear for each exact priority selection, and their title filters. Its channel table uses `ID`, `Display Name`, `YouTube Channel ID`, `Priority`, and `IsRemoved`; rows with a true `IsRemoved` value are excluded from display and manual refreshes. Its priority table uses `Priority`, `Description`, and an optional `Filter` column; comma-separated filter phrases use OR matching against video titles.

The `3New` playlist is pinned by its stable YouTube playlist ID so the quick-save button remains available even when YouTube's owned-playlist listing or the D1 cache is stale.
