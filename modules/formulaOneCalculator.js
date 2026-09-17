import { parseFormulaOneCalculatorData } from "./formulaOneQualifying.js";

const DRIVER_COLOR_PALETTE = [
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

export function createFormulaOneCalculatorController({
  escapeHtml,
  getContainer,
  getData,
}) {
  const formulaOneCalculatorStates = new Map();
  const connectedContainers = new WeakSet();
  const FORMULA_ONE_DRIVER_COLOR_PALETTE = DRIVER_COLOR_PALETTE;
  const normalizeLookupName = normalize;
  const getFormulaOneCalculatorPointNumber = calculatorPointNumber;
  const formulaOneViews = new Proxy(
    {},
    {
      get: (_target, year) => ({ calculator: getContainer(String(year)) }),
    },
  );
  const siteData = new Proxy(
    {},
    {
      get: (_target, key) => {
        const match = String(key).match(/^formulaOne(.+)Calculator$/);
        return match ? getData(match[1]) : undefined;
      },
    },
  );

  function getFormulaOneCalculatorState(year, data) {
    const yearKey = String(year);
    const existingState = formulaOneCalculatorStates.get(yearKey);

    if (existingState) {
      const currentDrivers = new Set(data.driversToWatch);
      existingState.visibleDrivers = new Set(
        [...existingState.visibleDrivers].filter((driver) =>
          currentDrivers.has(driver),
        ),
      );
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
      sortColumn:
        storedState.sortColumn === "projected" ? "projected" : "current",
      sortDirection: storedState.sortDirection === "asc" ? "asc" : "desc",
      viewMode: "simple",
      knownDrivers: new Set(data.driversToWatch),
      simpleSelections:
        storedState.simpleSelections &&
        typeof storedState.simpleSelections === "object"
          ? storedState.simpleSelections
          : {},
      selections:
        storedState.selections && typeof storedState.selections === "object"
          ? storedState.selections
          : {},
      visibleDrivers: new Set(
        data.driversToWatch.filter((driver) => !hiddenDrivers.has(driver)),
      ),
    };
    formulaOneCalculatorStates.set(yearKey, state);
    return state;
  }

  function loadFormulaOneCalculatorStoredState(year) {
    try {
      return (
        JSON.parse(
          localStorage.getItem(getFormulaOneCalculatorStorageKey(year)) || "{}",
        ) || {}
      );
    } catch {
      return {};
    }
  }

  function persistFormulaOneCalculatorState(year, data, state) {
    try {
      localStorage.setItem(
        getFormulaOneCalculatorStorageKey(year),
        JSON.stringify({
          hiddenDrivers: data.driversToWatch.filter(
            (driver) => !state.visibleDrivers.has(driver),
          ),
          sortColumn: state.sortColumn,
          sortDirection: state.sortDirection,
          simpleSelections: state.simpleSelections,
          selections: state.selections,
        }),
      );
    } catch {
      // The calculator still works when browser storage is unavailable.
    }
  }

  function resetFormulaOneCalculatorState(year, data, state) {
    state.viewMode = "simple";
    state.sortColumn = "current";
    state.sortDirection = "desc";
    state.simpleSelections = {};
    state.selections = {};
    state.visibleDrivers = new Set(data.driversToWatch);
    try {
      localStorage.removeItem(getFormulaOneCalculatorStorageKey(year));
    } catch {
      // Reset still applies for the current session when storage is unavailable.
    }
  }

  function getFormulaOneCalculatorStorageKey(year) {
    return `boxthislap-formula-one-calculator-${year}`;
  }

  function getFormulaOneCalculatorEvents(data) {
    const events = [];

    data.rounds
      .filter((round) => !round.complete)
      .forEach((round) => {
        events.push({ round, type: "race" });
      });
    data.sprintRounds
      .filter((round) => !round.complete)
      .forEach((round) => {
        events.push({
          round: getFormulaOneCalculatorRaceRoundForSprint(data, round),
          sourceRound: round,
          type: "sprint",
        });
      });

    return events.sort((firstEvent, secondEvent) => {
      return (
        firstEvent.round.id - secondEvent.round.id ||
        (firstEvent.type === "sprint" ? -1 : 1)
      );
    });
  }

  function getFormulaOneCalculatorRaceRoundForSprint(data, sprintRound) {
    const sprintName = getFormulaOneCalculatorRoundName(sprintRound);
    return (
      data.rounds.find(
        (round) => getFormulaOneCalculatorRoundName(round) === sprintName,
      ) || sprintRound
    );
  }

  function getFormulaOneCalculatorRoundName(round) {
    return normalizeLookupName(
      String(round?.name ?? "").replace(/^round\s+\d+\s*/i, ""),
    );
  }

  function getFormulaOneCalculatorSelectionKey(type, roundId, driver) {
    return `${type}:${roundId}:${driver}`;
  }

  function getFormulaOneCalculatorSimpleEventPosition(data, event, position) {
    if (!position) {
      return "";
    }

    const options =
      event.type === "sprint" ? data.sprintOptions : data.raceOptions;
    if (options.some((option) => option.position === position)) {
      return position;
    }

    if (event.type === "sprint") {
      return (
        options.find((option) => option.position.startsWith("<"))?.position ??
        ""
      );
    }

    return position;
  }

  function applyFormulaOneCalculatorSimpleSelection(
    data,
    state,
    events,
    driver,
    position,
  ) {
    if (position) {
      state.simpleSelections[driver] = position;
    } else {
      delete state.simpleSelections[driver];
    }

    events.forEach((event) => {
      const key = getFormulaOneCalculatorSelectionKey(
        event.type,
        event.round.id,
        driver,
      );
      const eventPosition = getFormulaOneCalculatorSimpleEventPosition(
        data,
        event,
        position,
      );
      if (eventPosition) state.selections[key] = eventPosition;
      else delete state.selections[key];
    });
  }

  function getFormulaOneCalculatorSelectedPoints(data, state, event, driver) {
    const position =
      state.selections[
        getFormulaOneCalculatorSelectionKey(event.type, event.round.id, driver)
      ] || "";
    const options =
      event.type === "sprint" ? data.sprintOptions : data.raceOptions;
    return options.find((option) => option.position === position)?.points ?? 0;
  }

  function getFormulaOneCalculatorCurrentPoints(data, driver) {
    const summaryPoints = data.currentTotals.get(normalizeLookupName(driver));
    if (Number.isFinite(summaryPoints)) {
      return summaryPoints;
    }

    return (
      data.rounds.reduce(
        (total, round) =>
          total + getFormulaOneCalculatorRoundPoints(round, driver),
        0,
      ) +
      data.sprintRounds.reduce(
        (total, round) =>
          total + getFormulaOneCalculatorRoundPoints(round, driver),
        0,
      )
    );
  }

  function getFormulaOneCalculatorRoundPoints(round, driver) {
    return getFormulaOneCalculatorPointNumber(
      round?.pointsByDriver.get(normalizeLookupName(driver)),
    );
  }

  function getFormulaOneCalculatorProjectedPoints(data, state, events, driver) {
    return (
      getFormulaOneCalculatorCurrentPoints(data, driver) +
      events.reduce((total, event) => {
        return (
          total +
          getFormulaOneCalculatorSelectedPoints(data, state, event, driver)
        );
      }, 0)
    );
  }

  function getFormulaOneDriverColor(driver, data) {
    const index = Math.max(0, data.driversToWatch.indexOf(driver));
    return FORMULA_ONE_DRIVER_COLOR_PALETTE[
      index % FORMULA_ONE_DRIVER_COLOR_PALETTE.length
    ];
  }

  function getFormulaOneCalculatorSortedDrivers(
    data,
    state,
    events,
    drivers = data.driversToWatch,
  ) {
    return [...drivers].sort((firstDriver, secondDriver) => {
      const getPoints =
        state.sortColumn === "projected"
          ? (driver) =>
              getFormulaOneCalculatorProjectedPoints(
                data,
                state,
                events,
                driver,
              )
          : (driver) => getFormulaOneCalculatorCurrentPoints(data, driver);
      const difference = getPoints(firstDriver) - getPoints(secondDriver);
      return (
        (state.sortDirection === "asc" ? difference : -difference) ||
        data.driversToWatch.indexOf(firstDriver) -
          data.driversToWatch.indexOf(secondDriver)
      );
    });
  }

  function renderFormulaOneCalculatorSortHeading(state, column, label) {
    const active = state.sortColumn === column;
    const directionLabel =
      state.sortDirection === "asc" ? "Low–high" : "High–low";
    return `
      <th aria-sort="${active ? (state.sortDirection === "asc" ? "ascending" : "descending") : "none"}">
        <button type="button" class="formula-one-calculator-sort${active ? " is-active" : ""}" data-formula-one-calculator-sort="${column}">
          <span>${label}</span>
          ${active ? `<small>${directionLabel}</small>` : ""}
        </button>
      </th>
    `;
  }

  function getFormulaOneCalculatorProtagonists(data) {
    const leaderPoints = Math.max(
      ...data.driversToWatch.map((driver) =>
        getFormulaOneCalculatorCurrentPoints(data, driver),
      ),
    );
    return data.driversToWatch.filter(
      (driver) =>
        leaderPoints - getFormulaOneCalculatorCurrentPoints(data, driver) <=
        100,
    );
  }

  function renderFormulaOneCalculatorDriverName(driver) {
    const [firstName, ...remainingNames] = String(driver ?? "")
      .trim()
      .split(/\s+/);

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
    const sortedDrivers = getFormulaOneCalculatorSortedDrivers(
      data,
      state,
      events,
    );
    const visibleDrivers = sortedDrivers.filter((driver) =>
      state.visibleDrivers.has(driver),
    );
    const lastCompletedRound =
      data.rounds.filter((round) => round.complete).at(-1)?.id ?? 0;

    view.calculator.innerHTML = `
      <section class="formula-one-calculator-card formula-one-calculator-intro">
        <div>
          <h3>Season scenarios</h3>
          <p>Use Simple view to repeat one finishing position, or Expanded view to set each remaining race and sprint. Current totals come from the approved ${escapeHtml(year)} Formula 1 data.</p>
        </div>
        <span>Through Round ${escapeHtml(lastCompletedRound)}</span>
      </section>
  
      <section class="formula-one-calculator-card">
        <div class="formula-one-calculator-section-heading">
          <div>
            <h3>Points calculator</h3>
            <p>${escapeHtml(events.length)} remaining race and sprint scenarios</p>
          </div>
          <div class="formula-one-calculator-heading-actions">
            <div class="formula-one-calculator-utility-actions">
              <button class="formula-one-calculator-reset" type="button" data-formula-one-calculator-reset>Reset</button>
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
            <div class="formula-one-calculator-view-toggle" role="group" aria-label="Calculator view">
              <button
                type="button"
                class="${state.viewMode === "simple" ? "is-active" : ""}"
                data-formula-one-calculator-view="simple"
                aria-pressed="${state.viewMode === "simple" ? "true" : "false"}"
              >Simple</button>
              <button
                type="button"
                class="${state.viewMode === "expanded" ? "is-active" : ""}"
                data-formula-one-calculator-view="expanded"
                aria-pressed="${state.viewMode === "expanded" ? "true" : "false"}"
              >Expanded</button>
            </div>
          </div>
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

  function renderFormulaOneCalculatorFilters(
    year,
    data,
    state,
    visibleDrivers,
    sortedDrivers,
  ) {
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
            <button type="button" data-formula-one-calculator-show-protagonists>Only Protagonists</button>
            <button type="button" data-formula-one-calculator-hide-all>Hide all</button>
          </div>
        </div>
        <div class="formula-one-calculator-driver-filters">
          ${sortedDrivers
            .map(
              (driver) => `
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
          `,
            )
            .join("")}
        </div>
      </div>
    `;
  }

  function renderFormulaOneCalculatorTable(
    data,
    state,
    events,
    visibleDrivers,
  ) {
    if (state.viewMode === "simple") {
      return renderFormulaOneCalculatorSimpleTable(
        data,
        state,
        events,
        visibleDrivers,
      );
    }

    const eventHeaders = events
      .map((event) => {
        const eventLabel = event.type === "sprint" ? "Sprint" : "Race";
        return `<th title="${escapeHtml(`${event.round.name} ${eventLabel}`)}"><span>R${escapeHtml(event.round.id)}</span>${escapeHtml(eventLabel)}</th>`;
      })
      .join("");

    const rows = visibleDrivers.length
      ? visibleDrivers
          .map((driver) => {
            const currentPoints = getFormulaOneCalculatorCurrentPoints(
              data,
              driver,
            );
            const projectedPoints = getFormulaOneCalculatorProjectedPoints(
              data,
              state,
              events,
              driver,
            );
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
          })
          .join("")
      : `
      <tr>
        <td class="table-message" colspan="${escapeHtml(events.length + 3)}">No drivers are selected. Use the driver filters above to add one.</td>
      </tr>
    `;

    return `
      <table class="formula-one-calculator-table">
        <thead>
          <tr>
            <th>Driver</th>
            ${renderFormulaOneCalculatorSortHeading(state, "current", "Current")}
            ${eventHeaders}
            ${renderFormulaOneCalculatorSortHeading(state, "projected", "Projected")}
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  function renderFormulaOneCalculatorSimpleTable(
    data,
    state,
    events,
    visibleDrivers,
  ) {
    const rows = visibleDrivers.length
      ? visibleDrivers
          .map((driver) => {
            const currentPoints = getFormulaOneCalculatorCurrentPoints(
              data,
              driver,
            );
            const projectedPoints = getFormulaOneCalculatorProjectedPoints(
              data,
              state,
              events,
              driver,
            );
            const selectedPosition = state.simpleSelections[driver] || "";
            return `
        <tr>
          <th scope="row">
            <span class="formula-one-calculator-driver" style="--driver-color: ${escapeHtml(getFormulaOneDriverColor(driver, data))}">
              <span class="formula-one-driver-swatch" aria-hidden="true"></span>
              ${renderFormulaOneCalculatorDriverName(driver)}
            </span>
          </th>
          <td class="formula-one-calculator-total">${escapeHtml(currentPoints)}</td>
          <td>
            <select
              aria-label="${escapeHtml(`${driver}, position for every remaining round`)}"
              data-formula-one-calculator-simple-position
              data-driver="${escapeHtml(driver)}"
            >
              <option value="">—</option>
              ${data.raceOptions
                .map(
                  (option) => `
                <option value="${escapeHtml(option.position)}" ${option.position === selectedPosition ? "selected" : ""}>
                  ${escapeHtml(option.position)}
                </option>
              `,
                )
                .join("")}
            </select>
          </td>
          <td class="formula-one-calculator-total formula-one-calculator-projected">
            ${escapeHtml(projectedPoints)}
            <small>+${escapeHtml(projectedPoints - currentPoints)}</small>
          </td>
        </tr>
      `;
          })
          .join("")
      : `
      <tr>
        <td class="table-message" colspan="4">No drivers are selected. Use the driver filters above to add one.</td>
      </tr>
    `;

    return `
      <table class="formula-one-calculator-table formula-one-calculator-table--simple">
        <thead>
          <tr>
            <th>Driver</th>
            ${renderFormulaOneCalculatorSortHeading(state, "current", "Current")}
            <th>Position</th>
            ${renderFormulaOneCalculatorSortHeading(state, "projected", "Projected")}
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  function renderFormulaOneCalculatorPositionSelect(
    data,
    state,
    event,
    driver,
  ) {
    const options =
      event.type === "sprint" ? data.sprintOptions : data.raceOptions;
    const key = getFormulaOneCalculatorSelectionKey(
      event.type,
      event.round.id,
      driver,
    );
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
          ${options
            .map(
              (option) => `
            <option value="${escapeHtml(option.position)}" ${option.position === selectedPosition ? "selected" : ""}>
              ${escapeHtml(option.position)} · ${escapeHtml(option.points)} pts
            </option>
          `,
            )
            .join("")}
        </select>
      </td>
    `;
  }

  function getFormulaOneCalculatorSeries(data, state, driver) {
    const sprintRoundsById = new Map(
      data.sprintRounds.map((sprintRound) => {
        return [
          getFormulaOneCalculatorRaceRoundForSprint(data, sprintRound).id,
          sprintRound,
        ];
      }),
    );
    let cumulativePoints = 0;

    return data.rounds.map((round) => {
      const raceEvent = { round, type: "race" };
      const sprintRound = sprintRoundsById.get(round.id);
      const sprintEvent = sprintRound
        ? { round, sourceRound: sprintRound, type: "sprint" }
        : null;
      cumulativePoints += round.complete
        ? getFormulaOneCalculatorRoundPoints(round, driver)
        : getFormulaOneCalculatorSelectedPoints(data, state, raceEvent, driver);
      if (sprintRound) {
        cumulativePoints += sprintRound.complete
          ? getFormulaOneCalculatorRoundPoints(sprintRound, driver)
          : getFormulaOneCalculatorSelectedPoints(
              data,
              state,
              sprintEvent,
              driver,
            );
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
    const maxPoints = Math.max(
      25,
      ...series.flatMap((entry) => entry.values.map((value) => value.points)),
    );
    const yMax = Math.ceil(maxPoints / 25) * 25;
    const xForIndex = (index) =>
      margin.left +
      (data.rounds.length === 1
        ? 0
        : (index / (data.rounds.length - 1)) * plotWidth);
    const yForPoints = (points) =>
      margin.top + plotHeight - (points / yMax) * plotHeight;
    const completedRoundIndex = data.rounds.findLastIndex(
      (round) => round.complete,
    );
    const projectionX =
      completedRoundIndex >= 0 && completedRoundIndex < data.rounds.length - 1
        ? (xForIndex(completedRoundIndex) +
            xForIndex(completedRoundIndex + 1)) /
          2
        : null;
    const yGrid = Array.from({ length: 6 }, (_, index) => {
      const points = Math.round((yMax / 5) * index);
      const y = yForPoints(points);
      return `
        <line class="formula-one-chart-grid" x1="${margin.left}" x2="${width - margin.right}" y1="${y}" y2="${y}"></line>
        <text class="formula-one-chart-label" x="${margin.left - 10}" y="${y + 4}" text-anchor="end">${escapeHtml(points)}</text>
      `;
    }).join("");
    const xLabels = data.rounds
      .map((round, index) => {
        return `<text class="formula-one-chart-label" x="${xForIndex(index)}" y="${height - 18}" text-anchor="middle">R${escapeHtml(round.id)}</text>`;
      })
      .join("");
    const lines = series
      .map((entry) => {
        const points = entry.values
          .map(
            (value, index) => `${xForIndex(index)},${yForPoints(value.points)}`,
          )
          .join(" ");
        const markers = entry.values
          .map(
            (value, index) => `
        <circle cx="${xForIndex(index)}" cy="${yForPoints(value.points)}" r="3.5" fill="${escapeHtml(entry.color)}">
          <title>${escapeHtml(`${entry.driver} — Round ${value.roundId}: ${value.points} points`)}</title>
        </circle>
      `,
          )
          .join("");
        return `
        <polyline class="formula-one-chart-line" points="${points}" stroke="${escapeHtml(entry.color)}"></polyline>
        ${markers}
      `;
      })
      .join("");

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
        ${
          projectionX === null
            ? ""
            : `
          <line class="formula-one-chart-projection" x1="${projectionX}" x2="${projectionX}" y1="${margin.top}" y2="${margin.top + plotHeight}"></line>
          <text class="formula-one-chart-projection-label" x="${projectionX + 8}" y="${margin.top + 14}">Projection</text>
        `
        }
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

  function connect(year) {
    const container = getContainer(String(year));
    if (!container || connectedContainers.has(container)) return;
    connectedContainers.add(container);

    container.addEventListener("change", (event) => {
      const data = getData(String(year));
      if (!data) return;

      const state = getFormulaOneCalculatorState(year, data);
      const filter = event.target.closest(
        "[data-formula-one-calculator-filter]",
      );
      const simplePositionSelect = event.target.closest(
        "[data-formula-one-calculator-simple-position]",
      );
      if (simplePositionSelect) {
        applyFormulaOneCalculatorSimpleSelection(
          data,
          state,
          getFormulaOneCalculatorEvents(data),
          simplePositionSelect.dataset.driver,
          simplePositionSelect.value,
        );
        persistFormulaOneCalculatorState(year, data, state);
        renderFormulaOneCalculator(year);
        return;
      }
      if (filter) {
        if (filter.checked) state.visibleDrivers.add(filter.dataset.driver);
        else state.visibleDrivers.delete(filter.dataset.driver);
        persistFormulaOneCalculatorState(year, data, state);
        renderFormulaOneCalculator(year);
        return;
      }

      const positionSelect = event.target.closest(
        "[data-formula-one-calculator-position]",
      );
      if (!positionSelect) return;
      const tableScrollLeft =
        positionSelect.closest(".formula-one-calculator-table-wrap")
          ?.scrollLeft ?? 0;
      const key = getFormulaOneCalculatorSelectionKey(
        positionSelect.dataset.eventType,
        positionSelect.dataset.roundId,
        positionSelect.dataset.driver,
      );
      if (positionSelect.value) state.selections[key] = positionSelect.value;
      else delete state.selections[key];
      delete state.simpleSelections[positionSelect.dataset.driver];
      persistFormulaOneCalculatorState(year, data, state);
      renderFormulaOneCalculator(year);
      const tableWrap = container.querySelector(
        ".formula-one-calculator-table-wrap",
      );
      if (tableWrap) tableWrap.scrollLeft = tableScrollLeft;
    });

    container.addEventListener("click", (event) => {
      const viewToggle = event.target.closest(
        "[data-formula-one-calculator-view]",
      );
      const filterToggle = event.target.closest(
        "[data-formula-one-calculator-filter-toggle]",
      );
      const showAllButton = event.target.closest(
        "[data-formula-one-calculator-show-all]",
      );
      const hideAllButton = event.target.closest(
        "[data-formula-one-calculator-hide-all]",
      );
      const protagonistsButton = event.target.closest(
        "[data-formula-one-calculator-show-protagonists]",
      );
      const resetButton = event.target.closest(
        "[data-formula-one-calculator-reset]",
      );
      const sortButton = event.target.closest(
        "[data-formula-one-calculator-sort]",
      );
      if (
        !viewToggle &&
        !filterToggle &&
        !showAllButton &&
        !hideAllButton &&
        !protagonistsButton &&
        !resetButton &&
        !sortButton
      )
        return;

      const data = getData(String(year));
      if (!data) return;
      const state = getFormulaOneCalculatorState(year, data);
      if (viewToggle) {
        state.viewMode =
          viewToggle.dataset.formulaOneCalculatorView === "expanded"
            ? "expanded"
            : "simple";
        renderFormulaOneCalculator(year);
        return;
      }
      if (filterToggle) {
        state.filtersExpanded = !state.filtersExpanded;
        renderFormulaOneCalculator(year);
        return;
      }
      if (sortButton) {
        const column =
          sortButton.dataset.formulaOneCalculatorSort === "projected"
            ? "projected"
            : "current";
        state.sortDirection =
          state.sortColumn === column && state.sortDirection === "desc"
            ? "asc"
            : "desc";
        state.sortColumn = column;
        persistFormulaOneCalculatorState(year, data, state);
        renderFormulaOneCalculator(year);
        return;
      }
      if (resetButton) {
        resetFormulaOneCalculatorState(year, data, state);
        renderFormulaOneCalculator(year);
        return;
      }
      state.visibleDrivers = new Set(
        showAllButton
          ? data.driversToWatch
          : protagonistsButton
            ? getFormulaOneCalculatorProtagonists(data)
            : [],
      );
      persistFormulaOneCalculatorState(year, data, state);
      renderFormulaOneCalculator(year);
    });
  }

  return {
    parseData: parseFormulaOneCalculatorData,
    render(year) {
      connect(year);
      renderFormulaOneCalculator(year);
    },
    renderError: renderFormulaOneCalculatorError,
  };
}

function normalize(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function calculatorPointNumber(value) {
  const number = Number(
    String(value ?? "")
      .trim()
      .replace(/,/g, ""),
  );
  return Number.isFinite(number) ? number : 0;
}
