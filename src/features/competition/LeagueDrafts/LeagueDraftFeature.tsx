import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ContainedDialog } from "../../../components/ContainedDialog/ContainedDialog";
import { FloatingField } from "../../../components/FloatingField/FloatingField";
import { useEffect, useState, type FormEvent } from "react";
import { useAppState } from "../../../app/providers";
import {
  draftEndpoint,
  draftTestSite,
  draftPushDeviceEnabled,
  draftLink,
  draftQueryKey,
  draftRequest,
  enableDraftPush,
  managerName,
} from "./api";
import type {
  Draft,
  DraftConfiguration,
  DraftOption,
  League,
  Participant,
} from "./types";
import styles from "./LeagueDrafts.module.css";

function useDrafts(league?: League) {
  const { session } = useAppState();
  const managerId = session?.managerId || "";
  const client = useQueryClient();
  useEffect(() => {
    let channel: BroadcastChannel | undefined;
    try {
      channel = new BroadcastChannel("boxthislap-league-drafts");
      channel.onmessage = () => {
        void client.invalidateQueries({ queryKey: ["league-drafts"] });
      };
    } catch {
      /* Polling remains available. */
    }
    return () => channel?.close();
  }, [client]);
  const query = useQuery({
    queryKey: draftQueryKey(managerId, league),
    queryFn: () =>
      draftRequest<{ drafts: Draft[] }>(
        league ? `/api/drafts?league=${league}` : "/api/me/drafts",
        Boolean(managerId),
      ),
    enabled:
      Boolean(draftEndpoint()) && (Boolean(league) || Boolean(managerId)),
    staleTime: 0,
    refetchInterval: (query) =>
      !league
        ? 30_000
        : !query.state.data?.drafts.length ||
            query.state.data.drafts.some((draft) =>
              ["setup", "published", "active", "paused"].includes(draft.status),
            )
          ? 10_000
          : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
  return { ...query, managerId };
}

function useDraftAction(draft: Draft) {
  const client = useQueryClient();
  const { session } = useAppState();
  return useMutation({
    mutationFn: ({
      action,
      body = {},
    }: {
      action: string;
      body?: Record<string, unknown>;
    }) =>
      draftRequest<{ draft: Draft }>(
        `/api/drafts/${draft.id}/${action}`,
        true,
        {
          method: action === "preferences" ? "PUT" : "POST",
          body: JSON.stringify({ ...body, revision: draft.revision }),
        },
      ),
    onSuccess: async ({ draft: updated }) => {
      // Immediate ownership/turn update followed by authoritative refresh in both views.
      for (const league of [updated.league, undefined])
        client.setQueryData<{ drafts: Draft[] }>(
          draftQueryKey(session?.managerId || "", league),
          (old) =>
            old
              ? {
                  drafts: old.drafts.map((entry) =>
                    entry.id === updated.id ? updated : entry,
                  ),
                }
              : old,
        );
      await client.invalidateQueries({ queryKey: ["league-drafts"] });
      try {
        const channel = new BroadcastChannel("boxthislap-league-drafts");
        channel.postMessage(updated.id);
        channel.close();
      } catch {
        /* Polling remains available. */
      }
    },
    onError: () => {
      void client.invalidateQueries({ queryKey: ["league-drafts"] });
    },
  });
}

function LoginLink() {
  return (
    <a
      className="action-button"
      href="#login"
      data-page-link="login"
      onClick={() =>
        sessionStorage.setItem(
          "boxThisLapDraftLoginReturn",
          window.location.hash.slice(1),
        )
      }
    >
      Log in
    </a>
  );
}

export function DraftBanner({
  draft,
  managerId,
  compact = false,
}: {
  draft: Draft;
  managerId: string;
  compact?: boolean;
}) {
  const current = draft.schedule[draft.picks.length];
  const next = draft.schedule
    .slice(draft.picks.length)
    .find((pick) => pick.managerId === managerId);
  const participant = draft.participants.find(
    (manager) => manager.id === managerId,
  );
  let message =
    draft.status === "published"
      ? "Waiting for the admin to start."
      : draft.status === "setup"
        ? "Unpublished setup."
        : draft.status === "completed"
          ? "Draft completed. All selections are recorded below."
          : draft.status === "cancelled"
            ? `Draft cancelled. ${draft.reason}`
            : draft.status === "paused"
              ? `Draft paused. ${draft.reason}`
              : `Draft is open. ${current ? managerName(draft, current.managerId) : ""} is on the clock.`;
  if (draft.status === "active" && managerId) {
    message += participant
      ? next
        ? next.number === current?.number
          ? ` Your turn — round ${next.round}, pick #${next.number}.`
          : ` Your next pick is #${next.number} — ${next.number - (current?.number || 0)} selections before you.`
        : " Your selections are complete."
      : " You are not participating in this draft.";
  }
  const consecutive =
    draft.status === "active" &&
    current?.managerId === managerId &&
    draft.schedule[draft.picks.length + 1]?.managerId === managerId;
  if (compact)
    return (
      <section className={styles.thinBanner} aria-label="Draft status">
        <p role="status">
          {draft.status === "active"
            ? `Draft is open · ${participant && current?.managerId === managerId ? "Your turn" : `${managerName(draft, current?.managerId || "")} is picking`}`
            : draft.status === "paused"
              ? "Draft paused"
              : draft.status === "completed"
                ? "Draft completed"
                : draft.status === "published"
                  ? "Draft opens soon"
                  : draft.status === "cancelled"
                    ? "Draft cancelled"
                    : "Draft setup"}
        </p>
        {participant && ["active", "paused"].includes(draft.status) && (
          <a href={draftLink(draft, "active")}>
            Go to drafting <span aria-hidden="true">→</span>
          </a>
        )}
        {!managerId &&
          ["active", "published", "paused"].includes(draft.status) && (
            <LoginLink />
          )}
      </section>
    );
  return (
    <section
      className={`${styles.panel} ${styles.banner}`}
      aria-label="Draft status"
    >
      <span className={styles.badge}>
        {draft.status === "active" ? "Live draft" : draft.status}
      </span>
      <h2>{draft.name}</h2>
      <p role="status">{message}</p>
      {participant && (
        <p className={styles.muted}>
          Seed #{draft.participants.indexOf(participant) + 1} · {draft.rounds}{" "}
          picks per manager ·{" "}
          {draft.participants.length >= 4
            ? "Snake order"
            : "Repeating seed order"}
        </p>
      )}
      {consecutive && <p>You have another pick immediately after this one.</p>}
      {!managerId && (
        <>
          <p>Log in to see your position and make your pick.</p>
          <LoginLink />
        </>
      )}
      {participant && ["active", "paused"].includes(draft.status) && (
        <a className="action-button" href={draftLink(draft, "active")}>
          Go to drafting
        </a>
      )}
      {managerId && (
        <NotificationSettings draft={draft} managerId={managerId} />
      )}
    </section>
  );
}

function NotificationSettings({
  draft,
  managerId,
}: {
  draft: Draft;
  managerId: string;
}) {
  const { session } = useAppState();
  const admin = Boolean(session?.isAdmin || session?.manager?.isAdmin);
  const mutation = useDraftAction(draft);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState("");
  const [deviceEnabled, setDeviceEnabled] = useState(false);
  useEffect(() => {
    let active = true;
    setDeviceEnabled(false);
    void draftPushDeviceEnabled()
      .then((enabled) => {
        if (active) setDeviceEnabled(enabled);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [managerId, draft.preference.push]);
  if (!draft.participants.some((manager) => manager.id === managerId) && !admin)
    return null;
  const update = (enabled: boolean, push: boolean) =>
    mutation.mutate({ action: "preferences", body: { enabled, push } });
  return (
    <div>
      <p className={styles.muted}>
        Alerts cover draft start, your turn, pauses/resumes, and completion.
        Manager Hub alerts are automatic. Subscribing controls device push only.
      </p>
      <div className={styles.actions}>
        <button
          type="button"
          disabled={mutation.isPending || pushBusy}
          onClick={() =>
            update(!draft.preference.enabled, !draft.preference.enabled)
          }
        >
          {draft.preference.enabled
            ? "Unsubscribe from device alerts"
            : "Subscribe to device alerts"}
        </button>
        {draft.preference.enabled && (
          <button
            type="button"
            disabled={mutation.isPending || pushBusy}
            onClick={async () => {
              if (draft.preference.push && deviceEnabled) {
                update(true, false);
                return;
              }
              setPushBusy(true);
              setPushError("");
              try {
                await enableDraftPush();
                setDeviceEnabled(true);
                update(true, true);
              } catch (error) {
                setPushError((error as Error).message);
              } finally {
                setPushBusy(false);
              }
            }}
          >
            {pushBusy
              ? "Enabling browser push…"
              : draft.preference.push && deviceEnabled
                ? "Turn off draft browser push"
                : "Enable browser push on this device"}
          </button>
        )}
      </div>
      {draft.preference.enabled && (
        <p>
          {draft.preference.push
            ? deviceEnabled
              ? "Draft alerts are enabled; browser push is configured on this device."
              : "Draft alerts are enabled on your account. Enable browser push on this device to receive them here."
            : "Manager Hub alerts are always available. Browser push is off."}
        </p>
      )}
      {(pushError || mutation.error) && (
        <p role="alert" className={styles.error}>
          {pushError || mutation.error?.message}
        </p>
      )}
    </div>
  );
}

function optionKey(name: string) {
  return name
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("en-US");
}
function dateLabel(option: DraftOption) {
  return option.releaseDate
    ? new Date(`${option.releaseDate}T12:00:00Z`).toLocaleDateString(
        undefined,
        { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" },
      )
    : "Release date TBA";
}
function Options({
  draft,
  managerId,
  testMode = false,
}: {
  draft: Draft;
  managerId: string;
  testMode?: boolean;
}) {
  const [tab, setTab] = useState("pick");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<DraftOption | null>(null);
  const [retryKey, setRetryKey] = useState("");
  const mutation = useDraftAction(draft);
  const canPick =
    draft.status === "active" &&
    draft.schedule[draft.picks.length]?.managerId === managerId;
  const claimed = (option: DraftOption) =>
    draft.picks.find(
      (pick) =>
        pick.optionId === option.id ||
        optionKey(pick.optionName) === optionKey(option.name),
    );
  const taken = selected ? claimed(selected) : undefined;
  const exact = draft.options.find(
    (option) => optionKey(option.name) === optionKey(search),
  );
  const custom = exact || { id: "", name: search.trim() };
  const choose = (option: DraftOption) => {
    mutation.reset();
    setRetryKey(crypto.randomUUID());
    setSelected(option);
  };
  const options =
    tab === "resource"
      ? draft.options
      : search.trim()
        ? draft.options.filter((option) =>
            optionKey(option.name).includes(optionKey(search)),
          )
        : [];
  return (
    <section className={styles.panel} id="draft-options">
      <h2>{testMode ? "Admin test drafting" : "Active draft"}</h2>
      {testMode && (
        <p>
          Dev testing: make a selection for {managerName(draft, managerId)}. The
          selection will be marked as an admin test pick.
        </p>
      )}
      <div
        role="tablist"
        aria-label="Drafting views"
        className={styles.actions}
      >
        {["pick", "resource"].map((view) => (
          <button
            key={view}
            type="button"
            role="tab"
            id={`draft-${testMode ? "test-" : ""}${view}-tab`}
            aria-controls={`draft-${testMode ? "test-" : ""}panel`}
            aria-selected={tab === view}
            onClick={() => setTab(view)}
            tabIndex={tab === view ? 0 : -1}
            onKeyDown={(event) => {
              if (
                ["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
              ) {
                event.preventDefault();
                const next =
                  event.key === "Home"
                    ? "pick"
                    : event.key === "End"
                      ? "resource"
                      : view === "pick"
                        ? "resource"
                        : "pick";
                setTab(next);
                document
                  .getElementById(`draft-${testMode ? "test-" : ""}${next}-tab`)
                  ?.focus();
              }
            }}
          >
            {view === "pick" ? "Pick" : "Resource"}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`draft-${testMode ? "test-" : ""}panel`}
        aria-labelledby={`draft-${testMode ? "test-" : ""}${tab}-tab`}
      >
        {tab === "pick" && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (canPick && search.trim() && !claimed(custom)) choose(custom);
            }}
          >
            <FloatingField>
              <span>Movie or pick name</span>
              <input
                type="search"
                maxLength={200}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-describedby="pick-help"
              />
            </FloatingField>
            <p id="pick-help">
              Type any name to draft it, or choose a matching resource
              suggestion below.
            </p>
            <button
              type="submit"
              disabled={!canPick || !search.trim() || Boolean(claimed(custom))}
            >
              {claimed(custom)
                ? "Already taken"
                : `Draft${search.trim() ? ` ${search.trim()}` : " this name"}`}
            </button>
            {search.trim() && !options.length && (
              <p>No resource matches. You can still draft this name.</p>
            )}
          </form>
        )}
        {tab === "resource" && <h3>{draft.resourceLabel}</h3>}
        <div className={styles.grid}>
          {options.map((option) => {
            const pick = claimed(option);
            return (
              <article
                className={`${styles.panel} ${styles.option} ${pick ? styles.taken : ""}`}
                key={option.id}
              >
                <h3>{option.name}</h3>
                <p>{dateLabel(option)}</p>
                <p>
                  {pick
                    ? `Taken by ${managerName(draft, pick.managerId)} · round ${pick.round}, pick #${pick.number}`
                    : "Available"}
                </p>
                <button
                  type="button"
                  disabled={Boolean(pick) || !canPick}
                  onClick={() => choose(option)}
                >
                  {pick ? "Taken" : testMode ? "Test select" : "Draft this"}
                </button>
              </article>
            );
          })}
        </div>
        {tab === "resource" && !draft.options.length && (
          <p>No resource options yet. Use Pick to enter any name.</p>
        )}
      </div>
      {selected && (
        <ContainedDialog
          title="Confirm your selection"
          description={`${selected.name} · pick #${draft.picks.length + 1}`}
          close={() => {
            if (!mutation.isPending) setSelected(null);
          }}
          footer={
            <div className={styles.actions}>
              <button
                type="button"
                disabled={mutation.isPending || !canPick || Boolean(taken)}
                onClick={() =>
                  mutation.mutate(
                    {
                      action: testMode ? "test-pick" : "picks",
                      body: {
                        ...(selected.id
                          ? { optionId: selected.id }
                          : { optionName: selected.name }),
                        requestId: retryKey,
                      },
                    },
                    {
                      onSuccess: () => {
                        setSelected(null);
                        setSearch("");
                      },
                    },
                  )
                }
              >
                {mutation.isPending
                  ? "Saving…"
                  : testMode
                    ? "Confirm test pick"
                    : "Confirm pick"}
              </button>
              <button
                type="button"
                disabled={mutation.isPending}
                onClick={() => setSelected(null)}
              >
                Cancel
              </button>
            </div>
          }
        >
          {taken && (
            <p role="alert">
              This option has been taken. Choose another option.
            </p>
          )}
          {mutation.error && (
            <p role="alert" className={styles.error}>
              {mutation.error.message}
            </p>
          )}
          <p>
            {selected.id
              ? dateLabel(selected)
              : "This name is outside the resource."}
          </p>
        </ContainedDialog>
      )}
    </section>
  );
}
function Rosters({ draft }: { draft: Draft }) {
  return (
    <section aria-label="Draft choices">
      <div className={styles.grid}>
        {draft.participants.map((manager) => {
          const picks = draft.picks.filter(
            (pick) => pick.managerId === manager.id,
          );
          return (
            <article
              className={`${styles.panel} ${styles.roster}`}
              key={manager.id}
            >
              <header>
                <h2>{manager.name}</h2>
                <span>
                  {picks.length} / {draft.rounds}
                </span>
              </header>
              <ol>
                {Array.from({ length: draft.rounds }, (_, round) => {
                  const pick = picks.find((entry) => entry.round === round + 1);
                  return (
                    <li key={round}>
                      <span>Round {round + 1}</span>
                      <strong className={pick ? "" : styles.muted}>
                        {pick ? pick.optionName : "Awaiting pick"}
                      </strong>
                    </li>
                  );
                })}
              </ol>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ResourceDates({ draft }: { draft: Draft }) {
  const [dates, setDates] = useState<Record<string, string>>({});
  const mutation = useDraftAction(draft);
  return (
    <details className={styles.panel}>
      <summary>Resource release dates</summary>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate(
            {
              action: "resource-dates",
              body: {
                options: draft.options.map((option) => ({
                  id: option.id,
                  releaseDate: dates[option.id] ?? option.releaseDate ?? "",
                })),
              },
            },
            { onSuccess: () => setDates({}) },
          );
        }}
      >
        {draft.options.map((option) => (
          <FloatingField key={option.id}>
            <span>{option.name}</span>
            <input
              type="date"
              value={dates[option.id] ?? option.releaseDate ?? ""}
              onChange={(event) =>
                setDates({ ...dates, [option.id]: event.target.value })
              }
            />
          </FloatingField>
        ))}
        <button
          type="submit"
          disabled={mutation.isPending || !draft.options.length}
        >
          Save release dates
        </button>
        {mutation.error && <p role="alert">{mutation.error.message}</p>}
      </form>
    </details>
  );
}

function Order({ draft }: { draft: Draft }) {
  return (
    <section className={styles.panel}>
      <h2>Turn order</h2>
      <ol className={styles.order}>
        {draft.schedule.map((pick) => (
          <li
            className={
              pick.number === draft.picks.length + 1 &&
              ["active", "paused"].includes(draft.status)
                ? styles.current
                : ""
            }
            key={pick.number}
          >
            Round {pick.round} · {managerName(draft, pick.managerId)}
            {pick.number <= draft.picks.length
              ? " · Picked"
              : pick.number === draft.picks.length + 1 &&
                  ["active", "paused"].includes(draft.status)
                ? " · Current turn"
                : ""}
          </li>
        ))}
      </ol>
    </section>
  );
}

function History({ draft }: { draft: Draft }) {
  return (
    <section className={styles.panel}>
      <h2>Selections</h2>
      {draft.picks.length ? (
        <ol className={styles.history}>
          {draft.picks.map((pick) => (
            <li key={pick.number}>
              <strong>{pick.optionName}</strong> ·{" "}
              {managerName(draft, pick.managerId)} · round {pick.round}
              {pick.adminActor ? " · Admin test pick" : ""}
            </li>
          ))}
        </ol>
      ) : (
        <p>No selections yet.</p>
      )}
    </section>
  );
}

function Setup({
  league,
  draft,
  onSaved,
}: {
  league: League;
  draft?: Draft;
  onSaved: (id: string) => void;
}) {
  const [baseRevision, setBaseRevision] = useState(draft?.revision);
  const accounts = useQuery({
    queryKey: ["league-draft-managers"],
    queryFn: () =>
      draftRequest<{ managers: Participant[] }>("/api/managers", true),
    staleTime: 300_000,
  });
  const managers = accounts.data?.managers || [];
  const [name, setName] = useState(
    draft?.name ||
      `${league === "fantasy-office" ? "Fantasy Office" : "World Cup"} 2027`,
  );
  const [resourceLabel, setResourceLabel] = useState(
    draft?.resourceLabel ||
      (league === "fantasy-office" ? "Movies" : "Options"),
  );
  const [participants, setParticipants] = useState<Participant[]>(
    draft?.participants || [],
  );
  const [rounds, setRounds] = useState(draft?.rounds || 2);
  const [options, setOptions] = useState(
    draft?.options
      .map(
        (option) =>
          `${option.name}${option.releaseDate ? ` | ${option.releaseDate}` : ""}`,
      )
      .join("\n") || "",
  );
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: (configuration: DraftConfiguration) =>
      draftRequest<{ draft: Draft }>(
        draft ? `/api/drafts/${draft.id}/configure` : "/api/drafts",
        true,
        {
          method: "POST",
          body: JSON.stringify({
            ...configuration,
            ...(draft ? { revision: baseRevision } : {}),
          }),
        },
      ),
    onSuccess: async ({ draft: updated }) => {
      setBaseRevision(updated.revision);
      await client.invalidateQueries({ queryKey: ["league-drafts"] });
      onSaved(updated.id);
    },
  });
  function move(index: number, direction: number) {
    const next = [...participants];
    [next[index], next[index + direction]] = [
      next[index + direction],
      next[index],
    ];
    setParticipants(next);
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    const names = options
      .split("\n")
      .map((value) => value.trim())
      .filter(Boolean);
    mutation.mutate({
      league,
      year: 2027,
      name,
      resourceLabel,
      participants,
      rounds,
      options: names.map((value) => {
        const parts = value.split(/\s+\|\s+/);
        const name = parts[0];
        const existing = draft?.options.find((option) => option.name === name);
        return {
          id: existing?.id || crypto.randomUUID(),
          name,
          releaseDate: parts[1] || existing?.releaseDate || "",
        };
      }),
    });
  }
  const order = Array.from(
    {
      length:
        Number.isInteger(rounds) && rounds > 0 && rounds <= 24 ? rounds : 0,
    },
    (_, round) =>
      (participants.length >= 4 && round % 2
        ? [...participants].reverse()
        : participants
      )
        .map((manager) => manager.name)
        .join(" → "),
  );
  return (
    <form className={`${styles.panel} ${styles.stack}`} onSubmit={submit}>
      <h2>{draft ? "Edit draft setup" : "Create draft"}</h2>
      <FloatingField>
        <span>Draft name</span>
        <input
          required
          maxLength={160}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </FloatingField>
      {accounts.isLoading && <p>Loading manager accounts…</p>}
      {accounts.error && (
        <>
          <p role="alert">{accounts.error.message}</p>
          <button type="button" onClick={() => void accounts.refetch()}>
            Retry loading managers
          </button>
        </>
      )}
      <fieldset>
        <legend>Participating managers</legend>
        {[
          ...managers,
          ...participants.filter(
            (participant) =>
              !managers.some((manager) => manager.id === participant.id),
          ),
        ].map((manager) => (
          <label className={styles.check} key={manager.id}>
            <input
              type="checkbox"
              checked={participants.some((entry) => entry.id === manager.id)}
              onChange={(event) =>
                setParticipants(
                  event.target.checked
                    ? [...participants, manager]
                    : participants.filter((entry) => entry.id !== manager.id),
                )
              }
            />
            {manager.name}
          </label>
        ))}
      </fieldset>
      <ol className={styles.order}>
        {participants.map((manager, index) => (
          <li key={manager.id}>
            <div className={styles.seed}>
              <span>{manager.name}</span>
              <button
                type="button"
                aria-label={`Move ${manager.name} earlier`}
                disabled={index === 0}
                onClick={() => move(index, -1)}
              >
                Earlier
              </button>
              <button
                type="button"
                aria-label={`Move ${manager.name} later`}
                disabled={index === participants.length - 1}
                onClick={() => move(index, 1)}
              >
                Later
              </button>
            </div>
          </li>
        ))}
      </ol>
      <FloatingField>
        <span>Rounds / picks per manager</span>
        <input
          type="number"
          min={1}
          max={24}
          required
          value={rounds}
          onChange={(event) => setRounds(Number(event.target.value))}
        />
      </FloatingField>
      <p>
        {participants.length >= 4
          ? "Snake order is required with four or more managers."
          : "The seed order repeats each round for fewer than four managers."}
      </p>
      <FloatingField>
        <span>Resource label</span>
        <input
          required
          maxLength={80}
          value={resourceLabel}
          onChange={(event) => setResourceLabel(event.target.value)}
        />
      </FloatingField>
      <FloatingField>
        <span>Options — name | YYYY-MM-DD, one per line</span>
        <textarea
          rows={10}
          value={options}
          onChange={(event) => setOptions(event.target.value)}
        />
      </FloatingField>
      <p className={styles.muted}>
        Resource suggestions are optional. Managers can also draft names outside
        the resource.
      </p>
      <button
        type="button"
        onClick={() =>
          setOptions(
            Array.from(
              { length: Math.max(12, participants.length * rounds) },
              (_, index) =>
                `Test ${league === "fantasy-office" ? "Movie" : "Option"} ${index + 1}`,
            ).join("\n"),
          )
        }
      >
        Fill with sample test options
      </button>
      <details>
        <summary>Preview pick schedule</summary>
        <ol>
          {order.map((round, index) => (
            <li key={index}>
              Round {index + 1}: {round}
            </li>
          ))}
        </ol>
      </details>
      {mutation.error && (
        <p role="alert" className={styles.error}>
          {mutation.error.message}
        </p>
      )}
      {draft && (
        <button
          type="button"
          disabled={mutation.isPending}
          onClick={() => {
            setName(draft.name);
            setResourceLabel(draft.resourceLabel);
            setParticipants(draft.participants);
            setRounds(draft.rounds);
            setOptions(draft.options.map((option) => option.name).join("\n"));
            setBaseRevision(draft.revision);
            mutation.reset();
          }}
        >
          Reload saved setup (discard unsaved edits)
        </button>
      )}
      <button
        type="submit"
        disabled={
          mutation.isPending || participants.length < 2 || !accounts.data
        }
      >
        {mutation.isPending ? "Saving…" : "Save setup"}
      </button>
    </form>
  );
}

function Manage({
  draft,
  league,
  onSaved,
}: {
  draft: Draft;
  league: League;
  onSaved: (id: string) => void;
}) {
  const mutation = useDraftAction(draft);
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState("");
  const actions =
    draft.status === "setup"
      ? ["publish", "cancel"]
      : draft.status === "published"
        ? ["start", "cancel"]
        : draft.status === "active"
          ? ["pause", ...(draft.picks.length ? ["undo"] : []), "cancel"]
          : draft.status === "paused"
            ? ["resume", ...(draft.picks.length ? ["undo"] : []), "cancel"]
            : draft.status === "completed" && draft.picks.length
              ? ["undo"]
              : [];
  return (
    <>
      {["setup", "published"].includes(draft.status) && (
        <Setup
          key={`${draft.id}-${draft.status}`}
          draft={draft}
          league={league}
          onSaved={onSaved}
        />
      )}
      {draft.status === "active" && draftTestSite() && (
        <Options
          draft={draft}
          managerId={draft.schedule[draft.picks.length].managerId}
          testMode
        />
      )}
      <section className={`${styles.panel} ${styles.stack}`}>
        <h2>Draft controls</h2>
        {["setup", "published"].includes(draft.status) && (
          <p>Publish and Start use the saved setup. Save any edits first.</p>
        )}
        <FloatingField>
          <span>Reason for pause, undo, or cancellation</span>
          <input
            maxLength={500}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </FloatingField>
        <div className={styles.actions}>
          {actions.map((action) => (
            <button
              type="button"
              key={action}
              disabled={
                mutation.isPending ||
                (["pause", "undo", "cancel"].includes(action) && !reason.trim())
              }
              onClick={() => setConfirm(action)}
            >
              {action === "undo"
                ? "Undo latest pick"
                : action.charAt(0).toUpperCase() + action.slice(1)}
            </button>
          ))}
        </div>
        {mutation.error && (
          <p role="alert" className={styles.error}>
            {mutation.error.message}
          </p>
        )}
        {confirm && (
          <ContainedDialog
            title={`Confirm ${confirm}`}
            close={() => {
              if (!mutation.isPending) setConfirm("");
            }}
          >
            <p>
              {confirm === "start"
                ? "Start this draft and open the first manager’s turn? The seed order and options will be locked."
                : confirm === "undo"
                  ? "Release the latest selection and pause the draft? Resume must be explicit."
                  : confirm === "cancel"
                    ? "Cancel this draft? Existing selections remain recorded and taken."
                    : `${confirm} this draft?`}
            </p>
            <button
              type="button"
              disabled={mutation.isPending}
              onClick={() =>
                mutation.mutate(
                  { action: confirm, body: { reason } },
                  {
                    onSuccess: () => {
                      setConfirm("");
                      setReason("");
                    },
                  },
                )
              }
            >
              Confirm {confirm}
            </button>

            <button
              type="button"
              disabled={mutation.isPending}
              onClick={() => setConfirm("")}
            >
              Back
            </button>
          </ContainedDialog>
        )}
        <details>
          <summary>Audit history</summary>
          <ul>
            {draft.audit?.map((entry, index) => (
              <li key={index}>
                {new Date(entry.at).toLocaleString()} · {entry.action} · manager{" "}
                {entry.actor}
                {entry.reason ? ` · ${entry.reason}` : ""}
              </li>
            ))}
          </ul>
        </details>
      </section>
    </>
  );
}

export function LeagueDraftPage({
  league,
  mode,
}: {
  league: League;
  mode: "draft" | "active" | "manage";
}) {
  const { session } = useAppState();
  const query = useDrafts(league);
  const admin = Boolean(session?.isAdmin || session?.manager?.isAdmin);
  const requested = new URLSearchParams(
    window.location.hash.split("?")[1] || "",
  ).get("draft");
  const [selected, setSelected] = useState(() => {
    try {
      return (
        requested ||
        sessionStorage.getItem(`boxThisLapLeagueDraft:${league}`) ||
        ""
      );
    } catch {
      return requested || "";
    }
  });
  function selectDraft(id: string) {
    setSelected(id);
    try {
      sessionStorage.setItem(`boxThisLapLeagueDraft:${league}`, id);
    } catch {
      /* Selection still works for this page. */
    }
  }
  const [creating, setCreating] = useState(false);
  const drafts = query.data?.drafts || [];
  const draft =
    drafts.find((entry) => entry.id === selected) ||
    (!requested
      ? drafts.find((entry) => entry.status === "active") || drafts[0]
      : undefined);
  useEffect(() => {
    if (!query.data) return;
    document.documentElement.setAttribute(
      `data-${league}-draft-open`,
      String(
        drafts.some((entry) => ["active", "paused"].includes(entry.status)),
      ),
    );
  }, [query.data, league, drafts]);
  const client = useQueryClient();
  useEffect(() => {
    const update = () => {
      const id = new URLSearchParams(
        window.location.hash.split("?")[1] || "",
      ).get("draft");
      if (id) {
        setSelected(id);
        try {
          sessionStorage.setItem(`boxThisLapLeagueDraft:${league}`, id);
        } catch {
          /* Optional persistence. */
        }
      }
    };
    window.addEventListener("hashchange", update);
    let channel: BroadcastChannel | undefined;
    try {
      channel = new BroadcastChannel("boxthislap-league-drafts");
      channel.onmessage = () => {
        void client.invalidateQueries({ queryKey: ["league-drafts"] });
      };
    } catch {
      /* Polling is the fallback. */
    }
    return () => {
      window.removeEventListener("hashchange", update);
      channel?.close();
    };
  }, [client, league]);
  if (mode === "manage" && !admin)
    return <p>Administrator access is required.</p>;
  const saved = (id: string) => {
    selectDraft(id);
    setCreating(false);
  };
  return (
    <div className={styles.stack}>
      <div className="league-detail-heading">
        <div>
          <h1>
            {league === "fantasy-office" ? "Fantasy Office" : "World Cup"}
          </h1>
          <p>
            2027 ·{" "}
            {mode === "active"
              ? "Active draft"
              : mode === "manage"
                ? "Manage drafts"
                : "Draft"}
          </p>
        </div>
      </div>
      {!draftEndpoint() && (
        <p>League drafting is currently available on dev.</p>
      )}
      {query.isLoading && <p>Loading drafts…</p>}
      {query.error && (
        <section className={styles.panel}>
          <p role="alert" className={styles.error}>
            {query.error.message}
          </p>
          <button type="button" onClick={() => void query.refetch()}>
            Retry
          </button>
        </section>
      )}
      {drafts.length > 1 && (
        <FloatingField>
          <span>Draft</span>
          <select
            value={draft?.id || ""}
            onChange={(event) => {
              selectDraft(event.target.value);
              setCreating(false);
            }}
          >
            <option value="" disabled>
              Choose draft
            </option>
            {drafts.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name} · {entry.status}
              </option>
            ))}
          </select>
        </FloatingField>
      )}
      {admin && mode === "manage" && (
        <button type="button" onClick={() => setCreating(!creating)}>
          {creating ? "Back to existing draft" : "Create another draft"}
        </button>
      )}
      {mode === "manage" &&
        (creating || (!draft && !query.isLoading && !query.error)) && (
          <Setup league={league} onSaved={saved} />
        )}
      {!draft && !query.isLoading && !query.error && mode !== "manage" && (
        <section className={styles.panel}>
          <h2>
            {selected ? "Draft not found" : "A draft has not been scheduled."}
          </h2>
          {!query.managerId && (
            <>
              <p>Log in to see your drafts and notification settings.</p>
              <LoginLink />
            </>
          )}
          {admin && (
            <a
              href={`#${league}-2027-manage`}
              data-page-link={`${league}-2027-manage`}
            >
              Create a draft
            </a>
          )}
        </section>
      )}
      {draft && !creating && (
        <>
          <DraftBanner
            draft={draft}
            managerId={query.managerId}
            compact={mode === "draft"}
          />
          {mode === "manage" ? (
            <>
              <Manage draft={draft} league={league} onSaved={saved} />
              <ResourceDates draft={draft} />
            </>
          ) : mode === "active" ? (
            ["active", "paused"].includes(draft.status) ? (
              <Options
                key={`${draft.id}-${query.managerId}`}
                draft={draft}
                managerId={query.managerId}
              />
            ) : (
              <p>
                The draft is not open.{" "}
                <a href={draftLink(draft)}>View league draft choices</a>
              </p>
            )
          ) : (
            <Rosters draft={draft} />
          )}
          {mode === "manage" && (
            <>
              <Order draft={draft} />
              <History draft={draft} />
            </>
          )}
        </>
      )}
    </div>
  );
}

export function LeagueDraftHubCard() {
  const query = useDrafts();
  const drafts = [...(query.data?.drafts || [])].sort(
    (a, b) =>
      Number(
        b.status === "active" &&
          b.schedule[b.picks.length]?.managerId === query.managerId,
      ) -
      Number(
        a.status === "active" &&
          a.schedule[a.picks.length]?.managerId === query.managerId,
      ),
  );
  return (
    <section
      className={`manager-hub-card ${styles.stack}`}
      aria-label="League drafts"
    >
      <h2>League Drafts</h2>
      {!draftEndpoint() ? (
        <p>2027 drafting is available on dev.</p>
      ) : !query.managerId ? (
        <p>Log in to load league drafts.</p>
      ) : query.isLoading ? (
        <p>Loading league drafts…</p>
      ) : query.error ? (
        <>
          <p role="alert">{query.error.message}</p>
          <button type="button" onClick={() => void query.refetch()}>
            Retry
          </button>
        </>
      ) : !drafts.length ? (
        <p>No league drafts yet.</p>
      ) : (
        drafts.map((draft) => {
          const next = draft.schedule
            .slice(draft.picks.length)
            .find((pick) => pick.managerId === query.managerId);
          return (
            <article className={styles.panel} key={draft.id}>
              <h3>{draft.name}</h3>
              <p>
                2027 ·{" "}
                {draft.league === "fantasy-office"
                  ? "Fantasy Office"
                  : "World Cup"}{" "}
                · {draft.status}
              </p>
              <p>
                {draft.status === "active"
                  ? next?.number === draft.picks.length + 1
                    ? `Your turn · pick #${next.number}`
                    : next
                      ? `Your next pick is #${next.number} — ${next.number - draft.picks.length - 1} selections before you.`
                      : "No remaining selections for you."
                  : draft.status === "published"
                    ? "Waiting for the admin to start."
                    : draft.reason}
              </p>
              <a className="action-button" href={draftLink(draft)}>
                Open draft
              </a>
              <NotificationSettings draft={draft} managerId={query.managerId} />
              {draft.notifications.map((event) => (
                <p key={event.id}>
                  {event.title}: {event.body}
                </p>
              ))}
            </article>
          );
        })
      )}
    </section>
  );
}
