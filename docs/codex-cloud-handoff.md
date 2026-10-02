# Codex Cloud Bootstrap Handoff

## A. Objective

This is the initial Codex Cloud bootstrap task for Box This Lap. Configure,
validate, and publish a reusable Cloud environment for ordinary future work in
this repository. Do not make feature changes, deploy infrastructure, migrate
data, or commit, push, merge, or open a pull request.

Success means that the user can start a completely new Codex Cloud task from
the published environment and immediately do normal project work without
repeating setup instructions or supplying this handoff. Publishing the
environment is distinct from preparing this task's workspace: only the
published setup is inherited by new tasks.

## B. Repository Overview

Box This Lap is a mobile-first personal dashboard for followed football teams,
shared leagues, rankings, gaming collections, and manager workflows. The
frontend is a React/Vite application hosted on GitHub Pages. Compatibility code
in `script.js` and `modules/` still supports features not fully migrated to
React. Cloudflare Workers under `workers/` own authenticated and persistent
features; selected publishing boundaries use Google Apps Script.

Important locations:

- `src/`: React shell, routes, components, and migrated features.
- `modules/` and `script.js`: compatibility services and legacy behavior.
- `workers/`: Cloudflare Worker sources, Wrangler configuration, migrations,
  tests, and focused README files.
- `scripts/` and `.github/workflows/`: data maintenance, validation,
  publishing, and deployment automation.
- `docs/`: focused architecture and operational documentation.
- `AGENTS.md`: durable repository-wide Codex rules.
- `.agents/overview.md`: context map; read only the topic files relevant to the
  current task.

Use `docs/frontend-architecture.md` as the canonical frontend ownership guide.
Do not preload all topic documents or the large legacy files.

## C. Git Workflow

- Repository: `https://github.com/wyattjones-wnc/boxthislap.git`
- Normal development branch: `dev`
- The Cloud environment and ordinary new tasks must start from `dev` unless the
  user explicitly requests another branch.
- A request to edit code authorizes edits and focused validation only. It does
  not authorize a commit, push, merge, pull request, deployment, or publication.
- Preserve unrelated changes and follow the applicable `AGENTS.md` instructions.
- At the beginning of a normal task, confirm the branch, status, and divergence
  from `origin/dev`, then inspect only the context relevant to that task.

## D. Cloud Environment Configuration

Configure a private reusable environment unless the user deliberately requests
workspace sharing.

| Setting                | Value                                  |
| ---------------------- | -------------------------------------- |
| Repository             | `wyattjones-wnc/boxthislap`            |
| Starting branch        | `dev`                                  |
| Runtime                | Node.js `>=22.13.0 <23`                |
| Package manager        | npm `>=10 <11` (`npm@10.9.0` declared) |
| Install script         | Commands below                         |
| Always-running service | None                                   |
| Interactive preview    | `npm run preview` when requested       |
| Full validation        | `npm run check`                        |
| Browser smoke test     | `npm run test:e2e:run`                 |

Use this install script:

```sh
npm ci
npx playwright install --with-deps chromium webkit
```

Enable internet access with the **Package managers** preset and add these
Playwright download hosts:

- `cdn.playwright.dev`
- `playwright.download.prss.microsoft.com`

The package-manager preset supplies npm, GitHub download, and Ubuntu/Debian
package hosts. No repository bootstrap script or global npm package is needed.
Use the lockfile; do not replace `npm ci` with `npm install`.

Do not configure a startup service in the environment. Vite preview is started
on demand and the browser test runner starts and stops its own preview server.

## E. Environment Variables and Secrets

### Baseline setup

No project environment variable or secret is required for `npm ci`,
`npm run check`, the production build, unit tests, or browser smoke tests. Do
not add production credentials merely to make the baseline environment appear
complete.

The entries below are feature-specific. Add one to the Cloud environment only
when a future authorized task must exercise the corresponding live operation.
Never copy values from local files, logs, Worker configuration, or command
history. Obtain values from the user or the service's approved secret store.

### Maintenance and import commands

