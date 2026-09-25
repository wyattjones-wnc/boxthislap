# Box This Lap Scriptable Widgets

The Box This Lap widget loader installs or updates the Footy, Formula 1, and Next widgets without requiring someone to copy each widget's code by hand.

## First-time setup

On the iPhone:

1. Install or open Scriptable.
2. Create one new script named `Box This Lap Widget Loader`.
3. Open [`scriptable/box-this-lap-widget-loader.js`](../scriptable/box-this-lap-widget-loader.js), tap **Raw**, copy its contents into the new script, and save.
4. Run `Box This Lap Widget Loader`.
5. Tap **Install or update all** (or choose one widget).
6. Add a small, medium, or large Scriptable widget to the Home Screen.
7. Edit the Home Screen widget and select the Box This Lap widget you want.
8. Set **When Interacting** to **Run Script**.

Run the loader again at any time to update the installed widget scripts. It confirms before replacing an existing copy. Choose **Update this loader** to check for and install a newer copy of the loader itself; it reports when the installed copy is already current.

The loader uses an explicit version identifier when checking itself, so harmless file-formatting differences cannot trigger repeated updates. After an update check, it returns to the same loader options so you can install or update widgets, check the loader again, or share it.

If a development loader was copied directly but still points at the stable channel, it automatically corrects itself to `dev` when the requested loader or widget is not available on `main`. The corrected channel is saved in the installed loader.

Loader copies installed before self-updating was added must be replaced manually this one last time. Every loader shared or installed afterward can update itself.

If you update a widget that is already on the Home Screen, remove that Home Screen widget and add it again once. iOS can otherwise retain the tap action from the previously rendered widget until a later automatic refresh.

The stable loader downloads from `main`. For a development test, open this URL after installing the loader:

```text
scriptable:///run/Box%20This%20Lap%20Widget%20Loader?channel=dev
```

## Share with someone else

1. Run `Box This Lap Widget Loader` in Scriptable.
2. Tap **Share this installer**.
3. Send the file using Messages, AirDrop, Mail, or another iOS sharing option.
4. The recipient opens the shared script in Scriptable and runs it.
5. They tap **Install or update all**, then add the Scriptable widgets they want to their Home Screen.

This leaves only the iOS-required Home Screen widget addition as a manual setup step. The recipient does not need to visit GitHub or copy either widget script.

The shared installer keeps the source channel of the running loader. Launch the loader with the development URL above before sharing if the recipient should test `dev`; run it normally to share stable `main` versions.

## Interaction

- Scriptable's **When Interacting** setting must be **Run Script**. The widget scripts intentionally leave their tap URL unset so this native interaction setting is not overridden.
- Tap the Footy widget to run it again, fetch the latest schedule, and show a refreshed preview.
- Tap the Formula 1 widget to fetch the latest season schedule and show a refreshed preview.
- Tap the Next widget to run it again and choose from the current upcoming incomplete items in the Next list.

All widgets continue to request automatic background refreshes. iOS decides when those background refreshes actually occur.

## Footy

Footy shows the next three matches in a medium widget or the next eight matches in a large widget. Run the Footy script inside Scriptable to choose the shared default schedule or a manager with a saved, non-empty followed-team selection. Managers who only inherit the shared default are omitted. The choice is saved on the phone; run the script again to change it.

An optional widget parameter overrides the saved choice. Use a manager's first name or manager ID:

```text
Wyatt
```

The widget resolves names and IDs from the live active-manager list, so new managers do not require a script update. Full names and values such as `manager:9` are also accepted. Leave the parameter blank to keep the shared default schedule.

Add `dev` before or after the manager to read the development schedule and preferences:

```text
dev Wyatt
```

## Formula 1

Formula 1 reads the current season schedule directly from Jolpica and displays times in the iPhone's local time zone. The bet deadline is the scheduled qualifying start.

- Small: the next race, its bet deadline, and race time.
- Medium: the next three races in vertical sections.
- Large: the next six rounds in compact rows.

Small and medium race cards include the country flag and a translucent circuit map behind the race details. Schedule and timing remain sourced from Jolpica; OpenF1 supplies the matching visual metadata. The widget caches downloaded flags and circuit maps on the phone.

The widget keeps the last successful schedule on the phone and labels the display `CACHED` if a refresh fails. A race remains visible for three hours after its scheduled start.

## Next

The large Next widget shows up to six upcoming incomplete items as full-width cards with artwork and dates. The medium widget shows one focused countdown. When Next is run in Scriptable, it asks which upcoming incomplete item the medium widget should focus on. That selection is saved on the phone.

Both sizes default to items marked for non-managers. To include all items, edit the installed `Box This Lap Next` script and set `SHOW_ALL_NEXT_ITEMS = true` near the top. The loader overwrites this local edit on updates, so set it again afterward.

An optional widget parameter overrides the saved selection:

```text
id:12
```

This selects the item with ID `12`. Plain text such as `Fantasy Critic` selects the first matching incomplete item.
