const OFFSETS = [
  { key: "2h", label: "in 2 hours", minutes: 120 },
  { key: "1h", label: "in 1 hour", minutes: 60 },
  { key: "start", label: "now", minutes: 0 },
];
const SUBSCRIPTION_PREFIX = "sub:";
const PENDING_PREFIX = "pending:";
const SENT_PREFIX = "sent:";

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return withCors(new Response(null, { status: 204 }), env);
    }

    const url = new URL(request.url);

    try {
      if (request.method === "GET" && url.pathname === "/health") {
        return json({ ok: true, source: "box-this-lap-footy-push" }, env);
      }

      if (request.method === "GET" && url.pathname === "/vapid-public-key") {
        assertEnv(env, ["VAPID_PUBLIC_KEY"]);
        return json({ publicKey: env.VAPID_PUBLIC_KEY }, env);
      }

      if (request.method === "POST" && url.pathname === "/subscribe") {
        return json(await subscribe(request, env), env);
      }

      if (request.method === "POST" && url.pathname === "/unsubscribe") {
        return json(await unsubscribe(request, env), env);
      }

      if (request.method === "POST" && url.pathname === "/pending") {
        return json(await consumePending(request, env), env);
      }

      if (request.method === "GET" && url.pathname === "/debug") {
        assertAdminRequest(request, env);
        return json(await getFootyPushDebug(env), env);
      }

      if (request.method === "POST" && url.pathname === "/run") {
        assertAdminRequest(request, env);
        return json(await sendDueFootyAlerts(env), env);
      }

      return withCors(new Response("Not found", { status: 404 }), env);
    } catch (error) {
      const status = Number(error?.status || 500);
      return json({ error: status >= 500 ? "Footy notification service failed." : error.message, ok: false }, env, status);
    }
  },

  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(sendDueFootyAlerts(env));
  },
};

