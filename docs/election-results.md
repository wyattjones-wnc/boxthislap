# Election results

The `#election` page displays Alaska and Mississippi's November 3, 2026 general-election Senate races. Alaska's counts are initial ranked-choice tallies. Only explicit AP winner flags receive winner labels.

Source: NPR's public 2026 election results JSON, tabulated by The Associated Press: https://apps.npr.org/2026-election-results/. State silhouettes also come from NPR's election assets. The page links to each state's original reporting.

Run `node scripts/update-election-results.mjs` from the repository root to refresh `data/election-results.json`. Requires Node 22 and curl. The script uses curl to honor managed environments' proxy configuration and rejects missing state results or invalid feeds before writing the snapshot.

The Pages workflow refreshes the dev snapshot before building. Its November 3–10 cron requests a rebuild every 15 minutes (GitHub can delay schedules). **GitHub only registers scheduled workflows on the default branch. Until this workflow is promoted there, dev results refresh on pushes and manual Pages workflow runs.** No credentials or paid AP API key are required. A source failure stops publishing rather than replacing a good snapshot with empty data.

The browser requests the deployed snapshot every minute and on focus. Both snapshot retrieval time and per-race source timestamps are shown. Snapshots older than 30 minutes show a notice; NPR links remain available when loading fails. Production main is not modified by this dev-only implementation.

Each race lists the sum of all reported candidate votes (including Other), and the gap between the two highest-polling named candidates. Candidates are sorted by votes. The aggregate Other category contributes to totals but is not treated as a candidate for the top-two gap.

Admins can mark each race seen. The Rankings Worker stores one shared baseline per election year, state and race in D1 (`0019_election_seen.sql`). Public `GET /api/elections/2026/seen` returns all baselines, including for signed-out viewers. `PUT /api/elections/2026/seen/{state}/{raceId}` requires a signed manager token and the existing server-side Wyatt admin policy. Client-supplied admin flags and timestamps are not trusted. The Worker stamps the save time and derives totals and gaps from the submitted displayed candidate counts.

All users compare against the same server-saved timestamp and counts. Browsers check the shared baselines every minute and on focus; no browser-local baselines are imported or used. Conditional revisions reject competing admin tabs, and an older source cannot replace a newer baseline. Failed loads disable marking seen and display a warning; failed saves retain the prior shared baseline. Newly listed candidates are labeled new rather than assuming a previous zero count.

Rollout requires the Rankings Worker deployment and migration 0019 before the shared feature can work. Use the existing manual `deploy-rankings-worker.yml` workflow after explicit deployment approval and checking pending migrations. This change does not auto-deploy the Worker on a dev push.

The new table starts empty (no backfill or existing-row rewrite). A page load or minute refresh performs one public Worker request and one indexed query returning the two Senate race baselines. Each admin mark performs one conditional indexed insert/update affecting one row. Older baselines for other offices are not shown on this Senate-only page. Candidate JSON is bounded to 100 candidates per race. No extra scheduled jobs or scans of other tables are added. For 100 viewer-hours, the minute polling adds about 6,000 Worker requests and at most 12,000 result rows, before normal browser visibility throttling; actual use depends on visitors. Check account headroom if traffic materially increases. The baseline remains unset until an admin chooses Mark seen.
