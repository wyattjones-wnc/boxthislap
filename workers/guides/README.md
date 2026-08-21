# Guides Progress Worker

Stores confirmed, manager-scoped Guide checklist progress in D1. Checklist definitions are served from the validated `data/guides.json` snapshot generated from the Guides spreadsheet.

The browser only marks or hides a step after this Worker returns a successful response. A failed write remains visible and offers an in-session retry.

## Deployment

Dev and production intentionally use the same `guides-progress` D1 database and production Worker. UI testing on `/dev/` must not rely on separate checklist data. Apply migrations with `npx wrangler d1 migrations apply DB --remote`, then deploy with `npx wrangler deploy`.

## Publishing checklist changes

Run the **Publish Guides** GitHub workflow on the desired branch after editing the spreadsheet. It validates both tabs, commits `data/guides.json` only when the guide content changed, and triggers the Pages deployment. The last valid JSON remains deployed if Google Sheets or validation fails.

Every Guides row must set `IsAdmin` to `TRUE` or `FALSE`. Non-admin managers only see guides marked `FALSE`; admins can see both.
