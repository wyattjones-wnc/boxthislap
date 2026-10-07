import { FloatingField } from "../../components/FloatingField/FloatingField";
import { useQuery } from "@tanstack/react-query";
import { useState, type CSSProperties } from "react";
import { useAppState } from "../../app/providers";
import { DATA_SOURCES, parseCsvRows } from "../../../dataLoader.js";
import {
  FORMULA_ONE_ENDPOINT,
  MANAGER_COLORS,
} from "../../../modules/siteConfig.js";
import {
  getFormulaOneQuestionProgress,
  normalizeFormulaOneQuestionText,
} from "../../../modules/formulaOneProgress.js";
import { formatFormulaOneQuestionOption } from "../../../modules/formulaOnePublic.js";
import styles from "./FormulaOne2026QuestionsFeature.module.css";

export interface FormulaOneBet {
  manager: string;
  bet: string;
  points: number | string;
}
export interface FormulaOneQuestion {
  id: string;
  number: number;
  question: string;
  answer: string;
  bets: FormulaOneBet[];
}
interface ProgressSection {
  label: string;
  entries: Array<[string, number | string]>;
  unit?: string;
}
interface QuestionProgress extends ProgressSection {
  sections?: ProgressSection[];
  details?: string[];
  betProgress?: Record<string, string>;
}
export interface SeasonProgress {
  counts: Record<string, Record<string, number>>;
  drivers: Array<Record<string, unknown>>;
  constructors: Array<Record<string, unknown>>;
  rounds: Array<Record<string, unknown>>;
  teammatePairs: Array<Record<string, unknown>>;
  completedRounds: number;
}

export function parseFormulaOne2026Questions(
  csv: string,
): FormulaOneQuestion[] {
  const rows: string[][] = parseCsvRows(csv).filter((row: string[]) =>
    row.some((value) => value.trim()),
  );
  if (rows[1]?.[0] !== "Question" || rows[1]?.[1] !== "Answer")
    throw new Error("Formula 1 questions could not be read.");
  const managers = (rows[0] || [])
    .map((name, column) => ({ name: name.trim(), column }))
    .filter(({ name, column }) => name && column >= 2);
  return rows
    .slice(2)
    .filter((row) => row[0]?.trim().toLowerCase() !== "total")
    .map((row, index) => {
      const question = {
        id: `question-${index + 1}`,
        number: index + 1,
        question: row[0]?.trim() || "",
        answer: row[1]?.trim() || "",
        bets: managers.map(({ name, column }) => {
          const rawPoints = row[column + 1]?.trim() || "";
          return {
            manager: name,
            bet: row[column]?.trim() || "",
            points:
              rawPoints && Number.isFinite(Number(rawPoints))
                ? Number(rawPoints)
                : rawPoints,
          };
        }),
      };
      return {
        ...question,
        question: normalizeFormulaOneQuestionText(question, "2026"),
      };
    })
    .filter((question) => question.question);
}

