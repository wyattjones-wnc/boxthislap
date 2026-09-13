// Box This Lap - Upcoming Footy Matches Widget for Scriptable
//
// Add this script to Scriptable, then create a medium or large widget. It shows
// the next three matches in a medium widget and the next eight in a large widget.
// Future matches inside 24 hours are highlighted; a started match stays visible
// for one hour and is highlighted red.

const WIDGET_OPTIONS = parseWidgetParameter(args.widgetParameter);
const SITE_CHANNEL = WIDGET_OPTIONS.channel;
const SITE_ROOT = SITE_CHANNEL === "dev"
  ? "https://wyattjones-wnc.github.io/boxthislap/dev/"
  : "https://wyattjones-wnc.github.io/boxthislap/";
const SCHEDULE_URL = `${SITE_ROOT}data/footy-schedule.json`;
const MANAGERS_URL = "https://box-this-lap-rankings.boxthislap.workers.dev/api/managers";
const SITE_ASSET_BASE_URL = SITE_ROOT;
const MATCH_LIMIT = config.widgetFamily === "large" ? 8 : 3;
const SCHEDULE_CACHE_FILE = `box-this-lap-footy-schedule-${SITE_CHANNEL}.json`;
const MANAGERS_CACHE_FILE = "box-this-lap-footy-managers.json";
const SAVED_MANAGER_FILE = `box-this-lap-footy-manager-${SITE_CHANNEL}.json`;
const STARTED_MATCH_WINDOW_MS = 60 * 60 * 1000;
const WIDGET_LOCAL_BADGE_PATHS = {
  "4": "assets/teams/4/badge.png",
  "5": "assets/teams/5/badge.png",
  "6": "assets/teams/6/badge.png",
  "7": "assets/teams/7/badge.png",
};
const FOOTY_LOCAL_TEAM_IDS = {
  arsenal: "1",
  "arsenal fc": "1",
  barcelona: "2",
  "fc barcelona": "2",
  charlotte: "6",
  "charlotte fc": "6",
  "inter miami": "7",
  "inter miami cf": "7",
  usmnt: "4",
  uswmt: "5",
  uswnt: "5",
};

const COLORS = {
  background: new Color("#101820"),
  card: new Color("#16212d"),
  text: new Color("#f4f7fb"),
  muted: new Color("#aab4c5"),
  accent: new Color("#a78bfa"),
  started: new Color("#ff5a7a"),
  nearMatchText: new Color("#201633"),
  nearMatchMuted: new Color("#574d68"),
};
let loadedManagers = null;

if (!WIDGET_OPTIONS.managerValue) {
  if (config.runsInWidget) {
    applySavedManager();
  } else {
    await chooseWidgetManager();
  }
}

const result = await loadFixtures();
const widget = await createWidget(result);

if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  await widget.presentMedium();
}

Script.complete();

async function loadFixtures() {
  let schedule;

  try {
    const request = new Request(`${SCHEDULE_URL}?nonce=${Date.now()}`);
    request.timeoutInterval = 20;
    schedule = await request.loadJSON();

    if (!isValidSchedule(schedule)) {
      throw new Error("The Footy schedule did not return valid data.");
    }

    writeJsonCache(SCHEDULE_CACHE_FILE, schedule);
  } catch (error) {
    schedule = readJsonCache(SCHEDULE_CACHE_FILE);

    if (isValidSchedule(schedule)) {
      console.warn(`Unable to refresh Footy data; using the saved cache: ${error}`);
    } else {
      return {
        ok: false,
        fixtures: [],
        error: String(error && error.message ? error.message : error),
      };
    }
  }

  try {
    await resolveWidgetManager();
    const followedTeamIds = await loadFollowedTeamIds();
    return { ok: true, fixtures: getUpcomingFixtures(schedule, followedTeamIds) };
  } catch (error) {
    return {
      ok: false,
      fixtures: [],
      error: String(error && error.message ? error.message : error),
    };
  }
}

function isValidSchedule(schedule) {
  return Array.isArray(schedule && schedule.teamSchedules);
}

function getUpcomingFixtures(schedule, followedTeamIds = null) {
  return getUniqueFixtures(getScheduleFixtures(schedule, followedTeamIds))
    .filter((fixture) => !isFixturePast(fixture))
    .sort((first, second) => getFixtureTime(first) - getFixtureTime(second))
    .slice(0, MATCH_LIMIT);
}

