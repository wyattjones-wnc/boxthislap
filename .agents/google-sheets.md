# Google Sheets and Apps Script

## Entry Points

- Manager validation and league data gateway: [scripts/manager-portal-webapp.gs](../scripts/manager-portal-webapp.gs).
- Footy schedule source: [scripts/footy-data-webapp.gs](../scripts/footy-data-webapp.gs).
- Next/To Do/Want source: [scripts/next-data-webapp.gs](../scripts/next-data-webapp.gs).
- Fantasy Critic proxy: [scripts/fantasy-critic-proxy-webapp.gs](../scripts/fantasy-critic-proxy-webapp.gs).
- Formula 1 export target: [scripts/formula-one-export-webapp.gs](../scripts/formula-one-export-webapp.gs).
- Static snapshot generators: [scripts/generate-guides-data.mjs](../scripts/generate-guides-data.mjs) and [scripts/generate-rankings-data.mjs](../scripts/generate-rankings-data.mjs).
- Scheduled publishers: [.github/workflows](../.github/workflows).

## Invariants

- Apps Script is an explicit boundary, not a place to duplicate Worker-owned persistence.
- Published JSON snapshots must be validated before replacement; a failed fetch or validation keeps the last known-good file.
- Preserve JSONP callback validation and origin restrictions where browser clients depend on them.
- Footy Match Notes and roster data are Worker-owned after cutover; their former Sheet tabs are migration/rollback sources, not live truth.
- Formula 1 exports are full-season writes to year-prefixed tabs; they must not overwrite another season.

## Detailed Reference

- Feature-specific contracts live in the relevant topic file and Worker README. Endpoint constants are in [modules/siteConfig.js](../modules/siteConfig.js).

## Regression Risks

- Treating Sheet column order, booleans, IDs, or dates as unvalidated input.
- Publishing partial output after upstream failure or changing a callback/wire shape without updating its consumer.
- Assuming a source push deploys Apps Script or changes its script properties.

## Focused Validation

- `node scripts/check-apps-script.mjs scripts/manager-portal-webapp.gs`
- `node scripts/check-apps-script.mjs scripts/footy-data-webapp.gs`
- Run the affected generator or migration only in its documented dry-run/review mode; inspect its diff before accepting output.
