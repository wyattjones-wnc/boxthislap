# Overnight Match Images scan

Run once daily at **04:37 UTC** using `update-footy-media.yml` on GitHub's default
branch (`main`). Scheduled runs explicitly check out current `dev`; manual runs
use the selected branch. Only the workflow is promoted to `main`, not the other
dev application changes. The existing concurrency group serializes scans; jobs
time out after 30 minutes and retain their reports for 14 days. GitHub may delay
scheduled runs; 04:37 is the requested start time, not a completion guarantee.

## Activation scope and usage review (2026-10-27)

The user requested overnight scans and then instructed “Continue” after being told
activation requires a scoped main promotion and recurring-usage review. This
records that scope: one nightly metadata scan, the workflow-only main promotion,
and one bounded validation scan. No Worker deployment, migration, backfill, image
hard-save, or unrelated main promotion is included.

Cloudflare account GraphQL analytics over the preceding 24 hours reported
143,994 D1 rows read and 12,571 rows written. Database metadata reported 10
databases totaling 46,956,544 bytes, including 3,084,288 bytes for
`footy-match-notes`. These are observations, not a guarantee of future traffic.
The current published D1 free allowances are 5 million reads/day, 100,000
writes/day, and 5 GB total storage. Source:
https://github.com/cloudflare/cloudflare-docs/blob/production/src/content/partials/workers/d1-pricing.mdx

The previous scan (Actions run 40454853223) processed 46 galleries and 863 image
IDs. Its source warnings included gallery extraction failures and unavailable
Getty embed results; scheduling does not repair those source limitations.

Each successful scan makes three Footy Worker requests (start, import, finish),
with no automatic retries. Discovery runs on GitHub against at most 250 Arsenal
galleries, 80 Barcelona galleries, and 16 Getty fixture searches. Scans do not
hard-save images, write image files to R2, or perform KV operations.

Imports now fail before the import request if they exceed **100 galleries, 1,500
image memberships, or 2 MB of gallery metadata**. Whole galleries are preserved;
limits never truncate or replace a gallery with a partial selection. Failure is
recorded in scan health and the retained report. Limits also protect manual runs.

For G galleries and I image memberships, the importer performs roughly
2G + 2I + 6 insert/update statements, plus removal of previous gallery memberships
(approximately I row deletes for similarly sized repeat scans). Indexed conflict
lookups avoid table scans. Allowing for index writes and deletion variance, budget
**20,000 additional D1 writes and 50,000 reads per run** as a conservative planning
estimate, not a measured hard billing cap. At observed account usage this is about
33% of the free daily write allowance and 4% of the read allowance. The one-time
validation plus one nightly run in the same day would be about 53% and 5%.
Actual row counts depend on prior gallery sizes and indexes; input limits are
hard caps, while these billing estimates are not.

New metadata is capped at 2 MB of JSON per run; database/index storage differs.
At the observed size, storage has substantial headroom. Repeated stable IDs update
existing records rather than creating duplicates. One new scan and three source
health records accumulate each run; image retention policy is unchanged. Worker
CPU has not been measured, but execution is three bounded metadata requests;
source fetching/browser CPU is on GitHub, not Cloudflare. GitHub Actions is capped
at 30 minutes/run (930 minutes in a 31-day month); the observed run took about a
minute. Review usage if scan sizes or normal account traffic grow. A lower-usage
alternative is scanning only after match days or implementing incremental imports.
