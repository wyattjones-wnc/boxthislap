import { readFile } from "node:fs/promises";

const title = "[Movie Data] Fantasy Office updater needs attention";
const token = process.env.GH_TOKEN;
const repository = process.env.GITHUB_REPOSITORY;
if (!token || !repository)
  throw new Error("GH_TOKEN and GITHUB_REPOSITORY are required.");
const report = JSON.parse(
  await readFile(".tmp/fantasy-office-report.json", "utf8"),
);
const apiBase = `https://api.github.com/repos/${repository}`;

async function github(path, options = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.headers || {}),
    },
  });
  const value = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(
      value.message || `GitHub returned HTTP ${response.status}.`,
    );
  return value;
}

const issues = await github("/issues?state=open&per_page=100");
const existing = issues.find((issue) => issue.title === title);
const failures = (report.outcomes || []).filter(
  (outcome) => !["healthy", "not_available"].includes(outcome.status),
);
const systemic = [];
const metrics = new Set(
  (report.outcomes || []).map((outcome) => outcome.metric),
);
for (const metric of metrics) {
  if (!metric) continue;
  const attempts = report.outcomes.filter(
    (outcome) => outcome.metric === metric,
  );
  const metricFailures = attempts.filter(
    (outcome) => !["healthy", "not_available"].includes(outcome.status),
  );
  if (attempts.length && metricFailures.length / attempts.length >= 0.5) {
    systemic.push(
      `- Systemic source failure suspected for \`${metric}\`: ${metricFailures.length}/${attempts.length} observations failed.`,
    );
  }
}
if (report.status === "healthy") {
  if (existing) {
    await github(`/issues/${existing.number}/comments`, {
      method: "POST",
      body: JSON.stringify({
        body: `Recovered in run \`${report.runId}\` at ${report.completedAt}. All ${report.succeeded} observations succeeded.`,
      }),
    });
    await github(`/issues/${existing.number}`, {
      method: "PATCH",
      body: JSON.stringify({ state: "closed" }),
    });
  }
  process.exit(0);
}

const detail = failures
  .slice(0, 50)
  .map(
    (failure) =>
      `- \`${failure.movieId || "system"}\` / \`${failure.metric || "run"}\`: ${failure.error || failure.status}`,
  )
  .join("\n");
const body = [
  `Run: \`${report.runId || "unavailable"}\``,
  `Completed: ${report.completedAt}`,
  `Succeeded: ${report.succeeded || 0}`,
  `Failed: ${report.failed || failures.length || "system failure"}`,
  "",
  ...systemic,
  ...(systemic.length ? [""] : []),
  detail ||
    report.error ||
    "The updater failed before metric results were available.",
  "",
  "The workflow artifact contains sanitized source responses captured for parse failures.",
].join("\n");
if (existing) {
  const age = Date.now() - Date.parse(existing.updated_at);
  if (age >= 24 * 60 * 60 * 1000) {
    await github(`/issues/${existing.number}/comments`, {
      method: "POST",
      body: JSON.stringify({ body }),
    });
  }
} else {
  await github("/issues", {
    method: "POST",
    body: JSON.stringify({ body, title }),
  });
}
