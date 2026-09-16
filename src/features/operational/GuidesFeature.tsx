import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  Check,
  ChevronRight,
  ExternalLink,
  Filter,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { IconButton } from "../../components/IconButton/IconButton";
import { useAppState } from "../../app/providers";

const GUIDES_ENDPOINT = "https://box-this-lap-guides.boxthislap.workers.dev";
const PAGE_SIZE = 60;

interface Guide {
  id: string;
  isAdmin: boolean;
  name: string;
  rankingId: string;
  todoId: string;
}

interface GuideStep {
  divider: string;
  guideId: string;
  id: string;
  parentId: string;
  section: string;
  step: string;
  stepId: string;
  type: string;
  url: string;
}

interface GuideData {
  guides: Guide[];
  steps: GuideStep[];
}

function normalizeGuide(row: Record<string, unknown>): Guide {
  return {
    id: String(row.ID || row.Id || row.id || "").trim(),
    isAdmin: row.isAdmin === true,
    name: String(row.Name || row.name || "").trim(),
    rankingId: String(row["VG Ranking ID"] || row.rankingId || "").trim(),
    todoId: String(row["To Do ID"] || row.todoId || "").trim(),
  };
}

function normalizeStep(row: Record<string, unknown>): GuideStep {
  return {
    divider: String(row.Divider || row.divider || "").trim(),
    guideId: String(row["Guide ID"] || row.guideId || "").trim(),
    id: String(row.ID || row.Id || row.id || "").trim(),
    parentId: String(row["Parent ID"] || row.parentId || "").trim(),
    section: String(row.Section || row.section || "").trim(),
    step: String(row.Step || row.step || "").trim(),
    stepId: String(row["Step ID"] || row.stepId || "").trim(),
    type: String(row.Type || row.type || "").trim(),
    url: String(row.URL || row.Url || row.url || "").trim(),
  };
}

async function loadGuides(): Promise<GuideData> {
  const response = await fetch(
    `data/guides.json?v=${encodeURIComponent(window.BOX_THIS_LAP_VERSION || "dev")}`,
    { cache: "force-cache" },
  );
  if (!response.ok)
    throw new Error(`Unable to load guides (${response.status}).`);
  const value = (await response.json()) as {
    guides?: Array<Record<string, unknown>>;
    steps?: Array<Record<string, unknown>>;
  };
  const guides = (value.guides || [])
    .map(normalizeGuide)
    .filter((guide) => guide.id && guide.name);
  const seen = new Set<string>();
  const steps = (value.steps || []).map(normalizeStep).filter((step) => {
    const key = `${step.guideId}::${step.stepId}`;
    if (!step.id || !step.guideId || !step.stepId || seen.has(key))
      return false;
    seen.add(key);
    return true;
  });
  return { guides, steps };
}

async function loadProgress(managerId: string): Promise<Set<string>> {
  const response = await fetch(
    `${GUIDES_ENDPOINT}/api/managers/${encodeURIComponent(managerId)}/progress`,
    { cache: "no-store", headers: { Accept: "application/json" } },
  );
  const value = (await response.json().catch(() => ({}))) as {
    error?: string;
    ok?: boolean;
    progress?: Array<{ guideId?: string; stepId?: string }>;
  };
  if (!response.ok || !value.ok || !Array.isArray(value.progress)) {
    throw new Error(
      value.error || `Unable to load guide progress (${response.status}).`,
    );
  }
  return new Set(value.progress.map((row) => `${row.guideId}::${row.stepId}`));
}

async function saveProgress(managerId: string, item: GuideStep, done: boolean) {
  const response = await fetch(
    `${GUIDES_ENDPOINT}/api/managers/${encodeURIComponent(managerId)}/guides/${encodeURIComponent(item.guideId)}/steps/${encodeURIComponent(item.stepId)}`,
    {
      headers: { Accept: "application/json" },
      method: done ? "PUT" : "DELETE",
    },
  );
  const value = (await response.json().catch(() => ({}))) as {
    completed?: boolean;
    error?: string;
    ok?: boolean;
  };
  if (!response.ok || !value.ok || Boolean(value.completed) !== done) {
    throw new Error(
      value.error || `Unable to save guide progress (${response.status}).`,
    );
  }
}

function readGuideId() {
  return new URL(window.location.href).searchParams.get("guide") || "";
}

