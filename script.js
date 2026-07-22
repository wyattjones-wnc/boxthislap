import { loadJson, loadPlayers, loadSheet, loadSheetText } from "./dataLoader.js?v=202607220001";
import {
  WORKFLOW_LOOKAHEAD_DAYS,
  THEME_STORAGE_KEY,
  MANAGER_SESSION_STORAGE_KEY,
  MANAGER_PORTAL_ENDPOINT,
  AWARD_DEFINITIONS,
  BEST_STANDING_PERFORMANCE_VALUE,
  BRACKET_STORAGE_KEY,
  BRACKET_SUBMITTER_STORAGE_KEY,
  BRACKET_SUBMISSION_ENDPOINT,
  BRACKET_MANUAL_PICK_VALUE,
  NATION_POT_RANKS,
  TEST_KNOCKOUT_POT_BONUSES,
  BRACKET_ROUNDS,
  BRACKET_SLOT_REFERENCES,
  MANAGER_COLORS,
  FANTASY_LEAGUES_BY_YEAR,
  FANTASY_CRITIC_LEAGUE_ID,
  FANTASY_CRITIC_PROXY_URL,
  FANTASY_CRITIC_LEAGUE_METADATA,
  FANTASY_CRITIC_PUBLISHER_MANAGERS,
  DEFAULT_PORTAL_MANAGERS,
} from "./modules/siteConfig.js?v=202607220001";

import {
  pageLinks,
  pages,
  tabs,
  tabPanels,
  headerArt,
  navGroups,
  themeToggle,
  copyCurrentPageLinkButton,
  testRulesLinks,
  loginOpenButton,
  loginPanel,
  loginManagerSelect,
  loginPassphraseGroup,
  loginPassphraseInput,
  loginRecoveryPanel,
  loginRecoveryQuestion,
  loginRecoveryAnswerInput,
  loginNewPassphrasePanel,
  loginNewPassphraseInput,
  loginConfirmPassphraseInput,
  loginSubmitButton,
  loginFeedback,
  profileMenu,
  profileMenuButton,
  profileDropdown,
  profileName,
  logoutButton,
  managerHubSubtitle,
  workflowCount,
  workflowList,
  managerSummaryList,
  managerSummaryYearSelect,
  managerAwardsList,
  standingsAwards,
  standingsAwardsList,
  leagueYearSelect,
  leagueList,
  footyPastToggle,
  footyFilterToggle,
  footyFilters,
  footySearchInput,
  footyDateFromFilter,
  footyDateToFilter,
  footyTeamFilter,
  footyScheduleList,
  fantasyCritic2025Content,
  fantasyCritic2026Content,
  formulaOneViews,
  fantasyOfficeViews,
  resultsPage,
  updatedTime,
  dynamicResultImages,
  todayMatchList,
  tomorrowMatchList,
  matchdaySelect,
  matchdayMatchList,
  bracketView,
  bracketClearPicks,
  bracketSubmissionSelect,
  bracketSubmitterInput,
  bracketSubmitButton,
  bracketSubmitStatus,
  draftViewButtons,
  draftPanels,
  draftNationsList,
  draftPlayersList,
  draftPlayerPositionFilter,
  playerChampionshipRows,
  playerPositionFilter,
  nationsLeagueRows,
  managerResultsRows,
  managerResultsFilter,
  standingsAllDataToggle,
  standingsRoundSelect,
  nationTestScoringToggle,
  rulesNationSelect,
  rulesNationBreakdown,
  testingPlayerRows,
} from "./modules/domRefs.js?v=202607210003";
import { createRouter, scrollToPageTop } from "./modules/router.js?v=202607210001";
import { createThemeController } from "./modules/theme.js?v=202607210001";
import {
  formatUpdatedTime,
  normalizeLookupName,
  parseCsvMatrix,
  parseDraftRoundLimit,
  parseRoundMappings,
  parseRoundOptions,
  parseScheduleMatches,
  parseUpdatedTime,
} from "./modules/tableUtils.js?v=202607210001";

const fantasyOfficeMovieSort = {
  direction: "desc",
  key: "points",
};
const formulaOneResultsMode = {
  2025: "yearly",
  2026: "yearly",
};
let bracketPicksFallback = {};
let shouldShowPastFootyFixtures = false;
let shouldShowFootyFilters = false;
let shouldShowAllFootyFixtures = false;
let shouldShowFootyTeamOptions = false;
const FOOTY_INITIAL_FIXTURE_LIMIT = 5;
const siteData = {};
window.boxThisLapData = siteData;


siteData.fantasyCritic = {
  2025: { metadata: FANTASY_CRITIC_LEAGUE_METADATA[2025], status: "loading" },
  2026: { metadata: FANTASY_CRITIC_LEAGUE_METADATA[2026], status: "loading" },
};

const router = createRouter({
  draftPanels,
  draftViewButtons,
  headerArt,
  navGroups,
  onStandingsTabShown: () => renderStandingsAwards(),
  pageLinks,
  pages,
  shouldBlockRulesPage: () => !shouldUseNationTestScoring(),
  tabPanels,
  tabs,
});
const { showDraftView, showPage, showTab } = router;

const { syncThemeToggle } = createThemeController({
  storageKey: THEME_STORAGE_KEY,
  toggle: themeToggle,
});

function renderLeagueList(year) {
  if (!leagueList) {
    return;
  }

  const leagues = FANTASY_LEAGUES_BY_YEAR[year] || [];

  if (leagues.length === 0) {
    leagueList.innerHTML = `<p class="league-empty">No leagues found for ${escapeHtml(year)}.</p>`;
    return;
  }

  leagueList.innerHTML = leagues.map((league) => {
    const isWorldCup = year === "2026" && league === "World Cup";
    const isFantasyCritic = (year === "2025" || year === "2026") && league === "Fantasy Critic";
    const isFormulaOne = (year === "2024" || year === "2025" || year === "2026") && league === "Formula 1";
    const isFantasyOffice = (year === "2025" || year === "2026") && league === "Fantasy Office";
    const canOpen = isWorldCup || isFantasyCritic || isFormulaOne || isFantasyOffice;

    return `
      <article class="league-card${isWorldCup ? " is-current" : ""}">
        <div>
          <h2>${escapeHtml(league)}</h2>
        </div>
        ${renderLeagueCardAction({ isWorldCup, isFantasyCritic, isFormulaOne, isFantasyOffice, canOpen, year })}
      </article>
    `;
  }).join("");
}

function renderLeagueCardAction({ isWorldCup, isFantasyCritic, isFormulaOne, isFantasyOffice, canOpen, year }) {
  if (isWorldCup) {
    return `<a class="league-card-link" href="#results" data-page-link="results">Open</a>`;
  }

  if (isFantasyCritic) {
    return `<a class="league-card-link" href="#fantasy-critic-${escapeHtml(year)}" data-page-link="fantasy-critic-${escapeHtml(year)}">Open</a>`;
  }

  if (isFormulaOne) {
    return `<a class="league-card-link" href="#formula-1-${escapeHtml(year)}-questions" data-page-link="formula-1-${escapeHtml(year)}-questions">Open</a>`;
  }

  if (isFantasyOffice) {
    const page = year === "2026" ? "draft" : "results";
    return `<a class="league-card-link" href="#fantasy-office-${escapeHtml(year)}-${page}" data-page-link="fantasy-office-${escapeHtml(year)}-${page}">Open</a>`;
  }

  return `<button class="league-card-link" type="button" ${canOpen ? "" : "disabled"}>Planned</button>`;
}

function renderFootySchedule(schedule) {
  if (!footyScheduleList) {
    return;
  }

  const fixtures = getFootyScheduleFixtures(schedule);
  syncFootyFilters(fixtures);
  const visibleFixtures = getFilteredFootyFixtures(getVisibleFootyFixtures(fixtures));
  const renderedFixtures = shouldShowAllFootyFixtures
    ? visibleFixtures
    : visibleFixtures.slice(0, FOOTY_INITIAL_FIXTURE_LIMIT);
  const hiddenFixtureCount = Math.max(0, visibleFixtures.length - renderedFixtures.length);
  const errors = getFootyScheduleErrors(schedule);
  const generatedAt = formatFootyGeneratedAt(getFootyScheduleUpdatedAt(schedule));
  const emptyMessage = hasActiveFootyFilters()
    ? "No matches found for the current filters."
    : shouldShowPastFootyFixtures
    ? "No past football fixtures were loaded yet."
    : "No upcoming football fixtures were loaded yet.";
  const updatedMarkup = generatedAt ? `<p class="footy-updated">Updated ${escapeHtml(generatedAt)}</p>` : "";
  const errorsMarkup = errors.length
    ? `<ul class="footy-errors">${errors.map((error) => `<li>${escapeHtml(error)}</li>`).join("")}</ul>`
    : "";

  syncFootyPastToggle(fixtures);

  if (visibleFixtures.length === 0) {
    footyScheduleList.innerHTML = `
      ${updatedMarkup}
      <p class="table-message">${emptyMessage}</p>
      ${errorsMarkup}
    `;
    return;
  }

  footyScheduleList.innerHTML = `
    ${updatedMarkup}
    <div class="footy-list">
      ${renderedFixtures.map(renderFootyFixture).join("")}
    </div>
    ${renderFootyShowAllControl(hiddenFixtureCount, visibleFixtures.length)}
    ${errorsMarkup}
  `;
}

function getFootyScheduleFixtures(schedule) {
  if (!Array.isArray(schedule?.teamSchedules)) {
    return [];
  }

  const fixtures = schedule.teamSchedules
    .flatMap((teamSchedule) => {
      const team = teamSchedule?.team || {};
      const teamFixtures = Array.isArray(teamSchedule?.fixtures) ? teamSchedule.fixtures : [];

      return teamFixtures.map((fixture) => ({
        ...fixture,
        teamBadge: fixture.teamBadge || team.badge || "",
      }));
    });
  const teamBadges = getFootyTeamBadgeMap(fixtures);

  return fixtures
    .map((fixture) => ({
      ...fixture,
      teamBadge: fixture.teamBadge || teamBadges.get(getFootyTeamBadgeKey(fixture)) || "",
    }))
    .sort((firstFixture, secondFixture) => {
      return String(firstFixture.timestamp || firstFixture.date).localeCompare(String(secondFixture.timestamp || secondFixture.date)) ||
        String(firstFixture.teamId || "").localeCompare(String(secondFixture.teamId || "")) ||
        String(firstFixture.teamName || "").localeCompare(String(secondFixture.teamName || ""));
    });
}

function getFootyTeamBadgeMap(fixtures = []) {
  const badgeMap = new Map();

  fixtures.forEach((fixture) => {
    const badge = fixture.teamBadge || (fixture.isHome ? fixture.homeBadge : fixture.awayBadge) || "";

    if (!badge) {
      return;
    }

    const key = getFootyTeamBadgeKey(fixture);

    if (key && !badgeMap.has(key)) {
      badgeMap.set(key, badge);
    }
  });

  return badgeMap;
}

function getFootyTeamBadgeKey(fixture) {
  return String(fixture?.teamId || normalizeLookupName(fixture?.teamName || "")).trim();
}

function getFootyScheduleErrors(schedule) {
  if (!Array.isArray(schedule?.teamSchedules)) {
    return [];
  }

  return schedule.teamSchedules.flatMap((teamSchedule) => {
    const teamName = teamSchedule?.team?.name || "Team";
    const errors = Array.isArray(teamSchedule?.errors) ? teamSchedule.errors : [];

    return errors.map((error) => `${teamName}: ${error}`).filter(Boolean);
  });
}

function getFootyScheduleUpdatedAt(schedule) {
  return schedule?.updateTracker?.updatedAt || schedule?.generatedAt || "";
}

function renderFootyShowAllControl(hiddenFixtureCount, totalFixtureCount) {
  if (hiddenFixtureCount <= 0) {
    return "";
  }

  return `
    <div class="footy-list-actions">
      <button class="action-button footy-show-all-button" id="footy-show-all-button" type="button">
        Show all ${escapeHtml(String(totalFixtureCount))} matches
      </button>
    </div>
  `;
}

function getFilteredFootyFixtures(fixtures) {
  const searchTerm = normalizeLookupName(footySearchInput?.value || "");
  const dateRange = getFootyDateFilterRange();
  const selectedTeams = getSelectedFootyTeams();
  const defaultPrioritySet = getDefaultFootyPrioritySet();

  return fixtures.filter((fixture) => {
    if (dateRange && !isFootyFixtureInDateRange(fixture, dateRange)) {
      return false;
    }

    if (selectedTeams.size > 0 && !selectedTeams.has(normalizeLookupName(fixture.teamName))) {
      return false;
    }

    if (selectedTeams.size === 0 && defaultPrioritySet.size > 0 && !defaultPrioritySet.has(normalizeFootyPriority(fixture.priority))) {
      return false;
    }

    if (!searchTerm) {
      return true;
    }

    return getFootyFixtureSearchText(fixture).includes(searchTerm);
  });
}

function hasActiveFootyFilters() {
  return Boolean(
    String(footySearchInput?.value || "").trim() ||
    String(footyDateFromFilter?.value || "").trim() ||
    String(footyDateToFilter?.value || "").trim() ||
    getSelectedFootyTeams().size > 0
  );
}

function getFootyDateFilterRange() {
  const rawStart = String(footyDateFromFilter?.value || "").trim();
  const rawEnd = String(footyDateToFilter?.value || "").trim();

  if (!rawStart && !rawEnd) {
    return null;
  }

  const start = rawStart || rawEnd;
  const end = rawEnd || rawStart;

  return start <= end
    ? { start, end }
    : { start: end, end: start };
}

function isFootyFixtureInDateRange(fixture, dateRange) {
  const fixtureDate = getFootyFixtureDateKey(fixture);

  return Boolean(
    fixtureDate &&
    fixtureDate >= dateRange.start &&
    fixtureDate <= dateRange.end
  );
}

function getSelectedFootyTeams() {
  if (!footyTeamFilter) {
    return new Set();
  }

  return new Set(
    [...footyTeamFilter.querySelectorAll("input[type=\"checkbox\"]:checked")]
      .filter((input) => input.dataset.defaultSelected !== "true")
      .map((input) => normalizeLookupName(input.value))
      .filter(Boolean)
  );
}

function getDefaultFootyPrioritySet() {
  const setRecord = (siteData.footySchedule?.prioritySets || []).find((prioritySet) => {
    return normalizeLookupName(prioritySet?.set) === "1";
  });
  const priorities = Array.isArray(setRecord?.priorities) && setRecord.priorities.length > 0
    ? setRecord.priorities
    : ["1"];

  return new Set(priorities.map(normalizeFootyPriority).filter(Boolean));
}

function normalizeFootyPriority(priority) {
  return String(priority || "").trim();
}

function getFootyFixtureSearchText(fixture) {
  return normalizeLookupName([
    fixture.home,
    fixture.away,
    fixture.league,
    fixture.opponent,
    fixture.teamName,
    fixture.venue,
  ].filter(Boolean).join(" "));
}

function getFootyFixtureDateKey(fixture) {
  const date = String(fixture?.date || "").trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }

  const timestamp = String(fixture?.timestamp || "").trim();
  const parsedDate = timestamp ? new Date(timestamp) : null;

  if (!parsedDate || Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  return parsedDate.toISOString().slice(0, 10);
}

function syncFootyFilters(fixtures = []) {
  if (footyFilters) {
    footyFilters.hidden = !shouldShowFootyFilters;
  }

  if (footyFilterToggle) {
    footyFilterToggle.setAttribute("aria-expanded", String(shouldShowFootyFilters));
    footyFilterToggle.classList.toggle("is-active", shouldShowFootyFilters);
  }

  if (!footyTeamFilter) {
    return;
  }

  const selectedTeams = getSelectedFootyTeams();
  const defaultPrioritySet = getDefaultFootyPrioritySet();
  const defaultTeams = getDefaultFootyTeams(fixtures, defaultPrioritySet);
  const teams = [...new Set(fixtures.map((fixture) => fixture.teamName).filter(Boolean))]
    .sort((firstTeam, secondTeam) => firstTeam.localeCompare(secondTeam));
  const button = footyTeamFilter.querySelector(".multi-filter-button");
  const options = footyTeamFilter.querySelector(".multi-filter-options");

  if (!button || !options) {
    return;
  }

  const selectedCount = teams.filter((team) => selectedTeams.has(normalizeLookupName(team))).length;
  button.textContent = teams.length === 0
    ? "No teams loaded"
    : selectedCount === 0
    ? "Default priority teams"
    : selectedCount === 1
    ? teams.find((team) => selectedTeams.has(normalizeLookupName(team))) || "1 team selected"
    : `${selectedCount} teams selected`;
  button.disabled = teams.length === 0;
  button.setAttribute("aria-expanded", String(shouldShowFootyTeamOptions));
  options.hidden = !shouldShowFootyTeamOptions;
  options.innerHTML = teams.length === 0
    ? `<p class="multi-filter-empty">No teams loaded.</p>`
    : teams.map((team) => {
      const teamKey = normalizeLookupName(team);
      const isDefaultSelected = selectedTeams.size === 0 && defaultTeams.has(teamKey);
      const selected = selectedTeams.has(teamKey) || isDefaultSelected ? " checked" : "";
      const defaultFlag = isDefaultSelected ? ` data-default-selected="true"` : "";

      return `
        <label class="multi-filter-option">
          <input type="checkbox" value="${escapeHtml(team)}"${selected}${defaultFlag}>
          <span>${escapeHtml(team)}</span>
        </label>
      `;
    }).join("");
}

function getDefaultFootyTeams(fixtures = [], defaultPrioritySet = getDefaultFootyPrioritySet()) {
  if (defaultPrioritySet.size === 0) {
    return new Set();
  }

  return new Set(
    fixtures
      .filter((fixture) => defaultPrioritySet.has(normalizeFootyPriority(fixture.priority)))
      .map((fixture) => normalizeLookupName(fixture.teamName))
      .filter(Boolean)
  );
}

function getVisibleFootyFixtures(fixtures) {
  const now = Date.now();

  return fixtures.filter((fixture) => {
    const fixtureTime = getFootyFixtureComparableTime(fixture);

    if (!Number.isFinite(fixtureTime)) {
      return !shouldShowPastFootyFixtures;
    }

    return shouldShowPastFootyFixtures ? fixtureTime < now : fixtureTime >= now;
  });
}

function getFootyFixtureComparableTime(fixture) {
  const timestamp = String(fixture?.timestamp || "").trim();
  const date = String(fixture?.date || "").trim();
  const time = String(fixture?.time || "").trim();
  const parsedTimestamp = timestamp ? Date.parse(timestamp) : Number.NaN;

  if (time && Number.isFinite(parsedTimestamp)) {
    return parsedTimestamp;
  }

  if (date) {
    return Date.parse(`${date}T23:59:59`);
  }

  return parsedTimestamp;
}

function syncFootyPastToggle(fixtures = []) {
  if (!footyPastToggle) {
    return;
  }

  footyPastToggle.hidden = fixtures.length === 0;
  footyPastToggle.textContent = shouldShowPastFootyFixtures ? "Upcoming Matches" : "Past Matches";
  footyPastToggle.setAttribute("aria-pressed", String(shouldShowPastFootyFixtures));
  footyPastToggle.disabled = false;
}

function closeProfileDropdown() {
  profileMenuButton?.setAttribute("aria-expanded", "false");

  if (profileDropdown) {
    profileDropdown.hidden = true;
  }
}

function renderFootyFixture(fixture) {
  const dateLabel = formatFootyFixtureDate(fixture.timestamp || fixture.date);
  const sideLabel = fixture.isHome ? "H" : "A";
  const badge = fixture.teamBadge || (fixture.isHome ? fixture.homeBadge : fixture.awayBadge) || "";
  const fallbackBadge = getFootyFixtureFallbackBadge(fixture);
  const venueMarkup = shouldShowFootyFixtureVenue(fixture)
    ? `<p>${escapeHtml(fixture.venue)}</p>`
    : "";

  return `
    <article class="footy-fixture-card">
      <div class="footy-fixture-badge" aria-hidden="true">
        ${badge ? `<img src="${escapeHtml(badge)}" alt="" loading="lazy">` : `<span>${escapeHtml(fallbackBadge)}</span>`}
      </div>
      <div>
        <h2>${escapeHtml(fixture.home || "TBD")} v ${escapeHtml(fixture.away || "TBD")}</h2>
        <p class="footy-fixture-meta">
          <span>${escapeHtml(fixture.teamName || "")}</span>
          <span class="footy-side-chip" aria-label="${fixture.isHome ? "Home" : "Away"}">${escapeHtml(sideLabel)}</span>
          ${fixture.league ? `<span>${escapeHtml(fixture.league)}</span>` : ""}
        </p>
        ${venueMarkup}
      </div>
      <strong>${escapeHtml(dateLabel)}</strong>
    </article>
  `;
}

function getFootyFixtureFallbackBadge(fixture) {
  return String(fixture?.teamName || fixture?.home || "?").trim().slice(0, 1).toUpperCase() || "?";
}

function shouldShowFootyFixtureVenue(fixture) {
  if (!fixture?.venue) {
    return false;
  }

  const league = normalizeLookupName(fixture.league || "");

  if (league.includes("friendly")) {
    return true;
  }

  const cupTerms = ["cup", "shield", "trophy", "supercopa", "super cup", "campeones"];

  return cupTerms.some((term) => league.includes(term));
}

function renderFootyScheduleError(error) {
  if (!footyScheduleList) {
    return;
  }

  footyScheduleList.innerHTML = `<p class="table-message">Unable to load footy schedule: ${escapeHtml(error.message)}</p>`;
}

function formatFootyGeneratedAt(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatFootyFixtureDate(value) {
  if (!value) {
    return "TBD";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function renderFantasyCriticPage() {
  if (fantasyCritic2025Content) {
    fantasyCritic2025Content.innerHTML = renderFantasyCriticLeagueState("2025");
  }

  if (fantasyCritic2026Content) {
    fantasyCritic2026Content.innerHTML = renderFantasyCriticLeagueState("2026");
  }
}

function renderFantasyCriticLeagueState(year) {
  const state = getFantasyCriticLeagueState(year);
  const metadata = state.metadata || FANTASY_CRITIC_LEAGUE_METADATA[year];
  const heading = renderFantasyCriticHeading(metadata);

  if (state.status === "error") {
    return `
      ${heading}
      <article class="fantasy-critic-card fantasy-critic-status-card">
        <p class="table-message">Unable to load Fantasy Critic ${escapeHtml(year)} data: ${escapeHtml(state.errorMessage || "Unknown error")}</p>
      </article>
    `;
  }

  if (state.status !== "loaded" || !state.league) {
    return `
      ${heading}
      <article class="fantasy-critic-card fantasy-critic-status-card">
        <p class="table-message">Loading Fantasy Critic ${escapeHtml(year)} data...</p>
      </article>
    `;
  }

  return renderFantasyCriticLeague(state.league);
}

function renderFantasyCriticHeading(league) {
  return `
    <div class="league-detail-heading">
      <div>
        <h2>${escapeHtml(league.title)}</h2>
        <p>${escapeHtml(league.subtitle)}</p>
      </div>
    </div>
  `;
}

function renderFantasyCriticLeague(league) {
  const awards = getAwardsForFantasyCriticYear(league.year);

  return `
    ${renderFantasyCriticHeading(league)}
    ${renderFantasyCriticAwards(awards)}

    <div class="fantasy-critic-standings">
      ${league.standings.map((entry) => renderFantasyCriticStanding(entry, league.year)).join("")}
    </div>
  `;
}

function renderFantasyCriticAwards(awards = []) {
  if (!awards.length) {
    return "";
  }

  return `
    <section class="standings-awards fantasy-critic-awards">
      <div class="standings-awards-heading">
        <h2>Awards</h2>
      </div>
      <div class="standings-awards-list">
        ${awards.map((award) => renderAwardCard(award, "standings-summary")).join("")}
      </div>
    </section>
  `;
}

function renderFantasyCriticStanding(entry, year) {
  const manager = getManagerByName(entry.manager) ?? { name: entry.manager };
  const awards = entry.rank === 1
    ? getAwardsForManager(manager, { standings: "fantasy-critic", year })
    : [];

  return `
    <article class="fantasy-critic-card">
      <header class="fantasy-critic-summary">
        <div class="fantasy-critic-rank">
          <span>Rank</span>
          <strong>${escapeHtml(entry.rank)}</strong>
        </div>
        <div class="fantasy-critic-manager">
          <span class="standing-manager-with-awards">
            ${renderManagerChip(manager)}
            ${renderAwardBadges(awards)}
          </span>
          <small>${escapeHtml(entry.publisher)}</small>
        </div>
        <div class="fantasy-critic-points">
          <span>Points</span>
          <strong>${escapeHtml(entry.points)}</strong>
          ${entry.projected ? `<small>Proj ${escapeHtml(entry.projected)}</small>` : ""}
        </div>
      </header>

      <div class="fantasy-critic-meta">
        <span>Released <strong>${escapeHtml(entry.released)}</strong></span>
        ${entry.expecting ? `<span>Expecting <strong>${escapeHtml(entry.expecting)}</strong></span>` : ""}
        <span>Budget <strong>${escapeHtml(entry.budget)}</strong></span>
      </div>

      <div class="fantasy-critic-roster">
        ${entry.roster.map((game) => renderFantasyCriticGame(game)).join("")}
      </div>
    </article>
  `;
}

function getAwardsForFantasyCriticYear(year) {
  return getResolvedAwards().filter((award) => {
    return award.standings === "fantasy-critic" &&
      String(award.year || "") === String(year || "");
  });
}

function renderFantasyCriticGame([game, critic, points]) {
  const criticValue = critic || "--";
  const pointsValue = points || "--";

  return `
    <div class="fantasy-critic-game">
      <strong>${escapeHtml(game)}</strong>
      <span>Critic ${escapeHtml(criticValue)}</span>
      <span>Pts ${escapeHtml(pointsValue)}</span>
    </div>
  `;
}

function parseFormulaOneSheet(csvText) {
  const rows = parseCsvMatrix(csvText).filter((row) => row.some((value) => value.trim() !== ""));
  const managerRow = rows[0] ?? [];
  const headerRow = rows[1] ?? [];

  if (rows.length < 3 || headerRow[0] !== "Question" || headerRow[1] !== "Answer") {
    throw new Error("Formula 1 sheet did not include the expected Question and Answer columns.");
  }

  const managerColumns = managerRow
    .map((manager, index) => ({ manager: manager.trim(), index }))
    .filter(({ manager, index }) => manager && index >= 2);

  const questions = rows.slice(2).filter((row) => {
    return !isFormulaOneTotalRow(row[0]);
  }).map((row, index) => {
    return {
      id: `question-${index + 1}`,
      number: index + 1,
      question: row[0]?.trim() ?? "",
      answer: row[1]?.trim() ?? "",
      bets: managerColumns.map(({ manager, index: betIndex }) => ({
        manager,
        bet: row[betIndex]?.trim() ?? "",
        points: parseFormulaOnePointValue(row[betIndex + 1]),
      })),
    };
  }).filter((question) => question.question);

  const standings = managerColumns.map(({ manager }) => {
    const managerQuestions = questions.map((question) => {
      return question.bets.find((bet) => bet.manager === manager) ?? { manager, bet: "", points: 0 };
    });
    const points = managerQuestions.reduce((total, bet) => total + getFormulaOnePointNumber(bet.points), 0);
    const scored = managerQuestions.filter((bet) => getFormulaOnePointNumber(bet.points) !== 0).length;

    return {
      manager,
      questions: managerQuestions.length,
      scored,
      points,
    };
  }).sort((a, b) => b.points - a.points || a.manager.localeCompare(b.manager));

  return { questions, standings: rankRows(standings) };
}

function parseFormulaOneWeeklySheet(csvText) {
  const rows = parseCsvMatrix(csvText);
  const races = [];

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index] ?? [];
    const isRaceHeader = normalizeLookupName(row[0]) === "person" &&
      normalizeLookupName(row[1]) === "p1" &&
      normalizeLookupName(row[6]) === "person" &&
      normalizeLookupName(row[13]) === "person" &&
      normalizeLookupName(row[19]) === "total";

    if (!isRaceHeader) {
      continue;
    }

    const roundId = races.length + 1;
    const entries = [];

    for (const entryRow of rows.slice(index + 1)) {
      const manager = entryRow[0]?.trim() ?? "";

      if (!manager) {
        break;
      }

      const entry = {
        manager,
        picks: {
          p1: entryRow[1]?.trim() ?? "",
          p2: entryRow[2]?.trim() ?? "",
          p3: entryRow[3]?.trim() ?? "",
          wildcard: entryRow[4]?.trim() ?? "",
        },
        positions: {
          p1: entryRow[7]?.trim() ?? "",
          p2: entryRow[8]?.trim() ?? "",
          p3: entryRow[9]?.trim() ?? "",
          wildcardQualifying: entryRow[10]?.trim() ?? "",
          wildcardRace: entryRow[11]?.trim() ?? "",
        },
        points: {
          p1: parseFormulaOnePointValue(entryRow[14]),
          p2: parseFormulaOnePointValue(entryRow[15]),
          p3: parseFormulaOnePointValue(entryRow[16]),
          wildcardQualifying: parseFormulaOnePointValue(entryRow[17]),
          wildcardRace: parseFormulaOnePointValue(entryRow[18]),
        },
        total: parseFormulaOnePointValue(entryRow[19]),
      };

      if (hasFormulaOneWeeklyPicks(entry)) {
        entries.push(entry);
      }
    }

    if (entries.length > 0) {
      races.push({
        entries,
        id: roundId,
        name: `Round ${roundId}`,
      });
    }
  }

  return {
    races,
    standings: getFormulaOneWeeklyStandings(races),
  };
}

function hasFormulaOneWeeklyPicks(entry) {
  return Boolean(
    entry.picks.p1 ||
    entry.picks.p2 ||
    entry.picks.p3 ||
    entry.picks.wildcard
  );
}

function getFormulaOneWeeklyStandings(races) {
  const totalsByManager = new Map();
  const managerNames = new Set();

  for (const race of races) {
    for (const entry of race.entries) {
      managerNames.add(entry.manager);
    }
  }

  for (const manager of managerNames) {
    const raceTotals = races.map((race) => {
      return getFormulaOnePointNumber(race.entries.find((entry) => entry.manager === manager)?.total);
    });
    let points = 0;

    for (let index = 0; index < raceTotals.length; index += 8) {
      points += raceTotals
        .slice(index, index + 8)
        .sort((firstTotal, secondTotal) => secondTotal - firstTotal)
        .slice(0, 4)
        .reduce((sum, total) => sum + total, 0);
    }

    totalsByManager.set(manager, points);
  }

  return rankRows(
    [...totalsByManager.entries()]
      .map(([manager, points]) => ({ manager, points }))
      .sort((firstManager, secondManager) => {
        if (secondManager.points !== firstManager.points) {
          return secondManager.points - firstManager.points;
        }

        return firstManager.manager.localeCompare(secondManager.manager);
      })
  );
}

function parseFormulaOneWeeklyResultsSheet(csvText) {
  const rows = parseCsvMatrix(csvText);
  const managerBlocks = [];
  let currentBlock = [];

  for (const row of rows) {
    if (isKnownFormulaOneManager(row[0])) {
      currentBlock.push(row);
      continue;
    }

    if (currentBlock.length > 0) {
      managerBlocks.push(currentBlock);
      currentBlock = [];
    }
  }

  if (currentBlock.length > 0) {
    managerBlocks.push(currentBlock);
  }

  const totalBlocks = managerBlocks.filter((block) => {
    return block.length > 0 && block.every((row) => {
      return row[1]?.trim() && row.slice(2).every((value) => !String(value ?? "").trim());
    });
  });
  const totalBlock = totalBlocks[totalBlocks.length - 1] ?? managerBlocks[managerBlocks.length - 1] ?? [];
  const standings = totalBlock
    .map((row) => {
      const points = parseFormulaOnePointValue(row[1]);

      return {
        manager: row[0].trim(),
        points,
        pointsNumber: getFormulaOnePointNumber(points),
      };
    })
    .filter((entry) => entry.manager)
    .sort((firstEntry, secondEntry) => {
      if (secondEntry.pointsNumber !== firstEntry.pointsNumber) {
        return secondEntry.pointsNumber - firstEntry.pointsNumber;
      }

      return firstEntry.manager.localeCompare(secondEntry.manager);
    })
    .map(({ pointsNumber, ...entry }) => entry);

  return { standings: rankRows(standings) };
}

function isKnownFormulaOneManager(value) {
  return Object.prototype.hasOwnProperty.call(MANAGER_COLORS, normalizeLookupName(value));
}

function parseFormulaOneRoundForms(rows) {
  return rows
    .map((row) => {
      const roundId = getField(row, "Round ID", "Round Id", "ID");
      const name = getField(row, "Round Name", "Round", "Name");
      const formUrl = getField(row, "Form Link", "Form", "URL");

      return {
        date: parseFormulaOneFormDate(getField(row, "Date")),
        dueEst: getField(row, "Due (est)", "Due (EST)", "Due EST", "Due"),
        formUrl,
        id: String(roundId ?? "").trim(),
        name,
        priority: getField(row, "Priority"),
      };
    })
    .filter((form) => form.id && form.name && form.formUrl);
}

function parseFormulaOneFormDate(value) {
  const match = String(value ?? "").trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);

  if (!match) {
    return null;
  }

  const year = Number(match[3].length === 2 ? `20${match[3]}` : match[3]);
  return new Date(Date.UTC(year, Number(match[1]) - 1, Number(match[2])));
}

