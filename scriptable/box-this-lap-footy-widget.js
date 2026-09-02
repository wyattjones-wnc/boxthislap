// Box This Lap - Upcoming Footy Matches Widget for Scriptable
//
// Add this script to Scriptable, then create a medium widget. It shows the
// next three matches from the Box This Lap Footy schedule. The first match is
// intentionally larger. Future matches inside 24 hours are highlighted; a
// started match stays visible for one hour and is highlighted red.

const SITE_CHANNEL = String(args.widgetParameter || "main").trim().toLowerCase() === "dev" ? "dev" : "main";
const SITE_ROOT = SITE_CHANNEL === "dev"
  ? "https://wyattjones-wnc.github.io/boxthislap/dev/"
  : "https://wyattjones-wnc.github.io/boxthislap/";
const SCHEDULE_URL = `${SITE_ROOT}data/footy-schedule.json`;
const SITE_ASSET_BASE_URL = SITE_ROOT;
const MATCH_LIMIT = 3;
const SCHEDULE_CACHE_FILE = `box-this-lap-footy-schedule-${SITE_CHANNEL}.json`;
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

const result = await loadFixtures();
const widget = await createWidget(result);

if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  await widget.presentMedium();
}

Script.complete();

async function loadFixtures() {
  try {
    const request = new Request(`${SCHEDULE_URL}?nonce=${Date.now()}`);
    request.timeoutInterval = 20;
    const schedule = await request.loadJSON();

    if (!isValidSchedule(schedule)) {
      throw new Error("The Footy schedule did not return valid data.");
    }

    writeJsonCache(SCHEDULE_CACHE_FILE, schedule);
    return { ok: true, fixtures: getUpcomingFixtures(schedule) };
  } catch (error) {
    const cachedSchedule = readJsonCache(SCHEDULE_CACHE_FILE);

    if (isValidSchedule(cachedSchedule)) {
      console.warn(`Unable to refresh Footy data; using the saved cache: ${error}`);
      return { ok: true, fixtures: getUpcomingFixtures(cachedSchedule), cached: true };
    }

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

function getUpcomingFixtures(schedule) {
  return getUniqueFixtures(getScheduleFixtures(schedule))
    .filter((fixture) => !isFixturePast(fixture))
    .sort((first, second) => getFixtureTime(first) - getFixtureTime(second))
    .slice(0, MATCH_LIMIT);
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

function getScheduleFixtures(schedule) {
  if (!Array.isArray(schedule && schedule.teamSchedules)) {
    return [];
  }

  return schedule.teamSchedules.flatMap((teamSchedule) => {
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

  const title = header.addText("FOOTY · NEXT MATCHES");
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
