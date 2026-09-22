let dependencies = {};
const formulaOneResultsMode = { 2025: "yearly", 2026: "yearly" };
const formulaOneWeeklyResultsGroup = { 2025: "all", 2026: "all" };
const siteData = new Proxy(
  {},
  {
    get: (_target, key) => dependencies.getData(String(key)),
    set: (_target, key, value) => {
      dependencies.setData(String(key), value);
      return true;
    },
  },
);
const formulaOneViews = new Proxy(
  {},
  {
    get: (_target, year) => dependencies.getView(String(year)),
  },
);
const escapeHtml = (...args) => dependencies.escapeHtml(...args);
const getResolvedAwards = (...args) => dependencies.getResolvedAwards(...args);
const renderAwardCard = (...args) => dependencies.renderAwardCard(...args);
const parseCsvMatrix = (...args) => dependencies.parseCsvMatrix(...args);
const rankRows = (...args) => dependencies.rankRows(...args);
const normalizeLookupName = (...args) =>
  dependencies.normalizeLookupName(...args);
const getField = (...args) => dependencies.getField(...args);
const shouldRenderPageSection = (...args) =>
  dependencies.shouldRenderPageSection(...args);
const getManagerByName = (...args) => dependencies.getManagerByName(...args);
const getManagerById = (...args) => dependencies.getManagerById(...args);
const renderManagerChip = (...args) => dependencies.renderManagerChip(...args);
const getAwardsForManager = (...args) =>
  dependencies.getAwardsForManager(...args);
const formatRankDisplay = (...args) => dependencies.formatRankDisplay(...args);
const renderAwardBadges = (...args) => dependencies.renderAwardBadges(...args);
const formatPoints = (...args) => dependencies.formatPoints(...args);

function getFormulaOneYearFromPage(pageName = "") {
  return (
    String(pageName).match(/^formula-1-(2024|2025|2026)(?:-|$)/)?.[1] || ""
  );
}

function getFormulaOneAwardStandingsForMode(mode) {
  return mode === "weekly" ? "formula-one-weekly" : "formula-one-yearly";
}

export function createFormulaOnePublicController(options) {
  dependencies = options;
  return {
    getAwardStandingsForMode: (mode) =>
      mode === "weekly" ? "formula-one-weekly" : "formula-one-yearly",
    getAwards: getAwardsForFormulaOneYear,
    getYearFromPage: (pageName = "") =>
      String(pageName).match(/^formula-1-(2024|2025|2026)(?:-|$)/)?.[1] || "",
    hasWeeklyPicks: hasFormulaOneWeeklyPicks,
    loadVisibleFormIframes: loadVisibleFormulaOneFormIframes,
    parseRoundForms: parseFormulaOneRoundForms,
    parseSheet: parseFormulaOneSheet,
    parseWeeklyResultsSheet: parseFormulaOneWeeklyResultsSheet,
    parseWeeklySheet: parseFormulaOneWeeklySheet,
    renderAwards: renderFormulaOneAwards,
    renderLeague: renderFormulaOneLeague,
    renderQuestions: renderFormulaOneQuestions,
    renderResults: renderFormulaOneResults,
    renderWeeklyForm: renderFormulaOneWeeklyForm,
    renderWeeklyPage: renderFormulaOneWeeklyPage,
    setResultsMode(year, mode) {
      formulaOneResultsMode[year] = mode === "weekly" ? "weekly" : "yearly";
      return formulaOneResultsMode[year];
    },
    setResultsGroup(year, group) {
      formulaOneWeeklyResultsGroup[year] = group || "all";
    },
    toggleWeeklyEntry: toggleFormulaOneWeeklyEntry,
    toggleWeeklyStandingRow: toggleFormulaOneWeeklyStandingRow,
  };
}

