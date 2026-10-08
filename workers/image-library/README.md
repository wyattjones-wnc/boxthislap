# Image Library Worker

Admin-managed shared file/content/alias/preset metadata uses the existing Footy D1 database. Finished library images use the private `box-this-lap-image-library` Standard R2 bucket. The exported SQLite-backed `MediaBudget` Durable Object also gates Footy's roster/match buckets through an external namespace binding.

The gate starts disabled and uninitialized. Provisioning, migrations, deployment, and storage baseline initialization require the recorded account usage review and explicit approval in [deployment instructions](../../.agents/deployment.md). The manual-only workflow deploys the library/namespace before Footy. It does not create the bucket or enable the budget.

See [Image Studio](../../docs/image-studio.md) for editor behavior, cache repair, schema, API authorization, limits, usage estimates, and rollout ordering.

Run `npm run test:images` and a Wrangler dry run against this configuration for focused validation. Tests use local SQLite and fake R2/authentication; they never query or mutate cloud storage.
