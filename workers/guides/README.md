# Guides Progress Worker

Stores confirmed, manager-scoped Guide checklist progress in D1. Checklist definitions are served from the validated `data/guides.json` snapshot generated from the Guides spreadsheet.

The browser only marks or hides a step after this Worker returns a successful response. A failed write remains visible and offers an in-session retry.

## Preview deployment

1. Create `guides-progress-preview` in D1 and add its ID to `wrangler.toml` as the `DB` binding under `env.preview`.
2. Apply migrations with `npx wrangler d1 migrations apply DB --remote --env preview`.
3. Deploy with `npx wrangler deploy --env preview`.

Before production promotion, create `guides-progress`, add a top-level `DB` binding, apply the same migrations, and deploy without `--env preview`.

## Publishing checklist changes

Run the **Publish Guides** GitHub workflow on the desired branch after editing the spreadsheet. It validates both tabs, commits `data/guides.json` only when the guide content changed, and triggers the Pages deployment. The last valid JSON remains deployed if Google Sheets or validation fails.

Every Guides row must set `IsAdmin` to `TRUE` or `FALSE`. Non-admin managers only see guides marked `FALSE`; admins can see both.
