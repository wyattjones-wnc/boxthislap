# Box This Lap Scriptable Widgets

The Box This Lap widget loader installs or updates the Footy and Next widgets without requiring someone to copy each widget's code by hand.

## First-time setup

On the iPhone:

1. Install or open Scriptable.
2. Create one new script named `Box This Lap Widget Loader`.
3. Open [`scriptable/box-this-lap-widget-loader.js`](../scriptable/box-this-lap-widget-loader.js), tap **Raw**, copy its contents into the new script, and save.
4. Run `Box This Lap Widget Loader`.
5. Tap **Install or update both** (or choose one widget).
6. Add a medium Scriptable widget to the Home Screen.
7. Edit the Home Screen widget and select `Box This Lap Footy` or `Box This Lap Next`.

Run the loader again at any time to update the installed widget scripts. It confirms before replacing an existing copy.

The stable loader downloads from `main`. For a development test, open this URL after installing the loader:

```text
scriptable:///run/Box%20This%20Lap%20Widget%20Loader?channel=dev
```

## Interaction

- Tap the Footy widget to run it again, fetch the latest schedule, and show a refreshed preview.
- Tap the Next widget to run it again and choose from the current upcoming incomplete items in the Next list.

Both widgets continue to request automatic background refreshes. iOS decides when those background refreshes actually occur.

## Footy

Footy shows the next three matches. Its optional widget parameter is:

```text
dev
```

Leave the parameter blank for production data. Use `dev` to read the development schedule.

## Next

When Next is run in Scriptable, it asks which upcoming incomplete item the widget should focus on. That selection is saved on the phone.

An optional widget parameter overrides the saved selection:

```text
id:12
```

This selects the item with ID `12`. Plain text such as `Fantasy Critic` selects the first matching incomplete item.