async function subscribe(request, env) {
  assertEnv(env, ["FOOTY_PUSH_KV", "VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "VAPID_SUBJECT", "AUTH_SECRET"]);
  const manager = await requireManager(request, env);
  const body = await request.json();
  const subscription = normalizeSubscription(body.subscription || body);
  const subscriptionHash = await hashText(subscription.endpoint);
  const record = {
    active: true,
    createdAt: new Date().toISOString(),
    endpoint: subscription.endpoint,
    keys: subscription.keys,
    managerId: String(manager.sub),
    pageUrl: String(body.pageUrl || "").trim(),
    updatedAt: new Date().toISOString(),
    userAgent: String(body.userAgent || "").trim(),
  };

  await env.FOOTY_PUSH_KV.put(`${SUBSCRIPTION_PREFIX}${subscriptionHash}`, JSON.stringify(record));

  return { ok: true, subscriptionHash };
}

async function unsubscribe(request, env) {
  assertEnv(env, ["FOOTY_PUSH_KV"]);
  const body = await request.json();
  const endpoint = String(body.endpoint || "").trim();

  if (!endpoint) {
    throw new Error("Missing subscription endpoint.");
  }

  const subscriptionHash = await hashText(endpoint);
  await env.FOOTY_PUSH_KV.delete(`${SUBSCRIPTION_PREFIX}${subscriptionHash}`);
  await env.FOOTY_PUSH_KV.delete(`${PENDING_PREFIX}${subscriptionHash}`);

  return { ok: true, subscriptionHash };
}

async function consumePending(request, env) {
  assertEnv(env, ["FOOTY_PUSH_KV"]);
  const body = await request.json();
  const endpoint = String(body.endpoint || "").trim();

  if (!endpoint) {
    throw new Error("Missing subscription endpoint.");
  }

  const subscriptionHash = await hashText(endpoint);
  const pendingKey = `${PENDING_PREFIX}${subscriptionHash}`;
  const notifications = await getJson(env.FOOTY_PUSH_KV, pendingKey, []);
  await env.FOOTY_PUSH_KV.delete(pendingKey);

  return { notifications, ok: true };
}

async function getFootyPushDebug(env) {
  assertEnv(env, ["FOOTY_PUSH_KV", "FOOTY_SCHEDULE_URL"]);
  const schedule = await fetchJson(env.FOOTY_SCHEDULE_URL);
  const fixtures = getUniqueFixtures(schedule);
  const dueAlerts = getDueFootyAlerts(schedule, env);
  const subscriptions = await listActiveSubscriptions(env.FOOTY_PUSH_KV);

  return {
    dueAlerts: dueAlerts.map((alert) => ({
      body: alert.body,
      key: alert.key,
      title: alert.title,
    })),
    fixtureCount: fixtures.length,
    nextAlertWindows: getNextFootyAlertWindows(fixtures, env).slice(0, 10),
    ok: true,
    scheduleGeneratedAt: schedule?.generatedAt || schedule?.updatedAt || "",
    scheduleUrl: env.FOOTY_SCHEDULE_URL,
    subscriptions: subscriptions.length,
  };
}

async function sendDueFootyAlerts(env) {
  assertEnv(env, [
    "DB",
    "FOOTY_PUSH_KV",
    "FOOTY_SCHEDULE_URL",
    "VAPID_PUBLIC_KEY",
    "VAPID_PRIVATE_KEY",
    "VAPID_SUBJECT",
  ]);

  const subscriptions = await listActiveSubscriptions(env.FOOTY_PUSH_KV);
  const schedules = await loadFootySchedulesByChannel(env, subscriptions);
  const dueAlertsByChannel = {
    main: getDueFootyAlerts(schedules.main, env),
    dev: getDueFootyAlerts(schedules.dev, env),
  };
  const dueAlertCount = dueAlertsByChannel.main.length + dueAlertsByChannel.dev.length;

  if (dueAlertCount === 0) {
    return {
      dueAlerts: 0,
      fixtureCount: getUniqueFixtures(schedules.main).length,
      nextAlertWindows: getNextFootyAlertWindows(getUniqueFixtures(schedules.main), env).slice(0, 5),
      ok: true,
    };
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  let removed = 0;
  const followedTeamIdsByManager = new Map();

  for (const subscription of subscriptions) {
    const managerId = String(subscription.record.managerId || "").trim();
    if (!managerId) {
      skipped += 1;
      continue;
    }
    if (!followedTeamIdsByManager.has(managerId)) {
      followedTeamIdsByManager.set(managerId, await readManagerFollowedTeamIds(env, managerId));
    }
    const followedTeamIds = followedTeamIdsByManager.get(managerId);
    const channel = getFootySubscriptionChannel(subscription.record);
    const dueAlerts = dueAlertsByChannel[channel];
    const pendingNotifications = [];
    const pendingSentKeys = [];

    for (const alert of dueAlerts) {
      if (!alert.teamIds.some((teamId) => followedTeamIds.has(teamId))) {
        skipped += 1;
        continue;
      }
      const sentKey = `${SENT_PREFIX}${alert.key}:${managerId}`;
      const wasSent = await env.FOOTY_PUSH_KV.get(sentKey);

      if (wasSent) {
        skipped += 1;
        continue;
      }

      pendingNotifications.push({
        body: alert.body,
        tag: `box-this-lap-footy-${alert.key}`,
        title: alert.title,
        url: getFootyNotificationUrl(channel, env),
      });
      pendingSentKeys.push(sentKey);
    }

    if (pendingNotifications.length === 0) {
      continue;
    }

    await env.FOOTY_PUSH_KV.put(
      `${PENDING_PREFIX}${subscription.hash}`,
      JSON.stringify(pendingNotifications),
      { expirationTtl: 60 * 60 },
    );

    const result = await sendEmptyWebPush(subscription.record, env);

    if (result.status === 404 || result.status === 410) {
      await env.FOOTY_PUSH_KV.delete(`${SUBSCRIPTION_PREFIX}${subscription.hash}`);
      await env.FOOTY_PUSH_KV.delete(`${PENDING_PREFIX}${subscription.hash}`);
      removed += 1;
      continue;
    }

    if (!result.ok) {
      console.warn("Unable to send footy push", subscription.hash, result.status, await result.text());
      await env.FOOTY_PUSH_KV.delete(`${PENDING_PREFIX}${subscription.hash}`);
      failed += pendingNotifications.length;
      continue;
    }

    await Promise.all(pendingSentKeys.map((sentKey) =>
      env.FOOTY_PUSH_KV.put(sentKey, new Date().toISOString(), { expirationTtl: 60 * 60 * 24 * 14 })
    ));
    sent += pendingNotifications.length;
  }

  return {
    dueAlerts: dueAlertCount,
    failed,
    ok: true,
    removed,
    sent,
    skipped,
    skippedAlreadySent: skipped,
    subscriptions: subscriptions.length,
  };
}

async function loadFootySchedulesByChannel(env, subscriptions) {
  const mainUrl = String(env.FOOTY_SCHEDULE_URL || "").trim();
  const devUrl = String(env.FOOTY_DEV_SCHEDULE_URL || mainUrl).trim();
  const main = await fetchJson(mainUrl);
  const needsDev = subscriptions.some((subscription) => getFootySubscriptionChannel(subscription.record) === "dev");
  let dev = main;
  if (needsDev && devUrl !== mainUrl) {
    try {
      dev = await fetchJson(devUrl);
    } catch (error) {
      console.warn("Unable to load dev Footy schedule", error);
      dev = { teamSchedules: [] };
    }
  }
  return { dev, main };
}

function getFootySubscriptionChannel(record) {
  try {
    const pathname = new URL(String(record && record.pageUrl || "")).pathname;
    return pathname.includes("/boxthislap/dev/") ? "dev" : "main";
  } catch (_error) {
    return "main";
  }
}

function getFootyNotificationUrl(channel, env) {
  if (channel === "dev") {
    return String(env.DEV_NOTIFICATION_URL || env.NOTIFICATION_URL || "./#footy").trim();
  }
  return String(env.NOTIFICATION_URL || "./#footy").trim();
}

function getDueFootyAlerts(schedule, env) {
  const fixtures = getUniqueFixtures(schedule);
  const now = Date.now();
  const lookbackMs = Math.max(1, Number(env.NOTIFICATION_LOOKBACK_MINUTES || 16)) * 60 * 1000;
  const alerts = [];

  fixtures.forEach((fixture) => {
    const fixtureTime = getFixtureTime(fixture);

    if (!Number.isFinite(fixtureTime)) {
      return;
    }

    OFFSETS.forEach((offset) => {
      const notificationTime = fixtureTime - offset.minutes * 60 * 1000;

      if (now < notificationTime || now - notificationTime > lookbackMs) {
        return;
      }

      const title = offset.key === "start" ? "Match starting now" : `Match starts ${offset.label}`;
      const teams = `${fixture.home || "TBD"} v ${fixture.away || "TBD"}`;

      alerts.push({
        body: [teams, formatFixtureTime(fixtureTime)].filter(Boolean).join(" • "),
        key: `${getFixtureKey(fixture)}:${offset.key}`,
        teamIds: getFixtureTeamIds(fixture),
        title,
      });
    });
  });

  return alerts;
}

export function getFixtureTeamIds(fixture = {}) {
  return [...new Set([
    String(fixture.homeTeamId || "").trim(),
    String(fixture.awayTeamId || "").trim(),
  ].filter(Boolean))];
}

async function readManagerFollowedTeamIds(env, managerId) {
  const result = await env.DB.prepare("SELECT team_id, notifications_enabled FROM manager_followed_teams WHERE manager_id = ? ORDER BY priority")
    .bind(managerId).all();
  const defaultManagerId = String(env.DEFAULT_FOOTY_MANAGER_ID || "6").trim() || "6";
  const ownRows = result.results || [];
  const ownIds = ownRows.filter((row) => Boolean(row.notifications_enabled)).map((row) => String(row.team_id));
  if (ownRows.length || String(managerId) === defaultManagerId) return new Set(ownIds);
  const defaultResult = await env.DB.prepare("SELECT team_id FROM manager_followed_teams WHERE manager_id = ? AND notifications_enabled = 1 ORDER BY priority")
    .bind(defaultManagerId).all();
  return new Set(resolveFollowedTeamIds(ownIds, (defaultResult.results || []).map((row) => String(row.team_id)), managerId, defaultManagerId));
}

export function resolveFollowedTeamIds(managerIds = [], defaultIds = [], managerId = "", defaultManagerId = "6") {
  return String(managerId) !== String(defaultManagerId) && managerIds.length === 0 ? [...defaultIds] : [...managerIds];
}

function getNextFootyAlertWindows(fixtures, env) {
  const now = Date.now();
  const lookbackMinutes = Math.max(1, Number(env.NOTIFICATION_LOOKBACK_MINUTES || 16));
  const lookbackMs = lookbackMinutes * 60 * 1000;
  const windows = [];

  fixtures.forEach((fixture) => {
    const fixtureTime = getFixtureTime(fixture);

    if (!Number.isFinite(fixtureTime)) {
      return;
    }

    OFFSETS.forEach((offset) => {
      const alertTime = fixtureTime - offset.minutes * 60 * 1000;

      if (alertTime + lookbackMs < now) {
        return;
      }

      windows.push({
        alertAt: new Date(alertTime).toISOString(),
        alertWindowEndsAt: new Date(alertTime + lookbackMs).toISOString(),
        home: fixture.home || "",
        away: fixture.away || "",
        key: `${getFixtureKey(fixture)}:${offset.key}`,
        matchId: fixture.matchId || fixture.id || "",
        offset: offset.key,
        startsAt: new Date(fixtureTime).toISOString(),
      });
    });
  });

  return windows.sort((left, right) => Date.parse(left.alertAt) - Date.parse(right.alertAt));
}

function getUniqueFixtures(schedule) {
  const fixtureMap = new Map();

  (schedule?.teamSchedules || []).forEach((teamSchedule) => {
    (teamSchedule.fixtures || []).forEach((fixture) => {
      const key = getFixtureKey(fixture);

      if (!key || fixtureMap.has(key)) {
        return;
      }

      fixtureMap.set(key, fixture);
    });
  });

  return [...fixtureMap.values()];
}

function getFixtureKey(fixture) {
  return [
    String(fixture.matchId || fixture.id || "").trim(),
    String(fixture.date || "").trim(),
    `${fixture.home || ""}-${fixture.away || ""}`.toLowerCase(),
  ].filter(Boolean).join("|");
}

function getFixtureTime(fixture) {
  const timestamp = String(fixture.timestamp || "").trim();

  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(timestamp)) {
    return Number.NaN;
  }

  const parsed = Date.parse(timestamp);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function formatFixtureTime(timestamp) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "America/New_York",
    }).format(new Date(timestamp));
  } catch {
    return "";
  }
}

