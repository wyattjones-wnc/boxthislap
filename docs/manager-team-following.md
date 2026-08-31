# Manager Team Following

Manager followed teams are application state in the shared `rankings` D1 database. The published Footy schedule remains reference data and now includes a canonical `teamCatalog` plus `homeTeamId` and `awayTeamId` on events.

## API and identity

- `GET /api/teams` returns active supported competitions and canonical teams.
- `GET /api/me/followed-teams` returns the signed-in manager's private ordered selection.
- `PUT /api/me/followed-teams` atomically replaces that selection and requires its current revision.
- Manager identity always comes from the shared signed access token. The client never supplies a manager ID for preference calls or push subscription ownership.

## Notification trigger inventory

| Trigger | Former lookup | Required event IDs | Deduplication | Updated |
| --- | --- | --- | --- | --- |
| Scheduled Web Push: 2 hours before kickoff | Every active push subscription received every tracked fixture | `homeTeamId`, `awayTeamId` | manager + fixture + `2h` | Yes |
| Scheduled Web Push: 1 hour before kickoff | Every active push subscription received every tracked fixture | `homeTeamId`, `awayTeamId` | manager + fixture + `1h` | Yes |
| Scheduled Web Push: kickoff | Every active push subscription received every tracked fixture | `homeTeamId`, `awayTeamId` | manager + fixture + `start` | Yes |
| In-browser fallback for the same three offsets | Global `teamSchedules` list | manager-selected canonical IDs | browser sent-event key | Yes |

The push Worker reads current D1 relationships immediately before delivery, intersects them with event team IDs, and writes one manager-level sent key. Turning off alerts removes that device subscription, so account/device-level delivery choice still overrides team opt-in.

## Migration and rollout

Migration `0005_manager_followed_teams.sql` creates manager preferences and preserves the former ordered seven-team list for manager `6`. Other managers start empty. Do not dual-write the former Sheet order.

Before the feature is usable in an environment:

1. Apply the Rankings D1 migration.
2. Deploy the Rankings Worker.
3. Set the Footy Push Worker `AUTH_SECRET` to the same value used by Rankings.
4. Deploy the Footy Push Worker with its new shared D1 binding.
5. Publish a schema-version-4 Footy schedule containing the canonical team catalog.
