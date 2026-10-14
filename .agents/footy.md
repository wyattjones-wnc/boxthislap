# Footy

## Entry Points

- Main and operational React surfaces: [src/features/operational/OperationalPages.tsx](../src/features/operational/OperationalPages.tsx) and [src/features/operational/FootyOperationalPages.tsx](../src/features/operational/FootyOperationalPages.tsx).
- Fixture selection and followed-team behavior: [modules/footyFixtures.js](../modules/footyFixtures.js), [modules/footyMatchActions.js](../modules/footyMatchActions.js), and [modules/followedTeams.js](../modules/followedTeams.js).
- Published schedule and canonical teams: [data/footy-schedule.json](../data/footy-schedule.json), refreshed by [scripts/update-footy-schedule.mjs](../scripts/update-footy-schedule.mjs).
- Notes, seen matches, 10/10 performances, rosters, and roster media: [workers/footy-notes/src/index.js](../workers/footy-notes/src/index.js).
- Followed teams and match opt-ins: [workers/rankings/src/index.js](../workers/rankings/src/index.js).
- Web Push scheduling: [workers/footy-push/src/index.js](../workers/footy-push/src/index.js) and [service-worker.js](../service-worker.js).

## Invariants

- Fixture identity uses stable `matchId`; team selection and notification delivery use canonical `homeTeamId` and `awayTeamId`.
- A manager with no personal followed-team rows inherits the configured default manager order; an empty save resets to that default.
- Match notes use revision checks and immutable history to reject stale writes.
- Push delivery evaluates current followed teams and explicit match opt-ins immediately before sending, then deduplicates by manager, fixture, and offset.
- Dev and production share Footy persistence; channel-specific schedule and destination URLs still remain distinct.

## Detailed Reference

- Team following and rollout: [docs/manager-team-following.md](../docs/manager-team-following.md).
- Push setup and deduplication: [docs/footy-push-notifications.md](../docs/footy-push-notifications.md).
- Image editing, shared metadata, and R2 usage gates: [images.md](images.md).
- Notes and roster API: [workers/footy-notes/README.md](../workers/footy-notes/README.md).

## Regression Risks

- Matching teams by display name instead of canonical ID.
- Sending duplicate or wrong-channel notifications, or bypassing manager/device opt-outs.
- Replacing curated roster overrides during provider sync or treating provider omissions as deletions.
- Extending the legacy controller when a React-owned surface can own the behavior.

## Focused Validation

- `npm run test:footy-following`
- `npm run test:footy-rosters`
- `npx vitest run src/features/operational/OperationalPages.test.tsx`

## Schedule Status Reconciliation

- `scripts/footy-status-reconciliation.mjs` checks ESPN scoreboards during each schedule refresh, after primary schedules are built. It matches a unique home/away pairing on the same UTC date within the competition; it never infers postponement from a missing result or an elapsed kickoff.
- Supported competition codes: PL, ELC, PD, BL1, SA, FL1, PPL, DED, CL, EL, MLS. Checks cover 14 days before through 7 days after the refresh, with one request per league/date and no requests for completed or live fixtures. Other competitions retain their existing provider status handling.
- ESPN postponement and suspension reports override pending primary statuses. Abandonment maps to the existing suspended/no-kickoff behavior, with the exact ESPN status retained in `statusVerification`. Evidence includes event ID, URL, and verification time. Verified interruptions survive stale primary data and verifier failures until the kickoff changes or the primary provider reports match progress.
- Verification failures appear in schedule errors with partial status. Missing or ambiguous event matches leave the primary status unchanged. Status lookups bypass the API disk cache; the overnight workflow also explicitly refreshes provider caches. This cannot detect an interruption absent from both providers.
- Validate with `npm run test:footy-following` and `node scripts/test-update-footy-schedule.mjs`.
