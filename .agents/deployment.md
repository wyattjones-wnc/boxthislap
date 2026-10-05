# Deployment and Cloudflare Credentials

## Credential Model

`CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are encrypted GitHub Actions repository secrets. Their values must never be committed, printed, copied into documentation, or placed in a checked-in `.env` file.

Codex Cloud environments and GitHub Actions have separate secret stores. A Cloud chat may report that it has no attached secrets and can still deploy safely by dispatching a repository workflow with the authenticated `gh` CLI. The workflow receives the Cloudflare secrets only inside its GitHub-hosted job.

Do not ask the user to expose the token to a Cloud chat when an existing workflow can perform the deployment. Direct `wrangler deploy` is appropriate only when both Cloudflare variables are explicitly bound and reported ready in that chat's environment.

## Canonical Workflow

Deployment requires explicit user approval. After the relevant commit is on `dev`:

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
| PSN trophies                   | `deploy-psn-worker.yml`          | Automatically runs for matching `dev` changes; manual fallback: `gh workflow run deploy-psn-worker.yml --ref dev`        |

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
