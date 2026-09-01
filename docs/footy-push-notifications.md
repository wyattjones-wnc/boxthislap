# Footy Push Notifications

This setup uses a Cloudflare Worker with KV and the shared Rankings D1 database so manager-specific Footy match notifications can be delivered even when the site is not open.

## Pieces

- `service-worker.js`: receives push events and displays pending notifications.
- `workers/footy-push`: Cloudflare Worker that stores authenticated manager push subscriptions, checks the Footy schedule, resolves current followed-team recipients from D1, and sends Web Push wakeups.
- `FOOTY_PUSH_ENDPOINT` in `modules/siteConfig.js`: the deployed Worker URL used by the site.
- `FOOTY_PUSH_ENDPOINT` in `service-worker.js`: the same deployed Worker URL used by the background service worker.
- `FOOTY_SCHEDULE_URL` / `NOTIFICATION_URL`: production schedule and destination.
- `FOOTY_DEV_SCHEDULE_URL` / `DEV_NOTIFICATION_URL`: development schedule and destination. The Worker selects these when the subscription's saved page URL is under `/boxthislap/dev/`.

## Cloudflare Setup

1. Create a Cloudflare KV namespace.
2. Put the namespace ID into `workers/footy-push/wrangler.toml`.
3. Generate VAPID keys:

   ```bash
   node scripts/generate-vapid-keys.mjs
   ```

4. In the Worker, set secrets:

   ```bash
   wrangler secret put VAPID_PUBLIC_KEY
   wrangler secret put VAPID_PRIVATE_KEY
   ```

5. Update `VAPID_SUBJECT` in `wrangler.toml` to a real `mailto:` or website URL.
6. Set `AUTH_SECRET` to the same secret used by the Rankings Worker:

   ```bash
   wrangler secret put AUTH_SECRET
   ```

7. Apply `workers/rankings/migrations/0005_manager_followed_teams.sql` to the shared `rankings` D1 database.
8. Deploy from `workers/footy-push`:

   ```bash
   wrangler deploy
   ```

9. Copy the deployed Worker URL into both:

   - `modules/siteConfig.js` as `FOOTY_PUSH_ENDPOINT`
   - `service-worker.js` as `FOOTY_PUSH_ENDPOINT`

Main and dev use the same Worker and VAPID keys. Each service-worker scope creates its own browser subscription; the Worker stores the subscribing page URL and sends that subscription alerts from the matching schedule with a matching notification link.

## Cron

The first cron is set to every 15 minutes:

```toml
crons = ["*/15 * * * *"]
```

The Worker is designed so this can later become every minute:

```toml
crons = ["* * * * *"]
```

If you change to one minute, also set:

```toml
NOTIFICATION_LOOKBACK_MINUTES = "2"
```

For the 15 minute schedule, the current lookback is 16 minutes so a run that starts slightly late still catches due notifications.

## How Duplicate Prevention Works

Each sent alert writes a KV key using:

```text
sent:{matchKey}:{offset}:{managerId}
```

The event's canonical home and away team IDs are intersected with each manager's current followed teams immediately before delivery. A manager following both teams still receives one alert for the event and offset.

Offsets:

- `2h`
- `1h`
- `start`

## iPhone Notes

On iPhone, Web Push requires:

- iOS/iPadOS 16.4 or later.
- The site saved to the Home Screen.
- Notification permission granted from a direct tap on the Footy bell button.

## Testing

After deploy, use:

```bash
curl https://YOUR_WORKER.workers.dev/health
curl https://YOUR_WORKER.workers.dev/vapid-public-key
```

To manually run the check:

```bash
curl -X POST https://YOUR_WORKER.workers.dev/run
```

If `ADMIN_RUN_TOKEN` is set as a Worker secret, include:

```bash
curl -X POST https://YOUR_WORKER.workers.dev/run -H "Authorization: Bearer TOKEN"
```