function renderFormulaOneLeague(year, data) {
  siteData[`formulaOne${year}`] = data;
  renderFormulaOneQuestionOptions(year, data.questions);
  renderFormulaOneQuestions(year);
  renderFormulaOneResults(year);
}

function renderFormulaOneQuestionOptions(year, questions) {
  const view = formulaOneViews[year];

  if (!view?.questionSelect) {
    return;
  }

  view.questionSelect.innerHTML = `
    <option value="">All questions</option>
    ${questions.map((question) => {
      return `<option value="${escapeHtml(question.id)}" title="${escapeHtml(question.question)}">${escapeHtml(formatFormulaOneQuestionOption(question))}</option>`;
    }).join("")}
  `;
}

function formatFormulaOneQuestionOption(question) {
  return `${question.number}. ${getFormulaOneQuestionSummary(question.question)}`;
}

function getFormulaOneQuestionSummary(questionText) {
  const normalizedQuestion = String(questionText ?? "").trim();
  const comparisonSummary = getFormulaOneComparisonSummary(normalizedQuestion);

  if (comparisonSummary) {
    return comparisonSummary;
  }

  const specialSummaries = [
    [/last in the drivers championship/i, "Last in Drivers Championship"],
    [/last in the world constructors championship/i, "Last in Constructors Championship"],
    [/(^|\s)world drivers champion|driver'?s champion/i, "Driver's Champion"],
    [/(^|\s)world constructors championship|constructor'?s champion/i, "Constructors Champion"],
    [/finish on the podium/i, "Podium Finishers"],
    [/driver of the day/i, "Driver of the Day Awards"],
    [/closest teammate pair in qualifying/i, "Closest Teammates: Qualifying"],
    [/closest teammate pair in the grand prix/i, "Closest Teammates: Grand Prix"],
    [/sprint race champion/i, "Sprint Race Champion"],
    [/overtake award/i, "Overtake Award"],
    [/final championship order/i, "Championship Order"],
    [/fewest racing laps/i, "Fewest Racing Laps"],
    [/most classified dnfs/i, "Most Classified DNFs"],
    [/fastest pit stop/i, "Fastest Pit Stop"],
    [/safety car/i, "Safety Cars"],
    [/bold prediction/i, "Bold Prediction"],
  ];

  for (const [pattern, summary] of specialSummaries) {
    if (pattern.test(normalizedQuestion)) {
      return summary;
    }
  }

  return truncateQuestionSummary(normalizedQuestion
    .replace(/\?$/g, "")
    .replace(/^who will\s+/i, "")
    .replace(/^which\s+/i, "")
    .replace(/^what will\s+/i, "")
    .replace(/^what\s+/i, "")
    .replace(/^how many\s+/i, "How many ")
    .replace(/^will\s+/i, "")
    .trim());
}

function getFormulaOneComparisonSummary(questionText) {
  const teammatePairing = questionText.match(/teammate pairing of (.+?) and (.+?)\?/i);

  if (teammatePairing) {
    return `${teammatePairing[1].trim()} v ${teammatePairing[2].trim()}`;
  }

  const directComparison = questionText.match(/between (.+?) and (.+?)\?/i);

  if (directComparison) {
    return `${directComparison[1].trim()} v ${directComparison[2].trim()}`;
  }

  return "";
}

function truncateQuestionSummary(summary) {
  const maxLength = 54;
  const normalizedSummary = capitalizeFirst(summary);

  if (normalizedSummary.length <= maxLength) {
    return normalizedSummary;
  }

  return `${normalizedSummary.slice(0, maxLength).replace(/\s+\S*$/, "")}...`;
}

function capitalizeFirst(value) {
  return value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : value;
}

function renderFormulaOneQuestions(year) {
  const view = formulaOneViews[year];

  if (!view?.questionList) {
    return;
  }

  const data = siteData[`formulaOne${year}`];

  if (!data) {
    return;
  }

  const selectedQuestion = view.questionSelect?.value ?? "";
  const filterText = (view.questionFilter?.value ?? "").trim().toLowerCase();
  const questions = data.questions.filter((question) => {
    if (selectedQuestion && question.id !== selectedQuestion) {
      return false;
    }

    if (!filterText) {
      return true;
    }

    return question.question.toLowerCase().includes(filterText);
  });

  if (questions.length === 0) {
    view.questionList.innerHTML = `<article class="formula-one-question-card"><p class="table-message">No Formula 1 questions match that filter.</p></article>`;
    return;
  }

  view.questionList.innerHTML = questions.map(renderFormulaOneQuestion).join("");
}

function renderFormulaOneQuestion(question) {
  return `
    <article class="formula-one-question-card">
      <header>
        <span>Question ${escapeHtml(question.number)}</span>
        <h3>${escapeHtml(question.question)}</h3>
        ${renderFormulaOneAnswer(question)}
      </header>
      <div class="formula-one-bet-list">
        ${question.bets.map(renderFormulaOneBet).join("")}
      </div>
    </article>
  `;
}

function renderFormulaOneAnswer(question) {
  if (isBoldPredictionQuestion(question.question) || !question.answer) {
    return "";
  }

  return `<p>Answer: <strong>${escapeHtml(question.answer)}</strong></p>`;
}

function isBoldPredictionQuestion(question) {
  return String(question ?? "").toLowerCase().includes("bold prediction");
}

function isFormulaOneTotalRow(question) {
  return String(question ?? "").trim().toLowerCase() === "total";
}

function renderFormulaOneBet(bet) {
  const manager = getManagerByName(bet.manager) ?? { name: bet.manager };

  return `
    <div class="formula-one-bet">
      <div>
        ${renderManagerChip(manager)}
        <p>${escapeHtml(bet.bet || "No bet listed")}</p>
      </div>
      <strong>${escapeHtml(formatFormulaOnePointValue(bet.points))}</strong>
    </div>
  `;
}

function renderFormulaOneResults(year) {
  const view = formulaOneViews[year];

  if (!view?.resultsRows) {
    return;
  }

  const data = siteData[`formulaOne${year}`];
  const weeklyData = siteData[`formulaOne${year}WeeklyResults`] ?? siteData[`formulaOne${year}Weekly`];
  const mode = formulaOneResultsMode[year] ?? "yearly";
  const standings = mode === "weekly"
    ? weeklyData?.standings ?? []
    : data?.standings ?? [];

  if (standings.length === 0) {
    const label = mode === "weekly" ? "weekly" : "yearly";
    view.resultsRows.innerHTML = `<tr><td class="table-message" colspan="3">No Formula 1 ${label} results were loaded.</td></tr>`;
    return;
  }

  view.resultsRows.innerHTML = standings.map((entry, index) => {
    const manager = getManagerByName(entry.manager) ?? { name: entry.manager };
    const awards = entry.rank === 1
      ? getAwardsForManager(manager, { standings: getFormulaOneAwardStandingsForMode(mode), year })
      : [];

    return `
      <tr>
        <td data-label="Rank">${escapeHtml(formatRankDisplay(entry, index, standings))}</td>
        <td data-label="Manager">
          <span class="standing-manager-with-awards">
            ${renderManagerChip(manager)}
            ${renderAwardBadges(awards)}
          </span>
        </td>
        <td data-label="Points">${escapeHtml(formatFormulaOnePointValue(entry.points))}</td>
      </tr>
    `;
  }).join("");
}

function getFormulaOneAwardStandingsForMode(mode) {
  return mode === "weekly" ? "formula-one-weekly" : "formula-one-yearly";
}

function setFormulaOneResultsMode(year, mode) {
  formulaOneResultsMode[year] = mode === "weekly" ? "weekly" : "yearly";

  formulaOneViews[year]?.resultsModeButtons?.forEach((button) => {
    const isActive = button.getAttribute("data-formula-one-results-mode") === formulaOneResultsMode[year];
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  renderFormulaOneResults(year);
  renderStandingsAwards();
  renderManagerHub();
}

function renderFormulaOneWeeklyForm(year, forms) {
  const view = formulaOneViews[year];

  if (!view?.weeklyForm) {
    return;
  }

  if (!forms?.length) {
    view.weeklyForm.innerHTML = `<p class="table-message">No Formula 1 bet forms were loaded.</p>`;
    return;
  }

  const selectedId = view.weeklyForm.querySelector("[data-formula-one-form-select]")?.value ||
    getDefaultFormulaOneFormId(forms);
  const selectedForm = forms.find((form) => form.id === selectedId) ?? forms[0];

  view.weeklyForm.innerHTML = `
    <div class="formula-one-form-header">
      <label class="select-control">
        <span>Bet Form</span>
        <select data-formula-one-form-select>
          ${forms.map((form) => {
            return `<option value="${escapeHtml(form.id)}"${form.id === selectedForm.id ? " selected" : ""}>${escapeHtml(`${form.id}. ${form.name}`)}</option>`;
          }).join("")}
        </select>
      </label>
      <a class="league-card-link formula-one-form-link" href="${escapeHtml(selectedForm.formUrl)}" target="_blank" rel="noopener">Open Form</a>
    </div>
    ${renderFormulaOneFormEmbed(selectedForm)}
  `;

  loadVisibleFormulaOneFormIframes(view.weeklyForm);
}

function renderFormulaOneFormEmbed(form) {
  const isCollapsed = isMobileSafari();
  const embedUrl = getGoogleFormEmbedUrl(form.formUrl);

  return `
    <details class="formula-one-form-embed"${isCollapsed ? "" : " open"}>
      <summary>Show embedded form</summary>
      <iframe
        title="${escapeHtml(`${form.name} bet form`)}"
        data-src="${escapeHtml(embedUrl)}"
        src="${isCollapsed ? "" : escapeHtml(embedUrl)}"
        loading="lazy"
      ></iframe>
    </details>
  `;
}

function getDefaultFormulaOneFormId(forms) {
  const today = getEasternTodayDate();
  const futureForms = forms
    .filter((form) => form.date && form.date >= today)
    .sort((firstForm, secondForm) => firstForm.date - secondForm.date);

  return (futureForms[0] ?? forms[0])?.id ?? "";
}

function getEasternTodayDate() {
  const dateParts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/New_York",
    year: "numeric",
  }).formatToParts(new Date());
  const parts = Object.fromEntries(dateParts.map((part) => [part.type, part.value]));

  return new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)));
}

function getGoogleFormEmbedUrl(formUrl) {
  try {
    const url = new URL(formUrl);
    url.search = "";
    url.searchParams.set("embedded", "true");
    return url.toString();
  } catch {
    return formUrl;
  }
}

function loadVisibleFormulaOneFormIframes(container) {
  container.querySelectorAll(".formula-one-form-embed[open] iframe[data-src]").forEach((iframe) => {
    if (!iframe.getAttribute("src")) {
      iframe.setAttribute("src", iframe.getAttribute("data-src"));
    }
  });
}

function isMobileSafari() {
  const userAgent = navigator.userAgent || "";
  const isIos = /iP(ad|hone|od)/.test(userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isSafari = /Safari/i.test(userAgent) && !/(CriOS|FxiOS|EdgiOS|OPiOS)/i.test(userAgent);

  return isIos && isSafari;
}

function renderFormulaOneWeeklyPage(year, data) {
  const view = formulaOneViews[year];

  if (!view?.weeklyList) {
    return;
  }

  if (!data?.races?.length) {
    view.weeklyList.innerHTML = `<article class="formula-one-question-card"><p class="table-message">No Formula 1 weekly picks were loaded.</p></article>`;
    renderFormulaOneWeeklyManagers(year, []);
    return;
  }

  renderFormulaOneWeeklyRoundOptions(year, data.races);
  renderFormulaOneWeeklyManagers(year, data.standings ?? []);

  const selectedRound = view.weeklyRoundSelect?.value ?? "";
  const races = selectedRound
    ? data.races.filter((race) => String(race.id) === selectedRound)
    : data.races;

  if (races.length === 0) {
    view.weeklyList.innerHTML = `<article class="formula-one-question-card"><p class="table-message">No weekly picks matched that round.</p></article>`;
    return;
  }

  view.weeklyList.innerHTML = races.map((race) => renderFormulaOneWeeklyRace(year, race)).join("");
}

function renderFormulaOneWeeklyManagers(year, standings) {
  const rows = formulaOneViews[year]?.weeklyManagers;

  if (!rows) {
    return;
  }

  if (!standings.length) {
    rows.innerHTML = `<tr><td class="table-message" colspan="3">No Formula 1 weekly standings were loaded.</td></tr>`;
    return;
  }

  rows.innerHTML = standings.map((entry, index) => {
    const manager = getManagerByName(entry.manager) ?? { name: entry.manager };

    return `
      <tr>
        <td data-label="Rank">${escapeHtml(formatRankDisplay(entry, index, standings))}</td>
        <td data-label="Manager">${renderManagerChip(manager)}</td>
        <td data-label="Points">${escapeHtml(formatFormulaOnePointValue(entry.points))}</td>
      </tr>
    `;
  }).join("");
}

function renderFormulaOneWeeklyRoundOptions(year, races) {
  const select = formulaOneViews[year]?.weeklyRoundSelect;

  if (!select) {
    return;
  }

  const selectedValue = select.value;
  select.innerHTML = `
    <option value="">All rounds</option>
    ${races.map((race) => `<option value="${escapeHtml(String(race.id))}">${escapeHtml(race.name)}</option>`).join("")}
  `;

  select.value = races.some((race) => String(race.id) === selectedValue) ? selectedValue : "";
}

function renderFormulaOneWeeklyRace(year, race) {
  const entries = rankFormulaOneWeeklyEntries(race.entries);

  return `
    <article class="formula-one-weekly-card">
      <header>
        <span>${escapeHtml(race.name)}</span>
        <h3>Weekly Picks</h3>
      </header>
      <div class="formula-one-weekly-managers">
        ${entries.map((entry, index) => renderFormulaOneWeeklyEntry(year, race, entry, index, entries)).join("")}
      </div>
    </article>
  `;
}

function rankFormulaOneWeeklyEntries(entries) {
  let previousPoints;
  let previousRank = 0;

  return [...entries]
    .sort((firstEntry, secondEntry) => {
      const pointsDifference = getFormulaOnePointNumber(secondEntry.total) - getFormulaOnePointNumber(firstEntry.total);

      if (pointsDifference !== 0) {
        return pointsDifference;
      }

      return firstEntry.manager.localeCompare(secondEntry.manager);
    })
    .map((entry, index) => {
      const currentPoints = getFormulaOnePointNumber(entry.total);
      const rank = previousPoints === currentPoints ? previousRank : index + 1;
      previousPoints = currentPoints;
      previousRank = rank;

      return { ...entry, rank };
    });
}

function renderFormulaOneWeeklyEntry(year, race, entry, index, entries) {
  const manager = getManagerByName(entry.manager) ?? { name: entry.manager };
  const detailsId = `formula-one-${year}-weekly-${race.id}-${index}`;

  return `
    <section
      class="formula-one-weekly-entry"
      data-formula-one-weekly-entry
      aria-controls="${escapeHtml(detailsId)}"
      aria-expanded="false"
      role="button"
      tabindex="0"
    >
      <div class="formula-one-weekly-manager">
        <span class="formula-one-weekly-rank">
          <small>Rank</small>
          <b>${escapeHtml(formatRankDisplay(entry, index, entries))}</b>
        </span>
        <span class="formula-one-weekly-manager-chip">${renderManagerChip(manager)}</span>
        <strong>${escapeHtml(formatFormulaOnePointValue(entry.total))}</strong>
      </div>
      <div class="formula-one-weekly-picks" id="${escapeHtml(detailsId)}" hidden>
        ${renderFormulaOneWeeklyPick("P1", entry.picks.p1, entry.positions.p1, entry.points.p1)}
        ${renderFormulaOneWeeklyPick("P2", entry.picks.p2, entry.positions.p2, entry.points.p2)}
        ${renderFormulaOneWeeklyPick("P3", entry.picks.p3, entry.positions.p3, entry.points.p3)}
        ${renderFormulaOneWeeklyWildcard(entry)}
      </div>
    </section>
  `;
}

function toggleFormulaOneWeeklyEntry(entry) {
  const isExpanded = entry.getAttribute("aria-expanded") === "true";
  const managerList = entry.closest(".formula-one-weekly-managers");

  managerList?.querySelectorAll("[data-formula-one-weekly-entry]").forEach((row) => {
    row.classList.remove("is-weekly-expanded");
    row.setAttribute("aria-expanded", "false");

    const details = document.getElementById(row.getAttribute("aria-controls"));
    if (details) {
      details.hidden = true;
    }
  });

  if (isExpanded) {
    return;
  }

  entry.classList.add("is-weekly-expanded");
  entry.setAttribute("aria-expanded", "true");

  const details = document.getElementById(entry.getAttribute("aria-controls"));
  if (details) {
    details.hidden = false;
  }
}

function renderFormulaOneWeeklyPick(label, pick, position, points) {
  if (!pick) {
    return "";
  }

  return `
    <div class="formula-one-weekly-pick">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(pick)}</strong>
      <em>${escapeHtml(formatFormulaOneWeeklyPickResult(position, points))}</em>
    </div>
  `;
}

function renderFormulaOneWeeklyWildcard(entry) {
  if (!entry.picks.wildcard) {
    return "";
  }

  return `
    <div class="formula-one-weekly-pick formula-one-weekly-pick--wildcard">
      <span>Wildcard</span>
      <strong>${escapeHtml(entry.picks.wildcard)}</strong>
      <div class="formula-one-weekly-wildcard-results">
        ${renderFormulaOneWeeklyWildcardResult("Q", entry.positions.wildcardQualifying, entry.points.wildcardQualifying)}
        ${renderFormulaOneWeeklyWildcardResult("R", entry.positions.wildcardRace, entry.points.wildcardRace)}
      </div>
    </div>
  `;
}

function renderFormulaOneWeeklyWildcardResult(label, position, points) {
  return `
    <em>
      <span>${escapeHtml(label)}</span>
      <b>${escapeHtml(formatFormulaOneWeeklyPickResult(position, points))}</b>
    </em>
  `;
}

function formatFormulaOneWeeklyPickResult(position, points) {
  const pointsLabel = typeof points === "number" && !Number.isNaN(points)
    ? `${formatFormulaOnePointValue(points)} pts`
    : formatFormulaOnePointValue(points);

  return `${formatFormulaOnePosition(position)} | ${pointsLabel}`;
}

function parseFormulaOnePointValue(value) {
  const trimmedValue = String(value ?? "").trim();

  if (!trimmedValue) {
    return 0;
  }

  const numericValue = Number(trimmedValue.replace(/,/g, ""));
  return Number.isNaN(numericValue) ? trimmedValue : numericValue;
}

function getFormulaOnePointNumber(value) {
  return typeof value === "number" && !Number.isNaN(value) ? value : 0;
}

function formatFormulaOnePointValue(value) {
  return typeof value === "number" && !Number.isNaN(value) ? formatPoints(value) : String(value ?? "");
}

function formatFormulaOnePosition(position) {
  const value = String(position ?? "").trim();

  if (!value || Number.isNaN(Number(value))) {
    return value || "-";
  }

  return `P${value}`;
}

function renderFormulaOneError(year, error) {
  const view = formulaOneViews[year];

  if (view?.questionList) {
    view.questionList.innerHTML = `<article class="formula-one-question-card"><p class="table-message">Unable to load Formula 1 questions: ${escapeHtml(error.message)}</p></article>`;
  }

  if (view?.resultsRows) {
    view.resultsRows.innerHTML = `<tr><td class="table-message" colspan="3">Unable to load Formula 1 results: ${escapeHtml(error.message)}</td></tr>`;
  }
}

function renderFormulaOneWeeklyError(year, error) {
  const view = formulaOneViews[year];

  if (view?.weeklyList) {
    view.weeklyList.innerHTML = `<article class="formula-one-question-card"><p class="table-message">Unable to load Formula 1 weekly picks: ${escapeHtml(error.message)}</p></article>`;
  }
}

function parseFantasyOfficeDraft(csvText) {
  const rows = parseCsvMatrix(csvText).filter((row) => row.some((value) => value.trim() !== ""));
  const managerRow = rows.find((row) => {
    return !row[0]?.trim() && row.slice(1).some((value) => value.trim() && !/^D\d+$/i.test(value.trim()));
  });

  if (!managerRow) {
    throw new Error("Fantasy Office draft sheet did not include manager names.");
  }

  const managerColumns = managerRow
    .map((manager, index) => ({ manager: manager.trim(), index }))
    .filter(({ manager, index }) => manager && index > 0);

  if (managerColumns.length === 0) {
    throw new Error("Fantasy Office draft sheet did not include any draft columns.");
  }

  const managerRowIndex = rows.indexOf(managerRow);
  const draftRows = rows.slice(managerRowIndex + 1).filter((row) => {
    const pick = row[0]?.trim() ?? "";
    return /^\d+$/.test(pick) || pick.toLowerCase() === "sub";
  });

  return managerColumns.map(({ manager, index }) => {
    return {
      manager,
      picks: draftRows.map((row) => ({
        pick: row[0]?.trim() ?? "",
        movie: row[index]?.trim() ?? "",
      })).filter((pick) => pick.movie),
    };
  });
}

function parseFantasyOfficeMovies(csvText) {
  const rows = parseCsvMatrix(csvText).filter((row) => row.some((value) => value.trim() !== ""));
  const headerIndex = rows.findIndex((row) => row[0]?.trim() === "D#" && row[1]?.trim() === "Movie");

  if (headerIndex === -1) {
    throw new Error("Fantasy Office movies sheet did not include the expected D# and Movie columns.");
  }

  const headers = rows[headerIndex].map((header) => header.trim());

  return rows.slice(headerIndex + 1).map((row) => {
    return headers.reduce((record, header, index) => {
      record[header || `Column ${index + 1}`] = row[index]?.trim() ?? "";
      return record;
    }, {});
  }).filter((movie) => movie.Movie);
}

function parseFantasyOfficeResults(csvText) {
  const rows = parseCsvMatrix(csvText).filter((row) => row.some((value) => value.trim() !== ""));
  const managers = [];

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const managerName = row[1]?.trim();

    if (!managerName || rows[index + 1]?.[0]?.trim() !== "Draft #") {
      continue;
    }

    const headerRow = rows[index + 1].map((header) => header.trim());
    const movies = [];
    let totals = { boxOffice: 0, critical: 0, award: 0, points: 0 };
    index += 2;

    for (; index < rows.length; index += 1) {
      const resultRow = rows[index];
      const firstCell = resultRow[0]?.trim();

      if (!firstCell) {
        break;
      }

      const record = headerRow.reduce((result, header, columnIndex) => {
        result[header || `Column ${columnIndex + 1}`] = resultRow[columnIndex]?.trim() ?? "";
        return result;
      }, {});

      if (firstCell.toLowerCase() === "total") {
        totals = {
          award: parsePoints(record.Award),
          boxOffice: parsePoints(record.$),
          critical: parsePoints(record.Critical),
          points: parsePoints(record.Total),
        };
        break;
      }

      movies.push({
        award: parsePoints(record.Award),
        boxOffice: parsePoints(record.$),
        critical: parsePoints(record.Critical),
        draftNumber: record["Draft #"],
        movie: record.Movie,
        points: parsePoints(record.Total),
      });
    }

    managers.push({
      award: totals.award,
      boxOffice: totals.boxOffice,
      critical: totals.critical,
      manager: managerName,
      movies,
      points: totals.points,
    });
  }

  return rankRows(managers.sort((firstManager, secondManager) => {
    if (secondManager.points !== firstManager.points) {
      return secondManager.points - firstManager.points;
    }

    return firstManager.manager.localeCompare(secondManager.manager);
  }));
}

function getFantasyOfficeView(year) {
  return fantasyOfficeViews[year];
}

function renderFantasyOffice2025(data) {
  siteData.fantasyOffice2025 = data;
  renderFantasyOfficeDraft(2025, data.draft);
  renderFantasyOfficeMovies(2025, data.results);
  renderFantasyOfficeResults(2025, data.results);
}

function renderFantasyOfficeDraft(year, draft) {
  const view = getFantasyOfficeView(year);

  if (!view?.draftList) {
    return;
  }

  if (!draft.length) {
    view.draftList.innerHTML = `<article class="fantasy-critic-card"><p class="table-message">No Fantasy Office draft data was loaded.</p></article>`;
    return;
  }

  view.draftList.innerHTML = draft.map((managerDraft) => {
    const manager = getManagerByName(managerDraft.manager) ?? { name: managerDraft.manager };

    return `
      <article class="office-draft-card">
        <header>
          ${renderManagerChip(manager)}
        </header>
        <ol class="office-pick-list">
          ${managerDraft.picks.map((pick) => {
            return `
              <li>
                <span>${escapeHtml(pick.pick)}</span>
                <strong>${escapeHtml(pick.movie)}</strong>
              </li>
            `;
          }).join("")}
        </ol>
      </article>
    `;
  }).join("");
}

