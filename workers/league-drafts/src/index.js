import {
  eventIsCurrent,
  fail,
  newDraft,
  transition,
  visibleDraft,
} from "./model.js";

export async function saveState(env, previous, next) {
  // The entire draft (claims, turn, audit, and notification outbox) is one aggregate.
  // A single conditional UPDATE is atomic; a losing writer cannot leave partial state.
  const result = await env.DB.prepare(
    "UPDATE league_drafts_state SET state = ?, revision = ?, status = ?, updated_at = ? WHERE environment = ? AND id = ? AND revision = ? AND state = ?",
  )
    .bind(
      JSON.stringify(next),
      next.revision,
      next.status,
      new Date().toISOString(),
      env.DRAFT_ENVIRONMENT,
      previous.id,
      previous.revision,
      JSON.stringify(previous),
    )
    .run();
  return Number(result.meta.changes) === 1;
}

async function readState(env, id) {
  const row = await env.DB.prepare(
    "SELECT state FROM league_drafts_state WHERE environment = ? AND id = ?",
  )
    .bind(env.DRAFT_ENVIRONMENT, id)
    .first();
  if (!row) fail(404, "Draft not found.");
  return JSON.parse(row.state);
}

async function managerFor(request, env, required = true) {
  const header = request.headers.get("Authorization") || "";
  if (!header.startsWith("Bearer ")) {
    if (required) fail(401, "Log in to continue.");
    return { id: "", admin: false };
  }
  const response = await env.AUTH_SERVICE.fetch(
    new Request("https://rankings.internal/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken: header.slice(7) }),
    }),
  );
  const result = await response.json();
  if (!response.ok || !result.ok || !result.managerId)
    fail(401, "Your session has expired. Log in again.");
  const id = String(result.managerId);
  return {
    id,
    admin: String(env.ADMIN_MANAGER_IDS || "")
      .split(",")
      .map((value) => value.trim())
      .includes(id),
  };
}

async function managerCatalog(env) {
  const result = await env.AUTH_SERVICE.fetch(
    new Request("https://rankings.internal/api/managers"),
  );
  if (!result.ok) fail(503, "Manager accounts could not be loaded.");
  const body = await result.json();
  return body.managers
    .filter((manager) => manager.active !== false)
    .map((manager) => ({
      id: String(manager.id),
      name: manager.displayName || manager.name,
    }));
}

async function validateParticipants(env, body) {
  const managers = await managerCatalog(env);
  body.participants = (
    Array.isArray(body.participants) ? body.participants : []
  ).map((participant) => {
    const manager = managers.find(
      (entry) => entry.id === String(participant.id),
    );
    if (!manager)
      fail(
        400,
        "Choose participating managers from the active manager accounts.",
      );
    return manager;
  });
  return body;
}

async function readBody(request) {
  const body = await request.json();
  if (!body || Array.isArray(body) || typeof body !== "object")
    fail(400, "Send a draft request object.");
  return body;
}

function response(request, env, value, status = 200) {
  const origin = request.headers.get("Origin") || "";
  const allowed = String(env.ALLOWED_ORIGINS || "")
    .split(",")
    .includes(origin);
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": allowed ? origin : "null",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
      Vary: "Origin",
    },
  });
}

export async function dispatchEvents(env, id) {
  if (!env.PUSH_SERVICE || !env.DRAFT_PUSH_SECRET) return;
  // Send one event at a time, and retain unsent events for cron retries.
  for (let count = 0; count < 50; count += 1) {
    const state = await readState(env, id);
    const event = state.events.find((entry) => !entry.deliveredAt);
    if (!event) return;
    if (
      eventIsCurrent(state, event) &&
      state.preferences[event.managerId]?.push
    ) {
      const result = await env.PUSH_SERVICE.fetch(
        new Request("https://push.internal/internal/draft-events", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${env.DRAFT_PUSH_SECRET}`,
          },
          body: JSON.stringify({
            ...event,
            environment: env.DRAFT_ENVIRONMENT,
            url: `${env.SITE_URL}#${state.league}-${state.year}-draft?draft=${state.id}`,
          }),
        }),
      );
      if (!result.ok)
        throw new Error(
          `Draft notification delivery returned ${result.status}.`,
        );
      const outcome = await result.json();
      if (outcome.failed)
        throw new Error(
          "Some draft notification devices could not be reached.",
        );
    }
    // Delivery changes are not gameplay revisions. Conditional state matching prevents
    // overwriting a concurrent pick/preference save or another dispatcher update.
    const next = structuredClone(state);
    next.events.find((entry) => entry.id === event.id).deliveredAt =
      new Date().toISOString();
    await env.DB.prepare(
      "UPDATE league_drafts_state SET state = ? WHERE environment = ? AND id = ? AND revision = ? AND state = ?",
    )
      .bind(
        JSON.stringify(next),
        env.DRAFT_ENVIRONMENT,
        id,
        state.revision,
        JSON.stringify(state),
      )
      .run();
  }
}

function queueDelivery(env, ctx, id) {
  ctx.waitUntil(
    dispatchEvents(env, id).catch((error) =>
      console.warn("Draft notifications pending retry:", error.message),
    ),
  );
}

