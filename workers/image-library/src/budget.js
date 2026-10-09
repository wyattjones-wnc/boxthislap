const DEFAULTS = {
  enabled: false,
  initialized: false,
  billingDay: 1,
  storageLimit: 512_000_000,
  readLimit: 100_000,
  writeLimit: 2_500,
  dailyLimit: 2_000,
};
const HARD_MAX = {
  storageLimit: 4_000_000_000,
  readLimit: 500_000,
  writeLimit: 20_000,
  dailyLimit: 4_000,
};
export function billingPeriod(now, billingDay) {
  const date = new Date(now),
    day = Math.min(28, Math.max(1, billingDay));
  const start = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), day),
  );
  if (date < start) start.setUTCMonth(start.getUTCMonth() - 1);
  return start.toISOString().slice(0, 10);
}
function refreshPeriod(state, now = Date.now()) {
  const period = billingPeriod(now, state.config.billingDay),
    day = new Date(now).toISOString().slice(0, 10);
  if (state.period !== period) {
    state.period = period;
    state.reads = 0;
    state.writes = 0;
  }
  if (state.day !== day) {
    state.day = day;
    state.daily = 0;
  }
}
export function reserve(state, input, now = Date.now()) {
  refreshPeriod(state, now);
  if (
    (!state.config.enabled && input.operation !== "delete") ||
    !state.config.initialized
  )
    throw Object.assign(
      new Error(
        "Cloud image access is stopped. An admin must initialize and enable the shared usage budget.",
      ),
      { status: 503 },
    );
  const bytes = Number(input.bytes || 0),
    reads = input.operation === "read" ? 1 : 0,
    writes = ["write", "list"].includes(input.operation) ? 1 : 0;
  if (
    !["read", "write", "list", "delete"].includes(input.operation) ||
    !Number.isSafeInteger(bytes) ||
    bytes < 0 ||
    bytes > 15 * 1024 * 1024 ||
    (bytes && input.operation !== "write")
  )
    throw Object.assign(new Error("Invalid usage reservation."), {
      status: 400,
    });
  if (
    (input.operation !== "delete" &&
      (state.storage + bytes > state.config.storageLimit ||
        state.reads + reads > state.config.readLimit ||
        state.writes + writes > state.config.writeLimit)) ||
    state.daily + 1 > state.config.dailyLimit
  )
    throw Object.assign(
      new Error(
        "Cloud image safety limit reached. Cached images remain available.",
      ),
      { status: 429 },
    );
  state.storage += bytes;
  state.reads += reads;
  state.writes += writes;
  state.daily += 1;
  return state;
}
export class MediaBudget {
  constructor(ctx) {
    this.ctx = ctx;
  }
  async fetch(request) {
    try {
      return await this.ctx.storage.transaction(async (storage) => {
        const state = (await storage.get("budget")) || {
          config: { ...DEFAULTS },
          storage: 0,
          reads: 0,
          writes: 0,
          daily: 0,
          period: "",
          day: "",
        };
        refreshPeriod(state);
        const path = new URL(request.url).pathname;
        if (path === "/configure" && request.method === "PUT") {
          const input = await request.json(),
            config = { ...state.config };
          for (const key of Object.keys(HARD_MAX)) {
            const value = Number(input[key]);
            if (
              !Number.isSafeInteger(value) ||
              value < 1 ||
              value > HARD_MAX[key]
            )
              throw Object.assign(
                new Error(`Invalid ${key}; maximum ${HARD_MAX[key]}.`),
                { status: 400 },
              );
            config[key] = value;
          }
          if (
            !Number.isInteger(input.billingDay) ||
            input.billingDay < 1 ||
            input.billingDay > 28 ||
            typeof input.enabled !== "boolean"
          )
            throw Object.assign(
              new Error(
                "Choose a billing day from 1 to 28 and an enabled state.",
              ),
              { status: 400 },
            );
          if (
            state.config.initialized &&
            config.billingDay !== input.billingDay
          )
            throw Object.assign(
              new Error(
                "Billing day cannot change after initialization without a reviewed migration.",
              ),
              { status: 409 },
            );
          config.billingDay = input.billingDay;
          config.enabled = input.enabled;
          if (!state.config.initialized) {
            if (
              !Number.isSafeInteger(input.baselineBytes) ||
              input.baselineBytes < 0
            )
              throw Object.assign(
                new Error(
                  "Supply existing storage across all managed buckets before enabling.",
                ),
                { status: 400 },
              );
            state.storage = input.baselineBytes;
            config.initialized = true;
          }
          state.config = config;
          refreshPeriod(state);
        } else if (path === "/reserve" && request.method === "POST") {
          reserve(state, await request.json());
        } else if (path === "/release" && request.method === "POST") {
          const input = await request.json();
          if (
            !Number.isSafeInteger(input.bytes) ||
            input.bytes < 0 ||
            typeof input.key !== "string" ||
            input.key.length > 300
          )
            throw Object.assign(new Error("Invalid released storage."), {
              status: 400,
            });
          if (!(await storage.get(`released:${input.key}`))) {
            state.storage = Math.max(0, state.storage - input.bytes);
            await storage.put(`released:${input.key}`, true);
          }
        } else if (path !== "/status" || request.method !== "GET")
          return Response.json({ error: "Not found." }, { status: 404 });
        await storage.put("budget", state);
        return Response.json({ ok: true, ...state });
      });
    } catch (error) {
      return Response.json(
        { error: error.message || "Usage accounting is unavailable." },
        { status: error.status || 503 },
      );
    }
  }
}
