# 2027 leagues and asynchronous drafts

Status: implementation plan, October 9, 2026. No application changes or deployments are included in this planning task.

Implementation follow-up: the first dev-testable workflow is now implemented in the repository. See `workers/league-drafts/README.md` for rollout, tests, and remaining league-specific decisions. Small-league draft state uses one revision-protected D1 aggregate per draft so selections, ownership, turn advancement, audit, and notification outbox commit atomically. Shared selection pools, category restrictions, external resource writeback, and scoring projections remain follow-up work. Implementation does not publish or initiate a real draft.

## Purpose and confirmed requirements

Introduce a reusable asynchronous league draft system, starting with Fantasy Office 2027 and World Cup 2027. Administrators choose participating managers, set their seed order, configure the draft, and initiate it. Managers make selections during their assigned turns without needing to be online together.

- Each 2027 league has a Draft tab and a dedicated year-specific page.
- The Draft page shows whether a draft has started and the logged-in manager's position in the live turn order.
- Signed-out visitors see a clear login action.
- Managers can subscribe to draft notifications from the draft banner and Manager Hub.
- Drafts with at least four managers use snake order.
- Attached selection resources show claimed options as taken and prevent further selection.
- Every league before 2027 keeps its existing workflow, routes, data, and scoring behavior.
- Adding 2027 to Leagues must not make it the default in 2026. The initial year follows the current calendar year.

The generic draft engine should support other league contexts later through configuration, without building a new turn-management implementation for each league.

## Decisions awaiting confirmation

These are proposed defaults, not additional confirmed requirements. They can be changed independently before their implementation phase.

| Decision                            | Proposed starting point                                                                                                                                |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Order with fewer than four managers | Repeat the seed order each round. Four or more always snake.                                                                                           |
| Manager response                    | One confirmed option selection per scheduled pick.                                                                                                     |
| First notification channels         | Manager Hub activity and optional browser push; email deferred.                                                                                        |
| Pick deadlines                      | No automatic expiry or automatic selection in the first version.                                                                                       |
| Draft visibility                    | Published setup, live progress, and results are public; unpublished admin setup is private.                                                            |
| Notification recipients             | Participating managers and administrators; spectator subscriptions deferred.                                                                           |
| Resource uniqueness                 | One selection per option per draft, unless an explicitly shared selection pool is configured.                                                          |
| World Cup format                    | Confirm whether nations, players, or both are drafted and the intended 2027 competition identity. Preserve the requested league label until clarified. |
| Fantasy Office format               | Confirm picks per manager and any roster categories or eligibility restrictions.                                                                       |

Do not infer tournament dates, squads, eligible movies, scoring rules, or roster limits from the league names. Both leagues can be scaffolded before their resources are finalized, but initiation requires validated settings and eligible options.

## Current repository integration points

- `src/features/competition/CompetitionPages.tsx`: Leagues page and existing league route structures. The Leagues selector currently defaults to a literal `2026`.
- `modules/siteConfig.js`: `FANTASY_LEAGUES_BY_YEAR` currently contains 2024–2026.
- `src/app/routes.ts`, `src/app/App.tsx`, `src/main.tsx`, and `modules/router.js`: navigation scopes, route rendering, and compatibility route registration. Preserve existing hash URLs.
- `script.js`: existing league cards and Manager Hub workflow aggregation. Its league-card opening logic currently recognizes specific years. Move the Leagues card rendering to typed React rather than add more year-specific behavior here.
- `src/features/operational/OperationalPages.tsx`: Manager Hub Notifications card and private Draft List shortcut.
- `workers/rankings`: existing manager authentication and private Draft List storage. Private Draft Lists are preparation tools, distinct from competitive league drafts.
- `workers/fantasy-office`: authoritative Fantasy Office 2026 roster and scoring service. Its existing admin authentication delegates verification to Rankings through a service binding.
- `workers/footy-push`, `service-worker.js`, and `docs/footy-push-notifications.md`: existing browser subscriptions, VAPID delivery, and Footy/Formula 1 topics. Existing scheduled checks run every 15 minutes.
- `docs/frontend-architecture.md`: new UI must use TypeScript/React, TanStack Query, session/permission contexts, shared controls, CSS Modules, and lazy feature loading. New behavior must not extend the monolithic compatibility controller.