function parseFormulaOneSheet(csvText) {
  const rows = parseCsvMatrix(csvText).filter((row) =>
    row.some((value) => value.trim() !== ""),
  );
  const managerRow = rows[0] ?? [];
  const headerRow = rows[1] ?? [];

  if (
    rows.length < 3 ||
    headerRow[0] !== "Question" ||
    headerRow[1] !== "Answer"
  ) {
    throw new Error(
      "Formula 1 sheet did not include the expected Question and Answer columns.",
    );
  }

  const managerColumns = managerRow
    .map((manager, index) => ({ manager: manager.trim(), index }))
    .filter(({ manager, index }) => manager && index >= 2);

  const questions = rows
    .slice(2)
    .filter((row) => {
      return !isFormulaOneTotalRow(row[0]);
    })
    .map((row, index) => {
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
    })
    .filter((question) => question.question);

  const standings = managerColumns
    .map(({ manager }) => {
      const managerQuestions = questions.map((question) => {
        return (
          question.bets.find((bet) => bet.manager === manager) ?? {
            manager,
            bet: "",
            points: 0,
          }
        );
      });
      const points = managerQuestions.reduce(
        (total, bet) => total + getFormulaOnePointNumber(bet.points),
        0,
      );
      const scored = managerQuestions.filter(
        (bet) => getFormulaOnePointNumber(bet.points) !== 0,
      ).length;

      return {
        manager,
        questions: managerQuestions.length,
        scored,
        points,
      };
    })
    .sort((a, b) => b.points - a.points || a.manager.localeCompare(b.manager));

  return { questions, standings: rankRows(standings) };
}

function parseFormulaOneWeeklySheet(csvText) {
  const rows = parseCsvMatrix(csvText);
  const races = [];

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index] ?? [];
    const isRaceHeader =
      normalizeLookupName(row[0]) === "person" &&
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
    entry.picks.p1 || entry.picks.p2 || entry.picks.p3 || entry.picks.wildcard,
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
      return getFormulaOnePointNumber(
        race.entries.find((entry) => entry.manager === manager)?.total,
      );
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
      }),
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
    return (
      block.length > 0 &&
      block.every((row) => {
        return (
          row[1]?.trim() &&
          row.slice(2).every((value) => !String(value ?? "").trim())
        );
      })
    );
  });
  const totalBlock =
    totalBlocks[totalBlocks.length - 1] ??
    managerBlocks[managerBlocks.length - 1] ??
    [];
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
  return dependencies.isKnownManager(normalizeLookupName(value));
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
  const match = String(value ?? "")
    .trim()
    .match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);

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
    ${questions
      .map((question) => {
        return `<option value="${escapeHtml(question.id)}" title="${escapeHtml(question.question)}">${escapeHtml(formatFormulaOneQuestionOption(question))}</option>`;
      })
      .join("")}
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
    [
      /last in the world constructors championship/i,
      "Last in Constructors Championship",
    ],
    [/(^|\s)world drivers champion|driver'?s champion/i, "Driver's Champion"],
    [
      /(^|\s)world constructors championship|constructor'?s champion/i,
      "Constructors Champion",
    ],
    [/finish on the podium/i, "Podium Finishers"],
    [/driver of the day/i, "Driver of the Day Awards"],
    [/closest teammate pair in qualifying/i, "Closest Teammates: Qualifying"],
    [
      /closest teammate pair in the grand prix/i,
      "Closest Teammates: Grand Prix",
    ],
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

  return truncateQuestionSummary(
    normalizedQuestion
      .replace(/\?$/g, "")
      .replace(/^who will\s+/i, "")
      .replace(/^which\s+/i, "")
      .replace(/^what will\s+/i, "")
      .replace(/^what\s+/i, "")
      .replace(/^how many\s+/i, "How many ")
      .replace(/^will\s+/i, "")
      .trim(),
  );
}

function getFormulaOneComparisonSummary(questionText) {
  const teammatePairing = questionText.match(
    /teammate pairing of (.+?) and (.+?)\?/i,
  );

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

  view.questionList.innerHTML = questions
    .map(renderFormulaOneQuestion)
    .join("");
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
  return String(question ?? "")
    .toLowerCase()
    .includes("bold prediction");
}

