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
