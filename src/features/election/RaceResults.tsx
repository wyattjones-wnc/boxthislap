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

const compactTimestamp = (value: string | number) =>
  new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

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
  const leaderIds = new Set(leaders.map((candidate) => candidate.id));
  const others = candidates.filter((candidate) => !leaderIds.has(candidate.id));
  const rows: (Candidate & { grouped?: boolean })[] = [...leaders];
  if (others.length)
    rows.push({
      id: "__grouped-other__",
      first: "",
      last: "Other",
      party: "",
      grouped: true,
      votes: others.reduce((sum, candidate) => sum + candidate.votes, 0),
      percent: others.reduce((sum, candidate) => sum + candidate.percent, 0),
    });
  const total = candidates.reduce((sum, candidate) => sum + candidate.votes, 0);
  const democrat = sorted.find((candidate) =>
    ["dem", "democrat", "democratic", "d"].includes(
      candidate.party.trim().toLowerCase(),
    ),
  );
  const republican = sorted.find((candidate) =>
    ["gop", "rep", "republican", "r"].includes(
      candidate.party.trim().toLowerCase(),
    ),
  );
  const gap = democrat && republican ? democrat.votes - republican.votes : null;
  // A cached/older source must not be presented as new votes after a baseline.
  const comparison =
    baseline && sourceUpdated >= baseline.sourceUpdated ? baseline : null;
  // Derive the old signed lead from saved candidate counts, so existing
  // baselines using the former absolute gap need no migration or re-mark.
  const priorGap =
    comparison &&
    democrat &&
    republican &&
    Object.hasOwn(comparison.votes, democrat.id) &&
    Object.hasOwn(comparison.votes, republican.id)
      ? comparison.votes[democrat.id] - comparison.votes[republican.id]
      : null;
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
          {rows.map((candidate) => {
            const priorVotes = comparison
              ? candidate.grouped
                ? comparison.total -
                  leaders.reduce(
                    (sum, leader) => sum + (comparison.votes[leader.id] || 0),
                    0,
                  )
                : comparison.votes[candidate.id]
              : undefined;
            const change =
              priorVotes === undefined
                ? undefined
                : candidate.votes - priorVotes;
            return (
              <tr key={candidate.id}>
                <th scope="row">
                  {name(candidate)}{" "}
                  {(candidate.party || candidate.winner === "X") && (
                    <small>
                      {candidate.party}
                      {candidate.winner === "X" ? " · AP winner" : ""}
                    </small>
                  )}
                </th>
                <td>
                  {candidate.votes.toLocaleString()}
                  {comparison && (
                    <small
                      className={styles.change}
                      aria-label={
                        change === undefined
                          ? "New candidate since seen"
                          : changeLabel(change, "votes")
                      }
                    >
                      {change === undefined ? "New" : signed(change)}
                    </small>
                  )}
                </td>
                <td>{(candidate.percent * 100).toFixed(1)}%</td>
              </tr>
            );
          })}
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
        <span title="Democratic candidate votes minus Republican candidate votes">
          Lead (D − R)
        </span>
        <strong>
          {gap === null || gap === 0 ? "—" : `${signed(gap)} votes`}
        </strong>
        {gap !== null && priorGap !== null && (
          <small
            className={styles.change}
            aria-label={changeLabel(gap - priorGap, "lead")}
          >
            {signed(gap - priorGap)}
          </small>
        )}
        {gap !== null && (
          <span className={styles.srOnly}>
            {gap === 0
              ? "Tied"
              : gap > 0
                ? `${name(democrat!)} leads ${name(republican!)}`
                : `${name(republican!)} leads ${name(democrat!)}`}
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
        <p className={styles.timing}>
          <span>
            {baseline ? (
              <>
                Compared with{" "}
                <time
                  dateTime={baseline.markedAt}
                  title={new Date(baseline.markedAt).toLocaleString(undefined, {
                    hour12: true,
                  })}
                >
                  {compactTimestamp(baseline.markedAt)}
                </time>
              </>
            ) : baselineLoaded ? (
              "Not marked seen"
            ) : (
              "Loading comparison…"
            )}
          </span>
          <span aria-hidden="true"> · </span>
          <span title="Race update timestamp supplied by NPR/AP">
            Updated{" "}
            <time
              dateTime={new Date(sourceUpdated).toISOString()}
              title={new Date(sourceUpdated).toLocaleString(undefined, {
                hour12: true,
              })}
            >
              {compactTimestamp(sourceUpdated)}
            </time>
          </span>
        </p>
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
