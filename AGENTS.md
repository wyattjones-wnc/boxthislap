# Box This Lap Project Instructions

## Repository and Git

- The canonical checkout is `C:\Users\Vhyatt\Documents\ChatGPT\boxthislap` with remote `https://github.com/wyattjones-wnc/boxthislap.git`.
- Use `dev` unless the user explicitly requests another branch. Do not switch branches when unrelated work could be affected.
- Preserve unrelated local changes. Never reset, discard, stash, overwrite, commit, or push them without explicit user authorization.
- Implementation requests authorize local edits and validation, not commits or remote pushes. Push only after the user explicitly confirms completion and authorizes it.

## Context Discipline

- Start with [.agents/overview.md](.agents/overview.md), then read only the directly relevant topic file(s).
- Use targeted `rg` searches and bounded line ranges. Do not read every topic file or whole copies of `script.js` or `styles.css` without a task-specific reason.
- Treat source code and the linked detailed documentation as authoritative. Keep `.agents` files as compact navigation maps, not duplicated specifications or history.
- Prefer the smallest reliable subsystem check listed in the topic file. Expand to broader checks when the change crosses boundaries or the narrower check exposes risk.

## Delivery

- Do not change application behavior for workflow-only tasks.
- Before an explicitly authorized user-visible push, run `node scripts\bump-version.mjs`.
- Report any remaining Worker deployment, D1 migration, Apps Script publication, secret, or manual configuration separately; a source change does not perform those operations.
