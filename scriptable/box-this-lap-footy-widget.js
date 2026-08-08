// Box This Lap - Upcoming Footy Matches Widget for Scriptable
//
// Add this script to Scriptable, then create a medium widget. It shows the
// next three matches from the Box This Lap Footy schedule. The first match is
// intentionally larger. Future matches inside 24 hours are highlighted; a
// started match stays visible for one hour and is highlighted red.

const SCHEDULE_URL = "https://wyattjones-wnc.github.io/boxthislap/dev/data/footy-schedule.json";
const SITE_URL = "https://wyattjones-wnc.github.io/boxthislap/dev/#footy";
const MATCH_LIMIT = 3;
const STARTED_MATCH_WINDOW_MS = 60 * 60 * 1000;

const COLORS = {
  background: new Color("#101820"),
  card: new Color("#16212d"),
  text: new Color("#f4f7fb"),
  muted: new Color("#aab4c5"),
  accent: new Color("#a78bfa"),
  started: new Color("#ff5a7a"),
};

const result = await loadFixtures();
const widget = createWidget(result);

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

function createWidget(result) {
  const widget = new ListWidget();
  widget.backgroundColor = COLORS.background;
  widget.url = SITE_URL;
  widget.setPadding(12, 14, 12, 14);
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

  result.fixtures.forEach((fixture, index) => {
    if (index > 0) {
      widget.addSpacer(7);
    }

    addFixture(widget, fixture, index === 0);
  });

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
  widget.addSpacer(8);
}

function addFixture(widget, fixture, isPrimary) {
  const timingLabel = getTimingLabel(fixture);
  const isStarted = timingLabel === "Started";
  const card = widget.addStack();
  card.layoutVertically();
  card.backgroundColor = isStarted ? new Color("#3a1f2a") : timingLabel ? new Color("#29243a") : COLORS.card;
  card.cornerRadius = 10;
  card.setPadding(isPrimary ? 9 : 6, 9, isPrimary ? 9 : 6, 9);

  const match = card.addText(`${fixture.home || "TBD"} v ${fixture.away || "TBD"}`);
  match.font = isPrimary ? Font.boldSystemFont(16) : Font.semiboldSystemFont(12);
  match.textColor = COLORS.text;
  match.lineLimit = isPrimary ? 2 : 1;
  match.minimumScaleFactor = 0.7;

  const detail = card.addStack();
  detail.centerAlignContent();
  detail.addSpacer();
  const date = detail.addText(formatFixtureDate(fixture));
  date.font = Font.mediumSystemFont(isPrimary ? 11 : 10);
  date.textColor = timingLabel ? (isStarted ? COLORS.started : COLORS.accent) : COLORS.muted;
  date.minimumScaleFactor = 0.75;

  if (timingLabel) {
    detail.addSpacer(6);
    const label = detail.addText(timingLabel);
    label.font = Font.boldSystemFont(9);
    label.textColor = isStarted ? COLORS.started : COLORS.accent;
  }
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
  formatter.dateFormat = "EEE, MMM d · h:mm a";
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
