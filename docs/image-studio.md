# Image Studio and shared media

## Features

Admin Home → Image Studio opens the standalone layered editor. It supports image upload/paste, raster and text layers, layer order/visibility/opacity, move/scale/rotate (including handles), paintbrush and eraser with adjustable edge hardness (0% soft to 100% sharp), connected fill, rectangular/elliptical/freehand selections, connected-color selection, selection lifting/erasing, canvas crop/resize, brightness/contrast/saturation/blur/inversion, merge/rasterize, undo/redo, and PNG/WebP/JPEG export. JPEG requires a background color. Source images can sit anywhere relative to the output canvas; only pixels inside it are exported. The compact icon toolbar shows options for the active tool. Move mode selects layers directly on the canvas; double-click opens layer properties. Resize mode provides four corner handles and proportional image width/height controls. Canvas size changes output bounds rather than scaling image pixels. Canvas settings and adjustments collapse to keep the workspace clear.

Layered projects are local `.btl-image.json` files. They contain embedded image pixels, text, transforms, and adjustments; they do not upload project history to R2 and are not paint.net `.pdn` files. The editor limits canvas dimensions to 8192 per side / 16 million pixels, projects to 32 layers / 32 million source pixels / 48 MB serialized, source files to 12 MB, and history to 30 entries / 32 MB. Connected pixel operations run in a short-lived Web Worker with a 20-second ceiling.

Image Studio's library manages shared titles, release years, alternate titles, and image associations. Removing an association affects all managers using that shared content. Unused library files can be deleted separately. Footy files remain owned by their components to prevent deletion from leaving broken player/match references.

Ranking rows and Compare expose **Images**. Exact unambiguous title/alias matches ignore case, repeated whitespace, and Unicode presentation differences. Ambiguous names require an explicit, manager-owned link; another manager's link is never inherited. MCU and movies share the movies content category, with MCU external IDs supported. Compare combines associated images and preserves their aspect ratios. Bundled MCU pictures also match movie titles locally. The bundled games catalog belongs to manager 6; another manager must match a registered shared title rather than inherit an unrelated numeric ID.

Admins can use **Share existing bundled images** per ranking item to register file metadata and associations without copying images to R2. This is deliberate, scoped registration, not a whole-library backfill. Each image adds at most one file row and one association row, plus their indexes; batches are limited to 40 files. Existing bundled files remain on GitHub Pages.

Crop presets start empty. Admins create named pixel dimensions, contexts, and defaults in Image Studio. A ranking crop requires a configured preset. Multiple ratios are allowed for one title, and Compare uses all its associated images. Changes increment the preset version and do not rewrite existing exports. The Footy card editor uses the same engine, retains its existing 2500 × 3520 fallback, and can select admin-configured Footy presets. The server checks uploaded formats, dimensions, preset context, and version.

## Caching

`service-worker.js` caches same-origin images and only the approved image-library/Footy `/media/` routes. Cloud image URLs are immutable/versioned and cache-first, with no background refresh. Bundled same-origin images revalidate after seven days because their paths can be overwritten by a site update. The cache is capped at 100 MiB / 2000 entries with least-recently-used eviction; metadata is rebuilt if missing or malformed. Bulk offline saving retains cloud copies and skips files already cached.

A corrupt or missing cached raster image falls back to the origin. Successful downloads replace it; storage failures still permit display. The frontend performs at most one additional cache repair per broken image element, so an origin failure or budget cutoff cannot create a retry loop. Cached local and edge copies remain usable during cloud cutoffs. Browsers can independently evict local storage.

## Storage and accounting

The image-library Worker uses the existing Footy D1 database and a new R2 bucket. Migration `0012_image_library.sql` creates empty tables and indexes for files, shared content, aliases, presets, associations, and manager links, plus atomic default-preset triggers. It does not scan buckets, rewrite existing rows, or backfill the bundled library. New roster/match uploads register metadata; older Footy files retain their existing source tables and must still be included in the initial storage baseline.

