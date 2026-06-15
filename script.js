import { loadMatches, loadPlayers, loadSheet } from "./dataLoader.js?v=202606141008";

const pageLinks = document.querySelectorAll("[data-page-link]");
const pages = document.querySelectorAll("[data-page]");
const tabs = document.querySelectorAll("[data-tab]");
const tabPanels = document.querySelectorAll("[data-tab-panel]");
const hiddenLeaguesLinks = document.querySelectorAll("[data-hidden-leagues-link]");
const leagueYearSelect = document.querySelector("#league-year-select");
const leagueList = document.querySelector("#league-list");
const leagueDetail = document.querySelector("#league-detail");
const resultCards = document.querySelectorAll("[data-result-card]");
const todayMatchList = document.querySelector("#today-match-list");
const tomorrowMatchList = document.querySelector("#tomorrow-match-list");
const matchdaySelect = document.querySelector("#matchday-select");
const matchdayMatchList = document.querySelector("#matchday-match-list");
const playerChampionshipRows = document.querySelector("#player-championship-rows");
const nationsLeagueRows = document.querySelector("#nations-league-rows");
const managerResultsRows = document.querySelector("#manager-results-rows");
const testingPlayerRows = document.querySelector("#testing-player-rows");

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

function showPage(pageName, options = {}) {
  if (pageName === "leagues" && !isLeagueDirectoryEnabled()) {
    pageName = "results";
  }

  const pageAliases = {
    "manager-scores": "standings",
    "player-scores": "standings",
  };
  const resolvedPageName = pageAliases[pageName] || pageName;
  const pageExists = [...pages].some((page) => page.dataset.page === resolvedPageName);
  const activePageName = pageExists ? resolvedPageName : "results";

  pages.forEach((page) => {
    page.classList.toggle("is-active", page.dataset.page === activePageName);
  });

  pageLinks.forEach((link) => {
    link.classList.toggle("is-active", link.dataset.pageLink === activePageName);
  });

  if (options.scrollToTop) {
    scrollToPageTop();
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

function renderLeagueList(year) {
  if (!leagueList) {
    return;
  }

  const leagues = FANTASY_LEAGUES_BY_YEAR[year] || [];
  hideLeagueDetail();

  if (leagues.length === 0) {
    leagueList.innerHTML = `<p class="league-empty">No leagues found for ${escapeHtml(year)}.</p>`;
    return;
  }

  leagueList.innerHTML = leagues.map((league) => {
    const isWorldCup = year === "2026" && league === "World Cup";
    const isFantasyCritic = year === "2025" && league === "Fantasy Critic";
    const canOpen = isWorldCup || isFantasyCritic;

    return `
      <article class="league-card${isWorldCup ? " is-current" : ""}">
        <div>
          <h2>${escapeHtml(league)}</h2>
        </div>
        ${renderLeagueCardAction({ isWorldCup, isFantasyCritic, canOpen })}
      </article>
    `;
  }).join("");
}

function renderLeagueCardAction({ isWorldCup, isFantasyCritic, canOpen }) {
  if (isWorldCup) {
    return `<a class="league-card-link" href="#results" data-page-link="results">Open</a>`;
  }

  if (isFantasyCritic) {
    return `<button class="league-card-link" type="button" data-league-detail="fantasy-critic-2025">Open</button>`;
  }

  return `<button class="league-card-link" type="button" ${canOpen ? "" : "disabled"}>Planned</button>`;
}

function hideLeagueDetail() {
  if (!leagueDetail) {
    return;
  }

  leagueDetail.hidden = true;
  leagueDetail.innerHTML = "";
}

function showFantasyCriticLeague() {
  if (!leagueDetail) {
    return;
  }

  leagueDetail.innerHTML = renderFantasyCriticLeague(FANTASY_CRITIC_2025);
  leagueDetail.hidden = false;
  leagueDetail.scrollIntoView({ block: "start", behavior: "smooth" });
}

function renderFantasyCriticLeague(league) {
  return `
    <div class="league-detail-heading">
      <div>
        <h2>${escapeHtml(league.title)}</h2>
        <p>${escapeHtml(league.subtitle)}</p>
      </div>
      <a class="league-source-link" href="${escapeHtml(league.sourceUrl)}" target="_blank" rel="noopener">Source</a>
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
        </div>
      </header>

      <div class="fantasy-critic-meta">
        <span>Released <strong>${escapeHtml(entry.released)}</strong></span>
        <span>Budget <strong>${escapeHtml(entry.budget)}</strong></span>
      </div>

      <div class="fantasy-critic-roster">
        ${entry.roster.map((game) => renderFantasyCriticGame(game)).join("")}
      </div>
    </article>
  `;
}

function renderFantasyCriticGame([game, critic, points]) {
  return `
    <div class="fantasy-critic-game">
      <strong>${escapeHtml(game)}</strong>
      <span>Critic ${escapeHtml(critic)}</span>
      <span>Pts ${escapeHtml(points)}</span>
    </div>
  `;
}

function isLeagueDirectoryEnabled() {
  return sessionStorage.getItem("boxThisLapLeagueSwitcher") === "enabled";
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

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    showTab(tab.dataset.tab, { scrollToTop: true });
  });
});

if (new URLSearchParams(window.location.search).get("switcher") === "1") {
  sessionStorage.setItem("boxThisLapLeagueSwitcher", "enabled");
}

if (isLeagueDirectoryEnabled()) {
  hiddenLeaguesLinks.forEach((link) => {
    link.hidden = false;
  });
}

leagueYearSelect?.addEventListener("change", () => {
  renderLeagueList(leagueYearSelect.value);
});

leagueList?.addEventListener("click", (event) => {
  const detailButton = event.target.closest("[data-league-detail]");

  if (!detailButton) {
    return;
  }

  if (detailButton.dataset.leagueDetail === "fantasy-critic-2025") {
    showFantasyCriticLeague();
  }
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

const siteData = {};
window.boxThisLapData = siteData;

loadPlayers()
  .then((players) => {
    siteData.players = players;
    renderTestingPlayers(players);
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
    container.innerHTML = `
      <article class="match-card">
        <div class="match-header">
          <h2>No matches found</h2>
          <p>${escapeHtml(dateKey)}</p>
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
        <th scope="row">${formatDataName(name)}</th>
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
        <td data-label="Player">${escapeHtml(player.name)}</td>
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
      team: performance.Team,
    };

    player.matches += 1;
    player.points += points;
    player.name ||= performance.Name;
    player.team ||= performance.Team;
    players.set(playerId, player);
  }

  return rankRows(
    [...players.values()]
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
