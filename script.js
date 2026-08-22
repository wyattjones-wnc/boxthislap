import { loadJson, loadPlayers, loadSheet, loadSheetText } from "./dataLoader.js?v=202608200001";
import {
  WORKFLOW_LOOKAHEAD_DAYS,
  THEME_STORAGE_KEY,
  MANAGER_SESSION_STORAGE_KEY,
  MANAGER_PORTAL_ENDPOINT,
  FOOTY_DATA_ENDPOINT,
  FOOTY_PUSH_ENDPOINT,
  NEXT_DATA_ENDPOINT,
  GUIDES_PROGRESS_ENDPOINT,
  RANKINGS_ENDPOINT,
  YOUTUBE_INBOX_ENDPOINT,
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
} from "./modules/siteConfig.js?v=202608190003";

import {
  pageLinks,
  pages,
  tabs,
  tabPanels,
  headerArt,
  navGroups,
  brandLogo,
  themeToggle,
  copyCurrentPageLinkButton,
  siteVersion,
  imageCacheToggle,
  imageCachePurge,
  imageCacheStatus,
  adminOnlyElements,
  nonAdminOnlyElements,
  loginOnlyElements,
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
  followedTeamShortcuts,
  managerHubSubtitle,
  workflowCount,
  workflowList,
  managerSummaryList,
  managerSummaryYearSelect,
  managerAwardsList,
  leagueAwardsList,
  standingsAwards,
  standingsAwardsList,
  leagueYearSelect,
  leagueList,
  footyPastToggle,
  footyCompetitionToggle,
  footyCompetitionControls,
  footyCompetitionSelect,
  footyNotificationToggle,
  footyNotificationStatus,
  footyFilterToggle,
  footyFilters,
  footySearchInput,
  footyDateFromFilter,
  footyDateToFilter,
  footyMatchPeriodFilter,
  footyCompetitionPastFilter,
  footyFriendliesFilter,
  footyTeamFilter,
  footyScheduleList,
  footyTeamTitle,
  footyTeamContent,
  footyTeamPlayerToggle,
  footyTeamViewModeButtons,
  footyTradingCardDialog,
  footyTradingCardTitle,
  footyTradingCardContent,
  footyTradingCardClose,
  footyGoalAssistsButton,
  footyGoalAssistsBack,
  footyGoalAssistsForm,
  footyGoalAssistsAdd,
  footyGoalAssistsCopy,
  footyGoalAssistsClear,
  footyGoalAssistsSaved,
  footyGoalAssistsFeedback,
  footyScorerNameInput,
  footyAssisterNameInput,
  footyPenaltyInput,
  footyNoteDialog,
  footyNoteForm,
  footyNoteClose,
  footyNoteCancel,
  footyNoteSave,
  footyNoteMatchId,
  footyNoteTitle,
  footyNoteHomeScore,
  footyNoteAwayScore,
  footyNoteText,
  footyNoteHighlightLink,
  footyNoteStatus,
  nextFilterToggle,
  nextFilters,
  nextSearchInput,
  nextCompletedFilter,
  nextPreviousFilter,
  nextNonAdminFilter,
  nextEditModeFilter,
  nextDateFromFilter,
  nextDateToFilter,
  nextPriorityMin,
  nextPriorityMax,
  nextPriorityMinValue,
  nextPriorityMaxValue,
  nextList,
  nextAddButton,
  nextItemDialog,
  nextItemForm,
  nextItemDialogTitle,
  nextItemId,
  nextThingInput,
  nextImageUrlInput,
  nextStartDateInput,
  nextEndDateInput,
  nextTimeInput,
  nextPriorityInput,
  nextItemCompletedInput,
  nextItemNonAdminInput,
  nextItemStatus,
  nextItemClose,
  nextItemCancel,
  todoList,
  todoRandomButton,
  todoRandomDialog,
  todoRandomContent,
  todoRandomClose,
  todoRandomAgain,
  todoRandomDone,
  todoCompareButton,
  todoViewModeButtons,
  todoSnapshotSelect,
  todoSnapshotCompareSelect,
  todoNormalizeButton,
  todoFilterToggle,
  todoFilters,
  todoMoreDataToggle,
  todoEditToggle,
  todoStatusFilters,
  todoAddButton,
  todoItemDialog,
  todoItemForm,
  todoItemId,
  todoNameInput,
  todoOrderInput,
  todoLowHourInput,
  todoHighHourInput,
  todoParentInput,
  todoParentIdInput,
  todoImageUrlInput,
  todoStartedInput,
  todoArchivedInput,
  todoPlatinumCleanupInput,
  todoCompletedInput,
  todoUnpurchasedInput,
  todoItemStatus,
  todoItemClose,
  todoItemCancel,
  wantList,
  wantRandomButton,
  wantRandomDialog,
  wantRandomContent,
  wantRandomClose,
  wantRandomAgain,
  wantRandomDone,
  wantCompareButton,
  wantViewModeButtons,
  wantSnapshotSelect,
  wantSnapshotCompareSelect,
  wantNormalizeButton,
  wantFilterToggle,
  wantFilters,
  wantEditToggle,
  wantStatusFilters,
  wantAddButton,
  wantItemDialog,
  wantItemForm,
  wantItemDialogTitle,
  wantItemId,
  wantNameInput,
  wantOrderInput,
  wantPriceInput,
  wantImageUrlInput,
  wantArchivedInput,
  wantCompletedInput,
  wantItemStatus,
  wantItemClose,
  wantItemCancel,
  wantMoveDialog,
  wantMoveName,
  wantMoveStatus,
  wantMoveClose,
  wantMoveCancel,
  wantMoveConfirm,
  rankingTabs,
  rankingPanels,
  rankingAddButton,
  rankingCompareButton,
  rankingFilterToggle,
  rankingFilters,
  rankingMoreDataToggle,
  rankingShowExcludedToggle,
  rankingManagerSelect,
  rankingReadOnly,
  rankingShowArchivedControl,
  rankingShowArchivedToggle,
  rankingOwnerOnlyElements,
  rankingViewModeButtons,
  rankingSnapshotSelect,
  rankingCompareSelect,
  rankingNormalizeButton,
  rankingItemDialog,
  rankingItemForm,
  rankingItemDialogTitle,
  rankingItemKind,
  rankingItemId,
  rankingItemName,
  rankingItemRank,
  rankingItemStatus,
  rankingItemClose,
  rankingItemCancel,
  rankingBattleDialog,
  rankingBattleTitle,
  rankingBattleStatus,
  rankingBattleOptions,
  rankingBattleClose,
  rankingBattleSkip,
  rankingBattleDone,
  rankingNormalizeDialog,
  rankingNormalizeReason,
  rankingNormalizeStatus,
  rankingNormalizeClose,
  rankingNormalizeCancel,
  rankingNormalizeConfirm,
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
} from "./modules/domRefs.js?v=202608180004";
import { createRouter, scrollToPageTop } from "./modules/router.js?v=202608190003";
import { createThemeController } from "./modules/theme.js?v=202607210001";
import { createGuideDataLoader } from "./modules/guideData.js?v=202608200001";
import { createGuidesController } from "./modules/guides.js?v=202608220334";
import { createPlatinumsController } from "./modules/platinums.js?v=202608171756";
import { createYouTubeInboxController } from "./modules/youtubeInbox.js?v=202608210002";
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
let activeFootyScheduleMode = "teams";
let activeFootyCompetitionKey = "";
let shouldSuppressNextFootyDropdownClick = false;
let activeFootyTeamViewMode = "schedule";
const footyTeamFixtureLimits = new Map();
let shouldExportFootyTradingCards = false;
let shouldShowNextFilters = false;
let activeNextItemId = "";
let shouldShowTodoFilters = false;
let shouldShowTodoMoreData = false;
let shouldShowTodoEditMode = false;
let activeTodoViewMode = "manual";
let activeTodoSnapshotId = "current";
let activeTodoCompareSnapshotId = "";
let activeTodoStatusFilter = "";
let activeTodoItemId = "";
let draggedTodoItemId = "";
let didMoveTodoPointer = false;
let activeTradingCardExportUrls = [];
let activeRankingKind = "games";
let activeRankingViewMode = "manual";
let activeRankingSnapshotId = "current";
let activeRankingCompareSnapshotId = "";
let shouldShowRankingFilters = false;
let shouldShowRankingMoreData = false;
let shouldShowRankingExcluded = false;
let shouldShowRankingArchived = false;
let activeRankingManagerId = "";
let rankingCatalog = null;
const rankingSets = new Map();
let draggedRankingItemId = "";
let draggedRankingKind = "";
let didMoveRankingPointer = false;
let rankingsLoadPromise = null;
let todoRankingLoadPromise = null;
let wantRankingLoadPromise = null;
let rankingAssetManifestPromise = null;
let activeRankingBattle = null;
let normalizingRankingKind = "";
let activePageName = "";
let shouldShowWantFilters = false;
let shouldShowWantEditMode = false;
let activeWantViewMode = "manual";
let activeWantSnapshotId = "current";
let activeWantCompareSnapshotId = "";
let activeWantStatusFilter = "";
let activeWantItemId = "";
let pendingWantMoveItemId = "";
let draggedWantItemId = "";
let didMoveWantPointer = false;
const FOOTY_INITIAL_FIXTURE_LIMIT = 5;
const FOOTY_JSONP_TIMEOUT_MS = 12000;
const FOOTY_ROSTER_JSONP_TIMEOUT_MS = 45000;
const FOOTY_MATCH_NOTES_FRESH_MS = 5 * 60 * 1000;
const FOOTY_NOTIFICATION_STORAGE_KEY = "boxthislap-footy-start-notifications";
const FOOTY_NOTIFICATION_SENT_STORAGE_KEY = "boxthislap-footy-start-notifications-sent";
const FOOTY_PUSH_SUBSCRIPTION_STORAGE_KEY = "boxthislap-footy-push-subscription";
const FOOTY_NOTIFICATION_CHECK_INTERVAL_MS = 60 * 1000;
const FOOTY_NOTIFICATION_WINDOW_MS = 10 * 60 * 1000;
const IMAGE_CACHE_STORAGE_KEY = "boxthislap-image-cache-enabled";
const FOOTY_NOTIFICATION_OFFSETS = [
  { key: "2h", label: "in 2 hours", minutes: 120 },
  { key: "1h", label: "in 1 hour", minutes: 60 },
  { key: "start", label: "now", minutes: 0 },
];
let footyNotificationTimer = null;
let isFootyNotificationBusy = false;
let footyMatchNotesLoadPromise = null;
const pageDataPromises = new Map();
const sharedDataPromises = new Map();
const fantasyCriticLoadPromises = new Map();
const formulaOneDataPromises = new Map();
const formulaOneCalculatorStates = new Map();
const FORMULA_ONE_CALCULATOR_CONFIG = {
  2026: {
    driversSource: "formulaOne2026CalculatorDrivers",
    optionsSource: "formulaOne2026CalculatorOptions",
    sprintsSource: "formulaOne2026CalculatorSprints",
    summarySource: "formulaOne2026CalculatorSummary",
  },
};
const FORMULA_ONE_DRIVER_COLOR_PALETTE = [
  "#e10600",
  "#0072ce",
  "#00a19c",
  "#ff8700",
  "#7c4dff",
  "#d81b60",
  "#2e7d32",
  "#795548",
  "#00838f",
  "#c62828",
];
const fantasyOfficeData = {
  2025: { draft: [], movies: [], ordering: [], results: [] },
  2026: { draft: [], movies: [], ordering: [], results: [] },
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
const FOOTY_DISPLAY_TEAM_NAMES = {
  uswmt: "USWNT",
};
const MANAGER_AUTH_STATUS_STORAGE_KEY = "boxthislap-manager-auth-status";
const SITE_VERSION = window.BOX_THIS_LAP_VERSION || "dev";
const MANAGER_AUTH_STATUS_CACHE_MS = 5 * 60 * 1000;
const BRACKET_SUBMISSIONS_ARCHIVED = true;
const RANKING_BASE_RATING = 1500;
const RANKING_ELO_K_FACTOR = 32;
const RANKING_PROVISIONAL_COMPARISONS = 10;
const RANKING_PROVISIONAL_K_FACTOR = 64;
const RANKING_CONFIG = {
  games: {
    addLabel: "Add Game",
    itemLabel: "Game",
    list: () => document.querySelector("#ranking-list-games"),
    sheetName: "VG Ranking",
    source: "rankingGames",
    type: "games",
  },
  mcu: {
    addLabel: "Add MCU Entry",
    itemLabel: "MCU",
    list: () => document.querySelector("#ranking-list-mcu"),
    sheetName: "MCU Ranking",
    source: "rankingMcu",
    type: "mcu",
  },
  movies: {
    addLabel: "Add Movie",
    itemLabel: "Movie",
    list: () => document.querySelector("#ranking-list-movies"),
    sheetName: "Movie Ranking",
    source: "rankingMovies",
    type: "movies",
  },
  tv: {
    addLabel: "Add TV Entry",
    itemLabel: "TV",
    list: () => document.querySelector("#ranking-list-tv"),
    sheetName: "TV Ranking",
    source: "rankingTv",
    type: "tv",
  },
};
const TODO_RANKING_CONFIG = {
  itemLabel: "To Do Item",
  type: "todo",
};
const WANT_RANKING_CONFIG = {
  itemLabel: "Want Item",
  type: "want",
};
const expandedFootyMatchIds = new Set();
const footyGoalAssistEntries = [];
let activeFootyNoteMatchId = "";
let activeAutocompleteInput = null;
let footyRosterLoadPromise = null;
const footyNoteGoalAssistEntries = {
  follow: [],
  opponent: [],
};
const AUTOCOMPLETE_OPTION_LIMIT = 8;
const siteData = {};
let guideLinksLoadPromise = null;
window.boxThisLapData = siteData;
window.boxThisLapDiagnostics = window.boxThisLapDiagnostics || [];


siteData.fantasyCritic = {
  2025: { metadata: FANTASY_CRITIC_LEAGUE_METADATA[2025], status: "loading" },
  2026: { metadata: FANTASY_CRITIC_LEAGUE_METADATA[2026], status: "loading" },
};
siteData.fantasyOffice2025 = fantasyOfficeData[2025];
siteData.fantasyOffice2026 = fantasyOfficeData[2026];

const router = createRouter({
  draftPanels,
  draftViewButtons,
  headerArt,
  navGroups,
  onPageShown: renderPageContext,
  onStandingsTabShown: () => renderStandingsAwards(),
  pageLinks,
  pages,
  shouldBlockPage: (pageName) =>
    (pageName === "rankings" && !siteData.managerSession) ||
    (pageName === "guides" && !siteData.managerSession) ||
    (["todo", "want", "youtube", "the-monster-maniac"].includes(pageName) && !isCurrentManagerAdmin()),
  shouldBlockRulesPage: () => !shouldUseNationTestScoring(),
  tabPanels,
  tabs,
});
const { showDraftView, showPage, showTab } = router;

const { syncThemeToggle } = createThemeController({
  storageKey: THEME_STORAGE_KEY,
  toggle: themeToggle,
});

const loadGuideData = createGuideDataLoader({
  loadJson: (path) => loadJson(path, { cache: "force-cache" }),
  path: `data/guides.json?v=${encodeURIComponent(SITE_VERSION)}`,
});
const guidesController = createGuidesController({
  getManagerId: getCurrentManagerId,
  getIsAdmin: isCurrentManagerAdmin,
  loadData: loadGuideData,
  progressEndpoint: GUIDES_PROGRESS_ENDPOINT,
});
const platinumsController = createPlatinumsController({ loadSheet });
const youtubeInboxController = createYouTubeInboxController({ endpoint: YOUTUBE_INBOX_ENDPOINT, loadSheet });

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

  if (!shouldRenderPageSection("footy")) {
    return;
  }

  const fixtures = getFootyScheduleFixtures(schedule);
  const competitionSchedules = getFootyCompetitionSchedules(schedule);
  const competitionRecords = syncFootyCompetitionControls(fixtures, competitionSchedules);
  const isCompetitionMode = activeFootyScheduleMode === "competitions";
  const unfilteredModeFixtures = isCompetitionMode
    ? getFootyCompetitionFixtures(fixtures, activeFootyCompetitionKey, competitionSchedules)
    : getVisibleFootyFixtures(fixtures);
  syncFootyFilters(fixtures, unfilteredModeFixtures);
  const modeFixtures = getFilteredFootyFixtures(unfilteredModeFixtures);
  const visibleFixtures = modeFixtures
    .sort(compareVisibleFootyFixtures);
  const renderedFixtures = isCompetitionMode || shouldShowAllFootyFixtures
    ? visibleFixtures
    : visibleFixtures.slice(0, FOOTY_INITIAL_FIXTURE_LIMIT);
  const hiddenFixtureCount = Math.max(0, visibleFixtures.length - renderedFixtures.length);
  const generatedAt = formatFootyGeneratedAt(getFootyScheduleUpdatedAt(schedule));
  const adminDiagnosticsMarkup = renderFootyAdminUpdateDiagnostics(schedule);
  const selectedCompetition = competitionRecords.find((record) => record.key === activeFootyCompetitionKey);
  const emptyMessage = hasActiveFootyFilters()
    ? "No matches found for the current filters."
    : isCompetitionMode && selectedCompetition
    ? `No ${selectedCompetition.name} fixtures were loaded yet.`
    : isCompetitionMode
    ? "No competition fixtures were loaded yet."
    : shouldShowPastFootyFixtures
    ? "No past football fixtures were loaded yet."
    : "No upcoming football fixtures were loaded yet.";
  const updatedMarkup = generatedAt ? `<p class="footy-updated">Updated ${escapeHtml(generatedAt)}</p>` : "";

  syncFootyPastToggle(fixtures, isCompetitionMode);

  if (shouldWaitForFootyMatchNotes()) {
    footyScheduleList.innerHTML = `
      ${updatedMarkup}
      ${adminDiagnosticsMarkup}
      ${renderLoadingMessage("Loading match notes...")}
    `;
    ensureFootyMatchNotes({ force: shouldRefreshFootyMatchNotes() })
      .then(() => renderFootySchedule(siteData.footySchedule))
      .catch((error) => {
        siteData.footyMatchNotesError = error;
        recordDiagnostic("footy match notes failed to load for past matches", error);
        footyScheduleList.innerHTML = `
          ${updatedMarkup}
          ${adminDiagnosticsMarkup}
          <p class="table-message">Unable to load match notes: ${escapeHtml(error.message)}</p>
        `;
      });
    return;
  }

  if (visibleFixtures.length === 0) {
    footyScheduleList.innerHTML = `
      ${updatedMarkup}
      ${adminDiagnosticsMarkup}
      <p class="table-message">${emptyMessage}</p>
    `;
    return;
  }

  footyScheduleList.innerHTML = `
    ${updatedMarkup}
    ${adminDiagnosticsMarkup}
    <div class="footy-list${isCompetitionMode ? " footy-list--calendar-weeks" : ""}">
      ${isCompetitionMode ? renderFootyCalendarWeekGroups(renderedFixtures) : renderedFixtures.map(renderFootyFixture).join("")}
    </div>
    ${isCompetitionMode ? "" : renderFootyShowAllControl(hiddenFixtureCount, visibleFixtures.length)}
  `;
}

function renderFollowedTeamShortcuts(schedule) {
  if (!followedTeamShortcuts) {
    return;
  }

  const teams = getFootyShortcutTeams(schedule);
  followedTeamShortcuts.hidden = teams.length === 0 || !isFootyContextPage(activePageName);

  if (teams.length === 0) {
    followedTeamShortcuts.innerHTML = "";
    return;
  }

  followedTeamShortcuts.innerHTML = teams.map((team) => {
    const slug = getFootyTeamSlug(team.name);
    const fallback = getFootyTeamFallbackBadge(team.name);
    const localBadgePath = getFootyLocalTeamBadge(team.name, team.id || team.teamId);
    const providerBadgePath = String(team.badge || "").trim();

    return `
      <a class="followed-team-shortcut" href="#footy-team-${escapeHtml(slug)}" data-page-link="footy-team-${escapeHtml(slug)}" aria-label="${escapeHtml(team.name)}">
        ${renderFootyBadgeMarkup({
          fallbackSrc: localBadgePath,
          fallbackText: fallback,
          primarySrc: providerBadgePath || localBadgePath,
        })}
      </a>
    `;
  }).join("");
}

function isFootyContextPage(pageName = activePageName) {
  return pageName === "footy" || String(pageName || "").startsWith("footy-team-");
}

function syncFollowedTeamShortcutsVisibility(pageName = activePageName) {
  if (!followedTeamShortcuts) {
    return;
  }

  followedTeamShortcuts.hidden = !isFootyContextPage(pageName) ||
    followedTeamShortcuts.children.length === 0;
}

function getFootyShortcutTeams(schedule) {
  return getAllFootyScheduleTeams(schedule);
}

function normalizeFootyScheduleTeam(teamSchedule = {}) {
  const team = teamSchedule.team || {};
  const name = getFootyDisplayTeamName(team.name);
  const id = String(team.id || "").trim();
  const badge = getFootyTeamBadge(name, team.badge, id);
  const projectedPoints = String(team.projectedPoints ?? "").trim();

  return {
    badge,
    fixtureCount: Array.isArray(teamSchedule.fixtures) ? teamSchedule.fixtures.length : 0,
    id,
    leagueGames: Number(team.leagueGames) || 0,
    name,
    prettyName: String(team.prettyName || team["Pretty Name"] || "").trim() || name,
    priority: normalizeFootyPriority(team.priority),
    projectedPoints: projectedPoints && Number.isFinite(Number(projectedPoints)) ? Number(projectedPoints) : null,
    status: String(teamSchedule.status || "").trim(),
    updatedAt: String(teamSchedule.updatedAt || teamSchedule.attemptedAt || "").trim(),
  };
}

function uniqueFootyTeams(teams = []) {
  const teamsByKey = new Map();

  teams.forEach((team) => {
    const key = getFootyTeamFilterKey(team.name);
    const existing = teamsByKey.get(key);

    if (!key || (existing?.badge && !team.badge)) {
      return;
    }

    teamsByKey.set(key, {
      ...existing,
      ...team,
      badge: team.badge || existing?.badge || "",
      fixtureCount: (existing?.fixtureCount || 0) + (team.fixtureCount || 0),
    });
  });

  return [...teamsByKey.values()];
}

function compareFootyTeamsByPriorityThenName(firstTeam, secondTeam) {
  return Number(firstTeam.priority || Number.MAX_SAFE_INTEGER) - Number(secondTeam.priority || Number.MAX_SAFE_INTEGER) ||
    String(firstTeam.name || "").localeCompare(String(secondTeam.name || ""));
}

function getFootyTeamSlug(teamName) {
  return normalizeLookupName(teamName).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "team";
}

function getFootyTeamFromSlug(slug) {
  const normalizedSlug = String(slug || "").trim();

  return getFootyShortcutTeams(siteData.footySchedule).find((team) => getFootyTeamSlug(team.name) === normalizedSlug) ||
    getAllFootyScheduleTeams(siteData.footySchedule).find((team) => getFootyTeamSlug(team.name) === normalizedSlug) ||
    null;
}

function getActiveFootyTeam() {
  if (!String(activePageName || "").startsWith("footy-team-")) {
    return null;
  }

  return getFootyTeamFromSlug(String(activePageName || "").replace(/^footy-team-/, ""));
}

function getAllFootyScheduleTeams(schedule) {
  if (!Array.isArray(schedule?.teamSchedules)) {
    return [];
  }

  return uniqueFootyTeams(schedule.teamSchedules.map((teamSchedule) => normalizeFootyScheduleTeam(teamSchedule)))
    .sort(compareFootyTeamsByPriorityThenName);
}

function getFootyTeamFallbackBadge(teamName) {
  return String(teamName || "?").trim().slice(0, 1).toUpperCase() || "?";
}

function getFootyDisplayTeamName(teamName) {
  const rawName = String(teamName || "").trim();
  const displayName = FOOTY_DISPLAY_TEAM_NAMES[normalizeLookupName(rawName)];

  return displayName || rawName;
}

function getFootyTeamBadge(teamName, explicitBadge = "", teamId = "") {
  const localBadge = getFootyLocalTeamBadge(teamName, teamId);
  const badge = String(explicitBadge || "").trim();

  return localBadge || badge;
}

function getFootyLocalTeamBadge(teamName, teamId = "") {
  const id = String(teamId || "").trim() ||
    FOOTY_LOCAL_TEAM_IDS[normalizeLookupName(teamName)] ||
    FOOTY_LOCAL_TEAM_IDS[normalizeFootyClubName(teamName)] ||
    "";

  if (id) {
    const extension = ["1", "2"].includes(id) ? "png" : "svg";
    return `assets/teams/${encodeURIComponent(id)}/badge.${extension}`;
  }

  return "";
}

function getFootyLocalTeamLogo(teamName, teamId = "") {
  const id = String(teamId || "").trim() ||
    FOOTY_LOCAL_TEAM_IDS[normalizeLookupName(teamName)] ||
    FOOTY_LOCAL_TEAM_IDS[normalizeFootyClubName(teamName)] ||
    "";

  if (id) {
    return `assets/teams/${encodeURIComponent(id)}/logo.svg`;
  }

  return "";
}

function getFootyTradingCardBadgeSources(team = {}) {
  const name = team.name || team.teamName || "";
  const id = String(team.id || team.teamId || "").trim();
  const providerBadge = String(team.badge || team.teamBadge || "").trim();
  const localBadge = getFootyLocalTeamBadge(name, id);

  return [localBadge, providerBadge].filter(Boolean);
}

function renderFootyBadgeMarkup({
  primarySrc = "",
  fallbackSrc = "",
  fallbackText = "",
  loading = "lazy",
}) {
  const primary = String(primarySrc || "").trim();
  const fallback = String(fallbackSrc || "").trim();
  const text = String(fallbackText || "").trim() || "?";

  if (!primary) {
    return `<span>${escapeHtml(text)}</span>`;
  }

  return `
    <span hidden>${escapeHtml(text)}</span>
    <img
      src="${escapeHtml(primary)}"
      alt=""
      decoding="async"
      loading="${escapeHtml(loading)}"
      data-fallback-src="${escapeHtml(fallback)}"
      onerror="const fallbackSrc=this.dataset.fallbackSrc||''; if(fallbackSrc && this.getAttribute('src')!==fallbackSrc){ this.setAttribute('src', fallbackSrc); this.dataset.fallbackSrc=''; return; } this.hidden=true; if(this.previousElementSibling){ this.previousElementSibling.hidden=false; }"
    >
  `.trim();
}

function renderFootyTeamPage(pageName = activePageName) {
  if (!footyTeamTitle || !footyTeamContent) {
    return;
  }

  const slug = String(pageName || "").replace(/^footy-team-/, "");
  const team = getFootyTeamFromSlug(slug);

  if (!siteData.footySchedule) {
    footyTeamTitle.textContent = "Team";
    syncFootyTeamViewToggle(true);
    footyTeamContent.innerHTML = `<p class="table-message">Loading team...</p>`;
    return;
  }

  if (!team) {
    footyTeamTitle.textContent = "Team";
    syncFootyTeamViewToggle(true);
    footyTeamContent.innerHTML = `<p class="table-message">Unable to find that followed team.</p>`;
    return;
  }

  const fixtures = getFootyScheduleFixtures(siteData.footySchedule)
    .filter((fixture) => isSameFootyTeamName(fixture.teamName, team.name));
  const upcomingFixtures = fixtures.filter((fixture) => !isFootyFixturePast(fixture)).sort(compareVisibleFootyFixtures);
  const pastFixtures = fixtures.filter((fixture) => isFootyFixturePast(fixture)).sort(compareVisibleFootyFixtures).reverse();
  const teamSlug = getFootyTeamSlug(team.name);
  const nextFixtureLimit = footyTeamFixtureLimits.get(teamSlug) || 5;
  const nextFixtures = upcomingFixtures.slice(0, nextFixtureLimit);
  const recentFixtures = pastFixtures.slice(0, 3);
  const updatedAt = formatFootyGeneratedAt(team.updatedAt || getFootyScheduleUpdatedAt(siteData.footySchedule));
  const projectedPointsMarkup = team.leagueGames > 0 && team.projectedPoints !== null
    ? `
        <div>
          <dt>Projected Points</dt>
          <dd>${escapeHtml(String(team.projectedPoints))}</dd>
        </div>
      `
    : "";
  const badgeMarkup = renderFootyBadgeMarkup({
    fallbackSrc: String(team.badge || "").trim(),
    fallbackText: getFootyTeamFallbackBadge(team.name),
    primarySrc: getFootyLocalTeamBadge(team.name, team.id || team.teamId),
  });

  footyTeamTitle.textContent = team.name;
  syncFootyTeamViewToggle(false);

  if (activeFootyTeamViewMode === "team") {
    renderFootyTeamPlayers(team);
    return;
  }

  footyTeamContent.innerHTML = `
    <section class="footy-team-summary-card">
      <div class="footy-team-summary-badge" aria-hidden="true">
        ${badgeMarkup}
      </div>
      <div>
        <h2>${escapeHtml(team.name)}</h2>
        ${updatedAt ? `<p>Updated ${escapeHtml(updatedAt)}</p>` : ""}
      </div>
      <dl class="footy-team-stat-grid">
        <div>
          <dt>Upcoming</dt>
          <dd>${escapeHtml(String(upcomingFixtures.length))}</dd>
        </div>
        <div>
          <dt>Past</dt>
          <dd>${escapeHtml(String(pastFixtures.length))}</dd>
        </div>
        ${projectedPointsMarkup}
      </dl>
    </section>
    ${renderFootyTeamFixtureSection("Next Matches", nextFixtures, {
      hiddenCount: Math.max(0, upcomingFixtures.length - nextFixtures.length),
      teamSlug,
    })}
    ${renderFootyTeamFixtureSection("Recent Matches", recentFixtures)}
  `;
}

function syncFootyTeamViewToggle(isDisabled = false) {
  footyTeamPlayerToggle?.setAttribute("hidden", "");
  footyTeamViewModeButtons?.forEach((button) => {
    const isActive = button.dataset.footyTeamViewMode === activeFootyTeamViewMode;

    button.disabled = isDisabled;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function renderFootyTeamPlayers(team) {
  const roster = getFootyRosterForTeam(team);

  if (!Array.isArray(siteData.footyRosters)) {
    footyTeamContent.innerHTML = renderFootyPlayerGridLoading();
    ensureFootyRosters()
      .then(() => {
        if (activePageName === `footy-team-${getFootyTeamSlug(team.name)}` && activeFootyTeamViewMode === "team") {
          renderFootyTeamPage();
        }
      })
      .catch((error) => {
        footyTeamContent.innerHTML = `<p class="table-message">Unable to load roster: ${escapeHtml(error.message)}</p>`;
      });
    return;
  }

  if (!roster) {
    footyTeamContent.innerHTML = `<p class="table-message">No roster loaded for ${escapeHtml(team.name)}.</p>`;
    return;
  }

  const players = getFootyRosterPlayersForTeam(team);
  footyTeamContent.innerHTML = `
    <section class="footy-team-player-section">
      <div class="footy-team-player-grid${shouldExportFootyTradingCards ? " is-export-mode" : ""}">
        ${players.map(renderFootyTeamPlayerCard).join("")}
      </div>
      <label class="trading-card-export-toggle">
        <input type="checkbox" data-trading-card-export-toggle${shouldExportFootyTradingCards ? " checked" : ""}>
        <span>Export</span>
      </label>
      <p class="trading-card-export-status" aria-live="polite" data-trading-card-export-status></p>
    </section>
  `;
}

function renderFootyPlayerGridLoading() {
  return `
    <section class="footy-team-player-section" aria-busy="true">
      <div class="footy-team-player-grid footy-team-player-grid--loading">
        ${Array.from({ length: 8 }, () => `
          <article class="footy-team-player-card footy-team-player-card--loading">
            <div class="footy-team-player-skeleton-art"></div>
            <div class="footy-team-player-skeleton-name"></div>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderFootyTeamPlayerCard(player) {
  const fallbackSources = Array.isArray(player.imageFallbackPaths) ? player.imageFallbackPaths : [];
  const imageMarkup = player.imagePath
    ? `<img src="${escapeHtml(player.imagePath)}" alt="" loading="lazy" decoding="async"${fallbackSources.length ? ` data-fallback-srcs="${escapeHtml(JSON.stringify(fallbackSources))}"` : ""}>`
    : "";
  const number = formatFootyPlayerNumber(player.number);

  return `
    <article class="footy-team-player-card" tabindex="0" role="button" data-footy-player-id="${escapeHtml(player.id)}" data-footy-team-id="${escapeHtml(player.teamId)}" aria-label="${shouldExportFootyTradingCards ? "Export" : "Open"} ${escapeHtml(player.name)} trading card">
      <div class="footy-team-player-art" aria-hidden="true">${imageMarkup}</div>
      ${number ? `<div class="footy-team-player-number">${escapeHtml(number)}</div>` : ""}
      <div class="footy-team-player-name">${escapeHtml(player.name)}</div>
    </article>
  `;
}

function formatFootyPlayerNumber(number) {
  const cleanNumber = String(number || "").trim().replace(/^#/, "");

  return cleanNumber;
}

function getFootyPlayerTradingCardBackgroundPath(player = {}) {
  const id = String(player.id || "").trim();
  const teamId = String(player.teamId || "").trim();

  if (!id || !teamId) {
    return "";
  }

  return `assets/players/2026_27/${encodeURIComponent(teamId)}/${encodeURIComponent(id)}/trading-card.webp`;
}

function openFootyTradingCard(player, team) {
  if (!player || !team || !footyTradingCardDialog || !footyTradingCardContent) {
    return;
  }

  const number = formatFootyPlayerNumber(player.number);
  const backgroundPath = getFootyPlayerTradingCardBackgroundPath(player);
  const fallback = getFootyTeamFallbackBadge(team.name);
  const badgeSources = getFootyTradingCardBadgeSources(team);
  const badgeMarkup = renderFootyBadgeMarkup({
    fallbackSrc: badgeSources[1] || "",
    fallbackText: fallback,
    loading: "eager",
    primarySrc: badgeSources[0] || "",
  });

  if (footyTradingCardTitle) {
    footyTradingCardTitle.textContent = player.name;
  }

  footyTradingCardContent.innerHTML = `
    <div
      class="trading-card-preview"
      role="button"
      tabindex="0"
      aria-label="Show back of ${escapeHtml(player.name)} trading card"
      aria-pressed="false"
      data-trading-card-flip
      data-trading-card-player-name="${escapeHtml(player.name)}"
    >
      <div class="trading-card-flip-inner" data-trading-card-flip-inner>
        <div class="trading-card-face trading-card-face--front">
          ${backgroundPath ? `<img class="trading-card-background" src="${escapeHtml(backgroundPath)}" alt="" decoding="async" loading="lazy" onerror="this.remove()">` : ""}
          <img class="trading-card-frame" src="assets/trading-card/trading-card.svg" alt="" decoding="async">
          <div class="trading-card-team-badge" aria-hidden="true">${badgeMarkup}</div>
          ${number ? `<div class="trading-card-number">${escapeHtml(number)}</div>` : ""}
          <div class="trading-card-name">${escapeHtml(player.name)}</div>
        </div>
        ${renderFootyTradingCardBack(player, team, badgeMarkup)}
      </div>
    </div>
  `;

  footyTradingCardDialog.showModal();
}

function renderFootyTradingCardBack(player, team, badgeMarkup) {
  const teamId = String(team.id || team.teamId || "").trim();
  const teamLogoPath = getFootyLocalTeamLogo(team.name, teamId);
  const badgeAssets = [
    teamLogoPath
      ? `<div class="trading-card-back-corner-logo" data-team-logo-id="${escapeHtml(teamId)}"><img src="${escapeHtml(teamLogoPath)}" alt="" decoding="async" onerror="this.parentElement.remove()"></div>`
      : "",
    player.isNew
      ? `<img class="trading-card-back-status-badge" src="assets/trading-card/back/badge-new-player.svg" alt="New player">`
      : "",
    player.fromAcademy
      ? `
        <div class="trading-card-back-academy-badge" aria-label="Academy product">
          <img class="trading-card-back-academy-frame" src="assets/trading-card/back/badge-academy-product.svg" alt="">
          <div class="trading-card-back-academy-logo" aria-hidden="true">${badgeMarkup}</div>
        </div>
      `
      : "",
  ].filter(Boolean).join("");
  const facts = [
    ["icon-appearances-stadium.svg", "Appearances", player.appearances],
    ["icon-year-joined.svg", "Year joined", player.yearJoined],
    ["icon-club-joined-from.svg", "Club joined from", player.clubJoinedFrom],
    ["icon-home-country.svg", "Home country", player.homeCountry],
    ["icon-birthday.svg", "Birthday", formatFootyTradingCardBirthday(player.birthday)],
  ];

  return `
    <div class="trading-card-face trading-card-face--back">
      <img class="trading-card-back-shell" src="assets/trading-card/back/card-shell.svg" alt="" decoding="async">
      <div class="trading-card-back-rail" aria-hidden="true">
        <img src="assets/trading-card/back/left-rail.svg" alt="" decoding="async">
        <div class="trading-card-back-team-name">${escapeHtml(team.prettyName || getFootyDisplayTeamName(team.name))}</div>
      </div>
      <img class="trading-card-back-stripes" src="assets/trading-card/back/bottom-stripes.svg" alt="" decoding="async">
      <section class="trading-card-back-content">
        <header class="trading-card-back-header${badgeAssets ? " has-badges" : ""}">
          <div class="trading-card-back-player">
            <h2>${renderFootyTradingCardBackName(player.name)}</h2>
            ${player.position ? `<div class="trading-card-back-position">${escapeHtml(player.position)}</div>` : ""}
          </div>
          ${badgeAssets ? `<div class="trading-card-back-badges">${badgeAssets}</div>` : ""}
        </header>
        <img class="trading-card-back-divider" src="assets/trading-card/back/section-divider.svg" alt="">
        <dl class="trading-card-back-facts">
          ${facts.map(([icon, label, value]) => `
            <div class="trading-card-back-fact">
              <img src="assets/trading-card/back/${icon}" alt="">
              <div>
                <dt>${escapeHtml(label)}</dt>
                <dd>${escapeHtml(String(value || "—"))}</dd>
              </div>
            </div>
          `).join("")}
        </dl>
      </section>
    </div>
  `;
}

function renderFootyTradingCardBackName(name) {
  const words = String(name || "").trim().split(/\s+/).filter(Boolean);

  if (words.length < 2) {
    return escapeHtml(words[0] || "Player");
  }

  return `${escapeHtml(words[0])}<br>${escapeHtml(words.slice(1).join(" "))}`;
}

function formatFootyTradingCardBirthday(value) {
  const birthday = String(value || "").trim();
  const dateParts = birthday.match(/^(?:[A-Za-z]{3}\s+)?([A-Za-z]{3})\s+(\d{1,2})\s+(\d{4})/);

  if (dateParts) {
    return `${Number.parseInt(dateParts[2], 10)} ${dateParts[1]} ${dateParts[3]}`;
  }

  return birthday;
}

function toggleFootyTradingCardSide(card) {
  const cardInner = card?.querySelector("[data-trading-card-flip-inner]");

  if (!cardInner) {
    return;
  }

  const isFlipped = cardInner.classList.toggle("is-flipped");
  const playerName = card.dataset.tradingCardPlayerName || "player";
  card.setAttribute("aria-pressed", String(isFlipped));
  card.setAttribute("aria-label", `Show ${isFlipped ? "front" : "back"} of ${playerName} trading card`);
}

function closeFootyTradingCard() {
  footyTradingCardDialog?.close();
}

async function exportFootyTradingCard(player, team) {
  if (!player || !team) {
    return;
  }

  setTradingCardExportStatus(`Preparing ${player.name}...`);

  const width = 2500;
  const height = 3520;
  const frontCanvas = createFootyTradingCardCanvas(width, height);
  const backCanvas = createFootyTradingCardCanvas(width, height);
  const frontContext = frontCanvas.getContext("2d");
  const backContext = backCanvas.getContext("2d");

  if (!frontContext || !backContext) {
    return;
  }

  await Promise.all([
    drawFootyTradingCardFrontCanvas(frontContext, player, team, width, height),
    drawFootyTradingCardBackCanvas(backContext, player, team, width, height),
  ]);

  const baseName = `${slugifyFileName(team.name)}-${slugifyFileName(player.name)}-trading-card`;
  await downloadTradingCardCanvases([
    { canvas: frontCanvas, fileName: `${baseName}-front.png`, label: "Front" },
    { canvas: backCanvas, fileName: `${baseName}-back.png`, label: "Back" },
  ], {
    title: `${team.name} ${player.name} trading card`,
  });
}

function createFootyTradingCardCanvas(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

async function drawFootyTradingCardFrontCanvas(context, player, team, width, height) {
  const backgroundPath = getFootyPlayerTradingCardBackgroundPath(player);
  const framePath = "assets/trading-card/trading-card.svg";
  const number = formatFootyPlayerNumber(player.number);
  const badgeSources = getFootyTradingCardBadgeSources(team);

  context.fillStyle = "#07111d";
  context.fillRect(0, 0, width, height);

  await drawCanvasImage(context, backgroundPath, 0, 0, width, height);
  await drawCanvasImage(context, framePath, 0, 0, width, height);

  let didDrawBadge = false;

  for (const badgePath of badgeSources) {
    didDrawBadge = await drawCanvasImage(context, badgePath, width * 0.028, height * 0.032, width * 0.18, height * 0.12, { contain: true });

    if (didDrawBadge) {
      break;
    }
  }

  if (!didDrawBadge) {
    drawFallbackTradingCardBadge(context, team.name, width * 0.028, height * 0.032, width * 0.18, height * 0.12);
  }

  if (number) {
    drawTradingCardNumber(context, number, width, height);
  }

  drawTradingCardName(context, player.name, width, height);
}

async function drawFootyTradingCardBackCanvas(context, player, team, width, height) {
  const teamId = String(team.id || team.teamId || "").trim();
  const logoPath = getFootyLocalTeamLogo(team.name, teamId);
  const badgeSources = getFootyTradingCardBadgeSources(team);
  const contentX = width * 0.195;
  const contentY = height * 0.065;
  const contentWidth = width * 0.74;
  const contentRight = contentX + contentWidth;
  const badgeWidth = width * 0.27;
  const logoWidth = width * 0.32;
  const logoHeight = width * 0.15;

  context.fillStyle = "#001b3a";
  context.fillRect(0, 0, width, height);
  await drawCanvasImage(context, "assets/trading-card/back/card-shell.svg", 0, 0, width, height);
  await drawCanvasImage(context, "assets/trading-card/back/left-rail.svg", 0, 0, width * 0.15, height);
  await drawCanvasImage(context, "assets/trading-card/back/bottom-stripes.svg", width * 0.55, height - (width * 0.3326), width * 0.45, width * 0.3326);

  drawTradingCardBackTeamName(context, team.prettyName || getFootyDisplayTeamName(team.name), width, height);

  let badgeY = contentY;
  if (logoPath) {
    await drawCanvasImage(context, logoPath, contentRight - logoWidth, badgeY, logoWidth, logoHeight, {
      alignX: "right",
      contain: true,
      scale: getFootyTradingCardLogoScale(teamId),
    });
    badgeY += logoHeight + (width * 0.015);
  }

  if (player.isNew) {
    const newBadgeHeight = badgeWidth * 0.4;
    await drawCanvasImage(context, "assets/trading-card/back/badge-new-player.svg", contentRight - badgeWidth, badgeY, badgeWidth, newBadgeHeight);
    badgeY += newBadgeHeight + (width * 0.015);
  }

  if (player.fromAcademy) {
    const academyHeight = badgeWidth * (100 / 290);
    const academyX = contentRight - badgeWidth;
    await drawCanvasImage(context, "assets/trading-card/back/badge-academy-product.svg", academyX, badgeY, badgeWidth, academyHeight);
    for (const badgePath of badgeSources) {
      const didDrawBadge = await drawCanvasImage(context, badgePath, academyX + (badgeWidth * 0.02), badgeY + (academyHeight * 0.30), badgeWidth * 0.25, academyHeight * 0.38, { contain: true });
      if (didDrawBadge) {
        break;
      }
    }
  }

  drawTradingCardBackPlayer(context, player, contentX, contentY, width * 0.38, width);

  const dividerY = height * 0.315;
  await drawCanvasImage(context, "assets/trading-card/back/section-divider.svg", contentX, dividerY, contentWidth, 18);

  const facts = [
    ["icon-appearances-stadium.svg", "Appearances", player.appearances],
    ["icon-year-joined.svg", "Year joined", player.yearJoined],
    ["icon-club-joined-from.svg", "Club joined from", player.clubJoinedFrom],
    ["icon-home-country.svg", "Home country", player.homeCountry],
    ["icon-birthday.svg", "Birthday", formatFootyTradingCardBirthday(player.birthday)],
  ];
  const factsY = dividerY + (width * 0.02);
  const rowHeight = width * 0.164;
  const iconSize = width * 0.14;

  for (const [index, [icon, label, value]] of facts.entries()) {
    const rowY = factsY + (rowHeight * index);
    const iconY = rowY + ((rowHeight - iconSize) / 2);
    const textX = contentX + iconSize + (width * 0.04);
    await drawCanvasImage(context, `assets/trading-card/back/${icon}`, contentX, iconY, iconSize, iconSize);
    drawTradingCardBackFact(context, label, value, textX, rowY, contentRight - textX, rowHeight, width);

    if (index < facts.length - 1) {
      context.save();
      context.strokeStyle = "#d8dce2";
      context.lineWidth = 4;
      context.beginPath();
      context.moveTo(contentX, rowY + rowHeight);
      context.lineTo(contentRight, rowY + rowHeight);
      context.stroke();
      context.restore();
    }
  }
}

function getFootyTradingCardLogoScale(teamId) {
  return {
    "1": 1.08,
    "3": 0.92,
    "6": 1.7,
    "7": 1.7,
  }[String(teamId || "")] || 1;
}

function drawTradingCardBackTeamName(context, teamName, width, height) {
  const text = String(teamName || "").toUpperCase();
  const fontSize = fitCanvasText(context, text, height * 0.72, Math.round(width * 0.032), "Arial, sans-serif");

  context.save();
  context.translate(width * 0.075, height * 0.54);
  context.rotate(-Math.PI / 2);
  context.fillStyle = "#ffffff";
  context.font = `700 ${fontSize}px Arial, sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, 0, 0);
  context.restore();
}

function drawTradingCardBackPlayer(context, player, x, y, maxWidth, width) {
  const words = String(player.name || "Player").trim().split(/\s+/).filter(Boolean);
  const lines = words.length > 1 ? [words[0], words.slice(1).join(" ")] : [words[0] || "Player"];
  const longestLine = lines.reduce((longest, line) => line.length > longest.length ? line : longest, "");
  const fontSize = fitCanvasText(context, longestLine, maxWidth, Math.round(width * 0.084), "Arial, sans-serif");
  const lineHeight = fontSize * 0.84;

  context.save();
  context.fillStyle = "#001b3a";
  context.font = `900 ${fontSize}px Arial, sans-serif`;
  context.textAlign = "left";
  context.textBaseline = "top";
  lines.forEach((line, index) => context.fillText(line, x, y + (lineHeight * index)));

  const positionY = y + (lineHeight * lines.length) + (width * 0.04);
  context.strokeStyle = "#b89443";
  context.lineWidth = 8;
  context.beginPath();
  context.moveTo(x, positionY);
  context.lineTo(x + (width * 0.14), positionY);
  context.stroke();
  context.fillStyle = "#001b3a";
  context.font = `800 ${Math.round(width * 0.037)}px Arial, sans-serif`;
  context.textBaseline = "top";
  context.fillText(String(player.position || "").toUpperCase(), x, positionY + (width * 0.024));
  context.restore();
}

function drawTradingCardBackFact(context, label, value, x, y, maxWidth, rowHeight, width) {
  context.save();
  context.fillStyle = "#001b3a";
  context.font = `800 ${Math.round(width * 0.029)}px Arial, sans-serif`;
  context.textAlign = "left";
  context.textBaseline = "top";
  context.fillText(String(label || "").toUpperCase(), x, y + (rowHeight * 0.22));
  context.font = `650 ${Math.round(width * 0.051)}px Arial, sans-serif`;
  drawWrappedCanvasText(context, String(value || "—"), x, y + (rowHeight * 0.46), maxWidth, width * 0.052, 2);
  context.restore();
}

function drawWrappedCanvasText(context, text, x, y, maxWidth, lineHeight, maxLines) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";

  for (const word of words) {
    const nextLine = line ? `${line} ${word}` : word;
    if (line && context.measureText(nextLine).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = nextLine;
    }
  }

  if (line) {
    lines.push(line);
  }

  lines.slice(0, maxLines).forEach((lineText, index) => context.fillText(lineText, x, y + (lineHeight * index)));
}

function loadCanvasImage(src) {
  return new Promise((resolve, reject) => {
    if (!src) {
      reject(new Error("Missing image source."));
      return;
    }

    const image = new Image();
    image.decoding = "async";
    const isLocalAsset = isLocalAssetPath(src);
    const isRemoteAsset = /^https:\/\//i.test(src);
    let objectUrl = "";

    image.onload = () => {
      if (objectUrl) {
        image.dataset.objectUrl = objectUrl;
      }
      resolve(image);
    };
    image.onerror = () => reject(new Error(`Unable to load image: ${src}`));

    if (!isLocalAsset && !isRemoteAsset) {
      reject(new Error(`Refusing to draw unsupported export image: ${src}`));
      return;
    }

    fetch(src, {
      cache: "force-cache",
      credentials: isRemoteAsset ? "omit" : "same-origin",
      mode: isRemoteAsset ? "cors" : "same-origin",
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Unable to fetch image: ${src}`);
        }
        return response.blob();
      })
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        image.src = objectUrl;
      })
      .catch((error) => {
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
        }
        reject(error);
      });
  });
}

function isLocalAssetPath(src) {
  const value = String(src || "").trim();

  return Boolean(value) && !/^(?:https?:)?\/\//i.test(value) && !/^data:/i.test(value);
}

async function drawCanvasImage(context, src, x, y, width, height, options = {}) {
  try {
    const image = await loadCanvasImage(src);

    if (options.contain) {
      const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight) * (Number(options.scale) || 1);
      const drawWidth = image.naturalWidth * scale;
      const drawHeight = image.naturalHeight * scale;
      const drawX = options.alignX === "right" ? x + width - drawWidth : x + ((width - drawWidth) / 2);
      const drawY = options.alignY === "top" ? y : y + ((height - drawHeight) / 2);
      context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
      revokeCanvasImageObjectUrl(image);
      return true;
    }

    context.drawImage(image, x, y, width, height);
    revokeCanvasImageObjectUrl(image);
    return true;
  } catch (error) {
    recordDiagnostic("trading card image failed to draw", error, { src });
    return false;
  }
}

function revokeCanvasImageObjectUrl(image) {
  const objectUrl = image?.dataset?.objectUrl;

  if (objectUrl) {
    URL.revokeObjectURL(objectUrl);
    delete image.dataset.objectUrl;
  }
}

function drawFallbackTradingCardBadge(context, teamName, x, y, width, height) {
  const size = Math.min(width, height) * 0.78;
  const centerX = x + (width / 2);
  const centerY = y + (height / 2);

  context.save();
  context.fillStyle = "#101a2b";
  context.strokeStyle = "#d8e3ff";
  context.lineWidth = 10;
  context.beginPath();
  context.arc(centerX, centerY, size / 2, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  context.fillStyle = "#f4f7ff";
  context.font = `900 ${Math.round(size * 0.45)}px Arial, sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(getFootyTeamFallbackBadge(teamName), centerX, centerY + (size * 0.03));
  context.restore();
}

function drawTradingCardNumber(context, number, width, height) {
  const boxX = width * 0.8527;
  const boxY = height * 0.0096;
  const boxWidth = width * 0.1352;
  const boxHeight = height * 0.055;

  context.save();
  context.fillStyle = "#ffffff";
  context.font = `950 ${Math.round(boxHeight * 0.88)}px Impact, Arial Black, sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.shadowColor = "rgba(0, 0, 0, 0.45)";
  context.shadowBlur = 18;
  context.shadowOffsetY = 7;
  context.fillText(String(number), boxX + (boxWidth / 2), boxY + (boxHeight / 2) - (boxHeight * 0.02));
  context.restore();
}

function drawTradingCardName(context, name, width, height) {
  const boxX = width * 0.13;
  const boxY = height * 0.87;
  const boxWidth = width * 0.72;
  const boxHeight = height * 0.055;
  const fontSize = fitCanvasText(context, String(name || ""), boxWidth, Math.round(boxHeight * 0.84), "Trebuchet MS, Arial, sans-serif");

  context.save();
  context.fillStyle = "#ffffff";
  context.font = `950 ${fontSize}px Trebuchet MS, Arial, sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.shadowColor = "rgba(0, 0, 0, 0.55)";
  context.shadowBlur = 18;
  context.shadowOffsetY = 7;
  context.fillText(String(name || ""), boxX + (boxWidth / 2), boxY + (boxHeight / 2));
  context.restore();
}

function fitCanvasText(context, text, maxWidth, startingSize, family) {
  let size = startingSize;

  while (size > 28) {
    context.font = `950 ${size}px ${family}`;
    if (context.measureText(text).width <= maxWidth) {
      return size;
    }
    size -= 4;
  }

  return size;
}

function canvasToPngBlob(canvas) {
  return new Promise((resolve) => {
    try {
      canvas.toBlob((blob) => resolve(blob), "image/png");
    } catch (error) {
      recordDiagnostic("trading card export failed", error);
      resolve(null);
    }
  });
}

async function downloadTradingCardCanvases(exports, options = {}) {
  const preparedExports = await Promise.all(exports.map(async (item) => ({
    ...item,
    blob: await canvasToPngBlob(item.canvas),
  })));
  const shareFiles = preparedExports.every((item) => item.blob)
    ? preparedExports.map((item) => new File([item.blob], item.fileName, { type: "image/png" }))
    : [];
  const downloads = setTradingCardExportDownloads(preparedExports);

  if (shareFiles.length && navigator.share && (!navigator.canShare || navigator.canShare({ files: shareFiles }))) {
    try {
      await navigator.share({
        files: shareFiles,
        title: options.title || "Trading card",
      });
      const statusText = footyTeamContent?.querySelector("[data-trading-card-export-status] span");
      if (statusText) {
        statusText.textContent = "Front and back shared.";
      }
      return;
    } catch (error) {
      if (error?.name !== "AbortError") {
        recordDiagnostic("trading card share failed", error);
      }
    }
  }

  downloads.forEach(({ fileName, url }) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.append(link);
    link.click();
    link.remove();
  });
}

function setTradingCardExportStatus(message) {
  const status = footyTeamContent?.querySelector("[data-trading-card-export-status]");

  if (status) {
    status.textContent = message || "";
  }
}

function setTradingCardExportDownloads(exports) {
  const status = footyTeamContent?.querySelector("[data-trading-card-export-status]");
  activeTradingCardExportUrls.forEach((url) => URL.revokeObjectURL(url));
  activeTradingCardExportUrls = [];

  const downloads = exports.map((item) => {
    let url = "";
    if (item.blob) {
      url = URL.createObjectURL(item.blob);
      activeTradingCardExportUrls.push(url);
    } else {
      try {
        url = item.canvas.toDataURL("image/png");
      } catch (error) {
        recordDiagnostic("trading card export failed", error);
      }
    }
    return { ...item, url };
  }).filter((item) => item.url);

  if (!downloads.length) {
    setTradingCardExportStatus("Unable to export this card.");
    return [];
  }

  if (status) {
    status.innerHTML = `
      <span>Front and back ready.</span>
      ${downloads.map((item) => `<a href="${escapeHtml(item.url)}" download="${escapeHtml(item.fileName)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.label)}</a>`).join("")}
    `;
  }

  return downloads;
}

function slugifyFileName(value) {
  return normalizeLookupName(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "card";
}

function renderFootyTeamFixtureSection(title, fixtures = [], { hiddenCount = 0, teamSlug = "" } = {}) {
  return `
    <section class="footy-team-fixture-section">
      <h2>${escapeHtml(title)}</h2>
      ${fixtures.length
        ? `<div class="footy-list footy-team-fixture-list">${fixtures.map(renderFootyFixture).join("")}</div>`
        : `<p class="table-message">No ${escapeHtml(title.toLowerCase())} loaded.</p>`}
      ${hiddenCount > 0 && teamSlug ? `
        <div class="footy-team-fixture-actions">
          <button class="action-button" type="button" data-footy-team-show-more="${escapeHtml(teamSlug)}">
            Show more (${escapeHtml(String(hiddenCount))} remaining)
          </button>
        </div>
      ` : ""}
    </section>
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
        teamBadge: getFootyTeamBadge(fixture.teamName || team.name, fixture.teamBadge || team.badge, fixture.teamId || team.id),
        teamLeague: team.league || "",
        teamName: getFootyDisplayTeamName(fixture.teamName || team.name),
        teamPriority: team.priority || fixture.priority || "",
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

function getFootyScheduleUpdatedAt(schedule) {
  return schedule?.updateTracker?.updatedAt || schedule?.generatedAt || "";
}

function renderFootyAdminUpdateDiagnostics(schedule) {
  if (!isCurrentManagerAdmin()) {
    return "";
  }

  const issues = getFootyScheduleIssues(schedule);

  if (issues.length === 0) {
    return "";
  }

  return `
    <details class="footy-admin-diagnostics">
      <summary>Update issues (${escapeHtml(String(issues.length))})</summary>
      <ul>
        ${issues.map((issue) => `<li>${escapeHtml(issue)}</li>`).join("")}
      </ul>
    </details>
  `;
}

function getFootyScheduleIssues(schedule) {
  const teamIssues = (Array.isArray(schedule?.teamSchedules) ? schedule.teamSchedules : []).flatMap((teamSchedule) => {
    const teamName = teamSchedule?.team?.name || "Team";
    const status = String(teamSchedule?.status || "").trim();
    const statusIssue = ["error", "partial", "stale-error"].includes(status)
      ? [`${teamName}: update status ${status}`]
      : [];
    const errors = Array.isArray(teamSchedule?.errors) ? teamSchedule.errors : [];

    return [
      ...statusIssue,
      ...errors.map((error) => `${teamName}: ${error}`),
    ].filter(Boolean);
  });

  const competitionIssues = (Array.isArray(schedule?.competitionSchedules) ? schedule.competitionSchedules : []).flatMap((competitionSchedule) => {
    const competitionName = competitionSchedule?.competition?.name || "Competition";
    const status = String(competitionSchedule?.status || "").trim();
    const statusIssue = ["error", "partial", "stale-error"].includes(status)
      ? [`${competitionName}: update status ${status}`]
      : [];
    const errors = Array.isArray(competitionSchedule?.errors) ? competitionSchedule.errors : [];

    return [
      ...statusIssue,
      ...errors.map((error) => `${competitionName}: ${error}`),
    ].filter(Boolean);
  });

  return [...teamIssues, ...competitionIssues];
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

function syncFootyCompetitionControls(fixtures = [], competitionSchedules = []) {
  const records = getFootyCompetitionRecords(fixtures, competitionSchedules);
  const isCompetitionMode = activeFootyScheduleMode === "competitions";

  if (records.length > 0 && !records.some((record) => record.key === activeFootyCompetitionKey)) {
    activeFootyCompetitionKey = records[0].key;
  }

  if (footyCompetitionToggle) {
    const label = isCompetitionMode ? "Show team schedule" : "Show competition schedules";
    footyCompetitionToggle.hidden = records.length === 0;
    footyCompetitionToggle.classList.toggle("is-active", isCompetitionMode);
    footyCompetitionToggle.setAttribute("aria-pressed", String(isCompetitionMode));
    footyCompetitionToggle.setAttribute("aria-label", label);
    footyCompetitionToggle.title = label;
  }

  if (footyCompetitionControls) {
    footyCompetitionControls.hidden = !isCompetitionMode || records.length === 0;
  }

  if (footyCompetitionSelect) {
    const leagueRecords = records.filter((record) => record.isLeague);
    const otherRecords = records.filter((record) => !record.isLeague);
    const renderOptions = (items) => items.map((record) => (
      `<option value="${escapeHtml(record.key)}">${escapeHtml(record.name)} (${escapeHtml(String(record.matchCount))})</option>`
    )).join("");

    footyCompetitionSelect.innerHTML = [
      leagueRecords.length > 0 ? `<optgroup label="Leagues">${renderOptions(leagueRecords)}</optgroup>` : "",
      otherRecords.length > 0 ? `<optgroup label="Cups & other competitions">${renderOptions(otherRecords)}</optgroup>` : "",
    ].join("");
    footyCompetitionSelect.value = activeFootyCompetitionKey;
  }

  return records;
}

function getFootyCompetitionRecords(fixtures = [], competitionSchedules = []) {
  if (competitionSchedules.length > 0) {
    return competitionSchedules
      .map((schedule) => {
        const competition = schedule?.competition || {};
        const canonicalCompetition = getFootyCanonicalCompetition(competition.name);
        const priority = Number.parseInt(String(competition.priority ?? "").trim(), 10);

        return {
          isLeague: /league/i.test(String(competition.type || "")) || ["premier league", "la liga", "championship", "mls"].includes(canonicalCompetition.key),
          key: competition.key || canonicalCompetition.key,
          matchCount: Number(schedule.fixtureCount) || (Array.isArray(schedule.fixtures) ? schedule.fixtures.length : 0),
          name: canonicalCompetition.name || competition.name || "Competition",
          priority: Number.isFinite(priority) ? priority : Number.MAX_SAFE_INTEGER,
        };
      })
      .filter((record) => record.key && record.matchCount > 0)
      .sort((first, second) => (
        Number(second.isLeague) - Number(first.isLeague) ||
        first.priority - second.priority ||
        first.name.localeCompare(second.name)
      ));
  }

  const recordsByKey = new Map();

  fixtures.forEach((fixture) => {
    const competition = getFootyCanonicalCompetition(fixture.league);

    if (!competition.key) {
      return;
    }

    const teamCompetition = getFootyCanonicalCompetition(fixture.teamLeague);
    const isLeague = Boolean(teamCompetition.key && teamCompetition.key === competition.key);
    const existing = recordsByKey.get(competition.key) || {
      fixtures: [],
      isLeague: false,
      key: competition.key,
      name: competition.name,
      priority: Number.MAX_SAFE_INTEGER,
    };

    existing.fixtures.push(fixture);
    existing.isLeague ||= isLeague;
    existing.priority = Math.min(existing.priority, getFootyCompetitionPriority(fixture));

    if (isLeague && teamCompetition.name) {
      existing.name = teamCompetition.name;
    }

    recordsByKey.set(competition.key, existing);
  });

  return [...recordsByKey.values()]
    .map((record) => ({
      ...record,
      matchCount: getFootyCompetitionFixtures(record.fixtures, record.key).length,
    }))
    .sort((first, second) => (
      Number(second.isLeague) - Number(first.isLeague) ||
      first.priority - second.priority ||
      first.name.localeCompare(second.name)
    ));
}

function getFootyCanonicalCompetition(name) {
  const rawName = String(name || "").trim();
  const normalizedName = normalizeLookupName(rawName);

  if (!normalizedName) {
    return { key: "", name: "" };
  }

  if (["la liga", "primera division"].includes(normalizedName) || normalizedName.startsWith("laliga season")) {
    return { key: "la liga", name: "La Liga" };
  }

  if (["mls", "mls - regular season", "mls regular season", "major league soccer"].includes(normalizedName)) {
    return { key: "mls", name: "MLS" };
  }

  if (["championship", "efl championship", "english league championship"].includes(normalizedName)) {
    return { key: "championship", name: "Championship" };
  }

  if (["premier league", "english premier league"].includes(normalizedName)) {
    return { key: "premier league", name: "Premier League" };
  }

  if (["community shield", "fa community shield"].includes(normalizedName)) {
    return { key: "community shield", name: "FA Community Shield" };
  }

  if (["efl cup", "football league cup", "league cup"].includes(normalizedName)) {
    return { key: "efl cup", name: "EFL Cup" };
  }

  if (["spanish super cup", "supercopa de espana"].includes(normalizedName)) {
    return { key: "supercopa de espana", name: "Supercopa de España" };
  }

  return { key: normalizedName, name: rawName };
}

function getFootyCompetitionPriority(fixture = {}) {
  const value = Number.parseInt(String(fixture.teamPriority || fixture.priority || "").trim(), 10);
  return Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER;
}

function getFootyCompetitionSchedules(schedule) {
  return Array.isArray(schedule?.competitionSchedules) ? schedule.competitionSchedules : [];
}

function getFootyCompetitionFixtures(fixtures = [], competitionKey = "", competitionSchedules = []) {
  const fullSchedule = competitionSchedules.find((schedule) => {
    const competition = schedule?.competition || {};
    return (competition.key || getFootyCanonicalCompetition(competition.name).key) === competitionKey;
  });

  if (fullSchedule) {
    const followedByMatchId = new Map(
      fixtures
        .filter((fixture) => fixture.matchId)
        .map((fixture) => [String(fixture.matchId), fixture])
    );
    const followedBadges = getFootyFollowedTeamBadgeMap(fixtures);

    return (Array.isArray(fullSchedule.fixtures) ? fullSchedule.fixtures : []).map((fixture) => {
      const followedFixture = followedByMatchId.get(String(fixture.matchId || ""));

      return {
        ...fixture,
        ...(followedFixture?.matchNote ? { matchNote: followedFixture.matchNote } : {}),
        followedAwayBadge: getFootyFollowedTeamBadge(followedBadges, fixture.away),
        followedHomeBadge: getFootyFollowedTeamBadge(followedBadges, fixture.home),
        followedTeamNames: Array.isArray(fixture.followedTeamNames) ? fixture.followedTeamNames : [],
        isCompetitionFixture: true,
      };
    });
  }

  const fixturesByTeamDate = new Map();

  fixtures
    .filter((fixture) => getFootyCanonicalCompetition(fixture.league).key === competitionKey)
    .forEach((fixture) => {
      const identity = getFootyTeamDateFixtureIdentity(fixture);
      const existing = fixturesByTeamDate.get(identity);

      if (!existing) {
        fixturesByTeamDate.set(identity, {
          ...fixture,
          followedTeamNames: [fixture.teamName].filter(Boolean),
        });
        return;
      }

      fixturesByTeamDate.set(identity, mergeFootyCompetitionFixtures(existing, fixture));
    });

  const fixturesByMatch = new Map();

  fixturesByTeamDate.forEach((fixture) => {
    const identity = getFootySharedMatchIdentity(fixture);
    const existing = fixturesByMatch.get(identity);
    fixturesByMatch.set(identity, existing
      ? mergeFootyCompetitionFixtures(existing, fixture)
      : fixture);
  });

  return [...fixturesByMatch.values()];
}

function mergeFootyCompetitionFixtures(existing = {}, fixture = {}) {
  const followedTeamNames = [...new Set([
    ...(existing.followedTeamNames || [existing.teamName]),
    ...(fixture.followedTeamNames || [fixture.teamName]),
  ].filter(Boolean))];

  return {
    ...existing,
    ...(hasFootyMatchNoteData(fixture) ? fixture : {}),
    followedTeamNames,
  };
}

function getFootyTeamDateFixtureIdentity(fixture = {}) {
  return [
    getFootyFixtureDateKey(fixture),
    getFootyTeamFilterKey(fixture.teamName),
    getFootyCanonicalCompetition(fixture.league).key,
  ].join("|");
}

function getFootySharedMatchIdentity(fixture = {}) {
  const matchId = String(fixture.matchId || "").trim();

  if (matchId) {
    return matchId;
  }

  return [
    getFootyFixtureDateKey(fixture),
    normalizeLookupName(fixture.home),
    normalizeLookupName(fixture.away),
    getFootyCanonicalCompetition(fixture.league).key,
  ].join("|");
}

function getFilteredFootyFixtures(fixtures) {
  const searchTerm = normalizeLookupName(footySearchInput?.value || "");
  const dateRange = getFootyDateFilterRange();
  const matchPeriodKey = String(footyMatchPeriodFilter?.value || "").trim();
  const shouldShowCompetitionPastFixtures = Boolean(footyCompetitionPastFilter?.checked);
  const selectedTeams = getSelectedFootyTeams();
  const defaultPrioritySet = getDefaultFootyPrioritySet();

  return fixtures.filter((fixture) => {
    if (footyFriendliesFilter && !footyFriendliesFilter.checked && isFootyFriendlyFixture(fixture)) {
      return false;
    }

    if (dateRange && !isFootyFixtureInDateRange(fixture, dateRange)) {
      return false;
    }

    if (matchPeriodKey && getFootyMatchPeriod(fixture)?.key !== matchPeriodKey) {
      return false;
    }

    if (activeFootyScheduleMode === "competitions" && !shouldShowCompetitionPastFixtures && isFootyFixturePast(fixture)) {
      return false;
    }

    if (activeFootyScheduleMode !== "competitions" && selectedTeams.size > 0 && !selectedTeams.has(getFootyTeamFilterKey(fixture.teamName))) {
      return false;
    }

    if (activeFootyScheduleMode !== "competitions" && selectedTeams.size === 0 && defaultPrioritySet.size > 0 && !defaultPrioritySet.has(normalizeFootyPriority(fixture.priority))) {
      return false;
    }

    if (!searchTerm) {
      return true;
    }

    return getFootyFixtureSearchText(fixture).includes(searchTerm);
  });
}

function isFootyFriendlyFixture(fixture = {}) {
  if (typeof fixture.isFriendly === "boolean") {
    return fixture.isFriendly;
  }

  const friendlyCompetitionIds = new Set([
    "4nidzmunvpvxk1ir9b6m8mpay",
    "4569",
    "bfbepcvvs13v9didqrb12rh05",
  ]);
  const friendlyCompetitionNames = new Set([
    "club friendlies",
    "club friendly",
    "emirates cup",
    "english premier league summer series",
    "friendly",
    "friendlies",
    "trofeo joan gamper",
  ]);

  return friendlyCompetitionIds.has(String(fixture.leagueId || "").trim()) ||
    friendlyCompetitionNames.has(normalizeLookupName(fixture.league));
}

function hasActiveFootyFilters() {
  return Boolean(
    String(footySearchInput?.value || "").trim() ||
    String(footyDateFromFilter?.value || "").trim() ||
    String(footyDateToFilter?.value || "").trim() ||
    String(footyMatchPeriodFilter?.value || "").trim() ||
    (activeFootyScheduleMode === "competitions" && Boolean(footyCompetitionPastFilter?.checked)) ||
    (footyFriendliesFilter && !footyFriendliesFilter.checked) ||
    (activeFootyScheduleMode !== "competitions" && getSelectedFootyTeams().size > 0)
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
      .map((input) => getFootyTeamFilterKey(input.value))
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
  const parsedDate = timestamp ? parseFootyDate(timestamp) : null;

  if (!parsedDate || Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  return parsedDate.toISOString().slice(0, 10);
}

function syncFootyFilters(fixtures = [], matchPeriodFixtures = fixtures) {
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

  syncFootyMatchPeriodFilter(activeFootyScheduleMode === "competitions" ? matchPeriodFixtures : []);

  const matchPeriodField = footyMatchPeriodFilter?.closest("label");

  if (matchPeriodField) {
    matchPeriodField.hidden = activeFootyScheduleMode !== "competitions";
  }

  const competitionPastField = footyCompetitionPastFilter?.closest("label");

  if (competitionPastField) {
    competitionPastField.hidden = activeFootyScheduleMode !== "competitions";
  }

  const teamFilterField = footyTeamFilter.closest("label");

  if (teamFilterField) {
    teamFilterField.hidden = activeFootyScheduleMode === "competitions";
  }

  const selectedTeams = getSelectedFootyTeams();
  const defaultPrioritySet = getDefaultFootyPrioritySet();
  const defaultTeams = getDefaultFootyTeams(fixtures, defaultPrioritySet);
  const teams = getFootyFilterTeams(fixtures);
  const button = footyTeamFilter.querySelector(".multi-filter-button");
  const options = footyTeamFilter.querySelector(".multi-filter-options");

  if (!button || !options) {
    return;
  }

  const selectedCount = teams.filter((team) => selectedTeams.has(getFootyTeamFilterKey(team))).length;
  button.textContent = teams.length === 0
    ? "No teams loaded"
    : selectedCount === 0
    ? "Default priority teams"
    : selectedCount === 1
    ? teams.find((team) => selectedTeams.has(getFootyTeamFilterKey(team))) || "1 team selected"
    : `${selectedCount} teams selected`;
  button.disabled = teams.length === 0;
  button.setAttribute("aria-expanded", String(shouldShowFootyTeamOptions));
  options.hidden = !shouldShowFootyTeamOptions;
  options.innerHTML = teams.length === 0
    ? `<p class="multi-filter-empty">No teams loaded.</p>`
    : teams.map((team) => {
      const teamKey = getFootyTeamFilterKey(team);
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
      .map((fixture) => getFootyTeamFilterKey(fixture.teamName))
      .filter(Boolean)
  );
}

function getFootyFilterTeams(fixtures = []) {
  const teamsByKey = new Map();

  fixtures.forEach((fixture) => {
    const teamName = String(fixture?.teamName || "").trim();
    const teamKey = getFootyTeamFilterKey(teamName);

    if (!teamName || !teamKey) {
      return;
    }

    const existingTeamName = teamsByKey.get(teamKey);

    if (!existingTeamName || teamName.length > existingTeamName.length) {
      teamsByKey.set(teamKey, teamName);
    }
  });

  return [...teamsByKey.values()]
    .sort((firstTeam, secondTeam) => firstTeam.localeCompare(secondTeam));
}

function getFootyTeamFilterKey(teamName) {
  return normalizeFootyClubName(teamName) || normalizeLookupName(teamName);
}

function getVisibleFootyFixtures(fixtures) {
  return fixtures.filter((fixture) => {
    const isPast = isFootyFixturePast(fixture);

    return shouldShowPastFootyFixtures ? isPast : !isPast;
  });
}

function compareVisibleFootyFixtures(firstFixture, secondFixture) {
  return activeFootyScheduleMode !== "competitions" && shouldShowPastFootyFixtures
    ? compareFootyFixturesDescending(firstFixture, secondFixture)
    : compareFootyFixturesAscending(firstFixture, secondFixture);
}

function compareFootyFixturesAscending(firstFixture, secondFixture) {
  return getFootyFixtureSortTime(firstFixture) - getFootyFixtureSortTime(secondFixture) ||
    String(firstFixture.teamId || "").localeCompare(String(secondFixture.teamId || "")) ||
    String(firstFixture.teamName || "").localeCompare(String(secondFixture.teamName || ""));
}

function compareFootyFixturesDescending(firstFixture, secondFixture) {
  return getFootyFixtureSortTime(secondFixture) - getFootyFixtureSortTime(firstFixture) ||
    String(firstFixture.teamId || "").localeCompare(String(secondFixture.teamId || "")) ||
    String(firstFixture.teamName || "").localeCompare(String(secondFixture.teamName || ""));
}

function getFootyFixtureSortTime(fixture) {
  const comparableTime = getFootyFixtureComparableTime(fixture);
  return Number.isFinite(comparableTime) ? comparableTime : Number.MAX_SAFE_INTEGER;
}

function isFootyFixturePast(fixture) {
  if (hasFootyMatchNoteData(fixture)) {
    return true;
  }

  const pastCutoffTime = getFootyFixturePastCutoffTime(fixture);

  return Number.isFinite(pastCutoffTime) && pastCutoffTime < Date.now();
}

function isFootyFixtureStarted(fixture) {
  const fixtureTime = getFootyFixtureComparableTime(fixture);

  return Number.isFinite(fixtureTime) && fixtureTime < Date.now();
}

function hasFootyMatchNoteData(fixture) {
  const note = fixture?.matchNote;

  if (!note) {
    return false;
  }

  return Boolean(
    String(note.homeScore ?? "").trim() ||
    String(note.awayScore ?? "").trim() ||
    String(note.note ?? "").trim() ||
    String(note.highlightLink ?? "").trim() ||
    (Array.isArray(note.followGoalAssists) && note.followGoalAssists.length > 0) ||
    (Array.isArray(note.opponentGoalAssists) && note.opponentGoalAssists.length > 0)
  );
}

function getFootyFixturePastCutoffTime(fixture) {
  const matchTime = getFootyFixtureComparableTime(fixture);

  if (!Number.isFinite(matchTime)) {
    return Number.NaN;
  }

  const matchDate = new Date(matchTime);
  const endOfDay = new Date(matchDate);
  endOfDay.setHours(23, 59, 59, 999);

  const nextDayStart = new Date(matchDate);
  nextDayStart.setHours(24, 0, 0, 0);

  const twelveHoursAfterMatch = matchTime + 12 * 60 * 60 * 1000;
  const lessThanTwelveHoursToEndOfDay = endOfDay.getTime() - matchTime < 12 * 60 * 60 * 1000;

  return lessThanTwelveHoursToEndOfDay ? twelveHoursAfterMatch : nextDayStart.getTime();
}

function getFootyFixtureComparableTime(fixture) {
  const timestamp = String(fixture?.timestamp || "").trim();
  const date = String(fixture?.date || "").trim();
  const time = String(fixture?.time || "").trim();
  const parsedTimestamp = timestamp ? getFootyDateTimeValue(timestamp) : Number.NaN;

  if (time && Number.isFinite(parsedTimestamp)) {
    return parsedTimestamp;
  }

  if (date) {
    return Date.parse(`${date}T23:59:59`);
  }

  return parsedTimestamp;
}

function isFootyFixtureWithinNextDay(fixture) {
  const fixtureTime = getFootyFixtureComparableTime(fixture);
  const now = Date.now();

  return Number.isFinite(fixtureTime) &&
    fixtureTime >= now &&
    fixtureTime <= now + 24 * 60 * 60 * 1000;
}

function isFootyFixtureToday(fixture) {
  return getFootyFixtureDateKey(fixture) === getDateKey(0);
}

function getFootyFixtureTimingLabel(fixture) {
  if (isFootyFixtureCurrent(fixture)) {
    return "Today";
  }

  if (isFootyFixtureWithinNextDay(fixture)) {
    return "Next 24h";
  }

  return "";
}

function isFootyFixtureCurrent(fixture) {
  const fixtureTime = getFootyFixtureComparableTime(fixture);
  const pastCutoffTime = getFootyFixturePastCutoffTime(fixture);
  const now = Date.now();

  if (!Number.isFinite(fixtureTime) || !Number.isFinite(pastCutoffTime)) {
    return isFootyFixtureToday(fixture);
  }

  return fixtureTime <= now && now <= pastCutoffTime;
}

function syncFootyPastToggle(fixtures = [], isCompetitionMode = activeFootyScheduleMode === "competitions") {
  if (!footyPastToggle) {
    syncFootyGoalAssistsButton();
    syncFootyNotificationToggle();
    return;
  }

  const label = shouldShowPastFootyFixtures ? "Upcoming Matches" : "Past Matches";
  footyPastToggle.hidden = fixtures.length === 0 || isCompetitionMode;
  footyPastToggle.querySelector("span").textContent = label;
  footyPastToggle.setAttribute("aria-label", label);
  footyPastToggle.setAttribute("aria-pressed", String(shouldShowPastFootyFixtures));
  footyPastToggle.disabled = false;
  syncFootyGoalAssistsButton();
  syncFootyNotificationToggle();
}

function syncFootyNotificationToggle() {
  if (!footyNotificationToggle) {
    return;
  }

  const supported = isFootyPushNotificationSupported() || isFootyNotificationSupported();
  const enabled = isFootyNotificationEnabled();

  footyNotificationToggle.hidden = !supported;
  footyNotificationToggle.disabled = !supported || isFootyNotificationBusy;
  footyNotificationToggle.classList.toggle("is-active", enabled);
  footyNotificationToggle.classList.toggle("is-loading", isFootyNotificationBusy);
  footyNotificationToggle.setAttribute("aria-pressed", String(enabled));
  footyNotificationToggle.setAttribute(
    "aria-label",
    isFootyNotificationBusy
      ? "Updating match alerts"
      : enabled ? "Turn off match alerts" : "Subscribe to match alerts",
  );
  footyNotificationToggle.setAttribute(
    "title",
    isFootyNotificationBusy
      ? "Updating match alerts"
      : enabled ? "Match alerts on" : "Notify 2 hours, 1 hour, and at kickoff",
  );
}

function setFootyNotificationStatus(message = "", state = "") {
  if (!footyNotificationStatus) {
    return;
  }

  footyNotificationStatus.textContent = message;
  footyNotificationStatus.classList.toggle("is-error", state === "error");
  footyNotificationStatus.classList.toggle("is-success", state === "success");
}

function isFootyNotificationSupported() {
  return typeof window !== "undefined" &&
    "Notification" in window &&
    window.isSecureContext;
}

function isFootyNotificationEnabled() {
  return getStoredBoolean(FOOTY_NOTIFICATION_STORAGE_KEY) &&
    Notification.permission === "granted";
}

async function toggleFootyNotifications() {
  if (isFootyNotificationBusy) {
    return;
  }

  const supportsPush = isFootyPushNotificationSupported();
  const supportsLocal = isFootyNotificationSupported();

  if (!supportsPush && !supportsLocal) {
    setFootyNotificationStatus("This browser cannot show site notifications here.", "error");
    syncFootyNotificationToggle();
    return;
  }

  isFootyNotificationBusy = true;
  syncFootyNotificationToggle();

  try {
    if (isFootyNotificationEnabled()) {
      setFootyNotificationStatus("Turning off match alerts...");

      if (supportsPush) {
        await unsubscribeFootyPushNotifications();
      }

      setStoredBoolean(FOOTY_NOTIFICATION_STORAGE_KEY, false);
      stopFootyNotificationMonitor();
      setFootyNotificationStatus("Match alerts are off.", "success");
      return;
    }

    setFootyNotificationStatus("Requesting notification permission...");
    const permission = Notification.permission === "granted"
      ? "granted"
      : await Notification.requestPermission();

    if (permission !== "granted") {
      setStoredBoolean(FOOTY_NOTIFICATION_STORAGE_KEY, false);
      setFootyNotificationStatus("Notification permission was not granted.", "error");
      return;
    }

    setStoredBoolean(FOOTY_NOTIFICATION_STORAGE_KEY, true);

    if (supportsPush) {
      setFootyNotificationStatus("Subscribing this device...");
      await subscribeFootyPushNotifications();
      stopFootyNotificationMonitor();
      setFootyNotificationStatus("Match alerts are on for this device.", "success");
    } else {
      startFootyNotificationMonitor();
      checkFootyMatchNotifications();
      setFootyNotificationStatus("Match alerts are on while this browser is open.", "success");
    }
  } catch (error) {
    setStoredBoolean(FOOTY_NOTIFICATION_STORAGE_KEY, false);
    recordDiagnostic("footy notification toggle failed", error);
    setFootyNotificationStatus(`Unable to subscribe: ${getErrorMessage(error)}`, "error");
  } finally {
    isFootyNotificationBusy = false;
    syncFootyNotificationToggle();
  }
}


function getFootyPushEndpoint() {
  return String(FOOTY_PUSH_ENDPOINT || "").trim().replace(/\/$/, "");
}

function isFootyPushNotificationSupported() {
  return Boolean(
    getFootyPushEndpoint() &&
    isFootyNotificationSupported() &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

async function registerBoxThisLapServiceWorker() {
  if (!("serviceWorker" in navigator) || !window.isSecureContext) {
    return null;
  }

  return navigator.serviceWorker.register(`service-worker.js?v=${encodeURIComponent(SITE_VERSION)}`);
}

async function initializeImageCache() {
  if (!imageCacheToggle) {
    return;
  }

  if (!("serviceWorker" in navigator) || !window.isSecureContext) {
    imageCacheToggle.disabled = true;
    imageCachePurge.disabled = true;
    setImageCacheStatus("Unavailable in this browser.");
    return;
  }

  try {
    const registration = await registerBoxThisLapServiceWorker();
    await navigator.serviceWorker.ready;
    imageCacheToggle.disabled = false;
    imageCachePurge.disabled = false;
    syncImageCacheControl();

    navigator.serviceWorker.addEventListener("message", handleImageCacheMessage);
    imageCacheToggle.addEventListener("click", () => saveImageCache(registration));
    imageCachePurge.addEventListener("click", () => purgeImageCache(registration));
  } catch (error) {
    imageCacheToggle.disabled = true;
    imageCachePurge.disabled = true;
    setImageCacheStatus("Unable to start image caching.");
    recordDiagnostic("image cache initialization failed", error);
  }
}

async function saveImageCache(registration) {
  const worker = registration?.active || navigator.serviceWorker.controller;

  if (!worker) {
    setImageCacheStatus("Reload once, then try again.");
    return;
  }

  imageCacheToggle.disabled = true;
  imageCachePurge.disabled = true;

  setStoredBoolean(IMAGE_CACHE_STORAGE_KEY, true);
  syncImageCacheControl();
  setImageCacheStatus("Preparing download…");
  worker.postMessage({ type: "CACHE_ALL_IMAGES" });
}

async function purgeImageCache(registration) {
  const worker = registration?.active || navigator.serviceWorker.controller;

  if (!worker) {
    setImageCacheStatus("Reload once, then try again.");
    return;
  }

  imageCacheToggle.disabled = true;
  imageCachePurge.disabled = true;
  setImageCacheStatus("Purging saved images…");
  worker.postMessage({ type: "CLEAR_IMAGE_CACHE" });
}

function handleImageCacheMessage(event) {
  const message = event.data || {};

  if (message.type === "IMAGE_CACHE_PROGRESS") {
    setImageCacheStatus(`Saving ${message.completed} of ${message.total}…`);
    return;
  }

  if (message.type === "IMAGE_CACHE_COMPLETE") {
    imageCacheToggle.disabled = false;
    imageCachePurge.disabled = false;
    if (message.failed) {
      setStoredBoolean(IMAGE_CACHE_STORAGE_KEY, false);
      setImageCacheStatus(`${message.saved} images saved; ${message.failed} skipped. Tap Save images to retry.`);
    } else {
      setImageCacheStatus(`${message.total} images saved (${formatFileSize(message.bytes)}).`);
    }
    syncImageCacheControl();
    return;
  }

  if (message.type === "IMAGE_CACHE_CLEARED") {
    setStoredBoolean(IMAGE_CACHE_STORAGE_KEY, false);
    imageCacheToggle.disabled = false;
    imageCachePurge.disabled = false;
    setImageCacheStatus("Saved images removed.");
    syncImageCacheControl();
    return;
  }

  if (message.type === "IMAGE_CACHE_ERROR") {
    setStoredBoolean(IMAGE_CACHE_STORAGE_KEY, false);
    imageCacheToggle.disabled = false;
    imageCachePurge.disabled = false;
    setImageCacheStatus(`Download stopped: ${message.message}`);
    syncImageCacheControl();
  }
}

function syncImageCacheControl() {
  const enabled = getStoredBoolean(IMAGE_CACHE_STORAGE_KEY);
  imageCacheToggle.textContent = "Save images";

  if (!imageCacheStatus.textContent) {
    setImageCacheStatus(enabled ? "Images are saved for offline use." : "Viewed images cache automatically.");
  }
}

function setImageCacheStatus(message) {
  if (imageCacheStatus) {
    imageCacheStatus.textContent = message;
  }
}

function formatFileSize(bytes) {
  const megabytes = Number(bytes || 0) / (1024 * 1024);
  return `${megabytes.toFixed(megabytes >= 10 ? 0 : 1)} MB`;
}

async function subscribeFootyPushNotifications() {
  const endpoint = getFootyPushEndpoint();

  if (!endpoint) {
    throw new Error("Footy push endpoint is not configured.");
  }

  const registration = await registerBoxThisLapServiceWorker();

  if (!registration?.pushManager) {
    throw new Error("Push notifications are not available in this browser.");
  }

  const vapidResponse = await fetch(`${endpoint}/vapid-public-key`);

  if (!vapidResponse.ok) {
    throw new Error(`Unable to load push key (${vapidResponse.status}).`);
  }

  const { publicKey } = await vapidResponse.json();
  const storedSubscription = getStoredJsonObject(FOOTY_PUSH_SUBSCRIPTION_STORAGE_KEY, {});
  let existingSubscription = await registration.pushManager.getSubscription();

  if (
    existingSubscription &&
    storedSubscription?.endpoint === existingSubscription.endpoint &&
    storedSubscription?.publicKey !== publicKey
  ) {
    await existingSubscription.unsubscribe().catch((error) =>
      recordDiagnostic("stale footy push subscription unsubscribe failed", error)
    );
    existingSubscription = null;
  }

  const subscription = existingSubscription || await registration.pushManager.subscribe({
    applicationServerKey: base64UrlToUint8Array(publicKey),
    userVisibleOnly: true,
  });
  const saveResponse = await fetch(`${endpoint}/subscribe`, {
    body: JSON.stringify({
      managerId: getCurrentManagerId(),
      pageUrl: window.location.href,
      subscription: subscription.toJSON(),
      userAgent: navigator.userAgent,
    }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

  if (!saveResponse.ok) {
    throw new Error(`Unable to save push subscription (${saveResponse.status}).`);
  }

  setStoredJsonObject(FOOTY_PUSH_SUBSCRIPTION_STORAGE_KEY, {
    endpoint: subscription.endpoint,
    publicKey,
    savedAt: new Date().toISOString(),
  });
}

async function unsubscribeFootyPushNotifications() {
  const endpoint = getFootyPushEndpoint();
  const registration = "serviceWorker" in navigator
    ? await navigator.serviceWorker.getRegistration()
    : null;
  const subscription = registration?.pushManager
    ? await registration.pushManager.getSubscription()
    : null;

  if (subscription) {
    if (endpoint) {
      await fetch(`${endpoint}/unsubscribe`, {
        body: JSON.stringify({ endpoint: subscription.endpoint }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }).catch((error) => recordDiagnostic("footy push unsubscribe failed", error));
    }

    await subscription.unsubscribe().catch((error) => recordDiagnostic("browser push unsubscribe failed", error));
  }

  setStoredJsonObject(FOOTY_PUSH_SUBSCRIPTION_STORAGE_KEY, {});
}

function base64UrlToUint8Array(value) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = `${value}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}

function startFootyNotificationMonitor() {
  if (footyNotificationTimer || !isFootyNotificationEnabled() || isFootyPushNotificationSupported()) {
    return;
  }

  footyNotificationTimer = window.setInterval(
    checkFootyMatchNotifications,
    FOOTY_NOTIFICATION_CHECK_INTERVAL_MS,
  );
}

function stopFootyNotificationMonitor() {
  if (!footyNotificationTimer) {
    return;
  }

  window.clearInterval(footyNotificationTimer);
  footyNotificationTimer = null;
}

function checkFootyMatchNotifications() {
  if (isFootyPushNotificationSupported() || !isFootyNotificationEnabled() || !siteData.footySchedule) {
    return;
  }

  const now = Date.now();
  const sentNotifications = getStoredJsonObject(FOOTY_NOTIFICATION_SENT_STORAGE_KEY);
  let didUpdateSentNotifications = false;

  getFootyScheduleFixtures(siteData.footySchedule).forEach((fixture) => {
    if (!hasFootyFixtureNotificationTime(fixture)) {
      return;
    }

    const fixtureTime = getFootyFixtureComparableTime(fixture);

    if (!Number.isFinite(fixtureTime)) {
      return;
    }

    FOOTY_NOTIFICATION_OFFSETS.forEach((offset) => {
      const notificationTime = fixtureTime - offset.minutes * 60 * 1000;
      const notificationKey = getFootyNotificationKey(fixture, offset.key);

      if (
        sentNotifications[notificationKey] ||
        now < notificationTime ||
        now - notificationTime > FOOTY_NOTIFICATION_WINDOW_MS
      ) {
        return;
      }

      sentNotifications[notificationKey] = new Date(now).toISOString();
      didUpdateSentNotifications = true;
      showFootyMatchNotification(fixture, offset);
    });
  });

  if (didUpdateSentNotifications) {
    setStoredJsonObject(FOOTY_NOTIFICATION_SENT_STORAGE_KEY, sentNotifications);
  }
}

function hasFootyFixtureNotificationTime(fixture) {
  const time = String(fixture?.time || "").trim();
  const timestamp = String(fixture?.timestamp || "").trim();

  return Boolean(time || /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(timestamp));
}

function getFootyNotificationKey(fixture, offsetKey) {
  return [
    String(fixture.matchId || fixture.id || "").trim(),
    getFootyFixtureDateKey(fixture),
    normalizeLookupName(`${fixture.home || ""} ${fixture.away || ""}`),
    offsetKey,
  ].filter(Boolean).join("|");
}

function showFootyMatchNotification(fixture, offset) {
  const title = offset.key === "start"
    ? "Match starting now"
    : `Match starts ${offset.label}`;
  const bodyParts = [
    `${fixture.home || "TBD"} v ${fixture.away || "TBD"}`,
    formatFootyFixtureDate(fixture.timestamp || fixture.date),
  ].filter(Boolean);

  try {
    const notification = new Notification(title, {
      body: bodyParts.join(" • "),
      tag: getFootyNotificationKey(fixture, offset.key),
    });

    notification.onclick = () => {
      window.focus();
      showPage("footy", { scrollToTop: true });
      window.location.hash = "footy";
      notification.close();
    };
  } catch (error) {
    recordDiagnostic("footy notification failed", error, {
      matchId: fixture.matchId || fixture.id || "",
      offset: offset.key,
    });
  }
}

function getStoredBoolean(key) {
  try {
    return localStorage.getItem(key) === "true";
  } catch {
    return false;
  }
}

function setStoredBoolean(key, value) {
  try {
    localStorage.setItem(key, value ? "true" : "false");
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
}

function getStoredJsonObject(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function setStoredJsonObject(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value || {}));
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
}

function syncFootyGoalAssistsButton() {
  if (!footyGoalAssistsButton) {
    return;
  }

  footyGoalAssistsButton.hidden = activeFootyScheduleMode === "competitions" || !isCurrentManagerAdmin() || !shouldShowPastFootyFixtures;
}

function syncFootyMatchPeriodFilter(fixtures = []) {
  if (!footyMatchPeriodFilter) {
    return;
  }

  const selectedValue = String(footyMatchPeriodFilter.value || "");
  const recordsByKey = new Map();

  fixtures.forEach((fixture) => {
    const record = getFootyMatchPeriod(fixture);

    if (record && !recordsByKey.has(record.key)) {
      recordsByKey.set(record.key, record);
    }
  });

  const records = [...recordsByKey.values()].sort((first, second) => (
    first.sortGroup - second.sortGroup ||
    first.sortNumber - second.sortNumber ||
    first.label.localeCompare(second.label)
  ));

  footyMatchPeriodFilter.innerHTML = [
    '<option value="">All match weeks / days</option>',
    ...records.map((record) => `<option value="${escapeHtml(record.key)}">${escapeHtml(record.label)}</option>`),
  ].join("");
  footyMatchPeriodFilter.value = recordsByKey.has(selectedValue) ? selectedValue : "";
  footyMatchPeriodFilter.disabled = records.length === 0;
}

function getFootyMatchPeriod(fixture = {}) {
  const rawRound = String(fixture.round || "").trim();

  if (!rawRound || !isFootyLeagueMatchWeekCompetition(fixture)) {
    return null;
  }

  const numericMatch = rawRound.match(/^\d+$/) || rawRound.match(/^(?:match\s*(?:week|day)|gameweek|mw)\s*(\d+)$/i);

  if (numericMatch) {
    const number = Number(numericMatch[1] || numericMatch[0]);

    return {
      key: `match-week:${number}`,
      label: `Match Week ${number}`,
      sortGroup: 1,
      sortNumber: number,
    };
  }

  return null;
}

function isFootyLeagueMatchWeekCompetition(fixture = {}) {
  const competitionKey = getFootyCanonicalCompetition(fixture.league).key;
  return ["premier league", "la liga", "championship", "mls"].includes(competitionKey);
}

function renderFootyCalendarWeekGroups(fixtures = []) {
  const groups = [];

  fixtures.forEach((fixture) => {
    const week = getFootyCalendarWeek(fixture);
    let group = groups.find((record) => record.key === week.key);

    if (!group) {
      group = { ...week, fixtures: [] };
      groups.push(group);
    }

    group.fixtures.push(fixture);
  });

  return groups.map((group) => `
    <section class="footy-calendar-week" aria-label="${escapeHtml(group.label)}">
      <header class="footy-calendar-week-header">
        <h2>${escapeHtml(group.label)}</h2>
        <span>${escapeHtml(String(group.fixtures.length))} ${group.fixtures.length === 1 ? "match" : "matches"}</span>
      </header>
      <div class="footy-calendar-week-matches">
        ${group.fixtures.map(renderFootyFixture).join("")}
      </div>
    </section>
  `).join("");
}

function getFootyCalendarWeek(fixture = {}) {
  const dateKey = getFootyFixtureDateKey(fixture);

  if (!dateKey) {
    return { key: "date-tbc", label: "Date TBC" };
  }

  const fixtureDate = new Date(`${dateKey}T12:00:00`);

  if (Number.isNaN(fixtureDate.getTime())) {
    return { key: "date-tbc", label: "Date TBC" };
  }

  const weekStart = new Date(fixtureDate);
  const daysSinceMonday = (weekStart.getDay() + 6) % 7;
  weekStart.setDate(weekStart.getDate() - daysSinceMonday);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const startLabel = weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const endLabel = weekEnd.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

  return {
    key: formatLocalDateKey(weekStart),
    label: `${startLabel} – ${endLabel}`,
  };
}

function formatLocalDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
  const isCompetitionFixture = Boolean(fixture.isCompetitionFixture);
  const scheduleBadge = String(fixture.teamBadge || (fixture.isHome ? fixture.homeBadge : fixture.awayBadge) || "").trim();
  const localBadge = getFootyLocalTeamBadge(fixture.teamName, fixture.teamId);
  const fallbackBadge = getFootyFixtureFallbackBadge(fixture);
  const timingLabel = getFootyFixtureTimingLabel(fixture);
  const isHighlighted = Boolean(timingLabel);
  const matchId = String(fixture.matchId || "").trim();
  const isExpanded = matchId && expandedFootyMatchIds.has(matchId);
  const score = getFootyMatchScore(fixture);
  const resultClass = getFootyFixtureResultClass(fixture);
  const matchPeriod = isCompetitionFixture ? getFootyMatchPeriod(fixture) : null;
  const isPastCompetitionFixture = isCompetitionFixture && isFootyFixturePast(fixture);
  const cardClasses = [
    "footy-fixture-card",
    isCompetitionFixture ? "footy-fixture-card--competition" : "",
    isPastCompetitionFixture ? "footy-fixture-card--past" : "",
    isHighlighted ? "footy-fixture-card--soon" : "",
    resultClass,
    isExpanded ? "is-expanded" : "",
  ].filter(Boolean).join(" ");
  const venueMarkup = shouldShowFootyFixtureVenue(fixture)
    ? `<p>${escapeHtml(fixture.venue)}</p>`
    : "";
  const titleMarkup = score
    ? `${escapeHtml(fixture.home || "TBD")} ${escapeHtml(score.homeScore)} &middot; ${escapeHtml(fixture.away || "TBD")} ${escapeHtml(score.awayScore)}`
    : `${escapeHtml(fixture.home || "TBD")} v ${escapeHtml(fixture.away || "TBD")}`;
  const highlightMarkup = fixture.matchNote?.highlightLink
    ? `
      <a class="icon-action-button footy-highlight-button" href="${escapeHtml(fixture.matchNote.highlightLink)}" target="_blank" rel="noopener noreferrer" aria-label="Open match highlights">
        <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
          <path d="M8 5v14l11-7L8 5Z"></path>
        </svg>
      </a>
    `
    : "";
  const detailsMarkup = isExpanded ? renderFootyFixtureDetails(fixture) : "";
  const followedTeamLabel = Array.isArray(fixture.followedTeamNames) && fixture.followedTeamNames.length > 0
    ? fixture.followedTeamNames.join(" · ")
    : fixture.teamName || "";
  const followedTeamMarkup = followedTeamLabel
    ? `
      <span class="footy-followed-team-label">${escapeHtml(followedTeamLabel)}</span>
      <span class="footy-side-chip" aria-label="${fixture.isHome ? "Home" : "Away"}">${escapeHtml(sideLabel)}</span>
    `
    : "";
  const badgeMarkup = isCompetitionFixture
    ? renderFootyCompetitionBadgePair(fixture)
    : `
      <div class="footy-fixture-badge" aria-hidden="true">
        ${renderFootyBadgeMarkup({
          fallbackSrc: localBadge,
          fallbackText: fallbackBadge,
          primarySrc: scheduleBadge,
        })}
      </div>
    `;

  return `
    <article class="${cardClasses}" data-footy-match-id="${escapeHtml(matchId)}" ${matchId ? `role="button" tabindex="0" aria-expanded="${String(Boolean(isExpanded))}"` : ""}>
      ${badgeMarkup}
      <div>
        <h2>${titleMarkup}</h2>
        <p class="footy-fixture-meta">
          ${followedTeamMarkup}
          ${fixture.league ? `<span>${escapeHtml(fixture.league)}</span>` : ""}
          ${matchPeriod ? `<span class="footy-match-period-chip">${escapeHtml(matchPeriod.label)}</span>` : ""}
        </p>
        ${venueMarkup}
      </div>
      <div class="footy-fixture-side-actions">
        <strong>${escapeHtml(dateLabel)}</strong>
        ${highlightMarkup}
      </div>
      ${detailsMarkup}
    </article>
  `;
}

function renderFootyCompetitionBadgePair(fixture = {}) {
  const homeBadge = String(fixture.homeBadge || "").trim();
  const awayBadge = String(fixture.awayBadge || "").trim();
  const followedHomeBadge = String(fixture.followedHomeBadge || "").trim();
  const followedAwayBadge = String(fixture.followedAwayBadge || "").trim();

  return `
    <div class="footy-competition-badge-pair" aria-hidden="true">
      <span class="footy-fixture-badge">
        ${renderFootyBadgeMarkup({
          fallbackSrc: homeBadge ? followedHomeBadge : "",
          fallbackText: getFootyTeamFallbackBadge(fixture.home),
          primarySrc: homeBadge || followedHomeBadge,
        })}
      </span>
      <span class="footy-fixture-badge">
        ${renderFootyBadgeMarkup({
          fallbackSrc: awayBadge ? followedAwayBadge : "",
          fallbackText: getFootyTeamFallbackBadge(fixture.away),
          primarySrc: awayBadge || followedAwayBadge,
        })}
      </span>
    </div>
  `;
}

function getFootyFollowedTeamBadgeMap(fixtures = []) {
  const badges = new Map();

  fixtures.forEach((fixture) => {
    const badge = String(fixture.teamBadge || "").trim();
    const teamName = String(fixture.teamName || "").trim();

    if (!badge || !teamName) {
      return;
    }

    [normalizeLookupName(teamName), normalizeFootyClubName(teamName)]
      .filter(Boolean)
      .forEach((key) => badges.set(key, badge));
  });

  return badges;
}

function getFootyFollowedTeamBadge(badges, teamName) {
  return badges.get(normalizeLookupName(teamName)) ||
    badges.get(normalizeFootyClubName(teamName)) ||
    "";
}

function shouldRenderFootyNoteEditButton(fixture) {
  return Boolean(
    isCurrentManagerAdmin() &&
    fixture?.matchId &&
    (isFootyFixtureStarted(fixture) || hasFootyMatchNoteData(fixture))
  );
}

function toggleFootyFixtureExpansion(matchId) {
  const normalizedId = String(matchId || "").trim();

  if (!normalizedId) {
    return;
  }

  if (expandedFootyMatchIds.has(normalizedId)) {
    expandedFootyMatchIds.delete(normalizedId);
  } else {
    expandedFootyMatchIds.add(normalizedId);
  }

  renderFootySchedule(siteData.footySchedule);
  renderFootyTeamPage();
}

function renderFootyFixtureDetails(fixture) {
  const matchNoteMarkup = renderFootyMatchNote(fixture);
  const editMarkup = shouldRenderFootyNoteEditButton(fixture)
    ? `
      <div class="footy-fixture-detail-actions">
        <button class="action-button footy-note-edit-button" type="button" data-footy-note-edit="${escapeHtml(fixture.matchId)}">Edit</button>
      </div>
    `
    : "";
  const emptyMarkup = !matchNoteMarkup
    ? `<p class="table-message footy-match-note-empty">No match details saved yet.</p>`
    : "";

  return `
    <div class="footy-fixture-details">
      ${matchNoteMarkup}
      ${emptyMarkup}
      ${editMarkup}
    </div>
  `;
}

function getFootyMatchScore(fixture) {
  const note = fixture?.matchNote || {};
  const homeScore = String(note.homeScore ?? "").trim();
  const awayScore = String(note.awayScore ?? "").trim();

  if (!homeScore && !awayScore) {
    return null;
  }

  return {
    awayScore: awayScore || "-",
    homeScore: homeScore || "-",
  };
}

function getFootyFixtureResultClass(fixture) {
  const score = getFootyMatchScore(fixture);

  if (!score) {
    return "";
  }

  const homeScore = Number(score.homeScore);
  const awayScore = Number(score.awayScore);

  if (!Number.isFinite(homeScore) || !Number.isFinite(awayScore)) {
    return "";
  }

  const sides = getFootyFixtureSides(fixture);
  const followedScore = sides.followed === "home" ? homeScore : awayScore;
  const opponentScore = sides.followed === "home" ? awayScore : homeScore;

  if (followedScore > opponentScore) {
    return "footy-fixture-card--win";
  }

  if (followedScore < opponentScore) {
    return "footy-fixture-card--loss";
  }

  return "footy-fixture-card--draw";
}

function getFootyFollowedSideName(fixture) {
  const sides = getFootyFixtureSides(fixture);

  return sides.followed === "home"
    ? fixture?.home || fixture?.teamName || "Followed"
    : fixture?.away || fixture?.teamName || "Followed";
}

function getFootyOpponentSideName(fixture) {
  const sides = getFootyFixtureSides(fixture);

  return sides.opponent === "home"
    ? fixture?.home || fixture?.opponent || "Opponent"
    : fixture?.away || fixture?.opponent || "Opponent";
}

function getFootyFixtureSides(fixture) {
  const followedTeam = String(fixture?.teamName || "").trim();
  const homeTeam = String(fixture?.home || "").trim();
  const awayTeam = String(fixture?.away || "").trim();

  if (followedTeam) {
    if (isSameFootyTeamName(followedTeam, homeTeam)) {
      return { followed: "home", opponent: "away" };
    }

    if (isSameFootyTeamName(followedTeam, awayTeam)) {
      return { followed: "away", opponent: "home" };
    }
  }

  return fixture?.isHome
    ? { followed: "home", opponent: "away" }
    : { followed: "away", opponent: "home" };
}

function isSameFootyTeamName(firstName, secondName) {
  const first = normalizeFootyClubName(firstName);
  const second = normalizeFootyClubName(secondName);

  return Boolean(first && second && first === second);
}

function normalizeFootyClubName(name) {
  return normalizeLookupName(name)
    .replace(/\b(afc|cf|fc|sc)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function openFootyNoteDialog(matchId) {
  const fixture = getFootyFixtureByMatchId(matchId);

  if (!fixture || !footyNoteDialog) {
    return;
  }

  activeFootyNoteMatchId = String(matchId || "").trim();
  const note = fixture.matchNote || {};

  if (footyNoteMatchId) {
    footyNoteMatchId.textContent = activeFootyNoteMatchId ? `Match ID ${activeFootyNoteMatchId}` : "";
  }

  if (footyNoteTitle) {
    footyNoteTitle.textContent = `${fixture.home || "Home"} v ${fixture.away || "Away"}`;
  }

  if (footyNoteHomeScore) {
    footyNoteHomeScore.value = String(note.homeScore ?? "");
  }

  if (footyNoteAwayScore) {
    footyNoteAwayScore.value = String(note.awayScore ?? "");
  }

  footyNoteGoalAssistEntries.follow = normalizeFootyGoalAssistList(note.followGoalAssists);
  footyNoteGoalAssistEntries.opponent = normalizeFootyGoalAssistList(note.opponentGoalAssists);
  clearFootyNoteGoalAssistInputs("follow");
  clearFootyNoteGoalAssistInputs("opponent");
  renderFootyNoteGoalAssistEntries("follow");
  renderFootyNoteGoalAssistEntries("opponent");
  applyFootyNoteRosterOptions(fixture);
  ensureFootyRosters()
    .then(() => applyFootyNoteRosterOptions(fixture))
    .catch((error) => {
      recordDiagnostic("footy rosters failed to load", error);
      console.warn("Box This Lap footy rosters failed to load", error);
    });

  if (footyNoteText) {
    footyNoteText.value = String(note.note || "");
  }

  if (footyNoteHighlightLink) {
    footyNoteHighlightLink.value = String(note.highlightLink || "");
  }

  setFootyNoteStatus("");
  footyNoteSave && (footyNoteSave.disabled = false);

  if (typeof footyNoteDialog.showModal === "function") {
    footyNoteDialog.showModal();
  } else {
    footyNoteDialog.setAttribute("open", "");
  }
}

function closeFootyNoteDialog() {
  activeFootyNoteMatchId = "";
  closeAutocompleteDropdown();

  if (!footyNoteDialog) {
    return;
  }

  if (typeof footyNoteDialog.close === "function") {
    footyNoteDialog.close();
  } else {
    footyNoteDialog.removeAttribute("open");
  }
}

function getFootyFixtureByMatchId(matchId) {
  const normalizedId = String(matchId || "").trim();

  if (!normalizedId) {
    return null;
  }

  return getFootyScheduleFixtures(siteData.footySchedule)
    .find((fixture) => String(fixture.matchId || "").trim() === normalizedId) || null;
}

function normalizeFootyGoalAssistForNote(event) {
  const normalized = {
    scorer: String(event?.scorer || "").trim(),
    assister: String(event?.assister || "").trim(),
    penalty: Boolean(event?.penalty),
  };

  if (event?.minute !== undefined && event?.minute !== null && String(event.minute).trim()) {
    normalized.minute = String(event.minute).trim();
  }

  return normalized;
}

function formatFootyGoalAssistMinute(minute) {
  const rawMinute = String(minute || "").trim();

  if (!rawMinute) {
    return "";
  }

  const normalizedMinute = rawMinute
    .replace(/[’`]/g, "'")
    .replace(/\s*'\s*/g, "")
    .replace(/\s*\+\s*/g, " +")
    .trim();
  const match = normalizedMinute.match(/^(\d+)(?:\s*\+(\d+))?$/);

  if (!match) {
    return rawMinute;
  }

  return match[2] ? `${match[1]}' +${match[2]}` : `${match[1]}'`;
}

function normalizeFootyGoalAssistList(events = []) {
  return Array.isArray(events)
    ? events.map(normalizeFootyGoalAssistForNote)
    : [];
}

function buildFootyMatchNoteFromDialog() {
  commitPendingFootyNoteGoalAssistEntries();

  return {
    matchId: activeFootyNoteMatchId,
    homeScore: String(footyNoteHomeScore?.value ?? "").trim(),
    awayScore: String(footyNoteAwayScore?.value ?? "").trim(),
    followGoalAssists: normalizeFootyGoalAssistList(footyNoteGoalAssistEntries.follow),
    opponentGoalAssists: normalizeFootyGoalAssistList(footyNoteGoalAssistEntries.opponent),
    note: String(footyNoteText?.value ?? "").trim(),
    highlightLink: String(footyNoteHighlightLink?.value ?? "").trim(),
  };
}

function saveFootyNoteGoalAssistEntry(side) {
  if (!isFootyNoteGoalAssistSide(side)) {
    return;
  }

  if (!commitPendingFootyNoteGoalAssistEntry(side)) {
    setFootyNoteStatus("Add a scorer, assister, or penalty before saving a G/A entry.", true);
    return;
  }

  setFootyNoteStatus("G/A entry saved.");
}

function commitPendingFootyNoteGoalAssistEntries() {
  commitPendingFootyNoteGoalAssistEntry("follow");
  commitPendingFootyNoteGoalAssistEntry("opponent");
}

function commitPendingFootyNoteGoalAssistEntry(side) {
  if (!isFootyNoteGoalAssistSide(side)) {
    return false;
  }

  const builder = getFootyNoteGoalAssistBuilder(side);
  const scorer = String(builder?.querySelector("[data-footy-note-ga-field=\"scorer\"]")?.value || "").trim();
  const assister = String(builder?.querySelector("[data-footy-note-ga-field=\"assister\"]")?.value || "").trim();
  const minute = String(builder?.querySelector("[data-footy-note-ga-field=\"minute\"]")?.value || "").trim();
  const penalty = Boolean(builder?.querySelector("[data-footy-note-ga-field=\"penalty\"]")?.checked);

  if (!scorer && !assister && !minute && !penalty) {
    return false;
  }

  footyNoteGoalAssistEntries[side].push({ scorer, assister, minute, penalty });
  clearFootyNoteGoalAssistInputs(side);
  renderFootyNoteGoalAssistEntries(side);
  return true;
}

function renderFootyNoteGoalAssistEntries(side) {
  if (!isFootyNoteGoalAssistSide(side)) {
    return;
  }

  const savedList = document.querySelector(`[data-footy-note-ga-saved="${side}"]`);
  const entries = footyNoteGoalAssistEntries[side];
  const emptyLabel = side === "follow" ? "No saved followed-team entries." : "No saved opponent entries.";

  if (!savedList) {
    return;
  }

  if (!entries.length) {
    savedList.innerHTML = `<p class="table-message">${emptyLabel}</p>`;
    return;
  }

  savedList.innerHTML = `
    <ul class="footy-goal-assists-chip-list" aria-label="${side === "follow" ? "Followed team" : "Opponent"} goal assist entries">
      ${entries.map((entry, index) => renderFootyNoteGoalAssistChip(entry, side, index)).join("")}
    </ul>
  `;
}

function renderFootyNoteGoalAssistChip(entry, side, index) {
  const title = getFootyGoalAssistLabel(entry, index);
  const penaltyLabel = entry.penalty ? `<span class="footy-goal-assist-penalty">(P)</span>` : "";

  return `
    <li>
      <button class="footy-goal-assist-chip" type="button" data-footy-note-ga-delete="${escapeHtml(side)}" data-footy-note-ga-index="${index}" title="${escapeHtml(title)}" aria-label="Delete ${escapeHtml(title)}">
        <span class="footy-goal-assist-saved-icon" aria-hidden="true">&#10003;</span>
        <span>${escapeHtml(getFootyGoalAssistChipText(entry, index))}</span>
        ${penaltyLabel}
        &times;
      </button>
    </li>
  `;
}

function deleteFootyNoteGoalAssistEntry(side, index) {
  if (!isFootyNoteGoalAssistSide(side) || !Number.isInteger(index)) {
    return;
  }

  footyNoteGoalAssistEntries[side].splice(index, 1);
  renderFootyNoteGoalAssistEntries(side);
  setFootyNoteStatus("G/A entry removed.");
}

function clearFootyNoteGoalAssistInputs(side) {
  const builder = getFootyNoteGoalAssistBuilder(side);

  if (!builder) {
    return;
  }

  const scorer = builder.querySelector("[data-footy-note-ga-field=\"scorer\"]");
  const assister = builder.querySelector("[data-footy-note-ga-field=\"assister\"]");
  const minute = builder.querySelector("[data-footy-note-ga-field=\"minute\"]");
  const penalty = builder.querySelector("[data-footy-note-ga-field=\"penalty\"]");

  if (scorer) {
    scorer.value = "";
  }

  if (assister) {
    assister.value = "";
  }

  if (minute) {
    minute.value = "";
  }

  if (penalty) {
    penalty.checked = false;
  }
}

function getFootyNoteGoalAssistBuilder(side) {
  return document.querySelector(`[data-footy-note-ga-side="${side}"]`);
}

function isFootyNoteGoalAssistSide(side) {
  return side === "follow" || side === "opponent";
}

async function saveFootyMatchNoteFromDialog() {
  if (!activeFootyNoteMatchId) {
    setFootyNoteStatus("No match is selected.", true);
    return;
  }

  if (!FOOTY_DATA_ENDPOINT) {
    setFootyNoteStatus("Footy data endpoint is not configured.", true);
    return;
  }

  let note;

  try {
    note = buildFootyMatchNoteFromDialog();
  } catch (error) {
    setFootyNoteStatus(error.message, true);
    return;
  }

  footyNoteSave && (footyNoteSave.disabled = true);
  setFootyNoteStatus("Saving match note...");

  try {
    const response = await submitFootyDataPayload({
      action: "saveFootyMatchNote",
      note,
      pageUrl: window.location.href,
      submittedAt: new Date().toISOString(),
    });
    const savedNote = response.savedNote || note;

    upsertFootyMatchNote(savedNote);
    updateFootyFixtureMatchNote(savedNote);
    renderFootySchedule(siteData.footySchedule);
    closeFootyNoteDialog();
  } catch (error) {
    setFootyNoteStatus(error.message || "Unable to save match note.", true);
    footyNoteSave && (footyNoteSave.disabled = false);
  }
}

function hasFootyMatchNotesLoaded() {
  return Boolean(siteData.footyMatchNotesLoadedAt);
}

function shouldRefreshFootyMatchNotes() {
  const loadedAt = Date.parse(siteData.footyMatchNotesLoadedAt || "");

  return !Number.isFinite(loadedAt) || Date.now() - loadedAt > FOOTY_MATCH_NOTES_FRESH_MS;
}

function shouldWaitForFootyMatchNotes() {
  return shouldShowPastFootyFixtures && (!hasFootyMatchNotesLoaded() || shouldRefreshFootyMatchNotes());
}

function ensureFootyMatchNotes({ force = false } = {}) {
  if (!FOOTY_DATA_ENDPOINT) {
    siteData.footyMatchNotes = [];
    siteData.footyMatchNotesLoadedAt = new Date().toISOString();
    return Promise.resolve([]);
  }

  if (!force && hasFootyMatchNotesLoaded() && !shouldRefreshFootyMatchNotes()) {
    return Promise.resolve(siteData.footyMatchNotes || []);
  }

  if (footyMatchNotesLoadPromise) {
    return footyMatchNotesLoadPromise;
  }

  footyMatchNotesLoadPromise = loadFootyMatchNotesWithRetry()
    .then((notes) => {
      siteData.footyMatchNotes = notes;
      siteData.footyMatchNotesLoadedAt = new Date().toISOString();
      siteData.footyMatchNotesError = null;
      clearFootyScheduleMatchNotes(siteData.footySchedule);
      mergeFootyMatchNotes(notes);
      return notes;
    })
    .finally(() => {
      footyMatchNotesLoadPromise = null;
    });

  return footyMatchNotesLoadPromise;
}

function refreshFootyMatchNotesIfNeeded() {
  if (!siteData.footySchedule || !shouldShowPastFootyFixtures || !shouldRefreshFootyMatchNotes()) {
    return;
  }

  renderFootySchedule(siteData.footySchedule);
}

async function loadFootyMatchNotesWithRetry() {
  const retryDelays = [0, 450, 1400];
  let lastError;

  for (const delay of retryDelays) {
    if (delay) {
      await wait(delay);
    }

    try {
      return await loadFootyMatchNotes();
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("Unable to load footy match notes.");
}

function wait(durationMs) {
  return new Promise((resolve) => window.setTimeout(resolve, durationMs));
}

function loadFootyMatchNotes() {
  if (!FOOTY_DATA_ENDPOINT) {
    return Promise.resolve([]);
  }

  const callbackName = `boxThisLapFootyNotes${Date.now()}${Math.random().toString(36).slice(2)}`;
  const callbackId = `footy-notes-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return new Promise((resolve, reject) => {
    let script;
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("No response from the footy match notes endpoint."));
    }, FOOTY_JSONP_TIMEOUT_MS);

    function cleanup() {
      window.clearTimeout(timeout);
      delete window[callbackName];
      script?.remove();
    }

    window[callbackName] = (data) => {
      if (!data || data.source !== "boxthislap-footy-data" || data.callbackId !== callbackId) {
        return;
      }

      cleanup();

      if (!data.ok) {
        reject(new Error(data.error || "Unable to load footy match notes."));
        return;
      }

      resolve(Array.isArray(data.notes) ? data.notes : []);
    };

    const url = new URL(FOOTY_DATA_ENDPOINT);
    url.searchParams.set("action", "listFootyMatchNotes");
    url.searchParams.set("callback", callbackName);
    url.searchParams.set("callbackId", callbackId);
    script = document.createElement("script");
    script.async = true;
    script.src = url.toString();
    script.onerror = () => {
      cleanup();
      reject(new Error("Unable to reach the footy match notes endpoint."));
    };
    document.head.append(script);
  });
}

function ensureFootyRosters() {
  if (Array.isArray(siteData.footyRosters)) {
    return Promise.resolve(siteData.footyRosters);
  }

  if (footyRosterLoadPromise) {
    return footyRosterLoadPromise;
  }

  footyRosterLoadPromise = loadFootyRosters()
    .then((rosters) => {
      siteData.footyRosters = normalizeFootyRosters(rosters);
      return siteData.footyRosters;
    })
    .catch((error) => {
      footyRosterLoadPromise = null;
      throw error;
    });

  return footyRosterLoadPromise;
}

function loadFootyRosters() {
  if (!FOOTY_DATA_ENDPOINT) {
    return Promise.resolve([]);
  }

  const callbackName = `boxThisLapFootyRosters${Date.now()}${Math.random().toString(36).slice(2)}`;
  const callbackId = `footy-rosters-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return new Promise((resolve, reject) => {
    let script;
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("No response from the footy roster endpoint."));
    }, FOOTY_ROSTER_JSONP_TIMEOUT_MS);

    function cleanup() {
      window.clearTimeout(timeout);
      delete window[callbackName];
      script?.remove();
    }

    window[callbackName] = (data) => {
      if (!data || data.source !== "boxthislap-footy-data" || data.callbackId !== callbackId) {
        return;
      }

      cleanup();

      if (!data.ok) {
        reject(new Error(data.error || "Unable to load footy rosters."));
        return;
      }

      resolve(Array.isArray(data.rosters) ? data.rosters : []);
    };

    const url = new URL(FOOTY_DATA_ENDPOINT);
    url.searchParams.set("action", "listFootyRosters");
    url.searchParams.set("callback", callbackName);
    url.searchParams.set("callbackId", callbackId);
    script = document.createElement("script");
    script.async = true;
    script.src = url.toString();
    script.onerror = () => {
      cleanup();
      reject(new Error("Unable to reach the footy roster endpoint."));
    };
    document.head.append(script);
  });
}

function normalizeFootyRosters(rosters = []) {
  return rosters
    .map((roster) => {
      const teamId = String(roster.teamId || roster["Team ID"] || roster.id || roster.ID || "").trim();

      return {
        players: Array.isArray(roster.players)
          ? roster.players
              .map((player) => normalizeFootyRosterPlayer({
                ...player,
                season: player.season || player.Season || roster.season,
                teamId: player.teamId || player["Team ID"] || teamId,
              }))
              .filter((player) => player.name)
          : [],
        season: String(roster.season || "").trim(),
        sheetName: String(roster.sheetName || "").trim(),
        team: String(roster.team || roster.name || "").trim(),
        teamId,
      };
    })
    .filter((roster) => (roster.team || roster.teamId) && roster.players.length > 0);
}

function normalizeFootyRosterPlayer(player = {}) {
  const id = String(player.id || player.ID || "").trim();
  const season = String(player.season || player.Season || "").trim();
  const teamId = String(player.teamId || player["Team ID"] || "").trim();
  const transparent = String(player.transparent || player.Transparent || "").trim();
  const imagePaths = getFootyPlayerTransparentPaths({ id, season, teamId, transparent });

  return {
    appearances: String(player.app || player.App || player.appearances || player.Appearances || "").trim(),
    birthday: String(player.birthday || player.Birthday || "").trim(),
    clubJoinedFrom: String(player.left || player.Left || player.clubJoinedFrom || player["Club Joined From"] || "").trim(),
    fromAcademy: normalizeBooleanish(player.fromAcademy || player.FromAcademy),
    homeCountry: String(player.home || player.Home || player.homeCountry || player["Home Country"] || "").trim(),
    id,
    imageFallbackPaths: imagePaths.slice(1),
    imagePath: imagePaths[0] || "",
    isNew: normalizeFootyRosterMarker(player.new || player.New),
    name: String(player.player || player.Player || player.name || "").trim(),
    number: String(player.number || player["#"] || "").trim(),
    position: String(player.position || player.Position || "").trim(),
    season,
    teamId,
    transparent,
    transferOut: normalizeBooleanish(player.transferOut || player.TransferOut),
    yearJoined: String(player.joined || player.Joined || player.yearJoined || player["Year Joined"] || "").trim(),
  };
}

function getFootyPlayerTransparentPaths(player = {}) {
  const id = String(player.id || "").trim();
  const season = String(player.season || "").trim();
  const teamId = String(player.teamId || "").trim();
  const transparent = String(player.transparent || "").trim();

  if (!teamId || !transparent) {
    return [];
  }

  const seasonKey = season.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "");
  const encodedTeamId = encodeURIComponent(teamId);
  const encodedTransparent = encodeURIComponent(transparent);
  const paths = [];

  if (seasonKey && id) {
    paths.push(`assets/players/${encodeURIComponent(seasonKey)}/${encodedTeamId}/${encodeURIComponent(id)}/${encodedTransparent}`);
  }

  if (id) {
    paths.push(`assets/players/${encodedTeamId}/${encodeURIComponent(id)}/${encodedTransparent}`);
  }

  paths.push(
    `assets/players/${encodedTeamId}/1/${encodedTransparent}`,
    `assets/players/${encodedTeamId}/${encodedTransparent}`,
    `assets/players/${encodedTransparent}`
  );

  return [...new Set(paths)];
}

function normalizeBooleanish(value) {
  const normalizedValue = normalizeLookupName(value);

  return ["1", "true", "yes", "y"].includes(normalizedValue);
}

function normalizeFootyRosterMarker(value) {
  const normalizedValue = normalizeLookupName(value);

  return Boolean(normalizedValue) && !["0", "false", "no", "n"].includes(normalizedValue);
}

function applyFootyNoteRosterOptions(fixture) {
  if (activeAutocompleteInput) {
    renderFootyPlayerAutocomplete(activeAutocompleteInput);
  }
}

function isFootyPlayerAutocompleteInput(input) {
  return Boolean(input?.matches?.("[data-footy-note-ga-field=\"scorer\"], [data-footy-note-ga-field=\"assister\"]"));
}

function getFootyPlayerAutocompleteOptions(input) {
  if (!isFootyPlayerAutocompleteInput(input)) {
    return [];
  }

  const side = input.closest("[data-footy-note-ga-side]")?.getAttribute("data-footy-note-ga-side");
  const fixture = getFootyFixtureByMatchId(activeFootyNoteMatchId);
  const teamName = side === "opponent"
    ? getFootyFixtureOpponentRosterName(fixture)
    : fixture?.teamName;

  return getFootyRosterPlayersForTeam(teamName).map((player) => ({
    label: player.name,
    meta: [player.position, player.number ? `#${player.number}` : ""].filter(Boolean).join(" "),
    value: player.name,
  }));
}

function ensureAutocompleteDropdown(input) {
  const label = input?.closest?.("label");

  if (!label) {
    return null;
  }

  let dropdown = label.querySelector(".autocomplete-dropdown");

  if (!dropdown) {
    dropdown = document.createElement("div");
    dropdown.className = "autocomplete-dropdown";
    input.insertAdjacentElement("afterend", dropdown);
  }

  return dropdown;
}

function renderAutocompleteDropdown(input, options = [], emptyMessage = "No matches") {
  const dropdown = ensureAutocompleteDropdown(input);

  if (!dropdown) {
    return;
  }

  const searchValue = normalizeLookupName(input.value);
  const filteredOptions = options
    .filter((option) => !searchValue || normalizeLookupName(option.label).includes(searchValue))
    .slice(0, AUTOCOMPLETE_OPTION_LIMIT);

  if (!filteredOptions.length) {
    dropdown.innerHTML = `<p class="autocomplete-empty">${escapeHtml(emptyMessage)}</p>`;
    dropdown.classList.add("is-open");
    return;
  }

  dropdown.innerHTML = filteredOptions
    .map((option) => `
      <button class="autocomplete-option" type="button" data-autocomplete-value="${escapeHtml(option.value)}">
        <span>${escapeHtml(option.label)}</span>
        ${option.meta ? `<small>${escapeHtml(option.meta)}</small>` : ""}
      </button>
    `)
    .join("");
  dropdown.classList.add("is-open");
}

function closeAutocompleteDropdown() {
  document.querySelectorAll(".autocomplete-dropdown.is-open").forEach((dropdown) => {
    dropdown.classList.remove("is-open");
    dropdown.innerHTML = "";
  });
  activeAutocompleteInput = null;
}

function selectAutocompleteOption(input, value) {
  if (!input) {
    return;
  }

  input.value = value;
  input.dispatchEvent(new Event("change", { bubbles: true }));
  closeAutocompleteDropdown();
  input.focus({ preventScroll: true });
}

function renderFootyPlayerAutocomplete(input) {
  if (!isFootyPlayerAutocompleteInput(input)) {
    closeAutocompleteDropdown();
    return;
  }

  activeAutocompleteInput = input;

  if (!Array.isArray(siteData.footyRosters)) {
    renderAutocompleteDropdown(input, [], "Loading roster...");
    ensureFootyRosters()
      .then(() => {
        if (activeAutocompleteInput === input) {
          renderFootyPlayerAutocomplete(input);
        }
      })
      .catch((error) => {
        recordDiagnostic("footy rosters failed to load", error);
        if (activeAutocompleteInput === input) {
          renderAutocompleteDropdown(input, [], "Unable to load roster");
        }
      });
    return;
  }

  renderAutocompleteDropdown(input, getFootyPlayerAutocompleteOptions(input), "No roster matches");
}

function getFootyRosterPlayersForTeam(teamInput) {
  const roster = getFootyRosterForTeam(teamInput);

  if (!roster) {
    return [];
  }

  return [...roster.players].sort(compareFootyRosterPlayers);
}

function compareFootyRosterPlayers(first, second) {
  const firstNumber = parseIntegerValue(first.number);
  const secondNumber = parseIntegerValue(second.number);

  if (firstNumber !== null || secondNumber !== null) {
    return (firstNumber ?? Number.MAX_SAFE_INTEGER) - (secondNumber ?? Number.MAX_SAFE_INTEGER) ||
      compareFootyRosterPlayerIds(first, second) ||
      first.name.localeCompare(second.name, undefined, { sensitivity: "base" });
  }

  return compareFootyRosterPlayerIds(first, second) ||
    first.name.localeCompare(second.name, undefined, { sensitivity: "base" });
}

function compareFootyRosterPlayerIds(first, second) {
  const firstId = parseIntegerValue(first.id);
  const secondId = parseIntegerValue(second.id);

  if (firstId !== null || secondId !== null) {
    return (firstId ?? Number.MAX_SAFE_INTEGER) - (secondId ?? Number.MAX_SAFE_INTEGER);
  }

  return String(first.id || "").localeCompare(String(second.id || ""), undefined, { numeric: true, sensitivity: "base" });
}

function parseIntegerValue(value) {
  const normalizedValue = String(value ?? "").trim().replace(/^#/, "");

  if (!normalizedValue || !/^-?\d+$/.test(normalizedValue)) {
    return null;
  }

  return Number.parseInt(normalizedValue, 10);
}

function getFootyRosterPlayerForTeam(teamInput, playerId) {
  const normalizedPlayerId = String(playerId || "").trim();

  if (!normalizedPlayerId) {
    return null;
  }

  return getFootyRosterPlayersForTeam(teamInput).find((player) => player.id === normalizedPlayerId) || null;
}

function getFootyRosterForTeam(teamInput) {
  const teamName = typeof teamInput === "object" && teamInput
    ? teamInput.name
    : teamInput;
  const explicitTeamId = typeof teamInput === "object" && teamInput
    ? String(teamInput.id || teamInput.teamId || "").trim()
    : "";
  const teamId = explicitTeamId || getFootyScheduleTeamIdByName(teamName);
  const normalizedTeam = normalizeFootyClubName(teamName);

  if (!normalizedTeam && !teamId) {
    return null;
  }

  return (siteData.footyRosters || []).find((roster) =>
    (teamId && String(roster.teamId || "").trim() === teamId) ||
    (normalizedTeam && normalizeFootyClubName(roster.team) === normalizedTeam)
  ) || null;
}

function getFootyScheduleTeamIdByName(teamName) {
  const normalizedTeam = normalizeFootyClubName(teamName);

  if (!normalizedTeam || !siteData.footySchedule) {
    return "";
  }

  const team = getAllFootyScheduleTeams(siteData.footySchedule)
    .find((scheduleTeam) => normalizeFootyClubName(scheduleTeam.name) === normalizedTeam);

  return String(team?.id || "").trim();
}

function getFootyFixtureOpponentRosterName(fixture) {
  if (!fixture) {
    return "";
  }

  if (fixture.opponent) {
    return fixture.opponent;
  }

  if (isSameFootyTeamName(fixture.teamName, fixture.home)) {
    return fixture.away;
  }

  if (isSameFootyTeamName(fixture.teamName, fixture.away)) {
    return fixture.home;
  }

  return "";
}

function mergeFootyMatchNotes(notes = []) {
  notes.forEach((note) => updateFootyFixtureMatchNote(note));
}

function upsertFootyMatchNote(note) {
  const normalizedId = normalizeFootyMatchId(note?.matchId);

  if (!normalizedId) {
    return;
  }

  const notes = Array.isArray(siteData.footyMatchNotes) ? siteData.footyMatchNotes : [];
  const existingIndex = notes.findIndex((existingNote) =>
    normalizeFootyMatchId(existingNote?.matchId) === normalizedId
  );

  if (existingIndex >= 0) {
    notes[existingIndex] = note;
  } else {
    notes.push(note);
  }

  siteData.footyMatchNotes = notes;
  siteData.footyMatchNotesLoadedAt = new Date().toISOString();
}

function submitFootyDataPayload(payload) {
  return submitFootyDataPayloadWithPost(payload);
}

async function submitFootyDataPayloadWithPost(payload) {
  let reachedEndpoint = false;

  try {
    const response = await window.fetch(FOOTY_DATA_ENDPOINT, {
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      method: "POST",
    });
    reachedEndpoint = true;
    const data = await response.json();

    if (!response.ok || !data?.ok) {
      throw new Error(data?.error || `Footy data endpoint returned ${response.status}.`);
    }

    return data;
  } catch (error) {
    if (reachedEndpoint) {
      throw error;
    }

    console.warn("Unable to submit Footy data with fetch; falling back to form post.", error);
    submitFootyDataPayloadWithForm(payload);
    return {
      ok: true,
      savedNote: payload.note,
      status: "submitted",
    };
  }
}

function submitFootyDataPayloadWithForm(payload) {
  const iframeName = "footy-data-frame";
  let iframe = document.querySelector(`iframe[name="${iframeName}"]`);

  if (!iframe) {
    iframe = document.createElement("iframe");
    iframe.name = iframeName;
    iframe.hidden = true;
    document.body.append(iframe);
  }

  const form = document.createElement("form");
  form.action = FOOTY_DATA_ENDPOINT;
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

function clearFootyScheduleMatchNotes(schedule) {
  if (!Array.isArray(schedule?.teamSchedules)) {
    return;
  }

  schedule.teamSchedules.forEach((teamSchedule) => {
    const fixtures = Array.isArray(teamSchedule?.fixtures) ? teamSchedule.fixtures : [];

    fixtures.forEach((fixture) => {
      if (Object.prototype.hasOwnProperty.call(fixture, "matchNote")) {
        delete fixture.matchNote;
      }
    });
  });
}

function updateFootyFixtureMatchNote(note) {
  const normalizedId = normalizeFootyMatchId(note.matchId);

  if (!normalizedId || !Array.isArray(siteData.footySchedule?.teamSchedules)) {
    return;
  }

  siteData.footySchedule.teamSchedules.forEach((teamSchedule) => {
    const fixtures = Array.isArray(teamSchedule?.fixtures) ? teamSchedule.fixtures : [];

    fixtures.forEach((fixture) => {
      if (normalizeFootyMatchId(fixture.matchId) === normalizedId) {
        fixture.matchNote = {
          awayScore: note.awayScore,
          followGoalAssists: note.followGoalAssists,
          highlightLink: note.highlightLink,
          homeScore: note.homeScore,
          note: note.note,
          opponentGoalAssists: note.opponentGoalAssists,
        };
      }
    });
  });
}

function setFootyNoteStatus(message, isError = false) {
  if (!footyNoteStatus) {
    return;
  }

  footyNoteStatus.textContent = message;
  footyNoteStatus.classList.toggle("is-error", isError);
}

function renderFootyMatchNote(fixture) {
  const note = fixture?.matchNote;

  if (!note) {
    return "";
  }

  const followEventsMarkup = renderFootyGoalAssistEvents(getFootyFollowedSideName(fixture), note.followGoalAssists);
  const opponentEventsMarkup = renderFootyGoalAssistEvents(getFootyOpponentSideName(fixture), note.opponentGoalAssists);
  const noteMarkup = note.note ? `<p>${escapeHtml(note.note)}</p>` : "";

  if (!followEventsMarkup && !opponentEventsMarkup && !noteMarkup) {
    return "";
  }

  return `
    <div class="footy-match-note">
      ${followEventsMarkup}
      ${opponentEventsMarkup}
      ${noteMarkup}
    </div>
  `;
}

function renderFootyGoalAssistEvents(label, events = []) {
  if (!Array.isArray(events) || events.length === 0) {
    return "";
  }

  const sortedEvents = [...events].sort(compareFootyGoalAssistEvents);

  return `
    <div class="footy-goal-events">
      <span>${escapeHtml(label)}</span>
      ${sortedEvents.map((event) => {
        const minute = event.minute ? `${escapeHtml(formatFootyGoalAssistMinute(event.minute))} - ` : "";
        const assist = event.assister ? `, ${escapeHtml(event.assister)}` : "";
        const penalty = event.penalty ? " (P)" : "";

        return `<p>${minute}${escapeHtml(event.scorer || "Goal")}${assist}${penalty}</p>`;
      }).join("")}
    </div>
  `;
}

function compareFootyGoalAssistEvents(firstEvent, secondEvent) {
  return getFootyGoalAssistMinuteSortValue(firstEvent) - getFootyGoalAssistMinuteSortValue(secondEvent) ||
    String(firstEvent?.scorer || "").localeCompare(String(secondEvent?.scorer || "")) ||
    String(firstEvent?.assister || "").localeCompare(String(secondEvent?.assister || ""));
}

function getFootyGoalAssistMinuteSortValue(event) {
  const minuteText = String(event?.minute || "")
    .trim()
    .replace(/[’'`]/g, "")
    .replace(/\s*\+\s*/g, "+");
  const minuteMatch = minuteText.match(/^(\d+)(?:\s*\+\s*(\d+))?/);

  if (!minuteMatch) {
    return Number.MAX_SAFE_INTEGER;
  }

  return Number(minuteMatch[1]) + Number(minuteMatch[2] || 0) / 100;
}

function saveFootyGoalAssistEntry() {
  const scorer = String(footyScorerNameInput?.value || "").trim();
  const assister = String(footyAssisterNameInput?.value || "").trim();
  const penalty = Boolean(footyPenaltyInput?.checked);

  if (!scorer && !assister && !penalty) {
    setFootyGoalAssistsFeedback("Add a scorer, assister, or penalty before saving.", true);
    return false;
  }

  footyGoalAssistEntries.push({
    scorer,
    assister,
    penalty,
  });

  clearFootyGoalAssistInputs();
  renderFootyGoalAssistsSaved();
  setFootyGoalAssistsFeedback("Saved.");
  return true;
}

function clearFootyGoalAssistInputs() {
  if (footyScorerNameInput) {
    footyScorerNameInput.value = "";
  }

  if (footyAssisterNameInput) {
    footyAssisterNameInput.value = "";
  }

  if (footyPenaltyInput) {
    footyPenaltyInput.checked = false;
  }

  footyScorerNameInput?.focus();
}

function renderFootyGoalAssistsSaved() {
  if (!footyGoalAssistsSaved) {
    return;
  }

  if (!footyGoalAssistEntries.length) {
    footyGoalAssistsSaved.innerHTML = `<p class="table-message">No saved goal/assist entries.</p>`;
    return;
  }

  footyGoalAssistsSaved.innerHTML = `
    <ul class="footy-goal-assists-chip-list" aria-label="Saved goal assist entries">
      ${footyGoalAssistEntries.map(renderFootyGoalAssistChip).join("")}
    </ul>
  `;
}

function renderFootyGoalAssistChip(entry, index) {
  const title = getFootyGoalAssistLabel(entry, index);
  const penaltyLabel = entry.penalty ? `<span class="footy-goal-assist-penalty">P</span>` : "";

  return `
    <li>
      <span class="footy-goal-assist-chip" title="${escapeHtml(title)}" aria-label="${escapeHtml(title)}">
        <span class="footy-goal-assist-saved-icon" aria-hidden="true">&#10003;</span>
        <span>${escapeHtml(getFootyGoalAssistChipText(entry, index))}</span>
        ${penaltyLabel}
      </span>
      <button class="icon-action-button footy-goal-assist-delete" type="button" data-footy-ga-delete="${index}" aria-label="Delete ${escapeHtml(title)}">
        &times;
      </button>
    </li>
  `;
}

function getFootyGoalAssistLabel(entry, index) {
  const parts = [];

  if (entry.scorer) {
    parts.push(`Scorer: ${entry.scorer}`);
  }

  if (entry.assister) {
    parts.push(`Assister: ${entry.assister}`);
  }

  if (entry.penalty) {
    parts.push("Penalty");
  }

  return parts.join(", ") || `Entry ${index + 1}`;
}

function getFootyGoalAssistChipText(entry, index) {
  const minute = entry.minute ? `${formatFootyGoalAssistMinute(entry.minute)} - ` : "";

  if (entry.scorer && entry.assister) {
    return `${minute}${entry.scorer} / ${entry.assister}`;
  }

  return `${minute}${entry.scorer || entry.assister || `Entry ${index + 1}`}`;
}

function deleteFootyGoalAssistEntry(index) {
  if (!Number.isInteger(index) || index < 0 || index >= footyGoalAssistEntries.length) {
    return;
  }

  footyGoalAssistEntries.splice(index, 1);
  renderFootyGoalAssistsSaved();
  setFootyGoalAssistsFeedback("Removed.");
}

function clearFootyGoalAssistEntries() {
  footyGoalAssistEntries.splice(0, footyGoalAssistEntries.length);
  clearFootyGoalAssistInputs();
  renderFootyGoalAssistsSaved();
  setFootyGoalAssistsFeedback("Cleared.");
}

async function copyFootyGoalAssistEntries() {
  const json = JSON.stringify(footyGoalAssistEntries, null, 2);

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(json);
    } else {
      copyTextWithFallback(json);
    }

    setFootyGoalAssistsFeedback(`Copied ${footyGoalAssistEntries.length} ${footyGoalAssistEntries.length === 1 ? "entry" : "entries"}.`);
  } catch (error) {
    console.warn("Unable to copy footy goal assist JSON", error);
    setFootyGoalAssistsFeedback("Unable to copy JSON.", true);
  }
}

function setFootyGoalAssistsFeedback(message, isError = false) {
  if (!footyGoalAssistsFeedback) {
    return;
  }

  footyGoalAssistsFeedback.textContent = message;
  footyGoalAssistsFeedback.classList.toggle("is-error", isError);
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

  const date = parseFootyDate(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    weekday: "short",
    year: "numeric",
  }).format(date);
}

function parseFootyDate(value) {
  const normalizedValue = normalizeFootyDateTimeValue(value);
  return new Date(normalizedValue);
}

function getFootyDateTimeValue(value) {
  const date = parseFootyDate(value);
  return date.getTime();
}

function normalizeFootyDateTimeValue(value) {
  const text = String(value || "").trim();

  if (!text) {
    return "";
  }

  return text.replace(/T(\d)(?=:)/, "T0$1");
}

function normalizeFootyMatchId(value) {
  return String(value || "").trim().toLowerCase();
}

function renderNextList(items = siteData.nextItems || []) {
  if (!nextList) {
    return;
  }

  syncNextFilterDependencies();
  if (!isNextEditModeEnabled() && activeNextItemId) {
    activeNextItemId = "";
  }

  if (!shouldRenderPageSection("next")) {
    syncNextFilters();
    return;
  }

  syncNextFilters();

  const normalizedItems = items.map(normalizeNextItem).filter(Boolean);
  const visibleItems = getFilteredNextItems(normalizedItems);
  const showDefaultPassedStatus = !hasActiveNextFilters();
  const previousTailItems = shouldRenderDefaultNextPreviousTail()
    ? getDefaultNextPreviousTailItems(normalizedItems)
    : [];
  const renderedItems = [...visibleItems, ...previousTailItems];
  const previousDivider = previousTailItems.length
    ? `<div class="next-previous-divider" role="separator" aria-label="Previous items"><span>Previous</span></div>`
    : "";

  if (!renderedItems.length) {
    nextList.innerHTML = `<p class="table-message">${hasActiveNextFilters() ? "No Next items match those filters." : "No upcoming Next items found."}</p>`;
    return;
  }

  nextList.innerHTML = `
    <div class="next-list">
      ${visibleItems.map((item) => renderNextItem(item, { showPassedStatus: showDefaultPassedStatus })).join("")}
      ${previousDivider}
      ${previousTailItems.map(renderNextItem).join("")}
    </div>
  `;
}

function normalizeNextItem(row) {
  const thing = String(row?.Thing || "").trim();

  if (!thing) {
    return null;
  }

  const id = String(row?.ID || row?.Id || row?.id || "").trim();
  const dateKey = parseNextDateKey(row.Date);
  const endDateKey = parseNextDateKey(row["End Date"]);
  const priority = clampNextPriority(row["Priority Level"]);
  const completed = isTrueValue(row.Completed);
  const nonAdmin = isTrueValue(row.NonAdmin);

  return {
    completed,
    dateKey,
    endDateKey,
    id,
    imageUrl: String(row?.["Image URL"] || row?.imageUrl || row?.Image || row?.image || "").trim(),
    nonAdmin,
    priority,
    raw: row,
    searchText: normalizeLookupName([
      thing,
      row.Date,
      row["End Date"],
      row.Time,
      row["Priority Level"],
    ].filter(Boolean).join(" ")),
    thing,
    timeLabel: formatNextTime(row.Time),
  };
}

function getFilteredNextItems(items = []) {
  const searchTerm = normalizeLookupName(nextSearchInput?.value || "");
  const dateRange = getNextDateFilterRange();
  const showPrevious = Boolean(nextPreviousFilter?.checked);
  const isAdmin = isCurrentManagerAdmin();
  const priorityRange = isAdmin ? getNextPriorityRange() : { min: 0, max: 10 };
  const includeCompleted = isAdmin ? Boolean(nextCompletedFilter?.checked) : null;
  const nonAdminOnly = isAdmin ? Boolean(nextNonAdminFilter?.checked) : false;
  const todayKey = getDateKey(0);

  return items
    .filter((item) => {
      if (!isAdmin && !item.nonAdmin) {
        return false;
      }

      if (isAdmin && nonAdminOnly && !item.nonAdmin) {
        return false;
      }

      if (isAdmin && item.completed !== includeCompleted) {
        return false;
      }

      const isPast = isNextItemPast(item, todayKey);

      if (showPrevious ? !isPast : isPast) {
        return false;
      }

      if (dateRange && !isNextItemInDateRange(item, dateRange)) {
        return false;
      }

      if (isAdmin && (item.priority < priorityRange.min || item.priority > priorityRange.max)) {
        return false;
      }

      return !searchTerm || item.searchText.includes(searchTerm);
    })
    .sort(showPrevious ? comparePreviousNextItems : compareNextItems);
}

function compareNextItems(first, second) {
  const firstDate = first.dateKey || "9999-12-31";
  const secondDate = second.dateKey || "9999-12-31";

  if (firstDate !== secondDate) {
    return firstDate.localeCompare(secondDate);
  }

  const firstTime = getNextTimeSortValue(first.raw.Time);
  const secondTime = getNextTimeSortValue(second.raw.Time);

  if (firstTime !== secondTime) {
    return firstTime - secondTime;
  }

  if (first.priority !== second.priority) {
    return second.priority - first.priority;
  }

  return first.thing.localeCompare(second.thing);
}

function shouldRenderDefaultNextPreviousTail() {
  if (!isCurrentManagerAdmin()) {
    return false;
  }

  const priorityRange = getNextPriorityRange();

  return Boolean(
    !String(nextSearchInput?.value || "").trim() &&
    !String(nextDateFromFilter?.value || "").trim() &&
    !String(nextDateToFilter?.value || "").trim() &&
    !nextCompletedFilter?.checked &&
    !nextPreviousFilter?.checked &&
    !nextNonAdminFilter?.checked &&
    priorityRange.min === 0 &&
    priorityRange.max === 10
  );
}

function getDefaultNextPreviousTailItems(items = []) {
  const todayKey = getDateKey(0);
  const isAdmin = isCurrentManagerAdmin();

  return items
    .filter((item) => {
      if (!isAdmin && !item.nonAdmin) {
        return false;
      }

      return !item.completed && item.priority >= 7 && isNextItemPast(item, todayKey);
    })
    .sort(comparePreviousNextItems)
    .slice(0, 3);
}

function comparePreviousNextItems(first, second) {
  const firstDate = first.endDateKey || first.dateKey || "";
  const secondDate = second.endDateKey || second.dateKey || "";

  if (firstDate !== secondDate) {
    return secondDate.localeCompare(firstDate);
  }

  if (first.priority !== second.priority) {
    return second.priority - first.priority;
  }

  const firstTime = getNextTimeSortValue(first.raw.Time);
  const secondTime = getNextTimeSortValue(second.raw.Time);

  if (firstTime !== secondTime) {
    return secondTime - firstTime;
  }

  return first.thing.localeCompare(second.thing);
}

function renderNextItem(item, options = {}) {
  const isAdmin = isCurrentManagerAdmin();
  const isPast = isNextItemPast(item, getDateKey(0));
  const dateLabel = formatNextDateRange(item);
  const timeMarkup = item.timeLabel
    ? `<span class="next-time">${escapeHtml(item.timeLabel)}</span>`
    : "";
  const completedIcon = isAdmin && item.completed
    ? `<span class="next-completed-icon" aria-label="Completed" title="Completed">&#10003;</span>`
    : "";
  const passedStatus = options.showPassedStatus && hasNextItemTimePassed(item) && !item.completed
    ? `<span class="next-passed-status" aria-label="Event time has passed" title="Event time has passed">&#10003;</span>`
    : "";
  const classNames = [
    "next-card",
    item.completed ? "next-card--completed" : "",
    isNextEditModeEnabled() ? "next-card--editable" : "",
    activeNextItemId === item.id ? "is-expanded" : "",
    isPast ? "next-card--past" : "",
  ].filter(Boolean).join(" ");
  const editButton = isNextEditModeEnabled() && activeNextItemId === item.id
    ? `<button class="action-button next-edit-button" type="button" data-next-edit="${escapeHtml(item.id)}">Edit</button>`
    : "";
  const interactionAttributes = isNextEditModeEnabled() && item.id
    ? ` role="button" tabindex="0" aria-expanded="${String(activeNextItemId === item.id)}" data-next-item-id="${escapeHtml(item.id)}"`
    : "";
  const imageMarkup = item.imageUrl
    ? `<img class="next-card-image" src="${escapeHtml(item.imageUrl)}" alt="" loading="lazy" decoding="async" data-next-card-image>`
    : "";
  const imageClass = imageMarkup ? " next-card--with-image" : "";

  return `
    <article class="${classNames}${imageClass}"${interactionAttributes}>
      ${imageMarkup}
      <div class="next-card-main${completedIcon ? " has-completed-icon" : ""}">
        ${completedIcon}
        <div>
          ${passedStatus}
          <h2>${escapeHtml(item.thing)}</h2>
          <p class="next-card-date">
            <span>${escapeHtml(dateLabel)}</span>
            ${timeMarkup}
          </p>
        </div>
      </div>
      ${editButton}
    </article>
  `;
}

function isNextEditModeEnabled() {
  return Boolean(isCurrentManagerAdmin() && nextEditModeFilter?.checked);
}

function syncNextFilters() {
  if (nextFilters) {
    nextFilters.hidden = !shouldShowNextFilters;
  }

  if (nextFilterToggle) {
    nextFilterToggle.setAttribute("aria-expanded", String(shouldShowNextFilters));
    nextFilterToggle.classList.toggle("is-active", shouldShowNextFilters);
  }

  const range = getNextPriorityRange();
  const minPercent = range.min * 10;
  const maxPercent = range.max * 10;

  document.documentElement.style.setProperty("--next-priority-min-percent", `${minPercent}%`);
  document.documentElement.style.setProperty("--next-priority-max-percent", `${maxPercent}%`);

  if (nextPriorityMinValue) {
    nextPriorityMinValue.textContent = String(range.min);
  }

  if (nextPriorityMaxValue) {
    nextPriorityMaxValue.textContent = String(range.max);
  }
}

function getNextDateFilterRange() {
  const rawStart = String(nextDateFromFilter?.value || "").trim();
  const rawEnd = String(nextDateToFilter?.value || "").trim();

  if (!rawStart && !rawEnd) {
    return null;
  }

  const start = rawStart || rawEnd;
  const end = rawEnd || rawStart;

  return start <= end
    ? { start, end }
    : { start: end, end: start };
}

function getNextPriorityRange() {
  const min = clampNextPriority(nextPriorityMin?.value ?? 0);
  const max = clampNextPriority(nextPriorityMax?.value ?? 10);

  return min <= max ? { min, max } : { min: max, max: min };
}

function hasActiveNextFilters() {
  const isAdmin = isCurrentManagerAdmin();
  const priorityRange = getNextPriorityRange();

  return Boolean(
    String(nextSearchInput?.value || "").trim() ||
    String(nextDateFromFilter?.value || "").trim() ||
    String(nextDateToFilter?.value || "").trim() ||
    (isAdmin && Boolean(nextCompletedFilter?.checked)) ||
    Boolean(nextPreviousFilter?.checked) ||
    (isAdmin && Boolean(nextNonAdminFilter?.checked)) ||
    (isAdmin && Boolean(nextEditModeFilter?.checked)) ||
    (isAdmin && (priorityRange.min !== 0 || priorityRange.max !== 10))
  );
}

function isNextItemPast(item, todayKey = getDateKey(0)) {
  const lastDateKey = item.endDateKey || item.dateKey;
  return Boolean(lastDateKey && (
    lastDateKey < todayKey ||
    (item.completed && lastDateKey === todayKey)
  ));
}

function isNextItemInDateRange(item, dateRange) {
  const start = item.dateKey || item.endDateKey;
  const end = item.endDateKey || item.dateKey;

  if (!start || !end) {
    return false;
  }

  return start <= dateRange.end && end >= dateRange.start;
}

function parseNextDateKey(value) {
  const rawValue = String(value || "").trim();

  if (!rawValue) {
    return "";
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(rawValue)) {
    return rawValue;
  }

  const slashMatch = rawValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);

  if (slashMatch) {
    const month = Number(slashMatch[1]);
    const day = Number(slashMatch[2]);
    const rawYear = Number(slashMatch[3]);
    const year = rawYear < 100 ? 2000 + rawYear : rawYear;

    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return [
        year,
        String(month).padStart(2, "0"),
        String(day).padStart(2, "0"),
      ].join("-");
    }
  }

  const parsedDate = new Date(rawValue);

  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  return parsedDate.toISOString().slice(0, 10);
}

function formatNextDateRange(item) {
  if (!item.dateKey && !item.endDateKey) {
    return "Date TBD";
  }

  const startLabel = formatNextDateKey(item.dateKey || item.endDateKey);
  const endLabel = item.endDateKey && item.endDateKey !== item.dateKey
    ? formatNextDateKey(item.endDateKey)
    : "";

  return endLabel ? `${startLabel} - ${endLabel}` : startLabel;
}

function formatNextDateKey(dateKey) {
  if (!dateKey) {
    return "Date TBD";
  }

  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(date);
}

function formatNextTime(value) {
  const rawValue = String(value || "").trim();

  if (!rawValue) {
    return "";
  }

  const match = rawValue.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/i);

  if (!match) {
    return rawValue.toUpperCase().includes("EST") ? rawValue : `${rawValue} EST`;
  }

  return `${Number(match[1])}:${match[2]} ${match[3].toUpperCase()} EST`;
}

function getNextTimeSortValue(value) {
  const rawValue = String(value || "").trim();
  const match = rawValue.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/i);

  if (!match) {
    return Number.MAX_SAFE_INTEGER;
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const period = match[3].toUpperCase();
  const normalizedHour = period === "PM" && hour !== 12 ? hour + 12 : period === "AM" && hour === 12 ? 0 : hour;

  return normalizedHour * 60 + minute;
}

function hasNextItemTimePassed(item, now = new Date()) {
  const scheduledMinutes = getNextTimeSortValue(item?.raw?.Time);
  const easternParts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    month: "2-digit",
    timeZone: "America/New_York",
    year: "numeric",
  }).formatToParts(now).map((part) => [part.type, part.value]));
  const todayKey = [
    easternParts.year,
    easternParts.month,
    easternParts.day,
  ].join("-");

  return Boolean(
    item?.dateKey === todayKey &&
    (!item.endDateKey || item.endDateKey === item.dateKey) &&
    Number.isFinite(scheduledMinutes) &&
    scheduledMinutes !== Number.MAX_SAFE_INTEGER &&
    Number(easternParts.hour) * 60 + Number(easternParts.minute) >= scheduledMinutes
  );
}

function clampNextPriority(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.min(10, Math.max(0, Math.round(number)));
}

function syncNextFilterDependencies() {
  if (nextCompletedFilter?.checked && nextPreviousFilter && !nextPreviousFilter.checked) {
    nextPreviousFilter.checked = true;
  }
}

function isNextDateSpanPast(dateKey, endDateKey = "") {
  const lastDateKey = endDateKey || dateKey;
  return Boolean(lastDateKey && lastDateKey < getDateKey(0));
}

function openNextItemDialog(itemId = "") {
  if (!isCurrentManagerAdmin() || !nextItemDialog) {
    return;
  }

  const item = itemId ? getNextItemById(itemId) : null;
  activeNextItemId = String(itemId || "").trim();

  if (nextItemDialogTitle) {
    nextItemDialogTitle.textContent = item ? "Edit Next Item" : "Add Next Item";
  }

  if (nextItemId) {
    nextItemId.value = item?.id || "";
  }

  if (nextThingInput) {
    nextThingInput.value = item?.thing || "";
  }

  if (nextImageUrlInput) {
    nextImageUrlInput.value = item?.imageUrl || "";
  }

  if (nextStartDateInput) {
    nextStartDateInput.value = item?.dateKey || "";
  }

  if (nextEndDateInput) {
    nextEndDateInput.value = item?.endDateKey || "";
  }

  if (nextTimeInput) {
    nextTimeInput.value = formatNextTimeInputValue(item?.raw?.Time || "");
  }

  if (nextPriorityInput) {
    nextPriorityInput.value = String(item?.priority ?? 5);
  }

  if (nextItemCompletedInput) {
    nextItemCompletedInput.checked = Boolean(item?.completed);
  }

  if (nextItemNonAdminInput) {
    nextItemNonAdminInput.checked = Boolean(item?.nonAdmin);
  }

  setNextItemStatus("");
  updateNextCompletedControlAvailability();

  if (typeof nextItemDialog.showModal === "function") {
    nextItemDialog.showModal();
  } else {
    nextItemDialog.setAttribute("open", "");
  }

  nextThingInput?.focus();
}

function closeNextItemDialog() {
  if (!nextItemDialog) {
    return;
  }

  if (typeof nextItemDialog.close === "function") {
    nextItemDialog.close();
  } else {
    nextItemDialog.removeAttribute("open");
  }
}

function getNextItemById(itemId) {
  const normalizedId = String(itemId || "").trim();

  if (!normalizedId) {
    return null;
  }

  return (siteData.nextItems || [])
    .map(normalizeNextItem)
    .filter(Boolean)
    .find((item) => item.id === normalizedId) || null;
}

function buildNextItemPayloadFromForm() {
  const existingId = String(nextItemId?.value || "").trim();
  const thing = String(nextThingInput?.value || "").trim();
  const imageUrl = String(nextImageUrlInput?.value || "").trim();
  const date = String(nextStartDateInput?.value || "").trim();
  const endDate = String(nextEndDateInput?.value || "").trim();
  const time = String(nextTimeInput?.value || "").trim();
  const priority = clampNextPriority(nextPriorityInput?.value ?? 5);

  return {
    ID: existingId || createNextItemId(),
    Thing: thing,
    "Image URL": imageUrl,
    Date: date,
    "End Date": endDate,
    Time: time ? formatNextTimeForSheet(time) : "",
    "Priority Level": String(priority),
    Completed: nextItemCompletedInput?.checked ? "TRUE" : "FALSE",
    NonAdmin: nextItemNonAdminInput?.checked ? "TRUE" : "FALSE",
  };
}

function updateNextCompletedControlAvailability() {
  if (!nextItemCompletedInput) {
    return;
  }

  nextItemCompletedInput.disabled = false;
  nextItemCompletedInput.closest("label")?.classList.remove("is-disabled");
}

function createNextItemId() {
  const nextNumericId = (siteData.nextItems || [])
    .map((row) => Number(String(row?.ID || row?.Id || row?.id || "").trim()))
    .filter((id) => Number.isInteger(id) && id > 0)
    .reduce((maxId, id) => Math.max(maxId, id), 0) + 1;

  // The published sheet can lag behind a recent save or an older open tab.
  // Use a time-based floor so a stale client cannot reuse an existing row ID.
  return String(Math.max(nextNumericId, Date.now()));
}

function populateNextTimeOptions() {
  if (!nextTimeInput) {
    return;
  }

  for (let totalMinutes = 0; totalMinutes < 24 * 60; totalMinutes += 15) {
    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    const value = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    const option = document.createElement("option");
    option.value = value;
    option.textContent = formatNextTimeForSheet(value);
    nextTimeInput.append(option);
  }
}

function formatNextTimeForSheet(value) {
  const rawValue = String(value || "").trim();
  const match = rawValue.match(/^(\d{1,2}):(\d{2})$/);

  if (!match) {
    return rawValue;
  }

  const hour = Number(match[1]);
  const minute = match[2];
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;

  return `${displayHour}:${minute} ${period}`;
}

function formatNextTimeInputValue(value) {
  const rawValue = String(value || "").trim();
  const match = rawValue.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)/i);

  if (!match) {
    return /^\d{1,2}:\d{2}$/.test(rawValue) ? rawValue : "";
  }

  const hour = Number(match[1]);
  const minute = match[2];
  const period = match[3].toUpperCase();
  const normalizedHour = period === "PM" && hour !== 12 ? hour + 12 : period === "AM" && hour === 12 ? 0 : hour;

  return `${String(normalizedHour).padStart(2, "0")}:${minute}`;
}

function saveNextItemFromForm() {
  const item = buildNextItemPayloadFromForm();

  if (!item.Thing) {
    setNextItemStatus("Thing is required.", true);
    return;
  }

  if (!item.Date) {
    setNextItemStatus("Date is required.", true);
    return;
  }

  if (!submitNextItemPayload({ action: "saveNextItem", item })) {
    setNextItemStatus("Next data endpoint is not configured yet.", true);
    return;
  }

  upsertNextItemLocally(item);
  renderNextList();
  closeNextItemDialog();
}

function upsertNextItemLocally(item) {
  const id = String(item.ID || "").trim();

  if (!id) {
    return;
  }

  const rows = Array.isArray(siteData.nextItems) ? siteData.nextItems : [];
  const existingIndex = rows.findIndex((row) => String(row.ID || row.Id || row.id || "").trim() === id);

  if (existingIndex >= 0) {
    rows[existingIndex] = { ...rows[existingIndex], ...item };
  } else {
    rows.push(item);
  }

  siteData.nextItems = rows;
}

function submitNextItemPayload(payload) {
  return submitAppsScriptPayload(payload, {
    endpoint: NEXT_DATA_ENDPOINT,
    fallback: submitNextItemPayloadWithForm,
    missingMessage: "Next data endpoint is not configured.",
    submitLabel: "Next item",
  });
}

function submitNextItemPayloadWithForm(payload) {
  const iframeName = "next-data-frame";
  let iframe = document.querySelector(`iframe[name="${iframeName}"]`);

  if (!iframe) {
    iframe = document.createElement("iframe");
    iframe.name = iframeName;
    iframe.hidden = true;
    document.body.append(iframe);
  }

  const form = document.createElement("form");
  form.action = NEXT_DATA_ENDPOINT;
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

function submitAppsScriptPayload(payload, options = {}) {
  const endpoint = options.endpoint;
  const fallback = options.fallback;
  const submitLabel = options.submitLabel || "data";

  if (!endpoint) {
    if (options.status) {
      options.status(options.missingMessage || "Data endpoint is not configured yet.", true);
    }
    console.warn(options.missingMessage || "Data endpoint is not configured.", payload);
    return false;
  }

  try {
    const body = new URLSearchParams();
    body.set("payload", JSON.stringify(payload));

    if (navigator.sendBeacon && navigator.sendBeacon(endpoint, body)) {
      return true;
    }

    window.fetch(endpoint, {
      body,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      },
      keepalive: true,
      method: "POST",
      mode: "no-cors",
    }).catch((error) => {
      console.warn(`Unable to submit ${submitLabel} with fetch; falling back to form.`, error);
      fallback?.(payload);
    });
    return true;
  } catch (error) {
    console.warn(`Unable to submit ${submitLabel} with beacon/fetch; falling back to form.`, error);
  }

  fallback?.(payload);
  return true;
}

function setNextItemStatus(message, isError = false) {
  if (!nextItemStatus) {
    return;
  }

  nextItemStatus.textContent = message;
  nextItemStatus.classList.toggle("is-error", isError);
}

function renderNextListError(error) {
  if (!nextList) {
    return;
  }

  nextList.innerHTML = `<p class="table-message">Unable to load Next items: ${escapeHtml(error.message)}</p>`;
}

function ensureGuideLinksLoaded() {
  if (!isCurrentManagerAdmin()) {
    return Promise.resolve([]);
  }

  if (siteData.guideLinks) {
    return Promise.resolve(siteData.guideLinks);
  }

  if (guideLinksLoadPromise) {
    return guideLinksLoadPromise;
  }

  guideLinksLoadPromise = ensureSharedData("guide-links", loadGuideData)
    .then((snapshot) => {
      siteData.guideLinks = (snapshot.guides || []).map((guide) => ({
        id: String(guide.id || "").trim(),
        name: String(guide.name || "").trim(),
        rankingId: String(guide.rankingId || "").trim(),
        todoId: String(guide.todoId || "").trim(),
      })).filter((guide) => guide.id && guide.name);

      if (activePageName === "todo") renderTodoList();
      if (activePageName === "rankings") renderRankingLists();
      return siteData.guideLinks;
    })
    .catch((error) => {
      siteData.guideLinks = [];
      recordDiagnostic("Guide links failed to load", error);
      return [];
    });

  return guideLinksLoadPromise;
}

function renderGuideEntryLinks(kind, itemId) {
  if (!isCurrentManagerAdmin() || !itemId) return "";

  const idKey = kind === "todo" ? "todoId" : "rankingId";
  const guides = (siteData.guideLinks || []).filter((guide) => guide[idKey] === String(itemId));
  if (!guides.length) return "";

  return `<span class="guide-entry-links">${guides.map((guide) => `
    <a class="guide-entry-link" href="${escapeHtml(getGuideEntryUrl(guide.id))}" aria-label="Open ${escapeHtml(guide.name)} guide" title="Open ${escapeHtml(guide.name)} guide">
      <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false"><path d="M10 14a3.5 3.5 0 0 0 5 0l3-3a3.5 3.5 0 0 0-5-5l-1.2 1.2M14 10a3.5 3.5 0 0 0-5 0l-3 3a3.5 3.5 0 0 0 5 5l1.2-1.2"></path></svg>
    </a>
  `).join("")}</span>`;
}

function getGuideEntryUrl(guideId) {
  const url = new URL(window.location.href);
  url.searchParams.set("guide", guideId);
  url.hash = "guides";
  return `${url.pathname}${url.search}${url.hash}`;
}

function renderWantList(items = siteData.wantItems || []) {
  if (!wantList || !shouldRenderPageSection("want")) return;
  if (!isCurrentManagerAdmin()) {
    wantList.innerHTML = `<p class="table-message">Want is available to admin users.</p>`;
    return;
  }

  syncWantControls();
  ensureWantRankingDataLoaded();
  const normalizedItems = items.map(normalizeWantItem).filter(Boolean).sort(compareWantItems);
  const visibleItems = getVisibleWantItems(normalizedItems);

  if (activeWantViewMode === "calculated") {
    const currentRows = visibleItems.map((item) => {
      const elo = getRankingEloForItem("want", item.id);
      return { ...item, comparisons: elo.comparisons, losses: elo.losses, rating: elo.rating, wins: elo.wins };
    }).sort(compareCalculatedRankingRows);
    const visibleIds = new Set(visibleItems.map((item) => item.id));
    const rows = activeWantSnapshotId === "current"
      ? currentRows
      : getRankingSnapshotRows("want", activeWantSnapshotId).filter((item) => visibleIds.has(String(item.id)));
    wantList.innerHTML = rows.length
      ? `<div class="next-list todo-list">${rows.map((item, index) => renderWantCalculatedItem(item, index + 1, currentRows)).join("")}</div>`
      : `<p class="table-message">No Want items found.</p>`;
    return;
  }

  wantList.innerHTML = visibleItems.length
    ? `<div class="next-list todo-list">${visibleItems.map(renderWantItem).join("")}</div>`
    : `<p class="table-message">No Want items found.</p>`;
}

function renderWantCalculatedItem(item, rank, currentRows) {
  const compareRows = activeWantCompareSnapshotId === "current"
    ? currentRows
    : activeWantCompareSnapshotId ? getRankingSnapshotRows("want", activeWantCompareSnapshotId) : [];
  const compareRank = compareRows.findIndex((row) => String(row.id) === String(item.id)) + 1;
  const movement = compareRank ? compareRank - rank : 0;
  const meta = [
    `${Math.round(item.rating || RANKING_BASE_RATING)} ELO`,
    `${item.wins || 0}-${item.losses || 0}`,
    Number(item.comparisons || 0) <= 0 ? "New" : Number(item.comparisons || 0) < RANKING_PROVISIONAL_COMPARISONS ? "Provisional" : "",
    `Manual #${formatWantOrder(item)}`,
    compareRank ? `${movement > 0 ? "+" : ""}${movement} vs ${getWantSnapshotLabel(activeWantCompareSnapshotId)}` : "",
  ].filter(Boolean);
  return `<article class="next-card todo-card"><div class="next-card-main"><span class="todo-order-number">${rank}</span><div><h2>${escapeHtml(item.name)}</h2>${item.price !== null && item.price !== undefined ? `<p class="next-card-date">${escapeHtml(formatWantPrice(item.price))}</p>` : ""}<p class="todo-more-data">${meta.map(escapeHtml).join(" | ")}</p></div></div></article>`;
}

function renderWantItem(item) {
  const expandedClass = shouldShowWantEditMode && activeWantItemId === item.id ? " is-actions-open" : "";
  const deletedClass = item.deleted ? " todo-card--deleted" : "";
  const draggable = shouldShowWantEditMode ? ` draggable="true"` : "";
  const chips = [
    item.archived ? { key: "archived", label: "Archived" } : null,
    item.completed ? { key: "completed", label: "Completed" } : null,
    item.deleted ? { key: "deleted", label: "Deleted" } : null,
  ].filter(Boolean);
  return `
    <article class="next-card todo-card${deletedClass}${expandedClass}"${draggable} tabindex="0" role="button" data-want-id="${escapeHtml(item.id)}" aria-label="${shouldShowWantEditMode ? "Edit" : "View"} ${escapeHtml(item.name)}">
      <div class="next-card-main">
        <span class="todo-order-number">${escapeHtml(formatWantOrder(item))}</span>
        <div><h2>${escapeHtml(item.name)}</h2>${item.price !== null ? `<p class="next-card-date">${escapeHtml(formatWantPrice(item.price))}</p>` : ""}${chips.length ? `<div class="todo-chip-list">${chips.map((chip) => `<span class="todo-status-chip todo-status-chip--${chip.key}">${escapeHtml(chip.label)}</span>`).join("")}</div>` : ""}</div>
        ${shouldShowWantEditMode ? `<span class="ranking-drag-handle want-drag-handle" aria-hidden="true" title="Drag to reorder"></span>` : ""}
      </div>
      ${shouldShowWantEditMode ? `<div class="todo-card-actions"><button class="ranking-inline-action" type="button" data-want-edit="${escapeHtml(item.id)}">Edit</button><button class="ranking-inline-action" type="button" data-want-move="${escapeHtml(item.id)}">Move to To Do</button><button class="ranking-inline-action" type="button" data-want-delete="${escapeHtml(item.id)}">Delete</button></div>` : ""}
    </article>`;
}

function normalizeWantItem(row) {
  const name = String(row?.Name || row?.name || "").trim();
  if (!name) return null;
  const rawPrice = String(row?.Price ?? row?.price ?? "").trim();
  const price = Number(rawPrice);
  return {
    archived: isTrueValue(row.Archived || row.archived),
    completed: isTrueValue(row.Completed || row.completed),
    deleted: isTrueValue(row.IsDeleted || row.isDeleted || row.deleted),
    id: String(row?.ID || row?.Id || row?.id || "").trim(),
    imageUrl: String(row?.["Image URL"] || row?.imageUrl || "").trim(),
    name,
    order: normalizeTodoOrder(row.Order),
    price: rawPrice && Number.isFinite(price) && price >= 0 ? price : null,
    raw: row,
  };
}

function compareWantItems(first, second) {
  return first.order - second.order || String(first.id).localeCompare(String(second.id), undefined, { numeric: true });
}

function getWantItems() {
  return Array.isArray(siteData.wantItems) ? siteData.wantItems : [];
}

function getVisibleWantItems(items = getWantItems().map(normalizeWantItem).filter(Boolean)) {
  return items.filter((item) => activeWantStatusFilter
    ? activeWantStatusFilter === "all" || Boolean(item[activeWantStatusFilter])
    : !item.archived && !item.completed && !item.deleted);
}

function getWantOrderItems(items = getWantItems().map(normalizeWantItem).filter(Boolean)) {
  return items.filter((item) => !item.archived && !item.completed && !item.deleted).sort(compareWantItems);
}

function formatWantOrder(item) {
  return Number.isFinite(item.order) && item.order !== Number.MAX_SAFE_INTEGER ? String(item.order) : "-";
}

function formatWantPrice(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function getWantSnapshotLabel(snapshotId) {
  return snapshotId === "current" ? "Current" : formatRankingSnapshotOptionLabel(getRankingSnapshotById(snapshotId));
}

function syncWantControls() {
  if (wantFilters) wantFilters.hidden = !shouldShowWantFilters;
  if (wantFilterToggle) {
    wantFilterToggle.setAttribute("aria-expanded", String(shouldShowWantFilters));
    wantFilterToggle.classList.toggle("is-active", shouldShowWantFilters);
  }
  if (wantEditToggle) {
    wantEditToggle.checked = shouldShowWantEditMode;
    wantEditToggle.disabled = activeWantViewMode === "calculated";
  }
  wantViewModeButtons?.forEach((button) => {
    const active = button.dataset.wantViewMode === activeWantViewMode;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  const snapshots = getRankingSnapshotsForKind("want");
  if (wantSnapshotSelect) {
    wantSnapshotSelect.innerHTML = [`<option value="current">Current</option>`, ...snapshots.map((snapshot) => `<option value="${escapeHtml(snapshot.id)}">${escapeHtml(formatRankingSnapshotOptionLabel(snapshot))}</option>`)].join("");
    wantSnapshotSelect.value = activeWantSnapshotId;
  }
  if (wantSnapshotCompareSelect) {
    wantSnapshotCompareSelect.innerHTML = [`<option value="">None</option>`, `<option value="current">Current</option>`, ...snapshots.map((snapshot) => `<option value="${escapeHtml(snapshot.id)}">${escapeHtml(formatRankingSnapshotOptionLabel(snapshot))}</option>`)].join("");
    wantSnapshotCompareSelect.value = activeWantCompareSnapshotId;
  }
  wantStatusFilters?.forEach((input) => { input.checked = input.dataset.wantStatusFilter === activeWantStatusFilter; });
}

function openWantItemDialog(itemId = "") {
  if (!isCurrentManagerAdmin() || !wantItemDialog) return;
  const item = itemId ? getWantItems().map(normalizeWantItem).filter(Boolean).find((entry) => entry.id === String(itemId)) : null;
  const orderItems = getWantOrderItems();
  if (wantItemDialogTitle) wantItemDialogTitle.textContent = item ? "Edit Want Item" : "Add Want Item";
  if (wantItemId) wantItemId.value = item?.id || "";
  if (wantNameInput) wantNameInput.value = item?.name || "";
  if (wantOrderInput) {
    wantOrderInput.value = String(item?.order && item.order !== Number.MAX_SAFE_INTEGER ? item.order : orderItems.length + 1);
    wantOrderInput.max = String(item ? Math.max(orderItems.length, 1) : orderItems.length + 1);
  }
  if (wantPriceInput) wantPriceInput.value = item?.price ?? "";
  if (wantImageUrlInput) wantImageUrlInput.value = item?.imageUrl || "";
  if (wantArchivedInput) wantArchivedInput.checked = Boolean(item?.archived);
  if (wantCompletedInput) wantCompletedInput.checked = Boolean(item?.completed);
  setWantItemStatus("");
  typeof wantItemDialog.showModal === "function" ? wantItemDialog.showModal() : wantItemDialog.setAttribute("open", "");
  wantNameInput?.focus();
}

function closeWantItemDialog() {
  if (!wantItemDialog) return;
  typeof wantItemDialog.close === "function" ? wantItemDialog.close() : wantItemDialog.removeAttribute("open");
}

function saveWantItemFromForm() {
  const name = String(wantNameInput?.value || "").trim();
  if (!name) return setWantItemStatus("Name is required.", true);
  const existingId = String(wantItemId?.value || "").trim();
  const existing = existingId ? getWantItems().find((row) => String(row.ID || row.id || "") === existingId) : null;
  const item = {
    ID: existingId || createWantItemId(),
    Order: String(clampTodoOrder(wantOrderInput?.value, getWantOrderItems().length + 1)),
    Name: name,
    Price: String(wantPriceInput?.value || "").trim(),
    Archived: wantArchivedInput?.checked ? "TRUE" : "FALSE",
    Completed: wantCompletedInput?.checked ? "TRUE" : "FALSE",
    IsDeleted: existing?.IsDeleted || existing?.isDeleted || "FALSE",
    "Image URL": String(wantImageUrlInput?.value || "").trim(),
  };
  upsertWantItemLocally(item);
  normalizeWantOrdersLocally(item.ID, Number(item.Order));
  renderWantList();
  submitNextItemPayload({ action: "saveWantItem", item, sheetName: "Want" });
  closeWantItemDialog();
}

function createWantItemId() {
  return String(getWantItems().map((row) => Number(row.ID || row.id)).filter((id) => Number.isInteger(id) && id > 0).reduce((max, id) => Math.max(max, id), 0) + 1);
}

function upsertWantItemLocally(item) {
  const id = String(item.ID || "");
  siteData.wantItems = [...getWantItems().filter((row) => String(row.ID || row.id || "") !== id), item];
}

function normalizeWantOrdersLocally(movedId = "", requestedOrder = 1) {
  const rows = getWantItems().map(normalizeWantItem).filter(Boolean);
  let orderable = getWantOrderItems(rows).filter((item) => item.id !== String(movedId));
  const moved = rows.find((item) => item.id === String(movedId));
  if (moved && !moved.archived && !moved.completed && !moved.deleted) orderable.splice(clampTodoOrder(requestedOrder, orderable.length + 1) - 1, 0, moved);
  const orderById = new Map(orderable.map((item, index) => [item.id, String(index + 1)]));
  siteData.wantItems = rows.map((item) => ({
    ID: item.id, Order: orderById.get(item.id) || formatWantOrder(item).replace("-", ""), Name: item.name,
    Price: item.raw.Price ?? "", Archived: item.archived ? "TRUE" : "FALSE", Completed: item.completed ? "TRUE" : "FALSE",
    IsDeleted: item.deleted ? "TRUE" : "FALSE", "Image URL": item.imageUrl,
  })).sort((a, b) => compareWantItems(normalizeWantItem(a), normalizeWantItem(b)));
}

function moveWantItem(draggedId, targetId, options = {}) {
  if (!isCurrentManagerAdmin() || !draggedId || !targetId || draggedId === targetId) return false;
  const rows = getWantOrderItems();
  const from = rows.findIndex((item) => item.id === draggedId);
  const to = rows.findIndex((item) => item.id === targetId);
  if (from < 0 || to < 0) return false;
  const [item] = rows.splice(from, 1);
  rows.splice(to, 0, item);
  const orderById = new Map(rows.map((entry, index) => [entry.id, String(index + 1)]));
  siteData.wantItems = getWantItems().map((raw) => ({ ...raw, Order: orderById.get(String(raw.ID || raw.id)) || raw.Order }));
  renderWantList();
  if (options.shouldSubmit !== false) submitWantOrder();
  return true;
}

function submitWantOrder() {
  submitNextItemPayload({ action: "saveWantOrder", items: siteData.wantItems, sheetName: "Want" });
}

function deleteWantItem(itemId) {
  const item = getWantItems().map(normalizeWantItem).filter(Boolean).find((row) => row.id === String(itemId));
  if (!item) return;
  const next = { ...item.raw, ID: item.id, IsDeleted: "TRUE" };
  upsertWantItemLocally(next);
  normalizeWantOrdersLocally(item.id, item.order);
  renderWantList();
  submitNextItemPayload({ action: "saveWantItem", item: next, sheetName: "Want" });
}

function openWantMoveDialog(itemId) {
  const item = getWantItems().map(normalizeWantItem).filter(Boolean).find((row) => row.id === String(itemId));
  if (!item || !wantMoveDialog) return;
  pendingWantMoveItemId = item.id;
  if (wantMoveName) wantMoveName.textContent = item.name;
  if (wantMoveStatus) wantMoveStatus.textContent = "";
  typeof wantMoveDialog.showModal === "function" ? wantMoveDialog.showModal() : wantMoveDialog.setAttribute("open", "");
}

function closeWantMoveDialog() {
  pendingWantMoveItemId = "";
  if (!wantMoveDialog) return;
  typeof wantMoveDialog.close === "function" ? wantMoveDialog.close() : wantMoveDialog.removeAttribute("open");
}

function confirmWantMove() {
  const item = getWantItems().map(normalizeWantItem).filter(Boolean).find((row) => row.id === pendingWantMoveItemId);
  if (!item) return closeWantMoveDialog();
  const next = { ...item.raw, ID: item.id, Completed: "TRUE" };
  upsertWantItemLocally(next);
  normalizeWantOrdersLocally(item.id, item.order);
  renderWantList();
  submitNextItemPayload({ action: "moveWantToTodo", itemId: item.id });
  delete siteData.todoItems;
  sharedDataPromises.delete("todo");
  pageDataPromises.delete("todo");
  closeWantMoveDialog();
}

function setWantItemStatus(message, isError = false) {
  if (!wantItemStatus) return;
  wantItemStatus.textContent = message;
  wantItemStatus.classList.toggle("is-error", isError);
}

function renderWantListError(error) {
  if (wantList) wantList.innerHTML = `<p class="table-message">Unable to load Want items: ${escapeHtml(error.message)}</p>`;
}

function ensureWantRankingDataLoaded() {
  if (siteData.wantRankingLoaded || wantRankingLoadPromise || !NEXT_DATA_ENDPOINT) return wantRankingLoadPromise || Promise.resolve();
  wantRankingLoadPromise = Promise.all([
    loadOptionalRankingEndpoint("listWantElo", { elo: [] }),
    loadOptionalRankingEndpoint("listWantChoices", { choices: [] }),
    loadOptionalRankingEndpoint("listWantRankingMeta", { seeds: [], snapshots: [], snapshotItems: [] }),
  ]).then(([eloResponse, choicesResponse, metaResponse]) => {
    siteData.rankingElo = [...(siteData.rankingElo || []).filter((row) => normalizeLookupName(row.rankingType) !== "want"), ...normalizeRankingEloRows(eloResponse.elo || [])];
    siteData.rankingChoices = [...(siteData.rankingChoices || []).filter((row) => normalizeLookupName(row.rankingType) !== "want"), ...normalizeRankingChoices(choicesResponse.choices || [])];
    siteData.rankingSeeds = [...(siteData.rankingSeeds || []).filter((row) => normalizeLookupName(row.rankingType) !== "want"), ...normalizeRankingSeedRows(metaResponse.seeds || [])];
    const oldSnapshotIds = new Set((siteData.rankingSnapshots || []).filter((row) => normalizeLookupName(row.rankingType) === "want").map((row) => String(row.id)));
    const snapshots = normalizeRankingSnapshots((metaResponse.snapshots || []).map((row) => ({ ...row, "Snapshot ID": `want-${row["Snapshot ID"] || row.snapshotId || ""}` })));
    const snapshotItems = normalizeRankingSnapshotItems((metaResponse.snapshotItems || []).map((row) => ({ ...row, "Snapshot ID": `want-${row["Snapshot ID"] || row.snapshotId || ""}` })));
    siteData.rankingSnapshots = [...(siteData.rankingSnapshots || []).filter((row) => normalizeLookupName(row.rankingType) !== "want"), ...snapshots];
    siteData.rankingSnapshotItems = [...(siteData.rankingSnapshotItems || []).filter((row) => !oldSnapshotIds.has(String(row.snapshotId))), ...snapshotItems];
    siteData.wantRankingLoaded = true;
    if (activePageName === "want") renderWantList();
  }).catch((error) => recordDiagnostic("Want ranking data failed to load", error));
  return wantRankingLoadPromise;
}

function openWantRandomDialog() {
  if (!wantRandomDialog) return;
  renderRandomWantItem();
  typeof wantRandomDialog.showModal === "function" ? wantRandomDialog.showModal() : wantRandomDialog.setAttribute("open", "");
}

function closeWantRandomDialog() {
  if (!wantRandomDialog) return;
  typeof wantRandomDialog.close === "function" ? wantRandomDialog.close() : wantRandomDialog.removeAttribute("open");
}

function renderRandomWantItem() {
  if (!wantRandomContent) return;
  const rows = getVisibleWantItems().map((item) => ({ ...item, rating: getRankingEloForItem("want", item.id).rating })).sort(compareCalculatedRankingRows);
  if (!rows.length) {
    wantRandomContent.innerHTML = `<p class="table-message">No Want items match the current filters.</p>`;
    return;
  }
  const maxRating = Math.max(...rows.map((item) => Number(item.rating || RANKING_BASE_RATING)));
  const weights = rows.map((item) => Math.max(1, maxRating - Number(item.rating || RANKING_BASE_RATING) + 100));
  let target = Math.random() * weights.reduce((sum, weight) => sum + weight, 0);
  const item = rows.find((entry, index) => ((target -= weights[index]) <= 0)) || rows.at(-1);
  wantRandomContent.innerHTML = `<article class="todo-random-result"><span class="todo-random-image-frame${item.imageUrl ? "" : " is-empty"}">${item.imageUrl ? `<img src="${escapeHtml(encodeURI(item.imageUrl))}" alt="" loading="lazy">` : ""}<span class="todo-random-rank">#${rows.findIndex((entry) => entry.id === item.id) + 1}</span></span><div><h3>${escapeHtml(item.name)}</h3>${item.price !== null ? `<p>${escapeHtml(formatWantPrice(item.price))}</p>` : ""}</div></article>`;
}

function renderTodoList(items = siteData.todoItems || []) {
  if (!todoList || !shouldRenderPageSection("todo")) {
    return;
  }

  if (!isCurrentManagerAdmin()) {
    todoList.innerHTML = `<p class="table-message">To Do is available to admin users.</p>`;
    return;
  }

  ensureGuideLinksLoaded();

  syncTodoControls();
  ensureTodoRankingDataLoaded();

  const normalizedItems = items.map(normalizeTodoItem).filter(Boolean).sort(compareTodoItems);
  const visibleItems = getVisibleTodoItems(normalizedItems);
  if (activeTodoViewMode === "calculated") {
    const currentCalculatedItems = visibleItems
      .map((item) => {
        const elo = getRankingEloForItem("todo", item.id);
        return { ...item, comparisons: elo.comparisons, losses: elo.losses, rating: elo.rating, wins: elo.wins };
      })
      .sort(compareCalculatedRankingRows);
    const visibleIds = new Set(visibleItems.map((item) => String(item.id)));
    const calculatedItems = activeTodoSnapshotId === "current"
      ? currentCalculatedItems
      : getRankingSnapshotRows("todo", activeTodoSnapshotId).filter((item) => visibleIds.has(String(item.id)));

    if (!calculatedItems.length) {
      todoList.innerHTML = `<p class="table-message">No To Do items found.</p>`;
      return;
    }

    todoList.innerHTML = `<div class="next-list todo-list">${calculatedItems.map((item, index) =>
      renderTodoCalculatedItem(item, index + 1, currentCalculatedItems)
    ).join("")}</div>`;
    return;
  }
  const groupedItems = groupTodoItems(visibleItems, normalizedItems);

  if (!groupedItems.length) {
    todoList.innerHTML = `<p class="table-message">No To Do items found.</p>`;
    return;
  }

  todoList.innerHTML = `
    <div class="next-list todo-list">
      ${groupedItems.map((entry) => renderTodoItem(entry.item, entry.children)).join("")}
    </div>
  `;
}

function renderTodoCalculatedItem(item, rank, currentRows = []) {
  const compareRows = activeTodoCompareSnapshotId === "current"
    ? currentRows
    : activeTodoCompareSnapshotId ? getRankingSnapshotRows("todo", activeTodoCompareSnapshotId) : [];
  const compareRank = compareRows.findIndex((row) => String(row.id) === String(item.id)) + 1;
  const movement = compareRank ? compareRank - rank : 0;
  const meta = [
    `${Math.round(item.rating || RANKING_BASE_RATING)} ELO`,
    `${item.wins || 0}-${item.losses || 0}`,
    Number(item.comparisons || 0) <= 0 ? "New" : Number(item.comparisons || 0) < RANKING_PROVISIONAL_COMPARISONS ? "Provisional" : "",
    `Manual #${formatTodoOrderNumber(item)}`,
    compareRank ? `${movement > 0 ? "+" : ""}${movement} vs ${getTodoSnapshotLabel(activeTodoCompareSnapshotId)}` : "",
  ].filter(Boolean);

  return `
    <article class="next-card todo-card">
      <div class="next-card-main">
        <span class="todo-order-number">${rank}</span>
        <div>
          <div class="guide-linked-heading"><h2>${escapeHtml(item.name)}</h2>${renderGuideEntryLinks("todo", item.id)}</div>
          <p class="todo-more-data">${meta.map(escapeHtml).join(" | ")}</p>
          ${renderTodoStatusChips(item)}
          ${shouldShowTodoMoreData ? renderTodoMoreData(item) : ""}
        </div>
      </div>
    </article>`;
}

function ensureTodoRankingDataLoaded() {
  if (siteData.todoRankingLoaded || todoRankingLoadPromise || !NEXT_DATA_ENDPOINT) {
    return todoRankingLoadPromise || Promise.resolve();
  }

  todoRankingLoadPromise = Promise.all([
    loadOptionalRankingEndpoint("listTodoElo", { elo: [] }),
    loadOptionalRankingEndpoint("listTodoChoices", { choices: [] }),
    loadOptionalRankingEndpoint("listTodoRankingMeta", { seeds: [], snapshotItems: [], snapshots: [] }),
  ]).then(([eloResponse, choicesResponse, metaResponse]) => {
    const managerId = getCurrentManagerId();
    const otherElo = (siteData.rankingElo || []).filter((row) => normalizeLookupName(row.rankingType) !== "todo");
    const otherChoices = (siteData.rankingChoices || []).filter((row) => normalizeLookupName(row.rankingType) !== "todo");
    siteData.rankingElo = [...otherElo, ...normalizeRankingEloRows(eloResponse.elo || []).map((row) => ({ ...row, managerId }))];
    siteData.rankingChoices = [...otherChoices, ...normalizeRankingChoices(choicesResponse.choices || []).map((row) => ({ ...row, managerId }))];
    siteData.rankingSeeds = [...(siteData.rankingSeeds || []).filter((row) => normalizeLookupName(row.rankingType) !== "todo"), ...normalizeRankingSeedRows(metaResponse.seeds || [])];
    const previousTodoSnapshotIds = new Set((siteData.rankingSnapshots || []).filter((row) => normalizeLookupName(row.rankingType) === "todo").map((row) => String(row.id)));
    const todoSnapshots = normalizeRankingSnapshots((metaResponse.snapshots || []).map((row) => ({ ...row, "Snapshot ID": `todo-${row["Snapshot ID"] || row.snapshotId || ""}` })));
    const todoSnapshotItems = normalizeRankingSnapshotItems((metaResponse.snapshotItems || []).map((row) => ({ ...row, "Snapshot ID": `todo-${row["Snapshot ID"] || row.snapshotId || ""}` })));
    siteData.rankingSnapshots = [...(siteData.rankingSnapshots || []).filter((row) => normalizeLookupName(row.rankingType) !== "todo"), ...todoSnapshots];
    siteData.rankingSnapshotItems = [...(siteData.rankingSnapshotItems || []).filter((row) => !previousTodoSnapshotIds.has(String(row.snapshotId))), ...todoSnapshotItems];
    siteData.todoRankingLoaded = true;
    if (activePageName === "todo") renderTodoList();
  }).catch((error) => recordDiagnostic("To Do ranking data failed to load", error));

  return todoRankingLoadPromise;
}

function openTodoRandomDialog() {
  if (!todoRandomDialog) return;
  renderRandomTodoItem();
  if (typeof todoRandomDialog.showModal === "function") todoRandomDialog.showModal();
  else todoRandomDialog.setAttribute("open", "");
}

function closeTodoRandomDialog() {
  if (!todoRandomDialog) return;
  if (typeof todoRandomDialog.close === "function") todoRandomDialog.close();
  else todoRandomDialog.removeAttribute("open");
}

function renderRandomTodoItem() {
  if (!todoRandomContent) return;
  const visibleItems = getVisibleTodoItems(getTodoItems().map(normalizeTodoItem).filter(Boolean));
  const visibleIds = new Set(visibleItems.map((item) => String(item.id)));
  const rankedItems = activeTodoViewMode === "calculated"
    ? activeTodoSnapshotId === "current"
      ? visibleItems.map((item) => ({ ...item, rating: getRankingEloForItem("todo", item.id).rating })).sort(compareCalculatedRankingRows)
      : getRankingSnapshotRows("todo", activeTodoSnapshotId).filter((item) => visibleIds.has(String(item.id)))
    : visibleItems.sort(compareTodoItems);
  const item = chooseWeightedTodoItem(rankedItems);

  if (!item) {
    todoRandomContent.innerHTML = `<p class="table-message">No To Do items match the current filters.</p>`;
    return;
  }

  const imageUrl = getTodoImageUrl(item);
  todoRandomContent.innerHTML = `
    <article class="todo-random-result">
      <span class="todo-random-image-frame${imageUrl ? "" : " is-empty"}">
        ${imageUrl ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(item.name)}" loading="eager" decoding="async">` : ""}
      </span>
      <div>
        <span class="todo-random-rank">#${rankedItems.findIndex((entry) => entry.id === item.id) + 1}</span>
        <h3>${escapeHtml(item.name)}</h3>
        ${renderTodoStatusChips(item)}
        ${renderTodoMoreData(item)}
      </div>
    </article>`;
}

function chooseWeightedTodoItem(items) {
  if (!items.length) return null;
  const lastIndex = Math.max(items.length - 1, 1);
  const weights = items.map((item, index) => 1 + (0.75 * (1 - (index / lastIndex))));
  let target = Math.random() * weights.reduce((total, weight) => total + weight, 0);
  for (let index = 0; index < items.length; index += 1) {
    target -= weights[index];
    if (target <= 0) return items[index];
  }
  return items[items.length - 1];
}

function getTodoImageUrl(item) {
  return String(item?.imageUrl || "").trim();
}

function getTodoSnapshotLabel(snapshotId) {
  if (snapshotId === "current") return "Current";
  return formatRankingSnapshotOptionLabel(getRankingSnapshotById(snapshotId));
}

function normalizeTodoItem(row) {
  const name = String(row?.Name || row?.name || "").trim();

  if (!name) {
    return null;
  }

  return {
    archived: isTrueValue(row.Archived || row.archived),
    completed: isTrueValue(row.Completed || row.completed),
    deleted: isTrueValue(row.IsDeleted || row.isDeleted || row.deleted),
    highHour: normalizeTodoHour(row["High Hour"] ?? row.highHour),
    id: String(row?.ID || row?.Id || row?.id || "").trim(),
    imageUrl: String(row?.["Image URL"] || row?.imageUrl || "").trim(),
    lowHour: normalizeTodoHour(row["Low Hour"] ?? row.lowHour),
    name,
    order: normalizeTodoOrder(row.Order),
    parentId: String(row["Parent ID"] || row.parentId || "").trim(),
    platinumCleanup: isTrueValue(row["Platinum Cleanup"] || row.platinumCleanup),
    raw: row,
    started: isTrueValue(row.Started || row.started),
    unpurchased: isTrueValue(row.Unpurchased || row.unpurchased),
  };
}

function normalizeTodoOrder(value) {
  const order = Number(value);
  return Number.isFinite(order) && order > 0 ? order : Number.MAX_SAFE_INTEGER;
}

function normalizeTodoHour(value) {
  const hour = Number(value);
  return Number.isFinite(hour) && hour > 0 ? hour : null;
}

function compareTodoItems(first, second) {
  if (first.order !== second.order) {
    return first.order - second.order;
  }

  return String(first.id).localeCompare(String(second.id), undefined, { numeric: true });
}

function getVisibleTodoItems(items) {
  return items.filter((item) => {
    if (!matchesTodoStatusFilter(item)) {
      return false;
    }

    return activeTodoStatusFilter || isTodoDefaultListItem(item);
  });
}

function isTodoDefaultListItem(item) {
  return Boolean(item && !item.archived && !item.deleted && !item.unpurchased && (!item.completed || item.platinumCleanup));
}

function getTodoItemMap(items) {
  return new Map(items.filter((item) => item.id).map((item) => [item.id, item]));
}

function hasActiveTodoParent(item, itemsById = getTodoItemMap(getTodoItems().map(normalizeTodoItem).filter(Boolean))) {
  const parent = item?.parentId ? itemsById.get(item.parentId) : null;
  return Boolean(parent && isTodoDefaultListItem(parent) && !parent.completed);
}

function getTodoDefaultOrderItems(items) {
  const itemsById = getTodoItemMap(items);

  return items
    .filter(isTodoDefaultListItem)
    .filter((item) => !hasActiveTodoParent(item, itemsById))
    .sort(compareTodoItems);
}

function matchesTodoStatusFilter(item) {
  if (!activeTodoStatusFilter) {
    return true;
  }

  if (activeTodoStatusFilter === "all") {
    return true;
  }

  return Boolean(item[activeTodoStatusFilter]);
}

function groupTodoItems(visibleItems, allItems) {
  const byId = new Map(allItems.map((item) => [item.id, item]));
  const visibleIds = new Set(visibleItems.map((item) => item.id));
  const childrenByParentId = new Map();

  visibleItems.forEach((item) => {
    const parent = item.parentId ? byId.get(item.parentId) : null;
    const shouldNest = parent && !parent.completed && visibleIds.has(parent.id);

    if (!shouldNest) {
      return;
    }

    const children = childrenByParentId.get(parent.id) || [];
    children.push(item);
    childrenByParentId.set(parent.id, children);
  });

  return visibleItems
    .filter((item) => {
      const parent = item.parentId ? byId.get(item.parentId) : null;
      return !parent || parent.completed || !visibleIds.has(parent.id);
    })
    .map((item) => ({
      children: (childrenByParentId.get(item.id) || []).sort(compareTodoItems),
      item,
    }));
}

function renderTodoItem(item, children = []) {
  const hourLabel = formatTodoHourRange(item);
  const startedClass = item.started ? " todo-card--started" : "";
  const deletedClass = item.deleted ? " todo-card--deleted" : "";
  const expandedClass = shouldShowTodoEditMode && activeTodoItemId === item.id ? " is-actions-open" : "";
  const chips = renderTodoStatusChips(item);
  const draggable = shouldShowTodoEditMode ? ` draggable="true"` : "";
  const controls = shouldShowTodoEditMode ? `
    <div class="todo-card-actions">
      <button class="ranking-inline-action" type="button" data-todo-edit="${escapeHtml(item.id)}">Edit</button>
      <button class="ranking-inline-action" type="button" data-todo-delete="${escapeHtml(item.id)}">Delete</button>
    </div>
  ` : "";
  const childMarkup = children.length
    ? `<div class="todo-child-list">${children.map(renderTodoChildItem).join("")}</div>`
    : "";

  return `
    <article class="next-card todo-card${startedClass}${deletedClass}${expandedClass}"${draggable} tabindex="0" role="button" data-todo-id="${escapeHtml(item.id)}" aria-label="${shouldShowTodoEditMode ? "Edit" : "View"} ${escapeHtml(item.name)}">
      <div class="next-card-main">
        <span class="todo-order-number">${escapeHtml(formatTodoOrderNumber(item))}</span>
        <div>
          <div class="guide-linked-heading"><h2>${escapeHtml(item.name)}</h2>${renderGuideEntryLinks("todo", item.id)}</div>
          ${hourLabel ? `<p class="next-card-date">${escapeHtml(hourLabel)}</p>` : ""}
          ${chips}
          ${shouldShowTodoMoreData ? renderTodoMoreData(item) : ""}
        </div>
        ${shouldShowTodoEditMode ? `<span class="ranking-drag-handle todo-drag-handle" aria-hidden="true" title="Drag to reorder"></span>` : ""}
      </div>
      ${controls}
      ${childMarkup}
    </article>
  `;
}

function renderTodoChildItem(item) {
  const hourLabel = formatTodoHourRange(item);
  const chips = renderTodoStatusChips(item);

  return `
    <article class="todo-child-card" data-todo-child-id="${escapeHtml(item.id)}">
      <div>
        <div class="guide-linked-heading"><h3>${escapeHtml(item.name)}</h3>${renderGuideEntryLinks("todo", item.id)}</div>
        ${hourLabel ? `<p class="next-card-date">${escapeHtml(hourLabel)}</p>` : ""}
        ${chips}
        ${shouldShowTodoMoreData ? renderTodoMoreData(item) : ""}
      </div>
      ${shouldShowTodoEditMode ? `<button class="ranking-inline-action" type="button" data-todo-edit="${escapeHtml(item.id)}">Edit</button>` : ""}
    </article>
  `;
}

function renderTodoStatusChips(item) {
  const chips = getTodoStatusChips(item);

  if (!chips.length) {
    return "";
  }

  return `
    <div class="todo-chip-list">
      ${chips.map((chip) => `<span class="todo-status-chip todo-status-chip--${escapeHtml(chip.key)}"><span aria-hidden="true">${renderTodoChipIcon(chip.icon)}</span>${escapeHtml(chip.label)}</span>`).join("")}
    </div>
  `;
}

function renderTodoChipIcon(icon) {
  if (icon === "check") {
    return `<svg viewBox="0 0 16 16" focusable="false"><path d="M3.2 8.3 6.4 11.4 12.8 4.6"></path></svg>`;
  }

  if (icon === "folder") {
    return `<svg viewBox="0 0 16 16" focusable="false"><path d="M2.5 5.2h4l1.2 1.4h5.8v5.9h-11Z"></path><path d="M2.5 5.2v-1.7h4.2l1.1 1.7"></path></svg>`;
  }

  return escapeHtml(icon);
}

function getTodoStatusChips(item) {
  const chips = [];

  if (item.started && !item.completed) chips.push({ icon: ">", key: "started", label: "Started" });
  if (item.archived) chips.push({ icon: "folder", key: "archived", label: "Archived" });
  if (item.platinumCleanup) chips.push({ icon: "P", key: "platinumCleanup", label: "Platinum Cleanup" });
  if (item.completed) chips.push({ icon: "check", key: "completed", label: "Completed" });
  if (item.deleted) chips.push({ icon: "X", key: "deleted", label: "Deleted" });
  if (item.unpurchased) chips.push({ icon: "$", key: "unpurchased", label: "Unpurchased" });

  return chips;
}

function renderTodoMoreData(item) {
  const details = [
    item.parentId ? `Parent: ${getTodoParentLabel(item.parentId) || item.parentId}` : "",
  ].filter(Boolean);

  if (!details.length) {
    return "";
  }

  return `<p class="todo-more-data">${details.map(escapeHtml).join(" | ")}</p>`;
}

function formatTodoHourRange(item) {
  const low = item.lowHour;
  const high = item.highHour;

  if (low === null && high === null) {
    return "";
  }

  if (low !== null && high !== null) {
    if (low === high) {
      return `${formatTodoHour(low)} hours`;
    }

    return `${formatTodoHour(low)} - ${formatTodoHour(high)} hours`;
  }

  return `${formatTodoHour(low ?? high)} hours`;
}

function formatTodoOrderNumber(item) {
  return Number.isFinite(item.order) && item.order !== Number.MAX_SAFE_INTEGER
    ? String(item.order)
    : "-";
}

function formatTodoHour(value) {
  return Number.isInteger(value) ? String(value) : String(value).replace(/\.?0+$/, "");
}

function openTodoItemDialog() {
  if (!isCurrentManagerAdmin() || !todoItemDialog) {
    return;
  }

  openTodoItemDialogForItem(null);
}

function openTodoItemDialogForItem(itemId) {
  if (!isCurrentManagerAdmin() || !todoItemDialog) {
    return;
  }

  const editingItem = itemId
    ? getTodoItems().map(normalizeTodoItem).filter(Boolean).find((item) => item.id === String(itemId))
    : null;
  const rows = getTodoItems();
  const normalizedRows = rows.map(normalizeTodoItem).filter(Boolean);
  const defaultOrderRows = getTodoDefaultOrderItems(normalizedRows);
  const nextOrder = editingItem?.order && editingItem.order !== Number.MAX_SAFE_INTEGER ? editingItem.order : defaultOrderRows.length + 1;
  const maxOrder = editingItem ? Math.max(defaultOrderRows.length, 1) : defaultOrderRows.length + 1;

  if (todoItemId) {
    todoItemId.value = editingItem?.id || "";
  }
  if (todoNameInput) {
    todoNameInput.value = editingItem?.name || "";
  }
  if (todoOrderInput) {
    todoOrderInput.value = String(nextOrder);
    todoOrderInput.max = String(maxOrder);
  }
  if (todoLowHourInput) {
    todoLowHourInput.value = editingItem?.raw["Low Hour"] || "";
  }
  if (todoHighHourInput) {
    todoHighHourInput.value = editingItem?.raw["High Hour"] || "";
  }
  if (todoParentIdInput) {
    todoParentIdInput.value = editingItem?.parentId || "";
  }
  if (todoParentInput) {
    todoParentInput.value = getTodoParentLabel(editingItem?.parentId) || "";
  }
  if (todoImageUrlInput) {
    todoImageUrlInput.value = editingItem?.imageUrl || "";
  }
  if (todoStartedInput) {
    todoStartedInput.checked = Boolean(editingItem?.started);
  }
  if (todoArchivedInput) {
    todoArchivedInput.checked = Boolean(editingItem?.archived);
  }
  if (todoPlatinumCleanupInput) {
    todoPlatinumCleanupInput.checked = Boolean(editingItem?.platinumCleanup);
  }
  if (todoCompletedInput) {
    todoCompletedInput.checked = Boolean(editingItem?.completed);
  }
  if (todoUnpurchasedInput) {
    todoUnpurchasedInput.checked = Boolean(editingItem?.unpurchased);
  }

  setTodoItemStatus("");

  if (typeof todoItemDialog.showModal === "function") {
    todoItemDialog.showModal();
  } else {
    todoItemDialog.setAttribute("open", "");
  }

}

function closeTodoItemDialog() {
  if (!todoItemDialog) {
    return;
  }

  if (typeof todoItemDialog.close === "function") {
    todoItemDialog.close();
  } else {
    todoItemDialog.removeAttribute("open");
  }
}

function saveTodoItemFromForm() {
  const name = String(todoNameInput?.value || "").trim();

  if (!name) {
    setTodoItemStatus("Name is required.", true);
    return;
  }

  const rows = getTodoItems();
  const parentResolution = resolveTodoParentIdFromInput();

  if (parentResolution.error) {
    setTodoItemStatus(parentResolution.error, true);
    return;
  }

  const parentId = parentResolution.id;
  const existingItem = String(todoItemId?.value || "").trim()
    ? rows.find((row) => String(row.ID || row.Id || row.id || "").trim() === String(todoItemId?.value || "").trim())
    : null;
  const requestedOrder = clampTodoOrder(todoOrderInput?.value, getTodoDefaultOrderItems(rows.map(normalizeTodoItem).filter(Boolean)).length + 1);
  const item = {
    ID: String(todoItemId?.value || "").trim() || createTodoItemId(),
    Order: String(requestedOrder),
    Name: name,
    "Low Hour": String(todoLowHourInput?.value ?? "").trim(),
    "High Hour": String(todoHighHourInput?.value ?? "").trim(),
    "Parent ID": parentId,
    Started: todoStartedInput?.checked ? "TRUE" : "FALSE",
    Archived: todoArchivedInput?.checked ? "TRUE" : "FALSE",
    "Platinum Cleanup": todoPlatinumCleanupInput?.checked ? "TRUE" : "FALSE",
    Completed: todoCompletedInput?.checked ? "TRUE" : "FALSE",
    IsDeleted: existingItem?.IsDeleted || existingItem?.isDeleted || "FALSE",
    Unpurchased: todoUnpurchasedInput?.checked ? "TRUE" : "FALSE",
    "Image URL": String(todoImageUrlInput?.value || "").trim(),
  };

  if (item["Parent ID"] === item.ID) {
    item["Parent ID"] = "";
  }

  upsertTodoItemLocally(item);
  normalizeTodoOrdersLocally({ movedItemId: item.ID, requestedOrder });
  renderTodoList();
  submitNextItemPayload({
    action: "saveTodoItem",
    item,
    sheetName: "To Do",
  });
  closeTodoItemDialog();
}

function getTodoItems() {
  return Array.isArray(siteData.todoItems) ? siteData.todoItems : [];
}

function createTodoItemId() {
  const nextId = getTodoItems()
    .map((row) => Number(String(row?.ID || row?.Id || row?.id || "").trim()))
    .filter((id) => Number.isInteger(id) && id > 0)
    .reduce((maxId, id) => Math.max(maxId, id), 0) + 1;

  return String(nextId);
}

function clampTodoOrder(value, maxOrder) {
  const order = Number(value);

  if (!Number.isInteger(order)) {
    return maxOrder;
  }

  return Math.min(Math.max(order, 1), Math.max(maxOrder, 1));
}

function upsertTodoItemLocally(item) {
  const id = String(item.ID || "").trim();
  const rows = getTodoItems();
  const nextRows = rows.filter((row) => String(row.ID || row.Id || row.id || "").trim() !== id);

  nextRows.push(item);
  siteData.todoItems = nextRows;
}

function normalizeTodoOrdersLocally(options = {}) {
  const normalizedItems = getTodoItems().map(normalizeTodoItem).filter(Boolean);
  const orderableItems = getTodoDefaultOrderItems(normalizedItems);
  const movedItemId = String(options.movedItemId || "").trim();
  const movedItem = movedItemId ? normalizedItems.find((item) => item.id === movedItemId) : null;
  let nextOrderableItems = orderableItems;

  if (movedItemId) {
    nextOrderableItems = orderableItems.filter((item) => item.id !== movedItemId);

    if (movedItem && isTodoDefaultListItem(movedItem) && !hasActiveTodoParent(movedItem, getTodoItemMap(normalizedItems))) {
      const targetIndex = clampTodoOrder(options.requestedOrder, nextOrderableItems.length + 1) - 1;
      nextOrderableItems.splice(targetIndex, 0, movedItem);
    }
  }

  const orderById = new Map(nextOrderableItems.map((item, index) => [item.id, String(index + 1)]));

  siteData.todoItems = normalizedItems
    .map((item) => ({
      ID: item.id,
      Order: orderById.get(item.id) || String(item.order === Number.MAX_SAFE_INTEGER ? "" : item.order),
      Name: item.name,
      "Low Hour": item.raw["Low Hour"] ?? "",
      "High Hour": item.raw["High Hour"] ?? "",
      "Parent ID": item.parentId || "",
      Started: item.started ? "TRUE" : "FALSE",
      Archived: item.archived ? "TRUE" : "FALSE",
      "Platinum Cleanup": item.platinumCleanup ? "TRUE" : "FALSE",
      Completed: item.completed ? "TRUE" : "FALSE",
      IsDeleted: item.deleted ? "TRUE" : "FALSE",
      Unpurchased: item.unpurchased ? "TRUE" : "FALSE",
      "Image URL": item.imageUrl || "",
    }))
    .sort((first, second) => compareTodoItems(normalizeTodoItem(first), normalizeTodoItem(second)));
}

function moveTodoItem(draggedId, targetId, options = {}) {
  if (!isCurrentManagerAdmin() || !draggedId || !targetId || draggedId === targetId) {
    return false;
  }

  const allRows = getTodoItems().map(normalizeTodoItem).filter(Boolean);
  const rows = getTodoDefaultOrderItems(allRows);
  const fromIndex = rows.findIndex((row) => row.id === draggedId);
  const toIndex = rows.findIndex((row) => row.id === targetId);

  if (fromIndex < 0 || toIndex < 0) {
    return false;
  }

  const [item] = rows.splice(fromIndex, 1);
  rows.splice(toIndex, 0, item);
  const orderById = new Map(rows.map((row, index) => [row.id, String(index + 1)]));
  siteData.todoItems = allRows.map((row) => ({
    ID: row.id,
    Order: orderById.get(row.id) || String(row.order === Number.MAX_SAFE_INTEGER ? "" : row.order),
    Name: row.name,
    "Low Hour": row.raw["Low Hour"] ?? "",
    "High Hour": row.raw["High Hour"] ?? "",
    "Parent ID": row.parentId || "",
    Started: row.started ? "TRUE" : "FALSE",
    Archived: row.archived ? "TRUE" : "FALSE",
    "Platinum Cleanup": row.platinumCleanup ? "TRUE" : "FALSE",
    Completed: row.completed ? "TRUE" : "FALSE",
    IsDeleted: row.deleted ? "TRUE" : "FALSE",
    Unpurchased: row.unpurchased ? "TRUE" : "FALSE",
    "Image URL": row.imageUrl || "",
  })).sort((first, second) => compareTodoItems(normalizeTodoItem(first), normalizeTodoItem(second)));
  renderTodoList();

  if (options.shouldSubmit !== false) {
    submitTodoOrder();
  }

  return true;
}

function submitTodoOrder() {
  submitNextItemPayload({
    action: "saveTodoOrder",
    items: getTodoItems().map((item) => ({
      ID: item.ID,
      Order: item.Order,
      Name: item.Name,
      "Low Hour": item["Low Hour"] ?? "",
      "High Hour": item["High Hour"] ?? "",
      "Parent ID": item["Parent ID"] || "",
      Started: item.Started || "FALSE",
      Archived: item.Archived || "FALSE",
      "Platinum Cleanup": item["Platinum Cleanup"] || "FALSE",
      Completed: item.Completed || "FALSE",
      IsDeleted: item.IsDeleted || "FALSE",
      Unpurchased: item.Unpurchased || "FALSE",
      "Image URL": item["Image URL"] || item.imageUrl || "",
    })),
    sheetName: "To Do",
  });
}

function deleteTodoItem(itemId) {
  const item = getTodoItems().map(normalizeTodoItem).filter(Boolean).find((row) => row.id === String(itemId));

  if (!item) {
    return;
  }

  const nextItem = {
    ...item.raw,
    ID: item.id,
    IsDeleted: "TRUE",
  };

  upsertTodoItemLocally(nextItem);
  normalizeTodoOrdersLocally({ movedItemId: item.id, requestedOrder: item.order });
  renderTodoList();
  submitNextItemPayload({
    action: "saveTodoItem",
    item: nextItem,
    sheetName: "To Do",
  });
}

function syncTodoControls() {
  if (todoFilters) {
    todoFilters.hidden = !shouldShowTodoFilters;
  }

  if (todoFilterToggle) {
    todoFilterToggle.setAttribute("aria-expanded", String(shouldShowTodoFilters));
    todoFilterToggle.classList.toggle("is-active", shouldShowTodoFilters);
  }

  if (todoMoreDataToggle) {
    todoMoreDataToggle.checked = shouldShowTodoMoreData;
  }

  if (todoEditToggle) {
    todoEditToggle.checked = shouldShowTodoEditMode;
    todoEditToggle.disabled = activeTodoViewMode === "calculated";
  }

  todoViewModeButtons?.forEach((button) => {
    const isActive = button.dataset.todoViewMode === activeTodoViewMode;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  const snapshots = getRankingSnapshotsForKind("todo");
  if (todoSnapshotSelect) {
    todoSnapshotSelect.innerHTML = [`<option value="current">Current</option>`, ...snapshots.map((snapshot) =>
      `<option value="${escapeHtml(snapshot.id)}">${escapeHtml(formatRankingSnapshotOptionLabel(snapshot))}</option>`)].join("");
    if (!["current", ...snapshots.map((snapshot) => snapshot.id)].includes(activeTodoSnapshotId)) activeTodoSnapshotId = "current";
    todoSnapshotSelect.value = activeTodoSnapshotId;
  }
  if (todoSnapshotCompareSelect) {
    todoSnapshotCompareSelect.innerHTML = [`<option value="">None</option>`, `<option value="current">Current</option>`, ...snapshots.map((snapshot) =>
      `<option value="${escapeHtml(snapshot.id)}">${escapeHtml(formatRankingSnapshotOptionLabel(snapshot))}</option>`)].join("");
    if (!["", "current", ...snapshots.map((snapshot) => snapshot.id)].includes(activeTodoCompareSnapshotId)) activeTodoCompareSnapshotId = "";
    todoSnapshotCompareSelect.value = activeTodoCompareSnapshotId;
  }

  todoStatusFilters?.forEach((input) => {
    input.checked = input.dataset.todoStatusFilter === activeTodoStatusFilter;
  });
}

function setTodoStatusFilter(filter) {
  activeTodoStatusFilter = activeTodoStatusFilter === filter ? "" : filter;
  activeTodoItemId = "";
  renderTodoList();
}

function getTodoStatusFilterLabel(filter) {
  const labels = {
    all: "All",
    archived: "Archived",
    completed: "Completed",
    deleted: "Deleted",
    platinumCleanup: "Platinum Cleanup",
    started: "Started",
    unpurchased: "Unpurchased",
  };

  return labels[filter] || "";
}

function getTodoParentOptions(excludeId = String(todoItemId?.value || "").trim()) {
  const excludedIds = getTodoExcludedParentIds(excludeId);

  return getTodoItems()
    .map(normalizeTodoItem)
    .filter(Boolean)
    .filter((item) => item.id && !excludedIds.has(item.id))
    .sort(compareTodoItems)
    .map((item) => ({
      label: item.name,
      meta: item.id ? `ID ${item.id}` : "",
      value: item.id,
      id: item.id,
    }));
}

function getTodoExcludedParentIds(itemId) {
  const excludedIds = new Set();
  const normalizedId = String(itemId || "").trim();

  if (!normalizedId) {
    return excludedIds;
  }

  const items = getTodoItems().map(normalizeTodoItem).filter(Boolean);
  const childrenByParentId = new Map();
  items.forEach((item) => {
    if (!item.parentId) {
      return;
    }

    const children = childrenByParentId.get(item.parentId) || [];
    children.push(item.id);
    childrenByParentId.set(item.parentId, children);
  });

  const visit = (id) => {
    if (!id || excludedIds.has(id)) {
      return;
    }

    excludedIds.add(id);
    (childrenByParentId.get(id) || []).forEach(visit);
  };

  visit(normalizedId);
  return excludedIds;
}

function getTodoParentLabel(parentId) {
  const item = getTodoItems().map(normalizeTodoItem).filter(Boolean).find((row) => row.id === String(parentId || ""));
  return item ? item.name : "";
}

function resolveTodoParentIdFromInput() {
  const typedValue = String(todoParentInput?.value || "").trim();
  const currentId = String(todoParentIdInput?.value || "").trim();

  if (!typedValue) {
    return { id: "" };
  }

  const options = getTodoParentOptions();
  const normalizedTypedValue = normalizeLookupName(typedValue);
  const option = options.find((entry) =>
    normalizeLookupName(entry.label) === normalizeLookupName(typedValue) ||
    normalizeLookupName(entry.value) === normalizeLookupName(typedValue)
  );

  if (option?.id) {
    return { id: option.id };
  }

  if (currentId && normalizeLookupName(getTodoParentLabel(currentId)) === normalizedTypedValue) {
    return { id: currentId };
  }

  const filteredOptions = options.filter((entry) => normalizeLookupName(entry.label).includes(normalizedTypedValue));

  if (filteredOptions.length === 1) {
    return { id: filteredOptions[0].id };
  }

  return {
    error: filteredOptions.length
      ? "Select one parent from the list."
      : "Parent must match another To Do item.",
    id: "",
  };
}

function renderTodoParentAutocomplete() {
  if (!todoParentInput) {
    return;
  }

  activeAutocompleteInput = todoParentInput;
  renderAutocompleteDropdown(todoParentInput, getTodoParentOptions(), "No To Do matches");
}

function selectTodoParentOption(value) {
  const option = getTodoParentOptions().find((entry) => entry.id === String(value));

  if (todoParentInput) {
    todoParentInput.value = option ? option.label : value;
  }

  if (todoParentIdInput) {
    todoParentIdInput.value = option?.id || "";
  }

  closeAutocompleteDropdown();
}

function getTodoItemElement(itemId) {
  return todoList?.querySelector(`[data-todo-id="${CSS.escape(String(itemId || ""))}"]`) || null;
}

function setTodoItemStatus(message, isError = false) {
  if (!todoItemStatus) {
    return;
  }

  todoItemStatus.textContent = message;
  todoItemStatus.classList.toggle("is-error", isError);
}

function renderTodoListError(error) {
  if (todoList) {
    todoList.innerHTML = `<p class="table-message">Unable to load To Do items: ${escapeHtml(error.message)}</p>`;
  }
}

function renderRankingsPage() {
  if (activePageName !== "rankings" || !siteData.managerSession) {
    return;
  }

  activeRankingManagerId = activeRankingManagerId || getCurrentManagerId();

  syncRankingTabs();
  syncRankingManagerOptions();

  ensureRankingsLoaded();
  renderRankingLists();
}

function ensureRankingsLoaded() {
  const managerId = getActiveRankingManagerId();
  if (!managerId) return Promise.resolve({});
  if (siteData.rankingsLoadedForManager === managerId) {
    return Promise.resolve(siteData.rankings);
  }

  if (rankingsLoadPromise?.managerId === managerId) {
    return rankingsLoadPromise;
  }

  siteData.rankings = {};
  siteData.rankingErrors = [];
  siteData.rankingErrorsByKind = {};
  siteData.rankingLoading = Object.fromEntries(
    Object.keys(RANKING_CONFIG).map((kind) => [kind, true])
  );
  renderRankingLists();

  const promise = Promise.all([
    rankingCatalog ? Promise.resolve(rankingCatalog) : loadJson(`data/rankings.json?v=${encodeURIComponent(SITE_VERSION)}`, { cache: "force-cache" })
      .then((snapshot) => {
        if (snapshot?.schemaVersion !== 1 || !Array.isArray(snapshot.items)) throw new Error("MCU ranking catalog has an unsupported format.");
        rankingCatalog = snapshot.items;
        return rankingCatalog;
      }),
    ...Object.keys(RANKING_CONFIG).map((kind) => loadManagerRankingSet(managerId, kind)),
  ]).then(([mcuItems, ...sets]) => {
      const standalone = new Set(["todo", "want"]);
      siteData.rankingElo = (siteData.rankingElo || []).filter((row) => standalone.has(normalizeLookupName(row.rankingType)));
      siteData.rankingExclusions = (siteData.rankingExclusions || []).filter((row) => standalone.has(normalizeLookupName(row.rankingType)));
      siteData.rankingSeeds = (siteData.rankingSeeds || []).filter((row) => standalone.has(normalizeLookupName(row.rankingType)));
      siteData.rankingPairCounts = [];
      const standaloneSnapshots = (siteData.rankingSnapshots || []).filter((row) => standalone.has(normalizeLookupName(row.rankingType)));
      const standaloneSnapshotIds = new Set(standaloneSnapshots.map((row) => String(row.id)));
      siteData.rankingSnapshots = standaloneSnapshots;
      siteData.rankingSnapshotItems = (siteData.rankingSnapshotItems || []).filter((row) => standaloneSnapshotIds.has(String(row.snapshotId)));
      siteData.rankingRevisions = {};
      sets.forEach((set, index) => {
        const kind = Object.keys(RANKING_CONFIG)[index];
        rankingSets.set(`${managerId}:${kind}`, set);
        siteData.rankingRevisions[kind] = Number(set.revision || 0);
        siteData.rankings[kind] = kind === "mcu"
          ? mergeMcuRankingItems(mcuItems, set.items || [])
          : (set.items || []).map((item) => ({ ...item, rank: Number(item.manualRank || 0), nameKey: "Name" })).sort(compareRankingRows);
        siteData.rankingElo.push(...(set.elo || []).map((row) => ({ ...row, managerId, rankingType: kind })));
        siteData.rankingExclusions.push(...(set.exclusions || []).map((row) => ({ ...row, managerId, rankingType: kind })));
        siteData.rankingSeeds.push(...(set.seeds || []).map((row) => ({ ...row, managerId, rankingType: kind })));
        siteData.rankingPairCounts.push(...(set.pairCounts || []).map((row) => ({ ...row, managerId, rankingType: kind })));
        siteData.rankingSnapshots.push(...(set.snapshots || []).map((row) => ({ ...row, managerId, rankingType: kind })));
        siteData.rankingSnapshotItems.push(...(set.snapshotItems || []));
        siteData.rankingLoading[kind] = false;
      });
      siteData.rankingsLoadedForManager = managerId;
      renderRankingLists();
      return siteData.rankings;
    })
    .catch((error) => {
      siteData.rankingErrors = [error.message];
      renderRankingAdminMessage(`Unable to load rankings: ${error.message}`);
      throw error;
    });
  promise.managerId = managerId;
  rankingsLoadPromise = promise;
  return promise;
}

function mergeMcuRankingItems(catalog, manualItems) {
  const ranks = new Map((manualItems || []).map((item) => [String(item.id), Number(item.manualRank)]));
  return catalog.map((item) => ({
    id: String(item.id),
    name: String(item.name),
    nameKey: "Entry",
    rank: ranks.get(String(item.id)) || Number(item.rank),
    archived: false,
  })).sort(compareRankingRows).map((item, index) => ({ ...item, rank: index + 1 }));
}

async function loadManagerRankingSet(managerId, kind) {
  if (!RANKINGS_ENDPOINT) throw new Error("Rankings service is not configured.");
  const response = await fetch(`${RANKINGS_ENDPOINT.replace(/\/$/, "")}/api/managers/${encodeURIComponent(managerId)}/rankings/${encodeURIComponent(kind)}`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(12000),
  });
  const value = await response.json().catch(() => ({}));
  if (!response.ok || !value.ok) throw new Error(value.error || `Unable to load ${kind} rankings.`);
  return value;
}

function syncRankingManagerOptions() {
  if (!rankingManagerSelect) return;
  const managers = getPortalManagers();
  const managerId = getActiveRankingManagerId();
  rankingManagerSelect.innerHTML = managers.map((manager) => {
    const meta = getManagerMeta(manager);
    return `<option value="${escapeHtml(meta.id)}"${String(meta.id) === String(managerId) ? " selected" : ""}>${escapeHtml(meta.displayName)}</option>`;
  }).join("");
}

function getActiveRankingManagerId() {
  return String(activeRankingManagerId || getCurrentManagerId()).trim();
}

function canEditActiveRankingManager() {
  return Boolean(getCurrentManagerId()) && getActiveRankingManagerId() === getCurrentManagerId();
}

function resetRankingManagerData() {
  rankingsLoadPromise = null;
  siteData.rankingsLoadedForManager = "";
  siteData.rankings = {};
  const standalone = new Set(["todo", "want"]);
  siteData.rankingElo = (siteData.rankingElo || []).filter((row) => standalone.has(normalizeLookupName(row.rankingType)));
  siteData.rankingExclusions = (siteData.rankingExclusions || []).filter((row) => standalone.has(normalizeLookupName(row.rankingType)));
  siteData.rankingSeeds = (siteData.rankingSeeds || []).filter((row) => standalone.has(normalizeLookupName(row.rankingType)));
  siteData.rankingPairCounts = [];
  const standaloneSnapshots = (siteData.rankingSnapshots || []).filter((row) => standalone.has(normalizeLookupName(row.rankingType)));
  const standaloneSnapshotIds = new Set(standaloneSnapshots.map((row) => String(row.id)));
  siteData.rankingSnapshots = standaloneSnapshots;
  siteData.rankingSnapshotItems = (siteData.rankingSnapshotItems || []).filter((row) => standaloneSnapshotIds.has(String(row.snapshotId)));
  siteData.rankingRevisions = {};
  activeRankingSnapshotId = "current";
  activeRankingCompareSnapshotId = "";
}

async function ensureRankingAuthorization() {
  const session = siteData.managerSession;
  if (!session?.managerId) throw new Error("Sign in to edit rankings.");
  const auth = session.rankingAuth || {};
  if (auth.accessToken && Date.parse(auth.accessExpiresAt || "") > Date.now() + 30000) return auth.accessToken;
  let response;
  if (auth.refreshToken && Date.parse(auth.refreshExpiresAt || "") > Date.now() + 30000) {
    response = await fetch(`${RANKINGS_ENDPOINT.replace(/\/$/, "")}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: auth.refreshToken }),
      signal: AbortSignal.timeout(12000),
    });
  } else {
    response = await fetch(`${RANKINGS_ENDPOINT.replace(/\/$/, "")}/api/auth/bootstrap`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ managerId: session.managerId, signedInAt: session.signedInAt }),
      signal: AbortSignal.timeout(12000),
    });
  }
  const value = await response.json().catch(() => ({}));
  if (!response.ok || !value.accessToken) throw new Error(value.error || "Unable to authorize ranking edits.");
  siteData.managerSession = { ...session, rankingAuth: value };
  try { localStorage.setItem(MANAGER_SESSION_STORAGE_KEY, JSON.stringify(siteData.managerSession)); } catch {}
  return value.accessToken;
}

async function requestRankingAuthorizationForLogin(managerId, passphrase) {
  if (!RANKINGS_ENDPOINT || !managerId || !passphrase) return null;
  const response = await fetch(`${RANKINGS_ENDPOINT.replace(/\/$/, "")}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ managerId, passphrase }),
    signal: AbortSignal.timeout(12000),
  });
  const value = await response.json().catch(() => ({}));
  if (!response.ok || !value.accessToken) throw new Error(value.error || "Unable to authorize ranking edits.");
  return value;
}

async function rankingApiRequest(path, options = {}, retried = false) {
  const accessToken = await ensureRankingAuthorization();
  const response = await fetch(`${RANKINGS_ENDPOINT.replace(/\/$/, "")}${path}`, {
    ...options,
    headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: `Bearer ${accessToken}`, ...(options.headers || {}) },
    signal: AbortSignal.timeout(12000),
  });
  const value = await response.json().catch(() => ({}));
  if (response.status === 401 && !retried) {
    siteData.managerSession = { ...siteData.managerSession, rankingAuth: { ...(siteData.managerSession?.rankingAuth || {}), accessToken: "", accessExpiresAt: "" } };
    try { localStorage.setItem(MANAGER_SESSION_STORAGE_KEY, JSON.stringify(siteData.managerSession)); } catch {}
    return rankingApiRequest(path, options, true);
  }
  if (!response.ok || !value.ok) {
    const error = new Error(value.error || "Ranking change was not saved.");
    error.status = response.status;
    throw error;
  }
  return value;
}

function rankingWritePath(kind, suffix) {
  return `/api/managers/${encodeURIComponent(getCurrentManagerId())}/rankings/${encodeURIComponent(kind)}${suffix}`;
}

async function reloadActiveRankings() {
  resetRankingManagerData();
  await ensureRankingsLoaded();
  renderRankingLists();
}

function renderRankingAdminMessage(message) {
  Object.keys(RANKING_CONFIG).forEach((kind) => {
    const list = RANKING_CONFIG[kind].list();

    if (list) {
      list.innerHTML = renderLoadingMessage(message);
    }
  });
}

async function loadRankingSupplementalData() {
  if (!NEXT_DATA_ENDPOINT) {
    siteData.rankingElo = [];
    siteData.rankingExclusions = [];
    siteData.rankingSeeds = [];
    siteData.rankingSnapshots = [];
    siteData.rankingSnapshotItems = [];
    return;
  }

  const [
    eloResponse,
    seedsResponse,
    snapshotsResponse,
    exclusionsResponse,
    choicesResponse,
  ] = await Promise.all([
    loadOptionalRankingEndpoint("listRankingElo", { elo: [] }, { managerId: getCurrentManagerId() }),
    loadOptionalRankingEndpoint("listRankingSeeds", { seeds: [] }),
    loadOptionalRankingEndpoint("listRankingSnapshots", { snapshotItems: [], snapshots: [] }),
    loadOptionalRankingEndpoint("listRankingExclusions", { exclusions: [] }),
    loadOptionalRankingEndpoint("listRankingChoices", { choices: [] }, { managerId: getCurrentManagerId() }),
  ]);

  const standaloneTypes = new Set(["todo", "want"]);
  const standaloneElo = (siteData.rankingElo || []).filter((row) => standaloneTypes.has(normalizeLookupName(row.rankingType)));
  const standaloneChoices = (siteData.rankingChoices || []).filter((row) => standaloneTypes.has(normalizeLookupName(row.rankingType)));
  const standaloneSeeds = (siteData.rankingSeeds || []).filter((row) => standaloneTypes.has(normalizeLookupName(row.rankingType)));
  const standaloneSnapshots = (siteData.rankingSnapshots || []).filter((row) => standaloneTypes.has(normalizeLookupName(row.rankingType)));
  const standaloneSnapshotIds = new Set(standaloneSnapshots.map((row) => String(row.id)));
  const standaloneSnapshotItems = (siteData.rankingSnapshotItems || []).filter((row) => standaloneSnapshotIds.has(String(row.snapshotId)));
  siteData.rankingElo = [...normalizeRankingEloRows(eloResponse.elo || []), ...standaloneElo];
  siteData.rankingExclusions = normalizeRankingExclusions(exclusionsResponse.exclusions || []);
  siteData.rankingSeeds = [...normalizeRankingSeedRows(seedsResponse.seeds || []), ...standaloneSeeds];
  siteData.rankingSnapshots = [...normalizeRankingSnapshots(snapshotsResponse.snapshots || []), ...standaloneSnapshots];
  siteData.rankingSnapshotItems = [...normalizeRankingSnapshotItems(snapshotsResponse.snapshotItems || []), ...standaloneSnapshotItems];
  siteData.rankingChoices = [...normalizeRankingChoices(choicesResponse.choices || []), ...standaloneChoices];
}

async function loadOptionalRankingEndpoint(action, fallback, params = {}) {
  try {
    return await loadNextDataEndpoint(action, params);
  } catch (error) {
    recordDiagnostic(`${action} failed to load`, error);
    return fallback;
  }
}

function loadNextDataEndpoint(action, params = {}) {
  const callbackName = `boxThisLapNextData${Date.now()}${Math.random().toString(36).slice(2)}`;
  const callbackId = `next-data-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return new Promise((resolve, reject) => {
    let script;
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error(`No response from the ${action} endpoint.`));
    }, 12000);

    function cleanup() {
      window.clearTimeout(timeout);
      delete window[callbackName];
      script?.remove();
    }

    window[callbackName] = (data) => {
      if (!data || data.source !== "boxthislap-next-data" || data.callbackId !== callbackId) {
        return;
      }

      cleanup();

      if (!data.ok) {
        reject(new Error(data.error || `Unable to load ${action}.`));
        return;
      }

      resolve(data);
    };

    const url = new URL(NEXT_DATA_ENDPOINT);
    url.searchParams.set("action", action);
    url.searchParams.set("callback", callbackName);
    url.searchParams.set("callbackId", callbackId);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    });

    script = document.createElement("script");
    script.async = true;
    script.src = url.toString();
    script.onerror = () => {
      cleanup();
      reject(new Error(`Unable to reach the ${action} endpoint.`));
    };
    document.head.append(script);
  });
}

function normalizeRankingChoices(rows = []) {
  return rows
    .map(normalizeRankingChoice)
    .filter(Boolean);
}

function normalizeRankingChoice(row) {
  const id = String(getField(row, "ID", "Id", "id") || "").trim();
  const rankingType = String(getField(row, "Ranking Type", "Ranking", "Type", "rankingType") || "").trim();
  const itemAId = String(getField(row, "Item A ID", "Item A", "itemAId") || "").trim();
  const itemBId = String(getField(row, "Item B ID", "Item B", "itemBId") || "").trim();
  const winnerId = String(getField(row, "Winner ID", "Winner", "winnerId") || "").trim();
  const loserId = String(getField(row, "Loser ID", "Loser", "loserId") || "").trim();

  if (!rankingType || !winnerId || !loserId) {
    return null;
  }

  return {
    createdAt: String(getField(row, "Created At", "createdAt") || "").trim(),
    id,
    itemAId,
    itemBId,
    loserId,
    managerId: String(getField(row, "Manager ID", "Manager", "managerId") || "").trim(),
    rankingType,
    winnerId,
  };
}

function normalizeRankingEloRows(rows = []) {
  return rows
    .map(normalizeRankingEloRow)
    .filter(Boolean);
}

function normalizeRankingEloRow(row) {
  const id = String(getField(row, "ID", "Id", "id") || "").trim();
  const managerId = String(getField(row, "Manager ID", "Manager", "managerId") || "").trim();
  const rankingType = String(getField(row, "Ranking Type", "Ranking", "Type", "rankingType") || "").trim();
  const itemId = String(getField(row, "Item ID", "Item", "itemId") || "").trim();

  if (!rankingType || !itemId) {
    return null;
  }

  return {
    id,
    itemId,
    lastChoiceId: String(getField(row, "Last Choice ID", "lastChoiceId") || "").trim(),
    losses: Number(getField(row, "Losses", "losses") || 0),
    managerId,
    rating: Number(getField(row, "Rating", "rating") || RANKING_BASE_RATING),
    rankingType,
    updatedAt: String(getField(row, "Updated At", "updatedAt") || "").trim(),
    wins: Number(getField(row, "Wins", "wins") || 0),
  };
}

function normalizeRankingSeedRows(rows = []) {
  return rows
    .map(normalizeRankingSeedRow)
    .filter(Boolean);
}

function normalizeRankingSeedRow(row) {
  const rankingType = String(getField(row, "Ranking Type", "Ranking", "Type", "rankingType") || "").trim();
  const itemId = String(getField(row, "Item ID", "Item", "itemId") || "").trim();

  if (!rankingType || !itemId) {
    return null;
  }

  const seedRating = Number(getField(row, "Seed Rating", "seedRating") || RANKING_BASE_RATING);

  return {
    itemId,
    rankingType,
    reason: String(getField(row, "Reason", "reason") || "").trim(),
    seedRank: Number(getField(row, "Seed Rank", "seedRank") || 0),
    seedRating: Number.isFinite(seedRating) ? seedRating : RANKING_BASE_RATING,
    seededAt: String(getField(row, "Seeded At", "seededAt") || "").trim(),
  };
}

function normalizeRankingExclusions(rows = []) {
  return rows
    .map((row) => {
      const rankingType = String(getField(row, "Ranking Type", "Ranking", "Type", "rankingType") || "").trim();
      const itemId = String(getField(row, "Item ID", "Item", "itemId") || "").trim();
      const managerId = String(getField(row, "Manager ID", "Manager", "managerId") || "").trim();

      if (!rankingType || !itemId || !managerId) {
        return null;
      }

      return {
        excluded: isTrueValue(getField(row, "Excluded", "excluded")),
        id: String(getField(row, "ID", "Id", "id") || "").trim(),
        itemId,
        managerId,
        rankingType,
        updatedAt: String(getField(row, "Updated At", "updatedAt") || "").trim(),
      };
    })
    .filter(Boolean);
}

function normalizeRankingSnapshots(rows = []) {
  return rows
    .map((row) => {
      const id = String(getField(row, "Snapshot ID", "snapshotId", "ID") || "").trim();
      const rankingType = String(getField(row, "Ranking Type", "Ranking", "rankingType") || "").trim();

      if (!id || !rankingType) {
        return null;
      }

      return {
        createdAt: String(getField(row, "Created At", "createdAt") || "").trim(),
        id,
        label: String(getField(row, "Label", "label") || "").trim(),
        managerId: String(getField(row, "Manager ID", "managerId") || "").trim(),
        rankingType,
        reason: String(getField(row, "Reason", "reason") || "").trim(),
        source: String(getField(row, "Source", "source") || "").trim(),
      };
    })
    .filter(Boolean);
}

function normalizeRankingSnapshotItems(rows = []) {
  return rows
    .map((row) => {
      const snapshotId = String(getField(row, "Snapshot ID", "snapshotId") || "").trim();
      const itemId = String(getField(row, "Item ID", "itemId") || "").trim();

      if (!snapshotId || !itemId) {
        return null;
      }

      const rating = Number(getField(row, "Rating", "rating") || RANKING_BASE_RATING);
      const wins = Number(getField(row, "Wins", "wins") || 0);
      const losses = Number(getField(row, "Losses", "losses") || 0);

      return {
        comparisons: Number(getField(row, "Games", "games") || wins + losses || 0),
        itemId,
        itemName: String(getField(row, "Item Name", "itemName", "Name") || "").trim(),
        losses,
        rank: Number(getField(row, "Rank", "rank") || 0),
        rating: Number.isFinite(rating) ? rating : RANKING_BASE_RATING,
        snapshotId,
        wins,
      };
    })
    .filter(Boolean);
}

function renderRankingLists() {
  ensureGuideLinksLoaded();
  syncRankingControls();
  Object.keys(RANKING_CONFIG).forEach(renderRankingList);
}

function renderRankingList(kind) {
  const config = RANKING_CONFIG[kind];
  const list = config?.list();

  if (!config || !list) {
    return;
  }

  const rows = getDisplayedRankingRows(kind);

  if (siteData.rankingLoading?.[kind]) {
    list.innerHTML = renderLoadingMessage(`Loading ${config.itemLabel.toLowerCase()} rankings...`);
    return;
  }

  const messages = [
    ...(siteData.rankingErrorsByKind?.[kind] ? [siteData.rankingErrorsByKind[kind]] : []),
    ...(kind === activeRankingKind ? siteData.rankingErrors || [] : []),
  ];
  const errorMarkup = messages.length
    ? `<p class="table-message ranking-warning">${messages.map(escapeHtml).join("<br>")}</p>`
    : "";

  if (!rows.length) {
    const manager = getPortalManagerById(getActiveRankingManagerId());
    const name = manager ? getManagerMeta(manager).displayName : "This manager";
    const action = canEditActiveRankingManager() && kind !== "mcu"
      ? ` <button class="ranking-inline-action" type="button" data-ranking-empty-add="${escapeHtml(kind)}">Add one</button>`
      : "";
    list.innerHTML = `${errorMarkup}<p class="table-message">${escapeHtml(name)} has not added any ${escapeHtml(config.itemLabel.toLowerCase())} rankings yet.${action}</p>`;
    return;
  }

  list.innerHTML = rows.map((item) => renderRankingItem(kind, item)).join("");
  list.insertAdjacentHTML("afterbegin", errorMarkup);
}

function renderLoadingMessage(message = "Loading...") {
  return `
    <p class="table-message loading-message">
      <span class="loading-spinner" aria-hidden="true"></span>
      <span>${escapeHtml(message)}</span>
    </p>
  `;
}

function renderRankingItem(kind, item) {
  const isOwner = canEditActiveRankingManager();
  const isSnapshotView = isOwner && activeRankingSnapshotId !== "current";
  const isManualView = isOwner && activeRankingViewMode === "manual" && !isSnapshotView;
  const draggable = isManualView ? ` draggable="true"` : "";
  const isExcluded = isRankingItemExcluded(kind, item.id);
  const meta = shouldShowRankingMoreData ? renderRankingItemMeta(item) : "";
  const movement = renderRankingMovement(kind, item);
  const exclusionAction = renderRankingExclusionAction(kind, item);

  return `
    <article class="ranking-item${isExcluded ? " is-excluded" : ""}" data-ranking-kind="${escapeHtml(kind)}" data-ranking-id="${escapeHtml(item.id)}"${draggable}>
      <span class="ranking-rank">${escapeHtml(String(item.displayRank || item.rank))}</span>
      <span class="ranking-item-main">
        <span class="guide-linked-heading"><strong>${escapeHtml(item.name)}</strong>${kind === "games" ? renderGuideEntryLinks("ranking", item.id) : ""}</span>
        ${isExcluded ? `<small class="ranking-excluded-label">Excluded</small>` : ""}
        ${movement}
        ${meta}
        ${exclusionAction}
      </span>
      ${isManualView ? `<span class="ranking-drag-handle" aria-hidden="true" title="Drag to reorder"></span>` : `<span class="ranking-spacer" aria-hidden="true"></span>`}
      ${isOwner && kind !== "mcu" && !isSnapshotView ? `<span class="ranking-item-actions"><button class="ranking-inline-action" type="button" data-ranking-edit="${escapeHtml(item.id)}" data-ranking-kind="${escapeHtml(kind)}">Edit</button><button class="ranking-inline-action" type="button" data-ranking-archive="${escapeHtml(item.id)}" data-ranking-kind="${escapeHtml(kind)}">${item.archived ? "Restore" : "Archive"}</button></span>` : ""}
    </article>
  `;
}

function renderRankingExclusionAction(kind, item) {
  if (!canEditActiveRankingManager() || activeRankingSnapshotId !== "current") {
    return "";
  }

  const isExcluded = isRankingItemExcluded(kind, item.id);
  const label = isExcluded ? "Include" : "Exclude";

  return `
    <span class="ranking-item-actions">
      <button class="ranking-inline-action" type="button" data-ranking-exclusion-toggle="${escapeHtml(item.id)}" data-ranking-kind="${escapeHtml(kind)}">
        ${escapeHtml(label)}
      </button>
    </span>
  `;
}

function renderRankingMovement(kind, item) {
  if (!canEditActiveRankingManager() || !activeRankingCompareSnapshotId) {
    return "";
  }

  const compareRank = getRankingCompareRank(kind, item.id);

  if (!compareRank) {
    return `<small>New since comparison</small>`;
  }

  const currentRank = Number(item.displayRank || item.rank || 0);
  const movement = compareRank - currentRank;
  const label = movement > 0
    ? `Up ${movement}`
    : movement < 0
      ? `Down ${Math.abs(movement)}`
      : "No change";

  return `<small>${escapeHtml(label)} from ${escapeHtml(getRankingCompareLabel())}</small>`;
}

function normalizeRankingRows(rows = []) {
  return rows
    .map(normalizeRankingRow)
    .filter(Boolean)
    .sort(compareRankingRows)
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

function normalizeRankingRow(row) {
  const id = String(row?.ID || row?.Id || row?.id || "").trim();
  const nameKey = getRankingNameKey(row);
  const name = String(row?.[nameKey] || "").trim();

  if (!name) {
    return null;
  }

  return {
    id,
    name,
    nameKey,
    rank: parseRankingRank(row?.Rank),
    raw: row,
  };
}

function getRankingNameKey(row) {
  return Object.keys(row || {}).find((key) => {
    const normalizedKey = normalizeLookupName(key);
    return normalizedKey && normalizedKey !== "id" && normalizedKey !== "rank";
  }) || "Name";
}

function parseRankingRank(value) {
  const rank = Number(value);
  return Number.isInteger(rank) && rank > 0 ? rank : Number.MAX_SAFE_INTEGER;
}

function compareRankingRows(first, second) {
  return first.rank - second.rank ||
    first.name.localeCompare(second.name, undefined, { numeric: true }) ||
    String(first.id).localeCompare(String(second.id), undefined, { numeric: true });
}

function compareCalculatedRankingRows(first, second) {
  return Number(second.rating || RANKING_BASE_RATING) - Number(first.rating || RANKING_BASE_RATING) ||
    Number(second.wins || 0) - Number(first.wins || 0) ||
    Number(first.losses || 0) - Number(second.losses || 0) ||
    compareRankingRows(first, second);
}

function getRankingRows(kind = activeRankingKind) {
  if (kind === "todo") {
    return getTodoItems().map(normalizeTodoItem).filter(Boolean).map((item) => ({
      ...item,
      rank: item.order,
    })).sort(compareRankingRows);
  }
  if (kind === "want") {
    return getWantItems().map(normalizeWantItem).filter(Boolean).map((item) => ({ ...item, rank: item.order })).sort(compareRankingRows);
  }
  return [...(siteData.rankings?.[kind] || [])].sort(compareRankingRows);
}

function getDisplayedRankingRows(kind = activeRankingKind) {
  const filterExcludedRows = (rows) => shouldShowRankingExcluded
    ? rows
    : rows.filter((item) => !isRankingItemExcluded(kind, item.id));

  if (canEditActiveRankingManager() && activeRankingSnapshotId !== "current") {
    return getRankingSnapshotRows(kind, activeRankingSnapshotId);
  }

  if (activeRankingViewMode === "calculated") {
    const rows = getCalculatedRankingRows(kind);
    const activeRows = rows.filter((item) => !item.archived);
    const archivedRows = rows.filter((item) => item.archived);
    return filterExcludedRows(kind !== "mcu" && shouldShowRankingArchived ? [...activeRows, ...archivedRows] : activeRows)
      .map((item, index) => ({ ...item, displayRank: index + 1 }));
  }

  const rows = getManualRankingRowsWithElo(kind);
  const activeRows = rows.filter((item) => !item.archived);
  const archivedRows = rows.filter((item) => item.archived);
  return filterExcludedRows(kind !== "mcu" && shouldShowRankingArchived ? [...activeRows, ...archivedRows] : activeRows)
    .map((item, index) => ({ ...item, displayRank: index + 1 }));
}

function getRankingSnapshotRows(kind = activeRankingKind, snapshotId = activeRankingSnapshotId) {
  const snapshotItems = getRankingSnapshotItems(snapshotId);
  const rowsById = new Map(getRankingRows(kind).map((item) => [String(item.id), item]));

  return snapshotItems
    .map((item) => {
      const base = rowsById.get(String(item.itemId));
      return {
        ...(base || {
          id: item.itemId,
          name: item.itemName || `Item ${item.itemId}`,
          rank: item.rank,
        }),
        calculatedRank: item.rank,
        comparisons: item.comparisons,
        displayRank: item.rank,
        losses: item.losses,
        rating: item.rating,
        snapshotRank: item.rank,
        wins: item.wins,
      };
    })
    .sort((first, second) => Number(first.displayRank || 0) - Number(second.displayRank || 0));
}

function getRankingSnapshotItems(snapshotId) {
  return (siteData.rankingSnapshotItems || [])
    .filter((item) => String(item.snapshotId) === String(snapshotId))
    .sort((first, second) => Number(first.rank || 0) - Number(second.rank || 0));
}

function getRankingCompareRank(kind, itemId) {
  if (activeRankingCompareSnapshotId === "current") {
    const row = getCurrentRankingRowsForCompare(kind).find((entry) => String(entry.id) === String(itemId));
    return Number(row?.displayRank || row?.rank || 0);
  }

  const row = getRankingSnapshotRows(kind, activeRankingCompareSnapshotId)
    .find((entry) => String(entry.id) === String(itemId));
  return Number(row?.displayRank || row?.rank || 0);
}

function getCurrentRankingRowsForCompare(kind = activeRankingKind) {
  return activeRankingViewMode === "calculated"
    ? getCalculatedRankingRows(kind)
    : getManualRankingRowsWithElo(kind);
}

function getRankingCompareLabel() {
  if (activeRankingCompareSnapshotId === "current") {
    return "Current";
  }

  return formatRankingSnapshotOptionLabel(getRankingSnapshotById(activeRankingCompareSnapshotId));
}

function getRankingSnapshotsForKind(kind = activeRankingKind) {
  const type = normalizeLookupName(getRankingType(kind));
  return (siteData.rankingSnapshots || [])
    .filter((snapshot) => normalizeLookupName(snapshot.rankingType) === type)
    .sort((first, second) => {
      const firstTime = Date.parse(first.createdAt || "");
      const secondTime = Date.parse(second.createdAt || "");
      return (Number.isFinite(secondTime) ? secondTime : 0) - (Number.isFinite(firstTime) ? firstTime : 0) ||
        String(second.id).localeCompare(String(first.id), undefined, { numeric: true });
    });
}

function getRankingSnapshotById(snapshotId) {
  return (siteData.rankingSnapshots || []).find((snapshot) => String(snapshot.id) === String(snapshotId)) || null;
}

function formatRankingSnapshotOptionLabel(snapshot) {
  if (!snapshot) {
    return "Snapshot";
  }

  const date = new Date(snapshot.createdAt || "");

  if (Number.isNaN(date.getTime())) {
    return snapshot.label || snapshot.createdAt || `Snapshot ${snapshot.id}`;
  }

  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getRandomizedRankingRows(kind = activeRankingKind) {
  const rows = getRankingRows(kind).map((item) => {
    const elo = getSeededRankingEloForItem(getRankingType(kind), item.id);
    const seed = getRankingSeedForItem(kind, item.id);
    return {
      ...item,
      calculatedRank: item.rank,
      comparisons: elo.comparisons,
      losses: elo.losses,
      rating: elo.rating,
      seed,
      wins: elo.wins,
    };
  });
  const randomOrder = getRankingRandomOrder(kind, rows);

  return rows
    .map((item) => ({
      ...item,
      displayRank: randomOrder.get(item.id) || item.displayRank || item.rank,
    }))
    .sort((first, second) =>
      Number(first.displayRank || 0) - Number(second.displayRank || 0) ||
      String(first.id).localeCompare(String(second.id), undefined, { numeric: true })
    );
}

function getRankingRandomOrder(kind, rows) {
  siteData.rankingRandomOrder = siteData.rankingRandomOrder || {};
  const existing = siteData.rankingRandomOrder[kind] || {};
  const ids = rows.map((item) => String(item.id));
  const hasAllIds = ids.every((id) => existing[id]);
  const hasOnlyCurrentIds = Object.keys(existing).every((id) => ids.includes(id));

  if (hasAllIds && hasOnlyCurrentIds) {
    return new Map(Object.entries(existing));
  }

  siteData.rankingRandomOrder[kind] = Object.fromEntries(
    [...rows]
      .sort(() => Math.random() - 0.5)
      .map((item, index) => [String(item.id), index + 1])
  );

  return new Map(Object.entries(siteData.rankingRandomOrder[kind]));
}

function getSeededRankingEloForItem(rankingType, itemId) {
  const seed = getRankingSeedForItemByType(rankingType, itemId);
  const rating = Number(seed?.seedRating || RANKING_BASE_RATING);
  const managerId = getCurrentManagerId();

  return {
    comparisons: 0,
    itemId: String(itemId || "").trim(),
    lastChoiceId: "",
    losses: 0,
    managerId,
    rating: Number.isFinite(rating) ? rating : RANKING_BASE_RATING,
    rankingType,
    updatedAt: "",
    wins: 0,
  };
}

function getManualRankingRowsWithElo(kind = activeRankingKind) {
  const calculatedRanks = getCalculatedRankingRankMap(kind);

  return getRankingRows(kind).map((item) => {
    const elo = getRankingEloForItem(kind, item.id);
    const seed = getRankingSeedForItem(kind, item.id);
    return {
      ...item,
      calculatedRank: calculatedRanks.get(item.id) || item.rank,
      comparisons: elo.comparisons,
      displayRank: item.rank,
      losses: elo.losses,
      rating: elo.rating,
      seed,
      wins: elo.wins,
    };
  });
}

function getCalculatedRankingRows(kind = activeRankingKind) {
  return getRankingRows(kind)
    .map((item) => {
      const elo = getRankingEloForItem(kind, item.id);
      const seed = getRankingSeedForItem(kind, item.id);
      return {
        ...item,
        comparisons: elo.comparisons,
        losses: elo.losses,
        rating: elo.rating,
        seed,
        wins: elo.wins,
      };
    })
    .sort(compareCalculatedRankingRows)
    .map((item, index) => ({
      ...item,
      calculatedRank: index + 1,
      displayRank: index + 1,
    }));
}

function getCalculatedRankingRankMap(kind = activeRankingKind) {
  return new Map(getCalculatedRankingRows(kind).map((item) => [item.id, item.calculatedRank]));
}

function getRankingEloForItem(kind, itemId, managerId = ["todo", "want"].includes(kind) ? getCurrentManagerId() : getActiveRankingManagerId()) {
  const type = getRankingType(kind);
  const resolvedManagerId = kind === "want" ? "want" : managerId;
  const row = (siteData.rankingElo || []).find((entry) =>
    normalizeLookupName(entry.rankingType) === normalizeLookupName(type) &&
    String(entry.itemId) === String(itemId) &&
    String(entry.managerId || "") === String(resolvedManagerId)
  );
  const seed = getRankingSeedForItem(kind, itemId);
  const todoSeedRating = ["todo", "want"].includes(kind) ? getStandaloneImplicitSeedRating(kind, itemId) : RANKING_BASE_RATING;
  const rating = row
    ? Number(row.rating || RANKING_BASE_RATING)
    : Number(seed?.seedRating || todoSeedRating);
  const wins = Number(row?.wins || 0);
  const losses = Number(row?.losses || 0);

  return {
    comparisons: wins + losses,
    itemId: String(itemId || "").trim(),
    losses,
    managerId: resolvedManagerId,
    rating,
    rankingType: type,
    wins,
  };
}

function getTodoImplicitSeedRating(itemId) {
  const rows = getRankingRows("todo");
  const index = rows.findIndex((row) => String(row.id) === String(itemId));
  return calculateNormalizedRating(index >= 0 ? index + 1 : rows.length + 1, Math.max(rows.length, 1));
}

function getStandaloneImplicitSeedRating(kind, itemId) {
  const rows = getRankingRows(kind);
  const index = rows.findIndex((row) => String(row.id) === String(itemId));
  return calculateNormalizedRating(index >= 0 ? index + 1 : rows.length + 1, Math.max(rows.length, 1));
}

function renderRankingItemMeta(item) {
  const parts = getRankingItemMetaParts(item);

  if (!parts.length) {
    return "";
  }

  return `
    <span class="ranking-item-meta">
      ${parts.map((part) => `<span>${escapeHtml(part)}</span>`).join("")}
    </span>
  `;
}

function getRankingItemMetaParts(item) {
  const comparisonCount = Number(item.comparisons || 0);
  const statusLabel = comparisonCount <= 0
    ? "New"
    : comparisonCount < RANKING_PROVISIONAL_COMPARISONS
      ? "Provisional"
      : "";
  const scoreParts = [
    `${Math.round(item.rating || RANKING_BASE_RATING)} ELO`,
    `${item.wins || 0}-${item.losses || 0}`,
    statusLabel,
  ];

  if (!canEditActiveRankingManager()) {
    return scoreParts.filter(Boolean);
  }

  const diff = Number(item.rank || 0) - Number(item.calculatedRank || item.rank || 0);
  const diffLabel = diff ? `${diff > 0 ? "+" : ""}${diff} vs manual` : "No change";
  const rankLabel = activeRankingViewMode === "calculated"
    ? `Manual #${item.rank}`
    : `Calculated #${item.calculatedRank || item.rank}`;
  const seedLabel = item.seed?.seedRank
    ? `Seeded from #${item.seed.seedRank}`
    : "";

  return [
    ...scoreParts,
    rankLabel,
    diffLabel,
    seedLabel,
  ].filter(Boolean);
}

function getRankingSeedForItem(kind, itemId) {
  return getRankingSeedForItemByType(getRankingType(kind), itemId);
}

function getRankingSeedForItemByType(rankingType, itemId) {
  return (siteData.rankingSeeds || []).find((entry) =>
    normalizeLookupName(entry.rankingType) === normalizeLookupName(rankingType) &&
    String(entry.itemId) === String(itemId)
  ) || null;
}

function getRankingType(kind = activeRankingKind) {
  return RANKING_CONFIG[kind]?.type || kind;
}

function syncRankingControls() {
  const isOwner = canEditActiveRankingManager();

  if (rankingFilters) {
    rankingFilters.hidden = !shouldShowRankingFilters;
  }

  if (rankingFilterToggle) {
    rankingFilterToggle.setAttribute("aria-expanded", String(shouldShowRankingFilters));
    rankingFilterToggle.classList.toggle("is-active", shouldShowRankingFilters);
  }

  if (rankingMoreDataToggle) {
    rankingMoreDataToggle.checked = shouldShowRankingMoreData;
  }

  if (rankingShowExcludedToggle) {
    rankingShowExcludedToggle.checked = shouldShowRankingExcluded;
  }
  if (rankingShowArchivedToggle) rankingShowArchivedToggle.checked = shouldShowRankingArchived;
  if (rankingShowArchivedControl) rankingShowArchivedControl.hidden = activeRankingKind === "mcu" || !isOwner;
  if (rankingReadOnly) {
    const selected = getPortalManagerById(getActiveRankingManagerId());
    rankingReadOnly.textContent = `Viewing ${selected ? getManagerMeta(selected).displayName : "manager"} — read only`;
    rankingReadOnly.hidden = isOwner;
  }
  rankingOwnerOnlyElements?.forEach((element) => { element.hidden = !isOwner; });
  if (rankingAddButton) rankingAddButton.hidden = !isOwner || activeRankingKind === "mcu";
  if (rankingCompareButton) rankingCompareButton.hidden = !isOwner;

  syncRankingSnapshotControls();

  rankingViewModeButtons?.forEach((button) => {
    const isActive = button.dataset.rankingViewMode === activeRankingViewMode;
    const container = button.closest(".ranking-mode-toggle");

    if (container) {
      container.hidden = false;
    }

    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function syncRankingSnapshotControls() {
  const isOwner = canEditActiveRankingManager();
  const snapshots = getRankingSnapshotsForKind(activeRankingKind);
  const snapshotOptions = [
    `<option value="current">Current</option>`,
    ...snapshots.map((snapshot) =>
      `<option value="${escapeHtml(snapshot.id)}">${escapeHtml(formatRankingSnapshotOptionLabel(snapshot))}</option>`
    ),
  ];
  const compareOptions = [
    `<option value="">None</option>`,
    `<option value="current">Current</option>`,
    ...snapshots.map((snapshot) =>
      `<option value="${escapeHtml(snapshot.id)}">${escapeHtml(formatRankingSnapshotOptionLabel(snapshot))}</option>`
    ),
  ];

  if (rankingSnapshotSelect) {
    rankingSnapshotSelect.closest("[data-ranking-owner-only]")?.toggleAttribute("hidden", !isOwner);
    rankingSnapshotSelect.innerHTML = snapshotOptions.join("");
    if (!["current", ...snapshots.map((snapshot) => String(snapshot.id))].includes(String(activeRankingSnapshotId))) {
      activeRankingSnapshotId = "current";
    }
    rankingSnapshotSelect.value = activeRankingSnapshotId;
  }

  if (rankingCompareSelect) {
    rankingCompareSelect.closest("[data-ranking-owner-only]")?.toggleAttribute("hidden", !isOwner);
    rankingCompareSelect.innerHTML = compareOptions.join("");
    if (!["", "current", ...snapshots.map((snapshot) => String(snapshot.id))].includes(String(activeRankingCompareSnapshotId))) {
      activeRankingCompareSnapshotId = "";
    }
    rankingCompareSelect.value = activeRankingCompareSnapshotId;
  }

  if (rankingNormalizeButton) {
    rankingNormalizeButton.hidden = !isOwner;
    rankingNormalizeButton.disabled = activeRankingSnapshotId !== "current";
  }
}

function syncRankingTabs() {
  rankingTabs?.forEach((tab) => {
    const isActive = tab.dataset.rankingTab === activeRankingKind;
    tab.classList.toggle("is-active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });

  rankingPanels?.forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.rankingPanel === activeRankingKind);
  });

  if (rankingAddButton) {
    const config = RANKING_CONFIG[activeRankingKind];
    rankingAddButton.setAttribute("aria-label", config?.addLabel || "Add ranking item");
  }
}

function setActiveRankingKind(kind) {
  if (!RANKING_CONFIG[kind]) {
    return;
  }

  activeRankingKind = kind;
  syncRankingTabs();
  renderRankingsPage();
}

function openRankingItemDialog(kind = activeRankingKind, itemId = "") {
  if (!canEditActiveRankingManager() || kind === "mcu" || !rankingItemDialog || !RANKING_CONFIG[kind]) {
    return;
  }

  const rows = getRankingRows(kind);
  const config = RANKING_CONFIG[kind];
  const existing = rows.find((row) => String(row.id) === String(itemId));

  if (rankingItemDialogTitle) {
    rankingItemDialogTitle.textContent = existing ? `Edit ${config.itemLabel}` : config.addLabel;
  }

  if (rankingItemKind) {
    rankingItemKind.value = kind;
  }

  if (rankingItemId) {
    rankingItemId.value = existing?.id || "";
  }

  if (rankingItemName) {
    rankingItemName.value = existing?.name || "";
  }

  if (rankingItemRank) {
    rankingItemRank.max = String(rows.length + 1);
    rankingItemRank.value = String(existing?.rank || rows.length + 1);
  }

  setRankingItemStatus("");

  if (typeof rankingItemDialog.showModal === "function") {
    rankingItemDialog.showModal();
  } else {
    rankingItemDialog.setAttribute("open", "");
  }

  rankingItemName?.focus();
}

function closeRankingItemDialog() {
  if (!rankingItemDialog) {
    return;
  }

  if (typeof rankingItemDialog.close === "function") {
    rankingItemDialog.close();
  } else {
    rankingItemDialog.removeAttribute("open");
  }
}

function openRankingNormalizeDialog(kind = activeRankingKind) {
  const canNormalize = ["todo", "want"].includes(kind) ? isCurrentManagerAdmin() : canEditActiveRankingManager();
  if (!canNormalize || !rankingNormalizeDialog) {
    return;
  }

  if (rankingNormalizeReason) {
    rankingNormalizeReason.value = kind === "todo" ? "Normalized calculated To Do order" : kind === "want" ? "Normalized calculated Want order" : "Normalized calculated rankings";
  }
  normalizingRankingKind = kind;

  setRankingNormalizeStatus("");

  if (typeof rankingNormalizeDialog.showModal === "function") {
    rankingNormalizeDialog.showModal();
  } else {
    rankingNormalizeDialog.setAttribute("open", "");
  }
}

function closeRankingNormalizeDialog() {
  normalizingRankingKind = "";
  if (!rankingNormalizeDialog) {
    return;
  }

  if (typeof rankingNormalizeDialog.close === "function") {
    rankingNormalizeDialog.close();
  } else {
    rankingNormalizeDialog.removeAttribute("open");
  }
}

async function normalizeActiveRanking() {
  const kind = normalizingRankingKind || activeRankingKind;
  const isStandalone = ["todo", "want"].includes(kind);
  if (isStandalone ? !isCurrentManagerAdmin() : !canEditActiveRankingManager()) {
    return;
  }
  const rows = getCalculatedRankingRows(kind).filter((item) => !item.archived);

  if (!rows.length) {
    setRankingNormalizeStatus("There are no rankings to normalize.", true);
    return;
  }

  if (!isStandalone) {
    setRankingNormalizeStatus("Saving snapshot and normalizing...");
    try {
      const response = await rankingApiRequest(rankingWritePath(kind, "/normalize"), {
        method: "POST",
        body: JSON.stringify({
          itemIds: rows.map((item) => item.id),
          label: new Date().toISOString(),
          reason: String(rankingNormalizeReason?.value || "Normalized calculated rankings").trim(),
          revision: Number(siteData.rankingRevisions?.[kind] || 0),
        }),
      });
      activeRankingSnapshotId = "current";
      activeRankingCompareSnapshotId = response.snapshotId || "";
      await reloadActiveRankings();
      closeRankingNormalizeDialog();
    } catch (error) {
      setRankingNormalizeStatus(error.message, true);
      if (error.status === 409) await reloadActiveRankings();
    }
    return;
  }

  const createdAt = new Date().toISOString();
  const items = rows.map((item, index) => ({
    comparisons: Number(item.comparisons || 0),
    id: item.id,
    itemId: item.id,
    itemName: item.name,
    losses: Number(item.losses || 0),
    normalizedRating: calculateNormalizedRating(index + 1, rows.length),
    rank: index + 1,
    rating: Math.round(item.rating || RANKING_BASE_RATING),
    wins: Number(item.wins || 0),
  }));
  const rawSnapshotId = isStandalone ? String(Date.now()) : createRankingSnapshotId();
  const snapshot = {
    createdAt,
    id: isStandalone ? `${kind}-${rawSnapshotId}` : rawSnapshotId,
    label: formatRankingSnapshotOptionLabel({ createdAt }),
    managerId: kind === "want" ? "want" : getCurrentManagerId(),
    rankingType: getRankingType(kind),
    reason: String(rankingNormalizeReason?.value || "Normalized calculated rankings").trim(),
    source: "calculated",
  };

  setRankingNormalizeStatus("Saving snapshot and normalizing...");
  siteData.rankingSnapshots = [snapshot, ...(siteData.rankingSnapshots || [])];
  siteData.rankingSnapshotItems = [
    ...(siteData.rankingSnapshotItems || []),
    ...items.map((item) => ({
      comparisons: item.comparisons,
      itemId: item.id,
      itemName: item.itemName,
      losses: item.losses,
      rank: item.rank,
      rating: item.rating,
      snapshotId: snapshot.id,
      wins: item.wins,
    })),
  ];
  siteData.rankingElo = [
    ...(siteData.rankingElo || [])
      .filter((row) =>
        normalizeLookupName(row.rankingType) !== normalizeLookupName(snapshot.rankingType) ||
        String(row.managerId || "") !== String(snapshot.managerId || "")
      ),
    ...items.map((item) => ({
      itemId: item.id,
      lastChoiceId: "",
      losses: 0,
      managerId: snapshot.managerId,
      rating: item.normalizedRating,
      rankingType: snapshot.rankingType,
      updatedAt: createdAt,
      wins: 0,
    })),
  ];

  submitRankingPayload({
    action: kind === "todo" ? "normalizeTodo" : kind === "want" ? "normalizeWant" : "normalizeRanking",
    normalization: {
      createdAt,
      items,
      label: snapshot.label,
      managerId: snapshot.managerId,
      rankingType: snapshot.rankingType,
      reason: snapshot.reason,
      snapshotId: isStandalone ? rawSnapshotId : snapshot.id,
      source: snapshot.source,
    },
  });
  if (kind === "todo") {
    activeTodoSnapshotId = "current";
    activeTodoCompareSnapshotId = snapshot.id;
    renderTodoList();
  } else if (kind === "want") {
    activeWantSnapshotId = "current";
    activeWantCompareSnapshotId = snapshot.id;
    renderWantList();
  } else {
    activeRankingSnapshotId = "current";
    activeRankingCompareSnapshotId = snapshot.id;
    renderRankingLists();
  }
  closeRankingNormalizeDialog();
}

function calculateNormalizedRating(rank, total) {
  const midpoint = (Number(total || 0) + 1) / 2;
  const step = 8;
  return Math.round(RANKING_BASE_RATING + ((midpoint - Number(rank || 0)) * step));
}

function createRankingSnapshotId() {
  const nextId = (siteData.rankingSnapshots || [])
    .map((snapshot) => Number(String(snapshot.id || "").trim()))
    .filter((id) => Number.isInteger(id) && id > 0)
    .reduce((maxId, id) => Math.max(maxId, id), 0) + 1;

  return String(nextId);
}

async function saveRankingItemFromForm() {
  const kind = String(rankingItemKind?.value || activeRankingKind).trim();
  if (!RANKING_CONFIG[kind] || kind === "mcu" || !canEditActiveRankingManager()) {
    setRankingItemStatus("Choose a ranking list.", true);
    return;
  }

  const name = String(rankingItemName?.value || "").trim();

  if (!name) {
    setRankingItemStatus("Name is required.", true);
    return;
  }

  const itemId = String(rankingItemId?.value || "").trim();
  const rank = clampRankingRank(rankingItemRank?.value, getRankingRows(kind).length + 1);
  setRankingItemStatus(itemId ? "Saving changes..." : "Adding item...");
  try {
    await rankingApiRequest(rankingWritePath(kind, itemId ? `/items/${encodeURIComponent(itemId)}` : "/items"), {
      method: itemId ? "PATCH" : "POST",
      body: JSON.stringify({ name, manualRank: rank, revision: Number(siteData.rankingRevisions?.[kind] || 0) }),
    });
    await reloadActiveRankings();
    closeRankingItemDialog();
  } catch (error) {
    setRankingItemStatus(error.message, true);
    if (error.status === 409) await reloadActiveRankings();
  }
}

async function setRankingItemArchived(kind, itemId, archived) {
  if (!canEditActiveRankingManager() || kind === "mcu") return;
  const item = getRankingRows(kind).find((row) => String(row.id) === String(itemId));
  if (!item) return;
  setRankingItemStatus(`${archived ? "Archiving" : "Restoring"} ${item.name}...`);
  try {
    await rankingApiRequest(rankingWritePath(kind, `/items/${encodeURIComponent(itemId)}`), {
      method: "PATCH",
      body: JSON.stringify({ archived, revision: Number(siteData.rankingRevisions?.[kind] || 0) }),
    });
    await reloadActiveRankings();
    setRankingItemStatus(`${item.name} ${archived ? "archived" : "restored"}.`);
  } catch (error) {
    setRankingItemStatus(error.message, true);
    if (error.status === 409) await reloadActiveRankings();
  }
}

function createRankingSeedForNewItem(kind, itemId, seedRank) {
  return {
    itemId: String(itemId || "").trim(),
    rankingType: getRankingType(kind),
    reason: "Initial rating from manual placement",
    seedRank: Number(seedRank || 0),
    seedRating: calculateSeedRatingForRank(kind, seedRank),
    seededAt: new Date().toISOString(),
  };
}

function calculateSeedRatingForRank(kind, seedRank) {
  const rows = getCalculatedRankingRows(kind)
    .filter((item) => Number(item.comparisons || 0) > 0 || item.seed)
    .sort((first, second) => Number(first.displayRank || first.rank) - Number(second.displayRank || second.rank));
  const rank = clampRankingRank(seedRank, Math.max(rows.length + 1, 1));
  const neighbors = rows
    .filter((item) => Math.abs(Number(item.displayRank || item.rank || 0) - rank) <= 2)
    .map((item) => Number(item.rating))
    .filter(Number.isFinite);

  if (neighbors.length > 0) {
    return Math.round(neighbors.reduce((total, rating) => total + rating, 0) / neighbors.length);
  }

  const ratingStep = 12;
  const midpoint = Math.max((getRankingRows(kind).length + 1) / 2, 1);
  return Math.round(RANKING_BASE_RATING + ((midpoint - rank) * ratingStep));
}

function upsertRankingSeed(seed) {
  if (!seed?.rankingType || !seed?.itemId) {
    return;
  }

  const rows = siteData.rankingSeeds || [];
  const index = rows.findIndex((entry) =>
    normalizeLookupName(entry.rankingType) === normalizeLookupName(seed.rankingType) &&
    String(entry.itemId) === String(seed.itemId)
  );

  if (index >= 0) {
    rows[index] = seed;
  } else {
    rows.push(seed);
  }

  siteData.rankingSeeds = rows;
}

function insertRankingItem(rows, item, rank) {
  const nextRows = rows.filter((row) => row.id !== item.id);
  nextRows.splice(rank - 1, 0, item);
  return normalizeRankingOrder(nextRows);
}

function normalizeRankingOrder(rows = []) {
  return rows.map((row, index) => ({ ...row, rank: index + 1 }));
}

function clampRankingRank(value, maxRank) {
  const rank = Number(value);

  if (!Number.isInteger(rank)) {
    return maxRank;
  }

  return Math.min(Math.max(rank, 1), Math.max(maxRank, 1));
}

function createRankingItemId(kind) {
  const nextId = getRankingRows(kind)
    .map((row) => Number(String(row.id || "").trim()))
    .filter((id) => Number.isInteger(id) && id > 0)
    .reduce((maxId, id) => Math.max(maxId, id), 0) + 1;

  return String(nextId);
}

function moveRankingItem(kind, draggedId, targetId, options = {}) {
  if (!canEditActiveRankingManager() || !draggedId || !targetId || draggedId === targetId) {
    return false;
  }

  const rows = getRankingRows(kind);
  const fromIndex = rows.findIndex((row) => row.id === draggedId);
  const toIndex = rows.findIndex((row) => row.id === targetId);

  if (fromIndex < 0 || toIndex < 0) {
    return false;
  }

  const [item] = rows.splice(fromIndex, 1);
  rows.splice(toIndex, 0, item);
  siteData.rankings[kind] = normalizeRankingOrder(rows);
  renderRankingList(kind);
  if (options.shouldSubmit !== false) {
    submitRankingOrder(kind);
  }

  return true;
}

function getRankingItemElement(kind, itemId) {
  return [...document.querySelectorAll("[data-ranking-id]")]
    .find((item) =>
      item.getAttribute("data-ranking-kind") === kind &&
      item.getAttribute("data-ranking-id") === itemId
    ) || null;
}

async function openRankingBattleDialog(kind = activeRankingKind) {
  if (!rankingBattleDialog || !(RANKING_CONFIG[kind] || ["todo", "want"].includes(kind))) {
    return;
  }

  activeRankingBattle = null;
  if (rankingBattleDialog.parentElement !== document.body) {
    document.body.append(rankingBattleDialog);
  }
  if (!["todo", "want"].includes(kind)) {
    await ensureRankingAssetManifest();
  }
  renderNextRankingBattle(kind);

  if (typeof rankingBattleDialog.showModal === "function") {
    rankingBattleDialog.showModal();
  } else {
    rankingBattleDialog.setAttribute("open", "");
  }
}

function closeRankingBattleDialog() {
  activeRankingBattle = null;

  if (!rankingBattleDialog) {
    return;
  }

  if (typeof rankingBattleDialog.close === "function") {
    rankingBattleDialog.close();
  } else {
    rankingBattleDialog.removeAttribute("open");
  }
}

function renderNextRankingBattle(kind = activeRankingKind) {
  const pair = createRankingBattlePair(kind);
  activeRankingBattle = pair;

  if (rankingBattleTitle) {
    rankingBattleTitle.textContent = pair
      ? `Compare ${(RANKING_CONFIG[kind] || (kind === "want" ? WANT_RANKING_CONFIG : TODO_RANKING_CONFIG)).itemLabel}s`
      : "Compare Rankings";
  }

  setRankingBattleStatus(pair ? "Choose the one you prefer." : "Add at least two ranking items first.");

  if (!rankingBattleOptions) {
    return;
  }

  if (!pair) {
    rankingBattleOptions.innerHTML = "";
    return;
  }

  rankingBattleOptions.innerHTML = [pair.itemA, pair.itemB].map((item) => `
    <article class="ranking-battle-option">
      ${renderRankingBattleImage(kind, item)}
      <strong>${escapeHtml(item.name)}</strong>
      ${renderRankingBattleExclusionAction(kind, item)}
    </article>
  `).join("");
}

function renderRankingBattleExclusionAction(kind, item) {
  if (!siteData.managerSession) {
    return "";
  }

  if (["todo", "want"].includes(kind)) {
    return `<span class="ranking-battle-actions"><button class="action-button ranking-battle-pick-button" type="button" data-ranking-battle-pick="${escapeHtml(item.id)}">Pick</button></span>`;
  }

  return `
    <span class="ranking-battle-actions">
      <button class="ranking-inline-action" type="button" data-ranking-battle-exclude="${escapeHtml(item.id)}" data-ranking-kind="${escapeHtml(kind)}">
        Exclude
      </button>
      <button class="action-button ranking-battle-pick-button" type="button" data-ranking-battle-pick="${escapeHtml(item.id)}">
        Pick
      </button>
    </span>
  `;
}

function renderRankingBattleImage(kind, item) {
  const imagePath = kind === "todo" ? getTodoImageUrl(item) : kind === "want" ? String(item?.imageUrl || "").trim() : getRandomRankingAssetPath(kind, item?.id);
  const imageMarkup = imagePath
    ? `<img src="${escapeHtml(encodeURI(imagePath))}" alt="" loading="lazy" decoding="async">`
    : "";

  return `
    <span class="ranking-battle-image-frame${imagePath ? "" : " is-empty"}" aria-hidden="true">
      ${imageMarkup}
    </span>
  `;
}

async function ensureRankingAssetManifest() {
  if (siteData.rankingAssets) {
    return siteData.rankingAssets;
  }

  if (!rankingAssetManifestPromise) {
    rankingAssetManifestPromise = loadJson("data/ranking-assets.json")
      .then((manifest) => {
        siteData.rankingAssets = manifest && typeof manifest === "object" ? manifest : {};
        return siteData.rankingAssets;
      })
      .catch(() => {
        siteData.rankingAssets = {};
        return siteData.rankingAssets;
      });
  }

  return rankingAssetManifestPromise;
}

function getRandomRankingAssetPath(kind, itemId) {
  const images = siteData.rankingAssets?.[kind]?.[String(itemId || "")];

  if (!Array.isArray(images) || images.length === 0) {
    return "";
  }

  return images[Math.floor(Math.random() * images.length)];
}

function createRankingBattlePair(kind = activeRankingKind) {
  const rows = (["todo", "want"].includes(kind)
    ? (kind === "todo" ? getTodoCompareItems() : getVisibleWantItems()).map((item) => {
      const elo = getRankingEloForItem(kind, item.id);
      return { ...item, rank: item.order, rating: elo.rating, wins: elo.wins, losses: elo.losses, comparisons: elo.comparisons };
    })
    : getManualRankingRowsWithElo(kind))
    .filter((item) => !item.archived && !isRankingItemExcluded(kind, item.id));

  if (rows.length < 2) {
    return null;
  }

  const managerScoped = !["todo", "want"].includes(kind) || !isCurrentManagerAdmin();
  const comparisonCounts = getRankingComparisonCounts(kind, { managerScoped });
  const pairCounts = getRankingPairCounts(kind, { managerScoped });
  const pairCandidates = createRankingPairCandidates(rows, comparisonCounts, pairCounts);
  const [itemA, itemB] = chooseBalancedRandomRankingPair(pairCandidates);

  if (!itemA || !itemB) {
    return null;
  }

  const [displayItemA, displayItemB] = Math.random() < 0.5
    ? [itemA, itemB]
    : [itemB, itemA];

  return {
    itemA: displayItemA,
    itemB: displayItemB,
    kind,
    rankingType: getRankingType(kind),
  };
}

function getTodoCompareItems() {
  const items = getTodoItems().map(normalizeTodoItem).filter(Boolean);
  const itemsById = getTodoItemMap(items);
  return items
    .filter(isTodoDefaultListItem)
    .filter((item) => !hasActiveTodoParent(item, itemsById));
}

function getRankingComparisonCounts(kind = activeRankingKind, options = {}) {
  const managerId = String(options.managerId || getCurrentManagerId()).trim();
  return new Map(
    getRankingRows(kind).map((item) => {
      const elo = getRankingEloForItem(kind, item.id, managerId);
      return [String(item.id), Number(elo.comparisons || 0)];
    })
  );
}

function createRankingSnapshotForKind(kind, createdAt, reason, source) {
  return {
    createdAt,
    id: createRankingSnapshotId(),
    label: formatRankingSnapshotOptionLabel({ createdAt }),
    managerId: getCurrentManagerId(),
    rankingType: getRankingType(kind),
    reason,
    source,
  };
}

function createRankingSnapshotItemsFromRows(rows = []) {
  return rows.map((item, index) => ({
    comparisons: Number(item.comparisons || 0),
    id: item.id,
    itemId: item.id,
    itemName: item.name,
    losses: Number(item.losses || 0),
    rank: Number(item.displayRank || item.rank || index + 1),
    rating: Math.round(item.rating || RANKING_BASE_RATING),
    wins: Number(item.wins || 0),
  }));
}

function createNormalizedRankingItemsAfterAdd(kind, item, rank) {
  const calculatedRows = getCalculatedRankingRows(kind)
    .filter((row) => String(row.id) !== String(item.id));
  const insertedRows = [...calculatedRows];
  insertedRows.splice(clampRankingRank(rank, insertedRows.length + 1) - 1, 0, {
    ...item,
    comparisons: 0,
    losses: 0,
    rating: calculateSeedRatingForRank(kind, rank),
    wins: 0,
  });

  return insertedRows.map((row, index) => ({
    comparisons: Number(row.comparisons || 0),
    id: row.id,
    itemId: row.id,
    itemName: row.name,
    losses: Number(row.losses || 0),
    normalizedRating: calculateNormalizedRating(index + 1, insertedRows.length),
    rank: index + 1,
    rating: Math.round(row.rating || RANKING_BASE_RATING),
    wins: Number(row.wins || 0),
  }));
}

function applyRankingNormalizationLocally(kind, snapshot, snapshotItems, normalizedItems, createdAt) {
  if (!snapshot) {
    return;
  }

  siteData.rankingSnapshots = [snapshot, ...(siteData.rankingSnapshots || [])];
  siteData.rankingSnapshotItems = [
    ...(siteData.rankingSnapshotItems || []),
    ...snapshotItems.map((item) => ({
      comparisons: item.comparisons,
      itemId: item.itemId,
      itemName: item.itemName,
      losses: item.losses,
      rank: item.rank,
      rating: item.rating,
      snapshotId: snapshot.id,
      wins: item.wins,
    })),
  ];
  siteData.rankingElo = [
    ...(siteData.rankingElo || [])
      .filter((row) =>
        normalizeLookupName(row.rankingType) !== normalizeLookupName(snapshot.rankingType) ||
        String(row.managerId || "") !== String(snapshot.managerId || "")
      ),
    ...normalizedItems.map((item) => ({
      itemId: item.itemId,
      lastChoiceId: "",
      losses: 0,
      managerId: snapshot.managerId,
      rating: item.normalizedRating,
      rankingType: getRankingType(kind),
      updatedAt: createdAt,
      wins: 0,
    })),
  ];
  activeRankingSnapshotId = "current";
  activeRankingCompareSnapshotId = snapshot.id;
}

function getRankingPairCounts(kind = activeRankingKind, options = {}) {
  const rankingType = normalizeLookupName(getRankingType(kind));
  const managerId = String(options.managerId || getCurrentManagerId()).trim();
  const counts = new Map();

  (siteData.rankingPairCounts || []).forEach((entry) => {
    if (normalizeLookupName(entry.rankingType) !== rankingType || String(entry.managerId || "") !== managerId) return;
    const pairKey = getRankingPairKey(entry.itemAId, entry.itemBId);
    if (pairKey) counts.set(pairKey, (counts.get(pairKey) || 0) + Number(entry.count || 0));
  });

  (siteData.rankingChoices || []).forEach((choice) => {
    if (normalizeLookupName(choice.rankingType) !== rankingType) {
      return;
    }

    if (managerId && String(choice.managerId || "") !== managerId) {
      return;
    }

    const pairKey = getRankingPairKey(choice.itemAId || choice.winnerId, choice.itemBId || choice.loserId);

    if (!pairKey) {
      return;
    }

    counts.set(pairKey, (counts.get(pairKey) || 0) + 1);
  });

  return counts;
}

function createRankingPairCandidates(rows, comparisonCounts, pairCounts) {
  const candidates = [];

  rows.forEach((first, firstIndex) => {
    rows.slice(firstIndex + 1).forEach((second) => {
      const firstCount = comparisonCounts.get(first.id) || 0;
      const secondCount = comparisonCounts.get(second.id) || 0;
      const pairCount = pairCounts.get(getRankingPairKey(first.id, second.id)) || 0;

      candidates.push({
        first,
        firstCount,
        pairCount,
        second,
        secondCount,
      });
    });
  });

  return candidates;
}

function chooseBalancedRandomRankingPair(candidates) {
  return chooseRankingPairByScore(candidates, (candidate) =>
    (candidate.pairCount * 30) +
    ((candidate.firstCount + candidate.secondCount) * 4) +
    (Math.min(candidate.firstCount, candidate.secondCount) * 6) +
    (Math.random() * 90)
  );
}

function chooseRankingPairByScore(candidates, getScore) {
  const candidate = candidates
    .map((entry) => ({ entry, score: getScore(entry) }))
    .sort((first, second) => first.score - second.score)[0]?.entry;

  return [candidate?.first, candidate?.second];
}

function getRankingPairKey(firstId, secondId) {
  const ids = [String(firstId || "").trim(), String(secondId || "").trim()].filter(Boolean).sort();
  return ids.length === 2 ? ids.join("::") : "";
}

function getCurrentManagerId() {
  return String(siteData.managerSession?.managerId || "").trim();
}

function getRankingExclusion(kind, itemId, managerId = ["todo", "want"].includes(kind) ? getCurrentManagerId() : getActiveRankingManagerId()) {
  const rankingType = normalizeLookupName(getRankingType(kind));

  return (siteData.rankingExclusions || []).find((entry) =>
    normalizeLookupName(entry.rankingType) === rankingType &&
    String(entry.itemId) === String(itemId) &&
    String(entry.managerId) === String(managerId)
  ) || null;
}

function isRankingItemExcluded(kind, itemId, managerId = ["todo", "want"].includes(kind) ? getCurrentManagerId() : getActiveRankingManagerId()) {
  return Boolean(getRankingExclusion(kind, itemId, managerId)?.excluded);
}

async function setRankingItemExcluded(kind, itemId, excluded) {
  if (!["todo", "want"].includes(kind)) {
    if (!canEditActiveRankingManager()) return;
    const item = getRankingRows(kind).find((row) => String(row.id) === String(itemId));
    if (!item) return;
    setRankingItemStatus(`Saving ${item.name}...`);
    try {
      await rankingApiRequest(rankingWritePath(kind, `/exclusions/${encodeURIComponent(itemId)}`), {
        method: "PUT",
        body: JSON.stringify({ excluded: Boolean(excluded), revision: Number(siteData.rankingRevisions?.[kind] || 0) }),
      });
      await reloadActiveRankings();
      setRankingItemStatus(`${item.name} ${excluded ? "excluded" : "included"}.`);
      if (activeRankingBattle?.kind === kind) renderNextRankingBattle(kind);
    } catch (error) {
      setRankingItemStatus(error.message, true);
      if (error.status === 409) await reloadActiveRankings();
    }
    return;
  }
  const managerId = getCurrentManagerId();
  const item = getRankingRows(kind).find((row) => String(row.id) === String(itemId));

  if (!managerId || !item) {
    return;
  }

  const rankingType = getRankingType(kind);
  const updatedAt = new Date().toISOString();
  const existing = getRankingExclusion(kind, itemId, managerId);
  const exclusion = {
    excluded: Boolean(excluded),
    id: existing?.id || `pending-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    itemId: item.id,
    managerId,
    rankingType,
    updatedAt,
  };

  siteData.rankingExclusions = [
    ...(siteData.rankingExclusions || []).filter((entry) =>
      !(normalizeLookupName(entry.rankingType) === normalizeLookupName(rankingType) &&
        String(entry.itemId) === String(item.id) &&
        String(entry.managerId) === String(managerId))
    ),
    exclusion,
  ];

  renderRankingLists();
  setRankingItemStatus(`${item.name} ${excluded ? "excluded" : "included"}. Saving...`);

  try {
    const response = await loadNextDataEndpoint("saveRankingExclusion", {
      excluded: exclusion.excluded ? "TRUE" : "FALSE",
      itemId: exclusion.itemId,
      managerId: exclusion.managerId,
      rankingType: exclusion.rankingType,
      updatedAt: exclusion.updatedAt,
      ...(existing?.id ? { id: existing.id } : {}),
    });
    const saved = normalizeRankingExclusions(response.exclusion ? [response.exclusion] : [])[0];

    if (saved) {
      siteData.rankingExclusions = [
        ...(siteData.rankingExclusions || []).filter((entry) =>
          !(normalizeLookupName(entry.rankingType) === normalizeLookupName(rankingType) &&
            String(entry.itemId) === String(item.id) &&
            String(entry.managerId) === String(managerId))
        ),
        saved,
      ];
    }

    setRankingItemStatus(`${item.name} ${excluded ? "excluded" : "included"}.`);
  } catch (error) {
    siteData.rankingExclusions = (siteData.rankingExclusions || []).filter((entry) =>
      !(normalizeLookupName(entry.rankingType) === normalizeLookupName(rankingType) &&
        String(entry.itemId) === String(item.id) &&
        String(entry.managerId) === String(managerId))
    );
    if (existing) {
      siteData.rankingExclusions = [...siteData.rankingExclusions, existing];
    }
    recordDiagnostic("ranking exclusion failed to save", error);
    setRankingItemStatus(`Unable to save ${item.name}: ${error.message}`, true);
  }

  renderRankingLists();

  if (activeRankingBattle?.kind === kind && activeRankingBattle && [activeRankingBattle.itemA, activeRankingBattle.itemB].some((battleItem) => String(battleItem.id) === String(itemId))) {
    setRankingBattleStatus(`${item.name} ${excluded ? "excluded" : "included"}.`);
    renderNextRankingBattle(kind);
  }
}

function createRankingExclusionId() {
  const nextId = (siteData.rankingExclusions || [])
    .map((entry) => Number(String(entry.id || "").trim()))
    .filter((id) => Number.isInteger(id) && id > 0)
    .reduce((maxId, id) => Math.max(maxId, id), 0) + 1;

  return String(nextId);
}

async function chooseRankingBattleWinner(winnerId) {
  const battle = activeRankingBattle;

  if (!battle || !winnerId) {
    return;
  }

  const winner = [battle.itemA, battle.itemB].find((item) => String(item.id) === String(winnerId));
  const loser = [battle.itemA, battle.itemB].find((item) => String(item.id) !== String(winnerId));

  if (!winner || !loser) {
    return;
  }

  const choice = {
    createdAt: new Date().toISOString(),
    id: createRankingChoiceId(),
    itemAId: battle.itemA.id,
    itemBId: battle.itemB.id,
    loserId: loser.id,
    managerId: String(siteData.managerSession?.managerId || ""),
    rankingType: battle.rankingType,
    winnerId: winner.id,
  };

  if (!["todo", "want"].includes(battle.kind)) {
    if (!canEditActiveRankingManager()) return;
    setRankingBattleStatus(`Saving ${winner.name}...`);
    try {
      await rankingApiRequest(rankingWritePath(battle.kind, "/choices"), {
        method: "POST",
        body: JSON.stringify({ winnerId: winner.id, loserId: loser.id, revision: Number(siteData.rankingRevisions?.[battle.kind] || 0) }),
      });
      await reloadActiveRankings();
      setRankingBattleStatus(`${winner.name} saved.`);
      renderNextRankingBattle(battle.kind);
    } catch (error) {
      setRankingBattleStatus(error.message, true);
      if (error.status === 409) await reloadActiveRankings();
    }
    return;
  }

  applyRankingChoiceToElo(choice);
  submitRankingPayload({
    action: battle.kind === "todo" ? "saveTodoChoice" : battle.kind === "want" ? "saveWantChoice" : "saveRankingChoice",
    choice,
  });
  if (battle.kind === "todo") renderTodoList();
  else if (battle.kind === "want") renderWantList();
  else renderRankingLists();
  setRankingBattleStatus(`${winner.name} saved.`);
  renderNextRankingBattle(battle.kind);
}

function createRankingChoiceId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function applyRankingChoiceToElo(choice) {
  const winner = getRankingEloForItemByType(choice.rankingType, choice.winnerId);
  const loser = getRankingEloForItemByType(choice.rankingType, choice.loserId);
  const expectedWinner = getRankingExpectedScore(winner.rating, loser.rating);
  const expectedLoser = getRankingExpectedScore(loser.rating, winner.rating);
  const winnerKFactor = getRankingKFactor(winner);
  const loserKFactor = getRankingKFactor(loser);
  const nextWinner = {
    ...winner,
    lastChoiceId: choice.id,
    rating: Math.round(winner.rating + winnerKFactor * (1 - expectedWinner)),
    updatedAt: choice.createdAt,
    wins: winner.wins + 1,
  };
  const nextLoser = {
    ...loser,
    lastChoiceId: choice.id,
    losses: loser.losses + 1,
    rating: Math.round(loser.rating + loserKFactor * (0 - expectedLoser)),
    updatedAt: choice.createdAt,
  };

  upsertRankingEloRow(nextWinner);
  upsertRankingEloRow(nextLoser);
  siteData.rankingChoices = [...(siteData.rankingChoices || []), choice];
}

function getRankingEloForItemByType(rankingType, itemId, managerId = getCurrentManagerId()) {
  const normalizedType = normalizeLookupName(rankingType);
  const resolvedManagerId = normalizedType === "want" ? "want" : managerId;
  const row = (siteData.rankingElo || []).find((entry) =>
    normalizeLookupName(entry.rankingType) === normalizeLookupName(rankingType) &&
    String(entry.itemId) === String(itemId) &&
    String(entry.managerId || "") === String(resolvedManagerId)
  );
  const seed = getRankingSeedForItemByType(rankingType, itemId);
  const fallbackRating = ["todo", "want"].includes(normalizedType) ? getStandaloneImplicitSeedRating(normalizedType, itemId) : RANKING_BASE_RATING;
  const rating = row
    ? Number(row.rating || RANKING_BASE_RATING)
    : Number(seed?.seedRating || fallbackRating);
  const wins = Number(row?.wins || 0);
  const losses = Number(row?.losses || 0);

  return {
    comparisons: wins + losses,
    id: row?.id || "",
    itemId: String(itemId || "").trim(),
    lastChoiceId: row?.lastChoiceId || "",
    losses,
    managerId: resolvedManagerId,
    rating,
    rankingType,
    updatedAt: row?.updatedAt || "",
    wins,
  };
}

function upsertRankingEloRow(row) {
  const rows = siteData.rankingElo || [];
  const index = rows.findIndex((entry) =>
    normalizeLookupName(entry.rankingType) === normalizeLookupName(row.rankingType) &&
    String(entry.itemId) === String(row.itemId) &&
    String(entry.managerId || "") === String(row.managerId || "")
  );

  if (index >= 0) {
    rows[index] = row;
  } else {
    rows.push(row);
  }

  siteData.rankingElo = rows;
}

function getRankingExpectedScore(rating, opponentRating) {
  return 1 / (1 + (10 ** ((Number(opponentRating) - Number(rating)) / 400)));
}

function getRankingKFactor(item) {
  return Number(item?.comparisons || 0) < RANKING_PROVISIONAL_COMPARISONS
    ? RANKING_PROVISIONAL_K_FACTOR
    : RANKING_ELO_K_FACTOR;
}

function setRankingBattleStatus(message, isError = false) {
  if (!rankingBattleStatus) {
    return;
  }

  rankingBattleStatus.textContent = message;
  rankingBattleStatus.classList.toggle("is-error", isError);
}

async function submitRankingOrder(kind) {
  if (!["todo", "want"].includes(kind)) {
    if (!canEditActiveRankingManager()) return;
    setRankingItemStatus("Saving ranking order...");
    try {
      const response = await rankingApiRequest(rankingWritePath(kind, "/order"), {
        method: "PUT",
        body: JSON.stringify({
          itemIds: getRankingRows(kind).filter((item) => !item.archived).map((item) => item.id),
          revision: Number(siteData.rankingRevisions?.[kind] || 0),
        }),
      });
      siteData.rankingRevisions[kind] = response.revision;
      setRankingItemStatus("Ranking order saved.");
    } catch (error) {
      setRankingItemStatus(error.message, true);
      await reloadActiveRankings();
    }
    return;
  }
  const config = RANKING_CONFIG[kind];
  const items = getRankingRows(kind).map((item) => ({
    ID: item.id,
    Name: item.name,
    Rank: item.rank,
  }));

  submitRankingPayload({
    action: "saveRankingOrder",
    items,
    ranking: kind,
    sheetName: config.sheetName,
  });
}

function submitRankingPayload(payload) {
  return submitAppsScriptPayload(payload, {
    endpoint: NEXT_DATA_ENDPOINT,
    fallback: submitRankingPayloadWithForm,
    missingMessage: "Ranking data endpoint is not configured yet.",
    status: setRankingItemStatus,
    submitLabel: "ranking data",
  });
}

function submitRankingPayloadWithForm(payload) {
  const iframeName = "ranking-data-frame";
  let iframe = document.querySelector(`iframe[name="${iframeName}"]`);

  if (!iframe) {
    iframe = document.createElement("iframe");
    iframe.name = iframeName;
    iframe.hidden = true;
    document.body.append(iframe);
  }

  const form = document.createElement("form");
  form.action = NEXT_DATA_ENDPOINT;
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

function setRankingItemStatus(message, isError = false) {
  if (!rankingItemStatus) {
    return;
  }

  rankingItemStatus.textContent = message;
  rankingItemStatus.classList.toggle("is-error", isError);
}

function setRankingNormalizeStatus(message, isError = false) {
  if (!rankingNormalizeStatus) {
    return;
  }

  rankingNormalizeStatus.textContent = message;
  rankingNormalizeStatus.classList.toggle("is-error", isError);
}

function renderFantasyCriticPage(year = getActiveFantasyCriticYear()) {
  const yearKey = String(year || "");

  if (yearKey === "2025" && fantasyCritic2025Content) {
    fantasyCritic2025Content.innerHTML = renderFantasyCriticLeagueState("2025");
  }

  if (yearKey === "2026" && fantasyCritic2026Content) {
    fantasyCritic2026Content.innerHTML = renderFantasyCriticLeagueState("2026");
  }
}

function getActiveFantasyCriticYear() {
  const activePage = activePageName || document.querySelector(".page.is-active")?.dataset.page || "";
  const match = activePage.match(/^fantasy-critic-(2025|2026)$/);

  return match?.[1] || "";
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

function parseFormulaOneCalculatorData({ driversCsv, optionsCsv, sprintsCsv, summaryCsv }) {
  const optionsRows = parseCsvMatrix(optionsCsv);
  const pointTables = findFormulaOneCalculatorPointTables(optionsRows);
  const raceOptions = pointTables.find((table) => table.some((option) => option.position === "<10"));
  const sprintOptions = pointTables.find((table) => table.some((option) => option.position === "<8"));
  const driversToWatch = findFormulaOneDriversToWatch(optionsRows, pointTables);

  if (!raceOptions?.length || !sprintOptions?.length || !driversToWatch.length) {
    throw new Error("Formula 1 calculator options did not include RacePoints, SprintPoints, and DriversToWatch data.");
  }

  const raceData = parseFormulaOneCalculatorRoundTable(driversCsv);
  const sprintData = parseFormulaOneCalculatorRoundTable(sprintsCsv);
  const currentTotals = parseFormulaOneCalculatorSummary(summaryCsv);

  if (!raceData.rounds.length) {
    throw new Error("Formula 1 Drivers data did not include round columns.");
  }

  return {
    currentTotals,
    driversToWatch,
    raceOptions,
    rounds: raceData.rounds,
    sprintOptions,
    sprintRounds: sprintData.rounds,
  };
}

function findFormulaOneCalculatorPointTables(rows) {
  const tables = [];

  rows.forEach((row, rowIndex) => {
    row.forEach((value, columnIndex) => {
      if (normalizeLookupName(value) !== "position" || normalizeLookupName(row[columnIndex + 1]) !== "points") {
        return;
      }

      const options = [];

      for (const optionRow of rows.slice(rowIndex + 1)) {
        const position = String(optionRow[columnIndex] ?? "").trim();
        const pointsText = String(optionRow[columnIndex + 1] ?? "").trim();

        if (!position && !pointsText) {
          break;
        }

        const points = Number(pointsText.replace(/,/g, ""));
        if (!position || !Number.isFinite(points)) {
          break;
        }

        options.push({ points, position });
      }

      if (options.some((option) => option.position.startsWith("<"))) {
        tables.push({ headerRowIndex: rowIndex, options });
      }
    });
  });

  return tables.map((table) => table.options);
}

function findFormulaOneDriversToWatch(rows, pointTables) {
  const terminalTokens = new Set(pointTables.flat()
    .map((option) => option.position)
    .filter((position) => position.startsWith("<")));
  let passedPointTables = false;

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex] ?? [];
    if (row.some((value) => terminalTokens.has(String(value ?? "").trim()))) {
      passedPointTables = true;
      continue;
    }

    if (!passedPointTables) {
      continue;
    }

    const driverColumn = row.findIndex((value) => normalizeLookupName(value) === "driver");
    if (driverColumn < 0) {
      continue;
    }

    const drivers = [];
    for (const driverRow of rows.slice(rowIndex + 1)) {
      const driver = String(driverRow[driverColumn] ?? "").trim();
      if (!driver) {
        break;
      }
      drivers.push(driver);
    }
    return drivers;
  }

  return [];
}

function parseFormulaOneCalculatorRoundTable(csvText) {
  const rows = parseCsvMatrix(csvText);
  const headerIndex = rows.findIndex((row) => {
    return normalizeLookupName(row[0]) === "driver" && row.some((value) => /^round\s+\d+/i.test(String(value ?? "").trim()));
  });

  if (headerIndex < 0) {
    return { rounds: [] };
  }

  const headers = rows[headerIndex];
  const prettyHeaders = rows[headerIndex - 1] ?? [];
  const totalColumn = headers.findIndex((value) => normalizeLookupName(value) === "total");
  const roundColumns = headers
    .map((header, columnIndex) => {
      const match = String(header ?? "").trim().match(/^Round\s+(\d+)/i);
      if (!match || (totalColumn >= 0 && columnIndex >= totalColumn)) {
        return null;
      }

      const prettyName = String(prettyHeaders[columnIndex] ?? "").trim();
      const headerName = String(header ?? "").trim();
      return {
        columnIndex,
        id: Number(match[1]),
        name: /^Round\s+\d+/i.test(prettyName) ? prettyName : headerName,
        pointsByDriver: new Map(),
      };
    })
    .filter(Boolean);

  for (const row of rows.slice(headerIndex + 1)) {
    const driver = String(row[0] ?? "").trim();
    if (!driver || normalizeLookupName(driver) === "count") {
      break;
    }

    roundColumns.forEach((round) => {
      const value = String(row[round.columnIndex] ?? "").trim();
      round.pointsByDriver.set(normalizeLookupName(driver), value);
    });
  }

  roundColumns.forEach((round) => {
    round.complete = [...round.pointsByDriver.values()].some((value) => value !== "");
  });

  return { rounds: roundColumns };
}

function parseFormulaOneCalculatorSummary(csvText) {
  const rows = parseCsvMatrix(csvText);
  const headerIndex = rows.findIndex((row) => {
    return normalizeLookupName(row[0]) === "driver" && row.some((value) => normalizeLookupName(value) === "total");
  });
  const currentTotals = new Map();

  if (headerIndex < 0) {
    return currentTotals;
  }

  const totalColumn = rows[headerIndex].findIndex((value) => normalizeLookupName(value) === "total");
  for (const row of rows.slice(headerIndex + 1)) {
    const driver = String(row[0] ?? "").trim();
    if (!driver) {
      break;
    }
    currentTotals.set(normalizeLookupName(driver), getFormulaOneCalculatorPointNumber(row[totalColumn]));
  }

  return currentTotals;
}

function getFormulaOneCalculatorPointNumber(value) {
  const number = Number(String(value ?? "").trim().replace(/,/g, ""));
  return Number.isFinite(number) ? number : 0;
}

function getFormulaOneCalculatorState(year, data) {
  const yearKey = String(year);
  const existingState = formulaOneCalculatorStates.get(yearKey);

  if (existingState) {
    const currentDrivers = new Set(data.driversToWatch);
    existingState.visibleDrivers = new Set([...existingState.visibleDrivers].filter((driver) => currentDrivers.has(driver)));
    data.driversToWatch.forEach((driver) => {
      if (!existingState.knownDrivers.has(driver)) {
        existingState.visibleDrivers.add(driver);
      }
    });
    existingState.knownDrivers = currentDrivers;
    return existingState;
  }

  const storedState = loadFormulaOneCalculatorStoredState(yearKey);
  const hiddenDrivers = new Set(storedState.hiddenDrivers ?? []);
  const state = {
    filtersExpanded: false,
    knownDrivers: new Set(data.driversToWatch),
    selections: storedState.selections && typeof storedState.selections === "object" ? storedState.selections : {},
    visibleDrivers: new Set(data.driversToWatch.filter((driver) => !hiddenDrivers.has(driver))),
  };
  formulaOneCalculatorStates.set(yearKey, state);
  return state;
}

function loadFormulaOneCalculatorStoredState(year) {
  try {
    return JSON.parse(localStorage.getItem(getFormulaOneCalculatorStorageKey(year)) || "{}") || {};
  } catch {
    return {};
  }
}

function persistFormulaOneCalculatorState(year, data, state) {
  try {
    localStorage.setItem(getFormulaOneCalculatorStorageKey(year), JSON.stringify({
      hiddenDrivers: data.driversToWatch.filter((driver) => !state.visibleDrivers.has(driver)),
      selections: state.selections,
    }));
  } catch {
    // The calculator still works when browser storage is unavailable.
  }
}

function getFormulaOneCalculatorStorageKey(year) {
  return `boxthislap-formula-one-calculator-${year}`;
}

function getFormulaOneCalculatorEvents(data) {
  const events = [];

  data.rounds.filter((round) => !round.complete).forEach((round) => {
    events.push({ round, type: "race" });
  });
  data.sprintRounds.filter((round) => !round.complete).forEach((round) => {
    events.push({ round: getFormulaOneCalculatorRaceRoundForSprint(data, round), sourceRound: round, type: "sprint" });
  });

  return events.sort((firstEvent, secondEvent) => {
    return firstEvent.round.id - secondEvent.round.id || (firstEvent.type === "sprint" ? -1 : 1);
  });
}

function getFormulaOneCalculatorRaceRoundForSprint(data, sprintRound) {
  const sprintName = getFormulaOneCalculatorRoundName(sprintRound);
  return data.rounds.find((round) => getFormulaOneCalculatorRoundName(round) === sprintName) || sprintRound;
}

function getFormulaOneCalculatorRoundName(round) {
  return normalizeLookupName(String(round?.name ?? "").replace(/^round\s+\d+\s*/i, ""));
}

function getFormulaOneCalculatorSelectionKey(type, roundId, driver) {
  return `${type}:${roundId}:${driver}`;
}

function getFormulaOneCalculatorSelectedPoints(data, state, event, driver) {
  const position = state.selections[getFormulaOneCalculatorSelectionKey(event.type, event.round.id, driver)] || "";
  const options = event.type === "sprint" ? data.sprintOptions : data.raceOptions;
  return options.find((option) => option.position === position)?.points ?? 0;
}

function getFormulaOneCalculatorCurrentPoints(data, driver) {
  const summaryPoints = data.currentTotals.get(normalizeLookupName(driver));
  if (Number.isFinite(summaryPoints)) {
    return summaryPoints;
  }

  return data.rounds.reduce((total, round) => total + getFormulaOneCalculatorRoundPoints(round, driver), 0) +
    data.sprintRounds.reduce((total, round) => total + getFormulaOneCalculatorRoundPoints(round, driver), 0);
}

function getFormulaOneCalculatorRoundPoints(round, driver) {
  return getFormulaOneCalculatorPointNumber(round?.pointsByDriver.get(normalizeLookupName(driver)));
}

function getFormulaOneCalculatorProjectedPoints(data, state, events, driver) {
  return getFormulaOneCalculatorCurrentPoints(data, driver) + events.reduce((total, event) => {
    return total + getFormulaOneCalculatorSelectedPoints(data, state, event, driver);
  }, 0);
}

function getFormulaOneDriverColor(driver, data) {
  const index = Math.max(0, data.driversToWatch.indexOf(driver));
  return FORMULA_ONE_DRIVER_COLOR_PALETTE[index % FORMULA_ONE_DRIVER_COLOR_PALETTE.length];
}

function getFormulaOneCalculatorSortedDrivers(data, drivers = data.driversToWatch) {
  return [...drivers].sort((firstDriver, secondDriver) => {
    return getFormulaOneCalculatorCurrentPoints(data, secondDriver) - getFormulaOneCalculatorCurrentPoints(data, firstDriver) ||
      data.driversToWatch.indexOf(firstDriver) - data.driversToWatch.indexOf(secondDriver);
  });
}

function renderFormulaOneCalculatorDriverName(driver) {
  const [firstName, ...remainingNames] = String(driver ?? "").trim().split(/\s+/);

  if (!remainingNames.length) {
    return `<span class="formula-one-calculator-driver-name"><span>${escapeHtml(firstName)}</span></span>`;
  }

  return `
    <span class="formula-one-calculator-driver-name">
      <span>${escapeHtml(firstName)}</span>
      <span>${escapeHtml(remainingNames.join(" "))}</span>
    </span>
  `;
}

function renderFormulaOneCalculator(year) {
  const view = formulaOneViews[year];
  const data = siteData[`formulaOne${year}Calculator`];

  if (!view?.calculator || !data) {
    return;
  }

  const state = getFormulaOneCalculatorState(year, data);
  const events = getFormulaOneCalculatorEvents(data);
  const sortedDrivers = getFormulaOneCalculatorSortedDrivers(data);
  const visibleDrivers = sortedDrivers.filter((driver) => state.visibleDrivers.has(driver));
  const lastCompletedRound = data.rounds.filter((round) => round.complete).at(-1)?.id ?? 0;

  view.calculator.innerHTML = `
    <section class="formula-one-calculator-card formula-one-calculator-intro">
      <div>
        <h3>Season scenarios</h3>
        <p>Choose a finishing position for any remaining race or sprint. Current totals come from the live ${escapeHtml(year)} data sheet.</p>
      </div>
      <span>Through Round ${escapeHtml(lastCompletedRound)}</span>
    </section>

    <section class="formula-one-calculator-card">
      <div class="formula-one-calculator-section-heading">
        <div>
          <h3>Points calculator</h3>
          <p>${escapeHtml(events.length)} remaining race and sprint scenarios</p>
        </div>
        <button
          class="icon-action-button formula-one-calculator-filter-toggle${state.filtersExpanded ? " is-active" : ""}"
          type="button"
          data-formula-one-calculator-filter-toggle
          aria-expanded="${state.filtersExpanded ? "true" : "false"}"
          aria-controls="formula-one-${escapeHtml(year)}-driver-filters"
          aria-label="${state.filtersExpanded ? "Hide" : "Show"} driver filters"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
            <path d="M4 5h16l-6.2 7.1v5.2l-3.6 1.8v-7L4 5Z"></path>
          </svg>
        </button>
      </div>
      ${renderFormulaOneCalculatorFilters(year, data, state, visibleDrivers, sortedDrivers)}
      <div class="table-wrap formula-one-calculator-table-wrap">
        ${renderFormulaOneCalculatorTable(data, state, events, visibleDrivers)}
      </div>
    </section>

    <section class="formula-one-calculator-card">
      <div class="formula-one-calculator-section-heading">
        <div>
          <h3>Championship projection</h3>
          <p>Cumulative points after each round</p>
        </div>
      </div>
      <div class="formula-one-calculator-chart-wrap">
        ${renderFormulaOneCalculatorChart(data, state, visibleDrivers)}
      </div>
    </section>
  `;
}

function renderFormulaOneCalculatorFilters(year, data, state, visibleDrivers, sortedDrivers) {
  return `
    <div
      class="formula-one-calculator-filters"
      id="formula-one-${escapeHtml(year)}-driver-filters"
      aria-labelledby="formula-one-${escapeHtml(year)}-driver-filter-heading"
      ${state.filtersExpanded ? "" : "hidden"}
    >
      <div class="formula-one-calculator-section-heading">
        <div>
          <h3 id="formula-one-${escapeHtml(year)}-driver-filter-heading">Drivers</h3>
          <p>Showing ${escapeHtml(visibleDrivers.length)} of ${escapeHtml(data.driversToWatch.length)}</p>
        </div>
        <div class="formula-one-calculator-filter-actions">
          <button type="button" data-formula-one-calculator-show-all>Show all</button>
          <button type="button" data-formula-one-calculator-hide-all>Hide all</button>
        </div>
      </div>
      <div class="formula-one-calculator-driver-filters">
        ${sortedDrivers.map((driver) => `
          <label style="--driver-color: ${escapeHtml(getFormulaOneDriverColor(driver, data))}">
            <input
              type="checkbox"
              data-formula-one-calculator-filter
              data-driver="${escapeHtml(driver)}"
              ${state.visibleDrivers.has(driver) ? "checked" : ""}
            >
            <span class="formula-one-driver-swatch" aria-hidden="true"></span>
            <span>${escapeHtml(driver)}</span>
          </label>
        `).join("")}
      </div>
    </div>
  `;
}

function renderFormulaOneCalculatorTable(data, state, events, visibleDrivers) {
  const eventHeaders = events.map((event) => {
    const eventLabel = event.type === "sprint" ? "Sprint" : "Race";
    return `<th title="${escapeHtml(`${event.round.name} ${eventLabel}`)}"><span>R${escapeHtml(event.round.id)}</span>${escapeHtml(eventLabel)}</th>`;
  }).join("");

  const rows = visibleDrivers.length ? visibleDrivers.map((driver) => {
    const currentPoints = getFormulaOneCalculatorCurrentPoints(data, driver);
    const projectedPoints = getFormulaOneCalculatorProjectedPoints(data, state, events, driver);
    return `
      <tr>
        <th scope="row">
          <span class="formula-one-calculator-driver" style="--driver-color: ${escapeHtml(getFormulaOneDriverColor(driver, data))}">
            <span class="formula-one-driver-swatch" aria-hidden="true"></span>
            ${renderFormulaOneCalculatorDriverName(driver)}
          </span>
        </th>
        <td class="formula-one-calculator-total">${escapeHtml(currentPoints)}</td>
        ${events.map((event) => renderFormulaOneCalculatorPositionSelect(data, state, event, driver)).join("")}
        <td class="formula-one-calculator-total formula-one-calculator-projected">
          ${escapeHtml(projectedPoints)}
          <small>+${escapeHtml(projectedPoints - currentPoints)}</small>
        </td>
      </tr>
    `;
  }).join("") : `
    <tr>
      <td class="table-message" colspan="${escapeHtml(events.length + 3)}">No drivers are selected. Use the driver filters above to add one.</td>
    </tr>
  `;

  return `
    <table class="formula-one-calculator-table">
      <thead>
        <tr>
          <th>Driver</th>
          <th>Current</th>
          ${eventHeaders}
          <th>Projected</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderFormulaOneCalculatorPositionSelect(data, state, event, driver) {
  const options = event.type === "sprint" ? data.sprintOptions : data.raceOptions;
  const key = getFormulaOneCalculatorSelectionKey(event.type, event.round.id, driver);
  const selectedPosition = state.selections[key] || "";
  const eventLabel = event.type === "sprint" ? "Sprint" : "Race";

  return `
    <td>
      <select
        aria-label="${escapeHtml(`${driver}, ${event.round.name} ${eventLabel} position`)}"
        data-formula-one-calculator-position
        data-driver="${escapeHtml(driver)}"
        data-event-type="${escapeHtml(event.type)}"
        data-round-id="${escapeHtml(event.round.id)}"
      >
        <option value="">—</option>
        ${options.map((option) => `
          <option value="${escapeHtml(option.position)}" ${option.position === selectedPosition ? "selected" : ""}>
            ${escapeHtml(option.position)} · ${escapeHtml(option.points)} pts
          </option>
        `).join("")}
      </select>
    </td>
  `;
}

function getFormulaOneCalculatorSeries(data, state, driver) {
  const sprintRoundsById = new Map(data.sprintRounds.map((sprintRound) => {
    return [getFormulaOneCalculatorRaceRoundForSprint(data, sprintRound).id, sprintRound];
  }));
  let cumulativePoints = 0;

  return data.rounds.map((round) => {
    const raceEvent = { round, type: "race" };
    const sprintRound = sprintRoundsById.get(round.id);
    const sprintEvent = sprintRound ? { round, sourceRound: sprintRound, type: "sprint" } : null;
    cumulativePoints += round.complete
      ? getFormulaOneCalculatorRoundPoints(round, driver)
      : getFormulaOneCalculatorSelectedPoints(data, state, raceEvent, driver);
    if (sprintRound) {
      cumulativePoints += sprintRound.complete
        ? getFormulaOneCalculatorRoundPoints(sprintRound, driver)
        : getFormulaOneCalculatorSelectedPoints(data, state, sprintEvent, driver);
    }
    return { points: cumulativePoints, roundId: round.id };
  });
}

function renderFormulaOneCalculatorChart(data, state, visibleDrivers) {
  if (!visibleDrivers.length) {
    return `<p class="table-message">No drivers are selected. The graph will update when a driver is turned on.</p>`;
  }

  const series = visibleDrivers.map((driver) => ({
    color: getFormulaOneDriverColor(driver, data),
    driver,
    values: getFormulaOneCalculatorSeries(data, state, driver),
  }));
  const width = Math.max(760, 112 + data.rounds.length * 62);
  const height = 420;
  const margin = { bottom: 48, left: 64, right: 28, top: 28 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const maxPoints = Math.max(25, ...series.flatMap((entry) => entry.values.map((value) => value.points)));
  const yMax = Math.ceil(maxPoints / 25) * 25;
  const xForIndex = (index) => margin.left + (data.rounds.length === 1 ? 0 : (index / (data.rounds.length - 1)) * plotWidth);
  const yForPoints = (points) => margin.top + plotHeight - (points / yMax) * plotHeight;
  const completedRoundIndex = data.rounds.findLastIndex((round) => round.complete);
  const projectionX = completedRoundIndex >= 0 && completedRoundIndex < data.rounds.length - 1
    ? (xForIndex(completedRoundIndex) + xForIndex(completedRoundIndex + 1)) / 2
    : null;
  const yGrid = Array.from({ length: 6 }, (_, index) => {
    const points = Math.round((yMax / 5) * index);
    const y = yForPoints(points);
    return `
      <line class="formula-one-chart-grid" x1="${margin.left}" x2="${width - margin.right}" y1="${y}" y2="${y}"></line>
      <text class="formula-one-chart-label" x="${margin.left - 10}" y="${y + 4}" text-anchor="end">${escapeHtml(points)}</text>
    `;
  }).join("");
  const xLabels = data.rounds.map((round, index) => {
    return `<text class="formula-one-chart-label" x="${xForIndex(index)}" y="${height - 18}" text-anchor="middle">R${escapeHtml(round.id)}</text>`;
  }).join("");
  const lines = series.map((entry) => {
    const points = entry.values.map((value, index) => `${xForIndex(index)},${yForPoints(value.points)}`).join(" ");
    const markers = entry.values.map((value, index) => `
      <circle cx="${xForIndex(index)}" cy="${yForPoints(value.points)}" r="3.5" fill="${escapeHtml(entry.color)}">
        <title>${escapeHtml(`${entry.driver} — Round ${value.roundId}: ${value.points} points`)}</title>
      </circle>
    `).join("");
    return `
      <polyline class="formula-one-chart-line" points="${points}" stroke="${escapeHtml(entry.color)}"></polyline>
      ${markers}
    `;
  }).join("");

  return `
    <svg
      class="formula-one-calculator-chart"
      viewBox="0 0 ${width} ${height}"
      width="${width}"
      height="${height}"
      role="img"
      aria-labelledby="formula-one-calculator-chart-title formula-one-calculator-chart-description"
    >
      <title id="formula-one-calculator-chart-title">Formula 1 championship points projection</title>
      <desc id="formula-one-calculator-chart-description">Cumulative points by round for the selected drivers, including the chosen future finishing positions.</desc>
      ${yGrid}
      ${xLabels}
      ${projectionX === null ? "" : `
        <line class="formula-one-chart-projection" x1="${projectionX}" x2="${projectionX}" y1="${margin.top}" y2="${margin.top + plotHeight}"></line>
        <text class="formula-one-chart-projection-label" x="${projectionX + 8}" y="${margin.top + 14}">Projection</text>
      `}
      ${lines}
    </svg>
  `;
}

function renderFormulaOneCalculatorError(year, error) {
  const calculator = formulaOneViews[year]?.calculator;
  if (calculator) {
    calculator.innerHTML = `<p class="table-message">Unable to load Formula 1 points calculator: ${escapeHtml(getErrorMessage(error))}</p>`;
  }
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

  if (!shouldRenderPageSection(`formula-1-${year}-questions`)) {
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

  if (!shouldRenderPageSection(`formula-1-${year}-results`)) {
    return;
  }

  renderFormulaOneAwards(year);

  const data = siteData[`formulaOne${year}`];
  const weeklyData = siteData[`formulaOne${year}WeeklyResults`] ?? siteData[`formulaOne${year}Weekly`];
  const mode = formulaOneResultsMode[year] ?? "yearly";
  const activeSource = mode === "weekly" ? weeklyData : data;
  const standings = mode === "weekly"
    ? weeklyData?.standings ?? []
    : data?.standings ?? [];

  if (!activeSource) {
    const label = mode === "weekly" ? "weekly" : "yearly";
    view.resultsRows.innerHTML = `<tr><td class="table-message" colspan="3">Loading Formula 1 ${label} results...</td></tr>`;
    return;
  }

  if (standings.length === 0) {
    const label = mode === "weekly" ? "weekly" : "yearly";
    view.resultsRows.innerHTML = `<tr><td class="table-message" colspan="3">No Formula 1 ${label} results were loaded.</td></tr>`;
    return;
  }

  view.resultsRows.innerHTML = standings.map((entry, index) => {
    const manager = getManagerByName(entry.manager) ?? { name: entry.manager };
    const standingsKey = getFormulaOneAwardStandingsForMode(mode);
    const awards = entry.rank === 1
      ? getAwardsForManager(manager, { standings: standingsKey, year })
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

function renderFormulaOneAwards(year) {
  const view = formulaOneViews[year];

  if (!view?.awards || !view?.awardsList) {
    return;
  }

  const awards = getAwardsForFormulaOneYear(year);
  view.awards.hidden = awards.length === 0;

  if (!awards.length) {
    view.awardsList.innerHTML = "";
    return;
  }

  view.awardsList.innerHTML = awards.map((award) => renderAwardCard(award, "standings-summary")).join("");
}

function getAwardsForFormulaOneYear(year) {
  return getResolvedAwards().filter((award) => {
    return award.competition === `${year} Formula 1` &&
      String(award.year || "") === String(year || "");
  });
}

function renderPageContext(pageName = "") {
  const previousPageName = activePageName;
  activePageName = pageName;

  if (previousPageName && previousPageName !== pageName) {
    disposePageResources(previousPageName);
  }

  renderActivePageContent(pageName);
  renderStandingsAwards();
  syncFollowedTeamShortcutsVisibility(pageName);

  const formulaOneYear = getFormulaOneYearFromPage(pageName);

  if (formulaOneYear) {
    renderFormulaOneAwards(formulaOneYear);
  }

  void ensurePageData(pageName);
}

function shouldRenderPageSection(pageName) {
  return !activePageName || activePageName === pageName;
}

function renderActivePageContent(pageName = "") {
  if (pageName === "footy") {
    if (siteData.footySchedule) {
      renderFootySchedule(siteData.footySchedule);
    } else if (footyScheduleList) {
      footyScheduleList.innerHTML = renderLoadingMessage("Loading Footy schedule...");
    }
    return;
  }

  if (pageName.startsWith("footy-team-")) {
    renderFootyTeamPage(pageName);
    return;
  }

  if (pageName === "footy-goal-assists") {
    renderFootyGoalAssistsSaved();
    return;
  }

  if (pageName === "next") {
    if (Array.isArray(siteData.nextItems)) {
      renderNextList();
    } else if (nextList) {
      nextList.innerHTML = renderLoadingMessage("Loading Next items...");
    }
    return;
  }

  if (pageName === "todo") {
    if (Array.isArray(siteData.todoItems)) {
      renderTodoList();
    } else if (todoList) {
      todoList.innerHTML = renderLoadingMessage("Loading To Do items...");
    }
    return;
  }

  if (pageName === "guides") {
    guidesController.renderPage();
    return;
  }

  if (pageName === "want") {
    if (Array.isArray(siteData.wantItems)) {
      renderWantList();
    } else if (wantList) {
      wantList.innerHTML = renderLoadingMessage("Loading Want items...");
    }
    return;
  }

  if (pageName === "youtube") {
    youtubeInboxController.renderPage();
    return;
  }

  if (pageName === "rankings") {
    renderRankingsPage();
    return;
  }

  if (pageName === "manager-awards") {
    renderLeagueAwards();
    return;
  }

  if (pageName === "results") {
    if (siteData.resultImages) {
      renderResultImages(siteData.resultImages);
    } else if (dynamicResultImages) {
      dynamicResultImages.innerHTML = renderLoadingMessage("Loading result images...");
    }
    return;
  }

  if (["today", "tomorrow", "matches"].includes(pageName) && !siteData.matches) {
    [todayMatchList, tomorrowMatchList, matchdayMatchList].forEach((container) => {
      if (container) {
        container.innerHTML = renderLoadingMessage("Loading match data...");
      }
    });
    return;
  }

  if (pageName === "bracket" && !siteData.bracketMatches && bracketView) {
    bracketView.innerHTML = renderLoadingMessage("Loading bracket data...");
    return;
  }

  if (["standings", "rules", "testing"].includes(pageName) && !siteData.playerPerformances) {
    if (playerChampionshipRows) {
      playerChampionshipRows.innerHTML = `<tr><td colspan="5">${renderLoadingMessage("Loading standings data...")}</td></tr>`;
    }
    if (nationsLeagueRows) {
      nationsLeagueRows.innerHTML = `<tr><td colspan="5">${renderLoadingMessage("Loading standings data...")}</td></tr>`;
    }
    if (managerResultsRows) {
      managerResultsRows.innerHTML = `<tr><td colspan="3">${renderLoadingMessage("Loading manager results...")}</td></tr>`;
    }
  }

  if (pageName.startsWith("fantasy-critic-")) {
    renderFantasyCriticPage();
    return;
  }

  const formulaOneYear = getFormulaOneYearFromPage(pageName);

  if (formulaOneYear) {
    if (pageName.endsWith("-calculator")) {
      if (siteData[`formulaOne${formulaOneYear}Calculator`]) {
        renderFormulaOneCalculator(formulaOneYear);
      } else if (formulaOneViews[formulaOneYear]?.calculator) {
        formulaOneViews[formulaOneYear].calculator.innerHTML = renderLoadingMessage("Loading Formula 1 points calculator...");
      }
      return;
    }

    if (pageName.endsWith("-questions")) {
      if (siteData[`formulaOne${formulaOneYear}`]) {
        renderFormulaOneQuestions(formulaOneYear);
      } else if (formulaOneViews[formulaOneYear]?.questionList) {
        formulaOneViews[formulaOneYear].questionList.innerHTML = renderLoadingMessage("Loading Formula 1 questions...");
      }
      return;
    }

    if (pageName.endsWith("-weekly")) {
      if (siteData[`formulaOne${formulaOneYear}Weekly`]) {
        renderFormulaOneWeeklyPage(formulaOneYear, siteData[`formulaOne${formulaOneYear}Weekly`]);
      } else if (formulaOneViews[formulaOneYear]?.weeklyList) {
        formulaOneViews[formulaOneYear].weeklyList.innerHTML = renderLoadingMessage("Loading Formula 1 weekly picks...");
      }
      if (formulaOneYear === "2026" && !siteData.formulaOne2026RoundForms && formulaOneViews[2026]?.weeklyForm) {
        formulaOneViews[2026].weeklyForm.innerHTML = renderLoadingMessage("Loading Formula 1 bet forms...");
      } else {
        renderFormulaOneWeeklyForm(formulaOneYear, siteData[`formulaOne${formulaOneYear}RoundForms`]);
      }
      return;
    }

    if (pageName.endsWith("-results")) {
      renderFormulaOneResults(formulaOneYear);
      return;
    }
  }

  const fantasyOfficeMatch = pageName.match(/^fantasy-office-(2025|2026)-(draft|movies|results)$/);

  if (fantasyOfficeMatch) {
    const [, year, view] = fantasyOfficeMatch;
    const data = siteData[`fantasyOffice${year}`];

    if (view === "draft") {
      if (data?.draft?.length || sharedDataPromises.has(`fantasy-office:${year}:draft`)) {
        renderFantasyOfficeDraft(year, data?.draft ?? []);
      } else {
        fantasyOfficeViews[year]?.draftList && (fantasyOfficeViews[year].draftList.innerHTML = renderLoadingMessage(`Loading Fantasy Office ${year} draft...`));
      }
    } else if (view === "movies") {
      if (year === "2026") {
        renderFantasyOfficeMovies(year, []);
      } else if (data?.results?.length || sharedDataPromises.has(`fantasy-office:${year}:movies`)) {
        renderFantasyOfficeMovies(year, data?.results ?? []);
      } else {
        fantasyOfficeViews[year]?.movieList && (fantasyOfficeViews[year].movieList.innerHTML = renderLoadingMessage(`Loading Fantasy Office ${year} movies...`));
      }
    } else if (view === "results") {
      if (year === "2026") {
        renderFantasyOfficeResults(year, []);
      } else if (data?.results?.length || sharedDataPromises.has(`fantasy-office:${year}:results`)) {
        renderFantasyOfficeResults(year, data?.results ?? []);
      } else {
        fantasyOfficeViews[year]?.resultList && (fantasyOfficeViews[year].resultList.innerHTML = renderLoadingMessage(`Loading Fantasy Office ${year} results...`));
      }
    }
  }
}

function disposePageResources(pageName = "") {
  disposeFormulaOneFormIframes();
  disposeInactiveHeavyMarkup();
}

function getFormulaOneYearFromPage(pageName = "") {
  const match = String(pageName).match(/^formula-1-(2024|2025|2026)(?:-|$)/);
  return match?.[1] || "";
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
  void ensureFormulaOneData(year, formulaOneResultsMode[year] === "weekly" ? "weekly-results" : "questions");
}

function disposeFormulaOneFormIframes() {
  document.querySelectorAll(".formula-one-form-embed iframe").forEach((iframe) => {
    if (iframe.getAttribute("src")) {
      iframe.removeAttribute("src");
    }
  });
}

function disposeInactiveHeavyMarkup() {
  const activePage = activePageName || document.querySelector(".page.is-active")?.dataset.page || "";
  const clearIfInactive = (pageName, element, fallbackMarkup = "") => {
    if (activePage !== pageName && element) {
      element.innerHTML = fallbackMarkup;
    }
  };

  clearIfInactive("fantasy-critic-2025", fantasyCritic2025Content);
  clearIfInactive("fantasy-critic-2026", fantasyCritic2026Content);

  Object.entries(formulaOneViews).forEach(([year, view]) => {
    clearIfInactive(`formula-1-${year}-questions`, view.questionList);
    clearIfInactive(`formula-1-${year}-weekly`, view.weeklyList);

    if (activePage !== `formula-1-${year}-weekly` && view.weeklyManagers) {
      view.weeklyManagers.innerHTML = "";
    }
  });

  Object.entries(fantasyOfficeViews).forEach(([year, view]) => {
    clearIfInactive(`fantasy-office-${year}-draft`, view.draftList);
    clearIfInactive(`fantasy-office-${year}-movies`, view.movieList);
    clearIfInactive(`fantasy-office-${year}-results`, view.resultList);
  });
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

  loadVisibleFormulaOneFormIframes(view.weeklyForm, year);
}

function renderFormulaOneFormEmbed(form) {
  const isCollapsed = isMobileSafari();
  const embedUrl = getGoogleFormEmbedUrl(form.formUrl);
  const shouldLoadIframe = !isCollapsed && isFormulaOneWeeklyBetPanelActive();

  return `
    <details class="formula-one-form-embed"${isCollapsed ? "" : " open"}>
      <summary>Show embedded form</summary>
      <iframe
        title="${escapeHtml(`${form.name} bet form`)}"
        data-src="${escapeHtml(embedUrl)}"
        src="${shouldLoadIframe ? escapeHtml(embedUrl) : ""}"
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

function loadVisibleFormulaOneFormIframes(container, year = getFormulaOneYearFromPage(activePageName)) {
  if (!isFormulaOneWeeklyBetPanelActive(year)) {
    return;
  }

  container.querySelectorAll(".formula-one-form-embed[open] iframe[data-src]").forEach((iframe) => {
    if (!iframe.getAttribute("src")) {
      iframe.setAttribute("src", iframe.getAttribute("data-src"));
    }
  });
}

function isFormulaOneWeeklyBetPanelActive(year = getFormulaOneYearFromPage(activePageName)) {
  if (!year || activePageName !== `formula-1-${year}-weekly`) {
    return false;
  }

  return Boolean(document.querySelector(`[data-tab-panel="formula-one-${year}-weekly-bet"].is-active`));
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

  if (!shouldRenderPageSection(`formula-1-${year}-weekly`)) {
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

  if (!shouldRenderPageSection(`fantasy-office-${year}-draft`)) {
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

  if (!shouldRenderPageSection(`fantasy-office-${year}-movies`)) {
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

  if (!shouldRenderPageSection(`fantasy-office-${year}-results`)) {
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

  if (!shouldRenderPageSection("results")) {
    dynamicResultImages.hidden = true;
    dynamicResultImages.innerHTML = "";
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
        decoding="async"
        loading="lazy"
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

followedTeamShortcuts?.addEventListener("click", (event) => {
  const link = event.target.closest("[data-page-link]");

  if (!link) {
    return;
  }

  event.preventDefault();
  const pageName = link.dataset.pageLink;
  const nextHash = `#${pageName}`;

  if (window.location.hash !== nextHash) {
    history.pushState(null, "", nextHash);
  }

  showPage(pageName, { scrollToTop: true });
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

document.addEventListener("error", (event) => {
  const image = event.target;

  if (!(image instanceof HTMLImageElement)) {
    return;
  }

  if (image.hasAttribute("data-next-card-image")) {
    image.closest(".next-card")?.classList.remove("next-card--with-image");
    image.remove();
    return;
  }

  if (!image.dataset.fallbackSrcs) {
    return;
  }

  let fallbacks = [];

  try {
    fallbacks = JSON.parse(image.dataset.fallbackSrcs);
  } catch {
    fallbacks = [];
  }

  const [nextSource, ...remainingSources] = Array.isArray(fallbacks) ? fallbacks : [];

  if (!nextSource) {
    image.removeAttribute("data-fallback-srcs");
    return;
  }

  image.dataset.fallbackSrcs = JSON.stringify(remainingSources);
  image.src = nextSource;
}, true);

copyCurrentPageLinkButton?.addEventListener("click", () => {
  copyCurrentPageUrl();
});

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    showTab(tab.dataset.tab, { scrollToTop: true });
    renderActivePageContent(activePageName);
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

function handleFootyFixtureListClick(event) {
  const editButton = event.target.closest("[data-footy-note-edit]");

  if (editButton) {
    openFootyNoteDialog(editButton.getAttribute("data-footy-note-edit"));
    return;
  }

  if (event.target.closest("a, button, input, select, textarea, label")) {
    return;
  }

  const card = event.target.closest("[data-footy-match-id]");

  if (!card) {
    return;
  }

  toggleFootyFixtureExpansion(card.getAttribute("data-footy-match-id"));
}

function handleFootyFixtureListKeydown(event) {
  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }

  const card = event.target.closest("[data-footy-match-id]");

  if (!card || event.target !== card) {
    return;
  }

  event.preventDefault();
  toggleFootyFixtureExpansion(card.getAttribute("data-footy-match-id"));
}

[footyScheduleList, footyTeamContent].forEach((container) => {
  container?.addEventListener("click", handleFootyFixtureListClick);
  container?.addEventListener("keydown", handleFootyFixtureListKeydown);
});

footyTeamContent?.addEventListener("click", (event) => {
  const showMoreButton = event.target.closest("[data-footy-team-show-more]");

  if (showMoreButton) {
    const teamSlug = String(showMoreButton.getAttribute("data-footy-team-show-more") || "").trim();

    if (teamSlug) {
      footyTeamFixtureLimits.set(teamSlug, (footyTeamFixtureLimits.get(teamSlug) || 5) + 5);
      renderFootyTeamPage();
    }

    return;
  }

  const exportToggle = event.target.closest("[data-trading-card-export-toggle]");

  if (exportToggle) {
    shouldExportFootyTradingCards = Boolean(exportToggle.checked);
    renderFootyTeamPage();
    return;
  }

  const card = event.target.closest("[data-footy-player-id]");

  if (!card) {
    return;
  }

  const team = getActiveFootyTeam();
  const player = getFootyRosterPlayerForTeam(team, card.getAttribute("data-footy-player-id"));

  if (shouldExportFootyTradingCards) {
    void exportFootyTradingCard(player, team);
  } else {
    openFootyTradingCard(player, team);
  }
});

footyTeamContent?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }

  const card = event.target.closest("[data-footy-player-id]");

  if (!card || event.target !== card) {
    return;
  }

  event.preventDefault();
  const team = getActiveFootyTeam();
  const player = getFootyRosterPlayerForTeam(team, card.getAttribute("data-footy-player-id"));

  if (shouldExportFootyTradingCards) {
    void exportFootyTradingCard(player, team);
  } else {
    openFootyTradingCard(player, team);
  }
});

leagueYearSelect?.addEventListener("change", () => {
  renderLeagueList(leagueYearSelect.value);
});

footyPastToggle?.addEventListener("click", () => {
  shouldShowPastFootyFixtures = !shouldShowPastFootyFixtures;
  shouldShowAllFootyFixtures = false;
  renderFootySchedule(siteData.footySchedule);
});

footyCompetitionToggle?.addEventListener("click", () => {
  activeFootyScheduleMode = activeFootyScheduleMode === "competitions" ? "teams" : "competitions";
  shouldShowAllFootyFixtures = false;
  renderFootySchedule(siteData.footySchedule);
});

footyCompetitionSelect?.addEventListener("change", () => {
  activeFootyCompetitionKey = String(footyCompetitionSelect.value || "");
  shouldShowAllFootyFixtures = false;
  expandedFootyMatchIds.clear();
  renderFootySchedule(siteData.footySchedule);
});

footyNotificationToggle?.addEventListener("click", () => {
  void toggleFootyNotifications();
});

window.addEventListener("focus", () => {
  checkFootyMatchNotifications();
  refreshFootyMatchNotesIfNeeded();
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    checkFootyMatchNotifications();
    refreshFootyMatchNotesIfNeeded();
  }
});

footyGoalAssistsButton?.addEventListener("click", () => {
  showPage("footy-goal-assists", { scrollToTop: true });
  window.location.hash = "footy-goal-assists";
});

footyGoalAssistsBack?.addEventListener("click", () => {
  showPage("footy", { scrollToTop: true });
  window.location.hash = "footy";
});

footyGoalAssistsForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  saveFootyGoalAssistEntry();
});

footyGoalAssistsAdd?.addEventListener("click", () => {
  saveFootyGoalAssistEntry();
});

footyGoalAssistsCopy?.addEventListener("click", () => {
  copyFootyGoalAssistEntries();
});

footyGoalAssistsClear?.addEventListener("click", () => {
  clearFootyGoalAssistEntries();
});

footyGoalAssistsSaved?.addEventListener("click", (event) => {
  const deleteButton = event.target.closest("[data-footy-ga-delete]");

  if (!deleteButton) {
    return;
  }

  deleteFootyGoalAssistEntry(Number(deleteButton.getAttribute("data-footy-ga-delete")));
});

footyNoteForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  saveFootyMatchNoteFromDialog();
});

footyNoteForm?.addEventListener("pointerdown", (event) => {
  const optionButton = event.target.closest("[data-autocomplete-value]");

  if (!optionButton) {
    if (!isFootyPlayerAutocompleteInput(event.target) && !event.target.closest(".autocomplete-dropdown")) {
      closeAutocompleteDropdown();
    }

    return;
  }

  event.preventDefault();
  selectAutocompleteOption(
    activeAutocompleteInput,
    optionButton.getAttribute("data-autocomplete-value") || "",
  );
});

footyNoteForm?.addEventListener("click", (event) => {
  const optionButton = event.target.closest("[data-autocomplete-value]");

  if (optionButton) {
    return;
  }

  const saveButton = event.target.closest("[data-footy-note-ga-save]");

  if (saveButton) {
    saveFootyNoteGoalAssistEntry(saveButton.getAttribute("data-footy-note-ga-save"));
    return;
  }

  const deleteButton = event.target.closest("[data-footy-note-ga-delete]");

  if (deleteButton) {
    deleteFootyNoteGoalAssistEntry(
      deleteButton.getAttribute("data-footy-note-ga-delete"),
      Number(deleteButton.getAttribute("data-footy-note-ga-index")),
    );
  }
});

footyNoteForm?.addEventListener("focusin", (event) => {
  if (!isFootyPlayerAutocompleteInput(event.target)) {
    closeAutocompleteDropdown();
    return;
  }

  activeAutocompleteInput = event.target;
  renderFootyPlayerAutocomplete(event.target);

  ensureFootyRosters()
    .then(() => {
      if (activeAutocompleteInput === event.target) {
        renderFootyPlayerAutocomplete(event.target);
      }
    })
    .catch((error) => {
      recordDiagnostic("footy rosters failed to load", error);
      console.warn("Box This Lap footy rosters failed to load", error);
    });
});

footyNoteForm?.addEventListener("input", (event) => {
  if (isFootyPlayerAutocompleteInput(event.target)) {
    renderFootyPlayerAutocomplete(event.target);
  }
});

footyNoteForm?.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeAutocompleteDropdown();
  }
});

[footyNoteClose, footyNoteCancel].forEach((button) => {
  button?.addEventListener("click", () => closeFootyNoteDialog());
});

footyFilterToggle?.addEventListener("click", () => {
  shouldShowFootyFilters = !shouldShowFootyFilters;
  renderFootySchedule(siteData.footySchedule);
});

footyTeamPlayerToggle?.addEventListener("click", () => {
  activeFootyTeamViewMode = activeFootyTeamViewMode === "team" ? "schedule" : "team";
  renderFootyTeamPage();
});

footyTeamViewModeButtons?.forEach((button) => {
  button.addEventListener("click", () => {
    const mode = button.dataset.footyTeamViewMode;

    if (!["schedule", "team"].includes(mode) || mode === activeFootyTeamViewMode) {
      return;
    }

    activeFootyTeamViewMode = mode;
    renderFootyTeamPage();
  });
});

footyTradingCardClose?.addEventListener("click", closeFootyTradingCard);

footyTradingCardDialog?.addEventListener("click", (event) => {
  if (event.target === footyTradingCardDialog) {
    closeFootyTradingCard();
  }
});

footyTradingCardContent?.addEventListener("click", (event) => {
  toggleFootyTradingCardSide(event.target.closest("[data-trading-card-flip]"));
});

footyTradingCardContent?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }

  const card = event.target.closest("[data-trading-card-flip]");

  if (!card || event.target !== card) {
    return;
  }

  event.preventDefault();
  toggleFootyTradingCardSide(card);
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

[footySearchInput, footyDateFromFilter, footyDateToFilter, footyMatchPeriodFilter, footyCompetitionPastFilter, footyFriendliesFilter, footyTeamFilter].forEach((control) => {
  control?.addEventListener("input", () => renderFootySchedule(siteData.footySchedule));
  control?.addEventListener("change", () => renderFootySchedule(siteData.footySchedule));
});

nextFilterToggle?.addEventListener("click", () => {
  shouldShowNextFilters = !shouldShowNextFilters;
  renderNextList();
});

[
  nextSearchInput,
  nextCompletedFilter,
  nextPreviousFilter,
  nextNonAdminFilter,
  nextEditModeFilter,
  nextDateFromFilter,
  nextDateToFilter,
  nextPriorityMin,
  nextPriorityMax,
].forEach((control) => {
  control?.addEventListener("input", () => renderNextList());
  control?.addEventListener("change", () => renderNextList());
});

nextList?.addEventListener("click", (event) => {
  const editButton = event.target.closest("[data-next-edit]");

  if (editButton) {
    event.preventDefault();
    event.stopPropagation();
    openNextItemDialog(editButton.getAttribute("data-next-edit"));
    return;
  }

  const card = event.target.closest("[data-next-item-id]");

  if (!card || !isNextEditModeEnabled()) {
    return;
  }

  const nextId = card.getAttribute("data-next-item-id") || "";
  activeNextItemId = activeNextItemId === nextId ? "" : nextId;
  renderNextList();
});

nextList?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }

  const card = event.target.closest("[data-next-item-id]");

  if (!card || !isNextEditModeEnabled()) {
    return;
  }

  event.preventDefault();
  const nextId = card.getAttribute("data-next-item-id") || "";
  activeNextItemId = activeNextItemId === nextId ? "" : nextId;
  renderNextList();
});

nextAddButton?.addEventListener("click", () => {
  openNextItemDialog();
});

nextItemForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  saveNextItemFromForm();
});

[nextItemClose, nextItemCancel].forEach((button) => {
  button?.addEventListener("click", closeNextItemDialog);
});

[nextStartDateInput, nextEndDateInput].forEach((control) => {
  control?.addEventListener("input", updateNextCompletedControlAvailability);
  control?.addEventListener("change", updateNextCompletedControlAvailability);
});

todoAddButton?.addEventListener("click", () => {
  openTodoItemDialog();
});

todoFilterToggle?.addEventListener("click", () => {
  shouldShowTodoFilters = !shouldShowTodoFilters;
  renderTodoList();
});

todoCompareButton?.addEventListener("click", () => openRankingBattleDialog("todo"));
todoRandomButton?.addEventListener("click", openTodoRandomDialog);
todoRandomAgain?.addEventListener("click", renderRandomTodoItem);
[todoRandomClose, todoRandomDone].forEach((button) => button?.addEventListener("click", closeTodoRandomDialog));
todoNormalizeButton?.addEventListener("click", () => openRankingNormalizeDialog("todo"));
todoSnapshotSelect?.addEventListener("change", () => {
  activeTodoSnapshotId = todoSnapshotSelect.value || "current";
  activeTodoViewMode = "calculated";
  renderTodoList();
});
todoSnapshotCompareSelect?.addEventListener("change", () => {
  activeTodoCompareSnapshotId = todoSnapshotCompareSelect.value || "";
  renderTodoList();
});

todoViewModeButtons?.forEach((button) => {
  button.addEventListener("click", () => {
    const mode = button.dataset.todoViewMode;
    if (mode !== "manual" && mode !== "calculated") return;
    activeTodoViewMode = mode;
    if (mode === "calculated") shouldShowTodoEditMode = false;
    renderTodoList();
  });
});

todoMoreDataToggle?.addEventListener("change", () => {
  shouldShowTodoMoreData = Boolean(todoMoreDataToggle.checked);
  renderTodoList();
});

todoEditToggle?.addEventListener("change", () => {
  shouldShowTodoEditMode = Boolean(todoEditToggle.checked);
  activeTodoItemId = "";
  renderTodoList();
});

todoStatusFilters?.forEach((input) => {
  input.addEventListener("change", () => {
    setTodoStatusFilter(input.checked ? input.dataset.todoStatusFilter : "");
  });
});

todoList?.addEventListener("click", (event) => {
  const editButton = event.target.closest("[data-todo-edit]");

  if (editButton) {
    event.preventDefault();
    event.stopPropagation();
    openTodoItemDialogForItem(editButton.getAttribute("data-todo-edit"));
    return;
  }

  const deleteButton = event.target.closest("[data-todo-delete]");

  if (deleteButton) {
    event.preventDefault();
    event.stopPropagation();
    deleteTodoItem(deleteButton.getAttribute("data-todo-delete"));
    return;
  }

  const card = event.target.closest("[data-todo-id]");

  if (!card || !shouldShowTodoEditMode || event.target.closest("button, a, input, select, textarea, label, .todo-drag-handle")) {
    return;
  }

  activeTodoItemId = activeTodoItemId === card.getAttribute("data-todo-id")
    ? ""
    : card.getAttribute("data-todo-id") || "";
  renderTodoList();
});

todoList?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }

  if (event.target.closest("button, a, input, select, textarea, label, .todo-drag-handle")) {
    return;
  }

  const card = event.target.closest("[data-todo-id]");

  if (!card || !shouldShowTodoEditMode) {
    return;
  }

  event.preventDefault();
  activeTodoItemId = activeTodoItemId === card.getAttribute("data-todo-id")
    ? ""
    : card.getAttribute("data-todo-id") || "";
  renderTodoList();
});

todoItemForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  saveTodoItemFromForm();
});

[todoItemClose, todoItemCancel].forEach((button) => {
  button?.addEventListener("click", closeTodoItemDialog);
});

todoItemForm?.addEventListener("pointerdown", (event) => {
  const optionButton = event.target.closest("[data-autocomplete-value]");

  if (!optionButton) {
    if (event.target !== todoParentInput && !event.target.closest(".autocomplete-dropdown")) {
      closeAutocompleteDropdown();
    }

    return;
  }

  event.preventDefault();
  selectTodoParentOption(optionButton.getAttribute("data-autocomplete-value") || "");
});

todoParentInput?.addEventListener("focus", renderTodoParentAutocomplete);
todoParentInput?.addEventListener("input", () => {
  if (!todoParentInput.value.trim() && todoParentIdInput) {
    todoParentIdInput.value = "";
  }

  renderTodoParentAutocomplete();
});

todoParentInput?.addEventListener("change", () => {
  if (todoParentIdInput) {
    const parentResolution = resolveTodoParentIdFromInput();
    todoParentIdInput.value = parentResolution.id || "";
  }
});

wantAddButton?.addEventListener("click", () => openWantItemDialog());
wantFilterToggle?.addEventListener("click", () => {
  shouldShowWantFilters = !shouldShowWantFilters;
  renderWantList();
});
wantCompareButton?.addEventListener("click", () => openRankingBattleDialog("want"));
wantRandomButton?.addEventListener("click", openWantRandomDialog);
wantRandomAgain?.addEventListener("click", renderRandomWantItem);
[wantRandomClose, wantRandomDone].forEach((button) => button?.addEventListener("click", closeWantRandomDialog));
wantNormalizeButton?.addEventListener("click", () => openRankingNormalizeDialog("want"));
wantSnapshotSelect?.addEventListener("change", () => {
  activeWantSnapshotId = wantSnapshotSelect.value || "current";
  activeWantViewMode = "calculated";
  renderWantList();
});
wantSnapshotCompareSelect?.addEventListener("change", () => {
  activeWantCompareSnapshotId = wantSnapshotCompareSelect.value || "";
  renderWantList();
});
wantViewModeButtons?.forEach((button) => button.addEventListener("click", () => {
  const mode = button.dataset.wantViewMode;
  if (!["manual", "calculated"].includes(mode)) return;
  activeWantViewMode = mode;
  if (mode === "calculated") shouldShowWantEditMode = false;
  renderWantList();
}));
wantEditToggle?.addEventListener("change", () => {
  shouldShowWantEditMode = Boolean(wantEditToggle.checked);
  activeWantItemId = "";
  renderWantList();
});
wantStatusFilters?.forEach((input) => input.addEventListener("change", () => {
  activeWantStatusFilter = input.checked ? input.dataset.wantStatusFilter || "" : "";
  renderWantList();
}));
wantList?.addEventListener("click", (event) => {
  const edit = event.target.closest("[data-want-edit]");
  const move = event.target.closest("[data-want-move]");
  const remove = event.target.closest("[data-want-delete]");
  if (edit) {
    event.preventDefault(); event.stopPropagation(); openWantItemDialog(edit.getAttribute("data-want-edit")); return;
  }
  if (move) {
    event.preventDefault(); event.stopPropagation(); openWantMoveDialog(move.getAttribute("data-want-move")); return;
  }
  if (remove) {
    event.preventDefault(); event.stopPropagation(); deleteWantItem(remove.getAttribute("data-want-delete")); return;
  }
  const card = event.target.closest("[data-want-id]");
  if (!card || !shouldShowWantEditMode || event.target.closest("button, a, input, select, textarea, label, .want-drag-handle")) return;
  activeWantItemId = activeWantItemId === card.getAttribute("data-want-id") ? "" : card.getAttribute("data-want-id") || "";
  renderWantList();
});
wantList?.addEventListener("keydown", (event) => {
  if (!["Enter", " "].includes(event.key) || event.target.closest("button, a, input, select, textarea, label, .want-drag-handle")) return;
  const card = event.target.closest("[data-want-id]");
  if (!card || !shouldShowWantEditMode) return;
  event.preventDefault();
  activeWantItemId = activeWantItemId === card.getAttribute("data-want-id") ? "" : card.getAttribute("data-want-id") || "";
  renderWantList();
});
wantItemForm?.addEventListener("submit", (event) => { event.preventDefault(); saveWantItemFromForm(); });
[wantItemClose, wantItemCancel].forEach((button) => button?.addEventListener("click", closeWantItemDialog));
[wantMoveClose, wantMoveCancel].forEach((button) => button?.addEventListener("click", closeWantMoveDialog));
wantMoveConfirm?.addEventListener("click", confirmWantMove);

rankingTabs?.forEach((tab) => {
  tab.addEventListener("click", () => {
    setActiveRankingKind(tab.dataset.rankingTab);
  });
});

rankingAddButton?.addEventListener("click", () => {
  openRankingItemDialog(activeRankingKind);
});

rankingCompareButton?.addEventListener("click", () => {
  openRankingBattleDialog(activeRankingKind);
});

rankingFilterToggle?.addEventListener("click", () => {
  shouldShowRankingFilters = !shouldShowRankingFilters;
  syncRankingControls();
});

rankingMoreDataToggle?.addEventListener("change", () => {
  shouldShowRankingMoreData = Boolean(rankingMoreDataToggle.checked);
  renderRankingLists();
});

rankingShowExcludedToggle?.addEventListener("change", () => {
  shouldShowRankingExcluded = Boolean(rankingShowExcludedToggle.checked);
  renderRankingLists();
});

rankingShowArchivedToggle?.addEventListener("change", () => {
  shouldShowRankingArchived = Boolean(rankingShowArchivedToggle.checked);
  renderRankingLists();
});

rankingManagerSelect?.addEventListener("change", () => {
  activeRankingManagerId = rankingManagerSelect.value || getCurrentManagerId();
  activeRankingViewMode = "manual";
  shouldShowRankingArchived = false;
  resetRankingManagerData();
  renderRankingsPage();
});

rankingSnapshotSelect?.addEventListener("change", () => {
  activeRankingSnapshotId = rankingSnapshotSelect.value || "current";
  renderRankingLists();
});

rankingCompareSelect?.addEventListener("change", () => {
  activeRankingCompareSnapshotId = rankingCompareSelect.value || "";
  renderRankingLists();
});

rankingNormalizeButton?.addEventListener("click", () => {
  openRankingNormalizeDialog();
});

rankingViewModeButtons?.forEach((button) => {
  button.addEventListener("click", () => {
    const mode = button.dataset.rankingViewMode;

    if (!["manual", "calculated"].includes(mode)) {
      return;
    }

    activeRankingViewMode = mode;
    renderRankingLists();
  });
});

rankingItemForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  saveRankingItemFromForm();
});

[rankingItemClose, rankingItemCancel].forEach((button) => {
  button?.addEventListener("click", closeRankingItemDialog);
});

[rankingBattleClose, rankingBattleDone].forEach((button) => {
  button?.addEventListener("click", closeRankingBattleDialog);
});

[rankingNormalizeClose, rankingNormalizeCancel].forEach((button) => {
  button?.addEventListener("click", closeRankingNormalizeDialog);
});

rankingNormalizeConfirm?.addEventListener("click", () => {
  normalizeActiveRanking();
});

rankingBattleSkip?.addEventListener("click", () => {
  renderNextRankingBattle(activeRankingBattle?.kind || activeRankingKind);
});

rankingBattleOptions?.addEventListener("click", (event) => {
  const exclusionAction = event.target.closest("[data-ranking-battle-exclude]");

  if (exclusionAction) {
    event.preventDefault();
    event.stopPropagation();
    setRankingItemExcluded(
      exclusionAction.getAttribute("data-ranking-kind") || activeRankingKind,
      exclusionAction.getAttribute("data-ranking-battle-exclude") || "",
      true
    );
    return;
  }

  const option = event.target.closest("[data-ranking-battle-pick]");

  if (!option) {
    return;
  }

  chooseRankingBattleWinner(option.getAttribute("data-ranking-battle-pick") || "");
});

document.addEventListener("click", (event) => {
  const emptyAddAction = event.target.closest("[data-ranking-empty-add]");
  if (emptyAddAction) {
    event.preventDefault();
    openRankingItemDialog(emptyAddAction.getAttribute("data-ranking-empty-add") || activeRankingKind);
    return;
  }
  const editAction = event.target.closest("[data-ranking-edit]");
  if (editAction) {
    event.preventDefault();
    event.stopPropagation();
    openRankingItemDialog(editAction.getAttribute("data-ranking-kind") || activeRankingKind, editAction.getAttribute("data-ranking-edit") || "");
    return;
  }
  const archiveAction = event.target.closest("[data-ranking-archive]");
  if (archiveAction) {
    event.preventDefault();
    event.stopPropagation();
    const kind = archiveAction.getAttribute("data-ranking-kind") || activeRankingKind;
    const itemId = archiveAction.getAttribute("data-ranking-archive") || "";
    const item = getRankingRows(kind).find((row) => String(row.id) === String(itemId));
    setRankingItemArchived(kind, itemId, !item?.archived);
    return;
  }
  const exclusionAction = event.target.closest("[data-ranking-exclusion-toggle]");

  if (exclusionAction) {
    event.preventDefault();
    event.stopPropagation();
    const kind = exclusionAction.getAttribute("data-ranking-kind") || activeRankingKind;
    const itemId = exclusionAction.getAttribute("data-ranking-exclusion-toggle") || "";
    setRankingItemExcluded(kind, itemId, !isRankingItemExcluded(kind, itemId));
    return;
  }

  const rankingItem = event.target.closest(".ranking-item");

  if (!rankingItem) {
    document.querySelectorAll(".ranking-item.is-actions-open").forEach((item) => {
      item.classList.remove("is-actions-open");
    });
    return;
  }

  if (event.target.closest("button, a, input, select, textarea, label, [role='button']")) {
    return;
  }

  document.querySelectorAll(".ranking-item.is-actions-open").forEach((item) => {
    if (item !== rankingItem) {
      item.classList.remove("is-actions-open");
    }
  });
  rankingItem.classList.toggle("is-actions-open");
});

document.addEventListener("dragstart", (event) => {
  const item = event.target.closest("[data-ranking-id]");

  if (!item || !canEditActiveRankingManager() || activeRankingViewMode !== "manual" || activeRankingSnapshotId !== "current") {
    return;
  }

  draggedRankingItemId = item.getAttribute("data-ranking-id") || "";
  event.dataTransfer?.setData("text/plain", draggedRankingItemId);
  event.dataTransfer && (event.dataTransfer.effectAllowed = "move");
  item.classList.add("is-dragging");
});

document.addEventListener("dragend", (event) => {
  event.target.closest("[data-ranking-id]")?.classList.remove("is-dragging");
  draggedRankingItemId = "";
});

document.addEventListener("dragover", (event) => {
  if (!draggedRankingItemId || !event.target.closest("[data-ranking-id]")) {
    return;
  }

  event.preventDefault();
});

document.addEventListener("drop", (event) => {
  const target = event.target.closest("[data-ranking-id]");

  if (!target || !draggedRankingItemId) {
    return;
  }

  event.preventDefault();
  moveRankingItem(
    target.getAttribute("data-ranking-kind") || activeRankingKind,
    draggedRankingItemId,
    target.getAttribute("data-ranking-id") || "",
  );
  draggedRankingItemId = "";
  draggedRankingKind = "";
});

document.addEventListener("pointerdown", (event) => {
  const handle = event.target.closest(".ranking-drag-handle");
  const item = handle?.closest("[data-ranking-id]");

  if (!item || !canEditActiveRankingManager() || activeRankingViewMode !== "manual" || activeRankingSnapshotId !== "current") {
    return;
  }

  draggedRankingItemId = item.getAttribute("data-ranking-id") || "";
  draggedRankingKind = item.getAttribute("data-ranking-kind") || activeRankingKind;
  didMoveRankingPointer = false;

  if (!draggedRankingItemId || !RANKING_CONFIG[draggedRankingKind]) {
    draggedRankingItemId = "";
    draggedRankingKind = "";
    return;
  }

  event.preventDefault();
  item.classList.add("is-dragging");
  handle.setPointerCapture?.(event.pointerId);
}, true);

document.addEventListener("pointermove", (event) => {
  if (!draggedRankingItemId || !draggedRankingKind) {
    return;
  }

  event.preventDefault();

  const target = document.elementFromPoint(event.clientX, event.clientY)?.closest("[data-ranking-id]");

  if (!target || target.getAttribute("data-ranking-kind") !== draggedRankingKind) {
    return;
  }

  const targetId = target.getAttribute("data-ranking-id") || "";

  if (moveRankingItem(draggedRankingKind, draggedRankingItemId, targetId, { shouldSubmit: false })) {
    didMoveRankingPointer = true;
    getRankingItemElement(draggedRankingKind, draggedRankingItemId)?.classList.add("is-dragging");
  }
}, true);

document.addEventListener("pointerup", () => {
  if (!draggedRankingItemId || !draggedRankingKind) {
    return;
  }

  getRankingItemElement(draggedRankingKind, draggedRankingItemId)?.classList.remove("is-dragging");

  if (didMoveRankingPointer) {
    submitRankingOrder(draggedRankingKind);
  }

  draggedRankingItemId = "";
  draggedRankingKind = "";
  didMoveRankingPointer = false;
}, true);

document.addEventListener("pointercancel", () => {
  if (draggedRankingItemId) {
    getRankingItemElement(draggedRankingKind, draggedRankingItemId)?.classList.remove("is-dragging");
  }

  draggedRankingItemId = "";
  draggedRankingKind = "";
  didMoveRankingPointer = false;
});

document.addEventListener("dragstart", (event) => {
  const item = event.target.closest("[data-want-id]");
  if (!item || !isCurrentManagerAdmin() || !shouldShowWantEditMode || !event.target.closest(".want-drag-handle")) return;
  draggedWantItemId = item.getAttribute("data-want-id") || "";
  event.dataTransfer?.setData("text/plain", draggedWantItemId);
  if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
  item.classList.add("is-dragging");
});
document.addEventListener("dragend", (event) => {
  event.target.closest("[data-want-id]")?.classList.remove("is-dragging");
  draggedWantItemId = "";
});
document.addEventListener("dragover", (event) => {
  if (draggedWantItemId && event.target.closest("[data-want-id]")) event.preventDefault();
});
document.addEventListener("drop", (event) => {
  const target = event.target.closest("[data-want-id]");
  if (!target || !draggedWantItemId) return;
  event.preventDefault();
  moveWantItem(draggedWantItemId, target.getAttribute("data-want-id") || "");
  draggedWantItemId = "";
});

document.addEventListener("pointerdown", (event) => {
  const handle = event.target.closest(".want-drag-handle");
  const item = handle?.closest("[data-want-id]");
  if (!item || !isCurrentManagerAdmin() || !shouldShowWantEditMode) return;
  draggedWantItemId = item.getAttribute("data-want-id") || "";
  didMoveWantPointer = false;
  if (!draggedWantItemId) return;
  event.preventDefault();
  item.classList.add("is-dragging");
  handle.setPointerCapture?.(event.pointerId);
}, true);
document.addEventListener("pointermove", (event) => {
  if (!draggedWantItemId) return;
  const target = document.elementFromPoint(event.clientX, event.clientY)?.closest("[data-want-id]");
  const targetId = target?.getAttribute("data-want-id") || "";
  if (targetId && targetId !== draggedWantItemId) {
    event.preventDefault();
    if (moveWantItem(draggedWantItemId, targetId, { shouldSubmit: false })) didMoveWantPointer = true;
  }
}, true);
document.addEventListener("pointerup", () => {
  if (!draggedWantItemId) return;
  wantList?.querySelector(`[data-want-id="${CSS.escape(draggedWantItemId)}"]`)?.classList.remove("is-dragging");
  if (didMoveWantPointer) submitWantOrder();
  draggedWantItemId = "";
  didMoveWantPointer = false;
}, true);

document.addEventListener("dragstart", (event) => {
  const item = event.target.closest("[data-todo-id]");

  if (!item || !isCurrentManagerAdmin() || !shouldShowTodoEditMode || !event.target.closest(".todo-drag-handle")) {
    return;
  }

  draggedTodoItemId = item.getAttribute("data-todo-id") || "";
  event.dataTransfer?.setData("text/plain", draggedTodoItemId);
  event.dataTransfer && (event.dataTransfer.effectAllowed = "move");
  item.classList.add("is-dragging");
});

document.addEventListener("dragend", (event) => {
  event.target.closest("[data-todo-id]")?.classList.remove("is-dragging");
  draggedTodoItemId = "";
  didMoveTodoPointer = false;
});

document.addEventListener("dragover", (event) => {
  if (!draggedTodoItemId || !event.target.closest("[data-todo-id]")) {
    return;
  }

  event.preventDefault();
});

document.addEventListener("drop", (event) => {
  const target = event.target.closest("[data-todo-id]");

  if (!target || !draggedTodoItemId) {
    return;
  }

  event.preventDefault();
  moveTodoItem(draggedTodoItemId, target.getAttribute("data-todo-id") || "");
  draggedTodoItemId = "";
  didMoveTodoPointer = false;
});

document.addEventListener("pointerdown", (event) => {
  const handle = event.target.closest(".todo-drag-handle");
  const item = handle?.closest("[data-todo-id]");

  if (!item || !isCurrentManagerAdmin() || !shouldShowTodoEditMode) {
    return;
  }

  draggedTodoItemId = item.getAttribute("data-todo-id") || "";
  didMoveTodoPointer = false;

  if (!draggedTodoItemId) {
    return;
  }

  event.preventDefault();
  item.classList.add("is-dragging");
  handle.setPointerCapture?.(event.pointerId);
}, true);

document.addEventListener("pointermove", (event) => {
  if (!draggedTodoItemId) {
    return;
  }

  event.preventDefault();

  const target = document.elementFromPoint(event.clientX, event.clientY)?.closest("[data-todo-id]");
  const targetId = target?.getAttribute("data-todo-id") || "";

  if (moveTodoItem(draggedTodoItemId, targetId, { shouldSubmit: false })) {
    didMoveTodoPointer = true;
    getTodoItemElement(draggedTodoItemId)?.classList.add("is-dragging");
  }
}, true);

document.addEventListener("pointerup", () => {
  if (!draggedTodoItemId) {
    return;
  }

  getTodoItemElement(draggedTodoItemId)?.classList.remove("is-dragging");

  if (didMoveTodoPointer) {
    submitTodoOrder();
  }

  draggedTodoItemId = "";
  didMoveTodoPointer = false;
}, true);

document.addEventListener("pointercancel", () => {
  if (draggedTodoItemId) {
    getTodoItemElement(draggedTodoItemId)?.classList.remove("is-dragging");
  }

  draggedTodoItemId = "";
  didMoveTodoPointer = false;
});

document.addEventListener("pointerdown", (event) => {
  if (!footyTeamFilter || !shouldShowFootyTeamOptions || footyTeamFilter.contains(event.target)) {
    return;
  }

  event.preventDefault();
  event.stopImmediatePropagation();
  shouldSuppressNextFootyDropdownClick = true;
  shouldShowFootyTeamOptions = false;
  renderFootySchedule(siteData.footySchedule);
}, true);

document.addEventListener("click", (event) => {
  if (!shouldSuppressNextFootyDropdownClick) {
    return;
  }

  event.preventDefault();
  event.stopImmediatePropagation();
  shouldSuppressNextFootyDropdownClick = false;
}, true);

Object.entries(formulaOneViews).forEach(([year, view]) => {
  view.calculator?.addEventListener("change", (event) => {
    const data = siteData[`formulaOne${year}Calculator`];
    if (!data) {
      return;
    }

    const state = getFormulaOneCalculatorState(year, data);
    const filter = event.target.closest("[data-formula-one-calculator-filter]");
    if (filter) {
      if (filter.checked) {
        state.visibleDrivers.add(filter.dataset.driver);
      } else {
        state.visibleDrivers.delete(filter.dataset.driver);
      }
      persistFormulaOneCalculatorState(year, data, state);
      renderFormulaOneCalculator(year);
      return;
    }

    const positionSelect = event.target.closest("[data-formula-one-calculator-position]");
    if (positionSelect) {
      const tableScrollLeft = positionSelect.closest(".formula-one-calculator-table-wrap")?.scrollLeft ?? 0;
      const key = getFormulaOneCalculatorSelectionKey(
        positionSelect.dataset.eventType,
        positionSelect.dataset.roundId,
        positionSelect.dataset.driver
      );
      if (positionSelect.value) {
        state.selections[key] = positionSelect.value;
      } else {
        delete state.selections[key];
      }
      persistFormulaOneCalculatorState(year, data, state);
      renderFormulaOneCalculator(year);
      const tableWrap = view.calculator.querySelector(".formula-one-calculator-table-wrap");
      if (tableWrap) {
        tableWrap.scrollLeft = tableScrollLeft;
      }
    }
  });

  view.calculator?.addEventListener("click", (event) => {
    const filterToggle = event.target.closest("[data-formula-one-calculator-filter-toggle]");
    const showAllButton = event.target.closest("[data-formula-one-calculator-show-all]");
    const hideAllButton = event.target.closest("[data-formula-one-calculator-hide-all]");
    if (!filterToggle && !showAllButton && !hideAllButton) {
      return;
    }

    const data = siteData[`formulaOne${year}Calculator`];
    if (!data) {
      return;
    }

    const state = getFormulaOneCalculatorState(year, data);
    if (filterToggle) {
      state.filtersExpanded = !state.filtersExpanded;
      renderFormulaOneCalculator(year);
      return;
    }

    state.visibleDrivers = new Set(showAllButton ? data.driversToWatch : []);
    persistFormulaOneCalculatorState(year, data, state);
    renderFormulaOneCalculator(year);
  });

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

    loadVisibleFormulaOneFormIframes(view.weeklyForm, year);
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
  setLoginFeedback("");
}

function hydrateManagerSession() {
  hydrateStoredManagerSession();
  renderLoginState();
  renderManagerHub();
}

function hydrateStoredManagerSession() {
  try {
    const rawSession = localStorage.getItem(MANAGER_SESSION_STORAGE_KEY);
    siteData.managerSession = rawSession ? JSON.parse(rawSession) : null;
  } catch {
    siteData.managerSession = null;
  }
}

function saveManagerSession(session) {
  siteData.managerSession = session;
  activeRankingManagerId = String(session?.managerId || "");
  resetRankingManagerData();

  try {
    localStorage.setItem(MANAGER_SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Session persistence is helpful, but the in-memory session is enough for this visit.
  }

  renderLoginState();
  renderManagerHub();

  if (activePageName === "manager-hub") {
    pageDataPromises.delete("manager-hub");
    sharedDataPromises.delete("manager-hub");
    void ensurePageData("manager-hub");
  }
}

function signOutManager() {
  siteData.managerSession = null;
  activeRankingManagerId = "";
  resetRankingManagerData();

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

  adminOnlyElements.forEach((element) => {
    element.hidden = !managerMeta?.isAdmin;
  });
  nonAdminOnlyElements.forEach((element) => {
    element.hidden = !managerMeta || managerMeta.isAdmin;
  });
  loginOnlyElements.forEach((element) => {
    element.hidden = !managerMeta;
  });
  syncFootyGoalAssistsButton();

  if (
    (!managerMeta && activePageName === "rankings") ||
    (!managerMeta && activePageName === "guides") ||
    (!managerMeta?.isAdmin && ["todo", "want", "youtube", "the-monster-maniac"].includes(activePageName))
  ) {
    showPage("footy", { scrollToTop: true });
  }

  if (!managerMeta?.isAdmin && nationTestScoringToggle?.checked) {
    nationTestScoringToggle.checked = false;
    syncTestScoringUi();
  }

  if (!managerMeta?.isAdmin && nextEditModeFilter?.checked) {
    nextEditModeFilter.checked = false;
    activeNextItemId = "";
  }

  if (!managerMeta) {
    activeRankingViewMode = "manual";
    shouldShowRankingFilters = false;
    shouldShowRankingMoreData = false;
  }

  if (!managerMeta?.isAdmin) {
    if (nextCompletedFilter) {
      nextCompletedFilter.checked = false;
    }

    if (nextNonAdminFilter) {
      nextNonAdminFilter.checked = false;
    }

    if (nextPriorityMin) {
      nextPriorityMin.value = "0";
    }

    if (nextPriorityMax) {
      nextPriorityMax.value = "10";
    }
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

  syncSiteVersionDisplay(managerMeta);
  syncBrandLogo();
  renderNextList();
  renderRankingsPage();
}

function syncSiteVersionDisplay() {
  if (!siteVersion) {
    return;
  }

  siteVersion.textContent = `v${SITE_VERSION}`;
  siteVersion.hidden = false;
}

function syncBrandLogo() {
  if (!brandLogo) {
    return;
  }

  brandLogo.src = window.location.pathname.includes("/dev/")
    ? "assets/dev-apple-touch-icon.png"
    : "assets/box-this-lap-logo.jpg";
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
        passphrase: normalizeLoginInput(passphrase),
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
        passphrase: normalizeLoginInput(passphrase),
      });
    }

    if (!response?.ok) {
      throw new Error(response?.error || "Login was not accepted.");
    }

    const manager = getPortalManagerById(managerId) ?? response.manager ?? { id: managerId, name: response.displayName };
    let rankingAuth = response.rankingAuth || null;
    if (!rankingAuth) {
      try {
        rankingAuth = await requestRankingAuthorizationForLogin(managerId, passphrase);
      } catch (error) {
        recordDiagnostic("ranking login authorization failed", error);
      }
    }
    saveManagerSession({
      manager,
      managerId: String(managerId),
      rankingAuth,
      signedInAt: new Date().toISOString(),
    });
    setCachedManagerAuthStatus(managerId, { hasPassphrase: true, mustReset: false, recoveryQuestion: "" });
    document.activeElement?.blur?.();
    hideLoginPanel();
    const destination = getManagerMeta(manager).isAdmin ? "the-monster-maniac" : "manager-hub";
    showPage(destination, { scrollToTop: true });
    window.location.hash = destination;
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

  if (normalizeLoginInput(passphrase) !== normalizeLoginInput(confirmation)) {
    loginConfirmPassphraseInput?.focus();
    throw new Error("Passphrases do not match.");
  }
}

function normalizeLoginInput(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
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

  if (!managerId) {
    renderLoginMode({ isIdle: true });
    return;
  }

  if (options.skipRemoteCheck) {
    renderLoginMode({ isIdle: true });
    return;
  }

  const cachedStatus = getCachedManagerAuthStatus(managerId);

  if (cachedStatus && !isManagerAuthStatusExpired(cachedStatus)) {
    renderLoginMode(cachedStatus);
    setLoginFeedback("");
  } else {
    // Keep the standard passphrase field writable while setup status is checked.
    // A slow auth-status request should never make the login form feel broken.
    renderLoginMode({ hasPassphrase: true });
    loginSubmitButton.disabled = true;
    setLoginFeedback("Checking manager setup...");
  }

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
    if (cachedStatus && !isManagerAuthStatusExpired(cachedStatus)) {
      console.warn("Unable to refresh manager setup; using cached status.", error);
      recordDiagnostic("manager auth status refresh failed", error);
      setLoginFeedback("");
    } else {
      setLoginFeedback(error.message, true);
    }
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
  const statusWithCacheTime = {
    ...status,
    cachedAt: Date.now(),
  };
  siteData.managerAuthStatus = {
    ...(siteData.managerAuthStatus || {}),
    [String(managerId)]: statusWithCacheTime,
  };
  persistManagerAuthStatusCache();
}

function isManagerAuthStatusExpired(status) {
  const cachedAt = Number(status?.cachedAt || 0);
  return !cachedAt || Date.now() - cachedAt > MANAGER_AUTH_STATUS_CACHE_MS;
}

function hydrateManagerAuthStatusCache() {
  try {
    const rawCache = localStorage.getItem(MANAGER_AUTH_STATUS_STORAGE_KEY);
    const cache = rawCache ? JSON.parse(rawCache) : {};
    siteData.managerAuthStatus = Object.fromEntries(
      Object.entries(cache || {}).filter(([, status]) => !isManagerAuthStatusExpired(status))
    );
  } catch {
    siteData.managerAuthStatus = {};
  }
}

function persistManagerAuthStatusCache() {
  try {
    localStorage.setItem(MANAGER_AUTH_STATUS_STORAGE_KEY, JSON.stringify(siteData.managerAuthStatus || {}));
  } catch {
    // Auth status cache is only a speed hint; login itself still works without it.
  }
}

function submitManagerPortalPayload(payload) {
  if (!MANAGER_PORTAL_ENDPOINT) {
    return Promise.reject(new Error("Manager login endpoint is not configured yet."));
  }

  const callbackId = `manager-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const callbackName = `boxThisLapManagerPortal${Date.now()}${Math.random().toString(36).slice(2)}`;
  const fullPayload = {
    ...payload,
    callback: callbackName,
    callbackId,
    pageUrl: window.location.href,
    browser: window.navigator.userAgent,
  };

  return submitManagerPortalPayloadWithCallback(fullPayload, callbackName)
    .catch((error) => {
      console.warn("Box This Lap manager portal callback request failed; trying form fallback.", error);
      recordDiagnostic("manager portal callback request failed", error);

      const fallbackPayload = { ...fullPayload };
      delete fallbackPayload.callback;
      return submitManagerPortalPayloadWithForm(fallbackPayload);
    });
}

function submitManagerPortalPayloadWithCallback(fullPayload, callbackName) {
  return new Promise((resolve, reject) => {
    let script;
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("No response from the login endpoint. Redeploy the Apps Script web app if the code changed."));
    }, 12000);

    function cleanup() {
      window.clearTimeout(timeout);
      delete window[callbackName];
      script?.remove();
    }

    window[callbackName] = (data) => {
      if (!data || data.source !== "boxthislap-manager-portal" || data.callbackId !== fullPayload.callbackId) {
        return;
      }

      cleanup();
      resolve(data);
    };

    const url = new URL(MANAGER_PORTAL_ENDPOINT);
    url.searchParams.set("payload", JSON.stringify(fullPayload));
    url.searchParams.set("callback", callbackName);
    script = document.createElement("script");
    script.async = true;
    script.src = url.toString();
    script.onerror = () => {
      cleanup();
      reject(new Error("Unable to reach the login endpoint."));
    };
    document.head.append(script);
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
  const iframeName = `manager-portal-frame-${payload.callbackId || Date.now()}`;

  return new Promise((resolve, reject) => {
    const iframe = document.createElement("iframe");
    iframe.name = iframeName;
    iframe.hidden = true;

    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("No response from the login endpoint. Redeploy the Apps Script web app if the code changed."));
    }, 12000);

    function cleanup() {
      window.clearTimeout(timeout);
      window.removeEventListener("message", handleMessage);
      iframe.remove();
    }

    function handleMessage(event) {
      const data = parsePortalMessage(event.data);

      if (!data || data.source !== "boxthislap-manager-portal" || data.callbackId !== payload.callbackId) {
        return;
      }

      cleanup();
      resolve(data);
    }

    window.addEventListener("message", handleMessage);
    document.body.append(iframe);

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
  });
}

function renderManagerHub() {
  const session = siteData.managerSession;

  if (!session) {
    if (managerHubSubtitle) {
      managerHubSubtitle.textContent = "";
      managerHubSubtitle.hidden = true;
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

  if (managerHubSubtitle) {
    managerHubSubtitle.textContent = "";
    managerHubSubtitle.hidden = true;
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
        ${draft.Priority ? `<span class="workflow-priority" title="Priority ${escapeHtml(draft.Priority)}" aria-label="Priority ${escapeHtml(draft.Priority)}"></span>` : ""}
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

  if (!nextForm || isWorkflowLeagueCompleted({ league: "Formula 1", terms: ["weekly"], year: "2026" })) {
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
    if (isWorkflowLeagueCompleted({ league: "Fantasy Critic", year })) {
      return [];
    }

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

function isWorkflowLeagueCompleted({ league = "", terms = [], year = "" } = {}) {
  return (siteData.portalDrafts || []).some((draft) => {
    if (!isTruthy(getField(draft, "IsCompleted", "Is Completed", "Completed"))) {
      return false;
    }

    if (year && String(draft.Year || "").trim() !== String(year)) {
      return false;
    }

    const draftText = normalizeLookupName([
      draft.League,
      draft.Name,
      draft.Type,
      draft.Category,
      draft.Standings,
    ].filter(Boolean).join(" "));
    const leagueKey = normalizeLookupName(league);

    if (leagueKey && !draftText.includes(leagueKey)) {
      return false;
    }

    return terms.every((term) => draftText.includes(normalizeLookupName(term)));
  });
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
        ${item.priority ? `<span class="workflow-priority" title="Priority ${escapeHtml(item.priority)}" aria-label="Priority ${escapeHtml(item.priority)}"></span>` : ""}
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
    selectedYear === "all" || selectedYear === "2025" ? renderFantasyOfficeManagerSummary(managerId, "2025") : "",
    selectedYear === "all" || selectedYear === "2026" ? renderFantasyOfficeManagerSummary(managerId, "2026") : "",
    selectedYear === "all" || selectedYear === "2024" ? renderFormulaOneManagerSummary(managerId, "2024") : "",
    selectedYear === "all" || selectedYear === "2025" ? renderFormulaOneManagerSummary(managerId, "2025") : "",
    selectedYear === "all" || selectedYear === "2026" ? renderFormulaOneManagerSummary(managerId, "2026") : "",
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

function renderLeagueAwards() {
  if (!leagueAwardsList) {
    return;
  }

  if (!siteData.managerSession) {
    leagueAwardsList.innerHTML = `<section class="manager-hub-card league-awards-group"><p class="table-message">Log in to load league awards.</p></section>`;
    return;
  }

  if (!siteData.portalDrafts) {
    leagueAwardsList.innerHTML = `<section class="manager-hub-card league-awards-group"><p class="table-message">Loading league awards...</p></section>`;
    return;
  }

  const awards = getResolvedAwards().sort((first, second) => {
    return Number(second.year || 0) - Number(first.year || 0) ||
      String(first.competition || "").localeCompare(String(second.competition || "")) ||
      String(first.label || "").localeCompare(String(second.label || ""));
  });

  if (!awards.length) {
    leagueAwardsList.innerHTML = `<section class="manager-hub-card league-awards-group"><p class="table-message">No completed league awards yet.</p></section>`;
    return;
  }

  const awardsByCompetition = new Map();

  awards.forEach((award) => {
    const competition = award.competition || "League Awards";
    const competitionAwards = awardsByCompetition.get(competition) || [];
    competitionAwards.push(award);
    awardsByCompetition.set(competition, competitionAwards);
  });

  leagueAwardsList.innerHTML = [...awardsByCompetition.entries()].map(([competition, competitionAwards]) => {
    const awardCount = competitionAwards.length;

    return `
      <section class="manager-hub-card league-awards-group">
        <div class="manager-hub-card-heading">
          <h2>${escapeHtml(competition)}</h2>
          <span>${awardCount} ${awardCount === 1 ? "award" : "awards"}</span>
        </div>
        <div class="league-awards-list">
          ${competitionAwards.map((award) => renderAwardCard(award, "league")).join("")}
        </div>
      </section>
    `;
  }).join("");
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
    siteData.formulaOne2026WeeklyResults?.standings?.length ||
    siteData.fantasyOffice2025?.results?.length ||
    siteData.fantasyOffice2026?.results?.length ||
    siteData.fantasyOffice2025?.draft?.length ||
    siteData.fantasyOffice2026?.draft?.length
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
      standings: ["players", "nations"],
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

function renderInProgressMarker(options = {}) {
  const draft = findResultStatusDraft(options);

  if (!draft || isTruthy(getField(draft, "IsCompleted", "Is Completed", "Completed"))) {
    return "";
  }

  return `
    <span class="status-pill status-pill--progress" title="This league is still in progress">
      <span aria-hidden="true"></span>
      <strong>In progress</strong>
    </span>
  `;
}

function findResultStatusDraft(options = {}) {
  return (siteData.portalDrafts || []).find((draft) => isResultDraftMatch(draft, options)) || null;
}

function isResultDraftMatch(draft, options = {}) {
  if (options.year && String(getField(draft, "Year")) !== String(options.year)) {
    return false;
  }

  const draftName = normalizeAwardMatchName(getField(draft, "Name", "Draft", "Award Name", "Award"));
  const league = normalizeAwardMatchName(getField(draft, "League"));
  const standings = String(options.standings || "");

  if (standings === "fantasy-critic") {
    return league === "fantasy critic" || draftName.includes("fantasy critic");
  }

  if (standings === "fantasy-office") {
    return league === "fantasy office" || draftName.includes("fantasy office");
  }

  if (standings === "formula-one-weekly") {
    return draftName.includes("formula 1 weekly");
  }

  if (standings === "formula-one-yearly") {
    return draftName.includes("formula 1 bets") && !draftName.includes("weekly");
  }

  if (standings === "players") {
    return draftName.includes("players championship");
  }

  if (standings === "nations") {
    return draftName.includes("nations league") || draftName.includes("nation league");
  }

  if (standings === "world-cup") {
    return draftName.includes("players championship") ||
      draftName.includes("nations league") ||
      draftName.includes("nation league");
  }

  return false;
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
    ? `<img class="award-card-image" src="${escapeHtml(award.image)}" alt="" decoding="async" loading="lazy">`
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
  const managerName = award.manager?.displayName || award.manager?.name || "";

  if (context === "manager") {
    return "";
  }

  if (context === "league" && managerName) {
    return `Winner: ${managerName}`;
  }

  return managerName;
}

function renderAwardBadge(award, context = "standings") {
  const label = award.label || "Award";
  const mark = award.image
    ? `<img src="${escapeHtml(award.image)}" alt="" decoding="async" loading="lazy">`
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

function renderFantasyOfficeManagerSummary(managerId, year) {
  const data = siteData[`fantasyOffice${year}`];
  const row = findFantasyOfficeManagerRow(managerId, data?.results ?? []);
  const draft = findFantasyOfficeDraftManager(managerId, data?.draft ?? []);

  if (!row && !draft) {
    return "";
  }

  const portalManager = getPortalManagerById(managerId);
  const managerName = row?.manager || draft?.manager || portalManager?.["Display Name"] || portalManager?.Name || "";
  const manager = getManagerByName(managerName) ?? portalManager ?? { name: managerName };
  const rankMarkup = row
    ? renderManagerSummaryRank("Overall", row, formatPoints, { standings: "fantasy-office", year })
    : `
      <span class="manager-summary-pending">
        <span>${escapeHtml(draft ? "Results pending" : "Manager entry pending")}</span>
        ${renderInProgressMarker({ standings: "fantasy-office", year })}
      </span>
    `;

  return `
    <article class="workflow-item">
      <header>
        <div>
          <h3>${escapeHtml(year)} Fantasy Office</h3>
          <p>${row ? "Movie result totals" : draft ? "Draft loaded; results pending" : "League loaded; manager entry pending"}</p>
        </div>
        ${renderManagerChip(manager)}
      </header>
      <div class="manager-summary-ranks manager-summary-ranks--single">
        ${rankMarkup}
      </div>
      <a class="action-button" href="#fantasy-office-${escapeHtml(year)}-results" data-page-link="fantasy-office-${escapeHtml(year)}-results">Open Results</a>
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

function findFantasyOfficeManagerRow(managerId, results) {
  const aliases = getManagerSummaryLookupNames(managerId);

  return results.find((row) => aliases.has(normalizeLookupName(row.manager))) || null;
}

function findFantasyOfficeDraftManager(managerId, draftRows) {
  const aliases = getManagerSummaryLookupNames(managerId);

  return draftRows.find((row) => aliases.has(normalizeLookupName(row.manager))) || null;
}

function getManagerSummaryLookupNames(managerId) {
  const portalManager = getPortalManagerById(managerId);
  const managerMeta = portalManager ? getManagerMeta(portalManager) : null;
  const values = [
    portalManager?.Name,
    portalManager?.["Display Name"],
    portalManager?.displayName,
    portalManager?.name,
    managerMeta?.name,
    managerMeta?.displayName,
  ];

  return new Set(values.map(normalizeLookupName).filter(Boolean));
}

function renderFormulaOneManagerSummary(managerId, year) {
  const yearlyRow = getFormulaOneYearlyManagerSummaryRow(managerId, year);
  const weeklyRow = getFormulaOneWeeklyManagerSummaryRow(managerId, year);
  const ranks = [
    renderManagerSummaryRank("Bets", yearlyRow, formatFormulaOnePointValue, { standings: "formula-one-yearly", year }),
    renderManagerSummaryRank("Weekly", weeklyRow, formatFormulaOnePointValue, { standings: "formula-one-weekly", year }),
  ].filter(Boolean);

  if (ranks.length === 0) {
    return "";
  }

  const managerName = yearlyRow?.manager || weeklyRow?.manager || "";
  const manager = getManagerByName(managerName) ?? { name: managerName };
  const summaryLabel = ranks.length === 2 ? "Bets and Weekly bets" : yearlyRow ? "Bet results" : "Weekly bet results";
  const rankClass = ranks.length === 1 ? "manager-summary-ranks--single" : "manager-summary-ranks--paired";

  return `
    <article class="workflow-item">
      <header>
        <div>
          <h3>${escapeHtml(year)} Formula 1</h3>
          <p>${escapeHtml(summaryLabel)}</p>
        </div>
        ${renderManagerChip(manager)}
      </header>
      <div class="manager-summary-ranks ${rankClass}">
        ${ranks.join("")}
      </div>
      <a class="action-button" href="#formula-1-${escapeHtml(year)}-results" data-page-link="formula-1-${escapeHtml(year)}-results">Open Results</a>
    </article>
  `;
}

function getFormulaOneYearlyManagerSummaryRow(managerId, year) {
  const data = siteData[`formulaOne${year}`];
  return findFormulaOneManagerRow(managerId, data?.standings ?? []);
}

function getFormulaOneWeeklyManagerSummaryRow(managerId, year) {
  const data = siteData[`formulaOne${year}WeeklyResults`] ?? siteData[`formulaOne${year}Weekly`];
  return findFormulaOneManagerRow(managerId, data?.standings ?? []);
}

function findFormulaOneManagerRow(managerId, standings) {
  const aliases = getManagerSummaryLookupNames(managerId);

  return standings.find((row) => aliases.has(normalizeLookupName(row.manager))) || null;
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
  const status = options.standings ? renderInProgressMarker(options) : "";

  return `
    <span class="manager-summary-rank">
      <small>${escapeHtml(label)}</small>
      ${status ? `<span class="manager-summary-status">${status}</span>` : ""}
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


function getPageDataScope(pageName = "") {
  const page = String(pageName || "");

  if (page === "footy" || page.startsWith("footy-team-") || page === "footy-goal-assists") {
    return "footy";
  }

  if (page === "next") {
    return "next";
  }

  if (page === "todo") {
    return "todo";
  }

  if (page === "want") {
    return "want";
  }

  if (page === "guides") {
    return "guides";
  }

  if (page === "youtube") {
    return "youtube";
  }

  if (page === "the-monster-maniac") {
    return "the-monster-maniac";
  }

  if (page === "rankings") {
    return "rankings";
  }

  if (page === "login") {
    return "login";
  }

  if (page === "manager-hub") {
    return "manager-hub";
  }

  if (page === "manager-awards") {
    return "manager-awards";
  }

  if (page === "results") {
    return "world-cup-results";
  }

  if (["today", "tomorrow", "matches"].includes(page)) {
    return "world-cup-matches";
  }

  if (["draft", "standings", "rules", "testing"].includes(page)) {
    return "world-cup-standings";
  }

  if (page === "bracket") {
    return "world-cup-bracket";
  }

  const fantasyCriticMatch = page.match(/^fantasy-critic-(2025|2026)$/);
  if (fantasyCriticMatch) {
    return `fantasy-critic-${fantasyCriticMatch[1]}`;
  }

  const formulaOneMatch = page.match(/^formula-1-(2024|2025|2026)-(questions|weekly|calculator|results)$/);
  if (formulaOneMatch) {
    const [, year, view] = formulaOneMatch;
    return `formula-one-${year}-${view}`;
  }

  const fantasyOfficeMatch = page.match(/^fantasy-office-(2025|2026)-(draft|movies|results)$/);
  if (fantasyOfficeMatch) {
    const [, year, view] = fantasyOfficeMatch;
    return `fantasy-office-${year}-${view}`;
  }

  return "";
}

function ensurePageData(pageName = activePageName) {
  const scope = getPageDataScope(pageName);

  if (!scope) {
    return Promise.resolve();
  }

  const existingPromise = pageDataPromises.get(scope);
  if (existingPromise) {
    return existingPromise;
  }

  const promise = Promise.resolve()
    .then(() => loadPageData(scope))
    .catch((error) => {
      recordDiagnostic(`${scope} page data failed to load`, error);
      renderPageDataError(scope, error);
      pageDataPromises.delete(scope);
    });

  pageDataPromises.set(scope, promise);
  return promise;
}

function ensureSharedData(key, loader) {
  const existingPromise = sharedDataPromises.get(key);
  if (existingPromise) {
    return existingPromise;
  }

  const promise = Promise.resolve()
    .then(loader)
    .catch((error) => {
      sharedDataPromises.delete(key);
      throw error;
    });

  sharedDataPromises.set(key, promise);
  return promise;
}

function loadPageData(scope) {
  if (scope === "footy") {
    return ensureFootyData();
  }

  if (scope === "next") {
    return ensureNextData();
  }

  if (scope === "todo") {
    return ensureTodoData();
  }

  if (scope === "want") {
    return ensureWantData();
  }

  if (scope === "guides") {
    guidesController.renderPage();
    return Promise.resolve();
  }

  if (scope === "youtube") {
    return youtubeInboxController.load();
  }

  if (scope === "the-monster-maniac") {
    return platinumsController.renderPage();
  }

  if (scope === "rankings") {
    return ensureRankingsLoaded();
  }

  if (scope === "login") {
    return ensurePortalManagersData();
  }

  if (scope === "manager-hub") {
    return ensureManagerHubData();
  }

  if (scope === "manager-awards") {
    if (!siteData.managerSession) {
      renderLeagueAwards();
      return ensurePortalManagersData();
    }

    return ensurePortalAwardsData().then(() => renderLeagueAwards());
  }

  if (scope === "world-cup-results") {
    return ensureWorldCupCoreData();
  }

  if (scope === "world-cup-matches") {
    return ensureWorldCupMatchData();
  }

  if (scope === "world-cup-standings") {
    return ensureWorldCupStandingsData();
  }

  if (scope === "world-cup-bracket") {
    return ensureWorldCupBracketData();
  }

  const fantasyCriticMatch = scope.match(/^fantasy-critic-(2025|2026)$/);
  if (fantasyCriticMatch) {
    return Promise.allSettled([
      ensureFantasyCriticData(fantasyCriticMatch[1]),
      ensurePortalData(),
    ]);
  }

  const formulaOneMatch = scope.match(/^formula-one-(2024|2025|2026)-(questions|weekly|calculator|results)$/);
  if (formulaOneMatch) {
    const [, year, view] = formulaOneMatch;
    if (view === "calculator") {
      return ensureFormulaOneCalculatorData(year);
    }
    const dataView = view === "results"
      ? (formulaOneResultsMode[year] === "weekly" ? "weekly-results" : "questions")
      : view;
    return ensureFormulaOneData(year, dataView);
  }

  const fantasyOfficeMatch = scope.match(/^fantasy-office-(2025|2026)-(draft|movies|results)$/);
  if (fantasyOfficeMatch) {
    const [, year, view] = fantasyOfficeMatch;
    return Promise.allSettled([
      ensureFantasyOfficeData(year, view),
      ...(view === "results" ? [ensurePortalData()] : []),
    ]);
  }

  return Promise.resolve();
}

function renderPageDataError(scope, error) {
  const message = getErrorMessage(error);

  if (scope === "footy" && !siteData.footySchedule && footyScheduleList) {
    renderFootyScheduleError(error);
  }

  if (scope === "next") {
    renderNextListError(error);
  }

  if (scope === "todo") {
    renderTodoListError(error);
  }

  if (scope === "want") {
    renderWantListError(error);
  }

  if (scope === "world-cup-results" && dynamicResultImages) {
    dynamicResultImages.innerHTML = `<p class="table-message">Unable to load result images: ${escapeHtml(message)}</p>`;
  }

  if (scope === "world-cup-bracket") {
    renderBracketError(error);
  }

  const formulaOneCalculatorMatch = scope.match(/^formula-one-(2024|2025|2026)-calculator$/);
  if (formulaOneCalculatorMatch) {
    renderFormulaOneCalculatorError(formulaOneCalculatorMatch[1], error);
  }
}

function getSettledLog(result) {
  if (result.status === "fulfilled") {
    return {
      rows: Array.isArray(result.value) ? result.value.length : null,
      status: "fulfilled",
    };
  }

  return {
    message: getErrorMessage(result.reason),
    status: "rejected",
  };
}

function getErrorMessage(error) {
  return error?.message || String(error || "Unknown error");
}

function recordDiagnostic(label, error, extra = {}) {
  const detail = {
    extra,
    label,
    message: getErrorMessage(error),
    stack: error?.stack || "",
    timestamp: new Date().toISOString(),
  };

  window.boxThisLapDiagnostics.push(detail);
  console.error(`Box This Lap diagnostic: ${label}`, detail);
  return detail;
}

function runPortalRender(label, render) {
  try {
    render();
  } catch (error) {
    recordDiagnostic(`${label} failed to render`, error);
  }
}

function ensureFootyData() {
  return ensureSharedData("footy", async () => {
    const schedule = await loadJson("data/footy-schedule.json");
    clearFootyScheduleMatchNotes(schedule);
    siteData.footySchedule = schedule;
    renderFollowedTeamShortcuts(schedule);
    renderFootySchedule(schedule);
    renderFootyTeamPage();
    startFootyNotificationMonitor();
    checkFootyMatchNotifications();
    console.info("Box This Lap footy schedule loaded", schedule);

    ensureFootyMatchNotes()
      .then((notes) => {
        if (notes.length) {
          renderFootySchedule(siteData.footySchedule);
          renderFootyTeamPage();
        }
        console.info("Box This Lap footy match notes loaded", notes);
      })
      .catch((error) => {
        siteData.footyMatchNotesError = error;
        recordDiagnostic("footy match notes failed to load", error);
      });

    return schedule;
  }).catch((error) => {
    siteData.footyScheduleError = error;
    throw error;
  });
}

function ensureNextData() {
  return ensureSharedData("next", async () => {
    const items = await loadSheet("next");
    siteData.nextItems = items;
    renderNextList(items);
    console.info("Box This Lap Next data loaded", items);
    return items;
  }).catch((error) => {
    siteData.nextItemsError = error;
    throw error;
  });
}

function ensureTodoData() {
  return ensureSharedData("todo", async () => {
    const response = await loadNextDataEndpoint("listTodoItems");
    const items = response.items || response.todoItems || [];

    siteData.todoItems = items;
    renderTodoList(items);
    console.info("Box This Lap To Do data loaded", items);
    return items;
  }).catch((error) => {
    siteData.todoItemsError = error;
    throw error;
  });
}

function ensureWantData() {
  return ensureSharedData("want", async () => {
    const response = await loadNextDataEndpoint("listWantItems");
    const items = response.items || response.wantItems || [];
    siteData.wantItems = items;
    renderWantList(items);
    console.info("Box This Lap Want data loaded", items);
    return items;
  }).catch((error) => {
    siteData.wantItemsError = error;
    throw error;
  });
}

function ensurePortalManagersData() {
  return ensureSharedData("portal-managers", async () => {
    try {
      siteData.portalManagers = await loadSheet("portalManagers");
    } catch (error) {
      siteData.portalManagers = [...DEFAULT_PORTAL_MANAGERS];
      siteData.portalManagersError = error;
      recordDiagnostic("manager portal managers failed to load", error);
    }

    renderLoginManagerOptions();
    renderLoginState();
    return siteData.portalManagers;
  });
}

function ensurePortalData() {
  return ensureSharedData("portal-data", async () => {
    const [awardsResult, logsResult] = await Promise.allSettled([
      ensurePortalAwardsData(),
      loadSheet("portalLogs"),
    ]);

    siteData.portalLogs = logsResult.status === "fulfilled" ? logsResult.value : [];

    console.info("Box This Lap manager portal load results", {
      awards: getSettledLog(awardsResult),
      logs: getSettledLog(logsResult),
    });

    [awardsResult, logsResult].forEach((result, index) => {
      if (result.status === "rejected") {
        recordDiagnostic(index === 0 ? "portal awards failed to load" : "portal logs failed to load", result.reason);
      }
    });

    runPortalRender("login manager options", renderLoginManagerOptions);
    runPortalRender("login state", renderLoginState);
    runPortalRender("manager hub", renderManagerHub);
    runPortalRender("league awards", renderLeagueAwards);
    runPortalRender("standings awards", renderStandingsAwards);
    runPortalRender("Fantasy Critic awards", renderFantasyCriticPage);
    runPortalRender("2025 Fantasy Office awards", () => renderFantasyOfficeResults(2025, siteData.fantasyOffice2025?.results || []));
    runPortalRender("2026 Fantasy Office awards", () => renderFantasyOfficeResults(2026, siteData.fantasyOffice2026?.results || []));
    runPortalRender("2024 Formula 1 awards", () => renderFormulaOneResults("2024"));
    runPortalRender("2025 Formula 1 awards", () => renderFormulaOneResults("2025"));
    runPortalRender("2026 Formula 1 awards", () => renderFormulaOneResults("2026"));
    return siteData.portalDrafts;
  });
}

function ensurePortalAwardsData() {
  return ensureSharedData("portal-awards", async () => {
    const [managersResult, draftsResult] = await Promise.allSettled([
      ensurePortalManagersData(),
      loadSheet("portalDrafts"),
    ]);

    if (managersResult.status === "fulfilled") {
      siteData.portalManagers = managersResult.value;
    }
    siteData.portalManagers ||= [...DEFAULT_PORTAL_MANAGERS];
    siteData.portalDrafts = draftsResult.status === "fulfilled" ? draftsResult.value : [];

    if (draftsResult.status === "rejected") {
      recordDiagnostic("portal drafts failed to load", draftsResult.reason);
    }

    runPortalRender("league awards", renderLeagueAwards);
    runPortalRender("standings awards", renderStandingsAwards);
    return siteData.portalDrafts;
  });
}

function ensureWorldCupCoreData() {
  return ensureSharedData("world-cup-core", async () => {
    const csvText = await loadSheetText("data");
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
      resultImages: siteData.resultImages,
      rounds: siteData.rounds,
      updatedTime: siteData.updatedTime,
    });
    return siteData.matches;
  }).catch((error) => {
    siteData.matchesError = error;
    renderMatchError(todayMatchList, error);
    renderMatchError(tomorrowMatchList, error);
    renderMatchError(matchdayMatchList, error);
    renderBracketError(error);
    throw error;
  });
}

function ensureWorldCupMatchData() {
  return ensureSharedData("world-cup-match-data", async () => {
    const results = await Promise.allSettled([
      ensureWorldCupCoreData(),
      loadPlayers(),
      loadSheet("playerPerformances"),
      loadSheet("matchResults"),
      loadSheet("teams"),
    ]);

    const [coreResult, playersResult, performancesResult, matchResultsResult, teamsResult] = results;

    if (playersResult.status === "fulfilled") {
      siteData.players = playersResult.value;
      siteData.playerPositionLookups = buildPlayerPositionLookups(playersResult.value);
      renderTestingPlayers(playersResult.value);
    } else {
      recordDiagnostic("World Cup player data failed to load", playersResult.reason);
      renderTestingError(playersResult.reason);
    }

    if (performancesResult.status === "fulfilled") {
      siteData.playerPerformances = performancesResult.value;
      renderPlayerChampionship(performancesResult.value);
    } else {
      recordDiagnostic("World Cup player performance data failed to load", performancesResult.reason);
      renderPlayerChampionshipError(performancesResult.reason);
    }

    if (matchResultsResult.status === "fulfilled") {
      siteData.matchResults = matchResultsResult.value;
      renderNationsLeague(matchResultsResult.value);
    } else {
      recordDiagnostic("World Cup match result data failed to load", matchResultsResult.reason);
      renderNationsLeagueError(matchResultsResult.reason);
    }

    if (teamsResult.status === "fulfilled") {
      siteData.teams = teamsResult.value;
      siteData.teamPots = buildTeamPotLookup(teamsResult.value);
    } else {
      recordDiagnostic("World Cup team data failed to load", teamsResult.reason);
    }

    renderDraftPage();
    renderCurrentMatchLists();
    renderFilteredStandings();
    renderRulesNationOptions();
    renderRulesNationBreakdown();
    renderBracket(siteData.bracketMatches);

    if (coreResult.status === "rejected") {
      throw coreResult.reason;
    }

    return siteData.matches;
  });
}

function ensureWorldCupStandingsData() {
  return ensureSharedData("world-cup-standings-data", async () => {
    await ensureWorldCupMatchData();
    const results = await Promise.allSettled([
      loadSheet("managers"),
      loadSheet("teamDraft"),
      loadSheet("playerDraft"),
    ]);
    const [managersResult, teamDraftResult, playerDraftResult] = results;

    siteData.managers = managersResult.status === "fulfilled" ? managersResult.value : [];
    siteData.teamDraft = teamDraftResult.status === "fulfilled" ? teamDraftResult.value : [];
    siteData.playerDraft = playerDraftResult.status === "fulfilled" ? playerDraftResult.value : [];
    siteData.managerDrafts = buildManagerDraftLookups({
      managers: siteData.managers,
      teamDraft: siteData.teamDraft,
      playerDraft: siteData.playerDraft,
    });
    siteData.managerResultsSource = {
      managers: siteData.managers,
      teamDraft: siteData.teamDraft,
      playerDraft: siteData.playerDraft,
      playerPerformances: siteData.playerPerformances || [],
      matchResults: siteData.matchResults || [],
    };

    results.forEach((result, index) => {
      if (result.status === "rejected") {
        recordDiagnostic(["World Cup managers", "World Cup nation drafts", "World Cup player drafts"][index] + " failed to load", result.reason);
      }
    });

    renderDraftPage();
    renderPlayerChampionship(siteData.playerPerformances || []);
    renderNationsLeague(siteData.matchResults || []);
    renderManagerResults(siteData.managerResultsSource);
    renderManagerHub();
    renderCurrentMatchLists();
    return siteData.managerResultsSource;
  });
}

function ensureWorldCupBracketData() {
  return ensureSharedData("world-cup-bracket-data", async () => {
    await ensureWorldCupCoreData();
    const [matchResultsResult, bracketPicksResult] = await Promise.allSettled([
      loadSheet("matchResults"),
      loadSheet("bracketPicks"),
    ]);

    siteData.matchResults = matchResultsResult.status === "fulfilled"
      ? matchResultsResult.value
      : [];

    if (matchResultsResult.status === "rejected") {
      recordDiagnostic("World Cup bracket match results failed to load", matchResultsResult.reason);
    }

    const result = await (bracketPicksResult.status === "fulfilled"
      ? Promise.resolve(bracketPicksResult.value)
      : Promise.reject(bracketPicksResult.reason))
      .then((rows) => {
        siteData.bracketSubmissions = parseBracketSubmissions(rows);
        return siteData.bracketSubmissions;
      })
      .catch((error) => {
        siteData.bracketSubmissionsError = error;
        recordDiagnostic("World Cup bracket submissions failed to load", error);
        siteData.bracketSubmissions = [];
        return [];
      });

    renderBracketSubmissionOptions(result);
    renderBracket(siteData.bracketMatches);
    return result;
  });
}

function ensureFormulaOneSource(key, loader, onLoaded, onError) {
  const cacheKey = `formula-one:${key}`;
  const existingPromise = formulaOneDataPromises.get(cacheKey);
  if (existingPromise) {
    return existingPromise;
  }

  const promise = Promise.resolve()
    .then(loader)
    .then((data) => {
      onLoaded(data);
      return data;
    })
    .catch((error) => {
      onError?.(error);
      recordDiagnostic(`${key} failed to load`, error);
      formulaOneDataPromises.delete(cacheKey);
      throw error;
    });

  formulaOneDataPromises.set(cacheKey, promise);
  return promise;
}

function refreshFormulaOnePage(year) {
  const page = activePageName;
  if (page === `formula-1-${year}-questions`) {
    renderFormulaOneQuestions(year);
  } else if (page === `formula-1-${year}-calculator`) {
    renderFormulaOneCalculator(year);
  } else if (page === `formula-1-${year}-weekly`) {
    renderFormulaOneWeeklyPage(year, siteData[`formulaOne${year}Weekly`]);
    renderFormulaOneWeeklyForm(year, siteData[`formulaOne${year}RoundForms`]);
  } else if (page === `formula-1-${year}-results`) {
    renderFormulaOneResults(year);
  }
  renderFormulaOneAwards(year);
}

function ensureFormulaOneCalculatorData(year) {
  const yearKey = String(year);
  const config = FORMULA_ONE_CALCULATOR_CONFIG[yearKey];

  if (!config) {
    const error = new Error(`Formula 1 points calculator is not configured for ${yearKey}.`);
    renderFormulaOneCalculatorError(yearKey, error);
    return Promise.reject(error);
  }

  return ensureFormulaOneSource(
    `formulaOne${yearKey}Calculator`,
    async () => {
      const [driversCsv, optionsCsv, sprintsCsv, summaryCsv] = await Promise.all([
        loadSheetText(config.driversSource),
        loadSheetText(config.optionsSource),
        loadSheetText(config.sprintsSource),
        loadSheetText(config.summarySource),
      ]);
      return parseFormulaOneCalculatorData({ driversCsv, optionsCsv, sprintsCsv, summaryCsv });
    },
    (data) => {
      siteData[`formulaOne${yearKey}Calculator`] = data;
      renderFormulaOneCalculator(yearKey);
    },
    (error) => renderFormulaOneCalculatorError(yearKey, error)
  );
}

function ensureFormulaOneData(year, view = "questions") {
  const yearKey = String(year);
  const sourceTasks = [ensureFormulaOneSource(
    `formulaOne${yearKey}`,
    () => loadSheetText(`formulaOne${yearKey}`),
    (csvText) => {
      const data = parseFormulaOneSheet(csvText);
      siteData[`formulaOne${yearKey}`] = data;
      renderFormulaOneLeague(yearKey, data);
    },
    (error) => renderFormulaOneError(yearKey, error)
  )];

  if ((view === "weekly" || view === "weekly-results") && ["2025", "2026"].includes(yearKey)) {
    sourceTasks.push(ensureFormulaOneSource(
      `formulaOne${yearKey}Weekly`,
      () => loadSheetText(`formulaOne${yearKey}Weekly`),
      (csvText) => {
        const data = parseFormulaOneWeeklySheet(csvText);
        siteData[`formulaOne${yearKey}Weekly`] = data;
        renderFormulaOneWeeklyPage(yearKey, data);
      },
      (error) => renderFormulaOneWeeklyError(yearKey, error)
    ));
  }

  if (view === "weekly-results" && yearKey === "2026") {
    sourceTasks.push(ensureFormulaOneSource(
      "formulaOne2026WeeklyResults",
      () => loadSheetText("formulaOne2026WeeklyResults"),
      (csvText) => {
        siteData.formulaOne2026WeeklyResults = parseFormulaOneWeeklyResultsSheet(csvText);
      }
    ));
  }

  if (view === "weekly" && yearKey === "2026") {
    sourceTasks.push(ensureFormulaOneSource(
      "formulaOne2026RoundForms",
      () => loadSheet("formulaOne2026RoundForms"),
      (rows) => {
        siteData.formulaOne2026RoundForms = parseFormulaOneRoundForms(rows);
        renderFormulaOneWeeklyForm(yearKey, siteData.formulaOne2026RoundForms);
      },
      (error) => {
        const form = formulaOneViews[2026]?.weeklyForm;
        if (form) {
          form.innerHTML = `<p class="table-message">Unable to load Formula 1 bet forms: ${escapeHtml(getErrorMessage(error))}</p>`;
        }
      }
    ));
  }

  return Promise.allSettled(sourceTasks).then((results) => {
    refreshFormulaOnePage(yearKey);
    if (activePageName === "manager-hub") {
      renderManagerHub();
    }
    return results;
  });
}

function ensureFantasyCriticData(year) {
  const yearKey = String(year);
  const existingPromise = fantasyCriticLoadPromises.get(yearKey);
  if (existingPromise) {
    return existingPromise;
  }

  const promise = loadFantasyCriticLeague(yearKey);
  fantasyCriticLoadPromises.set(yearKey, promise);
  return promise;
}

function ensureFantasyOfficeData(year, view) {
  const yearKey = String(year);
  const sourceName = view === "draft" ? `fantasyOffice${yearKey}Draft` : `fantasyOffice${yearKey}Results`;

  if (yearKey === "2026" && view !== "draft") {
    return Promise.resolve([]);
  }

  return ensureSharedData(`fantasy-office:${yearKey}:${view}`, async () => {
    if (view === "draft") {
      const csvText = await loadSheetText(sourceName);
      siteData[`fantasyOffice${yearKey}`].draft = parseFantasyOfficeDraft(csvText);
    } else {
      const csvText = await loadSheetText(sourceName);
      siteData[`fantasyOffice${yearKey}`].results = parseFantasyOfficeResults(csvText);
    }

    const data = siteData[`fantasyOffice${yearKey}`];
    if (view === "draft") {
      renderFantasyOfficeDraft(yearKey, data.draft);
    } else {
      renderFantasyOfficeMovies(yearKey, data.results);
      renderFantasyOfficeResults(yearKey, data.results);
    }
    renderManagerHub();
    return data;
  }).catch((error) => {
    if (view === "draft") {
      renderFantasyOfficeDraftError(yearKey, error);
    } else {
      renderFantasyOfficeMovieError(yearKey, error);
      renderFantasyOfficeResultsError(yearKey, error);
    }
    throw error;
  });
}

function ensureManagerHubData() {
  if (!siteData.managerSession) {
    return ensurePortalManagersData();
  }

  return ensureSharedData("manager-hub", async () => {
    await Promise.allSettled([
      ensurePortalData(),
      ensureWorldCupStandingsData(),
      ensureFantasyCriticData(2025),
      ensureFantasyCriticData(2026),
      ensureFantasyOfficeData(2025, "results"),
      ensureFantasyOfficeData(2026, "results"),
      ensureFormulaOneData(2024, "questions"),
      ensureFormulaOneData(2025, "questions"),
      ensureFormulaOneData(2026, "questions"),
      ensureFormulaOneData(2025, "weekly-results"),
      ensureFormulaOneData(2026, "weekly-results"),
    ]);
    renderManagerHub();
    return true;
  });
}

populateNextTimeOptions();
syncTestScoringUi();
syncThemeToggle();
initializeImageCache();
hydrateStoredManagerSession();
hydrateBracketSubmitter();
hydrateManagerAuthStatusCache();
hydrateManagerSession();
renderLeagueList(leagueYearSelect?.value || "2026");
showPage(window.location.hash.replace("#", "") || "footy");

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
    <option value="${BRACKET_MANUAL_PICK_VALUE}">Official</option>
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
    bracketClearPicks.hidden = BRACKET_SUBMISSIONS_ARCHIVED;
    bracketClearPicks.disabled = BRACKET_SUBMISSIONS_ARCHIVED || isViewingSubmission;
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
  if (BRACKET_SUBMISSIONS_ARCHIVED) {
    setBracketSubmitStatus("Bracket submissions are archived.", "error");
    return;
  }

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
  if (BRACKET_SUBMISSIONS_ARCHIVED) {
    setBracketSubmitStatus("Bracket picks are archived.", "error");
    return;
  }

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
  return Boolean(nationTestScoringToggle?.checked && isCurrentManagerAdmin());
}

function isCurrentManagerAdmin() {
  const session = siteData.managerSession;

  if (!session) {
    return false;
  }

  if (session.isAdmin) {
    return true;
  }

  const manager = getPortalManagerById(session.managerId) ?? session.manager;
  return Boolean(manager && getManagerMeta(manager).isAdmin);
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