function renderFantasyOfficeMovies(year, results) {
  const view = getFantasyOfficeView(year);

  if (!view?.movieList) {
    return;
  }

  const movies = getFantasyOfficeMovieRows(results);

  if (!movies.length) {
    view.movieList.innerHTML = `<article class="formula-one-question-card"><p class="table-message">No Fantasy Office movie results are available yet.</p></article>`;
    return;
  }

  view.movieList.innerHTML = `
    <div class="table-wrap office-movie-table">
      <table>
        <thead>
          <tr>
            ${renderFantasyOfficeMovieHeader("movie", "Movie")}
            ${renderFantasyOfficeMovieHeader("manager", "Manager")}
            ${renderFantasyOfficeMovieHeader("boxOffice", "Box Office")}
            ${renderFantasyOfficeMovieHeader("critical", "Critical")}
            ${renderFantasyOfficeMovieHeader("award", "Awards")}
            ${renderFantasyOfficeMovieHeader("points", "Total")}
          </tr>
        </thead>
        <tbody>
          ${movies.map((movie) => {
            const manager = getManagerByName(movie.manager) ?? { name: movie.manager };

            return `
              <tr>
                <td data-label="Movie">
                  <span class="office-movie-title">${escapeHtml(movie.movie)}</span>
                  <span class="office-movie-draft">${escapeHtml(movie.draftNumber)}</span>
                </td>
                <td data-label="Manager">${renderManagerChip(manager)}</td>
                <td data-label="Box Office">${escapeHtml(formatPoints(movie.boxOffice))}</td>
                <td data-label="Critical">${escapeHtml(formatPoints(movie.critical))}</td>
                <td data-label="Awards">${escapeHtml(formatPoints(movie.award))}</td>
                <td data-label="Total">${escapeHtml(formatPoints(movie.points))}</td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function getFantasyOfficeMovieRows(results) {
  const rows = results.flatMap((entry) => {
    return entry.movies.map((movie) => ({
      ...movie,
      manager: entry.manager,
    }));
  });

  return rows.sort(compareFantasyOfficeMovies);
}

function compareFantasyOfficeMovies(firstMovie, secondMovie) {
  const direction = fantasyOfficeMovieSort.direction === "asc" ? 1 : -1;
  const key = fantasyOfficeMovieSort.key;
  const firstValue = firstMovie[key];
  const secondValue = secondMovie[key];

  if (typeof firstValue === "number" && typeof secondValue === "number") {
    return direction * (firstValue - secondValue) || firstMovie.movie.localeCompare(secondMovie.movie);
  }

  return direction * String(firstValue ?? "").localeCompare(String(secondValue ?? "")) || firstMovie.movie.localeCompare(secondMovie.movie);
}

function renderFantasyOfficeMovieHeader(key, label) {
  const isActive = fantasyOfficeMovieSort.key === key;
  const directionLabel = fantasyOfficeMovieSort.direction === "asc" ? "ascending" : "descending";
  const sortMark = isActive ? (fantasyOfficeMovieSort.direction === "asc" ? "&uarr;" : "&darr;") : "";

  return `
    <th>
      <button class="office-sort-button" type="button" data-office-movie-sort="${escapeHtml(key)}" aria-label="Sort by ${escapeHtml(label)}${isActive ? `, currently ${directionLabel}` : ""}">
        <span>${escapeHtml(label)}</span>
        <span aria-hidden="true">${sortMark}</span>
      </button>
    </th>
  `;
}

function renderFantasyOfficeResults(year, results) {
  const view = getFantasyOfficeView(year);

  if (!view?.resultList) {
    return;
  }

  if (!results.length) {
    view.resultList.innerHTML = `<article class="fantasy-critic-card"><p class="table-message">No Fantasy Office results are available yet.</p></article>`;
    return;
  }

  const awards = getAwardsForFantasyOfficeYear(year);
  const awardMarkup = renderFantasyOfficeAwards(awards);
  const resultMarkup = results.map((entry, index) => {
    const manager = getManagerByName(entry.manager) ?? { name: entry.manager };
    const entryAwards = entry.rank === 1
      ? getAwardsForManager(manager, { standings: "fantasy-office", year })
      : [];

    return `
      <article class="office-result-card">
        <header class="office-result-summary">
          <div class="fantasy-critic-rank">
            <span>Rank</span>
            <strong>${escapeHtml(formatRankDisplay(entry, index, results))}</strong>
          </div>
          <div class="fantasy-critic-manager">
            <span class="standing-manager-with-awards">
              ${renderManagerChip(manager)}
              ${renderAwardBadges(entryAwards)}
            </span>
          </div>
          <div class="fantasy-critic-points">
            <span>Points</span>
            <strong>${escapeHtml(formatPoints(entry.points))}</strong>
          </div>
        </header>
        <div class="fantasy-critic-meta">
          <span>$ <strong>${escapeHtml(formatPoints(entry.boxOffice))}</strong></span>
          <span>Critical <strong>${escapeHtml(formatPoints(entry.critical))}</strong></span>
          <span>Awards <strong>${escapeHtml(formatPoints(entry.award))}</strong></span>
        </div>
        <div class="fantasy-critic-roster">
          ${entry.movies.map((movie) => {
            return `
              <div class="fantasy-critic-game">
                <strong>${escapeHtml(movie.movie)}</strong>
                <span>${escapeHtml(movie.draftNumber)}</span>
                <span>${escapeHtml(formatPoints(movie.points))}</span>
              </div>
            `;
          }).join("")}
        </div>
      </article>
    `;
  }).join("");

  view.resultList.innerHTML = `${awardMarkup}${resultMarkup}`;
}

function renderFantasyOfficeAwards(awards = []) {
  if (!awards.length) {
    return "";
  }

  return `
    <section class="standings-awards fantasy-office-awards">
      <div class="standings-awards-heading">
        <h2>Awards</h2>
      </div>
      <div class="standings-awards-list">
        ${awards.map((award) => renderAwardCard(award, "standings-summary")).join("")}
      </div>
    </section>
  `;
}

function getAwardsForFantasyOfficeYear(year) {
  return getResolvedAwards().filter((award) => {
    return award.standings === "fantasy-office" &&
      String(award.year || "") === String(year || "");
  });
}

function renderFantasyOfficeError(error) {
  renderFantasyOfficeDraftError(2025, error);
  renderFantasyOfficeMovieError(2025, error);
  renderFantasyOfficeResultsError(2025, error);
}

function renderFantasyOfficeDraftError(year, error) {
  const view = getFantasyOfficeView(year);

  if (view?.draftList) {
    view.draftList.innerHTML = `<article class="fantasy-critic-card"><p class="table-message">Unable to load Fantasy Office draft: ${escapeHtml(error.message)}</p></article>`;
  }
}

function renderFantasyOfficeMovieError(year, error) {
  const view = getFantasyOfficeView(year);

  if (view?.movieList) {
    view.movieList.innerHTML = `<article class="formula-one-question-card"><p class="table-message">Unable to load Fantasy Office movies: ${escapeHtml(error.message)}</p></article>`;
  }
}

function renderFantasyOfficeResultsError(year, error) {
  const view = getFantasyOfficeView(year);

  if (view?.resultList) {
    view.resultList.innerHTML = `<article class="fantasy-critic-card"><p class="table-message">Unable to load Fantasy Office results: ${escapeHtml(error.message)}</p></article>`;
  }
}

function renderUpdatedTime(value) {
  if (!updatedTime || !value) {
    return;
  }

  updatedTime.textContent = `Updated ${formatUpdatedTime(value)}`;
}

function parseResultImages(csvText) {
  const rows = parseCsvMatrix(csvText);
  const headerIndex = rows.findIndex((row) => {
    const normalizedHeaders = row.map(normalizeLookupName);

    return normalizedHeaders.includes("match id") &&
      normalizedHeaders.includes("image url") &&
      normalizedHeaders.includes("home") &&
      normalizedHeaders.includes("home score") &&
      normalizedHeaders.includes("away") &&
      normalizedHeaders.includes("away score");
  });

  if (headerIndex === -1) {
    return [];
  }

  const headerRow = rows[headerIndex];
  const columns = Object.fromEntries(
    headerRow.map((header, index) => [normalizeLookupName(header), index])
  );
  const resultImages = [];

  for (const row of rows.slice(headerIndex + 1)) {
    const isBlankRow = row.every((value) => !String(value ?? "").trim());

    if (isBlankRow) {
      break;
    }

    const imageUrl = row[columns["image url"]]?.trim() ?? "";
    const home = row[columns.home]?.trim() ?? "";
    const homeScore = row[columns["home score"]]?.trim() ?? "";
    const away = row[columns.away]?.trim() ?? "";
    const awayScore = row[columns["away score"]]?.trim() ?? "";

    if (!imageUrl || !home || !away || homeScore === "" || awayScore === "") {
      continue;
    }

    resultImages.push({
      away,
      awayScore,
      home,
      homeScore,
      imageUrl,
      matchId: row[columns["match id"]]?.trim() ?? "",
      roundId: row[columns["round id"]]?.trim() ?? "",
    });
  }

  return resultImages.sort(compareResultImagesByMatchId);
}

function compareResultImagesByMatchId(firstResult, secondResult) {
  const firstId = Number(firstResult.matchId);
  const secondId = Number(secondResult.matchId);

  if (Number.isFinite(firstId) && Number.isFinite(secondId) && firstId !== secondId) {
    return secondId - firstId;
  }

  return String(secondResult.matchId).localeCompare(String(firstResult.matchId), undefined, { numeric: true });
}

function renderStandingsRoundOptions(rounds) {
  if (!standingsRoundSelect) {
    return;
  }

  const options = [
    `<option value="">All</option>`,
    `<option value="${BEST_STANDING_PERFORMANCE_VALUE}">Best Game</option>`,
  ];

  for (const round of rounds) {
    options.push(`<option value="${escapeHtml(round.id)}">${escapeHtml(round.name)}</option>`);

    if (String(round.id) === "3") {
      options.push(`<option value="group">Group</option>`);
    }
  }

  standingsRoundSelect.innerHTML = options.join("");
}

function renderResultImages(resultImages) {
  if (!dynamicResultImages) {
    return;
  }

  if (resultImages.length === 0) {
    dynamicResultImages.hidden = true;
    dynamicResultImages.innerHTML = "";
    return;
  }

  dynamicResultImages.hidden = false;
  dynamicResultImages.innerHTML = renderResultImageGroups(resultImages);
}

function renderResultImageGroups(resultImages) {
  const groups = getResultImageGroups(resultImages);
  const openRoundId = groups[0]?.roundId ?? "";

  return groups.map((group) => renderResultRoundGroup(group, group.roundId === openRoundId)).join("");
}

function getResultImageGroups(resultImages) {
  const groups = [];
  const groupsByRound = new Map();

  for (const result of resultImages) {
    const roundId = getResultImageRoundId(result) || "unknown";
    let group = groupsByRound.get(roundId);

    if (!group) {
      group = { results: [], roundId };
      groupsByRound.set(roundId, group);
      groups.push(group);
    }

    group.results.push(result);
  }

  return groups;
}

function renderResultRoundGroup(group, isOpen) {
  const panelId = `result-round-${escapeHtml(group.roundId)}`;
  const label = getRoundPrettyName(group.roundId) || "Results";
  const openAttribute = isOpen ? " open" : "";

  return `
    <details class="result-round" data-result-round${openAttribute}>
      <summary class="result-round-summary" aria-controls="${panelId}">
        <span class="result-round-title">${escapeHtml(label)}</span>
      </summary>
      <div class="results-grid result-round-grid" id="${panelId}">
        ${group.results.map((result) => renderResultImageCard(result, isOpen)).join("")}
      </div>
    </details>
  `;
}

function renderResultImageCard(result, shouldLoadImage = true) {
  const resultText = formatResultImageText(result);
  const imageSource = resolveResultImageSource(result.imageUrl);
  const sourceAttribute = shouldLoadImage
    ? `src="${escapeHtml(imageSource)}"`
    : `data-src="${escapeHtml(imageSource)}"`;

  return `
    <article class="result-card" data-result-card>
      <img
        class="result-image"
        ${sourceAttribute}
        alt="${escapeHtml(`${resultText} result`)}"
      >
      <button class="result-overlay" type="button" data-result-toggle aria-label="${escapeHtml(`Show ${resultText} result`)}">
        ${formatResultOverlayMarkup(result)}
      </button>
    </article>
  `;
}

function resolveResultImageSource(value) {
  const source = String(value || "").trim();

  if (!source || /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(source) || source.startsWith("/") || source.startsWith("./") || source.startsWith("../")) {
    return source;
  }

  return source.startsWith("assets/") ? source : `assets/${source}`;
}

function getResultImageRoundId(result) {
  return String(result.roundId || inferGroupRoundIdFromMatchId(result.matchId) || "").trim();
}

function getRoundPrettyName(roundId) {
  const round = siteData.rounds?.find((entry) => String(entry.id) === String(roundId));

  return round?.prettyName || round?.name || "";
}

function formatResultImageText(result) {
  return `${result.home} ${result.homeScore} ${result.away} ${result.awayScore}`;
}

function formatResultOverlayText(result) {
  return `${result.home} ${result.homeScore}-${result.awayScore} ${result.away}`;
}

function formatResultOverlayMarkup(result) {
  if (!hasPenaltyStyleScore(result)) {
    return escapeHtml(formatResultOverlayText(result));
  }

  return `
    <span class="result-overlay-stack">
      <span>${escapeHtml(`${result.home} ${result.homeScore}`)}</span>
      <span>${escapeHtml(`${result.away} ${result.awayScore}`)}</span>
    </span>
  `;
}

function hasPenaltyStyleScore(result) {
  return String(result.homeScore || "").includes("(") || String(result.awayScore || "").includes("(");
}

pageLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();

    const pageName = link.dataset.pageLink;
    const nextHash = `#${pageName}`;

    if (window.location.hash === nextHash) {
      showPage(pageName, { scrollToTop: true });
      return;
    }

    history.pushState(null, "", nextHash);
    showPage(pageName, { scrollToTop: true });
  });
});

workflowList?.addEventListener("click", (event) => {
  const item = event.target.closest("[data-workflow-target], [data-workflow-url]");

  if (item) {
    activateWorkflowItem(item);
  }
});

workflowList?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }

  const item = event.target.closest("[data-workflow-target], [data-workflow-url]");

  if (item) {
    event.preventDefault();
    activateWorkflowItem(item);
  }
});

document.addEventListener("click", (event) => {
  const awardButton = event.target.closest("[data-award-toggle]");

  if (!awardButton) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  awardButton.setAttribute("aria-expanded", String(awardButton.getAttribute("aria-expanded") !== "true"));
});

copyCurrentPageLinkButton?.addEventListener("click", () => {
  copyCurrentPageUrl();
});

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    showTab(tab.dataset.tab, { scrollToTop: true });
  });
});

draftViewButtons.forEach((button) => {
  button.addEventListener("click", () => {
    showDraftView(button.dataset.draftView);
  });
});

draftPlayerPositionFilter?.addEventListener("change", () => {
  renderDraftPlayers();
});

loginPanel?.addEventListener("submit", (event) => {
  event.preventDefault();
  handleManagerLogin();
});

loginManagerSelect?.addEventListener("change", () => {
  updateLoginModeForSelectedManager();
});

profileMenuButton?.addEventListener("click", () => {
  const isOpen = profileMenuButton.getAttribute("aria-expanded") === "true";
  profileMenuButton.setAttribute("aria-expanded", String(!isOpen));
  profileDropdown.hidden = isOpen;
});

profileDropdown?.addEventListener("click", (event) => {
  if (event.target.closest("a, button")) {
    closeProfileDropdown();
  }
});

logoutButton?.addEventListener("click", () => {
  signOutManager();
});

document.addEventListener("click", (event) => {
  if (event.target.closest("#footy-show-all-button")) {
    shouldShowAllFootyFixtures = true;
    renderFootySchedule(siteData.footySchedule);
    return;
  }

  if (!profileMenu || profileMenu.hidden || profileMenu.contains(event.target)) {
    return;
  }

  closeProfileDropdown();
});

leagueYearSelect?.addEventListener("change", () => {
  renderLeagueList(leagueYearSelect.value);
});

footyPastToggle?.addEventListener("click", () => {
  shouldShowPastFootyFixtures = !shouldShowPastFootyFixtures;
  shouldShowAllFootyFixtures = false;
  renderFootySchedule(siteData.footySchedule);
});

footyFilterToggle?.addEventListener("click", () => {
  shouldShowFootyFilters = !shouldShowFootyFilters;
  renderFootySchedule(siteData.footySchedule);
});

footyTeamFilter?.addEventListener("click", (event) => {
  if (!event.target.closest(".multi-filter-button")) {
    return;
  }

  shouldShowFootyTeamOptions = !shouldShowFootyTeamOptions;
  renderFootySchedule(siteData.footySchedule);
});

function markFootyTeamSelectionExplicit(event) {
  if (!event.target.matches("input[type=\"checkbox\"]")) {
    return;
  }

  footyTeamFilter
    .querySelectorAll("input[data-default-selected=\"true\"]")
    .forEach((input) => {
      delete input.dataset.defaultSelected;
    });
}

footyTeamFilter?.addEventListener("input", markFootyTeamSelectionExplicit);
footyTeamFilter?.addEventListener("change", markFootyTeamSelectionExplicit);

[footySearchInput, footyDateFromFilter, footyDateToFilter, footyTeamFilter].forEach((control) => {
  control?.addEventListener("input", () => renderFootySchedule(siteData.footySchedule));
  control?.addEventListener("change", () => renderFootySchedule(siteData.footySchedule));
});

document.addEventListener("click", (event) => {
  if (!footyTeamFilter || !shouldShowFootyTeamOptions || footyTeamFilter.contains(event.target)) {
    return;
  }

  shouldShowFootyTeamOptions = false;
  renderFootySchedule(siteData.footySchedule);
});

Object.entries(formulaOneViews).forEach(([year, view]) => {
  view.questionSelect?.addEventListener("change", () => {
    if (view.questionFilter) {
      view.questionFilter.value = "";
    }

    renderFormulaOneQuestions(year);
  });

  view.questionFilter?.addEventListener("input", () => {
    renderFormulaOneQuestions(year);
  });

  view.resultsModeButtons?.forEach((button) => {
    button.addEventListener("click", () => {
      setFormulaOneResultsMode(year, button.getAttribute("data-formula-one-results-mode"));
    });
  });

  view.weeklyRoundSelect?.addEventListener("change", () => {
    renderFormulaOneWeeklyPage(year, siteData[`formulaOne${year}Weekly`]);
  });

  view.weeklyForm?.addEventListener("change", (event) => {
    if (!event.target.matches("[data-formula-one-form-select]")) {
      return;
    }

    renderFormulaOneWeeklyForm(year, siteData[`formulaOne${year}RoundForms`]);
  });

  view.weeklyForm?.addEventListener("toggle", (event) => {
    if (!event.target.matches(".formula-one-form-embed")) {
      return;
    }

    loadVisibleFormulaOneFormIframes(view.weeklyForm);
  }, true);

  view.weeklyList?.addEventListener("click", (event) => {
    const entry = event.target.closest("[data-formula-one-weekly-entry]");

    if (entry) {
      toggleFormulaOneWeeklyEntry(entry);
    }
  });

  view.weeklyList?.addEventListener("keydown", (event) => {
    if (!["Enter", " "].includes(event.key)) {
      return;
    }

    const entry = event.target.closest("[data-formula-one-weekly-entry]");

    if (!entry) {
      return;
    }

    event.preventDefault();
    toggleFormulaOneWeeklyEntry(entry);
  });
});

Object.entries(fantasyOfficeViews).forEach(([year, view]) => {
  view.movieList?.addEventListener("click", (event) => {
    const sortButton = event.target.closest("[data-office-movie-sort]");

    if (!sortButton) {
      return;
    }

    const key = sortButton.dataset.officeMovieSort;

    if (fantasyOfficeMovieSort.key === key) {
      fantasyOfficeMovieSort.direction = fantasyOfficeMovieSort.direction === "asc" ? "desc" : "asc";
    } else {
      fantasyOfficeMovieSort.key = key;
      fantasyOfficeMovieSort.direction = key === "movie" || key === "manager" ? "asc" : "desc";
    }

    renderFantasyOfficeMovies(year, siteData[`fantasyOffice${year}`]?.results ?? []);
  });
});

resultsPage?.addEventListener("click", (event) => {
  const resultRoundSummary = event.target.closest(".result-round-summary");

  if (resultRoundSummary) {
    const resultRound = resultRoundSummary.closest("[data-result-round]");

    if (resultRound && !resultRound.open) {
      loadResultRoundImages(resultRound);
    }
  }

  const toggle = event.target.closest("[data-result-toggle]");

  if (!toggle) {
    return;
  }

  const card = toggle.closest("[data-result-card]");

  if (!card) {
    return;
  }

  const shouldShow = !card.classList.contains("is-result-visible");

  resultsPage.querySelectorAll("[data-result-card]").forEach((resultCard) => {
    resultCard.classList.remove("is-result-visible");
  });

  card.classList.toggle("is-result-visible", shouldShow);
});

resultsPage?.addEventListener("toggle", (event) => {
  const resultRound = event.target.closest?.("[data-result-round]");

  if (resultRound?.open) {
    loadResultRoundImages(resultRound);
  }
}, true);

function loadResultRoundImages(resultRound) {
  resultRound.querySelectorAll("img[data-src]").forEach((image) => {
    image.setAttribute("src", image.getAttribute("data-src"));
    image.removeAttribute("data-src");
  });
}

managerResultsRows?.addEventListener("click", (event) => {
  const managerRow = event.target.closest("[data-manager-result-row]");

  if (!managerRow) {
    return;
  }

  toggleManagerResultRow(managerRow);
});

managerResultsRows?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }

  const managerRow = event.target.closest("[data-manager-result-row]");

  if (!managerRow) {
    return;
  }

  event.preventDefault();
  toggleManagerResultRow(managerRow);
});

playerChampionshipRows?.addEventListener("click", (event) => {
  const standingRow = event.target.closest("[data-standing-result-row]");

  if (!standingRow) {
    return;
  }

  toggleStandingResultRow(playerChampionshipRows, standingRow);
});

playerChampionshipRows?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }

  const standingRow = event.target.closest("[data-standing-result-row]");

  if (!standingRow) {
    return;
  }

  event.preventDefault();
  toggleStandingResultRow(playerChampionshipRows, standingRow);
});

nationsLeagueRows?.addEventListener("click", (event) => {
  if (event.target.closest("[data-award-toggle]")) {
    return;
  }

  const standingRow = event.target.closest("[data-standing-result-row]");

  if (!standingRow) {
    return;
  }

  toggleStandingResultRow(nationsLeagueRows, standingRow);
});

nationsLeagueRows?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }

  if (event.target.closest("[data-award-toggle]")) {
    return;
  }

  const standingRow = event.target.closest("[data-standing-result-row]");

  if (!standingRow) {
    return;
  }

  event.preventDefault();
  toggleStandingResultRow(nationsLeagueRows, standingRow);
});

managerResultsFilter?.addEventListener("change", () => {
  if (siteData.managerResultsSource) {
    renderManagerResults(siteData.managerResultsSource);
  }

  renderStandingsAwards();
});

managerSummaryYearSelect?.addEventListener("change", () => {
  const session = siteData.managerSession;

  if (session) {
    renderManagerSummary(session.managerId);
  }
});

standingsAllDataToggle?.addEventListener("change", () => {
  renderFilteredStandings();
});

standingsRoundSelect?.addEventListener("change", () => {
  renderFilteredStandings();
});

nationTestScoringToggle?.addEventListener("change", () => {
  syncTestScoringUi();
  renderFilteredStandings();
  renderDraftPage();
  renderCurrentMatchLists();
  renderRulesNationOptions();
  renderRulesNationBreakdown();
});

rulesNationSelect?.addEventListener("change", () => {
  renderRulesNationBreakdown();
});

playerPositionFilter?.addEventListener("change", () => {
  if (siteData.playerPerformances) {
    renderPlayerChampionship(siteData.playerPerformances);
  }
});

bracketView?.addEventListener("click", (event) => {
  const pickButton = event.target.closest("[data-bracket-pick]");

  if (!pickButton || pickButton.disabled) {
    return;
  }

  setBracketPick(pickButton.getAttribute("data-match-id"), pickButton.getAttribute("data-side"));
});

bracketClearPicks?.addEventListener("click", () => {
  clearBracketPicks();
});

bracketSubmissionSelect?.addEventListener("change", () => {
  syncBracketSubmissionControls();
  renderBracket();
});

bracketSubmitterInput?.addEventListener("input", () => {
  try {
    localStorage.setItem(BRACKET_SUBMITTER_STORAGE_KEY, bracketSubmitterInput.value.trim());
  } catch {
    // Ignore storage failures; the typed name can still be submitted.
  }
});

bracketSubmitButton?.addEventListener("click", () => {
  submitBracketPicks();
});

function hideLoginPanel() {
  if (!loginPanel) {
    return;
  }

  if (loginPassphraseInput) {
    loginPassphraseInput.value = "";
  }
  if (loginRecoveryAnswerInput) {
    loginRecoveryAnswerInput.value = "";
  }
  if (loginNewPassphraseInput) {
    loginNewPassphraseInput.value = "";
  }
  if (loginConfirmPassphraseInput) {
    loginConfirmPassphraseInput.value = "";
  }
  loginFeedback.textContent = "";
  loginFeedback.classList.remove("is-error");
}

function hydrateManagerSession() {
  try {
    const rawSession = localStorage.getItem(MANAGER_SESSION_STORAGE_KEY);
    siteData.managerSession = rawSession ? JSON.parse(rawSession) : null;
  } catch {
    siteData.managerSession = null;
  }

  renderLoginState();
  renderManagerHub();
}

function saveManagerSession(session) {
  siteData.managerSession = session;

  try {
    localStorage.setItem(MANAGER_SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Session persistence is helpful, but the in-memory session is enough for this visit.
  }

  renderLoginState();
  renderManagerHub();
}

function signOutManager() {
  siteData.managerSession = null;

  try {
    localStorage.removeItem(MANAGER_SESSION_STORAGE_KEY);
  } catch {
    // Ignore storage failures; the in-memory session has already been cleared.
  }

  closeProfileDropdown();
  renderLoginState();
  renderManagerHub();
  showPage("footy", { scrollToTop: true });
  window.location.hash = "footy";
}

async function copyCurrentPageUrl() {
  if (!copyCurrentPageLinkButton) {
    return;
  }

  const url = window.location.href;
  const originalText = copyCurrentPageLinkButton.textContent;

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
    } else {
      copyTextWithFallback(url);
    }

    copyCurrentPageLinkButton.textContent = "Copied";
  } catch (error) {
    console.warn("Unable to copy current page URL", error);
    copyCurrentPageLinkButton.textContent = "Copy failed";
  }

  window.setTimeout(() => {
    copyCurrentPageLinkButton.textContent = originalText || "Copy URL";
  }, 1600);
}

function copyTextWithFallback(text) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  textArea.style.top = "0";
  document.body.append(textArea);
  textArea.select();
  document.execCommand("copy");
  textArea.remove();
}

function renderLoginState() {
  const session = siteData.managerSession;
  const manager = session ? getPortalManagerById(session.managerId) ?? session.manager : null;
  const managerMeta = manager ? getManagerMeta(manager) : null;

  if (loginOpenButton) {
    loginOpenButton.hidden = Boolean(managerMeta);
  }

  if (profileMenu) {
    profileMenu.hidden = !managerMeta;
  }

  if (copyCurrentPageLinkButton) {
    copyCurrentPageLinkButton.hidden = !managerMeta?.isAdmin;
  }

  if (profileName) {
    profileName.textContent = managerMeta?.displayName || "Manager";
  }

  const avatar = profileMenu?.querySelector(".profile-avatar");
  if (avatar) {
    avatar.textContent = managerMeta?.displayName?.charAt(0)?.toUpperCase() || "?";
    avatar.style.background = managerMeta?.color || "";
    avatar.style.color = getContrastTextColor(managerMeta?.color);
  }

  if (session && managerMeta) {
    siteData.managerSession = {
      ...session,
      isAdmin: managerMeta.isAdmin,
      manager: {
        ...manager,
        isAdmin: managerMeta.isAdmin,
      },
    };
  }

}

function renderLoginManagerOptions() {
  if (!loginManagerSelect) {
    return;
  }

  const selected = loginManagerSelect.value;
  const managers = getPortalManagers();

  loginManagerSelect.innerHTML = [
    `<option value="">${managers.length ? "Choose manager" : "Loading managers..."}</option>`,
    ...managers.map((manager) => {
      const meta = getManagerMeta(manager);
      const selectedAttribute = String(meta.id) === String(selected) ? " selected" : "";
      return `<option value="${escapeHtml(meta.id)}"${selectedAttribute}>${escapeHtml(meta.displayName)}</option>`;
    }),
  ].join("");

  updateLoginModeForSelectedManager({ skipRemoteCheck: true });
}

async function handleManagerLogin() {
  const managerId = loginManagerSelect?.value || "";
  const loginMode = getLoginMode();

  if (!managerId) {
    setLoginFeedback("Choose a manager.", true);
    return;
  }

  if (loginMode === "setup-recovery") {
    await handleManagerRecoveryCheck(managerId);
    return;
  }

  const passphrase = loginMode === "setup-passphrase"
    ? loginNewPassphraseInput?.value || ""
    : loginPassphraseInput?.value || "";

  loginSubmitButton.disabled = true;
  setLoginFeedback(loginMode === "setup-passphrase" ? "Saving passphrase..." : "Checking passphrase...");

  try {
    let response;

    if (loginMode === "setup-passphrase") {
      validateNewPassphraseFields(passphrase);
      response = await submitManagerPortalPayload({
        action: "setupPassphrase",
        managerId,
        passphrase,
        recoveryAnswer: siteData.loginRecoveryAnswer || loginRecoveryAnswerInput?.value || "",
      });
    } else {
      if (!passphrase.trim()) {
        setLoginFeedback("Enter a passphrase.", true);
        loginPassphraseInput?.focus();
        return;
      }

      response = await submitManagerPortalPayload({
        action: "login",
        managerId,
        passphrase,
      });
    }

    if (!response?.ok) {
      throw new Error(response?.error || "Login was not accepted.");
    }

    const manager = getPortalManagerById(managerId) ?? response.manager ?? { id: managerId, name: response.displayName };
    saveManagerSession({
      manager,
      managerId: String(managerId),
      signedInAt: new Date().toISOString(),
    });
    setCachedManagerAuthStatus(managerId, { hasPassphrase: true, mustReset: false, recoveryQuestion: "" });
    hideLoginPanel();
    showPage("manager-hub", { scrollToTop: true });
    window.location.hash = "manager-hub";
  } catch (error) {
    setLoginFeedback(error.message, true);
  } finally {
    loginSubmitButton.disabled = false;
  }
}

async function handleManagerRecoveryCheck(managerId) {
  const recoveryAnswer = loginRecoveryAnswerInput?.value || "";

  if (!recoveryAnswer.trim()) {
    setLoginFeedback("Enter the recovery answer.", true);
    loginRecoveryAnswerInput?.focus();
    return;
  }

  loginSubmitButton.disabled = true;
  setLoginFeedback("Checking recovery answer...");

  try {
    const response = await submitManagerPortalPayload({
      action: "verifyRecovery",
      managerId,
      recoveryAnswer,
    });

    if (!response?.ok) {
      throw new Error(response?.error || "Recovery answer was not accepted.");
    }

    siteData.loginRecoveryVerifiedManagerId = String(managerId);
    siteData.loginRecoveryAnswer = recoveryAnswer;
    renderLoginMode({ hasPassphrase: false, recoveryQuestion: response.recoveryQuestion || getCachedManagerAuthStatus(managerId)?.recoveryQuestion || "" });
    setLoginFeedback("Answer accepted. Set your passphrase.");
    loginNewPassphraseInput?.focus();
  } catch (error) {
    setLoginFeedback(error.message, true);
  } finally {
    loginSubmitButton.disabled = false;
  }
}

function validateNewPassphraseFields(passphrase) {
  const confirmation = loginConfirmPassphraseInput?.value || "";

  if (!passphrase.trim()) {
    loginNewPassphraseInput?.focus();
    throw new Error("Enter a new passphrase.");
  }

  if (passphrase !== confirmation) {
    loginConfirmPassphraseInput?.focus();
    throw new Error("Passphrases do not match.");
  }
}

function setLoginFeedback(message, isError = false) {
  if (!loginFeedback) {
    return;
  }

  loginFeedback.textContent = message;
  loginFeedback.classList.toggle("is-error", isError);
}

async function updateLoginModeForSelectedManager(options = {}) {
  const managerId = loginManagerSelect?.value || "";
  siteData.loginRecoveryVerifiedManagerId = "";
  siteData.loginRecoveryAnswer = "";
  hideLoginPanel();
  renderLoginMode({ isLoading: Boolean(managerId) && !options.skipRemoteCheck });

  if (!managerId) {
    renderLoginMode({ isIdle: true });
    return;
  }

  if (options.skipRemoteCheck) {
    renderLoginMode({ isIdle: true });
    return;
  }

  loginSubmitButton.disabled = true;
  setLoginFeedback("Checking manager setup...");

  try {
    const response = await submitManagerPortalPayload({
      action: "authStatus",
      managerId,
    });

    if (!response?.ok) {
      throw new Error(response?.error || "Unable to check manager setup.");
    }

    if (loginManagerSelect?.value !== managerId) {
      return;
    }

    const status = {
      hasPassphrase: Boolean(response.hasPassphrase),
      mustReset: Boolean(response.mustReset),
      recoveryQuestion: response.recoveryQuestion || "",
    };
    setCachedManagerAuthStatus(managerId, status);
    renderLoginMode(status);
    setLoginFeedback("");
  } catch (error) {
    setLoginFeedback(error.message, true);
  } finally {
    loginSubmitButton.disabled = false;
  }
}