## League navigation and year selection

Add Fantasy Office and World Cup entries under 2027. Each links directly to its new Draft page. Keep all earlier entries and destinations intact.

Proposed routes:

- `#fantasy-office-2027-draft`
- `#fantasy-office-2027-resources`
- `#fantasy-office-2027-manage` (admin only)
- `#world-cup-2027-draft`
- `#world-cup-2027-resources`
- `#world-cup-2027-manage` (admin only)

Use Draft, Resources, and Leagues as the initial league tabs, plus Manage for administrators. The Resources tab may use the league-specific label Movies or Players / Nations once the resource format is settled. Add standings and scoring pages only when their 2027 rules are specified; do not point new tabs at 2026 data.

Year selection rules:

1. On a fresh visit to Leagues, select the current year using the agreed site timezone, initially UTC.
2. If that year has no configured leagues, use the newest configured year at or before the current year. Never choose a future year just because it is the newest entry.
3. If only future years are configured, show the current year with an empty state and allow explicit future-year selection.
4. Offer 2027 as a manual option during 2026, clearly identified as upcoming.
5. Preserve a manager's manual year choice during navigation within the current visit. A fresh visit defaults to the current year; do not persist a future selection as the new initial default.
6. On January 1, 2027, a fresh visit defaults to 2027. A direct league URL always opens its explicit year.

Extract and test this rule as a small shared year resolver. Do not change the separate Manager Hub results-year filter incidentally.

## Draft page and banner

The page contains a status banner, turn order, available options, and pick history. Where a league has multiple drafts, provide a draft selector or separate clearly named panels; each draft has its own managers, schedule, settings, and progress.

| State                       | Banner content and actions                                                                                                     |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| No published draft          | “A draft has not been scheduled.” Admin sees Create draft.                                                                     |
| Published, not started      | Draft name, participants, seed order, and “Waiting for the admin to start.” Eligible managers can subscribe before initiation. |
| Live, signed out            | Current public turn and “Log in to see your position and make your pick.” Login returns to this draft.                         |
| Live, manager's turn        | “Your turn,” round and overall pick, picks remaining, Make selection, and notification settings.                               |
| Live, waiting participant   | Current manager, “Your next pick is #8 — 2 selections before you,” seed number, and notification settings.                     |
| Live, nonparticipant        | Public progress and “You are not participating in this draft.” No selection controls.                                          |
| No personal picks remaining | “Your selections are complete,” with the manager's picks and continuing league progress.                                       |
| Paused                      | Reason, preserved current turn, and disabled selection controls. Admin sees Resume.                                            |
| Completed                   | Completion status, final selections, and View results. No live-turn prompts.                                                   |
| Cancelled                   | Cancellation reason, retained history, and no selectable options.                                                              |
| Loading or unavailable      | Explicit loading/error state with retry. Do not present missing data as “not started.”                                         |

Show the live banner at the top of the Draft page and reuse a compact version on the league's resource page. This keeps managers aware of their turn while browsing choices. A compact banner on any later 2027 league tabs is recommended.

Calculate position from the remaining pick schedule, not the original seed alone. At a snake boundary the same manager can have consecutive turns. If their current and next pick are consecutive, say “You have another pick immediately after this one.”

On mobile, put the banner and selection action first. Use a readable list or horizontally scrollable board for the order and history. Announce meaningful turn changes through accessible live text without announcing every background refresh. Status must be understandable without relying on color.

## Administrator workflow

1. Create a draft under a specific league and year, with a descriptive name and resource type.
2. Select managers using their stable account IDs; display names are labels only.
3. Set a complete seed order using accessible move controls. Optional drag-and-drop can supplement those controls. Randomized ordering can be added later.
4. Configure the number of rounds/picks and any category constraints. For at least four managers, snake is enforced and cannot accidentally be changed to linear.
5. Attach or create the resource pool. Validate stable option IDs, eligibility, duplicate identities, and sufficient legal choices for the configured draft.
6. Preview every scheduled pick, including snake boundaries, before publishing or starting.
7. Publish setup so managers can inspect the order and subscribe. Start is a separate explicit action; publishing does not open the first turn.
8. Start the draft. Snapshot participating managers, seeds, rules, and the generated pick schedule. Assign the first turn and create notification events.

