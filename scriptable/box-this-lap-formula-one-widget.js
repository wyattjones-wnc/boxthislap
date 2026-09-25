// Box This Lap - Formula 1 Schedule Widget for Scriptable
//
// Small widgets show the next race. Medium widgets show the next three races
// in vertical sections. Large widgets show the next six rounds.

const SCHEDULE_URL = "https://api.jolpi.ca/ergast/f1/current.json";
const OPENF1_MEETINGS_URL = "https://api.openf1.org/v1/meetings";
const FORMULA_ONE_FLAG_ROOT = "https://media.formula1.com/content/dam/fom-website/2018-redesign-assets/Flags%2016x9";
const SCHEDULE_CACHE_FILE = "box-this-lap-formula-one-schedule.json";
const MEETINGS_CACHE_FILE = "box-this-lap-formula-one-meetings.json";
const RACE_WINDOW_MS = 3 * 60 * 60 * 1000;

const COLORS = {
  background: new Color("#101820"),
  card: new Color("#16212d"),
  border: new Color("#40536b"),
  text: new Color("#f4f7fb"),
  muted: new Color("#aab4c5"),
  accent: new Color("#67d4ff"),
  deadline: new Color("#f1c65b"),
};

const result = await loadSchedule();
if (result.ok) await enrichUpcomingRaceVisuals(result.races);
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
    country: String(race.Circuit && race.Circuit.Location && race.Circuit.Location.country || "").trim(),
    raceAt: parseUtcDateTime(race.date, race.time),
    deadlineAt: parseUtcDateTime(race.Qualifying && race.Qualifying.date, race.Qualifying && race.Qualifying.time),
  })).filter((race) => race.round && race.name && race.raceAt);
}

async function enrichUpcomingRaceVisuals(races) {
  const limit = config.widgetFamily === "large" ? 6 : config.widgetFamily === "small" ? 1 : 3;
  const visibleRaces = races.slice(0, limit);
  if (!visibleRaces.length) return;

  const year = visibleRaces[0].raceAt.getUTCFullYear();
  const meetings = await loadMeetings(year);
  for (const race of visibleRaces) {
    const meeting = findRaceMeeting(race, meetings);
    if (!meeting) continue;
    race.countryFlagUrl = getCountryFlagUrl(race, meeting);
    race.trackImageUrl = String(meeting.circuit_image || "");
    race.countryKey = normalizeCountryName(race.country).replace(/\s+/g, "-") || String(meeting.country_key || meeting.country_code || "country");
    race.circuitKey = String(meeting.circuit_key || "circuit");
  }

  await Promise.all(visibleRaces.map(async (race) => {
    const [flagImage, trackImage] = await Promise.all([
      loadCachedImage(race.countryFlagUrl, `box-this-lap-f1-flag-${race.countryKey}.png`),
      loadCachedImage(race.trackImageUrl, `box-this-lap-f1-track-${race.circuitKey}.png`),
    ]);
    race.flagImage = flagImage;
    race.trackImage = trackImage;
  }));
}

function getCountryFlagUrl(race, meeting) {
  const scheduleCountry = normalizeCountryName(race.country);
  const meetingCountry = normalizeCountryName(meeting.country_name);
  if (!scheduleCountry || scheduleCountry === meetingCountry) {
    return String(meeting.country_flag || "");
  }

  const aliases = {
    uk: "united-kingdom",
    usa: "united-states",
    uae: "united-arab-emirates",
  };
  const slug = aliases[scheduleCountry] || scheduleCountry.replace(/\s+/g, "-");
  return `${FORMULA_ONE_FLAG_ROOT}/${slug}-flag.png`;
}

