# Fantasy Office data service

This Worker and its D1 database are the source of truth for Fantasy Office 2026 after the legacy Google Sheet import. Public endpoints expose the draft, movie scores, and provisional standings. Authenticated admin endpoints own roster changes, source identities, Award points, audited corrections, and freezes. A GitHub Actions updater submits all other scoring observations with `SYNC_SECRET`.

## Provisioning

1. Create the database with `npx wrangler d1 create fantasy-office` and put its ID in `wrangler.toml`.
2. Apply `migrations/0001_initial.sql` locally and remotely.
3. Set the Worker secret with `npx wrangler secret put SYNC_SECRET --config workers/fantasy-office/wrangler.toml`.
4. Add the same value as the repository secret `FANTASY_OFFICE_SYNC_SECRET`.
5. Deploy the Worker, then run `node scripts/import-fantasy-office-2026.mjs --apply` with a valid manager access token in `FANTASY_OFFICE_ADMIN_TOKEN`.
6. Review and save exact source URLs on the Fantasy Office Manage page before enabling scheduled updates.
7. Set the GitHub repository variable `FANTASY_OFFICE_AUTOMATION_ENABLED` to `true`; until then, only manual workflow dispatches run.

The importer is idempotent. It may be used to preview the sheet repeatedly, but after the initial applied import the Google Sheet is legacy input and D1 owns the roster.
