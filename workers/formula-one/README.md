# Formula 1 data service

This Worker is the D1-backed source of truth for modular Formula 1 data entry. Provider fetches are manual and always land in `needs_review`; qualifying, sprint, and race approvals are independent. Weekly scoring is published only after qualifying and race are both approved. Driver of the Day and other subjective or unsupported round facts remain manual.

## Admin-preview rollout

The new Weekly controls and native picks are intentionally visible only to admins. Non-admin managers continue using the existing Google Form/Sheet flow. This must be changed later, after the 2026 migration and score totals are reconciled and deadline-based pick privacy is verified. At that point, expose native picks to signed-in managers and retire the old form flow deliberately.

## Provisioning and migration

1. The `formula-one` D1 database is provisioned and its ID is recorded in `wrangler.toml`.
2. `migrations/0001_initial.sql` is applied locally and remotely.
3. Set `GOOGLE_SHEETS_EXPORT_KEY` as a Worker secret. Deploy `scripts/formula-one-export-webapp.gs`, set its matching script properties, and configure `GOOGLE_SHEETS_EXPORT_ENDPOINT`.
4. Run `node scripts/migrate-formula-one-2026.mjs` to refresh the reviewable payload. Build an idempotent D1 seed with `node scripts/build-formula-one-seed-sql.mjs` when a direct database import is preferable to the authenticated API.
5. Reconcile every imported weekly score against the current workbook before expanding access.
6. The Worker and `FORMULA_ONE_ENDPOINT` are deployed. Keep the UI admin-only for the initial validation period.

No cron trigger is configured. Admins explicitly fetch a session and explicitly approve it.
