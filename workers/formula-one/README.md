# Formula 1 data service

This Worker is the D1-backed source of truth for modular Formula 1 data entry. Provider fetches are manual and always land in `needs_review`; qualifying, sprint, and race approvals are independent. Weekly scoring is published only after qualifying and race are both approved. Driver of the Day and other subjective or unsupported round facts remain manual.

## Admin-preview rollout

The new Weekly controls and native picks are intentionally visible only to admins. Non-admin managers continue using the existing Google Form/Sheet flow. This must be changed later, after the 2026 migration and score totals are reconciled and deadline-based pick privacy is verified. At that point, expose native picks to signed-in managers and retire the old form flow deliberately.

## Provisioning and migration

1. Create the `formula-one` D1 database and replace the placeholder ID in `wrangler.toml`.
2. Apply `migrations/0001_initial.sql` locally, verify it, then apply it remotely.
3. Set `GOOGLE_SHEETS_EXPORT_KEY` as a Worker secret. Deploy `scripts/formula-one-export-webapp.gs`, set its matching script properties, and configure `GOOGLE_SHEETS_EXPORT_ENDPOINT`.
4. Run `node scripts/migrate-formula-one-2026.mjs` to create the reviewable payload. After checking it, rerun with `--apply` and temporary `FORMULA_ONE_ENDPOINT` / `FORMULA_ONE_ACCESS_TOKEN` environment variables.
5. Reconcile every imported weekly score against the current workbook before enabling the endpoint in `modules/siteConfig.js`.
6. Deploy the Worker, set `FORMULA_ONE_ENDPOINT`, and keep the UI admin-only for the initial validation period.

No cron trigger is configured. Admins explicitly fetch a session and explicitly approve it.
