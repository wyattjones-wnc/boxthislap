# Box This Lap Project Instructions

## Repository and Git

- The canonical checkout is `C:\Users\Vhyatt\Documents\ChatGPT\boxthislap` with remote `https://github.com/wyattjones-wnc/boxthislap.git`.
- Use `dev` unless the user explicitly requests another branch. Do not switch branches when unrelated work could be affected.
- Preserve unrelated local changes. Never reset, discard, stash, overwrite, commit, or push them without explicit user authorization.
- Implementation requests authorize local edits and validation, not commits or remote pushes, unless the user explicitly names the remote destination.
- Phrases such as “include on dev,” “put this on dev,” “make these changes to dev,” “send this to `origin/dev`,” or equivalent wording explicitly authorize validating the task, committing only its scoped changes on `dev`, and pushing them to `origin/dev`. They do not authorize including unrelated changes or pushing to `main`.

## Task Startup and Concurrency

- At the start of each task, verify the repository, branch, working-tree status, and whether local `dev` is ahead of or behind `origin/dev`.
- Use the permanent checkout directly when it is clean and synchronized, or when its existing changes clearly belong to the current task.
- If the checkout contains another task's changes, commits, or an in-progress Git operation, do not edit, stage, rebase, or publish from it. Use a Codex-managed Git worktree based on current `origin/dev` for the new task; if isolation is unavailable, stop and report the conflict.
- Before committing or pushing, fetch `origin/dev`, integrate it safely, and confirm the outgoing diff contains only the current task. Never use a delivery-time worktree to hide or accidentally omit changes that the user explicitly asked to include.

## Context Discipline

- Use [.agents/overview.md](.agents/overview.md) when the subsystem or entry points are unclear, then read only the directly relevant topic file(s). Skip the overview for trivial changes with obvious files.
- Use targeted `rg` searches and bounded line ranges. Do not read every topic file or whole copies of `script.js` or `styles.css` without a task-specific reason.
- Treat source code and the linked detailed documentation as authoritative. Keep `.agents` files as compact navigation maps, not duplicated specifications or history.
- Prefer the smallest reliable subsystem check listed in the topic file. Expand to broader checks when the change crosses boundaries or the narrower check exposes risk.

## Delivery

- Do not change application behavior for workflow-only tasks.
- Before an explicitly authorized user-visible push, run `node scripts\bump-version.mjs`.
- Report any remaining Worker deployment, D1 migration, Apps Script publication, secret, or manual configuration separately; a source change does not perform those operations.
