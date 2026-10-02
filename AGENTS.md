# Box This Lap Project Instructions

## Repository and Delivery

- Work from the repository root with remote `https://github.com/wyattjones-wnc/boxthislap.git`; use `dev` unless the user requests another branch. Keep commands and documentation repository-relative so the workflow works in local and cloud checkouts.
- Preserve unrelated work. Never reset, discard, stash, overwrite, commit, or push it, and never push `main` without explicit authorization.
- Requests to implement, change, add, fix, update, or remove project files authorize focused edits and validation only. Do not commit, push, merge, create a pull request, deploy, or otherwise publish changes unless the user explicitly authorizes that action.
- Honor explicit requests for local-only work, no push, or another branch. When a push is explicitly authorized, first run `node scripts/bump-version.mjs`, fetch and integrate current `origin/dev`, and confirm the outgoing diff contains only this task.

## Startup and Context

- At task start, check the repository, branch, status, and divergence from `origin/dev`. Use the permanent checkout when safe. If another task owns local changes or Git state, use a managed worktree from current `origin/dev`; otherwise stop rather than disturbing it.
- Use [.agents/overview.md](.agents/overview.md) only when routing is unclear, then read only directly relevant topic files. For obvious small changes, go straight to targeted `rg` searches and bounded source reads.
- Treat source and linked detailed docs as authoritative. Do not preload all topics or whole copies of large files such as `script.js` and `styles.css` without a task-specific reason.

### Codex Cloud

Cloud tasks may use a synthetic local branch such as `work` and may not expose a normal `origin` remote. Do not treat that alone as a configuration failure if the task was started from the `boxthislap` environment on `dev`.

Do not push, merge, create a PR, or otherwise publish changes unless explicitly authorized.

## Validation and Reporting

- Run the smallest reliable checks for the changed surface. Use a production build only for cross-cutting work, shared infrastructure, build configuration, or when focused checks reveal broader risk.
- Do not poll GitHub Actions unless requested, deployment status is part of the task, or its result is required for correctness.
- Workflow-only tasks must not change application behavior. Report remaining Worker deployment, D1 migration, Apps Script publication, secrets, or manual configuration separately.
- Keep completion reports concise. Include manual verification only for meaningful behavior not reliably covered by automated checks.
- Keep one task focused on one initiative. For a materially different initiative after completion, recommend a fresh task in the saved `boxthislap` project to avoid carrying old history.