Before initiation, setup can be edited. Once started, participant order and draft rules are locked; changes require a deliberate reset or a future explicit amendment workflow. Do not silently regenerate a live schedule.

Initial admin recovery controls: pause/resume, cancel with reason, and undo the latest pick with an audit reason. Undo pauses the draft, releases that option, restores the affected turn, and invalidates outdated notifications. Resume is explicit. Cancelling preserves existing claims and history until an explicit release/reset operation; it must not silently make selected options available again.

An admin making a pick for a manager should be a separate, visibly attributed override requiring a reason. Never treat ordinary admin identity as the current manager's identity. Automatic skipping, trades, and timer-based selections are deferred.

## Manager selection and shared resources

During their turn, a manager browses/filter options, selects one, reviews a confirmation containing the option and pick number, and submits. Browsing is open to other viewers, but submitting a selection is authorized only for the current participant.

Each option has a stable ID, name, type, display metadata, and eligibility state. Draft ownership is represented by the accepted pick; resource pages derive Available / Taken from that state. Show Taken by manager, round, and pick number with a link to the draft history where useful.

- Disable taken options and explain their ownership.
- Recheck availability on confirmation; a previously rendered page is not authoritative.
- If a stale selection loses a race, refresh availability and show a clear message without advancing the manager's turn.
- Reflect an accepted pick on the draft and resource page, including when the resource was open in another tab.
- Do not allow freeform resource text to bypass option uniqueness. Contexts without a prepared resource can use admin-created options initially; a different response mode is a later extension.
- Keep options with existing picks identifiable even if upstream names or metadata change. Withdrawal is an eligibility update, not destructive deletion.

An external spreadsheet or static document cannot enforce live availability by itself. Import or reference its options through the authoritative draft service and render their status on the website. Writing ownership badges back to an external resource is an optional integration with separate synchronization rules.

Separate drafts may reuse the same catalog while having independent availability. If some drafts must compete for one shared pool, configure a shared pool ID and enforce uniqueness at that scope. Do not infer this from similar option names or league names.

## Manager Hub and notification subscriptions

Add a React-owned League Drafts card to Manager Hub that loads independently of legacy portal sheets. Show each published draft the manager participates in, its year/league, current status, their next pick, Open draft, and notification settings. Put drafts requiring a pick first. Waiting drafts remain visible without being counted as urgent actions.

Keep the existing private Draft List shortcut and existing Notifications card intact. The new card displays authoritative draft state; it is not another editable store. A later typed migration can fold draft activity into the existing Notifications card without adding behavior to `script.js`.

Use one shared subscription control and preference query in the banner and Hub. A change in either location updates the other. Preferences are manager-owned and draft-specific, with explicit off/on states; starting or opening a draft must not automatically opt someone into browser alerts.

Distinguish two concepts:

- Current-turn tasks appear in Manager Hub whenever action is required, regardless of alert subscription.
- Subscribing controls delivery of draft event alerts. Managers may also manage their browser device's push capability independently.

Proposed event choices: draft started, your turn, draft paused/resumed, and draft completed. “Every pick” is an optional later setting. Show a preference summary so a subscription's meaning is clear. A manager subscribing mid-draft while it is already their turn should receive the current actionable alert once.

Browser push reuses the existing subscription and VAPID infrastructure, with a draft topic and manager/draft preferences. Turning draft notifications off must not unsubscribe the device from Footy or Formula 1. Account-level preferences synchronize across devices, but each device must have browser permission and a valid subscription before push can reach it.

Permission requests occur only after a direct click. Show distinct states for enabled, off, blocked, unsupported, and enabled on the account but not on this device. Preserve existing iPhone/Home Screen guidance. Denying push never prevents drafting or viewing Hub tasks. On account changes, clear manager-scoped caches and reconcile subscription ownership so the old account's alerts cannot appear for the new account.

Deliver turn events promptly after accepted picks; do not rely solely on the existing 15-minute cron. Persist an event/outbox entry with the accepted change, trigger a delivery worker after commit, and retain scheduled retries. A notification failure must not roll back a successful pick.

