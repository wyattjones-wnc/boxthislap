# Frontend architecture direction

## Decision

Box This Lap is migrating from a static DOM controller with React islands to one React and Vite application. The transition is incremental: migrated shell and feature surfaces render through React while the legacy controller continues to own routes that have not moved yet.

The target architecture uses:

- TypeScript and TSX for all new frontend code;
- the existing hash URLs through a typed application router;
- TanStack Query for remote state and mutations;
- React contexts for session, theme, permissions, and PWA state;
- Radix UI for accessible interaction primitives;
- CSS Modules over shared design tokens;
- Lucide React for interface icons.

## Migration boundary

`src/main.tsx` renders the shared application shell before loading the legacy controller. Login, Account Settings, navigation, header artwork, and the footer are the first React-owned surfaces. The remaining page sections stay available to the legacy router until their feature milestone replaces them.

Do not add new application behavior to the monolithic legacy controller when the same work can be implemented in the owning React feature. Temporary bridges must preserve existing element IDs and events only long enough for unmigrated features to keep working.

## Shared component contract

Reusable controls belong under `src/components` and must use the shared tokens. Icon-only buttons use the shared `IconButton`, a Lucide icon, an accessible name, and a tooltip. New dialogs, dropdowns, tabs, and tooltips use Radix primitives rather than bespoke focus or dismissal handling.

Feature CSS belongs in CSS Modules. Global CSS is limited to resets, design tokens, typography, the transitional legacy stylesheet, and application-wide layout.

## Release rules

- Preserve existing hash URLs and browser history behavior.
- Preserve signed-out and non-admin route protection during every migration step.
- Keep feature bundles lazy and within the mobile bundle budget.
- Add component coverage for shared primitives and Playwright coverage for migrated user journeys.
- Delete the legacy markup, listeners, DOM references, and CSS for a feature only after its React replacement passes parity checks.