function getLoginMode() {
  const managerId = loginManagerSelect?.value || "";
  const status = getCachedManagerAuthStatus(managerId);

  if (!managerId || (!status?.mustReset && status?.hasPassphrase !== false)) {
    return "login";
  }

  return siteData.loginRecoveryVerifiedManagerId === String(managerId) ? "setup-passphrase" : "setup-recovery";
}

function renderLoginMode(status = { hasPassphrase: true }) {
  if (status.isLoading || status.isIdle) {
    hideLoginInputs();

    if (loginSubmitButton) {
      loginSubmitButton.hidden = true;
      loginSubmitButton.textContent = "Continue";
    }

    return;
  }

  if (loginSubmitButton) {
    loginSubmitButton.hidden = false;
  }

  const loginMode = getLoginMode();
  const isSetup = status.mustReset || status.hasPassphrase === false;
  const isPassphraseSetup = isSetup && loginMode === "setup-passphrase";

  if (loginPassphraseGroup) {
    loginPassphraseGroup.hidden = isSetup;
  }

  if (loginRecoveryPanel) {
    loginRecoveryPanel.hidden = !isSetup || isPassphraseSetup;
  }

  if (loginNewPassphrasePanel) {
    loginNewPassphrasePanel.hidden = !isPassphraseSetup;
  }

  if (loginRecoveryQuestion) {
    loginRecoveryQuestion.textContent = status.recoveryQuestion
      ? `Recovery Question: ${status.recoveryQuestion}`
      : "Recovery Question";
  }

  if (loginSubmitButton) {
    loginSubmitButton.textContent = isPassphraseSetup ? "Save Passphrase" : isSetup ? "Check Answer" : "Log In";
  }
}

function hideLoginInputs() {
  if (loginPassphraseGroup) {
    loginPassphraseGroup.hidden = true;
  }

  if (loginRecoveryPanel) {
    loginRecoveryPanel.hidden = true;
  }

  if (loginNewPassphrasePanel) {
    loginNewPassphrasePanel.hidden = true;
  }
}

function getCachedManagerAuthStatus(managerId) {
  return siteData.managerAuthStatus?.[String(managerId)] || null;
}

function setCachedManagerAuthStatus(managerId, status) {
  siteData.managerAuthStatus = {
    ...(siteData.managerAuthStatus || {}),
    [String(managerId)]: status,
  };
}

function submitManagerPortalPayload(payload) {
  if (!MANAGER_PORTAL_ENDPOINT) {
    return Promise.reject(new Error("Manager login endpoint is not configured yet."));
  }

  const callbackId = `manager-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const fullPayload = {
    ...payload,
    callbackId,
    pageUrl: window.location.href,
    browser: window.navigator.userAgent,
  };

  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      window.removeEventListener("message", handleMessage);
      reject(new Error("No response from the login endpoint. Redeploy the Apps Script web app if the code changed."));
    }, 12000);

    function handleMessage(event) {
      const data = parsePortalMessage(event.data);

      if (!data || data.source !== "boxthislap-manager-portal" || data.callbackId !== callbackId) {
        return;
      }

      window.clearTimeout(timeout);
      window.removeEventListener("message", handleMessage);
      resolve(data);
    }

    window.addEventListener("message", handleMessage);
    submitManagerPortalPayloadWithForm(fullPayload);
  });
}

function parsePortalMessage(value) {
  if (!value) {
    return null;
  }

  if (typeof value === "object") {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function submitManagerPortalPayloadWithForm(payload) {
  const iframeName = "manager-portal-frame";
  let iframe = document.querySelector(`iframe[name="${iframeName}"]`);

  if (!iframe) {
    iframe = document.createElement("iframe");
    iframe.name = iframeName;
    iframe.hidden = true;
    document.body.append(iframe);
  }

  const form = document.createElement("form");
  form.action = MANAGER_PORTAL_ENDPOINT;
  form.method = "POST";
  form.target = iframeName;
  form.hidden = true;

  const payloadInput = document.createElement("input");
  payloadInput.name = "payload";
  payloadInput.value = JSON.stringify(payload);
  form.append(payloadInput);

  document.body.append(form);
  form.submit();
  form.remove();
}

function renderManagerHub() {
  const session = siteData.managerSession;

  if (!session) {
    if (managerHubSubtitle) {
      managerHubSubtitle.textContent = "Log in to see your open items and results.";
    }

    if (workflowCount) {
      workflowCount.textContent = formatNotificationCount(0);
    }

    if (workflowList) {
      workflowList.innerHTML = `<article class="workflow-item"><p class="table-message">Log in to load notifications.</p></article>`;
    }

    if (managerSummaryList) {
      managerSummaryList.innerHTML = `<article class="workflow-item"><p class="table-message">Log in to load manager results.</p></article>`;
    }

    if (managerAwardsList) {
      managerAwardsList.innerHTML = `<article class="workflow-item"><p class="table-message">Log in to load awards.</p></article>`;
    }

    return;
  }

  const manager = getPortalManagerById(session.managerId) ?? session.manager;
  const managerMeta = getManagerMeta(manager);

  if (managerHubSubtitle) {
    managerHubSubtitle.textContent = `${managerMeta.displayName}'s open items and result summary.`;
  }

  renderManagerWorkflow(session.managerId);
  renderManagerSummary(session.managerId);
  renderManagerAwards(session.managerId);
}

function renderManagerWorkflowLegacy(managerId) {
  if (!workflowList) {
    return;
  }

  const drafts = siteData.portalDrafts || [];
  const logs = siteData.portalLogs || [];

  if (!drafts.length) {
    workflowList.innerHTML = `<article class="workflow-item"><p class="table-message">Loading workflow items...</p></article>`;
    return;
  }

  const openItems = drafts
    .filter((draft) => !isWorkflowDraftCompleted(draft))
    .filter((draft) => !hasManagerCompletedDraft(logs, managerId, draft.ID))
    .sort(compareWorkflowItems);

  if (workflowCount) {
    workflowCount.textContent = `${openItems.length} open`;
  }

  if (!openItems.length) {
    workflowList.innerHTML = `<article class="workflow-item"><p class="table-message">No open manager items.</p></article>`;
    return;
  }

  workflowList.innerHTML = openItems.map((draft) => `
    <article class="workflow-item">
      <header>
        <div>
          <h3>${escapeHtml(draft.Name || "Untitled draft")}</h3>
          <p>${escapeHtml([draft.Year, draft.League, draft.Type].filter(Boolean).join(" · "))}</p>
        </div>
        ${draft.Priority ? `<span class="workflow-priority">P${escapeHtml(draft.Priority)}</span>` : ""}
      </header>
      <div class="workflow-meta">
        ${draft["Due Date"] ? `<span>Due ${escapeHtml(draft["Due Date"])}</span>` : ""}
        ${draft.Status ? `<span>${escapeHtml(draft.Status)}</span>` : ""}
      </div>
      ${renderWorkflowAction(draft)}
    </article>
  `).join("");
}

function renderWorkflowAction(draft) {
  const target = draft["Target Page"] || "";
  const url = draft["Target URL"] || "";

  if (target) {
    return `<a class="action-button" href="#${escapeHtml(target)}" data-page-link="${escapeHtml(target)}">Open</a>`;
  }

  if (url) {
    return `<a class="action-button" href="${escapeHtml(url)}">Open</a>`;
  }

  return "";
}

function renderManagerWorkflow(managerId) {
  if (!workflowList) {
    return;
  }

  const drafts = siteData.portalDrafts || [];

  if (!drafts.length) {
    workflowList.innerHTML = `<article class="workflow-item"><p class="table-message">Loading notifications...</p></article>`;
    return;
  }

  const openItems = buildManagerWorkflowItems(managerId).sort(compareWorkflowItems);

  if (workflowCount) {
    workflowCount.textContent = formatNotificationCount(openItems.length);
  }

  if (!openItems.length) {
    workflowList.innerHTML = `<article class="workflow-item"><p class="table-message">No notifications need attention.</p></article>`;
    return;
  }

  workflowList.innerHTML = openItems.map(renderWorkflowItem).join("");
}

function buildManagerWorkflowItems(managerId) {
  return [
    ...buildDraftWorkflowItems(managerId),
    ...buildFantasyCriticWorkflowItems(managerId),
    ...buildFormulaOneWeeklyWorkflowItems(managerId),
  ];
}

function buildDraftWorkflowItems(managerId) {
  const drafts = siteData.portalDrafts || [];
  const logs = siteData.portalLogs || [];

  return drafts
    .filter((draft) => !isWorkflowDraftCompleted(draft))
    .filter((draft) => !hasManagerCompletedDraft(logs, managerId, draft.ID))
    .map((draft) => ({
      actionLabel: "Open",
      description: [draft.Year, draft.League, draft.Type].filter(Boolean).join(" - "),
      dueDate: draft["Due Date"] || "",
      id: `draft-${draft.ID || draft.Name || ""}`,
      priority: draft.Priority || "999",
      status: draft.Status || "",
      target: draft["Target Page"] || getWorkflowTargetFromDraft(draft),
      title: draft.Name || "Untitled draft",
      url: draft["Target URL"] || "",
    }));
}

function buildFormulaOneWeeklyWorkflowItems(managerId) {
  const forms = siteData.formulaOne2026RoundForms || [];
  const logs = siteData.portalLogs || [];
  const nextForm = getUpcomingFormulaOneForm(forms);

  if (!nextForm) {
    return [];
  }

  const completionIds = [
    `formula-one-2026-weekly-${nextForm.id}`,
    `f1-2026-weekly-${nextForm.id}`,
    `2026-f1-weekly-${nextForm.id}`,
    nextForm.id,
  ];

  if (completionIds.some((id) => hasManagerCompletedDraft(logs, managerId, id))) {
    return [];
  }

  return [{
    actionLabel: "Open",
    description: "2026 Formula 1 weekly bet",
    dueDate: formatWorkflowDue(nextForm),
    id: `formula-one-2026-weekly-${nextForm.id}`,
    priority: nextForm.Priority || nextForm.priority || "1",
    status: "Upcoming race",
    tab: "formula-one-2026-weekly-bet",
    target: "formula-1-2026-weekly",
    title: nextForm.name,
    url: "",
    weeklyFormId: nextForm.id,
    year: "2026",
  }];
}

function buildFantasyCriticWorkflowItems(managerId) {
  return ["2025", "2026"].flatMap((year) => {
    const state = getFantasyCriticLeagueState(year);

    if (state.status !== "loaded" || !state.league?.isDynamic) {
      return [];
    }

    const row = findFantasyCriticManagerRow(managerId, state.league);
    const blankDrafts = row?.blankDrafts || [];

    if (!blankDrafts.length) {
      return [];
    }

    return [{
      actionLabel: "Open",
      description: `${blankDrafts.length} open ${blankDrafts.length === 1 ? "slot" : "slots"} in ${year} Fantasy Critic`,
      dueDate: "",
      id: `fantasy-critic-${year}-open-slots`,
      priority: "2",
      status: blankDrafts.map((slot) => slot.label).join(", "),
      target: `fantasy-critic-${year}`,
      title: `${year} Fantasy Critic draft`,
      url: "",
    }];
  });
}

function formatNotificationCount(count) {
  return `${count} ${count === 1 ? "notification" : "notifications"}`;
}

function isWorkflowDraftCompleted(draft) {
  return isTruthy(getField(draft, "DraftCompleted", "Draft Completed", "IsCompleted", "Is Completed", "Completed"));
}

function getUpcomingFormulaOneForm(forms) {
  const today = getEasternTodayDate();
  const lookaheadEnd = new Date(today);
  lookaheadEnd.setUTCDate(lookaheadEnd.getUTCDate() + WORKFLOW_LOOKAHEAD_DAYS);

  return forms
    .filter((form) => form.date && form.date >= today && form.date <= lookaheadEnd)
    .sort((firstForm, secondForm) => firstForm.date - secondForm.date)[0] || null;
}

function getWorkflowTargetFromDraft(draft) {
  const league = normalizeLookupName(draft.League || draft.Name || "");
  const year = String(draft.Year || "").trim();

  if (league.includes("fantasycritic") || league.includes("fantasy critic")) {
    return year === "2026" ? "fantasy-critic-2026" : "fantasy-critic-2025";
  }

  if (league.includes("formula1") || league.includes("formula 1")) {
    return year === "2026" ? "formula-1-2026-weekly" : `formula-1-${year || "2025"}-questions`;
  }

  if (league.includes("worldcup") || league.includes("world cup")) {
    return "standings";
  }

  return "";
}

function renderWorkflowItem(item) {
  const targetAttrs = [
    item.target ? `data-workflow-target="${escapeHtml(item.target)}"` : "",
    item.url ? `data-workflow-url="${escapeHtml(item.url)}"` : "",
    item.tab ? `data-workflow-tab="${escapeHtml(item.tab)}"` : "",
    item.weeklyFormId ? `data-workflow-form-id="${escapeHtml(item.weeklyFormId)}"` : "",
    item.year ? `data-workflow-year="${escapeHtml(item.year)}"` : "",
  ].filter(Boolean).join(" ");

  return `
    <article class="workflow-item${targetAttrs ? " is-actionable" : ""}" ${targetAttrs} ${targetAttrs ? `role="button" tabindex="0"` : ""}>
      <header>
        <div>
          <h3>${escapeHtml(item.title || "Untitled notification")}</h3>
          ${item.description ? `<p>${escapeHtml(item.description)}</p>` : ""}
        </div>
        ${item.priority ? `<span class="workflow-priority">P${escapeHtml(item.priority)}</span>` : ""}
      </header>
      <div class="workflow-meta">
        ${item.dueDate ? `<span>Due ${escapeHtml(item.dueDate)}</span>` : ""}
        ${item.status ? `<span>${escapeHtml(item.status)}</span>` : ""}
      </div>
      ${targetAttrs ? `<span class="action-button workflow-open-label">${escapeHtml(item.actionLabel || "Open")}</span>` : ""}
    </article>
  `;
}

function formatWorkflowDate(date) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    timeZone: "America/New_York",
  }).format(date);
}

function formatWorkflowDue(form) {
  const dueEst = String(form?.dueEst ?? "").trim();

  if (dueEst) {
    return formatPrettyEasternDateTime(dueEst);
  }

  return form?.date ? formatWorkflowDate(form.date) : "";
}

function formatPrettyEasternDateTime(value) {
  const rawValue = String(value ?? "").trim();
  const sheetDateMatch = rawValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s+(\d{1,2})(?::(\d{2}))?(?::\d{2})?\s*([ap]m)?)?(?:\s*(?:est|edt|et))?$/i);

  if (sheetDateMatch) {
    const month = Number(sheetDateMatch[1]);
    const day = Number(sheetDateMatch[2]);
    const year = Number(sheetDateMatch[3].length === 2 ? `20${sheetDateMatch[3]}` : sheetDateMatch[3]);
    const hour = sheetDateMatch[4] ? Number(sheetDateMatch[4]) : null;
    const minute = sheetDateMatch[5] ? sheetDateMatch[5].padStart(2, "0") : "00";
    const period = sheetDateMatch[6] ? sheetDateMatch[6].toUpperCase() : "";
    const dateLabel = new Intl.DateTimeFormat("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(Date.UTC(year, month - 1, day)));

    if (hour) {
      return `${dateLabel} at ${hour}:${minute}${period ? ` ${period}` : ""} ET`;
    }

    return dateLabel;
  }

  const parsedDate = new Date(rawValue);

  if (!Number.isNaN(parsedDate.getTime())) {
    return new Intl.DateTimeFormat("en-US", {
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      month: "short",
      timeZone: "America/New_York",
      timeZoneName: "short",
      year: "numeric",
    }).format(parsedDate);
  }

  return rawValue;
}

function activateWorkflowItem(item) {
  const target = item.dataset.workflowTarget || "";
  const url = item.dataset.workflowUrl || "";

  if (target) {
    const nextHash = `#${target}`;

    if (window.location.hash !== nextHash) {
      history.pushState(null, "", nextHash);
    }

    showPage(target, { scrollToTop: true });

    if (item.dataset.workflowTab) {
      showTab(item.dataset.workflowTab);
    }

    if (item.dataset.workflowFormId && item.dataset.workflowYear) {
      selectFormulaOneWeeklyForm(item.dataset.workflowYear, item.dataset.workflowFormId);
    }

    return;
  }

  if (url) {
    window.location.href = url;
  }
}

function selectFormulaOneWeeklyForm(year, formId) {
  const view = formulaOneViews[year];
  const forms = siteData[`formulaOne${year}RoundForms`];

  if (!view?.weeklyForm || !forms?.length) {
    return;
  }

  const select = view.weeklyForm.querySelector("[data-formula-one-form-select]");

  if (select) {
    select.value = formId;
  }

  renderFormulaOneWeeklyForm(year, forms);
}

function renderManagerSummary(managerId) {
  if (!managerSummaryList) {
    return;
  }

  const source = siteData.managerResultsSource;

  if (!source && !hasManagerHubResultData()) {
    managerSummaryList.innerHTML = `<article class="workflow-item"><p class="table-message">Loading manager results...</p></article>`;
    return;
  }

  const selectedYear = getManagerSummarySelectedYear();
  const resultCards = [
    selectedYear === "all" || selectedYear === "2026" ? renderWorldCupManagerSummary(managerId, source) : "",
    selectedYear === "all" || selectedYear === "2025" ? renderFantasyCriticManagerSummary(managerId, "2025", "2025 Fantasy Critic") : "",
    selectedYear === "all" || selectedYear === "2026" ? renderFantasyCriticManagerSummary(managerId, "2026", "2026 Fantasy Critic") : "",
    selectedYear === "all" || selectedYear === "2024" ? renderFormulaOneYearlyManagerSummary(managerId, "2024") : "",
    selectedYear === "all" || selectedYear === "2025" ? renderFormulaOneYearlyManagerSummary(managerId, "2025") : "",
    selectedYear === "all" || selectedYear === "2026" ? renderFormulaOneYearlyManagerSummary(managerId, "2026") : "",
    selectedYear === "all" || selectedYear === "2025" ? renderFormulaOneWeeklyManagerSummary(managerId, "2025") : "",
    selectedYear === "all" || selectedYear === "2026" ? renderFormulaOneWeeklyManagerSummary(managerId, "2026") : "",
  ].filter(Boolean);

  if (!resultCards.length) {
    managerSummaryList.innerHTML = `<article class="workflow-item"><p class="table-message">No ${escapeHtml(selectedYear === "all" ? "" : `${selectedYear} `)}result summary found for this manager yet.</p></article>`;
    return;
  }

  managerSummaryList.innerHTML = resultCards.join("");
}

function renderManagerAwards(managerId) {
  if (!managerAwardsList) {
    return;
  }

  if (!siteData.portalDrafts) {
    managerAwardsList.innerHTML = `<article class="workflow-item"><p class="table-message">Loading awards...</p></article>`;
    return;
  }

  const awards = getResolvedAwards().filter((award) => {
    return String(award.manager?.id ?? "") === String(managerId);
  });

  if (!awards.length) {
    managerAwardsList.innerHTML = `<article class="workflow-item"><p class="table-message">No awards yet.</p></article>`;
    return;
  }

  managerAwardsList.innerHTML = awards.map((award) => renderAwardCard(award, "manager")).join("");
}

function getManagerSummarySelectedYear() {
  const value = managerSummaryYearSelect?.value || "current";

  if (value === "all") {
    return "all";
  }

  if (/^\d{4}$/.test(value)) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
  }).format(new Date());
}

function hasManagerHubResultData() {
  return Boolean(
    siteData.managerResultsSource ||
    Object.values(siteData.fantasyCritic || {}).some((state) => state.status !== "loading") ||
    siteData.formulaOne2024?.standings?.length ||
    siteData.formulaOne2025?.standings?.length ||
    siteData.formulaOne2026?.standings?.length ||
    siteData.formulaOne2025Weekly?.standings?.length ||
    siteData.formulaOne2026Weekly?.standings?.length ||
    siteData.formulaOne2026WeeklyResults?.standings?.length
  );
}

function renderStandingsAwards() {
  if (!standingsAwards || !standingsAwardsList) {
    return;
  }

  const awards = getAwardsForCurrentStandings();

  standingsAwards.hidden = awards.length === 0;

  if (!awards.length) {
    standingsAwardsList.innerHTML = "";
    return;
  }

  standingsAwardsList.innerHTML = awards.map((award) => renderAwardCard(award, "standings-summary")).join("");

  if (siteData.managerSession?.managerId) {
    renderManagerAwards(siteData.managerSession.managerId);
  }
}

function getAwardsForCurrentStandings() {
  const context = getCurrentAwardsContext();
  const awards = getResolvedAwards();

  if (!context) {
    return [];
  }

  return awards.filter((award) => {
    if (context.competition && award.competition !== context.competition) {
      return false;
    }

    if (context.year && award.year !== context.year) {
      return false;
    }

    if (context.standings?.length && !context.standings.includes(award.standings)) {
      return false;
    }

    return true;
  });
}

function getCurrentAwardsContext() {
  const activePage = document.querySelector(".page.is-active")?.dataset.page || "";

  if (activePage === "standings") {
    return {
      competition: "2026 World Cup",
      standings: getWorldCupAwardStandingsFilter(),
      year: "2026",
    };
  }

  if (activePage.startsWith("formula-1-2024")) {
    return {
      competition: "2024 Formula 1",
      standings: getFormulaOneAwardStandingsFilter("2024"),
      year: "2024",
    };
  }

  if (activePage.startsWith("formula-1-2025")) {
    return {
      competition: "2025 Formula 1",
      standings: getFormulaOneAwardStandingsFilter("2025"),
      year: "2025",
    };
  }

  if (activePage.startsWith("formula-1-2026")) {
    return {
      competition: "2026 Formula 1",
      standings: getFormulaOneAwardStandingsFilter("2026"),
      year: "2026",
    };
  }

  return null;
}

function getWorldCupAwardStandingsFilter() {
  const activeTab = document.querySelector("#standings .tabs [data-tab].is-active")?.dataset.tab || "";

  if (activeTab === "players-championship") {
    return ["players"];
  }

  if (activeTab === "nations-league") {
    return ["nations"];
  }

  if (activeTab === "manager-results") {
    const filter = getManagerResultsFilter();

    if (filter === "players") {
      return ["players"];
    }

    if (filter === "nations") {
      return ["nations"];
    }

    return ["players", "nations"];
  }

  return ["players", "nations"];
}

function getFormulaOneAwardStandingsFilter(year) {
  const mode = formulaOneResultsMode[year] ?? "yearly";

  if (mode === "weekly") {
    return ["formula-one-weekly"];
  }

  return ["formula-one-yearly"];
}

function getResolvedAwards() {
  return AWARD_DEFINITIONS
    .map((definition) => resolveAward(definition))
    .filter(Boolean);
}

function resolveAward(definition) {
  return resolveCompletedDraftAward(definition);
}

function resolveCompletedDraftAward(definition) {
  const draft = findCompletedAwardDraft(definition);

  if (!draft) {
    return null;
  }

  const manager = getAwardManagerById(getField(draft, "Winner Manager ID", "Winner Manager Id", "WinnerManagerID", "Winner_Manager_ID"));

  if (!manager) {
    return null;
  }

  return {
    ...definition,
    entityName: getField(draft, "Winner", "Winner Name", "Winning Entity", "Winning Nation") || "",
    manager,
    points: null,
  };
}

function findCompletedAwardDraft(definition) {
  return (siteData.portalDrafts || []).find((draft) => {
    if (!isTruthy(getField(draft, "IsCompleted", "Is Completed", "Completed"))) {
      return false;
    }

    if (!getField(draft, "Winner Manager ID", "Winner Manager Id", "WinnerManagerID", "Winner_Manager_ID")) {
      return false;
    }

    return isAwardDraftMatch(draft, definition);
  }) || null;
}

function isAwardDraftMatch(draft, definition) {
  const draftName = normalizeAwardMatchName(getField(draft, "Name", "Draft", "Award Name", "Award"));
  const expectedDraftName = normalizeAwardMatchName(definition.draftName || definition.label);

  if (draftName && expectedDraftName) {
    return draftName === expectedDraftName;
  }

  const candidates = [
    getField(draft, "Award ID", "AwardID", "Award Id"),
    getField(draft, "Draft ID", "DraftID", "ID"),
  ].map(normalizeLookupName).filter(Boolean);
  const awardIds = [
    definition.id,
  ].map(normalizeLookupName).filter(Boolean);

  return candidates.some((candidate) => {
    return awardIds.some((awardId) => candidate === awardId);
  });
}

