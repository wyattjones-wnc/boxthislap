# Fantasy Office data service

This Worker and its D1 database are the source of truth for Fantasy Office 2026 after the legacy Google Sheet import. Public endpoints expose the draft, movie scores, and provisional standings. Authenticated admin endpoints own roster changes, source identities, Award points, audited corrections, and freezes. The Worker cron collects scoring observations automatically; a GitHub Actions updater provides an authenticated manual fallback with `SYNC_SECRET`.

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

## Updater troubleshooting

Skipped scheduled GitHub runs are expected while the Worker owns automatic updates. Do not enable the Actions schedule alongside the Worker cron. Review the Manage page's automatic update history to diagnose the active collector.

For a limited verification of the fallback on current `dev`, run:

```bash
gh workflow run update-fantasy-office.yml --ref dev -f movie_limit=1
```

This updates four metrics for the first configured movie. Limited runs do not open or close the whole-season incident issue. A successful limited run confirms only the selected movies; it is not a full-season health check. A whole-season manual run uses `movie_limit=0` and requires the repository's usage review before execution.

The fallback saves discovered sources and observations one movie at a time to keep Worker requests within the D1 subrequest budget. Each movie has its own ingestion ID; writes are not automatically replayed after a timeout because the server may already have applied them. The report artifact preserves completed movie counts and outcomes, and records the failed stage, movie, and API path if a later request fails. Source failures still fail the run and retain debug responses; successful movies remain saved.

## Non-theatrical movies

In Manage, open a movie and check **Non-theatrical — no box office**, then save. These movies earn only ratings and award points. Domestic gross and number-one weekends contribute no points and are excluded from missing-source and health warnings. Both collectors skip Box Office Mojo discovery, gross, and weekend collection for these movies. Previously saved box office values remain stored so unchecking the option restores theatrical handling.

Apply `0004_non_theatrical.sql` before deploying this Worker version. It adds a boolean column defaulting to theatrical for existing movies; there is no data backfill, index creation, or change to scoring for existing unmarked movies. The frontend exposes the checkbox only after the API returns the new setting, so an older Worker cannot silently ignore a user's selection.

Deployment is manual via `.github/workflows/deploy-fantasy-office-worker.yml`. Review pending migrations and obtain deployment approval first. The expected new migration is only `0004_non_theatrical.sql`: one schema change over the current 55-movie roster and a migration-history entry, with no bulk metric updates or full-season sync. Recurring cron frequency and request budget stay unchanged; marked movies require fewer source fetches. Account-wide usage has not been measured as part of this change. If other migrations are pending, review their impact separately before applying them.
