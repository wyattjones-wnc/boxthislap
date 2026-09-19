# Scriptable Next Countdown Widget

This setup shows a focused countdown in a medium iPhone Home Screen widget, or an upcoming list in a large widget.

## 1. Verify the Next Worker

The widget reads the same Cloudflare Worker and D1 data as the website:

```text
https://box-this-lap-next.boxthislap.workers.dev/api/items
```

The response should include:

```json
{
  "ok": true,
  "items": []
}
```

## 2. Install with the widget loader

Follow the shared setup in:

```text
docs/scriptable-widgets.md
```

The loader installs the script as `Box This Lap Next`. A large widget lists up to six upcoming incomplete items. A medium widget shows one item; run the installed script to choose its focus.

By default, both sizes show only items marked for non-managers on the website. To see the complete list, edit your installed `Box This Lap Next` script in Scriptable and change `SHOW_ALL_NEXT_ITEMS` near the top from `false` to `true`. This setting is in the code, so other installers see the default and no admin setting prompt appears. Updating the widget through the loader replaces this edit; set the flag again after an update.

That choice is saved locally on the phone. The widget will keep focusing on that item through its current-event window, until you run the script again and choose a different one, or until you set a widget parameter.

Run `Box This Lap Widget Loader` again whenever you want to update the installed copy.

After updating an existing Home Screen widget, remove it and add it again once so iOS replaces the previously rendered widget and its old tap action.

## 3. Add the widget

1. Add a Scriptable widget to the Home Screen.
2. Edit the widget.
3. Choose the `Box This Lap Next` script.
4. Set **When Interacting** to **Run Script**.
5. For a medium widget, leave the widget parameter blank if you want to use the saved focus item. The large widget lists upcoming items regardless of the saved focus or parameter.

If no saved focus item exists, or the saved focus item has passed, blank means the widget shows the next upcoming incomplete item.

Optional widget parameters can override the saved choice:

```text
id:12
```

Shows the item with ID `12`.

```text
Fantasy Critic
```

Shows the first incomplete item whose `Thing` contains `Fantasy Critic`.

## Notes

- Scriptable controls widget refresh timing. The script asks for hourly refreshes normally, and once-per-minute refreshes during the final hour before a timed item. iOS may still choose a slower cadence.
- Timed items use a text countdown so they do not begin counting upward after their start time. They show `Now` for one hour, then fall off. All-day items show as `Today` during the current day, then fall off after that day ends.
- Tapping the widget runs the script and shows the current Next item picker.
- The widget reads data directly from the Cloudflare Worker. It does not depend on the website being open.
- If a saved focus used an ID from before the Cloudflare migration, the widget recovers it by its saved item name and stores the new ID.
