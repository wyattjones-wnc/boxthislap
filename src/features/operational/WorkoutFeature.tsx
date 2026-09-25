import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Dialog from "@radix-ui/react-dialog";
import {
  BarChart3,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Dumbbell,
  Minus,
  Pencil,
  Plus,
  RotateCcw,
  Settings2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAppState } from "../../app/providers";
import { IconButton } from "../../components/IconButton/IconButton";
import styles from "./WorkoutFeature.module.css";

const ENDPOINT = "https://box-this-lap-rankings.boxthislap.workers.dev";

declare global {
  interface Window {
    boxThisLapGetManagerAccessToken?: () => Promise<string>;
  }
}

interface WorkoutExercise {
  active?: boolean;
  checked: boolean;
  completionCount: number | null;
  id: string;
  name: string;
  position: number;
  videoUrl: string;
}

interface Workout {
  completedAt: string | null;
  date: string;
  elapsedSeconds: number;
  exercises: WorkoutExercise[];
  remainingSeconds: number;
  running: boolean;
  sets: number;
  timerDurationSeconds: number;
}

interface ExerciseRecord {
  active: boolean;
  id: string;
  name: string;
  videoUrl: string;
}

interface WorkoutDay {
  completed: boolean;
  date: string;
}

interface HistoryRow {
  date: string;
  elapsedSeconds: number;
  sets: number;
}

