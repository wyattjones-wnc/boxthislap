const positions = [
  ["all", "All positions"],
  ["goalkeeper", "Goalkeeper"],
  ["defender", "Defender"],
  ["midfielder", "Midfielder"],
  ["forward", "Forward"],
] as const;

function LoadingCard({ text }: { text: string }) {
  return (
    <article className="formula-one-question-card">
      <p className="table-message">{text}</p>
    </article>
  );
}

function LeagueHeading({
  subtitle,
  title,
}: {
  subtitle: string;
  title: string;
}) {
  return (
    <div className="league-detail-heading">
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
    </div>
  );
}

function MatchPage({ day }: { day: "Today" | "Tomorrow" }) {
  const id = `${day.toLowerCase()}-match-list`;
  return (
    <>
      <div className="section-heading">
        <h1>{day}</h1>
      </div>
      <div className="match-list" id={id}>
        <article className="match-card">
          <div className="match-header">
            <h2>Loading matches...</h2>
            <p>{day}</p>
          </div>
          <table className="pair-table">
            <tbody>
              <tr>
                <th scope="row">Status</th>
                <td>No match data loaded yet.</td>
              </tr>
            </tbody>
          </table>
        </article>
      </div>
    </>
  );
}

export function TodayPage() {
  return <MatchPage day="Today" />;
}

export function TomorrowPage() {
  return <MatchPage day="Tomorrow" />;
}

export function WorldCupResultsPage() {
  return (
    <>
      <div className="section-heading page-heading-with-action results-heading">
        <div className="heading-title">
          <h1>World Cup Results</h1>
          <p className="updated-time" data-updated-time>
            Loading update time...
          </p>
        </div>
        <div className="heading-actions heading-actions-right">
          <a className="action-button" href="#matches" data-page-link="matches">
            Matches
          </a>
        </div>
      </div>
      <div className="results-grid" id="dynamic-result-images" />
    </>
  );
}

function PositionSelect({ id }: { id: string }) {
  return (
    <select id={id} defaultValue="all">
      {positions.map(([value, label]) => (
        <option value={value} key={value}>
          {label}
        </option>
      ))}
    </select>
  );
}

export function WorldCupDraftPage() {
  return (
    <>
      <div className="section-heading">
        <h1>Draft</h1>
      </div>
      <div className="tabs" role="tablist" aria-label="Draft views">
        <button
          className="tab is-active"
          type="button"
          data-draft-view="nations"
          aria-selected="true"
        >
          Nations
        </button>
        <button
          className="tab"
          type="button"
          data-draft-view="players"
          aria-selected="false"
        >
          Players
        </button>
      </div>
      <div className="draft-panel is-active" data-draft-panel="nations">
        <div className="draft-list" id="draft-nations-list">
          <article className="draft-card">
            <p className="table-message">Loading draft nations...</p>
          </article>
        </div>
      </div>
      <div className="draft-panel" data-draft-panel="players">
        <div className="standings-controls">
          <label className="select-control compact-select-control">
            <span>Position</span>
            <PositionSelect id="draft-player-position-filter" />
          </label>
        </div>
        <div className="draft-list" id="draft-players-list">
          <article className="draft-card">
            <p className="table-message">Loading draft players...</p>
          </article>
        </div>
      </div>
    </>
  );
}

