# Box This Lap Project Instructions

## Repository and Delivery

- Work from the repository root with remote `https://github.com/wyattjones-wnc/boxthislap.git`; always base task work on current `origin/dev`, apply changes on local `dev`, and validate there. An explicitly requested task branch or managed worktree must also start from current `origin/dev`. Keep commands and documentation repository-relative so the workflow works in local and cloud checkouts.
- Change `main` only through an explicitly authorized promotion from `dev` to `main`. Do not implement fixes directly on `main` or use `main` as the starting point for task work. A direct change to `main` is permitted only when the user explicitly authorizes that particular exception; general permission to publish or promote does not authorize it.
- Preserve unrelated work. Never reset, discard, stash, overwrite, commit, or push it, and never push `main` without explicit authorization.
- Requests to implement, change, add, fix, update, or remove project files authorize focused edits, validation, and delivery to `dev` for review. Complete each task by committing its changes and pushing them to `origin/dev`, unless the user explicitly requests local-only work, no push, or another branch. Do not merge into or push `main`, create a pull request, or deploy unless explicitly authorized.
- Before delivering to `dev`, run `node scripts/bump-version.mjs`, fetch and integrate current `origin/dev`, and confirm the outgoing diff contains only this task. Preserve unrelated work and report the pushed commit and validation results.

## Startup and Context

- At task start, check the repository, branch, status, and divergence from `origin/dev`. Fetch and integrate current `origin/dev` before editing. If the checkout is on `main` or a synthetic branch, switch safely to local `dev` first. Use the permanent checkout when safe. If another task owns local changes or Git state, use a managed worktree from current `origin/dev`; otherwise stop rather than disturbing it.
- Use [.agents/overview.md](.agents/overview.md) only when routing is unclear, then read only directly relevant topic files. For obvious small changes, go straight to targeted `rg` searches and bounded source reads.
- Treat source and linked detailed docs as authoritative. Do not preload all topics or whole copies of large files such as `script.js` and `styles.css` without a task-specific reason.

### Codex Cloud

Apply project changes to local `dev` and run validation there. Explicitly requested task branches must be based on current `origin/dev`; direct work on `main` requires the particular exception described above. If a cloud task starts on a synthetic branch such as `work`, fetch `origin/dev` when available and switch to local `dev` before editing. Preserve task changes when switching; use a managed worktree if unrelated work prevents a safe switch. If `origin/dev` cannot be accessed, report that limitation instead of treating validation on a synthetic branch as validation on `dev`.

Completed tasks must reach `origin/dev` for review, including from a synthetic cloud branch. Honor explicit local-only, no-push, or alternate-branch instructions. Do not merge into or push `main`, create a PR, or deploy unless explicitly authorized.

## Validation and Reporting

- Run the smallest reliable checks for the changed surface. Use a production build only for cross-cutting work, shared infrastructure, build configuration, or when focused checks reveal broader risk.
- Do not poll GitHub Actions unless requested, deployment status is part of the task, or its result is required for correctness.
- Workflow-only tasks must not change application behavior. Report remaining Worker deployment, D1 migration, Apps Script publication, secrets, or manual configuration separately.
- Keep completion reports concise. Include manual verification only for meaningful behavior not reliably covered by automated checks.
- Keep one task focused on one initiative. For a materially different initiative after completion, recommend a fresh task in the saved `boxthislap` project to avoid carrying old history.

## Cloudflare Deployments

- Cloudflare credentials are intentionally stored as encrypted GitHub Actions repository secrets, not in this repository and not necessarily in a Codex Cloud environment. An empty Codex secret list does not prevent workflow-based deployment.
- When a matching `.github/workflows/deploy-*-worker.yml` workflow exists, use it as the canonical deployment path after explicit user approval. Do not require, reveal, copy, or write `CLOUDFLARE_API_TOKEN` into a file or local environment.
- Read [.agents/deployment.md](.agents/deployment.md) before deploying a Worker. It identifies the available workflows, migration inputs, verification commands, and the fallback for Workers that do not yet have a deployment workflow.

## Dialog Standard

- New React dialogs must use `src/components/ContainedDialog/ContainedDialog.tsx`, or the established `modules/dialogs/FormDialog` wrapper for compatibility modules. Do not add one-off overlays or independent dialog styling.
- Keep dialog structure and scrolling inside the shared component so page scroll remains locked and touch or wheel gestures cannot escape to the underlying page or trigger pull-to-refresh.
- Put long content in the dialog's contained scrolling body and persistent form actions in its footer.

## Product Defaults

- Do not invent or seed user-facing content when a feature describes an admin-configured default. An admin-configured default may begin empty; managers inherit it only after the admin supplies it.
