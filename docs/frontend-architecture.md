# Frontend architecture direction

## Decision

Box This Lap is a React and Vite application. Every route, the shared shell, and the footer now have React as their sole structural owner; `index.html` contains only empty application mount points and pre-React recovery bootstrapping.

The target architecture uses:

- TypeScript and TSX for all new frontend code;
- the existing hash URLs through a typed application router;
- TanStack Query for remote state and mutations;
- React contexts for session, theme, permissions, and PWA state;
- Radix UI for accessible interaction primitives;
- CSS Modules over shared design tokens;
- Lucide React for interface icons.

## Application boundary

`src/main.tsx` renders the shared application shell and every route before loading the compatibility data engines. React owns Login, Account Settings, navigation, header artwork, the footer, all operational routes, all specialist routes, and the World Cup, Formula 1, Fantasy Critic, and Fantasy Office competition routes.

Next, To Do, Want, Rankings, and Draft Lists pass normalized view models across small typed event bridges; their cards, tabs, status, and empty states render in React. Guides owns its query, progress mutations, filters, and checklist lifecycle directly through TanStack Query. Footy's route surfaces and dialogs render in React while its fixture and roster services remain compatibility adapters. Compatibility controllers must not replace children inside a React-owned dynamic list.

Manager Hub, Footy, specialist-page, and competition data engines remain explicit compatibility service boundaries. They may update only leaf compatibility IDs provided by their React route components; they do not own route structure. New work must replace a leaf adapter with a typed React query or mutation rather than extend the adapter. Global styles remain only for compatibility-rendered leaf content and are removed alongside the corresponding adapter.

Do not add new application behavior to the monolithic compatibility controller when the same work can be implemented in the owning React feature. Compatibility bridges preserve existing element IDs and events only for live data engines that have not yet been rewritten as typed hooks.

## Shared component contract

Reusable controls belong under `src/components` and must use the shared tokens. Icon-only buttons use the shared `IconButton`, a Lucide icon, an accessible name, and a tooltip. New dialogs, dropdowns, tabs, and tooltips use Radix primitives rather than bespoke focus or dismissal handling.

Feature CSS belongs in CSS Modules. Global CSS is limited to resets, design tokens, typography, the transitional legacy stylesheet, and application-wide layout.

## Release rules

- Preserve existing hash URLs and browser history behavior.
- Preserve signed-out and non-admin route protection during every migration step.
- Keep feature bundles lazy and within the mobile bundle budget.
- Add component coverage for shared primitives and Playwright coverage for migrated user journeys.
- Keep `index.html` page, header, and footer mount points structurally empty; the production build rejects static UI regressions.
- Delete compatibility listeners, DOM references, and CSS for a leaf feature only after its typed React replacement passes parity checks.
