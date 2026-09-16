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

`src/main.tsx` renders the shared application shell before loading the legacy controller. React now owns Login, Account Settings, navigation, header artwork, the footer, the operational page structures for Footy, Next, To Do, Want, Rankings, Guides, Draft Lists, Manager Hub, and manager awards, and the competition page structures for World Cup, Formula 1, Fantasy Critic, and Fantasy Office.

Next, To Do, Want, Rankings, and Draft Lists pass normalized view models across small typed event bridges; their cards, tabs, status, and empty states render in React. Guides owns its query, progress mutations, filters, and checklist lifecycle directly through TanStack Query. Footy's route surfaces and dialogs render in React while its fixture and roster services remain compatibility adapters. Compatibility controllers must not replace children inside a React-owned dynamic list.

Manager Hub, Footy, and the competition data engines are the remaining compatibility service boundaries. They may update only the compatibility IDs provided by their React route components. The static competition markup has been removed. The final migration step will replace those DOM adapters with typed React services and TanStack Query, then remove obsolete global CSS.

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