async function loadFollowedTeamIds() {
  if (!WIDGET_OPTIONS.managerId) {
    return null;
  }

  return getPreferenceTeamIds(await loadManagerPreferences(WIDGET_OPTIONS.managerId));
}

async function loadManagerPreferences(managerId) {
  const followedTeamsUrl = `https://box-this-lap-rankings.boxthislap.workers.dev/api/managers/${encodeURIComponent(managerId)}/followed-teams`;
  const cacheFile = `box-this-lap-footy-teams-${SITE_CHANNEL}-${managerId}.json`;

  try {
    const request = new Request(`${followedTeamsUrl}?nonce=${Date.now()}`);
    request.headers = { "X-Box-This-Lap-Channel": SITE_CHANNEL };
    request.timeoutInterval = 20;
    const preferences = await request.loadJSON();

    if (!preferences || preferences.ok !== true || !Array.isArray(preferences.teams)) {
      throw new Error("The followed-team endpoint returned invalid data.");
    }

    writeJsonCache(cacheFile, {
      teams: preferences.teams,
      usingDefault: preferences.usingDefault === true,
    });
    return preferences;
  } catch (error) {
    const cached = readJsonCache(cacheFile);

    if (Array.isArray(cached && cached.teams) || Array.isArray(cached && cached.teamIds)) {
      console.warn(`Unable to refresh followed teams; using the saved cache: ${error}`);
      return cached;
    }

    throw new Error("Unable to load followed teams.");
  }
}

async function resolveWidgetManager() {
  if (!WIDGET_OPTIONS.managerValue) {
    return;
  }

  const managers = await loadManagers();
  const lookup = normalizeManagerName(WIDGET_OPTIONS.managerValue);
  const manager = managers.find((entry) =>
    entry.active && (
      String(entry.id) === WIDGET_OPTIONS.managerValue ||
      normalizeManagerName(entry.name) === lookup ||
      normalizeManagerName(entry.displayName) === lookup
    ));

  if (!manager) {
    throw new Error(`Unknown or inactive manager: ${WIDGET_OPTIONS.managerValue}`);
  }

  WIDGET_OPTIONS.managerId = manager.id;
  WIDGET_OPTIONS.managerName = manager.displayName || manager.name;
}

async function loadManagers() {
  if (loadedManagers) {
    return loadedManagers;
  }

  let managers;

  try {
    const request = new Request(`${MANAGERS_URL}?nonce=${Date.now()}`);
    request.timeoutInterval = 20;
    const response = await request.loadJSON();
    managers = response && response.ok === true && Array.isArray(response.managers) ? response.managers : null;

    if (!managers) {
      throw new Error("The manager endpoint returned invalid data.");
    }
    writeJsonCache(MANAGERS_CACHE_FILE, { managers });
  } catch (error) {
    managers = readJsonCache(MANAGERS_CACHE_FILE)?.managers;

    if (!Array.isArray(managers)) {
      throw new Error("Unable to load the manager list.");
    }

    console.warn(`Unable to refresh managers; using the saved cache: ${error}`);
  }

  loadedManagers = managers;
  return loadedManagers;
}

async function chooseWidgetManager() {
  let managers;

  try {
    const activeManagers = (await loadManagers())
      .filter((manager) => manager.active)
      .sort((first, second) => (first.displayName || first.name).localeCompare(second.displayName || second.name));
    const managerPreferences = await Promise.all(activeManagers.map(async (manager) => {
      try {
        return { manager, preferences: await loadManagerPreferences(manager.id) };
      } catch (error) {
        console.warn(`Unable to check followed teams for ${manager.displayName || manager.name}: ${error}`);
        return null;
      }
    }));
    managers = managerPreferences
      .filter((entry) => entry && entry.preferences.usingDefault === false && getPreferenceTeamIds(entry.preferences).length > 0)
      .map((entry) => entry.manager);
  } catch (error) {
    console.warn(`Unable to open the manager picker: ${error}`);
    const alert = new Alert();
    alert.title = "Manager Picker Unavailable";
    alert.message = String(error && error.message ? error.message : error);
    alert.addAction("Continue");
    await alert.presentAlert();
    applySavedManager();
    return;
  }

  const alert = new Alert();
  alert.title = "Choose Footy Manager";
  alert.message = "Choose the shared default or a manager who has saved followed teams. Run this script again whenever you want to change schedules.";
  alert.addAction("Shared default schedule");
  managers.forEach((manager) => alert.addAction(manager.displayName || manager.name));
  alert.addCancelAction("Cancel");
  const index = await alert.presentSheet();

  if (index === 0) {
    clearSavedManager();
  } else if (index > 0 && index <= managers.length) {
    saveWidgetManager(managers[index - 1]);
  } else {
    applySavedManager();
  }
}

