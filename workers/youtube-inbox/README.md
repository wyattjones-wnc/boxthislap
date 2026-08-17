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

The public site is configured for `https://box-this-lap-youtube.boxthislap.workers.dev`. If the Worker is given another hostname, update `YOUTUBE_INBOX_ENDPOINT` in `modules/siteConfig.js`.

## API

- `GET /api/videos?status=new&channel=&limit=100&offset=0`
- `POST /api/videos/:videoId/status` with `{ "status": "ignored" }`
- `POST /api/videos/:videoId/seen-through` marks that video and all newer `new` videos as watched
- `POST /api/youtube/sync`
- `GET /api/youtube/playlists`
- `POST /api/youtube/playlists/:playlistId/videos` with `{ "videoId": "..." }`

Normal inbox operations use D1 only. YouTube is contacted during explicit refreshes and explicit playlist saves.

Each completed manual sync marks any remaining `new` video older than 30 days as watched. Channel filters use stable YouTube channel IDs while displaying the current channel names.
