import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { classifyFantasyOfficeRun } from "../../../scripts/fantasy-office-run-status.mjs";
import { reportFantasyOfficeIncident } from "../../../scripts/report-fantasy-office-failure.mjs";

const gap = {
  movieId: "unmatched",
  metric: "domestic_gross",
  status: "error",
  error: "CONFIG_ERROR",
};
function report(overrides = {}) {
  return {
    status: "warning",
    runId: "run-1",
    completedAt: "2026-10-29T01:00:00Z",
    completedMovies: 55,
    totalMovies: 55,
    succeeded: 159,
    failed: 1,
    outcomes: [gap],
    ...overrides,
  };
}

test("saved source gaps and unpublished scores permit successful execution", () => {
  assert.equal(classifyFantasyOfficeRun(report()).exitCode, 0);
  assert.equal(classifyFantasyOfficeRun(report()).gaps.length, 1);
  assert.equal(classifyFantasyOfficeRun(report()).status, "warning");
  assert.equal(
    classifyFantasyOfficeRun(
      report({
        status: "healthy",
        failed: 0,
        outcomes: [{ status: "not_available" }],
      }),
    ).exitCode,
    0,
  );
});

test("real and unknown observation failures remain execution failures, including mixed runs", () => {
  for (const error of [
    "PARSE_ERROR",
    "NETWORK_ERROR",
    "TIMEOUT",
    "HTTP_ERROR",
    "RATE_LIMITED",
    "VALIDATION_ERROR",
    "SUSPICIOUS_DECREASE",
    undefined,
  ]) {
    const result = classifyFantasyOfficeRun(
      report({
        failed: 2,
        outcomes: [
          gap,
          { movieId: "broken", metric: "tomatometer", status: "error", error },
        ],
      }),
    );
    assert.equal(result.exitCode, 1, String(error));
    assert.equal(result.errors.length, 1);
    assert.equal(result.gaps.length, 1);
  }
});

test("authentication, save timeouts, incomplete work, and unaccounted failures cannot recover an incident", () => {
  for (const overrides of [
    { status: "failed", error: "GET config: HTTP 401" },
    { status: "failed", error: "POST observations: timeout" },
    { completedMovies: 54 },
    { status: "running" },
    { failed: 2 },
    { status: undefined },
  ])
    assert.equal(classifyFantasyOfficeRun(report(overrides)).exitCode, 1);
});

function githubFixture(existing = false) {
  const calls = [];
  return {
    calls,
    options: {
      token: "test-token",
      repository: "owner/repo",
      async fetchImpl(url, options) {
        calls.push({
          url,
          method: options.method || "GET",
          body: options.body ? JSON.parse(options.body) : undefined,
        });
        return Response.json(
          url.includes("?state=open")
            ? existing
              ? [
                  {
                    title:
                      "[Movie Data] Fantasy Office updater needs attention",
                    number: 7,
                    updated_at: "2026-01-01",
                  },
                ]
              : []
            : {},
        );
      },
    },
  };
}

test("a gap-only completed run creates no execution incident", async () => {
  const setup = githubFixture();
  await reportFantasyOfficeIncident({ ...setup.options, report: report() });
  assert.deepEqual(
    setup.calls.map((call) => call.method),
    ["GET"],
  );
});

test("gap-only recovery closes a prior incident while acknowledging remaining gaps", async () => {
  const setup = githubFixture(true);
  await reportFantasyOfficeIncident({ ...setup.options, report: report() });
  const comment = setup.calls.find((call) => call.method === "POST");
  assert.match(comment.body.body, /1 source gaps remain as warnings/);
  assert.ok(!comment.body.body.includes("All 159 observations succeeded"));
  assert.deepEqual(setup.calls.at(-1).body, { state: "closed" });
});

test("mixed failures create an incident for execution errors and leave gaps in the summary", async () => {
  const setup = githubFixture();
  await reportFantasyOfficeIncident({
    ...setup.options,
    report: report({
      failed: 2,
      outcomes: [
        gap,
        {
          movieId: "broken",
          metric: "tomatometer",
          status: "error",
          error: "PARSE_ERROR",
        },
      ],
    }),
  });
  const issue = setup.calls.find((call) => call.method === "POST");
  assert.match(issue.body.body, /Execution errors: 1/);
  assert.match(issue.body.body, /Source gaps \(warnings\): 1/);
  assert.match(issue.body.body, /PARSE_ERROR/);
  assert.ok(!issue.body.body.includes("CONFIG_ERROR"));
});

test("scoped verification never opens or closes a whole-season incident", async () => {
  const setup = githubFixture(true);
  await reportFantasyOfficeIncident({
    ...setup.options,
    report: report({ partial: true }),
  });
  assert.equal(setup.calls.length, 0);
});

test("the actual updater CLI exits successfully for saved gaps and fails authentication errors", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "fantasy-office-exit-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const script = fileURLToPath(
    new URL("../../../scripts/update-fantasy-office-data.mjs", import.meta.url),
  );
  for (const authFailure of [false, true]) {
    const preload = `globalThis.fetch = async (url, options) => {
      if (url.endsWith('/config')) return Response.json(${authFailure} ? { ok: false, error: 'Unauthorized' } : { ok: true, movies: [{ id: 'missing', title: 'Missing Movie' }] }, { status: ${authFailure} ? 401 : 200 });
      if (url.endsWith('/sources')) return Response.json({ ok: true });
      if (url.endsWith('/observations')) {
        const body = JSON.parse(options.body);
        return Response.json({ ok: true, succeeded: 0, failed: 4, outcomes: body.observations.map(entry => ({ movieId: entry.movieId, metric: entry.metric, status: 'error', error: 'CONFIG_ERROR' })) });
      }
      return new Response('<html></html>');
    };`;
    const result = spawnSync(
      process.execPath,
      [
        "--import",
        `data:text/javascript,${encodeURIComponent(preload)}`,
        script,
      ],
      {
        cwd: directory,
        env: {
          ...process.env,
          FANTASY_OFFICE_SYNC_SECRET: "test-secret",
          FANTASY_OFFICE_MOVIE_LIMIT: "0",
          GITHUB_STEP_SUMMARY: join(directory, "summary.md"),
        },
        encoding: "utf8",
        timeout: 10000,
      },
    );
    assert.equal(
      result.status,
      authFailure ? 1 : 0,
      result.stderr + result.stdout,
    );
    const saved = JSON.parse(
      await readFile(
        join(directory, ".tmp/fantasy-office-report.json"),
        "utf8",
      ),
    );
    assert.equal(saved.status, authFailure ? "failed" : "warning");
    if (!authFailure)
      assert.match(
        await readFile(join(directory, "summary.md"), "utf8"),
        /completed successfully with source gaps/,
      );
  }
});
