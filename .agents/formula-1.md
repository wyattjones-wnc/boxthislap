# Formula 1

## Entry Points

- React questions, results, weekly, manage, and calculator surfaces: [src/features/competition/CompetitionPages.tsx](../src/features/competition/CompetitionPages.tsx).
- Public formatting/calculation helpers: [modules/formulaOnePublic.js](../modules/formulaOnePublic.js), [modules/formulaOneCalculator.js](../modules/formulaOneCalculator.js), and [modules/formulaOneQualifying.js](../modules/formulaOneQualifying.js).
- D1 service, provider imports, approvals, manager entries, scoring, and exports: [workers/formula-one/src/index.js](../workers/formula-one/src/index.js) and [workers/formula-one/src/scoring.js](../workers/formula-one/src/scoring.js).
- Migration and seed tools: [scripts/migrate-formula-one-2026.mjs](../scripts/migrate-formula-one-2026.mjs) and [scripts/build-formula-one-seed-sql.mjs](../scripts/build-formula-one-seed-sql.mjs).
- Google Sheets export boundary: [scripts/formula-one-export-webapp.gs](../scripts/formula-one-export-webapp.gs).

## Invariants

- Imported sessions enter `needs_review`; admins explicitly approve sessions, and qualifying/race approval gates weekly publication independently.
- Preserve raw session facts and derive standings/scoring outputs. Subjective or unavailable facts remain manual.
- Weekly manager endpoints expose only the signed-in manager's entries; admin reads and exports may include all managers.
- Weekly deadlines use qualifying start and are not guessed when time data is incomplete.
- Main and Weekly exports are separate full-season operations using year-prefixed tabs. No cron auto-approves data.

## Detailed Reference

- Data model, review flow, and rollout: [workers/formula-one/README.md](../workers/formula-one/README.md).
- Frontend ownership rules: [docs/frontend-architecture.md](../docs/frontend-architecture.md).

## Regression Risks

- Publishing unapproved results, overwriting manual facts, or collapsing Q1/Q2/Q3 times.
- Leaking another manager's weekly picks or allowing client flags to grant admin overrides.
- Changing scoring without updating focused scoring and migration fixtures.

## Focused Validation

- `npm run test:formula-one`
- `npx vitest run src/features/competition/CompetitionPages.test.tsx src/features/competition/formulaOnePublic.test.ts`
