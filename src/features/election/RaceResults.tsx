import { useState } from "react";
import styles from "./ElectionPage.module.css";

export interface Candidate {
  id: string;
  first: string;
  last: string;
  party: string;
  votes: number;
  percent: number;
  winner?: string;
}
interface Baseline {
  markedAt: string;
  sourceUpdated: number;
  votes: Record<string, number>;
  total: number;
  gap: number | null;
}

function readBaseline(key: string): Baseline | null {
  try {
    const value = JSON.parse(
      localStorage.getItem(key) || "null",
    ) as Baseline | null;
    if (
      !value ||
      !Number.isFinite(Date.parse(value.markedAt)) ||
      !Number.isFinite(value.sourceUpdated) ||
      !Number.isFinite(value.total) ||
      !(value.gap === null || Number.isFinite(value.gap)) ||
      !value.votes ||
      typeof value.votes !== "object" ||
      Array.isArray(value.votes) ||
      !Object.values(value.votes).every(Number.isFinite)
    )
      return null;
    return value;
  } catch {
    return null;
  }
}

const signed = (value: number) =>
  `${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(value).toLocaleString()}`;
const name = (candidate: Candidate) =>
  `${candidate.first} ${candidate.last}`.trim();

export function RaceResults({
  candidates,
  caption,
  storageKey,
  isAdmin,
  sourceUpdated,
  canMarkSeen,
}: {
  candidates: Candidate[];
  caption: string;
  storageKey: string;
  isAdmin: boolean;
  sourceUpdated: number;
  canMarkSeen: boolean;
}) {
  const [baseline, setBaseline] = useState(() => readBaseline(storageKey));
  const [saveError, setSaveError] = useState(false);
  const [saved, setSaved] = useState(false);
  const sorted = [...candidates].sort(
    (a, b) => b.votes - a.votes || a.id.localeCompare(b.id),
  );
  const leaders = sorted
    .filter((candidate) => !(candidate.last === "Other" && !candidate.first))
    .slice(0, 2);
  const total = candidates.reduce((sum, candidate) => sum + candidate.votes, 0);
  const gap = leaders.length === 2 ? leaders[0].votes - leaders[1].votes : null;
  // A cached/older source must not be presented as new votes after a baseline.
  const comparison =
    baseline && sourceUpdated >= baseline.sourceUpdated ? baseline : null;
  function markSeen() {
    if (!isAdmin || !canMarkSeen || (baseline && !comparison)) return;
    const next: Baseline = {
      markedAt: new Date().toISOString(),
      sourceUpdated,
      votes: Object.fromEntries(
        candidates.map((candidate) => [candidate.id, candidate.votes]),
      ),
      total,
      gap,
    };
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      setBaseline(next);
      setSaveError(false);
      setSaved(true);
    } catch {
      setSaveError(true);
      setSaved(false);
    }
  }
  return (
    <>
      <table>
        <caption className={styles.caption}>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Candidate</th>
            <th scope="col">Votes</th>
            <th scope="col">Share</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((candidate) => (
            <tr key={candidate.id}>
              <th scope="row">
                {name(candidate)}{" "}
                <small>
                  {candidate.party}
                  {candidate.winner === "X" ? " · AP winner" : ""}
                </small>
              </th>
              <td>
                {candidate.votes.toLocaleString()}
                {comparison && (
                  <small className={styles.change}>
                    {Object.hasOwn(comparison.votes, candidate.id)
                      ? `${signed(candidate.votes - comparison.votes[candidate.id])} since seen`
                      : "New since seen"}
                  </small>
                )}
              </td>
              <td>{(candidate.percent * 100).toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">Total votes</th>
            <td>
              {total.toLocaleString()}
              {comparison && (
                <small className={styles.change}>
                  {signed(total - comparison.total)} since seen
                </small>
              )}
            </td>
            <td />
          </tr>
        </tfoot>
      </table>
      <p className={styles.gap}>
        {gap === null ? (
          "Top-two gap unavailable until two candidates are reported."
        ) : (
          <>
            Top-two gap: <strong>{gap.toLocaleString()} votes</strong> ·{" "}
            {gap === 0
              ? "Tied"
              : `${name(leaders[0])} leads ${name(leaders[1])}`}
            {comparison && comparison.gap !== null && (
              <small className={styles.change}>
                {signed(gap - comparison.gap)} votes since seen
              </small>
            )}
          </>
        )}
      </p>
      <div className={styles.seen}>
        {isAdmin && (
          <button
            type="button"
            className="action-button"
            disabled={!canMarkSeen || Boolean(baseline && !comparison)}
            onClick={markSeen}
            aria-label={`Mark ${caption} seen`}
          >
            Mark seen
          </button>
        )}
        {baseline ? (
          <p>
            Comparing against results marked seen:{" "}
            <time dateTime={baseline.markedAt}>
              {new Date(baseline.markedAt).toLocaleString()}
            </time>
            .<br />
            Baseline source updated:{" "}
            {new Date(baseline.sourceUpdated).toLocaleString()}.
          </p>
        ) : (
          <p>
            No seen baseline saved
            {isAdmin ? ". Mark seen to start comparing vote changes." : "."}
          </p>
        )}
        {baseline && !comparison && (
          <p role="status">
            These source results are older than your seen baseline. Changes will
            appear when newer results arrive.
          </p>
        )}
        {isAdmin && <small>Saved in this browser for your account.</small>}
        {saved && <p role="status">Seen baseline saved.</p>}
        {saveError && (
          <p role="alert">
            Could not save the seen baseline. Allow browser storage and try
            again.
          </p>
        )}
      </div>
    </>
  );
}
