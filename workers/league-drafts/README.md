# 2027 league drafts on dev

This service owns the 2027 Fantasy Office and World Cup asynchronous drafts. The site has Draft overview, Active drafting, and admin-only Manage pages for each league, plus a League Drafts card in Manager Hub. Earlier leagues keep their existing data and workflow.

The shipped configuration names the Worker `box-this-lap-league-drafts-dev`, uses the `dev` data namespace, and links notifications to `/boxthislap/dev/`. Production frontend pages do not connect to the dev draft service. No drafts are created automatically.

## State and authentication

`league_drafts_state` is a new, prefixed table in the existing Formula One D1 database. It does not change Formula One or Fantasy Office tables. Migration history is isolated as `league_drafts_dev_migrations`.

Each draft is a bounded JSON aggregate containing its configuration, scheduled turns, picks, retry receipts, notification preferences, audit history, and outbox. A conditional single-row update checks revision and prior state and saves the entire aggregate atomically. There is no independently editable Taken flag: ownership is derived from accepted picks. This is intentionally simpler than normalized cross-table transactions for small manager leagues. Limits are 16 participants, 24 rounds, and 500 options per draft.

The Rankings service verifies manager access tokens and supplies active manager accounts. Admin ID is configured server-side, initially `6`. Private Draft Lists and 2026 rosters are separate services and are not modified by these drafts.

## Local checks

From the repository root:

```bash
npm run test:league-drafts
npm run check:league-drafts
npx vitest run src/features/competition/LeagueDrafts src/features/competition/leagueYears.test.tsx src/app/routes.test.ts
npm run check:types
npm run build
```

Backend tests use Node 22's SQLite engine with a D1-shaped adapter to exercise the actual migration and conditional-update SQL, as well as authenticated requests. They do not use remote league data.

For a local backend with the real manager authentication service:

```bash
npx wrangler d1 migrations apply formula-one --local --config workers/league-drafts/wrangler.toml
npm run dev:league-drafts
```

Run the frontend in another terminal:

```bash
VITE_LEAGUE_DRAFTS_ENDPOINT=http://127.0.0.1:8787 npx vite --host 127.0.0.1 --port 8000
```

Port 8000 matches the existing authentication service's allowed local origins. Wrangler needs authorized Cloudflare access for the remote authentication binding. Draft state remains local. Do not set `DRAFT_PUSH_SECRET` locally unless deliberately testing real browser delivery. Local draft picks do not need push configured.

## Hosted dev rollout

Publishing requires explicit authorization under `AGENTS.md`. The dev rollout is authorized. The isolated schema migration was applied on 2026-10-09; deployment results are recorded with the release.

1. Apply only this service's migration history:

   ```bash
   npx wrangler d1 migrations apply formula-one --remote --config workers/league-drafts/wrangler.toml
   ```

2. If browser alerts are being tested, provision the same newly generated `DRAFT_PUSH_SECRET` in both Workers through secure secret input:

   ```bash
   npx wrangler secret put DRAFT_PUSH_SECRET --config workers/league-drafts/wrangler.toml
   npx wrangler secret put DRAFT_PUSH_SECRET --config workers/footy-push/wrangler.toml
   ```

   Do not put its value in the frontend, repository, documentation, or logs. Existing Footy push VAPID keys and authentication secret remain in that Worker.

3. Deploy the backward-compatible Footy push extension, then the new draft Worker:

   ```bash
   npx wrangler deploy --config workers/footy-push/wrangler.toml
   npx wrangler deploy --config workers/league-drafts/wrangler.toml
   ```

4. Publish the frontend through the existing `dev` branch Pages workflow, following the repository's version bump and integration instructions. Do not publish `main`.
5. Verify the draft Worker `/health`. It should report `environment: dev`; `pushConfigured` confirms that the sender has its service binding and secret. Complete an actual opt-in browser test to verify the recipient Worker and VAPID delivery as well.

Core drafting and automatic Manager Hub alerts work without the push secret. Browser delivery requires the push extension and matching secret on both Workers. Migration or Worker deployment alone does not update the website.

## Manual dev test walkthrough