export default {
  async fetch(request, env, ctx) {
    try {
      if (!env.DRAFT_ENVIRONMENT)
        fail(503, "Draft environment is not configured.");
      const origin = request.headers.get("Origin");
      if (
        origin &&
        !String(env.ALLOWED_ORIGINS || "")
          .split(",")
          .includes(origin)
      )
        fail(403, "Origin is not allowed.");
      if (request.method === "OPTIONS") return response(request, env, {}, 200);
      const url = new URL(request.url);
      if (url.pathname === "/health" && request.method === "GET")
        return response(request, env, {
          ok: true,
          environment: env.DRAFT_ENVIRONMENT,
          pushConfigured: Boolean(env.DRAFT_PUSH_SECRET && env.PUSH_SERVICE),
        });
      const manager = await managerFor(
        request,
        env,
        url.pathname.startsWith("/api/me") || request.method !== "GET",
      );
      if (url.pathname === "/api/managers" && request.method === "GET") {
        if (!manager.admin) fail(403, "Administrator access is required.");
        return response(request, env, {
          ok: true,
          managers: await managerCatalog(env),
        });
      }
      if (url.pathname === "/api/drafts" && request.method === "POST") {
        if (!manager.admin) fail(403, "Administrator access is required.");
        const state = newDraft(
          await validateParticipants(env, await readBody(request)),
          manager.id,
        );
        await env.DB.prepare(
          "INSERT INTO league_drafts_state (environment, id, league, year, status, revision, state, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        )
          .bind(
            env.DRAFT_ENVIRONMENT,
            state.id,
            state.league,
            state.year,
            state.status,
            state.revision,
            JSON.stringify(state),
            new Date().toISOString(),
          )
          .run();
        return response(
          request,
          env,
          { ok: true, draft: visibleDraft(state, manager.id, true) },
          201,
        );
      }
      if (
        ["/api/drafts", "/api/me/drafts"].includes(url.pathname) &&
        request.method === "GET"
      ) {
        const rows = await env.DB.prepare(
          "SELECT state FROM league_drafts_state WHERE environment = ? ORDER BY updated_at DESC LIMIT 200",
        )
          .bind(env.DRAFT_ENVIRONMENT)
          .all();
        const drafts = rows.results
          .map((row) => JSON.parse(row.state))
          .filter(
            (state) =>
              (manager.admin || state.status !== "setup") &&
              (!url.searchParams.get("league") ||
                state.league === url.searchParams.get("league")),
          )
          .filter(
            (state) =>
              url.pathname !== "/api/me/drafts" ||
              manager.admin ||
              state.participants.some((entry) => entry.id === manager.id),
          )
          .map((state) => visibleDraft(state, manager.id, manager.admin));
        return response(request, env, { ok: true, drafts });
      }
      const match = url.pathname.match(
        /^\/api\/drafts\/([a-zA-Z0-9-]+)(?:\/([a-z-]+))?$/,
      );
      if (!match) fail(404, "Draft endpoint not found.");
      let state = await readState(env, match[1]);
      if (state.status === "setup" && !manager.admin)
        fail(404, "Draft not found.");
      if (request.method === "GET" && !match[2])
        return response(request, env, {
          ok: true,
          draft: visibleDraft(state, manager.id, manager.admin),
        });
      const action = match[2];
      if (
        (request.method !== "POST" &&
          !(request.method === "PUT" && action === "preferences")) ||
        !action
      )
        fail(405, "Method not allowed.");
      const body = await readBody(request);
      if (action === "configure") {
        if (!manager.admin) fail(403, "Administrator access is required.");
        await validateParticipants(env, body);
      }
      if (action === "start") {
        if (!manager.admin) fail(403, "Administrator access is required.");
        await validateParticipants(env, { participants: state.participants });
      }
      if (
        action === "test-pick" &&
        (!manager.admin || env.DRAFT_ENVIRONMENT !== "dev")
      )
        fail(403, "Test picks are available only to administrators on dev.");
      // Outbox delivery updates share the row without advancing revision, so merge
      // them on conflict. Gameplay revision conflicts still reject stale clients.
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const actor =
          action === "test-pick"
            ? state.requests[body.requestId]?.managerId ||
              state.schedule[state.picks.length]?.managerId
            : manager.id;
        const next = transition(
          state,
          ["picks", "test-pick"].includes(action) ? "pick" : action,
          body,
          actor,
          manager.admin,
          manager.id,
        );
        if (action === "test-pick" && next !== state) {
          next.picks.at(-1).adminActor = manager.id;
          next.audit.at(-1).action = "test-pick";
        }
        if (next === state)
          return response(request, env, {
            ok: true,
            draft: visibleDraft(state, manager.id, manager.admin),
          });
        if (await saveState(env, state, next)) {
          queueDelivery(env, ctx, state.id);
          return response(request, env, {
            ok: true,
            draft: visibleDraft(next, manager.id, manager.admin),
          });
        }
        state = await readState(env, match[1]);
      }
      fail(409, "The draft changed. Refresh and try again.");
    } catch (error) {
      const status = error.status || (error instanceof SyntaxError ? 400 : 500);
      if (status >= 500) console.error("Draft service error:", error.message);
      return response(
        request,
        env,
        {
          ok: false,
          error:
            status >= 500
              ? "Draft service is unavailable. Please retry."
              : error.message,
        },
        status,
      );
    }
  },
  async scheduled(_event, env, ctx) {
    const rows = await env.DB.prepare(
      "SELECT id FROM league_drafts_state WHERE environment = ? ORDER BY updated_at DESC LIMIT 200",
    )
      .bind(env.DRAFT_ENVIRONMENT)
      .all();
    ctx.waitUntil(
      Promise.allSettled(
        rows.results.map((row) => dispatchEvents(env, row.id)),
      ),
    );
  },
};
