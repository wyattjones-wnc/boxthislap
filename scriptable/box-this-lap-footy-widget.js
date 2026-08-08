// Box This Lap - Upcoming Footy Matches Widget for Scriptable
//
// Add this script to Scriptable, then create a medium widget. It shows the
// next three matches from the Box This Lap Footy schedule. The first match is
// intentionally larger. Future matches inside 24 hours are highlighted; a
// started match stays visible for one hour and is highlighted red.

const SCHEDULE_URL = "https://wyattjones-wnc.github.io/boxthislap/dev/data/footy-schedule.json";
const SITE_URL = "https://wyattjones-wnc.github.io/boxthislap/dev/#footy";
const SITE_ASSET_BASE_URL = "https://wyattjones-wnc.github.io/boxthislap/dev/";
const MATCH_LIMIT = 3;
const STARTED_MATCH_WINDOW_MS = 60 * 60 * 1000;
const WIDGET_LOCAL_BADGE_PATHS = {
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
    const fixtures = getUniqueFixtures(getScheduleFixtures(schedule))
      .filter((fixture) => !isFixturePast(fixture))
      .sort((first, second) => getFixtureTime(first) - getFixtureTime(second))
      .slice(0, MATCH_LIMIT);

    return { ok: true, fixtures };
  } catch (error) {
    return {
      ok: false,
      fixtures: [],
      error: String(error && error.message ? error.message : error),
    };
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
  widget.url = SITE_URL;
  widget.setPadding(6, 14, 6, 14);
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
      widget.addSpacer(4);
    }

    await addFixture(widget, fixture);
  }

  widget.refreshAfterDate = getRefreshDate(result.fixtures[0]);
  return widget;
}

function addHeader(widget) {
  const header = widget.addStack();
  header.centerAlignContent();

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
  const isStarted = timingLabel === "Started";
  const cardWidth = getMatchCardWidth();
  const card = widget.addStack();
  card.backgroundColor = isStarted ? new Color("#3a1f2a") : timingLabel ? new Color("#29243a") : COLORS.card;
  card.cornerRadius = 10;
  card.size = new Size(cardWidth, 40);
  card.setPadding(2, 8, 2, 8);

  const badgeImage = await loadTeamBadge(fixture);
  const badgeSlot = card.addStack();
  badgeSlot.size = new Size(28, 0);
  badgeSlot.centerAlignContent();

  if (badgeImage) {
    const badge = badgeSlot.addImage(badgeImage);
    const badgeSize = 24;
    badge.imageSize = new Size(badgeSize, badgeSize);
    badge.cornerRadius = badgeSize / 2;
  } else {
    const placeholder = badgeSlot.addImage(SFSymbol.named("soccerball").image);
    placeholder.imageSize = new Size(22, 22);
    placeholder.tintColor = COLORS.muted;
  }

  card.addSpacer(6);
  const content = card.addStack();
  content.size = new Size(cardWidth - 134, 0);
  content.layoutVertically();
  const match = content.addText(`${fixture.home || "TBD"} v ${fixture.away || "TBD"}`);
  match.font = Font.semiboldSystemFont(11);
  match.textColor = COLORS.text;
  match.lineLimit = 1;
  match.minimumScaleFactor = 0.55;

  if (timingLabel) {
    content.addSpacer(2);
    const chip = content.addStack();
    chip.backgroundColor = isStarted ? COLORS.started : COLORS.accent;
    chip.cornerRadius = 7;
    chip.setPadding(2, 5, 2, 5);
    const label = chip.addText(timingLabel);
    label.font = Font.boldSystemFont(9);
    label.textColor = COLORS.background;
  }

  card.addSpacer();
  const dateStack = card.addStack();
  dateStack.size = new Size(84, 0);
  dateStack.layoutVertically();
  dateStack.centerAlignContent();
  const date = dateStack.addText(formatFixtureDate(fixture));
  date.font = Font.mediumSystemFont(10);
  date.textColor = COLORS.muted;
  date.rightAlignText();
  date.lineLimit = 2;
  date.minimumScaleFactor = 0.7;
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
  return Math.max(290, Math.min(screen.width, screen.height) - 72);
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