function StandingsTable({
  columns,
  id,
  message,
  rowsClassName,
}: {
  columns: string[];
  id: string;
  message: string;
  rowsClassName: string;
}) {
  return (
    <div className="table-wrap standings-table">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody id={id} className={rowsClassName}>
          <tr>
            <td className="table-message" colSpan={columns.length}>
              {message}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function WorldCupStandingsPage() {
  return (
    <>
      <div className="section-heading page-heading-with-action standings-heading">
        <h1>Standings</h1>
        <div className="standings-filter-controls">
          <label className="standings-scope-toggle">
            <span>All data</span>
            <input
              id="standings-all-data-toggle"
              type="checkbox"
              defaultChecked
            />
          </label>
          <label className="select-control standings-round-control">
            <span>Round</span>
            <select id="standings-round-select" defaultValue="">
              <option value="">All</option>
            </select>
          </label>
        </div>
      </div>
      <section className="standings-awards" id="standings-awards" hidden>
        <div className="standings-awards-heading">
          <h2>Awards</h2>
        </div>
        <div className="standings-awards-list" id="standings-awards-list" />
      </section>
      <div className="tabs" role="tablist" aria-label="Standings views">
        <button
          className="tab is-active"
          type="button"
          data-tab="players-championship"
          role="tab"
          aria-selected="true"
        >
          Players&apos; Championship
        </button>
        <button
          className="tab"
          type="button"
          data-tab="nations-league"
          role="tab"
          aria-selected="false"
        >
          Nations League
        </button>
        <button
          className="tab"
          type="button"
          data-tab="manager-results"
          role="tab"
          aria-selected="false"
        >
          Manager Results
        </button>
      </div>
      <div
        className="tab-panel is-active"
        data-tab-panel="players-championship"
        role="tabpanel"
      >
        <div className="standings-controls">
          <label className="select-control compact-select-control">
            <span>Position</span>
            <PositionSelect id="player-position-filter" />
          </label>
        </div>
        <StandingsTable
          columns={["Rank", "Player", "Team / Manager", "Matches", "Points"]}
          id="player-championship-rows"
          message="Loading player performance data..."
          rowsClassName="compact-standing-rows"
        />
      </div>
      <div
        className="tab-panel"
        data-tab-panel="nations-league"
        role="tabpanel"
      >
        <StandingsTable
          columns={["Rank", "Nation", "Record / Manager", "Matches", "Points"]}
          id="nations-league-rows"
          message="Loading Nations League results..."
          rowsClassName="compact-standing-rows"
        />
      </div>
      <div
        className="tab-panel"
        data-tab-panel="manager-results"
        role="tabpanel"
      >
        <div className="standings-controls">
          <label className="select-control compact-select-control">
            <span>Show</span>
            <select id="manager-results-filter" defaultValue="all">
              <option value="all">All</option>
              <option value="players">Players</option>
              <option value="nations">Nations</option>
            </select>
          </label>
        </div>
        <StandingsTable
          columns={["Rank", "Manager", "Points"]}
          id="manager-results-rows"
          message="Loading manager results..."
          rowsClassName="compact-manager-rows"
        />
      </div>
      <div className="standings-test-control" data-admin-only hidden>
        <label className="standings-test-toggle">
          <input id="nation-test-scoring-toggle" type="checkbox" />
          <span>Test</span>
        </label>
      </div>
    </>
  );
}

export function WorldCupRulesPage() {
  return (
    <>
      <div className="league-detail-heading">
        <div>
          <h1>Test Rules</h1>
          <p>Nation scoring proposal</p>
        </div>
      </div>
      <section
        className="rules-breakdown-card"
        aria-labelledby="rules-nation-heading"
      >
        <div className="rules-breakdown-heading">
          <div>
            <h2 id="rules-nation-heading">Nation Breakdown</h2>
            <p>
              Select a nation to see every scored match and how the Test value
              is calculated.
            </p>
          </div>
          <label
            className="select-control compact-select-control"
            htmlFor="rules-nation-select"
          >
            <span>Nation</span>
            <select id="rules-nation-select" defaultValue="">
              <option value="">Loading nations...</option>
            </select>
          </label>
        </div>
        <div className="rules-breakdown" id="rules-nation-breakdown">
          <p className="table-message">
            Select a nation to see the point breakdown.
          </p>
        </div>
      </section>
      <div className="rules-grid">
        <article className="rule-card">
          <h2>Purpose</h2>
          <p>
            The Test toggle recalculates nation points with a more aggressive
            reward for national team results and adds a simple appearance point
            for players.
          </p>
        </article>
        <article className="rule-card">
          <h2>Base Results</h2>
          <ul>
            <li>Group stage win: 9 points.</li>
            <li>Knockout stage win: 15 points.</li>
            <li>Draw: 3 points.</li>
            <li>Penalty shootout loss: 6 points.</li>
          </ul>
        </article>
        <article className="rule-card">
          <h2>Upsets</h2>
          <p>
            A win over a nation from a higher pot earns an additional 3 points.
            A draw can also earn the upset bonus when the lower-pot nation is
            more than one pot below its opponent.
          </p>
          <p>
            Example: Pot C drawing Pot A earns the draw points plus the upset
            bonus.
          </p>
        </article>
        <article className="rule-card">
          <h2>Knockout Pot Bonus</h2>
          <p>
            Knockout winners from lower pots receive an additional pot bonus.
            These bonuses are doubled from the original draft concept.
          </p>
          <ul>
            <li>Pot A: no bonus.</li>
            <li>Pot B: +2 points.</li>
            <li>Pot C: +4 points.</li>
            <li>Pot D: +6 points.</li>
            <li>Pot E: +8 points.</li>
            <li>Pot G: +10 points.</li>
          </ul>
        </article>
        <article className="rule-card">
          <h2>Players</h2>
          <p>
            Each Player Performance row earns 1 point for playing in that match.
            Any other points from the sheet are added on top of that appearance
            point.
          </p>
        </article>
        <article className="rule-card">
          <h2>What Changes</h2>
          <p>
            When Test is on, Nations League, Players&apos; Championship, Manager
            Results, draft totals, and match-card points use these calculated
            values. Draft eligibility rules are unchanged.
          </p>
        </article>
      </div>
    </>
  );
}

export function WorldCupMatchesPage() {
  return (
    <>
      <div className="section-heading page-heading-with-action">
        <h1>Matches</h1>
        <label className="select-control">
          <span>Matchday</span>
          <select id="matchday-select" defaultValue="loading">
            <option value="loading">Loading matchdays...</option>
          </select>
        </label>
      </div>
      <div className="match-list" id="matchday-match-list">
        <article className="match-card">
          <div className="match-header">
            <h2>Loading matches...</h2>
            <p>Matchday</p>
          </div>
        </article>
      </div>
    </>
  );
}

export function WorldCupBracketPage() {
  return (
    <>
      <div className="section-heading page-heading-with-action">
        <h1>Bracket</h1>
        <div className="bracket-actions">
          <label className="bracket-submitter bracket-submission-viewer">
            <span>Submitted</span>
            <select id="bracket-submission-select" defaultValue="">
              <option value="">Official</option>
            </select>
          </label>
          <button
            className="action-button secondary-action"
            id="bracket-clear-picks"
            type="button"
            hidden
            disabled
          >
            Clear Picks
          </button>
        </div>
      </div>
      <p
        className="bracket-submit-status"
        id="bracket-submit-status"
        role="status"
      />
      <div className="bracket-shell" id="bracket-view">
        <article className="match-card">
          <div className="match-header">
            <h2>Loading bracket...</h2>
            <p>Knockout rounds</p>
          </div>
        </article>
      </div>
    </>
  );
}

export function WorldCupTestingPage() {
  const columns = [
    "ID",
    "Name",
    "Team",
    "Position",
    "Player #",
    "Transfermarkt Price",
    "Drafted",
  ];
  return (
    <>
      <div className="section-heading">
        <h1>Testing</h1>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody id="testing-player-rows">
            <tr>
              <td colSpan={7}>Loading Google Sheets data...</td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}

export function LeaguesPage() {
  return (
    <>
      <div className="section-heading page-heading-with-action">
        <h1>Leagues</h1>
        <label className="select-control">
          <span>Year</span>
          <select id="league-year-select" defaultValue="2026">
            <option value="2026">2026</option>
            <option value="2025">2025</option>
            <option value="2024">2024</option>
          </select>
        </label>
      </div>
      <div className="league-list" id="league-list" />
    </>
  );
}

export function FantasyCriticPage({ year }: { year: 2025 | 2026 }) {
  return <div id={`fantasy-critic-${year}-content`} />;
}

export function FormulaOneQuestionsPage({
  year,
}: {
  year: 2024 | 2025 | 2026;
}) {
  const prefix = year === 2024 ? "formula-one" : `formula-one-${year}`;
  return (
    <>
      <div
        className={`league-detail-heading${year === 2026 ? " formula-one-question-heading" : ""}`}
      >
        <div>
          <h2>Formula 1</h2>
          <p>{year} Questions</p>
        </div>
        {year === 2026 ? (
          <a
            className="action-button formula-one-question-manage-link"
            href="#formula-1-2026-manage"
            data-page-link="formula-1-2026-manage"
            data-admin-only
            hidden
          >
            Manage
          </a>
        ) : null}
      </div>
      <div className="formula-one-controls">
        <label className="select-control">
          <span>Question</span>
          <select id={`${prefix}-question-select`} defaultValue="">
            <option value="">All questions</option>
          </select>
        </label>
        <label className="filter-control">
          <span>Filter</span>
          <input
            id={`${prefix}-question-filter`}
            type="search"
            placeholder="Search"
          />
        </label>
      </div>
      <div className="formula-one-question-list" id={`${prefix}-question-list`}>
        <LoadingCard text="Loading Formula 1 questions..." />
      </div>
    </>
  );
}

export function FormulaOneResultsPage({ year }: { year: 2024 | 2025 | 2026 }) {
  const resultsPrefix = year === 2024 ? "formula-one" : `formula-one-${year}`;
  const awardsPrefix = `formula-one-${year}`;
  return (
    <>
      <LeagueHeading title="Formula 1" subtitle={`${year} Results`} />
      {year !== 2024 ? (
        <div
          className="formula-one-results-toggle"
          role="group"
          aria-label="Formula 1 result type"
        >
          <button
            className="tab is-active"
            type="button"
            data-formula-one-results-year={year}
            data-formula-one-results-mode="yearly"
            aria-pressed="true"
          >
            Yearly
          </button>
          <button
            className="tab"
            type="button"
            data-formula-one-results-year={year}
            data-formula-one-results-mode="weekly"
            aria-pressed="false"
          >
            Weekly
          </button>
        </div>
      ) : null}
      <section
        className="standings-awards formula-one-awards"
        id={`${awardsPrefix}-awards`}
        hidden
      >
        <div className="standings-awards-heading">
          <h2>Awards</h2>
        </div>
        <div
          className="standings-awards-list"
          id={`${awardsPrefix}-awards-list`}
        />
      </section>
      {year !== 2024 ? (
        <div
          className="formula-one-controls formula-one-results-weekly-controls"
          id={`${resultsPrefix}-results-weekly-controls`}
          hidden
        >
          <label className="select-control">
            <span>Rounds</span>
            <select
              id={`${resultsPrefix}-results-weekly-group`}
              defaultValue="all"
            >
              <option value="all">All</option>
            </select>
          </label>
        </div>
      ) : null}
      <StandingsTable
        columns={["Rank", "Manager", "Points"]}
        id={`${resultsPrefix}-results-rows`}
        message="Loading Formula 1 results..."
        rowsClassName="compact-manager-rows"
      />
    </>
  );
}

export function FormulaOne2025WeeklyPage() {
  return (
    <>
      <LeagueHeading title="Formula 1" subtitle="2025 Weekly" />
      <div className="formula-one-controls">
        <label className="select-control">
          <span>Round</span>
          <select id="formula-one-2025-weekly-round-select" defaultValue="">
            <option value="">All rounds</option>
          </select>
        </label>
      </div>
      <div
        className="formula-one-weekly-list"
        id="formula-one-2025-weekly-list"
      >
        <LoadingCard text="Loading Formula 1 weekly picks..." />
      </div>
    </>
  );
}

export function FormulaOne2026WeeklyPage() {
  return (
    <>
      <LeagueHeading title="Formula 1" subtitle="2026 Weekly" />
      <div
        className="tabs formula-one-tabs"
        role="tablist"
        aria-label="2026 Formula 1 weekly sections"
      >
        <button
          className="tab is-active"
          type="button"
          data-tab="formula-one-2026-weekly-bet"
          aria-selected="true"
          role="tab"
        >
          Bet
        </button>
        <button
          className="tab"
          type="button"
          data-tab="formula-one-2026-weekly-results"
          aria-selected="false"
          role="tab"
        >
          Results
        </button>
        <button
          className="tab"
          type="button"
          data-tab="formula-one-2026-weekly-managers"
          aria-selected="false"
          role="tab"
        >
          Managers&apos; Championship
        </button>
      </div>
      <section
        className="tab-panel is-active"
        data-tab-panel="formula-one-2026-weekly-bet"
        role="tabpanel"
      >
        <div
          className="formula-one-form-card"
          id="formula-one-2026-weekly-form"
        >
          <p className="table-message">
            Loading your Formula 1 weekly choices...
          </p>
        </div>
      </section>
      <section
        className="tab-panel"
        data-tab-panel="formula-one-2026-weekly-results"
        role="tabpanel"
      >
        <div className="formula-one-controls">
          <label className="select-control">
            <span>Round</span>
            <select id="formula-one-2026-weekly-round-select" defaultValue="">
              <option value="">All rounds</option>
            </select>
          </label>
        </div>
        <div
          className="formula-one-weekly-list"
          id="formula-one-2026-weekly-list"
        >
          <LoadingCard text="Loading Formula 1 weekly picks..." />
        </div>
      </section>
      <section
        className="tab-panel"
        data-tab-panel="formula-one-2026-weekly-managers"
        role="tabpanel"
      >
        <StandingsTable
          columns={["Rank", "Manager", "Points"]}
          id="formula-one-2026-weekly-managers"
          message="Loading Formula 1 weekly standings..."
          rowsClassName="compact-manager-rows"
        />
      </section>
    </>
  );
}

export function FormulaOneAdminPage({ mode }: { mode: "manage" | "review" }) {
  const id =
    mode === "manage"
      ? "formula-one-2026-weekly-admin"
      : "formula-one-2026-review-content";
  return (
    <div className="formula-one-admin" id={id}>
      <p className="table-message">
        Loading Formula 1 {mode === "manage" ? "administration" : "data review"}
        ...
      </p>
    </div>
  );
}

export function FormulaOneCalculatorPage() {
  return (
    <>
      <LeagueHeading title="Formula 1" subtitle="2026 Points Calculator" />
      <div
        className="formula-one-calculator"
        id="formula-one-2026-calculator-content"
      >
        <p className="table-message">Loading Formula 1 points calculator...</p>
      </div>
    </>
  );
}

export function FantasyOfficePage({
  mode,
  year,
}: {
  mode: "draft" | "movies" | "results";
  year: 2025 | 2026;
}) {
  const singular =
    mode === "movies" ? "movie" : mode === "results" ? "result" : "draft";
  const className =
    mode === "draft"
      ? "office-draft-grid"
      : mode === "movies"
        ? "office-movie-list"
        : "office-result-list";
  const message =
    year === 2026 && mode !== "draft"
      ? `No Fantasy Office ${mode === "movies" ? "movie results" : "results"} are available yet.`
      : `Loading Fantasy Office ${mode}...`;
  return (
    <>
      <LeagueHeading
        title="Fantasy Office"
        subtitle={`${year} ${mode[0].toUpperCase()}${mode.slice(1)}`}
      />
      <div className={className} id={`fantasy-office-${year}-${singular}-list`}>
        <article
          className={
            mode === "movies"
              ? "formula-one-question-card"
              : "fantasy-critic-card"
          }
        >
          <p className="table-message">{message}</p>
        </article>
      </div>
    </>
  );
}