Deduplicate using event ID, recipient, and channel, and use a stable notification tag for browser replacement. On delivery retries, verify the draft revision and actionable turn so a manager is not newly notified for an obsolete turn. Web Push delivery is retryable and best-effort; application deduplication cannot promise absolute exactly-once browser delivery. Consecutive turns should generate a fresh next-turn event after the first pick.

All links open the correct league, year, and draft in the originating site environment. Store delivery status and retry errors separately from pick state. Email requires a provider, verified recipient addresses, and delivery/unsubscribe behavior; it is outside the proposed first version.

## Backend and consistency design

Recommend a dedicated `workers/league-drafts` service with D1-backed draft state. Keep authentication in Rankings and verify access through the established auth service binding. Reuse the existing push service for delivery rather than create another browser subscription system.

Choose the physical D1 database during backend setup according to account capacity. All draft tables, pick claims, schedules, and outbox events must be in the same transaction-capable database. If an existing database is shared, use prefixed tables and an isolated migration history.

Proposed entities:

| Entity                  | Responsibility                                                                      |
| ----------------------- | ----------------------------------------------------------------------------------- |
| Draft                   | League/year, name, lifecycle, rules, pool reference, current pick, revision.        |
| Draft participant       | Manager account ID and seed position.                                               |
| Scheduled pick          | Immutable round, overall position, manager, and any roster category.                |
| Resource option         | Stable catalog identity, display data, type, and eligibility.                       |
| Pool option             | Option membership in a draft's selection pool.                                      |
| Accepted pick           | Scheduled position, manager, option, timestamp, revision, and optional admin actor. |
| Audit event             | Start, picks, pause/resume, cancellation, undo, and configuration changes.          |
| Notification preference | Manager/draft event and channel choices.                                            |
| Outbox event / delivery | Durable event, recipients, revision, retries, and delivery status.                  |

Do not store a separately editable Taken boolean alongside the accepted pick. Use a derived view or a claim record governed by the same atomic operation. Unique constraints prevent a second active claim for an option within its selection scope and a second active result for a scheduled pick.

Every pick request includes the option ID, expected draft revision/turn, and a unique retry key. Manager identity comes from the verified session, never an arbitrary manager ID in the body.

One atomic operation must verify the live revision, active status, current manager, eligible option, roster rules, and availability; record the pick/claim; advance or complete the schedule; increment revision; and persist audit/outbox events. Use D1-supported transactional batches with conditional writes and constraints, proving that a failed revision claim cannot leave a partial pick. Do not implement this as a read followed by unrelated writes or JavaScript checks alone.

Repeated requests with the same retry key return the original result. Stale turns, taken options, or concurrent admin pause/undo return a conflict and current state. Server permission checks apply to every mutation even when buttons are hidden.

Representative API surface:

- `GET /api/leagues/:leagueId/years/:year/drafts`: published drafts for a league season.
- `GET /api/drafts/:draftId`: public state and pick history; unpublished setup restricted to admins.
- `GET /api/drafts/:draftId/options`: authoritative option availability.
- `GET /api/me/drafts`: personalized Hub summaries and actionable turns.
- `POST /api/drafts/:draftId/picks`: current manager's selection.
- `GET/PUT /api/me/drafts/:draftId/notifications`: shared subscription settings.
- Admin create/edit/publish/start/pause/resume/cancel/undo endpoints with revision protection.

Start with TanStack Query polling approximately every 10 seconds while a live draft/resource page is visible, plus refresh on focus, reconnect, and successful mutation. Hub can refresh less frequently. Use bounded backoff on failure and stop background polling for completed drafts. For same-browser tabs, broadcast invalidation events. Polling provides eventual display updates; the server prevents duplicates immediately. If sub-second cross-device updates become necessary, add a push stream/WebSocket layer without changing the authoritative mutation model.

Published pick results may eventually feed a league roster/scoring service. The draft remains authoritative for its picks; use an idempotent projection/import and show synchronization status. A cross-database roster update cannot be part of the pick transaction. Do not duplicate editable rosters or activate existing 2026 scoring/updater behavior for 2027 implicitly.

## Delivery phases and acceptance gates

### Phase 1: 2027 navigation and page foundation

Add the two 2027 league entries, shared current-year resolver, year-specific routes, Draft/Resources shells, and admin-only Manage navigation. Move the Leagues list into React while preserving older card destinations. Define shared typed draft status/banner components.

