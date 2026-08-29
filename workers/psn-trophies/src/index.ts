import { routePublicApi } from "./api/router";
import { syncOnePlatinumGame } from "./sync/sync-one-game";
import type { PsnEnvironment } from "./types";

export default {
  async fetch(request: Request, env: PsnEnvironment): Promise<Response> {
    const origin = request.headers.get("Origin") || "";
    const cors = corsHeaders(origin, env);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: allowedOrigin(origin, env) ? 204 : 403, headers: cors });
    }
    if (origin && !allowedOrigin(origin, env)) return json({ error: "Origin is not allowed." }, 403, cors);

    try {
      const response = await routePublicApi(request, env);
      if (response) return withHeaders(response, cors);

      const url = new URL(request.url);
      if (request.method === "POST" && url.pathname === "/internal/psn/sync") {
        requireSyncSecret(request, env);
        return json({ ok: true, ...(await syncOnePlatinumGame(env)) }, 200, cors);
      }
      return json({ error: "Not found." }, 404, cors);
    } catch (error) {
      const status = Number((error as { status?: number })?.status) || 500;
      if (status >= 500) console.error(error);
      return json({ error: status >= 500 ? "PSN service request failed." : (error as Error).message }, status, cors);
    }
  },

  async scheduled(_controller: ScheduledController, env: PsnEnvironment, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(syncOnePlatinumGame(env));
  },
};

interface ScheduledController {
  cron: string;
  scheduledTime: number;
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}

function requireSyncSecret(request: Request, env: PsnEnvironment): void {
  if (!env.SYNC_SECRET) throw Object.assign(new Error("Manual sync is not configured."), { status: 503 });
  const authorization = request.headers.get("Authorization") || "";
  if (authorization !== `Bearer ${env.SYNC_SECRET}`) {
    throw Object.assign(new Error("Manual sync authorization is invalid."), { status: 401 });
  }
}

function allowedOrigin(origin: string, env: PsnEnvironment): boolean {
  if (!origin) return true;
  return String(env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .includes(origin);
}

function corsHeaders(origin: string, env: PsnEnvironment): Headers {
  const headers = new Headers({
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    Vary: "Origin",
  });
  if (origin && allowedOrigin(origin, env)) headers.set("Access-Control-Allow-Origin", origin);
  return headers;
}

function withHeaders(response: Response, headers: Headers): Response {
  const merged = new Headers(response.headers);
  headers.forEach((value, key) => merged.set(key, value));
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers: merged });
}

function json(value: unknown, status: number, headers: Headers): Response {
  const merged = new Headers(headers);
  merged.set("Cache-Control", "no-store");
  merged.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(value), { status, headers: merged });
}