async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await window.boxThisLapGetManagerAccessToken?.();
  if (!token) throw new Error("Sign in to continue.");
  const response = await fetch(`${ENDPOINT}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const value = (await response.json().catch(() => ({}))) as T & {
    error?: string;
    ok?: boolean;
  };
  if (!response.ok || value.ok === false)
    throw new Error(value.error || "Workout data could not be saved.");
  return value;
}

function localDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatTime(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

function prettyDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function WorkoutFeature() {
  const { route, session } = useAppState();
  const queryClient = useQueryClient();
  const isAdmin = Boolean(session?.isAdmin || session?.manager?.isAdmin);
  const ownManagerId = String(session?.managerId || "");
  const today = localDate();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [selectedManager, setSelectedManager] = useState(ownManagerId);
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [statsOpen, setStatsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [exerciseEditor, setExerciseEditor] = useState<
    ExerciseRecord | "new" | null
  >(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [correctionOpen, setCorrectionOpen] = useState(false);

  useEffect(() => setSelectedManager(ownManagerId), [ownManagerId]);

  const ownView = selectedManager === ownManagerId;
  const monthPath = ownView
    ? `/api/me/workouts?month=${month}`
    : `/api/admin/managers/${encodeURIComponent(selectedManager)}/workouts?month=${month}`;
  const calendar = useQuery({
    enabled: route === "workouts" && Boolean(selectedManager),
    queryKey: ["workouts", selectedManager, month],
    queryFn: () => api<{ days: WorkoutDay[] }>(monthPath),
  });
  const history = useQuery({
    enabled: route === "workouts" && ownView && statsOpen,
    queryKey: ["workout-stats", selectedManager],
    queryFn: () => api<{ workouts: HistoryRow[] }>("/api/me/workouts/stats"),
  });
  const exercises = useQuery({
    enabled: route === "workouts" && isAdmin && manageOpen,
    queryKey: ["workout-exercises"],
    queryFn: () =>
      api<{ exercises: ExerciseRecord[] }>("/api/workouts/exercises"),
  });
  const managers = useQuery({
    enabled: route === "workouts" && isAdmin,
    queryKey: ["workout-managers"],
    queryFn: () =>
      api<{
        managers: Array<{ displayName: string; id: string; name: string }>;
      }>("/api/managers"),
  });

  useEffect(() => {
    if (!workout?.running || workout.remainingSeconds <= 0) return;
    const startedAt = Date.now();
    const startingRemaining = workout.remainingSeconds;
    const startingElapsed = workout.elapsedSeconds;
    const timer = window.setInterval(() => {
      const remaining = Math.max(
        0,
        startingRemaining - Math.floor((Date.now() - startedAt) / 1000),
      );
      setWorkout((current) =>
        current
          ? {
              ...current,
              elapsedSeconds: Math.min(
                current.timerDurationSeconds,
                startingElapsed + Math.floor((Date.now() - startedAt) / 1000),
              ),
              remainingSeconds: remaining,
              running: remaining > 0,
            }
          : current,
      );
    }, 250);
    return () => window.clearInterval(timer);
  }, [workout?.date, workout?.running, Boolean(workout?.remainingSeconds)]);

  const mutate = async (path: string, body?: unknown, method = "POST") => {
    setBusy(true);
    setError("");
    try {
      const result = await api<{ workout: Workout }>(path, {
        body: body === undefined ? undefined : JSON.stringify(body),
        method,
      });
      setWorkout(result.workout);
      return result.workout;
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The workout could not be saved.",
      );
      return null;
    } finally {
      setBusy(false);
    }
  };

  const openDay = async (date: string, completed: boolean) => {
    if (!completed && (date !== today || !ownView)) return;
    const path = completed
      ? ownView
        ? `/api/me/workouts/${date}`
        : `/api/admin/managers/${encodeURIComponent(selectedManager)}/workouts/${date}`
      : `/api/me/workouts/${date}/start`;
    if (completed) await mutate(path, undefined, "GET");
    else
      await mutate(path, {
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
  };

  const action = (body: unknown) =>
    workout ? mutate(`/api/me/workouts/${workout.date}/action`, body) : null;

  const complete = async () => {
    if (!workout) return;
    if (
      workout.remainingSeconds > 0 &&
      !window.confirm(
        "Time remains on the clock. Complete this workout anyway?",
      )
    )
      return;
    const saved = await mutate(`/api/me/workouts/${workout.date}/complete`);
    if (saved) {
      void queryClient.invalidateQueries({ queryKey: ["workouts"] });
      void queryClient.invalidateQueries({ queryKey: ["workout-stats"] });
    }
  };

  if (!session)
    return <p className="table-message">Sign in to use Daily Workouts.</p>;

  return (
    <div className={styles.page}>
      <a className="back-link" href="#manager-hub" data-page-link="manager-hub">
        Manager Hub
      </a>
      <div className="section-heading page-heading-with-action">
        <div>
          <h1>Daily Workouts</h1>
          <p className="body-copy">
            {workout
              ? prettyDate(workout.date)
              : "Choose today or revisit a completed workout."}
          </p>
        </div>
        <div className="heading-actions">
          {!workout || workout.completedAt ? (
            <IconButton
              className="icon-action-button"
              icon={<BarChart3 />}
              label={
                statsOpen
                  ? "Hide workout statistics"
                  : "Show workout statistics"
              }
              aria-pressed={statsOpen}
              onClick={() => setStatsOpen((value) => !value)}
            />
          ) : (
            <IconButton
              className="icon-action-button"
              icon={<CircleHelp />}
              label="Exercise videos"
              onClick={() => setHelpOpen(true)}
            />
          )}
          {isAdmin ? (
            <>
              <IconButton
                className="icon-action-button"
                icon={<Plus />}
                label="Add exercise"
                onClick={() => setExerciseEditor("new")}
              />
              <IconButton
                className="icon-action-button"
                icon={<Pencil />}
                label="Manage exercises"
                onClick={() => setManageOpen(true)}
              />
            </>
          ) : null}
        </div>
      </div>
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
      {workout ? (
        workout.completedAt ? (
          <WorkoutResults
            workout={workout}
            canCorrect={isAdmin}
            onBack={() => setWorkout(null)}
            onCorrect={() => setCorrectionOpen(true)}
          />
        ) : (
          <ActiveWorkout
            workout={workout}
            busy={busy}
            action={action}
            complete={complete}
          />
        )
      ) : (
        <>
          {isAdmin ? (
            <label className={styles.managerSelect}>
              <span>Manager</span>
              <select
                value={selectedManager}
                onChange={(event) => {
                  setSelectedManager(event.target.value);
                  setWorkout(null);
                }}
              >
                {(managers.data?.managers || []).map((manager) => (
                  <option key={manager.id} value={manager.id}>
                    {manager.displayName || manager.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {statsOpen && ownView ? (
            history.isError ? (
              <RetryMessage
                error={history.error}
                retry={() => void history.refetch()}
              />
            ) : (
              <WorkoutStats
                rows={history.data?.workouts || []}
                loading={history.isLoading}
                today={today}
              />
            )
          ) : null}
          {calendar.isError ? (
            <RetryMessage
              error={calendar.error}
              retry={() => void calendar.refetch()}
            />
          ) : (
            <WorkoutCalendar
              days={calendar.data?.days || []}
              loading={calendar.isLoading}
              month={month}
              ownView={ownView}
              setMonth={setMonth}
              today={today}
              openDay={openDay}
            />
          )}
        </>
      )}
      {helpOpen && workout ? (
        <HelpDialog
          exercises={workout.exercises}
          close={() => setHelpOpen(false)}
        />
      ) : null}
      {manageOpen ? (
        <ManageExercises
          close={() => setManageOpen(false)}
          edit={setExerciseEditor}
          exercises={exercises.data?.exercises || []}
          loading={exercises.isLoading}
        />
      ) : null}
      {exerciseEditor ? (
        <ExerciseEditor
          exercise={exerciseEditor}
          close={() => setExerciseEditor(null)}
          saved={() => {
            setExerciseEditor(null);
            void queryClient.invalidateQueries({
              queryKey: ["workout-exercises"],
            });
          }}
        />
      ) : null}
      {correctionOpen && workout ? (
        <CorrectionDialog
          managerId={selectedManager}
          workout={workout}
          close={() => setCorrectionOpen(false)}
          saved={(value) => {
            setWorkout(value);
            setCorrectionOpen(false);
            void queryClient.invalidateQueries({ queryKey: ["workouts"] });
          }}
        />
      ) : null}
    </div>
  );
}

function RetryMessage({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <div className={styles.error} role="alert">
      <p>{error.message}</p>
      <button className="action-button" onClick={retry} type="button">
        Try Again
      </button>
    </div>
  );
}

function WorkoutCalendar({
  days,
  loading,
  month,
  ownView,
  openDay,
  setMonth,
  today,
}: {
  days: WorkoutDay[];
  loading: boolean;
  month: string;
  ownView: boolean;
  openDay: (date: string, completed: boolean) => void;
  setMonth: (month: string) => void;
  today: string;
}) {
  const [year, monthNumber] = month.split("-").map(Number);
  const first = new Date(year, monthNumber - 1, 1);
  const total = new Date(year, monthNumber, 0).getDate();
  const completed = new Set(
    days.filter((day) => day.completed).map((day) => day.date),
  );
  const cells = Array.from({ length: first.getDay() + total }, (_, index) =>
    index < first.getDay() ? 0 : index - first.getDay() + 1,
  );
  const move = (delta: number) => {
    const date = new Date(year, monthNumber - 1 + delta, 1);
    setMonth(
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
    );
  };
  return (
    <section className={styles.calendarCard} aria-label="Workout calendar">
      <header className={styles.calendarHeader}>
        <IconButton
          icon={<ChevronLeft />}
          label="Previous month"
          onClick={() => move(-1)}
        />
        <h2>
          {first.toLocaleDateString(undefined, {
            month: "long",
            year: "numeric",
          })}
        </h2>
        <IconButton
          icon={<ChevronRight />}
          label="Next month"
          onClick={() => move(1)}
        />
      </header>
      {loading ? (
        <p className="table-message">Loading workouts…</p>
      ) : (
        <div className={styles.calendarGrid}>
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <span className={styles.weekday} key={day}>
              {day}
            </span>
          ))}
          {cells.map((day, index) => {
            if (!day) return <span key={`blank-${index}`} />;
            const date = `${month}-${String(day).padStart(2, "0")}`;
            const done = completed.has(date);
            const enabled = done || (ownView && date === today);
            return (
              <button
                className={`${styles.day}${date === today ? ` ${styles.today}` : ""}${done ? ` ${styles.done}` : ""}`}
                disabled={!enabled}
                key={date}
                onClick={() => void openDay(date, done)}
                type="button"
                aria-label={`${prettyDate(date)}${done ? ", completed" : date === today ? ", start workout" : ""}`}
              >
                <span>{day}</span>
                {done ? <Check aria-hidden="true" /> : null}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

function ActiveWorkout({
  action,
  busy,
  complete,
  workout,
}: {
  action: (body: unknown) => Promise<Workout | null> | null;
  busy: boolean;
  complete: () => void;
  workout: Workout;
}) {
  const [more, setMore] = useState(false);
  const [minutes, setMinutes] = useState(
    String(workout.timerDurationSeconds / 60),
  );
  const expired = workout.remainingSeconds === 0;
  const durationLocked = workout.elapsedSeconds > 0 || workout.running;
  return (
    <div className={styles.workout}>
      <section
        className={`${styles.timer}${expired ? ` ${styles.expired}` : ""}`}
        aria-live="polite"
      >
        <span>
          {expired
            ? "Time’s up"
            : workout.running
              ? "Time remaining"
              : workout.elapsedSeconds
                ? "Timer paused"
                : "Ready"}
        </span>
        <strong>{formatTime(workout.remainingSeconds)}</strong>
        <button
          className="action-button"
          disabled={busy || expired}
          onClick={() =>
            void action({
              action: workout.running ? "timer-pause" : "timer-start",
            })
          }
          type="button"
        >
          {workout.running ? "Pause" : "Start"}
        </button>
        <IconButton
          icon={<Settings2 />}
          label="More timer controls"
          aria-expanded={more}
          onClick={() => setMore((value) => !value)}
        />
      </section>
      {more ? (
        <section className={styles.moreControls}>
          <label>
            <span>Minutes</span>
            <input
              type="number"
              min="1"
              max="180"
              disabled={durationLocked || busy}
              value={minutes}
              onChange={(event) => setMinutes(event.target.value)}
            />
          </label>
          <button
            className="action-button"
            disabled={durationLocked || busy}
            onClick={() =>
              void action({
                action: "timer-duration",
                seconds: Number(minutes) * 60,
              })
            }
            type="button"
          >
            Save time
          </button>
          <button
            className="action-button"
            disabled={busy}
            onClick={() => void action({ action: "timer-reset" })}
            type="button"
          >
            <RotateCcw aria-hidden="true" /> Reset timer
          </button>
        </section>
      ) : null}
      <section className={styles.sets} aria-label="Completed sets">
        <IconButton
          icon={<Minus />}
          label="Remove one completed set"
          disabled={busy || workout.sets === 0}
          onClick={() => void action({ action: "adjust-sets", delta: -1 })}
        />
        <div>
          <span>Sets</span>
          <strong>{workout.sets}</strong>
        </div>
        <IconButton
          icon={<Plus />}
          label="Add one completed set"
          disabled={busy}
          onClick={() => void action({ action: "adjust-sets", delta: 1 })}
        />
      </section>
      <div className={styles.exerciseList}>
        {workout.exercises.map((exercise) => (
          <button
            aria-pressed={exercise.checked}
            className={`${styles.exerciseToggle}${exercise.checked ? ` ${styles.checked}` : ""}`}
            disabled={busy}
            key={exercise.id}
            onClick={() =>
              void action({
                action: "toggle",
                checked: !exercise.checked,
                position: exercise.position,
              })
            }
            type="button"
          >
            <span>
              <small>{exercise.position}</small>
              {exercise.name}
            </span>
            <span className={styles.switch} aria-hidden="true">
              <span />
            </span>
          </button>
        ))}
      </div>
      <button
        className={`action-button ${styles.complete}`}
        disabled={busy}
        onClick={() => void complete()}
        type="button"
      >
        Complete Workout
      </button>
    </div>
  );
}

function WorkoutResults({
  canCorrect,
  onBack,
  onCorrect,
  workout,
}: {
  canCorrect: boolean;
  onBack: () => void;
  onCorrect: () => void;
  workout: Workout;
}) {
  return (
    <section className={styles.results}>
      <Dumbbell aria-hidden="true" />
      <h2>Workout Complete</h2>
      <div className={styles.resultSummary}>
        <div>
          <span>Time</span>
          <strong>{formatTime(workout.elapsedSeconds)}</strong>
        </div>
        <div>
          <span>Full sets</span>
          <strong>{workout.sets}</strong>
        </div>
      </div>
      <ol>
        {workout.exercises.map((exercise) => (
          <li key={exercise.id}>
            <span>{exercise.name}</span>
            <strong>{exercise.completionCount ?? 0}</strong>
          </li>
        ))}
      </ol>
      <div className={styles.resultActions}>
        <button className="action-button" onClick={onBack} type="button">
          Back to Calendar
        </button>
        {canCorrect ? (
          <button className="action-button" onClick={onCorrect} type="button">
            Correct Result
          </button>
        ) : null}
      </div>
    </section>
  );
}

function WorkoutStats({
  loading,
  rows,
  today,
}: {
  loading: boolean;
  rows: HistoryRow[];
  today: string;
}) {
  const [metric, setMetric] = useState<"duration" | "sets" | "frequency">(
    "duration",
  );
  const recent = rows.slice(-30);
  const totalSets = rows.reduce((sum, row) => sum + row.sets, 0);
  const average = rows.length
    ? Math.round(
        rows.reduce((sum, row) => sum + row.elapsedSeconds, 0) / rows.length,
      )
    : 0;
  const streak = useMemo(() => {
    const dates = new Set(rows.map((row) => row.date));
    const cursor = new Date(`${today}T12:00:00`);
    if (!dates.has(today)) cursor.setDate(cursor.getDate() - 1);
    let count = 0;
    while (dates.has(localDate(cursor))) {
      count += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return count;
  }, [rows, today]);
  const chartRows =
    metric === "frequency"
      ? weeklyRows(rows)
      : recent.map((row) => ({
          label: row.date.slice(5),
          value: metric === "duration" ? row.elapsedSeconds / 60 : row.sets,
        }));
  const max = Math.max(1, ...chartRows.map((row) => row.value));
  if (loading) return <p className="table-message">Loading workout trends…</p>;
  return (
    <section className={styles.stats}>
      <div className={styles.statCards}>
        <div>
          <span>Workouts</span>
          <strong>{rows.length}</strong>
        </div>
        <div>
          <span>Average time</span>
          <strong>{formatTime(average)}</strong>
        </div>
        <div>
          <span>Total sets</span>
          <strong>{totalSets}</strong>
        </div>
        <div>
          <span>Current streak</span>
          <strong>{streak}</strong>
        </div>
      </div>
      <div
        className={styles.metricTabs}
        role="group"
        aria-label="Workout trend"
      >
        <button
          aria-pressed={metric === "duration"}
          onClick={() => setMetric("duration")}
          type="button"
        >
          Duration
        </button>
        <button
          aria-pressed={metric === "sets"}
          onClick={() => setMetric("sets")}
          type="button"
        >
          Sets
        </button>
        <button
          aria-pressed={metric === "frequency"}
          onClick={() => setMetric("frequency")}
          type="button"
        >
          Frequency
        </button>
      </div>
      {chartRows.length ? (
        <div
          className={styles.chart}
          role="img"
          aria-label={`${metric} workout trend`}
        >
          {chartRows.map((row) => (
            <div key={row.label} title={`${row.label}: ${row.value}`}>
              <span
                style={{ height: `${Math.max(5, (row.value / max) * 100)}%` }}
              />
              <small>{row.label}</small>
            </div>
          ))}
        </div>
      ) : (
        <p className="table-message">
          Complete a workout to begin tracking trends.
        </p>
      )}
    </section>
  );
}

function weeklyRows(rows: HistoryRow[]) {
  const weeks = new Map<string, number>();
  rows.forEach((row) => {
    const date = new Date(`${row.date}T12:00:00`);
    date.setDate(date.getDate() - date.getDay());
    const key = localDate(date).slice(5);
    weeks.set(key, (weeks.get(key) || 0) + 1);
  });
  return [...weeks].slice(-12).map(([label, value]) => ({ label, value }));
}

function Modal({
  children,
  close,
  title,
}: {
  children: React.ReactNode;
  close: () => void;
  title: string;
}) {
  return (
    <Dialog.Root open onOpenChange={(open) => !open && close()}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.modalBackdrop} />
        <Dialog.Content className={styles.modal}>
          <header>
            <Dialog.Title>{title}</Dialog.Title>
            <Dialog.Close asChild>
              <IconButton icon={<X />} label={`Close ${title}`} />
            </Dialog.Close>
          </header>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function HelpDialog({
  close,
  exercises,
}: {
  close: () => void;
  exercises: WorkoutExercise[];
}) {
  return (
    <Modal close={close} title="Today’s Exercises">
      <ol className={styles.helpList}>
        {exercises.map((exercise) => (
          <li key={exercise.id}>
            <span>{exercise.name}</span>
            {exercise.videoUrl ? (
              <a href={exercise.videoUrl} target="_blank" rel="noreferrer">
                Watch video
              </a>
            ) : (
              <small>No video provided</small>
            )}
          </li>
        ))}
      </ol>
    </Modal>
  );
}

function ManageExercises({
  close,
  edit,
  exercises,
  loading,
}: {
  close: () => void;
  edit: (exercise: ExerciseRecord) => void;
  exercises: ExerciseRecord[];
  loading: boolean;
}) {
  return (
    <Modal close={close} title="Manage Exercises">
      {loading ? (
        <p>Loading…</p>
      ) : (
        <div className={styles.manageList}>
          {exercises.map((exercise) => (
            <button
              key={exercise.id}
              onClick={() => edit(exercise)}
              type="button"
            >
              <span>
                <strong>{exercise.name}</strong>
                <small>{exercise.active ? "Active" : "Inactive"}</small>
              </span>
              <Pencil aria-hidden="true" />
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
}

function ExerciseEditor({
  close,
  exercise,
  saved,
}: {
  close: () => void;
  exercise: ExerciseRecord | "new";
  saved: () => void;
}) {
  const existing = exercise === "new" ? null : exercise;
  const [name, setName] = useState(existing?.name || "");
  const [videoUrl, setVideoUrl] = useState(existing?.videoUrl || "");
  const [active, setActive] = useState(existing?.active ?? true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(`/api/workouts/exercises${existing ? `/${existing.id}` : ""}`, {
        body: JSON.stringify({ active, name, videoUrl }),
        method: existing ? "PATCH" : "POST",
      });
      saved();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Exercise could not be saved.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal close={close} title={existing ? "Edit Exercise" : "Add Exercise"}>
      <form className={styles.form} onSubmit={(event) => void submit(event)}>
        <label>
          <span>Name</span>
          <input
            required
            maxLength={120}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label>
          <span>
            Video URL <small>optional</small>
          </span>
          <input
            type="url"
            placeholder="https://…"
            value={videoUrl}
            onChange={(event) => setVideoUrl(event.target.value)}
          />
        </label>
        <label className={styles.checkbox}>
          <input
            type="checkbox"
            checked={active}
            onChange={(event) => setActive(event.target.checked)}
          />
          <span>Active in daily selection</span>
        </label>
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
        <button className="action-button" disabled={busy} type="submit">
          Save Exercise
        </button>
      </form>
    </Modal>
  );
}

function CorrectionDialog({
  close,
  managerId,
  saved,
  workout,
}: {
  close: () => void;
  managerId: string;
  saved: (workout: Workout) => void;
  workout: Workout;
}) {
  const [minutes, setMinutes] = useState(
    String(Math.floor(workout.elapsedSeconds / 60)),
  );
  const [seconds, setSeconds] = useState(String(workout.elapsedSeconds % 60));
  const [sets, setSets] = useState(String(workout.sets));
  const [counts, setCounts] = useState(
    workout.exercises.map((exercise) => String(exercise.completionCount || 0)),
  );
  const [error, setError] = useState("");
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    try {
      const result = await api<{ workout: Workout }>(
        `/api/admin/managers/${encodeURIComponent(managerId)}/workouts/${workout.date}`,
        {
          body: JSON.stringify({
            completionCounts: counts.map(Number),
            elapsedSeconds: Number(minutes) * 60 + Number(seconds),
            sets: Number(sets),
          }),
          method: "PATCH",
        },
      );
      saved(result.workout);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Correction could not be saved.",
      );
    }
  };
  return (
    <Modal close={close} title="Correct Result">
      <form className={styles.form} onSubmit={(event) => void submit(event)}>
        <div className={styles.timeInputs}>
          <label>
            <span>Minutes</span>
            <input
              type="number"
              min="0"
              max="180"
              value={minutes}
              onChange={(event) => setMinutes(event.target.value)}
            />
          </label>
          <label>
            <span>Seconds</span>
            <input
              type="number"
              min="0"
              max="59"
              value={seconds}
              onChange={(event) => setSeconds(event.target.value)}
            />
          </label>
        </div>
        <label>
          <span>Full sets</span>
          <input
            type="number"
            min="0"
            value={sets}
            onChange={(event) => setSets(event.target.value)}
          />
        </label>
        {workout.exercises.map((exercise, index) => (
          <label key={exercise.id}>
            <span>{exercise.name}</span>
            <input
              type="number"
              min={sets || "0"}
              max={Number(sets || 0) + 1}
              value={counts[index]}
              onChange={(event) =>
                setCounts((values) =>
                  values.map((value, itemIndex) =>
                    itemIndex === index ? event.target.value : value,
                  ),
                )
              }
            />
          </label>
        ))}
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
        <button className="action-button" type="submit">
          Save Correction
        </button>
      </form>
    </Modal>
  );
}
