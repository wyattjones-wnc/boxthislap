# Scriptable Widgets

## Entry Points

- Installer, self-update, channel selection, and sharing: [scriptable/box-this-lap-widget-loader.js](../scriptable/box-this-lap-widget-loader.js).
- Footy schedule widget: [scriptable/box-this-lap-footy-widget.js](../scriptable/box-this-lap-footy-widget.js).
- Next countdown/list widget: [scriptable/box-this-lap-next-widget.js](../scriptable/box-this-lap-next-widget.js).
- Footy schedule generation: [scripts/update-footy-schedule.mjs](../scripts/update-footy-schedule.mjs).
- Next API: [workers/next-items/src/index.js](../workers/next-items/src/index.js).

## Invariants

- Stable installs load from `main`; `channel=dev` deliberately selects development sources and data.
- Installed widget scripts leave their tap URL unset so Scriptable's **When Interacting: Run Script** behavior works.
- Medium Next widgets use a saved or parameter-selected focus item; large widgets show the upcoming list independently.
- Widget parameters override saved selection without corrupting it. Stale Next IDs recover by saved name when possible.
- Widgets request refreshes, but iOS controls actual scheduling; behavior cannot assume minute-accurate background execution.

## Detailed Reference

- Installation, sharing, and interaction: [docs/scriptable-widgets.md](../docs/scriptable-widgets.md).
- Next countdown behavior: [docs/scriptable-next-widget.md](../docs/scriptable-next-widget.md).
- Next Worker contract: [workers/next-items/README.md](../workers/next-items/README.md).

## Regression Risks

- Mixing `main` and `dev` URLs, overwriting local options without warning, or reintroducing an explicit tap URL.
- Treating missing artwork/network data as fatal instead of rendering the supported fallback.
- Assuming an updated script immediately replaces iOS's cached Home Screen widget action.

## Focused Validation

- `node --check scriptable/box-this-lap-widget-loader.js`
- `node --check scriptable/box-this-lap-footy-widget.js`
- `node --check scriptable/box-this-lap-next-widget.js`
