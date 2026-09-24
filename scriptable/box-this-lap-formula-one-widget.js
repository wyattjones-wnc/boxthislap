// Box This Lap - Formula 1 Schedule Widget for Scriptable
//
// Small widgets show the next race. Medium widgets show the next three races
// in vertical sections. Large widgets show the next six rounds.

const SCHEDULE_URL = "https://api.jolpi.ca/ergast/f1/current.json";
const SCHEDULE_CACHE_FILE = "box-this-lap-formula-one-schedule.json";
const RACE_WINDOW_MS = 3 * 60 * 60 * 1000;

const COLORS = {
  background: new Color("#101820"),
  card: new Color("#16212d"),
  border: new Color("#2b3a4e"),
  text: new Color("#f4f7fb"),
  muted: new Color("#aab4c5"),
  accent: new Color("#e10600"),
  deadline: new Color("#f1c65b"),
};

const result = await loadSchedule();
const widget = createWidget(result);

if (config.runsInWidget) {
  Script.setWidget(widget);
} else if (config.widgetFamily === "large") {
  await widget.presentLarge();
} else if (config.widgetFamily === "small") {
  await widget.presentSmall();
} else {
  await widget.presentMedium();
}

Script.complete();

async function loadSchedule() {
  try {
    const request = new Request(`${SCHEDULE_URL}?nonce=${Date.now()}`);
    request.timeoutInterval = 20;
    const data = await request.loadJSON();
    const races = normalizeSchedule(data);
    if (!races.length) throw new Error("The Formula 1 schedule did not return any races.");
    writeJsonCache(SCHEDULE_CACHE_FILE, data);
    return { ok: true, races: getUpcomingRaces(races) };
  } catch (error) {
    const cached = readJsonCache(SCHEDULE_CACHE_FILE);
    const races = normalizeSchedule(cached);
    if (races.length) {
      console.warn(`Unable to refresh Formula 1 data; using the saved cache: ${error}`);
      return { ok: true, races: getUpcomingRaces(races), cached: true };
    }
    return { ok: false, races: [], error: String(error && error.message ? error.message : error) };
  }
}

function normalizeSchedule(data) {
  const races = data && data.MRData && data.MRData.RaceTable && data.MRData.RaceTable.Races;
  if (!Array.isArray(races)) return [];

  return races.map((race) => ({
    round: Number(race.round),
    name: String(race.raceName || `Round ${race.round || ""}`).trim(),
    raceAt: parseUtcDateTime(race.date, race.time),
    deadlineAt: parseUtcDateTime(race.Qualifying && race.Qualifying.date, race.Qualifying && race.Qualifying.time),
  })).filter((race) => race.round && race.name && race.raceAt);
}