function saveWidgetManager(manager) {
  writeJsonCache(SAVED_MANAGER_FILE, {
    managerId: String(manager.id),
    managerName: manager.displayName || manager.name,
  });
  WIDGET_OPTIONS.managerValue = String(manager.id);
}

function applySavedManager() {
  const saved = readJsonCache(SAVED_MANAGER_FILE);
  const managerId = String(saved && saved.managerId || "").trim();

  if (managerId) {
    WIDGET_OPTIONS.managerValue = managerId;
  }
}

function clearSavedManager() {
  const fileManager = FileManager.local();
  const path = fileManager.joinPath(fileManager.documentsDirectory(), SAVED_MANAGER_FILE);

  if (fileManager.fileExists(path)) {
    fileManager.remove(path);
  }

  WIDGET_OPTIONS.managerId = "";
  WIDGET_OPTIONS.managerName = "";
  WIDGET_OPTIONS.managerValue = "";
}

function normalizeManagerName(value) {
  return String(value || "").trim().toLowerCase();
}

function getPreferenceTeamIds(preferences) {
  if (Array.isArray(preferences && preferences.teamIds)) {
    return preferences.teamIds.map(String);
  }

  return Array.isArray(preferences && preferences.teams)
    ? preferences.teams
      .slice()
      .sort((first, second) => Number(first.priority) - Number(second.priority))
      .map((team) => String(team.teamId || "").trim())
      .filter(Boolean)
    : [];
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

function getScheduleFixtures(schedule, followedTeamIds = null) {
  if (!Array.isArray(schedule && schedule.teamSchedules)) {
    return [];
  }

  const selectedIds = Array.isArray(followedTeamIds) ? new Set(followedTeamIds.map(String)) : null;

  return schedule.teamSchedules
    .filter((teamSchedule) => !selectedIds || selectedIds.has(String(teamSchedule && teamSchedule.team && teamSchedule.team.id || "")))
    .flatMap((teamSchedule) => {
    const team = teamSchedule && teamSchedule.team ? teamSchedule.team : {};
    const fixtures = Array.isArray(teamSchedule && teamSchedule.fixtures) ? teamSchedule.fixtures : [];

    return fixtures.map((fixture) => ({
      ...fixture,
      teamBadge: String(fixture.teamBadge || team.badge || "").trim(),
      teamName: String(fixture.teamName || team.name || "").trim(),
    }));
  }).filter((fixture) => Number.isFinite(getFixtureTime(fixture)));
}

function getUniqueFixtures(fixtures) {
  const seen = new Set();

  return fixtures.filter((fixture) => {
    const key = String(fixture.matchId || fixture.id || `${fixture.home}|${fixture.away}|${fixture.timestamp || fixture.date}`).trim();

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

async function createWidget(result) {
  const widget = new ListWidget();
  widget.backgroundColor = COLORS.background;
  widget.setPadding(2, 14, 6, 14);
  addHeader(widget);

  if (!result.ok) {
    addErrorState(widget, result.error);
    widget.refreshAfterDate = getRefreshDate(null);
    return widget;
  }

  if (!result.fixtures.length) {
    addEmptyState(widget);
    widget.refreshAfterDate = getRefreshDate(null);
    return widget;
  }

  for (let index = 0; index < result.fixtures.length; index += 1) {
    const fixture = result.fixtures[index];

    if (index > 0) {
      widget.addSpacer(5);
    }

    await addFixture(widget, fixture);
  }

  widget.refreshAfterDate = getRefreshDate(result.fixtures[0]);
  return widget;
}

function addHeader(widget) {
  const header = widget.addStack();
  header.centerAlignContent();
  header.addSpacer(4);

  const title = header.addText(WIDGET_OPTIONS.managerName
    ? `FOOTY · ${WIDGET_OPTIONS.managerName.toUpperCase()}`
    : "FOOTY · NEXT MATCHES");
  title.font = Font.semiboldSystemFont(10);
  title.textColor = COLORS.muted;

  header.addSpacer();
  const image = header.addImage(SFSymbol.named("soccerball").image);
  image.imageSize = new Size(14, 14);
  image.tintColor = COLORS.accent;
  widget.addSpacer(4);
}

async function addFixture(widget, fixture) {
  const timingLabel = getTimingLabel(fixture);
  const appearance = getFixtureAppearance(fixture, timingLabel);
  const cardWidth = getMatchCardWidth();
  const row = widget.addStack();
  row.addSpacer();
  const card = row.addStack();
  card.backgroundColor = appearance.card;
  card.cornerRadius = 10;
  card.size = new Size(cardWidth, 40);
  card.setPadding(2, 8, 2, 8);

  const badgeImage = await loadTeamBadge(fixture);
  const badgeSlot = card.addStack();
  badgeSlot.size = new Size(28, 36);
  badgeSlot.layoutVertically();
  badgeSlot.addSpacer();

  if (badgeImage) {
    const badge = badgeSlot.addImage(badgeImage);
    const badgeSize = 24;
    badge.imageSize = new Size(badgeSize, badgeSize);
    badge.cornerRadius = badgeSize / 2;
  } else {
    const placeholder = badgeSlot.addImage(SFSymbol.named("soccerball").image);
    placeholder.imageSize = new Size(22, 22);
    placeholder.tintColor = appearance.mutedText;
  }
  badgeSlot.addSpacer();

  card.addSpacer(6);
  const content = card.addStack();
  content.size = new Size(cardWidth - 134, 36);
  content.layoutVertically();
  content.addSpacer();
  const match = content.addText(`${fixture.home || "TBD"} v ${fixture.away || "TBD"}`);
  match.font = Font.semiboldSystemFont(12);
  match.textColor = appearance.text;
  match.lineLimit = 1;

  if (timingLabel) {
    content.addSpacer(2);
    const chip = content.addStack();
    chip.backgroundColor = appearance.chip;
    chip.cornerRadius = 6;
    chip.setPadding(1, 4, 1, 4);
    const label = chip.addText(timingLabel);
    label.font = Font.boldSystemFont(8);
    label.textColor = COLORS.background;
  }

  content.addSpacer();

  card.addSpacer();
  const dateStack = card.addStack();
  dateStack.size = new Size(84, 36);
  dateStack.layoutVertically();
  dateStack.addSpacer();
  const date = dateStack.addText(formatFixtureDate(fixture));
  date.font = Font.mediumSystemFont(10);
  date.textColor = appearance.mutedText;
  date.rightAlignText();
  date.lineLimit = 2;
  date.minimumScaleFactor = 0.7;
  dateStack.addSpacer();
  row.addSpacer();
}

async function loadTeamBadge(fixture) {
  const path = String(fixture.teamBadge || (fixture.isHome ? fixture.homeBadge : fixture.awayBadge) || "").trim();
  const localPath = getFootyLocalTeamBadge(fixture.teamName, fixture.teamId);
  const paths = [path, localPath].filter(Boolean);

  for (const badgePath of paths) {
    try {
      const url = /^https?:\/\//i.test(badgePath) ? badgePath : `${SITE_ASSET_BASE_URL}${badgePath.replace(/^\/+/, "")}`;
      const request = new Request(url);
      request.timeoutInterval = 10;
      return await request.loadImage();
    } catch {
      // Try the local team badge after a stale or unavailable schedule badge.
    }
  }

  return null;
}

function getFootyLocalTeamBadge(teamName, teamId = "") {
  const id = String(teamId || "").trim() || FOOTY_LOCAL_TEAM_IDS[normalizeTeamName(teamName)] || "";
  return WIDGET_LOCAL_BADGE_PATHS[id] || (id ? `assets/teams/${encodeURIComponent(id)}/badge.svg` : "");
}

function getMatchCardWidth() {
  const screen = Device.screenSize();
  const screenWidth = Math.min(screen.width, screen.height);

  // Medium widgets do not scale one-to-one with the display width. This
  // tracks Apple's widget margins across common iPhone sizes without relying
  // on a single device-specific width.
  return Math.max(280, Math.round(screenWidth * 0.45 + 134));
}

function normalizeTeamName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function addErrorState(widget, message) {
  widget.addSpacer(8);
  const title = widget.addText("Footy unavailable");
  title.font = Font.boldSystemFont(18);
  title.textColor = COLORS.text;
  const detail = widget.addText(message || "Unable to load the Footy schedule.");
  detail.font = Font.mediumSystemFont(12);
  detail.textColor = COLORS.accent;
  detail.lineLimit = 3;
}

function addEmptyState(widget) {
  widget.addSpacer(8);
  const title = widget.addText("No upcoming matches");
  title.font = Font.boldSystemFont(18);
  title.textColor = COLORS.text;
  const detail = widget.addText("The Footy schedule has no matches to show yet.");
  detail.font = Font.mediumSystemFont(12);
  detail.textColor = COLORS.muted;
  detail.lineLimit = 2;
}

function isFixturePast(fixture) {
  const matchTime = getFixtureTime(fixture);
  return Number.isFinite(matchTime) && matchTime + STARTED_MATCH_WINDOW_MS < Date.now();
}

function getFixtureTime(fixture) {
  const timestamp = String(fixture && fixture.timestamp || "").trim();
  const date = String(fixture && fixture.date || "").trim();
  const time = String(fixture && fixture.time || "").trim();
  const parsedTimestamp = timestamp ? Date.parse(timestamp) : Number.NaN;

  if (time && Number.isFinite(parsedTimestamp)) {
    return parsedTimestamp;
  }

  return date ? Date.parse(`${date}T23:59:59`) : parsedTimestamp;
}

function getTimingLabel(fixture) {
  const matchTime = getFixtureTime(fixture);
  const now = Date.now();

  if (Number.isFinite(matchTime) && matchTime <= now && now <= matchTime + STARTED_MATCH_WINDOW_MS) {
    return "Started";
  }

  if (Number.isFinite(matchTime) && matchTime >= now && matchTime <= now + 24 * 60 * 60 * 1000) {
    return "Next 24h";
  }

  return "";
}

function getFixtureAppearance(fixture, timingLabel) {
  if (timingLabel === "Started") {
    return {
      card: new Color("#3a1f2a"),
      text: COLORS.text,
      mutedText: COLORS.muted,
      chip: COLORS.started,
    };
  }

  const remaining = getFixtureTime(fixture) - Date.now();
  const highlightWindow = 24 * 60 * 60 * 1000;

  if (!Number.isFinite(remaining) || remaining < 0 || remaining > highlightWindow) {
    return { card: COLORS.card, text: COLORS.text, mutedText: COLORS.muted, chip: COLORS.accent };
  }

  const proximity = 1 - Math.max(0, Math.min(1, remaining / highlightWindow));
  const useDarkText = proximity >= 0.5;

  return {
    card: new Color(interpolateHexColor("#29243a", "#e8e0ff", proximity)),
    text: useDarkText ? COLORS.nearMatchText : COLORS.text,
    mutedText: useDarkText ? COLORS.nearMatchMuted : COLORS.muted,
    chip: COLORS.accent,
  };
}

function interpolateHexColor(from, to, amount) {
  const channels = [1, 3, 5].map((offset) => {
    const start = parseInt(from.slice(offset, offset + 2), 16);
    const end = parseInt(to.slice(offset, offset + 2), 16);
    return Math.round(start + (end - start) * amount).toString(16).padStart(2, "0");
  });
  return `#${channels.join("")}`;
}

function formatFixtureDate(fixture) {
  const date = new Date(getFixtureTime(fixture));
  const formatter = new DateFormatter();
  formatter.dateFormat = "EEE, MMM d\nh:mm a";
  return formatter.string(date);
}

function getRefreshDate(firstFixture) {
  const now = new Date();
  const matchTime = firstFixture ? getFixtureTime(firstFixture) : Number.NaN;

  if (Number.isFinite(matchTime) && matchTime <= now.getTime() && now.getTime() < matchTime + STARTED_MATCH_WINDOW_MS) {
    return new Date(Math.min(now.getTime() + 15 * 60 * 1000, matchTime + STARTED_MATCH_WINDOW_MS + 60 * 1000));
  }

  if (Number.isFinite(matchTime) && matchTime > now.getTime() && matchTime - now.getTime() < 24 * 60 * 60 * 1000) {
    return new Date(now.getTime() + 15 * 60 * 1000);
  }

  return new Date(now.getTime() + 60 * 60 * 1000);
}

function parseWidgetParameter(value) {
  const tokens = String(value || "")
    .split(/[\s,;|]+/)
    .map((token) => token.trim())
    .filter(Boolean);
  const channelIndex = tokens.findIndex((token) => ["dev", "main"].includes(token.toLowerCase()));
  const channel = channelIndex >= 0 ? tokens.splice(channelIndex, 1)[0].toLowerCase() : "main";
  const managerValue = tokens.join(" ").replace(/^manager:/i, "").trim();

  if (!managerValue) {
    return { channel, managerId: "", managerName: "", managerValue: "" };
  }

  return { channel, managerId: "", managerName: "", managerValue };
}