| Variable                                  | Purpose                            | Required when                       | Secret               |
| ----------------------------------------- | ---------------------------------- | ----------------------------------- | -------------------- |
| `FOOTBALL_DATA_API_KEY`                   | football-data.org fixtures/rosters | Live football probes or refreshes   | Yes                  |
| `API_FOOTBALL_API_KEY` / `API_SPORTS_KEY` | API-Football probe                 | Running that live probe             | Yes                  |
| `FOOTY_ROSTER_SYNC_ENDPOINT`              | Footy roster Worker URL            | Applying a roster refresh           | No                   |
| `FOOTY_ROSTER_SYNC_TOKEN`                 | Authorizes roster sync             | Applying a roster refresh           | Yes                  |
| `FOOTY_MEDIA_SYNC_ENDPOINT`               | Footy media Worker URL             | Applying a media scan               | No                   |
| `FOOTY_MEDIA_SYNC_TOKEN`                  | Authorizes media sync              | Applying a media scan               | Yes                  |
| `FOOTY_MATCH_SYNC_ENDPOINT`               | Footy match-note sync URL          | Publishing schedule-derived matches | No                   |
| `FANTASY_OFFICE_ENDPOINT`                 | Fantasy Office Worker URL          | Applying a Fantasy Office import    | No                   |
| `FANTASY_OFFICE_ADMIN_TOKEN`              | Manager access token for import    | Applying a Fantasy Office import    | Yes                  |
| `FORMULA_ONE_ENDPOINT`                    | Formula One Worker URL             | Applying the 2026 migration         | No                   |
| `FORMULA_ONE_ACCESS_TOKEN`                | Manager access token for migration | Applying the 2026 migration         | Yes                  |
| `CLOUDFLARE_ACCOUNT_ID`                   | Cloudflare account selector        | Authorized D1/API maintenance       | Sensitive identifier |
| `CLOUDFLARE_API_TOKEN`                    | Cloudflare API authentication      | Authorized D1/API maintenance       | Yes                  |
| `D1_DATABASE_ID`                          | Target D1 database                 | Collectibles synchronization        | Sensitive identifier |
| `GH_TOKEN`                                | GitHub issue/report API access     | Failure-report scripts              | Yes                  |

Optional non-secret overrides such as cache paths, lookahead windows, years,
refresh flags, CSV URLs, output paths, and request intervals are declared near
their scripts. They are not environment prerequisites; retain repository
defaults unless a task specifically requires an override.

### GitHub Actions repository secrets

These are consumed by workflows, not by ordinary Cloud development tasks:

- `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`,
  `MERCHANDISE_D1_DATABASE_ID`
- `FOOTBALL_DATA_API_KEY`
- `FOOTY_MATCH_SYNC_ENDPOINT`
- `FOOTY_ROSTER_SYNC_ENDPOINT`, `FOOTY_ROSTER_SYNC_TOKEN`
- `FOOTY_MEDIA_SYNC_ENDPOINT`, `FOOTY_MEDIA_SYNC_TOKEN`
- `FANTASY_OFFICE_SYNC_SECRET`

Do not duplicate repository secrets into Codex Cloud merely because workflows
reference them. GitHub supplies its own workflow token where `GH_TOKEN` is
mapped from `github.token`.

### Worker runtime secrets

Worker deployment and runtime secrets remain in Cloudflare and are outside the
initial bootstrap. The repository documents these names:

- Shared authorization: `AUTH_SECRET`, plus service bindings such as
  `MANAGER_AUTH` or `AUTH_SERVICE`.
- Footy Push: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, optional
  `ADMIN_RUN_TOKEN`, and the shared `AUTH_SECRET`.
- Footy Notes: `ROSTER_SYNC_TOKEN`, `MEDIA_SYNC_TOKEN`,
  `FOOTBALL_DATA_API_KEY`, and `GITHUB_ACTIONS_TOKEN`.
- Fantasy Office: `SYNC_SECRET`.
- PSN Trophies: `PSN_NPSSO`, `PSN_AUTH_ENCRYPTION_KEY`, and `SYNC_SECRET`.
- YouTube Inbox: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
  `YOUTUBE_REFRESH_TOKEN`, `INBOX_PASSPHRASE`, and `SESSION_SECRET`.

Consult the relevant `workers/<name>/README.md` before any explicitly
authorized live operation. Never place these values in Git or an environment
image. Production D1, R2, KV, service bindings, migrations, deployments, and
Apps Script publication are not part of this setup task.

## F. External Services and Network Access