async function loadQuestions(signal: AbortSignal) {
  const response = await fetch(DATA_SOURCES.sheets.formulaOne2026, {
    signal,
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Formula 1 questions are unavailable.");
  return parseFormulaOne2026Questions(await response.text());
}
async function loadProgress(signal: AbortSignal): Promise<SeasonProgress> {
  const response = await fetch(
    `${FORMULA_ONE_ENDPOINT.replace(/\/$/, "")}/api/seasons/2026/questions/progress`,
    { signal },
  );
  if (!response.ok) throw new Error("Provisional results are unavailable.");
  const data = await response.json();
  if (!data.ok || !Array.isArray(data.drivers) || !Array.isArray(data.rounds))
    throw new Error("Provisional results are unavailable.");
  return data;
}

export function getQuestionProgress(
  question: FormulaOneQuestion,
  season?: SeasonProgress,
) {
  return !question.answer && season
    ? (getFormulaOneQuestionProgress(
        question,
        season,
      ) as QuestionProgress | null)
    : null;
}

function ProgressEntries({
  entries,
  unit,
}: Pick<ProgressSection, "entries" | "unit">) {
  return entries.length ? (
    <ul>
      {entries.map(([name, value], index) => (
        <li key={`${name}:${index}`}>
          {name}:{" "}
          <strong>
            {value}
            {unit ? ` ${unit}` : ""}
          </strong>
        </li>
      ))}
    </ul>
  ) : null;
}
function ProvisionalResult({ progress }: { progress: QuestionProgress }) {
  return (
    <div className={styles.progress}>
      <p>
        <strong>In Progress</strong> · {progress.label}
      </p>
      <ProgressEntries entries={progress.entries} unit={progress.unit} />
      {progress.sections?.map((section) => (
        <div key={section.label}>
          <p>
            <strong>{section.label}</strong>
          </p>
          <ProgressEntries entries={section.entries} unit={section.unit} />
        </div>
      ))}
      {progress.details?.length ? (
        <ul>
          {progress.details.map((detail, index) => (
            <li key={index}>{detail}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
function ManagerChip({ name }: { name: string }) {
  const displayName = name.trim().split(/\s+/)[0] || "Manager";
  const color =
    MANAGER_COLORS[displayName.toLowerCase() as keyof typeof MANAGER_COLORS] ||
    "#5f6978";
  return (
    <span
      className="manager-chip"
      style={{ "--manager-color": color } as CSSProperties}
    >
      <span aria-hidden="true" className="manager-dot" />
      <span className="manager-name">{displayName}</span>
    </span>
  );
}

export function FormulaOne2026QuestionsPage() {
  const { route, session } = useAppState();
  const [selection, setSelection] = useState("in-progress");
  const [search, setSearch] = useState("");
  const enabled = route === "formula-1-2026-questions";
  const questions = useQuery({
    queryKey: ["formula-one", 2026, "questions"],
    queryFn: ({ signal }) => loadQuestions(signal),
    enabled,
  });
  const season = useQuery({
    queryKey: ["formula-one", 2026, "question-progress"],
    queryFn: ({ signal }) => loadProgress(signal),
    enabled,
    staleTime: 60_000,
  });
  const isAdmin = Boolean(session?.isAdmin || session?.manager?.isAdmin);
  const filtered = (questions.data || []).filter((question) => {
    if (
      selection === "in-progress" &&
      (!question.bets.some((bet) => bet.bet.trim()) ||
        !getQuestionProgress(question, season.data))
    )
      return false;
    if (selection && selection !== "in-progress" && selection !== question.id)
      return false;
    return question.question
      .toLowerCase()
      .includes(search.trim().toLowerCase());
  });
  const message = questions.isPending
    ? "Loading Formula 1 questions..."
    : questions.isError
      ? "Formula 1 questions are unavailable."
      : selection === "in-progress" && season.isPending
        ? "Loading provisional Formula 1 data..."
        : selection === "in-progress" && season.isError
          ? "Provisional results are unavailable. Select All questions to view bets."
          : selection === "in-progress" && !search.trim()
            ? "No questions have provisional data yet. Select All questions to view bets."
            : "No Formula 1 questions match that filter.";
  return (
    <>
      <div className="league-detail-heading formula-one-question-heading">
        <div>
          <h2>Formula 1</h2>
          <p>2026 Questions</p>
        </div>
        {isAdmin ? (
          <a
            className="action-button formula-one-question-manage-link"
            href="#formula-1-2026-manage"
            data-page-link="formula-1-2026-manage"
          >
            Manage
          </a>
        ) : null}
      </div>
      <div className="formula-one-controls">
        <FloatingField className="select-control">
          <span>Question</span>
          <select
            id="formula-one-2026-question-select"
            value={selection}
            onChange={(event) => {
              setSelection(event.target.value);
              setSearch("");
            }}
          >
            <option value="in-progress">In Progress</option>
            <option value="">All questions</option>
            {questions.data?.map((question) => (
              <option
                key={question.id}
                value={question.id}
                title={question.question}
              >
                {formatFormulaOneQuestionOption(question)}
              </option>
            ))}
          </select>
        </FloatingField>
        <FloatingField className="filter-control">
          <span>Filter</span>
          <input
            id="formula-one-2026-question-filter"
            type="search"
            placeholder="Search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </FloatingField>
      </div>
      <div className={styles.list} id="formula-one-2026-question-list">
        {!filtered.length ? (
          <article className={styles.card}>
            <p className={styles.message}>{message}</p>
            {questions.isError ||
            (selection === "in-progress" && season.isError) ? (
              <button
                className="action-button"
                onClick={() => {
                  if (questions.isError) void questions.refetch();
                  if (season.isError) void season.refetch();
                }}
              >
                Retry
              </button>
            ) : null}
          </article>
        ) : (
          filtered.map((question) => {
            const progress = getQuestionProgress(question, season.data);
            return (
              <article className={styles.card} key={question.id}>
                <header>
                  <span className={styles.number}>
                    Question {question.number}
                  </span>
                  <h3>{question.question}</h3>
                  {question.answer &&
                  !question.question
                    .toLowerCase()
                    .includes("bold prediction") ? (
                    <p>
                      Answer: <strong>{question.answer}</strong>
                    </p>
                  ) : null}
                  {progress ? <ProvisionalResult progress={progress} /> : null}
                </header>
                <div>
                  {question.bets.map((bet, index) => (
                    <div className={styles.bet} key={`${bet.manager}:${index}`}>
                      <div>
                        <ManagerChip name={bet.manager} />
                        <p>{bet.bet || "No bet listed"}</p>
                        {progress?.betProgress?.[bet.bet] ? (
                          <p>{progress.betProgress[bet.bet]}</p>
                        ) : null}
                      </div>
                      <strong>
                        {typeof bet.points === "number" &&
                        !Number.isInteger(bet.points)
                          ? bet.points.toFixed(1)
                          : bet.points}
                      </strong>
                    </div>
                  ))}
                </div>
              </article>
            );
          })
        )}
      </div>
    </>
  );
}
