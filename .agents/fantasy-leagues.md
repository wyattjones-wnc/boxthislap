# Fantasy Leagues

## Entry Points

- React route structure for leagues, Fantasy Critic, and Fantasy Office: [src/features/competition/CompetitionPages.tsx](../src/features/competition/CompetitionPages.tsx).
- League definitions, source URLs, Fantasy Critic metadata, and manager mapping: [modules/siteConfig.js](../modules/siteConfig.js).
- Compatibility loaders, parsers, standings, awards, and Manager Hub summaries: [script.js](../script.js). Search for `FantasyCritic`, `FantasyOffice`, or the specific render/load symbol and read a bounded range.
- Fantasy Critic API proxy: [scripts/fantasy-critic-proxy-webapp.gs](../scripts/fantasy-critic-proxy-webapp.gs).
- Draft-list persistence shared with other manager lists: [workers/rankings/src/index.js](../workers/rankings/src/index.js) and [modules/draftLists.js](../modules/draftLists.js).
- Current-year league selection and cards: [src/features/competition/LeaguesFeature.tsx](../src/features/competition/LeaguesFeature.tsx) and [src/features/competition/leagueYears.ts](../src/features/competition/leagueYears.ts).
- 2027 asynchronous league drafts: [src/features/competition/LeagueDrafts](../src/features/competition/LeagueDrafts) and [workers/league-drafts/README.md](../workers/league-drafts/README.md). Dev state uses a separate environment namespace and migration history. Admin test picks are dev-only; these drafts do not update earlier rosters or scoring.

## Invariants

- Year is part of route, metadata, source selection, and awards identity; never silently mix seasons.
- Fantasy Critic data is normalized from the proxy/API response before rendering; manager mapping is centralized in site configuration.
- Fantasy Office draft and results inputs have different row shapes and views.
- Manager Hub summaries consume the same loaded league state as public league pages rather than maintaining separate results.
- Private draft lists remain manager-scoped and revision-protected through the Rankings Worker.

## Detailed Reference

- Frontend ownership and route constraints: [docs/frontend-architecture.md](../docs/frontend-architecture.md).
- Rankings/Draft List persistence: [workers/rankings/README.md](../workers/rankings/README.md).

## Regression Risks

- Applying one year's metadata, publisher mapping, awards, or CSV shape to another year.
- Breaking proxy JSONP callbacks or rendering Manager Hub data before the shared league state is ready.
- Renaming compatibility mount IDs before the controller is migrated.

## Focused Validation

- `npx vitest run src/features/competition/CompetitionPages.test.tsx`
- `node scripts/check-apps-script.mjs scripts/fantasy-critic-proxy-webapp.gs`
- `node --check modules/draftLists.js`
- `npm run test:league-drafts`
- `npx vitest run src/features/competition/LeagueDrafts src/features/competition/leagueYears.test.tsx`