function normalizeAwardMatchName(value) {
  return normalizeLookupName(value)
    .replace(/['’]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getAwardManagerById(managerId) {
  const id = String(managerId ?? "").trim();

  if (!id) {
    return null;
  }

  return getPortalManagerById(id) ??
    siteData.managerDrafts?.managersById.get(id) ??
    getManagerMeta({ ID: id, Name: `Manager ${id}` });
}

function getAwardsForNation(nationName, options = {}) {
  const nationKey = normalizeLookupName(normalizeNationName(nationName));

  return getResolvedAwards().filter((award) => {
    if (options.competition && award.competition !== options.competition) {
      return false;
    }

    if (options.year && String(award.year || "") !== String(options.year)) {
      return false;
    }

    return award.standings === "nations" &&
      normalizeLookupName(normalizeNationName(award.entityName)) === nationKey;
  });
}

function getAwardsForManager(manager, options = {}) {
  const managerId = String(manager?.id ?? manager?.ID ?? manager?.["Manager ID"] ?? "").trim();
  const managerName = normalizeLookupName(manager?.displayName || manager?.name || manager?.Name || manager?.manager);

  return getResolvedAwards().filter((award) => {
    if (options.competition && award.competition !== options.competition) {
      return false;
    }

    if (options.standings && award.standings !== options.standings) {
      return false;
    }

    if (options.year && String(award.year || "") !== String(options.year)) {
      return false;
    }

    const awardManagerId = String(award.manager?.id ?? award.manager?.ID ?? award.manager?.["Manager ID"] ?? "").trim();
    const awardManagerName = normalizeLookupName(award.manager?.displayName || award.manager?.name || award.manager?.Name);

    return (managerId && awardManagerId && managerId === awardManagerId) ||
      (managerName && awardManagerName && managerName === awardManagerName);
  });
}

function renderAwardBadges(awards = []) {
  return awards.map((award) => renderAwardBadge(award)).join("");
}

function renderAwardCard(award, context = "standings-summary") {
  const image = award.image
    ? `<img class="award-card-image" src="${escapeHtml(award.image)}" alt="">`
    : `<span class="award-card-fallback">${escapeHtml(award.abbreviation || "AW")}</span>`;
  const secondary = getAwardSecondaryText(award, context);

  return `
    <article class="award-card award-card--${escapeHtml(context)}">
      <div class="award-card-media">${image}</div>
      <div class="award-card-copy">
        <h3>${escapeHtml(award.label)}</h3>
        ${secondary ? `<p>${escapeHtml(secondary)}</p>` : ""}
      </div>
    </article>
  `;
}

function getAwardSecondaryText(award, context) {
  if (context === "manager") {
    return "";
  }

  if (award.manager?.displayName) {
    return award.manager.displayName;
  }

  return award.manager?.name || "";
}

function renderAwardBadge(award, context = "standings") {
  const label = award.label || "Award";
  const mark = award.image
    ? `<img src="${escapeHtml(award.image)}" alt="">`
    : escapeHtml(award.abbreviation || "AW");

  return `
    <button
      class="award-badge award-badge--${escapeHtml(context)}"
      type="button"
      data-award-toggle
      aria-expanded="false"
      aria-label="${escapeHtml(label)}"
    >
      <span class="award-badge-mark">${mark}</span>
      <span class="award-badge-label">${escapeHtml(label)}</span>
    </button>
  `;
}

function renderWorldCupManagerSummary(managerId, source) {
  if (!source) {
    return "";
  }

  const managerSummary = getManagerSummaryRanks(managerId, source);
  const manager = managerSummary.players || managerSummary.nations;

  if (!manager) {
    return "";
  }

  return `
    <article class="workflow-item">
      <header>
        <div>
          <h3>World Cup</h3>
          <p>Players' Championship and Nations League</p>
        </div>
        ${renderManagerChip(manager)}
      </header>
      <div class="manager-summary-ranks">
        ${renderManagerSummaryRank("Players", managerSummary.players, formatPoints, { competition: "2026 World Cup", standings: "players", year: "2026" })}
        ${renderManagerSummaryRank("Nations", managerSummary.nations, formatPoints, { competition: "2026 World Cup", standings: "nations", year: "2026" })}
      </div>
      <a class="action-button" href="#standings" data-page-link="standings">Open Standings</a>
    </article>
  `;
}

function renderFantasyCriticManagerSummary(managerId, year, label) {
  const state = getFantasyCriticLeagueState(year);

  if (state.status === "loading") {
    return `
      <article class="workflow-item">
        <header>
          <div>
            <h3>${escapeHtml(label)}</h3>
            <p>Loading Fantasy Critic results...</p>
          </div>
        </header>
      </article>
    `;
  }

  if (state.status === "error") {
    return `
      <article class="workflow-item">
        <header>
          <div>
            <h3>${escapeHtml(label)}</h3>
            <p>Unable to load Fantasy Critic results: ${escapeHtml(state.errorMessage || "Unknown error")}</p>
          </div>
        </header>
        <a class="action-button" href="#fantasy-critic-${escapeHtml(year)}" data-page-link="fantasy-critic-${escapeHtml(year)}">Open Fantasy Critic</a>
      </article>
    `;
  }

  const league = getFantasyCriticLeague(year);
  const row = findFantasyCriticManagerRow(managerId, league);

  if (!row) {
    return "";
  }

  const manager = getManagerByName(row.manager) ?? { name: row.manager };

  return `
    <article class="workflow-item">
      <header>
        <div>
          <h3>${escapeHtml(label)}</h3>
          <p>${escapeHtml(row.publisher || "Fantasy Critic")}</p>
        </div>
        ${renderManagerChip(manager)}
      </header>
      <div class="manager-summary-ranks manager-summary-ranks--single">
        ${renderManagerSummaryRank("Overall", row, formatFormulaOnePointValue, { standings: "fantasy-critic", year })}
      </div>
      <a class="action-button" href="#fantasy-critic-${escapeHtml(year)}" data-page-link="fantasy-critic-${escapeHtml(year)}">Open Fantasy Critic</a>
    </article>
  `;
}

function findFantasyCriticManagerRow(managerId, league) {
  if (!league?.standings) {
    return null;
  }

  const portalManager = getPortalManagerById(managerId);
  const managerName = portalManager?.["Display Name"] || portalManager?.Name || "";

  return league.standings.find((row) => normalizeLookupName(row.manager) === normalizeLookupName(managerName)) || null;
}

function renderFormulaOneYearlyManagerSummary(managerId, year) {
  const data = siteData[`formulaOne${year}`];
  const row = findFormulaOneManagerRow(managerId, data?.standings ?? []);

  if (!row) {
    return "";
  }

  const manager = getManagerByName(row.manager) ?? { name: row.manager };

  return `
    <article class="workflow-item">
      <header>
        <div>
          <h3>${escapeHtml(year)} Formula 1 Bets</h3>
          <p>Yearly bet results</p>
        </div>
        ${renderManagerChip(manager)}
      </header>
      <div class="manager-summary-ranks manager-summary-ranks--single">
        ${renderManagerSummaryRank("Overall", row, formatFormulaOnePointValue, { standings: "formula-one-yearly", year })}
      </div>
      <a class="action-button" href="#formula-1-${escapeHtml(year)}-results" data-page-link="formula-1-${escapeHtml(year)}-results">Open Results</a>
    </article>
  `;
}

function renderFormulaOneWeeklyManagerSummary(managerId, year) {
  const data = year === "2026"
    ? siteData.formulaOne2026WeeklyResults ?? siteData.formulaOne2026Weekly
    : siteData.formulaOne2025Weekly;
  const row = findFormulaOneManagerRow(managerId, data?.standings ?? []);

  if (!row) {
    return "";
  }

  const manager = getManagerByName(row.manager) ?? { name: row.manager };

  return `
    <article class="workflow-item">
      <header>
        <div>
          <h3>${escapeHtml(year)} Formula 1 Weekly</h3>
          <p>Weekly bet results</p>
        </div>
        ${renderManagerChip(manager)}
      </header>
      <div class="manager-summary-ranks manager-summary-ranks--single">
        ${renderManagerSummaryRank("Overall", row, formatFormulaOnePointValue, { standings: "formula-one-weekly", year })}
      </div>
      <a class="action-button" href="#formula-1-${escapeHtml(year)}-weekly" data-page-link="formula-1-${escapeHtml(year)}-weekly">Open Weekly</a>
    </article>
  `;
}

function findFormulaOneManagerRow(managerId, standings) {
  const portalManager = getPortalManagerById(managerId);
  const managerName = portalManager?.["Display Name"] || portalManager?.Name || "";

  return standings.find((row) => normalizeLookupName(row.manager) === normalizeLookupName(managerName)) || null;
}

function getManagerSummaryRanks(managerId, source) {
  const portalManager = getPortalManagerById(managerId);
  const managerName = portalManager?.["Display Name"] || portalManager?.Name || "";
  const findManager = (rows) => rows.find((row) => String(row.id) === String(managerId)) ??
    rows.find((row) => normalizeLookupName(row.displayName || row.name) === normalizeLookupName(managerName));

  return {
    nations: findManager(getManagerResultRows({ ...source, filter: "nations" })),
    overall: findManager(getManagerResultRows({ ...source, filter: "all" })),
    players: findManager(getManagerResultRows({ ...source, filter: "players" })),
  };
}

function renderManagerSummaryRank(label, row, pointFormatter = formatPoints, options = {}) {
  if (!row) {
    return "";
  }

  const points = pointFormatter(row.points);
  const awards = row.rank === 1 && options.standings
    ? getAwardsForManager(row, { competition: options.competition, standings: options.standings, year: options.year })
    : [];

  return `
    <span class="manager-summary-rank">
      <small>${escapeHtml(label)}</small>
      <span class="manager-summary-rank-line">
        <strong>#${escapeHtml(row.rank)}</strong>
        ${renderAwardBadges(awards)}
      </span>
      <em>${escapeHtml(points)} pts</em>
    </span>
  `;
}

function getPortalManagers() {
  return (siteData.portalManagers || [])
    .filter((manager) => !manager.IsActive || isTruthy(manager.IsActive))
    .map((manager) => ({
      ...manager,
      id: manager["Manager ID"] || manager.ID,
      name: manager.Name,
      displayName: manager["Display Name"] || getManagerDisplayName(manager.Name),
      color: manager.Color ? `#${String(manager.Color).replace(/^#/, "")}` : undefined,
    }));
}

function getPortalManagerById(managerId) {
  return getPortalManagers().find((manager) => String(manager.id) === String(managerId)) || null;
}

function hasManagerCompletedDraft(logs, managerId, draftId) {
  const completedStatuses = new Set(["complete", "completed", "done", "submitted"]);

  return logs.some((log) => {
    return String(log["Manager ID"]) === String(managerId) &&
      String(log["Draft ID"]) === String(draftId) &&
      completedStatuses.has(normalizeLookupName(log.Status));
  });
}

function compareWorkflowItems(first, second) {
  const firstPriority = first.priority ?? first.Priority ?? "999";
  const secondPriority = second.priority ?? second.Priority ?? "999";
  const priorityCompare = compareNumericLike(firstPriority, secondPriority);

  if (priorityCompare !== 0) {
    return priorityCompare;
  }

  const firstDue = parseWorkflowSortDate(first.dueDate || first["Due Date"]);
  const secondDue = parseWorkflowSortDate(second.dueDate || second["Due Date"]);

  if (firstDue !== secondDue) {
    return firstDue - secondDue;
  }

  return String(first.title || first.Name || "").localeCompare(String(second.title || second.Name || ""));
}

function parseWorkflowSortDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.getTime();
  }

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
}

function isTruthy(value) {
  return ["true", "yes", "y", "1"].includes(normalizeLookupName(value));
}

function renderFilteredStandings() {
  if (siteData.playerPerformances) {
    renderPlayerChampionship(siteData.playerPerformances);
  }

  if (siteData.matchResults) {
    renderNationsLeague(siteData.matchResults);
  }

  if (siteData.managerResultsSource) {
    renderManagerResults(siteData.managerResultsSource);
  }

  renderStandingsAwards();
}

function syncTestScoringUi() {
  const isTestMode = shouldUseNationTestScoring();

  testRulesLinks.forEach((link) => {
    link.hidden = !isTestMode;
  });

  document.body.classList.toggle("is-test-scoring", isTestMode);

  if (!isTestMode && window.location.hash.replace("#", "") === "rules") {
    showPage("standings", { scrollToTop: true });
  }

  renderRulesNationOptions();
  renderRulesNationBreakdown();
}

function renderRulesNationOptions() {
  if (!rulesNationSelect) {
    return;
  }

  const selected = rulesNationSelect.value;
  const nationsByKey = new Map();

  (siteData.teams || []).forEach((team) => {
    const nation = normalizeNationName(team.Team || team.Nation || team.Name);

    if (nation) {
      nationsByKey.set(normalizeLookupName(nation), nation);
    }
  });

  (siteData.matchResults || []).forEach((result) => {
    [result.Team, result.Opponent].forEach((team) => {
      const nation = normalizeNationName(team);

      if (nation) {
        nationsByKey.set(normalizeLookupName(nation), nation);
      }
    });
  });

  const nations = [...nationsByKey.values()].sort((a, b) => a.localeCompare(b));
  const selectedStillExists = selected && nations.some((nation) => normalizeLookupName(nation) === normalizeLookupName(selected));

  rulesNationSelect.innerHTML = [
    `<option value="">${nations.length ? "Select a nation" : "No nations loaded"}</option>`,
    ...nations.map((nation) => `<option value="${escapeHtml(nation)}"${selectedStillExists && normalizeLookupName(nation) === normalizeLookupName(selected) ? " selected" : ""}>${escapeHtml(nation)}</option>`),
  ].join("");
}

function renderRulesNationBreakdown() {
  if (!rulesNationBreakdown) {
    return;
  }

  if (!shouldUseNationTestScoring()) {
    rulesNationBreakdown.innerHTML = `<p class="table-message">Turn on Test in the footer to inspect the proposed nation scoring.</p>`;
    return;
  }

  const nation = rulesNationSelect?.value || "";

  if (!nation) {
    rulesNationBreakdown.innerHTML = `<p class="table-message">Select a nation to see the point breakdown.</p>`;
    return;
  }

  const rows = getRulesNationBreakdownRows(nation);
  const total = rows.reduce((sum, row) => sum + row.total, 0);

  if (!rows.length) {
    rulesNationBreakdown.innerHTML = `
      <div class="rules-breakdown-summary">
        <strong>${escapeHtml(nation)}</strong>
        <span>0 pts</span>
      </div>
      <p class="table-message">No logged nation results were found for this nation.</p>
    `;
    return;
  }

  rulesNationBreakdown.innerHTML = `
    <div class="rules-breakdown-summary">
      <strong>${escapeHtml(nation)}</strong>
      <span>${formatPoints(total)} pts</span>
    </div>
    <div class="rules-breakdown-list">
      ${rows.map(renderRulesNationBreakdownRow).join("")}
    </div>
  `;
}

function getFantasyCriticLeagueState(year) {
  return siteData.fantasyCritic?.[String(year)] || {
    metadata: FANTASY_CRITIC_LEAGUE_METADATA[year],
    status: "loading",
  };
}

function getFantasyCriticLeague(year) {
  return getFantasyCriticLeagueState(year).league || null;
}

async function loadFantasyCriticLeague(year) {
  const yearKey = String(year);

  siteData.fantasyCritic = {
    ...(siteData.fantasyCritic || {}),
    [yearKey]: {
      metadata: FANTASY_CRITIC_LEAGUE_METADATA[yearKey],
      status: "loading",
    },
  };
  renderFantasyCriticPage();
  renderManagerHub();

  try {
    const json = await loadFantasyCriticJsonp(yearKey);
    const league = parseFantasyCriticApiLeague(json, yearKey);

    siteData.fantasyCritic = {
      ...(siteData.fantasyCritic || {}),
      [yearKey]: {
        league,
        metadata: FANTASY_CRITIC_LEAGUE_METADATA[yearKey],
        status: "loaded",
      },
    };

    renderFantasyCriticPage();
    renderManagerHub();
    console.info(`Box This Lap Fantasy Critic ${yearKey} data loaded`, league);
  } catch (error) {
    siteData.fantasyCritic = {
      ...(siteData.fantasyCritic || {}),
      [yearKey]: {
        error,
        errorMessage: error.message,
        metadata: FANTASY_CRITIC_LEAGUE_METADATA[yearKey],
        status: "error",
      },
    };

    renderFantasyCriticPage();
    renderManagerHub();
    console.error(`Box This Lap Fantasy Critic ${yearKey} data failed to load`, error);
  }
}

function loadFantasyCriticJsonp(year) {
  return new Promise((resolve, reject) => {
    if (!FANTASY_CRITIC_PROXY_URL) {
      reject(new Error("Fantasy Critic proxy endpoint is not configured."));
      return;
    }

    const callbackName = `boxThisLapFantasyCritic${year}${Date.now()}${Math.random().toString(36).slice(2)}`;
    const script = document.createElement("script");
    const cleanup = () => {
      delete window[callbackName];
      script.remove();
    };
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("Fantasy Critic proxy did not respond."));
    }, 20000);

    window[callbackName] = (payload) => {
      window.clearTimeout(timeout);
      cleanup();

      if (payload?.ok === false) {
        reject(new Error(payload?.error || "Fantasy Critic proxy returned an error."));
        return;
      }

      try {
        resolve(normalizeFantasyCriticProxyPayload(payload));
      } catch (error) {
        reject(error);
      }
    };

    script.onerror = () => {
      window.clearTimeout(timeout);
      cleanup();
      reject(new Error("Unable to load Fantasy Critic proxy. Confirm the Apps Script Web App is deployed with access set to Anyone and that it is using the JSONP proxy code."));
    };

    const params = new URLSearchParams({
      callback: callbackName,
      leagueID: FANTASY_CRITIC_LEAGUE_ID,
      nonce: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      year: String(year),
    });
    script.async = true;
    script.src = `${FANTASY_CRITIC_PROXY_URL}?${params.toString()}`;
    document.body.appendChild(script);
  });
}

function normalizeFantasyCriticProxyPayload(payload) {
  if (!payload) {
    throw new Error("Fantasy Critic proxy returned no payload.");
  }

  if (typeof payload === "string") {
    try {
      return JSON.parse(payload);
    } catch (error) {
      throw new Error("Fantasy Critic proxy returned text that was not JSON.");
    }
  }

  const candidate = payload.data || payload.payload || payload.result || payload;

  if (typeof candidate === "string") {
    try {
      return JSON.parse(candidate);
    } catch (error) {
      throw new Error("Fantasy Critic proxy data was text that was not JSON.");
    }
  }

  if (!candidate || typeof candidate !== "object") {
    throw new Error("Fantasy Critic proxy returned data in an unexpected format.");
  }

  return candidate;
}

function getFantasyCriticJsonKeys(json) {
  return Object.keys(json || {}).slice(0, 8).join(", ") || "none";
}

function getFantasyCriticPublishers(json) {
  if (Array.isArray(json.publishers)) {
    return json.publishers;
  }

  if (Array.isArray(json.leagueYear?.publishers)) {
    return json.leagueYear.publishers;
  }

  if (Array.isArray(json.data?.publishers)) {
    return json.data.publishers;
  }

  return [];
}

function getFantasyCriticPlayers(json) {
  if (Array.isArray(json.players)) {
    return json.players;
  }

  if (Array.isArray(json.leagueYear?.players)) {
    return json.leagueYear.players;
  }

  if (Array.isArray(json.data?.players)) {
    return json.data.players;
  }

  return [];
}

function getFantasyCriticSettings(json) {
  return json.settings || json.leagueYear?.settings || json.data?.settings || {};
}

function parseFantasyCriticApiLeague(json, year) {
  const metadata = FANTASY_CRITIC_LEAGUE_METADATA[year] || {};
  const publisherRows = getFantasyCriticPublishers(json);
  const leaguePlayers = getFantasyCriticPlayers(json);
  const playerRowsByPublisherId = new Map(
    leaguePlayers
      .filter((player) => player?.publisher?.publisherID)
      .map((player) => [player.publisher.publisherID, player])
  );
  const settings = getFantasyCriticSettings(json);
  const standardSlots = Number(settings.standardGames) || 0;
  const counterSlots = Number(settings.counterPicks) || 0;

  if (!publisherRows.length) {
    throw new Error(`Fantasy Critic API did not return publishers. Top-level keys: ${getFantasyCriticJsonKeys(json)}.`);
  }

  const standings = publisherRows
    .map((publisher) => parseFantasyCriticPublisher(publisher, playerRowsByPublisherId.get(publisher.publisherID), {
      counterSlots,
      standardSlots,
    }))
    .sort((firstEntry, secondEntry) => {
      if (secondEntry.pointsValue !== firstEntry.pointsValue) {
        return secondEntry.pointsValue - firstEntry.pointsValue;
      }

      return firstEntry.publisher.localeCompare(secondEntry.publisher);
    });

  return {
    isDynamic: true,
    sourceUrl: metadata.sourceUrl,
    standings: rankRows(standings).map(({ pointsValue, ...entry }) => entry),
    subtitle: metadata.subtitle || json.league?.leagueName || "Fantasy Critic",
    title: metadata.title || "Fantasy Critic",
    year,
  };
}

function parseFantasyCriticPublisher(publisher, playerRow, slotCounts) {
  const publisherName = publisher.publisherName || playerRow?.publisher?.publisherName || "Unknown Publisher";
  const games = Array.isArray(publisher.games) ? publisher.games.filter((game) => !game.removedTimestamp) : [];
  const standardGames = games.filter((game) => !game.counterPick);
  const counterPicks = games.filter((game) => game.counterPick);
  const blankDrafts = [
    ...buildFantasyCriticOpenSlots("Draft", slotCounts.standardSlots - standardGames.length, false),
    ...buildFantasyCriticOpenSlots("Counterpick", slotCounts.counterSlots - counterPicks.length, true),
  ];
  const roster = [
    ...standardGames,
    ...counterPicks,
  ]
    .sort((firstGame, secondGame) => {
      const firstSlot = Number(firstGame.slotNumber ?? firstGame.overallDraftPosition ?? 999);
      const secondSlot = Number(secondGame.slotNumber ?? secondGame.overallDraftPosition ?? 999);

      return firstSlot - secondSlot;
    })
    .map((game) => parseFantasyCriticGame(game));
  const pointsValue = Number(playerRow?.totalFantasyPoints ?? publisher.totalFantasyPoints ?? 0);

  return {
    blankDrafts,
    budget: formatFantasyCriticBudget(publisher.budget ?? playerRow?.publisher?.budget),
    expecting: formatFantasyCriticInteger(publisher.gamesWillRelease ?? playerRow?.publisher?.gamesWillRelease),
    manager: getFantasyCriticManagerName(publisherName, publisher.playerName || playerRow?.user?.displayName),
    points: formatFantasyCriticNumber(pointsValue),
    pointsValue,
    projected: formatFantasyCriticNumber(playerRow?.projectedFantasyPoints ?? publisher.totalProjectedPoints),
    publisher: publisherName,
    released: formatFantasyCriticInteger(publisher.gamesReleased ?? playerRow?.publisher?.gamesReleased),
    roster: [
      ...roster,
      ...blankDrafts.map((slot) => [slot.label, "", "", slot]),
    ],
  };
}

function parseFantasyCriticGame(game) {
  const prefix = game.counterPick ? "CPK " : "";

  return [
    `${prefix}${game.gameName || "Untitled Game"}`,
    formatFantasyCriticNumber(game.criticScore ?? game.masterGame?.criticScore),
    formatFantasyCriticNumber(game.fantasyPoints ?? game.masterGame?.fantasyPoints),
  ];
}

function buildFantasyCriticOpenSlots(label, count, isCounterPick) {
  return Array.from({ length: Math.max(0, count) }, (_, index) => ({
    isBlank: true,
    isCounterPick,
    label: `${label} Slot ${index + 1}`,
  }));
}

function getFantasyCriticManagerName(publisherName, playerName = "") {
  return FANTASY_CRITIC_PUBLISHER_MANAGERS[normalizeLookupName(publisherName)] ||
    FANTASY_CRITIC_PUBLISHER_MANAGERS[normalizeLookupName(playerName)] ||
    playerName ||
    publisherName;
}

function formatFantasyCriticBudget(value) {
  const number = Number(value);

  return Number.isFinite(number) ? `$${formatFantasyCriticNumber(number)}` : "--";
}

function formatFantasyCriticInteger(value) {
  const number = Number(value);

  return Number.isFinite(number) ? String(Math.round(number)) : "--";
}

function formatFantasyCriticNumber(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "";
  }

  return number.toLocaleString("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  });
}

function getRulesNationBreakdownRows(nationName) {
  return (siteData.matchResults || [])
    .filter(isLoggedNationResult)
    .map((result) => getTestNationPointBreakdown(result, nationName))
    .filter(Boolean)
    .sort((a, b) => {
      const roundCompare = compareNumericLike(a.roundId, b.roundId);

      if (roundCompare !== 0) {
        return roundCompare;
      }

      return compareNumericLike(a.matchId, b.matchId);
    });
}

function compareNumericLike(firstValue, secondValue) {
  const firstNumber = Number(firstValue);
  const secondNumber = Number(secondValue);

  if (Number.isFinite(firstNumber) && Number.isFinite(secondNumber)) {
    return firstNumber - secondNumber;
  }

  return String(firstValue ?? "").localeCompare(String(secondValue ?? ""), undefined, { numeric: true });
}

function renderRulesNationBreakdownRow(row) {
  const roundLabel = row.roundLabel ? `<span>${escapeHtml(row.roundLabel)}</span>` : "";
  const partsHtml = row.parts.length
    ? row.parts.map((part) => `
        <div class="rules-breakdown-part">
          <span>${escapeHtml(part.label)}${part.detail ? ` <small>${escapeHtml(part.detail)}</small>` : ""}</span>
          <strong>${formatPoints(part.points)}</strong>
        </div>
      `).join("")
    : `<p class="rules-breakdown-empty">No points earned.</p>`;

  return `
    <article class="rules-breakdown-row">
      <header>
        <div>
          <strong>${escapeHtml(row.matchLabel)}</strong>
          <span>${escapeHtml(row.resultLabel)}</span>
        </div>
        <div class="rules-breakdown-meta">
          ${roundLabel}
          ${row.matchId ? `<span>M${escapeHtml(row.matchId)}</span>` : ""}
        </div>
      </header>
      <div class="rules-breakdown-pots">
        <span>${escapeHtml(row.team)}: Pot ${escapeHtml(row.teamPot || "?")}</span>
        <span>${escapeHtml(row.opponent)}: Pot ${escapeHtml(row.opponentPot || "?")}</span>
      </div>
      <div class="rules-breakdown-parts">
        ${partsHtml}
      </div>
      <div class="rules-breakdown-total">
        <span>Match Total</span>
        <strong>${formatPoints(row.total)} pts</strong>
      </div>
    </article>
  `;
}

window.addEventListener("hashchange", () => {
  showPage(window.location.hash.replace("#", "") || "footy", { scrollToTop: true });
});

window.addEventListener("popstate", () => {
  showPage(window.location.hash.replace("#", "") || "footy", { scrollToTop: true });
});

syncTestScoringUi();
showPage(window.location.hash.replace("#", "") || "footy");
renderLeagueList(leagueYearSelect?.value || "2026");
renderFantasyCriticPage();
loadFantasyCriticLeague("2025");
loadFantasyCriticLeague("2026");
syncThemeToggle();
hydrateBracketSubmitter();
hydrateManagerSession();

loadJson("data/footy-schedule.json")
  .then((schedule) => {
    siteData.footySchedule = schedule;
    renderFootySchedule(schedule);
    console.info("Box This Lap footy schedule loaded", schedule);
  })
  .catch((error) => {
    renderFootyScheduleError(error);
    console.error("Box This Lap footy schedule failed to load", error);
  });

Promise.allSettled([
  loadSheet("portalManagers"),
  loadSheet("portalDrafts"),
  loadSheet("portalLogs"),
])
  .then(([managersResult, draftsResult, logsResult]) => {
    siteData.portalManagers = managersResult.status === "fulfilled"
      ? managersResult.value
      : [...DEFAULT_PORTAL_MANAGERS];
    siteData.portalDrafts = draftsResult.status === "fulfilled" ? draftsResult.value : [];
    siteData.portalLogs = logsResult.status === "fulfilled" ? logsResult.value : [];
    renderLoginManagerOptions();
    renderLoginState();
    renderManagerHub();
    renderStandingsAwards();
    renderFantasyCriticViews();
    if (siteData.fantasyOffice2025?.results?.length) {
      renderFantasyOfficeResults(2025, siteData.fantasyOffice2025.results);
    }
    if (siteData.fantasyOffice2026?.results?.length) {
      renderFantasyOfficeResults(2026, siteData.fantasyOffice2026.results);
    }
    renderFormulaOneResults("2024");
    renderFormulaOneResults("2025");
    renderFormulaOneResults("2026");

    if (managersResult.status !== "fulfilled" || draftsResult.status !== "fulfilled" || logsResult.status !== "fulfilled") {
      console.warn("Box This Lap manager portal optional data partially failed", {
        managers: managersResult.status === "rejected" ? managersResult.reason : null,
        drafts: draftsResult.status === "rejected" ? draftsResult.reason : null,
        logs: logsResult.status === "rejected" ? logsResult.reason : null,
      });
    }

    console.info("Box This Lap manager portal data loaded", {
      drafts: siteData.portalDrafts,
      logs: siteData.portalLogs,
      managers: siteData.portalManagers,
    });
  })
  .catch((error) => {
    if (loginManagerSelect) {
      loginManagerSelect.innerHTML = `<option value="">Unable to load managers</option>`;
    }

    if (workflowList) {
      workflowList.innerHTML = `<article class="workflow-item"><p class="table-message">Unable to load notifications: ${escapeHtml(error.message)}</p></article>`;
    }

    console.error("Box This Lap manager portal data failed to load", error);
  });

loadPlayers()
  .then((players) => {
    siteData.players = players;
    siteData.playerPositionLookups = buildPlayerPositionLookups(players);
    renderTestingPlayers(players);
    renderDraftPlayers();

    if (siteData.playerPerformances) {
      renderPlayerChampionship(siteData.playerPerformances);
    }

    if (siteData.matches) {
      renderCurrentMatchLists();
    }

    console.info("Box This Lap player data loaded", players);
  })
  .catch((error) => {
    renderTestingError(error);
    console.error("Box This Lap player data failed to load", error);
  });

loadSheet("playerPerformances")
  .then((performances) => {
    siteData.playerPerformances = performances;
    renderPlayerChampionship(performances);
    renderDraftPlayers();
    renderCurrentMatchLists();
    console.info("Box This Lap player performance data loaded", performances);
  })
  .catch((error) => {
    renderPlayerChampionshipError(error);
    console.error("Box This Lap player performance data failed to load", error);
  });

loadSheet("matchResults")
  .then((results) => {
    siteData.matchResults = results;
    renderNationsLeague(results);
    renderDraftNations();
    renderCurrentMatchLists();
    renderBracket(siteData.bracketMatches);
    renderRulesNationOptions();
    renderRulesNationBreakdown();
    console.info("Box This Lap match result data loaded", results);
  })
  .catch((error) => {
    renderNationsLeagueError(error);
    console.error("Box This Lap match result data failed to load", error);
  });

loadSheet("teams")
  .then((teams) => {
    siteData.teams = teams;
    siteData.teamPots = buildTeamPotLookup(teams);
    renderDraftPage();
    renderFilteredStandings();
    renderCurrentMatchLists();
    renderRulesNationOptions();
    renderRulesNationBreakdown();
    console.info("Box This Lap team data loaded", teams);
  })
  .catch((error) => {
    console.error("Box This Lap team data failed to load", error);
  });

loadSheetText("data")
  .then((csvText) => {
    siteData.rounds = parseRoundOptions(csvText);
    siteData.updatedTime = parseUpdatedTime(csvText);
    siteData.roundMappings = parseRoundMappings(csvText);
    siteData.resultImages = parseResultImages(csvText);
    siteData.bracketMatches = parseScheduleMatches(csvText);
    siteData.matches = siteData.bracketMatches;
    renderUpdatedTime(siteData.updatedTime);
    renderStandingsRoundOptions(siteData.rounds);
    renderResultImages(siteData.resultImages);
    renderMatchdayPicker(siteData.matches);
    renderBracket(siteData.bracketMatches);
    renderCurrentMatchLists();
    renderFilteredStandings();
    console.info("Box This Lap data sheet loaded", {
      bracketMatches: siteData.bracketMatches,
      matches: siteData.matches,
      resultImages: siteData.resultImages,
      roundMappings: siteData.roundMappings,
      rounds: siteData.rounds,
      updatedTime: siteData.updatedTime,
    });
  })
  .catch((error) => {
    siteData.matchesError = error;
    renderMatchError(todayMatchList, error);
    renderMatchError(tomorrowMatchList, error);
    renderMatchError(matchdayMatchList, error);
    renderBracketError(error);
    console.error("Box This Lap data sheet failed to load", error);
  });

loadSheet("bracketPicks")
  .then((rows) => {
    siteData.bracketSubmissions = parseBracketSubmissions(rows);
    renderBracketSubmissionOptions(siteData.bracketSubmissions);
    renderBracket(siteData.bracketMatches);
    console.info("Box This Lap bracket submissions loaded", siteData.bracketSubmissions);
  })
  .catch((error) => {
    siteData.bracketSubmissionsError = error;
    renderBracketSubmissionOptions([]);
    console.error("Box This Lap bracket submissions failed to load", error);
  });

Promise.all([
  loadSheet("managers"),
  loadSheet("teamDraft"),
  loadSheet("playerDraft"),
  loadSheet("playerPerformances"),
  loadSheet("matchResults"),
])
  .then(([managers, teamDraft, playerDraft, playerPerformances, matchResults]) => {
    siteData.managers = managers;
    siteData.teamDraft = teamDraft;
    siteData.playerDraft = playerDraft;
    siteData.managerResultsSource = { managers, teamDraft, playerDraft, playerPerformances, matchResults };
    siteData.managerDrafts = buildManagerDraftLookups({ managers, teamDraft, playerDraft });
    renderDraftPage();

    if (siteData.playerPerformances) {
      renderPlayerChampionship(siteData.playerPerformances);
    }

    if (siteData.matchResults) {
      renderNationsLeague(siteData.matchResults);
    }

    renderCurrentMatchLists();
    renderManagerResults(siteData.managerResultsSource);
    renderManagerHub();
    console.info("Box This Lap manager result data loaded", { managers, teamDraft, playerDraft });
  })
  .catch((error) => {
    renderManagerResultsError(error);
    console.error("Box This Lap manager result data failed to load", error);
  });

loadSheetText("formulaOne2024")
  .then((csvText) => {
    const data = parseFormulaOneSheet(csvText);
    siteData.formulaOne2024 = data;
    renderFormulaOneLeague("2024", data);
    renderStandingsAwards();
    renderManagerHub();
    console.info("Box This Lap Formula 1 2024 data loaded", data);
  })
  .catch((error) => {
    renderFormulaOneError("2024", error);
    console.error("Box This Lap Formula 1 2024 data failed to load", error);
  });

loadSheetText("formulaOne2025")
  .then((csvText) => {
    const data = parseFormulaOneSheet(csvText);
    siteData.formulaOne2025 = data;
    renderFormulaOneLeague("2025", data);
    renderStandingsAwards();
    renderManagerHub();
    console.info("Box This Lap Formula 1 2025 data loaded", data);
  })
  .catch((error) => {
    renderFormulaOneError("2025", error);
    console.error("Box This Lap Formula 1 2025 data failed to load", error);
  });

loadSheetText("formulaOne2025Weekly")
  .then((csvText) => {
    const data = parseFormulaOneWeeklySheet(csvText);
    siteData.formulaOne2025Weekly = data;
    renderFormulaOneWeeklyPage("2025", data);
    renderFormulaOneResults("2025");
    renderStandingsAwards();
    renderManagerHub();
    console.info("Box This Lap Formula 1 2025 weekly data loaded", data);
  })
  .catch((error) => {
    renderFormulaOneWeeklyError("2025", error);
    console.error("Box This Lap Formula 1 2025 weekly data failed to load", error);
  });

