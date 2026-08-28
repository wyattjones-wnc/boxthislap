// Box This Lap - Next Countdown Widget for Scriptable
//
// Run this script inside Scriptable to choose the Next item the widget should
// focus on. That choice is saved locally on the phone.
//
// Optional widget parameter overrides:
// - Leave blank: show the saved focus item if it is still upcoming, or the next
//   upcoming incomplete item.
// - id:12: show the Next row with ID 12.
// - Fantasy Critic: show the first incomplete item whose Thing contains that text.

const NEXT_ITEMS_ENDPOINT = "https://box-this-lap-next.boxthislap.workers.dev/api/items";
const SITE_URL = "https://wyattjones-wnc.github.io/boxthislap/#next";
const SAVED_FOCUS_FILE = "box-this-lap-next-focus.json";
const NEXT_ITEMS_CACHE_FILE = "box-this-lap-next-items-cache-v2.json";
const REQUESTED_ITEM = String(args.widgetParameter || "").trim();

const COLORS = {
  background: new Color("#101820"),
  card: new Color("#16212d"),
  border: new Color("#2b3a4e"),
  text: new Color("#f4f7fb"),
  muted: new Color("#aab4c5"),
  accent: new Color("#ff5a7a"),
  warning: new Color("#f1c65b"),
};

const result = await loadNextItems();

if (result.ok && !config.runsInWidget) {
  await chooseFocusItem(result.items);
}

const savedFocus = readSavedFocus();
const item = result.ok ? chooseItem(result.items, REQUESTED_ITEM, savedFocus) : null;
const widget = await createWidget(item, result);

if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  await widget.presentMedium();
}

Script.complete();

async function loadNextItems() {
  try {
    const request = new Request(`${NEXT_ITEMS_ENDPOINT}?nonce=${Date.now()}`);
    request.timeoutInterval = 20;
    const data = await request.loadJSON();
    const items = getNormalizedNextItems(data);

    if (!items) {
      throw new Error(data && data.error ? data.error : "The Next endpoint did not return items.");
    }

    writeJsonCache(NEXT_ITEMS_CACHE_FILE, data);
    return {
      ok: true,
      items,
    };
  } catch (error) {
    const cachedData = readJsonCache(NEXT_ITEMS_CACHE_FILE);
    const cachedItems = getNormalizedNextItems(cachedData);

    if (cachedItems) {
      console.warn(`Unable to refresh Next data; using the saved cache: ${error}`);
      return { ok: true, items: cachedItems, cached: true };
    }

    return {
      ok: false,
      error: String(error && error.message ? error.message : error),
      items: [],
    };
  }
}

function getNormalizedNextItems(data) {
  if (!data || data.ok !== true || !Array.isArray(data.items)) {
    return null;
  }

  return data.items
    .map(normalizeItem)
    .filter((nextItem) => nextItem.id && nextItem.thing && nextItem.startDate);
}

function readJsonCache(fileName) {
  const fileManager = FileManager.local();
  const path = fileManager.joinPath(fileManager.documentsDirectory(), fileName);

  if (!fileManager.fileExists(path)) {
    return null;
  }

  try {
    return JSON.parse(fileManager.readString(path));
  } catch (error) {
    console.warn(`Unable to read ${fileName}: ${error}`);
    return null;
  }
}

function writeJsonCache(fileName, data) {
  const fileManager = FileManager.local();
  const path = fileManager.joinPath(fileManager.documentsDirectory(), fileName);

  try {
    fileManager.writeString(path, JSON.stringify({
      ...data,
      cachedAt: new Date().toISOString(),
    }));
  } catch (error) {
    console.warn(`Unable to save ${fileName}: ${error}`);
  }
}

async function chooseFocusItem(items) {
  const sortedItems = sortItemsForPicker(items.filter(isUpcomingItem));
  const alert = new Alert();
  alert.title = "Choose Next Widget Focus";
  alert.message = "Pick any upcoming incomplete item from the Next list. The widget will keep showing this item until it passes, you choose another one, or set a widget parameter.";

  sortedItems.forEach((item) => {
    alert.addAction(`${item.thing} (${formatPickerDate(item)})`);
  });

  alert.addDestructiveAction("Clear saved focus");
  alert.addCancelAction("Cancel");

  const index = await alert.presentSheet();

  if (index >= 0 && index < sortedItems.length) {
    saveFocus(sortedItems[index]);
    return;
  }

  if (index === sortedItems.length) {
    clearSavedFocus();
  }
}