export function GuidesFeature() {
  const { session } = useAppState();
  const managerId = String(session?.managerId || "");
  const isAdmin = Boolean(session?.isAdmin || session?.manager?.isAdmin);
  const [guideId, setGuideId] = useState(readGuideId);
  const guides = useQuery({ queryKey: ["guides"], queryFn: loadGuides });
  const progress = useQuery({
    enabled: Boolean(managerId && guideId),
    queryKey: ["guide-progress", managerId],
    queryFn: () => loadProgress(managerId),
  });

  useEffect(() => {
    const sync = () => setGuideId(readGuideId());
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  const navigate = (nextGuideId: string) => {
    const url = new URL(window.location.href);
    if (nextGuideId) url.searchParams.set("guide", nextGuideId);
    else url.searchParams.delete("guide");
    url.hash = "guides";
    window.history.pushState({}, "", url);
    setGuideId(nextGuideId);
    window.scrollTo({ left: 0, top: 0 });
  };

  if (guides.isLoading) return <GuidesLoading detail={Boolean(guideId)} />;
  if (guides.isError)
    return (
      <GuidesError error={guides.error} retry={() => void guides.refetch()} />
    );

  const visibleGuides = (guides.data?.guides || []).filter(
    (guide) => isAdmin || !guide.isAdmin,
  );
  if (!guideId)
    return <GuideIndex guides={visibleGuides} navigate={navigate} />;
  const guide = visibleGuides.find((entry) => entry.id === guideId);
  if (!guide) return <GuideNotFound navigate={navigate} />;
  if (!managerId)
    return (
      <GuidesError
        error={new Error("Sign in to load your guide progress.")}
        retry={() => undefined}
      />
    );
  if (progress.isLoading) return <GuidesLoading detail title={guide.name} />;
  if (progress.isError)
    return (
      <GuidesError
        error={progress.error}
        retry={() => void progress.refetch()}
      />
    );

  return (
    <GuideDetail
      guide={guide}
      managerId={managerId}
      navigate={navigate}
      progress={progress.data || new Set()}
      steps={(guides.data?.steps || []).filter(
        (step) => step.guideId === guide.id,
      )}
    />
  );
}

function GuideIndex({
  guides,
  navigate,
}: {
  guides: Guide[];
  navigate: (id: string) => void;
}) {
  return (
    <>
      <div className="section-heading page-heading-with-action footy-heading">
        <div>
          <p className="guides-eyebrow">Walkthroughs</p>
          <h1>Guides</h1>
          <p className="guides-intro">
            Pick a guide and keep your place as you work through it.
          </p>
        </div>
      </div>
      <div className="guides-grid">
        {guides.length ? (
          guides.map((guide) => (
            <a
              className="guide-card"
              href={`?guide=${encodeURIComponent(guide.id)}#guides`}
              data-guide-open={guide.id}
              onClick={(event) => {
                event.preventDefault();
                navigate(guide.id);
              }}
              key={guide.id}
            >
              <strong>{guide.name}</strong>
              <span className="guide-card-arrow" aria-hidden="true">
                <ChevronRight />
              </span>
            </a>
          ))
        ) : (
          <p className="table-message">No guides are available yet.</p>
        )}
      </div>
    </>
  );
}

function GuideDetail({
  guide,
  managerId,
  navigate,
  progress,
  steps,
}: {
  guide: Guide;
  managerId: string;
  navigate: (id: string) => void;
  progress: Set<string>;
  steps: GuideStep[];
}) {
  const queryClient = useQueryClient();
  const [showFilters, setShowFilters] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [hideDone, setHideDone] = useState(true);
  const [divider, setDivider] = useState("");
  const [section, setSection] = useState("");
  const [type, setType] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Map<string, string>>(new Map());

  const childrenByParent = useMemo(() => {
    const map = new Map<string, GuideStep[]>();
    steps.forEach((step) => {
      if (!step.parentId) return;
      map.set(step.parentId, [...(map.get(step.parentId) || []), step]);
    });
    return map;
  }, [steps]);
  const childIds = new Set(
    [...childrenByParent.values()].flat().map((step) => step.id),
  );
  const matches = (step: GuideStep) =>
    (!divider || step.divider === divider) &&
    (!section || step.section === section) &&
    (!type || step.type === type);
  const isDone = (step: GuideStep) =>
    progress.has(`${step.guideId}::${step.stepId}`);
  const roots = steps.filter((step) => !childIds.has(step.id));
  const visible = roots.filter((step) => {
    const children = childrenByParent.get(step.id) || [];
    if (!matches(step) && !children.some(matches)) return false;
    if (!hideDone) return true;
    return !isDone(step) || children.some((child) => !isDone(child));
  });
  const completed = steps.filter(isDone).length;
  const remaining = steps.length - completed;
  const percent = steps.length
    ? Math.round((completed / steps.length) * 100)
    : 0;
  const options = (key: "divider" | "section" | "type") =>
    [...new Set(steps.map((step) => step[key]).filter(Boolean))].sort();

  const toggleOne = async (item: GuideStep, done: boolean) => {
    const key = `${item.guideId}::${item.stepId}`;
    const queryKey = ["guide-progress", managerId] as const;
    const current = queryClient.getQueryData<Set<string>>(queryKey) || progress;
    const previous = new Set(current);
    const optimistic = new Set(current);
    if (done) optimistic.add(key);
    else optimistic.delete(key);
    queryClient.setQueryData(queryKey, optimistic);
    setPending((value) => new Set(value).add(key));
    setErrors((value) => {
      const next = new Map(value);
      next.delete(key);
      return next;
    });
    try {
      await saveProgress(managerId, item, done);
    } catch (error) {
      queryClient.setQueryData(queryKey, previous);
      setErrors((value) =>
        new Map(value).set(
          key,
          error instanceof Error ? error.message : "Not saved.",
        ),
      );
    } finally {
      setPending((value) => {
        const next = new Set(value);
        next.delete(key);
        return next;
      });
    }
  };

  const toggleGroup = async (item: GuideStep, done: boolean) => {
    const group = [item, ...(childrenByParent.get(item.id) || [])];
    for (const entry of group) await toggleOne(entry, done);
  };

  return (
    <>
      <a
        className="guides-back-link"
        href="#guides"
        data-guides-back
        onClick={(event) => {
          event.preventDefault();
          navigate("");
        }}
      >
        ← All Guides
      </a>
      <div className="section-heading page-heading-with-action footy-heading guides-detail-heading">
        <div>
          <p className="guides-eyebrow">Guide</p>
          <h1>{guide.name}</h1>
          <GuideReferences guide={guide} />
        </div>
        <div className="heading-actions">
          <IconButton
            className={`icon-action-button guides-stats-toggle${showStats ? " is-active" : ""}`}
            icon={<BarChart3 />}
            label={`${showStats ? "Hide" : "Show"} guide progress`}
            aria-pressed={showStats}
            onClick={() => setShowStats((value) => !value)}
          />
          <IconButton
            className={`icon-action-button ranking-filter-toggle${showFilters ? " is-active" : ""}`}
            icon={<Filter />}
            label={`${showFilters ? "Hide" : "Show"} guide filters`}
            aria-expanded={showFilters}
            aria-controls="guides-filters"
            onClick={() => setShowFilters((value) => !value)}
          />
        </div>
      </div>
      {showStats ? (
        <GuideStats
          total={steps.length}
          completed={completed}
          remaining={remaining}
          percent={percent}
        />
      ) : null}
      <div
        className="ranking-filters guides-filters"
        id="guides-filters"
        hidden={!showFilters}
      >
        <label className="toggle-row">
          <span>Hide Done</span>
          <input
            type="checkbox"
            checked={hideDone}
            onChange={(event) => {
              setHideDone(event.target.checked);
              setLimit(PAGE_SIZE);
            }}
          />
        </label>
        <GuideFilter
          label="Divider"
          value={divider}
          values={options("divider")}
          setValue={setDivider}
        />
        <GuideFilter
          label="Section"
          value={section}
          values={options("section")}
          setValue={setSection}
        />
        <GuideFilter
          label="Type"
          value={type}
          values={options("type")}
          setValue={setType}
        />
      </div>
      <div className="guides-checklist-summary">
        <span>
          {visible.length} {visible.length === 1 ? "match" : "matches"}
        </span>
        <span>{remaining} remaining</span>
      </div>
      <div className="guides-checklist" id="guides-checklist">
        {visible.length ? (
          visible.slice(0, limit).map((item) => {
            const children = (childrenByParent.get(item.id) || []).filter(
              (child) => matches(child) && (!hideDone || !isDone(child)),
            );
            const isExpanded = expanded.has(item.id);
            return (
              <section
                className={`guide-step-group${isExpanded ? " is-expanded" : ""}`}
                data-guide-parent-group={item.id}
                key={item.id}
              >
                <GuideStepRow
                  childrenCount={(childrenByParent.get(item.id) || []).length}
                  completedChildren={
                    (childrenByParent.get(item.id) || []).filter(isDone).length
                  }
                  done={isDone(item)}
                  error={errors.get(`${item.guideId}::${item.stepId}`) || ""}
                  expanded={isExpanded}
                  item={item}
                  pending={pending.has(`${item.guideId}::${item.stepId}`)}
                  toggle={(done) => void toggleGroup(item, done)}
                  toggleExpanded={() =>
                    setExpanded((value) => {
                      const next = new Set(value);
                      if (next.has(item.id)) next.delete(item.id);
                      else next.add(item.id);
                      return next;
                    })
                  }
                />
                {isExpanded ? (
                  <div className="guide-step-children">
                    {children.length ? (
                      children.map((child) => (
                        <GuideStepRow
                          child
                          done={isDone(child)}
                          error={
                            errors.get(`${child.guideId}::${child.stepId}`) ||
                            ""
                          }
                          item={child}
                          pending={pending.has(
                            `${child.guideId}::${child.stepId}`,
                          )}
                          toggle={(done) => void toggleOne(child, done)}
                          key={child.id}
                        />
                      ))
                    ) : (
                      <p className="guide-step-children-empty">
                        No child steps match the current filters.
                      </p>
                    )}
                  </div>
                ) : null}
              </section>
            );
          })
        ) : (
          <div className="guides-empty-state">
            <Check aria-hidden="true" />
            <p>
              {steps.length === 0
                ? "No checklist steps have been added for this guide yet."
                : remaining === 0 && hideDone
                  ? "You completed every step. Turn off Hide Done to review the checklist."
                  : "No steps match these filters."}
            </p>
          </div>
        )}
        {limit < visible.length ? (
          <div className="guides-load-more" id="guides-load-more">
            <button
              className="action-button"
              type="button"
              onClick={() => setLimit((value) => value + PAGE_SIZE)}
            >
              Load More
            </button>
            <span>
              {Math.min(limit, visible.length)} of {visible.length} steps loaded
            </span>
          </div>
        ) : null}
      </div>
    </>
  );
}

function GuideStepRow({
  child = false,
  childrenCount = 0,
  completedChildren = 0,
  done,
  error,
  expanded = false,
  item,
  pending,
  toggle,
  toggleExpanded,
}: {
  child?: boolean;
  childrenCount?: number;
  completedChildren?: number;
  done: boolean;
  error: string;
  expanded?: boolean;
  item: GuideStep;
  pending: boolean;
  toggle: (done: boolean) => void;
  toggleExpanded?: () => void;
}) {
  const context = [item.divider, item.section].filter(Boolean);
  const parent = childrenCount > 0;
  return (
    <article
      className={`guide-step${done ? " is-done" : ""}${pending ? " is-saving" : ""}${error ? " has-save-error" : ""}${child ? " guide-step--child" : ""}${parent ? " guide-step--parent" : ""}`}
      data-guide-step-row={`${item.guideId}::${item.stepId}`}
      role={parent ? "button" : undefined}
      tabIndex={parent ? 0 : undefined}
      aria-expanded={parent ? expanded : undefined}
      onClick={(event) => {
        if (
          parent &&
          !(event.target as Element).closest("input, label, a, button, select")
        )
          toggleExpanded?.();
      }}
      onKeyDown={(event) => {
        if (
          parent &&
          ["Enter", " "].includes(event.key) &&
          !(event.target as Element).closest("input, label, a, button, select")
        ) {
          event.preventDefault();
          toggleExpanded?.();
        }
      }}
    >
      {pending ? (
        <p className="guide-step-save-status" role="status">
          Saving…
        </p>
      ) : null}
      {error ? (
        <p className="guide-step-save-status is-error" role="alert">
          Not saved. {error}
        </p>
      ) : null}
      <label className="guide-step-check">
        <input
          type="checkbox"
          checked={done}
          disabled={pending}
          onChange={(event) => toggle(event.target.checked)}
        />
        <span aria-hidden="true">
          <Check />
        </span>
        <span className="sr-only">
          Mark step {item.stepId} {done ? "not done" : "done"}
        </span>
      </label>
      <div className="guide-step-content">
        {context.length ? (
          <p className="guide-step-context">{context.join(" • ")}</p>
        ) : null}
        <div className="guide-step-main">
          {item.type ? (
            <span className="guide-step-type">{item.type}</span>
          ) : null}
          <p>
            {item.step}
            {safeUrl(item.url) ? (
              <a
                className="guide-step-link"
                href={safeUrl(item.url)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open more information"
                title="Open more information"
              >
                <ExternalLink aria-hidden="true" />
              </a>
            ) : null}
          </p>
        </div>
        {parent ? (
          <p className="guide-step-child-summary">
            <span>
              {completedChildren} of {childrenCount} child steps complete
            </span>
            <span className="guide-step-expand-label">
              {expanded ? "Hide" : "Show"} steps
            </span>
          </p>
        ) : null}
      </div>
    </article>
  );
}

function GuideFilter({
  label,
  setValue,
  value,
  values,
}: {
  label: string;
  setValue: (value: string) => void;
  value: string;
  values: string[];
}) {
  if (!values.length) return null;
  return (
    <label className="ranking-select-control">
      <span>{label}</span>
      <select value={value} onChange={(event) => setValue(event.target.value)}>
        <option value="">All</option>
        {values.map((entry) => (
          <option value={entry} key={entry}>
            {entry}
          </option>
        ))}
      </select>
    </label>
  );
}

function GuideStats({
  completed,
  percent,
  remaining,
  total,
}: {
  completed: number;
  percent: number;
  remaining: number;
  total: number;
}) {
  return (
    <section className="guide-stats" aria-label="Guide progress">
      <div>
        <span>Total Steps</span>
        <strong>{total}</strong>
      </div>
      <div>
        <span>Completed</span>
        <strong>{completed}</strong>
      </div>
      <div>
        <span>Remaining</span>
        <strong>{remaining}</strong>
      </div>
      <div>
        <span>Progress</span>
        <strong>{percent}%</strong>
      </div>
      <div className="guide-progress-track" aria-label={`${percent}% complete`}>
        <span style={{ width: `${percent}%` }} />
      </div>
    </section>
  );
}

function GuideReferences({ guide }: { guide: Guide }) {
  const values = [
    guide.todoId ? `To Do #${guide.todoId}` : "",
    guide.rankingId ? `VG Ranking #${guide.rankingId}` : "",
  ].filter(Boolean);
  return values.length ? (
    <p className="guide-references">
      {values.map((value, index) => (
        <span key={value}>
          {index ? " • " : ""}
          {value}
        </span>
      ))}
    </p>
  ) : null;
}

function GuidesLoading({
  detail = false,
  title = "Guide",
}: {
  detail?: boolean;
  title?: string;
}) {
  return detail ? (
    <>
      <a className="guides-back-link" href="#guides">
        ← All Guides
      </a>
      <div className="section-heading page-heading-with-action footy-heading">
        <div>
          <p className="guides-eyebrow">Guide</p>
          <h1>{title}</h1>
        </div>
      </div>
      <div
        className="guides-checklist guides-checklist-loading"
        aria-label="Loading checklist"
      >
        {Array.from({ length: 6 }, (_, index) => (
          <span className="guides-skeleton-step" key={index} />
        ))}
      </div>
    </>
  ) : (
    <>
      <div className="section-heading page-heading-with-action footy-heading">
        <div>
          <p className="guides-eyebrow">Walkthroughs</p>
          <h1>Guides</h1>
        </div>
      </div>
      <div className="guides-loading-grid" aria-label="Loading guides">
        <span className="guides-skeleton-card" />
        <span className="guides-skeleton-card" />
        <span className="guides-skeleton-card" />
      </div>
    </>
  );
}

function GuidesError({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <div className="guides-empty-state guides-error-state">
      <h1>Unable to load guides</h1>
      <p>{error.message || "Please check your connection and try again."}</p>
      <button className="action-button" type="button" onClick={retry}>
        Try Again
      </button>
    </div>
  );
}

function GuideNotFound({ navigate }: { navigate: (id: string) => void }) {
  return (
    <>
      <a
        className="guides-back-link"
        href="#guides"
        onClick={(event) => {
          event.preventDefault();
          navigate("");
        }}
      >
        ← All Guides
      </a>
      <div className="guides-empty-state">
        <h1>Guide not found</h1>
        <p>This guide may have been removed or its ID may have changed.</p>
      </div>
    </>
  );
}

function safeUrl(value: string) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

declare global {
  interface Window {
    BOX_THIS_LAP_VERSION?: string;
  }
}
