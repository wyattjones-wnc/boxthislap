# Election results

The `#election` page displays Alaska and Mississippi's November 3, 2026 general-election Senate, House and governor races. Alaska's counts are initial ranked-choice tallies. Only explicit AP winner flags receive winner labels.

Source: NPR's public 2026 election results JSON, tabulated by The Associated Press: https://apps.npr.org/2026-election-results/. State silhouettes also come from NPR's election assets. The page links to each state's original reporting.

Run `node scripts/update-election-results.mjs` from the repository root to refresh `data/election-results.json`. Requires Node 22 and curl. The script uses curl to honor managed environments' proxy configuration and rejects missing state results or invalid feeds before writing the snapshot.

The Pages workflow refreshes the dev snapshot before building. Its November 3–10 cron requests a rebuild every 15 minutes (GitHub can delay schedules). **GitHub only registers scheduled workflows on the default branch. Until this workflow is promoted there, dev results refresh on pushes and manual Pages workflow runs.** No credentials or paid AP API key are required. A source failure stops publishing rather than replacing a good snapshot with empty data.

The browser requests the deployed snapshot every minute and on focus. Both snapshot retrieval time and per-race source timestamps are shown. Snapshots older than 30 minutes show a notice; NPR links remain available when loading fails. Production main is not modified by this dev-only implementation.

Each race lists the sum of all reported candidate votes (including Other), and the gap between the two highest-polling named candidates. Candidates are sorted by votes. The aggregate Other category contributes to totals but is not treated as a candidate for the top-two gap.

Admins can mark each race seen. Baselines are stored in localStorage per account, election year, state and race in this browser; they are not synchronized to other devices. A baseline records the time marked, source update time, each candidate's vote count, total and top-two gap. Subsequent snapshots show signed candidate/total changes and the change in the size of the top-two gap, with the full comparison date/time. A leadership change updates the displayed leader names. Newly listed candidates are labeled new rather than assuming a previous zero count. Older cached source results do not replace or compare against a newer baseline. Storage failures are shown and do not claim a successful save.