loadSheetText("formulaOne2026")
  .then((csvText) => {
    const data = parseFormulaOneSheet(csvText);
    siteData.formulaOne2026 = data;
    renderFormulaOneLeague("2026", data);
    renderStandingsAwards();
    renderManagerHub();
    console.info("Box This Lap Formula 1 2026 data loaded", data);
  })
  .catch((error) => {
    renderFormulaOneError("2026", error);
    console.error("Box This Lap Formula 1 2026 data failed to load", error);
  });

loadSheetText("formulaOne2026Weekly")
  .then((csvText) => {
    const data = parseFormulaOneWeeklySheet(csvText);
    siteData.formulaOne2026Weekly = data;
    renderFormulaOneWeeklyPage("2026", data);
    renderManagerHub();
    console.info("Box This Lap Formula 1 2026 weekly data loaded", data);
  })
  .catch((error) => {
    renderFormulaOneWeeklyError("2026", error);
    console.error("Box This Lap Formula 1 2026 weekly data failed to load", error);
  });

loadSheetText("formulaOne2026WeeklyResults")
  .then((csvText) => {
    const data = parseFormulaOneWeeklyResultsSheet(csvText);
    siteData.formulaOne2026WeeklyResults = data;
    renderFormulaOneResults("2026");
    renderStandingsAwards();
    renderManagerHub();
    console.info("Box This Lap Formula 1 2026 weekly results loaded", data);
  })
  .catch((error) => {
    console.error("Box This Lap Formula 1 2026 weekly results failed to load", error);
  });

loadSheet("formulaOne2026RoundForms")
  .then((rows) => {
    const forms = parseFormulaOneRoundForms(rows);
    siteData.formulaOne2026RoundForms = forms;
    renderFormulaOneWeeklyForm("2026", forms);
    renderManagerHub();
    console.info("Box This Lap Formula 1 2026 round forms loaded", forms);
  })
  .catch((error) => {
    if (formulaOneViews[2026]?.weeklyForm) {
      formulaOneViews[2026].weeklyForm.innerHTML = `<p class="table-message">Unable to load Formula 1 bet forms: ${escapeHtml(error.message)}</p>`;
    }

    console.error("Box This Lap Formula 1 2026 round forms failed to load", error);
  });

siteData.fantasyOffice2025 = { draft: [], movies: [], ordering: [], results: [] };
siteData.fantasyOffice2026 = { draft: [], movies: [], ordering: [], results: [] };

loadSheetText("fantasyOffice2025Draft")
  .then((draftCsv) => {
    siteData.fantasyOffice2025.draft = parseFantasyOfficeDraft(draftCsv);
    renderFantasyOfficeDraft(2025, siteData.fantasyOffice2025.draft);
    console.info("Box This Lap Fantasy Office 2025 draft data loaded", siteData.fantasyOffice2025.draft);
  })
  .catch((error) => {
    renderFantasyOfficeDraftError(2025, error);
    console.error("Box This Lap Fantasy Office 2025 draft data failed to load", error);
  });

loadSheetText("fantasyOffice2025Results")
  .then((resultsCsv) => {
    siteData.fantasyOffice2025.results = parseFantasyOfficeResults(resultsCsv);
    renderFantasyOfficeMovies(2025, siteData.fantasyOffice2025.results);
    renderFantasyOfficeResults(2025, siteData.fantasyOffice2025.results);
    console.info("Box This Lap Fantasy Office 2025 results data loaded", siteData.fantasyOffice2025.results);
  })
  .catch((error) => {
    renderFantasyOfficeMovieError(2025, error);
    renderFantasyOfficeResultsError(2025, error);
    console.error("Box This Lap Fantasy Office 2025 results data failed to load", error);
  });

loadSheetText("fantasyOffice2025Movies")
  .then((moviesCsv) => {
    siteData.fantasyOffice2025.movies = parseFantasyOfficeMovies(moviesCsv);
    console.info("Box This Lap Fantasy Office 2025 movie data loaded", siteData.fantasyOffice2025.movies);
  })
  .catch((error) => {
    console.warn("Box This Lap Fantasy Office 2025 movie detail data failed to load", error);
  });

loadSheetText("fantasyOffice2025Ordering")
  .then((orderingCsv) => {
    siteData.fantasyOffice2025.ordering = parseCsvMatrix(orderingCsv);
    console.info("Box This Lap Fantasy Office 2025 ordering data loaded", siteData.fantasyOffice2025.ordering);
  })
  .catch((error) => {
    console.warn("Box This Lap Fantasy Office 2025 ordering data failed to load", error);
  });

loadSheetText("fantasyOffice2026Draft")
  .then((draftCsv) => {
    siteData.fantasyOffice2026.draft = parseFantasyOfficeDraft(draftCsv);
    renderFantasyOfficeDraft(2026, siteData.fantasyOffice2026.draft);
    renderFantasyOfficeMovies(2026, siteData.fantasyOffice2026.results);
    renderFantasyOfficeResults(2026, siteData.fantasyOffice2026.results);
    console.info("Box This Lap Fantasy Office 2026 draft data loaded", siteData.fantasyOffice2026.draft);
  })
  .catch((error) => {
    renderFantasyOfficeDraftError(2026, error);
    console.error("Box This Lap Fantasy Office 2026 draft data failed to load", error);
  });

function renderMatchdayPicker(matches) {
  if (!matchdaySelect || !matchdayMatchList) {
    return;
  }

  const matchdays = [...new Set(matches.map(getMatchDate).filter(Boolean))].sort();

  if (matchdays.length === 0) {
    matchdaySelect.innerHTML = `<option>No matchdays found</option>`;
    renderMatchesForDate(matchdayMatchList, matches, "");
    return;
  }

  matchdaySelect.innerHTML = matchdays.map((dateKey) => {
    return `<option value="${escapeHtml(dateKey)}">${escapeHtml(formatMatchdayLabel(dateKey))}</option>`;
  }).join("");

  const initialDate = matchdays.includes(getDateKey(0)) ? getDateKey(0) : matchdays[0];
  matchdaySelect.value = initialDate;
  renderMatchesForDate(matchdayMatchList, matches, initialDate);

  matchdaySelect.addEventListener("change", () => {
    renderMatchesForDate(matchdayMatchList, matches, matchdaySelect.value);
  });
}

function renderCurrentMatchLists() {
  if (!siteData.matches) {
    return;
  }

  renderMatchesForDate(todayMatchList, siteData.matches, getDateKey(0));
  renderMatchesForDate(tomorrowMatchList, siteData.matches, getDateKey(1));
  renderMatchesForDate(matchdayMatchList, siteData.matches, matchdaySelect?.value || "");
}

function renderMatchesForDate(container, matches, dateKey) {
  if (!container) {
    return;
  }

  const filteredMatches = matches
    .filter((match) => getMatchDate(match) === dateKey)
    .sort(compareMatchesByDisplayTime);

  if (filteredMatches.length === 0) {
    const title = dateKey ? "No matches found" : "No match data loaded";
    const label = dateKey || "No data";

    container.innerHTML = `
      <article class="match-card">
        <div class="match-header">
          <h2>${escapeHtml(title)}</h2>
          <p>${escapeHtml(label)}</p>
        </div>
      </article>
    `;
    return;
  }

  container.innerHTML = filteredMatches.map(renderMatchCard).join("");
}

function renderDraftPage() {
  renderDraftNations();
  renderDraftPlayers();
}

function renderDraftNations() {
  if (!draftNationsList) {
    return;
  }

  if (!siteData.teams || !siteData.teamDraft) {
    draftNationsList.innerHTML = renderDraftMessage("Loading draft nations...");
    return;
  }

  const draftedNationKeys = getDraftedNationKeys();
  const nationPoints = getNationPointsMap();
  const nations = siteData.teams
    .map((team) => ({
      isUnknown: isUnknownEliminationValue(team.Eliminated),
      name: normalizeNationName(team.Team || team.Nation || team.Name),
      points: nationPoints.get(normalizeLookupName(normalizeNationName(team.Team || team.Nation || team.Name))) ?? 0,
      pot: team.Pot,
    }))
    .filter((team) => {
      const nationKey = normalizeLookupName(team.name);
      return Boolean(team.name) &&
        !draftedNationKeys.has(nationKey) &&
        !isEliminatedNation(team.name);
    })
    .sort(compareDraftRows);

  if (nations.length === 0) {
    draftNationsList.innerHTML = renderDraftMessage("No available nations found.");
    return;
  }

  draftNationsList.innerHTML = `
    ${nations.map((nation) => {
    return `
      <article class="draft-card">
        <div>
          <h2>${renderDraftName(nation.name, nation.isUnknown)}</h2>
          <p>${escapeHtml(formatDraftMeta([nation.pot ? `Pot ${nation.pot}` : ""]))}</p>
        </div>
        <strong>${escapeHtml(formatPoints(nation.points))}</strong>
      </article>
    `;
  }).join("")}
    ${renderDraftUnknownNote(nations)}
  `;
}

function renderDraftPlayers() {
  if (!draftPlayersList) {
    return;
  }

  if (!siteData.players || !siteData.teams || !siteData.playerDraft) {
    draftPlayersList.innerHTML = renderDraftMessage("Loading draft players...");
    return;
  }

  const draftedPlayerKeys = getDraftedPlayerKeys();
  const playerPoints = getPlayerPointsMap();
  const selectedPosition = getSelectedDraftPlayerPosition();
  const players = siteData.players
    .map((player) => {
      const position = normalizePlayerPosition(player.position);
      const points = playerPoints.byId.get(String(player.id)) ??
        playerPoints.byName.get(getPlayerNameLookupKey(player.name)) ??
        0;

      return {
        id: player.id,
        isUnknown: isUnknownEliminationNation(player.team),
        name: player.name,
        points,
        position,
        team: normalizeNationName(player.team),
      };
    })
    .filter((player) => {
      return Boolean(player.name && player.team) &&
        !draftedPlayerKeys.byId.has(String(player.id)) &&
        !draftedPlayerKeys.byName.has(getPlayerNameLookupKey(player.name)) &&
        !isEliminatedNation(player.team) &&
        (selectedPosition === "all" || player.position === selectedPosition);
    })
    .sort(compareDraftRows);

  if (players.length === 0) {
    draftPlayersList.innerHTML = renderDraftMessage("No available players found.");
    return;
  }

  draftPlayersList.innerHTML = `
    ${players.map((player) => {
    return `
      <article class="draft-card">
        <div>
          <h2 class="${player.isUnknown ? "draft-unknown" : ""}">${renderPlayerNameWithPosition(`${player.name}${player.isUnknown ? "*" : ""}`, player.position)}</h2>
          <p>${renderDraftName(player.team, player.isUnknown)}</p>
        </div>
        <strong>${escapeHtml(formatPoints(player.points))}</strong>
      </article>
    `;
  }).join("")}
    ${renderDraftUnknownNote(players)}
  `;
}

function renderDraftMessage(message) {
  return `
    <article class="draft-card">
      <p class="table-message">${escapeHtml(message)}</p>
    </article>
  `;
}

function getDraftedNationKeys() {
  return new Set(
    (siteData.teamDraft || [])
      .map((draft) => normalizeLookupName(normalizeNationName(draft.Team || draft.Nation || draft.Name)))
      .filter(Boolean)
  );
}

function getDraftedPlayerKeys() {
  const byId = new Set();
  const byName = new Set();

  for (const draft of siteData.playerDraft || []) {
    if (draft["Player ID"]) {
      byId.add(String(draft["Player ID"]));
    }

    if (draft.Player) {
      byName.add(getPlayerNameLookupKey(draft.Player));
    }
  }

  return { byId, byName };
}

function getNationPointsMap() {
  return new Map(
    getNationsLeagueRows(siteData.matchResults || [])
      .map((nation) => [normalizeLookupName(nation.name), nation.points])
  );
}

function getPlayerPointsMap() {
  const byId = new Map();
  const byName = new Map();

  for (const player of getPlayerChampionshipRows(siteData.playerPerformances || [])) {
    byId.set(String(player.id), player.points);
    byName.set(getPlayerNameLookupKey(player.name), player.points);
  }

  return { byId, byName };
}

function getSelectedDraftPlayerPosition() {
  const position = draftPlayerPositionFilter?.value || "all";

  return ["all", "goalkeeper", "defender", "midfielder", "forward"].includes(position) ? position : "all";
}

function isEliminatedNation(nationName) {
  const nationKey = normalizeLookupName(normalizeNationName(nationName));
  const team = getTeamByNationKey(nationKey);

  return isTrueValue(team?.Eliminated);
}

function isUnknownEliminationNation(nationName) {
  const nationKey = normalizeLookupName(normalizeNationName(nationName));
  const team = getTeamByNationKey(nationKey);

  return isUnknownEliminationValue(team?.Eliminated);
}

function getTeamByNationKey(nationKey) {
  return (siteData.teams || []).find((row) => {
    return normalizeLookupName(normalizeNationName(row.Team || row.Nation || row.Name)) === nationKey;
  });
}

function isTrueValue(value) {
  return String(value ?? "").trim().toLowerCase() === "true";
}

function isUnknownEliminationValue(value) {
  return String(value ?? "").trim().toLowerCase() === "unknown";
}

function renderDraftName(name, isUnknown) {
  const suffix = isUnknown ? "*" : "";
  const className = isUnknown ? " class=\"draft-unknown\"" : "";

  return `<span${className}>${escapeHtml(name)}${suffix}</span>`;
}

function renderDraftUnknownNote(rows) {
  return rows.some((row) => row.isUnknown)
    ? `<p class="draft-note">* Nation could still be eliminated in the Group Stage.</p>`
    : "";
}

function compareDraftRows(firstRow, secondRow) {
  if (secondRow.points !== firstRow.points) {
    return secondRow.points - firstRow.points;
  }

  return firstRow.name.localeCompare(secondRow.name);
}

function formatDraftMeta(parts) {
  return parts.filter(Boolean).join(" | ");
}

function renderBracket(matches = siteData.bracketMatches) {
  if (!bracketView) {
    return;
  }

  if (!matches || matches.length === 0) {
    bracketView.innerHTML = `
      <article class="match-card">
        <div class="match-header">
          <h2>No bracket data loaded</h2>
          <p>Google Sheets schedule</p>
        </div>
      </article>
    `;
    return;
  }

  const matchById = getMatchesById(matches);
  const selectedSubmission = getSelectedBracketSubmission();
  const bracketState = selectedSubmission
    ? getSubmittedBracketState(matches, matchById, selectedSubmission)
    : getResolvedBracketState(matches, matchById);

  bracketView.innerHTML = `
    ${selectedSubmission ? renderBracketSubmissionNotice(selectedSubmission) : ""}
    <div class="bracket-grid">
      ${BRACKET_ROUNDS.map((round) => renderBracketRound(round, matchById, bracketState)).join("")}
    </div>
  `;
}

function parseBracketSubmissions(rows) {
  return rows
    .map((row, index) => parseBracketSubmission(row, index))
    .filter(Boolean)
    .sort((firstSubmission, secondSubmission) => secondSubmission.timestampValue - firstSubmission.timestampValue);
}

function parseBracketSubmission(row, index) {
  const rawPicks = getField(row, "Picks JSON", "picks json", "Picks");
  const { picks, pickTeams } = parseBracketSubmissionPicks(rawPicks);

  if (Object.keys(picks).length === 0) {
    return null;
  }

  const timestamp = getField(row, "Timestamp", "timestamp");
  const submitter = getField(row, "Submitter", "submitter") || "Unknown";
  const timestampLabel = formatBracketSubmissionTimestamp(timestamp);
  const parsedTimestamp = parseTimestampValue(timestamp);

  return {
    id: String(index),
    label: `${submitter} - ${timestampLabel || "No timestamp"}`,
    pickTeams,
    picks,
    submitter,
    timestamp,
    timestampLabel,
    timestampValue: Number.isFinite(parsedTimestamp) ? parsedTimestamp : 0,
  };
}

function parseBracketSubmissionPicks(rawPicks) {
  try {
    const parsedPicks = JSON.parse(String(rawPicks || "[]"));

    if (!Array.isArray(parsedPicks)) {
      return { picks: {}, pickTeams: {} };
    }

    return parsedPicks.reduce((submissionData, pick) => {
      const matchId = String(pick?.matchId ?? "").trim();
      const side = String(pick?.side ?? "").trim().toLowerCase();
      const team = String(pick?.team ?? "").trim();

      if (matchId && ["home", "away"].includes(side)) {
        submissionData.picks[matchId] = side;

        if (team) {
          submissionData.pickTeams[matchId] = {
            side,
            team,
          };
        }
      }

      return submissionData;
    }, { picks: {}, pickTeams: {} });
  } catch {
    return { picks: {}, pickTeams: {} };
  }
}

function formatBracketSubmissionTimestamp(value) {
  const text = String(value ?? "").trim();
  const parsedTime = parseTimestampValue(text);

  if (!text) {
    return "";
  }

  if (!Number.isFinite(parsedTime)) {
    return text;
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(parsedTime));
}

function parseTimestampValue(value) {
  const parsedTime = Date.parse(String(value ?? "").trim());
  return Number.isFinite(parsedTime) ? parsedTime : Number.NaN;
}

function renderBracketSubmissionOptions(submissions = []) {
  if (!bracketSubmissionSelect) {
    return;
  }

  const selectedValue = bracketSubmissionSelect.value;

  bracketSubmissionSelect.innerHTML = `
    <option value="${BRACKET_MANUAL_PICK_VALUE}">Make picks</option>
    ${submissions.map((submission) => `
      <option value="${escapeHtml(submission.id)}">${escapeHtml(submission.label)}</option>
    `).join("")}
  `;

  bracketSubmissionSelect.value = submissions.some((submission) => submission.id === selectedValue)
    ? selectedValue
    : BRACKET_MANUAL_PICK_VALUE;
  syncBracketSubmissionControls();
}

function getSelectedBracketSubmission() {
  if (!bracketSubmissionSelect || bracketSubmissionSelect.value === BRACKET_MANUAL_PICK_VALUE) {
    return null;
  }

  return (siteData.bracketSubmissions || []).find((submission) => submission.id === bracketSubmissionSelect.value) || null;
}

function syncBracketSubmissionControls() {
  const isViewingSubmission = Boolean(getSelectedBracketSubmission());

  if (bracketSubmitterInput) {
    bracketSubmitterInput.disabled = isViewingSubmission;
  }

  if (bracketSubmitButton) {
    bracketSubmitButton.disabled = isViewingSubmission;
  }

  if (bracketClearPicks) {
    bracketClearPicks.disabled = isViewingSubmission;
  }

  if (!isViewingSubmission && bracketSubmitStatus?.textContent.startsWith("Viewing ")) {
    setBracketSubmitStatus("");
  }
}

function getSubmittedBracketState(matches, matchById, submission) {
  const picks = { ...submission.picks };
  const lockedMatches = new Set(Object.keys(picks));

  return {
    pickTeams: submission.pickTeams || {},
    picks,
    lockedMatches,
    isReadOnly: true,
  };
}

function renderBracketSubmissionNotice(submission) {
  return `
    <div class="bracket-submission-notice">
      Viewing ${escapeHtml(submission.submitter)}${submission.timestampLabel ? ` from ${escapeHtml(submission.timestampLabel)}` : ""}
    </div>
  `;
}

function getResolvedBracketPicks(matches, matchById) {
  return getResolvedBracketState(matches, matchById).picks;
}

function getResolvedBracketState(matches, matchById) {
  const savedPicks = getBracketPicks();
  const resultPicks = inferBracketPicksFromResults(matches, matchById);
  const inferredPicks = inferBracketPicksFromSchedule(matches, matchById, { ...savedPicks, ...resultPicks });
  const picks = { ...savedPicks, ...inferredPicks, ...resultPicks };
  const lockedMatches = new Set([...Object.keys(resultPicks), ...Object.keys(inferredPicks)]);

  return { picks, lockedMatches };
}

function inferBracketPicksFromResults(matches, matchById) {
  if (!siteData.matchResults) {
    return {};
  }

  const bracketMatchIds = new Set(matches.map((match) => getMatchId(match)).filter(Boolean));
  const picks = {};

  for (const result of siteData.matchResults) {
    if (!isLoggedNationResult(result)) {
      continue;
    }

    const matchId = String(result["Match ID"] ?? "").trim();
    const match = matchById.get(matchId);

    if (!match || !bracketMatchIds.has(matchId)) {
      continue;
    }

    const winner = getBracketResultWinner(result);
    const winnerSide = getBracketTeamSide(match, winner);

    if (winnerSide) {
      picks[matchId] = winnerSide;
    }
  }

  return picks;
}

function getBracketResultWinner(result) {
  const outcome = String(result.Result ?? "").trim().toLowerCase();
  const team = normalizeNationName(result.Team);
  const opponent = normalizeNationName(result.Opponent);

  if (outcome === "win") {
    return team;
  }

  if (outcome === "lose" || outcome === "loss") {
    return opponent;
  }

  return "";
}

function getBracketTeamSide(match, teamName) {
  const teamKey = normalizeLookupName(normalizeNationName(teamName));

  if (!teamKey) {
    return "";
  }

  const homeKey = normalizeLookupName(normalizeNationName(getField(match, "Home", "home")));
  const awayKey = normalizeLookupName(normalizeNationName(getField(match, "Away", "away")));

  if (teamKey === homeKey) {
    return "home";
  }

  if (teamKey === awayKey) {
    return "away";
  }

  return "";
}

function inferBracketPicksFromSchedule(matches, matchById, savedPicks = {}) {
  const inferredPicks = {};

  for (let pass = 0; pass < 4; pass += 1) {
    const picks = { ...savedPicks, ...inferredPicks };
    let changed = false;

    for (const match of matches) {
      const slotReferences = BRACKET_SLOT_REFERENCES[getMatchId(match)];

      if (!slotReferences) {
        continue;
      }

      for (const side of ["home", "away"]) {
        const entrant = getField(match, side === "home" ? "Home" : "Away", side);
        const reference = parseBracketReference(slotReferences[side]);
        const pick = inferBracketPickFromEntrant(entrant, reference, matchById, picks);

        if (pick && inferredPicks[pick.matchId] !== pick.side) {
          inferredPicks[pick.matchId] = pick.side;
          changed = true;
        }
      }
    }

    if (!changed) {
      break;
    }
  }

  return inferredPicks;
}

function inferBracketPickFromEntrant(entrant, reference, matchById, picks) {
  const entrantName = normalizeLookupName(normalizeNationName(entrant));

  if (!entrantName || !reference || parseBracketReference(entrant)) {
    return null;
  }

  const sourceMatch = matchById.get(String(reference.matchId));

  if (!sourceMatch) {
    return null;
  }

  const home = resolveBracketEntrant(getField(sourceMatch, "Home", "home"), matchById, picks);
  const away = resolveBracketEntrant(getField(sourceMatch, "Away", "away"), matchById, picks);
  const homeMatches = normalizeLookupName(normalizeNationName(home.label)) === entrantName;
  const awayMatches = normalizeLookupName(normalizeNationName(away.label)) === entrantName;

  if (!homeMatches && !awayMatches) {
    return null;
  }

  const entrantSide = homeMatches ? "home" : "away";

  return {
    matchId: String(reference.matchId),
    side: reference.type === "winner" ? entrantSide : entrantSide === "home" ? "away" : "home",
  };
}

function renderBracketRound(round, matchById, bracketState) {
  const matches = round.matchIds.map((matchId) => matchById.get(String(matchId))).filter(Boolean);
  const label = getRoundPrettyName(round.id) || round.label;

  return `
    <section class="bracket-round" aria-label="${escapeHtml(label)}">
      <h2>${escapeHtml(label)}</h2>
      <div class="bracket-round-matches">
        ${matches.map((match) => renderBracketMatch(match, matchById, bracketState)).join("")}
      </div>
    </section>
  `;
}

function renderBracketMatch(match, matchById, bracketState) {
  const { picks, lockedMatches } = bracketState;
  const matchId = getMatchId(match);
  const selectedSide = picks[matchId] || "";
  const isLocked = lockedMatches.has(String(matchId));
  const home = resolveBracketEntrantForSide(match, "home", matchById, bracketState);
  const away = resolveBracketEntrantForSide(match, "away", matchById, bracketState);
  const date = formatBracketMatchDate(getMatchDate(match));
  const time = getField(match, "Time", "time");

  return `
    <article class="bracket-match">
      <header>
        <strong>M${escapeHtml(matchId)}</strong>
        <span>${escapeHtml([date, time].filter(Boolean).join(" | "))}</span>
      </header>
      <div class="bracket-team-list">
        ${renderBracketTeamButton(matchId, "home", home, selectedSide, isLocked, bracketState.isReadOnly)}
        ${renderBracketTeamButton(matchId, "away", away, selectedSide, isLocked, bracketState.isReadOnly)}
      </div>
    </article>
  `;
}

function resolveBracketEntrantForSide(match, side, matchById, bracketState) {
  const submittedTeam = getSubmittedBracketTeamForSide(bracketState, getMatchId(match), side);

  if (submittedTeam) {
    return { isPending: false, label: submittedTeam };
  }

  return resolveBracketEntrant(getBracketEntrantValue(match, side, bracketState), matchById, bracketState.picks);
}

function getSubmittedBracketTeamForSide(bracketState, matchId, side) {
  if (!bracketState.isReadOnly) {
    return "";
  }

  const pickTeam = bracketState.pickTeams?.[String(matchId)];

  return pickTeam?.side === side ? pickTeam.team : "";
}

function getBracketEntrantValue(match, side, bracketState) {
  const matchId = getMatchId(match);
  const slotReference = BRACKET_SLOT_REFERENCES[matchId]?.[side];

  if (bracketState.isReadOnly && slotReference) {
    return slotReference;
  }

  return getField(match, side === "home" ? "Home" : "Away", side);
}

