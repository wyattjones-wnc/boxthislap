# Deployment and Cloudflare Credentials

## Free Usage Budget and Approval

The user's permanent goal is to remain **well under Cloudflare's free usage limits**, not merely avoid an invoice. Preserve substantial headroom for ordinary traffic and other Workers/databases in the same account. This applies to one-time maintenance and ongoing behavior.

Before a potentially heavy action, prepare a concrete usage review:

1. Identify the target account/resources and every pending migration or automatic workflow that will run. Use local SQL analysis, fixtures, and existing observations first; avoid expensive remote scans just to estimate another scan.
2. Estimate one-time and recurring usage: D1 rows read and written (including index maintenance), storage, Worker requests and CPU, KV operations, scheduled frequency, retries, and validation queries where relevant. Compare with current account usage and current applicable free quotas. Do not invent quota figures or treat missing usage data as zero.
3. Explain the expected impact, available headroom, uncertainty, and cheaper options such as narrower updates, indexed reads, fewer checks, or postponement. Splitting work into batches does not by itself reduce total usage.
4. Discuss the plan with the user and obtain explicit agreement before the first potentially heavy command, workflow dispatch, or push that automatically starts it. Record the approved scope and estimate in the task/PR description or maintenance notes. Broad authorization to deploy is not approval for substantial usage.
5. After execution, report available usage observations and any material difference from the estimate. Do not repeat a costly operation without reviewing its additional impact.

Full-table renumbering, broad backfills, index creation/rebuilds, full-library syncs, increased polling, and repeated remote verification are examples requiring review. Small scoped operations may proceed within normal task authorization when their impact is known to be low. When cost or headroom cannot be bounded confidently, pause the potentially heavy action and discuss the uncertainty first. Do not upgrade to paid usage or rely on paid overages without explicit approval.

The PSN numbering repair (`0012_atomic_trophy_numbers.sql`) is a concrete example: it rewrites trophy ordinals and creates indexes across existing data. Future comparable work must receive this review before execution, even when described as a bug fix.

## Credential Model

`CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are encrypted GitHub Actions repository secrets. Their values must never be committed, printed, copied into documentation, or placed in a checked-in `.env` file.

Codex Cloud environments and GitHub Actions have separate secret stores. A Cloud chat may report that it has no attached secrets and can still deploy safely by dispatching a repository workflow with the authenticated `gh` CLI. The workflow receives the Cloudflare secrets only inside its GitHub-hosted job.

Do not ask the user to expose the token to a Cloud chat when an existing workflow can perform the deployment. Direct `wrangler deploy` is appropriate only when both Cloudflare variables are explicitly bound and reported ready in that chat's environment.

## Canonical Workflow

Deployment requires explicit user approval and the usage review above for potentially heavy operations. Check path-triggered workflows before pushing so approval precedes automatic execution. After the relevant commit is on `dev`:

1. Select the matching workflow in `.github/workflows`.
2. Dispatch it against `dev` with `gh workflow run`.
3. Find the run for the expected commit and monitor it through completion.
4. For migrations, verify the log names the expected migration and marks it successful.
5. Report the workflow result and deployed version or run URL. Never report secret values.

Available Worker workflows:

| Worker                         | Workflow                         | Trigger command                                                                                                          |
| ------------------------------ | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Rankings                       | `deploy-rankings-worker.yml`     | `gh workflow run deploy-rankings-worker.yml --ref dev -f apply_migrations=true`                                          |
| Rankings, no pending migration | `deploy-rankings-worker.yml`     | `gh workflow run deploy-rankings-worker.yml --ref dev -f apply_migrations=false`                                         |
| Merchandise                    | `deploy-merchandise-worker.yml`  | `gh workflow run deploy-merchandise-worker.yml --ref dev`                                                                |
| Collectibles                   | `deploy-collectibles-worker.yml` | `gh workflow run deploy-collectibles-worker.yml --ref dev`                                                               |
| Footy Push                     | `deploy-footy-push-worker.yml`   | Automatically runs for matching `dev` changes; manual fallback: `gh workflow run deploy-footy-push-worker.yml --ref dev` |
| PSN trophies                   | `deploy-psn-worker.yml`          | Matching `dev` changes deploy without migrations. After usage review and explicit approval: `gh workflow run deploy-psn-worker.yml --ref dev -f apply_migrations=true` |

Useful verification commands:

```bash
gh run list --workflow deploy-rankings-worker.yml --limit 3 \
  --json databaseId,status,conclusion,headSha,url,createdAt
gh run watch RUN_ID --exit-status --interval 5
gh run view RUN_ID --log
```

For a Worker without a deployment workflow, prefer adding a narrowly scoped workflow that references `${{ secrets.CLOUDFLARE_API_TOKEN }}` and `${{ secrets.CLOUDFLARE_ACCOUNT_ID }}` over distributing those credentials to individual Cloud environments. Follow the established workflows for Node setup, Wrangler configuration, concurrency, tests, and migrations.

## GitHub Authentication Failures

If `gh auth status` reports an invalid `GH_TOKEN`, the problem is the Cloud environment's GitHub connection, not the Cloudflare repository secrets. Do not put a GitHub token in the repository, copy one from another chat, or substitute the Cloudflare token.

For a path-triggered workflow, successfully pushing the change to `dev` is sufficient; GitHub starts the deployment without a separate `gh workflow run` command. If a manual dispatch is still required, repair or reconnect GitHub access in that Cloud environment, start a chat with the corrected configuration, or dispatch the workflow from the GitHub Actions interface. Report the authentication limitation rather than attempting to bypass it.

## Recommended Improvements

- Keep the Cloudflare token least-privileged to only the accounts, Workers, and D1 databases this repository deploys.
- Protect deployments with a GitHub Environment when approval gates or deployment history become necessary.
- Consolidate repeated Worker deployment steps into a reusable workflow as more Workers gain automated deployment.
- Rotate the repository secret without changing documentation or Cloud environment configuration.