function isFormulaOneTotalRow(question) {
  return (
    String(question ?? "")
      .trim()
      .toLowerCase() === "total"
  );
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
  const weeklyResultsData = siteData[`formulaOne${year}WeeklyResults`];
  const weeklyPicksData = siteData[`formulaOne${year}Weekly`];
  const weeklyData = weeklyResultsData
    ? {
        ...weeklyPicksData,
        ...weeklyResultsData,
        races: weeklyResultsData.races?.length
          ? weeklyResultsData.races
          : weeklyPicksData?.races || [],
      }
    : weeklyPicksData;
  const mode = formulaOneResultsMode[year] ?? "yearly";
  const activeSource = mode === "weekly" ? weeklyData : data;
  const standings =
    mode === "weekly"
      ? getFormulaOneWeeklyGroupStandings(
          weeklyData,
          formulaOneWeeklyResultsGroup[year] ?? "all",
        )
      : (data?.standings ?? []);
  renderFormulaOneWeeklyResultsGroupControl(year, weeklyData, mode);

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

  view.resultsRows.innerHTML = standings
    .map((entry, index) => {
      const manager = getManagerById(entry.managerId || entry.manager_id) ??
        getManagerByName(entry.manager) ?? {
          name:
            entry.manager || `Manager ${entry.managerId || entry.manager_id}`,
        };
      const standingsKey = getFormulaOneAwardStandingsForMode(mode);
      const awards =
        entry.rank === 1
          ? getAwardsForManager(manager, { standings: standingsKey, year })
          : [];

      const detailId = `formula-one-${year}-weekly-standing-${escapeHtml(String(entry.managerId || entry.manager_id || entry.manager || index))}`;
      const expandable = mode === "weekly";
      return `
      <tr${expandable ? ` class="manager-result-row" data-formula-one-weekly-standing-row aria-expanded="false" aria-controls="${detailId}" role="button" tabindex="0"` : ""}>
        <td data-label="Rank">${escapeHtml(formatRankDisplay(entry, index, standings))}</td>
        <td data-label="Manager">
          <span class="standing-manager-with-awards">
            ${renderManagerChip(manager)}
            ${renderAwardBadges(awards)}
          </span>
        </td>
        <td data-label="Points">${escapeHtml(formatFormulaOnePointValue(entry.points))}</td>
      </tr>
      ${expandable ? `<tr class="manager-detail-row formula-one-weekly-standing-detail" id="${detailId}" hidden><td colspan="3">${renderFormulaOneWeeklyStandingDetails(weeklyData, entry, formulaOneWeeklyResultsGroup[year] ?? "all")}</td></tr>` : ""}
    `;
    })
    .join("");
}

function renderFormulaOneWeeklyResultsGroupControl(year, data, mode) {
  const view = formulaOneViews[year];
  if (!view?.resultsWeeklyControls || !view.resultsWeeklyGroupSelect) return;
  view.resultsWeeklyControls.hidden = mode !== "weekly";
  if (mode !== "weekly") return;

  const groups = [
    ...new Set(
      (data?.races || [])
        .map((race) => Math.floor((Number(race.id) - 1) / 8) + 1)
        .filter(Number.isInteger),
    ),
  ].sort((a, b) => a - b);
  const selected = groups.includes(Number(formulaOneWeeklyResultsGroup[year]))
    ? String(formulaOneWeeklyResultsGroup[year])
    : "all";
  formulaOneWeeklyResultsGroup[year] = selected;
  view.resultsWeeklyGroupSelect.innerHTML = `<option value="all">All</option>${groups
    .map((group) => {
      const start = (group - 1) * 8 + 1;
      return `<option value="${group}">Rounds ${start}–${start + 7}</option>`;
    })
    .join("")}`;
  view.resultsWeeklyGroupSelect.value = selected;
}

function getFormulaOneWeeklyGroupStandings(data, selectedGroup) {
  const standings = data?.standings || [];
  if (selectedGroup === "all") return standings;
  const group = Number(selectedGroup);
  const rows = standings
    .map((entry) => {
      const block = (entry.blockTotals || []).find(
        (item) => Number(item.block) === group,
      );
      const fallbackScores = (data?.races || [])
        .filter((race) => Math.floor((Number(race.id) - 1) / 8) + 1 === group)
        .map((race) => ({
          round: Number(race.id),
          points:
            Number(
              (race.entries || []).find(
                (item) =>
                  getFormulaOneWeeklyManagerKey(item) ===
                  getFormulaOneWeeklyManagerKey(entry),
              )?.total,
            ) || 0,
        }))
        .sort(
          (first, second) =>
            second.points - first.points || first.round - second.round,
        )
        .slice(0, 4);
      return {
        ...entry,
        points: block
          ? Number(block.points) || 0
          : fallbackScores.reduce((total, score) => total + score.points, 0),
        countedRounds:
          block?.countedRounds || fallbackScores.map((score) => score.round),
      };
    })
    .sort(
      (first, second) =>
        second.points - first.points ||
        getFormulaOneWeeklyManagerKey(first).localeCompare(
          getFormulaOneWeeklyManagerKey(second),
          undefined,
          { numeric: true },
        ),
    );
  return rankRows(rows);
}

function getFormulaOneWeeklyManagerKey(entry) {
  return String(entry?.managerId ?? entry?.manager_id ?? entry?.manager ?? "");
}

