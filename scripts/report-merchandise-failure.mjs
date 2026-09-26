import { readFile } from "node:fs/promises";

const report = JSON.parse(
  await readFile(
    new URL("../.tmp/merchandise-report.json", import.meta.url),
    "utf8",
  ),
);
const token = process.env.GH_TOKEN;
const repository = process.env.GITHUB_REPOSITORY;
if (!token || !repository)
  throw new Error("GitHub issue reporting is not configured.");
const title = "Merchandise catalog automation incident";
const github = async (path, options = {}) => {
  const response = await fetch(
    `https://api.github.com/repos/${repository}${path}`,
    {
      ...options,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "boxthislap-merchandise-monitor",
        ...(options.headers || {}),
      },
    },
  );
  if (!response.ok) throw new Error(`GitHub API returned ${response.status}.`);
  return response.status === 204 ? null : response.json();
};
const issues = await github("/issues?state=open&per_page=100");
const existing = issues.find((issue) => issue.title === title);
if (report.healthy) {
  if (existing)
    await github(`/issues/${existing.number}`, {
      method: "PATCH",
      body: JSON.stringify({ state: "closed", state_reason: "completed" }),
    });
  process.exit(0);
}
const failures = report.outcomes.filter(
  (outcome) => outcome.status !== "succeeded" && outcome.alert !== false,
);
if (!failures.length) process.exit(0);
const body = [
  "The scheduled merchandise catalog scan is unhealthy.",
  "",
  ...failures.map(
    (failure) => `- **${failure.source}**: ${failure.error || failure.status}`,
  ),
  "",
  `Workflow: ${process.env.GITHUB_SERVER_URL}/${repository}/actions/runs/${process.env.GITHUB_RUN_ID}`,
].join("\n");
if (existing)
  await github(`/issues/${existing.number}/comments`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
else
  await github("/issues", {
    method: "POST",
    body: JSON.stringify({ title, body }),
  });
