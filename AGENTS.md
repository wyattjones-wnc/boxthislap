# Agent Notes

## Google Sheets interaction notes

These notes are for future agents working on this repo. Google Sheets has a few sharp edges in this project, especially because the site reads public published CSV URLs while some write flows use Apps Script.

### Published sheet URLs

- A published URL with `/spreadsheets/d/e/2PACX-.../pub` is a published feed ID, not the editable spreadsheet ID.
- The editable spreadsheet ID is the value in a URL shaped like `/spreadsheets/d/{spreadsheetId}/edit`.
- Apps Script `SpreadsheetApp.openById(...)` needs the editable spreadsheet ID, not the `2PACX` published ID.
- A bound Apps Script can avoid that confusion by using `SpreadsheetApp.getActiveSpreadsheet()`.

### CSV access

- `?output=csv` on the workbook-level published URL only returns the default/first published sheet. It does not expose the entire workbook in one CSV.
- For a specific sheet, prefer this URL shape:

  ```text
  https://docs.google.com/spreadsheets/d/e/{publishedId}/pub?output=csv&gid={gid}&single=true
  ```

- In this workspace, `?output=csv&gid=...&single=true` has behaved more consistently than putting `gid` before `output`.
- Always inspect the returned content before assuming it is CSV. Google may return HTML, an error page, or `400 Bad Request`.
- `curl.exe -L` has been more reliable here than PowerShell `Invoke-WebRequest` for quick checks against published Google URLs.
- If scripting with `curl.exe`, use silent mode when possible so progress output does not contaminate stdout parsing.

### Finding sheet names and gids

- Fetch the published HTML endpoint to discover visible sheet names and gids:

  ```text
  https://docs.google.com/spreadsheets/d/e/{publishedId}/pubhtml
  ```

- The sheet tab names and gids can appear in the published HTML metadata even when a direct CSV fetch for that tab fails.
- Do not use sensitive tab names in a published workbook. If a tab name appears in `pubhtml`, users and agents can see it.

### Private data and auth

- Do not store passphrases, tokens, or other secrets in any sheet that is published to the web.
- A passphrase table should live in an unpublished/private spreadsheet or private tab handled only by Apps Script.
- If the site needs to authenticate against a sheet, use an Apps Script web app as the private boundary. The static GitHub Pages site should call the web app endpoint, and the web app should read/write private sheet data.
- Client-side checks are only convenience checks. Anything visible to JavaScript in the browser is public.

### Current manager/workflow workbook

Published workbook ID:

```text
2PACX-1vTQnBDCv-KRIucQp-UsH_yb8MsrskZyuDHOC0ACgDKbmKB8SA3JGWORwr-pPxvkXwEJv5S2dCvcvf2n
```

Visible tabs from `pubhtml`:

- `Managers`, gid `0`
- `Drafts`, gid `1819817720`
- `Logs`, gid `121360226`
- `PRIVATE - IF AGENT CAN SEE ALERT`, gid `809672624`

The private-alert tab name is visible in published metadata. Its direct CSV request returned `400 Bad Request` when checked, but the name and gid still appeared in `pubhtml`, so do not rely on tab naming or failed CSV access as privacy.

