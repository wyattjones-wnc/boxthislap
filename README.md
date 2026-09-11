# Box This Lap

A mobile-first personal dashboard for followed football teams, shared leagues,
rankings, gaming collections, and manager workflows. The static frontend is
hosted on GitHub Pages and uses Cloudflare Workers for authenticated and
persistent features.

## Frontend development

The existing application is built with Vite without changing its current
hash-based routes or runtime behavior.

```powershell
npm install
npm run build
npm run preview
```

Run the complete local quality gate with `npm run check`. Mobile browser smoke
tests are available with `npm run test:e2e` after installing Playwright's
Chromium and WebKit browsers.

The quality tooling currently covers the build configuration and new browser
tests. Legacy application files will move under type checking and linting as
features are migrated out of `script.js`.

## Application files

- `index.html` contains the shared shell and existing page markup.
- `styles.css` contains the current responsive layout and visual styling.
- `script.js` coordinates legacy page rendering and application state.
- `modules/` contains extracted frontend features and utilities.
- `workers/` contains the Cloudflare Worker APIs.

## GitHub Pages

After the first commit is pushed to GitHub:

1. Open the repository on GitHub.
2. Go to **Settings** > **Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select the `main` branch and `/ (root)` folder.
5. Save.

GitHub will publish the site after the Pages build completes.

## API-Football Probe

Use `scripts/test-api-football.mjs` to test whether API-Football's free plan has better fixture coverage for the teams listed on the Football sheet.

```powershell
$env:API_FOOTBALL_API_KEY='your-api-football-key'
node scripts\test-api-football.mjs
```

Optional settings:

- `API_FOOTBALL_TEST_REFRESH=1` ignores cached responses.
- `API_FOOTBALL_TEST_LOOKAHEAD_DAYS=365` changes the fixture window.
- `API_FOOTBALL_TEST_SEASON=2026` changes the season parameter.

Responses are cached under `.cache/api-football-tests/`.

## football-data.org Probe

Use `scripts/test-football-data.mjs` to test football-data.org coverage. It reads the same Football sheet and supports an optional `Football-Data Team ID` column. If no column is present, it has fallback IDs for Arsenal, Barcelona, and Wrexham.

```powershell
$env:FOOTBALL_DATA_API_KEY='your-football-data-token'
node scripts\test-football-data.mjs
```

Optional settings:

- `FOOTBALL_DATA_TEST_REFRESH=1` ignores cached responses.
- `FOOTBALL_DATA_TEST_LOOKAHEAD_DAYS=365` changes the fixture window.
- `FOOTBALL_DATA_TEST_STATUS=SCHEDULED` changes the match status filter.

Responses are cached under `.cache/football-data-tests/`.