function formatBracketMatchDate(dateKey) {
  const value = String(dateKey ?? "").trim();

  if (!value) {
    return "";
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? formatMatchdayLabel(value) : value;
}

function renderBracketTeamButton(matchId, side, entrant, selectedSide, isLocked = false, isReadOnly = false) {
  const isSelected = selectedSide === side;
  const isDisabled = entrant.isPending || isLocked || isReadOnly;
  const disabledAttribute = isDisabled ? " disabled" : "";
  const selectedAttribute = isSelected ? " aria-pressed=\"true\"" : " aria-pressed=\"false\"";
  const selectedClass = isSelected ? " is-selected" : "";
  const pendingClass = entrant.isPending ? " is-pending" : "";
  const readOnlyClass = isReadOnly ? " is-read-only" : "";

  return `
    <button
      class="bracket-team${selectedClass}${pendingClass}${readOnlyClass}"
      type="button"
      data-bracket-pick
      data-match-id="${escapeHtml(matchId)}"
      data-side="${escapeHtml(side)}"
      ${selectedAttribute}${disabledAttribute}
    >
      <span>${escapeHtml(entrant.label)}</span>
    </button>
  `;
}

function resolveBracketEntrant(value, matchById, picks, seen = new Set()) {
  const rawValue = String(value ?? "").trim();

  if (!rawValue) {
    return { isPending: true, label: "TBD" };
  }

  const reference = parseBracketReference(rawValue);

  if (!reference) {
    return { isPending: false, label: rawValue };
  }

  const matchId = String(reference.matchId);
  const sourceMatch = matchById.get(matchId);

  if (!sourceMatch || seen.has(matchId)) {
    return { isPending: true, label: rawValue };
  }

  const selectedSide = picks[matchId];

  if (!selectedSide) {
    return { isPending: true, label: rawValue };
  }

  const side = reference.type === "winner"
    ? selectedSide
    : selectedSide === "home" ? "away" : "home";
  const nextSeen = new Set(seen);
  nextSeen.add(matchId);

  return resolveBracketEntrant(getField(sourceMatch, side === "home" ? "Home" : "Away", side), matchById, picks, nextSeen);
}

function parseBracketReference(value) {
  const normalizedValue = String(value ?? "").trim();
  const explicitReference = normalizedValue.match(/^(Winner|Loser)\s*M?(\d+)$/i);

  if (explicitReference) {
    return {
      matchId: explicitReference[2],
      type: explicitReference[1].toLowerCase() === "loser" ? "loser" : "winner",
    };
  }

  const secondPlaceReference = normalizedValue.match(/^M?(\d+)\s*2$/i);

  if (secondPlaceReference) {
    return {
      matchId: secondPlaceReference[1],
      type: "loser",
    };
  }

  return null;
}

function getMatchesById(matches) {
  const matchById = new Map();

  for (const match of matches) {
    const matchId = getMatchId(match);

    if (matchId) {
      matchById.set(matchId, match);
    }
  }

  return matchById;
}

function getBracketPicks() {
  try {
    const picks = JSON.parse(localStorage.getItem(BRACKET_STORAGE_KEY) || "{}");
    return picks && typeof picks === "object" ? picks : {};
  } catch {
    return bracketPicksFallback;
  }
}

function setBracketPick(matchId, side) {
  if (!matchId || !["home", "away"].includes(side)) {
    return;
  }

  const picks = getBracketPicks();

  picks[String(matchId)] = side;
  saveBracketPicks(picks);
  renderBracket();
}

function hydrateBracketSubmitter() {
  if (!bracketSubmitterInput) {
    return;
  }

  try {
    bracketSubmitterInput.value = localStorage.getItem(BRACKET_SUBMITTER_STORAGE_KEY) || "";
  } catch {
    bracketSubmitterInput.value = "";
  }
}

function submitBracketPicks() {
  const submitter = bracketSubmitterInput?.value.trim() ?? "";
  const picks = getBracketPicks();
  const selectedMatchIds = Object.keys(picks);

  if (!submitter) {
    setBracketSubmitStatus("Enter your name before submitting.", "error");
    bracketSubmitterInput?.focus();
    return;
  }

  if (selectedMatchIds.length === 0) {
    setBracketSubmitStatus("Make at least one bracket pick before submitting.", "error");
    return;
  }

  if (!BRACKET_SUBMISSION_ENDPOINT) {
    setBracketSubmitStatus("Bracket submission endpoint is not configured yet.", "error");
    return;
  }

  const payload = buildBracketSubmissionPayload(submitter, picks);
  bracketSubmitButton.disabled = true;
  setBracketSubmitStatus("Submitting bracket picks...", "pending");

  submitBracketPayloadWithForm(payload);

  window.setTimeout(() => {
    bracketSubmitButton.disabled = false;
    setBracketSubmitStatus("Submitted. Google Sheets may take a moment to update.", "success");
  }, 900);
}

function submitBracketPayloadWithForm(payload) {
  const iframeName = "bracket-submission-frame";
  let iframe = document.querySelector(`iframe[name="${iframeName}"]`);

  if (!iframe) {
    iframe = document.createElement("iframe");
    iframe.name = iframeName;
    iframe.hidden = true;
    document.body.append(iframe);
  }

  const form = document.createElement("form");
  form.action = BRACKET_SUBMISSION_ENDPOINT;
  form.method = "POST";
  form.target = iframeName;
  form.hidden = true;

  const payloadInput = document.createElement("input");
  payloadInput.name = "payload";
  payloadInput.value = JSON.stringify(payload);
  form.append(payloadInput);

  document.body.append(form);
  form.submit();
  form.remove();
}

function buildBracketSubmissionPayload(submitter, picks) {
  const matchById = getMatchesById(siteData.bracketMatches || []);
  const bracketState = getResolvedBracketState(siteData.bracketMatches || [], matchById);
  const resolvedPicks = bracketState.picks;
  const userPickIds = Object.keys(picks).sort(compareNumericStrings);

  return {
    browser: window.navigator.userAgent,
    submittedAt: new Date().toISOString(),
    submitter,
    pageUrl: window.location.href,
    picks: userPickIds.map((matchId) => {
      const side = picks[matchId];
      const match = matchById.get(String(matchId));
      const team = match ? resolveBracketPickLabel(match, matchById, resolvedPicks, side) : "";

      return {
        matchId,
        side,
        team,
      };
    }),
  };
}

function resolveBracketPickLabel(match, matchById, picks, side) {
  if (!["home", "away"].includes(side)) {
    return "";
  }

  const field = side === "home" ? "Home" : "Away";
  return resolveBracketEntrant(getField(match, field, side), matchById, picks).label;
}

function compareNumericStrings(firstValue, secondValue) {
  return String(firstValue).localeCompare(String(secondValue), undefined, { numeric: true });
}

function setBracketSubmitStatus(message, state = "") {
  if (!bracketSubmitStatus) {
    return;
  }

  bracketSubmitStatus.textContent = message;
  bracketSubmitStatus.dataset.state = state;
}

function clearBracketPicks() {
  bracketPicksFallback = {};

  try {
    localStorage.removeItem(BRACKET_STORAGE_KEY);
  } catch {
    // Ignore storage failures; in-memory picks have already been cleared.
  }

  renderBracket();
}

function saveBracketPicks(picks) {
  bracketPicksFallback = { ...picks };

  try {
    localStorage.setItem(BRACKET_STORAGE_KEY, JSON.stringify(picks));
  } catch {
    // Ignore storage failures; picks simply will not persist across refreshes.
  }
}

function renderBracketError(error) {
  if (!bracketView) {
    return;
  }

  bracketView.innerHTML = `
    <article class="match-card">
      <div class="match-header">
        <h2>Unable to load bracket</h2>
        <p>${escapeHtml(error.message)}</p>
      </div>
    </article>
  `;
}

function renderMatchCard(match) {
  const home = getField(match, "Home", "home") || "Home";
  const away = getField(match, "Away", "away") || "Away";
  const time = getField(match, "Time", "time") || "Time TBD";
  const entries = getMatchDraftEntries(match);
  const dataTable = entries.length > 0 ? `
      <table class="pair-table">
        <tbody>
          ${renderMatchRows(entries)}
        </tbody>
      </table>
  ` : "";

  return `
    <article class="match-card">
      <div class="match-header">
        <h2>${escapeHtml(home)} v ${escapeHtml(away)}</h2>
        <p>${escapeHtml(time)}</p>
      </div>
      ${dataTable}
    </article>
  `;
}

function renderMatchRows(entries) {
  return entries.map((entry) => {
    return `
      <tr>
        <th scope="row">${renderMatchDataName(entry.name)}</th>
        <td>${renderMatchManager(entry.manager, entry.points)}</td>
      </tr>
    `;
  }).join("");
}

function renderMatchManager(managerSource, points = null) {
  const manager = typeof managerSource === "string" ? getManagerByName(managerSource) : managerSource;
  const pointsMarkup = points === null ? "" : `<span class="match-points">+${escapeHtml(formatPoints(points))} pts</span>`;
  const managerMarkup = manager ? renderManagerChip(manager) : escapeHtml(managerSource);

  return `
    <span class="match-manager-result">
      ${managerMarkup}
      ${pointsMarkup}
    </span>
  `;
}

function getMatchDraftEntries(match) {
  if (!siteData.managerDrafts || !siteData.teamDraft || !siteData.playerDraft) {
    return [];
  }

  const matchRoundId = getStandingSourceRoundId({ "Match ID": getMatchId(match) });
  const teamOrder = getMatchTeamKeys(match);
  const teamOrderIndex = new Map(teamOrder.map((teamKey, index) => [teamKey, index]));
  const entries = [];

  for (const draft of siteData.teamDraft) {
    const nation = normalizeNationName(draft.Team);
    const nationKey = normalizeLookupName(nation);

    if (
      !nation ||
      !teamOrderIndex.has(nationKey) ||
      !isDraftActiveForMatchRound(draft, matchRoundId, "nation")
    ) {
      continue;
    }

    entries.push({
      manager: getManagerForDraft(draft),
      name: nation,
      order: teamOrderIndex.get(nationKey),
      points: getNationDraftMatchPoints(draft, match),
      typeOrder: 0,
    });
  }

  for (const draft of siteData.playerDraft) {
    const player = String(draft.Player ?? "").trim();
    const nation = normalizeNationName(draft.Nation);
    const nationKey = normalizeLookupName(nation);

    if (
      !player ||
      !nation ||
      !teamOrderIndex.has(nationKey) ||
      !isDraftActiveForMatchRound(draft, matchRoundId, "player")
    ) {
      continue;
    }

    entries.push({
      manager: getManagerForDraft(draft),
      name: `${player}\n(${nation})`,
      order: teamOrderIndex.get(nationKey),
      points: getPlayerDraftMatchPoints(draft, match),
      typeOrder: 1,
    });
  }

  return entries.sort((firstEntry, secondEntry) => {
    if (firstEntry.order !== secondEntry.order) {
      return firstEntry.order - secondEntry.order;
    }

    if (firstEntry.typeOrder !== secondEntry.typeOrder) {
      return firstEntry.typeOrder - secondEntry.typeOrder;
    }

    return firstEntry.name.localeCompare(secondEntry.name);
  });
}

function getMatchTeamKeys(match) {
  return [
    normalizeLookupName(normalizeNationName(getField(match, "Home", "home"))),
    normalizeLookupName(normalizeNationName(getField(match, "Away", "away"))),
  ].filter(Boolean);
}

function getPlayerDraftMatchPoints(draft, match) {
  const matchId = getMatchId(match);

  if (!matchId || !siteData.playerPerformances) {
    return null;
  }

  const performance = siteData.playerPerformances.find((row) => {
    return String(row["Match ID"] ?? "").trim() === matchId && isPerformanceForDraft(row, draft);
  });

  if (!performance) {
    return hasLoggedMatchResult(match) ? 0 : null;
  }

  const points = getPlayerPerformancePoints(performance);
  return Number.isFinite(points) ? points : null;
}

function hasLoggedMatchResult(match) {
  if (!siteData.matchResults) {
    return false;
  }

  const matchId = getMatchId(match);

  return siteData.matchResults.some((result) => {
    if (!isLoggedNationResult(result)) {
      return false;
    }

    if (matchId && String(result["Match ID"] ?? "").trim() === matchId) {
      return true;
    }

    const homeKey = normalizeLookupName(normalizeNationName(getField(match, "Home", "home")));
    const awayKey = normalizeLookupName(normalizeNationName(getField(match, "Away", "away")));
    const teamKey = normalizeLookupName(normalizeNationName(result.Team));
    const opponentKey = normalizeLookupName(normalizeNationName(result.Opponent));

    return Boolean(homeKey && awayKey && teamKey && opponentKey) &&
      (
        (teamKey === homeKey && opponentKey === awayKey) ||
        (teamKey === awayKey && opponentKey === homeKey)
      );
  });
}

function getNationDraftMatchPoints(draft, match) {
  const nation = normalizeNationName(draft.Team);
  const matchId = getMatchId(match);

  if (!nation || !siteData.matchResults) {
    return null;
  }

  const draftKey = normalizeLookupName(nation);
  const result = siteData.matchResults.find((row) => isNationResultMatchId(row, matchId, draftKey)) ??
    siteData.matchResults.find((row) => isNationResultMatchTeams(row, match, draftKey));

  if (!result || !isLoggedNationResult(result)) {
    return null;
  }

  const points = getNationPointsForResult(result, nation);
  return Number.isFinite(points) ? points : null;
}

function getMatchDraftPoints(match, draftName) {
  const matchId = getMatchId(match);
  const playerPoints = getPlayerMatchPoints(matchId, draftName);

  if (playerPoints !== null) {
    return playerPoints;
  }

  return getNationMatchPoints(match, draftName);
}

function getPlayerMatchPoints(matchId, draftName) {
  if (!matchId || !siteData.playerPerformances) {
    return null;
  }

  const draftKey = getPlayerNameLookupKey(draftName);
  const performance = siteData.playerPerformances.find((row) => {
    return String(row["Match ID"] ?? "").trim() === matchId &&
      getPlayerNameLookupKey(row.Name) === draftKey;
  });

  if (!performance) {
    return null;
  }

  if (siteData.playerDraft && !getActivePlayerDraftForPerformance(performance)) {
    return null;
  }

  const points = getPlayerPerformancePoints(performance);
  return Number.isFinite(points) ? points : null;
}

function getNationMatchPoints(match, draftName) {
  const matchId = getMatchId(match);

  if (!siteData.matchResults) {
    return null;
  }

  const draftKey = normalizeLookupName(normalizeNationName(draftName));
  const result = siteData.matchResults.find((row) => isNationResultMatchId(row, matchId, draftKey)) ??
    siteData.matchResults.find((row) => isNationResultMatchTeams(row, match, draftKey));

  if (!result || !isLoggedNationResult(result)) {
    return null;
  }

  if (siteData.teamDraft && !getActiveNationDraftForResult(result, draftName)) {
    return null;
  }

  const points = getNationPointsForResult(result, draftName);
  return Number.isFinite(points) ? points : null;
}

function getActivePlayerDraftForPerformance(performance) {
  return (siteData.playerDraft || [])
    .filter((draft) => isPerformanceForDraft(performance, draft))
    .filter((draft) => isDraftActiveForMatchRound(draft, getStandingSourceRoundId(performance), "player"))
    .sort(compareDraftRoundDescending)[0] ?? null;
}

function getActiveNationDraftForResult(result, nationName) {
  const nationKey = normalizeLookupName(normalizeNationName(nationName));

  return (siteData.teamDraft || [])
    .filter((draft) => normalizeLookupName(normalizeNationName(draft.Team)) === nationKey)
    .filter((draft) => isDraftActiveForMatchRound(draft, getStandingSourceRoundId(result), "nation"))
    .sort(compareDraftRoundDescending)[0] ?? null;
}

function compareDraftRoundDescending(firstDraft, secondDraft) {
  return (parseDraftRoundLimit(secondDraft.Round) ?? 0) - (parseDraftRoundLimit(firstDraft.Round) ?? 0);
}

function isNationResultMatchId(result, matchId, draftKey) {
  return Boolean(matchId) &&
    String(result["Match ID"] ?? "").trim() === matchId &&
    isNationResultForDraft(result, draftKey);
}

function isNationResultMatchTeams(result, match, draftKey) {
  if (!isNationResultForDraft(result, draftKey)) {
    return false;
  }

  const homeKey = normalizeLookupName(normalizeNationName(getField(match, "Home", "home")));
  const awayKey = normalizeLookupName(normalizeNationName(getField(match, "Away", "away")));
  const teamKey = normalizeLookupName(normalizeNationName(result.Team));
  const opponentKey = normalizeLookupName(normalizeNationName(result.Opponent));

  return Boolean(homeKey && awayKey && teamKey && opponentKey) &&
    (
      (teamKey === homeKey && opponentKey === awayKey) ||
      (teamKey === awayKey && opponentKey === homeKey)
    );
}

function isNationResultForDraft(result, draftKey) {
  return normalizeLookupName(normalizeNationName(result.Team)) === draftKey ||
    normalizeLookupName(normalizeNationName(result.Opponent)) === draftKey;
}

function isLoggedNationResult(result) {
  if (Object.prototype.hasOwnProperty.call(result, "Recorded")) {
    return isTruthySheetValue(result.Recorded);
  }

  return String(result.Result || "").trim() !== "";
}

function isTruthySheetValue(value) {
  return ["true", "yes", "y", "1"].includes(String(value ?? "").trim().toLowerCase());
}

function getNationPointsForResult(result, nationName) {
  const nationKey = normalizeLookupName(normalizeNationName(nationName));
  const teamKey = normalizeLookupName(normalizeNationName(result.Team));
  const opponentKey = normalizeLookupName(normalizeNationName(result.Opponent));
  const points = getNationResultPoints(result);

  if (nationKey === teamKey) {
    return points.team;
  }

  if (nationKey === opponentKey) {
    return points.opponent;
  }

  return null;
}

function renderMatchError(container, error) {
  if (!container) {
    return;
  }

  container.innerHTML = `
    <article class="match-card">
      <div class="match-header">
        <h2>Unable to load matches</h2>
        <p>Error</p>
      </div>
      <table class="pair-table">
        <tbody>
          <tr>
            <th scope="row">Details</th>
            <td>${escapeHtml(error.message)}</td>
          </tr>
        </tbody>
      </table>
    </article>
  `;
}

function getMatchDate(match) {
  return getField(match, "Date", "date");
}

function getMatchId(match) {
  return String(getField(match, "Id", "ID", "id", "Match ID", "Match Id") ?? "").trim();
}

function compareMatchesByDisplayTime(firstMatch, secondMatch) {
  const firstTime = getDisplayTimeSortValue(getField(firstMatch, "Time", "time"));
  const secondTime = getDisplayTimeSortValue(getField(secondMatch, "Time", "time"));

  if (firstTime !== secondTime) {
    return firstTime - secondTime;
  }

  return Number(getField(firstMatch, "Id", "id") ?? 0) - Number(getField(secondMatch, "Id", "id") ?? 0);
}

function getDisplayTimeSortValue(time) {
  const match = String(time ?? "")
    .trim()
    .match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);

  if (!match) {
    return Number.MAX_SAFE_INTEGER;
  }

  const hour = Number(match[1]);
  const minute = Number(match[2] ?? 0);
  const period = match[3].toUpperCase();

  if (period === "AM" && hour === 12) {
    return 24 * 60 + minute;
  }

  const normalizedHour = period === "PM" && hour !== 12 ? hour + 12 : hour;
  return normalizedHour * 60 + minute;
}

function getField(source, ...names) {
  const fieldName = names.find((name) => source?.[name] !== undefined);
  return fieldName ? source[fieldName] : undefined;
}

function getDateKey(dayOffset) {
  const dateParts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/New_York",
    year: "numeric",
  }).formatToParts(new Date());
  const parts = Object.fromEntries(dateParts.map((part) => [part.type, part.value]));
  const date = new Date(
    Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day) + dayOffset)
  );

  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function formatMatchdayLabel(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    weekday: "short",
  }).format(date);
}

function renderPlayerChampionship(performances) {
  if (!playerChampionshipRows) {
    return;
  }

  const sourceRows = shouldShowAllStandingsData()
    ? getCurrentPlayerChampionshipRows(performances)
    : getCurrentDraftedPlayerChampionshipRows(performances);
  const rows = filterPlayerRowsByPosition(sourceRows);

  if (rows.length === 0) {
    playerChampionshipRows.innerHTML = `<tr><td class="table-message" colspan="5">No player performance data found.</td></tr>`;
    return;
  }

  playerChampionshipRows.innerHTML = rows.map((player, index) => {
    const manager = player.manager || getPlayerManager(player);
    const detailId = `player-standing-detail-${index}`;

    return `
      <tr class="standing-result-row" data-standing-result-row aria-expanded="false" aria-controls="${detailId}" role="button" tabindex="0">
        <td data-label="Rank">${escapeHtml(formatRankDisplay(player, index, rows))}</td>
        <td data-label="Player">${renderPlayerNameWithPosition(player.name, player.position)}</td>
        <td data-label="Team / Manager">${renderStandingDetail(player.team, manager, { competition: "2026 World Cup", standings: "players", year: "2026" })}</td>
        <td data-label="Matches">${escapeHtml(formatMatchCount(player.matches))}</td>
        <td data-label="Points">${escapeHtml(formatPoints(player.points))}</td>
      </tr>
      <tr class="standing-result-detail-row" id="${detailId}" hidden>
        <td colspan="5">
          ${renderStandingResultDetails(player.details)}
        </td>
      </tr>
    `;
  }).join("");
}

function filterPlayerRowsByPosition(rows) {
  const position = getSelectedPlayerPosition();

  if (position === "all") {
    return rows;
  }

  return rankRows(
    rows
      .filter((player) => normalizePlayerPosition(player.position || getPlayerPosition(player)) === position)
      .map(({ rank, ...player }) => player)
  );
}

function getSelectedPlayerPosition() {
  const position = playerPositionFilter?.value || "all";

  return ["all", "goalkeeper", "defender", "midfielder", "forward"].includes(position) ? position : "all";
}

function getPlayerChampionshipRows(performances) {
  const players = new Map();

  for (const performance of performances) {
    const playerId = performance["Player ID"] || performance.Name;
    const points = getPlayerPerformancePoints(performance);

    if (!playerId || !Number.isFinite(points)) {
      continue;
    }

    const player = players.get(playerId) ?? {
      id: playerId,
      details: [],
      matches: 0,
      name: performance.Name,
      points: 0,
      position: performance.Position,
      team: performance.Team,
    };

    player.matches += 1;
    player.points += points;
    player.details.push({
      matchId: performance["Match ID"],
      points,
      team: performance.Team,
    });
    player.name ||= performance.Name;
    player.position ||= performance.Position;
    player.team ||= performance.Team;
    players.set(playerId, player);
  }

  return rankRows(
    [...players.values()]
      .map((player) => ({
        ...player,
        position: player.position || getPlayerPosition(player),
      }))
      .filter((player) => player.points > 0)
      .sort((firstPlayer, secondPlayer) => {
        if (secondPlayer.points !== firstPlayer.points) {
          return secondPlayer.points - firstPlayer.points;
        }

        return firstPlayer.name.localeCompare(secondPlayer.name);
      })
  );
}

function getCurrentPlayerChampionshipRows(performances) {
  return isBestStandingPerformanceSelected()
    ? getBestPlayerChampionshipRows(performances)
    : getPlayerChampionshipRows(filterRowsBySelectedRound(performances));
}

function getCurrentDraftedPlayerChampionshipRows(performances) {
  return isBestStandingPerformanceSelected()
    ? getBestDraftedPlayerChampionshipRows(performances)
    : getDraftedPlayerChampionshipRows(filterRowsBySelectedRound(performances));
}

function getDraftedPlayerChampionshipRows(performances) {
  const players = new Map();

  for (const performance of performances) {
    const draft = getActivePlayerDraftForPerformance(performance);
    const playerId = performance["Player ID"] || performance.Name;
    const points = getPlayerPerformancePoints(performance);

    if (!draft || !playerId || !Number.isFinite(points)) {
      continue;
    }

    const player = players.get(playerId) ?? {
      id: playerId,
      details: [],
      manager: getManagerForDraft(draft),
      matches: 0,
      name: performance.Name,
      points: 0,
      position: performance.Position,
      team: performance.Team,
    };

    player.matches += 1;
    player.points += points;
    player.details.push({
      matchId: performance["Match ID"],
      points,
      team: performance.Team,
    });
    player.name ||= performance.Name;
    player.position ||= performance.Position;
    player.team ||= performance.Team;
    players.set(playerId, player);
  }

  return rankRows(
    [...players.values()]
      .map((player) => ({
        ...player,
        position: player.position || getPlayerPosition(player),
      }))
      .filter((player) => player.points > 0)
      .sort((firstPlayer, secondPlayer) => {
        if (secondPlayer.points !== firstPlayer.points) {
          return secondPlayer.points - firstPlayer.points;
        }

        return firstPlayer.name.localeCompare(secondPlayer.name);
      })
  );
}

function getBestPlayerChampionshipRows(performances) {
  return rankRows(
    getPlayerChampionshipRows(performances)
      .map((player) => {
        const bestDetail = getBestStandingDetail(player.details);

        return {
          ...player,
          details: bestDetail ? [bestDetail] : [],
          matches: bestDetail ? 1 : 0,
          points: bestDetail?.points ?? 0,
        };
      })
      .filter((player) => player.points > 0)
      .sort((firstPlayer, secondPlayer) => {
        if (secondPlayer.points !== firstPlayer.points) {
          return secondPlayer.points - firstPlayer.points;
        }

        return firstPlayer.name.localeCompare(secondPlayer.name);
      })
  );
}

function renderPlayerChampionshipError(error) {
  if (!playerChampionshipRows) {
    return;
  }

  playerChampionshipRows.innerHTML = `
    <tr>
      <td class="table-message" colspan="5">Unable to load player performance data: ${escapeHtml(error.message)}</td>
    </tr>
  `;
}

function rankRows(rows) {
  let previousPoints;
  let previousRank = 0;

  return rows.map((row, index) => {
    const rank = previousPoints === row.points ? previousRank : index + 1;
    previousPoints = row.points;
    previousRank = rank;

    return { ...row, rank };
  });
}

function formatRankDisplay(row, index, rows) {
  return index > 0 && row.rank === rows[index - 1]?.rank ? "-" : row.rank;
}

function renderNationsLeague(results) {
  if (!nationsLeagueRows) {
    return;
  }

  const rows = shouldShowAllStandingsData()
    ? getCurrentNationsLeagueRows(results)
    : getCurrentDraftedNationsLeagueRows(results);

  if (rows.length === 0) {
    nationsLeagueRows.innerHTML = `<tr><td class="table-message" colspan="5">No Nations League results found.</td></tr>`;
    return;
  }

  nationsLeagueRows.innerHTML = rows.map((nation, index) => {
    const manager = nation.manager || getNationManager(nation.name);
    const detailId = `nation-standing-detail-${index}`;
    const awards = getAwardsForNation(nation.name, { competition: "2026 World Cup", year: "2026" });

    return `
      <tr class="standing-result-row" data-standing-result-row aria-expanded="false" aria-controls="${detailId}" role="button" tabindex="0">
        <td data-label="Rank">${escapeHtml(formatRankDisplay(nation, index, rows))}</td>
        <td data-label="Nation">
          <span class="standing-name-with-awards">
            <span>${escapeHtml(nation.name)}</span>
            ${renderAwardBadges(awards)}
          </span>
        </td>
        <td data-label="Record / Manager">${renderStandingDetail(nation.recordLabel || formatRecord(nation), manager, { competition: "2026 World Cup", standings: "nations", year: "2026" })}</td>
        <td data-label="Matches">${escapeHtml(formatMatchCount(nation.matches))}</td>
        <td data-label="Points">${escapeHtml(formatPoints(nation.points))}</td>
      </tr>
      <tr class="standing-result-detail-row" id="${detailId}" hidden>
        <td colspan="5">
          ${renderStandingResultDetails(nation.details)}
        </td>
      </tr>
    `;
  }).join("");

  renderStandingsAwards();
}

function filterStandingRowsByGameScope(rows, getManager) {
  if (shouldShowAllStandingsData()) {
    return rows;
  }

  return rankRows(
    rows
      .filter((row) => Boolean(getManager(row)))
      .map(({ rank, ...row }) => row)
  );
}

function shouldShowAllStandingsData() {
  return standingsAllDataToggle?.checked ?? true;
}

function filterRowsBySelectedRound(rows) {
  const roundIds = getSelectedStandingRoundIds();

  if (!roundIds) {
    return rows;
  }

  return rows.filter((row) => roundIds.has(getStandingSourceRoundId(row)));
}

function getSelectedStandingRoundIds() {
  const value = standingsRoundSelect?.value || "";

  if (!value || value === BEST_STANDING_PERFORMANCE_VALUE) {
    return null;
  }

  if (value === "group") {
    return new Set(["1", "2", "3"]);
  }

  return new Set([value]);
}

function isBestStandingPerformanceSelected() {
  return standingsRoundSelect?.value === BEST_STANDING_PERFORMANCE_VALUE;
}

function getStandingSourceRoundId(row) {
  const explicitRoundId = String(row["Round ID"] ?? "").trim();

  if (explicitRoundId) {
    return explicitRoundId;
  }

  return inferGroupRoundIdFromMatchId(row["Match ID"]);
}

function inferGroupRoundIdFromMatchId(matchId) {
  const numericMatchId = Number(String(matchId ?? "").trim());

  if (!Number.isFinite(numericMatchId) || numericMatchId < 1) {
    return "";
  }

  if (numericMatchId <= 72) {
    return String(Math.ceil(numericMatchId / 24));
  }

  if (numericMatchId <= 88) {
    return "4";
  }

  if (numericMatchId <= 96) {
    return "5";
  }

  if (numericMatchId <= 100) {
    return "6";
  }

  if (numericMatchId <= 102) {
    return "7";
  }

  if (numericMatchId === 103) {
    return "8";
  }

  if (numericMatchId === 104) {
    return "9";
  }

  return "";
}

function getRoundMappingForMatchRound(matchRoundId) {
  const numericRound = Number(String(matchRoundId ?? "").trim());

  if (!Number.isFinite(numericRound)) {
    return null;
  }

  return (siteData.roundMappings || [])
    .filter((mapping) => numericRound >= mapping.start && numericRound <= mapping.end)
    .sort((firstMapping, secondMapping) => {
      if (secondMapping.start !== firstMapping.start) {
        return secondMapping.start - firstMapping.start;
      }

      return (firstMapping.end - firstMapping.start) - (secondMapping.end - secondMapping.start);
    })[0] ?? null;
}

function getActiveDraftRoundLimit(matchRoundId, draftType) {
  const mapping = getRoundMappingForMatchRound(matchRoundId);

  if (!mapping) {
    return null;
  }

  return draftType === "player" ? mapping.playerRound : mapping.nationRound;
}

function isDraftActiveForMatchRound(draft, matchRoundId, draftType) {
  const limit = getActiveDraftRoundLimit(matchRoundId, draftType);

  if (!Number.isFinite(limit)) {
    return true;
  }

  const draftRound = parseDraftRoundLimit(draft.Round);

  if (!Number.isFinite(draftRound)) {
    return false;
  }

  return draftRound <= limit;
}

function getNationsLeagueRows(results) {
  const nations = new Map();

  for (const result of results) {
    const team = result.Team;
    const opponent = result.Opponent;
    const outcome = String(result.Result || "").trim().toLowerCase();

    if (!team || !opponent || !outcome) {
      continue;
    }

    const teamRow = getNationStanding(nations, team);
    const opponentRow = getNationStanding(nations, opponent);
    const resultPoints = getNationResultPoints(result);
    let teamPoints = 0;
    let opponentPoints = 0;

    teamRow.matches += 1;
    opponentRow.matches += 1;

    if (outcome === "win") {
      teamRow.wins += 1;
      opponentRow.losses += 1;
      teamPoints = resultPoints.team;
      opponentPoints = resultPoints.opponent;
    } else if (outcome === "lose" || outcome === "loss") {
      teamRow.losses += 1;
      opponentRow.wins += 1;
      teamPoints = resultPoints.team;
      opponentPoints = resultPoints.opponent;
    } else if (outcome === "draw" || outcome === "tie") {
      teamRow.draws += 1;
      opponentRow.draws += 1;
      teamPoints = resultPoints.team;
      opponentPoints = resultPoints.opponent;
    }

    teamRow.points += teamPoints;
    opponentRow.points += opponentPoints;
    teamRow.details.push({
      matchId: result["Match ID"],
      opponent,
      points: teamPoints,
      team,
    });
    opponentRow.details.push({
      matchId: result["Match ID"],
      opponent: team,
      points: opponentPoints,
      team: opponent,
    });
  }

  return rankRows(
    [...nations.values()]
      .filter((nation) => nation.matches > 0 && nation.points > 0)
      .sort(compareNationStandings)
  );
}

function getCurrentNationsLeagueRows(results) {
  return isBestStandingPerformanceSelected()
    ? getBestNationsLeagueRows(results)
    : getNationsLeagueRows(filterRowsBySelectedRound(results));
}

function getCurrentDraftedNationsLeagueRows(results) {
  return isBestStandingPerformanceSelected()
    ? getBestDraftedNationsLeagueRows(results)
    : getDraftedNationsLeagueRows(filterRowsBySelectedRound(results));
}

function getDraftedNationsLeagueRows(results) {
  const nations = new Map();

  for (const result of results) {
    addDraftedNationResult(nations, result, result.Team, result.Opponent, "team");
    addDraftedNationResult(nations, result, result.Opponent, result.Team, "opponent");
  }

  return rankRows(
    [...nations.values()]
      .filter((nation) => nation.matches > 0 && nation.points > 0)
      .sort(compareNationStandings)
  );
}

function addDraftedNationResult(nations, result, nationName, opponentName, side) {
  const outcome = String(result.Result || "").trim().toLowerCase();
  const draft = getActiveNationDraftForResult(result, nationName);

  if (!draft || !nationName || !opponentName || !outcome) {
    return;
  }

  const nationRow = getNationStanding(nations, nationName);
  const points = getNationPointsForResult(result, nationName) ?? 0;

  nationRow.manager = getManagerForDraft(draft);
  nationRow.matches += 1;

  if (outcome === "draw" || outcome === "tie") {
    nationRow.draws += 1;
  } else if ((side === "team" && outcome === "win") || (side === "opponent" && (outcome === "lose" || outcome === "loss"))) {
    nationRow.wins += 1;
  } else {
    nationRow.losses += 1;
  }

  nationRow.points += points;
  nationRow.details.push({
    matchId: result["Match ID"],
    opponent: opponentName,
    points,
    team: nationName,
  });
}

function getBestNationsLeagueRows(results) {
  return rankRows(
    getNationsLeagueRows(results)
      .map((nation) => {
        const bestDetail = getBestStandingDetail(nation.details);

        return {
          ...nation,
          details: bestDetail ? [bestDetail] : [],
          draws: 0,
          losses: 0,
          matches: bestDetail ? 1 : 0,
          points: bestDetail?.points ?? 0,
          recordLabel: "Best Game",
          wins: 0,
        };
      })
      .filter((nation) => nation.points > 0)
      .sort((firstNation, secondNation) => {
        if (secondNation.points !== firstNation.points) {
          return secondNation.points - firstNation.points;
        }

        return firstNation.name.localeCompare(secondNation.name);
      })
  );
}

