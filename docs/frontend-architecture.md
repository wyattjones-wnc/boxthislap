# Frontend architecture direction

## Decision

Continue the incremental React-island migration instead of rewriting Box This Lap as a single-page application.

The site now benefits from a framework where component lifecycle and interaction state are most valuable: reusable dialogs and complex inputs. Existing routes, static-first rendering, data loaders, and feature controllers should remain in place until a specific feature earns a migration. This keeps public pages lightweight and limits risk across the site's many independent data sources and administrative tools.

## Shared dialog contract

Every modal must use `openContainedDialog` from `modules/dialogs/containDialog.js`, either directly or through the React `useContainedDialog` hook. The contract provides:

- page scroll locking with position restoration;
- touch and wheel boundary containment;
- correct behavior when one modal opens over another;
- initial-focus support;
- cleanup for button, Escape, and programmatic closes.

Long forms should use the React `FormDialog` layout or the legacy `.legacy-contained-dialog` structure so the heading and actions remain fixed around one `.legacy-dialog-scroll` region. Mobile inputs must remain at least 16px to prevent iOS focus zoom.

## Migration rule

Build new stateful forms as React islands mounted into their page's existing HTML root. Migrate an existing form when it needs meaningful interaction work, not solely to replace working markup. Keep page routing and server-renderable/static content framework-independent.

A full React SPA would add a large routing, boot-time, regression, and deployment migration without directly improving the current mobile experience. Revisit that decision only if shared client-side navigation and cross-page state become primary product requirements.