function normalizeCountryName(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

async function loadMeetings(year) {
  try {
    const request = new Request(`${OPENF1_MEETINGS_URL}?year=${year}`);
    request.timeoutInterval = 20;
    const meetings = await request.loadJSON();
    if (!Array.isArray(meetings)) throw new Error("OpenF1 did not return meetings.");
    writeJsonCache(MEETINGS_CACHE_FILE, { year, meetings });
    return meetings;
  } catch (error) {
    const cached = readJsonCache(MEETINGS_CACHE_FILE);
    if (Number(cached && cached.year) === year && Array.isArray(cached.meetings)) {
      console.warn(`Unable to refresh Formula 1 artwork data; using the saved cache: ${error}`);
      return cached.meetings;
    }
    console.warn(`Unable to load Formula 1 artwork data: ${error}`);
    return [];
  }
}

function findRaceMeeting(race, meetings) {
  const raceDay = race.raceAt.toISOString().slice(0, 10);
  const sameDay = meetings.filter((meeting) => String(meeting.date_end || "").slice(0, 10) === raceDay);
  if (sameDay.length === 1) return sameDay[0];

  const raceName = normalizeRaceName(race.name);
  return meetings.find((meeting) => normalizeRaceName(meeting.meeting_name) === raceName) || sameDay[0] || null;
}

function normalizeRaceName(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/formula 1|grand prix|gp/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

async function loadCachedImage(url, fileName) {
  if (!url) return null;
  const manager = FileManager.local();
  const path = manager.joinPath(manager.documentsDirectory(), fileName);
  if (manager.fileExists(path)) {
    try {
      const cachedImage = manager.readImage(path);
      if (cachedImage) return cachedImage;
      manager.remove(path);
    } catch (error) {
      console.warn(`Unable to read ${fileName}: ${error}`);
      try {
        manager.remove(path);
      } catch {
        // A failed cache cleanup should not prevent a fresh download.
      }
    }
  }

  try {
    const request = new Request(url);
    request.timeoutInterval = 15;
    const image = await request.loadImage();
    manager.writeImage(path, image);
    return image;
  } catch (error) {
    console.warn(`Unable to load Formula 1 artwork from ${url}: ${error}`);
    return null;
  }
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
  widget.setPadding(11, 11, 11, 11);
  applyRaceCardBackground(widget, race, 300, 300, {
    top: 0.28,
    height: 0.36,
    width: 0.76,
  });
  addRaceCardContent(widget, race, {
    roundSize: 11,
    flagWidth: 23,
    flagHeight: 14,
    nameSize: 17,
    labelSize: 10,
    valueSize: 12,
    topGap: 6,
    timeGap: 4,
  });
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
    if (index > 0) columns.addSpacer();
    const column = columns.addStack();
    column.layoutVertically();
    column.size = new Size(98, 112);
    column.backgroundColor = COLORS.card;
    column.cornerRadius = 9;
    column.borderColor = COLORS.border;
    column.borderWidth = 1;
    column.setPadding(6, 7, 6, 7);
    applyRaceCardBackground(column, race, 196, 224, {
      top: 0.3,
      height: 0.32,
      width: 0.72,
    });
    addRaceCardContent(column, race, {
      roundSize: 9,
      flagWidth: 18,
      flagHeight: 11,
      nameSize: 11,
      labelSize: 8,
      valueSize: 9,
      topGap: 3,
      timeGap: 2,
    });
  });
  return widget;
}

function addRaceCardContent(container, race, sizes) {
  const roundRow = container.addStack();
  roundRow.layoutHorizontally();
  roundRow.centerAlignContent();
  const round = roundRow.addText(`R${race.round}`);
  round.font = Font.boldSystemFont(sizes.roundSize);
  round.textColor = COLORS.accent;
  roundRow.addSpacer();
  if (race.flagImage) {
    const flag = roundRow.addImage(race.flagImage);
    flag.imageSize = new Size(sizes.flagWidth, sizes.flagHeight);
    flag.cornerRadius = 2;
    flag.applyFillingContentMode();
  }

  container.addSpacer(sizes.topGap);
  const name = container.addText(shortRaceName(race.name));
  name.font = Font.boldSystemFont(sizes.nameSize);
  name.textColor = COLORS.text;
  name.lineLimit = 2;
  name.minimumScaleFactor = 0.72;
  applyTextShadow(name);

  container.addSpacer();
  addTimeBlock(container, "BET", race.deadlineAt, COLORS.deadline, sizes.labelSize, sizes.valueSize);
  container.addSpacer(sizes.timeGap);
  addTimeBlock(container, "RACE", race.raceAt, COLORS.accent, sizes.labelSize, sizes.valueSize);
}

