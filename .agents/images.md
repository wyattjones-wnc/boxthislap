# Image Studio and shared images

## Entry Points

- Reusable editor, local projects, tools, dialogs, and settings: [src/features/images](../src/features/images).
- Ranking image resolution and bundled fallback: [modules/rankingImages.js](../modules/rankingImages.js); integration events live in [script.js](../script.js).
- Shared metadata API and private usage gate: [workers/image-library/src](../workers/image-library/src).
- Footy R2 reservations and metadata: [workers/footy-notes/src/index.js](../workers/footy-notes/src/index.js), [workers/shared](../workers/shared).
- File/content/preset/link schema: [workers/footy-notes/migrations/0012_image_library.sql](../workers/footy-notes/migrations/0012_image_library.sql).
- Persistent bounded image cache: [service-worker.js](../service-worker.js).

## Invariants

- Uploads and shared metadata mutations are admin-only; manager identity comes from signed authentication. Explicit ranking links belong only to the authenticated manager.
- Shared identity uses kind/title/aliases/external IDs; never associate games across managers by numeric item ID alone. Bundled games belong to manager 6; bundled MCU title matches may serve movies.
- Source layers may lie outside the fixed export canvas. Crop preset changes do not alter old exports. Projects stay in local files.
- Every managed R2 operation must reserve through the same private `MediaBudget` object before it executes. Missing/disabled/uninitialized accounting fails closed. Never reset that object or silently refund failed attempts.
- Storage release is idempotent and follows successful physical deletion. Keep Footy component references coherent; library deletion cannot remove component-owned Footy files.
- No scheduled scans/backfills are introduced. Bundled images remain deployed assets. Full migrations and initial bucket-ledger scans require reviewed usage estimates.
- Cache hits must avoid background origin reads. Missing/corrupt local copies may refetch once through the controlled origin, subject to its budget. Cache failures must not hide a successful network image.

## Detailed Reference

- Features, accounting limits, rollout prerequisites, and usage estimates: [docs/image-studio.md](../docs/image-studio.md).
- Deployment approval rules: [deployment.md](deployment.md).
- Manual library/Footy rollout: [.github/workflows/deploy-image-library-worker.yml](../.github/workflows/deploy-image-library-worker.yml).

## Focused Validation

- `npm run test:images`
- `npx vitest run src/features/images`
- `npx playwright test tests/e2e/image-editor.test.mjs`
- Cross-cutting changes: `npm run check` and production build.
