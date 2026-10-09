import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import worker, { dispatchEvents, saveState } from "../src/index.js";
import {
  eventIsCurrent,
  newDraft,
  scheduleFor,
  transition,
  visibleDraft,
} from "../src/model.js";

const participants = ["1", "2", "3", "6"].map((id) => ({
  id,
  name: `Manager ${id}`,
}));
const configuration = {
  league: "fantasy-office",
  year: 2027,
  name: "Test draft",
  resourceLabel: "Movies",
  participants,
  rounds: 2,
  options: Array.from({ length: 12 }, (_, index) => ({
    id: `option-${index}`,
    name: `Option ${index}`,
  })),
};
function apply(state, action, body = {}, actor = "6", admin = true) {
  return transition(
    state,
    action,
    { revision: state.revision, ...body },
    actor,
    admin,
  );
}
function activeDraft() {
  return apply(apply(newDraft(configuration, "6"), "publish"), "start");
}
function pick(state, id = state.options[state.picks.length].id) {
  return apply(
    state,
    "pick",
    { optionId: id, requestId: crypto.randomUUID() },
    state.schedule[state.picks.length].managerId,
    false,
  );
}

test("four-manager snake includes consecutive boundary turns; two and three repeat seeds", () => {
  assert.deepEqual(
    scheduleFor(participants, 3).map((turn) => turn.managerId),
    ["1", "2", "3", "6", "6", "3", "2", "1", "1", "2", "3", "6"],
  );
  for (const size of [2, 3])
    assert.deepEqual(
      scheduleFor(participants.slice(0, size), 2).map((turn) => turn.managerId),
      [...participants.slice(0, size), ...participants.slice(0, size)].map(
        (manager) => manager.id,
      ),
    );
});

test("setup rejects duplicate managers/options, unsupported seasons, and invalid rounds", () => {
  for (const body of [
    { ...configuration, participants: [participants[0], participants[0]] },
    {
      ...configuration,
      options: [
        { id: "a", name: "Same" },
        { id: "b", name: "same" },
      ],
    },
    { ...configuration, year: 2026 },
    { ...configuration, rounds: 0 },
  ])
    assert.throws(
      () => newDraft(body, "6"),
      (error) => error.status === 400,
    );
  assert.throws(
    () => apply(newDraft({ ...configuration, options: [] }, "6"), "publish"),
    /every scheduled pick/,
  );
});

test("wrong manager and taken option cannot pick, and a completed draft cannot advance", () => {
  const initial = activeDraft();
  assert.throws(
    () =>
      apply(
        initial,
        "pick",
        { optionId: "option-0", requestId: "wrong" },
        "2",
        false,
      ),
    (error) => error.status === 403,
  );
  const first = pick(initial);
  assert.throws(
    () => pick(first, "option-0"),
    (error) => error.status === 409,
  );
  let state = first;
  while (state.status === "active") state = pick(state);
  assert.equal(state.status, "completed");
  assert.equal(state.picks.length, 8);
  assert.equal(new Set(state.picks.map((entry) => entry.optionId)).size, 8);
  assert.throws(() => pick(state, "option-11"));
});

test("retry returns original state, including after undo, and cannot reuse the key for another choice", () => {
  const initial = activeDraft();
  const body = {
    revision: initial.revision,
    optionId: "option-0",
    requestId: "retry-1",
  };
  const first = transition(initial, "pick", body, "1", false);
  assert.equal(transition(first, "pick", body, "1", false), first);
  assert.throws(
    () =>
      transition(first, "pick", { ...body, optionId: "option-1" }, "1", false),
    /another selection/,
  );
  const undone = apply(first, "undo", { reason: "Testing recovery" });
  assert.equal(undone.status, "paused");
  assert.equal(undone.picks.length, 0);
  assert.equal(transition(undone, "pick", body, "1", false), undone);
  assert.equal(apply(undone, "resume").schedule[0].managerId, "1");
  assert.equal(pick(apply(undone, "resume"), "option-0").picks.length, 1);
});

test("paused draft rejects picks; cancellation retains existing ownership", () => {
  const first = pick(activeDraft());
  const paused = apply(first, "pause", { reason: "Break" });
  assert.throws(() => pick(paused), /not accepting/);
  assert.throws(
    () => apply(paused, "configure", configuration),
    /cannot be reordered/,
  );
  const cancelled = apply(paused, "cancel", { reason: "Test ended" });
  assert.equal(cancelled.picks[0].optionId, "option-0");
  assert.throws(() => apply(cancelled, "resume"), /paused draft/);
});