function applyRaceCardBackground(container, race, width, height, artworkLayout) {
  if (!race.trackImage) return;
  container.backgroundImage = makeTrackBackground(race.trackImage, width, height, artworkLayout);
}

function makeTrackBackground(trackImage, width, height, artworkLayout) {
  const context = new DrawContext();
  context.size = new Size(width, height);
  context.opaque = false;
  context.respectScreenScale = true;
  context.setFillColor(COLORS.card);
  context.fillRect(new Rect(0, 0, width, height));

  const bandTop = height * artworkLayout.top;
  const bandHeight = height * artworkLayout.height;
  const imageSize = trackImage.size;
  const scale = Math.min((width * artworkLayout.width) / imageSize.width, bandHeight / imageSize.height);
  const imageWidth = imageSize.width * scale;
  const imageHeight = imageSize.height * scale;
  const imageRect = new Rect(
    (width - imageWidth) / 2,
    bandTop + (bandHeight - imageHeight) / 2,
    imageWidth,
    imageHeight
  );
  context.drawImageInRect(trackImage, imageRect);
  context.setFillColor(new Color("#101820", 0.12));
  context.fillRect(new Rect(0, 0, width, height));
  return context.getImage();
}

function applyTextShadow(text) {
  text.shadowColor = new Color("#000000", 0.95);
  text.shadowOffset = new Point(0, 1);
  text.shadowRadius = 2;
}

function buildLargeWidget(widget, races, cached) {
  widget.setPadding(10, 12, 10, 12);
  const header = widget.addStack();
  header.centerAlignContent();
  addHeader(header, "Next F1 Races");
  header.addSpacer();
  addCacheLabel(header, cached);
  widget.addSpacer(7);

  races.forEach((race, index) => {
    if (index > 0) widget.addSpacer(7);
    const row = widget.addStack();
    row.layoutHorizontally();
    row.centerAlignContent();
    row.size = new Size(0, 46);
    row.backgroundColor = COLORS.card;
    row.cornerRadius = 8;
    row.setPadding(5, 7, 5, 7);

    const identity = row.addStack();
    identity.layoutVertically();
    identity.size = new Size(88, 0);
    const roundRow = identity.addStack();
    roundRow.layoutHorizontally();
    roundRow.centerAlignContent();
    if (race.flagImage) {
      const flag = roundRow.addImage(race.flagImage);
      flag.imageSize = new Size(12, 8);
      flag.cornerRadius = 1;
      flag.applyFillingContentMode();
      roundRow.addSpacer(3);
    }
    const round = roundRow.addText(`ROUND ${race.round}`);
    round.font = Font.boldSystemFont(9);
    round.textColor = COLORS.accent;
    roundRow.addSpacer();
    const name = identity.addText(shortRaceName(race.name));
    name.font = Font.boldSystemFont(11);
    name.textColor = COLORS.text;
    name.lineLimit = 2;
    name.minimumScaleFactor = 0.78;

    row.addSpacer();
    const trackArea = row.addStack();
    trackArea.size = new Size(52, 36);
    trackArea.centerAlignContent();
    if (race.trackImage) {
      const track = trackArea.addImage(race.trackImage);
      track.imageSize = new Size(52, 36);
      track.applyFittingContentMode();
    }

    row.addSpacer();
    addSizedTimeBlock(row, 72, "BET", race.deadlineAt, COLORS.deadline);
    row.addSpacer();
    addSizedTimeBlock(row, 72, "RACE", race.raceAt, COLORS.accent);
  });
  return widget;
}

function addSizedTimeBlock(container, width, label, date, color) {
  const area = container.addStack();
  area.size = new Size(width, 0);
  addTimeBlock(area, label, date, color, 9, 10.5);
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
    .replace(/Grand Prix/ig, "GP");
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
