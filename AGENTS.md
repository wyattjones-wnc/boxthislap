# Box This Lap Project Instructions

## Repository and Delivery

- Work in `C:\Users\Vhyatt\Documents\ChatGPT\boxthislap` with remote `https://github.com/wyattjones-wnc/boxthislap.git`; use `dev` unless the user requests another branch.
- Preserve unrelated work. Never reset, discard, stash, overwrite, commit, or push it, and never push `main` without explicit authorization.
- Requests to implement, change, add, fix, update, or remove project files authorize focused validation, a commit on `dev`, and a push to `origin/dev`. Completion requires both local `dev` and `origin/dev` to contain the change. Read-only investigation, review, diagnosis, and planning do not authorize changes or publication.
- Honor explicit requests for local-only work, no push, or another branch. Before pushing, run `node scripts\bump-version.mjs`, fetch and integrate current `origin/dev`, and confirm the outgoing diff contains only this task.

## Startup and Context

- At task start, check the repository, branch, status, and divergence from `origin/dev`. Use the permanent checkout when safe. If another task owns local changes or Git state, use a managed worktree from current `origin/dev`; otherwise stop rather than disturbing it.
- Use [.agents/overview.md](.agents/overview.md) only when routing is unclear, then read only directly relevant topic files. For obvious small changes, go straight to targeted `rg` searches and bounded source reads.
- Treat source and linked detailed docs as authoritative. Do not preload all topics or whole copies of large files such as `script.js` and `styles.css` without a task-specific reason.

## Validation and Reporting

- Run the smallest reliable checks for the changed surface. Use a production build only for cross-cutting work, shared infrastructure, build configuration, or when focused checks reveal broader risk.
- Do not poll GitHub Actions unless requested, deployment status is part of the task, or its result is required for correctness.
- Workflow-only tasks must not change application behavior. Report remaining Worker deployment, D1 migration, Apps Script publication, secrets, or manual configuration separately.
- Keep completion reports concise. Include manual verification only for meaningful behavior not reliably covered by automated checks.
- Keep one task focused on one initiative. For a materially different initiative after completion, recommend a fresh task in the saved `boxthislap` project to avoid carrying old history.
