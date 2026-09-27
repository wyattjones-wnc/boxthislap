# Fantasy Office data service

This Worker and its D1 database are the source of truth for Fantasy Office 2026 after the legacy Google Sheet import. Public endpoints expose the draft, movie scores, and provisional standings. Authenticated admin endpoints own roster changes, source identities, Award points, audited corrections, and freezes. A GitHub Actions updater submits all other scoring observations with `SYNC_SECRET`.

## Provisioning

1. Create the database with `npx wrangler d1 create fantasy-office` and put its ID in `wrangler.toml`. If the account is at its D1 limit, bind an existing shared database instead; all application tables are prefixed `fantasy_office_`, and the binding must set a dedicated `migrations_table` so migration histories remain isolated.
2. Apply `migrations/0001_initial.sql` locally and remotely.
3. Set the Worker secret with `npx wrangler secret put SYNC_SECRET --config workers/fantasy-office/wrangler.toml` for authenticated manual GitHub fallback runs.
4. Add the same value as the repository secret `FANTASY_OFFICE_SYNC_SECRET`.
5. Deploy the Worker, then run `node scripts/import-fantasy-office-2026.mjs --apply` with a valid manager access token in `FANTASY_OFFICE_ADMIN_TOKEN`.
6. Run the updater once. It discovers Letterboxd, Rotten Tomatoes, and Box Office Mojo pages from each movie title and season year, records confidence metadata, and immediately uses the best matches without overwriting administrator-verified sources.
7. Review the discovered matches on the Fantasy Office Manage page and mark correct sources as verified. Edit only incorrect matches.
8. The Worker cron rotates through a subrequest-budgeted group of films every six hours. Keep the GitHub repository variable `FANTASY_OFFICE_AUTOMATION_ENABLED` false unless moving scheduled ownership back to Actions; the workflow remains a manual fallback.

The importer is idempotent. It may be used to preview the sheet repeatedly, but after the initial applied import the Google Sheet is legacy input and D1 owns the roster.
