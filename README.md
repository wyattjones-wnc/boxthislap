# Box This Lap

A self-contained static website for World Cup result images and score tables on GitHub Pages.

## Local Files

- `index.html` contains the Tomorrow tab, World Cup result image page, Player Scores table, and Manager Scores table.
- `styles.css` contains the responsive layout and visual styling.
- `script.js` handles hash-based tab navigation.

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
