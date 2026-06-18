import { loadMatches, loadPlayers, loadSheet, loadSheetText } from "./dataLoader.js?v=202606170001";

const pageLinks = document.querySelectorAll("[data-page-link]");
const pages = document.querySelectorAll("[data-page]");
const tabs = document.querySelectorAll("[data-tab]");
const tabPanels = document.querySelectorAll("[data-tab-panel]");
const headerArt = document.querySelectorAll("[data-header-art]");
const navGroups = document.querySelectorAll("[data-nav-scope]");
const themeToggle = document.querySelector("[data-theme-toggle]");
const leagueYearSelect = document.querySelector("#league-year-select");
const leagueList = document.querySelector("#league-list");
const fantasyCritic2025Content = document.querySelector("#fantasy-critic-2025-content");
const fantasyCritic2026Content = document.querySelector("#fantasy-critic-2026-content");
const formulaOneViews = {
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
    resultsRows: document.querySelector("#formula-one-2025-results-rows"),
  },
};
const fantasyOfficeViews = {
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
const fantasyOfficeMovieSort = {
  direction: "desc",
  key: "points",
};
const resultCards = document.querySelectorAll("[data-result-card]");
const todayMatchList = document.querySelector("#today-match-list");
const tomorrowMatchList = document.querySelector("#tomorrow-match-list");
const matchdaySelect = document.querySelector("#matchday-select");
const matchdayMatchList = document.querySelector("#matchday-match-list");
const playerChampionshipRows = document.querySelector("#player-championship-rows");
const nationsLeagueRows = document.querySelector("#nations-league-rows");
const managerResultsRows = document.querySelector("#manager-results-rows");
const testingPlayerRows = document.querySelector("#testing-player-rows");

const siteData = {};
window.boxThisLapData = siteData;

const THEME_STORAGE_KEY = "boxThisLapTheme";

const MANAGER_COLORS = {
  jonathan: "#000000",
  jordan: "#b7a7dc",
  luisa: "#df000b",
  michael: "#123f7a",
  sean: "#f783bd",
  wyatt: "#96df7d",
};

const FANTASY_LEAGUES_BY_YEAR = {
  2024: ["Formula 1"],
  2025: ["Fantasy Critic", "Fantasy Office", "Formula 1"],
  2026: ["Fantasy Critic", "Fantasy Office", "Formula 1", "World Cup"],
};

const FANTASY_CRITIC_2025 = {
  title: "Fantasy Critic",
  subtitle: "Best of the Rest",
  sourceUrl: "https://www.fantasycritic.games/league/f29fddba-fa80-40bf-aa71-d062e6e80635/2025",
  standings: [
    {
      rank: 1,
      manager: "Wyatt",
      publisher: "JonesSoft",
      points: "169.79",
      released: "12",
      budget: "$0",
      roster: [
        ["Ghost of Yotei", "87", "17"],
        ["Split Fiction", "91", "21"],
        ["Sid Meier's Civilization VII", "79", "9"],
        ["Death Stranding 2: On the Beach", "90", "20"],
        ["Unannounced Mainline 3D Mario Platformer", "--", "0"],
        ["Avowed", "80", "10"],
        ["The Outer Worlds 2", "83", "13"],
        ["Rift of the NecroDancer", "80", "10"],
        ["Mario Kart World", "87", "17"],
        ["Clair Obscur: Expedition 33", "92", "24"],
        ["South of Midnight", "77", "7"],
        ["Ninja Gaiden 4", "82", "12"],
        ["Tails of Iron 2: Whiskers of Winter", "80", "10"],
        ["CPK Coffee Talk Tokyo", "--", "0"],
        ["CPK Arknights: Endfield", "--", "0"],
      ],
    },
    {
      rank: 2,
      manager: "Sean",
      publisher: "MicroHard Studios",
      points: "155.86",
      released: "12",
      budget: "$11",
      roster: [
        ["Like a Dragon: Pirate Yakuza in Hawaii", "81", "11"],
        ["Mafia: The Old Country", "74", "4"],
        ["Assassin's Creed Shadows", "81", "11"],
        ["Metroid Prime 4: Beyond", "81", "11"],
        ["Pokemon Legends: Z-A", "79", "9"],
        ["Wanderstop", "81", "11"],
        ["Xenoblade Chronicles X: Definitive Edition", "87", "17"],
        ["Ninja Gaiden: Ragebound", "86", "16"],
        ["Tony Hawk's Pro Skater 3 + 4", "83", "13"],
        ["Deltarune", "89", "19"],
        ["Donkey Kong Bananza", "91", "23"],
        ["The Elder Scrolls IV: Oblivion: Remastered", "82", "12"],
        ["Mina the Hollower", "--", "0"],
        ["CPK Subnautica 2", "--", "0"],
        ["CPK Garfield Kart 2 - All You Can Drift", "--", "--"],
      ],
    },
    {
      rank: 3,
      manager: "Michael",
      publisher: "Amazon Web Services powered by Gemini powered by OpenAI",
      points: "94.92",
      released: "9",
      budget: "$9",
      roster: [
        ["Monster Hunter Wilds", "89", "19"],
        ["Doom: The Dark Ages", "86", "16"],
        ["Kingdom Come: Deliverance II", "89", "19"],
        ["Borderlands 4", "82", "12"],
        ["Metal Gear Solid Delta: Snake Eater", "85", "15"],
        ["Little Nightmares III", "71", "1"],
        ["Subnautica 2", "--", "0"],
        ["Wreckfest 2", "--", "0"],
        ["Atomfall", "75", "5"],
        ["Hollow Knight: Silksong", "91", "22"],
        ["Garfield Kart 2 - All You Can Drift", "--", "--"],
        ["CPK Unannounced Mainline 3D Mario Platformer", "--", "0"],
        ["CPK", "--", "-15"],
      ],
    },
    {
      rank: 4,
      manager: "Jonathan",
      publisher: "Hispan!c Games",
      points: "-7.53",
      released: "3",
      budget: "$100",
      roster: [
        ["Elden Ring Nightreign", "80", "10"],
        ["Mewgenics", "--", "0"],
        ["Coffee Talk Tokyo", "--", "0"],
        ["The Bazaar", "--", "--"],
        ["Slay the Spire 2", "--", "0"],
        ["Citizen Sleeper 2: Starward Vector", "87", "17"],
        ["Arknights: Endfield", "--", "0"],
        ["CPK Death Stranding 2: On the Beach", "90", "-20"],
        ["CPK", "--", "-15"],
      ],
    },
  ],
};

const FANTASY_CRITIC_2026 = {
  title: "Fantasy Critic",
  subtitle: "Best of the Rest",
  sourceUrl: "https://www.fantasycritic.games/league/f29fddba-fa80-40bf-aa71-d062e6e80635/2026",
  standings: [
    {
      rank: 1,
      manager: "Sean",
      publisher: "Microhard Artisanal Studios",
      points: "96.61",
      projected: "160.98",
      released: "7",
      expecting: "4",
      budget: "$79",
      roster: [
        ["Grand Theft Auto VI", "", ""],
        ["007 First Light", "88", "18"],
        ["LEGO Batman: Legacy of the Dark Knight", "84", "14"],
        ["Fire Emblem: Fortune's Weave", "", ""],
        ["Dragon Quest VII Reimagined", "83", "13"],
        ["Phantom Blade Zero", "", ""],
        ["REANIMAL", "80", "10"],
        ["Silent Hill: Townfall", "", ""],
        ["Vampire Crawlers", "84", "14"],
        ["Yoshi and the Mysterious Book", "80", "10"],
        ["Mixtape", "87", "17"],
        ["CPK Fable", "--", "0"],
        ["CPK Warning!", "", ""],
      ],
    },
    {
      rank: 2,
      manager: "Wyatt",
      publisher: "Jones Public Investment Fund",
      points: "88.77",
      projected: "165.31",
      released: "5",
      expecting: "6",
      budget: "$48",
      roster: [
        ["Resident Evil Requiem", "89", "19"],
        ["Saros", "87", "17"],
        ["Control Resonant", "", ""],
        ["Pragmata", "86", "16"],
        ["Crimson Desert", "79", "9"],
        ["Marvel Tokon: Fighting Souls", "", ""],
        ["Trails in the Sky 2nd Chapter", "", ""],
        ["Fable", "--", "0"],
        ["Mina the Hollower", "91", "23"],
        ["Beast of Reincarnation", "", ""],
        ["Denshattack!", "", ""],
        ["Kena: Scars of Kosmora", "", ""],
        ["CPK Pokemon Champions", "65", "5"],
        ["CPK Tomb Raider: Legacy of Atlantis", "--", "0"],
      ],
    },
    {
      rank: 3,
      manager: "Jordan",
      publisher: "Pepper Publishing",
      points: "78.8",
      projected: "120.99",
      released: "5",
      expecting: "3",
      budget: "$100",
      roster: [
        ["Pokemon Pokopia", "89", "19"],
        ["Nioh 3", "85", "15"],
        ["Monster Hunter Stories 3: Twisted Reflection", "85", "15"],
        ["The Duskbloods", "", ""],
        ["Slay the Spire 2", "", ""],
        ["Gears of War: E-Day", "", ""],
        ["Mio: Memories in Orbit", "83", "13"],
        ["Cairn", "86", "16"],
        ["CPK Star Wars: Galactic Racer", "", ""],
        ["CPK Warning!", "", ""],
      ],
    },
    {
      rank: 4,
      manager: "Jonathan",
      publisher: "Emo Girl! Emergencies",
      points: "65.31",
      projected: "75.58",
      released: "8",
      expecting: "0",
      budget: "$100",
      roster: [
        ["Mewgenics", "89", "19"],
        ["Yakuza Kiwami 3 & Dark Ties", "74", "4"],
        ["High on Life 2", "73", "3"],
        ["Code Vein II", "73", "3"],
        ["Fatal Frame II: Crimson Butterfly Remake", "76", "6"],
        ["Coffee Talk Tokyo", "82", "12"],
        ["Mouse: P.I. For Hire", "81", "11"],
        ["Tomodachi Life: Living the Dream", "79", "9"],
        ["CPK Marvel Tokon: Fighting Souls", "", ""],
        ["CPK Warning!", "", ""],
      ],
    },
    {
      rank: 5,
      manager: "Michael",
      publisher: "Totalsoftware de Venezuela",
      points: "16.9",
      projected: "81",
      released: "2",
      expecting: "5",
      budget: "$100",
      roster: [
        ["Forza Horizon 6", "91", "22"],
        ["Star Wars: Galactic Racer", "", ""],
        ["Marvel's Wolverine", "", ""],
        ["Tomb Raider: Legacy of Atlantis", "--", "0"],
        ["Halo: Campaign Evolved", "", ""],
        ["Pokemon Champions", "65", "-5"],
        ["Ace Combat 8: Wings of Theve", "", ""],
        ["Unannounced Mainline 3D Mario Platformer", "", ""],
        ["CPK Grand Theft Auto VI", "", ""],
        ["CPK Warning!", "", ""],
      ],
    },
  ],
};

function showPage(pageName, options = {}) {
  const pageAliases = {
    "formula-1-2024": "formula-1-2024-questions",
    "formula-1-2025": "formula-1-2025-questions",
    "fantasy-office-2025": "fantasy-office-2025-results",
    "fantasy-office-2026": "fantasy-office-2026-draft",
    "manager-scores": "standings",
    "player-scores": "standings",
  };
  const resolvedPageName = pageAliases[pageName] || pageName;
  const allowedPageName = pageAliases[pageName] || pageName;
  const pageExists = [...pages].some((page) => page.dataset.page === allowedPageName);
  const activePageName = pageExists ? allowedPageName : "results";

  pages.forEach((page) => {
    page.classList.toggle("is-active", page.dataset.page === activePageName);
  });

  pageLinks.forEach((link) => {
    link.classList.toggle("is-active", link.dataset.pageLink === activePageName);
  });

  headerArt.forEach((art) => {
    art.classList.toggle("is-active", art.dataset.headerArt === getHeaderArtName(activePageName));
  });

  rememberNavScope(activePageName);

  navGroups.forEach((group) => {
    group.hidden = group.dataset.navScope !== getNavScope(activePageName);
  });

  document.body.classList.remove("is-routing");

  if (options.scrollToTop) {
    scrollToPageTop();
  }
}

function getHeaderArtName(pageName) {
  if (pageName.startsWith("formula-1-2024")) {
    return "formula-one-2024";
  }

  if (pageName.startsWith("formula-1-2025")) {
    return "formula-one-2025";
  }

  if (pageName.startsWith("fantasy-office-2025")) {
    return "fantasy-office-2025";
  }

  if (pageName.startsWith("fantasy-office-2026")) {
    return "world-cup";
  }

  if (getNavScope(pageName) === "world-cup") {
    return "world-cup";
  }

  return pageName;
}

function getNavScope(pageName) {
  if (pageName.startsWith("formula-1-2024")) {
    return "formula-one-2024";
  }

  if (pageName.startsWith("formula-1-2025")) {
    return "formula-one-2025";
  }

  if (pageName.startsWith("fantasy-office-2025")) {
    return "fantasy-office-2025";
  }

  if (pageName.startsWith("fantasy-office-2026")) {
    return "fantasy-office-2026";
  }

  if (pageName === "leagues") {
    return sessionStorage.getItem("boxThisLapActiveNavScope") || "world-cup";
  }

  return "world-cup";
}

function rememberNavScope(pageName) {
  if (pageName.startsWith("formula-1-2024")) {
    sessionStorage.setItem("boxThisLapActiveNavScope", "formula-one-2024");
    return;
  }

  if (pageName.startsWith("formula-1-2025")) {
    sessionStorage.setItem("boxThisLapActiveNavScope", "formula-one-2025");
    return;
  }

  if (pageName.startsWith("fantasy-office-2025")) {
    sessionStorage.setItem("boxThisLapActiveNavScope", "fantasy-office-2025");
    return;
  }

  if (pageName.startsWith("fantasy-office-2026")) {
    sessionStorage.setItem("boxThisLapActiveNavScope", "fantasy-office-2026");
    return;
  }

  if (pageName !== "leagues") {
    sessionStorage.setItem("boxThisLapActiveNavScope", "world-cup");
  }
}

function showTab(tabName, options = {}) {
  tabs.forEach((tab) => {
    const isActive = tab.dataset.tab === tabName;
    tab.classList.toggle("is-active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });

  tabPanels.forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.tabPanel === tabName);
  });

  if (options.scrollToTop) {
    scrollToPageTop();
  }
}

function scrollToPageTop() {
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  requestAnimationFrame(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  });
}