function renderFormulaOneWeeklyStandingDetails(data, standing, selectedGroup) {
  const managerKey = getFormulaOneWeeklyManagerKey(standing);
  let rounds = (data?.races || []).map((race) => ({
    race,
    entry: (race.entries || []).find(
      (entry) => getFormulaOneWeeklyManagerKey(entry) === managerKey,
    ),
  }));
  if (selectedGroup !== "all") {
    const counted = new Set((standing.countedRounds || []).map(Number));
    rounds = rounds.filter(({ race }) => counted.has(Number(race.id)));
  }
  rounds.sort(
    selectedGroup === "all"
      ? (first, second) => Number(first.race.id) - Number(second.race.id)
      : (first, second) =>
          (Number(second.entry?.total) || 0) -
            (Number(first.entry?.total) || 0) ||
          Number(first.race.id) - Number(second.race.id),
  );
  if (!rounds.length)
    return `<div class="standing-result-detail-panel"><p class="table-message">No completed rounds are available.</p></div>`;

  return `<div class="standing-result-detail-panel"><ul class="standing-result-detail-list formula-one-weekly-standing-rounds">${rounds
    .map(({ race, entry }) => {
      const total = Number(entry?.total) || 0;
      const breakdown =
        selectedGroup === "all"
          ? ""
          : renderFormulaOneWeeklyStandingBreakdown(entry);
      const roundName = /^round\s+\d+/i.test(String(race.name || ""))
        ? race.name
        : `${race.id}. ${race.name || `Round ${race.id}`}`;
      return `<li><div><strong>${escapeHtml(roundName)}</strong>${breakdown}</div><b>${escapeHtml(formatFormulaOnePointValue(total))} pts</b></li>`;
    })
    .join("")}</ul></div>`;
}

function renderFormulaOneWeeklyStandingBreakdown(entry) {
  if (!entry) return `<small>No choices · 0 pts</small>`;
  const items = [
    ["P1", entry.picks?.p1, entry.positions?.p1, entry.points?.p1],
    ["P2", entry.picks?.p2, entry.positions?.p2, entry.points?.p2],
    ["P3", entry.picks?.p3, entry.positions?.p3, entry.points?.p3],
    [
      "Wildcard Q",
      entry.picks?.wildcard,
      entry.positions?.wildcardQualifying,
      entry.points?.wildcardQualifying,
    ],
    [
      "Wildcard Race",
      entry.picks?.wildcard,
      entry.positions?.wildcardRace,
      entry.points?.wildcardRace,
    ],
  ];
  return `<small>${items.map(([label, pick, position, points]) => `${escapeHtml(label)}: ${escapeHtml(pick || "—")} ${escapeHtml(formatFormulaOnePosition(position))} · ${escapeHtml(formatFormulaOnePointValue(points))} pts`).join("<br>")}</small>`;
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

  view.awardsList.innerHTML = awards
    .map((award) => renderAwardCard(award, "standings-summary"))
    .join("");
}