| Service/domain                                                         | Purpose                                                    | Baseline required   | Credentials                              |
| ---------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------- | ---------------------------------------- |
| `registry.npmjs.org` and package-manager preset hosts                  | Locked npm dependencies and Linux packages                 | Yes, during install | No                                       |
| `cdn.playwright.dev`, `playwright.download.prss.microsoft.com`         | Chromium/WebKit binaries                                   | Yes, during install | No                                       |
| `github.com` and GitHub download hosts                                 | Repository checkout and package assets                     | Yes                 | GitHub connection handles private access |
| `api.cloudflare.com`, `*.workers.dev`                                  | Worker/D1 maintenance and live APIs                        | No                  | Usually yes                              |
| `docs.google.com`, `script.google.com`, Google OAuth/YouTube endpoints | Published sheets, Apps Script, and YouTube synchronization | No                  | Depends on operation                     |
| `api.football-data.org`                                                | Football fixtures and rosters                              | No                  | `FOOTBALL_DATA_API_KEY`                  |
| API-Football/API-Sports endpoint                                       | Alternative football coverage probe                        | No                  | API-Football key                         |
| PlayStation/Sony endpoints                                             | PSN trophy synchronization and authentication              | No                  | NPSSO-related secrets                    |
| `api.jolpi.ca`, `api.openf1.org`                                       | Formula 1 schedules and session data                       | No                  | No for public reads                      |
| Merchandise and sports source sites referenced by maintenance scripts  | Catalog/media refresh                                      | No                  | Site-dependent                           |

Normal browser tests route or mock application API requests and must not need
live production services. Add optional domains only for a specifically
authorized task, using the least access needed.

## G. Cloud Validation Procedure

Run the following in the environment setup task:

1. Confirm checkout identity and branch:

   ```sh
   git remote get-url origin
   git branch --show-current
   git status --short --branch
   git rev-list --left-right --count dev...origin/dev
   ```

   Expect this repository on `dev`. Do not alter unrelated work.

2. Read `AGENTS.md` and confirm that `.agents/overview.md` is available for
   topic routing.
3. Confirm `node --version` satisfies `>=22.13.0 <23` and npm satisfies
   `>=10 <11`.
4. From a clean checkout, run the install script exactly as configured.
5. Run the credential-free quality gate:

   ```sh
   npm run check
   ```

6. Run the installed-browser smoke tests without rebuilding again:

   ```sh
   npm run test:e2e:run
   ```

7. Confirm context, whitespace, and repository cleanliness:

   ```sh
   npm run context:check
   git diff --check
   git status --short
   ```

   Expected generated paths such as `node_modules/`, `dist/`, `.tmp/`,
   `test-results/`, and `playwright-report/` are ignored. No tracked file should
   be generated or modified by setup or validation.

If a command fails, distinguish a repository failure from Cloud network,
permission, or environment configuration. Do not hide a failure by adding live
credentials to the baseline environment.

## H. Environment Publishing

After installation and validation succeed, review the environment's repository,
install script, network policy, files, and access setting. Save the configuration
and select **Publish**. Publishing captures the prepared setup for new tasks;
success in only this task workspace is insufficient.

If the agent cannot select Publish directly, ask the user only to review the
environment and select **Publish**, then continue with the post-setup smoke test
after the user confirms publication.

## I. Post-Setup Smoke Test

After **Environment published** appears, start a completely new Cloud task from
the published environment. Do not continue validation only in the setup task.
In the new task, verify:

```sh
git branch --show-current
node --version
npm --version
npm run context:check
npm run check:types
npm run test:react
git status --short
```

Also confirm that dependencies and both Playwright browser executables are
present, `AGENTS.md` applies, `npm run check` and `npm run test:e2e:run` remain
available, and no migration prompt or local-PC path is needed. The new task must
start on `dev` with no tracked setup changes.

## J. Definition of Done

Setup is complete only when all of the following are true:

- The reusable Cloud environment uses this repository and starts from `dev`.
- Node/npm versions and the deterministic install script are configured.
- Baseline setup requires no project secret.
- `npm run check` and `npm run test:e2e:run` succeed, or a known repository
  failure is clearly separated from an environment failure and accepted by the
  user.
- Persistent `AGENTS.md` instructions are detected.
- Required install network access and optional live-service requirements are
  understood.
- The environment is published, or the user has received the single exact
  unavoidable Publish action.
- A fresh task created from the published environment passes the post-setup
  smoke test and does not depend on this handoff.

## First Cloud Task Prompt

> This is the initial Codex Cloud setup task for this repository. Read
> `docs/codex-cloud-handoff.md` completely and follow it. Configure, validate,
> and publish the reusable Cloud environment, then prove the published setup in
> a completely new Cloud task so future tasks can work normally without this
> migration prompt. Do not make unrelated feature changes, deploy anything, or
> commit, push, merge, or open a pull request.
