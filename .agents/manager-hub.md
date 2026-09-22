# Login, Administration, and Manager Hub

## Entry Points

- Manager Hub and account-facing React structure: [src/features/operational/OperationalPages.tsx](../src/features/operational/OperationalPages.tsx) and [src/features/specialist/SpecialistPages.tsx](../src/features/specialist/SpecialistPages.tsx).
- Browser session compatibility, login flow, workflow cards, summaries, and awards: [script.js](../script.js). Locate the relevant symbol with `rg` and read only its surrounding range.
- Access/refresh tokens, Manager Portal validation, followed teams, and manager-owned data: [workers/rankings/src/index.js](../workers/rankings/src/index.js).
- Manager Portal Apps Script boundary: [scripts/manager-portal-webapp.gs](../scripts/manager-portal-webapp.gs).
- Endpoint and manager/league metadata: [modules/siteConfig.js](../modules/siteConfig.js).

## Invariants

- Manager identity for authenticated APIs comes from the signed access token, never a client-supplied manager ID alone.
- Access tokens are short-lived; refresh tokens remain manager-scoped. Normal login revalidates through Manager Portal.
- Admin-only controls and routes must remain hidden and rejected server-side for non-admin managers.
- Signed-out, login-only, and admin-only route protection must survive React migrations.
- Manager Hub aggregates existing subsystem state; it must not become a second source of truth.

## Detailed Reference

- Shared authentication and persistence: [workers/rankings/README.md](../workers/rankings/README.md).
- Manager team preferences: [docs/manager-team-following.md](../docs/manager-team-following.md).
- React/compatibility boundaries: [docs/frontend-architecture.md](../docs/frontend-architecture.md).

## Regression Risks

- Trusting manager or admin identity from request bodies.
- Persisting mismatched tokens after a manager switch or exposing one manager's summaries to another.
- Adding new structural UI ownership to `script.js` instead of the React feature.

## Focused Validation

- `node --test workers/rankings/test/manager-login.test.mjs`
- `npx vitest run src/features/operational/OperationalPages.test.tsx src/features/specialist/SpecialistPages.test.tsx`