function chooseItem(items, parameter, savedFocus) {
  const upcomingItems = items.filter(isUpcomingItem);

  if (parameter) {
    return findItem(upcomingItems, parameter, upcomingItems);
  }

  if (savedFocus && savedFocus.id) {
    const savedThing = String(savedFocus.thing || "").trim().toLowerCase();
    const savedItem = upcomingItems.find((item) =>
      item.id.toLowerCase() === savedFocus.id.toLowerCase() &&
      (!savedThing || item.thing.toLowerCase() === savedThing)
    );

    if (savedItem) {
      return savedItem;
    }

    if (savedThing) {
      const remappedItem = upcomingItems.find((item) => item.thing.toLowerCase() === savedThing);

      if (remappedItem) {
        saveFocus(remappedItem);
        return remappedItem;
      }
    }
  }

  return upcomingItems
    .sort((first, second) => {
      const firstTime = first.startDate.getTime();
      const secondTime = second.startDate.getTime();

      if (firstTime !== secondTime) {
        return firstTime - secondTime;
      }

      return Number(second.priorityLevel || 0) - Number(first.priorityLevel || 0);
    })[0] || null;
}

function isUpcomingItem(item) {
  if (!item || item.completed || !item.startDate) {
    return false;
  }

  const now = new Date();
  const relevantEnd = getItemRelevantEnd(item);

  return relevantEnd >= now;
}

function findItem(items, parameter, incompleteItems) {
  const lowerParameter = parameter.toLowerCase();
  const idMatch = lowerParameter.match(/^id\s*:\s*(.+)$/);

  if (idMatch) {
    return incompleteItems.find((item) => item.id.toLowerCase() === idMatch[1].trim().toLowerCase()) ||
      items.find((item) => item.id.toLowerCase() === idMatch[1].trim().toLowerCase()) ||
      null;
  }

  return incompleteItems.find((item) => item.thing.toLowerCase().includes(lowerParameter)) ||
    items.find((item) => item.thing.toLowerCase().includes(lowerParameter)) ||
    null;
}

function sortItemsForPicker(items) {
  return [...items].sort((first, second) => {
    const firstTime = first.startDate ? first.startDate.getTime() : Number.MAX_SAFE_INTEGER;
    const secondTime = second.startDate ? second.startDate.getTime() : Number.MAX_SAFE_INTEGER;

    if (firstTime !== secondTime) {
      return firstTime - secondTime;
    }

    return first.thing.localeCompare(second.thing);
  });
}

async function createWidget(item, result) {
  const widget = new ListWidget();
  widget.backgroundColor = COLORS.background;
  widget.url = SITE_URL;
  widget.setPadding(14, 14, 14, 14);

  const hasBackgroundImage = item ? await applyItemBackground(widget, item) : false;

  if (hasBackgroundImage) {
    widget.setPadding(10, 10, 10, 10);
  }

  const header = widget.addStack();
  header.centerAlignContent();

  const title = header.addText("Box This Lap");
  title.font = Font.semiboldSystemFont(12);
  title.textColor = hasBackgroundImage ? COLORS.text : COLORS.muted;
  applyTextShadow(title, hasBackgroundImage);

  header.addSpacer();

  const symbol = SFSymbol.named("calendar.badge.clock");
  const image = header.addImage(symbol.image);
  image.imageSize = new Size(18, 18);
  image.tintColor = COLORS.accent;

  widget.addSpacer(hasBackgroundImage ? 6 : 10);

  if (!result.ok) {
    widget.refreshAfterDate = getWidgetRefreshDate(null);
    addErrorState(widget, result.error);
    return widget;
  }

  if (!item) {
    widget.refreshAfterDate = getWidgetRefreshDate(null);
    addEmptyState(widget);
    return widget;
  }

  const eventState = getEventState(item);
  widget.refreshAfterDate = getWidgetRefreshDate(item);
  const content = widget.addStack();
  content.layoutVertically();

  if (hasBackgroundImage) {
    content.backgroundColor = new Color("#07101a", 0.76);
    content.cornerRadius = 10;
    content.setPadding(6, 9, 6, 9);
  }

  const name = content.addText(item.thing);
  name.font = Font.boldSystemFont(hasBackgroundImage ? 18 : 20);
  name.textColor = COLORS.text;
  name.lineLimit = 2;
  applyTextShadow(name, hasBackgroundImage);

  content.addSpacer(hasBackgroundImage ? 5 : 8);

  const countdown = eventState.usesLiveTimer
    ? content.addDate(item.startDate)
    : content.addText(eventState.label);
  countdown.font = Font.heavySystemFont(hasBackgroundImage ? 22 : 24);
  countdown.textColor = eventState.color;
  countdown.minimumScaleFactor = 0.7;
  if (eventState.usesLiveTimer) {
    countdown.applyTimerStyle();
  }
  applyTextShadow(countdown, hasBackgroundImage);

  content.addSpacer(hasBackgroundImage ? 3 : 6);

  const dateLine = content.addText(formatDateRange(item));
  dateLine.font = Font.mediumSystemFont(hasBackgroundImage ? 12 : 13);
  dateLine.textColor = hasBackgroundImage ? COLORS.text : COLORS.muted;
  dateLine.lineLimit = 2;
  applyTextShadow(dateLine, hasBackgroundImage);

  return widget;
}