Acceptance: in 2026 a fresh Leagues visit still selects 2026; 2027 can be opened manually; in 2027 it becomes the initial selection. Existing URLs, old drafts, and admin protection remain intact. New pages show useful empty states without needing a deployed backend.

### Phase 2: Draft backend and administrator setup

Add prefixed migrations, auth integration, lifecycle, participants, seed ordering, schedule generation, resource options, publication, and initiation. Implement conflict protection and audited recovery controls. Provide local fixtures for both contexts.

Acceptance: admins can create and preview a valid draft; non-admin requests are rejected; four-or-more drafts snake correctly; invalid setup cannot start; initiation opens exactly the first scheduled turn; live rules cannot be silently reordered.

### Phase 3: Manager turns and resource availability

Connect the React pages with typed queries/mutations. Add personalized banners, login return, selection confirmation, live availability, history, refresh behavior, and manager summaries.

Acceptance: only the current manager can submit; a successful pick updates ownership and advances exactly once; simultaneous/stale/retried requests do not duplicate or partially record picks; snake boundaries and final completion work; resource views refresh on other devices.

### Phase 4: Manager Hub and alerts

Add the independent League Drafts card and shared notification controls. Extend the existing push service, permissions UI, deep links, durable event dispatch, deduplication, and retries.

Acceptance: both subscription entry points agree; alerts can arrive while the website is closed; an unsubscribed participant can still draft; push failure cannot block a pick; turning off draft alerts preserves existing topics; expired turns are suppressed on retry; Hub loading does not depend on legacy portal success.

### Phase 5: League-specific launch readiness

Finalize Fantasy Office eligibility and roster rules and the World Cup competition/resource definition. Load vetted resources; configure real managers and seeds; verify admin recovery and any scoring projections. Document operations and required migrations/bindings/secrets before deployment.

Acceptance: each league can run an entire draft using its real option types; admins can diagnose stalled turns and notification failures; all pre-2027 regressions pass. Do not initiate a real draft as part of deployment or testing.

## Validation and operational checks

- Date-controlled tests: 2026 with 2027 configured, January 1 rollover, missing current year, manual future selection, and explicit year routes.
- Schedule tests: 2/3 managers under the chosen rule; 4/5 managers under enforced snake; consecutive boundary picks; total rounds and last pick.
- Backend tests: wrong manager, expired login, admin-only routes, simultaneous selections, duplicate retry, stale revision, pause versus pick, undo versus pick, and full rollback on failed writes.
- Resource tests: independent pools, explicitly shared pools if enabled, duplicate canonical options, eligibility changes, and existing picks surviving metadata changes.
- React tests: every banner state, login return, no next pick, confirmation conflict, shared subscription state, and manager-switch cache isolation.
- Browser journeys: signed-out visitor, waiting manager, active manager, admin setup, both league routes, narrow screen, second tab, and delayed network responses.
- Push checks: website closed, denied/unsupported permission, multiple devices, topic independence, event retry, obsolete turn, valid environment deep link, and expired endpoint removal.
- Regression coverage: existing Leagues cards/routes, Fantasy Office 2025/2026, World Cup 2026, Manager Hub portal workflow, private Draft Lists, and Footy/Formula 1 notifications.
- Run focused checks per phase and the required type/lint/build checks for shared routing changes. Use test drafts and local state for mutations; the existing dev site shares some production services.

Record provisioning, migration, Worker deployment, binding, and manual configuration steps separately. Repository implementation does not itself authorize publishing or production data changes.

## First implementation slice

Begin with Phase 1: expose 2027 as an explicit choice while retaining the current-year default, add both Draft pages and their navigation, and render the full banner contract against fixtures. This produces a reviewable website foundation before committing to live draft data or notification infrastructure.

### Updated Draft and Active flow

Draft is now the league overview, with an open-draft banner, participant link to Active, and manager roster choices by round. Active replaces the top-level Resources tab and hides when no draft remains active or paused. Its Pick tab supports free-text names with filtered resource suggestions; Resource lists all titles, release dates, ownership, and Draft buttons. Admins can enter release dates during setup or maintain them on Manage. Resources are suggestions rather than an eligibility whitelist, so drafts can start with an empty resource. Existing state remains compatible.
