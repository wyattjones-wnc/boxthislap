# Box This Lap Context Map

Box This Lap is a mobile-first React/Vite dashboard hosted on GitHub Pages. React owns the shell and route structure; compatibility services in `script.js` still supply data and behavior for features not yet fully migrated. Cloudflare Workers own authenticated or persistent data, and Apps Script remains at selected Google Sheets boundaries.

## Start Here

- Frontend boot and routing: [src/main.tsx](../src/main.tsx), [src/app/App.tsx](../src/app/App.tsx), and [src/app/routes.ts](../src/app/routes.ts).
- React features: [src/features](../src/features).
- Compatibility modules and endpoint configuration: [modules](../modules) and [modules/siteConfig.js](../modules/siteConfig.js).
- Persistent APIs and migrations: [workers](../workers).
- Data publishing, migration, and maintenance: [scripts](../scripts) and [.github/workflows](../.github/workflows).
- Tests: colocated React tests, module `*.test.mjs` files, Worker `test` directories, and [tests/e2e](../tests/e2e).
- Canonical frontend ownership rules: [docs/frontend-architecture.md](../docs/frontend-architecture.md).

## Topic Routing

- Guides and checklist progress: [guides.md](guides.md)
- Footy fixtures, notes, rosters, following, and notifications: [footy.md](footy.md)
- Rankings, Elo, comparisons, and draft lists: [rankings.md](rankings.md)
- Login, sessions, administration, and Manager Hub: [manager-hub.md](manager-hub.md)
- Google Sheets, Apps Script, and published snapshots: [google-sheets.md](google-sheets.md)
- Fantasy Critic, Fantasy Office, leagues, and awards: [fantasy-leagues.md](fantasy-leagues.md)
- Formula 1 questions, scoring, weekly entries, and data service: [formula-1.md](formula-1.md)
- Scriptable loaders and iPhone widgets: [scriptable.md](scriptable.md)

Read only the topics directly involved. A cross-cutting task may use multiple topic files, but do not preload the entire directory. Create `current.md` only for real short-lived migration or compatibility state.

## Validation Baseline

- Context only: `npm run context:check` and `git diff --check`.
- Changed JavaScript: run `node --check` on each changed file.
- Changed React/tooling: start with the relevant Vitest file, then use `npm run check` when the change spans shared infrastructure.
- Changed Worker: run its focused Node tests and a Wrangler dry run when dependencies and permissions allow.