All R2 operations in the library and Footy Workers reserve allowance in one private SQLite-backed Durable Object, `MediaBudget`, named `account-images-v1`. The object is shared through a namespace binding, not a public HTTP reservation route. Transactions prevent concurrent requests from spending the same allowance. Storage reservations include the full new object before an old object is removed. Read/write/list attempts remain counted even if the operation fails. Failed uploads may conservatively retain storage reservations. Successful deletion releases storage once per immutable object key; deletion remains possible while cloud access is disabled, subject to its daily operation ceiling.

Defaults are **disabled/uninitialized**, 512 MB reserved storage, 100,000 reads and 2,500 writes/listings per billing period, and 2,000 R2 operations/day. Admin configuration cannot exceed 4 GB, 500,000 reads, 20,000 writes/listings, or 4,000 operations/day. Those are application ceilings, not a statement of unused account quota. Reads/listings and uploads fail closed when accounting is missing or unavailable. A billing-cycle start day from 1–28 is fixed at initialization; changing it later requires reviewed maintenance so it cannot reset counters early. Use the earlier day for a billing date after the 28th, keeping a conservative allowance.

The gate limits R2 activity; requests reaching Workers/authentication and the gate itself still use Workers/DO resources, including rejected requests. Metadata queries consume D1. Direct bucket access, other Workers, external S3 clients, and unrelated Cloudflare services bypass this accounting. Keep these resources on Workers Free if the requirement is no automatic compute overages; its SQLite DO operations fail at free limits rather than charging. Do not upgrade plans or enable public bucket domains as part of this rollout. Verify the actual account configuration. [Durable Objects pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/) and [R2 pricing](https://developers.cloudflare.com/r2/pricing/) explain the independent allowances.

## Rollout procedure

The image-library schema, bucket, private gate, and both Workers were deployed on 2026-10-09; see the deployment record below. The R2 gate remains uninitialized and disabled. Further deployment and migration require explicit approval and the account usage review in `.agents/deployment.md`. Code delivery to `dev` does not provision cloud resources. The deployment workflow is manual-only; a normal push builds Pages and runs local quality checks.

1. Verify the Workers plan, current billing period, account R2 storage/operations, D1 usage, and any other R2 access paths. Confirm public bucket access is disabled. Record current storage across roster, match, and library buckets, plus conservative headroom for other account usage. Do not substitute zero for unknown usage.
2. Inspect pending Footy migrations. Review each pending migration, including older ones, before applying them. This task's new schema has zero existing rows to rewrite; it creates empty tables/indexes/triggers. No image objects are copied by the migration.
3. Provision `box-this-lap-image-library` as Standard R2 storage, without a public/custom domain. Creation is one management operation; no image uploads are part of provisioning.
4. After the usage review and approval, dispatch `deploy-image-library-worker.yml` against `dev`, supplying a reference to the approved review and explicitly selecting migration/Footy deployment flags. The library/DO must deploy before Footy's external namespace binding. The workflow uses encrypted GitHub secrets.
5. Initialize the shared budget in Image Studio with the actual existing managed storage baseline and reviewed lower limits. Existing R2 accesses stop until initialization and enablement. A first roster-ledger initialization may list one page per 1000 existing objects and insert/update their D1 ledger rows; inspect whether it is already initialized and include that work in the review before the first usage check/upload.
6. Create crop presets. Verify one small library upload, one title match from another manager, a configured card crop, a cache hit, and a temporary cutoff. Keep verification narrow; do not run a library-wide scan or repeated remote tests.

Recurring admitted R2 work is bounded by the configured operation limits; the default daily ceiling also bounds reads to at most 62,000 in a 31-day interval, even though the billing-period read ceiling is 100,000. One library upload normally uses one R2 Put, a small number of indexed D1 metadata reads/writes, and one gate reservation; deletion adds a gate reservation and an idempotent release. A roster replacement reserves a Put and Delete, then updates its existing ledger and shared registry. A cold library/roster image uses one R2 Get and one gate reservation; match images additionally use an indexed D1 lookup. Cache hits use no R2 operation. No cron, automatic backfill, account-usage polling, or server-side image transformation is added.

Actual account headroom, existing object counts, and previously pending migration impact have not been measured in this code-only task. Those facts are required before rollout. Orphan-reservation reconciliation and any future bulk migration require a separate estimate and approval; never reset the shared accounting object to bypass a cutoff.

## Validation

- `npm run test:images`: API authorization, title/alias ambiguity and manager links, bundled registration, preset conflicts, actual image headers, budget boundaries/concurrency/idempotency, structured Footy cutoffs, and cache reuse/repair/failure.
- `npx vitest run src/features/images`: project validation, selections, fill connectivity, and coordinate transforms.
- `npx playwright test tests/e2e/image-editor.test.mjs`: exact crop pixels, local project reopening, export, pixel tools/selection/history, and embedded local fallback in Chrome/WebKit.
- `npm run check` and the existing mobile smoke suite cover shared routing, dialog containment, source compatibility, and the production mobile bundle budget.

## Metadata-first rollout review (2026-10-08)

Read-only checks confirmed that the image-library Worker and bucket are absent. Only `0012_image_library.sql` is pending; the existing Footy database is about 2.08 MB with 16 tables. The account subscription response lists R2 Paid; it does not establish remaining free-operation allowances or all account usage. No rollout has been executed.

A limited first stage can make presets, shared title metadata, and the safety settings readable while leaving R2 operations disabled. Proposed scope: create one empty Standard bucket; apply the single reviewed migration (six empty tables, seven explicit indexes, two triggers; zero existing application rows rewritten); deploy only the image-library Worker/private gate. Do not deploy Footy, initialize a storage baseline, enable the gate, migrate images, scan buckets, or upload objects. Initial verification is bounded to one health request and the three settings/library reads.

Estimated impact: zero R2 object bytes, zero R2 Get/Put/List/Delete operations, one empty migration-history record plus SQLite schema metadata, conservatively under 256 KiB additional D1 schema storage, and a few deployment/management requests. The gate status read initializes a small SQLite DO state record. There are no new scheduled jobs. Normal metadata use subsequently consumes Workers/D1/DO requests; it is not an account-wide spending cap. Verify Workers Free eligibility before deploying the SQLite DO and review current account allowances before any later R2 enablement. Remaining account headroom has not been measured and must not be treated as zero usage.

The manual deployment workflow exists only on `dev` and is not discoverable through the GitHub workflow API on the default branch. Do not promote to `main` to work around that. Once this bounded scope is explicitly approved, direct deployment with the ready environment credentials is an available fallback; never print or copy their values.

## Deployment record — 2026-10-09

The user authorized “Complete all deploys” after reviewing the bounded rollout above. Completed from `dev` commit `61b540496b6607109d2502120eaca9d0f9bcf3af` using the ready environment credentials because the manual GitHub workflow is not available on the default branch:

- Created `box-this-lap-image-library` as Standard R2 storage; confirmed its public managed domain is disabled.
- Applied only `0012_image_library.sql`: 16 statements, 4.72 ms. The database has 22 tables and 2,166,784 bytes, up 86,016 bytes (84 KiB) from the observed baseline. No existing application rows were rewritten.
- Deployed Image Library and its SQLite Durable Object: version `8eaaf1b5-3c5d-42dd-b6f8-a6df7634c21e`.
- Deployed Footy Notes with the external shared-gate binding: version `50417f7b-76ac-4d8e-96e9-e305bf993228`.

Both health endpoints returned 200; preset CORS preflight from the site's origin returned 204; invalid credentials returned 401. A single cold library request and cold Footy roster request each returned the expected structured 503 before R2 access. Initial urllib client requests received Cloudflare 1010; browser-compatible requests succeeded. Focused image-library, roster, and match-media tests passed locally. Deployment versions were verified through the management API.

Zero R2 object bytes were uploaded and no object Get/Put/List/Delete operations were performed. No bucket scan, backfill, scheduled job, preset seed, plan upgrade, or promotion to `main` was performed. The subscription response still lists R2 Paid; no paid Workers subscription was listed. Account-wide remaining free allowances have not been measured.

Presets, shared metadata, and safety settings can now connect after refresh/sign-in. The shared R2 gate starts closed: cloud image reads and uploads require an admin to supply the verified storage baseline and enable reviewed limits. Cached images remain usable. Do not enter zero for unknown existing storage or bypass the gate to restore availability.
