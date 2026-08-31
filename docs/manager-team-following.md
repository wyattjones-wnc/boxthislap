# Manager Team Following

Manager followed teams are application state in the shared `rankings` D1 database. The published Footy schedule remains reference data and now includes a canonical `teamCatalog` plus `homeTeamId` and `awayTeamId` on events.

## API and identity

- `GET /api/teams` returns active supported competitions, canonical teams, and the admin's current ordered default team IDs for anonymous rendering.
- `GET /api/me/followed-teams` returns the signed-in manager's private ordered selection, or the admin's selection with `usingDefault: true` when the manager has no personal rows.
- `PUT /api/me/followed-teams` atomically replaces that selection and requires its current revision. Sending an empty list resets the manager to the admin default rather than producing an empty Footy view.
- Manager identity always comes from the shared signed access token. The client never supplies a manager ID for preference calls or push subscription ownership.

## Notification trigger inventory

| Trigger | Former lookup | Required event IDs | Deduplication | Updated |
| --- | --- | --- | --- | --- |
| Scheduled Web Push: 2 hours before kickoff | Every active push subscription received every tracked fixture | `homeTeamId`, `awayTeamId` | manager + fixture + `2h` | Yes |
| Scheduled Web Push: 1 hour before kickoff | Every active push subscription received every tracked fixture | `homeTeamId`, `awayTeamId` | manager + fixture + `1h` | Yes |
| Scheduled Web Push: kickoff | Every active push subscription received every tracked fixture | `homeTeamId`, `awayTeamId` | manager + fixture + `start` | Yes |
| In-browser fallback for the same three offsets | Global `teamSchedules` list | manager-selected canonical IDs | browser sent-event key | Yes |

The push Worker reads current D1 relationships immediately before delivery, falls back to the configured default manager when a recipient has no personal selection, intersects the effective selection with event team IDs, and writes one manager-level sent key. Turning off alerts removes that device subscription, so account/device-level delivery choice still overrides team opt-in.

## Migration and rollout

Migration `0005_manager_followed_teams.sql` creates manager preferences and preserves the former ordered seven-team list for manager `6`. Manager `6` is configured as `DEFAULT_FOOTY_MANAGER_ID`; other managers and anonymous visitors inherit that live selection until they save their own. Do not dual-write the former Sheet order.

Before the feature is usable in an environment:

1. Apply the Rankings D1 migration.
2. Deploy the Rankings Worker.
3. Set the Footy Push Worker `AUTH_SECRET` to the same value used by Rankings.
4. Deploy the Footy Push Worker with its new shared D1 binding.
5. Publish a schema-version-4 Footy schedule containing the canonical team catalog.