function getBestStandingDetail(details = []) {
  return details
    .filter((detail) => Number(detail.points) > 0)
    .sort((firstDetail, secondDetail) => {
      if (Number(secondDetail.points) !== Number(firstDetail.points)) {
        return Number(secondDetail.points) - Number(firstDetail.points);
      }

      return String(firstDetail.matchId ?? "").localeCompare(String(secondDetail.matchId ?? ""), undefined, { numeric: true });
    })[0];
}

function getNationStanding(nations, name) {
  if (!nations.has(name)) {
    nations.set(name, {
      details: [],
      draws: 0,
      losses: 0,
      matches: 0,
      name,
      points: 0,
      wins: 0,
    });
  }

  return nations.get(name);
}

function compareNationStandings(firstNation, secondNation) {
  if (secondNation.points !== firstNation.points) {
    return secondNation.points - firstNation.points;
  }

  if (secondNation.wins !== firstNation.wins) {
    return secondNation.wins - firstNation.wins;
  }

  return firstNation.name.localeCompare(secondNation.name);
}

function renderNationsLeagueError(error) {
  if (!nationsLeagueRows) {
    return;
  }

  nationsLeagueRows.innerHTML = `
    <tr>
      <td class="table-message" colspan="5">Unable to load Nations League results: ${escapeHtml(error.message)}</td>
    </tr>
  `;
}

function renderManagerResults({ managers, teamDraft, playerDraft, playerPerformances, matchResults }) {
  if (!managerResultsRows) {
    return;
  }

  const filter = getManagerResultsFilter();
  const rows = getManagerResultRows({ managers, teamDraft, playerDraft, playerPerformances, matchResults, filter });

  if (rows.length === 0) {
    managerResultsRows.innerHTML = `<tr><td class="table-message" colspan="3">No manager results found.</td></tr>`;
    return;
  }

  managerResultsRows.innerHTML = rows.map((manager, index) => {
    const detailId = `manager-detail-${escapeHtml(manager.id)}`;
    const awardFilter = filter === "all" ? "" : filter;
    const awards = getAwardsForManager(manager, { competition: "2026 World Cup", standings: awardFilter, year: "2026" });

    return `
      <tr class="manager-result-row" data-manager-result-row aria-expanded="false" aria-controls="${detailId}" role="button" tabindex="0">
        <td data-label="Rank">${escapeHtml(formatRankDisplay(manager, index, rows))}</td>
        <td data-label="Manager">
          <span class="manager-result-awards">
            ${renderManagerChip(manager)}
            ${renderAwardBadges(awards)}
          </span>
        </td>
        <td data-label="Points">${escapeHtml(formatPoints(manager.points))}</td>
      </tr>
      <tr class="manager-detail-row" id="${detailId}" hidden>
        <td colspan="3">
          ${renderManagerDraftDetails(manager)}
        </td>
      </tr>
    `;
  }).join("");
}

function getManagerResultsFilter() {
  const value = managerResultsFilter?.value || "all";

  return ["all", "players", "nations"].includes(value) ? value : "all";
}

function toggleManagerResultRow(managerRow) {
  const isExpanded = managerRow.getAttribute("aria-expanded") === "true";
  const detailRow = managerRow.nextElementSibling;

  managerResultsRows.querySelectorAll("[data-manager-result-row]").forEach((row) => {
    row.setAttribute("aria-expanded", "false");
    row.classList.remove("is-manager-expanded");

    const rowDetail = row.nextElementSibling;
    if (rowDetail?.classList.contains("manager-detail-row")) {
      rowDetail.hidden = true;
    }
  });

  if (isExpanded || !detailRow?.classList.contains("manager-detail-row")) {
    return;
  }

  managerRow.setAttribute("aria-expanded", "true");
  managerRow.classList.add("is-manager-expanded");
  detailRow.hidden = false;
}

function toggleStandingResultRow(container, standingRow) {
  const isExpanded = standingRow.getAttribute("aria-expanded") === "true";
  const detailRow = standingRow.nextElementSibling;

  container.querySelectorAll("[data-standing-result-row]").forEach((row) => {
    row.setAttribute("aria-expanded", "false");
    row.classList.remove("is-standing-expanded");

    const rowDetail = row.nextElementSibling;
    if (rowDetail?.classList.contains("standing-result-detail-row")) {
      rowDetail.hidden = true;
    }
  });

  if (isExpanded || !detailRow?.classList.contains("standing-result-detail-row")) {
    return;
  }

  standingRow.setAttribute("aria-expanded", "true");
  standingRow.classList.add("is-standing-expanded");
  detailRow.hidden = false;
}

function renderStandingResultDetails(details = []) {
  const pointDetails = details.filter((detail) => Number(detail.points) > 0);

  if (pointDetails.length === 0) {
    return `<div class="manager-detail-empty">No point details found.</div>`;
  }

  return `
    <div class="standing-result-detail-panel">
      <ul class="standing-result-detail-list">
        ${pointDetails.map((detail) => {
          return `
            <li>
              <span>${escapeHtml(getStandingResultMatchLabel(detail))}</span>
              <strong>${escapeHtml(formatPoints(detail.points))}</strong>
            </li>
          `;
        }).join("")}
      </ul>
    </div>
  `;
}

function getStandingResultMatchLabel(detail) {
  const match = getMatchById(detail.matchId);

  if (match) {
    return `${match.Home} v ${match.Away}`;
  }

  if (detail.team && detail.opponent) {
    return `${detail.team} v ${detail.opponent}`;
  }

  return detail.matchId ? `Match ${detail.matchId}` : "Match";
}

function getMatchById(matchId) {
  const normalizedId = String(matchId ?? "").trim();

  if (!normalizedId || !siteData.matches) {
    return null;
  }

  return siteData.matches.find((match) => String(match.Id ?? match.ID ?? match.id ?? "").trim() === normalizedId) ?? null;
}

function renderManagerDraftDetails(manager) {
  if (!manager.drafts.length) {
    return `<div class="manager-detail-empty">No drafted items found.</div>`;
  }

  const nationItems = manager.drafts.filter((draft) => draft.type === "Nation");
  const playerItems = manager.drafts.filter((draft) => draft.type === "Player");

  return `
    <div class="manager-detail-panel">
      ${renderManagerDraftGroup("Nations", nationItems)}
      ${renderManagerDraftGroup("Players", playerItems)}
    </div>
  `;
}

function renderManagerDraftGroup(label, drafts) {
  if (drafts.length === 0) {
    return "";
  }

  return `
    <section class="manager-draft-group">
      <h3>${escapeHtml(label)}</h3>
      <ul class="manager-draft-list">
        ${drafts.map((draft) => {
          return `
            <li>
              <span>${renderManagerDraftName(draft)}</span>
              <strong>${escapeHtml(formatPoints(draft.points))}</strong>
            </li>
          `;
        }).join("")}
      </ul>
    </section>
  `;
}

function renderManagerDraftName(draft) {
  if (draft.type !== "Player") {
    return escapeHtml(draft.name);
  }

  const name = String(draft.name ?? "").trim();
  const nation = String(draft.nation ?? "").trim();
  const label = name && nation ? `${name} (${nation})` : name || nation;

  return renderPlayerNameWithPosition(label, draft.position);
}

function getManagerResultRows({ managers, teamDraft, playerDraft, playerPerformances, matchResults, filter = "all" }) {
  const includeNations = filter === "all" || filter === "nations";
  const includePlayers = filter === "all" || filter === "players";
  const managerRows = new Map();

  for (const manager of managers) {
    const managerId = manager["Manager ID"];

    if (!managerId) {
      continue;
    }

    managerRows.set(managerId, {
      drafts: [],
      id: managerId,
      name: manager.Name,
      nationCount: 0,
      playerCount: 0,
      points: 0,
    });
  }

  if (includeNations) {
    for (const draft of teamDraft) {
      const manager = managerRows.get(draft["Manager ID"]);
      const nation = normalizeNationName(draft.Team);

      if (!manager || !nation) {
        continue;
      }

      manager.nationCount += 1;
      const points = getDraftNationPoints(draft, matchResults);
      manager.points += points;
      manager.drafts.push({
        name: nation,
        points,
        type: "Nation",
      });
    }
  }

  if (includePlayers) {
    for (const draft of playerDraft) {
      const manager = managerRows.get(draft["Manager ID"]);
      const playerId = draft["Player ID"];
      const playerName = draft.Player;

      if (!manager || (!playerId && !playerName)) {
        continue;
      }

      manager.playerCount += 1;
      const points = getDraftPlayerPoints(draft, playerPerformances);
      const nation = normalizeNationName(draft.Nation || draft.Team);
      const position = getPlayerPosition({
        id: playerId,
        name: playerName,
        position: draft.Position,
      });
      manager.points += points;
      manager.drafts.push({
        name: playerName,
        nation,
        points,
        position,
        type: "Player",
      });
    }
  }

  return rankRows(
    [...managerRows.values()].sort((firstManager, secondManager) => {
      if (secondManager.points !== firstManager.points) {
        return secondManager.points - firstManager.points;
      }

      return firstManager.name.localeCompare(secondManager.name);
    })
  );
}

function getBestDraftedNationsLeagueRows(results) {
  return rankRows(
    getDraftedNationsLeagueRows(results)
      .map((nation) => {
        const bestDetail = getBestStandingDetail(nation.details);

        return {
          ...nation,
          details: bestDetail ? [bestDetail] : [],
          draws: 0,
          losses: 0,
          matches: bestDetail ? 1 : 0,
          points: bestDetail?.points ?? 0,
          recordLabel: "Best Game",
          wins: 0,
        };
      })
      .filter((nation) => nation.points > 0)
      .sort((firstNation, secondNation) => {
        if (secondNation.points !== firstNation.points) {
          return secondNation.points - firstNation.points;
        }

        return firstNation.name.localeCompare(secondNation.name);
      })
  );
}

function getBestDraftedPlayerChampionshipRows(performances) {
  return rankRows(
    getDraftedPlayerChampionshipRows(performances)
      .map((player) => {
        const bestDetail = getBestStandingDetail(player.details);

        return {
          ...player,
          details: bestDetail ? [bestDetail] : [],
          matches: bestDetail ? 1 : 0,
          points: bestDetail?.points ?? 0,
        };
      })
      .filter((player) => player.points > 0)
      .sort((firstPlayer, secondPlayer) => {
        if (secondPlayer.points !== firstPlayer.points) {
          return secondPlayer.points - firstPlayer.points;
        }

        return firstPlayer.name.localeCompare(secondPlayer.name);
      })
  );
}

function getDraftNationPoints(draft, matchResults = []) {
  const nation = normalizeNationName(draft.Team);

  if (!nation) {
    return 0;
  }

  return filterRowsBySelectedRound(matchResults).reduce((total, result) => {
    const matchRoundId = getStandingSourceRoundId(result);

    if (!isDraftActiveForMatchRound(draft, matchRoundId, "nation")) {
      return total;
    }

    const points = getNationPointsForResult(result, nation);
    return total + (Number.isFinite(points) ? points : 0);
  }, 0);
}

function getDraftPlayerPoints(draft, playerPerformances = []) {
  return filterRowsBySelectedRound(playerPerformances).reduce((total, performance) => {
    const matchRoundId = getStandingSourceRoundId(performance);

    if (!isDraftActiveForMatchRound(draft, matchRoundId, "player") || !isPerformanceForDraft(performance, draft)) {
      return total;
    }

    const points = getPlayerPerformancePoints(performance);
    return total + (Number.isFinite(points) ? points : 0);
  }, 0);
}

function isPerformanceForDraft(performance, draft) {
  const draftPlayerId = String(draft["Player ID"] ?? "").trim();
  const performancePlayerId = String(performance["Player ID"] ?? "").trim();

  if (draftPlayerId && performancePlayerId && draftPlayerId === performancePlayerId) {
    return true;
  }

  return getPlayerNameLookupKey(performance.Name) === getPlayerNameLookupKey(draft.Player);
}

function buildManagerDraftLookups({ managers, teamDraft, playerDraft }) {
  const managersById = new Map();
  const nationManagers = new Map();
  const playerManagersById = new Map();
  const playerManagersByName = new Map();

  for (const manager of managers) {
    const managerMeta = getManagerMeta(manager);

    if (managerMeta.id) {
      managersById.set(managerMeta.id, managerMeta);
    }
  }

  for (const draft of teamDraft) {
    const manager = managersById.get(draft["Manager ID"]);
    const nation = normalizeNationName(draft.Team);

    if (manager && nation) {
      nationManagers.set(normalizeLookupName(nation), manager);
    }
  }

  for (const draft of playerDraft) {
    const manager = managersById.get(draft["Manager ID"]);

    if (!manager) {
      continue;
    }

    if (draft["Player ID"]) {
      playerManagersById.set(String(draft["Player ID"]), manager);
    }

    if (draft.Player) {
      playerManagersByName.set(normalizeLookupName(draft.Player), manager);
    }
  }

  return { managersById, nationManagers, playerManagersById, playerManagersByName };
}

function buildPlayerPositionLookups(players) {
  const byId = new Map();
  const byName = new Map();

  for (const player of players) {
    const position = normalizePlayerPosition(player.position);

    if (!position) {
      continue;
    }

    if (player.id) {
      byId.set(String(player.id), position);
    }

    if (player.name) {
      byName.set(getPlayerNameLookupKey(player.name), position);
    }
  }

  return { byId, byName };
}

function renderManagerResultsError(error) {
  if (!managerResultsRows) {
    return;
  }

  managerResultsRows.innerHTML = `
    <tr>
      <td class="table-message" colspan="3">Unable to load manager results: ${escapeHtml(error.message)}</td>
    </tr>
  `;
}

function parsePoints(value) {
  if (value === undefined || value === null || value === "") {
    return 0;
  }

  return Number(String(value).replace(/,/g, ""));
}

function getPlayerPerformancePoints(performance) {
  const points = parsePoints(performance?.Points);

  if (!Number.isFinite(points)) {
    return points;
  }

  return points + (shouldUseNationTestScoring() ? 1 : 0);
}

function formatPoints(value) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return String(value ?? "");
  }

  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatMatchCount(value) {
  return Number(value) === 1 ? "1 match" : `${value} matches`;
}

function formatRecord(nation) {
  return `${nation.wins}-${nation.draws}-${nation.losses}`;
}

function isPenaltyResult(result) {
  const value = String(result.Penalties || "").trim().toLowerCase();

  if (!value || ["false", "no", "n", "0"].includes(value)) {
    return false;
  }

  return true;
}

function buildTeamPotLookup(teams = []) {
  const lookup = new Map();

  for (const team of teams) {
    const name = normalizeNationName(team.Team || team.Nation || team.Name);
    const pot = normalizePot(team.Pot);

    if (name && pot) {
      lookup.set(normalizeLookupName(name), pot);
    }
  }

  return lookup;
}

function shouldUseNationTestScoring() {
  return nationTestScoringToggle?.checked ?? false;
}

function getNationResultPoints(result) {
  return shouldUseNationTestScoring()
    ? getTestNationResultPoints(result)
    : getSheetNationResultPoints(result);
}

function getSheetNationResultPoints(result) {
  const outcome = String(result.Result || "").trim().toLowerCase();
  const winnerPoints = getWinnerPoints(result);
  const penaltyLoserPoints = isPenaltyResult(result) ? 2 : 0;

  if (outcome === "win") {
    return { opponent: penaltyLoserPoints, team: winnerPoints };
  }

  if (outcome === "lose" || outcome === "loss") {
    return { opponent: winnerPoints, team: penaltyLoserPoints };
  }

  if (outcome === "draw" || outcome === "tie") {
    return { opponent: 1, team: 1 };
  }

  return { opponent: 0, team: 0 };
}

function getTestNationResultPoints(result) {
  return {
    opponent: sumTestNationPointParts(result, "opponent"),
    team: sumTestNationPointParts(result, "team"),
  };
}

function getTestNationPointBreakdown(result, nationName) {
  const nationKey = normalizeLookupName(normalizeNationName(nationName));
  const team = normalizeNationName(result.Team);
  const opponent = normalizeNationName(result.Opponent);
  const teamKey = normalizeLookupName(team);
  const opponentKey = normalizeLookupName(opponent);
  const side = nationKey === teamKey ? "team" : nationKey === opponentKey ? "opponent" : "";

  if (!side) {
    return null;
  }

  const parts = getTestNationPointParts(result, side);
  const roundId = getStandingSourceRoundId(result);

  return {
    matchId: String(result["Match ID"] ?? "").trim(),
    matchLabel: `${team} v ${opponent}`,
    opponent,
    opponentPot: getTeamPot(opponent),
    parts,
    resultLabel: formatNationResultLabel(result),
    roundId,
    roundLabel: getRoundPrettyName(roundId),
    team,
    teamPot: getTeamPot(team),
    total: parts.reduce((sum, part) => sum + part.points, 0),
  };
}

function sumTestNationPointParts(result, side) {
  return getTestNationPointParts(result, side).reduce((sum, part) => sum + part.points, 0);
}

function getTestNationPointParts(result, side) {
  const outcome = String(result.Result || "").trim().toLowerCase();
  const teamPot = getTeamPot(result.Team);
  const opponentPot = getTeamPot(result.Opponent);

  if (outcome === "win") {
    return side === "team"
      ? getTestWinPointParts(result, teamPot, opponentPot)
      : getTestPenaltyLoserPointParts(result);
  }

  if (outcome === "lose" || outcome === "loss") {
    return side === "opponent"
      ? getTestWinPointParts(result, opponentPot, teamPot)
      : getTestPenaltyLoserPointParts(result);
  }

  if (outcome === "draw" || outcome === "tie") {
    return getTestDrawPointParts(side === "team" ? teamPot : opponentPot, side === "team" ? opponentPot : teamPot);
  }

  return [];
}

function getTestWinPointParts(result, winnerPot, loserPot) {
  const basePoints = isGroupStageResult(result) ? 9 : 15;
  const parts = [
    {
      detail: isGroupStageResult(result) ? "Group stage win" : "Knockout stage win",
      label: "Base result",
      points: basePoints,
    },
  ];
  const knockoutBonus = isGroupStageResult(result) ? 0 : getTestKnockoutPotBonus(winnerPot);
  const upsetBonus = isUpsetPotResult(winnerPot, loserPot) ? 3 : 0;

  if (knockoutBonus) {
    parts.push({
      detail: `Pot ${String(winnerPot).toUpperCase()} knockout win`,
      label: "Knockout pot bonus",
      points: knockoutBonus,
    });
  }

  if (upsetBonus) {
    parts.push({
      detail: `Pot ${String(winnerPot).toUpperCase()} beat Pot ${String(loserPot).toUpperCase()}`,
      label: "Upset win bonus",
      points: upsetBonus,
    });
  }

  return parts;
}

function getTestWinPoints(result, winnerPot, loserPot) {
  return getTestWinPointParts(result, winnerPot, loserPot).reduce((sum, part) => sum + part.points, 0);
}

function getTestPenaltyLoserPointParts(result) {
  return isPenaltyResult(result)
    ? [{ detail: "Lost after penalties", label: "Penalty shootout loss", points: 6 }]
    : [];
}

function getTestPenaltyLoserPoints(result) {
  return getTestPenaltyLoserPointParts(result).reduce((sum, part) => sum + part.points, 0);
}

function getTestDrawPointParts(teamPot, opponentPot) {
  const parts = [{ detail: "Draw", label: "Base result", points: 3 }];
  const upsetBonus = isUpsetDrawPotResult(teamPot, opponentPot) ? 3 : 0;

  if (upsetBonus) {
    parts.push({
      detail: `Pot ${String(teamPot).toUpperCase()} drew Pot ${String(opponentPot).toUpperCase()}`,
      label: "Upset draw bonus",
      points: upsetBonus,
    });
  }

  return parts;
}

function getTestDrawPoints(teamPot, opponentPot) {
  return getTestDrawPointParts(teamPot, opponentPot).reduce((sum, part) => sum + part.points, 0);
}

function formatNationResultLabel(result) {
  const outcome = String(result.Result || "").trim();
  const points = getNationResultPoints(result);
  const teamPoints = formatPoints(points.team);
  const opponentPoints = formatPoints(points.opponent);
  const resultText = outcome ? `${outcome}: ` : "";

  return `${resultText}${normalizeNationName(result.Team)} ${teamPoints} pts, ${normalizeNationName(result.Opponent)} ${opponentPoints} pts`;
}

function getTestKnockoutPotBonus(pot) {
  return TEST_KNOCKOUT_POT_BONUSES[normalizePot(pot)] ?? 0;
}

function isGroupStageResult(result) {
  const stage = String(result.Stage || "").toLowerCase();

  if (stage) {
    return stage.includes("group");
  }

  const roundId = Number(getStandingSourceRoundId(result));

  return Number.isFinite(roundId) && roundId >= 1 && roundId <= 3;
}

function isUpsetPotResult(winnerPot, loserPot) {
  const winnerRank = getPotRank(winnerPot);
  const loserRank = getPotRank(loserPot);

  return Boolean(winnerRank && loserRank && winnerRank > loserRank);
}

function isUpsetDrawPotResult(teamPot, opponentPot) {
  const teamRank = getPotRank(teamPot);
  const opponentRank = getPotRank(opponentPot);

  return Boolean(teamRank && opponentRank && teamRank > opponentRank && teamRank - opponentRank > 1);
}

function getPotRank(pot) {
  return NATION_POT_RANKS[normalizePot(pot)] ?? null;
}

function getTeamPot(teamName) {
  const teamKey = normalizeLookupName(normalizeNationName(teamName));

  return siteData.teamPots?.get(teamKey) ?? "";
}

function normalizePot(pot) {
  return String(pot ?? "").trim().toLowerCase();
}

function getFallbackWinPoints(result) {
  return isGroupStageResult(result) ? 3 : 5;
}

function getWinnerPoints(result) {
  const rawPoints = String(result.Points ?? "").trim();
  const points = parsePoints(rawPoints);

  return rawPoints && Number.isFinite(points) ? points : getFallbackWinPoints(result);
}

function normalizeNationName(value) {
  const nation = String(value ?? "").trim();
  const aliases = {
    bosnia: "Bosnia and Herzegovina",
  };

  return aliases[normalizeLookupName(nation)] ?? nation;
}

function getManagerMeta(manager) {
  const name = manager.name || manager.Name || "";
  const displayName = manager.displayName || manager["Display Name"] || getManagerDisplayName(name);
  const explicitColor = manager.color || manager.Color;
  const normalizedColor = explicitColor ? `#${String(explicitColor).replace(/^#/, "")}` : "";
  const isAdmin = isAdminManager({ ...manager, displayName, name });

  return {
    color: normalizedColor || MANAGER_COLORS[normalizeLookupName(displayName)] || "#5f6978",
    displayName,
    id: manager.id || manager["Manager ID"] || manager.ID,
    isAdmin,
    name,
  };
}

function getManagerDisplayName(name) {
  return String(name ?? "").trim().split(/\s+/)[0] || "Manager";
}

function isAdminManager(manager) {
  const names = [
    manager.displayName,
    manager["Display Name"],
    manager.name,
    manager.Name,
  ]
    .filter(Boolean)
    .flatMap((value) => {
      const normalizedName = normalizeLookupName(value);
      return [normalizedName, normalizedName.split(/\s+/)[0]];
    });

  return names.includes("wyatt");
}

function getContrastTextColor(color) {
  const hex = normalizeHexColor(color);

  if (!hex) {
    return "#ffffff";
  }

  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  const luminance = (red * 0.299 + green * 0.587 + blue * 0.114) / 255;

  return luminance > 0.58 ? "#111827" : "#ffffff";
}

function normalizeHexColor(color) {
  const raw = String(color || "").trim().replace(/^#/, "");

  if (/^[0-9a-f]{3}$/i.test(raw)) {
    return raw.split("").map((digit) => digit + digit).join("").toLowerCase();
  }

  if (/^[0-9a-f]{6}$/i.test(raw)) {
    return raw.toLowerCase();
  }

  return "";
}

function getPlayerManager(player) {
  const drafts = siteData.managerDrafts;

  if (!drafts) {
    return null;
  }

  return drafts.playerManagersById.get(String(player.id)) ?? drafts.playerManagersByName.get(normalizeLookupName(player.name));
}

function getPlayerPosition(player) {
  const lookups = siteData.playerPositionLookups;

  if (!lookups) {
    return normalizePlayerPosition(player.position);
  }

  return lookups.byId.get(String(player.id)) ??
    lookups.byName.get(getPlayerNameLookupKey(player.name)) ??
    normalizePlayerPosition(player.position);
}

function getPlayerPositionByName(name) {
  return siteData.playerPositionLookups?.byName.get(getPlayerNameLookupKey(name)) ?? null;
}

function getNationManager(nation) {
  return siteData.managerDrafts?.nationManagers.get(normalizeLookupName(normalizeNationName(nation))) ?? null;
}

function getManagerByName(name) {
  const normalizedName = normalizeLookupName(name);

  if (!normalizedName || !siteData.managerDrafts) {
    return null;
  }

  for (const manager of siteData.managerDrafts.managersById.values()) {
    if (
      normalizeLookupName(manager.name) === normalizedName ||
      normalizeLookupName(manager.displayName) === normalizedName
    ) {
      return manager;
    }
  }

  return null;
}

function getManagerForDraft(draft) {
  return siteData.managerDrafts?.managersById.get(draft?.["Manager ID"]) ?? null;
}

function renderStandingDetail(value, manager, options = {}) {
  const parts = [`<span class="standing-detail-main">${escapeHtml(value)}</span>`];

  if (manager) {
    parts.push(`
      <span class="standing-manager-with-awards">
        ${renderManagerChip(manager)}
        ${renderAwardBadges(getAwardsForManager(manager, options))}
      </span>
    `);
  }

  return `<span class="standing-detail">${parts.join("")}</span>`;
}

function renderManagerChip(manager) {
  const managerMeta = getManagerMeta(manager);

  return `
    <span class="manager-chip" style="--manager-color: ${managerMeta.color}">
      <span class="manager-dot" aria-hidden="true"></span>
      <span class="manager-name">${escapeHtml(managerMeta.displayName)}</span>
    </span>
  `;
}

function renderMatchDataName(name) {
  const position = getPlayerPositionByName(name);
  const formattedName = formatDataName(name);

  return position ? renderPlayerNameWithPosition(formattedName, position, { isHtml: true }) : formattedName;
}

function renderPlayerNameWithPosition(name, position, options = {}) {
  const icon = renderPositionIcon(position);
  const renderedName = options.isHtml ? name : escapeHtml(name);

  if (!icon) {
    return renderedName;
  }

  return `
    <span class="player-position-label">
      ${icon}
      <span>${renderedName}</span>
    </span>
  `;
}

function renderPositionIcon(position) {
  const normalizedPosition = normalizePlayerPosition(position);
  const labels = {
    defender: "Defender",
    forward: "Forward",
    goalkeeper: "Goalkeeper",
    midfielder: "Midfielder",
  };

  if (!normalizedPosition) {
    return "";
  }

  return `
    <span class="position-icon position-icon--${normalizedPosition}" role="img" aria-label="${labels[normalizedPosition]}">
      ${getPositionIconSvg(normalizedPosition)}
    </span>
  `;
}

function getPositionIconSvg(position) {
  const icons = {
    defender: `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M12 3l7 3v5c0 4.5-2.7 7.8-7 10-4.3-2.2-7-5.5-7-10V6l7-3z"></path>
      </svg>
    `,
    forward: `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M5 17V8h14v9"></path>
        <path d="M5 11h14M9.5 8v9M14.5 8v9"></path>
        <circle cx="12" cy="16" r="2"></circle>
      </svg>
    `,
    goalkeeper: `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M6 13V7a2 2 0 0 1 4 0v5"></path>
        <path d="M10 12V5a2 2 0 0 1 4 0v7"></path>
        <path d="M14 12V7a2 2 0 0 1 4 0v7"></path>
        <path d="M6 13l2 6h8l2-5"></path>
      </svg>
    `,
    midfielder: `
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <rect x="4" y="5" width="16" height="14" rx="2"></rect>
        <path d="M12 5v14M4 12h16"></path>
        <circle cx="12" cy="12" r="2"></circle>
      </svg>
    `,
  };

  return icons[position] ?? "";
}

function normalizePlayerPosition(position) {
  const value = normalizeLookupName(position);

  if (!value) {
    return null;
  }

  if (value.includes("goal") || value === "gk") {
    return "goalkeeper";
  }

  if (value.includes("def") || ["cb", "lb", "rb", "lcb", "rcb", "lwb", "rwb"].includes(value)) {
    return "defender";
  }

  if (value.includes("mid") || ["cm", "dm", "am", "cdm", "cam", "lm", "rm"].includes(value)) {
    return "midfielder";
  }

  if (
    value.includes("forward") ||
    value.includes("striker") ||
    value.includes("wing") ||
    ["fw", "st", "cf", "lw", "rw"].includes(value)
  ) {
    return "forward";
  }

  return null;
}

function getPlayerNameLookupKey(name) {
  return normalizeLookupName(
    String(name ?? "")
      .replace(/\([^)]*\)/g, " ")
      .replace(/\s+/g, " ")
  );
}

function renderTestingPlayers(players) {
  if (!testingPlayerRows) {
    return;
  }

  if (players.length === 0) {
    testingPlayerRows.innerHTML = `<tr><td colspan="7">No player data found.</td></tr>`;
    return;
  }

  testingPlayerRows.innerHTML = players.map((player) => {
    return `
      <tr>
        <td>${escapeHtml(player.id)}</td>
        <td>${escapeHtml(player.name)}</td>
        <td>${escapeHtml(player.team)}</td>
        <td>${escapeHtml(player.position)}</td>
        <td>${escapeHtml(player.playerNumber)}</td>
        <td>${escapeHtml(player.transfermarktPrice)}</td>
        <td>${escapeHtml(player.drafted)}</td>
      </tr>
    `;
  }).join("");
}

function renderTestingError(error) {
  if (!testingPlayerRows) {
    return;
  }

  testingPlayerRows.innerHTML = `
    <tr>
      <td colspan="7">Unable to load Google Sheets data: ${escapeHtml(error.message)}</td>
    </tr>
  `;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDataName(value) {
  return escapeHtml(value).replaceAll("\n", "<br>");
}