1. Open Leagues on dev. In 2026 it must initially show 2026. Select **2027 (Upcoming)** explicitly and open either league.
2. Signed out, open Draft and confirm the login prompt. Signing in from that action should return to the same draft page.
3. As admin, open Manage. Create a draft with four managers, choose two rounds, adjust the seeds, and use **Fill with sample test options** or enter distinct options one per line.
4. Save setup and inspect the schedule preview. Publish, subscribe from Draft or Manager Hub, and then start with the explicit confirmation.
5. On Manage, use **Test select** and **Confirm test pick** to simulate the current manager. This action is server-restricted to dev administrators and is labelled in selections and audit history. It does not change your logged-in identity.
6. Open Active → Resource in another browser or tab. Picks must acquire a Taken by label, and selecting them again must be disabled. The submitting view updates immediately; other views refresh within about ten seconds or on focus. Same-browser invalidation accelerates updates across tabs.
7. Run through the fourth and fifth picks and confirm that the last seed gets consecutive turns at the snake boundary. Run through all eight picks and confirm completion.
8. Before completing another test draft, pause and confirm picks are blocked; undo with a reason, confirm the option becomes available and the draft stays paused, then resume explicitly.
9. Test an ordinary participant account: only its current turn can submit. A nonparticipant can observe but cannot select. An unsubscribed participant can still draft. Manage must be hidden and rejected for non-admins.
10. Subscribe in the banner, verify the same device-alert setting in Manager Hub, and unsubscribe there; Hub alerts must remain visible. Browser push is a separate explicit action. With the browser closed, verify a turn alert deep-links to the correct draft on dev. Turning draft alerts off must preserve Footy/Formula One subscriptions. Switch account or sign out and verify the previous manager's draft alerts are suppressed.
11. Repeat with three managers and confirm the seed order repeats every round. Repeat in the other 2027 league. Revisit older leagues and private Draft Lists to confirm their behavior.

Use visibly named test drafts and sample options. Admin test selections are real writes within the dev draft namespace, not scoring updates. Cancellation retains picks and ownership for audit; create another draft for a clean run.

## Notification delivery

Participants automatically get draft start, current turn, pause/resume, cancellation, and completion events in Manager Hub. Existing drafts also show a current-turn alert without needing to recreate the draft. Subscribing controls device push only. Account push preferences are shared between the banner and Hub; browser capability is per device.

The retry cron runs 96 times daily and reads at most 200 indexed dev draft rows per run (19,200 rows/day at the retention limit; initially zero draft rows). It writes only when delivery state changes. The schema migration created an empty table and index without rewriting existing league data.

The outbox is saved with each accepted change, dispatched after commit, and retried every 15 minutes. Obsolete turn events are suppressed before retry. The shared Footy push service accepts draft events only with the shared secret, limits recipients to the specified manager and environment, merges pending alerts, and deduplicates per device/event. Delivery is best-effort: KV and Web Push are not an exactly-once queue. Notification failures never roll back picks.

The service worker retains the currently signed-in manager ID in its own scope and suppresses mismatched draft alerts after account changes, including while the page is closed. Footy and Formula One alerts retain their existing behavior.

## Current limits and follow-up work

- The two league names and year are supported; real eligible resources, scoring rules, and roster categories are not inferred.
- Multiple independent drafts per league are supported. Custom names and resource matches share normalized duplicate checks. Resource entries may include release dates (unknown dates remain TBA), editable on Manage without changing turn order. Option availability is scoped to each draft; shared pools across drafts are a later extension.
- Resources are managed lists on the website. Import/export and live writeback to external spreadsheets are not included.
- No deadlines, automatic skipping, preference queues, trades, or email delivery.
- Draft configuration is editable before initiation and locked afterward. Available recovery actions are pause, resume, latest-pick undo, and cancellation; there is no destructive reset/delete.
- The aggregate design is intended for small leagues, not hundreds of concurrent participants. Split normalized history/outbox tables if volume requires it.
- Listing and notification retries inspect the most recent 200 drafts in the environment. Review retention/archival before exceeding that operational limit.
- Production drafting must be configured separately. Do not rename the dev service or point production at its namespace as a shortcut.

## Draft overview and Active drafting

Draft is the first league tab: it shows the open-draft banner and each participating manager’s round-by-round choices. Participating managers can follow **Go to drafting** to Active. Active stays visible while any draft is active or paused, then hides after completion/cancellation. Direct links to ended drafts show a link back to the overview.

Active has Pick and Resource tabs. Pick accepts any nonempty name (up to 200 characters), shows matching resource suggestions as you type, and confirms before submitting. Exact normalized resource matches claim that resource entry; unlisted names are recorded directly without being added to the resource. Names already picked cannot be selected again, including case/spacing/Unicode variants. Retry receipts cover both paths and survive undo.

Resource shows all options, release dates, Taken labels, and per-entry Draft buttons. Dates display as TBA until supplied by the admin. Setup accepts `Movie name | YYYY-MM-DD` per line; Manage → Resource release dates can maintain dates after start without altering picks or schedule. Resources are optional; publish/start no longer require enough resource entries for every turn. Existing draft data needs no migration or reset.
