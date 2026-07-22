export const pageLinks = document.querySelectorAll("[data-page-link]");
export const pages = document.querySelectorAll("[data-page]");
export const tabs = document.querySelectorAll("[data-tab]");
export const tabPanels = document.querySelectorAll("[data-tab-panel]");
export const headerArt = document.querySelectorAll("[data-header-art]");
export const navGroups = document.querySelectorAll("[data-nav-scope]");
export const themeToggle = document.querySelector("[data-theme-toggle]");
export const copyCurrentPageLinkButton = document.querySelector("#copy-current-page-link");
export const testRulesLinks = document.querySelectorAll("[data-test-rules-link]");
export const loginOpenButton = document.querySelector("#login-open-button");
export const loginPanel = document.querySelector("#login-panel");
export const loginManagerSelect = document.querySelector("#login-manager-select");
export const loginPassphraseGroup = document.querySelector("#login-passphrase-group");
export const loginPassphraseInput = document.querySelector("#login-passphrase");
export const loginRecoveryPanel = document.querySelector("#login-recovery-panel");
export const loginRecoveryQuestion = document.querySelector("#login-recovery-question");
export const loginRecoveryAnswerInput = document.querySelector("#login-recovery-answer");
export const loginNewPassphrasePanel = document.querySelector("#login-new-passphrase-panel");
export const loginNewPassphraseInput = document.querySelector("#login-new-passphrase");
export const loginConfirmPassphraseInput = document.querySelector("#login-confirm-passphrase");
export const loginSubmitButton = document.querySelector("#login-submit-button");
export const loginFeedback = document.querySelector("#login-feedback");
export const profileMenu = document.querySelector("#profile-menu");
export const profileMenuButton = document.querySelector("#profile-menu-button");
export const profileDropdown = document.querySelector("#profile-dropdown");
export const profileName = document.querySelector("#profile-name");
export const logoutButton = document.querySelector("#logout-button");
export const managerHubSubtitle = document.querySelector("#manager-hub-subtitle");
export const workflowCount = document.querySelector("#workflow-count");
export const workflowList = document.querySelector("#workflow-list");
export const managerSummaryList = document.querySelector("#manager-summary-list");
export const managerSummaryYearSelect = document.querySelector("#manager-summary-year-select");
export const managerAwardsList = document.querySelector("#manager-awards-list");
export const standingsAwards = document.querySelector("#standings-awards");
export const standingsAwardsList = document.querySelector("#standings-awards-list");
export const leagueYearSelect = document.querySelector("#league-year-select");
export const leagueList = document.querySelector("#league-list");
export const footyPastToggle = document.querySelector("#footy-past-toggle");
export const footyFilterToggle = document.querySelector("#footy-filter-toggle");
export const footyFilters = document.querySelector("#footy-filters");
export const footySearchInput = document.querySelector("#footy-search");
export const footyDateFromFilter = document.querySelector("#footy-date-from-filter");
export const footyDateToFilter = document.querySelector("#footy-date-to-filter");
export const footyTeamFilter = document.querySelector("#footy-team-filter");
export const footyScheduleList = document.querySelector("#footy-schedule-list");
export const fantasyCritic2025Content = document.querySelector("#fantasy-critic-2025-content");
export const fantasyCritic2026Content = document.querySelector("#fantasy-critic-2026-content");
export const formulaOneViews = {
  2024: {
    questionSelect: document.querySelector("#formula-one-question-select"),
    questionFilter: document.querySelector("#formula-one-question-filter"),
    questionList: document.querySelector("#formula-one-question-list"),
    resultsRows: document.querySelector("#formula-one-results-rows"),
  },
  2025: {
    questionSelect: document.querySelector("#formula-one-2025-question-select"),
    questionFilter: document.querySelector("#formula-one-2025-question-filter"),
    questionList: document.querySelector("#formula-one-2025-question-list"),
    resultsModeButtons: document.querySelectorAll("[data-formula-one-results-mode][data-formula-one-results-year=\"2025\"]"),
    resultsRows: document.querySelector("#formula-one-2025-results-rows"),
    weeklyList: document.querySelector("#formula-one-2025-weekly-list"),
    weeklyRoundSelect: document.querySelector("#formula-one-2025-weekly-round-select"),
  },
  2026: {
    questionSelect: document.querySelector("#formula-one-2026-question-select"),
    questionFilter: document.querySelector("#formula-one-2026-question-filter"),
    questionList: document.querySelector("#formula-one-2026-question-list"),
    resultsModeButtons: document.querySelectorAll("[data-formula-one-results-mode][data-formula-one-results-year=\"2026\"]"),
    resultsRows: document.querySelector("#formula-one-2026-results-rows"),
    weeklyForm: document.querySelector("#formula-one-2026-weekly-form"),
    weeklyList: document.querySelector("#formula-one-2026-weekly-list"),
    weeklyManagers: document.querySelector("#formula-one-2026-weekly-managers"),
    weeklyRoundSelect: document.querySelector("#formula-one-2026-weekly-round-select"),
  },
};
export const fantasyOfficeViews = {
  2025: {
    draftList: document.querySelector("#fantasy-office-2025-draft-list"),
    movieList: document.querySelector("#fantasy-office-2025-movie-list"),
    resultList: document.querySelector("#fantasy-office-2025-result-list"),
  },
  2026: {
    draftList: document.querySelector("#fantasy-office-2026-draft-list"),
    movieList: document.querySelector("#fantasy-office-2026-movie-list"),
    resultList: document.querySelector("#fantasy-office-2026-result-list"),
  },
};
export const resultsPage = document.querySelector("#results");
export const updatedTime = document.querySelector("[data-updated-time]");
export const dynamicResultImages = document.querySelector("#dynamic-result-images");
export const todayMatchList = document.querySelector("#today-match-list");
export const tomorrowMatchList = document.querySelector("#tomorrow-match-list");
export const matchdaySelect = document.querySelector("#matchday-select");
export const matchdayMatchList = document.querySelector("#matchday-match-list");
export const bracketView = document.querySelector("#bracket-view");
export const bracketClearPicks = document.querySelector("#bracket-clear-picks");
export const bracketSubmissionSelect = document.querySelector("#bracket-submission-select");
export const bracketSubmitterInput = document.querySelector("#bracket-submitter");
export const bracketSubmitButton = document.querySelector("#bracket-submit-picks");
export const bracketSubmitStatus = document.querySelector("#bracket-submit-status");
export const draftViewButtons = document.querySelectorAll("[data-draft-view]");
export const draftPanels = document.querySelectorAll("[data-draft-panel]");
export const draftNationsList = document.querySelector("#draft-nations-list");
export const draftPlayersList = document.querySelector("#draft-players-list");
export const draftPlayerPositionFilter = document.querySelector("#draft-player-position-filter");
export const playerChampionshipRows = document.querySelector("#player-championship-rows");
export const playerPositionFilter = document.querySelector("#player-position-filter");
export const nationsLeagueRows = document.querySelector("#nations-league-rows");
export const managerResultsRows = document.querySelector("#manager-results-rows");
export const managerResultsFilter = document.querySelector("#manager-results-filter");
export const standingsAllDataToggle = document.querySelector("#standings-all-data-toggle");
export const standingsRoundSelect = document.querySelector("#standings-round-select");
export const nationTestScoringToggle = document.querySelector("#nation-test-scoring-toggle");
export const rulesNationSelect = document.querySelector("#rules-nation-select");
export const rulesNationBreakdown = document.querySelector("#rules-nation-breakdown");
export const testingPlayerRows = document.querySelector("#testing-player-rows");