async function applyItemBackground(widget, item) {
  if (!item.imageUrl) {
    return false;
  }

  try {
    const request = new Request(item.imageUrl);
    request.timeoutInterval = 15;
    widget.backgroundImage = await request.loadImage();
    return true;
  } catch (error) {
    console.warn(`Unable to load Next image: ${error}`);
    return false;
  }
}

function applyTextShadow(text, enabled) {
  if (!enabled) {
    return;
  }

  text.shadowColor = new Color("#000000", 0.9);
  text.shadowOffset = new Point(0, 1);
  text.shadowRadius = 3;
}

function readSavedFocus() {
  const fileManager = FileManager.local();
  const path = fileManager.joinPath(fileManager.documentsDirectory(), SAVED_FOCUS_FILE);

  if (!fileManager.fileExists(path)) {
    return null;
  }

  try {
    return JSON.parse(fileManager.readString(path));
  } catch (error) {
    return null;
  }
}

function saveFocus(item) {
  const fileManager = FileManager.local();
  const path = fileManager.joinPath(fileManager.documentsDirectory(), SAVED_FOCUS_FILE);
  fileManager.writeString(path, JSON.stringify({
    id: item.id,
    thing: item.thing,
    savedAt: new Date().toISOString(),
  }));
}

function clearSavedFocus() {
  const fileManager = FileManager.local();
  const path = fileManager.joinPath(fileManager.documentsDirectory(), SAVED_FOCUS_FILE);

  if (fileManager.fileExists(path)) {
    fileManager.remove(path);
  }
}

function addErrorState(widget, message) {
  const title = widget.addText("Next unavailable");
  title.font = Font.boldSystemFont(18);
  title.textColor = COLORS.text;

  widget.addSpacer(6);

  const detail = widget.addText(message || "Unable to load Next data.");
  detail.font = Font.mediumSystemFont(12);
  detail.textColor = COLORS.accent;
  detail.lineLimit = 3;
}

function addEmptyState(widget) {
  const title = widget.addText("Nothing next");
  title.font = Font.boldSystemFont(20);
  title.textColor = COLORS.text;

  widget.addSpacer(6);

  const detail = widget.addText("No upcoming incomplete items were found.");
  detail.font = Font.mediumSystemFont(13);
  detail.textColor = COLORS.muted;
}

function normalizeItem(item) {
  const startDate = parseDateTime(item.date, item.time);
  const endDate = item.endDate ? parseDateTime(item.endDate, "") : null;

  return {
    id: String(item.id || "").trim(),
    thing: String(item.thing || "").trim(),
    date: String(item.date || "").trim(),
    endDateText: String(item.endDate || "").trim(),
    time: String(item.time || "").trim(),
    priorityLevel: Number(item.priority ?? item.priorityLevel ?? 0),
    completed: item.completed === true || String(item.completed || "").toLowerCase() === "true",
    nonAdmin: item.nonAdmin === true || String(item.nonAdmin || "").toLowerCase() === "true",
    imageUrl: String(item.imageUrl || item["Image URL"] || "").trim(),
    startDate,
    endDate,
  };
}

function parseDateTime(dateValue, timeValue) {
  const dateParts = parseDateParts(dateValue);

  if (!dateParts) {
    return null;
  }

  const timeParts = parseTimeParts(timeValue);
  return new Date(
    dateParts.year,
    dateParts.month - 1,
    dateParts.day,
    timeParts.hour,
    timeParts.minute,
    0,
    0
  );
}

