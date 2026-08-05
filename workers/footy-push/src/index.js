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

      if (request.method === "POST" && url.pathname === "/run") {
        assertAdminRequest(request, env);
        return json(await sendDueFootyAlerts(env), env);
      }

      return withCors(new Response("Not found", { status: 404 }), env);
    } catch (error) {
      return json({ error: error.message || String(error), ok: false }, env, 500);
    }
  },

  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(sendDueFootyAlerts(env));
  },
};

async function subscribe(request, env) {
  assertEnv(env, ["FOOTY_PUSH_KV", "VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "VAPID_SUBJECT"]);
  const body = await request.json();
  const subscription = normalizeSubscription(body.subscription || body);
  const subscriptionHash = await hashText(subscription.endpoint);
  const record = {
    active: true,
    createdAt: new Date().toISOString(),
    endpoint: subscription.endpoint,
    keys: subscription.keys,
    managerId: String(body.managerId || "").trim(),
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

async function sendDueFootyAlerts(env) {
  assertEnv(env, [
    "FOOTY_PUSH_KV",
    "FOOTY_SCHEDULE_URL",
    "VAPID_PUBLIC_KEY",
    "VAPID_PRIVATE_KEY",
    "VAPID_SUBJECT",
  ]);

  const schedule = await fetchJson(env.FOOTY_SCHEDULE_URL);
  const dueAlerts = getDueFootyAlerts(schedule, env);

  if (dueAlerts.length === 0) {
    return { dueAlerts: 0, ok: true, subscriptions: 0 };
  }

  const subscriptions = await listActiveSubscriptions(env.FOOTY_PUSH_KV);
  let sent = 0;
  let skipped = 0;
  let failed = 0;
  let removed = 0;

  for (const subscription of subscriptions) {
    const pendingNotifications = [];
    const pendingSentKeys = [];

    for (const alert of dueAlerts) {
      const sentKey = `${SENT_PREFIX}${alert.key}:${subscription.hash}`;
      const wasSent = await env.FOOTY_PUSH_KV.get(sentKey);

      if (wasSent) {
        skipped += 1;
        continue;
      }

      pendingNotifications.push({
        body: alert.body,
        tag: `box-this-lap-footy-${alert.key}`,
        title: alert.title,
        url: env.NOTIFICATION_URL || "./#footy",
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
    dueAlerts: dueAlerts.length,
    failed,
    ok: true,
    removed,
    sent,
    skipped,
    skippedAlreadySent: skipped,
    subscriptions: subscriptions.length,
  };
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
        title,
      });
    });
  });

  return alerts;
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

  return fetch(subscription.endpoint, {
    headers: {
      Authorization: `vapid t=${jwt}, k=${env.VAPID_PUBLIC_KEY}`,
      TTL: "900",
      Urgency: "normal",
    },
    method: "POST",
  });
}

async function createVapidJwt(audience, env) {
  const publicKey = base64UrlToBytes(env.VAPID_PUBLIC_KEY);

  if (publicKey.length !== 65 || publicKey[0] !== 4) {
    throw new Error("VAPID_PUBLIC_KEY must be an uncompressed P-256 public key.");
  }

  const key = await crypto.subtle.importKey(
    "jwk",
    {
      crv: "P-256",
      d: env.VAPID_PRIVATE_KEY,
      ext: false,
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