function parseUtcDateTime(dateValue, timeValue) {
  const date = String(dateValue || "").trim();
  const time = String(timeValue || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const parsed = new Date(`${date}T${/^\d{2}:\d{2}(?::\d{2})?Z$/.test(time) ? time : "00:00:00Z"}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getUpcomingRaces(races) {
  const cutoff = Date.now() - RACE_WINDOW_MS;
  return races
    .filter((race) => race.raceAt.getTime() >= cutoff)
    .sort((first, second) => first.raceAt - second.raceAt);
}

function createWidget(result) {
  const widget = new ListWidget();
  widget.backgroundColor = COLORS.background;
  widget.refreshAfterDate = new Date(Date.now() + 60 * 60 * 1000);

  if (!result.ok) {
    widget.setPadding(14, 14, 14, 14);
    addHeader(widget, "F1 Schedule");
    widget.addSpacer(10);
    addState(widget, "Schedule unavailable", result.error, COLORS.accent);
    return widget;
  }

  const limit = config.widgetFamily === "large" ? 6 : config.widgetFamily === "small" ? 1 : 3;
  const races = result.races.slice(0, limit);
  if (!races.length) {
    widget.setPadding(14, 14, 14, 14);
    addHeader(widget, "F1 Schedule");
    widget.addSpacer(10);
    addState(widget, "Season complete", "No upcoming races were found.", COLORS.muted);
    return widget;
  }

  if (config.widgetFamily === "small") return buildSmallWidget(widget, races[0]);
  if (config.widgetFamily === "large") return buildLargeWidget(widget, races, result.cached);
  return buildMediumWidget(widget, races, result.cached);
}

function buildSmallWidget(widget, race) {
  widget.setPadding(12, 12, 12, 12);
  addHeader(widget, `Round ${race.round}`);
  widget.addSpacer(8);

  const name = widget.addText(shortRaceName(race.name));
  name.font = Font.boldSystemFont(17);
  name.textColor = COLORS.text;
  name.lineLimit = 2;
  name.minimumScaleFactor = 0.75;
  widget.addSpacer();

  addTimeBlock(widget, "BET", race.deadlineAt, COLORS.deadline, 11, 12);
  widget.addSpacer(5);
  addTimeBlock(widget, "RACE", race.raceAt, COLORS.accent, 11, 12);
  return widget;
}

function buildMediumWidget(widget, races, cached) {
  widget.setPadding(10, 10, 10, 10);
  const header = widget.addStack();
  header.centerAlignContent();
  addHeader(header, "Next F1 Races");
  header.addSpacer();
  addCacheLabel(header, cached);
  widget.addSpacer(7);

  const columns = widget.addStack();
  columns.layoutHorizontally();
  races.forEach((race, index) => {
    if (index > 0) columns.addSpacer(6);
    const column = columns.addStack();
    column.layoutVertically();
    column.size = new Size(98, 112);
    column.backgroundColor = COLORS.card;
    column.cornerRadius = 9;
    column.borderColor = COLORS.border;
    column.borderWidth = 1;
    column.setPadding(6, 7, 6, 7);

    const round = column.addText(`R${race.round}`);
    round.font = Font.boldSystemFont(9);
    round.textColor = COLORS.accent;
    const name = column.addText(shortRaceName(race.name));
    name.font = Font.boldSystemFont(11);
    name.textColor = COLORS.text;
    name.lineLimit = 2;
    name.minimumScaleFactor = 0.75;
    column.addSpacer();
    addTimeBlock(column, "BET", race.deadlineAt, COLORS.deadline, 8, 9);
    column.addSpacer(3);
    addTimeBlock(column, "RACE", race.raceAt, COLORS.accent, 8, 9);
  });
  return widget;
}

function buildLargeWidget(widget, races, cached) {
  widget.setPadding(10, 12, 10, 12);
  const header = widget.addStack();
  header.centerAlignContent();
  addHeader(header, "Next 6 F1 Rounds");
  header.addSpacer();
  addCacheLabel(header, cached);
  widget.addSpacer(7);

  races.forEach((race, index) => {
    if (index > 0) widget.addSpacer(4);
    const row = widget.addStack();
    row.layoutHorizontally();
    row.centerAlignContent();
    row.size = new Size(0, 45);
    row.backgroundColor = COLORS.card;
    row.cornerRadius = 8;
    row.setPadding(5, 7, 5, 7);

    const identity = row.addStack();
    identity.layoutVertically();
    identity.size = new Size(132, 0);
    const round = identity.addText(`ROUND ${race.round}`);
    round.font = Font.boldSystemFont(8);
    round.textColor = COLORS.accent;
    const name = identity.addText(shortRaceName(race.name));
    name.font = Font.boldSystemFont(11);
    name.textColor = COLORS.text;
    name.lineLimit = 1;
    name.minimumScaleFactor = 0.7;

    row.addSpacer(7);
    addTimeBlock(row, "BET", race.deadlineAt, COLORS.deadline, 8, 10);
    row.addSpacer(10);
    addTimeBlock(row, "RACE", race.raceAt, COLORS.accent, 8, 10);
  });
  return widget;
}

function addHeader(container, titleText) {
  const title = container.addText(titleText);
  title.font = Font.boldSystemFont(14);
  title.textColor = COLORS.text;
  return title;
}

function addCacheLabel(container, cached) {
  if (!cached) return;
  const label = container.addText("CACHED");
  label.font = Font.boldSystemFont(8);
  label.textColor = COLORS.muted;
}

function addTimeBlock(container, labelText, date, color, labelSize, valueSize) {
  const block = container.addStack();
  block.layoutVertically();
  const label = block.addText(labelText);
  label.font = Font.boldSystemFont(labelSize);
  label.textColor = color;
  const value = block.addText(date ? formatRaceTime(date) : "TBA");
  value.font = Font.semiboldSystemFont(valueSize);
  value.textColor = COLORS.text;
  value.lineLimit = 1;
  value.minimumScaleFactor = 0.7;
  return block;
}

function formatRaceTime(date) {
  const formatter = new DateFormatter();
  formatter.dateFormat = "EEE M/d h:mm a";
  return formatter.string(date);
}

function shortRaceName(value) {
  return String(value || "")
    .replace(/ Formula 1 Grand Prix$/i, " GP")
    .replace(/ Grand Prix$/i, " GP");
}

function addState(widget, titleText, detailText, detailColor) {
  const title = widget.addText(titleText);
  title.font = Font.boldSystemFont(18);
  title.textColor = COLORS.text;
  widget.addSpacer(5);
  const detail = widget.addText(detailText || "Try again later.");
  detail.font = Font.mediumSystemFont(11);
  detail.textColor = detailColor;
  detail.lineLimit = 4;
}

function readJsonCache(fileName) {
  const manager = FileManager.local();
  const path = manager.joinPath(manager.documentsDirectory(), fileName);
  if (!manager.fileExists(path)) return null;
  try {
    return JSON.parse(manager.readString(path));
  } catch (error) {
    console.warn(`Unable to read ${fileName}: ${error}`);
    return null;
  }
}

function writeJsonCache(fileName, data) {
  const manager = FileManager.local();
  const path = manager.joinPath(manager.documentsDirectory(), fileName);
  try {
    manager.writeString(path, JSON.stringify(data));
  } catch (error) {
    console.warn(`Unable to save ${fileName}: ${error}`);
  }
}