function parseDateParts(value) {
  const text = String(value || "").trim();

  if (!text) {
    return null;
  }

  const isoMatch = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);

  if (isoMatch) {
    return {
      year: Number(isoMatch[1]),
      month: Number(isoMatch[2]),
      day: Number(isoMatch[3]),
    };
  }

  const slashMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);

  if (slashMatch) {
    const parsedYear = Number(slashMatch[3]);
    return {
      year: parsedYear < 100 ? 2000 + parsedYear : parsedYear,
      month: Number(slashMatch[1]),
      day: Number(slashMatch[2]),
    };
  }

  const parsed = new Date(text);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return {
    year: parsed.getFullYear(),
    month: parsed.getMonth() + 1,
    day: parsed.getDate(),
  };
}

function parseTimeParts(value) {
  const text = String(value || "")
    .trim()
    .replace(/\b(Eastern|EST|EDT|ET)\b/ig, "")
    .trim();

  if (!text) {
    return { hour: 0, minute: 0 };
  }

  const timestampMatch = text.match(/T(\d{1,2}):(\d{2})(?::\d{2})?/);
  if (timestampMatch) {
    return {
      hour: Number(timestampMatch[1]),
      minute: Number(timestampMatch[2] || 0),
    };
  }

  const match = text.match(/^(\d{1,2})(?::(\d{2})(?::\d{2})?)?\s*(AM|PM)?$/i);

  if (!match) {
    return { hour: 0, minute: 0 };
  }

  let hour = Number(match[1]);
  const minute = Number(match[2] || 0);
  const meridiem = String(match[3] || "").toUpperCase();

  if (meridiem === "PM" && hour < 12) {
    hour += 12;
  }

  if (meridiem === "AM" && hour === 12) {
    hour = 0;
  }

  return { hour, minute };
}

function getEventState(item) {
  const now = new Date();
  const endDate = item.endDate ? endOfDay(item.endDate) : null;

  if (endDate && now >= item.startDate && now <= endDate) {
    return { label: "In progress", color: COLORS.warning };
  }

  if (!item.time && isSameCalendarDay(now, item.startDate)) {
    return { label: "Today", color: COLORS.warning };
  }

  if (item.startDate <= now) {
    return { label: "Past", color: COLORS.muted };
  }

  const remaining = item.startDate.getTime() - now.getTime();
  const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
  const hours = Math.floor((remaining / (60 * 60 * 1000)) % 24);
  const minutes = Math.floor((remaining / (60 * 1000)) % 60);

  if (days > 0) {
    return { label: `${days}d ${hours}h`, color: COLORS.accent };
  }

  if (hours > 0) {
    return { label: `${hours}h ${minutes}m`, color: COLORS.accent, usesLiveTimer: true };
  }

  return { label: "< 1 hr", color: COLORS.accent, usesLiveTimer: true };
}

function getWidgetRefreshDate(item) {
  const now = new Date();

  if (!item || !item.startDate) {
    return new Date(now.getTime() + 60 * 60 * 1000);
  }

  const relevantEnd = getItemRelevantEnd(item);
  const remaining = item.startDate.getTime() - now.getTime();
  const refreshMs = remaining > 0 && remaining < 60 * 60 * 1000
    ? 60 * 1000
    : remaining > 0 && remaining < 24 * 60 * 60 * 1000
      ? 15 * 60 * 1000
      : 60 * 60 * 1000;
  const nextRefresh = new Date(now.getTime() + refreshMs);

  if (relevantEnd > now && relevantEnd < nextRefresh) {
    return new Date(relevantEnd.getTime() + 60 * 1000);
  }

  return nextRefresh;
}

function getItemRelevantEnd(item) {
  if (item.endDate) {
    return endOfDay(item.endDate);
  }

  return item.time ? item.startDate : endOfDay(item.startDate);
}

function formatDateRange(item) {
  const start = formatDate(item.startDate, Boolean(item.time));

  if (!item.endDate) {
    return start;
  }

  return `${start} to ${formatDate(item.endDate, false)}`;
}

function formatPickerDate(item) {
  if (!item || !item.startDate) {
    return "no date";
  }

  const formatter = new DateFormatter();
  formatter.dateFormat = item.time ? "MMM d, h:mm a" : "MMM d";
  return formatter.string(item.startDate);
}

function formatDate(date, includeTime) {
  const formatter = new DateFormatter();
  formatter.dateFormat = includeTime ? "MMM d, yyyy h:mm a" : "MMM d, yyyy";
  return `${formatter.string(date)}${includeTime ? " EST" : ""}`;
}

function endOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function isSameCalendarDay(first, second) {
  return first && second &&
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate();
}