async function listActiveSubscriptions(kv) {
  const subscriptions = [];
  let cursor;

  do {
    const result = await kv.list({ cursor, prefix: SUBSCRIPTION_PREFIX });
    cursor = result.cursor;

    for (const key of result.keys) {
      const record = await getJson(kv, key.name, null);

      if (!record?.active || !record.endpoint) {
        continue;
      }

      subscriptions.push({
        hash: key.name.slice(SUBSCRIPTION_PREFIX.length),
        record,
      });
    }
  } while (cursor);

  return subscriptions;
}

async function sendEmptyWebPush(subscription, env) {
  const endpoint = new URL(subscription.endpoint);
  const jwt = await createVapidJwt(endpoint.origin, env);
  const publicKey = getSecretValue(env.VAPID_PUBLIC_KEY, "VAPID_PUBLIC_KEY");

  return fetch(subscription.endpoint, {
    headers: {
      Authorization: `vapid t=${jwt}, k=${publicKey}`,
      TTL: "900",
      Urgency: "normal",
    },
    method: "POST",
  });
}

async function createVapidJwt(audience, env) {
  const vapidPublicKey = getSecretValue(env.VAPID_PUBLIC_KEY, "VAPID_PUBLIC_KEY");
  const vapidPrivateKey = getSecretValue(env.VAPID_PRIVATE_KEY, "VAPID_PRIVATE_KEY");
  const publicKey = base64UrlToBytes(vapidPublicKey);
  const privateKey = base64UrlToBytes(vapidPrivateKey);

  if (publicKey.length !== 65 || publicKey[0] !== 4) {
    throw new Error("VAPID_PUBLIC_KEY must be an uncompressed P-256 public key.");
  }

  if (privateKey.length !== 32) {
    throw new Error("VAPID_PRIVATE_KEY must be a 32-byte base64url P-256 private key.");
  }

  const key = await crypto.subtle.importKey(
    "jwk",
    {
      crv: "P-256",
      d: bytesToBase64Url(privateKey),
      ext: true,
      key_ops: ["sign"],
      kty: "EC",
      x: bytesToBase64Url(publicKey.slice(1, 33)),
      y: bytesToBase64Url(publicKey.slice(33, 65)),
    },
    { hash: "SHA-256", name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const header = bytesToBase64Url(new TextEncoder().encode(JSON.stringify({ alg: "ES256", typ: "JWT" })));
  const payload = bytesToBase64Url(new TextEncoder().encode(JSON.stringify({
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
    sub: env.VAPID_SUBJECT,
  })));
  const unsignedToken = `${header}.${payload}`;
  const signature = await crypto.subtle.sign(
    { hash: "SHA-256", name: "ECDSA" },
    key,
    new TextEncoder().encode(unsignedToken),
  );

  return `${unsignedToken}.${bytesToBase64Url(new Uint8Array(signature))}`;
}

function getSecretValue(value, name) {
  const normalized = String(value || "")
    .trim()
    .replace(new RegExp(`^${name}\\s*=\\s*`, "i"), "")
    .trim();

  if (!normalized) {
    throw new Error(`Missing required secret: ${name}.`);
  }

  return normalized;
}

function normalizeSubscription(subscription) {
  const endpoint = String(subscription?.endpoint || "").trim();
  const p256dh = String(subscription?.keys?.p256dh || "").trim();
  const auth = String(subscription?.keys?.auth || "").trim();

  if (!endpoint || !p256dh || !auth) {
    throw new Error("Invalid push subscription.");
  }

  return { endpoint, keys: { auth, p256dh } };
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { Accept: "application/json" } });

  if (!response.ok) {
    throw new Error(`Unable to load ${url}: ${response.status}`);
  }

  return response.json();
}