test("preferences are personal, independent of turn access, and stale turn events are suppressed", () => {
  const initial = activeDraft();
  assert.equal(pick(initial).picks.length, 1); // No subscription is needed to draft.
  const subscribed = apply(
    initial,
    "preferences",
    { enabled: true, push: true },
    "1",
    false,
  );
  const event = subscribed.events.find((entry) => entry.type === "turn");
  assert.ok(event);
  assert.equal(eventIsCurrent(subscribed, event), true);
  assert.equal(eventIsCurrent(pick(subscribed), event), false);
  const publicState = visibleDraft(subscribed, "");
  assert.equal(publicState.preferences, undefined);
  assert.equal(publicState.events, undefined);
  assert.equal(publicState.audit, undefined);
  assert.deepEqual(publicState.notifications, []);
  assert.throws(
    () =>
      apply(
        initial,
        "preferences",
        { enabled: true, push: true },
        "unknown",
        false,
      ),
    (error) => error.status === 403,
  );
});

async function database() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(
    await readFile(
      new URL("../migrations/0001_initial.sql", import.meta.url),
      "utf8",
    ),
  );
  const DB = {
    prepare(sql) {
      return {
        bind(...values) {
          const statement = sqlite.prepare(sql);
          return {
            async run() {
              const result = statement.run(...values);
              return { meta: { changes: Number(result.changes) } };
            },
            async first() {
              return statement.get(...values) || null;
            },
            async all() {
              return { results: statement.all(...values) };
            },
          };
        },
      };
    },
  };
  return { sqlite, DB };
}

