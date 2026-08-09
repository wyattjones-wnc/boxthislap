# Footy Push Notifications

This setup uses a Cloudflare Worker with KV so Footy match notifications can be delivered even when the site is not open.

## Pieces

- `service-worker.js`: receives push events and displays pending notifications.
- `workers/footy-push`: Cloudflare Worker that stores push subscriptions, checks the Footy schedule, and sends Web Push wakeups.
- `FOOTY_PUSH_ENDPOINT` in `modules/siteConfig.js`: the deployed Worker URL used by the site.
- `FOOTY_PUSH_ENDPOINT` in `service-worker.js`: the same deployed Worker URL used by the background service worker.

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
6. Deploy from `workers/footy-push`:

   ```bash
   wrangler deploy
   ```

7. Copy the deployed Worker URL into both:

   - `modules/siteConfig.js` as `FOOTY_PUSH_ENDPOINT`
   - `service-worker.js` as `FOOTY_PUSH_ENDPOINT`

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
sent:{matchKey}:{offset}:{subscriptionHash}
```

That means the same match can notify many devices, but each device only gets each offset once.

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
