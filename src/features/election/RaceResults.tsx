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
  `${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(value).toLocaleString()}`;
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
            {baselineLoaded
              ? "No shared seen baseline saved"
              : "Shared baseline not loaded"}
            {baselineLoaded && isAdmin
              ? ". Mark seen to start comparing vote changes."
              : "."}
          </p>
        )}
        {baseline && !comparison && (
          <p role="status">
            These source results are older than the shared seen baseline.
            Changes will appear when newer results arrive.
          </p>
        )}
        <small>The admin sets this comparison baseline for everyone.</small>
        {mutation.isSuccess && <p role="status">Shared seen baseline saved.</p>}
        {mutation.isError && (
          <p role="alert">
            Could not save the shared seen baseline. {mutation.error.message}
          </p>
        )}
      </div>
    </>
  );
}
