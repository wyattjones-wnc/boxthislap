import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { Miniflare } from "miniflare";
import { syncMatchResults, dispatchResultRefresh } from "../src/index.js";
const root = fileURLToPath(new URL("../../../", import.meta.url));
const workerPath = fileURLToPath(new URL("../src/index.js", import.meta.url));

test("result sync fills only missing scores and records only changed revisions", async (context) => {
  const worker = await createWorker();
  context.after(() => worker.dispose());
  const DB = await worker.getD1Database("DB");
  for (const file of [
    "0001_initial.sql",
    "0002_revision_history.sql",
    "0009_match_note_kit.sql",
  ]) {
    await executeSql(
      DB,
      await readFile(new URL(`../migrations/${file}`, import.meta.url), "utf8"),
    );
  }
  const results = [{ matchId: "match-1", homeScore: "0", awayScore: "2" }];
  let notes = await syncMatchResults({ DB }, { results });
  assert.equal(notes[0].homeScore, "0");
  assert.equal(notes[0].revision, 1);
  await syncMatchResults({ DB }, { results });
  assert.equal(
    (
      await DB.prepare(
        "SELECT count(*) AS n FROM footy_match_note_history",
      ).first()
    ).n,
    1,
  );
  await DB.prepare(
    "UPDATE footy_match_notes SET home_score = '3', away_score = '', kit = 'third', note = 'manual', follow_goal_assists = '[{\"scorer\":\"Player\"}]' WHERE match_id = 'match-1'",
  ).run();
  notes = await syncMatchResults({ DB }, { results });
  assert.equal(notes[0].homeScore, "3");
  assert.equal(notes[0].awayScore, "2");
  assert.equal(notes[0].kit, "third");
  assert.equal(notes[0].note, "manual");
  assert.equal(notes[0].followGoalAssists[0].scorer, "Player");
  assert.equal(notes[0].revision, 2);
  assert.equal(
    (
      await DB.prepare(
        "SELECT count(*) AS n FROM footy_match_note_history",
      ).first()
    ).n,
    2,
  );
  await assert.rejects(
    syncMatchResults(
      { DB },
      { results: [{ matchId: "bad", homeScore: null, awayScore: "0" }] },
    ),
  );
  await Promise.all([
    syncMatchResults({ DB }, { results }),
    syncMatchResults({ DB }, { results }),
  ]);
  assert.equal(
    (
      await DB.prepare(
        "SELECT count(*) AS n FROM footy_match_note_history",
      ).first()
    ).n,
    2,
  );
  const response = await worker.dispatchFetch(
    "https://example.com/api/match-notes/results/sync",
    { method: "POST", body: JSON.stringify({ results }) },
  );
  assert.equal(response.status, 401);
  const authorized = await worker.dispatchFetch(
    "https://example.com/api/match-notes/results/sync",
    {
      method: "POST",
      headers: {
        "X-Results-Sync-Token": "test-token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ results }),
    },
  );
  assert.equal(authorized.status, 200);
  assert.equal((await authorized.json()).notes[0].kit, "third");
});

async function executeSql(db, sql) {
  const statements = String(sql)
    .replaceAll("\r", "")
    .split(/;\s*(?:\n|$)(?!\s*END\b)/)
    .map((value) => value.trim())
    .filter(Boolean);
  for (const statement of statements) await db.prepare(statement).run();
}

async function createWorker() {
  return new Miniflare({
    workers: [
      {
        config: {
          compatibilityDate: "2026-08-22",
          env: {
            ROSTER_SYNC_TOKEN: { type: "text", value: "test-token" },
            DB: { name: `footy-media-${crypto.randomUUID()}`, type: "d1" },
          },
          manifest: {
            mainModule: "workers/footy-notes/src/index.js",
            modules: {
              "workers/shared/file-metadata.js": {
                contents: await readFile(
                  new URL("../../shared/file-metadata.js", import.meta.url),
                  "utf8",
                ),
                type: "esm",
              },
              "workers/image-library/src/image-info.js": {
                contents: await readFile(
                  new URL(
                    "../../image-library/src/image-info.js",
                    import.meta.url,
                  ),
                  "utf8",
                ),
                type: "esm",
              },
              "workers/shared/media-budget.js": {
                contents: await readFile(
                  new URL("../../shared/media-budget.js", import.meta.url),
                  "utf8",
                ),
                type: "esm",
              },
              "workers/footy-notes/src/index.js": {
                contents: await readFile(workerPath, "utf8"),
                type: "esm",
              },
            },
            modulesRoot: root,
          },
          name: `footy-media-${crypto.randomUUID()}`,
          type: "worker",
        },
      },
    ],
  });
}

test("overnight cron dispatches the dev refresh and reports failures", async () => {
  const env = {
    GITHUB_ACTIONS_TOKEN: "test",
    GITHUB_REPOSITORY: "owner/repo",
    GITHUB_RESULTS_REF: "dev",
  };
  await dispatchResultRefresh(env, async (url, options) => {
    assert.match(url, /update-footy-schedule.yml\/dispatches$/);
    assert.deepEqual(JSON.parse(options.body), { ref: "dev" });
    return { ok: true };
  });
  await assert.rejects(
    dispatchResultRefresh(env, async () => ({ ok: false, status: 403 })),
    /403/,
  );
});
