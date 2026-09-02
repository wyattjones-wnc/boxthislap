# Scriptable Next Countdown Widget

This setup lets an iPhone Home Screen widget count down to an item from the Box This Lap `Next` list.

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

The loader installs the script as `Box This Lap Next`. Run that installed script and choose any upcoming incomplete item from the `Next` list.

That choice is saved locally on the phone. The widget will keep focusing on that item until it passes, you run the script again and choose a different one, or you set a widget parameter.

Run `Box This Lap Widget Loader` again whenever you want to update the installed copy.

## 3. Add the widget

1. Add a Scriptable widget to the Home Screen.
2. Edit the widget.
3. Choose the `Box This Lap Next` script.
4. Leave the widget parameter blank if you want to use the saved focus item.

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
- Timed items stop showing once their time passes. All-day items show as `Today` during the current day, then fall off after that day ends.
- Tapping the widget runs the script and shows the current Next item picker.
- The widget reads data directly from the Cloudflare Worker. It does not depend on the website being open.
- If a saved focus used an ID from before the Cloudflare migration, the widget recovers it by its saved item name and stores the new ID.
