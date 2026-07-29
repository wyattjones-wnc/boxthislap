# Scriptable Next Countdown Widget

This setup lets an iPhone Home Screen widget count down to an item from the Box This Lap `Next` list.

## 1. Redeploy the Next Apps Script

The widget uses the existing Next data web app:

```text
https://script.google.com/macros/s/AKfycby-gmghq1bBK7MakQQ4xjDxK5FbSdoIc9DZcu26bvupWpVo61meNizhcZ-goaLsx2Vn/exec
```

The script file is:

```text
scripts/next-data-webapp.gs
```

Redeploy it after this change so the new `listNextItems` action is available.

Quick endpoint check:

```text
https://script.google.com/macros/s/AKfycby-gmghq1bBK7MakQQ4xjDxK5FbSdoIc9DZcu26bvupWpVo61meNizhcZ-goaLsx2Vn/exec?action=listNextItems
```

The response should include:

```json
{
  "ok": true,
  "items": []
}
```

## 2. Add the Scriptable script

On the iPhone:

1. Install or open the Scriptable app.
2. Create a new script.
3. Paste the contents of:

```text
scriptable/box-this-lap-next-widget.js
```

4. Save it as something like `Box This Lap Next`.
5. Run the script inside Scriptable.
6. Choose any upcoming incomplete item from the `Next` list.

That choice is saved locally on the phone. The widget will keep focusing on that item until it passes, you run the script again and choose a different one, or you set a widget parameter.

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

- Scriptable controls widget refresh timing. The script asks for a refresh about every 15 minutes, but iOS may choose a slower cadence.
- Tapping the widget opens the site to the `Next` page.
- The widget reads data directly from the Apps Script endpoint. It does not depend on the website being open.
