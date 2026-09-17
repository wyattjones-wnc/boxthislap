# Formula 1 data service

This Worker is the D1-backed source of truth for modular Formula 1 data entry. A round fetch checks qualifying, sprint when applicable, and race data; every available session lands in `needs_review`, and approvals remain independent. Weekly scoring is published only after qualifying and race are both approved. Driver of the Day and other subjective or unsupported round facts remain manual.

Qualifying imports preserve Q1, Q2, and Q3 times. The review page shows an unadjusted teammate comparison using each driver's last completed qualifying session and an adjusted comparison using the latest session in which both teammates recorded a time. Season summaries keep both measurements visible rather than replacing the raw session times.

The service stores the reusable facts (session positions, points, laps, qualifying times, and manual round facts) and derives podium/pole/progression flags, teammate head-to-heads, adjusted sprint points, and winner comparisons for a selected season. Main and Weekly exports are separate full-season operations; the Apps Script writes them to year-prefixed tabs so another season does not overwrite the prior one.

## Weekly entry rollout

Signed-in managers make native P1, P2, P3, and wildcard choices on the Weekly page. The manager endpoint returns only that manager's entries, together with round deadlines and eligible driver rosters. Admins continue to see every manager and can make corrections from the Manage page.

## Provisioning and migration

1. The `formula-one` D1 database is provisioned and its ID is recorded in `wrangler.toml`.
2. `migrations/0001_initial.sql` is applied locally and remotely.
3. Set `GOOGLE_SHEETS_EXPORT_KEY` as a Worker secret. Deploy `scripts/formula-one-export-webapp.gs`, set its matching script properties, and configure `GOOGLE_SHEETS_EXPORT_ENDPOINT`.
4. Run `node scripts/migrate-formula-one-2026.mjs` to refresh the reviewable payload. Build an idempotent D1 seed with `node scripts/build-formula-one-seed-sql.mjs` when a direct database import is preferable to the authenticated API.
5. Reconcile every imported weekly score against the current workbook before expanding access.
6. Deploy the Worker and configure `FORMULA_ONE_ENDPOINT` for the native Weekly entry UI.

The public `GET /api/seasons/:year/weekly` endpoint exposes scored, completed weekly rounds for the Results standings. Authenticated `GET /api/seasons/:year/weekly/me` exposes only the signed-in manager's entries. Admin reads and Weekly exports include every manager's entries and scores; exports also include season standings and the podium/wildcard scoring reference tables.

The public `GET /api/seasons/:year/calculator` endpoint builds the points-calculator season state directly from approved D1 sessions. It exposes active drivers, completed points, remaining race and sprint rounds, and the standard scoring options without reading the exported Google workbook.

`Fetch round` treats approved sheet/manual sessions as reconciliation candidates: provider rows are merged into the imported session, non-participant classifications are retained, and the session returns to review. Sessions already sourced from Jolpica remain unchanged until explicitly reopened.

No cron trigger is configured. Admins explicitly fetch a session and explicitly approve it.
