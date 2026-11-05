import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  saveBaseline,
  seenQueryKey,
  type Baseline,
  type SharedBaselines,
} from "./electionSeen";
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
const signed = (value: number) =>
  value === 0
    ? "—"
    : `${value > 0 ? "+" : "−"}${Math.abs(value).toLocaleString()}`;
const changeLabel = (value: number, metric: string) =>
  value === 0
    ? `No change in ${metric} since seen`
    : `${signed(value)} ${metric} since seen`;
const name = (candidate: Candidate) =>
  `${candidate.first} ${candidate.last}`.trim();

export function RaceResults({
  candidates,
  caption,
  raceKey,
  baseline,
  baselineLoaded,
  isAdmin,
  sourceUpdated,
  canMarkSeen,
}: {
  candidates: Candidate[];
  caption: string;
  raceKey: string;
  baseline: Baseline | null;
  baselineLoaded: boolean;
  isAdmin: boolean;
  sourceUpdated: number;
  canMarkSeen: boolean;
}) {
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: () =>
      saveBaseline({
        raceKey,
        candidates,
        sourceUpdated,
        expectedRevision: baseline?.revision || 0,
      }),
    onMutate: () => client.cancelQueries({ queryKey: seenQueryKey }),
    onSuccess: ({ baseline: saved }) => {
      client.setQueryData<SharedBaselines>(seenQueryKey, (current) => ({
        baselines: { ...current?.baselines, [raceKey]: saved },
      }));
    },
    onSettled: () => void client.invalidateQueries({ queryKey: seenQueryKey }),
  });
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
    if (
      !isAdmin ||
      !canMarkSeen ||
      mutation.isPending ||
      (baseline && !comparison)
    )
      return;
    mutation.mutate();
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
                  <small
                    className={styles.change}
                    aria-label={
                      Object.hasOwn(comparison.votes, candidate.id)
                        ? changeLabel(
                            candidate.votes - comparison.votes[candidate.id],
                            "votes",
                          )
                        : "New candidate since seen"
                    }
                  >
                    {Object.hasOwn(comparison.votes, candidate.id)
                      ? signed(candidate.votes - comparison.votes[candidate.id])
                      : "New"}
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
                <small
                  className={styles.change}
                  aria-label={changeLabel(
                    total - comparison.total,
                    "total votes",
                  )}
                >
                  {signed(total - comparison.total)}
                </small>
              )}
            </td>
            <td />
          </tr>
        </tfoot>
      </table>
      <p className={styles.gap}>
        <span>Lead</span>
        <strong>
          {gap === null || gap === 0 ? "—" : `${gap.toLocaleString()} votes`}
        </strong>
        {gap !== null && comparison && comparison.gap !== null && (
          <small
            className={styles.change}
            aria-label={changeLabel(gap - comparison.gap, "lead")}
          >
            {signed(gap - comparison.gap)}
          </small>
        )}
        {gap !== null && (
          <span className={styles.srOnly}>
            {gap === 0
              ? "Tied"
              : `${name(leaders[0])} leads ${name(leaders[1])}`}
          </span>
        )}
      </p>
      <div className={styles.seen}>
        {isAdmin && (
          <button
            type="button"
            className="action-button"
            disabled={
              !canMarkSeen ||
              mutation.isPending ||
              Boolean(baseline && !comparison)
            }
            onClick={markSeen}
            aria-label={`Mark ${caption} seen`}
          >
            {mutation.isPending ? "Saving…" : "Mark seen"}
          </button>
        )}
        {baseline ? (
          <p>
            Compared with{" "}
            <time dateTime={baseline.markedAt}>
              {new Date(baseline.markedAt).toLocaleString()}
            </time>
          </p>
        ) : (
          <p>{baselineLoaded ? "Not marked seen" : "Loading comparison…"}</p>
        )}
        {baseline && !comparison && <p role="status">Awaiting newer counts.</p>}
        {mutation.isSuccess && (
          <span className={styles.srOnly} role="status">
            Shared seen baseline saved.
          </span>
        )}
        {mutation.isError && (
          <p role="alert">Save failed. {mutation.error.message}</p>
        )}
      </div>
    </>
  );
}