async function getJson(kv, key, fallback) {
  const raw = await kv.get(key);

  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function hashText(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return bytesToBase64Url(new Uint8Array(digest)).slice(0, 32);
}

function base64UrlToBytes(value) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = `${value}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);

  for (let index = 0; index < raw.length; index += 1) {
    bytes[index] = raw.charCodeAt(index);
  }

  return bytes;
}

function bytesToBase64Url(bytes) {
  const binary = String.fromCharCode(...bytes);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function assertEnv(env, names) {
  const missing = names.filter((name) => !env[name]);

  if (missing.length) {
    throw new Error(`Missing required binding or variable: ${missing.join(", ")}`);
  }
}

function assertAdminRequest(request, env) {
  if (!env.ADMIN_RUN_TOKEN) {
    return;
  }

  const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") || "";

  if (token !== env.ADMIN_RUN_TOKEN) {
    throw new Error("Unauthorized.");
  }
}

async function requireManager(request, env) {
  const authorization = request.headers.get("Authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  const payload = await verifyToken(env, token, "access");
  return payload;
}

async function verifyToken(env, token, type) {
  const [encoded, provided] = String(token || "").split(".");
  if (!encoded || !provided || provided !== await signature(env.AUTH_SECRET, encoded)) {
    throw httpError(401, "Manager authorization is invalid.");
  }
  let payload;
  try {
    payload = JSON.parse(new TextDecoder().decode(decodeBase64Url(encoded)));
  } catch {
    throw httpError(401, "Manager authorization is invalid.");
  }
  if (payload.typ !== type || !payload.sub || Number(payload.exp || 0) <= Math.floor(Date.now() / 1000)) {
    throw httpError(401, "Manager authorization has expired.");
  }
  return payload;
}

async function signature(secret, value) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return bytesToBase64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value))));
}

function decodeBase64Url(value) {
  return base64UrlToBytes(value);
}

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function json(data, env, status = 200) {
  return withCors(new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
    status,
  }), env);
}

function withCors(response, env) {
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  headers.set("Access-Control-Allow-Origin", env.ALLOWED_ORIGIN || "*");

  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
}