function getCurrentTheme() {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

function setTheme(theme) {
  const normalizedTheme = theme === "light" ? "light" : "dark";
  document.documentElement.dataset.theme = normalizedTheme;

  try {
    localStorage.setItem(THEME_STORAGE_KEY, normalizedTheme);
  } catch (error) {
    console.warn("Unable to save theme preference", error);
  }

  syncThemeToggle();
}

function syncThemeToggle() {
  if (!themeToggle) {
    return;
  }

  const theme = getCurrentTheme();
  themeToggle.textContent = theme === "dark" ? "Dark" : "Light";
  themeToggle.setAttribute("aria-pressed", String(theme === "dark"));
}

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
    const isFormulaOne = (year === "2024" || year === "2025") && league === "Formula 1";
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

function renderFantasyCriticPage() {
  if (fantasyCritic2025Content) {
    fantasyCritic2025Content.innerHTML = renderFantasyCriticLeague(FANTASY_CRITIC_2025);
  }

  if (fantasyCritic2026Content) {
    fantasyCritic2026Content.innerHTML = renderFantasyCriticLeague(FANTASY_CRITIC_2026);
  }
}

function renderFantasyCriticLeague(league) {
  return `
    <div class="league-detail-heading">
      <div>
        <h2>${escapeHtml(league.title)}</h2>
        <p>${escapeHtml(league.subtitle)}</p>
      </div>
    </div>

    <div class="fantasy-critic-standings">
      ${league.standings.map((entry) => renderFantasyCriticStanding(entry)).join("")}
    </div>
  `;
}

function renderFantasyCriticStanding(entry) {
  const manager = getManagerByName(entry.manager) ?? { name: entry.manager };

  return `
    <article class="fantasy-critic-card">
      <header class="fantasy-critic-summary">
        <div class="fantasy-critic-rank">
          <span>Rank</span>
          <strong>${escapeHtml(entry.rank)}</strong>
        </div>
        <div class="fantasy-critic-manager">
          ${renderManagerChip(manager)}
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
        points: parsePoints(row[betIndex + 1]),
      })),
    };
  }).filter((question) => question.question);

  const standings = managerColumns.map(({ manager }) => {
    const managerQuestions = questions.map((question) => {
      return question.bets.find((bet) => bet.manager === manager) ?? { manager, bet: "", points: 0 };
    });
    const points = managerQuestions.reduce((total, bet) => total + bet.points, 0);
    const scored = managerQuestions.filter((bet) => bet.points !== 0).length;

    return {
      manager,
      questions: managerQuestions.length,
      scored,
      points,
    };
  }).sort((a, b) => b.points - a.points || a.manager.localeCompare(b.manager));

  return { questions, standings: rankRows(standings) };
}

function renderFormulaOneLeague(year, data) {
  siteData[`formulaOne${year}`] = data;
  renderFormulaOneQuestionOptions(year, data.questions);
  renderFormulaOneQuestions(year);
  renderFormulaOneResults(year, data.standings);
}

function renderFormulaOneQuestionOptions(year, questions) {
  const view = formulaOneViews[year];

  if (!view?.questionSelect) {
    return;
  }

  view.questionSelect.innerHTML = `
    <option value="">All questions</option>
    ${questions.map((question) => {
      return `<option value="${escapeHtml(question.id)}" title="${escapeHtml(question.question)}">Question ${escapeHtml(question.number)}</option>`;
    }).join("")}
  `;
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
  if (isBoldPredictionQuestion(question.question)) {
    return "";
  }

  return `<p>Answer: <strong>${escapeHtml(question.answer || "No answer listed")}</strong></p>`;
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
      <strong>${formatPoints(bet.points)}</strong>
    </div>
  `;
}

function renderFormulaOneResults(year, standings) {
  const view = formulaOneViews[year];

  if (!view?.resultsRows) {
    return;
  }

  if (standings.length === 0) {
    view.resultsRows.innerHTML = `<tr><td class="table-message" colspan="3">No Formula 1 results were loaded.</td></tr>`;
    return;
  }

  view.resultsRows.innerHTML = standings.map((entry) => {
    const manager = getManagerByName(entry.manager) ?? { name: entry.manager };

    return `
      <tr>
        <td data-label="Rank">${escapeHtml(entry.rank)}</td>
        <td data-label="Manager">${renderManagerChip(manager)}</td>
        <td data-label="Points">${escapeHtml(formatPoints(entry.points))}</td>
      </tr>
    `;
  }).join("");
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

  view.resultList.innerHTML = results.map((entry) => {
    const manager = getManagerByName(entry.manager) ?? { name: entry.manager };

    return `
      <article class="office-result-card">
        <header class="office-result-summary">
          <div class="fantasy-critic-rank">
            <span>Rank</span>
            <strong>${escapeHtml(entry.rank)}</strong>
          </div>
          <div class="fantasy-critic-manager">
            ${renderManagerChip(manager)}
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

function parseCsvMatrix(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        field += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";

      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }

      continue;
    }

    field += char;
  }

  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
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

themeToggle?.addEventListener("click", () => {
  setTheme(getCurrentTheme() === "dark" ? "light" : "dark");
});

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    showTab(tab.dataset.tab, { scrollToTop: true });
  });
});

leagueYearSelect?.addEventListener("change", () => {
  renderLeagueList(leagueYearSelect.value);
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

resultCards.forEach((card) => {
  const toggle = card.querySelector("[data-result-toggle]");

  toggle?.addEventListener("click", () => {
    const shouldShow = !card.classList.contains("is-result-visible");

    resultCards.forEach((resultCard) => {
      resultCard.classList.remove("is-result-visible");
    });

    card.classList.toggle("is-result-visible", shouldShow);
  });
});

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

window.addEventListener("hashchange", () => {
  showPage(window.location.hash.replace("#", "") || "results", { scrollToTop: true });
});

window.addEventListener("popstate", () => {
  showPage(window.location.hash.replace("#", "") || "results", { scrollToTop: true });
});

showPage(window.location.hash.replace("#", "") || "results");
renderLeagueList(leagueYearSelect?.value || "2026");
renderFantasyCriticPage();
syncThemeToggle();

loadPlayers()
  .then((players) => {
    siteData.players = players;
    siteData.playerPositionLookups = buildPlayerPositionLookups(players);
    renderTestingPlayers(players);

    if (siteData.playerPerformances) {
      renderPlayerChampionship(siteData.playerPerformances);
    }

    if (siteData.matches) {
      renderMatchesForDate(todayMatchList, siteData.matches, getDateKey(0));
      renderMatchesForDate(tomorrowMatchList, siteData.matches, getDateKey(1));
      renderMatchesForDate(matchdayMatchList, siteData.matches, matchdaySelect?.value || "");
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
    console.info("Box This Lap match result data loaded", results);
  })
  .catch((error) => {
    renderNationsLeagueError(error);
    console.error("Box This Lap match result data failed to load", error);
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
    siteData.managerDrafts = buildManagerDraftLookups({ managers, teamDraft, playerDraft });

    if (siteData.playerPerformances) {
      renderPlayerChampionship(siteData.playerPerformances);
    }

    if (siteData.matchResults) {
      renderNationsLeague(siteData.matchResults);
    }

    if (siteData.matches) {
      renderMatchesForDate(todayMatchList, siteData.matches, getDateKey(0));
      renderMatchesForDate(tomorrowMatchList, siteData.matches, getDateKey(1));
      renderMatchesForDate(matchdayMatchList, siteData.matches, matchdaySelect?.value || "");
    }

    renderManagerResults({ managers, teamDraft, playerDraft, playerPerformances, matchResults });
    console.info("Box This Lap manager result data loaded", { managers, teamDraft, playerDraft });
  })
  .catch((error) => {
    renderManagerResultsError(error);
    console.error("Box This Lap manager result data failed to load", error);
  });

loadMatches()
  .then((matches) => {
    siteData.matches = matches;
    renderMatchesForDate(todayMatchList, matches, getDateKey(0));
    renderMatchesForDate(tomorrowMatchList, matches, getDateKey(1));
    renderMatchdayPicker(matches);
    console.info("Box This Lap match data loaded", matches);
  })
  .catch((error) => {
    siteData.matchesError = error;
    renderMatchError(todayMatchList, error);
    renderMatchError(tomorrowMatchList, error);
    renderMatchError(matchdayMatchList, error);
    console.error("Box This Lap match data failed to load", error);
  });

loadSheetText("formulaOne2024")
  .then((csvText) => {
    const data = parseFormulaOneSheet(csvText);
    renderFormulaOneLeague("2024", data);
    console.info("Box This Lap Formula 1 2024 data loaded", data);
  })
  .catch((error) => {
    renderFormulaOneError("2024", error);
    console.error("Box This Lap Formula 1 2024 data failed to load", error);
  });

loadSheetText("formulaOne2025")
  .then((csvText) => {
    const data = parseFormulaOneSheet(csvText);
    renderFormulaOneLeague("2025", data);
    console.info("Box This Lap Formula 1 2025 data loaded", data);
  })
  .catch((error) => {
    renderFormulaOneError("2025", error);
    console.error("Box This Lap Formula 1 2025 data failed to load", error);
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

function renderMatchCard(match) {
  const home = getField(match, "Home", "home") || "Home";
  const away = getField(match, "Away", "away") || "Away";
  const time = getField(match, "Time", "time") || "Time TBD";
  const pairs = Object.entries(getField(match, "Data", "data") || {});

  return `
    <article class="match-card">
      <div class="match-header">
        <h2>${escapeHtml(home)} v ${escapeHtml(away)}</h2>
        <p>${escapeHtml(time)}</p>
      </div>
      <table class="pair-table">
        <tbody>
          ${renderMatchRows(pairs)}
        </tbody>
      </table>
    </article>
  `;
}

function renderMatchRows(pairs) {
  if (pairs.length === 0) {
    return `
      <tr>
        <th scope="row">Data</th>
        <td>TBD</td>
      </tr>
    `;
  }

  return pairs.map(([name, manager]) => {
    return `
      <tr>
        <th scope="row">${renderMatchDataName(name)}</th>
        <td>${renderMatchManager(manager)}</td>
      </tr>
    `;
  }).join("");
}

function renderMatchManager(managerName) {
  const manager = getManagerByName(managerName);

  return manager ? renderManagerChip(manager) : escapeHtml(managerName);
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

  const rows = getPlayerChampionshipRows(performances);

  if (rows.length === 0) {
    playerChampionshipRows.innerHTML = `<tr><td class="table-message" colspan="5">No player performance data found.</td></tr>`;
    return;
  }

  playerChampionshipRows.innerHTML = rows.map((player) => {
    const manager = getPlayerManager(player);

    return `
      <tr>
        <td data-label="Rank">${player.rank}</td>
        <td data-label="Player">${renderPlayerNameWithPosition(player.name, player.position)}</td>
        <td data-label="Team / Manager">${renderStandingDetail(player.team, manager)}</td>
        <td data-label="Matches">${escapeHtml(formatMatchCount(player.matches))}</td>
        <td data-label="Points">${escapeHtml(formatPoints(player.points))}</td>
      </tr>
    `;
  }).join("");
}

function getPlayerChampionshipRows(performances) {
  const players = new Map();

  for (const performance of performances) {
    const playerId = performance["Player ID"] || performance.Name;
    const points = parsePoints(performance.Points);

    if (!playerId || !Number.isFinite(points)) {
      continue;
    }

    const player = players.get(playerId) ?? {
      id: playerId,
      matches: 0,
      name: performance.Name,
      points: 0,
      position: performance.Position,
      team: performance.Team,
    };

    player.matches += 1;
    player.points += points;
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

function renderNationsLeague(results) {
  if (!nationsLeagueRows) {
    return;
  }

  const rows = getNationsLeagueRows(results);

  if (rows.length === 0) {
    nationsLeagueRows.innerHTML = `<tr><td class="table-message" colspan="5">No Nations League results found.</td></tr>`;
    return;
  }

  nationsLeagueRows.innerHTML = rows.map((nation) => {
    const manager = getNationManager(nation.name);

    return `
      <tr>
        <td data-label="Rank">${nation.rank}</td>
        <td data-label="Nation">${escapeHtml(nation.name)}</td>
        <td data-label="Record / Manager">${renderStandingDetail(formatRecord(nation), manager)}</td>
        <td data-label="Matches">${escapeHtml(formatMatchCount(nation.matches))}</td>
        <td data-label="Points">${escapeHtml(formatPoints(nation.points))}</td>
      </tr>
    `;
  }).join("");
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
    const winnerPoints = getWinnerPoints(result);
    const penaltyLoserPoints = isPenaltyResult(result) ? 2 : 0;

    teamRow.matches += 1;
    opponentRow.matches += 1;

    if (outcome === "win") {
      teamRow.wins += 1;
      opponentRow.losses += 1;
      teamRow.points += winnerPoints;
      opponentRow.points += penaltyLoserPoints;
      continue;
    }

    if (outcome === "lose" || outcome === "loss") {
      teamRow.losses += 1;
      opponentRow.wins += 1;
      teamRow.points += penaltyLoserPoints;
      opponentRow.points += winnerPoints;
      continue;
    }

    if (outcome === "draw" || outcome === "tie") {
      teamRow.draws += 1;
      opponentRow.draws += 1;
      teamRow.points += 1;
      opponentRow.points += 1;
    }
  }

  return rankRows(
    [...nations.values()]
      .filter((nation) => nation.matches > 0 && nation.points > 0)
      .sort(compareNationStandings)
  );
}

function getNationStanding(nations, name) {
  if (!nations.has(name)) {
    nations.set(name, {
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

  const rows = getManagerResultRows({ managers, teamDraft, playerDraft, playerPerformances, matchResults });

  if (rows.length === 0) {
    managerResultsRows.innerHTML = `<tr><td class="table-message" colspan="3">No manager results found.</td></tr>`;
    return;
  }

  managerResultsRows.innerHTML = rows.map((manager) => {
    const detailId = `manager-detail-${escapeHtml(manager.id)}`;

    return `
      <tr class="manager-result-row" data-manager-result-row aria-expanded="false" aria-controls="${detailId}" role="button" tabindex="0">
        <td data-label="Rank">${manager.rank}</td>
        <td data-label="Manager">${renderManagerChip(manager)}</td>
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
              <span>${escapeHtml(draft.name)}</span>
              <strong>${escapeHtml(formatPoints(draft.points))}</strong>
            </li>
          `;
        }).join("")}
      </ul>
    </section>
  `;
}

function getManagerResultRows({ managers, teamDraft, playerDraft, playerPerformances, matchResults }) {
  const nationPoints = new Map(
    getNationsLeagueRows(matchResults).map((nation) => [normalizeLookupName(nation.name), nation.points])
  );
  const playerPoints = new Map();

  for (const player of getPlayerChampionshipRows(playerPerformances)) {
    playerPoints.set(String(player.id), player.points);
    playerPoints.set(normalizeLookupName(player.name), player.points);
  }

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

  for (const draft of teamDraft) {
    const manager = managerRows.get(draft["Manager ID"]);
    const nation = normalizeNationName(draft.Team);

    if (!manager || !nation) {
      continue;
    }

    manager.nationCount += 1;
    const points = nationPoints.get(normalizeLookupName(nation)) ?? 0;
    manager.points += points;
    manager.drafts.push({
      name: nation,
      points,
      type: "Nation",
    });
  }

  for (const draft of playerDraft) {
    const manager = managerRows.get(draft["Manager ID"]);
    const playerId = draft["Player ID"];
    const playerName = draft.Player;

    if (!manager || (!playerId && !playerName)) {
      continue;
    }

    manager.playerCount += 1;
    const points = playerPoints.get(String(playerId)) ?? playerPoints.get(normalizeLookupName(playerName)) ?? 0;
    manager.points += points;
    manager.drafts.push({
      name: playerName,
      points,
      type: "Player",
    });
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

function formatPoints(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatMatchCount(value) {
  return Number(value) === 1 ? "1 match" : `${value} matches`;
}

function formatRecord(nation) {
  return `${nation.wins}-${nation.draws}-${nation.losses}`;
}

function isPenaltyResult(result) {
  return String(result.Penalties || "").trim() !== "";
}

function getFallbackWinPoints(result) {
  return String(result.Stage || "").toLowerCase().includes("group") ? 3 : 5;
}

function getWinnerPoints(result) {
  const rawPoints = String(result.Points ?? "").trim();
  const points = parsePoints(rawPoints);

  return rawPoints && Number.isFinite(points) ? points : getFallbackWinPoints(result);
}

function normalizeLookupName(value) {
  return String(value ?? "").trim().toLowerCase();
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
  const displayName = getManagerDisplayName(name);

  return {
    color: MANAGER_COLORS[normalizeLookupName(displayName)] || "#5f6978",
    displayName,
    id: manager.id || manager["Manager ID"],
    name,
  };
}

function getManagerDisplayName(name) {
  return String(name ?? "").trim().split(/\s+/)[0] || "Manager";
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

function renderStandingDetail(value, manager) {
  const parts = [`<span class="standing-detail-main">${escapeHtml(value)}</span>`];

  if (manager) {
    parts.push(renderManagerChip(manager));
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
