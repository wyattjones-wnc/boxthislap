import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Accessibility,
  BarChart3,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Dumbbell,
  HeartPulse,
  Minus,
  Pencil,
  Plus,
  RotateCcw,
  Settings2,
  Sunrise,
  Trash2,
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
  cardioCompleted: boolean;
  completed: boolean;
  date: string;
  kettlebellCompleted: boolean;
  kneeCompleted?: boolean;
  morningCompleted?: boolean;
}

interface CardioEntry {
  id: string;
  miles: number;
  type: "run" | "walk";
}

interface CardioWorkout {
  completedAt: string | null;
  date: string;
  entries: CardioEntry[];
  started: boolean;
  totalMiles: number;
}

interface MorningRoutineStep {
  completionMode: "tally" | "toggle" | null;
  durationSeconds: number | null;
  id: string;
  name: string;
  position: number;
  targetCount: number | null;
  type: "count" | "timer";
}

interface MorningWorkoutStep extends MorningRoutineStep {
  active: boolean;
  completedAt: string | null;
  completedCount: number;
  remainingSeconds: number | null;
  running: boolean;
}

interface MorningWorkout {
  completedAt: string | null;
  currentPosition: number;
  date: string;
  started: boolean;
  steps: MorningWorkoutStep[];
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

function formatMiles(miles: number) {
  return miles.toLocaleString(undefined, { maximumFractionDigits: 3 });
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
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [cardio, setCardio] = useState<CardioWorkout | null>(null);
  const [morning, setMorning] = useState<MorningWorkout | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [statsOpen, setStatsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [exerciseEditor, setExerciseEditor] = useState<
    ExerciseRecord | "new" | null
  >(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [routineEditor, setRoutineEditor] = useState<"default" | "mine" | null>(
    null,
  );

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

  const openDay = (date: string, completed: boolean) => {
    if (!completed && (date !== today || !ownView)) return;
    setSelectedDate(date);
    setWorkout(null);
    setCardio(null);
    setMorning(null);
  };

  const selectedDay = calendar.data?.days.find(
    (day) => day.date === selectedDate,
  );

  const openKettlebell = async () => {
    if (!selectedDate) return;
    const completed = Boolean(selectedDay?.kettlebellCompleted);
    const path = completed
      ? ownView
        ? `/api/me/workouts/${selectedDate}`
        : `/api/admin/managers/${encodeURIComponent(selectedManager)}/workouts/${selectedDate}`
      : `/api/me/workouts/${selectedDate}/start`;
    if (completed) await mutate(path, undefined, "GET");
    else
      await mutate(path, {
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
  };

  const changeCardio = async (
    path: string,
    body?: unknown,
    method = "POST",
  ) => {
    setBusy(true);
    setError("");
    try {
      const result = await api<{ cardio: CardioWorkout }>(path, {
        body: body === undefined ? undefined : JSON.stringify(body),
        method,
      });
      setCardio(result.cardio);
      return result.cardio;
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The cardio workout could not be saved.",
      );
      return null;
    } finally {
      setBusy(false);
    }
  };

  const openCardio = async () => {
    if (!selectedDate) return;
    const completed = Boolean(selectedDay?.cardioCompleted);
    const path = completed
      ? ownView
        ? `/api/me/workouts/${selectedDate}/cardio`
        : `/api/admin/managers/${encodeURIComponent(selectedManager)}/workouts/${selectedDate}/cardio`
      : `/api/me/workouts/${selectedDate}/cardio/start`;
    await changeCardio(
      path,
      completed
        ? undefined
        : { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
      completed ? "GET" : "POST",
    );
  };

  const completeCardio = async () => {
    if (!cardio) return;
    const saved = await changeCardio(
      `/api/me/workouts/${cardio.date}/cardio/complete`,
    );
    if (saved) void queryClient.invalidateQueries({ queryKey: ["workouts"] });
  };

  const changeMorning = async (
    path: string,
    body?: unknown,
    method = "POST",
  ) => {
    setBusy(true);
    setError("");
    try {
      const result = await api<{ morning: MorningWorkout }>(path, {
        body: body === undefined ? undefined : JSON.stringify(body),
        method,
      });
      setMorning(result.morning);
      if (result.morning.completedAt)
        void queryClient.invalidateQueries({ queryKey: ["workouts"] });
      return result.morning;
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Morning Stretch could not be saved.",
      );
      return null;
    } finally {
      setBusy(false);
    }
  };

  const openMorning = async () => {
    if (!selectedDate) return;
    const completed = Boolean(selectedDay?.morningCompleted);
    const path = completed
      ? ownView
        ? `/api/me/workouts/${selectedDate}/morning`
        : `/api/admin/managers/${encodeURIComponent(selectedManager)}/workouts/${selectedDate}/morning`
      : `/api/me/workouts/${selectedDate}/morning/start`;
    await changeMorning(
      path,
      completed
        ? undefined
        : { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
      completed ? "GET" : "POST",
    );
  };

  const morningAction = (action: string, stepId?: string) =>
    morning
      ? changeMorning(`/api/me/workouts/${morning.date}/morning/action`, {
          action,
          stepId,
        })
      : null;

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
      <header
        className={`${styles.pageHeader}${!selectedDate ? ` ${styles.calendarPageHeader}` : ""}`}
      >
        {workout || cardio || morning ? (
          <a
            className="back-link"
            href="#workouts"
            onClick={(event) => {
              event.preventDefault();
              setWorkout(null);
              setCardio(null);
              setMorning(null);
            }}
          >
            Workout Types
          </a>
        ) : selectedDate ? (
          <a
            className="back-link"
            href="#workouts"
            onClick={(event) => {
              event.preventDefault();
              setSelectedDate(null);
            }}
          >
            Calendar
          </a>
        ) : (
          <a
            className="back-link"
            href="#manager-hub"
            data-page-link="manager-hub"
          >
            Manager Hub
          </a>
        )}
        <h1>Daily Workouts</h1>
        {selectedDate ? (
          <time dateTime={selectedDate}>{prettyDate(selectedDate)}</time>
        ) : null}
      </header>
      {!selectedDate ? (
        <p className={styles.pageIntro}>
          Choose today or revisit a completed workout.
        </p>
      ) : null}
      {!selectedDate ? (
        <div className={styles.pageActions}>
          {isAdmin ? (
            <label className={styles.managerSelect}>
              <span>Manager</span>
              <select
                value={selectedManager}
                onChange={(event) => {
                  setSelectedManager(event.target.value);
                  setSelectedDate(null);
                  setWorkout(null);
                  setCardio(null);
                  setMorning(null);
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
          <div className={styles.pageActionButtons}>
            <IconButton
              className="icon-action-button"
              icon={<Sunrise />}
              label="Customize my Morning Stretch routine"
              onClick={() => setRoutineEditor("mine")}
            />
            {isAdmin ? (
              <IconButton
                className="icon-action-button"
                icon={<Settings2 />}
                label="Configure the default Morning Stretch routine"
                onClick={() => setRoutineEditor("default")}
              />
            ) : null}
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
      ) : null}
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
            onBack={() => {
              setWorkout(null);
              setSelectedDate(null);
            }}
            onCorrect={() => setCorrectionOpen(true)}
          />
        ) : (
          <ActiveWorkout
            workout={workout}
            busy={busy}
            action={action}
            complete={complete}
            openHelp={() => setHelpOpen(true)}
          />
        )
      ) : cardio ? (
        <CardioWorkoutView
          cardio={cardio}
          busy={busy}
          canEdit={ownView}
          edit={(entryId, entry) =>
            changeCardio(
              `/api/me/workouts/${cardio.date}/cardio/entries/${encodeURIComponent(entryId)}`,
              entry,
              "PATCH",
            )
          }
          add={(entry) =>
            changeCardio(
              `/api/me/workouts/${cardio.date}/cardio/entries`,
              entry,
            )
          }
          complete={completeCardio}
          remove={(entryId) =>
            changeCardio(
              `/api/me/workouts/${cardio.date}/cardio/entries/${encodeURIComponent(entryId)}`,
              undefined,
              "DELETE",
            )
          }
        />
      ) : morning ? (
        <MorningWorkoutView
          action={morningAction}
          busy={busy}
          morning={morning}
        />
      ) : selectedDate ? (
        <WorkoutTypeChooser
          cardioCompleted={Boolean(selectedDay?.cardioCompleted)}
          canStart={ownView && selectedDate === today}
          kettlebellCompleted={Boolean(selectedDay?.kettlebellCompleted)}
          morningCompleted={Boolean(selectedDay?.morningCompleted)}
          openCardio={() => void openCardio()}
          openKettlebell={() => void openKettlebell()}
          openMorning={() => void openMorning()}
        />
      ) : (
        <>
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
      {routineEditor ? (
        <MorningRoutineEditor
          close={() => setRoutineEditor(null)}
          mode={routineEditor}
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
  const daysByDate = new Map(days.map((day) => [day.date, day]));
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
            const workoutDay = daysByDate.get(date);
            const completedTypes = workoutDay
              ? [
                  workoutDay.morningCompleted ? "Morning Stretch" : "",
                  workoutDay.kettlebellCompleted ? "Kettlebell" : "",
                  workoutDay.cardioCompleted ? "Cardio" : "",
                  workoutDay.kneeCompleted ? "Knee" : "",
                ].filter(Boolean)
              : [];
            const done = completedTypes.length > 0;
            const enabled = done || (ownView && date === today);
            return (
              <button
                className={`${styles.day}${date === today ? ` ${styles.today}` : ""}${done ? ` ${styles.done}` : ""}`}
                disabled={!enabled}
                key={date}
                onClick={() => void openDay(date, done)}
                type="button"
                aria-label={`${prettyDate(date)}${completedTypes.length ? `, completed: ${completedTypes.join(", ")}` : date === today ? ", start workout" : ""}`}
              >
                <span>{day}</span>
                {enabled ? (
                  <CompletionMark
                    day={
                      workoutDay || {
                        cardioCompleted: false,
                        completed: false,
                        date,
                        kettlebellCompleted: false,
                      }
                    }
                  />
                ) : null}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

function CompletionMark({ day }: { day: WorkoutDay }) {
  const segments = [
    [styles.morningSegment, Boolean(day.morningCompleted)],
    [styles.kettlebellSegment, day.kettlebellCompleted],
    [styles.cardioSegment, day.cardioCompleted],
    [styles.kneeSegment, Boolean(day.kneeCompleted)],
  ] as const;
  return (
    <span className={styles.completionMark} aria-hidden="true">
      {segments.map(([segmentClass, completed]) => (
        <span
          className={`${styles.completionSegment} ${segmentClass}${completed ? ` ${styles.segmentCompleted}` : ""}`}
          key={segmentClass}
        >
          {completed ? <Check strokeWidth={3} /> : null}
        </span>
      ))}
    </span>
  );
}

function WorkoutTypeChooser({
  cardioCompleted,
  canStart,
  kettlebellCompleted,
  morningCompleted,
  openCardio,
  openKettlebell,
  openMorning,
}: {
  cardioCompleted: boolean;
  canStart: boolean;
  kettlebellCompleted: boolean;
  morningCompleted: boolean;
  openCardio: () => void;
  openKettlebell: () => void;
  openMorning: () => void;
}) {
  return (
    <section className={styles.typeChooser} aria-label="Choose workout type">
      <button
        className={styles.morningType}
        disabled={!canStart && !morningCompleted}
        onClick={openMorning}
        type="button"
      >
        <Sunrise aria-hidden="true" />
        <span>
          <strong>Morning Stretch</strong>
          <small>
            {morningCompleted
              ? "Completed — view routine"
              : canStart
                ? "Follow your progressive routine"
                : "Not completed"}
          </small>
        </span>
        {morningCompleted ? <Check aria-hidden="true" /> : <ChevronRight />}
      </button>
      <button
        className={styles.kettlebellType}
        disabled={!canStart && !kettlebellCompleted}
        onClick={openKettlebell}
        type="button"
      >
        <Dumbbell aria-hidden="true" />
        <span>
          <strong>Kettlebell</strong>
          <small>
            {kettlebellCompleted
              ? "Completed — view results"
              : canStart
                ? "Six exercises and timer"
                : "Not completed"}
          </small>
        </span>
        {kettlebellCompleted ? <Check aria-hidden="true" /> : <ChevronRight />}
      </button>
      <button
        className={styles.cardioType}
        disabled={!canStart && !cardioCompleted}
        onClick={openCardio}
        type="button"
      >
        <HeartPulse aria-hidden="true" />
        <span>
          <strong>Cardio</strong>
          <small>
            {cardioCompleted
              ? "Completed — view entries"
              : canStart
                ? "Track walks and runs"
                : "Not completed"}
          </small>
        </span>
        {cardioCompleted ? <Check aria-hidden="true" /> : <ChevronRight />}
      </button>
      <button className={styles.kneeType} disabled type="button">
        <Accessibility aria-hidden="true" />
        <span>
          <strong>Knee</strong>
          <small>Routine setup coming next</small>
        </span>
        <ChevronRight aria-hidden="true" />
      </button>
    </section>
  );
}

function CardioWorkoutView({
  add,
  busy,
  cardio,
  canEdit,
  complete,
  edit,
  remove,
}: {
  add: (entry: {
    miles: number;
    type: "run" | "walk";
  }) => Promise<CardioWorkout | null>;
  busy: boolean;
  cardio: CardioWorkout;
  canEdit: boolean;
  complete: () => void;
  edit: (
    entryId: string,
    entry: { miles: number; type: "run" | "walk" },
  ) => Promise<CardioWorkout | null>;
  remove: (entryId: string) => Promise<CardioWorkout | null>;
}) {
  const [type, setType] = useState<"run" | "walk">("walk");
  const [miles, setMiles] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const completed = Boolean(cardio.completedAt);
  const cancelEdit = () => {
    setEditingId(null);
    setMiles("");
    setType("walk");
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const entry = { miles: Number(miles), type };
    const saved = editingId ? await edit(editingId, entry) : await add(entry);
    if (saved) cancelEdit();
  };
  return (
    <section className={styles.cardioWorkout}>
      <div className={styles.mileageTotal} aria-live="polite">
        <span>{completed ? "Cardio complete" : "Total mileage"}</span>
        <strong>{formatMiles(cardio.totalMiles)}</strong>
        <small>miles</small>
      </div>
      {canEdit && (!completed || editingId) ? (
        <form className={styles.cardioEntryForm} onSubmit={submit}>
          <label>
            <span>Type</span>
            <select
              disabled={busy}
              value={type}
              onChange={(event) =>
                setType(event.target.value as "run" | "walk")
              }
            >
              <option value="walk">Walk</option>
              <option value="run">Run</option>
            </select>
          </label>
          <label>
            <span>Miles</span>
            <input
              required
              disabled={busy}
              inputMode="decimal"
              min="0.001"
              max="1000"
              step="0.001"
              type="number"
              value={miles}
              onChange={(event) => setMiles(event.target.value)}
            />
          </label>
          <button className="action-button" disabled={busy} type="submit">
            {editingId ? (
              "Save changes"
            ) : (
              <>
                <Plus aria-hidden="true" /> Add
              </>
            )}
          </button>
          {editingId ? (
            <button
              className="action-button"
              disabled={busy}
              type="button"
              onClick={cancelEdit}
            >
              Cancel
            </button>
          ) : null}
        </form>
      ) : null}
      <div className={styles.cardioEntries}>
        {cardio.entries.length ? (
          cardio.entries.map((entry) => (
            <div key={entry.id}>
              <span>
                <strong>{entry.type === "walk" ? "Walk" : "Run"}</strong>
                <small>{formatMiles(entry.miles)} mi</small>
              </span>
              <div className={styles.cardioEntryActions}>
                {canEdit ? (
                  <IconButton
                    disabled={busy}
                    icon={<Pencil />}
                    label={`Edit ${entry.type} of ${formatMiles(entry.miles)} miles`}
                    onClick={() => {
                      setEditingId(entry.id);
                      setType(entry.type);
                      setMiles(String(entry.miles));
                    }}
                  />
                ) : null}
                {canEdit && !completed ? (
                  <IconButton
                    disabled={busy}
                    icon={<Trash2 />}
                    label={`Remove ${entry.type} of ${formatMiles(entry.miles)} miles`}
                    onClick={async () => {
                      const saved = await remove(entry.id);
                      if (saved && editingId === entry.id) cancelEdit();
                    }}
                  />
                ) : (
                  <span className={styles.cardioEntryStatus}>
                    <Check aria-hidden="true" />
                  </span>
                )}
              </div>
            </div>
          ))
        ) : (
          <p className="table-message">Add a walk or run to begin.</p>
        )}
      </div>
      {!completed ? (
        <button
          className={`action-button ${styles.complete}`}
          disabled={busy || editingId !== null || cardio.entries.length === 0}
          onClick={complete}
          type="button"
        >
          Complete Cardio
        </button>
      ) : null}
    </section>
  );
}

function MorningWorkoutView({
  action,
  busy,
  morning,
}: {
  action: (
    action: string,
    stepId?: string,
  ) => Promise<MorningWorkout | null> | null;
  busy: boolean;
  morning: MorningWorkout;
}) {
  const current = morning.steps.find((step) => step.active);
  const [remaining, setRemaining] = useState(current?.remainingSeconds || 0);

  useEffect(() => {
    setRemaining(current?.remainingSeconds || 0);
  }, [current?.id, current?.remainingSeconds]);

  useEffect(() => {
    if (!current?.running) return;
    const deadline = Date.now() + (current.remainingSeconds || 0) * 1000;
    const timer = window.setInterval(() => {
      setRemaining(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    }, 250);
    return () => window.clearInterval(timer);
  }, [current?.id, current?.running, current?.remainingSeconds]);

  useEffect(() => {
    if (current?.running && remaining === 0 && !busy)
      void action("timer-finish", current.id);
  }, [action, busy, current?.id, current?.running, remaining]);

  return (
    <section className={styles.morningWorkout}>
      {morning.completedAt ? (
        <div className={styles.morningComplete}>
          <Sunrise aria-hidden="true" />
          <div>
            <strong>Morning Stretch complete</strong>
            <span>{morning.steps.length} steps finished</span>
          </div>
        </div>
      ) : null}
      <ol className={styles.morningSteps}>
        {morning.steps.map((step) => {
          const completed = Boolean(step.completedAt);
          return (
            <li
              className={
                completed
                  ? styles.morningStepDone
                  : step.active
                    ? styles.morningStepActive
                    : styles.morningStepUpcoming
              }
              key={step.id}
            >
              <div className={styles.morningStepHeading}>
                <span>{step.position}</span>
                <strong>{step.name}</strong>
                {completed ? <Check aria-label="Completed" /> : null}
              </div>
              {completed ? (
                <small>
                  {step.type === "timer"
                    ? formatTime(step.durationSeconds || 0)
                    : `${step.targetCount} repetitions`}
                </small>
              ) : step.active ? (
                <div className={styles.morningStepControl}>
                  {step.type === "timer" ? (
                    <>
                      <strong className={styles.morningTimer}>
                        {formatTime(remaining)}
                      </strong>
                      <button
                        className="action-button"
                        disabled={busy || step.running}
                        onClick={() => void action("timer-start", step.id)}
                        type="button"
                      >
                        {step.running ? "Running" : "Start timer"}
                      </button>
                    </>
                  ) : step.completionMode === "tally" ? (
                    <>
                      <strong className={styles.morningTally}>
                        {step.completedCount} / {step.targetCount}
                      </strong>
                      <button
                        className="action-button"
                        disabled={busy}
                        onClick={() => void action("increment", step.id)}
                        type="button"
                      >
                        <Plus aria-hidden="true" /> Add one
                      </button>
                    </>
                  ) : (
                    <>
                      <span>{step.targetCount} repetitions</span>
                      <button
                        className="action-button"
                        disabled={busy}
                        onClick={() => void action("complete-step", step.id)}
                        type="button"
                      >
                        <Check aria-hidden="true" /> Complete
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <small>
                  {step.type === "timer"
                    ? formatTime(step.durationSeconds || 0)
                    : `${step.targetCount} repetitions`}
                </small>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function ActiveWorkout({
  action,
  busy,
  complete,
  openHelp,
  workout,
}: {
  action: (body: unknown) => Promise<Workout | null> | null;
  busy: boolean;
  complete: () => void;
  openHelp: () => void;
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
        <div className={styles.timerReadout}>
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
        </div>
        <div className={styles.timerActions}>
          <IconButton
            icon={<CircleHelp />}
            label="Exercise videos"
            onClick={openHelp}
          />
          <IconButton
            icon={<Settings2 />}
            label="More timer controls"
            aria-expanded={more}
            onClick={() => setMore((value) => !value)}
          />
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
        </div>
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
          {!durationLocked ? (
            <button
              className="action-button"
              disabled={busy}
              onClick={() =>
                void action({
                  action: "timer-duration",
                  seconds: Number(minutes) * 60,
                })
              }
              type="button"
            >
              Update
            </button>
          ) : null}
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

function MorningRoutineEditor({
  close,
  mode,
}: {
  close: () => void;
  mode: "default" | "mine";
}) {
  const [steps, setSteps] = useState<MorningRoutineStep[]>([]);
  const [hasOverride, setHasOverride] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const path =
    mode === "default"
      ? "/api/admin/morning-routine/default"
      : "/api/me/morning-routine";

  useEffect(() => {
    let active = true;
    void api<{
      hasOverride: boolean;
      routine: { steps: MorningRoutineStep[] };
    }>(path)
      .then((value) => {
        if (!active) return;
        setHasOverride(value.hasOverride);
        setSteps(value.routine.steps);
      })
      .catch((cause) => {
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : "The routine could not load.",
          );
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [path]);

  const updateStep = (index: number, values: Partial<MorningRoutineStep>) =>
    setSteps((current) =>
      current.map((step, stepIndex) =>
        stepIndex === index ? { ...step, ...values } : step,
      ),
    );
  const addStep = (type: "count" | "timer") =>
    setSteps((current) => [
      ...current,
      {
        completionMode: type === "count" ? "toggle" : null,
        durationSeconds: type === "timer" ? 30 : null,
        id: crypto.randomUUID(),
        name: "",
        position: current.length + 1,
        targetCount: type === "count" ? 10 : null,
        type,
      },
    ]);
  const moveStep = (index: number, delta: number) =>
    setSteps((current) => {
      const destination = index + delta;
      if (destination < 0 || destination >= current.length) return current;
      const next = [...current];
      [next[index], next[destination]] = [next[destination], next[index]];
      return next.map((step, stepIndex) => ({
        ...step,
        position: stepIndex + 1,
      }));
    });
  const removeStep = (index: number) =>
    setSteps((current) =>
      current
        .filter((_, stepIndex) => stepIndex !== index)
        .map((step, stepIndex) => ({ ...step, position: stepIndex + 1 })),
    );
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api(path, {
        body: JSON.stringify({ steps }),
        method: "PUT",
      });
      close();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The routine could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  };
  const useDefault = async () => {
    setSaving(true);
    setError("");
    try {
      await api(path, { method: "DELETE" });
      close();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The default routine could not be restored.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      close={close}
      title={
        mode === "default" ? "Default Morning Stretch" : "My Morning Stretch"
      }
    >
      {loading ? (
        <p className="table-message">Loading routine…</p>
      ) : (
        <form className={styles.routineEditor} onSubmit={save}>
          {mode === "mine" ? (
            <p className={styles.routineSource}>
              {hasOverride
                ? "You are using your own routine."
                : "You are using the default routine. Saving creates your own copy."}
            </p>
          ) : null}
          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}
          <ol className={styles.routineStepEditor}>
            {steps.map((step, index) => (
              <li key={step.id}>
                <header>
                  <strong>Step {index + 1}</strong>
                  <div>
                    <button
                      disabled={index === 0 || saving}
                      onClick={() => moveStep(index, -1)}
                      type="button"
                    >
                      Move up
                    </button>
                    <button
                      disabled={index === steps.length - 1 || saving}
                      onClick={() => moveStep(index, 1)}
                      type="button"
                    >
                      Move down
                    </button>
                    <button
                      disabled={saving}
                      onClick={() => removeStep(index)}
                      type="button"
                    >
                      Remove
                    </button>
                  </div>
                </header>
                <label>
                  <span>Name</span>
                  <input
                    maxLength={100}
                    required
                    value={step.name}
                    onChange={(event) =>
                      updateStep(index, { name: event.target.value })
                    }
                  />
                </label>
                <label>
                  <span>Type</span>
                  <select
                    value={step.type}
                    onChange={(event) => {
                      const type = event.target.value as "count" | "timer";
                      updateStep(index, {
                        completionMode: type === "count" ? "toggle" : null,
                        durationSeconds: type === "timer" ? 30 : null,
                        targetCount: type === "count" ? 10 : null,
                        type,
                      });
                    }}
                  >
                    <option value="timer">Timer</option>
                    <option value="count">Count</option>
                  </select>
                </label>
                {step.type === "timer" ? (
                  <label>
                    <span>Seconds</span>
                    <input
                      max={3600}
                      min={5}
                      required
                      type="number"
                      value={step.durationSeconds || ""}
                      onChange={(event) =>
                        updateStep(index, {
                          durationSeconds: Number(event.target.value),
                        })
                      }
                    />
                  </label>
                ) : (
                  <>
                    <label>
                      <span>Repetitions</span>
                      <input
                        max={1000}
                        min={1}
                        required
                        type="number"
                        value={step.targetCount || ""}
                        onChange={(event) =>
                          updateStep(index, {
                            targetCount: Number(event.target.value),
                          })
                        }
                      />
                    </label>
                    <label>
                      <span>Completion</span>
                      <select
                        value={step.completionMode || "toggle"}
                        onChange={(event) =>
                          updateStep(index, {
                            completionMode: event.target.value as
                              "tally" | "toggle",
                          })
                        }
                      >
                        <option value="toggle">One completion toggle</option>
                        <option value="tally">Tally each repetition</option>
                      </select>
                    </label>
                  </>
                )}
              </li>
            ))}
          </ol>
          <div className={styles.routineAddActions}>
            <button
              className="action-button"
              disabled={saving || steps.length >= 30}
              onClick={() => addStep("timer")}
              type="button"
            >
              <Plus aria-hidden="true" /> Add timer
            </button>
            <button
              className="action-button"
              disabled={saving || steps.length >= 30}
              onClick={() => addStep("count")}
              type="button"
            >
              <Plus aria-hidden="true" /> Add count
            </button>
          </div>
          <div className={styles.routineSaveActions}>
            {mode === "mine" && hasOverride ? (
              <button
                className="action-button"
                disabled={saving}
                onClick={() => void useDefault()}
                type="button"
              >
                Use default routine
              </button>
            ) : null}
            <button
              className="action-button"
              disabled={saving || steps.length === 0}
              type="submit"
            >
              Save routine
            </button>
          </div>
        </form>
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