function getAwardsForFormulaOneYear(year) {
  return getResolvedAwards().filter((award) => {
    return (
      award.competition === `${year} Formula 1` &&
      String(award.year || "") === String(year || "")
    );
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

  const selectedId =
    view.weeklyForm.querySelector("[data-formula-one-form-select]")?.value ||
    getDefaultFormulaOneFormId(forms);
  const selectedForm = forms.find((form) => form.id === selectedId) ?? forms[0];

  view.weeklyForm.innerHTML = `
    <div class="formula-one-form-header">
      <label class="select-control">
        <span>Bet Form</span>
        <select data-formula-one-form-select>
          ${forms
            .map((form) => {
              return `<option value="${escapeHtml(form.id)}"${form.id === selectedForm.id ? " selected" : ""}>${escapeHtml(`${form.id}. ${form.name}`)}</option>`;
            })
            .join("")}
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
  const parts = Object.fromEntries(
    dateParts.map((part) => [part.type, part.value]),
  );

  return new Date(
    Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)),
  );
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

function loadVisibleFormulaOneFormIframes(
  container,
  year = getFormulaOneYearFromPage(dependencies.getActivePage()),
) {
  if (!isFormulaOneWeeklyBetPanelActive(year)) {
    return;
  }

  container
    .querySelectorAll(".formula-one-form-embed[open] iframe[data-src]")
    .forEach((iframe) => {
      if (!iframe.getAttribute("src")) {
        iframe.setAttribute("src", iframe.getAttribute("data-src"));
      }
    });
}

function isFormulaOneWeeklyBetPanelActive(
  year = getFormulaOneYearFromPage(dependencies.getActivePage()),
) {
  if (!year || dependencies.getActivePage() !== `formula-1-${year}-weekly`) {
    return false;
  }

  return Boolean(
    document.querySelector(
      `[data-tab-panel="formula-one-${year}-weekly-bet"].is-active`,
    ),
  );
}

function isMobileSafari() {
  const userAgent = navigator.userAgent || "";
  const isIos =
    /iP(ad|hone|od)/.test(userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isSafari =
    /Safari/i.test(userAgent) && !/(CriOS|FxiOS|EdgiOS|OPiOS)/i.test(userAgent);

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
    renderFormulaOneWeeklyManagers(year, null);
    return;
  }

  renderFormulaOneWeeklyRoundOptions(year, data.races);
  renderFormulaOneWeeklyManagers(year, data);

  const selectedRound = view.weeklyRoundSelect?.value ?? "";
  const races = selectedRound
    ? data.races.filter((race) => String(race.id) === selectedRound)
    : data.races;

  if (races.length === 0) {
    view.weeklyList.innerHTML = `<article class="formula-one-question-card"><p class="table-message">No weekly picks matched that round.</p></article>`;
    return;
  }

  view.weeklyList.innerHTML = races
    .map((race) => renderFormulaOneWeeklyRace(year, race))
    .join("");
}

function renderFormulaOneWeeklyManagers(year, data) {
  const rows = formulaOneViews[year]?.weeklyManagers;
  const standings = data?.standings ?? [];

  if (!rows) {
    return;
  }

  if (!standings.length) {
    rows.innerHTML = `<tr><td class="table-message" colspan="3">No Formula 1 weekly standings were loaded.</td></tr>`;
    return;
  }

  rows.innerHTML = standings
    .map((entry, index) => {
      const manager = getManagerByName(entry.manager) ?? {
        name: entry.manager,
      };

      const detailId = `formula-one-${year}-weekly-manager-standing-${escapeHtml(String(entry.managerId || entry.manager_id || entry.manager || index))}`;

      return `
      <tr class="manager-result-row" data-formula-one-weekly-standing-row aria-expanded="false" aria-controls="${detailId}" role="button" tabindex="0">
        <td data-label="Rank">${escapeHtml(formatRankDisplay(entry, index, standings))}</td>
        <td data-label="Manager">${renderManagerChip(manager)}</td>
        <td data-label="Points">${escapeHtml(formatFormulaOnePointValue(entry.points))}</td>
      </tr>
      <tr class="manager-detail-row formula-one-weekly-standing-detail" id="${detailId}" hidden><td colspan="3">${renderFormulaOneWeeklyStandingDetails(data, entry, "all")}</td></tr>
    `;
    })
    .join("");
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

  select.value = races.some((race) => String(race.id) === selectedValue)
    ? selectedValue
    : "";
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
      const pointsDifference =
        getFormulaOnePointNumber(secondEntry.total) -
        getFormulaOnePointNumber(firstEntry.total);

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
  const manager = getManagerById(entry.managerId || entry.manager_id) ??
    (entry.manager ? getManagerByName(entry.manager) : null) ?? {
      name: entry.manager || `Manager ${entry.managerId || entry.manager_id}`,
    };
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

  managerList
    ?.querySelectorAll("[data-formula-one-weekly-entry]")
    .forEach((row) => {
      row.classList.remove("is-weekly-expanded");
      row.setAttribute("aria-expanded", "false");

      const details = document.getElementById(
        row.getAttribute("aria-controls"),
      );
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

function toggleFormulaOneWeeklyStandingRow(container, row) {
  const isExpanded = row.getAttribute("aria-expanded") === "true";
  container
    .querySelectorAll("[data-formula-one-weekly-standing-row]")
    .forEach((item) => {
      item.setAttribute("aria-expanded", "false");
      item.classList.remove("is-manager-expanded");
      const detail = item.nextElementSibling;
      if (detail?.classList.contains("formula-one-weekly-standing-detail"))
        detail.hidden = true;
    });
  if (isExpanded) return;
  row.setAttribute("aria-expanded", "true");
  row.classList.add("is-manager-expanded");
  const detail = row.nextElementSibling;
  if (detail?.classList.contains("formula-one-weekly-standing-detail"))
    detail.hidden = false;
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
  const pointsLabel =
    typeof points === "number" && !Number.isNaN(points)
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
  return typeof value === "number" && !Number.isNaN(value)
    ? formatPoints(value)
    : String(value ?? "");
}

function formatFormulaOnePosition(position) {
  const value = String(position ?? "").trim();

  if (!value || Number.isNaN(Number(value))) {
    return value || "-";
  }

  return `P${value}`;
}