test("real SQLite compare-and-swap allows one simultaneous pick and saves its entire aggregate", async () => {
  const { sqlite, DB } = await database();
  try {
    const state = apply(
      activeDraft(),
      "preferences",
      { enabled: true, push: true },
      "2",
      false,
    );
    await DB.prepare(
      "INSERT INTO league_drafts_state VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    )
      .bind(
        "dev",
        state.id,
        state.league,
        state.year,
        state.status,
        state.revision,
        JSON.stringify(state),
        "now",
      )
      .run();
    const env = { DB, DRAFT_ENVIRONMENT: "dev" };
    const one = pick(state, "option-0");
    const two = pick(state, "option-1");
    const results = await Promise.all([
      saveState(env, state, one),
      saveState(env, state, two),
    ]);
    assert.deepEqual(results.sort(), [false, true]);
    const stored = JSON.parse(
      (
        await DB.prepare("SELECT state FROM league_drafts_state WHERE id = ?")
          .bind(state.id)
          .first()
      ).state,
    );
    assert.equal(stored.picks.length, 1);
    assert.equal(stored.revision, state.revision + 1);
    assert.equal(stored.audit.at(-1).action, "pick");
    assert.equal(stored.events.at(-1).managerId, "2");
    assert.equal(stored.schedule[stored.picks.length].managerId, "2");
    assert.equal(
      await saveState({ ...env, DRAFT_ENVIRONMENT: "production" }, one, two),
      false,
    );
    assert.throws(
      () =>
        sqlite
          .prepare("UPDATE league_drafts_state SET revision = revision + 1")
          .run(),
      /CHECK constraint/,
    );
    assert.equal(
      JSON.parse(
        sqlite.prepare("SELECT state FROM league_drafts_state").get().state,
      ).picks.length,
      1,
    );
  } finally {
    sqlite.close();
  }
});

test("API verifies accounts, hides unpublished drafts, isolates dev, and rejects production test picks", async () => {
  const { sqlite, DB } = await database();
  const env = {
    DB,
    DRAFT_ENVIRONMENT: "dev",
    ADMIN_MANAGER_IDS: "6",
    ALLOWED_ORIGINS: "http://localhost:5173",
    AUTH_SERVICE: {
      async fetch(request) {
        if (new URL(request.url).pathname === "/api/managers")
          return Response.json({
            managers: participants.map((manager) => ({
              ...manager,
              active: true,
            })),
          });
        const body = await request.json();
        return body.accessToken === "expired"
          ? Response.json({ ok: false }, { status: 401 })
          : Response.json({ ok: true, managerId: body.accessToken });
      },
    },
  };
  const pending = [];
  async function request(
    path,
    token = "",
    body,
    method = body ? "POST" : "GET",
    environment = env,
  ) {
    return worker.fetch(
      new Request(`https://drafts.test${path}`, {
        method,
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      }),
      environment,
      {
        waitUntil(promise) {
          pending.push(promise);
        },
      },
    );
  }
  try {
    assert.equal(
      (await request("/api/drafts", "1", configuration)).status,
      403,
    );
    assert.equal(
      (
        await request("/api/drafts", "6", {
          ...configuration,
          participants: [
            ...participants.slice(0, 3),
            { id: "fake", name: "Fake" },
          ],
        })
      ).status,
      400,
    );
    let draft = (
      await (await request("/api/drafts", "6", configuration)).json()
    ).draft;
    assert.equal((await request(`/api/drafts/${draft.id}`)).status, 404);
    assert.equal((await request("/api/drafts", "expired")).status, 401);
    assert.equal(
      (
        await request(`/api/drafts/${draft.id}`, "", undefined, "GET", {
          ...env,
          DRAFT_ENVIRONMENT: "production",
        })
      ).status,
      404,
    );
    draft = (
      await (
        await request(`/api/drafts/${draft.id}/publish`, "6", {
          revision: draft.revision,
        })
      ).json()
    ).draft;
    draft = (
      await (
        await request(`/api/drafts/${draft.id}/start`, "6", {
          revision: draft.revision,
        })
      ).json()
    ).draft;
    const body = {
      revision: draft.revision,
      optionId: "option-0",
      requestId: "first-request",
    };
    const results = await Promise.all([
      request(`/api/drafts/${draft.id}/picks`, "1", body),
      request(`/api/drafts/${draft.id}/picks`, "1", {
        ...body,
        optionId: "option-1",
        requestId: "second-request",
      }),
    ]);
    assert.deepEqual(results.map((result) => result.status).sort(), [200, 409]);
    draft = (await (await request(`/api/drafts/${draft.id}`, "6")).json())
      .draft;
    assert.equal(draft.picks.length, 1);
    assert.equal(
      (
        await request(`/api/drafts/${draft.id}/test-pick`, "2", {
          revision: draft.revision,
          optionId: "option-2",
          requestId: "test",
        })
      ).status,
      403,
    );
    draft = (
      await (
        await request(`/api/drafts/${draft.id}/test-pick`, "6", {
          revision: draft.revision,
          optionId: "option-2",
          requestId: "test",
        })
      ).json()
    ).draft;
    assert.equal(draft.picks.at(-1).managerId, "2");
    assert.equal(draft.picks.at(-1).adminActor, "6");
    assert.equal(draft.audit.at(-1).action, "test-pick");
    // A copy in another namespace exercises the production restriction independently of lookup isolation.
    const state = sqlite
      .prepare("SELECT * FROM league_drafts_state WHERE id = ?")
      .get(draft.id);
    await DB.prepare(
      "INSERT INTO league_drafts_state VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    )
      .bind(
        "production",
        state.id,
        state.league,
        state.year,
        state.status,
        state.revision,
        state.state,
        state.updated_at,
      )
      .run();
    assert.equal(
      (
        await request(
          `/api/drafts/${draft.id}/test-pick`,
          "6",
          {
            revision: draft.revision,
            optionId: "option-3",
            requestId: "prod-test",
          },
          "POST",
          { ...env, DRAFT_ENVIRONMENT: "production" },
        )
      ).status,
      403,
    );
    assert.equal((await request("/api/drafts", "1")).status, 200);
  } finally {
    await Promise.all(pending);
    sqlite.close();
  }
});

test("failed push persists outbox for retry and dispatch suppresses an obsolete turn", async () => {
  const { sqlite, DB } = await database();
  try {
    let state = apply(
      activeDraft(),
      "preferences",
      { enabled: true, push: true },
      "1",
      false,
    );
    await DB.prepare(
      "INSERT INTO league_drafts_state VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    )
      .bind(
        "dev",
        state.id,
        state.league,
        state.year,
        state.status,
        state.revision,
        JSON.stringify(state),
        "now",
      )
      .run();
    let calls = 0;
    const env = {
      DB,
      DRAFT_ENVIRONMENT: "dev",
      DRAFT_PUSH_SECRET: "test-secret",
      SITE_URL: "https://wyattjones-wnc.github.io/boxthislap/dev/",
      PUSH_SERVICE: {
        async fetch() {
          calls += 1;
          return Response.json({ ok: false }, { status: 503 });
        },
      },
    };
    await assert.rejects(dispatchEvents(env, state.id), /503/);
    assert.equal(
      JSON.parse(
        sqlite.prepare("SELECT state FROM league_drafts_state").get().state,
      ).events[0].deliveredAt,
      null,
    );
    const advanced = pick(state);
    assert.equal(await saveState(env, state, advanced), true);
    state = advanced;
    await dispatchEvents(env, state.id);
    assert.equal(calls, 1);
    assert.ok(
      JSON.parse(
        sqlite.prepare("SELECT state FROM league_drafts_state").get().state,
      ).events[0].deliveredAt,
    );
  } finally {
    sqlite.close();
  }
});
