# Overnight Match Images scan

Prepared schedule: once daily at 04:37 UTC in `update-footy-media.yml`.
GitHub schedules run from the default branch (`main`), so this remains inactive
while delivered only to `dev`. Promotion to `main` requires explicit approval.
Manual scans remain available. The existing concurrency group serializes scans;
the job times out after 30 minutes and retains its report for 14 days.

## Usage review — activation pending

Each successful run makes three Footy Worker requests (start, import, finish).
Discovery runs on GitHub Actions against Arsenal, Barcelona, and Getty. Existing
limits inspect at most 250 Arsenal galleries, 80 Barcelona galleries, and 16
Getty fixture searches. This is metadata discovery; it does not hard-save images
or write image files to R2, and uses no KV operations.

For G imported galleries and I image memberships, D1 performs roughly
2G + 2I + 6 insert/update statements, plus deletion of previous gallery
memberships (approximately I more row writes for similarly sized repeat scans).
Index maintenance adds further writes. Existing images are updated again; stable
IDs prevent duplicate image records but do not eliminate writes. Indexed lookups
serve conflicts and gallery membership replacement. Image counts, metadata size,
Worker CPU, current account headroom, and actual billed rows have not been
measured, so the gallery limits alone do not establish a safe daily usage bound.
GitHub Actions use is up to 30 minutes per run (930 minutes in a 31-day month).

Before activation, compare an existing scan report and actual D1 usage with the
account's current free quotas and headroom, then obtain agreement for recurring
usage. No quota or headroom is assumed here. Lower-usage alternatives are scans
only after match days, fewer sources, or a bounded incremental importer.
