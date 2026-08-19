# Guides Progress Worker

Stores confirmed, manager-scoped Guide checklist progress in D1. Checklist definitions continue to come from the published Guides spreadsheet.

The browser only marks or hides a step after this Worker returns a successful response. A failed write remains visible and offers an in-session retry.

## Preview deployment

1. Create `guides-progress-preview` in D1 and add its ID to `wrangler.toml` as the `DB` binding under `env.preview`.
2. Apply migrations with `npx wrangler d1 migrations apply DB --remote --env preview`.
3. Deploy with `npx wrangler deploy --env preview`.

Before production promotion, create `guides-progress`, add a top-level `DB` binding, apply the same migrations, and deploy without `--env preview`.
